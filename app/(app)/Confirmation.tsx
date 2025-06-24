import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Alert, Animated, PanResponder, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/config/supabase';
import TransactionStatusModal from '@/components/homescreen/TransactionStatusModal';
import PurchaseDetails from '@/components/confirmation/PurchaseDetails';
import ErrorModal from '@/components/confirmation/ErrorModal';

// Define constants
const THIRTY_DAYS_IN_MS = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

// Generate or retrieve Lizzysub token
const getLizzysubToken = async (userEmail: string): Promise<string> => {
  const username = process.env.EXPO_PUBLIC_LIZZYSUB_USERNAME;
  const password = process.env.EXPO_PUBLIC_LIZZYSUB_PASSWORD;

  if (!username || !password) {
    console.error('Lizzysub credentials missing. Check EXPO_PUBLIC_LIZZYSUB_USERNAME and EXPO_PUBLIC_LIZZYSUB_PASSWORD environment variables.');
    throw new Error('Lizzysub credentials are not configured.');
  }

  // Check if a valid token exists in Supabase
  const { data: tokenData, error: tokenError } = await supabase
    .from('user_tokens')
    .select('lizzysub_token, created_at, expires_at, is_valid')
    .eq('user_email', userEmail)
    .eq('is_valid', true)
    .single();

  if (tokenError && tokenError.code !== 'PGRST116') {
    console.error('Error fetching Lizzysub token:', tokenError);
    throw new Error(`Failed to fetch Lizzysub token: ${tokenError.message}`);
  }

  const now = new Date();
  if (tokenData && tokenData.is_valid && tokenData.lizzysub_token) {
    const createdAt = new Date(tokenData.created_at);
    const expiresAt = tokenData.expires_at ? new Date(tokenData.expires_at) : null;

    // Check if token is still valid (within 30 days)
    if (
      now.getTime() - createdAt.getTime() < THIRTY_DAYS_IN_MS &&
      (!expiresAt || now < expiresAt)
    ) {
      console.log('Using cached Lizzysub token:', `Token ${tokenData.lizzysub_token.slice(0, 4)}...${tokenData.lizzysub_token.slice(-4)}`);
      return tokenData.lizzysub_token;
    }
  }

  // Generate a new token via Lizzysub API using Basic Authentication
  try {
    const credentials = `${username}:${password}`;
    const base64Credentials = Buffer.from(credentials).toString('base64');

    const response = await fetch('https://lizzysub.com/api/user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${base64Credentials}`,
      },
    });

    const responseData = await response.json();
    if (!response.ok || responseData.status !== 'success') {
      throw new Error(`Failed to generate Lizzysub token: ${responseData.message || 'Unknown error'}`);
    }

    const newToken = responseData.AccessToken;
    const expiresAt = new Date(now.getTime() + THIRTY_DAYS_IN_MS);

    // Store the new token in Supabase
    const { error: upsertError } = await supabase
      .from('user_tokens')
      .upsert({
        user_email: userEmail,
        lizzysub_token: newToken,
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        is_valid: true,
      });

    if (upsertError) {
      throw new Error(`Failed to store Lizzysub token: ${upsertError.message}`);
    }

    console.log('Generated and stored new Lizzysub token:', `Token ${newToken.slice(0, 4)}...${newToken.slice(-4)}`);
    return newToken;
  } catch (error: any) {
    console.error('Error generating Lizzysub token:', error);
    throw new Error(`Failed to generate Lizzysub token: ${error.message}`);
  }
};

// Invalidate Lizzysub token on logout or session expiry
const invalidateToken = async (userEmail: string): Promise<void> => {
  const { error } = await supabase
    .from('user_tokens')
    .update({ is_valid: false })
    .eq('user_email', userEmail);

  if (error) {
    console.error('Error invalidating Lizzysub token:', error);
    throw new Error(`Failed to invalidate Lizzysub token: ${error.message}`);
  }
  console.log('Lizzysub token invalidated for user:', userEmail);
};

// Define interfaces
interface DataBundle {
  id: number;
  data: string;
  price: number;
  validity: string;
  category: string;
  description?: string;
  planType: string;
}

interface Bundle {
  id: number;
  variation_code?: string;
  description?: string;
  amount?: number | null;
  name?: string;
  data?: string;
  price: number;
  validity?: string;
  category?: string;
  planType?: string;
}

