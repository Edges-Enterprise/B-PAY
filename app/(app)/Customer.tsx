// import React, { useEffect, useRef, useState } from "react";
// import {
// 	View,
// 	Text,
// 	StyleSheet,
// 	Animated,
// 	ScrollView,
// 	TextInput,
// 	TouchableOpacity,
// 	Linking,
// 	Alert,
// } from "react-native";
// import { Dimensions } from "react-native";
// import Ionicons from "@expo/vector-icons/Ionicons";

// // Auth context
// import { useAuth } from "@/context/supabase-provider"; // Adjust path as needed

// // Get screen dimensions
// const { width } = Dimensions.get("window");
// const scaleSize = (size: number) => (width / 375) * size;
// const scaleFont = (size: number) => (width / 375) * size;

// const CustomerCare: React.FC = () => {
// 	// Use centralized auth state
// 	const { user, profile } = useAuth();
// 	const [title, setTitle] = useState("");
// 	const [description, setDescription] = useState("");
// 	const [modalVisible, setModalVisible] = useState(false);
// 	const [modalMessage, setModalMessage] = useState("");

// 	const pulseAnim = useRef(new Animated.Value(1)).current;
// 	const whatsappPulseAnim = useRef(new Animated.Value(1)).current;
// 	const fadeAnim = useRef(new Animated.Value(0)).current;

// 	// Animations
// 	useEffect(() => {
// 		Animated.loop(
// 			Animated.sequence([
// 				Animated.timing(pulseAnim, {
// 					toValue: 1.05,
// 					duration: 750,
// 					useNativeDriver: true,
// 				}),
// 				Animated.timing(pulseAnim, {
// 					toValue: 1,
// 					duration: 750,
// 					useNativeDriver: true,
// 				}),
// 			]),
// 		).start();

// 		Animated.loop(
// 			Animated.sequence([
// 				Animated.timing(whatsappPulseAnim, {
// 					toValue: 1.05,
// 					duration: 750,
// 					useNativeDriver: true,
// 				}),
// 				Animated.timing(whatsappPulseAnim, {
// 					toValue: 1,
// 					duration: 750,
// 					useNativeDriver: true,
// 				}),
// 			]),
// 		).start();

// 		Animated.timing(fadeAnim, {
// 			toValue: 1,
// 			duration: 500,
// 			useNativeDriver: true,
// 		}).start();
// 	}, []);

// 	const handleWhatsAppContact = () => {
// 		if (!title || !description) {
// 			const username = profile?.username || user?.email.split("@")[0] || "User";
// 			setModalMessage(
// 				`Hello ${username},\nPlease first fill in the title and description of your issue, then click on the Whatsapp icon or Submit button.`,
// 			);
// 			setModalVisible(true);
// 			return;
// 		}

// 		const adminWhatsAppNumber = "+2347057517841";
// 		const userIdentifier = profile?.username || user?.email || "Anonymous";
// 		const message = `Hello, I am ${userIdentifier} requesting assistance from Edges Network with an issue
// Title: ${title}
// Description: ${description}`;
// 		const whatsappUrl = `https://wa.me/${adminWhatsAppNumber}?text=${encodeURIComponent(message)}`;

// 		Linking.openURL(whatsappUrl).catch((err) => {
// 			console.error("Error opening WhatsApp:", err);
// 			Alert.alert("Error", "Unable to open WhatsApp. Please try again.");
// 		});

// 		// Clear form after sending
// 		setTitle("");
// 		setDescription("");
// 	};

// 	return (
// 		<Animated.View style={[styles.rootContainer, { opacity: fadeAnim }]}>
// 			<ScrollView
// 				style={styles.scrollContainer}
// 				contentContainerStyle={styles.innerContainer}
// 				showsVerticalScrollIndicator={false}
// 			>
// 				<View style={styles.contentContainer}>
// 					<View style={styles.heroCard}>
// 						<Text style={styles.headline}>Need Help?</Text>
// 						<Text style={styles.subheadline}>
// 							Submit your issue below or{" "}
// 							<Text style={styles.subheadlines}>contact us on WhatsApp</Text>.
// 							Our team at{" "}
// 							<Text style={styles.subheadlines}>
// 								edgesenterprise@outlook.com
// 							</Text>{" "}
// 							will assist you.
// 						</Text>
// 						<TextInput
// 							style={styles.input}
// 							value={title}
// 							onChangeText={setTitle}
// 							placeholder="Issue Title"
// 							placeholderTextColor="#B0B0B0"
// 						/>
// 						<TextInput
// 							style={[styles.input, styles.textArea]}
// 							value={description}
// 							onChangeText={setDescription}
// 							placeholder="Describe your issue"
// 							placeholderTextColor="#B0B0B0"
// 							multiline
// 						/>
// 						<Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
// 							<TouchableOpacity
// 								style={styles.ctaButton}
// 								onPress={handleWhatsAppContact}
// 							>
// 								<Text style={styles.ctaText}>Submit Issue</Text>
// 							</TouchableOpacity>
// 						</Animated.View>
// 					</View>

