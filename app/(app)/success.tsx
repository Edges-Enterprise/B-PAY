// app/(app)/success.tsx
import { useLocalSearchParams, router } from 'expo-router';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';

export default function SuccessScreen() {
  const { action, amount, method, plan } = useLocalSearchParams();
  

  return (
    <View style={styles.container}>
      <MotiView
        from={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 10 }}
        style={styles.iconContainer}
      >
        <Ionicons name="checkmark-circle" size={80} color="#10b981" />
      </MotiView>

      <Text style={styles.title}>Success!</Text>
      
      <View style={styles.detailsContainer}>
        <Text style={styles.detailText}>
          {action}: {plan ? plan : `₦${amount}`}
        </Text>
        <Text style={styles.detailText}>Method: {method}</Text>
        {amount && (
          <Text style={styles.detailText}>
            Amount: ₦{parseFloat(amount as string).toLocaleString('en-NG', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </Text>
        )}
      </View>

      <Pressable
        onPress={() => router.replace('/(app)/wallet')}
        style={styles.button}
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
    color: '#10b981',
  },
  detailsContainer: {
    marginBottom: 30,
    width: '100%',
    padding: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
  },
  detailText: {
    fontSize: 16,
    marginBottom: 10,
    color: '#334155',
  },
  button: {
    backgroundColor: '#10b981',
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