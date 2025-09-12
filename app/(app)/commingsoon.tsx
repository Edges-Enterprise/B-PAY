import React, { useEffect, useRef, useState } from "react";
import {
	View,
	Text,
	Alert,
	StyleSheet,
	Animated,
	StatusBar,
	TouchableOpacity,
	ImageBackground,
} from "react-native";
import { Dimensions } from "react-native";
import { useSupabase } from "@/context/supabase-provider"; // Import the context hook
import { supabase } from "@/config/supabase"; // Import the full Supabase client for table queries

// Get screen dimensions
const { width, height } = Dimensions.get("window");
const scaleFont = (size: number) => (width / 375) * size;
const scaleSize = (size: number) => (width / 375) * size;

// Target launch date: 60 days from September 12, 2025
const targetDate = new Date("2025-11-11T00:00:00+01:00"); // November 11, 2025, 12:00 AM WAT

const ComingSoon: React.FC = () => {
	const { user, session } = useSupabase(); // Access user and session from Supabase context
	const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
	const [isSubscribed, setIsSubscribed] = useState(false); // Track subscription status
	const pulseAnim = useRef(new Animated.Value(1)).current;
	const fadeAnim = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		Animated.loop(
			Animated.sequence([
				Animated.timing(pulseAnim, {
					toValue: 1.05,
					duration: 750,
					useNativeDriver: true,
				}),
				Animated.timing(pulseAnim, {
					toValue: 1,
					duration: 750,
					useNativeDriver: true,
				}),
			]),
		).start();

		Animated.timing(fadeAnim, {
			toValue: 1,
			duration: 500,
			useNativeDriver: true,
		}).start();

		const timer = setInterval(() => {
			setTimeLeft(calculateTimeLeft());
		}, 1000);

		// Check subscription status on mount if user is logged in
		const checkSubscription = async () => {
			if (user?.email && session) {
				try {
					const { data: existing, error: checkError } = await supabase
						.from("coming_soon_notifications")
						.select("email")
						.eq("email", user.email)
						.single();

					if (checkError && checkError.code !== "PGRST116") {
						console.error("Error checking existing notification:", checkError);
						return;
					}

					if (existing) {
						setIsSubscribed(true);
					}
				} catch (error) {
					console.error("Error checking subscription on mount:", error);
				}
			}
		};

		checkSubscription();

		return () => clearInterval(timer);
	}, [user, session]);

	function calculateTimeLeft() {
		const now = new Date();
		const difference = targetDate.getTime() - now.getTime();

		if (difference <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };

		const days = Math.floor(difference / (1000 * 60 * 60 * 24));
		const hours = Math.floor(
			(difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
		);
		const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
		const seconds = Math.floor((difference % (1000 * 60)) / 1000);

		return { days, hours, minutes, seconds };
	}

	const handleNotifyMe = async () => {
		try {
			// Use user from Supabase context
			const email = user?.email;
			// console.log("User from context:", {
			// 	email,
			// 	userId: user?.id,
			// 	hasSession: !!session,
			// });

			if (!email || !session) {
				Alert.alert("Error", "Please log in to receive notifications.");
				return;
			}

			// Check if email already exists to prevent duplicates
			const { data: existing, error: checkError } = await supabase
				.from("coming_soon_notifications")
				.select("email")
				.eq("email", email)
				.single();

			if (checkError && checkError.code !== "PGRST116") {
				// PGRST116 = no rows
				console.error("Error checking existing notification:", checkError);
				throw checkError;
			}

			if (existing) {
				Alert.alert(
					"Already Subscribed",
					"You are already signed up for notifications!",
				);
				setIsSubscribed(true);
				return;
			}

			// Insert new notification
			const { error } = await supabase
				.from("coming_soon_notifications")
				.insert({ email });

			if (error) throw error;

			setIsSubscribed(true); // Update state on successful subscription
			Alert.alert("Success", "You will be notified when we launch!");
		} catch (error) {
			console.error("Error saving notification:", error);
			Alert.alert("Error", "Failed to save notification. Please try again.");
		}
	};

	return (
		<View style={styles.container}>
			<ImageBackground
				source={require("../../assets/images/coming.png")} // Replace with your PNG path
				style={styles.backgroundImage}
				resizeMode="contain"
			/>
			<View style={styles.overlay}>
				<Animated.View style={{ opacity: fadeAnim }}>
					<StatusBar
						barStyle="light-content"
						backgroundColor="rgba(0, 0, 0, 0.5)"
					/>
					<View style={styles.contentContainer}>
						<Text style={styles.title}>Coming Soon</Text>
						<Text style={styles.subtitle}>
							Exciting updates are on the way! Stay tuned.
						</Text>

						<View style={styles.countdownContainer}>
							<View style={styles.countdownItem}>
								<Text style={styles.countdownValue}>{timeLeft.days}</Text>
								<Text style={styles.countdownLabel}>Days</Text>
							</View>
							<Text style={styles.countdownSeparator}>:</Text>
							<View style={styles.countdownItem}>
								<Text style={styles.countdownValue}>{timeLeft.hours}</Text>
								<Text style={styles.countdownLabel}>Hours</Text>
							</View>
							<Text style={styles.countdownSeparator}>:</Text>
							<View style={styles.countdownItem}>
								<Text style={styles.countdownValue}>{timeLeft.minutes}</Text>
								<Text style={styles.countdownLabel}>Minutes</Text>
							</View>
							<Text style={styles.countdownSeparator}>:</Text>
							<View style={styles.countdownItem}>
								<Text style={styles.countdownValue}>{timeLeft.seconds}</Text>
								<Text style={styles.countdownLabel}>Seconds</Text>
							</View>
						</View>

						<Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
							<TouchableOpacity
								style={[
									styles.ctaButton,
									isSubscribed && styles.ctaButtonDisabled, // Apply disabled styling
								]}
								onPress={handleNotifyMe}
								disabled={isSubscribed} // Disable button if subscribed
							>
								<Text style={styles.ctaText}>
									{isSubscribed ? "Hang Tight" : "Notify Me"}
								</Text>
							</TouchableOpacity>
						</Animated.View>
					</View>
				</Animated.View>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#000000", // Solid black background
	},
	backgroundImage: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		transform: [
			{ rotate: "30deg" },
			{ scale: 1.7 },
			{ translateX: -8 },
			{ translateY: -10 },
		],
	},
	overlay: {
		flex: 1,
		backgroundColor: "rgba(0, 0, 0, 0.4)", // Semi-transparent overlay for readability
		justifyContent: "center",
		paddingTop: scaleSize(60),
		paddingBottom: scaleSize(20),
	},
	contentContainer: {
		alignItems: "center",
		paddingHorizontal: scaleSize(16),
		paddingVertical: scaleSize(20),
	},
	title: {
		fontSize: scaleFont(32),
		fontWeight: "700",
		color: "#e9e2b3ff",
		textAlign: "center",
		marginBottom: scaleSize(8),
	},
	subtitle: {
		fontSize: scaleFont(16),
		fontWeight: "400",
		color: "#ffeddeff",
		textAlign: "center",
		marginBottom: scaleSize(24),
	},
	countdownContainer: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: scaleSize(24),
	},
	countdownItem: {
		alignItems: "center",
		marginHorizontal: scaleSize(4),
	},
	countdownValue: {
		fontSize: scaleFont(24),
		fontWeight: "700",
		color: "#ff0000ff",
	},
	countdownLabel: {
		fontSize: scaleFont(12),
		fontWeight: "400",
		color: "#B0B0B0",
	},
	countdownSeparator: {
		fontSize: scaleFont(24),
		color: "#FFD700",
		marginHorizontal: scaleSize(4),
	},
	ctaButton: {
		backgroundColor: "#FFD700",
		borderRadius: scaleSize(8),
		paddingVertical: scaleSize(12),
		paddingHorizontal: scaleSize(24),
		alignItems: "center",
	},
	ctaButtonDisabled: {
		backgroundColor: "#ad917aff", // Grayed-out color for disabled state
		opacity: 0.7,
	},
	ctaText: {
		fontSize: scaleFont(16),
		fontWeight: "600",
		color: "#000000",
	},
});

export default ComingSoon;
