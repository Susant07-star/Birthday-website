/* ==================== GLOBAL STATE ==================== */
let IS_UNLOCKED = false;
let ADMIN_PREVIEW = false;
let SITE_CONTENT = { ...DEFAULT_CONTENT };
let unlockTime = null;
let openedGifts = [];
let quizSecondsLeft = 30;
let quizTimer = null;
let quizCanAnswer = false;
let quizMoveTimer = null;
window._quizEnabled = true;

/* ==================== BOOT ==================== */
async function init() {
  setupLockGuards();
  setupInstallPrompt();
  await loadSettings();
  checkLock();
  if (IS_UNLOCKED || ADMIN_PREVIEW) await loadAllContent();
  setupNotificationUI();
}

/* ==================== SETTINGS & LOCK ==================== */
async function loadSettings() {
  try {
    const { data } = await sb.from('site_settings').select('*').eq('id', 1).single();
    if (data) {
      unlockTime = data.unlock_time ? new Date(data.unlock_time) : null;
      window._adminEmail = data.admin_email || '';
    }
    const { data: content } = await sb.from('site_content').select('data').eq('id', 1).single();
    if (content && content.data) window._quizEnabled = content.data.quizEnabled !== false;
  } catch (e) {
    console.warn('settings:', e.message);
    // Do not expose the surprise when the lock time cannot be verified.
    unlockTime = new Date(Date.now() + 365 * 86400000);
  }
}

function setupLockGuards() {
  const isLocked = () => document.body.classList.contains('app-locked') || document.body.classList.contains('locked');
  document.addEventListener('gesturestart', e => { if (isLocked()) e.preventDefault(); }, { passive: false });
  document.addEventListener('gesturechange', e => { if (isLocked()) e.preventDefault(); }, { passive: false });
  document.addEventListener('gestureend', e => { if (isLocked()) e.preventDefault(); }, { passive: false });
  document.addEventListener('dblclick', e => { if (isLocked()) e.preventDefault(); }, { passive: false });
  document.addEventListener('wheel', e => { if (isLocked()) e.preventDefault(); }, { passive: false });
}

function checkLock() {
  // NULL unlock_time = Testing mode → site open for everyone
  IS_UNLOCKED = !unlockTime || new Date() >= unlockTime;

  if (IS_UNLOCKED) {
    document.body.classList.remove('app-locked', 'locked');
    const siteContent = document.getElementById('siteContent');
    siteContent.setAttribute('aria-hidden', 'false');
    siteContent.removeAttribute('inert');
    document.getElementById('preOverlay').style.display = 'none';
    startSite();
  } else {
    // LOCKED → show lock screen, hide main site entirely
    document.body.classList.add('locked');
    runLockScreen();
    // Safety: re-check every 30s so site opens automatically at unlock moment
    setInterval(() => {
      if (!IS_UNLOCKED && new Date() >= unlockTime) location.reload();
    }, 30000);
  }
}

/* ==================== LOCK SCREEN ==================== */
function runLockScreen() {
  // Pre-title & subtitle from saved content
  document.getElementById('lockTitle').textContent = SITE_CONTENT.preTitle || 'Something magical is coming...';
  document.getElementById('preSub').textContent = SITE_CONTENT.preSub || 'Come back on your special day, my love 💕';

  // Daily teaser message (one per day, stops at birthday)
  const daysLeft = Math.ceil((unlockTime - new Date()) / 86400000);
  const dayIndex = Math.min(TEASER_MESSAGES.length - Math.max(daysLeft, 1), TEASER_MESSAGES.length - 1);
  const teaser = TEASER_MESSAGES[Math.max(dayIndex, 0)];
  document.getElementById('dailyTeaser').textContent = teaser;

  // Live countdown to unlock moment
  setInterval(() => {
    const diff = unlockTime - new Date();
    if (diff <= 0) return;
    const s = Math.floor(diff / 1000);
    document.getElementById('pD').textContent = Math.floor(s / 86400);
    document.getElementById('pH').textContent = Math.floor(s / 3600) % 24;
    document.getElementById('pM').textContent = Math.floor(s / 60) % 60;
    document.getElementById('pS').textContent = s % 60;
  }, 1000);
}

