import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Alert, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "@/config/supabase";
import { useAuth } from "@/stores/auth-store";
import ActionButton from "@/components/home/ActionButtons";

interface WalletProfile {
  id: string;
  username: string | null;
  bpay_tag: string | null;
  bonus_percent: number;
  balance: number;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  country_code?: string | null;
  currency_symbol?: string | null;
  flag_emoji?: string | null;
  dial_code?: string | null;
}

export default function WalletCard() {
  const router = useRouter();
  const { user, currentAccount, isAuthenticated, logout } = useAuth();
  const [profile, setProfile] = useState<WalletProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const goToSend = () => router.push("/send");
  const goToFund = () => router.push("/fund");
  const goToBills = () => router.push("/bills");
  const goToGetTag = () => router.push("/get-tag");

  useEffect(() => {
    if (isAuthenticated && currentAccount) {
      fetchUserProfile();
    } else {
      setLoading(false);
      setProfile(null);
    }
  }, [isAuthenticated, currentAccount]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      setProfileError(null);
      
      console.log('🔍 Fetching profile for:', {
        userId: currentAccount?.user_id,
        email: currentAccount?.email,
        identifier: currentAccount?.identifier
      });

      // Method 1: Try by user_id first (most reliable)
      if (currentAccount?.user_id) {
        const profile = await fetchProfileById(currentAccount.user_id);
        if (profile) {
          setProfile(profile);
          return;
        }
      }

      // Method 2: Try by email as fallback
      if (currentAccount?.email) {
        const profile = await fetchProfileByEmail(currentAccount.email);
        if (profile) {
          setProfile(profile);
          return;
        }
      }

      // Method 3: Try by identifier
      if (currentAccount?.identifier && currentAccount.identifier !== currentAccount?.email) {
        const profile = await fetchProfileByIdentifier(currentAccount.identifier);
        if (profile) {
          setProfile(profile);
          return;
        }
      }

      // If all methods fail, show error
      setProfileError('Profile not found in database');
      setProfile(null);
      
    } catch (error) {
      console.error('💥 Error in fetchUserProfile:', error);
      setProfileError('Failed to load profile');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfileById = async (userId: string): Promise<WalletProfile | null> => {
    try {
      console.log('🔍 Querying profile by ID:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, username, bpay_tag, bonus_percent, balance, full_name, 
          email, phone, country_code, currency_symbol, flag_emoji, dial_code
        `)
        .eq('id', userId)
        .single();

      if (error) {
        console.log('❌ Profile not found by ID:', error.message);
        return null;
      }

      console.log('✅ Profile found by ID:', data.id);
      return data;
    } catch (error) {
      console.error('💥 Error fetching by ID:', error);
      return null;
    }
  };

  const fetchProfileByEmail = async (email: string): Promise<WalletProfile | null> => {
    try {
      console.log('🔍 Querying profile by email:', email);
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, username, bpay_tag, bonus_percent, balance, full_name, 
          email, phone, country_code, currency_symbol, flag_emoji, dial_code
        `)
        .eq('email', email)
        .single();

      if (error) {
        console.log('❌ Profile not found by email:', error.message);
        return null;
      }

      console.log('✅ Profile found by email:', data.id);
      return data;
    } catch (error) {
      console.error('💥 Error fetching by email:', error);
      return null;
    }
  };

  const fetchProfileByIdentifier = async (identifier: string): Promise<WalletProfile | null> => {
    try {
      console.log('🔍 Querying profile by identifier:', identifier);
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, username, bpay_tag, bonus_percent, balance, full_name, 
          email, phone, country_code, currency_symbol, flag_emoji, dial_code
        `)
        .or(`email.eq.${identifier},phone.eq.${identifier}`)
        .single();

      if (error) {
        console.log('❌ Profile not found by identifier:', error.message);
        return null;
      }

      console.log('✅ Profile found by identifier:', data.id);
      return data;
    } catch (error) {
      console.error('💥 Error fetching by identifier:', error);
      return null;
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const copyTag = () => {
    if (profile?.bpay_tag) {
      Alert.alert("Copied!", `${profile.bpay_tag} copied to clipboard.`);
    }
  };

  // Format balance with currency symbol from profile
  const formatBalance = (balance: number) => {
    const currencySymbol = profile?.currency_symbol || "₦";
    return `${currencySymbol}${balance?.toFixed(2) || "0.00"}`;
  };

  const getDisplayName = () => {
    if (profile?.username) return profile.username;
    if (profile?.full_name) return profile.full_name;
    if (profile?.email) return profile.email.split('@')[0];
    if (currentAccount?.email) return currentAccount.email.split('@')[0];
    return "User";
  };

  const hasCountryData = () => {
    return profile?.country_code && profile?.flag_emoji;
  };

  if (loading) {
    return (
      <View style={styles.walletSection}>
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonBalance} />
        <View style={styles.skeletonTag} />
        <View style={styles.actionRow}>
          <View style={styles.skeletonButton} />
          <View style={styles.skeletonButton} />
          <View style={styles.skeletonButton} />
        </View>
      </View>
    );
  }

  if (!isAuthenticated || !currentAccount) {
    return (
      <View style={styles.walletSection}>
        <Text style={styles.errorText}>Please log in to view wallet</Text>
        <TouchableOpacity onPress={() => router.push("/login")} style={styles.retryButton}>
          <Text style={styles.retryText}>Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!profile || profileError) {
    return (
      <View style={styles.walletSection}>
        <Text style={styles.errorText}>Profile Not Found</Text>
        <Text style={styles.errorSubtext}>
          The account "{currentAccount.identifier}" was not found in our database.
        </Text>
        <Text style={styles.errorSubtext}>
          This usually happens when an account is deleted or not properly created.
        </Text>
        
        <View style={styles.buttonGroup}>
          <TouchableOpacity onPress={fetchUserProfile} style={styles.retryButton}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Use Different Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const hasTag = !!profile.bpay_tag;

  return (
    <View style={styles.walletSection}>
      {/* Header with name and flag */}
      <View style={styles.headerRow}>
        <Text style={styles.walletTitle}>{getDisplayName()}</Text>
        {hasCountryData() && (
          <View style={styles.flagContainer}>
            <Text style={styles.flagText}>{profile.flag_emoji}</Text>
            <Text style={styles.countryText}>{profile.country_code}</Text>
          </View>
        )}
      </View>

      {/* Balance with dynamic currency symbol */}
      <View style={styles.balanceContainer}>
        <Text style={styles.balance}>{formatBalance(profile.balance)}</Text>
        {profile.bonus_percent > 0 && (
          <View style={styles.bonusBadge}>
            <Text style={styles.bonusText}>+{profile.bonus_percent}%</Text>
          </View>
        )}
      </View>

      {/* BPAY Tag Section */}
      <View style={styles.tagRow}>
        {hasTag ? (
          <>
            <Text style={styles.bpayTag}>{profile.bpay_tag}</Text>
            <TouchableOpacity onPress={copyTag} style={styles.copyButton}>
              <MaterialCommunityIcons name="content-copy" size={16} color="#aaa" />
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.getTagButton} onPress={goToGetTag}>
            <View style={styles.getTagContent}>
              <Ionicons name="sparkles" size={16} color="#FFD700" />
              <Text style={styles.getTagText}>Get Your BPAY Tag</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Additional Country Info */}
      {hasCountryData() && profile.currency_symbol && (
        <View style={styles.countryInfo}>
          <Text style={styles.countryInfoText}>
            {profile.flag_emoji} {profile.country_code} • {profile.currency_symbol}
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <ActionButton icon="arrow-up" label="Send" onPress={goToSend} />
        
        <TouchableOpacity style={styles.actionButton} onPress={goToFund}>
          <View style={[styles.actionIcon, { backgroundColor: "#00FF7F" }]}>
            <Ionicons name="flash" size={20} color="#000" />
          </View>
          <Text style={styles.actionLabel}>Fund</Text>
        </TouchableOpacity>
        
        <ActionButton icon="business-outline" label="Bills" onPress={goToBills} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  walletSection: { 
    alignItems: "center", 
    marginBottom: 28,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  walletTitle: { 
    color: "#fff", 
    fontSize: 18,
    fontWeight: "600",
    marginRight: 8,
  },
  flagContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  flagText: {
    fontSize: 14,
    marginRight: 4,
  },
  countryText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  balanceContainer: { 
    flexDirection: "row", 
    alignItems: "center", 
    position: "relative",
    marginVertical: 8,
  },
  balance: { 
    fontSize: 38, 
    color: "#fff", 
    fontWeight: "700",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  bonusBadge: { 
    backgroundColor: "#8B4513", 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 12, 
    transform: [{ rotate: "-12deg" }], 
    position: "absolute", 
    right: -20, 
    top: -10, 
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  bonusText: { 
    color: "#fff", 
    fontSize: 12, 
    fontWeight: "bold" 
  },
  tagRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginTop: 8, 
    marginBottom: 12,
    minHeight: 40,
  },
  bpayTag: { 
    color: "#FFD700", 
    fontSize: 16, 
    fontWeight: "600",
    letterSpacing: 0.5,
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
  },
  copyButton: { 
    marginLeft: 8, 
    padding: 6,
    borderRadius: 6,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  getTagButton: {
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.4)",
    borderStyle: "dashed",
  },
  getTagContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  getTagText: {
    color: "#FFD700",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  countryInfo: {
    marginBottom: 16,
  },
  countryInfoText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 12,
    fontWeight: "500",
  },
  actionRow: { 
    flexDirection: "row", 
    justifyContent: "space-around", 
    width: "100%", 
    marginTop: 20, 
    paddingHorizontal: 10,
  },
  actionButton: { 
    alignItems: "center", 
    width: 80,
  },
  actionIcon: { 
    width: 50, 
    height: 50, 
    borderRadius: 12, 
    justifyContent: "center", 
    alignItems: "center", 
    marginBottom: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  actionLabel: { 
    color: "#fff", 
    fontSize: 13,
    fontWeight: "500",
  },
  // Error states
  errorText: {
    color: "#ff6b6b",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 10,
    fontWeight: "600",
  },
  errorSubtext: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 10,
    lineHeight: 20,
  },
  buttonGroup: {
    flexDirection: "column",
    gap: 12,
    width: "100%",
    marginTop: 10,
  },
  retryButton: {
    backgroundColor: "#00FF7F",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  logoutButton: {
    backgroundColor: "rgba(255, 107, 107, 0.2)",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ff6b6b",
  },
  retryText: {
    color: "#000",
    fontWeight: "600",
    textAlign: "center",
  },
  logoutText: {
    color: "#ff6b6b",
    fontWeight: "600",
    textAlign: "center",
  },
  // Skeleton loading styles
  skeletonTitle: {
    width: 120,
    height: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 4,
    marginBottom: 6,
  },
  skeletonBalance: {
    width: 100,
    height: 40,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonTag: {
    width: 150,
    height: 18,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 4,
    marginBottom: 20,
  },
  skeletonButton: {
    width: 80,
    height: 70,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
  },
});