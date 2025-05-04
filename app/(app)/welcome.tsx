// import React, { useEffect, useState } from "react";
// import {
//   View,
//   Text,
//   ImageBackground,
//   Pressable,
//   Dimensions,
//   StatusBar,
//   StyleSheet,
//   Vibration,
//   Image,
// } from "react-native";
// import { useRouter } from "expo-router";
// import Animated, {
//   SlideInRight,
//   SlideOutLeft,
//   useSharedValue,
//   useAnimatedStyle,
//   withRepeat,
//   withSequence,
//   withTiming,
// } from "react-native-reanimated";
// import { TapGestureHandler, State } from "react-native-gesture-handler";
// import { MaterialCommunityIcons } from "@expo/vector-icons";

// const { width, height } = Dimensions.get("window");

// const rotatingTexts = [
//   {
//     text: "Buy Data, Cable and Internet Subscription 💰💰",
//     icon: "access-point-network",
//   },
//   {
//     text: "Seamlessly and Instantly 💨💨💨",
//     icon: "flash",
//   },
//   {
//     text: "Get Free 15GB 🎉🎉🎉",
//     icon: "gift",
//   },
// ];

// export default function WelcomeScreen() {
//   const router = useRouter();
//   const [showButton, setShowButton] = useState(false);
//   const [showStatusBar, setShowStatusBar] = useState(false);
//   const [textIndex, setTextIndex] = useState(0);
//   const [typewriterText, setTypewriterText] = useState("");
//   const [navigationError, setNavigationError] = useState(null);

//   const fullWelcomeText = "Welcome";
//   const scale = useSharedValue(1);
//   const buttonScale = useSharedValue(1);
//   const logoScale = useSharedValue(1);

//   // Typewriter effect
//   useEffect(() => {
//     let currentIndex = 0;
//     const interval = setInterval(() => {
//       setTypewriterText(fullWelcomeText.slice(0, currentIndex + 1));
//       currentIndex++;
//       if (currentIndex === fullWelcomeText.length) {
//         clearInterval(interval);
//         setTimeout(() => setShowButton(true), 500);
//       }
//     }, 250);
//     return () => clearInterval(interval);
//   }, []);

//   // Pulse animations
//   useEffect(() => {
//     scale.value = withRepeat(
//       withSequence(
//         withTiming(1.05, { duration: 1000 }),
//         withTiming(1, { duration: 1000 }),
//       ),
//       -1,
//       true,
//     );

//     buttonScale.value = withRepeat(
//       withSequence(
//         withTiming(1.01, { duration: 2000 }),
//         withTiming(1, { duration: 2000 }),
//       ),
//       -1,
//       true,
//     );

//     logoScale.value = withRepeat(
//       withSequence(
//         withTiming(1.03, { duration: 1500 }),
//         withTiming(1, { duration: 1500 }),
//       ),
//       -1,
//       true,
//     );
//   }, []);

//   // Rotating text effect
//   useEffect(() => {
//     const interval = setInterval(() => {
//       setTextIndex((prev) => (prev + 1) % rotatingTexts.length);
//     }, 4000);
//     return () => clearInterval(interval);
//   }, []);

//   const onDoubleTap = ({ nativeEvent }) => {
//     if (nativeEvent.state === State.ACTIVE) {
//       setShowStatusBar(true);
//     }
//   };

//   const pulseStyle = useAnimatedStyle(() => ({
//     transform: [{ scale: scale.value }],
//   }));

//   const buttonPulseStyle = useAnimatedStyle(() => ({
//     transform: [{ scale: buttonScale.value }],
//   }));

//   const logoPulseStyle = useAnimatedStyle(() => ({
//     transform: [{ scale: logoScale.value }],
//   }));

//   // Updated navigation handler
//   const handleNavigation = (route) => {
//     Vibration.vibrate(40);
//     try {
//       router.push(route); // Changed from replace to push
//     } catch (error) {
//       console.error("Navigation error:", error);
//       setNavigationError("Failed to navigate. Please try again.");
//     }
//   };

//   const current = rotatingTexts[textIndex];

//   return (
//     <TapGestureHandler onHandlerStateChange={onDoubleTap} numberOfTaps={2}>
//       <View style={styles.container}>
//         <StatusBar
//           hidden={!showStatusBar}
//           translucent
//           backgroundColor="transparent"
//           barStyle="light-content"
//         />

