// app/(app)/(Auth)/login.tsx
import "react-native-gesture-handler";
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Modal,
  Pressable,
  Image,
  FlatList,
  Dimensions,
  Animated,
  ActivityIndicator,
  Alert,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import NetInfo from '@react-native-community/netinfo';
import * as Crypto from 'expo-crypto';
import Checkbox from 'expo-checkbox';
import { useAuth } from "@/stores/auth-store";

const { width, height } = Dimensions.get("window");

// ──────── SUPABASE SETUP ────────
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ──────── CONSTANTS ────────
const BIOMETRIC_ENABLED_KEY = "biometricEnabled";
const DONT_SHOW_TRANSFER_PIN_KEY = "dontShowTransferPin";

// ──────── COUNTRY DATA TYPE ────────
type Country = {
  code: string;
  flag: string;
  label: string;
  dial: string;
  currency_symbol?: string;
};

// ──────── SECURITY FUNCTIONS - EXPO COMPATIBLE ────────
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
    if (!hashedPIN || !hashedPIN.includes(':')) {
      console.log('❌ Invalid hashed PIN format');
      return false;
    }
    const [storedHash, saltHex] = hashedPIN.split(':');
    let pinWithSalt = pin;
    for (let i = 0; i < saltHex.length; i += 2) {
      const byte = parseInt(saltHex.substr(i, 2), 16);
      pinWithSalt += String.fromCharCode(byte);
    }
    const computedHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      pinWithSalt
    );
    const isValid = computedHash.toLowerCase() === storedHash.toLowerCase();
    return isValid;
  } catch (error) {
    console.error('💥 Error in verifyPIN:', error);
    return false;
  }
};

export const hashToken = async (token: string): Promise<string> => {
  return await hashPIN(token);
};

// ──────── AUTH FUNCTIONS ────────
// In createUserWithPIN (and verifyUserPIN if similar)
const createUserWithPIN = async (
  identifier: string | undefined,  // Make optional
  securityToken: string,
  countryCode?: string,
  dialCode?: string,
  flagEmoji?: string,
  currencySymbol?: string
) => {
  if (!identifier) {
    throw new Error('Invalid identifier provided');  // Early bail
  }
  try {
    console.log('👤 Creating/updating user with identifier:', identifier);
    const hashedSecurityToken = await hashPIN(securityToken);
    const transferToken = securityToken.slice(0, 4);
    const hashedTransferToken = await hashPIN(transferToken);
   const isEmail = identifier.includes('@');  // Now safe
    const lookupValue = isEmail ? identifier : `${dialCode}${identifier.replace(/\D/g, '')}`;

    // 1. Check for existing profile first
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, account_pin_hash')
      .or(`email.eq.${identifier},phone.eq.${lookupValue}`)
      .maybeSingle();

    if (existingProfile) {
      console.log('🔄 Existing profile found → updating PINs');
      await supabase
        .from('profiles')
        .update({
          account_pin_hash: hashedSecurityToken,
          transfer_pin_hash: hashedTransferToken,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingProfile.id);

      const { data: fullUser } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', existingProfile.id)
        .single();

      return { success: true, user: fullUser, transferToken };
    }

    // 2. Prepare auth credentials
    const authEmail = isEmail 
      ? identifier 
      : `${identifier.replace(/\D/g, '')}@temp.bpay.com`;
    const tempPassword = securityToken.padEnd(8, '0');
    let authUserId: string;

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: authEmail,
      password: tempPassword,
    });

    if (signUpData?.user) {
      authUserId = signUpData.user.id;
      console.log('✅ Auth user obtained (new or existing):', authUserId);
    }
    else if (!signUpData?.user && !signUpError) {
      console.log('⚠️ signUp returned no user → falling back to signInWithPassword');
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: tempPassword,
      });
      if (signInError || !signInData?.user) {
        throw new Error('Unable to reuse existing auth user');
      }
      authUserId = signInData.user.id;
      console.log('✅ Reused existing auth user via signIn:', authUserId);
    }
    else {
      throw signUpError || new Error('Signup failed without user');
    }

    // 3. UPSERT profile (safe from duplicate key)
    const profileData: any = {
      id: authUserId,
      account_pin_hash: hashedSecurityToken,
      transfer_pin_hash: hashedTransferToken,
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    if (isEmail) {
      profileData.email = identifier;
    } else {
      profileData.phone = lookupValue;
      profileData.email = null;
    }
    profileData.country_code = countryCode || null;
    profileData.dial_code = dialCode || null;
    profileData.flag_emoji = flagEmoji || null;
    profileData.currency_symbol = currencySymbol || null;

    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert(profileData, { onConflict: 'id' });

    if (upsertError) {
      console.error('❌ Upsert failed:', upsertError);
      if (signUpData?.session === null) {
        await supabase.auth.admin.deleteUser(authUserId).catch(() => {});
      }
      throw upsertError;
    }

    console.log('✅ Profile created/updated via upsert');
    const { data: finalUser } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUserId)
      .single();

    return {
      success: true,
      user: finalUser || {
        id: authUserId,
        email: isEmail ? identifier : null,
        phone: !isEmail ? lookupValue : null,
        full_name: null,
        avatar_url: null,
        is_verified: false,
        country_code: countryCode,
        dial_code: dialCode,
        flag_emoji: flagEmoji,
        currency_symbol: currencySymbol,
      },
      transferToken,
    };

  } catch (error: any) {
    console.error('💥 Error in createUserWithPIN:', error);
    return {
      success: false,
      error: error.message || 'Account creation failed',
    };
  }
};

