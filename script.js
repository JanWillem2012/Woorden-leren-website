import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, deleteDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBtW4BpxiEUOkscWS0POVSSmY57qFFemnQ",
  authDomain: "website-woorden-leren.firebaseapp.com",
  projectId: "website-woorden-leren",
  storageBucket: "website-woorden-leren.firebasestorage.app",
  messagingSenderId: "681548303319",
  appId: "1:681548303319:web:05030d3639ebfaabe11992",
  measurementId: "G-JQ7HP8CJ04"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
let clerk, user = null;

const state = { currentList: null, practiceData: { words: [], currentIndex: 0, score: 0 } };

// DOM Elements
const views = document.querySelectorAll('.view');
const loading = document.getElementById('loading-screen');

async function init() {
    if (!window.Clerk) return setTimeout(init, 100);
    clerk = window.Clerk;
    await clerk.load();
    
    if (clerk.user) {
        user = clerk.user;
        renderAuthUI(true);
        showView('view-dashboard');
        loadData();
    } else {
        renderAuthUI(false);
        showView('view-landing');
    }
    loading.classList.add('fade-out');
}

function renderAuthUI(isLoggedIn) {
    const container = document.getElementById('auth-container');
    if (isLoggedIn) {
        container.innerHTML = `<div id="user-button"></div>`;
        clerk.mountUserButton(document.getElementById('user-button'));
        document.getElementById('welcome-msg').textContent = `Hoi, ${user.firstName || 'Student'}! 👋`;
    } else {
        container.innerHTML = `<button id="btn-login" class="btn btn-primary">Log in</button>`;
        document.getElementById('btn-login').onclick = () => clerk.openSignIn();
        document.getElementById('btn-login-hero').onclick = () => clerk.openSignUp();
    }
}

function showView(id) {
    views.forEach(v => v.classList.add('hidden'));
    views.forEach(v => v.classList.remove('active'));
    document.getElementById(id).classList.remove('hidden');
    document.getElementById(id).classList.add('active');
}

// OCR LOGICA (FOTO NAAR TEKST)
document.getElementById('ocr-upload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const status = document.getElementById('ocr-status');
    const perc = document.getElementById('ocr-perc');
    status.classList.remove('hidden');

    try {
        const result = await Tesseract.recognize(file, 'nld+eng', {
            logger: m => {
                if(m.status === 'recognizing text') {
                    perc.textContent = Math.round(m.progress * 100) + '%';
                }
            }
        });

        // Simpele parser: probeert regels te vinden en er een | tussen te zetten
        const lines = result.data.text.split('\n');
        const formatted = lines.map(line => {
            if (line.trim() === '') return '';
            // Als er al een scheidingsteken is, laat het zo. Anders probeer spaties te vervangen.
            if (line.includes('|')) return line;
            return line.trim().replace(/\s{2,}/g, ' | '); 
        }).filter(l => l !== '').join('\n');

        document.getElementById('list-content').value += (formatted + '\n');
        status.textContent = "Klaar! Controleer de strepjes (|)";
        setTimeout(() => status.classList.add('hidden'), 3000);
    } catch (err) {
        alert("OCR mislukt. Probeer een duidelijkere foto.");
        status.classList.add('hidden');
    }
});

