import React, { useState, useEffect, useRef } from "react";
import {
	View,
	TextInput,
	Image,
	StatusBar,
	TouchableOpacity,
	ActivityIndicator,
	StyleSheet,
	Text,
	Animated,
	Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { ScrollView } from "react-native-gesture-handler";
import { useColorScheme } from "@/lib/useColorScheme";
import { useAuth } from "@/context/supabase-provider";

export default function SignUpScreen() {
	const [username, setUsername] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);

	const router = useRouter();
	const { signUp } = useAuth();
	const colorScheme = useColorScheme();

	const fadeAnim = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		Animated.timing(fadeAnim, {
			toValue: 1,
			duration: 800,
			useNativeDriver: true,
		}).start();
	}, []);

	const isEmailValid = (email: string) => {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email.trim());
	};

	const isFormValid =
		username.trim().length >= 3 &&
		isEmailValid(email) &&
		password.trim().length >= 6;

	const handleSignUp = async () => {
		if (!isFormValid) {
			Alert.alert(
				"Invalid Input",
				"Please ensure username is at least 3 characters, email is valid, and password is at least 6 characters.",
			);
			return;
		}

		setLoading(true);
		try {
			console.log("SignUp started with:", { username, email });

			// Call the signUp function from the Supabase provider
			await signUp(username, email, password);

			// Clear form fields after successful sign-up
			setUsername("");
			setEmail("");
			setPassword("");

			// The Supabase provider handles navigation and success alert
		} catch (error) {
			// The Supabase provider already shows an error alert
			console.error("SignUp error:", error);
			// Only show additional alert if needed for specific cases
			if (error.message.includes("User already registered")) {
				Alert.alert("Sign Up Error", "This email is already registered.");
			}
		} finally {
			setLoading(false);
		}
	};

	return (
		<View style={{ flex: 1, backgroundColor: "#000" }}>
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
					paddingBottom: 40,
				}}
				keyboardShouldPersistTaps="handled"
			>
				<Animated.View style={[styles.container, { opacity: fadeAnim }]}>
					<View style={styles.logoContainer}>
						<Image
							source={require("@/assets/images/playstore.jpg")}
							style={styles.logo}
						/>
						<Text style={styles.welcomeText}>Create Account</Text>
					</View>

					<View style={styles.inputContainer}>
						<TextInput
							style={styles.input}
							placeholder="Username"
							placeholderTextColor="#aaa"
							autoCapitalize="none"
							value={username}
							onChangeText={setUsername}
						/>
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

					<View style={styles.inputContainer}>
						<TextInput
							style={styles.input}
							placeholder="Password"
							placeholderTextColor="#aaa"
							secureTextEntry
							autoCapitalize="none"
							value={password}
							onChangeText={setPassword}
						/>
					</View>

					<TouchableOpacity
						style={[
							styles.signUpButton,
							!isFormValid ? styles.disabledButton : styles.activeButton,
						]}
						onPress={handleSignUp}
						disabled={loading || !isFormValid}
					>
						{loading ? (
							<ActivityIndicator color="#D4AF37" />
						) : (
							<Text
								style={[
									styles.signUpButtonText,
									isFormValid && styles.activeButtonText,
								]}
							>
								Sign Up
							</Text>
						)}
					</TouchableOpacity>

					<View style={styles.signupContainer}>
						<Text style={styles.signupText}>Already have an account? </Text>
						<TouchableOpacity onPress={() => router.push("/sign-in")}>
							<Text style={styles.signupLink}>Sign in</Text>
						</TouchableOpacity>
					</View>
				</Animated.View>
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
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
		fontSize: 24,
		fontWeight: "bold",
		color: "#fff",
	},
	inputContainer: {
		width: "100%",
		backgroundColor: "#222",
		borderRadius: 8,
		marginBottom: 20,
	},
	input: {
		height: 50,
		paddingHorizontal: 10,
		fontSize: 16,
		color: "#fff",
	},
	signUpButton: {
		width: "100%",
		height: 50,
		borderRadius: 8,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 20,
		borderWidth: 2,
	},
	disabledButton: {
		backgroundColor: "#333",
		borderColor: "transparent",
	},
	activeButton: {
		backgroundColor: "transparent",
		borderColor: "#D4AF37",
	},
	signUpButtonText: {
		fontSize: 16,
		fontWeight: "bold",
	},
	activeButtonText: {
		color: "white",
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
