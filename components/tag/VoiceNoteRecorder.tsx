import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';

interface VoiceNoteRecorderProps {
  onVoiceNoteSave: (text: string) => void;
}

export default function VoiceNoteRecorder({ onVoiceNoteSave }: VoiceNoteRecorderProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');

  const startRecording = async () => {
    setIsRecording(true);
    // Here you would integrate with actual speech-to-text service
    // For now, we'll simulate it
    setTimeout(() => {
      setIsRecording(false);
      setTranscribedText("Sample transcribed voice note text");
    }, 2000);
  };

  const stopRecording = () => {
    setIsRecording(false);
  };

  const saveNote = () => {
    if (transcribedText) {
      onVoiceNoteSave(transcribedText);
      setModalVisible(false);
      setTranscribedText('');
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.iconButton}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="mic-outline" size={24} color="#FFD700" />
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Voice Note</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.recorderContainer}>
              {isRecording ? (
                <View style={styles.recordingIndicator}>
                  <View style={styles.pulsingCircle} />
                  <Text style={styles.recordingText}>Listening...</Text>
                  <Text style={styles.recordingHint}>Speak now</Text>
                </View>
              ) : (
                <View style={styles.readyContainer}>
                  <Ionicons name="mic" size={64} color="#FFD700" />
                  <Text style={styles.readyText}>Tap to start recording</Text>
                </View>
              )}

              {transcribedText ? (
                <View style={styles.transcriptionContainer}>
                  <Text style={styles.transcriptionLabel}>Transcription:</Text>
                  <Text style={styles.transcriptionText}>{transcribedText}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.modalActions}>
              {!transcribedText ? (
                <TouchableOpacity
                  style={[styles.actionButton, isRecording && styles.recordingButton]}
                  onPress={isRecording ? stopRecording : startRecording}
                >
                  <Ionicons
                    name={isRecording ? 'stop' : 'mic'}
                    size={24}
                    color="#000"
                  />
                  <Text style={styles.actionButtonText}>
                    {isRecording ? 'Stop' : 'Record'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.secondaryButton]}
                    onPress={() => setTranscribedText('')}
                  >
                    <Text style={styles.secondaryButtonText}>Redo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.primaryButton]}
                    onPress={saveNote}
                  >
                    <Text style={styles.primaryButtonText}>Use This Note</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    padding: 8,
  },
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
    minHeight: 300,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  recorderContainer: {
    alignItems: 'center',
    marginVertical: 30,
  },
  recordingIndicator: {
    alignItems: 'center',
  },
  pulsingCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingText: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  recordingHint: {
    color: '#999',
    fontSize: 14,
    marginTop: 8,
  },
  readyContainer: {
    alignItems: 'center',
  },
  readyText: {
    color: '#999',
    fontSize: 16,
    marginTop: 16,
  },
  transcriptionContainer: {
    marginTop: 30,
    padding: 16,
    backgroundColor: '#000',
    borderRadius: 12,
    width: '100%',
  },
  transcriptionLabel: {
    color: '#999',
    fontSize: 12,
    marginBottom: 8,
  },
  transcriptionText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#FFD700',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  recordingButton: {
    backgroundColor: '#FF4444',
  },
  actionButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#FFD700',
  },
  primaryButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  secondaryButtonText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '600',
  },
});