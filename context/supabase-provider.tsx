import { supabase } from "@/config/supabase";
import { Session, User } from "@supabase/supabase-js";
import { useFonts } from "expo-font";
import { router, useSegments, SplashScreen } from "expo-router";
import { createContext, useContext, useEffect, useState } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CustomSuccessModal from "@/components/CustomSuccessModal";
import { useNotifications } from "./NotificationsProvider";

SplashScreen.preventAutoHideAsync();

type UserProfile = {
	id: string;
	email: string;
	username: string;
	created_at: string;
	transaction_pin?: string; // Added to support transaction PIN
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
  const { requestPermissions } = useNotifications();

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

  const retryGetSession = async (retries = 3, delay = 1000): Promise<Session | null> => {
    for (let i = 0; i < retries; i++) {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        return data.session;
      } catch (err) {
        console.warn(`Session retry ${i + 1} failed:`, err);
        if (i < retries - 1) await new Promise((resolve) => setTimeout(resolve, delay));
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
			await requestPermissions(); // Request permissions after sign-up
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
      await requestPermissions();
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
			// Fetch the current profile to verify the PIN
			const { data: profileData, error: fetchError } = await supabase
				.from("profiles")
				.select("transaction_pin")
				.eq("id", user.id)
				.single();

			if (fetchError) throw fetchError;

			// Verify current PIN (assuming it's stored as plain text for simplicity; in production, use hashing)
			if (profileData.transaction_pin !== currentPin) {
				throw new Error("Current PIN is incorrect.");
			}

			// Update the transaction PIN
			const { error: updateError } = await supabase
				.from("profiles")
				.update({ transaction_pin: newPin })
				.eq("id", user.id);

			if (updateError) throw updateError;

			// Update local profile state
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
          await requestPermissions();
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
            await requestPermissions();
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
        console.warn("Failed to retrieve rememberMe in auth state change:", storageError);
      }

      if (session && (rememberMe === "true" || event === "SIGNED_IN")) {
        setSession(session);
        setUser(session.user);
        await requestPermissions();
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