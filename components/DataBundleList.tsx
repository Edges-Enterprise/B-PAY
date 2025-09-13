import React, { useMemo, useRef, useState, useEffect } from "react";
import {
	View,
	Text,
	Pressable,
	ScrollView,
	Animated,
	PanResponder,
	StyleSheet,
	ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MotiView } from "moti";
import { supabase } from "../config/supabase";

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

interface DataBundleListProps {
	dataBundles: DataBundle[];
	activeCategory: string;
	activePlanType: string;
	searchTerm: string;
	setSelectedBundle: React.Dispatch<React.SetStateAction<DataBundle | null>>;
	setIsPurchaseModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
	isLoading: boolean;
	errorMessage: string | null;
	retryLoad: () => void;
	providerName?: string;
}

const VALID_PLAN_TYPES = [
	"SME",
	"SME_GIFTING",
	"CORPORATE_GIFTING",
	"GIFTING",
	"STANDARD",
	"MTN",
	"AIRTEL",
	"GLO",
	"9MOBILE",
];

const DataBundleList: React.FC<DataBundleListProps> = ({
	dataBundles,
	activeCategory,
	activePlanType,
	searchTerm,
	setSelectedBundle,
	setIsPurchaseModalOpen,
	isLoading,
	errorMessage,
	retryLoad,
	providerName = "",
}) => {
	const [hotDeals, setHotDeals] = useState<DataBundle[]>([]);
	const [hotDealsLoading, setHotDealsLoading] = useState<boolean>(true);
	const [hotDealsError, setHotDealsError] = useState<string | null>(null);

	// Fetch hot deals from Supabase
	useEffect(() => {
		const fetchHotDeals = async () => {
			setHotDealsLoading(true);
			setHotDealsError(null);
			try {
				const { data, error } = await supabase
					.from("hot_deals")
					.select("id, data, price, validity, category, description, plan_type")
					.eq("category", "Hot");

				if (error) {
					throw new Error(`Failed to fetch hot deals: ${error.message}`);
				}

				const formattedData: DataBundle[] = data.map((item: any) => ({
					id: item.id,
					data: item.data,
					price: item.price,
					validity: item.validity,
					category: item.category,
					description: item.description,
					planType: item.plan_type,
				}));

				// Log warnings for inconsistent validity vs. description
				formattedData.forEach((bundle) => {
					if (bundle.description && bundle.validity !== "Not Specified") {
						const descMatch = bundle.description.match(/(\d+\s*(Days|Day))/i);
						const descValidity = descMatch ? descMatch[0] : null;
						if (descValidity && descValidity !== bundle.validity) {
							console.warn(
								`Inconsistent validity for plan ID ${bundle.id}: validity=${bundle.validity}, description=${bundle.description}`,
							);
						}
					}
				});

				// console.log("Fetched hot deals from Supabase:", {
				//   count: formattedData.length,
				//   providers: [...new Set(formattedData.map(b => b.planType))],
				//   byProvider: {
				//     MTN: formattedData.filter(b => b.planType === "MTN").length,
				//     AIRTEL: formattedData.filter(b => b.planType === "AIRTEL").length,
				//     GLO: formattedData.filter(b => b.planType === "GLO").length,
				//     "9MOBILE": formattedData.filter(b => b.planType === "9MOBILE").length,
				//   },
				//   plans: formattedData.map(b => ({
				//     id: b.id,
				//     data: b.data,
				//     price: b.price,
				//     validity: b.validity,
				//     planType: b.planType,
				//     description: b.description,
				//   })),
				// });

				setHotDeals(formattedData);
			} catch (err: any) {
				console.error("Error fetching hot deals:", err.message);
				setHotDealsError("Failed to load hot deals. Please try again.");
			} finally {
				setHotDealsLoading(false);
			}
		};

		fetchHotDeals();
	}, []);

	const formatNumberWithCommas = (number: number): string => {
		return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	};

	const getCategoryBundles = useMemo(() => {
		if (!dataBundles || !Array.isArray(dataBundles)) {
			console.warn("Invalid dataBundles:", dataBundles);
			return [];
		}

		const fallbackProviderName =
			providerName?.toUpperCase() ||
			dataBundles[0]?.planType?.toUpperCase() ||
			"";

		// console.log("Input dataBundles:", {
		//   count: dataBundles.length,
		//   sample: dataBundles.slice(0, 5).map(b => ({
		//     id: b.id,
		//     data: b.data,
		//     planType: b.planType,
		//     category: b.category,
		//     price: b.price,
		//   })),
		//   providerName: fallbackProviderName,
		//   activeCategory,
		//   activePlanType,
		//   searchTerm,
		// });

		let filteredBundles: DataBundle[] = [];

		if (searchTerm) {
			const searchLower = searchTerm.toLowerCase();
			if (searchTerm) {
				const searchLower = searchTerm.toLowerCase().trim();

				// Smart matching function
				// const isRelevantMatch = (text: string, search: string): number => {
				// 	const textLower = text.toLowerCase();

				// 	// Exact match gets highest score
				// 	if (textLower === search) return 100;

				// 	// Check for number + unit pattern (e.g., "2gb", "1.5gb")
				// 	const numberPattern = /(\d+(?:\.\d+)?)\s*(gb|mb|tb)/i;
				// 	const searchMatch = search.match(numberPattern);
				// 	const textMatch = textLower.match(numberPattern);

				// 	if (searchMatch && textMatch) {
				// 		const [, searchNum, searchUnit] = searchMatch;
				// 		const [, textNum, textUnit] = textMatch;

				// 		// Exact number and unit match
				// 		if (
				// 			searchNum === textNum &&
				// 			searchUnit.toLowerCase() === textUnit.toLowerCase()
				// 		) {
				// 			return 90;
				// 		}
				// 	}

				// 	// Word boundary match (prevents "2gb" matching "12gb")
				// 	const wordBoundaryRegex = new RegExp(
				// 		`\\b${search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
				// 		"i",
				// 	);
				// 	if (wordBoundaryRegex.test(textLower)) return 80;

				// 	// Starts with search term
				// 	if (textLower.startsWith(search)) return 70;

				// 	// Contains search but check if it's not part of another number
				// 	if (textLower.includes(search)) {
				// 		const index = textLower.indexOf(search);
				// 		const before = index > 0 ? textLower[index - 1] : "";
				// 		const after =
				// 			index + search.length < textLower.length
				// 				? textLower[index + search.length]
				// 				: "";

				// 		// If not surrounded by digits, it's a decent match
				// 		if (!/\d/.test(before) && !/\d/.test(after)) return 60;

				// 		// Otherwise low priority
				// 		return 20;
				// 	}

				// 	return 0;
				// };

				// Replace the isRelevantMatch function in your code with this improved version:

				const isRelevantMatch = (text: string, search: string): number => {
					const textLower = text.toLowerCase();
					const searchLower = search.toLowerCase();

					// Exact match gets highest score
					if (textLower === searchLower) return 100;

					// Check for number + unit pattern (e.g., "2gb", "1.5gb", "5gb")
					const numberPattern = /(\d+(?:\.\d+)?)\s*(gb|mb|tb)/i;
					const searchMatch = searchLower.match(numberPattern);
					const textMatch = textLower.match(numberPattern);

					if (searchMatch && textMatch) {
						const [, searchNum, searchUnit] = searchMatch;
						const [, textNum, textUnit] = textMatch;

						// Convert to numbers for proper comparison
						const searchNumber = parseFloat(searchNum);
						const textNumber = parseFloat(textNum);

						// Exact number and unit match gets very high score
						if (
							searchNumber === textNumber &&
							searchUnit.toLowerCase() === textUnit.toLowerCase()
						) {
							return 95;
						}

						// If units match but numbers don't, give lower scores based on proximity
						if (searchUnit.toLowerCase() === textUnit.toLowerCase()) {
							// Prioritize exact integer matches over decimal matches
							// e.g., "5gb" should rank "5.0gb" higher than "2.5gb"
							const searchIsInteger = Number.isInteger(searchNumber);
							const textIsInteger = Number.isInteger(textNumber);

							if (searchIsInteger && textIsInteger) {
								// Both integers - score by proximity
								const diff = Math.abs(searchNumber - textNumber);
								return Math.max(60 - diff * 5, 10);
							} else if (searchIsInteger && !textIsInteger) {
								// Search is integer, text is decimal
								// Check if decimal starts with search number (e.g., "5" matches "5.0")
								if (
									textNumber
										.toString()
										.startsWith(searchNumber.toString() + ".")
								) {
									return 90; // Very high score for "5" matching "5.0gb"
								}
								// Lower score for other decimals
								const diff = Math.abs(searchNumber - textNumber);
								return Math.max(40 - diff * 5, 5);
							} else {
								// General proximity scoring
								const diff = Math.abs(searchNumber - textNumber);
								return Math.max(50 - diff * 5, 5);
							}
						}
					}

					// Word boundary match (prevents "2gb" matching "12gb")
					const wordBoundaryRegex = new RegExp(
						`\\b${searchLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
						"i",
					);
					if (wordBoundaryRegex.test(textLower)) return 80;

					// Starts with search term
					if (textLower.startsWith(searchLower)) return 70;

					// Contains search but check if it's not part of another number
					if (textLower.includes(searchLower)) {
						const index = textLower.indexOf(searchLower);
						const before = index > 0 ? textLower[index - 1] : "";
						const after =
							index + searchLower.length < textLower.length
								? textLower[index + searchLower.length]
								: "";

						// If not surrounded by digits, it's a decent match
						if (!/\d/.test(before) && !/\d/.test(after)) return 60;

						// Otherwise low priority
						return 20;
					}

					return 0;
				};

				// Filter and score bundles
				const scoredBundles = dataBundles
					.map((bundle) => ({
						bundle,
						score: Math.max(
							isRelevantMatch(bundle.data, searchLower),
							isRelevantMatch(bundle.validity, searchLower) * 0.5,
							isRelevantMatch(bundle.planType, searchLower) * 0.3,
							isRelevantMatch(bundle.description || "", searchLower) * 0.4,
							isRelevantMatch(bundle.variation_code || "", searchLower) * 0.3,
						),
					}))
					.filter((item) => item.score > 0)
					.sort((a, b) => b.score - a.score)
					.map((item) => item.bundle);

				filteredBundles = scoredBundles;
			}
		} else if (activeCategory === "Hot") {
			if (!fallbackProviderName) {
				console.warn(
					"providerName is undefined for Hot category, returning empty bundles",
				);
				return [];
			}
			filteredBundles = hotDeals
				.filter(
					(bundle) =>
						bundle.category === "Hot" &&
						bundle.planType.toUpperCase() === fallbackProviderName,
				)
				.sort((a, b) => a.price - b.price);
		} else {
			filteredBundles = dataBundles
				.filter((bundle) => {
					const categoryMatch =
						bundle.category === activeCategory ||
						(activeCategory === "CORPORATE_GIFTING" &&
							bundle.planType === "CORPORATE_GIFTING") ||
						(activeCategory === "SME" && bundle.planType === "SME") ||
						(activeCategory === "SME_GIFTING" &&
							bundle.planType === "SME_GIFTING") ||
						(activeCategory === "GIFTING" && bundle.planType === "GIFTING") ||
						(activeCategory === "STANDARD" && bundle.planType === "STANDARD");

					const planTypeMatch =
						activePlanType === "" ||
						bundle.planType.toUpperCase() === activePlanType.toUpperCase();

					return categoryMatch && planTypeMatch;
				})
				.sort((a, b) => a.price - b.price);
		}

		// console.log(`Filtered bundles for ${activeCategory}/${activePlanType || '-'} (${fallbackProviderName || 'undefined'}):`, {
		//   count: filteredBundles.length,
		//   plans: filteredBundles.map(b => ({
		//     id: b.id,
		//     data: b.data,
		//     planType: b.planType,
		//     category: b.category,
		//     price: b.price,
		//     validity: b.validity,
		//     description: b.description,
		//   })),
		// });

		return filteredBundles;
	}, [
		dataBundles,
		activeCategory,
		activePlanType,
		searchTerm,
		providerName,
		hotDeals,
	]);

	const BundleCard: React.FC<{ bundle: DataBundle }> = ({ bundle }) => {
		const slideAnimation = useRef(new Animated.Value(0)).current;
		const panResponder = useRef(
			PanResponder.create({
				onStartShouldSetPanResponder: () => false,
				onMoveShouldSetPanResponder: (_, gestureState) => {
					return (
						Math.abs(gestureState.dx) > Math.abs(gestureState.dy) &&
						Math.abs(gestureState.dx) > 10
					);
				},
				onPanResponderMove: (_, gesture) => {
					if (gesture.dx > 0) {
						slideAnimation.setValue(gesture.dx);
					}
				},
				onPanResponderRelease: (_, gesture) => {
					if (gesture.dx > 100) {
						setSelectedBundle(bundle);
						setIsPurchaseModalOpen(true);
					}
					Animated.spring(slideAnimation, {
						toValue: 0,
						useNativeDriver: true,
					}).start();
				},
			}),
		).current;

		const handlePurchase = () => {
			// console.log("Selected bundle:", {
			//   id: bundle.id,
			//   data: bundle.data,
			//   planType: bundle.planType,
			//   category: bundle.category,
			//   price: bundle.price,
			//   validity: bundle.validity,
			//   description: bundle.description,
			//   providerName,
			// });
			setSelectedBundle(bundle);
			setIsPurchaseModalOpen(true);
		};

		return (
			<Animated.View
				{...panResponder.panHandlers}
				style={{ transform: [{ translateX: slideAnimation }] }}
			>
				<View style={styles.bundleCard}>
					<View style={styles.bundleHeader}>
						<View style={styles.bundleInfo}>
							<Text
								style={styles.bundleTitle}
								numberOfLines={1}
								ellipsizeMode="tail"
							>
								{bundle.data}
							</Text>
							<Text style={styles.bundleValidityText}>{bundle.validity}</Text>
						</View>
						<Text style={styles.bundlePrice}>
							₦{formatNumberWithCommas(bundle.price)}
						</Text>
					</View>
					<Text style={styles.planTypeText}>{bundle.planType}</Text>
					{bundle.description && (
						<Text style={styles.descriptionText}>{bundle.description}</Text>
					)}
					{bundle.validity === "Not Specified" && (
						<Text style={styles.warningPreviewText}>
							Note: Plan duration unclear. Check with provider.
						</Text>
					)}
					{bundle.description &&
						bundle.description.includes("30 days") &&
						bundle.validity === "7 Days" && (
							<Text style={styles.warningPreviewText}>
								Warning: Validity (7 Days) may differ from description (30
								days).
							</Text>
						)}
					<View style={styles.bundleActions}>
						<MotiView
							from={{ scale: 1 }}
							animate={{ scale: [1, 1.1, 1] }}
							transition={{
								type: "timing",
								duration: 2000,
								loop: true,
								repeatReverse: true,
							}}
						>
							<Pressable onPress={handlePurchase} style={styles.buyButton}>
								<Text style={styles.buyButtonText}>Purchase</Text>
							</Pressable>
						</MotiView>
						<View style={styles.swipeHint}>
							<Text style={styles.swipeText}>or swipe right</Text>
							<Ionicons name="arrow-forward" size={14} color="#999" />
						</View>
					</View>
				</View>
			</Animated.View>
		);
	};

	return (
		<ScrollView
			style={styles.scrollView}
			contentContainerStyle={styles.scrollContent}
			nestedScrollEnabled={true}
			showsVerticalScrollIndicator={true}
			overScrollMode="never"
			bounces={true}
			alwaysBounceVertical={true}
		>
			{hotDealsLoading && activeCategory === "Hot" ? (
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color="#00ff88" />
					<Text style={styles.activityIndicatorText}>Loading Hot Deals...</Text>
				</View>
			) : hotDealsError && activeCategory === "Hot" ? (
				<View style={styles.errorContainer}>
					<Text style={styles.errorText}>{hotDealsError}</Text>
					<Pressable onPress={() => fetchHotDeals()} style={styles.retryButton}>
						<Text style={styles.retryButtonText}>Retry</Text>
					</Pressable>
				</View>
			) : isLoading ? (
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color="#00ff88" />
					<Text style={styles.activityIndicatorText}>Loading Plans...</Text>
				</View>
			) : errorMessage ? (
				<View style={styles.errorContainer}>
					<Text style={styles.errorText}>{errorMessage}</Text>
					<Pressable onPress={retryLoad} style={styles.retryButton}>
						<Text style={styles.retryButtonText}>Retry</Text>
					</Pressable>
				</View>
			) : getCategoryBundles.length === 0 ? (
				<Text style={styles.noPlansText}>
					{searchTerm
						? "No matching plans found for your search"
						: `No plans available in ${activeCategory} for ${providerName || "unknown provider"}${activePlanType ? ` (${activePlanType})` : ""}`}
				</Text>
			) : (
				<View style={styles.bundleListContainer}>
					<Text style={styles.categoryHint}>
						{searchTerm
							? "Search Results:"
							: `Hot Plans for ${providerName || "unknown provider"}:`}
					</Text>
					<View style={styles.bundleWrapper}>
						{getCategoryBundles.map((bundle) => (
							<BundleCard key={bundle.id} bundle={bundle} />
						))}
					</View>
				</View>
			)}
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	scrollView: {
		flex: 1,
		backgroundColor: "#000",
	},
	scrollContent: {
		paddingHorizontal: 16,
		paddingBottom: 50,
		flexGrow: 1,
	},
	bundleListContainer: {
		paddingVertical: 8,
		flexGrow: 1,
	},
	bundleWrapper: {
		marginBottom: 16,
		flexGrow: 1,
	},
	bundleCard: {
		backgroundColor: "#111",
		borderRadius: 16,
		padding: 12,
		marginBottom: 10,
	},
	bundleHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 8,
	},
	bundleInfo: {
		flex: 1,
		marginRight: 8,
	},
	bundleTitle: {
		fontSize: 16,
		fontWeight: "700",
		color: "#fff",
		flexGrow: 1,
	},
	bundleValidityText: {
		fontSize: 12,
		color: "#999",
		marginTop: 4,
	},
	bundlePrice: {
		fontSize: 16,
		fontWeight: "700",
		color: "#fff",
		textAlign: "right",
	},
	planTypeText: {
		fontSize: 14,
		color: "#999",
		marginBottom: 8,
		textAlign: "left",
	},
	descriptionText: {
		fontSize: 12,
		color: "#aaa",
		marginBottom: 8,
	},
	warningPreviewText: {
		fontSize: 14,
		color: "#ff3333",
		marginBottom: 8,
		textAlign: "left",
	},
	bundleActions: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	buyButton: {
		backgroundColor: "#744925",
		paddingVertical: 8,
		paddingHorizontal: 16,
		borderRadius: 12,
	},
	buyButtonText: {
		fontSize: 14,
		fontWeight: "600",
		color: "#fff",
	},
	swipeHint: {
		alignItems: "center",
	},
	swipeText: {
		fontSize: 14,
		color: "#999",
		marginBottom: 2,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	activityIndicatorText: {
		fontSize: 16,
		color: "#999",
		textAlign: "center",
		marginTop: 20,
	},
	errorContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	errorText: {
		fontSize: 16,
		color: "#ff3333",
		textAlign: "center",
		marginTop: 20,
	},
	noPlansText: {
		fontSize: 16,
		color: "#999",
		textAlign: "center",
		marginTop: 20,
	},
	retryButton: {
		backgroundColor: "#744925",
		paddingVertical: 10,
		paddingHorizontal: 20,
		borderRadius: 12,
		marginTop: 20,
	},
	retryButtonText: {
		fontSize: 16,
		color: "#fff",
		fontWeight: "600",
	},
	categoryHint: {
		fontSize: 16,
		color: "#fff",
		marginBottom: 8,
	},
});

export default DataBundleList;
