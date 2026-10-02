/* test_english_edit.js — prüft, dass eigene (hinzugefügte) Englischwörter
   bearbeitet werden können und dabei nichts verloren geht.

   Hintergrund des Bugs: eigene Wörter hatten in der Verwaltung nur einen
   "Löschen"-Knopf, aber kein "Bearbeiten" — man konnte sie also nach dem
   Hinzufügen nicht mehr anpassen. Eingebaute Wörter konnten das schon
   (startEditWord -> overlay.edits). Für eigene Wörter fehlte der Pfad.

   Die eigenen Wörter liegen direkt in overlay.custom, deshalb braucht es einen
   eigenen Bearbeiten-Weg (startEditCustom + saveEditedCustom), der genau diesen
   Eintrag ersetzt — ohne Punkte, Historie oder andere Wörter anzurühren.
*/
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/game_english.js', 'utf8');

let fails = 0;
function chk(cond, msg) { if (!cond) { console.error('FEHLER: ' + msg); fails++; } }

// --- 1. Eigene Wörter bekommen in der Liste einen Bearbeiten-Knopf ---
const renderFn = src.match(/function renderWordList\(\) \{[\s\S]*?\n  \}/)[0];
const customBlock = renderFn.match(/for \(i = 0; i < overlay\.custom\.length; i\+\+\) \{[\s\S]*?\n      \}/)[0];
chk(/EN\.startEditCustom\(/.test(customBlock),
    'Eigene Wörter haben keinen Bearbeiten-Knopf (EN.startEditCustom fehlt in der Zeile)');
chk(/EN\.deleteCustom\(/.test(customBlock),
    'Löschen-Knopf bei eigenen Wörtern verschwunden');

// --- 2. Es gibt getrennte Zustände für eingebaut vs. eigen ---
chk(/var editingCustomIdx = null;/.test(src), 'editingCustomIdx fehlt (eigener Bearbeitungszustand)');

// --- 3. startEditCustom füllt das Formular und merkt sich den Index ---
const startFn = src.match(/function startEditCustom\(idx\) \{[\s\S]*?\n  \}/)[0];
chk(/editingCustomIdx = idx;/.test(startFn), 'startEditCustom merkt sich den Index nicht');
chk(/editingKey = null;/.test(startFn), 'startEditCustom setzt editingKey nicht zurück -> Zustände vermischen sich');

// --- 4. startEditWord (eingebaut) räumt den eigenen Zustand weg (kein Drift) ---
const startWordFn = src.match(/function startEditWord\(enKey\) \{[\s\S]*?\n  \}/)[0];
chk(/editingCustomIdx = null;/.test(startWordFn), 'startEditWord setzt editingCustomIdx nicht zurück');

// --- 5. addWord leitet beim Bearbeiten eines eigenen Wortes richtig um ---
const addFn = src.match(/function addWord\(\) \{[\s\S]*?\n  \}/)[0];
const idxCustom = addFn.indexOf('saveEditedCustom');
const idxBuiltin = addFn.indexOf('saveEditedWord');
chk(idxCustom !== -1, 'addWord ruft saveEditedCustom nicht auf');
chk(idxCustom !== -1 && idxBuiltin !== -1 && idxCustom < idxBuiltin,
    'addWord prüft den eigenen Bearbeitungsfall nicht VOR dem eingebauten');

// --- 6. saveEditedCustom ersetzt genau den Eintrag an idx (kein Neu-Anhängen) ---
const saveFn = src.match(/function saveEditedCustom\(de, en, st\) \{[\s\S]*?\n  \}/)[0];
chk(/overlay\.custom\[idx\] = \{/.test(saveFn), 'saveEditedCustom ersetzt den Eintrag nicht an seiner Stelle');
chk(!/overlay\.custom\.push/.test(saveFn), 'saveEditedCustom hängt fälschlich einen neuen Eintrag an');
chk(/editingCustomIdx = null;/.test(saveFn), 'saveEditedCustom beendet den Bearbeitungszustand nicht');
chk(/saveOverlay\(/.test(saveFn), 'saveEditedCustom speichert das Overlay (Cloud+lokal) nicht');

// --- 7. Dublettenprüfung schliesst den bearbeiteten Eintrag selbst aus ---
chk(/i !== idx/.test(saveFn),
    'Dublettenprüfung blockiert das Wort gegen sich selbst (i !== idx fehlt)');

// --- 8. cancel/initWords setzen auch den eigenen Zustand zurück ---
const cancelFn = src.match(/function cancelEditWord\(\) \{[\s\S]*?\n  \}/)[0];
chk(/editingCustomIdx = null;/.test(cancelFn), 'cancelEditWord vergisst editingCustomIdx');
const initFn = src.match(/function initWords\(\) \{[\s\S]*?\n  \}/)[0];
chk(/editingCustomIdx = null;/.test(initFn), 'initWords setzt editingCustomIdx nicht zurück');

// --- 9. Neuer Einstieg ist aus EN exportiert, sonst greift der onclick ins Leere ---
chk(/startEditCustom: startEditCustom/.test(src), 'startEditCustom ist nicht aus EN exportiert');

// --- 10. Das Overlay-Schema bleibt additiv (custom/hidden/edits) — keine Datenverluste ---
chk(/overlay = \{ custom: \[\], hidden: \[\], edits: \{\} \}/.test(src),
    'Overlay-Grundschema verändert -> Gefahr für bestehende Wörter');
chk(/custom: v\.custom \|\| \[\], hidden: v\.hidden \|\| \[\], edits: v\.edits \|\| \{\}/.test(src),
    'Overlay-Laden ohne Fallback-Defaults -> alte Daten könnten verloren gehen');

console.log(fails === 0 ? 'ALLE TESTS OK' : (fails + ' FEHLER'));
process.exit(fails === 0 ? 0 : 1);
