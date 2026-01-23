import { initializeClerk, showToast } from './auth.js';
import './wordlist-manager.js';
import './practice.js';
import './ocr-processor.js';

class WordLearningApp {
    constructor() {
        this.initialize();
    }
    
    initialize() {
        this.bindGlobalEvents();
        this.initializeModules();
        this.checkFirstVisit();
    }
    
    bindGlobalEvents() {
        // Handle clicks outside modals to close them
        document.addEventListener('click', (e) => {
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                    document.body.style.overflow = '';
                }
            });
        });
        
        // Handle Escape key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modals = document.querySelectorAll('.modal');
                modals.forEach(modal => {
                    if (modal.style.display === 'flex') {
                        modal.style.display = 'none';
                        document.body.style.overflow = '';
                    }
                });
            }
        });
        
        // Handle page refresh confirmation
        window.addEventListener('beforeunload', (e) => {
            // Check if there's unsaved data
            const wordlistModal = document.getElementById('wordlist-modal');
            if (wordlistModal && wordlistModal.style.display === 'flex') {
                e.preventDefault();
                e.returnValue = '';
                return '';
            }
        });
    }
    
    initializeModules() {
        // Modules are initialized in their own files
        console.log('Word Learning App initialized');
    }
    
    checkFirstVisit() {
        const firstVisit = !localStorage.getItem('appFirstVisit');
        if (firstVisit) {
            localStorage.setItem('appFirstVisit', 'true');
            
            // Show welcome message after a delay
            setTimeout(() => {
                if (clerk?.user) {
                    showToast(
                        `Welkom bij WordMaster, ${clerk.user.firstName || 'gebruiker'}!`,
                        'success'
                    );
                } else {
                    showToast(
                        'Welkom bij WordMaster! Log in om alle functies te gebruiken.',
                        'info'
                    );
                }
            }, 1000);
        }
    }
    
    // Global utility functions
    formatNumber(num) {
        return new Intl.NumberFormat('nl-NL').format(num);
    }
    
    formatDate(date) {
        return new Intl.DateTimeFormat('nl-NL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    }
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Initialize the app when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new WordLearningApp();
});

// Make helper functions globally available
window.showToast = showToast;

// Helper function to show loading state
window.showLoading = function(text = 'Laden...') {
    const overlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');
    
    if (overlay && loadingText) {
        loadingText.textContent = text;
        overlay.classList.remove('hidden');
    }
};

// Helper function to hide loading state
window.hideLoading = function() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
};

// Export for module usage
export { WordLearningApp };
