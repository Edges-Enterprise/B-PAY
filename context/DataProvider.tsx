// DataProvider.tsx
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

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 h

/** Map `plan_network` (1-4) → provider name */
const NETWORK_MAP: { [key: number]: string } = {
  1: "MTN",
  2: "AIRTEL",
  3: "GLO",
  4: "9MOBILE",
};

const SUPPORTED_NETWORK_IDS = [1, 2, 3, 4];

const normalizeData = (s: string) => s?.trim().replace(/\s+/g, " ") ?? "Unknown";

const normalizeValidity = (s: string) => {
  if (!s) return "Not Specified";
  const v = s.trim().replace(/\s+/g, " ").toLowerCase();
  if (v.includes("30 days") || v.includes("30days")) return "30 Days";
  if (v.includes("7 days") || v.includes("7days")) return "7 Days";
  if (v.includes("1 day") || v.includes("1day")) return "1 Day";
  return v.charAt(0).toUpperCase() + v.slice(1);
};

const determineCategory = (plan: any) => {
  const validity = normalizeValidity(plan.validity);
  const name = normalizeData(plan.plan);
  let cat = "Monthly Plans";

  if (validity.toLowerCase().includes("saturday") || validity.toLowerCase().includes("sunday") || name.toLowerCase().includes("weekend"))
    cat = "Weekend Plans";
  else if (validity.toLowerCase().includes("night") || name.toLowerCase().includes("night"))
    cat = "Night Plans";
  else if (name.toLowerCase().includes("unlimited"))
    cat = "Unlimited Plans";
  else {
    const days = Number(validity.match(/\d+/)?.[0]) || 0;
    if (validity.toLowerCase().includes("month") || days >= 30) cat = "Monthly Plans";
    else if (validity.toLowerCase().includes("day") && (days <= 3 || ["24 hrs", "48 hrs", "72 hrs"].includes(validity.toLowerCase())))
      cat = "Daily Plans";
    else if (days >= 5 && days <= 14) cat = "Weekly Plans";
  }
  return cat;
};

const mapPlanType = (plan: any) => {
  const code = plan.dataplan_id?.toString() ?? "";
  const raw = (plan.plan_type ?? "").toUpperCase();

  if (code.toLowerCase().includes("corporate")) return "CORPORATE_GIFTING";
  if (code.toLowerCase().includes("sme")) return raw.includes("GIFTING") ? "SME_GIFTING" : "SME";
  if (code.toLowerCase().includes("gifting")) return "GIFTING";
  if (code.toLowerCase().includes("direct") || code.toLowerCase().includes("standard")) return "STANDARD";

  // fallback
  return raw || NETWORK_MAP[plan.plan_network] || "SME";
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useSupabase();
  const [providerPlans, setProviderPlans] = useState<ProviderPlans>({});
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => setUserEmail(user?.email ?? null), [user]);

  const fetchData = useCallback(async () => {
    if (!userEmail) return;

    try {
      setIsLoading(true);
      setErrorMessage(null);

      // ── Wallet ─────────────────────────────────────
      let wallet = null;
      let attempts = 0;
      while (attempts < 3) {
        const { data, error } = await supabase
          .from("wallet")
          .select("balance")
          .eq("user_email", userEmail)
          .single();

        if (!error || error.code === "PGRST116") {
          wallet = data;
          break;
        }
        attempts++;
        await new Promise(r => setTimeout(r, 1000));
      }
      setWalletBalance(wallet?.balance ?? 0);

      // ── Real-time wallet ───────────────────────────
      const sub = supabase
        .channel(`wallet-updates:${userEmail}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "wallet", filter: `user_email=eq.${userEmail}` },
          payload => setWalletBalance(payload.new.balance ?? 0)
        )
        .subscribe();

      // ── Plans from lizzy ───────────────────────────
      const { data: raw, error: planErr } = await supabase.from("lizzy").select("*");
      if (planErr) throw planErr;

      const newPlans: ProviderPlans = {};

      for (const netId of SUPPORTED_NETWORK_IDS) {
        const provider = NETWORK_MAP[netId];
        const cacheKey = provider;

        let plans: DataBundle[] = [];

        if (planCache[cacheKey] && Date.now() - planCache[cacheKey].timestamp < CACHE_DURATION) {
          plans = planCache[cacheKey].data;
        } else {
          const providerRows = raw.filter(r => Number(r.plan_network) === netId);
          plans = providerRows.map(p => ({
            id: p.plan_id,
            data: normalizeData(p.plan),
            price: Number(p.sell_price) || 0,
            validity: normalizeValidity(p.validity),
            category: determineCategory(p),
            description: normalizeData(p.plan),
            variation_code: p.dataplan_id ? String(p.dataplan_id) : undefined,
            planType: mapPlanType(p),
          }));
          planCache[cacheKey] = { data: plans, timestamp: Date.now() };
        }
        newPlans[provider] = plans;
      }

      setProviderPlans(newPlans);
      return () => supabase.removeChannel(sub);
    } catch (e: any) {
      console.error("fetchData error:", e);
      setErrorMessage(`Failed to load data: ${e.message}`);
      // clear stale cache
      Object.keys(planCache).forEach(k => delete planCache[k]);
    } finally {
      setIsLoading(false);
    }
  }, [userEmail]);

  useEffect(() => {
    if (userEmail) fetchData();
  }, [userEmail, fetchData]);

  return (
    <DataContext.Provider
      value={{ providerPlans, walletBalance, userEmail, isLoading, errorMessage, fetchData }}
    >
      {children}
    </DataContext.Provider>
  );
};