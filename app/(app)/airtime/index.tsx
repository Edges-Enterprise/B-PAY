import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/stores/auth-store';
import * as LocalAuthentication from 'expo-local-authentication';
import PinModal from '@/components/send/PinModal';

const { width, height } = Dimensions.get('window');

// -----------------------------------------------------------------------------
// Complete Network Prefix Lists from AirtimeProvider.tsx
// -----------------------------------------------------------------------------
const NETWORK_CONFIG = {
  MTN: {
    id: 1,
    name: 'MTN Nigeria',
    code: 'mtn',
    color: '#FFD700',
    prefixes: ["0703","0706","0707","0704","07025","07026","0803","0806","0810","0813","0814","0816","0903","0906","0913","0916"]
  },
  AIRTEL: {
    id: 2,
    name: 'Airtel Nigeria',
    code: 'airtel',
    color: '#FF0000',
    prefixes: ["0701","0708","0802","0808","0812","0901","0902","0904","0907","0912","0911"]
  },
  GLO: {
    id: 3,
    name: 'Globacom',
    code: 'glo',
    color: '#00FF00',
    prefixes: ["0805","0807","0705","0815","0811","0905","0915"]
  },
  '9MOBILE': {
    id: 4,
    name: '9mobile',
    code: '9mobile',
    color: '#00FFFF',
    prefixes: ["0809","0817","0818","0909","0908"]
  }
};

// -----------------------------------------------------------------------------
// Network logo mapping
// -----------------------------------------------------------------------------
const NETWORK_LOGO_MAP = {
  'MTN': require('@/assets/icons/sp-mtn-logo.jpeg'),
  'AIRTEL': require('@/assets/icons/sp-airtel-logo.jpeg'),
  'GLO': require('@/assets/icons/sp-glo_logo.png'),
  '9MOBILE': require('@/assets/icons/sp-9mobile.jpeg'),
};

// -----------------------------------------------------------------------------
// Quick Amount Presets
// -----------------------------------------------------------------------------
const QUICK_AMOUNTS = [
  { label: '₦100.00', value: 100.00 },
  { label: '₦500.00', value: 500.00 },
  { label: '₦1,000.00', value: 1000.00 },
  { label: '₦5,000.00', value: 5000.00 },
];

