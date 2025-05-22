// // import React, { useState, useEffect } from "react";
// // import {
// // 	View,
// // 	Text,
// // 	TouchableOpacity,
// // 	ScrollView,
// // 	StyleSheet,
// // 	Dimensions,
// // 	Vibration,
// // 	Alert,
// // } from "react-native";
// // import { Ionicons } from "@expo/vector-icons";
// // import { BlurView } from "expo-blur";
// // import { useRouter } from "expo-router";
// // import Animated, {
// // 	useSharedValue,
// // 	useAnimatedStyle,
// // 	withSpring,
// // 	withTiming,
// // 	useAnimatedGestureHandler,
// // 	runOnJS,
// // } from "react-native-reanimated";
// // import {
// // 	GestureHandlerRootView,
// // 	PanGestureHandler,
// // } from "react-native-gesture-handler";
// // import { useAuth, useSupabase } from "@/context/supabase-provider";
// // import { useFont } from "@/context/font-context";
// // import { useTheme } from "@/context/theme-context";
// // import { fonts } from "@/constants/fonts";
// // import { colors } from "@/constants/colors";

// // const { width, height } = Dimensions.get("window");

// // const sections = [
// // 	{
// // 		title: "Account",
// // 		items: ["Edit Profile", "Change Password", "Change Email"],
// // 	},
// // 	{
// // 		title: "Preferences",
// // 		items: ["Notifications", "Sound", "Themes", "Fonts"],
// // 	},
// // 	{
// // 		title: "Security",
// // 		items: [
// // 			"Authentication",
// // 			"Biometric Login",
// // 			"Two-Factor Authentication",
// // 			"Device Management",
// // 			"Change PIN",
// // 		],
// // 	},
// // 	{
// // 		title: "Billing",
// // 		items: ["Manage Subscriptions", "Payment Methods", "Invoices"],
// // 	},
// // 	{
// // 		title: "Privacy",
// // 		items: ["Data Sharing", "Location Services", "Ad Preferences"],
// // 	},
// // ];

// // export default function Settings() {
// // 	const { deleteOwnAccount } = useSupabase();

// // 	const { colorScheme, setCustomColorScheme } = useTheme();
// // 	const { selectedFont, setSelectedFont } = useFont();
// // 	const fontOptions = Object.keys(fonts);

// // 	const [fontModalVisible, setFontModalVisible] = useState(false);
// // 	const [themeModalVisible, setThemeModalVisible] = useState(false);
// // 	const [deleteModalVisible, setDeleteModalVisible] = useState(false);

// // 	const router = useRouter();
// // 	const { user, profile, signOut } = useAuth();

// // 	const [openSection, setOpenSection] = useState<string | null>(null);
// // 	const [logoutVisible, setLogoutVisible] = useState(false);
// // 	const [sectionOrder, setSectionOrder] = useState(sections);
// // 	const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

// // 	// Ensure sectionOrder is reset to sections on mount
// // 	useEffect(() => {
// // 		setSectionOrder(sections);
// // 	}, []);

// // 	// Debug log to verify sections data
// // 	console.log("Sections data:", sectionOrder);

// // 	// Animation values
// // 	const slideAnim = useSharedValue(width);
// // 	const cardScale = useSharedValue(0.8);
// // 	const cardOpacity = useSharedValue(0);
// // 	const cardY = useSharedValue(100);

// // 	// Show logout after 5 seconds
// // 	useEffect(() => {
// // 		if (user && profile) {
// // 			const timer = setTimeout(() => {
// // 				setLogoutVisible(true);
// // 				slideAnim.value = withTiming(0, { duration: 500 });
// // 			}, 5000);

// // 			return () => clearTimeout(timer);
// // 		}
// // 	}, [user, profile]);

// // 	const handleSectionToggle = (sectionTitle: string) => {
// // 		if (openSection === sectionTitle) {
// // 			cardScale.value = withTiming(0.8, { duration: 300 });
// // 			cardOpacity.value = withTiming(0, { duration: 300 });
// // 			cardY.value = withTiming(100, { duration: 300 }, () => {
// // 				runOnJS(setOpenSection)(null);
// // 			});
// // 		} else {
// // 			setOpenSection(sectionTitle);
// // 			cardScale.value = withSpring(1);
// // 			cardOpacity.value = withTiming(1, { duration: 300 });
// // 			cardY.value = withTiming(0, { duration: 300 });
// // 		}
// // 	};

// // 	const gestureHandler = useAnimatedGestureHandler({
// // 		onStart: (_, ctx: any) => {
// // 			ctx.startY = 0;
// // 		},
// // 		onActive: (event, ctx: any) => {
// // 			ctx.startY = event.translationY;
// // 		},
// // 		onEnd: (event, ctx: any) => {
// // 			runOnJS(Vibration.vibrate)(50);
// // 			const draggedDistance = event.absoluteY;
// // 			const fromIndex = draggingIndex;
// // 			const toIndex = Math.min(
// // 				Math.max(Math.round(draggedDistance / 80), 0),
// // 				sectionOrder.length - 1,
// // 			);

// // 			if (fromIndex !== null && toIndex !== fromIndex) {
// // 				runOnJS(reorderSections)(fromIndex, toIndex);
// // 			}

// // 			runOnJS(setDraggingIndex)(null);
// // 		},
// // 	});

// // 	const reorderSections = (from: number, to: number) => {
// // 		const updatedOrder = [...sectionOrder];
// // 		const [movedItem] = updatedOrder.splice(from, 1);
// // 		updatedOrder.splice(to, 0, movedItem);
// // 		setSectionOrder(updatedOrder);
// // 	};

// // 	const cardAnimatedStyle = useAnimatedStyle(() => ({
// // 		transform: [{ scale: cardScale.value }, { translateY: cardY.value }],
// // 		opacity: cardOpacity.value,
// // 	}));

// // 	const logoutAnimatedStyle = useAnimatedStyle(() => ({
// // 		transform: [{ translateX: slideAnim.value }],
// // 	}));

// // 	const handleFontSelect = (fontKey) => {
// // 		setSelectedFont(fonts[fontKey]);
// // 		Alert.alert(
// // 			t("settings.fontSelected"),
// // 			`${fontKey} ${t("settings.asYourFont")}.`,
// // 		);
// // 		setFontModalVisible(false);
// // 	};

// // 	const handleThemeSelect = (theme) => {
// // 		setCustomColorScheme(theme);
// // 		Alert.alert(
// // 			t("settings.themeSelected"),
// // 			`${theme} ${t("settings.asYourTheme")}.`,
// // 		);
// // 		setThemeModalVisible(false);
// // 	};

