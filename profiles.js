/* profiles.js — Profil-System: Kinderprofile, Elternbereich, Admin
 *
 * DATENMODELL IN FIREBASE (additiv — bestehende Felder werden NIE umbenannt
 * oder gelöscht, damit App-Updates keine Daten verlieren):
 *
 *   profiles/<profileId>/          <- Spieldaten pro Kind
 *       name          : "Mia Lou"
 *       avatar        : "avatar_03"
 *       createdAt     : 1758830000000
 *       points        : 137
 *       ownedStickers : [...]
 *       placedStickers: {...}
 *       gameData      : { einmaleins_history: [...], ... }
 *       parentPin     : "<hash>"   <- Eltern-Passwort NUR für dieses Kind
 *
 *   admin/
 *       pin           : "<hash>"   <- Admin-Passwort (Zugriff auf alles)
 *
 * WICHTIG: 'profiles/default' ist das alte Profil aus der Zeit vor dem
 * Profil-System. Es wird beim ersten Start in ein echtes Kinderprofil
 * überführt (siehe migrateDefaultProfile), nie gelöscht.
 */

var PROFILES = (function () {
  'use strict';

  // === 30 Profilbilder ===
  var AVATARS = [];
  for (var a = 1; a <= 30; a++) {
    AVATARS.push('avatar_' + (a < 10 ? '0' + a : a));
  }

  var DEFAULT_PARENT_PIN = '1234'; // beim Anlegen eines Profils; Eltern ändern ihn
  var DEFAULT_ADMIN_PIN = '0000';

  var KEY_LAST_PROFILE = 'spielkiste_last_profile';
  var KEY_PROFILE_CACHE = 'spielkiste_profile_cache';
  var KEY_PIN_CACHE = 'spielkiste_pin_cache'; // lokaler Passwort-Cache (Fallback ohne Cloud)

  var profileList = {};      // { profileId: {name, avatar, createdAt} }
  var activeProfileId = null;
  var listReady = false;
  var pendingAvatar = null;
  var parentContextId = null; // welches Kind wird im Elternbereich gerade angezeigt
  var isAdmin = false;

  // === Hilfsfunktionen ===

  // Einfacher Hash — kein echter Krypto-Schutz, sondern verhindert nur,
  // dass das Passwort im Klartext in der Datenbank steht. Für einen
  // Kinder-Elternbereich ausreichend.
  function hashPin(pin) {
    var h = 5381;
    var s = 'spielkiste:' + String(pin);
    for (var i = 0; i < s.length; i++) {
      h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
    }
    return 'h' + h.toString(36);
  }

  function rootRef(path) {
    try {
      if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length) {
        return firebase.database().ref(path);
      }
    } catch (e) { console.warn('Firebase nicht verfügbar:', e); }
    return null;
  }

  // Diagnose: Lesefehler der Datenbank festhalten, damit sie in der App
  // sichtbar werden. Ohne das sieht man nur "geht nicht" ohne Grund.
  function noteDbError(where, err) {
    if (typeof FB_DIAG === 'undefined') return;
    FB_DIAG.status = 'Datenbank-Zugriff verweigert';
    FB_DIAG.code = (err && err.code) || 'db-error';
    FB_DIAG.detail = where + ': ' + ((err && err.message) || String(err));
    console.warn('Datenbank-Fehler bei ' + where + ':', err);
  }

  // Kurzer Verbindungsstatus als Text (für den Startscreen)
  function diagText() {
    if (typeof FB_DIAG === 'undefined') return '';
    if (FB_DIAG.status === 'angemeldet') return 'Cloud verbunden';
    var t = 'Cloud: ' + FB_DIAG.status;
    if (FB_DIAG.code) t += ' (' + FB_DIAG.code + ')';
    return t;
  }

  // === Cloud-Selbsttest ===
  // Prüft der Reihe nach: SDK geladen? angemeldet? lesen erlaubt? schreiben
  // erlaubt? Und liefert in Klartext, welcher Schritt scheitert. Damit muss
  // niemand mehr die Browser-Konsole öffnen.
  function cloudSelfTest(done) {
    var lines = [];
    function add(s) { lines.push(s); }
    function finish() { if (done) done(lines.join('\n')); }

    add('Version: ' + ((typeof APP_VERSION !== 'undefined') ? APP_VERSION : '?'));

    if (typeof firebase === 'undefined') {
      add('1. Firebase-SDK: NICHT geladen (kein Internet?)');
      finish(); return;
    }
    add('1. Firebase-SDK: geladen');

    var user = null;
    try { user = firebase.auth().currentUser; } catch (e) {}
    if (!user) {
      add('2. Anmeldung: FEHLT');
      add('   Grund: ' + ((typeof FB_DIAG !== 'undefined' ? FB_DIAG.detail : '') || 'unbekannt'));
      add('   Code: ' + ((typeof FB_DIAG !== 'undefined' ? FB_DIAG.code : '') || '—'));
      finish(); return;
    }
    add('2. Anmeldung: OK (anonym)');

    var readRef = rootRef('profiles');
    if (!readRef) { add('3. Lesen: keine Datenbank-Verbindung'); finish(); return; }

    var readDone = false;
    var readTimer = setTimeout(function () {
      if (readDone) return; readDone = true;
      add('3. Lesen: KEINE ANTWORT (Zeitüberschreitung)');
      add('   Prüfen: ist die Datenbank-Adresse richtig?');
      finish();
    }, 5000);

    readRef.once('value', function (snap) {
      if (readDone) return; readDone = true;
      clearTimeout(readTimer);
      var n = 0; snap.forEach(function () { n++; });
      add('3. Lesen: OK (' + n + ' Profile in der Cloud)');
      testWrite();
    }, function (err) {
      if (readDone) return; readDone = true;
      clearTimeout(readTimer);
      add('3. Lesen: VERWEIGERT');
      add('   Code: ' + ((err && err.code) || '—'));
      add('   Meldung: ' + ((err && err.message) || '—'));
      add('   Prüfen: Datenbank-Regeln (Realtime Database -> Regeln)');
      finish();
    });

    function testWrite() {
      var wRef = rootRef('diag/lastCheck');
      if (!wRef) { add('4. Schreiben: keine Verbindung'); finish(); return; }
      var wDone = false;
      var wTimer = setTimeout(function () {
        if (wDone) return; wDone = true;
        add('4. Schreiben: KEINE ANTWORT (Zeitueberschreitung)');
        finish();
      }, 5000);
      wRef.set(Date.now(), function (err) {
        if (wDone) return; wDone = true;
        clearTimeout(wTimer);
        if (err) {
          add('4. Schreiben: VERWEIGERT');
          add('   Code: ' + (err.code || '—'));
          add('   Meldung: ' + (err.message || '—'));
          add('   Prüfen: Datenbank-Regeln auf Schreibrechte');
        } else {
          add('4. Schreiben: OK');
          add('');
          add('Alles in Ordnung — die Cloud funktioniert.');
        }
        finish();
      });
    }
  }

  function newProfileId() {
    // Zeitbasiert + Zufall: eindeutig, gültig als Firebase-Key
    return 'p' + Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36);
  }

  // === Lokaler Passwort-Cache (Fallback, falls die Cloud mal nicht
  // erreichbar ist — z.B. Netzwerkproblem, Datenbank-Regeln, Offline).
  // Ohne diesen Cache würde ein Cloud-Ausfall den Eltern/Admin-Zugang
  // komplett blockieren. Wird bei jedem erfolgreichen Cloud-Zugriff aktuell
  // gehalten, ist also nie schlechter als die Cloud selbst.
  function loadPinCache() {
    try { return JSON.parse(localStorage.getItem(KEY_PIN_CACHE)) || {}; } catch (e) { return {}; }
  }
  function savePinCacheEntry(key, hash) {
    try {
      var cache = loadPinCache();
      cache[key] = hash;
      localStorage.setItem(KEY_PIN_CACHE, JSON.stringify(cache));
    } catch (e) {}
  }
  function getPinCacheEntry(key) {
    return loadPinCache()[key] || null;
  }

  function cacheList() {
    try { localStorage.setItem(KEY_PROFILE_CACHE, JSON.stringify(profileList)); } catch (e) {}
  }

  function loadCachedList() {
    try {
      var raw = localStorage.getItem(KEY_PROFILE_CACHE);
      if (raw) profileList = JSON.parse(raw) || {};
    } catch (e) { profileList = {}; }
  }

  // === Elternbereich direkt für das aktive Kind öffnen ===
  // Wird von der Kinderseite (Home) aus aufgerufen. Das Kind ist damit schon
  // bekannt, also blenden wir die Kind-Auswahl aus und fragen nur das Passwort.
  function openParentAreaForActive() {
    isAdmin = false;
    var activeId = APP.getActiveProfileId ? APP.getActiveProfileId() : null;
    parentContextId = activeId;
    setMsg('pl-msg', '');
    renderParentChildPicker();
    APP.goTo('parent-login');
  }

  // === Erstes Profil sicherstellen ===
  // Neues, leeres Firebase-Projekt hat keine Profile und kein Alt-Profil zum
  // Migrieren. Damit der Startscreen nie leer ist, legen wir dann Mia Lou an.
  function ensureFirstProfile(done) {
    var count = Object.keys(profileList).length;
    if (count > 0) { if (done) done(false); return; }
    migrateDefaultProfile(function (migrated) {
      if (migrated) { if (done) done(true); return; }
      // Kein Alt-Profil vorhanden -> Mia Lou anlegen
      createProfile('Mia Lou', AVATARS[0], DEFAULT_PARENT_PIN, function () {
        if (done) done(true);
      });
    });
  }

  // === Profilliste laden ===
  function initProfileList(callback) {
    loadCachedList();
    var ref = rootRef('profiles');
    if (!ref) {
      // Offline: nur mit dem lokalen Cache arbeiten
      listReady = true;
      if (callback) callback();
      return;
    }

    ref.on('value', function (snap) {
      var data = snap.val() || {};
      var next = {};
      for (var id in data) {
        if (!data.hasOwnProperty(id)) continue;
        if (id === 'default') continue; // altes Vor-Profil-System-Profil ausblenden
        next[id] = {
          name: data[id].name || 'Kind',
          avatar: data[id].avatar || AVATARS[0],
          createdAt: data[id].createdAt || 0
        };
      }
      profileList = next;
      cacheList();
      listReady = true;
      renderProfileSelect();
      if (callback) { callback(); callback = null; }
    }, function (err) {
      noteDbError('Profilliste lesen', err);
      listReady = true;
      renderProfileSelect();
      if (callback) { callback(); callback = null; }
    });
  }

  function getProfiles() { return profileList; }
  function getActiveProfileId() { return activeProfileId; }
  function getActiveProfile() {
    return activeProfileId ? profileList[activeProfileId] : null;
  }

  // === Profil auswählen ===
  function selectProfile(profileId) {
    activeProfileId = profileId;
    // Sicherheitsnetz: sobald ein Kind ausgewählt wird, ist die Admin-Vorschau aus.
    if (APP.setAdminPreview) APP.setAdminPreview(false);
    try { localStorage.setItem(KEY_LAST_PROFILE, profileId); } catch (e) {}
    // APP lädt jetzt die Daten dieses Kindes (Punkte, Sticker, Historie)
    APP.switchProfile(profileId);
    APP.goTo('home');
  }

  function getLastProfileId() {
    try { return localStorage.getItem(KEY_LAST_PROFILE); } catch (e) { return null; }
  }

  // === Profil anlegen (nur Eltern/Admin) ===
  function createProfile(name, avatar, parentPin, done) {
    name = String(name || '').trim();
    if (!name) { if (done) done(false, 'Bitte einen Namen eingeben.'); return; }
    if (name.length > 20) name = name.substring(0, 20);
    if (AVATARS.indexOf(avatar) < 0) avatar = AVATARS[0];

    var id = newProfileId();
    var record = {
      name: name,
      avatar: avatar,
      createdAt: Date.now(),
      points: 0,
      ownedStickers: [],
      placedStickers: {},
      gameData: {},
      parentPin: hashPin(parentPin || DEFAULT_PARENT_PIN)
    };

    profileList[id] = { name: name, avatar: avatar, createdAt: record.createdAt };
    cacheList();
    renderProfileSelect();

    var ref = rootRef('profiles/' + id);
    if (ref) {
      ref.set(record, function (err) {
        if (done) done(!err, err ? 'Speichern fehlgeschlagen.' : '', id);
      });
    } else {
      if (done) done(true, '', id);
    }
  }

  // === Profilbild ändern (darf das Kind selbst) ===
  // Ändert NUR das Bild — Punkte, Sticker und Statistiken bleiben unberührt,
  // weil gezielt nur der Schlüssel 'avatar' geschrieben wird.
  function setProfileAvatar(profileId, avatar, done) {
    if (!profileId || !profileList[profileId]) { if (done) done(false, 'Profil nicht gefunden.'); return; }
    if (AVATARS.indexOf(avatar) < 0) { if (done) done(false, 'Dieses Bild gibt es nicht.'); return; }

    // Sofort lokal übernehmen, damit es auch ohne Cloud gleich sichtbar ist.
    profileList[profileId].avatar = avatar;
    cacheList();
    renderProfileSelect();
    if (profileId === (APP.getActiveProfileId && APP.getActiveProfileId())) {
      if (APP.updateProfileHeader) APP.updateProfileHeader();
    }

    var ref = rootRef('profiles/' + profileId + '/avatar');
    if (!ref) { if (done) done(true, ''); return; }

    var finished = false;
    function finish(ok, msg) {
      if (finished) return;
      finished = true;
      if (done) done(ok, msg);
    }
    var timer = setTimeout(function () {
      noteDbError('Profilbild speichern', { code: 'timeout', message: 'Keine Antwort nach 4 Sekunden.' });
      finish(true, 'Gespeichert (bisher nur auf diesem Gerät).');
    }, 4000);

    ref.set(avatar, function (err) {
      clearTimeout(timer);
      if (err) {
        noteDbError('Profilbild speichern', err);
        finish(true, 'Gespeichert (bisher nur auf diesem Gerät).');
      } else {
        finish(true, '');
      }
    });
  }

  // === Profil löschen (nur Eltern/Admin) ===
  function deleteProfile(profileId, done) {
    delete profileList[profileId];
    cacheList();
    renderProfileSelect();
    if (activeProfileId === profileId) activeProfileId = null;

    var ref = rootRef('profiles/' + profileId);
    if (ref) {
      ref.remove(function (err) { if (done) done(!err); });
    } else if (done) { done(true); }
  }

  // === Passwort prüfen ===
  // Schutz gegen ein Hängenbleiben: liefert die Cloud innerhalb von 4 Sekunden
  // weder Antwort noch Fehler, wird automatisch lokal geprüft. Der Wrapper
  // stellt zusätzlich sicher, dass "done" garantiert nur einmal läuft.
  function guardedPinCheck(ref, cacheKey, pin, onValue, done) {
    var finished = false;
    function finish(ok, msg) {
      if (finished) return;
      finished = true;
      if (done) done(ok, msg);
    }
    var timer = setTimeout(function () {
      if (finished) return;
      noteDbError('Passwort lesen', { code: 'timeout', message: 'Keine Antwort nach 4 Sekunden.' });
      checkPinOffline(cacheKey, pin, finish);
    }, 4000);

    ref.once('value', function (snap) {
      clearTimeout(timer);
      if (finished) return;
      onValue(snap, finish);
    }, function (err) {
      clearTimeout(timer);
      if (finished) return;
      noteDbError('Passwort lesen', err);
      checkPinOffline(cacheKey, pin, finish);
    });
  }

  function checkParentPin(profileId, pin, done) {
    var cacheKey = 'parent_' + profileId;
    var ref = rootRef('profiles/' + profileId + '/parentPin');
    if (!ref) {
      checkPinOffline(cacheKey, pin, done);
      return;
    }
    guardedPinCheck(ref, cacheKey, pin, function (snap, finish) {
      var stored = snap.val();
      if (!stored) {
        // Noch kein Passwort gesetzt (z.B. migriertes Altprofil) -> Standard
        var ok = (pin === DEFAULT_PARENT_PIN) || (hashPin(pin) === getPinCacheEntry(cacheKey));
        if (ok) savePinCacheEntry(cacheKey, hashPin(pin === DEFAULT_PARENT_PIN ? DEFAULT_PARENT_PIN : pin));
        finish(ok, ok ? '' : 'Falsches Passwort.');
        return;
      }
      var match = (hashPin(pin) === stored);
      if (match) savePinCacheEntry(cacheKey, stored);
      finish(match, match ? '' : 'Falsches Passwort.');
    }, done);
  }

  // Fallback, wenn die Cloud nicht erreichbar ist: gegen den lokalen Cache
  // prüfen, oder — falls noch nie ein Passwort gecacht wurde — das
  // Standard-Passwort akzeptieren, damit niemand ausgesperrt wird.
  function checkPinOffline(cacheKey, pin, done) {
    var cached = getPinCacheEntry(cacheKey);
    if (cached) {
      var ok = (hashPin(pin) === cached);
      if (done) done(ok, ok ? '' : 'Falsches Passwort.');
      return;
    }
    var isDefault = (cacheKey.indexOf('admin_') === 0) ? (pin === DEFAULT_ADMIN_PIN) : (pin === DEFAULT_PARENT_PIN);
    if (isDefault) savePinCacheEntry(cacheKey, hashPin(pin));
    if (done) done(isDefault, isDefault ? '' : 'Keine Verbindung zur Datenbank — versuche es mit dem Standard-Passwort.');
  }

  function setParentPin(profileId, newPin, done) {
    if (!newPin || String(newPin).length < 4) {
      if (done) done(false, 'Das Passwort muss mindestens 4 Zeichen haben.');
      return;
    }
    var cacheKey = 'parent_' + profileId;
    var hash = hashPin(newPin);
    savePinCacheEntry(cacheKey, hash); // sofort lokal übernehmen, unabhängig von der Cloud
    var ref = rootRef('profiles/' + profileId + '/parentPin');
    if (!ref) { if (done) done(true, ''); return; }
    ref.set(hash, function (err) {
      if (done) done(!err, err ? 'Speichern fehlgeschlagen (lokal aber gesetzt).' : '');
    });
  }

  function checkAdminPin(pin, done) {
    var cacheKey = 'admin_pin';
    var ref = rootRef('admin/pin');
    if (!ref) {
      checkPinOffline(cacheKey, pin, done);
      return;
    }
    guardedPinCheck(ref, cacheKey, pin, function (snap, finish) {
      var stored = snap.val();
      if (!stored) {
        // Erster Start: Admin-Passwort existiert noch nicht -> Standard setzen
        if (pin === DEFAULT_ADMIN_PIN) {
          var h = hashPin(DEFAULT_ADMIN_PIN);
          ref.set(h);
          savePinCacheEntry(cacheKey, h);
          finish(true, '');
        } else { finish(false, 'Falsches Passwort.'); }
        return;
      }
      var ok = (hashPin(pin) === stored);
      if (ok) savePinCacheEntry(cacheKey, stored);
      finish(ok, ok ? '' : 'Falsches Passwort.');
    }, done);
  }

  function setAdminPin(newPin, done) {
    if (!newPin || String(newPin).length < 4) {
      if (done) done(false, 'Das Passwort muss mindestens 4 Zeichen haben.');
      return;
    }
    var hash = hashPin(newPin);
    savePinCacheEntry('admin_pin', hash);
    var ref = rootRef('admin/pin');
    if (!ref) { if (done) done(true, ''); return; }
    ref.set(hash, function (err) {
      if (done) done(!err, err ? 'Speichern fehlgeschlagen (lokal aber gesetzt).' : '');
    });
  }

  // === Punkte schenken (Eltern/Admin) ===
  // Die Punkte werden ZUERST lokal gutgeschrieben und gelten damit sofort.
  // Der Cloud-Schreibversuch läuft zusätzlich; schlägt er fehl, bleiben die
  // Punkte trotzdem erhalten (nur eben bis auf Weiteres nur auf diesem Gerät).
  function giftPoints(profileId, amount, done) {
    amount = parseInt(amount, 10);
    if (!amount || amount < 1) { if (done) done(false, 'Bitte eine Zahl grösser als 0 eingeben.'); return; }

    var localTotal = APP.addPointsTo ? APP.addPointsTo(profileId, amount) : null;

    var ref = rootRef('profiles/' + profileId + '/points');
    if (!ref) {
      if (done) done(true, 'Nur auf diesem Gerät gespeichert (keine Cloud-Verbindung).', localTotal);
      return;
    }

    var finished = false;
    function finish(ok, msg, total) {
      if (finished) return;
      finished = true;
      if (done) done(ok, msg, total);
    }
    // Zeitlimit: antwortet die Cloud nicht, gilt der lokale Stand.
    var timer = setTimeout(function () {
      noteDbError('Punkte schreiben', { code: 'timeout', message: 'Keine Antwort nach 4 Sekunden.' });
      finish(true, 'Nur auf diesem Gerät gespeichert (Cloud antwortet nicht).', localTotal);
    }, 4000);

    // Transaction: verhindert, dass parallele Änderungen sich überschreiben
    ref.transaction(function (current) {
      return (typeof current === 'number' ? current : 0) + amount;
    }, function (err, committed, snap) {
      clearTimeout(timer);
      if (err || !committed) {
        noteDbError('Punkte schreiben', err || { code: 'not-committed', message: 'Schreibvorgang abgewiesen.' });
        finish(true, 'Nur auf diesem Gerät gespeichert (Cloud verweigert den Zugriff).', localTotal);
        return;
      }
      // Cloud hat gewonnen: deren Stand ist maßgeblich.
      finish(true, '', snap ? snap.val() : localTotal);
    });
  }

  // === Geschenk senden (Eltern/Admin) ===
  // Anders als giftPoints(): die Punkte werden NICHT sofort gutgeschrieben,
  // sondern als "pendingGift" gespeichert. Das Kind sieht auf dem Home-Screen
  // ein Geschenk-Symbol und muss erst antippen, damit die Punkte in den
  // Gesamtstand wandern (siehe APP.claimGift()).
  function sendGift(profileId, amount, done) {
    amount = parseInt(amount, 10);
    if (!amount || amount < 1) { if (done) done(false, 'Bitte eine Zahl grösser als 0 eingeben.'); return; }

    var localTotal = APP.addPendingGiftTo ? APP.addPendingGiftTo(profileId, amount) : null;

    var ref = rootRef('profiles/' + profileId + '/pendingGift');
    if (!ref) {
      if (done) done(true, 'Nur auf diesem Gerät gespeichert (keine Cloud-Verbindung).', localTotal);
      return;
    }

    var finished = false;
    function finish(ok, msg, total) {
      if (finished) return;
      finished = true;
      if (done) done(ok, msg, total);
    }
    var timer = setTimeout(function () {
      noteDbError('Geschenk schreiben', { code: 'timeout', message: 'Keine Antwort nach 4 Sekunden.' });
      finish(true, 'Nur auf diesem Gerät gespeichert (Cloud antwortet nicht).', localTotal);
    }, 4000);

    ref.transaction(function (current) {
      return (typeof current === 'number' ? current : 0) + amount;
    }, function (err, committed, snap) {
      clearTimeout(timer);
      if (err || !committed) {
        noteDbError('Geschenk schreiben', err || { code: 'not-committed', message: 'Schreibvorgang abgewiesen.' });
        finish(true, 'Nur auf diesem Gerät gespeichert (Cloud verweigert den Zugriff).', localTotal);
        return;
      }
      finish(true, '', snap ? snap.val() : localTotal);
    });
  }

  // === Migration: altes 'default'-Profil in ein echtes Kinderprofil ===
  // Wird genau einmal ausgeführt, wenn es noch keine Profile gibt, aber
  // unter 'profiles/default' bereits Punkte/Sticker liegen.
  function migrateDefaultProfile(done) {
    var ref = rootRef('profiles/default');
    if (!ref) { if (done) done(false); return; }
    ref.once('value', function (snap) {
      var old = snap.val();
      if (!old || (!old.points && !(old.ownedStickers || []).length && !old.gameData)) {
        if (done) done(false);
        return;
      }
      var id = newProfileId();
      var record = {
        name: 'Mia Lou',
        avatar: AVATARS[0],
        createdAt: old.createdAt || Date.now(),
        points: typeof old.points === 'number' ? old.points : 0,
        ownedStickers: old.ownedStickers || [],
        placedStickers: old.placedStickers || {},
        gameData: old.gameData || {},
        parentPin: hashPin(DEFAULT_PARENT_PIN)
      };
      rootRef('profiles/' + id).set(record, function () {
        // 'default' wird NICHT gelöscht — Sicherheitsnetz, falls etwas schiefgeht
        if (done) done(true, id);
      });
    }, function () { if (done) done(false); });
  }

  // =====================================================================
  // === UI ==============================================================
  // =====================================================================

  function avatarSrc(avatarId) {
    if (typeof resolveImg === 'function') return resolveImg('images/' + avatarId + '.png');
    return 'images/' + avatarId + '.png';
  }

  // --- Startscreen: Profilauswahl ---
  function renderProfileSelect() {
    var grid = document.getElementById('profile-grid');
    if (!grid) return;
    grid.innerHTML = '';

    var ids = Object.keys(profileList).sort(function (x, y) {
      return (profileList[x].createdAt || 0) - (profileList[y].createdAt || 0);
    });

    if (ids.length === 0) {
      var empty = document.createElement('p');
      empty.className = 'profile-empty';
      empty.textContent = 'Noch keine Profile. Die Eltern können unten ein Profil anlegen.';
      grid.appendChild(empty);
    }

    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      var p = profileList[id];
      var card = document.createElement('div');
      card.className = 'profile-card';
      card.innerHTML = '<img src="' + avatarSrc(p.avatar) + '" alt=""><span>' + escapeHtml(p.name) + '</span>';
      card.onclick = (function (pid) { return function () { selectProfile(pid); }; })(id);
      grid.appendChild(card);
    }

    renderVersionLine();
  }

  // Kleine Zeile unten am Startscreen: Version + Cloud-Status.
  // Zweck: sofort erkennen, ob der Browser die neue Fassung geladen hat und
  // ob die Cloud-Verbindung steht — ohne Browser-Konsole.
  var diagTimer = null;
  function renderVersionLine() {
    var el = document.getElementById('version-line');
    if (!el) return;
    var v = (typeof APP_VERSION !== 'undefined') ? APP_VERSION : '?';
    var d = diagText();
    el.textContent = v + (d ? ' · ' + d : '');
    el.title = 'Antippen für den Cloud-Test';

    el.className = 'version-line' +
      (d === 'Cloud verbunden' ? ' version-ok' : (d ? ' version-bad' : ''));
    el.onclick = function () {
      el.textContent = v + ' · teste Cloud…';
      cloudSelfTest(function (report) {
        alert(report);
        renderVersionLine();
      });
    };

    // Der Cloud-Status trifft erst ein paar Sekunden später ein (Anmeldung
    // läuft asynchron). Darum die Zeile kurz nachziehen, bis der Status steht.
    if (!diagTimer) {
      var ticks = 0;
      diagTimer = setInterval(function () {
        ticks++;
        var t = diagText();
        if (ticks > 12 || t === 'Cloud verbunden') {
          clearInterval(diagTimer);
          diagTimer = null;
        }
        var e2 = document.getElementById('version-line');
        if (e2) {
          e2.textContent = v + (t ? ' · ' + t : '');
          e2.className = 'version-line' +
            (t === 'Cloud verbunden' ? ' version-ok' : (t ? ' version-bad' : ''));
        }
      }, 1000);
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // --- Neues Profil anlegen ---
  // Merkt sich, von wo aus geöffnet wurde, damit "Zurück" nicht erneut
  // nach dem Passwort fragt.
  var newProfileOrigin = 'admin';

  function openNewProfile() {
    newProfileOrigin = isAdmin ? 'admin' : 'parent';
    pendingAvatar = AVATARS[0];
    var nameInput = document.getElementById('np-name');
    if (nameInput) nameInput.value = '';
    setMsg('np-msg', '');
    renderAvatarPicker();
    APP.goTo('new-profile');
  }

  function cancelNewProfile() {
    if (newProfileOrigin === 'parent' && parentContextId) {
      openParentDashboard(parentContextId);
    } else if (isAdmin) {
      openAdminDashboard();
    } else {
      backToProfileSelect();
    }
  }

  function renderAvatarPicker(gridId) {
    var grid = document.getElementById(gridId || 'np-avatars');
    if (!grid) return;
    grid.innerHTML = '';
    for (var i = 0; i < AVATARS.length; i++) {
      var av = AVATARS[i];
      var div = document.createElement('div');
      div.className = 'avatar-option' + (av === pendingAvatar ? ' selected' : '');
      div.setAttribute('data-av', av);
      div.innerHTML = '<img src="' + avatarSrc(av) + '" alt="">';
      div.onclick = (function (a) { return function () { pickAvatar(a); }; })(av);
      grid.appendChild(div);
    }
  }

  function pickAvatar(av) {
    pendingAvatar = av;
    var opts = document.querySelectorAll('.avatar-option');
    for (var i = 0; i < opts.length; i++) {
      if (opts[i].getAttribute('data-av') === av) opts[i].classList.add('selected');
      else opts[i].classList.remove('selected');
    }
  }

  // --- Mein Bild: das Kind wählt selbst sein Profilbild ---
  // Kein Passwort nötig — es kann dabei nichts kaputtgehen, weil nur der
  // Schlüssel 'avatar' geändert wird. Punkte und Sticker bleiben unberührt.
  function openMyAvatar() {
    var id = APP.getActiveProfileId ? APP.getActiveProfileId() : null;
    if (!id || !profileList[id]) { backToProfileSelect(); return; }
    pendingAvatar = profileList[id].avatar || AVATARS[0];
    setMsg('ma-msg', '');
    var title = document.getElementById('ma-title');
    if (title) title.textContent = 'Mein Bild';
    renderAvatarPicker('ma-avatars');
    APP.goTo('my-avatar');
  }

  function saveMyAvatar() {
    var id = APP.getActiveProfileId ? APP.getActiveProfileId() : null;
    if (!id) { backToProfileSelect(); return; }
    setProfileAvatar(id, pendingAvatar, function (ok, msg) {
      if (!ok) { setMsg('ma-msg', msg || 'Konnte nicht gespeichert werden.'); return; }
      setMsg('ma-msg', msg ? ('Gespeichert. ' + msg) : 'Gespeichert!', true);
      // Kurz die Bestätigung zeigen, dann zurück zum Spielen.
      setTimeout(function () { APP.goTo('home'); }, 900);
    });
  }

  function submitNewProfile() {
    var name = (document.getElementById('np-name') || {}).value || '';
    if (!String(name).trim()) { setMsg('np-msg', 'Bitte einen Namen eingeben.'); return; }
    createProfile(name, pendingAvatar, DEFAULT_PARENT_PIN, function (ok, err) {
      if (ok) {
        setMsg('np-msg', '');
        if (isAdmin) openAdminDashboard();
        else APP.goTo('profile-select');
      } else {
        setMsg('np-msg', err || 'Profil konnte nicht angelegt werden.');
      }
    });
  }

  // --- Elternbereich: erst Kind wählen, dann Passwort ---
  function openParentArea() {
    isAdmin = false;
    parentContextId = null;
    setMsg('pl-msg', '');
    renderParentChildPicker();
    APP.goTo('parent-login');
  }

  function renderParentChildPicker() {
    var grid = document.getElementById('pl-children');
    if (!grid) return;
    grid.innerHTML = '';
    var ids = Object.keys(profileList);
    if (ids.length === 0) {
      grid.innerHTML = '<p class="profile-empty">Noch keine Profile vorhanden.</p>';
      return;
    }
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      var p = profileList[id];
      var card = document.createElement('div');
      card.className = 'profile-card profile-card-sm' + (id === parentContextId ? ' selected' : '');
      card.setAttribute('data-pid', id);
      card.innerHTML = '<img src="' + avatarSrc(p.avatar) + '" alt=""><span>' + escapeHtml(p.name) + '</span>';
      card.onclick = (function (pid) { return function () { pickParentChild(pid); }; })(id);
      grid.appendChild(card);
    }
  }

  function pickParentChild(pid) {
    parentContextId = pid;
    var cards = document.querySelectorAll('#pl-children .profile-card');
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].getAttribute('data-pid') === pid) cards[i].classList.add('selected');
      else cards[i].classList.remove('selected');
    }
  }

  function submitParentLogin() {
    if (!parentContextId) { setMsg('pl-msg', 'Bitte zuerst das Kind auswählen.'); return; }
    var pin = (document.getElementById('pl-pin') || {}).value || '';
    checkParentPin(parentContextId, pin, function (ok, err) {
      if (ok) {
        var el = document.getElementById('pl-pin'); if (el) el.value = '';
        setMsg('pl-msg', '');
        isAdmin = false;
        openParentDashboard(parentContextId);
      } else {
        setMsg('pl-msg', err || 'Falsches Passwort.');
      }
    });
  }

  // --- Admin-Login ---
  function openAdminLogin() {
    setMsg('al-msg', '');
    APP.goTo('admin-login');
  }

  function submitAdminLogin() {
    var pin = (document.getElementById('al-pin') || {}).value || '';
    checkAdminPin(pin, function (ok, err) {
      if (ok) {
        var el = document.getElementById('al-pin'); if (el) el.value = '';
        setMsg('al-msg', '');
        isAdmin = true;
        openAdminDashboard();
      } else {
        setMsg('al-msg', err || 'Falsches Passwort.');
      }
    });
  }

  function openAdminDashboard() {
    renderAdminList();
    updateWorldPreviewBtn();
    APP.goTo('admin');
  }

  function renderAdminList() {
    var box = document.getElementById('admin-children');
    if (!box) return;
    box.innerHTML = '';
    var ids = Object.keys(profileList);
    if (ids.length === 0) {
      box.innerHTML = '<p class="profile-empty">Noch keine Profile vorhanden.</p>';
      return;
    }
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      var p = profileList[id];
      var row = document.createElement('div');
      row.className = 'admin-row';
      row.innerHTML = '<img src="' + avatarSrc(p.avatar) + '" alt="">' +
                      '<span class="admin-name">' + escapeHtml(p.name) + '</span>';
      var openBtn = document.createElement('button');
      openBtn.className = 'small-btn';
      openBtn.textContent = 'Öffnen';
      openBtn.onclick = (function (pid) {
        return function () { parentContextId = pid; openParentDashboard(pid); };
      })(id);
      var delBtn = document.createElement('button');
      delBtn.className = 'small-btn small-btn-danger';
      delBtn.textContent = 'Löschen';
      delBtn.onclick = (function (pid, pname) {
        return function () {
          if (confirm('Profil "' + pname + '" wirklich löschen? Alle Punkte und Sticker gehen verloren.')) {
            deleteProfile(pid, function () { renderAdminList(); });
          }
        };
      })(id, p.name);
      row.appendChild(openBtn);
      row.appendChild(delBtn);
      box.appendChild(row);
    }
  }

  // --- Eltern-Dashboard (Statistik, Punkte schenken, Passwort) ---
  function openParentDashboard(profileId) {
    parentContextId = profileId;
    var p = profileList[profileId];
    var title = document.getElementById('pd-title');
    if (title && p) title.textContent = 'Elternbereich — ' + p.name;
    var avatarEl = document.getElementById('pd-avatar');
    if (avatarEl && p) avatarEl.src = avatarSrc(p.avatar);

    // Admin darf zusätzlich löschen
    var delWrap = document.getElementById('pd-delete-wrap');
    if (delWrap) {
      if (isAdmin) delWrap.classList.remove('hidden');
      else delWrap.classList.add('hidden');
    }

    setMsg('pd-gift-msg', '');
    setMsg('pd-pin-msg', '');
    var g = document.getElementById('pd-gift-amount'); if (g) g.value = '';
    var n1 = document.getElementById('pd-new-pin'); if (n1) n1.value = '';

    STATS.render(profileId);
    APP.goTo('parent-dashboard');
  }

  function submitGift() {
    if (!parentContextId) return;
    var amount = (document.getElementById('pd-gift-amount') || {}).value || '';
    sendGift(parentContextId, amount, function (ok, err, newPending) {
      if (ok) {
        // err ist hier kein Fehler, sondern ggf. ein Hinweis ("nur lokal").
        var txt = 'Geschenkt! Das Kind sieht jetzt ein Geschenk-Symbol (wartet: ' + newPending + ' Punkte).';
        if (err) txt += ' Hinweis: ' + err;
        setMsg('pd-gift-msg', txt, true);
        var g = document.getElementById('pd-gift-amount'); if (g) g.value = '';
        // Falls das Kind gerade aktiv ist, Geschenk-Symbol sofort anzeigen
        if (APP.getActiveProfileId && APP.getActiveProfileId() === parentContextId) {
          APP.updatePointsDisplays();
        }
      } else {
        setMsg('pd-gift-msg', err || 'Geschenk konnte nicht gespeichert werden.');
      }
    });
  }

  function submitNewPin() {
    if (!parentContextId) return;
    var pin = (document.getElementById('pd-new-pin') || {}).value || '';
    setParentPin(parentContextId, pin, function (ok, err) {
      if (ok) {
        setMsg('pd-pin-msg', 'Passwort geändert.', true);
        var el = document.getElementById('pd-new-pin'); if (el) el.value = '';
      } else {
        setMsg('pd-pin-msg', err || 'Passwort konnte nicht geändert werden.');
      }
    });
  }

  function submitAdminPinChange() {
    var pin = (document.getElementById('ad-new-pin') || {}).value || '';
    setAdminPin(pin, function (ok, err) {
      if (ok) {
        setMsg('ad-pin-msg', 'Admin-Passwort geändert.', true);
        var el = document.getElementById('ad-new-pin'); if (el) el.value = '';
      } else {
        setMsg('ad-pin-msg', err || 'Passwort konnte nicht geändert werden.');
      }
    });
  }

  function deleteFromDashboard() {
    if (!parentContextId) return;
    var p = profileList[parentContextId];
    if (!p) return;
    if (!confirm('Profil "' + p.name + '" wirklich löschen? Alle Punkte und Sticker gehen verloren.')) return;
    deleteProfile(parentContextId, function () {
      parentContextId = null;
      APP.goTo('profile-select');
    });
  }

  function setMsg(id, text, good) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = text || '';
    el.className = 'form-msg' + (text ? (good ? ' form-msg-good' : ' form-msg-bad') : '');
  }

  function backToProfileSelect() {
    isAdmin = false;
    parentContextId = null;
    // Vorschau beenden: ab hier kann wieder ein Kind spielen.
    if (APP.setAdminPreview) APP.setAdminPreview(false);
    APP.goTo('profile-select');
  }

  function getParentContextId() { return parentContextId; }
  function isAdminSession() { return isAdmin; }

  // --- Welten-Vorschau für den Admin ---
  // Schaltet die vier Belohnungs-Welten nur für die laufende Sitzung frei, damit
  // man sie anschauen und gestalten kann. Absichtlich nichts gespeichert: nach
  // einem Neuladen ist die Vorschau wieder aus. Die Punkte des Kindes werden
  // nicht angefasst, die Welten bleiben für das Kind gesperrt.
  function updateWorldPreviewBtn() {
    var btn = document.getElementById('ad-preview-btn');
    if (!btn) return;
    var on = !!(APP.isAdminPreview && APP.isAdminPreview());
    btn.textContent = on ? 'Vorschau ausschalten' : 'Vorschau einschalten';
  }

  function toggleWorldPreview() {
    if (!isAdmin) return;          // nur im Admin-Bereich
    if (!APP.setAdminPreview) return;
    APP.setAdminPreview(!(APP.isAdminPreview && APP.isAdminPreview()));
    updateWorldPreviewBtn();
  }

  function openWorldPreview() {
    if (!isAdmin) return;
    // Bequemlichkeit: wer "Welten ansehen" drückt, will sie auch offen sehen.
    if (APP.setAdminPreview) APP.setAdminPreview(true);
    updateWorldPreviewBtn();
    APP.goTo('worlds');
  }

  return {
    AVATARS: AVATARS,
    initProfileList: initProfileList,
    getProfiles: getProfiles,
    getActiveProfileId: getActiveProfileId,
    getActiveProfile: getActiveProfile,
    getLastProfileId: getLastProfileId,
    selectProfile: selectProfile,
    renderProfileSelect: renderProfileSelect,
    migrateDefaultProfile: migrateDefaultProfile,
    ensureFirstProfile: ensureFirstProfile,
    // UI-Handler (aus index.html aufgerufen)
    openNewProfile: openNewProfile,
    cancelNewProfile: cancelNewProfile,
    submitNewProfile: submitNewProfile,
    openParentArea: openParentArea,
    openParentAreaForActive: openParentAreaForActive,
    // Profilbild durch das Kind selbst
    openMyAvatar: openMyAvatar,
    saveMyAvatar: saveMyAvatar,
    setProfileAvatar: setProfileAvatar,
    submitParentLogin: submitParentLogin,
    openAdminLogin: openAdminLogin,
    submitAdminLogin: submitAdminLogin,
    openAdminDashboard: openAdminDashboard,
    openParentDashboard: openParentDashboard,
    submitGift: submitGift,
    submitNewPin: submitNewPin,
    submitAdminPinChange: submitAdminPinChange,
    deleteFromDashboard: deleteFromDashboard,
    backToProfileSelect: backToProfileSelect,
    getParentContextId: getParentContextId,
    isAdminSession: isAdminSession,
    toggleWorldPreview: toggleWorldPreview,
    openWorldPreview: openWorldPreview
  };
})();