interface Provider {
  id: number;
  name: string;
  image?: string;
  code: string;
  imageKey?: string;
}

const ConfirmationScreen: React.FC = () => {
  const {
    bundle,
    provider,
    phoneNumber,
    transactionPin,
    userEmail,
    referenceId,
    balance,
    networkId,
    planId,
  } = useLocalSearchParams<{
    bundle: string;
    provider: string;
    phoneNumber: string;
    transactionPin: string;
    userEmail: string;
    referenceId: string;
    balance: string;
    networkId: string;
    planId: string;
  }>();

  const [selectedBundle, setSelectedBundle] = useState<Bundle>(JSON.parse(bundle));
  const [selectedProvider, setSelectedProvider] = useState<Provider>(JSON.parse(provider));
  const [parsedNetworkId, setParsedNetworkId] = useState<number>(parseInt(networkId, 10));
  const [parsedPlanId, setParsedPlanId] = useState<number>(parseInt(planId, 10));
  const [balanceValue, setBalanceValue] = useState<number>(parseFloat(balance));
  const [editableMobileNumber, setEditableMobileNumber] = useState<string>(phoneNumber);
  const [isEditingMobile, setIsEditingMobile] = useState<boolean>(false);
  const [networkProvider, setNetworkProvider] = useState<string>(selectedProvider.name);
  const [transactionModalVisible, setTransactionModalVisible] = useState<boolean>(false);
  const [transactionStatus, setTransactionStatus] = useState<'processing' | 'success' | 'failed'>('processing');
  const [isBalanceLoading, setIsBalanceLoading] = useState<boolean>(true);
  const [errorModalVisible, setErrorModalVisible] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>('User');
  const [timeLeft, setTimeLeft] = useState<number>(4 * 60 * 60); // 4 hours in seconds

  const slideAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseNetworkAnim = useRef(new Animated.Value(1)).current;

  // Synchronize parsedNetworkId with selectedBundle.planType for Hot plans
  useEffect(() => {
    if (selectedBundle.category === 'Hot' && selectedBundle.planType) {
      const networkIds: { [key: string]: number } = {
        MTN: 1,
        GLO: 3,
        '9MOBILE': 4,
        AIRTEL: 2,
      };
      const expectedNetworkId = networkIds[selectedBundle.planType];
      if (expectedNetworkId && parsedNetworkId !== expectedNetworkId) {
        console.log('Synchronizing networkId:', {
          currentNetworkId: parsedNetworkId,
          expectedNetworkId,
          planType: selectedBundle.planType,
          bundleId: selectedBundle.id,
        });
        setParsedNetworkId(expectedNetworkId);
        setNetworkProvider(selectedBundle.planType);
        setSelectedProvider({ ...selectedProvider, name: selectedBundle.planType, id: expectedNetworkId });
      }
    }
  }, [selectedBundle, parsedNetworkId, selectedProvider]);

  // Fetch user name
  useEffect(() => {
    const fetchUserName = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('username')
          .eq('email', userEmail)
          .single();

        if (error) {
          console.error('Error fetching user name:', error);
        } else if (data?.username) {
          setUserName(data.username);
        }
      } catch (err) {
        console.error('Error in fetchUserName:', err);
      }
    };

    if (userEmail) {
      fetchUserName();
    }
  }, [userEmail]);

  // Timer for error modal
  useEffect(() => {
    if (errorModalVisible && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [errorModalVisible, timeLeft]);

  // Log initial parameters
  useEffect(() => {
    console.log('Received navigation params:', {
      bundle: selectedBundle,
      provider: selectedProvider,
      phoneNumber,
      transactionPin: '****',
      userEmail,
      referenceId,
      balance: balanceValue,
      networkId: parsedNetworkId,
      planId: parsedPlanId,
    });
  }, [selectedBundle, selectedProvider, phoneNumber, transactionPin, userEmail, referenceId, balanceValue, parsedNetworkId, parsedPlanId]);

  // Fetch wallet balance and set up real-time subscription
  useEffect(() => {
    if (!userEmail) {
      console.error('User email missing');
      Alert.alert('Error', 'User authentication missing');
      router.back();
      return;
    }

    const fetchWalletBalance = async () => {
      try {
        const { data: wallet, error } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_email', userEmail)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching wallet balance:', error);
        } else {
          const walletBalance = wallet?.balance;
          setBalanceValue(walletBalance ?? balanceValue);
          console.log('Fetched wallet balance:', walletBalance);
        }
      } catch (err) {
        console.error('Error in fetchWalletBalance:', err);
      } finally {
        setIsBalanceLoading(false);
      }
    };

    fetchWalletBalance();

    const subscription = supabase
      .channel(`wallet-changes:${userEmail}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'wallets',
          filter: `user_email=eq.${userEmail}`,
        },
        (payload) => {
          console.log('Real-time Wallet Balance Update:', payload);
          setBalanceValue(payload.new.balance ?? balanceValue);
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error('Subscription error:', err);
        }
        console.log('Subscription status:', status);
      });

    return () => {
      supabase.removeChannel(subscription);
      console.log('Subscription cleaned up');
    };
  }, [userEmail, balanceValue]);

  // Pulse animation for edit button and network text
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.5,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseNetworkAnim, {
          toValue: 0.8,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseNetworkAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Update network provider when mobile number changes
  const updateNetworkProvider = useCallback(
    (mobile: string) => {
      if (mobile.length !== 11) {
        setNetworkProvider(selectedProvider.name);
        return;
      }
      const prefix = mobile.slice(0, 4);
      const mtn = ['0803', '0806', '0703', '0706', '0813', '0816', '0810', '0814', '0903', '0906', '0913', '0916'];
      const glo = ['0805', '0807', '0705', '0815', '0811', '0905', '0915'];
      const airtel = ['0802', '0808', '0708', '0812', '0701', '0902', '0907', '0901', '0912'];
      const nineMobile = ['0809', '0817', '0818', '0909', '0908'];
      let detectedProvider = selectedProvider.name;
      let detectedNetworkId = parsedNetworkId;

      if (mtn.includes(prefix)) {
        detectedProvider = 'MTN';
        detectedNetworkId = 1;
      } else if (glo.includes(prefix)) {
        detectedProvider = 'GLO';
        detectedNetworkId = 3;
      } else if (airtel.includes(prefix)) {
        detectedProvider = 'AIRTEL';
        detectedNetworkId = 2;
      } else if (nineMobile.includes(prefix)) {
        detectedProvider = '9MOBILE';
        detectedNetworkId = 4;
      }

      // Only update if the detected provider matches the selected plan's planType for Hot plans
      if (selectedBundle.category === 'Hot' && selectedBundle.planType && selectedBundle.planType === detectedProvider) {
        setNetworkProvider(detectedProvider);
        setParsedNetworkId(detectedNetworkId);
        setSelectedProvider({ ...selectedProvider, name: detectedProvider, id: detectedNetworkId });
      } else if (selectedBundle.category === 'Hot' && selectedBundle.planType) {
        console.log('Mobile number prefix does not match planType:', {
          prefix,
          detectedProvider,
          planType: selectedBundle.planType,
          bundleId: selectedBundle.id,
        });
      }
    },
    [selectedProvider, parsedNetworkId, selectedBundle]
  );

  useEffect(() => {
    if (editableMobileNumber) {
      const timeoutId = setTimeout(() => {
        updateNetworkProvider(editableMobileNumber);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [editableMobileNumber, updateNetworkProvider]);

  // PanResponder for slide-to-purchase
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx > 0) {
          slideAnim.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 100) {
          console.log('Slide to purchase triggered', { referenceId });
          handlePurchase();
        }
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const handleMobileNumberChange = (text: string) => {
    setEditableMobileNumber(text);
    if (text.length === 11 && /^\d{11}$/.test(text)) {
      if (networkProvider.toUpperCase() === selectedProvider.name.toUpperCase()) {
        setIsEditingMobile(false);
      } else {
        Alert.alert(
          'Invalid Mobile Number',
          `The mobile number does not match the provider (${selectedProvider.name}). Please enter a valid ${selectedProvider.name} number.`,
        );
        setEditableMobileNumber(phoneNumber);
        setIsEditingMobile(false);
      }
    }
  };

  const formatNumberWithCommas = (number: number): string => {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const validateHotPlan = (networkId: number, planType: string): boolean => {
    const validNetworkIds: { [key: string]: number[] } = {
      MTN: [1],
      GLO: [3],
      '9MOBILE': [4],
      AIRTEL: [2],
    };
    const validIds = validNetworkIds[planType] || [];
    if (!validIds.includes(networkId)) {
      console.error('Invalid Network ID for plan:', {
        networkId,
        planType,
        expectedNetworkId: validIds[0],
      });
      return false;
    }
    return true;
  };

  const handlePurchase = async () => {
    let currentBalance: number | undefined;
    try {
      setTransactionModalVisible(true);
      setTransactionStatus('processing');

      // Verify balance
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_email', userEmail)
        .single();

      if (walletError && walletError.code !== 'PGRST116') {
        throw new Error(`Failed to fetch wallet balance: ${walletError.message}`);
      }

      currentBalance = wallet?.balance ?? balanceValue;
      const basePrice = (selectedBundle.price || selectedBundle.amount) ?? 0;

      console.log('Purchase details:', {
        currentBalance,
        basePrice,
        mobile_number: editableMobileNumber,
        networkId: parsedNetworkId,
        planId: parsedPlanId,
        referenceId,
        userEmail,
        category: selectedBundle.category,
        planType: selectedBundle.planType,
        bundle: selectedBundle,
      });

      if (currentBalance < basePrice) {
        Alert.alert(
          'Error',
          `Insufficient wallet balance. Required: ₦${formatNumberWithCommas(basePrice)}, Available: ₦${formatNumberWithCommas(currentBalance)}. Please top up your wallet.`,
        );
        setTransactionModalVisible(false);
        return;
      }

      // Deduct base price from wallet
      const newBalance = currentBalance - basePrice;
      const { error: walletUpdateError } = await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('user_email', userEmail);

      if (walletUpdateError) {
        throw new Error(`Wallet update failed: ${walletUpdateError.message}`);
      }

      setBalanceValue(newBalance);

      // Check if plan is a Hot plan
      const isHotPlan = selectedBundle.category === 'Hot';
      console.log('API routing decision:', { isHotPlan, selectedBundleId: selectedBundle.id });

      let apiResponse: Response;
      let responseText: string;

      if (isHotPlan) {
        // Validate Hot Plan and Network ID
        if (!selectedBundle.planType || !validateHotPlan(parsedNetworkId, selectedBundle.planType)) {
          const { error: refundError } = await supabase
            .from('wallets')
            .update({ balance: currentBalance })
            .eq('user_email', userEmail);

          if (refundError) {
            console.error('Error refunding wallet balance:', refundError);
            throw new Error(`Failed to refund wallet balance: ${refundError.message}`);
          }

          setBalanceValue(currentBalance);
          setTransactionModalVisible(false);
          setErrorModalVisible(true);
          Alert.alert(
            'Error',
            `Invalid network selected for the plan. Please select a ${selectedBundle.planType} network for the ${selectedBundle.data} plan.`
          );
          return;
        }

        // Use Lizzysub API for all Hot plans
        const requestBody = {
          network: parsedNetworkId,
          phone: editableMobileNumber,
          data_plan: selectedBundle.id,
          bypass: false,
          'request-id': `Data_${referenceId}`,
        };

        console.log('Lizzysub API request:', requestBody);

        let token;
        try {
          token = await getLizzysubToken(userEmail);
        } catch (error: any) {
          if (error.message.includes('Invalid AccessToken')) {
            await invalidateToken(userEmail);
            token = await getLizzysubToken(userEmail);
          } else {
            throw error;
          }
        }

        apiResponse = await fetch('https://lizzysub.com/api/data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${token}`,
          },
          body: JSON.stringify(requestBody),
        });

        responseText = await apiResponse.text();
        console.log('Lizzysub API response:', {
          status: apiResponse.status,
          headers: Object.fromEntries(apiResponse.headers.entries()),
          responseText: responseText.slice(0, 500),
        });

        let responseData;
        try {
          responseData = JSON.parse(responseText);
        } catch (parseError: any) {
          const { error: refundError } = await supabase
            .from('wallets')
            .update({ balance: currentBalance })
            .eq('user_email', userEmail);

          if (refundError) {
            console.error('Error refunding wallet balance:', refundError);
            throw new Error(`Failed to refund wallet balance: ${refundError.message}`);
          }

          setBalanceValue(currentBalance);
          throw new Error(`Failed to parse Lizzysub API response: ${parseError.message}`);
        }

        if (!(apiResponse.status === 200 || apiResponse.status === 201)) {
          const { error: refundError } = await supabase
            .from('wallets')
            .update({ balance: currentBalance })
            .eq('user_email', userEmail);

          if (refundError) {
            console.error('Error refunding wallet balance:', refundError);
            throw new Error(`Failed to refund wallet balance: ${refundError.message}`);
          }

          setBalanceValue(currentBalance);

          if (apiResponse.status === 400 && responseText.includes('insufficient balance')) {
            setTransactionModalVisible(false);
            setErrorModalVisible(true);
            Alert.alert('Error', 'Insufficient balance on Lizzysub API. Please try again later.');
            return;
          }

          if (apiResponse.status === 403 && responseText.includes('Invalid AccessToken')) {
            await invalidateToken(userEmail);
            throw new Error('Invalid Lizzysub token. A new token will be generated on the next attempt.');
          }

          if (responseText.includes('Invalid Data Plan ID or Network')) {
            setTransactionModalVisible(false);
            setErrorModalVisible(true);
            Alert.alert('Error', 'Invalid Data Plan ID or Network. Please select a valid plan and network.');
            return;
          }

          const errorMessage = responseData.message || responseText.slice(0, 100);
          throw new Error(`Lizzysub API request failed: ${errorMessage}. Please verify Lizzysub credentials and API access.`);
        }
      } else {
        // Use Ebenkdata API for non-Hot plans
        const ebenkUrl = process.env.EXPO_PUBLIC_EBENK_URL || 'https://ebenkdata.com';
        const ebenkToken = process.env.EXPO_PUBLIC_EBENK_TOKEN;
        if (!ebenkToken) {
          const { error: refundError } = await supabase
            .from('wallets')
            .update({ balance: currentBalance })
            .eq('user_email', userEmail);

          if (refundError) {
            console.error('Error refunding wallet balance:', refundError);
            throw new Error(`Failed to refund wallet balance: ${refundError.message}`);
          }

          setBalanceValue(currentBalance);
          throw new Error('Ebenkdata token is not configured. Please check EXPO_PUBLIC_EBENK_TOKEN.');
        }

        const requestBody = {
          network: parsedNetworkId,
          mobile_number: editableMobileNumber,
          plan: parsedPlanId,
          Ported_number: true,
        };

        console.log('Ebenkdata API request:', requestBody);

        apiResponse = await fetch(`${ebenkUrl}/api/data/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${ebenkToken}`,
          },
          body: JSON.stringify(requestBody),
        });

        responseText = await apiResponse.text();
        console.log('Ebenkdata API response:', {
          status: apiResponse.status,
          headers: Object.fromEntries(apiResponse.headers.entries()),
          responseText: responseText.slice(0, 500),
        });

        let responseData;
        try {
          responseData = JSON.parse(responseText);
        } catch (parseError: any) {
          const { error: refundError } = await supabase
            .from('wallets')
            .update({ balance: currentBalance })
            .eq('user_email', userEmail);

          if (refundError) {
            console.error('Error refunding wallet balance:', refundError);
            throw new Error(`Failed to refund wallet balance: ${refundError.message}`);
          }

          setBalanceValue(currentBalance);
          throw new Error(`Failed to parse Ebenkdata API response: ${parseError.message}`);
        }

        if (!(apiResponse.status === 200 || apiResponse.status === 201)) {
          const { error: refundError } = await supabase
            .from('wallets')
            .update({ balance: currentBalance })
            .eq('user_email', userEmail);

          if (refundError) {
            console.error('Error refunding wallet balance:', refundError);
            throw new Error(`Failed to refund wallet balance: ${refundError.message}`);
          }

          setBalanceValue(currentBalance);

          if (apiResponse.status === 400 && responseText.includes("You can't purchase this plan due to insufficient balance")) {
            setTransactionModalVisible(false);
            setErrorModalVisible(true);
            Alert.alert('Error', 'Insufficient balance on Ebenkdata API. Please try again later.');
            return;
          }

          const errorMessage = responseData.message || responseText.slice(0, 100);
          throw new Error(`Ebenkdata API request failed: ${errorMessage}`);
        }
      }

      const actualCost = basePrice;

      // Record transaction only if API call is successful
      const transactionData = {
        user_email: userEmail,
        amount: -basePrice,
        reference: referenceId,
        status: 'success',
        env: 'live',
        metadata: {
          fees: {
            vat: 10,
            total_fee: 50,
            net_amount: basePrice - 50,
            transfer_fee: 10,
            api_network_fee: 20,
            wallet_management_fee: 10,
          },
          payment_date: new Date().toLocaleString([], { timeZone: 'Africa/Lagos' }),
          custom_fields: [
            {
              value: 'Edges Network',
              display_name: 'Mobile Payment',
              variable_name: 'mobile_payment',
            },
          ],
          payment_method: 'Wallet',
        },
      };

      const { error: txError } = await supabase
        .from('transactions')
        .insert(transactionData);

      if (txError) {
        const { error: refundError } = await supabase
          .from('wallets')
          .update({ balance: currentBalance })
          .eq('user_email', userEmail);

        if (refundError) {
          console.error('Error refunding wallet balance after transaction failure:', refundError);
          throw new Error(`Failed to refund wallet balance: ${refundError.message}`);
        }

        setBalanceValue(currentBalance);
        throw new Error(`Transaction recording failed: ${txError.message}`);
      }

      setTransactionStatus('success');

      Alert.alert(
        'Success',
        `Successfully purchased ${selectedBundle.data || `Plan ID ${parsedPlanId}`} on ${selectedProvider.name} for ₦${formatNumberWithCommas(actualCost)}. Sent to ${editableMobileNumber}.`,
      );

      router.push({
        pathname: '/success',
        params: {
          id: referenceId,
          provider: selectedProvider.name,
          data: selectedBundle.data || `Plan ID ${parsedPlanId}`,
          price: actualCost.toString(),
          date: new Date().toISOString(),
          status: 'Success',
          phoneNumber: editableMobileNumber,
          reference: referenceId,
          metadata: JSON.stringify({
            validity: selectedBundle.validity || 'N/A',
            payment_method: 'Wallet',
            type: selectedBundle.planType || 'data',
            actual_cost: actualCost,
          }),
        },
      });
    } catch (error: any) {
      console.error('Error initiating purchase:', error);
      setTransactionStatus('failed');
      setTransactionModalVisible(false);
      if (!errorModalVisible) {
        Alert.alert('Error', `Failed to initiate purchase: ${error.message || 'Please try again.'}`);
      }
    }
  };

  const handleCancel = () => {
    router.back();
  };

  const closeTransactionModal = () => {
    setTransactionModalVisible(false);
  };

  const closeErrorModal = () => {
    setErrorModalVisible(false);
    router.back();
  };

  const toggleEditMobile = () => {
    setIsEditingMobile(!isEditingMobile);
  };

  const purchaseDescription = () => selectedBundle.data || `Plan ID ${parsedPlanId}`;

  // Handle logout or session expiry
  useEffect(() => {
    const authListener = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        invalidateToken(userEmail).catch(err => console.error('Error invalidating token on logout:', err));
      }
    });

    return () => {
      authListener.data.subscription.unsubscribe();
    };
  }, [userEmail]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <PurchaseDetails
          selectedBundle={selectedBundle}
          selectedProvider={selectedProvider}
          balanceValue={balanceValue}
          isBalanceLoading={isBalanceLoading}
          editableMobileNumber={editableMobileNumber}
          handleMobileNumberChange={handleMobileNumberChange}
          toggleEditMobile={toggleEditMobile}
          handleCancel={handleCancel}
          referenceId={referenceId}
          pulseAnim={pulseAnim}
        />
        <Animated.View
          {...panResponder.panHandlers}
          style={[styles.slideContainer, { transform: [{ translateX: slideAnim }] }]}
        >
          <View style={styles.slideTextContainer}>
            <Text style={styles.slideText}>Slide to Purchase</Text>
            <Ionicons name="arrow-forward" size={20} color="#3B82F6" />
          </View>
        </Animated.View>
      </View>
      <TransactionStatusModal
        visible={transactionModalVisible}
        onClose={closeTransactionModal}
        transactionStatus={transactionStatus}
        selectedPlan={selectedBundle}
        phoneNumber={editableMobileNumber}
        networkProvider={networkProvider}
      />
      <ErrorModal
        visible={errorModalVisible}
        onClose={closeErrorModal}
        userName={userName}
        purchaseDescription={purchaseDescription()}
        timeLeft={timeLeft}
        pulseNetworkAnim={pulseNetworkAnim}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 48,
    width: '100%',
  },
  slideContainer: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    overflow: 'visible',
    zIndex: 1,
    accessible: true,
    accessibilityLabel: 'button',
  },
  slideTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  slideText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
});

export default ConfirmationScreen;