/* ==================== ADMIN PANEL LOGIC ==================== */

function openAdmin() {
  document.getElementById('adminOverlay').classList.add('open');
  // If admin already verified via lock-screen gate, skip login
  if (ADMIN_PREVIEW) { showDashboard(); return; }
  document.getElementById('loginScreen').style.display = 'block';
  document.getElementById('dashboard').style.display = 'none';
}

function closeAdmin() {
  document.getElementById('adminOverlay').classList.remove('open');
}

function tryLogin() {
  const pass = document.getElementById('dashPass').value;
  if (pass === ADMIN_PASSWORD) {
    ADMIN_PREVIEW = true;
    showDashboard();
  } else {
    document.getElementById('loginMsg').textContent = '❌ Wrong password!';
    document.getElementById('dashPass').value = '';
  }
}

function showDashboard() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('dashboard').style.display = 'block';
  const banner = document.getElementById('previewBanner');
  if (unlockTime && new Date() < unlockTime) banner.style.display = 'block';
  else banner.style.display = 'none';
  loadDashboard();
}

function showTab(id, btn) {
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('#dashboard > .tab-btns button').forEach(b => b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if (btn) btn.classList.add('active');
}

function showSubTab(id, btn) {
  document.querySelectorAll('.sub-tab').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('#tabMedia .tab-btns button').forEach(b => b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if (btn) btn.classList.add('active');
}

/* ==================== LOCK TIME CONTROL ==================== */
async function loadDashboard() {
  // Load settings into lock control
  try {
    const { data: settings } = await sb.from('site_settings').select('*').eq('id', 1).single();
    if (settings) {
      document.getElementById('inpEmail').value = settings.admin_email || '';
      if (settings.unlock_time) {
        const nepal = getNepalDateTime(new Date(settings.unlock_time));
        document.getElementById('inpUnlockBs').value = nepal.bs;
        document.getElementById('inpUnlockTime').value = nepal.time;
      }
    }
  } catch (e) {}

  // Load content
  try {
    const { data } = await sb.from('site_content').select('data').eq('id', 1).single();
    const d = (data && data.data) ? { ...DEFAULT_CONTENT, ...data.data } : { ...DEFAULT_CONTENT };
    document.getElementById('inpQuizEnabled').checked = d.quizEnabled !== false;
    document.getElementById('inpName').value = d.name || '';
    document.getElementById('inpYou').value = d.you || '';
    document.getElementById('inpHero').value = d.hero || '';
    document.getElementById('inpType').value = d.typed || '';
    document.getElementById('inpPreTitle').value = d.preTitle || '';
    document.getElementById('inpPreSub').value = d.preSub || '';
    document.getElementById('inpWish').value = d.wish || '';
    document.getElementById('inpSig').value = d.sig || '';
    document.getElementById('inpLetter').value = d.letter || '';
    document.getElementById('inpDate').value = d.date || '';
    document.getElementById('inpCakeName').value = d.cakeName || '';
    document.getElementById('inpCakeAge').value = d.cakeAge || 5;
    document.getElementById('inpMapYou').value = d.mapYou || '';
    document.getElementById('inpMapYouCity').value = d.mapYouCity || '';
    document.getElementById('inpMapHer').value = d.mapHer || '';
    document.getElementById('inpMapHerCity').value = d.mapHerCity || '';
    document.getElementById('inpMapMsg').value = d.mapMsg || '';
  } catch (e) {}

  renderLists();
}

async function setTestingMode() {
  if (!confirm('Open the website for EVERYONE right now? (Testing mode)')) return;
  try {
    const { error } = await sb.from('site_settings').update({ unlock_time: null }).eq('id', 1);
    if (error) throw error;
    document.getElementById('lockMsg').textContent = '🧪 Testing mode ON — site is open for everyone';
  } catch (e) { document.getElementById('lockMsg').textContent = '❌ ' + e.message; }
}

async function setUnlockTime() {
  const bs = document.getElementById('inpUnlockBs').value.trim();
  const time = document.getElementById('inpUnlockTime').value;
  let utc;
  try {
    utc = nepaliDateTimeToUtc(bs, time);
  } catch (e) {
    document.getElementById('lockMsg').textContent = '⚠️ ' + e.message;
    return;
  }
  const exact = formatNepalDateTime(utc);
  if (!confirm('🔒 LOCK the site? It will open at ' + exact + ' (Nepal time).')) return;
  try {
    const { error } = await sb.from('site_settings').update({ unlock_time: utc }).eq('id', 1);
    if (error) throw error;
    document.getElementById('lockMsg').textContent = '🔒 Locked! Opens at: ' + exact + ' (Nepal time)';
    document.getElementById('previewBanner').style.display = 'block';
  } catch (e) { document.getElementById('lockMsg').textContent = '❌ ' + e.message; }
}

function getNepaliDateConstructor() {
  const converter = window.NepaliDate && (window.NepaliDate.default || window.NepaliDate);
  if (typeof converter !== 'function') throw new Error('Nepali date converter is unavailable. Check your internet connection and reload.');
  return converter;
}

function nepaliDateTimeToUtc(bs, time) {
  const match = bs.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  const timeMatch = (time || '').match(/^(\d{2}):(\d{2})$/);
  if (!match) throw new Error('Enter the BS date as YYYY-MM-DD, for example 2083-05-12.');
  if (!timeMatch) throw new Error('Choose a valid Nepal time.');

  const year = Number(match[1]);
  const month = Number(match[2]);
  const date = Number(match[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  if (hour > 23 || minute > 59) throw new Error('Choose a valid Nepal time.');

  if (year < 2000 || year > 2090 || month < 1 || month > 12 || date < 1 || date > 32) {
    throw new Error('That BS date is invalid or outside the supported range (2000-2090 BS).');
  }

  const NepaliDate = getNepaliDateConstructor();
  let nepaliDate;
  try {
    nepaliDate = new NepaliDate(year, month - 1, date);
    const actual = nepaliDate.getBS();
    if (actual.year !== year || actual.month !== month - 1 || actual.date !== date) throw new Error();
  } catch (e) {
    throw new Error('That BS date is invalid or outside the supported range (2000-2090 BS).');
  }
  const converted = nepaliDate.getAD();

  // Nepal is UTC+05:45. Build UTC directly so the visitor's device timezone cannot change the result.
  return new Date(Date.UTC(converted.year, converted.month, converted.date, hour, minute) - (5 * 60 + 45) * 60000).toISOString();
}

function getNepalDateTime(utcDate) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kathmandu', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(utcDate).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  const adDate = new Date(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
  const NepaliDate = getNepaliDateConstructor();
  return {
    bs: NepaliDate.fromAD(adDate).format('YYYY-MM-DD'),
    time: parts.hour + ':' + parts.minute
  };
}

function formatNepalDateTime(utcDate) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kathmandu', dateStyle: 'full', timeStyle: 'short'
  }).format(new Date(utcDate));
}

