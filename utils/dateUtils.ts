// utils/dateUtils.ts
export const getTodayString = (): string => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

export const getCurrentMonthKey = (): string => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
};

export const isSameMonth = (dateStr: string): boolean => {
  return dateStr.startsWith(getCurrentMonthKey());
};

export const getDateString = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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