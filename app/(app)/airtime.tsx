// app/airtime.tsx
'use client';

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";

const SCREEN_WIDTH = Dimensions.get("window").width;

const providers = {
  local: ["MTN", "Airtel", "Glo", "9mobile"],
  international: ["Vodafone", "AT&T", "Verizon", "Orange"],
};

export default function Airtime() {
  const [tab, setTab] = useState<"local" | "international">("local");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  const handleBuy = () => {
    if (!phone || !amount || !selectedProvider) return;
    alert(`Buying ₦${amount} airtime for ${phone} on ${selectedProvider}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Image source={require("../../assets/icons/home.png")} style={styles.watermark} resizeMode="contain" />
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#FFD700" />
          </TouchableOpacity>
          <Text style={styles.title}>Buy Airtime</Text>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, tab === "local" && styles.tabActive]}
            onPress={() => setTab("local")}
          >
            <Text style={[styles.tabText, tab === "local" && styles.tabTextActive]}>Local</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === "international" && styles.tabActive]}
            onPress={() => setTab("international")}
          >
            <Text style={[styles.tabText, tab === "international" && styles.tabTextActive]}>International</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Provider</Text>
          <View style={styles.grid}>
            {providers[tab].map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.providerBtn, selectedProvider === p && styles.providerBtnActive]}
                onPress={() => setSelectedProvider(p)}
              >
                <Text style={[styles.providerText, selectedProvider === p && styles.providerTextActive]}>
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Phone Number</Text>
          <View style={styles.inputBox}>
            <MaterialIcons name="phone" size={20} color="#aaa" />
            <Text style={styles.input}>{phone || "+234 000 000 0000"}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Amount</Text>
          <View style={styles.amountGrid}>
            {["500", "1000", "2000", "5000"].map((amt) => (
              <TouchableOpacity
                key={amt}
                style={[styles.amountBtn, amount === amt && styles.amountBtnActive]}
                onPress={() => setAmount(amt)}
              >
                <Text style={[styles.amountBtnText, amount === amt && styles.amountBtnTextActive]}>
                  ₦{amt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.buyButton} onPress={handleBuy}>
          <Text style={styles.buyButtonText}>Buy Airtime</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  watermark: { position: "absolute", top: "30%", left: "10%", width: 300, height: 300, opacity: 0.08, zIndex: 2 },
  content: { flex: 1, paddingHorizontal: 16, zIndex: 1 },
  header: { flexDirection: "row", alignItems: "center", marginTop: 20, marginBottom: 28 },
  backButton: { padding: 4 },
  title: { color: "#fff", fontSize: 28, fontWeight: "700", marginLeft: 12 },
  tabContainer: { flexDirection: "row", backgroundColor: "#111", borderRadius: 16, padding: 4, marginBottom: 24 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center" },
  tabActive: { backgroundColor: "#FFD700" },
  tabText: { color: "#aaa", fontSize: 14, fontWeight: "600" },
  tabTextActive: { color: "#000" },
  section: { marginBottom: 24 },
  sectionTitle: { color: "#FFD700", fontSize: 15, fontWeight: "600", marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  providerBtn: { backgroundColor: "#111", padding: 16, borderRadius: 16, width: "48%", alignItems: "center", marginBottom: 12, borderWidth: 1, borderColor: "#222" },
  providerBtnActive: { borderColor: "#FFD700", borderWidth: 2 },
  providerText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  providerTextActive: { color: "#FFD700" },
  inputBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#111", padding: 16, borderRadius: 16 },
  input: { color: "#fff", marginLeft: 12, fontSize: 16 },
  amountGrid: { flexDirection: "row", justifyContent: "space-between" },
  amountBtn: { backgroundColor: "#111", paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, borderWidth: 1, borderColor: "#222" },
  amountBtnActive: { backgroundColor: "#FFD700", borderColor: "#FFD700" },
  amountBtnText: { color: "#fff", fontWeight: "600" },
  amountBtnTextActive: { color: "#000" },
  buyButton: { backgroundColor: "#FFD700", paddingVertical: 16, borderRadius: 16, alignItems: "center", marginBottom: 40 },
  buyButtonText: { color: "#000", fontSize: 16, fontWeight: "700" },
});