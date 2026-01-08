import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Image,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

// Mock data - User can be in multiple AJOs
const USER_AJOS = [
  {
    id: 'ajo_1',
    title: 'Market Women Daily',
    type: 'Daily',
    amount: 500,
    members: 8,
    confirmedMembers: 7,
    code: 'MKT001',
    status: 'active',
    color: '#4CAF50',
    isCreator: true,
  },
  {
    id: 'ajo_2',
    title: 'Tech Bros Monthly',
    type: 'Monthly',
    amount: 10000,
    members: 6,
    confirmedMembers: 5,
    code: 'TECH001',
    status: 'active',
    color: '#2196F3',
    isCreator: false,
  },
  {
    id: 'ajo_3',
    title: 'Family Savings',
    type: 'Weekly',
    amount: 2000,
    members: 10,
    confirmedMembers: 8,
    code: 'FAM001',
    status: 'active',
    color: '#FF9800',
    isCreator: true,
  },
];

// Mock members data for each AJO
const MEMBERS_DATA = {
  ajo_1: [
    { 
      id: 'system_1', 
      name: 'BPAY System', 
      tag: '@system', 
      slotNumber: 1, 
      status: 'confirmed', 
      type: 'system',
      avatarColor: '#4CAF50',
      canEdit: false 
    },
    { 
      id: 'user_1', 
      name: 'You', 
      tag: '@you', 
      slotNumber: 2, 
      status: 'confirmed', 
      type: 'creator',
      avatarColor: '#FFD700',
      canEdit: false 
    },
    { 
      id: 'member_1', 
      name: 'Amina Bello', 
      tag: '@aminab', 
      slotNumber: 3, 
      status: 'confirmed', 
      type: 'member',
      avatarColor: '#2196F3',
      canEdit: true 
    },
    { 
      id: 'member_2', 
      name: 'Chinedu Okoro', 
      tag: '@chineduo', 
      slotNumber: 4, 
      status: 'confirmed', 
      type: 'member',
      avatarColor: '#FF9800',
      canEdit: true 
    },
  ],
  ajo_2: [
    { 
      id: 'system_1', 
      name: 'BPAY System', 
      tag: '@system', 
      slotNumber: 1, 
      status: 'confirmed', 
      type: 'system',
      avatarColor: '#4CAF50',
      canEdit: false 
    },
    { 
      id: 'user_1', 
      name: 'You', 
      tag: '@you', 
      slotNumber: 3, 
      status: 'confirmed', 
      type: 'member',
      avatarColor: '#FFD700',
      canEdit: false 
    },
    { 
      id: 'member_1', 
      name: 'David Tech', 
      tag: '@davidt', 
      slotNumber: 2, 
      status: 'confirmed', 
      type: 'creator',
      avatarColor: '#2196F3',
      canEdit: false 
    },
  ],
  ajo_3: [
    { 
      id: 'system_1', 
      name: 'BPAY System', 
      tag: '@system', 
      slotNumber: 1, 
      status: 'confirmed', 
      type: 'system',
      avatarColor: '#4CAF50',
      canEdit: false 
    },
    { 
      id: 'user_1', 
      name: 'You', 
      tag: '@you', 
      slotNumber: 2, 
      status: 'confirmed', 
      type: 'creator',
      avatarColor: '#FFD700',
      canEdit: false 
    },
    { 
      id: 'member_1', 
      name: 'Brother', 
      tag: '@brother', 
      slotNumber: 3, 
      status: 'confirmed', 
      type: 'member',
      avatarColor: '#FF9800',
      canEdit: true 
    },
  ],
};

