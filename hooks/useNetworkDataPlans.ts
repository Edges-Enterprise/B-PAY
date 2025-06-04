// hooks/useNetworkDataPlans.ts
import { useQuery } from "@tanstack/react-query";

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

interface Provider {
	id: number;
	name: string;
	image: any;
	code: string;
}

export const useNetworkPlans = (provider: Provider | null) => {
	return useQuery({
		queryKey: ["networkPlans", provider?.name],
		queryFn: async () => {
			if (!provider) throw new Error("Provider is required");

			const response = await fetch(
				`${process.env.EXPO_PUBLIC_EBENK_URL}/api/network/`,
				{
					headers: {
						Authorization: "Token de883370902cf73e68ed63f566dbf38a38719f03",
					},
				},
			);

			if (!response.ok) {
				throw new Error(`Failed to fetch data plans: ${response.status}`);
			}

			const data = await response.json();
			const providerKey = `${provider.name}_PLAN`;
			const plans = data[providerKey];

			if (!Array.isArray(plans) || plans.length === 0) {
				throw new Error(`No plans found for ${provider.name}`);
			}

			const fetchedBundles: DataBundle[] = plans.map((plan: any) => {
				const dataAmount = plan.plan || "Unknown";
				let validity = plan.month_validate || "Not Specified";
				let category = "";

				// Category logic
				if (
					validity.toLowerCase().includes("saturday") ||
					validity.toLowerCase().includes("sunday") ||
					plan.plan.toLowerCase().includes("weekend")
				) {
					category = "Weekend Plans";
					validity = "Weekend";
				} else if (
					validity.toLowerCase().includes("night") ||
					plan.plan.toLowerCase().includes("night")
				) {
					category = "Night Plans";
					validity = "11 PM - 5 AM";
				} else if (plan.plan.toLowerCase().includes("unlimited")) {
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
					} else if (
						["24 hrs", "48 hrs", "72 hrs"].includes(validity) ||
						days <= 3
					) {
						category = "Daily Plans";
					} else if (days >= 5 && days <= 14) {
						category = "Weekly Plans";
					} else {
						category = "Monthly Plans";
					}
				}

				const planType = plan.plan_type || "Standard";

				return {
					id: plan.id,
					data: dataAmount,
					price: parseFloat(plan.plan_amount) + 50,
					validity,
					category,
					description: plan.plan,
					variation_code: plan.dataplan_id,
					planType,
				};
			});

			return fetchedBundles;
		},
		enabled: !!provider,
		staleTime: 15 * 60 * 1000, // 15 minutes
		gcTime: 30 * 60 * 1000, // 30 minutes
		retry: 2,
	});
};
