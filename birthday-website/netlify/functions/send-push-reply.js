const webpush = require('web-push');
const { createClient } = require('@supabase/supabase-js');

webpush.setVapidDetails(
  'mailto:you@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'POST only' };

  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const { reply, from } = JSON.parse(event.body || '{}');

  // Save her reply so it shows in the admin Replies tab
  await sb.from('replies').insert([{ reply, created_at: new Date().toISOString() }]);

  // Push to all admin-subscribed devices (your phone/laptop)
  const { data: subs } = await sb.from('push_subscriptions').select('endpoint, keys');
  const payload = JSON.stringify({
    title: '💌 She replied to you!',
    body: (reply || '').slice(0, 120),
    url: '/'
  });
  await Promise.allSettled((subs || []).map(s => webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, payload)));

  return { statusCode: 200, body: 'ok' };
};
