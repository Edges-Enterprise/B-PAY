// app/context/supabase-provider.tsx
"use client";
import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/config/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ──────── CONSTANTS ────────
const AUTH_TOKEN_KEY = "authToken";
const CURRENT_USER_KEY = "currentUser";
const SAVED_ACCOUNTS_KEY = "savedAccounts";
const MAX_ACCOUNTS = 3;

// ──────── TYPES ────────
interface UserProfile {
  id: string;
  email: string | null;
  phone: string | null;
  full_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  country_code: string | null;
  dial_code: string | null;
  flag_emoji: string | null;
  account_pin_hash?: string;
  transfer_pin_hash?: string;
}

interface SavedAccount {
  identifier: string;
  user_id: string;
  email: string | null;
  phone: string | null;
  full_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  country_code: string | null;
  dial_code: string | null;
  flag_emoji: string | null;
  last_login: string;
}

interface SupabaseContextType {
  user: UserProfile | null;
  session: any;
  loading: boolean;
  savedAccounts: SavedAccount[];
  currentAccount: SavedAccount | null;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  switchAccount: (account: SavedAccount) => Promise<void>;
  addAccount: (account: SavedAccount) => Promise<void>;
  removeAccount: (identifier: string) => Promise<void>;
  clearAllAccounts: () => Promise<void>;
}

const SupabaseContext = createContext<SupabaseContextType>({
  user: null,
  session: null,
  loading: true,
  savedAccounts: [],
  currentAccount: null,
  signOut: async () => {},
  refreshUser: async () => {},
  switchAccount: async () => {},
  addAccount: async () => {},
  removeAccount: async () => {},
  clearAllAccounts: async () => {},
});

