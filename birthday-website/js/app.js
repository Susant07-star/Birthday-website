/* ==================== GLOBAL STATE ==================== */
let IS_UNLOCKED = false;
let ADMIN_PREVIEW = false;
let SITE_CONTENT = { ...DEFAULT_CONTENT };
let unlockTime = null;

/* ==================== BOOT ==================== */
async function init() {
  await loadSettings();
  checkLock();
  if (IS_UNLOCKED || ADMIN_PREVIEW) await loadAllContent();
  setupInstallPrompt();
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
  } catch (e) { console.warn('settings:', e.message); }
}

function checkLock() {
  // NULL unlock_time = Testing mode → site open for everyone
  IS_UNLOCKED = !unlockTime || new Date() >= unlockTime;

  if (IS_UNLOCKED) {
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
  const btn = document.createElement('button');
  btn.className = 'admin-btn';
  btn.textContent = '⚙️';
  btn.onclick = openAdmin;
  btn.id = 'adminBtn';
  document.body.appendChild(btn);
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
  if (d.you) document.getElementById('danceNameYou').textContent = d.you;
  if (d.name) document.getElementById('danceNameHer').textContent = d.name;
  if (d.wish) document.getElementById('wishMsg').textContent = d.wish;
  if (d.letter) document.getElementById('letterText').innerHTML = d.letter.replace(/\n/g, '<br>');
  if (d.sig) document.getElementById('sigText').innerHTML = 'Forever yours ❤️<br>' + d.sig;
  if (d.typed) startTypewriter(d.typed);
  if (d.date) {
    document.getElementById('countdown').style.display = 'flex';
    startCountdown(new Date(d.date));
  }
  if (d.cakeName) document.getElementById('cakeName').textContent = d.cakeName;
  buildCandles(parseInt(d.cakeAge) || 5);
  // Map
  if (d.mapYou && d.mapHer) {
    document.getElementById('mapSection').style.display = 'block';
    document.getElementById('mapYouName').textContent = d.mapYou;
    document.getElementById('mapYouCityEl').textContent = d.mapYouCity || '';
    document.getElementById('mapHerNameEl').textContent = d.mapHer;
    document.getElementById('mapHerCityEl').textContent = d.mapHerCity || '';
    document.getElementById('mapMsgEl').textContent = d.mapMsg || '';
  }
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
  const opened = JSON.parse(localStorage.getItem('openedGifts') || '[]');
  const hint = document.getElementById('giftHint');
  hint.textContent = isBirthday
    ? 'Tap a box to open your gift, birthday girl! 🎉'
    : '🎁 Gifts unlock on your birthday, my love!';

  grid.innerHTML = '';
  boxes.forEach(b => {
    const el = document.createElement('div');
    const canOpen = isBirthday && !opened.includes(b.id);
    el.className = 'gift-box' + (canOpen ? '' : lockedClass(isBirthday, opened, b.id));
    el.innerHTML = `<span class="gb-icon">${isBirthday ? '🎁' : '🔒'}</span>
      <div class="gb-label">${isBirthday ? 'Gift ' + b.position : 'Locked 🔒'}</div>
      <div class="gb-status">${!isBirthday ? 'Opens on your birthday' : (opened.includes(b.id) ? 'Opened ✓' : 'Tap to open!')}</div>`;
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
  const opened = JSON.parse(localStorage.getItem('openedGifts') || '[]');
  opened.push(box.id);
  localStorage.setItem('openedGifts', JSON.stringify(opened));

  const c = document.getElementById('giftModalContent');
  let inner = '';
  if (box.content_type === 'photo') inner = `<img src="box.contentdata"alt="Gift"><p>{box.content_data}" alt="Gift"><p>box.contentd​ata"alt="Gift"><p>{esc(box.caption)}</p>`;
  else if (box.content_type === 'video') inner = `<video src="box.contentdata"controls></video><p>{box.content_data}" controls></video><p>box.contentd​ata"controls></video><p>{esc(box.caption)}</p>`;
  else if (box.content_type === 'voice') inner = `<audio src="box.contentdata"controlsautoplay></audio><p>{box.content_data}" controls autoplay></audio><p>box.contentd​ata"controlsautoplay></audio><p>{esc(box.caption)}</p>`;
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
  document.getElementById('wishMsg').style.display = 'block';
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
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    const btn = document.getElementById('installBtn');
    if (btn) {
      btn.style.display = 'inline-block';
      btn.onclick = async () => {
        btn.style.display = 'none';
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
      };
    }
  });
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
}

/* ==================== GO! ==================== */
init();
