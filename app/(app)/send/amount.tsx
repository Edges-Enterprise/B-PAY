import React, { useState, useEffect, useRef } from "react";
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	ScrollView,
	StyleSheet,
	KeyboardAvoidingView,
	Platform,
	Animated,
	Image,
	Alert,
	Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/config/supabase";
import { useAuth } from "@/stores/auth-store";
import PinModal from "@/components/send/PinModal";
import * as LocalAuthentication from 'expo-local-authentication';

const quickAmounts = [500, 1000, 2000, 5000, 10000, 20000];
const { width, height } = Dimensions.get('window');

// Bank-specific color mapping
const BANK_COLORS = {
	"100004": "#FFFFFF", // OPay
	"100033": "#FFFFFF", // PalmPay
	"090110": "#FFFFFF", // VFD MFB
	"000013": "#FFFFFF", // GTBANK PLC
	"000015": "#FFFFFF", // ZENITH BANK
	"000014": "#FFFFFF", // ACCESS BANK
	"000016": "#FFFFFF", // FIRST BANK OF NIGERIA
	"000004": "#FFFFFF", // UNITED BANK FOR AFRICA
	"000033": "#FFFFFF", // ENAIRA
	"000029": "#FFFFFF", // LOTUS BANK
	"000037": "#FFFFFF", // ALTERNATIVE BANK LIMITED
	default: "#666666",
};

const BankLogo = ({ bankCode, bankName, size = 40, logoUrl }) => {
	const [imageError, setImageError] = useState(false);
	const [imageLoaded, setImageLoaded] = useState(false);

	// Get bank-specific color
	const getBankColor = (code) => {
		return BANK_COLORS[code] || BANK_COLORS.default;
	};

	const bankColor = getBankColor(bankCode);
	const isWhiteBackground = bankColor === "#FFFFFF";
	const initial = bankName ? bankName[0].toUpperCase() : "B";

	// Show logo if available and not errored
	if (logoUrl && !imageError) {
		return (
			<View style={[styles.bankLogoContainer, { width: size, height: size }]}>
				<View
					style={[
						styles.bankLogoBackground,
						{
							backgroundColor: bankColor,
							width: size,
							height: size,
							borderRadius: size / 2,
							borderWidth: isWhiteBackground ? 1 : 0,
							borderColor: isWhiteBackground ? "#333" : "transparent",
						},
					]}
				>
					<Image
						source={{ uri: logoUrl }}
						style={[
							styles.bankLogoImage,
							{
								width: size * 0.7,
								height: size * 0.7,
								opacity: imageLoaded ? 1 : 0,
							},
						]}
						onLoad={() => setImageLoaded(true)}
						onError={() => setImageError(true)}
					/>
					{!imageLoaded && (
						<View style={styles.loadingPlaceholder}>
							<Text
								style={[
									styles.bankLogoInitial,
									{
										fontSize: size * 0.3,
										color: isWhiteBackground ? "#000" : "#fff",
									},
								]}
							>
								{initial}
							</Text>
						</View>
					)}
				</View>
			</View>
		);
	}

	// Fallback to colored initial
	return (
		<View style={[styles.bankLogoContainer, { width: size, height: size }]}>
			<View
				style={[
					styles.bankLogoFallback,
					{
						width: size,
						height: size,
						backgroundColor: bankColor,
						borderRadius: size / 2,
						borderWidth: isWhiteBackground ? 1 : 0,
						borderColor: isWhiteBackground ? "#333" : "transparent",
					},
				]}
			>
				<Text
					style={[
						styles.bankLogoInitial,
						{
							fontSize: size * 0.35,
							color: isWhiteBackground ? "#000" : "#fff",
						},
					]}
				>
					{initial}
				</Text>
			</View>
		</View>
	);
};