async function saveSettings() {
  try {
    const { error } = await sb.from('site_settings')
      .update({ admin_email: document.getElementById('inpEmail').value }).eq('id', 1);
    if (error) throw error;
    const { data } = await sb.from('site_content').select('data').eq('id', 1).single();
    const content = data && data.data ? data.data : {};
    content.quizEnabled = document.getElementById('inpQuizEnabled').checked;
    const { error: contentError } = await sb.from('site_content').upsert({ id: 1, data: content, updated_at: new Date() });
    if (contentError) throw contentError;
    window._quizEnabled = content.quizEnabled;
    document.getElementById('settingsMsg').textContent = '✅ Settings saved!';
  } catch (e) { alert('❌ ' + e.message); }
}

/* ==================== SAVE TEXT SECTIONS ==================== */
async function saveSection(section) {
  const btn = event.target;
  btn.disabled = true; btn.textContent = '💾 Saving...';
  try {
    const { data } = await sb.from('site_content').select('data').eq('id', 1).single();
    const d = (data && data.data) ? data.data : {};

    if (section === 'top') Object.assign(d, {
      name: val('inpName'), you: val('inpYou'), hero: val('inpHero'), typed: val('inpType'),
      preTitle: val('inpPreTitle'), preSub: val('inpPreSub')
    });
    if (section === 'story') Object.assign(d, {
      date: val('inpDate'), wish: val('inpWish'), letter: val('inpLetter'), sig: val('inpSig')
    });
    if (section === 'cake') Object.assign(d, { cakeName: val('inpCakeName'), cakeAge: val('inpCakeAge') });
    if (section === 'map') Object.assign(d, {
      mapYou: val('inpMapYou'), mapYouCity: val('inpMapYouCity'),
      mapHer: val('inpMapHer'), mapHerCity: val('inpMapHerCity'), mapMsg: val('inpMapMsg')
    });

    const { error } = await sb.from('site_content').upsert({ id: 1, data: d, updated_at: new Date() });
    if (error) throw error;
    alert('✅ Saved to cloud! ☁️ Visible on all devices.');
  } catch (e) { alert('❌ ' + e.message); }
  btn.disabled = false; btn.textContent = btn.textContent.replace('Saving...', btn.textContent.includes('"') ? btn.textContent.match(/"(.+)"/)[1] : 'Save');
  loadDashboard();
}
function val(id) { return document.getElementById(id).value; }

