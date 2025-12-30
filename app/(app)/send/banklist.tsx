import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Animated,
  RefreshControl,
  Keyboard,
  Platform,
  SectionList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/stores/auth-store';

// Cache key for persistent storage
const BANKS_CACHE_KEY = 'cached_banks_v2';

// Bank-logo always white background - no hardcoded bank codes
const BankLogo = ({ bankCode, bankName, size = 24, logoUrl }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  if (logoUrl && !imageError) {
    return (
      <View style={[styles.bankLogoContainer, { width: size, height: size }]}>
        <View style={[
          styles.bankLogoBackground, 
          { 
            backgroundColor: '#FFFFFF',
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 1,
            borderColor: '#E5E7EB',
          }
        ]}>
          <Image
            source={{ uri: logoUrl }}
            style={[
              styles.bankLogoImage, 
              { 
                width: size * 0.7,
                height: size * 0.7,
                opacity: imageLoaded ? 1 : 0,
              }
            ]}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
          {!imageLoaded && (
            <View style={styles.loadingPlaceholder}>
              <Text style={[
                styles.bankLogoInitial, 
                { 
                  fontSize: size * 0.3,
                  color: '#000'
                }
              ]}>
                {bankName ? bankName[0].toUpperCase() : 'B'}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  }
  
  // Fallback to initial with white background
  const initial = bankName ? bankName[0].toUpperCase() : 'B';
  
  return (
    <View style={[styles.bankLogoContainer, { width: size, height: size }]}>
      <View 
        style={[
          styles.bankLogoFallback, 
          { 
            width: size, 
            height: size, 
            backgroundColor: '#FFFFFF',
            borderRadius: size / 2,
            borderWidth: 1,
            borderColor: '#E5E7EB',
          }
        ]}
      >
        <Text style={[
          styles.bankLogoInitial, 
          { 
            fontSize: size * 0.35,
            color: '#000'
          }
        ]}>
          {initial}
        </Text>
      </View>
    </View>
  );
};

const BankListScreen = () => {
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [cachedBanks, setCachedBanks] = useState([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const accountNumber = params.accountNumber as string;
  
  // Watermark pulse animation
  const watermarkPulse = React.useRef(new Animated.Value(1)).current;
  const sectionListRef = useRef(null);

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(watermarkPulse, {
          toValue: 1.06,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(watermarkPulse, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Fetch and cache banks
  const { refetch, isRefetching } = useQuery({
    queryKey: ['allBanksWithLogos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_account_prefixes')
        .select('bank_code, bank_name, prefixes, logo_url, is_fintech, popularity_score')
        .eq('is_active', true)
        .order('bank_name');
      
      if (error) throw error;
      
      // Save to persistent cache
      await AsyncStorage.setItem(BANKS_CACHE_KEY, JSON.stringify(data));
      setCachedBanks(data || []);
      setIsInitialLoad(false);
      
      return data || [];
    },
    // Only run on first load or manual refresh
    enabled: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  // Load from cache on initial render
  useEffect(() => {
    const loadCachedBanks = async () => {
      try {
        const cached = await AsyncStorage.getItem(BANKS_CACHE_KEY);
        if (cached) {
          setCachedBanks(JSON.parse(cached));
          setIsInitialLoad(false);
        }
        // Always trigger a background fetch to ensure data is fresh
        refetch();
      } catch (error) {
        console.error('Failed to load cached banks:', error);
        refetch();
      }
    };
    
    loadCachedBanks();
  }, []);

  // Fetch user's recently used banks
  const { data: recentBanksData } = useQuery({
    queryKey: ['userRecentBanksList', user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_bank_preferences')
        .select('bank_code, bank_name, last_used, usage_count')
        .eq('user_id', user.id)
        .order('last_used', { ascending: false })
        .limit(8);
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Get banks from either cache or fresh data
  const allBanks = cachedBanks;

  // Get matched banks based on account number prefix
  const matchedBanks = useMemo(() => {
    if (!accountNumber || !allBanks || allBanks.length === 0) return [];
    
    return allBanks
      .filter(bank => {
        if (!bank.prefixes) return false;
        return bank.prefixes.some(prefix => 
          accountNumber.startsWith(prefix)
        );
      })
      .sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0))
      .slice(0, 4);
  }, [accountNumber, allBanks]);

  // Get popular banks
  const popularBanks = useMemo(() => {
    if (!allBanks || allBanks.length === 0) return [];
    
    const recentBankCodes = recentBanksData?.map(bank => bank.bank_code) || [];
    
    return [...allBanks]
      .sort((a, b) => {
        const aScore = (a.popularity_score || 0) + (recentBankCodes.includes(a.bank_code) ? 100 : 0);
        const bScore = (b.popularity_score || 0) + (recentBankCodes.includes(b.bank_code) ? 100 : 0);
        return bScore - aScore;
      })
      .slice(0, 6);
  }, [allBanks, recentBanksData]);

  // Filter banks based on search
  const filteredBanks = useMemo(() => {
    if (!allBanks || allBanks.length === 0) return [];
    if (!searchQuery.trim()) return [];
    
    return allBanks.filter(bank =>
      bank.bank_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allBanks, searchQuery]);

  // Group banks by first letter for SectionList
  const groupedBanks = useMemo(() => {
    if (!allBanks || allBanks.length === 0) return [];
    
    const groups = {};
    
    allBanks.forEach(bank => {
      const firstLetter = bank.bank_name[0].toUpperCase();
      if (!groups[firstLetter]) {
        groups[firstLetter] = [];
      }
      groups[firstLetter].push(bank);
    });
    
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([title, data]) => ({ title, data }));
  }, [allBanks]);

  // Handle bank selection
  const handleBankSelect = useCallback((bank) => {
    router.setParams({
      selectedBank: JSON.stringify({
        code: bank.bank_code,
        name: bank.bank_name,
      }),
      fromBankList: 'true',
    });
    router.back();
  }, []);

  // Pull to refresh handler
  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Handle search input
  const handleSearchChange = useCallback((text) => {
    setSearchQuery(text);
    if (text.length === 1 && sectionListRef.current) {
      // Scroll to top when starting search
      sectionListRef.current.scrollToLocation({
        sectionIndex: 0,
        itemIndex: 0,
        animated: true,
      });
    }
  }, []);

  // Handle search submit
  const handleSearchSubmit = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  // Render bank item
  const renderBankItem = ({ item }) => (
    <TouchableOpacity
      key={item.bank_code}
      style={styles.bankListItem}
      onPress={() => handleBankSelect(item)}
    >
      <View style={styles.bankListItemInfo}>
        <BankLogo 
          bankCode={item.bank_code}
          bankName={item.bank_name}
          size={24}
          logoUrl={item.logo_url}
        />
        <View style={styles.bankListItemDetails}>
          <Text style={styles.bankListItemName}>{item.bank_name}</Text>
          {item.is_fintech && (
            <View style={styles.fintechBadge}>
              <Text style={styles.fintechBadgeText}>Fintech</Text>
            </View>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#22C55E" />
    </TouchableOpacity>
  );

  // Render section header
  const renderSectionHeader = ({ section: { title } }) => (
    <Text style={styles.letterTitle}>{title}</Text>
  );

  // Get sections for SectionList
  const getSections = () => {
    if (searchQuery) {
      // When searching, show flat list with search results
      return filteredBanks.length > 0 
        ? [{ title: 'Search Results', data: filteredBanks }]
        : [];
    } else {
      // When not searching, show grouped banks
      return groupedBanks;
    }
  };

  const sections = getSections();

  return (
    <View style={styles.container}>
      {/* Watermark */}
      <Animated.View pointerEvents="none" style={styles.watermarkWrapper}>
        <Animated.Image
          source={require('@/assets/icons/home.png')}
          style={[styles.watermark, { transform: [{ scale: watermarkPulse }] }]}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search-outline" size={22} color="#FFD700" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search bank name"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={handleSearchChange}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
          />
        </View>
      </View>

      <SectionList
        ref={sectionListRef}
        sections={sections}
        keyExtractor={(item) => item.bank_code}
        renderItem={renderBankItem}
        renderSectionHeader={renderSectionHeader}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            colors={['#22C55E']}
            tintColor="#22C55E"
          />
        }
        ListHeaderComponent={
          <>
            {/* Matched Banks Section */}
            {accountNumber && matchedBanks.length > 0 && searchQuery.length === 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Matched Bank</Text>
                <View style={styles.matchedBanksGrid}>
                  {matchedBanks.map(bank => (
                    <TouchableOpacity
                      key={bank.bank_code}
                      style={styles.matchedBankCard}
                      onPress={() => handleBankSelect(bank)}
                    >
                      <BankLogo 
                        bankCode={bank.bank_code}
                        bankName={bank.bank_name}
                        size={32}
                        logoUrl={bank.logo_url}
                      />
                      <Text style={styles.matchedBankName} numberOfLines={1}>
                        {bank.bank_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Popular Banks Section */}
            {popularBanks.length > 0 && searchQuery.length === 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Popular Banks</Text>
                  <Ionicons name="trending-up" size={18} color="#FFD700" />
                </View>
                <View style={styles.popularBanksGrid}>
                  {popularBanks.map(bank => (
                    <TouchableOpacity
                      key={bank.bank_code}
                      style={styles.popularBankCard}
                      onPress={() => handleBankSelect(bank)}
                    >
                      <BankLogo 
                        bankCode={bank.bank_code}
                        bankName={bank.bank_name}
                        size={32}
                        logoUrl={bank.logo_url}
                      />
                      <Text style={styles.popularBankName} numberOfLines={1}>
                        {bank.bank_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          searchQuery ? (
            <View style={styles.noResultsContainer}>
              <Ionicons name="search-outline" size={48} color="#374151" />
              <Text style={styles.noResultsText}>
                No banks found for "{searchQuery}"
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={<View style={{ height: 80 }} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  watermarkWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  watermark: {
    width: 300,
    height: 300,
    opacity: 0.10,
  },
  searchContainer: {
    paddingTop: Platform.OS === 'ios' ? 80 : 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
    zIndex: 10,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    padding: 0,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  matchedBanksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  matchedBankCard: {
    alignItems: 'center',
    width: '23%',
  },
  matchedBankName: {
    color: '#D1D5DB',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
  },
  popularBanksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  popularBankCard: {
    alignItems: 'center',
    width: '30%',
  },
  popularBankName: {
    color: '#FFFFFF',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
  },
  bankListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  bankListItemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  bankListItemDetails: {
    flex: 1,
  },
  bankListItemName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  fintechBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  fintechBadgeText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '600',
  },
  letterTitle: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 20,
    paddingLeft: 4,
    letterSpacing: 1,
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noResultsText: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  bankLogoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankLogoBackground: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bankLogoImage: {
    resizeMode: 'contain',
  },
  loadingPlaceholder: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  bankLogoFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  bankLogoInitial: {
    fontWeight: 'bold',
  },
});

export default BankListScreen;