/* ═══════════════════════════════════════════════════════════════════════════
   LEXISCAN — MAIN APPLICATION JAVASCRIPT
   Handles: Auth, Navigation, OCR, Firestore CRUD, Flashcard & Type Practice
═══════════════════════════════════════════════════════════════════════════ */

'use strict';

// ─── Wait for Firebase to initialise ────────────────────────────────────────
function onFirebaseReady(callback) {
  if (window.__firebaseAuth) {
    callback();
  } else {
    window.addEventListener('firebaseReady', callback, { once: true });
  }
}

onFirebaseReady(initApp);

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════
const State = {
  user:            null,
  currentPage:     'home',
  wordLists:       [],        // [{id, name, words:[{word,translation}], lang, createdAt, stats}]
  currentListId:   null,
  practiceWords:   [],        // shuffled/filtered words for current session
  practiceMode:    null,      // 'flashcard' | 'type'
  practiceDir:     'forward', // 'forward' | 'reverse' | 'mixed'
  practiceOrder:   'sequential',
  practiceIndex:   0,
  sessionCorrect:  0,
  sessionWrong:    0,
  sessionWrongWords: [],
  flashcardFlipped: false,
  pendingDeleteId: null,
  pendingWords:    [],        // words extracted from OCR, awaiting save
};

// ═══════════════════════════════════════════════════════════════════════════
// FIREBASE HELPERS
// ═══════════════════════════════════════════════════════════════════════════
// FIX: Use var instead of let to avoid temporal dead zone / initialization errors
var auth = null;
var db   = null;
var fbFn = null;

function initFirebase() {
  auth = window.__firebaseAuth;
  db   = window.__firebaseDB;
  fbFn = window.__fbFunctions;
}

// Firestore helpers
const DB = {
  async addList(uid, data) {
    const col = fbFn.collection(db, 'users', uid, 'wordlists');
    return fbFn.addDoc(col, { ...data, createdAt: fbFn.serverTimestamp(), updatedAt: fbFn.serverTimestamp() });
  },
  async getLists(uid) {
    const col = fbFn.collection(db, 'users', uid, 'wordlists');
    const q   = fbFn.query(col, fbFn.orderBy('createdAt', 'desc'));
    const snap = await fbFn.getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },
  async deleteList(uid, listId) {
    const ref = fbFn.doc(db, 'users', uid, 'wordlists', listId);
    return fbFn.deleteDoc(ref);
  },
  async updateList(uid, listId, data) {
    const ref = fbFn.doc(db, 'users', uid, 'wordlists', listId);
    return fbFn.updateDoc(ref, { ...data, updatedAt: fbFn.serverTimestamp() });
  },
  async saveSession(uid, sessionData) {
    const col = fbFn.collection(db, 'users', uid, 'sessions');
    return fbFn.addDoc(col, { ...sessionData, createdAt: fbFn.serverTimestamp() });
  },
  async getSessions(uid) {
    const col = fbFn.collection(db, 'users', uid, 'sessions');
    const q   = fbFn.query(col, fbFn.orderBy('createdAt', 'desc'));
    const snap = await fbFn.getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════
function initApp() {
  initFirebase();
  initCursorGlow();
  initNavigation();
  initAuthModal();
  initUploadPage();
  initScrollAnimations();
  initRippleEffects();
  initAuthStateListener();

  // Hero CTA buttons
  $('heroCta').addEventListener('click', (e) => {
    e.stopPropagation();
    if (State.user) {
      navigateTo('upload');
    } else {
      openAuthModal('register');
    }
  });

  $('ctaBannerBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    if (State.user) navigateTo('upload');
    else openAuthModal('register');
  });

  $('heroDemo').addEventListener('click', () => {
    loadDemoList();
    // Show demo in dashboard even without login - temporarily allow it
    State._demoMode = true;
    navigateTo('dashboard');
  });

  // Hero demo card flip
  const demoFlipBtn = document.querySelector('.demo-fc-flip');
  const demoCard1   = document.querySelector('.demo-card-1');
  if (demoFlipBtn && demoCard1) {
    let flipped = false;
    demoFlipBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      flipped = !flipped;
      const wordEl   = demoCard1.querySelector('.demo-fc-word');
      const labelEl  = demoCard1.querySelector('.demo-fc-label');
      if (flipped) {
        wordEl.textContent  = 'huis';
        labelEl.textContent = 'Vertaling';
        demoFlipBtn.textContent = 'Omdraaien';
        demoCard1.style.background = 'var(--bg-elevated)';
        wordEl.style.color = 'var(--accent)';
      } else {
        wordEl.textContent  = 'maison';
        labelEl.textContent = 'Wat betekent dit?';
        demoFlipBtn.textContent = 'Omdraaien';
        demoCard1.style.background = '';
        wordEl.style.color = '';
      }
    });
    demoCard1.addEventListener('click', () => demoFlipBtn.click());
  }

  // Load after a short delay to allow firebase init
  setTimeout(hideLoadingScreen, 1600);
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY
// ═══════════════════════════════════════════════════════════════════════════
function $(id) { return document.getElementById(id); }
function qs(sel, ctx = document) { return ctx.querySelector(sel); }
function qsa(sel, ctx = document) { return [...ctx.querySelectorAll(sel)]; }

function hideLoadingScreen() {
  const ls = $('loadingScreen');
  ls.classList.add('fade-out');
  ls.addEventListener('transitionend', () => ls.remove(), { once: true });
}

// ─── Toast ──────────────────────────────────────────────────────────────────
function toast(message, type = 'info', duration = 3500) {
  const container = $('toastContainer');
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `
    <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
    <span class="toast-message">${message}</span>
  `;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('removing');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }, duration);
}

// ─── Show / hide utilities ───────────────────────────────────────────────────
function show(el) { if (typeof el === 'string') el = $(el); el?.classList.remove('hidden'); }
function hide(el) { if (typeof el === 'string') el = $(el); el?.classList.add('hidden'); }
function toggle(el, condition) {
  if (typeof el === 'string') el = $(el);
  el?.[condition ? 'classList' : 'classList'][condition ? 'remove' : 'add']('hidden');
}

// ─── Cursor glow ─────────────────────────────────────────────────────────────
function initCursorGlow() {
  const glow = $('cursorGlow');
  let mx = 0, my = 0, cx = 0, cy = 0;
  document.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; });
  function updateGlow() {
    cx += (mx - cx) * 0.08;
    cy += (my - cy) * 0.08;
    glow.style.left = cx + 'px';
    glow.style.top  = cy + 'px';
    requestAnimationFrame(updateGlow);
  }
  requestAnimationFrame(updateGlow);
}