// 					<View style={styles.tierCard}>
// 						<Text style={styles.cardTitle}>Frequently Asked Questions</Text>
// 						<View style={styles.faqItem}>
// 							<Text style={styles.faqQuestion}>How do I buy data?</Text>
// 							<Text style={styles.faqAnswer}>
// 								Go to the Data section, select your plan, and follow the payment
// 								steps.
// 							</Text>
// 						</View>
// 						<View style={styles.faqItem}>
// 							<Text style={styles.faqQuestion}>
// 								Why is my data not working?
// 							</Text>
// 							<Text style={styles.faqAnswer}>
// 								Check your network or contact support with your purchase
// 								details.
// 							</Text>
// 						</View>
// 						<View style={styles.faqItem}>
// 							<Text style={styles.faqQuestion}>How do I track referrals?</Text>
// 							<Text style={styles.faqAnswer}>
// 								Visit the Refer & Earn page to see your referral history.
// 							</Text>
// 						</View>
// 					</View>

// 					<Animated.View style={{ transform: [{ scale: whatsappPulseAnim }] }}>
// 						<TouchableOpacity
// 							style={styles.whatsappButton}
// 							onPress={handleWhatsAppContact}
// 						>
// 							<Ionicons
// 								name="logo-whatsapp"
// 								size={scaleFont(32)}
// 								color="#FFFFFF"
// 							/>
// 						</TouchableOpacity>
// 					</Animated.View>
// 				</View>
// 			</ScrollView>

// 			{/* Custom Modal */}
// 			{modalVisible && (
// 				<View style={styles.modalOverlay}>
// 					<View style={styles.modalContainer}>
// 						<Text style={styles.modalText}>{modalMessage}</Text>
// 						<TouchableOpacity
// 							style={styles.modalButton}
// 							onPress={() => setModalVisible(false)}
// 						>
// 							<Text style={styles.modalButtonText}>OK</Text>
// 						</TouchableOpacity>
// 					</View>
// 				</View>
// 			)}
// 		</Animated.View>
// 	);
// };

