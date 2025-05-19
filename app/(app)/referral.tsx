import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Share,
  Alert,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { Dimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL or Anon Key is missing in environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Get screen dimensions
const { width, height } = Dimensions.get('window');
const scaleFont = (size: number) => (width / 375) * size;
const scaleSize = (size: number) => (width / 375) * size;

const ReferralPage: React.FC = () => {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [rank, setRank] = useState('Bronze');
  const [totalRewards, setTotalRewards] = useState(0);
  const [birthday, setBirthday] = useState<string>('');
  const [isEligibleFor10GB, setIsEligibleFor10GB] = useState(false);
  const [isEligibleForBirthday, setIsEligibleForBirthday] = useState(false);
  const [isEligibleForRevenue, setIsEligibleForRevenue] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Animations
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    fetchUserData();
  }, []);

  // Fetch user data and referrals
  const fetchUserData = async () => {
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) throw new Error('No active session');

      const userId = sessionData.session.user.id;
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (userError) throw userError;

      setUser(userData);
      setBirthday(userData.birthday ? new Date(userData.birthday).toISOString().split('T')[0] : '');
      setRank(userData.rank);

      // Fetch referrals
      const { data: referralData, error: referralError } = await supabase
        .from('referrals')
        .select('*, referee:referee_id(username, email)')
        .eq('referrer_id', userId);
      if (referralError) throw referralError;

      const formattedReferrals = referralData.map((r) => ({
        name: r.referee.username,
        date: new Date(r.created_at).toLocaleDateString(),
        status: r.status,
        reward: r.status === 'Earned' ? '₦500' : '₦0',
      }));
      setReferrals(formattedReferrals);
      setTotalReferrals(referralData.length);

      // Fetch total rewards
      const { data: rewardsData, error: rewardsError } = await supabase
        .from('rewards')
        .select('reward_amount')
        .eq('user_id', userId);
      if (rewardsError) throw rewardsError;
      const total = rewardsData.reduce((sum, r) => sum + r.reward_amount, 0);
      setTotalRewards(total);

      // Check eligibility
      await checkEligibility(userId);
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to load referral data.');
    }
  };

  // Check eligibility for rewards
  const checkEligibility = async (userId: string) => {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    // User's total data purchases in the last 30 days
    const { data: userPurchases, error: purchaseError } = await supabase
      .from('data_purchases')
      .select('amount')
      .eq('user_id', userId)
      .gte('purchase_date', lastMonth.toISOString());
    if (purchaseError) throw purchaseError;

    const totalUserPurchases = userPurchases.reduce((sum, p) => sum + (p.amount || 0), 0);
    setIsEligibleForBirthday(totalUserPurchases >= 100);
    setIsEligibleForRevenue(totalUserPurchases >= 50);

    // Referral eligibility (10 users with 500GB each)
    const { data: referralData, error: referralError } = await supabase
      .from('referrals')
      .select('referee_id')
      .eq('referrer_id', userId)
      .eq('status', 'Earned');
    if (referralError) throw referralError;

    let eligibleReferrals = 0;
    for (const referral of referralData) {
      const { data: refereePurchases, error: refereeError } = await supabase
        .from('data_purchases')
        .select('amount')
        .eq('user_id', referral.referee_id)
        .gte('purchase_date', lastMonth.toISOString());
      if (refereeError) continue;

      const totalRefereePurchases = refereePurchases.reduce((sum, p) => sum + (p.amount || 0), 0);
      if (totalRefereePurchases >= 500) eligibleReferrals++;
    }
    setIsEligibleFor10GB(eligibleReferrals >= 10);
  };

  // Update birthday
  const updateBirthday = async () => {
    if (!birthday || !/^\d{4}-\d{2}-\d{2}$/.test(birthday)) {
      Alert.alert('Error', 'Please enter a valid birthday (YYYY-MM-DD).');
      return;
    }

    const birthDate = new Date(birthday);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    if (age < 1 || age > 50) {
      Alert.alert('Error', 'Age must be between 1 and 50 years.');
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ birthday: birthDate.toISOString() })
        .eq('id', user?.id);
      if (error) throw error;
      Alert.alert('Success', 'Birthday updated successfully!');
    } catch (error) {
      console.error('Error updating birthday:', error);
      Alert.alert('Error', 'Failed to update birthday.');
    }
  };

  // Handle sharing referral link
  const handleShare = async () => {
    if (!user) return;
    try {
      const message = `Join Edges Network and get ₦200 off your first data bundle! Use my link: https://edgesnetwork.app/refer/${user.referral_code}`;
      await Share.share({ message });
    } catch (error) {
      Alert.alert('Error', 'Failed to share referral link.');
    }
  };

  // Handle back navigation
  const handleBack = () => {
    router.back();
  };

  // Calculate rank and progress
  const ranks = [
    { name: 'Bronze', min: 0, max: 9 },
    { name: 'Silver', min: 10, max: 24 },
    { name: 'Gold', min: 25, max: 49 },
    { name: 'Platinum', min: 50, max: 99 },
    { name: 'Legend', min: 100, max: 199 },
    { name: 'Equal', min: 200, max: 499 },
    { name: 'Pirate', min: 500, max: 999 },
    { name: 'Edges', min: 1000, max: Infinity },
  ];
  const currentRank = ranks.find((r) => totalReferrals >= r.min && totalReferrals <= r.max);
  const nextRank = ranks.find((r) => r.min > totalReferrals) || ranks[ranks.length - 1];
  const neededReferrals = nextRank.min - totalReferrals;

  return (
    <Animated.View style={[styles.rootContainer, { opacity: fadeAnim }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.innerContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerContainer}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backArrow}>←</Text>
          </Pressable>
          <View>
            <Text style={styles.title}>Refer & Earn</Text>
            <View style={styles.headerUnderline} />
          </View>
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.heroCard}>
            <Text style={styles.headline}>Share the Data, Earn Big!</Text>
            <Text style={styles.subheadline}>
              Invite 10 friends who each purchase 500GB in a month to earn 10GB free data. Reach the Edges rank to become an agent or reseller!
            </Text>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity style={styles.ctaButton} onPress={handleShare}>
                <Text style={styles.ctaText}>Invite Friends Now</Text>
              </TouchableOpacity>
            </Animated.View>
            {user && (
              <Text style={styles.referralCode}>Your Code: {user.referral_code}</Text>
            )}
          </View>

          <View style={styles.tierCard}>
            <Text style={styles.cardTitle}>Birthday Surprise</Text>
            <Text style={styles.subheadline}>
              Enter your birthday to get Free Data (GB)🎉🎉🎉. Requires 100GB purchased last month.
            </Text>
            <TextInput
              style={styles.input}
              value={birthday}
              onChangeText={setBirthday}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#B0B0B0"
              keyboardType="numeric"
            />
            <TouchableOpacity style={styles.ctaButton} onPress={updateBirthday}>
              <Text style={styles.ctaText}>Save Birthday</Text>
            </TouchableOpacity>
            <Text style={styles.eligibilityText}>
              {isEligibleForBirthday
                ? '✅ Eligible for Birthday Surprise'
                : '❌ Need 100GB purchased last month'}
            </Text>
          </View>

          <View style={styles.tierCard}>
            <Text style={styles.cardTitle}>Your Progress</Text>
            <Text style={styles.tierText}>Current Rank: {rank}</Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(totalReferrals / nextRank.min) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {totalReferrals} referrals • {neededReferrals} more to {nextRank.name}
            </Text>
            <Text style={styles.rewardsText}>Total Rewards: {totalRewards} GB</Text>
            <Text style={styles.eligibilityText}>
              {isEligibleFor10GB
                ? '✅ Eligible for 10GB Reward'
                : '❌ Need 10 referrals with 500GB each last month'}
            </Text>
            <Text style={styles.eligibilityText}>
              {isEligibleForRevenue
                ? '✅ Eligible for Revenue Sharing'
                : '❌ Need 50GB purchased last month'}
            </Text>
            {rank === 'Edges' && (
              <Text style={styles.eligibilityText}>
                🎉 Congratulations! You qualify to become an Edges agent or reseller.
              </Text>
            )}
          </View>

          <View style={styles.tierCard}>
            <Text style={styles.cardTitle}>Referral Ranks</Text>
            {ranks.map((r, index) => (
              <View key={index} style={styles.tierItem}>
                <Ionicons
                  name="medal"
                  size={scaleFont(20)}
                  color={r.name === rank ? '#FFD700' : '#C0C0C0'}
                />
                <Text style={styles.tierItemText}>
                  {r.name} ({r.min}–{r.max === Infinity ? '∞' : r.max} referrals)
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.tierCard}>
            <Text style={styles.cardTitle}>Referral History</Text>
            {referrals.length === 0 ? (
              <Text style={styles.subheadline}>No referrals yet.</Text>
            ) : (
              referrals.map((referral, index) => (
                <View key={index} style={styles.historyItem}>
                  <Text style={styles.historyName}>{referral.name}</Text>
                  <Text style={styles.historyDetails}>
                    {referral.date} • {referral.status} • {referral.reward}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  innerContainer: {
    paddingTop: scaleSize(60),
    paddingHorizontal: scaleSize(16),
    flexGrow: 1,
    backgroundColor: '#000000',
    paddingBottom: scaleSize(20),
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scaleSize(24),
  },
  title: {
    fontSize: scaleFont(24),
    fontWeight: '700',
    color: '#FFD700',
    flex: 1,
  },
  headerUnderline: {
    height: scaleSize(2),
    backgroundColor: '#FFD700',
    width: scaleSize(120),
    marginTop: scaleSize(4),
  },
  backButton: {
    padding: scaleSize(8),
    marginRight: scaleSize(8),
  },
  backArrow: {
    fontSize: scaleFont(20),
    color: '#FFD700',
  },
  contentContainer: {
    marginTop: scaleSize(32),
    alignItems: 'center',
  },
  heroCard: {
    backgroundColor: 'rgba(28, 28, 30, 0.9)',
    borderRadius: scaleSize(12),
    padding: scaleSize(16),
    marginBottom: scaleSize(16),
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  headline: {
    fontSize: scaleFont(20),
    fontWeight: '700',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: scaleSize(8),
  },
  subheadline: {
    fontSize: scaleFont(14),
    fontWeight: '400',
    color: '#B0B0B0',
    textAlign: 'center',
    marginBottom: scaleSize(16),
  },
  ctaButton: {
    backgroundColor: '#FFD700',
    borderRadius: scaleSize(8),
    padding: scaleSize(12),
    alignItems: 'center',
  },
  ctaText: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#000000',
  },
  referralCode: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: '#FFD700',
    textAlign: 'center',
    marginTop: scaleSize(12),
  },
  tierCard: {
    backgroundColor: 'rgba(28, 28, 30, 0.9)',
    borderRadius: scaleSize(12),
    padding: scaleSize(16),
    marginBottom: scaleSize(16),
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  cardTitle: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: scaleSize(12),
  },
  tierText: {
    fontSize: scaleFont(14),
    fontWeight: '500',
    color: '#FFD700',
    marginBottom: scaleSize(8),
  },
  progressBar: {
    height: scaleSize(8),
    backgroundColor: '#2C2C2E',
    borderRadius: scaleSize(4),
    overflow: 'hidden',
    marginBottom: scaleSize(8),
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFD700',
  },
  progressText: {
    fontSize: scaleFont(12),
    fontWeight: '400',
    color: '#B0B0B0',
    textAlign: 'center',
  },
  rewardsText: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: '#FFD700',
    textAlign: 'center',
    marginTop: scaleSize(8),
  },
  tierItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scaleSize(8),
  },
  tierItemText: {
    fontSize: scaleFont(14),
    fontWeight: '400',
    color: '#FFFFFF',
    marginLeft: scaleSize(8),
  },
  historyItem: {
    marginBottom: scaleSize(12),
  },
  historyName: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  historyDetails: {
    fontSize: scaleFont(12),
    fontWeight: '400',
    color: '#B0B0B0',
  },
  input: {
    backgroundColor: '#2C2C2E',
    borderRadius: scaleSize(8),
    padding: scaleSize(12),
    color: '#FFFFFF',
    fontSize: scaleFont(14),
    marginBottom: scaleSize(12),
  },
  eligibilityText: {
    fontSize: scaleFont(12),
    fontWeight: '400',
    color: '#FFD700',
    textAlign: 'center',
    marginTop: scaleSize(8),
  },
});

export default ReferralPage;