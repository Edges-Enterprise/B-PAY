import React from "react";
import { View, ScrollView, Text } from "react-native";
import { privacyPolicy } from "@/constants/helper";

export default function Privacy() {
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
					{privacyPolicy}
				</Text>
			</ScrollView>
		</View>
	);
}
