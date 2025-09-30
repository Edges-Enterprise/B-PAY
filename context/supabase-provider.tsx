import { supabase } from "@/config/supabase";
import { Session, User } from "@supabase/supabase-js";
import { useFonts } from "expo-font";
import { router, useSegments, SplashScreen } from "expo-router";
import { createContext, useContext, useEffect, useState } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CustomSuccessModal from "@/components/CustomSuccessModal";
import { requestPushPermissions } from "./notifications-utils";

SplashScreen.preventAutoHideAsync();

type UserProfile = {
	id: string;
	email: string;
	username: string;
	created_at: string;
	transaction_pin?: string;
};

type SupabaseContextProps = {
	auth: any;
	profile: UserProfile | null;
	user: User | null;
	session: Session | null;
	initialized?: boolean;
	signUp: (
		username: string,
		email: string,
		password: string,
		rememberMe?: boolean,
	) => Promise<any>;
	signInWithPassword: (
		email: string,
		password: string,
		rememberMe?: boolean,
	) => Promise<void>;
	signOut: () => Promise<void>;
	deleteOwnAccount: () => Promise<void>;
	updateTransactionPin: (currentPin: string, newPin: string) => Promise<void>;
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
	updateTransactionPin: async () => {},
});

export const useSupabase = () => useContext(SupabaseContext);
export const useAuth = () => useSupabase();

export const SupabaseProvider = ({ children }: SupabaseProviderProps) => {
	const segments = useSegments();
	const [user, setUser] = useState<User | null>(null);
	const [session, setSession] = useState<Session | null>(null);
	const [profile, setProfile] = useState<UserProfile | null>(null);
	const [initialized, setInitialized] = useState<boolean>(false);
	const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
	const [newUsername, setNewUsername] = useState<string>("");
	const [isLoadingSession, setIsLoadingSession] = useState<boolean>(true);

	const [fontsLoaded] = useFonts({
		"Roboto-Regular": require("../assets/fonts/Roboto-Regular.ttf"),
	});

	const retryGetSession = async (
		retries = 3,
		delay = 1000,
	): Promise<Session | null> => {
		for (let i = 0; i < retries; i++) {
			try {
				const { data, error } = await supabase.auth.getSession();
				if (error) throw error;
				return data.session;
			} catch (err) {
				console.warn(`Session retry ${i + 1} failed:`, err);
				if (i < retries - 1)
					await new Promise((resolve) => setTimeout(resolve, delay));
			}
		}
		return null;
	};

	const signUp = async (
		username: string,
		email: string,
		password: string,
		rememberMe: boolean = false,
	) => {
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

			try {
				await AsyncStorage.setItem("@rememberMe", rememberMe.toString());
			} catch (storageError) {
				console.warn("Failed to store rememberMe:", storageError);
			}

			setUser(data.user);
			setSession(data.session);
			setNewUsername(username.trim());
			await requestPushPermissions(data.user.id);
			setTimeout(() => {
				setShowSuccessModal(true);
			}, 100);
		} catch (err: any) {
			console.error("Sign Up Error:", err.message);
			Alert.alert("Sign Up Error", err.message || "Unexpected error occurred.");
			throw err;
		}
	};

	const signInWithPassword = async (
		email: string,
		password: string,
		rememberMe: boolean = false,
	) => {
		try {
			const { data, error } = await supabase.auth.signInWithPassword({
				email,
				password,
			});

			if (error) throw error;
			if (!data || !data.user || !data.session) {
				throw new Error("Invalid login response from Supabase");
			}

			try {
				await AsyncStorage.setItem("@rememberMe", rememberMe.toString());
			} catch (storageError) {
				console.warn("Failed to store rememberMe:", storageError);
			}

			setUser(data.user);
			setSession(data.session);
			await requestPushPermissions(data.user.id);
			router.replace("/(app)/(protected)");
		} catch (err: any) {
			console.error("Sign In Error:", err.message);
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
			try {
				await AsyncStorage.removeItem("@rememberMe");
			} catch (storageError) {
				console.warn("Failed to clear rememberMe:", storageError);
			}
			router.replace("/(app)/welcome");
		} catch (err: any) {
			console.error("Sign Out Error:", err.message);
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
			try {
				await AsyncStorage.removeItem("@rememberMe");
			} catch (storageError) {
				console.warn("Failed to clear rememberMe:", storageError);
			}
			Alert.alert("Deleted", "Your account was deleted successfully.");
			router.replace("/(app)/welcome");
		} catch (err: any) {
			console.error("Delete account error:", err.message);
			Alert.alert("Error", err.message || "Failed to delete account.");
		}
	};

	const updateTransactionPin = async (currentPin: string, newPin: string) => {
		if (!user || !session) {
			throw new Error("You must be logged in to update your transaction PIN.");
		}

		try {
			const { data: profileData, error: fetchError } = await supabase
				.from("profiles")
				.select("transaction_pin")
				.eq("id", user.id)
				.single();

			if (fetchError) throw fetchError;

			if (profileData.transaction_pin !== currentPin) {
				throw new Error("Current PIN is incorrect.");
			}

			const { error: updateError } = await supabase
				.from("profiles")
				.update({ transaction_pin: newPin })
				.eq("id", user.id);

			if (updateError) throw updateError;

			setProfile((prev) =>
				prev ? { ...prev, transaction_pin: newPin } : prev,
			);
		} catch (err: any) {
			console.error("Update Transaction PIN Error:", err.message);
			throw new Error(err.message || "Failed to update transaction PIN.");
		}
	};

	useEffect(() => {
		const initializeAuth = async () => {
			setIsLoadingSession(true);
			try {
				const session = await retryGetSession();
				let rememberMe = "false";
				try {
					rememberMe = (await AsyncStorage.getItem("@rememberMe")) || "false";
				} catch (storageError) {
					console.warn("Failed to retrieve rememberMe:", storageError);
				}

				if (session) {
					setSession(session);
					setUser(session.user);
					await requestPushPermissions(session.user.id);
					router.replace("/(app)/(protected)");
				} else if (rememberMe === "true") {
					const { data, error } = await supabase.auth.refreshSession();
					if (error || !data.session) {
						console.warn("Session refresh failed:", error?.message);
						setSession(null);
						setUser(null);
					} else {
						setSession(data.session);
						setUser(data.session.user);
						await requestPushPermissions(data.session.user.id);
						router.replace("/(app)/(protected)");
					}
				}
			} catch (err) {
				console.error("Initialize auth error:", err);
			} finally {
				setIsLoadingSession(false);
				setInitialized(true);
			}
		};

		initializeAuth();

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange(async (event, session) => {
			let rememberMe = "false";
			try {
				rememberMe = (await AsyncStorage.getItem("@rememberMe")) || "false";
			} catch (storageError) {
				console.warn(
					"Failed to retrieve rememberMe in auth state change:",
					storageError,
				);
			}

			if (session && (rememberMe === "true" || event === "SIGNED_IN")) {
				setSession(session);
				setUser(session.user);
				await requestPushPermissions(session.user.id);
				router.replace("/(app)/(protected)");
			} else if (!session) {
				setSession(null);
				setUser(null);
			}
		});

		return () => subscription?.unsubscribe();
	}, []);

	useEffect(() => {
		const fetchProfile = async () => {
			if (!user) return setProfile(null);
			try {
				const { data, error } = await supabase
					.from("profiles")
					.select("*")
					.eq("id", user.id)
					.single();
				if (!error && data) setProfile(data);
			} catch (err) {
				console.warn("Failed to fetch profile:", err);
			}
		};
		fetchProfile();
	}, [user]);

	useEffect(() => {
		if (!initialized || !fontsLoaded || isLoadingSession) return;

		const inProtected = segments[1] === "(protected)";
		const inAuth = segments[1] === "(auth)";
		if (session && !inProtected) {
			router.replace("/(app)/(protected)");
		} else if (!session && !inAuth) {
			router.replace("/(app)/welcome");
		}

		SplashScreen.hideAsync();
	}, [initialized, fontsLoaded, session, isLoadingSession]);

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
				updateTransactionPin,
			}}
		>
			<CustomSuccessModal
				visible={showSuccessModal}
				username={newUsername}
				onClose={() => {
					setShowSuccessModal(false);
					setTimeout(() => {
						router.replace("/(app)/(protected)");
					}, 100);
				}}
			/>
			{children}
		</SupabaseContext.Provider>
	);
};

// // // // import { supabase } from "@/config/supabase";
// // // // import { Session, User } from "@supabase/supabase-js";
// // // // import { useFonts } from "expo-font";
// // // // import { router, useSegments, SplashScreen } from "expo-router";
// // // // import { createContext, useContext, useEffect, useState } from "react";
// // // // import { Alert, Platform, Linking } from "react-native";
// // // // import AsyncStorage from "@react-native-async-storage/async-storage";
// // // // import CustomSuccessModal from "@/components/CustomSuccessModal";
// // // // import UpdateModal from "@/components/common/UpdateModal";
// // // // import { requestPushPermissions } from "./notifications-utils";
// // // // import * as Updates from "expo-updates";

// // // // SplashScreen.preventAutoHideAsync();

// // // // type UserProfile = {
// // // // 	id: string;
// // // // 	email: string;
// // // // 	username: string;
// // // // 	created_at: string;
// // // // 	transaction_pin?: string;
// // // // };

// // // // type SupabaseContextProps = {
// // // // 	auth: any;
// // // // 	profile: UserProfile | null;
// // // // 	user: User | null;
// // // // 	session: Session | null;
// // // // 	initialized?: boolean;
// // // // 	signUp: (
// // // // 		username: string,
// // // // 		email: string,
// // // // 		password: string,
// // // // 		rememberMe?: boolean,
// // // // 	) => Promise<any>;
// // // // 	signInWithPassword: (
// // // // 		email: string,
// // // // 		password: string,
// // // // 		rememberMe?: boolean,
// // // // 	) => Promise<void>;
// // // // 	signOut: () => Promise<void>;
// // // // 	deleteOwnAccount: () => Promise<void>;
// // // // 	updateTransactionPin: (currentPin: string, newPin: string) => Promise<void>;
// // // // };

// // // // type SupabaseProviderProps = {
// // // // 	children: React.ReactNode;
// // // // };

