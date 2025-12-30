import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

interface BPaySearchProps {
  onRecipientSelect: (recipient: any) => void;
  onSearch: (query: string) => Promise<any>;
  placeholder?: string;
}

export default function BPaySearch({
  onRecipientSelect,
  onSearch,
  placeholder = "Search by $B-PAY tag or name",
}: BPaySearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const handleSearch = async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await onSearch(query);
      setSearchResults(results || []);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 3) {
        handleSearch(searchQuery);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
        {isSearching && <ActivityIndicator size="small" color="#FFD700" />}
      </View>

      {searchResults.length > 0 && (
        <View style={styles.resultsContainer}>
          {searchResults.map((result) => (
            <TouchableOpacity
              key={result.id}
              style={styles.resultItem}
              onPress={() => {
                onRecipientSelect(result);
                setSearchQuery('');
                setSearchResults([]);
              }}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {result.first_name?.[0] || '?'}
                </Text>
              </View>
              <View style={styles.resultInfo}>
                <Text style={styles.resultName}>
                  {result.first_name} {result.last_name}
                </Text>
                <Text style={styles.resultTag}>@{result.bpay_tag}</Text>
              </View>
              <MaterialCommunityIcons name="phonebook" size={20} color="#FFD700" />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  resultsContainer: {
    marginTop: 8,
    backgroundColor: '#111',
    borderRadius: 12,
    overflow: 'hidden',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  resultTag: {
    color: '#FFD700',
    fontSize: 12,
    marginTop: 2,
  },
});