import { supabase } from '@/config/supabase';

export interface BankInfo {
  code: string;
  name: string;
  prefixes?: string[];
  confidence?: 'auto' | 'manual' | 'ambiguous';
  bankType?: 'digital' | 'traditional' | 'mfb';
  detectionMethod?: 'prefix' | 'phone_pattern' | 'length' | 'range';
}

// Nigerian mobile network prefixes (without leading 0)
export const NIGERIAN_PHONE_PREFIXES = {
  MTN: ['701', '702', '703', '704', '705', '706', '707', '708', '709', '810', '811', '812', '813', '814'],
  AIRTEL: ['801', '802', '803', '804', '805', '806', '807', '808', '809', '810', '811', '812'],
  GLO: ['705', '707', '709', '815', '816', '817', '818', '819', '805', '807', '809'],
  '9MOBILE': ['901', '902', '903', '904', '905', '906', '907', '908', '909', '810', '811', '812'],
  MTEL: ['904']
};

// Digital banks that use phone numbers as accounts
export const DIGITAL_BANKS = ['OPay', 'PalmPay', 'Kuda Bank', 'Sparkle Bank', 'Rubies Bank', 'MoneyPoint'];

/**
 * Enhanced bank detection that understands phone number patterns
 */
export async function smartBankDetection(
  accountNumber: string
): Promise<{ 
  banks: BankInfo[]; 
  detectionType: 'auto' | 'manual' | 'ambiguous';
  analysis: AccountAnalysis;
}> {
  
  // Step 1: Analyze the account number
  const analysis = analyzeAccountNumberDeep(accountNumber);
  
  // Step 2: Check if it's a phone number pattern
  if (analysis.isPhoneNumberPattern) {
    return await detectDigitalBanks(accountNumber, analysis);
  }
  
  // Step 3: Traditional bank detection
  return await detectTraditionalBanks(accountNumber, analysis);
}

/**
 * Deep analysis of account number
 */
export function analyzeAccountNumberDeep(accountNumber: string): AccountAnalysis {
  const prefix3 = accountNumber.slice(0, 3);
  const prefix4 = accountNumber.slice(0, 4);
  const is10Digits = accountNumber.length === 10;
  const isPhoneNumber = is10Digits && /^[7-9][0-9]{9}$/.test(accountNumber);
  
  // Check network
  let network: string | null = null;
  if (Object.values(NIGERIAN_PHONE_PREFIXES.MTN).includes(prefix3)) network = 'MTN';
  else if (Object.values(NIGERIAN_PHONE_PREFIXES.AIRTEL).includes(prefix3)) network = 'AIRTEL';
  else if (Object.values(NIGERIAN_PHONE_PREFIXES.GLO).includes(prefix3)) network = 'GLO';
  else if (Object.values(NIGERIAN_PHONE_PREFIXES['9MOBILE']).includes(prefix3)) network = '9MOBILE';
  
  return {
    prefix3,
    prefix4,
    is10Digits,
    isPhoneNumberPattern: isPhoneNumber,
    network,
    likelyDigitalBank: isPhoneNumber,
    confidence: isPhoneNumber ? 'high' : 'low',
    suggestions: []
  };
}

/**
 * Detect digital banks for phone-number accounts
 */
async function detectDigitalBanks(
  accountNumber: string, 
  analysis: AccountAnalysis
): Promise<{ banks: BankInfo[]; detectionType: 'auto' | 'manual' | 'ambiguous'; analysis: AccountAnalysis }> {
  
  // Get all digital banks
  const { data: digitalBanks, error } = await supabase
    .from('bank_account_prefixes')
    .select('bank_code, bank_name, prefixes, bank_type')
    .eq('bank_type', 'digital')
    .order('bank_name', { ascending: true });
  
  if (error) {
    console.error('Error fetching digital banks:', error);
    throw error;
  }
  
  // Transform and add detection info
  const banks: BankInfo[] = (digitalBanks || []).map(bank => {
    const matchesPrefix = bank.prefixes?.includes(analysis.prefix3);
    
    return {
      code: bank.bank_code,
      name: bank.bank_name,
      prefixes: bank.prefixes,
      bankType: bank.bank_type,
      confidence: matchesPrefix ? 'auto' : 'manual',
      detectionMethod: matchesPrefix ? 'prefix' : 'phone_pattern'
    };
  });
  
  // Sort: banks that match prefix first, then others
  const sortedBanks = banks.sort((a, b) => {
    if (a.confidence === 'auto' && b.confidence !== 'auto') return -1;
    if (b.confidence === 'auto' && a.confidence !== 'auto') return 1;
    return a.name.localeCompare(b.name);
  });
  
  // Determine detection type
  const exactMatches = sortedBanks.filter(b => b.confidence === 'auto');
  let detectionType: 'auto' | 'manual' | 'ambiguous' = 'manual';
  
  if (exactMatches.length === 1) {
    detectionType = 'auto';
  } else if (exactMatches.length > 1) {
    detectionType = 'ambiguous';
  }
  
  // Update analysis with suggestions
  analysis.suggestions = [
    `Account appears to be a ${analysis.network} phone number`,
    'Digital banks often use phone numbers as accounts',
    'Select the digital bank you used to open this account'
  ];
  
  return { banks: sortedBanks, detectionType, analysis };
}

