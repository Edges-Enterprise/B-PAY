// stores/auth-store.ts
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as Crypto from 'expo-crypto';

// ──────── TYPES ────────
export interface UserProfile {
  id: string;
  email: string | null;
  phone: string | null;
  full_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  country_code: string | null;
  dial_code: string | null;
  flag_emoji: string | null;
  currency_symbol: string | null;
  username: string | null;
  bpay_tag: string | null;
  bonus_percent: number;
  balance: number;
}

export interface SavedAccount extends UserProfile {
  identifier: string;     // email or phone
  user_id: string;        // Same as id - Zustand is source of truth
  last_login: string;
  security_token_hash: string;
  transfer_token_hash: string;
}

interface AuthState {
  // Core data - Zustand is the source of truth
  currentUser: UserProfile | null;
  currentAccount: SavedAccount | null;
  savedAccounts: SavedAccount[];
  // Authentication state
  isAuthenticated: boolean;
  // UI State Flags (not persisted)
  isLoading: boolean;
  isInitialized: boolean;
  // Actions
  initializeAuth: () => Promise<void>;
  setSession: (user: UserProfile | null, account: SavedAccount | null) => void;
  addAccount: (account: SavedAccount) => void;
  switchAccount: (account: SavedAccount) => void;
  removeAccount: (identifier: string) => void;
  logout: () => Promise<void>;
  clearAllAccounts: () => void;
  login: (userData: UserProfile, identifier: string, securityTokenHash: string, transferTokenHash: string, skipSupabaseCheck?: boolean) => Promise<void>;
  verifySecurityTokenLocally: (securityToken: string) => Promise<boolean>;
  verifyTransferToken: (transferToken: string) => Promise<boolean>;
  autoSelectAccount: () => void;
  setCurrentAccount: (account: SavedAccount | null) => void;
  syncProfileToSupabase: (profile: UserProfile) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const MAX_ACCOUNTS = 3;

// Supabase client for background sync only
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ──────── SECURITY FUNCTIONS ────────
const hashPIN = async (pin: string): Promise<string> => {
  const saltBytes = await Crypto.getRandomBytesAsync(16);
  
  let saltHex = '';
  for (let i = 0; i < saltBytes.length; i++) {
    saltHex += saltBytes[i].toString(16).padStart(2, '0');
  }

  let pinWithSalt = pin;
  for (let i = 0; i < saltBytes.length; i++) {
    pinWithSalt += String.fromCharCode(saltBytes[i]);
  }

  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    pinWithSalt
  );

  return `${hash}:${saltHex}`;
};

const verifyPIN = async (pin: string, hashedPIN: string): Promise<boolean> => {
  try {
    if (!hashedPIN) {
      console.log('❌ No hashed PIN provided for verification');
      return false;
    }

    const [storedHash, storedSalt] = hashedPIN.split(':');
    
    if (!storedHash || !storedSalt) {
      console.log('❌ Invalid hashed PIN format - missing hash or salt');
      return false;
    }

    const saltBytes = [];
    for (let i = 0; i < storedSalt.length; i += 2) {
      const byte = parseInt(storedSalt.substr(i, 2), 16);
      saltBytes.push(byte);
    }

    let pinWithSalt = pin;
    for (let i = 0; i < saltBytes.length; i++) {
      pinWithSalt += String.fromCharCode(saltBytes[i]);
    }

    const computedHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      pinWithSalt
    );

    return computedHash === storedHash;
  } catch (error) {
    console.error('💥 Error in verifyPIN:', error);
    return false;
  }
};

export const hashToken = async (token: string): Promise<string> => {
  return await hashPIN(token);
};

