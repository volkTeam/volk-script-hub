/* =========================================================
   VOLK HUB - FIREBASE INTEGRATED REPOSITORY (PART 1)
   ========================================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, collection, addDoc, doc, updateDoc, deleteDoc, 
    onSnapshot, query, orderBy, arrayUnion, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAwAagF0sojPXIqFnrjIgK6npNCW4-6q6g",
    authDomain: "volkhub-a5aa6.firebaseapp.com",
    projectId: "volkhub-a5aa6",
    storageBucket: "volkhub-a5aa6.firebasestorage.app",
    messagingSenderId: "689855552662",
    appId: "1:689855552662:web:78637365a82fe19f82f6b7",
    measurementId: "G-GQF2FQ0CT3"
};

// Initialize Firebase & Firestore Database
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Global Variables
let globalScriptsList = [];
let spamReports = [];
let supportTickets = [];

let currentUser = JSON.parse(localStorage.getItem('volk_current_user')) || {
    role: 'guest',
    username: 'Guest'
};

let bannedUsers = JSON.parse(localStorage.getItem('volk_banned_users')) || [];
let moderatorsList = JSON.parse(localStorage.getItem('volk_moderators')) || ['admin_demo'];
let userLikedScripts = JSON.parse(localStorage.getItem('volk_liked_scripts')) || [];
let userDislikedScripts = JSON.parse(localStorage.getItem('volk_disliked_scripts')) || [];
let lastUploadTime = localStorage.getItem('volk_last_upload_time') || 0;

/* ---------------------------------------------------------
   DYNAMIC TIME FORMATTING FUNCTION (ENGLISH)
   --------------------------------------------------------- */
