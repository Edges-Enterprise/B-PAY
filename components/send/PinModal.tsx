// components/PinModal.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Keyboard,
  BackHandler,
  Pressable,
  PanResponder,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 50; // Minimum drag distance to close

// Define props for different use cases
interface AmountScreenTransactionData {
  amount: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  remark: string;
  status: string;
  processingMessage?: string;
}

interface BPayTransactionData {
  recipientId: string;
  recipientTag: string;
  amount: string;
  note: string;
  isFirstTime: string;
  bonusAmount: string;
  pin: string;
  biometric?: string;
}

interface PinModalProps {
  visible: boolean;
  onClose: () => void;
  
  // Different callback signatures for different use cases
  onSuccess?: (pin: string) => Promise<boolean> | boolean; // For amount.tsx
  onPinSuccess?: (pin: string) => void; // For BPayTag.tsx
  
  onError?: (error: string) => void;
  
  // Transaction data for different use cases
  transactionData?: BPayTransactionData; // For BPayTag.tsx
  transactionDetails?: { // For BPayTag.tsx alternative
    recipientTag: string;
    amount: number;
    note: string;
    isFirstTime: boolean;
    bonusAmount: number;
  };
  
  // For amount.tsx use case - pass individual params
  amountScreenData?: AmountScreenTransactionData;
  
  pinLength?: number;
  isProcessing?: boolean;
}

