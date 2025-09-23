// import React, { useState, useEffect, useRef, useCallback } from 'react';
// import { View, StyleSheet, Alert, Animated, PanResponder, Text } from 'react-native';
// import { Ionicons } from '@expo/vector-icons';
// import { router, useLocalSearchParams } from 'expo-router';
// import { supabase } from '@/config/supabase';
// import TransactionStatusModal from '@/components/homescreen/TransactionStatusModal';
// import PurchaseDetails from '@/components/confirmation/PurchaseDetails';
// import ErrorModal from '@/components/confirmation/ErrorModal';

// // Define constants
// const THIRTY_DAYS_IN_MS = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
// const LIZZYSUB_TOKEN = 'b5b39c2645893a318c432507d00a91270f39bd987e5fcc904dc72276a00c';

// // Define interfaces
// interface DataBundle {
//   id: number;
//   data: string;
//   price: number;
//   validity: string;
//   category: string;
//   description?: string;
//   planType: string;
// }

// interface Bundle {
//   id: number;
//   variation_code?: string;
//   description?: string;
//   amount?: number | null;
//   name?: string;
//   data?: string;
//   price: number;
//   validity?: string;
//   category?: string;
//   planType?: string;
// }

// interface Provider {
//   id: number;
//   name: string;
//   image?: string;
//   code: string;
//   imageKey?: string;
// }

// const ConfirmationScreen: React.FC = () => {
//   const {
//     bundle,
//     provider,
//     phoneNumber,
//     transactionPin,
//     userEmail,
//     referenceId,
//     balance,
//     networkId,
//     planId,
//     purchaseType, // New param to distinguish between data and airtime
//   } = useLocalSearchParams<{
//     bundle: string;
//     provider: string;
//     phoneNumber: string;
//     transactionPin: string;
//     userEmail: string;
//     referenceId: string;
//     balance: string;
//     networkId: string;
//     planId: string;
//     purchaseType: 'data' | 'airtime';
//   }>();

//   const [selectedBundle, setSelectedBundle] = useState<Bundle>(JSON.parse(bundle));
//   const [selectedProvider, setSelectedProvider] = useState<Provider>(JSON.parse(provider));
//   const [parsedNetworkId, setParsedNetworkId] = useState<number>(parseInt(networkId, 10));
//   const [parsedPlanId, setParsedPlanId] = useState<number>(parseInt(planId, 10));
//   const [balanceValue, setBalanceValue] = useState<number>(parseFloat(balance));
//   const [editableMobileNumber, setEditableMobileNumber] = useState<string>(phoneNumber);
//   const [isEditingMobile, setIsEditingMobile] = useState<boolean>(false);
//   const [networkProvider, setNetworkProvider] = useState<string>(selectedProvider.name);
//   const [transactionModalVisible, setTransactionModalVisible] = useState<boolean>(false);
//   const [transactionStatus, setTransactionStatus] = useState<'processing' | 'success' | 'failed'>('processing');
//   const [isBalanceLoading, setIsBalanceLoading] = useState<boolean>(true);
//   const [errorModalVisible, setErrorModalVisible] = useState<boolean>(false);
//   const [userName, setUserName] = useState<string>('User');
//   const [timeLeft, setTimeLeft] = useState<number>(4 * 60 * 60); // 4 hours in seconds

//   const slideAnim = useRef(new Animated.Value(0)).current;
//   const pulseAnim = useRef(new Animated.Value(1)).current;
//   const pulseNetworkAnim = useRef(new Animated.Value(1)).current;

//   // Synchronize parsedNetworkId with selectedBundle.planType for Hot plans
//   useEffect(() => {
//     if (purchaseType === 'data' && selectedBundle.category === 'Hot' && selectedBundle.planType) {
//       const networkIds: { [key: string]: number } = {
//         MTN: 1,
//         GLO: 3,
//         '9MOBILE': 4,
//         AIRTEL: 2,
//       };
//       const expectedNetworkId = networkIds[selectedBundle.planType];
//       if (expectedNetworkId && parsedNetworkId !== expectedNetworkId) {
//         // console.log('Synchronizing networkId:', {
//         //   currentNetworkId: parsedNetworkId,
//         //   expectedNetworkId,
//         //   planType: selectedBundle.planType,
//         //   bundleId: selectedBundle.id,
//         // });
//         setParsedNetworkId(expectedNetworkId);
//         setNetworkProvider(selectedBundle.planType);
//         setSelectedProvider({ ...selectedProvider, name: selectedBundle.planType, id: expectedNetworkId });
//       }
//     }
//   }, [selectedBundle, parsedNetworkId, selectedProvider, purchaseType]);

//   // Fetch user name
//   useEffect(() => {
//     const fetchUserName = async () => {
//       try {
//         const { data, error } = await supabase
//           .from('profiles')
//           .select('username')
//           .eq('email', userEmail)
//           .single();

//         if (error) {
//           console.error('Error fetching user name:', error);
//         } else if (data?.username) {
//           setUserName(data.username);
//         }
//       } catch (err) {
//         console.error('Error in fetchUserName:', err);
//       }
//     };

//     if (userEmail) {
//       fetchUserName();
//     }
//   }, [userEmail]);

//   // Timer for error modal
//   useEffect(() => {
//     if (errorModalVisible && timeLeft > 0) {
//       const timer = setInterval(() => {
//         setTimeLeft((prev) => prev - 1);
//       }, 1000);
//       return () => clearInterval(timer);
//     }
//   }, [errorModalVisible, timeLeft]);

//   // Log initial parameters
//   // useEffect(() => {
//   //   console.log('Received navigation params:', {
//   //     bundle: selectedBundle,
//   //     provider: selectedProvider,
//   //     phoneNumber,
//   //     transactionPin: '****',
//   //     userEmail,
//   //     referenceId,
//   //     balance: balanceValue,
//   //     networkId: parsedNetworkId,
//   //     planId: parsedPlanId,
//   //     purchaseType,
//   //   });
//   // }, [selectedBundle, selectedProvider, phoneNumber, transactionPin, userEmail, referenceId, balanceValue, parsedNetworkId, parsedPlanId, purchaseType]);

