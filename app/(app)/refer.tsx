// app/refer.tsx
'use client';

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ScrollView,
} from "react-native";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";

export default function Refer() {
  const referralCode = "BAY12345";
  const earnings = "₦45,000";

  return (
    <SafeAreaView style={styles.container}>
      <Image source={require("../../assets/icons/home.png")} style={styles.watermark} resizeMode="contain" />
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#FFD700" />
          </TouchableOpacity>
          <Text style={styles.title}>Refer & Earn</Text>
        </View>

        <View style={styles.earnCard}>
          <Text style={styles.earnLabel}>Total Earnings</Text>
          <Text style={styles.earnAmount}>{earnings}</Text>
          <Text style={styles.earnSub}>From 23 successful referrals</Text>
        </View>

        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>Your Referral Code</Text>
          <View style={styles.codeBox}>
            <Text style={styles.code}>{referralCode}</Text>
            <TouchableOpacity style={styles.copyBtn}>
              <FontAwesome5 name="copy" size={18} color="#000" />
            </TouchableOpacity>
          </View>
          <Text style={styles.codeInfo}>Share with friends to earn ₦2,000 per referral</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <View style={styles.step}>
            <View style={styles.stepIcon}>
              <Text style={styles.stepNumber}>1</Text>
            </View>
            <Text style={styles.stepText}>Share your code with friends</Text>
          </View>
          <View style={styles.step}>
            <View style={styles.stepIcon}>
              <Text style={styles.stepNumber}>2</Text>
            </View>
            <Text style={styles.stepText}>They sign up and fund ₦5,000+</Text>
          </View>
          <View style={styles.step}>
            <View style={styles.stepIcon}>
              <Text style={styles.stepNumber}>3</Text>
            </View>
            <Text style={styles.stepText}>You earn ₦2,000 instantly!</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.shareButton}>
          <Ionicons name="share-social" size={24} color="#000" />
          <Text style={styles.shareText}>Share Referral Link</Text>
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
  earnCard: { backgroundColor: "#111", padding: 24, borderRadius: 16, alignItems: "center", marginBottom: 24 },
  earnLabel: { color: "#aaa", fontSize: 14 },
  earnAmount: { color: "#00FF7F", fontSize: 36, fontWeight: "700", marginVertical: 8 },
  earnSub: { color: "#aaa", fontSize: 13 },
  codeCard: { backgroundColor: "#111", padding: 20, borderRadius: 16, alignItems: "center", marginBottom: 28 },
  codeLabel: { color: "#FFD700", fontSize: 15, fontWeight: "600", marginBottom: 12 },
  codeBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#1a1a1a", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginBottom: 8 },
  code: { color: "#FFD700", fontSize: 24, fontWeight: "700", letterSpacing: 2 },
  copyBtn: { marginLeft: 12, backgroundColor: "#FFD700", padding: 8, borderRadius: 8 },
  codeInfo: { color: "#aaa", fontSize: 13, textAlign: "center" },
  section: { marginBottom: 28 },
  sectionTitle: { color: "#FFD700", fontSize: 16, fontWeight: "600", marginBottom: 16 },
  step: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  stepIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#FFD700", justifyContent: "center", alignItems: "center", marginRight: 12 },
  stepNumber: { color: "#000", fontWeight: "700" },
  stepText: { color: "#fff", fontSize: 15, flex: 1 },
  shareButton: { flexDirection: "row", backgroundColor: "#FFD700", paddingVertical: 16, borderRadius: 16, justifyContent: "center", alignItems: "center", gap: 12, marginBottom: 40 },
  shareText: { color: "#000", fontSize: 16, fontWeight: "700" },
});