import React, { useState, useContext, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Alert,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useSegments, useFocusEffect } from "expo-router";
import { useAuth } from "@/context/supabase-provider";
import { useFont } from "@/context/font-context";
import { useNotifications } from "@/context/NotificationsProvider";
import { supabase } from "@/config/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  actions,
  DEFAULT_PROVIDER_IMAGE,
  NETWORK_IMAGES,
} from "@/constants/helper";
import { useNotificationSubscription } from "@/hooks/useHomeScreenData";
import PlanItemWithSwipe from "@/components/homescreen/PlanItemWithSwipe";
import CreatePinModal from "@/components/homescreen/CreatePinModal";
import { DataContext } from "@/context/DataProvider";
import SwipeWrapper from "@/components/SwipeWrapper";

// ──────────────────────────────────────────────────────────────
// Interfaces
// ──────────────────────────────────────────────────────────────
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
  image: any;
  code: string;
  imageKey: string;
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

// ──────────────────────────────────────────────────────────────
// Hooks
// ──────────────────────────────────────────────────────────────
const usePurchaseHistory = () => {
  const { user } = useAuth();
  return useQuery<Purchase[]>({
    queryKey: ["purchaseHistory", user?.email ?? "no-user"],
    queryFn: async () => {
      if (!user?.email) return [];
      const { data, error } = await supabase
        .from("data_purchases")
        .select(
          "plan_name, provider_name, validity, mobile_number, network_id, plan_id, created_at, user_email"
        )
        .eq("user_email", user.email)
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.email,
  });
};

const useNewNotificationCount = () => {
  const { user } = useAuth();
  const { notificationsEnabled } = useNotifications();
  return useQuery<number>({
    queryKey: ["newNotificationCount", user?.id ?? "no-user"],
    queryFn: async () => {
      if (!user?.id || !notificationsEnabled) return 0;
      const { data, error } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_read", false)
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      if (error) throw error;
      return data?.length || 0;
    },
    enabled: !!user?.id && notificationsEnabled,
  });
};

// ──────────────────────────────────────────────────────────────
// Helper Functions
// ──────────────────────────────────────────────────────────────
const isWeekday = (date: Date): boolean => {
  const day = date.getDay();
  return day >= 1 && day <= 5; // Monday to Friday
};

const getDateKey = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// ──────────────────────────────────────────────────────────────
// useWelcomeOffer – Complete workflow implementation with 24hr cooldown
// ──────────────────────────────────────────────────────────────
interface WelcomeOfferResult {
  text: Record<string, string> | null;
  stock: number;
  showOffer: boolean;
  timeLeft: number; // ms
  dynamicTitle: { before: string; plan: string; after: string } | null;
  purchaseDaysCount: number;
  nextAvailableTime?: number; // ms until next appearance
}

const useWelcomeOffer = (userEmail: string) => {
  const queryClient = useQueryClient();

  return useQuery<WelcomeOfferResult>({
    queryKey: ["welcomeOffer", userEmail],
    queryFn: async (): Promise<WelcomeOfferResult> => {
      if (!userEmail) {
        return { text: null, stock: 0, showOffer: false, timeLeft: 0, dynamicTitle: null, purchaseDaysCount: 0 };
      }

      // 1. Eligibility - Check if user has at least one data transaction (type IS NULL)
      const { count } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("user_email", userEmail)
        .is("type", null); // type IS NULL indicates data purchases
      
      if (!count || count === 0) {
        return { text: null, stock: 0, showOffer: false, timeLeft: 0, dynamicTitle: null, purchaseDaysCount: 0 };
      }

      // 2. Fetch text + product
      const [{ data: texts }, { data: prod }] = await Promise.all([
        supabase.from("welcome_offer_text").select("key,value"),
        supabase.from("welcome_offer_product").select("data,price").single(),
      ]);

      const textMap = Object.fromEntries(texts?.map(t => [t.key, t.value]) || []);
      const plan = prod?.data ?? "MTN 1GB";
      const price = `₦${prod?.price ?? 480}`;

      // Build dynamic title
      let title = textMap.title || "Welcome back! Get {plan} at just {price}";
      title = title.replace("{plan}", plan).replace("{price}", price);
      const before = title.split(plan)[0];
      const after = title.split(plan)[1] || "";

      // 3. Get or create usage record
      let { data: usage } = await supabase
        .from("welcome_offer_usage")
        .select("*")
        .eq("user_email", userEmail)
        .single();

      const now = new Date();

      if (!usage) {
        // First time - create with 3 claims and new window
        const start = new Date();
        const end = new Date(start.getTime() + 30_000);
        const { data } = await supabase
          .from("welcome_offer_usage")
          .insert({
            user_email: userEmail,
            used_count: 0,
            purchase_days_count: 0,
            claim_window_start: start.toISOString(),
            claim_window_end: end.toISOString(),
            last_reactivation_date: null,
            purchase_days_log: [],
            last_disappearance_time: null,
          })
          .select()
          .single();
        usage = data;
      }

      // 4. Check 24-hour cooldown logic
      let isInCooldown = false;
      let nextAvailableTime = 0;
      
      if (usage?.last_disappearance_time) {
        const lastDisappearance = new Date(usage.last_disappearance_time);
        const timeSinceDisappearance = now.getTime() - lastDisappearance.getTime();
        const twentyFourHours = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        
        if (timeSinceDisappearance < twentyFourHours) {
          isInCooldown = true;
          nextAvailableTime = twentyFourHours - timeSinceDisappearance;
        } else {
          // Cooldown period over, reset for new appearance
          if (usage.used_count < 3) {
            const start = new Date();
            const end = new Date(start.getTime() + 30_000);
            const { data } = await supabase
              .from("welcome_offer_usage")
              .update({
                claim_window_start: start.toISOString(),
                claim_window_end: end.toISOString(),
                last_disappearance_time: null, // Reset since we're showing again
              })
              .eq("user_email", userEmail)
              .select()
              .single();
            usage = data || usage;
          }
        }
      }

      // 5. Check for reactivation via purchase days (using transactions table)
      let needsReactivation = false;
      if (usage?.used_count >= 3 && !isInCooldown) {
        // User has used all claims, check if they qualify for reactivation
        const { data: recentTransactions } = await supabase
          .from("transactions")
          .select("created_at")
          .eq("user_email", userEmail)
          .is("type", null) // Only data purchases (type IS NULL)
          .order("created_at", { ascending: false });

        if (recentTransactions && recentTransactions.length > 0) {
          const uniquePurchaseDays = new Set<string>();
          
          recentTransactions.forEach(transaction => {
            const purchaseDate = new Date(transaction.created_at);
            if (isWeekday(purchaseDate)) {
              uniquePurchaseDays.add(getDateKey(purchaseDate));
            }
          });

          const purchaseDaysArray = Array.from(uniquePurchaseDays);
          const currentPurchaseDaysCount = purchaseDaysArray.length;

          // Check if we need to update the purchase days count
          if (currentPurchaseDaysCount !== usage.purchase_days_count) {
            await supabase
              .from("welcome_offer_usage")
              .update({
                purchase_days_count: currentPurchaseDaysCount,
                purchase_days_log: purchaseDaysArray,
              })
              .eq("user_email", userEmail);
            
            usage.purchase_days_count = currentPurchaseDaysCount;
            usage.purchase_days_log = purchaseDaysArray;
          }

          // Check if user qualifies for reactivation (5+ purchase days)
          if (currentPurchaseDaysCount >= 5) {
            needsReactivation = true;
            // Reset for reactivation
            const start = new Date();
            const end = new Date(start.getTime() + 30_000);
            const { data: reactivatedUsage } = await supabase
              .from("welcome_offer_usage")
              .update({
                used_count: 0,
                purchase_days_count: 0,
                purchase_days_log: [],
                claim_window_start: start.toISOString(),
                claim_window_end: end.toISOString(),
                last_reactivation_date: now.toISOString(),
                last_disappearance_time: null, // Reset cooldown
              })
              .eq("user_email", userEmail)
              .select()
              .single();
            
            usage = reactivatedUsage || usage;
          }
        }
      }

      // 6. Timer behavior logic
      const windowEnd = usage?.claim_window_end ? new Date(usage.claim_window_end) : null;
      const inWindow = windowEnd && now <= windowEnd;
      const hasStock = usage && usage.used_count < 3;

      if (!inWindow && hasStock && !isInCooldown) {
        // Timer hit zero but user still has stock - set disappearance time and start cooldown
        if (!usage.last_disappearance_time) {
          await supabase
            .from("welcome_offer_usage")
            .update({
              last_disappearance_time: now.toISOString(),
            })
            .eq("user_email", userEmail);
          
          usage.last_disappearance_time = now.toISOString();
          isInCooldown = true;
          nextAvailableTime = 24 * 60 * 60 * 1000; // 24 hours
        }
      }

      // 7. Calculate current state
      const stock = Math.max(0, 3 - (usage?.used_count || 0));
      const currentWindowEnd = usage?.claim_window_end ? new Date(usage.claim_window_end) : new Date(now.getTime() + 30_000);
      const timeLeft = Math.max(0, currentWindowEnd.getTime() - now.getTime());
      
      // Show offer only if:
      // - User has stock remaining AND time left AND window is active AND not in cooldown OR
      // - User needs reactivation (just got reactivated)
      const showOffer = ((stock > 0 && timeLeft > 0 && inWindow && !isInCooldown) || needsReactivation);

      return {
        text: textMap,
        stock,
        showOffer,
        timeLeft,
        dynamicTitle: { before, plan, after },
        purchaseDaysCount: usage?.purchase_days_count || 0,
        nextAvailableTime: isInCooldown ? nextAvailableTime : 0,
      };
    },
    enabled: !!userEmail,
    refetchInterval: 100, // Update every 100ms for smooth countdown
    staleTime: 0,
  });
};

const useWelcomeOfferProduct = () => {
  return useQuery({
    queryKey: ["welcomeOfferProduct"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("welcome_offer_product")
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });
};

// ──────────────────────────────────────────────────────────────
// Format ms → ss:ms (e.g. 29:99) and hours:minutes for cooldown
// ──────────────────────────────────────────────────────────────
const formatTime = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const seconds = totalSeconds;
  const milliseconds = Math.floor((ms % 1000) / 10);
  return `${seconds.toString().padStart(2, "0")}:${milliseconds.toString().padStart(2, "0")}`;
};

const formatCooldownTime = (ms: number): string => {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};

// ──────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { selectedFont } = useFont();
  const { user, initialized } = useAuth();
  const { notificationsEnabled } = useNotifications();
  const segments = useSegments();
  const { providerPlans, isLoading: isPlansLoading } = useContext(DataContext);
  const queryClient = useQueryClient();

  const userEmail = user?.email ?? "";
  const username = user ? (user.user_metadata?.username ?? "User") : "User";

  const [createPinModalVisible, setCreatePinModalVisible] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [isPinLoading, setIsPinLoading] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  const { data: purchaseHistory = [], isLoading: isPurchaseHistoryLoading } = usePurchaseHistory();
  const { data: newNotificationCount = 0, isLoading: isNewNotificationCountLoading } = useNewNotificationCount();
  const { data: welcomeOffer, isLoading: isOfferLoading, refetch: refetchWelcomeOffer } = useWelcomeOffer(userEmail);
  const { data: offerProduct, isLoading: isProductLoading } = useWelcomeOfferProduct();

  const blinkOpacity = useRef(new Animated.Value(1)).current;
  const popScale = useRef(new Animated.Value(1)).current;

  // Refresh welcome offer when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      refetchWelcomeOffer();
    }, [refetchWelcomeOffer])
  );

  useEffect(() => {
    if (!initialized) return;
    if (!user && segments[1] !== "(auth)") router.replace("/(app)/welcome");

    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(blinkOpacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
        Animated.timing(blinkOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    const pop = Animated.loop(
      Animated.sequence([
        Animated.timing(popScale, { toValue: 1.1, duration: 500, useNativeDriver: true }),
        Animated.timing(popScale, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    blink.start();
    pop.start();
    return () => {
      blink.stop();
      pop.stop();
    };
  }, [initialized, user]);

  useNotificationSubscription();

  const popularPlans = useMemo(() => {
    return purchaseHistory.map(p => {
      const amountMatch = p.plan_name?.match(/₦(\d+)/);
      const provider = p.provider_name || getProviderFromPlan(p.plan_name || "");
      const displayPlanName = p.plan_name?.includes(provider)
        ? p.plan_name
        : `${provider} ${p.plan_name || "Unknown Plan"}`;
      return {
        plan_name: displayPlanName,
        provider,
        image: NETWORK_IMAGES[provider.toLowerCase()] || DEFAULT_PROVIDER_IMAGE,
        amount: amountMatch ? parseInt(amountMatch[1], 10) : 300,
        validity: p.validity || "N/A",
        phone_number: p.mobile_number || (user?.user_metadata?.phone ?? ""),
        network_id: p.network_id?.toString() || "0",
        plan_id: p.plan_id?.toString() || "0",
      };
    });
  }, [purchaseHistory, user]);

  const getProviderFromPlan = (plan: string): string => {
    const upper = plan.toUpperCase();
    if (upper.includes("MTN")) return "MTN";
    if (upper.includes("GLO")) return "GLO";
    if (upper.includes("AIRTEL")) return "AIRTEL";
    if (upper.includes("9MOBILE") || upper.includes("ETISALAT")) return "9MOBILE";
    return "";
  };

  const handleWelcomeClaim = async () => {
    if (!welcomeOffer || welcomeOffer.stock <= 0 || !offerProduct || !welcomeOffer.showOffer || isClaiming) return;

    setIsClaiming(true);

    try {
      // 1. First get the current usage to calculate new count
      const { data: currentUsage, error: fetchError } = await supabase
        .from("welcome_offer_usage")
        .select("used_count")
        .eq("user_email", userEmail)
        .single();

      if (fetchError) throw fetchError;

      const newUsedCount = (currentUsage?.used_count || 0) + 1;

      // 2. Update the usage count in database
      const { error: updateError } = await supabase
        .from("welcome_offer_usage")
        .upsert(
          {
            user_email: userEmail,
            used_count: newUsedCount,
          },
          { onConflict: "user_email" }
        );

      if (updateError) throw updateError;

      // 3. Immediately invalidate and refetch to update the UI
      await queryClient.invalidateQueries({ queryKey: ["welcomeOffer", userEmail] });
      
      // 4. Wait a brief moment for UI to update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 5. Prepare bundle and provider data
      const bundle: DataBundle = {
        id: offerProduct.plan_id,
        data: offerProduct.data,
        price: offerProduct.price,
        validity: offerProduct.validity,
        category: offerProduct.category,
        description: offerProduct.description || `${offerProduct.provider_name} ${offerProduct.data} Welcome Back Offer`,
        variation_code: offerProduct.variation_code,
        planType: offerProduct.planType,
      };

      const provider: Provider = {
        id: offerProduct.network_id,
        name: offerProduct.provider_name,
        image: NETWORK_IMAGES[offerProduct.provider_name.toLowerCase()] || NETWORK_IMAGES.mtn,
        code: offerProduct.provider_name.toLowerCase(),
        imageKey: offerProduct.provider_name.toUpperCase(),
      };

      // 6. Now route to purchase screen
      router.push({
        pathname: "/generate-token",
        params: {
          bundle: JSON.stringify(bundle),
          provider: JSON.stringify(provider),
          phoneNumber: user?.user_metadata?.phone ?? "",
          userEmail,
          transactionPin: user?.user_metadata?.transaction_pin ?? "",
          source: "welcome-offer",
          networkId: offerProduct.network_id.toString(),
          planId: offerProduct.plan_id.toString(),
        } as any,
      });

    } catch (error) {
      console.error("Failed to claim welcome offer:", error);
      Alert.alert("Error", "Failed to claim offer. Please try again.");
    } finally {
      setIsClaiming(false);
    }
  };

  const handleRecentPlanSwipe = (plan: typeof popularPlans[0]) => {
    const bundle: DataBundle = {
      id: Number(plan.plan_id),
      data: plan.plan_name,
      price: plan.amount,
      validity: plan.validity,
      category: "",
      description: plan.plan_name,
      variation_code: "",
      planType: "",
    };
    const provider: Provider = {
      id: Number(plan.network_id),
      name: plan.provider,
      image: plan.image,
      code: plan.provider.toLowerCase(),
      imageKey: plan.provider.toUpperCase(),
    };

    router.push({
      pathname: "/generate-token",
      params: {
        bundle: JSON.stringify(bundle),
        provider: JSON.stringify(provider),
        phoneNumber: plan.phone_number,
        userEmail,
        transactionPin: user?.user_metadata?.transaction_pin ?? "",
        source: "recent-plan",
        networkId: plan.network_id,
        planId: plan.plan_id,
      } as any,
    });
  };

  if (!initialized || isPurchaseHistoryLoading || isNewNotificationCountLoading || isPlansLoading || isOfferLoading || isProductLoading) {
    return (
      <SwipeWrapper>
        <View style={[styles.container, styles.centerContent]}>
          <ActivityIndicator size="large" color="#D7A77F" />
          <Text style={styles.loadingText}>Loading data...</Text>
        </View>
      </SwipeWrapper>
    );
  }

  if (!user) return null;

  const hasPlans = popularPlans.length > 0;

  // Dynamic text
  const text = welcomeOffer?.text || {};
  const formattedTimer = welcomeOffer?.timeLeft ? formatTime(welcomeOffer.timeLeft) : "30:00";
  const formattedStock = (text.stockLabel || "{stock}/3 uses").replace("{stock}", (welcomeOffer?.stock || 0).toString());
  const formattedCooldown = welcomeOffer?.nextAvailableTime ? formatCooldownTime(welcomeOffer.nextAvailableTime) : "";

  return (
    <SwipeWrapper>
      <View style={styles.container}>
        <StatusBar translucent backgroundColor="black" barStyle="light-content" />

        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.push("/notifications")} style={styles.notificationIcon}>
            <View>
              <Ionicons name="notifications" size={24} color="#666" />
              {notificationsEnabled && newNotificationCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {newNotificationCount > 99 ? "99+" : newNotificationCount}
                  </Text>
                </View>
              )}
            </View>
          </Pressable>
        </View>

        {/* Greeting */}
        <View style={styles.greetingContainer}>
          <Text style={[styles.headerTitle, { fontFamily: selectedFont }]}>Hi,</Text>
          <Text style={[styles.headerTitle, { textTransform: "capitalize" }]}>{username}</Text>
        </View>
        <Text style={styles.headerSubtitle}>Your dashboard is here</Text>

        {/* Flash sale */}
        <Animated.View style={[styles.flashSaleBanner, { opacity: blinkOpacity, transform: [{ scale: popScale }] }]}>
          <Pressable onPress={() => router.push("/commingsoon")}>
            <Text style={styles.flashSaleText}>FLASH SALE! Up to 50% OFF Data Plans!</Text>
          </Pressable>
        </Animated.View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {actions.map((action, i) => (
              <Pressable
                key={i}
                onPress={() => {
                  if (!user && action.route !== "commingsoon") {
                    Alert.alert("Error", "Please log in to access this feature.");
                    router.replace("/(app)/(auth)/sign-in");
                    return;
                  }
                  router.push(`/${action.route}`);
                }}
                style={styles.button}
              >
                <Ionicons name={action.icon} size={24} color={action.color} />
                <Text style={styles.buttonTitle}>
                  {action.title.length > 12 ? action.title.slice(0, 11) + "..." : action.title}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Recent Plans / Welcome Offer */}
        <View style={styles.popularPlansSection}>
          <Text style={styles.sectionTitle}>Recent Plans</Text>
        </View>

        {hasPlans ? (
          popularPlans.map((plan, i) => (
            <PlanItemWithSwipe
              key={`${plan.plan_id}-${i}`}
              plan={plan.plan_name}
              image={plan.image}
              index={i}
              onSwipePurchase={() => handleRecentPlanSwipe(plan)}
            />
          ))
        ) : welcomeOffer?.showOffer ? (
          <View style={styles.welcomeOfferContainer}>
            {/* DYNAMIC TITLE */}
            <Text style={styles.welcomeText}>
              {welcomeOffer.dynamicTitle?.before}
              <Text style={styles.offerHighlight}>
                {welcomeOffer.dynamicTitle?.plan}
              </Text>
              {welcomeOffer.dynamicTitle?.after}
            </Text>

            {/* Subtitle */}
            {text.subtitle && <Text style={styles.welcomeSubtext}>{text.subtitle}</Text>}

            {/* Progress for reactivation (show when user has used all claims) */}
            {welcomeOffer.stock === 0 && welcomeOffer.purchaseDaysCount > 0 && (
              <Text style={styles.reactivationProgress}>
                Reactivation progress: {welcomeOffer.purchaseDaysCount}/5 purchase days (Mon-Fri)
              </Text>
            )}

            {/* Cooldown message */}
            {welcomeOffer.nextAvailableTime > 0 && (
              <Text style={styles.cooldownText}>
                Next offer available in: {formattedCooldown}
              </Text>
            )}

            {/* Timer + Stock */}
            {welcomeOffer.nextAvailableTime === 0 && (
              <View style={styles.timerStockRow}>
                <Text style={styles.timerText}>{formattedTimer}</Text>
                <Text style={styles.stockText}>{formattedStock}</Text>
              </View>
            )}

            {welcomeOffer.nextAvailableTime === 0 && (
              <Pressable
                style={[
                  styles.claimButton, 
                  (welcomeOffer.stock <= 0 || !welcomeOffer.showOffer || isClaiming) && { opacity: 0.5 }
                ]}
                onPress={handleWelcomeClaim}
                disabled={welcomeOffer.stock <= 0 || !welcomeOffer.showOffer || isClaiming}
              >
                {isClaiming ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={styles.claimButtonText}>
                    {text.button || "Claim"} ×{welcomeOffer.stock}
                  </Text>
                )}
              </Pressable>
            )}
          </View>
        ) : null}

        {/* PIN Modal */}
        <CreatePinModal
          visible={createPinModalVisible}
          onClose={() => setCreatePinModalVisible(false)}
          newPin={newPin}
          setNewPin={setNewPin}
          confirmPin={confirmPin}
          setConfirmPin={setConfirmPin}
          showNewPin={showNewPin}
          setShowNewPin={setShowNewPin}
          showConfirmPin={showConfirmPin}
          setShowConfirmPin={setShowConfirmPin}
          onSave={async () => {
            if (newPin.length < 4 || confirmPin.length < 4 || newPin !== confirmPin) {
              Alert.alert("Error", "PINs must match and be 4-6 digits.");
              return;
            }
            setIsPinLoading(true);
            try {
              const { error } = await supabase.auth.updateUser({
                data: { transaction_pin: newPin, transaction_pin_created: true },
              });
              if (error) throw error;
              setCreatePinModalVisible(false);
              Alert.alert("Success", "PIN created successfully.");
            } catch {
              Alert.alert("Error", "Failed to save PIN.");
            } finally {
              setIsPinLoading(false);
            }
          }}
          isLoading={isPinLoading}
        />
      </View>
    </SwipeWrapper>
  );
}

// ──────────────────────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    paddingHorizontal: 16,
    paddingTop: StatusBar.currentHeight || 40,
  },
  header: {
    position: "absolute",
    top: StatusBar.currentHeight || 40,
    right: 16,
    zIndex: 10,
  },
  notificationIcon: {
    padding: 24,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#f42",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  greetingContainer: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    marginTop: 14,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#888",
    marginBottom: 12,
  },
  flashSaleBanner: {
    backgroundColor: "#FF4500",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    alignItems: "center",
    shadowColor: "#FF4500",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  flashSaleText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 12,
  },
  quickActionsSection: {
    marginVertical: 16,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  button: {
    width: "30%",
    backgroundColor: "#222",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonTitle: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "500",
    marginTop: 6,
    textAlign: "center",
  },
  popularPlansSection: {
    marginVertical: 16,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  welcomeOfferContainer: {
    backgroundColor: "#1A1A1A",
    borderRadius: 16,
    padding: 20,
    marginVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  welcomeText: {
    fontSize: 18,
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
    fontWeight: "600",
  },
  offerHighlight: {
    color: "#FFC107",
    fontWeight: "700",
  },
  offerPrice: {
    color: "#4CAF50",
    fontWeight: "700",
  },
  welcomeSubtext: {
    fontSize: 14,
    color: "#aaa",
    textAlign: "center",
    marginBottom: 10,
  },
  reactivationProgress: {
    fontSize: 12,
    color: "#4CAF50",
    textAlign: "center",
    marginBottom: 8,
    fontWeight: "600",
  },
  cooldownText: {
    fontSize: 14,
    color: "#FF6B6B",
    textAlign: "center",
    marginBottom: 12,
    fontWeight: "600",
  },
  timerStockRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  timerText: {
    fontSize: 13,
    color: "#FF6B6B",
    fontWeight: "600",
  },
  stockText: {
    fontSize: 13,
    color: "#FFC107",
    fontWeight: "600",
  },
  claimButton: {
    backgroundColor: "#FFC107",
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 140,
  },
  claimButtonText: {
    color: "#000",
    fontWeight: "700",
    fontSize: 15,
    textAlign: "center",
  },
  loadingText: {
    color: "#fff",
    fontSize: 16,
    marginTop: 10,
  },
});