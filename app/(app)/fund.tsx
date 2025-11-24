// app/fund.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Dimensions,
} from "react-native";
import { FontAwesome5, MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";

const SCREEN_WIDTH = Dimensions.get("window").width;

// Dummy Account Data (after generating)
const dummyNgnAccount = {
  bankName: "B-Pay Bank",
  accountNumber: "1234567890",
  accountName: "John Doe",
};

export default function Fund() {
  const [ngnAccount, setNgnAccount] = useState<typeof dummyNgnAccount | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateNgn = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setNgnAccount(dummyNgnAccount);
      setIsGenerating(false);
    }, 800); // Simulate network delay
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ---------- WATERMARK (PNG Image) ---------- */}
      <Image
        source={require("../../assets/icons/home.png")}
        style={styles.watermark}
        resizeMode="contain"
      />

      {/* ---------- PAGE CONTENT ---------- */}
      <View style={styles.content}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#FFD700" />
          </TouchableOpacity>
          <Text style={styles.title}>Fund Wallet</Text>
        </View>

        {/* DUAL CURRENCY WALLETS */}
        <View style={styles.walletContainer}>
          {/* NGN WALLET */}
          <View style={styles.walletCard}>
            <View style={styles.currencyHeader}>
              <Text style={styles.currencyLabel}>NGN</Text>
              <MaterialCommunityIcons name="currency-ngn" size={20} color="#FFD700" />
            </View>
            <Text style={styles.balance}>₦0.00</Text>
            <Text style={styles.subBalance}>$0.00</Text>

            {/* Generate NGN Account */}
            {!ngnAccount ? (
              <TouchableOpacity
                style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]}
                onPress={handleGenerateNgn}
                disabled={isGenerating}
              >
                <Text style={styles.generateButtonText}>
                  {isGenerating ? "Generating..." : "Generate NGN Account"}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.accountDetails}>
                <Text style={styles.bankName}>{ngnAccount.bankName}</Text>
                <Text style={styles.accountNumber}>{ngnAccount.accountNumber}</Text>
                <Text style={styles.accountName}>{ngnAccount.accountName}</Text>
              </View>
            )}
          </View>

          {/* USD WALLET */}
          <View style={styles.walletCard}>
            <View style={styles.currencyHeader}>
              <Text style={styles.currencyLabel}>USD</Text>
              <MaterialCommunityIcons name="currency-usd" size={20} color="#FFD700" />
              {/* Padlock Icon */}
              <FontAwesome5 name="lock" size={16} color="#FFD700" style={styles.lockIcon} />
            </View>
            <Text style={styles.balance}>$0.00</Text>
            <Text style={styles.subBalance}>₦0.00</Text>

            <View style={styles.usdNote}>
              <Text style={styles.usdNoteText}>Locked for conversion</Text>
            </View>
          </View>
        </View>

        {/* CONVERT BUTTON */}
        <View style={styles.convertSection}>
          <TouchableOpacity style={styles.convertButton}>
            <View style={styles.convertIconCircle}>
              <MaterialCommunityIcons name="swap-horizontal" size={28} color="#FFD700" />
            </View>
            <Text style={styles.convertText}>Convert NGN to USD</Text>
          </TouchableOpacity>
        </View>

        {/* FUNDING OPTIONS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>FUNDING OPTIONS</Text>

          <TouchableOpacity style={styles.transferOption}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="bank-transfer" size={24} color="#FFD700" />
            </View>
            <View style={styles.transferText}>
              <Text style={styles.transferTitle}>Bank Transfer</Text>
              <Text style={styles.transferSubtitle}>Fund via local bank</Text>
            </View>
            <FontAwesome5 name="chevron-right" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.transferOption}>
            <View style={styles.iconCircle}>
              <Ionicons name="card" size={24} color="#FFD700" />
            </View>
            <View style={styles.transferText}>
              <Text style={styles.transferTitle}>Card Deposit</Text>
              <Text style={styles.transferSubtitle}>Visa, Mastercard, Verve</Text>
            </View>
            <FontAwesome5 name="chevron-right" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.transferOption}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="qrcode-scan" size={24} color="#FFD700" />
            </View>
            <View style={styles.transferText}>
              <Text style={styles.transferTitle}>Scan QR Code</Text>
              <Text style={styles.transferSubtitle}>Pay with mobile app</Text>
            </View>
            <FontAwesome5 name="chevron-right" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

/* -------------------------- STYLES -------------------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    paddingHorizontal: 16,
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
    justifyContent: "flex-start",
    paddingTop: 20,
    zIndex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
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
  walletContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  walletCard: {
    backgroundColor: "#111",
    borderRadius: 16,
    padding: 16,
    width: SCREEN_WIDTH * 0.44,
    borderWidth: 1,
    borderColor: "#222",
  },
  currencyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  currencyLabel: {
    color: "#FFD700",
    fontSize: 14,
    fontWeight: "600",
  },
  lockIcon: {
    marginLeft: 4,
  },
  balance: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
  },
  subBalance: {
    color: "#aaa",
    fontSize: 12,
    marginBottom: 12,
  },
  generateButton: {
    backgroundColor: "#FFD700",
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    color: "#000",
    fontWeight: "600",
    fontSize: 13,
  },
  accountDetails: {
    marginTop: 8,
  },
  bankName: {
    color: "#FFD700",
    fontSize: 13,
    fontWeight: "600",
  },
  accountNumber: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 1,
  },
  accountName: {
    color: "#aaa",
    fontSize: 12,
  },
  usdNote: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#1a1a1a",
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  usdNoteText: {
    color: "#aaa",
    fontSize: 11,
  },
  convertSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  convertButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FFD700",
  },
  convertIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  convertText: {
    color: "#FFD700",
    fontSize: 15,
    fontWeight: "600",
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
  transferOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  transferText: {
    flex: 1,
  },
  transferTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  transferSubtitle: {
    color: "#aaa",
    fontSize: 13,
    marginTop: 2,
  },
});