//   // Fetch wallet balance and set up real-time subscription
//   useEffect(() => {
//     if (!userEmail) {
//       console.error('User email missing');
//       Alert.alert('Error', 'User authentication missing');
//       router.back();
//       return;
//     }

//     const fetchWalletBalance = async () => {
//       try {
//         const { data: wallet, error } = await supabase
//           .from('wallet')
//           .select('balance')
//           .eq('user_email', userEmail)
//           .single();

//         if (error && error.code !== 'PGRST116') {
//           console.error('Error fetching wallet balance:', error);
//         } else {
//           const walletBalance = wallet?.balance;
//           setBalanceValue(walletBalance ?? balanceValue);
//           // console.log('Fetched wallet balance:', walletBalance);
//         }
//       } catch (err) {
//         console.error('Error in fetchWalletBalance:', err);
//       } finally {
//         setIsBalanceLoading(false);
//       }
//     };

//     fetchWalletBalance();

//     const subscription = supabase
//       .channel(`wallet-changes:${userEmail}`)
//       .on(
//         'postgres_changes',
//         {
//           event: 'UPDATE',
//           schema: 'public',
//           table: 'wallet',
//           filter: `user_email=eq.${userEmail}`,
//         },
//         (payload) => {
//           // console.log('Real-time Wallet Balance Update:', payload);
//           setBalanceValue(payload.new.balance ?? balanceValue);
//         }
//       )
//       .subscribe((status, err) => {
//         if (err) {
//           console.error('Subscription error:', err);
//         }
//         // console.log('Subscription status:', status);
//       });

//     return () => {
//       supabase.removeChannel(subscription);
//       // console.log('Subscription cleaned up');
//     };
//   }, [userEmail, balanceValue]);

//   // Pulse animation for edit button and network text
//   useEffect(() => {
//     Animated.loop(
//       Animated.sequence([
//         Animated.timing(pulseAnim, {
//           toValue: 0.5,
//           duration: 1000,
//           useNativeDriver: true,
//         }),
//         Animated.timing(pulseAnim, {
//           toValue: 1,
//           duration: 1000,
//           useNativeDriver: true,
//         }),
//       ])
//     ).start();

//     Animated.loop(
//       Animated.sequence([
//         Animated.timing(pulseNetworkAnim, {
//           toValue: 0.8,
//           duration: 1500,
//           useNativeDriver: true,
//         }),
//         Animated.timing(pulseNetworkAnim, {
//           toValue: 1,
//           duration: 1500,
//           useNativeDriver: true,
//         }),
//       ])
//     ).start();
//   }, []);

//   // Update network provider when mobile number changes
//   const updateNetworkProvider = useCallback(
//     (mobile: string) => {
//       if (mobile.length !== 11) {
//         setNetworkProvider(selectedProvider.name);
//         return;
//       }
//       const prefix = mobile.slice(0, 4);
//       const mtn = ['0803', '0806', '0703', '0706', '0813', '0816', '0810', '0814', '0903', '0906', '0913', '0916'];
//       const glo = ['0805', '0807', '0705', '0815', '0811', '0905', '0915'];
//       const airtel = ['0802', '0808', '0708', '0812', '0701', '0902', '0907', '0901', '0912'];
//       const nineMobile = ['0809', '0817', '0818', '0909', '0908'];
//       let detectedProvider = selectedProvider.name;
//       let detectedNetworkId = parsedNetworkId;

//       if (mtn.includes(prefix)) {
//         detectedProvider = 'MTN';
//         detectedNetworkId = 1;
//       } else if (glo.includes(prefix)) {
//         detectedProvider = 'GLO';
//         detectedNetworkId = 3;
//       } else if (airtel.includes(prefix)) {
//         detectedProvider = 'AIRTEL';
//         detectedNetworkId = 2;
//       } else if (nineMobile.includes(prefix)) {
//         detectedProvider = '9MOBILE';
//         detectedNetworkId = 4;
//       }

//       // Only update if the detected provider matches the selected plan's planType for Hot plans
//       if (purchaseType === 'data' && selectedBundle.category === 'Hot' && selectedBundle.planType && selectedBundle.planType === detectedProvider) {
//         setNetworkProvider(detectedProvider);
//         setParsedNetworkId(detectedNetworkId);
//         setSelectedProvider({ ...selectedProvider, name: detectedProvider, id: detectedNetworkId });
//       } else if (purchaseType === 'data' && selectedBundle.category === 'Hot' && selectedBundle.planType) {
//         console.log('Mobile number prefix does not match planType:', {
//           prefix,
//           detectedProvider,
//           planType: selectedBundle.planType,
//           bundleId: selectedBundle.id,
//         });
//       } else {
//         setNetworkProvider(detectedProvider);
//         setParsedNetworkId(detectedNetworkId);
//         setSelectedProvider({ ...selectedProvider, name: detectedProvider, id: detectedNetworkId });
//       }
//     },
//     [selectedProvider, parsedNetworkId, selectedBundle, purchaseType]
//   );

//   useEffect(() => {
//     if (editableMobileNumber) {
//       const timeoutId = setTimeout(() => {
//         updateNetworkProvider(editableMobileNumber);
//       }, 300);
//       return () => clearTimeout(timeoutId);
//     }
//   }, [editableMobileNumber, updateNetworkProvider]);

//   // PanResponder for slide-to-purchase
//   const panResponder = useRef(
//     PanResponder.create({
//       onStartShouldSetPanResponder: () => false,
//       onMoveShouldSetPanResponder: (_, gestureState) => {
//         return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
//       },
//       onPanResponderMove: (_, gestureState) => {
//         if (gestureState.dx > 0) {
//           slideAnim.setValue(gestureState.dx);
//         }
//       },
//       onPanResponderRelease: (_, gestureState) => {
//         if (gestureState.dx > 100) {
//           // console.log('Slide to purchase triggered', { referenceId });
//           handlePurchase();
//         }
//         Animated.spring(slideAnim, {
//           toValue: 0,
//           useNativeDriver: true,
//         }).start();
//       },
//     })
//   ).current;