/* ==================== SECRET ADMIN: 5-TAP GESTURE ==================== */
let tapCount = 0, tapTimer = null;
function lockTitleTap() {
  tapCount++;
  clearTimeout(tapTimer);
  tapTimer = setTimeout(() => tapCount = 0, ADMIN_TAP_WINDOW);
  if (tapCount >= ADMIN_TAP_COUNT) {
    tapCount = 0;
    document.getElementById('adminGate').classList.add('open');
    document.getElementById('adminPass').focus();
  }
}

function adminTry() {
  const pass = document.getElementById('adminPass').value;
  if (pass === ADMIN_PASSWORD) {
    ADMIN_PREVIEW = true;
    document.body.classList.remove('app-locked', 'locked');
    const siteContent = document.getElementById('siteContent');
    siteContent.setAttribute('aria-hidden', 'false');
    siteContent.removeAttribute('inert');
    document.getElementById('preOverlay').style.display = 'none';
    document.body.classList.remove('locked');
    loadAllContent().then(() => {
      showAdminBtn();
      openAdmin();
    });
  } else {
    document.getElementById('adminGateMsg').textContent = '❌ Wrong password';
    document.getElementById('adminPass').value = '';
  }
}

function showAdminBtn() {
  // floating ⚙️ button — visible only to logged-in admin
  const btn = document.getElementById('adminBtn') || document.createElement('button');
  btn.className = 'admin-btn';
  btn.textContent = '⚙️';
  btn.onclick = openAdmin;
  btn.id = 'adminBtn';
  if (!btn.parentNode) document.body.appendChild(btn);
}

/* ==================== LOAD ALL SITE CONTENT ==================== */
async function loadAllContent() {
  try {
    const { data } = await sb.from('site_content').select('data').eq('id', 1).single();
    if (data && data.data && Object.keys(data.data).length) SITE_CONTENT = { ...DEFAULT_CONTENT, ...data.data };
  } catch (e) {}
  applyContent(SITE_CONTENT);
  loadMedia();
  loadMessages();
  loadOpenLetters();
  loadGiftBoxes();
}

function applyContent(d) {
  if (d.name) document.getElementById('heroName').textContent = 'My Beautiful ' + d.name + ' 💖';
  if (d.hero) document.getElementById('heroMsg').textContent = d.hero;
  document.getElementById('danceNameYou').textContent = d.you || 'Me';
  document.getElementById('danceNameHer').textContent = d.name || 'You';
  document.getElementById('ballroomNameYou').textContent = d.you || 'Me';
  document.getElementById('ballroomNameHer').textContent = d.name || 'You';
  if (d.wish) document.getElementById('wishMsg').textContent = d.wish;
  if (d.letter) document.getElementById('letterText').innerHTML = d.letter.replace(/\n/g, '<br>');
  if (d.sig) document.getElementById('sigText').innerHTML = 'Forever yours ❤️<br>' + d.sig;
  if (d.typed) startTypewriter(d.typed);
  if (d.date) {
    document.getElementById('countdown').style.display = 'flex';
    updateStartDateLabel(d.date);
    startCountdown(new Date(d.date));
  } else {
    document.getElementById('startDateText').style.display = 'none';
  }
  if (d.cakeName) document.getElementById('cakeName').textContent = d.cakeName;
  buildCandles(parseInt(d.cakeAge) || 5);
  const hasMap = [d.mapYou, d.mapYouCity, d.mapHer, d.mapHerCity].some(value => String(value || '').trim());
  document.getElementById('mapSection').style.display = hasMap ? 'block' : 'none';
  document.getElementById('mapYouName').textContent = d.mapYou || 'Your location';
  document.getElementById('mapYouCityEl').textContent = d.mapYouCity || '';
  document.getElementById('mapHerNameEl').textContent = d.mapHer || 'Her location';
  document.getElementById('mapHerCityEl').textContent = d.mapHerCity || '';
  document.getElementById('mapMsgEl').textContent = d.mapMsg || DEFAULT_CONTENT.mapMsg;
}

function buildCandles(n) {
  const row = document.getElementById('candleRow');
  row.innerHTML = '';
  n = Math.min(Math.max(n, 1), 50);
  for (let i = 0; i < n; i++) {
    const c = document.createElement('div');
    c.className = 'candle';
    c.innerHTML = '<div class="flame"></div>';
    row.appendChild(c);
  }
}

