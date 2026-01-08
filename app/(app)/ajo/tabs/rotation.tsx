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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

// Mock rotation data
const ROTATION_DATA = [
  {
    id: '1',
    slot: 1,
    member: 'BPAY System',
    tag: '@system',
    status: 'completed',
    date: 'Today',
    amount: 500,
    icon: 'shield-checkmark',
    color: '#4CAF50',
    type: 'system',
  },
  {
    id: '2',
    slot: 2,
    member: 'You',
    tag: '@you',
    status: 'current',
    date: 'Tomorrow',
    amount: 500,
    icon: 'person',
    color: '#FFD700',
    type: 'creator',
  },
  {
    id: '3',
    slot: 3,
    member: 'Amina Bello',
    tag: '@aminab',
    status: 'upcoming',
    date: 'Day 3',
    amount: 500,
    icon: 'person',
    color: '#2196F3',
    type: 'member',
  },
  {
    id: '4',
    slot: 4,
    member: 'Chinedu Okoro',
    tag: '@chineduo',
    status: 'upcoming',
    date: 'Day 4',
    amount: 500,
    icon: 'person',
    color: '#FF9800',
    type: 'member',
  },
];

const RotationScreen = () => {
  const [selectedAjo, setSelectedAjo] = useState('1');
  const [showRotationSummary, setShowRotationSummary] = useState(false);
  const [showRotationTimeline, setShowRotationTimeline] = useState(true);
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#4CAF50';
      case 'current': return '#FFD700';
      case 'upcoming': return '#2196F3';
      default: return '#999';
    }
  };

  const getMemberInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const handleSetReminder = (slot) => {
    Alert.alert(
      'Reminder Set',
      `You'll be notified before Slot ${slot} payout.`,
      [{ text: 'OK' }]
    );
  };

  const toggleRotationSummary = () => {
    setShowRotationSummary(!showRotationSummary);
    if (showRotationTimeline && !showRotationSummary) {
      setShowRotationTimeline(false);
    }
  };

  const toggleRotationTimeline = () => {
    setShowRotationTimeline(!showRotationTimeline);
    if (showRotationSummary && !showRotationTimeline) {
      setShowRotationSummary(false);
    }
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
        {/* Minimal Header */}
        <View style={styles.minimalHeader}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color="#FFD700" />
          </TouchableOpacity>
          <Text style={styles.minimalTitle}>Rotation</Text>
          <TouchableOpacity style={styles.minimalInfoButton}>
            <Ionicons name="information-circle-outline" size={18} color="#FFD700" />
          </TouchableOpacity>
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false} 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Collapsible Rotation Summary */}
          <View style={styles.collapsibleSection}>
            <TouchableOpacity 
              style={styles.sectionHeader}
              onPress={toggleRotationSummary}
              activeOpacity={0.7}
            >
              <View style={styles.sectionHeaderLeft}>
                <Ionicons name="stats-chart" size={16} color="#FFD700" />
                <Text style={styles.sectionTitle}>Rotation Summary</Text>
              </View>
              <Ionicons 
                name={showRotationSummary ? 'chevron-up' : 'chevron-down'} 
                size={16} 
                color="#FFD700" 
              />
            </TouchableOpacity>
            
            {showRotationSummary && (
              <View style={styles.compactSummaryCard}>
                <View style={styles.compactStatsRow}>
                  <View style={styles.compactStat}>
                    <Text style={styles.compactStatNumber}>1</Text>
                    <Text style={styles.compactStatLabel}>Done</Text>
                  </View>
                  <View style={styles.compactStat}>
                    <Text style={[styles.compactStatNumber, styles.compactStatCurrent]}>1</Text>
                    <Text style={styles.compactStatLabel}>Now</Text>
                  </View>
                  <View style={styles.compactStat}>
                    <Text style={styles.compactStatNumber}>4</Text>
                    <Text style={styles.compactStatLabel}>Next</Text>
                  </View>
                  <View style={styles.compactStat}>
                    <Text style={styles.compactStatNumber}>6</Text>
                    <Text style={styles.compactStatLabel}>Total</Text>
                  </View>
                </View>
                
                <View style={styles.compactInfoRow}>
                  <View style={styles.compactInfoItem}>
                    <Ionicons name="time-outline" size={12} color="#999" />
                    <Text style={styles.compactInfoText}>Next: Tomorrow</Text>
                  </View>
                  <View style={styles.compactInfoItem}>
                    <Ionicons name="cash-outline" size={12} color="#999" />
                    <Text style={styles.compactInfoText}>Pool: ₦12K</Text>
                  </View>
                </View>
                
                <View style={styles.compactInfoRow}>
                  <Text style={styles.compactInfoDetail}>Your slot: #2 (Tomorrow)</Text>
                </View>
              </View>
            )}
          </View>

          {/* Collapsible Rotation Timeline */}
          <View style={styles.collapsibleSection}>
            <TouchableOpacity 
              style={styles.sectionHeader}
              onPress={toggleRotationTimeline}
              activeOpacity={0.7}
            >
              <View style={styles.sectionHeaderLeft}>
                <Ionicons name="list" size={16} color="#FFD700" />
                <Text style={styles.sectionTitle}>Rotation Timeline</Text>
              </View>
              <Ionicons 
                name={showRotationTimeline ? 'chevron-up' : 'chevron-down'} 
                size={16} 
                color="#FFD700" 
              />
            </TouchableOpacity>
            
            {showRotationTimeline && (
              <View style={styles.compactTimeline}>
                {ROTATION_DATA.map((item, index) => (
                  <View key={item.id} style={styles.compactTimelineItem}>
                    {/* Timeline indicator */}
                    <View style={styles.timelineIndicator}>
                      <View style={[
                        styles.timelineDot,
                        { backgroundColor: item.color }
                      ]}>
                        <Ionicons name={item.icon} size={10} color="#fff" />
                      </View>
                      {index < ROTATION_DATA.length - 1 && (
                        <View style={[
                          styles.timelineConnector,
                          item.status === 'current' && styles.timelineConnectorActive
                        ]} />
                      )}
                    </View>

                    {/* Timeline content */}
                    <View style={[
                      styles.compactTimelineCard,
                      item.status === 'current' && styles.compactTimelineCardCurrent
                    ]}>
                      <View style={styles.compactCardHeader}>
                        <View style={styles.compactSlotBadge}>
                          <Text style={styles.compactSlotText}>#{item.slot}</Text>
                          {item.slot === 1 && (
                            <Ionicons name="shield-checkmark" size={8} color="#4CAF50" style={{ marginLeft: 2 }} />
                          )}
                        </View>
                        
                        <View style={[
                          styles.compactStatusBadge,
                          { backgroundColor: `${getStatusColor(item.status)}15` }
                        ]}>
                          <Text style={[
                            styles.compactStatusText,
                            { color: getStatusColor(item.status) }
                          ]}>
                            {item.status === 'completed' ? 'Done' : 
                             item.status === 'current' ? 'Now' : 'Next'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.compactMemberInfo}>
                        <View style={[
                          styles.compactMemberAvatar,
                          { backgroundColor: item.color }
                        ]}>
                          <Text style={styles.compactMemberInitials}>
                            {getMemberInitials(item.member)}
                          </Text>
                        </View>
                        <View style={styles.compactMemberDetails}>
                          <Text style={styles.compactMemberName}>{item.member}</Text>
                          <Text style={styles.compactMemberTag}>{item.tag}</Text>
                        </View>
                      </View>
                      
                      <View style={styles.compactCardFooter}>
                        <View style={styles.compactCardDetails}>
                          <View style={styles.compactDetailItem}>
                            <Ionicons name="calendar-outline" size={10} color="#999" />
                            <Text style={styles.compactDetailText}>{item.date}</Text>
                          </View>
                          <View style={styles.compactDetailItem}>
                            <Ionicons name="cash-outline" size={10} color="#999" />
                            <Text style={styles.compactDetailText}>{formatCurrency(item.amount)}</Text>
                          </View>
                        </View>
                        
                        {item.status === 'current' && (
                          <TouchableOpacity 
                            style={styles.compactRemindButton}
                            onPress={() => handleSetReminder(item.slot)}
                          >
                            <Ionicons name="notifications-outline" size={10} color="#FFD700" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Compact Action Buttons */}
          <View style={styles.compactActionContainer}>
            <TouchableOpacity 
              style={styles.compactActionButton}
              activeOpacity={0.7}
            >
              <Ionicons name="share-outline" size={14} color="#FFD700" />
              <Text style={styles.compactActionButtonText}>Share</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.compactActionButton, styles.compactActionButtonPrimary]}
              onPress={() => router.push('/(app)/ajo/tabs/creator-tools')}
              activeOpacity={0.7}
            >
              <Ionicons name="construct-outline" size={14} color="#FFD700" />
              <Text style={styles.compactActionButtonText}>Manage</Text>
            </TouchableOpacity>
          </View>

          {/* Minimal Info Notice */}
          <View style={styles.minimalInfoNotice}>
            <Ionicons name="information-circle-outline" size={10} color="#666" />
            <Text style={styles.minimalInfoText}>
              Slot 1: BPAY System • Creator manages rotation
            </Text>
          </View>
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
  },
  minimalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  backButton: {
    padding: 4,
  },
  minimalTitle: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: '600',
  },
  minimalInfoButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  collapsibleSection: {
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 6,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
  },
  compactSummaryCard: {
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  compactStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  compactStat: {
    alignItems: 'center',
    flex: 1,
  },
  compactStatNumber: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  compactStatCurrent: {
    color: '#FFD700',
  },
  compactStatLabel: {
    color: '#999',
    fontSize: 10,
  },
  compactInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  compactInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactInfoText: {
    color: '#999',
    fontSize: 11,
  },
  compactInfoDetail: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '500',
  },
  compactTimeline: {
    gap: 10,
  },
  compactTimelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  timelineIndicator: {
    alignItems: 'center',
    width: 20,
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  timelineConnector: {
    width: 2,
    flex: 1,
    backgroundColor: '#333',
    marginTop: 2,
    minHeight: 20,
  },
  timelineConnectorActive: {
    backgroundColor: '#FFD700',
    opacity: 0.3,
  },
  compactTimelineCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  compactTimelineCardCurrent: {
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  compactCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  compactSlotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
  },
  compactSlotText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  compactStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  compactStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  compactMemberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  compactMemberAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactMemberInitials: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  compactMemberDetails: {
    flex: 1,
  },
  compactMemberName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 1,
  },
  compactMemberTag: {
    color: '#999',
    fontSize: 10,
  },
  compactCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactCardDetails: {
    flexDirection: 'row',
    gap: 12,
  },
  compactDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactDetailText: {
    color: '#999',
    fontSize: 10,
  },
  compactRemindButton: {
    padding: 4,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 4,
  },
  compactActionContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    marginBottom: 12,
  },
  compactActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#666',
    borderRadius: 8,
  },
  compactActionButtonPrimary: {
    borderColor: '#FFD700',
  },
  compactActionButtonText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
  },
  minimalInfoNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#333',
  },
  minimalInfoText: {
    flex: 1,
    color: '#666',
    fontSize: 10,
    lineHeight: 12,
  },
});

export default RotationScreen;