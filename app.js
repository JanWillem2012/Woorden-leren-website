// ============================================================
// WordWise — Main Application
// Firebase Auth + Firestore + Cloudflare Pages + AI Scan
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  increment
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ===================== FIREBASE CONFIG =====================
// 🔧 REPLACE THIS WITH YOUR FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// ===================== APP STATE =====================
let currentUser = null;
let currentLists = [];
let currentListId = null;
let currentStudyWords = [];
let currentStudyIndex = 0;
let studyCorrect = 0;
let studyWrong = 0;
let cardFlipped = false;
let selectedColor = "#6366f1";
let scanImageBase64 = null;

// ===================== DOM HELPERS =====================
const $ = (id) => document.getElementById(id);
const toast = (msg, duration = 3000) => {
  const t = $("toast");
  $("toast-message").textContent = msg;
  t.classList.remove("hidden");
  t.style.animation = "none";
  requestAnimationFrame(() => { t.style.animation = "toastIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)"; });
  clearTimeout(window._toastTimeout);
  window._toastTimeout = setTimeout(() => t.classList.add("hidden"), duration);
};

const showPage = (pageId) => {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  $(pageId).classList.add("active");
};

const showView = (viewId) => {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  $("view-" + viewId).classList.add("active");
  document.querySelectorAll(".sidebar-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.view === viewId);
  });
};

const openModal = (id) => { $(id).classList.remove("hidden"); document.body.style.overflow = "hidden"; };
const closeModal = (id) => { $(id).classList.add("hidden"); document.body.style.overflow = ""; };
const hideLoading = () => {
  const overlay = $("loading-overlay");
  overlay.classList.add("fade-out");
  setTimeout(() => overlay.style.display = "none", 400);
};

// ===================== AUTH STATE =====================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    await initDashboard(user);
    showPage("page-dashboard");
    hideLoading();
  } else {
    currentUser = null;
    showPage("page-auth");
    hideLoading();
  }
});

// ===================== AUTH HANDLERS =====================

// Google Login
$("btn-google-login").addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (e) {
    showAuthError("auth-error-login", getFriendlyError(e));
  }
});

$("btn-google-register").addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (e) {
    showAuthError("auth-error-register", getFriendlyError(e));
  }
});

// Email Login
$("btn-email-login").addEventListener("click", async () => {
  const email = $("login-email").value.trim();
  const password = $("login-password").value;
  if (!email || !password) return showAuthError("auth-error-login", "Vul alle velden in.");
  try {
    $("btn-email-login").textContent = "Bezig...";
    $("btn-email-login").disabled = true;
    await signInWithEmailAndPassword(auth, email, password);
  } catch (e) {
    showAuthError("auth-error-login", getFriendlyError(e));
    $("btn-email-login").textContent = "Inloggen";
    $("btn-email-login").disabled = false;
  }
});

// Email Register
$("btn-email-register").addEventListener("click", async () => {
  const name = $("reg-name").value.trim();
  const email = $("reg-email").value.trim();
  const password = $("reg-password").value;
  if (!name || !email || !password) return showAuthError("auth-error-register", "Vul alle velden in.");
  if (password.length < 6) return showAuthError("auth-error-register", "Wachtwoord moet minimaal 6 tekens zijn.");
  try {
    $("btn-email-register").textContent = "Bezig...";
    $("btn-email-register").disabled = true;
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
  } catch (e) {
    showAuthError("auth-error-register", getFriendlyError(e));
    $("btn-email-register").textContent = "Account aanmaken";
    $("btn-email-register").disabled = false;
  }
});

// Forgot password
$("btn-forgot").addEventListener("click", async () => {
  const email = $("login-email").value.trim();
  if (!email) return showAuthError("auth-error-login", "Vul je e-mailadres in.");
  try {
    await sendPasswordResetEmail(auth, email);
    toast("📧 Reset-e-mail verstuurd!");
  } catch (e) {
    showAuthError("auth-error-login", getFriendlyError(e));
  }
});

// Logout
$("btn-logout").addEventListener("click", async () => {
  await signOut(auth);
  closeModal("modal-create-list");
  closeModal("modal-study");
  closeModal("modal-list-detail");
  toast("👋 Tot ziens!");
});

// Auth tabs
document.querySelectorAll(".auth-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".auth-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".auth-form-section").forEach(s => s.classList.remove("active"));
    tab.classList.add("active");
    $("tab-" + tab.dataset.tab).classList.add("active");
  });
});

