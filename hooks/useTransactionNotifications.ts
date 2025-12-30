// hooks/useTransactionNotifications.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/stores/auth-store';
import { Notification } from '@/types/notification';

export const useTransactionNotifications = () => {
  const { currentAccount } = useAuth();
  const userId = currentAccount?.id;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('notice_trans')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setNotifications(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [userId]);

  const refresh = useCallback(() => fetchNotifications(), [userId]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await supabase.from('notice_trans').update({ read: true }).eq('id', id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error('Mark as read failed:', err);
    }
  }, []);

  return { notifications, loading, error, refresh, markAsRead };
};