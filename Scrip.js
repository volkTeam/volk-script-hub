const SUPABASE_URL = 'https://yrclsymsijfkfbjjqegun.supabase.co/rest/v1/';
const SUPABASE_KEY = 'sb_publishable_KhFdq-kEENQ4bB6D2H-O8A_C2L_eH8b';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ADMIN_USERNAME = 'natalikalashnik89'; // Ваш главный ник администратора

let currentUser = null; // Здесь будет храниться имя вошедшего пользователя
let allScripts = [];

document.addEventListener('DOMContentLoaded', () => {
  checkLocalSession();
  loadScripts();
  loadStats();
});

function showPage(pageName) {
  const pages = ['home', 'login', 'signup', 'upload', 'rules', 'detail'];
  pages.forEach(p => {
    const el = document.getElementById(`page${p.charAt(0).toUpperCase() + p.slice(1)}`);
    if (el) el.style.display = (p === pageName) ? 'block' : 'none';
  });
  window.scrollTo(0, 0);
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('active');
  document.getElementById('sidebarOverlay').classList.toggle('active');
}

// Проверка сохраненной сессии в браузере
function checkLocalSession() {
  const savedUser = localStorage.getItem('volk_hub_user');
  if (savedUser) {
    currentUser = savedUser;
  }
  updateAuthUI();
}

function updateAuthUI() {
  const authBtns = document.getElementById('authButtons');
  const userProfile = document.getElementById('userProfile');
  const userEmailText = document.getElementById('userEmailText');

  if (currentUser) {
    authBtns.style.display = 'none';
    userProfile.style.display = 'flex';
    userEmailText.textContent = '@' + currentUser;
  } else {
    authBtns.style.display = 'flex';
    userProfile.style.display = 'none';
  }
}

// Регистрация по нику и паролю
async function customSignUp() {
  const username = document.getElementById('signupUsername').value.trim();
  const password = document.getElementById('signupPassword').value.trim();

  if (!username || !password) return alert('Fill in all fields!');
  if (username.length < 3) return alert('Username must be at least 3 characters long!');

  // Проверяем, занято ли имя в таблице пользователей
  const { data: existing, error: checkError } = await supabaseClient
    .from('users')
    .select('username')
    .eq('username', username);

  if (checkError) {
    // Если таблица еще не создана в базе, ничего страшного, создаем
  }

  if (existing && existing.length > 0) {
    return alert('This username is already taken! Choose another one.');
  }

  // Сохраняем пользователя в базу Supabase (в таблицу users)
  const { error: insertError } = await supabaseClient
    .from('users')
    .insert([{ username, password }]);

  if (insertError) {
    // Если таблицы 'users' нет в базе, пока сохраним локально и в скрипты
    alert('Error saving user to database: ' + insertError.message);
    return;
  }

  currentUser = username;
  localStorage.setItem('volk_hub_user', currentUser);
  updateAuthUI();
  alert('Account created successfully! Welcome, ' + username);
  showPage('home');
  loadStats();
}

// Вход по нику и паролю
async function customLogin() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value.trim();

  if (!username || !password) return alert('Fill in all fields!');

  // Ищем пользователя в базе
  const { data, error } = await supabaseClient
    .from('users')
    .select('*')
    .eq('username', username)
    .eq('password', password);

  if (error || !data || data.length === 0) {
    return alert('Invalid username or password!');
  }

  currentUser = username;
  localStorage.setItem('volk_hub_user', currentUser);
  updateAuthUI();
  alert('Logged in successfully!');
  showPage('home');
}

function logout() {
  currentUser = null;
  localStorage.removeItem('volk_hub_user');
  updateAuthUI();
  showPage('home');
}

async function loadStats() {
  try {
    const { count, error } = await supabaseClient.from('users').select('*', { count: 'exact', head: true });
    if (!error && count !== null) {
      document.getElementById('regOnline').textContent = count;
    }
  } catch (e) {
    document.getElementById('regOnline').textContent = '1';
  }
  document.getElementById('guestOnline').textContent = Math.floor(Math.random() * (300 - 120 + 1)) + 120;
}

async function loadScripts() {
  const { data, error } = await supabaseClient.from('scripts').select('*').order('created_at', { ascending: false });
  if (error) {
    document.getElementById('scriptGrid').innerHTML = '<p>Failed to load scripts.</p>';
    return;
  }
  allScripts = data || [];
  displayScripts(allScripts);
}

function displayScripts(scripts) {
  const grid = document.getElementById('scriptGrid');
  grid.innerHTML = '';

  if (scripts.length === 0) {
    grid.innerHTML = '<p style="color: var(--text-muted);">No scripts available.</p>';
    return;
  }

  scripts.forEach(script => {
    const card = document.createElement('div');
    card.className = 'script-card';
    card.onclick = () => openScriptDetail(script.id);
    
    card.innerHTML = `
      <div>
        <div class="card-top">
          <span class="game-title">${escapeHtml(script.game)}</span>
          ${script.has_key_system ? '<span class="badge-key">Key System</span>' : ''}
        </div>
        <div class="script-title">${escapeHtml(script.title)}</div>
      </div>
      <div class="card-stats">
        <span><i class="fa-regular fa-eye"></i> ${script.views || 0}</span>
        <span><i class="fa-regular fa-thumbs-up"></i> ${script.likes || 0}</span>
      </div>
    `;
    grid.appendChild(card);
  });
}

