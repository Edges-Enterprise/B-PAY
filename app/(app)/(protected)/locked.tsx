// app/vault.tsx
'use client';

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
} from "react-native";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";

const SCREEN_WIDTH = Dimensions.get("window").width;

// Dummy Vault Plans
const vaultPlans = [
  { id: "1", duration: "30 Days", apy: "8%", min: "₦10,000", color: "#FFD700" },
  { id: "2", duration: "90 Days", apy: "12%", min: "₦50,000", color: "#FF5E8E" },
  { id: "3", duration: "180 Days", apy: "15%", min: "₦100,000", color: "#00FF7F" },
  { id: "4", duration: "365 Days", apy: "18%", min: "₦500,000", color: "#6C5CE7" },
];

export default function Vault() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [lockAmount, setLockAmount] = useState("");
  const [isLocking, setIsLocking] = useState(false);
  const [activeVaults, setActiveVaults] = useState<any[]>([]);

  const handleLock = () => {
    if (!selectedPlan || !lockAmount || parseFloat(lockAmount) < 10000) return;

    setIsLocking(true);
    setTimeout(() => {
      const plan = vaultPlans.find(p => p.id === selectedPlan);
      const newVault = {
        id: Date.now().toString(),
        plan: plan?.duration,
        amount: `₦${parseFloat(lockAmount).toLocaleString()}`,
        apy: plan?.apy,
        startDate: new Date().toLocaleDateString("en-GB"),
        maturityDate: new Date(Date.now() + (parseInt(plan?.duration || "30") * 24 * 60 * 60 * 1000)).toLocaleDateString("en-GB"),
        interest: `₦${Math.floor(parseFloat(lockAmount) * (parseFloat(plan?.apy || "8") / 100) * (parseInt(plan?.duration || "30") / 365)).toLocaleString()}`,
      };
      setActiveVaults([newVault, ...activeVaults]);
      setLockAmount("");
      setSelectedPlan(null);
      setIsLocking(false);
    }, 1200);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ---------- WATERMARK (Same as Fund Page) ---------- */}
      <Image
        source={require("@/assets/icons/home.png")}
        style={styles.watermark}
        resizeMode="contain"
      />

      {/* ---------- PAGE CONTENT ---------- */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#FFD700" />
          </TouchableOpacity>
          <Text style={styles.title}>B-Pay Vault</Text>
        </View>

        {/* HERO SECTION */}
        <View style={styles.hero}>
          <View style={styles.vaultIcon}>
            <MaterialCommunityIcons name="shield-lock" size={48} color="#FFD700" />
          </View>
          <Text style={styles.heroTitle}>Lock & Earn Up to 18% APY</Text>
          <Text style={styles.heroSubtitle}>Secure your funds. Grow your wealth.</Text>
        </View>

        {/* VAULT PLANS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose Your Lock Period</Text>
          <View style={styles.plansGrid}>
            {vaultPlans.map((plan) => (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.planCard,
                  selectedPlan === plan.id && { borderColor: plan.color, borderWidth: 2 },
                ]}
                onPress={() => setSelectedPlan(plan.id)}
              >
                <View style={[styles.planBadge, { backgroundColor: plan.color }]}>
                  <Text style={styles.planBadgeText}>{plan.apy}</Text>
                </View>
                <Text style={styles.planDuration}>{plan.duration}</Text>
                <Text style={styles.planMin}>Min: {plan.min}</Text>
                {selectedPlan === plan.id && (
                  <View style={styles.checkIcon}>
                    <Ionicons name="checkmark" size={20} color="#000" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* LOCK FORM */}
        {selectedPlan && (
          <View style={styles.lockForm}>
            <Text style={styles.formLabel}>Enter Amount to Lock</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.currencyPrefix}>₦</Text>
              <Text style={styles.input}>{lockAmount || "0"}</Text>
            </View>
            <View style={styles.quickAmounts}>
              {["50,000", "100,000", "500,000"].map((amt) => (
                <TouchableOpacity
                  key={amt}
                  style={styles.quickBtn}
                  onPress={() => setLockAmount(amt.replace(/,/g, ""))}
                >
                  <Text style={styles.quickBtnText}>₦{amt}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.lockButton, isLocking && styles.lockButtonDisabled]}
              onPress={handleLock}
              disabled={isLocking}
            >
              <MaterialCommunityIcons name="lock" size={20} color="#000" />
              <Text style={styles.lockButtonText}>
                {isLocking ? "Locking Funds..." : "Lock Funds"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ACTIVE VAULTS */}
        {activeVaults.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Vaults</Text>
            {activeVaults.map((vault) => (
              <View key={vault.id} style={styles.activeVaultCard}>
                <View style={styles.vaultHeader}>
                  <View style={styles.vaultPlan}>
                    <MaterialCommunityIcons name="clock-outline" size={18} color="#FFD700" />
                    <Text style={styles.vaultPlanText}>{vault.plan}</Text>
                  </View>
                  <View style={[styles.apyBadge, { backgroundColor: "#FFD700" }]}>
                    <Text style={styles.apyBadgeText}>{vault.apy} APY</Text>
                  </View>
                </View>
                <Text style={styles.vaultAmount}>{vault.amount}</Text>
                <View style={styles.vaultDates}>
                  <Text style={styles.dateLabel}>Started:</Text>
                  <Text style={styles.dateValue}>{vault.startDate}</Text>
                </View>
                <View style={styles.vaultDates}>
                  <Text style={styles.dateLabel}>Matures:</Text>
                  <Text style={styles.dateValue}>{vault.maturityDate}</Text>
                </View>
                <View style={styles.vaultInterest}>
                  <Text style={styles.interestLabel}>Est. Interest:</Text>
                  <Text style={styles.interestValue}>{vault.interest}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* INFO CARD */}
        <View style={styles.infoCard}>
          <FontAwesome5 name="info-circle" size={20} color="#FFD700" />
          <Text style={styles.infoText}>
            Funds are locked until maturity. Early withdrawal may incur penalties.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* -------------------------- STYLES -------------------------- */
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
  hero: {
    alignItems: "center",
    marginBottom: 32,
  },
  vaultIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#FFD700",
  },
  heroTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  heroSubtitle: {
    color: "#aaa",
    fontSize: 14,
    marginTop: 4,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
  },
  plansGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  planCard: {
    backgroundColor: "#111",
    borderRadius: 16,
    padding: 16,
    width: SCREEN_WIDTH * 0.44,
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#222",
    position: "relative",
  },
  planBadge: {
    position: "absolute",
    top: -10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  planBadgeText: {
    color: "#000",
    fontSize: 12,
    fontWeight: "700",
  },
  planDuration: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 8,
  },
  planMin: {
    color: "#aaa",
    fontSize: 12,
    marginTop: 4,
  },
  checkIcon: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFD700",
    justifyContent: "center",
    alignItems: "center",
  },
  lockForm: {
    backgroundColor: "#111",
    borderRadius: 16,
    padding: 20,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: "#222",
  },
  formLabel: {
    color: "#FFD700",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 20,
    marginBottom: 16,
  },
  currencyPrefix: {
    color: "#FFD700",
    fontSize: 28,
    fontWeight: "700",
    marginRight: 8,
  },
  input: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
    flex: 1,
  },
  quickAmounts: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  quickBtn: {
    backgroundColor: "#1a1a1a",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  quickBtnText: {
    color: "#FFD700",
    fontSize: 13,
    fontWeight: "600",
  },
  lockButton: {
    backgroundColor: "#FFD700",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  lockButtonDisabled: {
    opacity: 0.6,
  },
  lockButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "700",
  },
  activeVaultCard: {
    backgroundColor: "#111",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#222",
  },
  vaultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  vaultPlan: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  vaultPlanText: {
    color: "#FFD700",
    fontSize: 14,
    fontWeight: "600",
  },
  apyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  apyBadgeText: {
    color: "#000",
    fontSize: 11,
    fontWeight: "700",
  },
  vaultAmount: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  vaultDates: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  dateLabel: {
    color: "#aaa",
    fontSize: 12,
  },
  dateValue: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  vaultInterest: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#222",
  },
  interestLabel: {
    color: "#aaa",
    fontSize: 13,
  },
  interestValue: {
    color: "#00FF7F",
    fontSize: 15,
    fontWeight: "700",
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#1a1a1a",
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 40,
  },
  infoText: {
    color: "#aaa",
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
});