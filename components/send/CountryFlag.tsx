// components/send/CountryFlag.tsx
import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface Props {
  flagEmoji: string;
  label: string;
  isFavorite?: boolean;
  onFavorite?: () => void;
}

export default function CountryFlag({ flagEmoji, label, isFavorite, onFavorite }: Props) {
  return (
    <View style={styles.container}>
      <TouchableOpacity 
        onPress={() => {
          onFavorite?.();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }} 
        style={styles.favBtn}
      >
        <Ionicons
          name={isFavorite ? "star" : "star-outline"}
          size={20}
          color={isFavorite ? "#FFD700" : "#444"}
        />
      </TouchableOpacity>

      <View style={styles.flagCircle}>
        <Text style={styles.flagEmoji}>{flagEmoji}</Text>
      </View>

      <Text style={styles.label} numberOfLines={2}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', width: '22%', marginBottom: 16 },
  favBtn: { position: 'absolute', top: -6, right: -6, zIndex: 10 },
  flagCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#333',
  },
  flagEmoji: { fontSize: 32 },
  label: { color: '#fff', fontSize: 11, marginTop: 6, textAlign: 'center' },
});