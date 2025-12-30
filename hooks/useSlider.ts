// hooks/useAdvancedSlider.ts
import { useState, useRef, useCallback, useEffect } from 'react';
import { PanResponder, Animated, Easing } from 'react-native';

interface UseAdvancedSliderProps {
  initialValue?: number;
  minValue?: number;
  maxValue?: number;
  step?: number;
  animate?: boolean;
  animationDuration?: number;
  onValueChange?: (value: number) => void;
  onSlidingStart?: () => void;
  onSlidingComplete?: () => void;
}

export const useAdvancedSlider = ({
  initialValue = 0,
  minValue = 0,
  maxValue = 100,
  step = 1,
  animate = true,
  animationDuration = 200,
  onValueChange,
  onSlidingStart,
  onSlidingComplete,
}: UseAdvancedSliderProps = {}) => {
  const [value, setValue] = useState<number>(initialValue);
  const [isSliding, setIsSliding] = useState<boolean>(false);
  const [sliderWidth, setSliderWidth] = useState<number>(0);
  
  const animatedValue = useRef(new Animated.Value(initialValue)).current;
  const thumbPosition = useRef(new Animated.Value(0)).current;
  
  // Animate value changes
  const animateValue = useCallback((newValue: number) => {
    if (animate) {
      Animated.timing(animatedValue, {
        toValue: newValue,
        duration: animationDuration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    } else {
      animatedValue.setValue(newValue);
    }
  }, [animate, animationDuration, animatedValue]);
  
  const updateValue = useCallback((newValue: number) => {
    const clampedValue = Math.max(minValue, Math.min(newValue, maxValue));
    setValue(clampedValue);
    animateValue(clampedValue);
    onValueChange?.(clampedValue);
  }, [minValue, maxValue, onValueChange, animateValue]);
  
  const calculateValueFromPosition = useCallback((positionX: number): number => {
    if (!sliderWidth || sliderWidth <= 0) return minValue;
    
    const relativeX = Math.max(0, Math.min(positionX, sliderWidth));
    const percentage = relativeX / sliderWidth;
    let newValue = minValue + (maxValue - minValue) * percentage;
    
    if (step > 0) {
      newValue = Math.round(newValue / step) * step;
    }
    
    return Math.max(minValue, Math.min(newValue, maxValue));
  }, [sliderWidth, minValue, maxValue, step]);
  
  const handleLayout = useCallback((event: any) => {
    const { width } = event.nativeEvent.layout;
    setSliderWidth(width - 24);
  }, []);
  
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        setIsSliding(true);
        onSlidingStart?.();
        
        const touchX = evt.nativeEvent.locationX;
        const newValue = calculateValueFromPosition(touchX);
        updateValue(newValue);
      },
      onPanResponderMove: (evt) => {
        if (!isSliding) return;
        
        const touchX = evt.nativeEvent.locationX;
        const newValue = calculateValueFromPosition(touchX);
        updateValue(newValue);
      },
      onPanResponderRelease: () => {
        setIsSliding(false);
        onSlidingComplete?.();
      },
      onPanResponderTerminate: () => {
        setIsSliding(false);
        onSlidingComplete?.();
      },
    })
  ).current;
  
  // Update thumb position animation
  useEffect(() => {
    const percentage = maxValue - minValue > 0 
      ? (value - minValue) / (maxValue - minValue) 
      : 0;
    
    if (sliderWidth > 0) {
      const newPosition = percentage * sliderWidth;
      Animated.spring(thumbPosition, {
        toValue: newPosition,
        friction: 8,
        tension: 40,
        useNativeDriver: false,
      }).start();
    }
  }, [value, minValue, maxValue, sliderWidth, thumbPosition]);
  
  return {
    value,
    animatedValue,
    thumbPosition,
    isSliding,
    sliderWidth,
    panHandlers: panResponder.panHandlers,
    setSliderWidth,
    updateValue,
    handleLayout,
    calculateValueFromPosition,
  };
};