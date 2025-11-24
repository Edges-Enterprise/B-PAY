import React, { useRef } from "react";
import { TouchableOpacity, Animated, StyleSheet } from "react-native";
import { Svg, Path } from "react-native-svg";
import { useRouter } from "expo-router";

const LIGHTNING_STYLES = {
  top: 90,
  left: 0,
  width: 140,
  height: 110,
  zIndex: 9999,
  opacity: 1,
  rotation: 0,
  translateX: 0,
  translateY: 0,
};

export default function LightningBolt() {
  const router = useRouter();
  const lightningOpacity = useRef(new Animated.Value(LIGHTNING_STYLES.opacity)).current;

  const goToLight = () => {
    router.push("/light");
  };

  return (
    <TouchableOpacity
      onPress={goToLight}
      style={[
        styles.lightningContainer,
        {
          top: LIGHTNING_STYLES.top,
          left: LIGHTNING_STYLES.left,
          zIndex: LIGHTNING_STYLES.zIndex,
          width: LIGHTNING_STYLES.width,
          height: LIGHTNING_STYLES.height,
          transform: [
            { rotate: `${LIGHTNING_STYLES.rotation}deg` },
            { translateX: LIGHTNING_STYLES.translateX },
            { translateY: LIGHTNING_STYLES.translateY },
          ],
        }
      ]}
    >
      <Animated.View style={{ opacity: lightningOpacity }}>
        <Svg width={LIGHTNING_STYLES.width} height={LIGHTNING_STYLES.height} viewBox="0 0 200 400">
          <Path d="M100 6 L78 110 L108 110 L68 210 L110 160 L86 260 L140 140 L108 320 L160 220" stroke="#ffd44d" strokeWidth={12} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.95} />
          <Path d="M100 10 L82 110 L108 112 L72 200 L110 162 L88 254 L140 144 L110 318 L156 226" stroke="#ffe7a0" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.85} style={{ mixBlendMode: "screen" }} />
          <Path d="M100 6 L78 110 L108 110 L68 210 L110 160 L86 260 L140 140 L108 320 L160 220" stroke="#fff" strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M88 120 L54 98 L30 142" stroke="#ffd44d" strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
          <Path d="M88 120 L54 98 L30 142" stroke="#fff" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M118 160 L146 130 L176 152" stroke="#ffd44d" strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
          <Path d="M118 160 L146 130 L176 152" stroke="#fff" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  lightningContainer: { 
    position: "absolute" 
  },
});