const AirtimeDataScreen = () => {
  const { user, isAuthenticated, balance: authBalance } = useAuth();
  const [phone, setPhone] = useState('');
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [customAmount, setCustomAmount] = useState('');
  const [balance, setBalance] = useState(0);
  const [currencySymbol, setCurrencySymbol] = useState('₦');
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectedNetwork, setDetectedNetwork] = useState("");
  const [hasPin, setHasPin] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [isBalanceLoading, setIsBalanceLoading] = useState(true);
  const [showPinModal, setShowPinModal] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [quickAmountClicks, setQuickAmountClicks] = useState({});
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  // Animations
  const watermarkPulse = useState(new Animated.Value(1))[0];
  const skeletonOpacity = useState(new Animated.Value(0.5))[0];

  // -------------------------------------------------------------------------
  // Check Biometric Availability
  // -------------------------------------------------------------------------
  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(hasHardware && isEnrolled);
    } catch (error) {
      console.error('Error checking biometric availability:', error);
    }
  };

  // -------------------------------------------------------------------------
  // Enhanced Network Detection Logic
  // -------------------------------------------------------------------------
  const detectNetworkFromPhone = useCallback((phoneNumber) => {
    if (!phoneNumber || phoneNumber.length < 4) return "";
    
    const prefix = phoneNumber.slice(0, 4);
    
    // Check each network's prefixes
    for (const [networkName, networkData] of Object.entries(NETWORK_CONFIG)) {
      if (networkData.prefixes.includes(prefix)) {
        return networkName;
      }
    }
    
    return "";
  }, []);

  // Auto-detect network when phone changes
  useEffect(() => {
    if (phone.length >= 4) {
      const detected = detectNetworkFromPhone(phone);
      setDetectedNetwork(detected);
      
      // Auto-select provider if detected
      if (detected) {
        setSelectedProvider(NETWORK_CONFIG[detected]);
      } else {
        setSelectedProvider(null);
      }
    } else {
      setDetectedNetwork("");
      setSelectedProvider(null);
    }
  }, [phone, detectNetworkFromPhone]);

  // -------------------------------------------------------------------------
  // User Data and PIN Verification - FIXED
  // -------------------------------------------------------------------------
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsCheckingAuth(true);
        
        // First, check if we're authenticated via useAuth
        if (!isAuthenticated || !user) {
          console.log('User not authenticated via useAuth hook');
          setIsBalanceLoading(false);
          setIsCheckingAuth(false);
          
          // Redirect to login if not authenticated
          router.replace('/(auth)/login');
          return;
        }
        
        // Get user email from useAuth store instead of Supabase
        const email = user.currentAccount || user.email;
        if (!email) {
          throw new Error("User email not found");
        }
        
        setUserEmail(email);
        
        // Use balance from auth store directly
        setBalance(authBalance || 0);
        
        // Try to get PIN from profiles table
        try {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("transaction_pin")
            .eq("id", user.id) // Use user.id from useAuth
            .single();

          if (!profileError && profile?.transaction_pin) {
            setHasPin(true);
          }
        } catch (profileErr) {
          console.log("Could not fetch PIN status:", profileErr);
          // Continue without PIN check
        }
        
        // Generate reference ID
        const newReferenceId = `AIRTIME_${user.id}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        setReferenceId(newReferenceId);
        
        setIsBalanceLoading(false);
        setIsCheckingAuth(false);
        
      } catch (error) {
        console.error("Error in fetchUserData:", error);
        setIsBalanceLoading(false);
        setIsCheckingAuth(false);
        
        // If there's an auth error, redirect to login
        if (error.message.includes('authenticated') || error.message.includes('email')) {
          Alert.alert(
            'Session Expired',
            'Your session has expired. Please log in again.',
            [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
          );
        }
      }
    };
    
    fetchUserData();
  }, [isAuthenticated, user, authBalance]);

  // -------------------------------------------------------------------------
  // Skeleton Animation
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (isCheckingAuth || isBalanceLoading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(skeletonOpacity, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(skeletonOpacity, {
            toValue: 0.7,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      skeletonOpacity.setValue(1);
    }
  }, [isCheckingAuth, isBalanceLoading]);

  // -------------------------------------------------------------------------
  // Handle Quick Amount Click (Incremental)
  // -------------------------------------------------------------------------
  const handleQuickAmountClick = (amount) => {
    const currentAmount = parseFloat(customAmount) || 0;
    const newAmount = currentAmount + amount;
    setCustomAmount(newAmount.toFixed(2));
    
    // Track clicks for visual feedback
    setQuickAmountClicks(prev => ({
      ...prev,
      [amount]: (prev[amount] || 0) + 1
    }));
  };

  // -------------------------------------------------------------------------
  // Handle amount input
  // -------------------------------------------------------------------------
  const handleAmountChange = (text) => {
    // Remove any non-digit or dot characters
    let cleaned = text.replace(/[^0-9.]/g, '');
    
    // Ensure only one dot
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Limit to 2 decimal places
    if (parts[1] && parts[1].length > 2) {
      cleaned = parts[0] + '.' + parts[1].slice(0, 2);
    }
    
    setCustomAmount(cleaned);
  };

  // -------------------------------------------------------------------------
  // Validate Purchase Data
  // -------------------------------------------------------------------------
  const validatePurchase = () => {
    if (!phone) {
      Alert.alert('Error', 'Please enter a phone number');
      return false;
    }
    
    if (phone.length !== 11 || !/^\d{11}$/.test(phone)) {
      Alert.alert('Error', 'Please enter a valid 11-digit phone number');
      return false;
    }
    
    if (!detectedNetwork || !selectedProvider) {
      Alert.alert('Error', 'Could not identify network provider. Please check the phone number.');
      return false;
    }
    
    const amount = parseFloat(customAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return false;
    }
    
    if (amount > balance) {
      Alert.alert(
        'Insufficient Balance',
        `You need ${currencySymbol}${formatCurrency(amount)} but only have ${currencySymbol}${formatCurrency(balance)}`
      );
      return false;
    }
    
    // Validate phone against provider
    const prefix = phone.slice(0, 4);
    if (!selectedProvider.prefixes.includes(prefix)) {
      Alert.alert('Error', `Invalid phone number for ${selectedProvider.name}.`);
      return false;
    }
    
    return true;
  };

  // -------------------------------------------------------------------------
  // Handle Pay Button Click (PIN Method)
  // -------------------------------------------------------------------------
  const handlePayButtonClick = () => {
    if (!validatePurchase()) return;
    
    if (!hasPin) {
      Alert.alert(
        'Transaction PIN Required',
        'Please set up a transaction PIN before making purchases.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Set PIN', onPress: () => router.push('/(app)/settings/pin') }
        ]
      );
      return;
    }
    
    setShowPinModal(true);
  };

  // -------------------------------------------------------------------------
  // Handle Fingerprint Button Click (Biometric Method)
  // -------------------------------------------------------------------------
  const handleFingerprintClick = async () => {
    if (!validatePurchase()) return;
    
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to complete purchase',
        fallbackLabel: 'Use PIN instead',
        disableDeviceFallback: false,
      });

      if (result.success) {
        // Navigate to success page with purchase data
        router.push({
          pathname: '/(app)/success',
          params: {
            type: 'airtime',
            amount: customAmount,
            phone: phone,
            provider: selectedProvider.name,
            reference: referenceId,
            authMethod: 'biometric'
          }
        });
      } else {
        Alert.alert(
          'Authentication Failed',
          'Biometric authentication was not successful. Please try PIN instead.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      Alert.alert(
        'Authentication Error',
        'An error occurred during biometric authentication. Please use PIN instead.',
        [{ text: 'OK' }]
      );
    }
  };

  // -------------------------------------------------------------------------
  // Handle PIN Verification Success
  // -------------------------------------------------------------------------
  const handlePinVerified = async (pin) => {
    // Here you would verify the PIN with your backend
    // For now, we'll assume it's correct and navigate to success page
    
    // Close PIN modal
    setShowPinModal(false);
    
    // Navigate to success page with purchase data
    router.push({
      pathname: '/(app)/success',
      params: {
        type: 'airtime',
        amount: customAmount,
        phone: phone,
        provider: selectedProvider.name,
        reference: referenceId,
        authMethod: 'pin'
      }
    });
  };

  // -------------------------------------------------------------------------
  // Helper Functions
  // -------------------------------------------------------------------------
  const formatCurrency = (amount) => {
    if (!amount) return '0.00';
    const num = parseFloat(amount);
    return isNaN(num) ? '0.00' : num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const getProviderColor = () => {
    return selectedProvider?.color || '#666';
  };

  const getProviderLogo = (providerName) => {
    return NETWORK_LOGO_MAP[providerName] || require('@/assets/icons/home.png');
  };

  // Start watermark animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(watermarkPulse, {
          toValue: 1.06,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(watermarkPulse, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  // -------------------------------------------------------------------------
  // Skeleton Components
  // -------------------------------------------------------------------------
  const SkeletonText = ({ width = '100%', height = 20 }) => (
    <Animated.View style={[styles.skeleton, { width, height, opacity: skeletonOpacity }]} />
  );

  const SkeletonInput = () => (
    <Animated.View style={[styles.skeleton, styles.skeletonInput, { opacity: skeletonOpacity }]} />
  );

  const SkeletonButton = ({ width = 80 }) => (
    <Animated.View style={[styles.skeleton, styles.skeletonButton, { width, opacity: skeletonOpacity }]} />
  );

  // Show skeleton UI while loading
  if (isCheckingAuth || isBalanceLoading) {
    return (
      <View style={styles.container}>
        {/* Watermark Background */}
        <Animated.View pointerEvents="none" style={styles.watermarkWrapper}>
          <Animated.Image
            source={require('@/assets/icons/home.png')}
            style={[styles.watermark, { transform: [{ scale: watermarkPulse }] }]}
            resizeMode="contain"
          />
        </Animated.View>

        <View style={styles.content}>
          {/* Header Skeleton */}
          <View style={styles.header}>
            <View style={styles.balanceContainer}>
              <SkeletonText width={60} height={14} />
            </View>
            
            <View style={styles.serviceToggle}>
              <View style={[styles.serviceButton, styles.serviceButtonActive]}>
                <SkeletonText width={40} height={12} />
              </View>
              <View style={styles.serviceButton}>
                <SkeletonText width={40} height={12} />
              </View>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Tab Navigation Skeleton */}
            <View style={styles.tabContainer}>
              <View style={[styles.tab, styles.tabActive]}>
                <SkeletonText width={60} height={13} />
              </View>
              <View style={styles.tab}>
                <SkeletonText width={60} height={13} />
              </View>
            </View>

            {/* Phone Input Section Skeleton */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <SkeletonText width={100} height={14} />
              </View>
              <SkeletonInput />
            </View>

            {/* Amount Input Section Skeleton */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <SkeletonText width={80} height={14} />
              </View>
              <SkeletonInput />
              
              {/* Quick Amount Buttons Skeleton */}
              <View style={styles.quickAmounts}>
                {QUICK_AMOUNTS.map((_, index) => (
                  <SkeletonButton key={index} width={80} />
                ))}
              </View>
            </View>

            {/* Security Notice Skeleton */}
            <View style={styles.securityNotice}>
              <SkeletonText width="100%" height={14} />
            </View>

            {/* Action Buttons Skeleton */}
            <View style={styles.actionButtonsContainer}>
              <View style={[styles.payButton, styles.payButtonDisabled]}>
                <SkeletonText width={60} height={16} />
              </View>
              <View style={[styles.biometricButton, styles.biometricButtonDisabled]} />
            </View>
          </ScrollView>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Watermark Background */}
      <Animated.View pointerEvents="none" style={styles.watermarkWrapper}>
        <Animated.Image
          source={require('@/assets/icons/home.png')}
          style={[styles.watermark, { transform: [{ scale: watermarkPulse }] }]}
          resizeMode="contain"
        />
      </Animated.View>

      <View style={styles.content}>
        {/* Header with Balance and Toggle */}
        <View style={styles.header}>
          <View style={styles.balanceContainer}>
            <Ionicons name="wallet-outline" size={16} color="#FFD700" />
            <Text style={styles.balanceText}>
              {`${currencySymbol}${formatCurrency(balance)}`}
            </Text>
          </View>
          
          <View style={styles.serviceToggle}>
            <TouchableOpacity
              style={[
                styles.serviceButton,
                styles.serviceButtonActive,
              ]}
            >
              <Text style={styles.serviceButtonTextActive}>
                Airtime
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.serviceButton}
              onPress={() => router.push('/(app)/bundles')}
            >
              <Text style={styles.serviceButtonText}>
                Data
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[
                styles.tab,
                styles.tabActive,
              ]}
            >
              <Text style={styles.tabTextActive}>
                🇳🇬 Local
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.tab}
              onPress={() => router.push('/(app)/airtime/tabs/international')}
            >
              <Text style={styles.tabText}>
                🌍 International
              </Text>
            </TouchableOpacity>
          </View>

          {/* Phone Input Section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="call-outline" size={18} color="#FFD700" />
              <Text style={styles.sectionTitle}>Phone Number</Text>
            </View>
            
            <View style={styles.phoneInputContainer}>
              <TextInput
                style={[
                  styles.phoneInput,
                  detectedNetwork && styles.phoneInputWithNetwork
                ]}
                placeholder="0810 000 0000"
                placeholderTextColor="#666"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={11}
              />
              
              {/* Network Circle Indicator INSIDE Input Field */}
              {detectedNetwork && (
                <View style={styles.networkCircleContainer}>
                  <View style={[styles.networkCircle, { backgroundColor: getProviderColor() }]}>
                    <Image
                      source={getProviderLogo(detectedNetwork)}
                      style={styles.networkCircleLogo}
                      resizeMode="contain"
                    />
                  </View>
                </View>
              )}
              
              {!detectedNetwork && phone.length >= 4 && (
                <View style={styles.networkCircleContainer}>
                  <View style={styles.invalidNetworkCircle}>
                    <Ionicons name="alert-circle" size={16} color="#EF4444" />
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Amount Input Section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="cash-outline" size={18} color="#FFD700" />
              <Text style={styles.sectionTitle}>Enter Amount</Text>
            </View>
            
            <View style={styles.amountInputContainer}>
              <Text style={styles.currencySymbol}>
                ₦
              </Text>
              <TextInput
                style={styles.amountInput}
                placeholder="100.00"
                placeholderTextColor="#666"
                value={customAmount}
                onChangeText={handleAmountChange}
                keyboardType="decimal-pad"
              />
            </View>
            
            {/* Quick Amount Buttons */}
            <View style={styles.quickAmounts}>
              {QUICK_AMOUNTS.map((amount, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.quickAmountButton,
                    quickAmountClicks[amount.value] && styles.quickAmountButtonActive
                  ]}
                  onPress={() => handleQuickAmountClick(amount.value)}
                >
                  <Text style={styles.quickAmountText}>{amount.label}</Text>
                  {quickAmountClicks[amount.value] > 1 && (
                    <Text style={styles.quickAmountCount}>×{quickAmountClicks[amount.value]}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Security Notice */}
          <View style={styles.securityNotice}>
            <Ionicons name="warning" size={14} color="#FFD700" />
            <Text style={styles.securityText}>
              Your transactions are secured with AES-256 encryption.
            </Text>
          </View>

          {/* Action Buttons (INSIDE ScrollView) */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={[
                styles.payButton,
                (!phone || !customAmount || !detectedNetwork) && styles.payButtonDisabled
              ]}
              onPress={handlePayButtonClick}
              disabled={!phone || !customAmount || !detectedNetwork || isProcessing}
            >
              <Text style={styles.payButtonText}>
                {isProcessing ? 'Processing...' : 'Pay'}
              </Text>
            </TouchableOpacity>
            
            {biometricAvailable && (
              <TouchableOpacity
                style={[
                  styles.biometricButton,
                  (!phone || !customAmount || !detectedNetwork) && styles.biometricButtonDisabled
                ]}
                onPress={handleFingerprintClick}
                disabled={!phone || !customAmount || !detectedNetwork || isProcessing}
              >
                <Ionicons 
                  name={Platform.OS === 'ios' ? 'fingerprint' : 'finger-print'} 
                  size={24} 
                  color="#FFD700" 
                />
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>

      {/* PIN Modal */}
      <PinModal
        visible={showPinModal}
        onClose={() => setShowPinModal(false)}
        onVerify={handlePinVerified}
        title="Enter Transaction PIN"
        description="Enter your 4-digit PIN to confirm this purchase"
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  skeleton: {
    backgroundColor: '#333',
    borderRadius: 4,
  },
  skeletonInput: {
    height: 48,
    width: '100%',
    borderRadius: 8,
  },
  skeletonButton: {
    height: 34,
    borderRadius: 8,
  },
  watermarkWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  watermark: {
    width: 300,
    height: 300,
    opacity: 0.1,
  },
  content: {
    flex: 1,
    zIndex: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#000',
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  balanceText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
  },
  serviceToggle: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    borderRadius: 20,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  serviceButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  serviceButtonActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  serviceButtonText: {
    color: '#999',
    fontSize: 12,
    fontWeight: '600',
  },
  serviceButtonTextActive: {
    color: '#FFD700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    borderRadius: 20,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabActive: {
    borderColor: '#FFD700',
    backgroundColor: 'transparent',
  },
  tabText: {
    color: '#999',
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFD700',
  },
  sectionCard: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  phoneInputContainer: {
    position: 'relative',
  },
  phoneInput: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    padding: 12,
    fontSize: 16,
    color: '#fff',
  },
  phoneInputWithNetwork: {
    paddingRight: 50, // Extra padding for network circle
  },
  networkCircleContainer: {
    position: 'absolute',
    right: 10,
    top: 12,
    bottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  networkCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  networkCircleLogo: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  invalidNetworkCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 14,
  },
  currencySymbol: {
    color: '#FFD700',
    fontSize: 20,
    fontWeight: '300',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    paddingVertical: 12,
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  quickAmountButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    alignItems: 'center',
    minWidth: 80,
  },
  quickAmountButtonActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderColor: '#FFD700',
  },
  quickAmountText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
  },
  quickAmountCount: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 2,
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'transparent',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  securityText: {
    flex: 1,
    color: '#FFD7',
    fontSize: 11,
    lineHeight: 14,
  },
  // Action Buttons (INSIDE ScrollView)
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 30,
    marginTop: 10,
  },
  payButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FFD700',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  payButtonDisabled: {
    borderColor: '#666',
    opacity: 0.5,
  },
  payButtonText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
  },
  biometricButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
  },
  biometricButtonDisabled: {
    borderColor: '#666',
    opacity: 0.5,
  },
});

export default AirtimeDataScreen;