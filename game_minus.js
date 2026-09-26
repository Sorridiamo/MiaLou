/* game_minus.js — Subtraction game, namespaced as MI for Spielkiste */

var MI = (function() {
  'use strict';

  var STORAGE_ERRORS = 'minus_errors';
  var STORAGE_HISTORY = 'minus_history';
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

  // Game state
  var tasks = [], TOTAL = 0, queue = [];
  var correctCount = 0, wrongCount = 0, questionNumber = 0, answeredSinceBreak = 0;
  var currentInput = '', locked = false, gameStartTime = 0, gameEnded = false;
  var gameErrors = {};
  var breakTimerInterval = null, wakeLock = null;

  // Settings
  var selectedCount = 20;
  var selectedRange = 100; // 100 or 1000
  var fastGeschafftMode = false;

  // DOM refs
  var minuendEl, subtrahendEl, answerDisplay, feedback, promptText;
  var scoreText, progressFill, questionArea, mouseImg, particlesEl;
  var endScreen, endTitle, endMessage, endStats;
  var breakScreen, breakImage, breakTimer, breakTimerFill;

  // === Storage ===
  function loadS(key, fb) { return APP.gameLoad(key, fb); }
  function saveS(key, d) { APP.gameSave(key, d); }

  function shuffleArray(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function formatTime(s) { var m = Math.floor(s / 60), r = Math.round(s % 60); return m === 0 ? r + 's' : m + 'min ' + r + 's'; }

  // === Error tracking ===
  function recordError(a, b) { var k = a + '_' + b; gameErrors[k] = (gameErrors[k] || 0) + 1; }

  function saveGameErrors() {
    var list = [];
    for (var k in gameErrors) if (gameErrors[k] > 0) { var p = k.split('_'); list.push({ a: parseInt(p[0], 10), b: parseInt(p[1], 10), count: gameErrors[k] }); }
    var all = loadS(STORAGE_ERRORS, []);
    all.push(list);
    if (all.length > MAX_ERROR_GAMES) all = all.slice(all.length - MAX_ERROR_GAMES);
    saveS(STORAGE_ERRORS, all);
  }

  function getWeightedErrors() {
    var all = loadS(STORAGE_ERRORS, []), w = {}, n = all.length;
    for (var i = 0; i < n; i++) { var wt = i + 1, g = all[i]; for (var j = 0; j < g.length; j++) { var e = g[j], k = e.a + '_' + e.b; w[k] = (w[k] || 0) + e.count * wt; } }
    var sorted = [];
    for (var k2 in w) { var p = k2.split('_'), a = parseInt(p[0], 10), b = parseInt(p[1], 10); sorted.push({ a: a, b: b, result: a - b, score: w[k2] }); }
    sorted.sort(function(x, y) { return y.score - x.score; });
    return sorted.slice(0, 30);
  }

  // === History ===
  function saveGameHistory(rec) {
    var h = loadS(STORAGE_HISTORY, []);
    h.push(rec);
    if (h.length > 50) h = h.slice(h.length - 50);
    saveS(STORAGE_HISTORY, h);
  }

  function renderHistory() {
    var wrap = document.getElementById('mi-history-list'); if (!wrap) return;
    var history = loadS(STORAGE_HISTORY, []);
    if (history.length === 0) { wrap.innerHTML = '<p class="history-empty">Noch keine Spiele gespielt.</p>'; return; }
    var html = '';
    for (var i = history.length - 1; i >= 0; i--) {
      var g = history[i];
      html += '<div class="history-entry"><div class="history-header"><span class="history-date">' + g.date + '</span><span class="history-pct">' + g.correctPct + '% richtig</span></div>';
      html += '<div class="history-details"><span>' + g.totalTasks + ' Aufgaben</span><span>' + g.range + 'er</span><span>' + formatTime(g.durationSec) + '</span><span>&#8709; ' + g.avgTimeSec.toFixed(1) + 's</span></div>';
      if (g.wrongTasks && g.wrongTasks.length > 0) {
        html += '<div class="history-wrong-tasks"><span class="history-wrong-label">Falsch: </span><span class="history-wrong-list">' + g.wrongTasks.join(', ') + '</span></div>';
      }
      html += '</div>';
    }
    wrap.innerHTML = html;
  }

  // === Build solution path ===
  // For 43 - 12: decompose 12 into ones=2, tens=10 → "43 − 2 = 41, dann 41 − 10 = 31"
  // For 674 - 321: decompose into ones=1, tens=20, hundreds=300
  function buildSolutionPath(a, b) {
    var parts = [];
    var bStr = b.toString();
    var current = a;
    // Process digits from right to left (ones, tens, hundreds)
    var placeNames = ['Einer', 'Zehner', 'Hunderter'];
    for (var i = bStr.length - 1; i >= 0; i--) {
      var digit = parseInt(bStr[i], 10);
      if (digit === 0) continue;
      var placeValue = digit * Math.pow(10, bStr.length - 1 - i);
      var next = current - placeValue;
      parts.push(current + ' − ' + placeValue + ' = ' + next);
      current = next;
    }
    if (parts.length === 0) parts.push(a + ' − 0 = ' + a);
    return parts.join(', dann ');
  }

  // === Count selection ===
  function selectCount(btn) {
    fastGeschafftMode = false;
    var fgBtn = document.getElementById('mi-fg-btn');
    if (fgBtn) fgBtn.classList.remove('selected');
    var btns = document.querySelectorAll('#mi-count-selector .count-btn');
    for (var i = 0; i < btns.length; i++) btns[i].classList.remove('selected');
    btn.classList.add('selected');
    selectedCount = parseInt(btn.getAttribute('data-count'), 10);
    updateStartInfo();
  }

  function selectRange(btn) {
    var btns = document.querySelectorAll('#mi-range-selector .count-btn');
    for (var i = 0; i < btns.length; i++) btns[i].classList.remove('selected');
    btn.classList.add('selected');
    selectedRange = parseInt(btn.getAttribute('data-range'), 10);
    updateStartInfo();
  }

  function selectFastGeschafft() {
    var errors = getWeightedErrors(); if (errors.length === 0) return;
    fastGeschafftMode = true;
    var btns = document.querySelectorAll('#mi-count-selector .count-btn');
    for (var i = 0; i < btns.length; i++) btns[i].classList.remove('selected');
    var fgBtn = document.getElementById('mi-fg-btn');
    if (fgBtn) fgBtn.classList.add('selected');
    document.getElementById('mi-start-count').textContent = errors.length + ' Aufgaben';
  }

  function updateStartInfo() {
    if (fastGeschafftMode) return;
    document.getElementById('mi-start-count').textContent = selectedCount + ' Aufgaben im ' + selectedRange + 'er Bereich';
  }

  function updateFastGeschafft() {
    var errors = getWeightedErrors();
    var btn = document.getElementById('mi-fg-btn'), info = document.getElementById('mi-fg-info');
    if (!btn) return;
    if (errors.length === 0) { btn.classList.add('disabled'); if (info) info.textContent = 'Noch keine Fehler gespeichert'; }
    else { btn.classList.remove('disabled'); if (info) info.textContent = errors.length + ' Aufgaben zum Wiederholen'; }
  }

  // === Generate random subtraction task ===
  function generateTask(maxVal) {
    // a is between ceil(maxVal*0.1) and maxVal, b between 1 and a-1, so result >= 1
    var minA = Math.max(2, Math.ceil(maxVal * 0.1));
    var a = minA + Math.floor(Math.random() * (maxVal - minA + 1));
    var b = 1 + Math.floor(Math.random() * (a - 1));
    return { a: a, b: b, result: a - b };
  }

  // === Build tasks ===
  function buildTasks() {
    if (fastGeschafftMode) return getWeightedErrors();
    var t = [];
    var seen = {};
    var attempts = 0;
    while (t.length < selectedCount && attempts < selectedCount * 10) {
      var task = generateTask(selectedRange);
      var key = task.a + '_' + task.b;
      if (!seen[key]) {
        seen[key] = true;
        t.push(task);
      }
      attempts++;
    }
    return t;
  }

  // === Wake Lock ===
  async function requestWakeLock() { try { if ('wakeLock' in navigator) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', function() { wakeLock = null; }); } } catch(e) {} }
  function releaseWakeLock() { if (wakeLock) { wakeLock.release(); wakeLock = null; } }

  // === Start Game ===
  function startGame() {
    tasks = buildTasks(); if (tasks.length === 0) return;
    TOTAL = tasks.length; correctCount = 0; wrongCount = 0; questionNumber = 0; answeredSinceBreak = 0;
    currentInput = ''; locked = false; gameErrors = {}; gameStartTime = Date.now(); gameEnded = false;

    document.getElementById('mi-start-screen').classList.add('hidden');
    document.getElementById('mi-game-screen').classList.remove('hidden');

    minuendEl = document.getElementById('mi-factor-a');
    subtrahendEl = document.getElementById('mi-factor-b');
    answerDisplay = document.getElementById('mi-answer');
    feedback = document.getElementById('mi-feedback');
    promptText = document.getElementById('mi-prompt');
    scoreText = document.getElementById('mi-score-text');
    progressFill = document.getElementById('mi-progress-fill');
    questionArea = document.getElementById('mi-question-area');
    endScreen = document.getElementById('mi-end');
    endTitle = document.getElementById('mi-end-title');
    endMessage = document.getElementById('mi-end-msg');
    endStats = document.getElementById('mi-end-stats');
    mouseImg = document.getElementById('mi-mouse-img');
    particlesEl = document.getElementById('mi-particles');
    breakScreen = document.getElementById('mi-break');
    breakImage = document.getElementById('mi-break-img');
    breakTimer = document.getElementById('mi-break-timer');
    breakTimerFill = document.getElementById('mi-break-fill');

    mouseImg.src = mouseCorrect; mouseImg.style.opacity = '1';
    requestWakeLock();
    queue = []; for (var i = 0; i < tasks.length; i++) queue.push(i);
    shuffleArray(queue); shuffleArray(breakImages); breakImageIndex = 0;
    updateScore(); loadQuestion();
  }

  function backToStart() {
    releaseWakeLock();
    endScreen.classList.add('hidden');
    questionArea.classList.remove('hidden');
    document.getElementById('mi-scene').classList.remove('hidden');
    if (breakScreen) breakScreen.classList.add('hidden');
    if (breakTimerInterval) { clearInterval(breakTimerInterval); breakTimerInterval = null; }
    document.getElementById('mi-game-screen').classList.add('hidden');
    document.getElementById('mi-start-screen').classList.remove('hidden');
    initStart();
    APP.updatePointsDisplays();
  }

  // === Ende (vorzeitig beenden) ===
  function endEarly() {
    if (gameEnded) return;
    if (correctCount + wrongCount === 0) { backToStart(); return; }
    if (breakTimerInterval) { clearInterval(breakTimerInterval); breakTimerInterval = null; }
    if (breakScreen) breakScreen.classList.add('hidden');
    document.getElementById('mi-scene').classList.remove('hidden');
    TOTAL = correctCount + wrongCount;
    queue = [];
    showEnd();
  }

  // === Score ===
  function updateScore() {
    scoreText.textContent = correctCount + ' / ' + TOTAL;
    progressFill.style.width = ((correctCount / TOTAL) * 100) + '%';
  }

  // === Mouse ===
  function setMouseImage(src, anim) {
    if (mouseImg.src.indexOf(src) !== -1) return;
    if (anim) { mouseImg.style.opacity = '0'; setTimeout(function() { mouseImg.src = src; mouseImg.style.opacity = '1'; }, 200); }
    else { mouseImg.src = src; mouseImg.style.opacity = '1'; }
  }

  // === Particles ===
  function spawnParticles(count) {
    var em = ['sparkles', 'star', 'heart', 'party'];
    for (var i = 0; i < count; i++) { (function(idx) { setTimeout(function() {
      var el = document.createElement('span'); el.className = 'particle'; el.textContent = emojiMap[em[idx % em.length]];
      el.style.left = (10 + Math.random() * 80) + '%'; el.style.top = (30 + Math.random() * 50) + '%';
      el.style.fontSize = (16 + Math.random() * 14) + 'px'; el.style.animationDuration = (1.2 + Math.random() * 0.8) + 's';
      particlesEl.appendChild(el); setTimeout(function() { el.remove(); }, 2200);
    }, idx * 70); })(i); }
  }
  function spawnConfetti(count) {
    for (var i = 0; i < count; i++) { (function(idx) { setTimeout(function() {
      var el = document.createElement('div'); el.className = 'confetti';
      el.style.left = (Math.random() * 100) + '%'; el.style.top = (-5 - Math.random() * 10) + '%';
      el.style.background = confettiColors[idx % confettiColors.length];
      el.style.width = (5 + Math.random() * 5) + 'px'; el.style.height = (7 + Math.random() * 7) + 'px';
      el.style.animationDuration = (1.4 + Math.random()) + 's'; el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      particlesEl.appendChild(el); setTimeout(function() { el.remove(); }, 2800);
    }, idx * 35); })(i); }
  }
  function spawnFinalCelebration() {
    var em = ['✨', '⭐', '❤️', '🎉', '🎊', '🌟', '🌻', '🦋', '🌈'];
    for (var i = 0; i < 25; i++) { (function(idx) { setTimeout(function() {
      var el = document.createElement('span'); el.className = 'burst'; el.textContent = em[idx % em.length];
      el.style.left = '50%'; el.style.top = '50%';
      var angle = (idx / 25) * Math.PI * 2, dist = 70 + Math.random() * 100;
      var dx = Math.cos(angle) * dist, dy = Math.sin(angle) * dist;
      el.style.setProperty('--dx', dx + 'px'); el.style.setProperty('--dy', dy + 'px');
      el.style.setProperty('--dx2', (dx * 1.4) + 'px'); el.style.setProperty('--dy2', (dy * 1.4) + 'px');
      particlesEl.appendChild(el); setTimeout(function() { el.remove(); }, 2800);
    }, idx * 50); })(i); }
    spawnConfetti(30);
  }

  // === Break ===
  function showBreak() {
    questionArea.classList.add('hidden');
    document.getElementById('mi-scene').classList.add('hidden');
    breakImage.src = breakImages[breakImageIndex % breakImages.length]; breakImageIndex++;
    breakScreen.classList.remove('hidden');
    var timeLeft = 20; breakTimer.textContent = timeLeft; breakTimerFill.style.width = '100%';
    breakTimerInterval = setInterval(function() {
      timeLeft--; breakTimer.textContent = timeLeft; breakTimerFill.style.width = ((timeLeft / 20) * 100) + '%';
      if (timeLeft <= 0) endBreak();
    }, 1000);
  }
  function endBreak() {
    if (breakTimerInterval) { clearInterval(breakTimerInterval); breakTimerInterval = null; }
    breakScreen.classList.add('hidden'); questionArea.classList.remove('hidden');
    document.getElementById('mi-scene').classList.remove('hidden'); loadQuestion();
  }
  function skipBreak() { endBreak(); }

  // === Game Logic ===
  function loadQuestion() {
    if (queue.length === 0) { showEnd(); return; }
    if (answeredSinceBreak >= BREAK_EVERY && queue.length > 0) { answeredSinceBreak = 0; showBreak(); return; }
    questionNumber++;
    var t = tasks[queue[0]];
    minuendEl.textContent = t.a; subtrahendEl.textContent = t.b;
    currentInput = ''; answerDisplay.textContent = '?';
    feedback.className = 'hidden'; feedback.innerHTML = ''; locked = false;
    promptText.textContent = 'Aufgabe ' + questionNumber + ' — noch ' + queue.length + ' offen';
  }

  function numpad(val) {
    if (locked) return;
    if (val === 'del') { currentInput = currentInput.slice(0, -1); answerDisplay.textContent = currentInput || '?'; return; }
    if (val === 'ok') { if (currentInput === '') return; checkAnswer(); return; }
    if (currentInput.length >= 4) return;  // up to 999 for 1000er range
    currentInput += val; answerDisplay.textContent = currentInput;
  }

  function checkAnswer() {
    locked = true;
    var taskIdx = queue[0];
    var t = tasks[taskIdx], ans = parseInt(currentInput, 10), ok = (ans === t.result);
    queue.shift(); answeredSinceBreak++;

    if (ok) {
      correctCount++;
      feedback.innerHTML = 'Richtig!'; feedback.className = 'correct-fb';
      updateScore(); setMouseImage(mouseCorrect, true);
      APP.addPoint();
      var p = correctCount / TOTAL;
      if (p < 0.3) spawnParticles(3); else if (p < 0.6) spawnParticles(5);
      else if (p < 0.9) { spawnParticles(7); if (correctCount % 10 === 0) spawnConfetti(15); }
      else { spawnParticles(10); spawnConfetti(20); }
      if (correctCount === TOTAL) setTimeout(function() { spawnFinalCelebration(); }, 300);
    } else {
      wrongCount++; recordError(t.a, t.b);
      var path = buildSolutionPath(t.a, t.b);
      feedback.innerHTML = '<div class="wrong-answer-line">Nicht ganz. ' + t.a + ' − ' + t.b + ' = ' + t.result + '</div>' +
        '<div class="solution-path">Lösungsweg: ' + path + '</div>';
      feedback.className = 'wrong-fb wrong-fb-path';
      queue.push(taskIdx);
      setMouseImage(mouseSad, true);
      setTimeout(function() { setMouseImage(mouseCorrect, true); }, 1400);
    }
    // Longer display time when showing solution path
    var delay = ok ? 1800 : 3500;
    setTimeout(function() { loadQuestion(); }, delay);
  }

  // === Show End ===
  function showEnd() {
    if (gameEnded) return;
    gameEnded = true;
    questionArea.classList.add('hidden');
    var dur = (Date.now() - gameStartTime) / 1000, totalAns = correctCount + wrongCount;
    var avgTime = TOTAL > 0 ? dur / TOTAL : 0;
    saveGameErrors();
    var firstTryCorrect = TOTAL - Object.keys(gameErrors).length;
    var firstTryPct = Math.round((firstTryCorrect / TOTAL) * 100);

    var now = new Date();
    var ds = now.getDate().toString().padStart(2, '0') + '.' + (now.getMonth() + 1).toString().padStart(2, '0') + '.' + now.getFullYear() + ', ' + now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    var errorKeys = Object.keys(gameErrors), wrongTasks = [];
    for (var i = 0; i < errorKeys.length; i++) { var p = errorKeys[i].split('_'); wrongTasks.push(p[0] + '−' + p[1]); }

    saveGameHistory({ date: ds, totalTasks: TOTAL, range: selectedRange, correctPct: firstTryPct, durationSec: Math.round(dur), avgTimeSec: Math.round(avgTime * 10) / 10, wrongTasks: wrongTasks });

    if (firstTryPct === 100) { mouseImg.src = 'images/mouse_perfect.png'; } else { mouseImg.src = mouseCorrect; } mouseImg.style.opacity = '1';

    if (firstTryPct === 100) { endTitle.textContent = 'Perfekt!'; endMessage.textContent = 'Kein einziger Fehler — du bist ein Minus-Profi!'; }
    else if (firstTryPct >= 90) { endTitle.textContent = 'Super gemacht!'; endMessage.textContent = 'Fast alles beim ersten Mal richtig!'; }
    else if (firstTryPct >= 70) { endTitle.textContent = 'Gut!'; endMessage.textContent = 'Das klappt schon richtig gut!'; }
    else if (firstTryPct >= 50) { endTitle.textContent = 'Weiter so!'; endMessage.textContent = 'Mit etwas Übung wird es noch besser.'; }
    else { endTitle.textContent = 'Gut versucht!'; endMessage.textContent = 'Übe weiter — du schaffst das!'; }

    endStats.innerHTML = '<strong>' + firstTryCorrect + '</strong> von <strong>' + TOTAL + '</strong> Aufgaben beim ersten Versuch richtig<br><strong>' + wrongCount + '</strong> Fehler gemacht<br>Trefferquote: <strong>' + firstTryPct + '%</strong><br>Zeit: <strong>' + formatTime(Math.round(dur)) + '</strong> (∅ ' + avgTime.toFixed(1) + 's pro Aufgabe)';

    endScreen.classList.remove('hidden');
    if (firstTryPct >= 90) setTimeout(function() { spawnFinalCelebration(); }, 500);
  }

  // === History toggle ===
  function toggleHistory() {
    var list = document.getElementById('mi-history-list'), btn = document.getElementById('mi-history-toggle');
    if (list.classList.contains('hidden')) { list.classList.remove('hidden'); btn.textContent = 'Historie ausblenden'; }
    else { list.classList.add('hidden'); btn.textContent = 'Historie anzeigen'; }
  }

  // === Init start screen ===
  function initStart() {
    updateStartInfo(); updateFastGeschafft(); renderHistory();
    APP.updatePointsDisplays();
  }

  return {
    selectCount: selectCount,
    selectRange: selectRange,
    selectFastGeschafft: selectFastGeschafft,
    startGame: startGame,
    numpad: numpad,
    skipBreak: skipBreak,
    backToStart: backToStart,
    endEarly: endEarly,
    toggleHistory: toggleHistory,
    initStart: initStart
  };
})();
