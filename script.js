/* =============================================
    WOORDMEESTER - APP LOGIC
    Integratie: Clerk (Auth) & Firebase (DB)
    =============================================
*/

// --- FIREBASE IMPORTS ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    query, 
    where, 
    deleteDoc, 
    doc,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- CLERK IMPORT (Via CDN Script in JS werkt anders, we gebruiken dynamische import) ---
import Clerk from 'https://cdn.jsdelivr.net/npm/@clerk/clerk-js@latest/dist/clerk.mjs';

// --- CONFIGURATIE ---
// LET OP: Normaal gesproken gebruik je Environment Variables.
const clerkPubKey = 'pk_test_bm9ibGUtZmVsaW5lLTgxLmNsZXJrLmFjY291bnRzLmRldiQ';

const firebaseConfig = {
  apiKey: "AIzaSyBtW4BpxiEUOkscWS0POVSSmY57qFFemnQ",
  authDomain: "website-woorden-leren.firebaseapp.com",
  projectId: "website-woorden-leren",
  storageBucket: "website-woorden-leren.firebasestorage.app",
  messagingSenderId: "681548303319",
  appId: "1:681548303319:web:05030d3639ebfaabe11992",
  measurementId: "G-JQ7HP8CJ04"
};

// --- INITIALISATIE ---
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

const clerk = new Clerk(clerkPubKey);
await clerk.load(); // Wacht tot Clerk geladen is

// --- STATE MANAGEMENT ---
const state = {
    user: null,
    currentList: null, // De lijst die we nu aan het bewerken of oefenen zijn
    practiceData: {
        words: [],
        currentIndex: 0,
        score: 0,
        mode: null // 'flashcard' of 'input'
    }
};

// --- DOM ELEMENTEN ---
const els = {
    views: document.querySelectorAll('.view'),
    authContainer: document.getElementById('auth-container'),
    loadingScreen: document.getElementById('loading-screen'),
    
    // Dashboard
    listsContainer: document.getElementById('lists-container'),
    btnCreate: document.getElementById('btn-create-new'),
    
    // Editor
    inputTitle: document.getElementById('list-title'),
    inputContent: document.getElementById('list-content'),
    btnSave: document.getElementById('btn-save-list'),
    wordCountBadge: document.getElementById('word-count-badge'),
    btnBackDash: document.getElementById('btn-back-dashboard'),
    
    // Practice Select
    btnBackDash2: document.getElementById('btn-back-dash-2'),
    practiceTitle: document.getElementById('practice-title-display'),
    modeFlash: document.getElementById('mode-flashcards'),
    modeInput: document.getElementById('mode-input'),
    
    // Flashcards
    card: document.getElementById('flashcard'),
    fcQuestion: document.getElementById('fc-question'),
    fcAnswer: document.getElementById('fc-answer'),
    fcProgress: document.getElementById('fc-progress'),
    btnFcNext: document.getElementById('btn-fc-next'),
    btnFcPrev: document.getElementById('btn-fc-prev'),

    // Input Game
    ipQuestion: document.getElementById('ip-question'),
    ipInput: document.getElementById('ip-input'),
    btnIpCheck: document.getElementById('btn-ip-check'),
    ipFeedback: document.getElementById('ip-feedback'),
    ipScore: document.getElementById('ip-score'),
    ipProgress: document.getElementById('ip-progress-bar'),
    ipResults: document.getElementById('ip-results'),
    ipFinalScore: document.getElementById('ip-final-score'),
    
    // General
    quitButtons: document.querySelectorAll('.btn-quit-practice'),
};

// --- HELPER FUNCTIES ---

function showView(viewId) {
    els.views.forEach(v => v.classList.remove('active', 'hidden'));
    document.getElementById(viewId).classList.add('active');
}

function showLoading(show) {
    if(show) els.loadingScreen.classList.remove('fade-out');
    else els.loadingScreen.classList.add('fade-out');
}

// --- AUTHENTICATIE LOGICA ---

