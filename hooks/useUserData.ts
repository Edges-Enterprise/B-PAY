// hooks/useUserData.ts
import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "@/context/supabase-provider";

export const useUserData = () => {
	const { user, initialized } = useSupabase();

	return useQuery({
		queryKey: ["user", user?.email],
		queryFn: async () => {
			if (!user?.email) {
				throw new Error("User not authenticated or email missing");
			}
			return { email: user.email };
		},
		enabled: initialized && !!user?.email,
		staleTime: 5 * 60 * 1000, // 5 minutes
	});
};
