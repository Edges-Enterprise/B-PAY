import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const VerificationTimeline = ({ steps }) => {
  const getStepIcon = (status) => {
    switch (status) {
      case 'success':
        return <Ionicons name="checkmark-circle" size={14} color="#22C55E" />;
      case 'error':
        return <Ionicons name="alert-circle" size={14} color="#EF4444" />;
      case 'warning':
        return <Ionicons name="warning" size={14} color="#F59E0B" />;
      case 'info':
        return <Ionicons name="information-circle" size={14} color="#3B82F6" />;
      default:
        return <View style={styles.pendingDot} />;
    }
  };

  const getStepColor = (status) => {
    switch (status) {
      case 'success':
        return '#22C55E';
      case 'error':
        return '#EF4444';
      case 'warning':
        return '#F59E0B';
      case 'info':
        return '#3B82F6';
      default:
        return '#6B7280';
    }
  };

  return (
    <View style={styles.timelineContainer}>
      {steps.map((step, index) => (
        <View key={step.step} style={styles.stepContainer}>
          <View style={styles.stepIcon}>
            {getStepIcon(step.status)}
            {index < steps.length - 1 && (
              <View style={[styles.connectorLine, { backgroundColor: getStepColor(step.status) }]} />
            )}
          </View>
          <View style={styles.stepContent}>
            <Text style={[styles.stepMessage, { color: getStepColor(step.status) }]}>
              {step.message}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  timelineContainer: {
    marginTop: 12,
    paddingHorizontal: 8,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stepIcon: {
    width: 24,
    alignItems: 'center',
    position: 'relative',
  },
  pendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6B7280',
  },
  connectorLine: {
    position: 'absolute',
    top: 20,
    left: 11,
    width: 2,
    height: 24,
    opacity: 0.5,
  },
  stepContent: {
    flex: 1,
    marginLeft: 12,
    paddingBottom: 4,
  },
  stepMessage: {
    fontSize: 12,
    lineHeight: 16,
  },
});

export default VerificationTimeline;