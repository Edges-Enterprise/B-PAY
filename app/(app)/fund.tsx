import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  SafeAreaView,
  Alert,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { MotiView } from "moti";
import { StatusBar } from "expo-status-bar";
import { supabase } from "@/config/supabase";

const { width, height } = Dimensions.get("window");

const FundScreen = () => {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError || !user) {
          throw new Error("User not authenticated");
        }
        if (!user.email) {
          throw new Error("User email not found");
        }
        if (!user.user_metadata?.username) {
          throw new Error("User username not found");
        }
        setUserEmail(user.email);
        setUserName(user.user_metadata.username);
        setUserId(user.id);
      } catch (error) {
        console.error("Error fetching user data:", error);
        Alert.alert("Error", "Failed to load user data. Please sign in again.");
        router.replace("/sign-in");
      }
    };

    fetchUserData();
  }, [router]);

  const handlePresetAmount = (value: number) => {
    const currentAmount = amount ? parseFloat(amount) : 0;
    const newAmount = currentAmount + value;
    setAmount(newAmount.toString());
    setError("");
  };

  const handleTopUp = () => {
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount)) {
      setError("Please enter a valid amount");
      return;
    }
    if (parsedAmount < 500) {
      setError("Minimum funding amount is ₦500");
      return;
    }
    if (!userEmail || !userName || !userId) {
      Alert.alert("Error", "User data is missing. Please sign in again.");
      return;
    }

    // Navigate to PaymentScreen with required data
    router.push({
      pathname: "/paystack",
      params: {
        amount,
        userEmail,
        userName,
        userId,
      },
    });
  };

  const presetAmounts = [500, 1000, 5000, 10000];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <View style={styles.inner}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back-outline" size={24} color="white" />
          </Pressable>
          <Text style={styles.title}>Fund Wallet 💰</Text>
          <Pressable>
            <Ionicons name="help-circle-outline" size={24} color="white" />
          </Pressable>
        </View>

        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 300 }}
          style={styles.balanceContainer}
        >
          <Text style={styles.balanceLabel}>Wallet Balance (NGN)</Text>
          <Text style={styles.balanceText}>
            ₦
            {amount
              ? parseFloat(amount).toLocaleString("en-NG", {
                  minimumFractionDigits: 2,
                })
              : "0.00"}
          </Text>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 300, delay: 100 }}
          style={styles.inputContainer}
        >
          <Text style={styles.label}>Amount to Fund (NGN)</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Min 500"
              placeholderTextColor="#666"
              keyboardType="numeric"
              value={amount}
              onChangeText={(text) => {
                setAmount(text.replace(/[^0-9.]/g, ""));
                setError("");
              }}
            />
            {amount ? (
              <Pressable
                onPress={() => setAmount("")}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={20} color="#666" />
              </Pressable>
            ) : null}
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 300, delay: 200 }}
          style={styles.presetContainer}
        >
          {presetAmounts.map((value) => (
            <Pressable
              key={value}
              onPress={() => handlePresetAmount(value)}
              style={({ pressed }) => [
                styles.presetButton,
                { transform: [{ scale: pressed ? 0.95 : 1 }] },
              ]}
            >
              <Text style={styles.presetText}>
                ₦{value.toLocaleString()}
              </Text>
            </Pressable>
          ))}
        </MotiView>

        <MotiView
          from={{ scale: 1 }}
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ loop: true, type: "timing", duration: 1500 }}
          style={styles.buttonContainer}
        >
          <Pressable
            onPress={handleTopUp}
            style={styles.fundButton}
          >
            <Text style={styles.fundButtonText}>Top Up Now</Text>
          </Pressable>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 300, delay: 300 }}
          style={styles.stepsContainer}
        >
          <Text style={styles.stepsTitle}>Payment Steps</Text>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>1</Text>
            <Text style={styles.stepText}>
              Enter amount and click "Top Up Now"
            </Text>
          </View>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>2</Text>
            <Text style={styles.stepText}>
              Choose bank transfer or select "Try another method" for card or USSD
            </Text>
          </View>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>3</Text>
            <Text style={styles.stepText}>
              Complete payment; wallet will be credited after fees
            </Text>
          </View>
        </MotiView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1A2526",
  },
  inner: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: "space-between",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 40, // Adjusted marginTop to 40 as requested
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  balanceContainer: {
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 14,
    color: "#888",
    marginBottom: 4,
  },
  balanceText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "500",
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2A3A3B",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#3A4A4B",
  },
  input: {
    flex: 1,
    color: "#fff",
    padding: 12,
    fontSize: 16,
  },
  clearButton: {
    padding: 8,
  },
  errorText: {
    color: "#ff4444",
    fontSize: 12,
    marginTop: 4,
  },
  presetContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  presetButton: {
    backgroundColor: "#2A3A3B",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 8,
    width: "22%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#3A4A4B",
  },
  presetText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  buttonContainer: {
    marginBottom: 16,
  },
  fundButton: {
    backgroundColor: "#00FF00",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  fundButtonText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 16,
    textTransform: "uppercase",
  },
  stepsContainer: {
    marginBottom: 20,
  },
  stepsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
  },
  step: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#00FF00",
    marginRight: 8,
    width: 24,
    textAlign: "center",
  },
  stepText: {
    fontSize: 14,
    color: "#888",
    flex: 1,
    lineHeight: 20,
  },
});

export default FundScreen;