import { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, StatusBar, Platform, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { colors } from '@/constants/colors';
import { useColorScheme } from '@/lib/useColorScheme';

// Define types
interface Transaction {
  type: string;
  amount: number;
  network?: string;
  method?: string;
  service?: string;
  date: string;
}

interface Recommendation {
  id: number;
  text: string;
  price: number;
}

export default function WalletScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const [showBalance, setShowBalance] = useState<boolean>(false);
  const [showTransactions, setShowTransactions] = useState<boolean>(false);
  const [currentRecommendations, setCurrentRecommendations] = useState<Recommendation[]>([]);

  const balance: number = 12300;
  const hasPriorDataPurchase: boolean = true;

  const transactions: Transaction[] = [
    { type: 'Data Purchase', amount: -300, network: 'MTN', date: 'Apr 18, 2025' },
    { type: 'Wallet Funding', amount: 5000, method: 'Flutterwave', date: 'Apr 17, 2025' },
    { type: 'Cable TV Payment', amount: -2500, service: 'DSTV', date: 'Apr 16, 2025' },
  ];

  const recommendations: Recommendation[] = [
    { id: 1, text: '1GB MTN data for just ₦200!', price: 200 },
    { id: 2, text: 'Airtel 500MB daily plan for ₦100.', price: 100 },
    { id: 3, text: 'Glo 2GB for ₦500, valid for 7 days!', price: 500 },
    { id: 4, text: 'DSTV weekly subscription for ₦900.', price: 900 },
    { id: 5, text: 'MTN 750MB data for ₦150.', price: 150 },
    { id: 6, text: 'Airtel ₦200 airtime top-up.', price: 200 },
    { id: 7, text: 'Glo 1.5GB for ₦400, 3-day plan.', price: 400 },
    { id: 8, text: 'Startimes daily subscription for ₦300.', price: 300 },
    { id: 9, text: '9Mobile 1GB for ₦250.', price: 250 },
    { id: 10, text: 'MTN ₦100 airtime voucher.', price: 100 },
  ];

  const shuffleRecommendations = (): Recommendation[] => {
    const array = [...recommendations];
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array.slice(0, 5);
  };

  useEffect(() => {
    setCurrentRecommendations(shuffleRecommendations());
    const interval = setInterval(() => {
      setCurrentRecommendations(shuffleRecommendations());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const formattedBalance: string = `₦${balance.toLocaleString(undefined, {
    minimumFractionDigits: 2,
  })}`;

  const hiddenBalance: string = '₦****' + formattedBalance.slice(-3);

  const handlePurchase = (rec: Recommendation) => {
    if (!hasPriorDataPurchase) {
      console.log('User must have prior data purchase.');
      return;
    }

    if (balance < rec.price) {
      console.log('Insufficient balance.');
      return;
    }

    console.log(`Purchasing: ${rec.text} for ₦${rec.price}`);
    router.push({
      pathname: '/success',
      params: { plan: rec.text, amount: rec.price.toString() },
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colorScheme === 'dark' ? colors.dark.background : colors.light.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colorScheme === 'dark' ? colors.dark.foreground : colors.light.foreground }]}>Wallet 💼</Text>
        <Text style={[styles.subtitle, { color: colorScheme === 'dark' ? '#9ca3af' : '#666' }]}>Manage your balance and transactions</Text>

        <View style={[styles.balanceCard, { backgroundColor: colorScheme === 'dark' ? '#1e40af' : '#3b82f6' }]}>
          <View style={styles.balanceHeader}>
            <Text style={[styles.balanceTextLabel, { color: 'rgba(255,255,255,0.7)' }]}>Current Balance</Text>
            <Pressable onPress={() => setShowBalance(!showBalance)}>
              <Ionicons
                name={showBalance ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color="white"
              />
            </Pressable>
          </View>
          <Text style={[styles.balanceAmount, { color: 'white' }]}>
            {showBalance ? formattedBalance : hiddenBalance}
          </Text>
        </View>

        <MotiView
          from={{ scale: 1 }}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ loop: true, type: 'timing', duration: 1500 }}
          style={styles.fundButtonContainer}
        >
          <Pressable
            onPress={() => router.push('/(app)/fund')}
            style={[styles.fundButton, { backgroundColor: colorScheme === 'dark' ? '#1d4ed8' : '#2563eb' }]}
          >
            <Ionicons name="add-circle-outline" size={20} color="white" />
            <Text style={[styles.fundButtonText, { color: 'white' }]}>Fund Wallet</Text>
          </Pressable>
        </MotiView>

        <Pressable
          onPress={() => setShowTransactions(!showTransactions)}
          style={styles.transactionToggle}
        >
          <Text style={[styles.transactionTitle, { color: colorScheme === 'dark' ? colors.dark.foreground : colors.light.foreground }]}>🧾 Recent Transactions</Text>
          <Ionicons
            name={showTransactions ? 'chevron-up-outline' : 'chevron-down-outline'}
            size={22}
            color={colorScheme === 'dark' ? colors.dark.foreground : colors.light.foreground}
          />
        </Pressable>

        {showTransactions && (
          <View style={styles.transactionList}>
            {transactions.map((tx, index) => (
              <View key={index} style={[styles.transactionItem, { backgroundColor: colorScheme === 'dark' ? '#171717' : '#f5f5f5', borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
                <View>
                  <Text style={[styles.transactionType, { color: colorScheme === 'dark' ? colors.dark.foreground : colors.light.foreground }]}>{tx.type}</Text>
                  <Text style={[styles.transactionDetails, { color: colorScheme === 'dark' ? '#9ca3af' : '#666' }]}>{tx.network || tx.method || tx.service} • {tx.date}</Text>
                </View>
                <Text style={[styles.transactionAmount, { color: tx.amount < 0 ? '#f87171' : '#34d399' }]}>{tx.amount < 0 ? '-' : '+'}₦{Math.abs(tx.amount)}</Text>
              </View>
            ))}
          </View>
        )}

        {balance > 0 && !showTransactions && (
          <View style={styles.recommendationsSection}>
            <Text style={[styles.recommendationsTitle, { color: colorScheme === 'dark' ? colors.dark.foreground : colors.light.foreground }]}>💡 Recommended Purchases</Text>
            <View style={styles.recommendationsList}>
              {currentRecommendations.map((rec, index) => (
                <MotiView
                  key={`${rec.id}-${index}`}
                  from={{ translateX: index % 2 === 0 ? -100 : 100, opacity: 0 }}
                  animate={{ translateX: 0, opacity: 1 }}
                  transition={{ type: 'timing', duration: 800, delay: index * 500 }}
                  style={[styles.recommendationContainer, index % 2 === 0 ? { alignSelf: 'flex-start', backgroundColor: colorScheme === 'dark' ? '#1e3a8a' : '#3b82f6' } : { alignSelf: 'flex-end', backgroundColor: colorScheme === 'dark' ? '#6d28d9' : '#8b5cf6' }]}
                >
                  <Pressable onPress={() => handlePurchase(rec)}>
                    <Text style={[styles.recommendationText, { color: 'white' }]}>{rec.text}</Text>
                  </Pressable>
                </MotiView>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  inner: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  balanceCard: {
    padding: 24,
    borderRadius: 20,
    marginBottom: 24,
    shadowColor: '#fff',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceTextLabel: {
    fontSize: 14,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 8,
  },
  fundButtonContainer: {
    marginBottom: 24,
  },
  fundButton: {
    paddingVertical: 16,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fundButtonText: {
    marginLeft: 8,
    fontWeight: '600',
  },
  transactionToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  transactionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  transactionList: {
    gap: 16,
    marginBottom: 24,
  },
  transactionItem: {
    padding: 16,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
  },
  transactionType: {
    fontWeight: '500',
  },
  transactionDetails: {
    fontSize: 12,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  recommendationsSection: {
    marginBottom: 24,
  },
  recommendationsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  recommendationsList: {
    gap: 8,
  },
  recommendationContainer: {
    maxWidth: '70%',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  recommendationText: {
    fontSize: 14,
  },
});