// Migration function to handle version updates with account validation
const migrateAuthStore = (persistedState: any, version: number): AuthState => {
  console.log(`🔄 Migrating auth store from version ${version} to 9`);
  
  const migratedState: any = {
    currentUser: persistedState?.currentUser || null,
    currentAccount: persistedState?.currentAccount || null,
    savedAccounts: (persistedState?.savedAccounts || []).filter(acc => 
      acc && typeof acc === 'object' && acc.identifier && typeof acc.identifier === 'string'
    ),  // Strict filter
    isAuthenticated: persistedState?.isAuthenticated || false,
    isLoading: false,
    isInitialized: true,  // Assume initialized post-migrate
  };

  // If currentAccount invalid, null it
  if (migratedState.currentAccount && !migratedState.currentAccount.identifier) {
    migratedState.currentAccount = null;
  }

  console.log(`✅ Migration complete: ${migratedState.savedAccounts.length} valid accounts`);
  return migratedState;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentUser: null,
      currentAccount: null,
      savedAccounts: [],
      isAuthenticated: false,
      isLoading: true,
      isInitialized: false,
      
      // ──────── ACTIONS ────────
      initializeAuth: async () => {
        try {
          console.log('🔐 Initializing auth state...');
          set({ isLoading: true });
          
          // Check Supabase for active session (for reference only)
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user) {
            console.log('✅ Found active session for user:', session.user.id);
            
            // Try to find this user in our saved accounts (Zustand is source of truth)
            const existingAccount = get().savedAccounts.find(
              acc => acc.id === session.user.id
            );
            
            if (existingAccount) {
              console.log('🔄 Found matching account in Zustand store');
              set({
                currentUser: existingAccount,
                currentAccount: existingAccount,
                isAuthenticated: true,
                isLoading: false,
                isInitialized: true,
              });
            } else {
              console.log('⚠️ Session exists but no matching account in Zustand');
              set({
                currentUser: null,
                currentAccount: null,
                isAuthenticated: false,
                isLoading: false,
                isInitialized: true,
              });
            }
          } else {
            // No active session - rely on saved accounts
            console.log('👤 No active session, checking saved accounts');
            
            const state = get();
            
            // Validate and filter saved accounts
            const validAccounts = state.savedAccounts.filter(acc => 
              acc && 
              acc.identifier && 
              typeof acc.identifier === 'string' &&
              acc.identifier.trim().length > 0 &&
              acc.security_token_hash &&
              typeof acc.security_token_hash === 'string'
            );
            
            // If we filtered out invalid accounts, update the state
            if (validAccounts.length !== state.savedAccounts.length) {
              console.warn(`⚠️ Filtered ${state.savedAccounts.length - validAccounts.length} invalid accounts from storage`);
              set({ savedAccounts: validAccounts });
            }
            
            console.log('📊 Current Zustand state:', {
              savedAccounts: validAccounts.length,
              currentAccount: state.currentAccount?.identifier
            });
            
            if (validAccounts.length > 0) {
              console.log('📱 Found valid saved accounts:', validAccounts.length);
              
              // Auto-select first valid account
              const validAccount = validAccounts.find(acc => acc.security_token_hash);
              if (validAccount) {
                console.log('🔄 Auto-selecting valid saved account:', validAccount.identifier);
                set({
                  currentAccount: validAccount,
                  currentUser: validAccount,
                  isAuthenticated: false, // Need token verification
                  isLoading: false,
                  isInitialized: true,
                });
              } else {
                console.log('❌ No valid saved accounts with token hashes');
                set({ 
                  currentAccount: null,
                  currentUser: null,
                  isAuthenticated: false,
                  isLoading: false,
                  isInitialized: true 
                });
              }
            } else {
              console.log('📭 No valid saved accounts found');
              set({ 
                currentAccount: null,
                currentUser: null,
                isAuthenticated: false,
                isLoading: false,
                isInitialized: true 
              });
            }
          }
        } catch (error) {
          console.log('💥 Auth initialization error:', error);
          set({ 
            currentAccount: null,
            currentUser: null,
            isAuthenticated: false,
            isLoading: false,
            isInitialized: true 
          });
        }
      },

      // ZUSTAND IS THE SOURCE OF TRUTH - No Supabase verification
      login: async (userData: UserProfile, identifier: string, securityTokenHash: string, transferTokenHash: string, skipSupabaseCheck: boolean = false) => {
        console.log('🎯 Login success, setting up account in Zustand...', identifier);
        
        try {
          // Validate inputs
          if (!identifier || !securityTokenHash || !transferTokenHash) {
            throw new Error('Missing required login data: identifier, securityTokenHash, or transferTokenHash');
          }

          // Create account from userData (Zustand is source of truth)
          const account: SavedAccount = {
            ...userData,
            identifier,
            user_id: userData.id, // Same as id - Zustand is source
            last_login: new Date().toISOString(),
            security_token_hash: securityTokenHash,
            transfer_token_hash: transferTokenHash,
          };
          
          console.log('💾 Saving account to Zustand:', {
            identifier: account.identifier,
            id: account.id,
            hasSecurityToken: !!securityTokenHash
          });
          
          // 1. IMMEDIATELY save to Zustand (user is logged in NOW)
          get().addAccount(account);
          
          // 2. Background sync to Supabase profiles (fire-and-forget)
          if (!skipSupabaseCheck) {
            get().syncProfileToSupabase(userData).catch(error => {
              console.log('⚠️ Background sync to Supabase failed (non-critical):', error);
            });
          }
          
          console.log('✅ Login completed successfully - Zustand is source of truth');
        } catch (error) {
          console.error('💥 Error during login:', error);
          throw error;
        }
      },

      // Sync Zustand data to Supabase (background operation)
      syncProfileToSupabase: async (profile: UserProfile) => {
        try {
          console.log('🔄 Syncing profile to Supabase:', profile.id);
          
          const { error } = await supabase
            .from('profiles')
            .upsert({
              id: profile.id,
              email: profile.email,
              phone: profile.phone,
              full_name: profile.full_name,
              avatar_url: profile.avatar_url,
              is_verified: profile.is_verified,
              country_code: profile.country_code,
              dial_code: profile.dial_code,
              flag_emoji: profile.flag_emoji,
              currency_symbol: profile.currency_symbol,
              username: profile.username,
              bpay_tag: profile.bpay_tag,
              bonus_percent: profile.bonus_percent,
              balance: profile.balance,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'id'
            });

          if (error) {
            console.log('⚠️ Supabase sync failed (non-critical):', error);
          } else {
            console.log('✅ Profile synced to Supabase successfully');
          }
        } catch (error) {
          console.error('💥 Error syncing to Supabase:', error);
        }
      },

      // Update profile in Zustand and sync to Supabase
      updateProfile: async (updates: Partial<UserProfile>) => {
        try {
          const state = get();
          if (!state.currentUser) {
            throw new Error('No user logged in');
          }

          // Update in Zustand first
          const updatedUser = { ...state.currentUser, ...updates };
          const updatedAccount = state.currentAccount ? 
            { ...state.currentAccount, ...updates } : null;

          set({
            currentUser: updatedUser,
            currentAccount: updatedAccount,
            savedAccounts: state.savedAccounts.map(acc =>
              acc.id === updatedUser.id ? { ...acc, ...updates } : acc
            ),
          });

          // Sync to Supabase in background
          get().syncProfileToSupabase(updatedUser).catch(error => {
            console.log('⚠️ Background profile update sync failed:', error);
          });

          console.log('✅ Profile updated in Zustand');
        } catch (error) {
          console.error('💥 Error updating profile:', error);
          throw error;
        }
      },

      verifySecurityTokenLocally: async (securityToken: string): Promise<boolean> => {
        const state = get();
        if (!state.currentAccount?.security_token_hash) {
          console.log('❌ No security token hash found for current account');
          return false;
        }

        console.log('🔐 Starting security token verification for:', state.currentAccount.identifier);

        try {
          const isTokenValid = await verifyPIN(securityToken, state.currentAccount.security_token_hash);
          console.log('🔐 Security token verification result:', isTokenValid ? 'SUCCESS' : 'FAILED');
          
          if (isTokenValid) {
            // Update last login
            const updatedAccount = {
              ...state.currentAccount,
              last_login: new Date().toISOString()
            };
            
            set((state) => ({
              savedAccounts: state.savedAccounts.map(acc =>
                acc.identifier === updatedAccount.identifier ? updatedAccount : acc
              ),
              currentAccount: updatedAccount,
              isAuthenticated: true,
            }));

            console.log('✅ Security token verified, user is now authenticated');
          }
          
          return isTokenValid;
        } catch (error) {
          console.error('💥 Error verifying security token:', error);
          return false;
        }
      },

      verifyTransferToken: async (transferToken: string): Promise<boolean> => {
        const state = get();
        if (!state.currentAccount?.transfer_token_hash) {
          console.log('❌ No transfer token hash found for current account');
          return false;
        }

        try {
          const isTokenValid = await verifyPIN(transferToken, state.currentAccount.transfer_token_hash);
          console.log('🔐 Transfer token verification:', isTokenValid ? 'SUCCESS' : 'FAILED');
          return isTokenValid;
        } catch (error) {
          console.error('💥 Error verifying transfer token:', error);
          return false;
        }
      },

      setSession: (user, account) => {
        console.log('🎯 Setting session:', account?.identifier);
        set({
          currentUser: user,
          currentAccount: account,
          isAuthenticated: !!user && !!account,
          isLoading: false,
        });
      },

      setCurrentAccount: (account) => {
        console.log('🎯 Setting current account:', account?.identifier);
        if (account) {
          set({
            currentAccount: account,
            currentUser: account, // Same data
            isAuthenticated: false,
          });
        } else {
          set({
            currentAccount: null,
            currentUser: null,
            isAuthenticated: false,
          });
        }
      },

      addAccount: (account) => {
        console.log('➕ Adding account to Zustand:', account.identifier);
        set((state) => {
          // Validate account before adding
          if (!account.identifier || !account.security_token_hash) {
            console.error('❌ Cannot add invalid account - missing identifier or security token hash');
            return state;
          }

          // Prevent duplicates
          const exists = state.savedAccounts.some(a => a.identifier === account.identifier);
          if (exists) {
            console.log('🔄 Account already exists, updating...');
            // Update existing account
            const updatedAccounts = state.savedAccounts.map(a =>
              a.identifier === account.identifier 
                ? { ...account, last_login: new Date().toISOString() }
                : a
            );
            return {
              savedAccounts: updatedAccounts,
              currentAccount: account,
              currentUser: account,
              isAuthenticated: true,
            };
          }
          
          console.log('🆕 Adding new account to Zustand storage');
          // Add new account (respecting max limit)
          let updatedAccounts = [account, ...state.savedAccounts];
          if (updatedAccounts.length > MAX_ACCOUNTS) {
            updatedAccounts = updatedAccounts.slice(0, MAX_ACCOUNTS);
          }
          
          console.log('💾 Final saved accounts count:', updatedAccounts.length);
          
          return {
            savedAccounts: updatedAccounts,
            currentAccount: account,
            currentUser: account,
            isAuthenticated: true,
          };
        });
      },

      switchAccount: (account) => {
        console.log('🔄 Switching to account:', account.identifier);
        
        if (!account.security_token_hash) {
          console.log('❌ Cannot switch to account without security token hash');
          return;
        }
        
        const updatedAccount = { ...account, last_login: new Date().toISOString() };
        set({
          savedAccounts: get().savedAccounts.map(a =>
            a.identifier === account.identifier ? updatedAccount : a
          ),
          currentAccount: updatedAccount,
          currentUser: updatedAccount,
          isAuthenticated: false,
        });
      },

      removeAccount: (identifier) => {
        console.log('🗑️ Removing account:', identifier);
        set((state) => {
          const filtered = state.savedAccounts.filter(a => a.identifier !== identifier);
          const wasCurrent = state.currentAccount?.identifier === identifier;
          
          if (wasCurrent && filtered.length > 0) {
            const next = filtered.find(acc => acc.security_token_hash) || filtered[0];
            console.log('🔄 Switching to next account:', next.identifier);
            return {
              savedAccounts: filtered,
              currentAccount: next,
              currentUser: next,
              isAuthenticated: false,
            };
          }
          
          if (wasCurrent && filtered.length === 0) {
            console.log('🚫 No accounts left, clearing state');
            return {
              savedAccounts: filtered,
              currentAccount: null,
              currentUser: null,
              isAuthenticated: false,
            };
          }
          
          return { 
            savedAccounts: filtered,
            isAuthenticated: state.isAuthenticated && !wasCurrent
          };
        });
      },

      logout: async () => {
        console.log('🚪 Logging out - keeping current account reference');
        
        const state = get();
        const currentIdentifier = state.currentAccount?.identifier;
        
        try {
          // Sign out from Supabase
          const { error } = await supabase.auth.signOut();
          if (error) {
            console.error('Error signing out of Supabase:', error.message);
          } else {
            console.log('✅ Successfully signed out of Supabase');
          }
        } catch (err) {
          console.error('Unexpected error during Supabase sign-out:', err);
        }

        // ✅ FIXED: Keep currentAccount reference but clear authentication
        set({
          isAuthenticated: false,
          isLoading: false,
          // currentAccount and currentUser remain the same
        });
        
        console.log(`✅ Logout completed - current account reference maintained: ${currentIdentifier}`);
      },

      clearAllAccounts: () => {
        console.log('🗑️ Clearing all accounts from Zustand');
        set({
          currentUser: null,
          currentAccount: null,
          savedAccounts: [],
          isAuthenticated: false,
        });
      },

      autoSelectAccount: () => {
        console.log('🔄 Executing autoSelectAccount');
        const state = get();
        
        if (state.currentAccount) {
          console.log('✅ Current account already set:', state.currentAccount.identifier);
          return;
        }
        
        const validAccount = state.savedAccounts.find(acc => acc.security_token_hash);
        if (validAccount) {
          console.log('🔄 Auto-selecting valid account:', validAccount.identifier);
          set({
            currentAccount: validAccount,
            currentUser: validAccount,
            isAuthenticated: false,
          });
        } else {
          console.log('⚠️ Cannot auto-select: no valid saved accounts');
        }
      },
    }),
    {
      name: 'bpay-accounts-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        savedAccounts: state.savedAccounts,
        currentAccount: state.currentAccount,
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
      }),
      version: 9, // Incremented version for validation changes
      migrate: migrateAuthStore,
      onRehydrateStorage: () => {
        console.log('🔄 Zustand storage rehydration started');
        return (state, error) => {
          if (error) {
            console.log('❌ Error during rehydration:', error);
          } else {
            console.log('✅ Zustand storage rehydration completed');
            if (state) {
              console.log('📊 Rehydrated Zustand state:', {
                currentAccount: state.currentAccount?.identifier || 'null',
                savedAccounts: state.savedAccounts?.length || 0,
                isAuthenticated: state.isAuthenticated
              });
            }
          }
        };
      },
    }
  )
);

