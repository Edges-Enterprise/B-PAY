import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return jsonResponse({
        status: 'error',
        message: 'Method not allowed'
      }, 200, corsHeaders)
    }

    // No auth check needed for payment initiation
    const { amount, email, name } = await req.json()
    
    if (!amount || !email) {
      return jsonResponse({
        status: 'error',
        message: 'Amount and email are required'
      }, 200, corsHeaders)
    }

    const numericAmount = Number(amount)
    if (isNaN(numericAmount) {
      return jsonResponse({
        status: 'error',
        message: 'Invalid amount format'
      }, 200, corsHeaders)
    }

    const paystackResponse = await fetch(
      'https://api.paystack.co/transaction/initialize',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          amount: Math.round(numericAmount * 100),
          currency: 'NGN',
          metadata: {
            customer_name: name || email.split('@')[0],
            service_fee: numericAmount * 0.1
          },
          callback_url: Deno.env.get('PAYSTACK_CALLBACK_URL') || ''
        })
      }
    )

    const paystackData = await paystackResponse.json()
    
    if (!paystackResponse.ok) {
      return jsonResponse({
        status: 'failed',
        message: paystackData.message || 'Payment initialization failed'
      }, 200, corsHeaders)
    }

    return jsonResponse({
      status: 'success',
      authorization_url: paystackData.data.authorization_url,
      reference: paystackData.data.reference
    }, 200, corsHeaders)

  } catch (err) {
    console.error('Error:', err)
    return jsonResponse({
      status: 'error',
      message: 'Internal server error'
    }, 200, corsHeaders)
  }
})

function jsonResponse(data: any, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' }
  })
}