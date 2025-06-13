import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Vibration,
  Alert,
  Switch,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  useAnimatedGestureHandler,
  runOnJS,
} from "react-native-reanimated";
import {
  GestureHandlerRootView,
  PanGestureHandler,
} from "react-native-gesture-handler";
import { useAuth, useSupabase } from "@/context/supabase-provider";
import { useFont } from "@/context/font-context";
import { useTheme } from "@/context/theme-context";
import { fonts } from "@/constants/fonts";
import { colors } from "@/constants/colors";
import { availableThemes, sections } from "@/constants/helper";
import ReusableModal from "@/components/ReusableModal";
import SwipeWrapper from "../../../components/SwipeWrapper";

const { width } = Dimensions.get("window");

export default function Settings() {
  const { deleteOwnAccount } = useSupabase();
  const { colorScheme, setCustomColorScheme } = useTheme();
  const { selectedFont, setSelectedFont } = useFont();
  const { user, profile, signOut } = useAuth();

  const fontOptions = Object.keys(fonts);
  const [fontModalVisible, setFontModalVisible] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [sectionOrder, setSectionOrder] = useState(sections);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Animation values
  const slideAnim = useSharedValue(width);
  const cardScale = useSharedValue(0.8);
  const cardOpacity = useSharedValue(0);
  const cardY = useSharedValue(100);

  // Handle navigation if user or profile is missing
  useEffect(() => {
    if (!user || !profile) {
      router.replace("/(app)/(auth)/sign-in");
    }
  }, [user, profile]);

  // Show logout after 5 seconds
  useEffect(() => {
    if (user && profile) {
      const timer = setTimeout(() => {
        setLogoutVisible(true);
        slideAnim.value = withTiming(0, { duration: 500 });
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [user, profile, slideAnim]);

  // Reset section order on mount
  useEffect(() => {
    setSectionOrder(sections);
  }, []);

  const handleSectionToggle = (sectionTitle: string) => {
    if (openSection === sectionTitle) {
      cardScale.value = withTiming(0.8, { duration: 300 });
      cardOpacity.value = withTiming(0, { duration: 300 });
      cardY.value = withTiming(100, { duration: 300 }, () => {
        runOnJS(setOpenSection)(null);
      });
    } else {
      setOpenSection(sectionTitle);
      cardScale.value = withSpring(1);
      cardOpacity.value = withTiming(1, { duration: 300 });
      cardY.value = withTiming(0, { duration: 300 });
    }
  };

  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx: { startY: number }) => {
      ctx.startY = 0;
    },
    onActive: (event, ctx: { startY: number }) => {
      ctx.startY = event.translationY;
    },
    onEnd: (event) => {
      runOnJS(Vibration.vibrate)(50);
      const draggedDistance = event.absoluteY;
      const fromIndex = draggingIndex;
      const toIndex = Math.min(
        Math.max(Math.round(draggedDistance / 80), 0),
        sectionOrder.length - 1
      );

      if (fromIndex !== null && toIndex !== fromIndex) {
        runOnJS(reorderSections)(fromIndex, toIndex);
      }

      runOnJS(setDraggingIndex)(null);
    },
  });

  const reorderSections = (from: number, to: number) => {
    const updatedOrder = [...sectionOrder];
    const [movedItem] = updatedOrder.splice(from, 1);
    updatedOrder.splice(to, 0, movedItem);
    setSectionOrder(updatedOrder);
  };

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }, { translateY: cardY.value }],
    opacity: cardOpacity.value,
  }));

  const logoutAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slideAnim.value }],
  }));

  const handleFontSelect = (fontKey: string) => {
    setSelectedFont(fonts[fontKey]);
    Alert.alert("Font Selected", `${fontKey} has been set as your font.`);
    setFontModalVisible(false);
  };

  const handleThemeSelect = (theme: string) => {
    setCustomColorScheme(theme);
    Alert.alert(
      "Theme Selected",
      `${theme.charAt(0).toUpperCase() + theme.slice(1)} has been set as your theme.`
    );
    setThemeModalVisible(false);
  };

  const toggleNotifications = () => {
    setNotificationsEnabled((prev) => {
      const newValue = !prev;
      Alert.alert(
        "Notifications",
        `Notifications have been ${newValue ? "enabled" : "disabled"}.`
      );
      return newValue;
    });
  };

  const handleItemPress = (section: string, item: string) => {
    if (item === "Fonts") {
      setFontModalVisible(true);
    } else if (item === "Themes") {
      setThemeModalVisible(true);
    } else if (item === "Notifications") {
      toggleNotifications();
    } else if (item === "Delete Account") {
      setDeleteModalVisible(true);
    } else {
      Alert.alert("Feature", `${item} feature will be implemented soon.`);
    }
  };

  const confirmDeleteAccount = async () => {
    try {
      await deleteOwnAccount();
      setDeleteModalVisible(false);
      router.replace("/(app)/welcome");
    } catch (error) {
      Alert.alert("Error", "Failed to delete your account.");
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/(app)/welcome");
        },
      },
    ]);
  };

  // Prevent swipe gestures during vertical scrolling
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { velocity } = event.nativeEvent;
    if (velocity && Math.abs(velocity.y) > 0.5) {
      // Disable horizontal swipe when scrolling vertically
      scrollViewRef.current?.setNativeProps({ scrollEnabled: true });
    } else {
      scrollViewRef.current?.setNativeProps({ scrollEnabled: true });
    }
  };

  return (
    <SwipeWrapper scrollViewRef={scrollViewRef}>
      <GestureHandlerRootView
        style={{ flex: 1, backgroundColor: colors[colorScheme]?.background }}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 36,
            paddingBottom: 120,
            backgroundColor: colors[colorScheme]?.background,
          }}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 12,
              marginBottom: 24,
            }}
          >
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons
                name="arrow-back"
                size={24}
                color={colors[colorScheme]?.foreground}
              />
            </TouchableOpacity>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "600",
                color: colors[colorScheme]?.foreground,
                fontFamily: selectedFont?.fontFamily || fonts.default.fontFamily,
              }}
            >
              Settings
            </Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Sections */}
          {sectionOrder.map((section, index) => (
            <PanGestureHandler
              key={section.title}
              onGestureEvent={gestureHandler}
              onHandlerStateChange={({ nativeEvent }) => {
                if (nativeEvent.state === 2) {
                  setDraggingIndex(index);
                }
              }}
              shouldCancelWhenOutside={true}
            >
              <Animated.View
                style={[
                  { marginBottom: 16 },
                  draggingIndex === index && {
                    opacity: 0.7,
                    transform: [{ scale: 1.05 }],
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.8,
                    shadowRadius: 8,
                    elevation: 5,
                  },
                ]}
              >
                <TouchableOpacity
                  onPress={() => handleSectionToggle(section.title)}
                  style={{
                    padding: 16,
                    borderRadius: 16,
                    backgroundColor: colors[colorScheme]?.card,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "500",
                      color: colors[colorScheme]?.foreground,
                      fontFamily: selectedFont?.fontFamily || fonts.default.fontFamily,
                    }}
                  >
                    {section.title}
                  </Text>
                </TouchableOpacity>

                {/* Glass Card */}
                {openSection === section.title && (
                  <Animated.View
                    style={[{ marginTop: 12 }, cardAnimatedStyle]}
                  >
                    <BlurView
                      intensity={100}
                      tint={colorScheme === "dark" ? "dark" : "light"}
                      style={{
                        borderRadius: 20,
                        padding: 20,
                        width: width * 0.9,
                        backgroundColor: colors[colorScheme]?.card,
                      }}
                    >
                      {section.title === "Account" && (
                        <View style={{ marginBottom: 16 }}>
                          <Text
                            style={{
                              fontSize: 14,
                              marginBottom: 4,
                              color: colors[colorScheme]?.foreground,
                              fontFamily: selectedFont?.fontFamily || fonts.default.fontFamily,
                            }}
                          >
                            Username: {profile?.username || "N/A"}
                          </Text>
                          <Text
                            style={{
                              fontSize: 14,
                              marginBottom: 4,
                              color: colors[colorScheme]?.foreground,
                              fontFamily: selectedFont?.fontFamily || fonts.default.fontFamily,
                            }}
                          >
                            Email: {profile?.email || "N/A"}
                          </Text>
                          <View style={{ height: 12 }} />
                        </View>
                      )}

                      {section.items.map((item, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={{
                            padding: 12,
                            borderRadius: 12,
                            marginBottom: 8,
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            backgroundColor: `${colors[colorScheme]?.card}99`,
                          }}
                          onPress={() => handleItemPress(section.title, item)}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              color: colors[colorScheme]?.foreground,
                              fontFamily: selectedFont?.fontFamily || fonts.default.fontFamily,
                            }}
                          >
                            {item}
                          </Text>

                          {item === "Notifications" && (
                            <Switch
                              value={notificationsEnabled}
                              onValueChange={toggleNotifications}
                              trackColor={{ false: "#767577", true: "#D7A77F" }}
                              thumbColor={notificationsEnabled ? "#E9C9AF" : "#f4f3f4"}
                            />
                          )}
                        </TouchableOpacity>
                      ))}
                    </BlurView>
                  </Animated.View>
                )}
              </Animated.View>
            </PanGestureHandler>
          ))}
        </ScrollView>

        {/* Logout */}
        {logoutVisible && (
          <Animated.View
            style={[{ paddingVertical: 10, paddingHorizontal: 14, width: "100%", marginBottom: 50 }, logoutAnimatedStyle]}
          >
            <TouchableOpacity
              style={{
                backgroundColor: colors[colorScheme]?.destructive,
                padding: 16,
                borderRadius: 16,
              }}
              onPress={handleLogout}
            >
              <Text
                style={{
                  textAlign: "center",
                  color: colors[colorScheme]?.destructiveForeground,
                  fontWeight: "600",
                  fontFamily: selectedFont?.fontFamily || fonts.default.fontFamily,
                }}
              >
                Log Out
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Font Selection Modal */}
        <ReusableModal
          visible={fontModalVisible}
          onClose={() => setFontModalVisible(false)}
          title="Select Font"
          colorScheme={colorScheme}
          selectedFont={selectedFont}
        >
          {fontOptions.map((fontKey) => (
            <TouchableOpacity
              key={fontKey}
              style={[
                { padding: 16, borderRadius: 12, marginBottom: 8 },
                selectedFont === fonts[fontKey] && {
                  borderWidth: 1,
                  borderColor: colors[colorScheme]?.border,
                  backgroundColor: colors[colorScheme]?.primary,
                },
                {
                  backgroundColor:
                    selectedFont !== fonts[fontKey]
                      ? `${colors[colorScheme]?.card}99`
                      : undefined,
                },
              ]}
              onPress={() => handleFontSelect(fontKey)}
            >
              <Text
                style={{
                  fontSize: 16,
                  textAlign: "center",
                  fontFamily: fonts[fontKey].fontFamily,
                  color:
                    selectedFont === fonts[fontKey]
                      ? colors[colorScheme]?.primaryForeground
                      : colors[colorScheme]?.foreground,
                }}
              >
                {fontKey}
              </Text>
            </TouchableOpacity>
          ))}
        </ReusableModal>

        {/* Theme Selection Modal */}
        <ReusableModal
          visible={themeModalVisible}
          onClose={() => setThemeModalVisible(false)}
          title="Select Theme"
          colorScheme={colorScheme}
          selectedFont={selectedFont}
        >
          {availableThemes.map((theme) => (
            <TouchableOpacity
              key={theme}
              style={[
                styles.themeOption,
                colorScheme === theme && styles.selectedOption,
                {
                  backgroundColor:
                    colorScheme === theme
                      ? colors[colorScheme]?.background
                      : `${colors[colorScheme]?.card}90`,
                },
              ]}
              onPress={() => handleThemeSelect(theme)}
            >
              <View
                style={[
                  styles.themeColorIndicator,
                  { backgroundColor: colors[colorScheme]?.indicator },
                ]}
              />
              <Text
                style={{
                  fontSize: 16,
                  fontFamily: selectedFont?.fontFamily || fonts.default.fontFamily,
                  color:
                    colorScheme === theme
                      ? "#fff"
                      : colors[colorScheme]?.foreground || "#fff",
                }}
              >
                {theme.charAt(0).toUpperCase() + theme.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ReusableModal>

        {/* Delete Account Modal */}
        <ReusableModal
          visible={deleteModalVisible}
          onClose={() => setDeleteModalVisible(false)}
          title="Delete Account"
          colorScheme={colorScheme}
          selectedFont={selectedFont}
        >
          <Text
            style={{
              fontSize: 16,
              color: colors[colorScheme]?.foreground,
              fontFamily: selectedFont?.fontFamily || fonts.default.fontFamily,
              marginBottom: 16,
              textAlign: "center",
            }}
          >
            Are you sure you want to delete your account? This action is irreversible.
          </Text>
          <TouchableOpacity
            style={{
              padding: 16,
              borderRadius: 12,
              backgroundColor: colors[colorScheme]?.destructive,
              marginBottom: 8,
            }}
            onPress={confirmDeleteAccount}
          >
            <Text
              style={{
                fontSize: 16,
                textAlign: "center",
                color: colors[colorScheme]?.destructiveForeground,
                fontFamily: selectedFont?.fontFamily || fonts.default.fontFamily,
              }}
            >
              Confirm Deletion
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              padding: 16,
              borderRadius: 12,
              backgroundColor: colors[colorScheme]?.card,
            }}
            onPress={() => setDeleteModalVisible(false)}
          >
            <Text
              style={{
                fontSize: 16,
                textAlign: "center",
                color: colors[colorScheme]?.foreground,
                fontFamily: selectedFont?.fontFamily || fonts.default.fontFamily,
              }}
            >
              Cancel
            </Text>
          </TouchableOpacity>
        </ReusableModal>
      </GestureHandlerRootView>
    </SwipeWrapper>
  );
}

const styles = StyleSheet.create({
  themeOption: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  themeColorIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 12,
  },
  selectedOption: {
    borderWidth: 2,
    borderColor: "white",
  },
});