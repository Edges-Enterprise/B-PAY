import React, { useEffect, useState } from "react";
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
import { router } from "expo-router";
import { DEFAULT_PROVIDER_IMAGE, NETWORK_IMAGES } from "@/constants/helper";

// Define the Provider interface - image should be any (require object)
interface Provider {
	id: number;
	name: string;
	image: any; // require() returns a number/object, not string
	code: string;
}

const ServiceProviderScreen: React.FC = () => {
	
	const [providers, setProviders] = useState<Provider[]>([]);
	const [loading, setLoading] = useState(true);

	const fetchProviders = async () => {
		try {
			const response = await fetch("https://ebenkdata.com/api/network/", {
				headers: {
					Authorization: "Token de883370902cf73e68ed63f566dbf38a38719f03",
				},
			});

			if (!response.ok) {
				throw new Error(`Failed to fetch providers: ${response.status}`);
			}

			const data = await response.json();
			console.log("API Response:", data);

			// Transform the API response into an array of Provider objects
			const providerMap: { [key: string]: Provider } = {};

			// Iterate through each network plan array
			Object.keys(data).forEach((networkKey) => {
				const plans = data[networkKey];
				if (Array.isArray(plans) && plans.length > 0) {
					const networkName = plans[0].plan_network; // e.g., 9MOBILE, AIRTEL, GLO, MTN
					if (!providerMap[networkName]) {
						providerMap[networkName] = {
							id: plans[0].network, // Use network ID from the first plan
							name: networkName,
							image:
								NETWORK_IMAGES[networkName as keyof typeof NETWORK_IMAGES] ||
								DEFAULT_PROVIDER_IMAGE,
							code: networkName.toLowerCase(),
						};
					}
				}
			});

			// Convert providerMap to array
			const providerArray = Object.values(providerMap);
			setProviders(providerArray);

			if (providerArray.length === 0) {
				Alert.alert("Error", "No valid providers found in the response.");
			}
		} catch (error) {
			console.error("Fetch error:", error);
			Alert.alert("Error", "Could not load data providers.");
			setProviders([]);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchProviders();
	}, []);

	const selectProvider = (provider: Provider) => {
		// Create a serializable version of the provider for navigation
		const serializableProvider = {
			id: provider.id,
			name: provider.name,
			code: provider.code,
			// Convert require() image to a network name identifier
			imageKey:
				Object.keys(NETWORK_IMAGES).find(
					(key) =>
						NETWORK_IMAGES[key as keyof typeof NETWORK_IMAGES] ===
						provider.image,
				) || "DEFAULT",
		};

		console.log("Selecting provider:", provider.name);
		console.log("Serializable provider:", serializableProvider);

		router.push({
			pathname: "/(app)/serviceprovider",
			params: {
				provider: JSON.stringify(serializableProvider),
			},
		});
	};

	return (
		<ScrollView style={styles.container}>
			<Text style={styles.selectProviderTitle}>📱 Select Data Provider</Text>

			{loading ? (
				<ActivityIndicator
					size="large"
					color="#00ff99"
					style={{ marginTop: 50 }}
				/>
			) : providers.length === 0 ? (
				<Text style={styles.noProvidersText}>No providers available.</Text>
			) : (
				<View style={styles.providerGrid}>
					{providers.map((provider) => (
						<Pressable
							key={provider.id}
							onPress={() => {
								console.log("Provider card pressed:", provider.name);
								selectProvider(provider);
							}}
							style={styles.providerCard}
						>
							<View style={styles.providerCardContent}>
								<Image
									source={provider.image}
									style={styles.providerLogoLarge}
									resizeMode="contain"
									onError={(error) => {
										console.log(
											"Image loading error for",
											provider.name,
											":",
											error.nativeEvent.error,
										);
									}}
								/>
								<Text style={styles.providerCardName}>{provider.name}</Text>
							</View>
						</Pressable>
					))}
				</View>
			)}
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "black",
		paddingTop: 48,
		paddingHorizontal: 16,
	},
	selectProviderTitle: {
		fontSize: 20,
		fontWeight: "bold",
		color: "white",
		marginBottom: 24,
	},
	providerGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		justifyContent: "space-between",
	},
	providerCard: {
		width: "48%",
		backgroundColor: "#1E1E1E",
		borderRadius: 16,
		padding: 16,
		marginBottom: 16,
	},
	providerCardContent: {
		alignItems: "center",
	},
	providerLogoLarge: {
		width: 64,
		height: 64,
		borderRadius: 32,
		backgroundColor: "white",
		marginBottom: 12,
	},
	providerCardName: {
		fontSize: 16,
		fontWeight: "600",
		color: "white",
	},
	noProvidersText: {
		fontSize: 16,
		color: "white",
		textAlign: "center",
		marginTop: 50,
	},
});

export default ServiceProviderScreen;
