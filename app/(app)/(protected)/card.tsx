// app/CardsPage.tsx
'use client';

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Dimensions,
  Vibration,
  StatusBar,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─────────────────────────────────────────────────────────────────────────────
export default function CardsPage() {
  const [hasAccount, setHasAccount] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);

  const vibrate = () => Vibration.vibrate([0, 5]);

  const handleGetCard = () => {
    vibrate();
    setIsLoading(true);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setHasAccount(true);
            setIsLoading(false);
          }, 300);
          return 100;
        }
        return prev + 2;
      });
    }, 36); // ~1.8s total
  };

  // ── ONBOARDING (No Account) ─────────────────────────────────────────────
  if (!hasAccount) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <SafeAreaView style={styles.onboardingContainer}>
          {/* App Icon */}
          <Image source={require("@/assets/icons/nu.png")} style={styles.appIcon} resizeMode="contain" />

          {/* Title */}
          <Text style={styles.onboardingTitle}>B-PAY / MAKE GLOBAL PAYMENTS SEAMLESSLY</Text>

          {/* YOUR CARD IMAGE – NO SVG */}
          <View style={styles.cardsIllustration}>
            <Image
              source={require("@/assets/icons/r1.png")} // ← YOUR CARD PNG HERE
              style={styles.cardImage}
              resizeMode="contain"
            />
          </View>

          {/* Text */}
          <Text style={styles.onboardingMainText}>Get a global virtual card</Text>
          <Text style={styles.onboardingSubText}>
            Get a global virtual card in minutes.{"\n"}Make payment whenever you want.
          </Text>

          {/* Get Card Button */}
          <TouchableOpacity
            style={[styles.getCardButton, isLoading && styles.getCardButtonDisabled]}
            onPress={handleGetCard}
            disabled={isLoading}
          >
            <Text style={styles.getCardButtonText}>
              {isLoading ? "Generating..." : "Get Card"}
            </Text>
          </TouchableOpacity>

          {/* Progress Bar */}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
              <Text style={styles.progressText}>{progress}%</Text>
            </View>
          )}
        </SafeAreaView>
      </>
    );
  }

  // ── DASHBOARD (Has Account) ─────────────────────────────────────────────
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.profileRow}>
            <Image source={require("@/assets/icons/home.png")} style={styles.avatar} />
            <View>
              <Text style={styles.greeting}>Welcome, Back!</Text>
              <Text style={styles.name}>Isabella Ava</Text>
            </View>
          </View>
          <TouchableOpacity onPress={vibrate}>
            <Ionicons name="notifications-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Balance Card */}
        <LinearGradient
          colors={["#FF5E8E", "#FF2E63"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceLabel}>Current Balance</Text>
            <Image source={require("@/assets/icons/nu.png")} style={styles.mastercard} />
          </View>
          <Text style={styles.balanceAmount}>$4,570.80</Text>
          <View style={styles.cardNumberRow}>
            <Text style={styles.cardNumber}>5294 2436 4780 2468</Text>
            <Text style={styles.expiry}>12/24</Text>
          </View>
        </LinearGradient>

        {/* Account Overview */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Account Overview</Text>
        </View>
        <View style={styles.overviewRow}>
          <View style={styles.overviewBox}>
            <View style={styles.iconCircleIncome}>
              <Ionicons name="arrow-down" size={20} color="#00FF7F" />
            </View>
            <Text style={styles.overviewAmount}>$4,302.00</Text>
            <Text style={styles.overviewLabel}>Income</Text>
          </View>
          <View style={styles.overviewBox}>
            <View style={styles.iconCircleExpense}>
              <Ionicons name="arrow-up" size={20} color="#FF4444" />
            </View>
            <Text style={styles.overviewAmount}>$4,302.00</Text>
            <Text style={styles.overviewLabel}>Expenses</Text>
          </View>
        </View>

        {/* Transactions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Transactions</Text>
          <TouchableOpacity onPress={vibrate}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          {[
            { id: "1", name: "Spotify Subscription", time: "9:00 AM 07 Mar 2025", amount: "-$40.00" },
            { id: "2", name: "Creator Payment", time: "9:00 AM 07 Mar 2025", amount: "+$40.00" },
          ].map((tx) => (
            <TouchableOpacity key={tx.id} style={styles.transactionItem} onPress={vibrate}>
              <View style={styles.transactionLeft}>
                <Image source={require("@/assets/icons/nu.png")} style={styles.transactionIcon} />
                <View>
                  <Text style={styles.transactionName}>{tx.name}</Text>
                  <Text style={styles.transactionTime}>{tx.time}</Text>
                </View>
              </View>
              <Text
                style={[
                  styles.transactionAmount,
                  { color: tx.amount.startsWith("+") ? "#00FF7F" : "#FF4444" },
                ]}
              >
                {tx.amount}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* FAB */}
        <TouchableOpacity style={styles.fab} onPress={vibrate}>
          <Ionicons name="add" size={32} color="#fff" />
        </TouchableOpacity>

        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItemActive}>
            <Ionicons name="home" size={24} color="#FF5E8E" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Ionicons name="swap-horizontal" size={24} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <View style={styles.fabPlaceholder} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Ionicons name="card-outline" size={24} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Ionicons name="person-outline" size={24} color="#666" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
}

