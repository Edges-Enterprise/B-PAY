import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  StatusBar,
  Platform,
  SafeAreaView,
  ScrollView,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { MotiView } from "moti";
import { colors } from "@/constants/colors";
import { useColorScheme } from "@/lib/useColorScheme";
import { supabase } from "@/config/supabase";
import { usePurchaseHistory } from "@/hooks/useHomeScreenData";

interface Transaction {
  type: string;
  amount: number;
  method?: string;
  date: string;
}

interface Recommendation {
  id: string;
  plan_name: string;
  provider: string;
  price: number;
  validity: string;
}

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

export default function WalletScreen() {
  const { colorScheme } = useColorScheme();
  const [showBalance, setShowBalance] = useState<boolean>(false);
  const [showTransactions, setShowTransactions] = useState<boolean>(false);
  const [balance, setBalance] = useState<number>(0);
  const [userEmail, setUserEmail] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [transactionPin, setTransactionPin] = useState<string>("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [hasPriorPurchase, setHasPriorPurchase] = useState<boolean>(false);
  const [loadingBalance, setLoadingBalance] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Fetch recent purchases (all users, last 24 hours)
  const {
    data: purchaseHistory = [],
    isLoading: isPurchaseHistoryLoading,
    error: purchaseHistoryError,
  } = usePurchaseHistory();

  // Process purchase history into recommendations
  const currentRecommendations: Recommendation[] = purchaseHistory.map((p, index) => {
    const amountMatch = p.plan_name?.match(/₦(\d+)/);
    return {
      id: `${p.id}-${index}`,
      plan_name: p.plan_name || "Unknown Plan",
      provider: p.provider_name || getProviderFromPlan(p.plan_name || ""),
      price: amountMatch ? parseInt(amountMatch[1], 10) + 50 : 350, // Add fees
      validity: p.validity || "N/A",
    };
  });

  console.log("Recommended Purchases (from purchase history):", currentRecommendations);

  // Utility function to derive provider from plan name
  const getProviderFromPlan = (plan: string): string => {
    const planUpper = plan.toUpperCase();
    if (planUpper.includes("MTN")) return "MTN";
    if (planUpper.includes("GLO")) return "GLO";
    if (planUpper.includes("AIRTEL")) return "AIRTEL";
    if (planUpper.includes("9MOBILE") || planUpper.includes("ETISALAT"))
      return "9MOBILE";
    return "Unknown";
  };

  // Function to fetch user and wallet data
  const fetchUserAndWallet = useCallback(async () => {
    try {
      setRefreshing(true);
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user || !user.email) {
        console.error("User not authenticated or email missing");
        router.replace("/sign-in");
        return;
      }

      setUserEmail(user.email);
      setUserId(user.id);
      setTransactionPin(user.user_metadata?.transaction_pin || "");

      // Fetch wallet balance
      const fetchBalance = async () => {
        try {
          setLoadingBalance(true);
          console.log('Fetching balance for userEmail:', user.email);
          const { data: wallet, error } = await supabase
            .from("wallets")
            .select("balance")
            .eq("user_email", user.email)
            .single();

          if (error && error.code !== 'PGRST116') {
            console.error('Supabase wallet fetch error:', error);
            throw error;
          }

          const newBalance = wallet?.balance || 0;
          console.log('Fetched Wallet Balance:', { userEmail: user.email, balance: newBalance });
          setBalance(newBalance);
        } catch (error) {
          console.error('Error fetching balance:', error);
          setBalance(0);
        } finally {
          setLoadingBalance(false);
        }
      };

      await fetchBalance();

      // Fetch transactions
      const fetchTransactions = async () => {
        try {
          const { data: txData, error: txError } = await supabase
            .from("transactions")
            .select("amount, status, metadata, created_at")
            .eq("user_email", user.email)
            .eq("env", "live")
            .eq("status", "success")
            .order("created_at", { ascending: false })
            .limit(5);

          if (txError) throw txError;

          const formattedTransactions: Transaction[] = txData.map((tx) => ({
            type: "Wallet Funding",
            amount: tx.amount,
            method: tx.metadata?.payment_method || "Unknown",
            date: new Date(tx.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }),
          }));

          setTransactions(formattedTransactions);
        } catch (error) {
          console.error('Error fetching transactions:', error);
        }
      };

      await fetchTransactions();

      // Check for prior purchases
      const { data: dataPurchases } = await supabase
        .from("data_purchases")
        .select("id")
        .eq("user_email", user.email)
        .limit(1);

      const { data: airtimePurchases } = await supabase
        .from("airtime_purchases")
        .select("id")
        .eq("user_email", user.email)
        .limit(1);

      const { data: cablePurchases } = await supabase
        .from("cable_purchases")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      const hasPurchases =
        (dataPurchases?.length > 0 ||
          airtimePurchases?.length > 0 ||
          cablePurchases?.length > 0) &&
        !!user.user_metadata?.transaction_pin;
      setHasPriorPurchase(hasPurchases);
    } catch (error) {
      console.error("Error fetching wallet data:", error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchUserAndWallet();

    // Real-time subscription for wallet balance
    const walletSubscription = supabase
      .channel(`wallet-changes:${userEmail}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'wallets',
          filter: `user_email=eq.${userEmail}`,
        },
        async (payload) => {
          console.log('Wallet Balance Update:', payload);
          setBalance(payload.new.balance);
          await fetchUserAndWallet();
        }
      )
      .subscribe();

    // Real-time subscription for transactions
    const txSubscription = supabase
      .channel(`tx-changes:${userEmail}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_email=eq.${userEmail}`,
        },
        async () => {
          console.log('Transaction table updated, re-fetching transactions');
          await fetchUserAndWallet();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(walletSubscription);
      supabase.removeChannel(txSubscription);
    };
  }, [fetchUserAndWallet, userEmail]);

  const formattedBalance: string = `₦${balance.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
  })}`;

  const hiddenBalance: string = "₦****" + formattedBalance.slice(-3);

  const handleRecommendationPress = (rec: Recommendation) => {
    if (balance < rec.price) {
      console.log("Insufficient balance for:", rec.plan_name, "Price:", rec.price, "Balance:", balance);
      return;
    }

    const bundle: DataBundle = {
      id: Date.now(),
      data: rec.plan_name,
      price: rec.price,
      validity: rec.validity,
      category: "Data",
      description: rec.plan_name,
      variation_code: `data_${rec.plan_name.toLowerCase().replace(/\s/g, "_")}`,
      planType: "Data Plan",
    };

    const provider: Provider = {
      id: Date.now(),
      name: rec.provider,
      image: "",
      code: rec.provider.toLowerCase(),
    };

    const params: ConfirmationParams = {
      bundle: JSON.stringify(bundle),
      provider: JSON.stringify(provider),
      phoneNumber: (supabase.auth
        .getUser()
        .then(({ data: { user } }) => user?.user_metadata?.phone) ||
        "") as string,
      userEmail,
      transactionPin,
      source: "wallet",
      networkId: "0", // Placeholder, adjust if available
      planId: "0", // Placeholder, adjust if available
    };

    router.push({
      pathname: "../Confirmation",
      params: params as any,
    });
  };

  // Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    fetchUserAndWallet();
  }, [fetchUserAndWallet]);

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor:
            colorScheme === "dark" ? colors.dark.background : colors.light.background,
        },
      ]}
    >
      <StatusBar
        barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
        translucent
        backgroundColor="transparent"
      />
      <ScrollView
        contentContainerStyle={styles.inner}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colorScheme === "dark" ? "#744925" : "#3b82f6"]}
            tintColor={colorScheme === "dark" ? "#744925" : "#3b82f6"}
          />
        }
      >
        <Text
          style={[
            styles.title,
            {
              color:
                colorScheme === "dark" ? colors.dark.foreground : colors.light.foreground,
            },
          ]}
        >
          Wallet 💼
        </Text>
        <Text
          style={[
            styles.subtitle,
            { color: colorScheme === "dark" ? "#9ca3af" : "#666" },
          ]}
        >
          Manage your balance and transactions
        </Text>

        <View
          style={[
            styles.balanceCard,
            { backgroundColor: colorScheme === "dark" ? "#744925" : "#3b82f6" },
          ]}
        >
          <View style={styles.balanceHeader}>
            <Text
              style={[styles.balanceTextLabel, { color: "rgba(255,255,255,0.7)" }]}
            >
              Wallet Balance
            </Text>
            <View style={styles.headerActions}>
              <Pressable onPress={() => setShowBalance(!showBalance)}>
                <Ionicons
                  name={showBalance ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color="white"
                />
              </Pressable>
            </View>
          </View>
          <Text style={[styles.balanceAmount, { color: "white" }]}>
            {loadingBalance ? "Loading..." : (showBalance ? formattedBalance : hiddenBalance)}
          </Text>
        </View>

        <MotiView
          from={{ scale: 1 }}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ loop: true, type: "timing", duration: 1500 }}
          style={styles.fundButtonContainer}
        >
          <Pressable
            onPress={() => router.push("/(app)/fund")}
            style={[
              styles.fundButton,
              {
                backgroundColor: colorScheme === "dark" ? "#744925" : "#2563eb",
              },
            ]}
          >
            <Ionicons name="add-circle-outline" size={20} color="white" />
            <Text style={[styles.fundButtonText, { color: "white" }]}>
              Fund Wallet
            </Text>
          </Pressable>
        </MotiView>

        <Pressable
          onPress={() => setShowTransactions(!showTransactions)}
          style={styles.transactionToggle}
        >
          <Text
            style={[
              styles.transactionTitle,
              {
                color:
                  colorScheme === "dark" ? colors.dark.foreground : colors.light.foreground,
              },
            ]}
          >
            🧾 Recent Transactions
          </Text>
          <Ionicons
            name={showTransactions ? "chevron-up-outline" : "chevron-down-outline"}
            size={22}
            color={
              colorScheme === "dark" ? colors.dark.foreground : colors.light.foreground
            }
          />
        </Pressable>

        {showTransactions && (
          <View style={styles.transactionList}>
            {transactions.length > 0 ? (
              transactions.map((tx, index) => (
                <View
                  key={index}
                  style={[
                    styles.transactionItem,
                    {
                      backgroundColor: colorScheme === "dark" ? "#171717" : "#f5f5f5",
                      borderColor:
                        colorScheme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
                    },
                  ]}
                >
                  <View>
                    <Text
                      style={[
                        styles.transactionType,
                        {
                          color:
                            colorScheme === "dark"
                              ? colors.dark.foreground
                              : colors.light.foreground,
                        },
                      ]}
                    >
                      {tx.type}
                    </Text>
                    <Text
                      style={[
                        styles.transactionDetails,
                        { color: colorScheme === "dark" ? "#9ca3af" : "#666" },
                      ]}
                    >
                      {tx.method} • {tx.date}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.transactionAmount,
                      { color: tx.amount < 0 ? "#f87171" : "#34d399" },
                    ]}
                  >
                    {tx.amount < 0 ? "-" : "+"}₦
                    {Math.abs(tx.amount).toLocaleString("en-NG", {
                      minimumFractionDigits: 0,
                    })}
                  </Text>
                </View>
              ))
            ) : (
              <Text
                style={[
                  styles.transactionDetails,
                  { color: colorScheme === "dark" ? "#9ca3af" : "#666" },
                ]}
              >
                No transactions yet
              </Text>
            )}
          </View>
        )}

        {!showTransactions && (
          <View style={styles.recommendationsSection}>
            {balance > 0 && hasPriorPurchase ? (
              <>
                <Text
                  style={[
                    styles.recommendationsTitle,
                    {
                      color:
                        colorScheme === "dark"
                          ? colors.dark.foreground
                          : colors.light.foreground,
                    },
                  ]}
                >
                  💡 Recommended Purchases
                </Text>
                {isPurchaseHistoryLoading ? (
                  <Text
                    style={[
                      styles.recommendationText,
                      { color: colorScheme === "dark" ? "#9ca3af" : "#666" },
                    ]}
                  >
                    Loading recommendations...
                  </Text>
                ) : currentRecommendations.length > 0 ? (
                  <View style={styles.recommendationsList}>
                    {currentRecommendations.map((rec, index) => (
                      <MotiView
                        key={rec.id}
                        from={{
                          translateX: index % 2 === 0 ? -100 : 100,
                          opacity: 0,
                        }}
                        animate={{ translateX: 0, opacity: 1 }}
                        transition={{
                          type: "timing",
                          duration: 800,
                          delay: index * 500,
                        }}
                        style={[
                          styles.recommendationContainer,
                          index % 2 === 0
                            ? {
                                alignSelf: "flex-start",
                                backgroundColor: colorScheme === "dark" ? "#1e3a8a" : "#3b82f6",
                              }
                            : {
                                alignSelf: "flex-end",
                                backgroundColor: colorScheme === "dark" ? "#6d28d9" : "#8b5cf6",
                              },
                        ]}
                      >
                        <Pressable onPress={() => handleRecommendationPress(rec)}>
                          <Text
                            style={[styles.recommendationText, { color: "white" }]}
                          >
                            {rec.plan_name} - ₦{rec.price}
                          </Text>
                        </Pressable>
                      </MotiView>
                    ))}
                  </View>
                ) : (
                  <Text
                    style={[
                      styles.recommendationText,
                      { color: colorScheme === "dark" ? "#9ca3af" : "#666" },
                    ]}
                  >
                    No recent purchases found in the last 24 hours.
                  </Text>
                )}
              </>
            ) : (
              <Text
                style={[
                  styles.recommendationsTitle,
                  {
                    color:
                      colorScheme === "dark"
                        ? colors.dark.foreground
                        : colors.light.foreground,
                  },
                ]}
              >
                {hasPriorPurchase
                  ? "Fund your wallet to see recommended purchases!"
                  : "Make a purchase and set a transaction PIN to see recommendations!"}
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  inner: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  balanceCard: {
    padding: 24,
    borderRadius: 20,
    marginBottom: 24,
    shadowColor: "#fff",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  balanceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  balanceTextLabel: {
    fontSize: 14,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: "bold",
    marginTop: 8,
  },
  fundButtonContainer: {
    marginBottom: 24,
  },
  fundButton: {
    paddingVertical: 16,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  fundButtonText: {
    marginLeft: 8,
    fontWeight: "600",
  },
  transactionToggle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  transactionTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  transactionList: {
    gap: 16,
    marginBottom: 24,
  },
  transactionItem: {
    padding: 16,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
  },
  transactionType: {
    fontWeight: "500",
  },
  transactionDetails: {
    fontSize: 12,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: "bold",
  },
  recommendationsSection: {
    marginBottom: 24,
  },
  recommendationsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  recommendationsList: {
    gap: 8,
  },
  recommendationContainer: {
    maxWidth: "70%",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  recommendationText: {
    fontSize: 14,
  },
});