const SUPABASE_URL = 'https://yrclsymsijkfbjjqegun.supabase.co';
const SUPABASE_ANON_KEY = 'Sb_publishable_KhFdq-kEENQ4bB6D2H-O8A_C2L_eH8b';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ADMIN_PASS = 'AbdOkRjclen484849TldbcnKsnfk';

let currentUser = JSON.parse(localStorage.getItem('volk_user')) || null;
let allScripts = [];

// === АВТОРИЗАЦИЯ И РОЛИ ===
async function registerUser() {
  const email = document.getElementById('userEmail').value.trim();
  const username = document.getElementById('userName').value.trim();
  const password = document.getElementById('userPass').value.trim();

  if(!email || !username || !password) return alert('Заполните все поля!');

  // Проверка на бан по Email
  const { data: existing } = await supabase.from('users').select('*').eq('email', email).single();
  if (existing && existing.is_banned) {
    return alert('❌ Этот Email забанен на платформе!');
  }

  if (existing) {
    currentUser = existing;
  } else {
    const { data: newUser, error } = await supabase.from('users').insert([{
      email, username, password_hash: password, role: 'user', strikes: 0
    }]).select().single();
    
    if(error) return alert('Ошибка регистрации: ' + error.message);
    currentUser = newUser;
  }

  localStorage.setItem('volk_user', JSON.stringify(currentUser));
  updateUI();
  closeModal('settingsModal');
  alert('Успешный вход!');
}

function becomeAdmin() {
  const key = document.getElementById('adminKeyInput').value;
  if(key === ADMIN_PASS) {
    if(!currentUser) return alert('Сначала зарегистрируйтесь/войдите в аккаунт!');
    currentUser.role = 'admin';
    supabase.from('users').update({ role: 'admin' }).eq('id', currentUser.id);
    localStorage.setItem('volk_user', JSON.stringify(currentUser));
    updateUI();
    alert('👑 Вы успешно получили права Админа!');
  } else {
    alert('❌ Неверный ключ админа!');
  }
}

function updateUI() {
  if(currentUser) {
    document.getElementById('authBlock').style.display = 'none';
    document.getElementById('userInfo').style.display = 'block';
    document.getElementById('currentUserText').innerText = currentUser.username;
    document.getElementById('currentRoleText').innerText = currentUser.role;
  }
}

// === ПУБЛИКАЦИЯ С ЛИМИТАМИ КД ===
async function publishScript() {
  if(!currentUser) return alert('Войдите в аккаунт!');

  const title = document.getElementById('scriptTitle').value;
  const game = document.getElementById('scriptGame').value;
  const code = document.getElementById('scriptCode').value;

  // Проверка КД (1 раз в месяц для обычных, 1 раз в неделю для проверенных)
  const lastPost = new Date(currentUser.last_post || 0);
  const now = new Date();
  const diffDays = (now - lastPost) / (1000 * 60 * 60 * 24);

  if (currentUser.role === 'user' && diffDays < 30) {
    return alert('⏳ Обычные креаторы могут публиковать скрипт 1 раз в 30 дней!');
  }
  if (currentUser.role === 'verified' && diffDays < 7) {
    return alert('⏳ Креаторы с галочкой могут публиковать скрипт 1 раз в 7 дней!');
  }

  const { error } = await supabase.from('scripts').insert([{
    title, game_name: game, script_code: code,
    author_username: currentUser.username,
    author_role: currentUser.role,
    likes: 0, dislikes: 0, status: 'approved'
  }]);

  if(!error) {
    await supabase.from('users').update({ last_post: now }).eq('id', currentUser.id);
    alert('✅ Скрипт опубликован!');
    closeModal('addScriptModal');
    loadScripts();
  }
}

// === ЗАГРУЗКА СКРИПТОВ И ОТОБРАЖЕНИЕ ===
async function loadScripts() {
  const { data: scripts } = await supabase.from('scripts').select('*').order('created_at', { ascending: false });
  allScripts = scripts || [];
  renderScripts(allScripts);
}

