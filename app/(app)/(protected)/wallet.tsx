import { useState, useEffect } from "react";
import {
	View,
	Text,
	Pressable,
	StyleSheet,
	StatusBar,
	Platform,
	SafeAreaView,
	ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { MotiView } from "moti";
import { colors } from "@/constants/colors";
import { useColorScheme } from "@/lib/useColorScheme";
import { supabase } from "@/config/supabase";

interface Transaction {
	type: string;
	amount: number;
	method?: string;
	date: string;
}

interface Recommendation {
	id: string;
	text: string;
	price: number;
	type: string;
	data: string;
	provider: string;
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
}

export default function WalletScreen() {
	
	const { colorScheme } = useColorScheme();
	const [showBalance, setShowBalance] = useState<boolean>(false);
	const [showTransactions, setShowTransactions] = useState<boolean>(false);
	const [currentRecommendations, setCurrentRecommendations] = useState<
		Recommendation[]
	>([]);
	const [balance, setBalance] = useState<number>(0);
	const [userEmail, setUserEmail] = useState<string>("");
	const [userId, setUserId] = useState<string>("");
	const [transactionPin, setTransactionPin] = useState<string>("");
	const [transactions, setTransactions] = useState<Transaction[]>([]);
	const [preferredProvider, setPreferredProvider] = useState<string>("MTN");
	const [hasPriorPurchase, setHasPriorPurchase] = useState<boolean>(false);

	// Fetch user data, wallet balance, and check for prior purchases and transaction PIN
	useEffect(() => {
		const fetchUserAndWallet = async () => {
			try {
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
				const { data: wallet, error: walletError } = await supabase
					.from("wallets")
					.select("balance")
					.eq("user_email", user.email)
					.single();

				if (walletError && walletError.code !== "PGRST116") {
					throw walletError;
				}

				setBalance(wallet?.balance || 0);

				// Fetch recent transactions
				const { data: txData, error: txError } = await supabase
					.from("transactions")
					.select("amount, status, metadata, created_at")
					.eq("user_email", user.email)
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
					.eq("user_id", user.id) // Cable purchases uses user_id, not user_email
					.limit(1);

				const hasPurchases =
					(dataPurchases?.length > 0 ||
						airtimePurchases?.length > 0 ||
						cablePurchases?.length > 0) &&
					!!user.user_metadata?.transaction_pin;
				setHasPriorPurchase(hasPurchases);

				// Fetch preferred provider
				const { data: dataPurchasesFull, error: dataError } = await supabase
					.from("data_purchases")
					.select("provider_name")
					.eq("user_email", user.email);

				const { data: airtimePurchasesFull, error: airtimeError } =
					await supabase
						.from("airtime_purchases")
						.select("provider_name")
						.eq("user_email", user.email);

				const { data: cablePurchasesFull, error: cableError } = await supabase
					.from("cable_purchases")
					.select("provider") // Changed from "provider_name" to "provider"
					.eq("user_id", user.id); // Changed from "user_email" to "user_id"

				if (dataError || airtimeError || cableError) {
					console.error("Error fetching purchases:", {
						dataError,
						airtimeError,
						cableError,
					});
				}

				const allProviders = [
					...(dataPurchasesFull?.map((p) => p.provider_name) || []),
					...(airtimePurchasesFull?.map((p) => p.provider_name) || []),
					...(cablePurchasesFull?.map((p) => p.provider) || []), // Changed to use "provider"
				].filter(Boolean);

				const providerCounts = allProviders.reduce(
					(acc, provider) => {
						acc[provider] = (acc[provider] || 0) + 1;
						return acc;
					},
					{} as Record<string, number>,
				);

				const topProvider =
					Object.entries(providerCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
					"MTN";
				setPreferredProvider(topProvider);
				console.log("Preferred provider set:", topProvider);
			} catch (error) {
				console.error("Error fetching wallet data or preferences:", error);
			}
		};

		fetchUserAndWallet();
	}, []);

	// Fetch recommendations from API
	useEffect(() => {
		const fetchRecommendations = async () => {
			if (!preferredProvider || !hasPriorPurchase) return;
			try {
				const today = new Date();
				const isWeekend = today.getDay() >= 5 || today.getDay() === 0;
				const isSunday = today.getDay() === 0;

				const types = ["hot", "special"];
				if (isWeekend) types.push("weekend");
				if (isSunday) types.push("weekly");

				const response = await fetch("https://ebenkdata.com/api/plans", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: "Token de883370902cf73e68ed63f566dbf38a38719f03",
					},
					body: JSON.stringify({
						provider: preferredProvider,
						types,
					}),
				});

				const data = await response.json();
				console.log("Recommendations response:", data);
				if (data.status === "success" && Array.isArray(data.plans)) {
					const recommendations: Recommendation[] = data.plans
						.slice(0, 5)
						.map((plan: any, index: number) => ({
							id: `${plan.type}-${index}-${Date.now()}`,
							text: `${preferredProvider} ${plan.data} ${plan.type.replace("_", " ")} plan`,
							price: plan.amount + 50, // Add ₦50 markup
							type: plan.type,
							data: plan.data,
							provider: preferredProvider,
						}));
					setCurrentRecommendations(recommendations);
				}
			} catch (error) {
				console.error("Error fetching recommendations:", error);
				setCurrentRecommendations([]);
			}
		};

		fetchRecommendations();
		const interval = setInterval(fetchRecommendations, 30000); // Refresh every 30 seconds
		return () => clearInterval(interval);
	}, [preferredProvider, hasPriorPurchase]);

	// Format balance for display
	const formattedBalance: string = `₦${balance.toLocaleString("en-NG", {
		minimumFractionDigits: 2,
	})}`;

	const hiddenBalance: string = "₦****" + formattedBalance.slice(-3);

	// Handle recommendation press to route to Confirmation page
	const handleRecommendationPress = (rec: Recommendation) => {
		if (balance < rec.price) {
			console.log("Insufficient balance.");
			return;
		}

		const bundle: DataBundle = {
			id: Date.now(),
			data: rec.data,
			price: rec.price,
			validity: "30 days",
			category: "Data",
			description: "Data Bundle",
			variation_code: `data_${rec.text.toLowerCase().replace(/\s/g, "_")}`,
			planType: "Data Plan",
		};

		const provider: Provider = {
			id: 1,
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
		};

		router.push({
			pathname: "../Confirmation",
			params: params as any,
		});
	};

	// Handle transaction history navigation
	// const handleTransactionHistoryPress = () => {
	// 	router.push("/(app)/(protected)/history");
	// };

	return (
		<SafeAreaView
			style={[
				styles.container,
				{
					backgroundColor:
						colorScheme === "dark"
							? colors.dark.background
							: colors.light.background,
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
			>
				<Text
					style={[
						styles.title,
						{
							color:
								colorScheme === "dark"
									? colors.dark.foreground
									: colors.light.foreground,
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

				{/* Balance Card */}
				<View
					style={[
						styles.balanceCard,
						{ backgroundColor: colorScheme === "dark" ? "#744925" : "#3b82f6" },
					]}
				>
					<View style={styles.balanceHeader}>
						<Text
							style={[
								styles.balanceTextLabel,
								{ color: "rgba(255,255,255,0.7)" },
							]}
						>
							Wallet Balance
						</Text>
						<View style={styles.headerActions}>
							{/* <Pressable
								onPress={handleTransactionHistoryPress}
								style={styles.historyButton}
							>
								<Ionicons name="time-outline" size={20} color="white" />
								<Text style={styles.historyButtonText}>History</Text>
							</Pressable> */}
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
						{showBalance ? formattedBalance : hiddenBalance}
					</Text>
				</View>

				{/* Fund Wallet Button with Animation */}
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

				{/* Transaction Toggle */}
				<Pressable
					onPress={() => setShowTransactions(!showTransactions)}
					style={styles.transactionToggle}
				>
					<Text
						style={[
							styles.transactionTitle,
							{
								color:
									colorScheme === "dark"
										? colors.dark.foreground
										: colors.light.foreground,
							},
						]}
					>
						🧾 Recent Transactions
					</Text>
					<Ionicons
						name={
							showTransactions ? "chevron-up-outline" : "chevron-down-outline"
						}
						size={22}
						color={
							colorScheme === "dark"
								? colors.dark.foreground
								: colors.light.foreground
						}
					/>
				</Pressable>

				{/* Transaction List */}
				{showTransactions && (
					<View style={styles.transactionList}>
						{transactions.length > 0 ? (
							transactions.map((tx, index) => (
								<View
									key={index}
									style={[
										styles.transactionItem,
										{
											backgroundColor:
												colorScheme === "dark" ? "#171717" : "#f5f5f5",
											borderColor:
												colorScheme === "dark"
													? "rgba(255,255,255,0.1)"
													: "rgba(0,0,0,0.1)",
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

				{/* Recommendations or Fallback */}
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
															backgroundColor:
																colorScheme === "dark" ? "#1e3a8a" : "#3b82f6",
														}
													: {
															alignSelf: "flex-end",
															backgroundColor:
																colorScheme === "dark" ? "#6d28d9" : "#8b5cf6",
														},
											]}
										>
											<Pressable onPress={() => handleRecommendationPress(rec)}>
												<Text
													style={[
														styles.recommendationText,
														{ color: "white" },
													]}
												>
													{rec.text} - ₦{rec.price}
												</Text>
											</Pressable>
										</MotiView>
									))}
								</View>
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
	historyButton: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 4,
		paddingHorizontal: 8,
		borderRadius: 12,
		backgroundColor: "rgba(255,255,255,0.2)",
	},
	historyButtonText: {
		color: "white",
		fontSize: 12,
		marginLeft: 4,
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
