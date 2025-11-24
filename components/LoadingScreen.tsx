// components/LoadingScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator } from 'react-native';

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message = "Loading..." }: LoadingScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Image
          source={require("@/assets/icons/home.png")}
          style={styles.image}
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color="#00FF7F" />
        <Text style={styles.text}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    gap: 20,
  },
  image: {
    width: 120,
    height: 120,
    opacity: 0.7,
  },
  text: {
    color: "#00FF7F",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});