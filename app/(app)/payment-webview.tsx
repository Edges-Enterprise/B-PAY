import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { useState, useCallback } from 'react';
import { supabase } from '@/config/supabase';

export default function PaymentWebView() {
  const { paymentUrl, callbackUrl } = useLocalSearchParams<{
    paymentUrl: string;
    callbackUrl: string;
  }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // Memoized callback for payment verification
  const verifyPayment = useCallback(async (reference: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: { reference },
      });

      if (error) throw error;

      router.replace({
        pathname: data.status === 'success' ? '/success' : '/payment-failed',
        params: data.status === 'success' ? {
          action: 'Wallet Funding',
          amount: (data.amount / 100 * 0.9).toFixed(2), // Deducting 10% fee
          method: 'Paystack',
        } : {
          error: data.message || 'Payment failed'
        },
      });
    } catch (err) {
      console.error('Verification error:', err);
      router.replace({
        pathname: '/payment-failed',
        params: { error: 'Payment verification failed' },
      });
    }
  }, [router]);

  // Improved navigation state handler
  const handleNavigationStateChange = useCallback((navState: { url: string }) => {
    if (navState.url.includes(callbackUrl)) {
      const url = new URL(navState.url);
      const reference = url.searchParams.get('reference');

      if (reference) {
        verifyPayment(reference);
      }
      return false;
    }
    return true;
  }, [callbackUrl, verifyPayment]);

  if (!paymentUrl) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      )}
      <WebView
        source={{ uri: paymentUrl }}
        onNavigationStateChange={handleNavigationStateChange}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        style={styles.webview}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0000ff" />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    zIndex: 100,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});