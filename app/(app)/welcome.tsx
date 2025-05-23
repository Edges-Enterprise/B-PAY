import { rotatingTexts } from "@/constants/helper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
	Dimensions,
	Image,
	ImageBackground,
	Pressable,
	StatusBar,
	StyleSheet,
	Text,
	Vibration,
	View,
} from "react-native";
import { State, TapGestureHandler } from "react-native-gesture-handler";
import Animated, {
	SlideInRight,
	SlideOutLeft,
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withSequence,
	withTiming,
} from "react-native-reanimated";

const { width, height } = Dimensions.get("window");

export default function WelcomeScreen() {
	const router = useRouter();
	const [showButton, setShowButton] = useState(false);
	const [showStatusBar, setShowStatusBar] = useState(false);
	const [textIndex, setTextIndex] = useState(0);
	const [typewriterText, setTypewriterText] = useState("");
	const [navigationError, setNavigationError] = useState(null);

	const fullWelcomeText = "Welcome";
	const scale = useSharedValue(1);
	const buttonScale = useSharedValue(1);
	const logoScale = useSharedValue(1);

	// Typewriter effect
	useEffect(() => {
		let currentIndex = 0;
		const interval = setInterval(() => {
			setTypewriterText(fullWelcomeText.slice(0, currentIndex + 1));
			currentIndex++;
			if (currentIndex === fullWelcomeText.length) {
				clearInterval(interval);
				setTimeout(() => setShowButton(true), 500);
			}
		}, 250);
		return () => clearInterval(interval);
	}, []);

	// Pulse animations
	useEffect(() => {
		scale.value = withRepeat(
			withSequence(
				withTiming(1.05, { duration: 1000 }),
				withTiming(1, { duration: 1000 }),
			),
			-1,
			true,
		);

		buttonScale.value = withRepeat(
			withSequence(
				withTiming(1.01, { duration: 2000 }),
				withTiming(1, { duration: 2000 }),
			),
			-1,
			true,
		);

		logoScale.value = withRepeat(
			withSequence(
				withTiming(1.03, { duration: 1500 }),
				withTiming(1, { duration: 1500 }),
			),
			-1,
			true,
		);
	}, []);

	// Rotating text
	useEffect(() => {
		const interval = setInterval(() => {
			setTextIndex((prev) => (prev + 1) % rotatingTexts.length);
		}, 4000);
		return () => clearInterval(interval);
	}, []);

	const onDoubleTap = ({ nativeEvent }) => {
		if (nativeEvent.state === State.ACTIVE) {
			setShowStatusBar(true);
		}
	};

	const pulseStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }],
	}));

	const buttonPulseStyle = useAnimatedStyle(() => ({
		transform: [{ scale: buttonScale.value }],
	}));

	const logoPulseStyle = useAnimatedStyle(() => ({
		transform: [{ scale: logoScale.value }],
	}));

	const handleNavigation = (route) => {
		Vibration.vibrate(40);
		try {
			router.push(route);
		} catch (error) {
			console.error("Navigation error:", error);
			setNavigationError("Failed to navigate. Please try again.");
		}
	};

	const current = rotatingTexts[textIndex];

	return (
		<TapGestureHandler onHandlerStateChange={onDoubleTap} numberOfTaps={2}>
			<View style={{ flex: 1, backgroundColor: "black" }}>
				<StatusBar
					hidden={!showStatusBar}
					translucent
					backgroundColor="transparent"
					barStyle="light-content"
				/>

				<ImageBackground
					source={require("../../assets/images/edge-bg.jpg")}
					resizeMode="stretch"
					style={StyleSheet.absoluteFill}
				>
					<Animated.View
						style={[
							{
								...StyleSheet.absoluteFillObject,
								justifyContent: "center",
								alignItems: "center",
								zIndex: 1,
							},
							logoPulseStyle,
						]}
					>
						<Image
							source={require("../../assets/images/icon.png")}
							style={{
								width: width,
								height: height,
							}}
							resizeMode="contain"
						/>
					</Animated.View>

					<View
						style={{
							flex: 1,
							justifyContent: "space-between",
							paddingHorizontal: 24,
							paddingVertical: 60,
						}}
					>
						<View
							style={{
								marginTop: 50,
							}}
						>
							<Text
								style={{
									color: "#ffffff",
									fontSize: 28,
									fontWeight: "800",
								}}
							>
								{typewriterText}
							</Text>
							<Animated.View
								key={textIndex}
								entering={SlideInRight.duration(1500)}
								exiting={SlideOutLeft.duration(1200)}
								style={{
									flexDirection: "row",
									alignItems: "center",
									marginTop: 14,
									maxWidth: "90%",
								}}
							>
								<MaterialCommunityIcons
									name={current.icon}
									size={22}
									color="#D7A77F"
									style={{ marginRight: 8 }}
								/>
								<Text
									style={{
										color: "#d1d5db",
										fontSize: 16,
										lineHeight: 22,
									}}
								>
									{current.text}
								</Text>
							</Animated.View>
						</View>

						{showButton && (
							<View
								style={[
									{
										flexDirection: "row",
										alignItems: "center",
										justifyContent: "center",
										marginBottom: 40,
										gap: 16,
									},
								]}
							>
								<Pressable
									onPress={() => handleNavigation("/sign-up")}
									style={[
										{
											flex: 1,
											paddingVertical: 12,
											borderRadius: 14,
											alignItems: "center",
											borderWidth: 2,
											borderColor: "#D7A77F",
											zIndex: 10,
										},
									]}
								>
									<Text
										style={[
											{
												fontSize: 18,
												fontWeight: "900",
												textShadowColor: "black",
												textShadowOffset: { width: 1.5, height: 2 },
												textShadowRadius: 3,
												transform: [{ translateY: -1 }, { translateX: -0.5 }],
											},
											{
												color: "#ffffff",
											},
										]}
									>
										Sign Up
									</Text>
								</Pressable>

								<Pressable
									onPress={() => handleNavigation("/sign-in")}
									style={[
										{
											flex: 1,
											paddingVertical: 12,
											borderRadius: 14,
											alignItems: "center",
											borderWidth: 2,
											borderColor: "#D7A77F",
											zIndex: 10,
										},
										{
											backgroundColor: "transparent",
											borderColor: "transparent",
										},
									]}
								>
									<Text
										style={[
											{
												fontSize: 18,
												fontWeight: "900",
												textShadowColor: "black",
												textShadowOffset: { width: 1.5, height: 2 },
												textShadowRadius: 3,
												transform: [{ translateY: -1 }, { translateX: -0.5 }],
											},
											{
												color: "#ffffff",
											},
										]}
									>
										Sign In
									</Text>
								</Pressable>
							</View>
						)}

						{navigationError && (
							<Text
								style={{
									color: "#EF4444",
									fontSize: 14,
									textAlign: "center",
									marginTop: 10,
								}}
							>
								{navigationError}
							</Text>
						)}
					</View>
				</ImageBackground>
			</View>
		</TapGestureHandler>
	);
}

const styles = StyleSheet.create({
	logoBackground: {
		...StyleSheet.absoluteFillObject,
		justifyContent: "center",
		alignItems: "center",
		zIndex: 1,
	},
});
