// services/checkin.utils.ts

// ✅ Date utilities
export const getTodayString = (): string => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

export const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

// ✅ Reward utilities
export const formatRewardAmount = (amount: number): string => {
  if (amount < 1) return amount.toFixed(2);
  return amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2);
};

export const formatRewardText = (amount: number, currencySymbol: string): string => {
  return `${currencySymbol}${formatRewardAmount(amount)}`;
};