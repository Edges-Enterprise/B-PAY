// import { useState } from "react";
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   Alert,
//   ScrollView,
// } from "react-native";
// import { useTranslation } from "react-i18next";
// import { SafeAreaView } from "@/components/safe-area-view";
// import { supabase } from "@/config/supabase";
// import { router } from "expo-router";
// import { Image } from "@/components/image";
// import { colors } from "@/constants/colors";
// import { useTheme } from "@/context/theme-context";
// import { useFont } from "@/context/font-context";

// export default function ForgotPassword() {
//   const { t } = useTranslation();
//   const { selectedFont } = useFont();
//   const { colorScheme } = useTheme();

//   const [email, setEmail] = useState("");
//   const [loading, setLoading] = useState(false);

//   async function handleResetPassword() {
//     if (!email) {
//       Alert.alert(
//         t("forgotPassword.title"),
//         t("forgotPassword.alerts.enterEmail")
//       );
//       return;
//     }
//     try {
//       setLoading(true);
//       const { error } = await supabase.auth.resetPasswordForEmail(email, {
//         redirectTo: "https://challenzapp.com/redirect",
//       });
//       if (error) throw error;
//       Alert.alert(
//         t("forgotPassword.title"),
//         t("forgotPassword.alerts.checkEmail")
//       );
//       router.push("/sign-in");
//     } catch (error) {
//       Alert.alert(t("forgotPassword.alerts.resetError"), error.message);
//     } finally {
//       setLoading(false);
//     }
//   }

//   return (
//     <SafeAreaView
//       style={{
//         flex: 1,
//         backgroundColor: colors[colorScheme]?.foreground,
//         paddingHorizontal: 24,
//       }}
//     >
//       <ScrollView
//         contentContainerStyle={{ flexGrow: 0.5, justifyContent: "center" }}
//       >
//         <View style={{ alignItems: "center" }}>
//           <View className="flex items-center justify-start py-4 my-8 gap-4">
//             <Image
//               style={{ backgroundColor: colors[colorScheme]?.background }}
//               className="w-[50px] h-[50px] rounded-full"
//               source={require("@/assets/images/playstore.png")}
//             />
            
//           </View>
//           <Text
//             style={{
//               fontSize: 14,
//               color: colors[colorScheme]?.mutedForeground,
//               fontFamily: selectedFont,
//               textAlign: "center",
//             }}
//           >
//             {t("forgotPassword.description")}
//           </Text>
//         </View>

//         <View style={{ marginBottom: 20 }}>
//           <TextInput
//             placeholder={t("forgotPassword.form.email")}
//             style={{
//               borderWidth: 1,
//               borderColor: colors[colorScheme]?.border,
//               padding: 14,
//               borderRadius: 10,
//               backgroundColor: colors[colorScheme]?.input,
//               fontSize: 16,
//               fontFamily: selectedFont,
//             }}
//             autoCapitalize="none"
//             onChangeText={setEmail}
//             value={email}
//           />
//         </View>

//         <TouchableOpacity
//           onPress={handleResetPassword}
//           style={{
//             backgroundColor: colors[colorScheme]?.background,
//             paddingVertical: 14,
//             borderRadius: 10,
//             alignItems: "center",
//           }}
//           disabled={loading}
//         >
//           <Text
//             style={{
//               color: colors[colorScheme]?.foreground,
//               fontSize: 16,
//               fontWeight: "bold",
//             }}
//           >
//             {loading
//               ? t("forgotPassword.buttons.sending")
//               : t("forgotPassword.buttons.reset")}
//           </Text>
//         </TouchableOpacity>

//         <View
//           style={{
//             flexDirection: "row",
//             justifyContent: "center",
//             marginTop: 16,
//           }}
//         >
//           <Text
//             style={{
//               fontSize: 14,
//               fontFamily: selectedFont,
//               color: colors[colorScheme]?.mutedForeground,
//             }}
//           >
//             {t("forgotPassword.buttons.remembered")}
//           </Text>
//           <TouchableOpacity onPress={() => router.push("/sign-in")}>
//             <Text
//               style={{
//                 color: colors[colorScheme]?.accent,
//                 fontSize: 14,
//                 fontWeight: "600",
//                 marginLeft: 5,
//               }}
//             >
//               {t("forgotPassword.buttons.signIn")}
//             </Text>
//           </TouchableOpacity>
//         </View>
//       </ScrollView>
//     </SafeAreaView>
//   );
// }


import { View, Text } from 'react-native'
import React from 'react'

export default function ForgotPassword() {
  return (
    <View>
      <Text>ForgotPassword</Text>
    </View>
  )
}