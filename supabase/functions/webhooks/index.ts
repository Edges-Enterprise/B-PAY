import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  console.log('Webhooks function invoked', { method: req.method });

  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    console.error('Invalid method', { method: req.method });
    return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
  }

  let event;
  try {
    event = await req.json();
    console.log('Paystack webhook received', {
      event: event.event,
      reference: event.data?.reference,
    });
  } catch (err) {
    console.error('Failed to parse webhook payload', { error: err.message });
    return jsonResponse({ error: 'Invalid JSON payload' }, 400, corsHeaders);
  }

  if (!event.event || !event.data) {
    console.error('Invalid webhook payload', { event });
    return jsonResponse({ error: 'Invalid webhook payload' }, 400, corsHeaders);
  }

  if (event.event !== 'charge.success') {
    console.log('Non-charge.success event, skipping', { event: event.event });
    return jsonResponse({ received: true }, 200, corsHeaders);
  }

  const { reference, status, amount, authorization } = event.data;

  if (!reference || !status || !amount) {
    console.error('Missing webhook data fields', { reference, status, amount });
    return jsonResponse({ error: 'Invalid webhook data' }, 400, corsHeaders);
  }

  // Confirm it's a bank transfer
  if (!authorization || authorization.mode !== 'transfer') {
    console.log('Non-bank transfer event, skipping', { mode: authorization?.mode });
    return jsonResponse({ received: true }, 200, corsHeaders);
  }

  // Initialize Supabase
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Missing Supabase environment variables', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceRoleKey: !!supabaseServiceRoleKey,
    });
    return jsonResponse({ error: 'Server configuration error' }, 500, corsHeaders);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  console.log('Supabase client initialized for webhook');

  // Update transaction status
  console.log('Updating transaction status', { reference });
  const { error } = await supabase
    .from('transactions')
    .update({
      status: 'success',
      amount_received: amount / 100, // Convert kobo to NGN
      updated_at: new Date().toISOString(),
    })
    .eq('reference', reference);

  if (error) {
    console.error('Error updating transaction', { error: error.message });
    return jsonResponse({ error: 'Failed to update transaction' }, 500, corsHeaders);
  }

  console.log(`Transaction ${reference} marked as successful`);
  return jsonResponse({ received: true }, 200, corsHeaders);
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