/* ==================== OPEN WHEN LETTERS ==================== */
async function addOpenLetter() {
  const title = val('inpLetterTitle').trim();
  const body = val('inpLetterBody').trim();
  if (!title || !body) { alert('Write both the title and the letter!'); return; }
  try {
    const { data: count } = await sb.from('open_letters').select('id');
    const { error } = await sb.from('open_letters').insert({ title, body, position: (count || []).length });
    if (error) throw error;
    val('inpLetterTitle') && (document.getElementById('inpLetterTitle').value = '');
    document.getElementById('inpLetterBody').value = '';
    renderLists();
    alert('💌 Letter sealed & added!');
  } catch (e) { alert('❌ ' + e.message); }
}

async function deleteOpenLetter(id) {
  if (!confirm('Delete this envelope?')) return;
  await sb.from('open_letters').delete().eq('id', id);
  renderLists();
}

/* ==================== GIFT BOXES (add/remove/edit) ==================== */
async function addGiftBox() {
  try {
    const { data: boxes } = await sb.from('gift_boxes').select('id');
    const { error } = await sb.from('gift_boxes').insert({
      position: (boxes || []).length + 1, content_type: 'text', content_data: '', caption: '', heading: ''
    });
    if (error) throw error;
    renderGiftEditor();
  } catch (e) { alert('❌ ' + e.message); }
}

async function removeGiftBox(id) {
  if (!confirm('Remove this gift box?')) return;
  await sb.from('gift_boxes').delete().eq('id', id);
  renderGiftEditor();
}

async function renderGiftEditor() {
  const el = document.getElementById('giftEditor');
  let boxes = [];
  let photos = [];
  try {
    const { data } = await sb.from('gift_boxes').select('*').order('position');
    if (data) boxes = data;
    const { data: media } = await sb.from('media_files').select('*').eq('type', 'photos').order('id');
    photos = media || [];
  } catch (e) {}
  if (!boxes.length) { el.innerHTML = '<p class="file-hint">No gift boxes yet — click "➕ Add Gift Box" above!</p>'; return; }

  el.innerHTML = boxes.map(b => `
    <div class="gift-edit-card">
      <div class="ge-head">🎁 Gift Box #${b.position}
        <button class="manage-del" onclick="removeGiftBox(${b.id})">🗑 Remove</button>
      </div>
      ${b.position === 2 ? `<label>Heading</label>
      <input type="text" id="ghead_${b.id}" value="${esc(b.heading || '')}" placeholder="My Promise to You 💗">` : ''}
      <label>What's inside?</label>
      <select id="gtype_${b.id}" onchange="giftTypeChanged(${b.id}, this.value)">
        <option value="text" ${b.content_type==='text'?'selected':''}>📝 Text Message</option>
        <option value="photo" ${b.content_type==='photo'?'selected':''}>📸 Photo</option>
        <option value="video" ${b.content_type==='video'?'selected':''}>🎬 Video</option>
        <option value="voice" ${b.content_type==='voice'?'selected':''}>🎤 Voice Note</option>
      </select>
      <div id="gmedia_${b.id}">${giftMediaField(b, photos)}</div>
      <label>Caption (small text under the gift)</label>
      <input type="text" id="gcap_${b.id}" value="${esc(b.caption || '')}" placeholder="A short message under the gift">
      <button class="btn-primary" onclick="saveGift(${b.id})">💾 Save Gift #${b.position}</button>
    </div>
  `).join('');
}

