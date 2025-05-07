import { serve } from 'https://deno.land/x/sift@0.6.2/mod.ts';
import axios from 'https://cdn.skypack.dev/axios@1.6.0';

serve({
  async fetch(request: Request) {
    console.log('Payment function invoked', { method: request.method, url: request.url });

    if (request.method !== 'POST') {
      console.error('Invalid method', { method: request.method });
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let payload;
    try {
      payload = await request.json();
      console.log('Received payload', { payload });
    } catch (error) {
      console.error('Failed to parse request body', { error: error.message });
      return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { amount, email, reference, channels } = payload;

    // Validate input
    if (!amount || !email || !reference) {
      console.error('Missing required fields', { amount, email, reference });
      return new Response(JSON.stringify({ error: 'Missing required fields: amount, email, or reference' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
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
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const paystackApiUrl = 'https://api.paystack.co/transaction/initialize';

    try {
      console.log('Calling Paystack API', { amount, email, reference, channels });
      const response = await axios.post(
        paystackApiUrl,
        {
          amount: amount * 100, // Convert to kobo
          email,
          reference,
          currency: 'NGN',
          channels: channels || ['card', 'bank_transfer'],
        },
        {
          headers: {
            Authorization: `Bearer ${paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const { data } = response.data;
      console.log('Paystack API success', { authorization_url: data.authorization_url });
      return new Response(JSON.stringify({
        status: 'success',
        authorization_url: data.authorization_url,
        reference,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Paystack API error', {
        status: error.response?.status,
        message: error.response?.data?.message,
        error: error.message,
      });
      return new Response(JSON.stringify({
        error: error.response?.data?.message || 'Failed to initialize payment',
      }), {
        status: error.response?.status || 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
});