// app/notifications/tabs/TransactionsTab.tsx
import React from 'react';
import { TabContent } from '@/components/notification/Tabcontent';
import { useTransactionNotifications } from '@/hooks/useTransactionNotifications';

export function TransactionsTab() {
  const { notifications, loading, error, refresh, markAsRead } = useTransactionNotifications();

  return (
    <TabContent
      notifications={notifications}
      loading={loading}
      error={error}
      refresh={refresh}
      markAsRead={markAsRead}
      title="Transactions"
    />
  );
}