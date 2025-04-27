import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert, Switch, ScrollView, StatusBar } from 'react-native';
import { useRouter } from "expo-router"; 
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/config/supabase";

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const router = useRouter();

  // Load saved credentials if Remember Me was on
  useEffect(() => {
    const loadSavedCredentials = async () => {
      try {
        const saved = await AsyncStorage.getItem('userCredentials');
        if (saved) {
          const { email, password } = JSON.parse(saved);
          setEmail(email);
          setPassword(password);
          setRememberMe(true);
        }
      } catch (error) {
        console.error('Failed to load saved credentials:', error);
      }
    };

    loadSavedCredentials();
  }, []);

  const handleSignIn = async (inputEmail?: string, inputPassword?: string, fromAutoLogin = false) => {
    try {
      const userEmail = inputEmail || email;
      const userPassword = inputPassword || password;

      const { data, error } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: userPassword,
      });

      if (error) {
        // Check if the error is "Email not confirmed"
        if (error.message.includes('Email not confirmed')) {
          console.warn('Email not confirmed, but proceeding to login...');
          // ⚡ continue to login manually if session exists
          if (data?.session) {
            router.push('/(tabs)');
            return;
          }
        }

        if (!fromAutoLogin) {
          throw error;
        } else {
          console.error('Auto-login error:', error.message);
          return;
        }
      }

      if (rememberMe) {
        await AsyncStorage.setItem('userCredentials', JSON.stringify({ email: userEmail, password: userPassword }));
      } else {
        await AsyncStorage.removeItem('userCredentials');
      }

      router.push('/(tabs)');
    } catch (error) {
      console.error('Sign-in error:', error);
      Alert.alert('Login Error', error.message || 'An error occurred during login.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <ScrollView
        style={{ flex: 1, paddingHorizontal: 20, paddingTop: StatusBar.currentHeight || 40 }}
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          <View style={styles.logoContainer}>
            <Image
              source={require('@/assets/images/playstore.jpg')}
              style={styles.logo}
            />
            <Text style={styles.welcomeText}>Edges Network</Text>
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
              placeholder="Password"
              placeholderTextColor="#aaa"
              secureTextEntry
              autoCapitalize="none"
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <View style={styles.rememberMeContainer}>
            <Switch
              value={rememberMe}
              onValueChange={setRememberMe}
              thumbColor={rememberMe ? '#FE2C55' : '#666'}
              trackColor={{ false: '#444', true: '#ff99aa' }}
            />
            <Text style={styles.rememberMeText}>Remember me</Text>
          </View>

          <TouchableOpacity style={styles.signInButton} onPress={() => handleSignIn()}>
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>

          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(Auth)/sign-up')}>
              <Text style={styles.signupLink}>Sign up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 150,
    height: 150,
    borderRadius: 70,
    marginBottom: 10,
  },
  welcomeText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  inputContainer: {
    width: '100%',
    backgroundColor: '#333',
    borderRadius: 8,
    marginBottom: 20,
  },
  input: {
    height: 50,
    paddingHorizontal: 10,
    color: '#fff',
    fontSize: 16,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  rememberMeText: {
    marginLeft: 10,
    color: '#aaa',
    fontSize: 14,
  },
  signInButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#FE2C55',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  signupContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 30,
  },
  signupText: {
    color: '#aaa',
    fontSize: 14,
  },
  signupLink: {
    color: '#FE2C55',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
