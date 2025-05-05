import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, Switch } from 'react-native';

type Props = {
  value: string;
  onChange: (val: string) => void;
  hideNextTime: boolean;
  onToggleHide: (val: boolean) => void;
};

export default function PINPrompt({ value, onChange, hideNextTime, onToggleHide }: Props) {
  return (
    <View>
      <Text style={styles.label}>Enter Transaction PIN</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        secureTextEntry
        keyboardType="number-pad"
        style={styles.input}
        maxLength={4}
        placeholder="****"
        placeholderTextColor="#999"
      />
      <View style={styles.toggleRow}>
        <Switch value={hideNextTime} onValueChange={onToggleHide} />
        <Text style={styles.toggleText}>Don’t ask me again</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: 'white', fontSize: 14, marginBottom: 4 },
  input: {
    backgroundColor: '#1f1f1f',
    borderRadius: 10,
    padding: 12,
    color: 'white',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  toggleText: {
    marginLeft: 8,
    color: 'gray',
    fontSize: 12,
  },
});
