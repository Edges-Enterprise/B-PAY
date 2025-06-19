import React, { useMemo, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Animated,
  PanResponder,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MotiView } from "moti";

interface DataBundle {
  id: number;
  data: string;
  price: number;
  validity: string;
  category: string;
  description?: string;
  variation_code?: string;
  planType: string;
}

interface DataBundleListProps {
  dataBundles: DataBundle[];
  activeCategory: string;
  activePlanType: string;
  searchTerm: string;
  setSelectedBundle: React.Dispatch<React.SetStateAction<DataBundle | null>>;
  setIsPurchaseModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isLoading: boolean;
  errorMessage: string | null;
  retryLoad: () => void;
}

const DataBundleList: React.FC<DataBundleListProps> = ({
  dataBundles,
  activeCategory,
  activePlanType,
  searchTerm,
  setSelectedBundle,
  setIsPurchaseModalOpen,
  isLoading,
  errorMessage,
  retryLoad,
}) => {
  const formatNumberWithCommas = (number: number): string => {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const parseSearchInput = (input: string) => {
    const normalized = input.toLowerCase().trim();
    const dataMatch = normalized.match(/(\d*\.?\d*)\s*(gb|mb)/i);
    const validityMatch = normalized.match(/(\d+)\s*(day|days|month|months|week|weeks)/i);
    const planMatch = normalized.match(/(mtn|airtel|glo|9mobile)/i);

    return {
      dataAmount: dataMatch ? parseFloat(dataMatch[1]) : null,
      dataUnit: dataMatch ? dataMatch[2].toUpperCase() : null,
      validityDays: validityMatch ? parseInt(validityMatch[1], 10) : null,
      validityUnit: validityMatch ? validityMatch[2].toLowerCase() : null,
      planType: planMatch ? planMatch[1].toLowerCase() : null,
    };
  };

  const searchBundles = (query: string) => {
    if (!query) return null;
    const { dataAmount, dataUnit, validityDays, validityUnit, planType } = parseSearchInput(query);
    return dataBundles
      .filter((bundle) => {
        let isMatch = true;
        if (dataAmount && dataUnit) {
          const bundleData = parseFloat(bundle.data.match(/[\d.]+/)?.[0] || "0");
          const bundleUnit = bundle.data.match(/[MG]B/)?.[0] || "";
          const bundleMB = bundleUnit === "GB" ? bundleData * 1000 : bundleData;
          const searchMB = dataUnit === "GB" ? dataAmount * 1000 : dataAmount;
          isMatch = isMatch && Math.abs(bundleMB - searchMB) <= searchMB * 0.2;
        }
        if (isMatch && validityDays && validityUnit) {
          const bundleDaysMatch = bundle.validity.match(/\d+/);
          const bundleDays = bundleDaysMatch ? parseInt(bundleDaysMatch[0], 10) : 0;
          const validityLower = bundle.validity.toLowerCase();
          if (validityUnit.includes("day")) {
            if (validityDays <= 3) {
              isMatch = isMatch && bundle.category === "Daily Plans";
            } else if (validityDays <= 14) {
              isMatch = isMatch && bundle.category === "Weekly Plans";
            } else {
              isMatch = isMatch && bundle.category === "Monthly Plans";
            }
            isMatch = isMatch && Math.abs(bundleDays - validityDays) <= 0.2 * validityDays;
          } else if (validityUnit.includes("week")) {
            const searchDays = validityDays * 7;
            isMatch = isMatch && bundle.category === "Weekly Plans";
            isMatch = isMatch && Math.abs(bundleDays - searchDays) <= 0.2 * searchDays;
          } else if (validityUnit.includes("month")) {
            const searchDays = validityDays * 30;
            isMatch = isMatch && bundle.category === "Monthly Plans";
            isMatch = isMatch && (
              bundleDays === searchDays ||
              validityLower.includes(`${validityDays} month`) ||
              validityLower.includes(`${searchDays} days`)
            );
          }
        }
        if (planType) {
          isMatch = isMatch && bundle.planType.toLowerCase() === planType.toLowerCase();
        } else {
          isMatch = isMatch && bundle.planType.toLowerCase() === activePlanType.toLowerCase();
        }
        return isMatch;
      })
      .sort((a, b) => a.price - b.price);
  };

  const hotDeals: DataBundle[] = [
    { id: 228, data: "1GB", price: 580, validity: "30 Days", category: "Hot", description: "MTN Hot Deal - 1GB for 30 days", planType: "MTN" },
  { id: 246, data: "1.2GB", price: 500, validity: "30 Days", category: "Hot", description: "MTN Hot Deal - 1.2GB All Socials for 30 days", planType: "MTN" },
  { id: 235, data: "2GB", price: 1140, validity: "30 Days", category: "Hot", description: "MTN Hot Deal - 2GB for 30 days", planType: "MTN" },
  { id: 236, data: "3GB", price: 1550, validity: "7 Days", category: "Hot", description: "MTN Hot Deal - 3GB for 7 days", planType: "MTN" }, // Replaces Ujaydata ID 265
  { id: 213, data: "5GB", price: 2980, validity: "30 Days", category: "Hot", description: "MTN Hot Deal - 5GB for 30 days", planType: "MTN" }, // Replaces Ujaydata ID 272
  { id: 136, data: "10GB", price: 4480, validity: "30 Days", category: "Hot", description: "MTN Hot Deal - 10GB for 30 days", planType: "MTN" }, // Replaces Ujaydata ID 293
  { id: 216, data: "20GB", price: 5000, validity: "7 Days", category: "Hot", description: "MTN Hot Deal - 20GB for 7 days", planType: "MTN" }, // Replaces Ujaydata ID 339
  { id: 104, data: "6.75GB", price: 2940, validity: "30 Days", category: "Hot", description: "MTN Hot Deal - 6.75GB for 30 days", planType: "MTN" },
  { id: 146, data: "2GB", price: 1470, validity: "30 Days", category: "Hot", description: "Airtel Hot Deal - 2GB for 30 days", planType: "AIRTEL" },
  { id: 148, data: "4GB", price: 2450, validity: "30 Days", category: "Hot", description: "Airtel Hot Deal - 4GB for 30 days", planType: "AIRTEL" },
  { id: 169, data: "10GB", price: 3014, validity: "30 Days", category: "Hot", description: "Airtel Hot Deal - 10GB for 30 days", planType: "AIRTEL" },
  { id: 39, data: "1GB", price: 420, validity: "30 Days", category: "Hot", description: "Glo Hot Deal - 1GB for 30 days", planType: "GLO" },
  { id: 40, data: "2GB", price: 850, validity: "30 Days", category: "Hot", description: "Glo Hot Deal - 2GB for 30 days", planType: "GLO" },
  { id: 41, data: "3GB", price: 1200, validity: "30 Days", category: "Hot", description: "Glo Hot Deal - 3GB for 30 days", planType: "GLO" },
  { id: 42, data: "5GB", price: 2000, validity: "30 Days", category: "Hot", description: "Glo Hot Deal - 5GB for 30 days", planType: "GLO" },
  { id: 43, data: "10GB", price: 4000, validity: "30 Days", category: "Hot", description: "Glo Hot Deal - 10GB for 30 days", planType: "GLO" },
  { id: 70, data: "500MB", price: 145, validity: "30 Days", category: "Hot", description: "9mobile Hot Deal - 500MB for 30 days", planType: "9MOBILE" },
  { id: 71, data: "1GB", price: 280, validity: "30 Days", category: "Hot", description: "9mobile Hot Deal - 1GB for 30 days", planType: "9MOBILE" },
  { id: 72, data: "2GB", price: 560, validity: "30 Days", category: "Hot", description: "9mobile Hot Deal - 2GB for 30 days", planType: "9MOBILE" },
  { id: 73, data: "3GB", price: 840, validity: "30 Days", category: "Hot", description: "9mobile Hot Deal - 3GB for 30 days", planType: "9MOBILE" },
  { id: 75, data: "5GB", price: 1400, validity: "30 Days", category: "Hot", description: "9mobile Hot Deal - 5GB for 30 days", planType: "9MOBILE" },
  { id: 76, data: "10GB", price: 2800, validity: "30 Days", category: "Hot", description: "9mobile Hot Deal - 10GB for 30 days", planType: "9MOBILE" },
];

  const getCategoryBundles = useMemo(() => {
    if (!dataBundles || !Array.isArray(dataBundles)) {
      return [];
    }
    if (searchTerm) {
      const results = searchBundles(searchTerm);
      return results || [];
    }
    if (activeCategory === "Hot") {
      // Return hot deals filtered by activePlanType
      return hotDeals
        .filter((bundle) => bundle.planType.toLowerCase() === activePlanType.toLowerCase())
        .sort((a, b) => a.price - b.price);
    }
    let filtered = dataBundles;
    filtered = filtered.filter(
      (bundle) => bundle.planType.toLowerCase() === activePlanType.toLowerCase()
    );

    return filtered
      .filter((bundle) => bundle.category === activeCategory)
      .sort((a, b) => a.price - b.price);
  }, [dataBundles, activeCategory, activePlanType, searchTerm]);

  const BundleCard: React.FC<{ bundle: DataBundle }> = ({ bundle }) => {
    const slideAnimation = useRef(new Animated.Value(0)).current;
    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
        },
        onPanResponderMove: (_, gesture) => {
          if (gesture.dx > 0) {
            slideAnimation.setValue(gesture.dx);
          }
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx > 100) {
            setSelectedBundle(bundle);
            setIsPurchaseModalOpen(true);
          }
          Animated.spring(slideAnimation, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        },
      })
    ).current;

    const handlePurchase = () => {
      console.log("Selected bundle:", bundle);
      setSelectedBundle(bundle);
      setIsPurchaseModalOpen(true);
    };

    return (
      <Animated.View {...panResponder.panHandlers} style={{ transform: [{ translateX: slideAnimation }] }}>
        <View style={styles.bundleCard}>
          <View style={styles.bundleHeader}>
            <View style={styles.bundleInfo}>
              <Text style={styles.bundleTitle} numberOfLines={1} ellipsizeMode="tail">
                {bundle.data}
              </Text>
              <Text style={styles.bundleValidityText}>{bundle.validity}</Text>
            </View>
            <Text style={styles.bundlePrice}>₦{formatNumberWithCommas(bundle.price)}</Text>
          </View>
          {activeCategory !== "Hot" && (
            <Text style={styles.planTypeText}>{bundle.planType}</Text>
          )}
          {bundle.validity === "Not Specified" && (
            <Text style={styles.warningPreviewText}>Note: Plan duration unclear. Check with provider.</Text>
          )}
          <View style={styles.bundleActions}>
            <MotiView
              from={{ scale: 1 }}
              animate={{ scale: [1, 1.1, 1] }}
              transition={{
                type: "timing",
                duration: 2000,
                loop: true,
                repeatReverse: true,
              }}
            >
              <Pressable onPress={handlePurchase} style={styles.buyButton}>
                <Text style={styles.buyButtonText}>Purchase</Text>
              </Pressable>
            </MotiView>
            <View style={styles.swipeHint}>
              <Text style={styles.swipeText}>or swipe right</Text>
              <Ionicons name="arrow-forward" size={14} color="#999" />
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      nestedScrollEnabled={true}
      showsVerticalScrollIndicator={true}
      overScrollMode="never"
      bounces={true}
      alwaysBounceVertical={true}
    >
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00ff88" />
          <Text style={styles.activityIndicatorText}>Loading Plans...</Text>
        </View>
      ) : errorMessage ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Pressable onPress={retryLoad} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : getCategoryBundles.length === 0 ? (
        <Text style={styles.noPlansText}>
          {searchTerm ? "No matching plans found" : "No plans in this category"}
        </Text>
      ) : (
        <View style={styles.bundleListContainer}>
          <Text style={styles.categoryHint}>
            {searchTerm ? "Search Results:" : "Choose a plan:"}
          </Text>
          <View style={styles.bundleWrapper}>
            {getCategoryBundles.map((bundle) => (
              <BundleCard key={bundle.id} bundle={bundle} />
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: "#000",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 50,
    flexGrow: 1,
  },
  bundleListContainer: {
    paddingVertical: 8,
    flexGrow: 1,
  },
  bundleWrapper: {
    marginBottom: 16,
    flexGrow: 1,
  },
  bundleCard: {
    backgroundColor: "#111",
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  bundleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  bundleInfo: {
    flex: 1,
    marginRight: 8,
  },
  bundleTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    flexGrow: 1,
  },
  bundleValidityText: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  bundlePrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    textAlign: "right",
  },
  planTypeText: {
    fontSize: 14,
    color: "#999",
    marginBottom: 8,
    textAlign: "left",
  },
  warningPreviewText: {
    fontSize: 14,
    color: "#ff3333",
    marginBottom: 8,
    textAlign: "left",
  },
  bundleActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  buyButton: {
    backgroundColor: "#744925",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  buyButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  swipeHint: {
    alignItems: "center",
  },
  swipeText: {
    fontSize: 14,
    color: "#999",
    marginBottom: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  activityIndicatorText: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    marginTop: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#ff3333",
    textAlign: "center",
    marginTop: 20,
  },
  noPlansText: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    marginTop: 20,
  },
  retryButton: {
    backgroundColor: "#744925",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 20,
  },
  retryButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
  categoryHint: {
    fontSize: 16,
    color: "#fff",
    marginBottom: 8,
  },
});

export default DataBundleList;