const verifyUserPIN = async (identifier: string, pin: string) => {
  try {
    const { data: user, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`email.eq.${identifier},phone.eq.${identifier}`)
      .single();

    if (error) {
      throw new Error("User not found");
    }

    if (!user.account_pin_hash) {
      return {
        success: false,
        error: "No security token set for this account"
      };
    }

    const isPINValid = await verifyPIN(pin, user.account_pin_hash);
    if (!isPINValid) {
      return {
        success: false,
        error: "Invalid security token"
      };
    }

    await supabase
      .from('profiles')
      .update({
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        is_verified: user.is_verified,
        country_code: user.country_code,
        dial_code: user.dial_code,
        flag_emoji: user.flag_emoji,
        currency_symbol: user.currency_symbol,
      }
    };

  } catch (error) {
    console.error('Error verifying user PIN:', error);
    return {
      success: false,
      error: "Verification failed. Please try again."
    };
  }
};

// Validation
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPhone = (phone: string) => phone.replace(/\D/g, '').length >= 7;

// Phone formatting
const formatPhoneNumber = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
};

// Mask identifier
// Safe maskIdentifier function
const maskIdentifier = (id: string | undefined | null): string => {
  if (!id) return 'Unknown Account';
  if (id.includes('@')) {
    const [local, domain] = id.split('@');
    return `${local[0]}***@${domain}`;
  } else {
    const digits = id.replace(/\D/g, '');
    if (digits.length < 6) return id;
    return `${id.slice(0, 4)}*****${id.slice(-3)}`;
  }
};

// ──────── SUCCESS MODAL ────────
const SuccessModal = ({ visible, onClose, transferPin, onDontShowAgain }: {
  visible: boolean;
  onClose: () => void;
  transferPin: string;
  onDontShowAgain: (value: boolean) => void;
}) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const handleDontShowAgainChange = (value: boolean) => {
    setDontShowAgain(value);
    onDontShowAgain(value);
  };

  return (
    <Modal transparent visible={visible} animationType="fade" statusBarTranslucent>
      <View style={successStyles.overlay}>
        <View style={successStyles.container}>
          <View style={successStyles.header}>
            <View style={successStyles.iconContainer}>
              <FontAwesome name="check-circle" size={60} color="#FFD700" />
              <View style={successStyles.confetti}>
                <Text style={successStyles.confettiText}>🎉</Text>
                <Text style={successStyles.confettiText}>✨</Text>
              </View>
            </View>
          </View>
          <Text style={successStyles.title}>Welcome to B-PAY! 🚀</Text>
          <Text style={successStyles.subtitle}>Your account has been created successfully</Text>
          <View style={successStyles.pinContainer}>
            <View style={successStyles.pinHeader}>
              <FontAwesome name="shield" size={20} color="#FFD700" />
              <Text style={successStyles.pinTitle}>Security Setup Complete</Text>
            </View>
            <View style={successStyles.pinInfo}>
              <View style={successStyles.infoRow}>
                <FontAwesome name="lock" size={16} color="#FFD700" />
                <Text style={successStyles.infoText}>
                  <Text style={successStyles.bold}>6-digit Security Token:</Text> Set and secured
                </Text>
              </View>
              <View style={successStyles.infoRow}>
                <FontAwesome name="key" size={16} color="#FFD700" />
                <Text style={successStyles.infoText}>
                  <Text style={successStyles.bold}>Transfer Token:</Text> {transferPin}
                </Text>
              </View>
            </View>
            <View style={successStyles.noteBox}>
              <FontAwesome name="info-circle" size={16} color="#FFD700" />
              <Text style={successStyles.noteText}>
                Your transfer token is automatically set to the first 4 digits of your security token. You can change it in Settings.
              </Text>
            </View>
          </View>
          <View style={successStyles.features}>
            <View style={successStyles.featureItem}>
              <FontAwesome name="bolt" size={16} color="#FFD700" />
              <Text style={successStyles.featureText}>Fast & Secure Transactions</Text>
            </View>
            <View style={successStyles.featureItem}>
              <FontAwesome name="globe" size={16} color="#FFD700" />
              <Text style={successStyles.featureText}>Global Payments</Text>
            </View>
            <View style={successStyles.featureItem}>
              <FontAwesome name="shield" size={16} color="#FFD700" />
              <Text style={successStyles.featureText}>Bank-Level Security</Text>
            </View>
          </View>
          <View style={successStyles.checkboxContainer}>
            <Checkbox
              value={dontShowAgain}
              onValueChange={handleDontShowAgainChange}
              color={dontShowAgain ? '#FFD700' : undefined}
              style={successStyles.checkbox}
            />
            <Text style={successStyles.checkboxLabel}>
              Don't show this message again
            </Text>
          </View>
          <View style={successStyles.buttonContainer}>
            <TouchableOpacity style={successStyles.skipButton} onPress={onClose}>
              <FontAwesome name="rocket" size={16} color="#FFD700" />
              <Text style={successStyles.skipButtonText}>Skip to Dashboard</Text>
            </TouchableOpacity>
            <TouchableOpacity style={successStyles.continueButton} onPress={onClose}>
              <Text style={successStyles.continueButtonText}>Explore B-PAY</Text>
              <FontAwesome name="arrow-right" size={16} color="#000" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const successStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 16,
  },
  confetti: {
    position: 'absolute',
    flexDirection: 'row',
    top: -10,
    width: '120%',
    justifyContent: 'space-between',
  },
  confettiText: {
    fontSize: 24,
  },
  title: {
    color: '#FFD700',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.9,
  },
  pinContainer: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  pinHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pinTitle: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  pinInfo: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  bold: {
    fontWeight: 'bold',
    color: '#FFD700',
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FFD700',
  },
  noteText: {
    color: '#FFD700',
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
    fontStyle: 'italic',
  },
  features: {
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  featureText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 12,
    opacity: 0.9,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  checkbox: {
    marginRight: 12,
    borderColor: '#FFD700',
  },
  checkboxLabel: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  skipButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFD700',
    backgroundColor: 'transparent',
    gap: 8,
  },
  skipButtonText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '600',
  },
  continueButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#FFD700',
    gap: 8,
  },
  continueButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

