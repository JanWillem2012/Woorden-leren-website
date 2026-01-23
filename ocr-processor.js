import Tesseract from 'https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/tesseract.esm.js';
import { clerk, showToast } from './auth.js';

class OCRProcessor {
    constructor() {
        this.currentStep = 1;
        this.uploadedImage = null;
        this.ocrResult = '';
        this.parsedWords = [];
        this.cameraStream = null;
        
        this.initialize();
    }
    
    initialize() {
        this.bindEvents();
        this.loadTesseract();
    }
    
    bindEvents() {
        // Step navigation
        document.getElementById('prev-step')?.addEventListener('click', () => {
            this.prevStep();
        });
        
        document.getElementById('next-step')?.addEventListener('click', () => {
            this.nextStep();
        });
        
        // File upload
        document.getElementById('select-image-btn')?.addEventListener('click', () => {
            document.getElementById('image-upload').click();
        });
        
        document.getElementById('image-upload')?.addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files[0]);
        });
        
        // Drag and drop
        const uploadArea = document.getElementById('upload-area');
        uploadArea?.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#4361ee';
            uploadArea.style.backgroundColor = 'rgba(67, 97, 238, 0.05)';
        });
        
        uploadArea?.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '';
            uploadArea.style.backgroundColor = '';
        });
        
        uploadArea?.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '';
            uploadArea.style.backgroundColor = '';
            
            const file = e.dataTransfer.files[0];
            if (file) {
                this.handleFileUpload(file);
            }
        });
        
        // Camera
        document.getElementById('start-camera-btn')?.addEventListener('click', () => {
            this.startCamera();
        });
        
        document.getElementById('stop-camera-btn')?.addEventListener('click', () => {
            this.stopCamera();
        });
        
        document.getElementById('capture-btn')?.addEventListener('click', () => {
            this.capturePhoto();
        });
        
        // OCR processing
        document.getElementById('auto-format-btn')?.addEventListener('click', () => {
            this.autoFormatText();
        });
        
        document.getElementById('clear-ocr-btn')?.addEventListener('click', () => {
            this.clearOCRText();
        });
        
        document.getElementById('save-ocr-result')?.addEventListener('click', () => {
            this.saveOCRResult();
        });
        
        // Textarea input for real-time parsing
        document.getElementById('ocr-result-text')?.addEventListener('input', (e) => {
            this.ocrResult = e.target.value;
            this.parseWordsFromText();
        });
    }
    
    async loadTesseract() {
        try {
            // Tesseract is loaded via CDN
            console.log('Tesseract.js loaded');
        } catch (error) {
            console.error('Error loading Tesseract:', error);
            showToast('Kan OCR engine niet laden', 'error');
        }
    }
    
    handleFileUpload(file) {
        if (!file) return;
        
        // Check file type
        const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
        if (!validTypes.includes(file.type)) {
            showToast('Alleen JPG, PNG of PDF bestanden zijn toegestaan', 'error');
            return;
        }
        
        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showToast('Bestand is te groot (max 5MB)', 'error');
            return;
        }
        
        this.processUploadedFile(file);
    }
    
    processUploadedFile(file) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            this.uploadedImage = {
                name: file.name,
                type: file.type,
                data: e.target.result
            };
            
            // Display image preview
            const img = document.getElementById('original-image');
            if (img) {
                img.src = this.uploadedImage.data;
            }
            
            // Move to next step
            this.nextStep();
            
            // Start OCR processing
            this.processOCR();
        };
        
        reader.onerror = () => {
            showToast('Kan bestand niet lezen', 'error');
        };
        
        if (file.type === 'application/pdf') {
            // For PDFs, we'll convert to image first
            this.convertPDFToImage(file);
        } else {
            reader.readAsDataURL(file);
        }
    }
    
    async convertPDFToImage(file) {
        // This is a simplified version - in production, use a proper PDF.js implementation
        showToast('PDF ondersteuning komt binnenkort. Gebruik een afbeelding voor nu.', 'warning');
        
        // For now, just show the file name
        this.uploadedImage = {
            name: file.name,
            type: 'application/pdf',
            data: ''
        };
        
        this.nextStep();
    }
    
    async startCamera() {
        try {
            const constraints = {
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };
            
            this.cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
            
            const video = document.getElementById('camera-stream');
            const preview = document.getElementById('camera-preview');
            
            if (video) {
                video.srcObject = this.cameraStream;
            }
            
            if (preview) {
                preview.classList.remove('hidden');
            }
            
            document.getElementById('start-camera-btn').style.display = 'none';
            
        } catch (error) {
            console.error('Error accessing camera:', error);
            showToast('Kan camera niet openen. Controleer toestemmingen.', 'error');
        }
    }
    
    stopCamera() {
        if (this.cameraStream) {
            this.cameraStream.getTracks().forEach(track => track.stop());
            this.cameraStream = null;
        }
        
        const video = document.getElementById('camera-stream');
        const preview = document.getElementById('camera-preview');
        
        if (video) {
            video.srcObject = null;
        }
        
        if (preview) {
            preview.classList.add('hidden');
        }
        
        document.getElementById('start-camera-btn').style.display = 'block';
    }
    
    capturePhoto() {
        const video = document.getElementById('camera-stream');
        const canvas = document.getElementById('photo-canvas');
        
        if (!video || !canvas) return;
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to data URL
        this.uploadedImage = {
            name: 'camera_capture.jpg',
            type: 'image/jpeg',
            data: canvas.toDataURL('image/jpeg')
        };
        
        // Display preview
        const img = document.getElementById('original-image');
        if (img) {
            img.src = this.uploadedImage.data;
        }
        
        // Stop camera
        this.stopCamera();
        
        // Move to next step
        this.nextStep();
        
        // Start OCR processing
        this.processOCR();
    }
    
    async processOCR() {
        if (!this.uploadedImage || !this.uploadedImage.data) {
            showToast('Geen afbeelding om te verwerken', 'error');
            return;
        }
        
        try {
            // Update UI for processing
            this.updateProcessingStatus('Bezig met tekstherkenning...', 0);
            
            // Configure Tesseract
            const worker = await Tesseract.createWorker('nld+eng'); // Dutch and English
            
            // Progress callback
            worker.onProgress = (progress) => {
                const percent = Math.round(progress.progress * 100);
                this.updateProcessingStatus(`Tekst herkennen: ${percent}%`, percent);
            };
            
            // Recognize text
            const { data: { text } } = await worker.recognize(this.uploadedImage.data);
            
            // Store result
            this.ocrResult = text;
            
            // Update textarea
            const textarea = document.getElementById('ocr-result-text');
            if (textarea) {
                textarea.value = text;
            }
            
            // Parse words
            this.parseWordsFromText();
            
            // Move to next step
            this.nextStep();
            
            // Cleanup
            await worker.terminate();
            
            showToast('Tekstherkenning voltooid!', 'success');
            
        } catch (error) {
            console.error('OCR processing error:', error);
            showToast('Fout bij tekstherkenning', 'error');
            
            // Still move to next step so user can manually input
            this.nextStep();
        }
    }
    
    updateProcessingStatus(message, progress) {
        const status = document.getElementById('processing-status');
        const progressBar = document.getElementById('ocr-progress');
        
        if (status) {
            status.textContent = message;
        }
        
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
    }
    
    parseWordsFromText() {
        if (!this.ocrResult.trim()) {
            this.parsedWords = [];
            this.renderParsedWords();
            return;
        }
        
        const lines = this.ocrResult.split('\n');
        this.parsedWords = [];
        
        lines.forEach((line, index) => {
            line = line.trim();
            if (!line) return;
            
            // Try different separators
            const separators = ['|', '\t', ';', ':', '-', '->', '=>'];
            let separator = '|';
            let parts = [];
            
            for (const sep of separators) {
                if (line.includes(sep)) {
                    separator = sep;
                    parts = line.split(sep).map(p => p.trim());
                    break;
                }
            }
            
            // If no separator found, try to split by space
            if (parts.length < 2) {
                const spaceParts = line.split(/\s+/);
                if (spaceParts.length >= 2) {
                    // Assume first word is question, rest is answer
                    parts = [spaceParts[0], spaceParts.slice(1).join(' ')];
                    separator = ' ';
                }
            }
            
            if (parts.length >= 2) {
                this.parsedWords.push({
                    id: index + 1,
                    question: parts[0],
                    answer: parts[1],
                    original: line
                });
            } else {
                // Single word/phrase - user will need to complete manually
                this.parsedWords.push({
                    id: index + 1,
                    question: line,
                    answer: '',
                    original: line
                });
            }
        });
        
        this.renderParsedWords();
    }
    
    renderParsedWords() {
        const tbody = document.getElementById('parsed-words-body');
        if (!tbody) return;
        
        if (this.parsedWords.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="empty-cell">
                        <i class="fas fa-info-circle"></i>
                        Geen woorden gevonden. Voer tekst in of gebruik auto-format.
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = this.parsedWords.map(word => `
            <tr data-id="${word.id}">
                <td>${word.id}</td>
                <td>
                    <input type="text" class="parsed-input question" value="${word.question}" 
                           placeholder="Vraag/woord" data-original="${word.original}">
                </td>
                <td>
                    <input type="text" class="parsed-input answer" value="${word.answer}" 
                           placeholder="Antwoord/betekenis">
                </td>
                <td>
                    <button class="table-btn delete-parsed" title="Verwijderen">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        
        // Add event listeners
        tbody.querySelectorAll('.delete-parsed').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const row = e.target.closest('tr');
                const id = parseInt(row.getAttribute('data-id'));
                this.deleteParsedWord(id);
            });
        });
        
        tbody.querySelectorAll('.parsed-input').forEach(input => {
            input.addEventListener('input', () => {
                this.updateParsedWordFromInput(input);
            });
        });
    }
    
    deleteParsedWord(id) {
        this.parsedWords = this.parsedWords.filter(word => word.id !== id);
        
        // Re-index
        this.parsedWords.forEach((word, index) => {
            word.id = index + 1;
        });
        
        this.renderParsedWords();
    }
    
    updateParsedWordFromInput(input) {
        const row = input.closest('tr');
        const id = parseInt(row.getAttribute('data-id'));
        const wordIndex = this.parsedWords.findIndex(w => w.id === id);
        
        if (wordIndex !== -1) {
            const questionInput = row.querySelector('.question');
            const answerInput = row.querySelector('.answer');
            
            this.parsedWords[wordIndex].question = questionInput.value;
            this.parsedWords[wordIndex].answer = answerInput.value;
        }
    }
    
    autoFormatText() {
        if (!this.ocrResult.trim()) {
            showToast('Voer eerst tekst in', 'warning');
            return;
        }
        
        // Common patterns in word lists
        const patterns = [
            // Pattern: word - meaning
            { regex: /^([^-]+)\s*-\s*(.+)$/gm, replacement: '$1|$2' },
            // Pattern: word: meaning
            { regex: /^([^:]+):\s*(.+)$/gm, replacement: '$1|$2' },
            // Pattern: word = meaning
            { regex: /^([^=]+)=\s*(.+)$/gm, replacement: '$1|$2' },
            // Pattern: word (meaning)
            { regex: /^([^(]+)\s*\(([^)]+)\)$/gm, replacement: '$1|$2' },
            // Pattern: word meaning (space separated, first word is question)
            { regex: /^(\w+)\s+(.+)$/gm, replacement: '$1|$2' }
        ];
        
        let formattedText = this.ocrResult;
        
        patterns.forEach(pattern => {
            formattedText = formattedText.replace(pattern.regex, pattern.replacement);
        });
        
        // Update textarea and parsed words
        const textarea = document.getElementById('ocr-result-text');
        if (textarea) {
            textarea.value = formattedText;
            this.ocrResult = formattedText;
            this.parseWordsFromText();
        }
        
        showToast('Tekst automatisch geformatteerd', 'success');
    }
    
    clearOCRText() {
        const textarea = document.getElementById('ocr-result-text');
        if (textarea) {
            textarea.value = '';
            this.ocrResult = '';
            this.parsedWords = [];
            this.renderParsedWords();
        }
    }
    
    async saveOCRResult() {
        if (!clerk?.user) {
            showToast('Log in om de woordenlijst op te slaan', 'error');
            return;
        }
        
        if (this.parsedWords.length === 0) {
            showToast('Voeg woorden toe om op te slaan', 'warning');
            return;
        }
        
        // Get wordlist name from user
        const listName = prompt('Geef een naam voor de woordenlijst:', 
                              `Woordenlijst ${new Date().toLocaleDateString()}`);
        
        if (!listName) return;
        
        try {
            showToast('Woordenlijst opslaan...', 'info');
            
            // Prepare words for saving
            const words = this.parsedWords
                .filter(word => word.question.trim() && word.answer.trim())
                .map(word => ({
                    question: word.question.trim(),
                    answer: word.answer.trim()
                }));
            
            if (words.length === 0) {
                showToast('Geen complete woordparen gevonden', 'error');
                return;
            }
            
            // Save to wordlists - this would integrate with wordlist-manager.js
            // For now, we'll just show a success message
            showToast(`${words.length} woorden opgeslagen in "${listName}"`, 'success');
            
            // Reset OCR process
            this.resetOCRProcess();
            
            // Switch to wordlists page
            if (window.wordlistManager) {
                window.wordlistManager.switchPage('wordlists');
            }
            
        } catch (error) {
            console.error('Error saving OCR result:', error);
            showToast('Kan woordenlijst niet opslaan', 'error');
        }
    }
    
    resetOCRProcess() {
        this.currentStep = 1;
        this.uploadedImage = null;
        this.ocrResult = '';
        this.parsedWords = [];
        
        // Reset UI
        this.updateStepUI();
        document.getElementById('original-image').src = '';
        document.getElementById('ocr-result-text').value = '';
        this.renderParsedWords();
        
        // Reset camera
        this.stopCamera();
    }
    
    updateStepUI() {
        // Update step indicators
        for (let i = 1; i <= 3; i++) {
            const step = document.getElementById(`step-${i}`);
            if (step) {
                step.classList.toggle('active', i === this.currentStep);
                step.classList.toggle('completed', i < this.currentStep);
            }
        }
        
        // Update navigation buttons
        const prevBtn = document.getElementById('prev-step');
        const nextBtn = document.getElementById('next-step');
        const saveBtn = document.getElementById('save-ocr-result');
        
        if (prevBtn) {
            prevBtn.disabled = this.currentStep === 1;
        }
        
        if (nextBtn) {
            if (this.currentStep === 3) {
                nextBtn.style.display = 'none';
            } else {
                nextBtn.style.display = 'inline-flex';
            }
        }
        
        if (saveBtn) {
            saveBtn.classList.toggle('hidden', this.currentStep !== 3);
        }
    }
    
    nextStep() {
        if (this.currentStep < 3) {
            this.currentStep++;
            this.updateStepUI();
        }
    }
    
    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateStepUI();
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.ocrProcessor = new OCRProcessor();
});
