import React, { useState, useContext, useEffect } from "react";
import {
	View,
	Text,
	Pressable,
	StyleSheet,
	StatusBar,
	ActivityIndicator,
	Alert,
	Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useSegments } from "expo-router";
import { useAuth } from "@/context/supabase-provider";
import { useFont } from "@/context/font-context";
import { useNotifications } from "@/context/NotificationsProvider";
import { supabase } from "@/config/supabase";
import { useQuery } from "@tanstack/react-query";
import {
	actions,
	DEFAULT_PROVIDER_IMAGE,
	NETWORK_IMAGES,
} from "@/constants/helper";
import { useNotificationSubscription } from "@/hooks/useHomeScreenData";
import PlanItemWithSwipe from "@/components/homescreen/PlanItemWithSwipe";
import CreatePinModal from "@/components/homescreen/CreatePinModal";
import { DataContext } from "@/context/DataProvider";
import SwipeWrapper from "../../../components/SwipeWrapper";

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
	image: any;
	code: string;
	imageKey: string;
}

interface ConfirmationParams {
	bundle?: string;
	provider?: string;
	phoneNumber?: string;
	userEmail?: string;
	transactionPin?: string;
	source?: string;
	networkId?: string;
	planId?: string;
}

interface Purchase {
	plan_name: string;
	provider_name: string;
	validity: string;
	mobile_number: string;
	network_id: string;
	plan_id: string;
	created_at: string;
	user_email: string;
}

const usePurchaseHistory = () => {
	const { user } = useAuth();
	return useQuery<Purchase[]>({
		queryKey: ["purchaseHistory", user?.email ?? "no-user"],
		queryFn: async () => {
			if (!user?.email) return [];
			const { data, error } = await supabase
				.from("data_purchases")
				.select(
					"plan_name, provider_name, validity, mobile_number, network_id, plan_id, created_at, user_email",
				)
				.eq("user_email", user.email)
				.gte(
					"created_at",
					new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
				)
				.order("created_at", { ascending: false });
			if (error) throw error;
			return data || [];
		},
		enabled: !!user?.email,
	});
};

const useNewNotificationCount = () => {
	const { user } = useAuth();
	const { notificationsEnabled } = useNotifications();
	return useQuery<number>({
		queryKey: ["newNotificationCount", user?.id ?? "no-user"],
		queryFn: async () => {
			if (!user?.id || !notificationsEnabled) return 0;
			const { data, error } = await supabase
				.from("notifications")
				.select("id")
				.eq("user_id", user.id)
				.eq("is_read", false)
				.gte(
					"created_at",
					new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
				);
			if (error) throw error;
			return data?.length || 0;
		},
		enabled: !!user?.id && notificationsEnabled,
	});
};

