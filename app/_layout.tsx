import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Slot } from "expo-router";
import "react-native-reanimated";
import { useAuth } from "@/stores/auth-store";

export default function RootLayout() {
  const { initializeAuth } = useAuth();
  
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        staleTime: 5 * 60 * 1000,
        cacheTime: 24 * 60 * 60 * 1000,
      },
    },
  });

  // Initialize auth state on app start - ONLY HERE
  useEffect(() => {
    initializeAuth().catch(console.error);  // Add .catch for safety
  }, [initializeAuth]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <Slot />  {/* Ensures navigator mounts first */}
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}