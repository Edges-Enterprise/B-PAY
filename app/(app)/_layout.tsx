import { Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import * as Updates from "expo-updates";
import UpdateModal from "@/components/common/UpdateModal";
import { ThemeProvider, useTheme } from "@/context/theme-context";
import { FontProvider, useFont } from "@/context/font-context";
import { NotificationsProvider } from "@/context/NotificationsProvider";
import { colors } from "@/constants/colors";
import { supabase } from "@/config/supabase";

export const unstable_settings = {
	initialRouteName: "(root)",
};

export default function AppLayout() {
	const [isUpdateModalVisible, setIsUpdateModalVisible] = useState(false);
	const [isStoreUpdateRequired, setIsStoreUpdateRequired] =
		useState<boolean>(false);
	const [latestApkUrl, setLatestApkUrl] = useState<string | null>(null);

	useEffect(() => {
		if (__DEV__) return;
		checkForOTAUpdate();
		checkForStoreUpdate();
	}, []);

	const checkForOTAUpdate = async () => {
		try {
			const update = await Updates.checkForUpdateAsync();
			if (update.isAvailable) {
				await Updates.fetchUpdateAsync();
				setIsUpdateModalVisible(true);
				setIsStoreUpdateRequired(false);
				return;
			}
		} catch (error) {
			console.error("Error checking for OTA update:", error);
		}
	};

	const checkForStoreUpdate = async () => {
		try {
			const currentVersion = require("../../app.json").expo.version;

			const { data, error } = await supabase
				.from("app_updates")
				.select("version, apk_url")
				.eq("status", "active")
				.order("created_at", { ascending: false })
				.limit(1)
				.single();

			if (error) {
				console.error("Supabase fetch error:", error);
				return;
			}

			if (data && data.version !== currentVersion) {
				setLatestApkUrl(data.apk_url);
				setIsUpdateModalVisible(true);
				setIsStoreUpdateRequired(true);
			}
		} catch (error) {
			console.error("Error checking Android version:", error);
		}
	};

	const handleUpdateModalClose = () => {
		setIsUpdateModalVisible(false);
		Updates.reloadAsync().catch((err) =>
			console.error("Error reloading app:", err),
		);
	};

	return (
		<NotificationsProvider>
			<FontProvider>
				<ThemeProvider>
					<AppStack />
					<UpdateModal
						visible={isUpdateModalVisible}
						onClose={handleUpdateModalClose}
						isStoreUpdate={isStoreUpdateRequired}
						apkUrl={latestApkUrl ?? undefined}
					/>
				</ThemeProvider>
			</FontProvider>
		</NotificationsProvider>
	);
}

function AppStack() {
	const { colorScheme } = useTheme();
	const { selectedFont } = useFont();

	return (
		<Stack
			screenOptions={{
				headerShown: true,
				gestureEnabled: true,
				headerStyle: {
					backgroundColor: colors[colorScheme]?.background,
				},
				headerTintColor: colors[colorScheme]?.foreground,
				headerTitleStyle: {
					fontFamily: selectedFont,
				},
				contentStyle: {
					backgroundColor: colors[colorScheme]?.background,
				},
			}}
		>
			<Stack.Screen name="(protected)" options={{ headerShown: false }} />
			<Stack.Screen name="(auth)" options={{ headerShown: false }} />
			<Stack.Screen name="(legal)" options={{ headerShown: false }} />
			<Stack.Screen name="welcome" options={{ headerShown: false }} />
			<Stack.Screen name="serviceprovider" options={{ headerShown: false }} />
			<Stack.Screen
				name="airtimeprovider"
				options={{ headerTitle: "Buy Airtime" }}
			/>
			<Stack.Screen
				name="receipt"
				options={{ headerTitle: "Transaction Receipt" }}
			/>
			<Stack.Screen name="fund" options={{ headerShown: false }} />
			<Stack.Screen
				name="notifications"
				options={{ headerTitle: "Notifications 🔔" }}
			/>
			<Stack.Screen
				name="electricity"
				options={{ headerTitle: "Electricity Bill Payment 💡" }}
			/>
			<Stack.Screen name="cableTv" options={{ headerTitle: "Cable & TV 📺" }} />
			<Stack.Screen
				name="Customer"
				options={{ headerTitle: "Customer Care" }}
			/>
			<Stack.Screen
				name="education"
				options={{ headerTitle: "Education 🎓" }}
			/>
			<Stack.Screen
				name="changePin"
				options={{ headerTitle: "Change Transaction Pin" }}
			/>
			<Stack.Screen
				name="changePassword"
				options={{ headerTitle: "Change Account Password" }}
			/>
			<Stack.Screen name="referral" options={{ headerTitle: "Refer & Earn" }} />
			<Stack.Screen name="commingsoon" options={{ headerShown: false }} />
			<Stack.Screen
				name="Confirmation"
				options={{
					headerShown: false,
					headerTransparent: false,
					headerStyle: { backgroundColor: "transparent" },
					headerTintColor: "#fff",
					headerTitle: "",
				}}
			/>
		</Stack>
	);
}