// // // // export const SupabaseContext = createContext<SupabaseContextProps>({
// // // // 	auth: supabase.auth,
// // // // 	user: null,
// // // // 	profile: null,
// // // // 	session: null,
// // // // 	initialized: false,
// // // // 	signUp: async () => {},
// // // // 	signInWithPassword: async () => {},
// // // // 	signOut: async () => {},
// // // // 	deleteOwnAccount: async () => {},
// // // // 	updateTransactionPin: async () => {},
// // // // });

// // // // export const useSupabase = () => useContext(SupabaseContext);
// // // // export const useAuth = () => useSupabase();

// // // // export const SupabaseProvider = ({ children }: SupabaseProviderProps) => {
// // // // 	const segments = useSegments();
// // // // 	const [user, setUser] = useState<User | null>(null);
// // // // 	const [session, setSession] = useState<Session | null>(null);
// // // // 	const [profile, setProfile] = useState<UserProfile | null>(null);
// // // // 	const [initialized, setInitialized] = useState<boolean>(false);
// // // // 	const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
// // // // 	const [newUsername, setNewUsername] = useState<string>("");
// // // // 	const [isLoadingSession, setIsLoadingSession] = useState<boolean>(true);
// // // // 	const [isUpdateModalVisible, setIsUpdateModalVisible] =
// // // // 		useState<boolean>(false);
// // // // 	const [isStoreUpdateRequired, setIsStoreUpdateRequired] =
// // // // 		useState<boolean>(false);
// // // // 	const [latestApkUrl, setLatestApkUrl] = useState<string | null>(null);

// // // // 	const [fontsLoaded] = useFonts({
// // // // 		"Roboto-Regular": require("../assets/fonts/Roboto-Regular.ttf"),
// // // // 	});

// // // // 	const retryGetSession = async (
// // // // 		retries = 3,
// // // // 		delay = 1000,
// // // // 	): Promise<Session | null> => {
// // // // 		for (let i = 0; i < retries; i++) {
// // // // 			try {
// // // // 				const { data, error } = await supabase.auth.getSession();
// // // // 				if (error) throw error;
// // // // 				return data.session;
// // // // 			} catch (err) {
// // // // 				console.warn(`Session retry ${i + 1} failed:`, err);
// // // // 				if (i < retries - 1)
// // // // 					await new Promise((resolve) => setTimeout(resolve, delay));
// // // // 			}
// // // // 		}
// // // // 		return null;
// // // // 	};

// // // // 	const checkForOTAUpdate = async () => {
// // // // 		try {
// // // // 			const update = await Updates.checkForUpdateAsync();
// // // // 			if (update.isAvailable) {
// // // // 				await Updates.fetchUpdateAsync();
// // // // 				setIsUpdateModalVisible(true);
// // // // 				setIsStoreUpdateRequired(false);
// // // // 			}
// // // // 		} catch (error) {
// // // // 			console.error("Error checking for OTA update:", error);
// // // // 		}
// // // // 	};

// // // // 	const checkForStoreUpdate = async () => {
// // // // 		try {
// // // // 			const currentVersion = require("../app.json").expo.version;
// // // // 			const { data, error } = await supabase
// // // // 				.from("app_updates")
// // // // 				.select("version, apk_url")
// // // // 				.eq("status", "active")
// // // // 				.order("created_at", { ascending: false })
// // // // 				.limit(1)
// // // // 				.single();

// // // // 			if (error) {
// // // // 				console.error("Supabase fetch error:", error);
// // // // 				return;
// // // // 			}

// // // // 			if (data && data.version !== currentVersion) {
// // // // 				setLatestApkUrl(data.apk_url);
// // // // 				setIsUpdateModalVisible(true);
// // // // 				setIsStoreUpdateRequired(true);
// // // // 			}
// // // // 		} catch (error) {
// // // // 			console.error("Error checking Android version:", error);
// // // // 		}
// // // // 	};

// // // // 	const shouldCheckForUpdates = async (): Promise<boolean> => {
// // // // 		try {
// // // // 			const lastCheck = await AsyncStorage.getItem("@lastUpdateCheck");
// // // // 			if (!lastCheck) return true; // No previous check, allow update check
// // // // 			const lastCheckDate = new Date(parseInt(lastCheck));
// // // // 			const now = new Date();
// // // // 			const daysSinceLastCheck =
// // // // 				(now.getTime() - lastCheckDate.getTime()) / (1000 * 60 * 60 * 24);
// // // // 			return daysSinceLastCheck >= 21; // Check if 21 days have passed
// // // // 		} catch (error) {
// // // // 			console.error("Error checking last update timestamp:", error);
// // // // 			return true; // Allow check on error to ensure updates aren't missed
// // // // 		}
// // // // 	};

// // // // 	const updateLastCheckTimestamp = async () => {
// // // // 		try {
// // // // 			await AsyncStorage.setItem("@lastUpdateCheck", Date.now().toString());
// // // // 		} catch (error) {
// // // // 			console.error("Error storing last update timestamp:", error);
// // // // 		}
// // // // 	};

// // // // 	const handleUpdateModalClose = () => {
// // // // 		setIsUpdateModalVisible(false);
// // // // 		if (!isStoreUpdateRequired) {
// // // // 			Updates.reloadAsync().catch((err) =>
// // // // 				console.error("Error reloading app:", err),
// // // // 			);
// // // // 		}
// // // // 	};

// // // // 	const signUp = async (
// // // // 		username: string,
// // // // 		email: string,
// // // // 		password: string,
// // // // 		rememberMe: boolean = false,
// // // // 	) => {
// // // // 		try {
// // // // 			const { data, error } = await supabase.auth.signUp({
// // // // 				email: email.trim(),
// // // // 				password,
// // // // 				options: {
// // // // 					data: { username: username.trim() },
// // // // 				},
// // // // 			});

// // // // 			if (error || !data.user) throw error || new Error("Failed to sign up");

// // // // 			const { error: insertError } = await supabase.from("profiles").upsert([
// // // // 				{
// // // // 					id: data.user.id,
// // // // 					username: username.trim(),
// // // // 					email: email.trim(),
// // // // 					created_at: new Date().toISOString(),
// // // // 				},
// // // // 			]);

// // // // 			if (insertError) {
// // // // 				await supabase.auth.admin.deleteUser(data.user.id);
// // // // 				throw new Error("Failed to save user profile.");
// // // // 			}

// // // // 			try {
// // // // 				await AsyncStorage.setItem("@rememberMe", rememberMe.toString());
// // // // 			} catch (storageError) {
// // // // 				console.warn("Failed to store rememberMe:", storageError);
// // // // 			}

// // // // 			setUser(data.user);
// // // // 			setSession(data.session);
// // // // 			setNewUsername(username.trim());
// // // // 			await requestPushPermissions(data.user.id);
// // // // 			setTimeout(() => {
// // // // 				setShowSuccessModal(true);
// // // // 			}, 100);
// // // // 		} catch (err: any) {
// // // // 			console.error("Sign Up Error:", err.message);
// // // // 			Alert.alert("Sign Up Error", err.message || "Unexpected error occurred.");
// // // // 			throw err;
// // // // 		}
// // // // 	};

// // // // 	const signInWithPassword = async (
// // // // 		email: string,
// // // // 		password: string,
// // // // 		rememberMe: boolean = false,
// // // // 	) => {
// // // // 		try {
// // // // 			const { data, error } = await supabase.auth.signInWithPassword({
// // // // 				email,
// // // // 				password,
// // // // 			});

// // // // 			if (error) throw error;
// // // // 			if (!data || !data.user || !data.session) {
// // // // 				throw new Error("Invalid login response from Supabase");
// // // // 			}

// // // // 			try {
// // // // 				await AsyncStorage.setItem("@rememberMe", rememberMe.toString());
// // // // 			} catch (storageError) {
// // // // 				console.warn("Failed to store rememberMe:", storageError);
// // // // 			}

// // // // 			setUser(data.user);
// // // // 			setSession(data.session);
// // // // 			await requestPushPermissions(data.user.id);

// // // // 			// Check for updates on sign-in if 21 days have passed
// // // // 			if (!__DEV__) {
// // // // 				const shouldCheck = await shouldCheckForUpdates();
// // // // 				if (shouldCheck) {
// // // // 					await checkForOTAUpdate();
// // // // 					await checkForStoreUpdate();
// // // // 					await updateLastCheckTimestamp();
// // // // 				}
// // // // 			}

// // // // 			router.replace("/(app)/(protected)");
// // // // 		} catch (err: any) {
// // // // 			console.error("Sign In Error:", err.message);
// // // // 			Alert.alert("Sign In Error", err.message || "Failed to sign in.");
// // // // 			throw err;
// // // // 		}
// // // // 	};

// // // // 	const signOut = async () => {
// // // // 		try {
// // // // 			const { error } = await supabase.auth.signOut();
// // // // 			if (error) throw error;
// // // // 			setUser(null);
// // // // 			setSession(null);
// // // // 			try {
// // // // 				await AsyncStorage.removeItem("@rememberMe");
// // // // 			} catch (storageError) {
// // // // 				console.warn("Failed to clear rememberMe:", storageError);
// // // // 			}
// // // // 			router.replace("/(app)/welcome");
// // // // 		} catch (err: any) {
// // // // 			console.error("Sign Out Error:", err.message);
// // // // 			Alert.alert("Sign Out Error", err.message || "Failed to sign out.");
// // // // 		}
// // // // 	};

// // // // 	const deleteOwnAccount = async () => {
// // // // 		if (!user || !session) {
// // // // 			Alert.alert("Error", "You must be logged in to delete your account.");
// // // // 			return;
// // // // 		}

// // // // 		try {
// // // // 			const response = await fetch(
// // // // 				`${process.env.EXPO_PUBLIC_SUPABASE_DELETE_ACCOUNT_FUNCTION_URL}`,
// // // // 				{
// // // // 					method: "POST",
// // // // 					headers: {
// // // // 						"Content-Type": "application/json",
// // // // 						Authorization: `Bearer ${session.access_token}`,
// // // // 					},
// // // // 					body: JSON.stringify({ user_id: user.id }),
// // // // 				},
// // // // 			);

// // // // 			const result = await response.json();
// // // // 			if (!response.ok) throw new Error(result.error || "Delete failed");

// // // // 			setUser(null);
// // // // 			setSession(null);
// // // // 			try {
// // // // 				await AsyncStorage.removeItem("@rememberMe");
// // // // 			} catch (storageError) {
// // // // 				console.warn("Failed to clear rememberMe:", storageError);
// // // // 			}
// // // // 			Alert.alert("Deleted", "Your account was deleted successfully.");
// // // // 			router.replace("/(app)/welcome");
// // // // 		} catch (err: any) {
// // // // 			console.error("Delete account error:", err.message);
// // // // 			Alert.alert("Error", err.message || "Failed to delete account.");
// // // // 		}
// // // // 	};

