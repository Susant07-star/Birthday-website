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
        // convert UTC → local for the datetime-local input
        const d = new Date(settings.unlock_time);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        document.getElementById('inpUnlock').value = d.toISOString().slice(0, 16);
      }
    }
  } catch (e) {}

  // Load content
  try {
    const { data } = await sb.from('site_content').select('data').eq('id', 1).single();
    const d = (data && data.data) ? { ...DEFAULT_CONTENT, ...data.data } : { ...DEFAULT_CONTENT };
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
  const val = document.getElementById('inpUnlock').value;
  if (!val) { document.getElementById('lockMsg').textContent = '⚠️ Pick a date & time first!'; return; }
  if (!confirm('🔒 LOCK the site? She will ONLY see the countdown until: ' + new Date(val).toLocaleString())) return;
  try {
    const utc = new Date(val).toISOString(); // convert local → UTC
    const { error } = await sb.from('site_settings').update({ unlock_time: utc }).eq('id', 1);
    if (error) throw error;
    document.getElementById('lockMsg').textContent = '🔒 Locked! Opens at: ' + new Date(val).toLocaleString() + ' (your time)';
    document.getElementById('previewBanner').style.display = 'block';
  } catch (e) { document.getElementById('lockMsg').textContent = '❌ ' + e.message; }
}

async function saveSettings() {
  try {
    const { error } = await sb.from('site_settings')
      .update({ admin_email: document.getElementById('inpEmail').value }).eq('id', 1);
    if (error) throw error;
    alert('✅ Settings saved!');
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
      position: (boxes || []).length + 1, content_type: 'text', content_data: '', caption: ''
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
  try {
    const { data } = await sb.from('gift_boxes').select('*').order('position');
    if (data) boxes = data;
  } catch (e) {}
  if (!boxes.length) { el.innerHTML = '<p class="file-hint">No gift boxes yet — click "➕ Add Gift Box" above!</p>'; return; }

  el.innerHTML = boxes.map(b => `
    <div class="gift-edit-card">
      <div class="ge-head">🎁 Gift Box #${b.position}
        <button class="manage-del" onclick="removeGiftBox(${b.id})">🗑 Remove</button>
      </div>
      <label>What's inside?</label>
      <select id="gtype_${b.id}">
        <option value="text" ${b.content_type==='text'?'selected':''}>📝 Text Message</option>
        <option value="photo" ${b.content_type==='photo'?'selected':''}>📸 Photo</option>
        <option value="video" ${b.content_type==='video'?'selected':''}>🎬 Video</option>
        <option value="voice" ${b.content_type==='voice'?'selected':''}>🎤 Voice Note</option>
      </select>
      <label>Content (text message OR media URL — upload media in 📸 Media tab first, then paste its URL here)</label>
      <textarea id="gdata_b.id"style="min−height:60px">{b.id}" style="min-height:60px">b.id"style="min−height:60px">{esc(b.content_data)}</textarea>
      <label>Caption (small text under the gift)</label>
      <input type="text" id="gcap_b.id"value="{b.id}" value="b.id"value="{esc(b.caption)}">
      <button class="btn-primary" onclick="saveGift({b.id})">💾 Save Gift #{b.position}</button>
    </div>
  `).join('');
}

async function saveGift(id) {
  try {
    const { error } = await sb.from('gift_boxes').update({
      content_type: val('gtype_' + id),
      content_data: val('gdata_' + id),
      caption: val('gcap_' + id)
    }).eq('id', id);
    if (error) throw error;
    alert('✅ Gift saved! She opens it on her birthday 🎁');
  } catch (e) { alert('❌ ' + e.message); }
}

/* ==================== UPLOADS ==================== */
async function uploadToStorage(type, file) {
  const ext = file.name.split('.').pop();
  const path = type + '/' + Date.now() + '.' + ext;
  const { error } = await sb.storage.from('media').upload(path, file);
  if (error) throw error;
  const { data } = sb.storage.from('media').getPublicUrl(path);
  return { url: data.publicUrl, path };
}

async function uploadMedia(type, inputId) {
  const file = document.getElementById(inputId).files[0];
  if (!file) { alert('Choose a file first!'); return; }
  const btn = event.target;
  btn.disabled = true;
  const orig = btn.textContent; btn.textContent = '⏳ Uploading...';
  try {
    const { url, path } = await uploadToStorage(type, file);
    await sb.from('media_files').insert({ type, url, path });
    renderLists();
    alert('✅ Uploaded! ☁️');
  } catch (e) { alert('❌ ' + e.message); }
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
  } catch (e) { alert('❌ ' + e.message); }
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
  } catch (e) { alert('❌ ' + e.message); }
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
      ? photos.map(m => `<div class="manage-item"><img src="m.url"><span>Photo</span><buttononclick="deleteMedia({m.url}"><span>Photo</span><button onclick="deleteMedia(m.url"><span>Photo</span><buttononclick="deleteMedia({m.id},'${m.path}')">Delete</button></div>`).join('')
      : none;

    const videos = (media || []).filter(m => m.type === 'videos');
    document.getElementById('videoList').innerHTML = videos.length
      ? videos.map(m => `<div class="manage-item"><span>🎬 Video</span><button onclick="deleteMedia(m.id,′{m.id},'m.id,′{m.path}')">Delete</button></div>`).join('')
      : none;

    const music = (media || []).find(m => m.type === 'music');
    document.getElementById('musicList').innerHTML = music
      ? `<div class="manage-item"><span>🎵 Background track set</span><button onclick="deleteMedia(music.id,′{music.id},'music.id,′{music.path}')">Remove</button></div>` : none;

    const voice = (media || []).find(m => m.type === 'voice');
    document.getElementById('voiceList').innerHTML = voice
      ? `<div class="manage-item"><audio src="${voice.url}" controls></audio><span>🎤 Voice note set</span><button onclick="deleteMedia(${voice.id}, '${voice.path}')">Remove</button></div>` : none;

    document.getElementById('openLetterList').innerHTML = (letters && letters.length)
      ? letters.map(l => `<div class="manage-item"><span>💌 esc(l.title)</span><buttononclick="deleteOpenLetter({esc(l.title)}</span><button onclick="deleteOpenLetter(esc(l.title)</span><buttononclick="deleteOpenLetter({l.id})">Delete</button></div>`).join('')
      : none;

    document.getElementById('replyList').innerHTML = (replies && replies.length)
      ? replies.map(r => `<div class="manage-item" style="align-items:flex-start"><span>💬 {esc(r.text)}<br><small style="color:#999">{new Date(r.created_at).toLocaleString()}</small></span><button onclick="deleteReply(${r.id})">Delete</button></div>`).join('')
      : '<p class="file-hint">She hasn\'t replied yet... 💕</p>';

    renderGiftEditor();
  } catch (e) { console.warn('renderLists:', e.message); }
}

async function deleteReply(id) {
  if (!confirm('Delete her reply?')) return;
  await sb.from('replies').delete().eq('id', id);
  renderLists();
}
