import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, StatusBar, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, UnknownInputParams } from "expo-router";
import { useAuth } from "@/context/supabase-provider";
import { useFont } from "@/context/font-context";
import { supabase } from "@/config/supabase";
import { useQuery } from "@tanstack/react-query";
import { actions, DEFAULT_PROVIDER_IMAGE, NETWORK_IMAGES } from "@/constants/helper";
import { useNotificationSubscription } from "@/hooks/useHomeScreenData";
import PlanItemWithSwipe from "@/components/homescreen/PlanItemWithSwipe";
import CreatePinModal from "@/components/homescreen/CreatePinModal";

// Define types
interface DataBundle {
  id: number;
  data: string;
  price: number;
  validity: string;
  category: string;
  description?: string;
  variation_code: string;
  planType: string;
}

interface Provider {
  id: number;
  name: string;
  image: string;
  code: string;
}

interface ConfirmationParams {
  bundle?: string;
  provider?: string;
  phoneNumber?: string;
  userEmail?: string;
  transactionPin?: string;
  source?: string;
  networkId?: string;
  planId?: string;
}

interface Purchase {
  plan_name: string;
  provider_name: string;
  validity: string;
  mobile_number: string;
  network_id: string;
  plan_id: string;
  created_at: string;
  user_email: string;
}

