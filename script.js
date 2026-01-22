// Main application script
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the application
    initApp();
});

// Global variables
let currentUser = null;
let currentWordlist = null;
let currentPracticeSession = null;
let currentFlashcardsSession = null;
let userWordlists = [];
let practiceWords = [];
let currentPracticeIndex = 0;
let practiceResults = [];
let flashcards = [];
let currentFlashcardIndex = 0;

// Initialize the application
function initApp() {
    // Setup navigation
    setupNavigation();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup Firebase auth state listener
    setupFirebaseAuthListener();
    
    // Check if user is already logged in
    checkUserAuth();
    
    // Initialize charts
    initCharts();
}

// Navigation setup
function setupNavigation() {
    // Main navigation links
    const navLinks = document.querySelectorAll('.nav-link');
    const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const mobileNav = document.querySelector('.mobile-nav');
    const footerLinks = document.querySelectorAll('.footer-links a');
    
    // Handle main navigation clicks
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.getAttribute('data-section');
            switchSection(sectionId);
            
            // Update active state
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            
            // Update mobile navigation
            mobileNavLinks.forEach(l => {
                if (l.getAttribute('data-section') === sectionId) {
                    l.classList.add('active');
                } else {
                    l.classList.remove('active');
                }
            });
            
            // Close mobile menu if open
            mobileNav.classList.remove('active');
        });
    });
    
    // Handle mobile navigation clicks
    mobileNavLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.getAttribute('data-section');
            switchSection(sectionId);
            
            // Update active state
            mobileNavLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            
            // Update main navigation
            navLinks.forEach(l => {
                if (l.getAttribute('data-section') === sectionId) {
                    l.classList.add('active');
                } else {
                    l.classList.remove('active');
                }
            });
            
            // Close mobile menu
            mobileNav.classList.remove('active');
        });
    });
    
    // Handle footer navigation clicks
    footerLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.getAttribute('data-section');
            switchSection(sectionId);
            
            // Update navigation active state
            navLinks.forEach(l => {
                if (l.getAttribute('data-section') === sectionId) {
                    l.classList.add('active');
                } else {
                    l.classList.remove('active');
                }
            });
            
            mobileNavLinks.forEach(l => {
                if (l.getAttribute('data-section') === sectionId) {
                    l.classList.add('active');
                } else {
                    l.classList.remove('active');
                }
            });
        });
    });
    
    // Handle mobile menu button
    mobileMenuBtn.addEventListener('click', function() {
        mobileNav.classList.toggle('active');
    });
    
    // Handle hero buttons
    const heroButtons = document.querySelectorAll('.hero-buttons .btn');
    heroButtons.forEach(button => {
        button.addEventListener('click', function() {
            const sectionId = this.getAttribute('data-section');
            switchSection(sectionId);
            
            // Update navigation
            navLinks.forEach(l => {
                if (l.getAttribute('data-section') === sectionId) {
                    l.classList.add('active');
                } else {
                    l.classList.remove('active');
                }
            });
        });
    });
}

// Switch between sections
function switchSection(sectionId) {
    // Hide all sections
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        
        // Scroll to top of section
        window.scrollTo({
            top: targetSection.offsetTop - 80,
            behavior: 'smooth'
        });
        
        // Load section-specific data
        loadSectionData(sectionId);
    }
}

// Load data for specific section
function loadSectionData(sectionId) {
    switch(sectionId) {
        case 'practice':
            loadPracticeSection();
            break;
        case 'flashcards':
            loadFlashcardsSection();
            break;
        case 'wordlists':
            loadWordlistsSection();
            break;
        case 'progress':
            loadProgressSection();
            break;
    }
}

