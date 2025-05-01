// @/app/(auth)/sign-up.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, Image, StatusBar, TouchableOpacity, ActivityIndicator, Animated, Text, Alert } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const errorOpacity = useRef(new Animated.Value(0)).current;
  const router = useRouter();
  const { signUp, user } = useAuth();

  useEffect(() => {
    if (user) {
      router.replace('/(app)/(protected)');
    }
  }, [user]);

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

  const handleSignUp = async () => {
    if (!email || !password) {
      showErrorModal('Please enter an email and password');
      return;
    }

    setLoading(true);
    try {
      const { user, error } = await signUp(email, password, { username });

      if (error) {
        showErrorModal(error.message);
        return;
      }

      Alert.alert(
        'Confirm Your Email',
        'We sent a confirmation email. Please check your inbox.',
        [{ text: 'OK', onPress: () => router.replace('/(app)/(Auth)/sign-in') }]
      );
    } catch (error) {
      showErrorModal(error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const navigateToSignIn = () => {
    router.replace('/(app)/(Auth)/sign-in');
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FE2C55" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <ScrollView
        style={{ flex: 1, paddingHorizontal: 20, paddingTop: StatusBar.currentHeight || 40 }}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ alignItems: 'center', marginBottom: 30 }}>
          <Image
            source={require('@/assets/images/playstore.jpg')}
            style={{
              width: 140,
              height: 140,
              borderRadius: 70,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.7,
              shadowRadius: 8,
              elevation: 15,
            }}
          />
        </View>
        <View style={{ alignItems: 'center', marginBottom: 30 }}>
          <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>
            Create your account
          </Text>
        </View>
        <View style={{ marginBottom: 16 }}>
          <TextInput
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
            autoCapitalize="none"
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
        <TouchableOpacity 
          style={signUpButtonStyle}
          onPress={handleSignUp}
          disabled={loading}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', textAlign: 'center' }}>
            {loading ? 'Creating Account...' : 'Sign Up'}
          </Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24 }}>
          <Text style={{ color: '#9ca3af', fontSize: 14 }}>
            Already have an account?{' '}
          </Text>
          <TouchableOpacity onPress={navigateToSignIn}>
            <Text style={{ color: '#FE2C55', fontSize: 14, fontWeight: 'bold' }}>
              Log in
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      <Animated.View style={{
        position: 'absolute',
        bottom: 50,
        left: 20,
        right: 20,
        opacity: errorOpacity,
        backgroundColor: '#1e1e1e',
        padding: 20,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.8,
        shadowRadius: 6,
        elevation: 10,
        alignItems: 'center',
      }}>
        <Text style={{ color: 'white', fontSize: 16, textAlign: 'center' }}>
          {errorMessage}
        </Text>
      </Animated.View>
    </View>
  );
}

const inputStyle = {
  backgroundColor: '#2c2c2c',
  borderColor: '#000000',
  borderWidth: 2,
  borderRadius: 10,
  paddingHorizontal: 16,
  paddingVertical: 16,
  color: '#ffffff',
  fontSize: 16,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.8,
  shadowRadius: 6,
  elevation: 10,
};

const signUpButtonStyle = {
  backgroundColor: '#FE2C55',
  paddingVertical: 14,
  borderRadius: 10,
  marginTop: 10,
  elevation: 5,
};