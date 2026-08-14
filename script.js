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
   DYNAMIC UI INJECTION (NO HTML EDITS NEEDED)
   --------------------------------------------------------- */
function setupDynamicUI() {
    // 1. Inject Key System Checkbox in Upload Form
    const uploadFormBtn = document.getElementById('submitScriptBtn');
    if (uploadFormBtn && !document.getElementById('scriptHasKey')) {
        uploadFormBtn.insertAdjacentHTML('beforebegin', `
            <div class="form-group" style="display:flex; align-items:center; gap:10px; background:var(--bg-input); padding:10px; border-radius:6px;">
                <input type="checkbox" id="scriptHasKey" style="width:auto; transform:scale(1.3); accent-color: #f59e0b;">
                <label style="margin:0; color:#f59e0b; font-weight:bold; cursor:pointer;" for="scriptHasKey">Contains KEY SYSTEM</label>
            </div>
        `);
    }

    // 2. Inject Dev Panel Extensions (Youtuber / Veteran)
    const devSection = document.getElementById('devOnlySection');
    if (devSection && !document.getElementById('extraDevPanel')) {
        devSection.insertAdjacentHTML('beforeend', `
            <div id="extraDevPanel" style="margin-top: 15px; border-top: 1px solid var(--border-color); padding-top: 15px;">
                <h3><i class="fa-solid fa-medal"></i> Assign Special Roles</h3>
                <div class="form-group-inline">
                    <input type="text" id="targetSpecialRoleUser" placeholder="Username...">
                    <button class="action-btn" style="background:#3b82f6; color:white; border:none; font-weight:bold;" onclick="devAssignRole('youtube')">Grant YT</button>
                    <button class="action-btn" style="background:#6b7280; color:white; border:none; font-weight:bold;" onclick="devAssignRole('veteran')">Grant Veteran</button>
                    <button class="action-btn danger" onclick="devAssignRole('user')">Revoke</button>
                </div>
            </div>
        `);
    }

    // 3. Inject Government Chat Button in Header
    const navRight = document.querySelector('.nav-right');
    if (navRight && !document.getElementById('govChatBtn')) {
        navRight.insertAdjacentHTML('afterbegin', `
            <button id="govChatBtn" class="icon-btn" style="display:none; color:#f59e0b;" onclick="openGovChat()" title="Government Chat">
                <i class="fa-solid fa-building-shield"></i>
            </button>
        `);
    }

    // 4. Inject Government Chat Modal & Edit Script Modal
    if (!document.getElementById('govChatModal')) {
        document.body.insertAdjacentHTML('beforeend', `
            <div id="govChatModal" class="modal">
                <div class="modal-content" style="height:70vh; display:flex; flex-direction:column; max-width:500px;">
                    <span class="close-modal" onclick="closeGovChat()">&times;</span>
                    <h2><i class="fa-solid fa-building-shield" style="color:#f59e0b;"></i> Government Chat</h2>
                    <p style="font-size:12px; color:var(--text-muted); margin-top:-5px;">Private channel for Devs, Admins & YouTubers</p>
                    <div id="govChatMessages" style="flex:1; overflow-y:auto; background:var(--bg-main); padding:10px; border-radius:8px; margin:10px 0; border:1px solid var(--border-color); display:flex; flex-direction:column; gap:8px;"></div>
                    <div style="display:flex; gap:10px;">
                        <input type="text" id="govChatInput" placeholder="Write message..." style="flex:1; padding:10px; background:var(--bg-input); border:1px solid var(--border-color); color:white; border-radius:6px;">
                        <button class="action-btn primary" onclick="sendGovChatMessage()">Send</button>
                    </div>
                </div>
            </div>

            <div id="editScriptModal" class="modal">
                <div class="modal-content">
                    <span class="close-modal" onclick="closeEditModal()">&times;</span>
                    <h2>Edit Script</h2>
                    <input type="hidden" id="editScriptId">
                    <div class="form-group">
                        <label>Script Title</label>
                        <input type="text" id="editScriptTitle">
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <textarea id="editScriptDesc" rows="2"></textarea>
                    </div>
                    <div class="form-group">
                        <label>Lua Code</label>
                        <textarea id="editScriptCode" rows="4"></textarea>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
                        <div class="form-group" style="display:flex; align-items:center; gap:5px;">
                            <input type="checkbox" id="editScriptHasKey" style="accent-color:#f59e0b;"> 
                            <label style="margin:0; font-size:13px; color:#f59e0b; font-weight:bold;">KEY SYSTEM</label>
                        </div>
                        <div class="form-group" style="display:flex; align-items:center; gap:5px;">
                            <select id="editScriptStatus" style="background:var(--bg-input); color:white; border:1px solid var(--border-color); padding:5px; border-radius:4px;">
                                <option value="working">Working</option>
                                <option value="patched">Patched / Fixing</option>
                            </select>
                        </div>
                    </div>
                    <button class="submit-btn" onclick="saveEditedScript()">Save Changes</button>
                </div>
            </div>
        `);
    }
}
document.addEventListener('DOMContentLoaded', setupDynamicUI);
setupDynamicUI(); // Fallback if loaded late