// // 	const confirmDeleteAccount = async () => {
// // 		try {
// // 			await deleteOwnAccount();
// // 			setDeleteModalVisible(false);
// // 		} catch (error) {
// // 			Alert.alert("Error", "Failed to delete your account.");
// // 		}
// // 	};

// // 	const handleLogout = () => {
// // 		Alert.alert("Logout", "Are you sure you want to logout?", [
// // 			{
// // 				text: "Cancel",
// // 				style: "cancel",
// // 			},
// // 			{
// // 				text: "Logout",
// // 				style: "destructive",
// // 				onPress: async () => {
// // 					await signOut();
// // 					router.replace("/(app)/welcome");
// // 				},
// // 			},
// // 		]);
// // 	};

// // 	if (!user || !profile) {
// // 		router.replace("/(app)/(auth)/sign-in"); // Redirect to sign-in if no user or profile
// // 		return null; // or a loading spinner
// // 	}

// // 	return (
// // 		<GestureHandlerRootView
// // 			style={{ flex: 1, backgroundColor: colors[colorScheme]?.muted }}
// // 		>
// // 			<ScrollView contentContainerStyle={styles.scrollContainer}>
// // 				{/* Header */}
// // 				<View
// // 					style={{
// // 						flex: 1,
// // 						backgroundColor: colors[colorScheme]?.muted,
// // 					}}
// // 				>
// // 					<TouchableOpacity onPress={() => router.back()}>
// // 						<Ionicons name="arrow-back" size={24} color="white" />
// // 					</TouchableOpacity>
// // 					<Text style={styles.headerTitle}>Settings</Text>
// // 					<View style={{ width: 24 }} />
// // 				</View>

// // 				{/* Sections */}
// // 				{sectionOrder.map((section, index) => (
// // 					<PanGestureHandler
// // 						key={section.title}
// // 						onGestureEvent={gestureHandler}
// // 						onHandlerStateChange={({ nativeEvent }) => {
// // 							if (nativeEvent.state === 2) {
// // 								setDraggingIndex(index);
// // 							}
// // 						}}
// // 					>
// // 						<Animated.View
// // 							style={[
// // 								styles.sectionContainer,
// // 								draggingIndex === index && styles.dragging,
// // 							]}
// // 						>
// // 							<TouchableOpacity
// // 								onPress={() => handleSectionToggle(section.title)}
// // 								style={styles.sectionButton}
// // 							>
// // 								<Text style={styles.sectionTitle}>{section.title}</Text>
// // 							</TouchableOpacity>

// // 							{/* Glass Card */}
// // 							{openSection === section.title && (
// // 								<Animated.View style={[styles.centeredCard, cardAnimatedStyle]}>
// // 									<BlurView
// // 										intensity={100}
// // 										tint="light"
// // 										style={styles.glassCard}
// // 									>
// // 										<Text style={styles.cardTitle}>{section.title}</Text>

// // 										{/* If Account section show user info */}
// // 										{section.title === "Account" && (
// // 											<View style={styles.userInfoContainer}>
// // 												<Text style={styles.userInfoText}>
// // 													Username: {profile.username}
// // 												</Text>
// // 												<Text style={styles.userInfoText}>
// // 													Email: {profile.email}
// // 												</Text>
// // 												<View style={{ height: 12 }} />
// // 											</View>
// // 										)}

// // 										{section.items.map((item, idx) => (
// // 											<TouchableOpacity key={idx} style={styles.cardItem}>
// // 												<Text style={styles.cardItemText}>{item}</Text>
// // 											</TouchableOpacity>
// // 										))}
// // 									</BlurView>
// // 								</Animated.View>
// // 							)}
// // 						</Animated.View>
// // 					</PanGestureHandler>
// // 				))}

// // 				{/* Logout */}
// // 				{logoutVisible && (
// // 					<Animated.View style={[styles.logoutContainer, logoutAnimatedStyle]}>
// // 						<TouchableOpacity
// // 							style={styles.logoutButton}
// // 							onPress={handleLogout}
// // 						>
// // 							<Text style={styles.logoutText}>Log Out</Text>
// // 						</TouchableOpacity>
// // 					</Animated.View>
// // 				)}
// // 			</ScrollView>
// // 		</GestureHandlerRootView>
// // 	);
// // }

// // const styles = StyleSheet.create({
// // 	scrollContainer: {
// // 		paddingHorizontal: 16,
// // 		paddingTop: 32,
// // 		paddingBottom: 120,
// // 	},
// // 	header: {
// // 		flexDirection: "row",
// // 		justifyContent: "space-between",
// // 		alignItems: "center",
// // 		marginBottom: 24,
// // 	},
// // 	headerTitle: {
// // 		fontSize: 20,
// // 		fontWeight: "600",
// // 		color: "white",
// // 	},
// // 	sectionContainer: {
// // 		marginBottom: 16,
// // 	},
// // 	sectionButton: {
// // 		backgroundColor: "#2c2c2c",
// // 		padding: 16,
// // 		borderRadius: 16,
// // 	},
// // 	sectionTitle: {
// // 		color: "white",
// // 		fontSize: 16,
// // 		fontWeight: "500",
// // 	},
// // 	centeredCard: {
// // 		alignItems: "center",
// // 		justifyContent: "center",
// // 		marginTop: 12,
// // 	},
// // 	glassCard: {
// // 		backgroundColor: "rgba(255,255,255,0.15)",
// // 		borderRadius: 20,
// // 		padding: 20,
// // 		width: width * 0.9,
// // 	},
// // 	cardTitle: {
// // 		fontSize: 20,
// // 		fontWeight: "600",
// // 		textAlign: "center",
// // 		marginBottom: 16,
// // 		color: "black",
// // 	},
// // 	cardItem: {
// // 		padding: 12,
// // 		backgroundColor: "rgba(255,255,255,0.2)",
// // 		borderRadius: 12,
// // 		marginBottom: 8,
// // 	},
// // 	cardItemText: {
// // 		fontSize: 14,
// // 		color: "black",
// // 	},
// // 	logoutContainer: {
// // 		marginTop: 32,
// // 		width: "100%",
// // 	},
// // 	logoutButton: {
// // 		backgroundColor: "#EF4444",
// // 		padding: 16,
// // 		borderRadius: 16,
// // 	},
// // 	logoutText: {
// // 		textAlign: "center",
// // 		color: "white",
// // 		fontWeight: "600",
// // 	},
// // 	dragging: {
// // 		opacity: 0.7,
// // 		transform: [{ scale: 1.05 }],
// // 		shadowColor: "#000",
// // 		shadowOffset: { width: 0, height: 2 },
// // 		shadowOpacity: 0.8,
// // 		shadowRadius: 8,
// // 		elevation: 5,
// // 	},
// // 	userInfoContainer: {
// // 		marginBottom: 16,
// // 	},
// // 	userInfoText: {
// // 		color: "black",
// // 		fontSize: 14,
// // 		marginBottom: 4,
// // 	},
// // });

