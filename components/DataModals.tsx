import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import PurchaseModal from "@/components/homescreen/PurchaseModal";
import TransactionStatusModal from "@/components/homescreen/TransactionStatusModal";
import CreatePinModal from "@/components/homescreen/CreatePinModal";
import { DataBundle } from "@/app/(app)/serviceprovider";

interface DataModalsProps {
  isPurchaseModalOpen: boolean;
  setIsPurchaseModalOpen: (open: boolean) => void;
  isTransactionModalOpen: boolean;
  setIsTransactionModalOpen: (open: boolean) => void;
  isPinCreationModalOpen: boolean;
  setIsPinCreationModalOpen: (open: boolean) => void;
  selectedBundle: DataBundle | null;
  phoneNumberInput: string;
  setPhoneNumberInput: (phone: string) => void;
  transactionPinInput: string;
  setTransactionPinInput: (pin: string) => void;
  detectedNetwork: string;
  setDetectedNetwork: (network: string) => void;
  transactionState: "processing" | "success" | "failed";
  setTransactionState: (state: "processing" | "success" | "failed") => void;
  transactionReference: string;
  setTransactionReference: (ref: string) => void;
  hasPin: boolean;
  updateHasPin: (value: boolean) => void;
  isTransactionPinVisible: boolean;
  setIsTransactionPinVisible: (visible: boolean) => void;
  newPinInput: string;
  setNewPinInput: (pin: string) => void;
  confirmPinInput: string;
  setConfirmPinInput: (pin: string) => void;
  isNewPinVisible: boolean;
  setIsNewPinVisible: (visible: boolean) => void;
  isConfirmPinVisible: boolean;
  setIsConfirmPinVisible: (visible: boolean) => void;
  isLoading: boolean;
  verifyTransactionPin: (email: string) => Promise<boolean>;
  userEmail: string | null;
  selectedProvider: { name: string } | null;
  onCreatePin: () => void;
  onSavePin: () => void;
  onProceed: () => void;
}

const DataModals: React.FC<DataModalsProps> = ({
  isPurchaseModalOpen,
  setIsPurchaseModalOpen,
  isTransactionModalOpen,
  setIsTransactionModalOpen,
  isPinCreationModalOpen,
  setIsPinCreationModalOpen,
  selectedBundle,
  phoneNumberInput,
  setPhoneNumberInput,
  transactionPinInput,
  setTransactionPinInput,
  detectedNetwork,
  setDetectedNetwork,
  transactionState,
  setTransactionState,
  transactionReference,
  setTransactionReference,
  hasPin,
  updateHasPin,
  isTransactionPinVisible,
  setIsTransactionPinVisible,
  newPinInput,
  setNewPinInput,
  confirmPinInput,
  setConfirmPinInput,
  isNewPinVisible,
  setIsNewPinVisible,
  isConfirmPinVisible,
  setIsConfirmPinVisible,
  isLoading,
  verifyTransactionPin,
  userEmail,
  selectedProvider,
  onCreatePin,
  onSavePin,
  onProceed,
}) => {
  useEffect(() => {
    if (isPurchaseModalOpen && userEmail) {
      // console.log("PurchaseModal opened, verifying PIN for email:", userEmail);
      verifyTransactionPin(userEmail).then((exists) => {
        // console.log("Verified PIN exists:", exists);
        updateHasPin(exists);
      });
    }
  }, [isPurchaseModalOpen, userEmail, verifyTransactionPin, updateHasPin]);

  // useEffect(() => {
  //   console.log("DataModals state update:", {
  //     isPurchaseModalOpen,
  //     isTransactionModalOpen,
  //     isPinCreationModalOpen,
  //   });
  // }, [isPurchaseModalOpen, isTransactionModalOpen, isPinCreationModalOpen]);

  const closePurchaseModal = () => {
    // console.log("Closing PurchaseModal");
    setIsPurchaseModalOpen(false);
    setPhoneNumberInput("");
    setTransactionPinInput("");
    setDetectedNetwork("");
    setTransactionReference("");
  };

  const closeTransactionModal = () => {
    // console.log("Closing TransactionStatusModal");
    setIsTransactionModalOpen(false);
    setPhoneNumberInput("");
    setTransactionPinInput("");
    setDetectedNetwork("");
    setTransactionState("processing");
    setTransactionReference("");
  };

  const closePinCreationModal = () => {
    // console.log("Closing CreatePinModal");
    setIsPinCreationModalOpen(false);
    setNewPinInput("");
    setConfirmPinInput("");
  };

  // Only render the modal container if at least one modal is visible
  if (!isPurchaseModalOpen && !isTransactionModalOpen && !isPinCreationModalOpen) {
    return null;
  }

  return (
    <View style={styles.modalContainer}>
      <PurchaseModal
        visible={isPurchaseModalOpen}
        onClose={closePurchaseModal}
        selectedPlan={selectedBundle?.data || ""}
        phoneNumber={phoneNumberInput}
        setPhoneNumber={setPhoneNumberInput}
        transactionPin={transactionPinInput}
        setTransactionPin={setTransactionPinInput}
        networkProvider={detectedNetwork}
        setNetworkProvider={setDetectedNetwork}
        hasPin={hasPin}
        defaultPin={transactionPinInput}
        showTransactionPin={isTransactionPinVisible}
        setShowTransactionPin={setIsTransactionPinVisible}
        onCreatePin={onCreatePin}
        onContinue={onProceed}
        selectedProvider={selectedProvider?.name || ""}
        userEmail={userEmail}
      />
      <TransactionStatusModal
        visible={isTransactionModalOpen}
        onClose={closeTransactionModal}
        transactionStatus={transactionState}
        selectedPlan={selectedBundle}
        phoneNumber={phoneNumberInput}
        networkProvider={detectedNetwork}
      />
      <CreatePinModal
        visible={isPinCreationModalOpen}
        onClose={closePinCreationModal}
        newPin={newPinInput}
        setNewPin={setNewPinInput}
        confirmPin={confirmPinInput}
        setConfirmPin={setConfirmPinInput}
        showNewPin={isNewPinVisible}
        setShowNewPin={setIsNewPinVisible}
        showConfirmPin={isConfirmPinVisible}
        setShowConfirmPin={setIsConfirmPinVisible}
        onSave={onSavePin}
        isLoading={isLoading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
    backgroundColor: 'transparent', // Match app theme to prevent white flash
  },
});

export default DataModals;