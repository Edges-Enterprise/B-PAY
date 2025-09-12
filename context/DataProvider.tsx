import React, { createContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/config/supabase";

interface DataBundle {
	id: number;
	data: string;
	price: number;
	validity: string;
	category: string;
	description?: string;
	variation_code?: string;
	planType: string;
}

interface ProviderPlans {
	[provider: string]: DataBundle[];
}

interface PriceAdjustment {
	id: number;
	provider: string;
	data_amount: string;
	validity: string;
	target_price: number;
	is_active: boolean;
}

interface DataContextType {
	providerPlans: ProviderPlans;
	walletBalance: number | null;
	userEmail: string | null;
	isLoading: boolean;
	errorMessage: string | null;
	fetchData: () => Promise<void>;
}

export const DataContext = createContext<DataContextType>({
	providerPlans: {},
	walletBalance: null,
	userEmail: null,
	isLoading: false,
	errorMessage: null,
	fetchData: async () => {},
});

const planCache: {
	[providerName: string]: { data: DataBundle[]; timestamp: number };
} = {};

// Cache for price adjustments
const priceAdjustmentsCache: {
	data: { [key: string]: PriceAdjustment };
	timestamp: number;
} = {
	data: {},
	timestamp: 0,
};

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const PRICE_ADJUSTMENTS_CACHE_DURATION = 60 * 60 * 1000; // 1 hour (shorter for price updates)

const SUPPORTED_PROVIDERS = ["MTN", "AIRTEL", "GLO", "9MOBILE"];

const normalizeData = (data: string): string => {
	return data ? data.trim().replace(/\s+/g, " ") : "Unknown";
};

const normalizeValidity = (validity: string): string => {
	if (!validity) return "Not Specified";
	const normalized = validity.trim().replace(/\s+/g, " ").toLowerCase();
	if (normalized.includes("30 days") || normalized.includes("30days"))
		return "30 Days";
	if (normalized.includes("7 days") || normalized.includes("7days"))
		return "7 Days";
	if (normalized.includes("1 day") || normalized.includes("1day"))
		return "1 Day";
	if (normalized.includes("month")) return normalized.replace("month", "Month");
	return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

// Fetch price adjustments from database
const fetchPriceAdjustments = async (): Promise<{
	[key: string]: PriceAdjustment;
}> => {
	// Check cache first
	if (
		priceAdjustmentsCache.data &&
		Object.keys(priceAdjustmentsCache.data).length > 0 &&
		Date.now() - priceAdjustmentsCache.timestamp <
			PRICE_ADJUSTMENTS_CACHE_DURATION
	) {
		// console.log("Using cached price adjustments");
		return priceAdjustmentsCache.data;
	}

	try {
		// console.log("Fetching price adjustments from database...");
		const { data, error } = await supabase
			.from("price_adjustments")
			.select("*")
			.eq("is_active", true);

		if (error) {
			console.error("Error fetching price adjustments:", error);
			throw error;
		}

		// Create lookup map with composite key
		const adjustmentsMap: { [key: string]: PriceAdjustment } = {};
		data?.forEach((adjustment) => {
			const key = `${adjustment.provider}_${adjustment.data_amount}_${adjustment.validity}`;
			adjustmentsMap[key] = adjustment;
		});

		// Update cache
		priceAdjustmentsCache.data = adjustmentsMap;
		priceAdjustmentsCache.timestamp = Date.now();

		// console.log(
		// 	`Loaded ${Object.keys(adjustmentsMap).length} price adjustments from database`,
		// );
		return adjustmentsMap;
	} catch (error) {
		console.error(
			"Failed to fetch price adjustments, using empty fallback:",
			error,
		);
		return {};
	}
};

const calculatePriceWithPreloadedAdjustments = (
	plan: any,
	provider: string,
	priceAdjustments: { [key: string]: PriceAdjustment },
): number => {
	const planData = normalizeData(plan.plan || "");
	const planValidity = normalizeValidity(plan.month_validate || "");
	const providerUpper = provider.toUpperCase();

	// Create lookup key
	const lookupKey = `${providerUpper}_${planData}_${planValidity}`;

	// Check if there's a price adjustment for this plan
	if (priceAdjustments[lookupKey]) {
		const adjustment = priceAdjustments[lookupKey];
		return adjustment.target_price;
	}

	// Default price calculation
	const basePrice = parseFloat(plan.plan_amount || "0");
	const adjustedPrice = basePrice > 0 ? basePrice + 50 : 0;

	return adjustedPrice;
};

const calculatePriceWithAdjustments = async (
	plan: any,
	provider: string,
): Promise<number> => {
	const priceAdjustments = await fetchPriceAdjustments();

	const planData = normalizeData(plan.plan || "");
	const planValidity = normalizeValidity(plan.month_validate || "");
	const providerUpper = provider.toUpperCase();

	// Create lookup key
	const lookupKey = `${providerUpper}_${planData}_${planValidity}`;

	// Check if there's a price adjustment for this plan
	if (priceAdjustments[lookupKey]) {
		const adjustment = priceAdjustments[lookupKey];
		// console.log(
		// 	`Price adjustment found for ${providerUpper} plan ID ${plan.id}: ${planData}, ${planValidity} -> ₦${adjustment.target_price}`,
		// );
		return adjustment.target_price;
	}

	// Default price calculation
	const basePrice = parseFloat(plan.plan_amount || "0");
	const adjustedPrice = basePrice > 0 ? basePrice + 50 : 0;

	// console.log(
	// 	`No price adjustment for ${providerUpper} plan ID ${plan.id}: ${planData}, ${planValidity}, using default ₦${adjustedPrice}`,
	// );
	return adjustedPrice;
};

const determineCategory = (plan: any): string => {
	const validity = normalizeValidity(plan.month_validate || "Not Specified");
	const planName = normalizeData(plan.plan || "");
	let category = "Monthly Plans"; // Default to Monthly Plans

	if (
		validity.toLowerCase().includes("saturday") ||
		validity.toLowerCase().includes("sunday") ||
		planName.toLowerCase().includes("weekend")
	) {
		category = "Weekend Plans";
	} else if (
		validity.toLowerCase().includes("night") ||
		planName.toLowerCase().includes("night")
	) {
		category = "Night Plans";
	} else if (planName.toLowerCase().includes("unlimited")) {
		category = "Unlimited Plans";
	} else {
		const daysMatch = validity.match(/\d+/);
		const days = daysMatch ? parseInt(daysMatch[0], 10) : 0;
		if (
			validity.toLowerCase().includes("month") ||
			validity.toLowerCase().includes("30 days") ||
			days >= 30
		) {
			category = "Monthly Plans";
		} else if (
			validity.toLowerCase().includes("day") &&
			(["24 hrs", "48 hrs", "72 hrs"].includes(validity.toLowerCase()) ||
				days <= 3)
		) {
			category = "Daily Plans";
		} else if (days >= 5 && days <= 14) {
			category = "Weekly Plans";
		}
	}
	return category;
};

const mapPlanType = (plan: any): string => {
	const variationCode = plan.dataplan_id
		? String(plan.dataplan_id).toUpperCase()
		: "";
	const planTypeRaw = plan.plan_type
		? String(plan.plan_type).toUpperCase()
		: "";

	if (variationCode) {
		if (
			variationCode.includes("CORPORATE_GIFTING") ||
			variationCode.includes("CORPORATE-GIFTING") ||
			variationCode.includes("CG")
		) {
			return "CORPORATE_GIFTING";
		}
		if (
			variationCode.includes("SME_GIFTING") ||
			variationCode.includes("SME-GIFTING")
		) {
			return "SME_GIFTING";
		}
		if (variationCode.includes("GIFTING")) {
			return "GIFTING";
		}
		if (variationCode.includes("STANDARD")) {
			return "STANDARD";
		}
	}

	// Fallback to plan_type or provider name if variation_code is missing
	const fallbackPlanType = planTypeRaw || plan.network || "SME";
	return fallbackPlanType;
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [providerPlans, setProviderPlans] = useState<ProviderPlans>({});
	const [walletBalance, setWalletBalance] = useState<number | null>(null);
	const [userEmail, setUserEmail] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const fetchData = useCallback(async () => {
		try {
			setIsLoading(true);
			setErrorMessage(null);

			// Fetch wallet balance
			let walletData = null;
			let attempts = 0;
			const maxAttempts = 3;
			while (attempts < maxAttempts) {
				try {
					const { data, error } = await supabase
						.from("wallet")
						.select("balance")
						.eq("user_email", userEmail)
						.single();

					if (error && error.code !== "PGRST116") {
						console.error("Wallet fetch error:", error);
						throw error;
					}
					walletData = data;
					break;
				} catch (error) {
					attempts++;
					if (attempts === maxAttempts) {
						console.error(
							"Failed to fetch wallet balance after retries:",
							error,
						);
						throw new Error("Failed to fetch wallet balance");
					}
					await new Promise((resolve) => setTimeout(resolve, 1000));
				}
			}
			const currentBalance = walletData?.balance ?? 0;
			setWalletBalance(currentBalance);

			// Subscribe to wallet updates
			const subscription = supabase
				.channel(`wallet-updates:${userEmail}`)
				.on(
					"postgres_changes",
					{
						event: "UPDATE",
						schema: "public",
						table: "wallet",
						filter: `user_email=eq.${userEmail}`,
					},
					(payload) => {
						// console.log("Wallet balance updated:", payload.new.balance);
						setWalletBalance(payload.new.balance ?? 0);
					},
				)
				.subscribe((status, err) => {
					if (err) console.error("Error in subscription:", err);
				});

			// Fetch provider plans
			const newPlans: ProviderPlans = {};
			const response = await fetch("https://ebenkdata.com/api/network/", {
				headers: {
					Authorization: "Token de883370902cf73e68ed63f566dbf38a38719f03",
				},
			});

			if (!response.ok) {
				throw new Error(
					`API request failed: ${response.status} ${response.statusText}`,
				);
			}

			const rawData = await response.text();
			let parsedData;
			try {
				parsedData = JSON.parse(rawData);
			} catch (parseError) {
				console.error(
					`Unable to parse API response: ${rawData.slice(0, 200)}...`,
					parseError,
				);
				throw new Error("Invalid API response format");
			}

			for (const provider of SUPPORTED_PROVIDERS) {
				const cacheKey = provider.toUpperCase();
				let plans: DataBundle[] = [];

				if (
					planCache[cacheKey] &&
					Date.now() - planCache[cacheKey].timestamp < CACHE_DURATION
				) {
					plans = planCache[cacheKey].data;
				} else {
					const providerKey = `${provider}_PLAN`;
					const providerPlans = parsedData[providerKey];

					if (!providerPlans) {
						console.warn(`No data for ${providerKey} in API response`);
						planCache[cacheKey] = { data: [], timestamp: Date.now() };
						newPlans[cacheKey] = [];
						continue;
					}

					if (!Array.isArray(providerPlans)) {
						console.error(
							`Invalid data format for ${providerKey}:`,
							providerPlans,
						);
						planCache[cacheKey] = { data: [], timestamp: Date.now() };
						newPlans[cacheKey] = [];
						continue;
					}

					if (providerPlans.length === 0) {
						console.warn(`No plans available for ${provider}`);
						planCache[cacheKey] = { data: [], timestamp: Date.now() };
						newPlans[cacheKey] = [];
						continue;
					}

					// Process plans with database price adjustments
					plans = await Promise.all(
						providerPlans.map(async (plan: any) => {
							const mappedPlan = {
								id: plan.id || Math.floor(Math.random() * 10000),
								data: normalizeData(plan.plan || "Unknown"),
								price: await calculatePriceWithAdjustments(plan, provider),
								validity: normalizeValidity(
									plan.month_validate || "Not Specified",
								),
								category: determineCategory(plan),
								description: normalizeData(plan.plan || ""),
								variation_code: plan.dataplan_id
									? String(plan.dataplan_id)
									: undefined,
								planType: mapPlanType({ ...plan, network: provider }),
							};
							return mappedPlan;
						}),
					);

					planCache[cacheKey] = { data: plans, timestamp: Date.now() };
				}
				newPlans[cacheKey] = plans;
			}

			setProviderPlans(newPlans);

			return () => {
				supabase.removeChannel(subscription);
			};
		} catch (error: any) {
			console.error("Error fetching data:", error);
			setErrorMessage(`Failed to load data: ${error.message}`);
			// Clear cache for all providers on error to force fresh fetch
			SUPPORTED_PROVIDERS.forEach((provider) => {
				delete planCache[provider.toUpperCase()];
			});
			// Clear price adjustments cache on error
			priceAdjustmentsCache.data = {};
			priceAdjustmentsCache.timestamp = 0;
		} finally {
			setIsLoading(false);
		}
	}, [userEmail]);

	useEffect(() => {
		const { data: authListener } = supabase.auth.onAuthStateChange(
			(event, session) => {
				if (event === "SIGNED_IN" && session?.user?.email) {
					// console.log("User signed in:", session.user.email);
					setUserEmail(session.user.email);
					fetchData();
				} else if (event === "SIGNED_OUT") {
					// console.log("User signed out");
					setUserEmail(null);
					setProviderPlans({});
					setWalletBalance(null);
					setErrorMessage(null);
					Object.keys(planCache).forEach((key) => delete planCache[key]);
					// Clear price adjustments cache on sign out
					priceAdjustmentsCache.data = {};
					priceAdjustmentsCache.timestamp = 0;
				}
			},
		);

		// Check initial auth state
		supabase.auth.getUser().then(({ data: { user }, error }) => {
			if (user?.email && !error) {
				setUserEmail(user.email);
				fetchData();
			} else {
				console.log("Initial auth check: No user authenticated");
			}
		});

		return () => {
			authListener.subscription.unsubscribe();
		};
	}, [fetchData]);

	return (
		<DataContext.Provider
			value={{
				providerPlans,
				walletBalance,
				userEmail,
				isLoading,
				errorMessage,
				fetchData,
			}}
		>
			{children}
		</DataContext.Provider>
	);
};