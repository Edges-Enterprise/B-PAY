import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, Image, Animated, PanResponder, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/config/supabase';
import TransactionStatusModal from '@/components/homescreen/TransactionStatusModal';
import { NETWORK_IMAGES, DEFAULT_PROVIDER_IMAGE } from '@/constants/helper';

// Define interfaces
interface Bundle {
  id: number;
  variation_code: string;
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

const ConfirmationPage: React.FC = () => {
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
      transactionPin,
      userEmail,
      referenceId,
      balance: balanceValue,
      networkId: parsedNetworkId,
      planId: parsedPlanId,
    });
  }, []);

  // Fetch wallet balance and set up real-time subscription
  useEffect(() => {
    if (!userEmail) return;

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
          const walletBalance = wallet?.balance ?? balanceValue;
          setBalanceValue(walletBalance);
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
      const etisalat = ['0809', '0817', '0818', '0909', '0908'];
      if (mtn.includes(prefix)) {
        setNetworkProvider('MTN');
      } else if (glo.includes(prefix)) {
        setNetworkProvider('GLO');
      } else if (airtel.includes(prefix)) {
        setNetworkProvider('AIRTEL');
      } else if (etisalat.includes(prefix)) {
        setNetworkProvider('9MOBILE');
      } else {
        setNetworkProvider(selectedProvider.name);
      }
    },
    [selectedProvider]
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

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
      const basePrice = selectedBundle.price || selectedBundle.amount || 0;

      console.log('Purchase details:', {
        currentBalance,
        basePrice,
        mobile_number: editableMobileNumber,
        networkId: parsedNetworkId,
        planId: parsedPlanId,
        referenceId,
        userEmail,
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

      // Call Ebenkdata API
      const requestBody = {
        network: parsedNetworkId,
        mobile_number: editableMobileNumber,
        plan: parsedPlanId,
        Ported_number: true,
      };

      console.log('Ebenkdata API request:', requestBody);

      const ebenkdataResponse = await fetch('https://ebenkdata.com/api/data/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Token de883370902cf73e68ed63f566dbf38a38719f03',
        },
        body: JSON.stringify(requestBody),
      });

      const responseText = await ebenkdataResponse.text();
      console.log('Ebenkdata API response:', {
        status: ebenkdataResponse.status,
        responseText: responseText.slice(0, 100),
      });

      if (!ebenkdataResponse.ok) {
        // Refund the deducted amount if API call fails
        const { error: refundError } = await supabase
          .from('wallets')
          .update({ balance: currentBalance })
          .eq('user_email', userEmail);

        if (refundError) {
          console.error('Error refunding wallet balance:', refundError);
          throw new Error(`Failed to refund wallet balance: ${refundError.message}`);
        }

        setBalanceValue(currentBalance);

        if (ebenkdataResponse.status === 400 && responseText.includes("You can't purchase this plan due to insufficient balance")) {
          setTransactionModalVisible(false);
          setErrorModalVisible(true);
          return;
        }

        throw new Error(`Ebenkdata API request failed: ${ebenkdataResponse.status} ${responseText.slice(0, 100)}`);
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
          payment_date: new Date().toLocaleString('en-US', { timeZone: 'Africa/Lagos' }),
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
        // Refund the amount if transaction recording fails
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

  const basePrice = selectedBundle.price || selectedBundle.amount || 0;
  const purchaseDescription = selectedBundle.data || `Plan ID ${parsedPlanId}`;
  const providerImage = selectedProvider.imageKey && NETWORK_IMAGES[selectedProvider.imageKey as keyof typeof NETWORK_IMAGES]
    ? NETWORK_IMAGES[selectedProvider.imageKey as keyof typeof NETWORK_IMAGES]
    : DEFAULT_PROVIDER_IMAGE;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.card}>
          <Pressable onPress={handleCancel} style={styles.closeButton}>
            <Ionicons name="close" size={30} color="red" />
          </Pressable>
          <View style={styles.providerInfo}>
            <Pressable onPress={handleCancel} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </Pressable>
            <Image
              source={providerImage}
              style={styles.providerLogo}
              resizeMode="contain"
              onError={(e) => console.log('Image load error:', e.nativeEvent.error)}
            />
            <Text style={styles.providerName}>{selectedProvider.name}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Data Plan</Text>
            <Text style={styles.detailValue}>{purchaseDescription}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Price</Text>
            <Text style={styles.detailValue}>₦{formatNumberWithCommas(basePrice)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Wallet Balance</Text>
            <Text style={styles.detailValue}>
              {isBalanceLoading ? 'Loading...' : `₦${formatNumberWithCommas(balanceValue)} `}
            </Text>
          </View>
          {selectedBundle.validity && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Validity</Text>
              <Text style={styles.detailValue}>{selectedBundle.validity}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Mobile Number</Text>
            {isEditingMobile ? (
              <View style={styles.phoneContainer}>
                <TextInput
                  style={styles.phoneInput}
                  value={editableMobileNumber}
                  onChangeText={handleMobileNumberChange}
                  placeholder="Enter 11-digit mobile number"
                  placeholderTextColor="#A1A1AA"
                  keyboardType="numeric"
                  maxLength={11}
                  autoFocus
                />
              </View>
            ) : (
              <View style={styles.phoneContainer}>
                <Pressable onPress={toggleEditMobile}>
                  <Animated.Text style={[styles.editText, { opacity: pulseAnim }]}>
                    Edit
                  </Animated.Text>
                </Pressable>
                <Text style={styles.phoneNumberText}>{editableMobileNumber}</Text>
              </View>
            )}
          </View>
          {selectedBundle.planType && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Plan Type</Text>
              <Text style={styles.detailValue}>{selectedBundle.planType}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Bundle ID</Text>
            <Text style={styles.detailValue}>{selectedBundle.id}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Reference ID</Text>
            <Text style={[styles.detailValue, styles.referenceId]}>{referenceId}</Text>
          </View>
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
      </View>
      <TransactionStatusModal
        visible={transactionModalVisible}
        onClose={closeTransactionModal}
        transactionStatus={transactionStatus}
        selectedPlan={selectedBundle}
        phoneNumber={editableMobileNumber}
        networkProvider={networkProvider}
      />
      <Modal
        animationType="fade"
        transparent={true}
        visible={errorModalVisible}
        onRequestClose={closeErrorModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.errorModal}>
            <Text style={styles.errorModalTitle}>Hi, {userName} 😢</Text>
            <Text style={styles.errorModalText}>
              <Animated.Text style={[styles.networkText, { transform: [{ scale: pulseNetworkAnim }] }]}>
                Edges Network
              </Animated.Text>{' '}
              for {purchaseDescription} is currently unavailable.
            </Text>
            <Text style={styles.errorModalText}>
              Server is down. Please try again in:
            </Text>
            <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
            <Pressable onPress={closeErrorModal} style={styles.closeErrorButton}>
              <Text style={styles.closeErrorButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  card: {
    backgroundColor: '#2D2D2D',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 8,
    padding: 4,
    zIndex: 10,
    accessible: true,
    accessibilityLabel: 'Close confirmation page',
    accessibilityRole: 'button',
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    marginRight: 12,
  },
  providerLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    marginRight: 12,
  },
  providerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'nowrap',
  },
  detailLabel: {
    fontSize: 16,
    color: '#A1A1AA',
    flexShrink: 0,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    textAlign: 'right',
    maxWidth: '55%',
    flexWrap: 'wrap',
  },
  referenceId: {
    flexWrap: 'wrap',
    numberOfLines: 2,
    ellipsizeMode: 'tail',
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    maxWidth: '60%',
    flexShrink: 1,
  },
  phoneInput: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 8,
    textAlign: 'right',
    width: 140,
  },
  phoneNumberText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    textAlign: 'right',
    width: 110,
  },
  editText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22C55E',
    textDecorationLine: 'underline',
    marginRight: 8,
  },
  slideContainer: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    overflow: 'visible',
    zIndex: 10,
    accessible: true,
    accessibilityLabel: 'Slide to confirm purchase',
    accessibilityRole: 'button',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorModal: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    alignItems: 'center',
    backdropFilter: 'blur(10px)', // Note: backdropFilter is not supported in React Native; using semi-transparent background for glassmorphism effect
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  errorModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorModalText: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    marginBottom: 12,
  },
  networkText: {
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  timerText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FF5555',
    marginVertical: 16,
    fontFamily: 'monospace',
  },
  closeErrorButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
  },
  closeErrorButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default ConfirmationPage;