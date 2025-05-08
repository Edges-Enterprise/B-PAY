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
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
}

interface Provider {
  id: number;
  name: string;
  logo: string;
  bundles: DataBundle[];
}

// Sample data
const providers: Provider[] = [
  {
    id: 1,
    name: 'MTN',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4e/MTN_Group_logo.svg',
    bundles: [
      {
        id: 101,
        data: '1GB',
        price: 200,
        validity: '1 day',
        category: 'Daily',
        description: 'Perfect for light browsing and social media',
      },
      {
        id: 102,
        data: '500MB',
        price: 100,
        validity: '1 day',
        category: 'Daily',
        description: 'Basic browsing and messaging',
      },
    ],
  },
];

const categories: string[] = [
  'Daily',
  'Weekly',
  'Monthly',
  'Weekend',
  '2 Months',
  '4 Months',
  'Annual',
  'Bonanza',
  'Edge Network',
];

const BuyDataScreen: React.FC = () => {
  const router = useRouter();
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
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
  const [balance, setBalance] = useState<number>(0);
  const [userEmail, setUserEmail] = useState<string>('');
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const hasTransactionPin: boolean = true;

  // Fetch user data and wallet balance
  useEffect(() => {
    const fetchUserAndWallet = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user || !user.email) {
          console.error('User not authenticated or email missing');
          router.replace('/login');
          return;
        }

        setUserEmail(user.email);

        // Fetch wallet balance
        const { data: wallet, error: walletError } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_email', user.email)
          .single();

        if (walletError && walletError.code !== 'PGRST116') {
          throw walletError;
        }

        setBalance(wallet?.balance || 0);
      } catch (error) {
        console.error('Error fetching wallet data:', error);
        Alert.alert('Error', 'Failed to load wallet data.');
      }
    };

    fetchUserAndWallet();
  }, []);

  const getProviderFromPhone = (phone: string): string => {
    const prefix = phone.slice(0, 4);
    const mtn = ['0803', '0806', '0703', '0706', '0813', '0816', '0810', '0814', '0903', '0906', '0913', '0916'];
    const glo = ['0805', '0807', '0705', '0815', '0811', '0905', '0915'];
    const airtel = ['0802', '0808', '0708', '0812', '0701', '0902', '0907', '0901', '0912'];
    const etisalat = ['0809', '0817', '0818', '0909', '0908'];

    if (mtn.includes(prefix)) return 'MTN';
    if (glo.includes(prefix)) return 'GLO';
    if (airtel.includes(prefix)) return 'AIRTEL';
    if (etisalat.includes(prefix)) return '9MOBILE';
    return '';
  };

  useEffect(() => {
    if (phoneNumber.length === 11) {
      setNetworkProvider(getProviderFromPhone(phoneNumber));
    } else {
      setNetworkProvider('');
    }
  }, [phoneNumber]);

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

    setModalVisible(false);
    setTransactionModalVisible(true);
    setTransactionStatus('processing');

    try {
      // Record pending transaction
      const transactionData = {
        user_email: userEmail,
        amount: -selectedBundle.price,
        reference: `DATA_PURCHASE_${Date.now()}`,
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

      console.log('Inserting pending transaction:', JSON.stringify(transactionData, null, 2));

      const { data: pendingTx, error: pendingTxError } = await supabase
        .from('transactions')
        .insert(transactionData)
        .select('id')
        .single();

      if (pendingTxError) {
        console.error('Pending transaction insert error:', pendingTxError.message);
        throw new Error('Failed to record pending transaction');
      }

      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const isSuccess = Math.random() > 0.3;

      if (!isSuccess) {
        // Update transaction to failed
        const { error: updateError } = await supabase
          .from('transactions')
          .update({ status: 'failed' })
          .eq('id', pendingTx.id);

        if (updateError) {
          console.error('Failed transaction update error:', updateError.message);
          throw new Error('Failed to update transaction status');
        }

        setTransactionStatus('failed');
        Alert.alert('Error', 'Transaction failed. Please try again.');
        return;
      }

      // Deduct balance and update wallet
      const newBalance = balance - selectedBundle.price;
      const { error: walletUpdateError } = await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('user_email', userEmail);

      if (walletUpdateError) {
        // Update transaction to failed
        await supabase
          .from('transactions')
          .update({ status: 'failed' })
          .eq('id', pendingTx.id);
        throw new Error('Failed to update wallet balance');
      }

      // Update transaction to success
      const { error: successUpdateError } = await supabase
        .from('transactions')
        .update({ status: 'success' })
        .eq('id', pendingTx.id);

      if (successUpdateError) {
        console.error('Success transaction update error:', successUpdateError.message);
        throw new Error('Failed to update transaction status');
      }

      // Update state
      setBalance(newBalance);
      setLastPurchasedNumber(phoneNumber);
      setTransactionStatus('success');
      Alert.alert('Success', `Successfully purchased ${selectedBundle.data} on ${selectedProvider.name} for ₦${selectedBundle.price}.`);

      router.push({
        pathname: '/success',
        params: { plan: `${selectedBundle.data} on ${selectedProvider.name}`, amount: selectedBundle.price.toString() },
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

  const selectProvider = (provider: Provider) => {
    setSelectedProvider(provider);
    setExpandedCategory(null);
  };

  const goBackToProviders = () => {
    setSelectedProvider(null);
    setExpandedCategory(null);
  };

  const toggleCategory = (category: string) => {
    if (expandedCategory === category) {
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setExpandedCategory(null));
    } else {
      setExpandedCategory(category);
      Animated.timing(scaleAnim, {
        toValue: 1.05,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
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
            <View>
              <Text style={styles.bundleTitle}>{bundle.data}</Text>
              <Text style={styles.bundleValidity}>{bundle.validity}</Text>
            </View>
            <Text style={styles.bundlePrice}>₦{bundle.price}</Text>
          </View>
          <Text style={styles.bundleDescription}>{bundle.description}</Text>
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
              <Ionicons name="arrow-forward" size={16} color="#ccc" />
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

  if (selectedProvider) {
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

          {categories.map((category) => {
            const bundlesInCategory = selectedProvider.bundles.filter(
              (bundle) => bundle.category === category
            );
            if (bundlesInCategory.length === 0) return null;
            const isExpanded = expandedCategory === category;

            return (
              <Animated.View
                key={category}
                style={isExpanded ? { zIndex: 10, transform: [{ scale: scaleAnim }] } : {}}
              >
                <Pressable
                  onPress={() => toggleCategory(category)}
                  style={[
                    styles.categoryCard,
                    isExpanded ? styles.expandedCategory : styles.collapsedCategory,
                  ]}
                >
                  <View style={styles.categoryHeader}>
                    <Text style={styles.categoryTitle}>{category} Plans</Text>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color="white"
                    />
                  </View>
                  {isExpanded && (
                    <View style={styles.categoryContent}>
                      <Text style={styles.categoryHint}>Select a plan:</Text>
                      <View style={styles.bundleList}>
                        {bundlesInCategory.map((bundle) => (
                          <BundleCard key={bundle.id} bundle={bundle} />
                        ))}
                      </View>
                    </View>
                  )}
                </Pressable>
              </Animated.View>
            );
          })}
        </ScrollView>

        {/* Modals */}
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
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.selectProviderTitle}>📱 Select Data Provider</Text>
      <View style={styles.providerGrid}>
        {providers.map((provider) => (
          <Pressable
            key={provider.id}
            onPress={() => selectProvider(provider)}
            style={styles.providerCard}
          >
            <View style={styles.providerCardContent}>
              <Image
                source={{ uri: provider.logo }}
                style={styles.providerLogoLarge}
                resizeMode="contain"
              />
              <Text style={styles.providerCardName}>{provider.name}</Text>
            </View>
          </Pressable>
        ))}
      </View>
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
  scrollViewContent: {
    paddingBottom: 50,
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
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
  categoryCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  collapsedCategory: {
    backgroundColor: '#1E1E1E',
  },
  expandedCategory: {
    backgroundColor: '#2D2D2D',
  },
  categoryContent: {
    padding: 16,
  },
  categoryHint: {
    fontSize: 14,
    color: '#A1A1AA',
    marginBottom: 12,
  },
  bundleList: {
    gap: 12,
  },
  bundleCard: {
    backgroundColor: '#2D2D2D',
    borderRadius: 12,
    padding: 16,
  },
  bundleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bundleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  bundleValidity: {
    fontSize: 12,
    color: '#A1A1AA',
  },
  bundlePrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  bundleDescription: {
    fontSize: 14,
    color: '#A1A1AA',
    marginBottom: 12,
  },
  bundleActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  buyButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  buyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  swipeHint: {
    alignItems: 'center',
  },
  swipeText: {
    fontSize: 12,
    color: '#A1A1AA',
    marginBottom: 4,
  },
  selectProviderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 24,
  },
  providerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  providerCard: {
    width: '48%',
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  providerCardContent: {
    alignItems: 'center',
  },
  providerLogoLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'white',
    marginBottom: 12,
  },
  providerCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default BuyDataScreen;