async function openScriptDetail(id) {
  showPage('detail');
  const script = allScripts.find(s => s.id === id);
  if (!script) return;

  await supabaseClient.from('scripts').update({ views: (script.views || 0) + 1 }).eq('id', id);

  const { data: comments } = await supabaseClient.from('comments').select('*').eq('script_id', id).order('created_at', { ascending: false });

  const isAdmin = currentUser === ADMIN_USERNAME;

  const container = document.getElementById('scriptDetailContent');
  container.innerHTML = `
    <div class="detail-box">
      <div class="detail-header">
        <div>
          <span class="game-title">${escapeHtml(script.game)}</span>
          <h2 style="margin-top:5px;">${escapeHtml(script.title)}</h2>
          <p style="font-size:0.85rem; color: var(--text-muted);">Author: @${escapeHtml(script.author_name || 'Unknown')}</p>
        </div>
        ${isAdmin ? `<button class="btn btn-danger" onclick="deleteScript('${script.id}')">Delete Script</button>` : ''}
      </div>

      <p style="margin: 1rem 0; font-size: 0.95rem;">${escapeHtml(script.description || 'No description provided.')}</p>

      <div style="display:flex; gap:10px; margin-bottom: 1rem;">
        <button class="btn btn-cyan" onclick="likeScript('${script.id}', 1)"><i class="fa-regular fa-thumbs-up"></i> (${script.likes || 0})</button>
        <button class="btn btn-outline" onclick="likeScript('${script.id}', -1)"><i class="fa-regular fa-thumbs-down"></i> (${script.dislikes || 0})</button>
      </div>

      <div class="code-block">${escapeHtml(script.script_code)}</div>
      <button class="btn btn-cyan" onclick="copyCode(\`${escapeHtml(script.script_code).replace(/`/g, '\\`')}\`)"><i class="fa-regular fa-copy"></i> Copy Script</button>

      <div class="comments-section">
        <h3>Comments</h3>
        ${currentUser ? `
          <div style="margin: 1rem 0; display:flex; gap:8px;">
            <input type="text" id="commentInput" placeholder="Write a comment..." style="flex:1; padding:0.6rem; background:var(--bg-input); border:1px solid var(--border-color); border-radius:6px; color:#fff;" />
            <button class="btn btn-cyan" onclick="postComment('${script.id}')">Send</button>
          </div>
        ` : '<p style="color:var(--text-muted); font-size:0.85rem; margin-bottom:1rem;">Please <a href="#" onclick="showPage(\'login\')" style="color:var(--cyan-primary);">Login</a> to comment.</p>'}

        <div id="commentsList">
          ${(comments || []).map(c => `
            <div class="comment-item">
              <div class="comment-author">@${escapeHtml(c.author_name)}</div>
              <div>${escapeHtml(c.comment)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

async function publishScript() {
  if (!currentUser) return alert('Please login first!'), showPage('login');

  const title = document.getElementById('scriptTitle').value.trim();
  const game = document.getElementById('scriptGame').value.trim();
  const description = document.getElementById('scriptDesc').value.trim();
  const script_code = document.getElementById('scriptCode').value.trim();
  const has_key_system = document.getElementById('hasKeySystem').checked;

  if (!title || !game || !script_code) return alert('Fill in all required fields!');

  const { error } = await supabaseClient.from('scripts').insert([{
    title, game, description, script_code, has_key_system,
    author_name: currentUser
  }]);

  if (error) alert('Error: ' + error.message);
  else {
    alert('Script uploaded successfully!');
    showPage('home');
    loadScripts();
  }
}

async function likeScript(id, type) {
  const script = allScripts.find(s => s.id === id);
  if (!script) return;

  const updateData = type === 1 ? { likes: (script.likes || 0) + 1 } : { dislikes: (script.dislikes || 0) + 1 };
  await supabaseClient.from('scripts').update(updateData).eq('id', id);
  loadScripts();
  openScriptDetail(id);
}

async function postComment(scriptId) {
  const text = document.getElementById('commentInput').value.trim();
  if (!text) return;

  await supabaseClient.from('comments').insert([{
    script_id: scriptId,
    author_name: currentUser,
    comment: text
  }]);

  openScriptDetail(scriptId);
}

async function deleteScript(id) {
  if (!confirm('Delete this script?')) return;
  await supabaseClient.from('scripts').delete().eq('id', id);
  showPage('home');
  loadScripts();
}

function filterScripts() {
  const query = document.getElementById('searchInput').value.toLowerCase();
  const strict = document.getElementById('strictSearch').checked;

  const filtered = allScripts.filter(s => {
    const title = (s.title || '').toLowerCase();
    const game = (s.game || '').toLowerCase();
    if (strict) return title === query || game === query;
    return title.includes(query) || game.includes(query);
  });
  displayScripts(filtered);
}

function copyCode(code) {
  navigator.clipboard.writeText(code);
  alert('Script copied to clipboard!');
}

/* --- ВАЖНО: Создайте таблицу `users` в Supabase SQL Editor ---
  create table users (
    id bigint generated by default as identity primary key,
    username text unique not null,
    password text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
  );
---------------------------------------------------------------- */

function escapeHtml(text) {
  if (!text) return '';
  return String(text).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
}
