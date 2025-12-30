// hooks/useVirtualAccount.ts
import { useState, useCallback } from "react";
import { Alert } from "react-native";
import { supabase } from "@/config/supabase";
import { useAuth } from "@/stores/auth-store";

const API_BASE_URL = "https://sandbox.payscribe.ng/api/v1";
const API_KEY = "ps_pk_test_5fJUELCWRxbYyqE0mylVlfeekNK9iY0990";

export interface VirtualAccountResponse {
  status: boolean;
  description: string;
  message: {
    details: {
      customer: {
        id: string;
        name: string;
      };
      account: {
        id: string;
        account_number: string;
        account_name: string;
        bank_name: string;
        bank_code: string;
        currency: string;
        account_type: string;
      };
      status: string;
      created_at: string;
      updated_at: string;
    };
  };
  status_code: number;
}

interface VirtualAccount {
  bankName: string;
  accountNumber: string;
  accountName: string;
  fullAccountNumber: string;
}

export default function useVirtualAccount() {
  const { currentAccount } = useAuth();
  const [ngnAccount, setNgnAccount] = useState<VirtualAccount | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasExistingAccount, setHasExistingAccount] = useState(false);

  // Check if virtual account exists in Supabase
  const checkExistingVirtualAccount = useCallback(async () => {
    try {
      if (!currentAccount?.user_id) return false;

      const { data, error } = await supabase
        .from("profiles")
        .select("payscribe_account_number, bank_name, first_name, last_name")
        .eq("id", currentAccount.user_id)
        .single();

      if (error) throw error;

      if (data?.payscribe_account_number) {
        const fullAccountNumber = data.payscribe_account_number;
        setNgnAccount({
          bankName: data.bank_name || "9PSB", // Use bank_name column, not payscribe_bank_name
          accountNumber: fullAccountNumber, // NO MASKING - show full number
          accountName: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
          fullAccountNumber: fullAccountNumber
        });
        setHasExistingAccount(true);
        return true;
      }
      
      setHasExistingAccount(false);
      return false;
    } catch (error) {
      console.error('Error checking virtual account:', error);
      setHasExistingAccount(false);
      return false;
    }
  }, [currentAccount?.user_id]);

  // Create virtual account via Payscribe
  const createVirtualAccount = useCallback(async (customerId: string): Promise<VirtualAccountResponse | null> => {
    try {
      if (!customerId || customerId.trim() === '') {
        throw new Error('Invalid customer ID');
      }

      const payload = {
        account_type: "static",
        currency: "NGN",
        customer_id: customerId.trim(),
        bank: ["9psb"]
      };

      const response = await fetch(`${API_BASE_URL}/collections/virtual-accounts/create`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.description || errorData.message || errorText;
        } catch {
          errorMessage = errorText;
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      console.error("Error creating virtual account:", error);
      let errorMessage = "Failed to create virtual account. Please check your connection and try again.";
      
      if (error instanceof Error) {
        if (error.message.includes('400')) {
          errorMessage = "Invalid request. Please check if the customer ID is correct.";
        } else if (error.message.includes('401')) {
          errorMessage = "Authentication failed. Please check your API key.";
        } else if (error.message.includes('404')) {
          errorMessage = "Customer not found. Please create the customer first.";
        } else {
          errorMessage = error.message;
        }
      }
      
      Alert.alert("API Error", errorMessage);
      return null;
    }
  }, []);

  // Update database with virtual account
  const updateDatabaseWithVirtualAccount = useCallback(async (userId: string, accountNumber: string, bankName?: string, accountName?: string) => {
    try {
      const updateData: any = {
        payscribe_account_number: accountNumber,
        updated_at: new Date().toISOString(),
      };

      if (bankName) {
        updateData.bank_name = bankName; // Use bank_name column
      }

      // Note: account_name is not stored separately in your schema
      // It's composed of first_name and last_name

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating database:', error);
      return false;
    }
  }, []);

  // Keep maskAccountNumber function but don't use it for display
  const maskAccountNumber = (accountNumber: string): string => {
    if (!accountNumber || accountNumber.length < 10) {
      return "Account number unavailable";
    }
    
    const firstSix = accountNumber.slice(0, 6);
    const lastFour = accountNumber.slice(-4);
    return `${firstSix}****${lastFour}`;
  };

  return {
    ngnAccount,
    setNgnAccount,
    isGenerating,
    setIsGenerating,
    hasExistingAccount,
    setHasExistingAccount,
    checkExistingVirtualAccount,
    createVirtualAccount,
    updateDatabaseWithVirtualAccount,
    maskAccountNumber,
  };
}