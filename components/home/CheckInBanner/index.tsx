import React, { useState, useEffect } from "react";
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Dimensions,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/stores/auth-store";
import { createClient } from '@supabase/supabase-js';

// Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Country interface matching your existing table
interface Country {
  iso_code: string;
  name: string;
  flag_emoji: string;
  dial_code: string;
  currency_symbol: string;
  currency_code: string;
  ppp_reward_amount: number;
  is_active: boolean;
}

interface CheckInBannerProps {
  onPressSubscribe?: () => void;
  isSubscribed?: boolean;
  onCheckIn?: (date: string, rewardAmount: number, rewardSymbol: string, currencyCode: string) => void;
  checkedInDates?: string[];
  onAddNotification?: (title: string, message: string) => void;
}

// Function to fetch country with PPP reward from Supabase
const fetchCountryWithPPPReward = async (countryCode: string): Promise<Country> => {
  const { data, error } = await supabase
    .from('countries')
    .select('*')
    .eq('iso_code', countryCode)
    .eq('is_active', true)
    .single();

  if (error) {
    throw new Error(`Failed to fetch country data for ${countryCode}: ${error.message}`);
  }

  if (!data) {
    throw new Error(`No active country found with code: ${countryCode}`);
  }

  return data;
};

// Safe mask identifier function
const safeMaskIdentifier = (id: string | undefined | null): string => {
  if (!id) return 'User';
  
  // Safe check for includes method
  if (typeof id.includes !== 'function') {
    return String(id).slice(0, 4) + '*****' + String(id).slice(-3);
  }
  
  if (id.includes('@')) {
    const [local, domain] = id.split('@');
    return `${local?.[0] || ''}***@${domain || ''}`;
  } else {
    const digits = String(id).replace(/\D/g, '');
    if (digits.length < 6) return String(id);
    return `${String(id).slice(0, 4)}*****${String(id).slice(-3)}`;
  }
};

