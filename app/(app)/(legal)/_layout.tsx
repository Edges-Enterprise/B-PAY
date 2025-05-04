import { colors } from "@/constants/colors";
import { useFont } from "@/context/font-context";

import { useTheme } from "@/context/theme-context";

import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";

export default function LegalLayout() {
  const { t } = useTranslation();
  const { selectedFont } = useFont();
  const { colorScheme } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        gestureEnabled: true,
        headerStyle: {
          backgroundColor: colors[colorScheme]?.background,
        },
        headerTintColor: colors[colorScheme]?.foreground,
        headerTitleStyle: {
          fontFamily: selectedFont,
        },
        headerTitleAlign: "center",
        contentStyle: {
          backgroundColor: colors[colorScheme]?.background,
        },
      }}
    >
      <Stack.Screen
        name="eula"
        options={{
          title: t("settings.eulaAgreement"),
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="terms"
        options={{
          title: t("settings.termsOfService"),
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="privacy"
        options={{
          title: t("settings.privacyPolicy"),
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="uwcPolicy"
        options={{
          title: t("settings.uwcPolicy"),
        }}
      />
    </Stack>
  );
}