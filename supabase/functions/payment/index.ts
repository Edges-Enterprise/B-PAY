import { serve } from 'https://deno.land/x/sift@0.6.2/mod.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import axios from 'https://cdn.skypack.dev/axios@1.6.0';

serve({
  async fetch(request: Request) {
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    const { amount, email, reference } = await request.json();

    if (!amount || !email || !reference) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY')!; // Set this in your Supabase environment variables
    const paystackApiUrl = 'https://api.paystack.co/transaction/initialize';

    try {
      const response = await axios.post(
        paystackApiUrl,
        {
          amount: amount * 100, // Convert to kobo
          email,
          reference,
          currency: 'NGN',
        },
        {
          headers: {
            Authorization: `Bearer ${paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const { data } = response.data;
      return new Response(JSON.stringify({ authorization_url: data.authorization_url }), { status: 200 });
    } catch (error) {
      console.error('Paystack API error:', error);
      return new Response(JSON.stringify({ error: 'Failed to initialize payment' }), { status: 500 });
    }
  },
});