// app/(app)/_layout.tsx
import { Stack, useRouter, useSegments } from "expo-router";
import React, { useEffect } from "react";
import { useAuth } from "@/stores/auth-store";
import LoadingScreen from '@/components/LoadingScreen';
import { colors } from "@/constants/colors";
import { NotificationsProvider } from "@/context/NotificationsProvider";
import { FontProvider, useFont } from "@/context/font-context";
import { ThemeProvider, useTheme } from "@/context/theme-context";

export const unstable_settings = {
  initialRouteName: "(protected)",
};

export default function AppLayout() {
  return (
    <NotificationsProvider>
      <FontProvider>
        <ThemeProvider>
          <AuthAwareStack />
        </ThemeProvider>
      </FontProvider>
    </NotificationsProvider>
  );
}

function AuthAwareStack() {
  const { colorScheme } = useTheme();
  const { selectedFont } = useFont();
  const { isInitialized, isAuthenticated, savedAccounts, currentAccount } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  console.log('🏠 AppLayout State:', {
    isInitialized,
    isAuthenticated,
    savedAccounts: savedAccounts.length,
    currentAccount: currentAccount?.identifier,
    currentSegment: segments[0],
    segmentsLength: segments.length
  });

  // Handle internal routing when we're at the app root
  useEffect(() => {
    if (!isInitialized) return;

    // If we're at the app root (no specific screen selected)
    if (segments.length === 1 && segments[0] === '(app)') {
      console.log('🔄 AppLayout: At app root, handling internal routing...');
      
      if (isAuthenticated) {
        console.log('✅ AppLayout: Authenticated, redirecting to protected');
        router.replace('/(app)/(protected)');
      } else if (savedAccounts.length > 0) {
        console.log('📱 AppLayout: Has accounts, redirecting to welcome-back');
        router.replace('/(app)/(Auth)/welcome-back');
      } else {
        console.log('🚀 AppLayout: No accounts, redirecting to login');
        router.replace('/(app)/(Auth)/login');
      }
    }
  }, [isInitialized, isAuthenticated, savedAccounts.length, segments]);

  // Show loading until auth is initialized
  if (!isInitialized) {
    return <LoadingScreen message="Initializing app..." />;
  }

  // Once initialized, show the app stack
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        gestureEnabled: true,
        headerStyle: {
          backgroundColor: colors[colorScheme]?.background || "#000",
        },
        headerTintColor: colors[colorScheme]?.foreground || "#FFD700",
        headerTitleStyle: {
          fontFamily: selectedFont,
        },
        contentStyle: {
          backgroundColor: colors[colorScheme]?.background || "#000",
        },
      }}
    >
      <Stack.Screen name="(protected)" options={{ headerShown: false }} />
      <Stack.Screen name="(Auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(legal)" options={{ headerShown: false }} />
      
      <Stack.Screen name="send" options={{ headerTitle: "Transfer" }} />
      <Stack.Screen name="receipt" options={{ headerTitle: "Transaction Receipt" }} />
      <Stack.Screen name="fund" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ headerTitle: "Notifications 🔔" }} />
      <Stack.Screen name="light" options={{ headerTitle: " " }} />
      <Stack.Screen name="bills" options={{ headerTitle: "" }} />
      <Stack.Screen name="airtime" options={{ headerTitle: "" }} />
      <Stack.Screen name="ajo" options={{ headerTitle: "" }} />
      <Stack.Screen name="changePin" options={{ headerTitle: "Change Transaction Pin" }} />
      <Stack.Screen name="changePassword" options={{ headerTitle: "Change Account Password" }} />
      <Stack.Screen name="refer" options={{ headerTitle: "Refer & Earn" }} />
      <Stack.Screen name="settings" options={{ headerTitle: "Settings" }} />
    </Stack>
  );
}