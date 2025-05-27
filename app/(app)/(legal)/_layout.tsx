import { colors } from "@/constants/colors";
import { useFont } from "@/context/font-context";

import { useTheme } from "@/context/theme-context";

import { Stack } from "expo-router";

export default function LegalLayout() {

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
          title: "EULA Agreement",
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="terms"
        options={{
          title: "Terms Of Service",
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="privacy"
        options={{
          title: "Privacy Policy",
          headerShown: true,
        }}
      />
      
    </Stack>
  );
}