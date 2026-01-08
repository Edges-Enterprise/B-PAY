import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// Mock notifications data
const NOTIFICATIONS = [
  {
    id: '1',
    type: 'payout',
    title: 'Payout Received!',
    message: 'You have received ₦12,000 from "Market Women Daily" AJO',
    time: '2 hours ago',
    read: false,
    icon: 'cash',
    color: '#4CAF50',
  },
  {
    id: '2',
    type: 'contribution',
    title: 'Contribution Due',
    message: 'Your ₦500 contribution for "Market Women Daily" is due tomorrow',
    time: '5 hours ago',
    read: false,
    icon: 'alert-circle',
    color: '#FF9800',
  },
  {
    id: '3',
    type: 'member',
    title: 'New Member Joined',
    message: 'Amina Bello has joined your "Market Women Daily" AJO',
    time: '1 day ago',
    read: true,
    icon: 'person-add',
    color: '#2196F3',
  },
  {
    id: '4',
    type: 'system',
    title: 'BPAY System Packed',
    message: 'BPAY system has received payout for slot 1 in "Market Women Daily"',
    time: '2 days ago',
    read: true,
    icon: 'shield-checkmark',
    color: '#9C27B0',
  },
  {
    id: '5',
    type: 'reminder',
    title: 'Rotation Reminder',
    message: 'You are next in line to receive payout from "Market Women Daily"',
    time: '3 days ago',
    read: true,
    icon: 'notifications',
    color: '#FFD700',
  },
  {
    id: '6',
    type: 'invitation',
    title: 'AJO Invitation',
    message: 'You have been invited to join "Tech Bros Savings" AJO',
    time: '1 week ago',
    read: true,
    icon: 'mail',
    color: '#00BCD4',
  },
];

const NOTIFICATION_TYPES = [
  { id: 'all', name: 'All', icon: 'notifications' },
  { id: 'unread', name: 'Unread', icon: 'mail-unread' },
  { id: 'payout', name: 'Payouts', icon: 'cash' },
  { id: 'system', name: 'System', icon: 'shield' },
];

const NotificationsScreen = () => {
  const [selectedType, setSelectedType] = useState('all');
  const [notifications, setNotifications] = useState(NOTIFICATIONS);
  const watermarkPulse = useState(new Animated.Value(1))[0];

  // Watermark animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(watermarkPulse, {
          toValue: 1.05,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(watermarkPulse, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const filteredNotifications = notifications.filter(notification => {
    if (selectedType === 'all') return true;
    if (selectedType === 'unread') return !notification.read;
    return notification.type === selectedType;
  });

  const markAsRead = (id) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <View style={styles.container}>
      {/* Watermark Background */}
      <Animated.View pointerEvents="none" style={styles.watermarkWrapper}>
        <Animated.Image
          source={require('@/assets/icons/home.png')}
          style={[styles.watermark, { transform: [{ scale: watermarkPulse }] }]}
          resizeMode="contain"
        />
      </Animated.View>

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Notifications</Text>
            <Text style={styles.subtitle}>
              {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
            </Text>
          </View>
          {unreadCount > 0 && (
            <TouchableOpacity style={styles.markAllButton} onPress={markAllAsRead}>
              <Ionicons name="checkmark-done" size={20} color="#FFD700" />
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Notification Types */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.typesContainer}
        >
          {NOTIFICATION_TYPES.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.typeButton,
                selectedType === type.id && styles.typeButtonActive
              ]}
              onPress={() => setSelectedType(type.id)}
            >
              <Ionicons 
                name={type.icon} 
                size={18} 
                color={selectedType === type.id ? '#FFD700' : '#999'} 
              />
              <Text style={[
                styles.typeText,
                selectedType === type.id && styles.typeTextActive
              ]}>
                {type.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Notifications List */}
        <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
          {filteredNotifications.length > 0 ? (
            <>
              {filteredNotifications.map((notification) => (
                <TouchableOpacity
                  key={notification.id}
                  style={[
                    styles.notificationCard,
                    !notification.read && styles.notificationCardUnread
                  ]}
                  onPress={() => markAsRead(notification.id)}
                >
                  <View style={styles.notificationHeader}>
                    <View style={[
                      styles.notificationIcon,
                      { backgroundColor: `${notification.color}20` }
                    ]}>
                      <Ionicons 
                        name={notification.icon} 
                        size={20} 
                        color={notification.color} 
                      />
                    </View>
                    
                    <View style={styles.notificationContent}>
                      <View style={styles.notificationTitleRow}>
                        <Text style={styles.notificationTitle}>{notification.title}</Text>
                        {!notification.read && (
                          <View style={styles.unreadDot} />
                        )}
                      </View>
                      <Text style={styles.notificationTime}>{notification.time}</Text>
                    </View>
                    
                    <Ionicons 
                      name="chevron-forward" 
                      size={18} 
                      color="#999" 
                    />
                  </View>
                  
                  <Text style={styles.notificationMessage}>{notification.message}</Text>
                  
                  {notification.type === 'invitation' && (
                    <View style={styles.notificationActions}>
                      <TouchableOpacity style={styles.actionButton}>
                        <Text style={styles.actionButtonText}>Accept</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionButton, styles.actionButtonSecondary]}>
                        <Text style={styles.actionButtonSecondaryText}>Decline</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
              
              {notifications.length > 0 && (
                <TouchableOpacity style={styles.clearAllButton} onPress={clearAll}>
                  <Ionicons name="trash-outline" size={16} color="#999" />
                  <Text style={styles.clearAllText}>Clear all notifications</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons 
                name={selectedType === 'unread' ? 'notifications-off-outline' : 'checkmark-done-outline'} 
                size={60} 
                color="#333" 
              />
              <Text style={styles.emptyStateTitle}>
                {selectedType === 'unread' ? 'No Unread Notifications' : 'No Notifications'}
              </Text>
              <Text style={styles.emptyStateText}>
                {selectedType === 'unread' 
                  ? 'You\'re all caught up! New notifications will appear here.'
                  : 'No notifications in this category.'}
              </Text>
              {selectedType !== 'all' && (
                <TouchableOpacity 
                  style={styles.viewAllButton}
                  onPress={() => setSelectedType('all')}
                >
                  <Text style={styles.viewAllText}>View All Notifications</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  watermarkWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  watermark: {
    width: 300,
    height: 300,
    opacity: 0.1,
  },
  content: {
    flex: 1,
    zIndex: 2,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    color: '#FFD700',
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#999',
    fontSize: 14,
    marginTop: 4,
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 6,
  },
  markAllText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
  },
  typesContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
    marginRight: 12,
  },
  typeButtonActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderColor: '#FFD700',
  },
  typeText: {
    color: '#999',
    fontSize: 12,
    fontWeight: '600',
  },
  typeTextActive: {
    color: '#FFD700',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  notificationCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  notificationCardUnread: {
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  notificationTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFD700',
  },
  notificationTime: {
    color: '#999',
    fontSize: 12,
  },
  notificationMessage: {
    color: '#999',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  notificationActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  actionButtonText: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '600',
  },
  actionButtonSecondary: {
    backgroundColor: 'transparent',
    borderColor: '#666',
  },
  actionButtonSecondaryText: {
    color: '#999',
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginBottom: 32,
  },
  clearAllText: {
    color: '#999',
    fontSize: 13,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyStateText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: 300,
  },
  viewAllButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 8,
  },
  viewAllText: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default NotificationsScreen;