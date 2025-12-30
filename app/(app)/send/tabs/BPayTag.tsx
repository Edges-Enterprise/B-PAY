import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  Animated,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/stores/auth-store';
import { router } from 'expo-router';
import PinModal from '@/components/send/PinModal';

const { width, height } = Dimensions.get('window');

interface RecipientProfile {
  id: string;
  bpay_tag: string;
}
interface Contact {
  id: string;
  bpay_tag: string;
}
interface Beneficiary {
  id: string;
  beneficiary_id: string;
  bpay_tag: string;
}

const RecentBeneficiaries = ({
  beneficiaries,
  onSelectBeneficiary,
}: {
  beneficiaries: Beneficiary[];
  onSelectBeneficiary: (beneficiary: RecipientProfile) => void;
}) => {
  if (beneficiaries.length === 0) return null;
  return (
    <View style={styles.beneficiariesSection}>
      <Text style={styles.beneficiariesTitle}>Recent</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.beneficiariesList}
      >
        {beneficiaries.map((b) => (
          <TouchableOpacity
            key={b.id}
            style={styles.beneficiaryChip}
            onPress={() =>
              onSelectBeneficiary({
                id: b.beneficiary_id,
                bpay_tag: b.bpay_tag,
              })
            }
          >
            <View style={styles.chipAvatar}>
              <Text style={styles.chipAvatarText}>
                {b.bpay_tag[0]?.toUpperCase() || '?'}
              </Text>
            </View>
            <Text style={styles.chipTag}>@{b.bpay_tag}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const ContactDropdown = ({
  visible,
  contacts,
  onSelectContact,
  onClose,
  isLoading,
}: {
  visible: boolean;
  contacts: Contact[];
  onSelectContact: (contact: Contact) => void;
  onClose: () => void;
  isLoading: boolean;
}) => {
  if (!visible) return null;

  return (
    <View style={styles.contactCard}>
      <View style={styles.contactCardHeader}>
        <Text style={styles.contactCardTitle}>Select Contact</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={20} color="#999" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingIndicator}>
          <View style={styles.spinner} />
        </View>
      ) : (
        <>
          {contacts.length === 0 ? (
            <Text style={styles.emptyText}>No contacts with BPay found</Text>
          ) : (
            <ScrollView
              style={styles.contactCardScrollView}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={styles.contactCardScrollContent}
            >
              {contacts.map((contact) => (
                <TouchableOpacity
                  key={contact.id}
                  style={styles.contactItem}
                  onPress={() => {
                    onSelectContact(contact);
                    onClose();
                  }}
                >
                  <View style={styles.contactAvatar}>
                    <Text style={styles.contactAvatarText}>
                      {contact.bpay_tag[0]?.toUpperCase() || '?'}
                    </Text>
                  </View>
                  <Text style={styles.contactTag}>@{contact.bpay_tag}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </>
      )}
    </View>
  );
};

// Helper to format amount with commas and 2 decimals
const formatAmountInput = (value: string): string => {
  const clean = value.replace(/[^0-9.]/g, '');
  const parts = clean.split('.');
  let whole = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  let decimal = parts[1] ? parts[1].slice(0, 2) : '';
  if (decimal) return `${whole}.${decimal}`;
  return whole;
};

// Helper to parse formatted input to number
const parseAmount = (formatted: string): number => {
  const clean = formatted.replace(/,/g, '');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
};

export default function BPaySendScreen() {
  const { user } = useAuth();
  const [recipientTag, setRecipientTag] = useState('');
  const [amountInput, setAmountInput] = useState(''); // Single field
  const [note, setNote] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [recipient, setRecipient] = useState<RecipientProfile | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isBiometricSending, setIsBiometricSending] = useState(false);
  const [balance, setBalance] = useState(0);
  const [showContacts, setShowContacts] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [isFirstTimeRecipient, setIsFirstTimeRecipient] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<LocalAuthentication.AuthenticationType[]>([]);

  // Add state for PinModal
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinModalData, setPinModalData] = useState<{
    recipientId: string;
    recipientTag: string;
    amount: number;
    note: string;
    isFirstTime: boolean;
  } | null>(null);

  const amountRef = useRef<TextInput>(null);
  const pulse = useRef(new Animated.Value(1)).current;

  const fullAmount = useMemo(() => parseAmount(amountInput), [amountInput]);
  const bonusAmount = isFirstTimeRecipient ? fullAmount * 0.01 : 0;

  // Pulse animation for watermark
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 3000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 3000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Check biometric availability on component mount
  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      
      setBiometricAvailable(hasHardware && isEnrolled);
      setBiometricType(supportedTypes);
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      setBiometricAvailable(false);
    }
  };

  // Check if recipient is first-time
  useEffect(() => {
    if (!recipient || !user) {
      setIsFirstTimeRecipient(false);
      return;
    }
    const isKnown = beneficiaries.some(
      (b) => b.beneficiary_id === recipient.id
    );
    setIsFirstTimeRecipient(!isKnown);
  }, [recipient, beneficiaries, user]);

  useEffect(() => {
    if (user) {
      loadBeneficiaries();
      fetchUserBalance();
    }
  }, [user]);

  const fetchUserBalance = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      setBalance(data?.balance || 0);
    } catch (err) {
      console.error('Balance fetch error:', err);
      setBalance(useAuth.getState().balance || 0);
    }
  };

  const loadBeneficiaries = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('beneficiaries')
        .select(`
          id,
          beneficiary_id,
          profiles:beneficiary_id (bpay_tag)
        `)
        .eq('user_id', user.id)
        .order('last_sent_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      const formatted = data.map((item: any) => ({
        id: item.id,
        beneficiary_id: item.beneficiary_id,
        bpay_tag: item.profiles.bpay_tag,
      }));
      setBeneficiaries(formatted);
    } catch (err) {
      console.error('Beneficiaries load error:', err);
    }
  };

  const cleanTag = (input: string) =>
    input
      .toLowerCase()
      .replace(/^@/, '')
      .replace(/[^a-z0-9_]/g, '')
      .slice(0, 20);

  const searchRecipient = async (tag: string) => {
    const cleaned = cleanTag(tag);
    if (cleaned.length < 3) {
      setRecipient(null);
      return;
    }
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, bpay_tag')
        .or(`bpay_tag.eq.${cleaned}`)
        .neq('id', user?.id)
        .maybeSingle();
      if (error) throw error;
      if (data && data.id === user?.id) {
        Alert.alert('Invalid', 'You cannot send to yourself');
        setRecipient(null);
      } else if (data) {
        setRecipient({ id: data.id, bpay_tag: data.bpay_tag });
      } else {
        setRecipient(null);
      }
    } catch (err) {
      console.error('Search error:', err);
      setRecipient(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleTagChange = (text: string) => {
    setRecipientTag(text);
    const cleaned = cleanTag(text);
    if (cleaned.length >= 3) {
      const timer = setTimeout(() => searchRecipient(cleaned), 500);
      return () => clearTimeout(timer);
    } else {
      setRecipient(null);
    }
  };

  const loadContacts = async () => {
    setIsLoadingContacts(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, bpay_tag')
        .not('bpay_tag', 'is', null)
        .neq('id', user?.id)
        .limit(50);
      if (error) throw error;
      setContacts(data.map((p: any) => ({ id: p.id, bpay_tag: p.bpay_tag })));
    } catch (err) {
      Alert.alert('Error', 'Could not load contacts');
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const handleContactPress = () => {
    loadContacts();
    setShowContacts(true);
  };

  const handleSelectContact = (contact: Contact) => {
    setRecipientTag(`@${contact.bpay_tag}`);
    setRecipient({ id: contact.id, bpay_tag: contact.bpay_tag });
    setShowContacts(false);
  };

  const handleSelectBeneficiary = (beneficiary: RecipientProfile) => {
    setRecipientTag(`@${beneficiary.bpay_tag}`);
    setRecipient(beneficiary);
  };

  const handleAmountChange = (text: string) => {
    const formatted = formatAmountInput(text);
    setAmountInput(formatted);
  };

  const handleQuickAmountSelect = (amt: number) => {
    setAmountInput(amt.toLocaleString() + '.00');
  };

  const performBiometricAuthentication = async (): Promise<boolean> => {
    try {
      const authResult = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to send money',
        fallbackLabel: 'Use PIN instead',
        disableDeviceFallback: false,
        cancelLabel: 'Cancel',
      });

      return authResult.success;
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return false;
    }
  };

  // Handle biometric send - NO DATABASE OPERATIONS
  const handleBiometricSend = async () => {
    if (!recipient || !canSend) return;
    
    // Check if biometric is available
    if (!biometricAvailable) {
      Alert.alert(
        'Biometric Unavailable',
        'Biometric authentication is not available on this device. Please use the regular send button.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsBiometricSending(true);

    try {
      // Perform biometric authentication
      const isAuthenticated = await performBiometricAuthentication();
      
      if (!isAuthenticated) {
        Alert.alert(
          'Authentication Failed',
          'Biometric authentication was not successful. Please try again or use the regular send button.',
          [{ text: 'OK' }]
        );
        setIsBiometricSending(false);
        return;
      }

      // Navigate to success screen with ALL data for processing
      router.push({
        pathname: '/(app)/send/success',
        params: {
          amount: fullAmount.toString(),
          recipientTag: recipient.bpay_tag,
          recipientId: recipient.id,
          note: note || '',
          isFirstTime: isFirstTimeRecipient.toString(),
          bonusAmount: bonusAmount.toString(),
          authMethod: 'biometric',
          userId: user?.id || '',
          status: 'processing',
          processingMessage: 'Processing your transfer...',
          transactionType: 'bpay', // Add transaction type identifier
        },
      });
      
    } catch (error) {
      console.error('Biometric authentication error:', error);
      Alert.alert('Error', 'Authentication failed. Please try again.');
    } finally {
      setIsBiometricSending(false);
    }
  };

  // Updated handleSendButton to show PinModal - NO DATABASE OPERATIONS
  const handleSendButton = () => {
    if (!recipient || !canSend) return;
    
    // Set the data for the pin modal
    setPinModalData({
      recipientId: recipient.id,
      recipientTag: recipient.bpay_tag,
      amount: fullAmount,
      note: note || '',
      isFirstTime: isFirstTimeRecipient,
    });
    
    // Show the pin modal
    setShowPinModal(true);
  };

  // Handle successful PIN verification - NO DATABASE OPERATIONS
  const handlePinSuccess = (pin: string) => {
    if (!pinModalData || !user) {
      console.error('Missing pinModalData or user');
      return;
    }
    
    // Close the modal first
    setShowPinModal(false);
    
    // Navigate to success page with all transaction data for processing
    router.push({
      pathname: '/(app)/send/success',
      params: {
        recipientId: pinModalData.recipientId,
        recipientTag: pinModalData.recipientTag,
        amount: pinModalData.amount.toString(),
        note: pinModalData.note || '',
        isFirstTime: pinModalData.isFirstTime.toString(),
        bonusAmount: bonusAmount.toString(),
        pin: pin,
        authMethod: 'pin',
        userId: user.id,
        status: 'processing',
        processingMessage: 'Validating your PIN...',
        transactionType: 'bpay', // Add transaction type identifier
      },
    });
    
    // Reset form after a short delay
    setTimeout(() => {
      resetForm();
    }, 100);
  };

  // Handle PIN modal close
  const handlePinClose = () => {
    setShowPinModal(false);
    setPinModalData(null);
  };

  const resetForm = () => {
    setRecipientTag('');
    setAmountInput('');
    setNote('');
    setRecipient(null);
    fetchUserBalance();
  };

  const quickAmounts = [10000, 25000, 50000, 100000].filter(
    (amt) => amt <= balance
  );
  
  // Update canSend to check if pin modal is open
  const canSend =
    recipient &&
    fullAmount > 0 &&
    fullAmount <= balance &&
    !isSending &&
    !showContacts &&
    !isBiometricSending &&
    !showPinModal;

  // Get biometric type name for display
  const getBiometricTypeName = () => {
    if (biometricType.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'Fingerprint';
    } else if (biometricType.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'Face ID';
    } else if (biometricType.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'Iris Scan';
    }
    return 'Biometric';
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* NON-BLOCKING PULSING WATERMARK */}
      <Animated.View pointerEvents="none" style={styles.watermarkWrapper}>
        <Animated.Image
          source={require('@/assets/icons/home.png')}
          style={[styles.watermark, { transform: [{ scale: pulse }] }]}
          resizeMode="contain"
        />
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Send via BPay Tag</Text>
          <View style={styles.balanceContainer}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceAmount}>
              ₦{balance.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Recent Beneficiaries */}
        <RecentBeneficiaries
          beneficiaries={beneficiaries}
          onSelectBeneficiary={handleSelectBeneficiary}
        />

        {/* Recipient Input */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Recipient</Text>
          <View style={styles.inputCard}>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#999" />
              <TextInput
                style={styles.searchInput}
                placeholder="Enter $B-PAY tag "
                placeholderTextColor="#666"
                value={recipientTag}
                onChangeText={handleTagChange}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {isSearching ? (
                <View style={styles.spinner} />
              ) : (
                <TouchableOpacity onPress={handleContactPress}>
                  <Ionicons name="people" size={22} color="#FFD700" />
                </TouchableOpacity>
              )}
            </View>
            {recipient && (
              <View style={styles.recipientTagRow}>
                <Text style={styles.selectedTag}>@{recipient.bpay_tag}</Text>
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark" size={14} color="#fff" />
                </View>
              </View>
            )}
            {recipientTag.length >= 3 &&
              !recipient &&
              !isSearching && (
                <View style={styles.notFoundRow}>
                  <Ionicons name="alert-circle" size={18} color="#FF4444" />
                  <Text style={styles.notFoundText}>User not found</Text>
                </View>
              )}
          </View>
        </View>

        {/* AMOUNT */}
        {!showContacts && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Amount</Text>
            <View style={styles.inputCard}>
              {/* Quick Amounts */}
              <View style={styles.quickAmountsContainer}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.quickAmountsContent}
                >
                  {quickAmounts.map((amt) => (
                    <TouchableOpacity
                      key={amt}
                      style={[
                        styles.quickAmountChip,
                        fullAmount === amt && styles.quickAmountChipActive,
                      ]}
                      onPress={() => handleQuickAmountSelect(amt)}
                    >
                      <Text style={styles.quickAmountText}>
                        ₦{amt.toLocaleString()}.00
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Single Amount Input */}
              <View style={styles.amountInputContainer}>
                <Text style={styles.currencySymbol}>₦</Text>
                <TextInput
                  ref={amountRef}
                  style={styles.amountInput}
                  placeholder="0.00"
                  placeholderTextColor="#666"
                  value={amountInput}
                  onChangeText={handleAmountChange}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                />
              </View>
            </View>
          </View>
        )}

        {/* Contact Dropdown instead of amount */}
        {showContacts && (
          <ContactDropdown
            visible={showContacts}
            contacts={contacts}
            onSelectContact={handleSelectContact}
            onClose={() => setShowContacts(false)}
            isLoading={isLoadingContacts}
          />
        )}

        {/* Narration */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            Narration <Text style={styles.optional}>(Optional)</Text>
          </Text>
          <View style={styles.inputCard}>
            <TextInput
              style={styles.noteInput}
              placeholder="Add a note"
              placeholderTextColor="#666"
              value={note}
              onChangeText={setNote}
              maxLength={100}
              multiline
            />
            {note ? (
              <Text style={styles.charCount}>{note.length}/100</Text>
            ) : null}
          </View>
        </View>
      </ScrollView>

      {/* STICKY FOOTER */}
      {!showContacts && (
        <View style={styles.footerContainer}>
          <View style={styles.footerButtons}>
            <TouchableOpacity
              style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
              onPress={handleSendButton}
              disabled={!canSend}
            >
              <Text style={styles.sendButtonText}>Send</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.biometricButton, (!canSend || isBiometricSending) && styles.biometricButtonDisabled]}
              onPress={handleBiometricSend}
              disabled={!canSend || !biometricAvailable || isBiometricSending}
            >
              {isBiometricSending ? (
                <View style={styles.biometricSpinner} />
              ) : (
                <>
                  <Ionicons 
                    name="finger-print" 
                    size={32} 
                    color="#FFD700" 
                  />
                  {!biometricAvailable && (
                    <View style={styles.biometricUnavailableOverlay}>
                      <Ionicons name="close-circle" size={16} color="#FF4444" />
                    </View>
                  )}
                </>
              )}
            </TouchableOpacity>
          </View>

          {!biometricAvailable && (
            <View style={styles.biometricHint}>
              <Ionicons name="information-circle" size={14} color="#888" />
              <Text style={styles.biometricHintText}>
                {getBiometricTypeName()} not available
              </Text>
            </View>
          )}

          <View style={styles.securityFooter}>
            <Ionicons name="shield-checkmark" size={18} color="#4CAF50" />
            <Text style={styles.securityText}>
              Instant and secure. Double-check the recipient.
            </Text>
          </View>
        </View>
      )}

      {/* Pin Modal */}
      <PinModal
        visible={showPinModal}
        onClose={handlePinClose}
        onPinSuccess={handlePinSuccess}
        isProcessing={isSending}
        transactionDetails={pinModalData ? {
          recipientTag: pinModalData.recipientTag,
          amount: pinModalData.amount,
          note: pinModalData.note,
          isFirstTime: pinModalData.isFirstTime,
          bonusAmount: bonusAmount,
        } : undefined}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 120,
    zIndex: 10,
  },
  // WATERMARK — DOES NOT BLOCK TOUCHES
  watermarkWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  watermark: {
    width: 300,
    height: 300,
    opacity: 0.10,
  },
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 50,
    backgroundColor: '#000',
    zIndex: 20,
  },
  footerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  balanceContainer: {
    alignItems: 'flex-end',
  },
  balanceLabel: {
    color: '#999',
    fontSize: 15,
  },
  balanceAmount: {
    color: '#FFD700',
    fontSize: 15,
    fontWeight: 'bold',
  },
  beneficiariesSection: {
    marginBottom: 20,
  },
  beneficiariesTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  beneficiariesList: {
    flexDirection: 'row',
    gap: 8,
  },
  beneficiaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  chipAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipAvatarText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  chipTag: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '500',
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  optional: {
    color: '#666',
  },
  inputCard: {
    backgroundColor: '#111',
    borderRadius: 14,
    padding: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
  },
  spinner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#FFD700',
    borderTopColor: 'transparent',
  },
  biometricSpinner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFD700',
    borderTopColor: 'transparent',
  },
  recipientTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  selectedTag: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '600',
  },
  verifiedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  notFoundText: {
    color: '#FF4444',
    fontSize: 14,
  },
  quickAmountsContainer: {
    marginBottom: 14,
  },
  quickAmountsContent: {
    flexDirection: 'row',
    gap: 8,
  },
  quickAmountChip: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#333',
  },
  quickAmountChipActive: {
    borderColor: '#FFD700',
    backgroundColor: '#222',
  },
  quickAmountText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  currencySymbol: {
    color: '#4CAF50',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    paddingRight: 4,
  },
  noteInput: {
    color: '#fff',
    fontSize: 14,
    minHeight: 50,
    lineHeight: 20,
  },
  charCount: {
    color: '#666',
    fontSize: 11,
    textAlign: 'right',
    marginTop: 4,
  },
  sendButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FFD700',
    backgroundColor: 'transparent',
    minWidth: 100,
  },
  sendButtonDisabled: {
    borderColor: '#333',
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#FFD700',
    fontSize: 15,
    fontWeight: 'bold',
  },
  biometricButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#FFD700',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  biometricButtonDisabled: {
    borderColor: '#333',
    opacity: 0.5,
  },
  biometricUnavailableOverlay: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#000',
    borderRadius: 10,
    padding: 2,
  },
  biometricHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 8,
  },
  biometricHintText: {
    color: '#888',
    fontSize: 12,
    fontStyle: 'italic',
  },
  securityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  securityText: {
    color: '#999',
    fontSize: 12,
    textAlign: 'center',
  },
  contactCard: {
    backgroundColor: '#111',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 20,
    maxHeight: 350,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 30,
  },
  contactCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  contactCardTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  contactCardScrollView: {
    maxHeight: 250,
  },
  contactCardScrollContent: {
    paddingBottom: 16,
  },
  loadingIndicator: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    padding: 40,
    textAlign: 'center',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    gap: 12,
  },
  contactAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactAvatarText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  contactTag: {
    color: '#FFD700',
    fontSize: 15,
    fontWeight: '500',
  },
});