/* ---------------------------------------------------------
   AI FILTERING & VALIDATION (NEW)
   --------------------------------------------------------- */
function runAIFilter(text) {
    if (!text) return false;
    const lower = text.toLowerCase();
    
    // 1. Language Check (Only English, Block Cyrillic)
    if (/[а-яА-ЯёЁ]/.test(lower)) {
        return "AI Security: Only English language is allowed in publications, comments, and names!";
    }
    
    // 2. Swear / Profanity Check
    const badWords = ['fuck', 'shit', 'bitch', 'asshole', 'dick', 'cunt', 'nigger', 'nigga', 'faggot', 'slut', 'whore'];
    for (let w of badWords) {
        if (lower.includes(w)) return "AI Security: Profanity/Bad words detected!";
    }
    
    // 3. Links Check
    const linkRegex = /(http:\/\/|https:\/\/|discord\.gg|youtube\.com|youtu\.be|t\.me|www\.)/i;
    if (linkRegex.test(lower)) {
        return "AI Security: External links (YouTube, Discord, Telegram, etc.) are strictly prohibited!";
    }
    
    return null; // Passed
}

function runAICodeCheck(code) {
    const textError = runAIFilter(code);
    if (textError) return textError;
    
    const lowerCode = code.toLowerCase();
    // Must contain valid Lua/Luau identifiers
    if (!lowerCode.includes("loadstring") && !lowerCode.includes("game:") && !lowerCode.includes("local ") && !lowerCode.includes("function")) {
        return "AI Security: Invalid script format! Only loadstring or valid Lua/Luau syntax is allowed.";
    }
    return null; // Passed
}

/* ---------------------------------------------------------
   UTILITY & TIME AGO FORMATTER
   --------------------------------------------------------- */
function formatTimeAgo(timestamp) {
    if (!timestamp) return "Just now";
    let date;
    if (timestamp.toDate) date = timestamp.toDate();
    else if (timestamp.seconds) date = new Date(timestamp.seconds * 1000);
    else date = new Date(timestamp);

    const seconds = Math.floor((new Date() - date) / 1000);
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

function formatUserRoleBadge(username, fallbackRole = 'user') {
    if (!username) return 'Guest';
    const lower = username.toLowerCase();
    
    if (lower === 'volkteam') return `${username} <span style="color: #22c55e; font-weight: bold;">(developer)</span>`;

    const role = userRolesCache[lower] || fallbackRole;

    if (role === 'developer') return `${username} <span style="color: #22c55e; font-weight: bold;">(developer)</span>`;
    if (role === 'admin') return `${username} <span style="color: #ef4444; font-weight: bold;">(admin)</span>`;
    if (role === 'youtube') return `${username} <span style="color: #3b82f6; font-weight: bold;">(YT)</span>`;
    if (role === 'veteran') return `${username} <span style="color: #9ca3af; font-weight: bold;">VETERAN</span>`;
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
            if (data.username) userRolesCache[data.username.toLowerCase()] = data.role || 'user';
        });
        if (activeTab === 'home') renderScripts();
        if (activeTab === 'trending') renderTrending();
    });
}

