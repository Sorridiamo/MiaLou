/* game_hunderttausender.js — "Hunderttausender" (Stellenwert bis 999'999)
 *
 * Drei Aufgabentypen (wie auf den Arbeitsblättern):
 *   1) "zerlegen" — Zahl aus einer Summe schreiben
 *        z.B. 400'000 + 30'000 + 2'000 + 400 + 30 + 1  -> Tafel 4 3 2 4 3 1
 *   2) "wort"     — Zahlwort lesen und als Ziffern schreiben
 *        z.B. "vierundzwanzigtausendneunhundertzehn"   -> Tafel 0 2 4 9 1 0
 *   3) "tafel"    — einzelne Stellenwerte zu einer Zahl zusammensetzen
 *        z.B. 3HT 5H 4Z 3E 9T 1ZT                      -> Tafel 3 1 9 5 4 3
 *
 * Stellenwerte: HT = Hunderttausender, ZT = Zehntausender, T = Tausender,
 *               H = Hunderter, Z = Zehner, E = Einer.
 *
 * Eingabe: eine Stellenwerttafel mit 6 Kästchen (HT ZT T H Z E). Das Kind
 * tippt die Ziffern über einen Zahlenblock ein. Jedes Kästchen braucht eine
 * Ziffer (0, wo nichts steht).
 *
 * Speichert Historie + Fehlerliste über APP.gameLoad/gameSave — damit gehen
 * die Daten (wie bei allen anderen Spielen) automatisch in die Cloud und
 * bleiben bei Updates erhalten.
 */