// import React, { useState, useEffect } from "react";
// import {
// 	View,
// 	Text,
// 	TouchableOpacity,
// 	ScrollView,
// 	StyleSheet,
// 	Dimensions,
// 	Vibration,
// 	Alert,
// 	Switch,
// } from "react-native";
// import { Ionicons } from "@expo/vector-icons";
// import { BlurView } from "expo-blur";
// import { useRouter } from "expo-router";
// import Animated, {
// 	useSharedValue,
// 	useAnimatedStyle,
// 	withSpring,
// 	withTiming,
// 	useAnimatedGestureHandler,
// 	runOnJS,
// } from "react-native-reanimated";
// import {
// 	GestureHandlerRootView,
// 	PanGestureHandler,
// } from "react-native-gesture-handler";
// import { useAuth, useSupabase } from "@/context/supabase-provider";
// import { useFont } from "@/context/font-context";
// import { useTheme } from "@/context/theme-context";
// import { fonts } from "@/constants/fonts";
// import { colors } from "@/constants/colors";

// const { width, height } = Dimensions.get("window");

// const sections = [
// 	{
// 		title: "Account",
// 		items: ["Edit Profile", "Change Password", "Change Email"],
// 	},
// 	{
// 		title: "Preferences",
// 		items: ["Notifications", "Themes", "Fonts"],
// 	},
// 	{
// 		title: "Security",
// 		items: [
// 			"Authentication",
// 			"Biometric Login",
// 			"Two-Factor Authentication",
// 			"Device Management",
// 			"Change PIN",
// 		],
// 	},
// 	{
// 		title: "Billing",
// 		items: ["Manage Subscriptions", "Payment Methods", "Invoices"],
// 	},
// 	{
// 		title: "Privacy",
// 		items: ["Data Sharing", "Location Services", "Ad Preferences"],
// 	},
// ];

// const availableThemes = ["light", "dark", "system", "blue", "green", "purple"];

// export default function Settings() {
// 	const { deleteOwnAccount } = useSupabase();

// 	const { colorScheme, setCustomColorScheme } = useTheme();
// 	const { selectedFont, setSelectedFont } = useFont();
// 	const fontOptions = Object.keys(fonts);

// 	const [fontModalVisible, setFontModalVisible] = useState(false);
// 	const [themeModalVisible, setThemeModalVisible] = useState(false);
// 	const [deleteModalVisible, setDeleteModalVisible] = useState(false);
// 	const [notificationsEnabled, setNotificationsEnabled] = useState(true);

// 	const router = useRouter();
// 	const { user, profile, signOut } = useAuth();

// 	const [openSection, setOpenSection] = useState(null);
// 	const [logoutVisible, setLogoutVisible] = useState(false);
// 	const [sectionOrder, setSectionOrder] = useState(sections);
// 	const [draggingIndex, setDraggingIndex] = useState(null);

// 	// Ensure sectionOrder is reset to sections on mount
// 	useEffect(() => {
// 		setSectionOrder(sections);
// 	}, []);

// 	// Animation values
// 	const slideAnim = useSharedValue(width);
// 	const cardScale = useSharedValue(0.8);
// 	const cardOpacity = useSharedValue(0);
// 	const cardY = useSharedValue(100);

// 	// Modal values
// 	const fontModalOpacity = useSharedValue(0);
// 	const fontModalScale = useSharedValue(0.8);
// 	const themeModalOpacity = useSharedValue(0);
// 	const themeModalScale = useSharedValue(0.8);

// 	// Show logout after 5 seconds
// 	useEffect(() => {
// 		if (user && profile) {
// 			const timer = setTimeout(() => {
// 				setLogoutVisible(true);
// 				slideAnim.value = withTiming(0, { duration: 500 });
// 			}, 5000);

// 			return () => clearTimeout(timer);
// 		}
// 	}, [user, profile]);

// 	const handleSectionToggle = (sectionTitle) => {
// 		if (openSection === sectionTitle) {
// 			cardScale.value = withTiming(0.8, { duration: 300 });
// 			cardOpacity.value = withTiming(0, { duration: 300 });
// 			cardY.value = withTiming(100, { duration: 300 }, () => {
// 				runOnJS(setOpenSection)(null);
// 			});
// 		} else {
// 			setOpenSection(sectionTitle);
// 			cardScale.value = withSpring(1);
// 			cardOpacity.value = withTiming(1, { duration: 300 });
// 			cardY.value = withTiming(0, { duration: 300 });
// 		}
// 	};

// 	const gestureHandler = useAnimatedGestureHandler({
// 		onStart: (_, ctx) => {
// 			ctx.startY = 0;
// 		},
// 		onActive: (event, ctx) => {
// 			ctx.startY = event.translationY;
// 		},
// 		onEnd: (event, ctx) => {
// 			runOnJS(Vibration.vibrate)(50);
// 			const draggedDistance = event.absoluteY;
// 			const fromIndex = draggingIndex;
// 			const toIndex = Math.min(
// 				Math.max(Math.round(draggedDistance / 80), 0),
// 				sectionOrder.length - 1,
// 			);

// 			if (fromIndex !== null && toIndex !== fromIndex) {
// 				runOnJS(reorderSections)(fromIndex, toIndex);
// 			}

// 			runOnJS(setDraggingIndex)(null);
// 		},
// 	});

// 	const reorderSections = (from, to) => {
// 		const updatedOrder = [...sectionOrder];
// 		const [movedItem] = updatedOrder.splice(from, 1);
// 		updatedOrder.splice(to, 0, movedItem);
// 		setSectionOrder(updatedOrder);
// 	};

// 	const cardAnimatedStyle = useAnimatedStyle(() => ({
// 		transform: [{ scale: cardScale.value }, { translateY: cardY.value }],
// 		opacity: cardOpacity.value,
// 	}));

// 	const logoutAnimatedStyle = useAnimatedStyle(() => ({
// 		transform: [{ translateX: slideAnim.value }],
// 	}));

