import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  Alert,
  Share,
} from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/stores/auth-store';

const AJODetailsScreen = () => {
  const { ajoId } = useLocalSearchParams();
  const { user } = useAuth();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);
  
  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];

  // Dummy AJO data - in real app, this would come from API based on ajoId
  const ajoData = {
    id: ajoId || '1',
    title: 'Market Women Daily',
    type: 'Daily Contribution',
    amount: 500,
    frequency: 'Daily',
    duration: '3 months',
    startDate: '2024-01-01',
    endDate: '2024-03-31',
    totalMembers: 8,
    currentMembers: 6,
    maxMembers: 10,
    progress: 75,
    totalPool: 12000,
    yourShare: 1500,
    nextPayout: '2024-01-20',
    nextContribution: 'Tomorrow',
    status: 'active', // 'active', 'pending', 'completed'
    isAdmin: true,
    category: 'Business',
    description: 'A daily savings circle for market women to pool funds for business expansion.',
    rules: [
      'Daily contribution of ₦500',
      'Payouts rotated weekly',
      'Late payments incur 10% penalty',
      'All members must approve new members',
    ],
  };

  // Dummy members data
  const members = [
    { id: '1', name: 'Amina Bello', role: 'Admin', status: 'active', contributions: 25, lastPaid: 'Today' },
    { id: '2', name: 'Chidi Okonkwo', role: 'Member', status: 'active', contributions: 25, lastPaid: 'Today' },
    { id: '3', name: 'Grace Okafor', role: 'Member', status: 'active', contributions: 24, lastPaid: 'Yesterday' },
    { id: '4', name: 'Musa Ibrahim', role: 'Member', status: 'pending', contributions: 0, lastPaid: 'Pending' },
    { id: '5', name: 'Sarah Johnson', role: 'Member', status: 'active', contributions: 23, lastPaid: '2 days ago' },
    { id: '6', name: 'Tunde Lawal', role: 'Member', status: 'active', contributions: 22, lastPaid: '3 days ago' },
    { id: '7', name: 'Bisi Adeyemi', role: 'Invited', status: 'pending', contributions: 0, lastPaid: 'Not joined' },
    { id: '8', name: 'Kemi Williams', role: 'Invited', status: 'pending', contributions: 0, lastPaid: 'Not joined' },
  ];

  // Dummy transaction history
  const transactions = [
    { id: 't1', date: '2024-01-15', amount: 500, type: 'contribution', member: 'You', status: 'completed' },
    { id: 't2', date: '2024-01-14', amount: 500, type: 'contribution', member: 'Amina Bello', status: 'completed' },
    { id: 't3', date: '2024-01-13', amount: 500, type: 'contribution', member: 'Chidi Okonkwo', status: 'completed' },
    { id: 't4', date: '2024-01-12', amount: 500, type: 'contribution', member: 'Grace Okafor', status: 'completed' },
    { id: 't5', date: '2024-01-11', amount: 1500, type: 'payout', member: 'Tunde Lawal', status: 'completed' },
    { id: 't6', date: '2024-01-10', amount: 500, type: 'contribution', member: 'You', status: 'completed' },
  ];

  useEffect(() => {
    // Animate content on mount
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const formatCurrency = (amount) => {
    return `₦${amount?.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join my AJO savings circle "${ajoData.title}"! Daily contribution: ${formatCurrency(ajoData.amount)}. Download the app to join.`,
        title: `Join ${ajoData.title}`,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share AJO');
    }
  };

  const handleInvite = () => {
    setShowInviteModal(true);
  };

  const handleAction = (action) => {
    setSelectedAction(action);
    setShowPaymentModal(true);
  };

  const renderStatusBadge = () => {
    const statusConfig = {
      active: { color: '#4CAF50', text: 'Active', icon: 'checkmark-circle' },
      pending: { color: '#FF9800', text: 'Pending', icon: 'time-outline' },
      completed: { color: '#2196F3', text: 'Completed', icon: 'trophy-outline' },
    };
    
    const config = statusConfig[ajoData.status] || statusConfig.active;
    
    return (
      <View style={[styles.statusBadge, { backgroundColor: `${config.color}20` }]}>
        <Ionicons name={config.icon} size={14} color={config.color} />
        <Text style={[styles.statusBadgeText, { color: config.color }]}>{config.text}</Text>
      </View>
    );
  };

  const renderMemberStatus = (status) => {
    switch(status) {
      case 'active':
        return <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />;
      case 'pending':
        return <Ionicons name="time-outline" size={16} color="#FF9800" />;
      default:
        return <Ionicons name="close-circle" size={16} color="#F44336" />;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFD700" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AJO Details</Text>
        <TouchableOpacity style={styles.headerButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={22} color="#FFD700" />
        </TouchableOpacity>
      </View>

      <Animated.ScrollView 
        style={[
          styles.scrollView,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* AJO Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <View style={styles.titleContainer}>
              <Text style={styles.ajoTitle}>{ajoData.title}</Text>
              {renderStatusBadge()}
            </View>
            <Text style={styles.ajoCategory}>{ajoData.category}</Text>
          </View>

          <Text style={styles.ajoDescription}>{ajoData.description}</Text>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Ionicons name="cash-outline" size={18} color="#FFD700" />
              <Text style={styles.statValue}>{formatCurrency(ajoData.amount)}</Text>
              <Text style={styles.statLabel}>Daily</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="people-outline" size={18} color="#4CAF50" />
              <Text style={styles.statValue}>{ajoData.currentMembers}/{ajoData.maxMembers}</Text>
              <Text style={styles.statLabel}>Members</Text>
            </View>
            <View style={styles.statItem}>
              <FontAwesome5 name="calendar-alt" size={16} color="#2196F3" />
              <Text style={styles.statValue}>{ajoData.duration}</Text>
              <Text style={styles.statLabel}>Duration</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialIcons name="rotate-right" size={18} color="#9C27B0" />
              <Text style={styles.statValue}>{ajoData.frequency}</Text>
              <Text style={styles.statLabel}>Frequency</Text>
            </View>
          </View>
        </View>

        {/* Progress Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Progress</Text>
            <Text style={styles.progressPercentage}>{ajoData.progress}% complete</Text>
          </View>
          
          <View style={styles.progressBar}>
            <View 
              style={[styles.progressFill, { width: `${ajoData.progress}%` }]} 
            />
          </View>
          
          <View style={styles.progressDetails}>
            <View style={styles.progressDetailItem}>
              <Text style={styles.progressDetailLabel}>Start Date</Text>
              <Text style={styles.progressDetailValue}>{formatDate(ajoData.startDate)}</Text>
            </View>
            <View style={styles.progressDetailItem}>
              <Text style={styles.progressDetailLabel}>End Date</Text>
              <Text style={styles.progressDetailValue}>{formatDate(ajoData.endDate)}</Text>
            </View>
            <View style={styles.progressDetailItem}>
              <Text style={styles.progressDetailLabel}>Total Pool</Text>
              <Text style={styles.progressDetailValue}>{formatCurrency(ajoData.totalPool)}</Text>
            </View>
          </View>
        </View>

        {/* Your Position */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Position</Text>
            <Text style={styles.yourShareValue}>{formatCurrency(ajoData.yourShare)}</Text>
          </View>
          
          <View style={styles.positionDetails}>
            <View style={styles.positionItem}>
              <Ionicons name="calendar-outline" size={16} color="#999" />
              <Text style={styles.positionText}>Next contribution: {ajoData.nextContribution}</Text>
            </View>
            <View style={styles.positionItem}>
              <Ionicons name="cash-outline" size={16} color="#999" />
              <Text style={styles.positionText}>Next payout: {formatDate(ajoData.nextPayout)}</Text>
            </View>
            <View style={styles.positionItem}>
              <Ionicons name="trophy-outline" size={16} color="#999" />
              <Text style={styles.positionText}>Your turn: In 2 weeks</Text>
            </View>
          </View>
        </View>

        {/* Members Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Members ({members.length})</Text>
            <TouchableOpacity 
              style={styles.inviteButton}
              onPress={handleInvite}
            >
              <Ionicons name="person-add" size={16} color="#FFD700" />
              <Text style={styles.inviteButtonText}>Invite</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.membersScroll}>
            {members.map((member) => (
              <View key={member.id} style={styles.memberCard}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberInitial}>
                    {member.name.charAt(0)}
                  </Text>
                  {member.role === 'Admin' && (
                    <View style={styles.adminBadge}>
                      <Ionicons name="shield" size={10} color="#FFD700" />
                    </View>
                  )}
                </View>
                <Text style={styles.memberName} numberOfLines={1}>
                  {member.name}
                </Text>
                <View style={styles.memberMeta}>
                  {renderMemberStatus(member.status)}
                  <Text style={styles.memberRole}>{member.role}</Text>
                </View>
                <Text style={styles.memberContributions}>
                  {member.contributions} paid
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Recent Transactions */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity onPress={() => router.push(`/(app)/ajo/transactions/${ajoData.id}`)}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {transactions.slice(0, 3).map((transaction) => (
            <View key={transaction.id} style={styles.transactionItem}>
              <View style={styles.transactionIcon}>
                <Ionicons 
                  name={transaction.type === 'contribution' ? 'arrow-down-circle' : 'arrow-up-circle'} 
                  size={20} 
                  color={transaction.type === 'contribution' ? '#4CAF50' : '#2196F3'} 
                />
              </View>
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionType}>
                  {transaction.type === 'contribution' ? 'Contribution' : 'Payout'}
                </Text>
                <Text style={styles.transactionMember}>{transaction.member}</Text>
                <Text style={styles.transactionDate}>{transaction.date}</Text>
              </View>
              <View style={styles.transactionAmount}>
                <Text style={[
                  styles.transactionAmountText,
                  { color: transaction.type === 'contribution' ? '#4CAF50' : '#2196F3' }
                ]}>
                  {transaction.type === 'contribution' ? '+' : '-'}{formatCurrency(transaction.amount)}
                </Text>
                <View style={[
                  styles.statusBadgeSmall,
                  { backgroundColor: transaction.status === 'completed' ? '#4CAF5020' : '#FF980020' }
                ]}>
                  <Text style={[
                    styles.statusBadgeSmallText,
                    { color: transaction.status === 'completed' ? '#4CAF50' : '#FF9800' }
                  ]}>
                    {transaction.status}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* AJO Rules */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>AJO Rules</Text>
          </View>
          {ajoData.rules.map((rule, index) => (
            <View key={index} style={styles.ruleItem}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#4CAF50" />
              <Text style={styles.ruleText}>{rule}</Text>
            </View>
          ))}
        </View>
      </Animated.ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.primaryAction]}
          onPress={() => handleAction('contribute')}
        >
          <Ionicons name="cash-outline" size={20} color="#000" />
          <Text style={styles.primaryActionText}>Make Contribution</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.secondaryAction]}
          onPress={() => handleAction('withdraw')}
          disabled={ajoData.yourShare <= 0}
        >
          <Ionicons name="wallet-outline" size={20} color="#FFD700" />
          <Text style={styles.secondaryActionText}>Withdraw</Text>
        </TouchableOpacity>
      </View>

      {/* Invite Modal */}
      <Modal
        visible={showInviteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowInviteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invite Members</Text>
              <TouchableOpacity onPress={() => setShowInviteModal(false)}>
                <Ionicons name="close" size={24} color="#999" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalText}>
              Share this AJO with friends and family to join your savings circle.
            </Text>
            
            <View style={styles.inviteOptions}>
              <TouchableOpacity style={styles.inviteOption} onPress={handleShare}>
                <Ionicons name="share-social" size={28} color="#2196F3" />
                <Text style={styles.inviteOptionText}>Share Link</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.inviteOption}>
                <Ionicons name="qr-code" size={28} color="#4CAF50" />
                <Text style={styles.inviteOptionText}>QR Code</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.inviteOption}>
                <Ionicons name="copy" size={28} color="#9C27B0" />
                <Text style={styles.inviteOptionText}>Copy Link</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.paymentModalContent}>
            <Text style={styles.paymentModalTitle}>
              {selectedAction === 'contribute' ? 'Make Contribution' : 'Withdraw Funds'}
            </Text>
            <Text style={styles.paymentModalText}>
              {selectedAction === 'contribute' 
                ? `Daily contribution: ${formatCurrency(ajoData.amount)}`
                : `Available to withdraw: ${formatCurrency(ajoData.yourShare)}`
              }
            </Text>
            
            <View style={styles.paymentActions}>
              <TouchableOpacity 
                style={[styles.paymentButton, styles.paymentButtonCancel]}
                onPress={() => setShowPaymentModal(false)}
              >
                <Text style={styles.paymentButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.paymentButton, styles.paymentButtonConfirm]}
                onPress={() => {
                  Alert.alert(
                    'Success',
                    selectedAction === 'contribute' 
                      ? 'Contribution made successfully!'
                      : 'Withdrawal request submitted!'
                  );
                  setShowPaymentModal(false);
                }}
              >
                <Text style={styles.paymentButtonConfirmText}>
                  {selectedAction === 'contribute' ? 'Pay Now' : 'Withdraw'}
                </Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  infoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  infoHeader: {
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  ajoTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  ajoCategory: {
    color: '#FFD700',
    fontSize: 14,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  ajoDescription: {
    color: '#999',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    minWidth: '45%',
  },
  statValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    color: '#999',
    fontSize: 12,
  },
  sectionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  progressPercentage: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 20,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 4,
  },
  progressDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressDetailItem: {
    alignItems: 'center',
  },
  progressDetailLabel: {
    color: '#999',
    fontSize: 12,
    marginBottom: 4,
  },
  progressDetailValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  yourShareValue: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
  },
  positionDetails: {
    gap: 12,
  },
  positionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  positionText: {
    color: '#999',
    fontSize: 14,
    flex: 1,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  inviteButtonText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
  },
  membersScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  memberCard: {
    width: 100,
    alignItems: 'center',
    marginRight: 16,
  },
  memberAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  memberInitial: {
    color: '#FFD700',
    fontSize: 20,
    fontWeight: 'bold',
  },
  adminBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#000',
    borderRadius: 10,
    padding: 2,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  memberName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  memberMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  memberRole: {
    color: '#999',
    fontSize: 10,
  },
  memberContributions: {
    color: '#4CAF50',
    fontSize: 10,
    fontWeight: '600',
  },
  viewAllText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  transactionIcon: {
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionType: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  transactionMember: {
    color: '#999',
    fontSize: 12,
    marginBottom: 2,
  },
  transactionDate: {
    color: '#666',
    fontSize: 10,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  transactionAmountText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statusBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusBadgeSmallText: {
    fontSize: 10,
    fontWeight: '600',
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  ruleText: {
    color: '#999',
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
    backgroundColor: '#000',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  primaryAction: {
    backgroundColor: '#FFD700',
  },
  primaryActionText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryAction: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  secondaryActionText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
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
  modalText: {
    color: '#999',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  inviteOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  inviteOption: {
    alignItems: 'center',
    gap: 8,
    padding: 16,
  },
  inviteOptionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  paymentModalContent: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  paymentModalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  paymentModalText: {
    color: '#FFD700',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  paymentActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  paymentButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  paymentButtonCancel: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  paymentButtonCancelText: {
    color: '#999',
    fontSize: 16,
    fontWeight: '600',
  },
  paymentButtonConfirm: {
    backgroundColor: '#FFD700',
  },
  paymentButtonConfirmText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AJODetailsScreen;