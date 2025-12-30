// app/(app)/notifications/index.tsx
'use client';

import React, { useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useAuth } from '@/stores/auth-store';

import { RewardsTab } from './tabs/RewardsTab';
import { TransactionsTab } from './tabs/TransactionsTab';
import { ServicesTab } from './tabs/ServicesTab';
import { PromoTab } from './tabs/PromoTab';

type TabKey = 'rewards' | 'transactions' | 'services' | 'promo';

const tabs = [
  { key: 'rewards' as const, title: 'Rewards', component: RewardsTab },
  { key: 'transactions' as const, title: 'Transactions', component: TransactionsTab },
  { key: 'services' as const, title: 'Services', component: ServicesTab },
  { key: 'promo' as const, title: 'Promo', component: PromoTab },
];

export default function NotificationsScreen() {
  const { currentAccount } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('rewards');

  if (!currentAccount?.id) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loading}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const ActiveComponent = tabs.find(t => t.key === activeTab)?.component || RewardsTab;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Gold Tab Bar */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabButton,
              activeTab === tab.key && styles.activeTabButton,
            ]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
          >
            <Text
              style={
                activeTab === tab.key ? styles.activeLabel : styles.inactiveLabel
              }
            >
              {tab.title}
            </Text>
            {activeTab === tab.key && <View style={styles.indicator} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <ActiveComponent />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loading: {
    color: '#FFD700',
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTabButton: {
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
  },
  activeLabel: {
    color: '#FFD700',
    fontSize: 15,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  inactiveLabel: {
    color: '#888',
    fontSize: 15,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 3,
    backgroundColor: '#FFD700',
    borderRadius: 2,
  },
  content: {
    flex: 1,
  },
});