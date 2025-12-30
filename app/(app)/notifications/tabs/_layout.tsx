import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function NotificationsTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="PromoTab"
        options={{
          title: 'Promos',
        }}
      />
      <Tabs.Screen
        name="RewardsTab"
        options={{
          title: 'Rewards',
        }}
      />
      <Tabs.Screen
        name="ServicesTab"
        options={{
          title: 'Services',
        }}
      />
      <Tabs.Screen
        name="TransactionsTab"
        options={{
          title: 'Transactions',
        }}
      />
    </Tabs>
  );
}
