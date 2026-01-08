import React, { useState, useEffect, useCallback } from 'react';
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
  Image,
  Alert,
  Dimensions,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/stores/auth-store';
import * as LocalAuthentication from 'expo-local-authentication';
import PinModal from '@/components/send/PinModal';

const { width, height } = Dimensions.get('window');

// -----------------------------------------------------------------------------
// AJO Configuration
// -----------------------------------------------------------------------------
const AJO_TYPES = [
  {
    id: 1,
    name: 'Daily',
    code: 'daily',
    color: '#4CAF50',
    icon: 'today-outline',
    minAmount: 100,
    maxAmount: 5000,
  },
  {
    id: 2,
    name: 'Weekly',
    code: 'weekly',
    color: '#2196F3',
    icon: 'calendar-outline',
    minAmount: 500,
    maxAmount: 20000,
  },
  {
    id: 3,
    name: 'Monthly',
    code: 'monthly',
    color: '#FF9800',
    icon: 'calendar-outline',
    minAmount: 1000,
    maxAmount: 100000,
  },
  {
    id: 4,
    name: 'Fixed',
    code: 'fixed',
    color: '#9C27B0',
    icon: 'cash-outline',
    minAmount: 100,
    maxAmount: 500000,
  },
];

// -----------------------------------------------------------------------------
// Duration Options
// -----------------------------------------------------------------------------
const DURATION_OPTIONS = [
  { id: 1, label: '3 Months', value: 3 },
  { id: 2, label: '6 Months', value: 6 },
  { id: 3, label: '1 Year', value: 12 },
];

// -----------------------------------------------------------------------------
// BPAY System Members
// -----------------------------------------------------------------------------
const BPAY_SYSTEM_MEMBERS = [
  { id: 'system_1', name: 'Chinedu Okoro', tag: '@chineduo', avatarColor: '#4CAF50' },
  { id: 'system_2', name: 'Amina Bello', tag: '@aminab', avatarColor: '#2196F3' },
  { id: 'system_3', name: 'Tunde Lawal', tag: '@tundel', avatarColor: '#FF9800' },
  { id: 'system_4', name: 'Ngozi Eze', tag: '@ngozi', avatarColor: '#9C27B0' },
  { id: 'system_5', name: 'Kolawole Adebayo', tag: '@kolawole', avatarColor: '#00BCD4' },
  { id: 'system_6', name: 'Fatima Yusuf', tag: '@fatimay', avatarColor: '#E91E63' },
];

// -----------------------------------------------------------------------------
// Quick Contribution Presets
// -----------------------------------------------------------------------------
const QUICK_AMOUNTS = [
  { id: 1, label: '₦500', value: 500.00 },
  { id: 2, label: '₦1,000', value: 1000.00 },
  { id: 3, label: '₦2,500', value: 2500.00 },
  { id: 4, label: '₦5,000', value: 5000.00 },
];

// -----------------------------------------------------------------------------
// Navigation Icons Configuration
// -----------------------------------------------------------------------------
const NAVIGATION_ICONS = [
  {
    id: 1,
    name: 'stats-chart',
    label: 'Dashboard',
    route: '/(app)/ajo/tabs/dashboard',
    visibleTo: 'all',
  },
  {
    id: 2,
    name: 'repeat',
    label: 'Rotation',
    route: '/(app)/ajo/tabs/rotation',
    visibleTo: 'all',
  },
  {
    id: 3,
    name: 'construct',
    label: 'Creator Tools',
    route: '/(app)/ajo/tabs/creator-tools',
    visibleTo: 'creator',
  },
  {
    id: 4,
    name: 'search',
    label: 'Discover',
    route: '/(app)/ajo/tabs/discover',
    visibleTo: 'all',
  },
  {
    id: 5,
    name: 'notifications',
    label: 'Alerts',
    route: '/(app)/ajo/tabs/notifications',
    visibleTo: 'all',
  },
];

// -----------------------------------------------------------------------------
// Member Type Enum
// -----------------------------------------------------------------------------
const MEMBER_TYPES = {
  SYSTEM: 'system',
  CREATOR: 'creator',
  ADMIN: 'admin',
  MEMBER: 'member',
  PENDING: 'pending',
};

