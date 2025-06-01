import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, Image, Animated, PanResponder, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/config/supabase';
import TransactionStatusModal from '@/components/homescreen/TransactionStatusModal';

// Define shared bundle interface
interface Bundle {
  id: number;
  variation_code: string;
  description?: string;
  // Properties for AirtimeBundle
  amount?: number;
  type?: string;
  // Properties for DataBundle
  data?: string;
  price?: number;
  validity?: string;
  category?: string;
  planType?: string;
}

interface Provider {
  id: number;
  name: string;
  image: string;
  code: string;
}

const ConfirmationPage: React.FC = () => {
 
  const { bundle, provider, phoneNumber, transactionPin, userEmail, source } = useLocalSearchParams<{
    bundle?: string;
    provider?: string;
    phoneNumber?: string;
    transactionPin?: string;
    userEmail?: string;
    source?: string;
  }>();

  let selectedBundle: Bundle | null = null;
  let selectedProvider: Provider | null = null;

  try {
    selectedBundle = bundle ? JSON.parse(bundle) : null;
    selectedProvider = provider ? JSON.parse(provider) : null;
  } catch (error) {
    console.error('Error parsing params:', error);
    Alert.alert('Error', 'Invalid purchase data');
    router.back();
    return null;
  }

  const [transactionModalVisible, setTransactionModalVisible] = useState<boolean>(false);
  const [transactionStatus, setTransactionStatus] = useState<'processing' | 'success' | 'failed'>('processing');
  const [balance, setBalance] = useState<number>(0);
  const [referenceId, setReferenceId] = useState<string>('');
  const [editablePhoneNumber, setEditablePhoneNumber] = useState<string>(phoneNumber || '');
  const [isEditingPhone, setIsEditingPhone] = useState<boolean>(false);
  const [networkProvider, setNetworkProvider] = useState<string>(selectedProvider?.name || '');
  const [actualPrice, setActualPrice] = useState<number | null>(null); // State for actual price

  // Animation for slide to purchase
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Pulse animation for Edit text
  const pulseAnim = useRef(new Animated.Value(1)).current;

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
  }, []);

  // Fetch user UUID and generate referenceId
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user || !user.id) {
          throw new Error('User not authenticated or UUID missing');
        }
        const newReferenceId = `VTUNetwork_${user.id}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        setReferenceId(newReferenceId);
      } catch (error) {
        console.error('Error fetching user UUID:', error);
        Alert.alert('Error', 'Failed to generate transaction reference');
        router.back();
      }
    };

    fetchUser();
  }, []);

  // Slide to purchase gesture
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx > 0) {
          slideAnim.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 100) {
          handlePurchase();
        }
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  // Fetch wallet balance
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const { data: wallet, error } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_email', userEmail as string)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        setBalance(wallet?.balance || 0);
      } catch (error) {
        console.error('Error fetching balance:', error);
        Alert.alert('Error', 'Failed to fetch wallet balance');
      }
    };

    if (userEmail) {
      fetchBalance();
    }
  }, [userEmail]);

  // Detect network provider based on phone number
  const getProviderFromPhone = (phone: string): string => {
    if (phone.length !== 11) return selectedProvider?.name || '';
    const prefix = phone.slice(0, 4);
    const mtn = ['0803', '0806', '0703', '0706', '0813', '0816', '0810', '0814', '0903', '0906', '0913', '0916'];
    const glo = ['0805', '0807', '0705', '0815', '0811', '0905', '0915'];
    const airtel = ['0802', '0808', '0708', '0812', '0701', '0902', '0907', '0901', '0912'];
    const etisalat = ['0809', '0817', '0818', '0909', '0908'];
    if (mtn.includes(prefix)) return 'MTN';
    if (glo.includes(prefix)) return 'GLO';
    if (airtel.includes(prefix)) return 'AIRTEL';
    if (etisalat.includes(prefix)) return '9MOBILE';
    return selectedProvider?.name || '';
  };

  useEffect(() => {
    setNetworkProvider(getProviderFromPhone(editablePhoneNumber));
  }, [editablePhoneNumber]);

  // Validate and auto-save phone number when 11 digits
  const handlePhoneNumberChange = (text: string) => {
    setEditablePhoneNumber(text);
    if (text.length === 11 && /^\d{11}$/.test(text)) {
      const providerFromNumber = getProviderFromPhone(text);
      if (providerFromNumber.toUpperCase() === selectedProvider?.name.toUpperCase()) {
        setIsEditingPhone(false); // Auto-save
      } else {
        Alert.alert(
          'Invalid Phone Number',
          `The phone number does not match the provider (${selectedProvider?.name}). Please enter a valid ${selectedProvider?.name} number.`
        );
        setEditablePhoneNumber(phoneNumber || '');
        setIsEditingPhone(false);
      }
    }
  };

  // Format number with commas
  const formatNumberWithCommas = (number: number | undefined | null): string => {
    if (number === undefined || number === null) {
      return 'N/A';
    }
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const handlePurchase = async () => {
    if (!selectedBundle || !selectedProvider) {
      Alert.alert('Error', 'No bundle or provider selected');
      return;
    }

    if (!editablePhoneNumber || editablePhoneNumber.length !== 11 || !/^\d{11}$/.test(editablePhoneNumber)) {
      Alert.alert('Error', 'Invalid phone number');
      return;
    }

    if (!transactionPin || (transactionPin as string).length < 4 || (transactionPin as string).length > 6) {
      Alert.alert('Error', 'Invalid transaction PIN');
      return;
    }

    const purchaseAmount = selectedBundle.amount || selectedBundle.price || 0;
    if (balance < purchaseAmount) {
      Alert.alert('Error', 'Insufficient balance. Please fund your wallet.');
      return;
    }

    if (!referenceId) {
      Alert.alert('Error', 'Transaction reference not generated');
      return;
    }

    // Verify transaction PIN
    try {
      const { data: userData, error: pinError } = await supabase
        .from('users')
        .select('transaction_pin')
        .eq('email', userEmail as string)
        .single();

      if (pinError || !userData || userData.transaction_pin !== transactionPin) {
        Alert.alert('Error', 'Invalid transaction PIN');
        setTransactionStatus('failed');
        return;
      }
    } catch (error) {
      console.error('PIN verification error:', error);
      Alert.alert('Error', 'Failed to verify transaction PIN');
      setTransactionStatus('failed');
      return;
    }

    setTransactionModalVisible(true);
    setTransactionStatus('processing');

    try {
      // Record pending transaction in Supabase
      const transactionData = {
        user_email: userEmail as string,
        amount: -purchaseAmount,
        reference: referenceId,
        status: 'pending',
        metadata: {
          purchase: selectedBundle.type === 'airtime'
            ? `Airtime ₦${formatNumberWithCommas(selectedBundle.amount)} on ${selectedProvider.name}`
            : `${selectedBundle.data} on ${selectedProvider.name}`,
          phone_number: editablePhoneNumber,
          validity: selectedBundle.validity || 'N/A',
          type: selectedBundle.type || 'data',
          custom_fields: [
            {
              display_name: 'Mobile Payment',
              variable_name: 'mobile_payment',
              value: 'VTU.ng',
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
        console.error('Pending transaction insert error:', pendingTxError.message);
        throw new Error('Failed to record pending transaction');
      }

      // Purchase with VTU.ng API
      const networkIdMap: { [key: string]: string } = {
        MTN: 'mtn',
        GLO: 'glo',
        AIRTEL: 'airtel',
        '9MOBILE': 'etisalat',
      };
      const networkId = networkIdMap[selectedProvider.name.toUpperCase()] || 'mtn';

      const apiUrl = `https://vtu.ng/wp-json/api/v1/airtime?username=b.uche@fudutsinma.edu.ng&password=@Password7492&phone=${editablePhoneNumber}&network_id=${networkId}&amount=${purchaseAmount}`;

      const purchaseResponse = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const purchaseData = await purchaseResponse.json();
      console.log('VTU.ng API Response:', purchaseData);

      if (purchaseData.code !== 'success') {
        await supabase
          .from('transactions')
          .update({ status: 'failed' })
          .eq('id', pendingTx.id);
        setTransactionStatus('failed');
        Alert.alert('Error', `Airtime purchase failed: ${purchaseData.message || 'Unknown error'}`);
        return;
      }

      // Extract actual price from API response
      const actualCost = purchaseData.data?.amount
        ? parseFloat(purchaseData.data.amount.replace('NGN', ''))
        : purchaseAmount;
      setActualPrice(actualCost);

      // Update transaction metadata with actual cost
      const { error: updateTxError } = await supabase
        .from('transactions')
        .update({
          metadata: {
            ...transactionData.metadata,
            actual_cost: actualCost,
          },
        })
        .eq('id', pendingTx.id);

      if (updateTxError) {
        console.error('Transaction metadata update error:', updateTxError.message);
      }

      // Update wallet balance
      const newBalance = balance - purchaseAmount;
      const { error: walletUpdateError } = await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('user_email', userEmail as string);

      if (walletUpdateError) {
        await supabase
          .from('transactions')
          .update({ status: 'failed' })
          .eq('id', pendingTx.id);
        throw new Error('Failed to update wallet balance');
      }

      // Mark transaction as successful
      const { error: successUpdateError } = await supabase
        .from('transactions')
        .update({ status: 'success' })
        .eq('id', pendingTx.id);

      if (successUpdateError) {
        console.error('Success transaction update error:', successUpdateError.message);
        throw new Error('Failed to update transaction status');
      }

      // Update state and show success
      setBalance(newBalance);
      setTransactionStatus('success');

      // Log transaction details for debugging
      console.log('Transaction successful:', {
        transactionId: pendingTx.id,
        provider: selectedProvider.name,
        purchase: selectedBundle.type === 'airtime' ? `Airtime ₦${purchaseAmount}` : selectedBundle.data,
        phoneNumber: editablePhoneNumber,
        totalAmount: purchaseAmount,
        actualCost,
        reference: referenceId,
        type: selectedBundle.type || 'data',
      });

      // Success message
      Alert.alert(
        'Success',
        `Successfully purchased ${selectedBundle.type === 'airtime' ? `Airtime ₦${formatNumberWithCommas(purchaseAmount)}` : selectedBundle.data} on ${selectedProvider.name} for ₦${formatNumberWithCommas(actualCost)}. Airtime sent to ${editablePhoneNumber}.`
      );

      // Navigate to success screen
      router.push({
        pathname: '/success',
        params: {
          id: pendingTx.id,
          provider: selectedProvider.name,
          data: selectedBundle.type === 'airtime' ? `Airtime ₦${purchaseAmount}` : selectedBundle.data,
          price: actualCost.toString(),
          date: new Date().toISOString(),
          status: 'Success',
          phoneNumber: editablePhoneNumber,
          reference: referenceId,
          metadata: JSON.stringify({
            validity: selectedBundle.validity || 'N/A',
            payment_method: 'Wallet',
            type: selectedBundle.type || 'data',
            actual_cost: actualCost,
          }),
        },
      });
    } catch (error) {
      console.error('Error processing purchase:', error);
      setTransactionStatus('failed');
      Alert.alert('Error', 'Failed to process purchase. Please try again.');
    }
  };

  const handleCancel = () => {
    router.back();
  };

  const closeTransactionModal = () => {
    setTransactionModalVisible(false);
  };

  const toggleEditPhone = () => {
    if (isEditingPhone) {
      setIsEditingPhone(false);
    } else {
      setIsEditingPhone(true);
    }
  };

  if (!selectedBundle || !selectedProvider || !phoneNumber) {
    return null;
  }

  const purchaseAmount = selectedBundle.amount || selectedBundle.price || 0;
  const purchaseDescription = selectedBundle.type === 'airtime'
    ? `Airtime ₦${formatNumberWithCommas(selectedBundle.amount)}`
    : selectedBundle.data || 'N/A';

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
              source={{ uri: selectedProvider.image || 'https://via.placeholder.com/40' }}
              style={styles.providerLogo}
              resizeMode="contain"
            />
            <Text style={styles.providerName}>{selectedProvider.name}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{selectedBundle.type === 'airtime' ? 'Airtime Amount' : 'Data Plan'}</Text>
            <Text style={styles.detailValue}>{purchaseDescription}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Price</Text>
            <Text style={styles.detailValue}>₦{formatNumberWithCommas(purchaseAmount)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Actual Price</Text>
            <Text style={styles.detailValue}>
              {actualPrice !== null ? `₦${formatNumberWithCommas(actualPrice)}` : 'Pending purchase'}
            </Text>
          </View>
          {selectedBundle.validity && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Validity</Text>
              <Text style={styles.detailValue}>{selectedBundle.validity}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Phone Number</Text>
            {isEditingPhone ? (
              <View style={styles.phoneContainer}>
                <TextInput
                  style={styles.phoneInput}
                  value={editablePhoneNumber}
                  onChangeText={handlePhoneNumberChange}
                  placeholder="Enter 11-digit phone number"
                  placeholderTextColor="#A1A1AA"
                  keyboardType="numeric"
                  maxLength={11}
                  autoFocus
                />
              </View>
            ) : (
              <View style={styles.phoneContainer}>
                <Pressable onPress={toggleEditPhone}>
                  <Animated.Text style={[styles.editText, { opacity: pulseAnim }]}>
                    Edit
                  </Animated.Text>
                </Pressable>
                <Text style={styles.phoneNumberText}>{editablePhoneNumber}</Text>
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
        phoneNumber={editablePhoneNumber}
        networkProvider={networkProvider}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 48,
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
    width: 110, // Fixed width to prevent overflow
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
    overflow: 'hidden',
  },
  slideTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  slideText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
});

export default ConfirmationPage;