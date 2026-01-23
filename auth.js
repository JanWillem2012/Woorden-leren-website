import { auth, onAuthStateChanged, signOut } from './firebase-config.js';

// Clerk Configuration
const clerkPublishableKey = 'pk_test_bm9ibGUtZmVsaW5lLTgxLmNsZXJrLmFjY291bnRzLmRldiQ';

// Initialize Clerk
let clerk;

async function initializeClerk() {
    try {
        // Load Clerk
        if (window.Clerk) {
            clerk = window.Clerk;
            await clerk.load({
                publishableKey: clerkPublishableKey,
                afterSignOutUrl: window.location.href
            });
            
            // Setup Clerk UI
            setupClerkUI();
            
            // Handle authentication state changes
            clerk.addListener(({ user }) => {
                if (user) {
                    handleUserSignedIn(user);
                } else {
                    handleUserSignedOut();
                }
            });
            
            // Check if user is already signed in
            if (clerk.user) {
                handleUserSignedIn(clerk.user);
            }
        }
    } catch (error) {
        console.error('Error initializing Clerk:', error);
        showToast('Kan authenticatie niet laden. Herlaad de pagina.', 'error');
    }
}

function setupClerkUI() {
    const userButtonContainer = document.getElementById('user-button');
    const authContainer = document.getElementById('clerk-auth-container');
    
    if (userButtonContainer && clerk) {
        clerk.mountUserButton(userButtonContainer, {
            afterSignOutUrl: window.location.href
        });
    }
    
    // Hide auth container once Clerk is loaded
    if (authContainer && clerk.user) {
        authContainer.style.display = 'none';
    }
}

function handleUserSignedIn(user) {
    console.log('User signed in:', user);
    
    // Hide auth container
    const authContainer = document.getElementById('clerk-auth-container');
    if (authContainer) {
        authContainer.style.display = 'none';
    }
    
    // Update UI for signed in user
    updateUIForUser(user);
    
    // Store user data in localStorage
    localStorage.setItem('user', JSON.stringify({
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName
    }));
    
    // Show welcome message
    const welcomeMessage = document.getElementById('welcome-message');
    if (welcomeMessage) {
        welcomeMessage.textContent = `Welkom terug, ${user.firstName || 'gebruiker'}!`;
    }
    
    // Load user data
    loadUserData();
}

function handleUserSignedOut() {
    console.log('User signed out');
    
    // Clear localStorage
    localStorage.removeItem('user');
    
    // Show auth container
    const authContainer = document.getElementById('clerk-auth-container');
    if (authContainer) {
        authContainer.style.display = 'flex';
    }
    
    // Reset UI
    updateUIForUser(null);
    
    // Show sign in message
    const welcomeMessage = document.getElementById('welcome-message');
    if (welcomeMessage) {
        welcomeMessage.textContent = 'Log in om je woordenlijsten te beheren en te oefenen!';
    }
}

function updateUIForUser(user) {
    const authElements = document.querySelectorAll('[data-auth-only]');
    const unauthElements = document.querySelectorAll('[data-unauth-only]');
    
    if (user) {
        // User is signed in
        authElements.forEach(el => el.style.display = '');
        unauthElements.forEach(el => el.style.display = 'none');
    } else {
        // User is signed out
        authElements.forEach(el => el.style.display = 'none');
        unauthElements.forEach(el => el.style.display = '');
    }
}

async function loadUserData() {
    try {
        // Load user's wordlists, stats, etc.
        // This will be implemented in other modules
        console.log('Loading user data...');
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'warning') icon = '⚠️';
    
    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    // Remove toast after 5 seconds
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

// Export functions
export { 
    initializeClerk, 
    showToast, 
    clerk 
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeClerk);
