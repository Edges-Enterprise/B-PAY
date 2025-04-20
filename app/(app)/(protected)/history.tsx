import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ScrollView,
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
  Success: 'text-green-500',
  Failed: 'text-red-500',
  Pending: 'text-yellow-500',
};

export default function HistoryScreen() {
  const [filter, setFilter] = useState<'All' | 'Success' | 'Failed' | 'Pending'>('All');

  const filteredHistory = filter === 'All' ? mockHistory : mockHistory.filter(h => h.status === filter);

  const renderItem = ({ item }: { item: HistoryItem }) => (
    <View className="bg-gray-800 p-4 rounded-xl mb-4">
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-white font-bold">{item.provider} - {item.data}</Text>
        <Text className={`text-xs font-bold ${statusColors[item.status]}`}>{item.status}</Text>
      </View>
      <Text className="text-gray-300">₦{item.price}</Text>
      <Text className="text-gray-400 text-sm">Phone: {item.phoneNumber}</Text>
      <Text className="text-gray-500 text-xs mt-1">Date: {moment(item.date).format('MMM D, YYYY h:mm A')}</Text>
    </View>
  );

  return (
    <View className="flex-1 bg-black pt-12 px-4">
      <Text className="text-white text-2xl font-bold mb-4">Purchase History</Text>

      {/* Filter Tabs */}
      <View className="flex-row justify-between items-center mb-4">
        {['All', 'Success', 'Failed', 'Pending'].map((item) => (
          <Pressable
            key={item}
            onPress={() => setFilter(item as typeof filter)}
            className={`px-3 py-1 rounded-full border ${
              filter === item ? 'bg-blue-600 border-blue-600' : 'border-gray-600'
            }`}
          >
            <Text className={`text-sm ${filter === item ? 'text-white' : 'text-gray-300'}`}>{item}</Text>
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
        />
      ) : (
        <View className="flex-1 justify-center items-center mt-20">
          <Ionicons name="document-text-outline" size={48} color="#777" />
          <Text className="text-gray-400 mt-2">No history to show</Text>
        </View>
      )}
    </View>
  );
}
