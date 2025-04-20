import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  GestureHandlerRootView,
  PanGestureHandler,
  State,
} from 'react-native-gesture-handler';

const { width, height } = Dimensions.get('window');

const sections = [
  {
    title: 'Account',
    items: ['Edit Profile', 'Change Password', 'Change Email'],
  },
  {
    title: 'Preferences',
    items: ['Notifications', 'Sound', 'Themes', 'Authentication'],
  },
  {
    title: 'Security',
    items: ['Biometric Login', 'Two-Factor Authentication', 'Device Management'],
  },
  {
    title: 'Billing',
    items: ['Manage Subscriptions', 'Payment Methods', 'Invoices'],
  },
  {
    title: 'Privacy',
    items: ['Data Sharing', 'Location Services', 'Ad Preferences'],
  },
];

export default function Settings() {
  const router = useRouter();
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [sectionOrder, setSectionOrder] = useState(sections);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  // Animation values
  const slideAnim = useSharedValue(width);
  const cardScale = useSharedValue(0.8);
  const cardOpacity = useSharedValue(0);
  const cardY = useSharedValue(100);

  // Logout slide-in effect after 20 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setLogoutVisible(true);
      slideAnim.value = withTiming(0, { duration: 500 });
    }, 20000);

    return () => clearTimeout(timer);
  }, []);

  // Handle section toggle with animation
  const handleSectionToggle = (sectionTitle: string) => {
    if (openSection === sectionTitle) {
      cardScale.value = withTiming(0.8, { duration: 300 });
      cardOpacity.value = withTiming(0, { duration: 300 });
      cardY.value = withTiming(100, { duration: 300 }, () => {
        setOpenSection(null);
      });
    } else {
      setOpenSection(sectionTitle);
      cardScale.value = withSpring(1);
      cardOpacity.value = withTiming(1, { duration: 300 });
      cardY.value = withTiming(0, { duration: 300 });
    }
  };

  // Drag-and-drop logic
  const onGestureEvent = (event: any, index: number) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      setDraggingIndex(index);
      Vibration.vibrate(50); // Haptic feedback on long press
    }
  };

  const onHandlerStateChange = (event: any, index: number) => {
    if (event.nativeEvent.state === State.END) {
      setDraggingIndex(null);
      // Calculate new position based on drag
      const y = event.nativeEvent.absoluteY;
      const newIndex = Math.round(y / 80); // Approximate height of each section
      if (newIndex !== index && newIndex >= 0 && newIndex < sectionOrder.length) {
        const newOrder = [...sectionOrder];
        const [movedItem] = newOrder.splice(index, 1);
        newOrder.splice(newIndex, 0, movedItem);
        setSectionOrder(newOrder);
      }
    }
  };

  // Animated styles for glass card
  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }, { translateY: cardY.value }],
    opacity: cardOpacity.value,
  }));

  // Animated style for logout button
  const logoutAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slideAnim.value }],
  }));

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ScrollView className="flex-1 bg-white dark:bg-black px-4 pt-8">
        {/* Header */}
        <View className="flex-row justify-between items-center mb-6">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
          <Text className="text-xl font-semibold text-black dark:text-white">Settings</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Section List with Drag-and-Drop */}
        {sectionOrder.map((section, index) => (
          <PanGestureHandler
            key={section.title}
            onGestureEvent={(e) => onGestureEvent(e, index)}
            onHandlerStateChange={(e) => onHandlerStateChange(e, index)}
            activeOffsetY={[-10, 10]}
          >
            <Animated.View
              style={[
                styles.sectionContainer,
                draggingIndex === index && styles.dragging,
              ]}
            >
              <TouchableOpacity
                onPress={() => handleSectionToggle(section.title)}
                className="bg-gray-100 dark:bg-gray-800 p-4 rounded-xl"
              >
                <Text className="text-black dark:text-white text-base font-medium">
                  {section.title}
                </Text>
              </TouchableOpacity>

              {/* Collapsible Glass Card */}
              {openSection === section.title && (
                <Animated.View style={[styles.centeredCard, cardAnimatedStyle]}>
                  <BlurView intensity={100} tint="light" style={styles.glassCard}>
                    <Text className="text-xl font-semibold text-center mb-4 text-black dark:text-white">
                      {section.title}
                    </Text>
                    {section.items.map((item, idx) => (
                      <TouchableOpacity
                        key={idx}
                        className="p-4 bg-white/20 dark:bg-black/20 rounded-xl mb-3"
                      >
                        <Text className="text-sm text-black dark:text-white">{item}</Text>
                      </TouchableOpacity>
                    ))}
                  </BlurView>
                </Animated.View>
              )}
            </Animated.View>
          </PanGestureHandler>
        ))}

        {/* Logout Slide-In */}
        {logoutVisible && (
          <Animated.View style={[styles.logoutContainer, logoutAnimatedStyle]}>
            <TouchableOpacity className="bg-red-500 p-4 rounded-xl">
              <Text className="text-center text-white font-semibold">Log Out</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginBottom: 16,
  },
  glassCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: 20,
    width: width * 0.9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  centeredCard: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  logoutContainer: {
    marginTop: 20,
    width: '100%',
    marginBottom: 20,
  },
  dragging: {
    opacity: 0.7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 5,
  },
});