// ──────── ACCOUNT SWITCH DROPDOWN COMPONENT ────────
// ──────── ACCOUNT SWITCH DROPDOWN COMPONENT ────────
const AccountSwitchDropdown = ({ 
  visible, 
  onClose, 
  accounts,
  currentAccount,
  onSwitchAccount,
  onAddAccount,
  onRemoveAccount
}: {
  visible: boolean;
  onClose: () => void;
  accounts: any[];
  currentAccount: any;
  onSwitchAccount: (account: any) => void;
  onAddAccount: () => void;
  onRemoveAccount: (identifier: string) => void;
}) => {
  const slideAnim = useRef(new Animated.Value(-10)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -10,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // Safe maskIdentifier function
  const maskIdentifier = (id: string | undefined) => {
    if (!id) return 'Unknown Account';
    if (id.includes('@')) {
      const [local, domain] = id.split('@');
      return `${local[0]}***@${domain}`;
    } else {
      const digits = id.replace(/\D/g, '');
      if (digits.length < 6) return id;
      return `${id.slice(0, 4)}*****${id.slice(-3)}`;
    }
  };

  // Safe account type detection
// Safe account type detection
const getAccountIcon = (account: any) => {
  if (!account?.identifier) return "user";
  return account.identifier.includes('@') ? "envelope" : "phone";
};

// Safe current account check
const isCurrentAccount = (account: any) => {
  if (!account?.identifier || !currentAccount?.identifier) return false;
  return account.identifier === currentAccount.identifier;
};

  if (!visible) return null;

  return (
    <>
      <Pressable style={dropdownStyles.backdrop} onPress={onClose} />
      <Animated.View
        style={[
          dropdownStyles.container,
          {
            transform: [{ translateY: slideAnim }],
            opacity: fadeAnim
          }
        ]}
      >
        <View style={dropdownStyles.arrow} />
        <View style={dropdownStyles.header}>
          <Text style={dropdownStyles.title}>Switch Account</Text>
          <Text style={dropdownStyles.subtitle}>
            {accounts?.length || 0} account{(accounts?.length || 0) !== 1 ? 's' : ''} available
          </Text>
        </View>
        
        <FlatList
          data={accounts || []}
          keyExtractor={(item, index) => item?.identifier || `account-${index}`}
          style={dropdownStyles.list}
          renderItem={({ item }) => (
            <View style={[
              dropdownStyles.accountItem,
              isCurrentAccount(item) && dropdownStyles.accountItemActive
            ]}>
              <TouchableOpacity
                style={dropdownStyles.accountContent}
                onPress={() => onSwitchAccount(item)}
              >
                <View style={dropdownStyles.accountIcon}>
                  <FontAwesome 
                    name={getAccountIcon(item)} 
                    size={16} 
                    color="#FFD700" 
                  />
                </View>
                <View style={dropdownStyles.accountInfo}>
                  <Text style={dropdownStyles.accountIdentifier}>
                    {maskIdentifier(item?.identifier)}
                  </Text>
                  {isCurrentAccount(item) && (
                    <Text style={dropdownStyles.currentLabel}>Current</Text>
                  )}
                </View>
                {(accounts?.length || 0) > 1 && !isCurrentAccount(item) && (
                  <TouchableOpacity
                    style={dropdownStyles.removeButton}
                    onPress={() => onRemoveAccount(item?.identifier || '')}
                  >
                    <FontAwesome name="times" size={14} color="#FF6B6B" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            </View>
          )}
        />
        
        {(accounts?.length || 0) < 3 && (
          <TouchableOpacity
            style={dropdownStyles.addButton}
            onPress={onAddAccount}
          >
            <View style={dropdownStyles.addButtonContent}>
              <FontAwesome name="plus" size={16} color="#FFD700" />
              <Text style={dropdownStyles.addButtonText}>Add Account</Text>
            </View>
          </TouchableOpacity>
        )}
      </Animated.View>
    </>
  );
};

const dropdownStyles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 100,
  },
  container: {
    position: 'absolute',
    top: 100,
    right: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    width: width * 0.85,
    maxWidth: 320,
    maxHeight: height * 0.6,
    borderWidth: 1,
    borderColor: '#FFD700',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 9999,
  },
  arrow: {
    position: 'absolute',
    top: -8,
    right: 20,
    width: 16,
    height: 16,
    backgroundColor: '#1a1a1a',
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderColor: '#FFD700',
    transform: [{ rotate: '45deg' }],
  },
  header: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  subtitle: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.7,
  },
  list: {
    marginBottom: 12,
    maxHeight: 200,
  },
  accountItem: {
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  accountItemActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  accountContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  accountIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  accountInfo: {
    flex: 1,
  },
  accountIdentifier: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  currentLabel: {
    color: '#00FF7F',
    fontSize: 11,
    fontWeight: '500',
  },
  removeButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  addButton: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFD700',
    borderStyle: 'dashed',
    padding: 12,
    alignItems: 'center',
  },
  addButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addButtonText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
  },
});