// ─── Ripple effects ──────────────────────────────────────────────────────────
function initRippleEffects() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-primary, .btn-ghost, .btn-danger');
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const size = Math.max(rect.width, rect.height);
    ripple.style.cssText = `
      width: ${size}px; height: ${size}px;
      left: ${e.clientX - rect.left - size / 2}px;
      top: ${e.clientY - rect.top - size / 2}px;
    `;
    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  });
}

// ─── Scroll animations ───────────────────────────────────────────────────────
function initScrollAnimations() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        const delay = parseInt(entry.target.dataset.delay || 0);
        setTimeout(() => entry.target.classList.add('visible'), delay);
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  function observeAll() {
    qsa('.feature-card, .step, .list-card, .stat-card, .stats-card-full').forEach(el => {
      io.observe(el);
    });
  }

  observeAll();
  // Re-run after page navigation
  window.addEventListener('pageRendered', observeAll);
}

// ═══════════════════════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════════════════════
function initNavigation() {
  // Nav links
  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-page]');
    if (!link) return;
    e.preventDefault();
    e.stopPropagation();
    const page = link.dataset.page;
    if (['upload', 'stats'].includes(page) && !State.user) {
      openAuthModal('login');
      return;
    }
    if (page === 'dashboard' && !State.user && !State._demoMode) {
      openAuthModal('login');
      return;
    }
    navigateTo(page);
  });

  // Nav logo
  $('navLogoBtn').addEventListener('click', (e) => {
    e.preventDefault();
    navigateTo('home');
  });

  // Hamburger
  const hamburger = $('navHamburger');
  const drawer    = $('mobileNavDrawer');
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    drawer.classList.toggle('hidden');
  });

  // Scroll nav style
  window.addEventListener('scroll', () => {
    $('mainNav').classList.toggle('scrolled', window.scrollY > 20);
  });

  // User menu
  $('userAvatarBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    $('userDropdown').classList.toggle('hidden');
  });

  document.addEventListener('click', (e) => {
    if (e.target.closest('.modal-overlay')) return;
    if (e.target.closest('.user-avatar-btn')) return;
    if (e.target.closest('[data-page]')) return;
    $('userDropdown')?.classList.add('hidden');
  });

  // Back button
  $('backToDashboardBtn').addEventListener('click', () => navigateTo('dashboard'));
}

function navigateTo(page) {
  // Close mobile drawer
  $('navHamburger').classList.remove('open');
  $('mobileNavDrawer').classList.add('hidden');

  // Hide all pages
  qsa('.page').forEach(p => p.classList.add('hidden'));

  const pageEl = $(`page-${page}`);
  if (pageEl) {
    pageEl.classList.remove('hidden');
    State.currentPage = page;
    window.scrollTo(0, 0);
  }

  // Update nav link active state
  qsa('.nav-link, .mobile-nav-link').forEach(l => {
    l.classList.toggle('active', l.dataset.page === page);
  });

  // Page-specific logic
  if (page === 'dashboard')  loadDashboard();
  if (page === 'stats')      loadStats();
  if (page === 'upload')     resetUploadPage();

  window.dispatchEvent(new Event('pageRendered'));
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════════════════
function initAuthStateListener() {
  fbFn.onAuthStateChanged(auth, (user) => {
    State.user = user;
    updateAuthUI(user);
  });
}

function updateAuthUI(user) {
  const authBtn    = $('navAuthBtn');
  const userWrap   = $('userMenuWrap');
  const avatarImg  = $('userAvatarImg');
  const avatarInit = $('userAvatarInitial');

  if (user) {
    hide(authBtn);
    show(userWrap);
    $('dropdownName').textContent  = user.displayName || 'Gebruiker';
    $('dropdownEmail').textContent = user.email;

    if (user.photoURL) {
      avatarImg.src = user.photoURL;
      show(avatarImg);
      hide(avatarInit);
    } else {
      avatarInit.textContent = (user.displayName || user.email || 'U')[0].toUpperCase();
      hide(avatarImg);
      show(avatarInit);
    }
  } else {
    show(authBtn);
    hide(userWrap);
  }
}

function openAuthModal(tab = 'login') {
  const modal = $('authModal');
  modal.classList.remove('hidden');

  // Switch to correct tab
  qsa('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  qsa('.auth-panel').forEach(p => p.classList.toggle('active', p.id === `${tab}Panel`));
}

function closeAuthModal() {
  $('authModal').classList.add('hidden');
  clearAuthErrors();
}

function clearAuthErrors() {
  $('loginError').classList.add('hidden');
  $('registerError').classList.add('hidden');
}

function initAuthModal() {
  $('authModalClose').addEventListener('click', (e) => { e.stopPropagation(); closeAuthModal(); });
  $('authModal').addEventListener('click', (e) => {
    e.stopPropagation();
    if (e.target === $('authModal')) closeAuthModal();
  });
  $('navAuthBtn').addEventListener('click', (e) => { e.stopPropagation(); openAuthModal('login'); });

  // Tab switching
  qsa('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const t = tab.dataset.tab;
      qsa('.auth-tab').forEach(x => x.classList.toggle('active', x === tab));
      qsa('.auth-panel').forEach(p => p.classList.toggle('active', p.id === `${t}Panel`));
      clearAuthErrors();
    });
  });

  // Google sign in
  $('googleSignInBtn').addEventListener('click',  () => googleAuth());
  $('googleSignUpBtn').addEventListener('click',  () => googleAuth());

  // Email login
  $('loginBtn').addEventListener('click', emailLogin);
  $('loginPassword').addEventListener('keydown', (e) => { if (e.key === 'Enter') emailLogin(); });

  // Email register
  $('registerBtn').addEventListener('click', emailRegister);
  $('regPassword').addEventListener('keydown', (e) => { if (e.key === 'Enter') emailRegister(); });

  // Logout
  $('logoutBtn').addEventListener('click', async () => {
    await fbFn.signOut(auth);
    navigateTo('home');
    toast('Je bent uitgelogd.', 'info');
  });
}

async function googleAuth() {
  try {
    const provider = new window.__GoogleAuthProvider();
    await fbFn.signInWithPopup(auth, provider);
    closeAuthModal();
    toast('Welkom! Je bent ingelogd.', 'success');
    navigateTo('home');
  } catch (err) {
    console.error(err);
    toast('Google inloggen mislukt.', 'error');
  }
}

