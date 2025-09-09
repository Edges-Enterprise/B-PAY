import React, { useState, useRef, useEffect, useMemo } from "react";
import {
	View,
	Text,
	Pressable,
	Image,
	StyleSheet,
	TextInput,
	Alert,
	Animated,
	PanResponder,
	Modal,
	Dimensions,
	ScrollView,
	KeyboardAvoidingView,
	Platform,
	Keyboard,
	StatusBar,
	Switch,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "@/config/supabase";
import { DISCO_PROVIDERS } from "@/constants/helper";
import { Ionicons } from "@expo/vector-icons";

// Get screen dimensions for responsive design
const { width, height } = Dimensions.get("window");
const scaleFont = (size: number) => (width / 375) * size;
const scaleSize = (size: number) => (width / 375) * size;

// Define interfaces
interface Provider {
	id: number;
	name: string;
	image: string;
	code: string;
	discoCode: string;
}

interface MeterType {
	label: string;
	value: string;
}

interface TransactionResult {
	id: string;
	provider: string;
	data: string;
	price: string;
	date: string;
	status: string;
	meterNumber: string;
	meterType: string;
	reference: string;
	metadata: string;
	errorMessage: string;
}

// Predefined amounts
const BILL_AMOUNTS = [1000, 2000, 5000, 10000, 20000, 50000];

// Meter types
const METER_TYPES: MeterType[] = [
	{ label: "Prepaid", value: "prepaid" },
	{ label: "Postpaid", value: "postpaid" },
];

const ElectricityBill: React.FC = () => {
	const [selectedProvider, setSelectedProvider] = useState<Provider | null>(
		null,
	);
	const [meterNumber, setMeterNumber] = useState<string>("");
	const [isMeterValid, setIsMeterValid] = useState<boolean>(false);
	const [meterOwnerName, setMeterOwnerName] = useState<string | null>(null);
	const [meterVerificationError, setMeterVerificationError] = useState<
		string | null
	>(null);
	const [isValidatingMeter, setIsValidatingMeter] = useState<boolean>(false);
	const [bypassVerification, setBypassVerification] = useState<boolean>(false);
	const [meterType, setMeterType] = useState<string>("prepaid");
	const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
	const [customAmount, setCustomAmount] = useState<string>("");
	const [discountedPrice, setDiscountedPrice] = useState<number | null>(null);
	const [transactionPin, setTransactionPin] = useState<string>("");
	const [balance, setBalance] = useState<number>(0);
	const [userEmail, setUserEmail] = useState<string>("");
	const [referenceId, setReferenceId] = useState<string>("");
	const [transactionModalVisible, setTransactionModalVisible] =
		useState<boolean>(false);
	const [transactionStatus, setTransactionStatus] = useState<
		"processing" | "success" | "failed"
	>("processing");
	const [transactionResult, setTransactionResult] =
		useState<TransactionResult | null>(null);
	const scrollViewRef = useRef<ScrollView>(null);
	const [keyboardHeight, setKeyboardHeight] = useState(0);
	const [focusedInput, setFocusedInput] = useState<
		"smartCard" | "transactionPin" | null
	>(null);

	// Animation for slide to pay
	const slideAnim = useRef(new Animated.Value(0)).current;
	const slideWidth = width - scaleSize(24); // Full width minus padding
	const maxSlideDistance = slideWidth * 0.6; // Slide 60% of the width

	// Check if slide to pay should be enabled
	const isSlideEnabled = useMemo(() => {
		const amount = selectedAmount || parseFloat(customAmount) || 0;
		return (
			!!selectedProvider &&
			(bypassVerification || isMeterValid) &&
			amount >= 1000 &&
			transactionPin.length >= 4 &&
			transactionPin.length <= 6
		);
	}, [
		selectedProvider,
		bypassVerification,
		isMeterValid,
		selectedAmount,
		customAmount,
		transactionPin,
	]);

	// Pan responder for slide to pay
	// Pan responder for slide to pay
	const panResponder = useMemo(
		() =>
			PanResponder.create({
				onStartShouldSetPanResponder: () => false,
				onMoveShouldSetPanResponder: (_, gestureState) =>
					isSlideEnabled &&
					Math.abs(gestureState.dx) > Math.abs(gestureState.dy) &&
					Math.abs(gestureState.dx) > 2,
				onPanResponderMove: (_, gestureState) => {
					if (gestureState.dx >= 0 && gestureState.dx <= maxSlideDistance) {
						slideAnim.setValue(gestureState.dx);
					}
				},
				onPanResponderRelease: (_, gestureState) => {
					if (gestureState.dx > maxSlideDistance * 0.5 && isSlideEnabled) {
						handlePurchase();
					}
					Animated.spring(slideAnim, {
						toValue: 0,
						useNativeDriver: true,
					}).start();
				},
			}),
		[
			isSlideEnabled,
			selectedProvider,
			bypassVerification,
			isMeterValid,
			selectedAmount,
			customAmount,
			transactionPin,
			maxSlideDistance,
			slideAnim,
		],
	);

	// Handle keyboard visibility
	useEffect(() => {
		const keyboardDidShowListener = Keyboard.addListener(
			Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
			(e) => {
				setKeyboardHeight(e.endCoordinates.height);
			},
		);

		const keyboardDidHideListener = Keyboard.addListener(
			Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
			() => {
				setKeyboardHeight(0);
				setFocusedInput(null);
			},
		);

		return () => {
			keyboardDidShowListener.remove();
			keyboardDidHideListener.remove();
		};
	}, []);

	// Local validate meter number
	const validateMeterNumber = (meter: string): boolean => {
		return meter.length === 11 && /^\d{11}$/.test(meter);
	};

	// Verify meter number using edge function
	const verifyMeterNumber = async (
		meter: string,
		provider: Provider,
		type: string,
	) => {
		setIsValidatingMeter(true);
		setMeterOwnerName(null);
		setMeterVerificationError(null);

		try {
			const { data: sessionData, error: sessionError } =
				await supabase.auth.getSession();
			if (sessionError || !sessionData.session) {
				throw new Error("User not authenticated");
			}
			const accessToken = sessionData.session.access_token;

			const apiUrl = `https://jjyyfaxcwanrmiipzkoj.supabase.co/functions/v1/electric-validation?meter_number=${meter}&disco=${provider.discoCode}&meter_type=${type}`;

			const response = await fetch(apiUrl, {
				method: "GET",
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			});

			const data = await response.json();

			if (
				response.ok &&
				data.status?.toLowerCase() === "success" &&
				data.name
			) {
				setMeterOwnerName(data.name);
				setMeterVerificationError(null);
			} else {
				setMeterOwnerName(null);
				setMeterVerificationError(data.message || "Validation failed");
			}
		} catch (error) {
			console.error("Meter verification error:", error);
			setMeterOwnerName(null);
			setMeterVerificationError(
				"Failed to verify meter number. Please try again.",
			);
		} finally {
			setIsValidatingMeter(false);
		}
	};

	// Update meter validity and trigger verification
	useEffect(() => {
		const localValid = validateMeterNumber(meterNumber);
		setIsMeterValid(localValid);
		if (!bypassVerification && localValid && selectedProvider) {
			verifyMeterNumber(meterNumber, selectedProvider, meterType);
		} else {
			setMeterOwnerName(null);
			setMeterVerificationError(null);
		}
	}, [meterNumber, selectedProvider, meterType, bypassVerification]);

	// Handle provider selection
	const handleSelectProvider = (provider: Provider) => {
		setSelectedProvider(provider);
	};

	// Handle amount selection
	const selectAmount = (amount: number) => {
		if (selectedAmount === amount) {
			setSelectedAmount(null);
			setCustomAmount("");
			setDiscountedPrice(null);
		} else {
			setSelectedAmount(amount);
			setCustomAmount("");
			calculatePrices(amount);
		}
	};

	// Handle custom amount input
	const handleCustomAmount = (text: string) => {
		setCustomAmount(text);
		setSelectedAmount(null);
		const amount = parseFloat(text);
		if (!isNaN(amount) && amount >= 1000) {
			calculatePrices(amount);
		} else {
			setDiscountedPrice(null);
		}
	};

	// Calculate prices (no discount)
	const calculatePrices = (amount: number) => {
		setDiscountedPrice(amount);
	};

	// Fetch user data
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

				const newReferenceId = `EDGES_ELEC_${user.id}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
				setReferenceId(newReferenceId);
			} catch (error) {
				console.error("Error fetching user data:", error);
				Alert.alert("Error", "Failed to load user data");
			}
		};
		fetchUserData();
	}, []);

	// Reset form after successful transaction
	const resetForm = () => {
		setSelectedProvider(null);
		setMeterNumber("");
		setMeterType("prepaid");
		setSelectedAmount(null);
		setCustomAmount("");
		setDiscountedPrice(null);
		setTransactionPin("");
		setBypassVerification(false);
		setMeterOwnerName(null);
		setMeterVerificationError(null);
		setReferenceId(
			`EDGES_ELEC_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
		);
	};

	// Handle bypass toggle
	const toggleBypass = () => {
		setBypassVerification((prev) => !prev);
		if (!bypassVerification) {
			setMeterNumber("");
		}
	};


	// Handle purchase
	const handlePurchase = async () => {
		const totalAmount = selectedAmount || parseFloat(customAmount) || 0;
		const baseTransactionResult: TransactionResult = {
			id: "N/A",
			provider: selectedProvider?.name || "Unknown",
			data: `Electricity ₦${totalAmount.toLocaleString() || "0"}`,
			price: (totalAmount || 0).toString(),
			date: new Date().toISOString(),
			status: "Failed",
			meterNumber,
			meterType,
			reference: referenceId,
			metadata: JSON.stringify({
				validity: "N/A",
				payment_method: "Wallet",
				type: "electricity",
				actual_cost: totalAmount || 0,
			}),
			errorMessage: "",
		};

		if (!selectedProvider) {
			setTransactionResult({
				...baseTransactionResult,
				errorMessage: "No provider selected",
			});
			Alert.alert("Error", "Please select a provider.");
			setTransactionStatus("failed");
			setTransactionModalVisible(true);
			return;
		}
		if (!bypassVerification && !isMeterValid) {
			setTransactionResult({
				...baseTransactionResult,
				errorMessage: "Invalid meter number",
			});
			Alert.alert("Error", "Please enter a valid 11-digit meter number.");
			setTransactionStatus("failed");
			setTransactionModalVisible(true);
			return;
		}
		if (!bypassVerification && !meterOwnerName) {
			setTransactionResult({
				...baseTransactionResult,
				errorMessage: "Meter verification failed",
			});
			Alert.alert(
				"Error",
				"Meter verification failed. Please ensure the meter number is valid or enable bypass verification.",
			);
			setTransactionStatus("failed");
			setTransactionModalVisible(true);
			return;
		}
		if (totalAmount < 1000) {
			setTransactionResult({
				...baseTransactionResult,
				errorMessage: "Amount below minimum",
			});
			Alert.alert("Error", "Please select or enter an amount (minimum ₦1000).");
			setTransactionStatus("failed");
			setTransactionModalVisible(true);
			return;
		}
		if (
			!transactionPin ||
			transactionPin.length < 4 ||
			transactionPin.length > 6
		) {
			setTransactionResult({
				...baseTransactionResult,
				errorMessage: "Invalid transaction PIN",
			});
			Alert.alert(
				"Error",
				"Please enter a valid transaction PIN (4-6 digits).",
			);
			setTransactionStatus("failed");
			setTransactionModalVisible(true);
			return;
		}
		if (balance < totalAmount) {
			setTransactionResult({
				...baseTransactionResult,
				errorMessage: "Insufficient balance",
			});
			Alert.alert("Error", "Insufficient balance. Please fund your wallet.");
			setTransactionStatus("failed");
			setTransactionModalVisible(true);
			return;
		}

		// Verify transaction PIN
		try {
			const { data: userData, error: pinError } = await supabase
				.from("users")
				.select("transaction_pin")
				.eq("email", userEmail)
				.single();

			if (
				pinError ||
				!userData ||
				userData.transaction_pin !== transactionPin
			) {
				setTransactionResult({
					...baseTransactionResult,
					errorMessage: "Invalid transaction PIN",
				});
				Alert.alert("Error", "Invalid transaction PIN");
				setTransactionStatus("failed");
				setTransactionModalVisible(true);
				return;
			}
		} catch (error) {
			console.error("PIN verification error:", error);
			setTransactionResult({
				...baseTransactionResult,
				errorMessage: "Failed to verify transaction PIN",
			});
			Alert.alert("Error", "Failed to verify transaction PIN");
			setTransactionStatus("failed");
			setTransactionModalVisible(true);
			return;
		}

		setTransactionModalVisible(true);
		setTransactionStatus("processing");

		try {
			const transactionData = {
				user_email: userEmail,
				amount: -totalAmount,
				reference: referenceId,
				status: "pending",
				metadata: {
					purchase: `Electricity ₦${totalAmount.toLocaleString()} on ${selectedProvider.name}`,
					meter_number: meterNumber,
					meter_type: meterType,
					validity: "N/A",
					type: "electricity",
					actual_cost: totalAmount,
					custom_fields: [
						{
							display_name: "Electricity Payment",
							variable_name: "electricity_payment",
							value: "Edges_Elec",
						},
					],
				},
			};

			const { data: pendingTx, error: pendingTxError } = await supabase
				.from("transactions")
				.insert(transactionData)
				.select("id, created_at")
				.single();

			if (pendingTxError) {
				throw new Error("Failed to record pending transaction");
			}

			const apiUrl = "https://lizzysub.com/api/bill";
			const requestBody = {
				disco: parseInt(selectedProvider.discoCode),
				meter_type: meterType,
				meter_number: meterNumber,
				amount: totalAmount,
				bypass: bypassVerification,
				"request-id": referenceId,
			};

			const purchaseResponse = await fetch(apiUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization:
						"Token b5b39c2645893a318c432507d00a91270f39bd987e5fcc904dc72276a00c",
				},
				body: JSON.stringify(requestBody),
			});

			const responseData = await purchaseResponse.json();

			if (responseData.status !== "success") {
				await supabase
					.from("transactions")
					.update({ status: "failed" })
					.eq("id", pendingTx.id);
				setTransactionStatus("failed");
				setTransactionResult({
					id: pendingTx.id,
					provider: selectedProvider.name,
					data: `Electricity ₦${totalAmount.toLocaleString()}`,
					price: totalAmount.toString(),
					date: new Date().toISOString(),
					status: "Failed",
					meterNumber,
					meterType,
					reference: referenceId,
					metadata: JSON.stringify({
						validity: "N/A",
						payment_method: "Wallet",
						type: "electricity",
						actual_cost: totalAmount,
					}),
					errorMessage:
						responseData.message || "Electricity bill payment failed",
				});
				Alert.alert(
					"Error",
					"Electricity bill payment failed. Please try again.",
				);
				return;
			}

			const newBalance = balance - totalAmount;
			const { error: walletUpdateError } = await supabase
				.from("wallet")
				.update({ balance: newBalance })
				.eq("user_email", userEmail);

			if (walletUpdateError) {
				await supabase
					.from("transactions")
					.update({ status: "failed" })
					.eq("id", pendingTx.id);
				throw new Error("Failed to update wallet balance");
			}

			const { error: successUpdateError } = await supabase
				.from("transactions")
				.update({ status: "success" })
				.eq("id", pendingTx.id);

			if (successUpdateError) {
				throw new Error("Failed to update transaction status");
			}

			setBalance(newBalance);
			setTransactionStatus("success");
			setTransactionResult({
				id: pendingTx.id,
				provider: responseData.disco_name || selectedProvider.name,
				data: `Electricity ₦${totalAmount.toLocaleString()}`,
				price: totalAmount.toString(),
				date: new Date().toISOString(),
				status: "Success",
				meterNumber,
				meterType,
				reference: referenceId,
				metadata: JSON.stringify({
					validity: "N/A",
					payment_method: responseData.wallet_vending || "Wallet",
					type: "electricity",
					actual_cost: totalAmount,
					token: responseData.token || "N/A",
				}),
				errorMessage: "", // Explicitly set to empty string for success
			});
			resetForm();
		} catch (error) {
			console.error("Purchase error:", error);
			setTransactionStatus("failed");
			setTransactionResult({
				...baseTransactionResult,
				id: "N/A",
				errorMessage: (error as Error).message || "Failed to process payment",
			});
			Alert.alert("Error", "Failed to process payment. Please try again.");
		}
	};

	// Close transaction modal
	const closeTransactionModal = () => {
		setTransactionModalVisible(false);
		setTransactionResult(null);
	};

	// Format number with commas
	const formatNumberWithCommas = (number: number | null): string => {
		if (number === null) return "0";
		return number.toLocaleString();
	};

	// Handle back navigation
	const handleBack = () => {
		router.back();
	};

	return (
		<View style={styles.rootContainer}>
			<StatusBar barStyle="light-content" backgroundColor="black" />
			<KeyboardAvoidingView
				style={styles.container}
				behavior={Platform.OS === "ios" ? "padding" : undefined}
				keyboardVerticalOffset={Platform.OS === "ios" ? scaleSize(100) : 0}
			>
				<ScrollView
					ref={scrollViewRef}
					style={styles.scrollContainer}
					contentContainerStyle={[
						styles.innerContainer,
						{ paddingBottom: keyboardHeight + scaleSize(20) },
					]}
					showsVerticalScrollIndicator={false}
					keyboardShouldPersistTaps="handled"
				>
					{/* Provider List */}
					<Text style={[styles.sectionTitle, { marginTop: scaleSize(12) }]}>
						Select Electricity Provider
					</Text>
					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						style={styles.providerScroll}
						contentContainerStyle={styles.providerScrollContent}
					>
						{DISCO_PROVIDERS.map((provider) => (
							<Pressable
								key={provider.id}
								onPress={() => handleSelectProvider(provider)}
								style={[
									styles.providerCard,
									selectedProvider?.id === provider.id &&
										styles.providerCardSelected,
								]}
							>
								<Image
									source={{ uri: provider.image }}
									style={styles.providerLogo}
									resizeMode="contain"
								/>
								<Text style={styles.providerName}>{provider.name}</Text>
							</Pressable>
						))}
					</ScrollView>

					{/* Meter Number Input */}
					<View style={styles.inputContainer}>
						<Text style={styles.inputLabel}>Meter Number</Text>
						<TextInput
							style={[
								styles.input,
								meterNumber &&
									isMeterValid &&
									!meterVerificationError &&
									!bypassVerification &&
									styles.inputValid,
								meterNumber &&
									(!isMeterValid || meterVerificationError) &&
									!bypassVerification &&
									styles.inputInvalid,
								bypassVerification && styles.inputBypassed,
							]}
							value={meterNumber}
							onChangeText={setMeterNumber}
							placeholder="Enter 11-digit meter number"
							placeholderTextColor="#A1A1AA"
							keyboardType="numeric"
							maxLength={11}
						/>
						{isValidatingMeter && (
							<Text style={styles.validatingText}>Validating meter...</Text>
						)}
						{meterOwnerName && !bypassVerification && (
							<Text style={styles.iucOwnerText}>Owner: {meterOwnerName}</Text>
						)}
						{meterVerificationError && !bypassVerification && (
							<Text style={styles.iucErrorText}>{meterVerificationError}</Text>
						)}
					</View>

					{/* Bypass Verification */}
					<View style={styles.bypassContainer}>
						<Text style={styles.bypassLabel}>Bypass Meter Verification</Text>
						<Switch
							value={bypassVerification}
							onValueChange={toggleBypass}
							trackColor={{ false: "#2D2D2D", true: "#D7A77F" }}
							thumbColor={bypassVerification ? "#FFFFFF" : "#A1A1AA"}
						/>
					</View>

					{/* Meter Type Selection */}
					<View style={styles.inputContainer}>
						<Text style={styles.inputLabel}>Meter Type</Text>
						<View style={styles.meterTypeContainer}>
							{METER_TYPES.map((type) => (
								<Pressable
									key={type.value}
									onPress={() => setMeterType(type.value)}
									style={[
										styles.meterTypeButton,
										meterType === type.value && styles.meterTypeButtonSelected,
									]}
								>
									<Text style={styles.meterTypeText}>{type.label}</Text>
								</Pressable>
							))}
						</View>
					</View>

					{/* Amount Selection */}
					<Text style={styles.sectionTitle}>Select Amount</Text>
					<View style={styles.amountScroll}>
						{BILL_AMOUNTS.map((amount) => (
							<Pressable
								key={amount}
								onPress={() => selectAmount(amount)}
								style={[
									styles.amountButton,
									selectedAmount === amount && styles.amountButtonSelected,
								]}
							>
								<Text
									style={[
										styles.amountText,
										selectedAmount === amount && styles.amountTextSelected,
									]}
									numberOfLines={1}
									ellipsizeMode="clip"
								>
									₦{amount.toLocaleString()}
								</Text>
							</Pressable>
						))}
					</View>

					{/* Amount to Pay */}
					<View style={styles.discountBar}>
						<Text style={styles.discountLabel}>Amount to pay</Text>
						<Text style={styles.discountValue}>
							₦{formatNumberWithCommas(discountedPrice)}
						</Text>
					</View>

					{/* Custom Amount Input */}
					<View style={styles.transactionPinContainer}>
						<Text style={styles.transactionPinLabel}>Custom Amount</Text>
						<TextInput
							style={[styles.input, styles.transactionPinInput]}
							value={customAmount}
							onChangeText={handleCustomAmount}
							placeholder="min 1000"
							placeholderTextColor="#A1A1AA"
							keyboardType="numeric"
						/>
					</View>

					{/* Transaction PIN Input */}
					<View style={styles.transactionPinContainer}>
						<Text style={styles.transactionPinLabel}>Transaction PIN</Text>
						<TextInput
							style={[styles.input, styles.transactionPinInput]}
							value={transactionPin}
							onChangeText={setTransactionPin}
							placeholder="Enter PIN"
							placeholderTextColor="#A1A1AA"
							keyboardType="numeric"
							maxLength={6}
							secureTextEntry
						/>
					</View>

					{/* Slide to Pay */}
					{selectedProvider ? (
						<View style={styles.slideTrack}>
							<Animated.View
								{...panResponder.panHandlers}
								style={[
									styles.slideTextContainer,
									{
										transform: [{ translateX: slideAnim }],
									},
								]}
							>
								<Text style={styles.slideText}>Slide to Pay</Text>
								<Text style={styles.arrow}>
									<Ionicons
										name="arrow-forward-sharp"
										size={24}
										color="#D7A77F"
									/>
								</Text>
							</Animated.View>
						</View>
					) : (
						<View style={[styles.slideTrack, styles.slideContainerDisabled]}>
							<View style={styles.slideTextContainer}>
								<Text style={[styles.slideText, styles.slideTextDisabled]}>
									Select a provider to pay
								</Text>
							</View>
						</View>
					)}
				</ScrollView>
			</KeyboardAvoidingView>

			{/* Transaction Status Modal */}
			<Modal
				visible={transactionModalVisible}
				transparent
				animationType="slide"
				onRequestClose={closeTransactionModal}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContainer}>
						{transactionStatus === "processing" ? (
							<>
								<Text style={styles.modalTitle}>Processing Transaction</Text>
								<Text style={styles.modalMessage}>
									Please wait while we process your payment...
								</Text>
							</>
						) : (
							<>
								<Text style={styles.modalTitle}>
									Transaction{" "}
									{transactionStatus === "success" ? "Successful" : "Failed"}
								</Text>
								{transactionResult && (
									<View style={styles.transactionDetails}>
										<Text style={styles.detailText}>
											Provider: {transactionResult.provider}
										</Text>
										<Text style={styles.detailText}>
											Amount: {transactionResult.data}
										</Text>
										<Text style={styles.detailText}>
											Price: ₦{transactionResult.price}
										</Text>
										<Text style={styles.detailText}>
											Meter Number: {transactionResult.meterNumber}
										</Text>
										<Text style={styles.detailText}>
											Meter Type: {transactionResult.meterType}
										</Text>
										<Text style={styles.detailText}>
											Reference: {transactionResult.reference}
										</Text>
										<Text style={styles.detailText}>
											Date: {new Date(transactionResult.date).toLocaleString()}
										</Text>
										<Text style={styles.detailText}>
											Status: {transactionResult.status}
										</Text>
									</View>
								)}
								<Pressable
									style={styles.closeButton}
									onPress={closeTransactionModal}
								>
									<Text style={styles.closeButtonText}>Close</Text>
								</Pressable>
							</>
						)}
					</View>
				</View>
			</Modal>
		</View>
	);
};

