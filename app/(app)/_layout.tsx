import { Stack } from "expo-router";
import { ThemeProvider, useTheme } from "@/context/theme-context";
import { FontProvider, useFont } from "@/context/font-context";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { Platform } from "react-native";
import * as Updates from "expo-updates";
import UpdateModal from "@/components/common/UpdateModal";
import { TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/colors";
import { useColorScheme } from "@/lib/useColorScheme";

export const unstable_settings = {
  initialRouteName: "(root)",
};

export default function AppLayout() {
	const { colorScheme } = useColorScheme();
	const [isUpdateModalVisible, setIsUpdateModalVisible] =
		useState<boolean>(false);
	const [isStoreUpdateRequired, setIsStoreUpdateRequired] =
		useState<boolean>(false);

	useEffect(() => {
		// Skip update checks in development mode
		if (__DEV__) {
			console.log("Skipping update check in development mode");
			return;
		}
		checkForUpdates();
	}, []);

  const checkForUpdates = async () => {
    try {
      // First check for OTA updates
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();
        setIsUpdateModalVisible(true);
        setIsStoreUpdateRequired(false);
        return; // Exit if OTA update is available
      }

      // If no OTA update, check store version
      await checkForStoreUpdate();
    } catch (error) {
      console.error("Error checking for updates:", error);
      // On error, still try to check store version
      await checkForStoreUpdate();
    }
  };

  const checkForStoreUpdate = async () => {
    try {
      const currentVersion = require("../../app.json").expo.version;
      let latestVersion = currentVersion; // Default to current version

      if (Platform.OS === "ios") {
        const appStoreId = "6741070697";
        const response = await fetch(
          `https://itunes.apple.com/lookup?id=${appStoreId}`,
        );
        const data = await response.json();

        if (data.resultCount > 0 && data.results[0].version) {
          latestVersion = data.results[0].version;
        }
      } else {
        // For Android, you might want to implement your own version check
        // or use a remote config service to manage versions
        latestVersion = "1.0.1"; // This should come from your server or remote config
      }

      // Compare versions and show modal if update is needed
      if (currentVersion !== latestVersion) {
        setIsUpdateModalVisible(true);
        setIsStoreUpdateRequired(true);
      }
    } catch (error) {
      console.error("Error checking store version:", error);
    }
  };

	const handleUpdateModalClose = () => {
		setIsUpdateModalVisible(false);
		if (!isStoreUpdateRequired) {
			Updates.reloadAsync().catch((err) =>
				console.error("Error reloading app:", err),
			);
		}
	};

	return (
		<FontProvider>
			<ThemeProvider>
				<AppStack />
				<UpdateModal
					visible={isUpdateModalVisible}
					onClose={handleUpdateModalClose}
					isStoreUpdate={isStoreUpdateRequired}
				/>
			</ThemeProvider>
		</FontProvider>
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
				<Stack.Screen
					name="(protected)"
					options={{ headerTitle: "", headerShown: false }}
				/>
				<Stack.Screen
					name="(auth)"
					options={{ headerTitle: "", headerShown: false }}
				/>
				<Stack.Screen
					name="(legal)"
					options={{ headerTitle: "", headerShown: false }}
				/>
				<Stack.Screen
					name="welcome"
					options={{ headerTitle: "", headerShown: false }}
				/>
				<Stack.Screen
					name="serviceprovider"
					options={{
						headerShown: false, // Let BuyDataScreen.tsx handle its own header
					}}
				/>
				<Stack.Screen
					name="airtimeprovider"
					options={{
						headerTitle: "Airtime Purchase",
						// headerShown: true, // Let BuyDataScreen.tsx handle its own header
					}}
				/>
				<Stack.Screen
					name="receipt"
					options={{
						headerTitle: "Transaction Receipt",
						// headerShown: true, // Let BuyDataScreen.tsx handle its own header
					}}
				/>
				<Stack.Screen
					name="fund"
					options={{
						headerShown: false, // Let BuyDataScreen.tsx handle its own header
					}}
				/>
				<Stack.Screen
					name="notifications"
					options={{
						headerShown: false, // Let BuyDataScreen.tsx handle its own header
					}}
				/>

				<Stack.Screen
					name="electricity"
					options={{
						headerTitle: "Electricity Bill Payment 💡",
						// headerShown: false, // Let BuyDataScreen.tsx handle its own header
					}}
				/>

				<Stack.Screen
					name="cableTv"
					options={{
						headerTitle: "Cable & TV 📺",
						// headerShown: false, // Let BuyDataScreen.tsx handle its own header
					}}
				/>

				<Stack.Screen
					name="Customer"
					options={{
						headerTitle: "Customer Care",
						// headerShown: false, // Let BuyDataScreen.tsx handle its own header
					}}
				/>

				<Stack.Screen
					name="referral"
					options={{
						headerTitle: "Refer & Earn",
						// headerShown: false, // Let BuyDataScreen.tsx handle its own header
					}}
				/>

				<Stack.Screen
					name="commingsoon"
					options={{
						headerShown: false, // Let BuyDataScreen.tsx handle its own header
					}}
				/>

				<Stack.Screen
					name="Confirmation"
					options={{
						headerShown: false, // Show header for confirmation screen
						headerTransparent: false, // Make header transparent
						headerStyle: {
							backgroundColor: "transparent", // Ensure no background color
						},
						headerTintColor: "#fff", // White icons/text for visibility
						headerTitle: "", // No title
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