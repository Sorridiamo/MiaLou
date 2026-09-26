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

// FB_READY(callback) wird von app.js benutzt: der Callback läuft erst,
// wenn die anonyme Anmeldung durch ist (oder endgültig fehlgeschlagen ist).
// Parameter: true = angemeldet (Cloud nutzbar), false = nur localStorage.
// Sichtbare Versionsnummer: erscheint klein auf dem Startscreen. Damit sieht
// man sofort, ob der Browser wirklich die neue Fassung geladen hat oder noch
// eine alte aus dem Cache.
var APP_VERSION = 'v2.3';

// Diagnose: hier landet der letzte Verbindungsfehler in Klartext, damit er in
// der App angezeigt werden kann (statt nur in der Browser-Konsole).
var FB_DIAG = { status: 'startet…', code: '', detail: '' };

var FB_READY = (function () {
  var resolved = false;
  var result = false;
  var waiting = [];

  function done(ok) {
    if (resolved) return;
    resolved = true;
    result = ok;
    for (var i = 0; i < waiting.length; i++) {
      try { waiting[i](ok); } catch (e) { console.warn(e); }
    }
    waiting = [];
  }

  try {
    firebase.initializeApp(firebaseConfig);
  } catch (e) {
    // Firebase SDK nicht verfügbar (z.B. offline) — App läuft dann nur mit localStorage weiter
    console.warn('Firebase konnte nicht initialisiert werden:', e);
    FB_DIAG.status = 'Firebase-Start fehlgeschlagen';
    FB_DIAG.code = (e && e.code) || 'init-error';
    FB_DIAG.detail = (e && e.message) || String(e);
    done(false);
  }

  if (!resolved) {
    try {
      // Anonyme Anmeldung: unsichtbar für das Kind, sorgt aber dafür, dass die
      // Datenbank-Regeln auf "auth != null" stehen können und die Daten damit
      // nicht öffentlich lesbar sind.
      firebase.auth().onAuthStateChanged(function (user) {
        if (user) {
          FB_DIAG.status = 'angemeldet';
          FB_DIAG.code = '';
          FB_DIAG.detail = 'Anonyme Anmeldung erfolgreich.';
          done(true);
        }
      });
      firebase.auth().signInAnonymously().catch(function (err) {
        console.warn('Anonyme Anmeldung fehlgeschlagen:', err);
        FB_DIAG.status = 'Anmeldung fehlgeschlagen';
        FB_DIAG.code = (err && err.code) || 'auth-error';
        FB_DIAG.detail = (err && err.message) || String(err);
        done(false);
      });
      // Sicherheitsnetz: wenn nach 8 Sekunden nichts passiert ist,
      // startet die App offline weiter, statt hängen zu bleiben.
      setTimeout(function () {
        if (!resolved) {
          FB_DIAG.status = 'Zeitüberschreitung';
          FB_DIAG.code = 'timeout';
          FB_DIAG.detail = 'Keine Antwort von Firebase nach 8 Sekunden.';
        }
        done(false);
      }, 8000);
    } catch (e) {
      console.warn('Firebase Auth nicht verfügbar:', e);
      FB_DIAG.status = 'Anmeldedienst fehlt';
      FB_DIAG.code = (e && e.code) || 'auth-missing';
      FB_DIAG.detail = (e && e.message) || String(e);
      done(false);
    }
  }

  return function (cb) {
    if (typeof cb !== 'function') return;
    if (resolved) cb(result);
    else waiting.push(cb);
  };
})();
