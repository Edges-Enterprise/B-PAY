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
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/stores/auth-store';
import * as LocalAuthentication from 'expo-local-authentication';
import PinModal from '@/components/send/PinModal';

const { width, height } = Dimensions.get('window');

// -----------------------------------------------------------------------------
// Complete Network Prefix Lists
// -----------------------------------------------------------------------------
const NETWORK_CONFIG = {
  MTN: {
    id: 1,
    name: 'MTN Nigeria',
    code: 'mtn',
    color: '#FFD700', // Gold/Yellow
    lightColor: 'rgba(255, 215, 0, 0.1)',
    textColor: '#FFD700',
    prefixes: ["0703","0706","0707","0704","07025","07026","0803","0806","0810","0813","0814","0816","0903","0906","0913","0916"]
  },
  AIRTEL: {
    id: 2,
    name: 'Airtel Nigeria',
    code: 'airtel',
    color: '#FF0000', // Red
    lightColor: 'rgba(255, 0, 0, 0.1)',
    textColor: '#FF6B6B',
    prefixes: ["0701","0708","0802","0808","0812","0901","0902","0904","0907","0912","0911"]
  },
  GLO: {
    id: 3,
    name: 'Globacom',
    code: 'glo',
    color: '#00FF00', // Green
    lightColor: 'rgba(0, 255, 0, 0.1)',
    textColor: '#4ADE80',
    prefixes: ["0805","0807","0705","0815","0811","0905","0915"]
  },
  '9MOBILE': {
    id: 4,
    name: '9mobile',
    code: '9mobile',
    color: '#00FFFF', // Cyan
    lightColor: 'rgba(0, 255, 255, 0.1)',
    textColor: '#22D3EE',
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
// Data Bundle Plans - 7 per category
// -----------------------------------------------------------------------------
const DATA_BUNDLES = {
  daily: [
    { id: 'daily1', name: 'Mini Daily', data: '50MB', validity: '1 Day', price: 50.00 },
    { id: 'daily2', name: 'Basic Daily', data: '100MB', validity: '1 Day', price: 100.00 },
    { id: 'daily3', name: 'Standard Daily', data: '200MB', validity: '1 Day', price: 200.00 },
    { id: 'daily4', name: 'Plus Daily', data: '350MB', validity: '1 Day', price: 300.00 },
    { id: 'daily5', name: 'Pro Daily', data: '500MB', validity: '1 Day', price: 500.00 },
    { id: 'daily6', name: 'Max Daily', data: '750MB', validity: '1 Day', price: 700.00 },
    { id: 'daily7', name: 'Ultra Daily', data: '1GB', validity: '1 Day', price: 1000.00 },
  ],
  weekly: [
    { id: 'weekly1', name: 'Mini Weekly', data: '1GB', validity: '7 Days', price: 500.00 },
    { id: 'weekly2', name: 'Basic Weekly', data: '2GB', validity: '7 Days', price: 1000.00 },
    { id: 'weekly3', name: 'Standard Weekly', data: '3GB', validity: '7 Days', price: 1500.00 },
    { id: 'weekly4', name: 'Plus Weekly', data: '4GB', validity: '7 Days', price: 2000.00 },
    { id: 'weekly5', name: 'Pro Weekly', data: '5GB', validity: '7 Days', price: 2500.00 },
    { id: 'weekly6', name: 'Max Weekly', data: '6GB', validity: '7 Days', price: 3000.00 },
    { id: 'weekly7', name: 'Ultra Weekly', data: '7GB', validity: '7 Days', price: 3500.00 },
  ],
  monthly: [
    { id: 'monthly1', name: 'Mini Monthly', data: '2GB', validity: '30 Days', price: 1000.00 },
    { id: 'monthly2', name: 'Basic Monthly', data: '4GB', validity: '30 Days', price: 2000.00 },
    { id: 'monthly3', name: 'Standard Monthly', data: '6GB', validity: '30 Days', price: 3000.00 },
    { id: 'monthly4', name: 'Plus Monthly', data: '8GB', validity: '30 Days', price: 4000.00 },
    { id: 'monthly5', name: 'Pro Monthly', data: '10GB', validity: '30 Days', price: 5000.00 },
    { id: 'monthly6', name: 'Max Monthly', data: '12GB', validity: '30 Days', price: 6000.00 },
    { id: 'monthly7', name: 'Ultra Monthly', data: '15GB', validity: '30 Days', price: 8000.00 },
  ]
};

// Total: 7 Daily + 7 Weekly + 7 Monthly = 21 cards

// -----------------------------------------------------------------------------
// Bundle Categories (Only Daily, Weekly, Monthly)
// -----------------------------------------------------------------------------
const BUNDLE_CATEGORIES = [
  { id: 'daily', name: 'Daily', icon: 'sunny-outline' },
  { id: 'weekly', name: 'Weekly', icon: 'calendar-outline' },
  { id: 'monthly', name: 'Monthly', icon: 'calendar' },
];

const DataBundlesScreen = () => {
  const { user, isAuthenticated, balance: authBalance } = useAuth();
  const [phone, setPhone] = useState('');
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [selectedBundle, setSelectedBundle] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('daily');
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
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [currentBundles, setCurrentBundles] = useState([]);
  
  // Animations
  const watermarkPulse = useState(new Animated.Value(1))[0];
  const watermarkOpacity = useState(new Animated.Value(0.1))[0];
  const skeletonOpacity = useState(new Animated.Value(0.5))[0];
  const bundleScale = useState(new Animated.Value(1))[0];

  // -------------------------------------------------------------------------
  // Enhanced Watermark Pulse Animation
  // -------------------------------------------------------------------------
  useEffect(() => {
    // Combined pulse and fade animation
    Animated.loop(
      Animated.parallel([
        // Scale animation
        Animated.sequence([
          Animated.timing(watermarkPulse, {
            toValue: 1.08,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(watermarkPulse, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
        // Opacity animation
        Animated.sequence([
          Animated.timing(watermarkOpacity, {
            toValue: 0.15,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(watermarkOpacity, {
            toValue: 0.08,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
      ]),
      {
        iterations: -1,
      }
    ).start();
  }, []);

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

  // -------------------------------------------------------------------------
  // Load bundles based on selected category - ONLY WHEN PHONE IS ENTERED
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (phone.length >= 4 && detectedNetwork) {
      // Only show bundles if phone number is valid and network is detected
      setCurrentBundles(DATA_BUNDLES[selectedCategory] || []);
    } else {
      // Clear bundles if no phone or invalid network
      setCurrentBundles([]);
    }
    setSelectedBundle(null);
  }, [selectedCategory, phone, detectedNetwork]);

  // Auto-detect network when phone changes
  useEffect(() => {
    if (phone.length >= 4) {
      const detected = detectNetworkFromPhone(phone);
      setDetectedNetwork(detected);
      
      // Auto-select provider if detected
      if (detected) {
        const provider = NETWORK_CONFIG[detected];
        setSelectedProvider(provider);
      } else {
        setSelectedProvider(null);
      }
    } else {
      setDetectedNetwork("");
      setSelectedProvider(null);
    }
  }, [phone, detectNetworkFromPhone]);

  // -------------------------------------------------------------------------
  // User Data and PIN Verification
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
            .eq("id", user.id)
            .single();

          if (!profileError && profile?.transaction_pin) {
            setHasPin(true);
          }
        } catch (profileErr) {
          console.log("Could not fetch PIN status:", profileErr);
          // Continue without PIN check
        }
        
        // Generate reference ID
        const newReferenceId = `DATA_${user.id}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
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
    
    if (!selectedBundle) {
      Alert.alert('Error', 'Please select a data bundle');
      return false;
    }
    
    if (selectedBundle.price > balance) {
      Alert.alert(
        'Insufficient Balance',
        `You need ${currencySymbol}${formatCurrency(selectedBundle.price)} but only have ${currencySymbol}${formatCurrency(balance)}`
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
        promptMessage: 'Authenticate to purchase data bundle',
        fallbackLabel: 'Use PIN instead',
        disableDeviceFallback: false,
      });

      if (result.success) {
        // Navigate to success page with purchase data
        router.push({
          pathname: '/(app)/success',
          params: {
            type: 'data',
            amount: selectedBundle.price,
            phone: phone,
            provider: selectedProvider.name,
            bundle: selectedBundle.name,
            data: selectedBundle.data,
            validity: selectedBundle.validity,
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
    // Close PIN modal
    setShowPinModal(false);
    
    // Navigate to success page with purchase data
    router.push({
      pathname: '/(app)/success',
      params: {
        type: 'data',
        amount: selectedBundle.price,
        phone: phone,
        provider: selectedProvider.name,
        bundle: selectedBundle.name,
        data: selectedBundle.data,
        validity: selectedBundle.validity,
        reference: referenceId,
        authMethod: 'pin'
      }
    });
  };

  // -------------------------------------------------------------------------
  // Handle Bundle Selection with Animation
  // -------------------------------------------------------------------------
  const handleBundleSelect = (bundle) => {
    setSelectedBundle(bundle);
    
    // Animate selection
    Animated.sequence([
      Animated.timing(bundleScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(bundleScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
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

  const getProviderTextColor = () => {
    return selectedProvider?.textColor || '#FFD700';
  };

  const getProviderLightColor = () => {
    return selectedProvider?.lightColor || 'rgba(255, 215, 0, 0.1)';
  };

  const getProviderLogo = (providerName) => {
    return NETWORK_LOGO_MAP[providerName] || require('@/assets/icons/home.png');
  };

  // -------------------------------------------------------------------------
  // Render Bundle Item - Super Compact Cards
  // -------------------------------------------------------------------------
  const renderBundleItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.bundleItem,
        selectedBundle?.id === item.id && styles.bundleItemSelected,
        selectedBundle?.id === item.id && {
          borderColor: getProviderColor(),
          backgroundColor: getProviderLightColor(),
        }
      ]}
      onPress={() => handleBundleSelect(item)}
    >
      <View style={styles.bundleContent}>
        <Text style={[
          styles.bundleName,
          { color: getProviderTextColor() }
        ]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[
          styles.bundleData,
          { color: getProviderTextColor() }
        ]}>
          {item.data}
        </Text>
        <View style={styles.bundleFooter}>
          <Text style={styles.bundleValidity}>{item.validity}</Text>
          <Text style={[
            styles.bundlePrice,
            { color: getProviderTextColor() }
          ]}>
            ₦{formatCurrency(item.price)}
          </Text>
        </View>
      </View>
      {selectedBundle?.id === item.id && (
        <View style={styles.selectedIndicator}>
          <Ionicons name="checkmark-circle" size={12} color={getProviderColor()} />
        </View>
      )}
    </TouchableOpacity>
  );

  // -------------------------------------------------------------------------
  // Render empty state message based on phone input status
  // -------------------------------------------------------------------------
  const renderEmptyState = () => {
    if (phone.length === 0) {
      return (
        <View style={styles.emptyStateContainer}>
          <Ionicons name="phone-portrait-outline" size={40} color="#666" />
          <Text style={styles.emptyStateTitle}>Enter Phone Number</Text>
          <Text style={styles.emptyStateText}>
            Please enter a phone number to view available data bundles
          </Text>
        </View>
      );
    } else if (phone.length >= 4 && !detectedNetwork) {
      return (
        <View style={styles.emptyStateContainer}>
          <Ionicons name="alert-circle-outline" size={40} color="#FF6B6B" />
          <Text style={styles.emptyStateTitle}>Invalid Network</Text>
          <Text style={styles.emptyStateText}>
            Could not identify network provider. Please check the phone number.
          </Text>
        </View>
      );
    } else if (phone.length > 0 && phone.length < 11) {
      return (
        <View style={styles.emptyStateContainer}>
          <Ionicons name="information-circle-outline" size={40} color="#FFD700" />
          <Text style={styles.emptyStateTitle}>Complete Phone Number</Text>
          <Text style={styles.emptyStateText}>
            Please enter a complete 11-digit phone number
          </Text>
        </View>
      );
    }
    
    return null;
  };

  // -------------------------------------------------------------------------
  // Skeleton Components
  // -------------------------------------------------------------------------
  const SkeletonText = ({ width = '100%', height = 20 }) => (
    <Animated.View style={[styles.skeleton, { width, height, opacity: skeletonOpacity }]} />
  );

  const SkeletonInput = () => (
    <Animated.View style={[styles.skeleton, styles.skeletonInput, { opacity: skeletonOpacity }]} />
  );

  const SkeletonButton = ({ width = 70 }) => (
    <Animated.View style={[styles.skeleton, styles.skeletonButton, { width, opacity: skeletonOpacity }]} />
  );

  const SkeletonBundleItem = () => (
    <Animated.View style={[styles.skeletonBundleItem, { opacity: skeletonOpacity }]} />
  );

  // Show skeleton UI while loading
  if (isCheckingAuth || isBalanceLoading) {
    return (
      <View style={styles.container}>
        {/* Enhanced Watermark Background */}
        <Animated.View pointerEvents="none" style={styles.watermarkWrapper}>
          <Animated.Image
            source={require('@/assets/icons/home.png')}
            style={[
              styles.watermark, 
              { 
                transform: [{ scale: watermarkPulse }],
                opacity: watermarkOpacity 
              }
            ]}
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
              <View style={styles.serviceButton}>
                <SkeletonText width={40} height={12} />
              </View>
              <View style={[styles.serviceButton, styles.serviceButtonActive]}>
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
                <SkeletonText width={80} height={13} />
              </View>
              <View style={styles.tab}>
                <SkeletonText width={80} height={13} />
              </View>
            </View>

            {/* Phone Input Section Skeleton */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <SkeletonText width={100} height={14} />
              </View>
              <SkeletonInput />
            </View>

            {/* Categories Skeleton */}
            <View style={styles.categoriesContainer}>
              {[...Array(3)].map((_, index) => (
                <SkeletonButton key={index} width={70} />
              ))}
            </View>

            {/* Bundles Skeleton - Only show if phone is entered in skeleton */}
            <View style={styles.bundlesGrid}>
              {[...Array(7)].map((_, index) => (
                <SkeletonBundleItem key={index} />
              ))}
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
      {/* Enhanced Watermark Background */}
      <Animated.View pointerEvents="none" style={styles.watermarkWrapper}>
        <Animated.Image
          source={require('@/assets/icons/home.png')}
          style={[
            styles.watermark, 
            { 
              transform: [{ scale: watermarkPulse }],
              opacity: watermarkOpacity 
            }
          ]}
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
              style={styles.serviceButton}
              onPress={() => router.push('/(app)/airtime')}
            >
              <Text style={styles.serviceButtonText}>
                Airtime
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.serviceButton,
                styles.serviceButtonActive,
              ]}
            >
              <Text style={styles.serviceButtonTextActive}>
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
          {/* Tab Navigation - Local/International */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, styles.tabActive]}
            >
              <Text style={styles.tabTextActive}>
                🇳🇬 Local
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.tab}
              onPress={() => router.push('/(app)/bundles/tabs/international')}
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

          {/* Network Info - Only show if phone is entered */}
          {phone.length >= 4 && detectedNetwork && (
            <View style={styles.networkInfo}>
              <Image source={getProviderLogo(detectedNetwork)} style={styles.networkInfoLogo} />
              <Text style={[
                styles.networkInfoText,
                { color: getProviderTextColor() }
              ]}>
                {selectedProvider.name}
              </Text>
            </View>
          )}

          {/* Categories - Only show if phone is entered and network detected */}
          {phone.length >= 4 && detectedNetwork && (
            <View style={styles.categoriesContainer}>
              {BUNDLE_CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryButton,
                    selectedCategory === category.id && styles.categoryButtonActive,
                    selectedCategory === category.id && detectedNetwork && {
                      borderColor: getProviderColor(),
                      backgroundColor: getProviderLightColor(),
                    }
                  ]}
                  onPress={() => setSelectedCategory(category.id)}
                >
                  <Ionicons 
                    name={category.icon} 
                    size={14} 
                    color={selectedCategory === category.id ? getProviderTextColor() : '#999'} 
                  />
                  <Text style={[
                    styles.categoryText,
                    selectedCategory === category.id && styles.categoryTextActive,
                    selectedCategory === category.id && detectedNetwork && {
                      color: getProviderTextColor()
                    }
                  ]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Data Bundles - Only show if phone is entered and network detected */}
          {phone.length >= 4 && detectedNetwork ? (
            currentBundles.length > 0 ? (
              <FlatList
                data={currentBundles}
                renderItem={renderBundleItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                numColumns={2}
                columnWrapperStyle={styles.bundlesGrid}
                contentContainerStyle={styles.bundlesContainer}
              />
            ) : (
              <View style={styles.emptyStateContainer}>
                <Ionicons name="wifi-outline" size={40} color="#666" />
                <Text style={styles.emptyStateTitle}>No Bundles Found</Text>
                <Text style={styles.emptyStateText}>
                  No data bundles available for this category
                </Text>
              </View>
            )
          ) : (
            renderEmptyState()
          )}

          {/* Selected Bundle Summary - Only show if bundle is selected */}
          {selectedBundle && phone.length >= 4 && detectedNetwork && (
            <View style={[
              styles.selectedBundleSummary,
              { borderColor: getProviderColor() }
            ]}>
              <View style={styles.summaryHeader}>
                <Text style={[
                  styles.summaryTitle,
                  { color: getProviderTextColor() }
                ]}>
                  Selected Bundle
                </Text>
                <Text style={[
                  styles.summaryPrice,
                  { color: getProviderTextColor() }
                ]}>
                  ₦{formatCurrency(selectedBundle.price)}
                </Text>
              </View>
              <View style={styles.summaryDetails}>
                <View style={styles.summaryDetail}>
                  <Text style={styles.summaryDetailLabel}>Data:</Text>
                  <Text style={[
                    styles.summaryDetailValue,
                    { color: getProviderTextColor() }
                  ]}>
                    {selectedBundle.data}
                  </Text>
                </View>
                <View style={styles.summaryDetail}>
                  <Text style={styles.summaryDetailLabel}>Validity:</Text>
                  <Text style={[
                    styles.summaryDetailValue,
                    { color: getProviderTextColor() }
                  ]}>
                    {selectedBundle.validity}
                  </Text>
                </View>
                <View style={styles.summaryDetail}>
                  <Text style={styles.summaryDetailLabel}>Phone:</Text>
                  <Text style={[
                    styles.summaryDetailValue,
                    { color: getProviderTextColor() }
                  ]}>
                    {phone}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Security Notice */}
          <View style={styles.securityNotice}>
            <Ionicons name="shield-checkmark" size={14} color="#FFD700" />
            <Text style={styles.securityText}>
              Data is auto-delivered instantly after payment confirmation.
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={[
                styles.payButton,
                (!phone || !selectedBundle || !detectedNetwork) && styles.payButtonDisabled,
                selectedBundle && detectedNetwork && {
                  borderColor: getProviderColor(),
                }
              ]}
              onPress={handlePayButtonClick}
              disabled={!phone || !selectedBundle || !detectedNetwork || isProcessing}
            >
              <Text style={[
                styles.payButtonText,
                selectedBundle && detectedNetwork && {
                  color: getProviderTextColor()
                }
              ]}>
                {isProcessing ? 'Processing...' : `Pay ₦${selectedBundle ? formatCurrency(selectedBundle.price) : '0.00'}`}
              </Text>
            </TouchableOpacity>
            
            {biometricAvailable && (
              <TouchableOpacity
                style={[
                  styles.biometricButton,
                  (!phone || !selectedBundle || !detectedNetwork) && styles.biometricButtonDisabled,
                  selectedBundle && detectedNetwork && {
                    borderColor: getProviderColor(),
                  }
                ]}
                onPress={handleFingerprintClick}
                disabled={!phone || !selectedBundle || !detectedNetwork || isProcessing}
              >
                <Ionicons 
                  name={Platform.OS === 'ios' ? 'fingerprint' : 'finger-print'} 
                  size={20} 
                  color={selectedBundle && detectedNetwork ? getProviderColor() : '#FFD700'} 
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
        description="Enter your 4-digit PIN to purchase this data bundle"
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
  skeletonBundleItem: {
    width: (width - 48) / 2,
    height: 85,
    backgroundColor: '#333',
    borderRadius: 8,
    marginBottom: 8,
  },
  watermarkWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  watermark: {
    width: 280,
    height: 280,
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
  // NEW: Tab Navigation Styles
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
    paddingRight: 50,
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
  networkInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  networkInfoLogo: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  networkInfoText: {
    fontSize: 13,
    fontWeight: '600',
  },
  categoriesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: '#333',
  },
  categoryButtonActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderColor: '#FFD700',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
  },
  categoryTextActive: {
    color: '#FFD700',
  },
  bundlesContainer: {
    marginBottom: 16,
  },
  bundlesGrid: {
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  bundleItem: {
    width: (width - 48) / 2 - 5,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#333',
    height: 85,
    justifyContent: 'space-between',
  },
  bundleItemSelected: {
    borderWidth: 2,
    position: 'relative',
  },
  bundleContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  bundleName: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },
  bundleData: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 2,
  },
  bundleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  bundleValidity: {
    color: '#999',
    fontSize: 9,
  },
  bundlePrice: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    marginBottom: 20,
    height: 160,
  },
  emptyStateTitle: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  selectedBundleSummary: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  summaryPrice: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  summaryDetails: {
    gap: 4,
  },
  summaryDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryDetailLabel: {
    color: '#999',
    fontSize: 10,
  },
  summaryDetailValue: {
    fontSize: 10,
    fontWeight: '600',
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'transparent',
    borderRadius: 8,
    padding: 10,
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
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  payButtonDisabled: {
    borderColor: '#666',
    opacity: 0.5,
  },
  payButtonText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: 'bold',
  },
  biometricButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
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

export default DataBundlesScreen;