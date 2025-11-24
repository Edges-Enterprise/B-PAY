// app/(app)/(Auth)/welcome-back.tsx
import "react-native-gesture-handler";
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Image,
  Animated,
  Alert,
  Dimensions,
  Pressable,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "@/stores/auth-store";

const { width, height } = Dimensions.get("window");

// ──────── ACCOUNT SWITCH DROPDOWN COMPONENT ────────
const AccountSwitchDropdown = ({ 
  visible, 
  onClose, 
  accounts,
  currentAccount,
  onSwitchAccount,
  onAddAccount,
  onRemoveAccount
}: {
  visible: boolean;
  onClose: () => void;
  accounts: any[];
  currentAccount: any;
  onSwitchAccount: (account: any) => void;
  onAddAccount: () => void;
  onRemoveAccount: (identifier: string) => void;
}) => {
  const slideAnim = useRef(new Animated.Value(-10)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -10,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // Safe maskIdentifier function
  const maskIdentifier = (id: string | undefined | null): string => {
    if (!id) return 'Unknown Account';
    if (id.includes('@')) {
      const [local, domain] = id.split('@');
      return `${local[0]}***@${domain}`;
    } else {
      const digits = id.replace(/\D/g, '');
      if (digits.length < 6) return id;
      return `${id.slice(0, 4)}*****${id.slice(-3)}`;
    }
  };

  if (!visible) return null;

  const renderAccountItem = ({ item }: { item: any }) => {
    if (!item || !item.identifier) return null;

    return (
      <TouchableOpacity
        style={[
          dropdownStyles.accountItem,
          currentAccount?.identifier === item.identifier && dropdownStyles.accountItemActive
        ]}
        onPress={() => onSwitchAccount(item)}
      >
        <View style={dropdownStyles.accountContent}>
          {/* Account Icon */}
          <View style={dropdownStyles.accountIcon}>
            <FontAwesome 
              name={item.identifier.includes('@') ? "envelope" : "phone"} 
              size={16} 
              color="#FFD700" 
            />
          </View>
          
          {/* Account Info */}
          <View style={dropdownStyles.accountInfo}>
            <Text style={dropdownStyles.accountIdentifier}>
              {maskIdentifier(item.identifier)}
            </Text>
            {currentAccount?.identifier === item.identifier && (
              <Text style={dropdownStyles.currentLabel}>Current</Text>
            )}
          </View>
          
          {/* Remove Button */}
          {accounts.length > 1 && currentAccount?.identifier !== item.identifier && (
            <TouchableOpacity
              style={dropdownStyles.removeButton}
              onPress={() => onRemoveAccount(item.identifier)}
            >
              <FontAwesome name="times" size={14} color="#FF6B6B" />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      {/* Backdrop */}
      <Pressable style={dropdownStyles.backdrop} onPress={onClose} />
      
      {/* Dropdown Container */}
      <Animated.View 
        style={[
          dropdownStyles.container,
          {
            transform: [{ translateY: slideAnim }],
            opacity: fadeAnim
          }
        ]}
      >
        {/* Dropdown Arrow */}
        <View style={dropdownStyles.arrow} />
        
        {/* Header */}
        <View style={dropdownStyles.header}>
          <Text style={dropdownStyles.title}>Switch Account</Text>
          <Text style={dropdownStyles.subtitle}>
            {accounts.length} account{accounts.length !== 1 ? 's' : ''} available
          </Text>
        </View>

        {/* Accounts List */}
        <FlatList
          data={accounts.filter(acc => acc && acc.identifier)}
          keyExtractor={(item) => item.identifier || `fallback-${Math.random()}`}
          style={dropdownStyles.list}
          showsVerticalScrollIndicator={false}
          renderItem={renderAccountItem}
        />

        {/* Add Account Button */}
        {accounts.length < 3 && (
          <TouchableOpacity
            style={dropdownStyles.addButton}
            onPress={onAddAccount}
          >
            <View style={dropdownStyles.addButtonContent}>
              <FontAwesome name="plus-circle" size={16} color="#FFD700" />
              <Text style={dropdownStyles.addButtonText}>Add New Account</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Close Button */}
        <TouchableOpacity
          style={dropdownStyles.closeButton}
          onPress={onClose}
        >
          <Text style={dropdownStyles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </Animated.View>
    </>
  );
};

const dropdownStyles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 998,
  },
  container: {
    position: 'absolute',
    top: 70,
    right: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    width: width * 0.85,
    maxWidth: 320,
    maxHeight: height * 0.6,
    borderWidth: 1,
    borderColor: '#FFD700',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 999,
  },
  arrow: {
    position: 'absolute',
    top: -8,
    right: 20,
    width: 16,
    height: 16,
    backgroundColor: '#1a1a1a',
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderColor: '#FFD700',
    transform: [{ rotate: '45deg' }],
  },
  header: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  subtitle: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.7,
  },
  list: {
    marginBottom: 12,
    maxHeight: 200,
  },
  accountItem: {
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  accountItemActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  accountContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  accountIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  accountInfo: {
    flex: 1,
  },
  accountIdentifier: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  currentLabel: {
    color: '#00FF7F',
    fontSize: 11,
    fontWeight: '500',
  },
  removeButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  addButton: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFD700',
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  addButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 8,
  },
  addButtonText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

// ──────── MAIN COMPONENT ────────
export default function WelcomeScreen() {
  const router = useRouter();
  const auth = useAuth();
  const [securityToken, setSecurityToken] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  
  // Animation refs
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const securityNoteAnim = useRef(new Animated.Value(0)).current;
  
  // Refs
  const tokenRefs = useRef<Array<TextInput | null>>([]);

  console.log('👋 WelcomeScreen State:', {
    isAuthenticated: auth.isAuthenticated,
    currentAccount: auth.currentAccount?.identifier,
    hasAccounts: auth.savedAccounts.length > 0
  });

  // ──────── ANIMATIONS ────────
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    
    Animated.parallel([
      pulse,
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();
    
    setTimeout(() => {
      Animated.timing(securityNoteAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, 800);
    
    return () => {
      pulse.stop();
    };
  }, []);

  // ──────── AUTO-SUBMIT SECURITY TOKEN ────────
  useEffect(() => {
    const tokenString = securityToken.join('');
    if (tokenString.length === 6) {
      handleLogin();
    }
  }, [securityToken]);

  // ──────── SIMPLE REDIRECT IF ALREADY AUTHENTICATED ────────
  useEffect(() => {
    if (auth.isAuthenticated) {
      console.log('✅ WelcomeScreen: Already authenticated, redirecting to app');
      router.replace('/(app)/(protected)');
    }
  }, [auth.isAuthenticated]);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
  };

  useEffect(() => {
    if (toast) setTimeout(() => setToast(null), 3000);
  }, [toast]);

  const handleLogin = async () => {
    if (!auth.currentAccount) {
      if (auth.savedAccounts.length > 0) {
        showToast("Please select an account first.", "error");
        setShowAccountDropdown(true);
        return;
      } else {
        showToast("No accounts available.", "error");
        return;
      }
    }

    const tokenString = securityToken.join('');
    if (tokenString.length !== 6) return;

    setLoading(true);
    console.log('🔐 Verifying security token locally for:', auth.currentAccount.identifier);

    try {
      const isTokenValid = await auth.verifySecurityTokenLocally(tokenString);
      
      if (isTokenValid) {
        console.log('✅ Security token verified successfully');
        showToast("Welcome back! Redirecting...", "success");
        setTimeout(() => {
          router.replace('/(app)/(protected)');
        }, 800);
      } else {
        showToast("Invalid security token", "error");
        setSecurityToken(['', '', '', '', '', '']);
        setTimeout(() => tokenRefs.current[0]?.focus(), 300);
      }
    } catch (error) {
      console.error('💥 Error verifying security token:', error);
      showToast("Security token verification failed", "error");
      setSecurityToken(['', '', '', '', '', '']);
      setTimeout(() => tokenRefs.current[0]?.focus(), 300);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchAccount = async (account: any) => {
    try {
      await auth.switchAccount(account);
      setShowAccountDropdown(false);
      showToast(`Switched to ${maskIdentifier(account.identifier)}`, "success");
      setSecurityToken(['', '', '', '', '', '']);
      setTimeout(() => tokenRefs.current[0]?.focus(), 300);
    } catch (error) {
      console.error('Error switching account:', error);
      showToast("Failed to switch account", "error");
    }
  };

  const handleAddAccount = () => {
    setShowAccountDropdown(false);
    router.replace("/(app)/(Auth)/login");
  };

  const handleRemoveAccount = async (identifier: string) => {
    try {
      await auth.removeAccount(identifier);
      showToast("Account removed", "success");
      if (auth.savedAccounts.length === 0) {
        router.replace("/(app)/(Auth)/login");
      }
    } catch (error) {
      console.error('Error removing account:', error);
      showToast("Failed to remove account", "error");
    }
  };

  const handleInputChange = (
    text: string, 
    index: number, 
    currentArray: string[], 
    setArray: React.Dispatch<React.SetStateAction<string[]>>,
    refs: React.MutableRefObject<(TextInput | null)[]>
  ) => {
    if (text.length > 1) {
      const pastedValues = text.slice(0, 6).split('');
      const newArray = [...currentArray];
      pastedValues.forEach((char, idx) => {
        if (index + idx < 6) newArray[index + idx] = char;
      });
      setArray(newArray);
      const lastIndex = Math.min(index + pastedValues.length - 1, 5);
      refs.current[lastIndex]?.focus();
      return;
    }
    
    const newArray = [...currentArray];
    newArray[index] = text;
    setArray(newArray);
    
    if (text && index < 5) {
      refs.current[index + 1]?.focus();
    }
  };

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

  const getUserDisplayName = () => {
    if (auth.currentAccount?.full_name) {
      return auth.currentAccount.full_name;
    }
    if (auth.currentAccount?.identifier) {
      return maskIdentifier(auth.currentAccount.identifier);
    }
    return "Select an Account";
  };

  const getProfileImageSource = () => {
    if (auth.currentAccount?.avatar_url) {
      return { uri: auth.currentAccount.avatar_url };
    }
    return require("@/assets/icons/home.png");
  };

  const getWelcomeMessage = () => {
    if (auth.currentAccount?.full_name) {
      return `Welcome Back, ${auth.currentAccount.full_name.split(' ')[0]}!`;
    }
    return "Welcome Back!";
  };

  const getUserIdentifier = () => {
    if (auth.currentAccount?.identifier) {
      return maskIdentifier(auth.currentAccount.identifier);
    }
    return "Tap 'Switch Account' to select";
  };

  // Show loading while auth is initializing
  if (!auth.isInitialized) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>Loading accounts...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show redirect if already authenticated
  if (auth.isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>Redirecting to app...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ──────── RENDER MAIN UI ────────
  return (
    <SafeAreaView style={styles.container}>
      {/* BACKGROUND ELEMENTS */}
      <View style={styles.background}>
        <Animated.View 
          style={[
            styles.watermarkContainer,
            {
              transform: [{ scale: pulseAnim }]
            }
          ]}
        >
          <Image
            source={require("@/assets/icons/home.png")}
            style={styles.watermark}
            resizeMode="contain"
          />
        </Animated.View>
      </View>

      {/* MAIN CONTENT */}
      <Animated.View 
        style={[
          styles.mainContent,
          {
            transform: [{ translateY: slideAnim }],
            opacity: fadeAnim
          }
        ]}
      >
        {/* SWITCH ACCOUNT BUTTON */}
        <TouchableOpacity
          style={styles.switchAccountButton}
          onPress={() => setShowAccountDropdown(true)}
          activeOpacity={0.7}
        >
          <FontAwesome name="exchange" size={14} color="#FFD700" />
          <Text style={styles.switchAccountText}>Switch Account</Text>
        </TouchableOpacity>

        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.title}>{getWelcomeMessage()}</Text>
          <Text style={styles.subtitle}>
            🌍 Continue your secure banking experience
          </Text>
        </View>

        {/* PROFILE IMAGE */}
        <Animated.View 
          style={[
            styles.profileContainer,
            {
              transform: [{ scale: pulseAnim }]
            }
          ]}
        >
          <View style={styles.profileImageWrapper}>
            <Image
              source={getProfileImageSource()}
              style={styles.profileImage}
              resizeMode="cover"
            />
            {auth.currentAccount?.is_verified && (
              <View style={styles.profileBadge}>
                <FontAwesome name="check-circle" size={16} color="#FFD700" />
              </View>
            )}
          </View>
        </Animated.View>

        {/* USER INFO */}
        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {getUserDisplayName()}
          </Text>
          <Text style={styles.userIdentifier}>
            {getUserIdentifier()}
          </Text>
          {auth.currentAccount?.is_verified && (
            <View style={styles.verifiedBadge}>
              <FontAwesome name="shield" size={12} color="#FFD700" />
              <Text style={styles.verifiedText}>Verified User</Text>
            </View>
          )}
        </View>

        {/* TOKEN INPUT SECTION */}
        <View style={styles.tokenSection}>
          <View style={styles.sectionHeader}>
            <FontAwesome name="lock" size={20} color="#FFD700" />
            <Text style={styles.sectionTitle}>Enter Security Token</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Enter your 6-digit security token to access your account
          </Text>

          {/* TOKEN INPUT BOXES */}
          <View style={styles.otpRow}>
            {securityToken.map((_, i) => (
              <TextInput
                key={i}
                ref={ref => tokenRefs.current[i] = ref}
                style={[
                  styles.otpBox, 
                  securityToken[i] && styles.otpBoxFilled
                ]}
                keyboardType="number-pad"
                maxLength={1}
                secureTextEntry={true}
                value={securityToken[i]}
                onChangeText={(text) => {
                  handleInputChange(text, i, securityToken, setSecurityToken, tokenRefs);
                }}
                onKeyPress={(e: any) => {
                  if (e.nativeEvent.key === 'Backspace') {
                    if (!securityToken[i] && i > 0) {
                      tokenRefs.current[i - 1]?.focus();
                    }
                  }
                }}
                autoFocus={i === 0}
              />
            ))}
          </View>

          {/* SECURITY NOTE WITH SLIDE-IN ANIMATION */}
          <Animated.View 
            style={[
              styles.securityNote,
              {
                transform: [{
                  translateX: securityNoteAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-80, 0],
                  })
                }],
                opacity: securityNoteAnim
              }
            ]}
          >
            <FontAwesome name="info-circle" size={14} color="#FFD700" />
            <Text style={styles.securityNoteText}>
              This token secures your account and transactions
            </Text>
          </Animated.View>
        </View>

        {/* ACTION BUTTONS */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.biometricButton}
            onPress={() => {
              showToast("Biometric login coming soon!", "success");
            }}
            activeOpacity={0.7}
          >
            <FontAwesome name="500px" size={24} color="#FFD700" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.helpButton}
            onPress={() => {
              Alert.alert(
                "Need Help?",
                "If you've forgotten your security token, please contact support or switch to a different account.",
                [
                  { text: "Contact Support", style: "default" },
                  { text: "OK", style: "cancel" }
                ]
              );
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.helpText}>Forgot Token?</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* TOAST */}
      {toast && (
        <View style={[styles.toast, toast.type === 'success' ? styles.toastSuccess : styles.toastError]}>
          <Text style={styles.toastText}>{toast.msg}</Text>
        </View>
      )}

      {/* LOADING OVERLAY */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingOverlayText}>Verifying token...</Text>
        </View>
      )}

      {/* ACCOUNT SWITCH DROPDOWN */}
      <AccountSwitchDropdown
        visible={showAccountDropdown}
        onClose={() => setShowAccountDropdown(false)}
        accounts={auth.savedAccounts}
        currentAccount={auth.currentAccount}
        onSwitchAccount={handleSwitchAccount}
        onAddAccount={handleAddAccount}
        onRemoveAccount={handleRemoveAccount}
      />
    </SafeAreaView>
  );
}


// ──────── STYLES ────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  switchAccountButton: {
    position: "absolute",
    top: 20,
    right: 20,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FFD700",
    gap: 8,
  },
  switchAccountText: {
    color: "#FFD700",
    fontSize: 14,
    fontWeight: "600",
  },
  watermarkContainer: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 250,
    height: 250,
    marginLeft: -125,
    marginTop: -125,
    zIndex: 1,
    opacity: 0.1,
  },
  watermark: {
    width: "100%",
    height: "100%",
  },
  mainContent: {
    flex: 1,
    zIndex: 2,
    paddingHorizontal: 32,
    paddingTop: 80,
    paddingBottom: 40,
    justifyContent: "flex-start",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  loadingText: {
    color: '#FFD700',
    fontSize: 16,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    gap: 16,
  },
  loadingOverlayText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  title: {
    color: "#FFD700",
    fontSize: 28,
    fontWeight: "700",
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: "#fff",
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
  },
  profileContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profileImageWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  profileBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: 30,
  },
  userName: {
    color: '#FFD700',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  userIdentifier: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    opacity: 0.8,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  verifiedText: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  tokenSection: {
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  sectionTitle: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  sectionSubtitle: {
    color: '#fff',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
    opacity: 0.8,
    lineHeight: 18,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  otpBox: {
    backgroundColor: 'transparent',
    width: 44,
    height: 52,
    borderRadius: 10,
    textAlign: 'center',
    color: '#fff',
    fontSize: 18,
    borderWidth: 1,
    borderColor: '#333',
  },
  otpBoxFilled: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FFD700',
  },
  securityNoteText: {
    color: '#FFD700',
    fontSize: 11,
    marginLeft: 6,
    fontWeight: '500',
    flex: 1,
    textAlign: 'center',
  },
  actionSection: {
    alignItems: 'center',
    gap: 12,
  },
  biometricButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  helpButton: {
    paddingVertical: 6,
  },
  helpText: {
    color: '#FFD700',
    fontSize: 13,
    textDecorationLine: 'underline',
    opacity: 0.8,
  },
  toast: {
    position: 'absolute',
    bottom: 100,
    left: 32,
    right: 32,
    padding: 12,
    borderRadius: 10,
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
    fontWeight: '600',
    fontSize: 14,
  },
});