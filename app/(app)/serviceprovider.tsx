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
  const { providerPlans, userEmail, errorMessage, fetchData } = useContext(DataContext);
  const params = useLocalSearchParams<{ provider?: string; networkId?: string }>();
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [networkId, setNetworkId] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("Hot");
  const [activePlanType, setActivePlanType] = useState<string>("");
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
        '9MOBILE': 4,
        AIRTEL: 2,
      };
      const expectedNetworkId = networkIds[selectedBundle.planType];
      if (expectedNetworkId && networkId !== expectedNetworkId) {
        console.log('Synchronizing networkId for Hot plan:', {
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
      fetchData(); // Refresh plans on screen focus
    }, [fetchData])
  );

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

  useEffect(() => {
    if (!userEmail) return;

    fetchWalletBalance();

    const subscription = supabase
      .channel(`wallet-changes:${userEmail}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'wallets',
          filter: `user_email=eq.${userEmail}`,
        },
        (payload) => {
          console.log("Real-time wallet balance update:", payload);
          setWalletBalance(payload.new.balance ?? 0);
        }
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
            image: provider.imageKey && provider.imageKey !== "DEFAULT"
              ? NETWORK_IMAGES[provider.imageKey] || DEFAULT_PROVIDER_IMAGE
              : DEFAULT_PROVIDER_IMAGE,
            availablePlanTypes: provider.availablePlanTypes || [],
          };
          setSelectedProvider(normalizedProvider);
          setNetworkId(id);
          console.log("Initialized provider:", normalizedProvider, "networkId:", id);
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
    // Log providerPlans for debugging
    if (selectedProvider) {
      console.log(`providerPlans for ${selectedProvider.name}:`, {
        count: providerPlans[selectedProvider.name]?.length || 0,
        sample: providerPlans[selectedProvider.name]?.slice(0, 5).map((p: DataBundle) => ({
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
      plans = []; // DataBundleList fetches Hot plans from Supabase
    } else {
      plans = (providerPlans[selectedProvider.name] || [])
        .filter((plan: DataBundle) => {
          const categoryMatch = plan.category === activeCategory;
          const searchMatch = searchTerm
            ? plan.data.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (plan.description?.toLowerCase()?.includes(searchTerm.toLowerCase()) || false)
            : true;
          return categoryMatch && searchMatch;
        });

      if (plans.length === 0) {
        fetchData();
      }
    }
    
    return plans;
  }, [selectedProvider, providerPlans, activeCategory, searchTerm, fetchData]);

  const bundleCategories = useMemo(() => {
    if (!selectedProvider) return [];
    
    // Get all unique categories from allBundles that have at least one plan
    const categoriesWithPlans = Array.from(
      new Set(
        allBundles
          .map((bundle: DataBundle) => bundle.category)
      )
    ).filter(category => {
      // Filter out categories that have no plans
      return allBundles.some(bundle => bundle.category === category);
    });

    // Include "Hot" if provider has Hot plans in Supabase
    const hasHotPlans = ["MTN", "AIRTEL", "GLO", "9MOBILE"].includes(selectedProvider.name.toUpperCase());
    if (hasHotPlans && !categoriesWithPlans.includes("Hot")) {
      categoriesWithPlans.push("Hot");
    }

    // Sort categories in a specific order
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
      "STANDARD"
    ].filter(category => categoriesWithPlans.includes(category));

    console.log("Filtered and Ordered Bundle Categories:", orderedCategories);
    return orderedCategories;
  }, [allBundles, selectedProvider]);

  const availablePlanTypes = useMemo(() => {
    const planTypes = [...new Set(
      allBundles
        .filter(bundle => bundle.category === activeCategory)
        .map(bundle => bundle.planType.toUpperCase())
    )];
    console.log(`Available PlanTypes for ${activeCategory}:`, planTypes);
    return planTypes;
  }, [allBundles, activeCategory]);

  const categoryPlanTypes = useMemo(() => {
    const planTypes = [...new Set(
      dataBundles
        .filter((bundle) => bundle.category === activeCategory)
        .map((bundle) => bundle.planType.toUpperCase())
    )];
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

    const types = [...new Set(
      dataBundles
        .filter(bundle => bundle.category === activeCategory)
        .map(bundle => bundle.planType.toUpperCase())
    )];

    console.log("Computed planTypeOptions:", types);
    return types;
  }, [dataBundles, activeCategory]);

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
      purchaseType: 'data', // Log to confirm purchaseType
    });

    if (!selectedBundle) return Alert.alert("Error", "No plan selected");
    if (!selectedProvider) return Alert.alert("Error", "No provider selected");
    if (!networkId) return Alert.alert("Error", "Network ID missing");
    if (!phoneNumberInput || phoneNumberInput.length !== 11 || !/^\d{11}$/.test(phoneNumberInput)) {
      return Alert.alert("Error", "Enter a valid 11-digit phone number");
    }
    if (!hasPin) {
      setIsPinCreationModalOpen(true);
      return Alert.alert("Error", "Create a transaction PIN");
    }
    if (!transactionPinInput || transactionPinInput.length < 4 || transactionPinInput.length > 6 || !/^\d+$/.test(transactionPinInput)) {
      return Alert.alert("Error", "Enter a 4-6 digit PIN");
    }
    if (!userEmail) return Alert.alert("Error", "User authentication missing");
    if (walletBalance === null) return Alert.alert("Error", "Wallet balance not loaded");
    if (selectedBundle.price > walletBalance) {
      return Alert.alert(
        "Error",
        `Insufficient balance: ₦${formatNumberWithCommas(selectedBundle.price)} needed, ₦${formatNumberWithCommas(walletBalance)} available`
      );
    }

    if (activeCategory === "Hot" && detectedNetwork && detectedNetwork.toUpperCase() !== selectedBundle.planType.toUpperCase()) {
      return Alert.alert(
        "Error",
        `Phone number does not match the required network (${selectedBundle.planType}). Please use a ${selectedBundle.planType} number.`
      );
    } else if (activeCategory !== "Hot" && detectedNetwork && detectedNetwork.toUpperCase() !== selectedProvider.name.toUpperCase()) {
      return Alert.alert(
        "Error",
        `Phone number does not match provider (${selectedProvider.name})`
      );
    }

    setIsLoading(true);
    try {
      const { data: profileData, error: pinError } = await supabase
        .from("profiles")
        .select("transaction_pin")
        .eq("email", userEmail)
        .single();
      if (pinError) {
        if (pinError.code === "PGRST116") {
          setIsPinCreationModalOpen(true);
          Alert.alert("Error", "Profile not found. Create a PIN");
        } else {
          Alert.alert("Error", "PIN verification failed");
        }
        return;
      }

      if (!profileData || !profileData.transaction_pin) {
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
          '9MOBILE': 4,
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
          purchaseType: 'data', // Explicitly set purchaseType for data purchases
        },
      });
      console.log('Navigating to ConfirmationScreen with params:', {
        bundle: selectedBundle,
        provider: selectedProvider,
        phoneNumber: phoneNumberInput,
        transactionPin: '****',
        userEmail,
        referenceId: reference,
        balance: walletBalance,
        networkId: finalNetworkId,
        planId: selectedBundle.id,
        purchaseType: 'data',
      });
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
        return Alert.alert("Error", "PIN must be 4-6 digits");
      }
      if (newPin !== confirmPin) {
        return Alert.alert("Error", "PINs do not match");
      }
      if (!userEmail) {
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

  const retryLoad = useCallback(() => {
    setIsLoading(true);
    fetchData().finally(() => setIsLoading(false));
  }, [fetchData]);

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