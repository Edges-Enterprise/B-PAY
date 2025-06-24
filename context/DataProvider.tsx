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

const planCache: { [providerName: string]: { data: DataBundle[]; timestamp: number } } = {};
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const SUPPORTED_PROVIDERS = ["MTN", "AIRTEL", "GLO", "9MOBILE"];

const MTN_PRICE_ADJUSTMENTS: { [key: string]: { data: string; validity: string; targetPrice: number } } = {
  "75.0MB_1day": { data: "75.0MB", validity: "1 Day", targetPrice: 80 },
  "110.0MB_1day": { data: "110.0MB", validity: "1 Day", targetPrice: 99 },
  "1.0GB_1day_Strong": { data: "1.0GB", validity: "1 Day (Strong)", targetPrice: 498 },
  "1.5GB_2days": { data: "1.5GB", validity: "2 Days", targetPrice: 595 },
  "2.5GB_2days": { data: "2.5GB", validity: "2 Days", targetPrice: 898 },
  "3.2GB_2days": { data: "3.2GB", validity: "2 Days", targetPrice: 995 },
  "2.0GB_30days": { data: "2.0GB", validity: "30 Days", targetPrice: 1490 },
  "2.0GB_30_days": { data: "2.0GB", validity: "30 Days", targetPrice: 1490 },
  "1.5GB_7days": { data: "1.5GB", validity: "7 Days", targetPrice: 990 },
  "1.0GB_7days": { data: "1.0GB", validity: "7 Days", targetPrice: 790 },
};

const normalizeData = (data: string): string => {
  return data ? data.trim().replace(/\s+/g, " ") : "Unknown";
};

const normalizeValidity = (validity: string): string => {
  if (!validity) return "Not Specified";
  const normalized = validity.trim().replace(/\s+/g, " ").toLowerCase();
  if (normalized.includes("30 days") || normalized.includes("30days")) return "30 Days";
  if (normalized.includes("7 days") || normalized.includes("7days")) return "7 Days";
  if (normalized.includes("1 day") || normalized.includes("1day")) return "1 Day";
  if (normalized.includes("month")) return normalized.replace("month", "Month");
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const calculateMTNPrice = (plan: any, provider: string): number => {
  if (provider.toUpperCase() !== "MTN") {
    const price = parseFloat(plan.plan_amount || "0");
    const adjustedPrice = price > 0 ? price + 50 : 0;
    console.log(`Price for ${provider} plan ID ${plan.id}: ${plan.plan || "Unknown"}, ${plan.month_validate || "Not Specified"} -> ₦${adjustedPrice}`);
    return adjustedPrice;
  }

  const planData = normalizeData(plan.plan || "");
  const planValidity = normalizeValidity(plan.month_validate || "");

  for (const key in MTN_PRICE_ADJUSTMENTS) {
    const adjustment = MTN_PRICE_ADJUSTMENTS[key];
    if (planData === adjustment.data && planValidity === adjustment.validity) {
      console.log(`Price match for MTN plan ID ${plan.id}: ${planData}, ${planValidity} -> ₦${adjustment.targetPrice}`);
      return adjustment.targetPrice;
    }
  }
  const defaultPrice = parseFloat(plan.plan_amount || "0") + 50;
  console.log(`No price match for MTN plan ID ${plan.id}: ${planData}, ${planValidity}, using default ₦${defaultPrice}`);
  return defaultPrice;
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
      (["24 hrs", "48 hrs", "72 hrs"].includes(validity.toLowerCase()) || days <= 3)
    ) {
      category = "Daily Plans";
    } else if (days >= 5 && days <= 14) {
      category = "Weekly Plans";
    }
  }
  console.log(`Category for plan ID ${plan.id}: ${planName}, ${validity} -> ${category}`);
  return category;
};

