import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  try {
    const { amount, email, name, phone } = await req.json();
    
    if (!amount || !email) {
      return new Response(
        JSON.stringify({ error: 'Amount and email are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}`
      },
      body: JSON.stringify({
        email,
        amount: Math.round(amount * 100), // Convert to kobo
        currency: 'NGN',
        metadata: {
          customer_name: name,
          customer_phone: phone,
          service_fee: amount * 0.1 // 10% fee
        },
        callback_url: Deno.env.get('PAYSTACK_CALLBACK_URL')
      })
    });

    const paystackData = await paystackResponse.json();
    
    if (!paystackResponse.ok) {
      return new Response(
        JSON.stringify({ error: paystackData.message || 'Payment initialization failed' }),
        { status: paystackResponse.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        authorization_url: paystackData.data.authorization_url,
        access_code: paystackData.data.access_code,
        reference: paystackData.data.reference
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});