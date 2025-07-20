import React, {
	useState,
	useEffect,
	useRef,
	useCallback,
	useMemo,
	useContext,
} from "react";
import {
	View,
	Alert,
	Text,
	StyleSheet,
	Pressable,
	ActivityIndicator,
} from "react-native";
import { supabase } from "@/config/supabase";
import DataScreenHeader from "@/components/DataScreenHeader";
import DataBundleList from "@/components/DataBundleList";
import DataModals from "@/components/DataModals";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { DataContext } from "@/context/DataProvider";
import { NETWORK_IMAGES, DEFAULT_PROVIDER_IMAGE } from "@/constants/helper";

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

interface Provider {
	id: number;
	name: string;
	image: number;
	code?: string;
	imageKey?: string;
	availablePlanTypes?: string[];
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

const formatNumberWithCommas = (number: number): string => {
	return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const BuyDataScreen: React.FC = () => {
	const { providerPlans, userEmail, errorMessage, fetchData } =
		useContext(DataContext);
	const params = useLocalSearchParams<{
		provider?: string;
		networkId?: string;
	}>();
	const [selectedProvider, setSelectedProvider] = useState<Provider | null>(
		null,
	);
	const [networkId, setNetworkId] = useState<number | null>(null);
	const [activeCategory, setActiveCategory] = useState<string>("Hot");
	const [activePlanType, setActivePlanType] = useState<string>("");
	const [isPurchaseModalOpen, setIsPurchaseModalOpen] =
		useState<boolean>(false);
	const [isTransactionModalOpen, setIsTransactionModalOpen] =
		useState<boolean>(false);
	const [isPinCreationModalOpen, setIsPinCreationModalOpen] =
		useState<boolean>(false);
	const [selectedBundle, setSelectedBundle] = useState<DataBundle | null>(null);
	const [phoneNumberInput, setPhoneNumberInput] = useState<string>("");
	const [transactionPinInput, setTransactionPinInput] = useState<string>("");
	const [detectedNetwork, setDetectedNetwork] = useState<string>("");
	const [transactionState, setTransactionState] = useState<
		"processing" | "success" | "failed"
	>("processing");
	const [isTransactionPinVisible, setIsTransactionPinVisible] =
		useState<boolean>(false);
	const [hasPin, setHasPin] = useState<boolean>(false);
	const [newPin, setNewPin] = useState<string>("");
	const [confirmPin, setConfirmPin] = useState<string>("");
	const [isNewPinVisible, setIsNewPinVisible] = useState<boolean>(false);
	const [isConfirmPinVisible, setIsConfirmPinVisible] =
		useState<boolean>(false);
	const [searchTerm, setSearchTerm] = useState<string>("");
	const [transactionReference, setTransactionReference] = useState<string>("");
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [walletBalance, setWalletBalance] = useState<number | null>(null);

	const pinVerified = useRef<boolean>(false);

	useEffect(() => {
		if (selectedBundle && activeCategory === "Hot") {
			const networkIds: { [key: string]: number } = {
				MTN: 1,
				GLO: 3,
				"9MOBILE": 4,
				AIRTEL: 2,
			};
			const expectedNetworkId = networkIds[selectedBundle.planType];
			if (expectedNetworkId && networkId !== expectedNetworkId) {
				console.log("Synchronizing networkId for Hot plan:", {
					bundleId: selectedBundle.id,
					currentNetworkId: networkId,
					expectedNetworkId,
					planType: selectedBundle.planType,
					providerName: selectedProvider?.name,
				});
				setNetworkId(expectedNetworkId);
			}
		}
	}, [selectedBundle, activeCategory, networkId, selectedProvider]);

	useFocusEffect(
		useCallback(() => {
			console.log("BuyDataScreen focused, resetting modal states");
			setIsPurchaseModalOpen(false);
			setIsTransactionModalOpen(false);
			setIsPinCreationModalOpen(false);
			setPhoneNumberInput("");
			setTransactionPinInput("");
			setDetectedNetwork("");
			setTransactionState("processing");
			setTransactionReference("");
			fetchData();
		}, [fetchData]),
	);

	const fetchWalletBalance = useCallback(async () => {
		if (!userEmail) return;
		try {
			setIsLoading(true);
			const { data, error } = await supabase
				.from("wallet")
				.select("balance")
				.eq("user_email", userEmail)
				.single();

			if (error && error.code !== "PGRST116") {
				console.error("Wallet fetch error:", error);
				throw error; // Only throw for non-PGRST116 errors
			}

			setWalletBalance(data?.balance ?? 0);
			// console.log("Fetched wallet balance:", data?.balance ?? 0);
		} catch (error) {
			// Only log unexpected errors
			console.error("Unexpected error in fetchWalletBalance:", error);
			setWalletBalance(0); // Set to 0 for all errors, including PGRST116
		} finally {
			setIsLoading(false);
		}
	}, [userEmail]);

	useEffect(() => {
		if (!userEmail) return;

		fetchWalletBalance();

		const subscription = supabase
			.channel(`wallet-changes:${userEmail}`)
			.on(
				"postgres_changes",
				{
					event: "UPDATE",
					schema: "public",
					table: "wallet",
					filter: `user_email=eq.${userEmail}`,
				},
				(payload) => {
					console.log("Real-time wallet balance update:", payload);
					setWalletBalance(payload.new.balance ?? 0);
				},
			)
			.subscribe();

		return () => {
			supabase.removeChannel(subscription);
		};
	}, [userEmail, fetchWalletBalance]);

	useEffect(() => {
		if (params.provider && params.networkId) {
			try {
				const provider = JSON.parse(params.provider);
				const id = parseInt(params.networkId, 10);
				if (provider?.id && !isNaN(id)) {
					const normalizedProvider: Provider = {
						id: provider.id,
						name: provider.name.toUpperCase(),
						code: provider.code,
						imageKey: provider.imageKey,
						image:
							provider.imageKey && provider.imageKey !== "DEFAULT"
								? NETWORK_IMAGES[provider.imageKey] || DEFAULT_PROVIDER_IMAGE
								: DEFAULT_PROVIDER_IMAGE,
						availablePlanTypes: provider.availablePlanTypes || [],
					};
					setSelectedProvider(normalizedProvider);
					setNetworkId(id);
					// console.log(
					//   "Initialized provider:",
					//   normalizedProvider,
					//   "networkId:",
					//   id,
					// );
				} else {
					console.error("Invalid provider or networkId:", { provider, id });
					Alert.alert("Error", "Invalid provider data");
					router.back();
				}
			} catch (error) {
				console.error("Error parsing provider params:", error);
				Alert.alert("Error", "Failed to load provider data");
				router.back();
			}
		} else {
			console.error("Missing provider or networkId in params");
			Alert.alert("Error", "No provider selected");
			router.back();
		}
	}, [params.provider, params.networkId]);

	useEffect(() => {
		if (selectedProvider) {
			console.log(`providerPlans for ${selectedProvider.name}:`, {
				count: providerPlans[selectedProvider.name]?.length || 0,
				sample:
					providerPlans[selectedProvider.name]
						?.slice(0, 5)
						.map((p: DataBundle) => ({
							id: p.id,
							planType: p.planType,
							category: p.category,
							validity: p.validity,
							data: p.data,
							price: p.price,
						})) || [],
			});
		}
	}, [providerPlans, selectedProvider]);

	const allBundles = useMemo(() => {
		if (!selectedProvider) return [];
		const apiPlans = providerPlans[selectedProvider.name] || [];
		console.log(`All Bundles for ${selectedProvider.name}:`, {
			apiCount: apiPlans.length,
			totalCount: apiPlans.length,
			sample: apiPlans.slice(0, 5).map((p: DataBundle) => ({
				id: p.id,
				planType: p.planType,
				category: p.category,
				validity: p.validity,
				data: p.data,
				price: p.price,
			})),
		});
		return apiPlans;
	}, [selectedProvider, providerPlans]);

	const dataBundles = useMemo(() => {
		if (!selectedProvider) return [];

		let plans: DataBundle[];
		if (activeCategory === "Hot") {
			plans = [];
		} else {
			plans = (providerPlans[selectedProvider.name] || []).filter(
				(plan: DataBundle) => {
					const categoryMatch = plan.category === activeCategory;
					const searchMatch = searchTerm
						? plan.data.toLowerCase().includes(searchTerm.toLowerCase()) ||
							plan.description
								?.toLowerCase()
								?.includes(searchTerm.toLowerCase()) ||
							false
						: true;
					return categoryMatch && searchMatch;
				},
			);

			if (plans.length === 0) {
				fetchData();
			}
		}

		return plans;
	}, [selectedProvider, providerPlans, activeCategory, searchTerm, fetchData]);

	const bundleCategories = useMemo(() => {
		if (!selectedProvider) return [];

		const categoriesWithPlans = Array.from(
			new Set(allBundles.map((bundle: DataBundle) => bundle.category)),
		).filter((category) => {
			return allBundles.some((bundle) => bundle.category === category);
		});

		const hasHotPlans = ["MTN", "AIRTEL", "GLO", "9MOBILE"].includes(
			selectedProvider.name.toUpperCase(),
		);
		if (hasHotPlans && !categoriesWithPlans.includes("Hot")) {
			categoriesWithPlans.push("Hot");
		}

		const orderedCategories = [
			"Hot",
			"Daily Plans",
			"Weekly Plans",
			"Monthly Plans",
			"Corporate Plans",
			"Weekend Plans",
			"Night Plans",
			"Unlimited Plans",
			"CORPORATE_GIFTING",
			"SME",
			"SME_GIFTING",
			"GIFTING",
			"STANDARD",
		].filter((category) => categoriesWithPlans.includes(category));

		console.log("Filtered and Ordered Bundle Categories:", orderedCategories);
		return orderedCategories;
	}, [allBundles, selectedProvider]);

	const availablePlanTypes = useMemo(() => {
		const planTypes = [
			...new Set(
				allBundles
					.filter((bundle) => bundle.category === activeCategory)
					.map((bundle) => bundle.planType.toUpperCase()),
			),
		];
		console.log(`Available PlanTypes for ${activeCategory}:`, planTypes);
		return planTypes;
	}, [allBundles, activeCategory]);

	const categoryPlanTypes = useMemo(() => {
		const planTypes = [
			...new Set(
				dataBundles
					.filter((bundle) => bundle.category === activeCategory)
					.map((bundle) => bundle.planType.toUpperCase()),
			),
		];
		console.log(`PlanTypes for ${activeCategory}:`, planTypes);
		return planTypes;
	}, [dataBundles, activeCategory]);

	useEffect(() => {
		if (activeCategory === "Hot") {
			setActivePlanType("");
		} else if (categoryPlanTypes.length > 0) {
			setActivePlanType(categoryPlanTypes[0]);
		} else {
			setActivePlanType(availablePlanTypes[0] || "");
		}
		console.log("Updated activePlanType:", activePlanType);
	}, [activeCategory, availablePlanTypes, categoryPlanTypes]);

	const planTypeOptions = useMemo(() => {
		if (activeCategory === "Hot") return [];

		const types = [
			...new Set(
				dataBundles
					.filter((bundle) => bundle.category === activeCategory)
					.map((bundle) => bundle.planType.toUpperCase()),
			),
		];

		console.log("Computed planTypeOptions:", types);
		return types;
	}, [dataBundles, activeCategory]);

	const ensureProfileExists = useCallback(async () => {
		if (!userEmail) {
			console.error("No user email provided for profile creation");
			Alert.alert("Error", "User authentication missing");
			return;
		}
		try {
			const {
				data: { user },
				error: authError,
			} = await supabase.auth.getUser();
			if (authError || !user) {
				console.error("No authenticated user for profile check:", authError);
				Alert.alert(
					"Error",
					`Failed to verify user: ${authError?.message || "Unknown error"}`,
				);
				return;
			}
			console.log("Checking profile for user:", {
				userId: user.id,
				email: userEmail,
			});
			const { data, error } = await supabase
				.from("profiles")
				.select("id")
				.eq("id", user.id);
			console.log("Profile check result:", { userId: user.id, data, error });
			if (error && error.code !== "PGRST116") {
				console.error("Error checking profile:", error);
				Alert.alert(
					"Error",
					`Failed to verify user profile: ${error.message} (Code: ${error.code})`,
				);
				return;
			}
			if (!data || data.length === 0) {
				console.log("No profile found, creating one for user:", user.id);
				const derivedUsername = userEmail.split("@")[0] || `user_${user.id}`;
				const { error: upsertError } = await supabase.from("profiles").upsert(
					{
						id: user.id,
						email: userEmail,
						username: derivedUsername,
						transaction_pin: "",
						is_admin: false,
					},
					{ onConflict: "id" },
				);
				if (upsertError) {
					console.error("Error upserting profile:", upsertError);
					Alert.alert(
						"Error",
						`Failed to initialize user profile: ${upsertError.message} (Code: ${upsertError.code})`,
					);
				} else {
					console.log(
						"Profile created/updated with username:",
						derivedUsername,
					);
				}
			} else {
				console.log("Profile exists for user:", user.id);
			}
		} catch (error) {
			console.error("Error in ensureProfileExists:", error);
			Alert.alert(
				"Error",
				`Failed to ensure user profile: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}, [userEmail]);

	useEffect(() => {
		if (userEmail) {
			ensureProfileExists();
		}
	}, [userEmail, ensureProfileExists]);

	const verifyTransactionPin = useCallback(
		async (email: string): Promise<boolean> => {
			if (!email) {
				console.log("No email provided for PIN verification");
				return false;
			}
			try {
				const {
					data: { user },
					error: authError,
				} = await supabase.auth.getUser();
				if (authError || !user) {
					console.log("No authenticated user");
					Alert.alert(
						"Error",
						`No authenticated user: ${authError?.message || "Unknown error"}`,
					);
					return false;
				}
				console.log("Verifying PIN for user:", { userId: user.id, email });
				const { data, error } = await supabase
					.from("profiles")
					.select("transaction_pin")
					.eq("id", user.id)
					.single();
				if (error) {
					if (error.code === "PGRST116") {
						console.log("No profile for user ID:", user.id);
						return false;
					}
					console.error("PIN verification error:", error);
					Alert.alert(
						"Error",
						`Unable to verify PIN: ${error.message} (Code: ${error.code})`,
					);
					return false;
				}
				const exists = !!data?.transaction_pin && data.transaction_pin !== "";
				console.log("PIN exists:", exists);
				return exists;
			} catch (error) {
				console.error("PIN verification error:", error);
				Alert.alert(
					"Error",
					`Unable to verify PIN: ${error instanceof Error ? error.message : "Unknown error"}`,
				);
				return false;
			}
		},
		[],
	);

	const updateHasPin = useCallback(
		async (value: boolean) => {
			if (!pinVerified.current || value) {
				console.log("Updating hasPin:", value);
				if (value && userEmail) {
					const pinExists = await verifyTransactionPin(userEmail);
					setHasPin(pinExists);
					pinVerified.current = pinExists;
				} else {
					setHasPin(false);
					pinVerified.current = false;
				}
			}
		},
		[verifyTransactionPin, userEmail],
	);

	const savePin = async () => {
		setIsLoading(true);
		try {
			if (
				newPin.length < 4 ||
				newPin.length > 6 ||
				confirmPin.length < 4 ||
				confirmPin.length > 6
			) {
				return Alert.alert("Error", "PIN must be 4-6 digits");
			}
			if (newPin !== confirmPin) {
				return Alert.alert("Error", "PINs do not match");
			}
			if (!userEmail) {
				return Alert.alert("Error", "User authentication missing");
			}
			const {
				data: { user },
				error: authError,
			} = await supabase.auth.getUser();
			if (authError || !user) {
				console.error("User not authenticated:", authError);
				return Alert.alert(
					"Error",
					`User not authenticated: ${authError?.message || "Unknown error"}`,
				);
			}
			console.log("Saving PIN for user:", {
				userId: user.id,
				email: userEmail,
				newPin: "****",
			});
			// Ensure profile exists before updating
			await ensureProfileExists();
			// Debug: Check all profiles for this user
			const { data: debugData, error: debugError } = await supabase
				.from("profiles")
				.select("*")
				.eq("id", user.id);
			console.log("Debug profiles query:", {
				userId: user.id,
				data: debugData,
				error: debugError,
			});
			if (debugData && debugData.length > 1) {
				console.warn("Multiple profiles found for user:", {
					userId: user.id,
					profiles: debugData,
				});
				Alert.alert(
					"Error",
					"Multiple profiles detected for this user. Contact support to resolve.",
				);
				return;
			}
			const { error: updateError } = await supabase
				.from("profiles")
				.update({ transaction_pin: newPin })
				.eq("id", user.id);
			if (updateError) {
				console.error("PIN save error:", updateError);
				if (updateError.code === "42501") {
					return Alert.alert(
						"Error",
						"PIN save failed: Permission denied. Please enable RLS on the profiles table.",
					);
				}
				return Alert.alert(
					"Error",
					`Failed to save PIN: ${updateError.message} (Code: ${updateError.code})`,
				);
			}
			// Verify the PIN was saved correctly
			const { data, error: fetchError } = await supabase
				.from("profiles")
				.select("transaction_pin, updated_at")
				.eq("id", user.id)
				.order("updated_at", { ascending: false })
				.limit(1)
				.single();
			if (fetchError) {
				console.error("PIN verification after save failed:", fetchError, {
					userId: user.id,
				});
				if (fetchError.code === "PGRST301") {
					const { data: fallbackData, error: fallbackError } = await supabase
						.from("profiles")
						.select("transaction_pin, updated_at")
						.eq("id", user.id)
						.order("updated_at", { ascending: false })
						.limit(1);
					if (fallbackError || !fallbackData || fallbackData.length === 0) {
						console.error("Fallback query failed:", fallbackError, {
							userId: user.id,
						});
						return Alert.alert(
							"Error",
							`PIN verification failed: ${fallbackError?.message || "No profile found"}`,
						);
					}
					console.log("Multiple rows detected, using latest:", fallbackData);
					if (fallbackData[0].transaction_pin !== newPin) {
						return Alert.alert(
							"Error",
							"PIN not saved correctly: Verification failed",
						);
					}
				} else {
					return Alert.alert(
						"Error",
						`PIN verification failed: ${fetchError.message} (Code: ${fetchError.code})`,
					);
				}
			}
			if (!data || data.transaction_pin !== newPin) {
				console.error("PIN verification mismatch:", {
					expected: newPin,
					actual: data?.transaction_pin,
					userId: user.id,
				});
				return Alert.alert(
					"Error",
					"PIN not saved correctly: Verification failed",
				);
			}
			console.log("PIN saved and verified:", {
				transaction_pin: data.transaction_pin,
				userId: user.id,
			});
			setHasPin(true);
			pinVerified.current = true;
			setIsPinCreationModalOpen(false);
			setNewPin("");
			setConfirmPin("");
			Alert.alert("Success", "PIN created successfully");
		} catch (error) {
			console.error("PIN Creation Error:", error);
			Alert.alert(
				"Error",
				`Failed to save PIN: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		} finally {
			setIsLoading(false);
		}
	};

	const createTransactionReference = useCallback(async () => {
		try {
			const {
				data: { user },
				error,
			} = await supabase.auth.getUser();
			if (error || !user || !user.id) {
				console.error("Auth failed:", error);
				throw new Error("Auth failed");
			}
			return `Edges_${user.id}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
		} catch (error) {
			console.error("Reference error:", error);
			Alert.alert("Error", "Unable to generate reference");
			throw error;
		}
	}, []);

	const detectProvider = (phone: string): string => {
		if (phone.length !== 11) return "";
		const prefix = phone.slice(0, 4);
		const mtn = [
			"0803",
			"0806",
			"0703",
			"0706",
			"0813",
			"0816",
			"0810",
			"0814",
			"0903",
			"0906",
			"0913",
			"0916",
		];
		const glo = ["0805", "0807", "0705", "0815", "0811", "0905", "0915"];
		const airtel = [
			"0802",
			"0808",
			"0708",
			"0812",
			"0701",
			"0902",
			"0907",
			"0901",
			"0912",
		];
		const nineMobile = ["0809", "0817", "0818", "0909", "0908"];
		if (mtn.includes(prefix)) return "MTN";
		if (glo.includes(prefix)) return "GLO";
		if (airtel.includes(prefix)) return "AIRTEL";
		if (nineMobile.includes(prefix)) return "9MOBILE";
		return "";
	};

	const handleProceed = async () => {
		console.log("handleProceed called", {
			selectedBundle,
			phoneNumberInput,
			transactionPinInput,
			selectedProvider,
			networkId,
			userEmail,
			walletBalance,
			detectedNetwork,
			purchaseType: "data",
		});

		if (!selectedBundle) return Alert.alert("Error", "No plan selected");
		if (!selectedProvider) return Alert.alert("Error", "No provider selected");
		if (!networkId) return Alert.alert("Error", "Network ID missing");
		if (
			!phoneNumberInput ||
			phoneNumberInput.length !== 11 ||
			!/^\d{11}$/.test(phoneNumberInput)
		) {
			return Alert.alert("Error", "Enter a valid 11-digit phone number");
		}
		if (!hasPin) {
			setIsPinCreationModalOpen(true);
			return Alert.alert("Error", "Create a transaction PIN");
		}
		if (
			!transactionPinInput ||
			transactionPinInput.length < 4 ||
			transactionPinInput.length > 6 ||
			!/^\d+$/.test(transactionPinInput)
		) {
			return Alert.alert("Error", "Enter a 4-6 digit PIN");
		}
		if (!userEmail) return Alert.alert("Error", "User authentication missing");
		if (walletBalance === null)
			return Alert.alert("Error", "Wallet balance not loaded");
		if (selectedBundle.price > walletBalance) {
			return Alert.alert(
				"Error",
				`Insufficient balance: ₦${formatNumberWithCommas(selectedBundle.price)} needed, ₦${formatNumberWithCommas(walletBalance)} available`,
			);
		}

		if (
			activeCategory === "Hot" &&
			detectedNetwork &&
			detectedNetwork.toUpperCase() !== selectedBundle.planType.toUpperCase()
		) {
			return Alert.alert(
				"Error",
				`Phone number does not match the required network (${selectedBundle.planType}). Please use a ${selectedBundle.planType} number.`,
			);
		} else if (
			activeCategory !== "Hot" &&
			detectedNetwork &&
			detectedNetwork.toUpperCase() !== selectedProvider.name.toUpperCase()
		) {
			return Alert.alert(
				"Error",
				`Phone number does not match provider (${selectedProvider.name})`,
			);
		}

		setIsLoading(true);
		try {
			const {
				data: { user },
				error: authError,
			} = await supabase.auth.getUser();
			if (authError || !user) {
				console.error("User not authenticated:", authError);
				throw new Error(
					`User not authenticated: ${authError?.message || "Unknown error"}`,
				);
			}
			await ensureProfileExists();
			const { data: profileData, error: pinError } = await supabase
				.from("profiles")
				.select("transaction_pin")
				.eq("id", user.id)
				.single();
			if (pinError) {
				if (pinError.code === "PGRST116") {
					setIsPinCreationModalOpen(true);
					Alert.alert("Error", "Profile not found. Create a PIN");
				} else {
					console.error("PIN verification failed:", pinError);
					Alert.alert(
						"Error",
						`PIN verification failed: ${pinError.message} (Code: ${pinError.code})`,
					);
				}
				return;
			}
			if (!profileData || profileData.transaction_pin === "") {
				setIsPinCreationModalOpen(true);
				return Alert.alert("Error", "No PIN set. Create a PIN");
			}
			if (profileData.transaction_pin !== transactionPinInput) {
				return Alert.alert("Error", "Incorrect PIN");
			}

			const reference = await createTransactionReference();
			setTransactionReference(reference);

			let finalNetworkId = networkId;
			if (activeCategory === "Hot") {
				const networkIds: { [key: string]: number } = {
					MTN: 1,
					GLO: 3,
					"9MOBILE": 4,
					AIRTEL: 2,
				};
				finalNetworkId = networkIds[selectedBundle.planType];
			}

			setIsPurchaseModalOpen(false);
			setPhoneNumberInput("");
			setTransactionPinInput("");
			setDetectedNetwork("");

			router.push({
				pathname: "/Confirmation",
				params: {
					bundle: JSON.stringify(selectedBundle),
					provider: JSON.stringify({
						id: selectedProvider.id,
						name: selectedProvider.name,
						code: selectedProvider.code,
						imageKey: selectedProvider.imageKey || "DEFAULT",
					}),
					phoneNumber: phoneNumberInput,
					transactionPin: transactionPinInput,
					userEmail,
					referenceId: reference,
					balance: walletBalance.toString(),
					networkId: finalNetworkId.toString(),
					planId: selectedBundle.id.toString(),
					purchaseType: "data",
				},
			});
		} catch (error) {
			console.error("handleProceed error:", error);
			Alert.alert(
				"Error",
				`Unable to verify PIN or generate reference: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		} finally {
			setIsLoading(false);
		}
	};

	const resetSearch = () => setSearchTerm("");

	const chooseCategory = (category: string) => setActiveCategory(category);

	const choosePlanType = (planType: string) => setActivePlanType(planType);

	const retryLoad = useCallback(() => {
		setIsLoading(true);
		fetchData().finally(() => setIsLoading(false));
	}, [fetchData]);

	useEffect(() => {
		const checkPin = async () => {
			if (!userEmail) return;
			await ensureProfileExists();
			const pinExists = await verifyTransactionPin(userEmail);
			console.log("Initial PIN check:", pinExists);
			setHasPin(pinExists);
			pinVerified.current = pinExists;
		};
		checkPin();
	}, [userEmail, verifyTransactionPin, ensureProfileExists]);

	if (errorMessage) {
		return (
			<View style={styles.errorContainer}>
				<Text style={styles.errorText}>{errorMessage}</Text>
				<Pressable onPress={retryLoad} style={styles.retryButton}>
					<Text style={styles.retryButtonText}>Retry</Text>
				</Pressable>
			</View>
		);
	}

	if (!selectedProvider || !networkId) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color="#D7A77F" />
				<Text style={styles.loadingText}>Loading...</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<DataScreenHeader
				selectedProvider={selectedProvider}
				setSelectedProvider={setSelectedProvider}
				networkId={networkId}
				setNetworkId={setNetworkId}
				walletBalance={walletBalance}
				bundleCategories={bundleCategories}
				activeCategory={activeCategory}
				chooseCategory={chooseCategory}
				planTypeOptions={planTypeOptions}
				activePlanType={activePlanType}
				choosePlanType={choosePlanType}
				searchTerm={searchTerm}
				setSearchTerm={setSearchTerm}
				resetSearch={resetSearch}
				isBalanceLoading={isLoading} // Pass loading state
			/>
			<DataBundleList
				dataBundles={dataBundles}
				activeCategory={activeCategory}
				activePlanType={activePlanType}
				searchTerm={searchTerm}
				setSelectedBundle={setSelectedBundle}
				setIsPurchaseModalOpen={setIsPurchaseModalOpen}
				isLoading={isLoading}
				errorMessage={errorMessage}
				retryLoad={retryLoad}
				providerName={selectedProvider.name}
			/>
			<DataModals
				isPurchaseModalOpen={isPurchaseModalOpen}
				setIsPurchaseModalOpen={setIsPurchaseModalOpen}
				isTransactionModalOpen={isTransactionModalOpen}
				setIsTransactionModalOpen={setIsTransactionModalOpen}
				isPinCreationModalOpen={isPinCreationModalOpen}
				setIsPinCreationModalOpen={setIsPinCreationModalOpen}
				selectedBundle={selectedBundle}
				phoneNumberInput={phoneNumberInput}
				setPhoneNumberInput={setPhoneNumberInput}
				transactionPinInput={transactionPinInput}
				setTransactionPinInput={setTransactionPinInput}
				detectedNetwork={detectedNetwork}
				setDetectedNetwork={setDetectedNetwork}
				transactionState={transactionState}
				setTransactionState={setTransactionState}
				transactionReference={transactionReference}
				setTransactionReference={setTransactionReference}
				hasPin={hasPin}
				updateHasPin={updateHasPin}
				isTransactionPinVisible={isTransactionPinVisible}
				setIsTransactionPinVisible={setIsTransactionPinVisible}
				newPinInput={newPin}
				setNewPinInput={setNewPin}
				confirmPinInput={confirmPin}
				setConfirmPinInput={setConfirmPin}
				isNewPinVisible={isNewPinVisible}
				setIsNewPinVisible={setIsNewPinVisible}
				isConfirmPinVisible={isConfirmPinVisible}
				setIsConfirmPinVisible={setIsConfirmPinVisible}
				isLoading={isLoading}
				verifyTransactionPin={verifyTransactionPin}
				userEmail={userEmail}
				selectedProvider={selectedProvider}
				onCreatePin={() => setIsPinCreationModalOpen(true)}
				onSavePin={savePin}
				onProceed={handleProceed}
			/>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "black",
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "black",
	},
	loadingText: {
		color: "white",
		fontSize: 18,
		marginTop: 10,
	},
	errorContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "black",
		padding: 20,
	},
	errorText: {
		color: "#FF6666",
		fontSize: 16,
		textAlign: "center",
		marginBottom: 20,
	},
	retryButton: {
		backgroundColor: "#744925",
		paddingVertical: 12,
		paddingHorizontal: 24,
		borderRadius: 8,
	},
	retryButtonText: {
		color: "white",
		fontSize: 16,
		fontWeight: "600",
	},
});

export default BuyDataScreen;
