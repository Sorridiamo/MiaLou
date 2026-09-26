/* test_delete_profile.js — prüft, dass ein gelöschtes Profil wirklich weg
   bleibt und nicht als "Kind" neu auftaucht.
   Hintergrund des Bugs: deleteProfile() löschte den Firebase-Zweig, während
   app.js noch einen Live-Listener (ref.on('value', ...)) auf genau diesem
   Zweig hatte. Der Listener feuerte mit data===null, was bisher als
   "noch nie synchronisiert" verstanden wurde -> pushFullState() hat den
   Zweig mit den lokalen Resten (ohne name/avatar/parentPin) neu angelegt.
*/
const fs = require('fs');
const dir = __dirname;
const app = fs.readFileSync(dir + '/app.js', 'utf8');
const prof = fs.readFileSync(dir + '/profiles.js', 'utf8');

let fails = 0;
function chk(cond, msg) { if (!cond) { console.error('FEHLER: ' + msg); fails++; } }

// --- 1. deleteProfile meldet den Listener ab, BEVOR der Zweig entfernt wird ---
const delFn = prof.match(/function deleteProfile\(profileId, done\) \{[\s\S]*?\n  \}/)[0];
const stopIdx = delFn.indexOf('APP.stopCloudSync()');
const removeIdx = delFn.indexOf('ref.remove(');
chk(stopIdx !== -1, 'deleteProfile ruft APP.stopCloudSync() nicht auf');
chk(removeIdx !== -1, 'deleteProfile ruft ref.remove() nicht auf');
chk(stopIdx !== -1 && removeIdx !== -1 && stopIdx < removeIdx,
    'Der Listener wird nicht vor dem Löschen abgemeldet — Race Condition bleibt');
chk(/if \(activeProfileId === profileId/.test(delFn),
    'stopCloudSync wird nur beim aktiven Profil aufgerufen -> Prüfung fehlt');

// --- 2. Lokale Reste werden entfernt ---
chk(/APP\.clearLocalProfileData\(profileId\)/.test(delFn),
    'deleteProfile räumt die lokalen Daten (Punkte/Sticker/Historie) nicht auf');

// --- 3. app.js: stopCloudSync meldet wirklich ab und setzt PROFILE_ID zurück ---
const stopFn = app.match(/function stopCloudSync\(\) \{[\s\S]*?\n  \}/)[0];
chk(/dbRef\.off\('value', cloudListener\)/.test(stopFn), 'stopCloudSync meldet den Listener nicht ab');
chk(/PROFILE_ID = null/.test(stopFn), 'stopCloudSync vergisst PROFILE_ID nicht');
chk(/cloudListener = null/.test(stopFn), 'stopCloudSync vergisst cloudListener nicht');

// --- 4. clearLocalProfileData räumt alle relevanten Keys weg ---
const clearFn = app.match(/function clearLocalProfileData\(profileId\) \{[\s\S]*?\n  \}/)[0];
for (const k of ['KEY_POINTS', 'KEY_OWNED', 'KEY_PLACED', 'KEY_PENDING_GIFT', 'KEY_TOTAL_EARNED', 'GAME_DATA_KEYS']) {
  chk(clearFn.includes(k), 'clearLocalProfileData vergisst ' + k);
}
chk(/localStorage\.removeItem/.test(clearFn), 'clearLocalProfileData ruft removeItem nicht auf');

// --- 5. Beide Funktionen sind aus APP exportiert, sonst kann profiles.js sie nicht rufen ---
chk(/stopCloudSync: stopCloudSync/.test(app), 'stopCloudSync nicht aus APP exportiert');
chk(/clearLocalProfileData: clearLocalProfileData/.test(app), 'clearLocalProfileData nicht aus APP exportiert');

// --- 6. switchProfile nutzt weiterhin denselben Abmelde-Weg (keine Doppelung/Drift) ---
const switchFn = app.match(/function switchProfile\(profileId\) \{[\s\S]*?\n  \}/)[0];
chk(/stopCloudSync\(\)/.test(switchFn), 'switchProfile ruft stopCloudSync() nicht auf');

// --- 7. Simulierte Race Condition: nach dem Abmelden darf pushFullState nichts mehr schreiben ---
// getDbRef() liefert null, wenn PROFILE_ID null ist -> pushFullState() muss dann früh aussteigen.
const getDbRefFn = app.match(/function getDbRef\(\) \{[\s\S]*?\n  \}/)[0];
chk(/if \(!PROFILE_ID\) return null;/.test(getDbRefFn),
    'getDbRef liefert ohne PROFILE_ID keinen Ref mehr -> Schutz fehlt');
const pushFn = app.match(/function pushFullState\(\) \{[\s\S]*?\n  \}/)[0];
chk(/var ref = getDbRef\(\);/.test(pushFn) && /if \(!ref/.test(pushFn),
    'pushFullState prüft den Ref nicht -> könnte trotzdem schreiben');

console.log(fails === 0 ? 'ALLE TESTS OK' : (fails + ' FEHLER'));
process.exit(fails === 0 ? 0 : 1);
