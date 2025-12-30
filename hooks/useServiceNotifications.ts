// hooks/useServiceNotifications.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/stores/auth-store';
import { Notification } from '@/types/notification';

export const useServiceNotifications = () => {
  const { currentAccount } = useAuth();
  const userId = currentAccount?.id;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notice_serve')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setNotifications(data || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, [userId]);

  const refresh = useCallback(fetch, [userId]);

  const markAsRead = useCallback(async (id: string) => {
    await supabase.from('notice_serve').update({ read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  return { notifications, loading, error, refresh, markAsRead };
};