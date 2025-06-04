// hooks/useBundleFiltering.ts
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

export const useBundleFiltering = (
	bundles: DataBundle[],
	searchQuery: string,
	selectedPlanType: string,
	expandedCategory: string,
	lastPurchasedBundle: DataBundle | null,
) => {
	const parseSearchQuery = (query: string) => {
		const normalizedQuery = query.toLowerCase().trim();
		const dataMatch = normalizedQuery.match(/(\d*\.?\d*)\s*(gb|mb)/i);
		const validityMatch = normalizedQuery.match(
			/(\d+)\s*(day|days|month|months|week|weeks)/i,
		);
		const planTypeMatch = normalizedQuery.match(/(sme|gifting|corporate)/i);

		return {
			dataAmount: dataMatch ? parseFloat(dataMatch[1]) : null,
			dataUnit: dataMatch ? dataMatch[2].toUpperCase() : null,
			validityDays: validityMatch ? parseInt(validityMatch[1], 10) : null,
			validityUnit: validityMatch ? validityMatch[2].toLowerCase() : null,
			planType: planTypeMatch ? planTypeMatch[1].toLowerCase() : null,
		};
	};

	const filterBundlesBySearch = (query: string) => {
		if (!query) return null;

		const { dataAmount, dataUnit, validityDays, validityUnit, planType } =
			parseSearchQuery(query);
		return bundles
			.filter((bundle) => {
				let matches = true;

				// Match data amount
				if (dataAmount && dataUnit) {
					const bundleDataValue = parseFloat(
						bundle.data.match(/[\d.]+/)?.[0] || "0",
					);
					const bundleUnit = bundle.data.match(/[MG]B/)?.[0] || "";
					const bundleDataInMB =
						bundleUnit === "GB" ? bundleDataValue * 1000 : bundleDataValue;
					const searchDataInMB =
						dataUnit === "GB" ? dataAmount * 1000 : dataAmount;
					matches =
						matches &&
						Math.abs(bundleDataInMB - searchDataInMB) <= searchDataInMB * 0.2;
				}

				// Match validity and category
				if (validityDays && validityUnit) {
					const bundleDaysMatch = bundle.validity.match(/\d+/);
					const bundleDays = bundleDaysMatch
						? parseInt(bundleDaysMatch[0], 10)
						: 0;
					const bundleValidityLower = bundle.validity.toLowerCase();

					if (validityUnit.includes("day")) {
						if (validityDays <= 3) {
							matches = matches && bundle.category === "Daily Plans";
						} else if (validityDays <= 14) {
							matches = matches && bundle.category === "Weekly Plans";
						} else {
							matches = matches && bundle.category === "Monthly Plans";
						}
						matches =
							matches &&
							Math.abs(bundleDays - validityDays) <= validityDays * 0.2;
					} else if (validityUnit.includes("week")) {
						const searchDays = validityDays * 7;
						matches = matches && bundle.category === "Weekly Plans";
						matches =
							matches && Math.abs(bundleDays - searchDays) <= searchDays * 0.2;
					} else if (validityUnit.includes("month")) {
						const searchDays = validityDays * 30;
						matches = matches && bundle.category === "Monthly Plans";
						matches =
							matches &&
							(bundleDays === searchDays ||
								bundleValidityLower.includes(`${validityDays} month`) ||
								bundleValidityLower.includes(`${searchDays} days`));
					}
				}

				// Match plan type
				if (planType) {
					matches = matches && bundle.planType.toLowerCase() === planType;
				} else {
					matches =
						matches &&
						bundle.planType.toLowerCase() === selectedPlanType.toLowerCase();
				}

				return matches;
			})
			.sort((a, b) => a.price - b.price);
	};

	const getBundlesForCategory = (category: string) => {
		if (!bundles || !Array.isArray(bundles)) {
			return [];
		}

		if (searchQuery) {
			const searchResults = filterBundlesBySearch(searchQuery);
			return searchResults || [];
		}

		let filteredBundles = bundles;

		filteredBundles = filteredBundles.filter(
			(bundle) =>
				bundle.planType.toLowerCase() === selectedPlanType.toLowerCase(),
		);

		if (category === "Hot" && lastPurchasedBundle) {
			return filteredBundles
				.filter((bundle) => {
					try {
						const isSamePlanType =
							bundle.planType === lastPurchasedBundle.planType;
						const isSameCategory =
							bundle.category === lastPurchasedBundle.category;
						const lastDataValue = parseFloat(
							lastPurchasedBundle.data.match(/[\d.]+/)?.[0] || "0",
						);
						const lastUnit = lastPurchasedBundle.data.match(/[MG]B/)?.[0] || "";
						const lastDataInMB =
							lastUnit === "GB" ? lastDataValue * 1000 : lastDataValue;
						const bundleDataValue = parseFloat(
							bundle.data.match(/[\d.]+/)?.[0] || "0",
						);
						const bundleUnit = bundle.data.match(/[MG]B/)?.[0] || "";
						const bundleDataInMB =
							bundleUnit === "GB" ? bundleDataValue * 1000 : bundleDataValue;
						const isSimilarDataAmount =
							bundleDataInMB >= lastDataInMB * 0.5 &&
							bundleDataInMB <= lastDataInMB * 1.5;
						return isSamePlanType && isSameCategory && isSimilarDataAmount;
					} catch (error) {
						console.error("Error processing bundle:", bundle, error);
						return false;
					}
				})
				.sort((a, b) => a.price - b.price)
				.slice(0, 5);
		}

		return filteredBundles
			.filter((bundle) => bundle.category === category)
			.sort((a, b) => a.price - b.price);
	};

	const availablePlanTypes = useMemo(() => {
		if (searchQuery) {
			const searchResults = filterBundlesBySearch(searchQuery);
			if (searchResults) {
				return Array.from(
					new Set(searchResults.map((bundle) => bundle.planType)),
				).sort();
			}
			return ["SME", "Gifting", "Corporate"];
		}

		if (!bundles || !Array.isArray(bundles)) {
			return [];
		}

		if (expandedCategory === "Hot" && lastPurchasedBundle) {
			const hotBundles = bundles.filter((bundle) => {
				try {
					const isSamePlanType =
						bundle.planType === lastPurchasedBundle.planType;
					const isSameCategory =
						bundle.category === lastPurchasedBundle.category;
					const lastDataValue = parseFloat(
						lastPurchasedBundle.data.match(/[\d.]+/)?.[0] || "0",
					);
					const lastUnit = lastPurchasedBundle.data.match(/[MG]B/)?.[0] || "";
					const lastDataInMB =
						lastUnit === "GB" ? lastDataValue * 1000 : lastDataValue;
					const bundleDataValue = parseFloat(
						bundle.data.match(/[\d.]+/)?.[0] || "0",
					);
					const bundleUnit = bundle.data.match(/[MG]B/)?.[0] || "";
					const bundleDataInMB =
						bundleUnit === "GB" ? bundleDataValue * 1000 : bundleDataValue;
					const isSimilarDataAmount =
						bundleDataInMB >= lastDataInMB * 0.5 &&
						bundleDataInMB <= lastDataInMB * 1.5;
					return isSamePlanType && isSameCategory && isSimilarDataAmount;
				} catch (error) {
					console.error("Error processing bundle:", bundle, error);
					return false;
				}
			});
			return Array.from(
				new Set(hotBundles.map((bundle) => bundle.planType)),
			).sort();
		}

		return Array.from(
			new Set(
				bundles
					.filter((bundle) => bundle.category === expandedCategory)
					.map((bundle) => bundle.planType),
			),
		).sort();
	}, [bundles, expandedCategory, searchQuery, lastPurchasedBundle]);

	return {
		getBundlesForCategory,
		availablePlanTypes,
		filterBundlesBySearch,
	};
};
