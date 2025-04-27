import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ScrollView,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';

interface HistoryItem {
  id: number;
  provider: string;
  data: string;
  price: number;
  date: string;
  status: 'Success' | 'Failed' | 'Pending';
  phoneNumber: string;
}

const mockHistory: HistoryItem[] = [
  { id: 1, provider: 'MTN', data: '1GB', price: 200, date: '2024-08-01T10:20:00Z', status: 'Success', phoneNumber: '08012345678' },
  { id: 2, provider: 'MTN', data: '2GB', price: 400, date: '2024-08-02T14:00:00Z', status: 'Success', phoneNumber: '08012345678' },
  { id: 3, provider: 'MTN', data: '500MB', price: 100, date: '2024-08-04T08:30:00Z', status: 'Failed', phoneNumber: '08087654321' },
  { id: 4, provider: 'MTN', data: '10GB', price: 2000, date: '2024-08-05T16:45:00Z', status: 'Pending', phoneNumber: '08022223333' },
];

const statusColors: { [key: string]: string } = {
  Success: '#22c55e', // Green
  Failed: '#ef4444',  // Red
  Pending: '#eab308', // Yellow
};

export default function HistoryScreen() {
  const [filter, setFilter] = useState<'All' | 'Success' | 'Failed' | 'Pending'>('All');
  const [refreshing, setRefreshing] = useState(false);

  const filteredHistory = filter === 'All' ? mockHistory : mockHistory.filter(h => h.status === filter);

  const onRefresh = useCallback(() => {
    setRefreshing(true);

    // Simulate refreshing (e.g., API call)
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const renderItem = ({ item }: { item: HistoryItem }) => (
    <View style={styles.historyItem}>
      <View style={styles.historyItemHeader}>
        <Text style={styles.historyTitle}>{item.provider} - {item.data}</Text>
        <Text style={[styles.historyStatus, { color: statusColors[item.status] }]}>{item.status}</Text>
      </View>
      <Text style={styles.historyPrice}>₦{item.price}</Text>
      <Text style={styles.historyPhone}>Phone: {item.phoneNumber}</Text>
      <Text style={styles.historyDate}>Date: {moment(item.date).format('MMM D, YYYY h:mm A')}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Purchase History</Text>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        {['All', 'Success', 'Failed', 'Pending'].map((item) => (
          <Pressable
            key={item}
            onPress={() => setFilter(item as typeof filter)}
            style={[
              styles.filterButton,
              filter === item && styles.activeFilterButton
            ]}
          >
            <Text style={[
              styles.filterButtonText,
              filter === item && styles.activeFilterButtonText
            ]}>
              {item}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* History List */}
      {filteredHistory.length > 0 ? (
        <FlatList
          data={filteredHistory}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={48} color="#777" />
          <Text style={styles.emptyStateText}>No history to show</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 48,
    paddingHorizontal: 16,
  },
  heading: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  filterTabs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#4b5563', // Gray-600
  },
  activeFilterButton: {
    backgroundColor: '#2563eb', // Blue-600
    borderColor: '#2563eb',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#d1d5db', // Gray-300
  },
  activeFilterButtonText: {
    color: '#fff',
  },
  historyItem: {
    backgroundColor: '#1f2937', // Gray-800
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyTitle: {
    color: '#fff',
    fontWeight: 'bold',
  },
  historyStatus: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  historyPrice: {
    color: '#d1d5db', // Gray-300
  },
  historyPhone: {
    color: '#9ca3af', // Gray-400
    fontSize: 14,
  },
  historyDate: {
    color: '#6b7280', // Gray-500
    fontSize: 12,
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 80,
  },
  emptyStateText: {
    color: '#9ca3af',
    marginTop: 8,
  },
});
