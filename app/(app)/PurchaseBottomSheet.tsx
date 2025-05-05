import React, { useRef, useMemo, useState, forwardRef } from 'react';
import { View, Button, StyleSheet, Alert } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PhoneInput from '@/components/PhoneInput';
import PINPrompt from '@/components/PINPrompt';

// Optionally, auto-detect network from phone
const detectNetwork = (number: string) => {
  if (number.startsWith('0803') || number.startsWith('0703') || number.startsWith('0903')) return 'MTN';
  if (number.startsWith('0805') || number.startsWith('0705') || number.startsWith('0905')) return 'Glo';
  if (number.startsWith('0802') || number.startsWith('0701') || number.startsWith('0902')) return 'Airtel';
  if (number.startsWith('0809') || number.startsWith('0708') || number.startsWith('0909')) return '9mobile';
  return undefined;
};

const PurchaseBottomSheet = forwardRef((props, ref) => {
  const snapPoints = useMemo(() => ['50%'], []);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [transactionPin, setTransactionPin] = useState('');
  const [hideNextTime, setHideNextTime] = useState(false);

  const handlePurchase = async () => {
    if (!phoneNumber || !transactionPin) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    if (hideNextTime) {
      await AsyncStorage.setItem('transactionPin', transactionPin);
    }

    // Call your actual purchase logic here
    Alert.alert('Purchase Initiated', `Phone: ${phoneNumber}, PIN: ${transactionPin}`);
  };

  return (
    <BottomSheet ref={ref} index={-1} snapPoints={snapPoints}>
      <View style={styles.contentContainer}>
        <PhoneInput
          value={phoneNumber}
          onChange={(val) => setPhoneNumber(val)}
          network={detectNetwork(phoneNumber)}
        />
        <PINPrompt
          value={transactionPin}
          onChange={setTransactionPin}
          hideNextTime={hideNextTime}
          onToggleHide={setHideNextTime}
        />
        <Button title="Purchase" onPress={handlePurchase} />
      </View>
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: 'black',
  },
});

export default PurchaseBottomSheet;
