import React from 'react';
import { SafeAreaView, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function InternationalScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="earth" size={48} color="#FFD700" />
        <Text style={styles.title}>Send Internationally</Text>
        <Text style={styles.subtitle}>Send money to over 60 countries worldwide</Text>
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