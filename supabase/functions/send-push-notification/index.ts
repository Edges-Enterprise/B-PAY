import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

console.log('Push Notification Function initialized');

serve(async (req) => {
  try {
    const payload = await req.json();
    const { record } = payload;

    // Initialize Supabase client (ensure environment variables are set)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch user's push token
    const { data: tokenData, error: tokenError } = await supabase
      .from('user_push_tokens')
      .select('push_token')
      .eq('user_id', record.user_id)
      .single();

    if (tokenError || !tokenData) {
      throw new Error('No push token found for user');
    }

    const pushToken = tokenData.push_token;

    // Send push notification via Expo
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: pushToken,
        sound: 'default',
        title: record.type.replace('_', ' ').toUpperCase(),
        body: record.message,
        data: { notificationId: record.id, ...record },
      }),
    });

    const result = await response.json();
    return new Response(JSON.stringify({ success: true, result }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error sending push notification:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});