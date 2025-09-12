import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  StyleSheet,
  TextInput,
  Alert,
  Animated,
  PanResponder,
  Modal,
  Dimensions,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Switch,
} from "react-native";

import { supabase } from "@/config/supabase";

// Get screen dimensions for responsive design
const { width, height } = Dimensions.get("window");
const scaleFont = (size: number) => (width / 375) * size;
const scaleSize = (size: number) => (width / 375) * size;

// Define interfaces
interface Provider {
  id: number;
  name: string;
  image: string;
  code: string;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  duration: string;
}

interface TransactionResult {
  id: string;
  provider: string;
  data: string;
  price: string;
  date: string;
  status: string;
  smartCardNumber: string;
  reference: string;
  metadata: string;
}

// Cable TV providers (static)
const PROVIDER_IMAGES: { [key: string]: string } = {
  DSTV: "https://cdn.brandfetch.io/idBvCNxfgy/w/800/h/494/theme/dark/logo.webp?c=1bxideym1bCk82mxFsjUw",
  GOTV: "https://cdn.brandfetch.io/idWUs_RbuC/w/820/h/154/theme/dark/logo.png?c=1bxideym1bCk82mxFsjUw",
  STARTIMES:
    "https://cdn.brandfetch.io/idcUkVgdCp/w/225/h/225/theme/dark/icon.jpeg?c=1bxideym1bCk82mxFsjUw",
};

const PROVIDER_CONFIG: {
  [key: string]: {
    code: string;
    lizzyCableId: number;
  };
} = {
  GOTV: {
    code: "gotv",
    lizzyCableId: 1, // Corrected based on documentation
  },
  DSTV: {
    code: "dstv",
    lizzyCableId: 2, // Corrected based on documentation
  },
  STARTIMES: {
    code: "startimes",
    lizzyCableId: 3,
  },
};

const PROVIDERS: Provider[] = [
  {
    id: 1,
    name: "GOTV",
    image: PROVIDER_IMAGES.GOTV,
    code: PROVIDER_CONFIG.GOTV.code,
  },
  {
    id: 2,
    name: "DSTV",
    image: PROVIDER_IMAGES.DSTV,
    code: PROVIDER_CONFIG.DSTV.code,
  },
  {
    id: 3,
    name: "STARTIMES",
    image: PROVIDER_IMAGES.STARTIMES,
    code: PROVIDER_CONFIG.STARTIMES.code,
  },
];

// Function to clean plan name by removing price and duration suffixes
const cleanPlanName = (name: string): string => {
  return name
    .replace(/\s*\d+(?:,\d+)*\s*$/, "") // Remove trailing price
    .replace(/\s*-\s*(1\s*Month|monthly)/i, "") // Remove duration suffixes
    .trim();
};

