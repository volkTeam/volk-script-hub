// Инициализация Supabase
const SUPABASE_URL = 'https://yrclsymsijkfbjjqegun.supabase.co';
const SUPABASE_ANON_KEY = 'Sb_publishable_KhFdq-kEENQ4bB6D2H-O8A_C2L_eH8b';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ADMIN_PASS = 'AbdOkRjclen484849TldbcnKsnfk';

let currentUser = JSON.parse(localStorage.getItem('volk_user')) || null;
let allScripts = [];

// === МОДАЛЬНЫЕ ОКНА ===
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = 'flex';
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = 'none';
}

// === МУЗЫКА ===
function toggleMusic() {
  const audio = document.getElementById('bgMusic');
  if (!audio) return;
  if (audio.paused) {
    audio.play().catch(() => alert('Нажмите на экран, чтобы разрешить воспроизведение аудио!'));
  } else {
    audio.pause();
  }
}

// === АВТОРИЗАЦИЯ И РОЛИ ===
async function registerUser() {
  const email = document.getElementById('userEmail').value.trim();
  const username = document.getElementById('userName').value.trim();
  const password = document.getElementById('userPass').value.trim();

  if (!email || !username || !password) return alert('Заполните все поля!');

  const { data: existing } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
  
  if (existing && existing.is_banned) {
    return alert('❌ Этот Email забанен!');
  }

  if (existing) {
    currentUser = existing;
  } else {
    const { data: newUser, error } = await supabase.from('users').insert([{
      email, username, password_hash: password, role: 'user', strikes: 0
    }]).select().single();
    
    if (error) return alert('Ошибка: ' + error.message);
    currentUser = newUser;
  }

  localStorage.setItem('volk_user', JSON.stringify(currentUser));
  updateUI();
  closeModal('settingsModal');
  alert('Успешный вход!');
}

function becomeAdmin() {
  const key = document.getElementById('adminKeyInput').value;
  if (key === ADMIN_PASS) {
    if (!currentUser) return alert('Сначала зарегистрируйтесь или войдите!');
    currentUser.role = 'admin';
    supabase.from('users').update({ role: 'admin' }).eq('id', currentUser.id);
    localStorage.setItem('volk_user', JSON.stringify(currentUser));
    updateUI();
    alert('👑 Вы получили права Админа!');
  } else {
    alert('❌ Неверный ключ!');
  }
}

function updateUI() {
  if (currentUser) {
    const authBlock = document.getElementById('authBlock');
    const userInfo = document.getElementById('userInfo');
    if (authBlock) authBlock.style.display = 'none';
    if (userInfo) userInfo.style.display = 'block';
    
    document.getElementById('currentUserText').innerText = currentUser.username;
    document.getElementById('currentRoleText').innerText = currentUser.role;
  }
}

// === ЗАГРУЗКА И ОТОБРАЖЕНИЕ СКРИПТОВ ===
async function loadScripts() {
  const { data: scripts } = await supabase.from('scripts').select('*').order('created_at', { ascending: false });
  allScripts = scripts || [];
  renderScripts(allScripts);
}

function renderScripts(scripts) {
  const container = document.getElementById('scriptsContainer');
  if (!container) return;
  container.innerHTML = '';

  if (scripts.length === 0) {
    container.innerHTML = '<p>Скриптов пока нет.</p>';
    return;
  }

  scripts.forEach(s => {
    const card = document.createElement('div');
    card.className = 'script-card';

    let badge = '';
    if (s.author_role === 'admin') badge = '<span class="badge-admin">👑 ADMIN</span>';
    if (s.author_role === 'verified') badge = '<span class="badge-verified">✅</span>';

    card.innerHTML = `
      <div class="script-header">
        <div>
          <div class="title">${s.title}</div>
          <div class="game">🎮 ${s.game_name}</div>
        </div>
      </div>
      <div class="author-line">Автор: <b>${s.author_username}</b> ${badge}</div>
      
      <div class="card-actions">
        <button class="primary" onclick="copyCode('${encodeURIComponent(s.script_code)}')">📋 Скопировать</button>
        <button onclick="copyLink('${s.id}')">🔗 Ссылка</button>
        ${getAdminButtons(s)}
        ${getReportButton(s)}
      </div>

      <div class="comments-section">
        <input type="text" id="comm_in_${s.id}" placeholder="Комментарий..." style="width:65%; padding:5px; background:#0d1117; color:#fff; border:1px solid #30363d; border-radius:4px;">
        <button onclick="addComment('${s.id}')">Отправить</button>
        <div id="comms_${s.id}"></div>
      </div>
    `;
    container.appendChild(card);
    loadComments(s.id);
  });
}

function getAdminButtons(script) {
  if (!currentUser || currentUser.role !== 'admin') return '';
  return `
    <button class="danger" onclick="deleteScript('${script.id}')">🗑 Удалить</button>
    <button class="danger" onclick="banUser('${script.author_username}')">⛔ Забанить</button>
  `;
}

function getReportButton(script) {
  if (currentUser && currentUser.role === 'verified') {
    return `<button style="background:#b91c1c;" onclick="strikeUser('${script.author_username}')">🚩 Страйк</button>`;
  }
  return '';
}

async function banUser(username) {
  await supabase.from('users').update({ is_banned: true }).eq('username', username);
  alert(`⛔ Пользователь ${username} забанен!`);
}

async function deleteScript(id) {
  await supabase.from('scripts').delete().eq('id', id);
  loadScripts();
}

async function addComment(scriptId) {
  if (!currentUser) return alert('Войдите, чтобы комментировать!');
  const input = document.getElementById(`comm_in_${scriptId}`);
  if (!input || !input.value) return;

  await supabase.from('comments').insert([{
    script_id: scriptId, author_username: currentUser.username,
    author_role: currentUser.role, text: input.value
  }]);

  input.value = '';
  loadComments(scriptId);
}

async function loadComments(scriptId) {
  const { data: comms } = await supabase.from('comments').select('*').eq('script_id', scriptId);
  const box = document.getElementById(`comms_${scriptId}`);
  if (!box) return;

  box.innerHTML = (comms || []).map(c => {
    let b = '';
    if (c.author_role === 'admin') b = '<b style="color:#ef4444;">[👑 ADMIN]</b>';
    if (c.author_role === 'verified') b = '<b style="color:#38bdf8;">[✅]</b>';
    return `<div class="comment">${b} <b>${c.author_username}:</b> ${c.text}</div>`;
  }).join('');
}

function copyCode(c) { 
  navigator.clipboard.writeText(decodeURIComponent(c)); 
  alert('Код скопирован!'); 
}

function copyLink(id) { 
  navigator.clipboard.writeText(location.origin + location.pathname + '?script=' + id); 
  alert('Ссылка скопирована!'); 
}

function filterScripts() {
  const q = document.getElementById('searchInput').value.toLowerCase();
  const filtered = allScripts.filter(s => s.title.toLowerCase().includes(q) || s.game_name.toLowerCase().includes(q));
  renderScripts(filtered);
}

document.addEventListener('DOMContentLoaded', () => {
  updateUI();
  loadScripts();
});
