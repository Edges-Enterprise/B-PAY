import { View, Text, ScrollView, Pressable, StyleSheet, StatusBar } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';

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

const initialQuickActions = actions.filter(action =>
  ['Buy Airtime', 'Buy Data', 'Electricity', 'Cable TV', 'Customer Care', 'Referral'].includes(action.title)
);

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();

  // Use the user's username if available, otherwise fall back to a generic greeting
  const welcomeMessage = user?.username ? `Welcome back, ${user.username} 👋` : 'Welcome back 👋';

  return (
    <View style={styles.container}>
      {/* Transparent Status Bar */}
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Welcome Text */}
      <Text style={styles.welcomeTitle}>{welcomeMessage}</Text>
      <Text style={styles.welcomeSubtitle}>Your business dashboard is here 🔥</Text>

      {/* Neon Stats Cards */}
      <View style={styles.statsRow}>
        {[
          { title: 'Wallet', value: '₦12,300', colors: ['#3B82F6', '#1E40AF'] },
          { title: 'Sales', value: '₦54,000', colors: ['#EF4444', '#991B1B'] },
          { title: 'Commission', value: '₦7,500', colors: ['#8B5CF6', '#6B21A8'] },
        ].map((item, index) => (
          <View
            key={index}
            style={[
              styles.statCard,
              { backgroundColor: item.colors[0] },
            ]}
          >
            <Text style={styles.statTitle}>{item.title}</Text>
            <Text style={styles.statValue}>{item.value}</Text>
          </View>
        ))}
      </View>

      {/* Popular Plans */}
      <Text style={styles.sectionTitle}>🔥 Popular Plans</Text>
      {['MTN 1.5GB – ₦300', 'Glo 2GB – ₦500', 'Airtel 1GB – ₦250'].map((plan, index) => (
        <View
          key={plan}
          style={styles.planItem}
        >
          <Text style={styles.planText}>{plan}</Text>
          <MaterialIcons name="arrow-forward-ios" size={16} color="gray" />
        </View>
      ))}

      {/* Quick Actions Title Row */}
      <View style={styles.quickActionsHeader}>
        <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
        <Pressable onPress={() => router.push('/(app)/all-actions')}>
          <Text style={styles.moreButtonText}>More ... ></Text>
        </Pressable>
      </View>

      {/* Quick Actions Card */}
      <View style={styles.quickActionsCard}>
        <ScrollView
          style={styles.quickActionsScroll}
          contentContainerStyle={{ paddingVertical: 8 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.quickActionsGrid}>
            {initialQuickActions.map((action, index) => (
              <Pressable
                key={index}
                onPress={() => console.log(action.title)}
                style={styles.quickActionCard}
              >
                <Ionicons name={action.icon} size={24} color={action.color} />
                <Text style={styles.quickActionTitle}>
                  {action.title.length > 12 ? action.title.slice(0, 11) + '...' : action.title}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    paddingHorizontal: 16,
    paddingTop: StatusBar.currentHeight || 48,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: 'gray',
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  statTitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  planItem: {
    backgroundColor: '#171717',
    marginBottom: 12,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  planText: {
    color: 'white',
    fontWeight: '500',
  },
  quickActionsHeader: {
    marginTop: 24,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moreButtonText: {
    color: '#60A5FA',
    fontSize: 14,
    fontWeight: '500',
  },
  quickActionsCard: {
    backgroundColor: '#171717',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingTop: 12,
    height: 300, // Fixed height for the card (scroll inside it)
    marginBottom: 24,
  },
  quickActionsScroll: {
    flex: 1,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    width: '30%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  quickActionTitle: {
    color: 'white',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 6,
    textAlign: 'center',
  },
});