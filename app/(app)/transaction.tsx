// app/transactions.tsx
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
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

const categories = ["All", "Bank Deposit", "Transfer From", "Transfer To", "Airtime", "Data", "Cash Deposit", "Card Payment", "Electricity", "Locked", "SMS", "Subscription", "Spend & Save"];
const statuses = ["All", "Successful", "Pending", "Failed", "Reversed"];
const months = ["November 2025", "October 2025", "September 2025"];

const dummyTransactions = [
  { id: "1", type: "Bank Deposit", amount: "+₦50,000", status: "Successful", date: "15 Nov 2025", time: "2:30 PM" },
  { id: "2", type: "Transfer To", amount: "-₦10,000", status: "Successful", date: "14 Nov 2025", time: "11:15 AM" },
  { id: "3", type: "Airtime", amount: "-₦500", status: "Pending", date: "14 Nov 2025", time: "9:00 AM" },
  { id: "4", type: "Card Payment", amount: "-₦25,000", status: "Failed", date: "13 Nov 2025", time: "6:45 PM" },
  { id: "5", type: "Locked", amount: "₦100,000", status: "Active", date: "10 Nov 2025", time: "10:00 AM" },
];

export default function Transactions() {
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("All");
  const [month, setMonth] = useState(months[0]);
  const [showCat, setShowCat] = useState(false);
  const [showStat, setShowStat] = useState(false);
  const [showMonth, setShowMonth] = useState(false);

  const filtered = dummyTransactions.filter(t => 
    (category === "All" || t.type === category) &&
    (status === "All" || t.status === status) &&
    t.date.includes(month.split(" ")[0].slice(0,3))
  );

  const totalIn = filtered.filter(t => t.amount.startsWith("+")).reduce((a, b) => a + parseInt(b.amount.replace(/[^\d]/g, "")), 0);
  const totalOut = filtered.filter(t => t.amount.startsWith("-")).reduce((a, b) => a + parseInt(b.amount.replace(/[^\d]/g, "")), 0);

  return (
    <SafeAreaView style={styles.container}>
      <Image source={require("../../assets/icons/home.png")} style={styles.watermark} resizeMode="contain" />
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#FFD700" />
          </TouchableOpacity>
          <Text style={styles.title}>Transactions</Text>
        </View>

        <View style={styles.filters}>
          <TouchableOpacity style={styles.filterBtn} onPress={() => setShowCat(true)}>
            <Text style={styles.filterText}>{category}</Text>
            <Ionicons name="chevron-down" size={16} color="#FFD700" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterBtn} onPress={() => setShowStat(true)}>
            <Text style={styles.filterText}>{status}</Text>
            <Ionicons name="chevron-down" size={16} color="#FFD700" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterBtn} onPress={() => setShowMonth(true)}>
            <Text style={styles.filterText}>{month}</Text>
            <Ionicons name="chevron-down" size={16} color="#FFD700" />
          </TouchableOpacity>
        </View>

        <View style={styles.summary}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>In</Text>
            <Text style={styles.summaryAmountIn}>₦{totalIn.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Out</Text>
            <Text style={styles.summaryAmountOut}>₦{totalOut.toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.section}>
          {filtered.map((tx) => (
            <TouchableOpacity key={tx.id} style={styles.txItem}>
              <View style={styles.txLeft}>
                <View style={[styles.txIcon, tx.amount.startsWith("+") ? styles.in : styles.out]}>
                  <MaterialCommunityIcons name={tx.amount.startsWith("+") ? "arrow-down" : "arrow-up"} size={18} color="#fff" />
                </View>
                <View>
                  <Text style={styles.txTitle}>{tx.type}</Text>
                  <Text style={styles.txDate}>{tx.date} • {tx.time}</Text>
                </View>
              </View>
              <View style={styles.txRight}>
                <Text style={[styles.txAmount, tx.amount.startsWith("+") ? styles.inAmount : styles.outAmount]}>
                  {tx.amount}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: tx.status === "Successful" ? "#003300" : tx.status === "Pending" ? "#333300" : "#330000" }]}>
                  <Text style={styles.statusText}>{tx.status}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Dropdown Modals */}
      <Modal visible={showCat} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowCat(false)}>
          <View style={styles.dropdown}>
            <FlatList data={categories} renderItem={({ item }) => (
              <TouchableOpacity style={styles.dropdownItem} onPress={() => { setCategory(item); setShowCat(false); }}>
                <Text style={styles.dropdownText}>{item}</Text>
              </TouchableOpacity>
            )} keyExtractor={item => item} />
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showStat} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowStat(false)}>
          <View style={styles.dropdown}>
            <FlatList data={statuses} renderItem={({ item }) => (
              <TouchableOpacity style={styles.dropdownItem} onPress={() => { setStatus(item); setShowStat(false); }}>
                <Text style={styles.dropdownText}>{item}</Text>
              </TouchableOpacity>
            )} keyExtractor={item => item} />
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showMonth} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowMonth(false)}>
          <View style={styles.dropdown}>
            <FlatList data={months} renderItem={({ item }) => (
              <TouchableOpacity style={styles.dropdownItem} onPress={() => { setMonth(item); setShowMonth(false); }}>
                <Text style={styles.dropdownText}>{item}</Text>
              </TouchableOpacity>
            )} keyExtractor={item => item} />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  watermark: { position: "absolute", top: "30%", left: "10%", width: 300, height: 300, opacity: 0.08, zIndex: 2 },
  content: { flex: 1, paddingHorizontal: 16, zIndex: 1 },
  header: { flexDirection: "row", alignItems: "center", marginTop: 20, marginBottom: 20 },
  backButton: { padding: 4 },
  title: { color: "#fff", fontSize: 28, fontWeight: "700", marginLeft: 12 },
  filters: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  filterBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#111", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, gap: 6 },
  filterText: { color: "#FFD700", fontSize: 13, fontWeight: "600" },
  summary: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  summaryBox: { backgroundColor: "#111", padding: 16, borderRadius: 16, width: "48%", alignItems: "center" },
  summaryLabel: { color: "#aaa", fontSize: 12 },
  summaryAmountIn: { color: "#00FF7F", fontSize: 18, fontWeight: "700" },
  summaryAmountOut: { color: "#FF4444", fontSize: 18, fontWeight: "700" },
  section: { marginBottom: 40 },
  txItem: { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#111", padding: 16, borderRadius: 16, marginBottom: 12 },
  txLeft: { flexDirection: "row", alignItems: "center" },
  txIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center", marginRight: 12 },
  in: { backgroundColor: "#003300" },
  out: { backgroundColor: "#330000" },
  txTitle: { color: "#fff", fontSize: 15, fontWeight: "600" },
  txDate: { color: "#aaa", fontSize: 12 },
  txRight: { alignItems: "flex-end" },
  txAmount: { fontSize: 15, fontWeight: "700" },
  inAmount: { color: "#00FF7F" },
  outAmount: { color: "#FF4444" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, marginTop: 4 },
  statusText: { color: "#fff", fontSize: 10, fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center" },
  dropdown: { backgroundColor: "#111", borderRadius: 16, width: "80%", maxHeight: 400, padding: 8 },
  dropdownItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: "#222" },
  dropdownText: { color: "#fff", fontSize: 15 },
});