/* ─────────────────────────────── STYLES ─────────────────────────────── */
const styles = StyleSheet.create({
  // ── ONBOARDING ──
  onboardingContainer: {
    flex: 1,
    backgroundColor: "#000",
    paddingHorizontal: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  appIcon: {
    width: 80,
    height: 80,
    marginBottom: 20,
  },
  onboardingTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 1.5,
    marginBottom: 40,
  },
  cardsIllustration: {
    marginBottom: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  cardImage: {
    width: SCREEN_WIDTH * 0.85,
    height: 200,
    resizeMode: "contain",
  },
  onboardingMainText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },
  onboardingSubText: {
    color: "#aaa",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 40,
  },
  getCardButton: {
    backgroundColor: "#FF2E63",
    width: "100%",
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: "center",
    marginBottom: 16,
  },
  getCardButtonDisabled: {
    opacity: 0.7,
  },
  getCardButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  loadingContainer: {
    width: "100%",
    alignItems: "center",
  },
  progressBar: {
    height: 8,
    width: "100%",
    backgroundColor: "#333",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#00FF7F",
    borderRadius: 4,
  },
  progressText: {
    color: "#00FF7F",
    fontSize: 14,
    fontWeight: "600",
  },

  // ── DASHBOARD ──
  container: {
    flex: 1,
    backgroundColor: "#000",
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  greeting: {
    color: "#aaa",
    fontSize: 13,
  },
  name: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  balanceCard: {
    marginTop: 24,
    borderRadius: 20,
    padding: 20,
    paddingBottom: 24,
  },
  balanceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  balanceLabel: {
    color: "#fff",
    fontSize: 14,
    opacity: 0.8,
  },
  mastercard: {
    width: 48,
    height: 30,
    resizeMode: "contain",
  },
  balanceAmount: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "700",
    letterSpacing: 1,
  },
  cardNumberRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  cardNumber: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
    letterSpacing: 2,
  },
  expiry: {
    color: "#fff",
    fontSize: 14,
    opacity: 0.8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 32,
    marginBottom: 12,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  seeAll: {
    color: "#FF5E8E",
    fontSize: 14,
  },
  overviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  overviewBox: {
    backgroundColor: "#111",
    borderRadius: 16,
    padding: 16,
    width: SCREEN_WIDTH * 0.44,
    alignItems: "center",
  },
  iconCircleIncome: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#003300",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  iconCircleExpense: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#330000",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  overviewAmount: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  overviewLabel: {
    color: "#aaa",
    fontSize: 13,
    marginTop: 4,
  },
  transactionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#111",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  transactionLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  transactionName: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  transactionTime: {
    color: "#aaa",
    fontSize: 12,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: "700",
  },
  fab: {
    position: "absolute",
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FF2E63",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#FF2E63",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#111",
    borderRadius: 20,
    paddingVertical: 12,
    marginTop: 20,
    marginBottom: 10,
  },
  navItem: {
    padding: 8,
  },
  navItemActive: {
    padding: 8,
  },
  fabPlaceholder: {
    width: 56,
    height: 56,
  },
});