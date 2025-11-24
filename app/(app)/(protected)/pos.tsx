// app/pos.tsx
'use client';

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
  Vibration,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;

// DUMMY DATA FOR PROTOTYPE
const DUMMY_LOCAL_CARD = {
  type: "Local",
  name: "CHIDI OKONKWO",
  number: "•••• •••• •••• 4832",
  expiry: "12/26",
  bank: "First Bank",
};

const DUMMY_FOREIGN_CARD = {
  type: "Foreign",
  name: "JOHN SMITH",
  number: "•••• •••• •••• 9012",
  expiry: "09/27",
  currency: "USD",
};

const DUMMY_VIRTUAL_CARD = {
  type: "Virtual",
  name: "Your Default VC",
  number: "•••• •••• •••• 7741",
  expiry: "06/28",
  cvv: "•••",
};

export default function POS() {
  // UI States
  const [selectedCardType, setSelectedCardType] = React.useState<"local" | "foreign" | "virtual" | null>(null);
  const [showScanner, setShowScanner] = React.useState(false);
  const [showKeypad, setShowKeypad] = React.useState(true); // Start with keypad
  const [showVirtualModal, setShowVirtualModal] = React.useState(false);
  const [cardDetails, setCardDetails] = React.useState<any>(null);
  const [amount, setAmount] = React.useState("0.00");
  const [showConfirmModal, setShowConfirmModal] = React.useState(false);
  const [showSurchargeModal, setShowSurchargeModal] = React.useState(false);
  const [showPinModal, setShowPinModal] = React.useState(false);
  const [showProcessing, setShowProcessing] = React.useState(false);
  const [transactionResult, setTransactionResult] = React.useState<{status: 'approved' | 'declined', authCode?: string} | null>(null);
  const [showReceiptModal, setShowReceiptModal] = React.useState(false);
  const [pin, setPin] = React.useState("");
  const [randomizedPin, setRandomizedPin] = React.useState<number[]>([]);
  const [surchargeAmount, setSurchargeAmount] = React.useState(0);

  // Initialize randomized PIN layout
  React.useEffect(() => {
    generateRandomizedPin();
  }, []);

  const generateRandomizedPin = () => {
    const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
    for (let i = nums.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nums[i], nums[j]] = [nums[j], nums[i]];
    }
    setRandomizedPin(nums);
  };

  // Handle keypad input
  const handleKeypadInput = (value: string) => {
    Vibration.vibrate([0, 5]); // Quick vibration
    if (value === "backspace") {
      setAmount((prev) => {
        if (prev === "0.00") return "0.00";
        const newVal = prev.slice(0, -1);
        return newVal === "" ? "0.00" : newVal;
      });
    } else if (value === ".") {
      if (!amount.includes(".")) {
        setAmount((prev) => prev + ".");
      }
    } else {
      setAmount((prev) => {
        if (prev === "0.00") return value;
        return prev + value;
      });
    }
  };

  const handleCardTypeSelect = (type: "local" | "foreign" | "virtual") => {
    Vibration.vibrate([0, 5]);
    setSelectedCardType(type);
    setCardDetails(null);
    setShowKeypad(false);
    if (type === "virtual") {
      setShowVirtualModal(true);
    } else {
      setShowScanner(true);
    }
  };

  const handleVirtualSelect = (option: "default" | "scan" | "manual") => {
    Vibration.vibrate([0, 5]);
    setShowVirtualModal(false);
    if (option === "default") {
      setCardDetails(DUMMY_VIRTUAL_CARD);
      setShowKeypad(true);
    } else if (option === "scan") {
      setShowScanner(true);
    } else {
      setCardDetails({ ...DUMMY_VIRTUAL_CARD, name: "MANUAL ENTRY" });
      setShowKeypad(true);
    }
  };

  // Simulate card scan
  const handleCardScan = () => {
    setTimeout(() => {
      let dummy;
      if (selectedCardType === "local") dummy = DUMMY_LOCAL_CARD;
      else if (selectedCardType === "foreign") dummy = DUMMY_FOREIGN_CARD;
      else dummy = DUMMY_VIRTUAL_CARD;
      setCardDetails(dummy);
      setShowScanner(false);
      setShowKeypad(true);
      
      // Calculate surcharge for foreign cards
      if (selectedCardType === "foreign") {
        const surcharge = parseFloat(amount) * 0.02; // 2% surcharge
        setSurchargeAmount(parseFloat(surcharge.toFixed(2)));
        setShowSurchargeModal(true);
      } else {
        // Skip confirmation, go directly to PIN entry
        setShowPinModal(true);
      }
    }, 1800);
  };

  React.useEffect(() => {
    if (showScanner) {
      handleCardScan();
    }
  }, [showScanner]);

  const handleSurchargeAccept = () => {
    Vibration.vibrate([0, 5]);
    setShowSurchargeModal(false);
    // Skip confirmation, go directly to PIN entry
    setShowPinModal(true);
  };

  const handlePinInput = (digit: number) => {
    Vibration.vibrate([0, 5]); // Quick vibration
    if (pin.length < 4) {
      setPin(prev => prev + digit.toString());
    }
  };

  const handlePinBackspace = () => {
    Vibration.vibrate([0, 5]); // Quick vibration
    setPin(prev => prev.slice(0, -1));
  };

  const handlePinSubmit = () => {
    Vibration.vibrate([0, 5]);
    if (pin.length === 4) {
      setShowPinModal(false);
      setShowProcessing(true);
      
      // Simulate processing
      setTimeout(() => {
        const isSuccess = Math.random() > 0.1; // 90% success rate
        const authCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
        setTransactionResult({
          status: isSuccess ? 'approved' : 'declined',
          authCode: authCode
        });
        setShowProcessing(false);
        setShowReceiptModal(true);
      }, 3000);
    }
  };

  const handleReceiptOption = (option: string) => {
    Vibration.vibrate([0, 5]);
    setShowReceiptModal(false);
    
    // Reset everything after transaction
    setTimeout(() => {
      setSelectedCardType(null);
      setCardDetails(null);
      setAmount("0.00");
      setPin("");
      setTransactionResult(null);
      setShowKeypad(true);
      generateRandomizedPin();
    }, 500);
  };

  const resetPOS = () => {
    Vibration.vibrate([0, 5]);
    setSelectedCardType(null);
    setCardDetails(null);
    setAmount("0.00");
    setPin("");
    setTransactionResult(null);
    setShowKeypad(true);
    generateRandomizedPin();
  };

  // Create individual handlers for PIN keypad
  const handlePinKey1Press = () => handlePinInput(randomizedPin[0]);
  const handlePinKey2Press = () => handlePinInput(randomizedPin[1]);
  const handlePinKey3Press = () => handlePinInput(randomizedPin[2]);
  const handlePinKey4Press = () => handlePinInput(randomizedPin[3]);
  const handlePinKey5Press = () => handlePinInput(randomizedPin[4]);
  const handlePinKey6Press = () => handlePinInput(randomizedPin[5]);
  const handlePinKey7Press = () => handlePinInput(randomizedPin[6]);
  const handlePinKey8Press = () => handlePinInput(randomizedPin[7]);
  const handlePinKey9Press = () => handlePinInput(randomizedPin[8]);
  const handlePinKey0Press = () => handlePinInput(0);

  // Create individual handlers for amount keypad to ensure proper execution
  const handleKey1Press = () => handleKeypadInput('1');
  const handleKey2Press = () => handleKeypadInput('2');
  const handleKey3Press = () => handleKeypadInput('3');
  const handleKey4Press = () => handleKeypadInput('4');
  const handleKey5Press = () => handleKeypadInput('5');
  const handleKey6Press = () => handleKeypadInput('6');
  const handleKey7Press = () => handleKeypadInput('7');
  const handleKey8Press = () => handleKeypadInput('8');
  const handleKey9Press = () => handleKeypadInput('9');
  const handleKey0Press = () => handleKeypadInput('0');
  const handleKeyDotPress = () => handleKeypadInput('.');
  const handleKeyBackspacePress = () => handleKeypadInput('backspace');

  return (
    <>
      <SafeAreaView style={styles.container}>
        {/* WATERMARK */}
        <Image
          source={require("@/assets/icons/nu.png")}
          style={styles.watermark}
          resizeMode="contain"
          tintColor="#FFD700"
        />

        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.terminalTitle}>POS</Text>
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>ONLINE • READY</Text>
          </View>
        </View>

        {/* CARD TYPE SELECTION */}
        <View style={styles.cardTypeSection}>
          <Text style={styles.sectionTitle}>SELECT CARD TYPE</Text>
          <View style={styles.cardGrid}>
            <TouchableOpacity
              style={[
                styles.cardOption,
                selectedCardType === "local" && styles.cardSelected,
              ]}
              onPress={() => handleCardTypeSelect("local")}
              disabled={!amount || amount === "0.00" || amount === "."}
            >
              <MaterialCommunityIcons name="credit-card" size={30} color="#FFD700" />
              <Text style={styles.cardLabel}>Local</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.cardOption,
                selectedCardType === "foreign" && styles.cardSelected,
              ]}
              onPress={() => handleCardTypeSelect("foreign")}
              disabled={!amount || amount === "0.00" || amount === "."}
            >
              <Ionicons name="globe" size={30} color="#00FF7F" />
              <Text style={styles.cardLabel}>Foreign</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.cardOption,
                selectedCardType === "virtual" && styles.cardSelected,
              ]}
              onPress={() => handleCardTypeSelect("virtual")}
              disabled={!amount || amount === "0.00" || amount === "."}
            >
              <MaterialCommunityIcons name="cellphone-wireless" size={30} color="#FFD700" />
              <Text style={styles.cardLabel}>Virtual</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* INTERACTION AREA */}
        <View style={styles.interactionArea}>
          {showScanner ? (
            <View style={styles.scanner}>
              <View style={styles.scanLine} />
              <Text style={styles.scanText}>SCANNING CARD...</Text>
              <Text style={styles.scanSub}>Hold card near reader</Text>
            </View>
          ) : showKeypad ? (
            <View style={styles.keypadSection}>
              {/* Amount Display */}
              <View style={styles.amountDisplay}>
                <Text style={styles.currency}>₦</Text>
                <Text style={styles.amountValue}>{amount}</Text>
              </View>

              {/* Card Details */}
              {cardDetails && (
                <View style={styles.cardDetails}>
                  <Text style={styles.detailName}>{cardDetails.name}</Text>
                  <Text style={styles.detailNumber}>{cardDetails.number}</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>EXP: {cardDetails.expiry}</Text>
                    {cardDetails.cvv && (
                      <Text style={styles.detailLabel}>CVV: {cardDetails.cvv}</Text>
                    )}
                    {cardDetails.bank && (
                      <Text style={styles.detailLabel}>• {cardDetails.bank}</Text>
                    )}
                  </View>
                </View>
              )}

              {/* PCI Compliant Numeric Keypad */}
              <View style={styles.keypadWrapper}>
                <View style={styles.customKeypad}>
                  <TouchableOpacity style={styles.keypadButton} onPress={handleKey1Press}>
                    <Text style={styles.keypadButtonText}>1</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.keypadButton} onPress={handleKey2Press}>
                    <Text style={styles.keypadButtonText}>2</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.keypadButton} onPress={handleKey3Press}>
                    <Text style={styles.keypadButtonText}>3</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.keypadButton} onPress={handleKey4Press}>
                    <Text style={styles.keypadButtonText}>4</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.keypadButton} onPress={handleKey5Press}>
                    <Text style={styles.keypadButtonText}>5</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.keypadButton} onPress={handleKey6Press}>
                    <Text style={styles.keypadButtonText}>6</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.keypadButton} onPress={handleKey7Press}>
                    <Text style={styles.keypadButtonText}>7</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.keypadButton} onPress={handleKey8Press}>
                    <Text style={styles.keypadButtonText}>8</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.keypadButton} onPress={handleKey9Press}>
                    <Text style={styles.keypadButtonText}>9</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.keypadButton} onPress={handleKeyDotPress}>
                    <Text style={styles.keypadButtonText}>.</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.keypadButton} onPress={handleKey0Press}>
                    <Text style={styles.keypadButtonText}>0</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.keypadButton} onPress={handleKeyBackspacePress}>
                    <Text style={styles.keypadButtonText}>⌫</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>Enter amount first</Text>
            </View>
          )}
        </View>

        {/* ACTION BUTTONS */}
        {showKeypad && !cardDetails && (
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={resetPOS}
            >
              <Text style={styles.cancelText}>RESET</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.chargeButton}
              disabled={!amount || amount === "0.00" || amount === "."}
            >
              <Text style={styles.chargeText}>ENTER</Text>
            </TouchableOpacity>
          </View>
        )}

        {cardDetails && (
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={resetPOS}
            >
              <Text style={styles.cancelText}>CANCEL</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.chargeButton}
              onPress={() => setShowPinModal(true)}
              disabled={!amount || amount === "0.00"}
            >
              <Text style={styles.chargeText}>CHARGE</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* VIRTUAL CARD MODAL */}
        <Modal
          visible={showVirtualModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowVirtualModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Virtual Card</Text>
              <TouchableOpacity
                style={[styles.modalOption, styles.defaultOption]}
                onPress={() => handleVirtualSelect("default")}
              >
                <Ionicons name="checkmark-circle" size={24} color="#00FF7F" />
                <View style={styles.modalText}>
                  <Text style={styles.modalMain}>Use Default VC</Text>
                  <Text style={styles.modalSub}>•••• 7741 • Exp 06/28</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => handleVirtualSelect("scan")}
              >
                <MaterialCommunityIcons name="nfc-tap" size={24} color="#FFD700" />
                <Text style={styles.modalMain}>Scan Virtual Card</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => handleVirtualSelect("manual")}
              >
                <Ionicons name="create-outline" size={24} color="#aaa" />
                <Text style={styles.modalMain}>Enter Manually</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setShowVirtualModal(false)}
              >
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* SURCHARGE MODAL */}
        <Modal
          visible={showSurchargeModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowSurchargeModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>FOREIGN CARD SURCHARGE</Text>
              <View style={styles.confirmContent}>
                <Text style={styles.confirmText}>Original Amount: ₦{amount}</Text>
                <Text style={styles.confirmText}>Surcharge (2%): ₦{surchargeAmount}</Text>
                <Text style={styles.confirmText}>Total: ₦{(parseFloat(amount) + surchargeAmount).toFixed(2)}</Text>
              </View>
              <View style={styles.confirmButtons}>
                <TouchableOpacity
                  style={[styles.modalOption, styles.cancelButton]}
                  onPress={() => {
                    Vibration.vibrate([0, 5]);
                    setShowSurchargeModal(false);
                  }}
                >
                  <Text style={styles.cancelText}>DECLINE</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalOption, styles.chargeButton]}
                  onPress={handleSurchargeAccept}
                >
                  <Text style={styles.chargeText}>ACCEPT</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* PIN ENTRY MODAL */}
        <Modal
          visible={showPinModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPinModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>ENTER PIN</Text>
              
              {/* Card Details for Verification */}
              <View style={styles.cardDetails}>
                <Text style={styles.detailName}>{cardDetails?.name}</Text>
                <Text style={styles.detailNumber}>{cardDetails?.number}</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>EXP: {cardDetails?.expiry}</Text>
                  {cardDetails?.cvv && (
                    <Text style={styles.detailLabel}>CVV: {cardDetails.cvv}</Text>
                  )}
                  {cardDetails?.bank && (
                    <Text style={styles.detailLabel}>• {cardDetails.bank}</Text>
                  )}
                </View>
                <Text style={styles.confirmText}>Amount: ₦{amount}</Text>
              </View>
              
              <View style={styles.pinDisplay}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <View key={i} style={styles.pinDot}>
                    {i < pin.length && <View style={styles.filledDot} />}
                  </View>
                ))}
              </View>
              
              <View style={styles.pinKeypad}>
                <TouchableOpacity style={styles.pinButton} onPress={handlePinKey1Press}>
                  <Text style={styles.pinButtonText}>{randomizedPin[0]}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pinButton} onPress={handlePinKey2Press}>
                  <Text style={styles.pinButtonText}>{randomizedPin[1]}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pinButton} onPress={handlePinKey3Press}>
                  <Text style={styles.pinButtonText}>{randomizedPin[2]}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pinButton} onPress={handlePinBackspace}>
                  <Ionicons name="backspace" size={24} color="#FFD700" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.pinButton} onPress={handlePinKey4Press}>
                  <Text style={styles.pinButtonText}>{randomizedPin[3]}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pinButton} onPress={handlePinKey5Press}>
                  <Text style={styles.pinButtonText}>{randomizedPin[4]}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pinButton} onPress={handlePinKey6Press}>
                  <Text style={styles.pinButtonText}>{randomizedPin[5]}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pinButton} onPress={handlePinKey7Press}>
                  <Text style={styles.pinButtonText}>{randomizedPin[6]}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pinButton} onPress={handlePinKey8Press}>
                  <Text style={styles.pinButtonText}>{randomizedPin[7]}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pinButton} onPress={handlePinKey9Press}>
                  <Text style={styles.pinButtonText}>{randomizedPin[8]}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pinButton} onPress={handlePinKey0Press}>
                  <Text style={styles.pinButtonText}>0</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pinButton} onPress={handlePinSubmit}>
                  <Ionicons name="checkmark" size={24} color="#00FF7F" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* PROCESSING MODAL */}
        <Modal
          visible={showProcessing}
          transparent
          animationType="fade"
          onRequestClose={() => {}}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.processingContent}>
              <Text style={styles.processingTitle}>PROCESSING</Text>
              <View style={styles.processingAnimation}>
                <View style={styles.processingDot} />
                <View style={[styles.processingDot, {marginHorizontal: 10}]} />
                <View style={styles.processingDot} />
              </View>
              <Text style={styles.processingText}>Please wait...</Text>
            </View>
          </View>
        </Modal>

        {/* TRANSACTION RESULT MODAL */}
        <Modal
          visible={!!transactionResult}
          transparent
          animationType="fade"
          onRequestClose={() => {}}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.resultContent}>
              <View style={[styles.resultIcon, { backgroundColor: transactionResult?.status === 'approved' ? '#00FF7F' : '#FF4444' }]}>
                <Ionicons 
                  name={transactionResult?.status === 'approved' ? 'checkmark' : 'close'} 
                  size={40} 
                  color="#000" 
                />
              </View>
              <Text style={styles.resultTitle}>
                {transactionResult?.status === 'approved' ? 'APPROVED' : 'DECLINED'}
              </Text>
              {transactionResult?.authCode && (
                <Text style={styles.resultText}>Auth Code: {transactionResult.authCode}</Text>
              )}
              <Text style={styles.resultText}>Amount: ₦{amount}</Text>
              <TouchableOpacity
                style={styles.resultButton}
                onPress={() => {
                  Vibration.vibrate([0, 5]);
                  setShowReceiptModal(true);
                }}
              >
                <Text style={styles.resultButtonText}>CONTINUE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* RECEIPT MODAL */}
        <Modal
          visible={showReceiptModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowReceiptModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>RECEIPT OPTIONS</Text>
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => handleReceiptOption('print')}
              >
                <Ionicons name="print" size={24} color="#FFD700" />
                <Text style={styles.modalMain}>Print Receipt</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => handleReceiptOption('sms')}
              >
                <Ionicons name="chatbubbles" size={24} color="#00FF7F" />
                <Text style={styles.modalMain}>Send via SMS</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => handleReceiptOption('email')}
              >
                <Ionicons name="mail" size={24} color="#FFD700" />
                <Text style={styles.modalMain}>Send via Email</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => handleReceiptOption('none')}
              >
                <Ionicons name="close" size={24} color="#FF4444" />
                <Text style={styles.modalMain}>No Receipt</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => handleReceiptOption('none')}
              >
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </>
  );
}

