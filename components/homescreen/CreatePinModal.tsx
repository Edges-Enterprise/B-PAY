

import React from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Modal,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { sharedStyles } from "./styles";

interface CreatePinModalProps {
  visible: boolean;
  onClose: () => void;
  newPin: string;
  setNewPin: (text: string) => void;
  confirmPin: string;
  setConfirmPin: (text: string) => void;
  showNewPin: boolean;
  setShowNewPin: (value: boolean) => void;
  showConfirmPin: boolean;
  setShowConfirmPin: (value: boolean) => void;
  onSave: () => void;
  isLoading?: boolean;
}

const CreatePinModal: React.FC<CreatePinModalProps> = ({
  visible,
  onClose,
  newPin,
  setNewPin,
  confirmPin,
  setConfirmPin,
  showNewPin,
  setShowNewPin,
  showConfirmPin,
  setShowConfirmPin,
  onSave,
  isLoading = false,
}) => (
  <Modal
    visible={visible}
    animationType="slide"
    transparent
    onRequestClose={onClose}
  >
    <View style={sharedStyles.modalContainer}>
      <KeyboardAvoidingView
        behavior="height"
        style={sharedStyles.modalSheet}
      >
        <View style={sharedStyles.modalHeader}>
          <Text style={sharedStyles.sheetTitle}>Create Transaction PIN</Text>
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={24} color="white" />
          </Pressable>
        </View>
        <View style={{ position: "relative" }}>
          <TextInput
            style={[sharedStyles.input, { paddingRight: 40 }]}
            placeholder="New PIN (4-6 digits)"
            placeholderTextColor="#999"
            keyboardType="numeric"
            secureTextEntry={!showNewPin}
            maxLength={6}
            value={newPin}
            onChangeText={setNewPin}
          />
          <Pressable
            style={sharedStyles.eyeButton}
            onPress={() => setShowNewPin(!showNewPin)}
          >
            <Ionicons
              name={showNewPin ? "eye-off-sharp" : "eye-sharp"}
              size={20}
              color="gray"
            />
          </Pressable>
        </View>
        <View style={{ position: "relative" }}>
          <TextInput
            style={[sharedStyles.input, { paddingRight: 40 }]}
            placeholder="Confirm PIN (4-6 digits)"
            placeholderTextColor="#999"
            keyboardType="numeric"
            secureTextEntry={!showConfirmPin}
            maxLength={6}
            value={confirmPin}
            onChangeText={setConfirmPin}
          />
          <Pressable
            style={sharedStyles.eyeButton}
            onPress={() => setShowConfirmPin(!showConfirmPin)}
          >
            <Ionicons
              name={showConfirmPin ? "eye-off" : "eye"}
              size={20}
              color="gray"
            />
          </Pressable>
        </View>
        <Pressable
          style={[sharedStyles.continueButton, isLoading && { opacity: 0.7 }]}
          onPress={onSave}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={sharedStyles.continueButtonText}>Save</Text>
          )}
        </Pressable>
      </KeyboardAvoidingView>
    </View>
  </Modal>
);

export default CreatePinModal;