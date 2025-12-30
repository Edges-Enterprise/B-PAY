// hooks/useNotifications.ts (Fixed - Direct import for utilities)
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/stores/auth-store';
import { NotificationService, Notification, getSectionTitle } from '@/services/notification.service'; // Import getSectionTitle directly

export const useNotifications = () => {
  const { currentAccount } = useAuth();
  const userId = currentAccount?.id;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load notifications
  useEffect(() => {
    const loadNotifications = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await NotificationService.getNotifications(userId);
        setNotifications(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load notifications';
        setError(errorMessage);
        console.error('Error loading notifications:', errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, [userId]);

  // Refresh notifications
  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await NotificationService.getNotifications(userId);
      setNotifications(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Retry failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Mark as read
  const markAsRead = useCallback(async (id: string) => {
    try {
      await NotificationService.markAsRead(id);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  }, []);

  // Offloaded grouping logic: Group by section title (derived from type)
  const groupedNotifications = useMemo(() => {
    const groups = notifications.reduce((acc, notif) => {
      const section = getSectionTitle(notif.type); // Fixed: Direct call, not NotificationService.getSectionTitle
      if (!acc[section]) acc[section] = [];
      acc[section].push(notif);
      return acc;
    }, {} as Record<string, Notification[]>);
    return groups;
  }, [notifications]);

  const sectionKeys = useMemo(() => Object.keys(groupedNotifications), [groupedNotifications]);

  // Sorting: Ensure sections are in a consistent order (e.g., prioritize unread)
  const sortedSectionKeys = useMemo(() => {
    return sectionKeys.sort((a, b) => {
      const unreadA = groupedNotifications[a].filter(n => !n.read).length;
      const unreadB = groupedNotifications[b].filter(n => !n.read).length;
      return unreadB - unreadA; // Prioritize sections with more unread
    });
  }, [sectionKeys, groupedNotifications]);

  return {
    notifications,
    groupedNotifications,
    sectionKeys: sortedSectionKeys, // Use sorted keys
    loading,
    error,
    refresh,
    markAsRead,
  };
};