async function emailLogin() {
  const email = $('loginEmail').value.trim();
  const pass  = $('loginPassword').value;
  if (!email || !pass) { showAuthError('login', 'Vul alle velden in.'); return; }

  setLoading($('loginBtn'), true);
  try {
    await fbFn.signInWithEmailAndPassword(auth, email, pass);
    closeAuthModal();
    toast('Welkom terug!', 'success');
    navigateTo('home');
  } catch (err) {
    showAuthError('login', getAuthErrorMessage(err.code));
  }
  setLoading($('loginBtn'), false);
}

async function emailRegister() {
  const name  = $('regName').value.trim();
  const email = $('regEmail').value.trim();
  const pass  = $('regPassword').value;

  if (!email || !pass) { showAuthError('register', 'Vul alle velden in.'); return; }
  if (pass.length < 6) { showAuthError('register', 'Wachtwoord moet minimaal 6 tekens zijn.'); return; }

  setLoading($('registerBtn'), true);
  try {
    const cred = await fbFn.createUserWithEmailAndPassword(auth, email, pass);
    // Update display name if provided
    if (name && cred.user) {
      // We use the Auth updateProfile if available
      try {
        const { updateProfile } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
        await updateProfile(cred.user, { displayName: name });
      } catch (e) { /* optional */ }
    }
    closeAuthModal();
    toast('Account aangemaakt! Welkom bij LexiScan.', 'success');
    navigateTo('home');
  } catch (err) {
    showAuthError('register', getAuthErrorMessage(err.code));
  }
  setLoading($('registerBtn'), false);
}

function showAuthError(panel, msg) {
  const el = $(`${panel}Error`);
  el.textContent = msg;
  el.classList.remove('hidden');
}

function getAuthErrorMessage(code) {
  const messages = {
    'auth/user-not-found':       'Geen account gevonden met dit e-mailadres.',
    'auth/wrong-password':       'Onjuist wachtwoord.',
    'auth/email-already-in-use': 'Dit e-mailadres is al in gebruik.',
    'auth/invalid-email':        'Ongeldig e-mailadres.',
    'auth/weak-password':        'Wachtwoord is te zwak.',
    'auth/too-many-requests':    'Te veel pogingen. Probeer het later opnieuw.',
    'auth/network-request-failed': 'Netwerkfout. Controleer je verbinding.',
    'auth/invalid-credential':   'Onjuiste inloggegevens.',
  };
  return messages[code] || `Fout: ${code}`;
}

function setLoading(btn, loading) {
  const span   = qs('span', btn);
  const loader = qs('.btn-loader', btn);
  if (!loader) return;
  if (loading) {
    btn.disabled = true;
    span?.classList.add('hidden');
    loader.classList.remove('hidden');
  } else {
    btn.disabled = false;
    span?.classList.remove('hidden');
    loader.classList.add('hidden');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// UPLOAD & OCR
// ═══════════════════════════════════════════════════════════════════════════
function initUploadPage() {
  const zone    = $('uploadZone');
  const fileIn  = $('fileInput');
  const browse  = $('browseBtn');

  browse.addEventListener('click', () => fileIn.click());
  fileIn.addEventListener('change', (e) => {
    if (e.target.files[0]) handleFileSelected(e.target.files[0]);
  });

  // Drag & drop
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragging'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragging'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dragging');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) handleFileSelected(file);
    else toast('Selecteer een afbeeldingsbestand.', 'error');
  });

  // Change image
  $('changeImageBtn').addEventListener('click', resetUploadPage);

  // Add word
  $('addWordBtn').addEventListener('click', () => addWordPairRow('', ''));

  // Cancel
  $('cancelUploadBtn').addEventListener('click', () => navigateTo('dashboard'));

  // Save
  $('saveListBtn').addEventListener('click', saveWordList);
}

function resetUploadPage() {
  hide('uploadPreviewSection');
  show('uploadZone');
  $('fileInput').value = '';
  State.pendingWords = [];
  $('wordPairsContainer').innerHTML = '';
  $('listNameInput').value = '';
  $('listLangInput').value = '';
  $('wordCountBadge').textContent = '0 woorden';
  hide('wordListEditor');
  show('ocrProcessing');
  $('ocrProgressBar').style.width = '0%';
  $('ocrStatusText').textContent = 'Bezig met verwerken…';
  ['step1','step2','step3','step4'].forEach(id => {
    const el = $(id);
    el.className = 'ocr-step';
    qs('.step-dot', el).style.background = '';
  });
}

async function handleFileSelected(file) {
  hide('uploadZone');
  show('uploadPreviewSection');

  // Show image preview
  const reader = new FileReader();
  reader.onload = (e) => { $('previewImg').src = e.target.result; };
  reader.readAsDataURL(file);

  show('ocrProcessing');
  hide('wordListEditor');
  $('uploadZone').classList.add('processing');

  try {
    await runOCR(file);
  } catch (err) {
    console.error('OCR error:', err);
    toast('OCR mislukt. Controleer de afbeelding.', 'error');
    resetUploadPage();
  }

  $('uploadZone').classList.remove('processing');
}

function setStep(stepId, state) {
  const el = $(stepId);
  el.className = `ocr-step ${state}`;
  const dot = qs('.step-dot', el);
  if (state === 'active') {
    dot.style.background = 'var(--accent)';
  } else if (state === 'done') {
    dot.style.background = 'var(--success)';
  }
}

