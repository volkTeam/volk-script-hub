// Конфигурация Supabase
const SUPABASE_URL = 'https://YOUR_SUPABASE_PROJECT_URL.supabase.co'; // <-- Вставьте URL Supabase
const SUPABASE_KEY = 'sb_publishable_KhFdq-kEENQ4bB6D2H-O8A_C2L_eH8b';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Введите ваш Email для прав Администратора
const ADMIN_EMAILS = ['admin@gmail.com'];

let currentUser = null;
let allScripts = [];

document.addEventListener('DOMContentLoaded', () => {
  initAuthListener();
  loadScripts();
});

// Переключение навигации по страницам
function showPage(pageName) {
  const pages = ['home', 'login', 'signup', 'upload'];
  pages.forEach(p => {
    const el = document.getElementById(`page${p.charAt(0).toUpperCase() + p.slice(1)}`);
    if (el) el.style.display = (p === pageName) ? 'block' : 'none';
  });
}

// Показ/скрытие боковой панели
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('active');
  document.getElementById('sidebarOverlay').classList.toggle('active');
}

// Авторизация
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

async function loginWithEmail() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  const errorEl = document.getElementById('loginEmailError');

  if (!email.includes('@')) {
    errorEl.style.display = 'block';
    return;
  } else {
    errorEl.style.display = 'none';
  }

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    alert('Ошибка входа: ' + error.message);
  } else {
    showPage('home');
  }
}

async function signUpWithEmail() {
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value.trim();

  const { error } = await supabaseClient.auth.signUp({ email, password });
  if (error) {
    alert('Ошибка регистрации: ' + error.message);
  } else {
    alert('Успешно! Проверьте почту для подтверждения аккаунта.');
    showPage('login');
  }
}

async function loginWithGoogle() {
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.href }
  });
  if (error) alert('Ошибка Google: ' + error.message);
}

async function logout() {
  await supabaseClient.auth.signOut();
  showPage('home');
}

// Скрипты
async function loadScripts() {
  const { data, error } = await supabaseClient
    .from('scripts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    document.getElementById('scriptGrid').innerHTML = '<p>Не удалось загрузить скрипты.</p>';
    return;
  }

  allScripts = data || [];
  displayScripts(allScripts);
}

function displayScripts(scripts) {
  const grid = document.getElementById('scriptGrid');
  grid.innerHTML = '';

  if (scripts.length === 0) {
    grid.innerHTML = '<p style="color: var(--text-muted);">Скриптов пока нет.</p>';
    return;
  }

  const isAdmin = currentUser && ADMIN_EMAILS.includes(currentUser.email);

  scripts.forEach(script => {
    const card = document.createElement('div');
    card.className = 'script-card';
    card.innerHTML = `
      <div>
        <div class="card-top">
          <span class="game-title">${escapeHtml(script.game)}</span>
          ${isAdmin ? `<button class="btn btn-danger" onclick="deleteScript('${script.id}')"><i class="fa-solid fa-trash"></i></button>` : ''}
        </div>
        <div class="script-title">${escapeHtml(script.title)}</div>
        <div class="code-box">${escapeHtml(script.script_code)}</div>
      </div>
      <button class="btn btn-cyan btn-full" onclick="copyScript(this, \`${escapeHtml(script.script_code)}\`)">
        <i class="fa-regular fa-copy"></i> Copy Script
      </button>
    `;
    grid.appendChild(card);
  });
}

async function publishScript() {
  if (!currentUser) {
    alert('Сначала войдите в аккаунт!');
    showPage('login');
    return;
  }

  const title = document.getElementById('scriptTitle').value.trim();
  const game = document.getElementById('scriptGame').value.trim();
  const script_code = document.getElementById('scriptCode').value.trim();

  if (!title || !game || !script_code) {
    return alert('Заполните все поля!');
  }

  const { error } = await supabaseClient.from('scripts').insert([
    {
      title,
      game,
      script_code,
      author_id: currentUser.id,
      author_name: currentUser.email.split('@')[0]
    }
  ]);

  if (error) {
    alert('Ошибка загрузки: ' + error.message);
  } else {
    alert('Скрипт успешно добавлен!');
    document.getElementById('scriptTitle').value = '';
    document.getElementById('scriptGame').value = '';
    document.getElementById('scriptCode').value = '';
    showPage('home');
    loadScripts();
  }
}

async function deleteScript(id) {
  if (!confirm('Удалить этот скрипт?')) return;
  const { error } = await supabaseClient.from('scripts').delete().eq('id', id);
  if (error) alert('Ошибка удаления: ' + error.message);
  else loadScripts();
}

function filterScripts() {
  const query = document.getElementById('searchInput').value.toLowerCase();
  const strict = document.getElementById('strictSearch').checked;

  const filtered = allScripts.filter(s => {
    if (strict) {
      return s.title.toLowerCase() === query || s.game.toLowerCase() === query;
    }
    return s.title.toLowerCase().includes(query) || s.game.toLowerCase().includes(query);
  });

  displayScripts(filtered);
}

function togglePasswordVisibility(id) {
  const input = document.getElementById(id);
  input.type = input.type === 'password' ? 'text' : 'password';
}

function copyScript(btn, code) {
  navigator.clipboard.writeText(code);
  const orig = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
  setTimeout(() => btn.innerHTML = orig, 2000);
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
}
