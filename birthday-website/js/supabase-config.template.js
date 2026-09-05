/* ============================================
   SUPABASE CONFIGURATION
   Values are injected from .env during the Netlify/local build.
   ============================================ */

const SUPABASE_URL = '__SUPABASE_URL__';
const SUPABASE_ANON_KEY = '__SUPABASE_ANON_KEY__';
const SUPABASE_URL_FULL = SUPABASE_URL + '/functions/v1';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* The public key goes here; the private key stays in Netlify env vars. */
const VAPID_PUBLIC_KEY = '__VAPID_PUBLIC_KEY__';

const ADMIN_PASSWORD = '__ADMIN_PASSWORD__';

/* Secret admin gesture: 5 taps within 2 seconds on the lock screen title */
const ADMIN_TAP_COUNT = 5;
const ADMIN_TAP_WINDOW = 2000;

/* Default site content — used before you save anything in admin */
const DEFAULT_CONTENT = {
   quizEnabled: true,
  name: '',
   you: '',
  hero: 'Today is all about you — the person who makes every single day of my life brighter just by being in it. 🥰',
  typed: 'You are my today and all of my tomorrows... 💕',
  wish: '✨ Your wish is my command... Happy Birthday, my queen! 👑💕',
  sig: 'Me',
  letter: 'My dearest,\n\nHappy Birthday! Every day with you feels like a gift. You make ordinary moments feel magical, and I am endlessly grateful for you. I promise to always be by your side — today, tomorrow, and forever.\n\nHappy Birthday, my love. 🎂',
  date: '',
  birthday: '',
  preTitle: 'Something magical is coming...',
  preSub: 'Come back on your special day, my love 💕',
  cakeName: 'Happy Birthday!',
  cakeAge: 5,
  mapYou: '', mapYouCity: '', mapYouCoord: '',
  mapHer: '', mapHerCity: '', mapHerCoord: '',
  mapMsg: 'Distance means nothing when you mean everything 💕'
};