const styles = StyleSheet.create({
	rootContainer: {
		flex: 1,
		backgroundColor: "black",
	},
	container: {
		flex: 1,
		backgroundColor: "black",
	},
	scrollContainer: {
		flex: 1,
		backgroundColor: "black",
	},
	innerContainer: {
		paddingHorizontal: scaleSize(12),
		flexGrow: 1,
		backgroundColor: "black",
	},
	sectionTitle: {
		fontSize: scaleFont(16),
		fontWeight: "600",
		color: "white",
		marginBottom: scaleSize(8),
	},
	providerScroll: {
		marginBottom: scaleSize(4),
	},
	providerScrollContent: {
		flexDirection: "row",
		paddingRight: scaleSize(12),
	},
	providerCard: {
		alignItems: "center",
		backgroundColor: "#1E1E1E",
		borderRadius: scaleSize(10),
		padding: scaleSize(4),
		width: scaleSize(60),
		height: scaleSize(60),
		marginRight: scaleSize(8),
		justifyContent: "center",
	},
	providerCardSelected: {
		borderColor: "#D7A77F",
		borderWidth: 2,
		backgroundColor: "transparent",
	},
	providerLogo: {
		width: scaleSize(30),
		height: scaleSize(30),
		borderRadius: scaleSize(15),
		backgroundColor: "white",
		marginBottom: scaleSize(2),
	},
	providerName: {
		fontSize: scaleFont(8),
		fontWeight: "600",
		color: "white",
		textAlign: "center",
	},
	inputContainer: {
		marginBottom: scaleSize(30),
	},
	inputLabel: {
		fontSize: scaleFont(14),
		color: "#A1A1AA",
		marginBottom: scaleSize(6),
	},
	input: {
		backgroundColor: "#2D2D2D",
		borderRadius: scaleSize(6),
		padding: scaleSize(8),
		fontSize: scaleFont(14),
		color: "white",
		width: "100%",
		borderColor: "#2A2A2C",
		borderWidth: 1,
	},
	inputValid: {
		borderColor: "#D7A77F",
		shadowColor: "#D7A77F",
		shadowOffset: { width: 0, height: 0 },
		shadowOpacity: 0.3,
		shadowRadius: 4,
		elevation: 4,
	},
	inputInvalid: {
		borderColor: "#FF0000",
		shadowColor: "#FF0000",
		shadowOffset: { width: 0, height: 0 },
		shadowOpacity: 0.3,
		shadowRadius: 4,
		elevation: 4,
	},
	inputBypassed: {
		borderColor: "#A1A1AA",
	},
	validatingText: {
		fontSize: scaleFont(12),
		color: "#D7A77F",
		marginTop: scaleSize(4),
	},
	iucOwnerText: {
		fontSize: scaleFont(12),
		color: "#D7A77F",
		marginTop: scaleSize(4),
	},
	iucErrorText: {
		fontSize: scaleFont(12),
		color: "#FF0000",
		marginTop: scaleSize(4),
	},
	bypassContainer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: scaleSize(12),
	},
	bypassLabel: {
		fontSize: scaleFont(14),
		color: "#A1A1AA",
	},
	transactionPinContainer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: scaleSize(12),
	},
	transactionPinLabel: {
		fontSize: scaleFont(14),
		color: "#A1A1AA",
	},
	transactionPinInput: {
		width: scaleSize(120),
		padding: scaleSize(6),
	},
	meterTypeContainer: {
		flexDirection: "row",
		gap: scaleSize(8),
	},
	meterTypeButton: {
		flex: 1,
		backgroundColor: "#1E1E1E",
		borderRadius: scaleSize(6),
		paddingVertical: scaleSize(8),
		alignItems: "center",
	},
	meterTypeButtonSelected: {
		borderColor: "#D7A77F",
		borderWidth: 2,
		backgroundColor: "transparent",
	},
	meterTypeText: {
		fontSize: scaleFont(14),
		color: "white",
		fontWeight: "600",
	},
	amountScroll: {
		flexDirection: "row",
		flexWrap: "wrap",
		justifyContent: "space-between",
		marginBottom: scaleSize(12),
	},
	amountButton: {
		backgroundColor: "#1E1E1E",
		borderRadius: scaleSize(6),
		paddingVertical: scaleSize(8),
		paddingHorizontal: scaleSize(8),
		marginBottom: scaleSize(6),
		width: scaleSize(100),
		alignItems: "center",
		borderWidth: 2,
		borderColor: "transparent",
	},
	amountButtonSelected: {
		borderColor: "#D7A77F",
		backgroundColor: "transparent",
	},
	amountText: {
		fontSize: scaleFont(12),
		fontWeight: "600",
		color: "white",
	},
	amountTextSelected: {
		color: "#D7A77F",
	},
	discountBar: {
		flexDirection: "row",
		justifyContent: "space-between",
		backgroundColor: "#2D2D2D",
		borderRadius: scaleSize(6),
		padding: scaleSize(12),
		marginBottom: scaleSize(12),
	},
	discountLabel: {
		fontSize: scaleFont(14),
		color: "#A1A1AA",
	},
	discountValue: {
		fontSize: scaleFont(14),
		fontWeight: "600",
		color: "#D7A77F",
	},
	slideTrack: {
		marginTop: scaleSize(8),
		marginBottom: scaleSize(12),
		backgroundColor: "#2D2D2D",
		borderRadius: scaleSize(6),
		height: scaleSize(40),
		justifyContent: "center",
		overflow: "hidden",
	},
	slideTextContainer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: scaleSize(10),
	},
	slideContainerDisabled: {
		opacity: 0.5,
	},
	slideText: {
		fontSize: scaleFont(14),
		fontWeight: "600",
		color: "#D7A77F",
	},
	slideTextDisabled: {
		color: "#A1A1AA",
	},
	arrow: {
		fontSize: scaleFont(18),
		color: "#D7A77F",
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: "rgba(0, 0, 0, 0.5)",
		justifyContent: "center",
		alignItems: "center",
	},
	modalContainer: {
		backgroundColor: "#1E1E1E",
		borderRadius: scaleSize(10),
		padding: scaleSize(16),
		width: "90%",
		maxHeight: height * 0.8,
	},
	modalTitle: {
		fontSize: scaleFont(18),
		fontWeight: "bold",
		color: "white",
		marginBottom: scaleSize(12),
		textAlign: "center",
	},
	modalMessage: {
		fontSize: scaleFont(14),
		color: "#A1A1AA",
		textAlign: "center",
		marginBottom: scaleSize(16),
	},
	transactionDetails: {
		marginBottom: scaleSize(16),
	},
	detailText: {
		fontSize: scaleFont(12),
		color: "white",
		marginBottom: scaleSize(6),
	},
	closeButton: {
		backgroundColor: "#3B82F6",
		borderRadius: scaleSize(6),
		paddingVertical: scaleSize(10),
		alignItems: "center",
	},
	closeButtonText: {
		fontSize: scaleFont(14),
		fontWeight: "600",
		color: "white",
	},
});

export default ElectricityBill;
