// app/help.tsx
'use client';

import React from "react";
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image, ScrollView } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

export default function Help() {
  return (
    <SafeAreaView style={styles.container}>
      <Image source={require("@/assets/icons/home.png")} style={styles.watermark} resizeMode="contain" />
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#FFD700" />
          </TouchableOpacity>
          <Text style={styles.title}>Help Center</Text>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#aaa" />
          <Text style={styles.searchText}>Search for help...</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>POPULAR TOPICS</Text>
          {["How to fund wallet", "Virtual card usage", "Vault locking", "Transaction issues", "Security tips"].map((topic, i) => (
            <TouchableOpacity key={i} style={styles.topicItem}>
              <MaterialCommunityIcons name="help-circle-outline" size={20} color="#FFD700" />
              <Text style={styles.topicText}>{topic}</Text>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.contactCard}>
          <MaterialCommunityIcons name="headset" size={32} color="#FFD700" />
          <Text style={styles.contactTitle}>Need Live Help?</Text>
          <Text style={styles.contactDesc}>Chat with support 24/7</Text>
          <TouchableOpacity style={styles.chatButton}>
            <Text style={styles.chatText}>Start Chat</Text>
          </TouchableOpacity>
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
  searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#111", padding: 16, borderRadius: 16, marginBottom: 28 },
  searchText: { color: "#aaa", marginLeft: 12, fontSize: 15 },
  section: { marginBottom: 28 },
  sectionTitle: { color: "#FFD700", fontSize: 15, fontWeight: "600", marginBottom: 12 },
  topicItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#111", padding: 16, borderRadius: 16, marginBottom: 12 },
  topicText: { color: "#fff", flex: 1, marginLeft: 12, fontSize: 15 },
  contactCard: { backgroundColor: "#111", padding: 24, borderRadius: 16, alignItems: "center", marginBottom: 40 },
  contactTitle: { color: "#fff", fontSize: 18, fontWeight: "700", marginTop: 12 },
  contactDesc: { color: "#aaa", fontSize: 14, marginTop: 4 },
  chatButton: { backgroundColor: "#FFD700", paddingHorizontal: 32, paddingVertical: 12, borderRadius: 12, marginTop: 16 },
  chatText: { color: "#000", fontWeight: "700" },
});