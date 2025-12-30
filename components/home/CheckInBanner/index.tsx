// components/CheckInBanner.tsx
import React, { useRef, useState, useEffect } from "react";
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '@/stores/auth-store';
import { useCheckIn } from '@/hooks/useCheckIn';
import { getTodayString, getDaysInMonth, formatRewardText } from '@/utils/checkin.utils';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface CheckInBannerProps {
  onAddNotification?: (title: string, message: string) => void;
}

export default function CheckInBanner({ onAddNotification }: CheckInBannerProps) {
  const { currentAccount } = useAuth();
  const {
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
    userCountryCode,
    hasCheckedInToday,
  } = useCheckIn();

  const today = new Date();
  const month = today.getMonth();
  const year = today.getFullYear();
  const todayStr = getTodayString();
  const currentDayNum = today.getDate();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const currentMonthName = monthNames[month];
  const safeOnAddNotification = onAddNotification || ((title: string, message: string) => {
    console.log('Notification:', { title, message });
  });

  const scrollRef = useRef<ScrollView>(null);
  const [timeLeft, setTimeLeft] = useState('00:00:00');

  const numPreviousClaimed = checkedInDates.filter(dateStr => {
    const [yStr, mStr, dStr] = dateStr.split('-');
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10) - 1;
    const d = parseInt(dStr, 10);
    return y === year && m === month && d < currentDayNum;
  }).length;

  useEffect(() => {
    if (!isSubscribed || hasCheckedInToday || !scrollRef.current) return;
    const cellWidthWithMargin = 50 + 4;
    const position = numPreviousClaimed * cellWidthWithMargin;
    scrollRef.current.scrollTo({ x: position, animated: false });
  }, [isSubscribed, hasCheckedInToday, numPreviousClaimed, checkedInDates, currentDayNum]);

  // Countdown timer for next check-in
  useEffect(() => {
    if (!hasCheckedInToday) return;

    const updateTimer = () => {
      const now = new Date();
      let nextCheckIn = new Date(year, month, currentDayNum + 1, 0, 0, 0);
      let diff = nextCheckIn.getTime() - now.getTime();
      if (diff < 0) {
        nextCheckIn = new Date(nextCheckIn.getTime() + 24 * 60 * 60 * 1000);
        diff = nextCheckIn.getTime() - now.getTime();
      }
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [hasCheckedInToday, year, month, currentDayNum]);

  // Send notifications every 2 hours when checked in today
  useEffect(() => {
    if (!hasCheckedInToday || !currentAccount?.id) return;

    const sendPeriodicNotification = async () => {
      const now = new Date();
      let nextCheckIn = new Date(year, month, currentDayNum + 1, 0, 0, 0);
      if (nextCheckIn < now) {
        nextCheckIn = new Date(nextCheckIn.getTime() + 24 * 60 * 60 * 1000);
      }
      const diffMs = nextCheckIn.getTime() - now.getTime();
      const hoursLeft = Math.floor(diffMs / 3600000);
      const message = `Your next check-in starts in ${hoursLeft} hours. Get ready to claim your daily reward!`;
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: currentAccount.id,
          title: 'Check-in Reminder',
          message,
          read: false,
          type: 'checkin_reminder',
        });
      if (error) {
        console.error('Failed to insert notification:', error);
      }
    };

    sendPeriodicNotification();
    const interval = setInterval(sendPeriodicNotification, 2 * 60 * 60 * 1000); // 2 hours
    return () => clearInterval(interval);
  }, [hasCheckedInToday, currentAccount?.id, year, month, currentDayNum]);

  const handleSubscribe = async () => {
    const result = await subscribe();
    if (result.success) {
      safeOnAddNotification(
        "Subscription Successful! 🎉",
        "You've subscribed to Daily Check-In Rewards. Check in daily to earn rewards!"
      );
    } else {
      safeOnAddNotification(
        "Subscription Failed",
        result.error || "Please try again"
      );
    }
  };

  const handleCheckIn = async (date: string) => {
    if (date !== todayStr || hasCheckedInToday) return;
    const result = await checkIn();
    if (result.success && result.rewardAmount !== undefined && result.currencySymbol) {
      safeOnAddNotification(
        "Daily Check-In Reward Claimed! 💰",
        `You've earned ${result.currencySymbol}${result.rewardAmount.toFixed(2)} for checking in today!`
      );
    } else {
      safeOnAddNotification(
        "Check-In Failed",
        result.error || "Please try again"
      );
    }
  };

  const handleBannerPress = () => {
    if (!isSubscribed) {
      handleSubscribe();
    }
  };

  const rewardText = country
    ? formatRewardText(country.ppp_reward_amount, country.currency_symbol)
    : 'Loading...';

  const { width } = Dimensions.get("window");

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
          <TouchableOpacity style={styles.retryButton} onPress={retry}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!isSubscribed) {
    return (
      <TouchableOpacity style={styles.checkInBanner} onPress={handleBannerPress}>
        <View style={styles.checkInLeft}>
          <View style={styles.checkInIcon}>
            <Ionicons name="gift-outline" size={28} color="#FFD700" />
          </View>
          <View style={styles.checkInTextContainer}>
            <Text style={styles.checkInTitle}>Daily Check-In </Text>
            <Text style={styles.checkInSubtitle}>
              Subscribe now & earn {rewardText} daily! {country?.flag_emoji || '🎁'}
            </Text>
          </View>
        </View>
        <View style={styles.checkInButton}>
          <Text style={styles.checkInButtonText}>Subscribe Now</Text>
        </View>
      </TouchableOpacity>
    );
  }

  // Collapsed view when checked in today
  if (hasCheckedInToday) {
    return (
      <View style={styles.collapsedBanner}>
        <Text style={styles.timerText}>
          Next Check-in  <Text style={styles.timerValue}>{timeLeft}</Text>
        </Text>
      </View>
    );
  }

  // Full calendar view
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const daysInMonth = getDaysInMonth(year, month);

  // Render days starting from today to end of month
  const visibleDays = Array.from({ length: daysInMonth - currentDayNum + 1 }, (_, i) => {
    const dayNum = currentDayNum + i;
    const date = new Date(year, month, dayNum);
    const dayOfWeek = date.getDay();
    const label = dayLabels[dayOfWeek];
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const isToday = dayNum === currentDayNum;
    const isFuture = dayNum > currentDayNum;
    const isCheckedIn = checkedInDates.includes(dateStr);
    const isGrayed = isFuture && !isCheckedIn;
    const isDisabled = isFuture || isCheckedIn;
    const cellWidth = 50;
    return (
      <View key={dayNum} style={{ width: cellWidth, alignItems: 'center', marginHorizontal: 2 }}>
        <Text style={styles.dayLabel}>{label}</Text>
        <TouchableOpacity
          onPress={() => handleCheckIn(dateStr)}
          disabled={isDisabled || processingCheckIn}
          style={[
            styles.horizontalDayCell,
            isToday && styles.todayCell,
            isCheckedIn && styles.checkedInCell,
            isGrayed && styles.grayedCell,
          ]}
        >
          <Text style={[
            styles.dayNumber,
            isToday && styles.todayNumber,
            isCheckedIn && styles.checkedInNumber,
            isGrayed && styles.grayedNumber,
          ]}>
            {dayNum}
          </Text>
          {isCheckedIn && (
            <Ionicons
              name="checkmark"
              size={10}
              color="#FFD700"
              style={styles.checkmarkIcon}
            />
          )}
          {processingCheckIn && isToday && !isCheckedIn && (
            <ActivityIndicator size="small" color="#FFD700" style={styles.spinner} />
          )}
        </TouchableOpacity>
      </View>
    );
  });

  // Render previous claimed days before today
  const previousDays = Array.from({ length: currentDayNum - 1 }, (_, i) => {
    const dayNum = i + 1;
    const date = new Date(year, month, dayNum);
    const dayOfWeek = date.getDay();
    const label = dayLabels[dayOfWeek];
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const isCheckedIn = checkedInDates.includes(dateStr);
    if (!isCheckedIn) return null; // Only show if claimed
    const cellWidth = 50;
    return (
      <View key={dayNum} style={{ width: cellWidth, alignItems: 'center', marginHorizontal: 2 }}>
        <Text style={styles.dayLabel}>{label}</Text>
        <View
          style={[
            styles.horizontalDayCell,
            styles.checkedInCell,
          ]}
        >
          <Text style={styles.checkedInNumber}>
            {dayNum}
          </Text>
          <Ionicons
            name="checkmark"
            size={10}
            color="#FFD700"
            style={styles.checkmarkIcon}
          />
        </View>
      </View>
    );
  }).filter(Boolean);

  return (
    <View style={styles.calendarBanner}>
      <Text style={styles.monthHeader}>{`${currentMonthName} ${year}`}</Text>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        style={styles.horizontalCalendar}
      >
        <View style={styles.horizontalDaysContainer}>
          {previousDays}
          {visibleDays}
        </View>
      </ScrollView>
      {country && (
        <TouchableOpacity
          style={[
            styles.claimButton,
            processingCheckIn && styles.claimButtonDisabled,
          ]}
          onPress={() => handleCheckIn(todayStr)}
          disabled={processingCheckIn}
        >
          {processingCheckIn ? (
            <ActivityIndicator size="small" color="#FFD700" />
          ) : (
            <Text style={styles.claimButtonText}>
              Claim {formatRewardText(country.ppp_reward_amount, country.currency_symbol)}
            </Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  checkInBanner: {
    backgroundColor: "#1a1a1a",
    borderRadius: 14,
    padding: 5,
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
  checkInTextContainer: {
    flex: 1,
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
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    top:30
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
  collapsedBanner: {
    backgroundColor: "#1a1a1a",
    borderRadius: 14,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#FFD700",
    alignItems: "center",
    minHeight: 5,
  },
  monthHeader: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
  },
  horizontalCalendar: {
    marginBottom: 12,
    maxHeight: 70,
  },
  horizontalDaysContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dayLabel: {
    color: "#aaa",
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 2,
  },
  horizontalDayCell: {
    width: 50,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  todayCell: {
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  checkedInCell: {
    backgroundColor: '#FFD70033',
  },
  grayedCell: {
    opacity: 0.5,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  todayNumber: {
    color: '#FFD700',
  },
  checkedInNumber: {
    color: '#FFD700',
  },
  grayedNumber: {
    color: '#666',
  },
  checkmarkIcon: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  spinner: {
    position: 'absolute',
  },
  claimButton: {
    borderWidth: 1,
    borderColor: "#FFD700",
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
  },
  claimButtonDisabled: {
    opacity: 0.7,
  },
  claimButtonText: {
    color: "#FFD700",
    fontWeight: "bold",
    fontSize: 12,
  },
  timerText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
  },
  timerValue: {
    color: "#FFD700",
    fontWeight: "bold",
    fontSize: 18,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 12,
  },
  loadingText: {
    color: "#FFD700",
    fontSize: 14,
  },
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 12,
  },
  errorText: {
    color: "#FF6B6B",
    fontSize: 14,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#FF6B6B",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },
});