import React, { createContext, useContext, useEffect, useState } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { supabase } from "@/config/supabase";
import { useAuth } from "./supabase-provider";
import { Platform } from "react-native";

type NotificationSettings = {
	notificationsEnabled: boolean;
	setNotificationsEnabled: (enabled: boolean) => Promise<void>;
	requestPermissions: () => Promise<boolean>;
};

const NotificationsContext = createContext<NotificationSettings>({
	notificationsEnabled: true,
	setNotificationsEnabled: async () => {},
	requestPermissions: async () => false,
});

export const useNotifications = () => useContext(NotificationsContext);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const { user, profile } = useAuth();
	const [notificationsEnabled, setNotificationsEnabledState] = useState(true);

	// Configure notification handler
	useEffect(() => {
		Notifications.setNotificationHandler({
			handleNotification: async () => ({
				shouldShowAlert: notificationsEnabled,
				shouldPlaySound: notificationsEnabled,
				shouldSetBadge: notificationsEnabled,
			}),
		});
	}, [notificationsEnabled]);

	// Fetch notification settings from profiles table
	useEffect(() => {
		const fetchSettings = async () => {
			if (!user?.id) return;
			try {
				const { data, error } = await supabase
					.from("profiles")
					.select("notifications_enabled")
					.eq("id", user.id)
					.single();
				if (error) throw error;
				setNotificationsEnabledState(data?.notifications_enabled ?? true);
			} catch (error) {
				console.error("Error fetching notification settings:", error);
			}
		};
		fetchSettings();
	}, [user?.id]);

	// Request notification permissions
	const requestPermissions = async (): Promise<boolean> => {
		if (!Device.isDevice) {
			console.log("Must use physical device for push notifications");
			return false;
		}

		const { status: existingStatus } =
			await Notifications.getPermissionsAsync();
		let finalStatus = existingStatus;

		if (existingStatus !== "granted") {
			const { status } = await Notifications.requestPermissionsAsync();
			finalStatus = status;
		}

		if (finalStatus !== "granted") {
			console.log("Failed to get push token for push notifications");
			return false;
		}

		const token = (await Notifications.getExpoPushTokenAsync()).data;
		if (user?.id) {
			try {
				await supabase.from("user_push_tokens").upsert(
					{
						user_id: user.id,
						push_token: token,
						updated_at: new Date().toISOString(),
					},
					{ onConflict: "user_id" },
				);
			} catch (error) {
				console.error("Error storing push token:", error);
			}
		}

		if (Platform.OS === "android") {
			await Notifications.setNotificationChannelAsync("default", {
				name: "default",
				importance: Notifications.AndroidImportance.MAX,
				vibrationPattern: [0, 250, 250, 250],
				lightColor: "#FFFFFF",
			});
		}

		return true;
	};

	// Update notification settings in profiles table
	const setNotificationsEnabled = async (enabled: boolean) => {
		setNotificationsEnabledState(enabled);
		if (user?.id) {
			try {
				const { error } = await supabase
					.from("profiles")
					.update({
						notifications_enabled: enabled,
						updated_at: new Date().toISOString(),
					})
					.eq("id", user.id);
				if (error) throw error;
			} catch (error) {
				console.error("Error updating notification settings:", error);
				setNotificationsEnabledState(!enabled); // Revert on error
			}
		}
	};

	// Request permissions on user sign-in
	useEffect(() => {
		if (user?.id) {
			requestPermissions();
		}
	}, [user?.id]);

	return (
		<NotificationsContext.Provider
			value={{
				notificationsEnabled,
				setNotificationsEnabled,
				requestPermissions,
			}}
		>
			{children}
		</NotificationsContext.Provider>
	);
};