import { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';

// Define types for transaction and recommendation
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
  const [showBalance, setShowBalance] = useState<boolean>(false);
  const [showTransactions, setShowTransactions] = useState<boolean>(false);
  const [currentRecommendations, setCurrentRecommendations] = useState<Recommendation[]>([]);

  const balance: number = 12300;
  const hasPriorDataPurchase: boolean = true; // Simulate prior data purchase; replace with actual check

  const transactions: Transaction[] = [
    { type: 'Data Purchase', amount: -300, network: 'MTN', date: 'Apr 18, 2025' },
    { type: 'Wallet Funding', amount: 5000, method: 'Flutterwave', date: 'Apr 17, 2025' },
    { type: 'Cable TV Payment', amount: -2500, service: 'DSTV', date: 'Apr 16, 2025' },
  ];

  // Expanded recommendations with prices
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

  // Shuffle function
  const shuffleRecommendations = (): Recommendation[] => {
    const array = [...recommendations];
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array.slice(0, 6); // Limit to 6
  };

  // Initial shuffle and periodic update
  useEffect(() => {
    setCurrentRecommendations(shuffleRecommendations()); // Initial shuffle

    const interval = setInterval(() => {
      setCurrentRecommendations(shuffleRecommendations()); // Update every 30s
    }, 30000);

    return () => clearInterval(interval); // Cleanup
  }, []);

  // Format visible balance
  const formattedBalance: string = `₦${balance.toLocaleString(undefined, {
    minimumFractionDigits: 2,
  })}`;

  // When hidden, use asterisk + .00
  const hiddenBalance: string = '₦****' + formattedBalance.slice(-3); // takes `.00`

  // Handle purchase
  const handlePurchase = (rec: Recommendation) => {
    if (!hasPriorDataPurchase) {
      console.log('User must have prior data purchase to use auto-purchase.');
      return;
    }

    if (balance < rec.price) {
      console.log('Insufficient balance for purchase.');
      return;
    }

    // Simulate payment processing (replace with actual API call)
    console.log(`Processing purchase: ${rec.text} for ₦${rec.price}`);

    // Navigate to success page with purchase details
    router.push({
      pathname: '/success',
      params: { plan: rec.text, amount: rec.price.toString() },
    });
  };

  return (
    <ScrollView className="flex-1 bg-black px-4 pt-12">
      {/* Title */}
      <Text className="text-3xl font-bold text-white mb-1">Wallet 💼</Text>
      <Text className="text-base text-gray-400 mb-6">Manage your balance and transactions</Text>

      {/* Balance Card */}
      <View className="bg-gradient-to-br from-blue-600 to-purple-800 p-6 rounded-2xl mb-6 shadow-lg">
        <View className="flex-row justify-between items-center">
          <Text className="text-white/70 text-sm">Current Balance</Text>
          <Pressable onPress={() => setShowBalance(!showBalance)}>
            <Ionicons
              name={showBalance ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color="white"
            />
          </Pressable>
        </View>
        <Text className="text-white text-3xl font-bold mt-2">
          {showBalance ? formattedBalance : hiddenBalance}
        </Text>
      </View>

      {/* Fund Wallet Pulse Button */}
      <MotiView
        from={{ scale: 1 }}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ loop: true, type: 'timing', duration: 1500 }}
        className="mb-6"
      >
        <Pressable
          onPress={() => router.push('/(app)/(protected)/fund')}
          className="flex-row items-center justify-center bg-blue-700 py-4 rounded-xl"
        >
          <Ionicons name="add-circle-outline" size={20} color="white" />
          <Text className="text-white ml-2 font-semibold">Fund Wallet</Text>
        </Pressable>
      </MotiView>

      {/* Transactions Toggle */}
      <Pressable
        onPress={() => setShowTransactions(!showTransactions)}
        className="flex-row items-center justify-between mb-3"
      >
        <Text className="text-lg font-semibold text-white">🧾 Recent Transactions</Text>
        <Ionicons
          name={showTransactions ? 'chevron-up-outline' : 'chevron-down-outline'}
          size={22}
          color="white"
        />
      </Pressable>

      {/* Transaction List */}
      {showTransactions && (
        <View className="space-y-4 mb-6">
          {transactions.map((tx, index) => (
            <View
              key={index}
              className="bg-neutral-900 rounded-xl p-4 flex-row justify-between items-center border border-white/10"
            >
              <View>
                <Text className="text-white font-medium">{tx.type}</Text>
                <Text className="text-xs text-gray-400">
                  {tx.network || tx.method || tx.service} • {tx.date}
                </Text>
              </View>
              <Text
                className={`text-base font-bold ${
                  tx.amount < 0 ? 'text-red-400' : 'text-green-400'
                }`}
              >
                {tx.amount < 0 ? '-' : '+'}₦{Math.abs(tx.amount)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Recommended Purchases (Chat-like) */}
      {balance > 0 && !showTransactions && (
        <View className="mb-6">
          <Text className="text-lg font-semibold text-white mb-4">💡 Recommended Purchases</Text>
          <View className="space-y-2">
            {currentRecommendations.map((rec, index) => (
              <MotiView
                key={`${rec.id}-${index}`} // Unique key for re-renders
                from={{
                  translateX: index % 2 === 0 ? -100 : 100,
                  opacity: 0,
                }}
                animate={{
                  translateX: 0,
                  opacity: 1,
                }}
                transition={{
                  type: 'timing',
                  duration: 800,
                  delay: index * 500, // Staggered delay
                }}
                className={`flex-row ${
                  index % 2 === 0 ? 'justify-start' : 'justify-end'
                }`}
              >
                <Pressable
                  onPress={() => handlePurchase(rec)}
                  accessibilityLabel={rec.text}
                  className={`max-w-[70%] p-3 rounded-xl border border-white/10 ${
                    index % 2 === 0 ? 'bg-blue-900' : 'bg-purple-900'
                  }`}
                >
                  <Text className="text-white text-sm">{rec.text}</Text>
                </Pressable>
              </MotiView>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}