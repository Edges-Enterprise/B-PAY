import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  Image,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Text,
  Animated,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { ScrollView } from "react-native-gesture-handler";
import { useColorScheme } from "@/lib/useColorScheme";
import { useAuth } from '@/providers/AuthProvider';

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const { signUp } = useAuth();
  const colorScheme = useColorScheme();

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const isFormValid = email.trim() !== '' && username.trim() !== '' && password.trim() !== '';

  const handleSignUp = async () => {
    if (!isFormValid) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const result = await signUp(email, password, { username });

      const { user, error } = result;

      if (error) {
        if (error.message.includes('already registered')) {
          Alert.alert('Error', 'This email is already registered.');
          return;
        }
        throw new Error(error.message);
      }

      if (!user) {
        console.warn('No user returned from signUp, but no error provided');
        throw new Error('Sign up failed: No user data received.');
      }

      Alert.alert('Success', 'Account created successfully! You can verify your email later.');
      router.replace('/(app)/(protected)'); // Navigate to app
    } catch (error) {
      console.error('SignUp error:', error);
      Alert.alert('Sign Up Error', error.message || 'An unexpected error occurred during sign up.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <ScrollView
        style={{
          flex: 1,
          paddingHorizontal: 20,
          paddingTop: StatusBar.currentHeight || 40,
        }}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          paddingBottom: 40,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
          <View style={styles.logoContainer}>
            <Image source={require("@/assets/images/playstore.jpg")} style={styles.logo} />
            <Text style={styles.welcomeText}>Create Account</Text>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#aaa"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor="#aaa"
              autoCapitalize="none"
              value={username}
              onChangeText={setUsername}
            />
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#aaa"
              secureTextEntry
              autoCapitalize="none"
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.signUpButton,
              !isFormValid ? styles.disabledButton : styles.activeButton
            ]}
            onPress={handleSignUp}
            disabled={loading || !isFormValid}
          >
            {loading ? (
              <ActivityIndicator color="#D4AF37" />
            ) : (
              <Text style={[
                styles.signUpButtonText,
                isFormValid && styles.activeButtonText
              ]}>
                Sign Up
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push("/sign-in")}>
              <Text style={styles.signupLink}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  logo: {
    width: 150,
    height: 150,
    borderRadius: 70,
    marginBottom: 10,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  inputContainer: {
    width: "100%",
    backgroundColor: "#222",
    borderRadius: 8,
    marginBottom: 20,
  },
  input: {
    height: 50,
    paddingHorizontal: 10,
    fontSize: 16,
    color: "#fff",
  },
  signUpButton: {
    width: "100%",
    height: 50,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 2,
  },
  disabledButton: {
    backgroundColor: "#333",
    borderColor: "transparent",
  },
  activeButton: {
    backgroundColor: "transparent",
    borderColor: "#D4AF37",
  },
  signUpButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  activeButtonText: {
    color: "white",
  },
  signupContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 30,
  },
  signupText: {
    color: "#aaa",
    fontSize: 14,
  },
  signupLink: {
    color: "#D7A77F",
    fontSize: 14,
    fontWeight: "bold",
  },
});