const showAuthError = (id, msg) => {
  const el = $(id);
  el.textContent = msg;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 5000);
};

const getFriendlyError = (e) => {
  const map = {
    "auth/user-not-found": "Geen account gevonden met dit e-mailadres.",
    "auth/wrong-password": "Onjuist wachtwoord.",
    "auth/email-already-in-use": "Dit e-mailadres is al in gebruik.",
    "auth/invalid-email": "Ongeldig e-mailadres.",
    "auth/too-many-requests": "Te veel pogingen. Probeer later opnieuw.",
    "auth/popup-closed-by-user": "Aanmelding geannuleerd.",
    "auth/invalid-credential": "Onjuiste inloggegevens."
  };
  return map[e.code] || "Er is iets misgegaan. Probeer opnieuw.";
};

// ===================== DASHBOARD INIT =====================
async function initDashboard(user) {
  const displayName = user.displayName || user.email.split("@")[0];
  $("greeting-name").textContent = displayName.split(" ")[0];
  $("user-name-nav").textContent = displayName;
  $("dropdown-email").textContent = user.email;

  // Set avatar initials
  const initials = displayName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  $("user-avatar").textContent = initials;

  await loadLists();
  updateStats();
}

// User menu toggle
$("user-menu-btn").addEventListener("click", (e) => {
  e.stopPropagation();
  $("user-dropdown").classList.toggle("hidden");
});
document.addEventListener("click", () => $("user-dropdown").classList.add("hidden"));

// Sidebar navigation
document.querySelectorAll(".sidebar-btn").forEach(btn => {
  btn.addEventListener("click", () => showView(btn.dataset.view));
});

// ===================== FIRESTORE: LISTS =====================
async function loadLists() {
  if (!currentUser) return;
  try {
    const q = query(
      collection(db, "lists"),
      where("userId", "==", currentUser.uid),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    currentLists = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderLists();
  } catch (e) {
    console.error("Error loading lists:", e);
  }
}

function renderLists() {
  const recentEl = $("recent-lists");
  const allEl = $("all-lists");
  const emptyEl = $("empty-lists");

  if (!currentLists.length) {
    recentEl.innerHTML = `<div class="empty-state" style="padding:40px"><div class="empty-icon">📖</div><h3>Nog geen lijsten</h3><p>Maak je eerste woordenlijst aan!</p></div>`;
    allEl.innerHTML = "";
    emptyEl.classList.remove("hidden");
    return;
  }

  emptyEl.classList.add("hidden");
  const html = currentLists.map((list, i) => createListCardHTML(list, i)).join("");
  recentEl.innerHTML = html;
  allEl.innerHTML = html;

  // Attach events
  document.querySelectorAll(".list-card").forEach(card => {
    card.addEventListener("click", () => openListDetail(card.dataset.id));
  });
  document.querySelectorAll(".list-card-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      startStudy(btn.dataset.id);
    });
  });
}

function createListCardHTML(list, i) {
  const count = list.wordCount || 0;
  const mastered = list.masteredCount || 0;
  const pct = count > 0 ? Math.round((mastered / count) * 100) : 0;
  const emojis = ["📚", "🌍", "✨", "🎯", "🌟", "🔤", "💡", "📝"];
  const emoji = emojis[i % emojis.length];
  const color = list.color || "#6366f1";

  return `
    <div class="list-card" data-id="${list.id}" style="--card-color:${color}" 
         style="animation-delay:${i * 0.05}s">
      <span class="list-card-emoji">${emoji}</span>
      <div class="list-card-header">
        <span class="list-card-title">${escapeHtml(list.name)}</span>
      </div>
      <div class="list-card-meta">${list.fromLang || "NL"} → ${list.toLang || "EN"}${list.description ? " · " + escapeHtml(list.description.slice(0, 40)) + (list.description.length > 40 ? "..." : "") : ""}</div>
      <div class="list-card-footer">
        <span class="list-card-count">${count} woorden</span>
        <button class="list-card-btn" data-id="${list.id}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          Oefenen
        </button>
      </div>
      <div class="list-card-progress">
        <div class="list-card-progress-fill" style="width:${pct}%"></div>
      </div>
    </div>`;
}

function updateStats() {
  const totalCards = currentLists.reduce((a, l) => a + (l.wordCount || 0), 0);
  const mastered = currentLists.reduce((a, l) => a + (l.masteredCount || 0), 0);
  $("stat-lists").textContent = currentLists.length;
  $("stat-cards").textContent = totalCards;
  $("stat-mastered").textContent = mastered;

  // Render progress view
  renderProgressView();
}

