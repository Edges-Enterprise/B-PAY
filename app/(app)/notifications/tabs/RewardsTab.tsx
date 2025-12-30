// app/notifications/tabs/RewardsTab.tsx
import React from 'react';
import { TabContent } from '@/components/notification/Tabcontent';
import { useNotifications } from '@/hooks/useNotifications';

export function RewardsTab() {
  const { notifications, loading, error, refresh, markAsRead } = useNotifications();
  const rewards = notifications.filter(n => n.type === 'checkin_reminder');

  return (
    <TabContent
      notifications={rewards}
      loading={loading}
      error={error}
      refresh={refresh}
      markAsRead={markAsRead}
      title="Rewards"
    />
  );
}