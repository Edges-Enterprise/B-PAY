import { Stack, useRouter, useSegments } from "expo-router";  // Add useSegments
import React, { useEffect } from "react";
import { useAuth } from "@/stores/auth-store";
import LoadingScreen from '@/components/LoadingScreen';

export default function AuthLayout() {
  const { isAuthenticated, isLoading, isInitialized } = useAuth();
  const router = useRouter();
  const segments = useSegments();  // Add this

  // Guarded redirect - wait for mount
  useEffect(() => {
    if (isInitialized && isAuthenticated && segments.length > 0) {  // Add segments check
      console.log('🔄 Auth Layout: User authenticated, redirecting to app');
      router.replace("/(app)/(protected)");
    }
  }, [isAuthenticated, isInitialized, segments.length, router]);  // Add segments.length

  // Show loading only during initial auth check
  if (!isInitialized || isLoading) {
    return <LoadingScreen message="Checking authentication..." />;
  }

  // If authenticated but still here, show redirect message
  if (isAuthenticated) {
    return <LoadingScreen message="Welcome! Redirecting to app..." />;
  }

  // Show auth screens only when not authenticated and initialized
  console.log('👤 Auth Layout: Showing auth screens');
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade",
        contentStyle: { backgroundColor: "#000" },
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="welcome-back" />
    </Stack>
  );
}