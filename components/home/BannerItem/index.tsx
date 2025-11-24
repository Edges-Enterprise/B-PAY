import React, { memo } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");
const HORIZONTAL_PADDING = 0;
const bannerWidth = width - HORIZONTAL_PADDING * 7;

interface BannerItemProps {
  item: {
    icon: string;
    title: string;
    subtitle: string;
    link: string;
    borderColor: string;
  };
}

const BannerItem = memo(({ item }: BannerItemProps) => (
  <View style={[styles.banner, { borderColor: item.borderColor }]}>
    <View style={styles.bannerLeft}>
      <View style={styles.bannerIcon}>
        <MaterialCommunityIcons name={item.icon} size={22} color="#00BFFF" />
      </View>
      <View>
        <Text style={styles.bannerText}>{item.title}</Text>
        <Text style={styles.bannerSub}>{item.subtitle}</Text>
        <Text style={styles.bannerLink}>{item.link}</Text>
      </View>
    </View>
  </View>
));

const styles = StyleSheet.create({
  banner: { 
    backgroundColor: "#0d0d0d", 
    borderRadius: 12, 
    padding: 14, 
    flexDirection: "row", 
    justifyContent: "center", 
    borderWidth: 1.5, 
    width: bannerWidth 
  },
  bannerLeft: { 
    flexDirection: "row", 
    alignItems: "center", 
    flex: 1, 
    marginLeft: 5 
  },
  bannerIcon: { 
    backgroundColor: "#111", 
    padding: 10, 
    borderRadius: 10, 
    marginRight: 10 
  },
  bannerText: { 
    color: "#fff", 
    fontSize: 14, 
    fontWeight: "600" 
  },
  bannerSub: { 
    color: "#aaa", 
    fontSize: 13 
  },
  bannerLink: { 
    color: "#00FF7F", 
    fontSize: 13, 
    marginTop: 4 
  },
});

export default BannerItem;