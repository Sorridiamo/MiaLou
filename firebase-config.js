/* firebase-config.js — Firebase-Zugangsdaten für "Spielkiste"-Projekt */
var firebaseConfig = {
  apiKey: "AIzaSyCzfHxrb-aHKmKgDbdraQTA3bU5nY3qWZ8",
  authDomain: "spielkiste-cf598.firebaseapp.com",
  databaseURL: "https://spielkiste-cf598-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "spielkiste-cf598",
  storageBucket: "spielkiste-cf598.firebasestorage.app",
  messagingSenderId: "670276894484",
  appId: "1:670276894484:web:e5db431674bf66919c8c01"
};

try {
  firebase.initializeApp(firebaseConfig);
} catch (e) {
  // Firebase SDK nicht verfügbar (z.B. offline) — App läuft dann nur mit localStorage weiter
  console.warn('Firebase konnte nicht initialisiert werden:', e);
}