function timeAgo(timestamp) {
    if (!timestamp) return "Just now";
    
    let timeMs = typeof timestamp === 'number' 
        ? timestamp 
        : (timestamp.seconds ? timestamp.seconds * 1000 : new Date(timestamp).getTime());

    if (isNaN(timeMs)) return "Just now";

    let now = Date.now();
    let seconds = Math.floor((now - timeMs) / 1000);

    if (seconds < 60) return "Just now";
    let minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
    let hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    let days = Math.floor(hours / 24);
    if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
    let months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`;
    let years = Math.floor(days / 365);
    return `${years} year${years > 1 ? 's' : ''} ago`;
}

/* ---------------------------------------------------------
   BOT VERIFICATION & PRELOADER
   --------------------------------------------------------- */
function passBotVerify() {
    const overlay = document.getElementById('botVerifyOverlay');
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.style.display = 'none';
            sessionStorage.setItem('volk_bot_passed', 'true');
        }, 300);
    }
}

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

    if (user === 'volkTeam' && pass === '8n3f9dkfp') {
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
    if (!notice || !submitBtn) return;

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
   REAL-TIME FIRESTORE LISTENER FOR SCRIPTS
   --------------------------------------------------------- */
const scriptsColRef = collection(db, 'scripts');
const scriptsQuery = query(scriptsColRef, orderBy('createdAt', 'desc'));

onSnapshot(scriptsQuery, (snapshot) => {
    globalScriptsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
    renderScripts();
}, (error) => {
    console.error("Firebase Firestore Error:", error);
});
/* =========================================================
   VOLK HUB - FIREBASE INTEGRATED REPOSITORY (PART 2)
   ========================================================= */

/* ---------------------------------------------------------
   PUBLISH SCRIPT TO FIREBASE
   --------------------------------------------------------- */
async function handleUpload(event) {
    event.preventDefault();

    if (currentUser.role === 'guest') {
        alert("Guests cannot publish scripts!");
        return;
    }

    let title = document.getElementById('scriptTitle').value.trim();
    let game = document.getElementById('scriptGame').value.trim();
    let desc = document.getElementById('scriptDesc').value.trim();
    let code = document.getElementById('scriptCode').value.trim();

    try {
        await addDoc(collection(db, 'scripts'), {
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
            createdAt: serverTimestamp(),
            comments: []
        });

        lastUploadTime = Date.now();
        localStorage.setItem('volk_last_upload_time', lastUploadTime);

        alert('Script published successfully to Firebase!');
        document.getElementById('uploadForm').reset();
        switchTab('home');
    } catch (e) {
        alert('Error publishing script: ' + e.message);
    }
}

/* ---------------------------------------------------------
   LIKES AND DISLIKES (FIREBASE)
   --------------------------------------------------------- */
async function likeScript(id) {
    if (userLikedScripts.includes(id) || userDislikedScripts.includes(id)) {
        alert("You have already voted on this script!");
        return;
    }

    let script = globalScriptsList.find(s => s.id === id);
    if (script) {
        try {
            const scriptRef = doc(db, 'scripts', id);
            await updateDoc(scriptRef, { likes: (script.likes || 0) + 1 });
            userLikedScripts.push(id);
            localStorage.setItem('volk_liked_scripts', JSON.stringify(userLikedScripts));
            viewScriptDetail(id);
        } catch (e) {
            alert('Error updating likes: ' + e.message);
        }
    }
}

async function dislikeScript(id) {
    if (userLikedScripts.includes(id) || userDislikedScripts.includes(id)) {
        alert("You have already voted on this script!");
        return;
    }

    let script = globalScriptsList.find(s => s.id === id);
    if (script) {
        try {
            const scriptRef = doc(db, 'scripts', id);
            await updateDoc(scriptRef, { dislikes: (script.dislikes || 0) + 1 });
            userDislikedScripts.push(id);
            localStorage.setItem('volk_disliked_scripts', JSON.stringify(userDislikedScripts));
            viewScriptDetail(id);
        } catch (e) {
            alert('Error updating dislikes: ' + e.message);
        }
    }
}

/* ---------------------------------------------------------
   COMMENTS & SPAM REPORTS (RESTRICTED FOR GUESTS)
   --------------------------------------------------------- */
async function addComment(scriptId) {
    if (currentUser.role === 'guest') {
        alert("Guests cannot leave comments! Please sign in.");
        return;
    }

    let input = document.getElementById('commentInput');
    let text = input.value.trim();
    if (!text) return;

    try {
        const scriptRef = doc(db, 'scripts', scriptId);
        const newComment = {
            user: currentUser.username,
            role: currentUser.role,
            text: text,
            createdAt: Date.now()
        };
        await updateDoc(scriptRef, {
            comments: arrayUnion(newComment)
        });
        input.value = '';
        viewScriptDetail(scriptId);
    } catch (e) {
        alert('Error adding comment: ' + e.message);
    }
}

async function reportSpam(targetType, targetId, authorName) {
    if (currentUser.role === 'guest') {
        alert("Guests cannot submit reports! Please sign in to submit a report.");
        return;
    }

    try {
        await addDoc(collection(db, 'reports'), {
            type: targetType,
            targetId: targetId,
            author: authorName,
            reporter: currentUser.username,
            createdAt: serverTimestamp()
        });
        alert("Report sent to moderation team via Firebase!");
    } catch (e) {
        alert("Error sending report: " + e.message);
    }
}

/* ---------------------------------------------------------
   VOLK SUPPORT SYSTEM (RESTRICTED FOR GUESTS)
   --------------------------------------------------------- */
async function handleSupportSubmit(event) {
    event.preventDefault();

    if (currentUser.role === 'guest') {
        alert("Guests cannot submit support tickets! Please sign in.");
        return;
    }

    const subject = document.getElementById('supportSubject').value.trim();
    const message = document.getElementById('supportMessage').value.trim();

    if (!subject || !message) return;

    try {
        await addDoc(collection(db, 'support_tickets'), {
            author: currentUser.username,
            subject,
            message,
            createdAt: serverTimestamp()
        });
        alert("Support ticket submitted! Volk Team will review it soon.");
        document.getElementById('supportForm').reset();
    } catch (e) {
        alert("Error submitting ticket: " + e.message);
    }
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
}

function closeAdminModal() {
    document.getElementById('adminModal').classList.remove('active');
}

async function toggleVerifiedBadge(scriptId) {
    if (currentUser.role !== 'admin' && currentUser.role !== 'developer') return;

    let script = globalScriptsList.find(s => s.id === scriptId);
    if (script) {
        const scriptRef = doc(db, 'scripts', scriptId);
        await updateDoc(scriptRef, { isVerified: !script.isVerified });
        viewScriptDetail(scriptId);
        alert(!script.isVerified ? "Verified badge granted!" : "Verified badge removed!");
    }
}

async function toggleTrojanCheck(scriptId) {
    if (currentUser.role !== 'admin' && currentUser.role !== 'developer') return;

    let script = globalScriptsList.find(s => s.id === scriptId);
    if (script) {
        const scriptRef = doc(db, 'scripts', scriptId);
        await updateDoc(scriptRef, { isTrojan: !script.isTrojan });
        viewScriptDetail(scriptId);
        alert(!script.isTrojan ? "WARNING: Marked as Trojan Detected!" : "Trojan flag cleared.");
    }
}

async function adminDeleteScript(id) {
    if (currentUser.role !== 'admin' && currentUser.role !== 'developer') return;
    
    if (confirm("Are you sure you want to delete this script permanently?")) {
        try {
            await deleteDoc(doc(db, 'scripts', id));
            alert("Script deleted from Firebase!");
            switchTab('home');
        } catch (e) {
            alert("Error deleting script: " + e.message);
        }
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

/* ---------------------------------------------------------
   CATALOG & SCRIPT DISPLAY
   --------------------------------------------------------- */
function renderScripts(filterText = '') {
    let container = document.getElementById('scriptsContainer');
    if (!container) return;
    container.innerHTML = '';

    let filtered = globalScriptsList.filter(s => 
        (s.title && s.title.toLowerCase().includes(filterText.toLowerCase())) || 
        (s.game && s.game.toLowerCase().includes(filterText.toLowerCase()))
    );

    if (filtered.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); text-align: center;">No scripts found in database.</p>';
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

        let formattedTime = timeAgo(script.createdAt);

        card.innerHTML = `
            <div class="game-name"><i class="fa-solid fa-gamepad"></i> ${script.game}</div>
            <h3>${displayTitle}${verifiedIcon}</h3>
            <p style="color: var(--text-muted); font-size: 13px; margin: 6px 0;">${(script.desc || '').substring(0, 90)}...</p>
            <div class="script-meta">
                <span><i class="fa-solid fa-user"></i> ${authorBadge}</span>
                <span><i class="fa-solid fa-thumbs-up" style="color: var(--accent);"></i> ${script.likes || 0}</span>
                <span><i class="fa-solid fa-thumbs-down" style="color: var(--danger);"></i> ${script.dislikes || 0}</span>
                <span><i class="fa-solid fa-clock"></i> ${formattedTime}</span>
            </div>
        `;
        container.appendChild(card);
    });
}

function viewScriptDetail(id) {
    let script = globalScriptsList.find(s => s.id === id);
    if (!script) return;

    switchTab('detail');
    let container = document.getElementById('scriptDetailContent');

    let displayTitle = script.isTrojan ? `[DETECTED TROJAN] ${script.title}` : script.title;
    let formattedTime = timeAgo(script.createdAt);

    let commentsList = script.comments || [];
    let commentsHtml = commentsList.map(c => {
        let userDisplay = c.user;
        if (c.role === 'developer') userDisplay = `<span class="badge-dev">${c.user} *DEVELOPER*</span>`;
        else if (c.role === 'admin') userDisplay = `<span class="badge-admin">${c.user} *ADMIN*</span>`;
        else if (c.role === 'verified') userDisplay = `${c.user} <span class="badge-verified">✔️</span>`;

        let commentTime = timeAgo(c.createdAt);

        return `
            <div class="comment-card">
                <div>
                    <strong>${userDisplay}:</strong> ${c.text}
                    <span style="font-size:11px; color:var(--text-muted); margin-left:8px;">(${commentTime})</span>
                </div>
                ${currentUser.role !== 'guest' ? `
                    <span class="report-btn" onclick="reportSpam('comment', '${script.id}', '${c.user}')" title="Report Spam">
                        <i class="fa-solid fa-flag"></i> Report
                    </span>
                ` : ''}
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
            <p style="color: var(--text-muted); font-size: 13px;">Author: <strong>${script.author}</strong> • ${formattedTime}</p>
            
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
                <button class="action-btn" onclick="likeScript('${script.id}')" ${hasVoted ? 'style="opacity:0.6;"' : ''}>
                    <i class="fa-solid fa-thumbs-up" style="color: var(--accent);"></i> Like (${script.likes || 0})
                </button>
                <button class="action-btn" onclick="dislikeScript('${script.id}')" ${hasVoted ? 'style="opacity:0.6;"' : ''}>
                    <i class="fa-solid fa-thumbs-down" style="color: var(--danger);"></i> Dislike (${script.dislikes || 0})
                </button>
                ${currentUser.role !== 'guest' ? `
                    <button class="action-btn" onclick="reportSpam('script', '${script.id}', '${script.author}')">
                        <i class="fa-solid fa-flag" style="color:var(--danger);"></i> Report
                    </button>
                ` : ''}
                ${isAdminOrDev ? `
                    <button class="action-btn warning" onclick="toggleVerifiedBadge('${script.id}')">
                        <i class="fa-solid fa-check-double"></i> ${script.isVerified ? 'Remove Badge' : 'Give Badge'}
                    </button>
                    <button class="action-btn danger" onclick="toggleTrojanCheck('${script.id}')">
                        <i class="fa-solid fa-shield-virus"></i> ${script.isTrojan ? 'Clear Trojan' : 'Flag Trojan'}
                    </button>
                    <button class="action-btn danger" onclick="adminDeleteScript('${script.id}')">
                        <i class="fa-solid fa-trash"></i> Delete
                    </button>
                ` : ''}
            </div>

            ${codeBlockContent}

            <div class="comments-section">
                <h3>Comments (${commentsList.length})</h3>
                <div id="commentsList">${commentsHtml}</div>
                
                ${currentUser.role !== 'guest' ? `
                    <div class="comment-input-box">
                        <input type="text" id="commentInput" placeholder="Write a comment...">
                        <button class="search-submit" onclick="addComment('${script.id}')">Post</button>
                    </div>
                ` : `
                    <p style="color:var(--text-muted); font-size:12px; margin-top:10px;">Sign in to leave comments.</p>
                `}
            </div>
        </div>
    `;
}

function renderTrending() {
    let container = document.getElementById('trendingContainer');
    if (!container) return;
    container.innerHTML = '';
    let sorted = [...globalScriptsList].sort((a, b) => (b.likes || 0) - (a.likes || 0));

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
    let target = document.getElementById(tabId + '-tab');
    if (target) target.classList.add('active');
    window.scrollTo(0, 0);
    if (tabId === 'home') renderScripts();
    if (tabId === 'trending') renderTrending();
    if (tabId === 'upload') checkUploadRestrictions();
}

function searchScripts() {
    let query = document.getElementById('searchInput').value;
    renderScripts(query);
}

const searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        renderScripts(e.target.value);
    });
}

// Sidebar Controls
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');

if (document.getElementById('menuBtn')) {
    document.getElementById('menuBtn').onclick = () => {
        if (sidebar) sidebar.classList.add('open');
        if (overlay) overlay.classList.add('active');
    };
}

function closeMenu() {
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
}

if (document.getElementById('closeMenuBtn')) document.getElementById('closeMenuBtn').onclick = closeMenu;
if (overlay) overlay.onclick = closeMenu;

// Export Functions to Window for HTML onclick Access
wind