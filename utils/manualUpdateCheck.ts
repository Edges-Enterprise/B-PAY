import * as Updates from "expo-updates";
import { Alert, Linking } from "react-native";
import Constants from "expo-constants";
import { supabase } from "@/config/supabase";

// ✅ Function to compare semantic versions (e.g. "1.1.2")
const isNewerVersion = (remote: string, local: string) => {
  const r = remote.split(".").map(Number);
  const l = local.split(".").map(Number);
  for (let i = 0; i < Math.max(r.length, l.length); i++) {
    const rv = r[i] || 0;
    const lv = l[i] || 0;
    if (rv > lv) return true;
    if (rv < lv) return false;
  }
  return false; // same version
};

export const manualUpdateCheck = async () => {
  console.log("🔎 Manually checking for OTA or APK update...");

  try {
		// ✅ 1. OTA check (skip in dev)
		if (!__DEV__) {
			try {
				const otaUpdate = await Updates.checkForUpdateAsync();
				if (otaUpdate.isAvailable) {
					console.log("⬇️ OTA update available! Fetching...");
					await Updates.fetchUpdateAsync();
					Alert.alert(
						"Update Available",
						"A new version is ready. Install now?",
						[
							{ text: "Install", onPress: () => Updates.reloadAsync() },
							{ text: "Later", style: "cancel" },
						],
					);
					return;
				}
			} catch (otaError) {
				console.log("⚠️ OTA check skipped:", otaError);
			}
		} else {
			console.log("⚠️ Skipping OTA check in development mode");
		}

		// ✅ 2. Check APK / Supabase update
		console.log("🔄 Checking for APK update...");

		// Use Constants.expoConfig.version instead of Constants.manifest
		const currentVersion = Constants.expoConfig?.version || "0.0.0";

		const { data, error } = await supabase
			.from("app_updates")
			.select("version, apk_url")
			.eq("status", "active")
			.order("created_at", { ascending: false })
			.limit(1)
			.single();

		if (error) {
			console.error("Supabase version check error:", error);
			Alert.alert("Update Error", "Could not check for APK updates right now.");
			return;
		}

		if (data) {
			const remoteVersion = data.version;
			console.log(`📦 Current: ${currentVersion} | Remote: ${remoteVersion}`);

			if (isNewerVersion(remoteVersion, currentVersion)) {
				console.log("✅ APK update available:", data);
				Alert.alert(
					"New Version Available",
					`A new app version (${remoteVersion}) is available. Download now?`,
					[
						{
							text: "Download",
							onPress: () => {
								if (data.apk_url) {
									Linking.openURL(data.apk_url);
								} else {
									Alert.alert(
										"No URL Found",
										"No APK link was provided for the update.",
									);
								}
							},
						},
						{ text: "Cancel", style: "cancel" },
					],
				);
			} else {
				Alert.alert("Up to Date", "You're already using the latest version.");
			}
		} else {
			Alert.alert("Up to Date", "You're already using the latest version.");
		}
	} catch (error) {
    console.error("Update check failed:", error);
    Alert.alert("Error", "Unable to check for updates right now.");
  }
};

