// components/OopsModal.tsx
import React from "react";
import { View, Text, Modal, StyleSheet, Pressable } from "react-native";
import { BlurView } from "expo-blur";

interface OopsModalProps {
  visible: boolean;
  username: string;
  onClose: () => void;
}

const OopsModal: React.FC<OopsModalProps> = ({ visible, username, onClose }) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <BlurView intensity={70} tint="dark" style={styles.blurContainer}>
          <Text style={styles.emoji}>😢</Text>
          <Text style={styles.title}>Oops, {username}!</Text>
          <Text style={styles.subtitle}>You just missed it — your wallet is empty.</Text>
          <Pressable onPress={onClose} style={styles.button}>
            <Text style={styles.buttonText}>Close</Text>
          </Pressable>
        </BlurView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  blurContainer: {
    width: "85%",
    borderRadius: 20,
    padding: 25,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  emoji: {
    fontSize: 70,
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    color: "#fff",
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#ccc",
    textAlign: "center",
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#FFC107",
    paddingHorizontal: 30,
    paddingVertical: 10,
    borderRadius: 25,
  },
  buttonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "700",
  },
});

export default OopsModal;
