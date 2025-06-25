import React from "react";
import {
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	StyleSheet,
	Dimensions,
} from "react-native";
import { BlurView } from "expo-blur";
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withTiming,
	withSpring,
	runOnJS,
} from "react-native-reanimated";
import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";

const { width, height } = Dimensions.get("window");

interface ReusableModalProps {
	visible: boolean;
	onClose: () => void;
	title: string;
	children: React.ReactNode;
	colorScheme: string;
	selectedFont?: string;
}

const ReusableModal: React.FC<ReusableModalProps> = ({
	visible,
	onClose,
	title,
	children,
	colorScheme,
	selectedFont,
}) => {
	const modalOpacity = useSharedValue(0);
	const modalScale = useSharedValue(0.8);

	React.useEffect(() => {
		if (visible) {
			modalOpacity.value = withTiming(1, { duration: 300 });
			modalScale.value = withSpring(1);
		} else {
			modalOpacity.value = withTiming(0, { duration: 300 });
			modalScale.value = withTiming(0.8, { duration: 300 });
		}
	}, [visible]);

	const modalAnimatedStyle = useAnimatedStyle(() => ({
		opacity: modalOpacity.value,
		transform: [{ scale: modalScale.value }],
	}));

	const handleClose = () => {
		modalOpacity.value = withTiming(0, { duration: 300 });
		modalScale.value = withTiming(0.8, { duration: 300 }, () => {
			runOnJS(onClose)();
		});
	};

	if (!visible) return null;

	return (
		<Animated.View style={styles.modalOverlay}>
			<Animated.View style={[styles.modalContainer, modalAnimatedStyle]}>
				<BlurView
					intensity={100}
					tint={colorScheme === "dark" ? "dark" : "light"}
					style={styles.modalBlur}
				>
					<Text
						style={[
							styles.modalTitle,
							{
								color: colors[colorScheme]?.foreground,
								fontFamily: selectedFont || fonts.default,
							},
						]}
					>
						{title}
					</Text>

					<ScrollView style={styles.modalScroll}>{children}</ScrollView>

					<TouchableOpacity
						style={[
							styles.modalCloseButton,
							// { borderWidth: 2, borderColor: colors[colorScheme]?.border },
							{ backgroundColor: colors[colorScheme]?.button },
						]}
						onPress={handleClose}
					>
						<Text
							style={[
								styles.modalCloseText,
								{
									color: colors[colorScheme]?.mutedForeground,
									fontFamily: selectedFont || fonts.default,
								},
							]}
						>
							Close
						</Text>
					</TouchableOpacity>
				</BlurView>
			</Animated.View>
		</Animated.View>
	);
};

const styles = StyleSheet.create({
	modalOverlay: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: "rgba(0,0,0,0.6)",
		justifyContent: "center",
		alignItems: "center",
		zIndex: 1000,
	},
	modalContainer: {
		width: width * 0.85,
		maxHeight: height * 0.7,
		borderRadius: 12,
		overflow: "hidden",
	},
	modalBlur: {
		padding: 20,
		borderRadius: 24,
	},
	modalTitle: {
		fontSize: 20,
		fontWeight: "600",
		textAlign: "center",
		marginBottom: 16,
	},
	modalScroll: {
		maxHeight: height * 0.5,
	},
	modalCloseButton: {
		padding: 14,
		borderRadius: 12,
		marginTop: 16,
	},
	modalCloseText: {
		fontSize: 16,
		fontWeight: "600",
		textAlign: "center",
	},
});

export default ReusableModal;
