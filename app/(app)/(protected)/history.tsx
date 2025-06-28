import { useState, useEffect, useCallback } from "react";
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Alert,
  Modal,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import moment from "moment-timezone";
import { SwipeWrapper } from "../../../components/SwipeWrapper";

import { supabase } from "@/config/supabase";

import { debounce } from "lodash";

interface HistoryItem {
  id: string;
  provider: string;
  data: string;
  price: number;
  date: string;
  status: "Success" | "Failed" | "Pending" | "Unknown";
  phoneNumber: string;
  reference: string;
  metadata: {
    payment_date?: string;
    payment_method?: string;
    phone_number?: string;
    fees?: {
      transfer_fee: number;
      wallet_management_fee: number;
      api_network_fee: number;
      vat: number;
      total_fee: number;
      net_amount: number;
    };
    provider?: string;
    plan?: string;
    purchase?: string;
    validity?: string;
    actual_cost?: number;
    plan_id?: number;
    network_id?: number;
    sold_at?: number;
    bought_at?: number;
    profit?: number;
    gross_amount?: number;
  };
  type: string;
}

const statusColors: { [key: string]: string } = {
  Success: "#22c55e",
  Failed: "#ef4444",
  Pending: "#eab308",
  Unknown: "#888",
};

export default function HistoryScreen() {
  const pathname = usePathname();
  const [filter, setFilter] = useState<
    "All" | "Success" | "Failed" | "Pending"
  >("All");
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [userEmail, setUserEmail] = useState<string>("");
  const [selectedTransaction, setSelectedTransaction] =
    useState<HistoryItem | null>(null);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    console.log(`HistoryScreen mounted, pathname: ${pathname}`);
  }, [pathname]);

  const fetchHistory = useCallback(async () => {
    try {
      setRefreshing(true);
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user || !user.email) {
        console.error(
          "User not authenticated or email missing:",
          authError?.message
        );
        Alert.alert("Error", "Please log in to view your transaction history.");
        router.replace("/sign-in");
        return;
      }

      console.log("Authenticated user email:", user.email);
      setUserEmail(user.email);

      const { data: txData, error: txError } = await supabase
        .from("transactions")
        .select(
          `
          id,
          amount,
          status,
          metadata,
          created_at,
          reference,
          type,
          user_email
        `
        )
        .eq("user_email", user.email)
        .order("created_at", { ascending: false });

      if (txError) {
        console.error("Transaction fetch error:", txError.message);
        throw new Error("Failed to fetch transaction history");
      }

      if (txData.length === 0) {
        console.log("No transactions found for user:", user.email);
        Alert.alert(
          "No Transactions",
          "No transactions found for this account."
        );
        setHistory([]);
        return;
      }

      console.log("Raw transaction data:", JSON.stringify(txData, null, 2));

      const knownProviders = ["glo", "mtn", "airtel", "9mobile"];

      const formattedHistory: HistoryItem[] = txData.map((tx) => {
        let provider = "Unknown Provider";
        let data = "Unknown Transaction";
        let phoneNumber = "N/A";

        const transactionType = (tx.type || "unknown").toLowerCase().trim();
        console.log(
          `Transaction ID: ${tx.id}, Type: ${transactionType}, Metadata: ${JSON.stringify(
            tx.metadata,
            null,
            2
          )}`
        );

        const parseProviderFromString = (
          input: string
        ): { provider: string; data: string } | null => {
          const inputLower = input.toLowerCase();
          const matchedProvider = knownProviders.find((p) =>
            inputLower.includes(p)
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
                `${
                  transactionType.charAt(0).toUpperCase() +
                  transactionType.slice(1)
                } Purchase`,
            };
          }
          return null;
        };

        if (transactionType === "data") {
          provider = tx.metadata?.provider || "Unknown Provider";
          data = tx.metadata?.plan || tx.metadata?.purchase || "Data Purchase";
          phoneNumber = tx.metadata?.phone_number || "N/A";
          if (provider === "Unknown Provider") {
            const parsed =
              (tx.metadata?.plan && parseProviderFromString(tx.metadata.plan)) ||
              (tx.metadata?.purchase &&
                parseProviderFromString(tx.metadata.purchase));
            if (parsed) {
              provider = parsed.provider;
              data = parsed.data;
            }
          }
        } else if (transactionType === "deposit") {
          data = "Wallet Funding";
          provider = tx.metadata?.payment_method || "Payment Gateway";
          phoneNumber = tx.metadata?.phone_number || "N/A";
        } else {
          data =
            tx.metadata?.plan ||
            tx.metadata?.purchase ||
            transactionType.charAt(0).toUpperCase() + transactionType.slice(1);
          provider = tx.metadata?.provider || "Unknown Provider";
          phoneNumber = tx.metadata?.phone_number || "N/A";
          if (provider === "Unknown Provider") {
            const parsed =
              (tx.metadata?.plan && parseProviderFromString(tx.metadata.plan)) ||
              (tx.metadata?.purchase &&
                parseProviderFromString(tx.metadata.purchase));
            if (parsed) {
              provider = parsed.provider;
              data = parsed.data;
            }
          }
        }

        const normalizedStatus = (tx.status || "unknown").toLowerCase();
        const status = ["success", "failed", "pending"].includes(
          normalizedStatus
        )
          ? ((normalizedStatus.charAt(0).toUpperCase() +
              normalizedStatus.slice(1)) as
              | "Success"
              | "Failed"
              | "Pending")
          : "Unknown";

        return {
          id: tx.id,
          provider,
          data,
          price: Math.abs(tx.amount || 0),
          date: tx.created_at,
          status,
          phoneNumber,
          reference: tx.reference || "N/A",
          metadata: tx.metadata || {},
          type: tx.type || "Unknown",
        };
      });

      console.log(
        "Formatted history:",
        JSON.stringify(formattedHistory, null, 2)
      );
      setHistory(formattedHistory);
    } catch (error: any) {
      console.error("Error fetching history:", {
        message: error.message,
        stack: error.stack,
      });
      Alert.alert(
        "Error",
        "Failed to load transaction history. Please try again."
      );
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const onRefresh = useCallback(() => {
    fetchHistory();
  }, [fetchHistory]);

  const filteredHistory =
    filter === "All" ? history : history.filter((h) => h.status === filter);

  const formatAmount = (amount: number) => {
    return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
  };

  const handleScroll = (event: any) => {
    const { velocity } = event.nativeEvent;
    if (velocity && Math.abs(velocity.y) > 0.5) {
      flatListRef.current?.setNativeProps({ scrollEnabled: true });
    } else {
      flatListRef.current?.setNativeProps({ scrollEnabled: true });
    }
  };

  const handlePressTransaction = useCallback(
    debounce((item: HistoryItem) => {
      console.log("Opening receipt for transaction:", item.id);
      setIsModalLoading(true);
      setTimeout(() => {
        try {
          setSelectedTransaction(item);
          setIsModalLoading(false);
        } catch (error: any) {
          console.error("Error setting transaction:", {
            message: error.message,
            stack: error.stack,
          });
          Alert.alert("Error", "Failed to load receipt. Please try again.");
          setIsModalLoading(false);
        }
      }, 100); // Small delay to stabilize state update
    }, 500, { leading: true, trailing: false }),
    []
  );

  const renderReceipt = () => {
    if (!selectedTransaction) return null;

    const {
      price,
      reference,
      metadata = {},
      date,
      status,
      provider,
      phoneNumber,
      type,
      data,
    } = selectedTransaction;

    // Defensive checks for metadata properties
    const fees = metadata.fees || {
      transfer_fee: 0,
      wallet_management_fee: 0,
      api_network_fee: 0,
      vat: 0,
      total_fee: 0,
      net_amount: 0,
    };

    return (
      <Modal
        visible={!!selectedTransaction}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          console.log("Closing receipt modal");
          setSelectedTransaction(null);
          setIsModalLoading(false);
        }}
      >
        <View style={styles.modalOverlay}>
          {isModalLoading ? (
            <View style={styles.modalLoadingContainer}>
              <ActivityIndicator size="large" color="#00FF00" />
              <Text style={styles.loadingText}>Loading receipt...</Text>
            </View>
          ) : (
            <View style={styles.receiptContainer}>
              <Pressable
                style={styles.closeButton}
                onPress={() => {
                  console.log("Close button pressed");
                  setSelectedTransaction(null);
                  setIsModalLoading(false);
                }}
              >
                <Ionicons name="close" size={24} color="#FFF" />
              </Pressable>
              <ScrollView>
                <Text style={styles.receiptTitle}>
                  {type.toLowerCase() === "deposit"
                    ? "Deposit Receipt"
                    : "Purchase Receipt"}
                </Text>
                <View style={styles.receiptDivider} />
                <Text style={styles.receiptField}>Reference: {reference || "N/A"}</Text>
                {type.toLowerCase() === "deposit" ? (
                  <>
                    <Text style={styles.receiptField}>
                      Amount Received:{" "}
                      {formatAmount(metadata.gross_amount || price || 0)}
                    </Text>
                    <Text style={styles.receiptField}>Fees:</Text>
                    <Text style={styles.receiptSubField}>
                      - Transfer Fee: {formatAmount(fees.transfer_fee || 0)}
                    </Text>
                    <Text style={styles.receiptSubField}>
                      - Wallet Management Fee:{" "}
                      {formatAmount(fees.wallet_management_fee || 0)}
                    </Text>
                    <Text style={styles.receiptSubField}>
                      - API & Network Fee: {formatAmount(fees.api_network_fee || 0)}
                    </Text>
                    <Text style={styles.receiptSubField}>
                      - VAT: {formatAmount(fees.vat || 0)}
                    </Text>
                    <Text style={styles.receiptField}>
                      Total Fees: {formatAmount(fees.total_fee || 0)}
                    </Text>
                    <Text style={styles.receiptField}>
                      Amount Credited: {formatAmount(price || 0)}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.receiptField}>Plan: {data || "N/A"}</Text>
                    <Text style={styles.receiptField}>
                      Provider: {provider || "N/A"}
                    </Text>
                    <Text style={styles.receiptField}>
                      Amount: {formatAmount(price || 0)}
                    </Text>
                    <Text style={styles.receiptField}>
                      Phone Number: {phoneNumber || "N/A"}
                    </Text>
                    <Text style={styles.receiptField}>
                      Validity: {metadata.validity || "N/A"}
                    </Text>
                  </>
                )}
                <Text style={styles.receiptField}>
                  Date:{" "}
                  {(date && moment(date).tz("Africa/Lagos").format("MMM D, YYYY h:mm A")) ||
                    "N/A"}
                </Text>
                <Text style={styles.receiptField}>
                  Status: {status || "Unknown"}
                </Text>
                <Text style={styles.receiptField}>
                  Payment Method: {metadata.payment_method || "Not Available"}
                </Text>
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>
    );
  };

  const renderItem = ({ item }: { item: HistoryItem }) => (
    <Pressable
      onPress={() => handlePressTransaction(item)}
      style={styles.historyItem}
    >
      <View style={styles.historyItemHeader}>
        <Text style={styles.historyTitle}>
          {item.provider} - {item.data}
        </Text>
        <Text
          style={[styles.historyStatus, { color: statusColors[item.status] }]}
        >
          {item.status}
        </Text>
      </View>
      <Text style={styles.historyPrice}>{formatAmount(item.price)}</Text>
      <Text style={styles.historyPhone}>Phone: {item.phoneNumber}</Text>
      <Text style={styles.historyDate}>
        Date: {(item.date && moment(item.date).tz("Africa/Lagos").format("MMM D, YYYY h:mm A")) || "N/A"}
      </Text>
    </Pressable>
  );

  return (
    <SwipeWrapper flatListRef={flatListRef}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back-outline" size={24} color="white" />
          </Pressable>
          <Text style={styles.title}>Transaction History</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.filterTabs}>
          {["All", "Success", "Failed", "Pending"].map((item) => (
            <Pressable
              key={item}
              onPress={() => setFilter(item as typeof filter)}
              style={[
                styles.filterButton,
                filter === item && styles.activeFilterButton,
              ]}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  filter === item && styles.activeFilterButtonText,
                ]}
              >
                {item}
              </Text>
            </Pressable>
          ))}
        </View>
        <FlatList
          ref={flatListRef}
          data={filteredHistory}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onScroll={handleScroll}
          scrollEventThrottle={16}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color="#888" />
              <Text style={styles.emptyStateText}>No history to show</Text>
            </View>
          }
        />
        {renderReceipt()}
      </SafeAreaView>
    </SwipeWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1A2526", // Match FundScreen's background
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginTop: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: "700", // Match FundScreen's font weight
    color: "#fff",
    letterSpacing: 0.5, // Match FundScreen's style
  },
  filterTabs: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#3A4A4B",
    backgroundColor: "#2A3A3B", // Match FundScreen's input background
    marginTop: 10,
  },
  activeFilterButton: {
    backgroundColor: "#00FF00", // Match FundScreen's accent color
    borderColor: "#00FF00",
  },
  filterButtonText: {
    fontSize: 14,
    color: "#fff",
  },
  activeFilterButtonText: {
    color: "#000", // Contrast with active button background
    fontWeight: "700",
  },
  historyItem: {
    backgroundColor: "#2A3A3B", // Match FundScreen's input background
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: "#3A4A4B",
  },
  historyItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  historyTitle: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  historyStatus: {
    fontSize: 12,
    fontWeight: "700",
  },
  historyPrice: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  historyPhone: {
    color: "#888",
    fontSize: 14,
  },
  historyDate: {
    color: "#888",
    fontSize: 12,
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 80,
  },
  emptyStateText: {
    color: "#888",
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalLoadingContainer: {
    backgroundColor: "#2A3A3B",
    borderRadius: 8,
    padding: 16,
    width: "90%",
    alignItems: "center",
  },
  receiptContainer: {
    backgroundColor: "#2A3A3B",
    borderRadius: 8,
    padding: 16,
    width: "90%",
    maxHeight: "80%",
  },
  closeButton: {
    alignSelf: "flex-end",
  },
  receiptTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFF",
    marginBottom: 8,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: "#888",
    marginVertical: 8,
  },
  receiptField: {
    fontSize: 14,
    color: "#FFF",
    marginBottom: 4,
  },
  receiptSubField: {
    fontSize: 14,
    color: "#FFF",
    marginLeft: 16,
    marginBottom: 4,
  },
  loadingText: {
    color: "#FFF",
    fontSize: 16,
    marginTop: 10,
  },
});