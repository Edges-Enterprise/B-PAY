// app/bills.tsx
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
  Modal,
  FlatList,
  Dimensions,
} from "react-native";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";

const SCREEN_WIDTH = Dimensions.get("window").width;

// ── DUMMY BILL CATEGORIES ─────────────────────────────────────────────
const billCategories = {
  local: [
    { id: "1", name: "Electricity", icon: "flash", providers: ["IKEJA ELECTRIC", "EKO ELECTRIC", "PHCN", "ABUJA ELECTRIC"] },
    { id: "2", name: "Cable TV", icon: "tv", providers: ["DSTV", "GOTV", "STARTIMES", "SLTV"] },
    { id: "3", name: "Internet", icon: "wifi", providers: ["SPECTRANET", "SMILE", "SWIFT", "COOLINK"] },
    { id: "4", name: "Water", icon: "water", providers: ["LAGOS WATER CORP", "ABUJA WATER BOARD"] },
    { id: "5", name: "Betting", icon: "sports", providers: ["BET9JA", "SPORTYBET", "NAIRABET"] },
    { id: "6", name: "Education", icon: "school", providers: ["JAMB", "WAEC", "NECO", "UNILAG FEES"] },
  ],
  international: [
    { id: "7", name: "Netflix", icon: "film", providers: ["Netflix", "Disney+", "Hulu", "Amazon Prime"] },
    { id: "8", name: "Spotify", icon: "musical-notes", providers: ["Spotify Premium", "Apple Music"] },
    { id: "9", name: "Cloud", icon: "cloud", providers: ["AWS", "Google Cloud", "Microsoft Azure"] },
    { id: "10", name: "Insurance", icon: "shield-checkmark", providers: ["Allianz", "AXA", "MetLife"] },
  ],
};

