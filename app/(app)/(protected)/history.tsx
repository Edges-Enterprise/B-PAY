import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import moment from 'moment';
import { supabase } from '@/config/supabase';

interface HistoryItem {
  id: string;
  provider: string;
  data: string;
  price: number;
  date: string;
  status: 'Success' | 'Failed' | 'Pending';
  phoneNumber: string;
  reference: string;
  metadata: any;
}

const statusColors: { [key: string]: string } = {
  Success: '#22c55e',
  Failed: '#ef4444',
  Pending: '#eab308',
};

export default function HistoryScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<'All' | 'Success' | 'Failed' | 'Pending'>('All');
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [userEmail, setUserEmail] = useState<string>('');

  // Fetch user and transaction history
  const fetchHistory = useCallback(async () => {
    try {
      setRefreshing(true);

      // Get authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user || !user.email) {
        console.error('User not authenticated or email missing:', authError?.message);
        Alert.alert('Error', 'Please log in to view your transaction history.');
        router.replace('/login');
        return;
      }

      console.log('Authenticated user email:', user.email);
      setUserEmail(user.email);

      // Fetch transactions
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('id, amount, status, metadata, created_at, reference')
        .eq('user_email', user.email)
        .order('created_at', { ascending: false });

      if (txError) {
        console.error('Transaction fetch error:', txError.message);
        throw new Error('Failed to fetch transaction history');
      }

      console.log('Fetched transactions:', JSON.stringify(txData, null, 2));

      if (txData.length === 0) {
        Alert.alert('No Transactions', 'No transactions found for this account. Try making a purchase or check if you’re logged in with the correct email.');
      }

      // Map transactions to HistoryItem
      const formattedHistory: HistoryItem[] = txData.map((tx) => {
        let provider = 'Unknown';
        let data = 'Unknown';
        let phoneNumber = tx.metadata?.phone_number || 'N/A';

        if (tx.metadata?.purchase) {
          const purchase = tx.metadata.purchase;
          const [dataPart, providerPart] = purchase.split(' on ');
          data = dataPart || 'Data Purchase';
          provider = providerPart || 'Unknown';
        } else if (tx.metadata?.payment_method) {
          data = 'Wallet Funding';
          provider = tx.metadata.payment_method || 'Unknown';
        }

        const normalizedStatus = tx.status.toLowerCase();
        const status = normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1);

        return {
          id: tx.id,
          provider,
          data,
          price: Math.abs(tx.amount),
          date: tx.created_at,
          status: (['success', 'failed', 'pending'].includes(normalizedStatus)
            ? status
            : 'Unknown') as 'Success' | 'Failed' | 'Pending',
          phoneNumber,
          reference: tx.reference || 'N/A',
          metadata: tx.metadata || {},
        };
      });

      setHistory(formattedHistory);
    } catch (error) {
      console.error('Error fetching history:', error);
      Alert.alert('Error', 'Failed to load purchase history. Please try again.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Fetch history on mount
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const onRefresh = useCallback(() => {
    fetchHistory();
  }, [fetchHistory]);

  const filteredHistory = filter === 'All' ? history : history.filter(h => h.status === filter);

  const handleTransactionPress = (item: HistoryItem) => {
    try {
      router.push({
        pathname: '/(app)/receipt',
        params: {
          id: item.id,
          provider: item.provider,
          data: item.data,
          price: item.price.toString(),
          date: item.date,
          status: item.status,
          phoneNumber: item.phoneNumber,
          reference: item.reference,
          metadata: JSON.stringify(item.metadata),
        },
      });
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Error', 'Failed to navigate to receipt. Please try again.');
    }
  };

  const renderItem = ({ item }: { item: HistoryItem }) => (
    <Pressable onPress={() => handleTransactionPress(item)} style={styles.historyItem}>
      <View style={styles.historyItemHeader}>
        <Text style={styles.historyTitle}>{item.provider} - {item.data}</Text>
        <Text style={[styles.historyStatus, { color: statusColors[item.status] }]}>{item.status}</Text>
      </View>
      <Text style={styles.historyPrice}>₦{item.price}</Text>
      <Text style={styles.historyPhone}>Phone: {item.phoneNumber}</Text>
      <Text style={styles.historyDate}>Date: {moment(item.date).format('MMM D, YYYY h:mm A')}</Text>
    </Pressable>
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
              filter === item && styles.activeFilterButton,
            ]}
          >
            <Text
              style={[
                styles.filterButtonText,
                filter === item && styles.activeFilterButtonText,
              ]}
            >
              {item}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* History List */}
      {filteredHistory.length > 0 ? (
        <FlatList
          data={filteredHistory}
          keyExtractor={(item) => item.id}
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
    borderColor: '#4b5563',
  },
  activeFilterButton: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#d1d5db',
  },
  activeFilterButtonText: {
    color: '#fff',
  },
  historyItem: {
    backgroundColor: '#1f2937',
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
    color: '#d1d5db',
  },
  historyPhone: {
    color: '#9ca3af',
    fontSize: 14,
  },
  historyDate: {
    color: '#6b7280',
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