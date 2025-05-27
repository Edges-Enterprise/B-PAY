// components/RotatingText.tsx
import React, { useEffect, useState } from "react";
import { Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, { SlideInRight, SlideOutLeft } from "react-native-reanimated";
import { RotatingTextItem } from "@/types/components";

interface RotatingTextProps {
	texts: RotatingTextItem[];
	interval?: number;
}

const RotatingText: React.FC<RotatingTextProps> = ({
	texts,
	interval = 4000,
}) => {
	const [textIndex, setTextIndex] = useState(0);

	useEffect(() => {
		const timer = setInterval(() => {
			setTextIndex((prev) => (prev + 1) % texts.length);
		}, interval);
		return () => clearInterval(timer);
	}, [texts.length, interval]);

	const current = texts[textIndex];

	return (
		<Animated.View
			key={textIndex}
			entering={SlideInRight.duration(1500)}
			exiting={SlideOutLeft.duration(1200)}
			style={{
				flexDirection: "row",
				alignItems: "center",
				marginTop: 14,
				maxWidth: "90%",
			}}
		>
			<MaterialCommunityIcons
				name={current.icon}
				size={22}
				color="#D7A77F"
				style={{ marginRight: 8 }}
			/>
			<Text
				style={{
					color: "#d1d5db",
					fontSize: 16,
					lineHeight: 22,
				}}
			>
				{current.text}
			</Text>
		</Animated.View>
	);
};

export default RotatingText;
