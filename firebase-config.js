// Firebase Configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { 
    getFirestore, 
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
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { 
    getAuth, 
    onAuthStateChanged,
    signOut 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js";

// Your Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBtW4BpxiEUOkscWS0POVSSmY57qFFemnQ",
    authDomain: "website-woorden-leren.firebaseapp.com",
    projectId: "website-woorden-leren",
    storageBucket: "website-woorden-leren.firebasestorage.app",
    messagingSenderId: "681548303319",
    appId: "1:681548303319:web:05030d3639ebfaabe11992",
    measurementId: "G-JQ7HP8CJ04"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Export Firebase services
export { 
    app, 
    db, 
    auth, 
    storage, 
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
    serverTimestamp,
    ref,
    uploadBytes,
    getDownloadURL,
    onAuthStateChanged,
    signOut 
};