/* ==================== OPEN WHEN LETTERS ==================== */
async function loadOpenLetters() {
  const grid = document.getElementById('envelopeGrid');
  let letters = [];
  try {
    const { data } = await sb.from('open_letters').select('*').order('position');
    if (data && data.length) letters = data;
  } catch (e) {}
  if (!letters.length) {
    grid.innerHTML = '<p class="empty-hint">Envelopes coming soon... 💌</p>';
    return;
  }
  grid.innerHTML = '';
  letters.forEach(l => {
    const el = document.createElement('div');
    el.className = 'envelope';
    el.innerHTML = `<div class="env-icon">💌</div><h4>${esc(l.title)}</h4><div class="env-seal">Sealed with love — tap to open</div>`;
    el.onclick = () => {
      el.classList.add('opened');
      document.getElementById('letterModalTitle').textContent = l.title;
      document.getElementById('letterModalBody').textContent = l.body;
      document.getElementById('letterOverlay').classList.add('open');
    };
    grid.appendChild(el);
  });
}

/* ==================== MYSTERY GIFT BOXES (birthday only) ==================== */
async function loadGiftBoxes() {
  const grid = document.getElementById('giftGrid');
  let boxes = [];
  try {
    const { data } = await sb.from('gift_boxes').select('*').order('position');
    if (data) boxes = data;
  } catch (e) {}
  if (!boxes.length) {
    grid.innerHTML = '<p class="empty-hint">🎁 Something is being prepared...</p>';
    return;
  }

  const isBirthday = unlockTime ? new Date() >= unlockTime : true;
  const hint = document.getElementById('giftHint');
  hint.textContent = isBirthday
    ? 'Tap a box to open your gift, birthday girl! 🎉'
    : '🎁 Gifts unlock on your birthday, my love!';

  grid.innerHTML = '';
  boxes.forEach(b => {
    const el = document.createElement('div');
    const canOpen = isBirthday && !openedGifts.includes(b.id);
    el.className = 'gift-box' + (canOpen ? '' : lockedClass(isBirthday, openedGifts, b.id));
    el.innerHTML = `<span class="gb-icon">${isBirthday ? '🎁' : '🔒'}</span>
      <div class="gb-label">${isBirthday ? 'Gift ' + b.position : 'Locked 🔒'}</div>
      <div class="gb-status">${!isBirthday ? 'Opens on your birthday' : (openedGifts.includes(b.id) ? 'Opened ✓' : 'Tap to open!')}</div>`;
    if (canOpen) el.onclick = () => openGift(b, el);
    grid.appendChild(el);
  });
}
function lockedClass(isBday, opened, id) {
  if (!isBday) return 'locked-day';
  return opened.includes(id) ? 'opened' : '';
}

async function openGift(box, el) {
  el.classList.add('opened');
  if (!openedGifts.includes(box.id)) openedGifts.push(box.id);

  const c = document.getElementById('giftModalContent');
  let inner = '';
  if (box.content_type === 'photo') inner = `${box.heading ? `<h3 class="gift-reveal-heading">${esc(box.heading)}</h3>` : ''}<img src="${esc(box.content_data)}" alt="Gift"><p>${esc(box.caption)}</p>`;
  else if (box.content_type === 'video') inner = `<video src="${esc(box.content_data)}" controls></video><p>${esc(box.caption)}</p>`;
  else if (box.content_type === 'voice') inner = `<audio src="${esc(box.content_data)}" controls autoplay></audio><p>${esc(box.caption)}</p>`;
  else inner = `<p style="font-size:1.15rem;white-space:pre-wrap">${esc(box.content_data)}</p>`;

  c.innerHTML = '<div style="font-size:3rem;margin-bottom:10px">🎉</div>' + inner;
  document.getElementById('giftOverlay').classList.add('open');
  burst(120);
  loadGiftBoxes();
}

