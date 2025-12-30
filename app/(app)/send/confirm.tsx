import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/stores/auth-store';

// Bank-specific color mapping
const BANK_COLORS = {
  '100004': '#FFFFFF', // OPay
  '100033': '#FFFFFF', // PalmPay
  '090110': '#FFFFFF', // VFD MFB
  '000013': '#FFFFFF', // GTBANK PLC
  '000015': '#FFFFFF', // ZENITH BANK
  '000014': '#FFFFFF', // ACCESS BANK
  '000016': '#FFFFFF', // FIRST BANK OF NIGERIA
  '000004': '#FFFFFF', // UNITED BANK FOR AFRICA
  '000033': '#FFFFFF', // ENAIRA
  '000029': '#FFFFFF', // LOTUS BANK
  '000037': '#FFFFFF', // ALTERNATIVE BANK LIMITED
  'default': '#666666'
};

const BankLogo = ({ bankCode, bankName, size = 40, logoUrl }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const getBankColor = (code) => {
    return BANK_COLORS[code] || BANK_COLORS.default;
  };
  
  const bankColor = getBankColor(bankCode);
  const isWhiteBackground = bankColor === '#FFFFFF';
  const initial = bankName ? bankName[0].toUpperCase() : 'B';
  
  // Show logo if available and not errored
  if (logoUrl && !imageError) {
    return (
      <View style={[styles.bankLogoContainer, { width: size, height: size }]}>
        <View style={[
          styles.bankLogoBackground, 
          { 
            backgroundColor: bankColor,
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: isWhiteBackground ? 1 : 0,
            borderColor: isWhiteBackground ? '#333' : 'transparent',
          }
        ]}>
          <Image
            source={{ uri: logoUrl }}
            style={[
              styles.bankLogoImage, 
              { 
                width: size * 0.7, 
                height: size * 0.7,
                opacity: imageLoaded ? 1 : 0,
              }
            ]}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
          {!imageLoaded && (
            <View style={styles.loadingPlaceholder}>
              <Text style={[
                styles.bankLogoInitial, 
                { 
                  fontSize: size * 0.3,
                  color: isWhiteBackground ? '#000' : '#fff'
                }
              ]}>
                {initial}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  }
  
  // Fallback to colored initial
  return (
    <View style={[styles.bankLogoContainer, { width: size, height: size }]}>
      <View 
        style={[
          styles.bankLogoFallback, 
          { 
            width: size, 
            height: size, 
            backgroundColor: bankColor,
            borderRadius: size / 2,
            borderWidth: isWhiteBackground ? 1 : 0,
            borderColor: isWhiteBackground ? '#333' : 'transparent',
          }
        ]}
      >
        <Text style={[
          styles.bankLogoInitial, 
          { 
            fontSize: size * 0.35,
            color: isWhiteBackground ? '#000' : '#fff'
          }
        ]}>
          {initial}
        </Text>
      </View>
    </View>
  );
};

const PinInput = ({ pin, setPin }) => {
  const pinLength = 4;
  const pins = pin.split('');
  
  const handlePinChange = (index, value) => {
    if (value.length <= 1) {
      const newPin = pin.split('');
      newPin[index] = value;
      setPin(newPin.join(''));
      
      // Auto-focus next input
      if (value && index < pinLength - 1) {
        const nextInput = `pin-input-${index + 1}`;
        const element = document.getElementById(nextInput);
        if (element) element.focus();
      }
    }
  };

  return (
    <View style={styles.pinContainer}>
      {Array(pinLength).fill(0).map((_, index) => (
        <View key={index} style={styles.pinDigitContainer}>
          <TextInput
            id={`pin-input-${index}`}
            style={styles.pinInput}
            value={pins[index] || ''}
            onChangeText={(value) => handlePinChange(index, value)}
            keyboardType="number-pad"
            maxLength={1}
            secureTextEntry
            autoFocus={index === 0}
          />
          <View style={[
            styles.pinUnderline,
            pins[index] && styles.pinUnderlineFilled
          ]} />
        </View>
      ))}
    </View>
  );
};

const ConfirmScreen = () => {
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [pin, setPin] = useState('');
  const [useFingerprint, setUseFingerprint] = useState(false);
  const [step, setStep] = useState<'details' | 'auth'>('details');
  
  // Watermark pulse animation
  const watermarkPulse = useRef(new Animated.Value(1)).current;

  // Parse params
  const accountNumber = params.accountNumber as string;
  const accountName = params.accountName as string;
  const bankCode = params.bankCode as string;
  const bankName = params.bankName as string;
  const amount = parseFloat(params.amount as string);
  const remark = params.remark as string;
  const paymentMethod = params.paymentMethod as string;
  const logoUrl = params.logoUrl as string;

  // Start pulse animation for watermark icon
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
      ])
    ).start();
  }, []);

  const transferMutation = useMutation({
    mutationFn: async () => {
      setIsProcessing(true);
      
      // Verify PIN (in real app, you'd verify against stored hash)
      if (!useFingerprint && pin.length !== 4) {
        throw new Error('Please enter your 4-digit PIN');
      }

      // Deduct from appropriate balance
      let balanceField = 'balance';
      if (paymentMethod === 'enubis') balanceField = 'enubis_balance';
      if (paymentMethod === 'bpay') balanceField = 'bpay_balance';
      if (paymentMethod === 'rewards') balanceField = 'rewards_balance';

      // Update balance
      const { data: profile, error: balanceError } = await supabase
        .from('profiles')
        .select(balanceField)
        .eq('id', user.id)
        .single();

      if (balanceError) throw balanceError;

      const currentBalance = profile[balanceField];
      if (currentBalance < amount) {
        throw new Error('Insufficient balance');
      }

      const newBalance = currentBalance - amount;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ [balanceField]: newBalance })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Record transfer
      const { error: transferError } = await supabase
        .from('transfer_history')
        .insert({
          user_id: user.id,
          account_number: accountNumber,
          account_name: accountName,
          bank_code: bankCode,
          bank_name: bankName,
          amount,
          remark: remark || null,
          payment_method: paymentMethod,
          status: 'completed',
          reference: `TRF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        });

      if (transferError) throw transferError;

      // Update beneficiary last used
      const beneficiaryId = `${user.id}_${accountNumber}_${bankCode}`;
      const { error: beneficiaryError } = await supabase
        .from('bank_beneficiaries')
        .upsert({
          user_id: user.id,
          beneficiary_id: beneficiaryId,
          account_number: accountNumber,
          account_name: accountName,
          bank_code: bankCode,
          bank_name: bankName,
          last_transferred_at: new Date().toISOString(),
        }, {
          onConflict: 'beneficiary_id',
          ignoreDuplicates: false,
        });

      if (beneficiaryError) throw beneficiaryError;

      // Promote bank in quick send
      const { error: promotionError } = await supabase
        .from('user_bank_preferences')
        .upsert({
          user_id: user.id,
          bank_code: bankCode,
          bank_name: bankName,
          last_used: new Date().toISOString(),
          usage_count: 1,
        }, {
          onConflict: 'user_id,bank_code',
        });

      if (promotionError) throw promotionError;

      // Decrement free transfers
      const { error: freeTransferError } = await supabase
        .from('profiles')
        .update({
          free_transfers_remaining: supabase.raw('free_transfers_remaining - 1')
        })
        .eq('id', user.id)
        .gt('free_transfers_remaining', 0);

      if (freeTransferError) throw freeTransferError;

      return { success: true };
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries(['userProfile', user.id]);
      queryClient.invalidateQueries(['recentBeneficiaries', user.id]);
      queryClient.invalidateQueries(['userRecentBanks', user.id]);
      queryClient.invalidateQueries(['transferHistory', user.id]);

      Alert.alert(
        '🎉 Transfer Successful',
        `₦${amount.toLocaleString()} has been sent to ${accountName}`,
        [
          {
            text: 'Done',
            onPress: () => router.replace('/(app)/send'),
          },
          {
            text: 'View History',
            onPress: () => router.push('/(app)/send/history'),
          },
        ]
      );
    },
    onError: (error) => {
      Alert.alert(
        '❌ Transfer Failed',
        error.message || 'Unable to complete transfer. Please try again.',
        [{ text: 'OK' }]
      );
    },
    onSettled: () => {
      setIsProcessing(false);
    },
  });

  const handleFingerprintAuth = () => {
    // In a real app, this would trigger native biometric authentication
    setUseFingerprint(true);
    Alert.alert(
      'Fingerprint Authentication',
      'Please authenticate using your fingerprint',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => setUseFingerprint(false),
        },
        {
          text: 'Authenticate',
          onPress: () => {
            // Simulate fingerprint authentication
            setTimeout(() => {
              transferMutation.mutate();
            }, 1000);
          },
        },
      ]
    );
  };

  const handlePinAuth = () => {
    if (pin.length === 4) {
      transferMutation.mutate();
    } else {
      Alert.alert('Incomplete PIN', 'Please enter your 4-digit PIN');
    }
  };

  const getCurrencySymbol = () => {
    return '₦'; // Assuming Nigerian Naira
  };

  const getPaymentMethodName = (method: string) => {
    switch (method) {
      case 'balance': return 'Account Balance';
      case 'enubis': return 'Enubis Wallet';
      case 'bpay': return 'Bpay Wallet';
      case 'rewards': return 'Rewards';
      default: return 'Account Balance';
    }
  };

  const formatAmount = (amt: number) => {
    return amt.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* WATERMARK */}
      <Animated.View pointerEvents="none" style={styles.watermarkWrapper}>
        <Animated.Image
          source={require('@/assets/icons/home.png')}
          style={[styles.watermark, { transform: [{ scale: watermarkPulse }] }]}
          resizeMode="contain"
        />
      </Animated.View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => step === 'auth' ? setStep('details') : router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFD700" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {step === 'details' ? 'Confirm Transfer' : 'Authenticate'}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {step === 'details' ? (
          <>
            {/* Amount Display - Simplified */}
            <View style={styles.amountContainer}>
              <Text style={styles.amount}>
                {getCurrencySymbol()}{formatAmount(amount)}
              </Text>
            </View>

            {/* Recipient Card - Smaller */}
            <View style={styles.section}>
              <View style={styles.recipientCard}>
                <BankLogo 
                  bankCode={bankCode}
                  bankName={bankName}
                  size={36}
                  logoUrl={logoUrl}
                />
                <View style={styles.recipientInfo}>
                  <Text style={styles.recipientName} numberOfLines={1}>
                    {accountName}
                  </Text>
                  <Text style={styles.recipientDetail}>
                    {accountNumber} • {bankName}
                  </Text>
                </View>
              </View>
            </View>

            {/* Transaction Details - Smaller Card */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Transaction Details</Text>
              <View style={styles.detailsCard}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Payment Method</Text>
                  <Text style={styles.detailValue}>
                    {getPaymentMethodName(paymentMethod)}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Transfer Fee</Text>
                  <Text style={styles.detailValue}>{getCurrencySymbol()}0.00</Text>
                </View>
                
                {remark && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Remark</Text>
                    <Text style={styles.detailValue}>{remark}</Text>
                  </View>
                )}
                
                <View style={[styles.detailRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total Amount</Text>
                  <Text style={styles.totalValue}>
                    {getCurrencySymbol()}{formatAmount(amount)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Pay Button with Fingerprint Icon */}
            <View style={styles.payButtonContainer}>
              <TouchableOpacity
                style={styles.payButton}
                onPress={() => setStep('auth')}
              >
                <Text style={styles.payButtonText}>Pay</Text>
                <View style={styles.fingerprintIconButton}>
                  <Ionicons name="finger-print" size={20} color="#FFD700" />
                </View>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            {/* Authentication Header */}
            <View style={styles.authHeader}>
              <Text style={styles.authTitle}>Secure Authentication</Text>
              <Text style={styles.authSubtitle}>
                Verify your identity to complete the transfer
              </Text>
            </View>

            {/* Amount Preview */}
            <View style={styles.authAmountPreview}>
              <Text style={styles.authAmountLabel}>Transfer Amount</Text>
              <Text style={styles.authAmount}>
                {getCurrencySymbol()}{formatAmount(amount)}
              </Text>
            </View>

            {/* Fingerprint Option */}
            <TouchableOpacity
              style={styles.fingerprintOption}
              onPress={handleFingerprintAuth}
              disabled={isProcessing}
            >
              <View style={styles.fingerprintIcon}>
                <Ionicons name="finger-print" size={32} color="#FFD700" />
              </View>
              <View style={styles.fingerprintInfo}>
                <Text style={styles.fingerprintTitle}>Use Fingerprint</Text>
                <Text style={styles.fingerprintSubtitle}>Quick and secure biometric authentication</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>

            {/* OR Divider */}
            <View style={styles.orDivider}>
              <View style={styles.dividerLine} />
              <Text style={styles.orText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* PIN Option */}
            <View style={styles.pinOption}>
              <Text style={styles.pinTitle}>Enter 4-Digit PIN</Text>
              <PinInput pin={pin} setPin={setPin} />
              
              {pin.length === 4 && (
                <TouchableOpacity
                  style={[
                    styles.pinSubmitButton,
                    isProcessing && styles.pinSubmitButtonDisabled
                  ]}
                  onPress={handlePinAuth}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <Text style={styles.pinSubmitButtonText}>Confirm with PIN</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Back Button */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setStep('details')}
              disabled={isProcessing}
            >
              <Ionicons name="arrow-back" size={16} color="#FFD700" />
              <Text style={styles.backButtonText}>Back to Details</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Cancel Button */}
      {step === 'details' && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  watermarkWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  watermark: {
    width: 300,
    height: 300,
    opacity: 0.05,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    zIndex: 2,
  },
  headerTitle: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  section: {
    marginBottom: 16,
    zIndex: 2,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  // Amount Display - Simplified
  amountContainer: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 16,
  },
  amount: {
    color: '#FFD700',
    fontSize: 36,
    fontWeight: 'bold',
  },
  // Recipient Card - Smaller
  recipientCard: {
    backgroundColor: '#111',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#222',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  recipientInfo: {
    flex: 1,
    marginLeft: 12,
  },
  recipientName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  recipientDetail: {
    color: '#FFD700',
    fontSize: 12,
  },
  // Bank Logo
  bankLogoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankLogoBackground: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bankLogoImage: {
    resizeMode: 'contain',
  },
  loadingPlaceholder: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  bankLogoFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  bankLogoInitial: {
    fontWeight: 'bold',
  },
  // Transaction Details - Smaller Card
  detailsCard: {
    backgroundColor: '#111',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#222',
    padding: 14,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  detailLabel: {
    color: '#999',
    fontSize: 13,
  },
  detailValue: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  totalRow: {
    borderBottomWidth: 0,
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#FFD72040',
  },
  totalLabel: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
  },
  totalValue: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Pay Button with Fingerprint
  payButtonContainer: {
    marginTop: 8,
    marginBottom: 20,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#FFD700',
    gap: 8,
  },
  payButtonText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
  },
  fingerprintIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  // Authentication Screen
  authHeader: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 16,
  },
  authTitle: {
    color: '#FFD700',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  authSubtitle: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
  },
  authAmountPreview: {
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFD72040',
  },
  authAmountLabel: {
    color: '#FFD700',
    fontSize: 12,
    marginBottom: 8,
  },
  authAmount: {
    color: '#FFD700',
    fontSize: 22,
    fontWeight: 'bold',
  },
  fingerprintOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#222',
    marginBottom: 16,
  },
  fingerprintIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  fingerprintInfo: {
    flex: 1,
  },
  fingerprintTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  fingerprintSubtitle: {
    color: '#999',
    fontSize: 12,
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#333',
  },
  orText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '600',
    marginHorizontal: 16,
  },
  pinOption: {
    backgroundColor: '#111',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#222',
  },
  pinTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  pinContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  pinDigitContainer: {
    alignItems: 'center',
    width: '20%',
  },
  pinInput: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 0,
    height: 36,
    width: '100%',
  },
  pinUnderline: {
    height: 2,
    backgroundColor: '#333',
    width: '100%',
    marginTop: 6,
  },
  pinUnderlineFilled: {
    backgroundColor: '#FFD700',
  },
  pinSubmitButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  pinSubmitButtonDisabled: {
    opacity: 0.5,
  },
  pinSubmitButtonText: {
    color: '#000',
    fontSize: 15,
    fontWeight: 'bold',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginTop: 20,
    gap: 8,
  },
  backButtonText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#000',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: '#222',
    zIndex: 20,
  },
  cancelButton: {
    backgroundColor: '#111',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  cancelButtonText: {
    color: '#999',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default ConfirmScreen;