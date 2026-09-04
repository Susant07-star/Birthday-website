/* ============================================
   SUPABASE CONFIGURATION
   1. supabase.com → create project (free)
   2. Run the SQL script in SQL Editor
   3. Create public storage bucket named "media"
   4. Paste URL + anon key below
   ============================================ */

const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';   // 👈 your URL
const SUPABASE_ANON_KEY = 'YOUR-ANON-KEY';                  // 👈 your anon key
const SUPABASE_URL_FULL = SUPABASE_URL + '/functions/v1';   // for edge functions if needed

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* VAPID keys for web push — generate at https://vapidkeys.com
   The PUBLIC key goes here; the PRIVATE key goes in the Netlify function env vars */
const VAPID_PUBLIC_KEY = 'YOUR-VAPID-PUBLIC-KEY';           // 👈 paste VAPID public key

const ADMIN_PASSWORD = 'admin123'; // 👈 CHANGE THIS!

/* Secret admin gesture: 5 taps within 2 seconds on the lock screen title */
const ADMIN_TAP_COUNT = 5;
const ADMIN_TAP_WINDOW = 2000;

/* Default site content — used before you save anything in admin */
const DEFAULT_CONTENT = {
  name: '',
  hero: 'Today is all about you — the person who makes every single day of my life brighter just by being in it. 🥰',
  typed: 'You are my today and all of my tomorrows... 💕',
  wish: '✨ Your wish is my command... Happy Birthday, my queen! 👑💕',
  sig: 'Me',
  letter: 'My dearest,\n\nHappy Birthday! Every day with you feels like a gift. You make ordinary moments feel magical, and I am endlessly grateful for you. I promise to always be by your side — today, tomorrow, and forever.\n\nHappy Birthday, my love. 🎂',
  date: '',
  birthday: '',           // datetime-local string (UTC-based)
  preTitle: 'Something magical is coming...',
  preSub: 'Come back on your special day, my love 💕',
  cakeName: 'Happy Birthday!',
  cakeAge: 5,
  mapYou: '', mapYouCity: '', mapYouCoord: '',
  mapHer: '', mapHerCity: '', mapHerCoord: '',
  mapMsg: 'Distance means nothing when you mean everything 💕'
};
