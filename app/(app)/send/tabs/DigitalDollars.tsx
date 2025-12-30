import React from 'react';
import { SafeAreaView, View, Text, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

export default function DigitalDollarsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <FontAwesome5 name="bitcoin" size={48} color="#FFD700" />
        <Text style={styles.title}>Send Digital Dollars</Text>
        <Text style={styles.subtitle}>Send USDC, USDT, or PYUSD to any wallet</Text>
      </View>
      <View style={styles.placeholder}>
        <Text style={styles.comingSoon}>Coming Soon</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', padding: 20 },
  header: { alignItems: 'center', marginTop: 60 },
  title: { color: '#FFD700', fontSize: 28, fontWeight: 'bold', marginTop: 20 },
  subtitle: { color: '#aaa', fontSize: 16, textAlign: 'center', marginTop: 10 },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  comingSoon: { color: '#666', fontSize: 18 },
});