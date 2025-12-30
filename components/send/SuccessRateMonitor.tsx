import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const SuccessRateMonitor = () => {
  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={() => router.push('/(app)/send/success-rates')}
    >
      <View style={styles.iconContainer}>
        <Ionicons name="trending-up" size={16} color="#FFD700" />
      </View>
      <Text style={styles.text}>Bank Transfer Success Rate Monitor</Text>
      <Ionicons name="chevron-forward" size={16} color="#FFD700" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    flex: 1,
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default SuccessRateMonitor;