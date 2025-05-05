import React, { useState, useEffect } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	StyleSheet,
	Dimensions,
	Vibration,
	Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withSpring,
	withTiming,
	useAnimatedGestureHandler,
	runOnJS,
} from "react-native-reanimated";
import {
	GestureHandlerRootView,
	PanGestureHandler,
} from "react-native-gesture-handler";
import { useAuth } from "@/context/supabase-provider";

const { width, height } = Dimensions.get("window");

const sections = [
	{
		title: "Account",
		items: ["Edit Profile", "Change Password", "Change Email"],
	},
	{
		title: "Preferences",
		items: ["Notifications", "Sound", "Themes", "Authentication"],
	},
	{
		title: "Security",
		items: [
			"Biometric Login",
			"Two-Factor Authentication",
			"Device Management",
			"Change PIN",
		],
	},
	{
		title: "Billing",
		items: ["Manage Subscriptions", "Payment Methods", "Invoices"],
	},
	{
		title: "Privacy",
		items: ["Data Sharing", "Location Services", "Ad Preferences"],
	},
];

export default function Settings() {
	const router = useRouter();
	const { user, profile, signOut } = useAuth();

	const [openSection, setOpenSection] = useState<string | null>(null);
	const [logoutVisible, setLogoutVisible] = useState(false);
	const [sectionOrder, setSectionOrder] = useState(sections);
	const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

	// Ensure sectionOrder is reset to sections on mount
	useEffect(() => {
		setSectionOrder(sections);
	}, []);

	// Debug log to verify sections data
	console.log('Sections data:', sectionOrder);

	// Animation values
	const slideAnim = useSharedValue(width);
	const cardScale = useSharedValue(0.8);
	const cardOpacity = useSharedValue(0);
	const cardY = useSharedValue(100);

	// Show logout after 5 seconds
	useEffect(() => {
		if (user && profile) {
			const timer = setTimeout(() => {
				setLogoutVisible(true);
				slideAnim.value = withTiming(0, { duration: 500 });
			}, 5000);

			return () => clearTimeout(timer);
		}
	}, [user, profile]);

	const handleSectionToggle = (sectionTitle: string) => {
		if (openSection === sectionTitle) {
			cardScale.value = withTiming(0.8, { duration: 300 });
			cardOpacity.value = withTiming(0, { duration: 300 });
			cardY.value = withTiming(100, { duration: 300 }, () => {
				runOnJS(setOpenSection)(null);
			});
		} else {
			setOpenSection(sectionTitle);
			cardScale.value = withSpring(1);
			cardOpacity.value = withTiming(1, { duration: 300 });
			cardY.value = withTiming(0, { duration: 300 });
		}
	};

	const gestureHandler = useAnimatedGestureHandler({
		onStart: (_, ctx: any) => {
			ctx.startY = 0;
		},
		onActive: (event, ctx: any) => {
			ctx.startY = event.translationY;
		},
		onEnd: (event, ctx: any) => {
			runOnJS(Vibration.vibrate)(50);
			const draggedDistance = event.absoluteY;
			const fromIndex = draggingIndex;
			const toIndex = Math.min(
				Math.max(Math.round(draggedDistance / 80), 0),
				sectionOrder.length - 1,
			);

			if (fromIndex !== null && toIndex !== fromIndex) {
				runOnJS(reorderSections)(fromIndex, toIndex);
			}

			runOnJS(setDraggingIndex)(null);
		},
	});

	const reorderSections = (from: number, to: number) => {
		const updatedOrder = [...sectionOrder];
		const [movedItem] = updatedOrder.splice(from, 1);
		updatedOrder.splice(to, 0, movedItem);
		setSectionOrder(updatedOrder);
	};

	const cardAnimatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: cardScale.value }, { translateY: cardY.value }],
		opacity: cardOpacity.value,
	}));

	const logoutAnimatedStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: slideAnim.value }],
	}));

	const handleLogout = () => {
		Alert.alert("Logout", "Are you sure you want to logout?", [
			{
				text: "Cancel",
				style: "cancel",
			},
			{
				text: "Logout",
				style: "destructive",
				onPress: async () => {
					await signOut();
					router.replace("/(app)/welcome");
				},
			},
		]);
	};

	if (!user || !profile) {
		router.replace("/(app)/(auth)/sign-in"); // Redirect to sign-in if no user or profile
		return null; // or a loading spinner
	}

	return (
		<GestureHandlerRootView style={styles.container}>
			<ScrollView contentContainerStyle={styles.scrollContainer}>
				{/* Header */}
				<View style={styles.header}>
					<TouchableOpacity onPress={() => router.back()}>
						<Ionicons name="arrow-back" size={24} color="white" />
					</TouchableOpacity>
					<Text style={styles.headerTitle}>Settings</Text>
					<View style={{ width: 24 }} />
				</View>

				{/* Sections */}
				{sectionOrder.map((section, index) => (
					<PanGestureHandler
						key={section.title}
						onGestureEvent={gestureHandler}
						onHandlerStateChange={({ nativeEvent }) => {
							if (nativeEvent.state === 2) {
								setDraggingIndex(index);
							}
						}}
					>
						<Animated.View
							style={[
								styles.sectionContainer,
								draggingIndex === index && styles.dragging,
							]}
						>
							<TouchableOpacity
								onPress={() => handleSectionToggle(section.title)}
								style={styles.sectionButton}
							>
								<Text style={styles.sectionTitle}>{section.title}</Text>
							</TouchableOpacity>

							{/* Glass Card */}
							{openSection === section.title && (
								<Animated.View style={[styles.centeredCard, cardAnimatedStyle]}>
									<BlurView
										intensity={100}
										tint="light"
										style={styles.glassCard}
									>
										<Text style={styles.cardTitle}>{section.title}</Text>

										{/* If Account section show user info */}
										{section.title === "Account" && (
											<View style={styles.userInfoContainer}>
												<Text style={styles.userInfoText}>
													Username: {profile.username}
												</Text>
												<Text style={styles.userInfoText}>
													Email: {profile.email}
												</Text>
												<View style={{ height: 12 }} />
											</View>
										)}

										{section.items.map((item, idx) => (
											<TouchableOpacity key={idx} style={styles.cardItem}>
												<Text style={styles.cardItemText}>{item}</Text>
											</TouchableOpacity>
										))}
									</BlurView>
								</Animated.View>
							)}
						</Animated.View>
					</PanGestureHandler>
				))}

				{/* Logout */}
				{logoutVisible && (
					<Animated.View style={[styles.logoutContainer, logoutAnimatedStyle]}>
						<TouchableOpacity
							style={styles.logoutButton}
							onPress={handleLogout}
						>
							<Text style={styles.logoutText}>Log Out</Text>
						</TouchableOpacity>
					</Animated.View>
				)}
			</ScrollView>
		</GestureHandlerRootView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "black",
	},
	scrollContainer: {
		paddingHorizontal: 16,
		paddingTop: 32,
		paddingBottom: 120,
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 24,
	},
	headerTitle: {
		fontSize: 20,
		fontWeight: "600",
		color: "white",
	},
	sectionContainer: {
		marginBottom: 16,
	},
	sectionButton: {
		backgroundColor: "#2c2c2c",
		padding: 16,
		borderRadius: 16,
	},
	sectionTitle: {
		color: "white",
		fontSize: 16,
		fontWeight: "500",
	},
	centeredCard: {
		alignItems: "center",
		justifyContent: "center",
		marginTop: 12,
	},
	glassCard: {
		backgroundColor: "rgba(255,255,255,0.15)",
		borderRadius: 20,
		padding: 20,
		width: width * 0.9,
	},
	cardTitle: {
		fontSize: 20,
		fontWeight: "600",
		textAlign: "center",
		marginBottom: 16,
		color: "black",
	},
	cardItem: {
		padding: 12,
		backgroundColor: "rgba(255,255,255,0.2)",
		borderRadius: 12,
		marginBottom: 8,
	},
	cardItemText: {
		fontSize: 14,
		color: "black",
	},
	logoutContainer: {
		marginTop: 32,
		width: "100%",
	},
	logoutButton: {
		backgroundColor: "#EF4444",
		padding: 16,
		borderRadius: 16,
	},
	logoutText: {
		textAlign: "center",
		color: "white",
		fontWeight: "600",
	},
	dragging: {
		opacity: 0.7,
		transform: [{ scale: 1.05 }],
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.8,
		shadowRadius: 8,
		elevation: 5,
	},
	userInfoContainer: {
		marginBottom: 16,
	},
	userInfoText: {
		color: "black",
		fontSize: 14,
		marginBottom: 4,
	},
});