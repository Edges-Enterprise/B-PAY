// app/auth/login.tsx
import "react-native-gesture-handler";
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Vibration,
  Modal,
  Pressable,
  Image,
  FlatList,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width, height } = Dimensions.get("window");

// ──────── DUMMY DATA ────────
const DUMMY_OTP = "123456";
const AUTH_TOKEN_KEY = "authToken";
const CURRENT_USER_KEY = "currentUser";
const SAVED_ACCOUNTS_KEY = "savedLogins";
const BIOMETRIC_ENABLED_KEY = "biometricEnabled";

// ──────── COUNTRY DATA ────────
const COUNTRIES = [
  { code: "NG", flag: "NG", label: "Nigeria", dial: "+234" },
  { code: "GH", flag: "GH", label: "Ghana", dial: "+233" },
  { code: "UK", flag: "UK", label: "United Kingdom", dial: "+44" },
  { code: "US", flag: "US", label: "United States", dial: "+1" },
  { code: "CA", flag: "CA", label: "Canada", dial: "+1" },
  { code: "IN", flag: "IN", label: "India", dial: "+91" },
  { code: "AU", flag: "AU", label: "Australia", dial: "+61" },
  { code: "FR", flag: "FR", label: "France", dial: "+33" },
  { code: "DE", flag: "DE", label: "Germany", dial: "+49" },
  { code: "JP", flag: "JP", label: "Japan", dial: "+81" },
];

// ──────── DUMMY FUNCTIONS ────────
const fakeDelay = (min = 300, max = 1500) => 
  new Promise(r => setTimeout(r, Math.random() * (max - min) + min));

const sendOTPDummy = async (identifier: string) => {
  await fakeDelay();
  console.log(`[DUMMY] OTP sent to: ${identifier}`);
  return { success: true };
};

const verifyOTPDummy = async (code: string) => {
  await fakeDelay();
  console.log(`[DUMMY] Verifying OTP: ${code}`);
  if (code === DUMMY_OTP) {
    return {
      success: true,
      token: `dummy_token_${Date.now()}`,
      user: { id: 1, name: "Test User", email: "test@example.com" }
    };
  } else {
    return {
      success: false,
      error: "Invalid OTP. Try 123456"
    };
  }
};

// Validation
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPhone = (phone: string) => phone.replace(/\D/g, '').length >= 7;

// Phone formatting
const formatPhoneNumber = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
};

// Mask identifier
const maskIdentifier = (id: string) => {
  if (id.includes('@')) {
    const [local, domain] = id.split('@');
    return `${local[0]}***@${domain}`;
  } else {
    const digits = id.replace(/\D/g, '');
    if (digits.length < 6) return id;
    return `${id.slice(0, 4)}*****${id.slice(-3)}`;
  }
};

