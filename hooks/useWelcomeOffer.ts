// src/hooks/useWelcomeOffer.ts
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/config/supabase";

export interface WelcomeOfferResult {
  text: Record<string, string> | null;
  stock: number;
  showOffer: boolean;
  timeLeft: number;
}

const isWeekday = (date: Date): boolean => {
  const day = date.getDay();
  return day >= 1 && day <= 5;
};

export const useWelcomeOffer = (userEmail: string) => {
  const queryClient = useQueryClient();

  return useQuery<WelcomeOfferResult>({
    queryKey: ["welcomeOffer", userEmail],
    queryFn: async (): Promise<WelcomeOfferResult> => {
      if (!userEmail) {
        return { text: null, stock: 0, showOffer: false, timeLeft: 0 };
      }

      // 1. Eligibility
      const { count, error: txnErr } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("user_email", userEmail);
      if (txnErr) throw txnErr;
      if (!count || count === 0) {
        return { text: null, stock: 0, showOffer: false, timeLeft: 0 };
      }

      // 2. Text only
      const { data: texts, error: txtErr } = await supabase
        .from("welcome_offer_text")
        .select("key,value");
      if (txtErr) throw txtErr;

      const textMap = Object.fromEntries(texts?.map(t => [t.key, t.value]) ?? []);

      // 3. Usage
      let { data: usage, error: usageErr } = await supabase
        .from("welcome_offer_usage")
        .select("*")
        .eq("user_email", userEmail)
        .single();

      if (usageErr && usageErr.code !== "PGRST116") throw usageErr;

      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];

      if (!usage) {
        const start = new Date();
        const end = new Date(start.getTime() + 30_000);
        const { data, error } = await supabase
          .from("welcome_offer_usage")
          .insert({
            user_email: userEmail,
            used_count: 0,
            claim_window_start: start.toISOString(),
            claim_window_end: end.toISOString(),
            weekday_purchase_days: [],
          })
          .select()
          .single();
        if (error) throw error;
        usage = data;
      }

      // 4. Reactivation
      const weekdayDays: string[] = usage.weekday_purchase_days ?? [];
      const recentWeekdayCount = new Set(
        weekdayDays.filter((d) => d >= todayStr)
      ).size;

      if (usage.used_count >= 3 && recentWeekdayCount >= 5) {
        const start = new Date();
        const end = new Date(start.getTime() + 30_000);
        await supabase
          .from("welcome_offer_usage")
          .update({
            used_count: 0,
            last_used_date: null,
            claim_window_start: start.toISOString(),
            claim_window_end: end.toISOString(),
            weekday_purchase_days: [],
          })
          .eq("user_email", userEmail);
        usage.used_count = 0;
        usage.claim_window_start = start.toISOString();
        usage.claim_window_end = end.toISOString();
        usage.weekday_purchase_days = [];
      }

      // 5. Window
      const windowEnd = usage.claim_window_end ? new Date(usage.claim_window_end) : null;
      const inWindow = windowEnd && now <= windowEnd;

      if (!inWindow || !usage.claim_window_start) {
        const start = new Date();
        const end = new Date(start.getTime() + 30_000);
        await supabase
          .from("welcome_offer_usage")
          .update({
            claim_window_start: start.toISOString(),
            claim_window_end: end.toISOString(),
          })
          .eq("user_email", userEmail);
        usage.claim_window_start = start.toISOString();
        usage.claim_window_end = end.toISOString();
      }

      // 6. Track today
      const { data: todayTxns } = await supabase
        .from("transactions")
        .select("created_at")
        .eq("user_email", userEmail)
        .gte("created_at", `${todayStr}T00:00:00`)
        .lte("created_at", `${todayStr}T23:59:59`);

      if (
        todayTxns?.length > 0 &&
        isWeekday(now) &&
        !weekdayDays.includes(todayStr)
      ) {
        await supabase
          .from("welcome_offer_usage")
          .update({ weekday_purchase_days: [...weekdayDays, todayStr] })
          .eq("user_email", userEmail);
      }

      // 7. Final
      const stock = Math.max(0, 3 - usage.used_count);
      const timeLeft = Math.max(0, new Date(usage.claim_window_end!).getTime() - now.getTime());
      const showOffer = stock > 0 && timeLeft > 0;

      return { text: textMap, stock, showOffer, timeLeft };
    },
    enabled: !!userEmail,
    refetchInterval: 100,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

// Atomic claim via PostgreSQL function
export const claimWelcomeOffer = async (userEmail: string) => {
  const qc = useQueryClient();

  // Optimistic update
  qc.setQueryData<WelcomeOfferResult>(["welcomeOffer", userEmail], (old) => {
    if (!old || old.stock <= 0) return old;
    return { ...old, stock: old.stock - 1, showOffer: old.stock > 1 };
  });

  try {
    const { error } = await supabase.rpc("increment_welcome_offer_claim", {
      p_user_email: userEmail,
    });

    if (error) {
      console.error("RPC Error:", error); // ← ADD THIS LINE
      throw error;
    }
  } catch (err) {
    await qc.refetchQueries({ queryKey: ["welcomeOffer", userEmail] });
    throw err;
  }
};