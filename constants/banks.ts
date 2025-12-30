export const PRIMARY_FINTECH_BANKS = {
  '100004': {
    name: 'OPay',
    code: '100004',
    priority: 100,
    patterns: [/^70/, /^81/, /^90/, /^91/],
    isFintech: true,
    isPrimary: true,
    icon: 'flash',
    color: '#F59E0B'
  },
  '100033': {
    name: 'PalmPay',
    code: '100033',
    priority: 90,
    patterns: [/^70/, /^81/, /^90/, /^91/],
    isFintech: true,
    isPrimary: true,
    icon: 'leaf',
    color: '#10B981'
  },
  '50515': {
    name: 'Moniepoint',
    code: '50515',
    priority: 80,
    patterns: [/^70/, /^81/, /^90/, /^91/],
    isFintech: true,
    isPrimary: true,
    icon: 'cash',
    color: '#3B82F6'
  }
};

export const QUICK_SEND_BANKS = [
  { code: '100004', name: 'OPay', initial: 'O', color: '#F59E0B' },
  { code: '100033', name: 'PalmPay', initial: 'P', color: '#10B981' },
  { code: '50515', name: 'Moniepoint', initial: 'M', color: '#3B82F6' },
  { code: '058', name: 'GTBank', initial: 'G', color: '#044389' },
  { code: '057', name: 'Zenith', initial: 'Z', color: '#082032' },
  { code: '044', name: 'Access', initial: 'A', color: '#E63946' },
  { code: '011', name: 'FirstBank', initial: 'F', color: '#1D3557' },
  { code: '033', name: 'UBA', initial: 'U', color: '#046307' },
];

export const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000, 20000];