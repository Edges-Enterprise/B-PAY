// import { Ionicons } from "@expo/vector-icons";
// import { useLocalSearchParams, router } from "expo-router";
// import React, { useEffect, useState } from "react";
// import { useTranslation } from "react-i18next";
// import { Alert, View, TextInput, TouchableOpacity } from "react-native";

// import CustomButton from "@/components/common/CustomButton";
// import { Image } from "@/components/image";
// import { SafeAreaView } from "@/components/safe-area-view";
// import { H2, P } from "@/components/ui/typography";
// import { supabase } from "@/config/supabase";
// import { colors } from "@/constants/colors";
// import { useFont } from "@/context/font-context";
// import { useTheme } from "@/context/theme-context";

// export default function ResetPasswordScreen() {
//   const { colorScheme } = useTheme();
//   const { selectedFont } = useFont();
//   const { t } = useTranslation();

//   // Extract the recovery token and type from the URL
//   const { token, type } = useLocalSearchParams();
//   const [isSubmitting, setSubmitting] = useState(false);
//   const [newPassword, setNewPassword] = useState("");
//   const [showPassword, setShowPassword] = useState(false);

//   useEffect(() => {
//     console.log("token:", token);
//     console.log("type:", type);

//     if (!token || type !== "recovery") {
//       Alert.alert(
//         t(
//           "resetPasswordScreen.error.missingTokens",
//           "Invalid or missing recovery token."
//         )
//       );
//       return;
//     }
//     // Optionally, verify the token here if needed.
//   }, [token, type]);

//   async function handleUpdatePassword() {
//     if (!token || type !== "recovery") return;

//     if (!newPassword || newPassword.length < 8) {
//       Alert.alert(t("resetPasswordScreen.error.invalidPassword"));
//       return;
//     }
//     setSubmitting(true);
//     try {
//       // 1️⃣ Set the session using the token from the URL
//       const sessionToken = Array.isArray(token) ? token[0] : token;
//       const { error: sessionError } = await supabase.auth.setSession({
//         access_token: sessionToken,
//         refresh_token: sessionToken, // Use the same token for refresh
//       });

//       if (sessionError) {
//         console.error("Session Error:", sessionError.message);
//         throw sessionError;
//       }

//       // 2️⃣ Now update the password
//       const { error: updateError } = await supabase.auth.updateUser({
//         password: newPassword,
//       });

//       if (updateError) {
//         console.error("Update User Error:", updateError.message);
//         throw updateError;
//       }

//       Alert.alert(t("resetPasswordScreen.success.passwordUpdated"));
//       router.replace("/(app)/(auth)/sign-in");
//     } catch (err: any) {
//       console.error("Error in handleUpdatePassword:", err.message);
//       Alert.alert(
//         t(
//           "resetPasswordScreen.error.updateFailed",
//           "Failed to update your password."
//         )
//       );
//       setSubmitting(false);
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
//       <View className="flex-1 gap-4 web:m-4">
//         {/* Header / Title */}
//         <View className="flex items-center justify-start pt-[6px] gap-4">
//           <View
//             style={{
//               // backgroundColor: colors[colorScheme]?.primary,
//               shadowColor: "#000",
//               shadowOffset: { width: 0, height: 4 },
//               shadowOpacity: 0.3,
//               shadowRadius: 4,
//               elevation: 10,
//             }}
//             className="w-[60px] h-[60px] rounded-full justify-center items-center"
//           >
//             <Image
//               style={{ backgroundColor: colors[colorScheme]?.background }}
//               className="w-[50px] h-[50px] rounded-full"
//               source={require("@/assets/images/playstore.png")}
//             />
//           </View>

//           <P
//             style={{
//               color: colors[colorScheme]?.primary,
//               fontFamily: selectedFont,
//             }}
//             className="text-[16px]"
//           >
//             {t("resetPasswordScreen.instructions")}
//           </P>
//         </View>

//         {/* Password Input */}
//         <View className="mt-[4px]">
//           <View className="mb-4">
//             <P
//               style={{
//                 color: colors[colorScheme]?.primary,
//                 fontFamily: selectedFont,
//               }}
//               className="mb-2 text-sm"
//             >
//               {t("resetPasswordScreen.labels.newPassword")}
//             </P>

//             {/* Password Input with Eye Icon */}
//             <View
//               className="flex-row items-center rounded-md border border-gray-300 px-2"
//               style={{ backgroundColor: colors[colorScheme]?.input }}
//             >
//               <TextInput
//                 style={{
//                   fontFamily: selectedFont,
//                   backgroundColor: colors[colorScheme]?.input,
//                   color: colors[colorScheme]?.foreground,
//                   borderColor: colors[colorScheme]?.border,
//                 }}
//                 className="flex-1 py-4"
//                 placeholder={t("resetPasswordScreen.placeholders.newPassword")}
//                 placeholderTextColor={colors[colorScheme]?.primary}
//                 secureTextEntry={!showPassword}
//                 value={newPassword}
//                 onChangeText={setNewPassword}
//                 autoCapitalize="none"
//               />
//               <TouchableOpacity
//                 onPress={() => setShowPassword(!showPassword)}
//                 className="w-[30px] h-[30px] flex justify-center items-center"
//               >
//                 <Ionicons
//                   style={{ textAlign: "center" }}
//                   name={showPassword ? "eye-off" : "eye"}
//                   size={20}
//                   color="gray"
//                 />
//               </TouchableOpacity>
//             </View>
//           </View>
//         </View>
//       </View>

//       {/* Update Password Button */}
//       <CustomButton
//         title={t("resetPasswordScreen.buttons.updatePassword")}
//         handlePress={handleUpdatePassword}
//         isLoading={isSubmitting}
//         style={{
//           backgroundColor: colors[colorScheme]?.background,
//           marginBottom: 4
//         }}
//         textStyles={"text-white"}
//       />
//     </SafeAreaView>
//   );
// }


import { View, Text } from 'react-native'
import React from 'react'

export default function ResetPassword() {
  return (
    <View>
      <Text>ResetPassword</Text>
    </View>
  )
}