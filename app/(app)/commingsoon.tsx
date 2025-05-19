import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  StatusBar,
  TouchableOpacity,
  ImageBackground,
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

// Target launch date (adjust as needed)
const targetDate = new Date('2025-06-01T00:00:00+01:00'); // June 1, 2025, 12:00 AM WAT

const ComingSoon: React.FC = () => {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

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

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  function calculateTimeLeft() {
    const now = new Date();
    const difference = targetDate.getTime() - now.getTime();

    if (difference <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds };
  }

  const handleNotifyMe = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const email = sessionData.session?.user.email || '';
      if (!email) {
        Alert.alert('Error', 'Please log in to receive notifications.');
        return;
      }

      const { error } = await supabase
        .from('coming_soon_notifications')
        .insert({ email });
      if (error) throw error;

      Alert.alert('Success', 'You will be notified when we launch!');
    } catch (error) {
      console.error('Error saving notification:', error);
      Alert.alert('Error', 'Failed to save notification. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../../assets/images/coming.png')} // Replace with your PNG path
        style={styles.backgroundImage}
        resizeMode="contain"
      />
      <View style={styles.overlay}>
        <Animated.View style={{ opacity: fadeAnim }}>
          <StatusBar barStyle="light-content" backgroundColor="rgba(0, 0, 0, 0.5)" />
          <View style={styles.contentContainer}>
            <Text style={styles.title}>Coming Soon</Text>
            <Text style={styles.subtitle}>
              Exciting updates are on the way! Stay tuned.
            </Text>

            <View style={styles.countdownContainer}>
              <View style={styles.countdownItem}>
                <Text style={styles.countdownValue}>{timeLeft.days}</Text>
                <Text style={styles.countdownLabel}>Days</Text>
              </View>
              <Text style={styles.countdownSeparator}>:</Text>
              <View style={styles.countdownItem}>
                <Text style={styles.countdownValue}>{timeLeft.hours}</Text>
                <Text style={styles.countdownLabel}>Hours</Text>
              </View>
              <Text style={styles.countdownSeparator}>:</Text>
              <View style={styles.countdownItem}>
                <Text style={styles.countdownValue}>{timeLeft.minutes}</Text>
                <Text style={styles.countdownLabel}>Minutes</Text>
              </View>
              <Text style={styles.countdownSeparator}>:</Text>
              <View style={styles.countdownItem}>
                <Text style={styles.countdownValue}>{timeLeft.seconds}</Text>
                <Text style={styles.countdownLabel}>Seconds</Text>
              </View>
            </View>

            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity style={styles.ctaButton} onPress={handleNotifyMe}>
                <Text style={styles.ctaText}>Notify Me</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Solid black background
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // Adjust the following transform properties to rotate, resize, and shift the image
    // - To rotate: Add 'rotate: "45deg"' (e.g., 45 degrees clockwise, use negative for counterclockwise)
    // - To increase size: Add 'scale: 1.5' (e.g., 150% size, use values > 1 to enlarge)
    // - To shift left: Add 'translateX: -50' (e.g., 50 units left, use negative values)
    // - To shift up: Add 'translateY: -50' (e.g., 50 units up, use negative values)
    // - To shift right: Add 'translateX: 50' (e.g., 50 units right, use positive values)
    // - To shift down: Add 'translateY: 50' (e.g., 50 units down, use positive values)
    // Current settings: rotate: '30deg', scale: 1.7, translateX: -8, translateY: -10
    transform: [
      { rotate: '30deg' },
      { scale: 1.7 },
      { translateX: -8 },
      { translateY: -10 },
    ],
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // Semi-transparent overlay for readability
    justifyContent: 'center',
    paddingTop: scaleSize(60),
    paddingBottom: scaleSize(20),
  },
  contentContainer: {
    alignItems: 'center',
    paddingHorizontal: scaleSize(16),
    paddingVertical: scaleSize(20),
  },
  title: {
    fontSize: scaleFont(32),
    fontWeight: '700',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: scaleSize(8),
  },
  subtitle: {
    fontSize: scaleFont(16),
    fontWeight: '400',
    color: '#B0B0B0',
    textAlign: 'center',
    marginBottom: scaleSize(24),
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scaleSize(24),
  },
  countdownItem: {
    alignItems: 'center',
    marginHorizontal: scaleSize(4),
  },
  countdownValue: {
    fontSize: scaleFont(24),
    fontWeight: '700',
    color: '#FFD700',
  },
  countdownLabel: {
    fontSize: scaleFont(12),
    fontWeight: '400',
    color: '#B0B0B0',
  },
  countdownSeparator: {
    fontSize: scaleFont(24),
    color: '#FFD700',
    marginHorizontal: scaleSize(4),
  },
  ctaButton: {
    backgroundColor: '#FFD700',
    borderRadius: scaleSize(8),
    paddingVertical: scaleSize(12),
    paddingHorizontal: scaleSize(24),
    alignItems: 'center',
  },
  ctaText: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#000000',
  },
});

export default ComingSoon;