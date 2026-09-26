/* test_admin_preview.js — prüft die Admin-Welten-Vorschau.
   Wichtigste Zusicherung: die Vorschau öffnet die Welten nur für die Sitzung,
   verändert die Punkte NICHT und ist für das Kind nie an.
*/
const fs = require('fs');
const dir = __dirname;
const app = fs.readFileSync(dir + '/app.js', 'utf8');
const prof = fs.readFileSync(dir + '/profiles.js', 'utf8');
const html = fs.readFileSync(dir + '/index.html', 'utf8');

let fails = 0;
function chk(cond, msg) { if (!cond) { console.error('FEHLER: ' + msg); fails++; } }

// --- Logikteil aus app.js herausschneiden und ausführen ---
const locked = app.match(/var LOCKED_WORLDS = \[[\s\S]*?\];/)[0];
const unlockFn = app.match(/function isWorldUnlocked\(worldId\) \{[\s\S]*?\n  \}/)[0];
const prevBlock = app.match(/var adminPreview = false;[\s\S]*?function isAdminPreview\(\) \{ return adminPreview; \}/)[0];

let totalEarned = 0;
const document = { getElementById: function () { return null; } };
let renderCalls = 0;
function renderWorlds() { renderCalls++; }
eval(locked + '\n' + unlockFn + '\n' + prevBlock);

// --- 1. Ohne Vorschau gilt die Punkteschwelle ---
totalEarned = 0;
setAdminPreview(false);
chk(isWorldUnlocked('forest') === true, 'Grundwelt Wald muss immer offen sein');
for (const w of ['park', 'castle', 'veggie', 'space']) {
  chk(isWorldUnlocked(w) === false, w + ' müsste bei 0 Punkten gesperrt sein');
}

// --- 2. Mit Vorschau sind alle vier offen ---
setAdminPreview(true);
chk(isAdminPreview() === true, 'isAdminPreview meldet die Vorschau nicht');
for (const w of ['park', 'castle', 'veggie', 'space']) {
  chk(isWorldUnlocked(w) === true, w + ' müsste in der Vorschau offen sein');
}

// --- 3. Die Punkte bleiben unangetastet ---
chk(totalEarned === 0, 'Die Vorschau hat totalEarned auf ' + totalEarned + ' verändert!');

// --- 4. Ausschalten sperrt sofort wieder ---
setAdminPreview(false);
chk(isAdminPreview() === false, 'Vorschau lässt sich nicht ausschalten');
for (const w of ['park', 'castle', 'veggie', 'space']) {
  chk(isWorldUnlocked(w) === false, w + ' müsste nach dem Ausschalten wieder zu sein');
}

// --- 5. Echte Schwellen funktionieren unabhängig davon weiter ---
totalEarned = 1000;
chk(isWorldUnlocked('park') === true, 'Freizeitpark bei 1000 Punkten müsste offen sein');
chk(isWorldUnlocked('castle') === true, 'Schloss bei 1000 Punkten müsste offen sein');
chk(isWorldUnlocked('veggie') === false, 'Gemüsegarten braucht 1500 Punkte');

// --- 6. Nichts wird gespeichert (kein localStorage, kein Firebase) ---
chk(!/adminPreview[\s\S]{0,200}?localStorage/.test(app),
    'adminPreview darf nicht in localStorage landen');
chk(!/localStorage[\s\S]{0,120}?adminPreview/.test(app),
    'adminPreview darf nicht aus localStorage gelesen werden');
chk(!/adminPreview/.test(prof) || /APP\.setAdminPreview/.test(prof),
    'profiles.js darf adminPreview nur über APP.setAdminPreview ansprechen');

// --- 7. Die Vorschau wird beim Verlassen des Admin-Bereichs beendet ---
const backFn = prof.match(/function backToProfileSelect\(\) \{[\s\S]*?\n  \}/)[0];
chk(/setAdminPreview\(false\)/.test(backFn),
    'backToProfileSelect schaltet die Vorschau nicht aus');
const selFn = prof.match(/function selectProfile\(profileId\) \{[\s\S]*?\n  \}/)[0];
chk(/setAdminPreview\(false\)/.test(selFn),
    'selectProfile schaltet die Vorschau nicht aus — ein Kind könnte sie erben');

// --- 8. Nur der Admin darf schalten ---
for (const fn of ['toggleWorldPreview', 'openWorldPreview']) {
  const body = prof.match(new RegExp('function ' + fn + '\\(\\) \\{[\\s\\S]*?\\n  \\}'))[0];
  chk(/if \(!isAdmin\) return;/.test(body), fn + ' prüft nicht auf isAdmin');
}

// --- 9. UI ist verdrahtet ---
chk(/PROFILES\.toggleWorldPreview\(\)/.test(html), 'Umschalt-Knopf fehlt in index.html');
chk(/PROFILES\.openWorldPreview\(\)/.test(html), '"Welten ansehen"-Knopf fehlt in index.html');
chk(/id="ad-preview-btn"/.test(html), 'Knopf-ID ad-preview-btn fehlt');
chk(/toggleWorldPreview: toggleWorldPreview/.test(prof), 'toggleWorldPreview nicht exportiert');
chk(/openWorldPreview: openWorldPreview/.test(prof), 'openWorldPreview nicht exportiert');
chk(/setAdminPreview: setAdminPreview/.test(app), 'setAdminPreview nicht aus APP exportiert');
chk(/isAdminPreview: isAdminPreview/.test(app), 'isAdminPreview nicht aus APP exportiert');

// --- 10. In der Vorschau bleibt die echte Schwelle sichtbar ---
const rw = app.match(/function renderWorlds\(\) \{[\s\S]*?\n  \}\n/)[0];
chk(/world-preview/.test(rw), 'renderWorlds setzt keine Vorschau-Kennzeichnung');
chk(/'👁 ' \+ need/.test(rw), 'Das Vorschau-Abzeichen zeigt die nötige Punktzahl nicht');
chk(/Admin-Vorschau/.test(rw), 'Die Fortschrittszeile erklärt die Vorschau nicht');
chk(fs.readFileSync(dir + '/style.css', 'utf8').includes('.world-card.world-preview'),
    'CSS für .world-preview fehlt');

console.log('Vorschau geprüft: park/castle/veggie/space, Punkte unverändert (' + totalEarned + ' nur durch den Test gesetzt)');
console.log(fails === 0 ? 'ALLE TESTS OK' : (fails + ' FEHLER'));
process.exit(fails === 0 ? 0 : 1);
