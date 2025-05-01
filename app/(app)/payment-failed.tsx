// app/(app)/payment-failed.tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';

export default function PaymentFailedScreen() {
  const { error } = useLocalSearchParams();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <MotiView
        from={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 10 }}
        style={styles.iconContainer}
      >
        <Ionicons name="close-circle" size={80} color="#ef4444" />
      </MotiView>

      <Text style={styles.title}>Payment Failed</Text>
      
      <View style={styles.detailsContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.helpText}>
          Please try again or contact support if the problem persists.
        </Text>
      </View>

      <Pressable
        onPress={() => router.replace('/(app)/fund')}
        style={styles.button}
      >
        <Text style={styles.buttonText}>Try Again</Text>
      </Pressable>

      <Pressable
        onPress={() => router.replace('/(app)/wallet')}
        style={[styles.button, { backgroundColor: '#64748b', marginTop: 10 }]}
      >
        <Text style={styles.buttonText}>Back to Wallet</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  iconContainer: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#ef4444',
  },
  detailsContainer: {
    marginBottom: 30,
    width: '100%',
    padding: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
  },
  errorText: {
    fontSize: 16,
    marginBottom: 10,
    color: '#ef4444',
    textAlign: 'center',
  },
  helpText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#ef4444',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});