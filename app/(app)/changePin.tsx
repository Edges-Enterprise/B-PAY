import React, { useState } from "react";
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTheme } from "@/context/theme-context";
import { useFont } from "@/context/font-context";
import { useSupabase } from "@/context/supabase-provider";
import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";

export default function ChangeTransactionPin() {
	const { colorScheme } = useTheme();
	const { selectedFont } = useFont();
	const { updateTransactionPin } = useSupabase(); // Assuming a Supabase function for updating PIN

	const [currentPin, setCurrentPin] = useState("");
	const [newPin, setNewPin] = useState("");
	const [confirmPin, setConfirmPin] = useState("");
	const [loading, setLoading] = useState(false);

	const handleChangePin = async () => {
		if (!currentPin || !newPin || !confirmPin) {
			Alert.alert("Error", "Please fill in all fields.");
			return;
		}

		if (newPin.length < 4) {
			Alert.alert("Error", "New PIN must be at least 4 digits.");
			return;
		}

		if (newPin !== confirmPin) {
			Alert.alert("Error", "New PIN and confirmation do not match.");
			return;
		}

		setLoading(true);
		try {
			// Assuming updateTransactionPin is a Supabase function that validates currentPin and updates to newPin
			await updateTransactionPin(currentPin, newPin);
			Alert.alert("Success", "Transaction PIN updated successfully.", [
				{
					text: "OK",
					onPress: () => router.back(),
				},
			]);
		} catch (error) {
			Alert.alert(
				"Error",
				error.message || "Failed to update transaction PIN.",
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<View
			style={[
				styles.container,
				{ backgroundColor: colors[colorScheme]?.background },
			]}
		>
			{/* Form */}
			<View style={styles.form}>
				<Text
					style={[
						styles.label,
						{
							color: colors[colorScheme]?.foreground,
							fontFamily: selectedFont || fonts.default,
						},
					]}
				>
					Current PIN
				</Text>
				<TextInput
					style={[
						styles.input,
						{
							backgroundColor: `${colors[colorScheme]?.input}99`,
							color: colors[colorScheme]?.foreground,
							fontFamily: selectedFont || fonts.default,
						},
					]}
					value={currentPin}
					onChangeText={setCurrentPin}
					placeholder="Enter current PIN"
					placeholderTextColor={colors[colorScheme]?.mutedForeground}
					secureTextEntry
					keyboardType="numeric"
				/>

				<Text
					style={[
						styles.label,
						{
							color: colors[colorScheme]?.foreground,
							fontFamily: selectedFont || fonts.default,
						},
					]}
				>
					New PIN
				</Text>
				<TextInput
					style={[
						styles.input,
						{
							backgroundColor: `${colors[colorScheme]?.input}99`,
							color: colors[colorScheme]?.foreground,
							fontFamily: selectedFont || fonts.default,
						},
					]}
					value={newPin}
					onChangeText={setNewPin}
					placeholder="Enter new PIN"
					placeholderTextColor={colors[colorScheme]?.mutedForeground}
					secureTextEntry
					keyboardType="numeric"
				/>

				<Text
					style={[
						styles.label,
						{
							color: colors[colorScheme]?.foreground,
							fontFamily: selectedFont || fonts.default,
						},
					]}
				>
					Confirm New PIN
				</Text>
				<TextInput
					style={[
						styles.input,
						{
							backgroundColor: `${colors[colorScheme]?.input}99`,
							color: colors[colorScheme]?.foreground,
							fontFamily: selectedFont || fonts.default,
						},
					]}
					value={confirmPin}
					onChangeText={setConfirmPin}
					placeholder="Confirm new PIN"
					placeholderTextColor={colors[colorScheme]?.mutedForeground}
					secureTextEntry
					keyboardType="numeric"
				/>

				<TouchableOpacity
					style={[
						styles.button,
						{
							backgroundColor: colors[colorScheme]?.primary,
							opacity: loading ? 0.6 : 1,
						},
					]}
					onPress={handleChangePin}
					disabled={loading}
				>
					<Text
						style={[
							styles.buttonText,
							{
								color: colors[colorScheme]?.primaryForeground,
								fontFamily: selectedFont || fonts.default,
							},
						]}
					>
						{loading ? "Updating..." : "Update PIN"}
					</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		paddingHorizontal: 16,
		paddingTop: 36,
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginTop: 12,
		marginBottom: 24,
	},
	headerText: {
		fontSize: 20,
		fontWeight: "600",
	},
	form: {
		flex: 1,
	},
	label: {
		fontSize: 16,
		fontWeight: "500",
		marginBottom: 8,
	},
	input: {
		borderRadius: 12,
		padding: 12,
		marginBottom: 16,
		fontSize: 14,
	},
	button: {
		borderRadius: 16,
		padding: 16,
		alignItems: "center",
		marginTop: 24,
	},
	buttonText: {
		fontSize: 16,
		fontWeight: "600",
	},
});
