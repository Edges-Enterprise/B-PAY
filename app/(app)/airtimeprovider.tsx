import React, {
	useState,
	useRef,
	useEffect,
	useCallback,
	useMemo,
} from "react";
import {
	View,
	Text,
	Image,
	ScrollView,
	StyleSheet,
	TextInput,
	Alert,
	Animated,
	PanResponder,
	ActivityIndicator,
	TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/config/supabase";
import TransactionStatusModal from "@/components/homescreen/TransactionStatusModal";
import CreatePinModal from "@/components/homescreen/CreatePinModal";
import { NETWORK_IMAGES, DEFAULT_PROVIDER_IMAGE } from "@/constants/helper";
import { useRouter } from "expo-router";

// Define the Provider interface
interface Provider {
	id: number;
	name: string;
	image: any;
	code: string;
	networkId: number;
}

// Map API provider names to network IDs
const PROVIDER_CONFIG: { [key: string]: { networkId: number } } = {
	MTN: { networkId: 1 },
	GLO: { networkId: 2 },
	AIRTEL: { networkId: 3 },
	"9MOBILE": { networkId: 4 },
};

// Predefined airtime amounts
const AIRTIME_AMOUNTS = [100, 200, 400, 500, 1000, 2000, 3000, 5000, 10000];

const AirtimeProvider: React.FC = () => {
	const router = useRouter();
	const [providers, setProviders] = useState<Provider[]>([]);
	const [selectedProvider, setSelectedProvider] = useState<Provider | null>(
		null,
	);
	const [phoneNumber, setPhoneNumber] = useState<string>("");
	const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
	const [discountedPrice, setDiscountedPrice] = useState<number | null>(null);
	const [balance, setBalance] = useState<number | null>(null);
	const [userEmail, setUserEmail] = useState<string>("");
	const [referenceId, setReferenceId] = useState<string>("");
	const [transactionModalVisible, setTransactionModalVisible] =
		useState<boolean>(false);
	const [transactionStatus, setTransactionStatus] = useState<
		"processing" | "success" | "failed"
	>("processing");
	const [isPinCreationModalOpen, setIsPinCreationModalOpen] =
		useState<boolean>(false);
	const [hasPin, setHasPin] = useState<boolean>(false);
	const [newPin, setNewPin] = useState<string>("");
	const [confirmPin, setConfirmPin] = useState<string>("");
	const [isNewPinVisible, setIsNewPinVisible] = useState<boolean>(false);
	const [isConfirmPinVisible, setIsConfirmPinVisible] =
		useState<boolean>(false);
	const [detectedNetwork, setDetectedNetwork] = useState<string>("");
	const [loading, setLoading] = useState<boolean>(true);
	const [isBalanceLoading, setIsBalanceLoading] = useState<boolean>(true);
	const [isSlideEnabled, setIsSlideEnabled] = useState<boolean>(false);

	// Persist state during gesture
	const stateRef = useRef<{
		selectedProvider: Provider | null;
		phoneNumber: string;
		selectedAmount: number | null;
		discountedPrice: number | null;
	}>({
		selectedProvider: null,
		phoneNumber: "",
		selectedAmount: null,
		discountedPrice: null,
	});

	// Store gesture-critical data
	const gestureRef = useRef<{
		selectedProvider: Provider | null;
		phoneNumber: string;
		selectedAmount: number | null;
		discountedPrice: number | null;
	}>({
		selectedProvider: null,
		phoneNumber: "",
		selectedAmount: null,
		discountedPrice: null,
	});

	// Animation for slide to purchase
	const slideAnim = useRef(new Animated.Value(0)).current;
	// Reference to control ScrollView scrolling
	const scrollViewRef = useRef<ScrollView>(null);

	// Update stateRef when state changes
	useEffect(() => {
		stateRef.current = {
			selectedProvider,
			phoneNumber,
			selectedAmount,
			discountedPrice,
		};
	}, [selectedProvider, phoneNumber, selectedAmount, discountedPrice]);

	// Check if slide gesture should be enabled
	const canSlideToPurchase = useCallback(() => {
		const isValid =
			!!selectedProvider &&
			!!phoneNumber &&
			phoneNumber.length === 11 &&
			!!selectedAmount;
		return isValid;
	}, [selectedProvider, phoneNumber, selectedAmount]);

	// Update slide enabled state incrementally
	useEffect(() => {
		const isValid = canSlideToPurchase();
		setIsSlideEnabled(isValid);
	}, [canSlideToPurchase]);

	// Fetch providers from Ebenkdata API
	const fetchProviders = async () => {
		try {
			const response = await fetch("https://ebenkdata.com/api/network/", {
				headers: {
					Authorization: "Token de883370902cf73e68ed63f566dbf38a38719f03",
				},
			});

			if (!response.ok) {
				throw new Error(`Failed to fetch providers: ${response.status}`);
			}

			const data = await response.json();
			const providerMap: { [key: string]: Provider } = {};
			Object.keys(data).forEach((networkKey) => {
				const plans = data[networkKey];
				if (Array.isArray(plans) && plans.length > 0) {
					const networkName = plans[0].plan_network.toUpperCase();
					const config = PROVIDER_CONFIG[networkName];
					if (config && !providerMap[networkName]) {
						providerMap[networkName] = {
							id: plans[0].network,
							name: networkName,
							image: NETWORK_IMAGES[networkName] || DEFAULT_PROVIDER_IMAGE,
							code: networkName.toLowerCase(),
							networkId: config.networkId,
						};
					}
				}
			});

			const providerArray = Object.values(providerMap);
			setProviders(providerArray);

			if (providerArray.length === 0) {
				Alert.alert("Error", "No valid providers found in the response.");
			}
		} catch (error) {
			console.error("Fetch error:", error);
			Alert.alert("Error", "Could not load data providers.");
			setProviders([]);
		} finally {
			setLoading(false);
		}
	};

	// Handle provider selection
	const handleSelectProvider = (provider: Provider) => {
		setSelectedProvider(provider);
	};

	// Verify transaction PIN existence
	const verifyTransactionPin = useCallback(async (email: string) => {
		try {
			const {
				data: { user },
				error: authError,
			} = await supabase.auth.getUser();
			if (authError || !user) {
				throw new Error(
					`No authenticated user: ${authError?.message || "Unknown error"}`,
				);
			}
			const { data, error } = await supabase
				.from("profiles")
				.select("transaction_pin")
				.eq("id", user.id)
				.single();

			if (error && error.code !== "PGRST116") {
				throw error;
			}

			const pinExists = !!data?.transaction_pin && data.transaction_pin !== "";
			return pinExists;
		} catch (error) {
			console.error("PIN Check Error:", error);
			Alert.alert("Error", "Unable to verify PIN. Please retry.");
			return false;
		}
	}, []);

	// Create transaction reference matching BuyDataScreen and SuccessScreen format
	const createTransactionReference = async () => {
		try {
			const {
				data: { user },
				error,
			} = await supabase.auth.getUser();
			if (error || !user || !user.id) {
				throw new Error("Authentication failed or user ID missing");
			}
			const reference = `Edges_Network_${user.id}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
			return reference;
		} catch (error) {
			console.error("Reference Creation Error:", error);
			throw error;
		}
	};

	// Fetch user data and set up wallet subscription
	useEffect(() => {
		const fetchUserData = async () => {
			try {
				const {
					data: { user },
					error: userError,
				} = await supabase.auth.getUser();
				if (userError || !user || !user.email) {
					throw new Error("User not authenticated");
				}
				setUserEmail(user.email);

				const { data: wallet, error: walletError } = await supabase
					.from("wallet")
					.select("balance")
					.eq("user_email", user.email)
					.single();

				if (walletError && walletError.code !== "PGRST116") {
					throw walletError;
				}
				setBalance(wallet?.balance || 0);
				setIsBalanceLoading(false);

				const pinExists = await verifyTransactionPin(user.email);
				setHasPin(pinExists);

				const subscription = supabase
					.channel(`wallet-updates:${user.email}`)
					.on(
						"postgres_changes",
						{
							event: "UPDATE",
							schema: "public",
							table: "wallet",
							filter: `user_email=eq.${user.email}`,
						},
						(payload) => {
							setBalance(payload.new.balance ?? 0);
						},
					)
					.subscribe((status, err) => {
						if (err) console.error("Subscription error:", err);
					});

				return () => {
					supabase.removeChannel(subscription);
				};
			} catch (error) {
				console.error("Error fetching user data:", error);
				Alert.alert("Error", "Failed to load user data");
				setIsBalanceLoading(false);
			}
		};
		fetchUserData();
		fetchProviders();
	}, [verifyTransactionPin]);

	// Detect network from phone number
	const detectProviderFromNumber = (phone: string): string => {
		if (phone.length !== 11) return "";
		const prefix = phone.slice(0, 4);
		const mtnPrefixes = [
			"0803",
			"0806",
			"0703",
			"0706",
			"0707",
			"0813",
			"0816",
			"0810",
			"0814",
			"0903",
			"0906",
			"0913",
			"0916",
		];
		const gloPrefixes = [
			"0805",
			"0807",
			"0705",
			"0815",
			"0811",
			"0905",
			"0915",
		];
		const airtelPrefixes = [
			"0802",
			"0808",
			"0708",
			"0812",
			"0701",
			"0902",
			"0904",
			"0907",
			"0901",
			"0912",
		];
		const nineMobilePrefixes = ["0809", "0817", "0818", "0909", "0908"];

		if (mtnPrefixes.includes(prefix)) return "MTN";
		if (gloPrefixes.includes(prefix)) return "GLO";
		if (airtelPrefixes.includes(prefix)) return "AIRTEL";
		if (nineMobilePrefixes.includes(prefix)) return "9MOBILE";
		return "";
	};

	useEffect(() => {
		if (phoneNumber.length === 11 && selectedProvider) {
			const provider = detectProviderFromNumber(phoneNumber);
			setDetectedNetwork(provider === selectedProvider.name ? provider : "");
			if (provider && provider !== selectedProvider.name) {
				Alert.alert(
					"Warning",
					`Phone number corresponds to ${provider}, but ${selectedProvider.name} is selected.`,
				);
			}
		} else {
			setDetectedNetwork("");
		}
	}, [phoneNumber, selectedProvider]);

	// Calculate selling price
	const selectAmount = (amount: number) => {
		setSelectedAmount(amount);
		const sellingPrices: { [key: number]: number } = {
			100: 99,
			200: 198,
			500: 495,
			1000: 990,
		};
		const sellingPrice = sellingPrices[amount] || amount * 0.99;
		setDiscountedPrice(sellingPrice);
	};

	// Validate phone number
	const validatePhoneNumber = (
		phone: string,
		provider: Provider | null,
	): boolean => {
		if (!phone || phone.length !== 11 || !/^\d{11}$/.test(phone)) {
			return false;
		}
		if (!provider) return false;
		const prefix = phone.slice(0, 4);
		const mtn = [
			"0803",
			"0806",
			"0703",
			"0706",
			"0707",
			"0813",
			"0816",
			"0810",
			"0814",
			"0903",
			"0906",
			"0913",
			"0916",
		];
		const glo = ["0805", "0807", "0705", "0815", "0811", "0905", "0915"];
		const airtel = [
			"0802",
			"0808",
			"0708",
			"0812",
			"0701",
			"0902",
			"0904",
			"0907",
			"0901",
			"0912",
		];
		const etisalat = ["0809", "0817", "0818", "0909", "0908"];
		const providerPrefixes: { [key: string]: string[] } = {
			MTN: mtn,
			GLO: glo,
			AIRTEL: airtel,
			"9MOBILE": etisalat,
		};
		return providerPrefixes[provider.name]?.includes(prefix) || false;
	};

	// Memoized PanResponder
	const panResponder = useMemo(
		() =>
			PanResponder.create({
				onStartShouldSetPanResponder: () => isSlideEnabled,
				onMoveShouldSetPanResponder: (_, gestureState) => {
					return (
						isSlideEnabled &&
						Math.abs(gestureState.dx) > Math.abs(gestureState.dy) &&
						Math.abs(gestureState.dx) > 5
					);
				},
				onPanResponderGrant: () => {
					gestureRef.current = { ...stateRef.current };
					scrollViewRef.current?.setNativeProps({ scrollEnabled: false });
				},
				onPanResponderMove: (_, gestureState) => {
					if (gestureState.dx > 0 && gestureState.dx <= 200) {
						slideAnim.setValue(gestureState.dx);
					}
				},
				onPanResponderRelease: async (_, gestureState) => {
					scrollViewRef.current?.setNativeProps({ scrollEnabled: true });
					if (gestureState.dx >= 100 && isSlideEnabled) {
						await handlePurchase();
					}
					Animated.spring(slideAnim, {
						toValue: 0,
						friction: 7,
						tension: 40,
						useNativeDriver: true,
					}).start();
				},
				onPanResponderTerminate: () => {
					scrollViewRef.current?.setNativeProps({ scrollEnabled: true });
					Animated.spring(slideAnim, {
						toValue: 0,
						friction: 7,
						tension: 40,
						useNativeDriver: true,
					}).start();
				},
			}),
		[isSlideEnabled],
	);

	// Fixed handlePurchase function following the data purchase pattern
	const handlePurchase = async () => {
		const { selectedProvider, phoneNumber, selectedAmount, discountedPrice } =
			gestureRef.current;

		if (
			!selectedProvider ||
			!phoneNumber ||
			!selectedAmount ||
			!discountedPrice ||
			balance === null ||
			!userEmail
		) {
			Alert.alert("Error", "Missing required information.");
			setTransactionModalVisible(true);
			setTransactionStatus("failed");
			return;
		}

		if (!validatePhoneNumber(phoneNumber, selectedProvider)) {
			Alert.alert(
				"Error",
				`Invalid phone number for ${selectedProvider.name}.`,
			);
			setTransactionModalVisible(true);
			setTransactionStatus("failed");
			return;
		}

		// Verify PIN existence before proceeding
		const pinExists = await verifyTransactionPin(userEmail);
		if (!pinExists) {
			Alert.alert(
				"Action Required",
				"Please create a transaction PIN to proceed with your purchase.",
			);
			// Clear user inputs
			setSelectedProvider(null);
			setPhoneNumber("");
			setSelectedAmount(null);
			setDiscountedPrice(null);
			setDetectedNetwork("");
			setIsPinCreationModalOpen(true);
			return;
		}

		if (balance < discountedPrice) {
			Alert.alert(
				"Error",
				`Insufficient balance. Required: ₦${formatNumberWithCommas(discountedPrice)}, Available: ₦${formatNumberWithCommas(balance)}`,
			);
			setTransactionModalVisible(true);
			setTransactionStatus("failed");
			return;
		}

		if (
			detectedNetwork &&
			detectedNetwork.toUpperCase() !== selectedProvider.name.toUpperCase()
		) {
			Alert.alert(
				"Error",
				`Phone number does not match the selected provider (${selectedProvider.name})`,
			);
			setTransactionModalVisible(true);
			setTransactionStatus("failed");
			return;
		}

		try {
			setTransactionModalVisible(true);
			setTransactionStatus("processing");

			const reference = await createTransactionReference();
			setReferenceId(reference);

			// Verify current wallet balance (but don't deduct yet)
			const { data: wallet, error: walletError } = await supabase
				.from("wallet")
				.select("balance")
				.eq("user_email", userEmail)
				.single();

			if (walletError && walletError.code !== "PGRST116") {
				throw new Error(
					`Failed to fetch wallet balance: ${walletError.message}`,
				);
			}

			const currentBalance = wallet?.balance ?? balance;

			if (currentBalance < discountedPrice) {
				Alert.alert(
					"Error",
					`Insufficient balance. Required: ₦${formatNumberWithCommas(discountedPrice)}, Available: ₦${formatNumberWithCommas(currentBalance)}`,
				);
				setTransactionModalVisible(false);
				return;
			}

			// Call Ebenkdata API FIRST (like data purchase does)
			const requestBody = {
				network: selectedProvider.networkId,
				amount: selectedAmount,
				mobile_number: phoneNumber,
				Ported_number: true,
				airtime_type: "VTU",
			};

			const purchaseResponse = await fetch("https://ebenkdata.com/api/topup/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Token de883370902cf73e68ed63f566dbf38a38719f03",
				},
				body: JSON.stringify(requestBody),
			});

			const responseText = await purchaseResponse.text();

			if (!purchaseResponse.ok) {
				// API FAILED - No wallet changes needed since we didn't deduct anything
				setTransactionStatus("failed");
				//   Alert.alert("Error", "Airtime purchase failed. Please try again.");
				return;
			}

			// API SUCCESS - Now record the transaction (this will handle wallet deduction automatically)
			const transactionData = {
				user_email: userEmail,
				amount: -discountedPrice,
				reference,
				status: "success",
				env: "live",
				metadata: {
					purchase: `Airtime ₦${selectedAmount.toLocaleString()} on ${selectedProvider.name}`,
					phone_number: phoneNumber,
					validity: "N/A",
					type: "airtime",
					actual_cost: discountedPrice,
					fees: {
						vat: 10,
						total_fee: 50,
						net_amount: discountedPrice - 50,
						transfer_fee: 10,
						api_network_fee: 30,
						wallet_management_fee: 10,
					},
					payment_date: new Date().toLocaleString("en-US", {
						timeZone: "Africa/Lagos",
					}),
					custom_fields: [
						{
							value: "Edges Network",
							display_name: "Mobile Payment",
							variable_name: "mobile_payment",
						},
					],
					payment_method: "Wallet",
				},
			};

			const { data: successTx, error: txError } = await supabase
				.from("transactions")
				.insert(transactionData)
				.select("id, created_at")
				.single();

			if (txError) {
				throw new Error(`Failed to record transaction: ${txError.message}`);
			}

			setTransactionStatus("success");

			Alert.alert(
				"Success",
				`Successfully purchased Airtime ₦${formatNumberWithCommas(selectedAmount)} on ${selectedProvider.name} for ₦${formatNumberWithCommas(discountedPrice)}. Sent to ${phoneNumber}.`,
			);

			router.push({
				pathname: "/success",
				params: {
					id: successTx.id,
					provider: selectedProvider.name,
					data: `Airtime ₦${selectedAmount.toLocaleString()}`,
					price: discountedPrice.toString(),
					date: new Date().toISOString(),
					status: "Success",
					phoneNumber,
					reference,
					metadata: JSON.stringify({
						validity: "N/A",
						payment_method: "Wallet",
						type: "airtime",
						actual_cost: discountedPrice,
					}),
				},
			});
		} catch (error: any) {
			console.error("Purchase error:", error);
			setTransactionStatus("failed");
			setTransactionModalVisible(false);
			Alert.alert(
				"Error",
				`Failed to process purchase: ${error.message || "Please try again."}`,
			);
		}
	};

	// Save transaction PIN
	const savePin = async () => {
		if (
			newPin.length < 4 ||
			newPin.length > 6 ||
			confirmPin.length < 4 ||
			confirmPin.length > 6
		) {
			Alert.alert("Error", "PIN must be 4-6 digits.");
			return;
		}
		if (newPin !== confirmPin) {
			Alert.alert("Error", "PINs do not match.");
			return;
		}
		if (!userEmail) {
			Alert.alert("Error", "User not authenticated.");
			return;
		}

		try {
			setLoading(true);
			const {
				data: { user },
				error: authError,
			} = await supabase.auth.getUser();
			if (authError || !user) {
				throw new Error(
					`User not authenticated: ${authError?.message || "Unknown error"}`,
				);
			}

			// Ensure profile exists
			const { data: profile, error: fetchError } = await supabase
				.from("profiles")
				.select("id")
				.eq("id", user.id)
				.single();

			if (fetchError && fetchError.code !== "PGRST116") {
				throw fetchError;
			}

			if (!profile) {
				const derivedUsername = userEmail.split("@")[0] || `user_${user.id}`;
				const { error: insertError } = await supabase.from("profiles").insert({
					id: user.id,
					email: userEmail,
					username: derivedUsername,
					transaction_pin: newPin,
					is_admin: false,
				});
				if (insertError) throw insertError;
			} else {
				const { error: updateError } = await supabase
					.from("profiles")
					.update({ transaction_pin: newPin })
					.eq("id", user.id);
				if (updateError) throw updateError;
			}

			// Verify PIN was saved
			const pinExists = await verifyTransactionPin(userEmail);
			if (!pinExists) {
				throw new Error("PIN verification failed after saving");
			}

			setHasPin(true);
			setIsPinCreationModalOpen(false);
			setNewPin("");
			setConfirmPin("");
			Alert.alert("Success", "Transaction PIN created.");
		} catch (error) {
			console.error("PIN Save Error:", error);
			Alert.alert("Error", "Unable to create PIN. Please retry.");
		} finally {
			setLoading(false);
		}
	};

	// Close modals
	const closeTransactionModal = () => {
		setTransactionModalVisible(false);
	};

	const closePinCreationModal = () => {
		setIsPinCreationModalOpen(false);
		setNewPin("");
		setConfirmPin("");
	};

	// Format number with commas
	const formatNumberWithCommas = (number: number | null): string => {
		if (number === null) return "";
		return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	};

	return (
		<View style={styles.container}>
			<View style={styles.fixedHeader}>
				<View style={styles.walletBalanceContainer}>
					<Text style={styles.walletBalanceLabel}>Wallet Balance:</Text>
					<Text style={styles.walletBalanceValue}>
						{isBalanceLoading
							? "Loading..."
							: `₦${formatNumberWithCommas(balance)}`}
					</Text>
				</View>
			</View>
			<ScrollView
				ref={scrollViewRef}
				contentContainerStyle={styles.scrollContent}
				scrollEnabled={true}
			>
				<Text style={styles.sectionTitle}>Select Provider</Text>
				<Text style={styles.debugText}>
					Selected Provider: {selectedProvider ? selectedProvider.name : "None"}
				</Text>
				{loading ? (
					<ActivityIndicator
						size="large"
						color="#00ff99"
						style={styles.loader}
					/>
				) : providers.length === 0 ? (
					<Text style={styles.noProviderText}>No providers available.</Text>
				) : (
					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						contentContainerStyle={styles.providerContainer}
					>
						{providers.map((provider) => (
							<TouchableOpacity
								key={provider.id}
								onPress={() => handleSelectProvider(provider)}
								style={[
									styles.providerCard,
									selectedProvider?.id === provider.id &&
										styles.providerCardSelected,
								]}
								activeOpacity={0.7}
							>
								<Image
									source={provider.image}
									style={styles.providerLogo}
									resizeMode="contain"
								/>
								<Text style={styles.providerName}>{provider.name}</Text>
							</TouchableOpacity>
						))}
					</ScrollView>
				)}

				<View style={styles.inputContainer}>
					<Text style={styles.inputLabel}>Phone Number</Text>
					<TextInput
						style={styles.phoneInput}
						value={phoneNumber}
						onChangeText={setPhoneNumber}
						placeholder="Enter 11-digit phone number"
						placeholderTextColor="#A1A1AA"
						keyboardType="numeric"
						maxLength={11}
					/>
				</View>

				<Text style={styles.sectionTitle}>Select Airtime Amount</Text>
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					style={styles.amountScroll}
				>
					{AIRTIME_AMOUNTS.map((amount) => (
						<TouchableOpacity
							key={amount}
							onPress={() => selectAmount(amount)}
							style={[
								styles.amountButton,
								selectedAmount === amount && styles.amountButtonSelected,
							]}
							activeOpacity={0.7}
						>
							<Text style={styles.amountText}>
								₦{formatNumberWithCommas(amount)}
							</Text>
						</TouchableOpacity>
					))}
				</ScrollView>

				<View style={styles.discountBar}>
					<Text style={styles.discountLabel}>Amount to pay:</Text>
					<Text style={styles.discountValue}>
						₦{formatNumberWithCommas(discountedPrice)}
					</Text>
				</View>

				<Animated.View
					{...panResponder.panHandlers}
					style={[
						styles.slideContainer,
						{ transform: [{ translateX: slideAnim }] },
						!isSlideEnabled && styles.slideContainerDisabled,
					]}
					accessible
					accessibilityLabel="Slide to confirm purchase"
					accessibilityRole="button"
				>
					<View style={styles.slideTextContainer}>
						<Text
							style={[
								styles.slideText,
								!isSlideEnabled && styles.slideTextDisabled,
							]}
						>
							{isSlideEnabled
								? "Slide to Purchase"
								: "Complete all fields to purchase"}
						</Text>
						{isSlideEnabled && (
							<Ionicons name="arrow-forward" size={20} color="#3B82F6" />
						)}
					</View>
				</Animated.View>

				<TransactionStatusModal
					visible={transactionModalVisible}
					onClose={closeTransactionModal}
					transactionStatus={transactionStatus}
					selectedPlan={{ amount: selectedAmount || 0, type: "airtime" }}
					phoneNumber={phoneNumber}
					networkProvider={selectedProvider?.name || ""}
				/>

				<CreatePinModal
					visible={isPinCreationModalOpen}
					onClose={closePinCreationModal}
					newPin={newPin}
					setNewPin={setNewPin}
					confirmPin={confirmPin}
					setConfirmPin={setConfirmPin}
					showNewPin={isNewPinVisible}
					setShowNewPin={setIsNewPinVisible}
					showConfirmPin={isConfirmPinVisible}
					setShowConfirmPin={setIsConfirmPinVisible}
					onSave={savePin}
					isLoading={loading}
				/>
			</ScrollView>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#000",
	},
	fixedHeader: {
		backgroundColor: "#000",
		paddingTop: 16,
		paddingHorizontal: 16,
		zIndex: 1,
	},
	walletBalanceContainer: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		backgroundColor: "#1E1E1E",
		borderRadius: 8,
		padding: 12,
		marginBottom: 16,
	},
	walletBalanceLabel: {
		fontSize: 16,
		fontWeight: "600",
		color: "#A1A1AA",
	},
	walletBalanceValue: {
		fontSize: 16,
		fontWeight: "600",
		color: "#fff",
	},
	scrollContent: {
		paddingHorizontal: 16,
		paddingBottom: 24,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: "600",
		color: "#fff",
		marginBottom: 12,
	},
	debugText: {
		fontSize: 14,
		fontWeight: "500",
		color: "#00ff99",
		marginBottom: 16,
		textAlign: "center",
	},
	providerContainer: {
		flexDirection: "row",
		justifyContent: "space-between",
		gap: 12,
		marginBottom: 24,
	},
	providerCard: {
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "#1E1E1E",
		borderRadius: 12,
		padding: 16,
		width: 100,
		height: 100,
		elevation: 4,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 4,
	},
	providerCardSelected: {
		borderColor: "#00ff99",
		borderWidth: 3,
		backgroundColor: "#2F2F2F",
	},
	providerLogo: {
		width: 48,
		height: 48,
		borderRadius: 12,
		marginBottom: 8,
	},
	providerName: {
		fontSize: 14,
		fontWeight: "600",
		color: "#fff",
	},
	noProviderText: {
		fontSize: 16,
		color: "#A1A1AA",
		textAlign: "center",
		marginBottom: 24,
	},
	inputContainer: {
		marginBottom: 24,
	},
	inputLabel: {
		fontSize: 16,
		color: "#A1A1AA",
		marginBottom: 8,
	},
	phoneInput: {
		backgroundColor: "#1E1E1E",
		borderRadius: 8,
		padding: 12,
		fontSize: 16,
		color: "#fff",
	},
	amountScroll: {
		marginBottom: 24,
	},
	amountButton: {
		backgroundColor: "#1E1E1E",
		borderRadius: 8,
		paddingVertical: 12,
		paddingHorizontal: 20,
		marginRight: 12,
	},
	amountButtonSelected: {
		borderColor: "#00ff99",
		borderWidth: 2,
		backgroundColor: "#2F2F2F",
	},
	amountText: {
		fontSize: 16,
		fontWeight: "600",
		color: "#fff",
	},
	discountBar: {
		flexDirection: "row",
		justifyContent: "space-between",
		backgroundColor: "#1E1E1E",
		borderRadius: 8,
		padding: 16,
		marginBottom: 24,
	},
	discountLabel: {
		fontSize: 16,
		fontWeight: "500",
		color: "#A1A1AA",
	},
	discountValue: {
		fontSize: 16,
		fontWeight: "600",
		color: "#00ff99",
	},
	slideContainer: {
		paddingVertical: 16,
		paddingHorizontal: 24,
		backgroundColor: "#1E1E1E",
		borderRadius: 8,
		overflow: "hidden",
	},
	slideContainerDisabled: {
		backgroundColor: "#2D2D2D",
		opacity: 0.6,
	},
	slideTextContainer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	slideText: {
		fontSize: 16,
		fontWeight: "600",
		color: "#3B82F6",
	},
	slideTextDisabled: {
		fontWeight: "600",
		color: "#A1A1AA",
	},
	loader: {
		marginTop: 20,
	},
});

export default AirtimeProvider;
