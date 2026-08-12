/* =========================================================
   VOLK HUB - SCRIPT REPOSITORY (PART 1)
   ========================================================= */

// Available roles: 'guest', 'user', 'verified', 'admin', 'developer'
let currentUser = JSON.parse(localStorage.getItem('volk_current_user')) || {
    role: 'guest',
    username: 'Guest'
};

// Banned accounts list
let bannedUsers = JSON.parse(localStorage.getItem('volk_banned_users')) || [];

// Moderators list
let moderatorsList = JSON.parse(localStorage.getItem('volk_moderators')) || ['admin_demo'];

// Liked scripts tracking (Strictly 1 like per device)
let userLikedScripts = JSON.parse(localStorage.getItem('volk_liked_scripts')) || [];

// Spam reports
let spamReports = JSON.parse(localStorage.getItem('volk_spam_reports')) || [];

// Timestamp of the last uploaded script
let lastUploadTime = localStorage.getItem('volk_last_upload_time') || 0;

// Default scripts
const defaultScripts = [
    {
        id: 101,
        title: "Blox Fruits Hub - Auto Farm, Katakuri & Bosses",
        game: "Blox Fruits",
        desc: "Universal script for Blox Fruits with Fast Auto Farm, Devil Fruit Sniper, and Raid Features.",
        code: "loadstring(game:HttpGet('https://raw.githubusercontent.com/example/script.lua'))()",
        author: "volkTeam",
        authorRole: "developer",
        likes: 142,
        time: "2 hours ago",
        comments: [
            { user: "Player123", role: "user", text: "Awesome script, everything works!" },
            { user: "volkTeam", role: "developer", text: "Thanks! Auto farm update coming soon." }
        ]
    },
    {
        id: 102,
        title: "Arsenal Aimbot & ESP Visuals",
        game: "Arsenal",
        desc: "Clean ESP, Silent Aim, and customizable crosshairs.",
        code: "loadstring(game:HttpGet('https://raw.githubusercontent.com/example/arsenal.lua'))()",
        author: "depso",
        authorRole: "verified",
        likes: 89,
        time: "5 hours ago",
        comments: []
    }
];

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

/* ---------------------------------------------------------
   AUTHENTICATION & USER SYSTEM
   --------------------------------------------------------- */
function updateUIForRole() {
    const badge = document.getElementById('userBadge');
    const authBtn = document.getElementById('authActionBtn');
    const adminBtn = document.getElementById('adminPanelBtn');

    if (bannedUsers.includes(currentUser.username.toLowerCase())) {
        alert("Your account has been banned for violating rules!");
        logout();
        return;
    }

    if (currentUser.role === 'guest') {
        badge.innerText = 'Guest';
        badge.style.borderColor = 'var(--border-color)';
        authBtn.innerText = 'Login';
        adminBtn.style.display = 'none';
    } else {
        authBtn.innerText = 'Logout';
        if (currentUser.role === 'developer') {
            badge.innerHTML = `<span class="badge-dev">${currentUser.username} *DEVELOPER*</span>`;
            adminBtn.style.display = 'block';
        } else if (currentUser.role === 'admin') {
            badge.innerHTML = `<span class="badge-admin">${currentUser.username} *ADMIN*</span>`;
            adminBtn.style.display = 'block';
        } else if (currentUser.role === 'verified') {
            badge.innerHTML = `${currentUser.username} <span class="badge-verified">✔️</span>`;
            adminBtn.style.display = 'none';
        } else {
            badge.innerText = currentUser.username;
            adminBtn.style.display = 'none';
        }
    }

    checkUploadRestrictions();
}

function openAuthModal() {
    if (currentUser.role !== 'guest') {
        logout();
        return;
    }
    document.getElementById('authModal').classList.add('active');
}

function closeAuthModal() {
    document.getElementById('authModal').classList.remove('active');
}

