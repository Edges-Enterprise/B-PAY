import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const { reference } = await req.json()
    
    // Verify with Paystack
    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          'Authorization': `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}`
        }
      }
    )

    const paystackData = await paystackResponse.json()
    
    if (paystackData.data.status !== 'success') {
      return new Response(
        JSON.stringify({ status: 'failed', message: 'Payment not successful' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const amount = paystackData.data.amount / 100
    const creditedAmount = amount * 0.9 // Deduct 10% fee
    
    // Update user balance
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get user from auth table using email
    const { data: { users } } = await supabaseClient.auth.admin.listUsers({
      filter: `email = '${paystackData.data.customer.email}'`
    })

    if (!users?.length) {
      return new Response(
        JSON.stringify({ status: 'failed', message: 'User not found' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
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

    return new Response(
      JSON.stringify({
        status: 'success',
        amount: creditedAmount,
        message: 'Wallet credited successfully'
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('Verification error:', err)
    return new Response(
      JSON.stringify({ status: 'error', message: 'Verification failed' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }
})