const AjoScreen = () => {
  const { user, isAuthenticated, balance: authBalance } = useAuth();
  const [title, setTitle] = useState('');
  const [selectedAjoType, setSelectedAjoType] = useState(null);
  const [contributionAmount, setContributionAmount] = useState('');
  const [selectedDuration, setSelectedDuration] = useState(6);
  const [members, setMembers] = useState([]);
  const [newMemberTag, setNewMemberTag] = useState('');
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showMembersList, setShowMembersList] = useState(true);
  const [balance, setBalance] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [referenceId, setReferenceId] = useState("");
  const [isBalanceLoading, setIsBalanceLoading] = useState(true);
  const [showPinModal, setShowPinModal] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [selectedQuickAmount, setSelectedQuickAmount] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [estimatedPayout, setEstimatedPayout] = useState(0);
  const [isCreator, setIsCreator] = useState(false);
  
  // Animations
  const watermarkPulse = useState(new Animated.Value(1))[0];
  const skeletonOpacity = useState(new Animated.Value(0.5))[0];
  const rotateAnimation = useState(new Animated.Value(0))[0];

  // -------------------------------------------------------------------------
  // Initialize with BPAY system member + creator
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (user) {
      // Randomly select a BPAY system member
      const randomSystemMember = BPAY_SYSTEM_MEMBERS[
        Math.floor(Math.random() * BPAY_SYSTEM_MEMBERS.length)
      ];
      
      const systemMember = {
        id: randomSystemMember.id,
        name: randomSystemMember.name,
        tag: randomSystemMember.tag,
        type: MEMBER_TYPES.SYSTEM,
        slotNumber: 1,
        status: 'confirmed',
        avatarColor: randomSystemMember.avatarColor,
      };
      
      // Creator member
      const creatorMember = {
        id: user.id,
        name: user.name || user.email?.split('@')[0] || 'You',
        tag: user.tag || '@you',
        type: MEMBER_TYPES.CREATOR,
        slotNumber: 2,
        status: 'confirmed',
        avatarColor: '#FFD700',
      };
      
      setMembers([systemMember, creatorMember]);
      setIsCreator(true); // Current user is creator on this page
    }
  }, [user]);

  // -------------------------------------------------------------------------
  // Rotate animation for collapsible arrow
  // -------------------------------------------------------------------------
  useEffect(() => {
    Animated.timing(rotateAnimation, {
      toValue: showMembersList ? 0 : 1, // 0 = down (open), 1 = up (closed)
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [showMembersList]);

  // -------------------------------------------------------------------------
  // Check Biometric Availability
  // -------------------------------------------------------------------------
  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(hasHardware && isEnrolled);
    } catch (error) {
      console.error('Error checking biometric availability:', error);
    }
  };

  // -------------------------------------------------------------------------
  // Calculate Estimated Payout
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (contributionAmount && selectedDuration && selectedAjoType) {
      const amount = parseFloat(contributionAmount);
      const duration = selectedDuration;
      
      if (!isNaN(amount) && amount > 0) {
        let monthlyContribution = amount;
        
        if (selectedAjoType.code === 'daily') {
          monthlyContribution = amount * 30;
        } else if (selectedAjoType.code === 'weekly') {
          monthlyContribution = amount * 4;
        }
        
        const totalPool = monthlyContribution * duration * members.length;
        setEstimatedPayout(totalPool);
      }
    } else {
      setEstimatedPayout(0);
    }
  }, [contributionAmount, selectedDuration, selectedAjoType, members.length]);

  // -------------------------------------------------------------------------
  // User Data and PIN Verification
  // -------------------------------------------------------------------------
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsCheckingAuth(true);
        
        if (!isAuthenticated || !user) {
          setIsBalanceLoading(false);
          setIsCheckingAuth(false);
          router.replace('/(auth)/login');
          return;
        }
        
        setBalance(authBalance || 0);
        
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("transaction_pin")
            .eq("id", user.id)
            .single();

          if (profile?.transaction_pin) {
            setHasPin(true);
          }
        } catch (profileErr) {
          console.log("Could not fetch PIN status:", profileErr);
        }
        
        setReferenceId(`AJO_${user.id}_${Date.now()}_${Math.floor(Math.random() * 10000)}`);
        setIsBalanceLoading(false);
        setIsCheckingAuth(false);
        
      } catch (error) {
        console.error("Error in fetchUserData:", error);
        setIsBalanceLoading(false);
        setIsCheckingAuth(false);
        
        if (error.message.includes('authenticated') || error.message.includes('email')) {
          Alert.alert(
            'Session Expired',
            'Your session has expired. Please log in again.',
            [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
          );
        }
      }
    };
    
    fetchUserData();
  }, [isAuthenticated, user, authBalance]);

  // -------------------------------------------------------------------------
  // Handle Quick Amount Click - FIXED
  // -------------------------------------------------------------------------
  const handleQuickAmountClick = (amount) => {
    // Set the contribution amount
    setContributionAmount(amount.toString());
    
    // Set the selected quick amount
    setSelectedQuickAmount(amount);
  };

  // -------------------------------------------------------------------------
  // Handle contribution amount input change
  // -------------------------------------------------------------------------
  const handleAmountChange = (text) => {
    // Remove any non-digit or dot characters
    let cleaned = text.replace(/[^0-9.]/g, '');
    
    // Ensure only one dot
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Limit to 2 decimal places
    if (parts[1] && parts[1].length > 2) {
      cleaned = parts[0] + '.' + parts[1].slice(0, 2);
    }
    
    setContributionAmount(cleaned);
    
    // Clear selected quick amount if user types manually
    if (selectedQuickAmount !== null) {
      setSelectedQuickAmount(null);
    }
  };

  // -------------------------------------------------------------------------
  // Handle Add Member
  // -------------------------------------------------------------------------
  const handleAddMember = async () => {
    if (!newMemberTag.trim()) {
      Alert.alert('Error', 'Please enter a BPAY user tag');
      return;
    }
    
    if (members.length >= 10) {
      Alert.alert('Limit Reached', 'Maximum of 10 members allowed for this contribution plan.');
      return;
    }
    
    // Check if member already exists
    if (members.some(member => member.tag === newMemberTag)) {
      Alert.alert('Error', 'This member is already in the Ajo');
      return;
    }
    
    // Assign next available slot number
    const nextSlot = members.length + 1;
    
    const pendingMember = {
      id: `pending_${Date.now()}`,
      name: 'Pending...',
      tag: newMemberTag,
      type: MEMBER_TYPES.PENDING,
      slotNumber: nextSlot,
      status: 'pending',
      avatarColor: '#9E9E9E',
    };
    
    setMembers(prev => [...prev, pendingMember]);
    setNewMemberTag('');
    setShowAddMemberModal(false);
    
    Alert.alert(
      'Invitation Sent',
      `An invitation has been sent to ${newMemberTag}. They will be added upon acceptance.`,
      [{ text: 'OK' }]
    );
  };

  // -------------------------------------------------------------------------
  // Handle Remove Member
  // -------------------------------------------------------------------------
  const handleRemoveMember = (memberId) => {
    // Cannot remove system or creator
    if (members.find(m => m.id === memberId)?.type === MEMBER_TYPES.SYSTEM || 
        memberId === user?.id) {
      Alert.alert('Cannot Remove', 'You cannot remove the system or yourself.');
      return;
    }
    
    // If removing an admin, reassign admin status to creator if needed
    setMembers(prev => {
      const newMembers = prev.filter(member => member.id !== memberId);
      // Reassign slot numbers
      return newMembers.map((member, index) => ({
        ...member,
        slotNumber: index + 1
      }));
    });
  };

  // -------------------------------------------------------------------------
  // Validate AJO Creation
  // -------------------------------------------------------------------------
  const validateAjoCreation = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for your Ajo');
      return false;
    }
    
    if (!selectedAjoType) {
      Alert.alert('Error', 'Please select a contribution type');
      return false;
    }
    
    const amount = parseFloat(contributionAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid contribution amount');
      return false;
    }
    
    if (amount < selectedAjoType.minAmount) {
      Alert.alert('Error', `Minimum contribution for ${selectedAjoType.name} is ₦${formatCurrency(selectedAjoType.minAmount)}`);
      return false;
    }
    
    if (amount > selectedAjoType.maxAmount) {
      Alert.alert('Error', `Maximum contribution for ${selectedAjoType.name} is ₦${formatCurrency(selectedAjoType.maxAmount)}`);
      return false;
    }
    
    // Check if we have at least 2 confirmed members (system + creator)
    const confirmedMembers = members.filter(m => m.status === 'confirmed');
    if (confirmedMembers.length < 2) {
      Alert.alert('Error', 'Need at least 2 confirmed members to start');
      return false;
    }
    
    // Calculate first contribution
    const firstContribution = amount;
    if (firstContribution > balance) {
      Alert.alert(
        'Insufficient Balance',
        `You need ₦${formatCurrency(firstContribution)} for your first contribution but only have ₦${formatCurrency(balance)}`
      );
      return false;
    }
    
    return true;
  };

  // -------------------------------------------------------------------------
  // Handle Create Ajo
  // -------------------------------------------------------------------------
  const handleCreateAjo = () => {
    if (!validateAjoCreation()) return;
    
    if (!hasPin) {
      Alert.alert(
        'Transaction PIN Required',
        'Please set up a transaction PIN before creating an Ajo.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Set PIN', onPress: () => router.push('/(app)/settings/pin') }
        ]
      );
      return;
    }
    
    setShowPinModal(true);
  };

  // -------------------------------------------------------------------------
  // Handle PIN Verification Success
  // -------------------------------------------------------------------------
  const handlePinVerified = async (pin) => {
    setShowPinModal(false);
    
    // Prepare AJO data
    const confirmedMembers = members.filter(m => m.status === 'confirmed');
    const memberDetails = confirmedMembers.map(m => ({
      name: m.name,
      tag: m.tag,
      slot: m.slotNumber,
      type: m.type
    }));
    
    router.push({
      pathname: '/(app)/success',
      params: {
        type: 'ajo',
        title: title,
        amount: contributionAmount,
        ajoType: selectedAjoType.name,
        duration: selectedDuration,
        members: confirmedMembers.length,
        estimatedPayout: estimatedPayout,
        reference: referenceId,
        memberDetails: JSON.stringify(memberDetails),
        authMethod: 'pin'
      }
    });
  };

  // -------------------------------------------------------------------------
  // Handle Navigation Icon Press
  // -------------------------------------------------------------------------
  const handleNavigationPress = (route) => {
    router.push(route);
  };

  // -------------------------------------------------------------------------
  // Helper Functions
  // -------------------------------------------------------------------------
  const formatCurrency = (amount) => {
    if (!amount) return '0.00';
    const num = parseFloat(amount);
    return isNaN(num) ? '0.00' : num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const getMemberInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  // Start watermark animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(watermarkPulse, {
          toValue: 1.05,
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

  const rotateInterpolate = rotateAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'] // 0deg = down (open), 180deg = up (closed)
  });

  // Show skeleton UI while loading
  if (isCheckingAuth || isBalanceLoading) {
    return (
      <View style={styles.container}>
        <Animated.View pointerEvents="none" style={styles.watermarkWrapper}>
          <Animated.Image
            source={require('@/assets/icons/home.png')}
            style={[styles.watermark, { transform: [{ scale: watermarkPulse }] }]}
            resizeMode="contain"
          />
        </Animated.View>

        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.balanceContainer}>
              <Animated.View style={[styles.skeleton, { width: 60, height: 16, opacity: skeletonOpacity }]} />
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.formContainer}>
              <View style={styles.section}>
                <Animated.View style={[styles.skeleton, { width: 120, height: 20, opacity: skeletonOpacity, marginBottom: 12 }]} />
                <Animated.View style={[styles.skeleton, styles.skeletonInput, { opacity: skeletonOpacity }]} />
              </View>
              
              <View style={styles.section}>
                <Animated.View style={[styles.skeleton, { width: 100, height: 20, opacity: skeletonOpacity, marginBottom: 12 }]} />
                <View style={styles.smallOptionGrid}>
                  {[1, 2, 3, 4].map((index) => (
                    <Animated.View key={index} style={[styles.skeleton, styles.skeletonSmallCard, { opacity: skeletonOpacity }]} />
                  ))}
                </View>
              </View>
              
              <View style={styles.section}>
                <Animated.View style={[styles.skeleton, { width: 100, height: 20, opacity: skeletonOpacity, marginBottom: 12 }]} />
                <Animated.View style={[styles.skeleton, styles.skeletonInput, { opacity: skeletonOpacity }]} />
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Animated.View pointerEvents="none" style={styles.watermarkWrapper}>
        <Animated.Image
          source={require('@/assets/icons/home.png')}
          style={[styles.watermark, { transform: [{ scale: watermarkPulse }] }]}
          resizeMode="contain"
        />
      </Animated.View>

      <View style={styles.content}>
        {/* Header with Balance */}
        <View style={styles.header}>
          <View style={styles.balanceContainer}>
            <Ionicons name="wallet-outline" size={14} color="#FFD700" />
            <Text style={styles.balanceText}>₦{formatCurrency(balance)}</Text>
          </View>
        </View>

        {/* Navigation Icons Bar */}
        <View style={styles.navigationBar}>
          {NAVIGATION_ICONS.map((icon) => {
            // Show creator tools only to creator
            if (icon.visibleTo === 'creator' && !isCreator) {
              return null;
            }
            
            return (
              <TouchableOpacity
                key={icon.id}
                style={styles.navIconContainer}
                onPress={() => handleNavigationPress(icon.route)}
                activeOpacity={0.7}
              >
                <Ionicons name={icon.name} size={20} color="#FFD700" />
                <Text style={styles.navIconLabel}>{icon.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formContainer}>
            {/* Page Title */}
            <View style={styles.pageTitleContainer}>
              <Text style={styles.pageTitle}>Create New Ajo</Text>
              <Text style={styles.pageSubtitle}>Start your savings circle</Text>
            </View>

            {/* Title Section */}
            <View style={styles.section}>
              <View style={styles.labelRow}>
                <Ionicons name="flag-outline" size={16} color="#FFD700" />
                <Text style={styles.sectionLabel}>Title</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Enter Ajo title"
                placeholderTextColor="#666"
                value={title}
                onChangeText={setTitle}
                maxLength={30}
              />
            </View>

            {/* Duration Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Duration</Text>
              <View style={styles.durationContainer}>
                {DURATION_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.durationOption,
                      selectedDuration === option.value && styles.durationOptionActive
                    ]}
                    onPress={() => setSelectedDuration(option.value)}
                  >
                    <Text style={[
                      styles.durationText,
                      selectedDuration === option.value && styles.durationTextActive
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Contribution Type */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Contribution Type</Text>
              <View style={styles.smallOptionGrid}>
                {AJO_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.smallOptionCard,
                      selectedAjoType?.id === type.id && styles.smallOptionCardActive,
                    ]}
                    onPress={() => setSelectedAjoType(type)}
                  >
                    <View style={[
                      styles.optionIconContainer,
                      selectedAjoType?.id === type.id && { borderColor: type.color }
                    ]}>
                      <Ionicons 
                        name={type.icon} 
                        size={18} 
                        color={selectedAjoType?.id === type.id ? type.color : '#999'} 
                      />
                    </View>
                    <Text style={[
                      styles.smallOptionText,
                      selectedAjoType?.id === type.id && { color: type.color }
                    ]}>
                      {type.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Contribution Amount */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Contribution Amount</Text>
              <View style={styles.amountContainer}>
                <Text style={styles.currencySymbol}>₦</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  placeholderTextColor="#666"
                  value={contributionAmount}
                  onChangeText={handleAmountChange}
                  keyboardType="decimal-pad"
                />
              </View>
              
              <View style={styles.quickAmountGrid}>
                {QUICK_AMOUNTS.map((amount) => (
                  <TouchableOpacity
                    key={amount.id}
                    style={[
                      styles.quickAmountOption,
                      selectedQuickAmount === amount.value && styles.quickAmountOptionActive
                    ]}
                    onPress={() => handleQuickAmountClick(amount.value)}
                  >
                    <Text style={styles.quickAmountText}>{amount.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Members Section */}
            <View style={styles.section}>
              <View style={styles.membersSectionHeader}>
                <TouchableOpacity 
                  style={styles.membersToggle}
                  onPress={() => setShowMembersList(!showMembersList)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.sectionLabel}>Members ({members.length}/10)</Text>
                  <Animated.View style={{ transform: [{ rotate: rotateInterpolate }], marginLeft: 6 }}>
                    <Ionicons name="chevron-down" size={14} color="#FFD700" />
                  </Animated.View>
                </TouchableOpacity>
                
                {members.length < 10 && (
                  <TouchableOpacity
                    style={styles.addMemberButton}
                    onPress={() => setShowAddMemberModal(true)}
                  >
                    <Ionicons name="add-circle" size={14} color="#FFD700" />
                    <Text style={styles.addMemberButtonText}>Add</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              {showMembersList && (
                <View style={styles.membersList}>
                  {members.map((member) => (
                    <View key={member.id} style={styles.memberCard}>
                      <View style={styles.memberInfo}>
                        <View style={[
                          styles.memberAvatar,
                          { backgroundColor: member.avatarColor }
                        ]}>
                          <Text style={styles.memberInitials}>
                            {getMemberInitials(member.name)}
                          </Text>
                        </View>
                        <View style={styles.memberDetails}>
                          <Text style={styles.memberName}>{member.name}</Text>
                          <Text style={styles.memberTag}>{member.tag}</Text>
                        </View>
                      </View>
                      
                      <View style={styles.memberActions}>
                        <View style={[
                          styles.slotBadge,
                          member.slotNumber === 1 && styles.slotBadgeSystem
                        ]}>
                          <Text style={styles.slotText}>Slot {member.slotNumber}</Text>
                          {member.slotNumber === 1 && (
                            <Ionicons name="shield-checkmark" size={10} color="#4CAF50" style={{ marginLeft: 4 }} />
                          )}
                        </View>
                        
                        {member.type === MEMBER_TYPES.PENDING ? (
                          <Text style={styles.pendingBadge}>Pending</Text>
                        ) : member.type === MEMBER_TYPES.CREATOR ? (
                          <Text style={styles.creatorBadge}>Creator</Text>
                        ) : member.type === MEMBER_TYPES.ADMIN ? (
                          <Text style={styles.adminBadge}>Admin</Text>
                        ) : null}
                        
                        {!member.id.startsWith('system_') && member.id !== user?.id && (
                          <TouchableOpacity
                            style={styles.removeButton}
                            onPress={() => handleRemoveMember(member.id)}
                          >
                            <Ionicons name="close-circle" size={16} color="#EF4444" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Summary Card */}
            {estimatedPayout > 0 && (
              <View style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <Ionicons name="analytics-outline" size={16} color="#FFD700" />
                  <Text style={styles.summaryTitle}>Ajo Summary</Text>
                </View>
                
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Pool</Text>
                  <Text style={styles.summaryValue}>₦{formatCurrency(estimatedPayout)}</Text>
                </View>
                
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Your Share</Text>
                  <Text style={styles.summaryValue}>
                    ₦{formatCurrency(estimatedPayout / members.filter(m => m.status === 'confirmed').length)}
                  </Text>
                </View>
                
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Duration</Text>
                  <Text style={styles.summaryValue}>{selectedDuration} months</Text>
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionContainer}>
              <TouchableOpacity
                style={[
                  styles.createButton,
                  (!title || !contributionAmount || !selectedAjoType || members.length < 2) && 
                  styles.createButtonDisabled
                ]}
                onPress={handleCreateAjo}
                disabled={!title || !contributionAmount || !selectedAjoType || members.length < 2 || isProcessing}
              >
                <Text style={styles.createButtonText}>
                  {isProcessing ? 'Creating...' : 'Create Ajo'}
                </Text>
              </TouchableOpacity>
              
              {biometricAvailable && (
                <TouchableOpacity
                  style={[
                    styles.biometricButton,
                    (!title || !contributionAmount || !selectedAjoType || members.length < 2) && 
                    styles.biometricButtonDisabled
                  ]}
                  onPress={() => {
                    if (validateAjoCreation()) {
                      setShowPinModal(true);
                    }
                  }}
                  disabled={!title || !contributionAmount || !selectedAjoType || members.length < 2}
                >
                  <Ionicons 
                    name={Platform.OS === 'ios' ? 'fingerprint' : 'finger-print'} 
                    size={18} 
                    color="#FFD700" 
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* Terms Notice */}
            <View style={styles.termsContainer}>
              <Ionicons name="information-circle-outline" size={12} color="#666" />
              <Text style={styles.termsText}>
                By creating this Ajo, you agree to the terms and conditions. 
                BPAY system always packs first. Defaulters face 2-day grace period 
                before automatic cancellation with fines applied to creator.
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Add Member Modal */}
      <Modal
        visible={showAddMemberModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Member</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowAddMemberModal(false)}
              >
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalDescription}>
              Enter BPAY user tag to invite. You'll become admin when they accept.
              All AJOs are public - members will be notified when someone packs.
            </Text>
            
            <View style={styles.modalInputWrapper}>
              <Text style={styles.inputLabel}>BPAY User Tag</Text>
              <View style={styles.modalInputContainer}>
                <Text style={styles.inputPrefix}>@</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="username"
                  placeholderTextColor="#666"
                  value={newMemberTag}
                  onChangeText={setNewMemberTag}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalButtonSecondary}
                onPress={() => setShowAddMemberModal(false)}
              >
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButtonPrimary, !newMemberTag && styles.modalButtonDisabled]}
                onPress={handleAddMember}
                disabled={!newMemberTag}
              >
                <Text style={styles.modalButtonPrimaryText}>Send Invite</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* PIN Modal */}
      <PinModal
        visible={showPinModal}
        onClose={() => setShowPinModal(false)}
        onVerify={handlePinVerified}
        title="Confirm Ajo Creation"
        description="Enter your 4-digit PIN to create this savings circle"
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  skeleton: {
    backgroundColor: '#333',
    borderRadius: 6,
  },
  skeletonInput: {
    height: 48,
    width: '100%',
    borderRadius: 8,
  },
  skeletonSmallCard: {
    width: (width - 64) / 4 - 8,
    height: 60,
    borderRadius: 8,
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
    opacity: 0.1,
  },
  content: {
    flex: 1,
    zIndex: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 16,
  },
  balanceText: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '600',
  },
  navigationBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  navIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  navIconLabel: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  scrollContent: {
    flexGrow: 1,
  },
  formContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  pageTitleContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  pageTitle: {
    color: '#FFD700',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  pageSubtitle: {
    color: '#999',
    fontSize: 13,
  },
  section: {
    marginBottom: 24,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#fff',
  },
  durationContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  durationOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  durationOptionActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderColor: '#FFD700',
  },
  durationText: {
    color: '#999',
    fontSize: 13,
    fontWeight: '600',
  },
  durationTextActive: {
    color: '#FFD700',
  },
  smallOptionGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  smallOptionCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
  },
  smallOptionCardActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  optionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 6,
  },
  smallOptionText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 16,
  },
  currencySymbol: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '500',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 14,
  },
  quickAmountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  quickAmountOption: {
    flex: 1,
    minWidth: (width - 60) / 2,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    alignItems: 'center',
  },
  quickAmountOptionActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderColor: '#FFD700',
  },
  quickAmountText: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '600',
  },
  membersSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  membersToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addMemberButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 4,
  },
  addMemberButtonText: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '600',
  },
  membersList: {
    gap: 8,
  },
  memberCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  memberAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInitials: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  memberTag: {
    color: '#999',
    fontSize: 11,
    marginTop: 2,
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  slotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
  },
  slotBadgeSystem: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  slotText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  pendingBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: 'rgba(255, 152, 0, 0.2)',
    borderRadius: 4,
    color: '#FF9800',
    fontSize: 10,
    fontWeight: '600',
  },
  creatorBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 4,
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '600',
  },
  adminBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: 'rgba(33, 150, 243, 0.2)',
    borderRadius: 4,
    color: '#2196F3',
    fontSize: 10,
    fontWeight: '600',
  },
  removeButton: {
    padding: 2,
  },
  summaryCard: {
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    padding: 16,
    marginBottom: 24,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  summaryTitle: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    color: '#999',
    fontSize: 13,
  },
  summaryValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  actionContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  createButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FFD700',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  createButtonDisabled: {
    borderColor: '#333',
    opacity: 0.5,
  },
  createButtonText: {
    color: '#FFD700',
    fontSize: 15,
    fontWeight: 'bold',
  },
  biometricButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
  },
  biometricButtonDisabled: {
    borderColor: '#333',
    opacity: 0.5,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  termsText: {
    flex: 1,
    color: '#999',
    fontSize: 11,
    lineHeight: 14,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalDescription: {
    color: '#999',
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  modalInputWrapper: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  inputLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  inputPrefix: {
    color: '#FFD700',
    fontSize: 15,
    fontWeight: '600',
    paddingHorizontal: 14,
  },
  modalInput: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    paddingVertical: 12,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  modalButtonSecondary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#666',
    alignItems: 'center',
  },
  modalButtonSecondaryText: {
    color: '#999',
    fontSize: 13,
    fontWeight: '600',
  },
  modalButtonPrimary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FFD700',
    alignItems: 'center',
  },
  modalButtonDisabled: {
    borderColor: '#666',
    opacity: 0.5,
  },
  modalButtonPrimaryText: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: 'bold',
  },
});

export default AjoScreen;