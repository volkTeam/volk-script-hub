cconst SUPABASE_URL = 'https://yrclsymsijfkfbjjqegun.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyY2xzeW1zaWprZmJqcWVndW4iLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczODc0ODkyMiwiZXhwIjoyMDU0MzI0OTIyfQ.KhFdq-kEENQ4bB6D2H-O8A_C2L_eH8bG8L0A1K2w8';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null; 
let currentUserData = null;
let allScripts = [];

const ADMIN_USERNAME = 'volkTeamADMIN';

document.addEventListener('DOMContentLoaded', () => {
  checkLocalSession();
  loadScripts();
  loadStats();
});

function showPage(pageName) {
  const pages = ['home', 'login', 'signup', 'upload', 'rules', 'detail', 'profile', 'admin'];
  pages.forEach(p => {
    const el = document.getElementById(`page${p.charAt(0).toUpperCase() + p.slice(1)}`);
    if (el) el.style.display = (p === pageName) ? 'block' : 'none';
  });
  if (pageName === 'profile' && currentUserData) {
    document.getElementById('profileAvatarInput').value = currentUserData.avatar || '';
    document.getElementById('profilePreviewImg').src = currentUserData.avatar || 'https://via.placeholder.com/100?text=Avatar';
  }
  if (pageName === 'admin') {
    loadAdminPanelData();
  }
  window.scrollTo(0, 0);
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('active');
  document.getElementById('sidebarOverlay').classList.toggle('active');
}

async function checkLocalSession() {
  const savedUser = localStorage.getItem('volk_hub_user');
  if (savedUser) {
    const { data } = await supabaseClient.from('users').select('*').eq('username', savedUser).single();
    if (data) {
      currentUser = data.username;
      currentUserData = data;
    } else {
      localStorage.removeItem('volk_hub_user');
    }
  }
  updateAuthUI();
}

async function updateAuthUI() {
  const authBtns = document.getElementById('authButtons');
  const userProfile = document.getElementById('userProfile');
  const userEmailText = document.getElementById('userEmailText');
  const userNavAvatar = document.getElementById('userNavAvatar');
  const adminSidebarLink = document.getElementById('adminSidebarLink');

  if (currentUser) {
    authBtns.style.display = 'none';
    userProfile.style.display = 'flex';
    userEmailText.textContent = '@' + currentUser;
    userNavAvatar.src = currentUserData?.avatar || 'https://via.placeholder.com/40?text=U';
    
    // Проверка на админа
    if (currentUser === ADMIN_USERNAME || currentUserData?.is_admin) {
      adminSidebarLink.style.display = 'flex';
    } else {
      adminSidebarLink.style.display = 'none';
    }
  } else {
    authBtns.style.display = 'flex';
    userProfile.style.display = 'none';
    adminSidebarLink.style.display = 'none';
  }
}

// Регистрация
async function customSignUp() {
  const username = document.getElementById('signupUsername').value.trim();
  const password = document.getElementById('signupPassword').value.trim();

  if (!username || !password) return alert('Fill in all fields!');
  if (username.length < 3) return alert('Username must be at least 3 characters long!');

  const { data: existing } = await supabaseClient.from('users').select('username').eq('username', username);
  if (existing && existing.length > 0) {
    return alert('This username is already taken! Choose another one.');
  }

  // Если регистрируется главный админ, даем права сразу
  const isAdmin = (username === ADMIN_USERNAME);

  const { error: insertError } = await supabaseClient.from('users').insert([{
    username,
    password,
    is_admin: isAdmin,
    is_verified: isAdmin,
    avatar: 'https://via.placeholder.com/100?text=' + username.charAt(0)
  }]);

  if (insertError) {
    return alert('Error creating account: ' + insertError.message);
  }

  currentUser = username;
  const { data: freshData } = await supabaseClient.from('users').select('*').eq('username', username).single();
  currentUserData = freshData;

  localStorage.setItem('volk_hub_user', currentUser);
  updateAuthUI();
  alert('Account created successfully! Welcome, ' + username);
  showPage('home');
  loadStats();
}

