// hooks/useLastPurchasedBundle.ts;
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/config/supabase";

interface DataBundle {
	id: number;
	data: string;
	price: number;
	validity: string;
	category: string;
	description?: string;
	variation_code: string;
	planType: string;
}

export const useLastPurchasedBundle = (
	userEmail: string | undefined,
	phoneNumber: string,
) => {
	return useQuery({
		queryKey: ["lastPurchasedBundle", userEmail, phoneNumber],
		queryFn: async () => {
			if (!userEmail) throw new Error("User email required");

			const { data: transactions, error } = await supabase
				.from("transactions")
				.select("metadata, created_at")
				.eq("user_email", userEmail)
				.eq("status", "success")
				.eq("metadata->>phone_number", phoneNumber)
				.order("created_at", { ascending: false })
				.limit(1)
				.single();

			if (error && error.code !== "PGRST116") {
				console.warn("No previous transactions found or error:", error);
				return null;
			}

			if (!transactions?.metadata) return null;

			const { purchase, validity } = transactions.metadata;
			const match = purchase.match(/(.+?) on/);
			const data = match ? match[1].trim() : purchase;

			const bundle: DataBundle = {
				id: 0,
				data,
				price: 0,
				validity,
				category: "",
				variation_code: "",
				planType: "",
			};

			return {
				bundle,
				purchaseTime: transactions.created_at,
			};
		},
		enabled: !!userEmail && phoneNumber.length === 11,
		staleTime: 10 * 60 * 1000, // 10 minutes
	});
};
