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
    const planMatch = normalized.match(/(sme|gifting|corporate|standard)/i);

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

  const getCategoryBundles = useMemo(() => {
    if (!dataBundles || !Array.isArray(dataBundles)) {
      return [];
    }
    if (searchTerm) {
      const results = searchBundles(searchTerm);
      return results || [];
    }
    let filtered = dataBundles;
    filtered = filtered.filter(
      (bundle) => bundle.planType.toLowerCase() === activePlanType.toLowerCase()
    );

    if (activeCategory === "Hot") {
      return filtered
        .sort((a, b) => a.price - b.price)
        .slice(0, 5);
    }

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
          <Text style={styles.bundleDescription} numberOfLines={2} ellipsizeMode="tail">
            {bundle.description || "No description available"}
          </Text>
          {bundle.planType && <Text style={styles.planTypeText}>{bundle.planType}</Text>}
          {bundle.validity === "Not Specified" && (
            <Text style={styles.warningPreviewText}>Note: Plan duration unclear. Check with provider.</Text>
          )}
          <View style={styles.bundleActions}>
            <MotiView
              from={{ scale: 1 }}
              animate={{ scale: [1, 1.1, 1] }}
              transition={{
                type: "timing",
                duration: 2000, // Slow pulse duration
                loop: true, // Continuous looping
                repeatReverse: true, // Smoothly reverses the animation
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
  bundleDescription: {
    fontSize: 12,
    color: "#999",
    marginBottom: 8,
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