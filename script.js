const ADMIN_PASS = "AbdOkRjclen484849TldbcnKsnfk";

// Базовый фильтр запрещенных слов/18+ ссылок
const forbiddenWords = ['xxx', 'porn', 'adult', 'nude', 'sex', 'nsfw', 'hentai'];

let currentUser = JSON.parse(localStorage.getItem('volk_user')) || null;
let allScripts = JSON.parse(localStorage.getItem('volk_scripts')) || [];

document.addEventListener('DOMContentLoaded', () => {
  updateUI();
  renderScripts(allScripts);
});

// Проверка текста на 18+
function isContentClean(text) {
  if (!text) return true;
  return !forbiddenWords.some(word => text.toLowerCase().includes(word));
}

function showPage(pageId) {
  document.querySelectorAll('.page-section').forEach(sec => sec.style.display = 'none');
  document.getElementById(pageId).style.display = 'block';
  document.getElementById('dropdownMenu').classList.remove('show');
}

function goToMakeScript() {
  if (!currentUser) return alert('Войдите в аккаунт, чтобы создавать скрипты!');
  showPage('makeScriptPage');
}

function registerUser() {
  const email = document.getElementById('userEmail').value.trim();
  const username = document.getElementById('userName').value.trim();
  
  if (!email || !username) return alert('Заполните Email и Имя!');
  if (!isContentClean(username)) return alert('Запрещенное имя пользователя!');

  currentUser = { username: username, email: email, role: 'user' };
  localStorage.setItem('volk_user', JSON.stringify(currentUser));
  updateUI();
  showPage('mainPage');
}

function logoutUser() {
  localStorage.removeItem('volk_user');
  currentUser = null;
  updateUI();
  alert('Вы вышли из профиля.');
}

function updateUI() {
  document.getElementById('adminNavBtn').style.display = (currentUser && currentUser.role === 'admin') ? 'block' : 'none';
  document.getElementById('authNavBtn').innerText = currentUser ? currentUser.username : '👤 Вход';
  document.getElementById('userWelcomeText').innerText = currentUser ? `Привет, ${currentUser.username}` : '';
}

function createNewScript() {
  if (!currentUser) return alert('Сначала войдите!');

  const title = document.getElementById('scriptTitle').value.trim();
  const game = document.getElementById('scriptGame').value.trim();
  const code = document.getElementById('scriptCode').value.trim();

  if (!title || !game || !code) return alert('Заполните все поля!');

  // Проверка 18+
  if (!isContentClean(title) || !isContentClean(game) || !isContentClean(code)) {
    return alert('❌ Ошибка: Обнаружен запрещенный (18+) контент или недопустимая ссылка!');
  }

  const newScript = {
    id: Date.now().toString(),
    title: title,
    game: game,
    code: code,
    author: currentUser.username,
    role: currentUser.role,
    likes: 0,
    comments: []
  };
  
  allScripts.unshift(newScript);
  localStorage.setItem('volk_scripts', JSON.stringify(allScripts));
  
  // Очищаем форму
  document.getElementById('scriptTitle').value = '';
  document.getElementById('scriptGame').value = '';
  document.getElementById('scriptCode').value = '';

  alert('✅ Скрипт опубликован!');
  showPage('mainPage');
  renderScripts(allScripts);
}

function renderScripts(list) {
  const grid = document.getElementById('scriptsGrid');
  grid.innerHTML = '';

  if (list.length === 0) {
    grid.innerHTML = '<p style="color:#64748b;">Скриптов пока нет. Будьте первым!</p>';
    return;
  }

  list.forEach(s => {
    let badge = s.role === 'admin' ? '<span class="badge badge-admin-tag">👑 ADMIN</span>' : 
                s.role === 'verified' ? '<span class="badge badge-verified">✅ Verified</span>' : 
                '<span class="badge badge-verified" style="background:#334155">✏️ Creator</span>';
    
    const card = document.createElement('div');
    card.className = 'script-card';
    card.innerHTML = `
      <h3>${escapeHtml(s.title)}</h3>
      <p style="font-size:12px; color:#94a3b8; margin: 4px 0;">🎮 ${escapeHtml(s.game)} | Автор: <b>${escapeHtml(s.author)}</b> ${badge}</p>
      
      <div style="margin:10px 0;">
        <button class="btn-small" onclick="likeScript('${s.id}')">👍 ${s.likes}</button>
      </div>

      <div class="comments-box">
        ${currentUser ? `
          <div style="display:flex; gap:5px; margin-bottom:5px;">
            <input type="text" id="comm_${s.id}" placeholder="Написать..." style="margin:0; padding:4px; font-size:12px;">
            <button class="btn-small" onclick="addComment('${s.id}')">ОК</button>
          </div>
        ` : '<p style="font-size:11px; color:#64748b">🔒 Войдите, чтобы писать комментарии</p>'}
        
        <div id="comms_${s.id}">
          ${(s.comments || []).map(c => `<div style="font-size:12px; margin-top:4px;"><b>${escapeHtml(c.author)}:</b> ${escapeHtml(c.text)}</div>`).join('')}
        </div>
      </div>

      ${(currentUser && currentUser.role === 'admin') ? `
        <button class="btn-secondary" style="background:#b91c1c; margin-top:10px;" onclick="deleteScript('${s.id}')">Удалить</button>
      ` : ''}
    `;
    grid.appendChild(card);
  });
}

function likeScript(id) {
  const s = allScripts.find(x => x.id === id);
  if (s) {
    s.likes++;
    localStorage.setItem('volk_scripts', JSON.stringify(allScripts));
    renderScripts(allScripts);
  }
}

function addComment(id) {
  if (!currentUser) return alert('Войдите в аккаунт!');
  const input = document.getElementById('comm_' + id);
  const text = input.value.trim();

  if (!text) return;
  if (!isContentClean(text)) return alert('Запрещенные слова в комментарии!');

  const s = allScripts.find(x => x.id === id);
  if (s) {
    if (!s.comments) s.comments = [];
    s.comments.push({ author: currentUser.username, text: text });
    localStorage.setItem('volk_scripts', JSON.stringify(allScripts));
    renderScripts(allScripts);
  }
}

function deleteScript(id) {
  allScripts = allScripts.filter(x => x.id !== id);
  localStorage.setItem('volk_scripts', JSON.stringify(allScripts));
  renderScripts(allScripts);
}

function openAdminModal() {
  const pass = prompt("Введите админ-пароль:");
  if (pass === ADMIN_PASS) {
    if (!currentUser) currentUser = { username: "Admin", role: "admin" };
    else currentUser.role = 'admin';
    
    localStorage.setItem('volk_user', JSON.stringify(currentUser));
    updateUI();
    alert('Вы вошли как Администратор!');
    renderScripts(allScripts);
  } else if (pass !== null) {
    alert('Неверный пароль!');
  }
}

function toggleMusic() { 
  const a = document.getElementById('bgMusic'); 
  a.paused ? a.play() : a.pause(); 
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

document.getElementById('settingsBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  document.getElementById('dropdownMenu').classList.toggle('show');
});

// Закрытие меню при клике вне его
document.addEventListener('click', () => {
  document.getElementById('dropdownMenu').classList.remove('show');
});
