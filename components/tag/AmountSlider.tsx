import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface AmountSliderProps {
  balance: number;
  onAmountChange: (amount: number) => void;
}

export default function AmountSlider({ balance, onAmountChange }: AmountSliderProps) {
  const [sliderWidth, setSliderWidth] = useState(0);
  const pan = useState(new Animated.Value(0))[0];

  useEffect(() => {
    pan.addListener(({ value }) => {
      const percentage = Math.min(Math.max(value / sliderWidth, 0), 1);
      const amount = Math.floor(percentage * balance);
      onAmountChange(amount);
    });

    return () => pan.removeAllListeners();
  }, [sliderWidth, balance]);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gestureState) => {
      const newX = Math.min(Math.max(gestureState.dx, 0), sliderWidth);
      pan.setValue(newX);
    },
    onPanResponderRelease: () => {
      // Optional: Add haptic feedback here
    },
  });

  const percentage = pan.interpolate({
    inputRange: [0, sliderWidth],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  const currentAmount = Math.floor((pan as any)._value / sliderWidth * balance) || 0;

  return (
    <View style={styles.container}>
      <View style={styles.amountDisplay}>
        <Text style={styles.amountLabel}>Amount to send:</Text>
        <Text style={styles.amountValue}>₦{currentAmount.toLocaleString()}</Text>
      </View>

      <View
        style={styles.sliderContainer}
        onLayout={(event) => setSliderWidth(event.nativeEvent.layout.width)}
      >
        {/* Track */}
        <View style={styles.track}>
          <Animated.View
            style={[
              styles.filledTrack,
              { width: percentage }
            ]}
          />
        </View>

        {/* Drag Handle */}
        <Animated.View
          style={[
            styles.dragHandle,
            {
              left: Animated.subtract(pan, 12),
              transform: [{ translateX: 0 }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <MaterialCommunityIcons name="drag-horizontal" size={24} color="#FFD700" />
        </Animated.View>

        {/* Balance Indicator */}
        <View style={styles.balanceIndicator}>
          <View style={styles.balanceDot} />
          <Text style={styles.balanceText}>Balance: ₦{balance.toLocaleString()}</Text>
        </View>
      </View>

      {/* Quick Select Amounts */}
      <View style={styles.quickSelect}>
        {[0.25, 0.5, 0.75, 1].map((ratio) => (
          <View key={ratio} style={styles.quickSelectItem}>
            <View style={styles.ratioDot} />
            <Text style={styles.ratioText}>{Math.floor(ratio * 100)}%</Text>
            <Text style={styles.amountText}>
              ₦{Math.floor(ratio * balance).toLocaleString()}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 16,
  },
  amountDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  amountLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  amountValue: {
    color: '#FFD700',
    fontSize: 24,
    fontWeight: 'bold',
  },
  sliderContainer: {
    height: 60,
    justifyContent: 'center',
  },
  track: {
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    overflow: 'hidden',
  },
  filledTrack: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 2,
  },
  dragHandle: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#000',
    borderWidth: 2,
    borderColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  balanceIndicator: {
    position: 'absolute',
    right: 0,
    top: 10,
    alignItems: 'flex-end',
  },
  balanceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4444',
    marginBottom: 4,
  },
  balanceText: {
    color: '#999',
    fontSize: 10,
  },
  quickSelect: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
  },
  quickSelectItem: {
    alignItems: 'center',
  },
  ratioDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#444',
    marginBottom: 4,
  },
  ratioText: {
    color: '#666',
    fontSize: 10,
  },
  amountText: {
    color: '#999',
    fontSize: 10,
    marginTop: 2,
  },
});