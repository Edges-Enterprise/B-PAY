// app/ajo.tsx
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
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

const dummyAjo = [
  { id: "1", name: "House Fund", target: "₦500,000", saved: "₦320,000", members: 4, type: "group" },
  { id: "2", name: "Personal Goal", target: "₦100,000", saved: "₦65,000", members: 1, type: "solo" },
];

export default function Ajo() {
  const [showCreate, setShowCreate] = useState(false);
  const [ajoName, setAjoName] = useState("");
  const [target, setTarget] = useState("");
  const [contribution, setContribution] = useState("");
  const [frequency, setFrequency] = useState("daily");

  return (
    <SafeAreaView style={styles.container}>
      <Image source={require("../../assets/icons/home.png")} style={styles.watermark} resizeMode="contain" />
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#FFD700" />
          </TouchableOpacity>
          <Text style={styles.title}>Ajo Savings</Text>
        </View>

        <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(true)}>
          <MaterialCommunityIcons name="plus" size={24} color="#000" />
          <Text style={styles.createText}>Create New Ajo</Text>
        </TouchableOpacity>

        <View style={styles.section}>
          {dummyAjo.map((ajo) => (
            <View key={ajo.id} style={styles.ajoCard}>
              <View style={styles.ajoHeader}>
                <Text style={styles.ajoName}>{ajo.name}</Text>
                <View style={[styles.ajoBadge, ajo.type === "group" ? styles.groupBadge : styles.soloBadge]}>
                  <Text style={styles.ajoBadgeText}>{ajo.type === "group" ? "Group" : "Solo"}</Text>
                </View>
              </View>
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${(parseInt(ajo.saved.replace(/[^\d]/g, "")) / parseInt(ajo.target.replace(/[^\d]/g, ""))) * 100}%` }]} />
                </View>
                <Text style={styles.progressText}>{ajo.saved} / {ajo.target}</Text>
              </View>
              <Text style={styles.members}>{ajo.members} member{ajo.members > 1 ? "s" : ""}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* CREATE AJO MODAL */}
      <Modal visible={showCreate} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Create Ajo Plan</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Ajo Name</Text>
              <View style={styles.input}><Text style={styles.inputText}>{ajoName || "e.g. Vacation Fund"}</Text></View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Target Amount</Text>
              <View style={styles.input}><Text style={styles.inputText}>₦{target || "0"}</Text></View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Daily Contribution</Text>
              <View style={styles.input}><Text style={styles.inputText}>₦{contribution || "0"}</Text></View>
            </View>
            <View style={styles.freqGrid}>
              {["daily", "weekly", "monthly"].map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.freqBtn, frequency === f && styles.freqBtnActive]}
                  onPress={() => setFrequency(f)}
                >
                  <Text style={[styles.freqText, frequency === f && styles.freqTextActive]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCreate(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.createAjoBtn}>
                <Text style={styles.createAjoText}>Create Ajo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  createBtn: { flexDirection: "row", backgroundColor: "#FFD700", paddingVertical: 14, borderRadius: 16, justifyContent: "center", alignItems: "center", gap: 8, marginBottom: 24 },
  createText: { color: "#000", fontSize: 16, fontWeight: "700" },
  section: { marginBottom: 40 },
  ajoCard: { backgroundColor: "#111", padding: 16, borderRadius: 16, marginBottom: 12 },
  ajoHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  ajoName: { color: "#fff", fontSize: 16, fontWeight: "600" },
  ajoBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  groupBadge: { backgroundColor: "#003300" },
  soloBadge: { backgroundColor: "#330033" },
  ajoBadgeText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  progressContainer: { marginVertical: 8 },
  progressBar: { height: 8, backgroundColor: "#222", borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#00FF7F", borderRadius: 4 },
  progressText: { color: "#aaa", fontSize: 12, marginTop: 4 },
  members: { color: "#FFD700", fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "flex-end" },
  modal: { backgroundColor: "#111", padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalTitle: { color: "#FFD700", fontSize: 20, fontWeight: "700", textAlign: "center", marginBottom: 20 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { color: "#aaa", fontSize: 13, marginBottom: 6 },
  input: { backgroundColor: "#1a1a1a", padding: 16, borderRadius: 12 },
  inputText: { color: "#fff" },
  freqGrid: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  freqBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: "#1a1a1a", marginHorizontal: 4, alignItems: "center" },
  freqBtnActive: { backgroundColor: "#FFD700" },
  freqText: { color: "#fff", textTransform: "capitalize" },
  freqTextActive: { color: "#000" },
  modalActions: { flexDirection: "row", justifyContent: "space-between" },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: "#333", alignItems: "center", marginRight: 8 },
  cancelText: { color: "#aaa" },
  createAjoBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: "#FFD700", alignItems: "center", marginLeft: 8 },
  createAjoText: { color: "#000", fontWeight: "700" },
});