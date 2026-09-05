const { createClient } = require('@supabase/supabase-js');
const webpush = require('web-push');

const MESSAGES = require('./teaser-messages.js');
const TIME_ZONE = 'Asia/Kathmandu';
const DAILY_SEND_HOUR = 17;
const DAILY_SEND_MINUTE = 0;
const FINAL_REMINDER_HOUR = 23;
const FINAL_REMINDER_MINUTE = 55;

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
webpush.setVapidDetails(
  'mailto:you@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

exports.config = { schedule: '*/5 * * * *' };

function localParts(date) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(date).reduce((result, part) => {
    if (part.type !== 'literal') result[part.type] = Number(part.value);
    return result;
  }, {});
}

function dateNumber({ year, month, day }) {
  return Date.UTC(year, month - 1, day) / 86400000;
}

function addDays(date, amount) {
  const copy = new Date(Date.UTC(date.year, date.month - 1, date.day + amount));
  return { year: copy.getUTCFullYear(), month: copy.getUTCMonth() + 1, day: copy.getUTCDate() };
}

function dateKey(date) {
  return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
}

function getNotification(now, unlock) {
  const current = localParts(now);
  const unlockParts = localParts(unlock);
  const unlockDate = { year: unlockParts.year, month: unlockParts.month, day: unlockParts.day };
  const today = { year: current.year, month: current.month, day: current.day };
  const minutes = current.hour * 60 + current.minute;
  const unlockDay = dateNumber(unlockDate);
  const todayNumber = dateNumber(today);

  if (todayNumber === unlockDay && current.hour === 0 && current.minute < 5) {
    return {
      key: `final-${dateKey(unlockDate)}`,
      title: '💕 The surprise is ready!',
      body: 'It is time to open your surprise. Tap to begin! 🎉'
    };
  }

  const reminderDate = addDays(unlockDate, -1);
  if (dateKey(today) === dateKey(reminderDate) && current.hour === FINAL_REMINDER_HOUR && current.minute >= FINAL_REMINDER_MINUTE) {
    return {
      key: `five-minutes-${dateKey(unlockDate)}`,
      title: '⏳ 5 minutes to go!',
      body: 'The surprise opens in 5 minutes. Get ready, my love! 💕'
    };
  }

  if (minutes < DAILY_SEND_HOUR * 60 + DAILY_SEND_MINUTE || minutes >= DAILY_SEND_HOUR * 60 + DAILY_SEND_MINUTE + 5) return null;

  const daysLeft = unlockDay - todayNumber;
  if (daysLeft < 1 || daysLeft > MESSAGES.length - 50) return null;

  return {
    key: `daily-${dateKey(today)}-${daysLeft}`,
    title: `🎁 ${daysLeft} day${daysLeft === 1 ? '' : 's'} to go`,
    body: MESSAGES[MESSAGES.length - daysLeft]
  };
}

async function claimDelivery(key) {
  const { error } = await sb.from('notification_deliveries').insert({ delivery_key: key });
  if (!error) return true;
  if (error.code === '23505') return false;
  throw error;
}

async function sendToSubscriptions(payload) {
  const { data: subscriptions, error } = await sb.from('push_subscriptions').select('id, endpoint, keys');
  if (error) throw error;

  let sent = 0;
  let removed = 0;
  for (const subscription of subscriptions || []) {
    try {
      await webpush.sendNotification(
        { endpoint: subscription.endpoint, keys: subscription.keys },
        JSON.stringify(payload)
      );
      sent++;
    } catch (error) {
      if (error.statusCode === 404 || error.statusCode === 410) {
        await sb.from('push_subscriptions').delete().eq('id', subscription.id);
        removed++;
      } else {
        console.error('push delivery failed:', error.message);
      }
    }
  }
  return { sent, removed };
}

exports.handler = async () => {
  try {
    const { data: settings, error: settingsError } = await sb.from('site_settings').select('unlock_time').eq('id', 1).single();
    if (settingsError) throw settingsError;
    if (!settings || !settings.unlock_time) return { statusCode: 200, body: 'Testing mode - no push sent' };

    const notification = getNotification(new Date(), new Date(settings.unlock_time));
    if (!notification) return { statusCode: 200, body: 'No notification due' };
    if (!(await claimDelivery(notification.key))) return { statusCode: 200, body: 'Already sent' };

    const result = await sendToSubscriptions(notification);
    return { statusCode: 200, body: `Sent ${result.sent}, removed ${result.removed}` };
  } catch (error) {
    console.error('scheduled push failed:', error);
    return { statusCode: 500, body: error.message };
  }
};

exports.getNotification = getNotification;
