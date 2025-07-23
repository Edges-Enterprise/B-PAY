import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  FlatList,
  RefreshControl,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { MotiView } from "moti";
import { supabase } from "@/config/supabase";
import { usePurchaseHistory } from "@/hooks/useHomeScreenData";
import SwipeWrapper from "../../../components/SwipeWrapper";
import { useSupabase } from "@/context/supabase-provider";

interface Transaction {
  type: string;
  amount: number;
  method?: string;
  date: string;
  details?: string;
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
  planId?: number;
}

export default function WalletScreen() {
  const { user, session, initialized, isLoadingSession } = useSupabase();
  const [showTransactions, setShowTransactions] = useState(false);
  const [balance, setBalance] = useState(0);
  const [userEmail, setUserEmail] = useState("");
  const [transactionPin, setTransactionPin] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [hasPriorPurchase, setHasPriorPurchase] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const fetchUserAndWallet = useCallback(async () => {
    if (!initialized || isLoadingSession || !user || !session) {
      return;
    }

    try {
      setRefreshing(true);
      setUserEmail(user.email || "");
      setTransactionPin(user.user_metadata?.transaction_pin || "");

      const { data: wallet, error: walletError } = await supabase
        .from("wallet")
        .select("balance")
        .eq("user_email", user.email)
        .single();

      if (!walletError) {
        setBalance(wallet?.balance || 0);
      }

      const subscription = supabase
        .channel(`wallet:user_email=${user.email}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "wallet",
            filter: `user_email=eq.${user.email}`,
          },
          (payload) => {
            const newBalance = payload.new.balance;
            setBalance(newBalance ?? 0);
            console.log("Wallet balance updated:", newBalance);
          }
        )
        .subscribe();

      const { data: txData, error: txError } = await supabase
        .from("transactions")
        .select("amount, status, metadata, created_at, type")
        .eq("user_email", user.email)
        .eq("status", "success")
        .order("created_at", { ascending: false })
        .limit(5);

      if (txError) throw txError;

      // const mappedTransactions = txData.map((tx) => {
      //   const metaType = tx.metadata?.type?.toLowerCase().trim();
      //   let transactionType = "Wallet Funding";
      //   if (metaType === "data") {
      //     transactionType = "Data Purchase";
      //   } else if (metaType === "airtime") {
      //     transactionType = "Airtime Purchase";
      //   }
      //   return {
      //     type: transactionType,
      //     amount: tx.amount,
      //     method: tx.metadata?.payment_method || tx.metadata?.provider || "Unknown",
      //     details: tx.metadata?.purchase || tx.metadata?.plan_name || null,
      //     date: new Date(tx.created_at).toLocaleDateString("en-US", {
      //       month: "short",
      //       day: "numeric",
      //       year: "numeric",
      //     }),
      //   };
      // });

      console.log("tx Data:", txData)
      const mappedTransactions = txData.map((tx) => {
				let transactionType = "Wallet Funding";
				let method =
					tx.metadata?.payment_method || tx.metadata?.provider || "Unknown";
				let details = tx.metadata?.purchase || tx.metadata?.plan || null;

				const transactionTypeRaw = (tx.type || tx.metadata?.type || "unknown")
					.toLowerCase()
					.trim();
				const knownProviders = ["glo", "mtn", "airtel", "9mobile"];

				const parseProviderFromString = (
					input: string,
				): { provider: string; data: string } | null => {
					const inputLower = input.toLowerCase();
					const matchedProvider = knownProviders.find((p) =>
						inputLower.includes(p),
					);
					if (matchedProvider) {
						const cleanedData = input
							.replace(new RegExp(`\\b${matchedProvider}\\b`, "i"), "")
							.replace(/\s+/g, " ")
							.trim();
						return {
							provider:
								matchedProvider.charAt(0).toUpperCase() +
								matchedProvider.slice(1),
							data:
								cleanedData ||
								`${transactionTypeRaw.charAt(0).toUpperCase() + transactionTypeRaw.slice(1)} Purchase`,
						};
					}
					return null;
				};

				if (
					transactionTypeRaw === "data" ||
					(tx.metadata?.plan && tx.amount < 0)
				) {
					transactionType = "Data Purchase";
					method = tx.metadata?.provider || "Unknown Provider";
					details =
						tx.metadata?.plan || tx.metadata?.purchase || "Data Purchase";
					if (method === "Unknown Provider") {
						const parsed =
							(tx.metadata?.plan &&
								parseProviderFromString(tx.metadata.plan)) ||
							(tx.metadata?.purchase &&
								parseProviderFromString(tx.metadata.purchase));
						if (parsed) {
							method = parsed.provider;
							details = parsed.data;
						}
					}
				} else if (
					transactionTypeRaw === "airtime" ||
					(tx.metadata?.purchase?.toLowerCase().includes("airtime") &&
						tx.amount < 0)
				) {
					transactionType = "Airtime Purchase";
					method = tx.metadata?.provider || "Unknown Provider";
					details =
						tx.metadata?.plan || tx.metadata?.purchase || "Airtime Purchase";
					if (method === "Unknown Provider") {
						const parsed =
							(tx.metadata?.plan &&
								parseProviderFromString(tx.metadata.plan)) ||
							(tx.metadata?.purchase &&
								parseProviderFromString(tx.metadata.purchase));
						if (parsed) {
							method = parsed.provider;
							details = parsed.data;
						}
					}
				} else if (
					transactionTypeRaw === "deposit" ||
					(tx.metadata?.payment_method === "Paystack" && tx.amount > 0)
				) {
					transactionType = "Wallet Funding";
					method = tx.metadata?.payment_method || "Payment Gateway";
					details = "Wallet Funding";
				} else {
					transactionType =
						transactionTypeRaw.charAt(0).toUpperCase() +
						transactionTypeRaw.slice(1);
					method = tx.metadata?.provider || "Unknown Provider";
					details =
						tx.metadata?.plan || tx.metadata?.purchase || transactionType;
					if (method === "Unknown Provider") {
						const parsed =
							(tx.metadata?.plan &&
								parseProviderFromString(tx.metadata.plan)) ||
							(tx.metadata?.purchase &&
								parseProviderFromString(tx.metadata.purchase));
						if (parsed) {
							method = parsed.provider;
							details = parsed.data;
						}
					}
				}

				return {
					type: transactionType,
					amount: tx.amount,
					method,
					details,
					date: new Date(tx.created_at).toLocaleDateString("en-US", {
						month: "short",
						day: "numeric",
						year: "numeric",
					}),
				};
			});

      setTransactions(mappedTransactions);

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
      const hasPurchases =
        (dataPurchases?.length > 0 || airtimePurchases?.length > 0) &&
        !!user.user_metadata?.transaction_pin;
      setHasPriorPurchase(hasPurchases);

      return () => {
        supabase.removeChannel(subscription);
      };
    } catch (error) {
      console.error("Error fetching wallet data:", error);
    } finally {
      setRefreshing(false);
    }
  }, [user, session, initialized, isLoadingSession]);

  useEffect(() => {
    fetchUserAndWallet();
    const interval = setInterval(fetchUserAndWallet, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchUserAndWallet]);

  const onRefresh = useCallback(() => {
    fetchUserAndWallet();
  }, [fetchUserAndWallet]);

  const formattedBalance = `₦${balance.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
  })}`;

  const handleRecommendationPress = (rec: Recommendation) => {
    if (balance < rec.price || !user || !session) return;

    const bundle = {
      id: Date.now(),
      data: rec.plan_name,
      price: rec.price,
      validity: rec.validity,
      category: "Data",
      description: rec.plan_name,
      variation_code: `data_${rec.plan_name.toLowerCase().replace(/\s/g, "_")}`,
      planType: "Data Plan",
    };

    const provider = {
      id: Date.now(),
      name: rec.provider,
      image: "",
      code: rec.provider.toLowerCase(),
    };

    const params = {
      bundle: JSON.stringify(bundle),
      provider: JSON.stringify(provider),
      phoneNumber: user.user_metadata?.phone || user.user_metadata?.mobile_number,
      userEmail: user.email,
      transactionPin,
      source: "wallet",
      networkId: "0",
      planId: 0,
      balance: balance.toString(),
    };
    router.push({
      pathname: "../Confirmation",
      params: params as any,
    });
  };

  const handleProviderPress = (provider: Provider) => {
    const params = {
      provider: JSON.stringify(provider),
      networkId: provider.id.toString(),
      balance: balance.toString(),
    };
    router.push({
      pathname: "/(app)/(protected)/buy",
      params,
    });
  };

  const getProviderFromPlan = (plan: string): string => {
    const planUpper = plan.toUpperCase();
    if (planUpper.includes("MTN")) return "MTN";
    if (planUpper.includes("GLO")) return "GLO";
    if (planUpper.includes("AIRTEL")) return "AIRTEL";
    if (planUpper.includes("9MOBILE") || planUpper.includes("ETISALAT"))
      return "9MOBILE";
    return "Unknown";
  };

  const { data: purchaseHistory = [] } = usePurchaseHistory();
  const currentRecommendations: Recommendation[] = purchaseHistory.map((p, index) => {
    const amountMatch = p.plan_name?.match(/₦(\d+)/);
    return {
      id: `${p.id}-${index}`,
      plan_name: p.plan_name || "Unknown Plan",
      provider: p.provider_name || getProviderFromPlan(p.plan_name || ""),
      price: amountMatch ? parseInt(amountMatch[1], 10) + 50 : 450,
      validity: p.validity || "N/A",
    };
  });

  const renderTransactionItem = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionItem}>
      <View>
        <Text style={styles.transactionType}>{item.type}</Text>
        <Text style={styles.transactionDetails}>
          {item.details || item.method} • {item.date}
        </Text>
      </View>
      <Text
        style={[
          styles.transactionAmount,
          { color: item.amount < 0 ? "#f87171" : "#34d399" },
        ]}
      >
        {item.amount < 0 ? "-" : "+"}₦
        {Math.abs(item.amount).toLocaleString("en-NG", {
          minimumFractionDigits: 0,
        })}
      </Text>
    </View>
  );

  const emptyTransactions = () => (
    <Text style={[styles.transactionDetails, { textAlign: "center", marginVertical: 16 }]}>
      No transactions yet
    </Text>
  );

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { velocity } = event.nativeEvent;
    if (velocity && Math.abs(velocity.y) > 0.5) {
      flatListRef.current?.setNativeProps({ scrollEnabled: true });
    } else {
      flatListRef.current?.setNativeProps({ scrollEnabled: true });
    }
  };

  return (
    <SwipeWrapper>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <FlatList
          ref={flatListRef}
          data={[{ key: "wallet" }]}
          renderItem={() => (
            <>
              <View style={styles.header}>
                <Text style={styles.title}>Wallet 💼</Text>
                <Text style={styles.subtitle}>Manage your balance and transactions</Text>
              </View>
              <View style={styles.balanceCard}>
                <View style={styles.balanceHeader}>
                  <Text style={{ color: "rgba(255,255,255,0.7)" }}>
                    Wallet Balance
                  </Text>
                  <Ionicons name="eye-outline" size={20} color="white" />
                </View>
                <Text style={{ color: "white", fontSize: 32, fontWeight: "bold" }}>
                  {formattedBalance}
                </Text>
              </View>
              <MotiView
                from={{ scale: 1 }}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ loop: true, duration: 1500 }}
                style={styles.fundButtonContainer}
              >
                <Pressable
                  onPress={() => router.push("/fund")} // Updated path
                  style={styles.fundButton}
                >
                  <Ionicons name="add-circle-outline" size={20} color="white" />
                  <Text style={{ color: "white", marginLeft: 8, fontWeight: "600" }}>
                    Fund Wallet
                  </Text>
                </Pressable>
              </MotiView>
              <Pressable
                onPress={() => setShowTransactions(!showTransactions)}
                style={styles.transactionToggle}
              >
                <Text style={styles.transactionTitle}>🧾 Recent Transactions</Text>
                <Ionicons
                  name={showTransactions ? "chevron-up-outline" : "chevron-down-outline"}
                  size={22}
                  color="#fff"
                />
              </Pressable>
              {showTransactions && (
                <FlatList
                  data={transactions}
                  keyExtractor={(item, index) => index.toString()}
                  renderItem={renderTransactionItem}
                  contentContainerStyle={styles.transactionList}
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={emptyTransactions}
                  nestedScrollEnabled
                />
              )}
              {!showTransactions && hasPriorPurchase && (
                <View style={styles.recommendationsSection}>
                  <Text style={styles.recommendationsTitle}>💡 Recommended Purchases</Text>
                  {currentRecommendations.length > 0 ? (
                    <View style={styles.recommendationsList}>
                      {currentRecommendations.map((rec, index) => (
                        <MotiView
                          key={rec.id}
                          from={{ translateX: index % 2 === 0 ? -100 : 100, opacity: 0 }}
                          animate={{ translateX: 0, opacity: 1 }}
                          transition={{ delay: index * 500 }}
                          style={[
                            styles.recommendationContainer,
                            index % 2 === 0
                              ? { alignSelf: "flex-start", backgroundColor: "#1e3a8a" }
                              : { alignSelf: "flex-end", backgroundColor: "#6d28d9" },
                          ]}
                        >
                          <Pressable onPress={() => handleRecommendationPress(rec)}>
                            <Text style={{ color: "white" }}>
                              {rec.plan_name} - ₦{rec.price}
                            </Text>
                          </Pressable>
                        </MotiView>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.recommendationText}>
                      No recent purchases found in the last 24 hours.
                    </Text>
                  )}
                </View>
              )}
              {!showTransactions && !hasPriorPurchase && (
                <Text style={styles.recommendationsTitle}>
                  Make a purchase and set a transaction PIN to see recommendations!
                </Text>
              )}
            </>
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#fff"
              colors={["#744925"]}
            />
          }
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        />
      </SafeAreaView>
    </SwipeWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
    paddingTop: StatusBar.currentHeight,
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#9ca3af",
  },
  balanceCard: {
    backgroundColor: "#744925",
    padding: 24,
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 24,
  },
  balanceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: "bold",
    color: "white",
  },
  fundButtonContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  fundButton: {
    backgroundColor: "#744925",
    paddingVertical: 16,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  fundButtonText: {
    marginLeft: 8,
    fontWeight: "600",
    color: "white",
  },
  transactionToggle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  transactionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  transactionList: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  transactionItem: {
    backgroundColor: "#171717",
    borderColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    padding: 16,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  transactionType: {
    fontWeight: "500",
    color: "#fff",
  },
  transactionDetails: {
    fontSize: 12,
    color: "#9ca3af",
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: "bold",
  },
  recommendationsSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  recommendationsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  recommendationsList: {
    gap: 8,
    paddingHorizontal: 16,
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
    color: "#9ca3af",
  },
});