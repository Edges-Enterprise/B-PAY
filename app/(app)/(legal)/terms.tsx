import React from "react";
import { View, ScrollView, Text, Linking } from "react-native";
import { termsAndConditions } from "@/constants/helper";

export default function Terms() {
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
			// if (trimmedLine.match(/\+234\d{10}/g)) {
			// 	const phones = trimmedLine.match(/\+234\d{10}/g);
			// 	const parts = trimmedLine.split(phones[0]);

			// 	return (
			// 		<Text
			// 			key={index}
			// 			style={{
			// 				fontSize: 12,
			// 				lineHeight: 20,
			// 				textAlign: "justify",
			// 				color: "#ccc",
			// 			}}
			// 		>
			// 			{parts[0]}
			// 			<Text
			// 				style={{ textDecorationLine: "underline", color: "#ccc" }}
			// 				onPress={() =>
			// 					Linking.openURL(`https://wa.me/${phones[0].replace("+", "")}`)
			// 				}
			// 			>
			// 				{phones[0]}
			// 			</Text>
			// 			{parts[1] || ""}
			// 		</Text>
			// 	);
      // }
      
        // Handle multiple phone numbers
    const phoneRegex = /\+234\d{10}/g;
    const matches = [...trimmedLine.matchAll(phoneRegex)];

    if (matches.length > 0) {
      const segments = [];
      let lastIndex = 0;

      matches.forEach((match, i) => {
        const start = match.index;
        const end = start + match[0].length;

        // Add text before the match
        if (start > lastIndex) {
          segments.push(trimmedLine.slice(lastIndex, start));
        }

        // Add clickable phone
        segments.push(
          <Text
            key={`phone-${index}-${i}`}
            style={{ textDecorationLine: "underline", color: "#25D366" }}
            onPress={() =>
              Linking.openURL(`https://wa.me/${match[0].replace("+", "")}`)
            }
          >
            {match[0]}
          </Text>
        );

        lastIndex = end;
      });

      // Add any trailing text after last match
      if (lastIndex < trimmedLine.length) {
        segments.push(trimmedLine.slice(lastIndex));
      }

      return (
        <Text
          key={index}
          style={{
            fontSize: 12,
            lineHeight: 20,
            textAlign: "justify",
            marginBottom: 8,
            color: "#ccc",
          }}
        >
          {segments}
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
						// marginBottom: 8,
						color: "#ccc",
					}}
				>
					{trimmedLine}
				</Text>
			);
		});
	};

	return (
		<View style={{ flex: 1, paddingHorizontal: 16 }}>
			<ScrollView showsVerticalScrollIndicator={false}>
				{renderFormattedText(termsAndConditions)}
			</ScrollView>
		</View>
	);
}
