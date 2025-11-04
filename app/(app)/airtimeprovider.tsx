import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
  Animated,
  PanResponder,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/config/supabase";
import TransactionStatusModal from "@/components/homescreen/TransactionStatusModal";
import CreatePinModal from "@/components/homescreen/CreatePinModal";
import { NETWORK_IMAGES, DEFAULT_PROVIDER_IMAGE } from "@/constants/helper";
import { useRouter } from "expo-router";

// -----------------------------------------------------------------------------
// Separate Proxy URLs
const AIRTIME_PROXY_URL =
  "https://jjyyfaxcwanrmiipzkoj.supabase.co/functions/v1/airtime-proxy";


// -----------------------------------------------------------------------------
// Provider interface
interface Provider {
  id: number;
  name: string;
  image: any;
  code: string;
  networkId: number;
}

// Map provider names → network IDs (used by Lizzysub)
const PROVIDER_CONFIG: { [key: string]: { networkId: number } } = {
  MTN: { networkId: 1 },
  GLO: { networkId: 3 },
  AIRTEL: { networkId: 2 },
  "9MOBILE": { networkId: 4 },
};

// Predefined airtime amounts
const AIRTIME_AMOUNTS = [100, 200, 400, 500, 1000, 2000, 3000, 5000, 10000];