function renderProgressView() {
  const el = $("progress-content");
  if (!currentLists.length) {
    el.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">📊</div><h3>Geen voortgang nog</h3><p>Begin met oefenen om je voortgang te zien!</p></div>`;
    return;
  }
  el.innerHTML = currentLists.map(list => {
    const count = list.wordCount || 0;
    const mastered = list.masteredCount || 0;
    const pct = count > 0 ? Math.round((mastered / count) * 100) : 0;
    return `
      <div class="progress-card">
        <div class="progress-card-header">
          <span class="progress-card-title">${escapeHtml(list.name)}</span>
          <span class="progress-pct">${pct}%</span>
        </div>
        <div class="progress-bar-wrap">
          <div class="progress-bar-fill" style="width:${pct}%"></div>
        </div>
        <div class="progress-meta">${mastered} / ${count} woorden beheerst</div>
      </div>`;
  }).join("");
}

// Search
$("search-lists").addEventListener("input", (e) => {
  const q = e.target.value.toLowerCase();
  document.querySelectorAll(".list-card").forEach(card => {
    const title = card.querySelector(".list-card-title").textContent.toLowerCase();
    card.style.display = title.includes(q) ? "" : "none";
  });
});

// ===================== CREATE LIST FLOW =====================
const openCreate = () => {
  resetCreateModal();
  openModal("modal-create-list");
};

["btn-open-create", "btn-open-create2", "btn-open-create3"].forEach(id => {
  $(id)?.addEventListener("click", openCreate);
});
$("btn-new-list")?.addEventListener("click", openCreate);

["close-create-btn", "close-create-modal"].forEach(id => {
  $(id).addEventListener("click", () => closeModal("modal-create-list"));
});

function resetCreateModal() {
  $("create-step-1").classList.add("active");
  $("create-step-2").classList.remove("active");
  document.querySelector(".step-dot[data-step='1']").classList.add("active");
  document.querySelector(".step-dot[data-step='2']").classList.remove("active");
  $("list-name").value = "";
  $("list-desc").value = "";
  $("words-input-list").innerHTML = createWordRow();
  selectedColor = "#6366f1";
  document.querySelectorAll(".color-opt").forEach((b, i) => b.classList.toggle("active", i === 0));
  scanImageBase64 = null;
  $("scan-placeholder").classList.remove("hidden");
  $("scan-preview").classList.add("hidden");
  $("scan-results").classList.add("hidden");
  $("btn-analyze-scan").classList.add("hidden");
  showMethod("manual");
  showMethodTab("manual");
}

function createWordRow() {
  return `<div class="word-row">
    <input type="text" class="word-input" placeholder="Woord..." />
    <input type="text" class="trans-input" placeholder="Vertaling..." />
    <button class="remove-word-btn" title="Verwijder">×</button>
  </div>`;
}

// Step navigation
$("create-next-step").addEventListener("click", () => {
  const name = $("list-name").value.trim();
  if (!name) { toast("⚠️ Geef je lijst een naam!"); return; }
  $("create-step-1").classList.remove("active");
  $("create-step-2").classList.add("active");
  document.querySelector(".step-dot[data-step='1']").classList.remove("active");
  document.querySelector(".step-dot[data-step='1']").classList.add("done");
  document.querySelector(".step-dot[data-step='2']").classList.add("active");
});

$("create-prev-step").addEventListener("click", () => {
  $("create-step-2").classList.remove("active");
  $("create-step-1").classList.add("active");
  document.querySelector(".step-dot[data-step='2']").classList.remove("active");
  document.querySelector(".step-dot[data-step='1']").classList.remove("done");
  document.querySelector(".step-dot[data-step='1']").classList.add("active");
});

// Add word row
$("btn-add-word-row").addEventListener("click", () => {
  const div = document.createElement("div");
  div.innerHTML = createWordRow();
  const row = div.firstElementChild;
  $("words-input-list").appendChild(row);
  row.querySelector(".word-input").focus();
  attachRemoveWordBtn(row);
});

document.addEventListener("click", (e) => {
  if (e.target.classList.contains("remove-word-btn")) {
    const rows = $("words-input-list").querySelectorAll(".word-row");
    if (rows.length > 1) e.target.closest(".word-row").remove();
    else toast("Je hebt minimaal 1 rij nodig.");
  }
});

