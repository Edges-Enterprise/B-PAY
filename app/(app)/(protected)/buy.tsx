// buy.tsx
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
  lizzysubId: number;       
}

const SUPPORTED_PROVIDERS = ["MTN", "AIRTEL", "GLO", "9MOBILE"];

/** Lizzy plan_network → provider name */
const NETWORK_MAP: { [key: number]: string } = {
  1: "MTN",
  2: "AIRTEL",
  3: "GLO",
  4: "9MOBILE",
};

const ServiceProviderScreen: React.FC = () => {
  const params = useLocalSearchParams<{ balance?: string }>();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<{ [key: string]: boolean }>({});
  const scrollViewRef = useRef<ScrollView>(null);

  const loadProviders = useCallback(() => {
    try {
      setLoading(true);
      setError(null);

      const mapped: Provider[] = SUPPORTED_PROVIDERS.map(name => {
        const id = Object.entries(NETWORK_MAP).find(([, v]) => v === name)![0];
        return {
          id: Number(id),
          name,
          image: NETWORK_IMAGES[name] || DEFAULT_PROVIDER_IMAGE,
          code: name.toLowerCase(),
          imageKey: name,
          availablePlanTypes: ["SME", "SME_GIFTING", "CORPORATE_GIFTING", "GIFTING", "STANDARD"],
          lizzysubId: Number(id),
        };
      });

      setProviders(mapped);
    } catch (e: any) {
      setError("Could not load providers.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => loadProviders(), [loadProviders]);

  const selectProvider = (p: Provider) => {
    const balance = params.balance || "0";

    router.push({
      pathname: "/(app)/serviceprovider",
      params: {
        provider: JSON.stringify({
          id: p.id,
          name: p.name,
          code: p.code,
          imageKey: p.imageKey,
          image: p.image,
          availablePlanTypes: p.availablePlanTypes,
          lizzysubId: p.lizzysubId,
        }),
        networkId: p.id.toString(),
        balance,
      },
    });
  };

  const handleRetry = () => loadProviders();

  const handleImageError = (name: string) => {
    setImageErrors(prev => ({ ...prev, [name]: true }));
  };

  return (
    <SwipeWrapper scrollViewRef={scrollViewRef}>
      <ScrollView ref={scrollViewRef} style={styles.container}>
        <Text style={styles.title}>Select Data Provider</Text>

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
            {providers.map(p => (
              <Pressable
                key={`${p.name}-${p.id}`}
                onPress={() => selectProvider(p)}
                style={styles.providerCard}
                accessibilityLabel={`Select ${p.name} provider`}
                accessibilityRole="button"
              >
                <View style={styles.providerCardContent}>
                  {imageErrors[p.name] ? (
                    <View style={styles.fallbackContainer}>
                      <Text style={styles.fallbackText}>{p.name}</Text>
                    </View>
                  ) : (
                    <Image
                      source={p.image}
                      style={styles.providerLogo}
                      resizeMode="contain"
                      onError={() => handleImageError(p.name)}
                    />
                  )}
                  <Text style={styles.providerName}>{p.name}</Text>
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
