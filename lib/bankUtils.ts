import { supabase } from '@/config/supabase';

export interface BankInfo {
  code: string;
  name: string;
  prefixes?: string[];
  confidence?: 'auto' | 'manual' | 'ambiguous';
}

/**
 * Detect banks from account number prefix using ONLY Supabase
 */
export async function detectBanksByAccountNumber(
  accountNumber: string
): Promise<{ banks: BankInfo[]; detectionType: 'auto' | 'manual' | 'ambiguous' }> {
  
  if (!accountNumber || accountNumber.length < 3) {
    // Get all banks for manual selection
    const { data } = await supabase
      .from('bank_account_prefixes')
      .select('bank_code, bank_name, prefixes')
      .order('bank_name', { ascending: true });
    
    const banks: BankInfo[] = (data || []).map(item => ({
      code: item.bank_code,
      name: item.bank_name,
      prefixes: item.prefixes || [],
      confidence: 'manual'
    }));
    
    return { banks, detectionType: 'manual' };
  }
  
  // Extract prefixes to check
  const prefix3 = accountNumber.slice(0, 3);
  const prefix2 = accountNumber.slice(0, 2);
  
  // Query Supabase for matching banks
  const { data: matchedBanks, error } = await supabase
    .from('bank_account_prefixes')
    .select('bank_code, bank_name, prefixes')
    .or(`prefixes.cs.{${prefix3}},prefixes.cs.{${prefix2}}`);
  
  if (error) {
    console.error('Supabase error:', error);
    throw error;
  }
  
  if (!matchedBanks || matchedBanks.length === 0) {
    // No matches found - return all banks
    const { data: allBanks } = await supabase
      .from('bank_account_prefixes')
      .select('bank_code, bank_name, prefixes')
      .order('bank_name', { ascending: true });
    
    const banks: BankInfo[] = (allBanks || []).map(item => ({
      code: item.bank_code,
      name: item.bank_name,
      prefixes: item.prefixes || [],
      confidence: 'manual'
    }));
    
    return { banks, detectionType: 'manual' };
  }
  
  // Create bank list with confidence levels
  const banks: BankInfo[] = matchedBanks.map(item => ({
    code: item.bank_code,
    name: item.bank_name,
    prefixes: item.prefixes || [],
    confidence: 'auto'
  }));
  
  // Determine detection type
  let detectionType: 'auto' | 'ambiguous' = 'auto';
  if (matchedBanks.length > 1) {
    detectionType = 'ambiguous';
  }
  
  return { banks, detectionType };
}

/**
 * Get all banks from Supabase
 */
export async function getAllBanks(): Promise<BankInfo[]> {
  const { data, error } = await supabase
    .from('bank_account_prefixes')
    .select('bank_code, bank_name, prefixes')
    .order('bank_name', { ascending: true });
  
  if (error) {
    console.error('Error fetching banks:', error);
    throw error;
  }
  
  return (data || []).map(item => ({
    code: item.bank_code,
    name: item.bank_name,
    prefixes: item.prefixes || [],
    confidence: 'manual'
  }));
}