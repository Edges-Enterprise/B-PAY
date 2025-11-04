import { Stack } from "expo-router";
import React from "react";
import { ThemeProvider, useTheme } from "@/context/theme-context";
import { FontProvider, useFont } from "@/context/font-context";
import { NotificationsProvider } from "@/context/NotificationsProvider";
import { colors } from "@/constants/colors";

export const unstable_settings = {
	initialRouteName: "(root)",
};

export default function AppLayout() {
	return (
		<NotificationsProvider>
			<FontProvider>
				<ThemeProvider>
					<AppStack />
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
			<Stack.Screen name="confam" options={{ headerShown: false }} />
			<Stack.Screen name="generate-token" options={{ headerShown: false }} />
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