// ──────── MAIN COMPONENT ────────
export default function LoginScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<'email' | 'phone'>('email');
  const [identifier, setIdentifier] = useState('');
  const [displayPhone, setDisplayPhone] = useState('');
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [otpModal, setOtpModal] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(60);
  const [currentIdentifier, setCurrentIdentifier] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [biometricModal, setBiometricModal] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  // Refs
  const emailInputRef = useRef<TextInput>(null);
  const phoneInputRef = useRef<TextInput>(null);
  const otpRefs = useRef<Array<TextInput | null>>([]);

  // ──────── PULSE ANIMATION FOR PNG WATERMARK ────────
  const pulseScale = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.08)).current;
  useEffect(() => {
    const pulse = Animated.sequence([
      Animated.timing(pulseScale, { toValue: 1.15, duration: 1600, useNativeDriver: true }),
      Animated.timing(pulseScale, { toValue: 1, duration: 1600, useNativeDriver: true }),
    ]);
    const opacity = Animated.sequence([
      Animated.timing(pulseOpacity, { toValue: 0.12, duration: 1600, useNativeDriver: true }),
      Animated.timing(pulseOpacity, { toValue: 0.08, duration: 1600, useNativeDriver: true }),
    ]);
    Animated.loop(Animated.parallel([pulse, opacity])).start();
  }, []);

  // ──────── INIT ────────
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(SAVED_ACCOUNTS_KEY);
        const accounts = saved ? JSON.parse(saved) : [];
        setSavedAccounts(accounts);

        const bio = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
        setBiometricEnabled(bio === 'true');
      } catch (error) {
        console.log('[DUMMY] Error loading data:', error);
      }
    })();
  }, []);

  const sheetY = useRef(new Animated.Value(1000)).current;
  const openSheet = () => {
    setOtpModal(true);
    setOtp(['', '', '', '', '', '']);
    setTimeout(() => otpRefs.current[0]?.focus(), 300);
    Animated.spring(sheetY, { toValue: 0, friction: 8, useNativeDriver: true }).start();
  };
  const closeSheet = () => {
    Animated.spring(sheetY, { toValue: 1000, friction: 8, useNativeDriver: true }).start(() => {
      setOtpModal(false);
      setOtp(['', '', '', '', '', '']);
      setResendTimer(60);
    });
  };

  useEffect(() => {
    if (toast) setTimeout(() => setToast(null), 3000);
  }, [toast]);

  useEffect(() => {
    if (resendTimer > 0 && otpModal) {
      const id = setTimeout(() => setResendTimer(t => t - 1), 1000);
      return () => clearTimeout(id);
    }
  }, [resendTimer, otpModal]);

  useEffect(() => {
    const otpString = otp.join('');
    if (otpString.length === 6) {
      handleVerify();
    }
  }, [otp]);

  const saveAccount = async (id: string) => {
    try {
      const updated = [...new Set([id, ...savedAccounts])].slice(0, 5);
      await AsyncStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(updated));
      setSavedAccounts(updated);
    } catch (error) {
      console.log('[DUMMY] Error saving account:', error);
    }
  };

  // Auto-detect country from phone prefix
  useEffect(() => {
    if (mode === 'phone' && identifier) {
      const digits = identifier.replace(/\D/g, '');
      const withPlus = digits.startsWith('44') ? '+44' : digits.startsWith('1') ? '+1' : digits.startsWith('234') ? '+234' : null;
      if (withPlus) {
        const matched = COUNTRIES.find(c => c.dial === withPlus);
        if (matched) setCountry(matched);
      }
    }
  }, [identifier, mode]);

  const handleContinue = async () => {
    const fullId = mode === 'phone' ? `${country.dial}${identifier.replace(/\D/g, '')}` : identifier;

    if (!fullId.trim()) {
      showToast("Enter email or phone", "error");
      return;
    }
    if (mode === 'email' && !isValidEmail(fullId)) {
      showToast("Please enter a valid email address", "error");
      return;
    }
    if (mode === 'phone' && !isValidPhone(identifier)) {
      showToast("Please enter a valid phone number", "error");
      return;
    }

    Vibration.vibrate(50);
    setLoading(true);
    const { success } = await sendOTPDummy(fullId);
    setLoading(false);

    if (success) {
      setCurrentIdentifier(fullId);
      await saveAccount(fullId);
      showToast(`Code sent to ${maskIdentifier(fullId)} (Use: 123456)`, "success");
      openSheet();
    } else {
      showToast("Failed to send code", "error");
    }
  };

  const handleVerify = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) return;

    Vibration.vibrate(50);
    setLoading(true);
    const { success, token, error } = await verifyOTPDummy(otpString);
    setLoading(false);

    if (success && token) {
      try {
        await AsyncStorage.multiSet([
          [AUTH_TOKEN_KEY, token],
          [CURRENT_USER_KEY, currentIdentifier],
        ]);
        showToast("Login successful! Redirecting...", "success");
        closeSheet();
        setTimeout(() => router.replace("/"), 800);
      } catch (storageError) {
        showToast("Login failed - storage error", "error");
      }
    } else {
      showToast(error || "Invalid code. Try 123456", "error");
      Vibration.vibrate([0, 100, 50, 100]);
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;

    setResendTimer(60);
    setOtp(['', '', '', '', '', '']);
    setTimeout(() => otpRefs.current[0]?.focus(), 300);

    const { success } = await sendOTPDummy(currentIdentifier);
    if (success) {
      showToast(`Code resent to ${maskIdentifier(currentIdentifier)}`, "success");
    } else {
      showToast("Failed to resend code", "error");
    }
  };

  const handleOtpChange = (text: string, index: number) => {
    if (text.length > 1) {
      const pastedOtp = text.slice(0, 6).split('');
      const newOtp = [...otp];
      pastedOtp.forEach((char, i) => {
        if (index + i < 6) newOtp[index + i] = char;
      });
      setOtp(newOtp);
      const lastIndex = Math.min(index + pastedOtp.length, 5);
      otpRefs.current[lastIndex]?.focus();
      return;
    }
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    if (text && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
  };

  const handleAccountSelect = (account: string) => {
    if (account.includes('@')) {
      setIdentifier(account);
      setMode('email');
    } else {
      const countryMatch = COUNTRIES.find(c => account.startsWith(c.dial));
      if (countryMatch) {
        setCountry(countryMatch);
        setIdentifier(account.replace(countryMatch.dial, ''));
        setDisplayPhone(formatPhoneNumber(account.replace(countryMatch.dial, '')));
        setMode('phone');
      }
    }
    setShowAccountPicker(false);
  };

  const focusInput = () => {
    if (mode === 'email') emailInputRef.current?.focus();
    else phoneInputRef.current?.focus();
  };

  const handleBiometricSetup = async () => {
    setLoading(true);
    await fakeDelay(800, 1200);
    setLoading(false);
    await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
    setBiometricEnabled(true);
    setBiometricModal(false);
    showToast("Biometric login enabled", "success");
  };

  const filteredCountries = COUNTRIES.filter(c =>
    c.label.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.dial.includes(countrySearch)
  );

  // ──────── RENDER ────────
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        {/* TOP BAR WITH SWITCH ACCOUNT */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.accountSwitcher}
            onPress={() => setShowAccountPicker(true)}
          >
            <Text style={styles.accountSwitcherText}>Switch Account</Text>
            <Ionicons name="chevron-down" size={20} color="#FFD700" />
          </TouchableOpacity>
        </View>

        {/* PNG WATERMARK WITH PULSE */}
        <Animated.View
          style={[
            styles.pngWatermarkContainer,
            { opacity: pulseOpacity, transform: [{ scale: pulseScale }] },
          ]}
          pointerEvents="none"
        >
          <Image
            source={require("../../assets/icons/home.png")}
            style={styles.pngWatermark}
            resizeMode="contain"
          />
        </Animated.View>

        {/* MAIN CONTENT */}
        <View style={styles.contentWrapper}>
          <View style={styles.header}>
            <Text style={styles.title}>Welcome to B-Pay</Text>
          </View>

          {/* FINGERPRINT ICON */}
          <TouchableOpacity
            style={styles.fingerprintContainer}
            onPress={() => !biometricEnabled && setBiometricModal(true)}
          >
            <FontAwesome name="500px" size={60} color="#FFD700" />
          </TouchableOpacity>

          {/* INPUT FIELD WITH BONUS TAG ON EDGE */}
          <View style={styles.inputSection}>
            <View style={styles.inputWrapper}>
              {/* COUNTRY PICKER - ALWAYS VISIBLE */}
              <TouchableOpacity
                style={styles.countryPicker}
                onPress={() => setShowCountryPicker(true)}
              >
                <Text style={styles.flag}>{country.flag}</Text>
                {mode === 'phone' && <Text style={styles.countryCode}>{country.dial}</Text>}
                <Ionicons name="chevron-down" size={16} color="#aaa" />
              </TouchableOpacity>

              <View style={styles.inputContainer}>
                {isInputFocused || identifier ? (
                  <Text style={styles.floatingLabel}>
                    {mode === 'email' ? 'Email address' : 'Phone number'}
                  </Text>
                ) : null}
                <TextInput
                  ref={mode === 'email' ? emailInputRef : phoneInputRef}
                  style={styles.input}
                  placeholder={mode === 'email' ? "Enter email address" : "Enter phone number"}
                  placeholderTextColor="#666"
                  keyboardType={mode === 'email' ? "email-address" : "phone-pad"}
                  autoCapitalize="none"
                  value={mode === 'phone' ? displayPhone : identifier}
                  onChangeText={(text) => {
                    if (mode === 'phone') {
                      const digits = text.replace(/\D/g, '');
                      setIdentifier(digits);
                      setDisplayPhone(formatPhoneNumber(digits));
                    } else {
                      setIdentifier(text);
                    }
                  }}
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => setIsInputFocused(false)}
                  autoFocus={false}
                />
              </View>

              {/* BONUS TAG ON EDGE */}
              <View style={styles.bonusTagEdge}>
                <Text style={styles.bonusTagText}>+30%</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.toggleTextBtn}
              onPress={() => {
                const newMode = mode === 'email' ? 'phone' : 'email';
                setMode(newMode);
                setIdentifier('');
                setDisplayPhone('');
                setTimeout(() => {
                  if (newMode === 'email') emailInputRef.current?.focus();
                  else phoneInputRef.current?.focus();
                }, 100);
              }}
            >
              <Text style={styles.toggleText}>
                Login with {mode === 'email' ? 'phone' : 'email'} instead
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, (loading || !identifier.trim()) && styles.loginBtnDisabled]}
            onPress={handleContinue}
            disabled={loading || !identifier.trim()}
          >
            <Text style={styles.loginText}>
              {loading ? "Sending..." : "Login"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.hintText}>
            New here? We'll send you a code.{'\n'}
            <Text style={{ color: '#FFD700', fontWeight: 'bold' }}>Use OTP: 123456</Text>
          </Text>
        </View>

        {/* TOAST */}
        {toast && (
          <Animated.View style={[styles.toast, toast.type === 'success' ? styles.toastSuccess : styles.toastError]}>
            <Text style={styles.toastText}>{toast.msg}</Text>
          </Animated.View>
        )}

        {/* COUNTRY PICKER WITH SEARCH */}
        <Modal transparent visible={showCountryPicker} onRequestClose={() => setShowCountryPicker(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowCountryPicker(false)}>
            <View style={styles.pickerSheet}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search country..."
                placeholderTextColor="#666"
                value={countrySearch}
                onChangeText={setCountrySearch}
                autoFocus
              />
              <FlatList
                data={filteredCountries}
                keyExtractor={item => item.code}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.countryItem, country.code === item.code && styles.selectedCountryItem]}
                    onPress={() => {
                      setCountry(item);
                      setShowCountryPicker(false);
                      setCountrySearch('');
                    }}
                  >
                    <Text style={styles.flag}>{item.flag}</Text>
                    <Text style={styles.countryLabel}>{item.label}</Text>
                    <Text style={styles.dialCode}>{item.dial}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </Pressable>
        </Modal>

        {/* ACCOUNT PICKER */}
        <Modal transparent visible={showAccountPicker} onRequestClose={() => setShowAccountPicker(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowAccountPicker(false)}>
            <View style={styles.pickerSheet}>
              <Text style={styles.pickerTitle}>Saved Accounts</Text>
              {savedAccounts.length > 0 ? (
                <FlatList
                  data={savedAccounts}
                  keyExtractor={(item, index) => index.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.accountItem} onPress={() => handleAccountSelect(item)}>
                      <Ionicons name="person" size={20} color="#FFD700" />
                      <Text style={styles.accountItemText}>{maskIdentifier(item)}</Text>
                    </TouchableOpacity>
                  )}
                />
              ) : (
                <Text style={styles.noAccountsText}>No saved accounts</Text>
              )}
              <TouchableOpacity
                style={styles.addAccountItem}
                onPress={() => {
                  setShowAccountPicker(false);
                  setIdentifier('');
                  setMode('email');
                  setTimeout(() => emailInputRef.current?.focus(), 100);
                }}
              >
                <Ionicons name="add" size={20} color="#FFD700" />
                <Text style={styles.accountItemText}>Add New Account</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>

        {/* OTP SHEET */}
        <Modal transparent visible={otpModal} onRequestClose={closeSheet}>
          <Pressable style={styles.modalOverlay} onPress={closeSheet}>
            <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetY }] }]}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>Enter 6-digit code</Text>
              <Text style={styles.sheetSubtitle}>
                {mode === 'email'
                  ? `Check your email: ${maskIdentifier(currentIdentifier)}`
                  : `Check your SMS: ${maskIdentifier(currentIdentifier)}`}
              </Text>
              <Text style={styles.sheetInfo}>
                Auto-verify enabled{'\n'}
                <Text style={{ color: '#FFD700', fontWeight: 'bold' }}>Use: 123456</Text>
              </Text>
              <View style={styles.otpRow}>
                {[0,1,2,3,4,5].map(i => (
                  <TextInput
                    key={i}
                    ref={ref => otpRefs.current[i] = ref}
                    style={[styles.otpBox, otp[i] && styles.otpBoxFilled]}
                    keyboardType="number-pad"
                    maxLength={1}
                    value={otp[i]}
                    onChangeText={(text) => handleOtpChange(text, i)}
                    onKeyPress={(e) => handleOtpKeyPress(e, i)}
                  />
                ))}
              </View>
              <TouchableOpacity
                style={styles.resendBtn}
                disabled={resendTimer > 0}
                onPress={handleResendOTP}
              >
                <Text style={[styles.resendText, resendTimer > 0 && { color: '#666' }]}>
                  Resend {resendTimer > 0 ? `in ${resendTimer}s` : 'now'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.verifyBtn, (otp.join('').length !== 6 || loading) && styles.verifyBtnDisabled]}
                onPress={handleVerify}
                disabled={otp.join('').length !== 6 || loading}
              >
                <Text style={styles.verifyText}>
                  {loading ? "Verifying..." : "Verify"}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </Pressable>
        </Modal>

        {/* BIOMETRIC SETUP MODAL */}
        <Modal transparent visible={biometricModal} onRequestClose={() => setBiometricModal(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setBiometricModal(false)}>
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>Enable Biometric Login</Text>
              <Text style={styles.sheetSubtitle}>Use fingerprint or face ID</Text>
              <TouchableOpacity
                style={styles.verifyBtn}
                onPress={handleBiometricSetup}
                disabled={loading}
              >
                <Text style={styles.verifyText}>
                  {loading ? "Setting up..." : "Enable"}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ──────── STYLES ────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center"
  },
  topBar: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  accountSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: 8,
  },
  accountSwitcherText: {
    color: '#FFD700',
    fontSize: 14,
    marginRight: 8,
  },
  pngWatermarkContainer: {
    position: "absolute",
    top: height / 2 - 150,
    left: width / 2 - 150,
    width: 300,
    height: 300,
    zIndex: 1,
  },
  pngWatermark: {
    width: "100%",
    height: "100%",
  },
  contentWrapper: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
    marginTop: -60,
    zIndex: 2,
  },
  fingerprintContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20
  },
  title: {
    color: "#FFD700",
    fontSize: 28,
    fontWeight: "700",
  },
  inputSection: {
    marginBottom: 20,
    position: 'relative',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    height: 66,
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 4,
    backgroundColor: 'transparent',
  },
  inputContainer: {
    flex: 1,
    position: 'relative',
    marginLeft: 12,
  },
  floatingLabel: {
    position: 'absolute',
    top: 8,
    left: 12,
    fontSize: 12,
    color: '#FFD700',
    backgroundColor: 'transparent',
    paddingHorizontal: 4,
    zIndex: 1,
  },
  countryPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    minWidth: 80,
  },
  flag: {
    fontSize: 20,
    marginRight: 4
  },
  countryCode: {
    color: '#aaa',
    fontSize: 14,
    marginRight: 4
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingLeft: 12,
    paddingTop: 20,
    paddingBottom: 8,
    height: 56,
    backgroundColor: 'transparent',
  },
  bonusTagEdge: {
    position: 'absolute',
    top: -12,
    right: 12,
    backgroundColor: '#8B4513',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    transform: [{ rotate: '-10deg' }],
  },
  bonusTagText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  toggleTextBtn: {
    alignItems: 'center',
    marginTop: 12
  },
  toggleText: {
    color: '#00BFFF',
    fontSize: 14
  },
  loginBtn: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FFD700',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  loginBtnDisabled: {
    opacity: 0.5
  },
  loginText: {
    color: '#FFD700',
    fontWeight: 'bold',
    fontSize: 16
  },
  hintText: {
    color: '#666',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
  toast: {
    position: 'absolute',
    bottom: 100,
    left: 32,
    right: 32,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    zIndex: 1000,
  },
  toastSuccess: {
    backgroundColor: '#00FF7F'
  },
  toastError: {
    backgroundColor: '#FF4444'
  },
  toastText: {
    color: '#fff',
    fontWeight: '600'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end'
  },
  pickerSheet: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: 500,
    padding: 20,
  },
  searchInput: {
    backgroundColor: '#000',
    color: '#fff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  pickerTitle: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  selectedCountryItem: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  addAccountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#333',
    marginTop: 10,
  },
  accountItemText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 10,
  },
  noAccountsText: {
    color: '#666',
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: 14,
  },
  countryLabel: {
    color: '#fff',
    flex: 1,
    marginLeft: 12
  },
  dialCode: {
    color: '#aaa'
  },
  sheet: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40
  },
  sheetHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#444',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20
  },
  sheetTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  sheetSubtitle: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 20,
  },
  sheetInfo: {
    color: '#FFD700',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 16,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30
  },
  otpBox: {
    backgroundColor: 'transparent',
    width: 48,
    height: 56,
    borderRadius: 12,
    textAlign: 'center',
    color: '#fff',
    fontSize: 20,
    borderWidth: 1,
    borderColor: '#333'
  },
  otpBoxFilled: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  resendBtn: {
    alignItems: 'center',
    marginBottom: 20
  },
  resendText: {
    color: '#00BFFF',
    fontSize: 14
  },
  verifyBtn: {
    backgroundColor: '#FFD700',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  verifyBtnDisabled: {
    opacity: 0.5,
  },
  verifyText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16
  },
});