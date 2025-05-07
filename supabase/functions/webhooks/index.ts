import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
  }

  try {
    const event = await req.json();

    console.log('Paystack webhook received:', {
      event: event.event,
      reference: event.data?.reference,
    });

    if (!event.event || !event.data) {
      return jsonResponse({ error: 'Invalid webhook payload' }, 400, corsHeaders);
    }

    if (event.event !== 'charge.success') {
      return jsonResponse({ received: true }, 200, corsHeaders);
    }

    const { reference, status, amount, authorization } = event.data;

    if (!reference || !status || !amount) {
      console.error('Missing webhook data fields');
      return jsonResponse({ error: 'Invalid webhook data' }, 400, corsHeaders);
    }

    // Confirm it's a bank transfer
    if (!authorization || authorization.mode !== 'transfer') {
      console.log('Non-bank transfer event, skipping:', authorization?.mode);
      return jsonResponse({ received: true }, 200, corsHeaders);
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('Missing Supabase environment variables');
      return jsonResponse({ error: 'Server configuration error' }, 500, corsHeaders);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Update transaction status
    const { error } = await supabase
      .from('transactions')
      .update({
        status: 'success',
        amount_received: amount / 100, // Convert kobo to NGN
        updated_at: new Date().toISOString(),
      })
      .eq('reference', reference);

    if (error) {
      console.error('Error updating transaction:', error.message);
      return jsonResponse({ error: 'Failed to update transaction' }, 500, corsHeaders);
    }

    console.log(`Transaction ${reference} marked as successful.`);

    return jsonResponse({ received: true }, 200, corsHeaders);
  } catch (err) {
    console.error('Webhook processing error:', {
      message: err.message,
      stack: err.stack,
    });
    return jsonResponse({ error: 'Internal server error' }, 500, corsHeaders);
  }
});

function jsonResponse(data: Record<string, any>, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
  });
}