import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { colors } from "@/constants/colors";

const THEME_KEY = "app_theme";

// Define ColorScheme type based on the keys of your colors object
type ColorScheme = keyof typeof colors;

type ThemeContextType = {
  colorScheme: ColorScheme;
  setCustomColorScheme: (scheme: ColorScheme) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  colorScheme: "light",
  setCustomColorScheme: () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [colorScheme, setColorScheme] = useState<ColorScheme>("light");

  // Load theme from AsyncStorage
  useEffect(() => {
    (async () => {
      const savedTheme = await AsyncStorage.getItem(THEME_KEY);
      if (savedTheme && isValidColorScheme(savedTheme)) {
        setColorScheme(savedTheme);
      }
    })();
  }, []);

  // Type guard to ensure the saved theme is a valid ColorScheme
  const isValidColorScheme = (scheme: string): scheme is ColorScheme => {
    return Object.keys(colors).includes(scheme);
  };

  // Update theme and save it
  const setCustomColorScheme = async (scheme: ColorScheme) => {
    setColorScheme(scheme);
    await AsyncStorage.setItem(THEME_KEY, scheme);
  };

  return (
    <ThemeContext.Provider value={{ colorScheme, setCustomColorScheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);