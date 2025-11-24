// app/light.tsx
import React from "react";
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

export default function Light() {
  return (
    <SafeAreaView style={styles.container}>
      {/* ---------- WATERMARK: ANUBIS SEAL (NOW YELLOW & VISIBLE) ---------- */}
      <Image
        source={require("../../assets/icons/nu.png")}
        style={styles.watermark}
        resizeMode="contain"
        tintColor="#FFD700" // This makes nu.png glow in occult gold
      />

      {/* ---------- HERO: THE LOCKING ---------- */}
      <View style={styles.hero}>
        <View style={styles.lightningBolt}>
          <Ionicons name="flash" size={80} color="#FFD700" style={styles.boltIcon} />
        </View>
        <Text style={styles.heroTitle}>
          You are now Locked into The Anubis
        </Text>
        <Text style={styles.heroSubtitle}>
          Your Energy is Bound. Your Power Awakens.
        </Text>
      </View>

      {/* ---------- ENERGY DASHBOARD ---------- */}
      <View style={styles.dashboard}>
        <Text style={styles.dashboardTitle}>Energy Vault</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Energy Level</Text>
            <Text style={styles.statValue}>85 [Lightning Bolt]</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Rituals Completed</Text>
            <Text style={styles.statValue}>12</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Dares Sealed</Text>
            <Text style={styles.statValue}>5</Text>
          </View>
        </View>
      </View>

      {/* ---------- LIGHTNING DARES ---------- */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Lightning Dares / Challenge Duels</Text>
        <Text style={styles.sectionDesc}>
          Bind 5 souls with a dare. Complete the pact — double your energy.
        </Text>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionText}>Invoke Dare</Text>
        </TouchableOpacity>
      </View>

      {/* ---------- FLASH INVESTMENTS ---------- */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Flash Investments / Micro-Bets</Text>
        <Text style={styles.sectionDesc}>
          Offer tribute. Watch your energy multiply in the void.
        </Text>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionText}>Invest in Shadow</Text>
        </TouchableOpacity>
      </View>

      {/* ---------- LIGHTNING MISSIONS ---------- */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Lightning Missions</Text>
        <View style={styles.missionList}>
          <View style={styles.missionItem}>
            <Text style={styles.missionText}>Sacrifice $5 to the Vault [Lightning Bolt]</Text>
          </View>
          <View style={styles.missionItem}>
            <Text style={styles.missionText}>Round up offerings to fuel the flame [Lightning Bolt]</Text>
          </View>
          <View style={styles.missionItem}>
            <Text style={styles.missionText}>Seal a dare with blood & lightning [Lightning Bolt]</Text>
          </View>
        </View>
      </View>

      {/* ---------- ENERGY PACKS ---------- */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Unlock Your Energy Packs</Text>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionText}>Open Obsidian Pack</Text>
        </TouchableOpacity>
      </View>

      {/* ---------- ENERGY FLASHES ---------- */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Energy Flashes</Text>
        <Text style={styles.flashText}>
          [Lightning Bolt] You just offered $3. Double your energy — claim now.
        </Text>
      </View>

      {/* ---------- VAULT OF ENERGY ---------- */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Vault of Eternal Energy</Text>
        <Text style={styles.sectionDesc}>
          Store your power. Redeem forbidden perks.
        </Text>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionText}>Redeem Dark Perks</Text>
        </TouchableOpacity>
      </View>

      {/* ---------- SEND ENERGY BOOSTS ---------- */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Send Energy Boosts</Text>
        <Text style={styles.sectionDesc}>
          Gift a spark of power. Bind souls. Grow the coven.
        </Text>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionText}>Send Forbidden Spark</Text>
        </TouchableOpacity>
      </View>

      {/* ---------- FOOTER: THE PACT ---------- */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Exclusive. Dynamic. Empowering. Every transaction is a ritual.
        </Text>
      </View>
    </SafeAreaView>
  );
}

/* -------------------------- STYLES: DARK OCCULT AESTHETIC -------------------------- */
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
    opacity: 0.40,        // Slightly increased for visibility
    zIndex: 2,
    tintColor: "#FFD700", // This tints the PNG yellow
  },
  // HERO
  hero: {
    alignItems: "center",
    marginTop: 40,
    marginBottom: 30,
  },
  lightningBolt: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#FFD700",
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 10,
  },
  boltIcon: {
    textShadowColor: "#FFD700",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  heroTitle: {
    color: "#FFD700",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 1.2,
    textShadowColor: "#FFD700",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  heroSubtitle: {
    color: "#aaa",
    fontSize: 14,
    marginTop: 8,
    fontStyle: "italic",
  },
  // DASHBOARD
  dashboard: {
    marginBottom: 28,
  },
  dashboardTitle: {
    color: "#FFD700",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statCard: {
    backgroundColor: "#111",
    padding: 16,
    borderRadius: 16,
    width: SCREEN_WIDTH * 0.28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  statLabel: {
    color: "#aaa",
    fontSize: 12,
    fontWeight: "600",
  },
  statValue: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 4,
  },
  // SECTIONS
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    color: "#FFD700",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  sectionDesc: {
    color: "#ccc",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  actionButton: {
    backgroundColor: "#FFD700",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    alignSelf: "center",
  },
  actionText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 14,
  },
  // MISSIONS
  missionList: {
    marginTop: 8,
  },
  missionItem: {
    backgroundColor: "#111",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#FFD700",
  },
  missionText: {
    color: "#fff",
    fontSize: 14,
  },
  // FLASHES
  flashText: {
    color: "#FFD700",
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  // FOOTER
  footer: {
    marginTop: 20,
    marginBottom: 40,
    alignItems: "center",
  },
  footerText: {
    color: "#666",
    fontSize: 12,
    textAlign: "center",
    fontStyle: "italic",
    lineHeight: 18,
  },
});