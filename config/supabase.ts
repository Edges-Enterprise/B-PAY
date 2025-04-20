import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

// ENV values (Expo SDK 48+ uses EXPO_PUBLIC_ prefix)
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey, {
	auth: {
		storage: AsyncStorage,
		autoRefreshToken: true,
		persistSession: true,
		detectSessionInUrl: false, // only needed in web
	},
});

// Optional: Manage session refresh manually later if needed
// import { AppState } from "react-native";
// AppState.addEventListener("change", (state) => {
// 	if (state === "active") {
// 		supabase.auth.startAutoRefresh();
// 	} else {
// 		supabase.auth.stopAutoRefresh();
// 	}
// });
