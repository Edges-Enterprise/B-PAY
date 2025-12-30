import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const FreeTransfersIndicator = ({ count = 3 }) => {
  return (
    <View style={styles.container}>
      <Ionicons name="flash" size={16} color="#FFD700" />
      <Text style={styles.text}>Free transfers for the day: {count}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  text: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default FreeTransfersIndicator;