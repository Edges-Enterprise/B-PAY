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
	SafeAreaView,
} from "react-native";

import { supabase } from "@/config/supabase";
import { EXAM_IMAGES } from "@/constants/helper";

// Get screen dimensions for responsive design
const { width, height } = Dimensions.get("window");
const scaleFont = (size: number) => (width / 375) * size;
const scaleSize = (size: number) => (width / 375) * size;

// Define interfaces
interface ExamProvider {
	id: number;
	name: string;
	image: any; // Use 'any' to support require() for local images
	code: string;
	price: number;
	sellingPrice: number;
}

interface TransactionResult {
	id: string;
	provider: string;
	data: string;
	price: string;
	date: string;
	status: string;
	quantity: string;
	reference: string;
	metadata: string;
}

// Exam provider images sourced from helper.ts
const EXAM_PROVIDERS: ExamProvider[] = [
	{
		id: 1,
		name: "NECO",
		image: EXAM_IMAGES.NECO,
		code: "neco",
		price: 1250,
		sellingPrice: 1300,
	},
	{
		id: 2,
		name: "WAEC",
		image: EXAM_IMAGES.WAEC,
		code: "waec",
		price: 3400,
		sellingPrice: 3450,
	},
	{
		id: 3,
		name: "NABTEB",
		image: EXAM_IMAGES.NABTEB,
		code: "nabteb",
		price: 880,
		sellingPrice: 950,
	},
];

