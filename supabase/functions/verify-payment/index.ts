import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const { reference } = await req.json()
    
    // Verify with Paystack
    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          'Authorization': `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}`
        }
      }
    )

    const paystackData = await paystackResponse.json()
    
    if (paystackData.data.status !== 'success') {
      return jsonResponse({
        status: 'failed', 
        message: 'Payment not successful'
      }, 200)
    }

    const amount = paystackData.data.amount / 100
    const creditedAmount = amount * 0.9 // 10% fee
    
    // Initialize Supabase with SERVICE ROLE
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // Critical change
    )

    // Find user by email from Paystack response
    const { data: { users }, error: userError } = 
      await supabaseClient.auth.admin.listUsers({
        filter: `email = '${paystackData.data.customer.email}'`
      })

    if (!users?.length || userError) {
      return jsonResponse({
        status: 'failed',
        message: 'User account not found'
      }, 200)
    }

    const userId = users[0].id

    // Update wallet balance
    const { error: walletError } = await supabaseClient
      .from('wallets')
      .upsert({
        user_id: userId,
        balance: creditedAmount
      }, {
        onConflict: 'user_id'
      })

    if (walletError) throw walletError

    // Record transaction
    const { error: txError } = await supabaseClient
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'deposit',
        amount: creditedAmount,
        fee: amount * 0.1,
        reference,
        status: 'completed',
        method: 'Paystack'
      })

    if (txError) throw txError

    return jsonResponse({
      status: 'success',
      amount: creditedAmount,
      message: 'Wallet credited successfully'
    }, 200)

  } catch (err) {
    console.error('Verification error:', err)
    return jsonResponse({
      status: 'error',
      message: 'Payment verification failed'
    }, 200)
  }
})

function jsonResponse(data: any, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}