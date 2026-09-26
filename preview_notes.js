/* preview_notes.js — schreibt eine kleine HTML-Vorschau der vier Banknoten,
   damit man das Aussehen prüfen kann, ohne die App durchzuspielen.
   Nur ein Hilfsmittel; nicht Teil der App.
*/
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/game_geld.js', 'utf8');

// noteBillHtml + NOTE_LOOKS aus der Quelle herausschneiden und ausführen
const looks = src.match(/var NOTE_LOOKS = \{[\s\S]*?\n  \};/)[0];
const fn = src.match(/function noteBillHtml\(note, size\) \{[\s\S]*?\n  \}/)[0];
eval(looks + '\n' + fn);

const notes = JSON.parse(src.match(/var NOTES = (\[[^\]]+\])/)[1]);
let body = '';
for (const n of notes) {
  body += '<div style="margin:18px 0">' +
          '<div style="font:600 14px system-ui;color:#8a7f6a;margin-bottom:6px">' +
          (n / 100) + '.-  (gross / klein)</div>' +
          noteBillHtml(n, 'lg') + noteBillHtml(n, 'sm') + '</div>';
}
fs.writeFileSync(__dirname + '/_preview_notes.html',
  '<!DOCTYPE html><meta charset="utf-8"><title>Noten</title>' +
  '<body style="background:#f4f0e6;padding:24px;font-family:system-ui">' +
  '<h2 style="color:#4a4331">Banknoten</h2>' + body + '</body>');
console.log('geschrieben: _preview_notes.html');
