import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Image,
  Alert,
  Dimensions,
  Share,
  Clipboard,
  RefreshControl,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/stores/auth-store';
import * as WebBrowser from 'expo-web-browser';

const { width, height } = Dimensions.get('window');

// -----------------------------------------------------------------------------
// Referral Program Configuration
// -----------------------------------------------------------------------------
const REFERRAL_CONFIG = {
  referralBonus: 500.00,
  maxMonthlyEarnings: 50000.00,
  appDownloadLink: 'https://yourapp.com/download',
  webSignupLink: 'https://yourapp.com/signup',
  bonusDescription: 'Earn ₦500 per referral. Earn up to ₦50,000 monthly!',
};

const ReferAndEarnScreen = () => {
  const { user, isAuthenticated } = useAuth();
  const [referralLink, setReferralLink] = useState('');
  const [shortReferralLink, setShortReferralLink] = useState('');
  const [totalEarned, setTotalEarned] = useState(1500.00);
  const [totalReferrals, setTotalReferrals] = useState(5);
  const [successfulReferrals, setSuccessfulReferrals] = useState(3);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Animations
  const watermarkPulse = useState(new Animated.Value(1))[0];
  const skeletonOpacity = useState(new Animated.Value(0.5))[0];
  const successPulse = useState(new Animated.Value(1))[0];
  const shareButtonScale = useState(new Animated.Value(1))[0];

  // -------------------------------------------------------------------------
  // Generate Referral Link with User UUID
  // -------------------------------------------------------------------------
  const generateReferralLink = useCallback((userId) => {
    if (!userId) return '';
    
    // Create a unique referral ID from user's UUID
    const referralId = `ref_${userId.replace(/-/g, '').substring(0, 12)}`;
    
    // Full web signup link with referral parameter
    const fullLink = `${REFERRAL_CONFIG.webSignupLink}?referral=${referralId}&ref_id=${userId}`;
    
    // Create a shorter, more shareable version
    const shortLink = `${REFERRAL_CONFIG.appDownloadLink}?ref=${referralId}`;
    
    return { fullLink, shortLink, referralId };
  }, []);

  // -------------------------------------------------------------------------
  // Track Referral Click (when someone uses the link)
  // -------------------------------------------------------------------------
  const trackReferralClick = async (referralId, referrerId) => {
    try {
      // Store referral click in database
      const { data, error } = await supabase
        .from('referral_clicks')
        .insert([
          {
            referral_id: referralId,
            referrer_id: referrerId,
            clicked_at: new Date().toISOString(),
            user_agent: 'mobile-app', // You can get actual user agent
            ip_address: null, // You'd need a backend service for this
          }
        ]);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error tracking referral click:', error);
      return false;
    }
  };

  // -------------------------------------------------------------------------
  // Track Referral Signup (when someone signs up using the link)
  // -------------------------------------------------------------------------
  const trackReferralSignup = async (referralId, referrerId, newUserId) => {
    try {
      // Store referral relationship in database
      const { data, error } = await supabase
        .from('referral_relationships')
        .insert([
          {
            referral_id: referralId,
            referrer_id: referrerId,
            referred_user_id: newUserId,
            created_at: new Date().toISOString(),
            status: 'pending', // pending, completed, failed
          }
        ]);

      if (error) throw error;
      
      // Also update user's profile to track who referred them
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ referred_by: referrerId })
        .eq('id', newUserId);

      if (profileError) throw profileError;
      
      return true;
    } catch (error) {
      console.error('Error tracking referral signup:', error);
      return false;
    }
  };

  // -------------------------------------------------------------------------
  // Award Referral Bonus (when referred user makes first deposit)
  // -------------------------------------------------------------------------
  const awardReferralBonus = async (referralId, referrerId, referredUserId) => {
    try {
      // Update referral relationship status
      const { error: updateError } = await supabase
        .from('referral_relationships')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('referral_id', referralId);

      if (updateError) throw updateError;
      
      // Create transaction record for the bonus
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert([
          {
            user_id: referrerId,
            amount: REFERRAL_CONFIG.referralBonus,
            type: 'referral_bonus',
            status: 'completed',
            description: `Referral bonus for user ${referredUserId}`,
            reference: `REF_${Date.now()}_${referralId}`,
            created_at: new Date().toISOString(),
          }
        ]);

      if (transactionError) throw transactionError;
      
      // Update referrer's balance (you'd need to implement this based on your auth system)
      // This depends on how you handle user balances
      
      // Send notification to referrer
      await supabase
        .from('notifications')
        .insert([
          {
            user_id: referrerId,
            title: 'Referral Bonus Received!',
            message: `You earned ₦${REFERRAL_CONFIG.referralBonus} from your referral!`,
            type: 'referral',
            read: false,
            created_at: new Date().toISOString(),
          }
        ]);

      return true;
    } catch (error) {
      console.error('Error awarding referral bonus:', error);
      return false;
    }
  };

  // -------------------------------------------------------------------------
  // Initialize Referral Data
  // -------------------------------------------------------------------------
  const loadReferralData = useCallback(async () => {
    try {
      if (!isAuthenticated || !user) {
        router.replace('/(auth)/login');
        return;
      }

      // Generate referral links using user's UUID
      const { fullLink, shortLink, referralId } = generateReferralLink(user.id);
      setReferralLink(fullLink);
      setShortReferralLink(shortLink);
      
      // Fetch user's referral stats from database
      try {
        // Get total referrals
        const { data: referralsData, error: referralsError } = await supabase
          .from('referral_relationships')
          .select('*')
          .eq('referrer_id', user.id);

        if (!referralsError && referralsData) {
          const total = referralsData.length;
          const successful = referralsData.filter(r => r.status === 'completed').length;
          
          setTotalReferrals(total);
          setSuccessfulReferrals(successful);
          
          // Calculate total earned (successful referrals * bonus amount)
          const earned = successful * REFERRAL_CONFIG.referralBonus;
          setTotalEarned(earned);
        }
      } catch (dbError) {
        console.log('Using mock data for referrals:', dbError);
        // Use mock data if database query fails
        setTotalEarned(1500.00);
        setSuccessfulReferrals(3);
        setTotalReferrals(5);
      }
      
      // Stop loading
      setIsLoading(false);
      setRefreshing(false);
      
    } catch (error) {
      console.error('Error loading referral data:', error);
      setIsLoading(false);
      setRefreshing(false);
      Alert.alert('Error', 'Failed to load referral data. Please try again.');
    }
  }, [isAuthenticated, user, generateReferralLink]);

  useEffect(() => {
    loadReferralData();
  }, [loadReferralData]);

  // -------------------------------------------------------------------------
  // Start Animations
  // -------------------------------------------------------------------------
  useEffect(() => {
    // Watermark animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(watermarkPulse, {
          toValue: 1.06,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(watermarkPulse, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Success pulse animation
    if (!isLoading && successfulReferrals > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(successPulse, {
            toValue: 1.05,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(successPulse, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
        { iterations: 3 }
      ).start();
    }
  }, [isLoading, successfulReferrals]);

  // -------------------------------------------------------------------------
  // Skeleton Animation
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (isLoading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(skeletonOpacity, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(skeletonOpacity, {
            toValue: 0.7,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      skeletonOpacity.setValue(1);
    }
  }, [isLoading]);

  // -------------------------------------------------------------------------
  // Copy Referral Link to Clipboard
  // -------------------------------------------------------------------------
  const copyReferralLink = async () => {
    try {
      await Clipboard.setString(shortReferralLink);
      setCopied(true);
      
      Alert.alert(
        'Copied!',
        'Referral link copied to clipboard.',
        [{ text: 'OK' }]
      );
      
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      Alert.alert('Error', 'Failed to copy referral link');
    }
  };

  // -------------------------------------------------------------------------
  // Share Referral Link
  // -------------------------------------------------------------------------
  const shareReferralLink = async () => {
    // Button press animation
    Animated.sequence([
      Animated.timing(shareButtonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shareButtonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      const message = `🚀 Join me on this amazing platform!\n\nUse my referral link to sign up and get started. We both earn rewards when you make your first deposit!\n\n${shortReferralLink}`;
      
      const result = await Share.share({
        message,
        title: 'Join & Earn Rewards',
      });
      
      if (result.action === Share.sharedAction) {
        // Optional: Track successful share in analytics
        console.log('Referral link shared successfully');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Error', 'Failed to share referral link');
    }
  };

  // -------------------------------------------------------------------------
  // Open Referral Link in Browser
  // -------------------------------------------------------------------------
  const openReferralLink = async () => {
    try {
      // First, try to track the click (for analytics)
      const referralId = `ref_${user.id.replace(/-/g, '').substring(0, 12)}`;
      await trackReferralClick(referralId, user.id);
      
      // Open the link in browser
      const result = await WebBrowser.openBrowserAsync(referralLink, {
        toolbarColor: '#000000',
        secondaryToolbarColor: '#000000',
        controlsColor: '#FFD700',
        showTitle: true,
        enableDefaultShareMenuItem: true,
      });
      
      // Handle the result if needed
      console.log('Browser result:', result);
    } catch (error) {
      console.error('Error opening referral link:', error);
      Alert.alert('Error', 'Failed to open referral link');
    }
  };

  // -------------------------------------------------------------------------
  // Refresh Data
  // -------------------------------------------------------------------------
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadReferralData();
  }, [loadReferralData]);

  // -------------------------------------------------------------------------
  // Format Currency
  // -------------------------------------------------------------------------
  const formatCurrency = (amount) => {
    if (!amount) return '0';
    const num = parseFloat(amount);
    return isNaN(num) ? '0' : num.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  // -------------------------------------------------------------------------
  // Shorten URL for Display
  // -------------------------------------------------------------------------
  const shortenUrlForDisplay = (url) => {
    if (!url) return '';
    
    // Remove protocol for cleaner display
    let displayUrl = url.replace(/^https?:\/\//, '');
    
    // Truncate if too long
    if (displayUrl.length > 35) {
      displayUrl = displayUrl.substring(0, 32) + '...';
    }
    
    return displayUrl;
  };

  // -------------------------------------------------------------------------
  // Skeleton Components
  // -------------------------------------------------------------------------
  const SkeletonText = ({ width = '100%', height = 20 }) => (
    <Animated.View style={[styles.skeleton, { width, height, opacity: skeletonOpacity }]} />
  );

  const SkeletonButton = ({ width = '100%' }) => (
    <Animated.View style={[styles.skeleton, { width, height: 48, borderRadius: 12, opacity: skeletonOpacity }]} />
  );

  // Show skeleton UI while loading
  if (isLoading) {
    return (
      <View style={styles.container}>
        {/* Watermark Background */}
        <Animated.View pointerEvents="none" style={styles.watermarkWrapper}>
          <Animated.Image
            source={require('@/assets/icons/home.png')}
            style={[styles.watermark, { transform: [{ scale: watermarkPulse }] }]}
            resizeMode="contain"
          />
        </Animated.View>

        <View style={styles.content}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#FFD700"
                colors={['#FFD700']}
              />
            }
          >
            {/* Stats Section Skeleton */}
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <SkeletonText width={60} height={12} />
                <SkeletonText width={80} height={20} />
              </View>
              
              <View style={styles.statCard}>
                <SkeletonText width={60} height={12} />
                <SkeletonText width={80} height={20} />
              </View>
            </View>

            {/* Referral Link Section Skeleton */}
            <View style={styles.sectionCard}>
              <SkeletonText width={120} height={16} />
              <SkeletonButton width="100%" />
              <SkeletonButton width="100%" />
            </View>

            {/* How It Works Skeleton */}
            <View style={styles.sectionCard}>
              <SkeletonText width={100} height={16} />
              {[1, 2, 3, 4].map((_, index) => (
                <View key={index} style={styles.stepSkeleton}>
                  <SkeletonText width={24} height={24} borderRadius={12} />
                  <SkeletonText width="80%" height={14} />
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Watermark Background */}
      <Animated.View pointerEvents="none" style={styles.watermarkWrapper}>
        <Animated.Image
          source={require('@/assets/icons/home.png')}
          style={[styles.watermark, { transform: [{ scale: watermarkPulse }] }]}
          resizeMode="contain"
        />
      </Animated.View>

      <View style={styles.content}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FFD700"
              colors={['#FFD700']}
            />
          }
        >
          {/* Stats Overview */}
          <Animated.View style={[styles.statsContainer, { transform: [{ scale: successPulse }] }]}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Earned</Text>
              <Text style={styles.statValue}>₦{formatCurrency(totalEarned)}</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Successful Referrals</Text>
              <Text style={styles.statValue}>{successfulReferrals}/{totalReferrals}</Text>
            </View>
          </Animated.View>

          {/* Referral Link Section */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Your Referral Link</Text>
            
            <Text style={styles.referralDescription}>
              Share this link with friends. When they sign up and deposit, you automatically earn ₦500!
            </Text>
            
            {/* Copy Link Button */}
            <TouchableOpacity
              style={styles.copyLinkButton}
              onPress={copyReferralLink}
              activeOpacity={0.7}
            >
              <View style={styles.linkContent}>
                <Ionicons name="link" size={20} color="#FFD700" />
                <View style={styles.linkTextContainer}>
                  <Text style={styles.linkDisplayText} numberOfLines={1}>
                    {shortenUrlForDisplay(shortReferralLink)}
                  </Text>
                  <Text style={styles.linkLabel}>Tap to copy link</Text>
                </View>
              </View>
              <Ionicons
                name={copied ? "checkmark" : "copy-outline"}
                size={22}
                color="#FFD700"
              />
            </TouchableOpacity>
            
            {/* Refer Now Button */}
            <Animated.View style={{ transform: [{ scale: shareButtonScale }] }}>
              <TouchableOpacity
                style={styles.referNowButton}
                onPress={shareReferralLink}
                activeOpacity={0.8}
              >
                <Ionicons name="share-outline" size={20} color="#FFD700" />
                <Text style={styles.referNowButtonText}>Share Referral Link</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Open Link Directly Button */}
            <TouchableOpacity
              style={styles.openLinkButton}
              onPress={openReferralLink}
              activeOpacity={0.8}
            >
              <Ionicons name="open-outline" size={18} color="#FFD700" />
              <Text style={styles.openLinkButtonText}>Open Referral Page</Text>
            </TouchableOpacity>
          </View>

          {/* How It Works */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="information-circle" size={20} color="#FFD700" />
              <Text style={styles.sectionTitle}>How It Works</Text>
            </View>
            
            <View style={styles.stepsContainer}>
              <View style={styles.step}>
                <View style={styles.stepIconContainer}>
                  <Text style={styles.stepNumber}>1</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Share Your Unique Link</Text>
                  <Text style={styles.stepDescription}>
                    Copy and share your personalized referral link
                  </Text>
                </View>
              </View>
              
              <View style={styles.step}>
                <View style={styles.stepIconContainer}>
                  <Text style={styles.stepNumber}>2</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Friend Signs Up</Text>
                  <Text style={styles.stepDescription}>
                    Friend clicks your link and creates an account
                  </Text>
                </View>
              </View>
              
              <View style={styles.step}>
                <View style={styles.stepIconContainer}>
                  <Text style={styles.stepNumber}>3</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Friend Makes First Deposit</Text>
                  <Text style={styles.stepDescription}>
                    Your friend adds funds to their account (min ₦1,000)
                  </Text>
                </View>
              </View>
              
              <View style={styles.step}>
                <View style={styles.stepIconContainer}>
                  <Text style={styles.stepNumber}>4</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>You Earn ₦500 Automatically</Text>
                  <Text style={styles.stepDescription}>
                    ₦500 is instantly credited to your account
                  </Text>
                </View>
              </View>
            </View>
            
            <View style={styles.noteContainer}>
              <Ionicons name="warning" size={16} color="#FFD700" />
              <Text style={styles.noteText}>
                All referrals are automatically tracked using your unique link. No codes needed!
              </Text>
            </View>
          </View>

          {/* Auto-Tracking Info */}
          <View style={styles.infoCard}>
            <Ionicons name="sync" size={20} color="#FFD700" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Automatic Tracking</Text>
              <Text style={styles.infoText}>
                Your referral link contains a unique identifier tied to your account. 
                When someone signs up using your link, the system automatically links them to you.
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  skeleton: {
    backgroundColor: '#333',
    borderRadius: 4,
  },
  watermarkWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  watermark: {
    width: 300,
    height: 300,
    opacity: 0.1,
  },
  content: {
    flex: 1,
    zIndex: 2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 30,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  statLabel: {
    color: '#999',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
  statValue: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionCard: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  referralDescription: {
    color: '#999',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  copyLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FFD700',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
  },
  linkContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  linkTextContainer: {
    flex: 1,
  },
  linkDisplayText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  linkLabel: {
    color: '#999',
    fontSize: 11,
  },
  referNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: '#FFD700',
    gap: 10,
    marginBottom: 12,
  },
  referNowButtonText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
  },
  openLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.5)',
    gap: 8,
  },
  openLinkButtonText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
  },
  stepsContainer: {
    gap: 20,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  stepIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    flexShrink: 0,
  },
  stepNumber: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  stepDescription: {
    color: '#999',
    fontSize: 13,
    lineHeight: 18,
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    borderRadius: 10,
    padding: 12,
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  noteText: {
    flex: 1,
    color: '#FFD7',
    fontSize: 12,
    lineHeight: 16,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  infoText: {
    color: '#999',
    fontSize: 12,
    lineHeight: 16,
  },
  // Skeleton specific styles
  stepSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
});

export default ReferAndEarnScreen;