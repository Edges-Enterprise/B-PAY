// context/notifications-utils.ts
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { supabase } from "@/config/supabase";

export const requestPushPermissions = async (userId?: string): Promise<boolean> => {
  if (!Device.isDevice) {
    console.log("Must use physical device for push notifications");
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Failed to get push token for push notifications");
    return false;
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;

  if (userId) {
    try {
      await supabase.from("user_push_tokens").upsert(
        {
          user_id: userId,
          push_token: token,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    } catch (error) {
      console.error("Error storing push token:", error);
    }
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FFFFFF",
    });
  }

  return true;
};