async function runOCR(file) {
  const progressBar  = $('ocrProgressBar');
  const statusText   = $('ocrStatusText');
  progressBar.classList.add('active');

  // Step 1: Load image
  setStep('step1', 'active');
  statusText.textContent = 'Afbeelding laden…';
  progressBar.style.width = '15%';
  await delay(300);
  setStep('step1', 'done');

  // Step 2: OCR
  setStep('step2', 'active');
  statusText.textContent = 'Tekst herkennen met Tesseract.js…';
  progressBar.style.width = '30%';

  let rawText = '';
  try {
    const { data } = await Tesseract.recognize(file, 'nld+eng+fra+deu+spa', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          const p = Math.min(30 + Math.round(m.progress * 40), 70);
          progressBar.style.width = p + '%';
        }
      }
    });
    rawText = data.text;
  } catch (e) {
    console.warn('Tesseract failed, using fallback:', e);
    rawText = '';
  }

  setStep('step2', 'done');

  // Step 3: Parse word pairs
  setStep('step3', 'active');
  statusText.textContent = 'Woordparen verwerken…';
  progressBar.style.width = '75%';
  await delay(300);

  let pairs = parseWordPairs(rawText);

  // If OCR gave poor results, try AI enhancement
  if (pairs.length < 2) {
    statusText.textContent = 'AI woordherkenning…';
    pairs = await aiEnhanceOCR(file, rawText);
  }

  setStep('step3', 'done');

  // Step 4: Prepare editor
  setStep('step4', 'active');
  statusText.textContent = 'Gereed! Controleer de woorden.';
  progressBar.style.width = '100%';
  await delay(400);
  setStep('step4', 'done');
  progressBar.classList.remove('active');

  // Show editor
  State.pendingWords = pairs;
  hide('ocrProcessing');
  show('wordListEditor');
  renderWordPairs(pairs);

  // Auto-fill list name from filename-like text
  const now = new Date();
  $('listNameInput').value = `Lijst ${now.toLocaleDateString('nl-NL')}`;
}

function parseWordPairs(text) {
  if (!text || !text.trim()) return [];

  const pairs = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 1);

  // Common separators in word lists
  const separatorPatterns = [
    /^(.+?)\s*[=:→\-–—]\s*(.+)$/,          // word = translation, word : trans, word → trans
    /^(.+?)\s{2,}(.+)$/,                    // word    translation (multiple spaces/tabs)
    /^(\S+)\s+(.+)$/,                       // single word then rest
  ];

  for (const line of lines) {
    // Skip lines that look like headers or numbers
    if (/^[\d\.\)\-\s]+$/.test(line)) continue;
    if (line.length > 200) continue;

    let matched = false;
    for (const pattern of separatorPatterns) {
      const m = line.match(pattern);
      if (m && m[1] && m[2]) {
        const word  = cleanWord(m[1]);
        const trans = cleanWord(m[2]);
        if (word.length > 0 && trans.length > 0 && word !== trans) {
          pairs.push({ word, translation: trans });
          matched = true;
          break;
        }
      }
    }

    // If no separator found but line has only 1-3 words, might be a standalone word
    if (!matched) {
      const words = line.split(/\s+/);
      if (words.length === 1 && line.length <= 40) {
        pairs.push({ word: cleanWord(line), translation: '' });
      }
    }
  }

  // Deduplicate
  const seen = new Set();
  return pairs.filter(p => {
    const key = p.word.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function cleanWord(str) {
  return str
    .replace(/[^\w\s\u00C0-\u024F\u1E00-\u1EFF'\-]/g, '') // keep accented chars
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/^./, c => c.toUpperCase()); // capitalize first letter
}

async function aiEnhanceOCR(file, rawText) {
  // Use Claude API via the artifact's Anthropic fetch
  // Convert image to base64
  try {
    const base64 = await fileToBase64(file);
    const mimeType = file.type || 'image/jpeg';

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mimeType, data: base64 }
            },
            {
              type: 'text',
              text: `This is an image of a vocabulary word list. Extract ALL word pairs (word and translation) from this image.

Return ONLY a JSON array in this exact format, no other text:
[
  {"word": "word1", "translation": "vertaling1"},
  {"word": "word2", "translation": "vertaling2"}
]

Rules:
- Include every word pair visible in the image
- Clean up OCR errors
- Capitalize first letter of each word
- If only one language column is visible, put the word in "word" and leave "translation" empty
- Return valid JSON only`
            }
          ]
        }]
      })
    });

    if (!response.ok) throw new Error('API error ' + response.status);

    const data = await response.json();
    const textContent = data.content?.find(c => c.type === 'text')?.text || '';

    // Parse JSON from response
    const jsonMatch = textContent.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) {
        return parsed.map(p => ({
          word: String(p.word || '').trim(),
          translation: String(p.translation || '').trim()
        })).filter(p => p.word.length > 0);
      }
    }
  } catch (e) {
    console.warn('AI enhancement failed:', e);
  }

  // Fallback: return raw text lines as words
  if (rawText) {
    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 1 && l.length < 100);
    return lines.slice(0, 50).map(line => ({ word: line, translation: '' }));
  }

  return [];
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function renderWordPairs(pairs) {
  const container = $('wordPairsContainer');
  container.innerHTML = '';
  pairs.forEach((p, i) => addWordPairRow(p.word, p.translation, i));
  updateWordCount();
}

function addWordPairRow(word = '', translation = '', index = null) {
  const container = $('wordPairsContainer');
  const row = document.createElement('div');
  row.className = 'word-pair-row';
  row.innerHTML = `
    <input type="text" placeholder="Woord" value="${escapeHtml(word)}" class="wp-word" />
    <input type="text" placeholder="Vertaling" value="${escapeHtml(translation)}" class="wp-trans" />
    <button class="word-pair-delete" aria-label="Verwijder rij">✕</button>
  `;

  // Delete button
  qs('.word-pair-delete', row).addEventListener('click', () => {
    row.animate([{ opacity: 1, transform: 'translateX(0)' }, { opacity: 0, transform: 'translateX(20px)' }], {
      duration: 200, easing: 'ease-out'
    }).onfinish = () => {
      row.remove();
      updateWordCount();
    };
  });

  // Update count on change
  qs('.wp-word', row).addEventListener('input', updateWordCount);
  qs('.wp-trans', row).addEventListener('input', updateWordCount);

  container.appendChild(row);
  updateWordCount();

  // Focus new row if it was manually added
  if (index === null) {
    qs('.wp-word', row).focus();
  }
}

function updateWordCount() {
  const rows = qsa('.word-pair-row');
  const filled = rows.filter(r => qs('.wp-word', r).value.trim().length > 0).length;
  $('wordCountBadge').textContent = `${filled} woorden`;
}

function getWordPairsFromEditor() {
  return qsa('.word-pair-row').map(row => ({
    word:        qs('.wp-word', row).value.trim(),
    translation: qs('.wp-trans', row).value.trim()
  })).filter(p => p.word.length > 0);
}