function giftMediaField(box, photos) {
  if (box.content_type === 'text') {
    return `<label>Message</label><textarea id="gdata_${box.id}" style="min-height:80px" placeholder="Write the gift message here...">${esc(box.content_data || '')}</textarea>`;
  }
  const accept = box.content_type === 'photo' ? 'image/*' : box.content_type === 'video' ? 'video/*' : 'audio/*';
  const label = box.content_type === 'photo' ? 'photo' : box.content_type === 'video' ? 'video' : 'audio';
  const picker = box.position === 2 && box.content_type === 'photo' ? `<label>Or choose a photo from uploaded memories</label>
    <div class="gift-photo-picker" id="gphotos_${box.id}">
      ${photos.length ? photos.map(p => `<button type="button" class="gift-photo-option ${box.content_data === p.url ? 'selected' : ''}" data-url="${esc(p.url)}" onclick="chooseGiftPhoto(${box.id}, this)"><img src="${esc(p.url)}" alt="Uploaded memory"></button>`).join('') : '<p class="file-hint">No uploaded photos yet.</p>'}
    </div>` : '';
  return `${picker}<label>Upload ${label}</label>
    <div class="gift-upload-zone" id="gdrop_${box.id}" ondragover="event.preventDefault(); this.classList.add('drag-over')" ondragleave="this.classList.remove('drag-over')" ondrop="handleGiftDrop(event, ${box.id}, '${box.content_type}')" onclick="document.getElementById('gfile_${box.id}').click()">
      <strong>📁 Drop ${label} here or browse</strong>
      <input type="file" id="gfile_${box.id}" accept="${accept}" onclick="event.stopPropagation()" onchange="uploadGiftMedia(${box.id}, this, '${box.content_type}')">
    </div>
    <p class="file-hint" id="gstatus_${box.id}">${box.content_data ? 'A file is already selected.' : 'Choose a file to upload.'}</p>
    <input type="hidden" id="gdata_${box.id}" value="${esc(box.content_data || '')}">`;
}

function giftTypeChanged(id, type) {
  const box = { id, position: 0, content_type: type, content_data: '', caption: '' };
  const current = document.getElementById('gdata_' + id)?.value || '';
  box.content_data = current;
  document.getElementById('gmedia_' + id).innerHTML = giftMediaField(box, []);
}

function handleGiftDrop(dropEvent, id, type) {
  dropEvent.preventDefault();
  dropEvent.currentTarget.classList.remove('drag-over');
  const input = document.getElementById('gfile_' + id);
  const file = Array.from(dropEvent.dataTransfer.files).find(item => item.type.startsWith(type === 'photo' ? 'image/' : type === 'video' ? 'video/' : 'audio/'));
  if (!file) { alert('Please drop the correct file type for this gift.'); return; }
  const transfer = new DataTransfer();
  transfer.items.add(file);
  input.files = transfer.files;
  uploadGiftMedia(id, input, type);
}

async function uploadGiftMedia(id, input, type) {
  const file = input.files[0];
  if (!file) return;
  const status = document.getElementById('gstatus_' + id);
  status.textContent = 'Uploading...';
  try {
    const { url } = await uploadToStorage(type, file);
    document.getElementById('gdata_' + id).value = url;
    status.textContent = 'Uploaded and ready to save.';
  } catch (e) {
    status.textContent = 'Upload failed.';
    alert('❌ Upload failed: ' + e.message);
  }
}

