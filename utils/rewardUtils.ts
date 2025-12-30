// utils/rewardUtils.ts
import { isSameMonth, getDateString } from './dateUtils';

export const calculateMonthlyEarnings = (checkedInDates: string[], rewardAmount: number): number => {
  const currentMonthDates = checkedInDates.filter(date => isSameMonth(date));
  return currentMonthDates.length * rewardAmount;
};

export const calculateCurrentStreak = (checkedInDates: string[]): number => {
  if (checkedInDates.length === 0) return 0;
  
  const sortedDates = [...checkedInDates].sort();
  let streak = 0;
  let currentDate = new Date();
  
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