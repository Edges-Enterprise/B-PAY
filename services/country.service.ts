import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Country {
  iso_code: string;
  name: string;
  flag_emoji: string;
  dial_code: string;
  currency_symbol: string;
  currency_code: string;
  ppp_reward_amount: number;
  is_active: boolean;
}

export class CountryService {
  /**
   * Fetch country data with PPP reward from Supabase
   */
  static async getCountryWithPPPReward(countryCode: string): Promise<Country> {
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
  }

  /**
   * Get all active countries
   */
  static async getActiveCountries(): Promise<Country[]> {
    const { data, error } = await supabase
      .from('countries')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      throw new Error(`Failed to fetch countries: ${error.message}`);
    }

    return data || [];
  }
}