// services/notification.service.ts (Updated with enhanced utilities)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '@/stores/auth-store';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Storage keys
const STORAGE_KEYS = {
  NOTIFICATIONS: 'notifications_data',
  LAST_FETCH: 'notifications_last_fetch',
  NOTIFICATION_SETTINGS: 'notificationSettings' // For sound settings
} as const;

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  read: boolean;
  type: string; // e.g., 'local_transaction', 'foreign_transaction', 'service', 'checkin_reminder'
  created_at: string;
}

// Utility to format time ago
export const formatTimeAgo = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} mins ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  return `${diffDays} days ago`;
};

// Get section title based on type
export const getSectionTitle = (type: string): string => {
  switch (type) {
    case 'local_transaction':
      return 'Local Transactions';
    case 'foreign_transaction':
      return 'Foreign Transactions';
    case 'service':
      return 'Service Activities';
    case 'checkin_reminder':
      return 'Rewards & Reminders';
    default:
      return 'General';
  }
};

// Get icon name based on type
export const getIconName = (type: string): string => {
  switch (type) {
    case 'local_transaction':
      return 'arrow-down';
    case 'foreign_transaction':
      return 'arrow-up';
    case 'service':
      return 'shield-check';
    case 'checkin_reminder':
      return 'gift-outline';
    default:
      return 'notifications-outline';
  }
};

export class NotificationService {
  /**
   * Get notifications from cache
   */
  static async getCachedNotifications(): Promise<Notification[]> {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      console.error('Error getting cached notifications:', error);
      return [];
    }
  }

  /**
   * Save notifications to cache
   */
  static async saveToCache(notifications: Notification[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_FETCH, new Date().toISOString());
    } catch (error) {
      console.error('Error saving notifications to cache:', error);
    }
  }

  /**
   * Check if cache is fresh (e.g., less than 5 minutes old)
   */
  static async isCacheFresh(): Promise<boolean> {
    try {
      const lastFetch = await AsyncStorage.getItem(STORAGE_KEYS.LAST_FETCH);
      if (!lastFetch) return false;
      const last = new Date(lastFetch);
      const now = new Date();
      const diffMs = now.getTime() - last.getTime();
      return diffMs < 5 * 60 * 1000; // 5 minutes
    } catch (error) {
      console.error('Error checking cache freshness:', error);
      return false;
    }
  }

  /**
   * Fetch notifications from Supabase
   */
  static async fetchNotifications(userId: string): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch notifications: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(id: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to mark as read: ${error.message}`);
    }
  }

  /**
   * Get notifications with cache fallback
   */
  static async getNotifications(userId: string): Promise<Notification[]> {
    const fresh = await this.isCacheFresh();
    let notifications: Notification[] = [];

    if (fresh) {
      notifications = await this.getCachedNotifications();
    } else {
      try {
        notifications = await this.fetchNotifications(userId);
        await this.saveToCache(notifications);
      } catch (error) {
        console.error('Error fetching notifications:', error);
        notifications = await this.getCachedNotifications(); // Fallback to cache
      }
    }

    return notifications;
  }

  /**
   * Save sound settings to cache
   */
  static async saveSoundSettings(settings: { selectedSound: string; soundEnabled: boolean; volume: number }): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving sound settings:', error);
    }
  }

  /**
   * Load sound settings from cache
   */
  static async loadSoundSettings(): Promise<{ selectedSound: string; soundEnabled: boolean; volume: number }> {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_SETTINGS);
      return saved ? JSON.parse(saved) : { selectedSound: 'default', soundEnabled: true, volume: 0.7 };
    } catch (error) {
      console.error('Error loading sound settings:', error);
      return { selectedSound: 'default', soundEnabled: true, volume: 0.7 };
    }
  }
}