// // // // 	const updateTransactionPin = async (currentPin: string, newPin: string) => {
// // // // 		if (!user || !session) {
// // // // 			throw new Error("You must be logged in to update your transaction PIN.");
// // // // 		}

// // // // 		try {
// // // // 			const { data: profileData, error: fetchError } = await supabase
// // // // 				.from("profiles")
// // // // 				.select("transaction_pin")
// // // // 				.eq("id", user.id)
// // // // 				.single();

// // // // 			if (fetchError) throw fetchError;

// // // // 			if (profileData.transaction_pin !== currentPin) {
// // // // 				throw new Error("Current PIN is incorrect.");
// // // // 			}

// // // // 			const { error: updateError } = await supabase
// // // // 				.from("profiles")
// // // // 				.update({ transaction_pin: newPin })
// // // // 				.eq("id", user.id);

// // // // 			if (updateError) throw updateError;

// // // // 			setProfile((prev) =>
// // // // 				prev ? { ...prev, transaction_pin: newPin } : prev,
// // // // 			);
// // // // 		} catch (err: any) {
// // // // 			console.error("Update Transaction PIN Error:", err.message);
// // // // 			throw new Error(err.message || "Failed to update transaction PIN.");
// // // // 		}
// // // // 	};

// // // // 	useEffect(() => {
// // // // 		const initializeAuth = async () => {
// // // // 			setIsLoadingSession(true);
// // // // 			try {
// // // // 				const session = await retryGetSession();
// // // // 				let rememberMe = "false";
// // // // 				try {
// // // // 					rememberMe = (await AsyncStorage.getItem("@rememberMe")) || "false";
// // // // 				} catch (storageError) {
// // // // 					console.warn("Failed to retrieve rememberMe:", storageError);
// // // // 				}

// // // // 				if (session) {
// // // // 					setSession(session);
// // // // 					setUser(session.user);
// // // // 					await requestPushPermissions(session.user.id);
// // // // 					// Check for updates on initial session load if 21 days have passed
// // // // 					if (!__DEV__) {
// // // // 						const shouldCheck = await shouldCheckForUpdates();
// // // // 						if (shouldCheck) {
// // // // 							await checkForOTAUpdate();
// // // // 							await checkForStoreUpdate();
// // // // 							await updateLastCheckTimestamp();
// // // // 						}
// // // // 					}
// // // // 					router.replace("/(app)/(protected)");
// // // // 				} else if (rememberMe === "true") {
// // // // 					const { data, error } = await supabase.auth.refreshSession();
// // // // 					if (error || !data.session) {
// // // // 						console.warn("Session refresh failed:", error?.message);
// // // // 						setSession(null);
// // // // 						setUser(null);
// // // // 					} else {
// // // // 						setSession(data.session);
// // // // 						setUser(data.session.user);
// // // // 						await requestPushPermissions(data.session.user.id);
// // // // 						// Check for updates on session refresh if 21 days have passed
// // // // 						if (!__DEV__) {
// // // // 							const shouldCheck = await shouldCheckForUpdates();
// // // // 							if (shouldCheck) {
// // // // 								await checkForOTAUpdate();
// // // // 								await checkForStoreUpdate();
// // // // 								await updateLastCheckTimestamp();
// // // // 							}
// // // // 						}
// // // // 						router.replace("/(app)/(protected)");
// // // // 					}
// // // // 				}
// // // // 			} catch (err) {
// // // // 				console.error("Initialize auth error:", err);
// // // // 			} finally {
// // // // 				setIsLoadingSession(false);
// // // // 				setInitialized(true);
// // // // 			}
// // // // 		};

// // // // 		initializeAuth();

// // // // 		const {
// // // // 			data: { subscription },
// // // // 		} = supabase.auth.onAuthStateChange(async (event, session) => {
// // // // 			let rememberMe = "false";
// // // // 			try {
// // // // 				rememberMe = (await AsyncStorage.getItem("@rememberMe")) || "false";
// // // // 			} catch (storageError) {
// // // // 				console.warn(
// // // // 					"Failed to retrieve rememberMe in auth state change:",
// // // // 					storageError,
// // // // 				);
// // // // 			}

// // // // 			if (session && (rememberMe === "true" || event === "SIGNED_IN")) {
// // // // 				setSession(session);
// // // // 				setUser(session.user);
// // // // 				await requestPushPermissions(session.user.id);
// // // // 				// Check for updates on auth state change if 21 days have passed
// // // // 				if (!__DEV__ && event === "SIGNED_IN") {
// // // // 					const shouldCheck = await shouldCheckForUpdates();
// // // // 					if (shouldCheck) {
// // // // 						await checkForOTAUpdate();
// // // // 						await checkForStoreUpdate();
// // // // 						await updateLastCheckTimestamp();
// // // // 					}
// // // // 				}
// // // // 				router.replace("/(app)/(protected)");
// // // // 			} else if (!session) {
// // // // 				setSession(null);
// // // // 				setUser(null);
// // // // 			}
// // // // 		});

// // // // 		return () => subscription?.unsubscribe();
// // // // 	}, []);

// // // // 	useEffect(() => {
// // // // 		const fetchProfile = async () => {
// // // // 			if (!user) return setProfile(null);
// // // // 			try {
// // // // 				const { data, error } = await supabase
// // // // 					.from("profiles")
// // // // 					.select("*")
// // // // 					.eq("id", user.id)
// // // // 					.single();
// // // // 				if (!error && data) setProfile(data);
// // // // 			} catch (err) {
// // // // 				console.warn("Failed to fetch profile:", err);
// // // // 			}
// // // // 		};
// // // // 		fetchProfile();
// // // // 	}, [user]);

// // // // 	useEffect(() => {
// // // // 		if (!initialized || !fontsLoaded || isLoadingSession) return;

// // // // 		const inProtected = segments[1] === "(protected)";
// // // // 		const inAuth = segments[1] === "(auth)";
// // // // 		if (session && !inProtected) {
// // // // 			router.replace("/(app)/(protected)");
// // // // 		} else if (!session && !inAuth) {
// // // // 			router.replace("/(app)/welcome");
// // // // 		}

// // // // 		SplashScreen.hideAsync();
// // // // 	}, [initialized, fontsLoaded, session, isLoadingSession]);

// // // // 	return (
// // // // 		<SupabaseContext.Provider
// // // // 			value={{
// // // // 				auth: supabase.auth,
// // // // 				user,
// // // // 				session,
// // // // 				profile,
// // // // 				initialized,
// // // // 				signUp,
// // // // 				signInWithPassword,
// // // // 				signOut,
// // // // 				deleteOwnAccount,
// // // // 				updateTransactionPin,
// // // // 			}}
// // // // 		>
// // // // 			<CustomSuccessModal
// // // // 				visible={showSuccessModal}
// // // // 				username={newUsername}
// // // // 				onClose={() => {
// // // // 					setShowSuccessModal(false);
// // // // 					setTimeout(() => {
// // // // 						router.replace("/(app)/(protected)");
// // // // 					}, 100);
// // // // 				}}
// // // // 			/>
// // // // 			<UpdateModal
// // // // 				visible={isUpdateModalVisible}
// // // // 				onClose={handleUpdateModalClose}
// // // // 				isStoreUpdate={isStoreUpdateRequired}
// // // // 				apkUrl={latestApkUrl ?? undefined}
// // // // 			/>
// // // // 			{children}
// // // // 		</SupabaseContext.Provider>
// // // // 	);
// // // // };

// // // import { supabase } from "@/config/supabase";
// // // import { Session, User } from "@supabase/supabase-js";
// // // import { useFonts } from "expo-font";
// // // import { router, useSegments, SplashScreen } from "expo-router";
// // // import { createContext, useContext, useEffect, useState } from "react";
// // // import { Alert, Platform, Linking } from "react-native";
// // // import AsyncStorage from "@react-native-async-storage/async-storage";
// // // import CustomSuccessModal from "@/components/CustomSuccessModal";
// // // import UpdateModal from "@/components/common/UpdateModal";
// // // import { requestPushPermissions } from "./notifications-utils";
// // // import * as Updates from "expo-updates";

// // // SplashScreen.preventAutoHideAsync();

// // // type UserProfile = {
// // // 	id: string;
// // // 	email: string;
// // // 	username: string;
// // // 	created_at: string;
// // // 	transaction_pin?: string;
// // // };

// // // type SupabaseContextProps = {
// // // 	auth: any;
// // // 	profile: UserProfile | null;
// // // 	user: User | null;
// // // 	session: Session | null;
// // // 	initialized?: boolean;
// // // 	signUp: (
// // // 		username: string,
// // // 		email: string,
// // // 		password: string,
// // // 		rememberMe?: boolean,
// // // 	) => Promise<any>;
// // // 	signInWithPassword: (
// // // 		email: string,
// // // 		password: string,
// // // 		rememberMe?: boolean,
// // // 	) => Promise<void>;
// // // 	signOut: () => Promise<void>;
// // // 	deleteOwnAccount: () => Promise<void>;
// // // 	updateTransactionPin: (currentPin: string, newPin: string) => Promise<void>;
// // // };

// // // type SupabaseProviderProps = {
// // // 	children: React.ReactNode;
// // // };

// // // export const SupabaseContext = createContext<SupabaseContextProps>({
// // // 	auth: supabase.auth,
// // // 	user: null,
// // // 	profile: null,
// // // 	session: null,
// // // 	initialized: false,
// // // 	signUp: async () => {},
// // // 	signInWithPassword: async () => {},
// // // 	signOut: async () => {},
// // // 	deleteOwnAccount: async () => {},
// // // 	updateTransactionPin: async () => {},
// // // });

// // // export const useSupabase = () => useContext(SupabaseContext);
// // // export const useAuth = () => useSupabase();

// // // export const SupabaseProvider = ({ children }: SupabaseProviderProps) => {
// // // 	const segments = useSegments();
// // // 	const [user, setUser] = useState<User | null>(null);
// // // 	const [session, setSession] = useState<Session | null>(null);
// // // 	const [profile, setProfile] = useState<UserProfile | null>(null);
// // // 	const [initialized, setInitialized] = useState<boolean>(false);
// // // 	const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
// // // 	const [newUsername, setNewUsername] = useState<string>("");
// // // 	const [isLoadingSession, setIsLoadingSession] = useState<boolean>(true);
// // // 	const [isUpdateModalVisible, setIsUpdateModalVisible] =
// // // 		useState<boolean>(false);
// // // 	const [isStoreUpdateRequired, setIsStoreUpdateRequired] =
// // // 		useState<boolean>(false);
// // // 	const [latestApkUrl, setLatestApkUrl] = useState<string | null>(null);