/**
 * Detect traditional banks
 */
async function detectTraditionalBanks(
  accountNumber: string,
  analysis: AccountAnalysis
): Promise<{ banks: BankInfo[]; detectionType: 'auto' | 'manual' | 'ambiguous'; analysis: AccountAnalysis }> {
  
  if (!accountNumber || accountNumber.length < 3) {
    return await getAllBanksForSelection(analysis);
  }
  
  // Query for matching prefixes
  const { data: matchedBanks, error } = await supabase
    .from('bank_account_prefixes')
    .select('bank_code, bank_name, prefixes, bank_type')
    .contains('prefixes', [analysis.prefix3]);
  
  if (error) {
    console.error('Error fetching banks:', error);
    throw error;
  }
  
  if (!matchedBanks || matchedBanks.length === 0) {
    return await getAllBanksForSelection(analysis);
  }
  
  // Transform banks
  const banks: BankInfo[] = matchedBanks.map(bank => ({
    code: bank.bank_code,
    name: bank.bank_name,
    prefixes: bank.prefixes,
    bankType: bank.bank_type,
    confidence: 'auto',
    detectionMethod: 'prefix'
  }));
  
  // Determine detection type
  const detectionType: 'auto' | 'ambiguous' = banks.length === 1 ? 'auto' : 'ambiguous';
  
  // Update analysis
  analysis.suggestions = [
    `Account starts with ${analysis.prefix3}`,
    `${banks.length} bank${banks.length > 1 ? 's' : ''} found with this prefix`
  ];
  
  return { banks, detectionType, analysis };
}

/**
 * Get all banks for manual selection
 */
async function getAllBanksForSelection(
  analysis: AccountAnalysis
): Promise<{ banks: BankInfo[]; detectionType: 'manual'; analysis: AccountAnalysis }> {
  
  const { data, error } = await supabase
    .from('bank_account_prefixes')
    .select('bank_code, bank_name, prefixes, bank_type')
    .order('bank_name', { ascending: true });
  
  if (error) {
    console.error('Error fetching all banks:', error);
    throw error;
  }
  
  const banks: BankInfo[] = (data || []).map(bank => ({
    code: bank.bank_code,
    name: bank.bank_name,
    prefixes: bank.prefixes,
    bankType: bank.bank_type,
    confidence: 'manual',
    detectionMethod: undefined
  }));
  
  // Update analysis
  analysis.suggestions = [
    'No specific bank detected for this account',
    'Please select the bank from the list below'
  ];
  
  return { banks, detectionType: 'manual', analysis };
}

/**
 * Get bank by exact code
 */
export async function getBankByCode(code: string): Promise<BankInfo | null> {
  const { data, error } = await supabase
    .from('bank_account_prefixes')
    .select('bank_code, bank_name, prefixes, bank_type')
    .eq('bank_code', code)
    .single();
  
  if (error) return null;
  
  return {
    code: data.bank_code,
    name: data.bank_name,
    prefixes: data.prefixes,
    bankType: data.bank_type,
    confidence: 'auto'
  };
}

/**
 * Get popular digital banks (for quick selection)
 */
export async function getPopularDigitalBanks(): Promise<BankInfo[]> {
  const popularCodes = ['076', '999', '090', '513', '777']; // OPay, PalmPay, Kuda, Sparkle, MoneyPoint
  
  const { data, error } = await supabase
    .from('bank_account_prefixes')
    .select('bank_code, bank_name, prefixes, bank_type')
    .in('bank_code', popularCodes)
    .order('bank_name', { ascending: true });
  
  if (error) return [];
  
  return (data || []).map(bank => ({
    code: bank.bank_code,
    name: bank.bank_name,
    prefixes: bank.prefixes,
    bankType: bank.bank_type,
    confidence: 'manual'
  }));
}

interface AccountAnalysis {
  prefix3: string;
  prefix4: string;
  is10Digits: boolean;
  isPhoneNumberPattern: boolean;
  network: string | null;
  likelyDigitalBank: boolean;
  confidence: 'high' | 'medium' | 'low';
  suggestions: string[];
}