// Setup event listeners
function setupEventListeners() {
    // Wordlist upload form
    const uploadForm = document.getElementById('upload-form');
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleWordlistUpload);
    }
    
    const modalUploadForm = document.getElementById('modal-upload-form');
    if (modalUploadForm) {
        modalUploadForm.addEventListener('submit', handleModalWordlistUpload);
    }
    
    // File input change
    const fileInput = document.getElementById('wordlist-file');
    if (fileInput) {
        fileInput.addEventListener('change', function() {
            const fileName = this.files[0] ? this.files[0].name : 'Kies een .txt bestand';
            document.getElementById('file-name').textContent = fileName;
        });
    }
    
    const modalFileInput = document.getElementById('modal-wordlist-file');
    if (modalFileInput) {
        modalFileInput.addEventListener('change', function() {
            const fileName = this.files[0] ? this.files[0].name : 'Kies een .txt bestand';
            document.getElementById('modal-file-name').textContent = fileName;
        });
    }
    
    // Open upload modal
    const openUploadModalBtn = document.getElementById('open-upload-modal');
    if (openUploadModalBtn) {
        openUploadModalBtn.addEventListener('click', function() {
            openUploadModal();
        });
    }
    
    // Close upload modal
    const closeUploadModalBtn = document.getElementById('close-upload-modal');
    if (closeUploadModalBtn) {
        closeUploadModalBtn.addEventListener('click', function() {
            closeUploadModal();
        });
    }
    
    // Wordlist selection
    document.addEventListener('click', function(e) {
        if (e.target.closest('.wordlist-item')) {
            const wordlistItem = e.target.closest('.wordlist-item');
            const wordlistId = wordlistItem.getAttribute('data-id');
            selectWordlist(wordlistId);
        }
        
        if (e.target.closest('.wordlist-card')) {
            const wordlistCard = e.target.closest('.wordlist-card');
            const wordlistId = wordlistCard.getAttribute('data-id');
            showWordlistDetails(wordlistId);
        }
    });
    
    // Practice controls
    const startPracticeBtn = document.getElementById('start-practice');
    if (startPracticeBtn) {
        startPracticeBtn.addEventListener('click', startPractice);
    }
    
    const checkAnswerBtn = document.getElementById('check-answer');
    if (checkAnswerBtn) {
        checkAnswerBtn.addEventListener('click', checkAnswer);
    }
    
    const answerInput = document.getElementById('answer-input');
    if (answerInput) {
        answerInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                checkAnswer();
            }
        });
    }
    
    const nextQuestionBtn = document.getElementById('next-question');
    if (nextQuestionBtn) {
        nextQuestionBtn.addEventListener('click', nextQuestion);
    }
    
    const prevQuestionBtn = document.getElementById('prev-question');
    if (prevQuestionBtn) {
        prevQuestionBtn.addEventListener('click', prevQuestion);
    }
    
    const finishPracticeBtn = document.getElementById('finish-practice');
    if (finishPracticeBtn) {
        finishPracticeBtn.addEventListener('click', finishPractice);
    }
    
    const restartPracticeBtn = document.getElementById('restart-practice');
    if (restartPracticeBtn) {
        restartPracticeBtn.addEventListener('click', restartPractice);
    }
    
    const newPracticeBtn = document.getElementById('new-practice');
    if (newPracticeBtn) {
        newPracticeBtn.addEventListener('click', function() {
            document.querySelector('.practice-completion').classList.add('hidden');
            document.querySelector('.practice-card').classList.add('hidden');
            document.querySelector('.practice-instructions').classList.remove('hidden');
            resetPractice();
        });
    }
    
    const shuffleWordsBtn = document.getElementById('shuffle-words');
    if (shuffleWordsBtn) {
        shuffleWordsBtn.addEventListener('click', shufflePracticeWords);
    }
    
    const showHintBtn = document.getElementById('show-hint');
    if (showHintBtn) {
        showHintBtn.addEventListener('click', showHint);
    }
    
    // Flashcards controls
    const startFlashcardsBtn = document.getElementById('start-flashcards');
    if (startFlashcardsBtn) {
        startFlashcardsBtn.addEventListener('click', startFlashcards);
    }
    
    const prevCardBtn = document.getElementById('prev-card');
    if (prevCardBtn) {
        prevCardBtn.addEventListener('click', prevCard);
    }
    
    const nextCardBtn = document.getElementById('next-card');
    if (nextCardBtn) {
        nextCardBtn.addEventListener('click', nextCard);
    }
    
    // Flashcard click to flip
    document.addEventListener('click', function(e) {
        if (e.target.closest('.flashcard')) {
            const flashcard = e.target.closest('.flashcard');
            if (!flashcard.classList.contains('hidden')) {
                flashcard.classList.toggle('flipped');
            }
        }
        
        // Difficulty buttons
        if (e.target.closest('.difficulty-btn')) {
            const difficultyBtn = e.target.closest('.difficulty-btn');
            const difficulty = difficultyBtn.getAttribute('data-difficulty');
            recordFlashcardDifficulty(difficulty);
        }
    });
    
    // Wordlist detail modal
    const closeDetailModalBtn = document.getElementById('close-detail-modal');
    if (closeDetailModalBtn) {
        closeDetailModalBtn.addEventListener('click', closeWordlistDetailModal);
    }
    
    const practiceFromDetailBtn = document.getElementById('practice-from-detail');
    if (practiceFromDetailBtn) {
        practiceFromDetailBtn.addEventListener('click', function() {
            closeWordlistDetailModal();
            switchSection('practice');
            setTimeout(() => {
                if (currentWordlist) {
                    selectWordlist(currentWordlist.id);
                    startPractice();
                }
            }, 300);
        });
    }
    
    const flashcardsFromDetailBtn = document.getElementById('flashcards-from-detail');
    if (flashcardsFromDetailBtn) {
        flashcardsFromDetailBtn.addEventListener('click', function() {
            closeWordlistDetailModal();
            switchSection('flashcards');
            setTimeout(() => {
                if (currentWordlist) {
                    const select = document.getElementById('flashcard-wordlist');
                    select.value = currentWordlist.id;
                    startFlashcards();
                }
            }, 300);
        });
    }
    
    const deleteWordlistBtn = document.getElementById('delete-wordlist');
    if (deleteWordlistBtn) {
        deleteWordlistBtn.addEventListener('click', deleteCurrentWordlist);
    }
    
    // Refresh wordlists
    const refreshWordlistsBtn = document.getElementById('refresh-wordlists');
    if (refreshWordlistsBtn) {
        refreshWordlistsBtn.addEventListener('click', loadUserWordlists);
    }
    
    // Filter wordlists by category
    const filterCategory = document.getElementById('filter-category');
    if (filterCategory) {
        filterCategory.addEventListener('change', filterWordlistsByCategory);
    }
}

// Setup Firebase auth listener
function setupFirebaseAuthListener() {
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            updateUIForLoggedInUser();
        } else {
            currentUser = null;
            updateUIForLoggedOutUser();
        }
    });
}

// Check user authentication
function checkUserAuth() {
    // Check if Clerk user is available
    if (typeof clerk !== 'undefined' && clerk.user) {
        currentUser = { id: clerk.user.id };
        updateUIForLoggedInUser();
    }
}

