import React from "react";
import { View, ScrollView, Text } from "react-native";
import { termsAndConditions } from "@/constants/helper";

export default function Terms() {
	return (
		<View style={{ flex: 1, paddingHorizontal: 16 }}>
			<ScrollView>
				<Text
					style={{
						fontSize: 16,
						lineHeight: 24,
						textAlign: "justify",
						color: "gray",
					}}
				>
					{termsAndConditions}
				</Text>
			</ScrollView>
		</View>
	);
}
