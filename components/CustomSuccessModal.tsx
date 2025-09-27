import React, { useEffect } from "react";
import { Text, Pressable, StyleSheet } from "react-native";
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withTiming,
	withSpring,
	runOnJS,
	withSequence,
	withRepeat,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";

interface CustomSuccessModalProps {
	visible: boolean;
	username: string;
	onClose: () => void;
	selectedFont?: string;
}

const CustomSuccessModal: React.FC<CustomSuccessModalProps> = ({
	visible,
	username,
	onClose,
}) => {
	const modalOpacity = useSharedValue(0);
	const modalScale = useSharedValue(0.8);
	const pulseAnim = useSharedValue(1);
	const buttonPulseAnim = useSharedValue(1);

	// Pulse animations
	useEffect(() => {
		if (visible) {
			pulseAnim.value = withRepeat(
				withSequence(
					withTiming(1.1, { duration: 1000 }),
					withTiming(1, { duration: 1000 }),
				),
				-1,
			);

			buttonPulseAnim.value = withRepeat(
				withSequence(
					withTiming(1.1, { duration: 1000 }),
					withTiming(1, { duration: 1000 }),
				),
				-1,
			);
		}
	}, [visible]);

	// Modal entrance/exit animations
	useEffect(() => {
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

	const pulseAnimatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: pulseAnim.value }],
	}));

	const buttonPulseAnimatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: buttonPulseAnim.value }],
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
					style={styles.modalBlur}
				>
					<Text style={styles.modalTitle}>Hey, {username}</Text>
					<Text style={styles.modalMessage}>
						Welcome to{" "}
						<Animated.Text
							style={[styles.modalEdgesNetwork, pulseAnimatedStyle]}
						>
							Edges Network
						</Animated.Text>{" "}
						🔥🔥
					</Text>
					<Text style={styles.modalMessageLeft}>
						📌 We break the wedge 🪓 delivering competitive prices. Making you
						have an edge in the network 💃
					</Text>
					<Text style={styles.modalMessageLeft}></Text>
					<Text style={styles.modalStayOnEdge}> 📢📢 STAY ON THE EDGE </Text>
					<Animated.View
						style={[buttonPulseAnimatedStyle, { alignSelf: "flex-end" }]}
					>
						<Pressable onPress={handleClose} style={styles.skipButton}>
							<Text style={styles.skipButtonText}>Skip</Text>
						</Pressable>
					</Animated.View>
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
		width: 300,
		borderRadius: 10,
		overflow: "hidden",
		borderWidth: 2,
		borderColor: "#8B4513",
		backgroundColor: "rgba(0, 0, 0, 0.92)", // Semi-transparent black
	},
	modalBlur: {
		padding: 20,
		backgroundColor: "rgba(0, 0, 0, 0.2)", // Semi-transparent black
	},
	modalTitle: {
		fontSize: 20,
		color: "white",
		fontWeight: "bold",
		marginBottom: 10,
		alignSelf: "center",
		textTransform: "capitalize",
	},
	modalMessage: {
		fontSize: 16,
		color: "white",
		textAlign: "center",
		marginBottom: 10,
	},
	modalEdgesNetwork: {
		fontSize: 18,
		color: "#8B4513",
		fontWeight: "bold",
	},
	modalMessageLeft: {
		fontSize: 16,
		color: "white",
		textAlign: "left",
		marginBottom: 10,
		alignSelf: "flex-start",
	},
	modalStayOnEdge: {
		fontSize: 13,
		color: "white",
		fontWeight: "bold",
		textAlign: "right",
		marginBottom: 20,
		textTransform: "uppercase",
		alignSelf: "flex-end",
	},
	skipButton: {
		paddingVertical: 5,
		paddingHorizontal: 13,
		backgroundColor: "#8B4513",
		borderRadius: 5,
	},
	skipButtonText: {
		color: "white",
		fontSize: 16,
		fontWeight: "bold",
	},
});

export default CustomSuccessModal;
