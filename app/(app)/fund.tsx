import { useState, useEffect } from "react";
import {
	View,
	Text,
	TextInput,
	Pressable,
	StyleSheet,
	Platform,
	SafeAreaView,
	Alert,
	ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { MotiView } from "moti";
import { StatusBar } from "expo-status-bar";
import { supabase } from "@/config/supabase";
import { WebView } from "react-native-webview";
import { v4 as uuidv4 } from "uuid";

// Polyfill crypto.getRandomValues
import "react-native-get-random-values";

type PaymentMethod = "card" | "bank_transfer";

const FundScreen = () => {
	
	const [amount, setAmount] = useState("");
	const [error, setError] = useState("");
	const [isProcessing, setIsProcessing] = useState(false);
	const [userEmail, setUserEmail] = useState("");
	const [userName, setUserName] = useState("");
	const [showBankDetails, setShowBankDetails] = useState(false);
	const [bankDetails, setBankDetails] = useState<{
		account_number: string;
		bank_name: string;
		reference: string;
	} | null>(null);
	const [showWebView, setShowWebView] = useState(false);
	const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(
		null,
	);
	const [userId, setUserId] = useState("");
	const [paymentReference, setPaymentReference] = useState(""); // Store reference

	// Access Paystack public key from environment variables
	const PAYSTACK_PUBLIC_KEY = process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY;

	// Log and validate Paystack key
	useEffect(() => {
		console.log("Environment Variables:", process.env);
		console.log("Paystack Public Key:", PAYSTACK_PUBLIC_KEY);
		if (!PAYSTACK_PUBLIC_KEY || !PAYSTACK_PUBLIC_KEY.startsWith("pk_")) {
			console.error("Invalid or missing Paystack public key");
			Alert.alert(
				"Error",
				"Payment configuration error. Please contact support.",
			);
		}
	}, [PAYSTACK_PUBLIC_KEY]);

	// Listen for real-time transaction updates
	useEffect(() => {
		let subscription;

		if (bankDetails?.reference) {
			subscription = supabase
				.channel(`payment-confirm:${bankDetails.reference}`)
				.on(
					"postgres_changes",
					{
						event: "UPDATE",
						schema: "public",
						table: "transactions",
						filter: `reference=eq.${bankDetails.reference}`,
					},
					(payload) => {
						if (payload.new.status === "success") {
							router.push("/wallet");
						}
					},
				)
				.subscribe();
		}

		return () => {
			if (subscription) {
				supabase.removeChannel(subscription);
			}
		};
	}, [bankDetails, router]);

	// Fetch user data on load
	useEffect(() => {
		const fetchUserData = async () => {
			try {
				const {
					data: { user },
					error: authError,
				} = await supabase.auth.getUser();
				if (authError || !user) {
					throw new Error("User not authenticated");
				}
				if (!user.email) {
					throw new Error("User email not found");
				}
				if (!user.user_metadata?.username) {
					throw new Error("User username not found");
				}
				setUserEmail(user.email);
				setUserName(user.user_metadata.username);
				setUserId(user.id);
			} catch (error) {
				console.error("Error fetching user data:", error);
				Alert.alert("Error", "Failed to load user data. Please sign in again.");
				router.replace("/sign-in");
			}
		};

		fetchUserData();
	}, [router]);

	const handlePresetAmount = (value: number) => {
		const currentAmount = amount ? parseFloat(amount) : 0;
		const newAmount = currentAmount + value;
		setAmount(newAmount.toString());
		setError("");
	};

	const sendTestReceipt = async (
		reference: string,
		amount: string,
		email: string,
	) => {
		try {
			const parsedAmount = parseFloat(amount);
			const feePercentage = 0.1;
			const feeAmount = parsedAmount * feePercentage;
			const netAmount = parsedAmount - feeAmount;

			const receiptDetails = {
				to: email,
				subject: "Payment Receipt - Edges Network",
				body: `
          Payment Receipt
          ----------------
          Reference: ${reference}
          Amount Paid: ₦${parsedAmount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
          Fees:
            - Transfer Fee (2%): ₦${(parsedAmount * 0.02).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
            - Wallet Management Fee (2%): ₦${(parsedAmount * 0.02).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
            - API & Network Protocols Fee (4%): ₦${(parsedAmount * 0.04).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
            - VAT (2%): ₦${(parsedAmount * 0.02).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
          Total Fees (10%): ₦${feeAmount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
          Amount Credited to Your Wallet: ₦${netAmount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
          Date: ${new Date().toLocaleString()}
          Status: Successful
          ----------------
          View your wallet balance in the Edges Network app.
          Thank you for your payment!
        `,
			};
			console.log("Sending receipt:", receiptDetails);
			// TODO: Implement actual email sending via serverless function
		} catch (error) {
			console.error("Error sending receipt:", error);
		}
	};

	const updateWalletBalance = async (
		userEmail: string,
		amount: number,
		transactionId: string,
		reference: string,
	) => {
		try {
			const feePercentage = 0.1;
			const netAmount = amount * (1 - feePercentage);
			const feeAmount = amount * feePercentage;

			console.log(
				`Deducting 10% fee (₦${feeAmount.toFixed(2)}) from deposit of ₦${amount}. Crediting ₦${netAmount.toFixed(2)} to user wallet`,
			);

			// Update or insert user wallet balance
			const { data: wallet, error: fetchError } = await supabase
				.from("wallets")
				.select("balance")
				.eq("user_email", userEmail)
				.single();

			if (fetchError && fetchError.code !== "PGRST116") {
				throw fetchError;
			}

			let newBalance = netAmount;
			if (wallet) {
				newBalance = wallet.balance + netAmount;
				const { error: updateError } = await supabase
					.from("wallets")
					.update({ balance: newBalance })
					.eq("user_email", userEmail);

				if (updateError) throw updateError;
			} else {
				const { error: insertError } = await supabase
					.from("wallets")
					.insert({ user_email: userEmail, balance: newBalance });

				if (insertError) throw insertError;
			}

			console.log(
				`Wallet balance updated for ${userEmail}: ₦${newBalance.toFixed(2)}`,
			);

			// Record fees in business_ledger
			const feeEntries = [
				{ fee_type: "transfer_fee", amount: amount * 0.02 },
				{ fee_type: "wallet_management_fee", amount: amount * 0.02 },
				{ fee_type: "api_network_fee", amount: amount * 0.04 },
				{ fee_type: "vat", amount: amount * 0.02 },
				{ fee_type: "total_fee", amount: feeAmount },
			];

			const { error: ledgerError } = await supabase
				.from("business_ledger")
				.insert(
					feeEntries.map((entry) => ({
						id: uuidv4(),
						transaction_id: transactionId,
						user_email: userEmail,
						fee_amount: entry.amount,
						fee_type: entry.fee_type,
					})),
				);

			if (ledgerError) {
				console.error("Error recording fees in business_ledger:", ledgerError);
				throw new Error("Failed to record business fees");
			}

			console.log(
				`Recorded fees for transaction ${reference}: ₦${feeAmount.toFixed(2)}`,
			);
		} catch (error) {
			console.error("Error updating wallet balance:", error);
			throw new Error("Failed to update wallet balance");
		}
	};

	const handleFundWallet = async () => {
		try {
			if (!PAYSTACK_PUBLIC_KEY) {
				throw new Error("Payment configuration error: Missing Paystack key");
			}

			const parsedAmount = parseFloat(amount);
			if (!amount || isNaN(parsedAmount)) {
				setError("Please enter a valid amount");
				return;
			}
			if (parsedAmount < 500) {
				setError("Minimum funding amount is ₦500");
				return;
			}
			if (!userEmail) {
				throw new Error("User email is required");
			}
			if (!userName) {
				throw new Error("User username is required");
			}
			if (!userId) {
				throw new Error("User ID is required");
			}

			const feePercentage = 0.1;
			const feeAmount = parsedAmount * feePercentage;
			const netAmount = parsedAmount - feeAmount;

			const reference = `EDGES_${userId}_${Date.now()}`;
			setPaymentReference(reference); // Store reference
			const transactionId = uuidv4();

			const transactionData = {
				id: transactionId,
				user_email: userEmail,
				amount: parsedAmount,
				reference,
				status: "pending",
				metadata: {
					custom_fields: [
						{
							display_name: "Mobile Payment",
							variable_name: "mobile_payment",
							value: "Edges Network",
						},
					],
					payment_method: "card",
					payment_date: new Date().toISOString(),
					fees: {
						transfer_fee: parsedAmount * 0.02,
						wallet_management_fee: parsedAmount * 0.02,
						api_network_fee: parsedAmount * 0.04,
						vat: parsedAmount * 0.02,
						total_fee: feeAmount,
						net_amount: netAmount,
					},
				},
			};

			console.log(
				"Inserting pending transaction:",
				JSON.stringify(transactionData, null, 2),
			);

			const { data: pendingTx, error: pendingTxError } = await supabase
				.from("transactions")
				.insert(transactionData)
				.select("id")
				.single();

			if (pendingTxError) {
				console.error(
					"Pending transaction insert error:",
					JSON.stringify(pendingTxError, null, 2),
				);
				throw new Error(
					`Failed to record pending transaction: ${pendingTxError.message}`,
				);
			}

			setIsProcessing(true);
			setError("");
			setPaymentMethod("card");
			setShowWebView(true);
		} catch (err) {
			console.error("Error in handleFundWallet:", err);
			Alert.alert("Error", err.message || "An unexpected error occurred");
			setIsProcessing(false);
		}
	};

	const handleWebViewMessage = async (event: any): Promise<void> => {
		const data = event.nativeEvent.data;
		try {
			if (data.startsWith("payment-success:")) {
				const reference = data.split(":")[1];
				console.log(`Processing payment success for reference: ${reference}`);

				// Update transaction status
				const { error: successError } = await supabase
					.from("transactions")
					.update({ status: "success" })
					.eq("reference", reference);

				if (successError) {
					console.error(
						"Success transaction update error:",
						JSON.stringify(successError, null, 2),
					);
					throw new Error(
						`Failed to update transaction status: ${successError.message}`,
					);
				}

				// Fetch transaction details
				const { data: transaction, error: fetchTxError } = await supabase
					.from("transactions")
					.select("id, amount")
					.eq("reference", reference)
					.single();

				if (fetchTxError || !transaction) {
					console.error(
						"Fetch transaction error:",
						JSON.stringify(fetchTxError, null, 2),
					);
					// Log all transactions for debugging
					const { data: allTx, error: allTxError } = await supabase
						.from("transactions")
						.select("*");
					console.log("All transactions:", JSON.stringify(allTx, null, 2));
					if (allTxError)
						console.error("Error fetching all transactions:", allTxError);
					throw new Error(
						`Failed to fetch transaction details: ${fetchTxError?.message || "No transaction found"}`,
					);
				}

				await updateWalletBalance(
					userEmail,
					transaction.amount,
					transaction.id,
					reference,
				);
				await sendTestReceipt(reference, amount, userEmail);

				router.push("/wallet");
			} else if (data === "payment-cancelled" || data === "payment-declined") {
				const { error: failedError } = await supabase
					.from("transactions")
					.update({ status: "failed" })
					.eq("user_email", userEmail)
					.eq("status", "pending")
					.eq("amount", parseFloat(amount));

				if (failedError) {
					console.error(
						"Failed transaction update error:",
						JSON.stringify(failedError, null, 2),
					);
					throw new Error(
						`Failed to update transaction status: ${failedError.message}`,
					);
				}

				Alert.alert(
					data === "payment-cancelled" ? "Cancelled" : "Declined",
					"Payment was not completed.",
				);
			}
		} catch (err) {
			console.error("Error processing transaction:", err);
			Alert.alert(
				"Error",
				`Failed to process transaction: ${err.message || "Unknown error"}`,
			);
		} finally {
			setShowWebView(false);
			setIsProcessing(false);
			setPaymentReference(""); // Clear reference
		}
	};

	const generatePaystackHTML = (): string => {
		// Use stored reference
		const reference = paymentReference || `EDGES_${userId}_${Date.now()}`;
		console.log(`Generating Paystack HTML with reference: ${reference}`);
		return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Paystack Payment</title>
        <script src="https://js.paystack.co/v1/inline.js"></script>
      </head>
      <body>
        <script>
          const paymentMethod = '${paymentMethod}';
          const handler = PaystackPop.setup({
            key: '${PAYSTACK_PUBLIC_KEY || ""}',
            email: '${userEmail}',
            amount: ${parseFloat(amount) * 100},
            currency: 'NGN',
            channels: [paymentMethod],
            ref: '${reference}',
            metadata: {
              custom_fields: [
                {
                  display_name: "Mobile Payment",
                  variable_name: "mobile_payment",
                  value: "Edges Network"
                }
              ]
            },
            onClose: function() {
              window.ReactNativeWebView.postMessage('payment-cancelled');
            },
            callback: function(response) {
              window.ReactNativeWebView.postMessage('payment-success:' + response.reference);
            }
          });
          handler.openIframe();
        </script>
      </body>
      </html>
    `;
	};

	const copyAccountNumber = () => {
		if (bankDetails?.account_number) {
			console.log("Copied account number:", bankDetails.account_number);
			Alert.alert("Copied!", "Account number copied to clipboard");
		}
	};

	const presetAmounts = [500, 1000, 5000, 10000];

	if (showWebView) {
		return (
			<WebView
				source={{ html: generatePaystackHTML() }}
				onMessage={handleWebViewMessage}
				javaScriptEnabled={true}
				domStorageEnabled={true}
				style={{ flex: 1 }}
				startInLoadingState={true}
				renderLoading={() => (
					<View style={styles.loadingContainer}>
						<ActivityIndicator size="large" color="#000" />
					</View>
				)}
			/>
		);
	}

	return (
		<SafeAreaView style={styles.container}>
			<StatusBar style="light" translucent backgroundColor="transparent" />
			<View style={styles.inner}>
				<View style={styles.header}>
					<Pressable onPress={() => router.back()}>
						<Ionicons name="arrow-back-outline" size={24} color="white" />
					</Pressable>
					<Text style={styles.title}>Fund Wallet 💰</Text>
					<Pressable>
						<Ionicons name="help-circle-outline" size={24} color="white" />
					</Pressable>
				</View>

				{!showBankDetails ? (
					<>
						<MotiView
							from={{ opacity: 0, translateY: 20 }}
							animate={{ opacity: 1, translateY: 0 }}
							transition={{ type: "timing", duration: 300 }}
							style={styles.balanceContainer}
						>
							<Text style={styles.balanceLabel}>Wallet Balance (NGN)</Text>
							<Text style={styles.balanceText}>
								₦
								{amount
									? parseFloat(amount).toLocaleString("en-NG", {
											minimumFractionDigits: 2,
										})
									: "0.00"}
							</Text>
						</MotiView>

						<MotiView
							from={{ opacity: 0, translateY: 20 }}
							animate={{ opacity: 1, translateY: 0 }}
							transition={{ type: "timing", duration: 300, delay: 100 }}
							style={styles.inputContainer}
						>
							<Text style={styles.label}>Amount to Fund (NGN)</Text>
							<View style={styles.inputWrapper}>
								<TextInput
									style={styles.input}
									placeholder="Min 500"
									placeholderTextColor="#666"
									keyboardType="numeric"
									value={amount}
									onChangeText={(text) => {
										setAmount(text.replace(/[^0-9.]/g, ""));
										setError("");
									}}
								/>
								{amount ? (
									<Pressable
										onPress={() => setAmount("")}
										style={styles.clearButton}
									>
										<Ionicons name="close-circle" size={20} color="#666" />
									</Pressable>
								) : null}
							</View>
							{error ? <Text style={styles.errorText}>{error}</Text> : null}
						</MotiView>

						<MotiView
							from={{ opacity: 0, translateY: 20 }}
							animate={{ opacity: 1, translateY: 0 }}
							transition={{ type: "timing", duration: 300, delay: 200 }}
							style={styles.presetContainer}
						>
							{presetAmounts.map((value) => (
								<Pressable
									key={value}
									onPress={() => handlePresetAmount(value)}
									style={({ pressed }) => [
										styles.presetButton,
										{ transform: [{ scale: pressed ? 0.95 : 1 }] },
									]}
								>
									<Text style={styles.presetText}>
										₦{value.toLocaleString()}
									</Text>
								</Pressable>
							))}
						</MotiView>

						<MotiView
							from={{ scale: 1 }}
							animate={{ scale: [1, 1.02, 1] }}
							transition={{ loop: true, type: "timing", duration: 1500 }}
							style={styles.buttonContainer}
						>
							<Pressable
								onPress={handleFundWallet}
								style={styles.fundButton}
								disabled={isProcessing}
							>
								{isProcessing ? (
									<ActivityIndicator color="#000" />
								) : (
									<Text style={styles.fundButtonText}>Top Up Now</Text>
								)}
							</Pressable>
						</MotiView>

						<MotiView
							from={{ opacity: 0, translateY: 20 }}
							animate={{ opacity: 1, translateY: 0 }}
							transition={{ type: "timing", duration: 300, delay: 300 }}
							style={styles.stepsContainer}
						>
							<Text style={styles.stepsTitle}>Payment Steps</Text>
							<View style={styles.step}>
								<Text style={styles.stepNumber}>1</Text>
								<Text style={styles.stepText}>
									Enter amount and click "Top Up Now"
								</Text>
							</View>
							<View style={styles.step}>
								<Text style={styles.stepNumber}>2</Text>
								<Text style={styles.stepText}>
									Select payment method and complete payment
								</Text>
							</View>
							<View style={styles.step}>
								<Text style={styles.stepNumber}>3</Text>
								<Text style={styles.stepText}>
									Wallet will be credited after fees (view balance in app)
								</Text>
							</View>
						</MotiView>
					</>
				) : (
					<MotiView
						from={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						style={styles.bankDetailsContainer}
					>
						<Text style={styles.bankTitle}>Bank Transfer Details</Text>
						<View style={styles.bankDetailRow}>
							<Text style={styles.bankLabel}>Bank:</Text>
							<Text style={styles.bankValue}>{bankDetails?.bank_name}</Text>
						</View>
						<View style={styles.bankDetailRow}>
							<Text style={styles.bankLabel}>Account No:</Text>
							<Text style={styles.bankValue}>
								{bankDetails?.account_number}
							</Text>
						</View>
						<Pressable
							onPress={copyAccountNumber}
							style={({ pressed }) => [
								styles.copyButton,
								{ backgroundColor: pressed ? "#00C800" : "#00FF00" },
							]}
						>
							<Text style={styles.copyButtonText}>Copy Account Number</Text>
						</Pressable>
					</MotiView>
				)}
			</View>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#1A2526",
		// paddingTop: Platform.OS === "android" ? 30 : 0,
	},
	inner: {
		flex: 1,
		paddingHorizontal: 16,
		justifyContent: "space-between",
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		// marginTop: Platform.OS === "android" ? 20 : 10,
		marginBottom: 16,
	},
	title: {
		fontSize: 20,
		fontWeight: "bold",
		color: "#fff",
	},
	balanceContainer: {
		marginBottom: 16,
	},
	balanceLabel: {
		fontSize: 14,
		color: "#888",
		marginBottom: 4,
	},
	balanceText: {
		fontSize: 18,
		fontWeight: "bold",
		color: "#fff",
	},
	inputContainer: {
		marginBottom: 16,
	},
	label: {
		fontSize: 14,
		color: "#fff",
		fontWeight: "500",
		marginBottom: 8,
	},
	inputWrapper: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#2A3A3B",
		borderRadius: 8,
		borderWidth: 1,
		borderColor: "#3A4A4B",
	},
	input: {
		flex: 1,
		color: "#fff",
		padding: 12,
		fontSize: 16,
	},
	clearButton: {
		padding: 8,
	},
	errorText: {
		color: "#ff4444",
		fontSize: 12,
		marginTop: 4,
	},
	presetContainer: {
		flexDirection: "row",
		flexWrap: "wrap",
		justifyContent: "space-between",
		marginBottom: 16,
	},
	presetButton: {
		backgroundColor: "#2A3A3B",
		paddingVertical: 10,
		paddingHorizontal: 16,
		borderRadius: 20,
		marginBottom: 8,
		width: "22%",
		alignItems: "center",
		borderWidth: 1,
		borderColor: "#3A4A4B",
	},
	presetText: {
		color: "#fff",
		fontSize: 14,
		fontWeight: "500",
	},
	buttonContainer: {
		marginBottom: 16,
	},
	fundButton: {
		backgroundColor: "#00FF00",
		paddingVertical: 14,
		borderRadius: 8,
		alignItems: "center",
	},
	fundButtonText: {
		color: "#000",
		fontWeight: "bold",
		fontSize: 16,
		textTransform: "uppercase",
	},
	stepsContainer: {
		marginBottom: 20,
	},
	stepsTitle: {
		fontSize: 16,
		fontWeight: "bold",
		color: "#fff",
		marginBottom: 12,
	},
	step: {
		flexDirection: "row",
		alignItems: "flex-start",
		marginBottom: 8,
	},
	stepNumber: {
		fontSize: 14,
		fontWeight: "bold",
		color: "#00FF00",
		marginRight: 8,
		width: 24,
		textAlign: "center",
	},
	stepText: {
		fontSize: 14,
		color: "#888",
		flex: 1,
		lineHeight: 20,
	},
	bankDetailsContainer: {
		backgroundColor: "#2A3A3B",
		padding: 16,
		borderRadius: 8,
		marginTop: 16,
	},
	bankTitle: {
		fontSize: 16,
		fontWeight: "bold",
		color: "#fff",
		marginBottom: 12,
	},
	bankDetailRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: 8,
	},
	bankLabel: {
		color: "#888",
		fontSize: 14,
	},
	bankValue: {
		color: "#fff",
		fontSize: 14,
		fontWeight: "bold",
	},
	copyButton: {
		backgroundColor: "#00FF00",
		paddingVertical: 10,
		borderRadius: 6,
		alignItems: "center",
		marginTop: 8,
	},
	copyButtonText: {
		color: "#000",
		fontWeight: "bold",
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#1A2526",
	},
});

export default FundScreen;
