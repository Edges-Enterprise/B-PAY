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
  SafeAreaView,
} from "react-native";
import { supabase } from "@/config/supabase";
import { EXAM_IMAGES } from "@/constants/helper";

const { width, height } = Dimensions.get("window");
const scaleFont = (size: number) => (width / 375) * size;
const scaleSize = (size: number) => (width / 375) * size;

// -----------------------------------------------------------------------------
// Lizzysub Exam Proxy URL
const EXAM_PROXY_URL =
  "https://jjyyfaxcwanrmiipzkoj.supabase.co/functions/v1/exam-proxy";

// -----------------------------------------------------------------------------
// Exam Providers (Lizzysub IDs)
interface ExamProvider {
  id: number;
  name: string;
  image: any;
  code: string;
  price: number;
  sellingPrice: number;
  lizzyExamId: number;
}

const EXAM_PROVIDERS: ExamProvider[] = [
  {
    id: 1,
    name: "WAEC",
    image: EXAM_IMAGES.WAEC,
    code: "waec",
    price: 3500,
    sellingPrice: 3800,
    lizzyExamId: 1,
  },
  {
    id: 2,
    name: "NECO",
    image: EXAM_IMAGES.NECO,
    code: "neco",
    price: 1300,
    sellingPrice: 1500,
    lizzyExamId: 2,
  },
  {
    id: 3,
    name: "NABTEB",
    image: EXAM_IMAGES.NABTEB,
    code: "nabteb",
    price: 880,
    sellingPrice: 900,
    lizzyExamId: 3,
  },
];

interface TransactionResult {
  id: string;
  provider: string;
  data: string;
  price: string;
  date: string;
  status: string;
  quantity: string;
  reference: string;
  metadata: string;
}