/* ==================== MEDIA ==================== */
async function loadMedia() {
  try {
    const { data } = await sb.from('media_files').select('*').order('id');
    if (!data) return;

    const gallery = document.getElementById('gallery');
    const photos = data.filter(m => m.type === 'photos');
    if (photos.length) {
      gallery.innerHTML = '';
      photos.forEach(m => {
        const img = document.createElement('img');
        img.src = m.url; img.loading = 'lazy'; img.alt = 'Memory';
        img.onclick = () => {
          document.getElementById('lightboxImg').src = m.url;
          document.getElementById('lightbox').classList.add('open');
        };
        gallery.appendChild(img);
      });
    } else gallery.innerHTML = '<p class="empty-hint">📸 Photos coming soon...</p>';

    const videos = data.filter(m => m.type === 'videos');
    if (videos.length) {
      document.getElementById('videoSection').style.display = 'block';
      const vw = document.getElementById('videoWrap'); vw.innerHTML = '';
      videos.forEach(m => {
        const vid = document.createElement('video');
        vid.src = m.url; vid.controls = true; vid.preload = 'metadata';
        vw.appendChild(vid);
      });
    }

    const music = data.find(m => m.type === 'music');
    if (music) {
      document.getElementById('bgMusic').src = music.url;
      document.getElementById('musicCtrl').style.display = 'block';
    }

    const voice = data.find(m => m.type === 'voice');
    if (voice) {
      document.getElementById('voiceAudio').src = voice.url;
      document.getElementById('voiceSection').style.display = 'block';
    }
  } catch (e) { console.warn('media:', e.message); }
}

/* ==================== MESSAGES / FORTUNE ==================== */
const FALLBACK_MSGS = [
  { emoji: '💖', text: 'You are the best thing that ever happened to me.' },
  { emoji: '🌸', text: 'Every day with you is a beautiful new page in our story.' },
  { emoji: '☀️', text: 'You are the sunshine that brightens my darkest days.' },
  { emoji: '💫', text: 'Loving you is the easiest thing I have ever done.' },
  { emoji: '🎁', text: 'You are my greatest gift, today and always.' },
  { emoji: '💕', text: 'I fall in love with you all over again every single day.' },
  { emoji: '🌹', text: 'Of all the things my hands have held, the best by far is you.' }
];

async function loadMessages() {
  let msgs = [];
  try {
    const { data } = await sb.from('messages').select('*').order('id');
    if (data && data.length) msgs = data;
  } catch (e) {}
  if (!msgs.length) msgs = FALLBACK_MSGS;
  window._msgs = msgs;

  const day = Math.floor(Date.now() / 86400000);
  const m = msgs[day % msgs.length];
  document.getElementById('noteEmoji').textContent = m.emoji;
  document.getElementById('noteText').textContent = m.text;
}

function getFortune() {
  const list = window._msgs || FALLBACK_MSGS;
  const m = list[Math.floor(Math.random() * list.length)];
  const f = document.getElementById('fortune');
  f.style.opacity = 0;
  setTimeout(() => { f.textContent = m.emoji + ' ' + m.text; f.style.opacity = 1; }, 100);
}

/* ==================== TYPEWRITER / COUNTDOWN ==================== */
let typeStarted = false;
function startTypewriter(text) {
  const el = document.getElementById('typedText');
  if (typeStarted) { el.textContent = text; return; }
  typeStarted = true;
  let i = 0;
  (function type() { if (i < text.length) { el.textContent += text[i++]; setTimeout(type, 70); } })();
}

let cdStarted = false;
function updateStartDateLabel(dateString) {
  const el = document.getElementById('startDateText');
  if (!dateString) {
    el.style.display = 'none';
    return;
  }

  const start = new Date(dateString + 'T00:00:00');
  if (Number.isNaN(start.getTime())) {
    el.style.display = 'none';
    return;
  }

  el.textContent = 'Started on ' + start.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
  el.style.display = 'block';
}

function startCountdown(startDate) {
  if (cdStarted) return;
  cdStarted = true;
  setInterval(() => {
    const diff = Date.now() - startDate.getTime();
    if (diff < 0) return;
    const s = Math.floor(diff / 1000);
    document.getElementById('cdD').textContent = Math.floor(s / 86400);
    document.getElementById('cdH').textContent = Math.floor(s / 3600) % 24;
    document.getElementById('cdM').textContent = Math.floor(s / 60) % 60;
    document.getElementById('cdS').textContent = s % 60;
  }, 1000);
}

