import "../global.css";
import { Slot } from "expo-router";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler"; // Import GestureHandlerRootView

import { SupabaseProvider, useSupabase } from "@/context/supabase-provider";

function RootLayoutNav() {
  const { onLayoutRootView } = useSupabase();

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <Slot />
    </View>
  );
}

export default function AppLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}> {/* Wrap the entire app */}
      <SupabaseProvider>
        <RootLayoutNav />
      </SupabaseProvider>
    </GestureHandlerRootView>
  );
}