export default function HomeScreen() {
	const { selectedFont } = useFont();
	const { user, initialized } = useAuth();
	const { notificationsEnabled } = useNotifications();
	const segments = useSegments();
	const {
		providerPlans,
		isLoading: isPlansLoading,
		errorMessage,
	} = useContext(DataContext);

	const hasTransactionPin = user
		? !!user.user_metadata?.transaction_pin_created
		: false;
	const username = user ? (user.user_metadata?.username ?? "User") : "User";
	const userEmail = user?.email ?? "";

	const [createPinModalVisible, setCreatePinModalVisible] = useState(false);
	const [newPin, setNewPin] = useState("");
	const [confirmPin, setConfirmPin] = useState("");
	const [showNewPin, setShowNewPin] = useState(false);
	const [showConfirmPin, setShowConfirmPin] = useState(false);
	const [isPinLoading, setIsPinLoading] = useState(false);

	const {
		data: purchaseHistory = [],
		isLoading: isPurchaseHistoryLoading,
		error: purchaseHistoryError,
	} = usePurchaseHistory();

	const {
		data: newNotificationCount = 0,
		isLoading: isNewNotificationCountLoading,
	} = useNewNotificationCount();

	// Animation states
	const blinkOpacity = new Animated.Value(1);
	const popScale = new Animated.Value(1);

	useEffect(() => {
		if (!initialized) return;

		// Redirect to welcome screen if user is null
		if (!user && segments[1] !== "(auth)") {
			router.replace("/(app)/welcome");
			return;
		}

		// Blinking animation
		const blink = Animated.loop(
			Animated.sequence([
				Animated.timing(blinkOpacity, {
					toValue: 0.4,
					duration: 800,
					useNativeDriver: true,
				}),
				Animated.timing(blinkOpacity, {
					toValue: 1,
					duration: 800,
					useNativeDriver: true,
				}),
			]),
		);

		// Popping animation
		const pop = Animated.loop(
			Animated.sequence([
				Animated.timing(popScale, {
					toValue: 1.1,
					duration: 500,
					useNativeDriver: true,
				}),
				Animated.timing(popScale, {
					toValue: 1,
					duration: 500,
					useNativeDriver: true,
				}),
			]),
		);

		blink.start();
		pop.start();

		return () => {
			blink.stop();
			pop.stop();
		};
	}, [initialized, user, segments]);

	useNotificationSubscription();

	const popularPlans = purchaseHistory.map((p) => {
		const amountMatch = p.plan_name?.match(/₦(\d+)/);
		const provider = p.provider_name || getProviderFromPlan(p.plan_name || "");
		const displayPlanName = p.plan_name?.includes(provider)
			? p.plan_name
			: `${provider} ${p.plan_name || "Unknown Plan"}`;
		return {
			plan_name: displayPlanName,
			provider,
			image: NETWORK_IMAGES[provider.toLowerCase()] || DEFAULT_PROVIDER_IMAGE,
			amount: amountMatch ? parseInt(amountMatch[1], 10) : 300,
			validity: p.validity || "N/A",
			phone_number:
				p.mobile_number || (user ? (user.user_metadata?.phone ?? "") : ""),
			network_id: p.network_id?.toString() || "0",
			plan_id: p.plan_id?.toString() || "0",
		};
	});

	const hasPlans = popularPlans.length > 0;
	const phoneNumber = hasPlans
		? popularPlans[0].phone_number
		: user
			? (user.user_metadata?.phone ?? "")
			: "";

	const getProviderFromPlan = (plan: string): string => {
		const planUpper = plan.toUpperCase();
		if (planUpper.includes("MTN")) return "MTN";
		if (planUpper.includes("GLO")) return "GLO";
		if (planUpper.includes("AIRTEL")) return "AIRTEL";
		if (planUpper.includes("9MOBILE") || planUpper.includes("ETISALAT"))
			return "9MOBILE";
		return "";
	};

	const closeCreateModal = () => {
		setCreatePinModalVisible(false);
		setNewPin("");
		setConfirmPin("");
		setIsPinLoading(false);
	};

	const handleCreatePin = async () => {
		if (
			newPin.length < 4 ||
			newPin.length > 6 ||
			confirmPin.length < 4 ||
			confirmPin.length > 6
		) {
			Alert.alert("Error", "PIN must be between 4 and 6 digits.");
			return;
		}
		if (newPin !== confirmPin) {
			Alert.alert("Error", "PINs do not match.");
			return;
		}

		if (!user) {
			Alert.alert("Error", "You must be logged in to create a PIN.");
			router.replace("/(app)/welcome");
			return;
		}

		setIsPinLoading(true);
		try {
			const { error } = await supabase.auth.updateUser({
				data: {
					transaction_pin: newPin,
					transaction_pin_created: true,
				},
			});
			if (error) throw error;
			closeCreateModal();
			Alert.alert("Success", "Transaction PIN created successfully.");
		} catch (error) {
			Alert.alert("Error", "Failed to save PIN. Please try again.");
		} finally {
			setIsPinLoading(false);
		}
	};

	const handleSwipePurchase = (plan: {
		plan_name: string;
		provider: string;
		image: string;
		amount: number;
		validity: string;
		phone_number: string;
		network_id: string;
		plan_id: string;
	}) => {
		if (!user) {
			Alert.alert("Error", "You must be logged in to make a purchase.");
			router.replace("/(app)/welcome");
			return;
		}

		if (!hasTransactionPin) {
			setCreatePinModalVisible(true);
			return;
		}

		const bundle: DataBundle = {
			id: parseInt(plan.plan_id) || 0,
			data: plan.plan_name,
			price: plan.amount,
			validity: plan.validity,
			category: "Data",
			description: plan.plan_name,
			variation_code: `data_${plan.plan_name.toLowerCase().replace(/\s/g, "_")}`,
			planType: "Data Plan",
		};

		const provider: Provider = {
			id: parseInt(plan.network_id) || 0,
			name: plan.provider,
			image: plan.image,
			code: plan.provider.toLowerCase(),
			imageKey: plan.provider.toUpperCase(),
		};

		const params: ConfirmationParams = {
			bundle: JSON.stringify(bundle),
			provider: JSON.stringify({
				id: provider.id,
				name: provider.name,
				code: provider.code,
				imageKey: provider.imageKey,
			}),
			phoneNumber: plan.phone_number || phoneNumber,
			userEmail,
			transactionPin: user.user_metadata?.transaction_pin ?? "",
			source: "index",
			networkId: plan.network_id,
			planId: plan.plan_id,
		};

		router.push({
			pathname: "/Confirmation",
			params: params as any,
		});
	};

	if (
		!initialized ||
		isPurchaseHistoryLoading ||
		isNewNotificationCountLoading ||
		isPlansLoading
	) {
		return (
			<SwipeWrapper>
				<View style={[styles.container, styles.centerContent]}>
					<ActivityIndicator size="large" color="#D7A77F" />
					<Text style={styles.loadingText}>Loading data...</Text>
				</View>
			</SwipeWrapper>
		);
	}

	if (!user) {
		return null;
	}

	if (purchaseHistoryError) {
		console.error("Purchase history error:", purchaseHistoryError);
	}
	if (errorMessage) {
		console.error("Data provider error:", errorMessage);
	}

	return (
		<SwipeWrapper>
			<View style={styles.container}>
				<StatusBar
					translucent
					backgroundColor="black"
					barStyle="light-content"
				/>
				<View style={styles.header}>
					<Pressable
						onPress={() => router.push("/notifications")}
						style={styles.notificationIcon}
					>
						<View>
							<Ionicons name="notifications" size={24} color="#666" />
							{notificationsEnabled && newNotificationCount > 0 && (
								<View style={styles.badge}>
									<Text style={styles.badgeText}>
										{newNotificationCount > 99 ? "99+" : newNotificationCount}
									</Text>
								</View>
							)}
						</View>
					</Pressable>
				</View>

				<View style={styles.greetingContainer}>
					<Text style={[styles.headerTitle, { fontFamily: selectedFont }]}>
						Hi,
					</Text>
					<Text style={[styles.headerTitle, { textTransform: "capitalize" }]}>
						{username} 👋
					</Text>
				</View>
				<Text style={styles.headerSubtitle}>Your dashboard is here 🔥</Text>

				<Animated.View
					style={[
						styles.flashSaleBanner,
						{
							opacity: blinkOpacity,
							transform: [{ scale: popScale }],
						},
					]}
				>
					<Pressable onPress={() => router.push("/commingsoon")}>
						<Text style={styles.flashSaleText}>
							⚡ FLASH SALE! Up to 50% OFF Data Plans! ⚡
						</Text>
					</Pressable>
				</Animated.View>

				<View style={styles.quickActionsSection}>
					<Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
					<View style={styles.quickActions}>
						<View style={styles.quickActionsGrid}>
							{actions.map((action, index) => (
								<Pressable
									key={index}
									onPress={() => {
										if (!user && action.route !== "commingsoon") {
											Alert.alert(
												"Error",
												"Please log in to access this feature.",
											);
											router.replace("/(app)/(auth)/sign-in");
											return;
										}
										router.push(`/${action.route}`);
									}}
									style={styles.button}
								>
									<Ionicons name={action.icon} size={24} color={action.color} />
									<Text style={styles.buttonTitle}>
										{action.title.length > 12
											? action.title.slice(0, 11) + "..."
											: action.title}
									</Text>
								</Pressable>
							))}
						</View>
					</View>
				</View>

				<View style={styles.popularPlansSection}>
					<Text style={styles.sectionTitle}>🔥 Recent Plans</Text>
				</View>
				{hasPlans ? (
					popularPlans.map((plan, index) => (
						<PlanItemWithSwipe
							key={`${plan.plan_id}-${index}`}
							plan={plan.plan_name}
							image={plan.image}
							index={index}
							onSwipePurchase={() => handleSwipePurchase(plan)}
						/>
					))
				) : (
					<View style={styles.popularPlansContainer}>
						<Text style={styles.noPlansText}>
							No recent purchases found in the last 24 hours.
						</Text>
					</View>
				)}

				<CreatePinModal
					visible={createPinModalVisible}
					onClose={closeCreateModal}
					newPin={newPin}
					setNewPin={setNewPin}
					confirmPin={confirmPin}
					setConfirmPin={setConfirmPin}
					showNewPin={showNewPin}
					setShowNewPin={setShowNewPin}
					showConfirmPin={showConfirmPin}
					setShowConfirmPin={setShowConfirmPin}
					onSave={handleCreatePin}
					isLoading={isPinLoading}
				/>
			</View>
		</SwipeWrapper>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#000",
		paddingHorizontal: 16,
		paddingTop: StatusBar.currentHeight || 40,
	},
	header: {
		position: "absolute",
		top: StatusBar.currentHeight || 40,
		right: 16,
		zIndex: 10,
	},
	notificationIcon: {
		padding: 24,
	},
	badge: {
		position: "absolute",
		top: -4,
		right: -4,
		backgroundColor: "#f42",
		borderRadius: 10,
		minWidth: 20,
		height: 20,
		justifyContent: "center",
		alignItems: "center",
	},
	badgeText: {
		color: "#fff",
		fontSize: 12,
		fontWeight: "700",
	},
	greetingContainer: {
		flexDirection: "row",
		gap: 8,
		alignItems: "center",
		marginTop: 14,
	},
	headerTitle: {
		fontSize: 24,
		fontWeight: "700",
		color: "#fff",
	},
	headerSubtitle: {
		fontSize: 16,
		color: "#888",
		marginBottom: 12,
	},
	flashSaleBanner: {
		backgroundColor: "#FF4500",
		borderRadius: 12,
		padding: 12,
		marginBottom: 16,
		alignItems: "center",
		shadowColor: "#FF4500",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.5,
		shadowRadius: 8,
		elevation: 5,
	},
	flashSaleText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "700",
		textAlign: "center",
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: "600",
		color: "#fff",
		marginBottom: 12,
	},
	quickActionsSection: {
		marginVertical: 16,
	},
	quickActions: {
		backgroundColor: "#111",
		borderRadius: 16,
		paddingHorizontal: 12,
		paddingVertical: 12,
	},
	quickActionsGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
	},
	button: {
		width: "30%",
		backgroundColor: "#222",
		borderRadius: 12,
		paddingVertical: 16,
		alignItems: "center",
		justifyContent: "center",
	},
	buttonTitle: {
		color: "#fff",
		fontSize: 10,
		fontWeight: "500",
		marginTop: 6,
		textAlign: "center",
	},
	popularPlansSection: {
		marginVertical: 16,
	},
	popularPlansContainer: {
		padding: 16,
		backgroundColor: "#111",
		borderRadius: 8,
		alignItems: "center",
	},
	noPlansText: {
		color: "#999",
		fontSize: 14,
		textAlign: "center",
	},
	centerContent: {
		justifyContent: "center",
		alignItems: "center",
	},
	loadingText: {
		color: "#fff",
		fontSize: 16,
		marginTop: 10,
	},
});