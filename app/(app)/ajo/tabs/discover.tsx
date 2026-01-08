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
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

// Mock discover data
const DISCOVER_AJOS = [
  {
    id: '1',
    title: 'Market Women Association',
    type: 'Daily',
    amount: 500,
    members: 8,
    maxMembers: 10,
    creator: '@aminat',
    duration: '3 months',
    description: 'Daily contributions for market women in Lagos',
    category: 'Business',
    joined: false,
    createdDate: '2024-01-15',
    popularity: 85,
  },
  {
    id: '2',
    title: 'Tech Bros Savings',
    type: 'Monthly',
    amount: 10000,
    members: 6,
    maxMembers: 8,
    creator: '@techlead',
    duration: '6 months',
    description: 'Monthly savings for tech professionals',
    category: 'Tech',
    joined: true,
    createdDate: '2024-01-10',
    popularity: 92,
  },
  {
    id: '3',
    title: 'Students Support Group',
    type: 'Weekly',
    amount: 2000,
    members: 12,
    maxMembers: 15,
    creator: '@studentlife',
    duration: '4 months',
    description: 'Weekly contributions for student expenses',
    category: 'Education',
    joined: false,
    createdDate: '2024-01-20',
    popularity: 78,
  },
  {
    id: '4',
    title: 'Family Emergency Fund',
    type: 'Fixed',
    amount: 5000,
    members: 5,
    maxMembers: 8,
    creator: '@familycare',
    duration: '1 year',
    description: 'Long-term savings for family emergencies',
    category: 'Family',
    joined: false,
    createdDate: '2024-01-05',
    popularity: 65,
  },
  {
    id: '5',
    title: 'Community Development',
    type: 'Monthly',
    amount: 3000,
    members: 10,
    maxMembers: 12,
    creator: '@communitylead',
    duration: '8 months',
    description: 'Community development and support fund',
    category: 'Community',
    joined: false,
    createdDate: '2024-01-18',
    popularity: 88,
  },
  {
    id: '6',
    title: 'Freelancers Collective',
    type: 'Weekly',
    amount: 1500,
    members: 7,
    maxMembers: 10,
    creator: '@freelancer',
    duration: '5 months',
    description: 'Weekly savings for freelance professionals',
    category: 'Business',
    joined: true,
    createdDate: '2024-01-12',
    popularity: 90,
  },
];

const CATEGORIES = [
  { id: 'all', name: 'All Categories' },
  { id: 'business', name: 'Business' },
  { id: 'tech', name: 'Tech' },
  { id: 'education', name: 'Education' },
  { id: 'family', name: 'Family' },
  { id: 'community', name: 'Community' },
];

const SORT_OPTIONS = [
  { id: 'newest', name: 'Newest First', icon: 'calendar' },
  { id: 'popular', name: 'Most Popular', icon: 'trending-up' },
  { id: 'members', name: 'Most Members', icon: 'people' },
  { id: 'amount_asc', name: 'Amount: Low to High', icon: 'arrow-up' },
  { id: 'amount_desc', name: 'Amount: High to Low', icon: 'arrow-down' },
  { id: 'available', name: 'Most Slots Available', icon: 'add-circle' },
];

const DiscoverScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
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
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  // Filter AJOs
  const filteredAjos = DISCOVER_AJOS.filter(ajo => {
    const matchesSearch = searchQuery === '' || 
      ajo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ajo.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ajo.creator.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || 
      ajo.category.toLowerCase() === selectedCategory.toLowerCase();
    
    return matchesSearch && matchesCategory;
  });

  // Sort AJOs
  const sortedAjos = [...filteredAjos].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.createdDate) - new Date(a.createdDate);
      case 'popular':
        return b.popularity - a.popularity;
      case 'members':
        return b.members - a.members;
      case 'amount_asc':
        return a.amount - b.amount;
      case 'amount_desc':
        return b.amount - a.amount;
      case 'available':
        return (b.maxMembers - b.members) - (a.maxMembers - a.members);
      default:
        return 0;
    }
  });

  const handleJoinRequest = (ajo) => {
    if (ajo.joined) {
      router.push(`/(app)/ajo/details/${ajo.id}`);
    } else {
      // Show request sent confirmation
      // In real app, you would update state or make API call
      console.log(`Request to join ${ajo.title}`);
    }
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSortBy('newest');
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
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Discover AJOs</Text>
            <Text style={styles.subtitle}>Find and join savings circles</Text>
          </View>
          <TouchableOpacity 
            style={styles.createButton}
            onPress={() => router.push('/(app)/ajo')}
          >
            <Ionicons name="add" size={20} color="#FFD700" />
            <Text style={styles.createButtonText}>Create</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search AJOs by name, description or creator..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter and Sort Row */}
        <View style={styles.controlRow}>
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={() => setShowFilterModal(true)}
          >
            <Ionicons name="filter" size={16} color="#FFD700" />
            <Text style={styles.controlButtonText}>Filter</Text>
            {selectedCategory !== 'all' && (
              <View style={styles.activeDot} />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={() => setShowSortModal(true)}
          >
            <Ionicons name="swap-vertical" size={16} color="#FFD700" />
            <Text style={styles.controlButtonText}>Sort</Text>
            {sortBy !== 'newest' && (
              <View style={styles.activeDot} />
            )}
          </TouchableOpacity>

          {(searchQuery !== '' || selectedCategory !== 'all' || sortBy !== 'newest') && (
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={clearAllFilters}
            >
              <Ionicons name="close" size={14} color="#fff" />
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Active Filters Display */}
        {(searchQuery !== '' || selectedCategory !== 'all') && (
          <View style={styles.activeFiltersContainer}>
            {searchQuery !== '' && (
              <View style={styles.activeFilter}>
                <Text style={styles.activeFilterText}>Search: {searchQuery}</Text>
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close" size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
            {selectedCategory !== 'all' && (
              <View style={styles.activeFilter}>
                <Text style={styles.activeFilterText}>
                  Category: {CATEGORIES.find(c => c.id === selectedCategory)?.name}
                </Text>
                <TouchableOpacity onPress={() => setSelectedCategory('all')}>
                  <Ionicons name="close" size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Results Count */}
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsCount}>
            {sortedAjos.length} AJO{sortedAjos.length !== 1 ? 's' : ''} found
          </Text>
          {sortBy !== 'newest' && (
            <Text style={styles.sortIndicator}>
              Sorted by {SORT_OPTIONS.find(s => s.id === sortBy)?.name.toLowerCase()}
            </Text>
          )}
        </View>

        {/* AJO List */}
        <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
          {sortedAjos.length > 0 ? (
            sortedAjos.map((ajo) => {
              const slotsAvailable = ajo.maxMembers - ajo.members;
              const showJoinButton = slotsAvailable > 2;
              
              return (
                <View key={ajo.id} style={styles.ajoCard}>
                  <View style={styles.ajoCardHeader}>
                    <View style={styles.ajoTitleContainer}>
                      <Text style={styles.ajoTitle}>{ajo.title}</Text>
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>{ajo.category}</Text>
                      </View>
                    </View>
                    {ajo.joined && (
                      <View style={styles.joinedBadge}>
                        <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                        <Text style={styles.joinedText}>Joined</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.ajoDescription}>{ajo.description}</Text>

                  <View style={styles.ajoDetails}>
                    <View style={styles.detailRow}>
                      <View style={styles.detailItem}>
                        <Ionicons name="repeat" size={14} color="#999" />
                        <Text style={styles.detailText}>{ajo.type}</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Ionicons name="cash" size={14} color="#999" />
                        <Text style={styles.detailText}>{formatCurrency(ajo.amount)}</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Ionicons name="people" size={14} color="#999" />
                        <Text style={styles.detailText}>
                          {ajo.members}/{ajo.maxMembers} members
                        </Text>
                      </View>
                    </View>

                    <View style={styles.detailRow}>
                      <View style={styles.detailItem}>
                        <Ionicons name="calendar" size={14} color="#999" />
                        <Text style={styles.detailText}>{ajo.duration}</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Ionicons name="person" size={14} color="#999" />
                        <Text style={styles.detailText}>By {ajo.creator}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.memberProgress}>
                    <View style={styles.progressBar}>
                      <View 
                        style={[
                          styles.progressFill, 
                          { width: `${(ajo.members / ajo.maxMembers) * 100}%` }
                        ]} 
                      />
                    </View>
                    <View style={styles.slotsRow}>
                      <Text style={styles.progressText}>
                        {slotsAvailable} slots available
                      </Text>
                      {showJoinButton && !ajo.joined && (
                        <TouchableOpacity
                          style={styles.joinIconButton}
                          onPress={() => handleJoinRequest(ajo)}
                        >
                          <Ionicons name="person-add" size={20} color="#FFD700" />
                        </TouchableOpacity>
                      )}
                      {ajo.joined && (
                        <TouchableOpacity
                          style={styles.viewIconButton}
                          onPress={() => handleJoinRequest(ajo)}
                        >
                          <Ionicons name="chevron-forward" size={20} color="#4CAF50" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={60} color="#333" />
              <Text style={styles.emptyStateTitle}>No AJOs Found</Text>
              <Text style={styles.emptyStateText}>
                {searchQuery || selectedCategory !== 'all' 
                  ? 'Try adjusting your filters or search terms' 
                  : 'No AJOs available at the moment'}
              </Text>
              {(searchQuery !== '' || selectedCategory !== 'all') && (
                <TouchableOpacity 
                  style={styles.clearSearchButton}
                  onPress={clearAllFilters}
                >
                  <Text style={styles.clearSearchText}>Clear All Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>
      </View>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Category</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              {CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.modalItem,
                    selectedCategory === category.id && styles.modalItemActive
                  ]}
                  onPress={() => {
                    setSelectedCategory(category.id);
                    setShowFilterModal(false);
                  }}
                >
                  <Text style={[
                    styles.modalItemText,
                    selectedCategory === category.id && styles.modalItemTextActive
                  ]}>
                    {category.name}
                  </Text>
                  {selectedCategory === category.id && (
                    <Ionicons name="checkmark" size={20} color="#FFD700" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSortModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sort Options</Text>
              <TouchableOpacity onPress={() => setShowSortModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              {SORT_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.modalItem,
                    sortBy === option.id && styles.modalItemActive
                  ]}
                  onPress={() => {
                    setSortBy(option.id);
                    setShowSortModal(false);
                  }}
                >
                  <Ionicons 
                    name={option.icon} 
                    size={20} 
                    color={sortBy === option.id ? '#FFD700' : '#999'} 
                  />
                  <Text style={[
                    styles.modalItemText,
                    sortBy === option.id && styles.modalItemTextActive,
                    styles.modalItemTextWithIcon
                  ]}>
                    {option.name}
                  </Text>
                  {sortBy === option.id && (
                    <Ionicons name="checkmark" size={20} color="#FFD700" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    color: '#FFD700',
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#999',
    fontSize: 14,
    marginTop: 4,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  createButtonText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 12,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFD700',
    position: 'relative',
  },
  controlButtonText: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '600',
  },
  activeDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFD700',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  activeFiltersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  activeFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  activeFilterText: {
    color: '#FFD700',
    fontSize: 12,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  resultsCount: {
    color: '#999',
    fontSize: 13,
  },
  sortIndicator: {
    color: '#FFD700',
    fontSize: 12,
    fontStyle: 'italic',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  ajoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  ajoCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  ajoTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  ajoTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  categoryBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  categoryBadgeText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '600',
  },
  joinedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  joinedText: {
    color: '#4CAF50',
    fontSize: 11,
    fontWeight: '600',
  },
  ajoDescription: {
    color: '#999',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  ajoDetails: {
    gap: 8,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  detailText: {
    color: '#999',
    fontSize: 12,
    flex: 1,
  },
  memberProgress: {
    marginBottom: 0,
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
  slotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    color: '#999',
    fontSize: 11,
  },
  joinIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  viewIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
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
  clearSearchButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 8,
  },
  clearSearchText: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 20,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalItemActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
  },
  modalItemText: {
    color: '#999',
    fontSize: 16,
  },
  modalItemTextActive: {
    color: '#FFD700',
    fontWeight: '600',
  },
  modalItemTextWithIcon: {
    flex: 1,
    marginLeft: 12,
  },
});

export default DiscoverScreen;