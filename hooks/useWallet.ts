// hooks/useWallet.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/config/supabase';

export const useWallet = (userEmail: string | undefined) => {
  return useQuery({
		queryKey: ["wallet", userEmail],
		queryFn: async () => {
			if (!userEmail) throw new Error("User email required");

			const { data: wallet, error } = await supabase
				.from("wallets")
				.select("balance")
				.eq("user_email", userEmail)
				.single();

			if (error && error.code !== "PGRST116") {
				throw error;
			}

			return wallet?.balance || 0;
		},
		enabled: !!userEmail,
		staleTime: 2 * 60 * 1000, // 2 minutes
		refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
	});
};