// Update UI for logged in user
function updateUIForLoggedInUser() {
    // Show user-specific content
    const authRequiredElements = document.querySelectorAll('.auth-required');
    authRequiredElements.forEach(el => {
        el.classList.remove('hidden');
    });
    
    // Hide sign-in prompts
    const signInPrompts = document.querySelectorAll('.sign-in-prompt');
    signInPrompts.forEach(el => {
        el.classList.add('hidden');
    });
    
    // Load user data
    loadUserWordlists();
    loadUserProgress();
}

// Update UI for logged out user
function updateUIForLoggedOutUser() {
    // Hide user-specific content
    const authRequiredElements = document.querySelectorAll('.auth-required');
    authRequiredElements.forEach(el => {
        el.classList.add('hidden');
    });
    
    // Show sign-in prompts
    const signInPrompts = document.querySelectorAll('.sign-in-prompt');
    signInPrompts.forEach(el => {
        el.classList.remove('hidden');
    });
    
    // Clear user data
    userWordlists = [];
    currentWordlist = null;
    updateWordlistsDisplay();
    updatePracticeUI();
}

// Load user wordlists
async function loadUserWordlists() {
    if (!currentUser) return;
    
    try {
        const userId = await getCurrentUserId();
        if (!userId) return;
        
        const wordlists = await firebaseHelpers.getUserWordlists(userId);
        userWordlists = wordlists;
        updateWordlistsDisplay();
        updateFlashcardsWordlistSelect();
        
        // Show success message if wordlists were loaded
        if (wordlists.length > 0) {
            showToast('Woordenlijsten geladen', `Je hebt ${wordlists.length} woordenlijst(en)`, 'success');
        }
    } catch (error) {
        console.error('Fout bij laden woordenlijsten:', error);
        showToast('Fout', 'Kon woordenlijsten niet laden', 'error');
    }
}

// Update wordlists display
function updateWordlistsDisplay() {
    const wordlistsContainer = document.getElementById('wordlists-container');
    const wordlistsGrid = document.getElementById('wordlists-grid');
    
    if (!wordlistsContainer && !wordlistsGrid) return;
    
    if (userWordlists.length === 0) {
        if (wordlistsContainer) {
            wordlistsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-list-alt"></i>
                    <h4>Nog geen woordenlijsten</h4>
                    <p>Upload je eerste woordenlijst om te beginnen met leren!</p>
                </div>
            `;
        }
        
        if (wordlistsGrid) {
            wordlistsGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-list-alt"></i>
                    <h4>Nog geen woordenlijsten</h4>
                    <p>Upload je eerste woordenlijst om te beginnen met leren!</p>
                </div>
            `;
        }
        return;
    }
    
    // Update practice sidebar
    if (wordlistsContainer) {
        let html = '';
        userWordlists.forEach(wordlist => {
            const isActive = currentWordlist && currentWordlist.id === wordlist.id;
            html += `
                <div class="wordlist-item ${isActive ? 'active' : ''}" data-id="${wordlist.id}">
                    <div class="wordlist-name">${wordlist.name}</div>
                    <div class="wordlist-meta">
                        <span>${wordlist.wordCount} woorden</span>
                        <span>${formatDate(wordlist.createdAt?.toDate())}</span>
                    </div>
                </div>
            `;
        });
        wordlistsContainer.innerHTML = html;
    }
    
    // Update wordlists grid
    if (wordlistsGrid) {
        let html = '';
        userWordlists.forEach(wordlist => {
            html += `
                <div class="wordlist-card" data-id="${wordlist.id}">
                    <div class="wordlist-card-header">
                        <div>
                            <div class="wordlist-card-name">${wordlist.name}</div>
                            <span class="wordlist-card-category">${wordlist.category}</span>
                        </div>
                        <div class="wordlist-card-actions">
                            <button class="btn btn-small" data-action="practice" data-id="${wordlist.id}">
                                <i class="fas fa-play"></i>
                            </button>
                            <button class="btn btn-small" data-action="flashcards" data-id="${wordlist.id}">
                                <i class="fas fa-layer-group"></i>
                            </button>
                        </div>
                    </div>
                    <div class="wordlist-card-meta">
                        <span>Aangemaakt: ${formatDate(wordlist.createdAt?.toDate())}</span>
                        <span>Woorden: ${wordlist.wordCount}</span>
                    </div>
                    <div class="wordlist-card-stats">
                        <div class="wordlist-stat">
                            <span class="wordlist-stat-value">${wordlist.practiceCount || 0}</span>
                            <span class="wordlist-stat-label">Keer geoefend</span>
                        </div>
                        <div class="wordlist-stat">
                            <span class="wordlist-stat-value">${wordlist.lastPracticed ? formatDate(wordlist.lastPracticed.toDate(), true) : 'Nooit'}</span>
                            <span class="wordlist-stat-label">Laatst geoefend</span>
                        </div>
                    </div>
                    <p class="wordlist-description">${wordlist.description || 'Geen beschrijving'}</p>
                </div>
            `;
        });
        wordlistsGrid.innerHTML = html;
    }
}

// Update flashcards wordlist select
function updateFlashcardsWordlistSelect() {
    const select = document.getElementById('flashcard-wordlist');
    if (!select) return;
    
    // Clear existing options except the first one
    while (select.options.length > 1) {
        select.remove(1);
    }
    
    // Add user wordlists
    userWordlists.forEach(wordlist => {
        const option = document.createElement('option');
        option.value = wordlist.id;
        option.textContent = wordlist.name;
        select.appendChild(option);
    });
}

// Load practice section
function loadPracticeSection() {
    if (!currentUser) {
        showAuthPrompt();
        return;
    }
    
    // Load wordlists if not already loaded
    if (userWordlists.length === 0) {
        loadUserWordlists();
    }
    
    // Reset practice state
    resetPractice();
}

