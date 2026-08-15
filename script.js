import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, collection, doc, getDoc, getDocs, setDoc, 
    addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, 
    serverTimestamp, arrayUnion, where 
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
let userRolesCache = {}; 
let sessionUnsubscribe = null;
let govChatUnsubscribe = null;
let activeTab = 'home';

/* ---------------------------------------------------------
   AI FILTERING & MODERATION LOGIC (NEW)
   --------------------------------------------------------- */
const badWords = ['fuck', 'shit', 'bitch', 'asshole', 'dick', 'cunt', 'nigger', 'nigga', 'slut', 'whore', 'faggot', 'retard'];
const linkRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(discord\.gg)|(youtube\.com)|(youtu\.be)|(t\.me)|(telegram\.me)/i;
const cyrillicRegex = /[А-Яа-яЁё]/;
const luaKeywordsRegex = /(loadstring|local |function |game:|workspace|print\(|require\()/i;

function contentFilter(text) {
    if (!text) return true;
    
    // Check Cyrillic (English only rule)
    if (cyrillicRegex.test(text)) {
        alert("AI Warning: Only English text is allowed! / Только английский язык!");
        return false;
    }
    
    // Check Links (Block YT, Discord, TG)
    if (linkRegex.test(text)) {
        alert("AI Warning: Links to YouTube, Discord, or Telegram are not allowed!");
        return false;
    }

    // Check Bad Words
    const lowerText = text.toLowerCase();
    for (let word of badWords) {
        if (lowerText.includes(word)) {
            alert("AI Warning: Profanity/Bad words are not allowed!");
            return false;
        }
    }
    
    return true;
}

function luaFilter(code) {
    if (!code) return false;
    // Must contain some Lua specific syntax
    if (!luaKeywordsRegex.test(code)) {
        alert("AI Warning: Code must be valid Lua/Luau or a loadstring!");
        return false;
    }
    return contentFilter(code); // Also run general filter on code to block self-promo links
}

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

// FORMAT ROLES (UPDATED WITH YT AND VETERAN)
function formatUserRoleBadge(username, fallbackRole = 'user') {
    if (!username) return 'Guest';
    const lower = username.toLowerCase();
    
    if (lower === 'volkteam') {
        return `${username} <span style="color: #22c55e; font-weight: bold;">(developer)</span>`;
    }

    const role = userRolesCache[lower] || fallbackRole;

    if (role === 'developer') return `${username} <span style="color: #22c55e; font-weight: bold;">(developer)</span>`;
    if (role === 'admin') return `${username} <span style="color: #ef4444; font-weight: bold;">(admin)</span>`;
    if (role === 'youtuber') return `${username} <span class="badge-yt">(YT)</span>`;
    if (role === 'veteran') return `${username} <span class="badge-vet">VETERAN</span>`;
    if (role === 'verified') return `${username} <span class="badge-verified">✔️</span>`;
    
    return username;
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
   AUTHENTICATION & REALTIME SESSION MONITOR
   --------------------------------------------------------- */
function monitorSession(username) {
    if (sessionUnsubscribe) sessionUnsubscribe();
    if (currentUser.role === 'guest') return;

    const userDocRef = doc(db, "users", username.toLowerCase());
    sessionUnsubscribe = onSnapshot(userDocRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.data();
            if (data.isBanned) {
                alert("Your account has been permanently banned!");
                window.logout();
                return;
            }

            if (data.role && data.role !== currentUser.role) {
                currentUser.role = data.role;
                localStorage.setItem('volk_current_user', JSON.stringify(currentUser));
                window.updateUIForRole();
            }
        }
    });
}

function listenToUsers() {
    onSnapshot(collection(db, "users"), (snapshot) => {
        userRolesCache = {};
        snapshot.docs.forEach(d => {
            const data = d.data();
            if (data.username) {
                userRolesCache[data.username.toLowerCase()] = data.role || 'user';
            }
        });
        if (activeTab === 'home') renderScripts();
        if (activeTab === 'trending') renderTrending();
    });
}

// UPDATED UI VISIBILITY FOR NEW ROLES
window.updateUIForRole = function() {
    const badge = document.getElementById('userBadge');
    const authBtn = document.getElementById('authActionBtn');
    const adminBtn = document.getElementById('adminPanelBtn');
    const govChatLink = document.getElementById('govChatLink');

    if (!badge || !authBtn || !adminBtn) return;

    // Gov Chat is for Dev, Admin, YouTuber
    if (['developer', 'admin', 'youtuber'].includes(currentUser.role)) {
        govChatLink.style.display = 'block';
    } else {
        govChatLink.style.display = 'none';
    }

    if (currentUser.role === 'guest') {
        badge.innerText = 'Guest';
        badge.style.borderColor = 'var(--border-color)';
        authBtn.innerText = 'Sign In';
        adminBtn.style.display = 'none';
    } else {
        authBtn.innerText = 'Sign Out';
        if (currentUser.role === 'developer') {
            badge.innerHTML = `<span class="badge-dev">${currentUser.username} <span style="color:#22c55e;">(developer)</span></span>`;
            adminBtn.style.display = 'block';
        } else if (currentUser.role === 'admin') {
            badge.innerHTML = `<span class="badge-admin">${currentUser.username} <span style="color:#ef4444;">(admin)</span></span>`;
            adminBtn.style.display = 'block';
        } else if (currentUser.role === 'youtuber') {
            badge.innerHTML = `<span class="badge-yt">${currentUser.username} (YT)</span>`;
            adminBtn.style.display = 'none';
        } else if (currentUser.role === 'veteran') {
            badge.innerHTML = `<span class="badge-vet">${currentUser.username} VETERAN</span>`;
            adminBtn.style.display = 'none';
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
    if (!contentFilter(user)) return; // English & No Swearing check for username
    if (user.length > 10) return alert("Username cannot exceed 10 characters!");
    if (pass.length > 15) return alert("Password cannot exceed 15 characters!");

    const userId = user.toLowerCase();
    const userDocRef = doc(db, "users", userId);
    const userSnap = await getDoc(userDocRef);

    let role = 'user';

    if (userSnap.exists()) {
        const userData = userSnap.data();
        if (userData.isBanned) return alert("This username is permanently banned!");
        
        if (userData.password !== pass) {
            return alert("This username is already taken! Incorrect password for this account.");
        }

        if (userData.activeSessionId) {
            return alert("This account is currently in use on another device!");
        }

        role = userData.role || 'user';
    } else {
        if (user === 'volkTeam' && pass === '8n3f9dkfp') role = 'developer';
        else if (user.toLowerCase().includes('check') || user.toLowerCase().includes('verif')) role = 'verified';
    }

    if (user === 'volkTeam' && pass === '8n3f9dkfp') role = 'developer';

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
    const status = document.getElementById('scriptStatus').value; // Working or Patched
    const keySystem = document.getElementById('scriptKeySystem').checked; // true/false

    // Apply AI Filters
    if (!contentFilter(title)) return;
    if (!contentFilter(desc)) return;
    if (!luaFilter(code)) return;

    try {
        await addDoc(collection(db, "scripts"), {
            title,
            game,
            desc,
            code,
            status: status,
            keySystem: keySystem,
            author: currentUser.username,
            authorRole: currentUser.role,
            likes: 0,
            dislikes: 0,
            likedBy: [],
            dislikedBy: [],
            strikes: [], // For YouTuber Copyright Strikes
            isCopyrightBlocked: false,
            isVerified: ['verified', 'developer', 'veteran', 'youtuber'].includes(currentUser.role),
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
   EDIT SCRIPT (NEW)
   --------------------------------------------------------- */
window.openEditModal = function(scriptId) {
    const script = allScripts.find(s => s.id === scriptId);
    if (!script) return;
    
    if (script.author !== currentUser.username && !['admin', 'developer'].includes(currentUser.role)) {
        return alert("You can only edit your own scripts!");
    }

    document.getElementById('editScriptId').value = script.id;
    document.getElementById('editScriptTitle').value = script.title;
    document.getElementById('editScriptDesc').value = script.desc;
    document.getElementById('editScriptCode').value = script.code;
    document.getElementById('editScriptStatus').value = script.status || 'Working';
    document.getElementById('editScriptKeySystem').checked = script.keySystem || false;

    document.getElementById('editScriptModal').classList.add('active');
};

window.closeEditModal = function() {
    document.getElementById('editScriptModal').classList.remove('active');
};

window.saveEditedScript = async function() {
    const id = document.getElementById('editScriptId').value;
    const title = document.getElementById('editScriptTitle').value.trim();
    const desc = document.getElementById('editScriptDesc').value.trim();
    const code = document.getElementById('editScriptCode').value.trim();
    const status = document.getElementById('editScriptStatus').value;
    const keySystem = document.getElementById('editScriptKeySystem').checked;

    if (!contentFilter(title) || !contentFilter(desc) || !luaFilter(code)) return;

    const scriptRef = doc(db, "scripts", id);
    await updateDoc(scriptRef, {
        title, desc, code, status, keySystem
    });

    alert("Script updated successfully!");
    closeEditModal();
    viewScriptDetail(id);
};

/* ---------------------------------------------------------
   YOUTUBER COPYRIGHT STRIKE SYSTEM (NEW)
   --------------------------------------------------------- */
window.ytStrikeScript = async function(scriptId, author) {
    if (currentUser.role !== 'youtuber') return alert("Only YouTubers can issue copyright strikes!");
    
    if (confirm("Are you sure you want to issue a copyright strike? False claims will result in a ban.")) {
        const scriptRef = doc(db, "scripts", scriptId);
        const scriptSnap = await getDoc(scriptRef);
        
        if (scriptSnap.exists()) {
            const data = scriptSnap.data();
            const strikes = data.strikes || [];
            
            if (strikes.includes(currentUser.username)) {
                return alert("You have already struck this script!");
            }
            
            strikes.push(currentUser.username);
            await updateDoc(scriptRef, { strikes });
            
            // Check if author has 3 or more struck scripts
            const qScripts = query(collection(db, "scripts"), where("author", "==", author));
            const authorScripts = await getDocs(qScripts);
            let struckCount = 0;
            
            authorScripts.docs.forEach(d => {
                const sData = d.data();
                if (sData.strikes && sData.strikes.length > 0) {
                    struckCount++;
                }
            });

            // If 3 different scripts got struck, block all their scripts
            if (struckCount >= 3) {
                const updatePromises = authorScripts.docs.map(d => updateDoc(doc(db, "scripts", d.id), { isCopyrightBlocked: true }));
                await Promise.all(updatePromises);
                alert(`Author ${author} has received 3 strikes. All their scripts are now blocked.`);
            } else {
                alert(`Strike issued. Author has ${struckCount}/3 strikes.`);
            }
            
            window.viewScriptDetail(scriptId);
        }
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
    
    if (!contentFilter(text)) return; // AI Check

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
   GOVERNMENT CHAT LOGIC (NEW)
   --------------------------------------------------------- */
function listenToGovChat() {
    if (govChatUnsubscribe) govChatUnsubscribe();
    if (!['developer', 'admin', 'youtuber'].includes(currentUser.role)) return;

    const q = query(collection(db, "gov_chat"), orderBy("createdAt", "asc"));
    govChatUnsubscribe = onSnapshot(q, (snapshot) => {
        const container = document.getElementById('govChatMessages');
        if (!container) return;
        
        container.innerHTML = '';
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const div = document.createElement('div');
            div.style.padding = "8px";
            div.style.borderBottom = "1px solid var(--border-color)";
            div.innerHTML = `<strong>${formatUserRoleBadge(data.user, data.role)}:</strong> <span style="color:white; margin-left: 8px;">${data.text}</span>`;
            container.appendChild(div);
        });
        container.scrollTop = container.scrollHeight;
    });
}

window.sendGovChatMessage = async function() {
    const input = document.getElementById('govChatInput');
    const text = input.value.trim();
    if (!text || !['developer', 'admin', 'youtuber'].includes(currentUser.role)) return;

    await addDoc(collection(db, "gov_chat"), {
        user: currentUser.username,
        role: currentUser.role,
        text: text,
        createdAt: serverTimestamp()
    });
    input.value = '';
};

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

    const targetId = target.toLowerCase();

    if (targetId === 'volkteam') {
        return alert("Error: You cannot ban the developer!");
    }

    const targetRef = doc(db, "users", targetId);
    const targetSnap = await getDoc(targetRef);
    if (targetSnap.exists()) {
        const targetData = targetSnap.data();
        if (targetData.role === 'admin' || targetData.role === 'developer') {
            return alert("Error: Admins cannot ban other admins or developers!");
        }
    }

    await setDoc(targetRef, { isBanned: true }, { merge: true });

    try {
        const qScripts = query(collection(db, "scripts"), where("author", "==", target));
        const scriptSnaps = await getDocs(qScripts);
        const deletePromises = scriptSnaps.docs.map(d => deleteDoc(doc(db, "scripts", d.id)));
        await Promise.all(deletePromises);
    } catch (e) {
        console.error("Error deleting banned user's scripts:", e);
    }

    alert(`User ${target} permanently banned and all their published scripts have been deleted!`);
};

window.adminUnbanUser = async function() {
    const target = document.getElementById('targetUnbanUsername').value.trim();
    if (!target) return;
    await setDoc(doc(db, "users", target.toLowerCase()), { isBanned: false }, { merge: true });
    alert(`User ${target} unbanned!`);
};

// MULTI-ROLE ASSIGNMENT (Admin, YT, Veteran, User)
window.devAssignRole = async function(newRole) {
    const userInput = document.getElementById('targetModUsername').value.trim();
    if (!userInput) return alert("Please enter a username!");
    const userId = userInput.toLowerCase();

    if (userId === 'volkteam') return alert("Cannot change Developer role!");

    const userRef = doc(db, "users", userId);
    await setDoc(userRef, { username: userInput, role: newRole }, { merge: true });

    alert(`User '${userInput}' was granted role: ${newRole.toUpperCase()}!`);
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
        card.className = `script-card ${script.isTrojan || script.isCopyrightBlocked ? 'trojan-flagged' : ''}`;
        card.onclick = () => window.viewScriptDetail(script.id);

        let titleText = script.title;
        if (script.isTrojan) titleText = `[DETECTED TROJAN] ${script.title}`;
        if (script.isCopyrightBlocked) titleText = `[COPYRIGHT STRIKE] ${script.title}`;
        
        const formattedAuthor = formatUserRoleBadge(script.author, script.authorRole);
        
        // Status and Key Badges
        const statusClass = script.status === 'Patched' ? 'status-patched' : 'status-working';
        const statusText = script.status || 'Working';
        const keyBadge = script.keySystem ? `<div class="key-system-badge">KEY SYSTEM</div>` : '';

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <div class="game-name"><i class="fa-solid fa-gamepad"></i> ${script.game}</div>
                <span class="status-badge ${statusClass}">${statusText}</span>
            </div>
            <h3>${titleText}</h3>
            ${keyBadge}
            <p style="color: var(--text-muted); font-size: 13px; margin: 6px 0;">${(script.desc || '').substring(0, 90)}...</p>
            <div class="script-meta">
                <span><i class="fa-solid fa-user"></i> ${formattedAuthor}</span>
                <span><i class="fa-solid fa-thumbs-up" style="color: var(--accent);"></i> ${script.likes || 0}</span>
                <span><i class="fa-solid fa-thumbs-down" style="color: var(--danger);"></i> ${script.dislikes || 0}</span>
                <span><i class="fa-solid fa-clock"></i> ${formatTimeAgo(script.createdAt)}</span>
            </div>
        `;
        container.appendChild(card);
    });
}

// SECURE COPY FUNCTION (NEW)
window.copyScriptPart = function(textPart) {
    const warningText = "This script not verify downoload this at your own risk\n\n";
    const finalCopy = warningText + textPart;
    navigator.clipboard.writeText(finalCopy).then(() => {
        alert('Script code chunk copied with warning!');
    });
};

window.viewScriptDetail = function(scriptId) {
    const script = allScripts.find(s => s.id === scriptId);
    if (!script) return;

    window.switchTab('detail');
    const container = document.getElementById('scriptDetailContent');

    let displayTitle = script.title;
    if (script.isTrojan) displayTitle = `[DETECTED TROJAN] ${script.title}`;
    if (script.isCopyrightBlocked) displayTitle = `[BLOCKED BY COPYRIGHT] ${script.title}`;

    const comments = script.comments || [];
    const formattedAuthor = formatUserRoleBadge(script.author, script.authorRole);

    const commentsHtml = comments.map(c => `
        <div class="comment-card">
            <div>
                <strong>${formatUserRoleBadge(c.user, c.role)}:</strong> ${c.text}
            </div>
            <span class="report-btn" onclick="reportSpam('comment', '${script.id}', '${c.user}')">
                <i class="fa-solid fa-flag"></i> Report
            </span>
        </div>
    `).join('') || '<p style="color: var(--text-muted); font-size: 13px;">No comments yet.</p>';

    const isAdminOrDev = (currentUser.role === 'admin' || currentUser.role === 'developer');
    const isOwner = currentUser.username === script.author;
    const isYoutuber = currentUser.role === 'youtuber';

    // CODE CHUNKING LOGIC FOR 600 MAX (NEW)
    let codeBlocksHtml = '';
    if (script.isTrojan || script.isCopyrightBlocked) {
        codeBlocksHtml = `<div class="code-block trojan-blocked"><i class="fa-solid fa-triangle-exclamation"></i> ACCESS BLOCKED (Trojan or Copyright).</div>`;
    } else {
        const chunkSize = 600;
        if (script.code.length > chunkSize) {
            codeBlocksHtml += `<p style="color: var(--warning); font-size: 12px;">Code is too long for some mobile devices. Split into multiple parts:</p>`;
            for (let i = 0; i < script.code.length; i += chunkSize) {
                const chunk = script.code.substring(i, i + chunkSize);
                const safeChunk = chunk.replace(/`/g, '\\`').replace(/'/g, "\\'").replace(/"/g, '&quot;');
                codeBlocksHtml += `
                    <div style="margin-bottom: 10px;">
                        <span style="font-size:12px; color:var(--text-muted);">Part ${Math.floor(i/chunkSize) + 1}</span>
                        <div class="code-block" style="margin: 5px 0;">${chunk}</div>
                        <button class="action-btn primary" onclick="copyScriptPart('${safeChunk}')">
                            <i class="fa-solid fa-copy"></i> Copy Part ${Math.floor(i/chunkSize) + 1}
                        </button>
                    </div>
                `;
            }
        } else {
            const safeCode = script.code.replace(/`/g, '\\`').replace(/'/g, "\\'").replace(/"/g, '&quot;');
            codeBlocksHtml = `
                <div class="code-block">${script.code}</div>
                <button class="action-btn primary" onclick="copyScriptPart('${safeCode}')">
                    <i class="fa-solid fa-copy"></i> Copy Script
                </button>
            `;
        }
    }

    const statusClass = script.status === 'Patched' ? 'status-patched' : 'status-working';
    const statusText = script.status || 'Working';

    container.innerHTML = `
        <div class="script-detail-box">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="color: var(--accent); font-size: 14px;"><i class="fa-solid fa-gamepad"></i> ${script.game}</span>
                <span class="status-badge ${statusClass}">${statusText}</span>
            </div>
            <h2>${displayTitle}</h2>
            ${script.keySystem ? `<div class="key-system-badge" style="margin-bottom:10px;">KEY SYSTEM REQUIRED</div>` : ''}
            <p style="color: var(--text-muted); font-size: 13px;">Author: <strong>${formattedAuthor}</strong> • ${formatTimeAgo(script.createdAt)}</p>
            
            <p style="margin: 15px 0;">${script.desc}</p>
            
            <div class="action-buttons">
                ${isOwner ? `
                    <button class="action-btn" style="background:#eab308; color:black; font-weight:bold; border:none;" onclick="openEditModal('${script.id}')">
                        <i class="fa-solid fa-pen"></i> Edit Script
                    </button>
                ` : ''}
                <button class="action-btn" onclick="likeScript('${script.id}')">
                    <i class="fa-solid fa-thumbs-up" style="color: var(--accent);"></i> Like (${script.likes || 0})
                </button>
                <button class="action-btn" onclick="dislikeScript('${script.id}')">
                    <i class="fa-solid fa-thumbs-down" style="color: var(--danger);"></i> Dislike (${script.dislikes || 0})
                </button>
                <button class="action-btn" onclick="reportSpam('script', '${script.id}', '${script.author}')">
                    <i class="fa-solid fa-flag" style="color:var(--danger);"></i> Report
                </button>
                ${isYoutuber ? `
                    <button class="action-btn" style="background:var(--yt-color); color:white; border:none;" onclick="ytStrikeScript('${script.id}', '${script.author}')">
                        <i class="fa-solid fa-gavel"></i> Copyright Strike
                    </button>
                ` : ''}
                ${isAdminOrDev ? `
                    <button class="action-btn warning" onclick="toggleVerifiedBadge('${script.id}')">Toggle Badge</button>
                    <button class="action-btn danger" onclick="toggleTrojanCheck('${script.id}')">Toggle Trojan</button>
                    <button class="action-btn danger" onclick="adminDeleteScript('${script.id}')">Delete</button>
                ` : ''}
            </div>

            ${codeBlocksHtml}

            <div class="comments-section">
                <h3>Comments (${comments.length})</h3>
                <div id="commentsList">${commentsHtml}</div>
                
                ${currentUser.role !== 'guest' ? `
                    <div class="comment-input-box">
                        <input type="text" id="commentInput" placeholder="Write a comment... (English only)">
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
        const formattedAuthor = formatUserRoleBadge(script.author, script.authorRole);

        card.innerHTML = `
            <div class="game-name"><i class="fa-solid fa-fire" style="color: #f97316;"></i> ${script.game}</div>
            <h3>${script.isTrojan || script.isCopyrightBlocked ? '[BLOCKED] ' : ''}${script.title}</h3>
            <div class="script-meta">
                <span><i class="fa-solid fa-user"></i> ${formattedAuthor}</span>
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
    if (tabId === 'govchat') listenToGovChat();
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
listenToUsers();
listenToScripts();
if (currentUser.username && currentUser.role !== 'guest') {
    monitorSession(currentUser.username);
}