const Education: React.FC = () => {
  const [selectedProvider, setSelectedProvider] = useState<ExamProvider | null>(null);
  const [quantity, setQuantity] = useState<string>("1");
  const [transactionPin, setTransactionPin] = useState<string>("");
  const [balance, setBalance] = useState<number>(0);
  const [userEmail, setUserEmail] = useState<string>("");
  const [referenceId, setReferenceId] = useState<string>("");
  const [transactionModalVisible, setTransactionModalVisible] = useState<boolean>(false);
  const [transactionStatus, setTransactionStatus] = useState<"processing" | "success" | "failed">("processing");
  const [transactionResult, setTransactionResult] = useState<TransactionResult | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const quantityInputRef = useRef<TextInput>(null);
  const transactionPinInputRef = useRef<TextInput>(null);
  const [focusedInput, setFocusedInput] = useState<"quantity" | "transactionPin" | null>(null);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const slideWidth = width - scaleSize(24);
  const maxSlideDistance = slideWidth * 0.6;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slidePulseAnim = useRef(new Animated.Value(0.7)).current;
  const pulseAnims = useRef<Animated.Value[]>([]).current;

  const isSlideEnabled =
    selectedProvider &&
    quantity &&
    parseInt(quantity) >= 1 &&
    parseInt(quantity) <= 10 &&
    transactionPin.length >= 4 &&
    transactionPin.length <= 6;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) =>
          isSlideEnabled && Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > 2,
        onPanResponderMove: (_, g) => {
          if (g.dx >= 0 && g.dx <= maxSlideDistance) slideAnim.setValue(g.dx);
        },
        onPanResponderRelease: (_, g) => {
          if (g.dx > maxSlideDistance * 0.5 && isSlideEnabled) handlePurchase();
          Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }).start();
        },
      }),
    [isSlideEnabled, maxSlideDistance]
  );

  // Fade-in
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  // Pulse animations
  useEffect(() => {
    pulseAnims.length = 0;
    EXAM_PROVIDERS.forEach((_, i) => {
      if (i % 2 === 0) {
        const anim = new Animated.Value(1);
        pulseAnims[i] = anim;
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 1, duration: 1000, useNativeDriver: true }),
          ])
        ).start();
      }
    });
  }, []);

  // Slide pulse
  useEffect(() => {
    if (isSlideEnabled) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(slidePulseAnim, { toValue: 1, duration: 750, useNativeDriver: true }),
          Animated.timing(slidePulseAnim, { toValue: 0.7, duration: 750, useNativeDriver: true }),
        ])
      ).start();
    } else {
      slidePulseAnim.setValue(0.7);
    }
  }, [isSlideEnabled]);

  // Keyboard
  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardHeight(0);
        setFocusedInput(null);
      }
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // Load user + balance
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user?.email) throw new Error("Not authenticated");
        setUserEmail(user.email);

        const { data: wallet } = await supabase
          .from("wallet")
          .select("balance")
          .eq("user_email", user.email)
          .single();

        setBalance(wallet?.balance || 0);

        const ref = `EDGES_EXAM_${user.id}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        setReferenceId(ref);

        // Real-time balance
        const sub = supabase
          .channel(`wallet:${user.email}`)
          .on("postgres_changes", {
            event: "UPDATE",
            schema: "public",
            table: "wallet",
            filter: `user_email=eq.${user.email}`,
          }, (p) => setBalance(p.new.balance ?? 0))
          .subscribe();

        return () => supabase.removeChannel(sub);
      } catch (e) {
        Alert.alert("Error", "Failed to load user data");
      }
    };
    init();
  }, []);

  const handleSelectProvider = (p: ExamProvider) => {
    setSelectedProvider(p);
    setQuantity("1");
  };

  const getTotalAmount = () => {
    if (!selectedProvider || !quantity) return 0;
    return selectedProvider.sellingPrice * parseInt(quantity);
  };

  const handlePurchase = async () => {
    if (!selectedProvider || !quantity || parseInt(quantity) < 1 || parseInt(quantity) > 10) {
      Alert.alert("Error", "Select provider and valid quantity (1–10)");
      setTransactionStatus("failed");
      setTransactionModalVisible(true);
      return;
    }

    const total = getTotalAmount();
    if (balance < total) {
      Alert.alert("Error", "Insufficient balance");
      setTransactionStatus("failed");
      setTransactionModalVisible(true);
      return;
    }

    // Verify PIN
    const { data: profile } = await supabase
      .from("profiles")
      .select("transaction_pin")
      .eq("email", userEmail)
      .single();

    if (!profile || profile.transaction_pin !== transactionPin) {
      Alert.alert("Error", "Invalid PIN");
      setTransactionStatus("failed");
      setTransactionModalVisible(true);
      return;
    }

    setTransactionModalVisible(true);
    setTransactionStatus("processing");

    try {
      // Re-check balance
      const { data: wallet } = await supabase
        .from("wallet")
        .select("balance")
        .eq("user_email", userEmail)
        .single();

      const currentBalance = wallet?.balance ?? balance;
      if (currentBalance < total) throw new Error("Balance changed");

      // Call Lizzysub via proxy
      const lizzyBody = {
        exam: selectedProvider.lizzyExamId,
        quantity: parseInt(quantity),
      };

      const res = await fetch(EXAM_PROXY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(lizzyBody),
      });

      const data = await res.json();

      if (!res.ok || data.status !== "success") {
        await supabase.from("wallet").update({ balance: currentBalance }).eq("user_email", userEmail);
        throw new Error(data.message || "Purchase failed");
      }

      // Deduct
      const newBal = currentBalance - total;
      await supabase.from("wallet").update({ balance: newBal }).eq("user_email", userEmail);

      // Record transaction
      const tx = {
        user_email: userEmail,
        amount: -total,
        reference: referenceId,
        status: "success",
        metadata: {
          purchase: `${selectedProvider.name} x${quantity}`,
          quantity,
          type: "exam_pin",
          exam_name: selectedProvider.name,
          pin: data.pin,
          old_balance: currentBalance,
          new_balance: newBal,
        },
      };

      const { data: txData } = await supabase
        .from("transactions")
        .insert(tx)
        .select("id, created_at")
        .single();

      setBalance(newBal);
      setTransactionStatus("success");
      setTransactionResult({
        id: txData.id,
        provider: selectedProvider.name,
        data: `${selectedProvider.name} Exam Pin x${quantity}`,
        price: total.toString(),
        date: new Date().toISOString(),
        status: "Success",
        quantity,
        reference: referenceId,
        metadata: JSON.stringify(tx.metadata),
      });

      setSelectedProvider(null);
      setQuantity("1");
      setTransactionPin("");
    } catch (err: any) {
      console.error("Purchase error:", err);
      setTransactionStatus("failed");
      Alert.alert("Failed", err.message || "Try again");
    }
  };

  const closeTransactionModal = () => {
    setTransactionModalVisible(false);
    setTransactionResult(null);
  };

  const formatNumberWithCommas = (n: number) => n.toLocaleString();

  return (
    <Animated.View style={[styles.rootContainer, { opacity: fadeAnim }]}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.innerContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.mainTitle}>Exam Pins</Text>
            <Text style={styles.sectionTitle}>Select Exam Provider</Text>
            <View style={styles.providerScroll}>
              {EXAM_PROVIDERS.map((p, i) => (
                <Animated.View
                  key={p.id}
                  style={[
                    styles.providerCard,
                    selectedProvider?.id === p.id && styles.providerCardSelected,
                    i % 2 === 0 && !selectedProvider && { transform: [{ scale: pulseAnims[i] || 1 }] },
                  ]}
                >
                  <Pressable onPress={() => handleSelectProvider(p)}>
                    <View style={styles.providerLogoContainer}>
                      <Image source={p.image} style={styles.providerLogo} resizeMode="contain" />
                    </View>
                    <Text style={styles.providerName}>{p.name}</Text>
                  </Pressable>
                </Animated.View>
              ))}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Quantity (1–10)</Text>
              <TextInput
                ref={quantityInputRef}
                style={[
                  styles.input,
                  quantity && parseInt(quantity) >= 1 && parseInt(quantity) <= 10 && styles.inputValid,
                  quantity && (parseInt(quantity) < 1 || parseInt(quantity) > 10) && styles.inputInvalid,
                ]}
                value={quantity}
                onChangeText={setQuantity}
                placeholder="Enter quantity"
                placeholderTextColor="#B0B0B0"
                keyboardType="numeric"
                maxLength={2}
                onFocus={() => setFocusedInput("quantity")}
                onBlur={() => setFocusedInput(null)}
              />
            </View>

            <View style={styles.discountBar}>
              <Text style={styles.discountLabel}>Total Amount</Text>
              <Text style={styles.discountValue}>₦{formatNumberWithCommas(getTotalAmount())}</Text>
            </View>

            <View style={styles.transactionPinContainer}>
              <Text style={styles.transactionPinLabel}>Transaction PIN</Text>
              <TextInput
                ref={transactionPinInputRef}
                style={[styles.input, styles.transactionPinInput, transactionPin && styles.inputValid]}
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
              <Text style={[styles.slideText, isSlideEnabled && styles.slideTextEnabled]}>
                Slide to Pay
              </Text>
              <Text style={[styles.arrow, isSlideEnabled && styles.slideTextEnabled]}>→</Text>
            </Animated.View>

            <View style={styles.footerContainer}>
              <Text style={styles.footerTitle}>Important</Text>
              <Text style={styles.footerText}>• Pins delivered instantly</Text>
              <Text style={styles.footerText}>• Keep your pins secure</Text>
              <Text style={styles.footerText}>• Contact support if issues</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <Modal visible={transactionModalVisible} transparent animationType="fade" onRequestClose={closeTransactionModal}>
        <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
          <View style={styles.modalContainer}>
            {transactionStatus === "processing" ? (
              <>
                <Text style={styles.modalTitle}>Processing...</Text>
                <Text style={styles.modalMessage}>Please wait...</Text>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>
                  Transaction {transactionStatus === "success" ? "Success" : "Failed"}
                </Text>
                {transactionResult && (
                  <ScrollView style={styles.transactionDetails}>
                    <Text style={styles.detailText}>Provider: {transactionResult.provider}</Text>
                    <Text style={styles.detailText}>Service: {transactionResult.data}</Text>
                    <Text style={styles.detailText}>Amount: ₦{transactionResult.price}</Text>
                    <Text style={styles.detailText}>Quantity: {transactionResult.quantity}</Text>
                    <Text style={styles.detailText}>Reference: {transactionResult.reference}</Text>
                    <Text style={styles.detailText}>
                      Date: {new Date(transactionResult.date).toLocaleString()}
                    </Text>
                    {transactionResult.metadata && JSON.parse(transactionResult.metadata).pin && (
                      <View style={styles.pinsContainer}>
                        <Text style={styles.pinsTitle}>Your Exam Pin:</Text>
                        <Text style={styles.pinText}>
                          {JSON.parse(transactionResult.metadata).pin}
                        </Text>
                      </View>
                    )}
                  </ScrollView>
                )}
                <Pressable style={styles.closeButton} onPress={closeTransactionModal}>
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

// Styles unchanged (same as original)
const styles = StyleSheet.create({
  rootContainer: { flex: 1, backgroundColor: "#000000" },
  safeArea: { flex: 1, backgroundColor: "#000000" },
  container: { flex: 1, backgroundColor: "#000000" },
  scrollContainer: { flex: 1, backgroundColor: "#000000" },
  innerContainer: { paddingHorizontal: scaleSize(16), flexGrow: 1, backgroundColor: "#000000" },
  mainTitle: { fontSize: scaleFont(24), fontWeight: "700", color: "#FFD700", marginBottom: scaleSize(16), textAlign: "center" },
  sectionTitle: { fontSize: scaleFont(18), fontWeight: "600", color: "#FFFFFF", marginBottom: scaleSize(12) },
  providerScroll: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: scaleSize(16) },
  providerCard: {
    alignItems: "center",
    backgroundColor: "#1C1C1E",
    borderRadius: scaleSize(12),
    padding: scaleSize(12),
    width: scaleSize(100),
    height: scaleSize(120),
    marginBottom: scaleSize(12),
    justifyContent: "center",
    shadowColor: "#d7a77f",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
    elevation: 4,
  },
  providerCardSelected: { borderColor: "#D7A77F", borderWidth: 2, backgroundColor: "#2A2A2C", transform: [{ scale: 1.05 }] },
  providerLogoContainer: {
    width: scaleSize(50),
    height: scaleSize(50),
    borderRadius: scaleSize(25),
    borderColor: "#D7A77F",
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginBottom: scaleSize(8),
  },
  providerLogo: { width: scaleSize(40), height: scaleSize(40) },
  providerName: { fontSize: scaleFont(12), fontWeight: "600", color: "#FFFFFF", textAlign: "center" },
  inputContainer: { marginBottom: scaleSize(16) },
  inputLabel: { fontSize: scaleFont(14), fontWeight: "500", color: "#B0B0B0", marginBottom: scaleSize(8) },
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
  inputValid: { borderColor: "#FFD700", shadowColor: "#FFD700", shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  inputInvalid: { borderColor: "#FF0000", shadowColor: "#FF0000", shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  transactionPinContainer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: scaleSize(24) },
  transactionPinLabel: { fontSize: scaleFont(14), fontWeight: "500", color: "#B0B0B0" },
  transactionPinInput: { width: scaleSize(140), padding: scaleSize(8) },
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
  discountLabel: { fontSize: scaleFont(14), fontWeight: "500", color: "#B0B0B0" },
  discountValue: { fontSize: scaleFont(14), fontWeight: "700", color: "#FFD700" },
  slideTextWrapper: { flexDirection: "row", alignItems: "center", marginTop: scaleSize(12), marginBottom: scaleSize(32) },
  slideText: { fontSize: scaleFont(16), fontWeight: "700", color: "#3B82F6" },
  slideTextEnabled: { color: "#FFD700" },
  arrow: { fontSize: scaleFont(20), color: "#3B82F6", marginLeft: scaleSize(8) },
  footerContainer: { marginTop: scaleSize(32), opacity: 0.5 },
  footerTitle: { fontSize: scaleFont(16), fontWeight: "700", color: "#FFD700", marginBottom: scaleSize(8) },
  footerText: { fontSize: scaleFont(12), fontWeight: "500", color: "#B0B0B0", marginBottom: scaleSize(6) },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center" },
  modalContainer: {
    backgroundColor: "#1C1C1E",
    borderRadius: scaleSize(12),
    padding: scaleSize(20),
    width: "90%",
    maxHeight: height * 0.8,
    borderColor: "#DAA520",
    borderWidth: 1,
  },
  modalTitle: { fontSize: scaleFont(20), fontWeight: "700", color: "#FFFFFF", marginBottom: scaleSize(16), textAlign: "center" },
  modalMessage: { fontSize: scaleFont(14), fontWeight: "500", color: "#B0B0B0", textAlign: "center", marginBottom: scaleSize(20) },
  transactionDetails: { marginBottom: scaleSize(20) },
  detailText: { fontSize: scaleFont(12), fontWeight: "500", color: "#FFFFFF", marginBottom: scaleSize(8) },
  closeButton: { backgroundColor: "#FFD700", borderRadius: scaleSize(8), paddingVertical: scaleSize(12), alignItems: "center" },
  closeButtonText: { fontSize: scaleFont(16), fontWeight: "700", color: "#000000" },
  pinsContainer: { marginTop: scaleSize(12) },
  pinsTitle: { fontSize: scaleFont(14), fontWeight: "600", color: "#FFFFFF", marginBottom: scaleSize(8) },
  pinText: { fontSize: scaleFont(12), color: "#FFD700", marginBottom: scaleSize(4) },
});

export default Education;