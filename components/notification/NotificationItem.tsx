// components/notification/NotificationItem.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Notification } from '@/types/notification';

const formatTimeAgo = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

interface NotificationItemProps {
  notification: Notification;
  onPress?: () => void;
  onMarkAsRead?: (id: string) => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onPress,
  onMarkAsRead,
}) => {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!notification.read && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
    onPress?.();
  };

  return (
    <TouchableOpacity onPress={handlePress} style={styles.item} activeOpacity={0.7}>
      <View style={[styles.iconContainer, !notification.read && styles.unreadDot]}>
        <Ionicons
          name={
            notification.type?.includes('trans') ? 'swap-horizontal' :
            notification.type?.includes('serve') ? 'shield-check' :
            'megaphone-outline'
          }
          size={22}
          color="#FFD700"
        />
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, !notification.read && styles.titleUnread]}>
          {notification.title}
        </Text>
        <Text style={styles.message} numberOfLines={2}>
          {notification.message}
        </Text>
      </View>

      <View style={styles.right}>
        <Text style={[styles.time, !notification.read && styles.timeUnread]}>
          {formatTimeAgo(notification.created_at)}
        </Text>
        {!notification.read && <View style={styles.unreadBadge} />}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    backgroundColor: '#111',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#222',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,215,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  unreadDot: {
    borderColor: '#FFD700',
    borderWidth: 2,
  },
  content: {
    flex: 1,
  },
  title: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  titleUnread: {
    fontWeight: '700',
  },
  message: {
    color: '#aaa',
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  right: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  time: {
    color: '#666',
    fontSize: 12,
  },
  timeUnread: {
    color: '#FFD700',
  },
  unreadBadge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFD700',
    marginTop: 6,
  },
});