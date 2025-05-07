import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate request method
    if (req.method !== 'POST') {
      return jsonResponse({
        status: 'error',
        message: 'Method not allowed',
      }, 405, corsHeaders);
    }

    // Validate authentication
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_ANON_KEY') || ''
    );
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return jsonResponse({
        status: 'error',
        message: 'Missing authorization header',
      }, 401, corsHeaders);
    }
    const { user, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      console.error('Authentication error:', authError?.message || 'No user found');
      return jsonResponse({
        status: 'error',
        message: 'Invalid or expired token',
      }, 401, corsHeaders);
    }

    // Parse and validate request body
    const { amount, email, name } = await req.json();

    // Input validation
    if (!amount || !email) {
      return jsonResponse({
        status: 'error',
        message: 'Amount and email are required',
      }, 400, corsHeaders);
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return jsonResponse({
        status: 'error',
        message: 'Amount must be a positive number',
      }, 400, corsHeaders);
    }

    if (numericAmount < 500) {
      return jsonResponse({
        status: 'error',
        message: 'Minimum amount is ₦500',
      }, 400, corsHeaders);
    }

    // Log environment variables for debugging
    const paystackKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    console.log('Environment variables:', {
      PAYSTACK_SECRET_KEY: paystackKey ? 'Key present' : 'Key missing',
      SUPABASE_URL: Deno.env.get('SUPABASE_URL') ? 'Present' : 'Missing',
      SUPABASE_ANON_KEY: Deno.env.get('SUPABASE_ANON_KEY') ? 'Present' : 'Missing',
      PAYSTACK_CALLBACK_URL: Deno.env.get('PAYSTACK_CALLBACK_URL') || 'Not set',
      SITE_URL: Deno.env.get('SITE_URL') || 'Not set'
    });

    if (!paystackKey) {
      return jsonResponse({
        status: 'error',
        message: 'Server configuration error: Missing Paystack key',
      }, 500, corsHeaders);
    }

    // Initialize Paystack payment
    const reference = `ref-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    const paystackResponse = await fetch(
      'https://api.paystack.co/transaction/initialize',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${paystackKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          amount: Math.round(numericAmount * 100), // Convert to kobo
          currency: 'NGN',
          reference,
          metadata: {
            customer_name: name || email.split('@')[0] || 'Customer',
            service_fee: (numericAmount * 0.1).toFixed(2),
            original_amount: numericAmount.toFixed(2),
          },
          callback_url: Deno.env.get('PAYSTACK_CALLBACK_URL') || `${Deno.env.get('SITE_URL')}/payment-callback`,
        }),
      }
    );

    const paystackData = await paystackResponse.json();

    if (!paystackResponse.ok) {
      console.error('Paystack API Error:', {
        status: paystackResponse.status,
        message: paystackData.message,
        rawResponse: await paystackResponse.text(),
      });
      return jsonResponse({
        status: 'failed',
        message: paystackData.message || 'Payment initialization failed',
        code: paystackData.status || 'unknown_error',
        httpStatus: paystackResponse.status
      }, paystackResponse.status ||kaart 400, corsHeaders);
    }

    // Success response
    return jsonResponse({
      status: 'success',
      authorization_url: paystackData.data.authorization_url,
      access_code: paystackData.data.access_code,
      reference: paystackData.data.reference,
      amount: numericAmount,
      fee: (numericAmount * 0.1).toFixed(2),
    }, 200, corsHeaders);

  } catch (err) {
    console.error('Server Error:', {
      message: err.message,
      stack: err.stack,
    });
    return jsonResponse({
      status: 'error',
      message: 'Internal server error',
      error: Deno.env.get('DENO_ENV') === 'development' ? err.message : undefined,
    }, 500, corsHeaders);
  }
});

// Helper function for consistent JSON responses
function jsonResponse(
  data: Record<string, unknown>,
  status: number,
  headers: Record<string, string>
) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}