import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  Animated,
  PanResponder,
  StyleSheet,
  Alert,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { MotiView } from "moti";
import { supabase } from "@/config/supabase";
import { NETWORK_IMAGES, DEFAULT_PROVIDER_IMAGE } from "@/constants/helper";
import PurchaseModal from "@/components/homescreen/PurchaseModal";
import TransactionStatusModal from "@/components/homescreen/TransactionStatusModal";
import CreatePinModal from "@/components/homescreen/CreatePinModal";

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

interface SerializableProvider {
  id: number;
  name: string;
  code: string;
  imageKey: string;
}

interface Provider {
  id: number;
  name: string;
  image: any;
  code?: string;
  imageKey?: string;
}

const planCache: { [providerName: string]: DataBundle[] } = {};

const SUPPORTED_PROVIDERS = ["MTN", "AIRTEL", "GLO", "9MOBILE"];
const VALID_PLAN_TYPES = ["SME", "Corporate Gifting", "Gifting", "Standard"];

const BuyDataScreen: React.FC = () => {
  const { provider: providerData, networkId: providerNetworkId } = useLocalSearchParams<{
    provider?: string;
    networkId?: string;
  }>();

  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [networkId, setNetworkId] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("Daily Plans");
  const [activePlanType, setActivePlanType] = useState<string>("Gifting");
  const [recentPhoneNumber, setRecentPhoneNumber] = useState<string>("");
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState<boolean>(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState<boolean>(false);
  const [isPinCreationModalOpen, setIsPinCreationModalOpen] = useState<boolean>(false);
  const [selectedBundle, setSelectedBundle] = useState<DataBundle | null>(null);
  const [phoneNumberInput, setPhoneNumberInput] = useState<string>("");
  const [transactionPinInput, setTransactionPinInput] = useState<string>("");
  const [detectedNetwork, setDetectedNetwork] = useState<string>("");
  const [transactionState, setTransactionState] = useState<"processing" | "success" | "failed">("processing");
  const [isTransactionPinVisible, setIsTransactionPinVisible] = useState<boolean>(false);
  const [hasPin, setHasPin] = useState<boolean>(false);
  const [newPinInput, setNewPinInput] = useState<string>("");
  const [confirmPinInput, setConfirmPinInput] = useState<string>("");
  const [isNewPinVisible, setIsNewPinVisible] = useState<boolean>(false);
  const [isConfirmPinVisible, setIsConfirmPinVisible] = useState<boolean>(false);
  const [recentBundle, setRecentBundle] = useState<DataBundle | null>(null);
  const [recentPurchaseDate, setRecentPurchaseDate] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [userEmailAddress, setUserEmailAddress] = useState<string>("");
  const [dataBundles, setDataBundles] = useState<DataBundle[]>([]);
  const [bundleCategories, setBundleCategories] = useState<string[]>([]);
  const [availablePlanTypes, setAvailablePlanTypes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [transactionReference, setTransactionReference] = useState<string>("");
  const animationScale = useRef(new Animated.Value(1)).current;
  const pinVerified = useRef<boolean>(false);

  useEffect(() => {
    try {
      let provider: Provider | null = null;
      let id: number | null = null;
      if (providerData) {
        const parsedProvider = JSON.parse(providerData as string) as SerializableProvider;
        if (!parsedProvider.id || !parsedProvider.name || !parsedProvider.code || !parsedProvider.imageKey) {
          throw new Error("Invalid provider data");
        }
        provider = {
          id: parsedProvider.id,
          name: parsedProvider.name,
          code: parsedProvider.code,
          image: parsedProvider.imageKey !== "DEFAULT"
            ? NETWORK_IMAGES[parsedProvider.imageKey as keyof typeof NETWORK_IMAGES]
            : DEFAULT_PROVIDER_IMAGE,
          imageKey: parsedProvider.imageKey,
        };
      } else {
        throw new Error("No provider data provided");
      }
      if (providerNetworkId) {
        id = parseInt(providerNetworkId, 10);
        if (isNaN(id)) {
          throw new Error("Invalid network ID");
        }
        console.log("Received networkId:", id);
      } else {
        throw new Error("No networkId provided");
      }
      setSelectedProvider(provider);
      setNetworkId(id);
    } catch (error) {
      console.error("Error processing providerData or networkId:", error);
      Alert.alert("Error", "Invalid provider or network information");
      router.back();
    }
  }, [providerData, providerNetworkId]);

  const updateHasPin = useCallback((value: boolean) => {
    if (!pinVerified.current || value) {
      console.log("Updating hasPin to:", value, { timestamp: Date.now() });
      setHasPin(value);
      if (value) {
        pinVerified.current = true;
      }
    } else {
      console.log("Skipping hasPin update, already verified:", hasPin, { timestamp: Date.now() });
    }
  }, []);

  const verifyTransactionPin = useCallback(async (email: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("transaction_pin")
        .eq("email", email)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          console.log("No profile found for email:", email, { timestamp: Date.now() });
          return false;
        }
        throw error;
      }

      const pinExists = !!data?.transaction_pin;
      console.log("Verified PIN exists:", pinExists, { timestamp: Date.now() });
      return pinExists;
    } catch (error) {
      console.error("PIN Check Error:", error);
      Alert.alert("Error", "Unable to verify PIN. Please retry.");
      return false;
    }
  }, []);

  const createTransactionReference = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user || !user.id) {
        throw new Error("Authentication failed or user ID missing");
      }

      const reference = `Edges_Network_${user.id}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      return reference;
    } catch (error) {
      console.error("Reference Creation Error:", error);
      Alert.alert("Error", "Unable to generate transaction reference");
      throw error;
    }
  };

  const formatNumberWithCommas = (number: number): string => {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const parseSearchInput = (input: string) => {
    const normalized = input.toLowerCase().trim();
    const dataMatch = normalized.match(/(\d*\.?\d*)\s*(gb|mb)/i);
    const validityMatch = normalized.match(/(\d+)\s*(day|days|month|months|week|weeks)/i);
    const planMatch = normalized.match(/(sme|gifting|corporate|standard)/i);

    return {
      dataAmount: dataMatch ? parseFloat(dataMatch[1]) : null,
      dataUnit: dataMatch ? dataMatch[2].toUpperCase() : null,
      validityDays: validityMatch ? parseInt(validityMatch[1], 10) : null,
      validityUnit: validityMatch ? validityMatch[2].toLowerCase() : null,
      planType: planMatch ? planMatch[1].toLowerCase() : null,
    };
  };

  const searchBundles = (query: string) => {
    if (!query) return null;
    const { dataAmount, dataUnit, validityDays, validityUnit, planType } = parseSearchInput(query);
    return dataBundles
      .filter((bundle) => {
        let isMatch = true;
        if (dataAmount && dataUnit) {
          const bundleData = parseFloat(bundle.data.match(/[\d.]+/)?.[0] || "0");
          const bundleUnit = bundle.data.match(/[MG]B/)?.[0] || "";
          const bundleMB = bundleUnit === "GB" ? bundleData * 1000 : bundleData;
          const searchMB = dataUnit === "GB" ? dataAmount * 1000 : dataAmount;
          isMatch = isMatch && Math.abs(bundleMB - searchMB) <= searchMB * 0.2;
        }
        if (isMatch && validityDays && validityUnit) {
          const bundleDaysMatch = bundle.validity.match(/\d+/);
          const bundleDays = bundleDaysMatch ? parseInt(bundleDaysMatch[0], 10) : 0;
          const validityLower = bundle.validity.toLowerCase();
          if (validityUnit.includes("day")) {
            if (validityDays <= 3) {
              isMatch = isMatch && bundle.category === "Daily Plans";
            } else if (validityDays <= 14) {
              isMatch = isMatch && bundle.category === "Weekly Plans";
            } else {
              isMatch = isMatch && bundle.category === "Monthly Plans";
            }
            isMatch = isMatch && Math.abs(bundleDays - validityDays) <= validityDays * 0.2;
          } else if (validityUnit.includes("week")) {
            const searchDays = validityDays * 7;
            isMatch = isMatch && bundle.category === "Weekly Plans";
            isMatch = isMatch && Math.abs(bundleDays - searchDays) <= searchDays * 0.2;
          } else if (validityUnit.includes("month")) {
            const searchDays = validityDays * 30;
            isMatch = isMatch && bundle.category === "Monthly Plans";
            isMatch = isMatch && (
              bundleDays === searchDays ||
              validityLower.includes(`${validityDays} month`) ||
              validityLower.includes(`${searchDays} days`)
            );
          }
        }
        if (planType) {
          isMatch = isMatch && bundle.planType.toLowerCase() === planType.toLowerCase();
        } else {
          isMatch = isMatch && bundle.planType.toLowerCase() === activePlanType.toLowerCase();
        }
        return isMatch;
      })
      .sort((a, b) => a.price - b.price);
  };

  const fetchAllProviderPlans = async () => {
    const allPlanTypes: { [provider: string]: string[] } = {};
    for (const provider of SUPPORTED_PROVIDERS) {
      const cacheKey = provider.toUpperCase();
      let plans: DataBundle[] = [];

      if (planCache[cacheKey]) {
        plans = planCache[cacheKey];
      } else {
        try {
          const response = await fetch("https://ebenkdata.com/api/network/", {
            headers: {
              Authorization: "Token de883370902cf73e68ed63f566dbf38a38719f03",
            },
          });

          const rawData = await response.text();
          let parsedData;
          try {
            parsedData = JSON.parse(rawData);
          } catch (parseError) {
            console.error(`Unable to parse API response for ${provider}: ${rawData.slice(0, 100)}...`);
            continue;
          }

          if (!response.ok) {
            console.error(`API request failed for ${provider}: ${response.status}`);
            continue;
          }

          const providerKey = `${provider}_PLAN`;
          const providerPlans = parsedData[providerKey];
          if (!Array.isArray(providerPlans) || providerPlans.length === 0) {
            console.warn(`No plans available for ${provider}`);
            continue;
          }

          plans = providerPlans.map((plan: any) => ({
            id: plan.id || 0,
            data: plan.plan || "Unknown",
            price: parseFloat(plan.plan_amount || "0") + 50,
            validity: plan.month_validate || "Not Specified",
            category: determineCategory(plan),
            description: plan.plan,
            variation_code: plan.dataplan_id,
            planType: (plan.plan_type || "Standard").toUpperCase(),
          }));

          planCache[cacheKey] = plans.filter((bundle) =>
            VALID_PLAN_TYPES.map(pt => pt.toUpperCase()).includes(bundle.planType.toUpperCase())
          );
        } catch (error) {
          console.error(`Error fetching plans for ${provider}:`, error);
          continue;
        }
      }

      allPlanTypes[provider] = Array.from(new Set(plans.map((bundle) => bundle.planType))).filter((planType) =>
        VALID_PLAN_TYPES.map(pt => pt.toUpperCase()).includes(planType.toUpperCase())
      );
    }
    return allPlanTypes;
  };

  const determineCategory = (plan: any): string => {
    const validity = plan.month_validate || "Not Specified";
    const planName = plan.plan || "";
    let category = "";
    if (
      validity.toLowerCase().includes("saturday") ||
      validity.toLowerCase().includes("sunday") ||
      planName.toLowerCase().includes("weekend")
    ) {
      category = "Weekend Plans";
    } else if (
      validity.toLowerCase().includes("night") ||
      planName.toLowerCase().includes("night")
    ) {
      category = "Night Plans";
    } else if (planName.toLowerCase().includes("unlimited")) {
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
      } else if (["24 hrs", "48 hrs", "72 hrs"].includes(validity) || days <= 3) {
        category = "Daily Plans";
      } else if (days >= 5 && days <= 14) {
        category = "Weekly Plans";
      } else {
        category = "Monthly Plans";
      }
    }
    return category;
  };

  const planTypeOptions = useMemo(() => {
    if (!dataBundles || !Array.isArray(dataBundles)) {
      return [];
    }
    let availablePlans: string[] = availablePlanTypes;
    if (searchTerm) {
      const results = searchBundles(searchTerm);
      if (results) {
        availablePlans = Array.from(new Set(results.map((bundle) => bundle.planType))).sort();
      }
    } else if (activeCategory === "Hot" && recentBundle) {
      availablePlans = Array.from(
        new Set(
          dataBundles
            .filter((bundle) => {
              try {
                const samePlanType = bundle.planType.toUpperCase() === recentBundle.planType.toUpperCase();
                const sameCategory = bundle.category === recentBundle.category;
                const recentData = parseFloat(recentBundle.data.match(/[\d.]+/)?.[0] || "0");
                const recentUnit = recentBundle.data.match(/[MG]B/)?.[0] || "";
                const recentMB = recentUnit === "GB" ? recentData * 1000 : recentData;
                const bundleData = parseFloat(bundle.data.match(/[\d.]+/)?.[0] || "0");
                const bundleUnit = bundle.data.match(/[MG]B/)?.[0] || "";
                const bundleMB = bundleUnit === "GB" ? bundleData * 1000 : bundleData;
                const similarData = bundleMB >= recentMB * 0.5 && bundleMB <= recentMB * 1.5;
                return samePlanType && sameCategory && similarData;
              } catch (error) {
                console.error("Bundle Processing Error:", bundle, error);
                return false;
              }
            })
            .map((bundle) => bundle.planType)
        )
      ).sort();
    } else {
      availablePlans = Array.from(
        new Set(dataBundles.filter((bundle) => bundle.category === activeCategory).map((bundle) => bundle.planType))
      ).sort();
    }

    availablePlans = availablePlans.filter((planType) =>
      VALID_PLAN_TYPES.map(pt => pt.toUpperCase()).includes(planType.toUpperCase())
    );

    console.log("Plan Type Options:", availablePlans, { provider: selectedProvider?.name, category: activeCategory });
    return availablePlans;
  }, [dataBundles, activeCategory, searchTerm, recentBundle, selectedProvider, availablePlanTypes]);

  const loadData = async () => {
    if (!selectedProvider || !networkId) {
      setErrorMessage("Missing provider or network ID");
      setIsLoading(false);
      router.back();
      return;
    }

    const cacheKey = selectedProvider.name.toUpperCase();
    if (planCache[cacheKey]) {
      setDataBundles(planCache[cacheKey]);
      setBundleCategories(
        Array.from(new Set(planCache[cacheKey].map((bundle) => bundle.category))).sort(
          (a, b) =>
            [
              "Daily Plans",
              "Weekly Plans",
              "Monthly Plans",
              "Weekend Plans",
              "Night Plans",
              "Unlimited Plans",
            ].indexOf(a) - ["Daily Plans", "Weekly Plans", "Monthly Plans", "Weekend Plans", "Night Plans", "Unlimited Plans"].indexOf(b)
        )
      );
      setAvailablePlanTypes(
        Array.from(new Set(planCache[cacheKey].map((bundle) => bundle.planType))).filter((planType) =>
          VALID_PLAN_TYPES.map(pt => pt.toUpperCase()).includes(planType.toUpperCase())
        )
      );
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user || !user.email) {
        throw new Error("User authentication failed or email missing");
      }

      setUserEmailAddress(user.email);

      if (!pinVerified.current) {
        const pinExists = await verifyTransactionPin(user.email);
        updateHasPin(pinExists);
      }

      let walletData = null;
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        try {
          const { data, error } = await supabase
            .from("wallets")
            .select("balance")
            .eq("user_email", user.email)
            .single();

          if (error && error.code !== "PGRST116") {
            console.error("Wallet fetch error:", error);
            throw error;
          }

          walletData = data;
          break;
        } catch (error) {
          attempts++;
          if (attempts === maxAttempts) {
            console.error("Failed to fetch wallet balance after retries:", error);
            throw new Error("Unable to fetch wallet balance");
          }
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      const currentBalance = walletData?.balance ?? 0;
      setWalletBalance(currentBalance);

      const subscription = supabase
        .channel(`wallet-updates:${user.email}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "wallets",
            filter: `user_email=eq.${user.email}`,
          },
          (payload) => {
            setWalletBalance(payload.new.balance ?? 0);
          }
        )
        .subscribe((status, err) => {
          if (err) {
            console.error("Subscription error:", err);
          }
        });

      const response = await fetch("https://ebenkdata.com/api/network/", {
        headers: {
          Authorization: "Token de883370902cf73e68ed63f566dbf38a38719f03",
        },
      });

      const rawData = await response.text();
      let parsedData;
      try {
        parsedData = JSON.parse(rawData);
        console.log("Parsed API Response:", parsedData);
      } catch (parseError) {
        throw new Error(`Unable to parse API response: ${rawData.slice(0, 100)}...`);
      }

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} - ${rawData.slice(0, 100)}...`);
      }

      const providerKey = `${selectedProvider.name.toUpperCase()}_PLAN`;
      const plans = parsedData[providerKey];
      console.log("Plans for providerKey", providerKey, ":", plans);

      if (!Array.isArray(plans) || plans.length === 0) {
        throw new Error(`No plans available for ${selectedProvider.name}`);
      }

      const bundles: DataBundle[] = plans.map((plan: any) => ({
        id: plan.id || 0,
        data: plan.plan || "Unknown",
        price: parseFloat(plan.plan_amount || "0") + 50,
        validity: plan.month_validate || "Not Specified",
        category: determineCategory(plan),
        description: plan.plan,
        variation_code: plan.dataplan_id,
        planType: (plan.plan_type || "Standard").toUpperCase(),
      }));

      console.log("Raw Bundles:", bundles);

      const filteredBundles = bundles.filter((bundle) =>
        VALID_PLAN_TYPES.map(pt => pt.toUpperCase()).includes(bundle.planType.toUpperCase())
      );

      console.log("Filtered Bundles:", filteredBundles, {
        provider: selectedProvider.name,
        validPlanTypes: VALID_PLAN_TYPES,
      });

      if (filteredBundles.length === 0) {
        console.warn("No bundles available after filtering for", selectedProvider.name);
        setErrorMessage(`No available plans for ${selectedProvider.name}. Check provider availability.`);
      }

      planCache[cacheKey] = filteredBundles;
      setDataBundles(filteredBundles);

      const uniqueCategories = Array.from(new Set(filteredBundles.map((bundle) => bundle.category)));
      const categoryOrder = [
        "Daily Plans",
        "Weekly Plans",
        "Monthly Plans",
        "Weekend Plans",
        "Night Plans",
        "Unlimited Plans",
      ];
      uniqueCategories.sort((a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b));
      let finalCategories = uniqueCategories;

      if (recentBundle && recentPurchaseDate) {
        const purchaseTime = new Date(recentPurchaseDate);
        const now = new Date();
        const hoursSincePurchase = (now.getTime() - purchaseTime.getTime()) / (1000 * 60 * 60);
        const dataValue = parseFloat(recentBundle.data.match(/[\d.]+/)?.[0] || "0");
        const unit = recentBundle.data.match(/[MG]B/)?.[0] || "";
        const dataInGB = unit === "GB" ? dataValue : dataValue / 1000;

        if (dataInGB >= 5 && hoursSincePurchase <= 6) {
          finalCategories = ["Hot", ...uniqueCategories];
        }
      }

      setBundleCategories(finalCategories);

      const providerPlanTypes = Array.from(new Set(filteredBundles.map((bundle) => bundle.planType))).filter((planType) =>
        VALID_PLAN_TYPES.map(pt => pt.toUpperCase()).includes(planType.toUpperCase())
      );

      setAvailablePlanTypes(providerPlanTypes);

      const allPlanTypes = await fetchAllProviderPlans();
      console.log("Cross-referenced Plan Types:", allPlanTypes, { provider: selectedProvider.name });

      if (providerPlanTypes.length > 0) {
        const defaultPlanType = providerPlanTypes.includes("GIFTING") || providerPlanTypes.includes("Gifting")
          ? "Gifting"
          : providerPlanTypes[0];
        setActivePlanType(defaultPlanType);
        console.log("Initial plan type set:", defaultPlanType, { available: providerPlanTypes });
      }

      return () => {
        supabase.removeChannel(subscription);
      };
    } catch (error: any) {
      console.error("Data Fetch Error:", error.message);
      setErrorMessage(
        `Unable to load ${selectedProvider?.name || "provider"} data plans or wallet balance: ${error.message}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    if (selectedProvider && networkId) {
      loadData().then(() => {
        if (mounted) {
          console.log("loadData completed, hasPin:", hasPin, { timestamp: Date.now() });
        }
      });
    }

    return () => {
      mounted = false;
    };
  }, [selectedProvider, networkId]);

  useEffect(() => {
    console.log("hasPin state changed:", hasPin, { timestamp: Date.now() });
  }, [hasPin]);

  useEffect(() => {
    if (planTypeOptions.length > 0 && !planTypeOptions.includes(activePlanType)) {
      const defaultPlanType = planTypeOptions.includes("GIFTING") || planTypeOptions.includes("Gifting")
        ? "Gifting"
        : planTypeOptions[0];
      setActivePlanType(defaultPlanType);
      console.log("Setting default plan type:", defaultPlanType, { available: planTypeOptions });
    }
  }, [planTypeOptions]);

  const detectProviderFromNumber = (phone: string): string => {
    if (phone.length !== 11) return "";
    const prefix = phone.slice(0, 4);
    const mtnPrefixes = ["0803", "0806", "0703", "0706", "0813", "0816", "0810", "0814", "0903", "0906", "0913", "0916"];
    const gloPrefixes = ["0805", "0807", "0705", "0815", "0811", "0905", "0915"];
    const airtelPrefixes = ["0802", "0808", "0708", "0812", "0701", "0902", "0907", "0901", "0912"];
    const nineMobilePrefixes = ["0809", "0817", "0818", "0909", "0908"];

    if (mtnPrefixes.includes(prefix)) return "MTN";
    if (gloPrefixes.includes(prefix)) return "GLO";
    if (airtelPrefixes.includes(prefix)) return "AIRTEL";
    if (nineMobilePrefixes.includes(prefix)) return "9MOBILE";
    return "";
  };

  useEffect(() => {
    if (phoneNumberInput.length === 11 && selectedProvider) {
      const provider = detectProviderFromNumber(phoneNumberInput);
      setDetectedNetwork(provider === selectedProvider.name ? provider : "");
    } else {
      setDetectedNetwork("");
    }
  }, [phoneNumberInput, selectedProvider]);

  const handleProceed = async () => {
    if (!selectedBundle) {
      Alert.alert("Error", "No plan selected");
      return;
    }
    if (!selectedProvider) {
      Alert.alert("Error", "No provider selected");
      return;
    }
    if (!networkId) {
      Alert.alert("Error", "Network ID missing");
      return;
    }
    if (!phoneNumberInput || phoneNumberInput.length !== 11 || !/^\d{11}$/.test(phoneNumberInput)) {
      Alert.alert("Error", "Enter a valid 11-digit phone number");
      return;
    }
    if (!hasPin) {
      Alert.alert("Error", "Create a transaction PIN first");
      setIsPinCreationModalOpen(true);
      return;
    }
    if (!transactionPinInput || transactionPinInput.length < 4 || transactionPinInput.length > 6 || !/^\d+$/.test(transactionPinInput)) {
      Alert.alert("Error", "Enter a PIN between 4 and 6 digits");
      return;
    }
    if (!userEmailAddress) {
      Alert.alert("Error", "User authentication missing");
      return;
    }
    if (walletBalance === null) {
      Alert.alert("Error", "Wallet balance not loaded");
      return;
    }
    if (selectedBundle.price > walletBalance) {
      Alert.alert(
        "Error",
        `Insufficient balance. Required: ₦${formatNumberWithCommas(selectedBundle.price)}, Available: ₦${formatNumberWithCommas(walletBalance)}`
      );
      return;
    }
    if (detectedNetwork && detectedNetwork.toUpperCase() !== selectedProvider.name.toUpperCase()) {
      Alert.alert("Error", `Phone number does not match the selected provider (${selectedProvider.name})`);
      return;
    }

    try {
      const { data: profileData, error: pinError } = await supabase
        .from("profiles")
        .select("transaction_pin")
        .eq("email", userEmailAddress)
        .single();

      if (pinError) {
        console.error("PIN Error:", pinError);
        if (pinError.code === "PGRST116") {
          Alert.alert("Error", "Profile not found. Create a transaction PIN.");
          setIsPinCreationModalOpen(true);
        } else {
          Alert.alert("Error", "PIN verification failed.");
        }
        return;
      }

      if (!profileData || !profileData.transaction_pin) {
        Alert.alert("Error", "No PIN set. Create a transaction PIN.");
        setIsPinCreationModalOpen(true);
        return;
      }

      if (profileData.transaction_pin !== transactionPinInput) {
        Alert.alert("Error", "Incorrect PIN");
        return;
      }

      const reference = await createTransactionReference();
      setTransactionReference(reference);

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
          userEmail: userEmailAddress,
          referenceId: reference,
          balance: walletBalance.toString(),
          networkId: networkId.toString(),
          planId: selectedBundle.id.toString(),
        },
      });

      setIsPurchaseModalOpen(false);
    } catch (error) {
      console.error("PIN Verification Error:", error);
      Alert.alert("Error", "Unable to verify PIN or generate reference. Please retry.");
    }
  };

  const savePin = async () => {
    if (newPinInput.length < 4 || newPinInput.length > 6 || confirmPinInput.length < 4 || confirmPinInput.length > 6) {
      Alert.alert("Error", "PIN must be 4-6 digits.");
      return;
    }
    if (newPinInput !== confirmPinInput) {
      Alert.alert("Error", "PINs do not match.");
      return;
    }

    if (!userEmailAddress) {
      Alert.alert("Error", "User not authenticated");
      return;
    }

    try {
      setIsLoading(true);
      const { data: profile, error: fetchError } = await supabase
        .from("profiles")
        .select("email")
        .eq("email", userEmailAddress)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        throw fetchError;
      }

      if (profile) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ transaction_pin: newPinInput })
          .eq("email", userEmailAddress);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("profiles")
          .insert({ email: userEmailAddress, transaction_pin: newPinInput });
        if (insertError) throw insertError;
      }

      const pinExists = await verifyTransactionPin(userEmailAddress);
      if (!pinExists) {
        throw new Error("PIN verification failed after saving");
      }

      updateHasPin(true);
      console.log("hasPin set to true after PIN creation", { timestamp: Date.now() });
      setTransactionPinInput(newPinInput);
      setIsPinCreationModalOpen(false);
      setNewPinInput("");
      setConfirmPinInput("");
      setIsPurchaseModalOpen(true);
      Alert.alert("Success", "Transaction PIN created.");
    } catch (error) {
      console.error("PIN Save Error:", error);
      Alert.alert("Error", "Unable to create PIN. Please retry.");
    } finally {
      setIsLoading(false);
    }
  };

  const showPurchaseModal = async (bundle: DataBundle) => {
    try {
      if (!userEmailAddress) {
        throw new Error("User email not available");
      }
      const reference = await createTransactionReference();
      setTransactionReference(reference);
      setSelectedBundle(bundle);
      if (!pinVerified.current) {
        const pinExists = await verifyTransactionPin(userEmailAddress);
        updateHasPin(pinExists);
        console.log("showPurchaseModal hasPin:", pinExists, { timestamp: Date.now() });
      } else {
        console.log("Skipping PIN verification, using stored hasPin:", hasPin, { timestamp: Date.now() });
      }
      setIsPurchaseModalOpen(true);
      return hasPin;
    } catch (error) {
      console.error("Error in showPurchaseModal:", error);
      setIsPurchaseModalOpen(false);
      Alert.alert("Error", "Unable to generate reference or open purchase modal");
      return false;
    }
  };

  const closeTransactionModal = () => {
    setIsTransactionModalOpen(false);
    setPhoneNumberInput("");
    setTransactionPinInput("");
    setSelectedBundle(null);
    setDetectedNetwork("");
    setTransactionState("processing");
    setTransactionReference("");
  };

  const closePurchaseModal = () => {
    setIsPurchaseModalOpen(false);
    setPhoneNumberInput("");
    setTransactionPinInput("");
    setSelectedBundle(null);
    setDetectedNetwork("");
    setTransactionReference("");
  };

  const closePinCreationModal = () => {
    setIsPinCreationModalOpen(false);
    setNewPinInput("");
    setConfirmPinInput("");
  };

  const navigateBack = () => {
    router.back();
  };

  const chooseCategory = (category: string) => {
    setActiveCategory(category);
    const planTypes = dataBundles
      .filter((bundle) => bundle.category === category)
      .map((bundle) => bundle.planType);
    const uniqueTypes = Array.from(new Set(planTypes)).sort();
    if (uniqueTypes.length > 0) {
      const defaultPlanType = uniqueTypes.includes("GIFTING") || uniqueTypes.includes("Gifting") ? "Gifting" : uniqueTypes[0];
      setActivePlanType(defaultPlanType);
      console.log("Category changed, set plan type:", defaultPlanType, { available: uniqueTypes });
    }
    Animated.timing(animationScale, {
      toValue: 1.05,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      Animated.timing(animationScale, {
        toValue: 1,
        duration: 0,
        useNativeDriver: true,
      }).start();
    });
  };

  const choosePlanType = (planType: string) => {
    setActivePlanType(planType);
  };

  const resetSearch = () => {
    setSearchTerm("");
  };

  const retryLoad = () => {
    setIsLoading(true);
    setErrorMessage(null);
    loadData();
  };

  const BundleCard: React.FC<{ bundle: DataBundle }> = ({ bundle }) => {
    const slideAnimation = useRef(new Animated.Value(0)).current;
    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
        },
        onPanResponderMove: (_, gesture) => {
          if (gesture.dx > 0) {
            slideAnimation.setValue(gesture.dx);
          }
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx > 100) {
            showPurchaseModal(bundle);
          }
          Animated.spring(slideAnimation, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        },
      })
    ).current;

    return (
      <Animated.View key={bundle.id} {...panResponder.panHandlers} style={{ transform: [{ translateX: slideAnimation }] }}>
        <View style={styles.bundleCard}>
          <View style={styles.bundleHeader}>
            <View style={styles.bundleInfo}>
              <Text style={styles.bundleTitle} numberOfLines={1} ellipsizeMode="tail">
                {bundle.data}
              </Text>
              <Text style={styles.bundleValidityText}>{bundle.validity}</Text>
            </View>
            <Text style={styles.bundlePrice}>₦{formatNumberWithCommas(bundle.price)}</Text>
          </View>
          <Text style={styles.bundleDescription} numberOfLines={2} ellipsizeMode="tail">
            {bundle.description}
          </Text>
          {bundle.planType && <Text style={styles.planTypeText}>{bundle.planType}</Text>}
          {bundle.validity === "Not Specified" && (
            <Text style={styles.warningText}>Note: Plan duration unclear. Check with provider.</Text>
          )}
          <View style={styles.bundleActions}>
            <MotiView from={{ scale: 1 }} animate={{ scale: [1, 1.05, 1] }} transition={{ type: "timing", duration: 1500 }}>
              <Pressable onPress={() => showPurchaseModal(bundle)} style={styles.buyButton}>
                <Text style={styles.buyButtonText}>Purchase</Text>
              </Pressable>
            </MotiView>
            <View style={styles.swipeHint}>
              <Text style={styles.swipeText}>or swipe right</Text>
              <Ionicons name="arrow-forward" size={14} color="#ccc" />
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

  const getCategoryBundles = (category: string) => {
    if (!dataBundles || !Array.isArray(dataBundles)) {
      return [];
    }
    if (searchTerm) {
      const results = searchBundles(searchTerm);
      return results || [];
    }
    let filtered = dataBundles;
    filtered = filtered.filter(
      (bundle) => bundle.planType.toLowerCase() === activePlanType.toLowerCase()
    );

    if (category === "Hot" && recentBundle) {
      return filtered
        .filter((bundle) => {
          try {
            const samePlanType = bundle.planType.toUpperCase() === recentBundle.planType.toUpperCase();
            const sameCategory = bundle.category === recentBundle.category;
            const recentData = parseFloat(recentBundle.data.match(/[\d.]+/)?.[0] || "0");
            const recentUnit = recentBundle.data.match(/[MG]B/)?.[0] || "";
            const recentMB = recentUnit === "GB" ? recentData * 1000 : recentData;
            const bundleData = parseFloat(bundle.data.match(/[\d.]+/)?.[0] || "0");
            const bundleUnit = bundle.data.match(/[MG]B/)?.[0] || "";
            const bundleMB = bundleUnit === "GB" ? bundleData * 1000 : bundleData;
            const similarData = bundleMB >= recentMB * 0.5 && bundleMB <= recentMB * 1.5;
            return samePlanType && sameCategory && similarData;
          } catch (error) {
            console.error("Bundle Error:", error);
            return false;
          }
        })
        .sort((a, b) => a.price - b.price)
        .slice(0, 5);
    }

    return filtered
      .filter((bundle) => bundle.category === category)
      .sort((a, b) => a.price - b.price);
  };

  if (!selectedProvider || !networkId) {
    return null;
  }

  const categoryBundles = getCategoryBundles(activeCategory);

  return (
    <View style={styles.container}>
      <View style={styles.fixedHeader}>
        <View style={styles.providerHeader}>
          <Pressable onPress={navigateBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>
          <Image source={selectedProvider.image} style={styles.providerLogo} resizeMode="contain" />
          <Text style={styles.providerName}>{selectedProvider.name} Data Plans</Text>
        </View>
        <View style={styles.walletBalanceContainer}>
          <Text style={styles.walletBalanceLabel}>Wallet Balance:</Text>
          <Text style={styles.walletBalanceValue}>
            {walletBalance === null ? "Loading..." : `₦${formatNumberWithCommas(walletBalance)}`}
          </Text>
        </View>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#A1A1AA" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search plans (e.g., 1GB for 30 days)"
            placeholderTextColor="#A1A1AA"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          {searchTerm?.length > 0 && (
            <TouchableOpacity onPress={resetSearch} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#A1A1AA" />
            </TouchableOpacity>
          )}
        </View>
        {!searchTerm && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryBarContent}>
            {bundleCategories.map((category) => (
              <Pressable
                key={category}
                onPress={() => chooseCategory(category)}
                style={[styles.categoryButton, activeCategory === category ? styles.selectedCategoryButton : {}]}
              >
                <Text
                  style={[styles.categoryLabel, activeCategory === category ? styles.selectedCategoryLabel : {}]}
                >
                  {category === "Hot" ? "🔥 Hot" : category}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
        {!searchTerm && planTypeOptions.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.planTypeBarContent}
          >
            {planTypeOptions.map((planType) => (
              <Pressable
                key={planType}
                onPress={() => choosePlanType(planType)}
                style={[styles.planTypeButton, activePlanType === planType ? styles.selectedPlanTypeButton : {}]}
              >
                <Text
                  style={[styles.planTypeLabel, activePlanType === planType ? styles.selectedPlanTypeLabel : {}]}
                >
                  {planType}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        nestedScrollEnabled={true}
        showsVerticalScrollIndicator={true}
        overScrollMode="never"
        bounces={true}
        alwaysBounceVertical={true}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00cc66" />
            <Text style={styles.activityIndicatorText}>Loading Plans...</Text>
          </View>
        ) : errorMessage ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <Pressable onPress={retryLoad} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : bundleCategories.length === 0 && !searchTerm ? (
          <Text style={styles.noCategoriesText}>No categories available</Text>
        ) : categoryBundles.length === 0 ? (
          <Text style={styles.noPlansText}>
            {searchTerm ? "No matching plans found" : "No plans in this category"}
          </Text>
        ) : (
          <View style={styles.bundleListContainer}>
            <Text style={styles.categoryHint}>
              {searchTerm ? "Search Results:" : "Choose a plan:"}
            </Text>
            <View style={styles.bundleWrapper}>
              {categoryBundles.map((bundle) => (
                <BundleCard key={bundle.id} bundle={bundle} />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
      <View style={{ zIndex: 5 }}>
        <PurchaseModal
          visible={isPurchaseModalOpen}
          onClose={closePurchaseModal}
          selectedPlan={selectedBundle?.data || ""}
          phoneNumber={phoneNumberInput}
          setPhoneNumber={setPhoneNumberInput}
          transactionPin={transactionPinInput}
          setTransactionPin={setTransactionPinInput}
          networkProvider={detectedNetwork}
          hasPin={hasPin}
          defaultPin={transactionPinInput}
          showTransactionPin={isTransactionPinVisible}
          setShowTransactionPin={setIsTransactionPinVisible}
          onCreatePin={() => setIsPinCreationModalOpen(true)}
          onContinue={handleProceed}
        />
        <TransactionStatusModal
          visible={isTransactionModalOpen}
          onClose={closeTransactionModal}
          transactionStatus={transactionState}
          selectedPlan={selectedBundle}
          phoneNumber={phoneNumberInput}
          networkProvider={detectedNetwork}
        />
        <CreatePinModal
          visible={isPinCreationModalOpen}
          onClose={closePinCreationModal}
          newPin={newPinInput}
          setNewPin={setNewPinInput}
          confirmPin={confirmPinInput}
          setConfirmPin={setConfirmPinInput}
          showNewPin={isNewPinVisible}
          setShowNewPin={setIsNewPinVisible}
          showConfirmPin={isConfirmPinVisible}
          setShowConfirmPin={setIsConfirmPinVisible}
          onSave={savePin}
          isLoading={isLoading}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  fixedHeader: {
    backgroundColor: "black",
    paddingTop: 48,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  scrollView: {
    flex: 1,
    marginTop: 0,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 50,
    flexGrow: 1,
  },
  providerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  backButton: {
    marginRight: 12,
  },
  providerLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "white",
  },
  providerName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    marginLeft: 12,
  },
  walletBalanceContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1E1E1E",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  walletBalanceLabel: {
    fontSize: 16,
    color: "#A1A1AA",
  },
  walletBalanceValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E1E1E",
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "white",
    paddingVertical: 10,
  },
  clearButton: {
    padding: 4,
  },
  categoryBarContent: {
    flexDirection: "row",
    paddingHorizontal: 4,
  },
  planTypeBarContent: {
    flexDirection: "row",
    paddingHorizontal: 4,
  },
  categoryButton: {
    backgroundColor: "#1E1E1E",
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginHorizontal: 4,
    borderRadius: 6,
  },
  planTypeButton: {
    backgroundColor: "#1E1E1E",
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 4,
  },
  selectedCategoryButton: {
    backgroundColor: "#744925",
  },
  selectedPlanTypeButton: {
    backgroundColor: "#744925",
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#A1A1AA",
  },
  planTypeLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#A1A1AA",
  },
  selectedCategoryLabel: {
    color: "white",
  },
  selectedPlanTypeLabel: {
    color: "white",
  },
  categoryHint: {
    fontSize: 14,
    color: "white",
    marginBottom: 12,
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
    backgroundColor: "#2D2D2D",
    borderRadius: 12,
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
    fontWeight: "bold",
    color: "white",
    flexGrow: 1,
  },
  bundleValidityText: {
    fontSize: 12,
    color: "#A1A1AA",
    marginTop: 4,
  },
  bundlePrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
    textAlign: "right",
  },
  bundleDescription: {
    fontSize: 12,
    color: "#A1A1AA",
    marginBottom: 8,
    flexWrap: "wrap",
  },
  planTypeText: {
    fontSize: 14,
    color: "#A1A1AA",
    marginBottom: 8,
    textAlign: "left",
  },
  warningText: {
    fontSize: 14,
    color: "#FF4444",
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
    borderRadius: 6,
  },
  buyButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
  },
  swipeHint: {
    alignItems: "center",
  },
  swipeText: {
    fontSize: 14,
    color: "#A1A1AA",
    marginBottom: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  activityIndicatorText: {
    fontSize: 16,
    color: "#A1A1AA",
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
    color: "#FF4444",
    textAlign: "center",
    marginTop: 20,
  },
  noCategoriesText: {
    fontSize: 16,
    color: "#A1A1AA",
    textAlign: "center",
    marginTop: 20,
  },
  noPlansText: {
    fontSize: 16,
    color: "#A1A1AA",
    textAlign: "center",
    marginTop: 20,
  },
  retryButton: {
    backgroundColor: "#744925",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 20,
  },
  retryButtonText: {
    fontSize: 16,
    color: "white",
    fontWeight: "600",
  },
});

export default BuyDataScreen;