// ──────── MAIN COMPONENT ────────
export default function LoginScreen() {
  const router = useRouter();
  const auth = useAuth();
  const [mode, setMode] = useState<'country' | 'email' | 'phone'>('country');
  const [identifier, setIdentifier] = useState('');
  const [displayPhone, setDisplayPhone] = useState('');
  const [country, setCountry] = useState<Country | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [pinModal, setPinModal] = useState(false);
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [confirmPin, setConfirmPin] = useState(['', '', '', '', '', '']);
  const [pinStep, setPinStep] = useState<'create' | 'confirm' | 'login'>('create');
  const [currentIdentifier, setCurrentIdentifier] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [biometricModal, setBiometricModal] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [networkStatus, setNetworkStatus] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [transferPin, setTransferPin] = useState('');
  const [dontShowTransferPin, setDontShowTransferPin] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [loadingCountries, setLoadingCountries] = useState(true);

  // Animation refs
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Refs
  const emailInputRef = useRef<TextInput>(null);
  const phoneInputRef = useRef<TextInput>(null);
  const pinRefs = useRef<Array<TextInput | null>>([]);
  const confirmPinRefs = useRef<Array<TextInput | null>>([]);
  const loginPinRefs = useRef<Array<TextInput | null>>([]);

  // ──────── PULSE ANIMATION ────────
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => {
      pulse.stop();
    };
  }, [pulseAnim]);

  // ──────── NETWORK CONNECTION MONITOR ────────
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      if (!state.isConnected) {
        setNetworkStatus('❌ No internet connection');
      } else {
        setNetworkStatus('');
      }
    });
    return () => unsubscribe();
  }, []);

  // ──────── FETCH COUNTRIES FROM SUPABASE ────────
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const { data, error } = await supabase
          .from('countries')
          .select('name, iso_code, flag_emoji, dial_code, currency_symbol')
          .order('name', { ascending: true });

        if (error) {
          throw error;
        }

        if (data && data.length > 0) {
          const mappedCountries: Country[] = data.map((item: any) => ({
            code: item.iso_code,
            flag: item.flag_emoji,
            label: item.name,
            dial: item.dial_code,
            currency_symbol: item.currency_symbol,
          }));
          setCountries(mappedCountries);
          const nigeria = mappedCountries.find(c => c.code === 'NG');
          if (nigeria) {
            setCountry(nigeria);
          } else if (mappedCountries.length > 0) {
            setCountry(mappedCountries[0]);
          }
        }
      } catch (error) {
        console.log('Error loading countries – using fallbacks');
        const fallbackCountries: Country[] = [
          { code: 'NG', flag: '🇳🇬', label: 'Nigeria', dial: '+234', currency_symbol: '₦' },
          { code: 'US', flag: '🇺🇸', label: 'United States', dial: '+1', currency_symbol: '$' },
          { code: 'GB', flag: '🇬🇧', label: 'United Kingdom', dial: '+44', currency_symbol: '£' },
        ];
        setCountries(fallbackCountries);
        setCountry(fallbackCountries[0]);
      } finally {
        setLoadingCountries(false);
      }
    };

    fetchCountries();

    (async () => {
      try {
        const bio = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
        setBiometricEnabled(bio === 'true');
        const dontShow = await AsyncStorage.getItem(DONT_SHOW_TRANSFER_PIN_KEY);
        setDontShowTransferPin(dontShow === 'true');
      } catch (error) {
        console.log('Error loading settings');
      }
    })();
  }, []);

const handleSwitchAccount = (account: any) => {
  if (!account?.identifier) {
    showToast("Invalid account data", "error");
    return;
  }
  
  // Switch account in auth store
  auth.switchAccount(account);
  setShowAccountDropdown(false);
  showToast(`Switched to ${maskIdentifier(account.identifier)}`, "success");
  
  // Navigate to welcome-back screen after a brief delay
  setTimeout(() => {
    router.replace("/(app)/(Auth)/welcome-back");
  }, 300);
};

