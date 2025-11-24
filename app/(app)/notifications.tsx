// app/notifications.tsx
'use client';

import React from "react";
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const notifications = [
  { id: "1", title: "₦50,000 Received", desc: "Bank Transfer from Chukwuemeka", time: "2 mins ago", type: "local", icon: "arrow-down" },
  { id: "2", title: "$100 Sent", desc: "To John Smith (USA)", time: "1 hour ago", type: "foreign", icon: "arrow-up" },
  { id: "3", title: "Vault Matured", desc: "₦100,000 + ₦15,000 interest unlocked", time: "3 hours ago", type: "service", icon: "shield-check" },
  { id: "4", title: "Security Alert", desc: "New login from Lagos", time: "5 hours ago", type: "service", icon: "alert" },
];

export default function Notifications() {
  return (
    <SafeAreaView style={styles.container}>
      <Image source={require("../../assets/icons/home.png")} style={styles.watermark} resizeMode="contain" />
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#FFD700" />
          </TouchableOpacity>
          <Text style={styles.title}>Notifications</Text>
        </View>

        {["local", "foreign", "service"].map((type) => (
          <View key={type} style={styles.section}>
            <Text style={styles.sectionTitle}>
              {type === "local" ? "Local Transactions" : type === "foreign" ? "Foreign Transactions" : "Service Activities"}
            </Text>
            {notifications
              .filter(n => n.type === type)
              .map((n) => (
                <TouchableOpacity key={n.id} style={styles.notifItem}>
                  <View style={styles.notifIcon}>
                    <Ionicons name={n.icon} size={20} color="#FFD700" />
                  </View>
                  <View style={styles.notifText}>
                    <Text style={styles.notifTitle}>{n.title}</Text>
                    <Text style={styles.notifDesc}>{n.desc}</Text>
                  </View>
                  <Text style={styles.notifTime}>{n.time}</Text>
                </TouchableOpacity>
              ))}
          </View>
        ))}
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
  section: { marginBottom: 28 },
  sectionTitle: { color: "#FFD700", fontSize: 15, fontWeight: "600", marginBottom: 12 },
  notifItem: { flexDirection: "row", backgroundColor: "#111", padding: 16, borderRadius: 16, marginBottom: 12, alignItems: "center" },
  notifIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#1a1a1a", justifyContent: "center", alignItems: "center", marginRight: 16 },
  notifText: { flex: 1 },
  notifTitle: { color: "#fff", fontSize: 15, fontWeight: "600" },
  notifDesc: { color: "#aaa", fontSize: 13 },
  notifTime: { color: "#666", fontSize: 12 },
});