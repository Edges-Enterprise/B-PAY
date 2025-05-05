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

const CreatePinModal = ({
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
          <Text style={sharedStyles.sheetTitle}>Create Transaction PIN</Text>
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={24} color="white" />
          </Pressable>
        </View>
        <View style={{ position: 'relative' }}>
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
            <Ionicons name={showNewPin ? 'eye-off' : 'eye'} size={20} color="gray" />
          </Pressable>
        </View>
        <View style={{ position: 'relative' }}>
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
            <Ionicons name={showConfirmPin ? 'eye-off' : 'eye'} size={20} color="gray" />
          </Pressable>
        </View>
        <Pressable
          style={sharedStyles.continueButton}
          onPress={onSave}
        >
          <Text style={sharedStyles.continueButtonText}>Save</Text>
        </Pressable>
      </KeyboardAvoidingView>
    </View>
  </Modal>
);

export default CreatePinModal;