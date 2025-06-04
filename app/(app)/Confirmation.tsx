import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, Image, Animated, PanResponder, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/config/supabase';
import TransactionStatusModal from '@/components/homescreen/TransactionStatusModal';

// Define interfaces
interface Bundle {
  id: number;
  variation_code: string;
  description?: string;
  amount?: number;
  type?: string;
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
  const { bundle, provider, phoneNumber, transactionPin, userEmail, source, referenceId, balance: balanceParam } = useLocalSearchParams<{
    bundle?: string;
    provider?: string;
    phoneNumber?: string;
    transactionPin?: string;
    userEmail?: string;
    source?: string;
    referenceId?: string;
    balance?: string;
  }>();

  let selectedBundle: Bundle | null = null;
  let selectedProvider: Provider | null = null;
  let initialBalance: number = 0;

  try {
    selectedBundle = bundle ? JSON.parse(bundle) : null;
    selectedProvider = provider ? JSON.parse(provider) : null;
    initialBalance = balanceParam ? parseFloat(balanceParam) : 0;
  } catch (error) {
    console.error('Error parsing params:', error);
    Alert.alert('Error', 'Invalid purchase data');
    router.back();
    return null;
  }

  const [transactionModalVisible, setTransactionModalVisible] = useState<boolean>(false);
  const [transactionStatus, setTransactionStatus] = useState<'processing' | 'success' | 'failed'>('processing');
  const [balance, setBalance] = useState<number>(initialBalance);
  const [editablePhoneNumber, setEditablePhoneNumber] = useState<string>(phoneNumber || '');
  const [isEditingPhone, setIsEditingPhone] = useState<boolean>(false);
  const [networkProvider, setNetworkProvider] = useState<string>(selectedProvider?.name || '');
  const [actualPrice, setActualPrice] = useState<number | null>(null);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const providerImageMap: Record<string, string> = {
    '27': 'https://example.com/images/glo.png',
  };

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

