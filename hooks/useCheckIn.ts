// hooks/useCheckIn.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/stores/auth-store';
import { supabase } from '@/config/supabase';
import { getTodayString } from '@/utils/checkin.utils';

export interface Country {
  name: string;
  iso_code: string;
  flag_emoji: string;
  currency_symbol: string;
  ppp_reward_amount: number;
  is_active: boolean;
}

export interface CheckInRecord {
  id: string;
  user_id: string;
  date: string;
  reward_amount: number;
  currency_symbol: string;
  created_at: string;
}

export interface MonthlyStats {
  total_rewards: number;
  check_in_count: number;
  current_streak: number;
  longest_streak: number;
}

export function useCheckIn() {
  const { currentAccount } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [country, setCountry] = useState<Country | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [checkedInDates, setCheckedInDates] = useState<CheckInRecord[]>([]);
  const [processingCheckIn, setProcessingCheckIn] = useState(false);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats>({
    total_rewards: 0,
    check_in_count: 0,
    current_streak: 0,
    longest_streak: 0,
  });

  // Load user-specific data
  const loadUserData = useCallback(async () => {
    if (!currentAccount?.user_id) return;

    try {
      setLoading(true);
      setError(null);

      // Load user's country from profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('country_code')
        .eq('id', currentAccount.user_id)
        .single();

      if (profileError) {
        console.error('Error loading profile:', profileError);
        throw profileError;
      }

      console.log('📋 User profile data:', profileData);

      const userCountryCode = profileData?.country_code;
      
      if (userCountryCode) {
        console.log('🔍 Loading country data for:', userCountryCode);
        
        // Find country by iso_code in countries table
        const { data: countryData, error: countryError } = await supabase
          .from('countries')
          .select('name, iso_code, flag_emoji, currency_symbol, ppp_reward_amount, is_active')
          .eq('iso_code', userCountryCode)
          .eq('is_active', true)
          .single();

        if (countryError) {
          console.error('Error loading country:', countryError);
          // Don't throw error here, just continue without country data
          console.log('⚠️ Could not load country data for code:', userCountryCode);
        } else {
          console.log('✅ Country data loaded:', countryData);
          setCountry(countryData);
        }
      } else {
        console.log('⚠️ No country_code found in user profile');
      }

      // Load user's subscription status
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('checkin_subscriptions')
        .select('*')
        .eq('user_id', currentAccount.user_id)
        .single();

      if (subscriptionError && subscriptionError.code !== 'PGRST116') {
        // PGRST116 is "not found" which is fine
        console.error('Error loading subscription:', subscriptionError);
      }

      setIsSubscribed(!!subscriptionData);

      // Load user's check-in records for current month
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      const { data: checkInData, error: checkInError } = await supabase
        .from('checkin_records')
        .select('*')
        .eq('user_id', currentAccount.user_id)
        .gte('date', firstDayOfMonth.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (checkInError) {
        console.error('Error loading check-in records:', checkInError);
        throw checkInError;
      }

      console.log('✅ Check-in records loaded:', checkInData);
      setCheckedInDates(checkInData || []);

      // Calculate monthly stats for this user
      const userCheckIns = checkInData || [];
      const totalRewards = userCheckIns.reduce((sum, record) => sum + record.reward_amount, 0);
      const checkInCount = userCheckIns.length;
      
      // Calculate streaks for this user
      const streaks = calculateStreaks(userCheckIns.map(record => record.date));
      
      setMonthlyStats({
        total_rewards: totalRewards,
        check_in_count: checkInCount,
        current_streak: streaks.currentStreak,
        longest_streak: streaks.longestStreak,
      });

    } catch (err) {
      console.error('Error loading check-in data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load check-in data');
    } finally {
      setLoading(false);
    }
  }, [currentAccount?.user_id]);

  // Calculate streaks for a user
  const calculateStreaks = (dates: string[]) => {
    if (dates.length === 0) return { currentStreak: 0, longestStreak: 0 };

    const sortedDates = [...dates].sort();
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;

    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = new Date(sortedDates[i - 1]);
      const currDate = new Date(sortedDates[i]);
      const diffTime = currDate.getTime() - prevDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);

      if (diffDays === 1) {
        tempStreak++;
      } else if (diffDays > 1) {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }

    longestStreak = Math.max(longestStreak, tempStreak);

    // Calculate current streak
    const today = new Date();
    const todayStr = getTodayString();
    
    // If user checked in today, current streak is the tempStreak
    if (sortedDates.includes(todayStr)) {
      currentStreak = tempStreak;
    } else {
      // Check if yesterday was checked in
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      if (sortedDates.includes(yesterdayStr)) {
        currentStreak = tempStreak;
      } else {
        currentStreak = 0;
      }
    }

    return { currentStreak, longestStreak };
  };

  const subscribe = async () => {
    if (!currentAccount?.user_id) {
      return { success: false, error: 'No user logged in' };
    }

    try {
      const { error } = await supabase
        .from('checkin_subscriptions')
        .insert({
          user_id: currentAccount.user_id,
          subscribed_at: new Date().toISOString(),
        });

      if (error) throw error;
      
      setIsSubscribed(true);
      return { success: true };
    } catch (err) {
      console.error('Error subscribing:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Subscription failed' };
    }
  };

  const unsubscribe = async () => {
    if (!currentAccount?.user_id) {
      return { success: false, error: 'No user logged in' };
    }

    try {
      const { error } = await supabase
        .from('checkin_subscriptions')
        .delete()
        .eq('user_id', currentAccount.user_id);

      if (error) throw error;
      
      setIsSubscribed(false);
      return { success: true };
    } catch (err) {
      console.error('Error unsubscribing:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Unsubscription failed' };
    }
  };

  const checkIn = async () => {
    if (!currentAccount?.user_id) {
      return { success: false, error: 'User not logged in' };
    }

    // Use country data if available, otherwise use default values for Nigeria
    const rewardAmount = country?.ppp_reward_amount || 10.00; // Default to Nigeria's reward
    const currencySymbol = country?.currency_symbol || '₦'; // Default to Nigeria's currency

    const todayStr = getTodayString();
    
    // Check if user already checked in today
    const hasCheckedInToday = checkedInDates.some(record => 
      record.date === todayStr && record.user_id === currentAccount.user_id
    );

    if (hasCheckedInToday) {
      return { success: false, error: 'Already checked in today' };
    }

    setProcessingCheckIn(true);

    try {
      const { data, error } = await supabase
        .from('checkin_records')
        .insert({
          user_id: currentAccount.user_id,
          date: todayStr,
          reward_amount: rewardAmount,
          currency_symbol: currencySymbol,
        })
        .select()
        .single();

      if (error) throw error;

      // Reload user data to get updated records
      await loadUserData();
      
      return { 
        success: true, 
        rewardAmount: rewardAmount, 
        currencySymbol: currencySymbol 
      };
    } catch (err) {
      console.error('Error checking in:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Check-in failed' };
    } finally {
      setProcessingCheckIn(false);
    }
  };

  const retry = () => {
    loadUserData();
  };

  const hasCheckedInToday = checkedInDates.some(record => 
    record.date === getTodayString() && record.user_id === currentAccount?.user_id
  );

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  return {
    country,
    loading,
    error,
    isSubscribed,
    checkedInDates,
    processingCheckIn,
    monthlyStats,
    subscribe,
    unsubscribe,
    checkIn,
    retry,
    userCountryCode: country?.iso_code || null,
    hasCheckedInToday,
  };
}