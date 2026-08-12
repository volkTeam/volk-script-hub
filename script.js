/* =========================================================
   VOLK HUB - SCRIPT REPOSITORY (PART 1)
   ========================================================= */

// Available Roles: 'guest', 'user', 'verified', 'admin', 'developer'
let currentUser = JSON.parse(localStorage.getItem('volk_current_user')) || {
    role: 'guest',
    username: 'Guest'
};

// Storage Arrays
let bannedUsers = JSON.parse(localStorage.getItem('volk_banned_users')) || [];
let moderatorsList = JSON.parse(localStorage.getItem('volk_moderators')) || ['admin_demo'];
let userLikedScripts = JSON.parse(localStorage.getItem('volk_liked_scripts')) || [];
let userDislikedScripts = JSON.parse(localStorage.getItem('volk_disliked_scripts')) || [];
let spamReports = JSON.parse(localStorage.getItem('volk_spam_reports')) || [];
let supportTickets = JSON.parse(localStorage.getItem('volk_support_tickets')) || [];
let lastUploadTime = localStorage.getItem('volk_last_upload_time') || 0;

// Default Script Library
const defaultScripts = [
    {
        id: 101,
        title: "Blox Fruits Hub - Auto Farm, Katakuri & Bosses",
        game: "Blox Fruits",
        desc: "Universal Blox Fruits script. Super fast auto farm, Fruit Sniper, auto raids and teleport.",
        code: "loadstring(game:HttpGet('https://raw.githubusercontent.com/example/script.lua'))()",
        author: "volkTeam",
        authorRole: "developer",
        likes: 142,
        dislikes: 3,
        isVerified: true,
        isTrojan: false,
        time: "2 hours ago",
        comments: [
            { user: "Player123", role: "user", text: "Awesome script, everything works!" },
            { user: "volkTeam", role: "developer", text: "Thanks for the feedback! Updating auto-farm soon." }
        ]
    },
    {
        id: 102,
        title: "Arsenal Aimbot & ESP Visuals",
        game: "Arsenal",
        desc: "Clean ESP, Silent Aim, FOV Circle and custom crosshair script.",
        code: "loadstring(game:HttpGet('https://raw.githubusercontent.com/example/arsenal.lua'))()",
        author: "depso",
        authorRole: "verified",
        likes: 89,
        dislikes: 5,
        isVerified: true,
        isTrojan: false,
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
   BOT VERIFICATION & PRELOADER
   --------------------------------------------------------- */
function passBotVerify() {
    const overlay = document.getElementById('botVerifyOverlay');
    overlay.style.opacity = '0';
    setTimeout(() => {
        overlay.style.display = 'none';
        sessionStorage.setItem('volk_bot_passed', 'true');
    }, 300);
}

// Check session verification status
if (sessionStorage.getItem('volk_bot_passed') === 'true') {
    const overlay = document.getElementById('botVerifyOverlay');
    if (overlay) overlay.style.display = 'none';
}

/* ---------------------------------------------------------
   AUTHORIZATION & ROLES
   --------------------------------------------------------- */
function updateUIForRole() {
    const badge = document.getElementById('userBadge');
    const authBtn = document.getElementById('authActionBtn');
    const adminBtn = document.getElementById('adminPanelBtn');

    if (bannedUsers.includes(currentUser.username.toLowerCase())) {
        alert("Your account has been permanently banned!");
        logout();
        return;
    }

    if (currentUser.role === 'guest') {
        badge.innerText = 'Guest';
        badge.style.borderColor = 'var(--border-color)';
        authBtn.innerText = 'Sign In';
        adminBtn.style.display = 'none';
    } else {
        authBtn.innerText = 'Sign Out';
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

    if (user.length > 10) {
        alert("Username cannot exceed 10 characters!");
        return;
    }

    if (pass.length > 15) {
        alert("Password cannot exceed 15 characters!");
        return;
    }

    if (bannedUsers.includes(user.toLowerCase())) {
        alert("This username is permanently banned!");
        return;
    }

    // Developer Login Verification
    if (user === 'volkTeam' && pass === 'volkyvolkvolkovvolkovolkvolkfolkoplauolovolk') {
        currentUser = { username: 'volkTeam', role: 'developer' };
        alert("Welcome, Developer volkTeam!");
    } else if (moderatorsList.includes(user.toLowerCase())) {
        currentUser = { username: user, role: 'admin' };
        alert(`Signed in as Moderator ${user}!`);
    } else if (user.toLowerCase().includes('check') || user.toLowerCase().includes('verif')) {
        currentUser = { username: user, role: 'verified' };
        alert(`Signed in (Verified Account ✔️)!`);
    } else {
        currentUser = { username: user, role: 'user' };
        alert(`Signed in successfully!`);
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
   UPLOAD RESTRICTIONS
   --------------------------------------------------------- */
function checkUploadRestrictions() {
    const notice = document.getElementById('uploadRestrictionNotice');
    const submitBtn = document.getElementById('submitScriptBtn');
    const now = Date.now();

    if (currentUser.role === 'guest') {
        notice.style.display = 'block';
        notice.innerText = "Guests cannot publish scripts. Please sign in!";
        submitBtn.disabled = true;
        return;
    }

    const elapsedMs = now - parseInt(lastUploadTime);
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    const oneDayMs = 24 * 60 * 60 * 1000;

    if (currentUser.role === 'user' && elapsedMs < oneWeekMs) {
        const daysLeft = Math.ceil((oneWeekMs - elapsedMs) / (1000 * 60 * 60 * 24));
        notice.style.display = 'block';
        notice.innerText = `Limit: Regular users can post 1 script per week. Wait another ${daysLeft} day(s).`;
        submitBtn.disabled = true;
        return;
    }

    if (currentUser.role === 'verified' && elapsedMs < oneDayMs) {
        const hoursLeft = Math.ceil((oneDayMs - elapsedMs) / (1000 * 60 * 60));
        notice.style.display = 'block';
        notice.innerText = `Limit: Verified accounts ✔️ can post 1 script per day. Wait another ${hoursLeft} hour(s).`;
        submitBtn.disabled = true;
        return;
    }

    notice.style.display = 'none';
    submitBtn.disabled = false;
}

/* ---------------------------------------------------------
   PUBLISH SCRIPT
   --------------------------------------------------------- */
function handleUpload(event) {
    event.preventDefault();

    if (currentUser.role === 'guest') {
        alert("Guests cannot publish scripts!");
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
        dislikes: 0,
        isVerified: currentUser.role === 'verified' || currentUser.role === 'developer',
        isTrojan: false,
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
/* =========================================================
   VOLK HUB - SCRIPT REPOSITORY (PART 2)
   ========================================================= */

/* ---------------------------------------------------------
   LIKES AND DISLIKES (Strict 1 vote per account)
   --------------------------------------------------------- */
function likeScript(id) {
    if (userLikedScripts.includes(id) || userDislikedScripts.includes(id)) {
        alert("You have already voted on this script!");
        return;
    }

    let scripts = getScripts();
    let script = scripts.find(s => s.id === id);
    if (script) {
        script.likes = (script.likes || 0) + 1;
        userLikedScripts.push(id);
        localStorage.setItem('volk_liked_scripts', JSON.stringify(userLikedScripts));
        saveScripts(scripts);
        viewScriptDetail(id);
    }
}

function dislikeScript(id) {
    if (userLikedScripts.includes(id) || userDislikedScripts.includes(id)) {
        alert("You have already voted on this script!");
        return;
    }

    let scripts = getScripts();
    let script = scripts.find(s => s.id === id);
    if (script) {
        script.dislikes = (script.dislikes || 0) + 1;
        userDislikedScripts.push(id);
        localStorage.setItem('volk_disliked_scripts', JSON.stringify(userDislikedScripts));
        saveScripts(scripts);
        viewScriptDetail(id);
    }
}

/* ---------------------------------------------------------
   COMMENTS & REPORTS
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
    alert("Report sent to moderation team!");
}

/* ---------------------------------------------------------
   VOLK SUPPORT SYSTEM
   --------------------------------------------------------- */
function handleSupportSubmit(event) {
    event.preventDefault();
    const subject = document.getElementById('supportSubject').value.trim();
    const message = document.getElementById('supportMessage').value.trim();

    if (!subject || !message) return;

    const newTicket = {
        id: Date.now(),
        author: currentUser.username,
        subject,
        message,
        time: new Date().toLocaleString()
    };

    supportTickets.unshift(newTicket);
    localStorage.setItem('volk_support_tickets', JSON.stringify(supportTickets));

    alert("Support ticket submitted! Volk Team will review it soon.");
    document.getElementById('supportForm').reset();
    renderUserSupportTickets();
}

function renderUserSupportTickets() {
    const container = document.getElementById('userSupportTickets');
    if (!container) return;

    if (supportTickets.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted); font-size:13px;">No support tickets submitted yet.</p>';
        return;
    }

    container.innerHTML = supportTickets.map(t => `
        <div class="comment-card" style="flex-direction:column; align-items:flex-start; margin-bottom:8px;">
            <div style="display:flex; justify-space-between; width:100%;">
                <strong>${t.subject}</strong>
                <span style="color:var(--text-muted); font-size:11px;">${t.time}</span>
            </div>
            <p style="margin:4px 0 0 0; color:var(--text-muted); font-size:12px;">${t.message}</p>
        </div>
    `).join('');
}

/* ---------------------------------------------------------
   ADMIN & DEVELOPER POWERS
   --------------------------------------------------------- */
function openAdminModal() {
    if (currentUser.role !== 'admin' && currentUser.role !== 'developer') return;

    document.getElementById('adminModal').classList.add('active');
    
    const devSec = document.getElementById('devOnlySection');
    if (currentUser.role === 'developer') {
        devSec.style.display = 'block';
    } else {
        devSec.style.display = 'none';
    }

    renderReports();
    renderAdminTickets();
}

function closeAdminModal() {
    document.getElementById('adminModal').classList.remove('active');
}

function toggleVerifiedBadge(scriptId) {
    if (currentUser.role !== 'admin' && currentUser.role !== 'developer') return;

    let scripts = getScripts();
    let script = scripts.find(s => s.id === scriptId);
    if (script) {
        script.isVerified = !script.isVerified;
        saveScripts(scripts);
        viewScriptDetail(scriptId);
        alert(script.isVerified ? "Verified badge granted!" : "Verified badge removed!");
    }
}

function toggleTrojanCheck(scriptId) {
    if (currentUser.role !== 'admin' && currentUser.role !== 'developer') return;

    let scripts = getScripts();
    let script = scripts.find(s => s.id === scriptId);
    if (script) {
        script.isTrojan = !script.isTrojan;
        saveScripts(scripts);
        viewScriptDetail(scriptId);
        alert(script.isTrojan ? "WARNING: Marked as Trojan Detected! Code hidden from public." : "Trojan flag cleared.");
    }
}

function adminDeleteScript(id) {
    if (currentUser.role !== 'admin' && currentUser.role !== 'developer') return;
    
    if (confirm("Are you sure you want to delete this script?")) {
        let scripts = getScripts().filter(s => s.id !== id);
        saveScripts(scripts);
        alert("Script deleted!");
        switchTab('home');
    }
}

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

function adminUnbanUser() {
    if (currentUser.role !== 'admin' && currentUser.role !== 'developer') return;

    let userToUnban = document.getElementById('targetUnbanUsername').value.trim();
    if (!userToUnban) return;

    if (bannedUsers.includes(userToUnban.toLowerCase())) {
        bannedUsers = bannedUsers.filter(u => u !== userToUnban.toLowerCase());
        localStorage.setItem('volk_banned_users', JSON.stringify(bannedUsers));
        alert(`User ${userToUnban} unbanned successfully!`);
    } else {
        alert("User is not in the ban list!");
    }
}

function devAssignModerator() {
    if (currentUser.role !== 'developer') return;
    let username = document.getElementById('targetModUsername').value.trim().toLowerCase();
    if (username && !moderatorsList.includes(username)) {
        moderatorsList.push(username);
        localStorage.setItem('volk_moderators', JSON.stringify(moderatorsList));
        alert(`User ${username} granted MODER / ADMIN permissions!`);
    }
}

function devRemoveModerator() {
    if (currentUser.role !== 'developer') return;
    let username = document.getElementById('targetModUsername').value.trim().toLowerCase();
    moderatorsList = moderatorsList.filter(m => m !== username);
    localStorage.setItem('volk_moderators', JSON.stringify(moderatorsList));
    alert(`MODER permissions revoked for ${username}!`);
}

function renderReports() {
    const container = document.getElementById('reportsContainer');
    if (spamReports.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted); font-size:13px;">No spam reports.</p>';
        return;
    }

    container.innerHTML = spamReports.map(rep => `
        <div class="comment-card" style="margin-bottom:6px;">
            <div>
                <strong>Report by ${rep.reporter}:</strong> Spam by <b>${rep.author}</b>
            </div>
            <div>
                <button class="action-btn danger" onclick="adminBanUser('${rep.author}')">Ban User</button>
            </div>
        </div>
    `).join('');
}

function renderAdminTickets() {
    const container = document.getElementById('adminTicketsContainer');
    if (supportTickets.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted); font-size:13px;">No tickets submitted.</p>';
        return;
    }

    container.innerHTML = supportTickets.map(t => `
        <div class="comment-card" style="flex-direction:column; align-items:flex-start; margin-bottom:8px;">
            <div style="display:flex; justify-content:space-between; width:100%;">
                <strong>[${t.author}] ${t.subject}</strong>
                <span style="color:var(--text-muted); font-size:11px;">${t.time}</span>
            </div>
            <p style="margin:4px 0; color:var(--text-muted); font-size:12px;">${t.message}</p>
        </div>
    `).join('');
}

/* ---------------------------------------------------------
   CATALOG & SCRIPT DISPLAY
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
        card.className = `script-card ${script.isTrojan ? 'trojan-flagged' : ''}`;
        card.onclick = () => viewScriptDetail(script.id);

        let displayTitle = script.isTrojan ? `[DETECTED TROJAN] ${script.title}` : script.title;
        let verifiedIcon = script.isVerified ? ' <span class="badge-verified">✔️</span>' : '';

        let authorBadge = script.author;
        if (script.authorRole === 'developer') authorBadge = `<span class="badge-dev">${script.author} *DEVELOPER*</span>`;
        else if (script.authorRole === 'admin') authorBadge = `<span class="badge-admin">${script.author} *ADMIN*</span>`;

        card.innerHTML = `
            <div class="game-name"><i class="fa-solid fa-gamepad"></i> ${script.game}</div>
            <h3>${displayTitle}${verifiedIcon}</h3>
            <p style="color: var(--text-muted); font-size: 13px; margin: 6px 0;">${script.desc.substring(0, 90)}...</p>
            <div class="script-meta">
                <span><i class="fa-solid fa-user"></i> ${authorBadge}</span>
                <span><i class="fa-solid fa-thumbs-up" style="color: var(--accent);"></i> ${script.likes || 0}</span>
                <span><i class="fa-solid fa-thumbs-down" style="color: var(--danger);"></i> ${script.dislikes || 0}</span>
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

    let displayTitle = script.isTrojan ? `[DETECTED TROJAN] ${script.title}` : script.title;

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

    let hasVoted = userLikedScripts.includes(script.id) || userDislikedScripts.includes(script.id);
    let isAdminOrDev = (currentUser.role === 'admin' || currentUser.role === 'developer');

    let codeBlockContent = script.isTrojan 
        ? `<div class="code-block trojan-blocked"><i class="fa-solid fa-triangle-exclamation"></i> DETECTED TROJAN: Access & copying disabled for safety.</div>`
        : `<div class="code-block">${script.code}</div>`;

    container.innerHTML = `
        <div class="script-detail-box">
            <span style="color: var(--accent); font-size: 14px;"><i class="fa-solid fa-gamepad"></i> ${script.game}</span>
            <h2>${displayTitle} ${script.isVerified ? '<span class="badge-verified">✔️</span>' : ''}</h2>
            <p style="color: var(--text-muted); font-size: 13px;">Author: <strong>${script.author}</strong> • ${script.time}</p>
            
            <p style="margin: 15px 0;">${script.desc}</p>
            
            <div class="action-buttons">
                ${!script.isTrojan ? `
                    <button class="action-btn primary" onclick="navigator.clipboard.writeText(\`${script.code}\`); alert('Script copied to clipboard!');">
                        <i class="fa-solid fa-copy"></i> Copy Script
                    </button>
                ` : `
                    <button class="action-btn danger" disabled style="opacity:0.6; cursor:not-allowed;">
                        <i class="fa-solid fa-lock"></i> Copy Blocked (Trojan)
                    </button>
                `}
                <button class="action-btn" onclick="likeScript(${script.id})" ${hasVoted ? 'style="opacity:0.6;"' : ''}>
                    <i class="fa-solid fa-thumbs-up" style="color: var(--accent);"></i> Like (${script.likes || 0})
                </button>
                <button class="action-btn" onclick="dislikeScript(${script.id})" ${hasVoted ? 'style="opacity:0.6;"' : ''}>
                    <i class="fa-solid fa-thumbs-down" style="color: var(--danger);"></i> Dislike (${script.dislikes || 0})
                </button>
                <button class="action-btn" onclick="reportSpam('script', ${script.id}, '${script.author}')">
                    <i class="fa-solid fa-flag" style="color:var(--danger);"></i> Report
                </button>
                ${isAdminOrDev ? `
                    <button class="action-btn warning" onclick="toggleVerifiedBadge(${script.id})">
                        <i class="fa-solid fa-check-double"></i> ${script.isVerified ? 'Remove Badge' : 'Give Badge'}
                    </button>
                    <button class="action-btn danger" onclick="toggleTrojanCheck(${script.id})">
                        <i class="fa-solid fa-shield-virus"></i> ${script.isTrojan ? 'Clear Trojan' : 'Flag Trojan'}
                    </button>
                    <button class="action-btn danger" onclick="adminDeleteScript(${script.id})">
                        <i class="fa-solid fa-trash"></i> Delete
                    </button>
                ` : ''}
            </div>

            ${codeBlockContent}

            <div class="comments-section">
                <h3>Comments (${script.comments.length})</h3>
                <div id="commentsList">${commentsHtml}</div>
                
                ${currentUser.role !== 'guest' ? `
                    <div class="comment-input-box">
                        <input type="text" id="commentInput" placeholder="Write a comment...">
                        <button class="search-submit" onclick="addComment(${script.id})">Post</button>
                    </div>
                ` : `
                    <p style="color:var(--text-muted); font-size:12px; margin-top:10px;">Sign in to leave comments.</p>
                `}
            </div>
        </div>
    `;
}

function renderTrending() {
    let scripts = getScripts();
    let container = document.getElementById('trendingContainer');
    container.innerHTML = '';
    let sorted = [...scripts].sort((a, b) => (b.likes || 0) - (a.likes || 0));

    sorted.forEach(script => {
        let card = document.createElement('div');
        card.className = 'script-card';
        card.onclick = () => viewScriptDetail(script.id);
        card.innerHTML = `
            <div class="game-name"><i class="fa-solid fa-fire" style="color: #f97316;"></i> ${script.game}</div>
            <h3>${script.isTrojan ? '[DETECTED TROJAN] ' : ''}${script.title}</h3>
            <div class="script-meta">
                <span><i class="fa-solid fa-user"></i> ${script.author}</span>
                <span><i class="fa-solid fa-thumbs-up" style="color: var(--accent);"></i> ${script.likes || 0}</span>
                <span><i class="fa-solid fa-thumbs-down" style="color: var(--danger);"></i> ${script.dislikes || 0}</span>
            </div>
        `;
        container.appendChild(card);
    });
}

/* ---------------------------------------------------------
   NAVIGATION & TABS
   --------------------------------------------------------- */
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.getElementById(tabId + '-tab').classList.add('active');
    window.scrollTo(0, 0);
    if (tabId === 'home') renderScripts();
    if (tabId === 'trending') renderTrending();
    if (tabId === 'upload') checkUploadRestrictions();
    if (tabId === 'support') renderUserSupportTickets();
}

function searchScripts() {
    let query = document.getElementById('searchInput').value;
    renderScripts(query);
}

document.getElementById('searchInput').addEventListener('input', (e) => {
    renderScripts(e.target.value);
});

// Sidebar Controls
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