// DATA LADEN & DASHBOARD STATS
async function loadData() {
    const q = query(collection(db, "lists"), where("userId", "==", user.id));
    const snap = await getDocs(q);
    const container = document.getElementById('lists-container');
    container.innerHTML = '';

    let totalWords = 0;
    
    snap.forEach(docSnap => {
        const list = docSnap.data();
        totalWords += list.words.length;

        const card = document.createElement('div');
        card.className = 'list-card';
        card.innerHTML = `
            <h4>${list.name}</h4>
            <p style="color:var(--muted); font-size:0.8rem">${list.words.length} woorden</p>
            <div style="margin-top:1rem; display:flex; gap:0.5rem">
                <button class="btn btn-primary btn-sm btn-play"><i class="fa-solid fa-play"></i></button>
                <button class="btn btn-outline btn-sm btn-del"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        card.querySelector('.btn-play').onclick = () => startPractice(list);
        card.querySelector('.btn-del').onclick = () => deleteList(docSnap.id);
        container.appendChild(card);
    });

    document.getElementById('stat-total-lists').textContent = snap.size;
    document.getElementById('stat-total-words').textContent = totalWords;
    // Score stat is hier statisch, maar je zou scores kunnen opslaan in een aparte collectie.
}

// OPSLAAN
document.getElementById('btn-save-list').onclick = async () => {
    const title = document.getElementById('list-title').value;
    const content = document.getElementById('list-content').value;
    const words = content.split('\n').filter(l => l.includes('|')).map(l => {
        const [q, a] = l.split('|');
        return { q: q.trim(), a: a.trim() };
    });

    if (!title || words.length === 0) return alert("Vul titel en woorden in (vraag | antwoord)");

    await addDoc(collection(db, "lists"), {
        userId: user.id,
        name: title,
        words: words,
        createdAt: serverTimestamp()
    });

    showView('view-dashboard');
    loadData();
    // Reset fields
    document.getElementById('list-title').value = '';
    document.getElementById('list-content').value = '';
};

// OEFEN LOGICA (SHORT VERSION)
function startPractice(list) {
    state.currentList = list;
    showView('view-practice-select');
}

document.getElementById('mode-flashcards').onclick = () => {
    state.practiceData.words = [...state.currentList.words].sort(() => Math.random() - 0.5);
    state.practiceData.currentIndex = 0;
    showView('view-flashcards');
    renderFC();
};

function renderFC() {
    const w = state.practiceData.words[state.practiceData.currentIndex];
    document.getElementById('flashcard').classList.remove('flipped');
    document.getElementById('fc-question').textContent = w.q;
    document.getElementById('fc-answer').textContent = w.a;
    document.getElementById('fc-progress').textContent = `${state.practiceData.currentIndex + 1}/${state.practiceData.words.length}`;
}

document.getElementById('flashcard').onclick = () => document.getElementById('flashcard').classList.toggle('flipped');
document.getElementById('btn-fc-next').onclick = () => {
    if (state.practiceData.currentIndex < state.practiceData.words.length - 1) {
        state.practiceData.currentIndex++;
        renderFC();
    } else {
        showView('view-dashboard');
    }
};

// INPUT GAME
document.getElementById('mode-input').onclick = () => {
    state.practiceData.words = [...state.currentList.words].sort(() => Math.random() - 0.5);
    state.practiceData.currentIndex = 0;
    state.practiceData.score = 0;
    showView('view-input-practice');
    document.getElementById('ip-results').classList.add('hidden');
    renderIP();
};

function renderIP() {
    const w = state.practiceData.words[state.practiceData.currentIndex];
    document.getElementById('ip-question').textContent = w.q;
    document.getElementById('ip-input').value = '';
    document.getElementById('ip-input').focus();
}

document.getElementById('btn-ip-check').onclick = checkIP;
document.getElementById('ip-input').onkeypress = (e) => e.key === 'Enter' && checkIP();

function checkIP() {
    const w = state.practiceData.words[state.practiceData.currentIndex];
    const userIn = document.getElementById('ip-input').value.trim().toLowerCase();
    const feedback = document.getElementById('ip-feedback');
    
    feedback.classList.remove('hidden', 'correct', 'wrong');
    if (userIn === w.a.toLowerCase()) {
        state.practiceData.score++;
        feedback.textContent = "Lekker hoor! ✅";
        feedback.classList.add('correct');
    } else {
        feedback.textContent = `Helaas! Het was: ${w.a} ❌`;
        feedback.classList.add('wrong');
    }

    setTimeout(() => {
        feedback.classList.add('hidden');
        if (state.practiceData.currentIndex < state.practiceData.words.length - 1) {
            state.practiceData.currentIndex++;
            renderIP();
        } else {
            document.getElementById('ip-results').classList.remove('hidden');
            document.getElementById('ip-final-score').textContent = `${state.practiceData.score}/${state.practiceData.words.length}`;
        }
    }, 1500);
}

// Overige knoppen
document.getElementById('btn-create-new').onclick = () => showView('view-editor');
document.getElementById('btn-back-dashboard').onclick = () => showView('view-dashboard');
document.getElementById('btn-back-dash-2').onclick = () => showView('view-dashboard');
document.querySelectorAll('.btn-quit-practice').forEach(b => b.onclick = () => showView('view-dashboard'));

async function deleteList(id) {
    if(confirm("Lijst verwijderen?")) {
        await deleteDoc(doc(db, "lists", id));
        loadData();
    }
}

init();
