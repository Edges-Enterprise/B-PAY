// components/SectionHeader.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface SectionHeaderProps {
  title: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title }) => (
  <View style={styles.container}>
    <Text style={styles.title}>{title}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  title: {
    color: '#FFD700',
    fontSize: 15,
    fontWeight: '600',
  },
});