// -----------------------------------------------------------------------------
// Main component
const AirtimeProvider: React.FC = () => {
  const router = useRouter();

  // -------------------------------------------------------------------------
  // State
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [discountedPrice, setDiscountedPrice] = useState<number | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [referenceId, setReferenceId] = useState<string>("");
  const [transactionModalVisible, setTransactionModalVisible] = useState<boolean>(false);
  const [transactionStatus, setTransactionStatus] = useState<"processing" | "success" | "failed">("processing");
  const [isPinCreationModalOpen, setIsPinCreationModalOpen] = useState<boolean>(false);
  const [hasPin, setHasPin] = useState<boolean>(false);
  const [newPin, setNewPin] = useState<string>("");
  const [confirmPin, setConfirmPin] = useState<string>("");
  const [isNewPinVisible, setIsNewPinVisible] = useState<boolean>(false);
  const [isConfirmPinVisible, setIsConfirmPinVisible] = useState<boolean>(false);
  const [detectedNetwork, setDetectedNetwork] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [isBalanceLoading, setIsBalanceLoading] = useState<boolean>(true);
  const [isSlideEnabled, setIsSlideEnabled] = useState<boolean>(false);

  // -------------------------------------------------------------------------
  // Refs for gesture persistence
  const stateRef = useRef<{
    selectedProvider: Provider | null;
    phoneNumber: string;
    selectedAmount: number | null;
    discountedPrice: number | null;
  }>({
    selectedProvider: null,
    phoneNumber: "",
    selectedAmount: null,
    discountedPrice: null,
  });

  const gestureRef = useRef<{
    selectedProvider: Provider | null;
    phoneNumber: string;
    selectedAmount: number | null;
    discountedPrice: number | null;
  }>({
    selectedProvider: null,
    phoneNumber: "",
    selectedAmount: null,
    discountedPrice: null,
  });

  const slideAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  // -------------------------------------------------------------------------
  // Sync stateRef
  useEffect(() => {
    stateRef.current = {
      selectedProvider,
      phoneNumber,
      selectedAmount,
      discountedPrice,
    };
  }, [selectedProvider, phoneNumber, selectedAmount, discountedPrice]);

  // -------------------------------------------------------------------------
  // Slide-enable check
  const canSlideToPurchase = useCallback(() => {
    return (
      !!selectedProvider &&
      !!phoneNumber &&
      phoneNumber.length === 11 &&
      !!selectedAmount
    );
  }, [selectedProvider, phoneNumber, selectedAmount]);

  useEffect(() => {
    setIsSlideEnabled(canSlideToPurchase());
  }, [canSlideToPurchase]);

  // -------------------------------------------------------------------------
  // Fetch providers (static)
  const fetchProviders = async () => {
    try {
      const providerArray: Provider[] = Object.entries(PROVIDER_CONFIG).map(
        ([name, cfg]) => ({
          id: cfg.networkId,
          name,
          image: NETWORK_IMAGES[name] || DEFAULT_PROVIDER_IMAGE,
          code: name.toLowerCase(),
          networkId: cfg.networkId,
        })
      );
      setProviders(providerArray);
    } catch (error) {
      console.error("Provider fetch error:", error);
      Alert.alert("Error", "Could not load providers.");
      setProviders([]);
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // PIN helpers
  const verifyTransactionPin = useCallback(async (email: string) => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("No authenticated user");

      const { data, error } = await supabase
        .from("profiles")
        .select("transaction_pin")
        .eq("id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return !!data?.transaction_pin && data.transaction_pin !== "";
    } catch (error) {
      console.error("PIN Check Error:", error);
      Alert.alert("Error", "Unable to verify PIN. Please retry.");
      return false;
    }
  }, []);

  const createTransactionReference = async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user?.id) throw new Error("Authentication failed");
    return `Edges_Network_${user.id}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  };

  // -------------------------------------------------------------------------
  // User data + wallet subscription
  useEffect(() => {
    const init = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user?.email) throw new Error("User not authenticated");

        setUserEmail(user.email);

        // Wallet balance
        const { data: wallet, error: walletError } = await supabase
          .from("wallet")
          .select("balance")
          .eq("user_email", user.email)
          .single();

        if (walletError && walletError.code !== "PGRST116") throw walletError;
        setBalance(wallet?.balance || 0);
        setIsBalanceLoading(false);

        // PIN existence
        const pinExists = await verifyTransactionPin(user.email);
        setHasPin(pinExists);

        // Real-time wallet updates
        const subscription = supabase
          .channel(`wallet-updates:${user.email}`)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "wallet",
              filter: `user_email=eq.${user.email}`,
            },
            (payload) => setBalance(payload.new.balance ?? 0)
          )
          .subscribe();

        return () => supabase.removeChannel(subscription);
      } catch (error) {
        console.error("Init error:", error);
        Alert.alert("Error", "Failed to load user data");
        setIsBalanceLoading(false);
      }
    };

    init();
    fetchProviders();
  }, [verifyTransactionPin]);

  // -------------------------------------------------------------------------
  // Network detection from phone number
  const detectProviderFromNumber = (phone: string): string => {
    if (phone.length !== 11) return "";
    const prefix = phone.slice(0, 4);
    const mtn = ["0703","0706","0707","0704","07025","07026","0803","0806","0810","0813","0814","0816","0903","0906","0913","0916"];
    const glo = ["0805","0807","0705","0815","0811","0905","0915"];
    const airtel = ["0701","0708","0802","0808","0812","0901","0902","0904","0907","0912","0911"];
    const nine = ["0809","0817","0818","0909","0908"];

    if (mtn.includes(prefix)) return "MTN";
    if (glo.includes(prefix)) return "GLO";
    if (airtel.includes(prefix)) return "AIRTEL";
    if (nine.includes(prefix)) return "9MOBILE";
    return "";
  };

  useEffect(() => {
    if (phoneNumber.length === 11 && selectedProvider) {
      const provider = detectProviderFromNumber(phoneNumber);
      setDetectedNetwork(provider === selectedProvider.name ? provider : "");
      if (provider && provider !== selectedProvider.name) {
        Alert.alert(
          "Warning",
          `Phone number belongs to ${provider}, but ${selectedProvider.name} is selected.`
        );
      }
    } else {
      setDetectedNetwork("");
    }
  }, [phoneNumber, selectedProvider]);

  // -------------------------------------------------------------------------
  // Amount selection → discounted price
  const selectAmount = (amount: number) => {
    setSelectedAmount(amount);
    const sellingPrices: { [key: number]: number } = {
      100: 99,
      200: 198,
      500: 495,
      1000: 990,
    };
    const price = sellingPrices[amount] ?? amount * 0.99;
    setDiscountedPrice(price);
  };

  // -------------------------------------------------------------------------
  // Phone number validation
  const validatePhoneNumber = (phone: string, provider: Provider | null): boolean => {
    if (!phone || phone.length !== 11 || !/^\d{11}$/.test(phone)) return false;
    if (!provider) return false;
    const prefix = phone.slice(0, 4);
    const prefixes: { [key: string]: string[] } = {

   MTN:  ["0703","0706","0707","0704","07025","07026","0803","0806","0810","0813","0814","0816","0903","0906","0913","0916"],
     GLO:  ["0805","0807","0705","0815","0811","0905","0915"],
     AIRTEL:  ["0701","0708","0802","0808","0812","0901","0902","0904","0907","0912","0911"],
     "9MOBILE":  ["0809","0817","0818","0909","0908"],

    };
    return prefixes[provider.name]?.includes(prefix) ?? false;
  };

  // -------------------------------------------------------------------------
  // PanResponder
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => isSlideEnabled,
        onMoveShouldSetPanResponder: (_, g) =>
          isSlideEnabled && Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > 5,
        onPanResponderGrant: () => {
          gestureRef.current = { ...stateRef.current };
          scrollViewRef.current?.setNativeProps({ scrollEnabled: false });
        },
        onPanResponderMove: (_, g) => {
          if (g.dx > 0 && g.dx <= 200) slideAnim.setValue(g.dx);
        },
        onPanResponderRelease: async (_, g) => {
          scrollViewRef.current?.setNativeProps({ scrollEnabled: true });
          if (g.dx >= 100 && isSlideEnabled) await handlePurchase();
          Animated.spring(slideAnim, {
            toValue: 0,
            friction: 7,
            tension: 40,
            useNativeDriver: true,
          }).start();
        },
        onPanResponderTerminate: () => {
          scrollViewRef.current?.setNativeProps({ scrollEnabled: true });
          Animated.spring(slideAnim, {
            toValue: 0,
            friction: 7,
            tension: 40,
            useNativeDriver: true,
          }).start();
        },
      }),
    [isSlideEnabled]
  );

  // -------------------------------------------------------------------------
  // PURCHASE – AIRTIME via dedicated proxy
  const handlePurchase = async () => {
    const { selectedProvider, phoneNumber, selectedAmount, discountedPrice } =
      gestureRef.current;

    if (
      !selectedProvider ||
      !phoneNumber ||
      !selectedAmount ||
      !discountedPrice ||
      balance === null ||
      !userEmail
    ) {
      Alert.alert("Error", "Missing required information.");
      setTransactionModalVisible(true);
      setTransactionStatus("failed");
      return;
    }

    if (!validatePhoneNumber(phoneNumber, selectedProvider)) {
      Alert.alert("Error", `Invalid phone number for ${selectedProvider.name}.`);
      setTransactionModalVisible(true);
      setTransactionStatus("failed");
      return;
    }

    // PIN check
    const pinExists = await verifyTransactionPin(userEmail);
    if (!pinExists) {
      Alert.alert("Action Required", "Please create a transaction PIN.");
      setIsPinCreationModalOpen(true);
      return;
    }

    // Balance check
    if (balance < discountedPrice) {
      Alert.alert(
        "Error",
        `Insufficient balance. Required: ₦${formatNumberWithCommas(
          discountedPrice
        )}, Available: ₦${formatNumberWithCommas(balance)}`
      );
      setTransactionModalVisible(true);
      setTransactionStatus("failed");
      return;
    }

    // Network mismatch
    if (detectedNetwork && detectedNetwork !== selectedProvider.name) {
      Alert.alert("Error", `Phone number does not match selected provider.`);
      setTransactionModalVisible(true);
      setTransactionStatus("failed");
      return;
    }

    try {
      setTransactionModalVisible(true);
      setTransactionStatus("processing");

      const reference = await createTransactionReference();
      setReferenceId(reference);

      // Re-fetch balance (safety)
      const { data: wallet } = await supabase
        .from("wallet")
        .select("balance")
        .eq("user_email", userEmail)
        .single();

      const currentBalance = wallet?.balance ?? balance;
      if (currentBalance < discountedPrice) {
        Alert.alert("Error", "Balance changed – insufficient funds.");
        setTransactionModalVisible(false);
        return;
      }

      // CALL AIRTIME PROXY
      const lizzyBody = {
        network: selectedProvider.networkId,
        phone: phoneNumber,
        amount: selectedAmount,
        plan_type: "VTU",
        bypass: false,
        "request-id": `Airtime_${reference}`,
      };

      const apiResponse = await fetch(AIRTIME_PROXY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(lizzyBody),
      });

      const responseText = await apiResponse.text();
      console.log("Lizzysub Airtime Response:", responseText);

      let responseData: any;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { status: "error", message: "Invalid response" };
      }

      // If Lizzysub failed → refund
      if (!apiResponse.ok || responseData.status !== "success") {
        await supabase
          .from("wallet")
          .update({ balance: currentBalance })
          .eq("user_email", userEmail);

        setTransactionStatus("failed");
        Alert.alert("Failed", responseData.message || "Airtime purchase failed.");
        return;
      }

      // SUCCESS: Deduct from wallet
      const { error: updateError } = await supabase
        .from("wallet")
        .update({ balance: currentBalance - discountedPrice })
        .eq("user_email", userEmail);

      if (updateError) throw updateError;

      // Record transaction
      const txData = {
        user_email: userEmail,
        amount: -discountedPrice,
        reference,
        status: "success",
        env: "live",
        metadata: {
          purchase: `Airtime ₦${selectedAmount} on ${selectedProvider.name}`,
          phone_number: phoneNumber,
          type: "airtime",
          actual_cost: discountedPrice,
          payment_method: "Wallet",
          payment_date: new Date().toLocaleString("en-US", {
            timeZone: "Africa/Lagos",
          }),
        },
      };

      const { data: tx, error: txErr } = await supabase
        .from("transactions")
        .insert(txData)
        .select("id, created_at")
        .single();

      if (txErr) throw txErr;

      setTransactionStatus("success");
      Alert.alert(
        "Success",
        `Purchased ₦${formatNumberWithCommas(
          selectedAmount
        )} airtime for ₦${formatNumberWithCommas(discountedPrice)}.`
      );

      router.push({
        pathname: "/success",
        params: {
          id: tx.id,
          provider: selectedProvider.name,
          data: `Airtime ₦${selectedAmount}`,
          price: discountedPrice.toString(),
          date: new Date().toISOString(),
          status: "Success",
          phoneNumber,
          reference,
          metadata: JSON.stringify({
            type: "airtime",
            actual_cost: discountedPrice,
            payment_method: "Wallet",
          }),
        },
      });
    } catch (err: any) {
      console.error("Purchase error:", err);
      setTransactionStatus("failed");
      Alert.alert("Error", err.message || "Purchase failed.");
    } finally {
      setTransactionModalVisible(false);
    }
  };

  // -------------------------------------------------------------------------
  // PIN creation
  const savePin = async () => {
    if (newPin.length < 4 || newPin.length > 6 || newPin !== confirmPin) {
      Alert.alert("Error", "PIN must be 4-6 digits and match.");
      return;
    }

    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single();

      if (!profile) {
        await supabase.from("profiles").insert({
          id: user.id,
          email: userEmail,
          username: userEmail.split("@")[0],
          transaction_pin: newPin,
        });
      } else {
        await supabase
          .from("profiles")
          .update({ transaction_pin: newPin })
          .eq("id", user.id);
      }

      setHasPin(true);
      setIsPinCreationModalOpen(false);
      setNewPin("");
      setConfirmPin("");
      Alert.alert("Success", "PIN created successfully.");
    } catch (e) {
      Alert.alert("Error", "Failed to save PIN.");
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // Helpers
  const formatNumberWithCommas = (n: number | null) =>
    n?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") ?? "";

  const closeTransactionModal = () => setTransactionModalVisible(false);
  const closePinCreationModal = () => {
    setIsPinCreationModalOpen(false);
    setNewPin("");
    setConfirmPin("");
  };

  // -------------------------------------------------------------------------
  // Render
  return (
    <View style={styles.container}>
      <View style={styles.fixedHeader}>
        <View style={styles.walletBalanceContainer}>
          <Text style={styles.walletBalanceLabel}>Wallet Balance:</Text>
          <Text style={styles.walletBalanceValue}>
            {isBalanceLoading
              ? "Loading..."
              : `₦${formatNumberWithCommas(balance)}`}
          </Text>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        scrollEnabled={true}
      >
        <Text style={styles.sectionTitle}>Select Provider</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#00ff99" style={styles.loader} />
        ) : providers.length === 0 ? (
          <Text style={styles.noProviderText}>No providers available.</Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.providerContainer}
          >
            {providers.map((p) => (
              <TouchableOpacity
                key={p.id}
                onPress={() => setSelectedProvider(p)}
                style={[
                  styles.providerCard,
                  selectedProvider?.id === p.id && styles.providerCardSelected,
                ]}
              >
                <Image source={p.image} style={styles.providerLogo} resizeMode="contain" />
                <Text style={styles.providerName}>{p.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Phone Number</Text>
          <TextInput
            style={styles.phoneInput}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="Enter 11-digit phone number"
            placeholderTextColor="#A1A1AA"
            keyboardType="numeric"
            maxLength={11}
          />
        </View>

        <Text style={styles.sectionTitle}>Select Airtime Amount</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.amountScroll}>
          {AIRTIME_AMOUNTS.map((amt) => (
            <TouchableOpacity
              key={amt}
              onPress={() => selectAmount(amt)}
              style={[
                styles.amountButton,
                selectedAmount === amt && styles.amountButtonSelected,
              ]}
            >
              <Text style={styles.amountText}>₦{formatNumberWithCommas(amt)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.discountBar}>
          <Text style={styles.discountLabel}>Amount to pay:</Text>
          <Text style={styles.discountValue}>
            ₦{formatNumberWithCommas(discountedPrice)}
          </Text>
        </View>

        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.slideContainer,
            { transform: [{ translateX: slideAnim }] },
            !isSlideEnabled && styles.slideContainerDisabled,
          ]}
          accessible
          accessibilityLabel="Slide to confirm purchase"
          accessibilityRole="button"
        >
          <View style={styles.slideTextContainer}>
            <Text
              style={[
                styles.slideText,
                !isSlideEnabled && styles.slideTextDisabled,
              ]}
            >
              {isSlideEnabled ? "Slide to Purchase" : "Complete all fields"}
            </Text>
            {isSlideEnabled && <Ionicons name="arrow-forward" size={20} color="#3B82F6" />}
          </View>
        </Animated.View>

        <TransactionStatusModal
          visible={transactionModalVisible}
          onClose={closeTransactionModal}
          transactionStatus={transactionStatus}
          selectedPlan={{ amount: selectedAmount || 0, type: "airtime" }}
          phoneNumber={phoneNumber}
          networkProvider={selectedProvider?.name || ""}
        />

        <CreatePinModal
          visible={isPinCreationModalOpen}
          onClose={closePinCreationModal}
          newPin={newPin}
          setNewPin={setNewPin}
          confirmPin={confirmPin}
          setConfirmPin={setConfirmPin}
          showNewPin={isNewPinVisible}
          setShowNewPin={setIsNewPinVisible}
          showConfirmPin={isConfirmPinVisible}
          setShowConfirmPin={setIsConfirmPinVisible}
          onSave={savePin}
          isLoading={loading}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#000",
	},
	fixedHeader: {
		backgroundColor: "#000",
		paddingTop: 16,
		paddingHorizontal: 16,
		zIndex: 1,
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
		fontWeight: "600",
		color: "#A1A1AA",
	},
	walletBalanceValue: {
		fontSize: 16,
		fontWeight: "600",
		color: "#fff",
	},
	scrollContent: {
		paddingHorizontal: 16,
		paddingBottom: 24,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: "600",
		color: "#fff",
		marginBottom: 12,
	},
	debugText: {
		fontSize: 14,
		fontWeight: "500",
		color: "#00ff99",
		marginBottom: 16,
		textAlign: "center",
	},
	providerContainer: {
		flexDirection: "row",
		justifyContent: "space-between",
		gap: 12,
		marginBottom: 24,
	},
	providerCard: {
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "#1E1E1E",
		borderRadius: 12,
		padding: 16,
		width: 100,
		height: 100,
		elevation: 4,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 4,
	},
	providerCardSelected: {
		borderColor: "#00ff99",
		borderWidth: 3,
		backgroundColor: "#2F2F2F",
	},
	providerLogo: {
		width: 48,
		height: 48,
		borderRadius: 12,
		marginBottom: 8,
	},
	providerName: {
		fontSize: 14,
		fontWeight: "600",
		color: "#fff",
	},
	noProviderText: {
		fontSize: 16,
		color: "#A1A1AA",
		textAlign: "center",
		marginBottom: 24,
	},
	inputContainer: {
		marginBottom: 24,
	},
	inputLabel: {
		fontSize: 16,
		color: "#A1A1AA",
		marginBottom: 8,
	},
	phoneInput: {
		backgroundColor: "#1E1E1E",
		borderRadius: 8,
		padding: 12,
		fontSize: 16,
		color: "#fff",
	},
	amountScroll: {
		marginBottom: 24,
	},
	amountButton: {
		backgroundColor: "#1E1E1E",
		borderRadius: 8,
		paddingVertical: 12,
		paddingHorizontal: 20,
		marginRight: 12,
	},
	amountButtonSelected: {
		borderColor: "#00ff99",
		borderWidth: 2,
		backgroundColor: "#2F2F2F",
	},
	amountText: {
		fontSize: 16,
		fontWeight: "600",
		color: "#fff",
	},
	discountBar: {
		flexDirection: "row",
		justifyContent: "space-between",
		backgroundColor: "#1E1E1E",
		borderRadius: 8,
		padding: 16,
		marginBottom: 24,
	},
	discountLabel: {
		fontSize: 16,
		fontWeight: "500",
		color: "#A1A1AA",
	},
	discountValue: {
		fontSize: 16,
		fontWeight: "600",
		color: "#00ff99",
	},
	slideContainer: {
		paddingVertical: 16,
		paddingHorizontal: 24,
		backgroundColor: "#1E1E1E",
		borderRadius: 8,
		overflow: "hidden",
	},
	slideContainerDisabled: {
		backgroundColor: "#2D2D2D",
		opacity: 0.6,
	},
	slideTextContainer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	slideText: {
		fontSize: 16,
		fontWeight: "600",
		color: "#3B82F6",
	},
	slideTextDisabled: {
		fontWeight: "600",
		color: "#A1A1AA",
	},
	loader: {
		marginTop: 20,
	},
});

export default AirtimeProvider;