function attachRemoveWordBtn(row) {
  row.querySelector(".remove-word-btn").addEventListener("click", () => {
    const rows = $("words-input-list").querySelectorAll(".word-row");
    if (rows.length > 1) row.remove();
  });
}

// Color picker
document.querySelectorAll(".color-opt").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".color-opt").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedColor = btn.dataset.color;
  });
});

// Method tabs
document.querySelectorAll(".method-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    showMethod(tab.dataset.method);
    showMethodTab(tab.dataset.method);
  });
});

function showMethod(method) {
  document.querySelectorAll(".method-panel").forEach(p => p.classList.remove("active"));
  $("method-" + method).classList.add("active");
}

function showMethodTab(method) {
  document.querySelectorAll(".method-tab").forEach(t => t.classList.toggle("active", t.dataset.method === method));
}

// ===================== SCAN / AI RECOGNITION =====================
$("btn-take-photo").addEventListener("click", () => $("scan-file-input").click());

$("scan-file-input").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  handleScanFile(file);
});

// Drag and drop
const scanArea = $("scan-area");
scanArea.addEventListener("dragover", (e) => { e.preventDefault(); scanArea.classList.add("drag-over"); });
scanArea.addEventListener("dragleave", () => scanArea.classList.remove("drag-over"));
scanArea.addEventListener("drop", (e) => {
  e.preventDefault();
  scanArea.classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file?.type.startsWith("image/")) handleScanFile(file);
});

function handleScanFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;
    scanImageBase64 = dataUrl.split(",")[1];
    $("scan-img").src = dataUrl;
    $("scan-placeholder").classList.add("hidden");
    $("scan-preview").classList.remove("hidden");
    $("btn-analyze-scan").classList.remove("hidden");
  };
  reader.readAsDataURL(file);
}

$("btn-remove-scan").addEventListener("click", () => {
  scanImageBase64 = null;
  $("scan-img").src = "";
  $("scan-placeholder").classList.remove("hidden");
  $("scan-preview").classList.add("hidden");
  $("btn-analyze-scan").classList.add("hidden");
  $("scan-results").classList.add("hidden");
  $("scan-file-input").value = "";
});

$("btn-analyze-scan").addEventListener("click", () => analyzeImage());

async function analyzeImage() {
  if (!scanImageBase64) return;

  $("scan-results").classList.remove("hidden");
  $("scan-loading").classList.remove("hidden");
  $("scan-words-output").classList.add("hidden");

  try {
    // Using Claude API (via Anthropic) for image recognition
    // This uses the Anthropic API directly from the browser
    // For production, proxy this through a Cloudflare Worker to hide the API key
    const apiKey = window.ANTHROPIC_API_KEY || "YOUR_ANTHROPIC_API_KEY";

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 1500,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: scanImageBase64
              }
            },
            {
              type: "text",
              text: `Analyseer deze afbeelding van een woordenlijst of tekst. Extraheer alle woord-vertaling paren die je ziet.
              
              Geef ALLEEN een JSON array terug in dit exacte formaat, zonder andere tekst:
              [{"word": "het woord", "translation": "de vertaling"}, ...]
              
              Als je geen duidelijke woordparen ziet, probeer dan woorden die op een woordenlijst lijken te identificeren.
              Detecteer de talen automatisch. Geef maximaal 50 paren terug.`
            }
          ]
        }]
      })
    });

    const data = await response.json();

    if (data.error) throw new Error(data.error.message);

    const text = data.content[0].text.trim();
    let pairs = [];

    // Try to parse JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      pairs = JSON.parse(jsonMatch[0]);
    }

    if (!pairs.length) throw new Error("Geen woorden gevonden");

    // Show results
    $("scan-loading").classList.add("hidden");
    $("scan-words-output").classList.remove("hidden");

    const list = $("scan-words-list");
    list.innerHTML = pairs.map(() => createWordRow()).join("");

    list.querySelectorAll(".word-row").forEach((row, i) => {
      if (pairs[i]) {
        row.querySelector(".word-input").value = pairs[i].word || "";
        row.querySelector(".trans-input").value = pairs[i].translation || "";
      }
    });

    toast(`✅ ${pairs.length} woorden herkend!`);

  } catch (e) {
    $("scan-loading").classList.add("hidden");
    $("scan-results").classList.add("hidden");
    console.error("Scan error:", e);
    toast("⚠️ Kon woorden niet herkennen. Gebruik handmatige invoer.");
  }
}

// ===================== SAVE LIST =====================
$("btn-save-list").addEventListener("click", saveList);