//   const handleMobileNumberChange = (text: string) => {
//     setEditableMobileNumber(text);
//     if (text.length === 11 && /^\d{11}$/.test(text)) {
//       if (networkProvider.toUpperCase() === selectedProvider.name.toUpperCase()) {
//         setIsEditingMobile(false);
//       } else {
//         Alert.alert(
//           'Invalid Mobile Number',
//           `The mobile number does not match the provider (${selectedProvider.name}). Please enter a valid ${selectedProvider.name} number.`,
//         );
//         setEditableMobileNumber(phoneNumber);
//         setIsEditingMobile(false);
//       }
//     }
//   };

//   const formatNumberWithCommas = (number: number): string => {
//     return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
//   };

//   const validateHotPlan = (networkId: number, planType: string): boolean => {
//     const validNetworkIds: { [key: string]: number[] } = {
//       MTN: [1],
//       GLO: [3],
//       '9MOBILE': [4],
//       AIRTEL: [2],
//     };
//     const validIds = validNetworkIds[planType] || [];
//     if (!validIds.includes(networkId)) {
//       console.error('Invalid Network ID for plan:', {
//         networkId,
//         planType,
//         expectedNetworkId: validIds[0],
//       });
//       return false;
//     }
//     return true;
//   };

//   const handlePurchase = async () => {
//     let currentBalance: number | undefined;
//     try {
//       setTransactionModalVisible(true);
//       setTransactionStatus('processing');

//       // Verify balance
//       const { data: wallet, error: walletError } = await supabase
//         .from('wallet')
//         .select('balance')
//         .eq('user_email', userEmail)
//         .single();

//       if (walletError && walletError.code !== 'PGRST116') {
//         throw new Error(`Failed to fetch wallet balance: ${walletError.message}`);
//       }

//       currentBalance = wallet?.balance ?? balanceValue;
//       const basePrice = (selectedBundle.price || selectedBundle.amount) ?? 0;

//       if (currentBalance < basePrice) {
//         Alert.alert(
//           'Error',
//           `Insufficient wallet balance. Required: ₦${formatNumberWithCommas(basePrice)}, Available: ₦${formatNumberWithCommas(currentBalance)}. Please top up your wallet.`,
//         );
//         setTransactionModalVisible(false);
//         return;
//       }

//       let apiResponse: Response;
//       let responseText: string;

//       if (purchaseType === 'data') {
//         // Check if plan is a Hot plan
//         const isHotPlan = selectedBundle.category === 'Hot';
//         // console.log('API routing decision:', { isHotPlan, selectedBundleId: selectedBundle.id });

//         if (isHotPlan) {
//           // Validate Hot Plan and Network ID
//           if (!selectedBundle.planType || !validateHotPlan(parsedNetworkId, selectedBundle.planType)) {
//             const { error: refundError } = await supabase
//               .from('wallet')
//               .update({ balance: currentBalance })
//               .eq('user_email', userEmail);

//             if (refundError) {
//               console.error('Error refunding wallet balance:', refundError);
//               throw new Error(`Failed to refund wallet balance: ${refundError.message}`);
//             }

//             setBalanceValue(currentBalance);
//             setTransactionModalVisible(false);
//             setErrorModalVisible(true);
//             Alert.alert(
//               'Error',
//               `Invalid network selected for the plan. Please select a ${selectedBundle.planType} network for the ${selectedBundle.data} plan.`
//             );
//             return;
//           }

//           // Use Lizzysub API for Hot plans with static token
//           const requestBody = {
//             network: parsedNetworkId,
//             phone: editableMobileNumber,
//             data_plan: selectedBundle.id,
//             bypass: false,
//             'request-id': `Data_${referenceId}`,
//           };

//           // console.log('Lizzysub API request:', requestBody);

//           apiResponse = await fetch('https://lizzysub.com/api/data', {
//             method: 'POST',
//             headers: {
//               'Content-Type': 'application/json',
//               Authorization: `Token ${LIZZYSUB_TOKEN}`,
//             },
//             body: JSON.stringify(requestBody),
//           });

//           responseText = await apiResponse.text();
//           // console.log('Lizzysub API response:', {
//           //   status: apiResponse.status,
//           //   headers: Object.fromEntries(apiResponse.headers.entries()),
//           //   responseText: responseText.slice(0, 500),
//           // });

//           let responseData;
//           try {
//             responseData = JSON.parse(responseText);
//           } catch (parseError: any) {
//             const { error: refundError } = await supabase
//               .from('wallet')
//               .update({ balance: currentBalance })
//               .eq('user_email', userEmail);

//             if (refundError) {
//               console.error('Error refunding wallet balance:', refundError);
//               throw new Error(`Failed to refund wallet balance: ${refundError.message}`);
//             }

//             setBalanceValue(currentBalance);
//             throw new Error(`Failed to parse L API response: ${parseError.message}`);
//           }

//           if (!(apiResponse.status === 200 || apiResponse.status === 201)) {
//             const { error: refundError } = await supabase
//               .from('wallet')
//               .update({ balance: currentBalance })
//               .eq('user_email', userEmail);

//             if (refundError) {
//               console.error('Error refunding wallet balance:', refundError);
//               throw new Error(`Failed to refund wallet balance: ${refundError.message}`);
//             }

//             setBalanceValue(currentBalance);

//             if (apiResponse.status === 400 && responseText.includes('insufficient balance')) {
//               setTransactionModalVisible(false);
//               setErrorModalVisible(true);
//               // Alert.alert('Error', 'Insufficient balance on Lizzysub API. Please try again later.');
//               return;
//             }

//             if (responseText.includes('Invalid Data Plan ID or Network')) {
//               setTransactionModalVisible(false);
//               setErrorModalVisible(true);
//               Alert.alert('Error', 'Invalid Data Plan ID or Network. Please select a valid plan and network.');
//               return;
//             }

//             const errorMessage = responseData.message || responseText.slice(0, 100);
//             throw new Error(`sub API request failed: ${errorMessage}. Please verify sub credentials and API access.`);
//           }
//         } else {
//           // Use Ebenkdata API for non-Hot data plans
//           const ebenkUrl = process.env.EXPO_PUBLIC_EBENK_URL || 'https://ebenkdata.com';
//           const ebenkToken = process.env.EXPO_PUBLIC_EBENK_TOKEN;
//           if (!ebenkToken) {
//             const { error: refundError } = await supabase
//               .from('wallet')
//               .update({ balance: currentBalance })
//               .eq('user_email', userEmail);