// // // 	const [fontsLoaded] = useFonts({
// // // 		"Roboto-Regular": require("../assets/fonts/Roboto-Regular.ttf"),
// // // 	});

// // // 	const retryGetSession = async (
// // // 		retries = 3,
// // // 		delay = 1000,
// // // 	): Promise<Session | null> => {
// // // 		for (let i = 0; i < retries; i++) {
// // // 			try {
// // // 				const { data, error } = await supabase.auth.getSession();
// // // 				if (error) throw error;
// // // 				return data.session;
// // // 			} catch (err) {
// // // 				console.warn(`Session retry ${i + 1} failed:`, err);
// // // 				if (i < retries - 1)
// // // 					await new Promise((resolve) => setTimeout(resolve, delay));
// // // 			}
// // // 		}
// // // 		return null;
// // // 	};

// // // 	const checkForOTAUpdate = async () => {
// // // 		console.log("🟡 Starting OTA update check...");

// // // 		try {
// // // 			const update = await Updates.checkForUpdateAsync();
// // // 			console.log("🔍 OTA check result:", update);

// // // 			if (update.isAvailable) {
// // // 				console.log("⬇️ OTA update available, fetching...");
// // // 				await Updates.fetchUpdateAsync();
// // // 				console.log("✅ OTA update fetched, showing modal");
// // // 				setIsUpdateModalVisible(true);
// // // 			} else {
// // // 				console.log("✅ No OTA update available");
// // // 			}
// // // 		} catch (error) {
// // // 			console.error("❌ OTA update error:", error);
// // // 		}

// // // 	};

// // // 	const checkForStoreUpdate = async () => {
// // // 		console.log("🟠 Checking for store update...");
// // // 		try {
// // // 			const currentVersion = require("../app.json").expo.version;
// // // 			const { data, error } = await supabase
// // // 				.from("app_updates")
// // // 				.select("version, apk_url")
// // // 				.eq("status", "active")
// // // 				.order("created_at", { ascending: false })
// // // 				.limit(1)
// // // 				.single();

// // // 			if (error) {
// // // 				console.error("Supabase fetch error:", error);
// // // 				return;
// // // 			}

// // // 			if (data && data.version !== currentVersion) {
// // // 				setLatestApkUrl(data.apk_url);
// // // 				setIsUpdateModalVisible(true);
// // // 				setIsStoreUpdateRequired(true);
// // // 			}
// // // 		} catch (error) {
// // // 			console.error("Error checking Android version:", error);
// // // 		}
// // // 	};

// // // 	const shouldCheckForUpdates = async (): Promise<boolean> => {
// // // 		try {
// // // 			const lastCheck = await AsyncStorage.getItem("@lastUpdateCheck");
// // // 			if (!lastCheck) return true;
// // // 			const lastCheckDate = new Date(parseInt(lastCheck));
// // // 			const now = new Date();
// // // 			const daysSinceLastCheck =
// // // 				(now.getTime() - lastCheckDate.getTime()) / (1000 * 60 * 60 * 24);
// // // 			return daysSinceLastCheck >= 21;
// // // 		} catch (error) {
// // // 			console.error("Error checking last update timestamp:", error);
// // // 			return true;
// // // 		}
// // // 	};

// // // 	const updateLastCheckTimestamp = async () => {
// // // 		try {
// // // 			await AsyncStorage.setItem("@lastUpdateCheck", Date.now().toString());
// // // 		} catch (error) {
// // // 			console.error("Error storing last update timestamp:", error);
// // // 		}
// // // 	};

// // // 	const handleUpdateModalClose = () => {
// // // 		setIsUpdateModalVisible(false);
// // // 		if (!isStoreUpdateRequired) {
// // // 			Updates.reloadAsync().catch((err) =>
// // // 				console.error("Error reloading app:", err),
// // // 			);
// // // 		}
// // // 	};

// // // 	const signUp = async (
// // // 		username: string,
// // // 		email: string,
// // // 		password: string,
// // // 		rememberMe: boolean = false,
// // // 	) => {
// // // 		try {
// // // 			const { data, error } = await supabase.auth.signUp({
// // // 				email: email.trim(),
// // // 				password,
// // // 				options: {
// // // 					data: { username: username.trim() },
// // // 				},
// // // 			});

// // // 			if (error || !data.user) throw error || new Error("Failed to sign up");

// // // 			const { error: insertError } = await supabase.from("profiles").upsert([
// // // 				{
// // // 					id: data.user.id,
// // // 					username: username.trim(),
// // // 					email: email.trim(),
// // // 					created_at: new Date().toISOString(),
// // // 				},
// // // 			]);

// // // 			if (insertError) {
// // // 				await supabase.auth.admin.deleteUser(data.user.id);
// // // 				throw new Error("Failed to save user profile.");
// // // 			}

// // // 			try {
// // // 				await AsyncStorage.setItem("@rememberMe", rememberMe.toString());
// // // 			} catch (storageError) {
// // // 				console.warn("Failed to store rememberMe:", storageError);
// // // 			}

// // // 			setUser(data.user);
// // // 			setSession(data.session);
// // // 			setNewUsername(username.trim());
// // // 			await requestPushPermissions(data.user.id);
// // // 			setTimeout(() => {
// // // 				setShowSuccessModal(true);
// // // 			}, 100);
// // // 		} catch (err: any) {
// // // 			console.error("Sign Up Error:", err.message);
// // // 			Alert.alert("Sign Up Error", err.message || "Unexpected error occurred.");
// // // 			throw err;
// // // 		}
// // // 	};

// // // 	const signInWithPassword = async (
// // // 		email: string,
// // // 		password: string,
// // // 		rememberMe: boolean = false,
// // // 	) => {
// // // 		try {
// // // 			const { data, error } = await supabase.auth.signInWithPassword({
// // // 				email,
// // // 				password,
// // // 			});

// // // 			if (error) throw error;
// // // 			if (!data || !data.user || !data.session) {
// // // 				throw new Error("Invalid login response from Supabase");
// // // 			}

// // // 			try {
// // // 				await AsyncStorage.setItem("@rememberMe", rememberMe.toString());
// // // 			} catch (storageError) {
// // // 				console.warn("Failed to store rememberMe:", storageError);
// // // 			}

// // // 			setUser(data.user);
// // // 			setSession(data.session);
// // // 			await requestPushPermissions(data.user.id);

// // // 			router.replace("/(app)/(protected)");

// // // 			// Check for updates on sign-in if 21 days have passed (non-blocking)
// // // 			// if (!__DEV__) {
// // // 				console.log("🔄 Running update check after sign-in (dev + prod)");

// // // 				shouldCheckForUpdates().then((shouldCheck) => {
// // // 					console.log("✅ shouldCheckForUpdates result:", shouldCheck);

// // // 					if (shouldCheck) {
// // // 						console.log("🚀 Triggering OTA + Store update checks...");

// // // 						Promise.all([checkForOTAUpdate(), checkForStoreUpdate()])
// // // 							.then(() => {
// // // 								console.log("✅ Update checks done, updating timestamp");
// // // 								updateLastCheckTimestamp();
// // // 							})
// // // 							.catch((err) => console.error("❌ Update check error:", err));
// // // 					} else {
// // // 						console.log("⏭️ Skipping update check (not due yet)");
// // // 					}
// // // 				});
// // // 			// }
// // // 		} catch (err: any) {
// // // 			console.error("Sign In Error:", err.message);
// // // 			Alert.alert("Sign In Error", err.message || "Failed to sign in.");
// // // 			throw err;
// // // 		}
// // // 	};

// // // 	const signOut = async () => {
// // // 		try {
// // // 			const { error } = await supabase.auth.signOut();
// // // 			if (error) throw error;
// // // 			setUser(null);
// // // 			setSession(null);
// // // 			try {
// // // 				await AsyncStorage.removeItem("@rememberMe");
// // // 			} catch (storageError) {
// // // 				console.warn("Failed to clear rememberMe:", storageError);
// // // 			}
// // // 			router.replace("/(app)/welcome");
// // // 		} catch (err: any) {
// // // 			console.error("Sign Out Error:", err.message);
// // // 			Alert.alert("Sign Out Error", err.message || "Failed to sign out.");
// // // 		}
// // // 	};

// // // 	const deleteOwnAccount = async () => {
// // // 		if (!user || !session) {
// // // 			Alert.alert("Error", "You must be logged in to delete your account.");
// // // 			return;
// // // 		}

// // // 		try {
// // // 			const response = await fetch(
// // // 				`${process.env.EXPO_PUBLIC_SUPABASE_DELETE_ACCOUNT_FUNCTION_URL}`,
// // // 				{
// // // 					method: "POST",
// // // 					headers: {
// // // 						"Content-Type": "application/json",
// // // 						Authorization: `Bearer ${session.access_token}`,
// // // 					},
// // // 					body: JSON.stringify({ user_id: user.id }),
// // // 				},
// // // 			);

// // // 			const result = await response.json();
// // // 			if (!response.ok) throw new Error(result.error || "Delete failed");

// // // 			setUser(null);
// // // 			setSession(null);
// // // 			try {
// // // 				await AsyncStorage.removeItem("@rememberMe");
// // // 			} catch (storageError) {
// // // 				console.warn("Failed to clear rememberMe:", storageError);
// // // 			}
// // // 			Alert.alert("Deleted", "Your account was deleted successfully.");
// // // 			router.replace("/(app)/welcome");
// // // 		} catch (err: any) {
// // // 			console.error("Delete account error:", err.message);
// // // 			Alert.alert("Error", err.message || "Failed to delete account.");
// // // 		}
// // // 	};

// // // 	const updateTransactionPin = async (currentPin: string, newPin: string) => {
// // // 		if (!user || !session) {
// // // 			throw new Error("You must be logged in to update your transaction PIN.");
// // // 		}

// // // 		try {
// // // 			const { data: profileData, error: fetchError } = await supabase
// // // 				.from("profiles")
// // // 				.select("transaction_pin")
// // // 				.eq("id", user.id)
// // // 				.single();

