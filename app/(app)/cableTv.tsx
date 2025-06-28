import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  StyleSheet,
  TextInput,
  Alert,
  Animated,
  PanResponder,
  Modal,
  Dimensions,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/config/supabase';
import * as SecureStore from 'expo-secure-store';

// Get screen dimensions for responsive design
const { width, height } = Dimensions.get('window');
const scaleFont = (size: number) => (width / 375) * size;
const scaleSize = (size: number) => (width / 375) * size;

// Define interfaces
interface Provider {
  id: number;
  name: string;
  image: string;
  code: string;
  apiDiscount: number;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  duration: string;
}

interface TransactionResult {
  id: string;
  provider: string;
  data: string;
  price: string;
  date: string;
  status: string;
  smartCardNumber: string;
  reference: string;
  metadata: string;
}

// Cable TV providers (static)
const PROVIDER_IMAGES: { [key: string]: string } = {
	DSTV: "https://cdn.brandfetch.io/idBvCNxfgy/w/800/h/494/theme/dark/logo.webp?c=1bxideym1bCk82mxFsjUw",
	GOTV: "https://cdn.brandfetch.io/idWUs_RbuC/w/820/h/154/theme/dark/logo.png?c=1bxideym1bCk82mxFsjUw",
	STARTIMES:
		"https://cdn.brandfetch.io/idcUkVgdCp/w/225/h/225/theme/dark/icon.jpeg?c=1bxideym1bCk82mxFsjUw",
};

const PROVIDER_CONFIG: { [key: string]: { code: string; apiDiscount: number } } = {
  DSTV: { code: 'dstv', apiDiscount: 97 },
  GOTV: { code: 'gotv', apiDiscount: 96 },
  STARTIMES: { code: 'startimes', apiDiscount: 96 },
};

const PROVIDERS: Provider[] = [
  {
    id: 1,
    name: 'DSTV',
    image: PROVIDER_IMAGES.DSTV,
    code: PROVIDER_CONFIG.DSTV.code,
    apiDiscount: PROVIDER_CONFIG.DSTV.apiDiscount,
  },
  {
    id: 2,
    name: 'GOTV',
    image: PROVIDER_IMAGES.GOTV,
    code: PROVIDER_CONFIG.GOTV.code,
    apiDiscount: PROVIDER_CONFIG.GOTV.apiDiscount,
  },
  {
    id: 3,
    name: 'STARTIMES',
    image: PROVIDER_IMAGES.STARTIMES,
    code: PROVIDER_CONFIG.STARTIMES.code,
    apiDiscount: PROVIDER_CONFIG.STARTIMES.apiDiscount,
  },
];

// Function to extract duration from plan name
const extractDuration = (packageName: string): string => {
  if (/1\s*Day/i.test(packageName)) return '1 Day';
  if (/1\s*Week/i.test(packageName)) return '1 Week';
  if (/monthly|1\s*Month/i.test(packageName)) return '1 Month';
  return '1 Month'; // Default
};

// Function to clean plan name by removing price
const cleanPlanName = (name: string): string => {
  return name.replace(/\s*\d+(?:,\d+)*\s*$/, '').trim();
};

