import { supabase } from "@/config/supabase";
import { Session, User } from "@supabase/supabase-js";
import { router, useSegments, SplashScreen } from "expo-router";
import { useFonts } from "expo-font";
import { Alert } from "react-native";
import { createContext, useContext, useEffect, useState } from "react";

SplashScreen.preventAutoHideAsync();

type UserProfile = {
	id: string;
	email: string;
	username: string;
	created_at: string;
};

type SupabaseContextProps = {
	auth: any;
	profile: UserProfile | null;
	user: User | null;
	session: Session | null;
	initialized?: boolean;
	signUp: (username: string, email: string, password: string) => Promise<any>;
	signInWithPassword: (email: string, password: string) => Promise<void>;
	signOut: () => Promise<void>;
	deleteOwnAccount: () => Promise<void>;
};

type SupabaseProviderProps = {
	children: React.ReactNode;
};

export const SupabaseContext = createContext<SupabaseContextProps>({
	auth: supabase.auth,
	user: null,
	profile: null,
	session: null,
	initialized: false,
	signUp: async () => {},
	signInWithPassword: async () => {},
	signOut: async () => {},
	deleteOwnAccount: async () => {},
});

export const useSupabase = () => useContext(SupabaseContext);
export const useAuth = () => useSupabase();
export const SupabaseProvider = ({ children }: SupabaseProviderProps) => {
	const segments = useSegments();
	const [user, setUser] = useState<User | null>(null);
	const [session, setSession] = useState<Session | null>(null);
	const [profile, setProfile] = useState<any | null>(null);
	const [initialized, setInitialized] = useState<boolean>(false);

	const [fontsLoaded] = useFonts({
		"Roboto-Regular": require("../assets/fonts/Roboto-Regular.ttf"),
		"Handlee-Regular": require("../assets/fonts/Handlee-Regular.ttf"),
		"OpenSans-Regular": require("../assets/fonts/OpenSans-Regular.ttf"),
		"NotoSans-Regular": require("../assets/fonts/NotoSans-Regular.ttf"),
		"Cursive-Regular": require("../assets/fonts/CedarvilleCursive-Regular.ttf"),
		"SpaceMono-Regular": require("../assets/fonts/SpaceMono-Regular.ttf"),
		"Playwrite-Regular": require("../assets/fonts/PlaywriteAUSA-Regular.ttf"),
		"ShadowLight-Regular": require("../assets/fonts/ShadowsIntoLight-Regular.ttf"),
	});

	const signUp = async (username: string, email: string, password: string) => {
		try {
			const { data, error } = await supabase.auth.signUp({
				email: email.trim(),
				password,
				options: {
					data: { username: username.trim() },
				},
			});

			if (error || !data.user) throw error || new Error("Failed to sign up");

			const { error: insertError } = await supabase.from("profiles").upsert([
				{
					id: data.user.id,
					username: username.trim(),
					email: email.trim(),
					created_at: new Date().toISOString(),
				},
			]);

			if (insertError) {
				await supabase.auth.admin.deleteUser(data.user.id);
				throw new Error("Failed to save user profile.");
			}

			setUser(data.user);
			setSession(data.session);
			Alert.alert("Success", "Account created successfully.");
		} catch (err: any) {
			Alert.alert("Sign Up Error", err.message || "Unexpected error occurred.");
			throw err;
		}
	};

	const signInWithPassword = async (email: string, password: string) => {
		try {
			const { data, error } = await supabase.auth.signInWithPassword({
				email,
				password,
			});

			if (error) throw error;
			if (!data || !data.user || !data.session) {
				throw new Error("Invalid login response from Supabase");
			}
			setUser(data.user);
			setSession(data.session);
			router.replace("/(app)/(protected)");
		} catch (err: any) {
			Alert.alert("Sign In Error", err.message || "Failed to sign in.");
			throw err;
		}
	};

	const signOut = async () => {
		try {
			const { error } = await supabase.auth.signOut();
			if (error) throw error;
			setUser(null);
			setSession(null);
			router.push("/(app)/(auth)/sign-in");
		} catch (err: any) {
			Alert.alert("Sign Out Error", err.message || "Failed to sign out.");
		}
	};

	const deleteOwnAccount = async () => {
		if (!user || !session) {
			Alert.alert("Error", "You must be logged in to delete your account.");
			return;
		}

		try {
			const response = await fetch(
				`${process.env.EXPO_PUBLIC_SUPABASE_DELETE_ACCOUNT_FUNCTION_URL}`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session.access_token}`,
					},
					body: JSON.stringify({ user_id: user.id }),
				},
			);

			const result = await response.json();
			if (!response.ok) throw new Error(result.error || "Delete failed");

			setUser(null);
			setSession(null);
			Alert.alert("Deleted", "Your account was deleted successfully.");
			router.replace("/(app)/(auth)/sign-in");
		} catch (err: any) {
			console.error("Delete account error:", err.message);
			Alert.alert("Error", err.message || "Failed to delete account.");
		}
	};

	// Load session on mount
	useEffect(() => {
		(async () => {
			const {
				data: { session },
			} = await supabase.auth.getSession();
			setSession(session);
			setUser(session?.user || null);
			setInitialized(true);
		})();

		const { data: listener } = supabase.auth.onAuthStateChange(
			(_event, session) => {
				setSession(session);
				setUser(session?.user || null);
			},
		);

		return () => {
			listener.subscription?.unsubscribe();
		};
	}, []);

	// Fetch user profile when user changes
	useEffect(() => {
		const fetchProfile = async () => {
			if (!user) return setProfile(null);
			const { data, error } = await supabase
				.from("profiles")
				.select("*")
				.eq("id", user.id)
				.single();
			if (!error && data) setProfile(data);
		};
		fetchProfile();
	}, [user]);

	// Handle splash screen
	useEffect(() => {
		if (!initialized || !fontsLoaded) return;

		const inProtected = segments[1] === "(protected)";
		if (session && !inProtected) {
			router.replace("/(app)/(protected)");
		} else if (!session) {
			router.replace("/(app)/welcome");
		}

		SplashScreen.hideAsync();
	}, [initialized, fontsLoaded, session]);

	return (
		<SupabaseContext.Provider
			value={{
				auth: supabase.auth,
				user,
				session,
				profile,
				initialized,
				signUp,
				signInWithPassword,
				signOut,
				deleteOwnAccount,
			}}
		>
			{children}
		</SupabaseContext.Provider>
	);
};