/* ==================== FLOATING HEARTS ==================== */
(function () {
  const box = document.getElementById('hearts');
  for (let i = 0; i < 18; i++) {
    const h = document.createElement('div');
    h.className = 'heart';
    h.textContent = ['💖', '💕', '💗', '💝', '❤️'][i % 5];
    h.style.left = Math.random() * 100 + 'vw';
    h.style.fontSize = (15 + Math.random() * 25) + 'px';
    h.style.animationDuration = (6 + Math.random() * 8) + 's';
    h.style.animationDelay = (Math.random() * 8) + 's';
    box.appendChild(h);
  }
})();

/* ==================== CONFETTI ==================== */
const canvas = document.getElementById('confetti');
const ctx = canvas.getContext('2d');
canvas.width = innerWidth; canvas.height = innerHeight;
let confetti = [];

function burst(n) {
  n = n || 150;
  for (let i = 0; i < n; i++) {
    confetti.push({
      x: Math.random() * canvas.width, y: -20,
      w: 6 + Math.random() * 8, h: 8 + Math.random() * 10,
      vy: 2 + Math.random() * 4, vx: -2 + Math.random() * 4,
      rot: Math.random() * 360, vr: -5 + Math.random() * 10,
      color: ['#ff5e94', '#ffd700', '#ff9a9e', '#c77dff', '#4cc9f0', '#fff'][Math.floor(Math.random() * 6)]
    });
  }
}
(function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  confetti = confetti.filter(c => c.y < canvas.height + 30);
  confetti.forEach(c => {
    c.y += c.vy; c.x += c.vx; c.rot += c.vr;
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.rot * Math.PI / 180);
    ctx.fillStyle = c.color; ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h); ctx.restore();
  });
  requestAnimationFrame(animate);
})();
addEventListener('resize', () => { canvas.width = innerWidth; canvas.height = innerHeight; });

/* ==================== BLOW CANDLES + VOICE ==================== */
function blowCandles() {
  const cake = document.getElementById('cake');
  if (cake.classList.contains('candles-out')) return;
  cake.classList.add('candles-out');
  const wishMsg = document.getElementById('wishMsg');
  const birthdayReveal = document.getElementById('birthdayReveal');
  if (birthdayReveal) birthdayReveal.style.display = 'block';
  if (!wishMsg.textContent.trim()) wishMsg.textContent = '✨ Your wish is my command... Happy Birthday, my queen! 👑💕';
  wishMsg.style.display = 'block';
  burst(250);
  setTimeout(() => burst(200), 700);
  // Play the voice note after candles 🎤
  const voice = document.getElementById('voiceAudio');
  if (voice.src) voice.play().catch(() => {});
}

/* ==================== MUSIC ==================== */
let musicPlaying = false;
function toggleMusic() {
  const music = document.getElementById('bgMusic');
  const ctrl = document.getElementById('musicCtrl');
  if (musicPlaying) { music.pause(); ctrl.textContent = '🔇'; }
  else { music.play().catch(() => {}); ctrl.textContent = '🔊'; }
  musicPlaying = !musicPlaying;
}

/* ==================== HER REPLY (feature 14) ==================== */
async function sendReply() {
  const txt = document.getElementById('replyText').value.trim();
  if (!txt) { document.getElementById('replyMsg').textContent = 'Write something first 🥹'; return; }
  try {
    const { error } = await sb.from('replies').insert({ text: txt });
    if (error) throw error;
    document.getElementById('replyText').value = '';
    document.getElementById('replyMsg').textContent = '💌 Sent! He is going to smile so hard reading this 💕';
    burst(80);
    // notify admin via Netlify function (fire & forget)
    fetch('/.netlify/functions/send-push-reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: txt })
    }).catch(() => {});
  } catch (e) {
    document.getElementById('replyMsg').textContent = '❌ ' + e.message;
  }
}

