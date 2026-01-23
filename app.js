// Main application initialization
export function initializeApp() {
    console.log('Initializing WordMaster app...');
    
    // Show loading
    showLoading('Applicatie laden...');
    
    // Initialize components
    initializeNavigation();
    initializeDashboard();
    initializeWordlists();
    initializePractice();
    initializeOCR();
    initializeStats();
    
    // Check authentication
    checkAuthentication();
    
    // Hide loading after a short delay
    setTimeout(() => {
        hideLoading();
        console.log('WordMaster app ready!');
    }, 1000);
}

// Navigation
function initializeNavigation() {
    console.log('Initializing navigation...');
    
    const navLinks = document.querySelectorAll('.nav-link');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    
    // Navigation click handlers
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.getAttribute('data-page');
            switchPage(page);
            
            // Update active state
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            // Close mobile menu if open
            document.getElementById('nav-links').classList.remove('active');
        });
    });
    
    // Mobile menu
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            document.getElementById('nav-links').classList.toggle('active');
        });
    }
    
    // Skip auth button
    const skipAuthBtn = document.getElementById('skip-auth');
    if (skipAuthBtn) {
        skipAuthBtn.addEventListener('click', () => {
            document.getElementById('clerk-auth-container').style.display = 'none';
            showToast('Je gebruikt nu de demo versie. Log in om alle functies te gebruiken.', 'info');
        });
    }
}

// Page switching
function switchPage(page) {
    console.log('Switching to page:', page);
    
    // Hide all pages
    const pages = document.querySelectorAll('.page');
    pages.forEach(p => {
        p.classList.remove('active');
        p.style.display = 'none';
    });
    
    // Show selected page
    const targetPage = document.getElementById(`${page}-page`);
    if (targetPage) {
        targetPage.style.display = 'block';
        setTimeout(() => {
            targetPage.classList.add('active');
        }, 10);
    }
}

// Dashboard
function initializeDashboard() {
    console.log('Initializing dashboard...');
    
    // Dashboard buttons
    const createBtn = document.getElementById('create-wordlist-dashboard');
    const practiceBtn = document.getElementById('start-practice-dashboard');
    const scanBtn = document.getElementById('scan-wordlist-dashboard');
    
    if (createBtn) {
        createBtn.addEventListener('click', () => {
            switchPage('wordlists');
            setTimeout(() => {
                document.getElementById('create-wordlist-btn').click();
            }, 300);
        });
    }
    
    if (practiceBtn) {
        practiceBtn.addEventListener('click', () => {
            switchPage('practice');
        });
    }
    
    if (scanBtn) {
        scanBtn.addEventListener('click', () => {
            switchPage('ocr-upload');
        });
    }
}

// Wordlists
function initializeWordlists() {
    console.log('Initializing wordlists...');
    
    // Elements
    const createBtn = document.getElementById('create-wordlist-btn');
    const modal = document.getElementById('wordlist-modal');
    const closeModal = document.getElementById('close-modal');
    const cancelBtn = document.getElementById('cancel-wordlist');
    const saveBtn = document.getElementById('save-wordlist');
    const addWordBtn = document.getElementById('add-word-btn');
    const importBtn = document.getElementById('import-words-btn');
    const processImportBtn = document.getElementById('process-import-btn');
    
    // Create new wordlist
    if (createBtn) {
        createBtn.addEventListener('click', () => {
            openWordlistModal();
        });
    }
    
    // Close modal
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
    
    // Save wordlist
    if (saveBtn) {
        saveBtn.addEventListener('click', saveWordlist);
    }
    
    // Add word row
    if (addWordBtn) {
        addWordBtn.addEventListener('click', addWordRow);
    }
    
    // Import words
    if (importBtn) {
        importBtn.addEventListener('click', () => {
            const importSection = document.getElementById('import-section');
            importSection.style.display = importSection.style.display === 'none' ? 'block' : 'none';
        });
    }
    
    if (processImportBtn) {
        processImportBtn.addEventListener('click', importWords);
    }
    
    // Load wordlists
    loadWordlists();
}

