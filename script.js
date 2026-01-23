/* =============================================
    WOORDMEESTER - APP LOGIC (FIXED)
    =============================================
*/

// --- FIREBASE IMPORTS ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, collection, addDoc, getDocs, 
    query, where, deleteDoc, doc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- CONFIGURATIE ---
const firebaseConfig = {
  apiKey: "AIzaSyBtW4BpxiEUOkscWS0POVSSmY57qFFemnQ",
  authDomain: "website-woorden-leren.firebaseapp.com",
  projectId: "website-woorden-leren",
  storageBucket: "website-woorden-leren.firebasestorage.app",
  messagingSenderId: "681548303319",
  appId: "1:681548303319:web:05030d3639ebfaabe11992",
  measurementId: "G-JQ7HP8CJ04"
};

// Variabelen
let db;
let clerk = null;
let user = null;

// State Management
const state = {
    currentList: null,
    practiceData: { words: [], currentIndex: 0, score: 0 }
};

// DOM Elementen
const els = {
    loadingScreen: document.getElementById('loading-screen'),
    loadingText: document.getElementById('loading-text'),
    errorFallback: document.getElementById('error-fallback'),
    btnForceLoad: document.getElementById('btn-force-load'),
    authContainer: document.getElementById('auth-container'),
    views: document.querySelectorAll('.view'),
    // Dashboard & Editor
    listsContainer: document.getElementById('lists-container'),
    btnCreate: document.getElementById('btn-create-new'),
    inputTitle: document.getElementById('list-title'),
    inputContent: document.getElementById('list-content'),
    btnSave: document.getElementById('btn-save-list'),
    wordCountBadge: document.getElementById('word-count-badge'),
    btnBackDash: document.getElementById('btn-back-dashboard'),
    // Practice
    btnBackDash2: document.getElementById('btn-back-dash-2'),
    practiceTitle: document.getElementById('practice-title-display'),
    modeFlash: document.getElementById('mode-flashcards'),
    modeInput: document.getElementById('mode-input'),
    // Flashcard UI
    card: document.getElementById('flashcard'),
    fcQuestion: document.getElementById('fc-question'),
    fcAnswer: document.getElementById('fc-answer'),
    fcProgress: document.getElementById('fc-progress'),
    btnFcNext: document.getElementById('btn-fc-next'),
    btnFcPrev: document.getElementById('btn-fc-prev'),
    // Input Game UI
    ipQuestion: document.getElementById('ip-question'),
    ipInput: document.getElementById('ip-input'),
    btnIpCheck: document.getElementById('btn-ip-check'),
    ipFeedback: document.getElementById('ip-feedback'),
    ipScore: document.getElementById('ip-score'),
    ipProgress: document.getElementById('ip-progress-bar'),
    ipResults: document.getElementById('ip-results'),
    ipFinalScore: document.getElementById('ip-final-score'),
    quitButtons: document.querySelectorAll('.btn-quit-practice'),
};

// --- INITIALISATIE MET ERROR HANDLING ---

async function initApp() {
    console.log("App initialisatie gestart...");
    
    // Timeout timer: als laden te lang duurt, toon error knop
    const timeoutTimer = setTimeout(() => {
        if(!els.loadingScreen.classList.contains('fade-out')) {
            console.warn("Laden duurt lang...");
            els.errorFallback.classList.remove('hidden');
            els.loadingText.textContent = "Verbinding duurt langer dan verwacht...";
        }
    }, 4000);

    try {
        // 1. Firebase Starten
        console.log("Firebase initialiseren...");
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        console.log("Firebase OK.");

        // 2. Wachten op Clerk (via script tag)
        console.log("Wachten op Clerk...");
        if (!window.Clerk) {
            await new Promise((resolve) => {
                const checkClerk = setInterval(() => {
                    if (window.Clerk) {
                        clearInterval(checkClerk);
                        resolve();
                    }
                }, 100);
            });
        }
        
        clerk = window.Clerk;
        console.log("Clerk gevonden. Laden...");
        await clerk.load();
        console.log("Clerk geladen.");

        clearTimeout(timeoutTimer); // Timer stoppen, alles is gelukt
        updateAuthUI();

    } catch (error) {
        console.error("FATALE FOUT BIJ STARTEN:", error);
        els.loadingText.textContent = "Er ging iets mis: " + error.message;
        els.errorFallback.classList.remove('hidden');
    }
}

