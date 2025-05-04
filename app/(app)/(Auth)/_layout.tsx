import { Stack } from "expo-router";

export default function Layout() {
	return (
		<Stack
			screenOptions={{
				headerShown: false,
				animation: "fade", // Optional: smooth fade transition
				presentation: "transparentModal", // 👈 important change here
			}}
		>
			<Stack.Screen name="sign-up" />
			<Stack.Screen name="sign-in" />
			<Stack.Screen name="forgot-password" />
			<Stack.Screen name="reset-password" />
		</Stack>
	);
}