const handleSwitchAccountButton = () => {
  console.log('🔍 Switch Account Button Pressed:', {
    savedAccounts: auth.savedAccounts,
    currentAccount: auth.currentAccount,
    accountsCount: auth.savedAccounts?.length
  });
  
  if (auth.savedAccounts && auth.savedAccounts.length > 0) {
    // If there's only one account, auto-switch and navigate
    if (auth.savedAccounts.length === 1) {
      const singleAccount = auth.savedAccounts[0];
      handleSwitchAccount(singleAccount);
    } else {
      // Show dropdown for multiple accounts
      setShowAccountDropdown(true);
    }
  } else {
    showToast("No saved accounts available", "error");
  }
};



  const openPINSheet = async (isNewUser: boolean = true) => {
    setPinModal(true);
    setPinStep(isNewUser ? 'create' : 'login');
    setPin(['', '', '', '', '', '']);
    setConfirmPin(['', '', '', '', '', '']);
    setTimeout(() => {
      if (isNewUser) {
        pinRefs.current[0]?.focus();
      } else {
        loginPinRefs.current[0]?.focus();
      }
    }, 300);
  };

  const closeSheets = () => {
    setPinModal(false);
    setPin(['', '', '', '', '', '']);
    setConfirmPin(['', '', '', '', '', '']);
    setPinStep('create');
  };

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
  };

  useEffect(() => {
    if (toast) setTimeout(() => setToast(null), 3000);
  }, [toast]);

  // Auto-proceed to PIN confirmation when PIN is complete
  useEffect(() => {
    const pinString = pin.join('');
    if (pinString.length === 6 && pinStep === 'create' && pinModal) {
      setPinStep('confirm');
      setTimeout(() => confirmPinRefs.current[0]?.focus(), 300);
    }
  }, [pin]);

  // Auto-create account when confirmation PIN matches
  useEffect(() => {
    const confirmPinString = confirmPin.join('');
    const pinString = pin.join('');
    if (confirmPinString.length === 6 && pinStep === 'confirm' && pinModal) {
      if (confirmPinString === pinString) {
        handlePINConfirm();
      } else {
        showToast("Security tokens don't match. Please try again.", "error");
        setPin(['', '', '', '', '', '']);
        setConfirmPin(['', '', '', '', '', '']);
        setPinStep('create');
        setTimeout(() => pinRefs.current[0]?.focus(), 300);
      }
    }
  }, [confirmPin]);

  // Auto-submit login PIN when complete
  useEffect(() => {
    const pinString = pin.join('');
    if (pinString.length === 6 && pinStep === 'login' && pinModal) {
      handleLogin();
    }
  }, [pin]);

  // Auto-detect country from phone prefix
  useEffect(() => {
    if (mode === 'phone' && identifier && country) {
      const digits = identifier.replace(/\D/g, '');
      const withPlus = digits.startsWith('44') ? '+44' : digits.startsWith('1') ? '+1' : digits.startsWith('234') ? '+234' : null;
      if (withPlus) {
        const matched = countries.find(c => c.dial === withPlus);
        if (matched) setCountry(matched);
      }
    }
  }, [identifier, mode, countries]);

  // Check if identifier is valid and check if user exists
  useEffect(() => {
    const checkUserExists = async () => {
      if ((mode === 'email' && isValidEmail(identifier)) ||
          (mode === 'phone' && isValidPhone(identifier) && country)) {
        const fullId = mode === 'phone' ? `${country.dial}${identifier.replace(/\D/g, '')}` : identifier;
        setCurrentIdentifier(fullId);
        setLoading(true);
        try {
          const { data: user, error } = await supabase
            .from('profiles')
            .select('id, account_pin_hash')
            .or(`email.eq.${fullId},phone.eq.${fullId}`)
            .single();

          setLoading(false);

          if (error) {
            if (error.code === 'PGRST116') {
              openPINSheet(true);
            } else {
              console.error('Error checking user:', error);
              showToast("Error checking account. Please try again.", "error");
            }
          } else if (user && user.account_pin_hash) {
            openPINSheet(false);
          } else {
            openPINSheet(true);
          }
        } catch (error) {
          setLoading(false);
          console.error('Unexpected error:', error);
          showToast("Error checking account. Please try again.", "error");
        }
      }
    };

    const timeoutId = setTimeout(checkUserExists, 800);
    return () => clearTimeout(timeoutId);
  }, [identifier, mode, country]);

  const handleCountrySelect = (selectedCountry: Country) => {
    setCountry(selectedCountry);
    setMode('email');
    setShowCountryPicker(false);
    setCountrySearch('');
    setTimeout(() => emailInputRef.current?.focus(), 300);
  };

  const handleToggleMode = () => {
    if (mode === 'email') {
      setMode('phone');
      setIdentifier('');
      setDisplayPhone('');
      setTimeout(() => phoneInputRef.current?.focus(), 300);
    } else if (mode === 'phone') {
      setMode('email');
      setIdentifier('');
      setTimeout(() => emailInputRef.current?.focus(), 300);
    }
  };

  const handleBiometricSetup = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
    await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
    setBiometricEnabled(true);
    setBiometricModal(false);
    showToast("Biometric login enabled", "success");
  };

  const handleBiometricLogin = () => {
    if (!biometricEnabled) {
      setBiometricModal(true);
    } else {
      showToast("Biometric login successful! Redirecting...", "success");
      setTimeout(() => router.replace("/(app)/(protected)"), 100);
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    setTimeout(() => router.replace("/(app)/(protected)"), 100);
  };

  const handleDontShowAgain = async (value: boolean) => {
    setDontShowTransferPin(value);
    await AsyncStorage.setItem(DONT_SHOW_TRANSFER_PIN_KEY, value.toString());
  };

  const handlePINConfirm = async () => {
    const securityToken = pin.join('');
    const confirmSecurityToken = confirmPin.join('');

    if (securityToken !== confirmSecurityToken) {
      showToast("Security tokens don't match. Please try again.", "error");
      setPin(['', '', '', '', '', '']);
      setConfirmPin(['', '', '', '', '', '']);
      setPinStep('create');
      setTimeout(() => pinRefs.current[0]?.focus(), 300);
      return;
    }

    setIsProcessing(true);
    setLoading(true);

    const countryCode = country?.code;
    const dialCode = country?.dial;
    const flagEmoji = country?.flag;
    const currencySymbol = country?.currency_symbol;

    const { success, user, error, transferToken } = await createUserWithPIN(
      currentIdentifier,
      securityToken,
      countryCode,
      dialCode,
      flagEmoji,
      currencySymbol
    );

    setLoading(false);
    setIsProcessing(false);

    if (success && user) {
      try {
        const securityTokenHash = await hashPIN(securityToken);
        const transferTokenHash = await hashPIN(transferToken || securityToken.slice(0, 4));
        await auth.login(user, currentIdentifier, securityTokenHash, transferTokenHash, true);
        setTransferPin(transferToken || securityToken.slice(0, 4));
        closeSheets();
        setTimeout(() => {
          if (!dontShowTransferPin) {
            setShowSuccessModal(true);
          } else {
            setTimeout(() => router.replace("/(app)/(protected)"), 100);
          }
        }, 500);
      } catch (storageError) {
        console.error('Storage error:', storageError);
        showToast("Account creation failed - storage error", "error");
      }
    } else {
      showToast(error || "Account creation failed", "error");
    }
  };

  const handleLogin = async () => {
    const securityToken = pin.join('');
    if (securityToken.length !== 6) return;

    setIsProcessing(true);
    setLoading(true);

    const { success, user, error } = await verifyUserPIN(currentIdentifier, securityToken);

    setLoading(false);
    setIsProcessing(false);

    if (success && user) {
      try {
        await auth.login(user, currentIdentifier);
        showToast("Login successful! Redirecting...", "success");
        closeSheets();
        setTimeout(() => router.replace("/(app)/(protected)"), 100);
      } catch (storageError) {
        console.error('Login storage error:', storageError);
        showToast("Login failed - storage error", "error");
        setPin(['', '', '', '', '', '']);
        setTimeout(() => loginPinRefs.current[0]?.focus(), 300);
      }
    } else {
      showToast(error || "Invalid security token", "error");
      setPin(['', '', '', '', '', '']);
      setTimeout(() => loginPinRefs.current[0]?.focus(), 300);
    }
  };

  const handleInputChange = (
    text: string, 
    index: number, 
    currentArray: string[], 
    setArray: React.Dispatch<React.SetStateAction<string[]>>,
    refs: React.MutableRefObject<(TextInput | null)[]>
  ) => {
    if (text.length > 1) {
      const pastedValues = text.slice(0, 6).split('');
      const newArray = [...currentArray];
      pastedValues.forEach((char, idx) => {
        if (index + idx < 6) newArray[index + idx] = char;
      });
      setArray(newArray);
      const lastIndex = Math.min(index + pastedValues.length - 1, 5);
      refs.current[lastIndex]?.focus();
      return;
    }
    const newArray = [...currentArray];
    newArray[index] = text;
    setArray(newArray);
    if (text && index < 5) {
      refs.current[index + 1]?.focus();
    }
  };

  const filteredCountries = countries.filter(c =>
    c.label.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.dial.includes(countrySearch)
  );

  const getPlaceholderText = () => {
    if (mode === 'country') {
      return "Select country";
    } else if (mode === 'email') {
      return "Enter email address";
    } else if (mode === 'phone' && country) {
      return `${country.flag} ${country.dial} Enter phone number`;
    }
    return "";
  };

  const getToggleText = () => {
    if (mode === 'email') {
      return "Click to Use phone instead 👈";
    } else if (mode === 'phone') {
      return "Click to Use email instead 👈";
    }
    return "";
  };

  const getPINTitle = () => {
    switch (pinStep) {
      case 'create':
        return 'Create 6-digit Security Token';
      case 'confirm':
        return 'Confirm Your Token';
      case 'login':
        return 'Enter Your Token';
      default:
        return 'Create Token';
    }
  };

  const getPINSubtitle = () => {
    switch (pinStep) {
      case 'create':
        return 'This 6-digit token will secure your account and transactions';
      case 'confirm':
        return 'Re-enter your 6-digit security token to confirm';
      case 'login':
        return `Enter your security token for ${maskIdentifier(currentIdentifier)}`;
      default:
        return 'Create your account security token';
    }
  };

  // ──────── RENDER ────────
// ──────── RENDER ────────
return (
  <SafeAreaView style={styles.container}>
    {/* STATIC BACKGROUND ELEMENTS */}
    <View style={styles.staticBackground}>
      {/* REMOVED: Switch Account Button from here */}
      <Animated.View
        style={[
          styles.pngWatermarkContainer,
          {
            transform: [{ scale: pulseAnim }]
          }
        ]}
      >
        <Image
          source={require("@/assets/icons/home.png")}
          style={styles.pngWatermark}
          resizeMode="contain"
        />
      </Animated.View>
      {networkStatus ? (
        <View style={styles.networkContainer}>
          <Text style={styles.networkText}>{networkStatus}</Text>
        </View>
      ) : null}
    </View>

    {/* MAIN CONTENT */}
    <View style={styles.fixedContent}>
      {/* MOVED: Switch Account Button to here - inside fixedContent */}
      <TouchableOpacity
        style={styles.switchAccountButton}
        onPress={handleSwitchAccountButton}
        activeOpacity={0.7}
      >
        <FontAwesome name="exchange" size={14} color="#FFD700" />
        <Text style={styles.switchAccountText}>
          Switch Account ({auth.savedAccounts?.length || 0})
        </Text>
      </TouchableOpacity>
      
      <View style={styles.contentWrapper}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to B-Pay</Text>
        </View>
        <TouchableOpacity
          style={styles.iconContainer}
          onPress={handleBiometricLogin}
        >
          <FontAwesome name="500px" size={60} color="#FFD700" />
        </TouchableOpacity>
        <View style={styles.goldenLineContainer}>
          {mode === 'country' ? (
            <TouchableOpacity
              style={styles.countryButton}
              onPress={() => setShowCountryPicker(true)}
              disabled={loadingCountries}
            >
              {loadingCountries ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#FFD700" />
                  <Text style={styles.countryButtonText}>Loading countries...</Text>
                </View>
              ) : (
                <>
                  <View style={styles.buttonBorder} />
                  <Text style={styles.countryButtonText}>{getPlaceholderText()}</Text>
                  <View style={styles.bonusTagEdge}>
                    <Text style={styles.bonusTagText}>+30%</Text>
                  </View>
                  <View style={styles.buttonBorder} />
                  <TouchableOpacity
                    style={styles.chevronContainer}
                    onPress={() => setShowCountryPicker(true)}
                  >
                    <FontAwesome name="chevron-down" size={20} color="#FFD700" />
                  </TouchableOpacity>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <>
              <View style={styles.inputContainer}>
                <View style={styles.buttonBorder} />
                {!identifier && !displayPhone ? (
                  <Text style={styles.placeholderText}>
                    {getPlaceholderText()}
                  </Text>
                ) : (
                  <Text style={styles.inputText}>
                    {mode === 'email'
                      ? identifier
                      : `${country?.flag} ${country?.dial} ${displayPhone}`
                    }
                  </Text>
                )}
                <View style={styles.bonusTagEdge}>
                  <Text style={styles.bonusTagText}>+30%</Text>
                </View>
                <View style={styles.buttonBorder} />
                {mode === 'phone' && (
                  <TextInput
                    ref={phoneInputRef}
                    style={styles.hiddenInput}
                    placeholder=""
                    placeholderTextColor="transparent"
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                    value={displayPhone}
                    onChangeText={(text) => {
                      const digits = text.replace(/\D/g, '');
                      setIdentifier(digits);
                      setDisplayPhone(formatPhoneNumber(digits));
                    }}
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                  />
                )}
                {mode === 'email' && (
                  <TextInput
                    ref={emailInputRef}
                    style={styles.hiddenInput}
                    placeholder=""
                    placeholderTextColor="transparent"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={identifier}
                    onChangeText={(text) => {
                      setIdentifier(text);
                    }}
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                  />
                )}
              </View>
            </>
          )}
        </View>
        {mode !== 'country' && (
          <TouchableOpacity
            style={styles.toggleTextBtn}
            onPress={handleToggleMode}
          >
            <Text style={styles.toggleText}>
              {getToggleText()}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerText}>🛡️ B-PAY © 2025</Text>
        <Text style={styles.footerSubtext}>
          — Secure. Smart. Transforming Banking 🚀 —
        </Text>
      </View>
    </View>

    {/* TOAST */}
    {toast && (
      <View style={[styles.toast, toast.type === 'success' ? styles.toastSuccess : styles.toastError]}>
        <Text style={styles.toastText}>{toast.msg}</Text>
      </View>
    )}

    {/* SUCCESS MODAL */}
    <SuccessModal
      visible={showSuccessModal}
      onClose={handleSuccessModalClose}
      transferPin={transferPin}
      onDontShowAgain={handleDontShowAgain}
    />

    {/* ✅ ACCOUNT SWITCH DROPDOWN – RENDERED AT ROOT LEVEL */}
<AccountSwitchDropdown
  visible={showAccountDropdown}
  onClose={() => setShowAccountDropdown(false)}
  accounts={auth.savedAccounts || []}
  currentAccount={auth.currentAccount}
  onSwitchAccount={handleSwitchAccount}
  onAddAccount={() => {
    setShowAccountDropdown(false);
    // Simply close dropdown and stay on login screen for new account creation
    // The user can continue with the normal login flow
  }}
  onRemoveAccount={async (identifier) => {
    if (!identifier) {
      showToast("Cannot remove invalid account", "error");
      return;
    }
    await auth.removeAccount(identifier);
    showToast("Account removed", "success");
  }}
/>

    {/* COUNTRY PICKER MODAL */}
    <Modal
      transparent
      visible={showCountryPicker}
      onRequestClose={() => setShowCountryPicker(false)}
      statusBarTranslucent
      animationType="slide"
    >
      <Pressable style={styles.modalOverlay} onPress={() => setShowCountryPicker(false)}>
        <View style={styles.pickerSheet}>
          <Text style={styles.pickerTitle}>Select Country</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search country..."
            placeholderTextColor="#666"
            value={countrySearch}
            onChangeText={setCountrySearch}
            autoFocus
          />
          {loadingCountries ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FFD700" />
              <Text style={styles.loadingText}>Loading countries...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredCountries}
              keyExtractor={item => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.countryItem, country?.code === item.code && styles.selectedCountryItem]}
                  onPress={() => handleCountrySelect(item)}
                >
                  <Text style={styles.flag}>{item.flag}</Text>
                  <Text style={styles.countryLabel}>{item.label}</Text>
                  <Text style={styles.dialCode}>{item.dial}</Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </Pressable>
    </Modal>

    {/* PIN SHEET */}
    <Modal
      transparent
      visible={pinModal}
      onRequestClose={closeSheets}
      statusBarTranslucent
      animationType="slide"
    >
      <Pressable style={styles.modalOverlay} onPress={() => !isProcessing && closeSheets()}>
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.warningContainer}>
            <Text style={styles.warningSymbol}>⚠</Text>
          </View>
          {isProcessing ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 20 }}>
              <ActivityIndicator size="large" color="#FFD700" />
              <Text style={{ color: '#FFD700', fontSize: 18, fontWeight: '600' }}>
                {pinStep === 'login' ? 'Logging in...' : 'Creating Account...'}
              </Text>
              <Text style={{ color: '#FFD700', fontSize: 14, textAlign: 'center', marginTop: 10 }}>
                B-PAY {maskIdentifier(currentIdentifier)}
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.sheetTitle}>{getPINTitle()}</Text>
              <Text style={styles.sheetSubtitle}>
                {getPINSubtitle()}
              </Text>
              <View style={styles.securityWarning}>
                <Text style={styles.locationPin}>📍</Text>
                <Text style={styles.securityText}>
                  This Token will be used to secure 🔐 your B-PAY account. Do not share your token with anyone.
                </Text>
              </View>
              <View style={styles.otpRow}>
                {(pinStep === 'login' ? pin : pinStep === 'create' ? pin : confirmPin).map((_, i) => (
                  <TextInput
                    key={i}
                    ref={ref => {
                      if (pinStep === 'create') {
                        pinRefs.current[i] = ref;
                      } else if (pinStep === 'confirm') {
                        confirmPinRefs.current[i] = ref;
                      } else {
                        loginPinRefs.current[i] = ref;
                      }
                    }}
                    style={[
                      styles.otpBox,
                      (pinStep === 'login' ? pin[i] : pinStep === 'create' ? pin[i] : confirmPin[i]) && styles.otpBoxFilled
                    ]}
                    keyboardType="number-pad"
                    maxLength={1}
                    secureTextEntry={true}
                    value={pinStep === 'login' ? pin[i] : pinStep === 'create' ? pin[i] : confirmPin[i]}
                    onChangeText={(text) => {
                      if (pinStep === 'create' || pinStep === 'login') {
                        handleInputChange(text, i, pin, setPin, pinStep === 'create' ? pinRefs : loginPinRefs);
                      } else {
                        handleInputChange(text, i, confirmPin, setConfirmPin, confirmPinRefs);
                      }
                    }}
                    onKeyPress={(e: any) => {
                      if (e.nativeEvent.key === 'Backspace') {
                        if ((pinStep === 'create' || pinStep === 'login') && !pin[i] && i > 0) {
                          (pinStep === 'create' ? pinRefs.current[i - 1] : loginPinRefs.current[i - 1])?.focus();
                        } else if (pinStep === 'confirm' && !confirmPin[i] && i > 0) {
                          confirmPinRefs.current[i - 1]?.focus();
                        }
                      }
                    }}
                  />
                ))}
              </View>
              {pinStep === 'confirm' && (
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => {
                    setPinStep('create');
                    setConfirmPin(['', '', '', '', '', '']);
                    setTimeout(() => pinRefs.current[0]?.focus(), 300);
                  }}
                >
                  <Text style={styles.backText}>← Back to change Token</Text>
                </TouchableOpacity>
              )}
              {pinStep === 'login' && (
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => {
                    closeSheets();
                    setIdentifier('');
                    setDisplayPhone('');
                  }}
                >
                  <Text style={styles.backText}>← Use different email/phone</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </Pressable>
    </Modal>

    {/* BIOMETRIC SETUP MODAL */}
    <Modal
      transparent
      visible={biometricModal}
      onRequestClose={() => setBiometricModal(false)}
      statusBarTranslucent
      animationType="slide"
    >
      <Pressable style={styles.modalOverlay} onPress={() => setBiometricModal(false)}>
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Enable Biometric Login</Text>
          <Text style={styles.sheetSubtitle}>Use fingerprint or face ID</Text>
          <TouchableOpacity
            style={styles.verifyBtn}
            onPress={handleBiometricSetup}
            disabled={loading}
          >
            <Text style={styles.verifyText}>
              {loading ? "Setting up..." : "Enable"}
            </Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  </SafeAreaView>
);
}