// Select wordlist for practice
function selectWordlist(wordlistId) {
    const wordlist = userWordlists.find(w => w.id === wordlistId);
    if (!wordlist) return;
    
    currentWordlist = wordlist;
    
    // Update UI
    document.getElementById('current-wordlist-name').textContent = wordlist.name;
    
    // Update active state in wordlist items
    const wordlistItems = document.querySelectorAll('.wordlist-item');
    wordlistItems.forEach(item => {
        if (item.getAttribute('data-id') === wordlistId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    // Enable start practice button
    document.getElementById('start-practice').disabled = false;
    
    // Reset practice progress
    updatePracticeProgress(0, wordlist.words.length);
}

// Start practice session
function startPractice() {
    if (!currentWordlist) return;
    
    // Initialize practice session
    practiceWords = [...currentWordlist.words];
    currentPracticeIndex = 0;
    practiceResults = [];
    
    // Shuffle if needed
    const shuffleBtn = document.getElementById('shuffle-words');
    if (shuffleBtn.classList.contains('active')) {
        shufflePracticeWords();
    }
    
    // Show practice card
    document.querySelector('.practice-instructions').classList.add('hidden');
    document.querySelector('.practice-card').classList.remove('hidden');
    document.querySelector('.practice-completion').classList.add('hidden');
    
    // Show first question
    showQuestion(currentPracticeIndex);
    
    // Update UI
    document.getElementById('start-practice').disabled = true;
    document.getElementById('start-practice').innerHTML = '<i class="fas fa-sync-alt"></i> Bezig...';
    
    // Clear answer input and feedback
    document.getElementById('answer-input').value = '';
    document.getElementById('practice-feedback').classList.add('hidden');
    document.getElementById('hint-text').textContent = '';
}

// Show question at index
function showQuestion(index) {
    if (index < 0 || index >= practiceWords.length) return;
    
    const word = practiceWords[index];
    document.getElementById('practice-question-text').textContent = word.question;
    document.getElementById('question-number').textContent = `${index + 1}/${practiceWords.length}`;
    
    // Clear answer input and feedback
    document.getElementById('answer-input').value = '';
    document.getElementById('practice-feedback').classList.add('hidden');
    document.getElementById('hint-text').textContent = '';
    
    // Focus on answer input
    document.getElementById('answer-input').focus();
    
    // Update navigation buttons
    document.getElementById('prev-question').disabled = index === 0;
    document.getElementById('next-question').disabled = index === practiceWords.length - 1;
    
    // Update progress bar
    updatePracticeProgress(index + 1, practiceWords.length);
}

// Check answer
function checkAnswer() {
    const answerInput = document.getElementById('answer-input');
    const userAnswer = answerInput.value.trim().toLowerCase();
    
    if (!userAnswer) {
        showToast('Fout', 'Voer een antwoord in', 'warning');
        return;
    }
    
    const currentWord = practiceWords[currentPracticeIndex];
    const correctAnswer = currentWord.answer.toLowerCase();
    const isCorrect = userAnswer === correctAnswer;
    
    // Store result
    practiceResults[currentPracticeIndex] = {
        question: currentWord.question,
        answer: currentWord.answer,
        userAnswer: userAnswer,
        correct: isCorrect,
        timestamp: new Date()
    };
    
    // Show feedback
    const feedbackEl = document.getElementById('practice-feedback');
    feedbackEl.classList.remove('hidden');
    
    if (isCorrect) {
        document.querySelector('.feedback-correct').classList.remove('hidden');
        document.querySelector('.feedback-incorrect').classList.add('hidden');
        document.getElementById('correct-answer-text').textContent = currentWord.answer;
    } else {
        document.querySelector('.feedback-correct').classList.add('hidden');
        document.querySelector('.feedback-incorrect').classList.remove('hidden');
        document.getElementById('incorrect-answer-text').textContent = currentWord.answer;
    }
    
    // Update stats
    updatePracticeStats();
}

// Next question
function nextQuestion() {
    if (currentPracticeIndex < practiceWords.length - 1) {
        currentPracticeIndex++;
        showQuestion(currentPracticeIndex);
    } else {
        finishPractice();
    }
}

// Previous question
function prevQuestion() {
    if (currentPracticeIndex > 0) {
        currentPracticeIndex--;
        showQuestion(currentPracticeIndex);
    }
}

// Finish practice
function finishPractice() {
    // Calculate results
    const total = practiceWords.length;
    const correct = practiceResults.filter(r => r && r.correct).length;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    
    // Show completion screen
    document.querySelector('.practice-card').classList.add('hidden');
    document.querySelector('.practice-completion').classList.remove('hidden');
    
    // Update completion stats
    document.getElementById('completion-total').textContent = total;
    document.getElementById('completion-correct').textContent = correct;
    document.getElementById('completion-accuracy').textContent = `${accuracy}%`;
    
    // Reset start practice button
    document.getElementById('start-practice').disabled = false;
    document.getElementById('start-practice').innerHTML = '<i class="fas fa-play"></i> Start Oefenen';
    
    // Save session to Firebase
    savePracticeSession(total, correct, accuracy);
}

// Save practice session
async function savePracticeSession(total, correct, accuracy) {
    if (!currentUser || !currentWordlist) return;
    
    try {
        const userId = await getCurrentUserId();
        if (!userId) return;
        
        const sessionData = {
            wordlistId: currentWordlist.id,
            wordlistName: currentWordlist.name,
            totalWords: total,
            correctAnswers: correct,
            accuracy: accuracy,
            wordResults: practiceResults.filter(r => r)
        };
        
        await firebaseHelpers.savePracticeSession(userId, sessionData);
        
        // Update user progress
        loadUserProgress();
        
        // Show success message
        showToast('Sessie opgeslagen', `Je nauwkeurigheid was ${accuracy}%`, 'success');
    } catch (error) {
        console.error('Fout bij opslaan oefensessie:', error);
        showToast('Fout', 'Kon sessie niet opslaan', 'error');
    }
}

// Restart practice
function restartPractice() {
    currentPracticeIndex = 0;
    practiceResults = [];
    showQuestion(currentPracticeIndex);
    
    document.querySelector('.practice-completion').classList.add('hidden');
    document.querySelector('.practice-card').classList.remove('hidden');
}

// Reset practice
function resetPractice() {
    currentPracticeIndex = 0;
    practiceWords = [];
    practiceResults = [];
    
    document.querySelector('.practice-instructions').classList.remove('hidden');
    document.querySelector('.practice-card').classList.add('hidden');
    document.querySelector('.practice-completion').classList.add('hidden');
    
    document.getElementById('start-practice').disabled = !currentWordlist;
    document.getElementById('start-practice').innerHTML = '<i class="fas fa-play"></i> Start Oefenen';
    
    updatePracticeProgress(0, 0);
}

// Shuffle practice words
function shufflePracticeWords() {
    if (practiceWords.length === 0) return;
    
    // Fisher-Yates shuffle algorithm
    for (let i = practiceWords.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [practiceWords[i], practiceWords[j]] = [practiceWords[j], practiceWords[i]];
    }
    
    // Update current index if we're in the middle of practice
    if (currentPracticeIndex > 0) {
        // Find the current word in the shuffled array
        const currentWord = practiceWords.find(w => 
            w.question === practiceResults[currentPracticeIndex]?.question
        );
        if (currentWord) {
            currentPracticeIndex = practiceWords.indexOf(currentWord);
        } else {
            currentPracticeIndex = 0;
        }
        showQuestion(currentPracticeIndex);
    }
    
    // Update shuffle button state
    const shuffleBtn = document.getElementById('shuffle-words');
    shuffleBtn.classList.toggle('active');
    
    if (shuffleBtn.classList.contains('active')) {
        shuffleBtn.innerHTML = '<i class="fas fa-random"></i> Shuffle (aan)';
        showToast('Shuffle', 'Woorden worden willekeurig getoond', 'success');
    } else {
        shuffleBtn.innerHTML = '<i class="fas fa-random"></i> Shuffle';
        showToast('Shuffle', 'Woorden worden in volgorde getoond', 'info');
    }
}

// Show hint
function showHint() {
    if (currentPracticeIndex >= practiceWords.length) return;
    
    const currentWord = practiceWords[currentPracticeIndex];
    const answer = currentWord.answer;
    
    // Show first letter as hint
    if (answer.length > 0) {
        const hint = answer.charAt(0) + '...';
        document.getElementById('hint-text').textContent = `Hint: ${hint}`;
    }
}

// Update practice progress
function updatePracticeProgress(current, total) {
    const progressBar = document.getElementById('practice-progress-bar');
    const progressText = document.getElementById('practice-progress-text');
    
    if (total > 0) {
        const percentage = (current / total) * 100;
        progressBar.style.width = `${percentage}%`;
        progressText.textContent = `${current}/${total} woorden`;
    } else {
        progressBar.style.width = '0%';
        progressText.textContent = '0/0 woorden';
    }
}

// Update practice stats
function updatePracticeStats() {
    const total = practiceResults.filter(r => r).length;
    const correct = practiceResults.filter(r => r && r.correct).length;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    
    document.getElementById('total-practiced').textContent = total;
    document.getElementById('correct-answers').textContent = correct;
    document.getElementById('accuracy-rate').textContent = `${accuracy}%`;
}

// Load flashcards section
function loadFlashcardsSection() {
    if (!currentUser) {
        showAuthPrompt();
        return;
    }
    
    // Load wordlists if not already loaded
    if (userWordlists.length === 0) {
        loadUserWordlists();
    }
    
    // Reset flashcards state
    resetFlashcards();
}

// Start flashcards
function startFlashcards() {
    const wordlistId = document.getElementById('flashcard-wordlist').value;
    if (!wordlistId) {
        showToast('Fout', 'Selecteer een woordenlijst', 'warning');
        return;
    }
    
    const wordlist = userWordlists.find(w => w.id === wordlistId);
    if (!wordlist) return;
    
    currentWordlist = wordlist;
    flashcards = [...wordlist.words];
    currentFlashcardIndex = 0;
    
    // Apply ordering
    const order = document.getElementById('card-order').value;
    if (order === 'random') {
        shuffleFlashcards();
    } else if (order === 'difficult-first') {
        // In a real app, you would sort by difficulty based on previous sessions
        shuffleFlashcards();
    }
    
    // Show flashcards
    document.querySelector('.flashcards-instructions').classList.add('hidden');
    document.querySelector('.flashcard').classList.remove('hidden');
    
    // Show first card
    showFlashcard(currentFlashcardIndex);
    
    // Start auto-flip timer if enabled
    const autoFlip = document.getElementById('auto-flip').value;
    if (autoFlip !== '0') {
        startAutoFlipTimer(parseInt(autoFlip));
    }
}

// Show flashcard at index
function showFlashcard(index) {
    if (index < 0 || index >= flashcards.length) return;
    
    const card = flashcards[index];
    document.getElementById('card-question').textContent = card.question;
    document.getElementById('card-answer').textContent = card.answer;
    document.getElementById('card-count').textContent = `${index + 1}/${flashcards.length}`;
    document.getElementById('card-count-back').textContent = `${index + 1}/${flashcards.length}`;
    
    // Reset card to front
    document.querySelector('.flashcard').classList.remove('flipped');
    
    // Update navigation buttons
    document.getElementById('prev-card').disabled = index === 0;
    document.getElementById('next-card').disabled = index === flashcards.length - 1;
    
    // Update progress
    updateFlashcardsProgress(index + 1, flashcards.length);
}

// Next card
function nextCard() {
    if (currentFlashcardIndex < flashcards.length - 1) {
        currentFlashcardIndex++;
        showFlashcard(currentFlashcardIndex);
    } else {
        // End of flashcards
        showToast('Flashcards voltooid', 'Je hebt alle kaarten bekeken', 'success');
    }
}

// Previous card
function prevCard() {
    if (currentFlashcardIndex > 0) {
        currentFlashcardIndex--;
        showFlashcard(currentFlashcardIndex);
    }
}

// Shuffle flashcards
function shuffleFlashcards() {
    if (flashcards.length === 0) return;
    
    for (let i = flashcards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [flashcards[i], flashcards[j]] = [flashcards[j], flashcards[i]];
    }
    
    // Reset to first card
    currentFlashcardIndex = 0;
    showFlashcard(currentFlashcardIndex);
}

// Start auto-flip timer
let autoFlipTimer = null;
function startAutoFlipTimer(seconds) {
    if (autoFlipTimer) {
        clearInterval(autoFlipTimer);
    }
    
    autoFlipTimer = setInterval(() => {
        const flashcard = document.querySelector('.flashcard');
        if (flashcard && !flashcard.classList.contains('hidden')) {
            flashcard.classList.add('flipped');
        }
    }, seconds * 1000);
}

// Record flashcard difficulty
async function recordFlashcardDifficulty(difficulty) {
    if (!currentUser || !currentWordlist || currentFlashcardIndex >= flashcards.length) return;
    
    try {
        const userId = await getCurrentUserId();
        if (!userId) return;
        
        const currentCard = flashcards[currentFlashcardIndex];
        await firebaseHelpers.updateWordDifficulty(
            userId,
            currentWordlist.id,
            currentCard.question,
            currentCard.answer,
            difficulty
        );
        
        // Show feedback based on difficulty
        let message = '';
        switch(difficulty) {
            case 'easy':
                message = 'Makkelijk gemarkeerd';
                break;
            case 'medium':
                message = 'Gemiddeld gemarkeerd';
                break;
            case 'hard':
                message = 'Moeilijk gemarkeerd';
                break;
        }
        showToast('Moeilijkheid', message, 'success');
    } catch (error) {
        console.error('Fout bij opslaan moeilijkheidsgraad:', error);
    }
}

// Reset flashcards
function resetFlashcards() {
    flashcards = [];
    currentFlashcardIndex = 0;
    
    document.querySelector('.flashcards-instructions').classList.remove('hidden');
    document.querySelector('.flashcard').classList.add('hidden');
    
    document.getElementById('start-flashcards').disabled = userWordlists.length === 0;
    
    updateFlashcardsProgress(0, 0);
}

// Update flashcards progress
function updateFlashcardsProgress(current, total) {
    const progressBar = document.getElementById('cards-progress-bar');
    const progressText = document.getElementById('cards-progress-text');
    
    if (total > 0) {
        const percentage = (current / total) * 100;
        progressBar.style.width = `${percentage}%`;
        progressText.textContent = `${current}/${total} kaarten`;
    } else {
        progressBar.style.width = '0%';
        progressText.textContent = '0/0 kaarten';
    }
}

// Load wordlists section
function loadWordlistsSection() {
    if (!currentUser) {
        showAuthPrompt();
        return;
    }
    
    // Load wordlists if not already loaded
    if (userWordlists.length === 0) {
        loadUserWordlists();
    }
}

// Handle wordlist upload
async function handleWordlistUpload(e) {
    e.preventDefault();
    
    if (!currentUser) {
        showToast('Niet ingelogd', 'Log in om woordenlijsten te uploaden', 'warning');
        return;
    }
    
    const name = document.getElementById('wordlist-name').value.trim();
    const description = document.getElementById('wordlist-description').value.trim();
    const category = document.getElementById('wordlist-category').value;
    const isPublic = document.getElementById('is-public').checked;
    const fileInput = document.getElementById('wordlist-file');
    
    if (!name) {
        showToast('Fout', 'Voer een naam in voor de woordenlijst', 'warning');
        return;
    }
    
    if (!fileInput.files || fileInput.files.length === 0) {
        showToast('Fout', 'Selecteer een bestand', 'warning');
        return;
    }
    
    const file = fileInput.files[0];
    if (!file.name.toLowerCase().endsWith('.txt')) {
        showToast('Fout', 'Alleen .txt bestanden zijn toegestaan', 'warning');
        return;
    }
    
    try {
        // Read file
        const text = await readFileAsText(file);
        
        // Parse words
        const words = parseWordlistText(text);
        if (words.length === 0) {
            showToast('Fout', 'Geen geldige woorden gevonden in het bestand', 'warning');
            return;
        }
        
        // Get user ID
        const userId = await getCurrentUserId();
        if (!userId) {
            showToast('Fout', 'Kon gebruiker niet identificeren', 'error');
            return;
        }
        
        // Prepare wordlist data
        const wordlistData = {
            name,
            description,
            category,
            isPublic,
            words,
            userId
        };
        
        // Show loading state
        const uploadBtn = document.getElementById('upload-button');
        const originalText = uploadBtn.innerHTML;
        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploaden...';
        uploadBtn.disabled = true;
        
        // Upload to Firebase
        const wordlistId = await firebaseHelpers.uploadWordlist(userId, wordlistData);
        
        // Reset form
        e.target.reset();
        document.getElementById('file-name').textContent = 'Kies een .txt bestand';
        
        // Restore button
        uploadBtn.innerHTML = originalText;
        uploadBtn.disabled = false;
        
        // Show success message
        showToast('Succes', `Woordenlijst "${name}" geüpload met ${words.length} woorden`, 'success');
        
        // Refresh wordlists
        loadUserWordlists();
        
    } catch (error) {
        console.error('Fout bij uploaden woordenlijst:', error);
        showToast('Fout', 'Kon woordenlijst niet uploaden', 'error');
        
        // Restore button
        const uploadBtn = document.getElementById('upload-button');
        uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Upload Woordenlijst';
        uploadBtn.disabled = false;
    }
}

// Handle modal wordlist upload
async function handleModalWordlistUpload(e) {
    e.preventDefault();
    
    // Similar to handleWordlistUpload but for modal
    await handleWordlistUpload(e);
    
    // Close modal after successful upload
    closeUploadModal();
}

// Read file as text
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
    });
}