// 	const fontModalAnimatedStyle = useAnimatedStyle(() => ({
// 		opacity: fontModalOpacity.value,
// 		transform: [{ scale: fontModalScale.value }],
// 	}));

// 	const themeModalAnimatedStyle = useAnimatedStyle(() => ({
// 		opacity: themeModalOpacity.value,
// 		transform: [{ scale: themeModalScale.value }],
// 	}));

// 	const showFontModal = () => {
// 		setFontModalVisible(true);
// 		fontModalOpacity.value = withTiming(1, { duration: 300 });
// 		fontModalScale.value = withSpring(1);
// 	};

// 	const hideFontModal = () => {
// 		fontModalOpacity.value = withTiming(0, { duration: 300 });
// 		fontModalScale.value = withTiming(0.8, { duration: 300 }, () => {
// 			runOnJS(setFontModalVisible)(false);
// 		});
// 	};

// 	const showThemeModal = () => {
// 		setThemeModalVisible(true);
// 		themeModalOpacity.value = withTiming(1, { duration: 300 });
// 		themeModalScale.value = withSpring(1);
// 	};

// 	const hideThemeModal = () => {
// 		themeModalOpacity.value = withTiming(0, { duration: 300 });
// 		themeModalScale.value = withTiming(0.8, { duration: 300 }, () => {
// 			runOnJS(setThemeModalVisible)(false);
// 		});
// 	};

// 	const handleFontSelect = (fontKey) => {
// 		setSelectedFont(fonts[fontKey]);
// 		Alert.alert("Font Selected", `${fontKey} has been set as your font.`);
// 		hideFontModal();
// 	};

// 	const handleThemeSelect = (theme) => {
// 		setCustomColorScheme(theme);
// 		Alert.alert(
// 			"Theme Selected",
// 			`${theme.charAt(0).toUpperCase() + theme.slice(1)} has been set as your theme.`,
// 		);
// 		hideThemeModal();
// 	};

// 	const toggleNotifications = () => {
// 		setNotificationsEnabled((previous) => !previous);
// 		Alert.alert(
// 			"Notifications",
// 			`Notifications have been ${!notificationsEnabled ? "enabled" : "disabled"}.`,
// 		);
// 	};

// 	const handleItemPress = (section, item) => {
// 		if (item === "Fonts") {
// 			showFontModal();
// 		} else if (item === "Themes") {
// 			showThemeModal();
// 		} else if (item === "Notifications") {
// 			toggleNotifications();
// 		} else {
// 			Alert.alert("Feature", `${item} feature will be implemented soon.`);
// 		}
// 	};

// 	const confirmDeleteAccount = async () => {
// 		try {
// 			await deleteOwnAccount();
// 			setDeleteModalVisible(false);
// 		} catch (error) {
// 			Alert.alert("Error", "Failed to delete your account.");
// 		}
// 	};

// 	const handleLogout = () => {
// 		Alert.alert("Logout", "Are you sure you want to logout?", [
// 			{
// 				text: "Cancel",
// 				style: "cancel",
// 			},
// 			{
// 				text: "Logout",
// 				style: "destructive",
// 				onPress: async () => {
// 					await signOut();
// 					router.replace("/(app)/welcome");
// 				},
// 			},
// 		]);
// 	};

// 	if (!user || !profile) {
// 		router.replace("/(app)/(auth)/sign-in"); // Redirect to sign-in if no user or profile
// 		return null; // or a loading spinner
// 	}

// 	const getBackgroundColor = () => {
// 		return colors[colorScheme]?.muted || "#121212";
// 	};

// 	const getTextColor = () => {
// 		return colors[colorScheme]?.text || "white";
// 	};

// 	const getCardBackgroundColor = () => {
// 		return colors[colorScheme]?.card || "rgba(255,255,255,0.15)";
// 	};

// 	const getFontFamily = () => {
// 		return selectedFont?.fontFamily || "System";
// 	};

// 	return (
// 		<GestureHandlerRootView
// 			style={{ flex: 1, backgroundColor: getBackgroundColor() }}
// 		>
// 			<ScrollView
// 				contentContainerStyle={[
// 					styles.scrollContainer,
// 					{ backgroundColor: getBackgroundColor() },
// 				]}
// 			>
// 				{/* Header */}
// 				<View
// 					style={[styles.header, { backgroundColor: getBackgroundColor() }]}
// 				>
// 					<TouchableOpacity onPress={() => router.back()}>
// 						<Ionicons name="arrow-back" size={24} color={getTextColor()} />
// 					</TouchableOpacity>
// 					<Text
// 						style={[
// 							styles.headerTitle,
// 							{ color: getTextColor(), fontFamily: getFontFamily() },
// 						]}
// 					>
// 						Settings
// 					</Text>
// 					<View style={{ width: 24 }} />
// 				</View>

// 				{/* Sections */}
// 				{sectionOrder.map((section, index) => (
// 					<PanGestureHandler
// 						key={section.title}
// 						onGestureEvent={gestureHandler}
// 						onHandlerStateChange={({ nativeEvent }) => {
// 							if (nativeEvent.state === 2) {
// 								setDraggingIndex(index);
// 							}
// 						}}
// 					>
// 						<Animated.View
// 							style={[
// 								styles.sectionContainer,
// 								draggingIndex === index && styles.dragging,
// 							]}
// 						>
// 							<TouchableOpacity
// 								onPress={() => handleSectionToggle(section.title)}
// 								style={[
// 									styles.sectionButton,
// 									{ backgroundColor: colors[colorScheme]?.card || "#2c2c2c" },
// 								]}
// 							>
// 								<Text
// 									style={[
// 										styles.sectionTitle,
// 										{ color: getTextColor(), fontFamily: getFontFamily() },
// 									]}
// 								>
// 									{section.title}
// 								</Text>
// 							</TouchableOpacity>

// 							{/* Glass Card */}
// 							{openSection === section.title && (
// 								<Animated.View style={[styles.centeredCard, cardAnimatedStyle]}>
// 									<BlurView
// 										intensity={100}
// 										tint={colorScheme === "dark" ? "dark" : "light"}
// 										style={[
// 											styles.glassCard,
// 											{ backgroundColor: getCardBackgroundColor() },
// 										]}
// 									>
// 										<Text
// 											style={[
// 												styles.cardTitle,
// 												{ color: getTextColor(), fontFamily: getFontFamily() },
// 											]}
// 										>
// 											{section.title}
// 										</Text>

