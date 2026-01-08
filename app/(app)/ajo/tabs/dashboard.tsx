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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/stores/auth-store';

const { width } = Dimensions.get('window');

// Mock data for dashboard
const ACTIVE_AJOS = [
  {
    id: '1',
    title: 'Market Women Daily',
    type: 'Daily',
    amount: 500,
    members: 8,
    progress: 75,
    nextPayout: 'Tomorrow',
    totalPool: 12000,
    yourShare: 1500,
  },
  {
    id: '2',
    title: 'Monthly Savings',
    type: 'Monthly',
    amount: 2000,
    members: 5,
    progress: 40,
    nextPayout: '2 weeks',
    totalPool: 30000,
    yourShare: 6000,
  },
];

const COMPLETED_AJOS = [
  {
    id: 'c1',
    title: 'School Fees Plan',
    type: 'Fixed',
    amount: 5000,
    completedDate: '2024-01-15',
    totalReceived: 25000,
  },
];

const DashboardScreen = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('active');
  const [balance, setBalance] = useState(125000);
  const watermarkPulse = useState(new Animated.Value(1))[0];

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
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
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
        {/* Compact Header */}
        <View style={styles.compactHeader}>
          {/* Wallet section */}
          <View style={styles.walletSection}>
            <View style={styles.walletIconContainer}>
              <Ionicons name="wallet-outline" size={20} color="#FFD700" />
            </View>
            <View style={styles.walletInfo}>
              <Text style={styles.walletLabel}>Total Balance</Text>
              <Text style={styles.walletAmount}>{formatCurrency(balance)}</Text>
            </View>
          </View>
          
          {/* New AJO button */}
          <TouchableOpacity 
            style={styles.newAjoButton}
            onPress={() => router.push('/(app)/ajo')}
          >
            <Ionicons name="add" size={20} color="#FFD700" />
            <Text style={styles.newAjoButtonText}>New</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Cards (Compact Version) */}
        <View style={styles.compactStatsContainer}>
          <View style={styles.compactStat}>
            <View style={styles.compactStatIcon}>
              <Ionicons name="people-outline" size={18} color="#FFD700" />
              <View style={styles.statCountBadge}>
                <Text style={styles.statCount}>2</Text>
              </View>
            </View>
            <Text style={styles.compactStatLabel}>Active</Text>
          </View>

          <View style={styles.compactStat}>
            <View style={styles.compactStatIcon}>
              <Ionicons name="trophy-outline" size={18} color="#4CAF50" />
              <View style={[styles.statCountBadge, styles.completedBadge]}>
                <Text style={styles.statCount}>1</Text>
              </View>
            </View>
            <Text style={styles.compactStatLabel}>Completed</Text>
          </View>
        </View>

        {/* Tab Navigation without borders */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'active' && styles.tabActive]}
            onPress={() => setActiveTab('active')}
          >
            <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
              Active AJOs
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'completed' && styles.tabActive]}
            onPress={() => setActiveTab('completed')}
          >
            <Text style={[styles.tabText, activeTab === 'completed' && styles.tabTextActive]}>
              Completed
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
          {activeTab === 'active' ? (
            <>
              {ACTIVE_AJOS.map((ajo) => (
                <TouchableOpacity
                  key={ajo.id}
                  style={styles.ajoCard}
                  onPress={() => router.push(`/(app)/ajo/details/${ajo.id}`)}
                >
                  <View style={styles.ajoCardHeader}>
                    <View>
                      <Text style={styles.ajoTitle}>{ajo.title}</Text>
                      <View style={styles.ajoMeta}>
                        <Text style={styles.ajoType}>{ajo.type}</Text>
                        <Text style={styles.ajoAmount}>{formatCurrency(ajo.amount)}</Text>
                        <Text style={styles.ajoMembers}>{ajo.members} members</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#999" />
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View 
                        style={[styles.progressFill, { width: `${ajo.progress}%` }]} 
                      />
                    </View>
                    <Text style={styles.progressText}>{ajo.progress}% complete</Text>
                  </View>

                  <View style={styles.ajoDetails}>
                    <View style={styles.detailItem}>
                      <Ionicons name="calendar-outline" size={14} color="#999" />
                      <Text style={styles.detailText}>Next payout: {ajo.nextPayout}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Ionicons name="cash-outline" size={14} color="#999" />
                      <Text style={styles.detailText}>Total pool: {formatCurrency(ajo.totalPool)}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Ionicons name="person-outline" size={14} color="#999" />
                      <Text style={styles.detailText}>Your share: {formatCurrency(ajo.yourShare)}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          ) : (
            <>
              {COMPLETED_AJOS.map((ajo) => (
                <View key={ajo.id} style={styles.completedCard}>
                  <View style={styles.completedHeader}>
                    <Text style={styles.completedTitle}>{ajo.title}</Text>
                    <View style={styles.completedBadge}>
                      <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                      <Text style={styles.completedBadgeText}>Completed</Text>
                    </View>
                  </View>
                  
                  <View style={styles.completedMeta}>
                    <Text style={styles.completedType}>{ajo.type}</Text>
                    <Text style={styles.completedAmount}>{formatCurrency(ajo.amount)}</Text>
                    <Text style={styles.completedDate}>Completed: {ajo.completedDate}</Text>
                  </View>

                  <View style={styles.completedDetails}>
                    <View style={styles.completedDetailItem}>
                      <Ionicons name="trophy-outline" size={16} color="#FFD700" />
                      <Text style={styles.completedDetailText}>
                        Total received: {formatCurrency(ajo.totalReceived)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* Empty State */}
          {activeTab === 'active' && ACTIVE_AJOS.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={60} color="#333" />
              <Text style={styles.emptyStateTitle}>No Active AJOs</Text>
              <Text style={styles.emptyStateText}>
                You don't have any active savings circles yet.
              </Text>
              <TouchableOpacity 
                style={styles.emptyStateButton}
                onPress={() => router.push('/(app)/ajo')}
              >
                <Text style={styles.emptyStateButtonText}>Create Your First AJO</Text>
              </TouchableOpacity>
            </View>
          )}

          {activeTab === 'completed' && COMPLETED_AJOS.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="trophy-outline" size={60} color="#333" />
              <Text style={styles.emptyStateTitle}>No Completed AJOs</Text>
              <Text style={styles.emptyStateText}>
                Your completed savings circles will appear here.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
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
  // Compact Header Styles
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  walletSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  walletIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  walletInfo: {
    flex: 1,
  },
  walletLabel: {
    color: '#999',
    fontSize: 12,
    marginBottom: 2,
  },
  walletAmount: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
  },
  newAjoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFD700',
    right: 90
  },
  newAjoButtonText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
  },
  // Compact Stats Styles
  compactStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
    marginBottom: 24,
  },
  compactStat: {
    alignItems: 'center',
  },
  compactStatIcon: {
    position: 'relative',
    marginBottom: 8,
  },
  statCountBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFD700',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedBadge: {
    backgroundColor: '#4CAF50',
  },
  statCount: {
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
  },
  compactStatLabel: {
    color: '#999',
    fontSize: 12,
  },
  // Tab Navigation (without borders)
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  tabText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFD700',
  },
  // Rest of the styles remain the same
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  ajoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  ajoCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  ajoTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  ajoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ajoType: {
    color: '#FFD700',
    fontSize: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  ajoAmount: {
    color: '#fff',
    fontSize: 12,
  },
  ajoMembers: {
    color: '#999',
    fontSize: 12,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#333',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 3,
  },
  progressText: {
    color: '#999',
    fontSize: 12,
    textAlign: 'right',
  },
  ajoDetails: {
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    color: '#999',
    fontSize: 13,
  },
  completedCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  completedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  completedTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  completedBadgeText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
  },
  completedMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  completedType: {
    color: '#FFD700',
    fontSize: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  completedAmount: {
    color: '#fff',
    fontSize: 12,
  },
  completedDate: {
    color: '#999',
    fontSize: 12,
  },
  completedDetails: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  completedDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  completedDetailText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyStateText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: 300,
  },
  emptyStateButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FFD700',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyStateButtonText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default DashboardScreen;