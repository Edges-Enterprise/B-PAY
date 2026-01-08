// app/(app)/(protected)/_layout.tsx
import { Tabs, useRouter, usePathname, useSegments } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Fontisto } from "@expo/vector-icons";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, TouchableOpacity, Animated, Image } from "react-native";
import InvestorBottomSheet from "@/components/TransferBottomSheet";
import { useAuth } from "@/stores/auth-store";
import LoadingScreen from '@/components/LoadingScreen';

// Import the PNG for Home
const homePngImage = require("@/assets/images/splash.png");

// 🔧 LOCKED ICON (unchanged)
const LOCKED_ICON_SIZE = 26;
const LOCKED_ICON_TOP_ADJUSTMENT = 0;
const LOCKED_ICON_SCALE = 1;

// 🔧 PNG-ONLY STYLING – EDIT THESE TO MOVE/RESIZE JUST THE IMAGE
const PNG_STYLE = {
  width: 70,        // Image width
  height: 78,       // Image height
  left: 2,          // ← Position from LEFT of the 76x76 container
  top: -1,          // ← Position from TOP (negative = above top edge)
};

/*
  📏 Coordinate system:
    - Container = 76x76 circle
    - (0, 0) = top-left of that circle
    - Increase `left` → move right | Increase `top` → move down
*/

/* Pulsing Ring – always centered, scales outward */
const BurstRing = ({ delay = 0 }: { delay?: number }) => {
  const progress = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1800,
        delay,
        useNativeDriver: true,
        easing: require("react-native").Easing.linear,
      })
    );
    anim.start();
    return () => anim.stop();
  }, [delay, progress]);

  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.1, 1.1] });
  const opacity = progress.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.35, 0.35, 0] });

  return <Animated.View style={[styles.burstRing, { transform: [{ scale }], opacity }]} />;
};

/* Home Tab Icon */
const HomeTabIcon = ({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} style={styles.centerIconContainer} activeOpacity={1}>
    {/* Centered pulsing rings */}
    <BurstRing delay={0} />
    <BurstRing delay={900} />

    {/* Independent PNG – only this is affected by PNG_STYLE */}
    <Image 
      source={homePngImage} 
      style={[styles.pngAbsolute, PNG_STYLE]} 
      resizeMode="contain"
    />
  </TouchableOpacity>
);

/* Locked Icon */
const LockedTabIcon = ({ color }: { color: string }) => (
  <View style={[
    styles.lockedIconContainer,
    { 
      top: LOCKED_ICON_TOP_ADJUSTMENT,
      transform: [{ scale: LOCKED_ICON_SCALE }]
    }
  ]}>
    <Fontisto 
      name="magento" 
      size={LOCKED_ICON_SIZE} 
      color={color} 
    />
  </View>
);

export default function ProtectedLayout() {
  const [sheetVisible, setSheetVisible] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const isHome = pathname === "/" || pathname === "/index" || segments.length === 0;
  
  const { isAuthenticated, isLoading, isInitialized } = useAuth();

  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      console.log('🔒 Protected Layout: Not authenticated, redirecting to auth');
      router.replace("/(app)/(Auth)/login");
    }
  }, [isAuthenticated, isInitialized, router]);

  useEffect(() => {
    if (!isHome && sheetVisible) {
      setSheetVisible(false);
    }
  }, [isHome, sheetVisible]);

  const openSheet = useCallback(() => setSheetVisible(true), []);
  const closeSheet = useCallback(() => setSheetVisible(false), []);

  const handleHomePress = useCallback(() => {
    if (isHome) {
      openSheet();
    } else {
      router.push({ pathname: "/" });
      closeSheet();
    }
  }, [isHome, router, openSheet, closeSheet]);

  if (!isInitialized || isLoading) {
    return <LoadingScreen message="Securing your session..." />;
  }

  if (!isAuthenticated) {
    return <LoadingScreen message="Redirecting to login..." />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Tabs
        initialRouteName="index"
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#00FF7F",
          tabBarInactiveTintColor: "#aaa",
          tabBarLabelStyle: { fontSize: 12, fontWeight: "500" },
          tabBarStyle: {
            position: "absolute",
            bottom: 25,
            left: 20,
            right: 20,
            height: 80,
            borderRadius: 30,
            backgroundColor: "#0a0a0a",
            borderTopWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
            paddingBottom: 15,
            paddingTop: 10,
          },
        }}
      >
        <Tabs.Screen
          name="locked"
          options={{
            title: "Locked",
            tabBarIcon: ({ color }) => <LockedTabIcon color={color} />,
          }}
        />

        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarLabel: () => null,
            tabBarIcon: () => <HomeTabIcon onPress={handleHomePress} />,
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              handleHomePress();
            },
          }}
        />

        <Tabs.Screen
          name="earn"
          options={{
            title: "Earn",
            tabBarIcon: ({ color }) => <Ionicons name="trending-up" size={24} color={color} />,
          }}
        />
      </Tabs>

      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        <InvestorBottomSheet
          visible={sheetVisible && isHome}
          onClose={closeSheet}
          style={styles.bottomSheet}
        />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  centerIconContainer: {
    position: "relative",
    width: 76,
    height: 76,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0a0a0a",
    borderRadius: 38,
    marginBottom: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 12,
    // 👇 Critical: allows rings to animate beyond container bounds
    overflow: "visible",
  },
  burstRing: {
    position: "absolute",
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2.5,
    borderColor: "#00FF7F",
    zIndex: 1,
    top: 0,
    left: 0,
  },
  pngAbsolute: {
    position: "absolute",
    zIndex: 2,
  },
  lockedIconContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 9999,
  },
});