// Вход
async function customLogin() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value.trim();

  if (!username || !password) return alert('Fill in all fields!');

  const { data, error } = await supabaseClient
    .from('users')
    .select('*')
    .eq('username', username)
    .eq('password', password);

  if (error || !data || data.length === 0) {
    return alert('Invalid username or password!');
  }

  currentUser = username;
  currentUserData = data[0];
  localStorage.setItem('volk_hub_user', currentUser);
  updateAuthUI();
  alert('Logged in successfully!');
  showPage('home');
}

function logout() {
  currentUser = null;
  currentUserData = null;
  localStorage.removeItem('volk_hub_user');
  updateAuthUI();
  showPage('home');
}

// Обновление аватарки профиля
async function updateProfileAvatar() {
  const avatarUrl = document.getElementById('profileAvatarInput').value.trim();
  if (!avatarUrl) return alert('Enter a valid image URL!');

  const { error } = await supabaseClient.from('users').update({ avatar: avatarUrl }).eq('username', currentUser);
  if (error) return alert('Error updating avatar: ' + error.message);

  currentUserData.avatar = avatarUrl;
  document.getElementById('profilePreviewImg').src = avatarUrl;
  document.getElementById('userNavAvatar').src = avatarUrl;
  alert('Avatar updated successfully!');
  loadScripts();
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

  const validScripts = scripts.filter(s => !s.is_banned);

  if (validScripts.length === 0) {
    grid.innerHTML = '<p style="color: var(--text-muted);">No scripts available.</p>';
    return;
  }

  validScripts.forEach(script => {
    const card = document.createElement('div');
    card.className = 'script-card';
    card.onclick = () => openScriptDetail(script.id);
    
    const thumbImg = script.image || 'https://via.placeholder.com/280x140?text=VolkHub+Script';

    card.innerHTML = `
      <div>
        <div class="card-thumbnail" style="background-image: url('${escapeHtml(thumbImg)}')"></div>
        <div class="card-top" style="margin-top: 8px;">
          <span class="game-title">${escapeHtml(script.game)}</span>
          ${script.has_key_system ? '<span class="badge-key">Key System</span>' : ''}
        </div>
        <div class="script-title">${escapeHtml(script.title)}</div>
        <div class="script-author-info">
          <span>By <strong>@${escapeHtml(script.author_name)}</strong></span>
          ${script.author_verified ? '<i class="fa-solid fa-circle-check verified-badge" title="Verified Creator"></i>' : ''}
        </div>
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
  const { data: authorData } = await supabaseClient.from('users').select('avatar, is_verified').eq('username', script.author_name).single();

  const isAdmin = currentUser === ADMIN_USERNAME || currentUserData?.is_admin;
  const authorAvatar = authorData?.avatar || 'https://via.placeholder.com/40?text=U';
  const isVerifiedAuthor = script.author_verified || authorData?.is_verified;

  const container = document.getElementById('scriptDetailContent');
  container.innerHTML = `
    <div class="detail-box">
      <div class="detail-header">
        <div>
          <span class="game-title">${escapeHtml(script.game)}</span>
          <h2 style="margin-top:5px;">${escapeHtml(script.title)}</h2>
          <div class="detail-author-row">
            <img src="${escapeHtml(authorAvatar)}" class="detail-avatar" alt="Avatar">
            <span>Author: <strong>@${escapeHtml(script.author_name)}</strong></span>
            ${isVerifiedAuthor ? '<i class="fa-solid fa-circle-check verified-badge"></i>' : ''}
          </div>
        </div>
        ${isAdmin ? `<button class="btn btn-danger" onclick="adminDeleteScript('${script.id}')">Delete Script</button>` : ''}
      </div>

      ${script.image ? `<div class="detail-image-box"><img src="${escapeHtml(script.image)}" alt="Script Image"></div>` : ''}
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

// Публикация скрипта с проверкой лимита (1 раз в неделю для обычных)
async function publishScript() {
  if (!currentUser) return alert('Please login first!'), showPage('login');

  const title = document.getElementById('scriptTitle').value.trim();
  const game = document.getElementById('scriptGame').value.trim();
  const image = document.getElementById('scriptImage').value.trim();
  const description = document.getElementById('scriptDesc').value.trim();
  const script_code = document.getElementById('scriptCode').value.trim();
  const has_key_system = document.getElementById('hasKeySystem').checked;

  if (!title || !game || !script_code) return alert('Fill in all required fields!');

  const isAdmin = currentUser === ADMIN_USERNAME || currentUserData?.is_admin;
  const isVerified = currentUserData?.is_verified;

  // Если юзер не админ и не верифицирован (без галочки), проверяем лимит 1 раз в 7 дней
  if (!isAdmin && !isVerified) {
    const { data: userScripts } = await supabaseClient
      .from('scripts')
      .select('created_at')
      .eq('author_name', currentUser)
      .order('created_at', { ascending: false })
      .limit(1);

    if (userScripts && userScripts.length > 0) {
      const lastUploadTime = new Date(userScripts[0].created_at).getTime();
      const oneWeek = 7 * 24 * 60 * 60 * 1000;
      const now = new Date().getTime();

      if (now - lastUploadTime < oneWeek) {
        const daysLeft = Math.ceil((oneWeek - (now - lastUploadTime)) / (1000 * 60 * 60 * 24));
        return alert(`Regular users can only publish 1 script per week! Please wait ${daysLeft} more days or get verified/badge.`);
      }
    }
  }

  const { error } = await supabaseClient.from('scripts').insert([{
    title, game, image, description, script_code, has_key_system,
    author_name: currentUser,
    author_verified: isVerified || isAdmin,
    is_banned: false
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

// Админские функции
async function loadAdminPanelData() {
  const listEl = document.getElementById('adminScriptsList');
  const { data } = await supabaseClient.from('scripts').select('*').order('created_at', { ascending: false });
  
  if (!data || data.length === 0) {
    listEl.innerHTML = '<p>No scripts found.</p>';
    return;
  }

  listEl.innerHTML = data.map(s => `
    <div class="admin-script-row">
      <span><strong>${escapeHtml(s.title)}</strong> (@${escapeHtml(s.author_name)}) ${s.is_banned ? '<span style="color:red;">[BANNED]</span>' : ''}</span>
      <div style="display:flex; gap:6px;">
        ${s.is_banned ? 
          `<button class="btn btn-outline btn-sm" onclick="toggleBanScript('${s.id}', false)">Unban</button>` : 
          `<button class="btn btn-danger btn-sm" onclick="toggleBanScript('${s.id}', true)">Ban</button>`
        }
        <button class="btn btn-danger btn-sm" onclick="adminDeleteScript('${s.id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

async function toggleBanScript(id, status) {
  const { error } = await supabaseClient.from('scripts').update({ is_banned: status }).eq('id', id);
  if (error) alert('Error: ' + error.message);
  else {
    alert(status ? 'Script banned!' : 'Script unbanned!');
    loadAdminPanelData();
    loadScripts();
  }
}

async function adminDeleteScript(id) {
  if (!confirm('Delete this script permanently?')) return;
  await supabaseClient.from('scripts').delete().eq('id', id);
  showPage('home');
  loadScripts();
}

async function setUserBadge(status) {
  const username = document.getElementById('badgeUsernameInput').value.trim();
  if (!username) return alert('Enter username!');

  const { error } = await supabaseClient.from('users').update({ is_verified: status }).eq('username', username);
  if (error) alert('Error: ' + error.message);
  else alert(`User @${username} status updated (Verified: ${status})!`);
}

async function promoteToAdmin() {
  const username = document.getElementById('adminUsernameInput').value.trim();
  if (!username) return alert('Enter username!');

  const { error } = await supabaseClient.from('users').update({ is_admin: true, is_verified: true }).eq('username', username);
  if (error) alert('Error: ' + error.message);
  else alert(`User @${username} is now an Admin!`);
}

function filterScripts() {
  const query = document.getElementById('searchInput').value.toLowerCase();
  const strict = document.getElementById('strictSearch').checked;

  const filtered = allScripts.filter(s => {
    if (s.is_banned) return false;
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

function escapeHtml(text) {
  if (!text) return '';
  return String(text).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
}
/* Исправление кликабельности кнопок */
.page-section {
  position: relative;
  z-index: 10;
}

.sidebar-overlay {
  pointer-events: none;
}
.sidebar-overlay.active {
  pointer-events: auto;
}
