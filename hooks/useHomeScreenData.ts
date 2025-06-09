// hooks/useHomeScreenData.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/config/supabase";
import { useAuth } from "@/context/supabase-provider";
import { useEffect } from "react";

interface Purchase {
    plan_name: string;
    mobile_number: string; // ✅ Changed from phone_number → mobile_number
    provider_name: string;
    validity: string;
}

interface PurchaseWithAmount extends Purchase {
    provider: string;
    amount: number;
}

interface SimilarPlan {
    plan_name: string;
    provider: string;
    amount: number;
    data: string;
    validity: string;
    variation_code: string;
}

export function usePurchaseHistory() {
    const { user } = useAuth();

    return useQuery({
        queryKey: ["purchaseHistory", user?.email],
        queryFn: async (): Promise<Purchase[]> => {
            if (!user?.email) throw new Error("User email not available");

            const { data: purchases, error } = await supabase
                .from("data_purchases")
                .select("plan_name, mobile_number, provider_name, validity") // ✅ Changed here
                .eq("user_email", user.email)
                .order("created_at", { ascending: false });

            if (error) throw error;
            return purchases || [];
        },
        enabled: !!user?.email,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
        retry: 2,
    });
}

export function useNotificationCount() {
    const { user } = useAuth();

    return useQuery({
        queryKey: ["notificationCount", user?.id],
        queryFn: async (): Promise<number> => {
            if (!user?.id) return 0;

            const { count, error } = await supabase
                .from("notifications")
                .select("*", { count: "exact", head: true })
                .eq("user_id", user.id)
                .eq("is_read", false);

            if (error) throw error;
            return count || 0;
        },
        enabled: !!user?.id,
        staleTime: 30 * 1000, // 30 seconds
        gcTime: 2 * 60 * 1000, // 2 minutes
        refetchInterval: 60 * 1000, // Refetch every minute
    });
}

export function useSimilarPlans(purchases: PurchaseWithAmount[]) {
    return useQuery({
        queryKey: ["similarPlans", purchases],
        queryFn: async (): Promise<SimilarPlan[]> => {
            if (purchases.length === 0) return [];

            try {
                const providers = Array.from(new Set(purchases.map((p) => p.provider)));
                const amounts = purchases.map((p) => p.amount);
                const avgAmount =
                    amounts.length > 0
                        ? amounts.reduce((sum, a) => sum + a, 0) / amounts.length
                        : 300;
                const amountRange = [Math.max(100, avgAmount * 0.5), avgAmount * 1.5];

                const response = await fetch(
                    `${process.env.EXPO_PUBLIC_EBENK_URL}/api/plans`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: "Token de883370902cf73e68ed63f566dbf38a38719f03",
                        },
                        body: JSON.stringify({
                            providers,
                            amount_range: amountRange,
                        }),
                    },
                );

                const data = await response.json();
                if (data.status === "success" && Array.isArray(data.plans)) {
                    return data.plans.map((plan: any) => ({
                        plan_name: `${plan.provider} ${plan.data} – ₦${plan.amount}`,
                        provider: plan.provider,
                        amount: plan.amount,
                        data: plan.data,
                        validity: plan.validity,
                        variation_code: plan.variation_code,
                    }));
                }
                return [];
            } catch (error) {
                console.error("Error fetching similar plans from API:", error);
                return [];
            }
        },
        enabled: purchases.length > 0,
        staleTime: 10 * 60 * 1000, // 10 minutes
        gcTime: 30 * 60 * 1000, // 30 minutes
    });
}

export function useCreateTransactionPin() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (pin: string) => {
            const { error } = await supabase.auth.updateUser({
                data: {
                    ...user?.user_metadata,
                    transaction_pin_created: true,
                    transaction_pin: pin,
                },
            });
            if (error) throw error;
            return pin;
        },
        onSuccess: () => {
            console.log("Transaction PIN set successfully");
            // Invalidate user-related queries
            queryClient.invalidateQueries({ queryKey: ["user"] });
        },
        onError: (error) => {
            console.error("Error updating user metadata:", error);
            throw error;
        },
    });
}

// Hook for real-time notification updates
export function useNotificationSubscription() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!user?.id) return;

        const subscription = supabase
            .channel("notifications")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "notifications",
                    filter: `user_id=eq.${user.id}`,
                },
                () => {
                    // Invalidate and refetch notification count
                    queryClient.invalidateQueries({
                        queryKey: ["notificationCount", user.id],
                    });
                },
            )
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [user?.id, queryClient]);
}