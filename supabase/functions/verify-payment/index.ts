import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { reference } = await req.json();

    // Validate input
    if (!reference) {
      return jsonResponse({ error: 'Missing reference' }, 400);
    }

    // Validate environment variables
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!paystackSecretKey || !supabaseUrl || !supabaseServiceRoleKey) {
      console.error('Missing environment variables');
      return jsonResponse({ error: 'Server configuration error' }, 500);
    }

    // Initialize Supabase
    const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Verify with Paystack
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

    if (!paystackData.status || paystackData.data.status !== 'success') {
      return jsonResponse({
        status: 'failed',
        message: paystackData.message || 'Payment not successful',
      }, 400);
    }

    const amount = paystackData.data.amount / 100; // Convert kobo to NGN
    const creditedAmount = amount * 0.9; // 10% fee
    const email = paystackData.data.customer.email;

    // Find user by email
    const { data: users, error: userError } = await supabaseClient
      .from('profiles')
      .select('user_id')
      .eq('email', email)
      .limit(1);

    if (userError || !users?.length) {
      console.error('User lookup error:', userError?.message);
      return jsonResponse({
        status: 'failed',
        message: 'User account not found',
      }, 404);
    }

    const userId = users[0].user_id;

    // Perform atomic database updates
    const { error: dbError } = await supabaseClient.rpc('update_wallet_and_transaction', {
      p_user_id: userId,
      p_amount: creditedAmount,
      p_fee: amount * 0.1,
      p_reference: reference,
      p_method: paystackData.data.channel === 'bank_transfer' ? 'Bank Transfer' : 'Card',
    });

    if (dbError) {
      console.error('Database error:', dbError.message);
      return jsonResponse({
        status: 'error',
        message: 'Failed to update wallet or transaction',
      }, 500);
    }

    return jsonResponse({
      status: 'success',
      amount: creditedAmount,
      message: 'Wallet credited successfully',
    }, 200);
  } catch (err) {
    console.error('Verification error:', err.message);
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