import React, { useState } from "react";
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	ScrollView,
	StatusBar,
	KeyboardAvoidingView,
	Alert,
	Image,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "@/config/supabase";

export default function ForgotPasswordScreen() {
	const [email, setEmail] = useState("");
	const [loading, setLoading] = useState(false);

	const handleResetPassword = async () => {
		if (!email.trim()) {
			Alert.alert("Error", "Please enter your email.");
			return;
		}

		setLoading(true);
		try {
			const { error } = await supabase.auth.resetPasswordForEmail(email, {
				redirectTo: "https://app.com/redirect",
			});

			if (error) throw error;

			Alert.alert(
				"Check your Email",
				"A password reset link has been sent to your email.",
			);
			router.push("/sign-in");
		} catch (error) {
			const err = error as Error;
			Alert.alert("Reset Error", err.message);
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
						<Text style={styles.welcomeText}>Forgot your Password ?</Text>
					</View>
					
					<Text
						style={{
							color: "#aaa",
							fontSize: 14,
							textAlign: "center",
							marginBottom: 30,
						}}
					>
						Enter your email address below and we’ll send you a link to reset your
						password.
					</Text>

					<View style={styles.inputContainer}>
						<TextInput
							placeholder="Email"
							placeholderTextColor="#aaa"
							style={styles.input}
							autoCapitalize="none"
							keyboardType="email-address"
							value={email}
							onChangeText={setEmail}
						/>
					</View>

					<TouchableOpacity
						style={[
							styles.resetButton,
							email.trim()
								? styles.resetButtonActive
								: styles.resetButtonDisabled,
						]}
						onPress={handleResetPassword}
						disabled={loading || !email.trim()}
					>
						<Text
							style={[
								styles.resetButtonText,
								email.trim()
									? styles.resetButtonTextActive
									: styles.resetButtonTextDisabled,
							]}
						>
							{loading ? "Sending..." : "Reset Password"}
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
	inputContainer: {
		width: "100%",
		backgroundColor: "#333",
		borderRadius: 8,
		marginBottom: 20,
	},
	input: {
		height: 50,
		paddingHorizontal: 10,
		color: "#fff",
		fontSize: 16,
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
