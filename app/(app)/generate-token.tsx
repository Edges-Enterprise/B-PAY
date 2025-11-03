import React, { useEffect } from "react";
import { View, Text, ActivityIndicator, StyleSheet, Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

function toBase64(str) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let output = "";
  let i = 0;
  while (i < str.length) {
    const c1 = str.charCodeAt(i++) & 0xff;
    if (i === str.length) {
      output += chars.charAt(c1 >> 2);
      output += chars.charAt((c1 & 0x3) << 4);
      output += "==";
      break;
    }
    const c2 = str.charCodeAt(i++);
    if (i === str.length) {
      output += chars.charAt(c1 >> 2);
      output += chars.charAt(((c1 & 0x3) << 4) | ((c2 & 0xF0) >> 4));
      output += chars.charAt((c2 & 0xF) << 2);
      output += "=";
      break;
    }
    const c3 = str.charCodeAt(i++);
    output += chars.charAt(c1 >> 2);
    output += chars.charAt(((c1 & 0x3) << 4) | ((c2 & 0xF0) >> 4));
    output += chars.charAt(((c2 & 0xF) << 2) | ((c3 & 0xC0) >> 6));
    output += chars.charAt(c3 & 0x3F);
  }
  return output;
}

export default function GenerateToken() {
  const {
    bundle,
    provider,
    phoneNumber,
    userEmail,
    transactionPin,
    source,
    networkId,
    planId,
  } = useLocalSearchParams();

  useEffect(() => {
    const generateToken = async () => {
      try {
        const username = "John7492";
        const password = "Password7492";
        const credentials = `${username}:${password}`;

        // ✅ Safe Base64 encoding for any JS environment
        const base64Credentials = toBase64(credentials);

        // 🔐 Fetch AccessToken
        const response = await fetch("https://erecharge.ng/api/user", {
          method: "POST",
          headers: {
            Authorization: `Basic ${base64Credentials}`,
            "Content-Type": "application/json",
          },
        });

        const tokenData = await response.json();
        console.log("eRecharge Token Response:", tokenData);

        if (tokenData.status !== "success" || !tokenData.AccessToken) {
          Alert.alert("Error", "Failed to generate access token.");
          router.back();
          return;
        }

        router.push({
          pathname: "/confam",
          params: {
            bundle,
            provider,
            phoneNumber,
            userEmail,
            transactionPin,
            source,
            networkId,
            planId,
            token: tokenData.AccessToken,
          } as any,
        });
      } catch (err) {
        console.error("Token generation error:", err);
        Alert.alert("Error", "Unable to generate token. Please try again.");
        router.back();
      }
    };

    generateToken();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#FFCC00" />
      <Text style={styles.text}>Generating secure token...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  text: {
    marginTop: 10,
    color: "#fff",
    fontSize: 16,
  },
});
