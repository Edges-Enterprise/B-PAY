import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_ANON_KEY')!
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
    })
  }

  try {
    const event = await req.json()

    console.log('Paystack webhook received:', {
      event: event.event,
      reference: event.data?.reference,
    })

    if (event.event !== 'charge.success') {
      return jsonResponse({ received: true }, 200, corsHeaders)
    }

    const { reference, status, amount } = event.data

    // Confirm it's a bank transfer
    if (!event.data.authorization || event.data.authorization.mode !== 'transfer') {
      return jsonResponse({ received: true }, 200, corsHeaders)
    }

    // Update transaction status in Supabase
    const { error } = await supabase
      .from('transactions')
      .update({
        status: 'success',
        amount_received: amount / 100, // Convert kobo back to NGN
        updated_at: new Date().toISOString(),
      })
      .eq('reference', reference)

    if (error) {
      console.error('Error updating transaction:', error.message)
      return jsonResponse(
        { error: 'Failed to update transaction' },
        500,
        corsHeaders
      )
    }

    console.log(`Transaction ${reference} marked as successful.`)

    return jsonResponse({ received: true }, 200, corsHeaders)
  } catch (err: any) {
    console.error('Webhook processing error:', {
      message: err.message,
      stack: err.stack,
    })

    return jsonResponse(
      { error: 'Internal server error' },
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