import { serve } from 'https://deno.land/x/sift@0.6.2/mod.ts';
import axios from 'https://cdn.skypack.dev/axios@1.6.0';

serve({
  async fetch(request: Request) {
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { amount, email, reference, channels } = await request.json();

    // Validate input
    if (!amount || !email || !reference) {
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
      console.error('Missing environment variables');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const paystackApiUrl = 'https://api.paystack.co/transaction/initialize';

    try {
      const response = await axios.post(
        paystackApiUrl,
        {
          amount: amount * 100, // Convert to kobo
          email,
          reference,
          currency: 'NGN',
          channels: channels || ['card', 'bank_transfer'], // Default to both if not specified
        },
        {
          headers: {
            Authorization: `Bearer ${paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const { data } = response.data;
      return new Response(JSON.stringify({
        status: 'success',
        authorization_url: data.authorization_url,
        reference,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Paystack API error:', error.response?.data || error.message);
      return new Response(JSON.stringify({
        error: error.response?.data?.message || 'Failed to initialize payment',
      }), {
        status: error.response?.status || 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
});