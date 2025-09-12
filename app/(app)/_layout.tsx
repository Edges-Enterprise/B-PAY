import { Stack } from "expo-router";
import * as Updates from "expo-updates";
import React, { useEffect, useState } from "react";

import UpdateModal from "@/components/common/UpdateModal";
import { ThemeProvider, useTheme } from "@/context/theme-context";
import { FontProvider, useFont } from "@/context/font-context";
import { NotificationsProvider } from "@/context/NotificationsProvider";
import { colors } from "@/constants/colors";

export const unstable_settings = {
	initialRouteName: "(root)",
};

export default function AppLayout() {
	const [isUpdateModalVisible, setIsUpdateModalVisible] = useState(false);

	useEffect(() => {
		if (__DEV__) {
			// console.log("Skipping update check in development mode");
			return;
		}
		checkForOTAUpdate();
	}, []);

	const checkForOTAUpdate = async () => {
		try {
			const update = await Updates.checkForUpdateAsync();
			if (update.isAvailable) {
				await Updates.fetchUpdateAsync();
				setIsUpdateModalVisible(true);
			}
		} catch (error) {
			console.error("Error checking for OTA update:", error);
			// Silently fail - user can still use the app
		}
	};

	const handleUpdateModalClose = () => {
		setIsUpdateModalVisible(false);
		// Immediately reload to apply the update
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
						isStoreUpdate={false}
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
		<>
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

				<Stack.Screen
					name="cableTv"
					options={{ headerTitle: "Cable & TV 📺" }}
				/>

				<Stack.Screen
					name="Customer"
					options={{
						headerTitle: "Customer Care",
					}}
				/>

				<Stack.Screen
					name="education"
					options={{
						headerTitle: "Education 🎓",
					}}
				/>
				<Stack.Screen
					name="changePin"
					options={{
						headerTitle: "Change Transaction Pin",
					}}
				/>

				<Stack.Screen
					name="changePassword"
					options={{
						headerTitle: "Change Account Password",
					}}
				/>

				<Stack.Screen
					name="referral"
					options={{
						headerTitle: "Refer & Earn",
					}}
				/>

				<Stack.Screen name="commingsoon" options={{ headerShown: false }} />
				{/* <Stack.Screen name="(Auth)" options={{ headerShown: false }} /> */}

				<Stack.Screen
					name="Confirmation"
					options={{
						headerShown: false,
						headerTransparent: false,
						headerStyle: {
							backgroundColor: "transparent",
						},
						headerTintColor: "#fff",
						headerTitle: "",
					}}
				/>
			</Stack>
			{/* <StatusBar
        style="inverted"
        animated
        backgroundColor={colors[colorScheme]?.background}
      /> */}
		</>
	);
}
