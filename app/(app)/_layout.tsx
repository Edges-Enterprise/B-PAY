// app/(app)/_layout.tsx
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack } from "expo-router";
import { colors } from "@/constants/colors";
import { NotificationsProvider } from "@/context/NotificationsProvider";
import { FontProvider, useFont } from "@/context/font-context";
import { ThemeProvider, useTheme } from "@/context/theme-context";
import { useAuth } from "@/stores/auth-store";
import LoadingScreen from "@/components/LoadingScreen";

export const unstable_settings = {
  initialRouteName: "(protected)",
};

export default function AppLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NotificationsProvider>
        <FontProvider>
          <ThemeProvider>
            <AuthAwareStack />
          </ThemeProvider>
        </FontProvider>
      </NotificationsProvider>
    </GestureHandlerRootView>
  );
}

function AuthAwareStack() {
  const { isInitialized, isAuthenticated, savedAccounts, currentAccount } = useAuth();
  const { colorScheme } = useTheme();
  const { selectedFont } = useFont();

  // Show loading until auth initializes
  if (!isInitialized) {
    return <LoadingScreen message="Initializing app..." />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        gestureEnabled: true,
        headerStyle: { backgroundColor: colors[colorScheme]?.background || "#000" },
        headerTintColor: colors[colorScheme]?.foreground || "#FFD700",
        headerTitleStyle: { fontFamily: selectedFont },
        contentStyle: { backgroundColor: colors[colorScheme]?.background || "#000" },
      }}
    >
      {/* Main protected/auth/legal stack */}
      <Stack.Screen name="(protected)" options={{ headerShown: false }} />
      <Stack.Screen name="(Auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(legal)" options={{ headerShown: false }} />

      {/* App screens */}
      <Stack.Screen name="send" options={{ headerTitle: "Transfer" }} />
      <Stack.Screen name="receipt" options={{ headerTitle: "Transaction Receipt" }} />
      <Stack.Screen name="fund" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ headerTitle: "Notifications 🔔" }} />
      <Stack.Screen name="notifications/tabs" options={{ headerTitle: " " }} />
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