// Parse wordlist text
function parseWordlistText(text) {
    const lines = text.split('\n');
    const words = [];
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;
        
        // Check for question|answer format
        const parts = trimmedLine.split('|');
        if (parts.length >= 2) {
            const question = parts[0].trim();
            const answer = parts[1].trim();
            
            if (question && answer) {
                words.push({ question, answer });
            }
        }
    }
    
    return words;
}

// Open upload modal
function openUploadModal() {
    document.getElementById('upload-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close upload modal
function closeUploadModal() {
    document.getElementById('upload-modal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Show wordlist details
async function showWordlistDetails(wordlistId) {
    const wordlist = userWordlists.find(w => w.id === wordlistId);
    if (!wordlist) return;
    
    currentWordlist = wordlist;
    
    // Update modal content
    document.getElementById('detail-wordlist-name').textContent = wordlist.name;
    document.getElementById('detail-word-count').textContent = wordlist.wordCount;
    document.getElementById('detail-category').textContent = wordlist.category;
    document.getElementById('detail-created-date').textContent = formatDate(wordlist.createdAt?.toDate());
    document.getElementById('detail-last-practiced').textContent = wordlist.lastPracticed ? 
        formatDate(wordlist.lastPracticed.toDate(), true) : 'Nooit';
    
    // Populate words table
    const wordsTableBody = document.getElementById('words-table-body');
    let wordsHtml = '';
    
    wordlist.words.forEach((word, index) => {
        wordsHtml += `
            <tr>
                <td>${word.question}</td>
                <td>${word.answer}</td>
                <td>
                    <div class="mastery-indicator">
                        <div class="mastery-bar">
                            <div class="mastery-fill" style="width: 0%"></div>
                        </div>
                        <span class="mastery-text">Nog niet geoefend</span>
                    </div>
                </td>
            </tr>
        `;
    });
    
    wordsTableBody.innerHTML = wordsHtml;
    
    // Show modal
    document.getElementById('wordlist-detail-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close wordlist detail modal
function closeWordlistDetailModal() {
    document.getElementById('wordlist-detail-modal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Delete current wordlist
async function deleteCurrentWordlist() {
    if (!currentWordlist) return;
    
    if (!confirm(`Weet je zeker dat je de woordenlijst "${currentWordlist.name}" wilt verwijderen?`)) {
        return;
    }
    
    try {
        await firebaseHelpers.deleteWordlist(currentWordlist.id);
        
        // Remove from local list
        const index = userWordlists.findIndex(w => w.id === currentWordlist.id);
        if (index !== -1) {
            userWordlists.splice(index, 1);
        }
        
        // Update UI
        updateWordlistsDisplay();
        updateFlashcardsWordlistSelect();
        
        // Close modal
        closeWordlistDetailModal();
        
        // Show success message
        showToast('Verwijderd', 'Woordenlijst succesvol verwijderd', 'success');
        
        // Reset current wordlist if it was deleted
        if (currentWordlist && currentWordlist.id === currentWordlist.id) {
            currentWordlist = null;
            updatePracticeUI();
        }
    } catch (error) {
        console.error('Fout bij verwijderen woordenlijst:', error);
        showToast('Fout', 'Kon woordenlijst niet verwijderen', 'error');
    }
}

// Filter wordlists by category
function filterWordlistsByCategory() {
    const category = document.getElementById('filter-category').value;
    const wordlistCards = document.querySelectorAll('.wordlist-card');
    
    wordlistCards.forEach(card => {
        const cardCategory = card.querySelector('.wordlist-card-category').textContent.toLowerCase();
        
        if (category === 'all' || cardCategory === category) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Load progress section
async function loadProgressSection() {
    if (!currentUser) {
        showAuthPrompt();
        return;
    }
    
    await loadUserProgress();
}

// Load user progress
async function loadUserProgress() {
    if (!currentUser) return;
    
    try {
        const userId = await getCurrentUserId();
        if (!userId) return;
        
        const progress = await firebaseHelpers.getUserProgress(userId);
        
        // Update summary cards
        document.getElementById('total-words').textContent = progress.totalWordsPracticed;
        document.getElementById('total-sessions').textContent = progress.totalSessions;
        document.getElementById('overall-accuracy').textContent = `${progress.overallAccuracy}%`;
        
        // Calculate current streak (simplified)
        const currentStreak = calculateCurrentStreak(progress.recentSessions);
        document.getElementById('current-streak').textContent = currentStreak;
        
        // Update recent sessions table
        updateRecentSessionsTable(progress.recentSessions);
        
        // Update difficult words list
        updateDifficultWordsList(progress.difficultWords);
        
        // Update charts
        updateProgressCharts(progress);
        
    } catch (error) {
        console.error('Fout bij laden voortgang:', error);
    }
}

// Calculate current streak
function calculateCurrentStreak(sessions) {
    if (sessions.length === 0) return 0;
    
    // Sort by date descending
    const sortedSessions = [...sessions].sort((a, b) => {
        return new Date(b.date.toDate()) - new Date(a.date.toDate());
    });
    
    // Check if last session was today or yesterday
    const lastSessionDate = sortedSessions[0].date.toDate();
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Check if dates are the same day
    const isSameDay = (d1, d2) => {
        return d1.getDate() === d2.getDate() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getFullYear() === d2.getFullYear();
    };
    
    if (isSameDay(lastSessionDate, today) || isSameDay(lastSessionDate, yesterday)) {
        // Simple streak calculation - in a real app, you'd track consecutive days
        return Math.min(sortedSessions.length, 7); // Max 7 for demo
    }
    
    return 0;
}

// Update recent sessions table
function updateRecentSessionsTable(sessions) {
    const tableBody = document.getElementById('sessions-table-body');
    
    if (sessions.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-table">Nog geen oefensessies</td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    sessions.forEach(session => {
        const date = session.date.toDate();
        html += `
            <tr>
                <td>${formatDate(date, true)}</td>
                <td>${session.wordlistName}</td>
                <td>${session.totalWords}</td>
                <td>${session.correctAnswers}</td>
                <td>${session.accuracy}%</td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
}

// Update difficult words list
function updateDifficultWordsList(difficultWords) {
    const container = document.getElementById('difficult-words-list');
    
    if (difficultWords.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-question-circle"></i>
                <p>Nog geen moeilijke woorden gevonden. Begin met oefenen!</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    difficultWords.forEach(word => {
        html += `
            <div class="difficult-word-item">
                <div class="difficult-word-text">
                    <strong>${word.question}</strong><br>
                    <small>${word.answer}</small>
                </div>
                <div class="difficult-word-accuracy">${word.accuracy}%</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Initialize charts
function initCharts() {
    // Accuracy chart
    const accuracyCtx = document.getElementById('accuracy-chart');
    if (accuracyCtx) {
        window.accuracyChart = new Chart(accuracyCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'],
                datasets: [{
                    label: 'Nauwkeurigheid (%)',
                    data: [65, 70, 75, 80, 85, 82, 88],
                    borderColor: '#4361ee',
                    backgroundColor: 'rgba(67, 97, 238, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }
    
    // Words learned chart
    const wordsCtx = document.getElementById('words-chart');
    if (wordsCtx) {
        window.wordsChart = new Chart(wordsCtx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'],
                datasets: [{
                    label: 'Woorden geleerd',
                    data: [12, 15, 10, 20, 18, 14, 22],
                    backgroundColor: '#7209b7',
                    borderColor: '#5a08a1',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
}

// Update progress charts with real data
function updateProgressCharts(progress) {
    // In a real app, you would update charts with actual data from progress
    // For now, we'll keep the demo data
}

// Show authentication prompt
function showAuthPrompt() {
    showToast('Niet ingelogd', 'Log in om deze functie te gebruiken', 'warning');
    
    // Switch to home section
    switchSection('home');
    
    // Update navigation
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(l => {
        if (l.getAttribute('data-section') === 'home') {
            l.classList.add('active');
        } else {
            l.classList.remove('active');
        }
    });
}

// Update practice UI
function updatePracticeUI() {
    if (currentWordlist) {
        document.getElementById('current-wordlist-name').textContent = currentWordlist.name;
        document.getElementById('start-practice').disabled = false;
        updatePracticeProgress(0, currentWordlist.words.length);
    } else {
        document.getElementById('current-wordlist-name').textContent = 'Selecteer een woordenlijst';
        document.getElementById('start-practice').disabled = true;
        updatePracticeProgress(0, 0);
    }
}

// Get current user ID
async function getCurrentUserId() {
    if (typeof clerk !== 'undefined' && clerk.user) {
        return clerk.user.id;
    }
    
    if (currentUser && currentUser.id) {
        return currentUser.id;
    }
    
    return null;
}

// Format date
function formatDate(date, includeTime = false) {
    if (!date) return '-';
    
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    };
    
    if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
    }
    
    return date.toLocaleDateString('nl-NL', options);
}

// Show toast notification
function showToast(title, message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'info-circle';
    switch(type) {
        case 'success': icon = 'check-circle'; break;
        case 'error': icon = 'exclamation-circle'; break;
        case 'warning': icon = 'exclamation-triangle'; break;
    }
    
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas fa-${icon}"></i>
        </div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close">&times;</button>
    `;
    
    toastContainer.appendChild(toast);
    
    // Add close event
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
        toast.remove();
    });
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 5000);
    
    // Show with animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
}

// Initialize Charts library
if (typeof Chart === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    document.head.appendChild(script);
}
