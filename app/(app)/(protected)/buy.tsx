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
  StyleSheet,
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
      // ... other bundles ...
    ],
  },
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

  const balance: number = 12300; // From WalletScreen
  const hasPriorDataPurchase: boolean = true; // Simulate prior purchase; replace with actual check

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
    console.log(`Processing purchase: ${bundle.data} on ${selectedProvider.name} for ₦${bundle.price}`);
    if (!useLastNumber) {
      setLastPurchasedNumber(numberToUse);
    }
    router.push({
      pathname: '/success',
      params: { plan: `${bundle.data} on ${selectedProvider.name}`, amount: bundle.price.toString() },
    });
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
              transition={{ loop: true, type: 'timing', duration: 1500 }}
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
          {/* Back button and provider header */}
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
        {/* Modal for phone number and authentication */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Complete Purchase</Text>
              <Text style={styles.modalLabel}>Phone Number (+234)</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="8012345678"
                placeholderTextColor="#9CA3AF"
                maxLength={10}
              />
              {!hasPriorDataPurchase && (
                <>
                  <Text style={styles.modalLabel}>Password</Text>
                  <TextInput
                    style={styles.modalInput}
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter password"
                    placeholderTextColor="#9CA3AF"
                  />
                </>
              )}
              <View style={styles.modalActions}>
                <Pressable
                  onPress={() => {
                    setModalVisible(false);
                    setPhoneNumber('');
                    setPassword('');
                    setSelectedBundle(null);
                  }}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => handlePurchase(selectedBundle)}
                  style={styles.confirmButton}
                >
                  <Text style={styles.confirmButtonText}>Confirm</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
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
}

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
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 14,
    color: 'white',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#2D2D2D',
    color: 'white',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    backgroundColor: '#4B5563',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  confirmButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
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