import Buttons from "@/components/AnimatedButton";
import RotatingText from "@/components/RotatingText";
import { fullWelcomeText, rotatingTexts } from "@/constants/helper";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
	Dimensions,
	Image,
	ImageBackground,
	StatusBar,
	StyleSheet,
	Text,
	Vibration,
	View,
} from "react-native";
import {
	State,
	TapGestureHandler,
	TapGestureHandlerStateChangeEvent,
} from "react-native-gesture-handler";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withSequence,
	withTiming,
} from "react-native-reanimated";

const { width, height } = Dimensions.get("window");

export default function WelcomeScreen() {
	const [showButton, setShowButton] = useState(false);
	const [showStatusBar, setShowStatusBar] = useState(false);
	const [textIndex, setTextIndex] = useState(0);
	const [typewriterText, setTypewriterText] = useState("");
	const [navigationError, setNavigationError] = useState<string | null>(null);

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
				const timeout = setTimeout(() => setShowButton(true), 500);
				return () => clearTimeout(timeout); // Cleanup right when we set it
			}
		}, 50);
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

	const onDoubleTap = ({ nativeEvent }: TapGestureHandlerStateChangeEvent) => {
		if (nativeEvent.state === State.ACTIVE) {
			setShowStatusBar(true);
		}
	};

	const logoPulseStyle = useAnimatedStyle(() => ({
		transform: [{ scale: logoScale.value }],
	}));

	const handleNavigation = (route: "/sign-in" | "/sign-up") => {
		Vibration.vibrate(40);
		try {
			router.push(route);
		} catch (error) {
			console.error("Navigation error:", error);
			setNavigationError("Failed to navigate. Please try again.");
		}
	};

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
							<RotatingText texts={rotatingTexts} />
						</View>

						{showButton && (
							<Buttons
								handleNavigation={handleNavigation}
								buttonScale={buttonScale}
							/>
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
