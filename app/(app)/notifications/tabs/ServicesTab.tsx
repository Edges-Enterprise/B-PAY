// app/notifications/tabs/ServicesTab.tsx
import React from 'react';
import { TabContent } from '@/components/notification/Tabcontent';
import { useServiceNotifications } from '@/hooks/useServiceNotifications';

export function ServicesTab() {
  const { notifications, loading, error, refresh, markAsRead } = useServiceNotifications();

  return (
    <TabContent
      notifications={notifications}
      loading={loading}
      error={error}
      refresh={refresh}
      markAsRead={markAsRead}
      title="Services"
    />
  );
}