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
  NativeSyntheticEvent,
  NativeScrollEvent,
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
}

const SUPPORTED_PROVIDERS = ["MTN", "AIRTEL", "GLO", "9MOBILE"];
const VALID_PLAN_TYPES = [
  "SME",
  "SME_GIFTING",
  "CORPORATE_GIFTING",
  "GIFTING",
  "STANDARD",
];

const ServiceProviderScreen: React.FC = () => {
  const params = useLocalSearchParams<{ balance?: string }>();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<{ [key: string]: boolean }>({});
  const scrollViewRef = useRef<ScrollView>(null);

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
        console.error("API Error:", {
          status: response.status,
          errorText: errorText.slice(0, 200),
          url: response.url,
        });
        throw new Error(`Failed to fetch providers: ${response.status}`);
      }

      const rawResponse = await response.text();
      let data;
      try {
        data = JSON.parse(rawResponse);
        // console.log("Parsed API Response:", Object.keys(data));
      } catch (parseError) {
        console.error("JSON Parse Error:", {
          error: parseError,
          rawResponse: rawResponse.slice(0, 200),
        });
        throw new Error("Invalid API response format");
      }

      const providerMap: { [key: string]: Provider } = {};
      const networkNameMap: { [key: string]: string } = {
        mtn_ng: "MTN",
        "airtel-ng": "AIRTEL",
        glo_ng: "GLO",
        "9mobile_ng": "9MOBILE",
        mtn: "MTN",
        airtel: "AIRTEL",
        glo: "GLO",
        "9mobile": "9MOBILE",
      };

      Object.keys(data).forEach((networkKey) => {
        const plans = data[networkKey];
        if (Array.isArray(plans) && plans.length > 0) {
          const firstPlan = plans[0];
          if (
            !firstPlan.plan_network ||
            !firstPlan.network ||
            isNaN(firstPlan.network)
          ) {
            console.warn(`Skipping invalid plan for ${networkKey}:`, {
              plan_network: firstPlan.plan_network,
              network: firstPlan.network,
            });
            return;
          }

          const rawNetworkName = firstPlan.plan_network.toLowerCase();
          const networkName = networkNameMap[rawNetworkName] || firstPlan.plan_network.toUpperCase();
          
          if (!SUPPORTED_PROVIDERS.includes(networkName)) {
            console.warn(`Unsupported provider ${networkName} for ${networkKey}`);
            return;
          }

          if (!providerMap[networkName]) {
            const imageKey = networkName;
            const providerImage = NETWORK_IMAGES[imageKey] || DEFAULT_PROVIDER_IMAGE;
            providerMap[networkName] = {
              id: Number(firstPlan.network),
              name: networkName,
              image: providerImage,
              code: networkName.toLowerCase(),
              imageKey: networkName,
              availablePlanTypes: VALID_PLAN_TYPES,
            };
            // console.log(`Assigned image for ${networkName}:`, {
            //   image: providerImage === DEFAULT_PROVIDER_IMAGE ? "Default" : "Loaded",
            //   imageKey,
            //   rawNetworkName,
            // });
          }
        } else {
          console.warn(`Invalid or empty plans for ${networkKey}:`, plans);
        }
      });

      const providerArray = Object.values(providerMap);
      setProviders(providerArray);

      if (providerArray.length === 0) {
        throw new Error("No valid providers found");
      }
      // console.log(
      //   "Fetched Providers:",
      //   providerArray.map((p) => ({ name: p.name, imageKey: p.imageKey }))
      // );
    } catch (error: any) {
      console.error("Fetch error:", {
        message: error.message,
        stack: error.stack,
      });
      setError("Could not load providers. Please try again.");
      setProviders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const selectProvider = (provider: Provider) => {
    if (isNaN(provider.id) || provider.id <= 0) {
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
    };

    const balance = params.balance || "0";
    // console.log("Navigating to BuyDataScreen with:", {
    //   ...serializableProvider,
    //   balance,
    // });

    router.push({
      pathname: "/(app)/serviceprovider",
      params: {
        provider: JSON.stringify(serializableProvider),
        networkId: provider.id.toString(),
        balance,
      },
    });
  };

  const handleRetry = useCallback(() => {
    // console.log("Retrying provider fetch");
    fetchProviders();
    Alert.alert("Retrying", "Fetching providers...");
  }, []);

  const handleImageError = (providerName: string) => {
    console.warn(`Image failed to load for ${providerName}`);
    setImageErrors((prev) => ({ ...prev, [providerName]: true }));
  };

  // Prevent swipe gestures during vertical scrolling
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { velocity } = event.nativeEvent;
    if (velocity && Math.abs(velocity.y) > 0.5) {
      scrollViewRef.current?.setNativeProps({ scrollEnabled: true });
    } else {
      scrollViewRef.current?.setNativeProps({ scrollEnabled: true });
    }
  };

  return (
    <SwipeWrapper scrollViewRef={scrollViewRef}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.container}
        onScroll={handleScroll}
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
                key={provider.id}
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