/* ==================== PWA: INSTALL PROMPT ==================== */
let deferredPrompt = null;
function setupInstallPrompt() {
  const overlay = document.getElementById('installOverlay');
  const btn = document.getElementById('installBtn');
  const close = document.getElementById('installClose');
  const copy = document.getElementById('installCopy');
  const status = document.getElementById('installStatus');
  if (!overlay || !btn || !close) return;

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (isStandalone) return;

  const closePrompt = () => {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
  };

  const showPrompt = () => {
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
  };

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (isIOS) {
    copy.textContent = 'Tap Share, then Add to Home Screen to keep this birthday surprise close.';
    btn.textContent = 'Got it';
  }

  close.addEventListener('click', closePrompt);
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closePrompt();
  });
  btn.addEventListener('click', async () => {
    if (!deferredPrompt) {
      status.textContent = isIOS ? 'Use your browser Share button, then choose Add to Home Screen.' : 'Use your browser menu and choose Install app or Add to home screen.';
      if (isIOS) closePrompt();
      return;
    }
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;
    if (choice.outcome === 'accepted') closePrompt();
    else status.textContent = 'You can install it any time from this button.';
  });

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    btn.textContent = '📲 Install App';
  });

  window.addEventListener('appinstalled', closePrompt);
  window.setTimeout(showPrompt, 900);
}

/* ==================== PWA: NOTIFICATIONS ==================== */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64 + padding);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

async function setupNotificationUI() {
  // Only show button when locked (teaser phase) and browser supports push
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
  if (Notification.permission === 'granted') {
    await saveSubscription();
    return;
  }
  if (Notification.permission === 'denied') return;
  const btn = document.getElementById('notifBtn');
  if (btn && !IS_UNLOCKED) btn.style.display = 'inline-block';
}

async function enableNotifications() {
  const btn = document.getElementById('notifBtn');
  const perm = await Notification.requestPermission();
  if (perm === 'granted') {
    btn.textContent = '✅ Notifications On! See you at 5 AM & 5 PM 💕';
    btn.disabled = true;
    await saveSubscription();
    // Confirmation notification
    navigator.serviceWorker.ready.then(reg => {
      reg.showNotification('💕 You\'re all set, my love!', {
        body: 'You\'ll get a sweet surprise message every morning & evening until your big day 🎂',
        icon: '/icons/icon-192.png'
      });
    });
  } else {
    btn.textContent = '😢 Notifications blocked — enable them in browser settings';
  }
}

async function saveSubscription() {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });
    const s = sub.toJSON();
    await sb.from('push_subscriptions').upsert({
      endpoint: s.endpoint, keys: s.keys
    }, { onConflict: 'endpoint' });
  } catch (e) { console.warn('push sub:', e.message); }
}

/* ==================== REVEAL ON SCROLL ==================== */
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.2 });

function observeCards() {
  document.querySelectorAll('.card, .tl-item').forEach(c => observer.observe(c));
}

/* ==================== UTIL ==================== */
function esc(s) {
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}

function startSite() {
  observeCards();
  if (!ADMIN_PREVIEW && window._quizEnabled !== false) openQuizGate();
}

/* ==================== BIRTHDAY QUESTION GATE ==================== */
function openQuizGate() {
  const overlay = document.getElementById('quizOverlay');
  if (!overlay || overlay.classList.contains('open')) return;
  overlay.classList.add('open');
  document.body.classList.add('quiz-locked');
  quizSecondsLeft = 30;
  quizCanAnswer = false;
  document.getElementById('quizSeconds').textContent = quizSecondsLeft;
  document.getElementById('quizStatus').textContent = 'The answers are shy for 30 seconds...';
  bindQuizOptions();
  arrangeInitialQuizOptions();
  clearInterval(quizTimer);
  quizTimer = setInterval(() => {
    quizSecondsLeft--;
    document.getElementById('quizSeconds').textContent = quizSecondsLeft;
    if (quizSecondsLeft <= 0) finishQuizWaiting();
  }, 1000);
}

function bindQuizOptions() {
  document.querySelectorAll('.quiz-option').forEach(option => {
    option.onclick = event => {
      moveQuizOption(option, { x: event.clientX, y: event.clientY });
      option.blur();
      document.getElementById('quizStatus').textContent = 'Not yet... wait for the timer 💕';
    };
    option.onpointerenter = event => { if (!quizCanAnswer) moveQuizOption(option, { x: event.clientX, y: event.clientY }); };
    option.onpointerdown = event => {
      if (!quizCanAnswer) moveQuizOption(option, { x: event.clientX, y: event.clientY });
      option.blur();
    };
  });
}

