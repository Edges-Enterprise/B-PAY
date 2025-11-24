// app/bundles.tsx
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const bundles = {
  local: [
    { name: "MTN 1GB", price: "₦300", validity: "7 days" },
    { name: "Airtel 2GB", price: "₦500", validity: "30 days" },
    { name: "Glo 5GB", price: "₦1,200", validity: "30 days" },
    { name: "9mobile 10GB", price: "₦2,500", validity: "30 days" },
  ],
  international: [
    { name: "Vodafone 500MB", price: "$2", validity: "3 days" },
    { name: "AT&T 1GB", price: "$5", validity: "7 days" },
    { name: "Verizon 2GB", price: "$10", validity: "30 days" },
    { name: "Orange 5GB", price: "$20", validity: "30 days" },
  ],
};

export default function Bundles() {
  const [tab, setTab] = useState<"local" | "international">("local");

  return (
    <SafeAreaView style={styles.container}>
      <Image source={require("../../assets/icons/home.png")} style={styles.watermark} resizeMode="contain" />
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#FFD700" />
          </TouchableOpacity>
          <Text style={styles.title}>Buy Data Bundle</Text>
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
          {bundles[tab].map((bundle, i) => (
            <TouchableOpacity key={i} style={styles.bundleCard}>
              <View>
                <Text style={styles.bundleName}>{bundle.name}</Text>
                <Text style={styles.bundleValidity}>{bundle.validity}</Text>
              </View>
              <View style={styles.bundleRight}>
                <Text style={styles.bundlePrice}>{bundle.price}</Text>
                <Ionicons name="chevron-forward" size={20} color="#FFD700" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
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
  section: { marginBottom: 40 },
  bundleCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#111", padding: 16, borderRadius: 16, marginBottom: 12 },
  bundleName: { color: "#fff", fontSize: 16, fontWeight: "600" },
  bundleValidity: { color: "#aaa", fontSize: 13, marginTop: 2 },
  bundleRight: { alignItems: "flex-end" },
  bundlePrice: { color: "#FFD700", fontSize: 16, fontWeight: "700" },
});