import { View, Text, ScrollView, Pressable, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { MotiView } from 'moti';

const screenWidth = Dimensions.get('window').width;

const actions = [
  { title: 'Buy Airtime', icon: 'call-outline', color: '#2563EB' },
  { title: 'Buy Data', icon: 'cellular-outline', color: '#22C55E' },
  { title: 'Airtime to Cash', icon: 'cash-outline', color: '#F59E0B' },
  { title: 'Swap Wallet', icon: 'swap-horizontal-outline', color: '#8B5CF6' },
  { title: 'Pay Bills', icon: 'document-text-outline', color: '#EF4444' },
  { title: 'Electricity', icon: 'flash-outline', color: '#EAB308' },
  { title: 'Cable TV', icon: 'tv-outline', color: '#3B82F6' },
  { title: 'Internet', icon: 'wifi-outline', color: '#06B6D4' },
  { title: 'Education', icon: 'school-outline', color: '#F472B6' },
  { title: 'Transportation', icon: 'bus-outline', color: '#10B981' },
  { title: 'Insurance', icon: 'shield-checkmark-outline', color: '#F97316' },
  { title: 'Savings', icon: 'wallet-outline', color: '#7C3AED' },
  { title: 'Investments', icon: 'trending-up-outline', color: '#60A5FA' },
  { title: 'Health', icon: 'heart-outline', color: '#EF4444' },
  { title: 'Loan', icon: 'card-outline', color: '#14B8A6' },
  { title: 'Send Money', icon: 'paper-plane-outline', color: '#4ADE80' },
  { title: 'Receive Money', icon: 'download-outline', color: '#A78BFA' },
  { title: 'Withdraw', icon: 'cash-outline', color: '#F43F5E' },
  { title: 'Referral', icon: 'gift-outline', color: '#F59E0B' },
  { title: 'Customer Care', icon: 'headset-outline', color: '#3B82F6' },
];

export default function AllActionsScreen() {


  const buttonSize = (screenWidth - 64) / 4; // 4 columns, 16px padding each side + 16px between

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </Pressable>
        <Text style={styles.headerTitle}>All Services</Text>
        <View style={{ width: 40 }} /> {/* Empty for centering */}
      </View>

      {/* Actions Grid */}
      <View style={styles.grid}>
        {actions.map((action, index) => (
          <MotiView
            key={index}
            from={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 30 }}
          >
            <Pressable
              onPress={() => console.log(action.title)}
              style={[
                styles.actionButton,
                { width: buttonSize, height: buttonSize, backgroundColor: action.color },
              ]}
            >
              <Ionicons name={action.icon} size={24} color="white" />
              <Text style={styles.actionText}>{action.title}</Text>
            </Pressable>
          </MotiView>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    paddingTop: 48,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  actionButton: {
    borderRadius: 16,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  actionText: {
    color: 'white',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 6,
    fontWeight: '500',
  },
});
