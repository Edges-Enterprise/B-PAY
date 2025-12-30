// components/VirtualAccountCard.tsx
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";

interface VirtualAccountCardProps {
  ngnAccount: {
    bankName: string;
    accountNumber: string;
    accountName: string;
    fullAccountNumber: string;
  } | null;
  bpayTag: string | null;
  showAccountDetails: boolean;
  flipAnim: Animated.Value;
  onFlip: () => void;
  onCopyAccount: () => void;
  onShareAccount: () => void;
}

export default function VirtualAccountCard({
  ngnAccount,
  bpayTag,
  showAccountDetails,
  flipAnim,
  onFlip,
  onCopyAccount,
  onShareAccount,
}: VirtualAccountCardProps) {
  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  const frontAnimatedStyle = {
    transform: [{ rotateY: frontInterpolate }],
  };

  const backAnimatedStyle = {
    transform: [{ rotateY: backInterpolate }],
  };

  return (
    <View style={styles.flipContainer}>
      {/* Front of Card - Tap to See Details */}
      <Animated.View 
        style={[
          styles.cardSide, 
          styles.cardFront,
          frontAnimatedStyle,
          showAccountDetails && styles.hidden
        ]}
      >
        <TouchableOpacity 
          style={styles.tapToSeeButton}
          onPress={onFlip}
        >
          <MaterialCommunityIcons name="eye-outline" size={24} color="#FFD700" />
          <Text style={styles.tapToSeeText}>Tap to See Details</Text>
          <Text style={styles.tapToSeeSubtext}>Your virtual account details</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Back of Card - Account Details */}
      <Animated.View 
        style={[
          styles.cardSide, 
          styles.cardBack,
          backAnimatedStyle,
          !showAccountDetails && styles.hidden
        ]}
      >
        <View style={styles.backCardContent}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={onFlip}
          >
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>

          <View style={styles.bankHeader}>
            <View style={styles.bankLogo}>
              <Text style={styles.bankLogoText}>
                {ngnAccount?.bankName?.substring(0, 3) || "BANK"}
              </Text>
            </View>
            <Text style={styles.bankName}>{ngnAccount?.bankName}</Text>
          </View>

          <View style={styles.accountDetails}>
            <Text style={styles.detailLabel}>Account Number</Text>
            <Text style={styles.accountNumber}>
              {ngnAccount?.fullAccountNumber}
            </Text>

            <Text style={styles.detailLabel}>Account Name</Text>
            <Text style={styles.accountName}>
              {ngnAccount?.accountName}
            </Text>

            <Text style={styles.detailLabel}>Bank Name</Text>
            <Text style={styles.bankDetail}>{ngnAccount?.bankName}</Text>

            <View style={styles.tagSection}>
              <Text style={styles.detailLabel}>Your BPAY Tag</Text>
              <View style={styles.tagContainer}>
                <Text style={styles.tagText}>@{bpayTag}</Text>
              </View>
              <Text style={styles.tagInstruction}>
                Share your BPAY tag for instant transfers
              </Text>
            </View>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.copyButton}
              onPress={onCopyAccount}
            >
              <Ionicons name="copy-outline" size={16} color="#FFD700" />
              <Text style={styles.copyButtonText}>Copy Account</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.shareButton}
              onPress={onShareAccount}
            >
              <Ionicons name="share-outline" size={16} color="#fff" />
              <Text style={styles.shareButtonText}>Share</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.instructions}>
            <Text style={styles.instructionsTitle}>How to Use:</Text>
            <Text style={styles.instruction}>1. Transfer to this account from any bank</Text>
            <Text style={styles.instruction}>2. Funds appear automatically in your wallet</Text>
            <Text style={styles.instruction}>3. Or share your BPAY tag for instant transfers</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  flipContainer: {
    flex: 1,
    marginTop: 8,
  },
  cardSide: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backfaceVisibility: 'hidden',
  },
  cardFront: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBack: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
  },
  hidden: {
    opacity: 0,
  },
  tapToSeeButton: {
    alignItems: 'center',
    padding: 16,
  },
  tapToSeeText: {
    color: "#FFD700",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 8,
  },
  tapToSeeSubtext: {
    color: "#aaa",
    fontSize: 11,
    marginTop: 4,
  },
  backCardContent: {
    flex: 1,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 4,
  },
  bankHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  bankLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  bankLogoText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  bankName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  accountDetails: {
    marginBottom: 16,
  },
  detailLabel: {
    color: '#aaa',
    fontSize: 10,
    marginBottom: 4,
  },
  accountNumber: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: 1,
  },
  accountName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  bankDetail: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 16,
  },
  tagSection: {
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 12,
    marginTop: 8,
  },
  tagContainer: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginVertical: 6,
  },
  tagText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tagInstruction: {
    color: '#aaa',
    fontSize: 10,
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  copyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFD700',
    marginRight: 8,
  },
  copyButtonText: {
    color: "#FFD700",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#333',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginLeft: 8,
  },
  shareButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  instructions: {
    backgroundColor: '#222',
    padding: 12,
    borderRadius: 8,
  },
  instructionsTitle: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  instruction: {
    color: '#aaa',
    fontSize: 10,
    marginBottom: 2,
  },
});