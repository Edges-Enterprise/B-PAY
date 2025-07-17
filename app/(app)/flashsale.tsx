import React, { useState, useContext } from "react";
import { View, Text, StyleSheet, StatusBar, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "@/context/supabase-provider";
import { useFont } from "@/context/font-context";
import { supabase } from "@/config/supabase";
import { DataContext } from "@/context/DataProvider";
import SwipeWrapper from "../../components/SwipeWrapper";
import PlanItemWithSwipe from "@/components/homescreen/PlanItemWithSwipe";
import { NETWORK_IMAGES, DEFAULT_PROVIDER_IMAGE } from "@/constants/helper";

interface DataBundle {
  id: number;
  data: string;
  price: number;
  validity: string;
  category: string;
  description?: string;
  variation_code: string;
  planType: string;
}

interface Provider {
  id: number;
  name: string;
  image: any;
  code: string;
  imageKey: string;
}

interface ConfirmationParams {
  bundle?: string;
  provider?: string;
  phoneNumber?: string;
  userEmail?: string;
  transactionPin?: string;
  source?: string;
  networkId?: string;
  planId?: string;
}

// Flash Sale bundles
const flashSalePlans = [
  {
    id: "1",
    plan_name: "500MB 30 Days",
    price: 250,
    validity: "30 Days",
    data: "500MB",
    variation_code: "data_500mb_30days",
    category: "Data",
    planType: "Flash Sale Data Plan",
    description: "500MB Flash Sale for 30 Days",
  },
  {
    id: "2",
    plan_name: "1GB 30 Days",
    price: 470,
    validity: "30 Days",
    data: "1GB",
    variation_code: "data_1gb_30days",
    category: "Data",
    planType: "Flash Sale Data Plan",
    description: "1GB Flash Sale for 30 Days",
  },
];

// Available providers
const networkProviders = [
  { id: "1", name: "MTN", code: "mtn", imageKey: "mtn" },
  { id: "2", name: "GLO", code: "glo", imageKey: "glo" },
  { id: "3", name: "AIRTEL", code: "airtel", imageKey: "airtel" },
  { id: "4", name: "9MOBILE", code: "9mobile", imageKey: "9mobile" },
];

export default function FlashSaleScreen() {
  const { selectedFont } = useFont();
  const { user } = useAuth();
  const { isLoading: isPlansLoading, errorMessage } = useContext(DataContext);

  const [selectedProvider, setSelectedProvider] = useState(networkProviders[0]); // Default to MTN

  const userEmail = user?.email || "";
  const phoneNumber = user?.user_metadata?.phone || "";
  const hasTransactionPin = !!user?.user_metadata?.transaction_pin_created;

  const handleSwipePurchase = (plan: DataBundle) => {
    if (!hasTransactionPin) {
      router.push({
        pathname: "/Confirmation",
        params: { source: "flash-sale", requirePinCreation: "true" },
      });
      return;
    }

    const bundle: DataBundle = {
      id: parseInt(plan.id),
      data: plan.data,
      price: plan.price,
      validity: plan.validity,
      category: plan.category,
      description: plan.description,
      variation_code: plan.variation_code,
      planType: plan.planType,
    };

    const provider: Provider = {
      id: parseInt(selectedProvider.id),
      name: selectedProvider.name,
      image: NETWORK_IMAGES[selectedProvider.code] || DEFAULT_PROVIDER_IMAGE,
      code: selectedProvider.code,
      imageKey: selectedProvider.imageKey,
    };

    const params: ConfirmationParams = {
      bundle: JSON.stringify(bundle),
      provider: JSON.stringify({
        id: provider.id,
        name: provider.name,
        code: provider.code,
        imageKey: provider.imageKey,
      }),
      phoneNumber,
      userEmail,
      transactionPin: user?.user_metadata?.transaction_pin,
      source: "flash-sale",
      networkId: selectedProvider.id,
      planId: plan.id,
    };

    // console.log("Navigating to Confirmation with params:", params);

    router.push({
      pathname: "/Confirmation",
      params: params as any,
    });
  };

  if (isPlansLoading) {
    return (
      <SwipeWrapper>
        <View style={[styles.container, styles.centerContent]}>
          <ActivityIndicator size="large" color="#D7A77F" />
          <Text style={styles.loadingText}>Loading data...</Text>
        </View>
      </SwipeWrapper>
    );
  }

  if (errorMessage) {
    console.error("Data provider error:", errorMessage);
  }

  return (
    <SwipeWrapper>
      <View style={styles.container}>
        <StatusBar
          translucent
          backgroundColor="transparent"
          barStyle="light-content"
        />
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backIcon}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={[styles.headerTitle, { fontFamily: selectedFont }]}>
            Flash Sale ⚡
          </Text>
        </View>

        <View style={styles.providerSelection}>
          <Text style={styles.sectionTitle}>Select Provider</Text>
          <View style={styles.providerGrid}>
            {networkProviders.map((provider) => (
              <Pressable
                key={provider.id}
                onPress={() => setSelectedProvider(provider)}
                style={[
                  styles.providerButton,
                  selectedProvider.id === provider.id && styles.selectedProvider,
                ]}
              >
                <Text style={styles.providerText}>{provider.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.plansSection}>
          <Text style={styles.sectionTitle}>Available Flash Sale Plans</Text>
          {flashSalePlans.map((plan, index) => (
            <PlanItemWithSwipe
              key={`${plan.id}-${index}`}
              plan={`${plan.plan_name} - ₦${plan.price}`}
              image={NETWORK_IMAGES[selectedProvider.code] || DEFAULT_PROVIDER_IMAGE}
              index={index}
              onSwipePurchase={() => handleSwipePurchase(plan)}
            />
          ))}
        </View>
      </View>
    </SwipeWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    paddingHorizontal: 16,
    paddingTop: StatusBar.currentHeight || 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  backIcon: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 12,
  },
  providerSelection: {
    marginVertical: 16,
  },
  providerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  providerButton: {
    backgroundColor: "#222",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedProvider: {
    backgroundColor: "#FF4500",
  },
  providerText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  plansSection: {
    marginVertical: 16,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#fff",
    fontSize: 16,
    marginTop: 10,
  },
});