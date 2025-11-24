import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function TopBar() {
  const router = useRouter();

  const goToSettings = () => router.push("/settings");
  const goToHelp = () => router.push("/help");
  const goToNotifications = () => router.push("/notifications");
  const goToTrending = () => router.push("/transaction");

  return (
    <View style={styles.topBar}>
      <View style={styles.topLeft}>
        <TouchableOpacity style={styles.iconButton} onPress={goToSettings}>
          <Ionicons name="settings-outline" size={26} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={goToHelp}>
          <Ionicons name="help-circle-outline" size={26} color="#fff" />
        </TouchableOpacity>
      </View>
      <View style={styles.topRight}>
        <TouchableOpacity style={styles.iconButton} onPress={goToNotifications}>
          <Ionicons name="notifications-outline" size={26} color="#FFD700" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.trendingButton} onPress={goToTrending}>
          <Ionicons name="trending-up" size={28} color="#00FF7F" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { 
    position: "absolute", 
    top: 0, 
    left: 0, 
    right: 0, 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    paddingHorizontal: 16, 
    paddingTop: 12, 
    zIndex: 1000 
  },
  topLeft: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginTop: 8 
  },
  topRight: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginTop: 8 
  },
  iconButton: { 
    marginRight: 16, 
    padding: 4 
  },
  trendingButton: { 
    padding: 4 
  },
});