const CableTV: React.FC = () => {
 
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [smartCardNumber, setSmartCardNumber] = useState<string>('');
  const [isSmartCardValid, setIsSmartCardValid] = useState<boolean>(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [discountedPrice, setDiscountedPrice] = useState<number | null>(null);
  const [transactionPin, setTransactionPin] = useState<string>('');
  const [balance, setBalance] = useState<number>(0);
  const [userEmail, setUserEmail] = useState<string>('');
  const [referenceId, setReferenceId] = useState<string>('');
  const [transactionModalVisible, setTransactionModalVisible] = useState<boolean>(false);
  const [transactionStatus, setTransactionStatus] = useState<'processing' | 'success' | 'failed'>('processing');
  const [transactionResult, setTransactionResult] = useState<TransactionResult | null>(null);
  const [plans, setPlans] = useState<{ [key: string]: SubscriptionPlan[] }>({ DSTV: [], GOTV: [], STARTIMES: [] });
  const [loadingPlans, setLoadingPlans] = useState<boolean>(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Animation for slide to pay
  const slideAnim = useRef(new Animated.Value(0)).current;
  const slideWidth = width - scaleSize(24); // Full width minus padding
  const maxSlideDistance = slideWidth * 0.6; // Slide 60% of the width

  // Animation for screen fade-in
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Pulse animation for slide to pay text
  const slidePulseAnim = useRef(new Animated.Value(0.7)).current;

  // Pulse animations for plan cards (odd indices)
  const pulseAnims = useRef<Animated.Value[]>([]).current;

  // Check if slide to pay should be enabled
  const isSlideEnabled = selectedProvider && isSmartCardValid && selectedPlan && transactionPin.length >= 4 && transactionPin.length <= 6;

  // Pan responder for slide to pay
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isSlideEnabled,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx >= 0 && gestureState.dx <= maxSlideDistance) {
          slideAnim.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > maxSlideDistance * 0.5 && isSlideEnabled) {
          handlePurchase();
        }
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  // Screen fade-in animation
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  // Slide to pay pulse animation
  useEffect(() => {
    if (isSlideEnabled) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(slidePulseAnim, {
            toValue: 1,
            duration: 750,
            useNativeDriver: true,
          }),
          Animated.timing(slidePulseAnim, {
            toValue: 0.7,
            duration: 750,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      slidePulseAnim.setValue(0.7);
    }
  }, [isSlideEnabled]);

  // Handle keyboard visibility
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user || !user.email) {
          throw new Error('User not authenticated');
        }
        setUserEmail(user.email);

        const { data: wallet, error: walletError } = await supabase
          .from('wallet')
          .select('balance')
          .eq('user_email', user.email)
          .single();

        if (walletError && walletError.code !== 'PGRST116') {
          throw walletError;
        }
        setBalance(wallet?.balance || 0);

        const newReferenceId = `EBENKDATA_CABLE_${user.id}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        setReferenceId(newReferenceId);
      } catch (error) {
        console.error('Error fetching user data:', error);
        Alert.alert('Error', 'Failed to load user data');
      }
    };
    fetchUserData();
  }, []);

  // Fetch subscription plans when provider is selected
  useEffect(() => {
    const fetchPlans = async () => {
      if (!selectedProvider) return;
      setLoadingPlans(true);
      try {
        const response = await fetch('https://ebenkdata.com/api/cable/', {
          headers: {
            Authorization: 'Token de883370902cf73e68ed63f566dbf38a38719f03',
          },
        });
        const data = await response.json();

        const mappedPlans: { [key: string]: SubscriptionPlan[] } = {
          DSTV: [],
          GOTV: [],
          STARTIMES: [],
        };

        // Map DSTV plans
        if (data.DSTVPLAN) {
          mappedPlans.DSTV = data.DSTVPLAN.map((plan: any) => ({
            id: plan.cableplan_id,
            name: plan.package,
            price: parseFloat(plan.plan_amount),
            duration: extractDuration(plan.package),
          }));
        }

        // Map GOTV plans
        if (data.GOTVPLAN) {
          mappedPlans.GOTV = data.GOTVPLAN.map((plan: any) => ({
            id: plan.cableplan_id,
            name: plan.package,
            price: parseFloat(plan.plan_amount),
            duration: extractDuration(plan.package),
          }));
        }

        // Map STARTIMES plans
        if (data.STARTIME) {
          mappedPlans.STARTIMES = data.STARTIME.map((plan: any) => ({
            id: plan.cableplan_id,
            name: plan.package,
            price: parseFloat(plan.plan_amount),
            duration: extractDuration(plan.package),
          }));
        }

        setPlans(mappedPlans);

        // Initialize pulse animations for odd-indexed plans
        pulseAnims.length = 0;
        mappedPlans[selectedProvider.name].forEach((_, index) => {
          if (index % 2 === 0) {
            const anim = new Animated.Value(1);
            pulseAnims[index] = anim;
            Animated.loop(
              Animated.sequence([
                Animated.timing(anim, {
                  toValue: 1.05,
                  duration: 1000,
                  useNativeDriver: true,
                }),
                Animated.timing(anim, {
                  toValue: 1,
                  duration: 1000,
                  useNativeDriver: true,
                }),
              ])
            ).start();
          }
        });
      } catch (error) {
        console.error('Error fetching plans:', error);
        Alert.alert('Error', 'Failed to load subscription plans');
      } finally {
        setLoadingPlans(false);
      }
    };
    fetchPlans();
  }, [selectedProvider]);

  // Validate smart card number
  const validateSmartCardNumber = (card: string, provider: Provider | null): boolean => {
    if (!card || card.length !== 10 || !/^\d{10}$/.test(card)) {
      return false;
    }
    if (!provider) {
      return false;
    }
    switch (provider.name) {
      case 'DSTV':
        return card.startsWith('4');
      case 'GOTV':
        return card.startsWith('2');
      case 'STARTIMES':
        return card.startsWith('0');
      default:
        return false;
    }
  };

  // Update smart card validity
  useEffect(() => {
    setIsSmartCardValid(validateSmartCardNumber(smartCardNumber, selectedProvider));
  }, [smartCardNumber, selectedProvider]);

  // Handle provider selection
  const handleSelectProvider = (provider: Provider) => {
    setSelectedProvider(provider);
    setSelectedPlan(null);
    setDiscountedPrice(null);
    setSmartCardNumber('');
    setIsSmartCardValid(false);
  };

  // Handle plan selection
  const selectPlan = (plan: SubscriptionPlan) => {
    if (selectedPlan?.id === plan.id) {
      setSelectedPlan(null);
      setDiscountedPrice(null);
    } else {
      setSelectedPlan(plan);
      const sellingPrice = plan.price * 0.998; // 0.2% discount for user
      setDiscountedPrice(sellingPrice);
    }
  };

  // Calculate API cost and profit
  const calculateApiCostAndProfit = (amount: number, provider: Provider): { apiCost: number; profit: number } => {
    const apiCost = (amount * provider.apiDiscount) / 100;
    const sellingPrice = discountedPrice || amount * 0.998; // 0.2% discount
    const profit = sellingPrice - apiCost; // Includes 0.6% + wallet funding
    return { apiCost, profit };
  };

  // Create Paystack transfer recipient
  const createRecipient = async (): Promise<string> => {
    const secretKey = await SecureStore.getItemAsync('PAYSTACK_SECRET_KEY');
    if (!secretKey) {
      throw new Error('Paystack secret key not found');
    }
    const response = await fetch('https://api.paystack.co/transferrecipient', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'nuban',
        name: 'Your Business Name',
        account_number: '0001234567',
        bank_code: '058',
        currency: 'NGN',
      }),
    });
    const data = await response.json();
    if (!data.status || !data.data || !data.data.recipient_code) {
      throw new Error('Failed to create Paystack recipient');
    }
    return data.data.recipient_code;
  };

  // Initiate Paystack transfer
  const initiateTransfer = async (recipientCode: string, amount: number): Promise<boolean> => {
    const secretKey = await SecureStore.getItemAsync('PAYSTACK_SECRET_KEY');
    if (!secretKey) {
      throw new Error('Paystack secret key not found');
    }
    const response = await fetch('https://api.paystack.co/transfer', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'balance',
        amount: Math.round(amount * 100),
        recipient: recipientCode,
        reason: 'Cable TV Subscription Profit',
      }),
    });
    const data = await response.json();
    return data.status === 'success';
  };

  // Deposit profit to Paystack
  const depositProfitToPaystack = async (profit: number) => {
    try {
      const recipientCode = await createRecipient();
      const transferSuccess = await initiateTransfer(recipientCode, profit);
      if (transferSuccess) {
        console.log(`Successfully deposited ₦${profit} to Paystack`);
      }
      return transferSuccess;
    } catch (error) {
      console.error('Paystack deposit error:', error);
      return false;
    }
  };

  // Reset form after successful transaction
  const resetForm = () => {
    setSelectedProvider(null);
    setSmartCardNumber('');
    setIsSmartCardValid(false);
    setSelectedPlan(null);
    setDiscountedPrice(null);
    setTransactionPin('');
    setReferenceId(`EBENKDATA_CABLE_${Date.now()}_${Math.floor(Math.random() * 10000)}`);
  };

  // Handle purchase
  const handlePurchase = async () => {
    if (!selectedProvider) {
      Alert.alert('Error', 'Please select a provider.');
      setTransactionModalVisible(true);
      setTransactionStatus('failed');
      return;
    }
    if (!isSmartCardValid) {
      Alert.alert('Error', 'Please enter a valid 10-digit smart card number for the selected provider.');
      setTransactionModalVisible(true);
      setTransactionStatus('failed');
      return;
    }
    if (!selectedPlan) {
      Alert.alert('Error', 'Please select a subscription plan.');
      setTransactionModalVisible(true);
      setTransactionStatus('failed');
      return;
    }
    if (!transactionPin || transactionPin.length < 4 || transactionPin.length > 6) {
      Alert.alert('Error', 'Please enter a valid transaction PIN (4-6 digits).');
      setTransactionModalVisible(true);
      setTransactionStatus('failed');
      return;
    }
    if (balance < (discountedPrice || selectedPlan.price)) {
      Alert.alert('Error', 'Insufficient balance. Please fund your wallet.');
      setTransactionModalVisible(true);
      setTransactionStatus('failed');
      return;
    }

    // Verify transaction PIN
    try {
      const { data: userData, error: pinError } = await supabase
        .from('users')
        .select('transaction_pin')
        .eq('email', userEmail)
        .single();

      if (pinError || !userData || userData.transaction_pin !== transactionPin) {
        Alert.alert('Error', 'Invalid transaction PIN');
        setTransactionStatus('failed');
        setTransactionModalVisible(true);
        return;
      }
    } catch (error) {
      console.error('PIN verification error:', error);
      Alert.alert('Error', 'Failed to verify transaction PIN');
      setTransactionStatus('failed');
      setTransactionModalVisible(true);
      return;
    }

    setTransactionModalVisible(true);
    setTransactionStatus('processing');

    try {
      const { apiCost, profit } = calculateApiCostAndProfit(selectedPlan.price, selectedProvider);

      const transactionData = {
        user_email: userEmail,
        amount: -(discountedPrice || selectedPlan.price),
        reference: referenceId,
        status: 'pending',
        metadata: {
          purchase: `Cable TV ${selectedPlan.name} on ${selectedProvider.name}`,
          smart_card_number: smartCardNumber,
          validity: selectedPlan.duration,
          type: 'cable_tv',
          actual_cost: discountedPrice || selectedPlan.price,
          api_cost: apiCost,
          profit: profit,
          custom_fields: [
            {
              display_name: 'Cable TV Payment',
              variable_name: 'cable_tv_payment',
              value: 'Ebenkdata',
            },
          ],
        },
      };

      const { data: pendingTx, error: pendingTxError } = await supabase
        .from('transactions')
        .insert(transactionData)
        .select('id, created_at')
        .single();

      if (pendingTxError) {
        throw new Error('Failed to record pending transaction');
      }

      const apiUrl = 'https://ebenkdata.com/api/cable/subscribe/';
      const requestBody = {
        provider: selectedProvider.code,
        plan_id: selectedPlan.id,
        smart_card_number: smartCardNumber,
      };

      const purchaseResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Token de883370902cf73e68ed63f566dbf38a38719f03',
        },
        body: JSON.stringify(requestBody),
      });

      if (purchaseResponse.status !== 200) {
        await supabase
          .from('transactions')
          .update({ status: 'failed' })
          .eq('id', pendingTx.id);
        setTransactionStatus('failed');
        setTransactionResult({
          id: pendingTx.id,
          provider: selectedProvider.name,
          data: `Cable TV ${selectedPlan.name}`,
          price: (discountedPrice || selectedPlan.price).toString(),
          date: new Date().toISOString(),
          status: 'Failed',
          smartCardNumber,
          reference: referenceId,
          metadata: JSON.stringify({
            validity: selectedPlan.duration,
            payment_method: 'Wallet',
            type: 'cable_tv',
            actual_cost: discountedPrice || selectedPlan.price,
            api_cost: apiCost,
            profit: profit,
          }),
        });
        Alert.alert('Error', 'Cable TV subscription failed. Please try again.');
        return;
      }

      const depositSuccess = await depositProfitToPaystack(profit);
      if (!depositSuccess) {
        await supabase
          .from('transactions')
          .update({ status: 'failed' })
          .eq('id', pendingTx.id);
        setTransactionStatus('failed');
        setTransactionResult({
          id: pendingTx.id,
          provider: selectedProvider.name,
          data: `Cable TV ${selectedPlan.name}`,
          price: (discountedPrice || selectedPlan.price).toString(),
          date: new Date().toISOString(),
          status: 'Failed',
          smartCardNumber,
          reference: referenceId,
          metadata: JSON.stringify({
            validity: selectedPlan.duration,
            payment_method: 'Wallet',
            type: 'cable_tv',
            actual_cost: discountedPrice || selectedPlan.price,
            api_cost: apiCost,
            profit: profit,
          }),
        });
        Alert.alert('Error', 'Failed to deposit profit to Paystack.');
        return;
      }

      const newBalance = balance - (discountedPrice || selectedPlan.price);
      const { error: walletUpdateError } = await supabase
        .from('wallet')
        .update({ balance: newBalance })
        .eq('user_email', userEmail);

      if (walletUpdateError) {
        await supabase
          .from('transactions')
          .update({ status: 'failed' })
          .eq('id', pendingTx.id);
        throw new Error('Failed to update wallet balance');
      }

      const { error: successUpdateError } = await supabase
        .from('transactions')
        .update({ status: 'success' })
        .eq('id', pendingTx.id);

      if (successUpdateError) {
        throw new Error('Failed to update transaction status');
      }

      setBalance(newBalance);
      setTransactionStatus('success');
      setTransactionResult({
        id: pendingTx.id,
        provider: selectedProvider.name,
        data: `Cable TV ${selectedPlan.name}`,
        price: (discountedPrice || selectedPlan.price).toString(),
        date: new Date().toISOString(),
        status: 'Success',
        smartCardNumber,
        reference: referenceId,
        metadata: JSON.stringify({
          validity: selectedPlan.duration,
          payment_method: 'Wallet',
          type: 'cable_tv',
          actual_cost: discountedPrice || selectedPlan.price,
          api_cost: apiCost,
          profit: profit,
        }),
      });
      resetForm();
    } catch (error) {
      console.error('Purchase error:', error);
      setTransactionStatus('failed');
      setTransactionResult({
        id: 'N/A',
        provider: selectedProvider?.name || 'Unknown',
        data: `Cable TV ${selectedPlan?.name || 'Unknown'}`,
        price: (discountedPrice || selectedPlan?.price || 0).toString(),
        date: new Date().toISOString(),
        status: 'Failed',
        smartCardNumber,
        reference: referenceId,
        metadata: JSON.stringify({
          validity: selectedPlan?.duration || 'N/A',
          payment_method: 'Wallet',
          type: 'cable_tv',
          actual_cost: discountedPrice || selectedPlan?.price || 0,
          api_cost: 0,
          profit: 0,
        }),
      });
      Alert.alert('Error', 'Failed to process payment. Please try again.');
    }
  };

  // Close transaction modal
  const closeTransactionModal = () => {
    setTransactionModalVisible(false);
    setTransactionResult(null);
  };

  // Format number with commas
  const formatNumberWithCommas = (number: number | null): string => {
    if (number === null) return '0';
    return number.toLocaleString();
  };

  // Handle back navigation
  const handleBack = () => {
    router.back();
  };

  return (
    <Animated.View style={[styles.rootContainer, { opacity: fadeAnim }]}>
      {/* <StatusBar barStyle="light-content" backgroundColor="#000000" /> */}
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? scaleSize(100) : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollContainer}
          contentContainerStyle={[styles.innerContainer, { paddingBottom: keyboardHeight + scaleSize(20) }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* <View style={styles.headerContainer}>
            <Pressable onPress={handleBack} style={styles.backButton}>
              <Text style={styles.backArrow}>←</Text>
            </Pressable>
            <View>
              <Text style={styles.selectProviderTitle}>Cable TV Subscription 📺</Text>
              <View style={styles.headerUnderline} />
            </View>
          </View> */}

          {/* Provider List */}
          <Text style={[styles.sectionTitle, { marginTop: scaleSize(12) }]}>Select Cable TV Provider</Text>
          <View style={styles.providerScroll}>
            {PROVIDERS.map((provider) => (
              <Pressable
                key={provider.id}
                onPress={() => handleSelectProvider(provider)}
                style={[
                  styles.providerCard,
                  selectedProvider?.id === provider.id && styles.providerCardSelected,
                ]}
              >
                <View style={styles.providerLogoContainer}>
                  <Image
                    source={{ uri: provider.image }}
                    style={styles.providerLogo}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.providerName}>{provider.name}</Text>
              </Pressable>
            ))}
          </View>

          {/* Smart Card Number Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Smart Card Number</Text>
            <TextInput
              style={[
                styles.input,
                smartCardNumber && isSmartCardValid && styles.inputValid,
                smartCardNumber && !isSmartCardValid && styles.inputInvalid,
              ]}
              value={smartCardNumber}
              onChangeText={setSmartCardNumber}
              placeholder="Enter 10-digit smart card number"
              placeholderTextColor="#B0B0B0"
              keyboardType="numeric"
              maxLength={10}
            />
          </View>

          {/* Subscription Plans */}
          {selectedProvider && (
            <>
              <Text style={styles.sectionTitle}>Select Subscription Plan</Text>
              {loadingPlans ? (
                <Text style={styles.loadingText}>Loading plans...</Text>
              ) : plans[selectedProvider.name]?.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.planScroll}
                >
                  {plans[selectedProvider.name].map((plan, index) => (
                    <Animated.View
                      key={plan.id}
                      style={[
                        styles.amountButton,
                        selectedPlan?.id === plan.id && styles.amountButtonSelected,
                        index % 2 === 0 && !selectedPlan && { transform: [{ scale: pulseAnims[index] || 1 }] },
                      ]}
                    >
                      <Pressable onPress={() => selectPlan(plan)}>
                        <Text
                          style={[styles.amountText, selectedPlan?.id === plan.id && styles.amountTextSelected]}
                          numberOfLines={2}
                          ellipsizeMode="tail"
                        >
                          {cleanPlanName(plan.name)}
                        </Text>
                        <Text
                          style={[styles.amountPrice, selectedPlan?.id === plan.id && styles.amountTextSelected]}
                        >
                          ₦{plan.price.toLocaleString()}
                        </Text>
                        <Text style={styles.planDuration}>{plan.duration}</Text>
                      </Pressable>
                    </Animated.View>
                  ))}
                </ScrollView>
              ) : (
                <Text style={styles.noPlansText}>No plans available for this provider.</Text>
              )}
            </>
          )}

          {/* Amount to Pay */}
          <View style={styles.discountBar}>
            <Text style={styles.discountLabel}>Amount to Pay</Text>
            <Text style={styles.discountValue}>
              ₦{formatNumberWithCommas(discountedPrice)}
            </Text>
          </View>

          {/* Transaction PIN Input */}
          <View style={styles.transactionPinContainer}>
            <Text style={styles.transactionPinLabel}>Transaction PIN</Text>
            <TextInput
              style={[styles.input, styles.transactionPinInput, transactionPin && styles.inputValid]}
              value={transactionPin}
              onChangeText={setTransactionPin}
              placeholder="Enter 4-6 digit PIN"
              placeholderTextColor="#B0B0B0"
              keyboardType="numeric"
              maxLength={6}
              secureTextEntry
            />
          </View>

          {/* Slide to Pay */}
          <Animated.View
            style={[
              styles.slideTextWrapper,
              { opacity: isSlideEnabled ? slidePulseAnim : 0.7 },
              { transform: [{ translateX: slideAnim }] },
            ]}
            {...panResponder.panHandlers}
          >
            <Text style={[styles.slideText, isSlideEnabled && styles.slideTextEnabled]}>
              Slide to Pay
            </Text>
            <Text style={[styles.arrow, isSlideEnabled && styles.slideTextEnabled]}>→</Text>
          </Animated.View>

          {/* Footer */}
          <View style={styles.footerContainer}>
            <Text style={styles.footerTitle}>Customer Care</Text>
            <Text style={styles.footerText}>
              Contact DSTV/GOtv customer care on 01-2703232, 08039003788, or toll-free lines: 08149860333, 07080630333, 09090630333.
            </Text>
            <Text style={styles.footerText}>
              Contact STARTIMES customer care on 094618888, 014618888.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Transaction Status Modal */}
      <Modal
        visible={transactionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeTransactionModal}
      >
        <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
          <View style={styles.modalContainer}>
            {transactionStatus === 'processing' ? (
              <>
                <Text style={styles.modalTitle}>Processing Transaction</Text>
                <Text style={styles.modalMessage}>Please wait while we process your payment...</Text>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>
                  Transaction {transactionStatus === 'success' ? 'Successful' : 'Failed'}
                </Text>
                {transactionResult && (
                  <View style={styles.transactionDetails}>
                    <Text style={styles.detailText}>Provider: {transactionResult.provider}</Text>
                    <Text style={styles.detailText}>Plan: {transactionResult.data}</Text>
                    <Text style={styles.detailText}>Price: ₦{transactionResult.price}</Text>
                    <Text style={styles.detailText}>Smart Card Number: {transactionResult.smartCardNumber}</Text>
                    <Text style={styles.detailText}>Reference: {transactionResult.reference}</Text>
                    <Text style={styles.detailText}>Date: {new Date(transactionResult.date).toLocaleString()}</Text>
                    <Text style={styles.detailText}>Status: {transactionResult.status}</Text>
                  </View>
                )}
                <Pressable
                  style={styles.closeButton}
                  onPress={closeTransactionModal}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </Pressable>
              </>
            )}
          </View>
        </Animated.View>
      </Modal>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  innerContainer: {
    // paddingTop: scaleSize(60),
    paddingHorizontal: scaleSize(16),
    flexGrow: 1,
    backgroundColor: '#000000',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scaleSize(24),
  },
  selectProviderTitle: {
    fontSize: scaleFont(20),
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  headerUnderline: {
    height: scaleSize(2),
    backgroundColor: '#FFD700',
    width: scaleSize(100),
    marginTop: scaleSize(4),
  },
  backButton: {
    padding: scaleSize(8),
    marginRight: scaleSize(8),
  },
  backArrow: {
    fontSize: scaleFont(20),
    color: '#FFD700',
  },
  sectionTitle: {
    fontSize: scaleFont(18),
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: scaleSize(12),
  },
  providerScroll: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: scaleSize(16),
  },
  providerCard: {
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: scaleSize(12),
    padding: scaleSize(8),
    width: scaleSize(80),
    height: scaleSize(80),
    marginBottom: scaleSize(12),
    justifyContent: 'center',
    shadowColor: '#d7a77f',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
    elevation: 4,
  },
  providerCardSelected: {
    borderColor: '#D7A77F',
    borderWidth: 2,
    backgroundColor: '#2A2A2C',
    transform: [{ scale: 1.05 }],
  },
  providerLogoContainer: {
    width: scaleSize(40),
    height: scaleSize(40),
    borderRadius: scaleSize(20),
    borderColor: '#D7A77F',
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginBottom: scaleSize(4),
  },
  providerLogo: {
    width: scaleSize(32),
    height: scaleSize(32),
  },
  providerName: {
    fontSize: scaleFont(10),
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: scaleSize(32),
  },
  inputLabel: {
    fontSize: scaleFont(14),
    fontWeight: '500',
    color: '#B0B0B0',
    marginBottom: scaleSize(8),
  },
  input: {
    backgroundColor: '#1C1C1E',
    borderRadius: scaleSize(8),
    padding: scaleSize(12),
    fontSize: scaleFont(14),
    color: '#FFFFFF',
    width: '100%',
    borderColor: '#2A2A2C',
    borderWidth: 1,
  },
  inputValid: {
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  inputInvalid: {
    borderColor: '#FF0000',
    shadowColor: '#FF0000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  transactionPinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scaleSize(24),
  },
  transactionPinLabel: {
    fontSize: scaleFont(14),
    fontWeight: '500',
    color: '#B0B0B0',
  },
  transactionPinInput: {
    width: scaleSize(140),
    padding: scaleSize(8),
  },
  planScroll: {
    paddingVertical: scaleSize(8),
    paddingRight: scaleSize(16),
    marginBottom: scaleSize(24),
  },
  amountButton: {
    backgroundColor: '#1C1C1E',
    borderRadius: scaleSize(10),
    paddingVertical: scaleSize(10),
    paddingHorizontal: scaleSize(12),
    marginRight: scaleSize(12),
    width: scaleSize(120),
    height: scaleSize(65),
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#D7A77F',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    justifyContent: 'center',
  },
  amountButtonSelected: {
    borderColor: '#FFD700',
    backgroundColor: '#2A2A2C',
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  amountText: {
    fontSize: scaleFont(11),
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: scaleFont(13),
    numberOfLines: 2,
    ellipsizeMode: 'tail',
  },
  amountPrice: {
    fontSize: scaleFont(12),
    fontWeight: '700',
    color: '#D7A77F',
    marginVertical: scaleSize(2),
    textAlign: 'center',
  },
  amountTextSelected: {
    color: '#FFD700',
  },
  planDuration: {
    fontSize: scaleFont(9),
    fontWeight: '500',
    color: '#B0B0B0',
    lineHeight: scaleFont(11),
    textAlign: 'center',
  },
  loadingText: {
    fontSize: scaleFont(14),
    fontWeight: '500',
    color: '#B0B0B0',
    textAlign: 'center',
    marginVertical: scaleSize(16),
  },
  noPlansText: {
    fontSize: scaleFont(14),
    fontWeight: '500',
    color: '#B0B0B0',
    textAlign: 'center',
    marginVertical: scaleSize(16),
  },
  discountBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#1C1C1E',
    borderRadius: scaleSize(8),
    padding: scaleSize(16),
    marginBottom: scaleSize(24),
    borderColor: '#DAA520',
    borderWidth: 1,
  },
  discountLabel: {
    fontSize: scaleFont(14),
    fontWeight: '500',
    color: '#B0B0B0',
  },
  discountValue: {
    fontSize: scaleFont(14),
    fontWeight: '700',
    color: '#FFD700',
  },
  slideTextWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: scaleSize(12),
    marginBottom: scaleSize(32),
  },
  slideText: {
    fontSize: scaleFont(16),
    fontWeight: '700',
    color: '#B0B0B0',
  },
  slideTextEnabled: {
    color: '#FFD700',
  },
  arrow: {
    fontSize: scaleFont(20),
    color: '#B0B0B0',
    marginLeft: scaleSize(8),
  },
  footerContainer: {
    marginTop: scaleSize(32),
    opacity: 0.29,
  },
  footerTitle: {
    fontSize: scaleFont(16),
    fontWeight: '700',
    color: '#FFD700',
    marginBottom: scaleSize(8),
  },
  footerText: {
    fontSize: scaleFont(12),
    fontWeight: '500',
    color: '#B0B0B0',
    marginBottom: scaleSize(6),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#1C1C1E',
    borderRadius: scaleSize(12),
    padding: scaleSize(20),
    width: '90%',
    maxHeight: height * 0.8,
    borderColor: '#DAA520',
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: scaleFont(20),
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: scaleSize(16),
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: scaleFont(14),
    fontWeight: '500',
    color: '#B0B0B0',
    textAlign: 'center',
    marginBottom: scaleSize(20),
  },
  transactionDetails: {
    marginBottom: scaleSize(20),
  },
  detailText: {
    fontSize: scaleFont(12),
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: scaleSize(8),
  },
  closeButton: {
    backgroundColor: '#FFD700',
    borderRadius: scaleSize(8),
    paddingVertical: scaleSize(12),
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: scaleFont(16),
    fontWeight: '700',
    color: '#000000',
  },
});

export default CableTV;