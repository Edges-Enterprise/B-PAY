// components/TransferOption.tsx
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";

interface TransferOptionProps {
  icon: string;
  title: string;
  subtitle: string;
  iconLib: React.ComponentType<any>;
  onPress?: () => void;
}

export default function TransferOption({
  icon,
  title,
  subtitle,
  iconLib: IconComponent,
  onPress,
}: TransferOptionProps) {
  return (
    <TouchableOpacity style={styles.transferOption} onPress={onPress}>
      <View style={styles.iconCircle}>
        <IconComponent name={icon} size={24} color="#FFD700" />
      </View>
      <View style={styles.transferText}>
        <Text style={styles.transferTitle}>{title}</Text>
        <Text style={styles.transferSubtitle}>{subtitle}</Text>
      </View>
      <FontAwesome5 name="chevron-right" size={20} color="#666" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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