  useEffect(() => {
    if (userEmail) {
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
            setBalance(payload.new.balance);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [userEmail]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        console.log('PanResponder move:', { dx: gestureState.dx });
        if (gestureState.dx > 0) {
          slideAnim.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        console.log('PanResponder released:', { dx: gestureState.dx });
        if (gestureState.dx > 100) {
          if (!referenceId) {
            console.log('Purchase blocked: Reference ID not provided');
            Alert.alert('Error', 'Transaction reference not provided.');
          } else {
            console.log('Initiating purchase with referenceId:', referenceId);
            handlePurchase();
          }
        }
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

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

  const handlePhoneNumberChange = (text: string) => {
    setEditablePhoneNumber(text);
    if (text.length === 11 && /^\d{11}$/.test(text)) {
      const providerFromNumber = getProviderFromPhone(text);
      if (providerFromNumber.toUpperCase() === selectedProvider?.name.toUpperCase()) {
        setIsEditingPhone(false);
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

  const formatNumberWithCommas = (number: number | undefined | null): string => {
    if (number === undefined || number === null) {
      return 'N/A';
    }
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const handlePurchase = async () => {
    console.log('Purchase initiated:', { referenceId, basePrice: selectedBundle?.amount || selectedBundle?.price || 0, userEmail });
    if (!selectedBundle || !selectedProvider) {
      Alert.alert('Error', 'No bundle or provider selected');
      return;
    }

    if (!editablePhoneNumber || editablePhoneNumber.length !== 11 || !/^\d{11}$/.test(editablePhoneNumber)) {
      Alert.alert('Error', 'Invalid phone number');
      return;
    }

    if (!referenceId) {
      console.log('Purchase blocked: No referenceId provided');
      Alert.alert('Error', 'Transaction reference not provided');
      return;
    }

    if (!userEmail) {
      console.log('Purchase blocked: No userEmail provided');
      Alert.alert('Error', 'User email not provided');
      return;
    }

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
        console.error('Wallet query error:', walletError);
        throw new Error('Failed to verify wallet balance');
      }

      const currentBalance = wallet?.balance || 0;
      const basePrice = selectedBundle.amount || selectedBundle.price || 0;

      console.log('Purchase Details:', {
        walletBalance: currentBalance,
        basePrice,
        selectedBundle,
        userEmail,
        referenceId,
      });

      if (currentBalance < basePrice) {
        Alert.alert('Error', `Insufficient wallet balance. Required: ₦${formatNumberWithCommas(basePrice)}, Available: ₦${formatNumberWithCommas(currentBalance)}. Please top up your wallet.`);
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
        console.error('Wallet update error:', walletUpdateError);
        throw walletUpdateError;
      }

      setBalance(newBalance);

      // Call Ebenkdata API with base price
      const ebenkdataResponse = await fetch('https://ebenkdata.com/api/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Token de883370902cf73e68ed63f566dbf38a38719f03',
        },
        body: JSON.stringify({
          provider: selectedProvider.name,
          phone: editablePhoneNumber,
          amount: basePrice,
          type: selectedBundle.type || 'data',
          plan: selectedBundle.data || `Airtime ₦${basePrice}`,
          reference: referenceId,
        }),
      });

      const ebenkdataData = await ebenkdataResponse.json();
      console.log('Ebenkdata API Response:', ebenkdataData);

      if (ebenkdataData.status !== 'success') {
        console.error('Ebenkdata error:', ebenkdataData.message);
        throw new Error('Ebenkdata purchase failed: ' + (ebenkdataData.message || 'Unknown error'));
      }

      const actualCost = ebenkdataData.data?.actual_amount
        ? parseFloat(ebenkdataData.data.actual_amount)
        : basePrice;
      setActualPrice(actualCost);

      // Record transaction
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
          phone_number: editablePhoneNumber,
          provider: selectedProvider.name,
          purchase: purchaseDescription,
          validity: selectedBundle.validity || 'N/A',
          type: selectedBundle.type || 'data',
          actual_cost: actualCost,
        },
      };

      const { error: txError } = await supabase
        .from('transactions')
        .insert(transactionData);

      if (txError) {
        console.error('Transaction insert error:', txError);
        throw txError;
      }

      setTransactionStatus('success');

      Alert.alert(
        'Success',
        `Successfully purchased ${purchaseDescription} on ${selectedProvider.name} for ₦${formatNumberWithCommas(actualCost)}. Sent to ${editablePhoneNumber}.`
      );

      router.push({
        pathname: '/success',
        params: {
          id: referenceId,
          provider: selectedProvider.name,
          data: purchaseDescription,
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
      console.error('Error initiating purchase:', error);
      setTransactionStatus('failed');
      // Revert wallet balance if deducted
      if (typeof currentBalance === 'number') {
        await supabase
          .from('wallets')
          .update({ balance: currentBalance })
          .eq('user_email', userEmail);
      }
      setTransactionModalVisible(false);
      Alert.alert('Error', 'Failed to initiate purchase. Please try again.');
    }
  };

  const handleCancel = () => {
    router.back();
  };

  const closeTransactionModal = () => {
    setTransactionModalVisible(false);
  };

  const toggleEditPhone = () => {
    setIsEditingPhone(!isEditingPhone);
  };

  if (!selectedBundle || !selectedProvider || !phoneNumber || !referenceId || !balanceParam) {
    console.log('Missing required params:', { selectedBundle, selectedProvider, phoneNumber, referenceId, balance });
    Alert.alert('Error', 'Missing required purchase information');
    router.back();
    return null;
  }

  const basePrice = selectedBundle.amount || selectedBundle.price || 0;
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
              source={{
                uri: selectedProvider.image && providerImageMap[selectedProvider.image]
                  ? providerImageMap[selectedProvider.image]
                  : 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI3AAAAABJRU5ErkJggg==',
              }}
              style={styles.providerLogo}
              resizeMode="contain"
              onError={(e) => console.log('Image load error:', e.nativeEvent.error)}
            />
            <Text style={styles.providerName}>{selectedProvider.name}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{selectedBundle.type === 'airtime' ? 'Airtime Amount' : 'Data Plan'}</Text>
            <Text style={styles.detailValue}>{purchaseDescription}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Price</Text>
            <Text style={styles.detailValue}>₦${formatNumberWithCommas(basePrice)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Wallet Balance</Text>
            <Text style={styles.detailValue}>₦${formatNumberWithCommas(balance)}</Text>
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
            style={[
              styles.slideContainer,
              { transform: [{ translateX: slideAnim }] },
            ]}
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
});

export default ConfirmationPage;