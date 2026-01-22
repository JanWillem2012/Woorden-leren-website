// Firebase configuratie
const firebaseConfig = {
    apiKey: "AIzaSyDummyKeyForExampleOnlyReplaceThis",
    authDomain: "woordenleren-app.firebaseapp.com",
    projectId: "woordenleren-app",
    storageBucket: "woordenleren-app.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abc123def456ghi789jkl"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const db = firebase.firestore();
const auth = firebase.auth();

// Firebase helper functies
const firebaseHelpers = {
    // Gebruiker opslaan in Firestore
    saveUserToFirestore: async (userId, userData) => {
        try {
            await db.collection('users').doc(userId).set({
                ...userData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            return true;
        } catch (error) {
            console.error("Fout bij opslaan gebruiker:", error);
            return false;
        }
    },
    
    // Woordenlijst uploaden
    uploadWordlist: async (userId, wordlistData) => {
        try {
            const wordlistRef = await db.collection('wordlists').add({
                ...wordlistData,
                userId: userId,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                wordCount: wordlistData.words.length,
                practiceCount: 0,
                lastPracticed: null
            });
            
            return wordlistRef.id;
        } catch (error) {
            console.error("Fout bij uploaden woordenlijst:", error);
            throw error;
        }
    },
    
    // Woordenlijsten ophalen voor gebruiker
    getUserWordlists: async (userId) => {
        try {
            const snapshot = await db.collection('wordlists')
                .where('userId', '==', userId)
                .orderBy('updatedAt', 'desc')
                .get();
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error("Fout bij ophalen woordenlijsten:", error);
            return [];
        }
    },
    
    // Woordenlijst verwijderen
    deleteWordlist: async (wordlistId) => {
        try {
            await db.collection('wordlists').doc(wordlistId).delete();
            return true;
        } catch (error) {
            console.error("Fout bij verwijderen woordenlijst:", error);
            return false;
        }
    },
    
    // Oefensessie opslaan
    savePracticeSession: async (userId, sessionData) => {
        try {
            const sessionRef = await db.collection('practiceSessions').add({
                ...sessionData,
                userId: userId,
                date: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Update woordstatistieken
            for (const wordResult of sessionData.wordResults) {
                await db.collection('wordStats').add({
                    userId: userId,
                    wordlistId: sessionData.wordlistId,
                    question: wordResult.question,
                    answer: wordResult.answer,
                    correct: wordResult.correct,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
            // Update woordenlijst statistieken
            await db.collection('wordlists').doc(sessionData.wordlistId).update({
                practiceCount: firebase.firestore.FieldValue.increment(1),
                lastPracticed: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            return sessionRef.id;
        } catch (error) {
            console.error("Fout bij opslaan oefensessie:", error);
            throw error;
        }
    },
    
    // Gebruikersvoortgang ophalen
    getUserProgress: async (userId) => {
        try {
            // Haal alle oefensessies op
            const sessionsSnapshot = await db.collection('practiceSessions')
                .where('userId', '==', userId)
                .orderBy('date', 'desc')
                .limit(10)
                .get();
            
            const sessions = sessionsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            // Haal woordstatistieken op
            const wordStatsSnapshot = await db.collection('wordStats')
                .where('userId', '==', userId)
                .get();
            
            const wordStats = wordStatsSnapshot.docs.map(doc => doc.data());
            
            // Bereken statistieken
            let totalWordsPracticed = 0;
            let totalCorrect = 0;
            let difficultWords = {};
            
            wordStats.forEach(stat => {
                totalWordsPracticed++;
                if (stat.correct) totalCorrect++;
                
                const wordKey = `${stat.question}|${stat.answer}`;
                if (!difficultWords[wordKey]) {
                    difficultWords[wordKey] = { correct: 0, total: 0 };
                }
                difficultWords[wordKey].total++;
                if (stat.correct) difficultWords[wordKey].correct++;
            });
            
            // Bereken moeilijke woorden (minder dan 50% correct)
            const difficultWordsList = Object.keys(difficultWords)
                .map(key => {
                    const [question, answer] = key.split('|');
                    const accuracy = (difficultWords[key].correct / difficultWords[key].total) * 100;
                    return {
                        question,
                        answer,
                        accuracy: Math.round(accuracy)
                    };
                })
                .filter(word => word.accuracy < 50)
                .sort((a, b) => a.accuracy - b.accuracy)
                .slice(0, 10);
            
            return {
                totalSessions: sessions.length,
                totalWordsPracticed,
                totalCorrect,
                overallAccuracy: totalWordsPracticed > 0 ? Math.round((totalCorrect / totalWordsPracticed) * 100) : 0,
                recentSessions: sessions,
                difficultWords: difficultWordsList
            };
        } catch (error) {
            console.error("Fout bij ophalen voortgang:", error);
            return {
                totalSessions: 0,
                totalWordsPracticed: 0,
                totalCorrect: 0,
                overallAccuracy: 0,
                recentSessions: [],
                difficultWords: []
            };
        }
    },
    
    // Woord moeilijkheidsgraad bijwerken
    updateWordDifficulty: async (userId, wordlistId, question, answer, difficulty) => {
        try {
            await db.collection('wordDifficulties').add({
                userId,
                wordlistId,
                question,
                answer,
                difficulty,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error("Fout bij bijwerken moeilijkheidsgraad:", error);
            return false;
        }
    }
};
