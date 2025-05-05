import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/supabase-provider';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import PlanItemWithSwipe from '@/components/homescreen/PlanItemWithSwipe';
import PurchaseModal from '@/components/homescreen/PurchaseModal';
import TransactionStatusModal from '@/components/homescreen/TransactionStatusModal';
import CreatePinModal from '@/components/homescreen/CreatePinModal';
import { supabase } from '@/config/supabase';

const actions = [
  { title: 'Buy Data', icon: 'cellular-outline', color: '#22C55E', route: '/(app)/(protected)/buy' },
  { title: 'Buy Airtime', icon: 'call-outline', color: '#2563EB', route: '/(app)/(protected)/buy-airtime' },
  { title: 'Electricity', icon: 'flash-outline', color: '#EAB308', route: '/(app)/(protected)/electricity' },
  { title: 'Cable TV', icon: 'tv-outline', color: '#3B82F6', route: '/(app)/(protected)/cable-tv' },
  { title: 'Customer Care', icon: 'headset-outline', color: '#3B82F6', route: '/(app)/(protected)/customer-care' },
  { title: 'Referral', icon: 'gift-outline', color: '#F59E0B', route: '/(app)/(protected)/referral' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const hasTransactionPin = !!user?.user_metadata?.transaction_pin_created;
  const welcomeMessage = user?.user_metadata?.username
    ? `Welcome back, ${user.user_metadata.username} 👋`
    : `Welcome back, Guest 👋`;
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [transactionPin, setTransactionPin] = useState('');
  const [networkProvider, setNetworkProvider] = useState('');
  const [isModalVisible, setModalVisible] = useState(false);
  const [createPinModalVisible, setCreatePinModalVisible] = useState(false);
  const [transactionModalVisible, setTransactionModalVisible] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState('processing');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showTransactionPin, setShowTransactionPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  const handlePurchase = () => {
    if (phoneNumber.length !== 11) {
      alert('Please enter a valid 11-digit phone number');
      return;
    }
    if (!transactionPin || transactionPin.length < 4 || transactionPin.length > 6) {
      alert('Please enter a transaction PIN between 4 and 6 digits');
      return;
    }
    setModalVisible(false);
    setTransactionModalVisible(true);
    setTransactionStatus('processing');
    setTimeout(() => {
      const isSuccess = Math.random() > 0.3;
      setTransactionStatus(isSuccess ? 'success' : 'failed');
    }, 2000);
  };

  const closeTransactionModal = () => {
    setTransactionModalVisible(false);
    setPhoneNumber('');
    setTransactionPin('');
    setSelectedPlan(null);
    setNetworkProvider('');
    setTransactionStatus('processing');
  };

  const closePurchaseModal = () => {
    setModalVisible(false);
    setPhoneNumber('');
    setTransactionPin('');
    setSelectedPlan(null);
    setNetworkProvider('');
  };

  const closeCreatePinModal = () => {
    setCreatePinModalVisible(false);
    setNewPin('');
    setConfirmPin('');
  };

  const handleCreatePin = async () => {
    if (newPin.length < 4 || newPin.length > 6 || confirmPin.length < 4 || confirmPin.length > 6) {
      alert('PIN must be between 4 and 6 digits.');
      return;
    }
    if (newPin !== confirmPin) {
      alert('PINs do not match.');
      return;
    }
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          transaction_pin_created: true,
          transaction_pin: newPin,
        },
      });
      if (error) throw error;

      console.log('Transaction PIN set:', newPin);
      setTransactionPin(newPin);
      setCreatePinModalVisible(false);
      setNewPin('');
      setConfirmPin('');
    } catch (error) {
      console.error('Error updating user metadata:', error.message);
      alert('Failed to save PIN. Please try again.');
    }
  };

  const getProviderFromPhone = (phone) => {
    const prefix = phone.slice(0, 4);
    const mtn = ['0803', '0806', '0703', '0706', '0813', '0816', '0810', '0814', '0903', '0906', '0913', '0916'];
    const glo = ['0805', '0807', '0705', '0815', '0811', '0905', '0915'];
    const airtel = ['0802', '0808', '0708', '0812', '0701', '0902', '0907', '0901', '0912'];
    const etisalat = ['0809', '0817', '0818', '0909', '0908'];
    if (mtn.includes(prefix)) return 'MTN';
    if (glo.includes(prefix)) return 'GLO';
    if (airtel.includes(prefix)) return 'AIRTEL';
    if (etisalat.includes(prefix)) return '9MOBILE';
    return '';
  };

  useEffect(() => {
    if (phoneNumber.length === 11) {
      setNetworkProvider(getProviderFromPhone(phoneNumber));
    } else {
      setNetworkProvider('');
    }
  }, [phoneNumber]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <Text style={styles.welcomeTitle}>{welcomeMessage}</Text>
        <Text style={styles.welcomeSubtitle}>Your business dashboard is here 🔥</Text>
        <View style={styles.quickActionsHeader}>
          <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
          <Pressable onPress={() => router.push('/(app)/(protected)/all-actions')}>
            <Text style={styles.moreButtonText}>More ... ></Text>
          </Pressable>
        </View>
        <View style={styles.quickActionsCard}>
          <View style={styles.quickActionsGrid}>
            {actions.map((action, index) => (
              <Pressable
                key={index}
                onPress={() => router.push(action.route)}
                style={styles.quickActionCard}
              >
                <Ionicons name={action.icon} size={24} color={action.color} />
                <Text style={styles.quickActionTitle}>
                  {action.title.length > 12 ? action.title.slice(0, 11) + '...' : action.title}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <Text style={styles.sectionTitle}>🔥 Popular Plans</Text>
        {['MTN 1.5GB – ₦300', 'Glo 2GB – ₦500', 'Airtel 1GB – ₦250'].map((plan, index) => (
          <PlanItemWithSwipe
            key={plan}
            plan={plan}
            index={index}
            setSelectedPlan={setSelectedPlan}
            setModalVisible={setModalVisible}
          />
        ))}
      </View>

      <PurchaseModal
        visible={isModalVisible}
        onClose={closePurchaseModal}
        selectedPlan={selectedPlan}
        phoneNumber={phoneNumber}
        setPhoneNumber={setPhoneNumber}
        transactionPin={transactionPin}
        setTransactionPin={setTransactionPin}
        networkProvider={networkProvider}
        hasTransactionPin={hasTransactionPin}
        showTransactionPin={showTransactionPin}
        setShowTransactionPin={setShowTransactionPin}
        onCreatePin={() => setCreatePinModalVisible(true)}
        onContinue={handlePurchase}
      />

      <TransactionStatusModal
        visible={transactionModalVisible}
        onClose={closeTransactionModal}
        transactionStatus={transactionStatus}
        selectedPlan={selectedPlan}
        phoneNumber={phoneNumber}
        networkProvider={networkProvider}
      />

      <CreatePinModal
        visible={createPinModalVisible}
        onClose={closeCreatePinModal}
        newPin={newPin}
        setNewPin={setNewPin}
        confirmPin={confirmPin}
        setConfirmPin={setConfirmPin}
        showNewPin={showNewPin}
        setShowNewPin={setShowNewPin}
        showConfirmPin={showConfirmPin}
        setShowConfirmPin={setShowConfirmPin}
        onSave={handleCreatePin}
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    paddingHorizontal: 16,
    paddingTop: StatusBar.currentHeight || 48,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: 'gray',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  quickActionsHeader: {
    marginTop: 24,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moreButtonText: {
    color: '#60A5FA',
    fontSize: 14,
    fontWeight: '500',
  },
  quickActionsCard: {
    backgroundColor: '#171717',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingTop: 12,
    marginBottom: 24,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  quickActionCard: {
    width: '30%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  quickActionTitle: {
    color: 'white',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 6,
    textAlign: 'center',
  },
});