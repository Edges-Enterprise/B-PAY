import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const RecentBeneficiaries = ({ beneficiaries = [], onSelect }) => {
  if (!beneficiaries || beneficiaries.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Recent Beneficiaries</Text>
        <View style={styles.headerActions}>
          <Text style={styles.subtitle}>Recents</Text>
          <Text style={styles.subtitle}>Favourites</Text>
        </View>
      </View>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {beneficiaries.map((beneficiary, index) => (
          <TouchableOpacity
            key={beneficiary.id || index}
            style={styles.beneficiaryCard}
            onPress={() => onSelect(beneficiary)}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {beneficiary.account_name?.[0] || '?'}
              </Text>
            </View>
            <Text style={styles.name} numberOfLines={1}>
              {beneficiary.account_name}
            </Text>
            <Text style={styles.detail}>
              {beneficiary.account_number}
            </Text>
            <View style={styles.bankBadge}>
              <Text style={styles.bankText}>
                {beneficiary.bank_name}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  subtitle: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '500',
  },
  scrollContent: {
    gap: 12,
  },
  beneficiaryCard: {
    width: 140,
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#000',
    fontSize: 20,
    fontWeight: 'bold',
  },
  name: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    textAlign: 'center',
  },
  detail: {
    color: '#FFD700',
    fontSize: 12,
    marginBottom: 8,
  },
  bankBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bankText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '500',
  },
});

export default RecentBeneficiaries;