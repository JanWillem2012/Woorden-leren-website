import { 
    db, 
    collection, 
    doc, 
    setDoc, 
    getDoc, 
    getDocs, 
    updateDoc, 
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp 
} from './firebase-config.js';
import { clerk, showToast } from './auth.js';

class WordlistManager {
    constructor() {
        this.currentUser = null;
        this.currentWordlist = null;
        this.wordlists = [];
        this.wordCounter = 0;
        
        this.initialize();
    }
    
    initialize() {
        this.bindEvents();
        this.checkAuthState();
    }
    
    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.getAttribute('data-page');
                this.switchPage(page);
            });
        });
        
        // Dashboard actions
        document.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.getAttribute('data-action');
                this.handleDashboardAction(action);
            });
        });
        
        // Wordlist modal
        document.getElementById('create-wordlist-btn')?.addEventListener('click', () => {
            this.openWordlistModal();
        });
        
        document.getElementById('close-modal')?.addEventListener('click', () => {
            this.closeWordlistModal();
        });
        
        document.getElementById('cancel-wordlist')?.addEventListener('click', () => {
            this.closeWordlistModal();
        });
        
        document.getElementById('save-wordlist')?.addEventListener('click', () => {
            this.saveWordlist();
        });
        
        document.getElementById('add-word-btn')?.addEventListener('click', () => {
            this.addWordRow();
        });
        
        document.getElementById('import-words-btn')?.addEventListener('click', () => {
            this.toggleImportSection();
        });
        
        document.getElementById('process-import-btn')?.addEventListener('click', () => {
            this.importWords();
        });
        
        // Search and filter
        document.getElementById('search-wordlists')?.addEventListener('input', (e) => {
            this.filterWordlists(e.target.value);
        });
        
        document.getElementById('filter-sort')?.addEventListener('change', (e) => {
            this.sortWordlists(e.target.value);
        });
        
        // Mobile menu
        document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
            const navLinks = document.getElementById('nav-links');
            navLinks.classList.toggle('active');
        });
    }
    
    checkAuthState() {
        if (clerk?.user) {
            this.currentUser = clerk.user;
            this.loadUserWordlists();
        }
    }
    
    switchPage(page) {
        // Update active nav link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-page') === page) {
                link.classList.add('active');
            }
        });
        
        // Hide all pages
        document.querySelectorAll('.page').forEach(pageEl => {
            pageEl.classList.remove('active');
        });
        
        // Show selected page
        const pageElement = document.getElementById(`${page}-page`);
        if (pageElement) {
            pageElement.classList.add('active');
            
            // Load page-specific data
            if (page === 'wordlists') {
                this.loadUserWordlists();
            } else if (page === 'practice') {
                // Will be handled by practice.js
                if (window.practiceManager) {
                    window.practiceManager.loadWordlistsForPractice();
                }
            } else if (page === 'stats') {
                // Will be handled by stats module
                if (window.statsManager) {
                    window.statsManager.loadStats();
                }
            }
        }
    }
    
    handleDashboardAction(action) {
        switch(action) {
            case 'create-wordlist':
                this.switchPage('wordlists');
                setTimeout(() => this.openWordlistModal(), 300);
                break;
            case 'start-practice':
                this.switchPage('practice');
                break;
            case 'scan-wordlist':
                this.switchPage('ocr-upload');
                break;
        }
    }
    
    async loadUserWordlists() {
        if (!this.currentUser) return;
        
        try {
            showLoading('Woordenlijsten laden...');
            
            const wordlistsRef = collection(db, 'users', this.currentUser.id, 'wordlists');
            const querySnapshot = await getDocs(wordlistsRef);
            
            this.wordlists = [];
            querySnapshot.forEach((doc) => {
                this.wordlists.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            this.renderWordlists();
            this.updateDashboardStats();
            
            hideLoading();
        } catch (error) {
            console.error('Error loading wordlists:', error);
            showToast('Kan woordenlijsten niet laden', 'error');
            hideLoading();
        }
    }
    
    renderWordlists() {
        const grid = document.getElementById('wordlists-grid');
        if (!grid) return;
        
        if (this.wordlists.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-list-alt fa-3x"></i>
                    <h3>Geen woordenlijsten</h3>
                    <p>Maak je eerste woordenlijst om te beginnen met leren</p>
                    <button class="btn-primary" id="create-first-wordlist">
                        <i class="fas fa-plus"></i> Eerste Lijst Aanmaken
                    </button>
                </div>
            `;
            
            document.getElementById('create-first-wordlist')?.addEventListener('click', () => {
                this.openWordlistModal();
            });
            
            return;
        }
        
        grid.innerHTML = this.wordlists.map(wordlist => `
            <div class="wordlist-card" data-id="${wordlist.id}">
                <div class="wordlist-header">
                    <h3>${wordlist.name}</h3>
                    <span class="wordlist-count">${wordlist.words?.length || 0} woorden</span>
                </div>
                <div class="wordlist-body">
                    <p class="wordlist-description">${wordlist.description || 'Geen beschrijving'}</p>
                    <div class="wordlist-meta">
                        <span class="meta-item">
                            <i class="fas fa-language"></i> ${this.getLanguageName(wordlist.language)}
                        </span>
                        <span class="meta-item">
                            <i class="fas fa-calendar"></i> ${this.formatDate(wordlist.createdAt?.toDate())}
                        </span>
                    </div>
                </div>
                <div class="wordlist-actions">
                    <button class="action-btn edit" data-action="edit" data-id="${wordlist.id}">
                        <i class="fas fa-edit"></i> Bewerken
                    </button>
                    <button class="action-btn practice" data-action="practice" data-id="${wordlist.id}">
                        <i class="fas fa-play"></i> Oefenen
                    </button>
                    <button class="action-btn delete" data-action="delete" data-id="${wordlist.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
        
        // Add event listeners to action buttons
        grid.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.getAttribute('data-action');
                const id = e.currentTarget.getAttribute('data-id');
                this.handleWordlistAction(action, id);
            });
        });
    }
    
    handleWordlistAction(action, wordlistId) {
        const wordlist = this.wordlists.find(w => w.id === wordlistId);
        if (!wordlist) return;
        
        switch(action) {
            case 'edit':
                this.editWordlist(wordlist);
                break;
            case 'practice':
                this.startPractice(wordlist);
                break;
            case 'delete':
                this.deleteWordlist(wordlist);
                break;
        }
    }
    
    openWordlistModal(wordlist = null) {
        this.currentWordlist = wordlist;
        const modal = document.getElementById('wordlist-modal');
        const title = document.getElementById('modal-title');
        const nameInput = document.getElementById('wordlist-name');
        const descInput = document.getElementById('wordlist-description');
        const langInput = document.getElementById('wordlist-language');
        
        if (wordlist) {
            title.textContent = 'Woordenlijst Bewerken';
            nameInput.value = wordlist.name || '';
            descInput.value = wordlist.description || '';
            langInput.value = wordlist.language || 'en';
            this.loadWordsIntoTable(wordlist.words || []);
        } else {
            title.textContent = 'Nieuwe Woordenlijst';
            nameInput.value = '';
            descInput.value = '';
            langInput.value = 'en';
            this.clearWordsTable();
        }
        
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
    
    closeWordlistModal() {
        const modal = document.getElementById('wordlist-modal');
        modal.style.display = 'none';
        document.body.style.overflow = '';
        this.currentWordlist = null;
        this.clearWordsTable();
    }
    
    loadWordsIntoTable(words) {
        const tbody = document.getElementById('words-table-body');
        this.wordCounter = 0;
        
        tbody.innerHTML = words.map((word, index) => this.createWordRow(word, index + 1)).join('');
        
        if (words.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="4">
                        <i class="fas fa-info-circle"></i>
                        Nog geen woorden toegevoegd. Klik op "Woord Toevoegen"
                    </td>
                </tr>
            `;
        }
        
        this.bindWordRowEvents();
    }
    
    clearWordsTable() {
        const tbody = document.getElementById('words-table-body');
        tbody.innerHTML = `
            <tr class="empty-row">
                <td colspan="4">
                    <i class="fas fa-info-circle"></i>
                    Nog geen woorden toegevoegd. Klik op "Woord Toevoegen"
                </td>
            </tr>
        `;
        this.wordCounter = 0;
    }
    
    createWordRow(word = { question: '', answer: '' }, index) {
        this.wordCounter = Math.max(this.wordCounter, index);
        return `
            <tr data-index="${index}">
                <td>${index}</td>
                <td>
                    <input type="text" class="word-input question" value="${word.question}" placeholder="Vraag/woord">
                </td>
                <td>
                    <input type="text" class="word-input answer" value="${word.answer}" placeholder="Antwoord/betekenis">
                </td>
                <td>
                    <button class="table-btn delete-row" title="Verwijderen">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="table-btn move-up" title="Omhoog">
                        <i class="fas fa-arrow-up"></i>
                    </button>
                    <button class="table-btn move-down" title="Omlaag">
                        <i class="fas fa-arrow-down"></i>
                    </button>
                </td>
            </tr>
        `;
    }
    
    addWordRow() {
        const tbody = document.getElementById('words-table-body');
        const emptyRow = tbody.querySelector('.empty-row');
        
        if (emptyRow) {
            emptyRow.remove();
        }
        
        this.wordCounter++;
        const newRow = this.createWordRow({ question: '', answer: '' }, this.wordCounter);
        tbody.insertAdjacentHTML('beforeend', newRow);
        
        this.bindWordRowEvents();
    }
    
    bindWordRowEvents() {
        const tbody = document.getElementById('words-table-body');
        
        tbody.querySelectorAll('.delete-row').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const row = e.target.closest('tr');
                row.remove();
                
                // Update row numbers
                this.updateRowNumbers();
                
                // If no rows left, show empty message
                if (tbody.querySelectorAll('tr').length === 0) {
                    this.clearWordsTable();
                }
            });
        });
        
        tbody.querySelectorAll('.move-up').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const row = e.target.closest('tr');
                const prevRow = row.previousElementSibling;
                
                if (prevRow) {
                    row.parentNode.insertBefore(row, prevRow);
                    this.updateRowNumbers();
                }
            });
        });
        
        tbody.querySelectorAll('.move-down').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const row = e.target.closest('tr');
                const nextRow = row.nextElementSibling;
                
                if (nextRow) {
                    row.parentNode.insertBefore(nextRow, row);
                    this.updateRowNumbers();
                }
            });
        });
    }
    
    updateRowNumbers() {
        const tbody = document.getElementById('words-table-body');
        const rows = tbody.querySelectorAll('tr:not(.empty-row)');
        
        rows.forEach((row, index) => {
            const numberCell = row.querySelector('td:first-child');
            if (numberCell) {
                numberCell.textContent = index + 1;
                row.setAttribute('data-index', index + 1);
            }
        });
        
        this.wordCounter = rows.length;
    }
    
    toggleImportSection() {
        const importSection = document.getElementById('import-section');
        importSection.classList.toggle('hidden');
    }
    
    importWords() {
        const importText = document.getElementById('import-text').value.trim();
        if (!importText) {
            showToast('Voer tekst in om te importeren', 'warning');
            return;
        }
        
        const lines = importText.split('\n');
        const words = [];
        
        lines.forEach(line => {
            const parts = line.split('|').map(part => part.trim());
            if (parts.length >= 2) {
                words.push({
                    question: parts[0],
                    answer: parts[1]
                });
            }
        });
        
        if (words.length === 0) {
            showToast('Geen geldige woordparen gevonden. Gebruik vraag|antwoord formaat.', 'error');
            return;
        }
        
        this.loadWordsIntoTable(words);
        showToast(`${words.length} woorden geïmporteerd`, 'success');
        
        // Clear import text
        document.getElementById('import-text').value = '';
        document.getElementById('import-section').classList.add('hidden');
    }
    
    async saveWordlist() {
        if (!this.currentUser) {
            showToast('Je moet ingelogd zijn om een woordenlijst op te slaan', 'error');
            return;
        }
        
        const name = document.getElementById('wordlist-name').value.trim();
        const description = document.getElementById('wordlist-description').value.trim();
        const language = document.getElementById('wordlist-language').value;
        
        if (!name) {
            showToast('Voer een naam in voor de woordenlijst', 'warning');
            return;
        }
        
        // Collect words from table
        const words = this.collectWordsFromTable();
        
        if (words.length === 0) {
            showToast('Voeg minstens één woord toe aan de lijst', 'warning');
            return;
        }
        
        try {
            showLoading('Woordenlijst opslaan...');
            
            const wordlistData = {
                name,
                description,
                language,
                words,
                updatedAt: serverTimestamp(),
                wordCount: words.length
            };
            
            let wordlistRef;
            
            if (this.currentWordlist) {
                // Update existing wordlist
                wordlistRef = doc(db, 'users', this.currentUser.id, 'wordlists', this.currentWordlist.id);
                await updateDoc(wordlistRef, wordlistData);
                showToast('Woordenlijst bijgewerkt', 'success');
            } else {
                // Create new wordlist
                wordlistData.createdAt = serverTimestamp();
                wordlistRef = doc(collection(db, 'users', this.currentUser.id, 'wordlists'));
                await setDoc(wordlistRef, wordlistData);
                showToast('Woordenlijst aangemaakt', 'success');
            }
            
            // Close modal and refresh list
            this.closeWordlistModal();
            await this.loadUserWordlists();
            
            hideLoading();
        } catch (error) {
            console.error('Error saving wordlist:', error);
            showToast('Kan woordenlijst niet opslaan', 'error');
            hideLoading();
        }
    }
    
    collectWordsFromTable() {
        const tbody = document.getElementById('words-table-body');
        const rows = tbody.querySelectorAll('tr:not(.empty-row)');
        const words = [];
        
        rows.forEach(row => {
            const questionInput = row.querySelector('.question');
            const answerInput = row.querySelector('.answer');
            
            if (questionInput && answerInput) {
                const question = questionInput.value.trim();
                const answer = answerInput.value.trim();
                
                if (question && answer) {
                    words.push({ question, answer });
                }
            }
        });
        
        return words;
    }
    
    editWordlist(wordlist) {
        this.openWordlistModal(wordlist);
    }
    
    startPractice(wordlist) {
        this.switchPage('practice');
        
        // Set the wordlist in practice mode
        setTimeout(() => {
            const select = document.getElementById('select-wordlist');
            if (select) {
                select.value = wordlist.id;
                
                // Trigger practice setup
                if (window.practiceManager) {
                    window.practiceManager.handleWordlistSelect();
                }
            }
        }, 300);
    }
    
    async deleteWordlist(wordlist) {
        if (!confirm(`Weet je zeker dat je "${wordlist.name}" wilt verwijderen?`)) {
            return;
        }
        
        if (!this.currentUser) return;
        
        try {
            showLoading('Woordenlijst verwijderen...');
            
            await deleteDoc(doc(db, 'users', this.currentUser.id, 'wordlists', wordlist.id));
            
            // Remove from local array
            this.wordlists = this.wordlists.filter(w => w.id !== wordlist.id);
            
            // Re-render
            this.renderWordlists();
            this.updateDashboardStats();
            
            showToast('Woordenlijst verwijderd', 'success');
            hideLoading();
        } catch (error) {
            console.error('Error deleting wordlist:', error);
            showToast('Kan woordenlijst niet verwijderen', 'error');
            hideLoading();
        }
    }
    
    filterWordlists(searchTerm) {
        const filtered = this.wordlists.filter(wordlist => 
            wordlist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            wordlist.description?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        this.renderFilteredWordlists(filtered);
    }
    
    renderFilteredWordlists(filteredWordlists) {
        const grid = document.getElementById('wordlists-grid');
        if (!grid) return;
        
        if (filteredWordlists.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search fa-3x"></i>
                    <h3>Geen resultaten</h3>
                    <p>Geen woordenlijsten gevonden die overeenkomen met je zoekopdracht</p>
                </div>
            `;
            return;
        }
        
        this.renderWordlists();
    }
    
    sortWordlists(sortBy) {
        let sorted = [...this.wordlists];
        
        switch(sortBy) {
            case 'newest':
                sorted.sort((a, b) => b.createdAt?.toDate() - a.createdAt?.toDate());
                break;
            case 'oldest':
                sorted.sort((a, b) => a.createdAt?.toDate() - b.createdAt?.toDate());
                break;
            case 'name':
                sorted.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'size':
                sorted.sort((a, b) => (b.words?.length || 0) - (a.words?.length || 0));
                break;
        }
        
        this.wordlists = sorted;
        this.renderWordlists();
    }
    
    updateDashboardStats() {
        const totalWords = this.wordlists.reduce((sum, list) => sum + (list.words?.length || 0), 0);
        
        document.getElementById('words-learned').textContent = '0'; // Will be updated from stats
        document.getElementById('wordlist-count').textContent = this.wordlists.length;
        document.getElementById('success-ratio').textContent = '0%'; // Will be updated from stats
    }
    
    getLanguageName(code) {
        const languages = {
            'en': 'Engels',
            'nl': 'Nederlands',
            'de': 'Duits',
            'fr': 'Frans',
            'es': 'Spaans',
            'other': 'Anders'
        };
        
        return languages[code] || code;
    }
    
    formatDate(date) {
        if (!date) return 'Onbekend';
        
        return new Intl.DateTimeFormat('nl-NL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }).format(date);
    }
}

// Helper functions
function showLoading(text = 'Laden...') {
    const overlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');
    
    if (overlay && loadingText) {
        loadingText.textContent = text;
        overlay.classList.remove('hidden');
    }
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.wordlistManager = new WordlistManager();
});
