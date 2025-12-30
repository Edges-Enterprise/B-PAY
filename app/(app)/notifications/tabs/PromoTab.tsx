// app/notifications/tabs/PromoTab.tsx
import React from 'react';
import { TabContent } from '@/components/notification/Tabcontent';
import { usePromoNotifications } from '@/hooks/usePromoNotifications';

export function PromoTab() {
  const { notifications, loading, error, refresh, markAsRead } = usePromoNotifications();

  return (
    <TabContent
      notifications={notifications}
      loading={loading}
      error={error}
      refresh={refresh}
      markAsRead={markAsRead}
      title="Promo"
    />
  );
}