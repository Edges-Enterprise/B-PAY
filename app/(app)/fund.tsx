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
import { WebView } from 'react-native-webview';

type PaymentMethod = 'card' | 'bank_transfer';

const FundScreen = () => {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [showBankDetails, setShowBankDetails] = useState(false);
  const [bankDetails, setBankDetails] = useState<{
    account_number: string;
    bank_name: string;
    reference: string;
  } | null>(null);
  const [showWebView, setShowWebView] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);

  // Paystack test public key
  const PAYSTACK_PUBLIC_KEY = 'pk_test_766ebb286cc861a4807dd2e5b81e265e4778388f';

  // Listen for real-time transaction updates
  useEffect(() => {
    let subscription;

    if (bankDetails?.reference) {
      subscription = supabase
        .channel(`payment-confirm:${bankDetails.reference}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'transactions',
            filter: `reference=eq.${bankDetails.reference}`,
          },
          (payload) => {
            if (payload.new.status === 'success') {
              router.push({ pathname: '/wallet', params: { amount } });
            }
          }
        )
        .subscribe();
    }

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [bankDetails, amount]);

  // Fetch user data on load
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          throw new Error('User not authenticated');
        }
        if (!user.email) {
          throw new Error('User email not found');
        }
        if (!user.user_metadata?.username) {
          throw new Error('User username not found');
        }
        setUserEmail(user.email);
        setUserName(user.user_metadata.username);
      } catch (error) {
        console.error('Error fetching user data:', error);
        Alert.alert('Error', 'Failed to load user data. Please sign in again.');
        router.replace('/login');
      }
    };

    fetchUserData();
  }, []);

  const handlePresetAmount = (value: number) => {
    const currentAmount = amount ? parseFloat(amount) : 0;
    const newAmount = currentAmount + value;
    setAmount(newAmount.toString());
    setError('');
  };

  const sendTestReceipt = async (reference: string, amount: string, email: string) => {
    try {
      const receiptDetails = {
        to: email,
        subject: 'Payment Receipt',
        body: `
          Payment Receipt
          ----------------
          Reference: ${reference}
          Amount: ₦${parseFloat(amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
          Date: ${new Date().toLocaleString()}
          Status: Successful
          ----------------
          Thank you for your payment!
        `,
      };
      console.log('Sending receipt:', receiptDetails);
    } catch (error) {
      console.error('Error sending receipt:', error);
    }
  };

  const handleFundWallet = async () => {
    try {
      const parsedAmount = parseFloat(amount);
      if (!amount || isNaN(parsedAmount)) {
        setError('Please enter a valid amount');
        return;
      }
      if (parsedAmount < 500) {
        setError('Minimum funding amount is ₦500');
        return;
      }
      if (!userEmail) {
        throw new Error('User email is required');
      }
      if (!userName) {
        throw new Error('User username is required');
      }

      setIsProcessing(true);
      setError('');
      setPaymentMethod('card'); // Default to card payment
      setShowWebView(true);
    } catch (err) {
      console.error('Error:', err);
      Alert.alert('Error', err.message || 'An unexpected error occurred');
      setIsProcessing(false);
    }
  };

  const handleWebViewMessage = (event: any): void => {
    const data = event.nativeEvent.data;
    if (data.startsWith('payment-success:')) {
      const reference = data.split(':')[1];
      sendTestReceipt(reference, amount, userEmail);
      router.push({ pathname: '/wallet', params: { amount } }); // Navigate to /wallet with amount
    } else if (data === 'payment-cancelled') {
      Alert.alert('Cancelled', 'Payment was cancelled');
    } else if (data === 'payment-declined') {
      Alert.alert('Declined', 'Payment was declined');
    }
    setShowWebView(false);
    setIsProcessing(false);
  };

  const generatePaystackHTML = (): string => {
    const reference = `PS_${Date.now()}`;
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Paystack Payment</title>
        <script src="https://js.paystack.co/v1/inline.js"></script>
      </head>
      <body>
        <script>
          const paymentMethod = '${paymentMethod}';
          const handler = PaystackPop.setup({
            key: '${PAYSTACK_PUBLIC_KEY}',
            email: '${userEmail}',
            amount: ${parseFloat(amount) * 100},
            currency: 'NGN',
            channels: [paymentMethod],
            ref: '${reference}',
            metadata: {
              custom_fields: [
                {
                  display_name: "Mobile Payment",
                  variable_name: "mobile_payment",
                  value: "react-native-app"
                }
              ]
            },
            onClose: function() {
              window.ReactNativeWebView.postMessage('payment-cancelled');
            },
            callback: function(response) {
              window.ReactNativeWebView.postMessage('payment-success:' + response.reference);
            }
          });
          handler.openIframe();
        </script>
      </body>
      </html>
    `;
  };

  const copyAccountNumber = () => {
    if (bankDetails?.account_number) {
      console.log('Copied account number:', bankDetails.account_number);
      Alert.alert('Copied!', 'Account number copied to clipboard');
    }
  };

  const presetAmounts = [500, 1000, 5000, 10000];

  if (showWebView) {
    return (
      <WebView
        source={{ html: generatePaystackHTML() }}
        onMessage={handleWebViewMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        style={{ flex: 1 }}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000" />
          </View>
        )}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <View style={styles.inner}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back-outline" size={24} color="white" />
          </Pressable>
          <Text style={styles.title}>Fund Wallet 💰</Text>
          <Pressable>
            <Ionicons name="help-circle-outline" size={24} color="white" />
          </Pressable>
        </View>

        {!showBankDetails ? (
          <>
            {/* Balance Section */}
            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 300 }}
              style={styles.balanceContainer}
            >
              <Text style={styles.balanceLabel}>Balance (NGN)</Text>
              <Text style={styles.balanceText}>
                ₦{amount ? parseFloat(amount).toLocaleString('en-NG', { minimumFractionDigits: 2 }) : '0.00'}
              </Text>
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

            {/* Preset Amounts */}
            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 300, delay: 200 }}
              style={styles.presetContainer}
            >
              {presetAmounts.map((value) => (
                <Pressable
                  key={value}
                  onPress={() => handlePresetAmount(value)}
                  style={({ pressed }) => [
                    styles.presetButton,
                    { transform: [{ scale: pressed ? 0.95 : 1 }] },
                  ]}
                >
                  <Text style={styles.presetText}>₦{value.toLocaleString()}</Text>
                </Pressable>
              ))}
            </MotiView>

            {/* Top Up Button */}
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
                <Text style={styles.stepText}>Enter amount and click "Top Up Now"</Text>
              </View>
              <View style={styles.step}>
                <Text style={styles.stepNumber}>2</Text>
                <Text style={styles.stepText}>Select payment method and complete payment</Text>
              </View>
              <View style={styles.step}>
                <Text style={styles.stepNumber}>3</Text>
                <Text style={styles.stepText}>Wallet will be credited automatically</Text>
              </View>
            </MotiView>
          </>
        ) : (
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={styles.bankDetailsContainer}
          >
            <Text style={styles.bankTitle}>Bank Transfer Details</Text>
            <View style={styles.bankDetailRow}>
              <Text style={styles.bankLabel}>Bank:</Text>
              <Text style={styles.bankValue}>{bankDetails?.bank_name}</Text>
            </View>
            <View style={styles.bankDetailRow}>
              <Text style={styles.bankLabel}>Account No:</Text>
              <Text style={styles.bankValue}>{bankDetails?.account_number}</Text>
            </View>
            <Pressable
              onPress={copyAccountNumber}
              style={({ pressed }) => [
                styles.copyButton,
                { backgroundColor: pressed ? '#00C800' : '#00FF00' },
              ]}
            >
              <Text style={styles.copyButtonText}>Copy Account Number</Text>
            </Pressable>
          </MotiView>
        )}
      </View>
    </SafeAreaView>
  );
};

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
  bankDetailsContainer: {
    backgroundColor: '#2A3A3B',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  bankTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  bankDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  bankLabel: {
    color: '#888',
    fontSize: 14,
  },
  bankValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  copyButton: {
    backgroundColor: '#00FF00',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  copyButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A2526',
  },
});

export default FundScreen;