// /supabase/functions/assign-random-offer-window.ts

import { createClient } from '@supabase/supabase-js'
const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))

function getRandomWindow() {
  const startHour = 8 + Math.floor(Math.random() * 16) // 8AM–11PM
  const start = new Date()
  start.setHours(startHour, 0, 0, 0)
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)
  return { start, end }
}

const { data: users } = await supabase
  .from('profiles')
  .select('id, welcome_offer_stock, welcome_offer_hidden_until')

for (const u of users) {
  if (u.welcome_offer_stock > 0 && (!u.welcome_offer_hidden_until || new Date() >= new Date(u.welcome_offer_hidden_until))) {
    const { start, end } = getRandomWindow()
    await supabase.from('profiles')
      .update({
        welcome_offer_window_start: start,
        welcome_offer_window_end: end,
      })
      .eq('id', u.id)
  }
}
