
import React, { useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { sharedStyles } from './styles';

interface PurchaseModalProps {
  visible: boolean;
  onClose: () => void;
  selectedPlan: string;
  phoneNumber: string;
  setPhoneNumber: (text: string) => void;
  transactionPin: string;
  setTransactionPin: (text: string) => void;
  networkProvider: string;
  hasPin: boolean;
  defaultPin?: string; // New prop to receive the default PIN when hasPin is true
  showTransactionPin: boolean;
  setShowTransactionPin: (value: boolean) => void;
  onCreatePin: () => void;
  onContinue: () => void;
  isLoading?: boolean;
  pinError?: string | null;
}

const PurchaseModal: React.FC<PurchaseModalProps> = ({
  visible,
  onClose,
  selectedPlan,
  phoneNumber,
  setPhoneNumber,
  transactionPin,
  setTransactionPin,
  networkProvider,
  hasPin = false,
  defaultPin = '',
  showTransactionPin,
  setShowTransactionPin,
  onCreatePin,
  onContinue,
  isLoading = false,
  pinError = null,
}) => {
  // Set the transaction pin to defaultPin when hasPin is true and transactionPin is empty
  useEffect(() => {
    if (hasPin && defaultPin && !transactionPin) {
      setTransactionPin(defaultPin);
    }
  }, [hasPin, defaultPin, transactionPin, setTransactionPin]);

  // Debugging effect to track prop changes
  useEffect(() => {
    console.log(
      "PurchaseModal props updated -",
      `hasPin: ${hasPin}`,
      `visible: ${visible}`,
      `defaultPin: ${defaultPin}`,
      { timestamp: Date.now() }
    );
  }, [hasPin, visible, defaultPin]);

  if (!visible) return null;

  const handlePhoneNumberChange = (text: string) => {
    // Allow only numbers and limit to 11 characters
    const formattedText = text.replace(/[^0-9]/g, '').slice(0, 11);
    setPhoneNumber(formattedText);
  };

  const handlePinChange = (text: string) => {
    // Allow only numbers and limit to 6 characters
    const formattedText = text.replace(/[^0-9]/g, '').slice(0, 6);
    setTransactionPin(formattedText);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={sharedStyles.modalContainer}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={sharedStyles.modalSheet}
        >
          <View style={sharedStyles.modalHeader}>
            <Text style={sharedStyles.sheetTitle}>{selectedPlan}</Text>
            <Pressable onPress={onClose} testID="close-button">
              <Ionicons name="close" size={24} color="white" />
            </Pressable>
          </View>

          {/* Phone Number Input */}
          <View style={sharedStyles.inputContainer}>
            <Text style={sharedStyles.label}>Phone Number</Text>
            <TextInput
              style={sharedStyles.input}
              placeholder="08012345678"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
              maxLength={11}
              value={phoneNumber}
              onChangeText={handlePhoneNumberChange}
              autoComplete="tel"
              textContentType="telephoneNumber"
            />
          </View>

          {networkProvider && (
            <Text style={sharedStyles.networkText}>
              Network: {networkProvider}
            </Text>
          )}

          {/* Transaction PIN Input */}
          <View style={sharedStyles.inputContainer}>
            <Text style={sharedStyles.label}>
              Transaction PIN
              {!hasPin && (
                <Text style={sharedStyles.requiredAsterisk}> *</Text>
              )}
            </Text>
            <View style={sharedStyles.pinInputContainer}>
              <TextInput
                style={[
                  sharedStyles.input,
                  { paddingRight: hasPin ? 40 : 80 },
                ]}
                placeholder={
                  hasPin 
                    ? "Enter your PIN" 
                    : "Create a transaction PIN"
                }
                placeholderTextColor="#999"
                keyboardType="number-pad"
                secureTextEntry={!showTransactionPin}
                maxLength={6}
                value={transactionPin}
                onChangeText={handlePinChange}
                testID="pin-input"
              />
              <Pressable
                style={sharedStyles.eyeButton}
                onPress={() => setShowTransactionPin(!showTransactionPin)}
                testID="toggle-pin-visibility"
              >
                <Ionicons
                  name={showTransactionPin ? 'eye-off' : 'eye'}
                  size={20}
                  color="gray"
                />
              </Pressable>
              {!hasPin && (
                <Pressable
                  style={sharedStyles.createButton}
                  onPress={onCreatePin}
                  testID="create-pin-button"
                >
                  <Text style={sharedStyles.createButtonText}>Create PIN</Text>
                </Pressable>
              )}
            </View>
            {pinError && (
              <Text style={sharedStyles.errorText}>{pinError}</Text>
            )}
          </View>

          {/* Continue Button */}
          <Pressable
            style={[
              sharedStyles.continueButton,
              isLoading && sharedStyles.disabledButton,
            ]}
            onPress={onContinue}
            disabled={isLoading}
            testID="continue-button"
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={sharedStyles.continueButtonText}>Continue</Text>
            )}
          </Pressable>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

export default PurchaseModal;
