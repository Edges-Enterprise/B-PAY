// app/(app)/(protected)/_layout.tsx
import { Tabs, useRouter, usePathname, useSegments } from "expo-router";
import { Ionicons, FontAwesome } from "@expo/vector-icons";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Asset } from "expo-asset";
import { SvgUri } from "react-native-svg";
import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, TouchableOpacity, Animated, Image, Text } from "react-native";
import InvestorBottomSheet from "@/components/TransferBottomSheet";
import { useAuth } from "@/stores/auth-store";
import LoadingScreen from '@/components/LoadingScreen';

// SVG for Home
const homeSvgUri = Asset.fromModule(require("@/assets/icons/home.svg")).uri;

// PNG for History (POS)
const posPngUri = Asset.fromModule(require("@/assets/icons/pos.png")).uri;

// ADJUST THIS VALUE TO CHANGE POS ICON SIZE
const POS_ICON_SIZE = 32;

/* Pulsing Ring – Instant Start */
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

/* Home Icon */
const HomeTabIcon = ({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} style={styles.centerIconContainer} activeOpacity={1}>
    <BurstRing delay={0} />
    <BurstRing delay={900} />
    <SvgUri width={45} height={48} uri={homeSvgUri} fill="#00FF7F" />
  </TouchableOpacity>
);

/* History Icon with pos.png */
const HistoryTabIcon = ({ color }: { color: string }) => (
  <Image
    source={{ uri: posPngUri }}
    style={[
      styles.posIcon,
      {
        width: POS_ICON_SIZE,
        height: POS_ICON_SIZE,
        tintColor: color,
      },
    ]}
    resizeMode="contain"
  />
);

export default function ProtectedLayout() {
  const [sheetVisible, setSheetVisible] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const isHome = pathname === "/" || pathname === "/index" || segments.length === 0;
  
  const { isAuthenticated, isLoading, isInitialized } = useAuth();

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      console.log('🔒 Protected Layout: Not authenticated, redirecting to auth');
      router.replace("/(app)/(Auth)/login");
    }
  }, [isAuthenticated, isInitialized, router]);

  // Close sheet instantly when navigating away
  useEffect(() => {
    if (!isHome && sheetVisible) {
      setSheetVisible(false);
    }
  }, [isHome, sheetVisible]);

  const openSheet = useCallback(() => {
    setSheetVisible(true);
  }, []);

  const closeSheet = useCallback(() => {
    setSheetVisible(false);
  }, []);

  const handleHomePress = useCallback(() => {
    if (isHome) {
      openSheet();
    } else {
      router.push({ pathname: "/" });
      closeSheet();
    }
  }, [isHome, router, openSheet, closeSheet]);

  // Show loading during initial auth check
  if (!isInitialized || isLoading) {
    return <LoadingScreen message="Securing your session..." />;
  }

  // Don't render tabs if not authenticated (should redirect via useEffect)
  if (!isAuthenticated) {
    return <LoadingScreen message="Redirecting to login..." />;
  }

  // User is authenticated and initialized - show the protected tabs
  console.log('🔓 Protected Layout: User authenticated, showing tabs');
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
        {/* HISTORY TAB – NOW USES pos.png */}
        <Tabs.Screen
          name="pos"
          options={{
            title: "Pos",
            tabBarIcon: ({ color }) => <HistoryTabIcon color={color} />,
          }}
        />

        <Tabs.Screen
          name="locked"
          options={{
            title: "Locked",
            tabBarIcon: ({ color }) => <FontAwesome name="lock" size={24} color={color} />,
          }}
        />

        {/* HOME TAB – CENTER WITH PULSE */}
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

        <Tabs.Screen
          name="card"
          options={{
            title: "Card",
            tabBarIcon: ({ color }) => <FontAwesome name="credit-card-alt" size={24} color={color} />,
          }}
        />
      </Tabs>

      {/* FULL OPACITY BOTTOM SHEET */}
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
  },
  burstRing: {
    position: "absolute",
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2.5,
    borderColor: "#00FF7F",
  },
  posIcon: {
    // Size controlled by POS_ICON_SIZE constant above
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