// Practice
function initializePractice() {
    console.log('Initializing practice...');
    
    // Mode selection
    const modeBtns = document.querySelectorAll('.mode-btn');
    modeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            modeBtns.forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            const mode = e.currentTarget.getAttribute('data-mode');
            // For now, we only handle typing mode
            if (mode === 'flashcards') {
                showToast('Flashcards modus komt binnenkort!', 'info');
                e.currentTarget.classList.remove('active');
                modeBtns[0].classList.add('active');
            }
        });
    });
    
    // Start practice
    const startBtn = document.getElementById('start-practice-btn');
    if (startBtn) {
        startBtn.addEventListener('click', startPractice);
    }
    
    // Practice controls
    const checkBtn = document.getElementById('check-answer');
    const skipBtn = document.getElementById('skip-word');
    const nextBtn = document.getElementById('next-word');
    const answerInput = document.getElementById('typing-answer');
    
    if (checkBtn) checkBtn.addEventListener('click', checkAnswer);
    if (skipBtn) skipBtn.addEventListener('click', skipWord);
    if (nextBtn) nextBtn.addEventListener('click', nextWord);
    if (answerInput) {
        answerInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') checkAnswer();
        });
    }
}

// OCR
function initializeOCR() {
    console.log('Initializing OCR...');
    
    // File upload
    const selectBtn = document.getElementById('select-image-btn');
    const fileInput = document.getElementById('image-upload');
    
    if (selectBtn && fileInput) {
        selectBtn.addEventListener('click', () => {
            fileInput.click();
        });
        
        fileInput.addEventListener('change', handleImageUpload);
    }
    
    // Step navigation
    const prevBtn = document.getElementById('prev-step');
    const nextBtn = document.getElementById('next-step');
    
    if (prevBtn) prevBtn.addEventListener('click', prevStep);
    if (nextBtn) nextBtn.addEventListener('click', nextStep);
    
    // Drag and drop
    const uploadArea = document.getElementById('upload-area');
    if (uploadArea) {
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#4361ee';
            uploadArea.style.backgroundColor = 'rgba(67, 97, 238, 0.05)';
        });
        
        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '';
            uploadArea.style.backgroundColor = '';
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '';
            uploadArea.style.backgroundColor = '';
            
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                handleImageUpload({ target: { files: [file] } });
            }
        });
    }
}

// Statistics
function initializeStats() {
    console.log('Initializing statistics...');
    // Will be implemented later
}

