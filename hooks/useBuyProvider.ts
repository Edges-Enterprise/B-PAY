import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert } from "react-native";
import { DEFAULT_PROVIDER_IMAGE, NETWORK_IMAGES } from "@/constants/helper";

// Provider interface
interface Provider {
	id: number;
	name: string;
	image: any;
	code: string;
}

// API response type (adjust based on your actual API structure)
interface ApiResponse {
	[key: string]: Array<{
		network: number;
		plan_network: string;
		// Add other properties as needed
	}>;
}

// Custom hook for fetching providers
export const useProviders = () => {
	const fetchProviders = async (): Promise<Provider[]> => {
		const response = await fetch(
			`${process.env.EXPO_PUBLIC_EBENK_URL}/api/network/`,
			{
				headers: {
					Authorization: "Token de883370902cf73e68ed63f566dbf38a38719f03",
				},
			},
		);

		if (!response.ok) {
			throw new Error(`Failed to fetch providers: ${response.status}`);
		}

		const data: ApiResponse = await response.json();
		// console.log("API Response:", data);

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

		if (providerArray.length === 0) {
			throw new Error("No valid providers found in the response");
		}

		return providerArray;
	};

	const query = useQuery({
		queryKey: ["providers"],
		queryFn: fetchProviders,
		staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh for 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes - cache garbage collection time
		retry: 3, // Retry failed requests 3 times
		retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
	});

	// Handle errors using useEffect since onError is no longer available
	React.useEffect(() => {
		if (query.error) {
			console.error("Fetch error:", query.error);
			Alert.alert("Error", "Could not load data providers.");
		}
	}, [query.error]);

	return query;
};