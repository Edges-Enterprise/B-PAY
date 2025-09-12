import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Polyfill crypto.getRandomValues
import 'react-native-get-random-values';

// Initialize Supabase client
const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

interface MonthlyReport {
  month: string; // Format: 'YYYY-MM'
  total_fees: number;
  transfer_fee: number;
  wallet_management_fee: number;
  api_network_fee: number;
  vat: number;
  withdrawn: number;
  carried_forward: number;
}

// Log a withdrawal
async function logWithdrawal(month: string, amount: number, notes?: string): Promise<void> {
  try {
    // Calculate total fees for the month
    const { data: fees, error: feeError } = await supabase
      .from('business_ledger')
      .select('fee_amount, fee_type')
      .gte('created_at', `${month}-01`)
      .lt('created_at', `${month}-01 + interval '1 month'`)
      .in('fee_type', ['total_fee']);

    if (feeError) throw feeError;

    const totalFees = fees.reduce((sum, entry) => sum + entry.fee_amount, 0);

    if (amount > totalFees) {
      throw new Error(`Withdrawal amount (₦${amount}) exceeds available fees (₦${totalFees}) for ${month}`);
    }

    // Calculate carried forward from previous months
    const { data: prevWithdrawals, error: prevError } = await supabase
      .from('revenue_withdrawals')
      .select('withdrawal_amount, carried_forward')
      .lte('withdrawal_month', month);

    if (prevError) throw prevError;

    const totalWithdrawn = prevWithdrawals.reduce((sum, w) => sum + w.withdrawal_amount, 0);
    const prevCarriedForward = prevWithdrawals.length
      ? prevWithdrawals[prevWithdrawals.length - 1].carried_forward
      : 0;

    // Calculate new carried forward
    const { data: allFees, error: allFeeError } = await supabase
      .from('business_ledger')
      .select('fee_amount')
      .in('fee_type', ['total_fee'])
      .lte('created_at', `${month}-01 + interval '1 month' - interval '1 day'`);

    if (allFeeError) throw allFeeError;

    const totalEarnedFees = allFees.reduce((sum, entry) => sum + entry.fee_amount, 0);
    const newCarriedForward = totalEarnedFees - totalWithdrawn - amount;

    // Insert withdrawal record
    const { error: insertError } = await supabase
      .from('revenue_withdrawals')
      .insert({
        id: uuidv4(),
        withdrawal_amount: amount,
        withdrawal_month: month,
        carried_forward: newCarriedForward,
        notes,
      });

    if (insertError) throw insertError;

    // console.log(`Logged withdrawal of ₦${amount} for ${month}. Carried forward: ₦${newCarriedForward}`);
  } catch (error) {
    console.error('Error logging withdrawal:', error);
    throw error;
  }
}

// Generate monthly revenue report
async function generateMonthlyReport(month: string): Promise<MonthlyReport> {
  try {
    // Fetch fees for the month
    const { data: fees, error: feeError } = await supabase
      .from('business_ledger')
      .select('fee_amount, fee_type')
      .gte('created_at', `${month}-01`)
      .lt('created_at', `${month}-01 + interval '1 month'`);

    if (feeError) throw feeError;

    const report: MonthlyReport = {
      month,
      total_fees: 0,
      transfer_fee: 0,
      wallet_management_fee: 0,
      api_network_fee: 0,
      vat: 0,
      withdrawn: 0,
      carried_forward: 0,
    };

    fees.forEach((entry) => {
      switch (entry.fee_type) {
        case 'total_fee':
          report.total_fees += entry.fee_amount;
          break;
        case 'transfer_fee':
          report.transfer_fee += entry.fee_amount;
          break;
        case 'wallet_management_fee':
          report.wallet_management_fee += entry.fee_amount;
          break;
        case 'api_network_fee':
          report.api_network_fee += entry.fee_amount;
          break;
        case 'vat':
          report.vat += entry.fee_amount;
          break;
      }
    });

    // Fetch withdrawals for the month
    const { data: withdrawals, error: withdrawalError } = await supabase
      .from('revenue_withdrawals')
      .select('withdrawal_amount')
      .eq('withdrawal_month', month);

    if (withdrawalError) throw withdrawalError;

    report.withdrawn = withdrawals.reduce((sum, w) => sum + w.withdrawal_amount, 0);

    // Calculate carried forward
    const { data: allFees, error: allFeeError } = await supabase
      .from('business_ledger')
      .select('fee_amount')
      .in('fee_type', ['total_fee'])
      .lte('created_at', `${month}-01 + interval '1 month' - interval '1 day'`);

    if (allFeeError) throw allFeeError;

    const { data: allWithdrawals, error: allWithdrawalError } = await supabase
      .from('revenue_withdrawals')
      .select('withdrawal_amount')
      .lte('withdrawal_month', month);

    if (allWithdrawalError) throw allWithdrawalError;

    const totalEarnedFees = allFees.reduce((sum, entry) => sum + entry.fee_amount, 0);
    const totalWithdrawn = allWithdrawals.reduce((sum, w) => sum + w.withdrawal_amount, 0);
    report.carried_forward = totalEarnedFees - totalWithdrawn;

    return report;
  } catch (error) {
    console.error('Error generating monthly report:', error);
    throw error;
  }
}

// Example usage
async function main() {
  // Log a withdrawal for May 2025
  await logWithdrawal('2025-05', 50000, 'End of May revenue withdrawal');

  // Generate report for May 2025
  const report = await generateMonthlyReport('2025-05');
  console.log('Monthly Revenue Report:', JSON.stringify(report, null, 2));
}

if (require.main === module) {
  main().catch(console.error);
}