// context/font-context.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

import { fonts } from "@/constants/fonts";

const FONT_KEY = "selected_font";

type FontContextType = {
  selectedFont: string;
  setSelectedFont: (font: string) => void;
};

const FontContext = createContext<FontContextType>({
  selectedFont: fonts.default,
  setSelectedFont: () => {},
});

export const FontProvider = ({ children }: { children: React.ReactNode }) => {
  const [selectedFont, setSelectedFontState] = useState(fonts.default);

  // Load font preference from AsyncStorage
  useEffect(() => {
    (async () => {
      const storedFont = await AsyncStorage.getItem(FONT_KEY);
      if (storedFont) {
        setSelectedFontState(storedFont);
      }
    })();
  }, []);

  // Save font preference to AsyncStorage
  const setSelectedFont = async (font: string) => {
    setSelectedFontState(font);
    await AsyncStorage.setItem(FONT_KEY, font);
  };

  return (
    <FontContext.Provider value={{ selectedFont, setSelectedFont }}>
      {children}
    </FontContext.Provider>
  );
};

export const useFont = () => useContext(FontContext);