const PinModal: React.FC<PinModalProps> = ({
  visible,
  onClose,
  onSuccess,
  onPinSuccess,
  onError,
  pinLength = 4,
  transactionData,
  transactionDetails,
  amountScreenData,
  isProcessing = false,
}) => {
  const [pin, setPin] = useState<string>('');
  const [selectedDigitIndex, setSelectedDigitIndex] = useState(-1);

  const inputRef = useRef<TextInput>(null);
  const slideUp = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  
  // Pulse animations for filled digits
  const pulseAnims = useRef(
    Array.from({ length: pinLength }, () => new Animated.Value(0))
  ).current;

  // Determine which use case we're handling
  const isBPayCase = !!transactionData || !!transactionDetails;
  const isAmountScreenCase = !!amountScreenData;

  // Animate pulse effect for filled digits
  useEffect(() => {
    if (pin.length > 0) {
      const index = pin.length - 1;
      Animated.sequence([
        Animated.timing(pulseAnims[index], {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnims[index], {
          toValue: 0.7,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [pin.length]);

  // Auto-submit when PIN is complete
  useEffect(() => {
    if (pin.length === pinLength) {
      handlePinComplete();
    }
  }, [pin]);

  // Handle modal open/close animations
  useEffect(() => {
    if (visible) {
      setPin('');
      setSelectedDigitIndex(-1);

      // Start all animations in parallel
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideUp, {
          toValue: 0,
          useNativeDriver: true,
          tension: 120,
          friction: 12,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Start pulse animation
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.02,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 1500,
              useNativeDriver: true,
            }),
          ])
        ).start();
        
        setTimeout(() => {
          inputRef.current?.focus();
        }, 50);
      });

      // Handle back button
      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          handleClose();
          return true;
        }
      );

      return () => {
        backHandler.remove();
        Keyboard.dismiss();
      };
    } else {
      // Reset animations when closing
      slideUp.setValue(SCREEN_HEIGHT);
      backdropOpacity.setValue(0);
      scaleAnim.setValue(0.8);
      fadeAnim.setValue(0);
      pulseAnim.setValue(1);
      dragY.setValue(0);
    }
  }, [visible]);

  const handleClose = useCallback(() => {
    setPin('');
    
    // Animate modal down
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideUp, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  }, [onClose]);

  const handlePinComplete = useCallback(async () => {
    if (pin.length !== pinLength) return;
    
    if (isAmountScreenCase) {
      // Handle amount.tsx case - call onSuccess and let parent handle routing
      if (onSuccess) {
        const success = await onSuccess(pin);
        if (success) {
          handleClose();
        }
      }
    } else if (isBPayCase) {
      // Handle BPayTag.tsx case - call onPinSuccess and route to success
      if (onPinSuccess) {
        onPinSuccess(pin);
      }
    } else {
      // Default behavior for backward compatibility
      if (onSuccess) {
        await onSuccess(pin);
      }
      handleClose();
    }
  }, [pin, pinLength, isAmountScreenCase, isBPayCase, onSuccess, onPinSuccess, handleClose]);

  // Format amount display
  const formatAmount = (amount: string | number) => {
    if (!amount && amount !== 0) return '';
    const num = typeof amount === 'string' 
      ? parseFloat(amount.replace(/[^0-9.-]+/g, '')) 
      : amount;
    if (isNaN(num)) return amount.toString();
    
    // Use Nigerian Naira symbol
    return `₦${num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Get transaction details for display
  const getDisplayData = () => {
    if (transactionData) {
      return {
        amount: transactionData.amount,
        recipientTag: transactionData.recipientTag,
        bonusAmount: transactionData.bonusAmount,
        isFirstTime: transactionData.isFirstTime === 'true',
        note: transactionData.note
      };
    }
    
    if (transactionDetails) {
      return {
        amount: transactionDetails.amount.toString(),
        recipientTag: transactionDetails.recipientTag,
        bonusAmount: transactionDetails.bonusAmount.toString(),
        isFirstTime: transactionDetails.isFirstTime,
        note: transactionDetails.note
      };
    }
    
    if (amountScreenData) {
      return {
        amount: amountScreenData.amount,
        recipientTag: amountScreenData.accountName,
        note: amountScreenData.remark
      };
    }
    
    return null;
  };

  const displayData = getDisplayData();

  // Create pan responder for drag gesture
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to vertical drags
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx * 2);
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow dragging down
        if (gestureState.dy > 0) {
          dragY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > SWIPE_THRESHOLD) {
          // Close modal if dragged down enough
          handleClose();
        } else {
          // Snap back to original position
          Animated.spring(dragY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 7,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        // Snap back to original position
        Animated.spring(dragY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }).start();
      },
    })
  ).current;

  const pinDigits = Array.from({ length: pinLength }, (_, i) => pin[i] || '');

  // Combined transform for drag gesture
  const modalTransform = [
    { translateY: Animated.add(slideUp, dragY) },
    { scale: scaleAnim }
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : -150}
      >
        {/* ANIMATED BACKDROP */}
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
          <Pressable
            style={styles.backdropTouchable}
            onPress={handleClose}
          />
        </Animated.View>

        {/* MAIN MODAL CONTENT */}
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: modalTransform,
              opacity: fadeAnim,
            },
          ]}
        >
          {/* DRAGGABLE HANDLE WITH PAN RESPONDER */}
          <View 
            style={styles.handleContainer}
            {...panResponder.panHandlers}
          >
            <View style={styles.handle} />
          </View>

          {/* GOLD ACCENT LINE */}
          <View style={styles.accentLine} />

          <Animated.View 
            style={[
              styles.modalContent,
              {
                transform: [{ scale: pulseAnim }]
              }
            ]}
          >
            {/* HEADER - Secure Authorization icon/text in GREEN */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}
              >
                <FontAwesome name="close" size={14} color="#FFD700" />
              </TouchableOpacity>
              <View style={styles.headerContent}>
                <View style={styles.lockIcon}>
                  <FontAwesome name="lock" size={14} color="#00FF00" />
                </View>
                <Text style={[styles.headerTitle, { color: '#00FF00' }]}>Secure Authorization</Text>
              </View>
              <View style={styles.spacer} />
            </View>

            <View style={styles.divider} />

            {/* TRANSACTION DETAILS */}
            {displayData && (
              <Animated.View style={styles.transactionBadge}>
                <Text style={styles.badgeAmount}>
                  {formatAmount(displayData.amount)}
                </Text>
                <Text style={styles.badgeSubtext}>
                  {isAmountScreenCase ? 'to' : 'to @'}{displayData.recipientTag}
                </Text>
                {displayData.bonusAmount && parseFloat(displayData.bonusAmount) > 0 && (
                  <Text style={styles.bonusText}>
                    +{formatAmount(displayData.bonusAmount)} bonus
                  </Text>
                )}
                {displayData.note && (
                  <Text style={styles.badgeNote}>{displayData.note}</Text>
                )}
                {displayData.isFirstTime && (
                  <View style={styles.firstTimeBadge}>
                    <FontAwesome name="star" size={10} color="#FFD700" />
                    <Text style={styles.firstTimeText}>First Transaction</Text>
                  </View>
                )}
              </Animated.View>
            )}

            {/* PIN INPUT SECTION */}
            <View style={styles.pinSection}>
              <View style={styles.sectionHeader}>
                <FontAwesome name="key" size={18} color="#FFD700" />
                <Text style={styles.sectionTitle}>Enter Security PIN</Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                Enter your {pinLength}-digit PIN to authorize this transaction
              </Text>

              {/* PIN INPUT BOXES */}
              <View style={styles.pinRow}>
                {pinDigits.map((digit, index) => {
                  const isFilled = !!digit;
                  const isActive = index === selectedDigitIndex && !digit;
                  const isPulse = isFilled && pulseAnims[index];

                  return (
                    <Animated.View
                      key={index}
                      style={[
                        styles.pinBoxWrapper,
                        isPulse && {
                          transform: [
                            {
                              scale: isPulse.interpolate({
                                inputRange: [0, 1],
                                outputRange: [1, 1.1],
                              }),
                            },
                          ],
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.pinBox,
                          isFilled && styles.pinBoxFilled,
                          isActive && styles.pinBoxActive,
                        ]}
                      >
                        {isFilled ? (
                          <View style={styles.pinDot} />
                        ) : (
                          <Text style={styles.placeholderDigit}>{index + 1}</Text>
                        )}
                      </View>
                      {isActive && <View style={styles.activeCursor} />}
                    </Animated.View>
                  );
                })}
              </View>

              {/* PROGRESS INDICATOR - Progress line in GREEN */}
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { 
                  width: `${(pin.length / pinLength) * 100}%`,
                  backgroundColor: '#00FF00'
                }]} />
              </View>

              {/* SECURITY NOTE - RED with reduced font size */}
              <Animated.View style={styles.securityNote}>
                <FontAwesome name="shield" size={10} color="#FF4444" />
                <Text style={[styles.securityNoteText, { color: '#FF4444' }]}>
                  Your PIN is encrypted and never leaves your device
                </Text>
              </Animated.View>

              {/* INVISIBLE TEXT INPUT */}
              <TextInput
                ref={inputRef}
                value={pin}
                onChangeText={(text) => {
                  const clean = text.replace(/\D/g, '').slice(0, pinLength);
                  setPin(clean);
                  setSelectedDigitIndex(clean.length - 1);
                }}
                keyboardType="number-pad"
                maxLength={pinLength}
                caretHidden
                style={styles.hiddenInput}
                autoComplete="off"
                textContentType="password"
                autoFocus={visible}
              />
            </View>

            {/* ACTION SECTION */}
            <View style={styles.actionSection}>
              {/* FORGET PIN LINK */}
              <TouchableOpacity
                style={styles.helpButton}
                onPress={() => {
                  if (onError) {
                    onError("Please contact support for PIN recovery");
                  } else {
                    console.log("Forgot PIN clicked");
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.helpText}>Forgot PIN?</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropTouchable: {
    flex: 1,
  },
  modalContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 25,
    overflow: 'hidden',
    minHeight: 400,
    maxHeight: SCREEN_HEIGHT * 0.7,
  },
  handleContainer: {
    paddingTop: 12,
    paddingBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 215, 0, 0.6)',
  },
  accentLine: {
    height: 2,
    backgroundColor: '#FFD700',
    borderRadius: 1,
    width: '100%',
  },
  modalContent: {
    flex: 1,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    justifyContent: 'center',
  },
  lockIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFD700',
    letterSpacing: 0.3,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  spacer: {
    width: 30,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    marginHorizontal: 20,
  },
  transactionBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  badgeAmount: {
    color: '#FFD700',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  badgeSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginBottom: 6,
  },
  bonusText: {
    color: '#00FF7F',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  badgeNote: {
    color: 'rgba(255, 215, 0, 0.7)',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  firstTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 8,
    gap: 4,
  },
  firstTimeText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '600',
  },
  pinSection: {
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  sectionSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
  },
  pinRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  pinBoxWrapper: {
    position: 'relative',
  },
  pinBox: {
    backgroundColor: 'transparent',
    width: 52,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  pinBoxFilled: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  pinBoxActive: {
    borderColor: 'rgba(255, 215, 0, 0.5)',
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
  },
  placeholderDigit: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 14,
    fontWeight: '500',
  },
  pinDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFD700',
  },
  activeCursor: {
    position: 'absolute',
    width: 2,
    height: 24,
    backgroundColor: '#FFD700',
    borderRadius: 1,
    top: 18,
    left: 25,
    opacity: 0.6,
  },
  progressBar: {
    width: '100%',
    height: 2,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 1,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.05)',
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#FF4444',
    marginBottom: 20,
  },
  securityNoteText: {
    fontSize: 11,
    marginLeft: 8,
    fontWeight: '500',
    flex: 1,
    textAlign: 'center',
  },
  actionSection: {
    alignItems: 'center',
    gap: 16,
  },
  helpButton: {
    paddingVertical: 8,
  },
  helpText: {
    color: '#FFD700',
    fontSize: 13,
    textDecorationLine: 'underline',
    opacity: 0.8,
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    top: -100,
    left: -100,
  },
});

export default PinModal;