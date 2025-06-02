import { SupabaseProvider } from "@/context/supabase-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { Slot } from "expo-router";
import React, { useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";

export default function RootLayout() {
	// const [queryClient] = useState(
	// 	() =>
	// 		new QueryClient({
	// 			defaultOptions: {
	// 				queries: {
	// 					refetchOnWindowFocus: false,
	// 					staleTime: 5 * 60 * 1000,
	// 				},
	// 			},
	// 		}),
	// );

	const queryClient = new QueryClient();

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