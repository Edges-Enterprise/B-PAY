import { supabase } from "@/config/supabase";
import { Session, User } from "@supabase/supabase-js";
import { useRouter, useSegments, SplashScreen } from "expo-router";
import { useFonts } from "expo-font";
import { Alert } from "react-native";
import { createContext, useContext, useEffect, useState } from "react";

SplashScreen.preventAutoHideAsync();

type SupabaseContextProps = {
	auth: any;
	profile: any | null;
	user: User | null;
	session: Session | null;
	initialized?: boolean;
	signUp: (email: string, password: string, username: string) => Promise<void>;
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
	const router = useRouter();
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
		const { data, error } = await supabase.auth.signUp({
			email: email.trim(),
			password,
			options: {
				data: {
					username: username.trim(),
				},
			},
		});
		if (error) {
			throw error;
		}

		if (data.user) {
			const { error: insertError } = await supabase.from("users").insert([
				{
					id: data.user.id,
					username: username.trim(),
					email: email.trim(),
				},
			]);

			if (insertError) {
				throw insertError;
			} else {
				Alert.alert("Success", "Account created successfully!");
			}
		}
	};

	const signInWithPassword = async (email: string, password: string) => {
		const { data, error } = await supabase.auth.signInWithPassword({
			email,
			password,
		});
		if (error) {
			throw error;
		}

		if (data.user) {
			setUser(data.user);
			setSession(data.session);
			router.replace("/(app)/(protected)");
		}
	};

	const signOut = async () => {
		const { error } = await supabase.auth.signOut();
		if (error) {
			throw error;
		}
		setUser(null);
		setSession(null);
		router.push("/(app)/(auth)/sign-in");
	};

	const deleteOwnAccount = async () => {
		if (!user) {
			Alert.alert("Error", "You need to be logged in to delete your account.");
			return;
		}

		try {
			const response = await fetch(
				"https://masswgndvgtpdabpknsx.supabase.co/functions/v1/deleteaccount",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session?.access_token}`, // User authentication
					},
					body: JSON.stringify({ user_id: user.id }),
				},
			);

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || "Failed to delete account");
			}

			// Logout user locally
			setUser(null);
			setSession(null);

			Alert.alert(
				"Account Deleted",
				"Your account has been successfully deleted.",
			);
			router.replace("/(app)/(auth)/sign-in");
		} catch (error) {
			console.error("Error deleting account:", error.message);
			Alert.alert("Error", "Failed to delete your account.");
		}
	};

	useEffect(() => {
		if (!initialized || !fontsLoaded) return;

		const inProtectedGroup = segments[1] === "(protected)";

		if (session && !inProtectedGroup) {
			router.replace("/(app)/(protected)");
		} else if (!session) {
			router.replace("/(app)/welcome");
		}

		setTimeout(() => {
			SplashScreen.hideAsync();
		}, 500);
	}, [initialized, fontsLoaded, session]);

	useEffect(() => {
		supabase.auth.getSession().then(({ data: { session } }) => {
			setSession(session);
			setUser(session ? session.user : null);
			setInitialized(true);
		});

		const { data: authListener } = supabase.auth.onAuthStateChange(
			(_event, session) => {
				setSession(session);
				setUser(session ? session.user : null);
			},
		);

		return () => {
			// For Supabase v2, unsubscribe correctly
			authListener.subscription?.unsubscribe();
		};
	}, []);

	useEffect(() => {
		if (!user) {
			setProfile(null);
			return;
		}
		const fetchProfile = async () => {
			const { data, error } = await supabase
				.from("users")
				.select("*")
				.eq("id", user.id)
				.single();
			if (error) {
				console.error("Error fetching profile:", error);
			} else {
				setProfile(data);
			}
		};
		fetchProfile();
	}, [user]);

	return (
		<SupabaseContext.Provider
			value={{
				auth: supabase.auth, // Added auth property
				user,
				profile,
				session,
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