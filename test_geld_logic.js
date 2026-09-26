/* test_geld_logic.js — prüft die Rechenlogik der Geld-App ohne Browser.
   Aufruf: node test_geld_logic.js
   Lädt game_geld.js mit minimalen Stubs für APP/document/navigator und
   testet 20'000 zufällige Aufgaben auf Konsistenz.
*/
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, 'game_geld.js'), 'utf8');

global.APP = { gameLoad: (k, fb) => fb, gameSave: () => {}, addPoint: () => {}, updatePointsDisplays: () => {} };
global.document = { getElementById: () => null, querySelectorAll: () => [], createElement: () => ({ style: {}, remove(){}, setProperty(){} }) };
global.navigator = {};
global.window = global;

// Wir brauchen Zugriff auf die internen Funktionen -> die Testhaken anhängen.
const patched = src.replace(
  'return {\n    selectMode: selectMode,',
  'return {\n    _t: { makeChangeTask: makeChangeTask, makeMultiTask: makeMultiTask, buildChangeSteps: buildChangeSteps, fr: fr, parseMoney: parseMoney, PRODUCTS: PRODUCTS, NOTES: NOTES },\n    selectMode: selectMode,'
);
if (patched === src) { console.error('Testhaken konnte nicht eingesetzt werden.'); process.exit(1); }
eval(patched);

const T = GE._t;
let fails = 0;
function fail(msg) { if (fails < 20) console.error('FEHLER: ' + msg); fails++; }

// --- parseMoney ---
const pmCases = [['25.95', 2595], ['9.10', 910], ['9.1', 910], ['10', 1000], ['0.05', 5], ['4,05', 405], ['abc', null], ['', null]];
for (const [inp, exp] of pmCases) {
  const got = T.parseMoney(inp);
  if (got !== exp) fail(`parseMoney("${inp}") = ${got}, erwartet ${exp}`);
}

// --- fr ---
const frCases = [[2595, '25.95'], [910, '9.10'], [1000, '10.00'], [5, '0.05'], [100, '1.00']];
for (const [inp, exp] of frCases) {
  const got = T.fr(inp);
  if (got !== exp) fail(`fr(${inp}) = ${got}, erwartet ${exp}`);
}

// --- 20'000 Rückgeld-Aufgaben ---
const N = 20000;
let maxSteps = 0, minSteps = 99, stepHist = {};
for (let i = 0; i < N; i++) {
  const t = T.makeChangeTask();

  if (t.pa + t.pb !== t.total) fail('Summe stimmt nicht: ' + JSON.stringify(t));
  if (t.total >= 10000) fail('Total >= 100.-: ' + T.fr(t.total));
  if (t.note < t.total) fail('Note kleiner als Total: ' + T.fr(t.note) + ' < ' + T.fr(t.total));
  if (!T.NOTES.includes(t.note)) fail('Ungültige Note: ' + t.note);
  if (t.change !== t.note - t.total) fail('Rückgeld falsch berechnet');
  if (t.change <= 0) fail('Rückgeld <= 0');
  if (t.a.key === t.b.key) fail('Zweimal dasselbe Produkt');
  if (t.pa % 5 !== 0 || t.pb % 5 !== 0) fail('Preis nicht auf 5 Rappen: ' + t.pa + '/' + t.pb);

  const steps = T.buildChangeSteps(t.total, t.note);
  if (steps.length < 1) fail('Keine Schritte');
  maxSteps = Math.max(maxSteps, steps.length);
  minSteps = Math.min(minSteps, steps.length);
  stepHist[steps.length] = (stepHist[steps.length] || 0) + 1;

  // Die Kette muss lückenlos vom Total zur Note führen.
  let cur = t.total;
  for (let s = 0; s < steps.length; s++) {
    const st = steps[s];
    if (st.type === 'result') {
      if (s !== steps.length - 1) fail('result-Schritt nicht am Ende');
      if (st.answer !== t.change) fail('result-Antwort falsch');
      if (cur !== t.note) fail('Kette endet nicht bei der Note: ' + T.fr(cur) + ' vs ' + T.fr(t.note));
      continue;
    }
    if (st.from !== cur) fail('Schritt beginnt nicht wo der vorige endet');
    if (st.answer <= 0) fail('Schritt-Antwort <= 0 (' + st.type + '): ' + st.answer);
    const add = st.unit === 'Rappen' ? st.answer : st.answer * 100;
    if (st.from + add !== st.to) fail('from + answer != to');
    if (st.to > t.note) fail('Schritt überschreitet die Note');
    cur = st.to;
  }

  // Die Teilschritte müssen zusammen genau das Rückgeld ergeben.
  let sum = 0;
  for (const st of steps) {
    if (st.type === 'result') continue;
    sum += st.unit === 'Rappen' ? st.answer : st.answer * 100;
  }
  if (sum !== t.change) fail('Teilschritte ergeben ' + T.fr(sum) + ', Rückgeld ist ' + T.fr(t.change));

  // Rappen-Schritt darf nur 1..99 Rappen sein, Franken-Schritt 1..9
  for (const st of steps) {
    if (st.type === 'rappen' && (st.answer < 1 || st.answer > 99)) fail('Rappen-Schritt ' + st.answer);
    if (st.type === 'franken' && (st.answer < 1 || st.answer > 9)) fail('Franken-Schritt ' + st.answer);
  }
}

// --- 20'000 "mehrere Stücke" ---
for (let i = 0; i < N; i++) {
  const t = T.makeMultiTask();
  if (t.unit * t.qty !== t.total) fail('Multi-Total falsch');
  if (t.qty < 2 || t.qty > 10) fail('Menge ausserhalb 2..10: ' + t.qty);
  if (t.unit < 50) fail('Stückpreis zu klein: ' + t.unit);
  if (t.unit % 5 !== 0) fail('Stückpreis nicht auf 5 Rappen: ' + t.unit);
  if (t.total >= 20000) fail('Multi-Total sehr gross: ' + T.fr(t.total));
}

console.log('Schritte pro Rückgeld-Aufgabe: min ' + minSteps + ', max ' + maxSteps);
console.log('Verteilung: ' + JSON.stringify(stepHist));
console.log(fails === 0 ? ('ALLE TESTS OK (' + (2 * N) + ' Aufgaben)') : (fails + ' FEHLER'));
process.exit(fails === 0 ? 0 : 1);