function performAuth() {
    const user = document.getElementById('authUsername').value.trim();
    const pass = document.getElementById('authPassword').value.trim();

    if (!user) {
        alert("Please enter a username!");
        return;
    }

    if (bannedUsers.includes(user.toLowerCase())) {
        alert("This account is permanently banned!");
        return;
    }

    // Developer Account Login Check
    if (user === 'volkTeam' && pass === 'volkyvolkvolkovvolkovolkvolkfolkoplauolovolk') {
        currentUser = { username: 'volkTeam', role: 'developer' };
        alert("Welcome back, Developer volkTeam!");
    } else if (moderatorsList.includes(user.toLowerCase())) {
        currentUser = { username: user, role: 'admin' };
        alert(`Logged in as Moderator ${user}!`);
    } else if (user.toLowerCase().includes('check') || user.toLowerCase().includes('verif')) {
        currentUser = { username: user, role: 'verified' };
        alert(`Logged in (Verified Account ✔️)!`);
    } else {
        currentUser = { username: user, role: 'user' };
        alert(`Logged in successfully!`);
    }

    localStorage.setItem('volk_current_user', JSON.stringify(currentUser));
    closeAuthModal();
    updateUIForRole();
    renderScripts();
}

function logout() {
    currentUser = { role: 'guest', username: 'Guest' };
    localStorage.setItem('volk_current_user', JSON.stringify(currentUser));
    updateUIForRole();
    renderScripts();
}

/* ---------------------------------------------------------
   UPLOAD LIMITS & RESTRICTIONS
   --------------------------------------------------------- */
function checkUploadRestrictions() {
    const notice = document.getElementById('uploadRestrictionNotice');
    const submitBtn = document.getElementById('submitScriptBtn');
    const now = Date.now();

    if (currentUser.role === 'guest') {
        notice.style.display = 'block';
        notice.innerText = "Guests cannot upload scripts. Please login!";
        submitBtn.disabled = true;
        return;
    }

    const elapsedMs = now - parseInt(lastUploadTime);
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    const oneDayMs = 24 * 60 * 60 * 1000;

    if (currentUser.role === 'user' && elapsedMs < oneWeekMs) {
        const daysLeft = Math.ceil((oneWeekMs - elapsedMs) / (1000 * 60 * 60 * 24));
        notice.style.display = 'block';
        notice.innerText = `Limit: Regular users can post 1 script per week. Please wait ${daysLeft} days.`;
        submitBtn.disabled = true;
        return;
    }

    if (currentUser.role === 'verified' && elapsedMs < oneDayMs) {
        const hoursLeft = Math.ceil((oneDayMs - elapsedMs) / (1000 * 60 * 60));
        notice.style.display = 'block';
        notice.innerText = `Limit: Verified users ✔️ can post 1 script per day. Please wait ${hoursLeft} hours.`;
        submitBtn.disabled = true;
        return;
    }

    notice.style.display = 'none';
    submitBtn.disabled = false;
}

/* ---------------------------------------------------------
   SCRIPT UPLOAD
   --------------------------------------------------------- */
function handleUpload(event) {
    event.preventDefault();

    if (currentUser.role === 'guest') {
        alert("Guests cannot upload scripts!");
        return;
    }

    let title = document.getElementById('scriptTitle').value.trim();
    let game = document.getElementById('scriptGame').value.trim();
    let desc = document.getElementById('scriptDesc').value.trim();
    let code = document.getElementById('scriptCode').value.trim();

    let scripts = getScripts();
    let newScript = {
        id: Date.now(),
        title,
        game,
        desc,
        code,
        author: currentUser.username,
        authorRole: currentUser.role,
        likes: 0,
        time: "Just now",
        comments: []
    };

    scripts.unshift(newScript);
    saveScripts(scripts);

    lastUploadTime = Date.now();
    localStorage.setItem('volk_last_upload_time', lastUploadTime);

    alert('Script published successfully!');
    document.getElementById('uploadForm').reset();
    switchTab('home');
}

/* ---------------------------------------------------------
   LIKE LOGIC (Strictly 1 like per script)
   --------------------------------------------------------- */
function likeScript(id) {
    if (userLikedScripts.includes(id)) {
        alert("You have already liked this script!");
        return;
    }

    let scripts = getScripts();
    let script = scripts.find(s => s.id === id);
    if (script) {
        script.likes++;
        userLikedScripts.push(id);
        localStorage.setItem('volk_liked_scripts', JSON.stringify(userLikedScripts));
        saveScripts(scripts);
        viewScriptDetail(id);
    }
}

/* ---------------------------------------------------------
   COMMENTS & SPAM REPORTS
   --------------------------------------------------------- */
