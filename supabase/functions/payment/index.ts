// supabase/functions/payment/index.ts

import { serve } from 'https://deno.land/std/http/server.ts';

serve(async (req) => {
  const { amount, email, reference, channels } = await req.json();

  const res = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      amount: amount * 100, // Convert to kobo
      reference,
      channels, // e.g. ['bank_transfer'] or ['card']
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    return new Response(JSON.stringify({ error: data.message }), { status: 400 });
  }

  return new Response(JSON.stringify(data.data), { status: 200 });
});