// 										{/* If Account section show user info */}
// 										{section.title === "Account" && (
// 											<View style={styles.userInfoContainer}>
// 												<Text
// 													style={[
// 														styles.userInfoText,
// 														{
// 															color: getTextColor(),
// 															fontFamily: getFontFamily(),
// 														},
// 													]}
// 												>
// 													Username: {profile.username}
// 												</Text>
// 												<Text
// 													style={[
// 														styles.userInfoText,
// 														{
// 															color: getTextColor(),
// 															fontFamily: getFontFamily(),
// 														},
// 													]}
// 												>
// 													Email: {profile.email}
// 												</Text>
// 												<View style={{ height: 12 }} />
// 											</View>
// 										)}

// 										{section.items.map((item, idx) => (
// 											<TouchableOpacity
// 												key={idx}
// 												style={[
// 													styles.cardItem,
// 													{ backgroundColor: `${getCardBackgroundColor()}99` },
// 												]}
// 												onPress={() => handleItemPress(section.title, item)}
// 											>
// 												<Text
// 													style={[
// 														styles.cardItemText,
// 														{
// 															color: getTextColor(),
// 															fontFamily: getFontFamily(),
// 														},
// 													]}
// 												>
// 													{item}
// 												</Text>

// 												{/* Special handling for Notifications item */}
// 												{item === "Notifications" && (
// 													<Switch
// 														value={notificationsEnabled}
// 														onValueChange={toggleNotifications}
// 														trackColor={{
// 															false: "#767577",
// 															true: colors[colorScheme]?.primary || "#4299e1",
// 														}}
// 														thumbColor={
// 															notificationsEnabled ? "#f5f5f5" : "#f4f3f4"
// 														}
// 													/>
// 												)}
// 											</TouchableOpacity>
// 										))}
// 									</BlurView>
// 								</Animated.View>
// 							)}
// 						</Animated.View>
// 					</PanGestureHandler>
// 				))}

// 				{/* Logout */}
// 				{logoutVisible && (
// 					<Animated.View style={[styles.logoutContainer, logoutAnimatedStyle]}>
// 						<TouchableOpacity
// 							style={styles.logoutButton}
// 							onPress={handleLogout}
// 						>
// 							<Text
// 								style={[styles.logoutText, { fontFamily: getFontFamily() }]}
// 							>
// 								Log Out
// 							</Text>
// 						</TouchableOpacity>
// 					</Animated.View>
// 				)}
// 			</ScrollView>

// 			{/* Font Selection Modal */}
// 			{fontModalVisible && (
// 				<Animated.View style={[styles.modalOverlay]}>
// 					<Animated.View
// 						style={[styles.modalContainer, fontModalAnimatedStyle]}
// 					>
// 						<BlurView
// 							intensity={100}
// 							tint={colorScheme === "dark" ? "dark" : "light"}
// 							style={styles.modalBlur}
// 						>
// 							<Text
// 								style={[
// 									styles.modalTitle,
// 									{ color: getTextColor(), fontFamily: getFontFamily() },
// 								]}
// 							>
// 								Select Font
// 							</Text>
// 							<ScrollView style={styles.modalScroll}>
// 								{fontOptions.map((fontKey) => (
// 									<TouchableOpacity
// 										key={fontKey}
// 										style={[
// 											styles.fontOption,
// 											selectedFont === fonts[fontKey] && styles.selectedOption,
// 											{
// 												backgroundColor:
// 													selectedFont === fonts[fontKey]
// 														? colors[colorScheme]?.primary || "#4299e1"
// 														: `${getCardBackgroundColor()}99`,
// 											},
// 										]}
// 										onPress={() => handleFontSelect(fontKey)}
// 									>
// 										<Text
// 											style={[
// 												styles.fontOptionText,
// 												{
// 													fontFamily: fonts[fontKey].fontFamily,
// 													color:
// 														selectedFont === fonts[fontKey]
// 															? "#fff"
// 															: getTextColor(),
// 												},
// 											]}
// 										>
// 											{fontKey}
// 										</Text>
// 									</TouchableOpacity>
// 								))}
// 							</ScrollView>
// 							<TouchableOpacity
// 								style={[
// 									styles.modalCloseButton,
// 									{ backgroundColor: colors[colorScheme]?.muted || "#2c2c2c" },
// 								]}
// 								onPress={hideFontModal}
// 							>
// 								<Text
// 									style={[
// 										styles.modalCloseText,
// 										{ color: "#fff", fontFamily: getFontFamily() },
// 									]}
// 								>
// 									Close
// 								</Text>
// 							</TouchableOpacity>
// 						</BlurView>
// 					</Animated.View>
// 				</Animated.View>
// 			)}

// 			{/* Theme Selection Modal */}
// 			{themeModalVisible && (
// 				<Animated.View style={[styles.modalOverlay]}>
// 					<Animated.View
// 						style={[styles.modalContainer, themeModalAnimatedStyle]}
// 					>
// 						<BlurView
// 							intensity={100}
// 							tint={colorScheme === "dark" ? "dark" : "light"}
// 							style={styles.modalBlur}
// 						>
// 							<Text
// 								style={[
// 									styles.modalTitle,
// 									{ color: getTextColor(), fontFamily: getFontFamily() },
// 								]}
// 							>
// 								Select Theme
// 							</Text>
// 							<ScrollView style={styles.modalScroll}>
// 								{availableThemes.map((theme) => (
// 									<TouchableOpacity
// 										key={theme}
// 										style={[
// 											styles.themeOption,
// 											colorScheme === theme && styles.selectedOption,
// 											{
// 												backgroundColor:
// 													colorScheme === theme
// 														? colors[theme]?.primary || "#4299e1"
// 														: `${colors[theme]?.card || "#2c2c2c"}90`,
// 											},
// 										]}
// 										onPress={() => handleThemeSelect(theme)}
// 									>
// 										<View
// 											style={[
// 												styles.themeColorIndicator,
// 												{
// 													backgroundColor: colors[theme]?.primary || "#4299e1",
// 												},
// 											]}
// 										/>
// 										<Text
// 											style={[
// 												styles.themeOptionText,
// 												{
// 													fontFamily: getFontFamily(),
// 													color:
// 														colorScheme === theme
// 															? "#fff"
// 															: colors[theme]?.text || "#fff",
// 												},
// 											]}
// 										>
// 											{theme.charAt(0).toUpperCase() + theme.slice(1)}
// 										</Text>
// 									</TouchableOpacity>
// 								))}
// 							</ScrollView>
// 							<TouchableOpacity
// 								style={[
// 									styles.modalCloseButton,
// 									{ backgroundColor: colors[colorScheme]?.muted || "#2c2c2c" },
// 								]}
// 								onPress={hideThemeModal}
// 							>
// 								<Text
// 									style={[
// 										styles.modalCloseText,
// 										{ color: "#fff", fontFamily: getFontFamily() },
// 									]}
// 								>
// 									Close
// 								</Text>
// 							</TouchableOpacity>
// 						</BlurView>
// 					</Animated.View>
// 				</Animated.View>
// 			)}
// 		</GestureHandlerRootView>
// 	);
// }