//             if (refundError) {
//               console.error('Error refunding wallet balance:', refundError);
//               throw new Error(`Failed to refund wallet balance: ${refundError.message}`);
//             }

//             setBalanceValue(currentBalance);
//             throw new Error('Edata token is not configured. Please check EXPO_PUBLIC_EBENK_TOKEN.');
//           }

//           const requestBody = {
//             network: parsedNetworkId,
//             mobile_number: editableMobileNumber,
//             plan: parsedPlanId,
//             Ported_number: true,
//           };

//           // console.log('Ebenkdata API request:', requestBody);

//           apiResponse = await fetch(`${ebenkUrl}/api/data/`, {
//             method: 'POST',
//             headers: {
//               'Content-Type': 'application/json',
//               Authorization: `Token ${ebenkToken}`,
//             },
//             body: JSON.stringify(requestBody),
//           });

//           responseText = await apiResponse.text();
//           // console.log('Ebenkdata API response:', {
//           //   status: apiResponse.status,
//           //   headers: Object.fromEntries(apiResponse.headers.entries()),
//           //   responseText: responseText.slice(0, 500),
//           // });

//           let responseData;
//           try {
//             responseData = JSON.parse(responseText);
//           } catch (parseError: any) {
//             const { error: refundError } = await supabase
//               .from('wallet')
//               .update({ balance: currentBalance })
//               .eq('user_email', userEmail);

//             if (refundError) {
//               console.error('Error refunding wallet balance:', refundError);
//               throw new Error(`Failed to refund wallet balance: ${refundError.message}`);
//             }

//             setBalanceValue(currentBalance);
//             throw new Error(`Failed to parse Edata API response: ${parseError.message}`);
//           }

//           if (!(apiResponse.status === 200 || apiResponse.status === 201)) {
//             const { error: refundError } = await supabase
//               .from('wallet')
//               .update({ balance: currentBalance })
//               .eq('user_email', userEmail);

//             if (refundError) {
//               console.error('Error refunding wallet balance:', refundError);
//               throw new Error(`Failed to refund wallet balance: ${refundError.message}`);
//             }

//             setBalanceValue(currentBalance);

//             if (apiResponse.status === 400 && responseText.includes("You can't purchase this plan due to insufficient balance")) {
//               setTransactionModalVisible(false);
//               setErrorModalVisible(true);
//               // Alert.alert('Error', 'Insufficient balance on Ebenkdata API. Please try again later.');
//               return;
//             }

//             const errorMessage = responseData.message || responseText.slice(0, 100);
//             throw new Error(`Edata API request failed: ${errorMessage}`);
//           }
//         }
//       } else if (purchaseType === 'airtime') {
//         // Use Ebenkdata API for airtime purchases
//         const ebenkUrl = process.env.EXPO_PUBLIC_EBENK_URL || 'https://ebenkdata.com';
//         const ebenkToken = process.env.EXPO_PUBLIC_EBENK_TOKEN;
//         if (!ebenkToken) {
//           const { error: refundError } = await supabase
//             .from('wallet')
//             .update({ balance: currentBalance })
//             .eq('user_email', userEmail);

//           if (refundError) {
//             console.error('Error refunding wallet balance:', refundError);
//             throw new Error(`Failed to refund wallet balance: ${refundError.message}`);
//           }

//           setBalanceValue(currentBalance);
//           throw new Error('Edata token is not configured. Please check EXPO_PUBLIC_EBENK_TOKEN.');
//         }

//         const requestBody = {
//           network: parsedNetworkId,
//           mobile_number: editableMobileNumber,
//           amount: basePrice,
//           Ported_number: true,
//         };

//         // console.log('Ebenkdata Airtime API request:', requestBody);

//         apiResponse = await fetch(`${ebenkUrl}/api/airtime/`, {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json',
//             Authorization: `Token ${ebenkToken}`,
//           },
//           body: JSON.stringify(requestBody),
//         });

//         responseText = await apiResponse.text();
//         // console.log('Ebenkdata Airtime API response:', {
//         //   status: apiResponse.status,
//         //   headers: Object.fromEntries(apiResponse.headers.entries()),
//         //   responseText: responseText.slice(0, 500),
//         // });

//         let responseData;
//         try {
//           responseData = JSON.parse(responseText);
//         } catch (parseError: any) {
//           const { error: refundError } = await supabase
//             .from('wallet')
//             .update({ balance: currentBalance })
//             .eq('user_email', userEmail);

//           if (refundError) {
//             console.error('Error refunding wallet balance:', refundError);
//             throw new Error(`Failed to refund wallet balance: ${refundError.message}`);
//           }

//           setBalanceValue(currentBalance);
//           throw new Error(`Failed to parse Edata Airtime API response: ${parseError.message}`);
//         }

//         if (!(apiResponse.status === 200 || apiResponse.status === 201)) {
//           const { error: refundError } = await supabase
//             .from('wallet')
//             .update({ balance: currentBalance })
//             .eq('user_email', userEmail);

//           if (refundError) {
//             console.error('Error refunding wallet balance:', refundError);
//             throw new Error(`Failed to refund wallet balance: ${refundError.message}`);
//           }

//           setBalanceValue(currentBalance);

//           if (apiResponse.status === 400 && responseText.includes("You can't purchase this airtime due to insufficient balance")) {
//             setTransactionModalVisible(false);
//             setErrorModalVisible(true);
//             // Alert.alert('Error', 'Insufficient balance on Ebenkdata API. Please try again later.');
//             return;
//           }

//           const errorMessage = responseData.message || responseText.slice(0, 100);
//           throw new Error(`Edata Airtime API request failed: ${errorMessage}`);
//         }
//       }

//       const actualCost = basePrice;

