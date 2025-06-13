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
  "75.0MB_1day": { data: "75.0MB", validity: "1day", targetPrice: 80 },
  "110.0MB_1day": { data: "110.0MB", validity: "1day", targetPrice: 99 },
  "1.0GB_1day_Strong": { data: "1.0GB", validity: "1day (Strong)", targetPrice: 498 },
  "1.5GB_2days": { data: "1.5GB", validity: "2days", targetPrice: 595 },
  "2.5GB_2days": { data: "2.5GB", validity: "2days", targetPrice: 898 },
  "3.2GB_2days": { data: "3.2GB", validity: "2days", targetPrice: 995 },
  "2.0GB_30days": { data: "2.0GB", validity: "30days", targetPrice: 1490 },
  "2.0GB_30_days": { data: "2.0GB", validity: "30 days", targetPrice: 1490 },
  "1.5GB_7days": { data: "1.5GB", validity: "7days", targetPrice: 990 },
  "1.0GB_7days": { data: "1.0GB", validity: "7days", targetPrice: 790 },
};

const normalizeData = (data: string): string => {
  return data ? data.trim() : "";
};

const normalizeValidity = (validity: string): string => {
  return validity ? validity.trim() : "";
};

const calculateMTNPrice = (plan: any, provider: string): number => {
  if (provider.toUpperCase() !== "MTN") {
    return parseFloat(plan.plan_amount || "0") + 50;
  }

  const planData = normalizeData(plan.plan || "");
  const planValidity = normalizeValidity(plan.month_validate || "");

  for (const key in MTN_PRICE_ADJUSTMENTS) {
    const adjustment = MTN_PRICE_ADJUSTMENTS[key];
    if (planData === adjustment.data && planValidity === adjustment.validity) {
      console.log(`Price match for plan ID ${plan.id}: ${planData}, ${planValidity} -> ₦${adjustment.targetPrice}`);
      return adjustment.targetPrice;
    }
  }
  const defaultPrice = parseFloat(plan.plan_amount || "0") + 50;
  console.log(`No price match for plan ID ${plan.id}: ${planData}, ${planValidity}, using default ₦${defaultPrice}`);
  return defaultPrice;
};

const determineCategory = (plan: any): string => {
  const validity = plan.month_validate || "Not Specified";
  const planName = plan.plan || "";
  let category = "";
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
      validity.toLowerCase().includes("months") ||
      validity.toLowerCase().includes("30 days") ||
      validity.toLowerCase().includes("30days") ||
      days >= 30
    ) {
      category = "Monthly Plans";
    } else if (["24 hrs", "48 hrs", "72 hrs"].includes(validity.toLowerCase()) || days <= 3) {
      category = "Daily Plans";
    } else if (days >= 5 && days <= 14) {
      category = "Weekly Plans";
    } else {
      category = "Monthly Plans";
    }
  }
  return category;
};

const mapPlanType = (plan: any): string => {
  const variationCode = plan.dataplan_id ? String(plan.dataplan_id).toUpperCase() : "";
  console.log(`Mapping plan ID ${plan.id}: variation_code=${plan.dataplan_id}, plan_type=${plan.plan_type}`);
  if (variationCode) {
    if (variationCode.includes("CORPORATE_GIFTING") || variationCode.includes("CORPORATE-GIFTING") || variationCode.includes("CG")) {
      return "CORPORATE_GIFTING";
    }
    if (variationCode.includes("SME_GIFTING") || variationCode.includes("SME-GIFTING")) {
      return "SME_GIFTING";
    }
    if (variationCode.includes("GIFTING")) {
      return "GIFTING";
    }
    if (variationCode.includes("STANDARD")) {
      return "STANDARD";
    }
  }
  const planType = plan.plan_type ? String(plan.plan_type).toUpperCase() : "SME";
  console.log(`Fallback planType for ID ${plan.id}: ${planType}`);
  return planType;
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

      // Authenticate user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user?.email) {
        throw new Error("User authentication failed or email missing");
      }
      setUserEmail(user.email);
      console.log("Authenticated user:", user.email);

      // Fetch wallet balance
      let walletData = null;
      let attempts = 0;
      const maxAttempts = 3;
      while (attempts < maxAttempts) {
        try {
          const { data, error } = await supabase
            .from("wallets")
            .select("balance")
            .eq("user_email", user.email)
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
      console.log("Wallet balance:", currentBalance);
      setWalletBalance(currentBalance);

      // Subscribe to wallet updates
      const subscription = supabase
        .channel(`wallet-updates:${user.email}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "wallets",
            filter: `user_email=eq.${user.email}`,
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
      for (const provider of SUPPORTED_PROVIDERS) {
        const cacheKey = provider.toUpperCase();
        let plans: DataBundle[] = [];

        // Force refresh for debugging
        console.log(`Checking cache for ${provider}, cacheExists: ${!!planCache[cacheKey]}, age: ${planCache[cacheKey] ? (Date.now() - planCache[cacheKey].timestamp) / 1000 / 60 : "N/A"} minutes`);
        if (planCache[cacheKey] && Date.now() - planCache[cacheKey].timestamp < CACHE_DURATION && false) {
          console.log(`Using cached plans for ${provider}`, { planCount: planCache[cacheKey].data.length });
          plans = planCache[cacheKey].data;
        } else {
          try {
            const response = await fetch("https://ebenkdata.com/api/network/", {
              headers: {
                Authorization: "Token de883370902cf73e68ed63f566dbf38a38719f03",
              },
            });

            const rawData = await response.text();
            let parsedData;
            try {
              parsedData = JSON.parse(rawData);
              console.log(`Raw API response for ${provider}:`, JSON.stringify(parsedData[`${provider}_PLAN`], null, 2).slice(0, 500) + "...");
            } catch (parseError) {
              console.error(`Unable to parse API response for ${provider}: ${rawData.slice(0, 100)}...`, parseError);
              continue;
            }

            if (!response.ok) {
              console.error(`API request failed for ${provider}: ${response.status}`);
              continue;
            }

            const providerKey = `${provider}_PLAN`;
            const providerPlans = parsedData[providerKey];
            if (!Array.isArray(providerPlans) || providerPlans.length === 0) {
              console.warn(`No plans available for ${provider}`);
              continue;
            }

            plans = providerPlans.map((plan: any) => ({
              id: plan.id || 0,
              data: plan.plan || "Unknown",
              price: calculateMTNPrice(plan, provider),
              validity: plan.month_validate || "Not Specified",
              category: determineCategory(plan),
              description: plan.plan,
              variation_code: plan.dataplan_id,
              planType: mapPlanType(plan),
            }));

            console.log(`Fetched ${plans.length} plans for ${provider}`, {
              sample: plans.slice(0, 3).map((p) => ({
                id: p.id,
                planType: p.planType,
                variation_code: p.variation_code,
                category: p.category,
                data: p.data,
                validity: p.validity,
              })),
            });
            planCache[cacheKey] = { data: plans, timestamp: Date.now() };
          } catch (error) {
            console.error(`Error fetching plans for ${provider}:`, error);
            continue;
          }
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
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
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