async function updateAuthUI() {
    if (clerk.user) {
        state.user = clerk.user;
        // User is ingelogd
        els.authContainer.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px;">
                <span>Hoi, ${clerk.user.firstName || 'Student'}</span>
                <div id="user-button"></div>
            </div>
        `;
        clerk.mountUserButton(document.getElementById('user-button'));
        
        // Start app flow
        showView('view-dashboard');
        loadUserLists();
    } else {
        // User is niet ingelogd
        state.user = null;
        els.authContainer.innerHTML = `<button id="btn-login-nav" class="btn btn-primary">Inloggen</button>`;
        document.getElementById('btn-login-nav').addEventListener('click', () => clerk.openSignIn());
        
        // Hero button listener
        const heroBtn = document.getElementById('btn-login-hero');
        if(heroBtn) heroBtn.addEventListener('click', () => clerk.openSignUp());
        
        showView('view-landing');
    }
    showLoading(false);
}

// --- DATABASE LOGICA (FIRESTORE) ---

async function loadUserLists() {
    if(!state.user) return;
    
    els.listsContainer.innerHTML = '<div class="spinner"></div>';
    
    try {
        const q = query(
            collection(db, "lists"), 
            where("userId", "==", state.user.id)
        );
        const querySnapshot = await getDocs(q);
        
        els.listsContainer.innerHTML = ''; // Clear spinner
        
        if(querySnapshot.empty) {
            els.listsContainer.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1; text-align:center;">
                    <p>Je hebt nog geen lijsten.</p>
                    <p>Klik op "Nieuwe Lijst" om te beginnen!</p>
                </div>`;
            return;
        }

        querySnapshot.forEach((doc) => {
            const list = doc.data();
            const listEl = document.createElement('div');
            listEl.className = 'list-card';
            listEl.innerHTML = `
                <h3>${list.name}</h3>
                <div class="list-meta">${list.words.length} woorden</div>
                <div class="list-actions">
                    <button class="btn btn-primary btn-sm btn-practice" data-id="${doc.id}">
                        <i class="fa-solid fa-play"></i> Oefenen
                    </button>
                    <button class="btn btn-outline btn-sm btn-delete" data-id="${doc.id}">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `;
            
            // Event Listeners voor de knoppen in de kaart
            listEl.querySelector('.btn-practice').addEventListener('click', () => startPracticeSelection(doc.id, list));
            listEl.querySelector('.btn-delete').addEventListener('click', () => deleteList(doc.id));
            
            els.listsContainer.appendChild(listEl);
        });

    } catch (e) {
        console.error("Error loading lists: ", e);
        els.listsContainer.innerHTML = '<p class="text-danger">Er ging iets mis bij het laden.</p>';
    }
}

async function saveList(name, textContent) {
    if(!state.user) return;
    
    // Parse tekst naar objecten
    const lines = textContent.split('\n');
    const words = [];
    
    lines.forEach(line => {
        if(line.includes('|')) {
            const parts = line.split('|');
            if(parts[0].trim() && parts[1].trim()) {
                words.push({
                    q: parts[0].trim(), // Vraag
                    a: parts[1].trim()  // Antwoord
                });
            }
        }
    });

    if(words.length === 0) {
        alert("Geen geldige woorden gevonden. Gebruik het formaat: woord|betekenis");
        return;
    }

    try {
        await addDoc(collection(db, "lists"), {
            userId: state.user.id,
            name: name || "Naamloze lijst",
            words: words,
            createdAt: serverTimestamp()
        });
        
        // Reset en ga terug naar dashboard
        els.inputTitle.value = '';
        els.inputContent.value = '';
        showView('view-dashboard');
        loadUserLists();
        
    } catch (e) {
        console.error("Error adding document: ", e);
        alert("Kon lijst niet opslaan.");
    }
}

async function deleteList(docId) {
    if(confirm("Weet je zeker dat je deze lijst wilt verwijderen?")) {
        await deleteDoc(doc(db, "lists", docId));
        loadUserLists();
    }
}

// --- PARSING & EDITOR UI ---

els.inputContent.addEventListener('input', (e) => {
    const text = e.target.value;
    const count = (text.match(/\|/g) || []).length;
    els.wordCountBadge.textContent = `${count} paren herkend`;
});

els.btnCreate.addEventListener('click', () => showView('view-editor'));
els.btnBackDash.addEventListener('click', () => showView('view-dashboard'));
els.btnBackDash2.addEventListener('click', () => showView('view-dashboard'));
els.btnSave.addEventListener('click', () => {
    const title = els.inputTitle.value;
    const content = els.inputContent.value;
    if(!content) return alert("Vul wat woorden in!");
    saveList(title, content);
});

// --- OEFEN MODUS LOGICA ---

function startPracticeSelection(id, listData) {
    state.currentList = listData;
    els.practiceTitle.textContent = `Oefenen: ${listData.name}`;
    showView('view-practice-select');
}

