/* test_time_ch.js — prüft, dass Zeitstempel immer Schweizer Zeit zeigen,
   auch wenn das Gerät auf UTC oder eine andere Zone gesetzt ist.
   Die Logik ist identisch mit chParts/nowCH in app.js.
*/

var CH_TZ = 'Europe/Zurich';

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
    if (out.hour === 24) out.hour = 0;
    if (out.year && out.month && out.day) return out;
  } catch (e) {}
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(),
           hour: d.getHours(), minute: d.getMinutes(), second: d.getSeconds() };
}

function p2(n) { return (n < 10 ? '0' : '') + n; }

function nowCH(d) {
  var t = chParts(d);
  return p2(t.day) + '.' + p2(t.month) + '.' + t.year + ', ' + p2(t.hour) + ':' + p2(t.minute);
}

var fails = 0;
function chk(got, want, msg) {
  if (got !== want) { console.error('FEHLER: ' + msg + ' -> "' + got + '" statt "' + want + '"'); fails++; }
}

// --- 1. Der Fall aus dem Screenshot: 05:17 UTC muss 07:17 CH sein (Sommerzeit) ---
chk(nowCH(new Date('2026-09-26T05:17:00Z')), '26.09.2026, 07:17', 'Sommerzeit UTC+2');

// --- 2. Winterzeit: UTC+1 ---
chk(nowCH(new Date('2026-01-15T05:17:00Z')), '15.01.2026, 06:17', 'Winterzeit UTC+1');

// --- 3. Die Umstellungen selbst (letzter Sonntag im März / Oktober) ---
// 2026: Sommerzeit ab 29.03., Winterzeit ab 25.10.
chk(nowCH(new Date('2026-03-29T00:30:00Z')), '29.03.2026, 01:30', 'kurz vor Umstellung Fruehling');
chk(nowCH(new Date('2026-03-29T01:30:00Z')), '29.03.2026, 03:30', 'nach Umstellung Fruehling (2h Sprung)');
chk(nowCH(new Date('2026-10-25T00:30:00Z')), '25.10.2026, 02:30', 'vor Umstellung Herbst');
chk(nowCH(new Date('2026-10-25T01:30:00Z')), '25.10.2026, 02:30', 'nach Umstellung Herbst (Stunde doppelt)');

// --- 4. Tagesgrenze: UTC-Abend ist in der Schweiz schon der naechste Tag ---
chk(nowCH(new Date('2026-09-26T22:30:00Z')), '27.09.2026, 00:30', 'Mitternacht wird 00, nicht 24');
chk(nowCH(new Date('2026-09-26T23:59:00Z')), '27.09.2026, 01:59', 'Tageswechsel');

// --- 5. Jahreswechsel ---
chk(nowCH(new Date('2025-12-31T23:30:00Z')), '01.01.2026, 00:30', 'Jahreswechsel');

// --- 6. Format ist genau das, was stats.js parsen kann ---
var re = /^(\d{2})\.(\d{2})\.(\d{4}), (\d{2}):(\d{2})$/;
var samples = ['2026-09-26T05:17:00Z', '2026-01-01T00:00:00Z', '2026-07-04T12:00:00Z'];
for (var i = 0; i < samples.length; i++) {
  var s = nowCH(new Date(samples[i]));
  if (!re.test(s)) { console.error('FEHLER: Format passt nicht zum Parser: ' + s); fails++; }
}

// --- 7. Hin und zurueck: gespeicherte Zeichenkette darf sich nicht verschieben ---
// stats.js zerlegt die Zeichenkette ohne Zeitzone — das Ergebnis muss identisch
// wieder herauskommen, sonst wird die Zeit zweimal umgerechnet.
function parseDate(ds) {
  var m = String(ds).match(/^(\d{2})\.(\d{2})\.(\d{4})(?:,\s*(\d{2}):(\d{2}))?/);
  if (!m) return null;
  return new Date(+m[3], +m[2] - 1, +m[1], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0);
}
function fmtCH(d) {
  return p2(d.getDate()) + '.' + p2(d.getMonth() + 1) + '.' + d.getFullYear() +
         ', ' + p2(d.getHours()) + ':' + p2(d.getMinutes());
}
for (var j = 0; j < samples.length; j++) {
  var original = nowCH(new Date(samples[j]));
  var roundtrip = fmtCH(parseDate(original));
  chk(roundtrip, original, 'Hin und zurueck bei ' + samples[j]);
}

// --- 8. Aktuelle Zeit ist plausibel (Stunde 0-23, Minute 0-59) ---
var t = chParts();
if (!(t.hour >= 0 && t.hour <= 23)) { console.error('FEHLER: Stunde ausserhalb 0-23: ' + t.hour); fails++; }
if (!(t.minute >= 0 && t.minute <= 59)) { console.error('FEHLER: Minute ausserhalb 0-59: ' + t.minute); fails++; }
console.log('Jetzt in der Schweiz: ' + nowCH());

console.log(fails === 0 ? 'ALLE TESTS OK' : (fails + ' FEHLER'));
process.exit(fails === 0 ? 0 : 1);
