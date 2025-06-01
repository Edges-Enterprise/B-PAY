import React, { useRef, useEffect } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Easing } from 'react-native';

interface PlanItemWithSwipeProps {
  plan: string;
  index: number;
  onSwipePurchase: () => void;
}

const PlanItemWithSwipe: React.FC<PlanItemWithSwipeProps> = ({ plan, index, onSwipePurchase }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const swipeableRef = useRef(null);

  useEffect(() => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 500,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ]).start(() => pulse());
    };
    pulse();
    return () => {
      pulseAnim.stopAnimation();
    };
  }, []);

  const handleSwipe = () => {
    onSwipePurchase();
    if (swipeableRef.current) {
      swipeableRef.current.close();
    }
  };

  const renderLeftActions = () => (
    <View style={styles.swipeHintContainer}>
      <Animated.Text
        style={[
          styles.swipeHintText,
          {
            transform: [{ scale: pulseAnim }],
            opacity: pulseAnim.interpolate({
              inputRange: [1, 1.05],
              outputRange: [0.9, 1],
            }),
          },
        ]}
      >
        Swipe to Purchase
      </Animated.Text>
    </View>
  );

  return (
    <View style={styles.planItemContainer}>
      <Swipeable
        ref={swipeableRef}
        onSwipeableWillOpen={handleSwipe}
        friction={2}
        leftThreshold={40}
        renderLeftActions={renderLeftActions}
      >
        <View style={styles.planItem}>
          <Text style={styles.planText}>{plan}</Text>
          <Animated.Text
            style={[
              styles.swipeHintText,
              {
                transform: [{ scale: pulseAnim }],
                opacity: pulseAnim.interpolate({
                  inputRange: [1, 1.05],
                  outputRange: [0.9, 1],
                }),
              },
            ]}
          >
            Swipe to Purchase
          </Animated.Text>
        </View>
      </Swipeable>
    </View>
  );
};

const styles = StyleSheet.create({
  planItemContainer: {
    marginBottom: 12,
  },
  planItem: {
    backgroundColor: '#171717',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  planText: {
    color: 'white',
    fontWeight: '500',
    flex: 1,
    textAlign: 'left',
  },
  swipeHintText: {
    color: 'gray',
    fontWeight: '600',
    fontSize: 12,
    textAlign: 'left',
    minWidth: 100,
  },
  swipeHintContainer: {
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'flex-start',
    width: 100,
    height: '100%',
    paddingLeft: 12,
  },
});

export default PlanItemWithSwipe;