async function saveList() {
  const name = $("list-name").value.trim();
  if (!name) { toast("⚠️ Geef je lijst een naam!"); return; }

  let words = [];

  // Collect from active method
  const activeMethod = document.querySelector(".method-panel.active").id;

  if (activeMethod === "method-manual") {
    document.querySelectorAll("#words-input-list .word-row").forEach(row => {
      const word = row.querySelector(".word-input").value.trim();
      const trans = row.querySelector(".trans-input").value.trim();
      if (word && trans) words.push({ word, translation: trans, mastered: false });
    });
  } else {
    // Scan results (in #scan-words-list or #words-input-list)
    const scanList = $("scan-words-list");
    const hasScanned = !$("scan-words-output").classList.contains("hidden");
    const source = hasScanned ? scanList : $("words-input-list");
    source.querySelectorAll(".word-row").forEach(row => {
      const word = row.querySelector(".word-input")?.value.trim();
      const trans = row.querySelector(".trans-input")?.value.trim();
      if (word && trans) words.push({ word, translation: trans, mastered: false });
    });
  }

  if (!words.length) { toast("⚠️ Voeg minimaal 1 woord met vertaling toe!"); return; }

  const btn = $("btn-save-list");
  btn.textContent = "Opslaan...";
  btn.disabled = true;

  try {
    const listRef = await addDoc(collection(db, "lists"), {
      userId: currentUser.uid,
      name,
      description: $("list-desc").value.trim(),
      fromLang: $("list-from-lang").value,
      toLang: $("list-to-lang").value,
      color: selectedColor,
      wordCount: words.length,
      masteredCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Add words as subcollection
    const wordsRef = collection(db, "lists", listRef.id, "words");
    await Promise.all(words.map(w => addDoc(wordsRef, { ...w, createdAt: serverTimestamp() })));

    closeModal("modal-create-list");
    await loadLists();
    updateStats();
    toast(`🎉 Lijst "${name}" aangemaakt met ${words.length} woorden!`);
  } catch (e) {
    console.error("Save error:", e);
    toast("❌ Fout bij opslaan. Probeer opnieuw.");
  } finally {
    btn.textContent = "Lijst opslaan";
    btn.disabled = false;
  }
}

// ===================== LIST DETAIL =====================
async function openListDetail(listId) {
  currentListId = listId;
  const list = currentLists.find(l => l.id === listId);
  if (!list) return;

  $("detail-list-name").textContent = list.name;
  $("detail-list-meta").textContent = `${list.fromLang || "NL"} → ${list.toLang || "EN"} · ${list.wordCount || 0} woorden`;

  openModal("modal-list-detail");
  await loadDetailWords(listId);
}

async function loadDetailWords(listId, search = "") {
  const snap = await getDocs(collection(db, "lists", listId, "words"));
  const words = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .filter(w => !search || w.word.toLowerCase().includes(search) || w.translation.toLowerCase().includes(search));

  const el = $("detail-words-list");
  if (!words.length) {
    el.innerHTML = `<div style="padding:20px;text-align:center;color:var(--text-2);grid-column:1/-1">Geen woorden gevonden.</div>`;
    return;
  }

  el.innerHTML = words.map((w, i) => `
    <div class="word-item" style="animation-delay:${i * 0.03}s">
      <div class="word-pair">
        <span class="word">${escapeHtml(w.word)}</span>
        <span class="trans">${escapeHtml(w.translation)}</span>
      </div>
      <div class="word-actions">
        <button class="word-delete-btn" data-list="${listId}" data-word="${w.id}" title="Verwijder">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
        </button>
      </div>
    </div>`).join("");

  // Delete word
  el.querySelectorAll(".word-delete-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      await deleteDoc(doc(db, "lists", btn.dataset.list, "words", btn.dataset.word));
      await updateDoc(doc(db, "lists", btn.dataset.list), { wordCount: increment(-1) });
      await loadDetailWords(listId);
      await loadLists();
      updateStats();
      toast("🗑️ Woord verwijderd");
    });
  });
}

// Add word to existing list
$("btn-add-word-to-list").addEventListener("click", () => {
  const word = prompt("Voer het woord in:");
  if (!word?.trim()) return;
  const trans = prompt("Voer de vertaling in:");
  if (!trans?.trim()) return;
  addWordToList(currentListId, word.trim(), trans.trim());
});

