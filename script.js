// Ждём полной загрузки страницы и библиотеки Supabase
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

const SUPABASE_URL = 'https://yrclsymsijkfbjjqegun.supabase.co';
const SUPABASE_ANON_KEY = 'Sb_publishable_KhFdq-kEENQ4bB6D2H-O8A_C2L_eH8b';
const ADMIN_PASS = 'AbdOkRjclen484849TldbcnKsnfk';

let supabaseClient = null;
let currentUser = JSON.parse(localStorage.getItem('volk_user')) || null;
let userFavs = JSON.parse(localStorage.getItem('volk_favs')) || [];
let allScripts = [];
let currentFilter = 'all';

function initApp() {
  // Инициализация Supabase
  if (window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  // Настройка кнопки настроек (⚙️)
  const toggleBtn = document.getElementById('settingsToggleBtn');
  const menu = document.getElementById('dropdownMenu');

  if (toggleBtn && menu) {
    toggleBtn.onclick = (e) => {
      e.stopPropagation();
      menu.classList.toggle('show');
    };

    document.onclick = (e) => {
      if (!menu.contains(e.target) && e.target !== toggleBtn) {
        menu.classList.remove('show');
      }
    };
  }

  updateUI();
  loadScripts();
  loadStats();
}

function showPage(pageId) {
  document.querySelectorAll('.page-section').forEach(sec => sec.style.display = 'none');
  const target = document.getElementById(pageId);
  if (target) target.style.display = 'block';
  if (pageId === 'adminPanelPage') loadReports();
}

function goToMakeScript() {
  if (!currentUser) return alert('Сначала зарегистрируйтесь или войдите!');
  showPage('makeScriptPage');
}

async function loadStats() {
  if (supabaseClient) {
    const { data: users } = await supabaseClient.from('users').select('role');
    if (users) {
      const creatorsCount = users.filter(u => u.role !== 'admin').length;
      document.getElementById('creatorsCount').innerText = creatorsCount;
    }
  }
  document.getElementById('guestsCount').innerText = Math.floor(Math.random() * 6) + 1;
}

function toggleMusic() {
  const audio = document.getElementById('bgMusic');
  if (audio) {
    if (audio.paused) {
      audio.play().catch(() => alert('Нажмите на экран, чтобы разрешить музыку!'));
    } else {
      audio.pause();
    }
  }
}

async function registerUser() {
  const email = document.getElementById('userEmail').value.trim();
  const username = document.getElementById('userName').value.trim();
  const password = document.getElementById('userPass').value.trim();

  if (!email || !username || !password) return alert('Заполните все поля!');

  if (!supabaseClient) return alert('Ошибка подключения к базе данных!');

  const { data: existing } = await supabaseClient.from('users').select('*').eq('email', email).maybeSingle();
  if (existing && existing.is_banned) return alert('❌ Этот Email забанен!');

  if (existing) {
    currentUser = existing;
  } else {
    const { data: newUser, error } = await supabaseClient.from('users').insert([{
      email, username, password_hash: password, role: 'user', strikes: 0
    }]).select().single();
    if (error) return alert('Ошибка: ' + error.message);
    currentUser = newUser;
  }

  localStorage.setItem('volk_user', JSON.stringify(currentUser));
  updateUI();
  loadStats();
  alert('Успешный вход!');
}

function becomeAdmin() {
  const key = document.getElementById('adminKeyInput').value;
  if (key === ADMIN_PASS) {
    if (!currentUser) return alert('Сначала зарегистрируйтесь!');
    currentUser.role = 'admin';
    if (supabaseClient) {
      supabaseClient.from('users').update({ role: 'admin' }).eq('id', currentUser.id);
    }
    localStorage.setItem('volk_user', JSON.stringify(currentUser));
    updateUI();
    alert('👑 Вы получили права Админа!');
  } else {
    alert('❌ Неверный ключ!');
  }
}

function updateUI() {
  if (currentUser) {
    document.getElementById('authBlock').style.display = 'none';
    document.getElementById('userInfo').style.display = 'block';
    document.getElementById('currentUserText').innerText = currentUser.username;
    document.getElementById('currentRoleText').innerText = currentUser.role;
    document.getElementById('createScriptArea').style.display = 'block';
    if (currentUser.role === 'admin') {
      document.getElementById('adminPanelBtn').style.display = 'block';
    }
  }
}

async function publishScript() {
  if (!currentUser) return alert('Войдите в аккаунт!');

  const title = document.getElementById('scriptTitle').value.trim();
  const game = document.getElementById('scriptGame').value.trim();
  const code = document.getElementById('scriptCode').value.trim();
  const keyType = document.getElementById('scriptKeyType').value;
  const platform = document.getElementById('scriptPlatform').value;

  if (!title || !game || !code) return alert('Заполните все поля!');

  if (currentUser.role !== 'admin' && supabaseClient) {
    const { data: userScripts } = await supabaseClient
      .from('scripts')
      .select('created_at')
      .eq('author_username', currentUser.username)
      .order('created_at', { ascending: false })
      .limit(1);

    if (userScripts && userScripts.length > 0) {
      const diffDays = Math.floor((new Date() - new Date(userScripts[0].created_at)) / (1000 * 60 * 60 * 24));
      if (currentUser.role === 'verified' && diffDays < 7) {
        return alert(`⏳ Публикация 1 раз в неделю! Ждать еще ${7 - diffDays} дн.`);
      }
      if (currentUser.role === 'user' && diffDays < 30) {
        return alert(`⏳ Публикация 1 раз в месяц! Ждать еще ${30 - diffDays} дн.`);
      }
    }
  }

  if (supabaseClient) {
    const { error } = await supabaseClient.from('scripts').insert([{
      title, game_name: game, script_code: code,
      author_username: currentUser.username, author_role: currentUser.role,
      likes: 0, views_copies: 0, status: 'working',
      key_type: keyType, platform: platform
    }]);

    if (!error) {
      alert('✅ Скрипт опубликован!');
      showPage('mainPage');
      loadScripts();
    } else {
      alert('Ошибка публикации: ' + error.message);
    }
  }
}

async function loadScripts() {
  if (supabaseClient) {
    const { data: scripts } = await supabaseClient.from('scripts').select('*').order('created_at', { ascending: false });
    allScripts = scripts || [];
  }
  applyFilters();
}

function setFilter(type, btn) {
  currentFilter = type;
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  applyFilters();
}

function applyFilters() {
  const query = document.getElementById('searchInput').value.toLowerCase();
  let list = allScripts.filter(s => s.title.toLowerCase().includes(query) || s.game_name.toLowerCase().includes(query));

  if (currentFilter === 'popular') list.sort((a, b) => (b.likes || 0) - (a.likes || 0));
  if (currentFilter === 'keyless') list = list.filter(s => s.key_type === 'keyless');
  if (currentFilter === 'mobile') list = list.filter(s => s.platform === 'mobile' || s.platform === 'all');
  if (currentFilter === 'favs') list = list.filter(s => userFavs.includes(s.id));

  renderScripts(list);
}

function renderScripts(scripts) {
  const container = document.getElementById('scriptsContainer');
  if (!container) return;
  container.innerHTML = scripts.length === 0 ? '<p>Ничего не найдено.</p>' : '';

  scripts.forEach(s => {
    const isFav = userFavs.includes(s.id);
    const card = document.createElement('div');
    card.className = 'script-card';

    let badge = s.author_role === 'admin' ? '<span class="badge-admin">👑 ADMIN</span>' : (s.author_role === 'verified' ? '<span class="badge-verified">✅</span>' : '');

    card.innerHTML = `
      <div class="card-tags">
        <span class="tag ${s.status === 'patched' ? 'tag-patched' : 'tag-working'}">${s.status === 'patched' ? '❌ Patched' : '✅ Working'}</span>
        <span class="tag tag-key">${s.key_type === 'key' ? '🔑 Key Required' : '⚡ Keyless'}</span>
        <span class="tag tag-platform">📱 ${s.platform}</span>
      </div>

      <div class="title">${s.title}</div>
      <div class="game">🎮 ${s.game_name}</div>
      <div class="author-line">Автор: <b>${s.author_username}</b> ${badge}</div>
      <div class="stats-line"><span>👍 ${s.likes || 0}</span><span>📋 Скопировано: ${s.views_copies || 0}</span></div>
      
      <div class="card-actions">
        <button class="primary-btn" onclick="copyCode('${s.id}', '${encodeURIComponent(s.script_code)}')">📋 Скопировать</button>
        <button class="action-small-btn" onclick="likeScript('${s.id}')">👍</button>
        <button class="action-small-btn" onclick="toggleFav('${s.id}')">${isFav ? '⭐' : '☆'}</button>
        <button class="action-small-btn" onclick="reportScript('${s.id}')">🚩</button>
        ${getAdminButtons(s)}
      </div>

      <div style="margin-top:10px;">
        <input type="text" id="comm_in_${s.id}" placeholder="Коммент..." style="width:70%; margin:0;">
        <button class="primary-btn" style="width:28%;" onclick="addComment('${s.id}')">ОК</button>
        <div id="comms_${s.id}"></div>
      </div>
    `;
    container.appendChild(card);
    loadComments(s.id);
  });
}

function getAdminButtons(script) {
  if (!currentUser || currentUser.role !== 'admin') return '';
  const isVerified = script.author_role === 'verified';
  return `
    <button class="secondary-btn" onclick="toggleVerified('${script.author_username}', ${!isVerified})">${isVerified ? '❌ Галочка' : '✅ Галочка'}</button>
    <button class="secondary-btn" onclick="toggleStatus('${script.id}', '${script.status === 'working' ? 'patched' : 'working'}')">🔄 Статус</button>
    <button class="danger-btn" onclick="deleteScript('${script.id}')">🗑 Удалить</button>
  `;
}

async function copyCode(id, code) {
  navigator.clipboard.writeText(decodeURIComponent(code));
  alert('Код скопирован!');
  if (supabaseClient) {
    const { data } = await supabaseClient.from('scripts').select('views_copies').eq('id', id).single();
    if (data) await supabaseClient.from('scripts').update({ views_copies: (data.views_copies || 0) + 1 }).eq('id', id);
  }
}

async function likeScript(id) {
  if (supabaseClient) {
    const { data } = await supabaseClient.from('scripts').select('likes').eq('id', id).single();
    if (data) {
      await supabaseClient.from('scripts').update({ likes: (data.likes || 0) + 1 }).eq('id', id);
      loadScripts();
    }
  }
}

function toggleFav(id) {
  if (userFavs.includes(id)) userFavs = userFavs.filter(i => i !== id);
  else userFavs.push(id);
  localStorage.setItem('volk_favs', JSON.stringify(userFavs));
  applyFilters();
}

async function reportScript(id) {
  const reason = prompt('Укажите причину жалобы (скам, не работает, вирусы):');
  if (reason && supabaseClient) {
    await supabaseClient.from('reports').insert([{ script_id: id, reason }]);
    alert('🚩 Жалоба отправлена модераторам!');
  }
}

async function toggleStatus(id, newStatus) {
  if (supabaseClient) {
    await supabaseClient.from('scripts').update({ status: newStatus }).eq('id', id);
    loadScripts();
  }
}

async function toggleVerified(username, give) {
  const role = give ? 'verified' : 'user';
  if (supabaseClient) {
    await supabaseClient.from('users').update({ role }).eq('username', username);
    await supabaseClient.from('scripts').update({ author_role: role }).eq('author_username', username);
    loadScripts();
  }
}

async function deleteScript(id) {
  if (supabaseClient) {
    await supabaseClient.from('scripts').delete().eq('id', id);
    loadScripts();
  }
}

async function loadReports() {
  const container = document.getElementById('reportsContainer');
  if (!supabaseClient) return;
  const { data: reports } = await supabaseClient.from('reports').select('*');
  if (!reports || reports.length === 0) {
    container.innerHTML = '<p>Жалоб нет!</p>';
    return;
  }

  container.innerHTML = reports.map(r => `
    <div style="background:#0d1117; padding:10px; margin-bottom:8px; border-radius:6px;">
      <p><b>Скрипт ID:</b> ${r.script_id}</p>
      <p><b>Причина:</b> ${r.reason}</p>
      <button class="danger-btn" onclick="deleteScript('${r.script_id}')" style="margin-top:6px;">Удалить Скрипт</button>
    </div>
  `).join('');
}

async function addComment(scriptId) {
  if (!currentUser) return alert('Войдите!');
  const input = document.getElementById(`comm_in_${scriptId}`);
  if (!input || !input.value) return;

  if (supabaseClient) {
    await supabaseClient.from('comments').insert([{
      script_id: scriptId, author_username: currentUser.username,
      author_role: currentUser.role, text: input.value
    }]);
    input.value = '';
    loadComments(scriptId);
  }
}

async function loadComments(scriptId) {
  if (!supabaseClient) return;
  const { data: comms } = await supabaseClient.from('comments').select('*').eq('script_id', scriptId);
  const box = document.getElementById(`comms_${scriptId}`);
  if (!box) return;

  box.innerHTML = (comms || []).map(c => `
    <div class="comment"><b>${c.author_username}:</b> ${c.text}</div>
  `).join('');
}