const Education: React.FC = () => {
	const [selectedProvider, setSelectedProvider] = useState<ExamProvider | null>(
		null,
	);
	const [quantity, setQuantity] = useState<string>("1");
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
	const quantityInputRef = useRef<TextInput>(null);
	const transactionPinInputRef = useRef<TextInput>(null);
	const [focusedInput, setFocusedInput] = useState<
		"quantity" | "transactionPin" | null
	>(null);

	// Animation for slide to pay
	const slideAnim = useRef(new Animated.Value(0)).current;
	const slideWidth = width - scaleSize(24);
	const maxSlideDistance = slideWidth * 0.6;

	// Animation for screen fade-in
	const fadeAnim = useRef(new Animated.Value(0)).current;

	// Pulse animation for slide to pay text
	const slidePulseAnim = useRef(new Animated.Value(0.7)).current;

	// Pulse animations for provider cards (odd indices)
	const pulseAnims = useRef<Animated.Value[]>([]).current;

	// Check if slide to pay should be enabled
	const isSlideEnabled =
		selectedProvider &&
		quantity &&
		parseInt(quantity) > 0 &&
		parseInt(quantity) <= 10 &&
		transactionPin.length >= 4 &&
		transactionPin.length <= 6;

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
			quantity,
			transactionPin,
			maxSlideDistance,
			slideAnim,
		],
	);

	// Screen fade-in animation
	useEffect(() => {
		Animated.timing(fadeAnim, {
			toValue: 1,
			duration: 500,
			useNativeDriver: true,
		}).start();
	}, []);

	// Initialize pulse animations for provider cards
	useEffect(() => {
		pulseAnims.length = 0;
		EXAM_PROVIDERS.forEach((_, index) => {
			if (index % 2 === 0) {
				const anim = new Animated.Value(1);
				pulseAnims[index] = anim;
				Animated.loop(
					Animated.sequence([
						Animated.timing(anim, {
							toValue: 1.05,
							duration: 1000,
							useNativeDriver: true,
						}),
						Animated.timing(anim, {
							toValue: 1,
							duration: 1000,
							useNativeDriver: true,
						}),
					]),
				).start();
			}
		});
	}, []);

	// Slide to pay pulse animation
	useEffect(() => {
		if (isSlideEnabled) {
			Animated.loop(
				Animated.sequence([
					Animated.timing(slidePulseAnim, {
						toValue: 1,
						duration: 750,
						useNativeDriver: true,
					}),
					Animated.timing(slidePulseAnim, {
						toValue: 0.7,
						duration: 750,
						useNativeDriver: true,
					}),
				]),
			).start();
		} else {
			slidePulseAnim.setValue(0.7);
		}
	}, [isSlideEnabled]);

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

				const newReferenceId = `EDGES_EXAM_${user.id}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
				setReferenceId(newReferenceId);
			} catch (error) {
				console.error("Error fetching user data:", error);
				Alert.alert("Error", "Failed to load user data. Please try again.");
			}
		};
		fetchUserData();
	}, []);

	// Handle provider selection
	const handleSelectProvider = (provider: ExamProvider) => {
		setSelectedProvider(provider);
		setQuantity("1");
	};

	// Reset form after successful transaction
	const resetForm = () => {
		setSelectedProvider(null);
		setQuantity("1");
		setTransactionPin("");
		setReferenceId(
			`EDGES_EXAM_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
		);
	};

	// Calculate total amount
	const getTotalAmount = () => {
		if (!selectedProvider || !quantity) return 0;
		return selectedProvider.sellingPrice * parseInt(quantity);
	};

	// Handle purchase
	const handlePurchase = async () => {
		if (!selectedProvider) {
			Alert.alert("Error", "Please select an exam provider.");
			setTransactionModalVisible(true);
			setTransactionStatus("failed");
			return;
		}
		if (!quantity || parseInt(quantity) <= 0 || parseInt(quantity) > 10) {
			Alert.alert("Error", "Please enter a valid quantity (1-10).");
			setTransactionModalVisible(true);
			setTransactionStatus("failed");
			return;
		}
		if (
			!transactionPin ||
			transactionPin.length < 4 ||
			transactionPin.length > 6
		) {
			Alert.alert(
				"Error",
				"Please enter a valid transaction PIN (4-6 digits).",
			);
			setTransactionModalVisible(true);
			setTransactionStatus("failed");
			return;
		}

		const totalAmount = getTotalAmount();
		if (balance < totalAmount) {
			// Alert.alert("Error", "Insufficient balance. Please fund your wallet.");
			setTransactionModalVisible(true);
			setTransactionStatus("failed");
			return;
		}

		try {
			const { data: userData, error: pinError } = await supabase
				.from("profiles")
				.select("transaction_pin")
				.eq("email", userEmail)
				.single();

			if (
				pinError ||
				!userData ||
				userData.transaction_pin !== transactionPin
			) {
				Alert.alert("Error", "Invalid transaction PIN.");
				setTransactionStatus("failed");
				setTransactionModalVisible(true);
				return;
			}
		} catch (error) {
			console.error("PIN verification error:", error);
			Alert.alert(
				"Error",
				"Failed to verify transaction PIN. Please try again.",
			);
			setTransactionStatus("failed");
			setTransactionModalVisible(true);
			return;
		}

		setTransactionModalVisible(true);
		setTransactionStatus("processing");

		try {
			const apiUrl = "https://ebenkdata.com/api/epin/";

			const requestBody = {
				exam_name: selectedProvider.name,
				quantity: quantity,
			};

			// console.log("Purchase request payload:", requestBody);

			const purchaseResponse = await fetch(apiUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Token de883370902cf73e68ed63f566dbf38a38719f03",
				},
				body: JSON.stringify(requestBody),
			});

			const responseData = await purchaseResponse.json();
			// console.log("Purchase response:", responseData);

			if (!purchaseResponse.ok) {
				throw new Error(
					`HTTP error! Status: ${purchaseResponse.status}, Message: ${responseData.message || "Unknown error"}`,
				);
			}

			const transactionData = {
				user_email: userEmail,
				amount: -totalAmount,
				reference: referenceId,
				status: "pending",
				metadata: {
					purchase: `${selectedProvider.name} Exam Pin x${quantity}`,
					quantity: quantity,
					type: "exam_pin",
					exam_name: selectedProvider.name,
					custom_fields: [
						{
							display_name: "Exam Pin Purchase",
							variable_name: "exam_pin_purchase",
							value: "EbenkData",
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
				throw new Error(
					`Failed to record pending transaction: ${pendingTxError.message}`,
				);
			}

			if (responseData.status !== "success" && !responseData.pins) {
				await supabase
					.from("transactions")
					.update({ status: "failed" })
					.eq("id", pendingTx.id);
				setTransactionStatus("failed");
				setTransactionResult({
					id: pendingTx.id,
					provider: selectedProvider.name,
					data: `${selectedProvider.name} Exam Pin x${quantity}`,
					price: totalAmount.toString(),
					date: new Date().toISOString(),
					status: "Failed",
					quantity: quantity,
					reference: referenceId,
					metadata: JSON.stringify({
						exam_name: selectedProvider.name,
						payment_method: "Wallet",
						type: "exam_pin",
						error: responseData.message || "Unknown error",
					}),
				});
				Alert.alert(
					"Error",
					responseData.message || "Exam pin purchase failed. Please try again.",
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
				throw new Error(
					`Failed to update wallet balance: ${walletUpdateError.message}`,
				);
			}

			const { error: successUpdateError } = await supabase
				.from("transactions")
				.update({ status: "success" })
				.eq("id", pendingTx.id);

			if (successUpdateError) {
				throw new Error(
					`Failed to update transaction status: ${successUpdateError.message}`,
				);
			}

			setBalance(newBalance);
			setTransactionStatus("success");
			setTransactionResult({
				id: pendingTx.id,
				provider: selectedProvider.name,
				data: `${selectedProvider.name} Exam Pin x${quantity}`,
				price: totalAmount.toString(),
				date: new Date().toISOString(),
				status: "Success",
				quantity: quantity,
				reference: referenceId,
				metadata: JSON.stringify({
					exam_name: selectedProvider.name,
					payment_method: "Wallet",
					type: "exam_pin",
					pins: responseData.pins || [],
					old_balance: balance,
					new_balance: newBalance,
				}),
			});
			resetForm();
		} catch (error: any) {
			console.error("Purchase error:", error);
			setTransactionStatus("failed");
			setTransactionResult({
				id: "N/A",
				provider: selectedProvider?.name || "Unknown",
				data: `${selectedProvider?.name || "Unknown"} Exam Pin x${quantity}`,
				price: getTotalAmount().toString(),
				date: new Date().toISOString(),
				status: "Failed",
				quantity: quantity,
				reference: referenceId,
				metadata: JSON.stringify({
					exam_name: selectedProvider?.name || "Unknown",
					payment_method: "Wallet",
					type: "exam_pin",
					error: error.message || "Unknown error",
				}),
			});
			Alert.alert(
				"Error",
				error.message || "Failed to process payment. Please try again.",
			);
		}
	};

	// Close transaction modal
	const closeTransactionModal = () => {
		setTransactionModalVisible(false);
		setTransactionResult(null);
	};

	// Format number with commas
	const formatNumberWithCommas = (number: number): string => {
		return number.toLocaleString();
	};

	return (
		<Animated.View style={[styles.rootContainer, { opacity: fadeAnim }]}>
			<SafeAreaView style={styles.safeArea}>
				<KeyboardAvoidingView
					style={styles.container}
					behavior={Platform.OS === "ios" ? "padding" : "height"}
					keyboardVerticalOffset={0}
				>
					<ScrollView
						ref={scrollViewRef}
						style={styles.scrollContainer}
						contentContainerStyle={[
							styles.innerContainer,
							{ paddingBottom: scaleSize(20) },
						]}
						showsVerticalScrollIndicator={false}
						keyboardShouldPersistTaps="handled"
					>
						<Text style={[styles.mainTitle, { marginTop: scaleSize(12) }]}>
							🎓 Exam Pins
						</Text>

						<Text style={styles.sectionTitle}>Select Exam Provider</Text>
						<View style={styles.providerScroll}>
							{EXAM_PROVIDERS.map((provider, index) => (
								<Animated.View
									key={provider.id}
									style={[
										styles.providerCard,
										selectedProvider?.id === provider.id &&
											styles.providerCardSelected,
										index % 2 === 0 &&
											!selectedProvider && {
												transform: [{ scale: pulseAnims[index] || 1 }],
											},
									]}
								>
									<Pressable onPress={() => handleSelectProvider(provider)}>
										<View style={styles.providerLogoContainer}>
											<Image
												source={provider.image}
												style={styles.providerLogo}
												resizeMode="contain"
											/>
										</View>
										<Text style={styles.providerName}>{provider.name}</Text>
									</Pressable>
								</Animated.View>
							))}
						</View>

						<View style={styles.inputContainer}>
							<Text style={styles.inputLabel}>Quantity (Max: 10)</Text>
							<TextInput
								ref={quantityInputRef}
								style={[
									styles.input,
									quantity &&
										parseInt(quantity) > 0 &&
										parseInt(quantity) <= 10 &&
										styles.inputValid,
									quantity &&
										(parseInt(quantity) <= 0 || parseInt(quantity) > 10) &&
										styles.inputInvalid,
								]}
								value={quantity}
								onChangeText={setQuantity}
								placeholder="Enter quantity"
								placeholderTextColor="#B0B0B0"
								keyboardType="numeric"
								maxLength={2}
								onFocus={() => setFocusedInput("quantity")}
								onBlur={() => setFocusedInput(null)}
							/>
						</View>

						<View style={styles.discountBar}>
							<Text style={styles.discountLabel}>Total Amount</Text>
							<Text style={styles.discountValue}>
								₦{formatNumberWithCommas(getTotalAmount())}
							</Text>
						</View>

						<View style={styles.transactionPinContainer}>
							<Text style={styles.transactionPinLabel}>Transaction PIN</Text>
							<TextInput
								ref={transactionPinInputRef}
								style={[
									styles.input,
									styles.transactionPinInput,
									transactionPin && styles.inputValid,
								]}
								value={transactionPin}
								onChangeText={setTransactionPin}
								placeholder="Enter PIN"
								placeholderTextColor="#B0B0B0"
								keyboardType="numeric"
								maxLength={6}
								secureTextEntry
								onFocus={() => setFocusedInput("transactionPin")}
								onBlur={() => setFocusedInput(null)}
							/>
						</View>

						<Animated.View
							style={[
								styles.slideTextWrapper,
								{ opacity: isSlideEnabled ? slidePulseAnim : 0.7 },
								{ transform: [{ translateX: slideAnim }] },
							]}
							{...panResponder.panHandlers}
						>
							<Text
								style={[
									styles.slideText,
									isSlideEnabled && styles.slideTextEnabled,
								]}
							>
								Slide to Pay
							</Text>
							<Text
								style={[
									styles.arrow,
									isSlideEnabled && styles.slideTextEnabled,
								]}
							>
								→
							</Text>
						</Animated.View>

						<View style={styles.footerContainer}>
							<Text style={styles.footerTitle}>Important Information</Text>
							<Text style={styles.footerText}>
								• Exam pins are delivered instantly after successful payment
							</Text>
							<Text style={styles.footerText}>
								• Keep your exam pins secure and confidential
							</Text>
							<Text style={styles.footerText}>
								• Contact support if you encounter any issues with your pins
							</Text>
						</View>
					</ScrollView>
				</KeyboardAvoidingView>
			</SafeAreaView>

			<Modal
				visible={transactionModalVisible}
				transparent
				animationType="fade"
				onRequestClose={closeTransactionModal}
			>
				<Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
					<View style={styles.modalContainer}>
						{transactionStatus === "processing" ? (
							<>
								<Text style={styles.modalTitle}>Processing Transaction</Text>
								<Text style={styles.modalMessage}>
									Please wait while we process your exam pin purchase...
								</Text>
							</>
						) : (
							<>
								<Text style={styles.modalTitle}>
									Transaction{" "}
									{transactionStatus === "success" ? "Successful" : "Failed"}
								</Text>
								{transactionResult && (
									<ScrollView style={styles.transactionDetails}>
										<Text style={styles.detailText}>
											Provider: {transactionResult.provider}
										</Text>
										<Text style={styles.detailText}>
											Service: {transactionResult.data}
										</Text>
										<Text style={styles.detailText}>
											Amount: ₦{transactionResult.price}
										</Text>
										<Text style={styles.detailText}>
											Quantity: {transactionResult.quantity}
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
										{transactionResult.metadata &&
											JSON.parse(transactionResult.metadata).pins && (
												<View style={styles.pinsContainer}>
													<Text style={styles.pinsTitle}>Your Exam Pins:</Text>
													{JSON.parse(transactionResult.metadata).pins.map(
														(pin: string, index: number) => (
															<Text key={index} style={styles.pinText}>
																{pin}
															</Text>
														),
													)}
												</View>
											)}
									</ScrollView>
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
				</Animated.View>
			</Modal>
		</Animated.View>
	);
};

const styles = StyleSheet.create({
	rootContainer: {
		flex: 1,
		backgroundColor: "#000000",
	},
	safeArea: {
		flex: 1,
		backgroundColor: "#000000",
	},
	container: {
		flex: 1,
		backgroundColor: "#000000",
	},
	scrollContainer: {
		flex: 1,
		backgroundColor: "#000000",
	},
	innerContainer: {
		paddingHorizontal: scaleSize(16),
		flexGrow: 1,
		backgroundColor: "#000000",
	},
	mainTitle: {
		fontSize: scaleFont(24),
		fontWeight: "700",
		color: "#FFD700",
		marginBottom: scaleSize(16),
		textAlign: "center",
	},
	sectionTitle: {
		fontSize: scaleFont(18),
		fontWeight: "600",
		color: "#FFFFFF",
		marginBottom: scaleSize(12),
	},
	providerScroll: {
		flexDirection: "row",
		flexWrap: "wrap",
		justifyContent: "space-between",
		marginBottom: scaleSize(16),
	},
	providerCard: {
		alignItems: "center",
		backgroundColor: "#1C1C1E",
		borderRadius: scaleSize(12),
		padding: scaleSize(12),
		width: scaleSize(100),
		height: scaleSize(120),
		marginBottom: scaleSize(12),
		justifyContent: "center",
		shadowColor: "#d7a77f",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.9,
		shadowRadius: 4,
		elevation: 4,
	},
	providerCardSelected: {
		borderColor: "#D7A77F",
		borderWidth: 2,
		backgroundColor: "#2A2A2C",
		transform: [{ scale: 1.05 }],
	},
	providerLogoContainer: {
		width: scaleSize(50),
		height: scaleSize(50),
		borderRadius: scaleSize(25),
		borderColor: "#D7A77F",
		borderWidth: 1.5,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#FFFFFF",
		marginBottom: scaleSize(8),
	},
	providerLogo: {
		width: scaleSize(40),
		height: scaleSize(40),
	},
	providerName: {
		fontSize: scaleFont(12),
		fontWeight: "600",
		color: "#FFFFFF",
		textAlign: "center",
		marginBottom: scaleSize(4),
	},
	providerPrice: {
		fontSize: scaleFont(10),
		fontWeight: "700",
		color: "#FFD700",
		textAlign: "center",
	},
	inputContainer: {
		marginBottom: scaleSize(16),
	},
	inputLabel: {
		fontSize: scaleFont(14),
		fontWeight: "500",
		color: "#B0B0B0",
		marginBottom: scaleSize(8),
	},
	input: {
		backgroundColor: "#1C1C1E",
		borderRadius: scaleSize(8),
		padding: scaleSize(12),
		fontSize: scaleFont(14),
		color: "#FFFFFF",
		width: "100%",
		borderColor: "#2A2A2C",
		borderWidth: 1,
	},
	inputValid: {
		borderColor: "#FFD700",
		shadowColor: "#FFD700",
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
	transactionPinContainer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: scaleSize(24),
	},
	transactionPinLabel: {
		fontSize: scaleFont(14),
		fontWeight: "500",
		color: "#B0B0B0",
	},
	transactionPinInput: {
		width: scaleSize(140),
		padding: scaleSize(8),
	},
	discountBar: {
		flexDirection: "row",
		justifyContent: "space-between",
		backgroundColor: "#1C1C1E",
		borderRadius: scaleSize(8),
		padding: scaleSize(16),
		marginBottom: scaleSize(24),
		borderColor: "#DAA520",
		borderWidth: 1,
	},
	discountLabel: {
		fontSize: scaleFont(14),
		fontWeight: "500",
		color: "#B0B0B0",
	},
	discountValue: {
		fontSize: scaleFont(14),
		fontWeight: "700",
		color: "#FFD700",
	},
	slideTextWrapper: {
		flexDirection: "row",
		alignItems: "center",
		marginTop: scaleSize(12),
		marginBottom: scaleSize(32),
	},
	slideText: {
		fontSize: scaleFont(16),
		fontWeight: "700",
		color: "#3B82F6",
	},
	slideTextEnabled: {
		color: "#FFD700",
	},
	arrow: {
		fontSize: scaleFont(20),
		color: "#3B82F6",
		marginLeft: scaleSize(8),
	},
	footerContainer: {
		marginTop: scaleSize(32),
		opacity: 0.5,
	},
	footerTitle: {
		fontSize: scaleFont(16),
		fontWeight: "700",
		color: "#FFD700",
		marginBottom: scaleSize(8),
	},
	footerText: {
		fontSize: scaleFont(12),
		fontWeight: "500",
		color: "#B0B0B0",
		marginBottom: scaleSize(6),
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: "rgba(0, 0, 0, 0.7)",
		justifyContent: "center",
		alignItems: "center",
	},
	modalContainer: {
		backgroundColor: "#1C1C1E",
		borderRadius: scaleSize(12),
		padding: scaleSize(20),
		width: "90%",
		maxHeight: height * 0.8,
		borderColor: "#DAA520",
		borderWidth: 1,
	},
	modalTitle: {
		fontSize: scaleFont(20),
		fontWeight: "700",
		color: "#FFFFFF",
		marginBottom: scaleSize(16),
		textAlign: "center",
	},
	modalMessage: {
		fontSize: scaleFont(14),
		fontWeight: "500",
		color: "#B0B0B0",
		textAlign: "center",
		marginBottom: scaleSize(20),
	},
	transactionDetails: {
		marginBottom: scaleSize(20),
	},
	detailText: {
		fontSize: scaleFont(12),
		fontWeight: "500",
		color: "#FFFFFF",
		marginBottom: scaleSize(8),
	},
	closeButton: {
		backgroundColor: "#FFD700",
		borderRadius: scaleSize(8),
		paddingVertical: scaleSize(12),
		alignItems: "center",
	},
	closeButtonText: {
		fontSize: scaleFont(16),
		fontWeight: "700",
		color: "#000000",
	},
	pinsContainer: {
		marginTop: scaleSize(12),
	},
	pinsTitle: {
		fontSize: scaleFont(14),
		fontWeight: "600",
		color: "#FFFFFF",
		marginBottom: scaleSize(8),
	},
	pinText: {
		fontSize: scaleFont(12),
		color: "#FFD700",
		marginBottom: scaleSize(4),
	},
});

export default Education;