// // // 			if (fetchError) throw fetchError;

// // // 			if (profileData.transaction_pin !== currentPin) {
// // // 				throw new Error("Current PIN is incorrect.");
// // // 			}

// // // 			const { error: updateError } = await supabase
// // // 				.from("profiles")
// // // 				.update({ transaction_pin: newPin })
// // // 				.eq("id", user.id);

// // // 			if (updateError) throw updateError;

// // // 			setProfile((prev) =>
// // // 				prev ? { ...prev, transaction_pin: newPin } : prev,
// // // 			);
// // // 		} catch (err: any) {
// // // 			console.error("Update Transaction PIN Error:", err.message);
// // // 			throw new Error(err.message || "Failed to update transaction PIN.");
// // // 		}
// // // 	};

// // // 	useEffect(() => {
// // // 		const initializeAuth = async () => {
// // // 			setIsLoadingSession(true);
// // // 			try {
// // // 				const session = await retryGetSession();
// // // 				let rememberMe = "false";
// // // 				try {
// // // 					rememberMe = (await AsyncStorage.getItem("@rememberMe")) || "false";
// // // 				} catch (storageError) {
// // // 					console.warn("Failed to retrieve rememberMe:", storageError);
// // // 				}

// // // 				if (session) {
// // // 					setSession(session);
// // // 					setUser(session.user);
// // // 					await requestPushPermissions(session.user.id);
// // // 					router.replace("/(app)/(protected)");

// // // 					// Check for updates on initial session load if 21 days have passed (non-blocking)
// // // 					// if (!__DEV__) {
// // // 						console.log(
// // // 							"🔄 Running update check on initializeAuth (dev + prod)",
// // // 						);

// // // 						shouldCheckForUpdates().then((shouldCheck) => {
// // // 							console.log(
// // // 								"✅ shouldCheckForUpdates result (init):",
// // // 								shouldCheck,
// // // 							);

// // // 							if (shouldCheck) {
// // // 								console.log("🚀 Triggering OTA + Store updates (init)...");

// // // 								Promise.all([checkForOTAUpdate(), checkForStoreUpdate()])
// // // 									.then(() => {
// // // 										console.log(
// // // 											"✅ Timestamp updated after initialization update check",
// // // 										);
// // // 										updateLastCheckTimestamp();
// // // 									})
// // // 									.catch((err) =>
// // // 										console.error("❌ Update check error (init):", err),
// // // 									);
// // // 							} else {
// // // 								console.log("⏭️ Skipping update check on init (not due yet)");
// // // 							}
// // // 						});

// // // 					// }
// // // 				} else if (rememberMe === "true") {
// // // 					const { data, error } = await supabase.auth.refreshSession();
// // // 					if (error || !data.session) {
// // // 						console.warn("Session refresh failed:", error?.message);
// // // 						setSession(null);
// // // 						setUser(null);
// // // 					} else {
// // // 						setSession(data.session);
// // // 						setUser(data.session.user);
// // // 						await requestPushPermissions(data.session.user.id);
// // // 						router.replace("/(app)/(protected)");

// // // 						// Check for updates on session refresh if 21 days have passed (non-blocking)
// // // 						// if (!__DEV__) {
// // // 							console.log(
// // // 								"🔄 Auth state changed — checking for updates (dev + prod)",
// // // 							);

// // // 							shouldCheckForUpdates().then((shouldCheck) => {
// // // 								console.log(
// // // 									"✅ shouldCheckForUpdates (auth change):",
// // // 									shouldCheck,
// // // 								);

// // // 								if (shouldCheck) {
// // // 									console.log(
// // // 										"🚀 Triggering OTA + Store updates (auth change)...",
// // // 									);

// // // 									Promise.all([checkForOTAUpdate(), checkForStoreUpdate()])
// // // 										.then(() => {
// // // 											console.log(
// // // 												"✅ Timestamp updated after auth change check",
// // // 											);
// // // 											updateLastCheckTimestamp();
// // // 										})
// // // 										.catch((err) =>
// // // 											console.error(
// // // 												"❌ Update check error (auth change):",
// // // 												err,
// // // 											),
// // // 										);
// // // 								} else {
// // // 									console.log("⏭️ Skipping update check (auth change)");
// // // 								}
// // // 							});

// // // 						// }
// // // 					}
// // // 				}
// // // 			} catch (err) {
// // // 				console.error("Initialize auth error:", err);
// // // 			} finally {
// // // 				setIsLoadingSession(false);
// // // 				setInitialized(true);
// // // 			}
// // // 		};

// // // 		initializeAuth();

// // // 		const {
// // // 			data: { subscription },
// // // 		} = supabase.auth.onAuthStateChange(async (event, session) => {
// // // 			let rememberMe = "false";
// // // 			try {
// // // 				rememberMe = (await AsyncStorage.getItem("@rememberMe")) || "false";
// // // 			} catch (storageError) {
// // // 				console.warn(
// // // 					"Failed to retrieve rememberMe in auth state change:",
// // // 					storageError,
// // // 				);
// // // 			}

// // // 			if (session && (rememberMe === "true" || event === "SIGNED_IN")) {
// // // 				setSession(session);
// // // 				setUser(session.user);
// // // 				await requestPushPermissions(session.user.id);
// // // 				router.replace("/(app)/(protected)");

// // // 				// Check for updates on auth state change if 21 days have passed (non-blocking)
// // // 				if (event === "SIGNED_IN") {
// // // 					shouldCheckForUpdates().then((shouldCheck) => {
// // // 						if (shouldCheck) {
// // // 							Promise.all([checkForOTAUpdate(), checkForStoreUpdate()])
// // // 								.then(() => updateLastCheckTimestamp())
// // // 								.catch((err) => console.error("Update check error:", err));
// // // 						}
// // // 					});
// // // 				}
// // // 			} else if (!session) {
// // // 				setSession(null);
// // // 				setUser(null);
// // // 			}
// // // 		});

// // // 		return () => subscription?.unsubscribe();
// // // 	}, []);

// // // 	useEffect(() => {
// // // 		const fetchProfile = async () => {
// // // 			if (!user) return setProfile(null);
// // // 			try {
// // // 				const { data, error } = await supabase
// // // 					.from("profiles")
// // // 					.select("*")
// // // 					.eq("id", user.id)
// // // 					.single();
// // // 				if (!error && data) setProfile(data);
// // // 			} catch (err) {
// // // 				console.warn("Failed to fetch profile:", err);
// // // 			}
// // // 		};
// // // 		fetchProfile();
// // // 	}, [user]);

// // // 	useEffect(() => {
// // // 		if (!initialized || !fontsLoaded || isLoadingSession) return;

// // // 		const inProtected = segments[1] === "(protected)";
// // // 		const inAuth = segments[1] === "(auth)";
// // // 		if (session && !inProtected) {
// // // 			router.replace("/(app)/(protected)");
// // // 		} else if (!session && !inAuth) {
// // // 			router.replace("/(app)/welcome");
// // // 		}

// // // 		SplashScreen.hideAsync();
// // // 	}, [initialized, fontsLoaded, session, isLoadingSession]);

// // // 	return (
// // // 		<SupabaseContext.Provider
// // // 			value={{
// // // 				auth: supabase.auth,
// // // 				user,
// // // 				session,
// // // 				profile,
// // // 				initialized,
// // // 				signUp,
// // // 				signInWithPassword,
// // // 				signOut,
// // // 				deleteOwnAccount,
// // // 				updateTransactionPin,
// // // 			}}
// // // 		>
// // // 			<CustomSuccessModal
// // // 				visible={showSuccessModal}
// // // 				username={newUsername}
// // // 				onClose={() => {
// // // 					setShowSuccessModal(false);
// // // 					setTimeout(() => {
// // // 						router.replace("/(app)/(protected)");
// // // 					}, 100);
// // // 				}}
// // // 			/>
// // // 			<UpdateModal
// // // 				visible={isUpdateModalVisible}
// // // 				onClose={handleUpdateModalClose}
// // // 				isStoreUpdate={isStoreUpdateRequired}
// // // 				apkUrl={latestApkUrl ?? undefined}
// // // 			/>
// // // 			{children}
// // // 		</SupabaseContext.Provider>
// // // 	);
// // // };

// // import { supabase } from "@/config/supabase";
// // import { Session, User } from "@supabase/supabase-js";
// // import { useFonts } from "expo-font";
// // import { router, useSegments, SplashScreen } from "expo-router";
// // import { createContext, useContext, useEffect, useState } from "react";
// // import { Alert, Platform, Linking } from "react-native";
// // import AsyncStorage from "@react-native-async-storage/async-storage";
// // import CustomSuccessModal from "@/components/CustomSuccessModal";
// // import UpdateModal from "@/components/common/UpdateModal";
// // import { requestPushPermissions } from "./notifications-utils";
// // import * as Updates from "expo-updates";

// // SplashScreen.preventAutoHideAsync();

// // type UserProfile = {
// // 	id: string;
// // 	email: string;
// // 	username: string;
// // 	created_at: string;
// // 	transaction_pin?: string;
// // };

// // type SupabaseContextProps = {
// // 	auth: any;
// // 	profile: UserProfile | null;
// // 	user: User | null;
// // 	session: Session | null;
// // 	initialized?: boolean;
// // 	signUp: (
// // 		username: string,
// // 		email: string,
// // 		password: string,
// // 		rememberMe?: boolean,
// // 	) => Promise<any>;
// // 	signInWithPassword: (
// // 		email: string,
// // 		password: string,
// // 		rememberMe?: boolean,
// // 	) => Promise<void>;
// // 	signOut: () => Promise<void>;
// // 	deleteOwnAccount: () => Promise<void>;
// // 	updateTransactionPin: (currentPin: string, newPin: string) => Promise<void>;
// // };

// // type SupabaseProviderProps = {
// // 	children: React.ReactNode;
// // };

// // export const SupabaseContext = createContext<SupabaseContextProps>({
// // 	auth: supabase.auth,
// // 	user: null,
// // 	profile: null,
// // 	session: null,
// // 	initialized: false,
// // 	signUp: async () => {},
// // 	signInWithPassword: async () => {},
// // 	signOut: async () => {},
// // 	deleteOwnAccount: async () => {},
// // 	updateTransactionPin: async () => {},
// // });

// // export const useSupabase = () => useContext(SupabaseContext);
// // export const useAuth = () => useSupabase();

