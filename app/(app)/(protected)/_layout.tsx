import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function ProtectedLayout() {
	return (
		<Tabs
			initialRouteName="wallet"
			screenOptions={({ route }) => ({
				tabBarIcon: ({ color, size }) => {
					let iconName: any;
					let iconSize = size;
					switch (route.name) {
						case "wallet":
							iconName = "wallet-outline";
							break;
						case "buy":
							iconName = "cellular-outline";
							break;
						case "index":
							iconName = "bonfire";
							iconSize = size + 4;
							break;
						case "history":
							iconName = "time-outline";
							break;
						case "settings":
							iconName = "settings-outline";
							break;
						default:
							iconName = "ellipse-outline";
					}

					return <Ionicons name={iconName} size={iconSize} color={color} />;
				},
				tabBarActiveTintColor: "#d7a77f",
				tabBarInactiveTintColor: "gray",
				tabBarLabelStyle: {
					fontSize: 12,
				},
				tabBarStyle: {
					backgroundColor: "transparent",
					position: "absolute",
					borderTopWidth: 0,
					elevation: 0, // for Android
				},
				headerShown: false,
			})}
		>
			<Tabs.Screen name="wallet" options={{ title: "Wallet" }} />
			<Tabs.Screen name="buy" options={{ title: "Buy Data" }} />
			<Tabs.Screen name="index" options={{ title: "Home" }} />
			<Tabs.Screen name="history" options={{ title: "History" }} />
			<Tabs.Screen
				name="settings"
				options={{ title: "Settings", tabBarStyle: { display: "none" } }}
			/>
		</Tabs>
	);
}
