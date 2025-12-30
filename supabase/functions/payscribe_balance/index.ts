// supabase/functions/sync-payscribe-balance/index.ts
import { createClient } from '@supabase/supabase-js'
import axios from 'axios'

const PAYSCRIBE_SECRET = Deno.env.get('PAYSCRIBE_SECRET_KEY')! // never in app
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

Deno.serve(async () => {
  const { data: users } = await supabase
    .from('profiles')
    .select('id, payscribe_ref')
    .not('payscribe_ref', 'is', null)

  const updates = []

  for (const user of users) {
    if (!user.payscribe_ref) continue

    try {
      const res = await axios.get('https://api.payscribe.ng/api/v1/wallet/balance', {
        headers: { Authorization: `Bearer ${PAYSCRIBE_SECRET}` },
        params: { customer_ref: user.payscribe_ref } // or however Payscribe identifies sub-wallet
      })

      const balance = res.data.message.details.balance

      updates.push({
        id: user.id,
        balance,
        last_synced_at: new Date().toISOString(),
      })
    } catch (err) {
      console.error(`Failed for user ${user.id}:`, err.response?.data || err.message)
    }
  }

  if (updates.length > 0) {
    await supabase.from('profiles').upsert(updates, { onConflict: 'id' })
  }

  return new Response('Sync complete', { status: 200 })
})