export default function CheckInBanner({
  onPressSubscribe,
  isSubscribed = false,
  onCheckIn,
  checkedInDates = [],
  onAddNotification,
}: CheckInBannerProps) {
  const { currentAccount } = useAuth();
  const [country, setCountry] = useState<Country | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = new Date();
  const month = today.getMonth();
  const year = today.getFullYear();
  const todayStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
    today.getDate()
  ).padStart(2, "0")}`;

  // Get user's country code from auth store with safe fallback
  const userCountryCode = currentAccount?.country_code || 'NG';

  // Fetch country data with PPP reward
  useEffect(() => {
    const loadCountryData = async () => {
      try {
        setLoading(true);
        setError(null);
        const countryData = await fetchCountryWithPPPReward(userCountryCode);
        setCountry(countryData);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        console.error('Country data fetch error:', errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadCountryData();
  }, [userCountryCode]);

  // Safely check if user has already checked in today
  const hasCheckedInToday = Array.isArray(checkedInDates) && checkedInDates.includes(todayStr);

  // Safe default handlers
  const safeOnPressSubscribe = onPressSubscribe || (() => {
    console.log('Subscribe pressed - no handler provided');
    Alert.alert(
      "Subscription Feature",
      "Daily Check-In subscription feature is coming soon!",
      [{ text: "OK" }]
    );
  });

  const safeOnCheckIn = onCheckIn || ((date: string, rewardAmount: number, rewardSymbol: string, currencyCode: string) => {
    console.log('Check-in pressed:', { date, rewardAmount, rewardSymbol, currencyCode });
    Alert.alert(
      "Check-In Feature",
      `Check-in for ${date} - Reward: ${rewardSymbol}${rewardAmount} ${currencyCode}`,
      [{ text: "OK" }]
    );
  });

  const safeOnAddNotification = onAddNotification || ((title: string, message: string) => {
    console.log('Notification would be added:', { title, message });
  });

  const handleSubscribe = () => {
    safeOnPressSubscribe();
    safeOnAddNotification(
      "Subscription Successful!",
      "You've subscribed to Daily Check-In Rewards. Start checking in daily to earn rewards!"
    );
  };

  const handleCheckIn = (date: string) => {
    if (date === todayStr && !hasCheckedInToday && country) {
      safeOnCheckIn(date, country.ppp_reward_amount, country.currency_symbol, country.currency_code);
      
      safeOnAddNotification(
        "Daily Check-In Reward Claimed!",
        `You've earned ${country.currency_symbol}${country.ppp_reward_amount.toFixed(2)} for checking in today!`
      );
      
      Alert.alert(
        "Check-In Successful!",
        `You've earned ${country.currency_symbol}${country.ppp_reward_amount.toFixed(2)} for today's check-in!`
      );
    }
  };

  const handleBannerPress = () => {
    if (!isSubscribed) {
      handleSubscribe();
    }
  };

  // Safe format reward text
  const rewardText = country ? 
    `${country.currency_symbol || ''}${country.ppp_reward_amount?.toFixed(country.ppp_reward_amount < 1 ? 2 : country.ppp_reward_amount % 1 === 0 ? 0 : 2) || '0.00'}` 
    : 'Loading...';

  // Generate current month days
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const renderCalendar = () => {
    const days = [];
    const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // Day headers
    for (let i = 0; i < 7; i++) {
      days.push(
        <Text key={`header-${i}`} style={styles.calDayHeader}>
          {dayLabels[i]}
        </Text>
      );
    }

    // Empty cells before 1st day
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(<View key={`empty-${i}`} style={styles.calDay} />);
    }

    // Actual days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
        day
      ).padStart(2, "0")}`;
      const isToday = day === today.getDate() && month === today.getMonth();
      const isCheckedIn = Array.isArray(checkedInDates) && checkedInDates.includes(dateStr);
      const isFutureDate = new Date(dateStr) > today;
      const isDisabled = isCheckedIn || isFutureDate;

      days.push(
        <TouchableOpacity
          key={day}
          onPress={() => handleCheckIn(dateStr)}
          style={[
            styles.calDay,
            isToday && styles.calToday,
            isCheckedIn && styles.calCheckedIn,
            isDisabled && styles.calDisabled,
          ]}
          disabled={isDisabled}
        >
          <Text
            style={[
              styles.calDayText,
              isToday && styles.calTodayText,
              isCheckedIn && styles.calCheckedInText,
              isDisabled && styles.calDisabledText,
            ]}
          >
            {day}
          </Text>
          {isCheckedIn && (
            <Ionicons 
              name="checkmark" 
              size={12} 
              color="#FFD700" 
              style={styles.checkedIcon}
            />
          )}
        </TouchableOpacity>
      );
    }

    return days;
  };

  // Calculate monthly stats with safe defaults
  const totalDaysInMonth = daysInMonth;
  const checkedInDays = Array.isArray(checkedInDates) 
    ? checkedInDates.filter(date => 
        date.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`)
      ).length 
    : 0;
  const monthlyEarnings = checkedInDays * (country?.ppp_reward_amount || 0);

  if (!isSubscribed) {
    return (
      <TouchableOpacity style={styles.checkInBanner} onPress={handleBannerPress}>
        <View style={styles.checkInLeft}>
          <View style={styles.checkInIcon}>
            <Ionicons name="gift-outline" size={28} color="#FFD700" />
          </View>
          <View>
            <Text style={styles.checkInTitle}>Daily Check-In Reward</Text>
            <Text style={styles.checkInSubtitle}>
              Subscribe now & get up to 10% increase in balance every month!
            </Text>
          </View>
        </View>
        <View style={styles.checkInButton}>
          <Text style={styles.checkInButtonText}>Subscribe Now</Text>
        </View>
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <View style={styles.calendarBanner}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#FFD700" />
          <Text style={styles.loadingText}>Loading rewards...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.calendarBanner}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={24} color="#FF6B6B" />
          <Text style={styles.errorText}>Failed to load rewards</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => window.location.reload()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.calendarBanner}>
      <View style={styles.calHeader}>
        <Text style={styles.calTitle}>Daily Check-In Calendar</Text>
        <Text style={styles.calReward}>
          Reward: {rewardText} per check-in ({userCountryCode})
        </Text>
        <View style={styles.monthlyStats}>
          <Text style={styles.statsText}>
            This month: {checkedInDays}/{totalDaysInMonth} days
          </Text>
          <Text style={styles.statsText}>
            Earned: {country?.currency_symbol || ''}{monthlyEarnings.toFixed(2)}
          </Text>
        </View>
      </View>
      
      <View style={styles.calGrid}>{renderCalendar()}</View>
      
      {!hasCheckedInToday && (
        <TouchableOpacity 
          style={styles.checkInTodayButton}
          onPress={() => handleCheckIn(todayStr)}
          disabled={!country}
        >
          <Ionicons name="calendar" size={20} color="#000" />
          <Text style={styles.checkInTodayText}>Check In Today</Text>
        </TouchableOpacity>
      )}
      
      {hasCheckedInToday && (
        <View style={styles.checkedInToday}>
          <Ionicons name="checkmark-circle" size={20} color="#FFD700" />
          <Text style={styles.checkedInTodayText}>Checked In Today!</Text>
        </View>
      )}
    </View>
  );
}

