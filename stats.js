/* stats.js — Statistik-Dashboard für den Elternbereich
 *
 * Liest die Spieldaten eines Kindes direkt aus Firebase (profiles/<id>/gameData)
 * und wertet sie aus. Greift NICHT auf localStorage zu — der Elternbereich
 * kann so auch von einem anderen Gerät aus die Daten des Kindes ansehen.
 *
 * WICHTIG für zukünftige Updates: Ein neues Spiel muss nur in GAMES ergänzt
 * werden, dann erscheint es automatisch in der Statistik. Bestehende Einträge
 * nie verändern — sonst fehlen alte Daten.
 */

var STATS = (function () {
  'use strict';

  // Definition aller Spiele: wie heissen ihre Keys, wie zählt man Aufgaben,
  // und wie beschreibt man eine falsche Aufgabe in Worten.
  var GAMES = [
    {
      key: 'einmaleins', label: 'Einmaleins',
      historyKey: 'einmaleins_history', errorsKey: 'einmaleins_errors',
      countField: 'totalTasks',
      wrongField: 'wrongTasks',
      describeWrong: function (w) {
        if (w && typeof w.a !== 'undefined') return w.a + ' × ' + w.b;
        return String(w);
      },
      errorLabel: function (e) { return e.a + ' × ' + e.b; }
    },
    {
      key: 'durch', label: 'Durch',
      historyKey: 'durch_history', errorsKey: 'durch_errors',
      countField: 'totalTasks',
      wrongField: 'wrongTasks',
      describeWrong: function (w) {
        if (w && typeof w.a !== 'undefined') return w.a + ' : ' + w.b;
        return String(w);
      },
      errorLabel: function (e) { return e.a + ' : ' + e.b; }
    },
    {
      key: 'plus', label: 'Plus',
      historyKey: 'plus_history', errorsKey: 'plus_errors',
      countField: 'totalTasks',
      wrongField: 'wrongTasks',
      describeWrong: function (w) {
        if (w && typeof w.a !== 'undefined') return w.a + ' + ' + w.b;
        return String(w);
      },
      errorLabel: function (e) { return e.a + ' + ' + e.b; }
    },
    {
      key: 'minus', label: 'Minus',
      historyKey: 'minus_history', errorsKey: 'minus_errors',
      countField: 'totalTasks',
      wrongField: 'wrongTasks',
      describeWrong: function (w) {
        if (w && typeof w.a !== 'undefined') return w.a + ' − ' + w.b;
        return String(w);
      },
      errorLabel: function (e) { return e.a + ' − ' + e.b; }
    },
    {
      key: 'rechtschreibung', label: 'Rechtschreibung',
      historyKey: 'rechtschreibung_history', errorsKey: 'rechtschreibung_errors',
      countField: 'totalWords',
      wrongField: 'wrongWords',
      describeWrong: function (w) {
        if (w && w.correct) return w.correct;
        if (w && w.word) return (w.word.correct || w.word);
        return String(w);
      },
      errorLabel: function (e) {
        if (e.word && e.word.correct) return e.word.correct;
        return String(e.word || e);
      }
    },
    {
      key: 'english', label: 'Englisch',
      historyKey: 'english_history', errorsKey: 'english_errors',
      countField: 'totalWords',
      wrongField: 'wrongWords',
      describeWrong: function (w) {
        if (w && w.word) return String(w.word);
        return String(w);
      },
      errorLabel: function (e) { return String((e && e.word) || e); }
    }
  ];

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Letzter geladener Datensatz + aktueller Spiel-Filter, damit ein Klick auf
  // einen Filter-Button nicht jedes Mal neu aus Firebase laden muss.
  var lastData = null;
  var currentFilter = 'all';

  // "25.09.2026, 20:14" -> Date  (Format der Spiele)
  function parseDate(ds) {
    if (!ds) return null;
    var m = String(ds).match(/^(\d{2})\.(\d{2})\.(\d{4})(?:,\s*(\d{2}):(\d{2}))?/);
    if (!m) return null;
    return new Date(+m[3], +m[2] - 1, +m[1], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0);
  }

  function render(profileId) {
    var box = document.getElementById('pd-stats');
    if (!box) return;
    box.innerHTML = '<p class="stats-loading">Statistiken werden geladen…</p>';

    var ref = null;
    try {
      if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length) {
        ref = firebase.database().ref('profiles/' + profileId);
      }
    } catch (e) {}

    if (!ref) {
      box.innerHTML = '<p class="stats-loading">Keine Verbindung zur Datenbank — Statistiken nicht verfügbar.</p>';
      return;
    }

    ref.once('value', function (snap) {
      lastData = snap.val() || {};
      currentFilter = 'all';
      renderFiltered();
    }, function () {
      box.innerHTML = '<p class="stats-loading">Statistiken konnten nicht geladen werden.</p>';
    });
  }

  // Zeichnet die Filter-Leiste + die (ggf. gefilterte) Statistik aus lastData
  // neu — ohne erneut aus Firebase zu laden.
  function renderFiltered() {
    var box = document.getElementById('pd-stats');
    if (!box || !lastData) return;
    box.innerHTML = filterBarHtml() + buildHtml(lastData, currentFilter);
  }

  function setFilter(key) {
    currentFilter = key || 'all';
    renderFiltered();
  }

  function filterBarHtml() {
    var items = [{ key: 'all', label: 'Alle' }];
    for (var i = 0; i < GAMES.length; i++) items.push({ key: GAMES[i].key, label: GAMES[i].label });
    var html = '<div class="stats-filter-bar">';
    for (var j = 0; j < items.length; j++) {
      var active = (currentFilter === items[j].key) ? ' stats-filter-active' : '';
      html += '<button class="stats-filter-btn' + active + '" onclick="STATS.setFilter(\'' + items[j].key + '\')">' +
              esc(items[j].label) + '</button>';
    }
    return html + '</div>';
  }

  function buildHtml(data, filterKey) {
    var gd = data.gameData || {};
    var html = '';
    var activeGames = (!filterKey || filterKey === 'all') ? GAMES : GAMES.filter(function (g) { return g.key === filterKey; });

    // --- Überblick ---
    var totalSessions = 0, totalTasks = 0, pctSum = 0, pctCount = 0, lastPlayed = null;
    var perGame = [];

    for (var i = 0; i < activeGames.length; i++) {
      var g = activeGames[i];
      var hist = gd[g.historyKey];
      if (!Array.isArray(hist)) hist = [];
      var tasks = 0, pSum = 0, pN = 0, last = null;
      for (var j = 0; j < hist.length; j++) {
        var rec = hist[j] || {};
        tasks += (rec[g.countField] || 0);
        if (typeof rec.correctPct === 'number') { pSum += rec.correctPct; pN++; }
        var d = parseDate(rec.date);
        if (d && (!last || d > last)) last = d;
      }
      totalSessions += hist.length;
      totalTasks += tasks;
      pctSum += pSum; pctCount += pN;
      if (last && (!lastPlayed || last > lastPlayed)) lastPlayed = last;
      perGame.push({ g: g, hist: hist, tasks: tasks, avgPct: pN ? Math.round(pSum / pN) : null, last: last });
    }

    var overallPct = pctCount ? Math.round(pctSum / pctCount) : null;

    html += '<div class="stats-section">';
    html += '<h3 class="stats-h">Überblick</h3>';
    if (totalSessions === 0) {
      html += '<p class="stats-loading">Noch keine Spiele gespielt.</p>';
    } else {
      html += '<div class="stats-tiles">';
      html += tile(totalSessions, totalSessions === 1 ? 'Spiel' : 'Spiele');
      html += tile(totalTasks, 'Aufgaben');
      html += tile(overallPct === null ? '—' : overallPct + '%', 'richtig');
      html += tile(typeof data.points === 'number' ? data.points : 0, 'Punkte');
      html += '</div>';
      if (lastPlayed) {
        html += '<p class="stats-note">Zuletzt gespielt: ' + esc(fmtDate(lastPlayed)) + '</p>';
      }
    }
    html += '</div>';

    // --- Pro Spiel ---
    html += '<div class="stats-section">';
    html += '<h3 class="stats-h">Pro Spiel</h3>';
    var anyGame = false;
    for (var k = 0; k < perGame.length; k++) {
      var pg = perGame[k];
      if (pg.hist.length === 0) continue;
      anyGame = true;
      html += '<div class="stats-game">';
      html += '<div class="stats-game-head"><span class="stats-game-name">' + esc(pg.g.label) + '</span>' +
              '<span class="stats-game-pct">' + (pg.avgPct === null ? '—' : pg.avgPct + '%') + '</span></div>';
      html += '<div class="stats-game-sub">' + pg.hist.length + (pg.hist.length === 1 ? ' Spiel' : ' Spiele') +
              ' · ' + pg.tasks + ' Aufgaben' +
              (pg.last ? ' · zuletzt ' + esc(fmtDate(pg.last)) : '') + '</div>';
      html += trendHtml(pg);
      html += '</div>';
    }
    if (!anyGame) html += '<p class="stats-loading">Noch keine Spiele gespielt.</p>';
    html += '</div>';

    // --- Entwicklung: erste vs. letzte Spiele ---
    html += developmentHtml(perGame);

    // --- Was muss mehr geübt werden ---
    html += practiceHtml(gd, activeGames);

    // --- Verlauf (letzte Spiele im Detail) ---
    html += recentHtml(perGame);

    return html;
  }

  function tile(value, label) {
    return '<div class="stats-tile"><span class="stats-tile-val">' + esc(value) + '</span>' +
           '<span class="stats-tile-lbl">' + esc(label) + '</span></div>';
  }

  function fmtDate(d) {
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.' + d.getFullYear() +
           ', ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  // Kleiner Balken-Verlauf der letzten 10 Spiele (Prozent richtig)
  function trendHtml(pg) {
    var recent = pg.hist.slice(-10);
    var bars = '';
    for (var i = 0; i < recent.length; i++) {
      var pct = typeof recent[i].correctPct === 'number' ? recent[i].correctPct : 0;
      var cls = pct >= 90 ? 'bar-good' : (pct >= 70 ? 'bar-mid' : 'bar-low');
      bars += '<div class="stats-bar ' + cls + '" style="height:' + Math.max(4, pct) + '%" ' +
              'title="' + esc((recent[i].date || '') + ' — ' + pct + '%') + '"></div>';
    }
    if (!bars) return '';
    return '<div class="stats-bars">' + bars + '</div>' +
           '<div class="stats-bars-lbl">Letzte ' + recent.length +
           (recent.length === 1 ? ' Spiel' : ' Spiele') + ' (% richtig)</div>';
  }

  // Entwicklung: Durchschnitt der ersten 3 vs. der letzten 3 Spiele
  function developmentHtml(perGame) {
    var rows = '';
    for (var i = 0; i < perGame.length; i++) {
      var pg = perGame[i];
      if (pg.hist.length < 4) continue; // zu wenig Daten für eine Aussage
      var first = avgPct(pg.hist.slice(0, 3));
      var last = avgPct(pg.hist.slice(-3));
      if (first === null || last === null) continue;
      var diff = last - first;
      var cls = diff > 2 ? 'dev-up' : (diff < -2 ? 'dev-down' : 'dev-flat');
      var arrow = diff > 2 ? '▲' : (diff < -2 ? '▼' : '▬');
      rows += '<div class="stats-dev-row">' +
                '<span class="stats-dev-name">' + esc(pg.g.label) + '</span>' +
                '<span class="stats-dev-from">' + first + '%</span>' +
                '<span class="stats-dev-arrow ' + cls + '">' + arrow + '</span>' +
                '<span class="stats-dev-to">' + last + '%</span>' +
                '<span class="stats-dev-diff ' + cls + '">' +
                  (diff > 0 ? '+' : '') + diff + '</span>' +
              '</div>';
    }
    var html = '<div class="stats-section"><h3 class="stats-h">Entwicklung</h3>';
    if (!rows) {
      html += '<p class="stats-loading">Noch zu wenig Spiele für einen Vergleich (ab 4 Spielen pro Spiel).</p>';
    } else {
      html += '<p class="stats-note">Erste 3 Spiele im Vergleich zu den letzten 3.</p>' + rows;
    }
    return html + '</div>';
  }

  function avgPct(list) {
    var s = 0, n = 0;
    for (var i = 0; i < list.length; i++) {
      if (typeof list[i].correctPct === 'number') { s += list[i].correctPct; n++; }
    }
    return n ? Math.round(s / n) : null;
  }

  // Was muss mehr geübt werden: gewichtete Fehlerlisten pro Spiel.
  // Gleiche Gewichtung wie in den Spielen: neuere Spiele zählen mehr.
  function practiceHtml(gd, games) {
    var html = '<div class="stats-section"><h3 class="stats-h">Was muss mehr geübt werden</h3>';
    var any = false;

    for (var i = 0; i < games.length; i++) {
      var g = games[i];
      var all = gd[g.errorsKey];
      if (!Array.isArray(all) || all.length === 0) continue;

      var weights = {};
      var labels = {};
      for (var j = 0; j < all.length; j++) {
        var wt = j + 1; // spätere Spiele stärker gewichten
        var games = all[j];
        if (!Array.isArray(games)) continue;
        for (var k = 0; k < games.length; k++) {
          var e = games[k] || {};
          var lbl;
          try { lbl = g.errorLabel(e); } catch (err) { lbl = null; }
          if (!lbl) continue;
          weights[lbl] = (weights[lbl] || 0) + (e.count || 1) * wt;
          labels[lbl] = true;
        }
      }

      var sorted = Object.keys(weights).sort(function (x, y) { return weights[y] - weights[x]; });
      if (sorted.length === 0) continue;
      any = true;

      html += '<div class="stats-practice"><div class="stats-practice-name">' + esc(g.label) + '</div>';
      html += '<div class="stats-chips">';
      var max = Math.min(12, sorted.length);
      for (var s = 0; s < max; s++) {
        var strength = weights[sorted[s]] / weights[sorted[0]];
        var cls = strength > 0.66 ? 'chip-hot' : (strength > 0.33 ? 'chip-warm' : 'chip-cool');
        html += '<span class="stats-chip ' + cls + '">' + esc(sorted[s]) + '</span>';
      }
      html += '</div>';
      if (sorted.length > max) {
        html += '<div class="stats-bars-lbl">und ' + (sorted.length - max) + ' weitere</div>';
      }
      html += '</div>';
    }

    if (!any) html += '<p class="stats-loading">Keine Fehler gespeichert — alles richtig gemacht.</p>';
    return html + '</div>';
  }

  // Detailverlauf: die letzten Spiele über alle Spiele hinweg, chronologisch
  function recentHtml(perGame) {
    var all = [];
    for (var i = 0; i < perGame.length; i++) {
      var pg = perGame[i];
      for (var j = 0; j < pg.hist.length; j++) {
        var rec = pg.hist[j] || {};
        all.push({
          game: pg.g,
          rec: rec,
          when: parseDate(rec.date)
        });
      }
    }
    all.sort(function (a, b) {
      var ta = a.when ? a.when.getTime() : 0;
      var tb = b.when ? b.when.getTime() : 0;
      return tb - ta;
    });

    var html = '<div class="stats-section"><h3 class="stats-h">Wann wurde was gemacht</h3>';
    if (all.length === 0) {
      html += '<p class="stats-loading">Noch keine Spiele gespielt.</p>';
      return html + '</div>';
    }

    var max = Math.min(20, all.length);
    for (var n = 0; n < max; n++) {
      var it = all[n];
      var rec = it.rec;
      var count = rec[it.game.countField] || 0;
      var pct = typeof rec.correctPct === 'number' ? rec.correctPct : null;
      var pctCls = pct === null ? '' : (pct >= 90 ? 'pct-good' : (pct >= 70 ? 'pct-mid' : 'pct-low'));

      html += '<div class="stats-log">';
      html += '<div class="stats-log-head">' +
                '<span class="stats-log-game">' + esc(it.game.label) + '</span>' +
                '<span class="stats-log-date">' + esc(rec.date || '') + '</span>' +
              '</div>';
      html += '<div class="stats-log-sub">' + count + ' Aufgaben' +
              (pct === null ? '' : ' · <span class="' + pctCls + '">' + pct + '% richtig</span>') +
              (rec.durationSec ? ' · ' + fmtDur(rec.durationSec) : '') +
              (rec.avgTimeSec ? ' · ø ' + rec.avgTimeSec + 's' : '') +
              '</div>';

      // Falsch beantwortete Aufgaben dieses Spiels
      var wrong = rec[it.game.wrongField];
      if (Array.isArray(wrong) && wrong.length) {
        html += '<div class="stats-chips stats-chips-sm">';
        var wmax = Math.min(15, wrong.length);
        for (var w = 0; w < wmax; w++) {
          var lbl;
          try { lbl = it.game.describeWrong(wrong[w]); } catch (e) { lbl = null; }
          if (!lbl) continue;
          html += '<span class="stats-chip chip-wrong">' + esc(lbl) + '</span>';
        }
        if (wrong.length > wmax) {
          html += '<span class="stats-chip chip-more">+' + (wrong.length - wmax) + '</span>';
        }
        html += '</div>';
      }
      html += '</div>';
    }
    if (all.length > max) {
      html += '<div class="stats-bars-lbl">und ' + (all.length - max) + ' weitere Spiele</div>';
    }
    return html + '</div>';
  }

  function fmtDur(sec) {
    sec = Math.round(sec);
    var m = Math.floor(sec / 60), s = sec % 60;
    if (m === 0) return s + 's';
    return m + 'min ' + (s < 10 ? '0' : '') + s + 's';
  }

  return { render: render, setFilter: setFilter, GAMES: GAMES };
})();
