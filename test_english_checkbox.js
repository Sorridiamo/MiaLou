/* test_english_checkbox.js — prüft, dass jedes Wort (eigen + eingebaut) die
   drei Aktionen Bearbeiten / Löschen (nur eigene) / Ausblenden-Einblenden hat.

   Hintergrund: ein Kästchen-Ansatz wurde vom Nutzer verworfen — gewünscht sind
   klare Knöpfe pro Wort. "Ausblenden" blendet ein Wort nur aus (overlay.hidden),
   löscht es nicht; "Einblenden" macht es rückgängig. Das Wort selbst bleibt in
   jedem Fall gespeichert.
*/
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/game_english.js', 'utf8');

let fails = 0;
function chk(cond, msg) { if (!cond) { console.error('FEHLER: ' + msg); fails++; } }

const renderFn = src.match(/function renderWordList\(\) \{[\s\S]*?\n  \}/)[0];

// --- 1. Keine Checkbox mehr, kein toggleActive mehr ---
chk(!/type="checkbox"/.test(renderFn), 'Es gibt noch eine Checkbox statt Buttons');
chk(!/function toggleActive\(/.test(src), 'toggleActive sollte entfernt sein (Button-Ansatz statt Kästchen)');
chk(!/toggleActive: toggleActive/.test(src), 'toggleActive ist noch exportiert');

// --- 2. Eigene Wörter: Bearbeiten + Löschen + Ausblenden/Einblenden ---
const customBlock = renderFn.match(/for \(i = 0; i < overlay\.custom\.length; i\+\+\) \{[\s\S]*?\n      \}/)[0];
chk(/EN\.startEditCustom\(/.test(customBlock), 'Eigene Wörter: Bearbeiten-Knopf fehlt');
chk(/EN\.deleteCustom\(/.test(customBlock), 'Eigene Wörter: Löschen-Knopf fehlt');
chk(/EN\.hideWord\(/.test(customBlock), 'Eigene Wörter: Ausblenden-Knopf fehlt');
chk(/EN\.showWord\(/.test(customBlock), 'Eigene Wörter: Einblenden-Knopf fehlt');
chk(/cHidden/.test(customBlock), 'Eigene Wörter: Sichtbarkeitsstatus (isHidden) wird nicht geprüft');

// --- 3. Eingebaute Wörter: Bearbeiten + Löschen/Einblenden (echtes Löschen aus dem
//        Code ist nicht möglich/sinnvoll, da fix eingebaut -> "Löschen" nutzt denselben
//        sicheren Ausblenden-Mechanismus wie bei eigenen Wörtern) ---
const builtinBlock = renderFn.match(/for \(i = 0; i < BUILTIN\.length; i\+\+\) \{[\s\S]*?\n    \}/)[0];
chk(/EN\.startEditWord\(/.test(builtinBlock), 'Eingebaute Wörter: Bearbeiten-Knopf fehlt');
chk(/EN\.hideWord\(/.test(builtinBlock), 'Eingebaute Wörter: Löschen-Knopf (hideWord) fehlt');
chk(/EN\.showWord\(/.test(builtinBlock), 'Eingebaute Wörter: Einblenden-Knopf fehlt');
chk(/vHidden/.test(builtinBlock), 'Eingebaute Wörter: Sichtbarkeitsstatus (isHidden) wird nicht geprüft');
chk(/>Löschen<\/button>/.test(builtinBlock), 'Eingebaute Wörter: Knopf heisst nicht "Löschen"');

// --- 4. hideWord/showWord bleiben rein additiv auf overlay.hidden, löschen nichts ---
const hideFn = src.match(/function hideWord\(enKey\) \{[\s\S]*?\n  \}/)[0];
const showFn = src.match(/function showWord\(enKey\) \{[\s\S]*?\n  \}/)[0];
chk(/overlay\.hidden\.push/.test(hideFn), 'hideWord trägt den Schlüssel nicht in overlay.hidden ein');
chk(/overlay\.hidden\.splice/.test(showFn), 'showWord entfernt den Schlüssel nicht aus overlay.hidden');
chk(!/overlay\.custom\.splice/.test(hideFn) && !/overlay\.custom\.splice/.test(showFn),
    'hideWord/showWord dürfen keine Wörter löschen (nur ein-/ausblenden)');

// --- 5. Overlay-Schema bleibt additiv (keine Datenverluste) ---
chk(/overlay = \{ custom: \[\], hidden: \[\], edits: \{\} \}/.test(src),
    'Overlay-Grundschema verändert -> Gefahr für bestehende Wörter');
chk(/custom: v\.custom \|\| \[\], hidden: v\.hidden \|\| \[\], edits: v\.edits \|\| \{\}/.test(src),
    'Overlay-Laden ohne Fallback-Defaults -> alte Daten könnten verloren gehen');

console.log(fails === 0 ? 'ALLE TESTS OK' : (fails + ' FEHLER'));
process.exit(fails === 0 ? 0 : 1);
