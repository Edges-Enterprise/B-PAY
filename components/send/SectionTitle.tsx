// app/(app)/send/components/send/SectionTitle.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  title: string;
  action?: string;
  onActionPress?: () => void;
}

export default function SectionTitle({ title, action, onActionPress }: Props) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={onActionPress}>
          <Text style={styles.action}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { color: '#fff', fontSize: 16, fontWeight: '600' },
  action: { color: '#FFD700', fontSize: 14, fontWeight: '600' },
});