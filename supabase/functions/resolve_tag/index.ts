// supabase/functions/resolve-tag/index.ts
Deno.serve(async (req) => {
  const { tag } = await req.json();
  if (!tag?.startsWith('@')) return new Response('Invalid tag', { status: 400 });

  const cleanTag = tag.slice(1);

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, payscribe_account_number, full_name, bpay_tag')
    .eq('bpay_tag', cleanTag)
    .single();

  if (!profile) return new Response('Tag not found', { status: 404 });

  return new Response(JSON.stringify({
    success: true,
    account_number: profile.payscribe_account_number,  // ← real number (only backend sees this)
    name: profile.full_name || 'User',
    tag: `@${profile.bpay_tag}`
  }), { headers: { 'Content-Type': 'application/json' } });
});