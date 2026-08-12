/* =========================================================
   VOLK HUB - SCRIPT REPOSITORY (English Version) - PART 1
   ========================================================= */

// Current User State
let currentUser = JSON.parse(localStorage.getItem('volk_current_user')) || {
    role: 'guest',
    username: 'Guest'
};

// Banned Users list
let bannedUsers = JSON.parse(localStorage.getItem('volk_banned_users')) || [];

// Moderators/Admins List
let moderatorsList = JSON.parse(localStorage.getItem('volk_moderators')) || ['admin_demo'];

// Liked Scripts
let userLikedScripts = JSON.parse(localStorage.getItem('volk_liked_scripts')) || [];

// Support Tickets & Spam Reports
let supportTickets = JSON.parse(localStorage.getItem('volk_support_tickets')) || [];

// Cooldown tracker
let lastUploadTime = localStorage.getItem('volk_last_upload_time') || 0;

// Default Scripts Database
const defaultScripts = [
    {
        id: 101,
        title: "Blox Fruits Hub - Auto Farm, Katakuri & Bosses",
        game: "Blox Fruits",
        desc: "Universal Blox Fruits script featuring fast autofarm, fruit sniper, and auto raids.",
        code: "loadstring(game:HttpGet('https://raw.githubusercontent.com/example/script.lua'))()",
        author: "volkTeam",
        authorRole: "developer",
        likes: 142,
        time: "2 hours ago",
        isFrozen: false, // Security check flag
        comments: [
            { user: "Player123", role: "user", text: "Great script, works smoothly!" },
            { user: "volkTeam", role: "developer", text: "Thanks! Auto-farm update coming soon." }
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
        isFrozen: false,
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
   USER AUTHENTICATION & ROLES
   --------------------------------------------------------- */
function updateUIForRole() {
    const badge = document.getElementById('userBadge');
    const authBtn = document.getElementById('authActionBtn');
    const adminBtn = document.getElementById('adminPanelBtn');

    if (!badge || !authBtn || !adminBtn) return;

    if (bannedUsers.includes(currentUser.username.toLowerCase())) {
        alert("Your account has been permanently banned!");
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

    if (user === 'volkTeam' && pass === 'volkyvolkvolkovvolkovolkvolkfolkoplauolovolk') {
        currentUser = { username: 'volkTeam', role: 'developer' };
        alert("Welcome Developer volkTeam!");
    } else if (moderatorsList.includes(user.toLowerCase())) {
        currentUser = { username: user, role: 'admin' };
        alert(`Logged in as Admin (${user})!`);
    } else if (user.toLowerCase().includes('check') || user.toLowerCase().includes('verif')) {
        currentUser = { username: user, role: 'verified' };
        alert(`Logged in as Verified User ✔️`);
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
   UPLOAD COOLDOWNS
   --------------------------------------------------------- */
function checkUploadRestrictions() {
    const notice = document.getElementById('uploadRestrictionNotice');
    const submitBtn = document.getElementById('submitScriptBtn');
    if (!notice || !submitBtn) return;

    const now = Date.now();

    if (currentUser.role === 'guest') {
        notice.style.display = 'block';
        notice.innerText = "Guests cannot upload scripts. Please login first!";
        submitBtn.disabled = true;
        return;
    }

    const elapsedMs = now - parseInt(lastUploadTime);
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    const oneDayMs = 24 * 60 * 60 * 1000;

    if (currentUser.role === 'user' && elapsedMs < oneWeekMs) {
        const daysLeft = Math.ceil((oneWeekMs - elapsedMs) / (1000 * 60 * 60 * 24));
        notice.style.display = 'block';
        notice.innerText = `Cooldown: Regular users can post 1 script per week. Wait ${daysLeft} day(s).`;
        submitBtn.disabled = true;
        return;
    }

    if (currentUser.role === 'verified' && elapsedMs < oneDayMs) {
        const hoursLeft = Math.ceil((oneDayMs - elapsedMs) / (1000 * 60 * 60));
        notice.style.display = 'block';
        notice.innerText = `Cooldown: Verified users can post 1 script per day. Wait ${hoursLeft} hour(s).`;
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
        isFrozen: false,
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
   VOLK SUPPORT SYSTEM
   --------------------------------------------------------- */
function handleSupportSubmit(e) {
    e.preventDefault();

    let category = document.getElementById('supportCategory').value;
    let target = document.getElementById('supportTarget').value.trim();
    let message = document.getElementById('supportMessage').value.trim();

    let newTicket = {
        id: Date.now(),
        category,
        target,
        message,
        sender: currentUser.username,
        date: new Date().toLocaleString()
    };

    supportTickets.push(newTicket);
    localStorage.setItem('volk_support_tickets', JSON.stringify(supportTickets));

    alert("Ticket submitted! Moderation team will inspect the issue.");
    document.getElementById('supportForm').reset();
    switchTab('home');
}

/* ---------------------------------------------------------
   LIKES & COMMENTS
   --------------------------------------------------------- */
function likeScript(id) {
    if (userLikedScripts.includes(id)) {
        alert("You already liked this script!");
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
/* =========================================================
   VOLK HUB - SCRIPT REPOSITORY (English Version) - PART 2
   ========================================================= */

/* ---------------------------------------------------------
   MODERATION & DEVELOPER CONTROLS
   --------------------------------------------------------- */
function openAdminModal() {
    if (currentUser.role !== 'admin' && currentUser.role !== 'developer') return;

    document.getElementById('adminModal').classList.add('active');
    
    const devSec = document.getElementById('devOnlySection');
    if (currentUser.role === 'developer') {
        devSec.style.display = 'block';
        renderAdminList();
    } else {
        devSec.style.display = 'none';
    }

    renderSupportTickets();
}

function closeAdminModal() {
    document.getElementById('adminModal').classList.remove('active');
}

// Dev Admin Management
function renderAdminList() {
    const container = document.getElementById('adminListContainer');
    const countText = document.getElementById('adminCountText');
    if (!container || !countText) return;

    countText.innerText = moderatorsList.length;

    if (moderatorsList.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted); font-size:12px;">No active admins.</p>';
        return;
    }

    container.innerHTML = moderatorsList.map(mod => `
        <div class="admin-chip">
            <i class="fa-solid fa-user-shield"></i> ${mod}
            <span class="remove-mod-btn" onclick="devRemoveModeratorDirect('${mod}')" title="Revoke Admin">&times;</span>
        </div>
    `).join('');
}

function devAssignModerator() {
    if (currentUser.role !== 'developer') return;
    let username = document.getElementById('targetModUsername').value.trim().toLowerCase();
    if (username && !moderatorsList.includes(username)) {
        moderatorsList.push(username);
        localStorage.setItem('volk_moderators', JSON.stringify(moderatorsList));
        alert(`Admin status granted to ${username}!`);
        renderAdminList();
    }
}

function devRemoveModerator() {
    if (currentUser.role !== 'developer') return;
    let username = document.getElementById('targetModUsername').value.trim().toLowerCase();
    devRemoveModeratorDirect(username);
}

function devRemoveModeratorDirect(username) {
    if (currentUser.role !== 'developer') return;
    moderatorsList = moderatorsList.filter(m => m !== username);
    localStorage.setItem('volk_moderators', JSON.stringify(moderatorsList));
    alert(`Admin status revoked from ${username}!`);
    renderAdminList();
}

// Ban Script
function adminDeleteScript(id) {
    if (currentUser.role !== 'admin' && currentUser.role !== 'developer') return;
    
    if (confirm("Ban and delete this script from Volk Hub?")) {
        let scripts = getScripts().filter(s => s.id !== id);
        saveScripts(scripts);
        alert("Script banned and removed!");
        switchTab('home');
    }
}

// Freeze Script for Malware/RAT inspection
function adminToggleFreezeScript(id) {
    if (currentUser.role !== 'admin' && currentUser.role !== 'developer') return;

    let scripts = getScripts();
    let script = scripts.find(s => s.id === id);
    if (script) {
        script.isFrozen = !script.isFrozen;
        saveScripts(scripts);
        alert(script.isFrozen ? "Script FROZEN for security inspection!" : "Script UNFREEZED and restored!");
        viewScriptDetail(id);
    }
}

// Ban User Account
function adminBanUser(targetUser = null) {
    if (currentUser.role !== 'admin' && currentUser.role !== 'developer') return;

    let userToBan = targetUser || document.getElementById('targetBanUsername').value.trim();
    if (!userToBan) return;

    if (!bannedUsers.includes(userToBan.toLowerCase())) {
        bannedUsers.push(userToBan.toLowerCase());
        localStorage.setItem('volk_banned_users', JSON.stringify(bannedUsers));
        alert(`User ${userToBan} permanently banned!`);
    } else {
        alert("User is already banned!");
    }
}

function renderSupportTickets() {
    const container = document.getElementById('reportsContainer');
    if (!container) return;

    if (supportTickets.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted); font-size:13px;">No tickets currently open.</p>';
        return;
    }

    container.innerHTML = supportTickets.map(t => `
        <div class="comment-card" style="margin-bottom:8px; display:block;">
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                <span style="color:var(--accent); font-weight:bold;">[${t.category}] From: ${t.sender}</span>
                <span style="font-size:11px; color:var(--text-muted);">${t.date}</span>
            </div>
            <p style="font-size:13px; margin:4px 0;"><strong>Target:</strong> ${t.target || 'None'}</p>
            <p style="font-size:13px;">${t.message}</p>
            <div style="margin-top:6px; display:flex; gap:6px;">
                <button class="action-btn danger" style="padding:2px 8px; font-size:11px;" onclick="adminBanUser('${t.sender}')">Ban User</button>
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
    if (!container) return;
    
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
        
        let authorBadge = script.author;
        if (script.authorRole === 'developer') authorBadge = `<span class="badge-dev">${script.author} *DEVELOPER*</span>`;
        else if (script.authorRole === 'admin') authorBadge = `<span class="badge-admin">${script.author} *ADMIN*</span>`;
        else if (script.authorRole === 'verified') authorBadge = `${script.author} <span class="badge-verified">✔️</span>`;

        let freezeBanner = script.isFrozen ? `<div class="frozen-badge"><i class="fa-solid fa-snowflake"></i> UNDER SECURITY CHECK</div>` : '';

        card.innerHTML = `
            ${freezeBanner}
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

    let isAdminOrDev = (currentUser.role === 'admin' || currentUser.role === 'developer');

    let codeBlockHtml = '';
    if (script.isFrozen && !isAdminOrDev) {
        codeBlockHtml = `
            <div class="frozen-box">
                <i class="fa-solid fa-triangle-exclamation" style="font-size:24px; color:var(--gold);"></i>
                <h4>Script Frozen by Volk Moderation</h4>
                <p>This script is locked while being checked for RATs, viruses, or illegal code. Copying is disabled.</p>
            </div>
        `;
    } else {
        codeBlockHtml = `<div class="code-block">${script.code}</div>`;
    }

    let commentsHtml = script.comments.map(c => {
        let userDisplay = c.user;
        if (c.role === 'developer') userDisplay = `<span class="badge-dev">${c.user} *DEVELOPER*</span>`;
        else if (c.role === 'admin') userDisplay = `<span class="badge-admin">${c.user} *ADMIN*</span>`;
        else if (c.role === 'verified') userDisplay = `${c.user} <span class="badge-verified">✔️</span>`;

        return `
            <div class="comment-card">
                <div><strong>${userDisplay}:</strong> ${c.text}</div>
            </div>
        `;
    }).join('') || '<p style="color: var(--text-muted); font-size: 13px;">No comments yet.</p>';

    let isLiked = userLikedScripts.includes(script.id);

    container.innerHTML = `
        <div class="script-detail-box">
            <span style="color: var(--accent); font-size: 14px;"><i class="fa-solid fa-gamepad"></i> ${script.game}</span>
            <h2>${script.title}</h2>
            <p style="color: var(--text-muted); font-size: 13px;">Author: <strong>${script.author}</strong> • ${script.time}</p>
            
            <p style="margin: 15px 0;">${script.desc}</p>
            
            ${codeBlockHtml}

            <div class="action-buttons" style="margin-top: 15px; display:flex; gap:10px; flex-wrap:wrap;">
                ${(!script.isFrozen || isAdminOrDev) ? `
                    <button class="action-btn primary" onclick="navigator.clipboard.writeText(\`${script.code}\`); alert('Script copied to clipboard!');">
                        <i class="fa-solid fa-copy"></i> Copy Script
                    </button>
                ` : ''}
                <button class="action-btn ${isLiked ? 'disabled' : ''}" onclick="likeScript(${script.id})">
                    <i class="fa-solid fa-heart"></i> ${isLiked ? 'Liked' : 'Like'} (${script.likes})
                </button>
                ${isAdminOrDev ? `
                    <button class="action-btn danger" onclick="adminToggleFreezeScript(${script.id})">
                        <i class="fa-solid fa-snowflake"></i> ${script.isFrozen ? 'Unfreeze' : 'Freeze'}
                    </button>
                    <button class="action-btn danger" onclick="adminDeleteScript(${script.id})">
                        <i class="fa-solid fa-trash"></i> Delete
                    </button>
                ` : ''}
            </div>

            <hr style="border-color: var(--border-color); margin: 20px 0;">

            <h3>Comments</h3>
            <div class="add-comment-box" style="margin-bottom: 15px; display:flex; gap:8px;">
                <input type="text" id="commentInput" placeholder="Write a comment..." class="input-field" style="flex:1;">
                <button class="action-btn primary" onclick="addComment(${script.id})">Post</button>
            </div>
            <div class="comments-list">
                ${commentsHtml}
            </div>
        </div>
    `;
}

/* ---------------------------------------------------------
   NAVIGATION & UI CONTROLS
   --------------------------------------------------------- */
function switchTab(tabName) {
    const tabs = ['home', 'upload', 'support', 'detail'];
    tabs.forEach(t => {
        const el = document.getElementById(t + 'Tab');
        if (el) el.style.display = (t === tabName) ? 'block' : 'none';
    });
    if (tabName === 'home') renderScripts();
}

function searchScripts() {
    let query = document.getElementById('searchInput').value;
    renderScripts(query);
}

// App Initialization
document.addEventListener('DOMContentLoaded', () => {
    updateUIForRole();
    renderScripts();
});
