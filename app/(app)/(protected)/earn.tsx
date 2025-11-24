// app/EarnPage.tsx
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
  Vibration,
  StatusBar,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Dummy data for earning opportunities
const earningOpportunities = [
  {
    id: "1",
    title: "Refer Friends",
    description: "Earn $25 for every friend who signs up and funds their account",
    reward: "$25",
    icon: "people-outline",
    color: "#FFD700",
    completed: false,
  },
  {
    id: "2",
    title: "Complete Profile",
    description: "Add your ID and verify your account to earn $10",
    reward: "$10",
    icon: "document-text-outline",
    color: "#FFC107",
    completed: true,
  },
  {
    id: "3",
    title: "First Transaction",
    description: "Make your first payment to earn $15",
    reward: "$15",
    icon: "card-outline",
    color: "#FFA500",
    completed: false,
  },
  {
    id: "4",
    title: "Weekly Challenge",
    description: "Complete 5 transactions this week to earn $20",
    reward: "$20",
    icon: "calendar-outline",
    color: "#FF8C00",
    completed: false,
  },
];

const EarnPage = () => {
  const [tasks, setTasks] = useState(earningOpportunities);
  const [pendingEarnings, setPendingEarnings] = useState("$40");
  const [totalEarned, setTotalEarned] = useState("$10");
  const [referralCode, setReferralCode] = useState("B-PAY789");

  const vibrate = () => Vibration.vibrate([0, 5]);

  const handleCompleteTask = (id: string) => {
    vibrate();
    setTasks(prev => 
      prev.map(task => 
        task.id === id ? { ...task, completed: true } : task
      )
    );
    
    // Update earnings
    const task = tasks.find(t => t.id === id);
    if (task) {
      const rewardValue = parseFloat(task.reward.replace('$', ''));
      setPendingEarnings(prev => {
        const current = parseFloat(prev.replace('$', ''));
        return `$${(current + rewardValue).toFixed(2)}`;
      });
    }
    
    Alert.alert("Success!", "Task completed! Reward added to pending earnings.");
  };

  const handleCopyCode = () => {
    vibrate();
    // In real app: implement clipboard logic
    Alert.alert("Copied!", "Your referral code has been copied to clipboard");
  };

  const handleClaimEarnings = () => {
    vibrate();
    if (parseFloat(pendingEarnings.replace('$', '')) > 0) {
      // Move pending to total
      setTotalEarned(prev => {
        const currentTotal = parseFloat(prev.replace('$', ''));
        const newTotal = currentTotal + parseFloat(pendingEarnings.replace('$', ''));
        return `$${newTotal.toFixed(2)}`;
      });
      setPendingEarnings("$0.00");
      Alert.alert("Claimed!", "Your earnings have been added to your balance");
    }
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Earn Rewards</Text>
          <TouchableOpacity onPress={vibrate}>
            <Ionicons name="notifications-outline" size={24} color="#FFD700" />
          </TouchableOpacity>
        </View>

        {/* Earnings Summary */}
        <LinearGradient
          colors={["#1A1A1A", "#000000"]}
          style={styles.earningsCard}
        >
          <View style={styles.earningsHeader}>
            <Text style={styles.earningsLabel}>Your Earnings</Text>
            <TouchableOpacity style={styles.infoButton}>
              <Ionicons name="information-circle-outline" size={20} color="#FFD700" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.earningsAmounts}>
            <View style={styles.amountItem}>
              <Text style={styles.label}>Pending</Text>
              <Text style={styles.pendingAmount}>{pendingEarnings}</Text>
            </View>
            <View style={styles.amountItem}>
              <Text style={styles.label}>Total Earned</Text>
              <Text style={styles.totalAmount}>{totalEarned}</Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.claimButton} 
            onPress={handleClaimEarnings}
            disabled={pendingEarnings === "$0.00"}
          >
            <Text style={styles.claimText}>Claim Earnings</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Referral Section */}
        <View style={styles.referralSection}>
          <Text style={styles.sectionTitle}>Your Referral Link</Text>
          <View style={styles.referralContainer}>
            <View style={styles.referralCodeBox}>
              <Text style={styles.referralCode} numberOfLines={1}>
                {referralCode}
              </Text>
            </View>
            <TouchableOpacity style={styles.copyButton} onPress={handleCopyCode}>
              <Ionicons name="copy-outline" size={20} color="#000" />
            </TouchableOpacity>
          </View>
          <Text style={styles.referralText}>
            Share this code with friends to earn rewards when they sign up
          </Text>
        </View>

        {/* Tasks List */}
        <View style={styles.tasksHeader}>
          <Text style={styles.sectionTitle}>Complete Tasks</Text>
          <Text style={styles.tasksSubtitle}>Earn rewards by completing simple tasks</Text>
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollViewContent}
        >
          {tasks.map((task) => (
            <TouchableOpacity
              key={task.id}
              style={[
                styles.taskCard,
                task.completed && styles.completedTask
              ]}
              onPress={() => !task.completed && handleCompleteTask(task.id)}
              disabled={task.completed}
            >
              <View style={styles.taskIconContainer}>
                <View style={[styles.taskIcon, { backgroundColor: task.color + "20" }]}>
                  <Ionicons name={task.icon as any} size={24} color={task.color} />
                </View>
              </View>
              
              <View style={styles.taskContent}>
                <Text style={styles.taskTitle}>{task.title}</Text>
                <Text style={styles.taskDescription}>{task.description}</Text>
              </View>
              
              <View style={styles.rewardContainer}>
                <Text style={styles.rewardAmount}>{task.reward}</Text>
                {task.completed ? (
                  <Ionicons name="checkmark-circle" size={24} color="#00FF7F" />
                ) : (
                  <Ionicons name="arrow-forward" size={24} color="#FFD700" />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Bottom CTA */}
        <View style={styles.bottomCTA}>
          <Text style={styles.ctaTitle}>Ready to start earning?</Text>
          <Text style={styles.ctaSubtitle}>Complete your first task now</Text>
          <TouchableOpacity style={styles.ctaButton} onPress={() => handleCompleteTask("3")}>
            <Text style={styles.ctaButtonText}>Get Started</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  earningsCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderColor: "#333",
    borderWidth: 1,
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  earningsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  earningsLabel: {
    color: "#FFD700",
    fontSize: 18,
    fontWeight: "700",
  },
  infoButton: {
    padding: 8,
  },
  earningsAmounts: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  amountItem: {
    alignItems: "center",
  },
  label: {
    color: "#888",
    fontSize: 14,
    marginBottom: 8,
  },
  pendingAmount: {
    color: "#FFD700",
    fontSize: 28,
    fontWeight: "800",
  },
  totalAmount: {
    color: "#00FF7F",
    fontSize: 28,
    fontWeight: "800",
  },
  claimButton: {
    backgroundColor: "#FFD700",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  claimText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  referralSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
  },
  tasksSubtitle: {
    color: "#aaa",
    fontSize: 14,
    marginBottom: 20,
  },
  referralContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  referralCodeBox: {
    flex: 1,
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 14,
    marginRight: 12,
  },
  referralCode: {
    color: "#FFD700",
    fontSize: 16,
    fontWeight: "600",
  },
  copyButton: {
    backgroundColor: "#FFD700",
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  referralText: {
    color: "#aaa",
    fontSize: 14,
    lineHeight: 20,
  },
  tasksHeader: {
    marginBottom: 16,
  },
  scrollViewContent: {
    paddingBottom: 100,
  },
  taskCard: {
    backgroundColor: "#111",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    borderColor: "#222",
    borderWidth: 1,
  },
  completedTask: {
    opacity: 0.7,
  },
  taskIconContainer: {
    marginRight: 16,
  },
  taskIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  taskContent: {
    flex: 1,
    marginRight: 16,
  },
  taskTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  taskDescription: {
    color: "#aaa",
    fontSize: 14,
    lineHeight: 18,
  },
  rewardContainer: {
    alignItems: "flex-end",
  },
  rewardAmount: {
    color: "#FFD700",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  bottomCTA: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: "#111",
    padding: 20,
    borderRadius: 20,
    borderColor: "#222",
    borderWidth: 1,
  },
  ctaTitle: {
    color: "#FFD700",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  ctaSubtitle: {
    color: "#aaa",
    fontSize: 14,
    marginBottom: 16,
  },
  ctaButton: {
    backgroundColor: "#FFD700",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  ctaButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "700",
  },
});

export default EarnPage;