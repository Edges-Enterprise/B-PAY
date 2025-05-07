import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

type PaymentMethod = 'card' | 'bank_transfer';

const PaystackPaymentScreen: React.FC = () => {
  const router = useRouter();
  const { amount = '0', email = '' } = useLocalSearchParams<{
    amount: string;
    email: string;
  }>();
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [showWebView, setShowWebView] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);

  // Replace with your Paystack test public key
  const PAYSTACK_PUBLIC_KEY = 'pk_test_766ebb286cc861a4807dd2e5b81e265e4778388f';

  const sendTestReceipt = async (reference: string, amount: string, email: string) => {
    try {
      // Mock email sending (in real app, integrate with your backend or email service)
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
      // In production, replace with actual email sending logic (e.g., using a backend API)
    } catch (error) {
      console.error('Error sending receipt:', error);
    }
  };

  const handlePayment = (method: PaymentMethod): void => {
    setPaymentMethod(method);
    setShowWebView(true);
    setIsProcessing(true);
  };

  const handleWebViewMessage = (event: any): void => {
    const data = event.nativeEvent.data;
    if (data.startsWith('payment-success:')) {
      const reference = data.split(':')[1];
      sendTestReceipt(reference, amount, email);
      router.push('/success');
    } else if (data === 'payment-cancelled') {
      Alert.alert('Cancelled', 'Payment was cancelled');
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
            email: '${email}',
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
              if ('${PAYSTACK_PUBLIC_KEY}'.includes('test')) {
                fetch('https://api.paystack.co/transaction/verify/' + response.reference, {
                  method: 'GET',
                  headers: {
                    Authorization: 'Bearer ${PAYSTACK_PUBLIC_KEY}'
                  }
                }).then(r => r.json())
                  .then(verification => {
                    if (verification.status) {
                      window.ReactNativeWebView.postMessage('payment-success:' + response.reference);
                    }
                  });
              } else {
                window.ReactNativeWebView.postMessage('payment-success:' + response.reference);
              }
            }
          });
          handler.openIframe();
        </script>
      </body>
      </html>
    `;
  };

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
        <ScrollView contentContainerStyle={styles.paymentContainer}>
          <Text style={styles.emailText}>{email}</Text>
          <Text style={styles.amountText}>Pay ₦{parseFloat(amount).toLocaleString('en-NG', { 
              minimumFractionDigits: 2 
            })}</Text>

          <Text style={styles.instructionText}>
            USE ANY OF THE OPTIONS BELOW TO TEST THE PAYMENT FLOW
          </Text>

          <Pressable
            style={styles.optionButton}
            onPress={() => {
              sendTestReceipt(`PS_${Date.now()}`, amount, email);
              router.push('/success');
            }}
            disabled={isProcessing}
          >
            <Text style={styles.optionButtonText}>Success</Text>
          </Pressable>

          <Pressable
            style={[styles.optionButton, { backgroundColor: '#fff', borderWidth: 1, borderColor: '#000' }]}
            onPress={() => handlePayment('bank_transfer')}
            disabled={isProcessing}
          >
            <Text style={[styles.optionButtonText, { color: '#000' }]}>Bank Authentication</Text>
          </Pressable>

          <Pressable
            style={[styles.optionButton, { backgroundColor: '#fff', borderWidth: 1, borderColor: '#000' }]}
            onPress={() => Alert.alert('Declined', 'Payment was declined')}
            disabled={isProcessing}
          >
            <Text style={[styles.optionButtonText, { color: '#000' }]}>Declined</Text>
          </Pressable>

          <Pressable
            style={styles.payButton}
            onPress={() => handlePayment('card')}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.payButtonText}>Pay ₦{parseFloat(amount).toLocaleString('en-NG', { 
                minimumFractionDigits: 2 
              })}</Text>
            )}
          </Pressable>

          <Pressable>
            <Text style={styles.useAnotherCardText}>USE ANOTHER CARD</Text>
          </Pressable>

          <Text style={styles.levyText}>
            An additional E-levy fee of 1.5% may apply to this payment.{' '}
            <Text style={styles.learnMoreText}>Learn more</Text>
          </Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  inner: {
    flex: 1,
    paddingHorizontal: 16,
  },
  paymentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  emailText: {
    fontSize: 16,
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  amountText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
    textAlign: 'center',
  },
  instructionText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 20,
    textTransform: 'uppercase',
  },
  optionButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#000',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginBottom: 16,
    width: 200,
    alignItems: 'center',
  },
  optionButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '500',
  },
  payButton: {
    backgroundColor: '#00FF00',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    width: 200,
    marginVertical: 16,
  },
  payButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  useAnotherCardText: {
    color: '#000',
    fontSize: 14,
    textDecorationLine: 'underline',
    marginBottom: 16,
  },
  levyText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },
  learnMoreText: {
    color: '#000',
    textDecorationLine: 'underline',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});

export default PaystackPaymentScreen;