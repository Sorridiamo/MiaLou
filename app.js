/* app.js — Navigation, Points, Worlds, Shop, Sticker Drag */

var APP = (function() {
  'use strict';

  // === All 76 sticker IDs ===
  var STICKER_IDS = [
    'cat','bunny','tulip','sunflower','butterfly','mushroom','frog','ladybug','deer','blossom',
    'bird','apple','snail','rainbow','star','owl','fox','hedgehog','squirrel','bee',
    'pig','sheep','cow','horse','duck','rooster','fish','turtle','octopus','dolphin',
    'jellyfish','crab','seahorse','whale','starfish','rose','daisy','lavender','clover','cactus',
    'pinetree','oaktree','fairyhouse','fern','palmtree','fence','birdhouse','bridge','boat','lighthouse',
    'barn','windmill','cloud','sun','moon','strawberry','watermelon','cupcake','icecream','lollipop',
    'balloon','kite','treasure','crown','wand','fairy','crystal','cabin','goat','edelweiss',
    'marmot','eagle','wateringcan','gnome','dragonfly','swing'
  ];

  var STICKER_NAMES = {
    cat:'Katze', bunny:'Hase', tulip:'Tulpe', sunflower:'Sonnenblume', butterfly:'Schmetterling',
    mushroom:'Pilz', frog:'Frosch', ladybug:'Marienkäfer', deer:'Reh', blossom:'Blüte',
    bird:'Vogel', apple:'Apfel', snail:'Schnecke', rainbow:'Regenbogen', star:'Stern',
    owl:'Eule', fox:'Fuchs', hedgehog:'Igel', squirrel:'Eichhörnchen', bee:'Biene',
    pig:'Schwein', sheep:'Schaf', cow:'Kuh', horse:'Pferd', duck:'Ente',
    rooster:'Hahn', fish:'Fisch', turtle:'Schildkröte', octopus:'Krake', dolphin:'Delfin',
    jellyfish:'Qualle', crab:'Krabbe', seahorse:'Seepferdchen', whale:'Wal', starfish:'Seestern',
    rose:'Rose', daisy:'Gänseblümchen', lavender:'Lavendel', clover:'Kleeblatt', cactus:'Kaktus',
    pinetree:'Tanne', oaktree:'Eiche', fairyhouse:'Feenhaus', fern:'Farn', palmtree:'Palme',
    fence:'Zaun', birdhouse:'Vogelhaus', bridge:'Brücke', boat:'Boot', lighthouse:'Leuchtturm',
    barn:'Scheune', windmill:'Windmühle', cloud:'Wolke', sun:'Sonne', moon:'Mond',
    strawberry:'Erdbeere', watermelon:'Wassermelone', cupcake:'Cupcake', icecream:'Eis', lollipop:'Lolli',
    balloon:'Ballon', kite:'Drache', treasure:'Schatz', crown:'Krone', wand:'Zauberstab',
    fairy:'Fee', crystal:'Kristall', cabin:'Hütte', goat:'Ziege', edelweiss:'Edelweiss',
    marmot:'Murmeltier', eagle:'Adler', wateringcan:'Giesskanne', gnome:'Zwerg', dragonfly:'Libelle',
    swing:'Schaukel'
  };

  var WORLDS = ['forest','ocean','farm','mountain','village','circus','park','castle','veggie','space'];
  var WORLD_NAMES = { forest:'Wald', ocean:'Meer', farm:'Bauernhof', mountain:'Berge', village:'Dorf', circus:'Zirkus',
                      park:'Freizeitpark', castle:'Schloss', veggie:'Gemüsegarten', space:'Weltall' };

  // === Welten, die erst ab einer Punktzahl aufgehen ===
  // Gezählt wird der Lebenszeit-Punktestand (totalEarned): auch Punkte, die
  // schon für Sticker ausgegeben wurden, zählen mit. Eine Welt geht also auf
  // und bleibt für immer offen — sie kann nicht wieder verschwinden.
  // Neue Belohnungswelt: hier eine Zeile ergänzen, Bild images/world_<id>.png
  // ablegen und in index.html eine Karte mit data-world="<id>" einfügen.
  var LOCKED_WORLDS = [
    { id: 'park',   name: 'Freizeitpark',  need: 500 },
    { id: 'castle', name: 'Schloss',       need: 1000 },
    { id: 'veggie', name: 'Gemüsegarten',  need: 1500 },
    { id: 'space',  name: 'Weltall',       need: 2000 }
  ];

  function isWorldUnlocked(worldId) {
    // Admin-Vorschau: alles offen, damit man die Welten anschauen und
    // gestalten kann, ohne Punkte zu sammeln. Ändert NICHTS an totalEarned —
    // beim Kind bleiben die Welten genau so gesperrt wie vorher.
    if (adminPreview) return true;
    for (var i = 0; i < LOCKED_WORLDS.length; i++) {
      if (LOCKED_WORLDS[i].id === worldId) return totalEarned >= LOCKED_WORLDS[i].need;
    }
    return true;   // alle übrigen Welten sind von Anfang an offen
  }

  // === Admin-Vorschau ===
  // Wird nur im Admin-Bereich eingeschaltet und gilt für die laufende Sitzung.
  // Absichtlich NICHT in localStorage oder der Cloud gespeichert: nach dem
  // Neuladen ist sie wieder aus, damit das Kind sie nie versehentlich erbt.
  var adminPreview = false;

  function setAdminPreview(on) {
    adminPreview = !!on;
    if (document.getElementById('worlds-screen')) renderWorlds();
  }
  function isAdminPreview() { return adminPreview; }

  var PRIZE_COST = 25;

  // === LocalStorage keys (prefixed) — dienen als Offline-Cache ===
  // Die Keys werden pro Profil erweitert (z.B. 'spielkiste_points__p1abc'),
  // damit mehrere Kinder auf demselben Gerät sich nicht überschreiben.
  var KEY_POINTS = 'spielkiste_points';
  var KEY_OWNED = 'spielkiste_owned_stickers';
  var KEY_PLACED = 'spielkiste_placed_stickers';
  var KEY_PENDING_GIFT = 'spielkiste_pending_gift'; // ungeöffnetes Geschenk (Punkte von den Eltern)
  // Lebenszeit-Summe aller je verdienten Punkte. Wird NIE kleiner — auch nicht,
  // wenn Punkte für Sticker ausgegeben werden. Steuert die Belohnungswelten.
  var KEY_TOTAL_EARNED = 'spielkiste_total_earned';

  // === Cloud sync (Firebase Realtime Database) ===
  // Jedes Kind hat seinen eigenen Zweig 'profiles/<profileId>'.
  // PROFILE_ID wird von PROFILES.selectProfile() über switchProfile() gesetzt.
  var PROFILE_ID = null;
  var dbRef = null;
  var cloudListener = null;      // aktiver Firebase-Listener, damit wir ihn abmelden können
  var cloudReady = false;
  var suppressNextWrite = false; // verhindert Echo-Schreiben beim Empfang eines Cloud-Updates

  // Profilbezogener localStorage-Key
  function pk(base) {
    return PROFILE_ID ? (base + '__' + PROFILE_ID) : base;
  }

  // === Datum und Zeit: immer Schweizer Zeit ===
  // Wichtig: die App läuft auch auf Geräten, deren Zeitzone auf UTC oder auf
  // ein anderes Land gesetzt ist (oder in der Cloud). Dann stand in der
  // Statistik z.B. 05:17 statt 07:17. Darum wird hier bewusst nicht die
  // Gerätezeit genommen, sondern explizit Europe/Zurich — inklusive
  // Sommerzeit-Umstellung, die die Zeitzonen-Datenbank automatisch kennt.
  var CH_TZ = 'Europe/Zurich';

  // Liefert die Bestandteile der aktuellen Schweizer Zeit als Zahlen.
  function chParts(dateObj) {
    var d = dateObj || new Date();
    try {
      var fmt = new Intl.DateTimeFormat('de-CH', {
        timeZone: CH_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
      });
      var out = {};
      var parts = fmt.formatToParts(d);
      for (var i = 0; i < parts.length; i++) {
        if (parts[i].type !== 'literal') out[parts[i].type] = parseInt(parts[i].value, 10);
      }
      // 24:00 kommt in manchen Umgebungen für Mitternacht — auf 0 normalisieren
      if (out.hour === 24) out.hour = 0;
      if (out.year && out.month && out.day) return out;
    } catch (e) { /* ältere Engine ohne Intl-Zeitzonen: unten Fallback */ }
    // Fallback: Gerätezeit. Besser eine Zeit als keine.
    return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(),
             hour: d.getHours(), minute: d.getMinutes(), second: d.getSeconds() };
  }

  function p2(n) { return (n < 10 ? '0' : '') + n; }

  // 'TT.MM.JJJJ, HH:MM' in Schweizer Zeit — das Format, in dem alle Spiele
  // ihre Verlaufseinträge speichern. Nicht ändern, sonst passen alte Einträge
  // nicht mehr zum Parser in stats.js.
  function nowCH() {
    var t = chParts();
    return p2(t.day) + '.' + p2(t.month) + '.' + t.year + ', ' + p2(t.hour) + ':' + p2(t.minute);
  }

  // Formatiert ein bereits geparstes Datum-Objekt (aus stats.js) zur Anzeige.
  // Die Werte darin sind schon Schweizer Zeit, weil sie so gespeichert wurden —
  // hier darf also NICHT noch einmal umgerechnet werden.
  function fmtCH(d) {
    if (!d) return '';
    return p2(d.getDate()) + '.' + p2(d.getMonth() + 1) + '.' + d.getFullYear() +
           ', ' + p2(d.getHours()) + ':' + p2(d.getMinutes());
  }

  function getDbRef() {
    if (!PROFILE_ID) return null;
    if (dbRef) return dbRef;
    try {
      if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length) {
        dbRef = firebase.database().ref('profiles/' + PROFILE_ID);
        return dbRef;
      }
    } catch (e) { console.warn('Firebase Database nicht verfügbar:', e); }
    return null;
  }

  // Wechselt das aktive Profil: alten Listener abmelden, lokalen Cache des
  // neuen Kindes laden, dann mit dem Cloud-Zweig des Kindes verbinden.
  function switchProfile(profileId) {
    stopCloudSync();
    PROFILE_ID = profileId;
    load();
    updatePointsDisplays();
    initCloudSync();
  }

  // Meldet den Live-Listener ab und vergisst das aktive Profil. Wichtig beim
  // Löschen: sonst feuert der Listener, wenn Firebase den Zweig entfernt, mit
  // data===null — das wurde bisher als "noch nie synchronisiert" verstanden
  // und hat den gelöschten Zweig mit den lokalen Resten (ohne Name/Bild) neu
  // angelegt, sodass das Profil als "Kind" wieder auftauchte.
  function stopCloudSync() {
    if (cloudListener && dbRef) {
      try { dbRef.off('value', cloudListener); } catch (e) {}
    }
    cloudListener = null;
    dbRef = null;
    cloudReady = false;
    PROFILE_ID = null;
  }

  // Entfernt alle lokal zwischengespeicherten Daten eines Profils (Punkte,
  // Sticker, Spielverläufe). Wird beim endgültigen Löschen aufgerufen, damit
  // auf dem Gerät keine Reste des Kindes übrig bleiben.
  function clearLocalProfileData(profileId) {
    if (!profileId) return;
    var keys = [KEY_POINTS, KEY_OWNED, KEY_PLACED, KEY_PENDING_GIFT, KEY_TOTAL_EARNED]
      .concat(GAME_DATA_KEYS);
    for (var i = 0; i < keys.length; i++) {
      try { localStorage.removeItem(keys[i] + '__' + profileId); } catch (e) {}
    }
  }

  function getActiveProfileId() { return PROFILE_ID; }

  // === State ===
  var points = 0;
  var totalEarned = 0; // Lebenszeit-Summe: steuert die Belohnungswelten, sinkt nie
  var pendingGift = 0; // geschenkte Punkte, die das Kind noch nicht "geöffnet" hat
  var ownedStickers = []; // sticker IDs the user bought
  var placedStickers = {}; // { worldId: [{id, x, y}, ...] }
  var currentWorld = '';
  var selectedInventorySticker = null;
  var dragTarget = null;
  var dragOffsetX = 0, dragOffsetY = 0;
  var MIN_SCALE = 0.3, MAX_SCALE = 3.0, SCALE_STEP = 0.2;
  var pinchStartDist = 0, pinchStartScale = 1, pinchTarget = null;

  // === Load / Save ===
  function load() {
    try {
      points = parseInt(localStorage.getItem(pk(KEY_POINTS)), 10) || 0;
      ownedStickers = JSON.parse(localStorage.getItem(pk(KEY_OWNED))) || [];
      placedStickers = JSON.parse(localStorage.getItem(pk(KEY_PLACED))) || {};
      pendingGift = parseInt(localStorage.getItem(pk(KEY_PENDING_GIFT)), 10) || 0;
      // Bestehende Profile haben den Key noch nicht: dann gilt der aktuelle
      // Punktestand als bisher verdiente Summe (nichts geht verloren).
      totalEarned = parseInt(localStorage.getItem(pk(KEY_TOTAL_EARNED)), 10) || 0;
      if (totalEarned < points) totalEarned = points;
    } catch(e) {
      points = 0; ownedStickers = []; placedStickers = {}; pendingGift = 0; totalEarned = 0;
    }
  }

  // Verbindet sich mit der Cloud-Datenbank und hält den State live synchron
  // zwischen allen Geräten, die dasselbe Profil nutzen.
  function initCloudSync() {
    var ref = getDbRef();
    if (!ref) return; // kein Firebase / kein Profil -> App läuft rein lokal weiter

    cloudListener = ref.on('value', function(snapshot) {
      var data = snapshot.val();

      if (data === null) {
        // Noch keine Daten in der Cloud -> aktuellen lokalen Stand hochladen
        pushFullState();
        cloudReady = true;
        return;
      }

      suppressNextWrite = true;
      points = typeof data.points === 'number' ? data.points : 0;
      ownedStickers = Array.isArray(data.ownedStickers) ? data.ownedStickers : [];
      placedStickers = data.placedStickers || {};
      pendingGift = typeof data.pendingGift === 'number' ? data.pendingGift : 0;
      // Immer der höhere Wert gewinnt: so kann eine freigeschaltete Welt nicht
      // durch einen älteren Stand von einem anderen Gerät wieder zugehen.
      var cloudEarned = typeof data.totalEarned === 'number' ? data.totalEarned : 0;
      totalEarned = Math.max(totalEarned, cloudEarned, points);
      suppressNextWrite = false;

      // Lokalen Cache aktuell halten (für Offline-Start)
      try {
        localStorage.setItem(pk(KEY_POINTS), points);
        localStorage.setItem(pk(KEY_OWNED), JSON.stringify(ownedStickers));
        localStorage.setItem(pk(KEY_PLACED), JSON.stringify(placedStickers));
        localStorage.setItem(pk(KEY_PENDING_GIFT), pendingGift);
        localStorage.setItem(pk(KEY_TOTAL_EARNED), totalEarned);
      } catch(e) {}
      // Falls die Cloud noch keinen/einen kleineren Wert hatte: nachziehen.
      if (cloudEarned < totalEarned) {
        try { ref.child('totalEarned').set(totalEarned); } catch(e) {}
      }

      // Spieldaten (Historie + Fehlerlisten aller Spiele) in den lokalen
      // Cache spiegeln, damit die Spiele sie synchron auslesen können.
      if (data.gameData) {
        for (var gk in data.gameData) {
          if (!data.gameData.hasOwnProperty(gk)) continue;
          try {
            localStorage.setItem(pk(unsanitizeKey(gk)), JSON.stringify(data.gameData[gk]));
          } catch(e) {}
        }
      }

      cloudReady = true;
      updatePointsDisplays();
      // Falls gerade die Welt-Ansicht offen ist, Sticker neu zeichnen
      var worldScreen = document.getElementById('world-view-screen');
      if (worldScreen && !worldScreen.classList.contains('hidden')) {
        renderPlacedStickers();
      }
      var shopScreen = document.getElementById('shop-screen');
      if (shopScreen && !shopScreen.classList.contains('hidden')) {
        renderShop();
      }
    }, function(err) {
      console.warn('Firebase Sync-Fehler:', err);
    });
  }

  // Alle Storage-Keys, die Spieldaten enthalten (Historie + Fehlerlisten).
  // Bei einem neuen Spiel hier die neuen Keys ergänzen — dann werden sie
  // bei einer Erst-Migration automatisch mit hochgeladen.
  var GAME_DATA_KEYS = [
    'einmaleins_errors', 'einmaleins_history',
    'durch_errors', 'durch_history',
    'plus_errors', 'plus_history',
    'minus_errors', 'minus_history',
    'rechtschreibung_errors', 'rechtschreibung_history',
    'english_errors', 'english_history',
    'geld_errors', 'geld_history'
  ];

  function collectGameData() {
    var out = {};
    for (var i = 0; i < GAME_DATA_KEYS.length; i++) {
      var k = GAME_DATA_KEYS[i];
      var val = gameLoad(k, null);
      if (val !== null) out[sanitizeKey(k)] = val;
    }
    return out;
  }

  function pushFullState() {
    var ref = getDbRef();
    if (!ref || suppressNextWrite) return;
    // update() statt set(): überschreibt NICHT die Profil-Metadaten
    // (name, avatar, parentPin) — wichtig für update-sichere Daten.
    ref.update({
      points: points,
      ownedStickers: ownedStickers,
      placedStickers: placedStickers,
      pendingGift: pendingGift,
      totalEarned: totalEarned,
      gameData: collectGameData()
    });
  }

  function savePoints() {
    try { localStorage.setItem(pk(KEY_POINTS), points); } catch(e) {}
    var ref = getDbRef();
    if (ref && !suppressNextWrite) ref.child('points').set(points);
  }

  // Zählt den Lebenszeit-Stand hoch und prüft, ob dadurch eine Welt aufgeht.
  // Gibt die Liste der neu freigeschalteten Welten zurück.
  function addEarned(amount) {
    if (!amount || amount <= 0) return [];
    var before = totalEarned;
    totalEarned += amount;
    try { localStorage.setItem(pk(KEY_TOTAL_EARNED), totalEarned); } catch(e) {}
    var ref = getDbRef();
    if (ref && !suppressNextWrite) ref.child('totalEarned').set(totalEarned);

    var opened = [];
    for (var i = 0; i < LOCKED_WORLDS.length; i++) {
      var w = LOCKED_WORLDS[i];
      if (before < w.need && totalEarned >= w.need) opened.push(w);
    }
    return opened;
  }

  function getTotalEarned() { return totalEarned; }

  // Die nächste noch verschlossene Welt (für die Anzeige "noch X Punkte")
  function getNextLockedWorld() {
    for (var i = 0; i < LOCKED_WORLDS.length; i++) {
      if (totalEarned < LOCKED_WORLDS[i].need) {
        return { world: LOCKED_WORLDS[i], missing: LOCKED_WORLDS[i].need - totalEarned };
      }
    }
    return null;
  }

  function saveOwned() {
    try { localStorage.setItem(pk(KEY_OWNED), JSON.stringify(ownedStickers)); } catch(e) {}
    var ref = getDbRef();
    if (ref && !suppressNextWrite) ref.child('ownedStickers').set(ownedStickers);
  }

  function savePlaced() {
    try { localStorage.setItem(pk(KEY_PLACED), JSON.stringify(placedStickers)); } catch(e) {}
    var ref = getDbRef();
    if (ref && !suppressNextWrite) ref.child('placedStickers').set(placedStickers);
  }

  // =====================================================================
  // === GEMEINSAME SPEICHER-API FÜR ALLE SPIELE =========================
  // =====================================================================
  // Jedes Spiel (auch zukünftige!) speichert seine Historie und Fehlerliste
  // über gameLoad()/gameSave() statt direkt über localStorage. Damit landen
  // diese Daten automatisch in der Cloud und sind auf allen Geräten da.
  //
  // WICHTIG für zukünftige Updates: Ein neues Spiel bekommt einfach neue
  // Keys (z.B. 'geo_history'). Bestehende Keys NIE umbenennen oder löschen —
  // dann bleiben alle alten Daten bei jedem Update erhalten.

  // Firebase erlaubt in Schlüsseln kein  . $ # [ ] /  — daher umkodieren.
  function sanitizeKey(key) {
    return String(key).replace(/[.$#\[\]\/]/g, '_');
  }
  // Rückrichtung: unsere Keys enthalten selbst nie Sonderzeichen,
  // daher ist die Umkehrung identisch.
  function unsanitizeKey(key) {
    return key;
  }

  function gameLoad(key, fallback) {
    try {
      var raw = localStorage.getItem(pk(key));
      return raw ? JSON.parse(raw) : fallback;
    } catch(e) { return fallback; }
  }

  function gameSave(key, data) {
    // 1. Lokal speichern (sofort verfügbar, funktioniert offline)
    try { localStorage.setItem(pk(key), JSON.stringify(data)); } catch(e) {}
    // 2. In die Cloud schreiben (geräteübergreifend, update-sicher)
    var ref = getDbRef();
    if (ref && !suppressNextWrite) {
      ref.child('gameData').child(sanitizeKey(key)).set(data);
    }
  }

  // === Points ===
  function addPoint() {
    points++;
    savePoints();
    var opened = addEarned(1);
    if (opened.length > 0) showWorldUnlock(opened[0]);
  }

  function getPoints() { return points; }

  function getPrizesAvailable() {
    return Math.floor(points / PRIZE_COST) - ownedStickers.length;
  }

  function getPointsToNextPrize() {
    var nextThreshold = (ownedStickers.length + 1) * PRIZE_COST;
    return Math.max(0, nextThreshold - points);
  }

  function updatePointsDisplays() {
    var available = getPrizesAvailable();
    var toNext = getPointsToNextPrize();
    var txt = points + ' Punkte';
    if (available > 0) {
      txt += ' — ' + available + ' Preis' + (available > 1 ? 'e' : '') + ' verfügbar!';
    } else {
      txt += ' — noch ' + toNext + ' bis zum nächsten Preis';
    }
    var ids = ['home-points','em-points','dr-points','pl-points','mi-points','rs-points','en-points','ge-points','worlds-points','shop-points'];
    for (var i = 0; i < ids.length; i++) {
      var el = document.getElementById(ids[i]);
      if (el) el.textContent = txt;
    }
    updateGiftDisplay();
  }

  // Zeigt/versteckt das Geschenk-Symbol auf dem Home-Screen je nachdem, ob
  // ein ungeöffnetes Geschenk vorliegt. Getrennt von updatePointsDisplays(),
  // damit claimGift() die "+X Punkte"-Anzeige nicht sofort wieder überschreibt.
  function updateGiftDisplay() {
    var giftEl = document.getElementById('home-gift');
    if (!giftEl) return;
    if (pendingGift > 0) {
      var label = giftEl.querySelector('.gift-icon-label');
      if (label) label.textContent = 'Ein Geschenk wartet auf dich! Tippen zum Öffnen.';
      giftEl.classList.remove('gift-icon-opened');
      giftEl.classList.remove('hidden');
    } else {
      giftEl.classList.add('hidden');
    }
  }

  function getPendingGift() { return pendingGift; }

  // Kind tippt auf das Geschenk-Symbol: Betrag wird kurz angezeigt und dann
  // dem Punktestand gutgeschrieben. Danach verschwindet das Symbol wieder.
  function claimGift() {
    if (pendingGift <= 0) return;
    var amount = pendingGift;
    points += amount;
    pendingGift = 0;
    savePoints();
    try {
      localStorage.setItem(pk(KEY_PENDING_GIFT), 0);
    } catch(e) {}
    var ref = getDbRef();
    if (ref && !suppressNextWrite) ref.child('pendingGift').set(0);

    // Geschenkte Punkte zählen ebenfalls für die Belohnungswelten.
    var opened = addEarned(amount);
    // Punktezahlen sofort aktualisieren (OHNE das Geschenk-Symbol zu verstecken —
    // das übernimmt gleich der eigene Timeout, damit die Zahl kurz sichtbar bleibt).
    var available = getPrizesAvailable();
    var toNext = getPointsToNextPrize();
    var txt = points + ' Punkte';
    txt += (available > 0) ? (' — ' + available + ' Preis' + (available > 1 ? 'e' : '') + ' verfügbar!') : (' — noch ' + toNext + ' bis zum nächsten Preis');
    var ids = ['home-points','em-points','dr-points','pl-points','mi-points','rs-points','en-points','ge-points','worlds-points','shop-points'];
    for (var i = 0; i < ids.length; i++) {
      var el = document.getElementById(ids[i]);
      if (el) el.textContent = txt;
    }

    var giftEl = document.getElementById('home-gift');
    if (giftEl) {
      var label = giftEl.querySelector('.gift-icon-label');
      if (label) label.textContent = 'Geschenkt: +' + amount + ' Punkte!';
      giftEl.classList.add('gift-icon-opened');
      setTimeout(function () {
        giftEl.classList.add('hidden');
        giftEl.classList.remove('gift-icon-opened');
        // Erst nach dem Geschenk die Welt-Freischaltung zeigen, sonst
        // überlagern sich die zwei Meldungen.
        if (opened.length > 0) showWorldUnlock(opened[0]);
      }, 1600);
    } else if (opened.length > 0) {
      showWorldUnlock(opened[0]);
    }
  }

  // Punkte einem bestimmten Kind gutschreiben — auch wenn die Cloud nicht
  // erreichbar ist. Wird vom Elternbereich ("Punkte schenken") als Fallback
  // benutzt, damit das Schenken nie komplett scheitert.
  // Rückgabe: der neue Punktestand.
  function addPointsTo(profileId, amount) {
    amount = parseInt(amount, 10) || 0;
    var key = KEY_POINTS + '__' + profileId;
    var current = 0;
    try { current = parseInt(localStorage.getItem(key), 10) || 0; } catch (e) {}
    var next = current + amount;
    try { localStorage.setItem(key, next); } catch (e) {}
    // Auch die Lebenszeit-Summe des Kindes mitziehen, damit direkt
    // gutgeschriebene Punkte für die Belohnungswelten zählen.
    var eKey = KEY_TOTAL_EARNED + '__' + profileId;
    try {
      var eCur = parseInt(localStorage.getItem(eKey), 10) || 0;
      if (eCur < current) eCur = current;   // Altprofil ohne Key
      localStorage.setItem(eKey, eCur + amount);
      if (profileId === PROFILE_ID) totalEarned = eCur + amount;
    } catch (e) {}
    // Ist es das gerade aktive Kind, sofort auch im Speicher und auf dem
    // Bildschirm nachziehen.
    if (profileId === PROFILE_ID) {
      points = next;
      updatePointsDisplays();
    }
    return next;
  }

  // Wie addPointsTo(), aber für ein noch nicht geöffnetes Geschenk (pendingGift)
  // statt direkt für den Punktestand — genutzt vom neuen Geschenk-System
  // (Punkte werden erst gutgeschrieben, wenn das Kind das Geschenk antippt).
  // Rückgabe: der neue (lokale) Geschenk-Stand.
  function addPendingGiftTo(profileId, amount) {
    amount = parseInt(amount, 10) || 0;
    var key = KEY_PENDING_GIFT + '__' + profileId;
    var current = 0;
    try { current = parseInt(localStorage.getItem(key), 10) || 0; } catch (e) {}
    var next = current + amount;
    try { localStorage.setItem(key, next); } catch (e) {}
    if (profileId === PROFILE_ID) {
      pendingGift = next;
      updateGiftDisplay();
    }
    return next;
  }

  // === Navigation ===
  function goTo(screen) {
    var screens = document.querySelectorAll('.screen');
    for (var i = 0; i < screens.length; i++) {
      screens[i].classList.add('hidden');
    }
    var el = document.getElementById(screen + '-screen');
    if (el) el.classList.remove('hidden');

    updatePointsDisplays();
    updateProfileHeader();

    // Screen-specific init
    if (screen === 'em-start') { EM.initStart(); }
    if (screen === 'dr-start') { DR.initStart(); }
    if (screen === 'pl-start') { PL.initStart(); }
    if (screen === 'mi-start') { MI.initStart(); }
    if (screen === 'rs-start') { RS.initStart(); }
    if (screen === 'en-start') { EN.initStart(); }
    if (screen === 'en-words') { EN.initWords(); }
    if (screen === 'ge-start') { GE.initStart(); }
    if (screen === 'shop') { renderShop(); }
    if (screen === 'worlds') { renderWorlds(); }
    if (screen === 'profile-select') { PROFILES.renderProfileSelect(); }
    window.scrollTo(0, 0);
  }

  // Zeigt oben auf dem Home-Screen, welches Kind gerade spielt
  function updateProfileHeader() {
    var nameEl = document.getElementById('home-profile-name');
    var imgEl = document.getElementById('home-profile-avatar');
    if (!nameEl && !imgEl) return;
    var p = (typeof PROFILES !== 'undefined') ? PROFILES.getActiveProfile() : null;
    if (nameEl) nameEl.textContent = p ? p.name : '';
    if (imgEl && p) {
      imgEl.src = (typeof resolveImg === 'function')
        ? resolveImg('images/' + p.avatar + '.png')
        : 'images/' + p.avatar + '.png';
    }
  }

  // === SHOP ===
  function renderShop() {
    var grid = document.getElementById('shop-grid');
    var info = document.getElementById('shop-info');
    var available = getPrizesAvailable();

    if (available > 0) {
      info.textContent = available + ' Preis' + (available > 1 ? 'e' : '') + ' zum Einlösen! Tippe einen Sticker an.';
    } else {
      var toNext = getPointsToNextPrize();
      info.textContent = 'Noch ' + toNext + ' Punkte bis zum nächsten Preis.';
    }

    grid.innerHTML = '';
    for (var i = 0; i < STICKER_IDS.length; i++) {
      var sid = STICKER_IDS[i];
      var owned = ownedStickers.indexOf(sid) >= 0;
      var div = document.createElement('div');
      div.className = 'shop-item' + (owned ? ' owned' : (available <= 0 ? ' locked' : ''));
      div.setAttribute('data-sid', sid);
      div.innerHTML = '<img src="images/sticker_' + sid + '.png" alt="' + (STICKER_NAMES[sid]||sid) + '">' +
                      '<span>' + (STICKER_NAMES[sid]||sid) + '</span>';
      if (!owned && available > 0) {
        div.onclick = (function(s) { return function() { buySticker(s); }; })(sid);
      }
      grid.appendChild(div);
    }
  }

  function buySticker(sid) {
    if (ownedStickers.indexOf(sid) >= 0) return;
    if (getPrizesAvailable() <= 0) return;
    ownedStickers.push(sid);
    saveOwned();
    updatePointsDisplays();
    renderShop();
  }

  // === WORLD VIEW ===
  function openWorld(worldId) {
    // Verschlossene Belohnungswelt: nicht öffnen, sondern erklären, was fehlt.
    if (!isWorldUnlocked(worldId)) {
      var need = 0, nm = WORLD_NAMES[worldId] || 'Diese Welt';
      for (var i = 0; i < LOCKED_WORLDS.length; i++) {
        if (LOCKED_WORLDS[i].id === worldId) need = LOCKED_WORLDS[i].need;
      }
      showLockedHint(nm, Math.max(0, need - totalEarned));
      return;
    }
    currentWorld = worldId;
    document.getElementById('world-bg').src = 'images/world_' + worldId + '.png';
    goTo('world-view');
    renderAmbience(worldId);
    renderPlacedStickers();
  }

  // Kurzer Hinweis, wenn das Kind auf eine noch verschlossene Welt tippt.
  function showLockedHint(name, missing) {
    var el = document.getElementById('worlds-locked-hint');
    if (!el) return;
    el.textContent = name + ' geht auf, wenn du noch ' + missing + ' Punkte sammelst.';
    el.classList.remove('hidden');
    el.classList.remove('lock-hint-pop');
    // Reflow erzwingen, damit die Animation bei jedem Tippen neu startet
    void el.offsetWidth;
    el.classList.add('lock-hint-pop');
  }

  // === Belohnungswelt freigeschaltet: Überraschungs-Overlay ===
  // Wird von addPoint()/claimGift() aufgerufen, sobald eine Schwelle
  // (500/1000/1500/2000) überschritten wird.
  function showWorldUnlock(w) {
    var ov = document.getElementById('world-unlock');
    if (!ov) return;
    var img = document.getElementById('wu-img');
    var nameEl = document.getElementById('wu-name');
    var needEl = document.getElementById('wu-need');
    if (img) img.src = 'images/world_' + w.id + '.png';
    if (nameEl) nameEl.textContent = w.name;
    if (needEl) needEl.textContent = w.need + ' Punkte erreicht!';
    ov.setAttribute('data-world', w.id);
    ov.classList.remove('hidden');
    spawnUnlockConfetti();
  }

  function closeWorldUnlock() {
    var ov = document.getElementById('world-unlock');
    if (ov) ov.classList.add('hidden');
    renderWorlds();
  }

  // Direkt aus dem Overlay in die neue Welt springen
  function openUnlockedWorld() {
    var ov = document.getElementById('world-unlock');
    var wid = ov ? ov.getAttribute('data-world') : null;
    if (ov) ov.classList.add('hidden');
    if (wid) openWorld(wid);
  }

  function spawnUnlockConfetti() {
    var host = document.getElementById('wu-particles');
    if (!host) return;
    host.innerHTML = '';
    var colors = ['#f5b0c0','#f5d98e','#b8d8a3','#a8d4e6','#d8b4f0','#f0b880'];
    for (var i = 0; i < 40; i++) {
      (function (idx) {
        setTimeout(function () {
          var el = document.createElement('div');
          el.className = 'confetti';
          el.style.left = (Math.random() * 100) + '%';
          el.style.top = (-5 - Math.random() * 10) + '%';
          el.style.background = colors[idx % colors.length];
          el.style.width = (6 + Math.random() * 6) + 'px';
          el.style.height = (8 + Math.random() * 8) + 'px';
          el.style.animationDuration = (1.6 + Math.random()) + 's';
          el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
          host.appendChild(el);
          setTimeout(function () { el.remove(); }, 3000);
        }, idx * 40);
      })(i);
    }
  }

  // Zeichnet die Welten-Übersicht: verschlossene Welten werden grau und mit
  // Schloss-Symbol plus Punktehinweis dargestellt, statt sie zu verstecken —
  // so sieht das Kind, worauf es sich freuen kann.
  function renderWorlds() {
    var cards = document.querySelectorAll('#worlds-screen .world-card');
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      var wid = card.getAttribute('data-world');
      if (!wid) continue;
      var badge = card.querySelector('.world-lock');
      var need = 0;
      for (var j = 0; j < LOCKED_WORLDS.length; j++) {
        if (LOCKED_WORLDS[j].id === wid) need = LOCKED_WORLDS[j].need;
      }
      // In der Admin-Vorschau ist die Karte offen, trägt aber ein Auge-Abzeichen
      // mit der Punktzahl — so sieht man, was das Kind noch braucht.
      if (adminPreview && need > 0 && totalEarned < need) {
        card.classList.remove('world-locked');
        card.classList.add('world-preview');
        if (badge) {
          badge.textContent = '👁 ' + need;
          badge.classList.remove('hidden');
        }
      } else if (isWorldUnlocked(wid)) {
        card.classList.remove('world-locked');
        card.classList.remove('world-preview');
        if (badge) badge.classList.add('hidden');
      } else {
        card.classList.add('world-locked');
        card.classList.remove('world-preview');
        if (badge) {
          badge.textContent = '🔒 ' + need;
          badge.classList.remove('hidden');
        }
      }
    }
    // Fortschrittszeile über dem Raster
    var prog = document.getElementById('worlds-progress');
    if (prog) {
      var nx = getNextLockedWorld();
      if (adminPreview) {
        prog.textContent = 'Admin-Vorschau: alle Welten offen. ' +
          (nx ? ('Für das Kind sind noch ' + nx.missing + ' Punkte bis ' + nx.world.name + ' nötig.')
              : 'Das Kind hat schon alle Welten erreicht.');
      } else {
        prog.textContent = nx
          ? ('Insgesamt ' + totalEarned + ' Punkte gesammelt — noch ' + nx.missing +
             ' bis ' + nx.world.name + '.')
          : ('Insgesamt ' + totalEarned + ' Punkte gesammelt — alle Welten sind offen!');
      }
    }
    var hint = document.getElementById('worlds-locked-hint');
    if (hint) hint.classList.add('hidden');
  }

  // =====================================================================
  // === AMBIENTE-ANIMATIONEN (Vogel, Schmetterlinge, Wind, Funkeln) ======
  // =====================================================================
  // Legt kleine bewegte Elemente über das Landschaftsbild. Die Bilder selbst
  // sind gemalte Flächen und können nicht animiert werden — diese Ebene
  // erzeugt den Eindruck von Leben darüber.
  //
  // Pro Welt ein eigenes "Rezept": im Wald Vögel/Schmetterlinge/Glühwürmchen,
  // im Ozean Fische und Luftblasen, usw. Ein neues Element hier ergänzen,
  // dann erscheint es automatisch.
  var AMBIENCE = {
    forest: {
      // Kein Vogel mehr (sah komisch aus). Schmetterlinge in drei Farben.
      butterflies: 3, flowers: 5, sparks: 7, petals: 3,
      clouds: false   // im Wald sieht man den Himmel kaum — Wolken würden über den Wipfeln schweben
    },
    farm: {
      // Nur noch Blumen — alles andere entfernt. Grössere Blüten, passend zum Feld.
      // Die gemalten Blumen liegen nur im Beet unten links; rechts sind Weg und
      // Gemüsebeet. Darum dürfen die Ambiente-Blumen nur in der linken Zone
      // erscheinen, sonst landet z.B. eine Sonnenblume mitten auf der Strasse.
      butterflies: 0, flowers: 5, sparks: 0, petals: 0,
      bigFlowers: true,
      clouds: false,
      flowerZones: [
        { leftMin: 2, leftMax: 40, topMin: 80, topMax: 97 }
      ]
    },
    mountain: {
      butterflies: 2, flowers: 4, sparks: 0, petals: 0,
      clouds: true
    },
    ocean: {
      // Nur kleine Krebse und Schildkröten, die sich am Strand bewegen.
      butterflies: 0, flowers: 0, sparks: 0, petals: 0,
      crabs: 3, turtles: 2,
      clouds: false
    },
    village: {
      // Kein Vogel, keine Schmetterlinge — stattdessen krabbeln kleine
      // Marienkäfer über das Pflaster, dazu ein paar Schnecken mit einem
      // Häschen auf dem Rücken. Nur 2 Marienkäfer (weniger Gewimmel als
      // vorher), und die Blumen dürfen nur noch in den echten Grünflächen
      // (unten links/rechts) erscheinen, nicht mehr über dem Pflaster/Brunnen.
      butterflies: 0, flowers: 4, sparks: 0, petals: 0,
      ladybugs: 2,
      snails: 2,
      clouds: false,
      flowerZones: [
        { leftMin: 1, leftMax: 13, topMin: 84, topMax: 97 },
        { leftMin: 79, leftMax: 97, topMin: 82, topMax: 97 }
      ]
    },
    circus: {
      // Blumen unten am Bildrand wiegen sich, Schmetterlinge über der Wiese.
      butterflies: 3, flowers: 5, sparks: 0, petals: 0,
      bigFlowers: true,
      clouds: false
    },
    park: {
      // Freizeitpark: keine Schmetterlinge und keine Ambiente-Blumen mehr
      // (die landeten auf dem gepflasterten Platz). Stattdessen schweben ein
      // paar bunte Luftballons über dem Platz — passt zum Jahrmarkt-Motiv.
      butterflies: 0, flowers: 0, sparks: 0, petals: 0,
      balloons: 3,
      clouds: false
    },
    castle: {
      // Schloss: Wolken über den Türmen. Keine Schmetterlinge mehr — dafür
      // schwimmen verschiedene Fische im Wassergraben (links vor dem Schloss).
      // Die Fische bleiben streng in der Wasserzone, damit keiner auf Wiese
      // oder Weg landet.
      butterflies: 0, flowers: 4, sparks: 0, petals: 0,
      clouds: true,
      fish: 4,
      waterZones: [
        { leftMin: 6, leftMax: 46, topMin: 64, topMax: 75 }
      ]
    },
    veggie: {
      // Gemüsegarten: viele grosse Blüten und Schmetterlinge über den Beeten.
      butterflies: 3, flowers: 5, sparks: 0, petals: 0,
      bigFlowers: true,
      clouds: false
    },
    space: {
      // Weltall: nur funkelnde Sterne — keine Blumen, keine Wolken.
      butterflies: 0, flowers: 0, sparks: 14, petals: 0,
      clouds: false
    }
  };

  // Kleine deterministische Zufallsfunktion: gleicher Startwert -> gleiche
  // Positionen. So sieht die Welt bei jedem Öffnen gleich aus (kein Flackern
  // oder Umherspringen) und wir brauchen kein Math.random().
  function seededRand(seed) {
    var s = seed;
    return function () {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
  }

  // Aus dem Weltnamen einen stabilen Startwert machen
  function seedFromName(name) {
    var h = 7;
    for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0x7fffffff;
    return h || 7;
  }

  function renderAmbience(worldId) {
    var layer = document.getElementById('world-ambience');
    if (!layer) return;
    layer.innerHTML = '';

    var cfg = AMBIENCE[worldId] || AMBIENCE.farm;
    var rnd = seededRand(seedFromName(worldId));
    var html = '';
    var i;

    // Wolken je Welt ein- oder ausblenden (im Wald störten sie über den Wipfeln)
    var cloudLayer = document.getElementById('world-clouds');
    if (cloudLayer) {
      if (cfg.clouds === false) cloudLayer.classList.add('hidden');
      else cloudLayer.classList.remove('hidden');
    }

    // --- Vögel: bewusst ersatzlos entfernt ---
    // Der Emoji-Vogel passte nie zum gemalten Stil und ist in keiner Welt mehr
    // erwünscht. Der Code ist ganz weg, nicht nur auf 0 gestellt — so kann er
    // auch dann nicht auftauchen, wenn irgendwo ein alter Zähler überlebt.
    // (Ein Vogel als Sticker bleibt natürlich möglich.)

    // --- Schmetterlinge: flattern auf kleinen Rundbahnen in der Blumenzone ---
    // Drei verschiedene Farben: der graue Emoji-Schmetterling wird per CSS-Filter
    // eingefärbt (blau, orange/gelb, pink) — so sind alle drei unterscheidbar.
    var butterflyTints = ['amb-bf-blue', 'amb-bf-orange', 'amb-bf-pink'];
    for (i = 0; i < (cfg.butterflies || 0); i++) {
      var flLeft = 8 + rnd() * 76;
      var flTop = 52 + rnd() * 34;               // untere Bildhälfte, wo die Blumen sind
      var flDur = 9 + rnd() * 8;
      var flDelay = rnd() * 7;
      html += '<span class="amb-butterfly ' + butterflyTints[i % butterflyTints.length] +
              '" style="left:' + flLeft.toFixed(1) + '%;top:' + flTop.toFixed(1) + '%;' +
              'animation:butterflyPath ' + flDur.toFixed(1) + 's ease-in-out ' + flDelay.toFixed(1) + 's infinite">' +
              '<span class="amb-butterfly-inner">🦋</span></span>'; // 🦋
    }

    // --- Blumen, die sich im Wind wiegen ---
    // Fünf verschiedene Farben. bigFlowers: grössere Blüten, damit sie auf dem
    // Bauernhof/im Garten zur Grösse der gemalten Blumen passen.
    var flowerGlyphs = ['🌸', '🌼', '🌷', '🌺', '🌻']; // 🌸 🌼 🌷 🌺 🌻
    var flBase = cfg.bigFlowers ? 26 : 13;
    var flSpread = cfg.bigFlowers ? 12 : 7;
    for (i = 0; i < (cfg.flowers || 0); i++) {
      var fLeft, fTop;
      if (cfg.flowerZones && cfg.flowerZones.length) {
        // Manche Welten (z.B. Dorf) haben Pflaster/Wasser in der unteren
        // Bildhälfte — dort dürfen keine Blumen erscheinen. Stattdessen wird
        // eine der echten Grünflächen-Zonen des Bildes zufällig gewählt.
        var fz = cfg.flowerZones[i % cfg.flowerZones.length];
        fLeft = fz.leftMin + rnd() * (fz.leftMax - fz.leftMin);
        fTop = fz.topMin + rnd() * (fz.topMax - fz.topMin);
      } else {
        fLeft = 4 + rnd() * 90;
        fTop = 74 + rnd() * 20;                  // ganz unten, in der Blumenzone
      }
      var fDur = 2.6 + rnd() * 2.2;              // langsames, ruhiges Wiegen
      var fDelay = rnd() * 3;
      var fSize = flBase + rnd() * flSpread;
      html += '<span class="amb-flower" style="left:' + fLeft.toFixed(1) + '%;top:' + fTop.toFixed(1) + '%;' +
              'font-size:' + fSize.toFixed(0) + 'px;' +
              'animation:sway ' + fDur.toFixed(1) + 's ease-in-out ' + fDelay.toFixed(1) + 's infinite">' +
              flowerGlyphs[i % flowerGlyphs.length] + '</span>';
    }

    // --- Lichtpunkte / Glühwürmchen ---
    for (i = 0; i < (cfg.sparks || 0); i++) {
      var sLeft = 5 + rnd() * 90;
      var sTop = 20 + rnd() * 65;
      var sSize = 5 + rnd() * 7;
      var sDur = 2.4 + rnd() * 3;
      var sDelay = rnd() * 4;
      html += '<span class="amb-spark" style="left:' + sLeft.toFixed(1) + '%;top:' + sTop.toFixed(1) + '%;' +
              'width:' + sSize.toFixed(0) + 'px;height:' + sSize.toFixed(0) + 'px;' +
              'animation:sparkle ' + sDur.toFixed(1) + 's ease-in-out ' + sDelay.toFixed(1) + 's infinite"></span>';
    }

    // --- Fallende Blütenblätter ---
    for (i = 0; i < (cfg.petals || 0); i++) {
      var pLeft = 10 + rnd() * 78;
      var pDur = 11 + rnd() * 9;
      var pDelay = rnd() * 12;
      html += '<span class="amb-petal" style="left:' + pLeft.toFixed(1) + '%;top:0;' +
              'animation:petalFall ' + pDur.toFixed(1) + 's linear ' + pDelay.toFixed(1) + 's infinite">' +
              '🌿</span>'; // 🌿
    }

    // --- Krebse (nur Strand): laufen seitwärts über den Sand ---
    // Die Sandzone im Meerbild liegt links/unten — deshalb tiefer Startpunkt
    // und eine kurze, langsame Krabbelbahn statt eines Durchflugs.
    for (i = 0; i < (cfg.crabs || 0); i++) {
      var crTop = 76 + rnd() * 18;               // 76–94 % Höhe = Sandstreifen
      var crLeft = 4 + rnd() * 46;               // linke Bildhälfte = Strand
      var crDur = 9 + rnd() * 7;
      var crDelay = rnd() * 8;
      var crSize = 18 + rnd() * 8;
      html += '<span class="amb-crab" style="left:' + crLeft.toFixed(1) + '%;top:' + crTop.toFixed(1) + '%;' +
              'font-size:' + crSize.toFixed(0) + 'px;' +
              'animation:crabWalk ' + crDur.toFixed(1) + 's ease-in-out ' + crDelay.toFixed(1) + 's infinite">' +
              '<span class="amb-crab-inner">🦀</span></span>'; // 🦀
    }

    // --- Schildkröten (nur Strand): wandern ganz langsam Richtung Wasser ---
    for (i = 0; i < (cfg.turtles || 0); i++) {
      var tuTop = 70 + rnd() * 22;
      var tuLeft = 2 + rnd() * 40;
      var tuDur = 22 + rnd() * 14;               // sehr langsam
      var tuDelay = rnd() * 10;
      var tuSize = 20 + rnd() * 8;
      html += '<span class="amb-turtle" style="left:' + tuLeft.toFixed(1) + '%;top:' + tuTop.toFixed(1) + '%;' +
              'font-size:' + tuSize.toFixed(0) + 'px;' +
              'animation:turtleWalk ' + tuDur.toFixed(1) + 's ease-in-out ' + tuDelay.toFixed(1) + 's infinite">' +
              '<span class="amb-turtle-inner">🐢</span></span>'; // 🐢
    }

    // --- Marienkäfer: krabbeln unten über den Boden, mit kurzen Pausen ---
    // Sie bleiben in der unteren Bildhälfte (Pflaster/Weg) und laufen auf
    // verschiedenen Bahnen hin und zurück, damit es lebendig aussieht.
    for (i = 0; i < (cfg.ladybugs || 0); i++) {
      var lbTop = 66 + rnd() * 28;                // 66–94 % Höhe = Boden
      var lbLeft = 4 + rnd() * 62;
      var lbDur = 13 + rnd() * 12;                // langsames Krabbeln
      var lbDelay = rnd() * 9;
      var lbSize = 12 + rnd() * 7;                // kleine Käfer
      var lbPath = (i % 2 === 0) ? 'ladybugWalk' : 'ladybugWalkAlt';
      html += '<span class="amb-ladybug" style="left:' + lbLeft.toFixed(1) + '%;top:' + lbTop.toFixed(1) + '%;' +
              'font-size:' + lbSize.toFixed(0) + 'px;' +
              'animation:' + lbPath + ' ' + lbDur.toFixed(1) + 's ease-in-out ' + lbDelay.toFixed(1) + 's infinite">' +
              '<span class="amb-ladybug-inner">🐞</span></span>'; // 🐞
    }

    // --- Schnecken mit einem Häschen auf dem Rücken: kriechen ganz langsam
    // über den Boden. Zwei Emoji übereinander (Schnecke + Hase), damit man
    // sofort sieht, dass der Hase "mitreitet".
    for (i = 0; i < (cfg.snails || 0); i++) {
      var snTop = 68 + rnd() * 24;                 // Boden, ähnlich wie Marienkäfer
      var snLeft = 8 + rnd() * 56;
      var snDur = 26 + rnd() * 16;                 // sehr langsam
      var snDelay = rnd() * 10;
      var snSize = 20 + rnd() * 6;
      var snPath = (i % 2 === 0) ? 'ladybugWalk' : 'ladybugWalkAlt'; // gleiche ruhige Bahnen wiederverwenden
      html += '<span class="amb-snail" style="left:' + snLeft.toFixed(1) + '%;top:' + snTop.toFixed(1) + '%;' +
              'font-size:' + snSize.toFixed(0) + 'px;' +
              'animation:' + snPath + ' ' + snDur.toFixed(1) + 's ease-in-out ' + snDelay.toFixed(1) + 's infinite">' +
              '<span class="amb-snail-inner">🐌</span><span class="amb-snail-rider">🐰</span></span>'; // 🐌🐰
    }

    // --- Luftballons: schweben bunt über dem Platz, leicht seitlich schaukelnd.
    // Der graue Ballon-Emoji wird per CSS-Filter in verschiedene Farben getönt
    // (rot, blau, grün, gelb), damit die Ballons klar unterscheidbar sind.
    var balloonTints = ['amb-balloon-red', 'amb-balloon-blue', 'amb-balloon-green', 'amb-balloon-yellow'];
    for (i = 0; i < (cfg.balloons || 0); i++) {
      var baLeft = 12 + rnd() * 72;
      var baTop = 20 + rnd() * 46;                 // obere/mittlere Bildhälfte = Himmel/Platz
      var baDur = 10 + rnd() * 8;
      var baDelay = rnd() * 6;
      var baSize = 26 + rnd() * 12;
      html += '<span class="amb-balloon ' + balloonTints[i % balloonTints.length] +
              '" style="left:' + baLeft.toFixed(1) + '%;top:' + baTop.toFixed(1) + '%;' +
              'font-size:' + baSize.toFixed(0) + 'px;' +
              'animation:balloonFloat ' + baDur.toFixed(1) + 's ease-in-out ' + baDelay.toFixed(1) + 's infinite">' +
              '<span class="amb-balloon-inner">🎈</span></span>'; // 🎈
    }

    // --- Fische: schwimmen nur innerhalb der Wasserzone(n) einer Welt hin und
    // her (z.B. im Wassergraben beim Schloss). Verschiedene Emoji-Fische für
    // Abwechslung. Bleiben streng im Wasser, damit keiner auf der Wiese landet.
    var fishGlyphs = ['🐟', '🐠', '🐡', '🦈']; // 🐟 🐠 🐡 🦈
    for (i = 0; i < (cfg.fish || 0); i++) {
      var wz = (cfg.waterZones && cfg.waterZones.length)
        ? cfg.waterZones[i % cfg.waterZones.length]
        : { leftMin: 10, leftMax: 40, topMin: 65, topMax: 75 };
      var fiLeft = wz.leftMin + rnd() * (wz.leftMax - wz.leftMin);
      var fiTop = wz.topMin + rnd() * (wz.topMax - wz.topMin);
      var fiDur = 12 + rnd() * 10;                 // gemächliches Schwimmen
      var fiDelay = rnd() * 8;
      var fiSize = 16 + rnd() * 8;
      var fiPath = (i % 2 === 0) ? 'fishSwim' : 'fishSwimAlt';
      html += '<span class="amb-fish" style="left:' + fiLeft.toFixed(1) + '%;top:' + fiTop.toFixed(1) + '%;' +
              'font-size:' + fiSize.toFixed(0) + 'px;' +
              'animation:' + fiPath + ' ' + fiDur.toFixed(1) + 's ease-in-out ' + fiDelay.toFixed(1) + 's infinite">' +
              '<span class="amb-fish-inner">' + fishGlyphs[i % fishGlyphs.length] + '</span></span>';
    }

    layer.innerHTML = html;
  }

  function renderPlacedStickers() {
    var container = document.getElementById('world-stickers');
    container.innerHTML = '';
    var list = placedStickers[currentWorld] || [];
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      createStickerElement(container, s.id, s.x, s.y, i);
    }
  }

  function createStickerElement(container, sid, xPct, yPct, idx) {
    var list = placedStickers[currentWorld] || [];
    var scale = (list[idx] && list[idx].scale) ? list[idx].scale : 1;
    var div = document.createElement('div');
    div.className = 'placed-sticker';
    div.setAttribute('data-idx', idx);
    div.style.left = xPct + '%';
    div.style.top = yPct + '%';
    div.style.transform = 'scale(' + scale + ')';
    div.innerHTML = '<img src="images/sticker_' + sid + '.png" alt="">' +
      '<div class="sticker-controls">' +
        '<button class="sticker-btn sticker-shrink" data-idx="' + idx + '">−</button>' +
        '<button class="sticker-btn sticker-grow" data-idx="' + idx + '">+</button>' +
      '</div>';
    container.appendChild(div);
    addDragListeners(div);
    addPinchListeners(div);
    // Button handlers
    div.querySelector('.sticker-shrink').addEventListener('click', function(e) {
      e.stopPropagation(); resizeSticker(idx, -SCALE_STEP);
    });
    div.querySelector('.sticker-grow').addEventListener('click', function(e) {
      e.stopPropagation(); resizeSticker(idx, SCALE_STEP);
    });
    // Prevent button touches from starting drag
    var btns = div.querySelectorAll('.sticker-btn');
    for (var b = 0; b < btns.length; b++) {
      btns[b].addEventListener('touchstart', function(e) { e.stopPropagation(); }, { passive: false });
      btns[b].addEventListener('mousedown', function(e) { e.stopPropagation(); });
    }
  }

  function resizeSticker(idx, delta) {
    var list = placedStickers[currentWorld] || [];
    if (!list[idx]) return;
    var s = list[idx].scale || 1;
    s = Math.round((s + delta) * 10) / 10;
    s = Math.max(MIN_SCALE, Math.min(MAX_SCALE, s));
    list[idx].scale = s;
    savePlaced();
    // Update the DOM element
    var el = document.querySelector('.placed-sticker[data-idx="' + idx + '"]');
    if (el) el.style.transform = 'scale(' + s + ')';
  }

  // === PINCH TO ZOOM ===
  function addPinchListeners(el) {
    el.addEventListener('touchstart', onPinchStart, { passive: false });
  }

  function onPinchStart(e) {
    if (e.touches.length === 2) {
      e.preventDefault();
      e.stopPropagation();
      pinchTarget = e.currentTarget;
      pinchStartDist = getTouchDist(e.touches[0], e.touches[1]);
      var idx = parseInt(pinchTarget.getAttribute('data-idx'), 10);
      var list = placedStickers[currentWorld] || [];
      pinchStartScale = (list[idx] && list[idx].scale) ? list[idx].scale : 1;
      // Cancel any drag
      if (dragTarget) { dragTarget.classList.remove('dragging'); dragTarget = null; }
    }
  }

  function onPinchMove(e) {
    if (!pinchTarget || e.touches.length !== 2) return;
    e.preventDefault();
    var dist = getTouchDist(e.touches[0], e.touches[1]);
    var ratio = dist / pinchStartDist;
    var newScale = Math.round(pinchStartScale * ratio * 10) / 10;
    newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));
    pinchTarget.style.transform = 'scale(' + newScale + ')';
  }

  function onPinchEnd(e) {
    if (!pinchTarget) return;
    if (e.touches.length < 2) {
      // Save final scale
      var idx = parseInt(pinchTarget.getAttribute('data-idx'), 10);
      var currentScale = parseFloat(pinchTarget.style.transform.replace('scale(','').replace(')','')) || 1;
      var list = placedStickers[currentWorld] || [];
      if (list[idx]) { list[idx].scale = currentScale; savePlaced(); }
      pinchTarget = null;
    }
  }

  function getTouchDist(t1, t2) {
    var dx = t1.clientX - t2.clientX, dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  document.addEventListener('touchmove', function(e) {
    if (pinchTarget && e.touches.length === 2) { onPinchMove(e); return; }
    onDragMove(e);
  }, { passive: false });
  document.addEventListener('touchend', function(e) {
    if (pinchTarget) { onPinchEnd(e); return; }
    onDragEnd(e);
  });

  // === DRAG & DROP ===
  var dragStartTime = 0;
  var dragMoved = false;

  function addDragListeners(el) {
    el.addEventListener('touchstart', onDragStart, { passive: false });
    el.addEventListener('mousedown', onDragStart);
  }

  function onDragStart(e) {
    if (e.touches && e.touches.length >= 2) return; // let pinch handle it
    e.preventDefault();
    dragTarget = e.currentTarget;
    dragTarget.classList.add('dragging');
    dragStartTime = Date.now();
    dragMoved = false;
    var touch = e.touches ? e.touches[0] : e;
    var elRect = dragTarget.getBoundingClientRect();
    dragOffsetX = touch.clientX - elRect.left;
    dragOffsetY = touch.clientY - elRect.top;
  }

  function onDragMove(e) {
    if (!dragTarget) return;
    e.preventDefault();
    dragMoved = true;
    var canvas = document.getElementById('world-canvas');
    var rect = canvas.getBoundingClientRect();
    var touch = e.touches ? e.touches[0] : e;
    var x = touch.clientX - rect.left - dragOffsetX;
    var y = touch.clientY - rect.top - dragOffsetY;
    var xPct = (x / rect.width) * 100;
    var yPct = (y / rect.height) * 100;
    xPct = Math.max(-5, Math.min(95, xPct));
    yPct = Math.max(-5, Math.min(95, yPct));
    dragTarget.style.left = xPct + '%';
    dragTarget.style.top = yPct + '%';
  }

  function onDragEnd() {
    if (!dragTarget) return;
    dragTarget.classList.remove('dragging');
    var idx = parseInt(dragTarget.getAttribute('data-idx'), 10);
    var xPct = parseFloat(dragTarget.style.left);
    var yPct = parseFloat(dragTarget.style.top);
    var list = placedStickers[currentWorld] || [];
    if (list[idx]) {
      list[idx].x = xPct;
      list[idx].y = yPct;
      savePlaced();
    }
    // Short tap (no drag) = toggle resize controls
    if (!dragMoved && (Date.now() - dragStartTime) < 300) {
      dragTarget.classList.toggle('show-controls');
      // Hide controls on all other stickers
      var allStickers = document.querySelectorAll('.placed-sticker');
      for (var i = 0; i < allStickers.length; i++) {
        if (allStickers[i] !== dragTarget) allStickers[i].classList.remove('show-controls');
      }
    }
    dragTarget = null;
  }

  document.addEventListener('mousemove', onDragMove);
  document.addEventListener('mouseup', onDragEnd);

  // === INVENTORY (place sticker on world) ===
  function openInventory() {
    var inv = document.getElementById('world-inventory');
    var grid = document.getElementById('inv-grid');
    grid.innerHTML = '';
    selectedInventorySticker = null;

    // Show owned stickers not yet placed on THIS world
    var worldPlaced = (placedStickers[currentWorld] || []).map(function(s) { return s.id; });
    var available = [];
    for (var i = 0; i < ownedStickers.length; i++) {
      var sid = ownedStickers[i];
      // Each sticker can only be used once total (across all worlds)
      if (!isStickerPlacedAnywhere(sid)) {
        available.push(sid);
      }
    }

    if (available.length === 0) {
      grid.innerHTML = '<p style="grid-column:1/-1;font-size:14px;color:#7a6b5d;text-align:center;">Keine Sticker verfügbar. Kaufe im Shop neue!</p>';
    } else {
      for (var j = 0; j < available.length; j++) {
        var s = available[j];
        var div = document.createElement('div');
        div.className = 'inv-item';
        div.setAttribute('data-sid', s);
        div.innerHTML = '<img src="images/sticker_' + s + '.png" alt="">';
        div.onclick = (function(sid, el) {
          return function() { selectInventorySticker(sid, el); };
        })(s, div);
        grid.appendChild(div);
      }
    }

    inv.classList.remove('hidden');
    document.getElementById('place-btn').classList.add('hidden');
  }

  function isStickerPlacedAnywhere(sid) {
    for (var w = 0; w < WORLDS.length; w++) {
      var list = placedStickers[WORLDS[w]] || [];
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === sid) return true;
      }
    }
    return false;
  }

  function selectInventorySticker(sid, el) {
    // Deselect all
    var items = document.querySelectorAll('.inv-item');
    for (var i = 0; i < items.length; i++) items[i].classList.remove('selected');
    el.classList.add('selected');
    selectedInventorySticker = sid;

    // Place it in center of canvas
    if (!placedStickers[currentWorld]) placedStickers[currentWorld] = [];
    var idx = placedStickers[currentWorld].length;
    placedStickers[currentWorld].push({ id: sid, x: 40 + Math.random()*20, y: 40 + Math.random()*20, scale: 1 });
    savePlaced();

    var container = document.getElementById('world-stickers');
    var s = placedStickers[currentWorld][idx];
    createStickerElement(container, s.id, s.x, s.y, idx);

    closeInventory();
  }

  function closeInventory() {
    document.getElementById('world-inventory').classList.add('hidden');
    document.getElementById('place-btn').classList.remove('hidden');
    selectedInventorySticker = null;
  }

  // === INIT ===
  // Die App startet immer auf dem Profil-Auswahlscreen. Erst wenn ein Kind
  // gewählt ist, werden dessen Daten geladen (switchProfile).
  function boot() {
    // Profilliste aus der Cloud holen (bzw. aus dem lokalen Cache, falls offline)
    PROFILES.initProfileList(function () {
      // Sorgt dafür, dass immer mindestens ein Profil da ist (Mia Lou),
      // egal ob die Cloud leer ist oder ein Alt-Profil migriert werden kann.
      PROFILES.ensureFirstProfile(function () {
        PROFILES.renderProfileSelect();
      });
    });

    goTo('profile-select');
  }

  // Cloud-Sync erst starten, wenn die anonyme Firebase-Anmeldung durch ist.
  // Ohne Anmeldung greifen die Datenbank-Regeln ("auth != null") nicht und
  // die App läuft einfach rein lokal weiter.
  // boot() wird erst nach dem Laden aller Skripte aufgerufen, weil es
  // PROFILES braucht (profiles.js wird nach app.js geladen).
  function startWhenReady() {
    if (typeof FB_READY === 'function') {
      FB_READY(function (signedIn) {
        if (!signedIn) console.warn('Kein Firebase-Login — App läuft nur mit localStorage.');
        boot();
      });
    } else {
      boot();
    }
  }

  return {
    goTo: goTo,
    openWorld: openWorld,
    renderWorlds: renderWorlds,
    closeWorldUnlock: closeWorldUnlock,
    openUnlockedWorld: openUnlockedWorld,
    isWorldUnlocked: isWorldUnlocked,
    getTotalEarned: getTotalEarned,
    setAdminPreview: setAdminPreview,
    isAdminPreview: isAdminPreview,
    renderAmbience: renderAmbience,
    nowCH: nowCH,
    fmtCH: fmtCH,
    chParts: chParts,
    openInventory: openInventory,
    closeInventory: closeInventory,
    addPoint: addPoint,
    addPointsTo: addPointsTo,
    addPendingGiftTo: addPendingGiftTo,
    getPoints: getPoints,
    getPendingGift: getPendingGift,
    claimGift: claimGift,
    updatePointsDisplays: updatePointsDisplays,
    updateProfileHeader: updateProfileHeader,
    // Profil-Anbindung
    switchProfile: switchProfile,
    stopCloudSync: stopCloudSync,
    clearLocalProfileData: clearLocalProfileData,
    getActiveProfileId: getActiveProfileId,
    startWhenReady: startWhenReady,
    // Gemeinsame Speicher-API — von allen Spielen genutzt, cloud-synchron
    gameLoad: gameLoad,
    gameSave: gameSave,
    STICKER_IDS: STICKER_IDS,
    STICKER_NAMES: STICKER_NAMES
  };
})();

// Start: wird am Ende von index.html aufgerufen, wenn alle Module (inkl.
// PROFILES und STATS) geladen sind.
APP.updatePointsDisplays();
