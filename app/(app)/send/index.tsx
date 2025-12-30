// app/(app)/send/index.tsx
'use client';

import React from 'react';
import {
  SafeAreaView,
  StatusBar,
  View,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '@/config/supabase';

interface Country {
  iso_code: string;
  name: string;
  flag_emoji: string;
}

export default function SendScreen() {
  const router = useRouter();
  const [featured, setFeatured] = React.useState<Country[]>([]);
  const [loading, setLoading] = React.useState(true);
  const pulse = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 3000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 3000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  React.useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const { data } = await supabase
          .from('countries')
          .select('iso_code, name, flag_emoji')
          .in('iso_code', ['US', 'NG', 'CA', 'AR'])
          .order('name');

        setFeatured(data || []);
      } catch (err) {
        console.error('Error fetching featured countries:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFeatured();
  }, []);

  const transfers = [
    { title: '$B-PAY Tag', subtitle: 'Send to a B-Pay tag or phone contact', icon: 'tag', route: 'BPayTag' },
    { title: 'NGN Bank Accounts', subtitle: 'Send to a bank account', icon: 'bank', route: 'NGNBanks' },
    { title: 'eNaira', subtitle: 'Send to an eNaira account', icon: require('../../../assets/images/enaira.png'), route: 'eNaira' },
  ];

  const international = [
    { title: 'Send Internationally', subtitle: 'To 60+ countries', icon: 'earth', route: 'International' },
    { title: 'Send Digital Dollars', subtitle: 'USDC, USDT, PYUSD', icon: 'bitcoin', route: 'DigitalDollars' },
  ];

  const renderTransfer = (item: any) => (
    <TouchableOpacity
      key={item.title}
      style={styles.transferItem}
      onPress={() => router.push(`/send/tabs/${item.route}`)}
      activeOpacity={0.7}
    >
      <View style={styles.iconBox}>
        {typeof item.icon === 'string' ? (
          item.icon === 'bitcoin' ? (
            <FontAwesome5 name="bitcoin" size={28} color="#FFD700" />
          ) : (
            <MaterialCommunityIcons name={item.icon} size={28} color="#FFD700" />
          )
        ) : (
          <Image source={item.icon} style={{ width: 32, height: 32 }} resizeMode="contain" />
        )}
      </View>
      <View style={styles.text}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>{item.subtitle}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={24} color="#666" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      {/* NON-BLOCKING PULSING WATERMARK */}
      <Animated.View pointerEvents="none" style={styles.watermarkWrapper}>
        <Animated.Image
          source={require('../../../assets/icons/home.png')}
          style={[styles.watermark, { transform: [{ scale: pulse }] }]}
          resizeMode="contain"
        />
      </Animated.View>

      <ScrollView style={styles.scroll}>
        <View style={styles.content}>
          {/* SEND INTERNATIONALLY */}
          <View style={styles.header}>
            <Text style={styles.sectionTitle}>SEND INTERNATIONALLY</Text>
            <TouchableOpacity onPress={() => router.push('/send/tabs/countries')}>
              <Text style={styles.viewAll}>View all</Text>
            </TouchableOpacity>
          </View>

          {/* DYNAMIC FLAGS FROM SUPABASE */}
          {loading ? (
            <ActivityIndicator color="#FFD700" style={{ marginVertical: 20 }} />
          ) : (
            <View style={styles.flagsRow}>
              {featured.map((c) => (
                <View key={c.iso_code} style={styles.flagItem}>
                  <View style={styles.flagCircle}>
                    <Text style={styles.flagEmoji}>{c.flag_emoji}</Text>
                  </View>
                  <Text style={styles.flagLabel}>{c.name}</Text>
                </View>
              ))}
            </View>
          )}

          {/* SEND IN NIGERIA */}
          <Text style={styles.sectionTitle}>SEND IN NIGERIA</Text>
          {transfers.map(renderTransfer)}

          {/* INTERNATIONAL USING */}
          <Text style={styles.sectionTitle}>SEND INTERNATIONALLY USING</Text>
          {international.map(renderTransfer)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  scroll: { flex: 1 },
  content: { padding: 16, zIndex: 10 },

  // WATERMARK — DOES NOT BLOCK TOUCHES
  watermarkWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  watermark: {
    width: 300,
    height: 300,
    opacity: 0.10,
  },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  viewAll: { color: '#FFD700', fontWeight: '600', fontSize: 14 },

  flagsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  flagItem: { alignItems: 'center', width: '22%' },
  flagCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#333',
    marginBottom: 10,
  },
  flagEmoji: { fontSize: 38 },
  flagLabel: { color: '#fff', fontSize: 11, textAlign: 'center' },

  transferItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    padding: 18,
    borderRadius: 16,
    marginBottom: 12,
    zIndex: 20,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  text: { flex: 1 },
  title: { color: '#fff', fontSize: 16, fontWeight: '600' },
  subtitle: { color: '#aaa', fontSize: 13, marginTop: 4 },
});