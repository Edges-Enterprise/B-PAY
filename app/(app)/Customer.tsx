import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  ScrollView,
  StatusBar,
  TextInput,
  TouchableOpacity,
  Alert,
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

const CustomerCare: React.FC = () => {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
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

  // Fetch user data
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
    } catch (error) {
      console.error('Error fetching user data:', error);
      Alert.alert('Error', 'Failed to load user data.');
    }
  };

  // Submit issue to Supabase and simulate email
  const submitIssue = async () => {
    if (!title || !description) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    try {
      const { error } = await supabase
        .from('customer_issues')
        .insert({
          user_id: user?.id,
          title,
          description,
          email: user?.email || 'no-email@edgesnetwork.app',
        });
      if (error) throw error;

      // Simulate sending email to Edgesenterprice@outlook.com
      const emailBody = `New Issue from ${user?.email || 'Unknown'}:\nTitle: ${title}\nDescription: ${description}\nTime: ${new Date().toISOString()}`;
      console.log(`Email sent to Edgesenterprice@outlook.com:\n${emailBody}`);
      Alert.alert('Success', 'Issue submitted! Our team will contact you soon.');

      // Clear form
      setTitle('');
      setDescription('');
    } catch (error) {
      console.error('Error submitting issue:', error);
      Alert.alert('Error', 'Failed to submit issue. Please try again.');
    }
  };

  // Handle back navigation
  const handleBack = () => {
    router.back();
  };

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
            <Text style={styles.title}>Customer Care</Text>
            <View style={styles.headerUnderline} />
          </View>
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.heroCard}>
            <Text style={styles.headline}>Need Help?</Text>
            <Text style={styles.subheadline}>
              Submit your issue below. Our team at <Text style={styles.subheadlines}>Edgesenterprice@outlook.com </Text> will assist you.
            </Text>

            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Issue Title"
              placeholderTextColor="#B0B0B0"
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe your issue"
              placeholderTextColor="#B0B0B0"
              multiline
            />
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity style={styles.ctaButton} onPress={submitIssue}>
                <Text style={styles.ctaText}>Submit Issue</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>

          <View style={styles.tierCard}>
            <Text style={styles.cardTitle}>Frequently Asked Questions</Text>
            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>How do I buy data?</Text>
              <Text style={styles.faqAnswer}>
                Go to the Data section, select your plan, and follow the payment steps.
              </Text>
            </View>
            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>Why is my data not working?</Text>
              <Text style={styles.faqAnswer}>
                Check your network or contact support with your purchase details.
              </Text>
            </View>
            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>How do I track referrals?</Text>
              <Text style={styles.faqAnswer}>
                Visit the Refer & Earn page to see your referral history.
              </Text>
            </View>
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
  subheadlines: {
    color: '#3B82F6',
  },
  
  subheadline: {
    fontSize: scaleFont(14),
    fontWeight: '400',
    color: '#B0B0B0',
    textAlign: 'center',
    marginBottom: scaleSize(16),
  },
  input: {
    backgroundColor: '#2C2C2E',
    borderRadius: scaleSize(8),
    padding: scaleSize(12),
    color: '#FFFFFF',
    fontSize: scaleFont(14),
    marginBottom: scaleSize(12),
  },
  textArea: {
    height: scaleSize(100),
    textAlignVertical: 'top',
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
  faqItem: {
    marginBottom: scaleSize(12),
  },
  faqQuestion: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: '#FFD700',
  },
  faqAnswer: {
    fontSize: scaleFont(12),
    fontWeight: '400',
    color: '#B0B0B0',
    marginTop: scaleSize(4),
  },
});

export default CustomerCare;