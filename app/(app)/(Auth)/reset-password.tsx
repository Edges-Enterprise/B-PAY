import React, { useEffect, useState } from "react";
import {
	Alert,
	View,
	Text,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	KeyboardAvoidingView,
	StatusBar,
	ScrollView,
	Image,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/config/supabase";

export default function ResetPasswordScreen() {
	const { token, type } = useLocalSearchParams();

	const [newPassword, setNewPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!token || type !== "recovery") {
			Alert.alert("Error", "Invalid or missing recovery token.");
		}
	}, [token, type]);

	const handleUpdatePassword = async () => {
		if (!token || type !== "recovery") return;

		if (!newPassword || newPassword.length < 8) {
			Alert.alert("Error", "Password must be at least 8 characters.");
			return;
		}

		setLoading(true);
		try {
			const sessionToken = Array.isArray(token) ? token[0] : token;

			const { error: sessionError } = await supabase.auth.setSession({
				access_token: sessionToken,
				refresh_token: sessionToken,
			});

			if (sessionError) throw sessionError;

			const { error: updateError } = await supabase.auth.updateUser({
				password: newPassword,
			});

			if (updateError) throw updateError;

			Alert.alert("Success", "Password updated successfully.");
			router.replace("/sign-in");
		} catch (err) {
			const error = err as Error;
			Alert.alert("Error", error.message || "Failed to update password.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<KeyboardAvoidingView
			style={{ flex: 1, backgroundColor: "black" }}
			behavior={"height"}
			keyboardVerticalOffset={0}
		>
			<StatusBar
				translucent
				backgroundColor="transparent"
				barStyle="light-content"
			/>
			<ScrollView
				style={{
					flex: 1,
					paddingHorizontal: 20,
					paddingTop: StatusBar.currentHeight || 40,
				}}
				contentContainerStyle={{
					flexGrow: 1,
					justifyContent: "center",
					paddingBottom: 20,
				}}
				keyboardShouldPersistTaps="handled"
			>
				<View style={styles.container}>
					<View style={styles.logoContainer}>
						<Image
							source={require("@/assets/images/playstore.jpg")}
							style={styles.logo}
						/>
						<Text style={styles.welcomeText}>Reset Password</Text>
					</View>

					<Text style={styles.instructionsText}>
						Enter your new password below to reset your account.
					</Text>

					<View style={styles.inputContainer}>
						<TextInput
							placeholder="New Password"
							placeholderTextColor="#aaa"
							style={[styles.input, { flex: 1 }]}
							autoCapitalize="none"
							secureTextEntry={!showPassword}
							value={newPassword}
							onChangeText={setNewPassword}
						/>
						<TouchableOpacity
							style={styles.eyeIcon}
							onPress={() => setShowPassword(!showPassword)}
						>
							<Ionicons
								name={showPassword ? "eye" : "eye-off"}
								size={24}
								color="#aaa"
							/>
						</TouchableOpacity>
					</View>

					<TouchableOpacity
						style={[
							styles.resetButton,
							newPassword.trim().length >= 8
								? styles.resetButtonActive
								: styles.resetButtonDisabled,
						]}
						onPress={handleUpdatePassword}
						disabled={loading || newPassword.trim().length < 8}
					>
						<Text
							style={[
								styles.resetButtonText,
								newPassword.trim().length >= 8
									? styles.resetButtonTextActive
									: styles.resetButtonTextDisabled,
							]}
						>
							{loading ? "Updating..." : "Update Password"}
						</Text>
					</TouchableOpacity>

					<View style={styles.signinContainer}>
						<Text style={styles.signinText}>Remember your password?</Text>
						<TouchableOpacity onPress={() => router.push("/sign-in")}>
							<Text style={styles.signinLink}> Sign In</Text>
						</TouchableOpacity>
					</View>
				</View>
			</ScrollView>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#000",
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: 20,
	},
	logoContainer: {
		alignItems: "center",
		marginBottom: 30,
	},
	logo: {
		width: 150,
		height: 150,
		borderRadius: 70,
		marginBottom: 10,
	},
	welcomeText: {
		color: "#fff",
		fontSize: 24,
		fontWeight: "bold",
	},
	instructionsText: {
		color: "#aaa",
		fontSize: 14,
		textAlign: "center",
		marginBottom: 30,
	},
	inputContainer: {
		flexDirection: "row",
		alignItems: "center",
		width: "100%",
		backgroundColor: "#333",
		borderRadius: 8,
		marginBottom: 20,
		paddingRight: 10,
	},
	input: {
		height: 50,
		paddingHorizontal: 10,
		color: "#fff",
		fontSize: 16,
	},
	eyeIcon: {
		padding: 8,
	},
	resetButton: {
		width: "100%",
		height: 50,
		borderRadius: 8,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 20,
	},
	resetButtonDisabled: {
		backgroundColor: "#666",
	},
	resetButtonActive: {
		backgroundColor: "transparent",
		borderWidth: 2,
		borderColor: "#D7A77F",
	},
	resetButtonText: {
		fontSize: 16,
		fontWeight: "bold",
	},
	resetButtonTextDisabled: {
		color: "#aaa",
	},
	resetButtonTextActive: {
		color: "#fff",
	},
	signinContainer: {
		flexDirection: "row",
		alignItems: "center",
		marginTop: 30,
	},
	signinText: {
		color: "#aaa",
		fontSize: 14,
	},
	signinLink: {
		color: "#D7A77F",
		fontSize: 14,
		fontWeight: "bold",
	},
});
