// screens/Confirmation.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  StyleSheet,
} from "react-native";
import TransactionStatusModal from "@/components/homescreen/TransactionStatusModal";
import { supabase } from "@/config/supabase";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/context/supabase-provider";

export default function Confirmation() {
  const { user } = useAuth();
  const params = useLocalSearchParams();

  // ✅ Extract params as sent from generate-token
  const bundle = params.bundle ? JSON.parse(params.bundle as string) : null;
  const provider = params.provider ? JSON.parse(params.provider as string) : null;
  const source = params.source as string;
  const accessToken = params.token as string;
  const networkId = params.networkId ? Number(params.networkId) : null;
  const planId = params.planId ? String(params.planId) : null;
  const userEmail = user?.email || "";

  const [mode, setMode] = useState<"phone" | "pin">("phone");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);

  const PURCHASE_ENDPOINT = "https://erecharge.ng/api/data";
  const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "x"];

  // ✅ Fetch wallet balance
  useEffect(() => {
    if (!userEmail) return;
    let active = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("wallet")
          .select("balance")
          .eq("user_email", userEmail)
          .single();

        if (!active) return;
        if (error) console.warn("⚠️ Wallet fetch error:", error);
        else setWalletBalance(Number(data?.balance ?? 0));
      } catch (err) {
        console.warn("⚠️ Wallet fetch exception:", err);
      }
    })();
    return () => {
      active = false;
    };
  }, [userEmail]);

  // ✅ Handle keypad
  const handleKey = (k: string) => {
    if (mode === "phone") {
      if (k === "x") setPhone((p) => p.slice(0, -1));
      else if (phone.length < 11) {
        const next = phone + k;
        setPhone(next);
        if (next.length === 11) setTimeout(() => setMode("pin"), 150);
      }
    } else {
      if (k === "x") setPin((p) => p.slice(0, -1));
      else if (pin.length < 4) {
        const next = pin + k;
        setPin(next);
        if (next.length === 4) setTimeout(() => verifyAndPurchase(next), 200);
      }
    }
  };

  const handleEditPhone = () => {
    setMode("phone");
    setPin("");
  };

  // ✅ Verify PIN and purchase
  const verifyAndPurchase = async (enteredPin: string) => {
    if (!bundle || !provider) {
      Alert.alert("Configuration Error", "Missing plan/provider details.");
      resetInput();
      return;
    }
    if (!phone || phone.length !== 11) {
      Alert.alert("Invalid Number", "Please enter an 11-digit recipient number.");
      resetInput();
      return;
    }
    if (!networkId) {
      Alert.alert("Error", "Missing network ID.");
      resetInput();
      return;
    }

    if (walletBalance < (bundle.price ?? 0)) {
      Alert.alert("Insufficient Funds", `You need ₦${bundle.price} to continue.`);
      resetInput();
      return;
    }

    setLoading(true);
    setShowModal(true);

    try {
      // ✅ Verify PIN
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("transaction_pin")
        .eq("email", userEmail)
        .single();

      if (profileErr || !profile) throw new Error("Unable to verify transaction PIN.");
      if (profile.transaction_pin !== enteredPin) {
        setShowModal(false);
        setLoading(false);
        Alert.alert("Incorrect PIN", "The PIN you entered is incorrect.");
        resetInput();
        return;
      }

      // ✅ Fetch wallet again
      const { data: wallet, error: walletErr } = await supabase
        .from("wallet")
        .select("balance")
        .eq("user_email", userEmail)
        .single();
      if (walletErr || !wallet) throw new Error("Wallet not found.");

      const reference = `DATA_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const newBalance = Number(wallet.balance ?? 0) - Number(bundle.price ?? 0);

      // Deduct wallet
      const { error: updateWalletErr } = await supabase
        .from("wallet")
        .update({ balance: newBalance })
        .eq("user_email", userEmail);
      if (updateWalletErr) throw updateWalletErr;

      // Log transaction
      const { error: txInsertErr } = await supabase.from("transactions").insert({
        user_email: userEmail,
        amount: -(bundle.price ?? 0),
        type: "data_purchase",
        status: "pending",
        reference,
        metadata: {
          plan: bundle.data,
          provider: provider.name,
          validity: bundle.validity,
          source,
          phone,
          network_id: networkId,
          plan_id: planId,
        },
      });
      if (txInsertErr) throw txInsertErr;

      // ✅ Payload now uses passed params
      const payload = {
        network: networkId,
        phone,
        data_plan: planId,
        bypass: false,
        "request-id": `REQ-${Date.now()}`,
      };

      console.log("📡 Sending payload:", payload);

      const res = await fetch(PURCHASE_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Token ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      console.log("💬 eRecharge Response:", result);

      const failed =
        !res.ok ||
        result?.status === "fail" ||
        result?.success === false ||
        String(result?.status).toLowerCase() === "failed";

      if (failed) {
        // Refund user if failed
        await supabase
          .from("wallet")
          .update({ balance: newBalance + Number(bundle.price ?? 0) })
          .eq("user_email", userEmail);

        await supabase
          .from("transactions")
          .update({
            status: "failed",
            metadata: { ...result, refunded: true },
          })
          .eq("reference", reference);

        setShowModal(false);
        Alert.alert("❌ Purchase Failed", result?.message || "Transaction failed.");
        resetInput();
        return;
      }

      // ✅ Success
      await supabase
        .from("transactions")
        .update({ status: "success", metadata: result })
        .eq("reference", reference);

      if (source === "welcome-offer") {
        await supabase
          .from("welcome_offer_usage")
          .update({
            used_count: supabase.rpc("increment", { x: 1 }),
            last_used_date: new Date().toISOString().split("T")[0],
          })
          .eq("user_email", userEmail);
      }

      setShowModal(false);
      Alert.alert("✅ Success", `${provider.name} ${bundle.data} activated successfully!`);
      router.replace("/(app)");
    } catch (err: any) {
      console.error("⚠️ Error:", err);
      Alert.alert("Error", err?.message || "Transaction failed.");
      setShowModal(false);
    } finally {
      setLoading(false);
      setPin("");
    }
  };

  const resetInput = () => {
    setPin("");
    setMode("phone");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📦 Welcome Back Offer</Text>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Plan</Text>
        <Text style={styles.value}>{bundle?.data ?? "—"}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Price</Text>
        <Text style={styles.value}>₦{(bundle?.price ?? 0).toLocaleString()}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Validity</Text>
        <Text style={styles.value}>{bundle?.validity ?? "N/A"}</Text>
      </View>

      <Text style={styles.subTitle}>Enter recipient 11-digit number</Text>

      <View style={styles.phoneRow}>
        <Text style={styles.phoneText}>{phone || "Enter number"}</Text>
        {mode === "pin" && (
          <Pressable onPress={handleEditPhone} style={styles.editPhoneBtn}>
            <Text style={styles.editPhoneText}>Edit</Text>
          </Pressable>
        )}
      </View>

      {mode === "pin" && (
        <>
          <Text style={styles.pinLabel}>Enter 4-digit PIN</Text>
          <View style={styles.pinRow}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={styles.pinDot}>
                {pin[i] && <View style={styles.pinFilled} />}
              </View>
            ))}
          </View>
        </>
      )}

      <View style={styles.keypad}>
        {KEYS.map((k) => (
          <Pressable key={k} style={styles.key} onPress={() => handleKey(k)}>
            <Text style={styles.keyText}>{k === "x" ? "⌫" : k}</Text>
          </Pressable>
        ))}
      </View>

      {showModal && (
        <TransactionStatusModal
          visible={showModal}
          message={`Processing ${provider?.name ?? ""} ${bundle?.data ?? ""} purchase...`}
          loading={loading}
          glass
        />
      )}
    </View>
  );
}

// ─────────────────────────────────────────────
// Styles (unchanged)
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0A", padding: 20, paddingTop: 60 },
  title: { fontSize: 22, color: "#fff", fontWeight: "700", textAlign: "center", marginBottom: 18 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  label: { color: "#aaa", fontSize: 14 },
  value: { color: "#fff", fontSize: 14, fontWeight: "700" },
  subTitle: { color: "#bbb", textAlign: "center", marginTop: 12, marginBottom: 8 },
  phoneRow: {
    backgroundColor: "#071024",
    borderColor: "#3B82F6",
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  phoneText: { color: "#fff", fontSize: 18 },
  editPhoneBtn: { paddingVertical: 6, paddingHorizontal: 10, backgroundColor: "#111827", borderRadius: 8 },
  editPhoneText: { color: "#3B82F6" },
  pinLabel: { color: "#aaa", textAlign: "center", marginTop: 6 },
  pinRow: { flexDirection: "row", justifyContent: "center", marginVertical: 10, gap: 12 },
  pinDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#555", justifyContent: "center", alignItems: "center", marginHorizontal: 6 },
  pinFilled: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#3B82F6" },
  keypad: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 18, marginTop: 14 },
  key: { width: 70, height: 70, backgroundColor: "#111", justifyContent: "center", alignItems: "center", borderRadius: 35, margin: 8 },
  keyText: { color: "#fff", fontSize: 22, fontWeight: "700" },
});
