import React from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';

type Props = {
  value: string;
  onChange: (val: string) => void;
  network?: string;
};

export default function PhoneInput({ value, onChange, network }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Phone Number</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType="phone-pad"
        style={styles.input}
        placeholder="08012345678"
        placeholderTextColor="#999"
      />
      {network && <Text style={styles.network}>Network: {network}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { color: 'white', fontSize: 14, marginBottom: 4 },
  input: {
    backgroundColor: '#1f1f1f',
    borderRadius: 10,
    padding: 12,
    color: 'white',
  },
  network: { color: '#60A5FA', marginTop: 6, fontSize: 12 },
});
