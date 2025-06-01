import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import moment from 'moment';
import ViewShot from 'react-native-view-shot';
import Share from 'react-native-share';
import * as MediaLibrary from 'expo-media-library';

const statusColors: { [key: string]: string } = {
  Success: '#22c55e',
  Failed: '#ef4444',
  Pending: '#eab308',
};

export default function ReceiptScreen() {

  const params = useLocalSearchParams();
  const viewShotRef = useRef<ViewShot>(null);

  // State for media library permission
  const [mediaPermission, setMediaPermission] = useState<boolean | null>(null);

  const {
    id,
    provider,
    data,
    price,
    date,
    status,
    phoneNumber,
    reference,
    metadata: metadataString,
  } = params;

  const metadata = metadataString ? JSON.parse(metadataString as string) : {};

  // Request media library permission on mount
  useEffect(() => {
    (async () => {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      setMediaPermission(status === 'granted');

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Media library access is needed to save or share the receipt.'
        );
      }
    })();
  }, []);

  const handleSaveScreenshot = async () => {
    try {
      if (!viewShotRef.current?.capture) throw new Error('ViewShot not ready');

      const uri = await viewShotRef.current.capture();
      const asset = await MediaLibrary.createAssetAsync(uri);
      await MediaLibrary.createAlbumAsync('Edges Network', asset, false);

      Alert.alert('Success', 'Receipt saved to your gallery.');
    } catch (error) {
      console.error('Save Error:', error);
      Alert.alert('Error', 'Could not save the screenshot. Try again.');
    }
  };

  const handleShare = async () => {
    try {
      if (!viewShotRef.current?.capture) throw new Error('ViewShot not ready');

      const uri = await viewShotRef.current.capture();
      const shareOptions = {
        title: 'Transaction Receipt',
        url: Platform.OS === 'ios' ? uri : `file://${uri}`,
        type: 'image/png',
      };

      await Share.open(shareOptions);
    } catch (error: any) {
      if (error.message !== 'User did not share') {
        console.error('Share Error:', error);
        Alert.alert('Error', 'Could not share receipt. Try again.');
      }
    }
  };

  // Conditional rendering based on permissions
  if (mediaPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Checking Permissions...</Text>
      </View>
    );
  }

  // Main UI (shown even if permissions are denied, since displaying the receipt doesn't require permissions)
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1.0 }}>
          <View style={styles.receiptContainer}>
            <Text style={styles.receiptTitle}>Edges Network</Text>
            <Text style={styles.receiptSubtitle}>Transaction Receipt</Text>

            {[
              { label: 'Transaction ID', value: id },
              { label: 'Reference', value: reference || 'N/A' },
              { label: 'Provider', value: provider || 'Unknown' },
              { label: 'Description', value: data || 'Unknown' },
              {
                label: 'Amount',
                value: `₦${parseFloat(price as string).toLocaleString('en-NG', {
                  minimumFractionDigits: 2,
                })}`,
              },
              { label: 'Phone Number', value: phoneNumber || 'N/A' },
              {
                label: 'Date',
                value: moment(date as string).format('MMM D, YYYY h:mm A'),
              },
              {
                label: 'Status',
                value: status || 'Unknown',
                color: statusColors[status as string],
              },
              metadata.validity && { label: 'Validity', value: metadata.validity },
              metadata.payment_method && {
                label: 'Payment Method',
                value: metadata.payment_method,
              },
            ]
              .filter(Boolean)
              .map((item: any, index) => (
                <View style={styles.receiptSection} key={index}>
                  <Text style={styles.receiptLabel}>{item.label}</Text>
                  <Text
                    style={[
                      styles.receiptValue,
                      item.color ? { color: item.color } : {},
                    ]}
                  >
                    {item.value}
                  </Text>
                </View>
              ))}
          </View>
        </ViewShot>

        <View style={styles.actionButtons}>
          <Pressable
            onPress={mediaPermission ? handleSaveScreenshot : () => Alert.alert(
              'Permission Required',
              'Media library access is needed to save the receipt. Please grant permissions in your device settings.'
            )}
            style={styles.actionButton}
          >
            <Ionicons name="save" size={20} color="white" />
            <Text style={styles.actionButtonText}>Save</Text>
          </Pressable>
          <Pressable
            onPress={mediaPermission ? handleShare : () => Alert.alert(
              'Permission Required',
              'Media library access is needed to share the receipt. Please grant permissions in your device settings.'
            )}
            style={styles.actionButton}
          >
            <Ionicons name="share-social-sharp" size={20} color="white" />
            <Text style={styles.actionButtonText}>Share</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    // paddingTop: Platform.OS === 'android' ? 30 : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  scrollContent: {
    padding: 16,
  },
  receiptContainer: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  receiptTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  receiptSubtitle: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 20,
  },
  receiptSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  receiptLabel: {
    fontSize: 14,
    color: '#d1d5db',
    flex: 1,
  },
  receiptValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d7a77f',
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});