const CableTV: React.FC = () => {
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [smartCardNumber, setSmartCardNumber] = useState<string>("");
  const [isSmartCardValid, setIsSmartCardValid] = useState<boolean>(false);
  const [bypassVerification, setBypassVerification] = useState<boolean>(false);
  const [iucOwnerName, setIucOwnerName] = useState<string | null>(null);
  const [iucVerificationError, setIucVerificationError] = useState<string | null>(null);
  const [isValidatingIuc, setIsValidatingIuc] = useState<boolean>(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [transactionPin, setTransactionPin] = useState<string>("");
  const [balance, setBalance] = useState<number>(0);
  const [userEmail, setUserEmail] = useState<string>("");
  const [userToken, setUserToken] = useState<string>("");
  const [referenceId, setReferenceId] = useState<string>("");
  const [transactionModalVisible, setTransactionModalVisible] = useState<boolean>(false);
  const [transactionStatus, setTransactionStatus] = useState<"processing" | "success" | "failed">("processing");
  const [transactionResult, setTransactionResult] = useState<TransactionResult | null>(null);
  const [plans, setPlans] = useState<{ [key: string]: SubscriptionPlan[] }>({
    GOTV: [],
    DSTV: [],
    STARTIMES: [],
  });
  const [loadingPlans, setLoadingPlans] = useState<boolean>(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const smartCardInputRef = useRef<TextInput>(null);
  const transactionPinInputRef = useRef<TextInput>(null);
  const [focusedInput, setFocusedInput] = useState<"smartCard" | "transactionPin" | null>(null);

  // Animation for slide to pay
  const slideAnim = useRef(new Animated.Value(0)).current;
  const slideWidth = width - scaleSize(24);
  const maxSlideDistance = slideWidth * 0.6;

  // Animation for screen fade-in
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Pulse animation for slide to pay text
  const slidePulseAnim = useRef(new Animated.Value(0.7)).current;

  // Pulse animations for plan cards (odd indices)
  const pulseAnims = useRef<Animated.Value[]>([]).current;

  // Check if slide to pay should be enabled
  const isSlideEnabled =
    selectedProvider &&
    (bypassVerification || isSmartCardValid) &&
    selectedPlan &&
    transactionPin.length >= 4 &&
    transactionPin.length <= 6;

  // Pan responder for slide to pay
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          isSlideEnabled &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) &&
          Math.abs(gestureState.dx) > 2,
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dx >= 0 && gestureState.dx <= maxSlideDistance) {
            slideAnim.setValue(gestureState.dx);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx > maxSlideDistance * 0.5 && isSlideEnabled) {
            handlePurchase();
          }
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        },
      }),
    [
      isSlideEnabled,
      selectedProvider,
      bypassVerification,
      isSmartCardValid,
      selectedPlan,
      transactionPin,
      maxSlideDistance,
      slideAnim,
    ]
  );

  // Screen fade-in animation
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  // Slide to pay pulse animation
  useEffect(() => {
    if (isSlideEnabled) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(slidePulseAnim, {
            toValue: 1,
            duration: 750,
            useNativeDriver: true,
          }),
          Animated.timing(slidePulseAnim, {
            toValue: 0.7,
            duration: 750,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      slidePulseAnim.setValue(0.7);
    }
  }, [isSlideEnabled]);

  // Handle keyboard visibility without custom scrolling to prevent over-scrolling
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      },
    );

    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardHeight(0);
        setFocusedInput(null);
      },
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user || !user.email) {
          throw new Error("User not authenticated");
        }
        setUserEmail(user.email);

        const { data: wallet, error: walletError } = await supabase
          .from("wallet")
          .select("balance")
          .eq("user_email", user.email)
          .single();

        if (walletError && walletError.code !== "PGRST116") {
          throw walletError;
        }
        setBalance(wallet?.balance || 0);

        const newReferenceId = `EDGES_CABLE_${user.id}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        setReferenceId(newReferenceId);
      } catch (error) {
        console.error("Error fetching user data:", error);
        Alert.alert("Error", "Failed to load user data. Please try again.");
      }
    };
    fetchUserData();
  }, []);

  // Fetch subscription plans from Supabase when provider is selected
  useEffect(() => {
    const fetchPlans = async () => {
      if (!selectedProvider) return;
      setLoadingPlans(true);
      try {
        const { data, error } = await supabase
          .from("cable_plans")
          .select("cableplan_id, name, price, duration")
          .eq("provider", selectedProvider.name)
          .order("price", { ascending: true });

        if (error) {
          throw new Error(`Failed to fetch plans from Supabase: ${error.message}`);
        }

        const mappedPlans: { [key: string]: SubscriptionPlan[] } = {
          DSTV: [],
          GOTV: [],
          STARTIMES: [],
        };

        mappedPlans[selectedProvider.name] = data.map((plan: any) => ({
          id: plan.cableplan_id,
          name: plan.name,
          price: parseFloat(plan.price),
          duration: plan.duration,
        }));

        setPlans(mappedPlans);

        pulseAnims.length = 0;
        mappedPlans[selectedProvider.name].forEach((_, index) => {
          if (index % 2 === 0) {
            const anim = new Animated.Value(1);
            pulseAnims[index] = anim;
            Animated.loop(
              Animated.sequence([
                Animated.timing(anim, {
                  toValue: 1.05,
                  duration: 1000,
                  useNativeDriver: true,
                }),
                Animated.timing(anim, {
                  toValue: 1,
                  duration: 1000,
                  useNativeDriver: true,
                }),
              ]),
            ).start();
          }
        });
      } catch (error) {
        console.error("Error fetching plans:", error);
        Alert.alert("Error", "Failed to load subscription plans. Please try again.");
      } finally {
        setLoadingPlans(false);
      }
    };
    fetchPlans();
  }, [selectedProvider]);

  // Validate smart card number (local validation - only check length and digits)
  const validateSmartCardNumber = (
    card: string,
    provider: Provider | null,
  ): boolean => {
    if (bypassVerification) return true;
    if (!card || card.length !== 10 || !/^\d{10}$/.test(card)) {
      return false;
    }
    return !!provider; // Ensure provider is selected
  };

const verifyIucNumber = async (card: string, provider: Provider | null) => {
  if (bypassVerification || !provider || !validateSmartCardNumber(card, provider)) {
    setIucOwnerName(null);
    setIucVerificationError(null);
    return;
  }

  setIsValidatingIuc(true);
  setIucOwnerName(null);
  setIucVerificationError(null);

  try {
		// console.log("Validating IUC...");
		// console.log("Card Number:", card);
		// console.log("Provider:", provider?.name);
		// console.log("Lizzy Cable ID:", PROVIDER_CONFIG[provider.name].lizzyCableId);

		// ✅ Get Supabase session for Bearer token
		// ✅ Get Supabase session for Bearer token
		const { data: sessionData, error: sessionError } =
			await supabase.auth.getSession();
		if (sessionError || !sessionData.session) {
			throw new Error("User not authenticated. Please log in again.");
		}
		const accessToken = sessionData.session.access_token;

		const apiUrl = `https://jjyyfaxcwanrmiipzkoj.supabase.co/functions/v1/cable-validation?iuc=${card}&cable=${PROVIDER_CONFIG[provider.name].lizzyCableId}`;

		const response = await fetch(apiUrl, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		const rawText = await response.text();
		// console.log("Raw response text:", rawText);

		let data: any = {};
		try {
			data = JSON.parse(rawText);
		} catch (err) {
			console.error("Failed to parse JSON:", err);
		}

		// console.log("Response status:", response.status);
		// console.log("Parsed response:", data);

		if (response.ok && data.status?.toLowerCase() === "success" && data.name) {
			setIucOwnerName(data.name);
			setIucVerificationError(null);
		} else {
			setIucOwnerName(null);
			setIucVerificationError(
				data.message || `Validation failed (HTTP ${response.status})`,
			);
		}
	} catch (error) {
    console.error("IUC verification error:", error);
    setIucOwnerName(null);
    setIucVerificationError("Failed to verify IUC number. Please try again.");
  } finally {
    setIsValidatingIuc(false);
  }
};


  // Update smart card validity and trigger verification
  useEffect(() => {
    setIsSmartCardValid(
      validateSmartCardNumber(smartCardNumber, selectedProvider),
    );
    if (smartCardNumber && selectedProvider && smartCardNumber.length === 10) {
      verifyIucNumber(smartCardNumber, selectedProvider);
    } else {
      setIucOwnerName(null);
      setIucVerificationError(null);
      setIsValidatingIuc(false);
    }
  }, [smartCardNumber, selectedProvider, bypassVerification]);

  // Handle provider selection
  const handleSelectProvider = (provider: Provider) => {
    setSelectedProvider(provider);
    setSelectedPlan(null);
    setSmartCardNumber("");
    setIsSmartCardValid(false);
    setIucOwnerName(null);
    setIucVerificationError(null);
    setBypassVerification(false);
  };

  // Handle plan selection
  const selectPlan = (plan: SubscriptionPlan) => {
    if (selectedPlan?.id === plan.id) {
      setSelectedPlan(null);
    } else {
      setSelectedPlan(plan);
    }
  };

  // Handle bypass toggle
  const toggleBypass = () => {
    setBypassVerification((prev) => !prev);
    setIucOwnerName(null);
    setIucVerificationError(null);
    if (!bypassVerification) {
      setSmartCardNumber("");
    }
  };

  // Reset form after successful transaction
  const resetForm = () => {
    setSelectedProvider(null);
    setSmartCardNumber("");
    setIsSmartCardValid(false);
    setIucOwnerName(null);
    setIucVerificationError(null);
    setBypassVerification(false);
    setSelectedPlan(null);
    setTransactionPin("");
    setReferenceId(
      `EDGES_CABLE_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    );
  };

  // Handle purchase with correct API payload structure
  const handlePurchase = async () => {
    if (!selectedProvider) {
      Alert.alert("Error", "Please select a provider.");
      setTransactionModalVisible(true);
      setTransactionStatus("failed");
      return;
    }
    if (!bypassVerification && !isSmartCardValid) {
      Alert.alert(
        "Error",
        `Please enter a valid 10-digit smart card number for ${selectedProvider.name}.`,
      );
      setTransactionModalVisible(true);
      setTransactionStatus("failed");
      return;
    }
    if (!bypassVerification && !iucOwnerName) {
      Alert.alert(
        "Error",
        "IUC verification failed. Please ensure the smart card number is valid or enable bypass verification.",
      );
      setTransactionModalVisible(true);
      setTransactionStatus("failed");
      return;
    }
    if (!selectedPlan) {
      Alert.alert("Error", "Please select a subscription plan.");
      setTransactionModalVisible(true);
      setTransactionStatus("failed");
      return;
    }
    if (
      !transactionPin ||
      transactionPin.length < 4 ||
      transactionPin.length > 6
    ) {
      Alert.alert(
        "Error",
        "Please enter a valid transaction PIN (4-6 digits).",
      );
      setTransactionModalVisible(true);
      setTransactionStatus("failed");
      return;
    }
    if (balance < selectedPlan.price) {
      // Alert.alert("Error", "Insufficient balance. Please fund your wallet.");
      setTransactionModalVisible(true);
      setTransactionStatus("failed");
      return;
    }

    try {
      const { data: userData, error: pinError } = await supabase
        .from("profiles")
        .select("transaction_pin")
        .eq("email", userEmail)
        .single();

      if (
        pinError ||
        !userData ||
        userData.transaction_pin !== transactionPin
      ) {
        Alert.alert("Error", "Invalid transaction PIN.");
        setTransactionStatus("failed");
        setTransactionModalVisible(true);
        return;
      }
    } catch (error) {
      console.error("PIN verification error:", error);
      Alert.alert("Error", "Failed to verify transaction PIN. Please try again.");
      setTransactionStatus("failed");
      setTransactionModalVisible(true);
      return;
    }

    setTransactionModalVisible(true);
    setTransactionStatus("processing");

    try {
      const apiUrl = "https://lizzysub.com/api/cable";
      
      // Updated payload structure based on network details
      const requestBody = {
        cable: PROVIDER_CONFIG[selectedProvider.name].lizzyCableId.toString(),
        iuc: bypassVerification ? "0000000000" : smartCardNumber,
        cable_plan: selectedPlan.id,
        bypass: bypassVerification,
        pin: transactionPin,
        token: userToken,
      };

      // console.log("Purchase request payload:", requestBody);

      const purchaseResponse = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:
            "Token b5b39c2645893a318c432507d00a91270f39bd987e5fcc904dc72276a00c",
        },
        body: JSON.stringify(requestBody),
      });

      const responseData = await purchaseResponse.json();
      // console.log("Purchase response:", responseData);

      if (!purchaseResponse.ok) {
        throw new Error(`HTTP error! Status: ${purchaseResponse.status}, Message: ${responseData.message || "Unknown error"}`);
      }

      const transactionData = {
        user_email: userEmail,
        amount: -selectedPlan.price,
        reference: referenceId,
        status: "pending",
        metadata: {
          purchase: `Cable TV ${selectedPlan.name} on ${selectedProvider.name}`,
          smart_card_number: bypassVerification ? "N/A" : smartCardNumber,
          validity: selectedPlan.duration,
          type: "cable_tv",
          bypass: bypassVerification,
          customer_name: bypassVerification ? "N/A" : iucOwnerName,
          custom_fields: [
            {
              display_name: "Cable TV Payment",
              variable_name: "cable_tv_payment",
              value: "Lizzysub",
            },
          ],
        },
      };

      const { data: pendingTx, error: pendingTxError } = await supabase
        .from("transactions")
        .insert(transactionData)
        .select("id, created_at")
        .single();

      if (pendingTxError) {
        throw new Error(`Failed to record pending transaction: ${pendingTxError.message}`);
      }

      if (responseData.status !== "success") {
        await supabase
          .from("transactions")
          .update({ status: "failed" })
          .eq("id", pendingTx.id);
        setTransactionStatus("failed");
        setTransactionResult({
          id: pendingTx.id,
          provider: selectedProvider.name,
          data: `Cable TV ${selectedPlan.name}`,
          price: selectedPlan.price.toString(),
          date: new Date().toISOString(),
          status: "Failed",
          smartCardNumber: bypassVerification ? "N/A" : smartCardNumber,
          reference: referenceId,
          metadata: JSON.stringify({
            validity: selectedPlan.duration,
            payment_method: "Wallet",
            type: "cable_tv",
            bypass: bypassVerification,
            customer_name: bypassVerification ? "N/A" : iucOwnerName,
            error: responseData.message || "Unknown error",
          }),
        });
        Alert.alert("Error", responseData.message || "Cable TV subscription failed. Please try again.");
        return;
      }

      const newBalance = balance - selectedPlan.price;
      const { error: walletUpdateError } = await supabase
        .from("wallet")
        .update({ balance: newBalance })
        .eq("user_email", userEmail);

      if (walletUpdateError) {
        await supabase
          .from("transactions")
          .update({ status: "failed" })
          .eq("id", pendingTx.id);
        throw new Error(`Failed to update wallet balance: ${walletUpdateError.message}`);
      }

      const { error: successUpdateError } = await supabase
        .from("transactions")
        .update({ status: "success" })
        .eq("id", pendingTx.id);

      if (successUpdateError) {
        throw new Error(`Failed to update transaction status: ${successUpdateError.message}`);
      }

      setBalance(newBalance);
      setTransactionStatus("success");
      setTransactionResult({
        id: pendingTx.id,
        provider: responseData.cable_name || selectedProvider.name,
        data: `Cable TV ${responseData.plan_name || selectedPlan.name}`,
        price: responseData.amount || selectedPlan.price.toString(),
        date: new Date().toISOString(),
        status: "Success",
        smartCardNumber: bypassVerification ? "N/A" : (responseData.iuc || smartCardNumber),
        reference: responseData["request-id"] || referenceId,
        metadata: JSON.stringify({
          validity: selectedPlan.duration,
          payment_method: "Wallet",
          type: "cable_tv",
          bypass: bypassVerification,
          customer_name: bypassVerification ? "N/A" : iucOwnerName,
          old_balance: responseData.oldbal || balance,
          new_balance: responseData.newbal || newBalance,
          system: responseData.system || "API",
          wallet_vending: responseData.wallet_vending || "wallet",
        }),
      });
      resetForm();
    } catch (error: any) {
      // console.error("Purchase error:", error);
      setTransactionStatus("failed");
      setTransactionResult({
        id: "N/A",
        provider: selectedProvider?.name || "Unknown",
        data: `Cable TV ${selectedPlan?.name || "Unknown"}`,
        price: (selectedPlan?.price || 0).toString(),
        date: new Date().toISOString(),
        status: "Failed",
        smartCardNumber: bypassVerification ? "N/A" : smartCardNumber,
        reference: referenceId,
        metadata: JSON.stringify({
          validity: selectedPlan?.duration || "N/A",
          payment_method: "Wallet",
          type: "cable_tv",
          bypass: bypassVerification,
          customer_name: bypassVerification ? "N/A" : iucOwnerName,
          error: error.message || "Unknown error",
        }),
      });
      Alert.alert("Error", error.message || "Failed to process payment. Please try again.");
    }
  };

  // Close transaction modal
  const closeTransactionModal = () => {
    setTransactionModalVisible(false);
    setTransactionResult(null);
  };

  // Format number with commas
  const formatNumberWithCommas = (number: number | null): string => {
    if (number === null) return "0";
    return number.toLocaleString();
  };

  return (
    <Animated.View style={[styles.rootContainer, { opacity: fadeAnim }]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollContainer}
          contentContainerStyle={[
            styles.innerContainer,
            { paddingBottom: scaleSize(20) },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.sectionTitle, { marginTop: scaleSize(12) }]}>
            Select Cable TV Provider
          </Text>
          <View style={styles.providerScroll}>
            {PROVIDERS.map((provider) => (
              <Pressable
                key={provider.id}
                onPress={() => handleSelectProvider(provider)}
                style={[
                  styles.providerCard,
                  selectedProvider?.id === provider.id &&
                    styles.providerCardSelected,
                ]}
              >
                <View style={styles.providerLogoContainer}>
                  <Image
                    source={{ uri: provider.image }}
                    style={styles.providerLogo}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.providerName}>{provider.name}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Smart Card Number</Text>
            <TextInput
              ref={smartCardInputRef}
              style={[
                styles.input,
                smartCardNumber && isSmartCardValid && !iucVerificationError && styles.inputValid,
                smartCardNumber && (!isSmartCardValid || iucVerificationError) && styles.inputInvalid,
                bypassVerification && styles.inputBypassed,
              ]}
              value={smartCardNumber}
              onChangeText={setSmartCardNumber}
              placeholder="Enter 10-digit smart card number"
              placeholderTextColor="#B0B0B0"
              keyboardType="numeric"
              maxLength={10}
              editable={true}
              onFocus={() => setFocusedInput("smartCard")}
              onBlur={() => setFocusedInput(null)}
            />
            {isValidatingIuc && (
              <Text style={styles.validatingText}>
                Validating IUC...
              </Text>
            )}
            {iucOwnerName && !bypassVerification && (
              <Text style={styles.iucOwnerText}>
                Owner: {iucOwnerName}
              </Text>
            )}
            {iucVerificationError && !bypassVerification && (
              <Text style={styles.iucErrorText}>
                {iucVerificationError}
              </Text>
            )}
          </View>

          <View style={styles.bypassContainer}>
            <Text style={styles.bypassLabel}>Bypass IUC Verification</Text>
            <Switch
              value={bypassVerification}
              onValueChange={toggleBypass}
              trackColor={{ false: "#2A2A2C", true: "#FFD700" }}
              thumbColor={bypassVerification ? "#FFFFFF" : "#B0B0B0"}
            />
          </View>

          {selectedProvider && (
            <>
              <Text style={styles.sectionTitle}>Select Subscription Plan</Text>
              {loadingPlans ? (
                <Text style={styles.loadingText}>Loading plans...</Text>
              ) : plans[selectedProvider.name]?.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.planScroll}
                >
                  {plans[selectedProvider.name].map((plan, index) => (
                    <Animated.View
                      key={plan.id}
                      style={[
                        styles.amountButton,
                        selectedPlan?.id === plan.id &&
                          styles.amountButtonSelected,
                        index % 2 === 0 &&
                          !selectedPlan && {
                            transform: [{ scale: pulseAnims[index] || 1 }],
                          },
                      ]}
                    >
                      <Pressable onPress={() => selectPlan(plan)}>
                        <Text
                          style={[
                            styles.amountText,
                            selectedPlan?.id === plan.id &&
                              styles.amountTextSelected,
                          ]}
                          numberOfLines={2}
                          ellipsizeMode="tail"
                        >
                          {cleanPlanName(plan.name)}
                        </Text>
                        <Text
                          style={[
                            styles.amountPrice,
                            selectedPlan?.id === plan.id &&
                              styles.amountTextSelected,
                          ]}
                        >
                          ₦{plan.price.toLocaleString()}
                        </Text>
                        <Text style={styles.planDuration}>{plan.duration}</Text>
                      </Pressable>
                    </Animated.View>
                  ))}
                </ScrollView>
              ) : (
                <Text style={styles.noPlansText}>
                  No plans available for this provider.
                </Text>
              )}
            </>
          )}

          <View style={styles.discountBar}>
            <Text style={styles.discountLabel}>Amount to Pay</Text>
            <Text style={styles.discountValue}>
              ₦{formatNumberWithCommas(selectedPlan?.price || null)}
            </Text>
          </View>

          <View style={styles.transactionPinContainer}>
            <Text style={styles.transactionPinLabel}>Transaction PIN</Text>
            <TextInput
              ref={transactionPinInputRef}
              style={[
                styles.input,
                styles.transactionPinInput,
                transactionPin && styles.inputValid,
              ]}
              value={transactionPin}
              onChangeText={setTransactionPin}
              placeholder="Enter PIN"
              placeholderTextColor="#B0B0B0"
              keyboardType="numeric"
              maxLength={6}
              secureTextEntry
              onFocus={() => setFocusedInput("transactionPin")}
              onBlur={() => setFocusedInput(null)}
            />
          </View>

          <Animated.View
            style={[
              styles.slideTextWrapper,
              { opacity: isSlideEnabled ? slidePulseAnim : 0.7 },
              { transform: [{ translateX: slideAnim }] },
            ]}
            {...panResponder.panHandlers}
          >
            <Text
              style={[
                styles.slideText,
                isSlideEnabled && styles.slideTextEnabled,
              ]}
            >
              Slide to Pay
            </Text>
            <Text
              style={[styles.arrow, isSlideEnabled && styles.slideTextEnabled]}
            >
              →
            </Text>
          </Animated.View>

          <View style={styles.footerContainer}>
            <Text style={styles.footerTitle}>
              Customer Care for Cable Issues
            </Text>
            <Text style={styles.footerText}>
              Contact DSTV/GOtv customer care on 01-2703232, 08039003788, or
              toll-free lines: 08149860333, 07080630333, 09090630333.
            </Text>
            <Text style={styles.footerText}>
              Contact STARTIMES customer care on 094618888, 014618888.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={transactionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeTransactionModal}
      >
        <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
          <View style={styles.modalContainer}>
            {transactionStatus === "processing" ? (
              <>
                <Text style={styles.modalTitle}>Processing Transaction</Text>
                <Text style={styles.modalMessage}>
                  Please wait while we process your payment...
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>
                  Transaction{" "}
                  {transactionStatus === "success" ? "Successful" : "Failed"}
                </Text>
                {transactionResult && (
                  <View style={styles.transactionDetails}>
                    <Text style={styles.detailText}>
                      Provider: {transactionResult.provider}
                    </Text>
                    <Text style={styles.detailText}>
                      Plan: {transactionResult.data}
                    </Text>
                    <Text style={styles.detailText}>
                      Price: ₦{transactionResult.price}
                    </Text>
                    <Text style={styles.detailText}>
                      Smart Card Number: {transactionResult.smartCardNumber}
                    </Text>
                    <Text style={styles.detailText}>
                      Reference: {transactionResult.reference}
                    </Text>
                    <Text style={styles.detailText}>
                      Date: {new Date(transactionResult.date).toLocaleString()}
                    </Text>
                    <Text style={styles.detailText}>
                      Status: {transactionResult.status}
                    </Text>
                    {transactionResult.metadata &&
                      JSON.parse(transactionResult.metadata).customer_name && (
                        <Text style={styles.detailText}>
                          Customer Name: {JSON.parse(transactionResult.metadata).customer_name}
                        </Text>
                      )}
                  </View>
                )}
                <Pressable
                  style={styles.closeButton}
                  onPress={closeTransactionModal}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </Pressable>
              </>
            )}
          </View>
        </Animated.View>
      </Modal>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },
  innerContainer: {
    paddingHorizontal: scaleSize(16),
    flexGrow: 1,
    backgroundColor: "#000000",
  },
  sectionTitle: {
    fontSize: scaleFont(18),
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: scaleSize(12),
  },
  providerScroll: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: scaleSize(16),
  },
  providerCard: {
    alignItems: "center",
    backgroundColor: "#1C1C1E",
    borderRadius: scaleSize(12),
    padding: scaleSize(8),
    width: scaleSize(80),
    height: scaleSize(80),
    marginBottom: scaleSize(12),
    justifyContent: "center",
    shadowColor: "#d7a77f",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
    elevation: 4,
  },
  providerCardSelected: {
    borderColor: "#D7A77F",
    borderWidth: 2,
    backgroundColor: "#2A2A2C",
    transform: [{ scale: 1.05 }],
  },
  providerLogoContainer: {
    width: scaleSize(40),
    height: scaleSize(40),
    borderRadius: scaleSize(20),
    borderColor: "#D7A77F",
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginBottom: scaleSize(4),
  },
  providerLogo: {
    width: scaleSize(32),
    height: scaleSize(32),
  },
  providerName: {
    fontSize: scaleFont(10),
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
  },
  inputContainer: {
    marginBottom: scaleSize(16),
  },
  inputLabel: {
    fontSize: scaleFont(14),
    fontWeight: "500",
    color: "#B0B0B0",
    marginBottom: scaleSize(8),
  },
  input: {
    backgroundColor: "#1C1C1E",
    borderRadius: scaleSize(8),
    padding: scaleSize(12),
    fontSize: scaleFont(14),
    color: "#FFFFFF",
    width: "100%",
    borderColor: "#2A2A2C",
    borderWidth: 1,
  },
  inputValid: {
    borderColor: "#FFD700",
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  inputInvalid: {
    borderColor: "#FF0000",
    shadowColor: "#FF0000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  inputBypassed: {
    backgroundColor: "#2A2A2C",
    borderColor: "#B0B0B0",
  },
  validatingText: {
    fontSize: scaleFont(12),
    fontWeight: "500",
    color: "#FFD700",
    marginTop: scaleSize(4),
  },
  iucOwnerText: {
    fontSize: scaleFont(12),
    fontWeight: "500",
    color: "#FFD700",
    marginTop: scaleSize(4),
  },
  iucErrorText: {
    fontSize: scaleFont(12),
    fontWeight: "500",
    color: "#FF0000",
    marginTop: scaleSize(4),
  },
  bypassContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: scaleSize(24),
  },
  bypassLabel: {
    fontSize: scaleFont(14),
    fontWeight: "500",
    color: "#B0B0B0",
  },
  transactionPinContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: scaleSize(24),
  },
  transactionPinLabel: {
    fontSize: scaleFont(14),
    fontWeight: "500",
    color: "#B0B0B0",
  },
  transactionPinInput: {
    width: scaleSize(140),
    padding: scaleSize(8),
  },
  planScroll: {
    paddingVertical: scaleSize(8),
    paddingRight: scaleSize(16),
    marginBottom: scaleSize(24),
  },
  amountButton: {
    backgroundColor: "#1C1C1E",
    borderRadius: scaleSize(10),
    paddingVertical: scaleSize(10),
    paddingHorizontal: scaleSize(12),
    marginRight: scaleSize(12),
    width: scaleSize(120),
    height: scaleSize(65),
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#D7A77F",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    justifyContent: "center",
  },
  amountButtonSelected: {
    borderColor: "#FFD700",
    backgroundColor: "#2A2A2C",
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  amountText: {
    fontSize: scaleFont(11),
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: scaleFont(13),
  },
  amountPrice: {
    fontSize: scaleFont(12),
    fontWeight: "700",
    color: "#D7A77F",
    marginVertical: scaleSize(2),
    textAlign: "center",
  },
  amountTextSelected: {
    color: "#FFD700",
  },
  planDuration: {
    fontSize: scaleFont(9),
    fontWeight: "500",
    color: "#B0B0B0",
    lineHeight: scaleFont(11),
    textAlign: "center",
  },
  loadingText: {
    fontSize: scaleFont(14),
    fontWeight: "500",
    color: "#B0B0B0",
    textAlign: "center",
    marginVertical: scaleSize(16),
  },
  noPlansText: {
    fontSize: scaleFont(14),
    fontWeight: "500",
    color: "#B0B0B0",
    textAlign: "center",
    marginVertical: scaleSize(16),
  },
  discountBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#1C1C1E",
    borderRadius: scaleSize(8),
    padding: scaleSize(16),
    marginBottom: scaleSize(24),
    borderColor: "#DAA520",
    borderWidth: 1,
  },
  discountLabel: {
    fontSize: scaleFont(14),
    fontWeight: "500",
    color: "#B0B0B0",
  },
  discountValue: {
    fontSize: scaleFont(14),
    fontWeight: "700",
    color: "#FFD700",
  },
  slideTextWrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: scaleSize(12),
    marginBottom: scaleSize(32),
  },
  slideText: {
    fontSize: scaleFont(16),
    fontWeight: "700",
    color: "#3B82F6",
  },
  slideTextEnabled: {
    color: "#FFD700",
  },
  arrow: {
    fontSize: scaleFont(20),
    color: "#3B82F6",
    marginLeft: scaleSize(8),
  },
  footerContainer: {
    marginTop: scaleSize(32),
    opacity: 0.5,
  },
  footerTitle: {
    fontSize: scaleFont(16),
    fontWeight: "700",
    color: "#FFD700",
    marginBottom: scaleSize(8),
  },
  footerText: {
    fontSize: scaleFont(12),
    fontWeight: "500",
    color: "#B0B0B0",
    marginBottom: scaleSize(6),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#1C1C1E",
    borderRadius: scaleSize(12),
    padding: scaleSize(20),
    width: "90%",
    maxHeight: height * 0.8,
    borderColor: "#DAA520",
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: scaleFont(20),
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: scaleSize(16),
    textAlign: "center",
  },
  modalMessage: {
    fontSize: scaleFont(14),
    fontWeight: "500",
    color: "#B0B0B0",
    textAlign: "center",
    marginBottom: scaleSize(20),
  },
  transactionDetails: {
    marginBottom: scaleSize(20),
  },
  detailText: {
    fontSize: scaleFont(12),
    fontWeight: "500",
    color: "#FFFFFF",
    marginBottom: scaleSize(8),
  },
  closeButton: {
    backgroundColor: "#FFD700",
    borderRadius: scaleSize(8),
    paddingVertical: scaleSize(12),
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: scaleFont(16),
    fontWeight: "700",
    color: "#000000",
  },
});

export default CableTV;
