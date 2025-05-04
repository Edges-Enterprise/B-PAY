import React from 'react';
import { View, Text, TouchableOpacity, Modal, Linking, Platform, StyleSheet, Image, Dimensions } from 'react-native';
import { colors } from '@/constants/colors';
import { useTheme } from '@/context/theme-context';
import { useFont } from '@/context/font-context';
import { LinearGradient } from 'expo-linear-gradient';

interface UpdateModalProps {
  visible: boolean;
  onClose: () => void;
  isStoreUpdate: boolean; // Indicates if a store update is required vs. an OTA update
}

const UpdateModal: React.FC<UpdateModalProps> = ({ visible, onClose, isStoreUpdate }) => {
  const { colorScheme } = useTheme();
  const { selectedFont } = useFont();
  const windowWidth = Dimensions.get('window').width;

  const handleUpdatePress = () => {
    if (isStoreUpdate) {
      // Fixed App Store URLs with correct format
      const storeUrl = Platform.OS === 'ios'
        ? 'https://apps.apple.com/us/app/id6741070697'
        : 'https://play.google.com/store/apps/details?id=com.challenzsocialapp.app';
      Linking.openURL(storeUrl).catch((err) => console.error('Error opening store:', err));
    }
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[
          styles.modalContainer,
          { backgroundColor: colors[colorScheme]?.background }
        ]}>
          <LinearGradient
            colors={[colors[colorScheme]?.primary, colors[colorScheme]?.background]}
            style={styles.gradientHeader}
          >
            <View style={styles.iconContainer}>
              <Image 
                source={require('@/assets/icon.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
          </LinearGradient>

          <View style={styles.contentContainer}>
            <Text style={[
              styles.title,
              { color: colors[colorScheme]?.foreground, fontFamily: selectedFont }
            ]}>
              Update Available
            </Text>
            
            <Text style={[
              styles.description,
              { color: colors[colorScheme]?.foreground, fontFamily: selectedFont }
            ]}>
              {isStoreUpdate
                ? 'A new version of the app is available. Please update from the store for the best experience.'
                : 'A new update is available. Restart the app to apply it.'}
            </Text>
            
            <TouchableOpacity
              onPress={handleUpdatePress}
              style={[
                styles.updateButton,
                { backgroundColor: colors[colorScheme]?.primary }
              ]}
            >
              <Text style={[
                styles.updateButtonText,
                { color: '#FFFFFF', fontFamily: selectedFont }
              ]}>
                {isStoreUpdate ? 'Update Now' : 'Restart Now'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={onClose}
              style={styles.cancelButton}
            >
              <Text style={[
                styles.cancelButtonText,
                { color: colors[colorScheme]?.foreground, fontFamily: selectedFont }
              ]}>
                Not Now
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(5px)',
  },
  modalContainer: {
    width: '85%',
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  gradientHeader: {
    width: '100%',
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  contentContainer: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 17,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    letterSpacing: 0.2,
    opacity: 0.9,
    paddingHorizontal: 8,
  },
  updateButton: {
    width: '100%',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  updateButtonText: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cancelButton: {
    padding: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
    opacity: 0.8,
  },
});

export default UpdateModal;