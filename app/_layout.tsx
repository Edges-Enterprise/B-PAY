import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Slot } from "expo-router";
import "react-native-reanimated";
import { SupabaseProvider } from "@/context/supabase-provider";
import { DataProvider } from "@/context/DataProvider";

export default function RootLayout() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false, // Prevent refetching on focus
        staleTime: 5 * 60 * 1000, // Cache queries for 5 minutes
        cacheTime: 24 * 60 * 60 * 1000, // Keep cache for 24 hours
      },
    },
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SupabaseProvider>
          <DataProvider>
            <Slot />
          </DataProvider>
        </SupabaseProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}