// Базовые демо-скрипты, если хранилище пустое
const defaultScripts = [
    {
        id: 1,
        title: "Blox Fruits Hub - Auto Farm, Katakuri & Bosses",
        game: "Blox Fruits",
        desc: "Best universal script for Blox Fruits featuring fast auto farm, Devil Fruit sniper, level max and raid features.",
        code: "loadstring(game:HttpGet('https://raw.githubusercontent.com/example/script.lua'))()",
        author: "VolkTeam",
        likes: 142,
        time: "2 hours ago",
        comments: [
            { user: "Player123", text: "Working great! Thanks for sharing." }
        ]
    },
    {
        id: 2,
        title: "Arsenal Aimbot & ESP Visuals",
        game: "Arsenal",
        desc: "Simple and clean ESP with silent aim and custom crosshair generator.",
        code: "loadstring(game:HttpGet('https://raw.githubusercontent.com/example/arsenal.lua'))()",
        author: "depso",
        likes: 89,
        time: "5 hours ago",
        comments: []
    }
];

// Загрузка скриптов из localStorage или установка дефолтных
function getScripts() {
    let stored = localStorage.getItem('volk_scripts');
    if (!stored) {
        localStorage.setItem('volk_scripts', JSON.stringify(defaultScripts));
        return defaultScripts;
    }
    return JSON.parse(stored);
}

function saveScripts(scripts) {
    localStorage.setItem('volk_scripts', JSON.stringify(scripts));
}

// Управление вкладками
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.getElementById(tabId + '-tab').classList.add('active');
    window.scrollTo(0, 0);
    if (tabId === 'home') renderScripts();
    if (tabId === 'trending') renderTrending();
}

// Рендер каталога скриптов
function renderScripts(filterText = '') {
    let scripts = getScripts();
    let container = document.getElementById('scriptsContainer');
    container.innerHTML = '';

    let filtered = scripts.filter(s => 
        s.title.toLowerCase().includes(filterText.toLowerCase()) || 
        s.game.toLowerCase().includes(filterText.toLowerCase())
    );

    if (filtered.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); text-align: center;">No scripts found.</p>';
        return;
    }

    filtered.forEach(script => {
        let card = document.createElement('div');
        card.className = 'script-card';
        card.onclick = () => viewScriptDetail(script.id);
        card.innerHTML = `
            <div class="script-header-info">
                <div>
                    <div class="game-name"><i class="fa-solid fa-gamepad"></i> ${script.game}</div>
                    <h3>${script.title}</h3>
                </div>
            </div>
            <p style="color: var(--text-muted); font-size: 13px; margin: 6px 0;">${script.desc.substring(0, 80)}...</p>
            <div class="script-meta">
                <span><i class="fa-solid fa-user"></i> ${script.author}</span>
                <span><i class="fa-solid fa-heart" style="color: #ef4444;"></i> ${script.likes}</span>
                <span><i class="fa-solid fa-clock"></i> ${script.time}</span>
            </div>
        `;
        container.appendChild(card);
    });
}

function renderTrending() {
    let scripts = getScripts();
    let container = document.getElementById('trendingContainer');
    container.innerHTML = '';
    
    // Сортируем по лайкам
    let sorted = [...scripts].sort((a, b) => b.likes - a.likes);

    sorted.forEach(script => {
        let card = document.createElement('div');
        card.className = 'script-card';
        card.onclick = () => viewScriptDetail(script.id);
        card.innerHTML = `
            <div class="game-name"><i class="fa-solid fa-fire" style="color: #f97316;"></i> ${script.game}</div>
            <h3>${script.title}</h3>
            <div class="script-meta">
                <span><i class="fa-solid fa-user"></i> ${script.author}</span>
                <span><i class="fa-solid fa-heart" style="color: #ef4444;"></i> ${script.likes}</span>
            </div>
        `;
        container.appendChild(card);
    });
}

// Поиск
function searchScripts() {
    let query = document.getElementById('searchInput').value;
    renderScripts(query);
}

document.getElementById('searchInput').addEventListener('input', (e) => {
    renderScripts(e.target.value);
});

// Загрузка нового скрипта
function handleUpload(event) {
    event.preventDefault();
    let title = document.getElementById('scriptTitle').value;
    let game = document.getElementById('scriptGame').value;
    let desc = document.getElementById('scriptDesc').value;
    let code = document.getElementById('scriptCode').value;

    let scripts = getScripts();
    let newScript = {
        id: Date.now(),
        title,
        game,
        desc,
        code,
        author: "VolkUser",
        likes: 0,
        time: "Just now",
        comments: []
    };

    scripts.unshift(newScript);
    saveScripts(scripts);

    alert('Script published successfully!');
    document.getElementById('uploadForm').reset();
    switchTab('home');
}

// Просмотр отдельного скрипта, лайки и комментарии
function viewScriptDetail(id) {
    let scripts = getScripts();
    let script = scripts.find(s => s.id === id);
    if (!script) return;

    switchTab('detail');
    let container = document.getElementById('scriptDetailContent');

    let commentsHtml = script.comments.map(c => `
        <div style="background: var(--bg-input); padding: 8px 12px; border-radius: 6px; margin-top: 8px; font-size: 13px;">
            <strong>${c.user}:</strong> ${c.text}
        </div>
    `).join('') || '<p style="color: var(--text-muted); font-size: 13px;">No comments yet.</p>';

    container.innerHTML = `
        <div class="script-detail-box">
            <span style="color: var(--accent); font-size: 14px;"><i class="fa-solid fa-gamepad"></i> ${script.game}</span>
            <h2>${script.title}</h2>
            <p style="color: var(--text-muted); font-size: 13px;">Uploaded by <strong>${script.author}</strong> • ${script.time}</p>
            
            <p style="margin: 15px 0;">${script.desc}</p>
            
            <div class="action-buttons">
                <button class="action-btn primary" onclick="navigator.clipboard.writeText(\`${script.code}\`); alert('Script copied to clipboard!');">
                    <i class="fa-solid fa-copy"></i> Copy Script
                </button>
                <button class="action-btn" onclick="likeScript(${script.id})">
                    <i class="fa-solid fa-heart" style="color: #ef4444;"></i> Like (${script.likes})
                </button>
            </div>

            <div class="code-block">${script.code}</div>

            <div class="comments-section">
                <h3>Comments (${script.comments.length})</h3>
                <div id="commentsList">${commentsHtml}</div>
                <div class="comment-input-box">
                    <input type="text" id="commentInput" placeholder="Write a comment...">
                    <button class="search-submit" onclick="addComment(${script.id})">Send</button>
                </div>
            </div>
        </div>
    `;
}

function likeScript(id) {
    let scripts = getScripts();
    let script = scripts.find(s => s.id === id);
    if (script) {
        script.likes++;
        saveScripts(scripts);
        viewScriptDetail(id);
    }
}

function addComment(id) {
    let input = document.getElementById('commentInput');
    let text = input.value.trim();
    if (!text) return;

    let scripts = getScripts();
    let script = scripts.find(s => s.id === id);
    if (script) {
        script.comments.push({ user: "VolkUser", text: text });
        saveScripts(scripts);
        viewScriptDetail(id);
    }
}

// Боковое меню (Sidebar) логика
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');

document.getElementById('menuBtn').onclick = () => {
    sidebar.classList.add('open');
    overlay.classList.add('active');
};

function closeMenu() {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
}

document.getElementById('closeMenuBtn').onclick = closeMenu;
overlay.onclick = closeMenu;

// Инициализация при загрузке
renderScripts();
    