const webpush = require('web-push');
const { createClient } = require('@supabase/supabase-js');

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

webpush.setVapidDetails('mailto:you@example.com', VAPID_PUBLIC, VAPID_PRIVATE);

const TEASERS = require('../../teaser-messages.js');

exports.handler = async () => {
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Lock settings: stop everything once birthday arrives
  const { data: settings } = await sb.from('site_settings').select('*').single();
  if (settings?.testing_mode) return { statusCode: 200, body: 'testing mode — no push' };
  const unlock = settings?.unlock_time ? new Date(settings.unlock_time) : null;
  if (unlock && unlock <= new Date()) return { statusCode: 200, body: 'unlocked — no teaser push' };

  // Pick today's message by days remaining (100-message queue, stops at birthday)
  const daysLeft = Math.ceil((unlock - Date.now()) / 86400000);
  const msg = TEASERS[Math.max(0, Math.min(TEASERS.length - 1, 100 - daysLeft))] ||
              `Only ${daysLeft} days left, my love 🎂💕`;

  const { data: subs } = await sb.from('push_subscriptions').select('subscription');
  const payload = JSON.stringify({ title: '🎁 Something magical...', body: msg, url: '/' });
  const results = await Promise.allSettled(
    (subs || []).map(s => webpush.sendNotification(s.subscription, payload))
  );

  // Clean up dead subscriptions (uninstalled app / expired)
  const dead = results.filter(r => r.status === 'rejected' && /410|404/.test(r.reason?.message || ''));
  if (dead.length) {
    await sb.from('push_subscriptions')
      .delete()
      .in('subscription', dead.map((_, i) => subs[i].subscription));
  }

  return { statusCode: 200, body: `sent to ${subs ? subs.length : 0} subs` };
};
