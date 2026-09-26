/* game_geld.js — Geld-App mit zwei Unterspielen, namespaced als GE.

   Unterspiel 1 "Rückgeld":
     Zwei Produkte mit Preisen (Total immer unter 100.-), dazu eine Note
     (10/20/50/100), die nie kleiner ist als das Total.
     Schritt 1: die zwei Preise zusammenrechnen. Bei Fehler erscheint die
                Untereinander-Rechnung mit einem Feld für das Resultat.
     Schritt 2: das Rückgeld in kleinen Schritten — zuerst die Rappen auf den
                nächsten Franken, dann die Franken auf den nächsten Zehner,
                dann die Zehner auf die Note. Bei Fehler erscheint eine Hilfe.

   Unterspiel 2 "Mehrere Stücke":
     Ein Produkt mit Stückpreis, gefragt ist der Preis für mehrere Stücke.

   Gerechnet wird durchgehend in RAPPEN (ganze Zahlen), damit keine
   Rundungsfehler entstehen (0.1 + 0.2 ist in JavaScript nicht genau 0.3).
   Erst für die Anzeige wird in Franken umgerechnet.
*/

var GE = (function () {
  'use strict';

  var STORAGE_ERRORS = 'geld_errors';
  var STORAGE_HISTORY = 'geld_history';
  var MAX_ERROR_GAMES = 5;

  var mouseCorrect = 'images/mouse_correct.png';
  var mouseSad = 'images/mouse_sad_wide.png';
  var confettiColors = ['#f5b0c0','#f5d98e','#b8d8a3','#a8d4e6','#d8b4f0','#f0b880','#7ec88b','#e88080'];
  var emojiMap = { sparkles:'✨', star:'⭐', heart:'❤️', party:'🎉', tada:'🎊' };

  // Die zehn Produkte. min/max sind Preisgrenzen in Rappen — so bleibt ein
  // Stift billig und eine Uhr teuer, und die Aufgaben wirken realistisch.
  var PRODUCTS = [
    { key: 'stift',       name: 'Stift',       img: 'images/geld_stift.png',       min: 95,   max: 690 },
    { key: 'heft',        name: 'Heft',        img: 'images/geld_heft.png',        min: 120,  max: 480 },
    { key: 'spielzeug',   name: 'Spielzeug',   img: 'images/geld_spielzeug.png',   min: 850,  max: 3900 },
    { key: 'uhr',         name: 'Uhr',         img: 'images/geld_uhr.png',         min: 1900, max: 4900 },
    { key: 'plueschtier', name: 'Plüschtier',  img: 'images/geld_plueschtier.png', min: 900,  max: 3500 },
    { key: 'radio',       name: 'Radio',       img: 'images/geld_radio.png',       min: 1500, max: 4500 },
    { key: 'ring',        name: 'Ring',        img: 'images/geld_ring.png',        min: 1200, max: 4200 },
    { key: 'fotoapparat', name: 'Fotoapparat', img: 'images/geld_fotoapparat.png', min: 2500, max: 4900 },
    { key: 'ball',        name: 'Ball',        img: 'images/geld_ball.png',        min: 450,  max: 1900 },
    { key: 'etui',        name: 'Etui',        img: 'images/geld_etui.png',        min: 600,  max: 2400 }
  ];

  var NOTES = [1000, 2000, 5000, 10000];  // 10.-, 20.-, 50.-, 100.- in Rappen

  // Spielzustand
  var mode = 'change';           // 'change' = Rückgeld, 'multi' = mehrere Stücke
  var selectedCount = 10;
  var tasks = [], TOTAL = 0, queue = [];
  var correctCount = 0, wrongCount = 0, questionNumber = 0;
  var gameStartTime = 0, gameEnded = false, locked = false;
  var gameErrors = {};
  var wakeLock = null;

  // Zustand innerhalb einer Aufgabe
  var phase = 'sum';             // 'sum' | 'change'
  var sumTries = 0;              // wie oft die Summe schon falsch war
  var changeSteps = [];          // die Teilschritte des Rückgelds
  var stepIndex = 0;
  var taskHadError = false;      // für die Trefferquote beim ersten Versuch
  var currentInput = '';

  // DOM-Referenzen
  var promptEl, scoreText, progressFill, questionArea, mouseImg, particlesEl;
  var endScreen, endTitle, endMessage, endStats;

  // === Speichern ===
  function loadS(key, fb) { return APP.gameLoad(key, fb); }
  function saveS(key, d) { APP.gameSave(key, d); }

  function shuffleArray(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function formatTime(s) {
    var m = Math.floor(s / 60), r = Math.round(s % 60);
    return m === 0 ? r + 's' : m + 'min ' + r + 's';
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // === Geldbeträge ===
  // Rappen -> "25.95" (immer mit zwei Stellen, Schweizer Schreibweise)
  function fr(rappen) {
    var neg = rappen < 0;
    var v = Math.abs(Math.round(rappen));
    var f = Math.floor(v / 100), r = v % 100;
    return (neg ? '−' : '') + f + '.' + (r < 10 ? '0' + r : r);
  }

  // Note anzeigen: 10.-, 20.-, 50.-, 100.-
  function frNote(rappen) { return Math.round(rappen / 100) + '.-'; }

  // Eingabe "2595" oder "25.95" -> Rappen. null wenn unbrauchbar.
  function parseMoney(txt) {
    if (txt === null || txt === undefined) return null;
    var s = String(txt).trim().replace(',', '.');
    if (s === '') return null;
    if (!/^[0-9]*\.?[0-9]*$/.test(s)) return null;
    var parts = s.split('.');
    var f = parts[0] === '' ? 0 : parseInt(parts[0], 10);
    var r = 0;
    if (parts.length > 1 && parts[1] !== '') {
      var d = (parts[1] + '00').slice(0, 2);
      r = parseInt(d, 10);
    }
    if (isNaN(f) || isNaN(r)) return null;
    return f * 100 + r;
  }

  // Eingabe für reine Rappen-Schritte ("wie viele Rappen?") -> ganze Zahl
  function parseInt0(txt) {
    if (txt === null || txt === undefined) return null;
    var s = String(txt).trim();
    if (s === '' || !/^[0-9]+$/.test(s)) return null;
    var n = parseInt(s, 10);
    return isNaN(n) ? null : n;
  }

  // === Fehler merken ===
  // Schlüssel = Art des Fehlers, damit die Elternstatistik etwas Sinnvolles zeigt
  function recordError(label) {
    gameErrors[label] = (gameErrors[label] || 0) + 1;
  }

  function saveGameErrors() {
    var list = [], k;
    for (k in gameErrors) if (gameErrors[k] > 0) list.push({ word: k, count: gameErrors[k] });
    var all = loadS(STORAGE_ERRORS, []);
    all.push(list);
    if (all.length > MAX_ERROR_GAMES) all = all.slice(all.length - MAX_ERROR_GAMES);
    saveS(STORAGE_ERRORS, all);
  }

  // === Historie ===
  function saveGameHistory(rec) {
    var h = loadS(STORAGE_HISTORY, []);
    h.push(rec);
    if (h.length > 50) h = h.slice(h.length - 50);
    saveS(STORAGE_HISTORY, h);
  }

  function renderHistory() {
    var wrap = document.getElementById('ge-history-list');
    if (!wrap) return;
    var history = loadS(STORAGE_HISTORY, []);
    if (history.length === 0) {
      wrap.innerHTML = '<p class="history-empty">Noch keine Spiele gespielt.</p>';
      return;
    }
    var html = '';
    for (var i = history.length - 1; i >= 0; i--) {
      var g = history[i];
      html += '<div class="history-entry"><div class="history-header">' +
              '<span class="history-date">' + esc(g.date) + '</span>' +
              '<span class="history-pct">' + g.correctPct + '% richtig</span></div>';
      html += '<div class="history-details"><span>' + g.totalTasks + ' Aufgaben</span>' +
              '<span>' + esc(g.modeLabel || '') + '</span>' +
              '<span>' + formatTime(g.durationSec) + '</span></div>';
      if (g.wrongTasks && g.wrongTasks.length > 0) {
        html += '<div class="history-wrong-tasks"><span class="history-wrong-label">Schwierig: </span>' +
                '<span class="history-wrong-list">' + esc(g.wrongTasks.join(', ')) + '</span></div>';
      }
      html += '</div>';
    }
    wrap.innerHTML = html;
  }

  // === Aufgaben erzeugen ===
  function randInt(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }

  // Preis in Rappen innerhalb der Produktgrenzen, gerundet auf 5 Rappen
  // (5-Rappen-Schritte gibt es in der Schweiz wirklich — 1er und 2er nicht).
  function randPrice(p) {
    var v = randInt(p.min, p.max);
    return Math.round(v / 5) * 5;
  }

  // Eine Rückgeld-Aufgabe: zwei verschiedene Produkte, Total < 100.-,
  // Note nie kleiner als das Total.
  function makeChangeTask() {
    for (var attempt = 0; attempt < 200; attempt++) {
      var i = randInt(0, PRODUCTS.length - 1);
      var j = randInt(0, PRODUCTS.length - 1);
      if (i === j) continue;
      var a = PRODUCTS[i], b = PRODUCTS[j];
      var pa = randPrice(a), pb = randPrice(b);
      var total = pa + pb;
      if (total >= 10000) continue;        // Total muss unter 100.- bleiben
      if (total < 300) continue;           // zu billig wäre langweilig

      // Kleinste Note, die reicht — plus manchmal die nächstgrössere, damit
      // die Aufgaben abwechslungsreich sind. Note ist NIE kleiner als total.
      var fitting = [];
      for (var n = 0; n < NOTES.length; n++) if (NOTES[n] >= total) fitting.push(NOTES[n]);
      if (fitting.length === 0) continue;
      // Bevorzugt die kleinste passende Note (sonst wird das Rückgeld riesig),
      // gelegentlich die nächstgrössere.
      var note = fitting[0];
      if (fitting.length > 1 && Math.random() < 0.35) note = fitting[1];
      if (note === total) continue;        // Rückgeld 0 wäre keine Aufgabe

      return {
        kind: 'change',
        a: a, b: b, pa: pa, pb: pb,
        total: total, note: note, change: note - total
      };
    }
    // Sicherheitsnetz (sollte nie gebraucht werden)
    return { kind: 'change', a: PRODUCTS[0], b: PRODUCTS[8], pa: 495, pb: 910,
             total: 1405, note: 2000, change: 595 };
  }

  // Eine Aufgabe "mehrere Stücke": Stückpreis x Anzahl
  function makeMultiTask() {
    var p = PRODUCTS[randInt(0, PRODUCTS.length - 1)];
    // Stückpreis bewusst niedrig halten, damit das Total handlich bleibt
    var unit = Math.round(randInt(Math.min(p.min, 90), Math.min(p.max, 950)) / 5) * 5;
    if (unit < 50) unit = 50;
    var qty = randInt(2, 10);
    return { kind: 'multi', p: p, unit: unit, qty: qty, total: unit * qty };
  }

  function buildTasks() {
    var t = [];
    for (var i = 0; i < selectedCount; i++) {
      t.push(mode === 'multi' ? makeMultiTask() : makeChangeTask());
    }
    return t;
  }

  // === Rückgeld-Schritte aufbauen ===
  // Gezählt wird aufwärts vom Total zur Note, genau wie am Ladentisch:
  //   1. Rappen bis zum nächsten ganzen Franken
  //   2. Franken bis zum nächsten Zehner
  //   3. Zehner bis zur Note
  // Schritte, die 0 ergeben würden, werden weggelassen. Am Ende kommt immer
  // die Frage nach dem gesamten Rückgeld.
  function buildChangeSteps(total, note) {
    var steps = [];
    var cur = total;

    // --- 1. Rappen auf den nächsten Franken ---
    var rap = cur % 100;
    if (rap !== 0) {
      var needRap = 100 - rap;
      steps.push({
        type: 'rappen',
        question: 'Wie viele Rappen fehlen von ' + fr(cur) + ' bis zum nächsten ganzen Franken?',
        hint: 'Ein Franken hat 100 Rappen. ' + fr(cur) + ' hat ' + rap + ' Rappen. ' +
              '100 − ' + rap + ' = ' + needRap + ' Rappen. Dann bist du bei ' + fr(cur + needRap) + '.',
        answer: needRap,
        unit: 'Rappen',
        from: cur,
        to: cur + needRap
      });
      cur += needRap;
    }

    // --- 2. Franken auf den nächsten Zehner ---
    var frankenTotal = cur / 100;                 // jetzt eine ganze Zahl
    var einer = frankenTotal % 10;
    if (einer !== 0 && cur < note) {
      var needFr = 10 - einer;
      var toVal = cur + needFr * 100;
      if (toVal <= note) {
        steps.push({
          type: 'franken',
          question: 'Wie viele Franken fehlen von ' + fr(cur) + ' bis zum nächsten Zehner?',
          hint: 'Der nächste Zehner nach ' + frankenTotal + ' ist ' + (frankenTotal + needFr) + '. ' +
                (frankenTotal + needFr) + ' − ' + frankenTotal + ' = ' + needFr + ' Franken. ' +
                'Dann bist du bei ' + fr(toVal) + '.',
          answer: needFr,
          unit: 'Franken',
          from: cur,
          to: toVal
        });
        cur = toVal;
      }
    }

    // --- 3. Zehner bis zur Note ---
    if (cur < note) {
      var restFr = (note - cur) / 100;
      steps.push({
        type: 'zehner',
        question: 'Wie viele Franken fehlen von ' + fr(cur) + ' bis ' + frNote(note) + '?',
        hint: frNote(note) + ' sind ' + (note / 100) + ' Franken, du bist bei ' + (cur / 100) + ' Franken. ' +
              (note / 100) + ' − ' + (cur / 100) + ' = ' + restFr + ' Franken.',
        answer: restFr,
        unit: 'Franken',
        from: cur,
        to: note
      });
      cur = note;
    }

    // --- 4. Das gesamte Rückgeld ---
    var pieces = [];
    for (var i = 0; i < steps.length; i++) {
      pieces.push(steps[i].unit === 'Rappen'
        ? (steps[i].answer + ' Rappen')
        : (steps[i].answer + ' Franken'));
    }
    steps.push({
      type: 'result',
      question: 'Und jetzt alles zusammen: wie viel Rückgeld bekommst du?',
      hint: 'Zähle deine Schritte zusammen: ' + pieces.join(' + ') + ' = ' + fr(note - total) + '.',
      answer: note - total,
      unit: 'money',
      from: total,
      to: note
    });

    return steps;
  }

  // === Wake Lock (Bildschirm bleibt an) ===
  async function requestWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', function () { wakeLock = null; });
      }
    } catch (e) {}
  }
  function releaseWakeLock() { if (wakeLock) { wakeLock.release(); wakeLock = null; } }

  // === Startscreen ===
  function selectMode(btn) {
    var btns = document.querySelectorAll('#ge-mode-selector .cat-btn');
    for (var i = 0; i < btns.length; i++) btns[i].classList.remove('selected');
    btn.classList.add('selected');
    mode = btn.getAttribute('data-mode');
    updateStartInfo();
  }

  function selectCount(btn) {
    var btns = document.querySelectorAll('#ge-count-selector .count-btn');
    for (var i = 0; i < btns.length; i++) btns[i].classList.remove('selected');
    btn.classList.add('selected');
    selectedCount = parseInt(btn.getAttribute('data-count'), 10);
    updateStartInfo();
  }

  function modeLabel() {
    return mode === 'multi' ? 'Mehrere Stücke' : 'Rückgeld';
  }

  function updateStartInfo() {
    var el = document.getElementById('ge-start-count');
    if (el) el.textContent = selectedCount + ' Aufgaben — ' + modeLabel();
    var hint = document.getElementById('ge-mode-hint');
    if (hint) {
      hint.textContent = (mode === 'multi')
        ? 'Du rechnest, was mehrere gleiche Sachen zusammen kosten.'
        : 'Du rechnest zwei Preise zusammen und dann das Rückgeld — Schritt für Schritt.';
    }
  }

  function initStart() {
    updateStartInfo();
    renderHistory();
    APP.updatePointsDisplays();
  }

  // === Spiel starten ===
  function startGame() {
    tasks = buildTasks();
    if (tasks.length === 0) return;
    TOTAL = tasks.length;
    correctCount = 0; wrongCount = 0; questionNumber = 0;
    gameErrors = {}; gameStartTime = Date.now(); gameEnded = false; locked = false;

    document.getElementById('ge-start-screen').classList.add('hidden');
    document.getElementById('ge-game-screen').classList.remove('hidden');

    promptEl = document.getElementById('ge-prompt');
    scoreText = document.getElementById('ge-score-text');
    progressFill = document.getElementById('ge-progress-fill');
    questionArea = document.getElementById('ge-question-area');
    mouseImg = document.getElementById('ge-mouse-img');
    particlesEl = document.getElementById('ge-particles');
    endScreen = document.getElementById('ge-end');
    endTitle = document.getElementById('ge-end-title');
    endMessage = document.getElementById('ge-end-msg');
    endStats = document.getElementById('ge-end-stats');

    mouseImg.src = mouseCorrect;
    mouseImg.style.opacity = '1';
    requestWakeLock();

    queue = [];
    for (var i = 0; i < tasks.length; i++) queue.push(i);
    shuffleArray(queue);
    updateScore();
    loadQuestion();
  }

  function backToStart() {
    releaseWakeLock();
    if (endScreen) endScreen.classList.add('hidden');
    if (questionArea) questionArea.classList.remove('hidden');
    var scene = document.getElementById('ge-scene');
    if (scene) scene.classList.remove('hidden');
    document.getElementById('ge-game-screen').classList.add('hidden');
    document.getElementById('ge-start-screen').classList.remove('hidden');
    initStart();
    APP.updatePointsDisplays();
  }

  function endEarly() {
    if (gameEnded) return;
    if (correctCount + wrongCount === 0) { backToStart(); return; }
    TOTAL = correctCount + wrongCount;
    queue = [];
    showEnd();
  }

  function updateScore() {
    if (!scoreText) return;
    scoreText.textContent = correctCount + ' / ' + TOTAL;
    progressFill.style.width = ((correctCount / TOTAL) * 100) + '%';
  }

  function setMouseImage(src, anim) {
    if (!mouseImg) return;
    if (mouseImg.src.indexOf(src) !== -1) return;
    if (anim) {
      mouseImg.style.opacity = '0';
      setTimeout(function () { mouseImg.src = src; mouseImg.style.opacity = '1'; }, 200);
    } else {
      mouseImg.src = src; mouseImg.style.opacity = '1';
    }
  }

  // === Partikel / Konfetti ===
  function spawnParticles(count) {
    var em = ['sparkles', 'star', 'heart', 'party'];
    for (var i = 0; i < count; i++) {
      (function (idx) {
        setTimeout(function () {
          var el = document.createElement('span');
          el.className = 'particle';
          el.textContent = emojiMap[em[idx % em.length]];
          el.style.left = (10 + Math.random() * 80) + '%';
          el.style.top = (30 + Math.random() * 50) + '%';
          el.style.fontSize = (16 + Math.random() * 14) + 'px';
          el.style.animationDuration = (1.2 + Math.random() * 0.8) + 's';
          particlesEl.appendChild(el);
          setTimeout(function () { el.remove(); }, 2200);
        }, idx * 70);
      })(i);
    }
  }

  function spawnConfetti(count) {
    for (var i = 0; i < count; i++) {
      (function (idx) {
        setTimeout(function () {
          var el = document.createElement('div');
          el.className = 'confetti';
          el.style.left = (Math.random() * 100) + '%';
          el.style.top = (-5 - Math.random() * 10) + '%';
          el.style.background = confettiColors[idx % confettiColors.length];
          el.style.width = (5 + Math.random() * 5) + 'px';
          el.style.height = (7 + Math.random() * 7) + 'px';
          el.style.animationDuration = (1.4 + Math.random()) + 's';
          el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
          particlesEl.appendChild(el);
          setTimeout(function () { el.remove(); }, 2800);
        }, idx * 35);
      })(i);
    }
  }

  function spawnFinalCelebration() {
    var em = ['✨', '⭐', '❤️', '🎉', '🎊', '🌟', '🌻', '🦋', '🌈'];
    for (var i = 0; i < 25; i++) {
      (function (idx) {
        setTimeout(function () {
          var el = document.createElement('span');
          el.className = 'burst';
          el.textContent = em[idx % em.length];
          el.style.left = '50%'; el.style.top = '50%';
          var angle = (idx / 25) * Math.PI * 2, dist = 70 + Math.random() * 100;
          var dx = Math.cos(angle) * dist, dy = Math.sin(angle) * dist;
          el.style.setProperty('--dx', dx + 'px');
          el.style.setProperty('--dy', dy + 'px');
          el.style.setProperty('--dx2', (dx * 1.4) + 'px');
          el.style.setProperty('--dy2', (dy * 1.4) + 'px');
          particlesEl.appendChild(el);
          setTimeout(function () { el.remove(); }, 2800);
        }, idx * 50);
      })(i);
    }
    spawnConfetti(30);
  }

  // === Aufgabe anzeigen ===
  function currentTask() { return tasks[queue[0]]; }

  function loadQuestion() {
    if (queue.length === 0) { showEnd(); return; }
    questionNumber++;
    var t = currentTask();
    phase = (t.kind === 'multi') ? 'multi' : 'sum';
    sumTries = 0;
    stepIndex = 0;
    taskHadError = false;
    currentInput = '';
    locked = false;
    changeSteps = (t.kind === 'change') ? buildChangeSteps(t.total, t.note) : [];
    promptEl.textContent = 'Aufgabe ' + questionNumber + ' — noch ' + queue.length + ' offen';
    render();
  }

  // Baut den Inhalt der Aufgabe neu auf. Ein einziger Ort für alle Phasen —
  // dadurch bleibt der Bildschirm immer konsistent.
  function render() {
    var box = document.getElementById('ge-body');
    if (!box) return;
    var t = currentTask();
    if (!t) return;

    if (t.kind === 'multi') { box.innerHTML = renderMulti(t); }
    else if (phase === 'sum') { box.innerHTML = renderSum(t); }
    else { box.innerHTML = renderChange(t); }

    focusInput();
  }

  function focusInput() {
    var inp = document.getElementById('ge-input');
    if (inp) { try { inp.focus(); } catch (e) {} }
  }

  function productCardHtml(p, price) {
    return '<div class="ge-prod">' +
             '<img class="ge-prod-img" src="' + p.img + '" alt="' + esc(p.name) + '">' +
             '<span class="ge-prod-name">' + esc(p.name) + '</span>' +
             '<span class="ge-prod-price">' + fr(price) + '</span>' +
           '</div>';
  }

  // --- Banknote als Bild ---
  // Bewusst als SVG gezeichnet und nicht als gemaltes PNG: der Betrag ist
  // rechnerisch entscheidend, und eine Schrift im SVG ist immer korrekt und
  // scharf — ein generiertes Bild könnte "20.-" falsch schreiben.
  // Farben orientieren sich an den echten Schweizer Noten:
  // 10 gelb-orange, 20 rot, 50 grün-gelb, 100 blau.
  var NOTE_LOOKS = {
    1000:  { name: '10',  bg1: '#f6d68a', bg2: '#e8a53f', ink: '#7a4a08', line: '#c98a2c' },
    2000:  { name: '20',  bg1: '#f3b19c', bg2: '#d9604a', ink: '#7d2317', line: '#c2503c' },
    5000:  { name: '50',  bg1: '#dce79a', bg2: '#a2b84a', ink: '#4a5510', line: '#8da03a' },
    10000: { name: '100', bg1: '#aecbe6', bg2: '#5d8fc0', ink: '#1d3d5c', line: '#4a79a8' }
  };

  // size: 'sm' (Kopfzeile) oder 'lg' (grosse Ansicht)
  function noteBillHtml(note, size) {
    var lk = NOTE_LOOKS[note] || NOTE_LOOKS[10000];
    var w = size === 'lg' ? 260 : 150;
    var h = Math.round(w * 0.52);
    var gid = 'ngr' + note + size;
    // viewBox bleibt konstant, damit alle Noten gleich aufgebaut sind und nur
    // die Anzeigegrösse wechselt.
    return '<svg class="ge-bill ge-bill-' + size + '" width="' + w + '" height="' + h + '" ' +
           'viewBox="0 0 260 135" role="img" ' +
           'aria-label="Banknote ' + lk.name + ' Franken">' +
             '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="1" y2="1">' +
               '<stop offset="0%" stop-color="' + lk.bg1 + '"/>' +
               '<stop offset="100%" stop-color="' + lk.bg2 + '"/>' +
             '</linearGradient></defs>' +
             '<rect x="2" y="2" width="256" height="131" rx="10" fill="url(#' + gid + ')" ' +
               'stroke="' + lk.line + '" stroke-width="3"/>' +
             '<rect x="12" y="12" width="236" height="111" rx="6" fill="none" ' +
               'stroke="' + lk.ink + '" stroke-width="1.5" opacity="0.35"/>' +
             // kleines Muster links, damit es nach Note aussieht
             '<circle cx="42" cy="67" r="21" fill="none" stroke="' + lk.ink + '" ' +
               'stroke-width="2" opacity="0.4"/>' +
             '<circle cx="42" cy="67" r="13" fill="none" stroke="' + lk.ink + '" ' +
               'stroke-width="1.5" opacity="0.3"/>' +
             '<text x="163" y="82" text-anchor="middle" font-size="54" font-weight="800" ' +
               'fill="' + lk.ink + '" font-family="-apple-system, system-ui, sans-serif">' +
               lk.name + '</text>' +
             '<text x="163" y="106" text-anchor="middle" font-size="15" font-weight="700" ' +
               'fill="' + lk.ink + '" opacity="0.8" ' +
               'font-family="-apple-system, system-ui, sans-serif">FRANKEN</text>' +
             '<text x="26" y="30" font-size="13" font-weight="700" fill="' + lk.ink + '" ' +
               'opacity="0.75" font-family="-apple-system, system-ui, sans-serif">CHF</text>' +
           '</svg>';
  }

  function noteHtml(note) {
    return '<div class="ge-note"><span class="ge-note-label">Du bezahlst mit</span>' +
           noteBillHtml(note, 'lg') + '</div>';
  }

  function inputRowHtml(placeholder, unitLabel) {
    return '<div class="ge-input-row">' +
             '<input type="text" id="ge-input" class="form-input ge-input" inputmode="decimal" ' +
             'autocomplete="off" autocorrect="off" spellcheck="false" ' +
             'placeholder="' + esc(placeholder) + '" onkeydown="return GE.inputKey(event)">' +
             (unitLabel ? '<span class="ge-input-unit">' + esc(unitLabel) + '</span>' : '') +
             '<button class="small-btn ge-check-btn" onclick="GE.submit()">Prüfen</button>' +
           '</div>' +
           '<div id="ge-feedback" class="hidden"></div>';
  }

  // --- Schritt 1: die zwei Preise zusammenrechnen ---
  function renderSum(t) {
    var html = '<div class="ge-step-label">Schritt 1 von 2 — zusammenrechnen</div>';
    html += '<div class="ge-prod-row">' + productCardHtml(t.a, t.pa) + productCardHtml(t.b, t.pb) + '</div>';
    html += noteHtml(t.note);
    html += '<p class="ge-question">Was kostet alles zusammen?</p>';

    // Nach einem Fehler: die zwei Zahlen untereinander, wie im Heft.
    if (sumTries > 0) {
      html += '<div class="ge-column-add">' +
                '<div class="ge-col-line">' + fr(t.pa) + '</div>' +
                '<div class="ge-col-line"><span class="ge-col-op">+</span>' + fr(t.pb) + '</div>' +
                '<div class="ge-col-rule"></div>' +
                '<div class="ge-col-result">?</div>' +
              '</div>';
      html += '<p class="ge-help">Schreibe das Resultat unter die Linie. Tipp: rechne zuerst die ' +
              'Rappen, dann die Franken.</p>';
    }

    html += inputRowHtml('z.B. 35.05', 'Fr.');
    return html;
  }

  // --- Schritt 2: das Rückgeld in kleinen Schritten ---
  function renderChange(t) {
    var st = changeSteps[stepIndex];
    var html = '<div class="ge-step-label">Schritt 2 von 2 — Rückgeld</div>';

    // Kopfzeile: was schon bekannt ist. Gross und mit Bild der Note, damit das
    // Kind jederzeit sieht, womit bezahlt wurde.
    html += '<div class="ge-summary">' +
              '<div class="ge-sum-box">' +
                '<span class="ge-sum-lbl">Einkauf</span>' +
                '<span class="ge-sum-val">' + fr(t.total) + '</span>' +
              '</div>' +
              '<div class="ge-sum-box ge-sum-note">' +
                '<span class="ge-sum-lbl">Bezahlt mit</span>' +
                noteBillHtml(t.note, 'sm') +
              '</div>' +
            '</div>';

    // Bisherige Schritte als kleine Treppe — das Kind sieht den Weg
    if (stepIndex > 0) {
      html += '<div class="ge-ladder">';
      for (var i = 0; i < stepIndex; i++) {
        var d = changeSteps[i];
        if (d.type === 'result') continue;
        html += '<div class="ge-ladder-row">' + fr(d.from) + ' <span class="ge-arrow">+ ' +
                d.answer + ' ' + esc(d.unit) + ' →</span> ' + fr(d.to) + '</div>';
      }
      html += '</div>';
    }

    html += '<p class="ge-question">' + esc(st.question) + '</p>';
    html += '<div id="ge-help-box" class="hidden"></div>';

    if (st.unit === 'money') html += inputRowHtml('z.B. 4.05', 'Fr.');
    else html += inputRowHtml('Zahl eingeben', st.unit);

    return html;
  }

  // --- Unterspiel 2: mehrere Stücke ---
  function renderMulti(t) {
    var html = '<div class="ge-step-label">Preis für mehrere Stücke</div>';
    html += '<div class="ge-prod-row">' + productCardHtml(t.p, t.unit) + '</div>';
    html += '<div class="ge-price-table">' +
              '<div class="ge-pt-head"><span>Stück</span><span>Preis Fr.</span></div>' +
              '<div class="ge-pt-row"><span>1</span><span>' + fr(t.unit) + '</span></div>' +
              '<div class="ge-pt-row ge-pt-ask"><span>' + t.qty + '</span><span>?</span></div>' +
            '</div>';
    html += '<p class="ge-question">Was kosten ' + t.qty + ' Stück zusammen?</p>';
    html += '<div id="ge-help-box" class="hidden"></div>';
    html += inputRowHtml('z.B. 13.50', 'Fr.');
    return html;
  }

  // === Eingabe ===
  function inputKey(ev) {
    if (ev && (ev.key === 'Enter' || ev.keyCode === 13)) {
      submit();
      return false;
    }
    return true;
  }

  function setFeedback(html, cls) {
    var fb = document.getElementById('ge-feedback');
    if (!fb) return;
    fb.innerHTML = html;
    fb.className = cls || '';
  }

  function showHelp(html) {
    var box = document.getElementById('ge-help-box');
    if (!box) return;
    box.innerHTML = '<span class="ge-help-title">Hilfe</span>' + html;
    box.className = 'ge-help-box';
  }

  function submit() {
    if (locked) return;
    var inp = document.getElementById('ge-input');
    if (!inp) return;
    var raw = inp.value;
    if (String(raw).trim() === '') return;
    var t = currentTask();

    if (t.kind === 'multi') { checkMulti(t, raw); return; }
    if (phase === 'sum') { checkSum(t, raw); return; }
    checkChangeStep(t, raw);
  }

  // --- Prüfen: Summe der zwei Preise ---
  function checkSum(t, raw) {
    var val = parseMoney(raw);
    if (val === null) { setFeedback('Bitte einen Betrag eingeben, z.B. 35.05', 'wrong-fb'); return; }

    if (val === t.total) {
      setFeedback('Richtig! ' + fr(t.pa) + ' + ' + fr(t.pb) + ' = <strong>' + fr(t.total) + '</strong>', 'correct-fb');
      setMouseImage(mouseCorrect, true);
      spawnParticles(4);
      locked = true;
      // Weiter zu Schritt 2
      setTimeout(function () {
        phase = 'change';
        stepIndex = 0;
        locked = false;
        render();
      }, 1400);
      return;
    }

    // Falsch: Untereinander-Rechnung einblenden (beim ersten Fehler)
    taskHadError = true;
    sumTries++;
    recordError('Zusammenrechnen');
    setMouseImage(mouseSad, true);
    setTimeout(function () { setMouseImage(mouseCorrect, true); }, 1400);

    if (sumTries === 1) {
      render();   // zeigt jetzt die Spaltenrechnung
      setFeedback('Noch nicht ganz. Schau die Rechnung untereinander an und versuche es nochmal.', 'wrong-fb');
    } else if (sumTries === 2) {
      var rapA = t.pa % 100, rapB = t.pb % 100;
      showHelpInSum('Rechne zuerst die Rappen: ' + rapA + ' + ' + rapB + ' = ' + (rapA + rapB) +
                    ' Rappen. Dann die Franken: ' + Math.floor(t.pa / 100) + ' + ' + Math.floor(t.pb / 100) +
                    ' = ' + (Math.floor(t.pa / 100) + Math.floor(t.pb / 100)) + ' Franken.');
      setFeedback('Fast. Schau dir die Hilfe an.', 'wrong-fb');
    } else {
      // Nach drei Fehlversuchen die Lösung zeigen und weitergehen
      showHelpInSum('Die Lösung ist <strong>' + fr(t.total) + '</strong>. ' +
                    fr(t.pa) + ' + ' + fr(t.pb) + ' = ' + fr(t.total) + '.');
      setFeedback('Das Resultat ist ' + fr(t.total) + '. Weiter zum Rückgeld.', 'wrong-fb');
      locked = true;
      setTimeout(function () {
        phase = 'change';
        stepIndex = 0;
        locked = false;
        render();
      }, 3200);
    }
  }

  // Die Summen-Ansicht hat keine eigene Hilfebox im Markup — wir hängen sie
  // unter die Spaltenrechnung.
  function showHelpInSum(html) {
    var box = document.getElementById('ge-body');
    if (!box) return;
    var existing = document.getElementById('ge-help-box');
    if (existing) {
      existing.innerHTML = '<span class="ge-help-title">Hilfe</span>' + html;
      existing.className = 'ge-help-box';
      return;
    }
    var div = document.createElement('div');
    div.id = 'ge-help-box';
    div.className = 'ge-help-box';
    div.innerHTML = '<span class="ge-help-title">Hilfe</span>' + html;
    var q = box.querySelector('.ge-input-row');
    if (q) box.insertBefore(div, q); else box.appendChild(div);
  }

  // --- Prüfen: ein Rückgeld-Teilschritt ---
  function checkChangeStep(t, raw) {
    var st = changeSteps[stepIndex];
    var val = (st.unit === 'money') ? parseMoney(raw) : parseInt0(raw);
    if (val === null) {
      setFeedback(st.unit === 'money' ? 'Bitte einen Betrag eingeben, z.B. 4.05'
                                      : 'Bitte eine ganze Zahl eingeben.', 'wrong-fb');
      return;
    }

    if (val === st.answer) {
      var okTxt = (st.type === 'result')
        ? ('Richtig! Du bekommst <strong>' + fr(st.answer) + '</strong> zurück.')
        : ('Richtig! ' + fr(st.from) + ' + ' + st.answer + ' ' + st.unit + ' = <strong>' + fr(st.to) + '</strong>');
      setFeedback(okTxt, 'correct-fb');
      setMouseImage(mouseCorrect, true);
      spawnParticles(3);
      locked = true;

      if (stepIndex < changeSteps.length - 1) {
        setTimeout(function () { stepIndex++; locked = false; render(); }, 1300);
      } else {
        finishTask(true);
      }
      return;
    }

    // Falsch: Hilfe einblenden
    taskHadError = true;
    recordError(st.type === 'result' ? 'Rückgeld zusammenzählen'
                                     : ('Rückgeld: ' + st.unit));
    showHelp(st.hint);
    setFeedback('Noch nicht. Die Hilfe zeigt dir den Weg.', 'wrong-fb');
    setMouseImage(mouseSad, true);
    setTimeout(function () { setMouseImage(mouseCorrect, true); }, 1400);
    var inp = document.getElementById('ge-input');
    if (inp) { inp.value = ''; focusInput(); }
  }

  // --- Prüfen: mehrere Stücke ---
  function checkMulti(t, raw) {
    var val = parseMoney(raw);
    if (val === null) { setFeedback('Bitte einen Betrag eingeben, z.B. 13.50', 'wrong-fb'); return; }

    if (val === t.total) {
      setFeedback('Richtig! ' + t.qty + ' × ' + fr(t.unit) + ' = <strong>' + fr(t.total) + '</strong>', 'correct-fb');
      setMouseImage(mouseCorrect, true);
      spawnParticles(4);
      finishTask(true);
      return;
    }

    taskHadError = true;
    recordError('Mehrere Stücke');
    var half = Math.floor(t.qty / 2);
    var hint = 'Rechne ' + t.qty + ' × ' + fr(t.unit) + '. ';
    if (half >= 2) {
      hint += 'Tipp: zuerst ' + half + ' Stück (' + fr(t.unit * half) + '), ' +
              'dann noch ' + (t.qty - half) + ' Stück (' + fr(t.unit * (t.qty - half)) + ') dazu.';
    } else {
      hint += 'Tipp: rechne zuerst die Franken, dann die Rappen, und zähle beides zusammen.';
    }
    showHelp(hint);
    setFeedback('Noch nicht. Die Hilfe zeigt dir den Weg.', 'wrong-fb');
    setMouseImage(mouseSad, true);
    setTimeout(function () { setMouseImage(mouseCorrect, true); }, 1400);
    var inp = document.getElementById('ge-input');
    if (inp) { inp.value = ''; focusInput(); }
  }

  // Aufgabe abgeschlossen: zählen, Punkt geben, nächste Aufgabe
  function finishTask() {
    locked = true;
    queue.shift();
    if (taskHadError) wrongCount++; else correctCount++;
    if (!taskHadError) APP.addPoint();
    updateScore();

    var p = correctCount / TOTAL;
    if (!taskHadError) {
      if (p < 0.5) spawnParticles(5);
      else if (p < 0.9) { spawnParticles(7); spawnConfetti(12); }
      else { spawnParticles(10); spawnConfetti(20); }
    }
    if (queue.length === 0 && correctCount === TOTAL) {
      setTimeout(function () { spawnFinalCelebration(); }, 300);
    }

    setTimeout(function () { locked = false; loadQuestion(); }, 1700);
  }

  // === Ende ===
  function showEnd() {
    if (gameEnded) return;
    gameEnded = true;
    if (questionArea) questionArea.classList.add('hidden');

    var dur = (Date.now() - gameStartTime) / 1000;
    var done = correctCount + wrongCount;
    var pct = done > 0 ? Math.round((correctCount / done) * 100) : 0;
    saveGameErrors();

    // Zeitstempel immer in Schweizer Zeit (siehe APP.nowCH)
    var ds = APP.nowCH();

    var wrongTasks = [], k;
    for (k in gameErrors) wrongTasks.push(k);

    saveGameHistory({
      date: ds,
      totalTasks: done,
      mode: mode,
      modeLabel: modeLabel(),
      correctPct: pct,
      durationSec: Math.round(dur),
      wrongTasks: wrongTasks
    });

    if (mouseImg) {
      mouseImg.src = (pct === 100) ? 'images/mouse_perfect.png' : mouseCorrect;
      mouseImg.style.opacity = '1';
    }

    if (pct === 100) { endTitle.textContent = 'Perfekt!'; endMessage.textContent = 'Alles auf Anhieb richtig — du bist ein Geld-Profi!'; }
    else if (pct >= 90) { endTitle.textContent = 'Super gemacht!'; endMessage.textContent = 'Fast alles beim ersten Mal richtig!'; }
    else if (pct >= 70) { endTitle.textContent = 'Gut!'; endMessage.textContent = 'Das klappt schon richtig gut!'; }
    else if (pct >= 50) { endTitle.textContent = 'Weiter so!'; endMessage.textContent = 'Mit etwas Übung wird es noch besser.'; }
    else { endTitle.textContent = 'Gut versucht!'; endMessage.textContent = 'Übe weiter — du schaffst das!'; }

    endStats.innerHTML = '<strong>' + correctCount + '</strong> von <strong>' + done +
      '</strong> Aufgaben ohne Hilfe richtig<br>' +
      '<strong>' + wrongCount + '</strong> mit Hilfe gelöst<br>' +
      'Trefferquote: <strong>' + pct + '%</strong><br>' +
      'Zeit: <strong>' + formatTime(Math.round(dur)) + '</strong>';

    endScreen.classList.remove('hidden');
    if (pct >= 90) setTimeout(function () { spawnFinalCelebration(); }, 500);
  }

  function toggleHistory() {
    var list = document.getElementById('ge-history-list');
    var btn = document.getElementById('ge-history-toggle');
    if (!list || !btn) return;
    if (list.classList.contains('hidden')) { list.classList.remove('hidden'); btn.textContent = 'Historie ausblenden'; }
    else { list.classList.add('hidden'); btn.textContent = 'Historie anzeigen'; }
  }

  return {
    selectMode: selectMode,
    selectCount: selectCount,
    startGame: startGame,
    submit: submit,
    inputKey: inputKey,
    backToStart: backToStart,
    endEarly: endEarly,
    toggleHistory: toggleHistory,
    initStart: initStart
  };
})();
