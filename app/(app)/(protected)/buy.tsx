import React, { useEffect, useState, useRef, useCallback } from "react";
import {
	View,
	Text,
	Pressable,
	Image,
	ScrollView,
	StyleSheet,
	ActivityIndicator,
	Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { NETWORK_IMAGES, DEFAULT_PROVIDER_IMAGE } from "@/constants/helper";
import SwipeWrapper from "../../../components/SwipeWrapper";

interface Provider {
	id: number;
	name: string;
	image: number;
	code: string;
	imageKey?: string;
	availablePlanTypes?: string[];
	ebenkId: number;
	lizzysubId: number;
}

const SUPPORTED_PROVIDERS = ["MTN", "AIRTEL", "GLO", "9MOBILE"];
const VALID_PLAN_TYPES = [
	"SME",
	"SME_GIFTING",
	"CORPORATE_GIFTING",
	"GIFTING",
	"STANDARD",
	"HOTPLAN",
];

const NETWORK_ID_MAPPING = {
	MTN: { ebenk: 1, lizzysub: 1 },
	AIRTEL: { ebenk: 4, lizzysub: 2 },
	GLO: { ebenk: 2, lizzysub: 3 },
	"9MOBILE": { ebenk: 3, lizzysub: 4 },
};

const ServiceProviderScreen: React.FC = () => {
  const flatListRef = useRef(null);
	const params = useLocalSearchParams<{ balance?: string }>();
	const [providers, setProviders] = useState<Provider[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [imageErrors, setImageErrors] = useState<{ [key: string]: boolean }>(
		{},
	);
	const scrollViewRef = useRef<ScrollView>(null);

	// Instead of fetching, just build providers from hardcoded mapping
	const loadProviders = () => {
		try {
			setLoading(true);
			setError(null);

			const mappedProviders: Provider[] = SUPPORTED_PROVIDERS.map((name) => {
				const mapping =
					NETWORK_ID_MAPPING[name as keyof typeof NETWORK_ID_MAPPING];
				return {
					id: mapping.ebenk, // we’ll just use EbenkId as the main id
					name,
					image: NETWORK_IMAGES[name] || DEFAULT_PROVIDER_IMAGE,
					code: name.toLowerCase(),
					imageKey: name,
					availablePlanTypes: VALID_PLAN_TYPES,
					ebenkId: mapping.ebenk,
					lizzysubId: mapping.lizzysub,
				};
			});

			setProviders(mappedProviders);
			// console.log("Loaded providers from mapping:", mappedProviders);
		} catch (err: any) {
			setError("Could not load providers. Please try again.");
			setProviders([]);
			console.error("Provider load error:", err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadProviders();
	}, []);

	const selectProvider = (provider: Provider) => {
		if (isNaN(provider.ebenkId) || provider.ebenkId <= 0) {
			console.error("Invalid networkId for provider:", provider);
			Alert.alert("Error", "Invalid provider data.");
			return;
		}

		const serializableProvider = {
			id: provider.id,
			name: provider.name,
			code: provider.code,
			imageKey: provider.imageKey,
			image: provider.image,
			availablePlanTypes: provider.availablePlanTypes,
			ebenkId: provider.ebenkId,
			lizzysubId: provider.lizzysubId,
		};

		const balance = params.balance || "0";

		// console.log("Navigating with dual API support:", {
		// 	provider: provider.name,
		// 	ebenkId: provider.ebenkId,
		// 	lizzysubId: provider.lizzysubId,
		// });

		router.push({
			pathname: "/(app)/serviceprovider",
			params: {
				provider: JSON.stringify(serializableProvider),
				networkId: provider.id.toString(),
				ebenkId: provider.ebenkId.toString(),
				lizzysubId: provider.lizzysubId.toString(),
				balance,
			},
		});
	};

	const handleRetry = useCallback(() => {
		loadProviders();
		Alert.alert("Retrying", "Fetching providers...");
	}, []);

	const handleImageError = (providerName: string) => {
		console.warn(`Image failed to load for ${providerName}`);
		setImageErrors((prev) => ({ ...prev, [providerName]: true }));
	};

	return (
		<SwipeWrapper scrollViewRef={scrollViewRef} flatListRef={flatListRef}>
			<ScrollView
				ref={scrollViewRef}
				style={styles.container}
				scrollEventThrottle={16}
			>
				<Text style={styles.title}>📱 Select Data Provider</Text>

				{loading ? (
					<View style={styles.loadingContainer}>
						<ActivityIndicator size="large" color="#00ff88" />
						<Text style={styles.loadingText}>Loading providers...</Text>
					</View>
				) : error ? (
					<View style={styles.errorContainer}>
						<Text style={styles.errorText}>{error}</Text>
						<Pressable onPress={handleRetry} style={styles.retryButton}>
							<Text style={styles.retryButtonText}>Retry</Text>
						</Pressable>
					</View>
				) : providers.length === 0 ? (
					<Text style={styles.noProvidersText}>No providers available.</Text>
				) : (
					<View style={styles.providerGrid}>
						{providers.map((provider) => (
							<Pressable
								key={`${provider.name}-${provider.ebenkId}-${provider.lizzysubId}`}
								onPress={() => selectProvider(provider)}
								style={styles.providerCard}
								accessible={true}
								accessibilityLabel={`Select ${provider.name} provider`}
								accessibilityRole="button"
							>
								<View style={styles.providerCardContent}>
									{imageErrors[provider.name] ? (
										<View style={styles.fallbackContainer}>
											<Text style={styles.fallbackText}>{provider.name}</Text>
										</View>
									) : (
										<Image
											source={provider.image}
											style={styles.providerLogo}
											resizeMode="contain"
											onError={() => handleImageError(provider.name)}
										/>
									)}
									<Text style={styles.providerName}>{provider.name}</Text>
									{/* <Text style={styles.supportInfo}>
										Ebenk: {provider.ebenkId} | Lizzysub: {provider.lizzysubId}
									</Text> */}
								</View>
							</Pressable>
						))}
					</View>
				)}
			</ScrollView>
		</SwipeWrapper>
	);
};

const styles = StyleSheet.create({
	// ... your styles unchanged
	container: {
		flex: 1,
		backgroundColor: "#000",
		paddingTop: 48,
		paddingHorizontal: 16,
	},
	title: {
		fontSize: 20,
		fontWeight: "700",
		color: "#fff",
		marginBottom: 24,
		textAlign: "center",
	},
	providerGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		justifyContent: "space-between",
	},
	providerCard: {
		width: "45%",
		aspectRatio: 1,
		backgroundColor: "#111",
		borderRadius: 180,
		padding: 2,
		marginBottom: 16,
		alignItems: "center",
		justifyContent: "center",
	},
	providerCardContent: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
	},
	providerLogo: {
		width: 80,
		height: 80,
		borderRadius: 40,
		marginBottom: 8,
	},
	providerName: {
		fontSize: 14,
		fontWeight: "600",
		color: "#fff",
		textAlign: "center",
	},
	supportInfo: {
		fontSize: 8,
		color: "#666",
		textAlign: "center",
		marginTop: 4,
	},
	fallbackContainer: {
		width: 80,
		height: 80,
		borderRadius: 40,
		backgroundColor: "#333",
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 8,
	},
	fallbackText: {
		fontSize: 12,
		color: "#fff",
		textAlign: "center",
	},
	noProvidersText: {
		fontSize: 16,
		color: "#999",
		textAlign: "center",
		marginTop: 50,
	},
	loadingContainer: {
		alignItems: "center",
		marginTop: 50,
	},
	loadingText: {
		fontSize: 16,
		color: "#fff",
		marginTop: 10,
	},
	errorContainer: {
		alignItems: "center",
		marginTop: 50,
	},
	errorText: {
		fontSize: 16,
		color: "#ff3333",
		textAlign: "center",
		marginBottom: 16,
	},
	retryButton: {
		backgroundColor: "#00ff88",
		paddingVertical: 10,
		paddingHorizontal: 20,
		borderRadius: 8,
	},
	retryButtonText: {
		fontSize: 16,
		fontWeight: "600",
		color: "#000",
	},
});

export default ServiceProviderScreen;