//       // Record transaction with specific metadata based on purchase type
//       const transactionData = {
//         user_email: userEmail,
//         amount: -basePrice,
//         reference: referenceId,
//         status: 'success',
//         env: 'live',
//         metadata: purchaseType === 'data' ? {
//           reference: referenceId,
//           plan: selectedBundle.data || `Plan ID ${parsedPlanId}`,
//           provider: selectedProvider.name,
//           amount: actualCost,
//           phone_number: editableMobileNumber,
//           validity: selectedBundle.validity || 'N/A',
//           payment_date: new Date().toLocaleString([], { timeZone: 'Africa/Lagos' }),
//           payment_method: 'Wallet',
//         } : purchaseType === 'airtime' ? {
//           reference: referenceId,
//           provider: selectedProvider.name,
//           amount: actualCost,
//           phone_number: editableMobileNumber,
//           payment_date: new Date().toLocaleString([], { timeZone: 'Africa/Lagos' }),
//           payment_method: 'Wallet',
//         } : {
//           fees: {
//             vat: 10,
//             total_fee: 50,
//             net_amount: basePrice - 50,
//             transfer_fee: 10,
//             api_network_fee: 20,
//             wallet_management_fee: 10,
//           },
//           payment_date: new Date().toLocaleString([], { timeZone: 'Africa/Lagos' }),
//           custom_fields: [
//             {
//               value: 'Edges Network',
//               display_name: 'Mobile Payment',
//               variable_name: 'mobile_payment',
//             },
//           ],
//           payment_method: 'Wallet',
//         },
//       };

//       const { error: txError } = await supabase
//         .from('transactions')
//         .insert(transactionData);

//       if (txError) {
//         const { error: refundError } = await supabase
//           .from('wallet')
//           .update({ balance: currentBalance })
//           .eq('user_email', userEmail);

//         if (refundError) {
//           console.error('Error refunding wallet balance after transaction failure:', refundError);
//           throw new Error(`Failed to refund wallet balance: ${refundError.message}`);
//         }

//         setBalanceValue(currentBalance);
//         throw new Error(`Transaction recording failed: ${txError.message}`);
//       }

//       setTransactionStatus('success');

//       Alert.alert(
//         'Success',
//         purchaseType === 'data'
//           ? `Successfully purchased ${selectedBundle.data || `Plan ID ${parsedPlanId}`} on ${selectedProvider.name} for ₦${formatNumberWithCommas(actualCost)}. Sent to ${editableMobileNumber}.`
//           : `Successfully purchased ₦${formatNumberWithCommas(actualCost)} airtime on ${selectedProvider.name}. Sent to ${editableMobileNumber}.`,
//       );

//       router.push({
//         pathname: '/success',
//         params: {
//           id: referenceId,
//           provider: selectedProvider.name,
//           data: purchaseType === 'data' ? (selectedBundle.data || `Plan ID ${parsedPlanId}`) : `Airtime ₦${actualCost}`,
//           price: actualCost.toString(),
//           date: new Date().toISOString(),
//           status: 'Success',
//           phoneNumber: editableMobileNumber,
//           reference: referenceId,
//           metadata: JSON.stringify({
//             validity: purchaseType === 'data' ? (selectedBundle.validity || 'N/A') : undefined,
//             payment_method: 'Wallet',
//             type: purchaseType,
//             actual_cost: actualCost,
//           }),
//         },
//       });
//     } catch (error: any) {
//       console.error('Error initiating purchase:', error);
//       setTransactionStatus('failed');
//       setTransactionModalVisible(false);
//       if (!errorModalVisible) {
//         Alert.alert('Error', `Failed to initiate purchase: ${error.message || 'Please try again.'}`);
//       }
//     }
//   };

//   const handleCancel = () => {
//     router.back();
//   };

//   const closeTransactionModal = () => {
//     setTransactionModalVisible(false);
//   };

//   const closeErrorModal = () => {
//     setErrorModalVisible(false);
//     router.back();
//   };

//   const toggleEditMobile = () => {
//     setIsEditingMobile(!isEditingMobile);
//   };

//   const purchaseDescription = () => purchaseType === 'data' ? (selectedBundle.data || `Plan ID ${parsedPlanId}`) : `Airtime ₦${(selectedBundle.price || selectedBundle.amount) ?? 0}`;