function addComment(scriptId) {
    if (currentUser.role === 'guest') {
        alert("Guests cannot leave comments!");
        return;
    }

    let input = document.getElementById('commentInput');
    let text = input.value.trim();
    if (!text) return;

    let scripts = getScripts();
    let script = scripts.find(s => s.id === scriptId);
    if (script) {
        script.comments.push({
            user: currentUser.username,
            role: currentUser.role,
            text: text,
            time: "Just now"
        });
        saveScripts(scripts);
        viewScriptDetail(scriptId);
    }
}

function reportSpam(targetType, targetId, authorName) {
    spamReports.push({
        id: Date.now(),
        type: targetType,
        targetId: targetId,
        author: authorName,
        reporter: currentUser.username
    });
    localStorage.setItem('volk_spam_reports', JSON.stringify(spamReports));
    alert("Spam report submitted to moderators!");
}
/* =========================================================
   VOLK HUB - SCRIPT REPOSITORY (PART 2)
   ========================================================= */

/* ---------------------------------------------------------
   ADMIN & DEVELOPER ACTIONS (MODER / DEVELOPER)
   --------------------------------------------------------- */
function openAdminModal() {
    if (currentUser.role !== 'admin' && currentUser.role !== 'developer') return;

    document.getElementById('adminModal').classList.add('active');
    
    // Developer-only section
    const devSec = document.getElementById('devOnlySection');
    if (currentUser.role === 'developer') {
        devSec.style.display = 'block';
    } else {
        devSec.style.display = 'none';
    }

    renderReports();
}

function closeAdminModal() {
    document.getElementById('adminModal').classList.remove('active');
}

// Delete script (Admin & Dev)
function adminDeleteScript(id) {
    if (currentUser.role !== 'admin' && currentUser.role !== 'developer') return;
    
    if (confirm("Are you sure you want to delete this script?")) {
        let scripts = getScripts().filter(s => s.id !== id);
        saveScripts(scripts);
        alert("Script deleted!");
        switchTab('home');
    }
}

// Ban user permanently
function adminBanUser(targetUser = null) {
    if (currentUser.role !== 'admin' && currentUser.role !== 'developer') return;

    let userToBan = targetUser || document.getElementById('targetBanUsername').value.trim();
    if (!userToBan) return;

    if (!bannedUsers.includes(userToBan.toLowerCase())) {
        bannedUsers.push(userToBan.toLowerCase());
        localStorage.setItem('volk_banned_users', JSON.stringify(bannedUsers));
        alert(`User ${userToBan} has been permanently banned!`);
    } else {
        alert("User is already banned!");
    }
}

// Developer (volkTeam) Functions - Manage Admins/Mods
function devAssignModerator() {
    if (currentUser.role !== 'developer') return;
    let username = document.getElementById('targetModUsername').value.trim().toLowerCase();
    if (username && !moderatorsList.includes(username)) {
        moderatorsList.push(username);
        localStorage.setItem('volk_moderators', JSON.stringify(moderatorsList));
        alert(`User ${username} granted MODER / ADMIN rights!`);
    }
}

function devRemoveModerator() {
    if (currentUser.role !== 'developer') return;
    let username = document.getElementById('targetModUsername').value.trim().toLowerCase();
    moderatorsList = moderatorsList.filter(m => m !== username);
    localStorage.setItem('volk_moderators', JSON.stringify(moderatorsList));
    alert(`MODER rights revoked for user ${username}!`);
}

function renderReports() {
    const container = document.getElementById('reportsContainer');
    if (spamReports.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted); font-size:13px;">No active spam reports.</p>';
        return;
    }

    container.innerHTML = spamReports.map(rep => `
        <div class="comment-card" style="margin-bottom:6px;">
            <div>
                <strong>Report by ${rep.reporter}:</strong> Spam from <b>${rep.author}</b>
            </div>
            <div>
                <button class="action-btn danger" onclick="adminBanUser('${rep.author}')">Ban User</button>
            </div>
        </div>
    `).join('');
}

