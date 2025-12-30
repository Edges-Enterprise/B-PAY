import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

export default function CountrySkeleton({ count = 4 }) {
  return (
    <View style={styles.row}>
      {Array(count).fill(0).map((_, i) => (
        <Animated.View entering={FadeIn.delay(i * 100)} key={i} style={styles.skeleton} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 28 },
  skeleton: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#222' },
});