import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Validate request method
    if (req.method !== 'POST') {
      return jsonResponse({
        status: 'error',
        message: 'Method not allowed'
      }, 200, corsHeaders)
    }

    // Parse and validate request body
    const { amount, email, name } = await req.json()
    
    if (!amount || !email) {
      return jsonResponse({
        status: 'error',
        message: 'Amount and email are required'
      }, 200, corsHeaders)
    }

    if (isNaN(amount) || amount < 500) {
      return jsonResponse({
        status: 'error',
        message: 'Amount must be at least ₦500'
      }, 200, corsHeaders)
    }

    // Initialize Paystack payment
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
          amount: Math.round(amount * 100), // Convert to kobo
          currency: 'NGN',
          metadata: {
            customer_name: name || 'Customer',
            service_fee: amount * 0.1 // 10% fee
          },
          callback_url: Deno.env.get('PAYSTACK_CALLBACK_URL') || ''
        })
      }
    )

    const paystackData = await paystackResponse.json()
    
    if (!paystackResponse.ok) {
      return jsonResponse({
        status: 'failed',
        message: paystackData.message || 'Payment initialization failed',
        code: paystackData.status
      }, 200, corsHeaders)
    }

    // Successful response
    return jsonResponse({
      status: 'success',
      authorization_url: paystackData.data.authorization_url,
      access_code: paystackData.data.access_code,
      reference: paystackData.data.reference
    }, 200, corsHeaders)

  } catch (err) {
    console.error('Processing error:', err)
    return jsonResponse({
      status: 'error',
      message: 'Payment processing failed'
    }, 200, corsHeaders)
  }
})

// Helper function for JSON responses
function jsonResponse(data: any, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' }
  })
}