/* -------------------------- STYLES -------------------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    paddingHorizontal: 20,
    justifyContent: "space-between",
  },
  watermark: {
    position: "absolute",
    top: "25%",
    left: "5%",
    width: 340,
    height: 340,
    opacity: 0.08,
    zIndex: 1,
  },
  header: {
    alignItems: "center",
    marginTop: 20,
  },
  terminalTitle: {
    color: "#FFD700",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 3,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#00FF7F",
    marginRight: 8,
  },
  statusText: {
    color: "#00FF7F",
    fontSize: 12,
    fontWeight: "600",
  },
  cardTypeSection: {
    marginVertical: 20,
  },
  sectionTitle: {
    color: "#aaa",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 16,
  },
  cardGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardOption: {
    backgroundColor: "#111",
    width: SCREEN_WIDTH * 0.28,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#222",
    opacity: 0.7,
  },
  cardSelected: {
    borderColor: "#FFD700",
    backgroundColor: "#1a1a00",
    opacity: 1,
  },
  cardLabel: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 8,
  },
  interactionArea: {
    flex: 1,
    justifyContent: "center",
    marginVertical: 20,
  },
  scanner: {
    alignItems: "center",
    padding: 40,
    backgroundColor: "#000",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#333",
  },
  scanLine: {
    width: "100%",
    height: 4,
    backgroundColor: "#00FF7F",
    borderRadius: 2,
    marginBottom: 20,
    shadowColor: "#00FF7F",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  scanText: {
    color: "#00FF7F",
    fontSize: 18,
    fontWeight: "700",
  },
  scanSub: {
    color: "#aaa",
    fontSize: 13,
    marginTop: 8,
  },
  keypadSection: {
    flex: 1,
    justifyContent: "space-between",
    bottom : 7
  },
  cardDetails: {
    backgroundColor: "#111",
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  detailName: {
    color: "#FFD700",
    fontSize: 16,
    fontWeight: "700",
  },
  detailNumber: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginVertical: 6,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailLabel: {
    color: "#aaa",
    fontSize: 12,
  },
  amountDisplay: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#333",
  },
  currency: {
    color: "#FFD700",
    fontSize: 32,
    marginRight: 8,
  },
  amountValue: {
    color: "#fff",
    fontSize: 42,
    fontWeight: "700",
  },
  keypadWrapper: {
    marginTop: 16,
    alignItems: "center",
  },
  customKeypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: SCREEN_WIDTH * 0.75,
  },
  keypadButton: {
    width: SCREEN_WIDTH * 0.22,
    height: 58,
    backgroundColor: "#111",
    margin: 5,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: "#222",
  },
  keypadButtonText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "600",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 16,
  },
  cancelButton: {
    width: SCREEN_WIDTH * 0.44,
    paddingVertical: 18,
    backgroundColor: "#111",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#444",
    alignItems: "center",
  },
  cancelText: {
    color: "#aaa",
    fontSize: 16,
    fontWeight: "700",
  },
  chargeButton: {
    width: SCREEN_WIDTH * 0.44,
    paddingVertical: 18,
    backgroundColor: "#00FF7F",
    borderRadius: 16,
    alignItems: "center",
  },
  chargeText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "700",
  },
  placeholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    color: "#666",
    fontSize: 16,
    fontStyle: "italic",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#111",
    width: SCREEN_WIDTH * 0.85,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "#333",
  },
  modalTitle: {
    color: "#FFD700",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 20,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    marginBottom: 12,
  },
  defaultOption: {
    borderWidth: 1,
    borderColor: "#00FF7F",
  },
  modalText: {
    marginLeft: 12,
    flex: 1,
  },
  modalMain: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  modalSub: {
    color: "#aaa",
    fontSize: 12,
  },
  modalClose: {
    marginTop: 12,
    alignItems: "center",
  },
  modalCloseText: {
    color: "#666",
    fontSize: 14,
  },
  confirmContent: {
    marginBottom: 20,
  },
  confirmText: {
    color: "#fff",
    fontSize: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  confirmButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  pinDisplay: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 30,
  },
  pinDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#FFD700",
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  filledDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#FFD700",
  },
  pinKeypad: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  pinButton: {
    width: SCREEN_WIDTH * 0.2,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    margin: 5,
    backgroundColor: "#000",
    borderRadius: 10,
  },
  pinButtonText: {
    color: "#FFD700",
    fontSize: 24,
  },
  processingContent: {
    backgroundColor: "#000",
    padding: 30,
    borderRadius: 20,
    alignItems: "center",
  },
  processingTitle: {
    color: "#FFD700",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
  },
  processingAnimation: {
    flexDirection: "row",
    marginBottom: 20,
  },
  processingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#00FF7F",
    opacity: 0.3,
  },
  processingText: {
    color: "#fff",
    fontSize: 16,
  },
  resultContent: {
    backgroundColor: "#111",
    padding: 30,
    borderRadius: 20,
    alignItems: "center",
    width: SCREEN_WIDTH * 0.8,
  },
  resultIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  resultTitle: {
    color: "#FFD700",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 10,
  },
  resultText: {
    color: "#fff",
    fontSize: 16,
    marginBottom: 10,
    textAlign: "center",
  },
  resultButton: {
    marginTop: 20,
    backgroundColor: "#00FF7F",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
  },
  resultButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "700",
  },
});