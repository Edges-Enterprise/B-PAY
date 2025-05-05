import React from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { sharedStyles } from './styles';

const PurchaseModal = ({
  visible,
  onClose,
  selectedPlan,
  phoneNumber,
  setPhoneNumber,
  transactionPin,
  setTransactionPin,
  networkProvider,
  hasTransactionPin,
  showTransactionPin,
  setShowTransactionPin,
  onCreatePin,
  onContinue,
}) => (
  <Modal
    visible={visible}
    animationType="slide"
    transparent
    onRequestClose={onClose}
  >
    <View style={sharedStyles.modalContainer}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={sharedStyles.modalSheet}
      >
        <View style={sharedStyles.modalHeader}>
          <Text style={sharedStyles.sheetTitle}>{selectedPlan}</Text>
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={24} color="white" />
          </Pressable>
        </View>
        <TextInput
          style={sharedStyles.input}
          placeholder="Enter phone number"
          placeholderTextColor="#999"
          keyboardType="numeric"
          maxLength={11}
          value={phoneNumber}
          onChangeText={setPhoneNumber}
        />
        {networkProvider !== '' && (
          <Text style={sharedStyles.networkText}>{networkProvider}</Text>
        )}
        <View>
          <Text style={sharedStyles.label}>Transaction PIN</Text>
          <View style={{ position: 'relative' }}>
            <TextInput
              style={[sharedStyles.input, { paddingRight: hasTransactionPin ? 40 : 80 }]}
              placeholder="Enter transaction PIN"
              placeholderTextColor="#999"
              keyboardType="numeric"
              secureTextEntry={!showTransactionPin}
              maxLength={6}
              value={transactionPin}
              onChangeText={setTransactionPin}
            />
            <Pressable
              style={sharedStyles.eyeButton}
              onPress={() => setShowTransactionPin(!showTransactionPin)}
            >
              <Ionicons
                name={showTransactionPin ? 'eye-off' : 'eye'}
                size={20}
                color="gray"
              />
            </Pressable>
            {!hasTransactionPin && (
              <Pressable
                style={sharedStyles.createButton}
                onPress={onCreatePin}
              >
                <Text style={sharedStyles.createButtonText}>Create</Text>
              </Pressable>
            )}
          </View>
        </View>
        <Pressable style={sharedStyles.continueButton} onPress={onContinue}>
          <Text style={sharedStyles.continueButtonText}>Continue</Text>
        </Pressable>
      </KeyboardAvoidingView>
    </View>
  </Modal>
);

export default PurchaseModal;