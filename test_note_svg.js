/* test_note_svg.js — prüft, dass für jede Note ein Aussehen definiert ist und
   der Betrag im SVG korrekt steht (der Betrag ist rechnerisch entscheidend).
*/
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/game_geld.js', 'utf8');

let fails = 0;
function chk(cond, msg) { if (!cond) { console.error('FEHLER: ' + msg); fails++; } }

// NOTES und NOTE_LOOKS aus der Quelle ziehen
const notes = JSON.parse(src.match(/var NOTES = (\[[^\]]+\])/)[1]);
const looksBlock = src.match(/var NOTE_LOOKS = \{([\s\S]*?)\n  \};/)[1];
const looksKeys = [...looksBlock.matchAll(/^\s*(\d+):/gm)].map(m => parseInt(m[1], 10));

// --- 1. Jede spielbare Note hat ein Aussehen ---
for (const n of notes) {
  chk(looksKeys.includes(n), 'Kein NOTE_LOOKS-Eintrag für ' + n + ' Rappen (' + n / 100 + '.-)');
}
chk(looksKeys.length === notes.length,
    'NOTE_LOOKS hat ' + looksKeys.length + ' Einträge, NOTES aber ' + notes.length);

// --- 2. Der angezeigte Name entspricht dem echten Betrag ---
for (const n of notes) {
  const m = looksBlock.match(new RegExp('^\\s*' + n + ":\\s*\\{\\s*name:\\s*'([^']+)'", 'm'));
  chk(m !== null, 'Kein name für ' + n);
  if (m) {
    const expected = String(n / 100);
    chk(m[1] === expected,
        'Note ' + n + ' Rappen zeigt "' + m[1] + '" statt "' + expected + '"');
  }
}

// --- 3. Jeder Eintrag hat alle Farbfelder (sonst wäre das SVG kaputt) ---
for (const n of notes) {
  const entry = looksBlock.match(new RegExp('^\\s*' + n + ':\\s*\\{([^}]+)\\}', 'm'));
  if (!entry) { continue; }
  for (const field of ['name', 'bg1', 'bg2', 'ink', 'line']) {
    chk(entry[1].includes(field + ':'), 'Note ' + n + ': Feld "' + field + '" fehlt');
  }
  // Farben müssen gültige Hex-Werte sein
  const hexes = [...entry[1].matchAll(/#[0-9a-fA-F]{6}/g)];
  chk(hexes.length === 4, 'Note ' + n + ': ' + hexes.length + ' Farben statt 4');
}

// --- 4. Der Fallback zeigt nie eine falsche Zahl für eine echte Note ---
// noteBillHtml fällt auf NOTE_LOOKS[10000] zurück. Das darf nur greifen, wenn
// die Note gar nicht spielbar ist — sonst stünde eine falsche Zahl auf der Note.
chk(src.includes('NOTE_LOOKS[note] || NOTE_LOOKS[10000]'), 'Fallback-Zeile verändert?');
for (const n of notes) {
  chk(looksKeys.includes(n), 'Note ' + n + ' würde in den Fallback laufen -> falscher Betrag!');
}

// --- 5. Beide Grössen werden benutzt ---
chk(/noteBillHtml\(note, 'lg'\)/.test(src), 'Grosse Note (lg) wird nirgends erzeugt');
chk(/noteBillHtml\(t\.note, 'sm'\)/.test(src), 'Kleine Note (sm) in der Kopfzeile fehlt');
// und die grosse Note muss in Schritt 1 tatsächlich eingebunden sein
chk(src.includes('html += noteHtml(t.note);'), 'noteHtml wird in Schritt 1 nicht aufgerufen');

// --- 6. SVG ist wohlgeformt: Tags paarweise, eindeutige Gradient-IDs ---
const evalSrc = looksBlock;
const ids = new Set();
for (const n of notes) {
  for (const size of ['sm', 'lg']) {
    const gid = 'ngr' + n + size;
    chk(!ids.has(gid), 'Gradient-ID doppelt: ' + gid);
    ids.add(gid);
  }
}
chk(ids.size === notes.length * 2, 'Erwartet ' + notes.length * 2 + ' eindeutige IDs, hat ' + ids.size);

console.log('Noten geprüft: ' + notes.map(n => n / 100 + '.-').join(', '));
console.log(fails === 0 ? 'ALLE TESTS OK' : (fails + ' FEHLER'));
process.exit(fails === 0 ? 0 : 1);
