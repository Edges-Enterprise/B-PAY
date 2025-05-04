import { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Platform, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '@/config/supabase';

export default function FundScreen() {
  const router = useRouter();
  const [amount, setAmount] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        
        if (user) {
          setUserEmail(user.email || '');
          setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'User');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        Alert.alert('Error', 'Failed to load user data');
      }
    };
    
    fetchUserData();
  }, []);

  const handleFundWallet = async () => {
    try {
      const parsedAmount = parseFloat(amount);
      
      // Validation
      if (!amount || isNaN(parsedAmount)) {
        setError('Please enter a valid amount');
        return;
      }
      if (parsedAmount < 500) {
        setError('Minimum funding amount is ₦500');
        return;
      }
      
      setIsProcessing(true);
      setError('');
  
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Please sign in to continue');
      }
  
      // Initiate payment with auth header
      const { data, error: paymentError } = await supabase.functions.invoke(
        'initiate-payment',
        {
          body: {
            amount: parsedAmount,
            email: userEmail,
            name: userName
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        }
      );
  
      if (paymentError) {
        console.error('Payment initiation error:', paymentError);
        throw new Error(paymentError.message || 'Failed to initiate payment');
      }
  
      if (!data?.authorization_url) {
        throw new Error('No payment URL received');
      }
  
      // Navigate to payment webview
      router.push({
        pathname: '/payment-webview',
        params: {
          paymentUrl: data.authorization_url,
          callbackUrl: 'edgesnetwork://payment-callback',
          amount: parsedAmount.toString(),
          reference: data.reference
        }
      });
  
    } catch (err) {
      console.error('Payment error:', err);
      Alert.alert(
        'Payment Error', 
        err.message || 'Failed to initiate payment. Please try again.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  
  const presetAmounts: number[] = [500, 1000, 5000, 10000];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <View style={styles.inner}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back-outline" size={24} color="white" />
          </Pressable>
          <Text style={styles.title}>Fund Wallet 💰</Text>
          <Pressable>
            <Ionicons name="help-circle-outline" size={24} color="white" />
          </Pressable>
        </View>

        {/* Balance Display */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 300 }}
          style={styles.balanceContainer}
        >
          <Text style={styles.balanceLabel}>Balance (NGN)</Text>
          <Text style={styles.balanceText}>₦{amount ? parseFloat(amount).toLocaleString('en-NG', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }) : '0.00'}</Text>
        </MotiView>

        {/* Amount Input */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 300, delay: 100 }}
          style={styles.inputContainer}
        >
          <Text style={styles.label}>Amount (NGN)</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Min 500"
              placeholderTextColor="#666"
              keyboardType="numeric"
              value={amount}
              onChangeText={(text) => {
                setAmount(text.replace(/[^0-9.]/g, ''));
                setError('');
              }}
            />
            {amount ? (
              <Pressable onPress={() => setAmount('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color="#666" />
              </Pressable>
            ) : null}
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </MotiView>

        {/* Preset Amount Buttons */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 300, delay: 200 }}
          style={styles.presetContainer}
        >
          {presetAmounts.map((value) => (
            <Pressable
              key={value}
              onPress={() => setAmount(value.toString())}
              style={({ pressed }) => [
                styles.presetButton,
                { transform: [{ scale: pressed ? 0.95 : 1 }] },
              ]}
            >
              <Text style={styles.presetText}>₦{value.toLocaleString()}</Text>
            </Pressable>
          ))}
        </MotiView>

        {/* Fund Button */}
        <MotiView
          from={{ scale: 1 }}
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ loop: true, type: 'timing', duration: 1500 }}
          style={styles.buttonContainer}
        >
          <Pressable 
            onPress={handleFundWallet} 
            style={styles.fundButton}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.fundButtonText}>Top Up Now</Text>
            )}
          </Pressable>
        </MotiView>

        {/* Payment Steps */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 300, delay: 300 }}
          style={styles.stepsContainer}
        >
          <Text style={styles.stepsTitle}>Payment Steps</Text>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>1</Text>
            <Text style={styles.stepText}>
              Enter amount and click "Top Up Now"
            </Text>
          </View>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>2</Text>
            <Text style={styles.stepText}>
              Complete payment via Paystack
            </Text>
          </View>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>3</Text>
            <Text style={styles.stepText}>
              Wallet will be credited automatically (10% fee applies)
            </Text>
          </View>
        </MotiView>
      </View>
    </SafeAreaView>
  );
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