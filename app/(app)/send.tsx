// app/send.tsx
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

export default function Send() {
  return (
    <SafeAreaView style={styles.container}>
      {/* ---------- WATERMARK (PNG Image) ---------- */}
      <Image
        source={require("../../assets/icons/home.png")} // replace with your watermark PNG
        style={styles.watermark}
        resizeMode="contain"
      />

      {/* ---------- PAGE CONTENT ---------- */}
      <View style={styles.content}>
        {/* SEND INTERNATIONALLY */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>SEND INTERNATIONALLY</Text>
            <TouchableOpacity>
              <Text style={styles.viewAll}>View all</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.flagsRow}>
            <TouchableOpacity style={styles.flagItem}>
              <Image
                source={require("../../assets/images/edge-logo2.png")}
                style={styles.flag}
              />
              <Text style={styles.flagLabel}>United States</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.flagItem}>
              <Image
                source={require("../../assets/images/edge-logo2.png")}
                style={styles.flag}
              />
              <Text style={styles.flagLabel}>Ghana</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.flagItem}>
              <Image
                source={require("../../assets/images/edge-logo2.png")}
                style={styles.flag}
              />
              <Text style={styles.flagLabel}>Uganda</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.flagItem}>
              <Image
                source={require("../../assets/images/edge-logo2.png")}
                style={styles.flag}
              />
              <Text style={styles.flagLabel}>Rwanda</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SEND IN NIGERIA */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SEND IN NIGERIA</Text>

          <TouchableOpacity style={styles.transferOption}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="tag" size={24} color="#FFD700" />
            </View>
            <View style={styles.transferText}>
              <Text style={styles.transferTitle}>$B-PAY Tag</Text>
              <Text style={styles.transferSubtitle}>Send to a B-Pay tag or invite phone contact</Text>
            </View>
            <FontAwesome5 name="chevron-right" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.transferOption}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="bank" size={24} color="#FFD700" />
            </View>
            <View style={styles.transferText}>
              <Text style={styles.transferTitle}>NGN Bank Accounts</Text>
              <Text style={styles.transferSubtitle}>Send to a bank account</Text>
            </View>
            <FontAwesome5 name="chevron-right" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.transferOption}>
            <View style={styles.iconCircle}>
              <Image source={require("../../assets/images/edge-logo2.png")} style={styles.enairaIcon} />
            </View>
            <View style={styles.transferText}>
              <Text style={styles.transferTitle}>eNaira</Text>
              <Text style={styles.transferSubtitle}>Send to an eNaira account</Text>
            </View>
            <FontAwesome5 name="chevron-right" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* SEND INTERNATIONALLY USING */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SEND INTERNATIONALLY USING</Text>

          <TouchableOpacity style={styles.transferOption}>
            <View style={styles.iconCircle}>
              <Ionicons name="earth" size={24} color="#FFD700" />
            </View>
            <View style={styles.transferText}>
              <Text style={styles.transferTitle}>Send Internationally</Text>
              <Text style={styles.transferSubtitle}>To 20 countries</Text>
            </View>
            <FontAwesome5 name="chevron-right" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.transferOption}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="currency-usd" size={24} color="#FFD700" />
            </View>
            <View style={styles.transferText}>
              <Text style={styles.transferTitle}>Send Digital Dollars</Text>
              <Text style={styles.transferSubtitle}>To USDC, USDT, or PYUSD addresses</Text>
            </View>
            <FontAwesome5 name="chevron-right" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

/* -------------------------- STYLES -------------------------- */
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
    opacity: 0.08,
    zIndex: 2, // ensures it's behind content
  },
  content: {
    flex: 1,
    justifyContent: "flex-start",
    paddingTop: 20,
    zIndex: 1, // content appears above watermark
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  viewAll: {
    color: "#FFD700",
    fontSize: 14,
    fontWeight: "600",
  },
  flagsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  flagItem: {
    alignItems: "center",
    width: SCREEN_WIDTH * 0.2,
  },
  flag: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginBottom: 8,
  },
  flagLabel: {
    color: "#fff",
    fontSize: 12,
    textAlign: "center",
  },
  transferOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  enairaIcon: {
    width: 28,
    height: 28,
  },
  transferText: {
    flex: 1,
  },
  transferTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  transferSubtitle: {
    color: "#aaa",
    fontSize: 13,
    marginTop: 2,
  },
});