// const styles = StyleSheet.create({
// 	rootContainer: {
// 		flex: 1,
// 		backgroundColor: "#000000",
// 	},
// 	scrollContainer: {
// 		flex: 1,
// 		backgroundColor: "#000000",
// 	},
// 	innerContainer: {
// 		paddingHorizontal: scaleSize(16),
// 		flexGrow: 1,
// 		backgroundColor: "#000000",
// 		paddingBottom: scaleSize(20),
// 	},
// 	contentContainer: {
// 		marginTop: scaleSize(16),
// 		alignItems: "center",
// 	},
// 	heroCard: {
// 		backgroundColor: "rgba(28, 28, 30, 0.9)",
// 		borderRadius: scaleSize(12),
// 		padding: scaleSize(16),
// 		marginBottom: scaleSize(16),
// 		width: "100%",
// 		borderWidth: 1,
// 		borderColor: "#D7A77F",
// 		shadowColor: "#000000",
// 		shadowOffset: { width: 0, height: 2 },
// 		shadowOpacity: 0.2,
// 		shadowRadius: 4,
// 		elevation: 4,
// 	},
// 	headline: {
// 		fontSize: scaleFont(20),
// 		fontWeight: "700",
// 		color: "#D7A77F",
// 		textAlign: "center",
// 		marginBottom: scaleSize(8),
// 	},
// 	subheadlines: {
// 		color: "#3B82F6",
// 	},
// 	subheadline: {
// 		fontSize: scaleFont(14),
// 		fontWeight: "400",
// 		color: "#B0B0B0",
// 		textAlign: "center",
// 		marginBottom: scaleSize(16),
// 	},
// 	input: {
// 		backgroundColor: "#2C2C2E",
// 		borderRadius: scaleSize(8),
// 		padding: scaleSize(12),
// 		color: "#FFFFFF",
// 		fontSize: scaleFont(14),
// 		marginBottom: scaleSize(12),
// 	},
// 	textArea: {
// 		height: scaleSize(100),
// 		textAlignVertical: "top",
// 	},
// 	ctaButton: {
// 		backgroundColor: "#744925",
// 		borderRadius: scaleSize(8),
// 		padding: scaleSize(12),
// 		alignItems: "center",
// 	},
// 	ctaText: {
// 		fontSize: scaleFont(16),
// 		fontWeight: "600",
// 		color: "#FFF",
// 	},
// 	whatsappButton: {
// 		backgroundColor: "#25D366",
// 		borderRadius: scaleSize(50),
// 		width: scaleSize(60),
// 		height: scaleSize(60),
// 		alignItems: "center",
// 		justifyContent: "center",
// 		position: "absolute",
// 		bottom: scaleSize(10),
// 		left: scaleSize(110),
// 		zIndex: 10,
// 	},
// 	tierCard: {
// 		backgroundColor: "rgba(28, 28, 30, 0.9)",
// 		borderRadius: scaleSize(12),
// 		padding: scaleSize(16),
// 		marginBottom: scaleSize(16),
// 		width: "100%",
// 		borderWidth: 1,
// 		borderColor: "#D7A77F",
// 		shadowColor: "#000000",
// 		shadowOffset: { width: 0, height: 2 },
// 		shadowOpacity: 0.2,
// 		shadowRadius: 4,
// 		elevation: 4,
// 	},
// 	cardTitle: {
// 		fontSize: scaleFont(16),
// 		fontWeight: "600",
// 		color: "#FFFFFF",
// 		marginBottom: scaleSize(12),
// 	},
// 	faqItem: {
// 		marginHorizontal: scaleSize(12),
// 		marginBottom: scaleSize(12),
// 	},
// 	faqQuestion: {
// 		fontSize: scaleFont(14),
// 		fontWeight: "600",
// 		color: "#D7A77F",
// 	},
// 	faqAnswer: {
// 		fontSize: scaleFont(12),
// 		fontWeight: "400",
// 		color: "#B0B0B0",
// 		marginTop: scaleSize(4),
// 	},
// 	modalOverlay: {
// 		position: "absolute",
// 		top: 0,
// 		left: 0,
// 		right: 0,
// 		bottom: 0,
// 		backgroundColor: "rgba(0, 0, 0, 0.8)",
// 		justifyContent: "center",
// 		alignItems: "center",
// 		zIndex: 999,
// 	},
// 	modalContainer: {
// 		backgroundColor: "#1C1C1E",
// 		padding: scaleSize(20),
// 		borderRadius: scaleSize(12),
// 		width: "80%",
// 		alignItems: "center",
// 	},
// 	modalText: {
// 		color: "#FFFFFF",
// 		fontSize: scaleFont(16),
// 		textAlign: "center",
// 		marginBottom: scaleSize(16),
// 	},
// 	modalButton: {
// 		backgroundColor: "#744925",
// 		paddingVertical: scaleSize(8),
// 		paddingHorizontal: scaleSize(16),
// 		borderRadius: scaleSize(8),
// 	},
// 	modalButtonText: {
// 		color: "#FFFFFF",
// 		fontSize: scaleFont(14),
// 		fontWeight: "600",
// 	},
// });

// export default CustomerCare;

import React, { useEffect, useRef, useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	Animated,
	ScrollView,
	TextInput,
	TouchableOpacity,
	Linking,
	Alert,
} from "react-native";
import { Dimensions } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

// Auth context
import { useAuth } from "@/context/supabase-provider"; // Adjust path as needed

// Get screen dimensions
const { width } = Dimensions.get("window");
const scaleSize = (size: number) => (width / 375) * size;
const scaleFont = (size: number) => (width / 375) * size;

