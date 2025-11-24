import React, { useState, useRef, useEffect, useCallback } from "react";
import { View, FlatList, Dimensions, StyleSheet } from "react-native";
import BannerItem from "@/components/home/BannerItem";

const { width } = Dimensions.get("window");
const HORIZONTAL_PADDING = 0;
const bannerWidth = width - HORIZONTAL_PADDING * 7;
const BANNER_MARGIN = HORIZONTAL_PADDING;

const bannerData = [
  { icon: "shield", title: "Our next era begins.", subtitle: "Powered by TWT", link: "Read the vision", borderColor: "#FFFF00" },
  { icon: "rocket", title: "Launch into DeFi 2.0", subtitle: "Earn up to 300% APY", link: "Start earning", borderColor: "#00BFFF" },
  { icon: "trophy", title: "Top Trader Contest", subtitle: "Win $50K in prizes", link: "Join now", borderColor: "#FFFFFF" },
  { icon: "lock", title: "Security First", subtitle: "Audited & Insured", link: "Learn more", borderColor: "#FF4444" },
  { icon: "flash", title: "Lightning Fast Swaps", subtitle: "Under 2 seconds", link: "Try it", borderColor: "#FFD700" },
  { icon: "earth", title: "Go Cross-Chain", subtitle: "10+ networks live", link: "Explore", borderColor: "#00FF7F" },
  { icon: "gift", title: "Referral Rewards", subtitle: "Earn 50% of fees", link: "Invite friends", borderColor: "#9B59B6" },
  { icon: "star", title: "VIP Perks Live", subtitle: "Zero fees for holders", link: "Upgrade", borderColor: "#8B4513" },
];

export default function BannerCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const id = setInterval(() => {
      const next = (currentIndex + 1) % bannerData.length;
      flatListRef.current?.scrollToOffset({
        offset: next * (bannerWidth + BANNER_MARGIN),
        animated: true,
      });
      setCurrentIndex(next);
    }, 3000);
    return () => clearInterval(id);
  }, [currentIndex]);

  const renderBanner = useCallback(({ item }) => <BannerItem item={item} />, []);

  return (
    <View style={styles.bannerContainer}>
      <FlatList
        ref={flatListRef}
        data={bannerData}
        renderItem={renderBanner}
        keyExtractor={(_, i) => i.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={bannerWidth + BANNER_MARGIN}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: HORIZONTAL_PADDING }}
        onMomentumScrollEnd={(e) =>
          setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / (bannerWidth + BANNER_MARGIN)))
        }
      />
      <View style={styles.dotsContainer}>
        {bannerData.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === currentIndex ? styles.activeDot : styles.inactiveDot]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: { 
    marginBottom: 15, 
    height: 100 
  },
  dotsContainer: { 
    flexDirection: "row", 
    justifyContent: "center", 
    marginTop: 10 
  },
  dot: { 
    width: 6, 
    height: 6, 
    borderRadius: 3, 
    marginHorizontal: 4 
  },
  activeDot: { 
    backgroundColor: "#00FF7F" 
  },
  inactiveDot: { 
    backgroundColor: "#444" 
  },
});