// ──────── STYLES ────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  staticBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  switchAccountButton: {
    position: "absolute",
    top: 60,
    right: 20,
    zIndex: 10000,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FFD700",
    gap: 8,
  },
  switchAccountText: {
    color: "#FFD700",
    fontSize: 14,
    fontWeight: "600",
  },
  pngWatermarkContainer: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 300,
    height: 300,
    marginLeft: -150,
    marginTop: -150,
    zIndex: 1,
    opacity: 0.38,
  },
  pngWatermark: {
    width: "100%",
    height: "100%",
  },
  networkContainer: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF4444',
    zIndex: 5,
  },
  networkText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  fixedContent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    justifyContent: "center",
  },
  contentWrapper: {
    paddingHorizontal: 32,
    zIndex: 2,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    marginTop: 20,
  },
  title: {
    color: "#FFD700",
    fontSize: 28,
    fontWeight: "700",
  },
  goldenLineContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  countryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    height: 66,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    height: 66,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  buttonBorder: {
    flex: 1,
    height: 1,
    backgroundColor: '#FFD700',
    marginHorizontal: 8,
  },
  countryButtonText: {
    color: '#FFD700',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  placeholderText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 12,
    opacity: 0.9,
  },
  inputText: {
    color: '#FFD700',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 12,
    fontWeight: '600',
  },
  chevronContainer: {
    position: 'absolute',
    bottom: 5,
    alignSelf: 'center',
  },
  bonusTagEdge: {
    position: 'absolute',
    top: -12,
    right: 12,
    backgroundColor: '#8B4513',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    transform: [{ rotate: '-10deg' }],
  },
  bonusTagText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    height: 66,
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
  },
  toggleTextBtn: {
    alignItems: 'center',
    marginTop: 12,
    bottom: 40,
  },
  toggleText: {
    color: 'white',
    fontSize: 14,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
  },
  footerText: {
    color: 'blue',
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  footerSubtext: {
    color: '#666',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 50,
  },
  toast: {
    position: 'absolute',
    bottom: 100,
    left: 32,
    right: 32,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    zIndex: 1000,
  },
  toastSuccess: {
    backgroundColor: '#00FF7F',
  },
  toastError: {
    backgroundColor: '#FF4444',
  },
  toastText: {
    color: '#fff',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  pickerSheet: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: 500,
    padding: 20,
  },
  searchInput: {
    backgroundColor: '#000',
    color: '#fff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  pickerTitle: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  selectedCountryItem: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
  },
  countryLabel: {
    color: '#fff',
    flex: 1,
    marginLeft: 12,
  },
  dialCode: {
    color: '#aaa',
  },
  flag: {
    fontSize: 20,
    marginRight: 4,
  },
  sheet: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  sheetHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#444',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  sheetSubtitle: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 20,
  },
  warningContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  warningSymbol: {
    fontSize: 40,
    color: '#FFD700',
    textAlign: 'center',
  },
  securityWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFD700',
    marginBottom: 20,
  },
  locationPin: {
    fontSize: 16,
    marginRight: 8,
    marginTop: 2,
  },
  securityText: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    lineHeight: 18,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  otpBox: {
    backgroundColor: 'transparent',
    width: 48,
    height: 56,
    borderRadius: 12,
    textAlign: 'center',
    color: '#fff',
    fontSize: 20,
    borderWidth: 1,
    borderColor: '#333',
    secureTextEntry: true,
  },
  otpBoxFilled: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  backButton: {
    alignItems: 'center',
    marginBottom: 20,
  },
  backText: {
    color: '#FFD700',
    fontSize: 14,
  },
  verifyBtn: {
    backgroundColor: '#FFD700',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#FFD700',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
});