// const styles = StyleSheet.create({
// 	scrollContainer: {
// 		paddingHorizontal: 16,
// 		paddingTop: 32,
// 		paddingBottom: 120,
// 	},
// 	header: {
// 		flexDirection: "row",
// 		justifyContent: "space-between",
// 		alignItems: "center",
// 		marginBottom: 24,
// 	},
// 	headerTitle: {
// 		fontSize: 20,
// 		fontWeight: "600",
// 	},
// 	sectionContainer: {
// 		marginBottom: 16,
// 	},
// 	sectionButton: {
// 		padding: 16,
// 		borderRadius: 16,
// 	},
// 	sectionTitle: {
// 		fontSize: 16,
// 		fontWeight: "500",
// 	},
// 	centeredCard: {
// 		alignItems: "center",
// 		justifyContent: "center",
// 		marginTop: 12,
// 	},
// 	glassCard: {
// 		borderRadius: 20,
// 		padding: 20,
// 		width: width * 0.9,
// 	},
// 	cardTitle: {
// 		fontSize: 20,
// 		fontWeight: "600",
// 		textAlign: "center",
// 		marginBottom: 16,
// 	},
// 	cardItem: {
// 		padding: 12,
// 		borderRadius: 12,
// 		marginBottom: 8,
// 		flexDirection: "row",
// 		justifyContent: "space-between",
// 		alignItems: "center",
// 	},
// 	cardItemText: {
// 		fontSize: 14,
// 	},
// 	logoutContainer: {
// 		marginTop: 32,
// 		width: "100%",
// 	},
// 	logoutButton: {
// 		backgroundColor: "#EF4444",
// 		padding: 16,
// 		borderRadius: 16,
// 	},
// 	logoutText: {
// 		textAlign: "center",
// 		color: "white",
// 		fontWeight: "600",
// 	},
// 	dragging: {
// 		opacity: 0.7,
// 		transform: [{ scale: 1.05 }],
// 		shadowColor: "#000",
// 		shadowOffset: { width: 0, height: 2 },
// 		shadowOpacity: 0.8,
// 		shadowRadius: 8,
// 		elevation: 5,
// 	},
// 	userInfoContainer: {
// 		marginBottom: 16,
// 	},
// 	userInfoText: {
// 		fontSize: 14,
// 		marginBottom: 4,
// 	},
// 	modalOverlay: {
// 		position: "absolute",
// 		top: 0,
// 		left: 0,
// 		right: 0,
// 		bottom: 0,
// 		backgroundColor: "rgba(0,0,0,0.6)",
// 		justifyContent: "center",
// 		alignItems: "center",
// 		zIndex: 1000,
// 	},
// 	modalContainer: {
// 		width: width * 0.85,
// 		maxHeight: height * 0.7,
// 		borderRadius: 24,
// 		overflow: "hidden",
// 	},
// 	modalBlur: {
// 		padding: 20,
// 		borderRadius: 24,
// 	},
// 	modalTitle: {
// 		fontSize: 20,
// 		fontWeight: "600",
// 		textAlign: "center",
// 		marginBottom: 16,
// 	},
// 	modalScroll: {
// 		maxHeight: height * 0.5,
// 	},
// 	fontOption: {
// 		padding: 16,
// 		borderRadius: 12,
// 		marginBottom: 8,
// 	},
// 	fontOptionText: {
// 		fontSize: 16,
// 		textAlign: "center",
// 	},
// 	themeOption: {
// 		padding: 16,
// 		borderRadius: 12,
// 		marginBottom: 8,
// 		flexDirection: "row",
// 		alignItems: "center",
// 	},
// 	themeColorIndicator: {
// 		width: 20,
// 		height: 20,
// 		borderRadius: 10,
// 		marginRight: 12,
// 	},
// 	themeOptionText: {
// 		fontSize: 16,
// 	},
// 	selectedOption: {
// 		borderWidth: 2,
// 		borderColor: "white",
// 	},
// 	modalCloseButton: {
// 		padding: 14,
// 		borderRadius: 12,
// 		marginTop: 16,
// 	},
// 	modalCloseText: {
// 		fontSize: 16,
// 		fontWeight: "600",
// 		textAlign: "center",
// 	},
// });

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
	Switch,
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
import { useAuth, useSupabase } from "@/context/supabase-provider";
import { useFont } from "@/context/font-context";
import { useTheme } from "@/context/theme-context";
import { fonts } from "@/constants/fonts";
import { colors } from "@/constants/colors";

const { width, height } = Dimensions.get("window");