// Hook to fetch purchase history
const usePurchaseHistory = () => {
  const { user } = useAuth();
  return useQuery<Purchase[]>({
    queryKey: ["purchaseHistory", user?.email],
    queryFn: async () => {
      if (!user?.email) throw new Error("No user email");
      const { data, error } = await supabase
        .from("data_purchases")
        .select("plan_name, provider_name, validity, mobile_number, network_id, plan_id, created_at, user_email")
        .eq("user_email", user.email)
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.email,
  });
};

// Hook to count new notifications
const useNewNotificationCount = () => {
  const { user } = useAuth();
  return useQuery<number>({
    queryKey: ["newNotificationCount", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { data, error } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", user.id)
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      if (error) throw error;
      return data?.length || 0;
    },
    enabled: !!user?.id,
  });
};

export default function HomeScreen() {
  const { selectedFont } = useFont();
  const { user } = useAuth();

  const hasTransactionPin = !!user?.user_metadata?.transaction_pin_created;
  const username = user?.user_metadata?.username || "Guest";
  const userEmail = user?.email || "";

  // Modal states
  const [createPinModalVisible, setCreatePinModalVisible] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [isPinLoading, setIsPinLoading] = useState(false);

  // Fetch recent purchases
  const {
    data: purchaseHistory = [],
    isLoading: isPurchaseHistoryLoading,
    error: purchaseHistoryError,
  } = usePurchaseHistory();

  // Fetch new notification count
  const {
    data: newNotificationCount = 0,
    isLoading: isNewNotificationCountLoading,
  } = useNewNotificationCount();

  // Set up real-time notification subscription
  useNotificationSubscription();

  // Process purchase history data
  const popularPlans = purchaseHistory.map((p) => {
    const amountMatch = p.plan_name?.match(/₦(\d+)/);
    const provider = p.provider_name || getProviderFromPlan(p.plan_name || "");
    const displayPlanName = p.plan_name?.includes(provider) 
      ? p.plan_name 
      : `${provider} ${p.plan_name || "Unknown Plan"}`; // Prepend provider to plan_name
    return {
      plan_name: displayPlanName,
      provider,
      image: NETWORK_IMAGES[provider.toLowerCase()] || DEFAULT_PROVIDER_IMAGE,
      amount: amountMatch ? parseInt(amountMatch[1], 10) : 300,
      validity: p.validity || "N/A",
      phone_number: p.mobile_number || user?.user_metadata?.phone || "",
      network_id: p.network_id?.toString() || "0",
      plan_id: p.plan_id?.toString() || "0",
    };
  });

  console.log("Popular Plans (from purchase history):", popularPlans);

  // Computed values
  const hasPlans = popularPlans.length > 0;
  const phoneNumber = hasPlans
    ? popularPlans[0].phone_number
    : user?.user_metadata?.phone || "";

  // Utility functions
  const getProviderFromPlan = (plan: string): string => {
    const planUpper = plan.toUpperCase();
    if (planUpper.includes("MTN")) return "MTN";
    if (planUpper.includes("GLO")) return "GLO";
    if (planUpper.includes("AIRTEL")) return "AIRTEL";
    if (planUpper.includes("9MOBILE") || planUpper.includes("ETISALAT"))
      return "9MOBILE";
    return "Unknown";
  };

  const closeCreatePinModal = () => {
    setCreatePinModalVisible(false);
    setNewPin("");
    setConfirmPin("");
    setIsPinLoading(false);
  };

  const handleCreatePin = async () => {
    if (
      newPin.length < 4 ||
      newPin.length > 6 ||
      confirmPin.length < 4 ||
      confirmPin.length > 6
    ) {
      alert("PIN must be between 4 and 6 digits.");
      return;
    }
    if (newPin !== confirmPin) {
      alert("PINs do not match.");
      return;
    }

    setIsPinLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          transaction_pin: newPin,
          transaction_pin_created: true,
        },
      });
      if (error) throw error;
      closeCreatePinModal();
    } catch (error) {
      alert("Failed to save PIN. Please try again.");
    } finally {
      setIsPinLoading(false);
    }
  };

  const handleSwipePurchase = (plan: { plan_name: string; provider: string; image: string; amount: number; validity: string; phone_number: string; network_id: string; plan_id: string }) => {
    console.log("handleSwipePurchase called with plan:", plan);
    if (!hasTransactionPin) {
      setCreatePinModalVisible(true);
      return;
    }

    const bundle: DataBundle = {
      id: Date.now(),
      data: plan.plan_name,
      price: plan.amount,
      validity: plan.validity,
      category: "Data",
      description: plan.plan_name,
      variation_code: `data_${plan.plan_name.toLowerCase().replace(/\s/g, "_")}`,
      planType: "Data Plan",
    };

    const provider: Provider = {
      id: Date.now(),
      name: plan.provider,
      image: plan.image,
      code: plan.provider.toLowerCase(),
    };

    const params: ConfirmationParams = {
      bundle: JSON.stringify(bundle),
      provider: JSON.stringify(provider),
      phoneNumber: plan.phone_number || phoneNumber,
      userEmail: userEmail,
      transactionPin: user?.user_metadata?.transaction_pin,
      source: "index",
      networkId: plan.network_id,
      planId: plan.plan_id,
    };

    console.log("Navigating to Confirmation with params:", params);

    router.push({
      pathname: "../Confirmation",
      params: params as UnknownInputParams,
    });
  };

  // Handle loading states
  if (isPurchaseHistoryLoading || isNewNotificationCountLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator color="#D7A77F" />
        <Text style={styles.loadingText}>Loading popular plans...</Text>
      </View>
    );
  }

  // Handle errors
  if (purchaseHistoryError) {
    console.error("Purchase history error:", purchaseHistoryError);
  }

  return (
    <View style={styles.container}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />
      <View style={styles.header}>
        <Pressable
          onPress={() => router.push("../notifications")}
          style={styles.notificationIcon}
        >
          <View>
            <Ionicons name="notifications-outline" size={24} color="white" />
            {newNotificationCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {newNotificationCount > 99 ? "99+" : newNotificationCount}
                </Text>
              </View>
            )}
          </View>
        </Pressable>
      </View>

      <View
        style={{
          flexDirection: "row",
          gap: 8,
          alignItems: "center",
          marginTop: 14,
        }}
      >
        <Text
          style={{
            fontFamily: selectedFont,
            fontSize: 20,
            fontWeight: "600",
            color: "white",
          }}
        >
          Hi,
        </Text>
        <Text style={[styles.username, { textTransform: "capitalize" }]}>
          {username} 👋
        </Text>
      </View>
      <Text style={styles.welcomeSubtitle}>Your dashboard is here 🔥</Text>

      <View style={styles.quickActionsHeader}>
        <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
      </View>

      <View style={styles.quickActionsCard}>
        <View style={styles.quickActionsGrid}>
          {actions.map((action, index) => (
            <Pressable
              key={index}
              onPress={() => router.push(action.route)}
              style={styles.quickActionCard}
            >
              <Ionicons name={action.icon} size={24} color={action.color} />
              <Text style={styles.quickActionTitle}>
                {action.title.length > 12
                  ? action.title.slice(0, 11) + "..."
                  : action.title}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.popularPlansHeader}>
        <Text style={styles.sectionTitle}>🔥 Popular Plans</Text>
      </View>

      {hasPlans ? (
        popularPlans.map((plan, index) => (
          <PlanItemWithSwipe
            key={`${plan.plan_name}-${index}`}
            plan={plan.plan_name}
            image={plan.image}
            index={index}
            onSwipePurchase={() => handleSwipePurchase(plan)}
          />
        ))
      ) : (
        <View style={styles.noPlansContainer}>
          <Text style={styles.noPlansText}>
            No recent purchases found in the last 24 hours.
          </Text>
        </View>
      )}

      <CreatePinModal
        visible={createPinModalVisible}
        onClose={closeCreatePinModal}
        newPin={newPin}
        setNewPin={setNewPin}
        confirmPin={confirmPin}
        setConfirmPin={setConfirmPin}
        showNewPin={showNewPin}
        setShowNewPin={setShowNewPin}
        showConfirmPin={showConfirmPin}
        setShowConfirmPin={setShowConfirmPin}
        onSave={handleCreatePin}
        isLoading={isPinLoading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
    paddingHorizontal: 16,
    paddingTop: StatusBar.currentHeight,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
    marginTop: 8,
  },
  header: {
    position: "absolute",
    top: StatusBar.currentHeight || 48,
    right: 16,
    zIndex: 1,
  },
  notificationIcon: {
    padding: 8,
    paddingTop: StatusBar.currentHeight,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#8B4513",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  username: {
    fontSize: 20,
    fontWeight: "600",
    color: "white",
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: "gray",
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "white",
  },
  quickActionsHeader: {
    marginVertical: 24,
    paddingRight: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  popularPlansHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  quickActionsCard: {
    backgroundColor: "#171717",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingTop: 12,
    marginBottom: 24,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  quickActionCard: {
    width: "30%",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  quickActionTitle: {
    color: "white",
    fontSize: 10,
    fontWeight: "500",
    marginTop: 6,
    textAlign: "center",
  },
  noPlansContainer: {
    alignItems: "center",
    padding: 16,
    backgroundColor: "#171717",
    borderRadius: 8,
  },
  noPlansText: {
    color: "white",
    fontSize: 14,
    textAlign: "center",
  },
});