/* ---------------------------------------------------------
   RENDER SCRIPTS & DETAILS
   --------------------------------------------------------- */
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
        
        // Author badges
        let authorBadge = script.author;
        if (script.authorRole === 'developer') authorBadge = `<span class="badge-dev">${script.author} *DEVELOPER*</span>`;
        else if (script.authorRole === 'admin') authorBadge = `<span class="badge-admin">${script.author} *ADMIN*</span>`;
        else if (script.authorRole === 'verified') authorBadge = `${script.author} <span class="badge-verified">✔️</span>`;

        card.innerHTML = `
            <div class="game-name"><i class="fa-solid fa-gamepad"></i> ${script.game}</div>
            <h3>${script.title}</h3>
            <p style="color: var(--text-muted); font-size: 13px; margin: 6px 0;">${script.desc.substring(0, 90)}...</p>
            <div class="script-meta">
                <span><i class="fa-solid fa-user"></i> ${authorBadge}</span>
                <span><i class="fa-solid fa-heart" style="color: #ef4444;"></i> ${script.likes}</span>
                <span><i class="fa-solid fa-clock"></i> ${script.time}</span>
            </div>
        `;
        container.appendChild(card);
    });
}

function viewScriptDetail(id) {
    let scripts = getScripts();
    let script = scripts.find(s => s.id === id);
    if (!script) return;

    switchTab('detail');
    let container = document.getElementById('scriptDetailContent');

    // Comments with roles
    let commentsHtml = script.comments.map(c => {
        let userDisplay = c.user;
        if (c.role === 'developer') userDisplay = `<span class="badge-dev">${c.user} *DEVELOPER*</span>`;
        else if (c.role === 'admin') userDisplay = `<span class="badge-admin">${c.user} *ADMIN*</span>`;
        else if (c.role === 'verified') userDisplay = `${c.user} <span class="badge-verified">✔️</span>`;

        return `
            <div class="comment-card">
                <div>
                    <strong>${userDisplay}:</strong> ${c.text}
                </div>
                <span class="report-btn" onclick="reportSpam('comment', ${script.id}, '${c.user}')" title="Report Spam">
                    <i class="fa-solid fa-flag"></i> Report
                </span>
            </div>
        `;
    }).join('') || '<p style="color: var(--text-muted); font-size: 13px;">No comments yet.</p>';

    let isLiked = userLikedScripts.includes(script.id);
    let isAdminOrDev = (currentUser.role === 'admin' || currentUser.role === 'developer');

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
                <button class="action-btn" onclick="likeScript(${script.id})" ${isLiked ? 'style="opacity:0.6;"' : ''}>
                    <i class="fa-solid fa-heart" style="color: #ef4444;"></i> ${isLiked ? 'Liked' : 'Like'} (${script.likes})
                </button>
                <button class="action-btn" onclick="reportSpam('script', ${script.id}, '${script.author}')">
                    <i class="fa-solid fa-flag" style="color:var(--danger);"></i> Report Spam
                </button>
                ${isAdminOrDev ? `
                    <button class="action-btn danger" onclick="adminDeleteScript(${script.id})">
                        <i class="fa-solid fa-trash"></i> Delete (MODER)
                    </button>
                ` : ''}
            </div>

            <div class="code-block">${script.code}</div>

            <div class="comments-section">
                <h3>Comments (${script.comments.length})</h3>
                <div id="commentsList">${commentsHtml}</div>
                
                ${currentUser.role !== 'guest' ? `
                    <div class="comment-input-box">
                        <input type="text" id="commentInput" placeholder="Write a comment...">
                        <button class="search-submit" onclick="addComment(${script.id})">Send</button>
                    </div>
                ` : `
                    <p style="color:var(--text-muted); font-size:12px; margin-top:10px;">Please login to write comments.</p>
                `}
            </div>
        </div>
    `;
}

function renderTrending() {
    let scripts = getScripts();
    let container = document.getElementById('trendingContainer');
    container.innerHTML = '';
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

/* ---------------------------------------------------------
   TAB & SIDEBAR NAVIGATION
   --------------------------------------------------------- */
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.getElementById(tabId + '-tab').classList.add('active');
    window.scrollTo(0, 0);
    if (tabId === 'home') renderScripts();
    if (tabId === 'trending') renderTrending();
    if (tabId === 'upload') checkUploadRestrictions();
}

function searchScripts() {
    let query = document.getElementById('searchInput').value;
    renderScripts(query);
}

document.getElementById('searchInput').addEventListener('input', (e) => {
    renderScripts(e.target.value);
});

// Sidebar menu control
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

// Initialization
updateUIForRole();
renderScripts();
