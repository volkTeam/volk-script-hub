const SUPABASE_URL = 'https://yrclsymsijfkfbjqegun.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_KhFdq-kEENQ4bB6D2H-O8A_C2L_eH8b';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ADMIN_EMAILS = ['tвой_email@gmail.com']; // Укажи свой email админа

let currentUser = null;
let allScripts = [];
let pendingEmail = '';

document.addEventListener('DOMContentLoaded', () => {
  initAuthListener();
  loadScripts();
  loadStats();
});

function showPage(pageName) {
  const pages = ['home', 'login', 'signup', 'verify', 'upload', 'rules', 'detail'];
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

function initAuthListener() {
  supabaseClient.auth.onAuthStateChange((event, session) => {
    currentUser = session ? session.user : null;
    updateAuthUI();
  });
}

function updateAuthUI() {
  const authBtns = document.getElementById('authButtons');
  const userProfile = document.getElementById('userProfile');
  const userEmailText = document.getElementById('userEmailText');

  if (currentUser) {
    authBtns.style.display = 'none';
    userProfile.style.display = 'flex';
    userEmailText.textContent = currentUser.email.split('@')[0];
  } else {
    authBtns.style.display = 'flex';
    userProfile.style.display = 'none';
  }
}

async function signUpWithEmail() {
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value.trim();

  if (password.length < 6) return alert('Password must be at least 6 characters!');

  const { error } = await supabaseClient.auth.signUp({ email, password });
  if (error) {
    alert('Signup error: ' + error.message);
  } else {
    pendingEmail = email;
    alert('Verification code sent to your email!');
    showPage('verify');
  }
}

async function verifyEmailCode() {
  const token = document.getElementById('verifyCode').value.trim();
  if (token.length !== 6) return alert('Enter a valid 6-digit code!');

  const { error } = await supabaseClient.auth.verifyOtp({
    email: pendingEmail,
    token: token,
    type: 'signup'
  });

  if (error) {
    alert('Verification error: ' + error.message);
  } else {
    alert('Account verified successfully!');
    showPage('home');
    loadStats();
  }
}

async function loginWithEmail() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) alert('Login error: ' + error.message);
  else showPage('home');
}

async function loginWithGoogle() {
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.href }
  });
  if (error) alert('Google login error: ' + error.message);
}

async function logout() {
  await supabaseClient.auth.signOut();
  showPage('home');
}

async function loadStats() {
  const { data: userCount, error } = await supabaseClient.rpc('get_user_count');
  if (!error && userCount !== null) {
    document.getElementById('regOnline').textContent = userCount;
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
        <span><i class="fa-regular fa-eye"></i> ${script.views}</span>
        <span><i class="fa-regular fa-thumbs-up"></i> ${script.likes}</span>
      </div>
    `;
    grid.appendChild(card);
  });
}

async function openScriptDetail(id) {
  showPage('detail');
  const script = allScripts.find(s => s.id === id);
  if (!script) return;

  await supabaseClient.from('scripts').update({ views: script.views + 1 }).eq('id', id);

  const { data: comments } = await supabaseClient.from('comments').select('*').eq('script_id', id).order('created_at', { ascending: false });

  const isAdmin = currentUser && ADMIN_EMAILS.includes(currentUser.email);

  const container = document.getElementById('scriptDetailContent');
  container.innerHTML = `
    <div class="detail-box">
      <div class="detail-header">
        <div>
          <span class="game-title">${escapeHtml(script.game)}</span>
          <h2 style="margin-top:5px;">${escapeHtml(script.title)}</h2>
          <p style="font-size:0.85rem; color: var(--text-muted);">Author: ${escapeHtml(script.author_name)}</p>
        </div>
        ${isAdmin ? `<button class="btn btn-danger" onclick="deleteScript('${script.id}')">Delete Script</button>` : ''}
      </div>

      <p style="margin: 1rem 0; font-size: 0.95rem;">${escapeHtml(script.description || 'No description provided.')}</p>

      <div style="display:flex; gap:10px; margin-bottom: 1rem;">
        <button class="btn btn-cyan" onclick="likeScript('${script.id}', 1)"><i class="fa-regular fa-thumbs-up"></i> (${script.likes})</button>
        <button class="btn btn-outline" onclick="likeScript('${script.id}', -1)"><i class="fa-regular fa-thumbs-down"></i> (${script.dislikes})</button>
      </div>

      <div class="code-block">${escapeHtml(script.script_code)}</div>
      <button class="btn btn-cyan" onclick="copyCode(\`${escapeHtml(script.script_code)}\`)"><i class="fa-regular fa-copy"></i> Copy Script</button>

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
              <div class="comment-author">${escapeHtml(c.author_name)}</div>
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
    author_id: currentUser.id,
    author_name: currentUser.email.split('@')[0]
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

  const updateData = type === 1 ? { likes: script.likes + 1 } : { dislikes: script.dislikes + 1 };
  await supabaseClient.from('scripts').update(updateData).eq('id', id);
  loadScripts();
  openScriptDetail(id);
}

async function postComment(scriptId) {
  const text = document.getElementById('commentInput').value.trim();
  if (!text) return;

  await supabaseClient.from('comments').insert([{
    script_id: scriptId,
    user_id: currentUser.id,
    author_name: currentUser.email.split('@')[0],
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
    if (strict) return s.title.toLowerCase() === query || s.game.toLowerCase() === query;
    return s.title.toLowerCase().includes(query) || s.game.toLowerCase().includes(query);
  });
  displayScripts(filtered);
}

function copyCode(code) {
  navigator.clipboard.writeText(code);
  alert('Script copied to clipboard!');
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
}
