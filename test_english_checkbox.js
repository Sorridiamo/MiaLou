/* test_english_checkbox.js — prüft die kompakte Wortliste: eine einzige Liste
   ohne "Eigene Wörter"/"Eingebaute Wörter"-Titel, mit Bearbeiten-Knopf, einem
   ✕-Icon zum echten Löschen (nur bei eigenen Wörtern möglich) und einem
   Kreis-Icon zum Ein-/Ausblenden (farbig = wird gefragt, nur Rand = ausgeblendet).

   Wichtig: weder ✕ noch der Kreis dürfen jemals Wortdaten, Punkte oder
   Historie löschen — nur hideWord/showWord (overlay.hidden) bzw. deleteCustom
   (nur den einen eigenen Eintrag an seinem Index).
*/
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/game_english.js', 'utf8');

let fails = 0;
function chk(cond, msg) { if (!cond) { console.error('FEHLER: ' + msg); fails++; } }

const renderFn = src.match(/function renderWordList\(\) \{[\s\S]*?\n  \}/)[0];

// --- 1. Keine Kategorie-Titel mehr ---
chk(!/Eigene Wörter/.test(renderFn), 'Titel "Eigene Wörter" sollte entfernt sein');
chk(!/Eingebaute Wörter/.test(renderFn), 'Titel "Eingebaute Wörter" sollte entfernt sein');
chk(!/<h3/.test(renderFn), 'Es sollte keine Kategorie-Überschriften (h3) mehr in der Wortliste geben');

// --- 2. Eine gemeinsame Liste (rows) aus overlay.custom + BUILTIN ---
chk(/overlay\.custom\.length/.test(renderFn), 'Eigene Wörter fehlen beim Aufbau der Liste');
chk(/BUILTIN\.length/.test(renderFn), 'Eingebaute Wörter fehlen beim Aufbau der Liste');
chk(/var rows = \[\];/.test(renderFn), 'Es gibt keine gemeinsame rows-Liste');

// --- 3. ✕-Icon nur bei eigenen Wörtern (löscht echt, via deleteCustom) ---
chk(/enw-x-btn/.test(renderFn), '✕-Icon (enw-x-btn) fehlt');
chk(/r\.custom \? '<button class="enw-x-btn"/.test(renderFn), '✕-Icon ist nicht auf eigene Wörter beschränkt');
chk(/EN\.deleteCustom\(/.test(renderFn), '✕-Icon ruft deleteCustom nicht auf');

// --- 4. Kreis-Icon bei JEDEM Wort, Farbe/Rand je nach Sichtbarkeitsstatus ---
chk(/enw-circle/.test(renderFn), 'Kreis-Icon (enw-circle) fehlt');
chk(/enw-circle-on/.test(renderFn) && /enw-circle-off/.test(renderFn), 'Kreis-Icon unterscheidet nicht zwischen ein-/ausgeblendet');
chk(/EN\.' \+ \(r\.hidden \? 'showWord' : 'hideWord'\)/.test(renderFn), 'Kreis-Icon ruft nicht korrekt showWord/hideWord auf');

// --- 5. hideWord/showWord/deleteCustom bleiben rein additiv, löschen keine Wortdaten/Punkte/Historie ---
const hideFn = src.match(/function hideWord\(enKey\) \{[\s\S]*?\n  \}/)[0];
const showFn = src.match(/function showWord\(enKey\) \{[\s\S]*?\n  \}/)[0];
const delFn = src.match(/function deleteCustom\(idx\) \{[\s\S]*?\n  \}/)[0];
chk(/overlay\.hidden\.push/.test(hideFn), 'hideWord trägt den Schlüssel nicht in overlay.hidden ein');
chk(/overlay\.hidden\.splice/.test(showFn), 'showWord entfernt den Schlüssel nicht aus overlay.hidden');
chk(/overlay\.custom\.splice\(idx, 1\)/.test(delFn), 'deleteCustom entfernt nicht genau den einen Eintrag am Index');
chk(!/overlay\.custom\s*=\s*\[\]/.test(delFn), 'deleteCustom darf nicht die ganze Liste leeren');

// --- 6. Overlay-Schema bleibt additiv (keine Datenverluste) ---
chk(/overlay = \{ custom: \[\], hidden: \[\], edits: \{\} \}/.test(src),
    'Overlay-Grundschema verändert -> Gefahr für bestehende Wörter');
chk(/custom: v\.custom \|\| \[\], hidden: v\.hidden \|\| \[\], edits: v\.edits \|\| \{\}/.test(src),
    'Overlay-Laden ohne Fallback-Defaults -> alte Daten könnten verloren gehen');

console.log(fails === 0 ? 'ALLE TESTS OK' : (fails + ' FEHLER'));
process.exit(fails === 0 ? 0 : 1);
