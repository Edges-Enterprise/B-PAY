import React from 'react';
import { View, Text, Pressable, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { sharedStyles } from './styles';

const TransactionStatusModal = ({
  visible,
  onClose,
  transactionStatus,
  selectedPlan,
  phoneNumber,
  networkProvider,
}) => (
  <Modal
    visible={visible}
    animationType="fade"
    transparent
    onRequestClose={onClose}
  >
    <View style={sharedStyles.modalContainer}>
      <View style={sharedStyles.transactionModal}>
        <View style={sharedStyles.modalHeader}>
          <Text style={sharedStyles.sheetTitle}>
            {transactionStatus === 'processing'
              ? 'Processing'
              : transactionStatus === 'success'
              ? 'Success'
              : 'Failed'}
          </Text>
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={24} color="white" />
          </Pressable>
        </View>
        {transactionStatus === 'processing' && (
          <>
            <ActivityIndicator size="large" color="#22C55E" />
            <Text style={sharedStyles.transactionText}>Processing Transaction...</Text>
          </>
        )}
        {transactionStatus === 'success' && (
          <>
            <Ionicons name="checkmark-circle" size={64} color="#22C55E" />
            <Text style={sharedStyles.transactionText}>Transaction Successful!</Text>
            <Text style={sharedStyles.transactionDetails}>
              {selectedPlan?.data} purchased for {phoneNumber} on {networkProvider}
            </Text>
          </>
        )}
        {transactionStatus === 'failed' && (
          <>
            <Ionicons name="close-circle" size={64} color="#EF4444" />
            <Text style={sharedStyles.transactionText}>Transaction Failed</Text>
            <Text style={sharedStyles.transactionDetails}>
              Failed to purchase {selectedPlan?.data} for {phoneNumber}
            </Text>
          </>
        )}
        {(transactionStatus === 'success' || transactionStatus === 'failed') && (
          <Pressable style={sharedStyles.closeButton} onPress={onClose}>
            <Text style={sharedStyles.closeButtonText}>Close</Text>
          </Pressable>
        )}
      </View>
    </View>
  </Modal>
);

export default TransactionStatusModal;