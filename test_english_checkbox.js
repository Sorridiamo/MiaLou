/* test_english_checkbox.js — prüft das neue Kästchen pro Englischwort.

   Wunsch: pro Wort ein Kästchen. Haken gesetzt = das Wort wird im Spiel
   gefragt, Haken weg = es kommt nicht vor. Das Wort selbst muss dabei
   gespeichert bleiben (keine Löschung), damit Punkte/Historie/Wörter nie
   verloren gehen. Das steuert overlay.hidden und gilt für eigene UND
   eingebaute Wörter.
*/
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/game_english.js', 'utf8');

let fails = 0;
function chk(cond, msg) { if (!cond) { console.error('FEHLER: ' + msg); fails++; } }

// --- 1. toggleActive existiert und ist exportiert ---
chk(/function toggleActive\(enKey, active\) \{/.test(src), 'toggleActive fehlt');
chk(/toggleActive: toggleActive/.test(src), 'toggleActive ist nicht aus EN exportiert');

// --- 2. toggleActive steuert overlay.hidden korrekt (an = raus, aus = rein) ---
const togFn = src.match(/function toggleActive\(enKey, active\) \{[\s\S]*?\n  \}/)[0];
chk(/var k = normKey\(enKey\);/.test(togFn), 'toggleActive normalisiert den Schlüssel nicht');
chk(/overlay\.hidden\.splice\(idx, 1\)/.test(togFn), 'toggleActive entfernt bei Haken nicht aus hidden');
chk(/overlay\.hidden\.push\(k\)/.test(togFn), 'toggleActive blendet bei fehlendem Haken nicht aus');
chk(/saveOverlay\(/.test(togFn), 'toggleActive speichert das Overlay (Cloud+lokal) nicht');
// Niemals ein Wort tatsächlich löschen:
chk(!/overlay\.custom\.splice/.test(togFn) && !/overlay\.custom\s*=/.test(togFn),
    'toggleActive darf keine Wörter löschen (nur ein-/ausblenden)');

// --- 3. Jede Zeile (eigen + eingebaut) hat ein Kästchen mit onchange -> toggleActive ---
const renderFn = src.match(/function renderWordList\(\) \{[\s\S]*?\n  \}/)[0];
const toggleCount = (renderFn.match(/EN\.toggleActive\(/g) || []).length;
chk(toggleCount >= 2, 'Kästchen fehlt bei eigenen und/oder eingebauten Wörtern (EN.toggleActive < 2x)');
chk(/type="checkbox"/.test(renderFn), 'Kein Checkbox-Element in der Wortliste');

// --- 4. Haken-Zustand spiegelt isHidden (nicht ausgeblendet = angehakt) ---
chk(/isHidden\(c\.en\) \? '' : ' checked'/.test(renderFn), 'Eigenes Wort: checked-Zustand folgt isHidden nicht');
chk(/isHidden\(vb\.en\) \? '' : ' checked'/.test(renderFn), 'Eingebautes Wort: checked-Zustand folgt isHidden nicht');

// --- 5. Overlay-Schema bleibt additiv (keine Datenverluste) ---
chk(/overlay = \{ custom: \[\], hidden: \[\], edits: \{\} \}/.test(src),
    'Overlay-Grundschema verändert -> Gefahr für bestehende Wörter');
chk(/custom: v\.custom \|\| \[\], hidden: v\.hidden \|\| \[\], edits: v\.edits \|\| \{\}/.test(src),
    'Overlay-Laden ohne Fallback-Defaults -> alte Daten könnten verloren gehen');

console.log(fails === 0 ? 'ALLE TESTS OK' : (fails + ' FEHLER'));
process.exit(fails === 0 ? 0 : 1);
