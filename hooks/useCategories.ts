// hooks/useCategories.ts
import { useMemo } from "react";

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

export const useCategories = (
	bundles: DataBundle[],
	lastPurchasedBundle: DataBundle | null,
	lastPurchaseTime: string | null,
) => {
	return useMemo(() => {
		if (!bundles?.length) return [];

		const uniqueCategories = Array.from(
			new Set(bundles.map((bundle) => bundle.category)),
		);
		const categoryOrder = [
			"Daily Plans",
			"Weekly Plans",
			"Monthly Plans",
			"Weekend Plans",
			"Night Plans",
			"Unlimited Plans",
		];
		uniqueCategories.sort(
			(a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b),
		);

		let finalCategories = uniqueCategories;

		if (lastPurchasedBundle && lastPurchaseTime) {
			const purchaseDate = new Date(lastPurchaseTime);
			const currentTime = new Date();
			const hoursDiff =
				(currentTime.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60);
			const dataValue = parseFloat(
				lastPurchasedBundle.data.match(/[\d.]+/)?.[0] || "0",
			);
			const unit = lastPurchasedBundle.data.match(/[MG]B/)?.[0] || "";
			const dataInGB = unit === "GB" ? dataValue : dataValue / 1000;

			if (dataInGB >= 5 && hoursDiff <= 6) {
				finalCategories = ["Hot", ...uniqueCategories];
			}
		}

		return finalCategories;
	}, [bundles, lastPurchasedBundle, lastPurchaseTime]);
};