const { width } = Dimensions.get("window");
const dayWidth = (width - 48) / 7;

const styles = StyleSheet.create({
  checkInBanner: {
    backgroundColor: "#1a1a1a",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#FFD700",
    marginBottom: 20,
  },
  checkInLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  checkInIcon: {
    backgroundColor: "#FFD70022",
    padding: 10,
    borderRadius: 12,
    marginRight: 12,
  },
  checkInTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  checkInSubtitle: {
    color: "#aaa",
    fontSize: 12,
    marginTop: 2,
  },
  checkInButton: {
    backgroundColor: "#FFD700",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  checkInButtonText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 13,
  },
  calendarBanner: {
    backgroundColor: "#1a1a1a",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#FFD700",
  },
  calHeader: {
    marginBottom: 12,
  },
  calTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  calReward: {
    color: "#FFD700",
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
  },
  monthlyStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingHorizontal: 20,
  },
  statsText: {
    color: "#aaa",
    fontSize: 12,
  },
  calGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  calDayHeader: {
    width: dayWidth,
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 12,
    color: "#aaa",
    marginBottom: 6,
  },
  calDay: {
    width: dayWidth,
    height: dayWidth,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 2,
    position: "relative",
  },
  calDayText: {
    color: "#fff",
    fontSize: 14,
  },
  calToday: {
    borderWidth: 2,
    borderColor: "#FFD700",
    borderRadius: dayWidth / 2,
  },
  calTodayText: {
    color: "#FFD700",
    fontWeight: "bold",
  },
  calCheckedIn: {
    backgroundColor: "#FFD70033",
    borderRadius: dayWidth / 2,
  },
  calCheckedInText: {
    color: "#FFD700",
    fontWeight: "600",
  },
  calDisabled: {
    opacity: 0.5,
  },
  calDisabledText: {
    color: "#666",
  },
  checkedIcon: {
    position: "absolute",
    top: 2,
    right: 2,
  },
  checkInTodayButton: {
    backgroundColor: "#FFD700",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 20,
    marginTop: 12,
    gap: 8,
  },
  checkInTodayText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 14,
  },
  checkedInToday: {
    backgroundColor: "#FFD70022",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 20,
    marginTop: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "#FFD700",
  },
  checkedInTodayText: {
    color: "#FFD700",
    fontWeight: "bold",
    fontSize: 14,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  loadingText: {
    color: '#FFD700',
    fontSize: 14,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
});