// Forceer laden knop (voor nood)
els.btnForceLoad.addEventListener('click', () => {
    els.loadingScreen.classList.add('fade-out');
    console.log("Laden geforceerd door gebruiker.");
});


// --- AUTHENTICATIE UI ---

function updateAuthUI() {
    // Verwijder laadscherm
    els.loadingScreen.classList.add('fade-out');

    if (clerk.user) {
        user = clerk.user;
        console.log("Gebruiker ingelogd:", user.firstName);
        
        els.authContainer.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px;">
                <span>Hoi, ${user.firstName || 'Student'}</span>
                <div id="user-button"></div>
            </div>
        `;
        clerk.mountUserButton(document.getElementById('user-button'));
        
        showView('view-dashboard');
        loadUserLists();
    } else {
        console.log("Geen gebruiker ingelogd.");
        user = null;
        els.authContainer.innerHTML = `<button id="btn-login-nav" class="btn btn-primary">Inloggen</button>`;
        
        // Listeners opnieuw koppelen omdat innerHTML is overschreven
        document.getElementById('btn-login-nav').addEventListener('click', () => clerk.openSignIn());
        const heroBtn = document.getElementById('btn-login-hero');
        if(heroBtn) heroBtn.onclick = () => clerk.openSignUp(); // Gebruik onclick voor zekerheid
        
        showView('view-landing');
    }
}


// --- VIEW NAVIGATIE ---

function showView(viewId) {
    els.views.forEach(v => v.classList.remove('active', 'hidden'));
    document.getElementById(viewId).classList.add('active');
}


// --- FIRESTORE LOGICA ---

async function loadUserLists() {
    if(!user) return;
    console.log("Lijsten ophalen voor:", user.id);
    
    els.listsContainer.innerHTML = '<div class="spinner"></div>';

    try {
        const q = query(collection(db, "lists"), where("userId", "==", user.id));
        const querySnapshot = await getDocs(q);
        
        els.listsContainer.innerHTML = ''; 

        if(querySnapshot.empty) {
            els.listsContainer.innerHTML = `<div class="empty-state" style="grid-column:1/-1;text-align:center;"><p>Geen lijsten gevonden.</p></div>`;
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const list = docSnap.data();
            const div = document.createElement('div');
            div.className = 'list-card';
            div.innerHTML = `
                <h3>${list.name}</h3>
                <div class="list-meta">${list.words.length} woorden</div>
                <div class="list-actions">
                    <button class="btn btn-primary btn-sm btn-practice">Oefenen</button>
                    <button class="btn btn-outline btn-sm btn-delete"><i class="fa-solid fa-trash"></i></button>
                </div>
            `;
            // Listeners direct op de elementen (veiliger)
            div.querySelector('.btn-practice').onclick = () => startPracticeSelection(docSnap.id, list);
            div.querySelector('.btn-delete').onclick = () => deleteList(docSnap.id);
            
            els.listsContainer.appendChild(div);
        });

    } catch (e) {
        console.error("Fout bij laden lijsten:", e);
        els.listsContainer.innerHTML = `<p style="color:red">Fout bij laden.</p>`;
    }
}

async function saveList(name, content) {
    if(!user) return;
    
    const lines = content.split('\n');
    const words = [];
    lines.forEach(line => {
        const parts = line.split('|');
        if(parts.length >= 2 && parts[0].trim() && parts[1].trim()) {
            words.push({ q: parts[0].trim(), a: parts[1].trim() });
        }
    });

    if(words.length === 0) return alert("Geen geldige woorden (gebruik | teken)");

    try {
        await addDoc(collection(db, "lists"), {
            userId: user.id,
            name: name || "Naamloze lijst",
            words: words,
            createdAt: serverTimestamp()
        });
        
        els.inputTitle.value = '';
        els.inputContent.value = '';
        els.wordCountBadge.textContent = '0 woorden herkend';
        
        showView('view-dashboard');
        loadUserLists();
    } catch (e) {
        console.error("Save error:", e);
        alert("Opslaan mislukt: " + e.message);
    }
}

async function deleteList(id) {
    if(confirm("Lijst verwijderen?")) {
        await deleteDoc(doc(db, "lists", id));
        loadUserLists();
    }
}


// --- UI EVENT LISTENERS ---

// Navigatie
els.btnCreate.addEventListener('click', () => showView('view-editor'));
els.btnBackDash.addEventListener('click', () => showView('view-dashboard'));
els.btnBackDash2.addEventListener('click', () => showView('view-dashboard'));
els.quitButtons.forEach(b => b.addEventListener('click', () => showView('view-dashboard')));

// Editor
els.inputContent.addEventListener('input', (e) => {
    const count = (e.target.value.match(/\|/g) || []).length;
    els.wordCountBadge.textContent = `${count} paren herkend`;
});
els.btnSave.addEventListener('click', () => {
    saveList(els.inputTitle.value, els.inputContent.value);
});

// Practice Modes Starten
function startPracticeSelection(id, listData) {
    state.currentList = listData;
    els.practiceTitle.textContent = `Oefenen: ${listData.name}`;
    showView('view-practice-select');
}

els.modeFlash.addEventListener('click', () => {
    setupPractice();
    showView('view-flashcards');
    renderFlashcard();
});

els.modeInput.addEventListener('click', () => {
    setupPractice();
    els.ipResults.classList.add('hidden');
    els.ipFeedback.classList.add('hidden');
    state.practiceData.score = 0;
    showView('view-input-practice');
    renderInputQuestion();
});

function setupPractice() {
    // Shuffle
    const arr = [...state.currentList.words];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    state.practiceData.words = arr;
    state.practiceData.currentIndex = 0;
}


// --- FLASHCARDS LOGICA ---

function renderFlashcard() {
    const word = state.practiceData.words[state.practiceData.currentIndex];
    els.card.classList.remove('flipped');
    
    // Korte delay voor smooth effect
    setTimeout(() => {
        els.fcQuestion.textContent = word.q;
        els.fcAnswer.textContent = word.a;
        els.fcProgress.textContent = `${state.practiceData.currentIndex + 1} / ${state.practiceData.words.length}`;
    }, 200);
}

els.card.addEventListener('click', () => els.card.classList.toggle('flipped'));
els.btnFcNext.addEventListener('click', () => {
    if(state.practiceData.currentIndex < state.practiceData.words.length - 1) {
        state.practiceData.currentIndex++;
        renderFlashcard();
    } else {
        alert("Klaar!");
        showView('view-dashboard');
    }
});
els.btnFcPrev.addEventListener('click', () => {
    if(state.practiceData.currentIndex > 0) {
        state.practiceData.currentIndex--;
        renderFlashcard();
    }
});


// --- INPUT GAME LOGICA ---

function renderInputQuestion() {
    const word = state.practiceData.words[state.practiceData.currentIndex];
    els.ipQuestion.textContent = word.q;
    els.ipInput.value = '';
    els.ipInput.focus();
    els.ipScore.textContent = `Score: ${state.practiceData.score}`;
    
    const pct = (state.practiceData.currentIndex / state.practiceData.words.length) * 100;
    els.ipProgress.style.width = `${pct}%`;
}

function checkInput() {
    const word = state.practiceData.words[state.practiceData.currentIndex];
    const val = els.ipInput.value.trim().toLowerCase();
    const ans = word.a.trim().toLowerCase();
    
    els.ipFeedback.classList.remove('hidden', 'correct', 'wrong');
    
    if(val === ans) {
        state.practiceData.score++;
        els.ipFeedback.textContent = "Correct! 🎉";
        els.ipFeedback.classList.add('correct');
        setTimeout(() => {
            els.ipFeedback.classList.add('hidden');
            nextInput();
        }, 1000);
    } else {
        els.ipFeedback.textContent = `Fout! Het was: ${word.a}`;
        els.ipFeedback.classList.add('wrong');
        setTimeout(() => {
            els.ipFeedback.classList.add('hidden');
            nextInput();
        }, 2500);
    }
}

function nextInput() {
    state.practiceData.currentIndex++;
    if(state.practiceData.currentIndex < state.practiceData.words.length) {
        renderInputQuestion();
    } else {
        els.ipProgress.style.width = '100%';
        els.ipResults.classList.remove('hidden');
        els.ipFinalScore.textContent = `${state.practiceData.score} / ${state.practiceData.words.length}`;
    }
}

els.btnIpCheck.addEventListener('click', checkInput);
els.ipInput.addEventListener('keypress', (e) => { if(e.key==='Enter') checkInput(); });

// --- START APP ---
initApp();
