import AsyncStorage from '@react-native-async-storage/async-storage';
import { CountryService, Country } from './country.service';

// Storage keys
const STORAGE_KEYS = {
  IS_SUBSCRIBED: 'checkin_subscribed',
  CHECKED_IN_DATES: 'checkin_dates',
  PENDING_SYNC_DATES: 'checkin_pending_sync'
} as const;

// Date utilities - Plain functions
export const getTodayString = (): string => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
    today.getDate()
  ).padStart(2, "0")}`;
};

export const getCurrentMonthKey = (): string => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
};

export const isSameMonth = (dateStr: string): boolean => {
  return dateStr.startsWith(getCurrentMonthKey());
};

export const getDateString = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
};

export const isToday = (dateStr: string): boolean => {
  return dateStr === getTodayString();
};

export const isFutureDate = (dateStr: string): boolean => {
  return new Date(dateStr) > new Date();
};

export const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

export const getFirstDayIndex = (year: number, month: number): number => {
  return new Date(year, month, 1).getDay();
};

// Reward calculation utilities - Plain functions
export const calculateMonthlyEarnings = (checkedInDates: string[], rewardAmount: number): number => {
  const currentMonthDates = checkedInDates.filter(date => 
    isSameMonth(date)
  );
  return currentMonthDates.length * rewardAmount;
};

export const calculateCurrentStreak = (checkedInDates: string[]): number => {
  if (checkedInDates.length === 0) return 0;
  
  const sortedDates = [...checkedInDates].sort();
  let streak = 0;
  let currentDate = new Date();
  
  // Check backwards from today
  while (true) {
    const dateStr = getDateString(currentDate);
    if (sortedDates.includes(dateStr)) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }
  
  return streak;
};

export const formatRewardAmount = (amount: number): string => {
  if (amount < 1) return amount.toFixed(2);
  return amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2);
};

export const formatRewardText = (amount: number, currencySymbol: string): string => {
  return `${currencySymbol}${formatRewardAmount(amount)}`;
};

// Main CheckIn service with offline queue - Plain object
export const CheckInService = {
  /**
   * Get subscription status
   */
  async getSubscriptionStatus(): Promise<boolean> {
    try {
      const subscribed = await AsyncStorage.getItem(STORAGE_KEYS.IS_SUBSCRIBED);
      return subscribed === 'true';
    } catch (error) {
      console.error('Error getting subscription status:', error);
      return false;
    }
  },

  /**
   * Set subscription status
   */
  async setSubscriptionStatus(subscribed: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.IS_SUBSCRIBED, subscribed.toString());
    } catch (error) {
      console.error('Error setting subscription status:', error);
      throw error;
    }
  },

  /**
   * Get checked-in dates
   */
  async getCheckedInDates(): Promise<string[]> {
    try {
      const dates = await AsyncStorage.getItem(STORAGE_KEYS.CHECKED_IN_DATES);
      return dates ? JSON.parse(dates) : [];
    } catch (error) {
      console.error('Error getting checked-in dates:', error);
      return [];
    }
  },

  /**
   * Save checked-in dates with offline queue
   */
  async saveCheckedInDates(dates: string[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CHECKED_IN_DATES, JSON.stringify(dates));
      
      // Add to pending sync queue
      const pendingSync = await this.getPendingSyncDates();
      const newDates = dates.filter(date => !pendingSync.includes(date));
      if (newDates.length > 0) {
        await AsyncStorage.setItem(
          STORAGE_KEYS.PENDING_SYNC_DATES, 
          JSON.stringify([...pendingSync, ...newDates])
        );
      }
    } catch (error) {
      console.error('Error saving checked-in dates:', error);
      throw error;
    }
  },

  /**
   * Get pending sync dates
   */
  async getPendingSyncDates(): Promise<string[]> {
    try {
      const dates = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_SYNC_DATES);
      return dates ? JSON.parse(dates) : [];
    } catch (error) {
      console.error('Error getting pending sync dates:', error);
      return [];
    }
  },

  /**
   * Sync pending check-ins to server
   */
  async syncPendingCheckIns(userId: string): Promise<void> {
    try {
      const pendingDates = await this.getPendingSyncDates();
      if (pendingDates.length === 0) return;

      // Here you would sync with your backend
      console.log('Syncing check-ins:', pendingDates, 'for user:', userId);
      
      // After successful sync, clear pending dates
      await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_SYNC_DATES);
    } catch (error) {
      console.error('Error syncing check-ins:', error);
      throw error;
    }
  },

  /**
   * Process daily check-in
   */
  async processCheckIn(countryCode: string): Promise<{
    success: boolean;
    rewardAmount?: number;
    currencySymbol?: string;
    currencyCode?: string;
    error?: string;
  }> {
    try {
      const today = getTodayString();
      const hasCheckedIn = await this.hasCheckedInToday();

      if (hasCheckedIn) {
        return { success: false, error: 'Already checked in today' };
      }

      // Get country data for reward calculation
      const country = await CountryService.getCountryWithPPPReward(countryCode);
      
      if (!country) {
        return { success: false, error: 'Country data not found' };
      }

      // Add today to checked-in dates
      const currentDates = await this.getCheckedInDates();
      const newDates = [...currentDates, today];
      await this.saveCheckedInDates(newDates);

      return {
        success: true,
        rewardAmount: country.ppp_reward_amount,
        currencySymbol: country.currency_symbol,
        currencyCode: country.currency_code
      };

    } catch (error) {
      console.error('Error processing check-in:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  },

  /**
   * Check if user has checked in today
   */
  async hasCheckedInToday(): Promise<boolean> {
    const dates = await this.getCheckedInDates();
    return dates.includes(getTodayString());
  },

  /**
   * Get monthly statistics
   */
  async getMonthlyStats(countryCode: string): Promise<{
    checkedInDays: number;
    totalDaysInMonth: number;
    monthlyEarnings: number;
    currentStreak: number;
    rewardAmount?: number;
    currencySymbol?: string;
  }> {
    try {
      const checkedInDates = await this.getCheckedInDates();
      const today = new Date();
      const totalDaysInMonth = getDaysInMonth(today.getFullYear(), today.getMonth());
      const checkedInDays = checkedInDates.filter(date => 
        isSameMonth(date)
      ).length;
      
      const currentStreak = calculateCurrentStreak(checkedInDates);

      // Get country data for reward calculation
      const country = await CountryService.getCountryWithPPPReward(countryCode);
      const rewardAmount = country?.ppp_reward_amount || 0;
      const monthlyEarnings = calculateMonthlyEarnings(checkedInDates, rewardAmount);

      return {
        checkedInDays,
        totalDaysInMonth,
        monthlyEarnings,
        currentStreak,
        rewardAmount,
        currencySymbol: country?.currency_symbol
      };
    } catch (error) {
      console.error('Error getting monthly stats:', error);
      return {
        checkedInDays: 0,
        totalDaysInMonth: 0,
        monthlyEarnings: 0,
        currentStreak: 0
      };
    }
  },

  /**
   * Reset all check-in data
   */
  async resetAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.IS_SUBSCRIBED,
        STORAGE_KEYS.CHECKED_IN_DATES,
        STORAGE_KEYS.PENDING_SYNC_DATES
      ]);
    } catch (error) {
      console.error('Error resetting check-in data:', error);
      throw error;
    }
  }
};