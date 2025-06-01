import React, { useState, useEffect, useRef } from "react";
import {
	View,
	Text,
	Pressable,
	FlatList,
	StyleSheet,
	StatusBar,
	Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "@/context/supabase-provider";
import { supabase } from "@/config/supabase";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";

// Configure notification handler
Notifications.setNotificationHandler({
	handleNotification: async () => ({
		shouldShowAlert: true,
		shouldPlaySound: true,
		shouldSetBadge: true,
	}),
});

interface Notification {
	id: string;
	type: string;
	message: string;
	is_read: boolean;
	created_at: string;
	metadata: any;
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

const notificationGroups = {
	Purchases: ["deposit", "data_purchase", "airtime_purchase", "cable_purchase"],
	Promotions: ["hot_data", "special_data", "weekend_plan", "weekly_plan"],
	Updates: ["app_update"],
};

export default function NotificationsPage() {
	
	const { user } = useAuth();
	const [notifications, setNotifications] = useState<Notification[]>([]);
	const [preferredProvider, setPreferredProvider] = useState<string>("");
	const notificationListener = useRef<Notifications.Subscription>();
	const responseListener = useRef<Notifications.Subscription>();

	// Register for push notifications and store token
	const registerForPushNotificationsAsync = async () => {
		if (!Device.isDevice) {
			console.log("Must use physical device for push notifications");
			return;
		}

		const { status: existingStatus } =
			await Notifications.getPermissionsAsync();
		let finalStatus = existingStatus;

		if (existingStatus !== "granted") {
			const { status } = await Notifications.requestPermissionsAsync();
			finalStatus = status;
		}

		if (finalStatus !== "granted") {
			console.log("Failed to get push token for push notification!");
			return;
		}

		const token = (await Notifications.getExpoPushTokenAsync()).data;
		console.log("Push token:", token);

		if (user?.id) {
			const { error } = await supabase
				.from("user_push_tokens")
				.upsert(
					{
						user_id: user.id,
						push_token: token,
						updated_at: new Date().toISOString(),
					},
					{ onConflict: "user_id" },
				);
			if (error) {
				console.error("Error storing push token:", error);
			} else {
				console.log("Push token stored successfully");
			}
		}

		if (Platform.OS === "android") {
			Notifications.setNotificationChannelAsync("default", {
				name: "default",
				importance: Notifications.AndroidImportance.MAX,
				vibrationPattern: [0, 250, 250, 250],
				lightColor: "#FF231F7C",
			});
		}

		return token;
	};

	const fetchUserPreferences = async () => {
		if (!user?.id) return;
		try {
			const { data: dataPurchases, error: dataError } = await supabase
				.from("data_purchases")
				.select("provider")
				.eq("user_id", user.id);
			const { data: airtimePurchases, error: airtimeError } = await supabase
				.from("airtime_purchases")
				.select("provider")
				.eq("user_id", user.id);
			const { data: cablePurchases, error: cableError } = await supabase
				.from("cable_purchases")
				.select("provider")
				.eq("user_id", user.id);

			if (dataError || airtimeError || cableError) {
				console.error("Error fetching purchases:", {
					dataError,
					airtimeError,
					cableError,
				});
			}

			const allProviders = [
				...(dataPurchases?.map((p) => p.provider) || []),
				...(airtimePurchases?.map((p) => p.provider) || []),
				...(cablePurchases?.map((p) => p.provider) || []),
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
			console.error("Error fetching user preferences:", error);
			setPreferredProvider("MTN");
		}
	};

	const fetchNotifications = async () => {
		if (!user?.id) return;
		try {
			const { data, error } = await supabase
				.from("notifications")
				.select("id, type, message, is_read, created_at, metadata")
				.eq("user_id", user.id)
				.order("created_at", { ascending: false });
			if (error) throw error;
			setNotifications(data || []);
			console.log("Fetched notifications:", data?.length || 0);
		} catch (error) {
			console.error("Error fetching notifications:", error);
			setNotifications([]);
		}
	};

	const fetchPromotionalPlans = async () => {
		if (!preferredProvider) return;
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
			console.log("Promotional plans response:", data);
			if (data.status === "success" && Array.isArray(data.plans)) {
				const newNotifications = data.plans.map((plan: any) => ({
					id: `${plan.type}-${Date.now()}-${Math.random()}`,
					user_id: user.id,
					type: `${plan.type}_plan`,
					message: `New ${plan.type.replace("_", " ")} plan: ${preferredProvider} ${plan.data} – ₦${plan.amount}`,
					is_read: false,
					created_at: new Date().toISOString(),
					metadata: {
						plan_name: `${preferredProvider} ${plan.data} – ₦${plan.amount}`,
						amount: plan.amount,
					},
				}));

				const { error } = await supabase
					.from("notifications")
					.insert(newNotifications);
				if (error) throw error;
				fetchNotifications();
			}
		} catch (error) {
			console.error("Error fetching promotional plans:", error);
		}
	};

	const markAsRead = async (id: string) => {
		try {
			const { error } = await supabase
				.from("notifications")
				.update({ is_read: true })
				.eq("id", id);
			if (error) throw error;
			setNotifications((prev) =>
				prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
			);
		} catch (error) {
			console.error("Error marking notification as read:", error);
		}
	};

	const dismissNotification = async (id: string) => {
		try {
			const { error } = await supabase
				.from("notifications")
				.delete()
				.eq("id", id);
			if (error) throw error;
			setNotifications((prev) => prev.filter((n) => n.id !== id));
		} catch (error) {
			console.error("Error dismissing notification:", error);
		}
	};

	const handleNotificationPress = (notification: Notification) => {
		markAsRead(notification.id);
		if (notification.type.includes("plan")) {
			const plan = notification.metadata?.plan_name;
			if (plan) {
				const providerName = preferredProvider;
				const bundle: DataBundle = {
					id: Date.now(),
					data: plan.split(" – ")[0],
					price: parseInt(plan.match(/₦(\d+)/)?.[1] || "0"),
					validity: "30 days",
					category: "Data",
					description: "Data Bundle",
					variation_code: "data_" + plan.toLowerCase().replace(/\s/g, "_"),
					planType: "Data Plan",
				};
				const provider: Provider = {
					id: 1,
					name: providerName,
					image: "",
					code: providerName.toLowerCase(),
				};
				const params: ConfirmationParams = {
					bundle: JSON.stringify(bundle),
					provider: JSON.stringify(provider),
					phoneNumber: user?.user_metadata?.phone || "",
					userEmail: user?.email,
					transactionPin: user?.user_metadata?.transaction_pin,
					source: "notifications",
				};
				router.push({
					pathname: "../Confirmation",
					params: params as any,
				});
			}
		}
	};

	useEffect(() => {
		// Register for push notifications
		registerForPushNotificationsAsync();

		// Handle notifications received while app is in foreground
		notificationListener.current =
			Notifications.addNotificationReceivedListener((notification) => {
				console.log("Notification received:", notification);
				fetchNotifications();
			});

		// Handle user tapping on a notification
		responseListener.current =
			Notifications.addNotificationResponseReceivedListener((response) => {
				console.log("Notification tapped:", response);
				const data = response.notification.request.content.data;
				if (data.notificationId) {
					handleNotificationPress({ id: data.notificationId, ...data });
				}
			});

		fetchUserPreferences();
		fetchNotifications();

		const subscription = supabase
			.channel("notifications")
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "notifications",
					filter: `user_id=eq.${user?.id}`,
				},
				() => {
					fetchNotifications();
				},
			)
			.subscribe();

		const interval = setInterval(() => {
			fetchPromotionalPlans();
		}, 3600000);

		return () => {
			supabase.removeChannel(subscription);
			clearInterval(interval);
			if (notificationListener.current) {
				Notifications.removeNotificationSubscription(
					notificationListener.current,
				);
			}
			if (responseListener.current) {
				Notifications.removeNotificationSubscription(responseListener.current);
			}
		};
	}, [user, preferredProvider]);

	const renderNotification = ({ item }: { item: Notification }) => (
		<Pressable
			onPress={() => handleNotificationPress(item)}
			style={[
				styles.notificationItem,
				item.is_read ? styles.read : styles.unread,
			]}
		>
			<View style={styles.notificationContent}>
				<Text style={styles.notificationMessage}>{item.message}</Text>
				<Text style={styles.notificationTime}>
					{new Date(item.created_at).toLocaleString("en-US", {
						weekday: "short",
						hour: "numeric",
						minute: "numeric",
					})}
				</Text>
			</View>
			{notificationGroups.Promotions.includes(item.type) && (
				<Pressable
					onPress={() => dismissNotification(item.id)}
					style={styles.dismissButton}
				>
					<Ionicons name="close" size={20} color="gray" />
				</Pressable>
			)}
		</Pressable>
	);

	const groupedNotifications = Object.entries(notificationGroups)
		.map(([group, types]) => ({
			group,
			data: notifications.filter((n) => types.includes(n.type)),
		}))
		.filter(({ data }) => data.length > 0);

	return (
		<View style={styles.container}>
			<StatusBar
				translucent
				backgroundColor="transparent"
				barStyle="light-content"
			/>
			<View style={styles.header}>
				<Pressable onPress={() => router.back()} style={styles.backButton}>
					<Ionicons name="arrow-back" size={24} color="white" />
				</Pressable>
				<Text style={styles.headerTitle}>Notifications</Text>
			</View>
			<FlatList
				data={groupedNotifications}
				renderItem={({ item }) => (
					<View>
						<Text style={styles.groupTitle}>{item.group}</Text>
						<FlatList
							data={item.data}
							renderItem={renderNotification}
							keyExtractor={(notification) => notification.id}
						/>
					</View>
				)}
				keyExtractor={(item) => item.group}
				ListEmptyComponent={
					<Text style={styles.emptyText}>No notifications available</Text>
				}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "black",
		paddingHorizontal: 16,
		paddingTop: StatusBar.currentHeight + 16,
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 16,
	},
	backButton: {
		padding: 8,
	},
	headerTitle: {
		fontSize: 24,
		fontWeight: "bold",
		color: "white",
		marginLeft: 8,
	},
	groupTitle: {
		fontSize: 18,
		fontWeight: "600",
		color: "white",
		marginVertical: 8,
	},
	notificationItem: {
		flexDirection: "row",
		padding: 16,
		borderRadius: 8,
		marginBottom: 8,
	},
	read: {
		backgroundColor: "#171717",
	},
	unread: {
		backgroundColor: "#333",
	},
	notificationContent: {
		flex: 1,
	},
	notificationMessage: {
		color: "white",
		fontSize: 16,
	},
	notificationTime: {
		color: "gray",
		fontSize: 12,
		marginTop: 4,
	},
	dismissButton: {
		padding: 8,
	},
	emptyText: {
		color: "gray",
		fontSize: 16,
		textAlign: "center",
		marginTop: 32,
	},
});
