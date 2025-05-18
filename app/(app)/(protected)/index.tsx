import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, UnknownInputParams } from 'expo-router';
import { useAuth } from '@/context/supabase-provider';
import PlanItemWithSwipe from '@/components/homescreen/PlanItemWithSwipe';
import CreatePinModal from '@/components/homescreen/CreatePinModal';
import { supabase } from '@/config/supabase';

// Define types for ConfirmationPage compatibility
interface DataBundle {
  id: number;
  data: string;
  price: number;
  validity: string;
  category: string;
  description?: string;
  variation_code: string;
  planType: string;
}

interface Provider {
  id: number;
  name: string;
  image: string;
  code: string;
}

interface ConfirmationParams {
  bundle?: string;
  provider?: string;
  phoneNumber?: string;
  userEmail?: string;
  transactionPin?: string;
  source?: string;
}

const actions = [
  { title: 'Buy Data', icon: 'cellular-outline', color: '#22C55E', route: '/(app)/(protected)/buy' },
  { title: 'Buy Airtime', icon: 'call-outline', color: '#2563EB', route: '/(app)/(protected)/buy-airtime' },
  { title: 'Electricity', icon: 'flash-outline', color: '#EAB308', route: '/(app)/(protected)/electricity' },
  { title: 'Cable TV', icon: 'tv-outline', color: '#3B82F6', route: '/(app)/(protected)/cable-tv' },
  { title: 'Customer Care', icon: 'headset-outline', color: '#3B82F6', route: '/(app)/(protected)/customer-care' },
  { title: 'Referral', icon: 'gift-outline', color: '#F59E0B', route: '/(app)/(protected)/referral' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const hasTransactionPin = !!user?.user_metadata?.transaction_pin_created;
  const username = user?.user_metadata?.username || 'Guest';

  const [phoneNumber, setPhoneNumber] = useState('');
  const [popularPlans, setPopularPlans] = useState<string[]>([]);
  const [createPinModalVisible, setCreatePinModalVisible] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [hasPurchases, setHasPurchases] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  const closeCreatePinModal = () => {
    setCreatePinModalVisible(false);
    setNewPin('');
    setConfirmPin('');
  };

  const handleCreatePin = async () => {
    if (newPin.length < 4 || newPin.length > 6 || confirmPin.length < 4 || confirmPin.length > 6) {
      alert('PIN must be between 4 and 6 digits.');
      return;
    }
    if (newPin !== confirmPin) {
      alert('PINs do not match.');
      return;
    }
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          ...user?.user_metadata,
          transaction_pin_created: true,
          transaction_pin: newPin,
        },
      });
      if (error) throw error;
      console.log('Transaction PIN set successfully');
      setCreatePinModalVisible(false);
      setNewPin('');
      setConfirmPin('');
    } catch (error) {
      console.error('Error updating user metadata:', error);
      alert('Failed to save PIN. Please try again.');
    }
  };

  const getProviderFromPlan = (plan: string): string => {
    const planUpper = plan.toUpperCase();
    if (planUpper.includes('MTN')) return 'MTN';
    if (planUpper.includes('GLO')) return 'GLO';
    if (planUpper.includes('AIRTEL')) return 'AIRTEL';
    if (planUpper.includes('9MOBILE') || planUpper.includes('ETISALAT')) return '9MOBILE';
    return 'Unknown';
  };

  const fetchPurchaseHistory = async () => {
    if (!user?.id) return;
    try {
      const { data: purchases, error } = await supabase
        .from('data_purchases')
        .select('plan_name, phone_number, provider, amount')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (purchases && purchases.length > 0) {
        setHasPurchases(true);
        setPhoneNumber(purchases[0].phone_number);
        const pastPlans = purchases.map((p) => p.plan_name);
        const similarPlans = await fetchSimilarPlans(purchases);
        const uniquePlans = Array.from(new Set([...pastPlans, ...similarPlans.map((p) => p.plan_name)]));
        setPopularPlans(uniquePlans);
      } else {
        setHasPurchases(false);
        setPopularPlans([]);
        setPhoneNumber(user?.user_metadata?.phone || '');
      }
    } catch (error) {
      console.error('Error fetching purchase history:', error);
      setHasPurchases(false);
      setPopularPlans([]);
      setPhoneNumber(user?.user_metadata?.phone || '');
    }
  };

  const fetchSimilarPlans = async (purchases: { provider: string; amount: number }[]): Promise<any[]> => {
    try {
      const providers = Array.from(new Set(purchases.map((p) => p.provider)));
      const amounts = purchases.map((p) => p.amount);
      const avgAmount = amounts.length > 0 ? amounts.reduce((sum, a) => sum + a, 0) / amounts.length : 300;
      const amountRange = [Math.max(100, avgAmount * 0.5), avgAmount * 1.5];

      const response = await fetch('https://ebenkdata.com/api/plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Token de883370902cf73e68ed63f566dbf38a38719f03',
        },
        body: JSON.stringify({
          providers,
          amount_range: amountRange,
        }),
      });

      const data = await response.json();
      if (data.status === 'success' && Array.isArray(data.plans)) {
        return data.plans.map((plan: any) => ({
          plan_name: `${plan.provider} ${plan.data} – ₦${plan.amount}`,
          provider: plan.provider,
          amount: plan.amount,
          data: plan.data,
          validity: plan.validity,
          variation_code: plan.variation_code,
        }));
      }
      return [];
    } catch (error) {
      console.error('Error fetching similar plans from API:', error);
      return [];
    }
  };

  const fetchNotificationCount = async () => {
    if (!user?.id) return;
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      if (error) throw error;
      setNotificationCount(count || 0);
    } catch (error) {
      console.error('Error fetching notification count:', error);
    }
  };

  const handleSwipePurchase = (plan: string) => {
    console.log('handleSwipePurchase called with plan:', plan);
    if (!hasTransactionPin) {
      setCreatePinModalVisible(true);
      return;
    }

    const providerName = getProviderFromPlan(plan);
    const prefilledPhone = phoneNumber || user?.user_metadata?.phone || '';

    const bundle: DataBundle = {
      id: Date.now(),
      data: plan.split(' – ')[0],
      price: parseInt(plan.match(/₦(\d+)/)?.[1] || '0'),
      validity: '30 days',
      category: 'Data',
      description: 'Data Bundle',
      variation_code: 'data_' + plan.toLowerCase().replace(/\s/g, '_'),
      planType: 'Data Plan',
    };

    const provider: Provider = {
      id: 1,
      name: providerName,
      image: '',
      code: providerName.toLowerCase(),
    };

    const params: ConfirmationParams = {
      bundle: JSON.stringify(bundle),
      provider: JSON.stringify(provider),
      phoneNumber: prefilledPhone,
      userEmail: user?.email,
      transactionPin: user?.user_metadata?.transaction_pin,
      source: 'index',
    };

    console.log('Navigating to Confirmation with params:', params);

    router.push({
      pathname: '../Confirmation',
      params: params as UnknownInputParams,
    });
  };

  useEffect(() => {
    fetchPurchaseHistory();
    fetchNotificationCount();

    // Real-time subscription for notifications
    const subscription = supabase
      .channel('notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user?.id}` }, () => {
        fetchNotificationCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user]);

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <View style={styles.header}>
        <Pressable onPress={() => router.push('../notifications')} style={styles.notificationIcon}>
          <View>
            <Ionicons name="notifications-outline" size={24} color="white" />
            {notificationCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{notificationCount}</Text>
              </View>
            )}
          </View>
        </Pressable>
      </View>
      <Text style={styles.welcomeTitle}>Welcome back</Text>
      <Text style={styles.username}>{username} 👋</Text>
      <Text style={styles.welcomeSubtitle}>Your business dashboard is here 🔥</Text>

      <View style={styles.quickActionsHeader}>
        <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
        <Pressable onPress={() => router.push('/(app)/(protected)/all-actions')}>
          <Text style={styles.moreButtonText}>More ... ></Text>
        </Pressable>
      </View>

      <View style={styles.quickActionsCard}>
        <View style={styles.quickActionsGrid}>
          {actions.map((action, index) => (
            <Pressable key={index} onPress={() => router.push(action.route)} style={styles.quickActionCard}>
              <Ionicons name={action.icon} size={24} color={action.color} />
              <Text style={styles.quickActionTitle}>
                {action.title.length > 12 ? action.title.slice(0, 11) + '...' : action.title}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {hasPurchases && popularPlans.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>🔥 Popular Plans</Text>
          {popularPlans.map((plan, index) => (
            <PlanItemWithSwipe
              key={plan}
              plan={plan}
              index={index}
              onSwipePurchase={() => handleSwipePurchase(plan)}
            />
          ))}
        </>
      )}

      <CreatePinModal
        visible={createPinModalVisible}
        onClose={closeCreatePinModal}
        newPin={newPin}
        setNewPin={setNewPin}
        confirmPin={confirmPin}
        setConfirmPin={setConfirmPin}
        showNewPin={showNewPin}
        setShowNewPin={setShowNewPin}
        showConfirmPin={showConfirmPin}
        setShowConfirmPin={setShowConfirmPin}
        onSave={handleCreatePin}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    paddingHorizontal: 16,
    paddingTop: StatusBar.currentHeight + 56,
  },
  header: {
    position: 'absolute',
    top: StatusBar.currentHeight || 48,
    right: 16,
    zIndex: 1,
  },
  notificationIcon: {
    padding: 8,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: 'red',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  username: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
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
    marginBottom: 24,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingVertical: 8,
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