// Authentication
function checkAuthentication() {
    console.log('Checking authentication...');
    
    if (window.clerk && window.clerk.user) {
        // User is signed in
        const userButton = document.getElementById('user-button');
        if (userButton) {
            userButton.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-user-circle"></i>
                    <span>${window.clerk.user.firstName || 'Gebruiker'}</span>
                </div>
            `;
        }
        
        // Update welcome message
        const welcomeMsg = document.getElementById('welcome-message');
        if (welcomeMsg) {
            welcomeMsg.textContent = `Welkom terug, ${window.clerk.user.firstName || 'gebruiker'}!`;
        }
        
        // Hide auth container
        document.getElementById('clerk-auth-container').style.display = 'none';
    } else {
        // User is not signed in
        document.getElementById('clerk-auth-container').style.display = 'flex';
        
        // Mount Clerk buttons
        if (window.clerk) {
            const buttonsDiv = document.getElementById('clerk-auth-buttons');
            if (buttonsDiv) {
                window.clerk.mountSignIn(buttonsDiv, {
                    redirectUrl: window.location.href
                });
            }
        }
    }
}

// Wordlist Functions
let currentWordlist = null;
let wordCounter = 0;

function openWordlistModal(wordlist = null) {
    const modal = document.getElementById('wordlist-modal');
    const title = document.getElementById('modal-title');
    const nameInput = document.getElementById('wordlist-name');
    
    currentWordlist = wordlist;
    
    if (wordlist) {
        title.textContent = 'Woordenlijst Bewerken';
        nameInput.value = wordlist.name || '';
    } else {
        title.textContent = 'Nieuwe Woordenlijst';
        nameInput.value = '';
    }
    
    // Clear words table
    const tbody = document.getElementById('words-table-body');
    tbody.innerHTML = '';
    wordCounter = 0;
    
    if (wordlist && wordlist.words) {
        wordlist.words.forEach(word => {
            addWordRow(word.question, word.answer);
        });
    } else {
        // Add initial empty row
        addWordRow('', '');
    }
    
    modal.style.display = 'flex';
}

function addWordRow(question = '', answer = '') {
    const tbody = document.getElementById('words-table-body');
    wordCounter++;
    
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${wordCounter}</td>
        <td><input type="text" class="word-question" value="${question}" placeholder="Vraag/woord"></td>
        <td><input type="text" class="word-answer" value="${answer}" placeholder="Antwoord/betekenis"></td>
        <td>
            <button class="delete-row" style="background: #f72585; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    
    tbody.appendChild(row);
    
    // Add delete event
    const deleteBtn = row.querySelector('.delete-row');
    deleteBtn.addEventListener('click', () => {
        row.remove();
        updateRowNumbers();
    });
}

function updateRowNumbers() {
    const rows = document.querySelectorAll('#words-table-body tr');
    rows.forEach((row, index) => {
        row.cells[0].textContent = index + 1;
    });
    wordCounter = rows.length;
}

function importWords() {
    const importText = document.getElementById('import-text').value.trim();
    if (!importText) {
        showToast('Voer tekst in om te importeren', 'warning');
        return;
    }
    
    const lines = importText.split('\n');
    const tbody = document.getElementById('words-table-body');
    
    // Clear existing rows except first if empty
    if (tbody.children.length === 1) {
        const firstRow = tbody.children[0];
        const questionInput = firstRow.querySelector('.word-question');
        const answerInput = firstRow.querySelector('.word-answer');
        if (!questionInput.value && !answerInput.value) {
            firstRow.remove();
        }
    }
    
    let importedCount = 0;
    
    lines.forEach(line => {
        line = line.trim();
        if (!line) return;
        
        const parts = line.split('|');
        if (parts.length >= 2) {
            addWordRow(parts[0].trim(), parts[1].trim());
            importedCount++;
        }
    });
    
    if (importedCount > 0) {
        showToast(`${importedCount} woorden geïmporteerd`, 'success');
        document.getElementById('import-section').style.display = 'none';
        document.getElementById('import-text').value = '';
    } else {
        showToast('Geen geldige woordparen gevonden. Gebruik vraag|antwoord formaat.', 'error');
    }
}

async function saveWordlist() {
    const name = document.getElementById('wordlist-name').value.trim();
    if (!name) {
        showToast('Voer een naam in voor de woordenlijst', 'warning');
        return;
    }
    
    // Collect words
    const words = [];
    const rows = document.querySelectorAll('#words-table-body tr');
    
    rows.forEach(row => {
        const question = row.querySelector('.word-question').value.trim();
        const answer = row.querySelector('.word-answer').value.trim();
        
        if (question && answer) {
            words.push({ question, answer });
        }
    });
    
    if (words.length === 0) {
        showToast('Voeg minstens één woord toe aan de lijst', 'warning');
        return;
    }
    
    showLoading('Woordenlijst opslaan...');
    
    try {
        const wordlistData = {
            name,
            words,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            wordCount: words.length
        };
        
        // Check if user is authenticated
        if (window.clerk && window.clerk.user) {
            // Save to Firebase
            const userId = window.clerk.user.id;
            const db = window.db;
            
            if (currentWordlist && currentWordlist.id) {
                // Update existing
                await db.collection('users').doc(userId).collection('wordlists')
                    .doc(currentWordlist.id).update(wordlistData);
                showToast('Woordenlijst bijgewerkt', 'success');
            } else {
                // Create new
                await db.collection('users').doc(userId).collection('wordlists')
                    .add(wordlistData);
                showToast('Woordenlijst aangemaakt', 'success');
            }
            
            // Reload wordlists
            loadWordlists();
        } else {
            // Save to localStorage for demo
            const wordlists = JSON.parse(localStorage.getItem('wordlists') || '[]');
            
            if (currentWordlist && currentWordlist.id) {
                const index = wordlists.findIndex(w => w.id === currentWordlist.id);
                if (index !== -1) {
                    wordlists[index] = { ...currentWordlist, ...wordlistData };
                }
            } else {
                wordlists.push({
                    id: Date.now().toString(),
                    ...wordlistData
                });
            }
            
            localStorage.setItem('wordlists', JSON.stringify(wordlists));
            showToast('Woordenlijst opgeslagen (lokaal)', 'success');
            
            // Update UI
            updateWordlistDisplay();
        }
        
        // Close modal
        document.getElementById('wordlist-modal').style.display = 'none';
        
    } catch (error) {
        console.error('Error saving wordlist:', error);
        showToast('Kan woordenlijst niet opslaan', 'error');
    } finally {
        hideLoading();
    }
}

async function loadWordlists() {
    try {
        // Check authentication
        if (window.clerk && window.clerk.user) {
            // Load from Firebase
            const userId = window.clerk.user.id;
            const db = window.db;
            
            const querySnapshot = await db.collection('users').doc(userId)
                .collection('wordlists').orderBy('updatedAt', 'desc').get();
            
            const wordlists = [];
            querySnapshot.forEach(doc => {
                wordlists.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            window.wordlists = wordlists;
        } else {
            // Load from localStorage for demo
            const savedWordlists = JSON.parse(localStorage.getItem('wordlists') || '[]');
            window.wordlists = savedWordlists;
        }
        
        // Update display
        updateWordlistDisplay();
        
        // Update practice dropdown
        updatePracticeWordlistDropdown();
        
        // Update dashboard stats
        updateDashboardStats();
        
    } catch (error) {
        console.error('Error loading wordlists:', error);
        window.wordlists = [];
    }
}

function updateWordlistDisplay() {
    const grid = document.getElementById('wordlists-grid');
    if (!grid) return;
    
    const wordlists = window.wordlists || [];
    
    if (wordlists.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                <i class="fas fa-list-alt fa-3x" style="color: #6c757d; margin-bottom: 1rem;"></i>
                <h3 style="color: #6c757d; margin-bottom: 0.5rem;">Geen woordenlijsten</h3>
                <p style="color: #6c757d; margin-bottom: 1.5rem;">Maak je eerste woordenlijst om te beginnen met leren</p>
                <button class="btn-primary" id="create-first-wordlist">
                    <i class="fas fa-plus"></i> Eerste Lijst Aanmaken
                </button>
            </div>
        `;
        
        document.getElementById('create-first-wordlist')?.addEventListener('click', () => {
            openWordlistModal();
        });
        
        return;
    }
    
    grid.innerHTML = wordlists.map(wordlist => `
        <div class="wordlist-card">
            <div class="wordlist-header">
                <h3>${wordlist.name}</h3>
                <span class="wordlist-count">${wordlist.wordCount || wordlist.words?.length || 0} woorden</span>
            </div>
            <div class="wordlist-body">
                <p class="wordlist-description">Laatst bijgewerkt: ${formatDate(wordlist.updatedAt)}</p>
                <div class="wordlist-meta">
                    <span class="meta-item">
                        <i class="fas fa-calendar"></i> ${formatDate(wordlist.createdAt)}
                    </span>
                </div>
            </div>
            <div class="wordlist-actions">
                <button class="action-btn edit" onclick="editWordlist('${wordlist.id}')">
                    <i class="fas fa-edit"></i> Bewerken
                </button>
                <button class="action-btn practice" onclick="practiceWordlist('${wordlist.id}')">
                    <i class="fas fa-play"></i> Oefenen
                </button>
                <button class="action-btn delete" onclick="deleteWordlist('${wordlist.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Make functions available globally for onclick handlers
window.editWordlist = function(id) {
    const wordlist = window.wordlists?.find(w => w.id === id);
    if (wordlist) {
        openWordlistModal(wordlist);
    }
};

window.practiceWordlist = function(id) {
    const wordlist = window.wordlists?.find(w => w.id === id);
    if (wordlist) {
        switchPage('practice');
        
        // Set the wordlist in dropdown
        setTimeout(() => {
            const select = document.getElementById('select-wordlist');
            if (select) {
                select.value = id;
                
                // Update practice stats
                const limitInput = document.getElementById('practice-limit');
                const totalWords = wordlist.wordCount || wordlist.words?.length || 0;
                limitInput.max = totalWords;
                limitInput.value = Math.min(10, totalWords);
            }
        }, 300);
    }
};

window.deleteWordlist = async function(id) {
    if (!confirm('Weet je zeker dat je deze woordenlijst wilt verwijderen?')) {
        return;
    }
    
    showLoading('Woordenlijst verwijderen...');
    
    try {
        if (window.clerk && window.clerk.user) {
            // Delete from Firebase
            const userId = window.clerk.user.id;
            const db = window.db;
            
            await db.collection('users').doc(userId).collection('wordlists')
                .doc(id).delete();
        } else {
            // Delete from localStorage
            const wordlists = JSON.parse(localStorage.getItem('wordlists') || '[]');
            const filtered = wordlists.filter(w => w.id !== id);
            localStorage.setItem('wordlists', JSON.stringify(filtered));
        }
        
        // Update local array
        window.wordlists = window.wordlists?.filter(w => w.id !== id) || [];
        
        // Update UI
        updateWordlistDisplay();
        updatePracticeWordlistDropdown();
        updateDashboardStats();
        
        showToast('Woordenlijst verwijderd', 'success');
        
    } catch (error) {
        console.error('Error deleting wordlist:', error);
        showToast('Kan woordenlijst niet verwijderen', 'error');
    } finally {
        hideLoading();
    }
};

function updatePracticeWordlistDropdown() {
    const select = document.getElementById('select-wordlist');
    if (!select) return;
    
    // Clear existing options except first
    while (select.options.length > 1) {
        select.remove(1);
    }
    
    const wordlists = window.wordlists || [];
    
    wordlists.forEach(wordlist => {
        const option = document.createElement('option');
        option.value = wordlist.id;
        option.textContent = `${wordlist.name} (${wordlist.wordCount || wordlist.words?.length || 0} woorden)`;
        select.appendChild(option);
    });
}

function updateDashboardStats() {
    const wordlists = window.wordlists || [];
    
    document.getElementById('wordlist-count').textContent = wordlists.length;
    
    const totalWords = wordlists.reduce((sum, list) => {
        return sum + (list.wordCount || list.words?.length || 0);
    }, 0);
    
    document.getElementById('words-learned').textContent = totalWords;
}

// Practice Functions
let practiceSession = {
    wordlist: null,
    words: [],
    currentIndex: 0,
    score: 0,
    startTime: null,
    timer: null,
    elapsedTime: 0
};

function startPractice() {
    const wordlistId = document.getElementById('select-wordlist').value;
    const limit = parseInt(document.getElementById('practice-limit').value) || 10;
    
    if (!wordlistId) {
        showToast('Selecteer een woordenlijst', 'warning');
        return;
    }
    
    const wordlist = window.wordlists?.find(w => w.id === wordlistId);
    if (!wordlist || !wordlist.words || wordlist.words.length === 0) {
        showToast('De geselecteerde woordenlijst bevat geen woorden', 'error');
        return;
    }
    
    // Prepare words for practice
    const allWords = [...wordlist.words];
    const practiceWords = allWords.slice(0, Math.min(limit, allWords.length));
    
    // Shuffle words
    practiceSession.words = shuffleArray(practiceWords);
    practiceSession.wordlist = wordlist;
    practiceSession.currentIndex = 0;
    practiceSession.score = 0;
    practiceSession.elapsedTime = 0;
    practiceSession.startTime = new Date();
    
    // Start timer
    practiceSession.timer = setInterval(() => {
        practiceSession.elapsedTime++;
        updateTimerDisplay();
    }, 1000);
    
    // Show practice interface
    document.getElementById('practice-area').style.display = 'none';
    document.getElementById('typing-practice').style.display = 'block';
    
    // Load first word
    loadNextWord();
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function loadNextWord() {
    if (practiceSession.currentIndex >= practiceSession.words.length) {
        finishPractice();
        return;
    }
    
    const currentWord = practiceSession.words[practiceSession.currentIndex];
    
    document.getElementById('typing-question').textContent = currentWord.question;
    document.getElementById('typing-answer').value = '';
    document.getElementById('typing-answer').focus();
    document.getElementById('typing-feedback').textContent = '';
    document.getElementById('next-word').disabled = true;
    
    // Update progress
    const progress = ((practiceSession.currentIndex) / practiceSession.words.length) * 100;
    document.getElementById('typing-progress').style.width = `${progress}%`;
    document.getElementById('progress-text').textContent = 
        `${practiceSession.currentIndex}/${practiceSession.words.length}`;
    
    // Update score
    document.getElementById('typing-score').textContent = practiceSession.score;
}

function checkAnswer() {
    if (practiceSession.currentIndex >= practiceSession.words.length) return;
    
    const currentWord = practiceSession.words[practiceSession.currentIndex];
    const userAnswer = document.getElementById('typing-answer').value.trim().toLowerCase();
    const correctAnswer = currentWord.answer.toLowerCase();
    
    const feedback = document.getElementById('typing-feedback');
    
    if (userAnswer === correctAnswer) {
        practiceSession.score++;
        feedback.textContent = 'Correct! ✓';
        feedback.style.color = '#4cc9f0';
        feedback.innerHTML += `<br><small>Je hebt ${practiceSession.score} van ${practiceSession.currentIndex + 1} correct.</small>`;
    } else {
        feedback.textContent = `Helaas! Het juiste antwoord is: ${currentWord.answer}`;
        feedback.style.color = '#f72585';
    }
    
    document.getElementById('next-word').disabled = false;
}

function skipWord() {
    const currentWord = practiceSession.words[practiceSession.currentIndex];
    const feedback = document.getElementById('typing-feedback');
    
    feedback.textContent = `Overslagen. Het antwoord was: ${currentWord.answer}`;
    feedback.style.color = '#6c757d';
    
    document.getElementById('next-word').disabled = false;
}

function nextWord() {
    practiceSession.currentIndex++;
    loadNextWord();
}

function updateTimerDisplay() {
    const minutes = Math.floor(practiceSession.elapsedTime / 60);
    const seconds = practiceSession.elapsedTime % 60;
    document.getElementById('typing-time').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function finishPractice() {
    clearInterval(practiceSession.timer);
    
    const accuracy = practiceSession.words.length > 0 ? 
        Math.round((practiceSession.score / practiceSession.words.length) * 100) : 0;
    
    // Show results
    document.getElementById('typing-practice').style.display = 'none';
    document.getElementById('practice-area').style.display = 'flex';
    document.getElementById('practice-area').innerHTML = `
        <div class="practice-results" style="text-align: center;">
            <div class="result-icon" style="font-size: 4rem; color: #4361ee; margin-bottom: 1rem;">
                <i class="fas fa-trophy"></i>
            </div>
            <h2 style="margin-bottom: 2rem;">Oefening Voltooid!</h2>
            
            <div class="result-stats" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 2rem;">
                <div class="result-stat">
                    <span class="stat-label" style="display: block; color: #6c757d; font-size: 0.9rem;">Score</span>
                    <span class="stat-value" style="font-size: 1.5rem; font-weight: bold;">${practiceSession.score}/${practiceSession.words.length}</span>
                </div>
                <div class="result-stat">
                    <span class="stat-label" style="display: block; color: #6c757d; font-size: 0.9rem;">Nauwkeurigheid</span>
                    <span class="stat-value" style="font-size: 1.5rem; font-weight: bold;">${accuracy}%</span>
                </div>
                <div class="result-stat">
                    <span class="stat-label" style="display: block; color: #6c757d; font-size: 0.9rem;">Tijd</span>
                    <span class="stat-value" style="font-size: 1.5rem; font-weight: bold;">${Math.floor(practiceSession.elapsedTime / 60)}:${(practiceSession.elapsedTime % 60).toString().padStart(2, '0')}</span>
                </div>
            </div>
            
            <div class="result-actions" style="display: flex; gap: 1rem; justify-content: center;">
                <button class="btn-secondary" id="practice-again">
                    <i class="fas fa-redo"></i> Opnieuw Oefenen
                </button>
                <button class="btn-primary" id="new-practice">
                    <i class="fas fa-plus"></i> Nieuwe Oefening
                </button>
            </div>
        </div>
    `;
    
    // Add event listeners to result buttons
    document.getElementById('practice-again').addEventListener('click', () => {
        startPractice();
    });
    
    document.getElementById('new-practice').addEventListener('click', () => {
        document.getElementById('practice-area').innerHTML = `
            <div class="practice-welcome">
                <i class="fas fa-graduation-cap"></i>
                <h3>Klaar om te Leren?</h3>
                <p>Selecteer een woordenlijst en klik op "Start Oefenen" om te beginnen.</p>
            </div>
        `;
        document.getElementById('practice-area').style.display = 'flex';
    });
}

// OCR Functions
let currentStep = 1;

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        showToast('Alleen afbeeldingen zijn toegestaan', 'error');
        return;
    }
    
    showLoading('Afbeelding verwerken...');
    
    const reader = new FileReader();
    reader.onload = function(e) {
        // Display image
        const img = document.getElementById('original-image');
        img.src = e.target.result;
        
        // Simulate OCR processing
        setTimeout(() => {
            // For demo, show sample text
            document.getElementById('ocr-result-text').value = `apple|appel\ndog|hond\nhouse|huis\ncat|kat\nbook|boek\npen|pen\nwater|water\nfood|eten\nfriend|vriend\nfamily|familie`;
            
            hideLoading();
            nextStep();
            
            showToast('Afbeelding verwerkt. Je kunt de tekst nu bewerken.', 'success');
        }, 1500);
    };
    
    reader.readAsDataURL(file);
}

function prevStep() {
    if (currentStep > 1) {
        document.getElementById(`step-${currentStep}`).style.display = 'none';
        currentStep--;
        document.getElementById(`step-${currentStep}`).style.display = 'block';
        
        updateStepButtons();
    }
}

function nextStep() {
    if (currentStep < 2) {
        document.getElementById(`step-${currentStep}`).style.display = 'none';
        currentStep++;
        document.getElementById(`step-${currentStep}`).style.display = 'block';
        
        updateStepButtons();
    }
}

function updateStepButtons() {
    const prevBtn = document.getElementById('prev-step');
    const nextBtn = document.getElementById('next-step');
    
    if (prevBtn) {
        prevBtn.disabled = currentStep === 1;
    }
    
    if (nextBtn) {
        if (currentStep === 2) {
            nextBtn.style.display = 'none';
        } else {
            nextBtn.style.display = 'inline-flex';
        }
    }
}

// Utility Functions
function formatDate(dateString) {
    if (!dateString) return 'Onbekend';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('nl-NL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function showToast(message, type = 'info') {
    // Create toast container if it doesn't exist
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
        `;
        document.body.appendChild(container);
    }
    
    // Create toast
    const toast = document.createElement('div');
    toast.style.cssText = `
        background: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        margin-top: 0.5rem;
        display: flex;
        align-items: center;
        gap: 12px;
        animation: slideIn 0.3s ease;
        border-left: 4px solid #4361ee;
        max-width: 300px;
    `;
    
    if (type === 'success') {
        toast.style.borderLeftColor = '#4cc9f0';
    } else if (type === 'error') {
        toast.style.borderLeftColor = '#f72585';
    } else if (type === 'warning') {
        toast.style.borderLeftColor = '#f2994a';
    }
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'warning') icon = '⚠️';
    
    toast.innerHTML = `
        <span style="font-size: 1.2rem;">${icon}</span>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Remove toast after 5 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 5000);
}

function showLoading(text = 'Laden...') {
    const overlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');
    
    if (overlay && loadingText) {
        loadingText.textContent = text;
        overlay.style.display = 'flex';
    }
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// Add CSS for animations
if (!document.querySelector('#toast-animations')) {
    const style = document.createElement('style');
    style.id = 'toast-animations';
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}