// // export const SupabaseProvider = ({ children }: SupabaseProviderProps) => {
// // 	const segments = useSegments();
// // 	const [user, setUser] = useState<User | null>(null);
// // 	const [session, setSession] = useState<Session | null>(null);
// // 	const [profile, setProfile] = useState<UserProfile | null>(null);
// // 	const [initialized, setInitialized] = useState<boolean>(false);
// // 	const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
// // 	const [newUsername, setNewUsername] = useState<string>("");
// // 	const [isLoadingSession, setIsLoadingSession] = useState<boolean>(true);
// // 	const [isUpdateModalVisible, setIsUpdateModalVisible] =
// // 		useState<boolean>(false);
// // 	const [isStoreUpdateRequired, setIsStoreUpdateRequired] =
// // 		useState<boolean>(false);
// // 	const [latestApkUrl, setLatestApkUrl] = useState<string | null>(null);

// // 	const [fontsLoaded] = useFonts({
// // 		"Roboto-Regular": require("../assets/fonts/Roboto-Regular.ttf"),
// // 	});

// // 	const retryGetSession = async (
// // 		retries = 3,
// // 		delay = 1000,
// // 	): Promise<Session | null> => {
// // 		for (let i = 0; i < retries; i++) {
// // 			try {
// // 				const { data, error } = await supabase.auth.getSession();
// // 				if (error) throw error;
// // 				return data.session;
// // 			} catch (err) {
// // 				console.warn(`Session retry ${i + 1} failed:`, err);
// // 				if (i < retries - 1)
// // 					await new Promise((resolve) => setTimeout(resolve, delay));
// // 			}
// // 		}
// // 		return null;
// // 	};

// // 	const checkForOTAUpdate = async () => {
// // 		console.log("🟡 Starting OTA update check...");
// // 		try {
// // 			const update = await Updates.checkForUpdateAsync();
// // 			console.log("🔍 OTA check result:", update);
// // 			if (update.isAvailable) {
// // 				console.log("⬇️ OTA update available, fetching...");
// // 				await Updates.fetchUpdateAsync();
// // 				console.log("✅ OTA update fetched, showing modal");
// // 				setIsUpdateModalVisible(true);
// // 			} else {
// // 				console.log("✅ No OTA update available");
// // 			}
// // 		} catch (error) {
// // 			console.error("❌ OTA update error:", error);
// // 		}
// // 	};

// // 	const checkForStoreUpdate = async () => {
// // 		console.log("🟠 Checking for store update...");
// // 		try {
// // 			const currentVersion = require("../app.json").expo.version;
// // 			const { data, error } = await supabase
// // 				.from("app_updates")
// // 				.select("version, apk_url")
// // 				.eq("status", "active")
// // 				.order("created_at", { ascending: false })
// // 				.limit(1)
// // 				.single();

// // 			if (error) {
// // 				console.error("Supabase fetch error:", error);
// // 				return;
// // 			}

// // 			if (data && data.version !== currentVersion) {
// // 				setLatestApkUrl(data.apk_url);
// // 				setIsUpdateModalVisible(true);
// // 				setIsStoreUpdateRequired(true);
// // 			}
// // 		} catch (error) {
// // 			console.error("Error checking Android version:", error);
// // 		}
// // 	};

// // 	const handleUpdateModalClose = () => {
// // 		setIsUpdateModalVisible(false);
// // 		if (!isStoreUpdateRequired) {
// // 			Updates.reloadAsync().catch((err) =>
// // 				console.error("Error reloading app:", err),
// // 			);
// // 		}
// // 	};

// // 	const signUp = async (
// // 		username: string,
// // 		email: string,
// // 		password: string,
// // 		rememberMe: boolean = false,
// // 	) => {
// // 		try {
// // 			const { data, error } = await supabase.auth.signUp({
// // 				email: email.trim(),
// // 				password,
// // 				options: {
// // 					data: { username: username.trim() },
// // 				},
// // 			});

// // 			if (error || !data.user) throw error || new Error("Failed to sign up");

// // 			const { error: insertError } = await supabase.from("profiles").upsert([
// // 				{
// // 					id: data.user.id,
// // 					username: username.trim(),
// // 					email: email.trim(),
// // 					created_at: new Date().toISOString(),
// // 				},
// // 			]);

// // 			if (insertError) {
// // 				await supabase.auth.admin.deleteUser(data.user.id);
// // 				throw new Error("Failed to save user profile.");
// // 			}

// // 			try {
// // 				await AsyncStorage.setItem("@rememberMe", rememberMe.toString());
// // 			} catch (storageError) {
// // 				console.warn("Failed to store rememberMe:", storageError);
// // 			}

// // 			setUser(data.user);
// // 			setSession(data.session);
// // 			setNewUsername(username.trim());
// // 			await requestPushPermissions(data.user.id);
// // 			setTimeout(() => {
// // 				setShowSuccessModal(true);
// // 			}, 100);
// // 		} catch (err: any) {
// // 			console.error("Sign Up Error:", err.message);
// // 			Alert.alert("Sign Up Error", err.message || "Unexpected error occurred.");
// // 			throw err;
// // 		}
// // 	};

// // 	const signInWithPassword = async (
// // 		email: string,
// // 		password: string,
// // 		rememberMe: boolean = false,
// // 	) => {
// // 		try {
// // 			const { data, error } = await supabase.auth.signInWithPassword({
// // 				email,
// // 				password,
// // 			});

// // 			if (error) throw error;
// // 			if (!data || !data.user || !data.session) {
// // 				throw new Error("Invalid login response from Supabase");
// // 			}

// // 			try {
// // 				await AsyncStorage.setItem("@rememberMe", rememberMe.toString());
// // 			} catch (storageError) {
// // 				console.warn("Failed to store rememberMe:", storageError);
// // 			}

// // 			setUser(data.user);
// // 			setSession(data.session);
// // 			await requestPushPermissions(data.user.id);

// // 			router.replace("/(app)/(protected)");

// // 			console.log("🔄 Running update check after sign-in");
// // 			Promise.all([checkForOTAUpdate(), checkForStoreUpdate()]).catch((err) =>
// // 				console.error("❌ Update check error:", err),
// // 			);
// // 		} catch (err: any) {
// // 			console.error("Sign In Error:", err.message);
// // 			Alert.alert("Sign In Error", err.message || "Failed to sign in.");
// // 			throw err;
// // 		}
// // 	};

// // 	const signOut = async () => {
// // 		try {
// // 			const { error } = await supabase.auth.signOut();
// // 			if (error) throw error;
// // 			setUser(null);
// // 			setSession(null);
// // 			try {
// // 				await AsyncStorage.removeItem("@rememberMe");
// // 			} catch (storageError) {
// // 				console.warn("Failed to clear rememberMe:", storageError);
// // 			}
// // 			router.replace("/(app)/welcome");
// // 		} catch (err: any) {
// // 			console.error("Sign Out Error:", err.message);
// // 			Alert.alert("Sign Out Error", err.message || "Failed to sign out.");
// // 		}
// // 	};

// // 	const deleteOwnAccount = async () => {
// // 		if (!user || !session) {
// // 			Alert.alert("Error", "You must be logged in to delete your account.");
// // 			return;
// // 		}

// // 		try {
// // 			const response = await fetch(
// // 				`${process.env.EXPO_PUBLIC_SUPABASE_DELETE_ACCOUNT_FUNCTION_URL}`,
// // 				{
// // 					method: "POST",
// // 					headers: {
// // 						"Content-Type": "application/json",
// // 						Authorization: `Bearer ${session.access_token}`,
// // 					},
// // 					body: JSON.stringify({ user_id: user.id }),
// // 				},
// // 			);

// // 			const result = await response.json();
// // 			if (!response.ok) throw new Error(result.error || "Delete failed");

// // 			setUser(null);
// // 			setSession(null);
// // 			try {
// // 				await AsyncStorage.removeItem("@rememberMe");
// // 			} catch (storageError) {
// // 				console.warn("Failed to clear rememberMe:", storageError);
// // 			}
// // 			Alert.alert("Deleted", "Your account was deleted successfully.");
// // 			router.replace("/(app)/welcome");
// // 		} catch (err: any) {
// // 			console.error("Delete account error:", err.message);
// // 			Alert.alert("Error", err.message || "Failed to delete account.");
// // 		}
// // 	};

// // 	const updateTransactionPin = async (currentPin: string, newPin: string) => {
// // 		if (!user || !session) {
// // 			throw new Error("You must be logged in to update your transaction PIN.");
// // 		}

// // 		try {
// // 			const { data: profileData, error: fetchError } = await supabase
// // 				.from("profiles")
// // 				.select("transaction_pin")
// // 				.eq("id", user.id)
// // 				.single();

// // 			if (fetchError) throw fetchError;

// // 			if (profileData.transaction_pin !== currentPin) {
// // 				throw new Error("Current PIN is incorrect.");
// // 			}

// // 			const { error: updateError } = await supabase
// // 				.from("profiles")
// // 				.update({ transaction_pin: newPin })
// // 				.eq("id", user.id);

// // 			if (updateError) throw updateError;

// // 			setProfile((prev) =>
// // 				prev ? { ...prev, transaction_pin: newPin } : prev,
// // 			);
// // 		} catch (err: any) {
// // 			console.error("Update Transaction PIN Error:", err.message);
// // 			throw new Error(err.message || "Failed to update transaction PIN.");
// // 		}
// // 	};

// // 	useEffect(() => {
// // 		const initializeAuth = async () => {
// // 			setIsLoadingSession(true);
// // 			try {
// // 				const session = await retryGetSession();
// // 				let rememberMe = "false";
// // 				try {
// // 					rememberMe = (await AsyncStorage.getItem("@rememberMe")) || "false";
// // 				} catch (storageError) {
// // 					console.warn("Failed to retrieve rememberMe:", storageError);
// // 				}

// // 				if (session) {
// // 					setSession(session);
// // 					setUser(session.user);
// // 					await requestPushPermissions(session.user.id);
// // 					router.replace("/(app)/(protected)");

// // 					console.log("🔄 Running update check on initializeAuth");
// // 					Promise.all([checkForOTAUpdate(), checkForStoreUpdate()]).catch(
// // 						(err) => console.error("❌ Update check error (init):", err),
// // 					);
// // 				} else if (rememberMe === "true") {
// // 					const { data, error } = await supabase.auth.refreshSession();
// // 					if (error || !data.session) {
// // 						console.warn("Session refresh failed:", error?.message);
// // 						setSession(null);
// // 						setUser(null);
// // 					} else {
// // 						setSession(data.session);
// // 						setUser(data.session.user);
// // 						await requestPushPermissions(data.session.user.id);
// // 						router.replace("/(app)/(protected)");