function chooseGiftPhoto(id, button) {
  const contentField = document.getElementById('gdata_' + id) || document.getElementById('gphoto_' + id);
  contentField.value = button.dataset.url;
  document.querySelectorAll('#gphotos_' + id + ' .gift-photo-option').forEach(option => option.classList.remove('selected'));
  button.classList.add('selected');
}

async function saveGift(id) {
  try {
    const gift = {
      content_type: val('gtype_' + id),
      content_data: val('gdata_' + id),
      caption: val('gcap_' + id)
    };
    const heading = document.getElementById('ghead_' + id);
    if (heading) gift.heading = heading.value;
    if (gift.content_type !== 'text' && !gift.content_data) throw new Error('Upload or choose a file for this gift first.');
    const { error } = await sb.from('gift_boxes').update(gift).eq('id', id);
    if (error) throw error;
    alert('✅ Gift saved! She opens it on her birthday 🎁');
  } catch (e) { alert('❌ ' + e.message); }
}

/* ==================== UPLOADS ==================== */
async function uploadToStorage(type, file) {
  const safeName = file.name.replace(/[^a-z0-9._-]/gi, '-');
  const path = type + '/' + Date.now() + '-' + safeName;
  const { error } = await sb.storage.from('media').upload(path, file, { upsert: false, contentType: file.type || undefined });
  if (error) throw error;
  const { data } = sb.storage.from('media').getPublicUrl(path);
  return { url: data.publicUrl, path };
}

function handleMediaDrop(dropEvent, inputId, type) {
  dropEvent.preventDefault();
  dropEvent.currentTarget.classList.remove('drag-over');
  const input = document.getElementById(inputId);
  const files = Array.from(dropEvent.dataTransfer.files).filter(file =>
    type === 'photos' ? file.type.startsWith('image/') : file.type.startsWith('video/'));
  if (!files.length) { alert(`Drop ${type === 'photos' ? 'image' : 'video'} files only.`); return; }
  const transfer = new DataTransfer();
  files.forEach(file => transfer.items.add(file));
  input.files = transfer.files;
  uploadMedia(type, inputId, dropEvent.currentTarget.nextElementSibling);
}

async function uploadMedia(type, inputId, button = event.target) {
  const input = document.getElementById(inputId);
  const files = Array.from(input.files);
  if (!files.length) { alert('Choose at least one file first!'); return; }
  const btn = button;
  btn.disabled = true;
  const orig = btn.textContent; btn.textContent = '⏳ Uploading...';
  try {
    for (const file of files) {
      const { url, path } = await uploadToStorage(type, file);
      const { error } = await sb.from('media_files').insert({ type, url, path });
      if (error) throw error;
    }
    input.value = '';
    renderLists();
    alert(`✅ Uploaded ${files.length} ${type === 'photos' ? 'photo(s)' : 'video(s)'}! ☁️`);
  } catch (e) { alert('❌ Upload failed: ' + e.message + '\n\nIf this says "Bucket not found", run the storage section in the SQL file in Supabase SQL Editor.'); }
  btn.disabled = false; btn.textContent = orig;
}

async function uploadMusic() {
  const file = document.getElementById('musicFile').files[0];
  if (!file) { alert('Choose a music file first!'); return; }
  const btn = event.target; btn.disabled = true; btn.textContent = '⏳ Uploading...';
  try {
    const { data: old } = await sb.from('media_files').select('*').eq('type', 'music');
    if (old && old.length) {
      await sb.storage.from('media').remove([old[0].path]);
      await sb.from('media_files').delete().eq('id', old[0].id);
    }
    const { url, path } = await uploadToStorage('music', file);
    await sb.from('media_files').insert({ type: 'music', url, path });
    renderLists();
    alert('🎵 Music set!');
  } catch (e) { alert('❌ Upload failed: ' + e.message + '\n\nIf this says "Bucket not found", run the storage section in the SQL file in Supabase SQL Editor.'); }
  btn.disabled = false; btn.textContent = '🎵 Upload Music';
}

