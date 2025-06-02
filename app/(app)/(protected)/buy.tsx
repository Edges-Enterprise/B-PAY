import React from "react";
import {
	View,
	Text,
	Pressable,
	Image,
	ScrollView,
	StyleSheet,
	ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { NETWORK_IMAGES } from "@/constants/helper";
import { useProviders } from "@/hooks/useBuyProvider"; // Adjust the import path as needed

// Define the Provider interface
interface Provider {
	id: number;
	name: string;
	image: any;
	code: string;
}

const ServiceProviderScreen: React.FC = () => {
	const {
		data: providers = [],
		isLoading,
		error,
		isRefetching,
		refetch,
	} = useProviders();

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

	// Handle error state
	if (error) {
		return (
			<View style={styles.container}>
				<Text style={styles.selectProviderTitle}>📱 Select Data Provider</Text>
				<View style={styles.errorContainer}>
					<Text style={styles.errorText}>Failed to load providers</Text>
					<Pressable style={styles.retryButton} onPress={() => refetch()}>
						<Text style={styles.retryButtonText}>Retry</Text>
					</Pressable>
				</View>
			</View>
		);
	}

	return (
		<ScrollView style={styles.container}>
			<View style={styles.headerContainer}>
				<Text style={styles.selectProviderTitle}>📱 Select Data Provider</Text>
				{isRefetching && <ActivityIndicator size="small" color="#D7A77F" />}
			</View>

			{isLoading ? (
				<ActivityIndicator
					size="large"
					color="#D7A77F"
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
		paddingTop: 56,
		paddingHorizontal: 16,
	},
	headerContainer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 24,
	},
	selectProviderTitle: {
		fontSize: 20,
		fontWeight: "bold",
		color: "white",
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
	errorContainer: {
		alignItems: "center",
		marginTop: 50,
	},
	errorText: {
		fontSize: 16,
		color: "#ff6b6b",
		textAlign: "center",
		marginBottom: 16,
	},
	retryButton: {
		backgroundColor: "#00ff99",
		paddingHorizontal: 20,
		paddingVertical: 10,
		borderRadius: 8,
	},
	retryButtonText: {
		color: "black",
		fontWeight: "600",
	},
});

export default ServiceProviderScreen;