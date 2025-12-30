// hooks/useUserProfile.ts
import { useState, useCallback } from "react";
import { supabase } from "@/config/supabase";
import { useAuth } from "@/stores/auth-store";

export interface UserProfile {
  id: string;
  email: string;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  bpay_tag: string | null;
  payscribe_customer_id: string | null;
  payscribe_account_number: string | null;
  country: string;
  tier: number | null;
  verification_status: string | null;
}

export default function useUserProfile() {
  const { currentAccount } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get user profile from Supabase
  const getUserProfile = useCallback(async (): Promise<UserProfile | null> => {
    try {
      if (!currentAccount?.user_id) {
        console.log('No user ID found');
        return null;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, phone, first_name, last_name, bpay_tag, payscribe_customer_id, payscribe_account_number, country, tier, verification_status")
        .eq("id", currentAccount.user_id)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      setUserProfile(data);
      return data;
    } catch (error) {
      console.error('Error in getUserProfile:', error);
      return null;
    }
  }, [currentAccount?.user_id]);

  // Load user profile
  const loadUserProfile = useCallback(async () => {
    setIsLoading(true);
    const profile = await getUserProfile();
    setIsLoading(false);
    return profile;
  }, [getUserProfile]);

  // Check customer details in Payscribe
  const checkCustomerDetails = useCallback(async (customerId: string) => {
    try {
      const API_KEY = "ps_pk_test_5fJUELCWRxbYyqE0mylVlfeekNK9iY0990";
      const API_BASE_URL = "https://sandbox.payscribe.ng/api/v1";
      
      const response = await fetch(`${API_BASE_URL}/customers/${customerId}/transactions?page=1&page_size=1`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Error checking customer:', error);
      return false;
    }
  }, []);

  return {
    userProfile,
    setUserProfile,
    isLoading,
    setIsLoading,
    getUserProfile,
    loadUserProfile,
    checkCustomerDetails,
  };
}