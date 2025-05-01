import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const { reference } = await req.json();
    
    if (!reference) {
      return new Response(
        JSON.stringify({ error: 'Reference is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify with Paystack
    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}`
        }
      }
    );

    const paystackData = await paystackResponse.json();
    
    if (!paystackResponse.ok) {
      return new Response(
        JSON.stringify({
          status: 'failed',
          message: paystackData.message || 'Payment verification failed'
        }),
        { status: paystackResponse.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (paystackData.data.status !== 'success') {
      return new Response(
        JSON.stringify({
          status: 'failed',
          message: 'Payment not successful'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const amount = paystackData.data.amount / 100; // Convert back to Naira
    const creditedAmount = amount * 0.9; // Deduct 10% fee
    
    // Update user balance in database
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! }
        }
      }
    );

    // Get user email from Paystack response
    const userEmail = paystackData.data.customer.email;
    
    // Get user ID from Supabase
    const { data: user } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('email', userEmail)
      .single();

    if (!user) {
      return new Response(
        JSON.stringify({
          status: 'failed',
          message: 'User not found'
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update balance
    const { data: currentBalance } = await supabaseClient
      .from('wallets')
      .select('balance')
      .eq('user_id', user.id)
      .single();

    const newBalance = (currentBalance?.balance || 0) + creditedAmount;
    
    await supabaseClient
      .from('wallets')
      .upsert({
        user_id: user.id,
        balance: newBalance
      });

    // Record transaction
    await supabaseClient
      .from('transactions')
      .insert({
        user_id: user.id,
        type: 'deposit',
        amount: creditedAmount,
        fee: amount * 0.1, // 10% fee
        reference,
        status: 'completed',
        method: 'Paystack'
      });

    return new Response(
      JSON.stringify({
        status: 'success',
        amount: creditedAmount,
        message: 'Payment verified and wallet credited'
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Verification error:', err);
    return new Response(
      JSON.stringify({
        status: 'error',
        message: 'Internal server error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});