async function addWordToList(listId, word, translation) {
  await addDoc(collection(db, "lists", listId, "words"), {
    word, translation, mastered: false, createdAt: serverTimestamp()
  });
  await updateDoc(doc(db, "lists", listId), { wordCount: increment(1) });
  await loadDetailWords(listId);
  await loadLists();
  updateStats();
  toast(`✅ "${word}" toegevoegd!`);
}

// Detail search
$("detail-search").addEventListener("input", (e) => {
  loadDetailWords(currentListId, e.target.value.toLowerCase());
});

// Close detail modal
["close-detail-btn", "close-detail-modal"].forEach(id => {
  $(id).addEventListener("click", () => closeModal("modal-list-detail"));
});

// ===================== STUDY / FLASHCARDS =====================
$("btn-start-study").addEventListener("click", () => {
  if (currentListId) startStudy(currentListId);
});

async function startStudy(listId) {
  currentListId = listId;
  const snap = await getDocs(collection(db, "lists", listId, "words"));
  const words = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  if (!words.length) { toast("⚠️ Deze lijst heeft nog geen woorden!"); return; }

  // Shuffle
  currentStudyWords = [...words].sort(() => Math.random() - 0.5);
  currentStudyIndex = 0;
  studyCorrect = 0;
  studyWrong = 0;
  cardFlipped = false;

  closeModal("modal-list-detail");
  openModal("modal-study");
  showStudyCard();
}

function showStudyCard() {
  const total = currentStudyWords.length;
  const card = currentStudyWords[currentStudyIndex];

  $("study-complete").classList.add("hidden");
  $("flashcard").classList.remove("hidden");
  $("study-actions").classList.add("hidden");
  $("flip-hint").classList.remove("hidden");
  $("study-counter").textContent = `${currentStudyIndex + 1} / ${total}`;
  $("study-progress-fill").style.width = `${((currentStudyIndex) / total) * 100}%`;

  $("card-word").textContent = card.word;
  $("card-translation").textContent = card.translation;

  // Reset flip
  $("flashcard").classList.remove("flipped");
  cardFlipped = false;
}

$("flashcard").addEventListener("click", () => {
  if (!cardFlipped) {
    $("flashcard").classList.add("flipped");
    cardFlipped = true;
    $("study-actions").classList.remove("hidden");
    $("flip-hint").classList.add("hidden");
  }
});

$("btn-correct").addEventListener("click", () => nextCard(true));
$("btn-wrong").addEventListener("click", () => nextCard(false));

function nextCard(correct) {
  if (correct) studyCorrect++; else studyWrong++;

  currentStudyIndex++;
  if (currentStudyIndex >= currentStudyWords.length) {
    showStudyComplete();
  } else {
    showStudyCard();
  }
}

async function showStudyComplete() {
  const total = currentStudyWords.length;
  $("study-progress-fill").style.width = "100%";
  $("flashcard").classList.add("hidden");
  $("study-actions").classList.add("hidden");
  $("flip-hint").classList.add("hidden");
  $("study-complete").classList.remove("hidden");

  $("cs-correct").textContent = studyCorrect;
  $("cs-wrong").textContent = studyWrong;

  // Update mastered count in Firestore
  try {
    await updateDoc(doc(db, "lists", currentListId), {
      masteredCount: studyCorrect,
      lastStudied: serverTimestamp()
    });
    await loadLists();
    updateStats();
  } catch (e) {
    console.error("Update mastered error:", e);
  }
}

$("btn-study-again").addEventListener("click", () => {
  currentStudyIndex = 0;
  studyCorrect = 0;
  studyWrong = 0;
  currentStudyWords = [...currentStudyWords].sort(() => Math.random() - 0.5);
  showStudyCard();
});

$("btn-study-done").addEventListener("click", () => closeModal("modal-study"));

["close-study-btn", "close-study-modal"].forEach(id => {
  $(id).addEventListener("click", () => closeModal("modal-study"));
});

// ===================== UTILS =====================
function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Keyboard shortcuts
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    ["modal-create-list", "modal-study", "modal-list-detail"].forEach(id => {
      if (!$(id).classList.contains("hidden")) closeModal(id);
    });
  }
  // Study: spacebar flips card
  if (e.code === "Space" && !$("modal-study").classList.contains("hidden")) {
    e.preventDefault();
    if (!cardFlipped) $("flashcard").click();
  }
  // Study: arrow keys
  if (!$("modal-study").classList.contains("hidden") && cardFlipped) {
    if (e.key === "ArrowRight") nextCard(true);
    if (e.key === "ArrowLeft") nextCard(false);
  }
});

console.log("🎓 WordWise loaded successfully!");
