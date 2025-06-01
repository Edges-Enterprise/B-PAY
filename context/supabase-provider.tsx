import { supabase } from "@/config/supabase";
import { Session, User } from "@supabase/supabase-js";
import { router, useSegments, SplashScreen } from "expo-router";
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
			console.log("Signing up with:", { username, email });

			// Step 1: Create the authentication user
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
				console.error("Auth signUp error:", error);
				throw error;
			}

			if (!data.user) {
				console.error("No user returned from auth signUp");
				throw new Error("Failed to create user account");
			}

			console.log("Auth user created:", data.user.id);

			// Step 2: Check if a profile already exists for this user ID and email
			const { data: existingProfile, error: fetchError } = await supabase
				.from("profiles")
				.select("id, email")
				.eq("id", data.user.id)
				.single();

			if (fetchError && fetchError.code !== "PGRST116") {
				// PGRST116 means "no rows found", which is expected if the profile doesn't exist
				console.error("Error checking existing profile:", fetchError);
				throw fetchError;
			}

			if (existingProfile) {
				// If a profile exists, check if the email matches
				if (existingProfile.email === email.trim()) {
					// Email matches, proceed with sign-up using existing profile
					console.log(
						"Profile exists with matching email, proceeding with sign-up",
					);
				} else {
					// Email differs, update the existing profile or handle conflict
					const { error: updateError } = await supabase
						.from("profiles")
						.update({
							username: username.trim(),
							email: email.trim(),
							created_at: new Date().toISOString(),
						})
						.eq("id", data.user.id);

					if (updateError) {
						console.error("Error updating existing profile:", updateError);
						try {
							await supabase.auth.admin.deleteUser(data.user.id);
							console.log("Cleaned up auth user after failed profile update");
						} catch (cleanupError) {
							console.error("Failed to clean up auth user:", cleanupError);
						}
						throw updateError;
					}
					console.log("Updated existing profile with new email and username");
				}
			} else {
				// Step 3: Create the user profile in the profiles table if no profile exists
				const { error: insertError } = await supabase.from("profiles").insert([
					{
						id: data.user.id,
						username: username.trim(),
						email: email.trim(),
						created_at: new Date().toISOString(),
					},
				]);

				if (insertError) {
					console.error("Database insert error:", insertError);

					// If database insert fails, clean up the auth user
					try {
						await supabase.auth.admin.deleteUser(data.user.id);
						console.log("Cleaned up auth user after failed profile creation");
					} catch (cleanupError) {
						console.error("Failed to clean up auth user:", cleanupError);
					}

					if (insertError.code === "23505") {
						throw new Error(
							"A profile with this user ID already exists. Please try signing in or use a different email.",
						);
					}

					throw insertError;
				}

				console.log("User profile created in database");
			}

			// Set the user and session
			setUser(data.user);
			setSession(data.session);

			Alert.alert("Success", "Account created successfully!");
			return data;
		} catch (error) {
			console.error("SignUp process failed:", error);
			Alert.alert("Sign Up Error", error.message || "Failed to create account");
			throw error;
		}
	};

	const signInWithPassword = async (email: string, password: string) => {
		try {
			const { data, error } = await supabase.auth.signInWithPassword({
				email,
				password,
			});

			if (error) {
				console.error("SignIn error:", error);
				throw error;
			}

			if (data.user) {
				setUser(data.user);
				setSession(data.session);
				router.replace("/(app)/(protected)");
			}
		} catch (error) {
			Alert.alert("Sign In Error", error.message || "Failed to sign in");
			throw error;
		}
	};

	const signOut = async () => {
		try {
			const { error } = await supabase.auth.signOut();
			if (error) {
				throw error;
			}
			setUser(null);
			setSession(null);
			router.push("/(app)/(auth)/sign-in");
		} catch (error) {
			Alert.alert("Sign Out Error", error.message || "Failed to sign out");
			throw error;
		}
	};

	const deleteOwnAccount = async () => {
		if (!user) {
			Alert.alert("Error", "You need to be logged in to delete your account.");
			return;
		}

		try {
			const response = await fetch(
				"https://jjyyfaxcwanrmiipzkoj.supabase.co/functions/v1/delete-account",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session?.access_token}`,
					},
					body: JSON.stringify({ user_id: user.id }),
				},
			);

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || "Failed to delete account");
			}

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
				.from("profiles")
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
				auth: supabase.auth,
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