window.updateUIForRole = function() {
    const badge = document.getElementById('userBadge');
    const authBtn = document.getElementById('authActionBtn');
    const adminBtn = document.getElementById('adminPanelBtn');
    const govChatBtn = document.getElementById('govChatBtn');

    if (!badge || !authBtn || !adminBtn) return;

    // Gov Chat Visibility
    if (govChatBtn) {
        govChatBtn.style.display = ['developer', 'admin', 'youtube'].includes(currentUser.role) ? 'block' : 'none';
    }

    if (currentUser.role === 'guest') {
        badge.innerText = 'Guest';
        badge.style.borderColor = 'var(--border-color)';
        authBtn.innerText = 'Sign In';
        adminBtn.style.display = 'none';
    } else {
        authBtn.innerText = 'Sign Out';
        if (currentUser.role === 'developer') {
            badge.innerHTML = `<span style="color:var(--dev-color); font-weight:bold;">${currentUser.username} (developer)</span>`;
            adminBtn.style.display = 'block';
        } else if (currentUser.role === 'admin') {
            badge.innerHTML = `<span style="color:var(--admin-color); font-weight:bold;">${currentUser.username} (admin)</span>`;
            adminBtn.style.display = 'block';
        } else if (currentUser.role === 'youtube') {
            badge.innerHTML = `<span style="color:#3b82f6; font-weight:bold;">${currentUser.username} (YT)</span>`;
            adminBtn.style.display = 'none';
        } else if (currentUser.role === 'veteran') {
            badge.innerHTML = `<span style="color:#9ca3af; font-weight:bold;">${currentUser.username} VETERAN</span>`;
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
window.closeAuthModal = function() { document.getElementById('authModal').classList.remove('active'); };
window.performAuth = async function() {
    const user = document.getElementById('authUsername').value.trim();
    const pass = document.getElementById('authPassword').value.trim();

    if (!user) return alert("Please enter a username!");
    if (user.length > 10) return alert("Username cannot exceed 10 characters!");
    if (pass.length > 15) return alert("Password cannot exceed 15 characters!");

    // AI Check for Name
    const nameFilter = runAIFilter(user);
    if(nameFilter) return alert(nameFilter);

    const userId = user.toLowerCase();
    const userDocRef = doc(db, "users", userId);
    const userSnap = await getDoc(userDocRef);

    let role = 'user';

    if (userSnap.exists()) {
        const userData = userSnap.data();
        if (userData.isBanned) return alert("This username is permanently banned!");
        if (userData.password !== pass) return alert("This username is already taken! Incorrect password.");
        if (userData.activeSessionId) return alert("This account is currently in use on another device!");
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
            await updateDoc(doc(db, "users", currentUser.username.toLowerCase()), { activeSessionId: null });
        } catch (e) {}
    }
    if (sessionUnsubscribe) sessionUnsubscribe();
    if (govChatUnsubscribe) { govChatUnsubscribe(); govChatUnsubscribe = null; }
    
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
        allScripts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
    const hasKey = document.getElementById('scriptHasKey') ? document.getElementById('scriptHasKey').checked : false;

    // Run AI Filters
    const filterTitle = runAIFilter(title);
    if(filterTitle) return alert(filterTitle);
    
    const filterDesc = runAIFilter(desc);
    if(filterDesc) return alert(filterDesc);

    const filterCode = runAICodeCheck(code);
    if(filterCode) return alert(filterCode);

    try {
        await addDoc(collection(db, "scripts"), {
            title, game, desc, code,
            author: currentUser.username,
            authorRole: currentUser.role,
            hasKey: hasKey,
            status: 'working',
            likes: 0, dislikes: 0,
            likedBy: [], dislikedBy: [], strikes: [],
            isVerified: ['verified', 'developer', 'veteran'].includes(currentUser.role),
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
   EDIT SCRIPT FUNCTIONALITY (NEW)
   --------------------------------------------------------- */
window.openEditScript = function(scriptId) {
    const script = allScripts.find(s => s.id === scriptId);
    if (!script) return;

    document.getElementById('editScriptId').value = script.id;
    document.getElementById('editScriptTitle').value = script.title;
    document.getElementById('editScriptDesc').value = script.desc;
    document.getElementById('editScriptCode').value = script.code;
    
    if(document.getElementById('editScriptHasKey')) document.getElementById('editScriptHasKey').checked = script.hasKey || false;
    if(document.getElementById('editScriptStatus')) document.getElementById('editScriptStatus').value = script.status || 'working';

    document.getElementById('editScriptModal').classList.add('active');
};

window.closeEditModal = function() {
    document.getElementById('editScriptModal').classList.remove('active');
};

window.saveEditedScript = async function() {
    const scriptId = document.getElementById('editScriptId').value;
    const title = document.getElementById('editScriptTitle').value.trim();
    const desc = document.getElementById('editScriptDesc').value.trim();
    const code = document.getElementById('editScriptCode').value.trim();
    const hasKey = document.getElementById('editScriptHasKey').checked;
    const status = document.getElementById('editScriptStatus').value;

    const filterTitle = runAIFilter(title);
    if(filterTitle) return alert(filterTitle);
    const filterDesc = runAIFilter(desc);
    if(filterDesc) return alert(filterDesc);
    const filterCode = runAICodeCheck(code);
    if(filterCode) return alert(filterCode);

    try {
        await updateDoc(doc(db, "scripts", scriptId), { title, desc, code, hasKey, status });
        alert("Script updated successfully!");
        closeEditModal();
        window.viewScriptDetail(scriptId);
    } catch (e) {
        alert("Error saving: " + e.message);
    }
};

/* ---------------------------------------------------------
   COPY WITH SPLIT AND DISCLAIMER (NEW)
   --------------------------------------------------------- */
window.copyScriptCode = function(code, partIndex = 0) {
    const disclaimer = "This script not verify downoload this at your own risk\n\n";
    let textToCopy = code;
    
    if (partIndex === 1) {
        textToCopy = disclaimer + code.substring(0, Math.ceil(code.length / 2));
    } else if (partIndex === 2) {
        textToCopy = disclaimer + code.substring(Math.ceil(code.length / 2));
    } else {
        textToCopy = disclaimer + code;
    }
    
    navigator.clipboard.writeText(textToCopy).then(() => {
        alert("Script copied successfully!");
    }).catch(e => alert("Failed to copy!"));
};

/* ---------------------------------------------------------
   YOUTUBE STRIKE SYSTEM (NEW)
   --------------------------------------------------------- */
window.strikeScript = async function(scriptId, authorName) {
    if (currentUser.role !== 'youtube') return alert("Only YouTubers can issue strikes!");
    
    const scriptRef = doc(db, "scripts", scriptId);
    const snap = await getDoc(scriptRef);
    if (!snap.exists()) return;
    
    const data = snap.data();
    const strikes = data.strikes || [];
    
    if (strikes.includes(currentUser.username)) return alert("You already filed a copyright strike against this script!");
    
    strikes.push(currentUser.username);
    await updateDoc(scriptRef, { strikes });
    alert("Copyright Strike applied!");
    
    // Check if author has 3 strikes across all their scripts
    const q = query(collection(db, "scripts"), where("author", "==", authorName));
    const userScripts = await getDocs(q);
    
    let strikedCount = 0;
    userScripts.forEach(d => {
        if (d.id === scriptId) {
            strikedCount++; // Count the one we just updated
        } else if (d.data().strikes && d.data().strikes.length > 0) {
            strikedCount++;
        }
    });
    
    if (strikedCount >= 3) {
        const delPromises = userScripts.docs.map(d => deleteDoc(doc(db, "scripts", d.id)));
        await Promise.all(delPromises);
        alert(`User ${authorName} received 3 copyright strikes! All their scripts have been automatically deleted.`);
        window.switchTab('home');
    } else {
        window.viewScriptDetail(scriptId);
    }
};
/* ---------------------------------------------------------
   GOVERNMENT CHAT SYSTEM (NEW)
   --------------------------------------------------------- */
window.openGovChat = function() {
    document.getElementById('govChatModal').classList.add('active');
    const chatBox = document.getElementById('govChatMessages');
    
    const q = query(collection(db, "gov_chat"), orderBy("createdAt", "asc"));
    govChatUnsubscribe = onSnapshot(q, (snapshot) => {
        chatBox.innerHTML = '';
        snapshot.docs.forEach(d => {
            const data = d.data();
            chatBox.innerHTML += `<div style="font-size:14px; background:var(--bg-card); padding:8px; border-radius:6px;"><strong>${formatUserRoleBadge(data.author, data.role)}:</strong> ${data.text}</div>`;
        });
        chatBox.scrollTop = chatBox.scrollHeight;
    });
};

window.closeGovChat = function() {
    document.getElementById('govChatModal').classList.remove('active');
    if (govChatUnsubscribe) { govChatUnsubscribe(); govChatUnsubscribe = null; }
};

window.sendGovChatMessage = async function() {
    const input = document.getElementById('govChatInput');
    const text = input.value.trim();
    if (!text) return;
    
    const aiCheck = runAIFilter(text);
    if(aiCheck) return alert(aiCheck);
    
    await addDoc(collection(db, "gov_chat"), {
        author: currentUser.username,
        role: currentUser.role,
        text: text,
        createdAt: serverTimestamp()
    });
    input.value = '';
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

        if (likedBy.includes(currentUser.username) || dislikedBy.includes(currentUser.username)) return alert("You already voted!");
        await updateDoc(scriptRef, { likes: (data.likes || 0) + 1, likedBy: arrayUnion(currentUser.username) });
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

        if (likedBy.includes(currentUser.username) || dislikedBy.includes(currentUser.username)) return alert("You already voted!");
        await updateDoc(scriptRef, { dislikes: (data.dislikes || 0) + 1, dislikedBy: arrayUnion(currentUser.username) });
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

    const filterTxt = runAIFilter(text);
    if(filterTxt) return alert(filterTxt);

    const scriptRef = doc(db, "scripts", scriptId);
    const scriptSnap = await getDoc(scriptRef);

    if (scriptSnap.exists()) {
        const comments = scriptSnap.data().comments || [];
        comments.push({ user: currentUser.username, role: currentUser.role, text: text, time: new Date().toISOString() });
        await updateDoc(scriptRef, { comments });
        input.value = '';
        window.viewScriptDetail(scriptId);
    }
};

window.reportSpam = async function(targetType, targetId, authorName) {
    await addDoc(collection(db, "reports"), { type: targetType, targetId, author: authorName, reporter: currentUser.username, createdAt: serverTimestamp() });
    alert("Report sent to moderation team!");
};

window.handleSupportSubmit = async function(event) {
    event.preventDefault();
    const subject = document.getElementById('supportSubject').value.trim();
    const message = document.getElementById('supportMessage').value.trim();
    if (!subject || !message) return;
    
    const fSub = runAIFilter(subject);
    if(fSub) return alert(fSub);
    const fMsg = runAIFilter(message);
    if(fMsg) return alert(fMsg);

    await addDoc(collection(db, "tickets"), { author: currentUser.username, subject, message, createdAt: serverTimestamp() });
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
window.closeAdminModal = function() { document.getElementById('adminModal').classList.remove('active'); };

window.adminBanUser = async function() {
    const target = document.getElementById('targetBanUsername').value.trim();
    if (!target) return;
    const targetId = target.toLowerCase();
    if (targetId === 'volkteam') return alert("Error: You cannot ban the developer!");

    const targetRef = doc(db, "users", targetId);
    const targetSnap = await getDoc(targetRef);
    if (targetSnap.exists() && (targetSnap.data().role === 'admin' || targetSnap.data().role === 'developer')) {
        return alert("Error: Admins cannot ban other admins or developers!");
    }

    await setDoc(targetRef, { isBanned: true }, { merge: true });

    try {
        const qScripts = query(collection(db, "scripts"), where("author", "==", target));
        const scriptSnaps = await getDocs(qScripts);
        await Promise.all(scriptSnaps.docs.map(d => deleteDoc(doc(db, "scripts", d.id))));
    } catch (e) {}
    alert(`User ${target} permanently banned and scripts deleted!`);
};

window.adminUnbanUser = async function() {
    const target = document.getElementById('targetUnbanUsername').value.trim();
    if (!target) return;
    await setDoc(doc(db, "users", target.toLowerCase()), { isBanned: false }, { merge: true });
    alert(`User ${target} unbanned!`);
};

window.devAssignModerator = async function() {
    const userInput = document.getElementById('targetModUsername').value.trim();
    if (!userInput) return alert("Please enter a username!");
    if (userInput.toLowerCase() === 'volkteam') return;
    await setDoc(doc(db, "users", userInput.toLowerCase()), { username: userInput, role: 'admin' }, { merge: true });
    alert(`User '${userInput}' was granted ADMIN status!`);
};

window.devRemoveModerator = async function() {
    const userInput = document.getElementById('targetModUsername').value.trim();
    if (!userInput) return alert("Please enter a username!");
    if (userInput.toLowerCase() === 'volkteam') return;
    await setDoc(doc(db, "users", userInput.toLowerCase()), { role: 'user' }, { merge: true });
    alert(`ADMIN status revoked for '${userInput}'!`);
};

window.devAssignRole = async function(roleName) {
    const userInput = document.getElementById('targetSpecialRoleUser').value.trim();
    if (!userInput) return alert("Please enter a username!");
    if (userInput.toLowerCase() === 'volkteam') return alert("Cannot change Dev role.");
    
    await setDoc(doc(db, "users", userInput.toLowerCase()), { username: userInput, role: roleName }, { merge: true });
    alert(`User '${userInput}' role updated to: ${roleName.toUpperCase()}`);
};

window.toggleVerifiedBadge = async function(scriptId) {
    const scriptRef = doc(db, "scripts", scriptId);
    const snap = await getDoc(scriptRef);
    if (snap.exists()) {
        await updateDoc(scriptRef, { isVerified: !snap.data().isVerified });
        window.viewScriptDetail(scriptId);
    }
};

window.toggleTrojanCheck = async function(scriptId) {
    const scriptRef = doc(db, "scripts", scriptId);
    const snap = await getDoc(scriptRef);
    if (snap.exists()) {
        await updateDoc(scriptRef, { isTrojan: !snap.data().isTrojan });
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

        let titleText = script.title;
        if (script.isTrojan) titleText = `[DETECTED TROJAN] ${titleText}`;
        else if (script.status === 'patched') titleText = `[PATCHED] ${titleText}`;

        const formattedAuthor = formatUserRoleBadge(script.author, script.authorRole);
        const keySystemHtml = script.hasKey ? `<span style="background:rgba(245,158,11,0.2); color:#f59e0b; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:bold; margin-left:8px;">KEY SYSTEM</span>` : '';

        card.innerHTML = `
            <div class="game-name"><i class="fa-solid fa-gamepad"></i> ${script.game} ${keySystemHtml}</div>
            <h3 style="${script.status === 'patched' ? 'color:var(--danger);' : ''}">${titleText}</h3>
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

window.viewScriptDetail = function(scriptId) {
    const script = allScripts.find(s => s.id === scriptId);
    if (!script) return;

    window.switchTab('detail');
    const container = document.getElementById('scriptDetailContent');

    let displayTitle = script.title;
    if (script.isTrojan) displayTitle = `[DETECTED TROJAN] ${displayTitle}`;
    else if (script.status === 'patched') displayTitle = `[PATCHED] ${displayTitle}`;

    const comments = script.comments || [];
    const formattedAuthor = formatUserRoleBadge(script.author, script.authorRole);
    const keySystemHtml = script.hasKey ? `<div style="color:#f59e0b; font-size:13px; font-weight:bold; margin-top:5px; margin-bottom:10px;"><i class="fa-solid fa-key"></i> REQUIRES KEY SYSTEM</div>` : '';
    const patchedHtml = script.status === 'patched' ? `<div style="color:var(--danger); font-size:13px; font-weight:bold; margin-top:5px; margin-bottom:10px;"><i class="fa-solid fa-wrench"></i> SCRIPT IS CURRENTLY PATCHED</div>` : '';

    let actionButtons = `
        <button class="action-btn" onclick="likeScript('${script.id}')"><i class="fa-solid fa-thumbs-up" style="color:var(--accent);"></i> ${script.likes || 0}</button>
        <button class="action-btn" onclick="dislikeScript('${script.id}')"><i class="fa-solid fa-thumbs-down" style="color:var(--danger);"></i> ${script.dislikes || 0}</button>
    `;

    // Script Author Options (Edit)
    if (currentUser.username === script.author) {
        actionButtons += `<button class="action-btn" onclick="openEditScript('${script.id}')"><i class="fa-solid fa-pen"></i> Edit</button>`;
    }

    // Youtube Strike Action
    if (currentUser.role === 'youtube') {
        const hasStriked = (script.strikes || []).includes(currentUser.username);
        if(!hasStriked) {
            actionButtons += `<button class="action-btn danger" onclick="strikeScript('${script.id}', '${script.author}')"><i class="fa-solid fa-gavel"></i> Strike</button>`;
        }
    }

    let devAdminControls = '';
    if (['admin', 'developer'].includes(currentUser.role)) {
        devAdminControls = `
            <div style="background: var(--bg-card); padding: 15px; border-radius: 8px; margin-top: 20px; border: 1px solid var(--danger);">
                <h4 style="margin: 0 0 10px 0; color: var(--danger);"><i class="fa-solid fa-shield-halved"></i> Mod Actions</h4>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button class="action-btn" onclick="toggleVerifiedBadge('${script.id}')"><i class="fa-solid fa-check-circle" style="color:#10b981;"></i> Toggle Verified</button>
                    <button class="action-btn danger" onclick="toggleTrojanCheck('${script.id}')"><i class="fa-solid fa-bug"></i> Toggle Trojan</button>
                    <button class="action-btn danger" onclick="adminDeleteScript('${script.id}')"><i class="fa-solid fa-trash"></i> Delete Script</button>
                </div>
            </div>
        `;
    }

    let reportControls = '';
    if (currentUser.role !== 'guest') {
        reportControls = `
            <div style="margin-top:15px;">
                <button class="action-btn danger" onclick="reportSpam('script', '${script.id}', '${script.author}')" style="font-size:12px; padding: 6px 10px;"><i class="fa-solid fa-flag"></i> Report this script</button>
            </div>
        `;
    }

    let copyButtons = "";
    if (!script.isTrojan) {
        const safeCode = script.code.replace(/`/g, '\\`');
        if (script.code.length > 620) {
            copyButtons = `
                <div style="display:flex; gap:10px; width:100%;">
                    <button class="action-btn primary" style="flex:1;" onclick="copyScriptCode(\`${safeCode}\`, 1)"><i class="fa-solid fa-copy"></i> Copy Part 1</button>
                    <button class="action-btn primary" style="flex:1;" onclick="copyScriptCode(\`${safeCode}\`, 2)"><i class="fa-solid fa-copy"></i> Copy Part 2</button>
                </div>
                <div style="font-size:11px; color:var(--text-muted); margin-top:5px; text-align:center;">Code exceeds 620 chars, split into 2 parts for mobile copy.</div>
            `;
        } else {
            copyButtons = `<button class="action-btn primary" style="width:100%;" onclick="copyScriptCode(\`${safeCode}\`, 0)"><i class="fa-solid fa-copy"></i> Copy Code</button>`;
        }
    } else {
        copyButtons = `<button class="action-btn danger" disabled style="opacity:0.6; width:100%;"><i class="fa-solid fa-lock"></i> Blocked (Trojan)</button>`;
    }

    container.innerHTML = `
        <h2 style="${script.status === 'patched' ? 'color:var(--danger);' : ''}">${displayTitle} ${script.isVerified ? '<span class="badge-verified">✔️</span>' : ''}</h2>
        ${patchedHtml}
        ${keySystemHtml}
        <div style="color: var(--text-muted); font-size: 14px; margin-bottom: 10px;">
            <i class="fa-solid fa-gamepad"></i> ${script.game} | 
            <i class="fa-solid fa-user"></i> ${formattedAuthor} | 
            <i class="fa-solid fa-clock"></i> ${formatTimeAgo(script.createdAt)}
        </div>
        <p style="white-space: pre-wrap; line-height: 1.5; margin-bottom: 20px;">${script.desc}</p>
        
        <div class="code-box">
            ${script.isTrojan ? '<div style="color:var(--danger); text-align:center; padding:20px;"><i class="fa-solid fa-skull fa-2x"></i><br>Code hidden. This script has been flagged as a trojan/malware by moderators.</div>' : `<pre><code>${script.code}</code></pre>`}
        </div>
        
        <div style="display: flex; gap: 10px; margin-top: 10px; flex-wrap:wrap;">
            ${actionButtons}
            ${copyButtons}
        </div>
        ${devAdminControls}
        ${reportControls}

        <h3 style="margin-top: 30px;"><i class="fa-solid fa-comments"></i> Comments (${comments.length})</h3>
        <div class="comments-section" style="margin-top: 10px;">
            <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                <input type="text" id="commentInput" placeholder="${currentUser.role === 'guest' ? 'Sign in to comment' : 'Add a comment...'}" style="flex:1; padding:10px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-input); color:white;" ${currentUser.role === 'guest' ? 'disabled' : ''}>
                <button class="action-btn primary" onclick="addComment('${script.id}')" ${currentUser.role === 'guest' ? 'disabled' : ''}>Post</button>
            </div>
            <div id="commentsList" style="display:flex; flex-direction:column; gap:10px;">
                ${comments.length === 0 ? '<p style="color:var(--text-muted); font-size:14px;">No comments yet.</p>' : ''}
                ${comments.slice().reverse().map(c => `
                    <div class="comment-card">
                        <div>
                            <strong>${formatUserRoleBadge(c.user, c.role)}</strong>
                            <span style="color:var(--text-muted); font-size:12px; margin-left:10px;">${formatTimeAgo(c.time)}</span>
                            <p style="margin:5px 0 0 0;">${c.text}</p>
                        </div>
                        ${currentUser.role !== 'guest' ? `<button class="icon-btn danger" onclick="reportSpam('comment', '${script.id}', '${c.user}')" title="Report Comment"><i class="fa-solid fa-flag"></i></button>` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
};

/* ---------------------------------------------------------
   TABS AND TRENDING
   --------------------------------------------------------- */
function renderTrending() {
    const con