import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const AdBanner = () => {
  return (
    <TouchableOpacity style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Get Up to ¥100 Cashback!</Text>
        <Text style={styles.description}>
          Top up ¥100—¥1,000 for betting & get up to ¥100 cashback
        </Text>
        <View style={styles.button}>
          <Text style={styles.buttonText}>Top up Now!</Text>
          <Ionicons name="arrow-forward" size={14} color="#000" />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
    padding: 16,
  },
  content: {
    gap: 8,
  },
  title: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
  },
  description: {
    color: '#999',
    fontSize: 13,
    lineHeight: 18,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 8,
    marginTop: 8,
  },
  buttonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default AdBanner;