import { supabase } from "@/config/supabase";
import { Session, User } from "@supabase/supabase-js";
import { useFonts } from "expo-font";
import { router, useSegments, SplashScreen } from "expo-router";
import { createContext, useContext, useEffect, useState } from "react";
import { Alert, Modal, Text, View, Pressable, Animated, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

const CustomSuccessModal = ({
  visible,
  username,
  onClose,
}: {
  visible: boolean;
  username: string;
  onClose: () => void;
}) => {
  const pulseAnim = new Animated.Value(1);
  const buttonPulseAnim = new Animated.Value(1);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(buttonPulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(buttonPulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [pulseAnim, buttonPulseAnim]);

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>{username}</Text>
          <Text style={styles.modalMessage}>
            Welcome to{" "}
            <Animated.Text style={[styles.modalEdgesNetwork, { transform: [{ scale: pulseAnim }] }]}>
              Edges Network
            </Animated.Text>{" "}
            🔥🔥
          </Text>
          <Text style={styles.modalMessageLeft}>
            📌 We break the wedge🪓 by delivering wholesale prices. Making every customer have an edge in the network 💃
          </Text>
          <Text style={styles.modalMessageLeft}></Text>
          <Text style={styles.modalStayOnEdge}> 📢📢 STAY ON THE EDGE </Text>
          <Animated.View style={{ transform: [{ scale: buttonPulseAnim }], alignSelf: 'flex-end' }}>
            <Pressable onPress={onClose} style={styles.skipButton}>
              <Text style={styles.skipButtonText}>Skip</Text>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.8)", // Darker overlay for contrast
  },
  modalContainer: {
    width: 300,
    padding: 20,
    backgroundColor: "#000000", // Fully opaque black background
    borderWidth: 2,
    borderColor: "#8B4513", // Brown border
    borderRadius: 10,
    alignItems: "center",
    opacity: 1, // Fully opaque modal content
  },
  modalTitle: {
    fontSize: 24,
    color: "white",
    fontWeight: "bold",
    marginBottom: 10,
    alignSelf: "center",
  },
  modalMessage: {
    fontSize: 16,
    color: "white",
    textAlign: "center",
    marginBottom: 10,
  },
  modalEdgesNetwork: {
    fontSize: 18,
    color: "#8B4513", // Brown to match border
    fontWeight: "bold",
  },
  modalMessageLeft: {
    fontSize: 16,
    color: "white",
    textAlign: "left",
    marginBottom: 10,
    alignSelf: "flex-start",
  },
  modalStayOnEdge: {
    fontSize: 13,
    color: "white",
    fontWeight: "bold",
    textAlign: "right",
    marginBottom: 20,
    textTransform: "uppercase",
    alignSelf: "flex-end",
  },
  skipButton: {
    paddingVertical: 5,
    paddingHorizontal: 13,
    backgroundColor: "#8B4513", // Brown to match border
    borderRadius: 5,
  },
  skipButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export const SupabaseProvider = ({ children }: SupabaseProviderProps) => {
  const segments = useSegments();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [initialized, setInitialized] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [newUsername, setNewUsername] = useState<string>("");

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

      await AsyncStorage.setItem("@rememberMe", rememberMe.toString());

      setUser(data.user);
      setSession(data.session);
      setNewUsername(username.trim());
      setShowSuccessModal(true);
    } catch (err: any) {
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

      await AsyncStorage.setItem("@rememberMe", rememberMe.toString());

      setUser(data.user);
      setSession(data.session);
      if (rememberMe) {
        router.replace("/(app)/(protected)");
      }
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

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const rememberMe = await AsyncStorage.getItem("@rememberMe");

        if (session && rememberMe === "true") {
          setSession(session);
          setUser(session.user);
          router.replace("/(app)/(protected)");
        }
      } finally {
        setInitialized(true);
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const rememberMe = await AsyncStorage.getItem("@rememberMe");
      if (session && rememberMe === "true") {
        setSession(session);
        setUser(session.user);
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
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (!error && data) setProfile(data);
    };
    fetchProfile();
  }, [user]);

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
      <CustomSuccessModal
        visible={showSuccessModal}
        username={newUsername}
        onClose={() => setShowSuccessModal(false)}
      />
      {children}
    </SupabaseContext.Provider>
  );
};