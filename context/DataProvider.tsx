import React, { createContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/config/supabase";
import { useSupabase } from "./supabase-provider";

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

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

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
	const variationCode = plan.variation_code || plan.dataplan_id;
	const planTypeRaw = plan.plan_type?.toUpperCase() || "";

	if (variationCode) {
		if (variationCode.toLowerCase().includes("corporate")) {
			return "CORPORATE_GIFTING";
		}
		if (variationCode.toLowerCase().includes("sme")) {
			return planTypeRaw.includes("GIFTING") ? "SME_GIFTING" : "SME";
		}
		if (variationCode.toLowerCase().includes("gifting")) {
			return "GIFTING";
		}
		if (
			variationCode.toLowerCase().includes("direct") ||
			variationCode.toLowerCase().includes("standard")
		) {
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
	const { user } = useSupabase();
	const [providerPlans, setProviderPlans] = useState<ProviderPlans>({});
	const [walletBalance, setWalletBalance] = useState<number | null>(null);
	const [userEmail, setUserEmail] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	useEffect(() => {
		setUserEmail(user?.email || null);
	}, [user]);

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

			// Fetch provider plans from Supabase
			const { data: rawPlans, error: plansError } = await supabase
				.from("e_data_plans")
				.select("*");

			if (plansError) {
				throw new Error(`Failed to fetch plans: ${plansError.message}`);
			}

			const newPlans: ProviderPlans = {};
			for (const provider of SUPPORTED_PROVIDERS) {
				const cacheKey = provider.toUpperCase();
				let plans: DataBundle[] = [];

				if (
					planCache[cacheKey] &&
					Date.now() - planCache[cacheKey].timestamp < CACHE_DURATION
				) {
					plans = planCache[cacheKey].data;
				} else {
					const providerPlans = rawPlans.filter(
						(p) => p.plan_network.toUpperCase() === provider.toUpperCase()
					);

					if (providerPlans.length === 0) {
						console.warn(`No plans available for ${provider}`);
						planCache[cacheKey] = { data: [], timestamp: Date.now() };
						newPlans[cacheKey] = [];
						continue;
					}

					plans = providerPlans.map((plan: any) => ({
						id: plan.id,
						data: normalizeData(plan.plan),
						price: parseFloat(plan.sell_price) || 0,
						validity: normalizeValidity(plan.month_validate || "Not Specified"),
						category: determineCategory(plan),
						description: normalizeData(plan.plan),
						variation_code: plan.dataplan_id ? String(plan.dataplan_id) : undefined,
						planType: mapPlanType({ ...plan, network: provider }),
					}));

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
		} finally {
			setIsLoading(false);
		}
	}, [userEmail]);

	useEffect(() => {
		if (userEmail) {
			fetchData();
		}
	}, [userEmail, fetchData]);

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
