import { useState, useEffect, useCallback } from 'react';
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
import { debounce } from 'lodash';
import { useSupabase } from '@/context/supabase-provider';

const { width, height } = Dimensions.get('window');

const FundScreen = () => {
  const { user, session, initialized, isLoadingSession } = useSupabase();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showWebView, setShowWebView] = useState(false);
  const [paymentReference, setPaymentReference] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);
  const [showVerifyButton, setShowVerifyButton] = useState(false);

  useEffect(() => {
    const paystackKey = process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY;
    console.log('Loaded Paystack Public Key:', paystackKey);
    console.log('Environment variables:', {
      PAYSTACK_PUBLIC_KEY: paystackKey ? `Set (${paystackKey.substring(0, 7)}...)` : 'Missing',
      SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || 'Missing',
      SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? 'Set (eyJ...)' : 'Missing',
    });

    if (!paystackKey) {
      Alert.alert('Configuration Error', 'Paystack public key is missing. Please contact support.');
      return;
    }
    
    if (!paystackKey.startsWith('pk_')) {
      console.error('Invalid Paystack public key format:', paystackKey);
      Alert.alert('Configuration Error', 'Invalid Paystack public key format. Please contact support.');
      return;
    }

    if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
      Alert.alert('Configuration Error', 'Supabase configuration missing. Please contact support.');
      return;
    }
  }, []);

  useEffect(() => {
    console.log('showWebView:', showWebView);
    if (showWebView && paymentReference) {
      const fallbackTimeout = setTimeout(async () => {
        console.log('Fallback verification triggered:', paymentReference);
        setShowVerifyButton(true);
        Alert.alert('Warning', 'Payment response not received. Please verify manually.');
      }, 60000);
      return () => clearTimeout(fallbackTimeout);
    }
  }, [showWebView, paymentReference]);

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
    if (!initialized || isLoadingSession || !user || !session) {
      return;
    }
    setUserEmail(user.email || '');
    setUserName(user.user_metadata?.username || '');
    setUserId(user.id || '');
    if (user.email) {
      fetchWalletBalance(user.email);
    }
  }, [user, session, initialized, isLoadingSession]);

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
              setShowVerifyButton(false);
              await fetchWalletBalance(userEmail);
              await sendTestReceipt(paymentReference, amount, userEmail);
              Alert.alert('Success', 'Transaction completed successfully!');
              router.push('/(app)/(protected)/wallet');
            } else if (payload.new.status === 'failed') {
              setShowWebView(false);
              setIsLoading(false);
              setPaymentReference('');
              setShowVerifyButton(false);
              Alert.alert('Transaction Failed', `Transaction failed: ${payload.new.metadata?.error || 'Unknown error'}`);
            }
          }
        )
        .subscribe((status) => {
          console.log('Subscription status:', { reference: paymentReference, status });
          if (status !== 'SUBSCRIBED') {
            console.error('Subscription failed:', { reference: paymentReference, status });
            Alert.alert('Connection Error', 'Failed to monitor transaction status.');
            setIsLoading(false);
            setShowWebView(false);
            setPaymentReference('');
            setShowVerifyButton(false);
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
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const payload = { reference, expectedAmount };
      console.log('Sending to edge function:', payload);
      
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/verify-paystack-transaction`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify(payload),
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
      if (error.name === 'AbortError') {
        console.error('Network timeout:', { reference, retries });
        throw new Error('Network timeout. Please check your connection and try again.');
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
      console.log('Receipt details prepared:', receiptDetails);
    } catch (error) {
      console.error('sendTestReceipt error:', { message: error.message });
    }
  };

  const handleTopUp = debounce(async () => {
      console.log('handleTopUp:', { amount, user: userEmail, userName, userId });
      const parsedAmount = parseFloat(amount);
      
      if (!user || !session || !userEmail || !userName || !userId) {
        Alert.alert('Authentication Error', 'User data missing. Please sign in again.');
        router.replace('/(app)/(auth)/sign-in');
        return;
      }

      if (!amount || isNaN(parsedAmount)) {
        setError('Please enter a valid amount');
        return;
      }
      if (parsedAmount < 500) {
        setError('Minimum amount is ₦500');
        return;
      }
      if (parsedAmount > 1000000) {
        setError('Maximum amount is ₦1,000,000');
        return;
      }

      const paystackKey = process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY;
      if (!paystackKey || !paystackKey.startsWith('pk_')) {
        Alert.alert('Configuration Error', 'Invalid payment configuration. Please contact support.');
        return;
      }
      if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
        Alert.alert('Configuration Error', 'Database configuration missing. Please contact support.');
        return;
      }

      const newReference = `Edges_Network_${uuidv4()}`;
      setPaymentReference(newReference);
      console.log('New payment reference:', newReference);

      try {
        setError('');
        console.log('Inserting transaction record');
        
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
          throw new Error(`Failed to create transaction record: ${txInsertError.message}`);
        }

        setIsLoading(true);
        setShowWebView(true);
        console.log('Payment initialization successful');
      } catch (error) {
        console.error('handleTopUp error:', { message: error.message, stack: error.stack });
        setShowWebView(false);
        setIsLoading(false);
        setPaymentReference('');
        Alert.alert('Payment Error', `Failed to initialize payment: ${error.message || 'Unknown error'}`);
      }
    },
    1000,
    { leading: true, trailing: false }
  );

  const handleManualVerify = async () => {
    if (!paymentReference || !amount) {
      Alert.alert('Verification Error', 'No pending transaction to verify.');
      return;
    }
    setIsLoading(true);
    try {
      const parsedAmount = parseFloat(amount);
      const isVerified = await verifyTransaction(paymentReference, parsedAmount);
      if (isVerified) {
        await fetchWalletBalance(userEmail);
        await sendTestReceipt(paymentReference, amount, userEmail);
        setShowWebView(false);
        setIsLoading(false);
        setPaymentReference('');
        setShowVerifyButton(false);
        Alert.alert('Success', 'Transaction verified successfully!');
        router.push('/(app)/(protected)/wallet');
      }
    } catch (error) {
      console.error('Manual verify error:', { message: error.message });
      Alert.alert('Verification Failed', `Unable to verify transaction: ${error.message || 'Unknown error'}`);
      setIsLoading(false);
    }
  };

  const handlePresetAmount = (value: number) => {
    const currentAmount = amount ? parseFloat(amount) : 0;
    const newAmount = currentAmount + value;
    setAmount(newAmount.toString());
    setError('');
  };

  const generatePaystackHTML = useCallback((): string => {
    const reference = paymentReference || `Edges_Network_${uuidv4()}`;
    const paystackKey = process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY;
    console.log('Generating Paystack HTML with reference:', reference);
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
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
            justify-content: center;
            align-items: center;
            color: white;
            overflow: hidden;
          }
          .container {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
          }
          .loading {
            font-size: 18px;
            margin-bottom: 20px;
          }
          #paystackIframe {
            width: 100%;
            height: 100%;
            border: none;
            border-radius: 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="loading">Initializing payment...</div>
          <div id="paystackIframe"></div>
        </div>
        <script>
          console.log('Paystack script loaded', { 
            email: '${userEmail}', 
            amount: ${parseFloat(amount) * 100}, 
            ref: '${reference}',
            key: '${paystackKey ? paystackKey.substring(0, 10) + '...' : 'MISSING'}'
          });
          
          try {
            const handler = PaystackPop.setup({
              key: '${paystackKey || ''}',
              email: '${userEmail}',
              amount: ${parseFloat(amount) * 100},
              currency: 'NGN',
              channels: ['card', 'bank', 'bank_transfer', 'ussd', 'qr'],
              ref: '${reference}',
              metadata: {
                custom_fields: [
                  { display_name: "Mobile Payment", variable_name: "mobile_payment", value: "Edges Network" }
                ]
              },
              onClose: function() {
                console.log('Paystack window closed by user');
                window.ReactNativeWebView.postMessage('payment-cancelled');
              },
              callback: function(response) {
                console.log('Paystack callback received:', response);
                if (response.status === 'success') {
                  console.log('Payment successful:', response.reference);
                  window.ReactNativeWebView.postMessage('payment-success:' + response.reference);
                } else {
                  console.log('Payment failed:', response);
                  window.ReactNativeWebView.postMessage('payment-failed:' + response.message);
                }
              }
            });
            
            handler.openIframe();
            document.querySelector('.loading').textContent = 'Complete your payment...';
            
          } catch (error) {
            console.error('Paystack initialization error:', error);
            document.querySelector('.loading').textContent = 'Error initializing payment: ' + error.message;
            window.ReactNativeWebView.postMessage('payment-error:' + error.message);
          }
        </script>
      </body>
      </html>
    `;
  }, [amount, userEmail, paymentReference]);

  const handleWebViewMessage = async (event: any): Promise<void> => {
    const data = event.nativeEvent.data;
    console.log('WebView message received:', data);
    
    try {
      if (data.startsWith('payment-success:')) {
        const reference = data.split(':')[1];
        console.log('Processing payment success:', reference);

        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount)) {
          throw new Error('Invalid amount for verification');
        }
        
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
        setShowVerifyButton(false);
        Alert.alert('Success', 'Payment completed successfully!');
        router.push('/(app)/(protected)/wallet');
        
      } else if (data === 'payment-cancelled') {
        console.log('Payment cancelled by user:', paymentReference);
        
        if (paymentReference) {
          const { error: failedError } = await supabase
            .from('transactions')
            .update({ status: 'failed', metadata: { error: 'Payment cancelled by user' } })
            .eq('reference', paymentReference);

          if (failedError) {
            console.error('Failed to update transaction:', failedError);
          }
        }

        Alert.alert('Payment Cancelled', 'Payment was cancelled.');
        setShowWebView(false);
        setIsLoading(false);
        setPaymentReference('');
        setShowVerifyButton(false);
        
      } else if (data.startsWith('payment-failed:')) {
        const errorMessage = data.split(':')[1] || 'Unknown error';
        console.log('Payment failed:', errorMessage);
        
        if (paymentReference) {
          await supabase
            .from('transactions')
            .update({ status: 'failed', metadata: { error: errorMessage } })
            .eq('reference', paymentReference);
        }
        
        Alert.alert('Payment Failed', `Payment failed: ${errorMessage}`);
        setShowWebView(false);
        setIsLoading(false);
        setPaymentReference('');
        setShowVerifyButton(false);
        
      } else if (data.startsWith('payment-error:')) {
        const errorMessage = data.split(':')[1] || 'Unknown error';
        console.error('Payment initialization error:', errorMessage);
        
        Alert.alert('Payment Error', `Failed to initialize payment: ${errorMessage}`);
        setShowWebView(false);
        setIsLoading(false);
        setPaymentReference('');
        setShowVerifyButton(false);
        
      } else {
        console.warn('Unknown WebView message:', data);
      }
    } catch (error) {
      console.error('handleWebViewMessage error:', error);
      Alert.alert('Transaction Error', `Transaction failed: ${error.message || 'Unknown error'}`);
      setShowWebView(false);
      setIsLoading(false);
      setShowVerifyButton(true);
    }
  };

  const presetAmounts = [500, 1000, 5000, 10000];

  if (!initialized || isLoadingSession || !user || !session) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color="#00FF00" />
          <Text style={styles.loadingText}>Loading user data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (showWebView) {
    return (
      <View style={styles.webViewContainer}>
        <StatusBar style="light" translucent={true} backgroundColor="transparent" />
        <WebView
          source={{ html: generatePaystackHTML() }}
          onMessage={handleWebViewMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          style={{ flex: 1, width, height }}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#00FF00" />
              <Text style={styles.loadingText}>Loading payment...</Text>
            </View>
          )}
          onShouldStartLoadWithRequest={(request) => {
            console.log('WebView navigation attempt:', request.url);
            const allowedDomains = ['paystack', 'edgesnetwork', 'about:blank', 'data:'];
            const isAllowed = allowedDomains.some(domain => request.url.includes(domain));
            if (!isAllowed) {
              console.log('Blocked navigation to:', request.url);
            }
            return isAllowed;
          }}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('WebView error details:', {
              code: nativeEvent.code,
              description: nativeEvent.description,
              url: nativeEvent.url,
            });
            Alert.alert('Payment Error', 'Failed to load payment page. Please try again.');
            setShowWebView(false);
            setIsLoading(false);
            setPaymentReference('');
            setShowVerifyButton(true);
          }}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('WebView HTTP error:', nativeEvent);
          }}
        />
        {showVerifyButton && (
          <Pressable
            onPress={handleManualVerify}
            style={[styles.verifyButton, isLoading && styles.disabledButton]}
            disabled={isLoading}
          >
            <Text style={styles.verifyButtonText}>
              {isLoading ? 'Verifying...' : 'Verify Payment'}
            </Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" translucent={false} backgroundColor="#1A2526" />
      <View style={styles.inner}>
        <View style={styles.header}>
          <Pressable onPress={() => router.push('/(app)/(protected)/wallet')}>
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
          <Text style={styles.balanceLabel}>Current Wallet Balance</Text>
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
              placeholder="Enter amount (Min: ₦500)"
              placeholderTextColor="#666"
              keyboardType="numeric"
              value={amount}
              onChangeText={(text) => {
                const cleanText = text.replace(/[^0-9.]/g, '');
                const parts = cleanText.split('.');
                if (parts.length > 2) {
                  return;
                }
                setAmount(cleanText);
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
          <Text style={styles.presetTitle}>Quick Add Amounts</Text>
          <View style={styles.presetButtonsContainer}>
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
                <Text style={styles.presetText}>+₦{value.toLocaleString()}</Text>
              </Pressable>
            ))}
          </View>
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
          transition={{ type: 'timing', duration: 300, delay: 200 }}
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
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  balanceContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  balanceLabel: {
    fontSize: 16,
    color: '#888',
    marginBottom: 8,
    fontWeight: '500',
  },
  balanceText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  inputContainer: {
    marginBottom: 32,
  },
  label: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A3A3B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3A4A4B',
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    color: '#fff',
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '500',
  },
  clearButton: {
    padding: 8,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  presetContainer: {
    marginBottom: 32,
  },
  presetTitle: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  presetButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  presetButton: {
    backgroundColor: '#2A3A3B',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    width: (width - 64) / 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3A4A4B',
  },
  presetText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContainer: {
    marginBottom: 32,
    alignItems: 'center',
  },
  fundButton: {
    backgroundColor: '#00FF00',
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  fundButtonText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 18,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  verifyButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    margin: 16,
  },
  verifyButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  stepsContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  stepsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    width: '100%',
    maxWidth: 400,
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00ff00',
    marginRight: 12,
    width: 28,
    textAlign: 'center',
  },
  stepText: {
    fontSize: 16,
    color: '#888888',
    flex: 1,
    lineHeight: 24,
  },
  disabledButton: {
    opacity: 0.6,
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    marginTop: 12,
    textAlign: 'center',
  },
});

export default FundScreen;