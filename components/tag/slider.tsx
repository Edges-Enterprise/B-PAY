import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSlider } from '@/hooks/useSlider';

interface SliderProps {
  value: number;
  minimumValue?: number;
  maximumValue?: number;
  step?: number;
  onValueChange: (value: number) => void;
  minimumTrackTintColor?: string;
  maximumTrackTintColor?: string;
  thumbTintColor?: string;
  trackHeight?: number;
  thumbSize?: number;
  disabled?: boolean;
  style?: any;
  testID?: string;
}

export const Slider: React.FC<SliderProps> = ({
  value,
  minimumValue = 0,
  maximumValue = 100,
  step = 1,
  onValueChange,
  minimumTrackTintColor = '#4CAF50',
  maximumTrackTintColor = '#333',
  thumbTintColor = '#4CAF50',
  trackHeight = 8,
  thumbSize = 24,
  disabled = false,
  style,
  testID,
}) => {
  const {
    percentage,
    isSliding,
    panHandlers,
    handleLayout,
    updateValue,
  } = useSlider({
    initialValue: value,
    minValue: minimumValue,
    maxValue: maximumValue,
    step,
    onValueChange,
    onSlidingStart: () => {},
    onSlidingComplete: () => {},
  });

  // Update value when prop changes
  React.useEffect(() => {
    if (!isSliding) {
      updateValue(value);
    }
  }, [value, updateValue, isSliding]);

  const thumbPosition = percentage * 100;

  return (
    <View 
      style={[styles.container, style]}
      onLayout={handleLayout}
      testID={testID}
      {...panHandlers}
    >
      {/* Background Track */}
      <View 
        style={[
          styles.track,
          { 
            height: trackHeight,
            backgroundColor: maximumTrackTintColor,
            opacity: disabled ? 0.5 : 1,
          }
        ]} 
      />
      
      {/* Progress Track */}
      <View 
        style={[
          styles.progress,
          { 
            width: `${thumbPosition}%`,
            height: trackHeight,
            backgroundColor: minimumTrackTintColor,
            opacity: disabled ? 0.5 : 1,
          }
        ]} 
      />
      
      {/* Thumb */}
      <View
        style={[
          styles.thumb,
          { 
            left: `${thumbPosition}%`,
            width: thumbSize,
            height: thumbSize,
            borderRadius: thumbSize / 2,
            backgroundColor: thumbTintColor,
            marginLeft: -thumbSize / 2,
            opacity: disabled ? 0.5 : 1,
          }
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
 container: { height: 40, justifyContent: 'center', position: 'relative' },
  track: { position: 'absolute', left: 0, right: 0, height: 8, borderRadius: 4, backgroundColor: '#333' },
  progress: { position: 'absolute', left: 0, height: 8, borderRadius: 4, backgroundColor: '#4CAF50' },
  thumb: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4CAF50',
    borderWidth: 3,
    borderColor: '#000',
    left: '0%',
    marginLeft: -14,
    top: 6,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
  },
});