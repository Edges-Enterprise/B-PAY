import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  Animated,
  PanResponder,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MotiView } from 'moti';
import { supabase } from '@/config/supabase';

// Import modals
import PurchaseModal from '@/components/homescreen/PurchaseModal';
import TransactionStatusModal from '@/components/homescreen/TransactionStatusModal';
import CreatePinModal from '@/components/homescreen/CreatePinModal';

// Define types
interface DataBundle {
  id: number;
  data: string;
  price: number;
  validity: string;
  category: string;
  description?: string;
  variation_code: string;
  planType: string; // SME, Gifting, Corporate Gifting, etc.
}

interface Provider {
  id: number;
  name: string;
  logo: string;
  serviceID: string;
}

const BuyDataScreen: React.FC = () => {
  const router = useRouter();
  const { provider: providerParam } = useLocalSearchParams();
  let selectedProvider: Provider | null = null;
  try {
    selectedProvider = providerParam ? JSON.parse(providerParam as string) as Provider : null;
  } catch (error) {
    console.error('Error parsing providerParam:', error);
    Alert.alert('Error', 'Invalid provider data');
    router.replace('/(app)/(protected)/providers');
    return null;
  }

  const [expandedCategory, setExpandedCategory] = useState<string>('Hot'); // Default to Hot
  const [lastPurchasedNumber, setLastPurchasedNumber] = useState<string>('08012345678');
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [transactionModalVisible, setTransactionModalVisible] = useState<boolean>(false);
  const [createPinModalVisible, setCreatePinModalVisible] = useState<boolean>(false);
  const [selectedBundle, setSelectedBundle] = useState<DataBundle | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [transactionPin, setTransactionPin] = useState<string>('');
  const [networkProvider, setNetworkProvider] = useState<string>('');
  const [transactionStatus, setTransactionStatus] = useState<'processing' | 'success' | 'failed'>('processing');
  const [showTransactionPin, setShowTransactionPin] = useState<boolean>(false);
  const [newPin, setNewPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [showNewPin, setShowNewPin] = useState<boolean>(false);
  const [showConfirmPin, setShowConfirmPin] = useState<boolean>(false);
  const [lastPurchasedBundle, setLastPurchasedBundle] = useState<DataBundle | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [userEmail, setUserEmail] = useState<string>('');
  const [bundles, setBundles] = useState<DataBundle[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Scrollbar state
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollBarAnim = useRef(new Animated.Value(0)).current;
  const [contentHeight, setContentHeight] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const hasTransactionPin: boolean = true;

  // Custom scrollbar PanResponder
  const scrollBarPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        scrollBarAnim.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        const scrollRange = containerHeight - 60; // Scrollbar handle height
        const contentRange = Math.max(contentHeight - containerHeight, 1);
        const newY = Math.max(0, Math.min(scrollBarAnim._value + gestureState.dy, scrollRange));
        scrollBarAnim.setValue(newY);
        if (scrollViewRef.current) {
          const scrollY = (newY / scrollRange) * contentRange;
          scrollViewRef.current.scrollTo({ y: scrollY, animated: false });
        }
      },
      onPanResponderRelease: () => {
        scrollBarAnim.stopAnimation();
      },
    })
  ).current;

  // Synchronize ScrollView with scrollbar
  const handleScroll = (event: any) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    const contentRange = Math.max(contentHeight - containerHeight, 1);
    const scrollRange = containerHeight - 60;
    const scrollBarY = (scrollY / contentRange) * scrollRange;
    scrollBarAnim.setValue(scrollBarY);
  };

  // Fetch user data, wallet balance, provider data plans, and last purchased bundle
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedProvider) {
        setError('No provider selected');
        setLoading(false);
        router.replace('/(app)/(protected)/providers');
        return;
      }

      try {
        // Fetch user and wallet balance
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user || !user.email) {
          throw new Error('User not authenticated or email missing');
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

        // Fetch last purchased bundle for the phone number
        const { data: transactions, error: txError } = await supabase
          .from('transactions')
          .select('metadata')
          .eq('user_email', user.email)
          .eq('status', 'success')
          .eq('metadata->>phone_number', lastPurchasedNumber)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (txError && txError.code !== 'PGRST116') {
          console.warn('No previous transactions found or error:', txError);
        }

        if (transactions?.metadata) {
          const { purchase, validity } = transactions.metadata;
          const match = purchase.match(/(.+?) on/);
          const data = match ? match[1].trim() : purchase;
          setLastPurchasedBundle({
            id: 0,
            data,
            price: 0,
            validity,
            category: '',
            variation_code: '',
            planType: '',
          });
        }

        // Fetch data plans from both VTpass and CampusCyberCafe APIs
        let fetchedBundles: DataBundle[] = [];

        // VTpass API
        try {
          const vtpassResponse = await fetch(`https://sandbox.vtpass.com/api/service-variations?serviceID=${selectedProvider.serviceID}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          const vtpassData = await vtpassResponse.json();
          if (vtpassData.response_description === '000') {
            fetchedBundles = vtpassData.content.variations.map((variation: any, index: number) => {
              const nameParts = variation.name.match(/N\d+\s*([\d.]+[MG]B|Unlimited|Voice|.*?\d+GB|\d+MB|\d+TB)?\s*(?:-\s*(\d+\s*(?:day|month|year|hrs)|(?:Saturday|Sunday|night|30days)))?/i) || [];
              const dataAmount = nameParts[1] || variation.name.split('-')[1]?.trim() || variation.name;
              let validity = nameParts[2] || '';

              let category = '';
              if (validity === 'Saturday' || validity === 'Sunday' || variation.name.toLowerCase().includes('weekend')) {
                category = 'Weekend Plans';
                validity = 'Weekend';
              } else if (validity.toLowerCase().includes('night') || variation.name.toLowerCase().includes('night')) {
                category = 'Night Plans';
                validity = '11 PM - 5 AM';
              } else if (variation.name.toLowerCase().includes('unlimited') || variation.name.toLowerCase().includes('platinum')) {
                category = 'Unlimited Plans';
              } else {
                const days = parseInt(validity.match(/\d+/)?.[0] || '0', 10);
                if (['24 hrs', '48 hrs', '72 hrs'].includes(validity) || days <= 3) {
                  category = 'Daily Plans';
                } else if (days >= 5 && days <= 14) {
                  category = 'Weekly Plans';
                } else if (days >= 28 && days <= 60) {
                  category = 'Monthly Plans';
                } else {
                  category = 'Monthly Plans';
                }
              }

              let planType = '';
              if (variation.name.toLowerCase().includes('sme')) planType = 'SME';
              else if (variation.name.toLowerCase().includes('gifting')) planType = 'Gifting';
              else if (variation.name.toLowerCase().includes('corporate')) planType = 'Corporate Gifting';
              else if (variation.name.toLowerCase().includes('voice')) planType = 'Voice';
              else if (selectedProvider.serviceID.includes('sme')) planType = 'SME';
              else planType = 'Standard';

              if (!validity) {
                validity = planType ? planType : 'Not Specified';
              }

              return {
                id: index + 1,
                data: dataAmount,
                price: parseFloat((parseFloat(variation.variation_amount) * 1.05).toFixed(2)),
                validity: validity,
                category: category,
                description: variation.name,
                variation_code: variation.variation_code,
                planType: planType,
              };
            });
          }
        } catch (vtpassError) {
          console.warn('VTpass API failed, trying CampusCyberCafe API:', vtpassError);
        }

        // CampusCyberCafe API
        try {
          const cccResponse = await fetch(`https://campuscybercafe.com/api/data/?serviceID=${selectedProvider.serviceID}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          const cccData = await cccResponse.json();
          if (cccData.status === 'success' && cccData.data?.variations) {
            const cccBundles: DataBundle[] = cccData.data.variations.map((variation: any, index: number) => {
              const nameParts = variation.name.match(/([\d.]+[MG]B|Unlimited|Voice|.*?\d+GB|\d+MB|\d+TB)?\s*(?:-\s*(\d+\s*(?:day|month|year|hrs)|(?:Saturday|Sunday|night|30days)))?/i) || [];
              const dataAmount = nameParts[1] || variation.name.split('-')[1]?.trim() || variation.name;
              let validity = nameParts[2] || '';

              let category = '';
              if (validity === 'Saturday' || validity === 'Sunday' || variation.name.toLowerCase().includes('weekend')) {
                category = 'Weekend Plans';
                validity = 'Weekend';
              } else if (validity.toLowerCase().includes('night') || variation.name.toLowerCase().includes('night')) {
                category = 'Night Plans';
                validity = '11 PM - 5 AM';
              } else if (variation.name.toLowerCase().includes('unlimited') || variation.name.toLowerCase().includes('platinum')) {
                category = 'Unlimited Plans';
              } else {
                const days = parseInt(validity.match(/\d+/)?.[0] || '0', 10);
                if (['24 hrs', '48 hrs', '72 hrs'].includes(validity) || days <= 3) {
                  category = 'Daily Plans';
                } else if (days >= 5 && days <= 14) {
                  category = 'Weekly Plans';
                } else if (days >= 28 && days <= 60) {
                  category = 'Monthly Plans';
                } else {
                  category = 'Monthly Plans';
                }
              }

              let planType = '';
              if (variation.name.toLowerCase().includes('sme')) planType = 'SME';
              else if (variation.name.toLowerCase().includes('gifting')) planType = 'Gifting';
              else if (variation.name.toLowerCase().includes('corporate')) planType = 'Corporate Gifting';
              else if (variation.name.toLowerCase().includes('voice')) planType = 'Voice';
              else if (selectedProvider.serviceID.includes('sme')) planType = 'SME';
              else planType = 'Standard';

              if (!validity) {
                validity = planType ? planType : 'Not Specified';
              }

              return {
                id: fetchedBundles.length + index + 1,
                data: dataAmount,
                price: parseFloat((parseFloat(variation.amount) * 1.05).toFixed(2)),
                validity: validity,
                category: category,
                description: variation.name,
                variation_code: variation.code || variation.variation_code,
                planType: planType,
              };
            });
            fetchedBundles = [...fetchedBundles, ...cccBundles];
          }
        } catch (cccError) {
          console.warn('CampusCyberCafe API failed:', cccError);
        }

        if (fetchedBundles.length === 0) {
          throw new Error(`Failed to fetch ${selectedProvider.name} data plans from both APIs`);
        }

        setBundles(fetchedBundles);

        // Dynamically generate categories
        const uniqueCategories = Array.from(new Set(fetchedBundles.map(bundle => bundle.category)));
        const categoryOrder = ['Daily Plans', 'Weekly Plans', 'Monthly Plans', 'Weekend Plans', 'Night Plans', 'Unlimited Plans'];
        uniqueCategories.sort((a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b));
        setCategories(['Hot', ...uniqueCategories]);
      } catch (error: any) {
        console.error('Error fetching data:', error);
        setError(`Failed to load ${selectedProvider?.name || 'provider'} data plans or wallet balance.`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedProvider, lastPurchasedNumber]);

  const getProviderFromPhone = (phone: string): string => {
    const prefix = phone.slice(0, 4);
    const mtn = ['0803', '0806', '0703', '0706', '0813', '0816', '0810', '0814', '0903', '0906', '0913', '0916'];
    const glo = ['0805', '0807', '0705', '0815', '0811', '0905', '0915'];
    const airtel = ['0802', '0808', '0708', '0812', '0701', '0902', '0907', '0901', '0912'];
    const nineMobile = ['0809', '0817', '0818', '0909', '0908'];

    if (mtn.includes(prefix)) return 'MTN';
    if (glo.includes(prefix)) return 'Glo';
    if (airtel.includes(prefix)) return 'Airtel';
    if (nineMobile.includes(prefix)) return '9mobile';
    return '';
  };

  useEffect(() => {
    if (phoneNumber.length === 11 && selectedProvider) {
      const detectedProvider = getProviderFromPhone(phoneNumber);
      setNetworkProvider(detectedProvider === selectedProvider.name ? detectedProvider : '');
    } else {
      setNetworkProvider('');
    }
  }, [phoneNumber, selectedProvider]);

  const checkSimLoanStatus = async (phone: string): Promise<boolean> => {
    try {
      const response = await fetch('https://sandbox.vtpass.com/api/check-loan-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ billersCode: phone }),
      });
      const data = await response.json();
      return data.hasLoan || false;
    } catch (error) {
      console.error('Error checking loan status:', error);
      return false;
    }
  };

  const handlePurchase = async () => {
    if (!selectedBundle || !selectedProvider) {
      Alert.alert('Error', 'No bundle or provider selected');
      return;
    }

    if (phoneNumber.length !== 11) {
      Alert.alert('Error', 'Please enter a valid 11-digit phone number');
      return;
    }

    if (!transactionPin || transactionPin.length < 4 || transactionPin.length > 6) {
      Alert.alert('Error', 'Please enter a transaction PIN between 4 and 6 digits');
      return;
    }

    if (balance < selectedBundle.price) {
      Alert.alert('Error', 'Insufficient balance. Please fund your wallet.');
      return;
    }

    const hasLoan = await checkSimLoanStatus(phoneNumber);
    if (hasLoan) {
      Alert.alert('Error', 'Cannot purchase data plan due to an outstanding loan on this SIM.');
      setModalVisible(false);
      return;
    }

    setModalVisible(false);
    setTransactionModalVisible(true);
    setTransactionStatus('processing');

    try {
      const requestId = `DATA_PURCHASE_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

      const transactionData = {
        user_email: userEmail,
        amount: -selectedBundle.price,
        reference: requestId,
        status: 'pending',
        metadata: {
          purchase: `${selectedBundle.data} on ${selectedProvider.name}`,
          phone_number: phoneNumber,
          validity: selectedBundle.validity,
          payment_date: new Date().toISOString(),
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
        .select('id')
        .single();

      if (pendingTxError) {
        console.error('Pending transaction insert error:', pendingTxError.message);
        throw new Error('Failed to record pending transaction');
      }

      let purchasePayload: any = {
        request_id: requestId,
        serviceID: selectedProvider.serviceID,
        billersCode: phoneNumber,
        variation_code: selectedBundle.variation_code,
        amount: selectedBundle.price,
        phone: phoneNumber,
      };

      if (selectedProvider.serviceID === 'spectranet') {
        purchasePayload.billersCode = '1212121212';
      } else if (selectedProvider.serviceID === 'smile-direct') {
        const verifyResponse = await fetch('https://sandbox.vtpass.com/api/merchant-verify/smile/email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ billersCode: 'tester@sandbox.com' }),
        });
        const verifyData = await verifyResponse.json();
        if (verifyData.code !== '000') {
          throw new Error('Smile email verification failed');
        }
        purchasePayload.billersCode = 'tester@sandbox.com';
        purchasePayload.email = 'tester@sandbox.com';
      }

      const purchaseResponse = await fetch('https://sandbox.vtpass.com/api/pay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(purchasePayload),
      });

      const purchaseData = await purchaseResponse.json();

      if (purchaseData.code !== '000') {
        await supabase
          .from('transactions')
          .update({ status: 'failed' })
          .eq('id', pendingTx.id);
        setTransactionStatus('failed');
        Alert.alert('Error', 'Transaction failed. Please try again.');
        return;
      }

      const queryPayload = { request_id: requestId };
      const queryResponse = await fetch('https://sandbox.vtpass.com/api/requery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(queryPayload),
      });

      const queryData = await queryResponse.json();

      if (queryData.code !== '000' || queryData.content.transactions.status !== 'delivered') {
        await supabase
          .from('transactions')
          .update({ status: 'failed' })
          .eq('id', pendingTx.id);
        setTransactionStatus('failed');
        Alert.alert('Error', 'Transaction failed during verification. Please try again.');
        return;
      }

      const newBalance = balance - selectedBundle.price;
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
      setLastPurchasedNumber(phoneNumber);
      setLastPurchasedBundle(selectedBundle);
      setTransactionStatus('success');
      Alert.alert('Success', `Successfully purchased ${selectedBundle.data} on ${selectedProvider.name} for ₦${selectedBundle.price}.`);

      router.push({
        pathname: '/success',
        params: {
          id: pendingTx.id,
          provider: selectedProvider.name,
          data: selectedBundle.data,
          price: selectedBundle.price.toString(),
          date: new Date().toISOString(),
          status: 'Success',
          phoneNumber: phoneNumber,
          reference: requestId,
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

  const closeTransactionModal = () => {
    setTransactionModalVisible(false);
    setPhoneNumber('');
    setTransactionPin('');
    setSelectedBundle(null);
    setNetworkProvider('');
    setTransactionStatus('processing');
  };

  const closePurchaseModal = () => {
    setModalVisible(false);
    setPhoneNumber('');
    setTransactionPin('');
    setSelectedBundle(null);
    setNetworkProvider('');
  };

  const closeCreatePinModal = () => {
    setCreatePinModalVisible(false);
    setNewPin('');
    setConfirmPin('');
  };

  const handleCreatePin = () => {
    if (newPin.length < 4 || newPin.length > 6 || confirmPin.length < 4 || confirmPin.length > 6) {
      Alert.alert('Error', 'PIN must be between 4 and 6 digits.');
      return;
    }

    if (newPin !== confirmPin) {
      Alert.alert('Error', 'PINs do not match.');
      return;
    }

    setTransactionPin(newPin);
    setCreatePinModalVisible(false);
    setNewPin('');
    setConfirmPin('');
  };

  const goBackToProviders = () => {
    router.replace('/(app)/(protected)/providers');
  };

  const selectCategory = (category: string) => {
    setExpandedCategory(category);
    Animated.timing(scaleAnim, {
      toValue: 1.05,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  };

  const BundleCard: React.FC<{ bundle: DataBundle }> = ({ bundle }) => {
    const slideAnim = useRef(new Animated.Value(0)).current;

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
            setSelectedBundle(bundle);
            setModalVisible(true);
          }
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        },
      })
    ).current;

    return (
      <Animated.View
        key={bundle.id}
        {...panResponder.panHandlers}
        style={[{ transform: [{ translateX: slideAnim }] }]}
      >
        <View style={styles.bundleCard}>
          <View style={styles.bundleHeader}>
            <View style={styles.bundleInfo}>
              <Text style={styles.bundleTitle} numberOfLines={1} ellipsizeMode="tail">
                {bundle.data}
              </Text>
              <Text style={styles.bundleValidity}>{bundle.validity}</Text>
            </View>
            <Text style={styles.bundlePrice}>₦{bundle.price}</Text>
          </View>
          <Text style={styles.bundleDescription} numberOfLines={2} ellipsizeMode="tail">
            {bundle.description}
          </Text>
          {bundle.planType && (
            <Text style={styles.planTypeText}>{bundle.planType}</Text>
          )}
          {bundle.validity === 'Not Specified' && (
            <Text style={styles.warningText}>
              Note: Plan duration not specified. Confirm with provider.
            </Text>
          )}
          <View style={styles.bundleActions}>
            <MotiView
              from={{ scale: 1 }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ type: 'timing', duration: 1500 }}
            >
              <Pressable
                onPress={() => {
                  setSelectedBundle(bundle);
                  setModalVisible(true);
                }}
                style={styles.buyButton}
              >
                <Text style={styles.buyButtonText}>Click to Buy</Text>
              </Pressable>
            </MotiView>
            <View style={styles.swipeHint}>
              <Text style={styles.swipeText}>or swipe right</Text>
              <Ionicons name="arrow-forward" size={14} color="#ccc" />
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

  const getBundlesForCategory = (category: string) => {
    if (!bundles || !Array.isArray(bundles)) {
      return [];
    }
    if (category === 'Hot' && lastPurchasedBundle) {
      return bundles
        .filter((bundle) => {
          try {
            // Match bundles with the same planType and category as the last purchased bundle
            const isSamePlanType = bundle.planType === lastPurchasedBundle.planType;
            const isSameCategory = bundle.category === lastPurchasedBundle.category;
            // Parse data amounts for proximity check
            const lastDataValue = parseFloat(lastPurchasedBundle.data.match(/[\d.]+/)?.[0] || '0');
            const lastUnit = lastPurchasedBundle.data.match(/[MG]B/)?.[0] || '';
            const lastDataInMB = lastUnit === 'GB' ? lastDataValue * 1000 : lastDataValue;
            const bundleDataValue = parseFloat(bundle.data.match(/[\d.]+/)?.[0] || '0');
            const bundleUnit = bundle.data.match(/[MG]B/)?.[0] || '';
            const bundleDataInMB = bundleUnit === 'GB' ? bundleDataValue * 1000 : bundleDataValue;
            // Include bundles within ±50% of the last purchased data amount
            const isSimilarDataAmount =
              bundleDataInMB >= lastDataInMB * 0.5 && bundleDataInMB <= lastDataInMB * 1.5;
            return isSamePlanType && isSameCategory && isSimilarDataAmount;
          } catch (error) {
            console.error('Error processing bundle:', bundle, error);
            return false;
          }
        })
        .sort((a, b) => a.price - b.price)
        .slice(0, 5); // Limit to 5 bundles
    } else if (category === 'Hot') {
      // Fallback if no purchase history
      return bundles
        .filter((bundle) => {
          try {
            const dataValue = parseFloat(bundle.data.match(/[\d.]+/)?.[0] || '0');
            const unit = bundle.data.match(/[MG]B/)?.[0] || '';
            const dataInMB = unit === 'GB' ? dataValue * 1000 : dataValue;
            const pricePerMB = dataInMB ? bundle.price / dataInMB : Infinity;
            return (
              pricePerMB < 0.5 ||
              bundle.planType === 'SME' ||
              bundle.category === 'Unlimited Plans'
            );
          } catch (error) {
            console.error('Error processing bundle:', bundle, error);
            return false;
          }
        })
        .sort((a, b) => a.price - b.price)
        .slice(0, 5); // Limit to 5 bundles
    }
    return bundles
      .filter((bundle) => bundle.category === category)
      .sort((a, b) => a.price - b.price);
  };

  if (!selectedProvider) {
    return null;
  }

  const bundlesInCategory = getBundlesForCategory(expandedCategory);

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.providerHeader}>
          <Pressable onPress={goBackToProviders} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>
          <Image
            source={{ uri: selectedProvider.logo }}
            style={styles.providerLogo}
            resizeMode="contain"
          />
          <Text style={styles.providerName}>{selectedProvider.name} Data Bundles</Text>
        </View>

        <ScrollView
          horizontal
          style={styles.categoryBar}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryBarContent}
        >
          {categories.map((category) => (
            <Pressable
              key={category}
              onPress={() => selectCategory(category)}
              style={[
                styles.categoryButton,
                expandedCategory === category ? styles.selectedCategoryButton : {},
              ]}
            >
              <Text
                style={[
                  styles.categoryButtonText,
                  expandedCategory === category ? styles.selectedCategoryButtonText : {},
                ]}
              >
                {category === 'Hot' ? '🔥 Hot' : category}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {loading ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : categories.length === 0 ? (
          <Text style={styles.loadingText}>No categories available</Text>
        ) : bundlesInCategory.length === 0 ? (
          <Text style={styles.loadingText}>No bundles available for this category</Text>
        ) : (
          <View style={styles.bundleListContainer}>
            <Text style={styles.categoryHint}>Select a plan:</Text>
            <View
              style={styles.scrollViewWrapper}
              onLayout={(event) => setContainerHeight(event.nativeEvent.layout.height)}
            >
              <ScrollView
                ref={scrollViewRef}
                contentContainerStyle={styles.bundleList}
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={false}
                overScrollMode="never"
                removeClippedSubviews={true}
                onTouchStart={(e) => e.stopPropagation()}
                onContentSizeChange={(_, height) => setContentHeight(height)}
                onScroll={handleScroll}
                scrollEventThrottle={16}
              >
                {bundlesInCategory.map((bundle) => (
                  <BundleCard key={bundle.id} bundle={bundle} />
                ))}
              </ScrollView>
              <View style={styles.scrollBarTrack}>
                <Animated.View
                  style={[
                    styles.scrollBarHandle,
                    {
                      transform: [{ translateY: scrollBarAnim }],
                    },
                  ]}
                  {...scrollBarPanResponder.panHandlers}
                />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={{ zIndex: 1000 }}>
        <PurchaseModal
          visible={modalVisible}
          onClose={closePurchaseModal}
          selectedPlan={selectedBundle?.data || ''}
          phoneNumber={phoneNumber}
          setPhoneNumber={setPhoneNumber}
          transactionPin={transactionPin}
          setTransactionPin={setTransactionPin}
          networkProvider={networkProvider}
          hasTransactionPin={hasTransactionPin}
          showTransactionPin={showTransactionPin}
          setShowTransactionPin={setShowTransactionPin}
          onCreatePin={() => setCreatePinModalVisible(true)}
          onContinue={handlePurchase}
        />

        <TransactionStatusModal
          visible={transactionModalVisible}
          onClose={closeTransactionModal}
          transactionStatus={transactionStatus}
          selectedPlan={selectedBundle}
          phoneNumber={phoneNumber}
          networkProvider={networkProvider}
        />

        <CreatePinModal
          visible={createPinModalVisible}
          onClose={closeCreatePinModal}
          newPin={newPin}
          setNewPin={setNewPin}
          confirmPin={confirmPin}
          setConfirmPin={setConfirmPin}
          showNewPin={showNewPin}
          setShowNewPin={setShowNewPin}
          showConfirmPin={showConfirmPin}
          setShowConfirmPin={setShowConfirmPin}
          onSave={handleCreatePin}
        />
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    paddingTop: 48,
    paddingHorizontal: 16,
  },
  scrollViewContent: {
    paddingBottom: 50,
  },
  providerHeader: {
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
  },
  providerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 12,
  },
  categoryBar: {
    marginBottom: 16,
  },
  categoryBarContent: {
    paddingHorizontal: 4,
  },
  categoryButton: {
    backgroundColor: '#1E1E1E',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
  },
  selectedCategoryButton: {
    backgroundColor: '#3B82F6',
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A1A1AA',
  },
  selectedCategoryButtonText: {
    color: 'white',
  },
  categoryHint: {
    fontSize: 14,
    color: '#A1A1AA',
    marginBottom: 12,
  },
  bundleListContainer: {
    paddingVertical: 8,
  },
  scrollViewWrapper: {
    position: 'relative',
    flex: 1,
  },
  bundleList: {
    gap: 8,
    paddingBottom: 16,
    paddingRight: 16,
  },
  bundleCard: {
    backgroundColor: '#2D2D2D',
    borderRadius: 8,
    padding: 8,
    marginRight: 12,
  },
  bundleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  bundleInfo: {
    flex: 1,
    marginRight: 8,
  },
  bundleTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    flexShrink: 1,
  },
  bundleValidity: {
    fontSize: 10,
    color: '#A1A1AA',
    marginTop: 2,
  },
  bundlePrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'right',
  },
  bundleDescription: {
    fontSize: 10,
    color: '#A1A1AA',
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  planTypeText: {
    fontSize: 10,
    color: '#A1A1AA',
    marginBottom: 6,
    textAlign: 'left',
  },
  warningText: {
    fontSize: 10,
    color: '#FF4444',
    marginBottom: 6,
    textAlign: 'left',
  },
  bundleActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  buyButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  buyButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  swipeHint: {
    alignItems: 'center',
  },
  swipeText: {
    fontSize: 10,
    color: '#A1A1AA',
    marginBottom: 4,
  },
  loadingText: {
    fontSize: 16,
    color: '#A1A1AA',
    textAlign: 'center',
    marginTop: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#FF4444',
    textAlign: 'center',
    marginTop: 20,
  },
  scrollBarTrack: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 10,
    height: '100%',
    backgroundColor: '#3B82F6',
    opacity: 0.3,
    borderRadius: 5,
  },
  scrollBarHandle: {
    width: 10,
    height: 60,
    backgroundColor: '#3B82F6',
    borderRadius: 5,
  },
});

export default BuyDataScreen;