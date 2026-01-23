import { 
    db, 
    collection, 
    doc, 
    setDoc, 
    getDoc, 
    getDocs,
    query,
    where,
    serverTimestamp 
} from './firebase-config.js';
import { clerk, showToast } from './auth.js';

class PracticeManager {
    constructor() {
        this.currentUser = null;
        this.currentWordlist = null;
        this.practiceWords = [];
        this.currentIndex = 0;
        this.score = 0;
        this.startTime = null;
        this.timerInterval = null;
        this.elapsedTime = 0;
        this.practiceMode = 'typing';
        this.flashcardFlipped = false;
        
        this.initialize();
    }
    
    initialize() {
        this.bindEvents();
        this.checkAuthState();
    }
    
    bindEvents() {
        // Practice mode selection
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.currentTarget.getAttribute('data-mode');
                this.switchPracticeMode(mode);
            });
        });
        
        // Wordlist selection
        document.getElementById('select-wordlist')?.addEventListener('change', () => {
            this.handleWordlistSelect();
        });
        
        // Start practice
        document.getElementById('start-practice-btn')?.addEventListener('click', () => {
            this.startPractice();
        });
        
        // Typing practice controls
        document.getElementById('check-answer')?.addEventListener('click', () => {
            this.checkTypingAnswer();
        });
        
        document.getElementById('typing-answer')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.checkTypingAnswer();
            }
        });
        
        document.getElementById('skip-word')?.addEventListener('click', () => {
            this.skipWord();
        });
        
        document.getElementById('next-word')?.addEventListener('click', () => {
            this.nextWord();
        });
        
        // Flashcards controls
        document.getElementById('flip-card')?.addEventListener('click', () => {
            this.flipFlashcard();
        });
        
        document.getElementById('flashcard')?.addEventListener('click', () => {
            this.flipFlashcard();
        });
        
        document.getElementById('shuffle-cards')?.addEventListener('click', () => {
            this.shuffleCards();
        });
        
        document.getElementById('prev-card')?.addEventListener('click', () => {
            this.prevCard();
        });
        
        document.getElementById('next-card')?.addEventListener('click', () => {
            this.nextCard();
        });
        
        document.querySelectorAll('.rating-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const rating = parseInt(e.currentTarget.getAttribute('data-rating'));
                this.rateWord(rating);
            });
        });
    }
    
    checkAuthState() {
        if (clerk?.user) {
            this.currentUser = clerk.user;
        }
    }
    
    async loadWordlistsForPractice() {
        if (!this.currentUser) return;
        
        try {
            const wordlistsRef = collection(db, 'users', this.currentUser.id, 'wordlists');
            const querySnapshot = await getDocs(wordlistsRef);
            
            const select = document.getElementById('select-wordlist');
            if (!select) return;
            
            // Clear existing options except first
            while (select.options.length > 1) {
                select.remove(1);
            }
            
            querySnapshot.forEach((doc) => {
                const wordlist = doc.data();
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = `${wordlist.name} (${wordlist.words?.length || 0} woorden)`;
                select.appendChild(option);
            });
            
            // Update stats
            this.updatePracticeStats();
        } catch (error) {
            console.error('Error loading wordlists:', error);
        }
    }
    
    async handleWordlistSelect() {
        const select = document.getElementById('select-wordlist');
        const wordlistId = select.value;
        
        if (!wordlistId) {
            this.currentWordlist = null;
            this.updatePracticeStats();
            return;
        }
        
        try {
            const wordlistRef = doc(db, 'users', this.currentUser.id, 'wordlists', wordlistId);
            const wordlistSnap = await getDoc(wordlistRef);
            
            if (wordlistSnap.exists()) {
                this.currentWordlist = {
                    id: wordlistSnap.id,
                    ...wordlistSnap.data()
                };
                
                this.updatePracticeStats();
            }
        } catch (error) {
            console.error('Error loading wordlist:', error);
            showToast('Kan woordenlijst niet laden', 'error');
        }
    }
    
    updatePracticeStats() {
        if (!this.currentWordlist) {
            document.getElementById('total-words').textContent = '0';
            document.getElementById('learned-words').textContent = '0';
            document.getElementById('remaining-words').textContent = '0';
            return;
        }
        
        const totalWords = this.currentWordlist.words?.length || 0;
        const limit = Math.min(parseInt(document.getElementById('practice-limit').value) || 10, totalWords);
        
        document.getElementById('total-words').textContent = totalWords;
        document.getElementById('learned-words').textContent = '0'; // Would come from user stats
        document.getElementById('remaining-words').textContent = limit;
    }
    
    switchPracticeMode(mode) {
        this.practiceMode = mode;
        
        // Update UI
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-mode') === mode) {
                btn.classList.add('active');
            }
        });
        
        // Hide all practice interfaces
        document.getElementById('typing-practice')?.classList.add('hidden');
        document.getElementById('flashcards-practice')?.classList.add('hidden');
        
        // Show current practice interface if practice is active
        if (this.practiceWords.length > 0) {
            this.showCurrentPracticeInterface();
        }
    }
    
    async startPractice() {
        if (!this.currentWordlist) {
            showToast('Selecteer eerst een woordenlijst', 'warning');
            return;
        }
        
        const limit = parseInt(document.getElementById('practice-limit').value) || 10;
        const direction = document.getElementById('practice-direction').value;
        
        // Prepare words for practice
        this.practiceWords = this.preparePracticeWords(limit, direction);
        
        if (this.practiceWords.length === 0) {
            showToast('Geen woorden beschikbaar om te oefenen', 'warning');
            return;
        }
        
        // Reset practice state
        this.currentIndex = 0;
        this.score = 0;
        this.elapsedTime = 0;
        this.startTime = new Date();
        
        // Start timer
        this.startTimer();
        
        // Hide setup, show practice
        this.showCurrentPracticeInterface();
        
        // Load first word
        this.loadCurrentWord();
        
        // Update UI
        document.getElementById('practice-area').classList.add('hidden');
    }
    
    preparePracticeWords(limit, direction) {
        let words = [...(this.currentWordlist.words || [])];
        
        // Shuffle words
        words = this.shuffleArray(words);
        
        // Limit number of words
        words = words.slice(0, limit);
        
        // Apply direction
        return words.map(word => {
            if (direction === 'reverse') {
                return {
                    question: word.answer,
                    answer: word.question,
                    original: word
                };
            } else if (direction === 'mixed') {
                const isReversed = Math.random() > 0.5;
                return {
                    question: isReversed ? word.answer : word.question,
                    answer: isReversed ? word.question : word.answer,
                    original: word
                };
            } else {
                return {
                    question: word.question,
                    answer: word.answer,
                    original: word
                };
            }
        });
    }
    
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    
    showCurrentPracticeInterface() {
        // Hide all interfaces
        document.getElementById('typing-practice')?.classList.add('hidden');
        document.getElementById('flashcards-practice')?.classList.add('hidden');
        
        // Show current interface
        if (this.practiceMode === 'typing') {
            document.getElementById('typing-practice')?.classList.remove('hidden');
        } else if (this.practiceMode === 'flashcards') {
            document.getElementById('flashcards-practice')?.classList.remove('hidden');
            this.flashcardFlipped = false;
            document.getElementById('flashcard').classList.remove('flipped');
        }
    }
    
    loadCurrentWord() {
        if (this.currentIndex >= this.practiceWords.length) {
            this.finishPractice();
            return;
        }
        
        const currentWord = this.practiceWords[this.currentIndex];
        
        if (this.practiceMode === 'typing') {
            this.loadTypingWord(currentWord);
        } else if (this.practiceMode === 'flashcards') {
            this.loadFlashcard(currentWord);
        }
        
        // Update progress
        this.updateProgress();
    }
    
    loadTypingWord(word) {
        document.getElementById('typing-question').textContent = word.question;
        document.getElementById('typing-answer').value = '';
        document.getElementById('typing-answer').focus();
        document.getElementById('typing-feedback').textContent = '';
        document.getElementById('typing-feedback').className = 'feedback';
        document.getElementById('next-word').disabled = true;
    }
    
    loadFlashcard(word) {
        document.getElementById('flashcard-front').innerHTML = `
            <h3>Vraag</h3>
            <p>${word.question}</p>
        `;
        
        document.getElementById('flashcard-back').innerHTML = `
            <h3>Antwoord</h3>
            <p>${word.answer}</p>
        `;
        
        // Reset card to front
        this.flashcardFlipped = false;
        document.getElementById('flashcard').classList.remove('flipped');
        
        // Update progress text
        document.getElementById('flashcard-progress').textContent = 
            `Kaart ${this.currentIndex + 1} van ${this.practiceWords.length}`;
    }
    
    checkTypingAnswer() {
        const currentWord = this.practiceWords[this.currentIndex];
        const userAnswer = document.getElementById('typing-answer').value.trim().toLowerCase();
        const correctAnswer = currentWord.answer.toLowerCase();
        
        const feedback = document.getElementById('typing-feedback');
        const nextBtn = document.getElementById('next-word');
        
        if (userAnswer === correctAnswer) {
            // Correct answer
            this.score++;
            feedback.textContent = 'Correct! ✓';
            feedback.className = 'feedback correct';
            feedback.innerHTML += `<br><small>Je hebt ${this.score} van ${this.currentIndex + 1} correct.</small>`;
        } else {
            // Incorrect answer
            feedback.textContent = `Helaas! Het juiste antwoord is: ${currentWord.answer}`;
            feedback.className = 'feedback incorrect';
        }
        
        // Enable next button
        nextBtn.disabled = false;
        
        // Update score display
        document.getElementById('typing-score').textContent = this.score;
    }
    
    skipWord() {
        const feedback = document.getElementById('typing-feedback');
        const currentWord = this.practiceWords[this.currentIndex];
        
        feedback.textContent = `Overslagen. Het antwoord was: ${currentWord.answer}`;
        feedback.className = 'feedback';
        
        document.getElementById('next-word').disabled = false;
    }
    
    nextWord() {
        this.currentIndex++;
        this.loadCurrentWord();
    }
    
    flipFlashcard() {
        this.flashcardFlipped = !this.flashcardFlipped;
        document.getElementById('flashcard').classList.toggle('flipped', this.flashcardFlipped);
    }
    
    shuffleCards() {
        this.practiceWords = this.shuffleArray(this.practiceWords);
        this.currentIndex = 0;
        this.loadCurrentWord();
        showToast('Kaarten geschud', 'success');
    }
    
    prevCard() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.loadCurrentWord();
        }
    }
    
    nextCard() {
        if (this.currentIndex < this.practiceWords.length - 1) {
            this.currentIndex++;
            this.loadCurrentWord();
        } else {
            this.finishPractice();
        }
    }
    
    rateWord(rating) {
        // Store rating for the current word
        const currentWord = this.practiceWords[this.currentIndex];
        currentWord.rating = rating;
        
        // Move to next card
        if (this.currentIndex < this.practiceWords.length - 1) {
            this.currentIndex++;
            this.loadCurrentWord();
        } else {
            this.finishPractice();
        }
    }
    
    updateProgress() {
        const progress = ((this.currentIndex) / this.practiceWords.length) * 100;
        
        if (this.practiceMode === 'typing') {
            document.getElementById('typing-progress').style.width = `${progress}%`;
            document.getElementById('progress-text').textContent = 
                `${this.currentIndex}/${this.practiceWords.length}`;
        }
    }
    
    startTimer() {
        this.stopTimer();
        
        this.timerInterval = setInterval(() => {
            this.elapsedTime++;
            
            // Update time display
            const minutes = Math.floor(this.elapsedTime / 60);
            const seconds = this.elapsedTime % 60;
            
            const timeDisplay = document.getElementById('typing-time');
            if (timeDisplay) {
                timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }
    
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }
    
    async finishPractice() {
        this.stopTimer();
        
        // Calculate final score
        const accuracy = this.practiceWords.length > 0 ? 
            Math.round((this.score / this.practiceWords.length) * 100) : 0;
        
        // Save practice session
        if (this.currentUser) {
            await this.savePracticeSession(accuracy);
        }
        
        // Show results
        this.showResults(accuracy);
    }
    
    async savePracticeSession(accuracy) {
        try {
            const sessionData = {
                wordlistId: this.currentWordlist.id,
                wordlistName: this.currentWordlist.name,
                mode: this.practiceMode,
                score: this.score,
                totalWords: this.practiceWords.length,
                accuracy: accuracy,
                timeSpent: this.elapsedTime,
                completedAt: serverTimestamp()
            };
            
            const sessionRef = doc(collection(db, 'users', this.currentUser.id, 'practiceSessions'));
            await setDoc(sessionRef, sessionData);
            
            // Update wordlist stats
            await this.updateWordlistStats();
            
        } catch (error) {
            console.error('Error saving practice session:', error);
        }
    }
    
    async updateWordlistStats() {
        try {
            const wordlistRef = doc(db, 'users', this.currentUser.id, 'wordlists', this.currentWordlist.id);
            
            // Get current stats
            const wordlistSnap = await getDoc(wordlistRef);
            if (wordlistSnap.exists()) {
                const currentData = wordlistSnap.data();
                const currentStats = currentData.stats || { practiceCount: 0, totalScore: 0 };
                
                // Update stats
                const updatedStats = {
                    practiceCount: (currentStats.practiceCount || 0) + 1,
                    totalScore: (currentStats.totalScore || 0) + this.score,
                    lastPracticed: serverTimestamp()
                };
                
                await updateDoc(wordlistRef, {
                    stats: updatedStats,
                    updatedAt: serverTimestamp()
                });
            }
        } catch (error) {
            console.error('Error updating wordlist stats:', error);
        }
    }
    
    showResults(accuracy) {
        const practiceArea = document.getElementById('practice-area');
        const practiceInterface = this.practiceMode === 'typing' ? 
            document.getElementById('typing-practice') : 
            document.getElementById('flashcards-practice');
        
        if (practiceInterface) {
            practiceInterface.classList.add('hidden');
        }
        
        if (practiceArea) {
            practiceArea.classList.remove('hidden');
            practiceArea.innerHTML = `
                <div class="practice-results">
                    <div class="result-icon">
                        <i class="fas fa-trophy"></i>
                    </div>
                    <h2>Oefening Voltooid!</h2>
                    
                    <div class="result-stats">
                        <div class="result-stat">
                            <span class="stat-label">Score</span>
                            <span class="stat-value">${this.score}/${this.practiceWords.length}</span>
                        </div>
                        <div class="result-stat">
                            <span class="stat-label">Nauwkeurigheid</span>
                            <span class="stat-value">${accuracy}%</span>
                        </div>
                        <div class="result-stat">
                            <span class="stat-label">Tijd</span>
                            <span class="stat-value">${Math.floor(this.elapsedTime / 60)}:${(this.elapsedTime % 60).toString().padStart(2, '0')}</span>
                        </div>
                    </div>
                    
                    <div class="result-actions">
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
            document.getElementById('practice-again')?.addEventListener('click', () => {
                this.startPractice();
            });
            
            document.getElementById('new-practice')?.addEventListener('click', () => {
                practiceArea.innerHTML = `
                    <div class="practice-welcome">
                        <i class="fas fa-graduation-cap"></i>
                        <h3>Klaar om te Leren?</h3>
                        <p>Selecteer een woordenlijst en klik op "Start Oefenen" om te beginnen.</p>
                    </div>
                `;
            });
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.practiceManager = new PracticeManager();
});
