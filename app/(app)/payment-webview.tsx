// app/(app)/payment-webview.tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'expo-webview'; // Changed import
import { useState } from 'react';
import { supabase } from '@/config/supabase';

export default function PaymentWebView() {
  const { paymentUrl, callbackUrl } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const handleNavigationStateChange = (navState: { url: string }) => {
    if (navState.url.includes(callbackUrl as string)) {
      const url = new URL(navState.url);
      const reference = url.searchParams.get('reference');
      
      if (reference) {
        verifyPayment(reference);
      }
      return false;
    }
    return true;
  };

  const verifyPayment = async (reference: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: { reference }
      });

      if (error) throw error;

      if (data.status === 'success') {
        router.replace({
          pathname: '/success',
          params: {
            action: 'Wallet Funding',
            amount: (data.amount / 100 * 0.9).toFixed(2),
            method: 'Paystack'
          }
        });
      } else {
        router.replace({
          pathname: '/payment-failed',
          params: { error: data.message || 'Payment failed' }
        });
      }
    } catch (err) {
      console.error('Verification error:', err);
      router.replace({
        pathname: '/payment-failed',
        params: { error: 'Payment verification failed' }
      });
    }
  };

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      )}
      <WebView
        source={{ uri: paymentUrl as string }}
        onNavigationStateChange={handleNavigationStateChange}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        style={styles.webview}
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    zIndex: 100,
  },
});