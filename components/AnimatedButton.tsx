// components/Buttons.tsx
import React from "react";
import { Pressable, View, Text } from "react-native";
import { ButtonsProps } from "@/types/components";
import Animated, {
	SlideInRight,
	useAnimatedStyle,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedView = Animated.createAnimatedComponent(View);

const Buttons: React.FC<ButtonsProps> = ({ handleNavigation, buttonScale }) => {
	const buttonStyle = useAnimatedStyle(() => ({
		transform: [{ scale: buttonScale.value }],
	}));

	return (
		<AnimatedView
			entering={SlideInRight.duration(800)}
			style={{
				flexDirection: "row",
				alignItems: "center",
				justifyContent: "center",
				marginBottom: 40,
				gap: 16,
				zIndex: 2,
			}}
		>
			<AnimatedPressable
				onPress={() => handleNavigation("/sign-up", "signup")} // Removed the second argument
				accessibilityRole="button"
				accessibilityLabel="Sign up for a new account"
				accessibilityHint="Creates a new user account"
				style={[
					buttonStyle,
					{
						flex: 1,
						paddingVertical: 12,
						borderRadius: 14,
						alignItems: "center",
						borderWidth: 2,
						borderColor: "#D7A77F",
						// zIndex: 10,
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
			</AnimatedPressable>

			<AnimatedPressable
				onPress={() => handleNavigation("/sign-in", "signin")} // Removed the second argument
				accessibilityRole="button"
				accessibilityLabel="Sign in to existing account"
				accessibilityHint="Log in with existing credentials"
				style={[
					buttonStyle,
					{
						flex: 1,
						paddingVertical: 12,
						borderRadius: 14,
						alignItems: "center",
						borderWidth: 2,
						// zIndex: 10,
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
			</AnimatedPressable>
		</AnimatedView>
	);
};

export default Buttons;