// // 						console.log("🔄 Running update check on session refresh");
// // 						Promise.all([checkForOTAUpdate(), checkForStoreUpdate()]).catch(
// // 							(err) =>
// // 								console.error("❌ Update check error (auth change):", err),
// // 						);
// // 					}
// // 				}
// // 			} catch (err) {
// // 				console.error("Initialize auth error:", err);
// // 			} finally {
// // 				setIsLoadingSession(false);
// // 				setInitialized(true);
// // 			}
// // 		};

// // 		initializeAuth();

// // 		const {
// // 			data: { subscription },
// // 		} = supabase.auth.onAuthStateChange(async (event, session) => {
// // 			let rememberMe = "false";
// // 			try {
// // 				rememberMe = (await AsyncStorage.getItem("@rememberMe")) || "false";
// // 			} catch (storageError) {
// // 				console.warn(
// // 					"Failed to retrieve rememberMe in auth state change:",
// // 					storageError,
// // 				);
// // 			}

// // 			if (session && (rememberMe === "true" || event === "SIGNED_IN")) {
// // 				setSession(session);
// // 				setUser(session.user);
// // 				await requestPushPermissions(session.user.id);
// // 				router.replace("/(app)/(protected)");

// // 				if (event === "SIGNED_IN") {
// // 					console.log("🔄 Running update check on auth state change");
// // 					Promise.all([checkForOTAUpdate(), checkForStoreUpdate()]).catch(
// // 						(err) => console.error("❌ Update check error:", err),
// // 					);
// // 				}
// // 			} else if (!session) {
// // 				setSession(null);
// // 				setUser(null);
// // 			}
// // 		});

// // 		return () => subscription?.unsubscribe();
// // 	}, []);

// // 	useEffect(() => {
// // 		const fetchProfile = async () => {
// // 			if (!user) return setProfile(null);
// // 			try {
// // 				const { data, error } = await supabase
// // 					.from("profiles")
// // 					.select("*")
// // 					.eq("id", user.id)
// // 					.single();
// // 				if (!error && data) setProfile(data);
// // 			} catch (err) {
// // 				console.warn("Failed to fetch profile:", err);
// // 			}
// // 		};
// // 		fetchProfile();
// // 	}, [user]);

// // 	useEffect(() => {
// // 		if (!initialized || !fontsLoaded || isLoadingSession) return;

// // 		const inProtected = segments[1] === "(protected)";
// // 		const inAuth = segments[1] === "(auth)";
// // 		if (session && !inProtected) {
// // 			router.replace("/(app)/(protected)");
// // 		} else if (!session && !inAuth) {
// // 			router.replace("/(app)/welcome");
// // 		}

// // 		SplashScreen.hideAsync();
// // 	}, [initialized, fontsLoaded, session, isLoadingSession]);

// // 	return (
// // 		<SupabaseContext.Provider
// // 			value={{
// // 				auth: supabase.auth,
// // 				user,
// // 				session,
// // 				profile,
// // 				initialized,
// // 				signUp,
// // 				signInWithPassword,
// // 				signOut,
// // 				deleteOwnAccount,
// // 				updateTransactionPin,
// // 			}}
// // 		>
// // 			<CustomSuccessModal
// // 				visible={showSuccessModal}
// // 				username={newUsername}
// // 				onClose={() => {
// // 					setShowSuccessModal(false);
// // 					setTimeout(() => {
// // 						router.replace("/(app)/(protected)");
// // 					}, 100);
// // 				}}
// // 			/>
// // 			<UpdateModal
// // 				visible={isUpdateModalVisible}
// // 				onClose={handleUpdateModalClose}
// // 				isStoreUpdate={isStoreUpdateRequired}
// // 				apkUrl={latestApkUrl ?? undefined}
// // 			/>
// // 			{children}
// // 		</SupabaseContext.Provider>
// // 	);
// // };

// import { supabase } from "@/config/supabase";
// import { Session, User } from "@supabase/supabase-js";
// import { useFonts } from "expo-font";
// import { router, useSegments, SplashScreen } from "expo-router";
// import { createContext, useContext, useEffect, useState } from "react";
// import { Alert, Platform, Linking } from "react-native";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import CustomSuccessModal from "@/components/CustomSuccessModal";
// import UpdateModal from "@/components/common/UpdateModal";
// import { requestPushPermissions } from "./notifications-utils";
// import * as Updates from "expo-updates";

// SplashScreen.preventAutoHideAsync();

// type UserProfile = {
// 	id: string;
// 	email: string;
// 	username: string;
// 	created_at: string;
// 	transaction_pin?: string;
// };

// type SupabaseContextProps = {
// 	auth: any;
// 	profile: UserProfile | null;
// 	user: User | null;
// 	session: Session | null;
// 	initialized?: boolean;
// 	signUp: (
// 		username: string,
// 		email: string,
// 		password: string,
// 		rememberMe?: boolean,
// 	) => Promise<any>;
// 	signInWithPassword: (
// 		email: string,
// 		password: string,
// 		rememberMe?: boolean,
// 	) => Promise<void>;
// 	signOut: () => Promise<void>;
// 	deleteOwnAccount: () => Promise<void>;
// 	updateTransactionPin: (currentPin: string, newPin: string) => Promise<void>;
// };

// type SupabaseProviderProps = {
// 	children: React.ReactNode;
// };

// export const SupabaseContext = createContext<SupabaseContextProps>({
// 	auth: supabase.auth,
// 	user: null,
// 	profile: null,
// 	session: null,
// 	initialized: false,
// 	signUp: async () => {},
// 	signInWithPassword: async () => {},
// 	signOut: async () => {},
// 	deleteOwnAccount: async () => {},
// 	updateTransactionPin: async () => {},
// });

// export const useSupabase = () => useContext(SupabaseContext);
// export const useAuth = () => useSupabase();

// export const SupabaseProvider = ({ children }: SupabaseProviderProps) => {
// 	const segments = useSegments();
// 	const [user, setUser] = useState<User | null>(null);
// 	const [session, setSession] = useState<Session | null>(null);
// 	const [profile, setProfile] = useState<UserProfile | null>(null);
// 	const [initialized, setInitialized] = useState<boolean>(false);
// 	const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
// 	const [newUsername, setNewUsername] = useState<string>("");
// 	const [isLoadingSession, setIsLoadingSession] = useState<boolean>(true);
// 	const [isUpdateModalVisible, setIsUpdateModalVisible] =
// 		useState<boolean>(false);
// 	const [isStoreUpdateRequired, setIsStoreUpdateRequired] =
// 		useState<boolean>(false);
// 	const [latestApkUrl, setLatestApkUrl] = useState<string | null>(null);
// 	const [navigationHandled, setNavigationHandled] = useState<boolean>(false);

// 	const [fontsLoaded] = useFonts({
// 		"Roboto-Regular": require("../assets/fonts/Roboto-Regular.ttf"),
// 	});

// 	const retryGetSession = async (
// 		retries = 3,
// 		delay = 1000,
// 	): Promise<Session | null> => {
// 		for (let i = 0; i < retries; i++) {
// 			try {
// 				const { data, error } = await supabase.auth.getSession();
// 				if (error) throw error;
// 				return data.session;
// 			} catch (err) {
// 				console.warn(`Session retry ${i + 1} failed:`, err);
// 				if (i < retries - 1)
// 					await new Promise((resolve) => setTimeout(resolve, delay));
// 			}
// 		}
// 		return null;
// 	};

// 	const checkForOTAUpdate = async () => {
// 		console.log("🟡 Starting OTA update check...");
// 		try {
// 			const update = await Updates.checkForUpdateAsync();
// 			console.log("🔍 OTA check result:", update);
// 			if (update.isAvailable) {
// 				console.log("⬇️ OTA update available, fetching...");
// 				await Updates.fetchUpdateAsync();
// 				console.log("✅ OTA update fetched, showing modal");
// 				setIsUpdateModalVisible(true);
// 			} else {
// 				console.log("✅ No OTA update available");
// 			}
// 		} catch (error) {
// 			console.error("❌ OTA update error:", error);
// 		}
// 	};

// 	const checkForStoreUpdate = async () => {
// 		console.log("🟠 Checking for store update...");
// 		try {
// 			const currentVersion = require("../app.json").expo.version;
// 			const { data, error } = await supabase
// 				.from("app_updates")
// 				.select("version, apk_url")
// 				.eq("status", "active")
// 				.order("created_at", { ascending: false })
// 				.limit(1)
// 				.single();

// 			if (error) {
// 				console.error("Supabase fetch error:", error);
// 				return;
// 			}

// 			if (data && data.version !== currentVersion) {
// 				setLatestApkUrl(data.apk_url);
// 				setIsUpdateModalVisible(true);
// 				setIsStoreUpdateRequired(true);
// 			}
// 		} catch (error) {
// 			console.error("Error checking Android version:", error);
// 		}
// 	};

// 	const handleUpdateModalClose = () => {
// 		setIsUpdateModalVisible(false);
// 		if (!isStoreUpdateRequired) {
// 			Updates.reloadAsync().catch((err) =>
// 				console.error("Error reloading app:", err),
// 			);
// 		}
// 	};

// 	// Single navigation handler to prevent conflicts
// 	const handleNavigation = (targetRoute: string) => {
// 		const currentRoute = segments.join("/");
// 		if (currentRoute !== targetRoute && !navigationHandled) {
// 			console.log(`🔄 Navigating from ${currentRoute} to ${targetRoute}`);
// 			setNavigationHandled(true);
// 			router.replace(targetRoute);

// 			// Reset navigation flag after a delay
// 			setTimeout(() => {
// 				setNavigationHandled(false);
// 			}, 1000);
// 		}
// 	};

// 	const signUp = async (
// 		username: string,
// 		email: string,
// 		password: string,
// 		rememberMe: boolean = false,
// 	) => {
// 		try {
// 			const { data, error } = await supabase.auth.signUp({
// 				email: email.trim(),
// 				password,
// 				options: {
// 					data: { username: username.trim() },
// 				},
// 			});

// 			if (error || !data.user) throw error || new Error("Failed to sign up");

// 			const { error: insertError } = await supabase.from("profiles").upsert([
// 				{
// 					id: data.user.id,
// 					username: username.trim(),
// 					email: email.trim(),
// 					created_at: new Date().toISOString(),
// 				},
// 			]);