const CustomerCare: React.FC = () => {
	// Use centralized auth state
	const { user, profile } = useAuth();
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [modalVisible, setModalVisible] = useState(false);
	const [modalMessage, setModalMessage] = useState("");

	const pulseAnim = useRef(new Animated.Value(1)).current;
	const whatsappPulseAnim = useRef(new Animated.Value(1)).current;
	const fadeAnim = useRef(new Animated.Value(0)).current;

	// Animations
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

		Animated.loop(
			Animated.sequence([
				Animated.timing(whatsappPulseAnim, {
					toValue: 1.05,
					duration: 750,
					useNativeDriver: true,
				}),
				Animated.timing(whatsappPulseAnim, {
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
	}, []);

	const handleWhatsAppContact = () => {
		if (!title || !description) {
			const username = profile?.username || user?.email.split("@")[0] || "User";
			setModalMessage(
				`Hello ${username},\nPlease first fill in the title and description of your issue, then click on the Whatsapp icon or Submit button.`,
			);
			setModalVisible(true);
			return;
		}

		const adminWhatsAppNumber = "+2347057517841";
		const userIdentifier = profile?.username || user?.email || "Anonymous";
		const message = `Hello, I am ${userIdentifier} requesting assistance from Edges Network with an issue
Title: ${title}
Description: ${description}`;
		const whatsappUrl = `https://wa.me/${adminWhatsAppNumber}?text=${encodeURIComponent(message)}`;

		Linking.openURL(whatsappUrl).catch((err) => {
			console.error("Error opening WhatsApp:", err);
			Alert.alert("Error", "Unable to open WhatsApp. Please try again.");
		});

		// Clear form after sending
		setTitle("");
		setDescription("");
	};

	const handleEmailContact = () => {
		const email = "edgesenterprise@outlook.com";
		const subject = encodeURIComponent(title || "Customer Support Request");
		const body = encodeURIComponent(
			description || "Hello, I need assistance from Edges Network.",
		);
		const emailUrl = `mailto:${email}?subject=${subject}&body=${body}`;

		Linking.openURL(emailUrl).catch((err) => {
			console.error("Error opening email client:", err);
			Alert.alert("Error", "Unable to open email client. Please try again.");
		});
	};

	return (
		<Animated.View style={[styles.rootContainer, { opacity: fadeAnim }]}>
			<ScrollView
				style={styles.scrollContainer}
				contentContainerStyle={styles.innerContainer}
				showsVerticalScrollIndicator={false}
			>
				<View style={styles.contentContainer}>
					<View style={styles.heroCard}>
						<Text style={styles.headline}>Need Help?</Text>
						<Text style={styles.subheadline}>
							Submit your issue below or{" "}
							<Text style={styles.subheadlines} onPress={handleWhatsAppContact}>
								contact us on WhatsApp
							</Text>
							. Our team at{" "}
							<Text style={styles.subheadlines} onPress={handleEmailContact}>
								edgesenterprise@outlook.com
							</Text>{" "}
							will assist you.
						</Text>
						<TextInput
							style={styles.input}
							value={title}
							onChangeText={setTitle}
							placeholder="Issue Title"
							placeholderTextColor="#B0B0B0"
						/>
						<TextInput
							style={[styles.input, styles.textArea]}
							value={description}
							onChangeText={setDescription}
							placeholder="Describe your issue"
							placeholderTextColor="#B0B0B0"
							multiline
						/>
						<Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
							<TouchableOpacity
								style={styles.ctaButton}
								onPress={handleWhatsAppContact}
							>
								<Text style={styles.ctaText}>Submit Issue</Text>
							</TouchableOpacity>
						</Animated.View>
					</View>

					<View style={styles.tierCard}>
						<Text style={styles.cardTitle}>Frequently Asked Questions</Text>
						<View style={styles.faqItem}>
							<Text style={styles.faqQuestion}>How do I buy data?</Text>
							<Text style={styles.faqAnswer}>
								Go to the Data section, select your plan, and follow the payment
								steps.
							</Text>
						</View>
						<View style={styles.faqItem}>
							<Text style={styles.faqQuestion}>
								Why is my data not working?
							</Text>
							<Text style={styles.faqAnswer}>
								Check your network or contact support with your purchase
								details.
							</Text>
						</View>
						<View style={styles.faqItem}>
							<Text style={styles.faqQuestion}>How do I track referrals?</Text>
							<Text style={styles.faqAnswer}>
								Visit the Refer & Earn page to see your referral history.
							</Text>
						</View>
					</View>

					<Animated.View style={{ transform: [{ scale: whatsappPulseAnim }] }}>
						<TouchableOpacity
							style={styles.whatsappButton}
							onPress={handleWhatsAppContact}
						>
							<Ionicons
								name="logo-whatsapp"
								size={scaleFont(32)}
								color="#FFFFFF"
							/>
						</TouchableOpacity>
					</Animated.View>
				</View>
			</ScrollView>

			{/* Custom Modal */}
			{modalVisible && (
				<View style={styles.modalOverlay}>
					<View style={styles.modalContainer}>
						<Text style={styles.modalText}>{modalMessage}</Text>
						<TouchableOpacity
							style={styles.modalButton}
							onPress={() => setModalVisible(false)}
						>
							<Text style={styles.modalButtonText}>OK</Text>
						</TouchableOpacity>
					</View>
				</View>
			)}
		</Animated.View>
	);
};

const styles = StyleSheet.create({
	rootContainer: {
		flex: 1,
		backgroundColor: "#000000",
	},
	scrollContainer: {
		flex: 1,
		backgroundColor: "#000000",
	},
	innerContainer: {
		paddingHorizontal: scaleSize(16),
		flexGrow: 1,
		backgroundColor: "#000000",
		paddingBottom: scaleSize(20),
	},
	contentContainer: {
		marginTop: scaleSize(16),
		alignItems: "center",
	},
	heroCard: {
		backgroundColor: "rgba(28, 28, 30, 0.9)",
		borderRadius: scaleSize(12),
		padding: scaleSize(16),
		marginBottom: scaleSize(16),
		width: "100%",
		borderWidth: 1,
		borderColor: "#D7A77F",
		shadowColor: "#000000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 4,
		elevation: 4,
	},
	headline: {
		fontSize: scaleFont(20),
		fontWeight: "700",
		color: "#D7A77F",
		textAlign: "center",
		marginBottom: scaleSize(8),
	},
	subheadlines: {
		color: "#3B82F6",
	},
	subheadline: {
		fontSize: scaleFont(14),
		fontWeight: "400",
		color: "#B0B0B0",
		textAlign: "center",
		marginBottom: scaleSize(16),
	},
	input: {
		backgroundColor: "#2C2C2E",
		borderRadius: scaleSize(8),
		padding: scaleSize(12),
		color: "#FFFFFF",
		fontSize: scaleFont(14),
		marginBottom: scaleSize(12),
	},
	textArea: {
		height: scaleSize(100),
		textAlignVertical: "top",
	},
	ctaButton: {
		backgroundColor: "#744925",
		borderRadius: scaleSize(8),
		padding: scaleSize(12),
		alignItems: "center",
	},
	ctaText: {
		fontSize: scaleFont(16),
		fontWeight: "600",
		color: "#FFF",
	},
	whatsappButton: {
		backgroundColor: "#25D366",
		borderRadius: scaleSize(50),
		width: scaleSize(60),
		height: scaleSize(60),
		alignItems: "center",
		justifyContent: "center",
		position: "absolute",
		bottom: scaleSize(10),
		left: scaleSize(110),
		zIndex: 10,
	},
	tierCard: {
		backgroundColor: "rgba(28, 28, 30, 0.9)",
		borderRadius: scaleSize(12),
		padding: scaleSize(16),
		marginBottom: scaleSize(16),
		width: "100%",
		borderWidth: 1,
		borderColor: "#D7A77F",
		shadowColor: "#000000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 4,
		elevation: 4,
	},
	cardTitle: {
		fontSize: scaleFont(16),
		fontWeight: "600",
		color: "#FFFFFF",
		marginBottom: scaleSize(12),
	},
	faqItem: {
		marginHorizontal: scaleSize(12),
		marginBottom: scaleSize(12),
	},
	faqQuestion: {
		fontSize: scaleFont(14),
		fontWeight: "600",
		color: "#D7A77F",
	},
	faqAnswer: {
		fontSize: scaleFont(12),
		fontWeight: "400",
		color: "#B0B0B0",
		marginTop: scaleSize(4),
	},
	modalOverlay: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: "rgba(0, 0, 0, 0.8)",
		justifyContent: "center",
		alignItems: "center",
		zIndex: 999,
	},
	modalContainer: {
		backgroundColor: "#1C1C1E",
		padding: scaleSize(20),
		borderRadius: scaleSize(12),
		width: "80%",
		alignItems: "center",
	},
	modalText: {
		color: "#FFFFFF",
		fontSize: scaleFont(16),
		textAlign: "center",
		marginBottom: scaleSize(16),
	},
	modalButton: {
		backgroundColor: "#744925",
		paddingVertical: scaleSize(8),
		paddingHorizontal: scaleSize(16),
		borderRadius: scaleSize(8),
	},
	modalButtonText: {
		color: "#FFFFFF",
		fontSize: scaleFont(14),
		fontWeight: "600",
	},
});

export default CustomerCare;