async function saveWordList() {
  if (!State.user) { openAuthModal('login'); return; }

  const words = getWordPairsFromEditor();
  if (words.length === 0) { toast('Voeg minimaal één woord toe.', 'error'); return; }

  const name = $('listNameInput').value.trim() || `Lijst ${new Date().toLocaleDateString('nl-NL')}`;
  const lang = $('listLangInput').value.trim();

  setLoading($('saveListBtn'), true);
  try {
    await DB.addList(State.user.uid, {
      name,
      lang,
      words,
      stats: { totalPracticed: 0, totalCorrect: 0, totalWrong: 0, lastPracticed: null }
    });
    toast(`"${name}" opgeslagen met ${words.length} woorden!`, 'success');
    navigateTo('dashboard');
  } catch (err) {
    console.error(err);
    toast('Opslaan mislukt. Probeer opnieuw.', 'error');
  }
  setLoading($('saveListBtn'), false);
}

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════
async function loadDashboard() {
  // Allow demo mode without login
  if (!State.user && !State._demoMode) { navigateTo('home'); return; }

  const grid    = $('listsGrid');
  const empty   = $('listsEmpty');
  const loading = $('listsLoading');

  hide(empty);
  hide(grid);
  show(loading);

  try {
    let fetched = [];
    if (State.user) {
      fetched = await DB.getLists(State.user.uid);
    }
    // Preserve demo list if it was added
    const demoList = State.wordLists.find(l => l.id === 'demo');
    State.wordLists = fetched;
    if (demoList && !State.wordLists.find(l => l.id === 'demo')) {
      State.wordLists.unshift(demoList);
    }
    hide(loading);

    const filtered = filterLists(State.wordLists, State.currentFilter || 'all', '');
    renderListCards(filtered);
  } catch (err) {
    console.error(err);
    hide(loading);
    toast('Lijsten laden mislukt.', 'error');
  }

  // New list button
  $('newListBtn').onclick = () => navigateTo('upload');
  $('emptyUploadBtn').onclick = () => navigateTo('upload');

  // Search
  $('searchLists').addEventListener('input', debounce(handleSearchFilter, 250));

  // Filter tabs
  qsa('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      qsa('.filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      State.currentFilter = tab.dataset.filter;
      applyFilter();
    });
  });
}

function handleSearchFilter() {
  applyFilter();
}

function applyFilter() {
  const query  = $('searchLists').value.toLowerCase();
  const filter = State.currentFilter || 'all';
  const filtered = filterLists(State.wordLists, filter, query);
  renderListCards(filtered);
}

function filterLists(lists, filter, query) {
  let result = [...lists];
  if (query) {
    result = result.filter(l => l.name.toLowerCase().includes(query) || (l.lang || '').toLowerCase().includes(query));
  }
  if (filter === 'recent') {
    const week = Date.now() - 7 * 24 * 60 * 60 * 1000;
    result = result.filter(l => l.createdAt?.seconds * 1000 > week);
  }
  if (filter === 'mastered') {
    result = result.filter(l => getMasteryPercent(l) >= 80);
  }
  return result;
}

function getMasteryPercent(list) {
  const s = list.stats || {};
  const total = (s.totalCorrect || 0) + (s.totalWrong || 0);
  if (total === 0) return 0;
  return Math.round((s.totalCorrect / total) * 100);
}

function renderListCards(lists) {
  const grid  = $('listsGrid');
  const empty = $('listsEmpty');
  grid.innerHTML = '';

  if (lists.length === 0) {
    hide(grid);
    show(empty);
    return;
  }

  show(grid);
  hide(empty);

  lists.forEach((list, i) => {
    const card = createListCard(list);
    card.style.animationDelay = `${i * 50}ms`;
    grid.appendChild(card);
    requestAnimationFrame(() => card.classList.add('visible'));
  });

  window.dispatchEvent(new Event('pageRendered'));
}

function createListCard(list) {
  const card    = document.createElement('div');
  const mastery = getMasteryPercent(list);
  const wordCount = list.words?.length || 0;
  const date    = list.createdAt?.seconds
    ? new Date(list.createdAt.seconds * 1000).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Onbekend';

  card.className = 'list-card';
  card.dataset.listId = list.id;
  card.innerHTML = `
    <div class="list-card-header">
      <h3 class="list-card-title">${escapeHtml(list.name)}</h3>
      <button class="list-card-menu-btn" data-id="${list.id}">⋯</button>
    </div>
    <div class="list-card-meta">
      <span class="list-chip">${wordCount} woorden</span>
      ${list.lang ? `<span class="list-chip lang">${escapeHtml(list.lang)}</span>` : ''}
      <span class="list-chip">${date}</span>
    </div>
    <div class="list-progress-wrap">
      <div class="list-progress-label">
        <span>Beheerst</span>
        <span>${mastery}%</span>
      </div>
      <div class="list-progress-bar-bg">
        <div class="list-progress-bar-fill" style="width: 0%;" data-target="${mastery}"></div>
      </div>
    </div>
    <div class="list-card-actions">
      <button class="list-action-btn primary" data-action="practice" data-id="${list.id}">Oefenen</button>
      <button class="list-action-btn secondary" data-action="view" data-id="${list.id}">Bekijken</button>
    </div>
  `;

  // Animate progress bar
  requestAnimationFrame(() => {
    const bar = qs('.list-progress-bar-fill', card);
    setTimeout(() => { bar.style.width = mastery + '%'; }, 300);
  });

  // Practice button
  qs('[data-action="practice"]', card).addEventListener('click', (e) => {
    e.stopPropagation();
    startPractice(list.id);
  });

  // View button
  qs('[data-action="view"]', card).addEventListener('click', (e) => {
    e.stopPropagation();
    openListView(list.id);
  });

  // Menu button
  qs('.list-card-menu-btn', card).addEventListener('click', (e) => {
    e.stopPropagation();
    toggleCardDropdown(card, list.id);
  });

  // Card click → practice
  card.addEventListener('click', () => startPractice(list.id));

  return card;
}

function toggleCardDropdown(card, listId) {
  // Remove any existing dropdowns
  qsa('.list-card-dropdown').forEach(d => d.remove());

  const dropdown = document.createElement('div');
  dropdown.className = 'list-card-dropdown';
  dropdown.innerHTML = `
    <button class="card-dropdown-item" data-action="rename">✏️ Naam wijzigen</button>
    <button class="card-dropdown-item" data-action="export">📤 Exporteren</button>
    <button class="card-dropdown-item danger" data-action="delete">🗑️ Verwijderen</button>
  `;

  qs('[data-action="rename"]', dropdown).addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.remove();
    renameList(listId);
  });

  qs('[data-action="export"]', dropdown).addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.remove();
    exportList(listId);
  });

  qs('[data-action="delete"]', dropdown).addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.remove();
    confirmDeleteList(listId);
  });

  card.appendChild(dropdown);

  // Close on outside click
  setTimeout(() => {
    document.addEventListener('click', () => dropdown.remove(), { once: true });
  }, 10);
}