var HT = (function () {
  'use strict';

  var STORAGE_ERRORS = 'hunderttausender_errors';
  var STORAGE_HISTORY = 'hunderttausender_history';
  var MAX_ERROR_GAMES = 5;
  var BREAK_EVERY = 20;

  var MODES = [
    { id: 'mix',          label: 'Gemischt' },
    { id: 'zerlegen',     label: 'Zahlen zerlegen' },
    { id: 'wort',         label: 'Lesen & schreiben' },
    { id: 'tafel',        label: 'Stellenwerttafel' },
    { id: 'nachbar',      label: 'Nachbarzahlen' },
    { id: 'zahlenstrahl', label: 'Zahlenstrahl' }
  ];
  var MODE_HINT = {
    mix:          'Alle Übungen gemischt.',
    zerlegen:     'Du siehst eine Summe (z.B. 400\'000 + 30\'000 + …) und schreibst die Zahl in die Tafel.',
    wort:         'Du liest ein Zahlwort und schreibst die Zahl in die Tafel.',
    tafel:        'Du siehst einzelne Stellenwerte (z.B. 3HT 9T 5H) und setzt die Zahl zusammen.',
    nachbar:      'Du siehst eine Zahl und suchst eine Nachbarzahl (z.B. 10\'000 mehr oder weniger).',
    zahlenstrahl: 'Du liest eine Zahl auf dem Zahlenstrahl ab und schreibst sie in die Tafel.'
  };
  var MODE_LABELS = {   // kurze Anweisung oben in der Aufgabe
    zerlegen:     'Schreibe die Zahl in die Stellenwerttafel.',
    wort:         'Lies und schreibe die Zahl.',
    tafel:        'Trage die Zahl in die Stellenwerttafel ein.',
    nachbar:      'Finde die gesuchte Nachbarzahl und schreibe sie in die Tafel.',
    zahlenstrahl: 'Welche Zahl zeigt die Markierung? Schreibe sie in die Tafel.'
  };

  var ABBR = ['HT', 'ZT', 'T', 'H', 'Z', 'E'];
  var PLACE = [100000, 10000, 1000, 100, 10, 1];

  var mouseCorrect = 'images/mouse_correct.png';
  var mouseSad = 'images/mouse_sad_wide.png';
  var breakImages = [
    'images/mouse_0.png','images/mouse_1.png','images/mouse_2.png','images/mouse_3.png',
    'images/mouse_4.png','images/mouse_5.png','images/mouse_6.png','images/mouse_perfect.png'
  ];
  var breakImageIndex = 0;
  var confettiColors = ['#f5b0c0','#f5d98e','#b8d8a3','#a8d4e6','#d8b4f0','#f0b880','#7ec88b','#e88080'];
  var emojiMap = { sparkles:'✨', star:'⭐', heart:'❤️', party:'🎉', tada:'🎊' };

  // Spielzustand
  var tasks = [], TOTAL = 0, queue = [];
  var correctCount = 0, wrongCount = 0, questionNumber = 0, answeredSinceBreak = 0;
  var locked = false, gameStartTime = 0, gameEnded = false;
  var gameErrors = {};
  var breakTimerInterval = null, wakeLock = null;

  var selectedMode = 'mix', selectedCount = 20;
  var fastGeschafftMode = false;
  var current = null;           // aktuelle Aufgabe { n, mode }
  var digits = ['', '', '', '', '', ''];
  var active = 0;
  var attempt = 0;               // 0 = erster Versuch, 1 = Korrekturversuch

  // DOM
  var scoreText, progressFill, questionArea, mouseImg, particlesEl;
  var endScreen, endTitle, endMessage, endStats;
  var promptLabelEl, taskDisplay, feedback, explainBox;
  var breakScreen, breakImage, breakTimer, breakTimerFill;
  var cellEls = [];

  function loadS(k, f) { return APP.gameLoad(k, f); }
  function saveS(k, d) { APP.gameSave(k, d); }
  function shuffleArray(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function formatTime(s) { var m = Math.floor(s / 60), r = Math.round(s % 60); return m === 0 ? r + 's' : m + 'min ' + r + 's'; }
  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // =====================================================================
  // === ZAHLEN-HILFSFUNKTIONEN ==========================================
  // =====================================================================

  // Apostroph als Tausendertrennzeichen (Schweizer Schreibweise): 319543 -> 319'543
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '’'); }

  // Die sechs Ziffern einer Zahl (mit führenden Nullen) als Zeichenkette.
  function digitsOf(n) { var s = String(n); while (s.length < 6) s = '0' + s; return s; }

  // Summe aus Stellenwerten: 432431 -> "400'000 + 30'000 + 2'000 + 400 + 30 + 1"
  function decompose(n) {
    var str = digitsOf(n), parts = [];
    for (var i = 0; i < 6; i++) {
      var d = parseInt(str.charAt(i), 10);
      if (d > 0) parts.push(fmt(d * PLACE[i]));
    }
    if (parts.length === 0) parts.push('0');
    return parts.join(' + ');
  }

  // Durcheinandergewürfelte Stellenwerte: 319543 -> z.B. "3HT 5H 4Z 3E 9T 1ZT"
  function tokensStr(n) {
    var str = digitsOf(n), arr = [];
    for (var i = 0; i < 6; i++) {
      var d = parseInt(str.charAt(i), 10);
      if (d > 0) arr.push(d + ABBR[i]);
    }
    if (arr.length === 0) arr.push('0E');
    shuffleArray(arr);
    return arr.join('  ');   // zwei breite Leerzeichen zwischen den Teilen
  }

  // === Zahl als deutsches Zahlwort (1..999999, Schweizer Schreibweise: "ss") ===
  var ONES = ['null','eins','zwei','drei','vier','fünf','sechs','sieben','acht','neun'];
  var TEENS = { 10:'zehn',11:'elf',12:'zwölf',13:'dreizehn',14:'vierzehn',15:'fünfzehn',
                16:'sechzehn',17:'siebzehn',18:'achtzehn',19:'neunzehn' };
  var TENS = { 2:'zwanzig',3:'dreissig',4:'vierzig',5:'fünfzig',6:'sechzig',7:'siebzig',8:'achtzig',9:'neunzig' };

  function sub100(r) {
    if (r <= 0) return '';
    if (r < 10) return ONES[r];
    if (r < 20) return TEENS[r];
    var t = Math.floor(r / 10), o = r % 10;
    if (o === 0) return TENS[t];
    return (o === 1 ? 'ein' : ONES[o]) + 'und' + TENS[t];
  }

  function sub1000(n) {
    if (n <= 0) return '';
    var h = Math.floor(n / 100), r = n % 100, s = '';
    if (h > 0) s += (h === 1 ? 'ein' : ONES[h]) + 'hundert';
    if (r > 0) s += sub100(r);
    return s;
  }

  function numberToWords(n) {
    if (n === 0) return 'null';
    var th = Math.floor(n / 1000), r = n % 1000, s = '';
    if (th > 0) {
      // Tausender-Gruppe: eine alleinstehende "1" am Ende wird vor "tausend"
      // zu "ein" (z.B. 1000 = "eintausend", 201000 = "zweihunderteintausend").
      s += sub1000(th).replace(/eins$/, 'ein') + 'tausend';
    }
    if (r > 0) s += sub1000(r);
    return s;
  }

  // === Zufallszahl: meist 6-stellig (Hunderttausender), manchmal 5-stellig ===
  function generateNumber() {
    if (Math.random() < 0.7) return 100000 + Math.floor(Math.random() * 900000); // 100'000–999'999
    return 10000 + Math.floor(Math.random() * 90000);                            // 10'000–99'999
  }

  function randMode() {
    var m = ['zerlegen', 'wort', 'tafel'];
    return m[Math.floor(Math.random() * 3)];
  }

  // Für "Gemischt": alle fünf Aufgabentypen gleich wahrscheinlich.
  function randModeFull() {
    var m = ['zerlegen', 'wort', 'tafel', 'nachbar', 'zahlenstrahl'];
    return m[Math.floor(Math.random() * m.length)];
  }

  // === Aufgabentyp "Nachbarzahlen" ===
  // Zu einer Zahl wird eine bestimmte Nachbarzahl gesucht (Vorgänger/
  // Nachfolger, oder ±10'000 / ±100'000). Die Antwort (die Nachbarzahl)
  // kommt unverändert in die bestehende Stellenwerttafel-Eingabe.
  var NACHBAR_OFFSETS = [
    { delta: -1,      label: 'Vorgänger (−1)' },
    { delta: 1,       label: 'Nachfolger (+1)' },
    { delta: -10000,  label: '10\'000 weniger' },
    { delta: 10000,   label: '10\'000 mehr' },
    { delta: -100000, label: '100\'000 weniger' },
    { delta: 100000,  label: '100\'000 mehr' }
  ];
  function generateNachbarTask() {
    for (var tries = 0; tries < 30; tries++) {
      var o = NACHBAR_OFFSETS[Math.floor(Math.random() * NACHBAR_OFFSETS.length)];
      var base = generateNumber();
      var answer = base + o.delta;
      if (answer >= 0 && answer <= 999999) {
        return { n: answer, base: base, offsetLabel: o.label };
      }
    }
    return { n: 490000, base: 500000, offsetLabel: '10\'000 weniger' };
  }

  // === Aufgabentyp "Zahlenstrahl" ===
  // Ein Zahlenstrahl-Abschnitt (start -> end) wird in 10 gleiche Teile
  // geteilt; eine Markierung zeigt auf einen der Teilstriche. Gesucht ist
  // die Zahl an dieser Markierung.
  function generateZahlenstrahlTask() {
    var spans = [1000, 10000, 100000];
    var span = spans[Math.floor(Math.random() * spans.length)];
    var stepsAvail = Math.floor((999999 - span) / span);
    var start = Math.floor(Math.random() * (stepsAvail + 1)) * span;
    var end = start + span;
    var tickIndex = 1 + Math.floor(Math.random() * 9); // 1..9 (nie am Rand)
    var value = start + (tickIndex * span) / 10;
    return { n: value, start: start, end: end, tickIndex: tickIndex };
  }

  // Zeichnet den Zahlenstrahl als HTML (reines CSS, keine Bilder).
  function renderNumberLine(start, end, tickIndex) {
    var ticks = '';
    for (var i = 1; i <= 9; i++) {
      ticks += '<div class="ht-nl-tick" style="left:' + (i * 10) + '%"></div>';
    }
    var markerPct = tickIndex * 10;
    return '<div class="ht-numberline-wrap">' +
      '<div class="ht-nl-labels"><span>' + fmt(start) + '</span><span>' + fmt(end) + '</span></div>' +
      '<div class="ht-numberline">' + ticks +
      '<div class="ht-nl-marker" style="left:' + markerPct + '%">▲</div>' +
      '</div></div>';
  }

  // =====================================================================
  // === FEHLER + HISTORIE ===============================================
  // =====================================================================
  function recordError(n) { gameErrors[n] = (gameErrors[n] || 0) + 1; }

  function saveGameErrors() {
    var list = [];
    for (var k in gameErrors) if (gameErrors[k] > 0) list.push({ n: parseInt(k, 10), count: gameErrors[k] });
    var all = loadS(STORAGE_ERRORS, []);
    all.push(list);
    if (all.length > MAX_ERROR_GAMES) all = all.slice(all.length - MAX_ERROR_GAMES);
    saveS(STORAGE_ERRORS, all);
  }

  function getWeightedErrors() {
    var all = loadS(STORAGE_ERRORS, []), w = {}, i, j;
    for (i = 0; i < all.length; i++) {
      var wt = i + 1, g = all[i] || [];
      for (j = 0; j < g.length; j++) { var e = g[j]; if (e && typeof e.n !== 'undefined') w[e.n] = (w[e.n] || 0) + (e.count || 1) * wt; }
    }
    var sorted = [];
    for (var key in w) sorted.push({ n: parseInt(key, 10), score: w[key] });
    sorted.sort(function (a, b) { return b.score - a.score; });
    return sorted.slice(0, 30);
  }

  function saveGameHistory(rec) {
    var h = loadS(STORAGE_HISTORY, []);
    h.push(rec);
    if (h.length > 50) h = h.slice(h.length - 50);
    saveS(STORAGE_HISTORY, h);
  }

  function modeLabel(id) {
    for (var i = 0; i < MODES.length; i++) if (MODES[i].id === id) return MODES[i].label;
    return id;
  }

  function renderHistory() {
    var wrap = document.getElementById('ht-history-list');
    if (!wrap) return;
    var history = loadS(STORAGE_HISTORY, []);
    if (history.length === 0) { wrap.innerHTML = '<p class="history-empty">Noch keine Spiele gespielt.</p>'; return; }
    var html = '';
    for (var i = history.length - 1; i >= 0; i--) {
      var g = history[i];
      html += '<div class="history-entry"><div class="history-header"><span class="history-date">' + esc(g.date) + '</span><span class="history-pct">' + g.correctPct + '% richtig</span></div>';
      html += '<div class="history-details"><span>' + g.totalTasks + ' Aufgaben</span><span>' + esc(modeLabel(g.mode)) + '</span><span>' + formatTime(g.durationSec) + '</span><span>&#8709; ' + (g.avgTimeSec || 0).toFixed(1) + 's</span></div>';
      if (g.wrongTasks && g.wrongTasks.length > 0) {
        html += '<div class="history-wrong-tasks"><span class="history-wrong-label">Falsch: </span><span class="history-wrong-list">' + esc(g.wrongTasks.join(', ')) + '</span></div>';
      }
      html += '</div>';
    }
    wrap.innerHTML = html;
  }

  // =====================================================================
  // === STARTSCREEN =====================================================
  // =====================================================================
  function selectMode(btn) {
    fastGeschafftMode = false;
    var fgBtn = document.getElementById('ht-fg-btn');
    if (fgBtn) fgBtn.classList.remove('selected');
    var btns = document.querySelectorAll('#ht-mode-selector .cat-btn');
    for (var i = 0; i < btns.length; i++) btns[i].classList.remove('selected');
    btn.classList.add('selected');
    selectedMode = btn.getAttribute('data-mode');
    var hint = document.getElementById('ht-mode-hint');
    if (hint) hint.textContent = MODE_HINT[selectedMode] || '';
    updateStartInfo();
  }

  function selectCount(btn) {
    fastGeschafftMode = false;
    var fgBtn = document.getElementById('ht-fg-btn');
    if (fgBtn) fgBtn.classList.remove('selected');
    var btns = document.querySelectorAll('#ht-count-selector .count-btn');
    for (var i = 0; i < btns.length; i++) btns[i].classList.remove('selected');
    btn.classList.add('selected');
    selectedCount = parseInt(btn.getAttribute('data-count'), 10);
    updateStartInfo();
  }

  function selectFastGeschafft() {
    var errors = getWeightedErrors();
    if (errors.length === 0) return;
    fastGeschafftMode = true;
    var btns = document.querySelectorAll('#ht-count-selector .count-btn');
    for (var i = 0; i < btns.length; i++) btns[i].classList.remove('selected');
    var fgBtn = document.getElementById('ht-fg-btn');
    if (fgBtn) fgBtn.classList.add('selected');
    document.getElementById('ht-start-count').textContent = errors.length + ' Aufgaben zum Wiederholen';
  }

  function updateStartInfo() {
    if (fastGeschafftMode) return;
    var el = document.getElementById('ht-start-count');
    if (el) el.textContent = selectedCount + ' Aufgaben (' + modeLabel(selectedMode) + ')';
  }

  function updateFastGeschafft() {
    var errors = getWeightedErrors();
    var btn = document.getElementById('ht-fg-btn'), info = document.getElementById('ht-fg-info');
    if (!btn) return;
    if (errors.length === 0) { btn.classList.add('disabled'); if (info) info.textContent = 'Noch keine Fehler gespeichert'; }
    else { btn.classList.remove('disabled'); if (info) info.textContent = errors.length + ' Aufgaben zum Wiederholen'; }
  }

  function toggleHistory() {
    var list = document.getElementById('ht-history-list'), btn = document.getElementById('ht-history-toggle');
    if (!list || !btn) return;
    if (list.classList.contains('hidden')) { list.classList.remove('hidden'); btn.textContent = 'Historie ausblenden'; }
    else { list.classList.add('hidden'); btn.textContent = 'Historie anzeigen'; }
  }

  function initStart() {
    var hint = document.getElementById('ht-mode-hint');
    if (hint) hint.textContent = MODE_HINT[selectedMode] || '';
    updateStartInfo();
    updateFastGeschafft();
    renderHistory();
    APP.updatePointsDisplays();
  }

  // =====================================================================
  // === SPIEL ===========================================================
  // =====================================================================
  function buildTasks() {
    if (fastGeschafftMode) {
      var e = getWeightedErrors(), out = [];
      for (var i = 0; i < e.length; i++) out.push({ n: e[i].n, mode: randMode() });
      return out;
    }
    var t = [], seen = {}, attempts = 0;
    while (t.length < selectedCount && attempts < selectedCount * 12) {
      var mode = selectedMode === 'mix' ? randModeFull() : selectedMode;
      var task;
      if (mode === 'nachbar') { task = generateNachbarTask(); task.mode = 'nachbar'; }
      else if (mode === 'zahlenstrahl') { task = generateZahlenstrahlTask(); task.mode = 'zahlenstrahl'; }
      else { task = { n: generateNumber(), mode: mode }; }
      var key = mode + ':' + task.n + ':' + (task.base || '') + ':' + (task.start || '') + ':' + (task.tickIndex || '');
      if (!seen[key]) { seen[key] = true; t.push(task); }
      attempts++;
    }
    return t;
  }

  async function requestWakeLock() { try { if ('wakeLock' in navigator) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', function () { wakeLock = null; }); } } catch (e) {} }
  function releaseWakeLock() { if (wakeLock) { wakeLock.release(); wakeLock = null; } }

  function grabElements() {
    scoreText = document.getElementById('ht-score-text');
    progressFill = document.getElementById('ht-progress-fill');
    questionArea = document.getElementById('ht-question-area');
    mouseImg = document.getElementById('ht-mouse-img');
    particlesEl = document.getElementById('ht-particles');
    endScreen = document.getElementById('ht-end');
    endTitle = document.getElementById('ht-end-title');
    endMessage = document.getElementById('ht-end-msg');
    endStats = document.getElementById('ht-end-stats');
    promptLabelEl = document.getElementById('ht-prompt-label');
    taskDisplay = document.getElementById('ht-task-display');
    feedback = document.getElementById('ht-feedback');
    explainBox = document.getElementById('ht-explain-box');
    breakScreen = document.getElementById('ht-break');
    breakImage = document.getElementById('ht-break-img');
    breakTimer = document.getElementById('ht-break-timer');
    breakTimerFill = document.getElementById('ht-break-fill');
    cellEls = [];
    for (var i = 0; i < 6; i++) cellEls.push(document.getElementById('ht-cell-' + i));
  }

  function startGame() {
    tasks = buildTasks();
    if (tasks.length === 0) return;
    TOTAL = tasks.length;
    correctCount = 0; wrongCount = 0; questionNumber = 0; answeredSinceBreak = 0;
    locked = false; gameErrors = {}; gameStartTime = Date.now(); gameEnded = false;

    document.getElementById('ht-start-screen').classList.add('hidden');
    document.getElementById('ht-game-screen').classList.remove('hidden');
    grabElements();

    mouseImg.src = mouseCorrect; mouseImg.style.opacity = '1';
    requestWakeLock();
    queue = [];
    for (var i = 0; i < tasks.length; i++) queue.push(i);
    shuffleArray(queue); shuffleArray(breakImages); breakImageIndex = 0;
    updateScore(); loadQuestion();
  }

  function backToStart() {
    releaseWakeLock();
    endScreen.classList.add('hidden');
    questionArea.classList.remove('hidden');
    document.getElementById('ht-scene').classList.remove('hidden');
    if (breakScreen) breakScreen.classList.add('hidden');
    if (breakTimerInterval) { clearInterval(breakTimerInterval); breakTimerInterval = null; }
    document.getElementById('ht-game-screen').classList.add('hidden');
    document.getElementById('ht-start-screen').classList.remove('hidden');
    initStart();
    APP.updatePointsDisplays();
  }

  function endEarly() {
    if (gameEnded) return;
    if (correctCount + wrongCount === 0) { backToStart(); return; }
    if (breakTimerInterval) { clearInterval(breakTimerInterval); breakTimerInterval = null; }
    if (breakScreen) breakScreen.classList.add('hidden');
    document.getElementById('ht-scene').classList.remove('hidden');
    TOTAL = correctCount + wrongCount;
    queue = [];
    showEnd();
  }

  function updateScore() {
    scoreText.textContent = correctCount + ' / ' + TOTAL;
    progressFill.style.width = ((correctCount / TOTAL) * 100) + '%';
  }

  function setMouseImage(src, anim) {
    if (mouseImg.src.indexOf(src) !== -1) return;
    if (anim) { mouseImg.style.opacity = '0'; setTimeout(function () { mouseImg.src = src; mouseImg.style.opacity = '1'; }, 200); }
    else { mouseImg.src = src; mouseImg.style.opacity = '1'; }
  }

  function spawnParticles(count) {
    var em = ['sparkles','star','heart','party'];
    for (var i = 0; i < count; i++) {
      (function (idx) { setTimeout(function () {
        var el = document.createElement('span'); el.className = 'particle'; el.textContent = emojiMap[em[idx % em.length]];
        el.style.left = (10 + Math.random() * 80) + '%'; el.style.top = (30 + Math.random() * 50) + '%';
        el.style.fontSize = (16 + Math.random() * 14) + 'px'; el.style.animationDuration = (1.2 + Math.random() * 0.8) + 's';
        particlesEl.appendChild(el); setTimeout(function () { el.remove(); }, 2200);
      }, idx * 70); })(i);
    }
  }
  function spawnConfetti(count) {
    for (var i = 0; i < count; i++) {
      (function (idx) { setTimeout(function () {
        var el = document.createElement('div'); el.className = 'confetti';
        el.style.left = (Math.random() * 100) + '%'; el.style.top = (-5 - Math.random() * 10) + '%';
        el.style.background = confettiColors[idx % confettiColors.length];
        el.style.width = (5 + Math.random() * 5) + 'px'; el.style.height = (7 + Math.random() * 7) + 'px';
        el.style.animationDuration = (1.4 + Math.random()) + 's'; el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        particlesEl.appendChild(el); setTimeout(function () { el.remove(); }, 2800);
      }, idx * 35); })(i);
    }
  }
  function spawnFinalCelebration() {
    var em = ['✨','⭐','❤️','🎉','🎊','🌟','🌻','🦋','🌈'];
    for (var i = 0; i < 25; i++) {
      (function (idx) { setTimeout(function () {
        var el = document.createElement('span'); el.className = 'burst'; el.textContent = em[idx % em.length];
        el.style.left = '50%'; el.style.top = '50%';
        var angle = (idx / 25) * Math.PI * 2, dist = 70 + Math.random() * 100;
        var dx = Math.cos(angle) * dist, dy = Math.sin(angle) * dist;
        el.style.setProperty('--dx', dx + 'px'); el.style.setProperty('--dy', dy + 'px');
        el.style.setProperty('--dx2', (dx * 1.4) + 'px'); el.style.setProperty('--dy2', (dy * 1.4) + 'px');
        particlesEl.appendChild(el); setTimeout(function () { el.remove(); }, 2800);
      }, idx * 50); })(i);
    }
    spawnConfetti(30);
  }

  function showBreak() {
    questionArea.classList.add('hidden');
    document.getElementById('ht-scene').classList.add('hidden');
    breakImage.src = breakImages[breakImageIndex % breakImages.length]; breakImageIndex++;
    breakScreen.classList.remove('hidden');
    var timeLeft = 20; breakTimer.textContent = timeLeft; breakTimerFill.style.width = '100%';
    breakTimerInterval = setInterval(function () {
      timeLeft--; breakTimer.textContent = timeLeft; breakTimerFill.style.width = ((timeLeft / 20) * 100) + '%';
      if (timeLeft <= 0) endBreak();
    }, 1000);
  }
  function endBreak() {
    if (breakTimerInterval) { clearInterval(breakTimerInterval); breakTimerInterval = null; }
    breakScreen.classList.add('hidden');
    questionArea.classList.remove('hidden');
    document.getElementById('ht-scene').classList.remove('hidden');
    loadQuestion();
  }
  function skipBreak() { endBreak(); }

  // === Stellenwerttafel-Kästchen zeichnen ===
  function renderCells() {
    for (var i = 0; i < 6; i++) {
      var c = cellEls[i];
      if (!c) continue;
      c.textContent = digits[i] === '' ? '' : digits[i];
      c.className = 'pv-cell' + (i >= 3 ? ' pv-cell-ones' : '') + (i === active ? ' pv-cell-active' : '');
    }
  }

  function selectCell(i) {
    if (locked) return;
    active = i;
    renderCells();
  }

  function loadQuestion() {
    if (queue.length === 0) { showEnd(); return; }
    if (answeredSinceBreak >= BREAK_EVERY && queue.length > 0) { answeredSinceBreak = 0; showBreak(); return; }
    questionNumber++;
    current = tasks[queue[0]];

    promptLabelEl.textContent = MODE_LABELS[current.mode] || '';
    if (current.mode === 'zerlegen') {
      taskDisplay.className = 'ht-task-display ht-task-sum';
      taskDisplay.textContent = decompose(current.n);
    } else if (current.mode === 'wort') {
      taskDisplay.className = 'ht-task-display ht-task-word';
      taskDisplay.textContent = numberToWords(current.n);
    } else if (current.mode === 'nachbar') {
      taskDisplay.className = 'ht-task-display ht-task-nachbar';
      taskDisplay.innerHTML =
        '<div class="ht-nachbar-base">' + fmt(current.base) + '</div>' +
        '<div class="ht-nachbar-ask">gesucht: ' + esc(current.offsetLabel) + '</div>';
    } else if (current.mode === 'zahlenstrahl') {
      taskDisplay.className = 'ht-task-display ht-task-zahlenstrahl';
      taskDisplay.innerHTML = renderNumberLine(current.start, current.end, current.tickIndex);
    } else {
      taskDisplay.className = 'ht-task-display ht-task-tokens';
      taskDisplay.textContent = tokensStr(current.n);
    }

    digits = ['', '', '', '', '', ''];
    active = 0;
    attempt = 0;
    renderCells();
    feedback.className = 'hidden'; feedback.innerHTML = '';
    explainBox.className = 'hidden'; explainBox.innerHTML = '';
    locked = false;
  }

  function numpad(val) {
    if (locked) return;
    if (val === 'del') {
      feedback.className = 'hidden'; feedback.innerHTML = '';
      if (digits[active] !== '') { digits[active] = ''; }
      else if (active > 0) { active--; digits[active] = ''; }
      renderCells();
      return;
    }
    if (val === 'ok') {
      for (var i = 0; i < 6; i++) if (digits[i] === '') { active = i; renderCells(); return; }
      checkAnswer();
      return;
    }
    // Ziffer
    feedback.className = 'hidden'; feedback.innerHTML = '';
    digits[active] = val;
    if (active < 5) active++;
    renderCells();
  }

  function checkAnswer() {
    var correct = digitsOf(current.n);
    var ans = digits.join('');
    var ok = (ans === correct);

    // Kästchen einfärben (richtig/falsch pro Stelle)
    for (var i = 0; i < 6; i++) {
      if (cellEls[i]) {
        cellEls[i].className = 'pv-cell' + (i >= 3 ? ' pv-cell-ones' : '') +
          (digits[i] === correct.charAt(i) ? ' pv-cell-ok' : ' pv-cell-bad');
      }
    }

    if (ok) {
      locked = true;
      var taskIdx = queue[0];
      queue.shift(); answeredSinceBreak++;
      correctCount++;
      feedback.innerHTML = 'Richtig!'; feedback.className = 'correct-fb';
      updateScore(); setMouseImage(mouseCorrect, true);
      APP.addPoint();
      var p = correctCount / TOTAL;
      if (p < 0.3) spawnParticles(3); else if (p < 0.6) spawnParticles(5);
      else if (p < 0.9) { spawnParticles(7); if (correctCount % 10 === 0) spawnConfetti(15); }
      else { spawnParticles(10); spawnConfetti(20); }
      if (correctCount === TOTAL) setTimeout(function () { spawnFinalCelebration(); }, 300);
      setTimeout(function () { loadQuestion(); }, 1600);
      return;
    }

    if (attempt === 0) {
      // Erster Fehlversuch: einmal korrigieren lassen, bevor die Lösung
      // gezeigt und die Aufgabe als falsch gewertet wird.
      attempt = 1;
      locked = false;
      for (var j = 0; j < 6; j++) { if (digits[j] !== correct.charAt(j)) { active = j; break; } }
      feedback.innerHTML = 'Fast! Verbessere die rot markierten Kästchen und versuch es noch einmal.';
      feedback.className = 'wrong-fb';
      setMouseImage(mouseSad, true);
      setTimeout(function () { setMouseImage(mouseCorrect, true); }, 1400);
      return;
    }

    // Zweiter Fehlversuch: Aufgabe gilt als falsch, Lösung wird erklärt.
    locked = true;
    var taskIdx2 = queue[0];
    queue.shift(); answeredSinceBreak++;
    wrongCount++; recordError(current.n);
    feedback.innerHTML = '<div class="wrong-answer-line">Nicht ganz. Die Zahl ist ' + fmt(current.n) + '.</div>';
    feedback.className = 'wrong-fb wrong-fb-path';
    explainBox.className = 'ht-explain';
    explainBox.innerHTML =
      '<div class="rule-title">So sieht die Zahl in der Tafel aus:</div>' +
      '<div class="rule-text">' + explainTable(current.n) + '</div>' +
      '<div class="rule-text">Das ist ' + decompose(current.n) + '.</div>';
    queue.push(taskIdx2);
    setMouseImage(mouseSad, true);
    setTimeout(function () { setMouseImage(mouseCorrect, true); }, 1400);
    setTimeout(function () { loadQuestion(); }, 4500);
  }

  // Kleine Textdarstellung der richtigen Tafel: "HT 3 · ZT 1 · T 9 · H 5 · Z 4 · E 3"
  function explainTable(n) {
    var str = digitsOf(n), parts = [];
    for (var i = 0; i < 6; i++) parts.push(ABBR[i] + ' ' + str.charAt(i));
    return parts.join(' · ');
  }

  function showEnd() {
    if (gameEnded) return;
    gameEnded = true;
    questionArea.classList.add('hidden');
    var dur = (Date.now() - gameStartTime) / 1000, avgTime = TOTAL > 0 ? dur / TOTAL : 0;
    saveGameErrors();
    var firstTryCorrect = TOTAL - Object.keys(gameErrors).length;
    if (firstTryCorrect < 0) firstTryCorrect = 0;
    var firstTryPct = TOTAL > 0 ? Math.round((firstTryCorrect / TOTAL) * 100) : 0;

    var ds = APP.nowCH();
    var errorKeys = Object.keys(gameErrors), wrongTasks = [];
    for (var i = 0; i < errorKeys.length; i++) wrongTasks.push(fmt(parseInt(errorKeys[i], 10)));

    saveGameHistory({
      date: ds, totalTasks: TOTAL, mode: selectedMode, correctPct: firstTryPct,
      durationSec: Math.round(dur), avgTimeSec: Math.round(avgTime * 10) / 10,
      wrongTasks: wrongTasks
    });

    mouseImg.src = (firstTryPct === 100) ? 'images/mouse_perfect.png' : mouseCorrect;
    mouseImg.style.opacity = '1';

    if (firstTryPct === 100) { endTitle.textContent = 'Perfekt!'; endMessage.textContent = 'Kein einziger Fehler — du bist ein Stellenwert-Profi!'; }
    else if (firstTryPct >= 90) { endTitle.textContent = 'Super gemacht!'; endMessage.textContent = 'Fast alles beim ersten Mal richtig!'; }
    else if (firstTryPct >= 70) { endTitle.textContent = 'Gut!'; endMessage.textContent = 'Das klappt schon richtig gut!'; }
    else if (firstTryPct >= 50) { endTitle.textContent = 'Weiter so!'; endMessage.textContent = 'Mit etwas Übung wird es noch besser.'; }
    else { endTitle.textContent = 'Gut versucht!'; endMessage.textContent = 'Übe weiter — du schaffst das!'; }

    endStats.innerHTML = '<strong>' + firstTryCorrect + '</strong> von <strong>' + TOTAL + '</strong> Aufgaben beim ersten Versuch richtig' +
      '<br><strong>' + wrongCount + '</strong> Fehler gemacht' +
      '<br>Trefferquote: <strong>' + firstTryPct + '%</strong>' +
      '<br>Zeit: <strong>' + formatTime(Math.round(dur)) + '</strong> (&#8709; ' + avgTime.toFixed(1) + 's pro Aufgabe)';

    endScreen.classList.remove('hidden');
    if (firstTryPct >= 90) setTimeout(function () { spawnFinalCelebration(); }, 500);
  }

  return {
    selectMode: selectMode,
    selectCount: selectCount,
    selectFastGeschafft: selectFastGeschafft,
    startGame: startGame,
    numpad: numpad,
    selectCell: selectCell,
    skipBreak: skipBreak,
    backToStart: backToStart,
    endEarly: endEarly,
    toggleHistory: toggleHistory,
    initStart: initStart
  };
})();