export default function Bills() {
  const [tab, setTab] = useState<"local" | "international">("local");
  const [selectedCategory, setSelectedCategory] = useState<any | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [meterId, setMeterId] = useState("");
  const [amount, setAmount] = useState("");
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handlePay = () => {
    if (!selectedProvider || !meterId || !amount) return;
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      resetForm();
    }, 2000);
  };

  const resetForm = () => {
    setSelectedProvider(null);
    setMeterId("");
    setAmount("");
    setSelectedCategory(null);
  };

  const quickAmounts = ["1,000", "2,500", "5,000", "10,000"];

  return (
    <SafeAreaView style={styles.container}>
      {/* WATERMARK */}
      <Image
        source={require("../../assets/icons/home.png")}
        style={styles.watermark}
        resizeMode="contain"
      />

      <ScrollView style={styles.content}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#FFD700" />
          </TouchableOpacity>
          <Text style={styles.title}>Pay Bills</Text>
        </View>

        {/* TAB SWITCHER */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, tab === "local" && styles.tabActive]}
            onPress={() => { setTab("local"); resetForm(); }}
          >
            <Text style={[styles.tabText, tab === "local" && styles.tabTextActive]}>Local</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === "international" && styles.tabActive]}
            onPress={() => { setTab("international"); resetForm(); }}
          >
            <Text style={[styles.tabText, tab === "international" && styles.tabTextActive]}>International</Text>
          </TouchableOpacity>
        </View>

        {/* BILL CATEGORIES GRID */}
        <View style={styles.grid}>
          {billCategories[tab].map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryCard,
                selectedCategory?.id === cat.id && styles.categoryCardActive,
              ]}
              onPress={() => {
                setSelectedCategory(cat);
                setShowProviderModal(true);
              }}
            >
              <View style={styles.iconCircle}>
                <Ionicons name={cat.icon} size={24} color={selectedCategory?.id === cat.id ? "#000" : "#FFD700"} />
              </View>
              <Text style={[
                styles.categoryName,
                selectedCategory?.id === cat.id && styles.categoryNameActive,
              ]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* PAYMENT FORM (Appears after provider selection) */}
        {selectedProvider && (
          <View style={styles.form}>
            <Text style={styles.formTitle}>Pay {selectedProvider}</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {selectedCategory.name === "Electricity" ? "Meter Number" : "Account ID / Email"}
              </Text>
              <View style={styles.input}>
                <MaterialIcons name="tag" size={18} color="#aaa" />
                <Text style={styles.inputText}>{meterId || "Enter here"}</Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Amount</Text>
              <View style={styles.amountGrid}>
                {quickAmounts.map((amt) => (
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

            <TouchableOpacity style={styles.payButton} onPress={handlePay}>
              <FontAwesome5 name="lock" size={18} color="#000" />
              <Text style={styles.payButtonText}>Pay Bill Securely</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* PROVIDER SELECTION MODAL */}
      <Modal visible={showProviderModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowProviderModal(false)}>
          <View style={styles.providerModal}>
            <Text style={styles.modalTitle}>Select Provider</Text>
            <FlatList
              data={selectedCategory?.providers || []}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.providerItem}
                  onPress={() => {
                    setSelectedProvider(item);
                    setShowProviderModal(false);
                  }}
                >
                  <Text style={styles.providerName}>{item}</Text>
                  <Ionicons name="checkmark" size={20} color="#FFD700" />
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* SUCCESS FEEDBACK */}
      <Modal visible={showSuccess} transparent animationType="fade">
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={48} color="#00FF7F" />
            </View>
            <Text style={styles.successTitle}>Payment Successful!</Text>
            <Text style={styles.successDesc}>
              ₦{amount} paid to {selectedProvider}
            </Text>
            <TouchableOpacity
              style={styles.closeSuccess}
              onPress={() => setShowSuccess(false)}
            >
              <Text style={styles.closeSuccessText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ─────────────────────────────── STYLES ─────────────────────────────── */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  watermark: {
    position: "absolute",
    top: "30%",
    left: "10%",
    width: 300,
    height: 300,
    opacity: 0.08,
    zIndex: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    zIndex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 28,
  },
  backButton: {
    padding: 4,
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
    marginLeft: 12,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#111",
    borderRadius: 16,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: "#FFD700",
  },
  tabText: {
    color: "#aaa",
    fontSize: 14,
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#000",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  categoryCard: {
    backgroundColor: "#111",
    width: SCREEN_WIDTH * 0.28,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#222",
  },
  categoryCardActive: {
    backgroundColor: "#FFD700",
    borderColor: "#FFD700",
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryName: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  categoryNameActive: {
    color: "#000",
  },
  form: {
    backgroundColor: "#111",
    padding: 20,
    borderRadius: 16,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: "#222",
  },
  formTitle: {
    color: "#FFD700",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    color: "#aaa",
    fontSize: 13,
    marginBottom: 8,
  },
  input: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    padding: 16,
    borderRadius: 12,
  },
  inputText: {
    color: "#fff",
    marginLeft: 12,
    fontSize: 15,
  },
  amountGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  amountBtn: {
    backgroundColor: "#1a1a1a",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#222",
  },
  amountBtnActive: {
    backgroundColor: "#FFD700",
    borderColor: "#FFD700",
  },
  amountBtnText: {
    color: "#fff",
    fontWeight: "600",
  },
  amountBtnTextActive: {
    color: "#000",
  },
  payButton: {
    flexDirection: "row",
    backgroundColor: "#FFD700",
    paddingVertical: 16,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
  },
  payButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  providerModal: {
    backgroundColor: "#111",
    width: "85%",
    borderRadius: 16,
    padding: 20,
    maxHeight: 500,
  },
  modalTitle: {
    color: "#FFD700",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
  },
  providerItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  providerName: {
    color: "#fff",
    fontSize: 15,
  },
  successOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  successCard: {
    backgroundColor: "#111",
    padding: 32,
    borderRadius: 20,
    alignItems: "center",
    width: "80%",
    borderWidth: 1,
    borderColor: "#00FF7F",
  },
  successIcon: {
    marginBottom: 16,
  },
  successTitle: {
    color: "#00FF7F",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  successDesc: {
    color: "#aaa",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
  },
  closeSuccess: {
    backgroundColor: "#00FF7F",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  closeSuccessText: {
    color: "#000",
    fontWeight: "700",
  },
});