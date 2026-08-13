import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, collection, doc, getDoc, getDocs, setDoc, 
    addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, 
    serverTimestamp, arrayUnion 
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

// Initialize Firebase & Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Global State Variables
let currentUser = JSON.parse(localStorage.getItem('volk_current_user')) || {
    role: 'guest',
    username: 'Guest'
};
let currentSessionToken = localStorage.getItem('volk_session_token') || null;
let allScripts = [];
let bannedUsers = [];
let moderatorsList = ['admin_demo'];
let spamReports = [];
let supportTickets = [];
let sessionUnsubscribe = null;
let activeTab = 'home';

/* ---------------------------------------------------------
   UTILITY & TIME AGO FORMATTER
   --------------------------------------------------------- */
function formatTimeAgo(timestamp) {
    if (!timestamp) return "Just now";
    
    let date;
    if (timestamp.toDate) {
        date = timestamp.toDate();
    } else if (timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
    } else if (typeof timestamp === 'number') {
        date = new Date(timestamp);
    } else {
        date = new Date(timestamp);
    }

    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (isNaN(seconds) || seconds < 10) return "Just now";
    if (seconds < 60) return `${seconds} seconds ago`;
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
    
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`;
    
    const years = Math.floor(days / 365);
    return `${years} year${years > 1 ? 's' : ''} ago`;
}

/* ---------------------------------------------------------
   BOT VERIFICATION
   --------------------------------------------------------- */
window.passBotVerify = function() {
    const overlay = document.getElementById('botVerifyOverlay');
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.style.display = 'none';
            sessionStorage.setItem('volk_bot_passed', 'true');
        }, 300);
    }
};

if (sessionStorage.getItem('volk_bot_passed') === 'true') {
    const overlay = document.getElementById('botVerifyOverlay');
    if (overlay) overlay.style.display = 'none';
}

/* ---------------------------------------------------------
   AUTHENTICATION & SINGLE SESSION
   --------------------------------------------------------- */
function monitorSession(username) {
    if (sessionUnsubscribe) sessionUnsubscribe();
    if (currentUser.role === 'guest') return;

    const userDocRef = doc(db, "users", username.toLowerCase());
    sessionUnsubscribe = onSnapshot(userDocRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.data();
            if (data.activeSessionId && data.activeSessionId !== currentSessionToken) {
                alert("Session expired! Another device logged into this account.");
                window.logout();
            }
            if (data.isBanned) {
                alert("Your account has been permanently banned!");
                window.logout();
            }
        }
    });
}

window.updateUIForRole = function() {
    const badge = document.getElementById('userBadge');
    const authBtn = document.getElementById('authActionBtn');
    const adminBtn = document.getElementById('adminPanelBtn');

    if (!badge || !authBtn || !adminBtn) return;

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
};

window.openAuthModal = function() {
    if (currentUser.role !== 'guest') {
        window.logout();
        return;
    }
    document.getElementById('authModal').classList.add('active');
};

window.closeAuthModal = function() {
    document.getElementById('authModal').classList.remove('active');
};

window.performAuth = async function() {
    const user = document.getElementById('authUsername').value.trim();
    const pass = document.getElementById('authPassword').value.trim();

    if (!user) return alert("Please enter a username!");
    if (user.length > 10) return alert("Username cannot exceed 10 characters!");
    if (pass.length > 15) return alert("Password cannot exceed 15 characters!");

    const userId = user.toLowerCase();
    const userDocRef = doc(db, "users", userId);
    const userSnap = await getDoc(userDocRef);

    if (userSnap.exists()) {
        const userData = userSnap.data();
        if (userData.isBanned) return alert("This username is permanently banned!");
        if (userData.password !== pass) return alert("Incorrect password!");
    }

    let role = 'user';
    if (user === 'volkTeam' && pass === '8n3f9dkfp') role = 'developer';
    else if (moderatorsList.includes(userId)) role = 'admin';
    else if (user.toLowerCase().includes('check') || user.toLowerCase().includes('verif')) role = 'verified';

    const newSessionToken = Math.random().toString(36).substring(2) + Date.now().toString(36);

    await setDoc(userDocRef, {
        username: user,
        password: pass,
        role: role,
        activeSessionId: newSessionToken,
        isBanned: false,
        lastLogin: serverTimestamp()
    }, { merge: true });

    currentUser = { username: user, role: role };
    currentSessionToken = newSessionToken;

    localStorage.setItem('volk_current_user', JSON.stringify(currentUser));
    localStorage.setItem('volk_session_token', currentSessionToken);

    alert(`Signed in successfully as ${user}!`);
    window.closeAuthModal();
    window.updateUIForRole();
    monitorSession(user);
    renderScripts();
};

window.logout = async function() {
    if (currentUser.username && currentUser.role !== 'guest') {
        try {
            const userDocRef = doc(db, "users", currentUser.username.toLowerCase());
            await updateDoc(userDocRef, { activeSessionId: null });
        } catch (e) {}
    }

    if (sessionUnsubscribe) sessionUnsubscribe();
    currentUser = { role: 'guest', username: 'Guest' };
    currentSessionToken = null;

    localStorage.setItem('volk_current_user', JSON.stringify(currentUser));
    localStorage.removeItem('volk_session_token');

    window.updateUIForRole();
    renderScripts();
};

/* ---------------------------------------------------------
   REAL-TIME FIRESTORE LISTENER
   --------------------------------------------------------- */
function listenToScripts() {
    const q = query(collection(db, "scripts"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        allScripts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        if (activeTab === 'home') renderScripts();
        if (activeTab === 'trending') renderTrending();
    });
}

function checkUploadRestrictions() {
    const notice = document.getElementById('uploadRestrictionNotice');
    const submitBtn = document.getElementById('submitScriptBtn');
    if (!notice || !submitBtn) return;

    if (currentUser.role === 'guest') {
        notice.style.display = 'block';
        notice.innerText = "Guests cannot publish scripts. Please sign in!";
        submitBtn.disabled = true;
        return;
    }

    notice.style.display = 'none';
    submitBtn.disabled = false;
}

window.handleUpload = async function(event) {
    event.preventDefault();
    if (currentUser.role === 'guest') return alert("Guests cannot publish scripts!");

    const title = document.getElementById('scriptTitle').value.trim();
    const game = document.getElementById('scriptGame').value.trim();
    const desc = document.getElementById('scriptDesc').value.trim();
    const code = document.getElementById('scriptCode').value.trim();

    try {
        await addDoc(collection(db, "scripts"), {
            title,
            game,
            desc,
            code,
            author: currentUser.username,
            authorRole: currentUser.role,
            likes: 0,
            dislikes: 0,
            likedBy: [],
            dislikedBy: [],
            isVerified: currentUser.role === 'verified' || currentUser.role === 'developer',
            isTrojan: false,
            comments: [],
            createdAt: serverTimestamp()
        });

        alert('Script published successfully!');
        document.getElementById('uploadForm').reset();
        window.switchTab('home');
    } catch (error) {
        alert('Failed to publish: ' + error.message);
    }
};

/* ---------------------------------------------------------
   LIKES & DISLIKES
   --------------------------------------------------------- */
window.likeScript = async function(scriptId) {
    if (currentUser.role === 'guest') return alert("Please sign in to vote!");
    const scriptRef = doc(db, "scripts", scriptId);
    const scriptSnap = await getDoc(scriptRef);

    if (scriptSnap.exists()) {
        const data = scriptSnap.data();
        const likedBy = data.likedBy || [];
        const dislikedBy = data.dislikedBy || [];

        if (likedBy.includes(currentUser.username) || dislikedBy.includes(currentUser.username)) {
            return alert("You have already voted on this script!");
        }

        await updateDoc(scriptRef, {
            likes: (data.likes || 0) + 1,
            likedBy: arrayUnion(currentUser.username)
        });
        window.viewScriptDetail(scriptId);
    }
};

window.dislikeScript = async function(scriptId) {
    if (currentUser.role === 'guest') return alert("Please sign in to vote!");
    const scriptRef = doc(db, "scripts", scriptId);
    const scriptSnap = await getDoc(scriptRef);

    if (scriptSnap.exists()) {
        const data = scriptSnap.data();
        const likedBy = data.likedBy || [];
        const dislikedBy = data.dislikedBy || [];

        if (likedBy.includes(currentUser.username) || dislikedBy.includes(currentUser.username)) {
            return alert("You have already voted on this script!");
        }

        await updateDoc(scriptRef, {
            dislikes: (data.dislikes || 0) + 1,
            dislikedBy: arrayUnion(currentUser.username)
        });
        window.viewScriptDetail(scriptId);
    }
};
/* ---------------------------------------------------------
   COMMENTS & REPORTS
   --------------------------------------------------------- */
window.addComment = async function(scriptId) {
    if (currentUser.role === 'guest') return alert("Guests cannot leave comments!");
    const input = document.getElementById('commentInput');
    const text = input.value.trim();
    if (!text) return;

    const scriptRef = doc(db, "scripts", scriptId);
    const scriptSnap = await getDoc(scriptRef);

    if (scriptSnap.exists()) {
        const data = scriptSnap.data();
        const comments = data.comments || [];
        comments.push({
            user: currentUser.username,
            role: currentUser.role,
            text: text,
            time: new Date().toISOString()
        });

        await updateDoc(scriptRef, { comments });
        input.value = '';
        window.viewScriptDetail(scriptId);
    }
};

window.reportSpam = async function(targetType, targetId, authorName) {
    await addDoc(collection(db, "reports"), {
        type: targetType,
        targetId,
        author: authorName,
        reporter: currentUser.username,
        createdAt: serverTimestamp()
    });
    alert("Report sent to moderation team!");
};

/* ---------------------------------------------------------
   SUPPORT TICKETS
   --------------------------------------------------------- */
window.handleSupportSubmit = async function(event) {
    event.preventDefault();
    const subject = document.getElementById('supportSubject').value.trim();
    const message = document.getElementById('supportMessage').value.trim();
    if (!subject || !message) return;

    await addDoc(collection(db, "tickets"), {
        author: currentUser.username,
        subject,
        message,
        createdAt: serverTimestamp()
    });

    alert("Support ticket submitted!");
    document.getElementById('supportForm').reset();
    renderUserSupportTickets();
};

async function renderUserSupportTickets() {
    const container = document.getElementById('userSupportTickets');
    if (!container) return;

    const q = query(collection(db, "tickets"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    const tickets = snapshot.docs.map(d => d.data());

    if (tickets.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted); font-size:13px;">No tickets submitted yet.</p>';
        return;
    }

    container.innerHTML = tickets.map(t => `
        <div class="comment-card" style="flex-direction:column; align-items:flex-start; margin-bottom:8px;">
            <div style="display:flex; justify-content:space-between; width:100%;">
                <strong>[${t.author}] ${t.subject}</strong>
                <span style="color:var(--text-muted); font-size:11px;">${formatTimeAgo(t.createdAt)}</span>
            </div>
            <p style="margin:4px 0 0 0; color:var(--text-muted); font-size:12px;">${t.message}</p>
        </div>
    `).join('');
}

/* ---------------------------------------------------------
   ADMIN POWERS
   --------------------------------------------------------- */
window.openAdminModal = function() {
    if (currentUser.role !== 'admin' && currentUser.role !== 'developer') return;
    document.getElementById('adminModal').classList.add('active');
    document.getElementById('devOnlySection').style.display = currentUser.role === 'developer' ? 'block' : 'none';
};

window.closeAdminModal = function() {
    document.getElementById('adminModal').classList.remove('active');
};

window.adminBanUser = async function() {
    const target = document.getElementById('targetBanUsername').value.trim();
    if (!target) return;
    await setDoc(doc(db, "users", target.toLowerCase()), { isBanned: true }, { merge: true });
    alert(`User ${target} permanently banned!`);
};

window.adminUnbanUser = async function() {
    const target = document.getElementById('targetUnbanUsername').value.trim();
    if (!target) return;
    await setDoc(doc(db, "users", target.toLowerCase()), { isBanned: false }, { merge: true });
    alert(`User ${target} unbanned!`);
};

window.devAssignModerator = function() {
    const user = document.getElementById('targetModUsername').value.trim().toLowerCase();
    if (user) {
        moderatorsList.push(user);
        alert(`User ${user} granted MODER!`);
    }
};

window.devRemoveModerator = function() {
    const user = document.getElementById('targetModUsername').value.trim().toLowerCase();
    moderatorsList = moderatorsList.filter(m => m !== user);
    alert(`MODER revoked for ${user}!`);
};

window.toggleVerifiedBadge = async function(scriptId) {
    const scriptRef = doc(db, "scripts", scriptId);
    const snap = await getDoc(scriptRef);
    if (snap.exists()) {
        const val = !snap.data().isVerified;
        await updateDoc(scriptRef, { isVerified: val });
        window.viewScriptDetail(scriptId);
    }
};

window.toggleTrojanCheck = async function(scriptId) {
    const scriptRef = doc(db, "scripts", scriptId);
    const snap = await getDoc(scriptRef);
    if (snap.exists()) {
        const val = !snap.data().isTrojan;
        await updateDoc(scriptRef, { isTrojan: val });
        window.viewScriptDetail(scriptId);
    }
};

window.adminDeleteScript = async function(scriptId) {
    if (confirm("Are you sure you want to delete this script?")) {
        await deleteDoc(doc(db, "scripts", scriptId));
        alert("Script deleted!");
        window.switchTab('home');
    }
};

/* ---------------------------------------------------------
   DISPLAY SCRIPT CATALOG
   --------------------------------------------------------- */
function renderScripts(filterText = '') {
    const container = document.getElementById('scriptsContainer');
    if (!container) return;
    container.innerHTML = '';

    const filtered = allScripts.filter(s => 
        (s.title || '').toLowerCase().includes(filterText.toLowerCase()) || 
        (s.game || '').toLowerCase().includes(filterText.toLowerCase())
    );

    if (filtered.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); text-align: center;">No scripts found.</p>';
        return;
    }

    filtered.forEach(script => {
        const card = document.createElement('div');
        card.className = `script-card ${script.isTrojan ? 'trojan-flagged' : ''}`;
        card.onclick = () => window.viewScriptDetail(script.id);

        const verifiedBadge = script.isVerified ? ' <span class="badge-verified">✔️</span>' : '';
        const titleText = script.isTrojan ? `[DETECTED TROJAN] ${script.title}` : script.title;

        card.innerHTML = `
            <div class="game-name"><i class="fa-solid fa-gamepad"></i> ${script.game}</div>
            <h3>${titleText}${verifiedBadge}</h3>
            <p style="color: var(--text-muted); font-size: 13px; margin: 6px 0;">${(script.desc || '').substring(0, 90)}...</p>
            <div class="script-meta">
                <span><i class="fa-solid fa-user"></i> ${script.author || 'Guest'}</span>
                <span><i class="fa-solid fa-thumbs-up" style="color: var(--accent);"></i> ${script.likes || 0}</span>
                <span><i class="fa-solid fa-thumbs-down" style="color: var(--danger);"></i> ${script.dislikes || 0}</span>
                <span><i class="fa-solid fa-clock"></i> ${formatTimeAgo(script.createdAt)}</span>
            </div>
        `;
        container.appendChild(card);
    });
}

window.viewScriptDetail = function(scriptId) {
    const script = allScripts.find(s => s.id === scriptId);
    if (!script) return;

    window.switchTab('detail');
    const container = document.getElementById('scriptDetailContent');

    const displayTitle = script.isTrojan ? `[DETECTED TROJAN] ${script.title}` : script.title;
    const comments = script.comments || [];

    const commentsHtml = comments.map(c => `
        <div class="comment-card">
            <div>
                <strong>${c.user}:</strong> ${c.text}
            </div>
            <span class="report-btn" onclick="reportSpam('comment', '${script.id}', '${c.user}')">
                <i class="fa-solid fa-flag"></i> Report
            </span>
        </div>
    `).join('') || '<p style="color: var(--text-muted); font-size: 13px;">No comments yet.</p>';

    const isAdminOrDev = (currentUser.role === 'admin' || currentUser.role === 'developer');

    const codeBlock = script.isTrojan 
        ? `<div class="code-block trojan-blocked"><i class="fa-solid fa-triangle-exclamation"></i> DETECTED TROJAN: Access disabled for safety.</div>`
        : `<div class="code-block">${script.code}</div>`;

    container.innerHTML = `
        <div class="script-detail-box">
            <span style="color: var(--accent); font-size: 14px;"><i class="fa-solid fa-gamepad"></i> ${script.game}</span>
            <h2>${displayTitle} ${script.isVerified ? '<span class="badge-verified">✔️</span>' : ''}</h2>
            <p style="color: var(--text-muted); font-size: 13px;">Author: <strong>${script.author}</strong> • ${formatTimeAgo(script.createdAt)}</p>
            
            <p style="margin: 15px 0;">${script.desc}</p>
            
            <div class="action-buttons">
                ${!script.isTrojan ? `
                    <button class="action-btn primary" onclick="navigator.clipboard.writeText(\`${script.code.replace(/`/g, '\\`')}\`); alert('Script copied!');">
                        <i class="fa-solid fa-copy"></i> Copy Script
                    </button>
                ` : `
                    <button class="action-btn danger" disabled style="opacity:0.6;">
                        <i class="fa-solid fa-lock"></i> Copy Blocked
                    </button>
                `}
                <button class="action-btn" onclick="likeScript('${script.id}')">
                    <i class="fa-solid fa-thumbs-up" style="color: var(--accent);"></i> Like (${script.likes || 0})
                </button>
                <button class="action-btn" onclick="dislikeScript('${script.id}')">
                    <i class="fa-solid fa-thumbs-down" style="color: var(--danger);"></i> Dislike (${script.dislikes || 0})
                </button>
                <button class="action-btn" onclick="reportSpam('script', '${script.id}', '${script.author}')">
                    <i class="fa-solid fa-flag" style="color:var(--danger);"></i> Report
                </button>
                ${isAdminOrDev ? `
                    <button class="action-btn warning" onclick="toggleVerifiedBadge('${script.id}')">Toggle Badge</button>
                    <button class="action-btn danger" onclick="toggleTrojanCheck('${script.id}')">Toggle Trojan</button>
                    <button class="action-btn danger" onclick="adminDeleteScript('${script.id}')">Delete</button>
                ` : ''}
            </div>

            ${codeBlock}

            <div class="comments-section">
                <h3>Comments (${comments.length})</h3>
                <div id="commentsList">${commentsHtml}</div>
                
                ${currentUser.role !== 'guest' ? `
                    <div class="comment-input-box">
                        <input type="text" id="commentInput" placeholder="Write a comment...">
                        <button class="search-submit" onclick="addComment('${script.id}')">Post</button>
                    </div>
                ` : '<p style="color:var(--text-muted); font-size:12px; margin-top:10px;">Sign in to comment.</p>'}
            </div>
        </div>
    `;
};

function renderTrending() {
    const container = document.getElementById('trendingContainer');
    if (!container) return;
    container.innerHTML = '';
    const sorted = [...allScripts].sort((a, b) => (b.likes || 0) - (a.likes || 0));

    sorted.forEach(script => {
        const card = document.createElement('div');
        card.className = 'script-card';
        card.onclick = () => window.viewScriptDetail(script.id);
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
   NAVIGATION & INITIALIZATION
   --------------------------------------------------------- */
window.switchTab = function(tabId) {
    activeTab = tabId;
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    const targetTab = document.getElementById(tabId + '-tab');
    if (targetTab) targetTab.classList.add('active');
    window.scrollTo(0, 0);

    if (tabId === 'home') renderScripts();
    if (tabId === 'trending') renderTrending();
    if (tabId === 'upload') checkUploadRestrictions();
    if (tabId === 'support') renderUserSupportTickets();
};

window.searchScripts = function() {
    const queryStr = document.getElementById('searchInput').value;
    renderScripts(queryStr);
};

document.getElementById('searchInput')?.addEventListener('input', (e) => {
    renderScripts(e.target.value);
});

// Sidebar setup
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');

document.getElementById('menuBtn').onclick = () => {
    sidebar.classList.add('open');
    overlay.classList.add('active');
};

window.closeMenu = function() {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
};

document.getElementById('closeMenuBtn').onclick = window.closeMenu;
overlay.onclick = window.closeMenu;

// Start Firestore listeners & user session check
window.updateUIForRole();
listenToScripts();
if (currentUser.username && currentUser.role !== 'guest') {
    monitorSession(currentUser.username);
}
