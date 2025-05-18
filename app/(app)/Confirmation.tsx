import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, Image, Animated, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/config/supabase';

// Import modal
import TransactionStatusModal from '@/components/homescreen/TransactionStatusModal';

// Define types
interface DataBundle {
  id: number;
  data: string;
  price: number;
  validity: string;
  category: string;
  description?: string;
  variation_code: string;
  planType: string;
}

interface Provider {
  id: number;
  name: string;
  image: string;
  code: string;
}

const ConfirmationPage: React.FC = () => {
  const router = useRouter();
  const { bundle, provider, phoneNumber, transactionPin, userEmail } = useLocalSearchParams();

  let selectedBundle: DataBundle | null = null;
  let selectedProvider: Provider | null = null;

  try {
    selectedBundle = bundle ? JSON.parse(bundle as string) as DataBundle : null;
    selectedProvider = provider ? JSON.parse(provider as string) as Provider : null;
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

  // Animation for slide to purchase
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Fetch user UUID and generate referenceId
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user || !user.id) {
          throw new Error('User not authenticated or UUID missing');
        }
        const newReferenceId = `EdgesNetwork_${user.id}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
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

  // Format number with commas
  const formatNumberWithCommas = (number: number): string => {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const handlePurchase = async () => {
    if (!selectedBundle || !selectedProvider) {
      Alert.alert('Error', 'No bundle or provider selected');
      return;
    }

    if (!phoneNumber || (phoneNumber as string).length !== 11 || !/^\d{11}$/.test(phoneNumber as string)) {
      Alert.alert('Error', 'Invalid phone number');
      return;
    }

    if (!transactionPin || (transactionPin as string).length < 4 || (transactionPin as string).length > 6) {
      Alert.alert('Error', 'Invalid transaction PIN');
      return;
    }

    if (balance < selectedBundle.price) {
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
      const appFee = 50; // ₦50 fee (not shown to user)
      const dataPurchaseAmount = selectedBundle.price - appFee; // Amount for data purchase

      // Record pending transaction in Supabase
      const transactionData = {
        user_email: userEmail as string,
        amount: -selectedBundle.price,
        reference: referenceId,
        status: 'pending',
        metadata: {
          purchase: `${selectedBundle.data} on ${selectedProvider.name}`,
          phone_number: phoneNumber as string,
          validity: selectedBundle.validity,
          payment_date: new Date().toISOString(),
          app_fee: appFee, // Internal tracking
          data_amount: dataPurchaseAmount, // Internal tracking
          custom_fields: [
            {
              display_name: 'Mobile Payment',
              variable_name: 'mobile_payment',
              value: 'Edges Network',
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

      // Purchase data with Ebenkdata API
      const purchaseResponse = await fetch('https://ebenkdata.com/api/data/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Token de883370902cf73e68ed63f566dbf38a38719f03',
        },
        body: JSON.stringify({
          serviceID: selectedProvider.code,
          billersCode: phoneNumber as string,
          variation_code: selectedBundle.variation_code,
          amount: dataPurchaseAmount,
          phone: phoneNumber as string,
        }),
      });

      const purchaseData = await purchaseResponse.json();

      if (purchaseData.status !== 'success') {
        await supabase
          .from('transactions')
          .update({ status: 'failed' })
          .eq('id', pendingTx.id);
        setTransactionStatus('failed');
        Alert.alert('Error', 'Data purchase failed. Please try again.');
        return;
      }

      // Update wallet balance
      const newBalance = balance - selectedBundle.price;
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

      // Log transaction details for debugging (includes appFee for internal use)
      console.log('Transaction successful:', {
        transactionId: pendingTx.id,
        provider: selectedProvider.name,
        data: selectedBundle.data,
        phoneNumber,
        totalAmount: selectedBundle.price,
        appFee,
        dataPurchaseAmount,
        reference: referenceId,
      });

      // Success message (excludes appFee)
      Alert.alert(
        'Success',
        `Successfully purchased ${selectedBundle.data} on ${selectedProvider.name} for ₦${formatNumberWithCommas(selectedBundle.price)}. Data sent to ${phoneNumber}.`
      );

      // Navigate to success screen (excludes appFee in metadata)
      router.push({
        pathname: '/success',
        params: {
          id: pendingTx.id,
          provider: selectedProvider.name,
          data: selectedBundle.data,
          price: selectedBundle.price.toString(),
          date: new Date().toISOString(),
          status: 'Success',
          phoneNumber: phoneNumber as string,
          reference: referenceId,
          metadata: JSON.stringify({
            validity: selectedBundle.validity,
            payment_method: 'Wallet',
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

  if (!selectedBundle || !selectedProvider || !phoneNumber) {
    return null;
  }

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
              source={{ uri: selectedProvider.image }}
              style={styles.providerLogo}
              resizeMode="contain"
            />
            <Text style={styles.providerName}>{selectedProvider.name}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Data Plan</Text>
            <Text style={styles.detailValue}>{selectedBundle.data}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Price</Text>
            <Text style={styles.detailValue}>₦{formatNumberWithCommas(selectedBundle.price)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Validity</Text>
            <Text style={styles.detailValue}>{selectedBundle.validity}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Phone Number</Text>
            <Text style={styles.detailValue}>{phoneNumber}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Plan Type</Text>
            <Text style={styles.detailValue}>{selectedBundle.planType}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Bundle ID</Text>
            <Text style={styles.detailValue}>{selectedBundle.id}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Reference ID</Text>
            <Text style={styles.detailValue}>{referenceId}</Text>
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
        phoneNumber={phoneNumber as string}
        networkProvider={selectedProvider.name}
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
    paddingTop: 48, // Space for status bar
  },
  card: {
    backgroundColor: '#2D2D2D',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    position: 'relative', // Required for absolute positioning of closeButton
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
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 16,
    color: '#A1A1AA',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    maxWidth: '60%',
    textAlign: 'right',
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