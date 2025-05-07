import { serve } from 'supabase-edges-shared'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Missing or invalid authorization header')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_ANON_KEY') || ''
    )

    // Get user from Supabase Auth using JWT
    const { user, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) {
      return jsonResponse(
        { status: 'error', message: 'Invalid or expired token' },
        401,
        corsHeaders
      )
    }

    // Parse JSON body
    let payload
    try {
      payload = await req.json()
    } catch (err) {
      return jsonResponse(
        { status: 'error', message: 'Invalid JSON payload' },
        400,
        corsHeaders
      )
    }

    const { amount, email, name } = payload

    // Validate required fields
    if (
      !amount ||
      typeof amount !== 'number' ||
      amount < 500 ||
      !email ||
      typeof email !== 'string' ||
      !name ||
      typeof name !== 'string'
    ) {
      return jsonResponse(
        {
          status: 'error',
          message: 'Valid amount (≥₦500), email and name are required',
        },
        400,
        corsHeaders
      )
    }

    // Check Paystack secret key
    const paystackKey = Deno.env.get('PAYSTACK_SECRET_KEY')
    if (!paystackKey) {
      return jsonResponse(
        {
          status: 'error',
          message: 'Server configuration error: Missing Paystack key',
        },
        500,
        corsHeaders
      )
    }

    // Generate reference
    const reference = `ref-${Date.now()}-${crypto.randomUUID()}`

    // Call Paystack API to initialize bank transfer
    const paystackResponse = await fetch(
      'https://api.paystack.co/transaction/initialize',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${paystackKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          amount: Math.round(amount * 100), // Convert to kobo
          currency: 'NGN',
          reference,
          channels: ['bank'], // Bank transfer only
          metadata: {
            customer_name: name,
            original_amount: amount.toFixed(2),
          },
          callback_url:
            Deno.env.get('PAYSTACK_CALLBACK_URL') ||
            `${Deno.env.get('SITE_URL')}/payment-callback`,
        }),
      }
    )

    const paystackData = await paystackResponse.json()

    if (!paystackResponse.ok || !paystackData.status || !paystackData.data) {
      console.error('Paystack API Error:', {
        status: paystackResponse.status,
        message: paystackData.message || 'Unknown error',
        rawResponse: JSON.stringify(paystackData),
      })

      return jsonResponse(
        {
          status: 'failed',
          message: paystackData.message || 'Payment initialization failed',
          code: paystackData.status || 'unknown_error',
        },
        paystackResponse.status || 500,
        corsHeaders
      )
    }

    // Save transaction in Supabase
    const { error: dbError } = await supabase.from('transactions').insert({
      user_email: email,
      amount,
      reference,
      status: 'pending',
      type: 'bank_transfer',
    })

    if (dbError) {
      console.error('Supabase insert error:', dbError.message)
    }

    // If it's a bank transfer, return account info
    const authorization = paystackData.data.authorization
    if (authorization.mode === 'transfer') {
      return jsonResponse(
        {
          status: 'success',
          is_bank_transfer: true,
          reference,
          amount,
          account_number: authorization.account_number,
          bank_name: authorization.bank,
          recipient: authorization.recipient,
        },
        200,
        corsHeaders
      )
    }

    // Fallback: return URL (if not bank transfer)
    return jsonResponse(
      {
        status: 'success',
        authorization_url: paystackData.data.authorization_url,
        access_code: paystackData.data.access_code,
        reference,
        amount,
      },
      200,
      corsHeaders
    )
  } catch (err: any) {
    console.error('Server Error:', {
      message: err.message,
      stack: err.stack,
    })

    return jsonResponse(
      {
        status: 'error',
        message: 'Internal server error',
        error: Deno.env.get('DENO_ENV') === 'development' ? err.message : undefined,
      },
      500,
      corsHeaders
    )
  }
})

function jsonResponse(data: Record<string, any>, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
  })
}