// Setup Practice Start Listeners
els.modeFlash.addEventListener('click', () => initFlashcards());
els.modeInput.addEventListener('click', () => initInputGame());

// Algemene stop knop
els.quitButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        showView('view-dashboard');
    });
});

// 1. FLASHCARDS
function initFlashcards() {
    state.practiceData.words = shuffleArray([...state.currentList.words]);
    state.practiceData.currentIndex = 0;
    showView('view-flashcards');
    renderFlashcard();
}

function renderFlashcard() {
    const word = state.practiceData.words[state.practiceData.currentIndex];
    const total = state.practiceData.words.length;
    
    // Reset flip status
    els.card.classList.remove('flipped');
    
    // Update text na korte delay zodat je de overgang niet ziet tijdens flip reset
    setTimeout(() => {
        els.fcQuestion.textContent = word.q;
        els.fcAnswer.textContent = word.a;
        els.fcProgress.textContent = `${state.practiceData.currentIndex + 1} / ${total}`;
    }, 200);
}

els.card.addEventListener('click', () => {
    els.card.classList.toggle('flipped');
});

els.btnFcNext.addEventListener('click', () => {
    if(state.practiceData.currentIndex < state.practiceData.words.length - 1) {
        state.practiceData.currentIndex++;
        renderFlashcard();
    } else {
        alert("Einde van de stapel! Goed gedaan.");
        showView('view-dashboard');
    }
});

els.btnFcPrev.addEventListener('click', () => {
    if(state.practiceData.currentIndex > 0) {
        state.practiceData.currentIndex--;
        renderFlashcard();
    }
});

// 2. INPUT GAME
function initInputGame() {
    state.practiceData.words = shuffleArray([...state.currentList.words]);
    state.practiceData.currentIndex = 0;
    state.practiceData.score = 0;
    
    // UI Reset
    els.ipResults.classList.add('hidden');
    els.ipInput.value = '';
    els.ipFeedback.classList.add('hidden');
    
    showView('view-input-practice');
    renderInputQuestion();
}

function renderInputQuestion() {
    const word = state.practiceData.words[state.practiceData.currentIndex];
    els.ipQuestion.textContent = word.q;
    els.ipInput.value = '';
    els.ipInput.focus();
    els.ipScore.textContent = `Score: ${state.practiceData.score}`;
    
    // Progress bar update
    const pct = (state.practiceData.currentIndex / state.practiceData.words.length) * 100;
    els.ipProgress.style.width = `${pct}%`;
}

function checkAnswer() {
    const word = state.practiceData.words[state.practiceData.currentIndex];
    const input = els.ipInput.value.trim().toLowerCase();
    const correct = word.a.trim().toLowerCase();
    
    els.ipFeedback.classList.remove('hidden', 'correct', 'wrong');
    
    if (input === correct) {
        // GOED
        state.practiceData.score++;
        els.ipFeedback.textContent = "Correct! 🎉";
        els.ipFeedback.classList.add('correct');
        
        setTimeout(() => {
            els.ipFeedback.classList.add('hidden');
            nextInputQuestion();
        }, 1000);
    } else {
        // FOUT
        els.ipFeedback.textContent = `Fout! Het was: ${word.a}`;
        els.ipFeedback.classList.add('wrong');
        
        // Langer wachten bij fout zodat ze het antwoord kunnen lezen
        setTimeout(() => {
            els.ipFeedback.classList.add('hidden');
            nextInputQuestion();
        }, 2000);
    }
}

function nextInputQuestion() {
    state.practiceData.currentIndex++;
    if(state.practiceData.currentIndex < state.practiceData.words.length) {
        renderInputQuestion();
    } else {
        finishInputGame();
    }
}

function finishInputGame() {
    els.ipProgress.style.width = '100%';
    els.ipResults.classList.remove('hidden');
    els.ipFinalScore.textContent = `${state.practiceData.score} / ${state.practiceData.words.length}`;
}

els.btnIpCheck.addEventListener('click', checkAnswer);
els.ipInput.addEventListener('keypress', (e) => {
    if(e.key === 'Enter') checkAnswer();
});


// Utility: Shuffle Array (Fisher-Yates)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Start App
updateAuthUI();

// Event Listener voor Clerk Auth wijzigingen (als sessie verloopt etc)
// (Clerk JS handelt dit vaak intern af, maar updateAuthUI aanroepen bij init is veilig)