//   return (
//     <View style={styles.container}>
//       <View style={styles.content}>
//         <PurchaseDetails
//           selectedBundle={selectedBundle}
//           selectedProvider={selectedProvider}
//           balanceValue={balanceValue}
//           isBalanceLoading={isBalanceLoading}
//           editableMobileNumber={editableMobileNumber}
//           handleMobileNumberChange={handleMobileNumberChange}
//           toggleEditMobile={toggleEditMobile}
//           handleCancel={handleCancel}
//           referenceId={referenceId}
//           pulseAnim={pulseAnim}
//         />
//         <Animated.View
//           {...panResponder.panHandlers}
//           style={[styles.slideContainer, { transform: [{ translateX: slideAnim }] }]}
//         >
//           <View style={styles.slideTextContainer}>
//             <Text style={styles.slideText}>Slide to Purchase</Text>
//             <Ionicons name="arrow-forward" size={20} color="#3B82F6" />
//           </View>
//         </Animated.View>
//       </View>
//       <TransactionStatusModal
//         visible={transactionModalVisible}
//         onClose={closeTransactionModal}
//         transactionStatus={transactionStatus}
//         selectedPlan={selectedBundle}
//         phoneNumber={editableMobileNumber}
//         networkProvider={networkProvider}
//       />
//       <ErrorModal
//         visible={errorModalVisible}
//         onClose={closeErrorModal}
//         userName={userName}
//         purchaseDescription={purchaseDescription()}
//         timeLeft={timeLeft}
//         pulseNetworkAnim={pulseNetworkAnim}
//       />
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: 'black',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   content: {
//     flex: 1,
//     paddingHorizontal: 16,
//     paddingTop: 48,
//     width: '100%',
//   },
//   slideContainer: {
//     marginTop: 16,
//     paddingVertical: 10,
//     paddingHorizontal: 20,
//     backgroundColor: '#1A1A1A',
//     borderRadius: 8,
//     overflow: 'visible',
//     zIndex: 1,
//     accessible: true,
//     accessibilityLabel: 'button',
//   },
//   slideTextContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//   },
//   slideText: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#3B82F6',
//   },
// });

// export default ConfirmationScreen;

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
	View,
	StyleSheet,
	Alert,
	Animated,
	PanResponder,
	Text,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "@/config/supabase";
import TransactionStatusModal from "@/components/homescreen/TransactionStatusModal";
import PurchaseDetails from "@/components/confirmation/PurchaseDetails";
import ErrorModal from "@/components/confirmation/ErrorModal";

// Define constants
const THIRTY_DAYS_IN_MS = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
const LIZZYSUB_TOKEN =
	"b5b39c2645893a318c432507d00a91270f39bd987e5fcc904dc72276a00c";

// Define interfaces
interface DataBundle {
	id: number;
	data: string;
	price: number;
	validity: string;
	category: string;
	description?: string;
	planType: string;
}

interface Bundle {
	id: number;
	variation_code?: string;
	description?: string;
	amount?: number | null;
	name?: string;
	data?: string;
	price: number;
	validity?: string;
	category?: string;
	planType?: string;
}

interface Provider {
	id: number;
	name: string;
	image?: string;
	code: string;
	imageKey?: string;
}

const ConfirmationScreen: React.FC = () => {
	const {
		bundle,
		provider,
		phoneNumber,
		transactionPin,
		userEmail,
		referenceId,
		balance,
		networkId,
		planId,
		purchaseType, // New param to distinguish between data and airtime
	} = useLocalSearchParams<{
		bundle: string;
		provider: string;
		phoneNumber: string;
		transactionPin: string;
		userEmail: string;
		referenceId: string;
		balance: string;
		networkId: string;
		planId: string;
		purchaseType: "data" | "airtime";
	}>();

	const [selectedBundle, setSelectedBundle] = useState<Bundle | null>(null);
	const [selectedProvider, setSelectedProvider] = useState<Provider | null>(
		null,
	);
	const [parsedNetworkId, setParsedNetworkId] = useState<number>(
		parseInt(networkId || "0", 10),
	);
	const [parsedPlanId, setParsedPlanId] = useState<number>(
		parseInt(planId || "0", 10),
	);
	const [balanceValue, setBalanceValue] = useState<number>(
		parseFloat(balance || "0"),
	);
	const [editableMobileNumber, setEditableMobileNumber] = useState<string>(
		phoneNumber || "",
	);
	const [isEditingMobile, setIsEditingMobile] = useState<boolean>(false);
	const [networkProvider, setNetworkProvider] = useState<string>("");
	const [transactionModalVisible, setTransactionModalVisible] =
		useState<boolean>(false);
	const [transactionStatus, setTransactionStatus] = useState<
		"processing" | "success" | "failed"
	>("processing");
	const [isBalanceLoading, setIsBalanceLoading] = useState<boolean>(true);
	const [errorModalVisible, setErrorModalVisible] = useState<boolean>(false);
	const [userName, setUserName] = useState<string>("User");
	const [timeLeft, setTimeLeft] = useState<number>(4 * 60 * 60); // 4 hours in seconds

	const slideAnim = useRef(new Animated.Value(0)).current;
	const pulseAnim = useRef(new Animated.Value(1)).current;
	const pulseNetworkAnim = useRef(new Animated.Value(1)).current;

	// Parse params safely
	useEffect(() => {
		try {
			if (bundle) setSelectedBundle(JSON.parse(bundle));
			if (provider) {
				const parsedProvider = JSON.parse(provider);
				setSelectedProvider(parsedProvider);
				setNetworkProvider(parsedProvider.name || "");
			}
		} catch (error) {
			console.error("Error parsing params:", error);
			Alert.alert("Error", "Invalid data received. Please try again.");
			router.back();
		}
	}, [bundle, provider]);

	// Synchronize parsedNetworkId with selectedBundle.planType for Hot plans
	useEffect(() => {
		if (
			purchaseType === "data" &&
			selectedBundle?.category === "Hot" &&
			selectedBundle.planType
		) {
			const networkIds: { [key: string]: number } = {
				MTN: 1,
				GLO: 3,
				"9MOBILE": 4,
				AIRTEL: 2,
			};
			const expectedNetworkId = networkIds[selectedBundle.planType];
			if (expectedNetworkId && parsedNetworkId !== expectedNetworkId) {
				console.log("Synchronizing networkId:", {
					currentNetworkId: parsedNetworkId,
					expectedNetworkId,
					planType: selectedBundle.planType,
					bundleId: selectedBundle.id,
				});
				setParsedNetworkId(expectedNetworkId);
				setNetworkProvider(selectedBundle.planType);
				setSelectedProvider({
					...selectedProvider!,
					name: selectedBundle.planType,
					id: expectedNetworkId,
				});
			}
		}
	}, [selectedBundle, parsedNetworkId, selectedProvider, purchaseType]);

	// Fetch user name
	useEffect(() => {
		const fetchUserName = async () => {
			try {
				const { data, error } = await supabase
					.from("profiles")
					.select("username")
					.eq("email", userEmail)
					.single();

				if (error) {
					console.error("Error fetching user name:", error);
				} else if (data?.username) {
					setUserName(data.username);
				}
			} catch (err) {
				console.error("Error in fetchUserName:", err);
			}
		};

		if (userEmail) {
			fetchUserName();
		}
	}, [userEmail]);

	// Timer for error modal
	useEffect(() => {
		if (errorModalVisible && timeLeft > 0) {
			const timer = setInterval(() => {
				setTimeLeft((prev) => prev - 1);
			}, 1000);
			return () => clearInterval(timer);
		}
	}, [errorModalVisible, timeLeft]);

	// Fetch wallet balance and set up real-time subscription
	useEffect(() => {
		if (!userEmail) {
			console.error("User email missing");
			Alert.alert("Error", "User authentication missing");
			router.back();
			return;
		}

		const fetchWalletBalance = async () => {
			try {
				const { data: wallet, error } = await supabase
					.from("wallet")
					.select("balance")
					.eq("user_email", userEmail)
					.single();

				if (error && error.code !== "PGRST116") {
					console.error("Error fetching wallet balance:", error);
				} else {
					const walletBalance = wallet?.balance;
					setBalanceValue(walletBalance ?? balanceValue);
					console.log("Fetched wallet balance:", walletBalance);
				}
			} catch (err) {
				console.error("Error in fetchWalletBalance:", err);
			} finally {
				setIsBalanceLoading(false);
			}
		};

		fetchWalletBalance();

		const subscription = supabase
			.channel(`wallet-changes:${userEmail}`)
			.on(
				"postgres_changes",
				{
					event: "UPDATE",
					schema: "public",
					table: "wallet",
					filter: `user_email=eq.${userEmail}`,
				},
				(payload) => {
					console.log("Real-time Wallet Balance Update:", payload);
					setBalanceValue(payload.new.balance ?? balanceValue);
				},
			)
			.subscribe((status, err) => {
				if (err) {
					console.error("Subscription error:", err);
				}
				console.log("Subscription status:", status);
			});

		return () => {
			supabase.removeChannel(subscription);
		};
	}, [userEmail, balanceValue]);

	// Handle mobile number change
	const handleMobileNumberChange = (text: string) => {
		setEditableMobileNumber(text);
	};

	// PanResponder for slide to purchase
	const panResponder = useRef(
		PanResponder.create({
			onStartShouldSetPanResponder: () => true,
			onPanResponderMove: (evt, gs) => {
				if (gs.dx > 0) {
					slideAnim.setValue(gs.dx);
				}
			},
			onPanResponderRelease: (evt, gs) => {
				if (gs.dx > 100) {
					Animated.timing(slideAnim, {
						toValue: 300,
						duration: 200,
						useNativeDriver: true,
					}).start(() => {
						handlePurchase();
					});
				} else {
					Animated.timing(slideAnim, {
						toValue: 0,
						duration: 200,
						useNativeDriver: true,
					}).start();
				}
			},
		}),
	).current;

	// Pulse animation
	useEffect(() => {
		Animated.loop(
			Animated.sequence([
				Animated.timing(pulseAnim, {
					toValue: 1.2,
					duration: 1000,
					useNativeDriver: true,
				}),
				Animated.timing(pulseAnim, {
					toValue: 1,
					duration: 1000,
					useNativeDriver: true,
				}),
			]),
		).start();
	}, [pulseAnim]);

	// Pulse network animation
	useEffect(() => {
		Animated.loop(
			Animated.sequence([
				Animated.timing(pulseNetworkAnim, {
					toValue: 1.1,
					duration: 800,
					useNativeDriver: true,
				}),
				Animated.timing(pulseNetworkAnim, {
					toValue: 1,
					duration: 800,
					useNativeDriver: true,
				}),
			]),
		).start();
	}, [pulseNetworkAnim]);

	// Handle purchase logic
	const handlePurchase = async () => {
		if (
			!selectedBundle ||
			!selectedProvider ||
			!editableMobileNumber ||
			!referenceId ||
			!userEmail
		) {
			Alert.alert("Error", "Missing required information");
			return;
		}

		setTransactionModalVisible(true);
		setTransactionStatus("processing");

		try {
			const { data: walletData, error: walletError } = await supabase
				.from("wallet")
				.select("balance")
				.eq("user_email", userEmail)
				.single();

			if (walletError) {
				throw new Error(
					`Failed to fetch wallet balance: ${walletError.message}`,
				);
			}

			const currentBalance = walletData.balance;
			const basePrice = selectedBundle.price || selectedBundle.amount || 0;

			if (currentBalance < basePrice) {
				throw new Error("Insufficient balance");
			}

			const { error: deductError } = await supabase
				.from("wallet")
				.update({ balance: currentBalance - basePrice })
				.eq("user_email", userEmail);

			if (deductError) {
				throw new Error(`Failed to deduct from wallet: ${deductError.message}`);
			}

			setBalanceValue(currentBalance - basePrice);

			let response;
			let responseData;
			let responseText;

			if (purchaseType === "data") {
				// Data purchase API call
				const formData = new FormData();
				formData.append("network", parsedNetworkId.toString());
				formData.append("mobile", editableMobileNumber);
				formData.append("dataplan", parsedPlanId.toString());
				formData.append("payment_method", "wallet");
				formData.append("request_id", referenceId);

				response = await fetch("https://ebenkdata.com/api/v1/buy_data", {
					method: "POST",
					body: formData,
				});

				responseText = await response.text();
				try {
					responseData = JSON.parse(responseText);
				} catch {
					throw new Error(
						`Invalid JSON response: ${responseText.slice(0, 100)}`,
					);
				}

				if (!response.ok || responseData.status !== "success") {
					if (responseData.message?.includes("insufficient balance")) {
						setTransactionModalVisible(false);
						setErrorModalVisible(true);
						return;
					}
					const errorMessage =
						responseData.message || responseText.slice(0, 100);
					throw new Error(`Edata API request failed: ${errorMessage}`);
				}
			} else if (purchaseType === "airtime") {
				// Airtime purchase API call
				const formData = new FormData();
				formData.append("network", parsedNetworkId.toString());
				formData.append("mobile", editableMobileNumber);
				formData.append("amount", basePrice.toString());
				formData.append("payment_method", "wallet");
				formData.append("request_id", referenceId);

				response = await fetch("https://ebenkdata.com/api/v1/buy_airtime", {
					method: "POST",
					body: formData,
				});

				responseText = await response.text();
				try {
					responseData = JSON.parse(responseText);
				} catch {
					throw new Error(
						`Invalid JSON response: ${responseText.slice(0, 100)}`,
					);
				}

				if (!response.ok || responseData.status !== "success") {
					if (
						responseText.includes(
							"You can't purchase this airtime due to insufficient balance",
						)
					) {
						setTransactionModalVisible(false);
						setErrorModalVisible(true);
						return;
					}

					const errorMessage =
						responseData.message || responseText.slice(0, 100);
					throw new Error(`Edata Airtime API request failed: ${errorMessage}`);
				}
			}

			const actualCost = basePrice;

			// Record transaction with specific metadata based on purchase type
			const transactionData = {
				user_email: userEmail,
				amount: -basePrice,
				reference: referenceId,
				status: "success",
				env: "live",
				metadata:
					purchaseType === "data"
						? {
								reference: referenceId,
								plan: selectedBundle.data || `Plan ID ${parsedPlanId}`,
								provider: selectedProvider.name,
								amount: actualCost,
								phone_number: editableMobileNumber,
								validity: selectedBundle.validity || "N/A",
								payment_date: new Date().toLocaleString([], {
									timeZone: "Africa/Lagos",
								}),
								payment_method: "Wallet",
							}
						: purchaseType === "airtime"
							? {
									reference: referenceId,
									provider: selectedProvider.name,
									amount: actualCost,
									phone_number: editableMobileNumber,
									payment_date: new Date().toLocaleString([], {
										timeZone: "Africa/Lagos",
									}),
									payment_method: "Wallet",
								}
							: {
									fees: {
										vat: 10,
										total_fee: 50,
										net_amount: basePrice - 50,
										transfer_fee: 10,
										api_network_fee: 20,
										wallet_management_fee: 10,
									},
									payment_date: new Date().toLocaleString([], {
										timeZone: "Africa/Lagos",
									}),
									custom_fields: [
										{
											value: "Edges Network",
											display_name: "Mobile Payment",
											variable_name: "mobile_payment",
										},
									],
									payment_method: "Wallet",
								},
			};

			const { error: txError } = await supabase
				.from("transactions")
				.insert(transactionData);

			if (txError) {
				const { error: refundError } = await supabase
					.from("wallet")
					.update({ balance: currentBalance })
					.eq("user_email", userEmail);

				if (refundError) {
					console.error(
						"Error refunding wallet balance after transaction failure:",
						refundError,
					);
					throw new Error(
						`Failed to refund wallet balance: ${refundError.message}`,
					);
				}

				setBalanceValue(currentBalance);
				throw new Error(`Transaction recording failed: ${txError.message}`);
			}

			setTransactionStatus("success");

			Alert.alert(
				"Success",
				purchaseType === "data"
					? `Successfully purchased ${selectedBundle.data || `Plan ID ${parsedPlanId}`} on ${selectedProvider.name} for ₦${formatNumberWithCommas(actualCost)}. Sent to ${editableMobileNumber}.`
					: `Successfully purchased ₦${formatNumberWithCommas(actualCost)} airtime on ${selectedProvider.name}. Sent to ${editableMobileNumber}.`,
			);

			router.push({
				pathname: "/success",
				params: {
					id: referenceId,
					provider: selectedProvider.name,
					data:
						purchaseType === "data"
							? selectedBundle.data || `Plan ID ${parsedPlanId}`
							: `Airtime ₦${actualCost}`,
					price: actualCost.toString(),
					date: new Date().toISOString(),
					status: "Success",
					phoneNumber: editableMobileNumber,
					reference: referenceId,
					metadata: JSON.stringify({
						validity:
							purchaseType === "data"
								? selectedBundle.validity || "N/A"
								: undefined,
						payment_method: "Wallet",
						type: purchaseType,
						actual_cost: actualCost,
					}),
				},
			});
		} catch (error: any) {
			console.error("Error initiating purchase:", error);
			setTransactionStatus("failed");
			setTransactionModalVisible(false);
			if (!errorModalVisible) {
				Alert.alert(
					"Error",
					`Failed to initiate purchase: ${error.message || "Please try again."}`,
				);
			}
		}
	};

	const handleCancel = () => {
		router.back();
	};

	const closeTransactionModal = () => {
		setTransactionModalVisible(false);
	};

	const closeErrorModal = () => {
		setErrorModalVisible(false);
		router.back();
	};

	const toggleEditMobile = () => {
		setIsEditingMobile(!isEditingMobile);
	};

	const purchaseDescription = () =>
		purchaseType === "data"
			? selectedBundle?.data || `Plan ID ${parsedPlanId}`
			: `Airtime ₦${(selectedBundle?.price || selectedBundle?.amount) ?? 0}`;

	// Helper to format numbers (used in alerts)
	const formatNumberWithCommas = (number: number): string => {
		return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	};

	if (!selectedBundle || !selectedProvider) {
		return (
			<View style={styles.container}>
				<Text style={{ color: "#fff" }}>Loading...</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<View style={styles.content}>
				<PurchaseDetails
					selectedBundle={selectedBundle}
					selectedProvider={selectedProvider}
					balanceValue={balanceValue}
					isBalanceLoading={isBalanceLoading}
					editableMobileNumber={editableMobileNumber}
					handleMobileNumberChange={handleMobileNumberChange}
					toggleEditMobile={toggleEditMobile}
					handleCancel={handleCancel}
					referenceId={referenceId || ""}
					pulseAnim={pulseAnim}
				/>
				<Animated.View
					{...panResponder.panHandlers}
					style={[
						styles.slideContainer,
						{ transform: [{ translateX: slideAnim }] },
					]}
				>
					<View style={styles.slideTextContainer}>
						<Text style={styles.slideText}>Slide to Purchase</Text>
						<Ionicons name="arrow-forward" size={20} color="#3B82F6" />
					</View>
				</Animated.View>
			</View>
			<TransactionStatusModal
				visible={transactionModalVisible}
				onClose={closeTransactionModal}
				transactionStatus={transactionStatus}
				selectedPlan={selectedBundle as DataBundle} // Type cast if needed
				phoneNumber={editableMobileNumber}
				networkProvider={networkProvider}
			/>
			<ErrorModal
				visible={errorModalVisible}
				onClose={closeErrorModal}
				userName={userName}
				purchaseDescription={purchaseDescription()}
				timeLeft={timeLeft}
				pulseNetworkAnim={pulseNetworkAnim}
			/>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "black",
		justifyContent: "center",
		alignItems: "center",
	},
	content: {
		flex: 1,
		paddingHorizontal: 16,
		paddingTop: 48,
		width: "100%",
	},
	slideContainer: {
		marginTop: 16,
		paddingVertical: 10,
		paddingHorizontal: 20,
		backgroundColor: "#1A1A1A",
		borderRadius: 8,
		overflow: "visible",
		zIndex: 1,
		accessible: true,
		accessibilityLabel: "button",
	},
	slideTextContainer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	slideText: {
		fontSize: 16,
		fontWeight: "600",
		color: "#3B82F6",
	},
});

export default ConfirmationScreen;