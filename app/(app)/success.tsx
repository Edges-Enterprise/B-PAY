import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView, Text, Pressable, StyleSheet, Animated, PanResponder, View, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useRef, useEffect, useState } from 'react';
import { supabase } from '@/config/supabase';
import * as Crypto from 'expo-crypto';

interface Metadata {
  validity: string;
  payment_method: string;
  type: string;
  actual_cost: number;
}

export default function SuccessScreen() {
  const {
    id,
    provider,
    data,
    price,
    date,
    status,
    phoneNumber,
    reference,
    metadata,
  } = useLocalSearchParams<{
    id?: string;
    provider?: string;
    data?: string;
    price?: string;
    date?: string;
    status?: string;
    phoneNumber?: string;
    reference?: string;
    metadata?: string;
  }>();

  const [userName, setUserName] = useState<string>('User');
  const [balance, setBalance] = useState<string>('N/A');
  const [parsedMetadata, setParsedMetadata] = useState<Metadata | null>(null);
  const [newReferenceId, setNewReferenceId] = useState<string>('');

  // Pulse animation for the button
  const pulseAnimation = useRef(new Animated.Value(1)).current;

  // Get screen width for dynamic GIF sizing
  const screenWidth = Dimensions.get('window').width;

  // Generate a new reference ID when component mounts
  useEffect(() => {
    const generateReferenceId = async () => {
      const randomBytes = await Crypto.randomUUID();
      setNewReferenceId(`ref_${randomBytes.replace(/-/g, '').substring(0, 16)}`);
    };
    generateReferenceId();
  }, []);

  // Start pulse animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnimation]);

  // Log received params for debugging
  useEffect(() => {
    console.log('SuccessScreen received params:', {
      id,
      provider,
      data,
      price,
      date,
      status,
      phoneNumber,
      reference,
      metadata,
    });
  }, [id, provider, data, price, date, status, phoneNumber, reference, metadata]);

  // Parse metadata
  useEffect(() => {
    if (metadata) {
      try {
        const parsed = JSON.parse(metadata) as Metadata;
        setParsedMetadata(parsed);
        console.log('Parsed metadata:', parsed);
      } catch (error) {
        console.error('Error parsing metadata:', error);
      }
    }
  }, [metadata]);

  // Fetch userName and balance from Supabase
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Fetch user email from auth session
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.email) {
          console.warn('No user email found');
          return;
        }

        // Fetch userName
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('username')
          .eq('email', user.email)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error fetching user name:', profileError);
        } else if (profile?.username) {
          setUserName(profile.username);
        }

        // Fetch balance
        const { data: wallet, error: walletError } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_email', user.email)
          .single();

        if (walletError && walletError.code !== 'PGRST116') {
          console.error('Error fetching wallet balance:', walletError);
        } else if (wallet?.balance) {
          setBalance(wallet.balance.toString());
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, []);

  const slideAnimation = useRef(new Animated.Value(0)).current;
  const panHandler = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (_, gesture) => {
        if (gesture.dx > 0) {
          slideAnimation.setValue(gesture.dx);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > 100) {
          handlePurchaseAgain();
        }
        Animated.spring(slideAnimation, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const formatAmount = (value: string | undefined): string => {
    if (!value || isNaN(parseFloat(value))) return 'N/A';
    return parseFloat(value).toLocaleString('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatBalance = (value: string | undefined): string => {
    if (!value || isNaN(parseFloat(value))) return 'N/A';
    return parseFloat(value).toLocaleString('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (dateStr: string | undefined): string => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString('en-US', {
        timeZone: 'Africa/Lagos',
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const getPurchaseLabel = (): string => {
    const actionType = parsedMetadata?.type?.toLowerCase() || 'purchase';
    switch (actionType) {
      case 'data':
        return 'Data Plan';
      case 'airtime':
        return 'Airtime';
      case 'cable':
        return 'Cable Subscription';
      case 'electricity':
        return 'Electricity Units';
      default:
        return 'Item';
    }
  };

  const getPurchaseDescription = (): string => {
    const actionType = parsedMetadata?.type?.toLowerCase() || 'purchase';
    switch (actionType) {
      case 'data':
        return data ? `${data} Data` : 'Data Purchase';
      case 'airtime':
        return data ? `${data}` : 'Airtime Purchase';
      case 'cable':
        return data ? `${data} Subscription` : 'Cable Subscription';
      case 'electricity':
        return data ? `${data} Units` : 'Electricity Purchase';
      default:
        return data || 'Purchase';
    }
  };

  const handlePurchaseAgain = () => {
    if (!newReferenceId) return;
    
    const actionType = parsedMetadata?.type?.toLowerCase() || 'services';
    const params = {
      provider: provider || '',
      data: data || '',
      price: price || '',
      phoneNumber: phoneNumber || '',
      reference: newReferenceId,
      metadata: metadata || '',
    };

    switch (actionType) {
      case 'data':
        router.replace({
          pathname: '/(app)/confirm-purchase',
          params: { ...params, type: 'data' },
        });
        break;
      case 'airtime':
        router.replace({
          pathname: '/(app)/confirm-purchase',
          params: { ...params, type: 'airtime' },
        });
        break;
      case 'cable':
        router.replace({
          pathname: '/(app)/confirm-purchase',
          params: { ...params, type: 'cable' },
        });
        break;
      case 'electricity':
        router.replace({
          pathname: '/(app)/confirm-purchase',
          params: { ...params, type: 'electricity' },
        });
        break;
      default:
        router.replace('/(app)/services');
    }
  };

  // Validate required params
  const missingParams = !data || !price || !provider || !status || !phoneNumber || !reference || !parsedMetadata;
  if (missingParams) {
    console.warn('Missing required params:', {
      data,
      price,
      provider,
      status,
      phoneNumber,
      reference,
      metadata: parsedMetadata,
    });
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Error</Text>
        <Text style={styles.subtitle}>Unable to display purchase details. Please try again.</Text>
        <Pressable
          onPress={() => router.replace('/(app)/services')}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Back to Services</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View {...panHandler.panHandlers} style={{ transform: [{ translateX: slideAnimation }], flex: 1 }}>
        <Text style={styles.title}>
          Congratulations 🎉 {userName}!
        </Text>

        <Text style={styles.subtitle}>
          You have successfully purchased {getPurchaseDescription()}!
        </Text>

        <View style={styles.card}>
          {/* Header Section for Key Purchase Details */}
          <View style={styles.purchaseHeader}>
            <Text style={styles.purchaseTitle}>{getPurchaseDescription()}</Text>
            <Text style={styles.purchaseProvider}>{provider}</Text>
            <Text style={styles.purchaseAmount}>{formatAmount(price)}</Text>
          </View>
          <View style={styles.divider} />
          {/* Secondary Details */}
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Phone</Text>
              <Text style={styles.detailValue}>{phoneNumber}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Payment</Text>
              <Text style={styles.detailValue}>{parsedMetadata?.payment_method || 'N/A'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Validity</Text>
              <Text style={styles.detailValue}>{parsedMetadata?.validity || 'N/A'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Balance</Text>
              <Text style={styles.detailValue}>{formatBalance(balance)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>{formatDate(date)}</Text>
            </View>
            <View style={[styles.detailRow, styles.fullWidthRow]}>
              <Text style={styles.detailLabel}>Reference</Text>
              <Text style={styles.detailValue}>{reference}</Text>
            </View>
          </View>
        </View>

        <View style={styles.swipe}>
          <Text style={styles.swipeText}>Slide right to purchase again</Text>
          <Ionicons name="arrow-forward" size={12} color="#A1A1AA" />
        </View>

        <Animated.View style={[styles.button, { transform: [{ scale: pulseAnimation }] }]}>
          <Pressable onPress={() => router.replace('/(app)/wallet')}>
            <Text style={styles.buttonText}>Back to Wallet</Text>
          </Pressable>
        </Animated.View>

        {/* Adjusted: Moved GIF to footer bottom with MotiView for animation */}
        <MotiView
          from={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.8 }} // Adjusted: Reduced opacity for blending with background
          transition={{ type: 'spring', damping: 10 }}
          style={styles.footerGifContainer}
        >
          <Image
            source={require('../../assets/images/celebration.gif')}
            style={[styles.celebrationGif, { width: screenWidth }]} // Adjusted: Full screen width
            resizeMode="cover" // Adjusted: Changed to cover to fill the width while maintaining aspect ratio
          />
        </MotiView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: '100%',
    backgroundColor: '#000000',
    padding: 8,
    justifyContent: 'space-between', // Adjusted: Ensures content is spaced with GIF at bottom
    alignItems: 'center',
  },
  // Adjusted: New style for footer GIF container
  footerGifContainer: {
    position: 'absolute',
    bottom: 0, // Adjusted: Pins GIF to the bottom of the SafeAreaView
    left: 0,
    right: 0,
    alignItems: 'center',
    // Tweak this margin if you need to adjust the GIF's position relative to the bottom edge
    marginBottom: 0,
  },
  celebrationGif: {
    height: 100, // Adjusted: Fixed height to maintain aspect ratio; tweak this value to adjust GIF size
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00cc66',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#A1A1AA',
    textAlign: 'center',
    marginBottom: 8,
  },
  card: {
    width: '95%',
    borderWidth: 1,
    borderColor: '#8B4513',
    borderRadius: 6,
    backgroundColor: '#1E1E1E',
    height: 'auto', // Fit content
  },
  purchaseHeader: {
    padding: 8,
    backgroundColor: '#2F2F2F',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  purchaseTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  purchaseProvider: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00cc66',
    marginBottom: 2,
  },
  purchaseAmount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  divider: {
    height: 1,
    backgroundColor: '#4A4A4A',
    marginVertical: 4,
  },
  detailsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    justifyContent: 'space-between',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '48%',
    marginBottom: 4,
  },
  fullWidthRow: {
    width: '100%', // Reference row takes full width
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#A1A1AA',
    flex: 1,
  },
  detailValue: {
    fontSize: 10,
    fontWeight: '500',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'right',
  },
  swipe: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  swipeText: {
    fontSize: 12,
    color: '#A1A1AA',
    marginRight: 4,
  },
  button: {
    backgroundColor: '#00cc66',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    width: '80%',
    alignItems: 'center',
    // Adjusted: Added margin to prevent overlap with GIF; tweak this value to adjust spacing
    marginBottom: 108, // Slightly more than GIF height to account for SafeAreaView padding
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});