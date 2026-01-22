// Clerk configuratie
const clerkPublishableKey = 'pk_test_dW1teS1rZXktZm9yLWV4YW1wbGUtb25seVJlcGxhY2VUaGlz';

// Initialize Clerk
const clerk = new Clerk(clerkPublishableKey);

// Wacht tot Clerk geladen is
clerk.load().then(() => {
    // Setup Clerk UI componenten
    if (clerk.user) {
        // Gebruiker is ingelogd
        setupUserUI();
        
        // Sla gebruiker op in Firebase
        saveUserToFirebase(clerk.user);
    } else {
        // Toon inlogknop
        setupSignInButton();
    }
    
    // Luister naar authenticatie state veranderingen
    clerk.addListener(({ user }) => {
        if (user) {
            setupUserUI();
            saveUserToFirebase(user);
        } else {
            setupSignInButton();
        }
    });
});

// Clerk helper functies
function setupSignInButton() {
    const signInDiv = document.getElementById('sign-in-button');
    const userProfileDiv = document.getElementById('user-profile');
    
    if (signInDiv) {
        signInDiv.innerHTML = '';
        const signInBtn = clerk.createSignInButton({
            appearance: {
                elements: {
                    rootBox: 'clerk-sign-in',
                    button: 'btn btn-primary'
                }
            }
        });
        signInDiv.appendChild(signInBtn);
    }
    
    if (userProfileDiv) {
        userProfileDiv.innerHTML = '';
    }
}

function setupUserUI() {
    const signInDiv = document.getElementById('sign-in-button');
    const userProfileDiv = document.getElementById('user-profile');
    
    if (signInDiv) {
        signInDiv.innerHTML = '';
    }
    
    if (userProfileDiv) {
        userProfileDiv.innerHTML = '';
        const userBtn = clerk.createUserButton({
            appearance: {
                elements: {
                    rootBox: 'clerk-user-button',
                    avatarBox: 'clerk-avatar',
                    userButtonTrigger: 'clerk-user-trigger'
                }
            }
        });
        userProfileDiv.appendChild(userBtn);
    }
    
    // Update UI voor ingelogde gebruiker
    updateUIForLoggedInUser();
}

function saveUserToFirebase(user) {
    const userData = {
        clerkId: user.id,
        email: user.primaryEmailAddress?.emailAddress || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        fullName: user.fullName || '',
        profileImageUrl: user.profileImageUrl || ''
    };
    
    firebaseHelpers.saveUserToFirestore(user.id, userData);
}

function updateUIForLoggedInUser() {
    // Laad gebruikersspecifieke data
    loadUserData();
    
    // Update UI elementen
    const authElements = document.querySelectorAll('.auth-required');
    authElements.forEach(el => {
        el.classList.remove('hidden');
    });
}

function loadUserData() {
    // Laad woordenlijsten voor gebruiker
    loadUserWordlists();
    
    // Laad voortgang voor gebruiker
    loadUserProgress();
}

// Firebase-Clerk integratie functies
async function getCurrentUserId() {
    if (clerk.user) {
        return clerk.user.id;
    }
    return null;
}

async function requireAuth() {
    if (!clerk.user) {
        // Toon inlogmodal als gebruiker niet is ingelogd
        clerk.openSignIn();
        return false;
    }
    return true;
}
