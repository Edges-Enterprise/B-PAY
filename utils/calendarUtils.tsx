// utils/calendarUtils.tsx
import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getDaysInMonth, getFirstDayIndex, isFutureDate, getTodayString } from '@/services/checkin.service';

interface CalendarDayProps {
  day: number;
  year: number;
  month: number;
  isToday: boolean;
  isCheckedIn: boolean;
  isFutureDate: boolean;
  isDisabled: boolean;
  processingCheckIn: boolean;
  onPress: (dateStr: string) => void;
  dayWidth: number;
}

export const CalendarDay: React.FC<CalendarDayProps> = ({
  day,
  year,
  month,
  isToday,
  isCheckedIn,
  isFutureDate,
  isDisabled,
  processingCheckIn,
  onPress,
  dayWidth,
}) => {
  const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const handlePress = () => {
    if (!isDisabled && !processingCheckIn) {
      onPress(dateStr);
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[
        {
          width: dayWidth,
          height: dayWidth,
          justifyContent: 'center',
          alignItems: 'center',
          marginVertical: 2,
          position: 'relative',
        },
        isToday && {
          borderWidth: 2,
          borderColor: '#FFD700',
          borderRadius: dayWidth / 2,
        },
        isCheckedIn && {
          backgroundColor: '#FFD70033',
          borderRadius: dayWidth / 2,
        },
        isDisabled && {
          opacity: 0.5,
        },
      ]}
      disabled={isDisabled || processingCheckIn}
      accessibilityLabel={`${day} ${isCheckedIn ? 'Checked in' : 'Not checked in'} ${isToday ? 'Today' : ''}`}
    >
      <Text
        style={[
          {
            color: '#fff',
            fontSize: 14,
          },
          isToday && {
            color: '#FFD700',
            fontWeight: 'bold',
          },
          isCheckedIn && {
            color: '#FFD700',
            fontWeight: '600',
          },
          isDisabled && {
            color: '#666',
          },
        ]}
      >
        {day}
      </Text>
      {isCheckedIn && (
        <Ionicons 
          name="checkmark" 
          size={12} 
          color="#FFD700" 
          style={{ position: 'absolute', top: 2, right: 2 }}
        />
      )}
      {processingCheckIn && isToday && !isCheckedIn && (
        <ActivityIndicator size="small" color="#FFD700" style={{ position: 'absolute' }} />
      )}
    </TouchableOpacity>
  );
};

interface CalendarGridProps {
  year: number;
  month: number;
  checkedInDates: string[];
  processingCheckIn: boolean;
  onDatePress: (dateStr: string) => void;
  dayWidth: number;
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  year,
  month,
  checkedInDates,
  processingCheckIn,
  onDatePress,
  dayWidth,
}) => {
  const daysInMonth = getDaysInMonth(year, month); // ✅ Plain function
  const firstDayIndex = getFirstDayIndex(year, month); // ✅ Plain function
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();

  const days = [];

  // Day headers
  for (let i = 0; i < 7; i++) {
    days.push(
      <Text 
        key={`header-${i}`} 
        style={{
          width: dayWidth,
          textAlign: 'center',
          fontWeight: 'bold',
          fontSize: 12,
          color: '#aaa',
          marginBottom: 6,
        }}
        accessibilityLabel={dayLabels[i]}
      >
        {dayLabels[i]}
      </Text>
    );
  }

  // Empty cells before 1st day
  for (let i = 0; i < firstDayIndex; i++) {
    days.push(<View key={`empty-${i}`} style={{ width: dayWidth, height: dayWidth }} />);
  }

  // Actual days
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    const isCheckedIn = checkedInDates.includes(dateStr);
    const isFutureDateValue = isFutureDate(dateStr); // ✅ Plain function
    const isDisabled = isCheckedIn || isFutureDateValue;

    days.push(
      <CalendarDay
        key={day}
        day={day}
        year={year}
        month={month}
        isToday={isToday}
        isCheckedIn={isCheckedIn}
        isFutureDate={isFutureDateValue}
        isDisabled={isDisabled}
        processingCheckIn={processingCheckIn}
        onPress={onDatePress}
        dayWidth={dayWidth}
      />
    );
  }

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
      {days}
    </View>
  );
};