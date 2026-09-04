const { createClient } = require('@supabase/supabase-js');
const webpush = require('web-push');

const MESSAGES = require('./teaser-messages.js');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
webpush.setVapidDetails(
  'mailto:you@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

exports.handler = async () => {
  try {
    // Get settings → unlock time
    const { data: settings } = await sb.from('site_settings').select('*').eq('id', 1).single();
    if (!settings || !settings.unlock_time) {
      return { statusCode: 200, body: 'Testing mode — no push sent' };
    }
    const unlock = new Date(settings.unlock_time);
    const now = new Date();

    // Birthday arrived → stop messages
    if (now >= unlock) {
      // send ONE final "it's time" push on the unlock day
      const dayDiff = Math.floor((now - unlock) / 86400000);
      if (dayDiff > 0) return { statusCode: 200, body: 'Birthday passed — no push' };
    }

    const daysLeft = Math.max(Math.ceil((unlock - now) / 86400000), 0);

    // Pick message: index from the end (daysLeft 40 → message #61...)
    let msg;
    if (daysLeft <= 0) {
      msg = { title: '🎂 IT\'S YOUR BIRTHDAY!!!', body: 'Your surprise is ready, my love! Open the app NOW! 🎉💕' };
    } else if (daysLeft <= MESSAGES.length) {
      const m = MESSAGES[MESSAGES.length - daysLeft];
      msg = { title: `🎁 ${daysLeft} day${daysLeft > 1 ? 's' : ''} left...`, body: m };
    } else {
      msg = { title: '💕 A little secret...', body: 'Something magical is being prepared for you 🎁' };
    }

    // Get all subscriptions and send
    const { data: subs } = await sb.from('push_subscriptions').select('*');
    let sent = 0, removed = 0;
    for (const s of subs || []) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: s.keys },
          JSON.stringify({ title: msg.title, body: msg.body })
        );
        sent++;
      } catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) {
          await sb.from('push_subscriptions').delete().eq('id', s.id);
          removed++;
        }
      }
    }
    return { statusCode: 200, body: `Sent ${sent}, removed ${removed}` };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
};
