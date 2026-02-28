import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBtW4BpxiEUOkscWS0POVSSmY57qFFemnQ",
  authDomain: "website-woorden-leren.firebaseapp.com",
  projectId: "website-woorden-leren",
  storageBucket: "website-woorden-leren.firebasestorage.app",
  messagingSenderId: "681548303319",
  appId: "1:681548303319:web:05030d3639ebfaabe11992",
  measurementId: "G-JQ7HP8CJ04"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);