function finishQuizWaiting() {
  clearInterval(quizTimer);
  quizCanAnswer = true;
  document.querySelectorAll('.quiz-option').forEach(option => option.style.transform = '');
  const status = document.getElementById('quizStatus');
  status.className = 'quiz-status pop-message';
  status.textContent = "You don't know about him... so sad 😢";
  setTimeout(() => {
    status.className = 'quiz-status entering-message';
    status.textContent = 'Now entering to your surprise... ✨';
    setTimeout(unlockQuizGate, 4000);
  }, 4000);
}

function arrangeInitialQuizOptions() {
  const arena = document.getElementById('quizArena');
  const options = [...document.querySelectorAll('.quiz-option')];
  const isPhone = window.innerWidth <= 600;
  const buttonWidth = Math.min(175, Math.max(120, arena.clientWidth * (isPhone ? 0.42 : 0.18)));
  const positions = isPhone
    ? [{ left: 0.04, top: 14 }, { left: 0.54, top: 14 }, { left: 0.04, top: 88 }, { left: 0.54, top: 88 }]
    : [{ left: 0.03, top: 14 }, { left: 0.28, top: 14 }, { left: 0.53, top: 14 }, { left: 0.78, top: 14 }];
  options.forEach((option, index) => {
    option.style.width = buttonWidth + 'px';
    option.style.left = (arena.clientWidth * positions[index].left) + 'px';
    option.style.top = positions[index].top + 'px';
    option.style.right = 'auto';
    option.style.bottom = 'auto';
  });
}

function arrangeQuizOptions() {
  const arena = document.getElementById('quizArena');
  const options = [...document.querySelectorAll('.quiz-option')];
  const positions = [];
  options.forEach(option => {
    const width = option.offsetWidth;
    const height = option.offsetHeight;
    let position = null;
    for (let attempt = 0; attempt < 80 && !position; attempt++) {
      const candidate = { left: 10 + Math.random() * Math.max(10, arena.clientWidth - width - 20), top: 10 + Math.random() * Math.max(10, arena.clientHeight - height - 20), width, height };
      if (positions.every(existing => candidate.left + candidate.width + 12 < existing.left || candidate.left > existing.left + existing.width + 12 || candidate.top + candidate.height + 12 < existing.top || candidate.top > existing.top + existing.height + 12)) position = candidate;
    }
    if (position) {
      option.style.left = position.left + 'px'; option.style.top = position.top + 'px';
      option.style.right = 'auto'; option.style.bottom = 'auto'; positions.push(position);
    }
  });
}

function moveQuizOption(option, pointerPoint = null) {
  const arena = document.getElementById('quizArena');
  const width = option.offsetWidth;
  const height = option.offsetHeight;
  const arenaRect = arena.getBoundingClientRect();
  const avoidPoint = pointerPoint ? { x: pointerPoint.x - arenaRect.left, y: pointerPoint.y - arenaRect.top } : null;
  const minimumPointerDistance = Math.max(90, Math.min(arena.clientWidth, arena.clientHeight) * 0.35);
  const others = [...document.querySelectorAll('.quiz-option')].filter(item => item !== option).map(item => ({ left: item.offsetLeft, top: item.offsetTop, width: item.offsetWidth, height: item.offsetHeight }));
  for (let attempt = 0; attempt < 160; attempt++) {
    const left = 10 + Math.random() * Math.max(10, arena.clientWidth - width - 20);
    const top = 10 + Math.random() * Math.max(10, arena.clientHeight - height - 20);
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    const farFromPointer = !avoidPoint || Math.hypot(centerX - avoidPoint.x, centerY - avoidPoint.y) >= minimumPointerDistance;
    if (farFromPointer && others.every(existing => left + width + 12 < existing.left || left > existing.left + existing.width + 12 || top + height + 12 < existing.top || top > existing.top + existing.height + 12)) {
      option.style.left = left + 'px'; option.style.top = top + 'px'; option.style.right = 'auto'; option.style.bottom = 'auto';
      return;
    }
  }
}

function unlockQuizGate() {
  clearInterval(quizTimer);
  document.getElementById('quizOverlay').classList.remove('open');
  document.body.classList.remove('quiz-locked');
}

/* ==================== GO! ==================== */
init();
