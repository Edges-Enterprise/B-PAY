import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  Animated,
  PanResponder,
  StyleSheet,
  Alert,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { MotiView } from "moti";
import { supabase } from "@/config/supabase";
import { NETWORK_IMAGES, DEFAULT_PROVIDER_IMAGE } from "@/constants/helper";
import PurchaseModal from "@/components/homescreen/PurchaseModal";
import TransactionStatusModal from "@/components/homescreen/TransactionStatusModal";
import CreatePinModal from "@/components/homescreen/CreatePinModal";

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

interface SerializableProvider {
  id: number;
  name: string;
  code: string;
  imageKey: string;
}

interface Provider {
  id: number;
  name: string;
  image: any;
  code: string;
}

const BuyDataScreen: React.FC = () => {
  const { provider: providerParam } = useLocalSearchParams();
  let selectedProvider: Provider | null = null;

  try {
    if (providerParam) {
      const serializableProvider = JSON.parse(providerParam as string) as SerializableProvider;
      selectedProvider = {
        id: serializableProvider.id,
        name: serializableProvider.name,
        code: serializableProvider.code,
        image: serializableProvider.imageKey !== "DEFAULT"
          ? NETWORK_IMAGES[serializableProvider.imageKey as keyof typeof NETWORK_IMAGES]
          : DEFAULT_PROVIDER_IMAGE,
      };
    }
  } catch (error) {
    console.error("Error parsing providerParam:", error);
    Alert.alert("Error", "Invalid provider data");
    router.back();
    return null;
  }

  const [expandedCategory, setExpandedCategory] = useState<string>("Daily Plans");
  const [selectedPlanType, setSelectedPlanType] = useState<string>("Gifting");
  const [lastPurchasedNumber, setLastPurchasedNumber] = useState<string>("08012345678");
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [transactionModalVisible, setTransactionModalVisible] = useState<boolean>(false);
  const [createPinModalVisible, setCreatePinModalVisible] = useState<boolean>(false);
  const [selectedBundle, setSelectedBundle] = useState<DataBundle | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [transactionPin, setTransactionPin] = useState<string>("");
  const [networkProvider, setNetworkProvider] = useState<string>("");
  const [transactionStatus, setTransactionStatus] = useState<"processing" | "success" | "failed">("processing");
  const [showTransactionPin, setShowTransactionPin] = useState<boolean>(false);
  const [hasTransactionPin, setHasTransactionPin] = useState<boolean>(false); // Default to false
  const [newPin, setNewPin] = useState<string>("");
  const [confirmPin, setConfirmPin] = useState<string>("");
  const [showNewPin, setShowNewPin] = useState<boolean>(false);
  const [showConfirmPin, setShowConfirmPin] = useState<boolean>(false);
  const [lastPurchasedBundle, setLastPurchasedBundle] = useState<DataBundle | null>(null);
  const [lastPurchaseTime, setLastPurchaseTime] = useState<string | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [userEmail, setUserEmail] = useState<string>("");
  const [bundles, setBundles] = useState<DataBundle[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [referenceId, setReferenceId] = useState<string>("");
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Check if user has a transaction PIN
  const checkTransactionPin = async (email: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('transaction_pin')
        .eq('email', email)
        .single();

      console.log('Check PIN Result:', { email, data, error });

      if (error) {
        if (error.code === 'PGRST116') {
          // No profile exists
          setHasTransactionPin(false);
          return false;
        }
        throw error;
      }

      setHasTransactionPin(!!data?.transaction_pin);
      return !!data?.transaction_pin;
    } catch (error) {
      console.error('Error checking transaction PIN:', error);
      Alert.alert('Error', 'Failed to verify profile. Please try again.');
      return false;
    }
  };

  // Generate referenceId
  const generateReferenceId = async () => {
    try {
      console.log("Generating referenceId");
      const { data: { user }, error } = await supabase.auth.getUser();
      console.log("Supabase auth response:", { user, error });
      if (error || !user || !user.id) {
        throw new Error("User not authenticated or UUID missing");
      }
      const newReferenceId = `Edges_Network_${user.id}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      console.log("Reference ID generated:", newReferenceId);
      return newReferenceId;
    } catch (error) {
      console.error("Error generating referenceId:", error);
      Alert.alert("Error", "Failed to generate transaction reference");
      throw error;
    }
  };

  // Format number with commas
  const formatNumberWithCommas = (number: number): string => {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  // Parse search query to extract data amount, validity, and plan type
  const parseSearchQuery = (query: string) => {
    const normalizedQuery = query.toLowerCase().trim();
    const dataMatch = normalizedQuery.match(/(\d*\.?\d*)\s*(gb|mb)/i);
    const validityMatch = normalizedQuery.match(/(\d+)\s*(day|days|month|months|week|weeks)/i);
    const planTypeMatch = normalizedQuery.match(/(sme|gifting|corporate)/i);

    return {
      dataAmount: dataMatch ? parseFloat(dataMatch[1]) : null,
      dataUnit: dataMatch ? dataMatch[2].toUpperCase() : null,
      validityDays: validityMatch ? parseInt(validityMatch[1], 10) : null,
      validityUnit: validityMatch ? validityMatch[2].toLowerCase() : null,
      planType: planTypeMatch ? planTypeMatch[1].toLowerCase() : null,
    };
  };

  // Filter bundles based on search query
  const filterBundlesBySearch = (query: string) => {
    if (!query) return null;

    const { dataAmount, dataUnit, validityDays, validityUnit, planType } = parseSearchQuery(query);
    return bundles
      .filter((bundle) => {
        let matches = true;

        if (dataAmount && dataUnit) {
          const bundleDataValue = parseFloat(bundle.data.match(/[\d.]+/)?.[0] || "0");
          const bundleUnit = bundle.data.match(/[MG]B/)?.[0] || "";
          const bundleDataInMB = bundleUnit === "GB" ? bundleDataValue * 1000 : bundleDataValue;
          const searchDataInMB = dataUnit === "GB" ? dataAmount * 1000 : dataAmount;
          matches = matches && Math.abs(bundleDataInMB - searchDataInMB) <= searchDataInMB * 0.2;
        }

        if (validityDays && validityUnit) {
          const bundleDaysMatch = bundle.validity.match(/\d+/);
          const bundleDays = bundleDaysMatch ? parseInt(bundleDaysMatch[0], 10) : 0;
          const bundleValidityLower = bundle.validity.toLowerCase();

          if (validityUnit.includes("day")) {
            if (validityDays <= 3) {
              matches = matches && bundle.category === "Daily Plans";
            } else if (validityDays <= 14) {
              matches = matches && bundle.category === "Weekly Plans";
            } else {
              matches = matches && bundle.category === "Monthly Plans";
            }
            matches = matches && Math.abs(bundleDays - validityDays) <= validityDays * 0.2;
          } else if (validityUnit.includes("week")) {
            const searchDays = validityDays * 7;
            matches = matches && bundle.category === "Weekly Plans";
            matches = matches && Math.abs(bundleDays - searchDays) <= searchDays * 0.2;
          } else if (validityUnit.includes("month")) {
            const searchDays = validityDays * 30;
            matches = matches && bundle.category === "Monthly Plans";
            matches = matches && (
              bundleDays === searchDays ||
              bundleValidityLower.includes(`${validityDays} month`) ||
              bundleValidityLower.includes(`${searchDays} days`)
            );
          }
        }

        if (planType) {
          matches = matches && bundle.planType.toLowerCase() === planType;
        } else {
          matches = matches && bundle.planType.toLowerCase() === selectedPlanType.toLowerCase();
        }

        return matches;
      })
      .sort((a, b) => a.price - b.price);
  };

  // Get available plan types for the current expandedCategory
  const availablePlanTypes = useMemo(() => {
    if (searchQuery) {
      const searchResults = filterBundlesBySearch(searchQuery);
      if (searchResults) {
        return Array.from(new Set(searchResults.map((bundle) => bundle.planType))).sort();
      }
      return ["SME", "Gifting", "Corporate"];
    }

    if (!bundles || !Array.isArray(bundles)) {
      return [];
    }

    if (expandedCategory === "Hot" && lastPurchasedBundle) {
      const hotBundles = bundles.filter((bundle) => {
        try {
          const isSamePlanType = bundle.planType === lastPurchasedBundle.planType;
          const isSameCategory = bundle.category === lastPurchasedBundle.category;
          const lastDataValue = parseFloat(lastPurchasedBundle.data.match(/[\d.]+/)?.[0] || "0");
          const lastUnit = lastPurchasedBundle.data.match(/[MG]B/)?.[0] || "";
          const lastDataInMB = lastUnit === "GB" ? lastDataValue * 1000 : lastDataValue;
          const bundleDataValue = parseFloat(bundle.data.match(/[\d.]+/)?.[0] || "0");
          const bundleUnit = bundle.data.match(/[MG]B/)?.[0] || "";
          const bundleDataInMB = bundleUnit === "GB" ? bundleDataValue * 1000 : bundleDataValue;
          const isSimilarDataAmount = bundleDataInMB >= lastDataInMB * 0.5 && bundleDataInMB <= lastDataInMB * 1.5;
          return isSamePlanType && isSameCategory && isSimilarDataAmount;
        } catch (error) {
          console.error("Error processing bundle:", bundle, error);
          return false;
        }
      });
      return Array.from(new Set(hotBundles.map((bundle) => bundle.planType))).sort();
    }

    return Array.from(
      new Set(bundles.filter((bundle) => bundle.category === expandedCategory).map((bundle) => bundle.planType))
    ).sort();
  }, [bundles, expandedCategory, searchQuery, lastPurchasedBundle]);

  // Fetch user data, wallet balance, provider data plans, last purchased bundle, and check PIN
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedProvider) {
        setError("No provider selected");
        setLoading(false);
        router.back();
        return;
      }

      try {
        // Fetch user and wallet balance
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user || !user.email) {
          throw new Error("User not authenticated or email missing");
        }

        setUserEmail(user.email);

        // Check if user has a transaction PIN
        await checkTransactionPin(user.email);

        const { data: wallet, error: walletError } = await supabase
          .from("wallets")
          .select("balance")
          .eq("user_email", user.email)
          .single();

        if (walletError && walletError.code !== "PGRST116") {
          throw walletError;
        }

        const newBalance = wallet?.balance || 0;
        console.log('Fetched Wallet Balance:', { balance: newBalance, userEmail: user.email });
        setBalance(newBalance);

        // Set up real-time subscription for wallet balance
        const subscription = supabase
          .channel(`wallet-changes:${user.email}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'wallets',
              filter: `user_email=eq.${user.email}`,
            },
            (payload) => {
              console.log('Real-time Wallet Balance Update:', payload);
              setBalance(payload.new.balance);
            }
          )
          .subscribe();

        // Fetch last purchased bundle for the phone number
        const { data: transactions, error: txError } = await supabase
          .from("transactions")
          .select("metadata, created_at")
          .eq("user_email", user.email)
          .eq("status", "success")
          .eq("metadata->>phone_number", lastPurchasedNumber)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (txError && txError.code !== "PGRST116") {
          console.warn("No previous transactions found or error:", txError);
        }

        if (transactions?.metadata) {
          const { purchase, validity } = transactions.metadata;
          const match = purchase.match(/(.+?) on/);
          const data = match ? match[1].trim() : purchase;
          setLastPurchasedBundle({
            id: 0,
            data,
            price: 0,
            validity,
            category: "",
            variation_code: "",
            planType: "",
          });
          setLastPurchaseTime(transactions.created_at);
        }

        // Fetch data plans from ebenkdata.com API
        const response = await fetch("https://ebenkdata.com/api/network/", {
          headers: {
            Authorization: "Token de883370902cf73e68ed63f566dbf38a38719f03",
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch data plans: ${response.status}`);
        }

        const data = await response.json();
        const providerKey = `${selectedProvider.name}_PLAN`;
        const plans = data[providerKey];

        if (!Array.isArray(plans) || plans.length === 0) {
          throw new Error(`No plans found for ${selectedProvider.name}`);
        }

        const fetchedBundles: DataBundle[] = plans.map((plan: any) => {
          const dataAmount = plan.plan || "Unknown";
          let validity = plan.month_validate || "Not Specified";
          let category = "";

          if (
            validity.toLowerCase().includes("saturday") ||
            validity.toLowerCase().includes("sunday") ||
            plan.plan.toLowerCase().includes("weekend")
          ) {
            category = "Weekend Plans";
            validity = "Weekend";
          } else if (
            validity.toLowerCase().includes("night") ||
            plan.plan.toLowerCase().includes("night")
          ) {
            category = "Night Plans";
            validity = "11 PM - 5 AM";
          } else if (plan.plan.toLowerCase().includes("unlimited")) {
            category = "Unlimited Plans";
          } else {
            const daysMatch = validity.match(/\d+/);
            const days = daysMatch ? parseInt(daysMatch[0], 10) : 0;
            if (
              validity.toLowerCase().includes("month") ||
              validity.toLowerCase().includes("months") ||
              validity.toLowerCase().includes("30 days") ||
              validity.toLowerCase().includes("30days") ||
              days >= 30
            ) {
              category = "Monthly Plans";
            } else if (
              ["24 hrs", "48 hrs", "72 hrs"].includes(validity) ||
              days <= 3
            ) {
              category = "Daily Plans";
            } else if (days >= 5 && days <= 14) {
              category = "Weekly Plans";
            } else {
              category = "Monthly Plans";
            }
          }

          const planType = plan.plan_type || "Standard";

          return {
            id: plan.id,
            data: dataAmount,
            price: parseFloat(plan.plan_amount) + 50,
            validity,
            category,
            description: plan.plan,
            variation_code: plan.dataplan_id,
            planType,
          };
        });

        setBundles(fetchedBundles);

        const uniqueCategories = Array.from(new Set(fetchedBundles.map((bundle) => bundle.category)));
        const categoryOrder = ["Daily Plans", "Weekly Plans", "Monthly Plans", "Weekend Plans", "Night Plans", "Unlimited Plans"];
        uniqueCategories.sort((a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b));

        let finalCategories = uniqueCategories;
        if (lastPurchasedBundle && lastPurchaseTime) {
          const purchaseDate = new Date(lastPurchaseTime);
          const currentTime = new Date();
          const hoursDiff = (currentTime.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60);
          const dataValue = parseFloat(lastPurchasedBundle.data.match(/[\d.]+/)?.[0] || "0");
          const unit = lastPurchasedBundle.data.match(/[MG]B/)?.[0] || "";
          const dataInGB = unit === "GB" ? dataValue : dataValue / 1000;

          if (dataInGB >= 5 && hoursDiff <= 6) {
            finalCategories = ["Hot", ...uniqueCategories];
          }
        }

        setCategories(finalCategories);

        return () => {
          supabase.removeChannel(subscription);
        };
      } catch (error: any) {
        console.error("Error fetching data:", error);
        setError(`Failed to load ${selectedProvider?.name || "provider"} data plans or wallet balance.`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedProvider, lastPurchasedNumber]);

  const getProviderFromPhone = (phone: string): string => {
    const prefix = phone.slice(0, 4);
    const mtn = ["0803", "0806", "0703", "0706", "0813", "0816", "0810", "0814", "0903", "0906", "0913", "0916"];
    const glo = ["0805", "0807", "0705", "0815", "0811", "0905", "0915"];
    const airtel = ["0802", "0808", "0708", "0812", "0701", "0902", "0907", "0901", "0912"];
    const nineMobile = ["0809", "0817", "0818", "0909", "0908"];

    if (mtn.includes(prefix)) return "MTN";
    if (glo.includes(prefix)) return "GLO";
    if (airtel.includes(prefix)) return "AIRTEL";
    if (nineMobile.includes(prefix)) return "9MOBILE";
    return "";
  };

  useEffect(() => {
    if (phoneNumber.length === 11 && selectedProvider) {
      const detectedProvider = getProviderFromPhone(phoneNumber);
      setNetworkProvider(detectedProvider === selectedProvider.name ? detectedProvider : "");
    } else {
      setNetworkProvider("");
    }
  }, [phoneNumber, selectedProvider]);

  const handleContinue = async () => {
    if (!selectedBundle || !selectedProvider) {
      Alert.alert("Error", "No bundle or provider selected");
      return;
    }

    if (phoneNumber.length !== 11 || !/^\d{11}$/.test(phoneNumber)) {
      Alert.alert("Error", "Please enter a valid 11-digit phone number");
      return;
    }

    if (!hasTransactionPin) {
      Alert.alert("Error", "Please create a transaction PIN first");
      setCreatePinModalVisible(true);
      return;
    }

    if (!transactionPin || transactionPin.length < 4 || transactionPin.length > 6) {
      Alert.alert("Error", "Please enter a transaction PIN between 4 and 6 digits");
      return;
    }

    if (!referenceId) {
      Alert.alert("Error", "Transaction reference not generated");
      return;
    }

    if (!userEmail) {
      Alert.alert("Error", "User not authenticated");
      return;
    }

    try {
      // Verify transaction PIN
      const { data: userData, error: pinError } = await supabase
        .from('profiles')
        .select('transaction_pin')
        .eq('email', userEmail)
        .single();

      console.log('PIN Verification Result:', { userEmail, transactionPin, userData, pinError });

      if (pinError) {
        console.error('PIN verification error:', pinError);
        if (pinError.code === 'PGRST116') {
          Alert.alert('Error', 'No profile found. Please create a transaction PIN.');
          setCreatePinModalVisible(true);
        } else if (pinError.code === '42703') {
          Alert.alert('Error', 'Profile table is missing transaction_pin column. Please contact support.');
        } else if (pinError.code === '42P01') {
          Alert.alert('Error', 'Profile table not found. Please contact support.');
        } else {
          Alert.alert('Error', 'Failed to verify PIN.');
        }
        return;
      }

      if (!userData) {
        console.log('No profile found for email:', userEmail);
        Alert.alert('Error', 'Profile not found. Please create a transaction PIN.');
        setCreatePinModalVisible(true);
        return;
      }

      if (!userData.transaction_pin) {
        console.log('No transaction PIN set for user:', { userEmail, userData });
        Alert.alert('Error', 'No PIN set. Please create a transaction PIN.');
        setCreatePinModalVisible(true);
        return;
      }

      if (userData.transaction_pin !== transactionPin) {
        console.log('PIN mismatch:', { storedPin: userData.transaction_pin, providedPin: transactionPin });
        Alert.alert('Error', 'Invalid PIN');
        return;
      }

      // Navigate to confirmation page
      console.log("Navigating to confirmation with referenceId:", referenceId, "and balance:", balance);
      router.push({
        pathname: "/Confirmation",
        params: {
          bundle: JSON.stringify(selectedBundle),
          provider: JSON.stringify({
            id: selectedProvider.id,
            name: selectedProvider.name,
            code: selectedProvider.code,
            image: selectedProvider.imageKey || "DEFAULT",
          }),
          phoneNumber,
          transactionPin,
          userEmail,
          referenceId,
          balance: balance.toString(),
        },
      });
      setModalVisible(false);
    } catch (error) {
      console.error('Error verifying PIN:', error);
      Alert.alert('Error', 'Failed to verify PIN. Please try again.');
    }
  };

  const closeTransactionModal = () => {
    setTransactionModalVisible(false);
    setPhoneNumber("");
    setTransactionPin("");
    setSelectedBundle(null);
    setNetworkProvider("");
    setTransactionStatus("processing");
    setReferenceId("");
  };

  const closePurchaseModal = () => {
    setModalVisible(false);
    setPhoneNumber("");
    setTransactionPin("");
    setSelectedBundle(null);
    setNetworkProvider("");
    setReferenceId("");
  };

  const closeCreatePinModal = () => {
    setCreatePinModalVisible(false);
    setNewPin("");
    setConfirmPin("");
  };

  const handleCreatePin = async () => {
    if (newPin.length < 4 || newPin.length > 6 || confirmPin.length < 4 || confirmPin.length > 6) {
      Alert.alert("Error", "PIN must be between 4 and 6 digits.");
      return;
    }

    if (newPin !== confirmPin) {
      Alert.alert("Error", "PINs do not match.");
      return;
    }

    if (!userEmail) {
      Alert.alert("Error", "User not authenticated");
      return;
    }

    try {
      // Check if profile exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', userEmail)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error checking profile:', fetchError);
        throw fetchError;
      }

      if (existingProfile) {
        // Update existing profile with new PIN
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ transaction_pin: newPin })
          .eq('email', userEmail);

        if (updateError) {
          console.error('Error updating PIN:', updateError);
          throw updateError;
        }
      } else {
        // Create new profile with PIN
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({ email: userEmail, transaction_pin: newPin });

        if (insertError) {
          console.error('Error creating profile:', insertError);
          throw insertError;
        }
      }

      console.log('PIN saved successfully for:', userEmail);
      setTransactionPin(newPin);
      setHasTransactionPin(true);
      setCreatePinModalVisible(false);
      setNewPin("");
      setConfirmPin("");
      Alert.alert('Success', 'Transaction PIN created successfully.');
    } catch (error) {
      console.error('Error saving PIN:', error);
      Alert.alert('Error', 'Failed to create transaction PIN. Please try again.');
    }
  };

  const goBackToProviders = () => {
    router.back();
  };

  const selectCategory = (category: string) => {
    setExpandedCategory(category);
    const newAvailablePlanTypes = bundles
      .filter((bundle) => bundle.category === category)
      .map((bundle) => bundle.planType);
    const uniquePlanTypes = Array.from(new Set(newAvailablePlanTypes)).sort();
    if (uniquePlanTypes.length > 0 && !uniquePlanTypes.includes(selectedPlanType)) {
      setSelectedPlanType(uniquePlanTypes[0]);
    }
    Animated.timing(scaleAnim, {
      toValue: 1.05,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  };

  const selectPlanType = (planType: string) => {
    setSelectedPlanType(planType);
  };

  const clearSearch = () => {
    setSearchQuery("");
  };

  const openPurchaseModal = async (bundle: DataBundle) => {
    try {
      const newReferenceId = await generateReferenceId();
      setReferenceId(newReferenceId);
      setSelectedBundle(bundle);
      setModalVisible(true);
    } catch (error) {
      setModalVisible(false);
    }
  };

  const BundleCard: React.FC<{ bundle: DataBundle }> = ({ bundle }) => {
    const slideAnim = useRef(new Animated.Value(0)).current;

    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dx > 0) {
            slideAnim.setValue(gestureState.dx);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx > 100) {
            openPurchaseModal(bundle);
          }
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        },
      }),
    ).current;

    return (
      <Animated.View
        key={bundle.id}
        {...panResponder.panHandlers}
        style={[{ transform: [{ translateX: slideAnim }] }]}
      >
        <View style={styles.bundleCard}>
          <View style={styles.bundleHeader}>
            <View style={styles.bundleInfo}>
              <Text
                style={styles.bundleTitle}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {bundle.data}
              </Text>
              <Text style={styles.bundleValidity}>{bundle.validity}</Text>
            </View>
            <Text style={styles.bundlePrice}>
              ₦{formatNumberWithCommas(bundle.price)}
            </Text>
          </View>
          <Text
            style={styles.bundleDescription}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {bundle.description}
          </Text>
          {bundle.planType && (
            <Text style={styles.planTypeText}>{bundle.planType}</Text>
          )}
          {bundle.validity === "Not Specified" && (
            <Text style={styles.warningText}>
              Note: Plan duration not specified. Confirm with provider.
            </Text>
          )}
          <View style={styles.bundleActions}>
            <MotiView
              from={{ scale: 1 }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ type: "timing", duration: 1500 }}
            >
              <Pressable
                onPress={() => openPurchaseModal(bundle)}
                style={styles.buyButton}
              >
                <Text style={styles.buyButtonText}>Click to Buy</Text>
              </Pressable>
            </MotiView>
            <View style={styles.swipeHint}>
              <Text style={styles.swipeText}>or swipe right</Text>
              <Ionicons name="arrow-forward" size={14} color="#ccc" />
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

  const getBundlesForCategory = (category: string) => {
    if (!bundles || !Array.isArray(bundles)) {
      return [];
    }

    if (searchQuery) {
      const searchResults = filterBundlesBySearch(searchQuery);
      return searchResults || [];
    }

    let filteredBundles = bundles;

    filteredBundles = filteredBundles.filter(
      (bundle) => bundle.planType.toLowerCase() === selectedPlanType.toLowerCase(),
    );

    if (category === "Hot" && lastPurchasedBundle) {
      return filteredBundles
        .filter((bundle) => {
          try {
            const isSamePlanType = bundle.planType === lastPurchasedBundle.planType;
            const isSameCategory = bundle.category === lastPurchasedBundle.category;
            const lastDataValue = parseFloat(lastPurchasedBundle.data.match(/[\d.]+/)?.[0] || "0");
            const lastUnit = lastPurchasedBundle.data.match(/[MG]B/)?.[0] || "";
            const lastDataInMB = lastUnit === "GB" ? lastDataValue * 1000 : lastDataValue;
            const bundleDataValue = parseFloat(bundle.data.match(/[\d.]+/)?.[0] || "0");
            const bundleUnit = bundle.data.match(/[MG]B/)?.[0] || "";
            const bundleDataInMB = bundleUnit === "GB" ? bundleDataValue * 1000 : bundleDataValue;
            const isSimilarDataAmount = bundleDataInMB >= lastDataInMB * 0.5 && bundleDataInMB <= lastDataInMB * 1.5;
            return isSamePlanType && isSameCategory && isSimilarDataAmount;
          } catch (error) {
            console.error("Error processing bundle:", bundle, error);
            return false;
          }
        })
        .sort((a, b) => a.price - b.price)
        .slice(0, 5);
    }

    return filteredBundles
      .filter((bundle) => bundle.category === category)
      .sort((a, b) => a.price - b.price);
  };

  if (!selectedProvider) {
    return null;
  }

  const bundlesInCategory = getBundlesForCategory(expandedCategory);

  return (
    <View style={styles.container}>
      <View style={styles.fixedHeader}>
        <View style={styles.providerHeader}>
          <Pressable onPress={goBackToProviders} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>
          <Image
            source={selectedProvider.image}
            style={styles.providerLogo}
            resizeMode="contain"
          />
          <Text style={styles.providerName}>
            {selectedProvider.name} Data Bundles
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
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#A1A1AA" />
            </TouchableOpacity>
          )}
        </View>
        {!searchQuery && (
          <ScrollView
            horizontal
            style={styles.categoryBar}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryBarContent}
          >
            {categories.map((category) => (
              <Pressable
                key={category}
                onPress={() => selectCategory(category)}
                style={[
                  styles.categoryButton,
                  expandedCategory === category ? styles.selectedCategoryButton : {},
                ]}
              >
                <Text
                  style={[
                    styles.categoryButtonText,
                    expandedCategory === category ? styles.selectedCategoryButtonText : {},
                  ]}
                >
                  {category === "Hot" ? "🔥 Hot" : category}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
        {!searchQuery && availablePlanTypes.length > 0 && (
          <ScrollView
            horizontal
            style={styles.planTypeBar}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.planTypeBarContent}
          >
            {availablePlanTypes.map((planType) => (
              <Pressable
                key={planType}
                onPress={() => selectPlanType(planType)}
                style={[
                  styles.planTypeButton,
                  selectedPlanType === planType ? styles.selectedPlanTypeButton : {},
                ]}
              >
                <Text
                  style={[
                    styles.planTypeButtonText,
                    selectedPlanType === planType ? styles.selectedPlanTypeButtonText : {},
                  ]}
                >
                  {planType}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        nestedScrollEnabled={true}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        removeClippedSubviews={true}
      >
        {loading ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : categories.length === 0 && !searchQuery ? (
          <Text style={styles.loadingText}>No categories available</Text>
        ) : bundlesInCategory.length === 0 ? (
          <Text style={styles.loadingText}>
            {searchQuery ? "No plans match your search" : "No bundles available for this category"}
          </Text>
        ) : (
          <View style={styles.bundleListContainer}>
            <Text style={styles.categoryHint}>
              {searchQuery ? "Search Results:" : "Select a plan:"}
            </Text>
            <View style={styles.scrollViewWrapper}>
              {bundlesInCategory.map((bundle) => (
                <BundleCard key={bundle.id} bundle={bundle} />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
      <View style={{ zIndex: 1000 }}>
        <PurchaseModal
          visible={modalVisible}
          onClose={closePurchaseModal}
          selectedPlan={selectedBundle?.data || ""}
          phoneNumber={phoneNumber}
          setPhoneNumber={setPhoneNumber}
          transactionPin={transactionPin}
          setTransactionPin={setTransactionPin}
          networkProvider={networkProvider}
          hasTransactionPin={hasTransactionPin}
          showTransactionPin={showTransactionPin}
          setShowTransactionPin={setShowTransactionPin}
          onCreatePin={() => setCreatePinModalVisible(true)}
          onContinue={handleContinue}
        />
        <TransactionStatusModal
          visible={transactionModalVisible}
          onClose={closeTransactionModal}
          transactionStatus={transactionStatus}
          selectedPlan={selectedBundle}
          phoneNumber={phoneNumber}
          networkProvider={networkProvider}
        />
        <CreatePinModal
          visible={createPinModalVisible}
          onClose={closeCreatePinModal}
          newPin={newPin}
          setNewPin={setNewPin}
          confirmPin={confirmPin}
          setConfirmPin={setConfirmPin}
          showNewPin={showNewPin}
          setShowNewPin={setShowNewPin}
          showConfirmPin={showConfirmPin}
          setShowConfirmPin={setShowConfirmPin}
          onSave={handleCreatePin}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  fixedHeader: {
    backgroundColor: "black",
    paddingTop: 48,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  scrollView: {
    flex: 1,
    marginTop: 0,
  },
  scrollViewContent: {
    paddingHorizontal: 16,
    paddingBottom: 50,
    paddingTop: 8,
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E1E1E",
    borderRadius: 8,
    paddingHorizontal: 12,
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
  categoryBar: {
    marginBottom: 8,
  },
  planTypeBar: {
    marginBottom: 16,
    marginLeft: 40,
  },
  categoryBarContent: {
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  planTypeBarContent: {
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  categoryButton: {
    backgroundColor: "#1E1E1E",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginHorizontal: 4,
  },
  planTypeButton: {
    backgroundColor: "#1E1E1E",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginHorizontal: 4,
  },
  selectedCategoryButton: {
    backgroundColor: "#744925",
  },
  selectedPlanTypeButton: {
    backgroundColor: "#744925",
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#A1A1AA",
  },
  planTypeButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#A1A1AA",
  },
  selectedCategoryButtonText: {
    color: "white",
  },
  selectedPlanTypeButtonText: {
    color: "white",
  },
  categoryHint: {
    fontSize: 14,
    color: "#A1A1AA",
    marginBottom: 12,
  },
  bundleListContainer: {
    paddingVertical: 8,
  },
  scrollViewWrapper: {
    position: "relative",
    flex: 1,
  },
  bundleCard: {
    backgroundColor: "#2D2D2D",
    borderRadius: 8,
    padding: 8,
    marginRight: 12,
    marginBottom: 8,
  },
  bundleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  bundleInfo: {
    flex: 1,
    marginRight: 8,
  },
  bundleTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "white",
    flexShrink: 1,
  },
  bundleValidity: {
    fontSize: 10,
    color: "#A1A1AA",
    marginTop: 2,
  },
  bundlePrice: {
    fontSize: 14,
    fontWeight: "bold",
    color: "white",
    textAlign: "right",
  },
  bundleDescription: {
    fontSize: 10,
    color: "#A1A1AA",
    marginBottom: 6,
    flexWrap: "wrap",
  },
  planTypeText: {
    fontSize: 10,
    color: "#A1A1AA",
    marginBottom: 6,
    textAlign: "left",
  },
  warningText: {
    fontSize: 10,
    color: "#FF4444",
    marginBottom: 6,
    textAlign: "left",
  },
  bundleActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  buyButton: {
    backgroundColor: "#744925",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  buyButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "white",
  },
  swipeHint: {
    alignItems: "center",
  },
  swipeText: {
    fontSize: 10,
    color: "#A1A1AA",
    marginBottom: 4,
  },
});

export default BuyDataScreen;