// hooks/useSendData.tsx
import { useState, useEffect } from 'react';
import { supabase } from '@/config/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Country {
  iso_code: string;
  name: string;
  flag_emoji: string;
  isFavorite?: boolean;
}

export const useSendData = () => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [filteredCountries, setFilteredCountries] = useState<Country[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFavorites = async (data: Country[]) => {
    try {
      const favorites = await AsyncStorage.getItem('favorite_countries');
      const favCodes = favorites ? JSON.parse(favorites) : [];
      return data.map(c => ({ ...c, isFavorite: favCodes.includes(c.iso_code) }));
    } catch {
      return data;
    }
  };

  const toggleFavorite = async (isoCode: string) => {
    const updated = countries.map(c =>
      c.iso_code === isoCode ? { ...c, isFavorite: !c.isFavorite } : c
    );
    setCountries(updated);
    setFilteredCountries(updated);

    const favCodes = updated.filter(c => c.isFavorite).map(c => c.iso_code);
    await AsyncStorage.setItem('favorite_countries', JSON.stringify(favCodes));
  };

  const fetchCountries = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    else setRefreshing(true);

    try {
      const { data, error } = await supabase
        .from('countries')
        .select('iso_code, name, flag_emoji')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      const withFavorites = await loadFavorites(data || []);
      setCountries(withFavorites);
      setFilteredCountries(withFavorites);
    } catch (err) {
      console.error('Error loading countries:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCountries();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredCountries(countries);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredCountries(
        countries.filter(c => 
          c.name.toLowerCase().includes(query) ||
          c.iso_code.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, countries]);

  const localTransfers = [
    { type: 'tag' as const, title: '$B-PAY Tag', subtitle: 'Send to a B-Pay tag or invite phone contact' },
    { type: 'bank' as const, title: 'NGN Bank Accounts', subtitle: 'Send to a bank account' },
    { type: 'enaira' as const, title: 'eNaira', subtitle: 'Send to an eNaira account' },
  ];

  const internationalOptions = [
    { type: 'globe' as const, title: 'Send Internationally', subtitle: 'To 20+ countries' },
    { type: 'usd' as const, title: 'Send Digital Dollars', subtitle: 'To USDC, USDT, or PYUSD addresses' },
  ];

  return {
    countries: filteredCountries,
    searchQuery,
    setSearchQuery,
    loading,
    refreshing,
    refresh: () => fetchCountries(true),
    toggleFavorite,
    localTransfers,
    internationalOptions,
  };
};