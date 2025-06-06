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

// Define the Provider interface
interface Provider {
  id: number;
  name: string;
  image: any;
  code: string;
  availablePlanTypes: string[];
}

const SUPPORTED_PROVIDERS = ["MTN", "AIRTEL", "GLO", "9MOBILE"];
const VALID_PLAN_TYPES = ["SME", "Corporate Gifting", "Gifting", "Standard"];

const ServiceProviderScreen: React.FC = () => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("https://ebenkdata.com/api/network/", {
        headers: {
          Authorization: "Token de883370902cf73e68ed63f566dbf38a38719f03",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error Response:", {
          status: response.status,
          text: errorText.slice(0, 200),
          url: response.url,
        });
        throw new Error(`Failed to fetch providers: ${response.status} - ${errorText.slice(0, 100)}...`);
      }

      const rawResponse = await response.text();
      let data;
      try {
        data = JSON.parse(rawResponse);
        console.log("Parsed API Response:", Object.keys(data));
      } catch (parseError) {
        console.error("JSON Parse Error:", {
          error: parseError,
          rawResponse: rawResponse.slice(0, 200),
        });
        throw new Error(`Failed to parse API response: ${rawResponse.slice(0, 100)}...`);
      }

      // Transform the API response into an array of Provider objects
      const providerMap: { [key: string]: Provider } = {};

      // Iterate through each network plan array
      Object.keys(data).forEach((networkKey) => {
        const plans = data[networkKey];
        if (Array.isArray(plans) && plans.length > 0) {
          const firstPlan = plans[0];
          // Validate required fields
          if (
            !firstPlan.plan_network ||
            !firstPlan.network ||
            isNaN(firstPlan.network) ||
            !SUPPORTED_PROVIDERS.includes(firstPlan.plan_network.toUpperCase())
          ) {
            console.warn(`Skipping invalid plan for ${networkKey}:`, {
              plan_network: firstPlan.plan_network,
              network: firstPlan.network,
            });
            return;
          }

          const networkName = firstPlan.plan_network.toUpperCase();
          if (!providerMap[networkName]) {
            // Extract unique plan types for this provider
            const availablePlanTypes = Array.from(
              new Set(plans.map((plan: any) => plan.plan_type || "Standard"))
            ).filter((type: string) => VALID_PLAN_TYPES.includes(type));

            providerMap[networkName] = {
              id: Number(firstPlan.network),
              name: networkName,
              image:
                NETWORK_IMAGES[networkName as keyof typeof NETWORK_IMAGES] ||
                DEFAULT_PROVIDER_IMAGE,
              code: networkName.toLowerCase(),
              availablePlanTypes,
            };
          }
        } else {
          console.warn(`Invalid or empty plans for ${networkKey}:`, plans);
        }
      });

      // Convert providerMap to array
      const providerArray = Object.values(providerMap);
      setProviders(providerArray);

      if (providerArray.length === 0) {
        throw new Error("No valid providers found in the response.");
      }
      console.log("Fetched Providers:", providerArray);
    } catch (error: any) {
      console.error("Fetch error:", {
        message: error.message,
        stack: error.stack,
      });
      setError(`Could not load data providers: ${error.message}`);
      setProviders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const selectProvider = (provider: Provider) => {
    // Validate networkId
    if (isNaN(provider.id) || provider.id <= 0) {
      console.error("Invalid networkId for provider:", provider);
      Alert.alert("Error", "Invalid provider data. Please try again.");
      return;
    }

    // Create a serializable version of the provider for navigation
    const serializableProvider = {
      id: provider.id,
      name: provider.name,
      code: provider.code,
      imageKey:
        Object.keys(NETWORK_IMAGES).find(
          (key) =>
            NETWORK_IMAGES[key as keyof typeof NETWORK_IMAGES] === provider.image
        ) || "DEFAULT",
      availablePlanTypes: provider.availablePlanTypes,
    };

    console.log("Selecting provider:", {
      name: provider.name,
      id: provider.id,
      code: provider.code,
      availablePlanTypes: provider.availablePlanTypes,
    });
    console.log("Serializable provider:", serializableProvider);

    router.push({
      pathname: "/(app)/serviceprovider",
      params: {
        provider: JSON.stringify(serializableProvider),
        networkId: provider.id.toString(),
      },
    });
  };

  const handleRetry = () => {
    console.log("Retrying provider fetch");
    fetchProviders();
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.selectProviderTitle}>📱 Select Data Provider</Text>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00ff99" />
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
              key={provider.id}
              onPress={() => {
                console.log("Provider card pressed:", provider.name);
                selectProvider(provider);
              }}
              style={styles.providerCard}
              accessible={true}
              accessibilityLabel={`Select ${provider.name} provider`}
              accessibilityRole="button"
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
                      error.nativeEvent.error
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
  loadingContainer: {
    alignItems: "center",
    marginTop: 50,
  },
  loadingText: {
    fontSize: 16,
    color: "white",
    marginTop: 10,
  },
  errorContainer: {
    alignItems: "center",
    marginTop: 50,
  },
  errorText: {
    fontSize: 16,
    color: "#FF6666",
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#00ff99",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "black",
  },
});

export default ServiceProviderScreen;