import { useState, useEffect, useCallback, useRef } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import moment from "moment-timezone";
import { supabase } from "@/config/supabase";
import SwipeWrapper from "../../../components/SwipeWrapper";

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
		error_message?: string;
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
	const flatListRef = useRef<FlatList>(null);

	// useEffect(() => {
	// 	console.log(`HistoryScreen mounted, pathname: ${pathname}`);
	// }, [pathname]);

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
					authError?.message,
				);
				Alert.alert("Error", "Please log in to view your transaction history.");
				router.replace("/sign-in");
				return;
			}

			// console.log("Authenticated user email:", user.email);
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
        `,
				)
				.eq("user_email", user.email)
				.order("created_at", { ascending: false });

			if (txError) {
				console.error("Transaction fetch error:", txError.message);
				throw new Error("Failed to fetch transaction history");
			}

			if (txData.length === 0) {
				// console.log("No transactions found for user:", user.email);
				Alert.alert(
					"No Transactions",
					"No transactions found for this account.",
				);
				setHistory([]);
				return;
			}

			// console.log("Raw transaction data:", JSON.stringify(txData, null, 2));

			const knownProviders = ["glo", "mtn", "airtel", "9mobile"];

			const formattedHistory: HistoryItem[] = txData.map((tx) => {
				let provider = "Unknown Provider";
				let data = "Unknown Transaction";
				let phoneNumber = "N/A";

				const transactionType = (tx.type || "unknown").toLowerCase().trim();
				// console.log(
				// 	`Transaction ID: ${tx.id}, Type: ${transactionType}, Metadata: ${JSON.stringify(tx.metadata, null, 2)}`,
				// );

				// Enhanced helper function to parse provider from string (combining both approaches)
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
								`${transactionType.charAt(0).toUpperCase() + transactionType.slice(1)} Purchase`,
						};
					}
					return null;
				};

				if (transactionType === "data") {
					provider = tx.metadata?.provider || "Unknown Provider";
					// Try both plan and purchase fields from version 1 and 2
					data = tx.metadata?.plan || tx.metadata?.purchase || "Data Purchase";
					phoneNumber = tx.metadata?.phone_number || "N/A";
					if (provider === "Unknown Provider") {
						// Try parsing from both plan and purchase fields
						const parsed =
							(tx.metadata?.plan &&
								parseProviderFromString(tx.metadata.plan)) ||
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
					// Try both plan and purchase fields for other transaction types
					data =
						tx.metadata?.plan ||
						tx.metadata?.purchase ||
						transactionType.charAt(0).toUpperCase() + transactionType.slice(1);
					provider = tx.metadata?.provider || "Unknown Provider";
					phoneNumber = tx.metadata?.phone_number || "N/A";
					if (provider === "Unknown Provider") {
						const parsed =
							(tx.metadata?.plan &&
								parseProviderFromString(tx.metadata.plan)) ||
							(tx.metadata?.purchase &&
								parseProviderFromString(tx.metadata.purchase));
						if (parsed) {
							provider = parsed.provider;
							data = parsed.data;
						}
					}
				}

				// Normalize status with proper capitalization
				const normalizedStatus = (tx.status || "unknown").toLowerCase();
				const status = ["success", "failed", "pending"].includes(
					normalizedStatus,
				)
					? ((normalizedStatus.charAt(0).toUpperCase() +
							normalizedStatus.slice(1)) as "Success" | "Failed" | "Pending")
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

			// console.log(
			// 	"Formatted history:",
			// 	JSON.stringify(formattedHistory, null, 2),
			// );
			setHistory(formattedHistory);
		} catch (error) {
			console.error("Error fetching history:", error);
			Alert.alert(
				"Error",
				"Failed to load transaction history. Please try again.",
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

	const renderReceipt = () => {
		if (!selectedTransaction) return null;
		const {
			price,
			reference,
			metadata,
			date,
			status,
			provider,
			phoneNumber,
			type,
			data,
		} = selectedTransaction;

		// Enhanced fees handling with proper defaults from version 1
		const fees = metadata.fees || {
			transfer_fee: 0,
			wallet_management_fee: 0,
			api_network_fee: 0,
			vat: 0,
			total_fee: 0,
			net_amount: 0,
		};

		// Safely access metadata with fallbacks from version 2
		const grossAmount = metadata?.gross_amount || 0;
		const paymentMethod = metadata?.payment_method || "Not Available";
		const validity = metadata?.validity || "N/A";

		return (
			<Modal
				visible={!!selectedTransaction}
				transparent={true}
				animationType="slide"
				onRequestClose={() => setSelectedTransaction(null)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.receiptContainer}>
						<Pressable
							style={styles.closeButton}
							onPress={() => setSelectedTransaction(null)}
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
							<Text style={styles.receiptField}>Reference: {reference}</Text>

							{type.toLowerCase() === "deposit" ? (
								<>
									{/* Enhanced deposit handling combining both versions */}
									{status === "Success" && grossAmount > 0 ? (
										<>
											<Text style={styles.receiptField}>
												Amount Received: {formatAmount(grossAmount)}
											</Text>
											<Text style={styles.receiptField}>Fees:</Text>
											<Text style={styles.receiptSubField}>
												- Transfer Fee:{" "}
												{formatAmount(fees.transfer_fee || grossAmount * 0.02)}
											</Text>
											<Text style={styles.receiptSubField}>
												- Wallet Management Fee:{" "}
												{formatAmount(
													fees.wallet_management_fee || grossAmount * 0.04,
												)}
											</Text>
											<Text style={styles.receiptSubField}>
												- API & Network Fee:{" "}
												{formatAmount(
													fees.api_network_fee || grossAmount * 0.02,
												)}
											</Text>
											<Text style={styles.receiptSubField}>
												- VAT: {formatAmount(fees.vat || grossAmount * 0.02)}
											</Text>
											<Text style={styles.receiptField}>
												Total Fees:{" "}
												{formatAmount(fees.total_fee || grossAmount * 0.1)}
											</Text>
											<Text style={styles.receiptField}>
												Amount Credited: {formatAmount(price)}
											</Text>
										</>
									) : status === "Success" ? (
										<>
											{/* Fallback for successful deposits without gross_amount */}
											<Text style={styles.receiptField}>
												Amount Received:{" "}
												{formatAmount(metadata.gross_amount || price)}
											</Text>
											<Text style={styles.receiptField}>Fees:</Text>
											<Text style={styles.receiptSubField}>
												- Transfer Fee: {formatAmount(fees.transfer_fee)}
											</Text>
											<Text style={styles.receiptSubField}>
												- Wallet Management Fee:{" "}
												{formatAmount(fees.wallet_management_fee)}
											</Text>
											<Text style={styles.receiptSubField}>
												- API & Network Fee:{" "}
												{formatAmount(fees.api_network_fee)}
											</Text>
											<Text style={styles.receiptSubField}>
												- VAT: {formatAmount(fees.vat)}
											</Text>
											<Text style={styles.receiptField}>
												Total Fees: {formatAmount(fees.total_fee)}
											</Text>
											<Text style={styles.receiptField}>
												Amount Credited: {formatAmount(price)}
											</Text>
										</>
									) : (
										<>
											{/* For non-successful deposits */}
											<Text style={styles.receiptField}>
												Amount: {formatAmount(price)}
											</Text>
											{status !== "Success" && (
												<Text style={styles.receiptField}>
													Transaction Status: {status}
												</Text>
											)}
										</>
									)}
								</>
							) : (
								<>
									<Text style={styles.receiptField}>Plan: {data}</Text>
									<Text style={styles.receiptField}>Provider: {provider}</Text>
									<Text style={styles.receiptField}>
										Amount: {formatAmount(price)}
									</Text>
									<Text style={styles.receiptField}>
										Phone Number: {phoneNumber}
									</Text>
									<Text style={styles.receiptField}>Validity: {validity}</Text>
								</>
							)}

							<Text style={styles.receiptField}>
								Date:{" "}
								{moment(date).tz("Africa/Lagos").format("MMM D, YYYY h:mm A")}
							</Text>
							<Text style={styles.receiptField}>Status: {status}</Text>
							<Text style={styles.receiptField}>
								Payment Method: {paymentMethod}
							</Text>

							{/* Enhanced status-specific information from version 2 */}
							{status === "Failed" && (
								<View style={styles.failedTransactionInfo}>
									<Text style={styles.receiptField}>
										❌ This transaction was not completed successfully.
									</Text>
									{metadata?.error_message && (
										<Text style={styles.receiptField}>
											Error: {metadata.error_message}
										</Text>
									)}
								</View>
							)}

							{status === "Pending" && (
								<View style={styles.pendingTransactionInfo}>
									<Text style={styles.receiptField}>
										⏳ This transaction is still being processed.
									</Text>
								</View>
							)}
						</ScrollView>
					</View>
				</View>
			</Modal>
		);
	};

	const renderItem = ({ item }: { item: HistoryItem }) => (
		<Pressable
			onPress={() => setSelectedTransaction(item)}
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
				Date:{" "}
				{moment(item.date).tz("Africa/Lagos").format("MMM D, YYYY h:mm A")}
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
		backgroundColor: "black",
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
		fontWeight: "bold",
		color: "#fff",
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
		backgroundColor: "black",
		marginTop: 10,
	},
	activeFilterButton: {
		backgroundColor: "#8B4513",
		borderColor: "#8B4513",
	},
	filterButtonText: {
		fontSize: 14,
		color: "#fff",
	},
	activeFilterButtonText: {
		color: "#fff",
		fontWeight: "bold",
	},
	historyItem: {
		backgroundColor: "black",
		padding: 16,
		borderRadius: 12,
		marginBottom: 16,
		marginHorizontal: 16,
		borderWidth: 1,
		borderColor: "#8B4513",
	},
	historyItemHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 8,
	},
	historyTitle: {
		color: "#fff",
		fontWeight: "bold",
		fontSize: 16,
	},
	historyStatus: {
		fontSize: 12,
		fontWeight: "bold",
	},
	historyPrice: {
		color: "#fff",
		fontSize: 14,
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
		fontWeight: "bold",
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
	failedTransactionInfo: {
		marginTop: 16,
		padding: 8,
		backgroundColor: "rgba(239, 68, 68, 0.1)",
		borderRadius: 4,
		borderLeftWidth: 3,
		borderLeftColor: "#ef4444",
	},
	pendingTransactionInfo: {
		marginTop: 16,
		padding: 8,
		backgroundColor: "rgba(234, 179, 8, 0.1)",
		borderRadius: 4,
		borderLeftWidth: 3,
		borderLeftColor: "#eab308",
	},
});