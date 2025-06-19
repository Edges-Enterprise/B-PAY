import React from 'react';
import { View, Text, Pressable, StyleSheet, Image, TextInput, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NETWORK_IMAGES, DEFAULT_PROVIDER_IMAGE } from '@/constants/helper';

interface Bundle {
  id: number;
  variation_code?: string;
  description?: string;
  amount?: number | null;
  name?: string;
  data?: string;
  price: number;
  validity?: string;
  category?: string;
  planType?: string;
}

interface Provider {
  id: number;
  name: string;
  image?: string;
  code: string;
  imageKey?: string;
}

interface PurchaseDetailsProps {
  selectedBundle: Bundle;
  selectedProvider: Provider;
  balanceValue: number;
  isBalanceLoading: boolean;
  editableMobileNumber: string;
  isEditingMobile: boolean;
  handleMobileNumberChange: (text: string) => void;
  toggleEditMobile: () => void;
  handleCancel: () => void;
  referenceId: string;
  pulseAnim: Animated.Value;
}

const formatNumberWithCommas = (number: number): string => {
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

const PurchaseDetails: React.FC<PurchaseDetailsProps> = ({
  selectedBundle,
  selectedProvider,
  balanceValue,
  isBalanceLoading,
  editableMobileNumber,
  isEditingMobile,
  handleMobileNumberChange,
  toggleEditMobile,
  handleCancel,
  referenceId,
  pulseAnim,
}) => {
  const basePrice = selectedBundle.price || selectedBundle.amount || 0;
  const purchaseDescription = selectedBundle.data || `Plan ID ${selectedBundle.id}`;
  const providerImage = selectedProvider.imageKey && NETWORK_IMAGES[selectedProvider.imageKey as keyof typeof NETWORK_IMAGES]
    ? NETWORK_IMAGES[selectedProvider.imageKey as keyof typeof NETWORK_IMAGES]
    : DEFAULT_PROVIDER_IMAGE;

  return (
    <View style={styles.card}>
      <Pressable onPress={handleCancel} style={styles.closeButton}>
        <Ionicons name="close" size={30} color="red" />
      </Pressable>
      <View style={styles.providerInfo}>
        <Pressable onPress={handleCancel} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </Pressable>
        <Image
          source={providerImage}
          style={styles.providerLogo}
          resizeMode="contain"
          onError={() => console.error('Image load error')}
        />
        <Text style={styles.providerName}>{selectedProvider.name}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Data Plan</Text>
        <Text style={styles.detailValue}>{purchaseDescription}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Price</Text>
        <Text style={styles.detailValue}>₦{formatNumberWithCommas(basePrice)}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Wallet Balance</Text>
        <Text style={styles.detailValue}>
          {isBalanceLoading ? 'Loading...' : `₦${formatNumberWithCommas(balanceValue)} `}
        </Text>
      </View>
      {selectedBundle.validity && (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Validity</Text>
          <Text style={styles.detailValue}>{selectedBundle.validity}</Text>
        </View>
      )}
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Mobile Number</Text>
        {isEditingMobile ? (
          <View style={styles.phoneContainer}>
            <TextInput
              style={styles.phoneInput}
              value={editableMobileNumber}
              onChangeText={handleMobileNumberChange}
              placeholder="Enter 11-digit mobile number"
              placeholderTextColor="#A1A1AA"
              keyboardType="numeric"
              maxLength={11}
              autoFocus
            />
          </View>
        ) : (
          <View style={styles.phoneContainer}>
            <Pressable onPress={toggleEditMobile}>
              <Animated.Text style={[styles.editText, { opacity: pulseAnim }]}>
                Edit
              </Animated.Text>
            </Pressable>
            <Text style={styles.phoneNumberText}>{editableMobileNumber}</Text>
          </View>
        )}
      </View>
      {selectedBundle.planType && (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Plan Type</Text>
          <Text style={styles.detailValue}>{selectedBundle.planType}</Text>
        </View>
      )}
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Bundle ID</Text>
        <Text style={styles.detailValue}>{selectedBundle.id}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Reference ID</Text>
        <Text style={[styles.detailValue, styles.referenceId]}>{referenceId}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#2D2D2D',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 8,
    padding: 4,
    zIndex: 10,
    accessible: true,
    accessibilityLabel: 'Close confirmation page',
    accessibilityRole: 'button',
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    marginRight: 12,
  },
  providerLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    marginRight: 12,
  },
  providerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'nowrap',
  },
  detailLabel: {
    fontSize: 16,
    color: '#A1A1AA',
    flexShrink: 0,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    textAlign: 'right',
    maxWidth: '55%',
    flexWrap: 'wrap',
  },
  referenceId: {
    flexWrap: 'wrap',
    numberOfLines: 2,
    ellipsizeMode: 'tail',
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    maxWidth: '60%',
    flexShrink: 1,
  },
  phoneInput: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 8,
    textAlign: 'right',
    width: 140,
  },
  phoneNumberText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    textAlign: 'right',
    width: 110,
  },
  editText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22C55E',
    textDecorationLine: 'underline',
    marginRight: 8,
  },
});

export default PurchaseDetails;