export const SupabaseProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const [currentAccount, setCurrentAccount] = useState<SavedAccount | null>(null);

  // Load saved accounts and current user
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Load saved accounts
        const accountsJson = await AsyncStorage.getItem(SAVED_ACCOUNTS_KEY);
        const accounts: SavedAccount[] = accountsJson ? JSON.parse(accountsJson) : [];
        setSavedAccounts(accounts);

        // Load current user
        const currentUserJson = await AsyncStorage.getItem(CURRENT_USER_KEY);
        const authToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);

        if (currentUserJson && authToken) {
          const currentUser: SavedAccount = JSON.parse(currentUserJson);
          setCurrentAccount(currentUser);
          
          // Fetch fresh user data from Supabase
          const { data: userData, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.user_id)
            .single();

          if (userData && !error) {
            setUser({
              id: userData.id,
              email: userData.email,
              phone: userData.phone,
              full_name: userData.full_name,
              avatar_url: userData.avatar_url,
              is_verified: userData.is_verified,
              country_code: userData.country_code,
              dial_code: userData.dial_code,
              flag_emoji: userData.flag_emoji,
              account_pin_hash: userData.account_pin_hash,
              transfer_pin_hash: userData.transfer_pin_hash,
            });
          }
        }

        setLoading(false);
      } catch (error) {
        console.error('Error initializing auth:', error);
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const refreshUser = async () => {
    if (!currentAccount) return;

    try {
      const { data: userData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentAccount.user_id)
        .single();

      if (userData && !error) {
        const updatedUser: UserProfile = {
          id: userData.id,
          email: userData.email,
          phone: userData.phone,
          full_name: userData.full_name,
          avatar_url: userData.avatar_url,
          is_verified: userData.is_verified,
          country_code: userData.country_code,
          dial_code: userData.dial_code,
          flag_emoji: userData.flag_emoji,
          account_pin_hash: userData.account_pin_hash,
          transfer_pin_hash: userData.transfer_pin_hash,
        };
        
        setUser(updatedUser);

        // Update current account in storage
        const updatedAccount: SavedAccount = {
          ...currentAccount,
          email: userData.email,
          phone: userData.phone,
          full_name: userData.full_name,
          avatar_url: userData.avatar_url,
          is_verified: userData.is_verified,
          last_login: new Date().toISOString(),
        };

        setCurrentAccount(updatedAccount);
        await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedAccount));

        // Update in saved accounts
        const updatedAccounts = savedAccounts.map(acc => 
          acc.user_id === updatedAccount.user_id ? updatedAccount : acc
        );
        setSavedAccounts(updatedAccounts);
        await AsyncStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(updatedAccounts));
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setCurrentAccount(null);
    await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, CURRENT_USER_KEY]);
  };

  const switchAccount = async (account: SavedAccount) => {
    try {
      // Generate new auth token
      const authToken = `sb_${account.user_id}_${Date.now()}`;
      
      // Update current account
      const updatedAccount = {
        ...account,
        last_login: new Date().toISOString(),
      };

      setCurrentAccount(updatedAccount);
      await AsyncStorage.multiSet([
        [AUTH_TOKEN_KEY, authToken],
        [CURRENT_USER_KEY, JSON.stringify(updatedAccount)],
      ]);

      // Fetch fresh user data
      const { data: userData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', account.user_id)
        .single();

      if (userData && !error) {
        setUser({
          id: userData.id,
          email: userData.email,
          phone: userData.phone,
          full_name: userData.full_name,
          avatar_url: userData.avatar_url,
          is_verified: userData.is_verified,
          country_code: userData.country_code,
          dial_code: userData.dial_code,
          flag_emoji: userData.flag_emoji,
          account_pin_hash: userData.account_pin_hash,
          transfer_pin_hash: userData.transfer_pin_hash,
        });
      }

      // Update saved accounts with new last_login
      const updatedAccounts = savedAccounts.map(acc =>
        acc.user_id === account.user_id ? updatedAccount : acc
      );
      setSavedAccounts(updatedAccounts);
      await AsyncStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(updatedAccounts));

    } catch (error) {
      console.error('Error switching account:', error);
    }
  };

  const addAccount = async (account: SavedAccount) => {
    try {
      let updatedAccounts: SavedAccount[];

      if (savedAccounts.length >= MAX_ACCOUNTS) {
        // Replace the oldest account (based on last_login)
        const sortedAccounts = [...savedAccounts].sort(
          (a, b) => new Date(a.last_login).getTime() - new Date(b.last_login).getTime()
        );
        updatedAccounts = [account, ...sortedAccounts.slice(1)];
      } else {
        // Add new account
        updatedAccounts = [account, ...savedAccounts];
      }

      setSavedAccounts(updatedAccounts);
      await AsyncStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(updatedAccounts));

      // Switch to the new account
      await switchAccount(account);

    } catch (error) {
      console.error('Error adding account:', error);
    }
  };

  const removeAccount = async (identifier: string) => {
    try {
      const updatedAccounts = savedAccounts.filter(acc => acc.identifier !== identifier);
      setSavedAccounts(updatedAccounts);
      await AsyncStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(updatedAccounts));

      // If we're removing the current account, switch to another one or clear
      if (currentAccount?.identifier === identifier) {
        if (updatedAccounts.length > 0) {
          await switchAccount(updatedAccounts[0]);
        } else {
          await signOut();
        }
      }
    } catch (error) {
      console.error('Error removing account:', error);
    }
  };

  const clearAllAccounts = async () => {
    try {
      setSavedAccounts([]);
      await AsyncStorage.removeItem(SAVED_ACCOUNTS_KEY);
      await signOut();
    } catch (error) {
      console.error('Error clearing all accounts:', error);
    }
  };

  return (
    <SupabaseContext.Provider value={{
      user,
      session,
      loading,
      savedAccounts,
      currentAccount,
      signOut,
      refreshUser,
      switchAccount,
      addAccount,
      removeAccount,
      clearAllAccounts,
    }}>
      {children}
    </SupabaseContext.Provider>
  );
};

export const useAuth = () => useContext(SupabaseContext);