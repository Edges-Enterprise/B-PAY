// components/WalletCard.tsx
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";

const SCREEN_WIDTH = Dimensions.get("window").width;

interface WalletCardProps {
  currency: 'NGN' | 'USD';
  balance: string;
  subBalance: string;
  children?: React.ReactNode;
  showLock?: boolean;
  showGenerateButton?: boolean;
  isGenerating?: boolean;
  onGenerate?: () => void;
}

export default function WalletCard({
  currency,
  balance,
  subBalance,
  children,
  showLock = false,
  showGenerateButton = false,
  isGenerating = false,
  onGenerate,
}: WalletCardProps) {
  return (
    <View style={styles.walletCard}>
      <View style={styles.currencyHeader}>
        <Text style={styles.currencyLabel}>{currency}</Text>
        <MaterialCommunityIcons 
          name={currency === 'NGN' ? "currency-ngn" : "currency-usd"} 
          size={20} 
          color="#FFD700" 
        />
        {showLock && (
          <FontAwesome5 name="lock" size={16} color="#FFD700" style={styles.lockIcon} />
        )}
      </View>
      <Text style={styles.balance}>{balance}</Text>
      <Text style={styles.subBalance}>{subBalance}</Text>

      {showGenerateButton && onGenerate && (
        <TouchableOpacity
          style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]}
          onPress={onGenerate}
          disabled={isGenerating}
        >
          <Text style={styles.generateButtonText}>
            {isGenerating ? "Creating Account..." : `Generate ${currency} Account`}
          </Text>
        </TouchableOpacity>
      )}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  walletCard: {
    backgroundColor: "#111",
    borderRadius: 16,
    padding: 16,
    width: SCREEN_WIDTH * 0.44,
    borderWidth: 1,
    borderColor: "#222",
    minHeight: 180,
  },
  currencyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  currencyLabel: {
    color: "#FFD700",
    fontSize: 14,
    fontWeight: "600",
  },
  lockIcon: {
    marginLeft: 4,
  },
  balance: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
  },
  subBalance: {
    color: "#aaa",
    fontSize: 12,
    marginBottom: 12,
  },
  generateButton: {
    backgroundColor: "#FFD700",
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    color: "#000",
    fontWeight: "600",
    fontSize: 13,
  },
});