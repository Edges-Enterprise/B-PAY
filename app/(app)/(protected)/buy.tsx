import React from 'react';
import { View, Text, Pressable, Image, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

// Define Provider type
interface Provider {
  id: number;
  name: string;
  logo: string;
  serviceID: string;
}

const providers: Provider[] = [
  {
    id: 1,
    name: 'MTN',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4e/MTN_Group_logo.svg',
    serviceID: 'mtn-data',
  },
  {
    id: 2,
    name: 'Glo',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/8/8c/Glo_logo.svg',
    serviceID: 'glo-data',
  },
  {
    id: 3,
    name: 'Airtel',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/3/3c/Airtel_logo.svg',
    serviceID: 'airtel-data',
  },
  {
    id: 4,
    name: '9mobile',
    logo: 'https://upload.wikimedia.org/wikipedia/en/7/7e/9mobile_logo.png',
    serviceID: 'etisalat-data',
  },
  {
    id: 5,
    name: 'Glo SME',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/8/8c/Glo_logo.svg',
    serviceID: 'glo-sme-data',
  },
  {
    id: 6,
    name: 'Spectranet',
    logo: 'https://www.spectranet.com.ng/assets/images/logo.png',
    serviceID: 'spectranet',
  },
  {
    id: 7,
    name: 'Smile',
    logo: 'https://smile.com.ng/wp-content/uploads/2020/05/Smile-logo.png',
    serviceID: 'smile-direct',
  },
];

const ServiceProviderScreen: React.FC = () => {
  const router = useRouter();

  const selectProvider = (provider: Provider) => {
    router.push({
      pathname: '/(app)/serviceprovider',
      params: {
        provider: JSON.stringify({
          id: provider.id,
          name: provider.name,
          logo: provider.logo,
          serviceID: provider.serviceID,
        }),
      },
    });
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.selectProviderTitle}>📱 Select Data Provider</Text>
      <View style={styles.providerGrid}>
        {providers.map((provider) => (
          <Pressable
            key={provider.id}
            onPress={() => selectProvider(provider)}
            style={styles.providerCard}
          >
            <View style={styles.providerCardContent}>
              <Image
                source={{ uri: provider.logo }}
                style={styles.providerLogoLarge}
                resizeMode="contain"
              />
              <Text style={styles.providerCardName}>{provider.name}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    paddingTop: 48,
    paddingHorizontal: 16,
  },
  selectProviderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 24,
  },
  providerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  providerCard: {
    width: '48%',
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  providerCardContent: {
    alignItems: 'center',
  },
  providerLogoLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'white',
    marginBottom: 12,
  },
  providerCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default ServiceProviderScreen;
