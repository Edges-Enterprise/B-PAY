import React, { useState, useEffect, useRef } from "react";
import {
	View,
	TextInput,
	Image,
	StatusBar,
	TouchableOpacity,
	ActivityIndicator,
	Text,
	Animated,
	Alert,
	KeyboardAvoidingView,
	Platform,
	Switch,
} from "react-native";
import { router } from "expo-router";
import { ScrollView } from "react-native-gesture-handler";
import { useColorScheme } from "@/lib/useColorScheme";
import { useAuth } from "@/context/supabase-provider";

export default function SignUpScreen() {
	const [username, setUsername] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [rememberMe, setRememberMe] = useState(false);
	const [loading, setLoading] = useState(false);

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
			console.log("SignUp started with:", { username, email, rememberMe });

			await signUp(username, email, password);

			setUsername("");
			setEmail("");
			setPassword("");
			setRememberMe(false);
		} catch (err: unknown) {
			const error = err as Error;
			console.error("SignUp error:", error);
			if (error.message.includes("User already registered")) {
				Alert.alert("Sign Up Error", "This email is already registered.");
			}
		} finally {
			setLoading(false);
		}
	};

	return (
		<KeyboardAvoidingView
			style={{ flex: 1, backgroundColor: "#000" }}
			behavior={Platform.OS === "ios" ? "padding" : undefined}
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
					paddingBottom: 40,
				}}
				keyboardShouldPersistTaps="handled"
			>
				<Animated.View
					style={[
						{
							flex: 1,
							justifyContent: "center",
							alignItems: "center",
							paddingHorizontal: 20,
						},
						{ opacity: fadeAnim },
					]}
				>
					<View
						style={{
							alignItems: "center",
							marginBottom: 30,
						}}
					>
						<Image
							source={require("@/assets/images/playstore.jpg")}
							style={{
								width: 150,
								height: 150,
								borderRadius: 70,
								marginBottom: 10,
							}}
						/>
						<Text
							style={{
								fontSize: 24,
								fontWeight: "bold",
								color: "#fff",
							}}
						>
							Create Account
						</Text>
					</View>

					<View
						style={{
							width: "100%",
							backgroundColor: "#222",
							borderRadius: 8,
							marginBottom: 20,
						}}
					>
						<TextInput
							style={{
								height: 50,
								paddingHorizontal: 10,
								fontSize: 16,
								color: "#fff",
							}}
							placeholder="Username"
							placeholderTextColor="#aaa"
							autoCapitalize="none"
							value={username}
							onChangeText={setUsername}
						/>
					</View>

					<View
						style={{
							width: "100%",
							backgroundColor: "#222",
							borderRadius: 8,
							marginBottom: 20,
						}}
					>
						<TextInput
							style={{
								height: 50,
								paddingHorizontal: 10,
								fontSize: 16,
								color: "#fff",
							}}
							placeholder="Email"
							placeholderTextColor="#aaa"
							keyboardType="email-address"
							autoCapitalize="none"
							value={email}
							onChangeText={setEmail}
						/>
					</View>

					<View
						style={{
							width: "100%",
							backgroundColor: "#222",
							borderRadius: 8,
							marginBottom: 20,
						}}
					>
						<TextInput
							style={{
								height: 50,
								paddingHorizontal: 10,
								fontSize: 16,
								color: "#fff",
							}}
							placeholder="Password"
							placeholderTextColor="#aaa"
							secureTextEntry
							autoCapitalize="none"
							value={password}
							onChangeText={setPassword}
						/>
					</View>

					<View
						style={{
							width: "100%",
							flexDirection: "row",
							alignItems: "center",
							gap: 10,
							marginBottom: 20,
						}}
					>
						<Switch
							value={rememberMe}
							onValueChange={setRememberMe}
							thumbColor={rememberMe ? "#E9C9AF" : "#ccc"}
							trackColor={{ false: "#444", true: "#D7A77F" }}
						/>
						<Text
							style={{
								color: "#aaa",
								fontSize: 16,
							}}
						>
							Remember Me
						</Text>
					</View>

					<TouchableOpacity
						style={[
							{
								width: "100%",
								height: 50,
								borderRadius: 8,
								justifyContent: "center",
								alignItems: "center",
								marginBottom: 20,
								borderWidth: 2,
							},
							!isFormValid
								? {
										backgroundColor: "#333",
										borderColor: "transparent",
									}
								: {
										backgroundColor: "transparent",
										borderColor: "#D7A77F",
									},
						]}
						onPress={handleSignUp}
						disabled={loading || !isFormValid}
					>
						{loading ? (
							<ActivityIndicator color="#D7A77F" />
						) : (
							<Text
								style={[
									{
										fontSize: 16,
										fontWeight: "bold",
									},
									isFormValid && {
										color: "white",
									},
								]}
							>
								Sign Up
							</Text>
						)}
					</TouchableOpacity>

					<View
						style={{
							flexDirection: "row",
							alignItems: "center",
							marginTop: 30,
						}}
					>
						<Text
							style={{
								color: "#aaa",
								fontSize: 14,
							}}
						>
							Already have an account?{" "}
						</Text>
						<TouchableOpacity onPress={() => router.push("/sign-in")}>
							<Text
								style={{
									color: "#D7A77F",
									fontSize: 14,
									fontWeight: "bold",
								}}
							>
								Sign in
							</Text>
						</TouchableOpacity>
					</View>
				</Animated.View>
			</ScrollView>
		</KeyboardAvoidingView>
	);
}
