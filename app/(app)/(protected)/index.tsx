import "react-native-gesture-handler";
import React from "react";
import { SafeAreaView, StyleSheet, StatusBar } from "react-native";
import LightningBolt from "@/components/home/LightningBolt";
import TopBar from "@/components/home/TopBar";
import WalletCard from "@/components/home/WalletCard";
import BannerCarousel from "@/components/home/BannerCarousel";
import QuickActionsSection from "@/components/home/QuickActionsSection";
import NewsTicker from "@/components/home/NewsTicker";

export default function Index() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar hidden />
      
      <LightningBolt />
      <TopBar />
      <WalletCard />
      <BannerCarousel />
      <QuickActionsSection />
      <NewsTicker />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#000", 
    paddingTop: 70 
  },
});