async function uploadVoice() {
  const file = document.getElementById('voiceFile').files[0];
  if (!file) { alert('Choose a voice recording first!'); return; }
  const btn = event.target; btn.disabled = true; btn.textContent = '⏳ Uploading...';
  try {
    const { data: old } = await sb.from('media_files').select('*').eq('type', 'voice');
    if (old && old.length) {
      await sb.storage.from('media').remove([old[0].path]);
      await sb.from('media_files').delete().eq('id', old[0].id);
    }
    const { url, path } = await uploadToStorage('voice', file);
    await sb.from('media_files').insert({ type: 'voice', url, path });
    renderLists();
    alert('🎤 Voice note set! Plays after she blows the candles 😭');
  } catch (e) { alert('❌ Upload failed: ' + e.message + '\n\nIf this says "Bucket not found", run the storage section in the SQL file in Supabase SQL Editor.'); }
  btn.disabled = false; btn.textContent = '🎤 Upload Voice Note';
}

async function deleteMedia(id, path) {
  if (!confirm('Delete this item?')) return;
  try {
    await sb.storage.from('media').remove([path]);
    await sb.from('media_files').delete().eq('id', id);
    renderLists();
  } catch (e) { alert('❌ ' + e.message); }
}

/* ==================== RENDER LISTS ==================== */
async function renderLists() {
  try {
    const { data: media } = await sb.from('media_files').select('*').order('id');
    const { data: letters } = await sb.from('open_letters').select('*').order('position');
    const { data: replies } = await sb.from('replies').select('*').order('id', { ascending: false });
    const none = '<p class="file-hint">Nothing added yet.</p>';

    const photos = (media || []).filter(m => m.type === 'photos');
    document.getElementById('photoList').innerHTML = photos.length
      ? photos.map(m => `<div class="manage-item"><img src="${esc(m.url)}" alt="Photo"><span>Photo</span><button onclick="deleteMedia(${m.id}, '${esc(m.path)}')">Delete</button></div>`).join('')
      : none;

    const videos = (media || []).filter(m => m.type === 'videos');
    document.getElementById('videoList').innerHTML = videos.length
      ? videos.map(m => `<div class="manage-item"><span>🎬 Video</span><button onclick="deleteMedia(${m.id}, '${esc(m.path)}')">Delete</button></div>`).join('')
      : none;

    const music = (media || []).find(m => m.type === 'music');
    document.getElementById('musicList').innerHTML = music
      ? `<div class="manage-item"><span>🎵 Background track set</span><button onclick="deleteMedia(${music.id}, '${esc(music.path)}')">Remove</button></div>` : none;

    const voice = (media || []).find(m => m.type === 'voice');
    document.getElementById('voiceList').innerHTML = voice
      ? `<div class="manage-item"><audio src="${voice.url}" controls></audio><span>🎤 Voice note set</span><button onclick="deleteMedia(${voice.id}, '${voice.path}')">Remove</button></div>` : none;

    document.getElementById('openLetterList').innerHTML = (letters && letters.length)
      ? letters.map(l => `<div class="manage-item"><span>💌 ${esc(l.title)}</span><button onclick="deleteOpenLetter(${l.id})">Delete</button></div>`).join('')
      : none;

    document.getElementById('replyList').innerHTML = (replies && replies.length)
      ? replies.map(r => `<div class="manage-item" style="align-items:flex-start"><span>💬 ${esc(r.text)}<br><small style="color:#999">${new Date(r.created_at).toLocaleString()}</small></span><button onclick="deleteReply(${r.id})">Delete</button></div>`).join('')
      : '<p class="file-hint">She hasn\'t replied yet... 💕</p>';

    renderGiftEditor();
  } catch (e) { console.warn('renderLists:', e.message); }
}

async function deleteReply(id) {
  if (!confirm('Delete her reply?')) return;
  await sb.from('replies').delete().eq('id', id);
  renderLists();
}
