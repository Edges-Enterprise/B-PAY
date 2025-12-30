// app/notifications/components/TabContent.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { NotificationItem } from '@/components/notification/NotificationItem';
import { Notification } from '@/types/notification';

interface Props {
  notifications: Notification[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  markAsRead: (id: string) => Promise<void>;
  title: string;
}

export function TabContent({ notifications, loading, error, refresh, markAsRead, title }: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const handleMarkAll = () => {
    if (unreadCount === 0) return;
    Alert.alert('Mark All Read', `Mark all ${unreadCount} as read?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark All',
        onPress: async () => {
          await Promise.all(notifications.filter(n => !n.read).map(n => markAsRead(n.id)));
        },
      },
    ]);
  };

  return (
    <FlatList
      data={notifications}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <NotificationItem notification={item} onMarkAsRead={markAsRead} />
      )}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#FFD700']} />
      }
      ListHeaderComponent={
        loading ? (
          <View style={s.header}>
            <ActivityIndicator size="small" color="#FFD700" />
            <Text style={s.text}>Loading {title}...</Text>
          </View>
        ) : unreadCount > 0 ? (
          <TouchableOpacity style={s.markAll} onPress={handleMarkAll}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#FFD700" />
            <Text style={s.markAllText}>Mark all as read ({unreadCount})</Text>
          </TouchableOpacity>
        ) : null
      }
      ListEmptyComponent={
        loading ? null : (
          <View style={s.empty}>
            <Ionicons name="notifications-off-outline" size={64} color="#555" />
            <Text style={s.emptyTitle}>No {title} Yet</Text>
          </View>
        )
      }
      contentContainerStyle={notifications.length === 0 ? s.emptyContainer : s.list}
    />
  );
}

const s = StyleSheet.create({
  list: { padding: 16 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 12 },
  text: { color: '#FFD700' },
  markAll: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.1)',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
    margin: 16,
    alignSelf: 'flex-start',
  },
  markAllText: { color: '#FFD700', marginLeft: 8, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 100 },
  emptyTitle: { color: '#fff', fontSize: 18, marginTop: 20, fontWeight: '600' },
});