const AmountEntryScreen = () => {
	const { user } = useAuth();
	const params = useLocalSearchParams();
	const [amount, setAmount] = useState("");
	const [remark, setRemark] = useState("");
	const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("balance");
	const [fullAmount, setFullAmount] = useState(0);
	const [showPinModal, setShowPinModal] = useState(false);
	const [showOtherPaymentMethods, setShowOtherPaymentMethods] = useState(false);
	const [biometricAvailable, setBiometricAvailable] = useState(false);
	const [biometricType, setBiometricType] = useState<LocalAuthentication.AuthenticationType[]>([]);
	const [isBiometricSending, setIsBiometricSending] = useState(false);

	// Watermark pulse animation
	const watermarkPulse = useRef(new Animated.Value(1)).current;

	// Get all params from previous screen
	const accountNumber = params.accountNumber as string;
	const accountName = params.accountName as string;
	const bankCode = params.bankCode as string;
	const bankName = params.bankName as string;
	const logoUrlParam = params.logoUrl as string;

	// Check biometric availability on component mount
	useEffect(() => {
		checkBiometricAvailability();
	}, []);

	const checkBiometricAvailability = async () => {
		try {
			const hasHardware = await LocalAuthentication.hasHardwareAsync();
			const isEnrolled = await LocalAuthentication.isEnrolledAsync();
			const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
			
			setBiometricAvailable(hasHardware && isEnrolled);
			setBiometricType(supportedTypes);
		} catch (error) {
			console.error('Error checking biometric availability:', error);
			setBiometricAvailable(false);
		}
	};

	// Fetch bank logo from database
	const { data: bankData } = useQuery({
		queryKey: ["bankLogo", bankCode],
		queryFn: async () => {
			const { data, error } = await supabase
				.from("bank_account_prefixes")
				.select("logo_url")
				.eq("bank_code", bankCode)
				.single();

			if (error) {
				console.log("Error fetching bank logo:", error);
				return { logo_url: null };
			}

			return data || { logo_url: null };
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
	});

	// Use database logo URL or fallback to param
	const logoUrl = bankData?.logo_url || logoUrlParam;

	// Start pulse animation for watermark icon
	useEffect(() => {
		Animated.loop(
			Animated.sequence([
				Animated.timing(watermarkPulse, {
					toValue: 1.06,
					duration: 3000,
					useNativeDriver: true,
				}),
				Animated.timing(watermarkPulse, {
					toValue: 1,
					duration: 3000,
					useNativeDriver: true,
				}),
			]),
		).start();
	}, []);

	// Fetch user profile for balance only
	const { data: profileData } = useQuery({
		queryKey: ["userProfile", user.id],
		queryFn: async () => {
			const { data, error } = await supabase
				.from("profiles")
				.select("currency_symbol, balance")
				.eq("id", user.id)
				.single();
			if (error) throw error;
			return data;
		},
	});

	useEffect(() => {
		const clean = amount.replace(/,/g, "");
		const num = parseFloat(clean) || 0;
		setFullAmount(num);
	}, [amount]);

	const handleAmountChange = (text: string) => {
		let cleaned = text.replace(/[^0-9.]/g, "");
		const parts = cleaned.split(".");

		if (parts.length > 2) {
			cleaned = parts[0] + "." + parts.slice(1).join("");
		}

		const decimalPart = parts[1] !== undefined ? parts[1].slice(0, 2) : "";
		const wholePart = parts[0] || "";
		const formattedWhole = wholePart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

		let final = formattedWhole;
		if (parts[1] !== undefined) {
			final += "." + decimalPart;
		}

		setAmount(final);
	};

	const handleQuickAmount = (amt: number) => {
		setAmount(amt.toLocaleString() + ".00");
	};

	const getAvailableBalance = () => {
		switch (selectedPaymentMethod) {
			case "balance":
				return profileData?.balance || 0;
			case "enubis":
				return 0; // Always 0 - disabled
			case "bpay":
				return 0; // Always 0 - disabled
			case "rewards":
				return 0; // Always 0 - disabled
			default:
				return profileData?.balance || 0;
		}
	};

	const getPaymentMethodName = (method: string) => {
		switch (method) {
			case "balance":
				return "Account Balance";
			case "enubis":
				return "Enubis Wallet";
			case "bpay":
				return "Bpay Wallet";
			case "rewards":
				return "Rewards";
			default:
				return "Account Balance";
		}
	};

	const getPaymentMethodIcon = (method: string) => {
		switch (method) {
			case "balance":
				return "card";
			case "enubis":
				return "wallet";
			case "bpay":
				return "phone-portrait";
			case "rewards":
				return "gift";
			default:
				return "card";
		}
	};

	const canProceed = fullAmount > 0 && fullAmount <= getAvailableBalance();

	// Perform biometric authentication
	const performBiometricAuthentication = async (): Promise<boolean> => {
		try {
			const authResult = await LocalAuthentication.authenticateAsync({
				promptMessage: 'Authenticate to send money',
				fallbackLabel: 'Use PIN instead',
				disableDeviceFallback: false,
				cancelLabel: 'Cancel',
			});

			return authResult.success;
		} catch (error) {
			console.error('Biometric authentication error:', error);
			return false;
		}
	};

	const handlePay = () => {
		if (!canProceed) return;
		setShowPinModal(true);
	};

	// Handle PIN success - navigate to success screen with all data
	const handlePinSuccess = async (pin: string) => {
		// Navigate to success screen with ALL transaction data for processing
		router.push({
			pathname: "/(app)/send/success",
			params: {
				amount: fullAmount.toString(),
				accountName,
				accountNumber,
				bankCode,
				bankName,
				remark: remark || "",
				selectedPaymentMethod,
				authMethod: "pin",
				pin: pin, // Pass the PIN to success screen
				userId: user.id, // Pass user ID
				status: "processing", // Start as processing
				processingMessage: "Validating your PIN...",
			},
		});
	};

	// Handle biometric send
	const handleBiometricSend = async () => {
		if (!canProceed) return;
		
		// Check if biometric is available
		if (!biometricAvailable) {
			Alert.alert(
				'Biometric Unavailable',
				'Biometric authentication is not available on this device. Please use the regular send button.',
				[{ text: 'OK' }]
			);
			return;
		}

		setIsBiometricSending(true);

		try {
			// Perform biometric authentication
			const isAuthenticated = await performBiometricAuthentication();
			
			if (!isAuthenticated) {
				Alert.alert(
					'Authentication Failed',
					'Biometric authentication was not successful. Please try again or use the regular send button.',
					[{ text: 'OK' }]
				);
				setIsBiometricSending(false);
				return;
			}

			// Navigate to success screen with ALL transaction data for processing
			router.push({
				pathname: "/(app)/send/success",
				params: {
					amount: fullAmount.toString(),
					accountName,
					accountNumber,
					bankCode,
					bankName,
					remark: remark || "",
					selectedPaymentMethod,
					authMethod: "biometric",
					userId: user.id, // Pass user ID
					status: "processing", // Start as processing
					processingMessage: "Processing your transfer...",
				},
			});
			
		} catch (error: any) {
			console.error('Biometric authentication error:', error);
			Alert.alert('Error', 'Authentication failed. Please try again.');
		} finally {
			setIsBiometricSending(false);
		}
	};

	const getCurrencySymbol = () => {
		return profileData?.currency_symbol || "₦";
	};

	const formatBalance = (balance: number) => {
		return balance.toLocaleString(undefined, {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		});
	};

	// Check if wallet is disabled (zero balance)
	const isWalletDisabled = (method: string) => {
		return method !== "balance";
	};

	const otherPaymentMethods = ["enubis", "bpay", "rewards"];

	// Get biometric type name for display
	const getBiometricTypeName = () => {
		if (biometricType.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
			return 'Fingerprint';
		} else if (biometricType.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
			return 'Face ID';
		} else if (biometricType.includes(LocalAuthentication.AuthenticationType.IRIS)) {
			return 'Iris Scan';
		}
		return 'Biometric';
	};

	return (
		<KeyboardAvoidingView
			style={styles.container}
			behavior={Platform.OS === "ios" ? "padding" : "height"}
		>
			{/* WATERMARK */}
			<Animated.View pointerEvents="none" style={styles.watermarkWrapper}>
				<Animated.Image
					source={require("@/assets/icons/home.png")}
					style={[styles.watermark, { transform: [{ scale: watermarkPulse }] }]}
					resizeMode="contain"
				/>
			</Animated.View>

			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerStyle={styles.scrollContent}
				keyboardShouldPersistTaps="handled"
			>
				{/* Recipient Card */}
				<View style={styles.section}>
					<View style={styles.recipientCard}>
						<BankLogo
							bankCode={bankCode}
							bankName={bankName}
							size={44}
							logoUrl={logoUrl}
						/>
						<View style={styles.recipientInfo}>
							<Text style={styles.recipientName} numberOfLines={1}>
								{accountName}
							</Text>
							<Text style={styles.recipientDetail}>
								{accountNumber} • {bankName}
							</Text>
						</View>
					</View>
				</View>

				{/* Amount Section */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Amount</Text>

					<View style={styles.inputContainer}>
						<Text style={styles.currencySymbol}>{getCurrencySymbol()}</Text>
						<TextInput
							style={styles.amountInput}
							placeholder="0.00"
							placeholderTextColor="#666"
							value={amount}
							onChangeText={handleAmountChange}
							keyboardType="decimal-pad"
							autoFocus
						/>
					</View>

					{/* Quick Amounts */}
					<View style={styles.quickAmountsContainer}>
						<View style={styles.quickAmountsGrid}>
							{quickAmounts.map((amt, index) => (
								<TouchableOpacity
									key={index}
									style={[
										styles.quickAmountButton,
										fullAmount === amt && styles.quickAmountButtonActive,
										amt > getAvailableBalance() &&
											styles.quickAmountButtonDisabled,
									]}
									onPress={() => handleQuickAmount(amt)}
									disabled={amt > getAvailableBalance()}
								>
									<Text
										style={[
											styles.quickAmountButtonText,
											fullAmount === amt && styles.quickAmountButtonTextActive,
											amt > getAvailableBalance() &&
												styles.quickAmountButtonTextDisabled,
										]}
									>
										{getCurrencySymbol()}
										{amt.toLocaleString()}
									</Text>
								</TouchableOpacity>
							))}
						</View>
					</View>
				</View>

				{/* Payment Method - Collapsible with arrow next to title */}
				<View style={styles.section}>
					<View style={styles.sectionHeaderWithArrow}>
						<Text style={styles.sectionTitle}>Payment Source</Text>
						<TouchableOpacity
							style={styles.arrowButton}
							onPress={() =>
								setShowOtherPaymentMethods(!showOtherPaymentMethods)
							}
						>
							<Ionicons
								name={showOtherPaymentMethods ? "chevron-up" : "chevron-down"}
								size={20}
								color="#FFD700"
							/>
						</TouchableOpacity>
					</View>

					{/* Always visible: Account Balance */}
					<View style={styles.paymentMethodsContainer}>
						<TouchableOpacity
							style={[
								styles.paymentMethod,
								selectedPaymentMethod === "balance" &&
									styles.paymentMethodSelected,
							]}
							onPress={() => setSelectedPaymentMethod("balance")}
						>
							<View
								style={[
									styles.paymentMethodIcon,
									selectedPaymentMethod === "balance" &&
										styles.paymentMethodIconSelected,
								]}
							>
								<Ionicons
									name="card"
									size={20}
									color={
										selectedPaymentMethod === "balance" ? "#FFFFFF" : "#FFD700"
									}
								/>
							</View>

							<View style={styles.paymentMethodInfo}>
								<Text
									style={[
										styles.paymentMethodName,
										selectedPaymentMethod === "balance" &&
											styles.paymentMethodNameSelected,
									]}
								>
									Account Balance
								</Text>
								<Text
									style={[
										styles.paymentMethodBalance,
										selectedPaymentMethod === "balance" &&
											styles.paymentMethodBalanceSelected,
									]}
								>
									{getCurrencySymbol()}
									{formatBalance(getAvailableBalance())}
								</Text>
							</View>

							<View style={styles.radioButton}>
								{selectedPaymentMethod === "balance" && (
									<View style={styles.radioButtonSelected} />
								)}
							</View>
						</TouchableOpacity>
					</View>

					{/* Other Payment Methods (Collapsible) */}
					{showOtherPaymentMethods && (
						<View style={styles.otherPaymentMethodsContainer}>
							{otherPaymentMethods.map((method) => {
								const disabled = isWalletDisabled(method);
								const isSelected = selectedPaymentMethod === method;

								return (
									<TouchableOpacity
										key={method}
										style={[
											styles.paymentMethod,
											isSelected && styles.paymentMethodSelected,
											disabled && styles.paymentMethodDisabled,
											styles.otherPaymentMethod,
										]}
										onPress={() =>
											!disabled && setSelectedPaymentMethod(method)
										}
										disabled={disabled}
									>
										<View
											style={[
												styles.paymentMethodIcon,
												isSelected && styles.paymentMethodIconSelected,
											]}
										>
											<Ionicons
												name={getPaymentMethodIcon(method)}
												size={20}
												color={
													disabled ? "#666" : isSelected ? "#FFFFFF" : "#FFD700"
												}
											/>
										</View>

										<View style={styles.paymentMethodInfo}>
											<Text
												style={[
													styles.paymentMethodName,
													disabled && styles.paymentMethodNameDisabled,
													isSelected && styles.paymentMethodNameSelected,
												]}
											>
												{getPaymentMethodName(method)}
											</Text>
											<Text
												style={[
													styles.paymentMethodBalance,
													disabled && styles.paymentMethodBalanceDisabled,
													isSelected && styles.paymentMethodBalanceSelected,
												]}
											>
												{getCurrencySymbol()}0.00
											</Text>
										</View>

										{disabled ? (
											<Ionicons name="lock-closed" size={16} color="#666" />
										) : (
											<View style={styles.radioButton}>
												{isSelected && (
													<View style={styles.radioButtonSelected} />
												)}
											</View>
										)}
									</TouchableOpacity>
								);
							})}
						</View>
					)}
				</View>

				{/* Remark Section */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Remark (Optional)</Text>

					<View style={styles.inputContainer}>
						<TextInput
							style={styles.remarkInput}
							placeholder="Add a note..."
							placeholderTextColor="#666"
							value={remark}
							onChangeText={setRemark}
							maxLength={50}
							multiline
						/>
					</View>
					<Text style={styles.charCount}>{remark.length}/50</Text>
				</View>

				{/* Balance Warning */}
				{fullAmount > getAvailableBalance() && (
					<View style={styles.warningContainer}>
						<Text style={styles.warningSymbol}>⚠</Text>
						<Text style={styles.warningText}>Insufficient balance</Text>
					</View>
				)}
			</ScrollView>

			{/* STICKY FOOTER with Send and Biometric Buttons */}
			<View style={styles.footerContainer}>
				<View style={styles.footerButtons}>
					<TouchableOpacity
						style={[
							styles.sendButton,
							!canProceed && styles.sendButtonDisabled,
						]}
						onPress={handlePay}
						disabled={!canProceed}
					>
						<Text style={styles.sendButtonText}>Send</Text>
						<View style={styles.sendButtonAmount}>
							<Text style={styles.sendButtonAmountText}>
								{getCurrencySymbol()}
								{formatBalance(fullAmount)}
							</Text>
							<Ionicons name="arrow-forward" size={16} color="#FFD700" />
						</View>
					</TouchableOpacity>
					
					<TouchableOpacity
						style={[
							styles.biometricButton, 
							(!canProceed || !biometricAvailable || isBiometricSending) && styles.biometricButtonDisabled
						]}
						onPress={handleBiometricSend}
						disabled={!canProceed || !biometricAvailable || isBiometricSending}
					>
						{isBiometricSending ? (
							<View style={styles.biometricSpinner} />
						) : (
							<>
								<Ionicons 
									name="finger-print" 
									size={32} 
									color="#FFD700" 
								/>
								{!biometricAvailable && (
									<View style={styles.biometricUnavailableOverlay}>
										<Ionicons name="close-circle" size={16} color="#FF4444" />
									</View>
								)}
							</>
						)}
					</TouchableOpacity>
				</View>

				{!biometricAvailable && (
					<View style={styles.biometricHint}>
						<Ionicons name="information-circle" size={14} color="#888" />
						<Text style={styles.biometricHintText}>
							{getBiometricTypeName()} not available
						</Text>
					</View>
				)}

				<View style={styles.securityFooter}>
					<Ionicons name="shield-checkmark" size={18} color="#4CAF50" />
					<Text style={styles.securityText}>
						Instant and secure. Double-check the recipient.
					</Text>
				</View>
			</View>

			{/* Pin Modal */}
			<PinModal
				visible={showPinModal}
				onClose={() => setShowPinModal(false)}
				onSuccess={handlePinSuccess}
				onError={(error) => {
					Alert.alert("Error", error);
					setShowPinModal(false);
				}}
				onFingerprintAuth={handleBiometricSend}
			/>
		</KeyboardAvoidingView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#000",
	},
	watermarkWrapper: {
		...StyleSheet.absoluteFillObject,
		justifyContent: "center",
		alignItems: "center",
		zIndex: 1,
	},
	watermark: {
		width: 300,
		height: 300,
		opacity: 0.1,
	},
	scrollContent: {
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 160,
		zIndex: 10,
	},
	footerContainer: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		paddingHorizontal: 16,
		paddingBottom: 50,
		backgroundColor: '#000',
		zIndex: 20,
		borderTopWidth: 1,
		borderTopColor: '#222',
		paddingTop: 12,
	},
	footerButtons: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		marginBottom: 8,
	},
	section: {
		marginBottom: 24,
		zIndex: 2,
	},
	sectionHeaderWithArrow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 10,
	},
	sectionTitle: {
		color: "#fff",
		fontSize: 14,
		fontWeight: "600",
	},
	arrowButton: {
		padding: 4,
	},
	// Recipient Card
	recipientCard: {
		backgroundColor: "transparent",
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "transparent",
		flexDirection: "row",
		alignItems: "center",
		padding: 10,
	},
	recipientInfo: {
		flex: 1,
		marginLeft: 12,
	},
	recipientName: {
		color: "#fff",
		fontSize: 14,
		fontWeight: "500",
		marginBottom: 2,
	},
	recipientDetail: {
		color: "#FFD700",
		fontSize: 12,
	},
	// Bank Logo Styles
	bankLogoContainer: {
		alignItems: "center",
		justifyContent: "center",
	},
	bankLogoBackground: {
		alignItems: "center",
		justifyContent: "center",
		overflow: "hidden",
	},
	bankLogoImage: {
		resizeMode: "contain",
	},
	loadingPlaceholder: {
		position: "absolute",
		alignItems: "center",
		justifyContent: "center",
		width: "100%",
		height: "100%",
	},
	bankLogoFallback: {
		justifyContent: "center",
		alignItems: "center",
	},
	bankLogoInitial: {
		fontWeight: "bold",
	},
	// Amount Input
	inputContainer: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#111",
		borderRadius: 14,
		padding: 12,
		borderWidth: 1,
		borderColor: "#333",
	},
	currencySymbol: {
		color: "#FFD700",
		fontSize: 28,
		fontWeight: "300",
		marginRight: 8,
	},
	amountInput: {
		flex: 1,
		color: "#fff",
		fontSize: 28,
		fontWeight: "300",
		padding: 0,
	},
	remarkInput: {
		flex: 1,
		color: "#fff",
		fontSize: 15,
		padding: 0,
		minHeight: 40,
	},
	charCount: {
		color: "#666",
		fontSize: 11,
		textAlign: "right",
		marginTop: 4,
	},
	// Quick Amounts
	quickAmountsContainer: {
		marginTop: 16,
	},
	quickAmountsGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 10,
	},
	quickAmountButton: {
		backgroundColor: "#111",
		paddingHorizontal: 12,
		paddingVertical: 10,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: "#333",
		minWidth: "30%",
		flexGrow: 1,
	},
	quickAmountButtonActive: {
		backgroundColor: "#FFD70020",
		borderColor: "#FFD700",
	},
	quickAmountButtonDisabled: {
		opacity: 0.3,
	},
	quickAmountButtonText: {
		color: "#FFFFFF",
		fontSize: 12,
		fontWeight: "500",
		textAlign: "center",
	},
	quickAmountButtonTextActive: {
		color: "#FFD700",
		fontWeight: "600",
	},
	quickAmountButtonTextDisabled: {
		color: "#666",
	},
	// Payment Methods - Collapsible
	paymentMethodsContainer: {
		backgroundColor: "#111",
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "#222",
		overflow: "hidden",
	},
	otherPaymentMethodsContainer: {
		backgroundColor: "transparent",
		marginTop: 8,
	},
	paymentMethod: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 16,
		paddingVertical: 14,
		borderBottomWidth: 1,
		borderBottomColor: "#222",
	},
	otherPaymentMethod: {
		backgroundColor: "#111",
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "#222",
		marginBottom: 8,
	},
	paymentMethodSelected: {
		backgroundColor: "#FFD70020",
	},
	paymentMethodDisabled: {
		opacity: 0.4,
	},
	paymentMethodIcon: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: "#000",
		justifyContent: "center",
		alignItems: "center",
		marginRight: 12,
		borderWidth: 1,
		borderColor: "#FFD700",
	},
	paymentMethodIconSelected: {
		backgroundColor: "transparent",
		borderColor: "#FFD700",
	},
	paymentMethodInfo: {
		flex: 1,
	},
	paymentMethodName: {
		color: "#FFFFFF",
		fontSize: 14,
		fontWeight: "500",
		marginBottom: 2,
	},
	paymentMethodNameSelected: {
		color: "#FFD700",
	},
	paymentMethodNameDisabled: {
		color: "#666666",
	},
	paymentMethodBalance: {
		color: "#FFD700",
		fontSize: 12,
	},
	paymentMethodBalanceSelected: {
		color: "#FFD700",
		opacity: 0.9,
	},
	paymentMethodBalanceDisabled: {
		color: "#666666",
	},
	// Radio Button - Green
	radioButton: {
		width: 20,
		height: 20,
		borderRadius: 10,
		borderWidth: 2,
		borderColor: "#22C55E",
		justifyContent: "center",
		alignItems: "center",
	},
	radioButtonSelected: {
		width: 10,
		height: 10,
		borderRadius: 5,
		backgroundColor: "#22C55E",
	},
	// Warning - Red
	warningContainer: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#111",
		borderRadius: 8,
		padding: 12,
		borderWidth: 1,
		borderColor: "#EF444440",
		marginBottom: 20,
		gap: 8,
	},
	warningSymbol: {
		color: "#EF4444",
		fontSize: 16,
	},
	warningText: {
		color: "#EF4444",
		fontSize: 13,
		fontWeight: "500",
	},
	// Send Button (Reduced size with amount display)
	sendButton: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 14,
		paddingHorizontal: 16,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#FFD700',
		backgroundColor: 'transparent',
		minHeight: 56,
	},
	sendButtonDisabled: {
		borderColor: '#333',
		opacity: 0.5,
	},
	sendButtonText: {
		color: '#FFFFFF',
		fontSize: 16,
		fontWeight: 'bold',
	},
	sendButtonAmount: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	sendButtonAmountText: {
		color: '#FFD700',
		fontSize: 14,
		fontWeight: 'bold',
	},
	
	// Biometric Button
	biometricButton: {
		width: 56,
		height: 56,
		borderRadius: 28,
		borderWidth: 2,
		borderColor: '#FFD700',
		backgroundColor: 'transparent',
		alignItems: 'center',
		justifyContent: 'center',
		position: 'relative',
	},
	biometricButtonDisabled: {
		borderColor: '#333',
		opacity: 0.5,
	},
	biometricSpinner: {
		width: 24,
		height: 24,
		borderRadius: 12,
		borderWidth: 2,
		borderColor: '#FFD700',
		borderTopColor: 'transparent',
	},
	biometricUnavailableOverlay: {
			position: 'absolute',
			top: -5,
			right: -5,
			backgroundColor: '#000',
			borderRadius: 10,
			padding: 2,
		},
		
		// Biometric hint
		biometricHint: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			gap: 4,
			marginBottom: 8,
		},
		biometricHintText: {
			color: '#888',
			fontSize: 12,
			fontStyle: 'italic',
		},
		
		// Security Footer
		securityFooter: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			gap: 8,
			paddingVertical: 10,
			borderTopWidth: 1,
			borderTopColor: '#222',
		},
		securityText: {
			color: '#999',
			fontSize: 12,
			textAlign: 'center',
		},
	});
	
	export default AmountEntryScreen;