// 			if (insertError) {
// 				await supabase.auth.admin.deleteUser(data.user.id);
// 				throw new Error("Failed to save user profile.");
// 			}

// 			try {
// 				await AsyncStorage.setItem("@rememberMe", rememberMe.toString());
// 			} catch (storageError) {
// 				console.warn("Failed to store rememberMe:", storageError);
// 			}

// 			setUser(data.user);
// 			setSession(data.session);
// 			setNewUsername(username.trim());
// 			await requestPushPermissions(data.user.id);
// 			setTimeout(() => {
// 				setShowSuccessModal(true);
// 			}, 100);
// 		} catch (err: any) {
// 			console.error("Sign Up Error:", err.message);
// 			Alert.alert("Sign Up Error", err.message || "Unexpected error occurred.");
// 			throw err;
// 		}
// 	};

// 	const signInWithPassword = async (
// 		email: string,
// 		password: string,
// 		rememberMe: boolean = false,
// 	) => {
// 		try {
// 			const { data, error } = await supabase.auth.signInWithPassword({
// 				email,
// 				password,
// 			});

// 			if (error) throw error;
// 			if (!data || !data.user || !data.session) {
// 				throw new Error("Invalid login response from Supabase");
// 			}

// 			try {
// 				await AsyncStorage.setItem("@rememberMe", rememberMe.toString());
// 			} catch (storageError) {
// 				console.warn("Failed to store rememberMe:", storageError);
// 			}

// 			setUser(data.user);
// 			setSession(data.session);
// 			await requestPushPermissions(data.user.id);

// 			// Don't navigate here - let the useEffect handle it
// 			console.log(
// 				"✅ Sign in successful, navigation will be handled by useEffect",
// 			);

// 			// Run update checks in background
// 			console.log("🔄 Running update check after sign-in");
// 			Promise.all([checkForOTAUpdate(), checkForStoreUpdate()]).catch((err) =>
// 				console.error("❌ Update check error:", err),
// 			);
// 		} catch (err: any) {
// 			console.error("Sign In Error:", err.message);
// 			Alert.alert("Sign In Error", err.message || "Failed to sign in.");
// 			throw err;
// 		}
// 	};

// 	const signOut = async () => {
// 		try {
// 			const { error } = await supabase.auth.signOut();
// 			if (error) throw error;
// 			setUser(null);
// 			setSession(null);
// 			try {
// 				await AsyncStorage.removeItem("@rememberMe");
// 			} catch (storageError) {
// 				console.warn("Failed to clear rememberMe:", storageError);
// 			}
// 			handleNavigation("/(app)/welcome");
// 		} catch (err: any) {
// 			console.error("Sign Out Error:", err.message);
// 			Alert.alert("Sign Out Error", err.message || "Failed to sign out.");
// 		}
// 	};

// 	const deleteOwnAccount = async () => {
// 		if (!user || !session) {
// 			Alert.alert("Error", "You must be logged in to delete your account.");
// 			return;
// 		}

// 		try {
// 			const response = await fetch(
// 				`${process.env.EXPO_PUBLIC_SUPABASE_DELETE_ACCOUNT_FUNCTION_URL}`,
// 				{
// 					method: "POST",
// 					headers: {
// 						"Content-Type": "application/json",
// 						Authorization: `Bearer ${session.access_token}`,
// 					},
// 					body: JSON.stringify({ user_id: user.id }),
// 				},
// 			);

// 			const result = await response.json();
// 			if (!response.ok) throw new Error(result.error || "Delete failed");

// 			setUser(null);
// 			setSession(null);
// 			try {
// 				await AsyncStorage.removeItem("@rememberMe");
// 			} catch (storageError) {
// 				console.warn("Failed to clear rememberMe:", storageError);
// 			}
// 			Alert.alert("Deleted", "Your account was deleted successfully.");
// 			handleNavigation("/(app)/welcome");
// 		} catch (err: any) {
// 			console.error("Delete account error:", err.message);
// 			Alert.alert("Error", err.message || "Failed to delete account.");
// 		}
// 	};

// 	const updateTransactionPin = async (currentPin: string, newPin: string) => {
// 		if (!user || !session) {
// 			throw new Error("You must be logged in to update your transaction PIN.");
// 		}

// 		try {
// 			const { data: profileData, error: fetchError } = await supabase
// 				.from("profiles")
// 				.select("transaction_pin")
// 				.eq("id", user.id)
// 				.single();

// 			if (fetchError) throw fetchError;

// 			if (profileData.transaction_pin !== currentPin) {
// 				throw new Error("Current PIN is incorrect.");
// 			}

// 			const { error: updateError } = await supabase
// 				.from("profiles")
// 				.update({ transaction_pin: newPin })
// 				.eq("id", user.id);

// 			if (updateError) throw updateError;

// 			setProfile((prev) =>
// 				prev ? { ...prev, transaction_pin: newPin } : prev,
// 			);
// 		} catch (err: any) {
// 			console.error("Update Transaction PIN Error:", err.message);
// 			throw new Error(err.message || "Failed to update transaction PIN.");
// 		}
// 	};

// 	useEffect(() => {
// 		const initializeAuth = async () => {
// 			setIsLoadingSession(true);
// 			try {
// 				const session = await retryGetSession();
// 				let rememberMe = "false";
// 				try {
// 					rememberMe = (await AsyncStorage.getItem("@rememberMe")) || "false";
// 				} catch (storageError) {
// 					console.warn("Failed to retrieve rememberMe:", storageError);
// 				}

// 				if (session) {
// 					setSession(session);
// 					setUser(session.user);
// 					await requestPushPermissions(session.user.id);

// 					// Only navigate if we're not already in protected area
// 					if (segments[1] !== "(protected)") {
// 						handleNavigation("/(app)/(protected)");
// 					}

// 					console.log("🔄 Running update check on initializeAuth");
// 					Promise.all([checkForOTAUpdate(), checkForStoreUpdate()]).catch(
// 						(err) => console.error("❌ Update check error (init):", err),
// 					);
// 				} else if (rememberMe === "true") {
// 					const { data, error } = await supabase.auth.refreshSession();
// 					if (error || !data.session) {
// 						console.warn("Session refresh failed:", error?.message);
// 						setSession(null);
// 						setUser(null);
// 					} else {
// 						setSession(data.session);
// 						setUser(data.session.user);
// 						await requestPushPermissions(data.session.user.id);

// 						if (segments[1] !== "(protected)") {
// 							handleNavigation("/(app)/(protected)");
// 						}

// 						console.log("🔄 Running update check on session refresh");
// 						Promise.all([checkForOTAUpdate(), checkForStoreUpdate()]).catch(
// 							(err) =>
// 								console.error("❌ Update check error (auth change):", err),
// 						);
// 					}
// 				}
// 			} catch (err) {
// 				console.error("Initialize auth error:", err);
// 			} finally {
// 				setIsLoadingSession(false);
// 				setInitialized(true);
// 			}
// 		};

// 		initializeAuth();

// 		const {
// 			data: { subscription },
// 		} = supabase.auth.onAuthStateChange(async (event, session) => {
// 			let rememberMe = "false";
// 			try {
// 				rememberMe = (await AsyncStorage.getItem("@rememberMe")) || "false";
// 			} catch (storageError) {
// 				console.warn(
// 					"Failed to retrieve rememberMe in auth state change:",
// 					storageError,
// 				);
// 			}

// 			if (session && (rememberMe === "true" || event === "SIGNED_IN")) {
// 				setSession(session);
// 				setUser(session.user);
// 				await requestPushPermissions(session.user.id);

// 				// Only navigate on SIGNED_IN event and if not already in protected area
// 				if (event === "SIGNED_IN" && segments[1] !== "(protected)") {
// 					handleNavigation("/(app)/(protected)");
// 				}

// 				if (event === "SIGNED_IN") {
// 					console.log("🔄 Running update check on auth state change");
// 					Promise.all([checkForOTAUpdate(), checkForStoreUpdate()]).catch(
// 						(err) => console.error("❌ Update check error:", err),
// 					);
// 				}
// 			} else if (!session && event === "SIGNED_OUT") {
// 				setSession(null);
// 				setUser(null);
// 				// Don't navigate on sign out here - let the main useEffect handle it
// 			}
// 		});

// 		return () => subscription?.unsubscribe();
// 	}, []);

// 	// Single source of truth for navigation
// 	useEffect(() => {
// 		if (!initialized || !fontsLoaded || isLoadingSession) return;

// 		const inProtected = segments[1] === "(protected)";
// 		const inAuth = segments[1] === "(auth)";
// 		const inWelcome = segments[0] === "(app)" && segments[1] === "welcome";

// 		if (session && !inProtected) {
// 			handleNavigation("/(app)/(protected)");
// 		} else if (!session && !inAuth && !inWelcome) {
// 			handleNavigation("/(app)/welcome");
// 		}

// 		SplashScreen.hideAsync();
// 	}, [initialized, fontsLoaded, session, isLoadingSession, segments]);

// 	useEffect(() => {
// 		const fetchProfile = async () => {
// 			if (!user) return setProfile(null);
// 			try {
// 				const { data, error } = await supabase
// 					.from("profiles")
// 					.select("*")
// 					.eq("id", user.id)
// 					.single();
// 				if (!error && data) setProfile(data);
// 			} catch (err) {
// 				console.warn("Failed to fetch profile:", err);
// 			}
// 		};
// 		fetchProfile();
// 	}, [user]);

// 	return (
// 		<SupabaseContext.Provider
// 			value={{
// 				auth: supabase.auth,
// 				user,
// 				session,
// 				profile,
// 				initialized,
// 				signUp,
// 				signInWithPassword,
// 				signOut,
// 				deleteOwnAccount,
// 				updateTransactionPin,
// 			}}
// 		>
// 			<CustomSuccessModal
// 				visible={showSuccessModal}
// 				username={newUsername}
// 				onClose={() => {
// 					setShowSuccessModal(false);
// 					setTimeout(() => {
// 						handleNavigation("/(app)/(protected)");
// 					}, 100);
// 				}}
// 			/>
// 			{/* <UpdateModal
// 				visible={isUpdateModalVisible}
// 				onClose={handleUpdateModalClose}
// 				isStoreUpdate={isStoreUpdateRequired}
// 				apkUrl={latestApkUrl ?? undefined}
// 			/> */}
// 			{children}
// 		</SupabaseContext.Provider>
// 	);
// };