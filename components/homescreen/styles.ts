import { StyleSheet } from 'react-native';

export const sharedStyles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalSheet: {
    backgroundColor: '#171717',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: 'auto',
  },
  transactionModal: {
    backgroundColor: '#171717',
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    margin: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: 'white',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  continueButton: {
    backgroundColor: '#22C55E',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  continueButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  closeButton: {
    backgroundColor: '#22C55E',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    width: '100%',
  },
  closeButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  networkText: {
    color: '#22C55E',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  transactionText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
  transactionDetails: {
    color: 'gray',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  label: {
    color: 'gray',
    fontSize: 12,
    marginBottom: 4,
    marginLeft: 4,
  },
  createButton: {
    position: 'absolute',
    right: 10,
    top: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: '#22C55E',
    borderRadius: 6,
  },
  createButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  eyeButton: {
    position: 'absolute',
    right: 10,
    top: 10,
  },
});