//         <ImageBackground
//           source={require("../../assets/edge-bg.jpg")}
//           resizeMode="stretch"
//           style={StyleSheet.absoluteFill}
//         >
//           <Animated.View style={[styles.logoBackground, logoPulseStyle]}>
//             <Image
//               source={require("../../assets/edge-logo.png")}
//               style={styles.logo}
//               resizeMode="contain"
//             />
//           </Animated.View>
//           <View style={styles.content}>
//             <View style={styles.topText}>
//               <Text style={styles.title}>{typewriterText}</Text>
//               <Animated.View
//                 key={textIndex}
//                 entering={SlideInRight.duration(1500)}
//                 exiting={SlideOutLeft.duration(1200)}
//                 style={styles.descriptionRow}
//               >
//                 <MaterialCommunityIcons
//                   name={current.icon}
//                   size={22}
//                   color="#D7A77F"
//                   style={{ marginRight: 8 }}
//                 />
//                 <Text style={styles.description}>{current.text}</Text>
//               </Animated.View>
//             </View>

//             <Animated.View
//               entering={SlideInRight.duration(1000)}
//               style={[styles.buttonWrapper, buttonPulseStyle]}
//             >
//               <Pressable
//                 onPress={() => handleNavigation("/(auth)/sign-up")} // Ensure case matches your folder structure
//                 style={styles.button}
//                 android_ripple={{ color: 'rgba(215,167,127,0.3)' }} // Add ripple effect for Android
//               >
//                 <Text style={[styles.buttonText3D, styles.signUpText]}>Sign Up</Text>
//               </Pressable>

//               <Pressable
//                 onPress={() => handleNavigation("/(auth)/sign-in")} // Ensure case matches your folder structure
//                 style={[styles.button, styles.secondaryButton]}
//                 android_ripple={{ color: 'rgba(215,167,127,0.3)' }}
//               >
//                 <Text style={[styles.buttonText3D, styles.signInText]}>Sign In</Text>
//               </Pressable>
//             </Animated.View>

//             {navigationError && (
//               <Text style={styles.errorText}>{navigationError}</Text>
//             )}
//           </View>
//         </ImageBackground>
//       </View>
//     </TapGestureHandler>
//   );
// }


// const styles = StyleSheet.create({
// 	container: {
// 		flex: 1,
// 		backgroundColor: "black",
// 	},
// 	content: {
// 		flex: 1,
// 		justifyContent: "space-between",
// 		paddingHorizontal: 24,
// 		paddingVertical: 60,
// 	},
// 	logoContainer: {
// 		alignItems: "center",
// 		marginTop: 40,
// 		marginBottom: 20,
// 	},
// 	logoBackground: {
// 		...StyleSheet.absoluteFillObject,
// 		justifyContent: "center",
// 		alignItems: "center",
// 		zIndex: 1, // Send to back
// 		// opacity: 0.08, // Optional: makes it faint in background
// 	},
// 	logo: {
// 		width: width, // 50% of screen width
// 		height: height, // Maintain aspect ratio (assuming 2:1 width:height)
// 	},
// 	topText: {
// 		marginTop: 50,
// 	},
// 	title: {
// 		color: "#ffffff",
// 		fontSize: 28,
// 		fontWeight: "800",
// 	},
// 	brand: {
// 		color: "#B87E50",
// 		fontSize: 34,
// 		fontWeight: "800",
// 		marginTop: 6,
// 	},
// 	descriptionRow: {
// 		flexDirection: "row",
// 		alignItems: "center",
// 		marginTop: 14,
// 		maxWidth: "90%",
// 	},
// 	description: {
// 		color: "#d1d5db",
// 		fontSize: 16,
// 		lineHeight: 22,
// 	},
// 	buttonWrapper: {
// 		flexDirection: "row",
// 		alignItems: "center",
// 		justifyContent: "center",
// 		marginBottom: 40,
// 		gap: 16,
// 	},

// 	button: {
// 		flex: 1,
// 		// backgroundColor: "#D7A77F",
// 		paddingVertical: 12,
// 		borderRadius: 14,
// 		alignItems: "center",
// 		borderWidth: 2,
// 		borderColor: "#D7A77F",
// 		zIndex: 10,
// 	},

// 	secondaryButton: {
// 		backgroundColor: "transparent",
// 		borderColor: "transparent",
// 	},

// 	buttonText3D: {
// 		fontSize: 18,
// 		fontWeight: "900",
// 		textShadowColor: "black",
// 		textShadowOffset: { width: 1.5, height: 2 },
// 		textShadowRadius: 3,
// 		transform: [{ translateY: -1 }, { translateX: -0.5 }],
// 	},

// 	signUpText: {
// 		color: "#ffffff",
// 	},

// 	signInText: {
// 		color: "#ffffff",
// 	},
// 	errorText: {
// 		color: "#EF4444",
// 		fontSize: 14,
// 		textAlign: "center",
// 		marginTop: 10,
// 	},
// });
import React, { useEffect, useState } from "react";
import {
	View,
	Text,
	ImageBackground,
	Pressable,
	Dimensions,
	StatusBar,
	StyleSheet,
	Vibration,
	Image,
} from "react-native";
import { useRouter } from "expo-router";
import Animated, {
	SlideInRight,
	SlideOutLeft,
	useSharedValue,
	useAnimatedStyle,
	withRepeat,
	withSequence,
	withTiming,
} from "react-native-reanimated";
import { TapGestureHandler, State } from "react-native-gesture-handler";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

