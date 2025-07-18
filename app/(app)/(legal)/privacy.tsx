import React from "react";
import { View, ScrollView, Text, Linking } from "react-native";
import { privacyPolicy } from "@/constants/helper";

export default function Privacy() {
	const renderFormattedText = (text) => {
		const lines = text.trim().split("\n");

		return lines.map((line, index) => {
			const trimmedLine = line.trim();

			// Render section titles (like "1. Consent")
			if (/^\d+\.\s/.test(trimmedLine) || index === 0) {
				return (
					<Text
						key={index}
						style={{
							fontSize: 20,
							fontWeight: "bold",
							// marginTop: index === 0 ? 0 : 12,
							// marginBottom: 8,
							color: "#ccc",
						}}
					>
						{trimmedLine}
					</Text>
				);
			}

			// Render email as a clickable link
			if (trimmedLine.includes("edgesenterprise@outlook.com")) {
				const parts = trimmedLine.split("edgesenterprise@outlook.com");
				return (
					<Text
						key={index}
						style={{
							fontSize: 12,
							// lineHeight: 20,
							// textAlign: "justify",
							// marginBottom: 8,
							color: "#ccc",
						}}
					>
						{parts[0]}
						<Text
							style={{ textDecorationLine: "underline", color: "#1E90FF" }}
							onPress={() =>
								Linking.openURL("mailto:edgesenterprise@outlook.com")
							}
						>
							edgesenterprise@outlook.com
						</Text>
						{parts[1]}
					</Text>
				);
			}

			// Render phone numbers as WhatsApp links
			if (trimmedLine.match(/\+234\d{10}/g)) {
				const phones = trimmedLine.match(/\+234\d{10}/g);
				const parts = trimmedLine.split(phones[0]);

				return (
					<Text
						key={index}
						style={{
							fontSize: 12,
							lineHeight: 20,
							textAlign: "justify",
							// marginBottom: 8,
							color: "#ccc",
						}}
					>
						{parts[0]}
						<Text
							style={{ textDecorationLine: "underline", color: "#ccc" }}
							onPress={() =>
								Linking.openURL(`https://wa.me/${phones[0].replace("+", "")}`)
							}
						>
							{phones[0]}
						</Text>
						{parts[1] || ""}
					</Text>
				);
			}

			// Default paragraph
			return (
				<Text
					key={index}
					style={{
						fontSize: 12,
						lineHeight: 20,
						textAlign: "justify",
						// marginBottom: 4,
						color: "#ccc",
					}}
				>
					{trimmedLine}
				</Text>
			);
		});
	};

	return (
		<View style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 24 }}>
			<ScrollView showsVerticalScrollIndicator={false}>
				{renderFormattedText(privacyPolicy)}
			</ScrollView>
		</View>
	);
}
