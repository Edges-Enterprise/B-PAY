import React from "react";
import { View, Text, TouchableOpacity, Alert, StyleSheet, Dimensions } from "react-native";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import CheckInBanner from "@/components/home/CheckInBanner";

const { width } = Dimensions.get("window");

const quickActions = [
  { icon: "call-outline", label: "Buy Airtime", color: "#4CAF50", route: "/airtime" },
  { icon: "cube-outline", label: "Buy Bundles", color: "#2196F3", route: "/bundles" },
  { icon: "people-outline", label: "Ajo", color: "#FF9800", route: "/ajo" },
  { icon: "handshake", label: "Refer & Earn", color: "#F44336", isFA5: true, route: "/refer" },
];

export default function QuickActionsSection() {
  const router = useRouter();

  const navigateWithVibration = (route: string) => {
    router.push(route);
  };

  const handleSubscribe = () => {
    Alert.alert("Subscribed!", "Daily check-in rewards activated.");
  };

  return (
    <View style={styles.quickActionsSection}>
      <Text style={styles.quickActionsTitle}>Quick Actions</Text>
      
      {/* CheckInBanner with adjustable positioning */}
      <View style={styles.bannerContainer}>
        <CheckInBanner onPress={handleSubscribe} />
      </View>
      
      <View style={styles.quickActionsGrid}>
        {quickActions.map((action, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.quickActionItem}
            onPress={() => navigateWithVibration(action.route)}
          >
            <View style={styles.quickActionIconWrapper}>
              {action.isFA5 ? (
                <FontAwesome5 name={action.icon} size={28} color={action.color} />
              ) : (
                <Ionicons name={action.icon} size={28} color={action.color} />
              )}
            </View>
            <Text style={styles.quickActionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  quickActionsSection: { 
    paddingVertical: 1, 
    paddingHorizontal: 15,
    bottom: 30
  },
  quickActionsTitle: { 
    color: "#fff", 
    fontSize: 18, 
    fontWeight: "600", 
    marginBottom: 16,
    top: 12
  },
  // Container for the banner - ADJUST THIS TO MOVE THE SUBSCRIBE BUTTON
  bannerContainer: {
    marginBottom: 10, // Adjust vertical spacing
    marginHorizontal: 0, // Adjust horizontal spacing
    // Add any of these to adjust position:
    // top: value, 
    // bottom: value,
    // left: value,
    // right: value,
    // transform: [{ translateX: value }, { translateY: value }],
  },
  quickActionsGrid: { 
    flexDirection: "row", 
    flexWrap: "wrap", 
    justifyContent: "space-between",
    top: 15
  },
  quickActionItem: { 
    width: (width - 48) / 4, 
    alignItems: "center", 
    marginBottom: 10
  },
  quickActionIconWrapper: { 
    position: "relative", 
    marginBottom: 8,
    bottom: 15,
  },
  quickActionLabel: { 
    color: "#fff", 
    fontSize: 12, 
    textAlign: "center", 
    fontWeight: "500", 
    bottom: 15
  },
});