const rotatingTexts = [
	{
		text: "Buy Data, Cable and Internet Subscription 💰💰",
		icon: "access-point-network",
	},
	{
		text: "Seamlessly and Instantly 💨💨💨",
		icon: "flash",
	},
	{
		text: "Get Free 15GB 🎉🎉🎉",
		icon: "gift",
	},
];

export default function WelcomeScreen() {
	const router = useRouter();
	const [showButton, setShowButton] = useState(false);
	const [showStatusBar, setShowStatusBar] = useState(false);
	const [textIndex, setTextIndex] = useState(0);
	const [typewriterText, setTypewriterText] = useState("");

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
				withTiming(1, { duration: 1000 })
			),
			-1,
			true
		);

		buttonScale.value = withRepeat(
			withSequence(
				withTiming(1.01, { duration: 2000 }),
				withTiming(1, { duration: 2000 })
			),
			-1,
			true
		);

		logoScale.value = withRepeat(
			withSequence(
				withTiming(1.03, { duration: 1500 }),
				withTiming(1, { duration: 1500 })
			),
			-1,
			true
		);
	}, []);

	// Rotating text effect
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
		}
	};

	const current = rotatingTexts[textIndex];

	return (
		<TapGestureHandler onHandlerStateChange={onDoubleTap} numberOfTaps={2}>
			<View style={styles.container}>
				<StatusBar
					hidden={!showStatusBar}
					translucent
					backgroundColor="transparent"
					barStyle="light-content"
				/>

				<ImageBackground
					source={require("../../assets/edge-bg.jpg")}
					resizeMode="stretch"
					style={StyleSheet.absoluteFill}
				>
					<Animated.View style={[styles.logoBackground, logoPulseStyle]}>
						<Image
							source={require("../../assets/edge-logo.png")}
							style={styles.logo}
							resizeMode="contain"
						/>
					</Animated.View>

					<View style={styles.content}>
						<View style={styles.topText}>
							<Text style={styles.title}>{typewriterText}</Text>
							<Animated.View
								key={textIndex}
								entering={SlideInRight.duration(1500)}
								exiting={SlideOutLeft.duration(1200)}
								style={styles.descriptionRow}
							>
								<MaterialCommunityIcons
									name={current.icon}
									size={22}
									color="#D7A77F"
									style={{ marginRight: 8 }}
								/>
								<Text style={styles.description}>{current.text}</Text>
							</Animated.View>
						</View>

						{showButton && (
							<Animated.View
								entering={SlideInRight.duration(1000)}
								style={[styles.buttonWrapper, buttonPulseStyle]}
							>
								<Pressable
									onPress={() => handleNavigation("/(Auth)/sign-up")}
									style={styles.button}
								>
									<Text style={[styles.buttonText3D, styles.signUpText]}>
										Sign Up
									</Text>
								</Pressable>

								<Pressable
									onPress={() => handleNavigation("/(Auth)/sign-in")}
									style={[styles.button, styles.secondaryButton]}
								>
									<Text style={[styles.buttonText3D, styles.signInText]}>
										Sign In
									</Text>
								</Pressable>
							</Animated.View>
						)}
					</View>
				</ImageBackground>
			</View>
		</TapGestureHandler>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "black",
	},
	content: {
		flex: 1,
		justifyContent: "space-between",
		paddingHorizontal: 24,
		paddingVertical: 60,
	},
	logoBackground: {
		...StyleSheet.absoluteFillObject,
		justifyContent: "center",
		alignItems: "center",
		zIndex: 1,
	},
	logo: {
		width: width,
		height: height,
	},
	topText: {
		marginTop: 50,
	},
	title: {
		color: "#ffffff",
		fontSize: 28,
		fontWeight: "800",
	},
	descriptionRow: {
		flexDirection: "row",
		alignItems: "center",
		marginTop: 14,
		maxWidth: "90%",
	},
	description: {
		color: "#d1d5db",
		fontSize: 16,
		lineHeight: 22,
	},
	buttonWrapper: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 40,
		gap: 16,
	},
	button: {
		flex: 1,
		paddingVertical: 12,
		borderRadius: 14,
		alignItems: "center",
		borderWidth: 2,
		borderColor: "#D7A77F",
	},
	secondaryButton: {
		backgroundColor: "transparent",
		borderColor: "transparent",
	},
	buttonText3D: {
		fontSize: 18,
		fontWeight: "900",
		textShadowColor: "black",
		textShadowOffset: { width: 1.5, height: 2 },
		textShadowRadius: 3,
		transform: [{ translateY: -1 }, { translateX: -0.5 }],
	},
	signUpText: {
		color: "#ffffff",
	},
	signInText: {
		color: "#ffffff",
	},
});
