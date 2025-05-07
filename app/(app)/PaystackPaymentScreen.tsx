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
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '@/config/supabase';

const PaystackPaymentScreen = () => {
  const router = useRouter();
  const { amount, email } = useLocalSearchParams();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('card'); // 'card' or 'bank'

  // Card payment state
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');

  // Bank transfer state
  const [bankDetails, setBankDetails] = useState(null);

  const handlePayment = async () => {
    setIsProcessing(true);
    setPaymentStatus(null);

    try {
      const reference = `TXN_${Date.now()}`;
      if (paymentMethod === 'card') {
        if (!cardNumber || !expiryDate || !cvv) {
          throw new Error('Please fill in all card details');
        }

        // Call Supabase function to initialize Paystack transaction
        const { data, error: functionError } = await supabase.functions.invoke('payment', {
          body: {
            amount: parseFloat(amount),
            email,
            reference,
            channels: ['card'],
          },
        });

        if (functionError || !data || !data.authorization_url) {
          throw new Error(functionError?.message || data?.error || 'Failed to initialize payment');
        }

        // Simulate success for card payment
        setTimeout(() => {
          setPaymentStatus('success');
          setIsProcessing(false);
        }, 2000);
      } else if (paymentMethod === 'bank') {
        // Set bank details with your Paystack account information
        setBankDetails({
          bank_name: 'OPay Digital Services Limited (OPay)',
          account_number: '8063156574',
          account_holder: 'OGECHI BIANCA UCHE',
          reference,
        });

        // Initialize bank transfer with Paystack
        const { data, error: initError } = await supabase.functions.invoke('payment', {
          body: {
            amount: parseFloat(amount),
            email,
            reference,
            channels: ['bank_transfer'],
          },
        });

        if (initError || !data || data.error) {
          throw new Error(initError?.message || data?.error || 'Failed to initialize bank transfer');
        }

        // Simulate bank transfer completion in test mode
        setTimeout(async () => {
          try {
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-payment', {
              body: {
                reference,
              },
            });

            if (verifyError || !verifyData || verifyData.status !== 'success') {
              throw new Error(verifyError?.message || verifyData?.message || 'Bank transfer simulation failed');
            }

            setPaymentStatus('success');
            setIsProcessing(false);
          } catch (verifyErr) {
            console.error('Verification error:', verifyErr);
            Alert.alert('Verification Error', verifyErr.message || 'Failed to verify bank transfer');
            setIsProcessing(false);
          }
        }, 3000); // Simulate network delay
      }
    } catch (err) {
      console.error('Payment error:', err);
      Alert.alert('Payment Error', err.message || 'An unexpected error occurred');
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (paymentStatus === 'success') {
      Alert.alert('Success', 'Payment completed successfully!');
      router.push('/buy');
    } else if (paymentStatus === 'cancelled') {
      Alert.alert('Cancelled', 'Payment was cancelled.');
    }
  }, [paymentStatus]);

  return (
    <SafeAreaView style={styles.container}>
      {typeof StatusBar !== 'undefined' && <StatusBar style="light" translucent backgroundColor="transparent" />}
      <View style={styles.inner}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back-outline" size={24} color="white" />
          </Pressable>
          <Text style={styles.title}>Paystack Payment</Text>
          <Pressable>
            <Ionicons name="help-circle-outline" size={24} color="white" />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.paymentContainer}>
          <Text style={styles.amountText}>Amount to Pay: ₦{parseFloat(amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</Text>
          <Text style={styles.emailText}>Email: {email}</Text>
          <Text style={styles.infoText}>Select a payment method below to proceed.</Text>

          {/* Payment Method Selection */}
          <View style={styles.methodContainer}>
            <Pressable
              style={[styles.methodButton, paymentMethod === 'card' && styles.methodButtonActive]}
              onPress={() => setPaymentMethod('card')}
            >
              <Text style={[styles.methodText, paymentMethod === 'card' && styles.methodTextActive]}>Card</Text>
            </Pressable>
            <Pressable
              style={[styles.methodButton, paymentMethod === 'bank' && styles.methodButtonActive]}
              onPress={() => setPaymentMethod('bank')}
            >
              <Text style={[styles.methodText, paymentMethod === 'bank' && styles.methodTextActive]}>Bank Transfer</Text>
            </Pressable>
          </View>

          {/* Payment Details */}
          {paymentMethod === 'card' ? (
            <View style={styles.detailsContainer}>
              <Text style={styles.label}>Card Number</Text>
              <TextInput
                style={styles.input}
                placeholder="1234 5678 9012 3456"
                placeholderTextColor="#666"
                keyboardType="numeric"
                value={cardNumber}
                onChangeText={(text) => setCardNumber(text.replace(/[^0-9]/g, ''))}
              />
              <View style={styles.row}>
                <View style={styles.halfInputContainer}>
                  <Text style={styles.label}>Expiry Date (MM/YY)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="MM/YY"
                    placeholderTextColor="#666"
                    value={expiryDate}
                    onChangeText={(text) => setExpiryDate(text)}
                  />
                </View>
                <View style={styles.halfInputContainer}>
                  <Text style={styles.label}>CVV</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="123"
                    placeholderTextColor="#666"
                    keyboardType="numeric"
                    value={cvv}
                    onChangeText={(text) => setCvv(text.replace(/[^0-9]/g, ''))}
                  />
                </View>
              </View>
            </View>
          ) : bankDetails ? (
            <View style={styles.detailsContainer}>
              <Text style={styles.infoText}>Make a bank transfer to the following account:</Text>
              <View style={styles.bankDetailRow}>
                <Text style={styles.bankLabel}>Bank:</Text>
                <Text style={styles.bankValue}>{bankDetails.bank_name}</Text>
              </View>
              <View style={styles.bankDetailRow}>
                <Text style={styles.bankLabel}>Account Holder:</Text>
                <Text style={styles.bankValue}>{bankDetails.account_holder}</Text>
              </View>
              <View style={styles.bankDetailRow}>
                <Text style={styles.bankLabel}>Account No:</Text>
                <Text style={styles.bankValue}>{bankDetails.account_number}</Text>
              </View>
              <View style={styles.bankDetailRow}>
                <Text style={styles.bankLabel}>Reference:</Text>
                <Text style={styles.bankValue}>{bankDetails.reference}</Text>
              </View>
              <Text style={styles.warningText}>
                Note: The transfer amount must exactly match ₦{parseFloat(amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}. Any deviation will result in payment failure.
              </Text>
            </View>
          ) : (
            <Text style={styles.infoText}>Click "Proceed" to get bank transfer details.</Text>
          )}

          {/* Proceed Button */}
          {!bankDetails && (
            <Pressable
              onPress={handlePayment}
              style={styles.proceedButton}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.proceedButtonText}>Proceed</Text>
              )}
            </Pressable>
          )}
        </ScrollView>

        {isProcessing && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#00FF00" />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

export default PaystackPaymentScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A2526',
    paddingTop: Platform.OS === 'android' ? 30 : 0,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  paymentContainer: {
    flexGrow: 1,
    backgroundColor: '#2A3A3B',
    borderRadius: 8,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  amountText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  emailText: {
    fontSize: 16,
    color: '#888',
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  methodContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  methodButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#3A4A4B',
    marginHorizontal: 8,
  },
  methodButtonActive: {
    backgroundColor: '#00FF00',
  },
  methodText: {
    color: '#fff',
    fontSize: 16,
  },
  methodTextActive: {
    color: '#000',
    fontWeight: 'bold',
  },
  detailsContainer: {
    width: '100%',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInputContainer: {
    width: '48%',
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
  warningText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  proceedButton: {
    backgroundColor: '#00FF00',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  proceedButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
    textTransform: 'uppercase',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});