const CreatorToolsScreen = () => {
  const [selectedAjo, setSelectedAjo] = useState(null);
  const [activeTool, setActiveTool] = useState('members');
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [newSlot, setNewSlot] = useState('');
  const [showAmountModal, setShowAmountModal] = useState(false);
  const [newAmount, setNewAmount] = useState('');
  const [expandedAjos, setExpandedAjos] = useState({});
  const watermarkPulse = useState(new Animated.Value(1))[0];

  // Initialize with first AJO if user has only one
  useEffect(() => {
    if (USER_AJOS.length === 1) {
      setSelectedAjo(USER_AJOS[0]);
      setExpandedAjos({ [USER_AJOS[0].id]: true });
    }
  }, []);

  // Watermark animation
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

  const formatCurrency = (amount) => {
    return `₦${amount?.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const getMemberInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const handleAjoSelect = (ajo) => {
    setSelectedAjo(ajo);
    setActiveTool('members');
    setExpandedAjos(prev => ({
      ...prev,
      [ajo.id]: !prev[ajo.id], // Toggle expansion
    }));
  };

  const toggleAjoExpansion = (ajoId) => {
    setExpandedAjos(prev => ({
      ...prev,
      [ajoId]: !prev[ajoId],
    }));
  };

  const handleChangeSlot = (member) => {
    setSelectedMember(member);
    setNewSlot(member.slotNumber.toString());
    setShowSlotModal(true);
  };

  const handleSaveSlot = () => {
    if (!selectedAjo) return;
    
    if (!newSlot || isNaN(newSlot) || parseInt(newSlot) < 3 || parseInt(newSlot) > 8) {
      Alert.alert('Invalid Slot', 'Please enter a valid slot number (3-8)');
      return;
    }
    
    const slotNum = parseInt(newSlot);
    
    Alert.alert(
      'Slot Updated',
      `${selectedMember.name} moved to slot ${newSlot}`,
      [{ text: 'OK' }]
    );
    setShowSlotModal(false);
    setSelectedMember(null);
    setNewSlot('');
  };

  const handleChangeAmount = () => {
    if (!newAmount || isNaN(newAmount) || parseFloat(newAmount) < 100) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount (minimum ₦100)');
      return;
    }
    
    Alert.alert(
      'Amount Updated',
      `Contribution amount changed to ${formatCurrency(parseFloat(newAmount))}`,
      [{ text: 'OK' }]
    );
    setShowAmountModal(false);
    setNewAmount('');
  };

  const handleRemoveMember = (member) => {
    if (member.type === 'system' || member.type === 'creator') {
      Alert.alert('Cannot Remove', 'Cannot remove BPAY system or yourself');
      return;
    }
    
    Alert.alert(
      'Remove Member',
      `Remove ${member.name} from this AJO?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => {
            Alert.alert('Member Removed', `${member.name} has been removed`);
          }
        }
      ]
    );
  };

  const handleInviteMember = () => {
    Alert.alert(
      'Invite Member',
      'This feature will be available soon. You can add members from the main Ajo screen.',
      [{ text: 'OK' }]
    );
  };

  const getStatusBadgeStyle = (member) => {
    if (member.type === 'system') return styles.systemBadge;
    if (member.type === 'creator') return styles.creatorBadge;
    if (member.status === 'pending') return styles.pendingBadge;
    return styles.memberBadge;
  };

  const getStatusBadgeText = (member) => {
    if (member.type === 'system') return 'System';
    if (member.type === 'creator') return 'Creator';
    if (member.status === 'pending') return 'Pending';
    return 'Member';
  };

  const renderAjoCard = (ajo) => {
    const isExpanded = expandedAjos[ajo.id];
    const isSelected = selectedAjo?.id === ajo.id;
    const members = MEMBERS_DATA[ajo.id] || [];

    return (
      <View key={ajo.id} style={[
        styles.ajoCard,
        isSelected && styles.ajoCardSelected
      ]}>
        <TouchableOpacity
          style={styles.ajoCardHeader}
          onPress={() => handleAjoSelect(ajo)}
          activeOpacity={0.7}
        >
          <View style={styles.ajoInfo}>
            <View style={[
              styles.ajoTypeBadge,
              { backgroundColor: `${ajo.color}20` }
            ]}>
              <Ionicons 
                name={ajo.type === 'Daily' ? 'calendar' : ajo.type === 'Weekly' ? 'calendar-outline' : 'calendar-sharp'} 
                size={14} 
                color={ajo.color} 
              />
              <Text style={[styles.ajoTypeText, { color: ajo.color }]}>
                {ajo.type}
              </Text>
            </View>
            
            <View style={styles.ajoDetails}>
              <Text style={styles.ajoCardTitle}>{ajo.title}</Text>
              <Text style={styles.ajoCardCode}>Code: {ajo.code}</Text>
            </View>
          </View>
          
          <View style={styles.ajoStats}>
            <Text style={styles.ajoAmount}>{formatCurrency(ajo.amount)}</Text>
            <View style={styles.memberCount}>
              <Ionicons name="people" size={12} color="#999" />
              <Text style={styles.memberCountText}>{ajo.members}</Text>
            </View>
          </View>
          
          <Ionicons 
            name={isExpanded ? 'chevron-up' : 'chevron-down'} 
            size={20} 
            color={isSelected ? '#FFD700' : '#999'} 
          />
        </TouchableOpacity>

        {isExpanded && isSelected && ajo.isCreator && (
          <View style={styles.expandedContent}>
            {/* Tool Selector */}
            <View style={styles.toolSelector}>
              {[
                { id: 'members', name: 'people', label: 'Members' },
                { id: 'settings', name: 'settings', label: 'Settings' },
                { id: 'requests', name: 'document-text', label: 'Requests' },
              ].map((tool) => (
                <TouchableOpacity
                  key={tool.id}
                  style={[
                    styles.toolOption,
                    activeTool === tool.id && styles.toolOptionActive
                  ]}
                  onPress={() => setActiveTool(tool.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={tool.name} 
                    size={18} 
                    color={activeTool === tool.id ? '#FFD700' : '#999'} 
                  />
                  <Text style={[
                    styles.toolText,
                    activeTool === tool.id && styles.toolTextActive
                  ]}>
                    {tool.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Tool Content */}
            <View style={styles.toolContent}>
              {activeTool === 'members' && (
                <>
                  <View style={styles.memberList}>
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
                          <View style={styles.slotContainer}>
                            <Text style={styles.slotLabel}>Slot</Text>
                            <View style={[
                              styles.slotBadge,
                              member.slotNumber === 1 && styles.slotBadgeSystem
                            ]}>
                              <Text style={styles.slotText}>{member.slotNumber}</Text>
                            </View>
                          </View>

                          <View style={[
                            styles.statusBadge,
                            getStatusBadgeStyle(member)
                          ]}>
                            <Text style={[
                              styles.statusBadgeText,
                              member.type === 'system' && styles.systemBadgeText,
                              member.type === 'creator' && styles.creatorBadgeText,
                              member.type === 'member' && styles.memberBadgeText,
                              member.status === 'pending' && styles.pendingBadgeText,
                            ]}>
                              {getStatusBadgeText(member)}
                            </Text>
                          </View>

                          {member.canEdit && (
                            <View style={styles.actionButtons}>
                              <TouchableOpacity
                                style={styles.changeSlotButton}
                                onPress={() => handleChangeSlot(member)}
                              >
                                <Ionicons name="swap-vertical" size={14} color="#2196F3" />
                              </TouchableOpacity>
                              
                              <TouchableOpacity
                                style={styles.removeButton}
                                onPress={() => handleRemoveMember(member)}
                              >
                                <Ionicons name="close-circle" size={16} color="#EF4444" />
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity 
                    style={styles.addMemberButton}
                    onPress={handleInviteMember}
                  >
                    <Ionicons name="person-add" size={16} color="#FFD700" />
                    <Text style={styles.addMemberText}>Invite New Member</Text>
                  </TouchableOpacity>
                </>
              )}

              {activeTool === 'settings' && (
                <>
                  <TouchableOpacity 
                    style={styles.settingItem}
                    onPress={() => setShowAmountModal(true)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.settingInfo}>
                      <View style={styles.settingIconContainer}>
                        <Ionicons name="cash-outline" size={16} color="#FFD700" />
                      </View>
                      <View style={styles.settingDetails}>
                        <Text style={styles.settingTitle}>Contribution Amount</Text>
                        <Text style={styles.settingValue}>
                          Current: {formatCurrency(ajo.amount)}
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#999" />
                  </TouchableOpacity>

                  <View style={styles.settingItem}>
                    <View style={styles.settingInfo}>
                      <View style={styles.settingIconContainer}>
                        <Ionicons name="calendar-outline" size={16} color="#FFD700" />
                      </View>
                      <View style={styles.settingDetails}>
                        <Text style={styles.settingTitle}>Schedule</Text>
                        <Text style={styles.settingValue}>{ajo.type} contributions</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#999" />
                  </View>

                  <TouchableOpacity 
                    style={[styles.settingItem, styles.settingItemWarning]}
                    onPress={() => Alert.alert('Suspend AJO', 'This feature is coming soon')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.settingInfo}>
                      <View style={[styles.settingIconContainer, styles.settingIconWarning]}>
                        <Ionicons name="pause-circle-outline" size={16} color="#FF9800" />
                      </View>
                      <View style={styles.settingDetails}>
                        <Text style={styles.settingTitle}>Suspend AJO</Text>
                        <Text style={styles.settingValue}>Pause contributions temporarily</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#999" />
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.settingItem, styles.settingItemDanger]}
                    onPress={() => Alert.alert('Cancel AJO', 'This feature is coming soon')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.settingInfo}>
                      <View style={[styles.settingIconContainer, styles.settingIconDanger]}>
                        <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
                      </View>
                      <View style={styles.settingDetails}>
                        <Text style={[styles.settingTitle, styles.textDanger]}>Cancel AJO</Text>
                        <Text style={styles.settingValue}>End this savings circle permanently</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </>
              )}

              {activeTool === 'requests' && (
                <View style={styles.emptyState}>
                  <Ionicons name="document-text-outline" size={40} color="#333" />
                  <Text style={styles.emptyStateTitle}>No Pending Requests</Text>
                  <Text style={styles.emptyStateText}>
                    Member requests will appear here for your approval.
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Watermark Background */}
      <Animated.View pointerEvents="none" style={styles.watermarkWrapper}>
        <Animated.Image
          source={require('@/assets/icons/home.png')}
          style={[styles.watermark, { transform: [{ scale: watermarkPulse }] }]}
          resizeMode="contain"
        />
      </Animated.View>

      <View style={styles.content}>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Creator Tools</Text>
            <Text style={styles.subtitle}>Manage your AJOs</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color="#FFD700" />
          </TouchableOpacity>
        </View>

        {/* Info Text */}
        {USER_AJOS.length > 0 && (
          <View style={styles.infoContainer}>
            <Ionicons name="information-circle" size={14} color="#FFD700" />
            <Text style={styles.infoText}>
              {selectedAjo ? `Managing: ${selectedAjo.title}` : 'Select an AJO to manage'}
            </Text>
          </View>
        )}

        {/* AJOs List */}
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {USER_AJOS.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-circle-outline" size={60} color="#333" />
              <Text style={styles.emptyStateTitle}>No AJOs Found</Text>
              <Text style={styles.emptyStateText}>
                You don't have any AJOs to manage yet.
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Your AJOs</Text>
              {USER_AJOS.map(renderAjoCard)}
            </>
          )}
        </ScrollView>
      </View>

      {/* Change Slot Modal */}
      <Modal
        visible={showSlotModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSlotModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Slot</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowSlotModal(false)}
              >
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalDescription}>
              Assign new slot number for {selectedMember?.name}
            </Text>
            
            <View style={styles.modalInputWrapper}>
              <Text style={styles.inputLabel}>New Slot Number (3-8)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter slot number"
                placeholderTextColor="#666"
                value={newSlot}
                onChangeText={setNewSlot}
                keyboardType="number-pad"
              />
              <Text style={styles.inputNote}>
                Slot 1 is reserved for BPAY system. Slot 2 is creator's position.
              </Text>
            </View>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalButtonSecondary}
                onPress={() => setShowSlotModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButtonPrimary, !newSlot && styles.modalButtonDisabled]}
                onPress={handleSaveSlot}
                disabled={!newSlot}
                activeOpacity={0.7}
              >
                <Text style={styles.modalButtonPrimaryText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Amount Modal */}
      <Modal
        visible={showAmountModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAmountModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Contribution Amount</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowAmountModal(false)}
              >
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalDescription}>
              All members will be notified of this change
            </Text>
            
            <View style={styles.modalInputWrapper}>
              <Text style={styles.inputLabel}>New Amount (₦)</Text>
              <View style={styles.amountInputContainer}>
                <Text style={styles.currencySymbol}>₦</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="0.00"
                  placeholderTextColor="#666"
                  value={newAmount}
                  onChangeText={setNewAmount}
                  keyboardType="decimal-pad"
                />
              </View>
              <Text style={styles.inputNote}>
                Current amount: {formatCurrency(selectedAjo?.amount || 0)}
              </Text>
            </View>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalButtonSecondary}
                onPress={() => setShowAmountModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButtonPrimary, !newAmount && styles.modalButtonDisabled]}
                onPress={handleChangeAmount}
                disabled={!newAmount}
                activeOpacity={0.7}
              >
                <Text style={styles.modalButtonPrimaryText}>Update Amount</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
    opacity: 0.1,
  },
  content: {
    flex: 1,
    zIndex: 2,
    paddingTop: 16,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    color: '#FFD700',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  subtitle: {
    color: '#999',
    fontSize: 13,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    marginBottom: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.1)',
  },
  infoText: {
    color: '#FFD700',
    fontSize: 13,
    flex: 1,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  ajoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 8,
    overflow: 'hidden',
  },
  ajoCardSelected: {
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  ajoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  ajoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  ajoTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  ajoTypeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  ajoDetails: {
    flex: 1,
  },
  ajoCardTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  ajoCardCode: {
    color: '#999',
    fontSize: 11,
  },
  ajoStats: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  ajoAmount: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  memberCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  memberCountText: {
    color: '#999',
    fontSize: 11,
  },
  expandedContent: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  toolSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  toolOption: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#333',
    minWidth: 80,
  },
  toolOptionActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderColor: '#FFD700',
  },
  toolText: {
    color: '#999',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  toolTextActive: {
    color: '#FFD700',
  },
  toolContent: {
    paddingTop: 8,
  },
  memberList: {
    gap: 8,
    marginBottom: 16,
  },
  memberCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInitials: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  memberTag: {
    color: '#999',
    fontSize: 10,
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  slotContainer: {
    alignItems: 'center',
  },
  slotLabel: {
    color: '#999',
    fontSize: 9,
    marginBottom: 2,
  },
  slotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
  },
  slotBadgeSystem: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  slotText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  systemBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  creatorBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
  },
  memberBadge: {
    backgroundColor: 'rgba(33, 150, 243, 0.2)',
  },
  pendingBadge: {
    backgroundColor: 'rgba(255, 152, 0, 0.2)',
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '600',
  },
  systemBadgeText: {
    color: '#4CAF50',
  },
  creatorBadgeText: {
    color: '#FFD700',
  },
  memberBadgeText: {
    color: '#2196F3',
  },
  pendingBadgeText: {
    color: '#FF9800',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changeSlotButton: {
    padding: 4,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    borderRadius: 3,
  },
  removeButton: {
    padding: 4,
  },
  addMemberButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: 'transparent',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFD700',
    borderStyle: 'dashed',
    marginBottom: 8,
  },
  addMemberText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 8,
  },
  settingItemWarning: {
    borderColor: 'rgba(255, 152, 0, 0.3)',
  },
  settingItemDanger: {
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  settingIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingIconWarning: {
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
  },
  settingIconDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  settingDetails: {
    flex: 1,
  },
  settingTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  textDanger: {
    color: '#EF4444',
  },
  settingValue: {
    color: '#999',
    fontSize: 11,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyStateText: {
    color: '#999',
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 250,
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
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 14,
  },
  currencySymbol: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '500',
    marginRight: 8,
  },
  modalInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 12,
  },
  inputNote: {
    color: '#999',
    fontSize: 11,
    marginTop: 8,
    fontStyle: 'italic',
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

export default CreatorToolsScreen;