function confirmDeleteList(listId) {
  State.pendingDeleteId = listId;
  $('deleteModal').classList.remove('hidden');
  $('confirmDeleteBtn').onclick = executeDelete;
  $('cancelDeleteBtn').onclick  = () => $('deleteModal').classList.add('hidden');
  $('deleteModal').onclick = (e) => {
    if (e.target === $('deleteModal')) $('deleteModal').classList.add('hidden');
  };
}

async function executeDelete() {
  if (!State.pendingDeleteId || !State.user) return;
  $('deleteModal').classList.add('hidden');
  try {
    await DB.deleteList(State.user.uid, State.pendingDeleteId);
    State.wordLists = State.wordLists.filter(l => l.id !== State.pendingDeleteId);
    State.pendingDeleteId = null;
    renderListCards(filterLists(State.wordLists, State.currentFilter || 'all', $('searchLists').value.toLowerCase()));
    toast('Lijst verwijderd.', 'info');
  } catch (err) {
    console.error(err);
    toast('Verwijderen mislukt.', 'error');
  }
}

async function renameList(listId) {
  const list = State.wordLists.find(l => l.id === listId);
  if (!list) return;
  const newName = prompt('Nieuwe naam voor de lijst:', list.name);
  if (!newName || newName.trim() === list.name) return;
  try {
    await DB.updateList(State.user.uid, listId, { name: newName.trim() });
    list.name = newName.trim();
    renderListCards(filterLists(State.wordLists, State.currentFilter || 'all', ''));
    toast('Naam gewijzigd!', 'success');
  } catch (err) {
    toast('Wijzigen mislukt.', 'error');
  }
}

