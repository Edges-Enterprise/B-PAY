import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  Image,
  Animated,
  PanResponder,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';

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
      {
        id: 103,
        data: '2GB',
        price: 400,
        validity: '3 days',
        category: 'Weekly',
        description: 'Good for moderate usage',
      },
      {
        id: 104,
        data: '5GB',
        price: 1000,
        validity: '7 days',
        category: 'Weekly',
        description: 'For heavy users and streaming',
      },
      {
        id: 105,
        data: '10GB',
        price: 2000,
        validity: '30 days',
        category: 'Monthly',
        description: 'Full month of unlimited browsing',
      },
      {
        id: 106,
        data: '20GB',
        price: 3500,
        validity: '30 days',
        category: 'Monthly',
        description: 'Premium monthly package',
      },
      {
        id: 107,
        data: '3GB',
        price: 800,
        validity: '2 days',
        category: 'Weekend',
        description: 'Weekend special package',
      },
      {
        id: 108,
        data: '15GB',
        price: 3500,
        validity: '60 days',
        category: '2 Months',
        description: 'Two months of connectivity',
      },
      {
        id: 109,
        data: '30GB',
        price: 6000,
        validity: '120 days',
        category: '4 Months',
        description: 'Long-term value package',
      },
      {
        id: 110,
        data: '100GB',
        price: 15000,
        validity: '365 days',
        category: 'Annual',
        description: 'Year-round unlimited data',
      },
      {
        id: 111,
        data: '25GB',
        price: 5000,
        validity: '30 days',
        category: 'Bonanza',
        description: 'Limited time special offer',
      },
      {
        id: 112,
        data: '50GB',
        price: 10000,
        validity: '30 days',
        category: 'Edge Network',
        description: 'Exclusive high-speed network',
      },
    ],
  },
  // Add other providers similarly...
];

