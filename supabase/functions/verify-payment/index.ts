import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  console.log('Verify-payment function invoked', { method: req.method });

  if (req.method !== 'POST') {
    console.error('Invalid method', { method: req.method });
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let payload;
  try {
    payload = await req.json();
    console.log('Received payload', { payload });
  } catch (error) {
    console.error('Failed to parse request body', { error: error.message });
    return jsonResponse({ error: 'Invalid JSON payload' }, 400);
  }

  const { reference } = payload;

  // Validate input
  if (!reference) {
    console.error('Missing reference', { reference });
    return jsonResponse({ error: 'Missing reference' }, 400);
  }

  // Validate environment variables
  const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!paystackSecretKey || !supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Missing environment variables', {
      hasPaystackKey: !!paystackSecretKey,
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceRoleKey: !!supabaseServiceRoleKey,
    });
    return jsonResponse({ error: 'Server configuration error' }, 500);
  }

  // Initialize Supabase
  const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);
  console.log('Supabase client initialized');

  // Verify with Paystack
  try {
    console.log('Verifying with Paystack', { reference });
    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const paystackData = await paystackResponse.json();
    console.log('Paystack verification response', { status: paystackData.status, dataStatus: paystackData.data?.status });

    if (!paystackData.status || paystackData.data.status !== 'success') {
      console.error('Payment not successful', { message: paystackData.message });
      return jsonResponse({
        status: 'failed',
        message: paystackData.message || 'Payment not successful',
      }, 400);
    }

    const amount = paystackData.data.amount / 100; // Convert kobo to NGN
    const creditedAmount = amount * 0.9; // 10% fee
    const email = paystackData.data.customer.email;

    // Find user by email
    console.log('Looking up user by email', { email });
    const { data: users, error: userError } = await supabaseClient
      .from('profiles')
      .select('user_id')
      .eq('email', email)
      .limit(1);

    if (userError || !users?.length) {
      console.error('User lookup failed', { error: userError?.message });
      return jsonResponse({
        status: 'failed',
        message: 'User account not found',
      }, 404);
    }

    const userId = users[0].user_id;
    console.log('User found', { userId });

    // Perform atomic database updates
    console.log('Updating wallet and transaction', { userId, creditedAmount, reference });
    const { error: dbError } = await supabaseClient.rpc('update_wallet_and_transaction', {
      p_user_id: userId,
      p_amount: creditedAmount,
      p_fee: amount * 0.1,
      p_reference: reference,
      p_method: paystackData.data.channel === 'bank_transfer' ? 'Bank Transfer' : 'Card',
    });

    if (dbError) {
      console.error('Database update failed', { error: dbError.message });
      return jsonResponse({
        status: 'error',
        message: 'Failed to update wallet or transaction',
      }, 500);
    }

    console.log('Wallet and transaction updated successfully');
    return jsonResponse({
      status: 'success',
      amount: creditedAmount,
      message: 'Wallet credited successfully',
    }, 200);
  } catch (err) {
    console.error('Verification error', { error: err.message, stack: err.stack });
    return jsonResponse({
      status: 'error',
      message: 'Payment verification failed',
    }, 500);
  }
});

function jsonResponse(data: any, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}