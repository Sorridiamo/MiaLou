/* game_english.js — "Englisch" (Vokabeln lernen) für Mia Lou's Spielkiste
 *
 * Vier Spielmodi:
 *   1) "spell" — deutsches Wort, drei englische Schreibweisen (2 falsch)
 *   2) "mean"  — englisches Wort, drei deutsche Bedeutungen (2 falsch)
 *   3) "type"  — deutsches Wort, das englische selbst schreiben
 *   4) "sent"  — englisches Wort, drei Beispielsätze (2 falsch)
 *
 * Wortliste: die eingebauten Wörter (BUILTIN) bleiben im Code. Eltern können
 * im Elternbereich eigene Wörter ergänzen und Wörter ausblenden. Diese
 * Änderungen liegen als "Overlay" in { custom: [...], hidden: [...] } und
 * werden NIE über die eingebaute Liste geschrieben. Dadurch gehen bei einem
 * App-Update weder eigene Wörter noch Punkte verloren, und neue eingebaute
 * Wörter erscheinen automatisch.
 */
var EN = (function () {
  'use strict';

  // === Eingebaute Wortliste (Schulstoff: die fünf Sinne) ==================
  // 'long: true' = ganzer Satzbaustein. Solche Einträge werden im Schreib-
  // und im Schreibweisen-Modus übersprungen (zu lang zum Tippen).
  var BUILTIN = [
    { de: 'sehen',            en: 'see',    sentence: 'I can see you.' },
    { de: 'hören',            en: 'hear',   sentence: 'I can hear music.' },
    { de: 'riechen',          en: 'smell',  sentence: 'Dogs smell everything.' },
    { de: 'schmecken',        en: 'taste',  sentence: 'It tastes sweet.' },
    { de: 'fühlen, spüren',   en: 'feel',   sentence: 'It feels warm.' },
    { de: 'berühren',         en: 'touch',  sentence: 'Touch your arm.' },
    { de: 'Sinn',             en: 'sense',  sentence: 'We have got five senses.' },
    { de: 'hart',             en: 'hard',   sentence: 'I like hard cheese.' },
    { de: 'weich',            en: 'soft',   sentence: 'My teddy is soft.' },
    { de: 'bitter',           en: 'bitter', sentence: 'It tastes bitter.' },
    { de: 'sauer',            en: 'sour',   sentence: 'Lemons taste sour.' },
    { de: 'Ich mag … , weil …',       en: 'I like … because …',       sentence: 'I like chocolate because it tastes sweet.', long: true },
    { de: 'Ich mag … nicht, weil …',  en: 'I don\'t like … because …', sentence: 'I don\'t like cheese because it smells bad.', long: true }
  ];

  var MODES = [
    { id: 'mix',   label: 'Gemischt' },
    { id: 'spell', label: 'Richtig geschrieben?' },
    { id: 'mean',  label: 'Was heisst das?' },
    { id: 'type',  label: 'Selbst schreiben' },
    { id: 'sent',  label: 'Welcher Satz?' }
  ];
  var MODE_HINT = {
    mix:   'Alle vier Übungen gemischt.',
    spell: 'Du siehst das deutsche Wort und wählst die richtige englische Schreibweise.',
    mean:  'Du siehst das englische Wort und wählst die richtige deutsche Bedeutung.',
    type:  'Du siehst das deutsche Wort und schreibst das englische selbst.',
    sent:  'Du siehst das englische Wort und wählst den Satz, der stimmt.'
  };

  // === Speicher-Keys =====================================================
  // Spielstand pro Kind (läuft über APP.gameSave → Cloud + localStorage)
  var STORAGE_ERRORS = 'english_errors';
  var STORAGE_HISTORY = 'english_history';
  // Wortliste: gilt für ALLE Kinder gemeinsam, daher eigener globaler Key
  // (nicht profilgebunden) und eigener Cloud-Pfad.
  var KEY_WORDLIST = 'spielkiste_en_wordlist';
  var CLOUD_WORDLIST = 'wordlists/english';

  var MAX_ERROR_GAMES = 5;
  var BREAK_EVERY = 20;

  var mouseCorrect = 'images/mouse_correct.png';
  var mouseSad = 'images/mouse_sad_wide.png';
  var breakImages = [
    'images/mouse_0.png','images/mouse_1.png','images/mouse_2.png','images/mouse_3.png',
    'images/mouse_4.png','images/mouse_5.png','images/mouse_6.png','images/mouse_perfect.png'
  ];
  var breakImageIndex = 0;
  var confettiColors = ['#f5b0c0','#f5d98e','#b8d8a3','#a8d4e6','#d8b4f0','#f0b880','#7ec88b','#e88080'];
  var emojiMap = { sparkles:'✨', star:'⭐', heart:'❤️', party:'🎉', tada:'🎊' };

  // Overlay der Eltern: eigene Wörter + ausgeblendete Wörter
  var overlay = { custom: [], hidden: [] };
  var overlayLoaded = false;

  var tasks = [], TOTAL = 0, queue = [];
  var correctCount = 0, wrongCount = 0, questionNumber = 0, answeredSinceBreak = 0;
  var locked = false, gameStartTime = 0;
  var gameErrors = {}, modeStats = {};
  var breakTimerInterval = null, wakeLock = null;
  var selectedMode = 'mix', selectedCount = 20;
  var current = null;   // aktuelle Frage

  function loadS(k, f) { return APP.gameLoad(k, f); }
  function saveS(k, d) { APP.gameSave(k, d); }
  function shuffleArray(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function formatTime(s) { var m = Math.floor(s / 60), r = Math.round(s % 60); return m === 0 ? r + 's' : m + 'min ' + r + 's'; }
  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // =====================================================================
  // === WORTLISTE ========================================================
  // =====================================================================

  function normKey(en) { return String(en || '').trim().toLowerCase(); }

  function readOverlayLocal() {
    try {
      var raw = localStorage.getItem(KEY_WORDLIST);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (!o || typeof o !== 'object') return null;
      return { custom: o.custom || [], hidden: o.hidden || [] };
    } catch (e) { return null; }
  }

  function writeOverlayLocal() {
    try { localStorage.setItem(KEY_WORDLIST, JSON.stringify(overlay)); } catch (e) {}
  }

  function wordRef() {
    try {
      if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length) {
        return firebase.database().ref(CLOUD_WORDLIST);
      }
    } catch (e) {}
    return null;
  }

  // Overlay laden: erst lokal (sofort), dann aus der Cloud nachziehen.
  // Nie blockierend — ohne Cloud funktioniert alles genauso.
  function loadOverlay(done) {
    if (!overlayLoaded) {
      var local = readOverlayLocal();
      if (local) overlay = local;
      overlayLoaded = true;
    }
    var ref = wordRef();
    if (!ref) { if (done) done(); return; }
    var finished = false;
    function finish() { if (finished) return; finished = true; if (done) done(); }
    var timer = setTimeout(finish, 4000);
    ref.once('value', function (snap) {
      clearTimeout(timer);
      var v = snap && snap.val();
      if (v && typeof v === 'object') {
        overlay = { custom: v.custom || [], hidden: v.hidden || [] };
        writeOverlayLocal();
      }
      finish();
    }, function () {
      clearTimeout(timer);
      finish();
    });
  }

  // Overlay speichern: lokal sofort, Cloud mit 4s-Zeitlimit.
  // Rückmeldung immer "gespeichert" plus ggf. Hinweis.
  function saveOverlay(done) {
    writeOverlayLocal();
    var ref = wordRef();
    if (!ref) { if (done) done('Nur auf diesem Gerät gespeichert (keine Cloud-Verbindung).'); return; }
    var finished = false;
    function finish(msg) { if (finished) return; finished = true; if (done) done(msg); }
    var timer = setTimeout(function () {
      finish('Nur auf diesem Gerät gespeichert (Cloud antwortet nicht).');
    }, 4000);
    ref.set(overlay, function (err) {
      clearTimeout(timer);
      finish(err ? 'Nur auf diesem Gerät gespeichert (Cloud verweigert den Zugriff).' : '');
    });
  }

  function isHidden(en) { return overlay.hidden.indexOf(normKey(en)) >= 0; }

  // Die aktive Wortliste: eingebaute Wörter (ohne ausgeblendete) + eigene.
  function getWords() {
    var out = [], i;
    for (i = 0; i < BUILTIN.length; i++) {
      if (!isHidden(BUILTIN[i].en)) out.push(BUILTIN[i]);
    }
    for (i = 0; i < overlay.custom.length; i++) {
      var c = overlay.custom[i];
      if (c && c.de && c.en && !isHidden(c.en)) {
        out.push({ de: c.de, en: c.en, sentence: c.sentence || '', long: !!c.long, custom: true });
      }
    }
    return out;
  }

  // =====================================================================
  // === FALSCHE SCHREIBWEISEN ERZEUGEN ===================================
  // =====================================================================
  // Damit auch selbst eingetragene Wörter sofort im Modus "Richtig
  // geschrieben?" funktionieren, werden die falschen Varianten automatisch
  // erzeugt — die Eltern müssen nichts Falsches eintippen.
  var LETTER_SWAPS = [
    ['ee','ea'], ['ea','ee'], ['oo','ou'], ['ou','oo'], ['ai','ay'], ['ay','ai'],
    ['ou','au'], ['er','ar'], ['ar','er'], ['se','ce'], ['ce','se'], ['ck','k'],
    ['ll','l'], ['ss','s'], ['th','t'], ['sh','sch'], ['y','i'], ['i','y']
  ];

  function isLetter(c) { return /[a-zA-Z]/.test(c); }

  function spellVariants(correct) {
    // Drei Gruppen, absteigend nach "Plausibilität". Die Frage nimmt die
    // ersten zwei — so sind die falschen Varianten echte Stolpersteine und
    // nicht offensichtlich kaputt (wie ein fehlender erster Buchstabe).
    var swaps = [], doubles = [], rest = [];
    var seen = {};
    function add(bucket, s) {
      if (!s || s === correct || s.length < 2) return;
      if (seen[s]) return;
      seen[s] = true;
      bucket.push(s);
    }
    var i;
    // 1. Typische Verwechslungen (ee/ea, ck/k, se/ce …)
    for (i = 0; i < LETTER_SWAPS.length; i++) {
      if (correct.indexOf(LETTER_SWAPS[i][0]) >= 0) add(swaps, correct.replace(LETTER_SWAPS[i][0], LETTER_SWAPS[i][1]));
    }
    // Stummes e am Ende
    if (correct.charAt(correct.length - 1) === 'e') add(swaps, correct.slice(0, -1));
    else add(swaps, correct + 'e');
    // 2. Buchstabe verdoppeln bzw. Doppel-Buchstabe halbieren
    for (i = 1; i < correct.length; i++) {
      if (isLetter(correct.charAt(i))) add(doubles, correct.slice(0, i + 1) + correct.charAt(i) + correct.slice(i + 1));
    }
    for (i = 1; i < correct.length; i++) {
      if (correct.charAt(i) === correct.charAt(i - 1)) add(doubles, correct.slice(0, i) + correct.slice(i + 1));
    }
    // 3. Nachbarn vertauschen / Buchstabe weglassen (nie der erste)
    for (i = 1; i < correct.length - 1; i++) {
      var a = correct.charAt(i), b = correct.charAt(i + 1);
      if (a !== b && isLetter(a) && isLetter(b)) add(rest, correct.slice(0, i) + b + a + correct.slice(i + 2));
    }
    for (i = 1; i < correct.length; i++) {
      if (isLetter(correct.charAt(i))) add(rest, correct.slice(0, i) + correct.slice(i + 1));
    }
    return shuffleArray(swaps).concat(shuffleArray(doubles)).concat(shuffleArray(rest));
  }

  // =====================================================================
  // === FRAGEN BAUEN =====================================================
  // =====================================================================

  function pickOthers(pool, word, n, field) {
    var cands = [], i;
    for (i = 0; i < pool.length; i++) {
      var w = pool[i];
      if (w.en === word.en) continue;
      if (!w[field]) continue;
      if (w[field] === word[field]) continue;
      cands.push(w[field]);
    }
    shuffleArray(cands);
    // Doppelte vermeiden
    var out = [];
    for (i = 0; i < cands.length && out.length < n; i++) {
      if (out.indexOf(cands[i]) < 0) out.push(cands[i]);
    }
    return out;
  }

  // Baut eine Frage oder gibt null zurück, wenn der Modus für dieses Wort
  // nicht geht (z.B. kein Beispielsatz vorhanden).
  function buildQuestion(word, mode, pool) {
    if (mode === 'spell') {
      if (word.long) return null;
      var vars = spellVariants(word.en);
      if (vars.length < 2) return null;
      return {
        mode: mode, word: word,
        prompt: word.de, promptLabel: 'Wie schreibt man das auf Englisch?',
        options: shuffleArray([word.en, vars[0], vars[1]]),
        answer: word.en,
        explain: 'Richtig ist: ' + word.en
      };
    }
    if (mode === 'mean') {
      var others = pickOthers(pool, word, 2, 'de');
      if (others.length < 2) return null;
      return {
        mode: mode, word: word,
        prompt: word.en, promptLabel: 'Was heisst das auf Deutsch?',
        options: shuffleArray([word.de, others[0], others[1]]),
        answer: word.de,
        explain: word.en + ' heisst: ' + word.de
      };
    }
    if (mode === 'type') {
      if (word.long) return null;
      return {
        mode: mode, word: word,
        prompt: word.de, promptLabel: 'Schreibe das Wort auf Englisch:',
        options: null,
        answer: word.en,
        explain: 'Richtig ist: ' + word.en
      };
    }
    if (mode === 'sent') {
      if (!word.sentence) return null;
      var sOthers = pickOthers(pool, word, 2, 'sentence');
      if (sOthers.length < 2) return null;
      return {
        mode: mode, word: word,
        prompt: word.en, promptLabel: 'In welchem Satz kommt das Wort richtig vor?',
        options: shuffleArray([word.sentence, sOthers[0], sOthers[1]]),
        answer: word.sentence,
        explain: 'Richtig ist: ' + word.sentence
      };
    }
    return null;
  }

  function modesFor(mode) {
    return mode === 'mix' ? ['spell', 'mean', 'type', 'sent'] : [mode];
  }

  function buildTaskList(pool, mode, count) {
    var modes = modesFor(mode);
    var list = [], i, m;
    // Jedes Wort in jedem passenden Modus einmal anbieten
    for (i = 0; i < pool.length; i++) {
      for (m = 0; m < modes.length; m++) {
        var q = buildQuestion(pool[i], modes[m], pool);
        if (q) list.push(q);
      }
    }
    shuffleArray(list);
    if (count && list.length > count) list = list.slice(0, count);
    return list;
  }

  // =====================================================================
  // === FEHLER + HISTORIE ================================================
  // =====================================================================
  function recordError(en) { gameErrors[en] = (gameErrors[en] || 0) + 1; }
  function recordModeAttempt(mode, ok) {
    if (!modeStats[mode]) modeStats[mode] = { wrong: 0, total: 0 };
    modeStats[mode].total++;
    if (!ok) modeStats[mode].wrong++;
  }

  function saveGameErrors() {
    var list = [];
    for (var k in gameErrors) if (gameErrors[k] > 0) list.push({ word: k, count: gameErrors[k] });
    var all = loadS(STORAGE_ERRORS, []);
    all.push(list);
    if (all.length > MAX_ERROR_GAMES) all = all.slice(all.length - MAX_ERROR_GAMES);
    saveS(STORAGE_ERRORS, all);
  }

  function getWeightedErrors() {
    var all = loadS(STORAGE_ERRORS, []), w = {}, i, j;
    for (i = 0; i < all.length; i++) {
      var wt = i + 1, g = all[i] || [];
      for (j = 0; j < g.length; j++) w[g[j].word] = (w[g[j].word] || 0) + g[j].count * wt;
    }
    var pool = getWords(), sorted = [];
    for (var en in w) {
      for (i = 0; i < pool.length; i++) {
        if (pool[i].en === en) { sorted.push({ word: pool[i], score: w[en] }); break; }
      }
    }
    sorted.sort(function (a, b) { return b.score - a.score; });
    return sorted;
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
    var wrap = document.getElementById('en-history-list');
    if (!wrap) return;
    var history = loadS(STORAGE_HISTORY, []);
    if (history.length === 0) { wrap.innerHTML = '<p class="history-empty">Noch keine Spiele gespielt.</p>'; return; }
    var html = '';
    for (var i = history.length - 1; i >= 0; i--) {
      var g = history[i];
      html += '<div class="history-entry"><div class="history-header"><span class="history-date">' + esc(g.date) + '</span><span class="history-pct">' + g.correctPct + '% richtig</span></div>';
      html += '<div class="history-details"><span>' + g.totalWords + ' Aufgaben</span><span>' + formatTime(g.durationSec) + '</span><span>&#8709; ' + (g.avgTimeSec || 0).toFixed(1) + 's</span></div>';
      html += '<div class="history-cats"><span class="history-cat-badge" style="background:#6baed6">' + esc(modeLabel(g.mode)) + '</span></div>';
      if (g.wrongWords && g.wrongWords.length > 0) {
        html += '<div class="history-wrong-words"><span class="history-wrong-label">Falsch: </span><span class="history-wrong-list">' + esc(g.wrongWords.join(', ')) + '</span></div>';
      }
      html += '</div>';
    }
    wrap.innerHTML = html;
  }

  // =====================================================================
  // === STARTSCREEN ======================================================
  // =====================================================================
  function selectMode(btn) {
    var btns = document.querySelectorAll('#en-mode-selector .cat-btn');
    for (var i = 0; i < btns.length; i++) btns[i].classList.remove('selected');
    btn.classList.add('selected');
    selectedMode = btn.getAttribute('data-mode');
    var hint = document.getElementById('en-mode-hint');
    if (hint) hint.textContent = MODE_HINT[selectedMode] || '';
    updateStartCount();
  }

  function selectCount(btn) {
    var btns = document.querySelectorAll('#en-count-selector .count-btn');
    for (var i = 0; i < btns.length; i++) btns[i].classList.remove('selected');
    btn.classList.add('selected');
    selectedCount = parseInt(btn.getAttribute('data-count'), 10);
    updateStartCount();
  }

  function updateStartCount() {
    var el = document.getElementById('en-start-count');
    if (!el) return;
    var pool = getWords();
    if (pool.length === 0) { el.textContent = 'Noch keine Wörter — die Eltern können welche hinzufügen.'; return; }
    var avail = buildTaskList(pool, selectedMode, 0).length;
    var n = Math.min(selectedCount, avail);
    el.textContent = n + ' Aufgaben aus ' + pool.length + ' Wörtern';
  }

  function toggleHistory() {
    var list = document.getElementById('en-history-list'), btn = document.getElementById('en-history-toggle');
    if (!list || !btn) return;
    if (list.classList.contains('hidden')) { list.classList.remove('hidden'); btn.textContent = 'Historie ausblenden'; }
    else { list.classList.add('hidden'); btn.textContent = 'Historie anzeigen'; }
  }

  function initStart() {
    loadOverlay(function () { updateStartCount(); });
    updateStartCount();
    renderHistory();
    APP.updatePointsDisplays();
  }

  // =====================================================================
  // === SPIEL ============================================================
  // =====================================================================
  var scoreText, progressFill, questionArea, endScreen;
  var endTitle, endMessage, endStats, mouseImg, particlesEl;
  var feedback, promptLabelEl, promptText, explainBox, breakScreen, breakImage, breakTimer, breakTimerFill;
  var optionsWrap, typeWrap, typeInput;

  function grabElements() {
    scoreText = document.getElementById('en-score-text');
    progressFill = document.getElementById('en-progress-fill');
    questionArea = document.getElementById('en-question-area');
    endScreen = document.getElementById('en-end');
    endTitle = document.getElementById('en-end-title');
    endMessage = document.getElementById('en-end-msg');
    endStats = document.getElementById('en-end-stats');
    mouseImg = document.getElementById('en-mouse-img');
    particlesEl = document.getElementById('en-particles');
    feedback = document.getElementById('en-feedback');
    promptLabelEl = document.getElementById('en-prompt-label');
    promptText = document.getElementById('en-prompt');
    explainBox = document.getElementById('en-explain-box');
    breakScreen = document.getElementById('en-break');
    breakImage = document.getElementById('en-break-img');
    breakTimer = document.getElementById('en-break-timer');
    breakTimerFill = document.getElementById('en-break-fill');
    optionsWrap = document.getElementById('en-options');
    typeWrap = document.getElementById('en-type-wrap');
    typeInput = document.getElementById('en-type-input');
  }

  async function requestWakeLock() { try { if ('wakeLock' in navigator) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', function () { wakeLock = null; }); } } catch (e) {} }
  function releaseWakeLock() { if (wakeLock) { wakeLock.release(); wakeLock = null; } }

  function startGame() {
    var pool = getWords();
    if (pool.length === 0) { updateStartCount(); return; }
    tasks = buildTaskList(pool, selectedMode, selectedCount);
    if (tasks.length === 0) { updateStartCount(); return; }

    TOTAL = tasks.length;
    correctCount = 0; wrongCount = 0; questionNumber = 0; answeredSinceBreak = 0;
    locked = false; gameErrors = {}; modeStats = {}; gameStartTime = Date.now();

    document.getElementById('en-start-screen').classList.add('hidden');
    document.getElementById('en-game-screen').classList.remove('hidden');
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
    document.getElementById('en-scene').classList.remove('hidden');
    if (breakScreen) breakScreen.classList.add('hidden');
    if (breakTimerInterval) { clearInterval(breakTimerInterval); breakTimerInterval = null; }
    document.getElementById('en-game-screen').classList.add('hidden');
    document.getElementById('en-start-screen').classList.remove('hidden');
    initStart();
    APP.updatePointsDisplays();
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
    document.getElementById('en-scene').classList.add('hidden');
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
    document.getElementById('en-scene').classList.remove('hidden');
    loadQuestion();
  }
  function skipBreak() { endBreak(); }

  function loadQuestion() {
    if (queue.length === 0) { showEnd(); return; }
    if (answeredSinceBreak >= BREAK_EVERY && queue.length > 0) { answeredSinceBreak = 0; showBreak(); return; }
    questionNumber++;
    current = tasks[queue[0]];

    promptLabelEl.textContent = current.promptLabel;
    promptText.textContent = current.prompt;
    feedback.className = 'hidden'; feedback.textContent = '';
    explainBox.className = 'hidden'; explainBox.innerHTML = '';
    locked = false;

    if (current.mode === 'type') {
      optionsWrap.innerHTML = '';
      optionsWrap.classList.add('hidden');
      typeWrap.classList.remove('hidden');
      typeInput.value = '';
      typeInput.disabled = false;
      typeInput.className = 'form-input en-type-input';
      try { typeInput.focus(); } catch (e) {}
    } else {
      typeWrap.classList.add('hidden');
      optionsWrap.classList.remove('hidden');
      optionsWrap.innerHTML = '';
      for (var i = 0; i < current.options.length; i++) {
        var b = document.createElement('button');
        b.className = 'word-btn en-option-btn';
        b.textContent = current.options[i];
        b.setAttribute('data-opt', String(i));
        b.onclick = (function (idx) { return function () { chooseOption(idx); }; })(i);
        optionsWrap.appendChild(b);
      }
    }
  }

  function optionButtons() { return optionsWrap.querySelectorAll('.en-option-btn'); }

  function chooseOption(idx) {
    if (locked) return;
    var chosen = current.options[idx];
    var isCorrect = (chosen === current.answer);
    var btns = optionButtons(), i;
    locked = true;
    for (i = 0; i < btns.length; i++) {
      if (current.options[i] === current.answer) btns[i].classList.add('correct-highlight');
      else if (i === idx) btns[i].classList.add('wrong-highlight');
      else btns[i].classList.add('disabled');
    }
    settleAnswer(isCorrect);
  }

  function submitTyped() {
    if (locked) return;
    var val = (typeInput.value || '').trim();
    if (!val) return;
    locked = true;
    typeInput.disabled = true;
    var isCorrect = compareTyped(val, current.answer);
    typeInput.className = 'form-input en-type-input ' + (isCorrect ? 'en-type-ok' : 'en-type-bad');
    settleAnswer(isCorrect);
  }

  // Beim Tippen sind Gross-/Kleinschreibung und doppelte Leerzeichen egal.
  function compareTyped(a, b) {
    function norm(s) { return String(s).toLowerCase().replace(/\s+/g, ' ').replace(/[.!?]+$/, '').trim(); }
    return norm(a) === norm(b);
  }

  function typeKey(ev) {
    if (ev && (ev.key === 'Enter' || ev.keyCode === 13)) { submitTyped(); return false; }
    return true;
  }

  function settleAnswer(isCorrect) {
    var taskIdx = queue[0];
    queue.shift();
    answeredSinceBreak++;
    recordModeAttempt(current.mode, isCorrect);

    if (isCorrect) {
      correctCount++;
      feedback.textContent = 'Richtig!';
      feedback.className = 'correct-fb';
      updateScore();
      setMouseImage(mouseCorrect, true);
      APP.addPoint();
      var p = correctCount / TOTAL;
      if (p < 0.3) spawnParticles(3);
      else if (p < 0.6) spawnParticles(5);
      else if (p < 0.9) { spawnParticles(7); if (correctCount % 10 === 0) spawnConfetti(15); }
      else { spawnParticles(10); spawnConfetti(20); }
      if (correctCount === TOTAL) setTimeout(function () { spawnFinalCelebration(); }, 300);
      setTimeout(function () { loadQuestion(); }, 1400);
    } else {
      wrongCount++;
      recordError(current.word.en);
      feedback.textContent = 'Leider falsch.';
      feedback.className = 'wrong-fb';
      explainBox.className = '';
      explainBox.innerHTML = '<div class="rule-title">' + esc(current.explain) + '</div>' +
        '<div class="rule-text">' + esc(current.word.de) + ' = ' + esc(current.word.en) +
        (current.word.sentence ? '<br>' + esc(current.word.sentence) : '') + '</div>';
      // Falsch beantwortete Aufgabe kommt nochmal
      queue.push(taskIdx);
      setMouseImage(mouseSad, true);
      setTimeout(function () { setMouseImage(mouseCorrect, true); }, 1400);
      setTimeout(function () { loadQuestion(); }, 3500);
    }
  }

  function showEnd() {
    questionArea.classList.add('hidden');
    var dur = (Date.now() - gameStartTime) / 1000, avgTime = TOTAL > 0 ? dur / TOTAL : 0;
    saveGameErrors();
    var errorWords = Object.keys(gameErrors);
    var firstTryCorrect = TOTAL - errorWords.length;
    if (firstTryCorrect < 0) firstTryCorrect = 0;
    var firstTryPct = TOTAL > 0 ? Math.round((firstTryCorrect / TOTAL) * 100) : 0;

    var now = new Date();
    var ds = ('0' + now.getDate()).slice(-2) + '.' + ('0' + (now.getMonth() + 1)).slice(-2) + '.' + now.getFullYear() +
      ', ' + ('0' + now.getHours()).slice(-2) + ':' + ('0' + now.getMinutes()).slice(-2);
    saveGameHistory({
      date: ds, totalWords: TOTAL, correctPct: firstTryPct,
      durationSec: Math.round(dur), avgTimeSec: Math.round(avgTime * 10) / 10,
      mode: selectedMode, modeStats: JSON.parse(JSON.stringify(modeStats)),
      wrongWords: errorWords.slice()
    });

    mouseImg.src = (firstTryPct === 100) ? 'images/mouse_perfect.png' : mouseCorrect;
    mouseImg.style.opacity = '1';

    if (firstTryPct === 100) { endTitle.textContent = 'Perfekt!'; endMessage.textContent = 'Kein einziger Fehler — dein Englisch ist top!'; }
    else if (firstTryPct >= 90) { endTitle.textContent = 'Super gemacht!'; endMessage.textContent = 'Fast alles beim ersten Mal richtig!'; }
    else if (firstTryPct >= 70) { endTitle.textContent = 'Gut!'; endMessage.textContent = 'Das klappt schon richtig gut!'; }
    else if (firstTryPct >= 50) { endTitle.textContent = 'Weiter so!'; endMessage.textContent = 'Mit etwas Übung wird es noch besser.'; }
    else { endTitle.textContent = 'Gut versucht!'; endMessage.textContent = 'Übe weiter — du schaffst das!'; }

    endStats.innerHTML = '<strong>' + firstTryCorrect + '</strong> von <strong>' + TOTAL + '</strong> Aufgaben beim ersten Versuch richtig' +
      '<br><strong>' + wrongCount + '</strong> Fehler gemacht' +
      '<br>Trefferquote: <strong>' + firstTryPct + '%</strong>' +
      '<br>Zeit: <strong>' + formatTime(Math.round(dur)) + '</strong> (&#8709; ' + avgTime.toFixed(1) + 's pro Aufgabe)';

    var catEl = document.getElementById('en-end-cats');
    if (catEl) {
      catEl.innerHTML = '';
      var order = ['spell','mean','type','sent'];
      for (var c = 0; c < order.length; c++) {
        var m = order[c];
        if (!modeStats[m]) continue;
        var cs = modeStats[m], pct = cs.total > 0 ? Math.round(((cs.total - cs.wrong) / cs.total) * 100) : 0;
        var color = pct >= 95 ? '#4CAF50' : pct >= 85 ? '#7CB342' : pct >= 75 ? '#C0CA33' : pct >= 60 ? '#FDD835' : pct >= 45 ? '#FFB300' : pct >= 30 ? '#FB8C00' : '#E53935';
        var box = document.createElement('div');
        box.className = 'cat-eval-box'; box.style.background = color;
        box.innerHTML = '<span class="cat-eval-label">' + esc(modeLabel(m)) + '</span><span class="cat-eval-pct">' + pct + '%</span>';
        catEl.appendChild(box);
      }
    }
    endScreen.classList.remove('hidden');
    if (firstTryPct >= 90) setTimeout(function () { spawnFinalCelebration(); }, 500);
  }

  // =====================================================================
  // === WÖRTER VERWALTEN (Elternbereich) =================================
  // =====================================================================
  function setWordsMsg(text, good) {
    var el = document.getElementById('enw-msg');
    if (!el) return;
    el.textContent = text || '';
    el.className = 'form-msg' + (text ? (good ? ' form-msg-good' : ' form-msg-bad') : '');
  }

  function initWords() {
    setWordsMsg('');
    var a = document.getElementById('enw-de'), b = document.getElementById('enw-en'), c = document.getElementById('enw-sentence');
    if (a) a.value = ''; if (b) b.value = ''; if (c) c.value = '';
    renderWordList();
    loadOverlay(function () { renderWordList(); });
  }

  function renderWordList() {
    var wrap = document.getElementById('enw-list');
    if (!wrap) return;
    var html = '', i;

    html += '<h3 class="stats-h">Eigene Wörter (' + overlay.custom.length + ')</h3>';
    if (overlay.custom.length === 0) {
      html += '<p class="form-hint">Noch keine eigenen Wörter hinzugefügt.</p>';
    } else {
      for (i = 0; i < overlay.custom.length; i++) {
        var c = overlay.custom[i];
        html += '<div class="admin-row"><span class="admin-name">' + esc(c.de) + ' — <strong>' + esc(c.en) + '</strong>' +
          (c.sentence ? '<br><span class="enw-sentence">' + esc(c.sentence) + '</span>' : '') + '</span>' +
          '<button class="small-btn small-btn-danger" onclick="EN.deleteCustom(' + i + ')">Löschen</button></div>';
      }
    }

    var visible = [], hiddenList = [];
    for (i = 0; i < BUILTIN.length; i++) {
      if (isHidden(BUILTIN[i].en)) hiddenList.push(BUILTIN[i]); else visible.push(BUILTIN[i]);
    }

    html += '<h3 class="stats-h">Eingebaute Wörter (' + visible.length + ')</h3>';
    for (i = 0; i < visible.length; i++) {
      html += '<div class="admin-row"><span class="admin-name">' + esc(visible[i].de) + ' — <strong>' + esc(visible[i].en) + '</strong>' +
        (visible[i].sentence ? '<br><span class="enw-sentence">' + esc(visible[i].sentence) + '</span>' : '') + '</span>' +
        '<button class="small-btn" onclick="EN.hideWord(\'' + esc(normKey(visible[i].en)) + '\')">Ausblenden</button></div>';
    }

    if (hiddenList.length > 0) {
      html += '<h3 class="stats-h">Ausgeblendet (' + hiddenList.length + ')</h3>';
      html += '<p class="form-hint">Diese Wörter kommen im Spiel nicht vor.</p>';
      for (i = 0; i < hiddenList.length; i++) {
        html += '<div class="admin-row"><span class="admin-name">' + esc(hiddenList[i].de) + ' — <strong>' + esc(hiddenList[i].en) + '</strong></span>' +
          '<button class="small-btn" onclick="EN.showWord(\'' + esc(normKey(hiddenList[i].en)) + '\')">Wieder anzeigen</button></div>';
      }
    }
    wrap.innerHTML = html;
  }

  function addWord() {
    var deEl = document.getElementById('enw-de'), enEl = document.getElementById('enw-en'), stEl = document.getElementById('enw-sentence');
    var de = (deEl.value || '').trim(), en = (enEl.value || '').trim(), st = (stEl.value || '').trim();
    if (!de) { setWordsMsg('Bitte das deutsche Wort eintragen.'); return; }
    if (!en) { setWordsMsg('Bitte das englische Wort eintragen.'); return; }

    // Schon vorhanden? (eingebaut oder eigen)
    var i;
    for (i = 0; i < overlay.custom.length; i++) {
      if (normKey(overlay.custom[i].en) === normKey(en)) { setWordsMsg('"' + en + '" ist bereits in der Liste.'); return; }
    }
    for (i = 0; i < BUILTIN.length; i++) {
      if (normKey(BUILTIN[i].en) === normKey(en) && !isHidden(en)) { setWordsMsg('"' + en + '" ist schon eingebaut.'); return; }
    }

    overlay.custom.push({ de: de, en: en, sentence: st, long: (en.indexOf(' ') >= 0 && en.split(' ').length > 2) });
    // Falls das Wort vorher ausgeblendet war: wieder freigeben.
    var hi = overlay.hidden.indexOf(normKey(en));
    if (hi >= 0) overlay.hidden.splice(hi, 1);

    deEl.value = ''; enEl.value = ''; stEl.value = '';
    renderWordList();
    saveOverlay(function (hint) {
      setWordsMsg(hint ? ('Hinzugefügt. Hinweis: ' + hint) : 'Hinzugefügt!', true);
    });
  }

  function deleteCustom(idx) {
    if (idx < 0 || idx >= overlay.custom.length) return;
    var w = overlay.custom[idx];
    if (!window.confirm('"' + w.de + ' — ' + w.en + '" wirklich löschen?')) return;
    overlay.custom.splice(idx, 1);
    renderWordList();
    saveOverlay(function (hint) {
      setWordsMsg(hint ? ('Gelöscht. Hinweis: ' + hint) : 'Gelöscht.', true);
    });
  }

  function hideWord(enKey) {
    if (overlay.hidden.indexOf(enKey) < 0) overlay.hidden.push(enKey);
    renderWordList();
    saveOverlay(function (hint) {
      setWordsMsg(hint ? ('Ausgeblendet. Hinweis: ' + hint) : 'Ausgeblendet.', true);
    });
  }

  function showWord(enKey) {
    var i = overlay.hidden.indexOf(enKey);
    if (i >= 0) overlay.hidden.splice(i, 1);
    renderWordList();
    saveOverlay(function (hint) {
      setWordsMsg(hint ? ('Wieder sichtbar. Hinweis: ' + hint) : 'Wieder sichtbar.', true);
    });
  }

  return {
    // Spiel
    selectMode: selectMode,
    selectCount: selectCount,
    startGame: startGame,
    backToStart: backToStart,
    chooseOption: chooseOption,
    submitTyped: submitTyped,
    typeKey: typeKey,
    skipBreak: skipBreak,
    toggleHistory: toggleHistory,
    initStart: initStart,
    // Wörter verwalten
    initWords: initWords,
    addWord: addWord,
    deleteCustom: deleteCustom,
    hideWord: hideWord,
    showWord: showWord,
    getWords: getWords
  };
})();
