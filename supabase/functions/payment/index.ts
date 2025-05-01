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
    
    // Input validation
    if (!amount || !email) {
      return jsonResponse({
        status: 'error',
        message: 'Amount and email are required'
      }, 200, corsHeaders)
    }

    const numericAmount = Number(amount)
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return jsonResponse({
        status: 'error',
        message: 'Amount must be a positive number'
      }, 200, corsHeaders)
    }

    // Minimum amount check
    if (numericAmount < 500) {
      return jsonResponse({
        status: 'error',
        message: 'Minimum amount is ₦500'
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
          amount: Math.round(numericAmount * 100), // Convert to kobo
          currency: 'NGN',
          metadata: {
            customer_name: name || email.split('@')[0] || 'Customer',
            service_fee: (numericAmount * 0.1).toFixed(2), // 10% fee
            original_amount: numericAmount.toFixed(2)
          },
          callback_url: Deno.env.get('PAYSTACK_CALLBACK_URL') || `${Deno.env.get('SITE_URL')}/payment-callback`
        })
      }
    )

    const paystackData = await paystackResponse.json()
    
    if (!paystackResponse.ok) {
      console.error('Paystack API Error:', paystackData.message)
      return jsonResponse({
        status: 'failed',
        message: paystackData.message || 'Payment initialization failed',
        code: paystackData.status || 'unknown_error'
      }, 200, corsHeaders)
    }

    // Success response
    return jsonResponse({
      status: 'success',
      authorization_url: paystackData.data.authorization_url,
      access_code: paystackData.data.access_code,
      reference: paystackData.data.reference,
      amount: numericAmount,
      fee: (numericAmount * 0.1).toFixed(2)
    }, 200, corsHeaders)

  } catch (err) {
    console.error('Server Error:', err)
    return jsonResponse({
      status: 'error',
      message: 'Internal server error',
      error: err.message // Only include in development
    }, 200, corsHeaders)
  }
})

// Helper function for consistent JSON responses
function jsonResponse(
  data: Record<string, unknown>,
  status: number,
  headers: Record<string, string>
) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' }
  })
}