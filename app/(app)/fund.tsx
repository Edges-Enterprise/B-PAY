import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  SafeAreaView,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { MotiView } from 'moti';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '@/config/supabase';
import { WebView } from 'react-native-webview';
import { v4 as uuidv4 } from 'uuid';
import 'react-native-get-random-values';

const { width, height } = Dimensions.get('window');

const FundScreen = () => {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showWebView, setShowWebView] = useState(false);
  const [paymentReference, setPaymentReference] = useState('');
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);

  useEffect(() => {
    console.log('Environment variables:', {
      PAYSTACK_PUBLIC_KEY: process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY ? 'Set (pk_...)' : 'Missing',
      SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || 'Missing',
      SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? 'Set (eyJ...)' : 'Missing',
    });
    if (!process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY || !process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY.startsWith('pk_')) {
      Alert.alert('Error', 'Invalid Paystack configuration.');
      setIsUserLoading(false);
    }
    if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
      Alert.alert('Error', 'Supabase configuration missing.');
      setIsUserLoading(false);
    }
  }, []);

  useEffect(() => {
    console.log('showWebView:', showWebView);
  }, [showWebView]);

  const fetchUserData = async () => {
    try {
      console.log('Refreshing session');
      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
      if (sessionError || !session) {
        throw new Error(`Session refresh failed: ${sessionError?.message || 'No session'}`);
      }
      console.log('Fetching user');
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error(`User fetch failed: ${authError?.message || 'No user'}`);
      }
      if (!user.email) {
        throw new Error('User email missing');
      }
      if (!user.user_metadata?.username) {
        throw new Error('User username missing');
      }
      setUserEmail(user.email);
      setUserName(user.user_metadata.username);
      setUserId(user.id);
      console.log('User data:', { email: user.email, username: user.user_metadata.username, id: user.id });
      await fetchWalletBalance(user.email);
    } catch (error) {
      console.error('fetchUserData error:', { message: error.message, stack: error.stack });
      Alert.alert('Error', 'Session expired. Please sign in again.');
      router.replace('/sign-in');
    } finally {
      setIsUserLoading(false);
    }
  };

  const fetchWalletBalance = async (email: string) => {
    try {
      console.log('Fetching wallet balance:', email);
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_email', email)
        .single();
      if (walletError && walletError.code !== 'PGRST116') {
        throw new Error(`Wallet query failed: ${walletError.message}`);
      }
      setWalletBalance(wallet?.balance || 0);
      console.log('Wallet balance:', wallet?.balance || 0);
    } catch (error) {
      console.error('fetchWalletBalance error:', { message: error.message });
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    let subscription;
    if (paymentReference) {
      console.log('Subscribing to transaction updates:', paymentReference);
      subscription = supabase
        .channel(`payment-confirm:${paymentReference}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'transactions',
            filter: `reference=eq.${paymentReference}`,
          },
          async (payload) => {
            console.log('Real-time update:', {
              reference: paymentReference,
              status: payload.new.status,
              metadata: payload.new.metadata,
            });
            if (payload.new.status === 'success') {
              setShowWebView(false);
              setIsLoading(false);
              setPaymentReference('');
              await fetchWalletBalance(userEmail);
              await sendTestReceipt(paymentReference, amount, userEmail);
              Alert.alert('Success', 'Transaction completed!');
              router.push('/wallet');
            } else if (payload.new.status === 'failed') {
              setShowWebView(false);
              setIsLoading(false);
              setPaymentReference('');
              Alert.alert('Error', `Transaction failed: ${payload.new.metadata?.error || 'Unknown error'}`);
            }
          }
        )
        .subscribe((status) => {
          console.log('Subscription status:', { reference: paymentReference, status });
          if (status !== 'SUBSCRIBED') {
            console.error('Subscription failed:', { reference: paymentReference, status });
            Alert.alert('Error', 'Failed to monitor transaction.');
            setIsLoading(false);
            setShowWebView(false);
            setPaymentReference('');
          }
        });
    }

    return () => {
      if (subscription) {
        console.log('Unsubscribing:', paymentReference);
        supabase.removeChannel(subscription);
      }
    };
  }, [paymentReference, userEmail]);

  const verifyTransaction = async (reference: string, expectedAmount: number, retries = 3): Promise<boolean> => {
    try {
      console.log('Verifying transaction:', { reference, expectedAmount, retries });
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/verify-paystack-transaction`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ reference, expectedAmount }),
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      console.log('Verify response:', { status: response.status, ok: response.ok });
      const data = await response.json();
      console.log('Verify data:', data);

      if (response.ok && data.status) {
        console.log('Verification successful:', reference);
        return true;
      } else {
        if (retries > 0) {
          console.warn(`Retry ${4 - retries}:`, reference);
          await new Promise((resolve) => setTimeout(resolve, 2000));
          return verifyTransaction(reference, expectedAmount, retries - 1);
        }
        throw new Error(data.error || `Verification failed: ${response.status}`);
      }
    } catch (error) {
      console.error('verifyTransaction error:', { message: error.message, reference, retries });
      if (error.message.includes('AbortError')) {
        console.error('Network timeout:', { reference, retries });
        Alert.alert('Error', 'Network timeout. Please try again.');
      }
      if (retries > 0) {
        console.warn(`Retry ${4 - retries}:`, reference);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return verifyTransaction(reference, expectedAmount, retries - 1);
      }
      throw error;
    }
  };

  const sendTestReceipt = async (reference: string, amount: string, email: string) => {
    try {
      const parsedAmount = parseFloat(amount);
      const feePercentage = 0.1;
      const feeAmount = parsedAmount * feePercentage;
      const netAmount = parsedAmount - feeAmount;

      const receiptDetails = {
        to: email,
        subject: 'Payment Receipt - Edges Network',
        body: `
          Payment Receipt
          ----------------
          Reference: ${reference}
          Amount Paid: ₦${parsedAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
          Fees:
            - Transfer Fee (2%): ₦${(parsedAmount * 0.02).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            - Wallet Management Fee (2%): ₦${(parsedAmount * 0.02).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            - API & Network Protocols Fee (4%): ₦${(parsedAmount * 0.04).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            - VAT (2%): ₦${(parsedAmount * 0.02).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
          Total Fees (10%): ₦${feeAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
          Amount Credited: ₦${netAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
          Date: ${new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })}
          Status: Successful
          ----------------
          View your wallet balance in the app.
        `,
      };
      console.log('Receipt details:', receiptDetails);
    } catch (error) {
      console.error('sendTestReceipt error:', { message: error.message });
    }
  };

  const handleTopUp = async () => {
    console.log('handleTopUp:', { amount, userEmail, userName, userId });
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount)) {
      setError('Enter a valid amount');
      return;
    }
    if (parsedAmount < 500) {
      setError('Minimum amount is ₦500');
      return;
    }
    if (!userEmail || !userName || !userId) {
      Alert.alert('Error', 'User data missing. Sign in again.');
      router.replace('/sign-in');
      return;
    }
    if (!process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY) {
      Alert.alert('Error', 'Paystack configuration missing.');
      return;
    }
    if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
      Alert.alert('Error', 'Supabase configuration missing.');
      return;
    }

    const newReference = `Edges_Network_${uuidv4()}`;
    setPaymentReference(newReference);
    console.log('New payment reference:', newReference);

    try {
      console.log('Inserting transaction');
      const { error: txInsertError } = await supabase
        .from('transactions')
        .insert({
          reference: newReference,
          user_email: userEmail,
          status: 'pending',
          amount: parsedAmount,
          type: 'deposit',
          metadata: {
            user_name: userName,
            user_id: userId,
            payment_method: 'Paystack',
            payment_date: new Date().toISOString(),
            custom_fields: [
              { display_name: 'Mobile Payment', variable_name: 'mobile_payment', value: 'Edges Network' },
            ],
          },
        });

      if (txInsertError) {
        throw new Error(`Transaction insert failed: ${txInsertError.message}`);
      }

      setIsLoading(true);
      setShowWebView(true);
    } catch (error) {
      console.error('handleTopUp error:', { message: error.message });
      setShowWebView(false);
      setIsLoading(false);
      Alert.alert('Error', `Payment initiation failed: ${error.message || 'Unknown error'}`);
    }
  };

  const handlePresetAmount = (value: number) => {
    const currentAmount = amount ? parseFloat(amount) : 0;
    const newAmount = currentAmount + value;
    setAmount(newAmount.toString());
    setError('');
  };

  const generatePaystackHTML = (): string => {
    const reference = paymentReference || `Edges_Network_${uuidv4()}`;
    console.log('Paystack HTML reference:', reference);
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Paystack Payment</title>
        <script src="https://js.paystack.co/v1/inline.js"></script>
        <style>
          body {
            margin: 0;
            padding: 0;
            width: 100vw;
            height: 100vh;
            background: #1A2526;
            font-family: Arial, sans-serif;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
          }
          .container {
            margin-top: 40px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            width: ${width}px;
            max-width: 100%;
          }
          #paystackIframe {
            width: ${width * 0.9}px;
            max-width: 500px;
            height: ${height * 0.6}px;
            border: none;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div id="paystackIframe"></div>
        </div>
        <script>
          const handler = PaystackPop.setup({
            key: '${process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY || ''}',
            email: '${userEmail}',
            amount: ${parseFloat(amount) * 100},
            currency: 'NGN',
            channels: ['card', 'bank', 'ussd', 'qr'],
            ref: '${reference}',
            metadata: {
              custom_fields: [
                { display_name: "Mobile Payment", variable_name: "mobile_payment", value: "Edges Network" }
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

  const handleWebViewMessage = async (event: any): Promise<void> => {
    const data = event.nativeEvent.data;
    console.log('WebView message:', data);
    try {
      if (data.startsWith('payment-success:')) {
        const reference = data.split(':')[1];
        console.log('Processing payment success:', reference);

        const parsedAmount = parseFloat(amount);
        const isVerified = await verifyTransaction(reference, parsedAmount);
        if (!isVerified) {
          console.error('Verification failed:', reference);
          await supabase
            .from('transactions')
            .update({ status: 'failed', metadata: { error: 'Verification failed' } })
            .eq('reference', reference);
          throw new Error('Transaction verification failed');
        }

        await fetchWalletBalance(userEmail);
        await sendTestReceipt(reference, amount, userEmail);
        setShowWebView(false);
        setIsLoading(false);
        setPaymentReference('');
        Alert.alert('Success', 'Transaction completed!');
        router.push('/wallet');
      } else if (data === 'payment-cancelled') {
        console.log('Payment cancelled:', paymentReference);
        const { error: failedError } = await supabase
          .from('transactions')
          .update({ status: 'failed', metadata: { error: 'Payment cancelled' } })
          .eq('reference', paymentReference);

        if (failedError) {
          console.error('Failed to update transaction:', { message: failedError.message });
          throw new Error(`Failed to update transaction: ${failedError.message}`);
        }

        Alert.alert('Cancelled', 'Payment cancelled.');
        setShowWebView(false);
        setIsLoading(false);
        setPaymentReference('');
      }
    } catch (error) {
      console.error('handleWebViewMessage error:', { message: error.message, data });
      Alert.alert('Error', `Transaction failed: ${error.message || 'Unknown error'}`);
      setShowWebView(false);
      setIsLoading(false);
      setPaymentReference('');
    }
  };

  const presetAmounts = [500, 1000, 5000, 10000];

  if (isUserLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Loading...</Text>
      </SafeAreaView>
    );
  }

  if (showWebView) {
    return (
      <SafeAreaView style={styles.webViewContainer}>
        <WebView
          source={{ html: generatePaystackHTML() }}
          onMessage={handleWebViewMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          style={{ flex: 1, width, height }}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#000" />
            </View>
          )}
          onShouldStartLoadWithRequest={(request) => {
            if (request.url.includes('paystack') || request.url.includes('edgesnetwork')) {
              return true;
            }
            console.log('Blocked navigation:', request.url);
            return false;
          }}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('WebView error:', nativeEvent);
            Alert.alert('Error', 'Failed to load payment page.');
            setShowWebView(false);
            setIsLoading(false);
            setPaymentReference('');
          }}
        />
      </SafeAreaView>
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

        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 300 }}
          style={styles.balanceContainer}
        >
          <Text style={styles.balanceLabel}>Wallet Balance (NGN)</Text>
          <Text style={styles.balanceText}>
            ₦{walletBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
          </Text>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 300 }}
          style={styles.inputContainer}
        >
          <Text style={styles.label}>Amount to Fund (NGN)</Text>
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
              editable={!isLoading}
            />
            {amount && !isLoading ? (
              <Pressable onPress={() => setAmount('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color="#666" />
              </Pressable>
            ) : null}
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 300, delay: 100 }}
          style={styles.presetContainer}
        >
          {presetAmounts.map((value) => (
            <Pressable
              key={value}
              onPress={() => handlePresetAmount(value)}
              style={({ pressed }) => [
                styles.presetButton,
                { transform: [{ scale: pressed ? 0.95 : 1 }] },
                isLoading && styles.disabledButton,
              ]}
              disabled={isLoading}
            >
              <Text style={styles.presetText}>₦{value.toLocaleString()}</Text>
            </Pressable>
          ))}
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 300, delay: 200 }}
          style={styles.buttonContainer}
        >
          <Pressable
            onPress={() => fetchWalletBalance(userEmail)}
            style={[styles.refreshButton, isLoading && styles.disabledButton]}
            disabled={isLoading}
          >
            <Text style={styles.refreshButtonText}>Refresh Balance</Text>
          </Pressable>
        </MotiView>

        <MotiView
          from={{ scale: 1 }}
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ loop: true, type: 'timing', duration: 1500 }}
          style={styles.buttonContainer}
        >
          <Pressable
            onPress={handleTopUp}
            style={[styles.fundButton, isLoading && styles.disabledButton]}
            disabled={isLoading}
          >
            <Text style={styles.fundButtonText}>
              {isLoading ? 'Processing...' : 'Top Up Now'}
            </Text>
          </Pressable>
        </MotiView>

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
            <Text style={styles.stepText}>Complete payment via card, bank, or USSD</Text>
          </View>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>3</Text>
            <Text style={styles.stepText}>Wallet credited after verification</Text>
          </View>
        </MotiView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A2526',
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: '#1A2526',
    width,
    height,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A2526',
    width,
    height,
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
    marginTop: 40,
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
  refreshButton: {
    backgroundColor: '#2A3A3B',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
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
    color: '#00ff00',
    marginRight: 8,
    width: 24,
    textAlign: 'center',
  },
  stepText: {
    fontSize: 14,
    color: '#888888',
    flex: 1,
    lineHeight: 20,
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default FundScreen;