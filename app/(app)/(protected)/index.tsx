import { View, Text, ScrollView, Pressable, Dimensions } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';

const screenWidth = Dimensions.get('window').width;

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ScrollView className="flex-1 bg-black px-4 pt-12">
      {/* Welcome Text */}
      <Text className="text-3xl font-bold text-white mb-1">Welcome back 👋</Text>
      <Text className="text-base text-gray-400 mb-6">Your business dashboard is here 🔥</Text>

      {/* Neon Stats Cards */}
      <View className="flex-row justify-between gap-3 mb-6">
        {[
          { title: 'Wallet', value: '₦12,300', color: 'from-blue-500 to-blue-800' },
          { title: 'Sales', value: '₦54,000', color: 'from-red-500 to-red-800' },
          { title: 'Commission', value: '₦7,500', color: 'from-purple-500 to-purple-800' },
        ].map((item, index) => (
          <MotiView
            key={index}
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: index * 100, type: 'timing' }}
            className={`flex-1 p-4 rounded-2xl bg-gradient-to-b ${item.color} shadow-xl`}
          >
            <Text className="text-xs text-white/80">{item.title}</Text>
            <Text className="text-xl font-bold text-white mt-1">{item.value}</Text>
          </MotiView>
        ))}
      </View>

      {/* Popular Plans */}
      <Text className="text-lg font-semibold text-white mb-2">🔥 Popular Plans</Text>
      {['MTN 1.5GB – ₦300', 'Glo 2GB – ₦500', 'Airtel 1GB – ₦250'].map((plan, index) => (
        <MotiView
          key={plan}
          from={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 200 + index * 100 }}
          className="bg-neutral-900 mb-3 rounded-xl px-4 py-4 flex-row justify-between items-center border border-white/10"
        >
          <Text className="text-white font-medium">{plan}</Text>
          <MaterialIcons name="arrow-forward-ios" size={16} color="gray" />
        </MotiView>
      ))}

      {/* Quick Actions */}
      <Text className="text-lg font-semibold text-white mt-6 mb-2">⚡ Quick Actions</Text>
      <View className="flex-row justify-between gap-4">
        <Pressable
          onPress={() => router.push('/(app)/(protected)/buy')}
          className="flex-1 p-4 rounded-2xl items-center justify-center bg-blue-600/80 shadow-lg shadow-blue-500/40"
        >
          <Ionicons name="cellular-outline" size={26} color="white" />
          <Text className="text-white mt-1 font-medium">Buy Data</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/(app)/(protected)/wallet')}
          className="flex-1 p-4 rounded-2xl items-center justify-center bg-red-600/80 shadow-lg shadow-red-500/40"
        >
          <Ionicons name="wallet-outline" size={26} color="white" />
          <Text className="text-white mt-1 font-medium">Fund Wallet</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
