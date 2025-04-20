import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ImageBackground,
  Pressable,
  Dimensions,
  StatusBar,
  StyleSheet,
  Vibration,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  SlideInRight,
  SlideOutLeft,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { TapGestureHandler, State } from 'react-native-gesture-handler';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const rotatingTexts = [
  {
    text: "Buy Data, Cable and Internet Subscription 💰💰",
    icon: "access-point-network",
  },
  {
    text: "Seamlessly and Instantly 💨💨💨",
    icon: "flash",
  },
  {
    text: "Get Free 15GB 🎉🎉🎉",
    icon: "gift",
  },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const [showButton, setShowButton] = useState(false);
  const [showStatusBar, setShowStatusBar] = useState(false);
  const [textIndex, setTextIndex] = useState(0);
  const [typewriterText, setTypewriterText] = useState('');

  const fullWelcomeText = "Welcome to";
  const scale = useSharedValue(1);
  const buttonScale = useSharedValue(1);

  // Typewriter effect — slow, and triggers button after last character
  useEffect(() => {
    let currentIndex = 0;
    const interval = setInterval(() => {
      setTypewriterText(fullWelcomeText.slice(0, currentIndex + 1));
      currentIndex++;
      if (currentIndex === fullWelcomeText.length) {
        clearInterval(interval);
        setTimeout(() => setShowButton(true), 500);
      }
    }, 250);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1,
      true
    );

    buttonScale.value = withRepeat(
      withSequence(
        withTiming(1.01, { duration: 2000 }),
        withTiming(1, { duration: 2000 })
      ),
      -1,
      true
    );
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % rotatingTexts.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const onDoubleTap = (event) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      setShowStatusBar(true);
    }
  };

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const buttonPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const current = rotatingTexts[textIndex];

  return (
    <TapGestureHandler onHandlerStateChange={onDoubleTap} numberOfTaps={2}>
      <View style={styles.container}>
        <StatusBar hidden={!showStatusBar} translucent backgroundColor="transparent" barStyle="light-content" />

        <ImageBackground
          source={require('../../assets/images/welcome.png')}
          resizeMode="cover"
          style={StyleSheet.absoluteFill}
        >
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />

          <View style={styles.content}>
            {/* Top Text */}
            <View style={styles.topText}>
              <Text style={styles.title}>{typewriterText}</Text>
              <Animated.Text style={[styles.brand, pulseStyle]}>
                Edges Network
              </Animated.Text>

              {/* Rotating Text with Icon */}
              <Animated.View
                key={textIndex}
                entering={SlideInRight.duration(1200)}
                exiting={SlideOutLeft.duration(1200)}
                style={styles.descriptionRow}
              >
                <MaterialCommunityIcons
                  name={current.icon}
                  size={22}
                  color="#60A5FA"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.description}>{current.text}</Text>
              </Animated.View>
            </View>

            {/* Get Started Button */}
            {showButton && (
              <Animated.View entering={SlideInRight.duration(1000)} style={[styles.buttonWrapper, buttonPulseStyle]}>
                <Pressable
                  onPress={() => {
                    Vibration.vibrate(40);
                    router.replace('/(app)/(protected)/wallet');
                  }}
                  style={styles.button}
                >
                  <Text style={styles.buttonText3D}>Get Started</Text>
                </Pressable>
              </Animated.View>
            )}
          </View>
        </ImageBackground>
      </View>
    </TapGestureHandler>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 60,
  },
  topText: {
    marginTop: 0,
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
  },
  brand: {
    color: '#3B82F6',
    fontSize: 34,
    fontWeight: '800',
    marginTop: 6,
  },
  descriptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    maxWidth: '90%',
  },
  description: {
    color: '#d1d5db',
    fontSize: 16,
    lineHeight: 22,
  },
  buttonWrapper: {
    marginBottom: 40,
  },
  button: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2563EB',
  },
  buttonText3D: {
    color: '#a6bce0',
    fontSize: 18,
    fontWeight: '900',
    textShadowColor: 'black',
    textShadowOffset: { width: 1.5, height: 2 },
    textShadowRadius: 3,
    transform: [{ translateY: -1 }, { translateX: -0.5 }],
  },
});
