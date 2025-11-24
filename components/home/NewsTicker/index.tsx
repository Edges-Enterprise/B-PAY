import React, { useRef, useEffect } from "react";
import { View, Text, Animated, Easing, Dimensions, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

const newsItems = [
  { icon: "trending-up", text: "BTC up 5% in 24h" },
  { icon: "gift-outline", text: "Claim your daily login reward now!" },
  { icon: "shield-check", text: "Security update: new 2FA options available" },
  { icon: "cash-multiple", text: "Refer a friend and earn $10 bonus" },
  { icon: "rocket-launch-outline", text: "New feature: Instant cross-chain transfers" },
];

const COLORS = ["#FFFFFF", "#FFD700", "#00BFFF"];
const generateNewsSequence = () => {
  const sequence: number[] = [];
  while (sequence.length < 500) {
    for (let i = 0; i < newsItems.length; i++) {
      for (let repeat = 0; repeat < 3; repeat++) sequence.push(i);
    }
  }
  return sequence;
};
const newsSequence = generateNewsSequence();
const ITEM_WIDTH = width * 0.9;
const TOTAL_WIDTH = ITEM_WIDTH * newsSequence.length;

export default function NewsTicker() {
  const scrollX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(scrollX, {
        toValue: 1,
        duration: TOTAL_WIDTH * 14,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  return (
    <View style={styles.newsContainer}>
      <Animated.View
        style={{
          flexDirection: "row",
          transform: [{
            translateX: scrollX.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -TOTAL_WIDTH],
            }),
          }],
        }}
      >
        {newsSequence.map((itemIdx, idx) => {
          const item = newsItems[itemIdx];
          return (
            <View key={`${itemIdx}-${idx}`} style={{ width: ITEM_WIDTH, flexDirection: "row", alignItems: "center" }}>
              <MaterialCommunityIcons name={item.icon} size={14} color={COLORS[idx % 3]} style={{ marginRight: 6 }} />
              <Text style={[styles.newsText, { color: COLORS[idx % 3] }]}>{item.text}</Text>
            </View>
          );
        })}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  newsContainer: { 
    position: "absolute", 
    bottom: 100, 
    left: 20, 
    right: 20, 
    height: 32, 
    backgroundColor: "#111111", 
    borderRadius: 18, 
    borderWidth: 2, 
    borderColor: "#000", 
    justifyContent: "center", 
    overflow: "hidden", 
    paddingHorizontal: 12, 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 4, 
    elevation: 5, 
    zIndex: 1 
  },
  newsText: { 
    fontSize: 11, 
    fontWeight: "600", 
    letterSpacing: 0.4 
  },
});