function exportList(listId) {
  const list = State.wordLists.find(l => l.id === listId);
  if (!list) return;
  const text = list.words.map(w => `${w.word}\t${w.translation}`).join('\n');
  const blob  = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url   = URL.createObjectURL(blob);
  const a     = document.createElement('a');
  a.href = url;
  a.download = `${list.name}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Lijst geëxporteerd!', 'success');
}

function openListView(listId) {
  // Navigate to practice page with list info shown in mode selector
  startPractice(listId);
}

// ─── Demo list ───────────────────────────────────────────────────────────────
function loadDemoList() {
  const demoList = {
    id: 'demo',
    name: 'Demo: Frans Basis',
    lang: 'Frans → Nederlands',
    words: [
      { word: 'Bonjour', translation: 'Goedendag' },
      { word: 'Merci', translation: 'Dankjewel' },
      { word: 'Oui', translation: 'Ja' },
      { word: 'Non', translation: 'Nee' },
      { word: 'Maison', translation: 'Huis' },
      { word: 'Chat', translation: 'Kat' },
      { word: 'Chien', translation: 'Hond' },
      { word: 'École', translation: 'School' },
      { word: 'Livre', translation: 'Boek' },
      { word: 'Eau', translation: 'Water' },
    ],
    stats: { totalCorrect: 18, totalWrong: 6, totalPracticed: 24 },
    createdAt: { seconds: Date.now() / 1000 - 86400 }
  };

  // Add to front of lists if not already there
  if (!State.wordLists.find(l => l.id === 'demo')) {
    State.wordLists.unshift(demoList);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PRACTICE
// ═══════════════════════════════════════════════════════════════════════════
function startPractice(listId) {
  State.currentListId = listId;
  const list = State.wordLists.find(l => l.id === listId);
  if (!list) { toast('Lijst niet gevonden.', 'error'); return; }

  // Require login for non-demo lists
  if (!State.user && listId !== 'demo') {
    openAuthModal('login');
    return;
  }

  if (!list.words || list.words.length === 0) {
    toast('Deze lijst heeft geen woorden.', 'error');
    return;
  }

  // Reset state
  State.practiceMode   = null;
  State.practiceIndex  = 0;
  State.sessionCorrect = 0;
  State.sessionWrong   = 0;
  State.sessionWrongWords = [];

  // Update UI
  $('practiceListName').textContent = list.name;
  $('practiceListMeta').textContent = `${list.words.length} woorden${list.lang ? ' · ' + list.lang : ''}`;

  show('modeSelectorSection');
  hide('flashcardMode');
  hide('typeMode');
  hide('practiceResults');

  navigateTo('practice');

  // Init settings
  initPracticeSettings(list);
}

function initPracticeSettings(list) {
  // Mode buttons
  qsa('.mode-select-btn').forEach(btn => {
    btn.onclick = () => {
      State.practiceMode = btn.dataset.mode;
      preparePracticeSession(list);
    };
  });

  // Direction toggles
  qsa('[data-dir]').forEach(btn => {
    btn.onclick = () => {
      qsa('[data-dir]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      State.practiceDir = btn.dataset.dir;
    };
  });

  // Order toggles
  qsa('[data-order]').forEach(btn => {
    btn.onclick = () => {
      qsa('[data-order]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      State.practiceOrder = btn.dataset.order;
    };
  });
}

function preparePracticeSession(list) {
  let words = [...list.words].filter(w => w.word);

  // Apply direction
  if (State.practiceDir === 'reverse') {
    words = words.map(w => ({ word: w.translation || w.word, translation: w.word }));
  } else if (State.practiceDir === 'mixed') {
    words = words.map(w => Math.random() > 0.5
      ? w
      : { word: w.translation || w.word, translation: w.word }
    );
  }

  // Apply order
  if (State.practiceOrder === 'random') {
    words = shuffleArray(words);
  }

  State.practiceWords  = words;
  State.practiceIndex  = 0;
  State.sessionCorrect = 0;
  State.sessionWrong   = 0;
  State.sessionWrongWords = [];

  hide('modeSelectorSection');

  if (State.practiceMode === 'flashcard') {
    startFlashcardMode();
  } else {
    startTypeMode();
  }
}

// ─── Flashcard mode ──────────────────────────────────────────────────────────
function startFlashcardMode() {
  show('flashcardMode');
  hide('typeMode');
  hide('practiceResults');

  State.flashcardFlipped = false;
  updateFlashcardUI();
  updateFlashcardProgress();

  // Flip on card click
  $('flashcardScene').onclick = flipFlashcard;
  $('fcFlipBtn').onclick      = flipFlashcard;

  // Correct / Wrong buttons
  $('fcCorrectBtn').onclick = () => markFlashcard(true);
  $('fcWrongBtn').onclick   = () => markFlashcard(false);
}

function flipFlashcard() {
  const card = $('theFlashcard');
  State.flashcardFlipped = !State.flashcardFlipped;
  card.classList.toggle('flipped', State.flashcardFlipped);
}

function updateFlashcardUI() {
  const word = State.practiceWords[State.practiceIndex];
  if (!word) return;

  const card = $('theFlashcard');
  // Reset flip
  State.flashcardFlipped = false;
  card.classList.remove('flipped');
  card.classList.add('new-card');
  card.addEventListener('animationend', () => card.classList.remove('new-card'), { once: true });

  $('fcWordFront').textContent = word.word || '';
  $('fcWordBack').textContent  = word.translation || '';
  $('fcExample').textContent   = '';
}

function updateFlashcardProgress() {
  const total   = State.practiceWords.length;
  const current = State.practiceIndex + 1;
  const pct     = Math.round((State.practiceIndex / total) * 100);

  $('fcProgressBar').style.width  = pct + '%';
  $('fcProgressText').textContent = `${current} / ${total}`;
}

function markFlashcard(correct) {
  const word = State.practiceWords[State.practiceIndex];
  if (!word) return;

  if (correct) {
    State.sessionCorrect++;
  } else {
    State.sessionWrong++;
    State.sessionWrongWords.push(word);
  }

  State.practiceIndex++;

  if (State.practiceIndex >= State.practiceWords.length) {
    endPracticeSession();
    return;
  }

  updateFlashcardUI();
  updateFlashcardProgress();
}

// ─── Type mode ───────────────────────────────────────────────────────────────
function startTypeMode() {
  hide('flashcardMode');
  show('typeMode');
  hide('practiceResults');

  renderTypeQuestion();
  updateTypeProgress();

  // Check button
  $('typeCheckBtn').onclick = checkTypeAnswer;
  $('typeNextBtn').onclick  = nextTypeQuestion;

  // Enter key
  $('typeAnswerInput').addEventListener('keydown', handleTypeKeydown);
}

function renderTypeQuestion() {
  const word = State.practiceWords[State.practiceIndex];
  if (!word) return;

  $('typeQuestion').textContent = word.word || '';

  const input = $('typeAnswerInput');
  input.value = '';
  input.className = 'type-input';
  input.disabled  = false;
  input.focus();

  hide('typeFeedback');
  hide('typeNextWrap');

  const typeCard = qs('.type-card');
  typeCard.classList.add('new-question');
  typeCard.addEventListener('animationend', () => typeCard.classList.remove('new-question'), { once: true });
}

function updateTypeProgress() {
  const total   = State.practiceWords.length;
  const current = State.practiceIndex + 1;
  const pct     = Math.round((State.practiceIndex / total) * 100);

  $('typeProgressBar').style.width  = pct + '%';
  $('typeProgressText').textContent = `${current} / ${total}`;
}

function handleTypeKeydown(e) {
  if (e.key === 'Enter') {
    const nextWrap = $('typeNextWrap');
    if (!nextWrap.classList.contains('hidden')) {
      nextTypeQuestion();
    } else {
      checkTypeAnswer();
    }
  }
  if (e.key === 'Tab') {
    e.preventDefault();
    const nextWrap = $('typeNextWrap');
    if (!nextWrap.classList.contains('hidden')) {
      nextTypeQuestion();
    }
  }
}

function checkTypeAnswer() {
  const word    = State.practiceWords[State.practiceIndex];
  if (!word) return;

  const answer  = $('typeAnswerInput').value.trim();
  const correct = word.translation || '';
  const input   = $('typeAnswerInput');

  if (!answer) { toast('Typ een antwoord.', 'warning'); return; }

  input.disabled = true;

  const isCorrect  = normalizeAnswer(answer) === normalizeAnswer(correct);
  const isPartial  = !isCorrect && levenshtein(normalizeAnswer(answer), normalizeAnswer(correct)) <= 2;

  const feedback = $('typeFeedback');
  feedback.classList.remove('hidden', 'correct', 'incorrect', 'partial');

  const typeCard = qs('.type-card');

  if (isCorrect) {
    State.sessionCorrect++;
    input.className = 'type-input correct';
    feedback.className = 'type-feedback correct';
    feedback.innerHTML = `✅ Goed! <strong>${escapeHtml(correct)}</strong>`;
    typeCard.classList.add('correct-burst');
    typeCard.addEventListener('animationend', () => typeCard.classList.remove('correct-burst'), { once: true });
  } else if (isPartial) {
    State.sessionWrong++;
    State.sessionWrongWords.push(word);
    input.className = 'type-input incorrect';
    feedback.className = 'type-feedback partial';
    feedback.innerHTML = `⚡ Bijna! Het antwoord was: <strong>${escapeHtml(correct)}</strong>`;
    typeCard.classList.add('shake');
    typeCard.addEventListener('animationend', () => typeCard.classList.remove('shake'), { once: true });
  } else {
    State.sessionWrong++;
    State.sessionWrongWords.push(word);
    input.className = 'type-input incorrect';
    feedback.className = 'type-feedback incorrect';
    feedback.innerHTML = `❌ Fout. Het antwoord was: <strong>${escapeHtml(correct)}</strong>`;
    typeCard.classList.add('shake');
    typeCard.addEventListener('animationend', () => typeCard.classList.remove('shake'), { once: true });
  }

  show('typeNextWrap');
  // Auto-focus next button
  setTimeout(() => $('typeNextBtn').focus(), 100);
}

function nextTypeQuestion() {
  State.practiceIndex++;

  if (State.practiceIndex >= State.practiceWords.length) {
    endPracticeSession();
    return;
  }

  renderTypeQuestion();
  updateTypeProgress();
}

function normalizeAnswer(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j-1], dp[i-1][j], dp[i][j-1]);
    }
  }
  return dp[m][n];
}

// ─── End session ─────────────────────────────────────────────────────────────
async function endPracticeSession() {
  const total   = State.practiceWords.length;
  const correct = State.sessionCorrect;
  const wrong   = State.sessionWrong;
  const pct     = total > 0 ? Math.round((correct / total) * 100) : 0;

  // Results emoji
  const emoji = pct >= 90 ? '🏆' : pct >= 70 ? '🎉' : pct >= 50 ? '👍' : '💪';

  // Show results
  hide('flashcardMode');
  hide('typeMode');
  show('practiceResults');

  $('resultsEmoji').textContent    = emoji;
  $('resultCorrect').textContent   = correct;
  $('resultWrong').textContent     = wrong;
  $('resultPercent').textContent   = pct + '%';

  // Wrong words list
  const wrongList = $('wrongWordsList');
  if (State.sessionWrongWords.length > 0) {
    wrongList.innerHTML = `
      <p class="wrong-words-title">Woorden om te herhalen (${State.sessionWrongWords.length}):</p>
      ${State.sessionWrongWords.slice(0, 10).map(w => `
        <div class="wrong-word-item">
          <span class="ww-word">${escapeHtml(w.word)}</span>
          <span class="ww-answer">→ ${escapeHtml(w.translation || '?')}</span>
        </div>
      `).join('')}
    `;
  } else {
    wrongList.innerHTML = '<p style="color:var(--success);text-align:center;padding:12px 0;">🎊 Alle woorden goed!</p>';
  }

  // Confetti for high scores
  if (pct >= 80) {
    launchConfetti();
  }

  // Save session to Firestore
  if (State.user && State.currentListId && State.currentListId !== 'demo') {
    try {
      await DB.saveSession(State.user.uid, {
        listId:   State.currentListId,
        mode:     State.practiceMode,
        total, correct, wrong,
        score:    pct,
      });

      // Update list stats
      const list = State.wordLists.find(l => l.id === State.currentListId);
      if (list) {
        list.stats = list.stats || {};
        list.stats.totalCorrect   = (list.stats.totalCorrect || 0) + correct;
        list.stats.totalWrong     = (list.stats.totalWrong || 0) + wrong;
        list.stats.totalPracticed = (list.stats.totalPracticed || 0) + total;
        await DB.updateList(State.user.uid, State.currentListId, { stats: list.stats });
      }
    } catch (e) {
      console.warn('Session save failed:', e);
    }
  }

  // Buttons
  $('practiceAgainBtn').onclick = () => {
    const list = State.wordLists.find(l => l.id === State.currentListId);
    if (list) {
      show('modeSelectorSection');
      hide('practiceResults');
      initPracticeSettings(list);
    }
  };

  $('backToListBtn').onclick = () => navigateTo('dashboard');
}

function launchConfetti() {
  const colors = ['#f5a623', '#6366f1', '#22c55e', '#ef4444', '#fbbf24', '#a78bfa'];
  for (let i = 0; i < 80; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.cssText = `
      left: ${Math.random() * 100}vw;
      top: -10px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      width: ${4 + Math.random() * 8}px;
      height: ${4 + Math.random() * 8}px;
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      animation-duration: ${1.5 + Math.random() * 2}s;
      animation-delay: ${Math.random() * 1}s;
    `;
    document.body.appendChild(piece);
    piece.addEventListener('animationend', () => piece.remove(), { once: true });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// STATS PAGE
// ═══════════════════════════════════════════════════════════════════════════
async function loadStats() {
  if (!State.user) { navigateTo('home'); return; }

  // Animate stat cards
  setTimeout(() => {
    qsa('.stat-card, .stats-card-full').forEach((el, i) => {
      setTimeout(() => el.classList.add('visible'), i * 80);
    });
  }, 100);

  try {
    const lists    = State.wordLists.length > 0 ? State.wordLists : await DB.getLists(State.user.uid);
    const sessions = await DB.getSessions(State.user.uid);

    // Total practiced
    const totalPracticed = sessions.reduce((s, sess) => s + (sess.total || 0), 0);
    const totalCorrect   = sessions.reduce((s, sess) => s + (sess.correct || 0), 0);
    const totalWrong     = sessions.reduce((s, sess) => s + (sess.wrong || 0), 0);
    const totalAll       = totalCorrect + totalWrong;
    const accuracy       = totalAll > 0 ? Math.round((totalCorrect / totalAll) * 100) + '%' : '—';

    animateNumber($('totalPracticed'), totalPracticed);
    $('totalAccuracy').textContent  = accuracy;
    animateNumber($('totalSessions'), sessions.length);
    animateNumber($('totalLists'),    lists.length);

    // Hard words
    renderHardWords(sessions);

    // Recent sessions
    renderRecentSessions(sessions, lists);
  } catch (err) {
    console.error(err);
    toast('Statistieken laden mislukt.', 'error');
  }
}

function animateNumber(el, target) {
  const start    = 0;
  const duration = 800;
  const startTime = performance.now();

  function update(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(start + (target - start) * eased);
    if (progress < 1) requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}

function renderHardWords(sessions) {
  const container = $('hardWordsList');

  // Collect from all list stats
  const allWrongWords = [];
  State.wordLists.forEach(list => {
    if (list.stats?.wrongWords) {
      Object.entries(list.stats.wrongWords).forEach(([word, count]) => {
        allWrongWords.push({ word, count, listName: list.name });
      });
    }
  });

  if (allWrongWords.length === 0) {
    container.innerHTML = '<p class="placeholder-text">Oefen meer om moeilijke woorden te zien.</p>';
    return;
  }

  allWrongWords.sort((a, b) => b.count - a.count);
  container.innerHTML = allWrongWords.slice(0, 10).map(w => `
    <div class="hard-word-item">
      <span class="hw-word">${escapeHtml(w.word)}</span>
      <span class="hw-miss">${w.count}× fout</span>
    </div>
  `).join('');
}

function renderRecentSessions(sessions, lists) {
  const container = $('recentSessionsList');
  if (sessions.length === 0) {
    container.innerHTML = '<p class="placeholder-text">Nog geen sessies gespeeld.</p>';
    return;
  }

  const listMap = {};
  lists.forEach(l => { listMap[l.id] = l.name; });

  container.innerHTML = sessions.slice(0, 8).map(sess => {
    const date     = sess.createdAt?.seconds
      ? new Date(sess.createdAt.seconds * 1000).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
      : '—';
    const listName = listMap[sess.listId] || 'Onbekend';
    const modeLabel = sess.mode === 'flashcard' ? '🃏' : '⌨️';

    return `
      <div class="session-item">
        <div class="si-info">${modeLabel} <strong>${escapeHtml(listName)}</strong> · ${date}</div>
        <span class="si-score">${sess.score || 0}%</span>
      </div>
    `;
  }).join('');
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function debounce(fn, delay) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
