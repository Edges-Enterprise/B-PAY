import React, { useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { NETWORK_IMAGES, DEFAULT_PROVIDER_IMAGE } from "@/constants/helper";

interface Provider {
  id: number;
  name: string;
  image: number;
  code?: string;
  imageKey?: string;
}

interface DataScreenHeaderProps {
  selectedProvider: Provider | null;
  setSelectedProvider: (provider: Provider | null) => void;
  networkId: number | null;
  setNetworkId: (id: number | null) => void;
  walletBalance: number | null;
  bundleCategories: string[];
  activeCategory: string;
  chooseCategory: (category: string) => void;
  planTypeOptions: string[];
  activePlanType: string;
  choosePlanType: (planType: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  resetSearch: () => void;
  isBalanceLoading: boolean; // Added prop
}

const DataScreenHeader: React.FC<DataScreenHeaderProps> = ({
  selectedProvider,
  walletBalance,
  bundleCategories,
  activeCategory,
  chooseCategory,
  planTypeOptions,
  activePlanType,
  choosePlanType,
  searchTerm,
  setSearchTerm,
  resetSearch,
  isBalanceLoading,
}) => {
  useEffect(() => {
    console.log("Plan Type Options:", planTypeOptions);
    // console.log("Active Plan Type:", activePlanType);
  }, [planTypeOptions, activePlanType]);

  const formatNumberWithCommas = (number: number): string => {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const navigateBack = () => {
    router.back();
  };

  // Determine the header title based on activePlanType
  const getHeaderTitle = () => {
    if (!selectedProvider) return "Data Plans";
    switch (activePlanType) {
      case "GIFTING":
      case "CORPORATE GIFTING":
        return `${selectedProvider.name} Corporate Gifting Plans`;
      case "SME":
        return `${selectedProvider.name} SME Plans`;
      default:
        return `${selectedProvider.name} Data Plans`;
    }
  };

  // Use API-provided capitalization for subheaders
  const getPlanTypeDisplayName = (planType: string) => {
    return planType; // Display exact API capitalization (e.g., "GIFTING", "CORPORATE GIFTING", "SME")
  };

  return (
    <View style={styles.fixedHeader}>
      <View style={styles.providerHeader}>
        <Pressable onPress={navigateBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </Pressable>
        {selectedProvider && (
          <>
            <Image
              source={selectedProvider.image}
              style={styles.providerLogo}
              resizeMode="contain"
              onError={(e) =>
                console.warn(
                  `Image load error for ${selectedProvider.name}:`,
                  e.nativeEvent.error,
                )
              }
            />
            <Text style={styles.providerName}>{getHeaderTitle()}</Text>
          </>
        )}
      </View>
      <View style={styles.walletBalanceContainer}>
        <Text style={styles.walletBalanceLabel}>Wallet Balance:</Text>
        <Text style={styles.walletBalanceValue}>
          {isBalanceLoading
            ? "Loading..."
            : `₦${formatNumberWithCommas(walletBalance ?? 0)}`}
        </Text>
      </View>
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color="#A1A1AA"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search plans (e.g., 1GB for 30 days)"
          placeholderTextColor="#A1A1AA"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        {searchTerm?.length > 0 && (
          <TouchableOpacity onPress={resetSearch} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color="#A1A1AA" />
          </TouchableOpacity>
        )}
      </View>
      {!searchTerm && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryBarContent}
        >
          {bundleCategories.map((category) => (
            <Pressable
              key={category}
              onPress={() => chooseCategory(category)}
              style={[
                styles.categoryButton,
                activeCategory === category ? styles.activeCategoryButton : {},
              ]}
            >
              <Text
                style={[
                  styles.categoryLabel,
                  activeCategory === category ? styles.activeCategoryLabel : {},
                ]}
              >
                {category === "Hot" ? "🔥 Hot" : category}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
      {!searchTerm && planTypeOptions.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.planTypeBarContent}
        >
          {planTypeOptions.map((planType) => (
            <Pressable
              key={planType}
              onPress={() => choosePlanType(planType)}
              style={[
                styles.planTypeButton,
                activePlanType === planType ? styles.activePlanTypeButton : {},
              ]}
            >
              <Text
                style={[
                  styles.planTypeLabel,
                  activePlanType === planType ? styles.activePlanTypeLabel : {},
                ]}
              >
                {getPlanTypeDisplayName(planType)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  fixedHeader: {
    backgroundColor: "black",
    paddingTop: 48,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  providerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  backButton: {
    marginRight: 12,
  },
  providerLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "white",
  },
  providerName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    marginLeft: 12,
  },
  walletBalanceContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1E1E1E",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  walletBalanceLabel: {
    fontSize: 16,
    color: "#A1A1AA",
  },
  walletBalanceValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E1E1E",
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "white",
    paddingVertical: 10,
  },
  clearButton: {
    padding: 4,
  },
  categoryBarContent: {
    flexDirection: "row",
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  planTypeBarContent: {
    flexDirection: "row",
    paddingHorizontal: 4,
    paddingBottom: 12,
  },
  categoryButton: {
    backgroundColor: "#1E1E1E",
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginHorizontal: 4,
    borderRadius: 6,
  },
  planTypeButton: {
    backgroundColor: "#1E1E1E",
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 4,
  },
  activeCategoryButton: {
    backgroundColor: "#744925",
  },
  activePlanTypeButton: {
    backgroundColor: "#744925",
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#A1A1AA",
  },
  planTypeLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#A1A1AA",
  },
  activeCategoryLabel: {
    color: "#FFFFFF",
  },
  activePlanTypeLabel: {
    color: "#FFFFFF",
  },
});

export default DataScreenHeader;