const categories = [
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

export default function BuyDataScreen() {
  const router = useRouter();
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [lastPurchasedNumber, setLastPurchasedNumber] = useState<string>('08012345678');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [selectedBundle, setSelectedBundle] = useState<DataBundle | null>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // WalletScreen-like logic
  const balance: number = 12300; // From WalletScreen
  const hasPriorDataPurchase: boolean = true; // Simulate prior purchase; replace with actual check

  // Handle purchase
  const handlePurchase = (bundle: DataBundle | null, useLastNumber: boolean = false) => {
    if (!bundle || !selectedProvider) return;

    const numberToUse = useLastNumber ? lastPurchasedNumber : phoneNumber;

    if (!numberToUse) {
      Alert.alert('Error', 'Please enter a phone number');
      return;
    }

    if (balance < bundle.price) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    if (!hasPriorDataPurchase && !password) {
      Alert.alert('Error', 'Please enter a password');
      return;
    }

    // Simulate payment processing (replace with API call)
    console.log(`Processing purchase: ${bundle.data} on ${selectedProvider.name} for ₦${bundle.price}`);

    // Update last purchased number if not using last number
    if (!useLastNumber) {
      setLastPurchasedNumber(numberToUse);
    }

    // Navigate to success page
    router.push({
      pathname: '/success',
      params: { plan: `${bundle.data} on ${selectedProvider.name}`, amount: bundle.price.toString() },
    });

    // Reset modal
    setModalVisible(false);
    setPhoneNumber('');
    setPassword('');
    setSelectedBundle(null);
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

  // Component for individual bundle card with independent swipe
  const BundleCard = ({ bundle }: { bundle: DataBundle }) => {
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
            handlePurchase(bundle, true); // Use last purchased number
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
        <View className="bg-gray-700 rounded-xl p-4">
          <View className="flex-row justify-between items-start mb-2">
            <View>
              <Text className="text-white text-lg font-bold">{bundle.data}</Text>
              <Text className="text-gray-400 text-sm">{bundle.validity}</Text>
            </View>
            <Text className="text-white text-lg font-bold">₦{bundle.price}</Text>
          </View>
          <Text className="text-gray-300 text-sm mb-3">{bundle.description}</Text>

          <View className="flex-row justify-between">
            <MotiView
              from={{ scale: 1 }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ loop: true, type: 'timing', duration: 1500 }}
            >
              <Pressable
                onPress={() => {
                  setSelectedBundle(bundle);
                  setModalVisible(true);
                }}
                className="bg-blue-600 px-4 py-2 rounded-lg"
              >
                <Text className="text-white">Click to Buy</Text>
              </Pressable>
            </MotiView>

            <View className="items-center">
              <Text className="text-gray-400 text-xs mb-1">or swipe right</Text>
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
        <ScrollView className="bg-black pt-12 px-4" contentContainerStyle={{ paddingBottom: 50 }}>
          {/* Back button and provider header */}
          <View className="flex-row items-center mb-6">
            <Pressable onPress={goBackToProviders} className="mr-3">
              <Ionicons name="arrow-back" size={24} color="white" />
            </Pressable>
            <Image
              source={{ uri: selectedProvider.logo }}
              className="w-10 h-10 rounded-full bg-white"
              resizeMode="contain"
            />
            <Text className="text-white text-xl font-bold ml-3">
              {selectedProvider.name} Data Bundles
            </Text>
          </View>

          {/* Categorized bundles */}
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
                  className={`mb-4 rounded-2xl overflow-hidden ${
                    isExpanded ? 'bg-gray-800 bg-opacity-70 backdrop-blur-md' : 'bg-gray-900'
                  }`}
                >
                  <View className="flex-row justify-between items-center p-4">
                    <Text className="text-white text-lg font-semibold">{category} Plans</Text>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color="white"
                    />
                  </View>

                  {isExpanded && (
                    <View className="p-4 pt-0">
                      <Text className="text-gray-400 mb-3">Select a plan:</Text>
                      <View className="space-y-3">
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

        {/* Modal for phone number and authentication with glassmorphism */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View className="flex-1 justify-center items-center bg-black bg-opacity-50">
            <View className="bg-gray-800/70 rounded-2xl p-6 w-11/12 max-w-md border border-white/20 shadow-lg">
              <Text className="text-white text-xl font-bold mb-4">Complete Purchase</Text>

              <Text className="text-white mb-2">Phone Number (+234)</Text>
              <TextInput
                className="bg-gray-700/50 text-white p-3 rounded-lg mb-4 border border-white/20"
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="8012345678"
                placeholderTextColor="#9CA3AF"
                maxLength={10}
              />

              {!hasPriorDataPurchase && (
                <>
                  <Text className="text-white mb-2">Password</Text>
                  <TextInput
                    className="bg-gray-700/50 text-white p-3 rounded-lg mb-4 border border-white/20"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter password"
                    placeholderTextColor="#9CA3AF"
                  />
                </>
              )}

              <View className="flex-row justify-between">
                <Pressable
                  onPress={() => {
                    setModalVisible(false);
                    setPhoneNumber('');
                    setPassword('');
                    setSelectedBundle(null);
                  }}
                  className="bg-gray-600/50 px-4 py-2 rounded-lg border border-white/20"
                >
                  <Text className="text-white">Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => handlePurchase(selectedBundle)}
                  className="bg-blue-600/70 px-4 py-2 rounded-lg border border-white/20"
                >
                  <Text className="text-white">Confirm</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  return (
    <ScrollView className="bg-black pt-12 px-4">
      <Text className="text-white text-xl font-bold mb-6">📱 Select Data Provider</Text>

      <View className="flex-row flex-wrap justify-between">
        {providers.map((provider) => (
          <Pressable
            key={provider.id}
            onPress={() => selectProvider(provider)}
            className="w-[48%] bg-gray-900 rounded-2xl p-4 mb-4 active:opacity-80"
          >
            <View className="items-center">
              <Image
                source={{ uri: provider.logo }}
                className="w-16 h-16 rounded-full bg-white mb-3"
                resizeMode="contain"
              />
              <Text className="text-white text-lg font-semibold">{provider.name}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}