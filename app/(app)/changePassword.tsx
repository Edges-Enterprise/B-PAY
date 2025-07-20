import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTheme } from "@/context/theme-context";
import { useFont } from "@/context/font-context";
import { useSupabase } from "@/context/supabase-provider";
import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";

export default function ChangePassword() {
  const { colorScheme } = useTheme();
  const { selectedFont } = useFont();
  const { auth } = useSupabase();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Error", "New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New password and confirmation do not match.");
      return;
    }

    setLoading(true);
    try {
      // Re-authenticate to verify current password
      const { error: signInError } = await auth.signInWithPassword({
        email: auth.currentUser?.email || "",
        password: currentPassword,
      });

      if (signInError) {
        throw new Error("Current password is incorrect.");
      }

      // Update password
      const { error: updateError } = await auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      Alert.alert("Success", "Password updated successfully.", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors[colorScheme]?.background },
      ]}
    >

      {/* Form */}
      <View style={styles.form}>
        <Text
          style={[
            styles.label,
            {
              color: colors[colorScheme]?.foreground,
              fontFamily: selectedFont || fonts.default,
            },
          ]}
        >
          Current Password
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: `${colors[colorScheme]?.input}99`,
              color: colors[colorScheme]?.foreground,
              fontFamily: selectedFont || fonts.default,
            },
          ]}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Enter current password"
          placeholderTextColor={colors[colorScheme]?.mutedForeground}
          secureTextEntry
          autoCapitalize="none"
        />

        <Text
          style={[
            styles.label,
            {
              color: colors[colorScheme]?.foreground,
              fontFamily: selectedFont || fonts.default,
            },
          ]}
        >
          New Password
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: `${colors[colorScheme]?.input}99`,
              color: colors[colorScheme]?.foreground,
              fontFamily: selectedFont || fonts.default,
            },
          ]}
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="Enter new password"
          placeholderTextColor={colors[colorScheme]?.mutedForeground}
          secureTextEntry
          autoCapitalize="none"
        />

        <Text
          style={[
            styles.label,
            {
              color: colors[colorScheme]?.foreground,
              fontFamily: selectedFont || fonts.default,
            },
          ]}
        >
          Confirm New Password
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: `${colors[colorScheme]?.input}99`,
              color: colors[colorScheme]?.foreground,
              fontFamily: selectedFont || fonts.default,
            },
          ]}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirm new password"
          placeholderTextColor={colors[colorScheme]?.mutedForeground}
          secureTextEntry
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: colors[colorScheme]?.primary,
              opacity: loading ? 0.6 : 1,
            },
          ]}
          onPress={handleChangePassword}
          disabled={loading}
        >
          <Text
            style={[
              styles.buttonText,
              {
                color: colors[colorScheme]?.primaryForeground,
                fontFamily: selectedFont || fonts.default,
              },
            ]}
          >
            {loading ? "Updating..." : "Update Password"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 36,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 24,
  },
  headerText: {
    fontSize: 20,
    fontWeight: "600",
  },
  form: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    fontSize: 14,
  },
  button: {
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    marginTop: 24,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});