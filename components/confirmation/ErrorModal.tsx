import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet, Animated } from 'react-native';

interface ErrorModalProps {
  visible: boolean;
  onClose: () => void;
  userName: string;
  purchaseDescription: string;
  timeLeft: number;
  pulseNetworkAnim: Animated.Value;
}

const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600 / 60);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const ErrorModal: React.FC<ErrorModalProps> = ({
  visible,
  onClose,
  userName,
  purchaseDescription,
  timeLeft,
  pulseNetworkAnim,
}) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.errorModal}>
          <Text style={styles.errorModalTitle}>Hi, {userName} 😢</Text>
          <Text style={styles.errorModalText}>
            <Animated.Text style={[styles.networkText, { transform: [{ scale: pulseNetworkAnim }] }]}>
              Edges Network
            </Animated.Text>{' '}
            for {purchaseDescription} is currently unavailable.
          </Text>
          <Text style={styles.errorModalText}>
            Server is down. Please try again in:
          </Text>
          <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
          <Pressable onPress={onClose} style={styles.closeErrorButton}>
            <Text style={styles.closeErrorButtonText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorModal: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  errorModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorModalText: {
    fontSize: 16,
    color: 'white',
    marginBottom: 12,
    textAlign: 'center',
  },
  networkText: {
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  timerText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FF5555',
    marginVertical: 16,
    fontFamily: 'monospace',
  },
  closeErrorButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 16,
  },
  closeErrorButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default ErrorModal;