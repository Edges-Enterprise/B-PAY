import React, { useState, useEffect, useRef, useCallback, useMemo, useContext } from "react";
import { View, Alert, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
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
  "CORPORATE GIFTING",
  "GIFTING",
  "STANDARD",
];

const formatNumberWithCommas = (number: number): string => {
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const BuyDataScreen: React.FC = () => {
  const { providerPlans, userEmail, errorMessage } = useContext(DataContext);
  const params = useLocalSearchParams<{ provider?: string; networkId?: string }>();
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [networkId, setNetworkId] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("Daily Plans");
  const [activePlanType, setActivePlanType] = useState<string>("GIFTING");
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
  const [newPin, setNewPin] = useState<string>("");
  const [confirmPin, setConfirmPin] = useState<string>("");
  const [isNewPinVisible, setIsNewPinVisible] = useState<boolean>(false);
  const [isConfirmPinVisible, setIsConfirmPinVisible] = useState<boolean>(false);
  const [recentBundle, setRecentBundle] = useState<DataBundle | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [transactionReference, setTransactionReference] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const pinVerified = useRef<boolean>(false);

  // Reset modal states when the screen regains focus
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
    }, [])
  );

  // Fetch wallet balance in real-time
  const fetchWalletBalance = useCallback(async () => {
    if (!userEmail) return;
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_email", userEmail)
        .single();
      
      if (error) {
        console.error("Error fetching wallet balance:", error);
        Alert.alert("Error", "Failed to fetch wallet balance");
        return;
      }
      
      const balance = data?.balance ?? 0;
      setWalletBalance(balance);
      console.log("Fetched wallet balance:", balance);
    } catch (error) {
      console.error("Error in fetchWalletBalance:", error);
      Alert.alert("Error", "Failed to fetch wallet balance");
    } finally {
      setIsLoading(false);
    }
  }, [userEmail]);

  // Initial fetch and setup real-time subscription
  useEffect(() => {
    if (!userEmail) return;

    // Initial fetch
    fetchWalletBalance();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('wallet_balance_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `email=eq.${userEmail}`,
        },
        (payload) => {
          if (payload.new && 'wallet_balance' in payload.new) {
            const newBalance = payload.new.wallet_balance ?? 0;
            setWalletBalance(newBalance);
            console.log("Real-time wallet balance update:", newBalance);
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
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
          if (
            selectedProvider?.id !== provider.id ||
            selectedProvider?.name !== provider.name ||
            selectedProvider?.code !== provider.code ||
            selectedProvider?.imageKey !== provider.imageKey ||
            networkId !== id
          ) {
            const normalizedProvider: Provider = {
              id: provider.id,
              name: provider.name,
              code: provider.code,
              imageKey: provider.imageKey,
              image: provider.imageKey && provider.imageKey !== "DEFAULT"
                ? NETWORK_IMAGES[provider.imageKey] || DEFAULT_PROVIDER_IMAGE
                : DEFAULT_PROVIDER_IMAGE,
              availablePlanTypes: provider.availablePlanTypes,
            };
            setSelectedProvider(normalizedProvider);
            setNetworkId(id);
            console.log("Initialized provider:", normalizedProvider);
          }
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

  const dataBundles = useMemo(() => {
    if (!selectedProvider) return [];
    const plans = providerPlans[selectedProvider.name.toUpperCase()] || [];
    console.log(`DataBundles for ${selectedProvider.name}:`, {
      count: plans.length,
      sample: plans.slice(0, 3).map((p: DataBundle) => ({
        id: p.id,
        planType: p.planType,
        category: p.category,
        validity: p.validity,
        variation_code: p.variation_code,
        description: p.description,
      })),
    });
    return plans;
  }, [selectedProvider, providerPlans]);

  const bundleCategories = useMemo(() => {
    const categories = Array.from(new Set(dataBundles.map((bundle: DataBundle) => bundle.category))).sort(
      (a: string, b: string) =>
        ["Daily Plans", "Weekly Plans", "Monthly Plans"].indexOf(a) -
        ["Daily Plans", "Weekly Plans", "Monthly Plans"].indexOf(b)
    );
    console.log("Categories:", categories);
    return categories;
  }, [dataBundles]);

  const availablePlanTypes = useMemo(() => {
    const planTypes = [...new Set(dataBundles.map((bundle: DataBundle) => bundle.planType))];
    console.log("Raw PlanTypes:", planTypes);
    const filtered = planTypes.filter((planType: string) =>
      VALID_PLAN_TYPES.includes(planType)
    );
    console.log("Filtered PlanTypes:", filtered);
    return filtered;
  }, [dataBundles]);

  const categoryPlanTypes = useMemo(() => {
    if (!dataBundles.length) return [];
    const planTypes = [...new Set(
      dataBundles
        .filter((bundle) => activeCategory === "Hot" || bundle.category === activeCategory)
        .map((bundle) => bundle.planType)
    )].filter((planType) => VALID_PLAN_TYPES.includes(planType));
    console.log(`PlanTypes for ${activeCategory}:`, planTypes);
    return planTypes;
  }, [dataBundles, activeCategory]);

  useEffect(() => {
    if (categoryPlanTypes.length === 0) {
      console.log(`No plan types available for ${activeCategory}, resetting to GIFTING`);
      if (activePlanType !== "GIFTING") {
        setActivePlanType("GIFTING");
      }
      return;
    }

    if (!categoryPlanTypes.includes(activePlanType)) {
      let newPlanType: string;
      if (categoryPlanTypes.includes("GIFTING")) {
        newPlanType = "GIFTING";
      } else if (categoryPlanTypes.includes("CORPORATE GIFTING")) {
        newPlanType = "CORPORATE GIFTING";
      } else {
        newPlanType = categoryPlanTypes[0];
      }
      if (activePlanType !== newPlanType) {
        console.log(`Setting activePlanType to ${newPlanType} for ${activeCategory}`);
        setActivePlanType(newPlanType);
      }
    }
  }, [activeCategory, categoryPlanTypes, activePlanType]);

  const planTypeOptions = useMemo(() => {
    console.log("Processing PlanTypeOptions:", {
      dataBundlesLength: dataBundles.length,
      activeCategory,
      searchTerm,
      provider: selectedProvider?.name,
      availablePlanTypes: categoryPlanTypes.length,
    });

    if (!dataBundles.length) {
      console.warn("No dataBundles available");
      return availablePlanTypes;
    }

    let types: string[] = [];
    if (searchTerm) {
      const results = dataBundles.filter((bundle: DataBundle) => {
        const search = searchTerm.toLowerCase().trim();
        return (
          bundle.data.toLowerCase().includes(search) ||
          bundle.validity.toLowerCase().includes(search) ||
          bundle.planType?.toLowerCase()?.includes(search) ||
          bundle.description?.toLowerCase()?.includes(search) ||
          bundle.variation_code?.toLowerCase()?.includes(search)
        );
      });
      types = [...new Set(results.map((bundle: DataBundle) => bundle.planType))];
    } else if (activeCategory === "Hot" && recentBundle) {
      types = [
        ...new Set(
          dataBundles
            .filter((bundle: DataBundle) => {
              try {
                const sameType = bundle.planType === recentBundle.planType;
                const sameCategory = bundle.category === recentBundle.category;
                const recentData = parseFloat(recentBundle.data.match(/[\d.]+/)?.[0] || "0");
                const recentUnit = recentBundle.data.match(/[MG]B/)?.[0] || "";
                const recentMB = recentUnit === "GB" ? recentData * 1000 : recentData;
                const bundleData = parseFloat(bundle.data.match(/[\d.]+/)?.[0] || "0");
                const bundleUnit = bundle.data.match(/[MG]B/)?.[0] || "";
                const bundleMB = bundleUnit === "GB" ? bundleData * 1000 : bundleData;
                const similarData = bundleMB >= recentMB * 0.5 && bundleMB <= recentMB * 1.5;
                return sameType && sameCategory && similarData;
              } catch (error) {
                console.error("Error processing bundle:", error);
                return false;
              }
            })
            .map((bundle: DataBundle) => bundle.planType)
        ),
      ];
    } else {
      types = categoryPlanTypes;
    }

    types = types.filter((planType: string) => VALID_PLAN_TYPES.includes(planType));
    console.log("Computed planTypeOptions:", types);
    return types;
  }, [dataBundles, activeCategory, searchTerm, recentBundle, categoryPlanTypes]);

  const updateHasPin = useCallback((value: boolean) => {
    if (!pinVerified.current || value) {
      console.log("Updating hasPin:", value);
      setHasPin(value);
      if (value) pinVerified.current = true;
    }
  }, []);

  const verifyTransactionPin = useCallback(async (email: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.from("profiles").select("transaction_pin").eq("email", email).single();
      if (error) {
        if (error.code === "PGRST116") {
          console.log("No profile for email:", email);
          return false;
        }
        throw error;
      }
      const exists = !!data?.transaction_pin;
      console.log("PIN exists:", exists);
      return exists;
    } catch (error) {
      console.error("PIN verification error:", error);
      Alert.alert("Error", "Unable to verify PIN");
      return false;
    }
  }, []);

  const createTransactionReference = useCallback(async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user || !user.id) throw new Error("Auth failed");
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
    const mtn = ["0803", "0806", "0703", "0706", "0813", "0816", "0810", "0814", "0903", "0906", "0913", "0916"];
    const glo = ["0805", "0807", "0705", "0815", "0811", "0905", "0915"];
    const airtel = ["0802", "0808", "0708", "0812", "0701", "0902", "0907", "0901", "0912"];
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
    });

    if (!selectedBundle) {
      console.error("No plan selected");
      return Alert.alert("Error", "No plan selected");
    }
    if (!selectedProvider) {
      console.error("No provider selected");
      return Alert.alert("Error", "No provider selected");
    }
    if (!networkId) {
      console.error("Network ID missing");
      return Alert.alert("Error", "Network ID missing");
    }
    if (!phoneNumberInput || phoneNumberInput.length !== 11 || !/^\d{11}$/.test(phoneNumberInput)) {
      console.error("Invalid phone number:", phoneNumberInput);
      return Alert.alert("Error", "Enter a valid 11-digit phone number");
    }
    if (!hasPin) {
      console.log("No PIN, opening PIN creation modal");
      setIsPinCreationModalOpen(true);
      return Alert.alert("Error", "Create a transaction PIN");
    }
    if (!transactionPinInput || transactionPinInput.length < 4 || transactionPinInput.length > 6 || !/^\d+$/.test(transactionPinInput)) {
      console.error("Invalid PIN:", transactionPinInput);
      return Alert.alert("Error", "Enter a 4-6 digit PIN");
    }
    if (!userEmail) {
      console.error("User email missing");
      return Alert.alert("Error", "User authentication missing");
    }
    if (walletBalance === null) {
      console.error("Wallet balance not loaded");
      return Alert.alert("Error", "Wallet balance not loaded");
    }
    if (selectedBundle.price > walletBalance) {
      console.error("Insufficient balance:", { price: selectedBundle.price, balance: walletBalance });
      return Alert.alert(
        "Error",
        `Insufficient balance: ₦${formatNumberWithCommas(selectedBundle.price)} needed, ₦${formatNumberWithCommas(walletBalance)} available`
      );
    }
    if (detectedNetwork && detectedNetwork.toUpperCase() !== selectedProvider.name.toUpperCase()) {
      console.error("Network mismatch:", { detected: detectedNetwork, provider: selectedProvider.name });
      return Alert.alert("Error", `Phone number does not match provider (${selectedProvider.name})`);
    }

    setIsLoading(true);
    try {
      const { data: profileData, error: pinError } = await supabase.from("profiles").select("transaction_pin").eq("email", userEmail).single();
      if (pinError) {
        console.error("PIN verification error:", pinError);
        if (pinError.code === "PGRST116") {
          setIsPinCreationModalOpen(true);
          Alert.alert("Error", "Profile not found. Create a PIN");
        } else {
          Alert.alert("Error", "PIN verification failed");
        }
        return;
      }

      if (!profileData || !profileData.transaction_pin) {
        console.log("No PIN set, opening PIN creation modal");
        setIsPinCreationModalOpen(true);
        return Alert.alert("Error", "No PIN set. Create a PIN");
      }

      if (profileData.transaction_pin !== transactionPinInput) {
        console.error("Incorrect PIN");
        return Alert.alert("Error", "Incorrect PIN");
      }

      const reference = await createTransactionReference();
      console.log("Generated reference:", reference);
      setTransactionReference(reference);

      // Hide modal synchronously before navigation
      setIsPurchaseModalOpen(false);
      setPhoneNumberInput("");
      setTransactionPinInput("");
      setDetectedNetwork("");

      console.log("Navigating to Confirmation with params:", {
        bundle: selectedBundle,
        provider: {
          id: selectedProvider.id,
          name: selectedProvider.name,
          code: selectedProvider.code,
          imageKey: selectedProvider.imageKey,
        },
        phoneNumber: phoneNumberInput,
        transactionPin: transactionPinInput,
        userEmail,
        referenceId: reference,
        balance: walletBalance,
        networkId,
        planId: selectedBundle.id,
      });

      // Small delay to ensure modal is hidden before navigation
      setTimeout(() => {
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
            networkId: networkId.toString(),
            planId: selectedBundle.id.toString(),
          },
        });
      }, 0);
    } catch (error) {
      console.error("handleProceed error:", error);
      Alert.alert("Error", "Unable to verify PIN or generate reference");
    } finally {
      setIsLoading(false);
    }
  };

  const savePin = async () => {
    setIsLoading(true);
    try {
      if (newPin.length < 4 || newPin.length > 6 || confirmPin.length < 4 || confirmPin.length > 6) {
        console.error("Invalid PIN length:", { newPin, confirmPin });
        return Alert.alert("Error", "PIN must be 4-6 digits");
      }
      if (newPin !== confirmPin) {
        console.error("PINs do not match");
        return Alert.alert("Error", "PINs do not match");
      }
      if (!userEmail) {
        console.error("User email missing");
        return Alert.alert("Error", "User authentication missing");
      }

      const { error } = await supabase.auth.updateUser({
        data: { transaction_pin: newPin, transaction_pin_created: true },
      });
      if (error) throw error;
      setHasPin(true);
      pinVerified.current = true;
      setIsPinCreationModalOpen(false);
      setNewPin("");
      setConfirmPin("");
      console.log("PIN created successfully");
      Alert.alert("Success", "PIN created");
    } catch (error) {
      console.error("PIN Creation Error:", error);
      Alert.alert("Error", "Failed to save PIN");
    } finally {
      setIsLoading(false);
    }
  };

  const resetSearch = () => setSearchTerm("");

  const chooseCategory = (category: string) => setActiveCategory(category);

  const choosePlanType = (planType: string) => setActivePlanType(planType);

  if (errorMessage) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{errorMessage}</Text>
        <Pressable onPress={() => router.back()} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Go Back</Text>
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
        bundleCategories={["Hot", ...bundleCategories]}
        activeCategory={activeCategory}
        chooseCategory={chooseCategory}
        planTypeOptions={planTypeOptions}
        activePlanType={activePlanType}
        choosePlanType={choosePlanType}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        resetSearch={resetSearch}
      />
      <DataBundleList
        dataBundles={dataBundles}
        activeCategory={activeCategory}
        activePlanType={activePlanType}
        searchTerm={searchTerm}
        setSelectedBundle={setSelectedBundle}
        setIsPurchaseModalOpen={setIsPurchaseModalOpen}
        isLoading={false}
        errorMessage=""
        retryLoad={() => {}}
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