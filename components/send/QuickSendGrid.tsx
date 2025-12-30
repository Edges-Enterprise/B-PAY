import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/stores/auth-store';

const QuickSendGrid = ({ onBankSelect }) => {
  const { user } = useAuth();

  const { data: quickSendBanks } = useQuery({
    queryKey: ['quickSendBanks', user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_bank_preferences')
        .select('*')
        .eq('user_id', user.id)
        .order('display_order')
        .limit(8);
      
      if (error || !data || data.length === 0) {
        // Return default banks
        return [
          { bank_code: '100004', bank_name: 'OPay', initial: 'O', color: '#F59E0B' },
          { bank_code: '100033', bank_name: 'PalmPay', initial: 'P', color: '#10B981' },
          { bank_code: '50515', bank_name: 'Moniepoint', initial: 'M', color: '#3B82F6' },
          { bank_code: '058', bank_name: 'GTBank', initial: 'G', color: '#044389' },
          { bank_code: '057', bank_name: 'Zenith', initial: 'Z', color: '#082032' },
          { bank_code: '044', bank_name: 'Access', initial: 'A', color: '#E63946' },
          { bank_code: '011', bank_name: 'FirstBank', initial: 'F', color: '#1D3557' },
          { bank_code: '033', bank_name: 'UBA', initial: 'U', color: '#046307' },
        ];
      }
      
      return data.map(bank => ({
        ...bank,
        initial: bank.bank_name[0],
        color: getBankColor(bank.bank_code),
      }));
    },
  });

  const getBankColor = (bankCode) => {
    const colors = {
      '100004': '#F59E0B', // OPay
      '100033': '#10B981', // PalmPay
      '50515': '#3B82F6',  // Moniepoint
      '058': '#044389',    // GTBank
      '057': '#082032',    // Zenith
      '044': '#E63946',    // Access
      '011': '#1D3557',    // FirstBank
      '033': '#046307',    // UBA
    };
    
    return colors[bankCode] || '#666';
  };

  if (!quickSendBanks) return null;

  // Split into two rows of 4
  const firstRow = quickSendBanks.slice(0, 4);
  const secondRow = quickSendBanks.slice(4, 8);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quick Send</Text>
      <View style={styles.grid}>
        <View style={styles.row}>
          {firstRow.map((bank, index) => (
            <TouchableOpacity
              key={bank.bank_code}
              style={styles.bankItem}
              onPress={() => onBankSelect(bank)}
            >
              <View style={[styles.bankIcon, { backgroundColor: bank.color }]}>
                <Text style={styles.bankInitial}>{bank.initial}</Text>
              </View>
              <Text style={styles.bankName} numberOfLines={1}>
                {bank.bank_name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.row}>
          {secondRow.map((bank, index) => (
            <TouchableOpacity
              key={bank.bank_code}
              style={styles.bankItem}
              onPress={() => onBankSelect(bank)}
            >
              <View style={[styles.bankIcon, { backgroundColor: bank.color }]}>
                <Text style={styles.bankInitial}>{bank.initial}</Text>
              </View>
              <Text style={styles.bankName} numberOfLines={1}>
                {bank.bank_name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  grid: {
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bankItem: {
    alignItems: 'center',
    width: '23%',
  },
  bankIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  bankInitial: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  bankName: {
    color: '#999',
    fontSize: 11,
    textAlign: 'center',
  },
});

export default QuickSendGrid;