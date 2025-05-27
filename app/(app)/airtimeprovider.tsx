import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
  Animated,
  PanResponder,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/config/supabase';
import TransactionStatusModal from '@/components/homescreen/TransactionStatusModal';
import * as SecureStore from 'expo-secure-store';

// Define the Provider interface
interface Provider {
  id: number;
  name: string;
  image: string;
  code: string;
  networkId: number;
  apiDiscount: number;
}

// Placeholder images for each network
const NETWORK_IMAGES: { [key: string]: string } = {
  MTN: 'https://vtu.ng/wp-content/uploads/2023/08/mtn-logo.png',
  GLO: 'https://vtu.ng/wp-content/uploads/2023/08/glo-logo.png',
  AIRTEL: 'https://vtu.ng/wp-content/uploads/2023/08/airtel-logo.png',
  '9MOBILE': 'https://vtu.ng/wp-content/uploads/2023/08/9mobile-logo.png',
};

// Map API provider names to network IDs and discounts
const PROVIDER_CONFIG: { [key: string]: { networkId: number; apiDiscount: number } } = {
  MTN: { networkId: 1, apiDiscount: 98 },
  GLO: { networkId: 2, apiDiscount: 96 },
  AIRTEL: { networkId: 3, apiDiscount: 97 },
  '9MOBILE': { networkId: 4, apiDiscount: 98 }, // Fixed syntax error
};

// Predefined airtime amounts
const AIRTIME_AMOUNTS = [100, 200, 500, 1000, 2000, 3000, 5000, 10000];