function renderScripts(scripts) {
  const container = document.getElementById('scriptsContainer');
  container.innerHTML = '';

  scripts.forEach(s => {
    const card = document.createElement('div');
    card.className = 'script-card';

    let badge = '';
    if(s.author_role === 'admin') badge = '<span class="badge-admin">👑 ADMIN</span>';
    if(s.author_role === 'verified') badge = '<span class="badge-verified">✅</span>';

    card.innerHTML = `
      <div class="script-header">
        <div>
          <div class="title">${s.title}</div>
          <div class="game">🎮 ${s.game_name}</div>
        </div>
      </div>
      <div class="author-line">Автор: <b>${s.author_username}</b> ${badge}</div>
      
      <div class="card-actions">
        <button class="primary" onclick="copyCode('${encodeURIComponent(s.script_code)}')">📋 Копировать скрипт</button>
        <button onclick="copyLink('${s.id}')">🔗 Ссылка</button>
        <button onclick="likeScript('${s.id}', 1)">👍 ${s.likes || 0}</button>
        <button onclick="likeScript('${s.id}', -1)">👎 ${s.dislikes || 0}</button>
        ${getAdminButtons(s)}
        ${getReportButton(s)}
      </div>

      <!-- Комментарии -->
      <div class="comments-section">
        <input type="text" id="comm_in_${s.id}" placeholder="Оставить комментарий..." style="width:70%; padding:5px; background:#0d1117; color:#fff; border:1px solid #30363d;">
        <button onclick="addComment('${s.id}')">Отправить</button>
        <div id="comms_${s.id}"></div>
      </div>
    `;
    container.appendChild(card);
    loadComments(s.id);
  });
}

// Функционал кнопок управления
function getAdminButtons(script) {
  if(!currentUser || currentUser.role !== 'admin') return '';
  return `
    <button class="danger" onclick="deleteScript('${script.id}')">🗑 Удалить</button>
    <button onclick="toggleVerify('${script.author_username}')">✅ Дать/Снять галочку</button>
    <button class="danger" onclick="banUser('${script.author_username}')">⛔ Забанить автора</button>
  `;
}

function getReportButton(script) {
  if(currentUser && currentUser.role === 'verified') {
    return `<button style="background:#b91c1c;" onclick="strikeUser('${script.author_username}')">🚩 Плагиат (Страйк)</button>`;
  }
  return '';
}

// Страйки (3 страйка = автобан)
async function strikeUser(username) {
  const { data: target } = await supabase.from('users').select('*').eq('username', username).single();
  if(!target) return;

  let newStrikes = (target.strikes || 0) + 1;
  let isBanned = newStrikes >= 3;

  await supabase.from('users').update({ strikes: newStrikes, is_banned: isBanned }).eq('id', target.id);
  
  if(isBanned) alert(`🚨 Пользователь ${username} получил 3-й страйк и был АВТОМАТИЧЕСКИ ЗАБАНЕН!`);
  else alert(`🚩 Выдан страйк плагиата пользователю ${username}. Всего страйков: ${newStrikes}/3`);
}

async function banUser(username) {
  await supabase.from('users').update({ is_banned: true }).eq('username', username);
  alert(`⛔ Пользователь ${username} забанен админом!`);
}

async function deleteScript(id) {
  await supabase.from('scripts').delete().eq('id', id);
  loadScripts();
}

// Комментарии и Лайки
async function addComment(scriptId) {
  if(!currentUser) return alert('Войдите, чтобы писать комментарии!');
  const input = document.getElementById(`comm_in_${scriptId}`);
  if(!input.value) return;

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
  if(!box) return;

  box.innerHTML = (comms || []).map(c => {
    let b = '';
    if(c.author_role === 'admin') b = '<b style="color:#ef4444;">[👑 ADMIN]</b>';
    if(c.author_role === 'verified') b = '<b style="color:#38bdf8;">[✅]</b>';
    return `<div class="comment">${b} <b>${c.author_username}:</b> ${c.text}</div>`;
  }).join('');
}

// Плеер музыки
function toggleMusic() {
  const m = document.getElementById('bgMusic');
  m.paused ? m.play() : m.pause();
}

function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

function copyCode(c) { navigator.clipboard.writeText(decodeURIComponent(c)); alert('Код скопирован!'); }
function copyLink(id) { navigator.clipboard.writeText(location.origin + location.pathname + '?script=' + id); alert('Ссылка скопирована!'); }

document.addEventListener('DOMContentLoaded', () => {
  updateUI();
  loadScripts();
});
