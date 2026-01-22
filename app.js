// Main application JavaScript file
document.addEventListener('DOMContentLoaded', function() {
    // Pagina navigatie
    const navLinks = document.querySelectorAll('.nav-link');
    const pages = document.querySelectorAll('.page');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const pageId = this.getAttribute('data-page');
            
            // Update actieve navigatielink
            navLinks.forEach(link => link.classList.remove('active'));
            this.classList.add('active');
            
            // Toon geselecteerde pagina
            pages.forEach(page => {
                page.classList.remove('active');
                if (page.id === `${pageId}-page`) {
                    page.classList.add('active');
                }
            });
            
            // Scroll naar boven
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
    
    // Homepage knoppen
    document.getElementById('hero-start').addEventListener('click', function() {
        document.querySelector('[data-page="oefenen"]').click();
    });
    
    document.getElementById('hero-upload').addEventListener('click', function() {
        document.querySelector('[data-page="upload"]').click();
    });
    
    // Upload opties
    const uploadFileOption = document.getElementById('upload-file-option');
    const manualInputOption = document.getElementById('manual-input-option');
    const fileUploadArea = document.getElementById('file-upload-area');
    const manualInputArea = document.getElementById('manual-input-area');
    
    uploadFileOption.addEventListener('click', function() {
        uploadFileOption.classList.add('active');
        manualInputOption.classList.remove('active');
        fileUploadArea.classList.add('active');
        manualInputArea.classList.remove('active');
    });
    
    manualInputOption.addEventListener('click', function() {
        manualInputOption.classList.add('active');
        uploadFileOption.classList.remove('active');
        manualInputArea.classList.add('active');
        fileUploadArea.classList.remove('active');
    });
    
    // Woorden teller voor handmatige invoer
    const manualInput = document.getElementById('manual-input');
    const wordCount = document.getElementById('word-count');
    
    manualInput.addEventListener('input', function() {
        const lines = this.value.trim().split('\n').filter(line => line.trim() !== '');
        wordCount.textContent = lines.length;
        
        // Preview bijwerken
        const preview = document.getElementById('manual-preview');
        if (lines.length > 0) {
            let previewHtml = '';
            for (let i = 0; i < Math.min(lines.length, 5); i++) {
                const parts = lines[i].split('|');
                previewHtml += `<p><strong>${parts[0] || ''}</strong> | ${parts[1] || ''}</p>`;
            }
            if (lines.length > 5) {
                previewHtml += `<p>... en ${lines.length - 5} meer</p>`;
            }
            preview.innerHTML = previewHtml;
        } else {
            preview.innerHTML = '<p>Voorbeeld verschijnt hier...</p>';
        }
    });
    
    // Bestand upload preview
    const fileInput = document.getElementById('file-input');
    const filePreview = document.getElementById('file-preview');
    const previewSection = document.querySelector('#file-upload-area .preview-section');
    
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        if (!file.name.endsWith('.txt') && !file.name.endsWith('.csv')) {
            alert('Alleen .txt en .csv bestanden zijn toegestaan');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const content = e.target.result;
            const lines = content.split('\n').filter(line => line.trim() !== '');
            
            if (lines.length > 0) {
                previewSection.classList.remove('hidden');
                let previewHtml = '';
                for (let i = 0; i < Math.min(lines.length, 5); i++) {
                    const parts = lines[i].split('|');
                    previewHtml += `<p><strong>${parts[0] || ''}</strong> | ${parts[1] || ''}</p>`;
                }
                if (lines.length > 5) {
                    previewHtml += `<p>... en ${lines.length - 5} meer</p>`;
                }
                filePreview.innerHTML = previewHtml;
            } else {
                filePreview.innerHTML = '<p>Geen geldige inhoud gevonden in het bestand</p>';
            }
        };
        reader.readAsText(file);
    });
    
    // Woorden oefenen functionaliteit
    let currentPracticeSession = null;
    let practiceWords = [];
    let currentWordIndex = 0;
    let correctAnswers = 0;
    let streak = 0;
    
    document.getElementById('start-practice').addEventListener('click', startPractice);
    document.getElementById('end-practice').addEventListener('click', endPractice);
    document.getElementById('check-answer').addEventListener('click', checkAnswer);
    document.getElementById('next-word').addEventListener('click', nextWord);
    document.getElementById('practice-again').addEventListener('click', startPractice);
    
    // Enter-toets voor antwoord controleren
    document.getElementById('answer-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            checkAnswer();
        }
    });
    
    function startPractice() {
        const wordlistSelect = document.getElementById('wordlist-select');
        const selectedList = wordlistSelect.value;
        
        if (!selectedList) {
            alert('Selecteer eerst een woordenlijst');
            return;
        }
        
        // Voor demo - in echte app zouden woorden uit Firebase komen
        practiceWords = [
            { question: "Hoe gaat het?", answer: "How are you?" },
            { question: "Waar is het station?", answer: "Where is the station?" },
            { question: "Ik heb honger", answer: "I am hungry" },
            { question: "Hoeveel kost dit?", answer: "How much does this cost?" },
            { question: "Kunt u mij helpen?", answer: "Can you help me?" },
            { question: "Goedemorgen", answer: "Good morning" },
            { question: "Ik begrijp het niet", answer: "I don't understand" },
            { question: "Spreekt u Engels?", answer: "Do you speak English?" },
            { question: "Dank u wel", answer: "Thank you" },
            { question: "Tot ziens", answer: "Goodbye" }
        ];
        
        // Shuffle words if in mixed mode
        const mode = document.getElementById('practice-mode').value;
        if (mode === 'mixed') {
            practiceWords = practiceWords.sort(() => Math.random() - 0.5);
        }
        
        currentWordIndex = 0;
        correctAnswers = 0;
        streak = 0;
        
        // Update UI
        document.querySelector('.practice-controls').classList.add('hidden');
        document.querySelector('.practice-area').classList.remove('hidden');
        document.querySelector('.practice-results').classList.add('hidden');
        
        updatePracticeUI();
    }
    
    function updatePracticeUI() {
        if (currentWordIndex >= practiceWords.length) {
            showPracticeResults();
            return;
        }
        
        const word = practiceWords[currentWordIndex];
        const mode = document.getElementById('practice-mode').value;
        
        let question, answer;
        if (mode === 'reverse') {
            question = word.answer;
            answer = word.question;
        } else {
            question = word.question;
            answer = word.answer;
        }
        
        document.getElementById('question-text').textContent = question;
        document.getElementById('answer-input').value = '';
        document.getElementById('answer-input').focus();
        document.getElementById('current-word').textContent = `${currentWordIndex + 1}/${practiceWords.length}`;
        document.getElementById('score').textContent = `Score: ${correctAnswers}`;
        document.getElementById('streak').textContent = `Reeks: ${streak}`;
        
        document.getElementById('feedback').classList.add('hidden');
        document.getElementById('check-answer').disabled = false;
        document.getElementById('next-word').classList.add('hidden');
    }
    
    function checkAnswer() {
        const userAnswer = document.getElementById('answer-input').value.trim();
        const word = practiceWords[currentWordIndex];
        const mode = document.getElementById('practice-mode').value;
        
        let correctAnswer;
        if (mode === 'reverse') {
            correctAnswer = word.question;
        } else {
            correctAnswer = word.answer;
        }
        
        const isCorrect = userAnswer.toLowerCase() === correctAnswer.toLowerCase();
        const feedback = document.getElementById('feedback');
        const feedbackText = document.getElementById('feedback-text');
        const correctAnswerElement = document.getElementById('correct-answer');
        
        feedback.classList.remove('hidden');
        
        if (isCorrect) {
            feedback.classList.remove('error');
            feedbackText.textContent = 'Correct! Goed gedaan.';
            correctAnswers++;
            streak++;
        } else {
            feedback.classList.add('error');
            feedbackText.textContent = 'Helaas, dat is niet correct.';
            correctAnswerElement.textContent = `Het juiste antwoord is: ${correctAnswer}`;
            streak = 0;
        }
        
        document.getElementById('score').textContent = `Score: ${correctAnswers}`;
        document.getElementById('streak').textContent = `Reeks: ${streak}`;
        document.getElementById('check-answer').disabled = true;
        document.getElementById('next-word').classList.remove('hidden');
    }
    
    function nextWord() {
        currentWordIndex++;
        updatePracticeUI();
    }
    
    function showPracticeResults() {
        document.querySelector('.practice-area').classList.add('hidden');
        document.querySelector('.practice-results').classList.remove('hidden');
        
        const totalWords = practiceWords.length;
        const incorrectAnswers = totalWords - correctAnswers;
        const accuracy = totalWords > 0 ? Math.round((correctAnswers / totalWords) * 100) : 0;
        
        document.getElementById('total-words').textContent = totalWords;
        document.getElementById('correct-answers').textContent = correctAnswers;
        document.getElementById('incorrect-answers').textContent = incorrectAnswers;
        document.getElementById('accuracy').textContent = `${accuracy}%`;
    }
    
    function endPractice() {
        document.querySelector('.practice-controls').classList.remove('hidden');
        document.querySelector('.practice-area').classList.add('hidden');
        document.querySelector('.practice-results').classList.add('hidden');
    }
    
    // Flashcards functionaliteit
    let flashcards = [];
    let currentCardIndex = 0;
    let knownCards = [];
    let unknownCards = [];
    
    document.getElementById('start-flashcards').addEventListener('click', startFlashcards);
    document.getElementById('end-flashcards').addEventListener('click', endFlashcards);
    document.getElementById('flip-card').addEventListener('click', flipCard);
    document.getElementById('next-card').addEventListener('click', nextCard);
    document.getElementById('prev-card').addEventListener('click', prevCard);
    document.getElementById('mark-known').addEventListener('click', markKnown);
    document.getElementById('mark-unknown').addEventListener('click', markUnknown);
    document.getElementById('flashcards-again').addEventListener('click', startFlashcards);
    
    // Klik op flashcard om te draaien
    document.getElementById('flashcard').addEventListener('click', flipCard);
    
    function startFlashcards() {
        const wordlistSelect = document.getElementById('flashcards-wordlist-select');
        const selectedList = wordlistSelect.value;
        
        if (!selectedList) {
            alert('Selecteer eerst een woordenlijst');
            return;
        }
        
        // Voor demo - in echte app zouden woorden uit Firebase komen
        flashcards = [
            { question: "Hoe gaat het?", answer: "How are you?" },
            { question: "Waar is het station?", answer: "Where is the station?" },
            { question: "Ik heb honger", answer: "I am hungry" },
            { question: "Hoeveel kost dit?", answer: "How much does this cost?" },
            { question: "Kunt u mij helpen?", answer: "Can you help me?" },
            { question: "Goedemorgen", answer: "Good morning" },
            { question: "Ik begrijp het niet", answer: "I don't understand" },
            { question: "Spreekt u Engels?", answer: "Do you speak English?" },
            { question: "Dank u wel", answer: "Thank you" },
            { question: "Tot ziens", answer: "Goodbye" }
        ];
        
        // Shuffle cards
        flashcards = flashcards.sort(() => Math.random() - 0.5);
        
        currentCardIndex = 0;
        knownCards = [];
        unknownCards = [];
        
        // Update UI
        document.querySelector('.flashcards-controls').classList.add('hidden');
        document.querySelector('.flashcards-area').classList.remove('hidden');
        document.querySelector('.flashcards-results').classList.add('hidden');
        
        updateFlashcardUI();
    }
    
    function updateFlashcardUI() {
        if (currentCardIndex >= flashcards.length) {
            showFlashcardsResults();
            return;
        }
        
        const card = flashcards[currentCardIndex];
        document.getElementById('flashcard-question').textContent = card.question;
        document.getElementById('flashcard-answer').textContent = card.answer;
        document.getElementById('flashcard').classList.remove('flipped');
        
        document.getElementById('current-card').textContent = `${currentCardIndex + 1}/${flashcards.length}`;
        document.getElementById('cards-remaining').textContent = `Resterend: ${flashcards.length - currentCardIndex - 1}`;
    }
    
    function flipCard() {
        document.getElementById('flashcard').classList.toggle('flipped');
    }
    
    function nextCard() {
        currentCardIndex++;
        updateFlashcardUI();
    }
    
    function prevCard() {
        if (currentCardIndex > 0) {
            currentCardIndex--;
            updateFlashcardUI();
        }
    }
    
    function markKnown() {
        knownCards.push(flashcards[currentCardIndex]);
        nextCard();
    }
    
    function markUnknown() {
        unknownCards.push(flashcards[currentCardIndex]);
        nextCard();
    }
    
    function showFlashcardsResults() {
        document.querySelector('.flashcards-area').classList.add('hidden');
        document.querySelector('.flashcards-results').classList.remove('hidden');
        
        document.getElementById('total-cards').textContent = flashcards.length;
        document.getElementById('known-cards').textContent = knownCards.length;
        document.getElementById('unknown-cards').textContent = unknownCards.length;
    }
    
    function endFlashcards() {
        document.querySelector('.flashcards-controls').classList.remove('hidden');
        document.querySelector('.flashcards-area').classList.add('hidden');
        document.querySelector('.flashcards-results').classList.add('hidden');
    }
    
    // Clerk authenticatie
    const clerkPublishableKey = 'pk_test_bm9ibGUtZmVsaW5lLTgxLmNsZXJrLmFjY291bnRzLmRldiQ';
    const signInButton = document.getElementById('sign-in-button');
    const userAvatar = document.getElementById('user-avatar');
    const avatarImage = document.getElementById('avatar-image');
    const userName = document.getElementById('user-name');
    const clerkModal = document.getElementById('clerk-modal');
    const closeModal = document.getElementById('close-modal');
    
    // Clerk initialisatie
    if (typeof Clerk !== 'undefined') {
        Clerk.load({
            publishableKey: clerkPublishableKey,
            afterSignInUrl: window.location.href,
            afterSignUpUrl: window.location.href
        }).then(() => {
            updateAuthUI();
            
            // Luister naar auth state changes
            Clerk.addListener(({ user }) => {
                updateAuthUI();
            });
        }).catch(err => {
            console.error('Clerk initialisatie fout:', err);
        });
    }
    
    function updateAuthUI() {
        if (Clerk.user) {
            signInButton.classList.add('hidden');
            userAvatar.classList.remove('hidden');
            
            // Gebruikersinformatie weergeven
            const user = Clerk.user;
            userName.textContent = user.fullName || user.primaryEmailAddress.emailAddress;
            
            if (user.profileImageUrl) {
                avatarImage.src = user.profileImageUrl;
                avatarImage.alt = 'Gebruiker avatar';
            } else {
                avatarImage.src = 'https://via.placeholder.com/40';
            }
            
            // Voeg klik event toe voor user menu (eenvoudige logout)
            userAvatar.addEventListener('click', function() {
                Clerk.signOut().then(() => {
                    window.location.reload();
                });
            });
        } else {
            signInButton.classList.remove('hidden');
            userAvatar.classList.add('hidden');
        }
    }
    
    // Modal voor inloggen
    signInButton.addEventListener('click', function() {
        clerkModal.classList.remove('hidden');
        
        // Render Clerk sign-in component
        if (typeof Clerk !== 'undefined') {
            const signInDiv = document.getElementById('clerk-signin');
            signInDiv.innerHTML = '';
            Clerk.mountSignIn(signInDiv);
        }
    });
    
    closeModal.addEventListener('click', function() {
        clerkModal.classList.add('hidden');
    });
    
    clerkModal.addEventListener('click', function(e) {
        if (e.target === clerkModal) {
            clerkModal.classList.add('hidden');
        }
    });
    
    // Demo woordenlijsten
    const wordlistsGrid = document.getElementById('wordlists-grid');
    
    const demoWordlists = [
        { name: "Engelse basiswoorden", count: 15, description: "Basis Engels voor beginners" },
        { name: "Spaanse reiswoorden", count: 25, description: "Handige woorden voor op reis" },
        { name: "Franse werkwoorden", count: 30, description: "Belangrijke Franse werkwoorden" },
        { name: "Duitse zinnen", count: 20, description: "Veelgebruikte Duitse zinnen" }
    ];
    
    function loadDemoWordlists() {
        wordlistsGrid.innerHTML = '';
        
        demoWordlists.forEach(list => {
            const card = document.createElement('div');
            card.className = 'wordlist-card';
            card.innerHTML = `
                <div class="wordlist-header">
                    <h4>${list.name}</h4>
                    <span class="word-count">${list.count} woorden</span>
                </div>
                <p class="wordlist-description">${list.description}</p>
                <div class="wordlist-actions">
                    <button class="btn btn-small btn-secondary delete-wordlist">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="btn btn-small btn-primary practice-wordlist">
                        <i class="fas fa-play"></i> Oefenen
                    </button>
                </div>
            `;
            
            wordlistsGrid.appendChild(card);
        });
        
        // Voeg events toe aan de nieuwe knoppen
        document.querySelectorAll('.practice-wordlist').forEach(button => {
            button.addEventListener('click', function() {
                document.querySelector('[data-page="oefenen"]').click();
            });
        });
        
        document.querySelectorAll('.delete-wordlist').forEach(button => {
            button.addEventListener('click', function() {
                if (confirm('Weet je zeker dat je deze woordenlijst wilt verwijderen?')) {
                    this.closest('.wordlist-card').remove();
                }
            });
        });
    }
    
    // Laad demo woordenlijsten
    loadDemoWordlists();
    
    // Vul dropdowns met demo woordenlijsten
    const wordlistSelects = document.querySelectorAll('select[id$="wordlist-select"]');
    wordlistSelects.forEach(select => {
        demoWordlists.forEach(list => {
            const option = document.createElement('option');
            option.value = list.name.toLowerCase().replace(/\s+/g, '-');
            option.textContent = list.name;
            select.appendChild(option);
        });
    });
    
    // Grafieken voor scores pagina
    const accuracyCtx = document.getElementById('accuracy-chart');
    const categoriesCtx = document.getElementById('categories-chart');
    
    if (accuracyCtx) {
        // Voorbeeld data - in echte app zou dit uit Firebase komen
        const accuracyChart = new Chart(accuracyCtx, {
            type: 'line',
            data: {
                labels: ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'],
                datasets: [{
                    label: 'Nauwkeurigheid (%)',
                    data: [65, 70, 75, 80, 85, 90, 92],
                    borderColor: '#4361ee',
                    backgroundColor: 'rgba(67, 97, 238, 0.1)',
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
    
    if (categoriesCtx) {
        const categoriesChart = new Chart(categoriesCtx, {
            type: 'doughnut',
            data: {
                labels: ['Engels', 'Spaans', 'Frans', 'Duits'],
                datasets: [{
                    data: [40, 25, 20, 15],
                    backgroundColor: [
                        '#4361ee',
                        '#7209b7',
                        '#4cc9f0',
                        '#f72585'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
    
    // Voorbeeld sessies voor scores pagina
    const sessionsTableBody = document.getElementById('sessions-table-body');
    const exampleSessions = [
        { date: '2023-10-15', type: 'Oefenen', wordlist: 'Engelse basiswoorden', score: '8/10', time: '5 min' },
        { date: '2023-10-14', type: 'Flashcards', wordlist: 'Spaanse reiswoorden', score: '20/25', time: '8 min' },
        { date: '2023-10-12', type: 'Oefenen', wordlist: 'Franse werkwoorden', score: '25/30', time: '10 min' },
        { date: '2023-10-10', type: 'Flashcards', wordlist: 'Duitse zinnen', score: '15/20', time: '6 min' },
        { date: '2023-10-08', type: 'Oefenen', wordlist: 'Engelse basiswoorden', score: '10/10', time: '7 min' }
    ];
    
    if (sessionsTableBody) {
        exampleSessions.forEach(session => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${session.date}</td>
                <td>${session.type}</td>
                <td>${session.wordlist}</td>
                <td>${session.score}</td>
                <td>${session.time}</td>
            `;
            sessionsTableBody.appendChild(row);
        });
    }
    
    // Update scores statistieken
    document.getElementById('total-correct').textContent = '68';
    document.getElementById('total-practiced').textContent = '95';
    document.getElementById('accuracy-rate').textContent = '85%';
    document.getElementById('total-time').textContent = '36 min';
});