const mapPlanType = (plan: any): string => {
  const variationCode = plan.dataplan_id ? String(plan.dataplan_id).toUpperCase() : "";
  const planTypeRaw = plan.plan_type ? String(plan.plan_type).toUpperCase() : "";
  console.log(`Mapping plan ID ${plan.id}: variation_code=${plan.dataplan_id || "N/A"}, plan_type=${plan.plan_type || "N/A"}`);

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
  console.log(`Fallback planType for ID ${plan.id}: ${fallbackPlanType}`);
  return fallbackPlanType;
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
            .from("wallets")
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
            console.error("Failed to fetch wallet balance after retries:", error);
            throw new Error("Failed to fetch wallet balance");
          }
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
      const currentBalance = walletData?.balance ?? 0;
      console.log("Fetched wallet balance:", currentBalance);
      setWalletBalance(currentBalance);

      // Subscribe to wallet updates
      const subscription = supabase
        .channel(`wallet-updates:${userEmail}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "wallets",
            filter: `user_email=eq.${userEmail}`,
          },
          (payload) => {
            console.log("Wallet balance updated:", payload.new.balance);
            setWalletBalance(payload.new.balance ?? 0);
          }
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
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const rawData = await response.text();
      let parsedData;
      try {
        parsedData = JSON.parse(rawData);
        console.log("Raw API response:", JSON.stringify(parsedData, null, 2).slice(0, 1000) + "...");
      } catch (parseError) {
        console.error(`Unable to parse API response: ${rawData.slice(0, 200)}...`, parseError);
        throw new Error("Invalid API response format");
      }

      for (const provider of SUPPORTED_PROVIDERS) {
        const cacheKey = provider.toUpperCase();
        let plans: DataBundle[] = [];

        console.log(`Checking cache for ${provider}, cacheExists: ${!!planCache[cacheKey]}, age: ${planCache[cacheKey] ? (Date.now() - planCache[cacheKey].timestamp) / 1000 / 60 : "N/A"} minutes`);

        if (planCache[cacheKey] && Date.now() - planCache[cacheKey].timestamp < CACHE_DURATION) {
          console.log(`Using cached plans for ${provider}`, { planCount: planCache[cacheKey].data.length });
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
            console.error(`Invalid data format for ${providerKey}:`, providerPlans);
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

          plans = providerPlans.map((plan: any) => {
            const mappedPlan = {
              id: plan.id || Math.floor(Math.random() * 10000), // Fallback ID
              data: normalizeData(plan.plan || "Unknown"),
              price: calculateMTNPrice(plan, provider),
              validity: normalizeValidity(plan.month_validate || "Not Specified"),
              category: determineCategory(plan),
              description: normalizeData(plan.plan || ""),
              variation_code: plan.dataplan_id ? String(plan.dataplan_id) : undefined,
              planType: mapPlanType({ ...plan, network: provider }), // Pass provider as fallback
            };
            return mappedPlan;
          });

          console.log(`Fetched ${plans.length} plans for ${provider}`, {
            sample: plans.slice(0, 3).map((p) => ({
              id: p.id,
              planType: p.planType,
              variation_code: p.variation_code,
              category: p.category,
              data: p.data,
              validity: p.validity,
              price: p.price,
            })),
          });

          planCache[cacheKey] = { data: plans, timestamp: Date.now() };
        }
        newPlans[cacheKey] = plans;
      }

      setProviderPlans(newPlans);
      console.log("Provider plans updated:", Object.keys(newPlans).map(key => `${key}: ${newPlans[key].length} plans`));

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
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user?.email) {
        console.log("User signed in:", session.user.email);
        setUserEmail(session.user.email);
        fetchData();
      } else if (event === "SIGNED_OUT") {
        console.log("User signed out");
        setUserEmail(null);
        setProviderPlans({});
        setWalletBalance(null);
        setErrorMessage(null);
        Object.keys(planCache).forEach((key) => delete planCache[key]);
      }
    });

    // Check initial auth state
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (user?.email && !error) {
        console.log("Initial auth check: User signed in:", user.email);
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