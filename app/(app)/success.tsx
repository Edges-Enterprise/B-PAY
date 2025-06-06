import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView, Text, Pressable, StyleSheet, Animated, PanResponder, View } from 'react-native';
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

  // Generate a new reference ID when component mounts
  useEffect(() => {
    const generateReferenceId = async () => {
      const randomBytes = await Crypto.randomUUID();
      setNewReferenceId(`ref_${randomBytes.replace(/-/g, '').substring(0, 16)}`);
    };
    generateReferenceId();
  }, []);

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
        dateStyle: 'long',
        timeStyle: 'medium',
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
        return 'Airtime Amount';
      case 'cable':
        return 'Cable Subscription';
      case 'electricity':
        return 'Electricity Units';
      default:
        return 'Purchase';
    }
  };

  const getPurchaseDescription = (): string => {
    const actionType = parsedMetadata?.type?.toLowerCase() || 'purchase';
    switch (actionType) {
      case 'data':
        return data ? `${data} Data` : 'Data Purchase';
      case 'airtime':
        return data ? `${data} Airtime` : 'Airtime Purchase';
      case 'cable':
        return data ? `${data} Subscription` : 'Cable Subscription';
      case 'electricity':
        return data ? `${data} Units` : 'Electricity Purchase';
      default:
        return 'Purchase';
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
      <Animated.View {...panHandler.panHandlers} style={{ transform: [{ translateX: slideAnimation }] }}>
        <MotiView
          from={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 10 }}
          style={styles.iconContainer}
        >
          <Ionicons name="checkmark-circle" size={60} color="#00cc66" />
        </MotiView>

        <Text style={styles.title}>
          Congratulations 🎉 {userName}!
        </Text>

        <Text style={styles.subtitle}>
          You have successfully 🔥 purchased {getPurchaseDescription()}!
        </Text>

        <View style={styles.card}>
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{getPurchaseLabel()}</Text>
              <Text style={styles.detailValue} numberOfLines={1} ellipsizeMode="tail">{data}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Provider</Text>
              <Text style={styles.detailValue} numberOfLines={1} ellipsizeMode="tail">{provider}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Amount</Text>
              <Text style={styles.detailValue} numberOfLines={1} ellipsizeMode="tail">{formatAmount(price)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Payment</Text>
              <Text style={styles.detailValue} numberOfLines={1} ellipsizeMode="tail">{parsedMetadata?.payment_method || 'N/A'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Phone</Text>
              <Text style={styles.detailValue} numberOfLines={1} ellipsizeMode="tail">{phoneNumber}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Validity</Text>
              <Text style={styles.detailValue} numberOfLines={1} ellipsizeMode="tail">{parsedMetadata?.validity || 'N/A'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Balance</Text>
              <Text style={styles.detailValue} numberOfLines={1} ellipsizeMode="tail">{formatBalance(balance)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Reference</Text>
              <Text style={styles.detailValue} numberOfLines={2} ellipsizeMode="tail">{reference}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue} numberOfLines={2} ellipsizeMode="tail">{formatDate(date)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.swipe}>
          <Text style={styles.swipeText}>Slide right to purchase again.</Text>
          <Ionicons name="arrow-forward" size={14} color="#A1A1AA" />
        </View>

        <Pressable style={styles.button} onPress={() => router.replace('/(app)/wallet')}>
          <Text style={styles.buttonText}>Back to Wallet</Text>
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    padding: 16,
    paddingTop: 20,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00cc66',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#A1A1AA',
    textAlign: 'center',
    marginBottom: 12,
  },
  card: {
    width: '90%',
    borderWidth: 2,
    borderColor: '#8B4513',
    borderRadius: 5,
    backgroundColor: '#1E1E1E',
    marginBottom: 12,
    padding: 10,
  },
  detailsContainer: {
    padding: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A1A1AA',
    flex: 1,
    flexShrink: 1,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
    textAlign: 'right',
    maxWidth: '50%',
    flex: 1,
    flexWrap: 'wrap',
  },
  swipe: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  swipeText: {
    fontSize: 14,
    color: '#A1A1AA',
    marginRight: 6,
  },
  button: {
    backgroundColor: '#00cc66',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});