const AirtimeProvider: React.FC = () => {
  const router = useRouter();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [discountedPrice, setDiscountedPrice] = useState<number | null>(null);
  const [transactionPin, setTransactionPin] = useState<string>('');
  const [balance, setBalance] = useState<number>(0);
  const [userEmail, setUserEmail] = useState<string>('');
  const [referenceId, setReferenceId] = useState<string>('');
  const [transactionModalVisible, setTransactionModalVisible] = useState<boolean>(false);
  const [transactionStatus, setTransactionStatus] = useState<'processing' | 'success' | 'failed'>('processing');
  const [loading, setLoading] = useState<boolean>(true);

  // Animation for slide to purchase
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Fetch providers from Ebenkdata API
  const fetchProviders = async () => {
    try {
      const response = await fetch('https://ebenkdata.com/api/network/', {
        headers: {
          Authorization: 'Token de883370902cf73e68ed63f566dbf38a38719f03',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch providers: ${response.status}`);
      }

      const data = await response.json();
      console.log('API Response:', data);

      // Transform the API response into an array of Provider objects
      const providerMap: { [key: string]: Provider } = {};

      Object.keys(data).forEach((networkKey) => {
        const plans = data[networkKey];
        if (Array.isArray(plans) && plans.length > 0) {
          const networkName = plans[0].plan_network.toUpperCase();
          const config = PROVIDER_CONFIG[networkName];
          if (config && !providerMap[networkName]) {
            providerMap[networkName] = {
              id: plans[0].network,
              name: networkName,
              image: NETWORK_IMAGES[networkName] || 'https://example.com/default.png',
              code: networkName.toLowerCase(),
              networkId: config.networkId,
              apiDiscount: config.apiDiscount,
            };
          }
        }
      });

      const providerArray = Object.values(providerMap);
      setProviders(providerArray);

      if (providerArray.length === 0) {
        Alert.alert('Error', 'No valid providers found in the response.');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      Alert.alert('Error', 'Could not load data providers.');
      setProviders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  // Handle provider selection
  const handleSelectProvider = (provider: Provider) => {
    console.log('Selected provider:', provider);
    setSelectedProvider(provider);
  };

  // Slide to purchase gesture
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !!selectedProvider, // Only allow gesture if provider is selected
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx > 0) {
          slideAnim.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 100 && selectedProvider) {
          handlePurchase();
        }
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  // Validate phone number against provider
  const validatePhoneNumber = (phone: string, provider: Provider | null): boolean => {
    if (!phone || phone.length !== 11 || !/^\d{11}$/.test(phone)) {
      return false;
    }
    if (!provider) return true;
    const prefix = phone.slice(0, 4);
    const mtn = ['0803', '0806', '0703', '0706', '0813', '0816', '0810', '0814', '0903', '0906', '0913', '0916'];
    const glo = ['0805', '0807', '0705', '0815', '0811', '0905', '0915'];
    const airtel = ['0802', '0808', '0708', '0812', '0701', '0902', '0907', '0901', '0912'];
    const etisalat = ['0809', '0817', '0818', '0909', '0908'];
    const providerPrefixes: { [key: string]: string[] } = {
      MTN: mtn,
      GLO: glo,
      AIRTEL: airtel,
      '9MOBILE': etisalat,
    };
    return providerPrefixes[provider.name]?.includes(prefix) || false;
  };

  // Calculate selling price and set discounted price
  const selectAmount = (amount: number) => {
    setSelectedAmount(amount);
    const sellingPrices: { [key: number]: number } = {
      100: 99,
      200: 198,
      500: 495,
      1000: 990,
    };
    const sellingPrice = sellingPrices[amount] || amount * 0.99;
    setDiscountedPrice(sellingPrice);
  };

  // Calculate API cost and profit
  const calculateApiCostAndProfit = (amount: number, provider: Provider): { apiCost: number; profit: number } => {
    const apiCost = (amount * provider.apiDiscount) / 100;
    const sellingPrice = discountedPrice || amount * 0.99;
    const profit = sellingPrice - apiCost;
    return { apiCost, profit };
  };

  // Fetch user email, balance, and generate referenceId
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user || !user.email) {
          throw new Error('User not authenticated');
        }
        setUserEmail(user.email);

        const { data: wallet, error: walletError } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_email', user.email)
          .single();

        if (walletError && walletError.code !== 'PGRST116') {
          throw walletError;
        }
        setBalance(wallet?.balance || 0);

        const newReferenceId = `EBENKDATA_${user.id}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        setReferenceId(newReferenceId);
      } catch (error) {
        console.error('Error fetching user data:', error);
        Alert.alert('Error', 'Failed to load user data');
      }
    };
    fetchUserData();
  }, []);

  // Create Paystack transfer recipient
  const createRecipient = async (): Promise<string> => {
    const secretKey = await SecureStore.getItemAsync('PAYSTACK_SECRET_KEY');
    if (!secretKey) {
      throw new Error('Paystack secret key not found in .env');
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
        account_number: '0001234567', // Replace with your account number
        bank_code: '058', // Replace with your bank code (e.g., GTBank)
        currency: 'NGN',
      }),
    });
    const data = await response.json();
    if (!data.status || !data.data || !data.data.recipient_code) {
      throw new Error('Failed to create Paystack recipient: ' + JSON.stringify(data));
    }
    return data.data.recipient_code;
  };

  // Initiate Paystack transfer
  const initiateTransfer = async (recipientCode: string, amount: number): Promise<boolean> => {
    const secretKey = await SecureStore.getItemAsync('PAYSTACK_SECRET_KEY');
    if (!secretKey) {
      throw new Error('Paystack secret key not found in .env');
    }
    const response = await fetch('https://api.paystack.co/transfer', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'balance',
        amount: amount * 100,
        recipient: recipientCode,
        reason: 'Airtime Purchase Profit',
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
      } else {
        console.error('Paystack transfer failed');
      }
      return transferSuccess;
    } catch (error) {
      console.error('Paystack deposit error:', error);
      return false;
    }
  };

  // Handle purchase with Ebenkdata API
  const handlePurchase = async () => {
    console.log('handlePurchase called, selectedProvider:', selectedProvider);
    if (!selectedProvider) {
      Alert.alert('Error', 'Please select a provider.');
      setTransactionModalVisible(true);
      setTransactionStatus('failed');
      return;
    }
    if (!phoneNumber || !validatePhoneNumber(phoneNumber, selectedProvider)) {
      Alert.alert('Error', `Please enter a valid 11-digit phone number for ${selectedProvider.name}.`);
      setTransactionModalVisible(true);
      setTransactionStatus('failed');
      return;
    }
    if (!selectedAmount) {
      Alert.alert('Error', 'Please select an airtime amount.');
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
    if (balance < (discountedPrice || selectedAmount)) {
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
      const { apiCost, profit } = calculateApiCostAndProfit(selectedAmount, selectedProvider);
      console.log(`API Cost: ₦${apiCost}, Selling Price: ₦${discountedPrice}, Profit: ₦${profit}`);

      const transactionData = {
        user_email: userEmail,
        amount: -(discountedPrice || selectedAmount),
        reference: referenceId,
        status: 'pending',
        metadata: {
          purchase: `Airtime ₦${selectedAmount.toLocaleString()} on ${selectedProvider.name}`,
          phone_number: phoneNumber,
          validity: 'N/A',
          type: 'airtime',
          actual_cost: discountedPrice || selectedAmount,
          api_cost: apiCost,
          profit: profit,
          custom_fields: [
            {
              display_name: 'Mobile Payment',
              variable_name: 'mobile_payment',
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
        console.error('Pending transaction insert error:', pendingTxError.message);
        throw new Error('Failed to record pending transaction');
      }

      const apiUrl = 'https://ebenkdata.com/api/topup/';
      const requestBody = {
        network: selectedProvider.networkId,
        amount: selectedAmount,
        mobile_number: phoneNumber,
        Ported_number: true,
        airtime_type: 'VTU',
      };

      const purchaseResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Token de883370902cf73e68ed63f566dbf38a38719f03',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Ebenkdata API Response Status:', purchaseResponse.status);

      if (purchaseResponse.status !== 200) {
        await supabase
          .from('transactions')
          .update({ status: 'failed' })
          .eq('id', pendingTx.id);
        setTransactionStatus('failed');
        Alert.alert('Error', 'Airtime purchase failed. Please try again.');
        return;
      }

      const depositSuccess = await depositProfitToPaystack(profit);
      if (!depositSuccess) {
        await supabase
          .from('transactions')
          .update({ status: 'failed' })
          .eq('id', pendingTx.id);
        setTransactionStatus('failed');
        Alert.alert('Error', 'Failed to deposit profit to Paystack.');
        return;
      }

      const newBalance = balance - (discountedPrice || selectedAmount);
      const { error: walletUpdateError } = await supabase
        .from('wallets')
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
        console.error('Success transaction update error:', successUpdateError.message);
        throw new Error('Failed to update transaction status');
      }

      setBalance(newBalance);
      setTransactionStatus('success');

      router.push({
        pathname: '/success',
        params: {
          id: pendingTx.id,
          provider: selectedProvider.name,
          data: `Airtime ₦${selectedAmount.toLocaleString()}`,
          price: (discountedPrice || selectedAmount).toString(),
          date: new Date().toISOString(),
          status: 'Success',
          phoneNumber,
          reference: referenceId,
          metadata: JSON.stringify({
            validity: 'N/A',
            payment_method: 'Wallet',
            type: 'airtime',
            actual_cost: discountedPrice || selectedAmount,
            api_cost: apiCost,
            profit: profit,
          }),
        },
      });
    } catch (error) {
      console.error('Purchase error:', error);
      setTransactionStatus('failed');
      Alert.alert('Error', 'Failed to process purchase. Please try again.');
    }
  };

  // Close transaction modal
  const closeTransactionModal = () => {
    setTransactionModalVisible(false);
  };

  // Format number with commas
  const formatNumberWithCommas = (number: number | null): string => {
    if (number === null) return '';
    return number.toLocaleString();
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.selectProviderTitle}>📞 Airtime Purchase</Text>

      {/* Provider List */}
      <Text style={styles.sectionTitle}>Select Provider</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#00ff99" style={{ marginTop: 20 }} />
      ) : providers.length === 0 ? (
        <Text style={styles.noProviderText}>No providers available.</Text>
      ) : (
        <View style={styles.providerContainer}>
          {providers.map((provider) => (
            <Pressable
              key={provider.id}
              onPress={() => handleSelectProvider(provider)}
              style={[
                styles.providerCard,
                selectedProvider?.id === provider.id && styles.providerCardSelected,
              ]}
            >
              <Image
                source={{ uri: provider.image }}
                style={styles.providerLogo}
                resizeMode="contain"
              />
              <Text style={styles.providerName}>{provider.name}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Phone Number Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Phone Number</Text>
        <TextInput
          style={styles.phoneInput}
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          placeholder="Enter 11-digit phone number"
          placeholderTextColor="#A1A1AA"
          keyboardType="numeric"
          maxLength={11}
        />
      </View>

      {/* Transaction PIN Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Transaction PIN</Text>
        <TextInput
          style={styles.phoneInput}
          value={transactionPin}
          onChangeText={setTransactionPin}
          placeholder="Enter 4-6 digit PIN"
          placeholderTextColor="#A1A1AA"
          keyboardType="numeric"
          maxLength={6}
          secureTextEntry
        />
      </View>

      {/* Horizontal Amount List */}
      <Text style={styles.sectionTitle}>Select Airtime Amount</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.amountScroll}>
        {AIRTIME_AMOUNTS.map((amount) => (
          <Pressable
            key={amount}
            onPress={() => selectAmount(amount)}
            style={[
              styles.amountButton,
              selectedAmount === amount && styles.amountButtonSelected,
            ]}
          >
            <Text style={styles.amountText}>₦{amount.toLocaleString()}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Discount Bar */}
      <View style={styles.discountBar}>
        <Text style={styles.discountLabel}>Amount to pay</Text>
        <Text style={styles.discountValue}>
          ₦{formatNumberWithCommas(discountedPrice)}
        </Text>
      </View>

      {/* Slide to Purchase */}
      {selectedProvider ? (
        <Animated.View
          {...panResponder.panHandlers}
          style={[styles.slideContainer, { transform: [{ translateX: slideAnim }] }]}
        >
          <View style={styles.slideTextContainer}>
            <Text style={styles.slideText}>Slide to Purchase</Text>
            <Text style={styles.arrow}>→</Text>
          </View>
        </Animated.View>
      ) : (
        <View style={[styles.slideContainer, styles.slideContainerDisabled]}>
          <View style={styles.slideTextContainer}>
            <Text style={[styles.slideText, styles.slideTextDisabled]}>Select a provider to purchase</Text>
          </View>
        </View>
      )}

      <TransactionStatusModal
        visible={transactionModalVisible}
        onClose={closeTransactionModal}
        transactionStatus={transactionStatus}
        selectedPlan={{ amount: selectedAmount || 0, type: 'airtime' }}
        phoneNumber={phoneNumber}
        networkProvider={selectedProvider?.name || ''}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    paddingTop: 48,
    paddingHorizontal: 16,
  },
  selectProviderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 16,
  },
  providerContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 8,
    marginBottom: 24,
  },
  providerCard: {
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 8,
    width: 70,
  },
  providerCardSelected: {
    borderColor: '#3B82F6',
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  providerLogo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'white',
    marginBottom: 6,
  },
  providerName: {
    fontSize: 11,
    fontWeight: '600',
    color: 'white',
  },
  noProviderText: {
    fontSize: 16,
    color: '#A1A1AA',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    color: '#A1A1AA',
    marginBottom: 8,
  },
  phoneInput: {
    backgroundColor: '#2D2D2D',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: 'white',
  },
  amountScroll: {
    marginBottom: 24,
  },
  amountButton: {
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 12,
  },
  amountButtonSelected: {
    borderColor: '#3B82F6',
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  discountBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#2D2D2D',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  discountLabel: {
    fontSize: 16,
    color: '#A1A1AA',
  },
  discountValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  slideContainer: {
    marginTop: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  slideContainerDisabled: {
    backgroundColor: '#2D2D2D',
    opacity: 0.5,
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
  slideTextDisabled: {
    color: '#A1A1AA',
  },
  arrow: {
    fontSize: 20,
    color: '#3B82F6',
  },
});

export default AirtimeProvider;