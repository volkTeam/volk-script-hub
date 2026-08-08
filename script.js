const SUPABASE_URL = 'https://yrclsymsijfkfbjjqegn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyY2xzeW1zaWpma2ZiampxZWduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY3Mjc1NTEsImV4cCI6MjA0MjMwMzU1MX0.1zaWprWmJmQjcwWndNW4lICJyb2x6JjVlMjl0aW9uVzJtY2N5bmVwdW5kNGl3Mmc2UHVJMXFhZDEwMWNhODlhMzAtNzI1MTQhZHc0MkV6MTRiRzB1QjFhSzJ3OCc7X08A_C2L_eH8bG80A1K2w8';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const ADMIN_EMAIL = 'tboi_email@gmail.com'; // Укажи свой email администратора

let currentUser = null;
let allScripts = [];
let pendingScripts = [];

document.addEventListener('DOMContentLoaded', () => {
    initAuthListener();
    loadScripts();
    loadStats();
});

function showPage(pageName) {
    const pages = ['home', 'login', 'signup', 'verify', 'upload', 'rules', 'executors', 'admin'];
    pages.forEach(p => {
        const el = document.getElementById(p);
        if (el) el.style.display = (p === pageName) ? 'block' : 'none';
    });
    
    // Подсветка активной ссылки в меню
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.getAttribute('onclick')?.includes(pageName));
    });
}

async function initAuthListener() {
    const { data: { session } } = await supabase.auth.getSession();
    updateAuthUI(session?.user || null);

    supabase.auth.onAuthStateChange((_event, session) => {
        updateAuthUI(session?.user || null);
    });
}

function updateAuthUI(user) {
    currentUser = user;
    const loginLink = document.getElementById('nav-login');
    const signupLink = document.getElementById('nav-signup');
    const logoutBtn = document.getElementById('nav-logout');
    const adminLink = document.getElementById('nav-admin');

    if (user) {
        if (loginLink) loginLink.style.display = 'none';
        if (signupLink) signupLink.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'block';
        
        if (user.email === ADMIN_EMAIL) {
            if (adminLink) adminLink.style.display = 'block';
        } else {
            if (adminLink) adminLink.style.display = 'none';
        }
    } else {
        if (loginLink) loginLink.style.display = 'block';
        if (signupLink) signupLink.style.display = 'block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (adminLink) adminLink.style.display = 'none';
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
        alert('Ошибка входа: ' + error.message);
    } else {
        alert('Успешный вход!');
        showPage('home');
        loadScripts();
    }
}

async function handleSignup(e) {
    e.preventDefault();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
        alert('Ошибка регистрации: ' + error.message);
    } else {
        alert('Регистрация успешна! Проверьте почту для подтверждения (если требуется).');
        showPage('home');
    }
}

async function handleLogout() {
    await supabase.auth.signOut();
    alert('Вы вышли из аккаунта');
    showPage('home');
}

async function loadScripts() {
    const container = document.getElementById('scripts-container');
    if (!container) return;

    container.innerHTML = 'Загрузка скриптов...';

    const { data, error } = await supabase
        .from('scripts')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        container.innerHTML = 'Ошибка загрузки скриптов: ' + error.message;
        return;
    }

    allScripts = data || [];
    renderScripts(allScripts);
}

function renderScripts(scripts) {
    const container = document.getElementById('scripts-container');
    if (!container) return;

    if (scripts.length === 0) {
        container.innerHTML = '<p>Скрипты не найдены.</p>';
        return;
    }

    container.innerHTML = scripts.map(script => `
        <div class="script-card">
            <h3>${escapeHtml(script.title)}</h3>
            <p><strong>Игра:</strong> ${escapeHtml(script.game)}</p>
            <pre><code>${escapeHtml(script.script_code)}</code></pre>
            <button onclick="navigator.clipboard.writeText('${escapeHtml(script.script_code).replace(/'/g, "\\'")}')">Копировать код</button>
        </div>
    `).join('');
}

function searchScripts() {
    const query = document.getElementById('search-input').value.toLowerCase();
    const filtered = allScripts.filter(s => 
        s.title.toLowerCase().includes(query) || 
        s.game.toLowerCase().includes(query)
    );
    renderScripts(filtered);
}

async function handleUpload(e) {
    e.preventDefault();
    if (!currentUser) {
        alert('Нужно войти в аккаунт, чтобы загрузить скрипт!');
        showPage('login');
        return;
    }

    const title = document.getElementById('upload-title').value;
    const game = document.getElementById('upload-game').value;
    const script_code = document.getElementById('upload-code').value;

    const { error } = await supabase
        .from('scripts')
        .insert([{ title, game, script_code, user_id: currentUser.id }]);

    if (error) {
        alert('Ошибка при загрузке: ' + error.message);
    } else {
        alert('Скрипт успешно добавлен!');
        showPage('home');
        loadScripts();
    }
}

async function loadStats() {
    const { count, error } = await supabase
        .from('scripts')
        .select('*', { count: 'exact', head: true });

    if (!error) {
        const statEl = document.getElementById('total-scripts-count');
        if (statEl) statEl.textContent = count;
    }
}

function escapeHtml(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}
