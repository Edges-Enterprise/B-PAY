// app/(app)/(Auth)/login.tsx
import "react-native-gesture-handler";
import React, { useState, useEffect, useRef } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	TextInput,
	SafeAreaView,
	Modal,
	Pressable,
	Image,
	FlatList,
	Dimensions,
	Animated,
	ActivityIndicator,
	Alert,
	KeyboardAvoidingView,
	Platform,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import NetInfo from "@react-native-community/netinfo";
import * as Crypto from "expo-crypto";
import Checkbox from "expo-checkbox";
import { useAuth } from "@/stores/auth-store";
import * as LocalAuthentication from "expo-local-authentication";
import * as Device from "expo-device";
import * as Application from "expo-application";

const { width, height } = Dimensions.get("window");

// ──────── SUPABASE SETUP ────────
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ──────── CONSTANTS ────────
const BIOMETRIC_ENABLED_KEY = "biometricEnabled";
const DONT_SHOW_TRANSFER_PIN_KEY = "dontShowTransferPin";
const BIOMETRIC_ACCOUNT_KEY = "biometricAccount";

// ──────── COUNTRY DATA TYPE ────────
type Country = {
	code: string;
	flag: string;
	label: string;
	dial: string;
	currency_symbol?: string;
	min_length?: number;
	max_length?: number;
};

// ──────── COUNTRY VALIDATION RULES ────────
const COUNTRY_VALIDATION_RULES: Record<string, { min: number; max: number }> = {
	NG: { min: 10, max: 11 }, // Nigeria: 10 digits (without 0) or 11 digits (with 0)
	US: { min: 10, max: 10 }, // USA: 10 digits
	GB: { min: 10, max: 11 }, // UK: 10-11 digits
	CA: { min: 10, max: 10 }, // Canada: 10 digits
	AU: { min: 9, max: 10 }, // Australia: 9-10 digits
	IN: { min: 10, max: 10 }, // India: 10 digits
	ZA: { min: 9, max: 9 }, // South Africa: 9 digits
	KE: { min: 9, max: 10 }, // Kenya: 9-10 digits
	GH: { min: 9, max: 10 }, // Ghana: 9-10 digits
};

const getCountryValidationRules = (countryCode: string) => {
	return COUNTRY_VALIDATION_RULES[countryCode] || { min: 7, max: 15 };
};

const isValidPhoneNumber = (phone: string, countryCode: string): boolean => {
	const digits = phone.replace(/\D/g, "");
	const rules = getCountryValidationRules(countryCode);
	return digits.length >= rules.min && digits.length <= rules.max;
};

// ──────── SECURITY FUNCTIONS ────────
const hashPIN = async (pin: string): Promise<string> => {
	const saltBytes = await Crypto.getRandomBytesAsync(16);
	let saltHex = "";
	for (let i = 0; i < saltBytes.length; i++) {
		saltHex += saltBytes[i].toString(16).padStart(2, "0");
	}
	let pinWithSalt = pin;
	for (let i = 0; i < saltBytes.length; i++) {
		pinWithSalt += String.fromCharCode(saltBytes[i]);
	}
	const hash = await Crypto.digestStringAsync(
		Crypto.CryptoDigestAlgorithm.SHA256,
		pinWithSalt,
	);
	return `${hash}:${saltHex}`;
};

const verifyPIN = async (pin: string, hashedPIN: string): Promise<boolean> => {
	try {
		if (!hashedPIN || !hashedPIN.includes(":")) {
			console.log("❌ Invalid hashed PIN format");
			return false;
		}
		const [storedHash, saltHex] = hashedPIN.split(":");
		let pinWithSalt = pin;
		for (let i = 0; i < saltHex.length; i += 2) {
			const byte = parseInt(saltHex.substr(i, 2), 16);
			pinWithSalt += String.fromCharCode(byte);
		}
		const computedHash = await Crypto.digestStringAsync(
			Crypto.CryptoDigestAlgorithm.SHA256,
			pinWithSalt,
		);
		const isValid = computedHash.toLowerCase() === storedHash.toLowerCase();
		return isValid;
	} catch (error) {
		console.error("💥 Error in verifyPIN:", error);
		return false;
	}
};

// ──────── BIOMETRIC FUNCTIONS ────────
const checkBiometricAvailability = async (): Promise<{
	available: boolean;
	biometryType?: string;
}> => {
	try {
		const hasHardware = await LocalAuthentication.hasHardwareAsync();
		if (!hasHardware) {
			return { available: false };
		}

		const isEnrolled = await LocalAuthentication.isEnrolledAsync();
		if (!isEnrolled) {
			return { available: false };
		}

		const supportedTypes =
			await LocalAuthentication.supportedAuthenticationTypesAsync();

		return {
			available: hasHardware && isEnrolled,
			biometryType: supportedTypes.includes(
				LocalAuthentication.AuthenticationType.FINGERPRINT,
			)
				? "fingerprint"
				: supportedTypes.includes(
							LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
					  )
					? "face"
					: "biometric",
		};
	} catch (error) {
		console.error("Error checking biometric availability:", error);
		return { available: false };
	}
};

