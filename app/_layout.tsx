import React, { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { Slot } from "expo-router";
import "react-native-reanimated";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SupabaseProvider, useSupabase } from "@/context/supabase-provider";

export default function RootLayout() {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						refetchOnWindowFocus: false,
						staleTime: 5 * 60 * 1000,
					},
				},
			}),
	);

	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<QueryClientProvider client={queryClient}>
				<SupabaseProvider>
					<Slot />
				</SupabaseProvider>
			</QueryClientProvider>
		</GestureHandlerRootView>
	);
}