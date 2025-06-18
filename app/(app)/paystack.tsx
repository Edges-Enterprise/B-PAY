import { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Dimensions,
  Linking,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "@/config/supabase";
import { WebView } from "react-native-webview";
import { v4 as uuidv4 } from "uuid";
import "react-native-get-random-values";
import * as Sentry from "@sentry/react-native";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: "production",
});

const { width, height } = Dimensions.get("window");

const PaymentScreen = () => {
  const { amount, userEmail, userName, userId, reference } = useLocalSearchParams();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentReference, setPaymentReference] = useState(reference as string || "");
  const [showWebView, setShowWebView] = useState(false);

  const PAYSTACK_PUBLIC_KEY = process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY;
  const PAYSTACK_CALLBACK_URL = process.env.PAYSTACK_CALLBACK_URL || "edgesnetwork://payment-callback";

  useEffect(() => {
    console.log("PaymentScreen params:", { amount, userEmail, userName, userId, reference });
    console.log("Environment Variables:", {
      PAYSTACK_PUBLIC_KEY,
      PAYSTACK_CALLBACK_URL,
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    });
    Sentry.captureMessage("PaymentScreen mounted", {
      extra: { amount, userEmail, userName, userId, paymentReference },
    });

    if (!PAYSTACK_PUBLIC_KEY || !PAYSTACK_PUBLIC_KEY.startsWith("pk_live_")) {
      console.error("Invalid or missing Paystack public key");
      Alert.alert("Error", "Payment configuration error. Please contact support.");
      router.back();
      return;
    }
  }, [PAYSTACK_PUBLIC_KEY]);

  useEffect(() => {
    let subscription;

    if (paymentReference) {
      subscription = supabase
        .channel(`payment-confirm:${paymentReference}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "transactions",
            filter: `reference=eq.${paymentReference}`,
          },
          ( AMOUNT: number, reference: string, userEmail: string) => {
            if (payload.new.status === "success") {
              router.push("/wallet");
            }
          }
        )
        .subscribe();
    }

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [paymentReference]);

  useEffect(() => {
    const handleDeepLink = async ({ url }) => {
      console.log("Deep link received:", url);
      if (url.includes("edgesnetwork://payment-callback")) {
        const reference = new URL(url).searchParams.get("reference");
        if (reference) {
          await handleWebViewMessage({ nativeEvent: { data: `payment-success:${reference}` } });
        }
      }
    };

    Linking.addEventListener("url", handleDeepLink);
    return () => Linking.removeEventListener("url", handleDeepLink);
  }, []);

  const sendTestReceipt = async (
    reference: string,
    amount: string,
    email: string
  ) => {
    try {
      const parsedAmount = parseFloat(amount);
      const feePercentage = 0.1;
      const feeAmount = parsedAmount * feePercentage;
      const netAmount = parsedAmount - feeAmount;

      const receiptDetails = {
        to: email,
        subject: "Payment Receipt - Edges Network",
        body: `
          Payment Receipt
          ----------------
          Reference: ${reference}
          Amount Paid: ₦${parsedAmount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
          Fees:
            - Transfer Fee (2%): ₦${(parsedAmount * 0.02).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
            - Wallet Management Fee (2%): ₦${(parsedAmount * 0.02).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
            - API & Network Protocols Fee (4%): ₦${(parsedAmount * 0.04).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
            - VAT (2%): ₦${(parsedAmount * 0.02).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
          Total Fees (10%): ₦${feeAmount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
          Amount Credited to Your Wallet: ₦${netAmount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
          Date: ${new Date().toLocaleString()}
          Status: Successful
          ----------------
          View your wallet balance in the Edges Network app.
          Thank you for your payment!
        `,
      };
      console.log("Sending receipt:", receiptDetails);
    } catch (error) {
      console.error("Error sending receipt:", error);
      Sentry.captureException(error);
    }
  };

  const verifyPaystackTransaction = async (reference: string, expectedAmount: number) => {
    try {
      const { data, error } = await supabase.functions.invoke("verify-paystack-transaction", {
        body: { reference, expectedAmount },
      });

      if (error) {
        console.error("Supabase function error:", error);
        Sentry.captureException(error);
        return false;
      }

      if (data.status) {
        return true;
      } else {
        console.error("Transaction verification failed:", data.error);
        Sentry.captureMessage(`Transaction verification failed: ${data.error}`);
        return false;
      }
    } catch (error) {
      console.error("Error verifying Paystack transaction:", error);
      Sentry.captureException(error);
      return false;
    }
  };

  const updateWalletBalance = async (
    userEmail: string,
    amount: number,
    transactionId: string,
    reference: string
  ) => {
    try {
      const feePercentage = 0.1;
      const netAmount = amount * (1 - feePercentage);
      const feeAmount = amount * feePercentage;

      console.log(
        `Deducting 10% fee (₦${feeAmount.toFixed(2)}) from deposit of ₦${amount}. Crediting ₦${netAmount.toFixed(2)} to user wallet`
      );

      const { data: wallet, error: fetchError } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_email", userEmail)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        throw fetchError;
      }

      let newBalance = netAmount;
      if (wallet) {
        newBalance = wallet.balance + netAmount;
        const { error: updateError } = await supabase
          .from("wallets")
          .update({ balance: newBalance })
          .eq("user_email", userEmail);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("wallets")
          .insert({ user_email: userEmail, balance: newBalance });

        if (insertError) throw insertError;
      }

      console.log(
        `Wallet balance updated for ${userEmail}: ₦${newBalance.toFixed(2)}`
      );

      const feeEntries = [
        { fee_type: "transfer_fee", amount: amount * 0.02 },
        { fee_type: "wallet_management_fee", amount: amount * 0.02 },
        { fee_type: "api_network_fee", amount: amount * 0.04 },
        { fee_type: "vat", amount: amount * 0.02 },
        { fee_type: "total_fee", amount: feeAmount },
      ];

      const { error: ledgerError } = await supabase
        .from("business_ledger")
        .insert(
          feeEntries.map((entry) => ({
            id: uuidv4(),
            transaction_id: transactionId,
            user_email: userEmail,
            fee_amount: entry.amount,
            fee_type: entry.fee_type,
          }))
        );

      if (ledgerError) {
        console.error("Error recording fees in business_ledger:", ledgerError);
        Sentry.captureException(ledgerError);
        throw new Error("Failed to record business fees");
      }

      console.log(
        `Recorded fees for transaction ${reference}: ₦${feeAmount.toFixed(2)}`
      );
    } catch (error) {
      console.error("Error updating wallet balance:", error);
      Sentry.captureException(error);
      throw new Error("Failed to update wallet balance");
    }
  };

  const handleFundWallet = async () => {
    try {
      if (!PAYSTACK_PUBLIC_KEY) {
        throw new Error("Payment configuration error: Missing Paystack public key");
      }

      const parsedAmount = parseFloat(amount as string);
      if (!amount || isNaN(parsedAmount)) {
        throw new Error("Invalid amount");
      }
      if (parsedAmount < 500) {
        throw new Error("Minimum funding amount is ₦500");
      }
      if (!userEmail) {
        throw new Error("User email is required");
      }
      if (!userName) {
        throw new Error("User username is required");
      }
      if (!userId) {
        throw new Error("User ID is required");
      }

      const feePercentage = 0.1;
      const netAmount = parsedAmount - (parsedAmount * feePercentage);

      const transactionId = uuidv4();
      const transactionReference = paymentReference || `EDGES_${userId}_${Date.now()}`;
      if (!paymentReference) {
        setPaymentReference(transactionReference);
      }

      const transactionData = {
        id: transactionId,
        user_email: userEmail as string,
        amount: parsedAmount,
        reference: transactionReference,
        status: "pending",
        metadata: {
          custom_fields: [
            {
              display_name: "Mobile Payment",
              variable_name: "mobile_payment",
              value: "Edges Network",
            },
          ],
          payment_date: new Date().toISOString(),
          fees: {
            transfer_fee: parsedAmount * 0.02,
            wallet_management_fee: parsedAmount * 0.02,
            api_network_fee: parsedAmount * 0.04,
            vat: parsedAmount * 0.02,
            total_fee: parsedAmount * feePercentage,
            net_amount: netAmount,
          },
        },
      };

      console.log(
        "Inserting pending transaction:",
        JSON.stringify(transactionData, null, 2)
      );

      const { data: pendingTx, error: pendingTxError } = await supabase
        .from("transactions")
        .insert(transactionData)
        .select("id")
        .single();

      if (pendingTxError) {
        console.error(
          "Pending transaction insert error:",
          JSON.stringify(pendingTxError, null, 2)
        );
        Sentry.captureException(pendingTxError);
        throw new Error(
          `Failed to record pending transaction: ${pendingTxError.message}`
        );
      }

      setIsProcessing(true);
      setShowWebView(true);
    } catch (err) {
      console.error("Error in handleFundWallet:", err);
      Sentry.captureException(err);
      Alert.alert("Error", err.message || "An unexpected error occurred");
      setIsProcessing(false);
      router.back();
    }
  };

  const handleWebViewMessage = async (event: any): Promise<void> => {
    const data = event.nativeEvent.data;
    console.log("WebView message:", data);
    try {
      if (data.startsWith("payment-success:")) {
        const reference = data.split(":")[1];
        console.log(`Processing payment success for reference: ${reference}`);
        const parsedAmount = parseFloat(amount as string);
        const isValidAmount = await verifyPaystackTransaction(reference, parsedAmount);
        if (!isValidAmount) {
          await supabase
            .from("transactions")
            .update({ status: "failed" })
            .eq("reference", reference);
          throw new Error("Invalid payment amount. Please send the exact amount specified.");
        }

        const { error: successError } = await supabase
          .from("transactions")
          .update({ status: "success" })
          .eq("reference", reference);

        if (successError) {
          console.error(
            "Success transaction update error:",
            JSON.stringify(successError, null, 2)
          );
          Sentry.captureException(successError);
          throw new Error(
            `Failed to update transaction status: ${successError.message}`
          );
        }

        const { data: transaction, error: fetchTxError } = await supabase
          .from("transactions")
          .select("id, amount")
          .eq("reference", reference)
          .single();

        if (fetchTxError || !transaction) {
          console.error(
            "Fetch transaction error:",
            JSON.stringify(fetchTxError, null, 2)
          );
          Sentry.captureException(fetchTxError);
          throw new Error(
            `Failed to fetch transaction details: ${fetchTxError?.message || "No transaction found"}`
          );
        }

        await updateWalletBalance(
          userEmail as string,
          transaction.amount,
          transaction.id,
          reference
        );
        await sendTestReceipt(reference, amount as string, userEmail as string);

        setShowWebView(false);
        setIsProcessing(false);
        setPaymentReference("");
        router.push("/wallet");
      } else if (data.startsWith("payment-error:")) {
        const errorMessage = data.split(":")[1];
        console.error("Paystack error:", errorMessage);
        Sentry.captureMessage(`Paystack error: ${errorMessage}`);
        Alert.alert("Error", `Payment initialization failed: ${errorMessage}`);
        setShowWebView(false);
        setIsProcessing(false);
        router.back();
      } else if (data.startsWith("copy-success:")) {
        const copiedText = data.split(":")[1];
        console.log(`Successfully copied to clipboard: ${copiedText}`);
        Alert.alert("Success", "Account number copied to clipboard!");
      } else if (data === "payment-cancelled") {
        const { error: failedError } = await supabase
          .from("transactions")
          .update({ status: "failed" })
          .eq("user_email", userEmail as string)
          .eq("status", "pending")
          .eq("amount", parseFloat(amount as string));

        if (failedError) {
          console.error(
            "Failed transaction update error:",
            JSON.stringify(failedError, null, 2)
          );
          Sentry.captureException(failedError);
          throw new Error(
            `Failed to update transaction status: ${failedError.message}`
          );
        }

        Alert.alert("Cancelled", "Payment was cancelled.");
        setShowWebView(false);
        setIsProcessing(false);
        setPaymentReference("");
        router.back();
      } else if (data === "payment-declined") {
        const { error: failedError } = await supabase
          .from("transactions")
          .update({ status: "failed" })
          .eq("user_email", userEmail as string)
          .eq("status", "pending")
          .eq("amount", parseFloat(amount as string));

        if (failedError) {
          console.error(
            "Failed transaction update error:",
            JSON.stringify(failedError, null, 2)
          );
          Sentry.captureException(failedError);
          throw new Error(
            `Failed to update transaction status: ${failedError.message}`
          );
        }

        Alert.alert("Declined", "Payment was not completed.");
        setShowWebView(false);
        setIsProcessing(false);
        setPaymentReference("");
        router.back();
      } else if (data.startsWith("console:")) {
        console.log("WebView console:", JSON.parse(data.split(":")[1]));
      } else if (data.startsWith("console-error:")) {
        console.error("WebView console error:", JSON.parse(data.split(":")[1]));
        Sentry.captureMessage("WebView console error", {
          extra: { consoleError: JSON.parse(data.split(":")[1]) },
        });
      }
    } catch (err) {
      console.error("Error processing transaction:", err);
      Sentry.captureException(err);
      Alert.alert(
        "Error",
        `Failed to process transaction: ${err.message || "Unknown error"}`
      );
      setShowWebView(false);
      setIsProcessing(false);
      router.back();
    }
  };

  const generatePaystackHTML = (): string => {
    const transactionReference = paymentReference || `EDGES_${userId}_${Date.now()}`;
    console.log(`Generating Paystack HTML with reference: ${transactionReference}`);
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://js.paystack.co; connect-src 'self' https://api.paystack.co https://checkout.paystack.com; frame-src 'self' https://js.paystack.co https://checkout.paystack.com;">
        <title>Paystack Payment</title>
        <script src="https://js.paystack.co/v1/inline.js"></script>
        <style>
          body {
            margin: 0;
            padding: 0;
            width: 100vw;
            height: 100vh;
            background: #1A2526;
            font-family: Arial, sans-serif;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
          }
          .container {
            margin-top: 40px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            width: ${width}px;
            max-width: 100%;
          }
          #paystackIframe {
            width: ${width * 0.9}px;
            max-width: 500px;
            height: ${height * 0.6}px;
            border: none;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div id="paystackIframe"></div>
        </div>
        <script>
          const handler = PaystackPop.setup({
            key: '${PAYSTACK_PUBLIC_KEY || ""}',
            email: '${userEmail}',
            amount: ${parseFloat(amount as string) * 100},
            currency: 'NGN',
            channels: ['card', 'bank_transfer'],
            ref: '${transactionReference}',
            callback_url: '${PAYSTACK_CALLBACK_URL}',
            metadata: {
              custom_fields: [
                {
                  display_name: "Mobile Payment",
                  variable_name: "mobile_payment",
                  value: "Edges Network"
                }
              ]
            },
            onClose: function() {
              window.ReactNativeWebView.postMessage('payment-cancelled');
            },
            callback: function(response) {
              window.ReactNativeWebView.postMessage('payment-success:' + response.reference);
            },
            onError: function(error) {
              console.error('Paystack error:', error);
              window.ReactNativeWebView.postMessage('payment-error:' + error.message);
            }
          });
          try {
            handler.openIframe();
          } catch (error) {
            console.error('Iframe open error:', error);
            window.ReactNativeWebView.postMessage('payment-error:' + error.message);
          }

          function copyToClipboard(text) {
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(text).then(() => {
                window.ReactNativeWebView.postMessage('copy-success:' + text);
              }).catch(err => {
                console.error('Clipboard API failed:', err);
                const textarea = document.createElement('textarea');
                textarea.value = text;
                document.body.appendChild(textarea);
                textarea.select();
                try {
                  document.execCommand('copy');
                  window.ReactNativeWebView.postMessage('copy-success:' + text);
                } catch (e) {
                  console.error('Fallback copy failed:', e);
                }
                document.body.removeChild(textarea);
              });
            } else {
              const textarea = document.createElement('textarea');
              textarea.value = text;
              document.body.appendChild(text extends: stringarea);
              textarea.select();
              try {
                document.execCommand('copy');
                window.ReactNativeWebView.postMessage('copy-success:' + text);
              } catch (e) {
                console.error('Fallback copy failed:', e);
              }
              document.body.removeChild(textarea);
            }
          }

          document.addEventListener('copy', (e) => {
            e.stopPropagation();
          });

          const observer = new MutationObserver((mutations) => {
            const accountNumberElement = document.querySelector('span[class*="account-number"], p[class*="account-number"], div[class*="account-number"]');
            const copyButton = document.querySelector('button[class*="copy"], button[title*="copy"], button[aria-label*="copy"]');
            
            if (accountNumberElement && copyButton) {
              const accountNumber = accountNumberElement.textContent.trim();
              copyButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                copyToClipboard(accountNumber);
              }, { once: true });
              observer.disconnect();
            }
          });

          observer.observe(document.body, {
            childList: true,
            subtree: true
          });
        </script>
      </body>
      </html>
    `;
  };

  useEffect(() => {
    handleFundWallet();
  }, []);

  if (showWebView) {
    return (
      <SafeAreaView style={styles.webViewContainer}>
        <WebView
          source={{ html: generatePaystackHTML() }}
          onMessage={handleWebViewMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          mixedContentMode="always"
          style={{ flex: 1, width, height }}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#000" />
            </View>
          )}
          onShouldStartLoadWithRequest={(request) => {
            console.log("WebView loading URL:", request.url);
            if (request.url.includes("paystack") || request.url.includes("edgesnetwork")) {
              return true;
            }
            console.log("Blocked external navigation:", request.url);
            return false;
          }}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error("WebView error:", nativeEvent);
            Sentry.captureException(new Error(`WebView error: ${JSON.stringify(nativeEvent)}`));
            Alert.alert("Error", "Failed to load payment page. Please try again.");
            setShowWebView(false);
            setIsProcessing(false);
            router.back();
          }}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error("WebView HTTP error:", nativeEvent);
            Sentry.captureException(new Error(`WebView HTTP error: ${JSON.stringify(nativeEvent)}`));
            Alert.alert("Error", "Failed to load payment resources. Please check your connection.");
            setShowWebView(false);
            setIsProcessing(false);
            router.back();
          }}
          injectedJavaScript={`
            console.log = function(...args) {
              window.ReactNativeWebView.postMessage('console:' + JSON.stringify(args));
            };
            console.error = function(...args) {
              window.ReactNativeWebView.postMessage('console-error:' + JSON.stringify(args));
            };
          `}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.webViewContainer}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  webViewContainer: {
    flex: 1,
    backgroundColor: "#1A2526",
    width: width,
    height: height,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1A2526",
    width: width,
    height: height,
  },
});

export default PaymentScreen;