import React, { useState, useEffect } from "react";
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	Image,
	Alert,
	Switch,
	ScrollView,
	StatusBar,
	KeyboardAvoidingView,
} from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/context/supabase-provider";
import { Ionicons } from "@expo/vector-icons";

export default function SignInScreen() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [rememberMe, setRememberMe] = useState(false);
	const [loading, setLoading] = useState(false);

	const { user, signInWithPassword } = useAuth();

	// Check if both email and password are filled
	const isSignInEnabled = email.trim() !== "" && password.trim() !== "";

	useEffect(() => {
		if (user) {
			router.replace("/(app)/(protected)");
		}
	}, [user]);

	// useEffect(() => {
	// 	const loadSavedCredentials = async () => {
	// 		try {
	// 			const saved = await AsyncStorage.getItem("userCredentials");
	// 			if (saved) {
	// 				const { email, password } = JSON.parse(saved);
	// 				setEmail(email);
	// 				setPassword(password);
	// 				setRememberMe(true);
	// 			}
	// 		} catch (error) {
	// 			console.error("Failed to load saved credentials:", error);
	// 		}
	// 	};

	// 	loadSavedCredentials();
	// }, []);

	// Update the loadSavedCredentials useEffect
	useEffect(() => {
		const loadRememberMePreference = async () => {
			try {
				const savedRememberMe = await AsyncStorage.getItem("@rememberMe");
				if (savedRememberMe !== null) {
					setRememberMe(savedRememberMe === "true");
				}
			} catch (error) {
				console.error("Failed to load rememberMe preference:", error);
			}
		};

		loadRememberMePreference();
	}, []);

	const handleSignIn = async () => {
		if (!email || !password) {
			Alert.alert("Error", "Please enter both email and password");
			return;
		}

		setLoading(true);
		try {
			await signInWithPassword(email, password, rememberMe);

			router.replace("/(app)/(protected)");
		} catch (err: unknown) {
			const error = err as Error;
			// Handle specific error cases
			if (error.message && error.message.includes("Email not confirmed")) {
				Alert.alert(
					"Email Not Verified",
					"Please check your email for verification instructions.",
				);
			} else {
				Alert.alert(
					"Login Error",
					error.message || "An error occurred during login.",
				);
			}
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
						<Text style={styles.welcomeText}>Edges Network</Text>
					</View>

					<View style={styles.inputContainer}>
						<TextInput
							style={styles.input}
							placeholder="Email"
							placeholderTextColor="#aaa"
							keyboardType="email-address"
							autoCapitalize="none"
							value={email}
							onChangeText={setEmail}
						/>
					</View>

					<View
						style={[
							styles.inputContainer,
							{ flexDirection: "row", alignItems: "center", paddingRight: 10 },
						]}
					>
						<TextInput
							style={[styles.input, { flex: 1 }]} // Add flex: 1 here
							placeholder="Password"
							placeholderTextColor="#aaa"
							secureTextEntry={!showPassword}
							autoCapitalize="none"
							value={password}
							onChangeText={setPassword}
							onSubmitEditing={handleSignIn}
						/>
						<TouchableOpacity
							style={styles.eyeIcon}
							onPress={() => setShowPassword(!showPassword)}
						>
							<Ionicons
								name={showPassword ? "eye-sharp" : "eye-off-sharp"}
								size={24}
								color="#aaa"
							/>
						</TouchableOpacity>
					</View>

					<View style={styles.rememberMeContainer}>
						<Switch
							value={rememberMe}
							onValueChange={setRememberMe}
							thumbColor={rememberMe ? "#E9C9AF" : "#666"}
							trackColor={{ false: "#444", true: "#D7A77F" }}
						/>
						<Text style={styles.rememberMeText}>Remember me</Text>
					</View>

					<TouchableOpacity
						style={[
							styles.signInButton,
							isSignInEnabled
								? styles.signInButtonActive
								: styles.signInButtonDisabled,
						]}
						onPress={handleSignIn}
						disabled={loading || !isSignInEnabled}
					>
						<Text
							style={[
								styles.signInButtonText,
								isSignInEnabled
									? styles.signInButtonTextActive
									: styles.signInButtonTextDisabled,
							]}
						>
							{loading ? "Signing In..." : "Sign In"}
						</Text>
					</TouchableOpacity>

					<View style={styles.signupContainer}>
						<Text style={styles.signupText}>Don't have an account? </Text>
						<TouchableOpacity onPress={() => router.push("/sign-up")}>
							<Text style={styles.signupLink}>Sign up</Text>
						</TouchableOpacity>
					</View>
				</View>
			</ScrollView>
		</KeyboardAvoidingView>
	);
}

// --- STYLES ---
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
	eyeIcon: {
		padding: 8,
	},
	rememberMeContainer: {
		flexDirection: "row",
		alignItems: "center",
		alignSelf: "flex-start",
		marginBottom: 20,
	},
	rememberMeText: {
		marginLeft: 10,
		color: "#aaa",
		fontSize: 14,
	},
	signInButton: {
		width: "100%",
		height: 50,
		borderRadius: 8,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 20,
	},
	signInButtonDisabled: {
		backgroundColor: "#666",
		borderWidth: 0,
	},
	signInButtonActive: {
		backgroundColor: "transparent",
		borderWidth: 2,
		borderColor: "#D7A77F",
	},
	signInButtonText: {
		fontSize: 16,
		fontWeight: "bold",
	},
	signInButtonTextDisabled: {
		color: "#aaa",
	},
	signInButtonTextActive: {
		color: "#fff",
	},
	signupContainer: {
		flexDirection: "row",
		alignItems: "center",
		marginTop: 30,
	},
	signupText: {
		color: "#aaa",
		fontSize: 14,
	},
	signupLink: {
		color: "#D7A77F",
		fontSize: 14,
		fontWeight: "bold",
	},
});
