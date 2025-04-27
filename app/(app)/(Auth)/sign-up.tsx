import { View, TextInput, Image, StatusBar, TouchableOpacity, ActivityIndicator, Animated } from "react-native";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native-gesture-handler";
import { useColorScheme } from "@/lib/useColorScheme";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "expo-router"; 
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/config/supabase";

const DefaultColors = {
  light: {
    background: "#ffffff",
    text: "#000000",
    card: "#f5f5f5",
    border: "#e0e0e0",
    buttonText: "#ffffff",
    mutedForeground: "#6b7280",
    primary: "#ff375f",
    link: "#ff375f",
  },
  dark: {
    background: "#000000",
    text: "#ffffff",
    card: "#1e1e1e",
    border: "#333333",
    buttonText: "#ffffff",
    mutedForeground: "#9ca3af",
    primary: "#ff375f",
    link: "#ff375f",
  },
};

let Colors;
try {
  Colors = require("@/constants/colors").default || DefaultColors;
} catch (e) {
  console.warn("Colors import failed, using defaults", e);
  Colors = DefaultColors;
}

export default function SignUpScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const scheme = useColorScheme();
  const colorScheme = scheme === "dark" ? "dark" : "light";
  const activeColors = Colors[colorScheme] || DefaultColors[colorScheme];
  const [selectedFont, setSelectedFont] = useState("System");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const errorOpacity = useRef(new Animated.Value(0)).current;
  const [errorModalY, setErrorModalY] = useState(150); // Default position if not measured
  const emailInputRef = useRef<any>(null);

  const showErrorModal = (message: string) => {
    setErrorMessage(message);
    Animated.timing(errorOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    setTimeout(() => {
      Animated.timing(errorOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, 3000);
  };

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          router.replace("/home");
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error("Error checking session:", error);
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  const handleSignUp = async () => {
    if (!email || !password) {
      showErrorModal("Please enter an email and password.");
      return;
    }
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username: username },
        },
      });
      if (error) {
        console.error(error);
        showErrorModal(error.message);
        return;
      }
      router.replace("/(app)/(protected)");
    } catch (e) {
      console.error('Unexpected error signing up:', e);
      showErrorModal("Unexpected error. Please try again.");
    }
  };

  const navigateToSignIn = () => {
    router.push("/sign-in");
  };

  const measureEmailField = () => {
    if (emailInputRef.current) {
      emailInputRef.current.measure((x, y, width, height, pageX, pageY) => {
        setErrorModalY(pageY + height + 8); // 8px gap under email input
      });
    }
  };

  useEffect(() => {
    setTimeout(measureEmailField, 500); // Measure after layout
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: activeColors.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={activeColors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "black" }}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <ScrollView
        style={{ flex: 1, paddingHorizontal: 20, paddingTop: StatusBar.currentHeight || 40 }}
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ alignItems: "center", marginBottom: 30 }}>
          <Image
            source={require("@/assets/images/playstore.jpg")}
            style={{
              width: 140,
              height: 140,
              borderRadius: 70,
              backgroundColor: activeColors.background,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.7,
              shadowRadius: 8,
              elevation: 15,
            }}
          />
        </View>
        <View style={{ alignItems: "center", marginBottom: 30 }}>
          <Text
            style={{
              fontFamily: selectedFont,
              fontSize: 24,
              fontWeight: "bold",
              color: activeColors.text,
            }}
          >
            Create your account
          </Text>
        </View>
        <View style={{ marginBottom: 16 }}>
          <TextInput
            ref={emailInputRef}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            placeholderTextColor="#9ca3af"
            style={inputStyle}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        <View style={{ marginBottom: 16 }}>
          <TextInput
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
            placeholderTextColor="#9ca3af"
            style={inputStyle}
          />
        </View>
        <View style={{ marginBottom: 16 }}>
          <TextInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor="#9ca3af"
            style={inputStyle}
          />
        </View>
        <Button
          style={{
            backgroundColor: activeColors.primary,
            paddingVertical: 14,
            borderRadius: 10,
            marginTop: 10,
            elevation: 5,
          }}
          onPress={handleSignUp}
        >
          <Text
            style={{
              color: activeColors.buttonText,
              fontFamily: selectedFont,
              fontSize: 16,
              fontWeight: "bold",
              textAlign: "center",
            }}
          >
            Sign Up
          </Text>
        </Button>
        <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 24 }}>
          <Text
            style={{
              color: activeColors.mutedForeground,
              fontFamily: selectedFont,
              fontSize: 14,
            }}
          >
            Already have an account?{" "}
          </Text>
          <TouchableOpacity onPress={navigateToSignIn}>
            <Text
              style={{
                color: activeColors.link,
                fontFamily: selectedFont,
                fontSize: 14,
                fontWeight: "bold",
              }}
            >
              Log in
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      {/* Error modal */}
      <Animated.View style={{
        position: "absolute",
        top: errorModalY,
        left: 20,
        right: 20,
        opacity: errorOpacity,
        backgroundColor: "#1e1e1e",
        padding: 20,
        borderRadius: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.8,
        shadowRadius: 6,
        elevation: 10,
        alignItems: "center",
      }}>
        <Text style={{ color: "white", fontSize: 16, textAlign: "center", fontFamily: selectedFont }}>
          {errorMessage}
        </Text>
      </Animated.View>
    </View>
  );
}

const inputStyle = {
  backgroundColor: "#2c2c2c",
  borderColor: "#000000",
  borderWidth: 2,
  borderRadius: 10,
  paddingHorizontal: 16,
  paddingVertical: 16,
  color: "#ffffff",
  fontSize: 16,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.8,
  shadowRadius: 6,
  elevation: 10,
  fontFamily: "System",
};