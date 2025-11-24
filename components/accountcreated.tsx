// app/components/AccountCreatedAlert.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DONT_SHOW_TRANSFER_PIN_KEY = "dontShowTransferPin";

type Props = {
  isVisible: boolean;
  onDismiss: () => void;
  transferPin: string;
};

export default function AccountCreatedAlert({ isVisible, onDismiss, transferPin }: Props) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    if (isVisible) {
      // Optional: auto-hide after X seconds if needed
    }
  }, [isVisible]);

  const handleDontShowAgain = async (value: boolean) => {
    setDontShowAgain(value);
    await AsyncStorage.setItem(DONT_SHOW_TRANSFER_PIN_KEY, value.toString());
  };

  if (!isVisible) return null;

  return (
    <Modal transparent visible={isVisible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.iconContainer}>
            <FontAwesome name="check-circle" size={60} color="#FFD700" />
          </View>
          <Text style={styles.title}>Welcome to B-PAY! 🚀</Text>
          <Text style={styles.subtitle}>Your account has been created successfully</Text>

          <View style={styles.pinInfo}>
            <View style={styles.infoRow}>
              <FontAwesome name="key" size={16} color="#FFD700" />
              <Text style={styles.infoText}>
                <Text style={styles.bold}>Transfer Token:</Text> {transferPin}
              </Text>
            </View>
            <Text style={styles.noteText}>
              Your transfer token is the first 4 digits of your security token.
            </Text>
          </View>

          <View style={styles.checkboxRow}>
            <TouchableOpacity onPress={() => handleDontShowAgain(!dontShowAgain)}>
              <FontAwesome name={dontShowAgain ? "check-square" : "square"} size={18} color="#FFD700" />
            </TouchableOpacity>
            <Text style={styles.checkboxLabel}>Don’t show this again</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.closeButton} onPress={onDismiss}>
            <Text style={styles.closeText}>Got it! Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    color: '#FFD700',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: '#fff',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
    opacity: 0.9,
  },
  pinInfo: {
    backgroundColor: 'rgba(255,215,0,0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    width: '100%',
    alignItems: 'flex-start',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 8,
  },
  bold: {
    fontWeight: 'bold',
    color: '#FFD700',
  },
  noteText: {
    color: '#FFD700',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 8,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkboxLabel: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 10,
  },
  closeButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  closeText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
});