// ──────── CLEAN & SAFE HOOK ────────
export const useAuth = () => {
  const store = useAuthStore();
  
  // Safe masked identifier function
  const getMaskedIdentifier = () => {
    if (!store.currentAccount?.identifier) return 'No Account';
    const id = store.currentAccount.identifier;
    
    // Safe check for includes
    if (id && id.includes && id.includes('@')) {
      const [local, domain] = id.split('@');
      return `${local[0]}***@${domain}`;
    }
    
    // Safe phone number masking
    if (id && typeof id === 'string') {
      const digits = id.replace(/\D/g, '');
      if (digits.length < 6) return id;
      return `${id.slice(0, 4)}*****${id.slice(-3)}`;
    }
    
    return 'Unknown Account';
  };

  const getTransferToken = (securityToken: string): string => {
    return securityToken.slice(0, 4);
  };

  console.log('🔍 Auth Hook State:', {
    isAuthenticated: store.isAuthenticated,
    currentAccount: store.currentAccount?.identifier || 'null',
    savedAccounts: store.savedAccounts.length,
    isLoading: store.isLoading,
    isInitialized: store.isInitialized
  });

  return {
    // State
    user: store.currentUser,
    currentAccount: store.currentAccount,
    savedAccounts: store.savedAccounts,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    isInitialized: store.isInitialized,
    // Actions
    initializeAuth: store.initializeAuth,
    login: store.login,
    logout: store.logout,
    switchAccount: store.switchAccount,
    removeAccount: store.removeAccount,
    clearAllAccounts: store.clearAllAccounts,
    autoSelectAccount: store.autoSelectAccount,
    setCurrentAccount: store.setCurrentAccount,
    verifySecurityTokenLocally: store.verifySecurityTokenLocally,
    verifyTransferToken: store.verifyTransferToken,
    syncProfileToSupabase: store.syncProfileToSupabase,
    updateProfile: store.updateProfile,
    // Helpers
    getMaskedIdentifier,
    getTransferToken,
    hashToken,
  };
};