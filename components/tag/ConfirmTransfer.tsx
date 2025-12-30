import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

interface ConfirmTransferProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  recipient: any;
  amount: number;
  note?: string;
  loading?: boolean;
}

export default function ConfirmTransfer({
  visible,
  onClose,
  onConfirm,
  recipient,
  amount,
  note,
  loading = false,
}: ConfirmTransferProps) {
  const [useBiometric, setUseBiometric] = useState(true);

  const handleConfirm = async () => {
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Transfer error:', error);
    }
  };

  const simulateBiometric = () => {
    Alert.alert(
      'Biometric Authentication',
      'Please authenticate to confirm transfer',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => setUseBiometric(false),
        },
        {
          text: 'Authenticate',
          onPress: handleConfirm,
        },
      ]
    );
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Confirm Transfer</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Transaction Details */}
          <View style={styles.detailsContainer}>
            <View style={styles.recipientInfo}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {recipient?.first_name?.[0]?.toUpperCase() || '?'}
                </Text>
              </View>
              <View style={styles.recipientDetails}>
                <Text style={styles.recipientName}>
                  {recipient?.first_name} {recipient?.last_name}
                </Text>
                <Text style={styles.recipientTag}>@{recipient?.bpay_tag}</Text>
              </View>
            </View>

            <View style={styles.amountDisplay}>
              <Text style={styles.amountLabel}>Amount</Text>
              <Text style={styles.amountValue}>₦{amount.toLocaleString()}</Text>
            </View>

            {note && (
              <View style={styles.noteContainer}>
                <Text style={styles.noteLabel}>Note</Text>
                <Text style={styles.noteText}>{note}</Text>
              </View>
            )}

            <View style={styles.feeContainer}>
              <Text style={styles.feeLabel}>Fee</Text>
              <Text style={styles.feeValue}>₦0.00</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>₦{amount.toLocaleString()}</Text>
            </View>
          </View>

          {/* Biometric Toggle */}
          <TouchableOpacity
            style={styles.biometricOption}
            onPress={() => setUseBiometric(!useBiometric)}
          >
            <MaterialCommunityIcons
              name={useBiometric ? 'checkbox-marked' : 'checkbox-blank-outline'}
              size={24}
              color={useBiometric ? '#FFD700' : '#666'}
            />
            <Text style={styles.biometricText}>Use biometric authentication</Text>
          </TouchableOpacity>

          {/* Confirm Button */}
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={useBiometric ? simulateBiometric : handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.confirmButtonText}>Processing...</Text>
              </View>
            ) : (
              <>
                <MaterialCommunityIcons
                  name="fingerprint"
                  size={24}
                  color="#000"
                />
                <Text style={styles.confirmButtonText}>
                  {useBiometric ? 'Confirm with Biometric' : 'Confirm Transfer'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#111',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: 500,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  detailsContainer: {
    backgroundColor: '#000',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  recipientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#000',
    fontSize: 20,
    fontWeight: 'bold',
  },
  recipientDetails: {
    flex: 1,
  },
  recipientName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  recipientTag: {
    color: '#FFD700',
    fontSize: 14,
    marginTop: 2,
  },
  amountDisplay: {
    marginBottom: 16,
  },
  amountLabel: {
    color: '#999',
    fontSize: 14,
    marginBottom: 4,
  },
  amountValue: {
    color: '#FFD700',
    fontSize: 32,
    fontWeight: 'bold',
  },
  noteContainer: {
    marginBottom: 16,
  },
  noteLabel: {
    color: '#999',
    fontSize: 14,
    marginBottom: 4,
  },
  noteText: {
    color: '#fff',
    fontSize: 14,
  },
  feeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  feeLabel: {
    color: '#999',
    fontSize: 14,
  },
  feeValue: {
    color: '#fff',
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: '#222',
    marginVertical: 16,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  totalValue: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
  },
  biometricOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  biometricText: {
    color: '#fff',
    fontSize: 16,
  },
  confirmButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  confirmButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  cancelButtonText: {
    color: '#999',
    fontSize: 16,
    fontWeight: '600',
  },
});