const sections = [
	{
		title: "Account",
		items: ["Edit Profile", "Change Password", "Change Email"],
	},
	{
		title: "Preferences",
		items: ["Notifications", "Sound", "Themes", "Fonts"],
	},
	{
		title: "Security",
		items: [
			"Authentication",
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

// Use only available themes from colors object
const availableThemes = ["light", "dark"];

export default function Settings() {
	const { deleteOwnAccount } = useSupabase();

	const { colorScheme, setCustomColorScheme } = useTheme();
	const { selectedFont, setSelectedFont } = useFont();
	// Use project fonts from fonts.ts
	const fontOptions = Object.keys(fonts);

	const [fontModalVisible, setFontModalVisible] = useState(false);
	const [themeModalVisible, setThemeModalVisible] = useState(false);
	const [deleteModalVisible, setDeleteModalVisible] = useState(false);
	const [notificationsEnabled, setNotificationsEnabled] = useState(true);

	const router = useRouter();
	const { user, profile, signOut } = useAuth();

	const [openSection, setOpenSection] = useState(null);
	const [logoutVisible, setLogoutVisible] = useState(false);
	const [sectionOrder, setSectionOrder] = useState(sections);
	const [draggingIndex, setDraggingIndex] = useState(null);

	// Ensure sectionOrder is reset to sections on mount
	useEffect(() => {
		setSectionOrder(sections);
	}, []);

	// Animation values
	const slideAnim = useSharedValue(width);
	const cardScale = useSharedValue(0.8);
	const cardOpacity = useSharedValue(0);
	const cardY = useSharedValue(100);

	// Modal values
	const fontModalOpacity = useSharedValue(0);
	const fontModalScale = useSharedValue(0.8);
	const themeModalOpacity = useSharedValue(0);
	const themeModalScale = useSharedValue(0.8);

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

	const handleSectionToggle = (sectionTitle) => {
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
		onStart: (_, ctx) => {
			ctx.startY = 0;
		},
		onActive: (event, ctx) => {
			ctx.startY = event.translationY;
		},
		onEnd: (event, ctx) => {
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

	const reorderSections = (from, to) => {
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

	const fontModalAnimatedStyle = useAnimatedStyle(() => ({
		opacity: fontModalOpacity.value,
		transform: [{ scale: fontModalScale.value }],
	}));

	const themeModalAnimatedStyle = useAnimatedStyle(() => ({
		opacity: themeModalOpacity.value,
		transform: [{ scale: themeModalScale.value }],
	}));

	const showFontModal = () => {
		setFontModalVisible(true);
		fontModalOpacity.value = withTiming(1, { duration: 300 });
		fontModalScale.value = withSpring(1);
	};

	const hideFontModal = () => {
		fontModalOpacity.value = withTiming(0, { duration: 300 });
		fontModalScale.value = withTiming(0.8, { duration: 300 }, () => {
			runOnJS(setFontModalVisible)(false);
		});
	};

	const showThemeModal = () => {
		setThemeModalVisible(true);
		themeModalOpacity.value = withTiming(1, { duration: 300 });
		themeModalScale.value = withSpring(1);
	};

	const hideThemeModal = () => {
		themeModalOpacity.value = withTiming(0, { duration: 300 });
		themeModalScale.value = withTiming(0.8, { duration: 300 }, () => {
			runOnJS(setThemeModalVisible)(false);
		});
	};

	const handleFontSelect = (fontKey) => {
		setSelectedFont(fonts[fontKey]);
		Alert.alert("Font Selected", `${fontKey} has been set as your font.`);
		hideFontModal();
	};

	const handleThemeSelect = (theme) => {
		setCustomColorScheme(theme);
		Alert.alert(
			"Theme Selected",
			`${theme.charAt(0).toUpperCase() + theme.slice(1)} has been set as your theme.`,
		);
		hideThemeModal();
	};

	const toggleNotifications = () => {
		setNotificationsEnabled((previous) => !previous);
		Alert.alert(
			"Notifications",
			`Notifications have been ${!notificationsEnabled ? "enabled" : "disabled"}.`,
		);
	};

	const handleItemPress = (section, item) => {
		if (item === "Fonts") {
			showFontModal();
		} else if (item === "Themes") {
			showThemeModal();
		} else if (item === "Notifications") {
			toggleNotifications();
		} else {
			Alert.alert("Feature", `${item} feature will be implemented soon.`);
		}
	};

	const confirmDeleteAccount = async () => {
		try {
			await deleteOwnAccount();
			setDeleteModalVisible(false);
		} catch (error) {
			Alert.alert("Error", "Failed to delete your account.");
		}
	};

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

	const getBackgroundColor = () => {
		return colors[colorScheme]?.background || "#121212";
	};

	const getTextColor = () => {
		return colors[colorScheme]?.foreground || "white";
	};

	const getCardBackgroundColor = () => {
		return colors[colorScheme]?.card || "rgba(255,255,255,0.15)";
	};

	const getMutedColor = () => {
		return colors[colorScheme]?.muted || "#2c2c2c";
	};

	const getPrimaryColor = () => {
		return colors[colorScheme]?.primary || "#4299e1";
	};

	const getFontFamily = () => {
		return selectedFont || fonts.default;
	};

	return (
		<GestureHandlerRootView
			style={{ flex: 1, backgroundColor: getBackgroundColor() }}
		>
			<ScrollView
				contentContainerStyle={[
					styles.scrollContainer,
					{ backgroundColor: getBackgroundColor() },
				]}
			>
				{/* Header */}
				<View
					style={[styles.header, { backgroundColor: getBackgroundColor() }]}
				>
					<TouchableOpacity onPress={() => router.back()}>
						<Ionicons name="arrow-back" size={24} color={getTextColor()} />
					</TouchableOpacity>
					<Text
						style={[
							styles.headerTitle,
							{ color: getTextColor(), fontFamily: getFontFamily() },
						]}
					>
						Settings
					</Text>
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
								style={[
									styles.sectionButton,
									{ backgroundColor: colors[colorScheme]?.card || "#2c2c2c" },
								]}
							>
								<Text
									style={[
										styles.sectionTitle,
										{ color: getTextColor(), fontFamily: getFontFamily() },
									]}
								>
									{section.title}
								</Text>
							</TouchableOpacity>

							{/* Glass Card */}
							{openSection === section.title && (
								<Animated.View style={[styles.centeredCard, cardAnimatedStyle]}>
									<BlurView
										intensity={100}
										tint={colorScheme === "dark" ? "dark" : "light"}
										style={[
											styles.glassCard,
											{ backgroundColor: getCardBackgroundColor() },
										]}
									>
										<Text
											style={[
												styles.cardTitle,
												{ color: getTextColor(), fontFamily: getFontFamily() },
											]}
										>
											{section.title}
										</Text>

										{/* If Account section show user info */}
										{section.title === "Account" && (
											<View style={styles.userInfoContainer}>
												<Text
													style={[
														styles.userInfoText,
														{
															color: getTextColor(),
															fontFamily: getFontFamily(),
														},
													]}
												>
													Username: {profile.username}
												</Text>
												<Text
													style={[
														styles.userInfoText,
														{
															color: getTextColor(),
															fontFamily: getFontFamily(),
														},
													]}
												>
													Email: {profile.email}
												</Text>
												<View style={{ height: 12 }} />
											</View>
										)}

										{section.items.map((item, idx) => (
											<TouchableOpacity
												key={idx}
												style={[
													styles.cardItem,
													{ backgroundColor: `${getCardBackgroundColor()}99` },
												]}
												onPress={() => handleItemPress(section.title, item)}
											>
												<Text
													style={[
														styles.cardItemText,
														{
															color: getTextColor(),
															fontFamily: getFontFamily(),
														},
													]}
												>
													{item}
												</Text>

												{/* Special handling for Notifications item */}
												{item === "Notifications" && (
													<Switch
														value={notificationsEnabled}
														onValueChange={toggleNotifications}
														trackColor={{
															false: "#767577",
															true: colors[colorScheme]?.primary || "#4299e1",
														}}
														thumbColor={
															notificationsEnabled ? "#f5f5f5" : "#f4f3f4"
														}
													/>
												)}
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
							<Text
								style={[styles.logoutText, { fontFamily: getFontFamily() }]}
							>
								Log Out
							</Text>
						</TouchableOpacity>
					</Animated.View>
				)}
			</ScrollView>

			{/* Font Selection Modal */}
			{fontModalVisible && (
				<Animated.View style={[styles.modalOverlay]}>
					<Animated.View
						style={[styles.modalContainer, fontModalAnimatedStyle]}
					>
						<BlurView
							intensity={100}
							tint={colorScheme === "dark" ? "dark" : "light"}
							style={styles.modalBlur}
						>
							<Text
								style={[
									styles.modalTitle,
									{ color: getTextColor(), fontFamily: getFontFamily() },
								]}
							>
								Select Font
							</Text>
							<ScrollView style={styles.modalScroll}>
								{fontOptions.map((fontKey) => (
									<TouchableOpacity
										key={fontKey}
										style={[
											styles.fontOption,
											selectedFont === fonts[fontKey] && styles.selectedOption,
											{
												backgroundColor:
													selectedFont === fonts[fontKey]
														? colors[colorScheme]?.primary || "#4299e1"
														: `${getCardBackgroundColor()}99`,
											},
										]}
										onPress={() => handleFontSelect(fontKey)}
									>
										<Text
											style={[
												styles.fontOptionText,
												{
													fontFamily: fonts[fontKey].fontFamily,
													color:
														selectedFont === fonts[fontKey]
															? "#fff"
															: getTextColor(),
												},
											]}
										>
											{fontKey}
										</Text>
									</TouchableOpacity>
								))}
							</ScrollView>
							<TouchableOpacity
								style={[
									styles.modalCloseButton,
									{ backgroundColor: colors[colorScheme]?.muted || "#2c2c2c" },
								]}
								onPress={hideFontModal}
							>
								<Text
									style={[
										styles.modalCloseText,
										{ color: "#fff", fontFamily: getFontFamily() },
									]}
								>
									Close
								</Text>
							</TouchableOpacity>
						</BlurView>
					</Animated.View>
				</Animated.View>
			)}

			{/* Theme Selection Modal */}
			{themeModalVisible && (
				<Animated.View style={[styles.modalOverlay]}>
					<Animated.View
						style={[styles.modalContainer, themeModalAnimatedStyle]}
					>
						<BlurView
							intensity={100}
							tint={colorScheme === "dark" ? "dark" : "light"}
							style={styles.modalBlur}
						>
							<Text
								style={[
									styles.modalTitle,
									{ color: getTextColor(), fontFamily: getFontFamily() },
								]}
							>
								Select Theme
							</Text>
							<ScrollView style={styles.modalScroll}>
								{availableThemes.map((theme) => (
									<TouchableOpacity
										key={theme}
										style={[
											styles.themeOption,
											colorScheme === theme && styles.selectedOption,
											{
												backgroundColor:
													colorScheme === theme
														? colors[theme]?.primary || "#4299e1"
														: `${colors[theme]?.card || "#2c2c2c"}90`,
											},
										]}
										onPress={() => handleThemeSelect(theme)}
									>
										<View
											style={[
												styles.themeColorIndicator,
												{
													backgroundColor: colors[theme]?.primary || "#4299e1",
												},
											]}
										/>
										<Text
											style={[
												styles.themeOptionText,
												{
													fontFamily: getFontFamily(),
													color:
														colorScheme === theme
															? "#fff"
															: colors[theme]?.text || "#fff",
												},
											]}
										>
											{theme.charAt(0).toUpperCase() + theme.slice(1)}
										</Text>
									</TouchableOpacity>
								))}
							</ScrollView>
							<TouchableOpacity
								style={[
									styles.modalCloseButton,
									{ backgroundColor: colors[colorScheme]?.muted || "#2c2c2c" },
								]}
								onPress={hideThemeModal}
							>
								<Text
									style={[
										styles.modalCloseText,
										{ color: "#fff", fontFamily: getFontFamily() },
									]}
								>
									Close
								</Text>
							</TouchableOpacity>
						</BlurView>
					</Animated.View>
				</Animated.View>
			)}
		</GestureHandlerRootView>
	);
}

const styles = StyleSheet.create({
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
	},
	sectionContainer: {
		marginBottom: 16,
	},
	sectionButton: {
		padding: 16,
		borderRadius: 16,
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: "500",
	},
	centeredCard: {
		alignItems: "center",
		justifyContent: "center",
		marginTop: 12,
	},
	glassCard: {
		borderRadius: 20,
		padding: 20,
		width: width * 0.9,
	},
	cardTitle: {
		fontSize: 20,
		fontWeight: "600",
		textAlign: "center",
		marginBottom: 16,
	},
	cardItem: {
		padding: 12,
		borderRadius: 12,
		marginBottom: 8,
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	cardItemText: {
		fontSize: 14,
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
		fontSize: 14,
		marginBottom: 4,
	},
	modalOverlay: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: "rgba(0,0,0,0.6)",
		justifyContent: "center",
		alignItems: "center",
		zIndex: 1000,
	},
	modalContainer: {
		width: width * 0.85,
		maxHeight: height * 0.7,
		borderRadius: 24,
		overflow: "hidden",
	},
	modalBlur: {
		padding: 20,
		borderRadius: 24,
	},
	modalTitle: {
		fontSize: 20,
		fontWeight: "600",
		textAlign: "center",
		marginBottom: 16,
	},
	modalScroll: {
		maxHeight: height * 0.5,
	},
	fontOption: {
		padding: 16,
		borderRadius: 12,
		marginBottom: 8,
	},
	fontOptionText: {
		fontSize: 16,
		textAlign: "center",
	},
	themeOption: {
		padding: 16,
		borderRadius: 12,
		marginBottom: 8,
		flexDirection: "row",
		alignItems: "center",
	},
	themeColorIndicator: {
		width: 20,
		height: 20,
		borderRadius: 10,
		marginRight: 12,
	},
	themeOptionText: {
		fontSize: 16,
	},
	selectedOption: {
		borderWidth: 2,
		borderColor: "white",
	},
	modalCloseButton: {
		padding: 14,
		borderRadius: 12,
		marginTop: 16,
	},
	modalCloseText: {
		fontSize: 16,
		fontWeight: "600",
		textAlign: "center",
	},
});