const createBiometricAccount = async (): Promise<{
	success: boolean;
	user?: any;
	error?: string;
}> => {
	try {
		console.log("🔄 Creating biometric account...");

		// Get device info
		const deviceName = Device.deviceName || "Unknown Device";
		const deviceBrand = Device.brand || "Unknown Brand";
		const deviceModel = Device.modelName || "Unknown Model";
		const deviceId =
			(await Application.getAndroidId?.()) ||
			Device.modelId ||
			"unknown-device-id";

		// Generate unique identifier for biometric account
		const email = `biometric_${deviceId}@bpay.biometric`;

		// Generate random 6-digit PIN
		const randomPIN = Math.floor(100000 + Math.random() * 900000).toString();
		const hashedPIN = await hashPIN(randomPIN);
		const transferToken = randomPIN.slice(0, 4);
		const hashedTransferToken = await hashPIN(transferToken);

		// Create temp password
		const tempPassword = randomPIN.padEnd(8, "0");

		// Try to sign up with biometric email
		const { data: signUpData, error: signUpError } = await supabase.auth.signUp(
			{
				email,
				password: tempPassword,
			},
		);

		let authUserId: string;

		if (signUpData?.user) {
			authUserId = signUpData.user.id;
			console.log("✅ New biometric auth user created");
		} else if (!signUpError) {
			// If user already exists (maybe from previous biometric registration), sign in
			const { data: signInData, error: signInError } =
				await supabase.auth.signInWithPassword({
					email,
					password: tempPassword,
				});

			if (signInError || !signInData?.user) {
				throw new Error("Unable to create or access biometric account");
			}
			authUserId = signInData.user.id;
			console.log("✅ Existing biometric auth user accessed");
		} else {
			throw signUpError || new Error("Biometric account creation failed");
		}

		// Prepare profile data
		const profileData = {
			id: authUserId,
			email,
			phone: null,
			full_name: `Biometric User (${deviceBrand} ${deviceModel})`,
			account_pin_hash: hashedPIN,
			transfer_pin_hash: hashedTransferToken,
			country_code: "NG",
			dial_code: "+234",
			flag_emoji: "🇳🇬",
			currency_symbol: "₦",
			is_biometric: true,
			device_name: deviceName,
			device_model: deviceModel,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

		// Upsert profile
		const { error: upsertError } = await supabase
			.from("profiles")
			.upsert(profileData, { onConflict: "id" });

		if (upsertError) {
			console.error("❌ Profile upsert failed:", upsertError);
			throw upsertError;
		}

		// Get the final user data
		const { data: finalUser } = await supabase
			.from("profiles")
			.select("*")
			.eq("id", authUserId)
			.single();

		// Store biometric account info
		const biometricAccount = {
			identifier: email,
			user: finalUser,
			securityTokenHash: hashedPIN,
			transferTokenHash: hashedTransferToken,
			isBiometric: true,
			deviceInfo: {
				name: deviceName,
				brand: deviceBrand,
				model: deviceModel,
				id: deviceId,
			},
		};

		await AsyncStorage.setItem(
			BIOMETRIC_ACCOUNT_KEY,
			JSON.stringify(biometricAccount),
		);

		return {
			success: true,
			user: {
				...finalUser,
				biometricAccount: true,
				deviceInfo: biometricAccount.deviceInfo,
			},
		};
	} catch (error: any) {
		console.error("💥 Error creating biometric account:", error);
		return {
			success: false,
			error: error.message || "Biometric account creation failed",
		};
	}
};

const authenticateWithBiometric = async (): Promise<{
	success: boolean;
	user?: any;
	error?: string;
}> => {
	try {
		// Check if biometric is available
		const { available } = await checkBiometricAvailability();
		if (!available) {
			return {
				success: false,
				error: "Biometric authentication not available",
			};
		}

		// Perform biometric authentication
		const result = await LocalAuthentication.authenticateAsync({
			promptMessage: "Authenticate  B-PAY",
			fallbackLabel: "Use Passcode",
			disableDeviceFallback: false,
		});

		if (!result.success) {
			return {
				success: false,
				error: "Authentication cancelled or failed",
			};
		}

		// Get stored biometric account
		const storedAccount = await AsyncStorage.getItem(BIOMETRIC_ACCOUNT_KEY);
		if (!storedAccount) {
			// No biometric account exists, create one
			return await createBiometricAccount();
		}

		const biometricAccount = JSON.parse(storedAccount);

		// Sign in with the biometric account
		const { data: signInData, error: signInError } =
			await supabase.auth.signInWithPassword({
				email: biometricAccount.identifier,
				password: "00000000",
			});

		if (signInError) {
			// If sign in fails, try to create a new biometric account
			return await createBiometricAccount();
		}

		// Get user profile
		const { data: userProfile } = await supabase
			.from("profiles")
			.select("*")
			.eq("id", signInData.user.id)
			.single();

		return {
			success: true,
			user: {
				...userProfile,
				biometricAccount: true,
			},
		};
	} catch (error: any) {
		console.error("💥 Error in biometric authentication:", error);
		return {
			success: false,
			error: error.message || "Biometric authentication failed",
		};
	}
};

// ──────── AUTH FUNCTIONS ────────
const createUserWithPIN = async (
	identifier: string | undefined,
	securityToken: string,
	countryCode?: string,
	dialCode?: string,
	flagEmoji?: string,
	currencySymbol?: string,
) => {
	if (!identifier) {
		throw new Error("Invalid identifier provided");
	}
	try {
		console.log("👤 Creating/updating user with identifier:", identifier);
		const hashedSecurityToken = await hashPIN(securityToken);
		const transferToken = securityToken.slice(0, 4);
		const hashedTransferToken = await hashPIN(transferToken);
		const isEmail = identifier.includes("@");
		const lookupValue = isEmail
			? identifier
			: `${dialCode}${identifier.replace(/\D/g, "")}`;

		// Check for existing profile first
		const { data: existingProfile } = await supabase
			.from("profiles")
			.select("id, account_pin_hash")
			.or(`email.eq.${identifier},phone.eq.${lookupValue}`)
			.maybeSingle();

		if (existingProfile) {
			console.log("🔄 Existing profile found → updating PINs");
			await supabase
				.from("profiles")
				.update({
					account_pin_hash: hashedSecurityToken,
					transfer_pin_hash: hashedTransferToken,
					updated_at: new Date().toISOString(),
				})
				.eq("id", existingProfile.id);

			const { data: fullUser } = await supabase
				.from("profiles")
				.select("*")
				.eq("id", existingProfile.id)
				.single();

			return { success: true, user: fullUser, transferToken };
		}

		// Prepare auth credentials
		const authEmail = isEmail
			? identifier
			: `${identifier.replace(/\D/g, "")}@temp.bpay.com`;
		const tempPassword = securityToken.padEnd(8, "0");
		let authUserId: string;

		const { data: signUpData, error: signUpError } = await supabase.auth.signUp(
			{
				email: authEmail,
				password: tempPassword,
			},
		);

		if (signUpData?.user) {
			authUserId = signUpData.user.id;
			console.log("✅ Auth user obtained (new or existing):", authUserId);
		} else if (!signUpData?.user && !signUpError) {
			console.log(
				"⚠️ signUp returned no user → falling back to signInWithPassword",
			);
			const { data: signInData, error: signInError } =
				await supabase.auth.signInWithPassword({
					email: authEmail,
					password: tempPassword,
				});
			if (signInError || !signInData?.user) {
				throw new Error("Unable to reuse existing auth user");
			}
			authUserId = signInData.user.id;
			console.log("✅ Reused existing auth user via signIn:", authUserId);
		} else {
			throw signUpError || new Error("Signup failed without user");
		}

		// UPSERT profile
		const profileData: any = {
			id: authUserId,
			account_pin_hash: hashedSecurityToken,
			transfer_pin_hash: hashedTransferToken,
			updated_at: new Date().toISOString(),
			created_at: new Date().toISOString(),
		};
		if (isEmail) {
			profileData.email = identifier;
		} else {
			profileData.phone = lookupValue;
			profileData.email = null;
		}
		profileData.country_code = countryCode || null;
		profileData.dial_code = dialCode || null;
		profileData.flag_emoji = flagEmoji || null;
		profileData.currency_symbol = currencySymbol || null;

		const { error: upsertError } = await supabase
			.from("profiles")
			.upsert(profileData, { onConflict: "id" });

		if (upsertError) {
			console.error("❌ Upsert failed:", upsertError);
			if (signUpData?.session === null) {
				await supabase.auth.admin.deleteUser(authUserId).catch(() => {});
			}
			throw upsertError;
		}

		console.log("✅ Profile created/updated via upsert");
		const { data: finalUser } = await supabase
			.from("profiles")
			.select("*")
			.eq("id", authUserId)
			.single();

		return {
			success: true,
			user: finalUser || {
				id: authUserId,
				email: isEmail ? identifier : null,
				phone: !isEmail ? lookupValue : null,
				full_name: null,
				avatar_url: null,
				is_verified: false,
				country_code: countryCode,
				dial_code: dialCode,
				flag_emoji: flagEmoji,
				currency_symbol: currencySymbol,
			},
			transferToken,
		};
	} catch (error: any) {
		console.error("💥 Error in createUserWithPIN:", error);
		return {
			success: false,
			error: error.message || "Account creation failed",
		};
	}
};

const verifyUserPIN = async (identifier: string, pin: string) => {
	try {
		const { data: user, error } = await supabase
			.from("profiles")
			.select("*")
			.or(`email.eq.${identifier},phone.eq.${identifier}`)
			.single();

		if (error) {
			throw new Error("User not found");
		}

		if (!user.account_pin_hash) {
			return {
				success: false,
				error: "No security token set for this account",
			};
		}

		const isPINValid = await verifyPIN(pin, user.account_pin_hash);
		if (!isPINValid) {
			return {
				success: false,
				error: "Invalid security token",
			};
		}

		await supabase
			.from("profiles")
			.update({
				updated_at: new Date().toISOString(),
			})
			.eq("id", user.id);

		return {
			success: true,
			user: {
				id: user.id,
				email: user.email,
				phone: user.phone,
				full_name: user.full_name,
				avatar_url: user.avatar_url,
				is_verified: user.is_verified,
				country_code: user.country_code,
				dial_code: user.dial_code,
				flag_emoji: user.flag_emoji,
				currency_symbol: user.currency_symbol,
			},
		};
	} catch (error) {
		console.error("Error verifying user PIN:", error);
		return {
			success: false,
			error: "Verification failed. Please try again.",
		};
	}
};

// ──────── UTILITY FUNCTIONS ────────
const isValidEmail = (email: string) =>
	/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const formatPhoneNumber = (value: string, countryCode: string = "NG") => {
	const digits = value.replace(/\D/g, "");

	// Format based on country
	if (countryCode === "NG") {
		// Nigerian format: 0803 123 4567 or 803 123 4567
		if (digits.length <= 3) return digits;
		if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
		if (digits.length <= 10)
			return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
		return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 11)}`;
	} else if (countryCode === "US" || countryCode === "CA") {
		// US/Canada format: (123) 456-7890
		if (digits.length <= 3) return digits;
		if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
		return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
	} else {
		// Generic format
		if (digits.length <= 3) return digits;
		if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
		return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
	}
};

const maskIdentifier = (id: string | undefined | null): string => {
	if (!id) return "Unknown Account";
	if (id.includes("@")) {
		const [local, domain] = id.split("@");
		return `${local[0]}***@${domain}`;
	} else {
		const digits = id.replace(/\D/g, "");
		if (digits.length < 6) return id;
		return `${id.slice(0, 4)}*****${id.slice(-3)}`;
	}
};

// ──────── ACCOUNT SWITCH DROPDOWN COMPONENT (FROM REFERENCE) ────────
const AccountSwitchDropdown = ({
	visible,
	onClose,
	accounts,
	currentAccount,
	onSwitchAccount,
	onAddAccount,
	onRemoveAccount,
}: {
	visible: boolean;
	onClose: () => void;
	accounts: any[];
	currentAccount: any;
	onSwitchAccount: (account: any) => void;
	onAddAccount: () => void;
	onRemoveAccount: (identifier: string) => void;
}) => {
	const slideAnim = useRef(new Animated.Value(-10)).current;
	const fadeAnim = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (visible) {
			Animated.parallel([
				Animated.timing(slideAnim, {
					toValue: 0,
					duration: 300,
					useNativeDriver: true,
				}),
				Animated.timing(fadeAnim, {
					toValue: 1,
					duration: 300,
					useNativeDriver: true,
				}),
			]).start();
		} else {
			Animated.parallel([
				Animated.timing(slideAnim, {
					toValue: -10,
					duration: 200,
					useNativeDriver: true,
				}),
				Animated.timing(fadeAnim, {
					toValue: 0,
					duration: 200,
					useNativeDriver: true,
				}),
			]).start();
		}
	}, [visible]);

	// Safe maskIdentifier function (same as reference)
	const maskIdentifier = (id: string | undefined | null): string => {
		if (!id) return "Unknown Account";
		if (id.includes("@")) {
			const [local, domain] = id.split("@");
			return `${local[0]}***@${domain}`;
		} else {
			const digits = id.replace(/\D/g, "");
			if (digits.length < 6) return id;
			return `${id.slice(0, 4)}*****${id.slice(-3)}`;
		}
	};

	if (!visible) return null;

	const renderAccountItem = ({ item }: { item: any }) => {
		if (!item || !item.identifier) return null;

		return (
			<TouchableOpacity
				style={[
					dropdownStyles.accountItem,
					currentAccount?.identifier === item.identifier &&
						dropdownStyles.accountItemActive,
				]}
				onPress={() => onSwitchAccount(item)}
			>
				<View style={dropdownStyles.accountContent}>
					{/* Account Icon */}
					<View style={dropdownStyles.accountIcon}>
						<FontAwesome
							name={item.identifier.includes("@") ? "envelope" : "phone"}
							size={16}
							color="#FFD700"
						/>
					</View>

					{/* Account Info */}
					<View style={dropdownStyles.accountInfo}>
						<Text style={dropdownStyles.accountIdentifier}>
							{maskIdentifier(item.identifier)}
						</Text>
						{currentAccount?.identifier === item.identifier && (
							<Text style={dropdownStyles.currentLabel}>Current</Text>
						)}
					</View>

					{/* Remove Button */}
					{accounts.length > 1 &&
						currentAccount?.identifier !== item.identifier && (
							<TouchableOpacity
								style={dropdownStyles.removeButton}
								onPress={() => onRemoveAccount(item.identifier)}
							>
								<FontAwesome name="times" size={14} color="#FF6B6B" />
							</TouchableOpacity>
						)}
				</View>
			</TouchableOpacity>
		);
	};

	return (
		<>
			{/* Backdrop */}
			<Pressable style={dropdownStyles.backdrop} onPress={onClose} />

			{/* Dropdown Container */}
			<Animated.View
				style={[
					dropdownStyles.container,
					{
						transform: [{ translateY: slideAnim }],
						opacity: fadeAnim,
					},
				]}
			>
				{/* Dropdown Arrow */}
				<View style={dropdownStyles.arrow} />

				{/* Header */}
				<View style={dropdownStyles.header}>
					<Text style={dropdownStyles.title}>Switch Account</Text>
					<Text style={dropdownStyles.subtitle}>
						{accounts.length} account{accounts.length !== 1 ? "s" : ""}{" "}
						available
					</Text>
				</View>

				{/* Accounts List */}
				<FlatList
					data={accounts.filter((acc) => acc && acc.identifier)}
					keyExtractor={(item) =>
						item.identifier || `fallback-${Math.random()}`
					}
					style={dropdownStyles.list}
					showsVerticalScrollIndicator={false}
					renderItem={renderAccountItem}
				/>

				{/* Add Account Button */}
				{accounts.length < 3 && (
					<TouchableOpacity
						style={dropdownStyles.addButton}
						onPress={onAddAccount}
					>
						<View style={dropdownStyles.addButtonContent}>
							<FontAwesome name="plus-circle" size={16} color="#FFD700" />
							<Text style={dropdownStyles.addButtonText}>Add New Account</Text>
						</View>
					</TouchableOpacity>
				)}

				{/* Close Button */}
				<TouchableOpacity style={dropdownStyles.closeButton} onPress={onClose}>
					<Text style={dropdownStyles.closeButtonText}>Close</Text>
				</TouchableOpacity>
			</Animated.View>
		</>
	);
};

const dropdownStyles = StyleSheet.create({
	backdrop: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: "transparent",
		zIndex: 998,
	},
	container: {
		position: "absolute",
		top: 110,
		right: 20,
		backgroundColor: "#1a1a1a",
		borderRadius: 16,
		padding: 16,
		width: width * 0.85,
		maxWidth: 320,
		maxHeight: height * 0.6,
		borderWidth: 1,
		borderColor: "#FFD700",
		shadowColor: "#000",
		shadowOffset: {
			width: 0,
			height: 4,
		},
		shadowOpacity: 0.3,
		shadowRadius: 12,
		elevation: 8,
		zIndex: 999,
	},
	arrow: {
		position: "absolute",
		top: -8,
		right: 20,
		width: 16,
		height: 16,
		backgroundColor: "#1a1a1a",
		borderLeftWidth: 1,
		borderTopWidth: 1,
		borderColor: "#FFD700",
		transform: [{ rotate: "45deg" }],
	},
	header: {
		marginBottom: 12,
		paddingBottom: 12,
		borderBottomWidth: 1,
		borderBottomColor: "#333",
	},
	title: {
		color: "#FFD700",
		fontSize: 18,
		fontWeight: "bold",
		marginBottom: 2,
	},
	subtitle: {
		color: "#fff",
		fontSize: 12,
		opacity: 0.7,
	},
	list: {
		marginBottom: 12,
		maxHeight: 200,
	},
	accountItem: {
		borderRadius: 12,
		marginBottom: 1,
		overflow: "hidden",
	},
	accountItemActive: {
		backgroundColor: "rgba(255, 215, 0, 0.1)",
		borderWidth: 1,
		borderColor: "#FFD700",
	},
	accountContent: {
		flexDirection: "row",
		alignItems: "center",
		padding: 12,
	},
	accountIcon: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: "rgba(255, 215, 0, 0.1)",
		justifyContent: "center",
		alignItems: "center",
		marginRight: 12,
	},
	accountInfo: {
		flex: 1,
	},
	accountIdentifier: {
		color: "#fff",
		fontSize: 14,
		fontWeight: "600",
		marginBottom: 2,
	},
	currentLabel: {
		color: "#00FF7F",
		fontSize: 11,
		fontWeight: "500",
	},
	removeButton: {
		padding: 6,
		borderRadius: 6,
		backgroundColor: "rgba(255, 107, 107, 0.1)",
	},
	addButton: {
		backgroundColor: "rgba(255, 215, 0, 0.1)",
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "#FFD700",
		borderStyle: "dashed",
		marginBottom: 12,
	},
	addButtonContent: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		padding: 12,
		gap: 8,
	},
	addButtonText: {
		color: "#FFD700",
		fontSize: 14,
		fontWeight: "600",
	},
	closeButton: {
		backgroundColor: "#333",
		borderRadius: 12,
		padding: 12,
		alignItems: "center",
	},
	closeButtonText: {
		color: "#fff",
		fontSize: 14,
		fontWeight: "600",
	},
});

// ──────── OTP MODAL COMPONENT ────────
const OTPModal = ({
	visible,
	onClose,
	phoneNumber,
	onVerify,
	onResend,
}: {
	visible: boolean;
	onClose: () => void;
	phoneNumber: string;
	onVerify: (otp: string) => void;
	onResend: () => void;
}) => {
	const [otp, setOtp] = useState(["", "", "", "", "", ""]);
	const [countdown, setCountdown] = useState(60);
	const otpRefs = useRef<Array<TextInput | null>>([]);

	useEffect(() => {
		if (visible) {
			setOtp(["", "", "", "", "", ""]);
			setCountdown(60);
			setTimeout(() => otpRefs.current[0]?.focus(), 300);

			const timer = setInterval(() => {
				setCountdown((prev) => {
					if (prev <= 1) {
						clearInterval(timer);
						return 0;
					}
					return prev - 1;
				});
			}, 1000);

			return () => clearInterval(timer);
		}
	}, [visible]);

	const handleOtpChange = (text: string, index: number) => {
		if (text.length > 1) {
			const pastedValues = text.slice(0, 6).split("");
			const newArray = [...otp];
			pastedValues.forEach((char, idx) => {
				if (index + idx < 6) newArray[index + idx] = char;
			});
			setOtp(newArray);
			const lastIndex = Math.min(index + pastedValues.length - 1, 5);
			if (pastedValues.length === 6) {
				onVerify(newArray.join(""));
			} else {
				otpRefs.current[lastIndex]?.focus();
			}
			return;
		}

		const newArray = [...otp];
		newArray[index] = text;
		setOtp(newArray);

		if (text && index < 5) {
			otpRefs.current[index + 1]?.focus();
		}

		if (newArray.join("").length === 6) {
			onVerify(newArray.join(""));
		}
	};

	const handleResend = () => {
		if (countdown === 0) {
			setCountdown(60);
			onResend();
		}
	};

	return (
		<Modal
			transparent
			visible={visible}
			animationType="slide"
			statusBarTranslucent
		>
			<Pressable style={otpModalStyles.overlay} onPress={onClose}>
				<View style={otpModalStyles.container}>
					<View style={otpModalStyles.header}>
						<Text style={otpModalStyles.title}>Enter OTP</Text>
						<Text style={otpModalStyles.subtitle}>
							We sent a 6-digit code to {maskIdentifier(phoneNumber)}
						</Text>
					</View>

					<View style={otpModalStyles.otpContainer}>
						{otp.map((digit, index) => (
							<TextInput
								key={index}
								ref={(ref) => (otpRefs.current[index] = ref)}
								style={[
									otpModalStyles.otpBox,
									digit && otpModalStyles.otpBoxFilled,
								]}
								keyboardType="number-pad"
								maxLength={1}
								value={digit}
								onChangeText={(text) => handleOtpChange(text, index)}
								onKeyPress={(e: any) => {
									if (
										e.nativeEvent.key === "Backspace" &&
										!digit &&
										index > 0
									) {
										otpRefs.current[index - 1]?.focus();
									}
								}}
							/>
						))}
					</View>

					<View style={otpModalStyles.resendContainer}>
						<Text style={otpModalStyles.countdownText}>
							Resend code in {countdown}s
						</Text>
						<TouchableOpacity onPress={handleResend} disabled={countdown > 0}>
							<Text
								style={[
									otpModalStyles.resendText,
									countdown > 0 && otpModalStyles.resendDisabled,
								]}
							>
								Resend OTP
							</Text>
						</TouchableOpacity>
					</View>

					<TouchableOpacity
						style={otpModalStyles.closeButton}
						onPress={onClose}
					>
						<Text style={otpModalStyles.closeButtonText}>Cancel</Text>
					</TouchableOpacity>
				</View>
			</Pressable>
		</Modal>
	);
};

const otpModalStyles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: "rgba(0, 0, 0, 0.8)",
		justifyContent: "center",
		alignItems: "center",
	},
	container: {
		backgroundColor: "#1a1a1a",
		borderRadius: 20,
		padding: 24,
		width: width * 0.85,
		maxWidth: 400,
		borderWidth: 1,
		borderColor: "#FFD700",
	},
	header: {
		marginBottom: 24,
	},
	title: {
		color: "#FFD700",
		fontSize: 24,
		fontWeight: "bold",
		textAlign: "center",
		marginBottom: 8,
	},
	subtitle: {
		color: "#fff",
		fontSize: 14,
		textAlign: "center",
		opacity: 0.8,
	},
	otpContainer: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: 24,
	},
	otpBox: {
		width: 38,
		height: 36,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "#333",
		backgroundColor: "#222",
		color: "#fff",
		fontSize: 20,
		textAlign: "center",
	},
	otpBoxFilled: {
		borderColor: "#FFD700",
		backgroundColor: "rgba(255, 215, 0, 0.1)",
	},
	resendContainer: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 20,
		paddingHorizontal: 8,
	},
	countdownText: {
		color: "#FFD700",
		fontSize: 14,
	},
	resendText: {
		color: "#FFD700",
		fontSize: 14,
		fontWeight: "600",
	},
	resendDisabled: {
		opacity: 0.5,
	},
	closeButton: {
		padding: 14,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "#FFD700",
		alignItems: "center",
	},
	closeButtonText: {
		color: "#FFD700",
		fontSize: 16,
		fontWeight: "600",
	},
});

// ──────── SUCCESS MODAL ────────
const SuccessModal = ({
	visible,
	onClose,
	transferPin,
	onDontShowAgain,
}: {
	visible: boolean;
	onClose: () => void;
	transferPin: string;
	onDontShowAgain: (value: boolean) => void;
}) => {
	const [dontShowAgain, setDontShowAgain] = useState(false);
	const handleDontShowAgainChange = (value: boolean) => {
		setDontShowAgain(value);
		onDontShowAgain(value);
	};

	return (
		<Modal
			transparent
			visible={visible}
			animationType="fade"
			statusBarTranslucent
		>
			<View style={successStyles.overlay}>
				<View style={successStyles.container}>
					<View style={successStyles.header}>
						<View style={successStyles.iconContainer}>
							<FontAwesome name="check-circle" size={60} color="#FFD700" />
							<View style={successStyles.confetti}>
								<Text style={successStyles.confettiText}>🎉</Text>
								<Text style={successStyles.confettiText}>✨</Text>
							</View>
						</View>
					</View>
					<Text style={successStyles.title}>Welcome to B-PAY! 🚀</Text>
					<Text style={successStyles.subtitle}>
						Your account has been created successfully
					</Text>
					<View style={successStyles.pinContainer}>
						<View style={successStyles.pinHeader}>
							<FontAwesome name="shield" size={20} color="#FFD700" />
							<Text style={successStyles.pinTitle}>
								Security Setup Complete
							</Text>
						</View>
						<View style={successStyles.pinInfo}>
							<View style={successStyles.infoRow}>
								<FontAwesome name="lock" size={16} color="#FFD700" />
								<Text style={successStyles.infoText}>
									<Text style={successStyles.bold}>
										6-digit Security Token:
									</Text>{" "}
									Set and secured
								</Text>
							</View>
							<View style={successStyles.infoRow}>
								<FontAwesome name="key" size={16} color="#FFD700" />
								<Text style={successStyles.infoText}>
									<Text style={successStyles.bold}>Transfer Token:</Text>{" "}
									{transferPin}
								</Text>
							</View>
						</View>
						<View style={successStyles.noteBox}>
							<FontAwesome name="info-circle" size={16} color="#FFD700" />
							<Text style={successStyles.noteText}>
								Your transfer token is automatically set to the first 4 digits
								of your security token. You can change it in Settings.
							</Text>
						</View>
					</View>
					<View style={successStyles.features}>
						<View style={successStyles.featureItem}>
							<FontAwesome name="bolt" size={16} color="#FFD700" />
							<Text style={successStyles.featureText}>
								Fast & Secure Transactions
							</Text>
						</View>
						<View style={successStyles.featureItem}>
							<FontAwesome name="globe" size={16} color="#FFD700" />
							<Text style={successStyles.featureText}>Global Payments</Text>
						</View>
						<View style={successStyles.featureItem}>
							<FontAwesome name="shield" size={16} color="#FFD700" />
							<Text style={successStyles.featureText}>Bank-Level Security</Text>
						</View>
					</View>
					<View style={successStyles.checkboxContainer}>
						<Checkbox
							value={dontShowAgain}
							onValueChange={handleDontShowAgainChange}
							color={dontShowAgain ? "#FFD700" : undefined}
							style={successStyles.checkbox}
						/>
						<Text style={successStyles.checkboxLabel}>
							Don't show this message again
						</Text>
					</View>
					<View style={successStyles.buttonContainer}>
						<TouchableOpacity
							style={successStyles.skipButton}
							onPress={onClose}
						>
							<FontAwesome name="rocket" size={16} color="#FFD700" />
							<Text style={successStyles.skipButtonText}>
								Skip to Dashboard
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={successStyles.continueButton}
							onPress={onClose}
						>
							<Text style={successStyles.continueButtonText}>
								Explore B-PAY
							</Text>
							<FontAwesome name="arrow-right" size={16} color="#000" />
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</Modal>
	);
};

const successStyles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: "rgba(0, 0, 0, 0.9)",
		justifyContent: "center",
		alignItems: "center",
		padding: 20,
	},
	container: {
		backgroundColor: "#1a1a1a",
		borderRadius: 24,
		padding: 24,
		width: "100%",
		maxWidth: 400,
		borderWidth: 1,
		borderColor: "#FFD700",
		shadowColor: "#FFD700",
		shadowOffset: { width: 0, height: 0 },
		shadowOpacity: 0.5,
		shadowRadius: 20,
		elevation: 10,
	},
	header: {
		alignItems: "center",
		marginBottom: 20,
	},
	iconContainer: {
		position: "relative",
		alignItems: "center",
		marginBottom: 16,
	},
	confetti: {
		position: "absolute",
		flexDirection: "row",
		top: -10,
		width: "120%",
		justifyContent: "space-between",
	},
	confettiText: {
		fontSize: 24,
	},
	title: {
		color: "#FFD700",
		fontSize: 24,
		fontWeight: "bold",
		textAlign: "center",
		marginBottom: 8,
	},
	subtitle: {
		color: "#fff",
		fontSize: 16,
		textAlign: "center",
		marginBottom: 24,
		opacity: 0.9,
	},
	pinContainer: {
		backgroundColor: "rgba(255, 215, 0, 0.1)",
		borderRadius: 16,
		padding: 16,
		marginBottom: 20,
		borderWidth: 1,
		borderColor: "#FFD700",
	},
	pinHeader: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 12,
	},
	pinTitle: {
		color: "#FFD700",
		fontSize: 18,
		fontWeight: "bold",
		marginLeft: 8,
	},
	pinInfo: {
		marginBottom: 12,
	},
	infoRow: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 8,
	},
	infoText: {
		color: "#fff",
		fontSize: 14,
		marginLeft: 8,
		flex: 1,
	},
	bold: {
		fontWeight: "bold",
		color: "#FFD700",
	},
	noteBox: {
		flexDirection: "row",
		alignItems: "flex-start",
		backgroundColor: "rgba(255, 215, 0, 0.05)",
		padding: 12,
		borderRadius: 8,
		borderLeftWidth: 3,
		borderLeftColor: "#FFD700",
	},
	noteText: {
		color: "#FFD700",
		fontSize: 12,
		marginLeft: 8,
		flex: 1,
		fontStyle: "italic",
	},
	features: {
		marginBottom: 20,
	},
	featureItem: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 12,
		paddingHorizontal: 8,
	},
	featureText: {
		color: "#fff",
		fontSize: 14,
		marginLeft: 12,
		opacity: 0.9,
	},
	checkboxContainer: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 20,
		paddingHorizontal: 8,
	},
	checkbox: {
		marginRight: 12,
		borderColor: "#FFD700",
	},
	checkboxLabel: {
		color: "#fff",
		fontSize: 14,
		opacity: 0.9,
	},
	buttonContainer: {
		flexDirection: "row",
		justifyContent: "space-between",
		gap: 12,
	},
	skipButton: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 16,
		paddingHorizontal: 20,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "#FFD700",
		backgroundColor: "transparent",
		gap: 8,
	},
	skipButtonText: {
		color: "#FFD700",
		fontSize: 16,
		fontWeight: "600",
	},
	continueButton: {
		flex: 2,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 16,
		paddingHorizontal: 20,
		borderRadius: 12,
		backgroundColor: "#FFD700",
		gap: 8,
	},
	continueButtonText: {
		color: "#000",
		fontSize: 16,
		fontWeight: "bold",
	},
});

// ──────── COUNTRY PICKER COMPONENT ────────
const CountryPickerModal = ({
	visible,
	onClose,
	countries,
	selectedCountry,
	onSelectCountry,
	searchQuery,
	onSearchChange,
}: {
	visible: boolean;
	onClose: () => void;
	countries: Country[];
	selectedCountry: Country | null;
	onSelectCountry: (country: Country) => void;
	searchQuery: string;
	onSearchChange: (text: string) => void;
}) => {
	const filteredCountries = countries.filter(
		(c) =>
			c.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
			c.dial.includes(searchQuery) ||
			c.code.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	return (
		<Modal
			transparent
			visible={visible}
			onRequestClose={onClose}
			statusBarTranslucent
			animationType="slide"
		>
			<Pressable style={countryPickerStyles.overlay} onPress={onClose}>
				<View style={countryPickerStyles.container}>
					<Text style={countryPickerStyles.title}>Select Country</Text>
					<TextInput
						style={countryPickerStyles.searchInput}
						placeholder="Search country..."
						placeholderTextColor="#666"
						value={searchQuery}
						onChangeText={onSearchChange}
						autoFocus
					/>
					<FlatList
						data={filteredCountries}
						keyExtractor={(item) => item.code}
						renderItem={({ item }) => (
							<TouchableOpacity
								style={[
									countryPickerStyles.countryItem,
									selectedCountry?.code === item.code &&
										countryPickerStyles.selectedCountryItem,
								]}
								onPress={() => {
									onSelectCountry(item);
									onClose();
								}}
							>
								<Text style={countryPickerStyles.flag}>{item.flag}</Text>
								<View style={countryPickerStyles.countryInfo}>
									<Text style={countryPickerStyles.countryLabel}>
										{item.label}
									</Text>
									<Text style={countryPickerStyles.dialCode}>{item.dial}</Text>
								</View>
								{selectedCountry?.code === item.code && (
									<FontAwesome name="check" size={16} color="#FFD700" />
								)}
							</TouchableOpacity>
						)}
					/>
					<TouchableOpacity
						style={countryPickerStyles.closeButton}
						onPress={onClose}
					>
						<Text style={countryPickerStyles.closeButtonText}>Cancel</Text>
					</TouchableOpacity>
				</View>
			</Pressable>
		</Modal>
	);
};

const countryPickerStyles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: "rgba(0, 0, 0, 0.9)",
		justifyContent: "flex-end",
	},
	container: {
		backgroundColor: "#1a1a1a",
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		maxHeight: 500,
		padding: 20,
	},
	title: {
		color: "#FFD700",
		fontSize: 20,
		fontWeight: "bold",
		marginBottom: 16,
		textAlign: "center",
	},
	searchInput: {
		backgroundColor: "#000",
		color: "#fff",
		padding: 12,
		borderRadius: 12,
		marginBottom: 12,
		fontSize: 16,
		borderWidth: 1,
		borderColor: "#333",
	},
	countryItem: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 14,
		paddingHorizontal: 12,
		borderBottomWidth: 1,
		borderBottomColor: "#333",
	},
	selectedCountryItem: {
		backgroundColor: "rgba(255, 215, 0, 0.1)",
		borderRadius: 8,
	},
	flag: {
		fontSize: 24,
		width: 40,
	},
	countryInfo: {
		flex: 1,
		marginLeft: 12,
	},
	countryLabel: {
		color: "#fff",
		fontSize: 16,
	},
	dialCode: {
		color: "#FFD700",
		fontSize: 14,
		marginTop: 2,
	},
	closeButton: {
		marginTop: 16,
		padding: 14,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "#FFD700",
		alignItems: "center",
	},
	closeButtonText: {
		color: "#FFD700",
		fontSize: 16,
		fontWeight: "600",
	},
});

// ──────── MAIN COMPONENT ────────
export default function LoginScreen() {
	const router = useRouter();
	const auth = useAuth();
	const [mode, setMode] = useState<"email" | "phone">("email");
	const [identifier, setIdentifier] = useState("");
	const [displayPhone, setDisplayPhone] = useState("");
	const [country, setCountry] = useState<Country | null>(null);
	const [countries, setCountries] = useState<Country[]>([]);
	const [showCountryPicker, setShowCountryPicker] = useState(false);
	const [countrySearch, setCountrySearch] = useState("");
	const [loading, setLoading] = useState(false);
	const [toast, setToast] = useState<{
		msg: string;
		type: "success" | "error";
	} | null>(null);
	const [pinModal, setPinModal] = useState(false);
	const [pin, setPin] = useState(["", "", "", "", "", ""]);
	const [confirmPin, setConfirmPin] = useState(["", "", "", "", "", ""]);
	const [pinStep, setPinStep] = useState<"create" | "confirm" | "login">(
		"create",
	);
	const [currentIdentifier, setCurrentIdentifier] = useState("");
	const [showSuccessModal, setShowSuccessModal] = useState(false);
	const [transferPin, setTransferPin] = useState("");
	const [dontShowTransferPin, setDontShowTransferPin] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);
	const [otpModal, setOtpModal] = useState(false);
	const [biometricAvailable, setBiometricAvailable] = useState(false);
	const [showAccountDropdown, setShowAccountDropdown] = useState(false);

	// New state for email country selection
	const [emailCountry, setEmailCountry] = useState<Country | null>(null);
	const [showEmailCountryPicker, setShowEmailCountryPicker] = useState(false);
	const [emailCountrySearch, setEmailCountrySearch] = useState("");

	// Refs
	const emailInputRef = useRef<TextInput>(null);
	const phoneInputRef = useRef<TextInput>(null);
	const pinRefs = useRef<Array<TextInput | null>>([]);
	const confirmPinRefs = useRef<Array<TextInput | null>>([]);
	const loginPinRefs = useRef<Array<TextInput | null>>([]);
	const pulseAnim = useRef(new Animated.Value(1)).current;

	// ──────── PULSE ANIMATION ────────
	useEffect(() => {
		const pulse = Animated.loop(
			Animated.sequence([
				Animated.timing(pulseAnim, {
					toValue: 1.1,
					duration: 2000,
					useNativeDriver: true,
				}),
				Animated.timing(pulseAnim, {
					toValue: 1,
					duration: 2000,
					useNativeDriver: true,
				}),
			]),
		);
		pulse.start();
		return () => {
			pulse.stop();
		};
	}, [pulseAnim]);

	// ──────── NETWORK CONNECTION MONITOR ────────
	useEffect(() => {
		const unsubscribe = NetInfo.addEventListener((state) => {
			if (!state.isConnected) {
				showToast("❌ No internet connection", "error");
			}
		});
		return () => unsubscribe();
	}, []);

	// ──────── INITIAL LOAD ────────
	useEffect(() => {
		// Check biometric availability
		checkBiometricAvailability().then(({ available }) => {
			setBiometricAvailable(available);
		});

		// Load saved settings
		(async () => {
			const dontShow = await AsyncStorage.getItem(DONT_SHOW_TRANSFER_PIN_KEY);
			setDontShowTransferPin(dontShow === "true");
		})();

		// Fetch countries
		const fetchCountries = async () => {
			try {
				const { data, error } = await supabase
					.from("countries")
					.select("name, iso_code, flag_emoji, dial_code, currency_symbol")
					.order("name", { ascending: true });

				if (error) throw error;

				if (data && data.length > 0) {
					const mappedCountries: Country[] = data.map((item: any) => ({
						code: item.iso_code,
						flag: item.flag_emoji,
						label: item.name,
						dial: item.dial_code,
						currency_symbol: item.currency_symbol,
					}));
					setCountries(mappedCountries);

					// Auto-select Nigeria for both phone and email
					const nigeria = mappedCountries.find((c) => c.code === "NG");
					if (nigeria) {
						setCountry(nigeria);
						setEmailCountry(nigeria);
					} else if (mappedCountries.length > 0) {
						setCountry(mappedCountries[0]);
						setEmailCountry(mappedCountries[0]);
					}
				}
			} catch (error) {
				console.log("Error loading countries – using fallbacks");
				const fallbackCountries: Country[] = [
					{
						code: "NG",
						flag: "🇳🇬",
						label: "Nigeria",
						dial: "+234",
						currency_symbol: "₦",
					},
					{
						code: "US",
						flag: "🇺🇸",
						label: "United States",
						dial: "+1",
						currency_symbol: "$",
					},
					{
						code: "GB",
						flag: "🇬🇧",
						label: "United Kingdom",
						dial: "+44",
						currency_symbol: "£",
					},
				];
				setCountries(fallbackCountries);
				setCountry(fallbackCountries[0]);
				setEmailCountry(fallbackCountries[0]);
			}
		};

		fetchCountries();
	}, []);

	// ──────── AUTO-PROCEED LOGIC ────────
	useEffect(() => {
		// Debounce the validation check
		const timeoutId = setTimeout(() => {
			if (mode === "email" && emailCountry && isValidEmail(identifier)) {
				handleEmailInputComplete();
			} else if (mode === "phone" && country) {
				const digits = identifier.replace(/\D/g, "");
				const rules = getCountryValidationRules(country.code);

				// Only auto-proceed if phone number meets minimum requirements
				if (digits.length >= rules.min) {
					handlePhoneInputComplete();
				}
			}
		}, 800); // Increased debounce time

		return () => clearTimeout(timeoutId);
	}, [identifier, mode, country, emailCountry]);

	const handleEmailInputComplete = () => {
		const fullId = identifier;
		setCurrentIdentifier(fullId);
		checkUserExists(fullId);
	};

	const handlePhoneInputComplete = () => {
		if (!country) {
			showToast("Please select a country first", "error");
			return;
		}

		const digits = identifier.replace(/\D/g, "");
		const rules = getCountryValidationRules(country.code);

		// Validate phone number length
		if (digits.length < rules.min) {
			showToast(
				`Phone number must be at least ${rules.min} digits for ${country.label}`,
				"error",
			);
			return;
		}

		if (digits.length > rules.max) {
			showToast(
				`Phone number cannot exceed ${rules.max} digits for ${country.label}`,
				"error",
			);
			return;
		}

		const fullId = `${country.dial}${digits}`;
		setCurrentIdentifier(fullId);
		setOtpModal(true);
	};

	const checkUserExists = async (identifier: string) => {
		setLoading(true);
		try {
			const { data: user, error } = await supabase
				.from("profiles")
				.select("id, account_pin_hash")
				.or(`email.eq.${identifier},phone.eq.${identifier}`)
				.single();

			setLoading(false);

			if (error) {
				if (error.code === "PGRST116") {
					// User doesn't exist, create new account
					openPINSheet(true);
				} else {
					console.error("Error checking user:", error);
					showToast("Error checking account. Please try again.", "error");
				}
			} else if (user && user.account_pin_hash) {
				// User exists, login
				openPINSheet(false);
			} else {
				// User exists but no PIN set
				openPINSheet(true);
			}
		} catch (error) {
			setLoading(false);
			console.error("Unexpected error:", error);
			showToast("Error checking account. Please try again.", "error");
		}
	};

	// ──────── ACCOUNT SWITCHING ────────
	const handleSwitchAccountButton = () => {
		if (auth.savedAccounts && auth.savedAccounts.length > 0) {
			// ALWAYS show dropdown, never auto-switch
			setShowAccountDropdown(true);
		} else {
			showToast("No saved accounts available", "error");
		}
	};

	const handleSwitchAccount = (account: any) => {
		if (!account?.identifier) {
			showToast("Invalid account data", "error");
			return;
		}

		auth.switchAccount(account);
		setShowAccountDropdown(false);
		showToast(`Switched to ${maskIdentifier(account.identifier)}`, "success");

		setTimeout(() => {
			router.replace("/(app)/(Auth)/welcome-back");
		}, 300);
	};

	// ──────── BIOMETRIC FUNCTION ────────
	const handleBiometricAuth = async () => {
		if (!biometricAvailable) {
			showToast("Biometric authentication not available", "error");
			return;
		}

		setLoading(true);
		const result = await authenticateWithBiometric();
		setLoading(false);

		if (result.success && result.user) {
			try {
				await auth.login(result.user, result.user.email, "", "", true);
				await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, "true");
				showToast("Welcome back!", "success");
				setTimeout(() => router.replace("/(app)/(protected)"), 100);
			} catch (error) {
				showToast("Login failed. Please try again.", "error");
			}
		} else {
			showToast(result.error || "Biometric authentication failed", "error");
		}
	};

	// ──────── AUTH FUNCTIONS ────────
	const showToast = (msg: string, type: "success" | "error") => {
		setToast({ msg, type });
	};

	useEffect(() => {
		if (toast) setTimeout(() => setToast(null), 3000);
	}, [toast]);

	const openPINSheet = async (isNewUser: boolean = true) => {
		setPinModal(true);
		setPinStep(isNewUser ? "create" : "login");
		setPin(["", "", "", "", "", ""]);
		setConfirmPin(["", "", "", "", "", ""]);
		setTimeout(() => {
			if (isNewUser) {
				pinRefs.current[0]?.focus();
			} else {
				loginPinRefs.current[0]?.focus();
			}
		}, 300);
	};

	const closeSheets = () => {
		setPinModal(false);
		setPin(["", "", "", "", "", ""]);
		setConfirmPin(["", "", "", "", "", ""]);
		setPinStep("create");
	};

	const handleSuccessModalClose = () => {
		setShowSuccessModal(false);
		setTimeout(() => router.replace("/(app)/(protected)"), 100);
	};

	const handleInputChange = (
		text: string,
		index: number,
		currentArray: string[],
		setArray: React.Dispatch<React.SetStateAction<string[]>>,
		refs: React.MutableRefObject<(TextInput | null)[]>,
	) => {
		if (text.length > 1) {
			const pastedValues = text.slice(0, 6).split("");
			const newArray = [...currentArray];
			pastedValues.forEach((char, idx) => {
				if (index + idx < 6) newArray[index + idx] = char;
			});
			setArray(newArray);
			const lastIndex = Math.min(index + pastedValues.length - 1, 5);
			refs.current[lastIndex]?.focus();
			return;
		}
		const newArray = [...currentArray];
		newArray[index] = text;
		setArray(newArray);
		if (text && index < 5) {
			refs.current[index + 1]?.focus();
		}
	};

	const handleCountrySelect = (
		selectedCountry: Country,
		forEmail: boolean = false,
	) => {
		if (forEmail) {
			setEmailCountry(selectedCountry);
		} else {
			setCountry(selectedCountry);
		}
	};

	const handlePINConfirm = async () => {
		const securityToken = pin.join("");
		const confirmSecurityToken = confirmPin.join("");

		if (securityToken !== confirmSecurityToken) {
			showToast("Security tokens don't match. Please try again.", "error");
			setPin(["", "", "", "", "", ""]);
			setConfirmPin(["", "", "", "", "", ""]);
			setPinStep("create");
			setTimeout(() => pinRefs.current[0]?.focus(), 300);
			return;
		}

		setIsProcessing(true);
		setLoading(true);

		const countryCode = mode === "email" ? emailCountry?.code : country?.code;
		const dialCode = mode === "email" ? emailCountry?.dial : country?.dial;
		const flagEmoji = mode === "email" ? emailCountry?.flag : country?.flag;
		const currencySymbol =
			mode === "email"
				? emailCountry?.currency_symbol
				: country?.currency_symbol;

		const { success, user, error, transferToken } = await createUserWithPIN(
			currentIdentifier,
			securityToken,
			countryCode,
			dialCode,
			flagEmoji,
			currencySymbol,
		);

		setLoading(false);
		setIsProcessing(false);

		if (success && user) {
			try {
				const securityTokenHash = await hashPIN(securityToken);
				const transferTokenHash = await hashPIN(
					transferToken || securityToken.slice(0, 4),
				);
				await auth.login(
					user,
					currentIdentifier,
					securityTokenHash,
					transferTokenHash,
					true,
				);
				setTransferPin(transferToken || securityToken.slice(0, 4));
				closeSheets();
				setTimeout(() => {
					if (!dontShowTransferPin) {
						setShowSuccessModal(true);
					} else {
						setTimeout(() => router.replace("/(app)/(protected)"), 100);
					}
				}, 500);
			} catch (storageError) {
				console.error("Storage error:", storageError);
				showToast("Account creation failed - storage error", "error");
			}
		} else {
			showToast(error || "Account creation failed", "error");
		}
	};

	const handleLogin = async () => {
		const securityToken = pin.join("");
		if (securityToken.length !== 6) return;

		setIsProcessing(true);
		setLoading(true);

		const { success, user, error } = await verifyUserPIN(
			currentIdentifier,
			securityToken,
		);

		setLoading(false);
		setIsProcessing(false);

		if (success && user) {
			try {
				await auth.login(user, currentIdentifier);
				showToast("Login successful! Redirecting...", "success");
				closeSheets();
				setTimeout(() => router.replace("/(app)/(protected)"), 100);
			} catch (storageError) {
				console.error("Login storage error:", storageError);
				showToast("Login failed - storage error", "error");
				setPin(["", "", "", "", "", ""]);
				setTimeout(() => loginPinRefs.current[0]?.focus(), 300);
			}
		} else {
			showToast(error || "Invalid security token", "error");
			setPin(["", "", "", "", "", ""]);
			setTimeout(() => loginPinRefs.current[0]?.focus(), 300);
		}
	};

	// Auto-proceed to PIN confirmation
	useEffect(() => {
		const pinString = pin.join("");
		if (pinString.length === 6 && pinStep === "create" && pinModal) {
			setPinStep("confirm");
			setTimeout(() => confirmPinRefs.current[0]?.focus(), 300);
		}
	}, [pin]);

	// Auto-create account when confirmation PIN matches
	useEffect(() => {
		const confirmPinString = confirmPin.join("");
		const pinString = pin.join("");
		if (confirmPinString.length === 6 && pinStep === "confirm" && pinModal) {
			if (confirmPinString === pinString) {
				handlePINConfirm();
			} else {
				showToast("Security tokens don't match. Please try again.", "error");
				setPin(["", "", "", "", "", ""]);
				setConfirmPin(["", "", "", "", "", ""]);
				setPinStep("create");
				setTimeout(() => pinRefs.current[0]?.focus(), 300);
			}
		}
	}, [confirmPin]);

	// Auto-submit login PIN when complete
	useEffect(() => {
		const pinString = pin.join("");
		if (pinString.length === 6 && pinStep === "login" && pinModal) {
			handleLogin();
		}
	}, [pin]);

	const getPINTitle = () => {
		switch (pinStep) {
			case "create":
				return "Create 6-digit Security Token";
			case "confirm":
				return "Confirm Your Token";
			case "login":
				return "Enter Your Token";
			default:
				return "Create Token";
		}
	};

	const getPINSubtitle = () => {
		switch (pinStep) {
			case "create":
				return "This 6-digit token will secure your account and transactions";
			case "confirm":
				return "Re-enter your 6-digit security token to confirm";
			case "login":
				return `Enter your security token for ${maskIdentifier(currentIdentifier)}`;
			default:
				return "Create your account security token";
		}
	};

	// Render country display for phone mode (flag + dial code)
	const renderPhoneCountryDisplay = () => {
		if (!country) return null;
		return (
			<TouchableOpacity
				style={styles.countryDisplayPhone}
				onPress={() => setShowCountryPicker(true)}
				activeOpacity={0.8}
			>
				<Text style={styles.flagPhone}>{country.flag}</Text>
				<Text style={styles.dialCodePhone}>{country.dial}</Text>
				<FontAwesome
					name="chevron-down"
					size={12}
					color="#FFD700"
					style={styles.countryChevron}
				/>
			</TouchableOpacity>
		);
	};

	// Render country display for email mode (ONLY flag)
	const renderEmailCountryDisplay = () => {
		if (!emailCountry) return null;
		return (
			<TouchableOpacity
				style={styles.countryDisplayEmail}
				onPress={() => setShowEmailCountryPicker(true)}
				activeOpacity={0.8}
			>
				<Text style={styles.flagEmail}>{emailCountry.flag}</Text>
				<FontAwesome
					name="chevron-down"
					size={12}
					color="#FFD700"
					style={styles.countryChevron}
				/>
			</TouchableOpacity>
		);
	};

	// Handle phone input change with country-specific formatting
	const handlePhoneInputChange = (text: string) => {
		const digits = text.replace(/\D/g, "");
		setIdentifier(digits);

		// Format based on selected country
		const countryCode = country?.code || "NG";
		setDisplayPhone(formatPhoneNumber(digits, countryCode));
	};

	// Get current country validation rules for display
	const getCurrentPhoneValidationInfo = () => {
		if (!country) return null;
		const rules = getCountryValidationRules(country.code);
		return `Enter ${rules.min}-${rules.max} digits`;
	};

	// ──────── RENDER ────────
	return (
		<SafeAreaView style={styles.container}>
			{/* BACKGROUND */}
			<View style={styles.staticBackground}>
				<Animated.View
					style={[
						styles.pngWatermarkContainer,
						{
							transform: [{ scale: pulseAnim }],
						},
					]}
				>
					<Image
						source={require("@/assets/icons/home.png")}
						style={styles.pngWatermark}
						resizeMode="contain"
					/>
				</Animated.View>
			</View>

			{/* MAIN CONTENT */}
			<View style={styles.fixedContent}>
				{/* SWITCH ACCOUNT BUTTON */}
				{auth.savedAccounts && auth.savedAccounts.length > 0 && (
					<TouchableOpacity
						style={styles.switchAccountButton}
						onPress={handleSwitchAccountButton}
						activeOpacity={0.7}
					>
						<FontAwesome name="exchange" size={14} color="#FFD700" />
						<Text style={styles.switchAccountText}>
							Switch Account ({auth.savedAccounts?.length || 0})
						</Text>
					</TouchableOpacity>
				)}

				<KeyboardAvoidingView
					behavior={Platform.OS === "ios" ? "padding" : "height"}
					style={styles.keyboardAvoidingView}
					keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
				>
					<View style={styles.contentWrapper}>
						{/* HEADER */}
						<View style={styles.header}>
							<Text style={styles.title}>Welcome to B-Pay</Text>
						</View>

						{/* FINGERPRINT ICON */}
						<TouchableOpacity
							style={styles.fingerprintContainer}
							onPress={handleBiometricAuth}
							disabled={loading}
						>
							<FontAwesome name="500px" size={60} color="#fff" />
						</TouchableOpacity>

						{/* MODE TOGGLE BUTTONS */}
						<View style={styles.modeToggleContainer}>
							<TouchableOpacity
								style={[
									styles.modeButton,
									mode === "email" && styles.activeModeButton,
								]}
								onPress={() => {
									setMode("email");
									setTimeout(() => emailInputRef.current?.focus(), 300);
								}}
							>
								<FontAwesome
									name="envelope"
									size={16}
									color={mode === "email" ? "#FFD700" : "white"}
								/>
								<Text
									style={[
										styles.modeButtonText,
										mode === "email" && styles.activeModeButtonText,
									]}
								>
									Email
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[
									styles.modeButton,
									mode === "phone" && styles.activeModeButton,
								]}
								onPress={() => {
									setMode("phone");
									setTimeout(() => phoneInputRef.current?.focus(), 300);
								}}
							>
								<FontAwesome
									name="phone"
									size={16}
									color={mode === "phone" ? "#FFD700" : "white"}
								/>
								<Text
									style={[
										styles.modeButtonText,
										mode === "phone" && styles.activeModeButtonText,
									]}
								>
									Phone
								</Text>
							</TouchableOpacity>
						</View>

						{/* INPUT FIELD */}
						<View style={styles.inputContainer}>
							{mode === "email" ? (
								<View style={styles.emailInputWrapper}>
									{/* Country Picker for Email (FLAG ONLY) */}
									{renderEmailCountryDisplay()}
									<TextInput
										ref={emailInputRef}
										style={styles.emailInput}
										placeholder="Enter Email Address"
										placeholderTextColor="white"
										keyboardType="email-address"
										autoCapitalize="none"
										value={identifier}
										onChangeText={setIdentifier}
									/>
								</View>
							) : (
								<View style={styles.phoneInputWrapper}>
									{/* Country Picker for Phone (FLAG + DIAL CODE) */}
									{renderPhoneCountryDisplay()}
									<View style={styles.phoneInputContainer}>
										<TextInput
											ref={phoneInputRef}
											style={styles.phoneInput}
											placeholder={
												getCurrentPhoneValidationInfo() || "Enter phone number"
											}
											placeholderTextColor="white"
											keyboardType="phone-pad"
											value={displayPhone}
											onChangeText={handlePhoneInputChange}
										/>
										{country && identifier.length > 0 && (
											<Text style={styles.phoneLengthIndicator}>
												{identifier.replace(/\D/g, "").length}/
												{getCountryValidationRules(country.code).max}
											</Text>
										)}
									</View>
								</View>
							)}
						</View>

						{/* SECURITY FOOTER - Positioned like in success page */}
						<View style={styles.securityFooter}>
							<View style={styles.securityBadge}>
								<FontAwesome name="shield" size={12} color="#4CAF50" />
								<Text style={styles.securityText}>AES-256</Text>
							</View>
							<View style={styles.securityDivider} />
							<View style={styles.securityBadge}>
								<FontAwesome name="lock" size={12} color="#4CAF50" />
								<Text style={styles.securityText}>SSL</Text>
							</View>
							<View style={styles.securityDivider} />
							<View style={styles.securityBadge}>
								<FontAwesome name="key" size={12} color="#4CAF50" />
								<Text style={styles.securityText}>ENCRYPTED</Text>
							</View>
						</View>

						{/* FOOTER */}
						<View style={styles.footer}>
							<Text style={styles.footerText}>🛡️ B-PAY © 2025</Text>
						</View>
					</View>
				</KeyboardAvoidingView>
			</View>

			{/* TOAST */}
			{toast && (
				<View
					style={[
						styles.toast,
						toast.type === "success" ? styles.toastSuccess : styles.toastError,
					]}
				>
					<Text style={styles.toastText}>{toast.msg}</Text>
				</View>
			)}

			{/* ACCOUNT SWITCH DROPDOWN (EXACTLY FROM REFERENCE) */}
			<AccountSwitchDropdown
				visible={showAccountDropdown}
				onClose={() => setShowAccountDropdown(false)}
				accounts={auth.savedAccounts || []}
				currentAccount={auth.currentAccount}
				onSwitchAccount={handleSwitchAccount}
				onAddAccount={() => {
					setShowAccountDropdown(false);
					// Reset form for new account
					setIdentifier("");
					setDisplayPhone("");
				}}
				onRemoveAccount={async (identifier) => {
					if (!identifier) {
						showToast("Cannot remove invalid account", "error");
						return;
					}
					await auth.removeAccount(identifier);
					showToast("Account removed", "success");
				}}
			/>

			{/* OTP MODAL */}
			<OTPModal
				visible={otpModal}
				onClose={() => setOtpModal(false)}
				phoneNumber={currentIdentifier}
				onVerify={(otpCode) => {
					console.log("Verifying OTP:", otpCode);
					setOtpModal(false);
					openPINSheet(true);
				}}
				onResend={() => {
					showToast("OTP resent successfully", "success");
				}}
			/>

			{/* SUCCESS MODAL */}
			<SuccessModal
				visible={showSuccessModal}
				onClose={handleSuccessModalClose}
				transferPin={transferPin}
				onDontShowAgain={async (value) => {
					setDontShowTransferPin(value);
					await AsyncStorage.setItem(
						DONT_SHOW_TRANSFER_PIN_KEY,
						value.toString(),
					);
				}}
			/>

			{/* COUNTRY PICKER MODAL FOR PHONE */}
			<CountryPickerModal
				visible={showCountryPicker}
				onClose={() => setShowCountryPicker(false)}
				countries={countries}
				selectedCountry={country}
				onSelectCountry={(selectedCountry) =>
					handleCountrySelect(selectedCountry, false)
				}
				searchQuery={countrySearch}
				onSearchChange={setCountrySearch}
			/>

			{/* COUNTRY PICKER MODAL FOR EMAIL */}
			<CountryPickerModal
				visible={showEmailCountryPicker}
				onClose={() => setShowEmailCountryPicker(false)}
				countries={countries}
				selectedCountry={emailCountry}
				onSelectCountry={(selectedCountry) =>
					handleCountrySelect(selectedCountry, true)
				}
				searchQuery={emailCountrySearch}
				onSearchChange={setEmailCountrySearch}
			/>

			{/* PIN SHEET */}
			<Modal
				transparent
				visible={pinModal}
				onRequestClose={closeSheets}
				statusBarTranslucent
				animationType="slide"
			>
				<Pressable
					style={styles.modalOverlay}
					onPress={() => !isProcessing && closeSheets()}
				>
					<KeyboardAvoidingView
						behavior={Platform.OS === "ios" ? "padding" : "height"}
						style={{ flex: 1 }}
						keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
					>
						<View style={styles.sheet}>
							<View style={styles.sheetHandle} />
							<View style={styles.warningContainer}>
								<Text style={styles.warningSymbol}>⚠</Text>
							</View>
							{isProcessing ? (
								<View
									style={{
										flex: 1,
										justifyContent: "center",
										alignItems: "center",
										gap: 20,
									}}
								>
									<ActivityIndicator size="large" color="#FFD700" />
									<Text
										style={{
											color: "#FFD700",
											fontSize: 18,
											fontWeight: "600",
										}}
									>
										{pinStep === "login"
											? "Logging in..."
											: "Creating Account..."}
									</Text>
									<Text
										style={{
											color: "#FFD700",
											fontSize: 14,
											textAlign: "center",
											marginTop: 10,
										}}
									>
										B-PAY {maskIdentifier(currentIdentifier)}
									</Text>
								</View>
							) : (
								<>
									<Text style={styles.sheetTitle}>{getPINTitle()}</Text>
									<Text style={styles.sheetSubtitle}>{getPINSubtitle()}</Text>
									<View style={styles.securityWarning}>
										<Text style={styles.locationPin}>📍</Text>
										<Text style={styles.securityText}>
											This Token will be used to secure 🔐 your B-PAY account.
											Do not share your token with anyone.
										</Text>
									</View>
									<View style={styles.otpRow}>
										{(pinStep === "login"
											? pin
											: pinStep === "create"
												? pin
												: confirmPin
										).map((_, i) => (
											<TextInput
												key={i}
												ref={(ref) => {
													if (pinStep === "create") {
														pinRefs.current[i] = ref;
													} else if (pinStep === "confirm") {
														confirmPinRefs.current[i] = ref;
													} else {
														loginPinRefs.current[i] = ref;
													}
												}}
												style={[
													styles.otpBox,
													(pinStep === "login"
														? pin[i]
														: pinStep === "create"
															? pin[i]
															: confirmPin[i]) && styles.otpBoxFilled,
												]}
												keyboardType="number-pad"
												maxLength={1}
												secureTextEntry={true}
												value={
													pinStep === "login"
														? pin[i]
														: pinStep === "create"
															? pin[i]
															: confirmPin[i]
												}
												onChangeText={(text) => {
													if (pinStep === "create" || pinStep === "login") {
														handleInputChange(
															text,
															i,
															pin,
															setPin,
															pinStep === "create" ? pinRefs : loginPinRefs,
														);
													} else {
														handleInputChange(
															text,
															i,
															confirmPin,
															setConfirmPin,
															confirmPinRefs,
														);
													}
												}}
												onKeyPress={(e: any) => {
													if (e.nativeEvent.key === "Backspace") {
														if (
															(pinStep === "create" || pinStep === "login") &&
															!pin[i] &&
															i > 0
														) {
															(pinStep === "create"
																? pinRefs.current[i - 1]
																: loginPinRefs.current[i - 1]
															)?.focus();
														} else if (
															pinStep === "confirm" &&
															!confirmPin[i] &&
															i > 0
														) {
															confirmPinRefs.current[i - 1]?.focus();
														}
													}
												}}
											/>
										))}
									</View>
									{pinStep === "confirm" && (
										<TouchableOpacity
											style={styles.backButton}
											onPress={() => {
												setPinStep("create");
												setConfirmPin(["", "", "", "", "", ""]);
												setTimeout(() => pinRefs.current[0]?.focus(), 300);
											}}
										>
											<Text style={styles.backText}>
												← Back to change Token
											</Text>
										</TouchableOpacity>
									)}
									{pinStep === "login" && (
										<TouchableOpacity
											style={styles.backButton}
											onPress={() => {
												closeSheets();
												setIdentifier("");
												setDisplayPhone("");
											}}
										>
											<Text style={styles.backText}>
												← Use different email/phone
											</Text>
										</TouchableOpacity>
									)}
								</>
							)}
						</View>
					</KeyboardAvoidingView>
				</Pressable>
			</Modal>
		</SafeAreaView>
	);
}

// ──────── STYLES ────────
const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#000",
	},
	staticBackground: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		zIndex: 1,
	},
	switchAccountButton: {
		position: "absolute",
		top: 60,
		right: 20,
		zIndex: 10000,
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "rgba(255, 215, 0, 0.2)",
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderRadius: 20,
		borderWidth: 1,
		borderColor: "#FFD700",
		gap: 8,
	},
	switchAccountText: {
		color: "#FFD700",
		fontSize: 14,
		fontWeight: "600",
	},
	pngWatermarkContainer: {
		position: "absolute",
		top: "50%", // STAYS THE SAME
		left: "50%",
		width: 300,
		height: 300,
		marginLeft: -150,
		marginTop: -150,
		zIndex: 1,
		opacity: 0.38,
	},
	pngWatermark: {
		width: "100%",
		height: "100%",
	},
	fixedContent: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		zIndex: 100,
		justifyContent: "center", // STAYS THE SAME - keeps content centered
	},
	// ADJUSTED: KeyboardAvoidingView style
	keyboardAvoidingView: {
		flex: 1,
		justifyContent: "center", // Centers content vertically
	},
	// ADJUSTED: Content wrapper with better spacing
	contentWrapper: {
		paddingHorizontal: 32,
		zIndex: 2,
		marginTop: 80, // Pulls content up a bit (adjust this value)
		justifyContent: "center",
		flex: 1,
	},
	// ADJUSTED: Header with reduced margin
	header: {
		alignItems: "center",
		marginBottom: 10, // Reduced from 20
	},
	title: {
		color: "#FFD700",
		fontSize: 28,
		fontWeight: "700",
		textAlign: "center",
	},
	fingerprintContainer: {
		alignItems: "center",
		marginBottom: 20, // Reduced from 30
	},
	modeToggleContainer: {
		flexDirection: "row",
		justifyContent: "center",
		marginBottom: 15, // Reduced from 20
		gap: 20,
	},
	modeButton: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 10,
		paddingHorizontal: 20,
		borderRadius: 20,
		borderWidth: 1,
		borderColor: "white",
		backgroundColor: "transparent",
		gap: 8,
	},
	activeModeButton: {
		borderColor: "#FFD700",
	},
	modeButtonText: {
		color: "white",
		fontSize: 16,
		fontWeight: "500",
	},
	activeModeButtonText: {
		color: "#FFD700",
	},
	// ADJUSTED: Input container with reduced margin
	inputContainer: {
		marginBottom: 15, // Reduced from 30
	},
	emailInputWrapper: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "transparent",
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "white",
		paddingHorizontal: 8,
		paddingVertical: 4,
	},
	countryDisplayEmail: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 12,
		paddingVertical: 12,
		borderRightWidth: 1,
		borderRightColor: "#333",
		minWidth: 60,
		justifyContent: "center",
	},
	flagEmail: {
		fontSize: 24,
		color: "#FFD700",
	},
	emailInput: {
		flex: 1,
		paddingHorizontal: 16,
		paddingVertical: 12,
		color: "#fff",
		fontSize: 16,
	},
	phoneInputWrapper: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "transparent",
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "white",
		paddingHorizontal: 8,
		paddingVertical: 4,
	},
	countryDisplayPhone: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 12,
		paddingVertical: 12,
		borderRightWidth: 1,
		borderRightColor: "#333",
		gap: 8,
		minWidth: 100,
	},
	flagPhone: {
		fontSize: 24,
		color: "#FFD700",
	},
	dialCodePhone: {
		color: "#FFD700",
		fontSize: 14,
		fontWeight: "600",
	},
	phoneInputContainer: {
		flex: 1,
		position: "relative",
	},
	phoneInput: {
		paddingHorizontal: 16,
		paddingVertical: 12,
		color: "#fff",
		fontSize: 16,
		paddingRight: 60, // Space for length indicator
	},
	phoneLengthIndicator: {
		position: "absolute",
		right: 12,
		top: 12,
		color: "#FFD700",
		fontSize: 12,
		fontWeight: "600",
	},
	countryChevron: {
		marginLeft: 4,
	},
	// ADJUSTED: Security Footer with reduced margin
	securityFooter: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 10,
		paddingHorizontal: 14,
		paddingVertical: 10,
		backgroundColor: "rgba(76, 175, 80, 0.1)",
		borderRadius: 18,
		borderWidth: 1,
		borderColor: "rgba(76, 175, 80, 0.2)",
		marginTop: 15, // Reduced from 40
		marginBottom: 10, // Added for spacing
	},
	securityBadge: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},
	securityDivider: {
		width: 1,
		height: 12,
		backgroundColor: "rgba(76, 175, 80, 0.3)",
	},
	securityText: {
		color: "#4CAF50",
		fontSize: 11,
		fontWeight: "700",
		letterSpacing: 0.5,
	},
	// ADJUSTED: Footer position
	footer: {
		position: "absolute",
		bottom: 10,
		left: 0,
		right: 0,
		alignItems: "center",
		zIndex: 1000,
	},
	footerText: {
		color: "#FFD700",
		fontSize: 12,
		fontWeight: "600",
	},
	toast: {
		position: "absolute",
		bottom: 100,
		left: 32,
		right: 32,
		padding: 14,
		borderRadius: 12,
		alignItems: "center",
		zIndex: 1000,
	},
	toastSuccess: {
		backgroundColor: "#00FF7F",
	},
	toastError: {
		backgroundColor: "#FF4444",
	},
	toastText: {
		color: "#fff",
		fontWeight: "600",
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.8)",
		justifyContent: "flex-end",
	},
	sheet: {
		backgroundColor: "#1a1a1a",
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		padding: 20,
		paddingBottom: 40,
	},
	sheetHandle: {
		width: 40,
		height: 5,
		backgroundColor: "#444",
		borderRadius: 3,
		alignSelf: "center",
		marginBottom: 20,
	},
	sheetTitle: {
		color: "#fff",
		fontSize: 18,
		fontWeight: "600",
		textAlign: "center",
		marginBottom: 8,
	},
	sheetSubtitle: {
		color: "#aaa",
		fontSize: 14,
		textAlign: "center",
		marginBottom: 8,
		lineHeight: 20,
	},
	warningContainer: {
		alignItems: "center",
		marginBottom: 16,
	},
	warningSymbol: {
		fontSize: 40,
		color: "#FFD700",
		textAlign: "center",
	},
	securityWarning: {
		flexDirection: "row",
		alignItems: "flex-start",
		backgroundColor: "rgba(255, 215, 0, 0.1)",
		padding: 16,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "#FFD700",
		marginBottom: 20,
	},
	locationPin: {
		fontSize: 16,
		marginRight: 8,
		marginTop: 2,
	},
	otpRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: 30,
	},
	otpBox: {
		backgroundColor: "transparent",
		width: 48,
		height: 56,
		borderRadius: 12,
		textAlign: "center",
		color: "#fff",
		fontSize: 20,
		borderWidth: 1,
		borderColor: "#333",
		secureTextEntry: true,
	},
	otpBoxFilled: {
		borderColor: "#FFD700",
		backgroundColor: "rgba(255, 215, 0, 0.1)",
	},
	backButton: {
		alignItems: "center",
		marginBottom: 20,
	},
	backText: {
		color: "#FFD700",
		fontSize: 14,
	},
});
