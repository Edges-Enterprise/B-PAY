import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  TextInput, 
  Image, 
  StatusBar, 
  TouchableOpacity, 
  ActivityIndicator, 
  Animated, 
  Text, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  StyleSheet
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { Ionicons } from '@expo/vector-icons';

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const errorOpacity = useRef(new Animated.Value(0)).current;
  const router = useRouter();
  const { signUp, user } = useAuth();

  // Create refs for input fields
  const usernameInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

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
    if (!email || !password || !username) {
      showErrorModal('Please enter an email, username, and password');
      return;
    }

    // Basic validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showErrorModal('Please enter a valid email address');
      return;
    }

    if (username.length < 3) {
      showErrorModal('Username must be at least 3 characters');
      return;
    }

    if (password.length < 6) {
      showErrorModal('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const { user: authUser, error } = await signUp(email, username, password);
      
      if (error) {
        showErrorModal(error.message);
        return;
      }

      // Success - redirect to app
      router.replace('/(app)/(protected)');
    } catch (error) {
      showErrorModal(error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const navigateToSignIn = () => {
    router.replace('/(app)/(Auth)/sign-in');
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FE2C55" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: 'black' }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
          <ScrollView
            style={{ flex: 1, paddingHorizontal: 20, paddingTop: StatusBar.currentHeight || 40 }}
            contentContainerStyle={{ 
              flexGrow: 1, 
              justifyContent: keyboardVisible ? 'flex-start' : 'center',
              paddingBottom: keyboardVisible ? 100 : 40 
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {!keyboardVisible && (
              <View style={{ alignItems: 'center', marginBottom: 30 }}>
                <Image
                  source={require('@/assets/images/playstore.jpg')}
                  style={styles.logo}
                />
              </View>
            )}
            
            <View style={{ alignItems: 'center', marginBottom: 30 }}>
              <Text style={styles.title}>Create your account</Text>
            </View>
            
            <View style={styles.inputContainer}>
              <TextInput
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                placeholderTextColor="#9ca3af"
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
                onSubmitEditing={() => usernameInputRef.current?.focus()}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <TextInput
                ref={usernameInputRef}
                placeholder="Username"
                value={username}
                onChangeText={setUsername}
                placeholderTextColor="#9ca3af"
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="username"
                returnKeyType="next"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <View style={{ position: 'relative' }}>
                <TextInput
                  ref={passwordInputRef}
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  placeholderTextColor="#9ca3af"
                  style={styles.input}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password"
                  textContentType="newPassword"
                  returnKeyType="done"
                />
                <TouchableOpacity 
                  onPress={togglePasswordVisibility}
                  style={styles.eyeIcon}
                >
                  <Ionicons 
                    name={showPassword ? 'eye-off' : 'eye'} 
                    size={24} 
                    color="#9ca3af" 
                  />
                </TouchableOpacity>
              </View>
            </View>
            
            <TouchableOpacity 
              style={[styles.signUpButton, loading && { opacity: 0.7 }]}
              onPress={handleSignUp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.signUpButtonText}>Sign Up</Text>
              )}
            </TouchableOpacity>
            
            <View style={styles.signInContainer}>
              <Text style={styles.signInText}>Already have an account? </Text>
              <TouchableOpacity onPress={navigateToSignIn}>
                <Text style={styles.signInLink}>Sign in</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
          
          <Animated.View style={[styles.errorModal, { opacity: errorOpacity }]}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  logo: {
    width: 140,
    height: 140,
    borderRadius: 70,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 15,
  },
  title: {
    color: '#fff', 
    fontSize: 24, 
    fontWeight: 'bold'
  },
  inputContainer: {
    marginBottom: 16,
    position: 'relative'
  },
  input: {
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
    paddingRight: 50,
  },
  eyeIcon: {
    position: 'absolute',
    right: 15,
    top: 15,
    padding: 5
  },
  signUpButton: {
    backgroundColor: '#FE2C55',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 10,
    elevation: 5,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
  },
  signUpButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  signInText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  signInLink: {
    color: '#FE2C55',
    fontSize: 14,
    fontWeight: 'bold',
  },
  errorModal: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    backgroundColor: '#1e1e1e',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 10,
    alignItems: 'center',
  },
  errorText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
});