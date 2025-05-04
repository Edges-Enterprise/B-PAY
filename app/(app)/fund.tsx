import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/providers/AuthProvider';



export default function FundScreen() {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { session, user, loading: authLoading } = useAuth();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !session) {
      router.replace('/sign-in');
    }
  }, [session, authLoading]);

  // Fetch initial wallet balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (!user?.id) return;
      try {
        const { data, error } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;
        setWalletBalance(data?.balance || 0);
      } catch (err) {
        console.error('Error fetching balance:', err);
      }
    };

    fetchBalance();
  }, [user?.id]);

  const handleFundWallet = async () => {
    try {
      const parsedAmount = parseFloat(amount);

      // Basic validation
      if (!amount || isNaN(parsedAmount)) {
        setError('Please enter a valid amount');
        return;
      }
      if (parsedAmount < 500) {
        setError('Minimum funding amount is ₦500');
        return;
      }

      if (!user?.email || !session) {
        Alert.alert('Authentication Required', 'Please sign in to continue');
        router.replace('/sign-in');
        return;
      }

      setIsProcessing(true);
      setError('');

      const { data, error: paymentError } = await supabase.functions.invoke(
        'initiate-payment',
        {
          body: {
            amount: parsedAmount,
            email: user.email
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (paymentError) {
        throw new Error(paymentError.message || 'Payment failed');
      }

      if (!data?.authorization_url) {
        throw new Error('No payment URL received');
      }

      router.push({
        pathname: '/(app)/(protected)/payment-webview',
        params: {
          paymentUrl: data.authorization_url,
          callbackUrl: 'edgesnetwork://payment-callback',
          amount: parsedAmount.toString(),
          reference: data.reference
        },
      });

      // Update balance optimistically
      setWalletBalance(prev => prev + parsedAmount);
      setAmount('');

    } catch (err: any) {
      console.error('Payment error:', err);
      Alert.alert('Payment Error', err.message || 'Failed to initiate payment');
    } finally {
      setIsProcessing(false);
    }
  };

  // Show loading state while checking auth
  if (authLoading || !session) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00FF00" />
        </View>
      </SafeAreaView>
    );
  }


}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A2526',
    paddingTop: Platform.OS === 'android' ? 30 : 0,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Platform.OS === 'android' ? 20 : 10,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  balanceContainer: {
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 4,
  },
  balanceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  pendingBalance: {
    fontSize: 14,
    color: '#00FF00',
    marginTop: 4,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A3A3B',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3A4A4B',
  },
  input: {
    flex: 1,
    color: '#fff',
    padding: 12,
    fontSize: 16,
  },
  clearButton: {
    padding: 8,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 4,
  },
  presetContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  presetButton: {
    backgroundColor: '#2A3A3B',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 8,
    width: '22%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3A4A4B',
  },
  presetText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  buttonContainer: {
    marginBottom: 16,
  },
  fundButton: {
    backgroundColor: '#00FF00',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  fundButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
    textTransform: 'uppercase',
  },
  stepsContainer: {
    marginBottom: 20,
  },
  stepsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#00FF00',
    marginRight: 8,
    width: 24,
    textAlign: 'center',
  },
  stepText: {
    fontSize: 14,
    color: '#888',
    flex: 1,
    lineHeight: 20,
  },
});