import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  StatusBar,
  Platform,
  Image,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/context/supabase-provider';
import { supabase } from '@/config/supabase';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { DEFAULT_PROVIDER_IMAGE, NETWORK_IMAGES } from '@/constants/helper';
import { Swipeable } from 'react-native-gesture-handler';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface Notification {
  id: string;
  type: string;
  message: string | { text: string };
  created_at: string;
}

// New Tag Component with Animations
const NewTagBadge: React.FC<{ isNew: boolean }> = ({ isNew }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isNew) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      );
      const rotate = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 8000,
          useNativeDriver: true,
        }),
      );
      Animated.parallel([pulse, rotate]).start();
      return () => {
        pulse.stop();
        rotate.stop();
      };
    }
  }, [isNew]);

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!isNew) return null;

  return (
    <Animated.View
      style={[
        styles.newTag,
        {
          transform: [{ scale: scaleAnim }, { rotate: rotateInterpolate }],
        },
      ]}
    >
      <Text style={styles.newTagText}>New</Text>
    </Animated.View>
  );
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  // Register for push notifications and store token
  const registerForPushNotificationsAsync = async () => {
    if (!Device.isDevice) {
      console.log('Must use physical device for push notifications');
      return;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }

    const token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('Push token:', token);

    if (user?.id) {
      const { error } = await supabase.from('user_push_tokens').upsert(
        {
          user_id: user.id,
          push_token: token,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );
      if (error) {
        console.error('Error storing push token:', error);
      } else {
        console.log('Push token stored successfully');
      }
    }

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FFFFFF',
      });
    }

    return token;
  };

  const fetchNotifications = async () => {
    if (!user?.id) {
      console.log('No user ID available');
      setNotifications([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, notification_type, message, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const parsedNotifications = (data || []).map((n) => {
        let message;
        try {
          message =
            typeof n.message === 'string'
              ? n.message.replace(/^"|"$/g, '')
              : typeof n.message === 'object' && n.message.text
                ? n.message.text
                : JSON.parse(n.message.replace(/^"|"$/g, ''));
          message = message.replace(/^you\s/i, '').trim();
        } catch (parseError) {
          console.error(`Failed to parse message for notification ${n.id}:`, parseError);
          message = 'Invalid notification message';
        }
        return {
          id: n.id,
          type: n.notification_type || 'unknown',
          message,
          created_at: n.created_at,
        };
      });
      console.log('Parsed notifications:', parsedNotifications);
      setNotifications(parsedNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    }
  };

  const dismissNotification = async (id: string) => {
    try {
      const { error } = await supabase.from('notifications').delete().eq('id', id);
      if (error) throw error;
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      console.log(`Dismissed notification ${id}`);
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  };

  const handleNotificationPress = (notification: Notification) => {
    console.log('Notification pressed:', notification);
  };

  useEffect(() => {
    registerForPushNotificationsAsync();

    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Push notification received:', notification);
        fetchNotifications();
      },
    );

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Push notification tapped:', response);
        const data = response.notification.request.content.data;
        if (data.notificationId) {
          handleNotificationPress({ id: data.notificationId, ...data });
        }
      },
    );

    fetchNotifications();

    const subscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user?.id}`,
        },
        (payload) => {
          console.log('Real-time notification event:', payload);
          fetchNotifications();
        },
      )
      .subscribe((status) => {
        console.log('Supabase subscription status:', status);
      });

    return () => {
      supabase.removeChannel(subscription);
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [user]);

  const getNetworkLogo = (message: string | { text: string }) => {
    const text = typeof message === 'string' ? message : message.text;
    const lowerText = text.toLowerCase();
    for (const [network, logo] of Object.entries(NETWORK_IMAGES)) {
      if (lowerText.includes(network.toLowerCase())) {
        return logo;
      }
    }
    return DEFAULT_PROVIDER_IMAGE;
  };

  const renderLeftActions = (notificationId: string) => (
    <Pressable
      style={styles.deleteAction}
      onPress={() => dismissNotification(notificationId)}
    >
      <Ionicons name="trash" size={24} color="#FFFFFF" />
    </Pressable>
  );

  const renderNotification = ({ item }: { item: Notification }) => {
    console.log('Rendering notification:', item);
    const logoSource = getNetworkLogo(item.message);
    const isNew = new Date().getTime() - new Date(item.created_at).getTime() < 24 * 60 * 60 * 1000;

    return (
      <Swipeable
        renderLeftActions={() => renderLeftActions(item.id)}
        overshootLeft={false}
      >
        <Pressable onPress={() => handleNotificationPress(item)} style={styles.notificationItem}>
          <Image
            source={typeof logoSource === 'string' ? { uri: logoSource } : logoSource}
            style={styles.networkLogo}
            resizeMode="contain"
          />
          <View style={styles.notificationContent}>
            <View style={styles.messageContainer}>
              <Text style={styles.notificationMessage} numberOfLines={1} ellipsizeMode="tail">
                {typeof item.message === 'string' ? item.message : item.message.text}
              </Text>
              <NewTagBadge isNew={isNew} />
            </View>
            <Text style={styles.notificationTime}>
              {new Date(item.created_at).toLocaleString('en-US', {
                hour: 'numeric',
                minute: 'numeric',
                hour12: true,
              })}
            </Text>
          </View>
          {['hot_data', 'special_data', 'weekend_plan', 'weekly_plan'].includes(item.type) && (
            <Pressable onPress={() => dismissNotification(item.id)} style={styles.dismissButton}>
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </Pressable>
          )}
        </Pressable>
      </Swipeable>
    );
  };

  console.log('Notifications:', notifications);

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      {/* <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View> */}
    <FlatList
  data={notifications}
  renderItem={renderNotification}
  keyExtractor={(item) => item.id}
  ListEmptyComponent={<Text style={styles.emptyText}>No notifications available</Text>}
  contentContainerStyle={styles.listContent}
/>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    paddingHorizontal: 16,
    // paddingTop: (StatusBar.currentHeight || 0) + 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 12,
    backgroundColor: '#000000',
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#000000',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  networkLogo: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
    flexDirection: 'column',
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
    flexShrink: 1,
  },
  notificationTime: {
    fontSize: 12,
    color: '#8B4513',
    marginTop: 4,
  },
  newTag: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  newTagText: {
    fontSize: 10,
    color: '#000000',
    fontWeight: '600',
  },
  dismissButton: {
    paddingLeft: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 32,
  },
  listContent: {
    paddingBottom: 20,
  },
  deleteAction: {
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    width: 70,
    height: '75%',
    borderRadius: 8,
    marginTop: 2,
  },
  deleteActionText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});