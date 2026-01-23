/* =============================================
    WOORDMEESTER - APP LOGIC (STRICT OCR UPDATE)
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
    
    listsContainer: document.getElementById('lists-container'),
    dashWelcome: document.getElementById('dash-welcome-text'),
    statTotalLists: document.getElementById('stat-total-lists'),
    statTotalWords: document.getElementById('stat-total-words'),
    
    btnCreate: document.getElementById('btn-create-new'),
    inputTitle: document.getElementById('list-title'),
    inputContent: document.getElementById('list-content'),
    btnSave: document.getElementById('btn-save-list'),
    wordCountBadge: document.getElementById('word-count-badge'),
    btnBackDash: document.getElementById('btn-back-dashboard'),
    btnScanImg: document.getElementById('btn-scan-img'),
    imgInput: document.getElementById('img-upload-input'),
    scanStatus: document.getElementById('scan-status'),
    processingCanvas: document.getElementById('processing-canvas'),
    
    btnBackDash2: document.getElementById('btn-back-dash-2'),
    practiceTitle: document.getElementById('practice-title-display'),
    modeFlash: document.getElementById('mode-flashcards'),
    modeInput: document.getElementById('mode-input'),
    
    card: document.getElementById('flashcard'),
    fcQuestion: document.getElementById('fc-question'),
    fcAnswer: document.getElementById('fc-answer'),
    fcProgress: document.getElementById('fc-progress'),
    btnFcNext: document.getElementById('btn-fc-next'),
    btnFcPrev: document.getElementById('btn-fc-prev'),
    
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

// --- INITIALISATIE ---

async function initApp() {
    const timeoutTimer = setTimeout(() => {
        if(!els.loadingScreen.classList.contains('fade-out')) {
            els.errorFallback.classList.remove('hidden');
            els.loadingText.textContent = "Verbinding duurt lang...";
        }
    }, 4000);

    try {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);

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
        await clerk.load();
        clearTimeout(timeoutTimer);
        updateAuthUI();
    } catch (error) {
        console.error(error);
        els.loadingText.textContent = "Fout: " + error.message;
        els.errorFallback.classList.remove('hidden');
    }
}

els.btnForceLoad.addEventListener('click', () => els.loadingScreen.classList.add('fade-out'));

// --- AUTHENTICATIE ---

function updateAuthUI() {
    els.loadingScreen.classList.add('fade-out');
    if (clerk.user) {
        user = clerk.user;
        els.authContainer.innerHTML = `<div style="display:flex; align-items:center; gap:10px;"><span>${user.firstName}</span><div id="user-button"></div></div>`;
        clerk.mountUserButton(document.getElementById('user-button'));
        els.dashWelcome.textContent = `Welkom terug, ${user.firstName}!`;
        showView('view-dashboard');
        loadUserLists();
    } else {
        user = null;
        els.authContainer.innerHTML = `<button id="btn-login-nav" class="btn btn-primary">Inloggen</button>`;
        document.getElementById('btn-login-nav').addEventListener('click', () => clerk.openSignIn());
        const heroBtn = document.getElementById('btn-login-hero');
        if(heroBtn) heroBtn.onclick = () => clerk.openSignUp(); 
        showView('view-landing');
    }
}

function showView(viewId) {
    els.views.forEach(v => v.classList.remove('active', 'hidden'));
    document.getElementById(viewId).classList.add('active');
}

// --- FIRESTORE ---

async function loadUserLists() {
    if(!user) return;
    els.listsContainer.innerHTML = '<div class="spinner"></div>';
    try {
        const q = query(collection(db, "lists"), where("userId", "==", user.id));
        const querySnapshot = await getDocs(q);
        els.listsContainer.innerHTML = ''; 
        let totalWordsCount = 0;
        let totalListsCount = querySnapshot.size;

        if(querySnapshot.empty) {
            els.listsContainer.innerHTML = `<div class="empty-state" style="grid-column:1/-1;text-align:center;"><p>Nog geen lijsten. Maak er eentje!</p></div>`;
            els.statTotalLists.textContent = "0";
            els.statTotalWords.textContent = "0";
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const list = docSnap.data();
            totalWordsCount += list.words.length;
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
            div.querySelector('.btn-practice').onclick = () => startPracticeSelection(docSnap.id, list);
            div.querySelector('.btn-delete').onclick = () => deleteList(docSnap.id);
            els.listsContainer.appendChild(div);
        });
        els.statTotalLists.textContent = totalListsCount;
        els.statTotalWords.textContent = totalWordsCount;
    } catch (e) {
        console.error(e);
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
    if(words.length === 0) return alert("Geen geldige woorden. Formaat: vraag|antwoord");
    try {
        await addDoc(collection(db, "lists"), { userId: user.id, name: name || "Naamloze lijst", words: words, createdAt: serverTimestamp() });
        els.inputTitle.value = ''; els.inputContent.value = ''; els.wordCountBadge.textContent = '0 woorden herkend';
        showView('view-dashboard');
        loadUserLists();
    } catch (e) { alert("Opslaan mislukt: " + e.message); }
}

async function deleteList(id) {
    if(confirm("Lijst verwijderen?")) await deleteDoc(doc(db, "lists", id));
    loadUserLists();
}

els.btnCreate.addEventListener('click', () => showView('view-editor'));
els.btnBackDash.addEventListener('click', () => showView('view-dashboard'));
els.btnBackDash2.addEventListener('click', () => showView('view-dashboard'));
els.quitButtons.forEach(b => b.addEventListener('click', () => showView('view-dashboard')));
els.inputContent.addEventListener('input', (e) => {
    const count = (e.target.value.match(/\|/g) || []).length;
    els.wordCountBadge.textContent = `${count} paren herkend`;
});
els.btnSave.addEventListener('click', () => saveList(els.inputTitle.value, els.inputContent.value));


// --- EXTRA STRICT OCR (ANT-HALLUCINATIE) ---

els.btnScanImg.addEventListener('click', () => els.imgInput.click());

els.imgInput.addEventListener('change', async (e) => {
    if(e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    els.scanStatus.classList.remove('hidden');
    els.scanStatus.innerHTML = `<i class="fa-solid fa-magic"></i> Foto analyseren en ruis verwijderen...`;

    try {
        // 1. Preprocess
        const processedImageBlob = await preprocessImage(file);

        // 2. Scan (vraag om layout analyse)
        const result = await Tesseract.recognize(processedImageBlob, 'nld+eng', {
            logger: m => {
                if(m.status === 'recognizing text') {
                    els.scanStatus.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Scannen: ${Math.round(m.progress * 100)}%`;
                }
            }
        });

        // 3. STRICT Filter Logic
        const strictText = processStrictOCR(result.data);

        if(!strictText || strictText.trim().length === 0) {
            els.scanStatus.innerHTML = `<span style="color:#ef4444"><i class="fa-solid fa-triangle-exclamation"></i> Geen duidelijke tekst gevonden. Probeer opnieuw.</span>`;
            return; // Voeg niets toe als het ruis was
        }

        if(els.inputContent.value.length > 0) {
            els.inputContent.value += "\n" + strictText;
        } else {
            els.inputContent.value = strictText;
        }
        
        els.scanStatus.innerHTML = `<i class="fa-solid fa-check"></i> Tekst toegevoegd!`;
        els.inputContent.dispatchEvent(new Event('input')); // Update teller

    } catch (error) {
        console.error(error);
        els.scanStatus.textContent = "Fout bij scannen.";
    }
});

function preprocessImage(file) {
    return new Promise((resolve) => {
        const img = new Image();
        const reader = new FileReader();
        reader.onload = (e) => {
            img.src = e.target.result;
            img.onload = () => {
                const canvas = els.processingCanvas;
                const ctx = canvas.getContext('2d');
                // Resize grote foto's voor snelheid en minder ruis
                let width = img.width;
                let height = img.height;
                const maxSize = 2000;
                if (width > maxSize || height > maxSize) {
                    const ratio = Math.min(maxSize / width, maxSize / height);
                    width *= ratio;
                    height *= ratio;
                }
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                // High Contrast Filter
                const imgData = ctx.getImageData(0, 0, width, height);
                const d = imgData.data;
                for (let i = 0; i < d.length; i += 4) {
                    let gray = 0.2126*d[i] + 0.7152*d[i+1] + 0.0722*d[i+2];
                    let v = (gray >= 130) ? 255 : 0; // Hardere threshold
                    d[i] = d[i+1] = d[i+2] = v;
                }
                ctx.putImageData(imgData, 0, 0);
                canvas.toBlob(resolve, 'image/png');
            };
        };
        reader.readAsDataURL(file);
    });
}

function processStrictOCR(ocrData) {
    // We kijken nu naar de 'lines' en 'words' met confidence scores
    const cleanLines = [];

    if(!ocrData || !ocrData.lines) return "";

    ocrData.lines.forEach(line => {
        // Stap A: Filter slechte woorden eruit op basis van 'confidence'
        const validWords = line.words.filter(w => {
            // Confidence moet hoger zijn dan 70% OF het woord moet lang zijn en redelijk zeker
            const highConfidence = w.confidence > 70;
            const isLongWord = w.text.length > 3 && w.confidence > 60;
            
            // Filter symbolen eruit die vaak als noise verschijnen (alleen letters/nummers behouden)
            const hasLetters = /[a-zA-Z0-9]/.test(w.text);
            
            return (highConfidence || isLongWord) && hasLetters;
        });

        // Stap B: Reconstruct line
        let lineText = validWords.map(w => w.text).join(' ');

        // Stap C: Is de overgebleven regel wel zinnig?
        // Moet minimaal 2 karakters bevatten en niet alleen leestekens
        if(lineText.replace(/[^a-zA-Z]/g, '').length < 2) return;

        // Auto-fix layout
        lineText = lineText.replace(/\t/g, '|');
        lineText = lineText.replace(/ {2,}/g, '|'); // Dubbele spaties -> pipe
        if(!lineText.includes('|') && lineText.includes('-')) {
             lineText = lineText.replace('-', '|'); // Streepje -> pipe
        }
        
        cleanLines.push(lineText);
    });

    return cleanLines.join('\n');
}


// --- PRACTICE MODES ---
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
    const arr = [...state.currentList.words];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    state.practiceData.words = arr;
    state.practiceData.currentIndex = 0;
}
function renderFlashcard() {
    const word = state.practiceData.words[state.practiceData.currentIndex];
    els.card.classList.remove('flipped');
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
        alert("Klaar! Goed gedaan.");
        showView('view-dashboard');
    }
});
els.btnFcPrev.addEventListener('click', () => {
    if(state.practiceData.currentIndex > 0) {
        state.practiceData.currentIndex--;
        renderFlashcard();
    }
});
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
        setTimeout(() => { els.ipFeedback.classList.add('hidden'); nextInput(); }, 1000);
    } else {
        els.ipFeedback.textContent = `Fout! Het was: ${word.a}`;
        els.ipFeedback.classList.add('wrong');
        setTimeout(() => { els.ipFeedback.classList.add('hidden'); nextInput(); }, 2500);
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

initApp();
