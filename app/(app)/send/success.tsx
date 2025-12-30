// success.tsx (SendSuccessScreen)
import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';

const { width } = Dimensions.get('window');

interface SuccessParams {
  amount: string;
  recipientTag?: string;
  accountName?: string;
  accountNumber?: string;
  bankName?: string;
  bonusAmount?: string;
  isFirstTime?: string;
  note?: string;
  status?: 'processing' | 'success' | 'failed';
  processingMessage?: string;
  errorMessage?: string;
}

export default function SendSuccessScreen() {
  const params = useLocalSearchParams<SuccessParams>();
  const navigation = useNavigation();
  
  const amount = parseFloat(params.amount || '0');
  const recipientTag = params.recipientTag || params.accountName || '';
  const accountNumber = params.accountNumber || '';
  const bankName = params.bankName || '';
  const bonusAmount = parseFloat(params.bonusAmount || '0');
  const isFirstTime = params.isFirstTime === 'true';
  const note = params.note || '';
  const status = params.status || 'processing';
  const processingMessage = params.processingMessage || 'Processing your transaction...';
  const errorMessage = params.errorMessage || '';
  
  const [transactionStatus, setTransactionStatus] = useState<'processing' | 'success' | 'failed'>(status as any);
  const [isProcessingComplete, setIsProcessingComplete] = useState(false);

  // Watermark pulse animation
  const watermarkPulse = useRef(new Animated.Value(1)).current;

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;
  const iconScale = useRef(new Animated.Value(0)).current;
  const detailsFade = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const spinValue = useRef(new Animated.Value(0)).current;
  const processingDotPulse = useRef(new Animated.Value(1)).current;

  // Create spinning animation for processing
  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  // Create pulsing animation for processing dot
  const dotPulse = processingDotPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 1.3]
  });

  // Start watermark pulse animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(watermarkPulse, {
          toValue: 1.06,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(watermarkPulse, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  // Start processing dot pulse animation
  useEffect(() => {
    if (transactionStatus === 'processing') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(processingDotPulse, {
            toValue: 1.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(processingDotPulse, {
            toValue: 0.7,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }
  }, [transactionStatus]);

  useEffect(() => {
    // Disable going back while processing
    navigation.setOptions({
      gestureEnabled: false,
      headerShown: false,
    });

    // Start animations immediately
    Animated.parallel([
      Animated.timing(fadeIn, { 
        toValue: 1, 
        duration: 800, 
        useNativeDriver: true 
      }),
      Animated.spring(slideUp, { 
        toValue: 0, 
        useNativeDriver: true, 
        tension: 40, 
        friction: 8,
        delay: 100
      }),
      Animated.timing(detailsFade, { 
        toValue: 1, 
        duration: 600, 
        delay: 200,
        useNativeDriver: true 
      }),
    ]).start();

    // Start spinner animation immediately for processing
    if (transactionStatus === 'processing') {
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        })
      ).start();
    }

    // Simulate transaction processing
    if (transactionStatus === 'processing') {
      const timer = setTimeout(() => {
        setIsProcessingComplete(true);
        // After processing is complete, change to success state
        setTransactionStatus('success');
      }, 3000); // Simulate 3 seconds processing time

      return () => clearTimeout(timer);
    }

    // Icon entrance animation (only for success state)
    if (transactionStatus === 'success') {
      Animated.sequence([
        Animated.spring(iconScale, { 
          toValue: 1.1, 
          useNativeDriver: true, 
          tension: 50,
          friction: 3
        }),
        Animated.spring(iconScale, { 
          toValue: 1, 
          useNativeDriver: true, 
          tension: 100,
          friction: 5
        }),
      ]).start();
    }

    // Subtle pulse for checkmark (only for success)
    if (transactionStatus === 'success') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.15, duration: 1500, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 1500, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [transactionStatus]);

  const handleDone = () => {
    router.replace('/(app)/(protected)');
  };

  const handleSendAgain = () => {
    router.replace('/(app)/send');
  };

  // Check if text contains "processing" (case insensitive)
  const isProcessingText = (text: string) => {
    return text.toLowerCase().includes('processing');
  };

  return (
    <View style={styles.container}>
      {/* WATERMARK */}
      <Animated.View pointerEvents="none" style={styles.watermarkWrapper}>
        <Animated.Image
          source={require('@/assets/icons/home.png')}
          style={[styles.watermark, { transform: [{ scale: watermarkPulse }] }]}
          resizeMode="contain"
        />
      </Animated.View>

      {/* ANIMATED BACKGROUND ELEMENTS */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />
      
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeIn,
            transform: [{ translateY: slideUp }]
          }
        ]}
      >
        {/* PROCESSING/SUCCESS/FAILED INDICATOR */}
        <View style={styles.iconContainer}>
          {transactionStatus === 'processing' ? (
            <Animated.View 
              style={[
                styles.processingSpinnerContainer, 
                { transform: [{ rotate: spin }] }
              ]}
            >
              <View style={styles.spinnerOuterRing}>
                <View style={styles.spinnerMiddleRing}>
                  <View style={styles.spinnerInnerRing}>
                    <ActivityIndicator size="large" color="#4CAF50" /> {/* Green spinner */}
                  </View>
                </View>
              </View>
            </Animated.View>
          ) : transactionStatus === 'success' ? (
            <Animated.View style={[styles.iconContainer, { transform: [{ scale: iconScale }] }]}>
              <View style={styles.iconGlow} />
              <Image
                source={require('@/assets/images/home-3.png')}
                style={styles.logoIcon}
                resizeMode="contain"
              />
              <Animated.View style={[styles.checkmarkBadge, { transform: [{ scale: pulse }] }]}>
                <Ionicons name="checkmark" size={18} color="#000" />
              </Animated.View>
            </Animated.View>
          ) : (
            <View style={styles.failedIconContainer}>
              <Ionicons name="close-circle" size={70} color="#EF4444" /> {/* Smaller icon */}
              <View style={styles.failedIconSpacer} />
            </View>
          )}
        </View>

        {/* STATUS MESSAGE */}
        <View style={[
          styles.statusMessageContainer,
          transactionStatus === 'failed' && styles.failedStatusMessageContainer
        ]}>
          <Text style={[
            styles.successTitle,
            transactionStatus === 'processing' && isProcessingText('Processing Payment...') && styles.processingText,
            transactionStatus === 'failed' && styles.failedText
          ]}>
            {transactionStatus === 'processing' 
              ? 'Processing Payment...' 
              : transactionStatus === 'success'
              ? 'Payment Successful!'
              : 'Payment Failed'}
          </Text>
          <Text style={[
            styles.successSubtitle,
            transactionStatus === 'processing' && isProcessingText(processingMessage) && styles.processingText,
            transactionStatus === 'failed' && styles.failedText
          ]}>
            {transactionStatus === 'processing' 
              ? processingMessage
              : transactionStatus === 'success'
              ? 'Your transaction has been processed securely'
              : errorMessage || 'Transaction could not be completed'}
          </Text>
        </View>

        {/* AMOUNT CARD */}
        <Animated.View 
          style={[
            styles.amountCard, 
            transactionStatus === 'processing' && styles.processingCard,
            transactionStatus === 'failed' && styles.failedCard,
            { opacity: detailsFade }
          ]}
        >
          <View style={[
            styles.amountGlow,
            transactionStatus === 'processing' && styles.processingAmountGlow,
            transactionStatus === 'failed' && styles.failedAmountGlow
          ]} />
          <Text style={[
            styles.amountLabel, 
            transactionStatus === 'processing' && isProcessingText('Processing Amount') && styles.processingText,
            transactionStatus === 'failed' && styles.failedText
          ]}>
            {transactionStatus === 'processing' ? 'Processing Amount' : 'Amount Sent'}
          </Text>
          <Text style={[
            styles.amount
          ]}>
            ₦{amount.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
        </Animated.View>

        {/* TRANSACTION DETAILS */}
        <Animated.View 
          style={[
            styles.detailsCard, 
            { opacity: detailsFade }, 
            transactionStatus === 'processing' && styles.processingCard,
            transactionStatus === 'failed' && styles.failedCard,
          ]}
        >
          <View style={[
            styles.cardBorder,
            transactionStatus === 'processing' && styles.processingCardBorder,
            transactionStatus === 'failed' && styles.failedCardBorder
          ]} />
          
          {/* Recipient Info */}
          {recipientTag && (
            <>
              <View style={styles.detailRow}>
                <View style={styles.labelRow}>
                  <Ionicons 
                    name="person-outline" 
                    size={14} 
                    color="#FFD700" 
                  />
                  <Text style={styles.label}>Recipient</Text>
                </View>
                <Text style={styles.value}>{recipientTag}</Text>
              </View>
              <View style={styles.dividerLine} />
            </>
          )}

          {/* Account Number */}
          {accountNumber && (
            <>
              <View style={styles.detailRow}>
                <View style={styles.labelRow}>
                  <Ionicons 
                    name="card-outline" 
                    size={14} 
                    color="#FFD700" 
                  />
                  <Text style={styles.label}>Account Number</Text>
                </View>
                <Text style={styles.value}>{accountNumber}</Text>
              </View>
              <View style={styles.dividerLine} />
            </>
          )}

          {/* Bank Name */}
          {bankName && (
            <>
              <View style={styles.detailRow}>
                <View style={styles.labelRow}>
                  <Ionicons 
                    name="business-outline" 
                    size={14} 
                    color="#FFD700" 
                  />
                  <Text style={styles.label}>Bank</Text>
                </View>
                <Text style={styles.value}>{bankName}</Text>
              </View>
              <View style={styles.dividerLine} />
            </>
          )}

          {isFirstTime && (
            <>
              <View style={styles.detailRow}>
                <View style={styles.labelRow}>
                  <Ionicons name="gift-outline" size={14} color="#4CAF50" />
                  <Text style={styles.label}>First-Time Bonus</Text>
                </View>
                <Text style={[styles.value, styles.bonusText]}>
                  +₦{bonusAmount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>
              <View style={styles.dividerLine} />
            </>
          )}

          {note && (
            <>
              <View style={styles.detailRow}>
                <View style={styles.labelRow}>
                  <Ionicons 
                    name="chatbox-outline" 
                    size={14} 
                    color="#FFD700" 
                  />
                  <Text style={styles.label}>Note</Text>
                </View>
                <Text style={[styles.value, styles.noteText]}>{note}</Text>
              </View>
              <View style={styles.dividerLine} />
            </>
          )}

          <View style={styles.detailRow}>
            <View style={styles.labelRow}>
              <Ionicons 
                name="shield-checkmark-outline" 
                size={14} 
                color="#4CAF50" 
              />
              <Text style={styles.label}>Status</Text>
            </View>
            <View style={[
              styles.statusBadge, 
              transactionStatus === 'processing' && styles.processingStatusBadge,
              transactionStatus === 'failed' && styles.failedStatusBadge
            ]}>
              {transactionStatus === 'processing' ? (
                <Animated.View style={{ transform: [{ scale: dotPulse }] }}>
                  <View style={styles.processingStatusDot} />
                </Animated.View>
              ) : (
                <View style={[
                  styles.statusDot, 
                  transactionStatus === 'failed' && styles.failedStatusDot
                ]} />
              )}
             <Text style={[
  transactionStatus === 'processing' && isProcessingText('Processing...') && styles.processingText,
  transactionStatus === 'failed' && styles.failedStatusText,
  transactionStatus === 'success' && styles.statusText // Add this for success state
]}>
   {transactionStatus === 'processing' ? 'Processing...' : 
   transactionStatus === 'success' ? 'Verified' : 'Failed'}
</Text>
            </View>
          </View>

          <View style={styles.dividerLine} />

          <View style={styles.detailRow}>
            <View style={styles.labelRow}>
              <Ionicons 
                name="time-outline" 
                size={14} 
                color="#FFD700" 
              />
              <Text style={styles.label}>Date</Text>
            </View>
            <Text style={styles.value}>
              {new Date().toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </Text>
          </View>

          <View style={styles.dividerLine} />

          <View style={styles.detailRow}>
            <View style={styles.labelRow}>
              <Ionicons 
                name="receipt-outline" 
                size={14} 
                color="#FFD700" 
              />
              <Text style={styles.label}>Transaction ID</Text>
            </View>
            <Text style={styles.txId}>
              {Date.now().toString(36).toUpperCase().slice(-8)}
            </Text>
          </View>
        </Animated.View>

        {/* ACTION BUTTONS - Only show when transaction is successful or failed */}
        {(transactionStatus === 'success' || transactionStatus === 'failed') && (
          <Animated.View style={[styles.buttonContainer, { opacity: detailsFade }]}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleDone}
              activeOpacity={0.7}
            >
              <View style={styles.buttonIconCircle}>
                <Ionicons name="home-outline" size={24} color="#FFD700" />
              </View>
              <Text style={styles.buttonLabel}>Home</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleSendAgain}
              activeOpacity={0.7}
            >
              <View style={styles.buttonIconCircle}>
                <Ionicons name="repeat-outline" size={24} color="#FFD700" />
              </View>
              <Text style={styles.buttonLabel}>Send Again</Text>
            </TouchableOpacity>

            {transactionStatus === 'success' && (
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => {}}
                activeOpacity={0.7}
              >
                <View style={styles.buttonIconCircle}>
                  <Ionicons name="share-outline" size={24} color="#FFD700" />
                </View>
                <Text style={styles.buttonLabel}>Share</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        )}

        {/* SECURITY FOOTER */}
        <Animated.View 
          style={[
            styles.securityFooter,
            transactionStatus === 'processing' && styles.processingSecurityFooter,
            transactionStatus === 'failed' && styles.failedSecurityFooter,
            { opacity: detailsFade }
          ]}
        >
          <View style={styles.securityBadge}>
            <Ionicons name="lock-closed" size={14} color="#4CAF50" />
            <Text style={[
              styles.securityText,
              transactionStatus === 'processing' && isProcessingText('AES-256') && styles.processingText
            ]}>
              AES-256
            </Text>
          </View>
          <View style={styles.securityDivider} />
          <View style={styles.securityBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#4CAF50" />
            <Text style={[
              styles.securityText,
              transactionStatus === 'processing' && isProcessingText('SSL') && styles.processingText
            ]}>
              SSL
            </Text>
          </View>
          <View style={styles.securityDivider} />
          <Text style={[
            styles.encryptionText,
            transactionStatus === 'processing' && isProcessingText('Securing Transaction...') && styles.processingText,
            transactionStatus === 'failed' && styles.failedEncryptionText
          ]}>
            {transactionStatus === 'processing' ? 'Securing Transaction...' : 
             transactionStatus === 'success' ? 'End-to-End Encrypted' :
             'Transaction Failed'}
          </Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  // Watermark styles
  watermarkWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  watermark: {
    width: 300,
    height: 300,
    opacity: 0.1,
  },
  bgCircle1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#FFD700',
    opacity: 0.03,
  },
  bgCircle2: {
    position: 'absolute',
    bottom: -150,
    left: -150,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: '#4CAF50',
    opacity: 0.02,
  },
  content: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    zIndex: 2,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 12, // Reduced for failed state
    alignItems: 'center',
    justifyContent: 'center',
    height: 130, // Reduced height
  },
  failedIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 90, // Reduced height for failed state
  },
  failedIconSpacer: {
    height: 20, // Increased space between icon and text
  },
  statusMessageContainer: {
    alignItems: 'center',
    marginBottom: 20, // Reduced spacing
  },
  failedStatusMessageContainer: {
    marginBottom: 16, // Less space for failed state
  },
  iconGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFD700',
    opacity: 0.15,
  },
  processingSpinnerContainer: {
    width: 110, // Slightly smaller
    height: 110, // Slightly smaller
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerOuterRing: {
    width: 90, // Smaller
    height: 90, // Smaller
    borderRadius: 45,
    borderWidth: 3,
    borderColor: 'rgba(76, 175, 80, 0.3)', // Green
    borderTopColor: '#4CAF50', // Green
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerMiddleRing: {
    width: 70, // Smaller
    height: 70, // Smaller
    borderRadius: 35,
    borderWidth: 2,
    borderColor: 'rgba(76, 175, 80, 0.2)', // Green
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerInnerRing: {
    width: 50, // Smaller
    height: 50, // Smaller
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.1)', // Green
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIcon: {
    width: 110, // Slightly smaller
    height: 110, // Slightly smaller
  },
  checkmarkBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#000',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  successTitle: {
    fontSize: 22, // Slightly smaller
    fontWeight: '700',
    marginBottom: 6, // Reduced
    textAlign: 'center',
    color: '#fff',
  },
  successSubtitle: {
    fontSize: 13, // Slightly smaller
    textAlign: 'center',
    opacity: 0.9,
    color: '#888',
  },
  amountCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 16,
    padding: 18, // Reduced padding
    alignItems: 'center',
    marginBottom: 18, // Reduced
    borderWidth: 1.5,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    overflow: 'hidden',
    position: 'relative',
    minHeight: 120, // Reduced height
  },
  processingCard: {
    backgroundColor: 'rgba(17, 17, 17, 0.9)', // Normal background, not green
    borderColor: 'rgba(76, 175, 80, 0.4)', // Green border
  },
  failedCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
    width: '85%', // Reduced width
    padding: 16, // Less padding
    minHeight: 110, // Reduced height
  },
  amountGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#FFD700',
    opacity: 0.5,
  },
  processingAmountGlow: {
    backgroundColor: '#4CAF50', // Green
    opacity: 0.8,
  },
  failedAmountGlow: {
    backgroundColor: '#EF4444',
    opacity: 0.8,
  },
  amountLabel: {
    fontSize: 12,
    marginBottom: 8,
    fontWeight: '600',
    letterSpacing: 1,
    color: '#FFD700',
  },
  processingText: {
    color: '#4CAF50', // Green ONLY for processing text
  },
  failedText: {
    color: '#EF4444',
    opacity: 1,
  },
  amount: {
    fontSize: 36, // Slightly smaller
    fontWeight: '300',
    letterSpacing: -1,
    color: '#FFFFFF',
  },
  detailsCard: {
    width: '100%',
    backgroundColor: 'transparent',
    borderRadius: 16,
    padding: 18, // Reduced padding
    marginBottom: 18, // Reduced
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  cardBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
  },
  processingCardBorder: {
    backgroundColor: 'rgba(76, 175, 80, 0.5)', // Green border
  },
  failedCardBorder: {
    backgroundColor: 'rgba(239, 68, 68, 0.5)',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5, // Reduced
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    color: '#999',
    fontSize: 13, // Slightly smaller
    fontWeight: '500',
  },
  value: {
    color: '#fff',
    fontSize: 13, // Slightly smaller
    fontWeight: '600',
  },
  bonusText: {
    color: '#4CAF50',
  },
  noteText: {
    maxWidth: '50%',
    textAlign: 'right',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  processingStatusBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)', // Green background
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  failedStatusBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },
  processingStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50', // Green dot
  },
  failedStatusDot: {
    backgroundColor: '#EF4444',
  },
  statusText: {
    color: '#4CAF50',
    fontSize: 12, // Slightly smaller
    fontWeight: '600',
  },
  failedStatusText: {
    color: '#EF4444',
  },
  txId: {
    color: '#FFD700',
    fontSize: 12, // Slightly smaller
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  dividerLine: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 8, // Reduced
  },
  buttonContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20, // Reduced
  },
  iconButton: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  buttonIconCircle: {
    width: 50, // Smaller
    height: 50, // Smaller
    borderRadius: 25,
    backgroundColor: 'rgba(17, 17, 17, 0.9)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    color: '#aaa',
    fontSize: 11, // Smaller
    fontWeight: '500',
  },
  securityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10, // Reduced
    paddingHorizontal: 14, // Reduced
    paddingVertical: 10, // Reduced
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 18, // Smaller
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.2)',
  },
  processingSecurityFooter: {
    backgroundColor: 'rgba(17, 17, 17, 0.9)', // Normal background
    borderColor: 'rgba(76, 175, 80, 0.2)',
  },
  failedSecurityFooter: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  securityDivider: {
    width: 1,
    height: 12, // Smaller
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
  },
  securityText: {
    color: '#4CAF50',
    fontSize: 11, // Smaller
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  encryptionText: {
    color: '#4CAF50',
    fontSize: 10, // Smaller
    fontWeight: '500',
  },
  failedEncryptionText: {
    color: '#EF4444',
  },
});