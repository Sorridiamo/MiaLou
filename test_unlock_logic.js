/* test_unlock_logic.js — prüft die Freischaltlogik der Belohnungswelten.
   Simuliert die relevante Logik aus app.js mit einem Fake-localStorage und
   spielt Szenarien durch: Punkte verdienen, Sticker kaufen, Geschenke.
*/

const LOCKED_WORLDS = [
  { id: 'park',   name: 'Freizeitpark', need: 500 },
  { id: 'castle', name: 'Schloss',      need: 1000 },
  { id: 'veggie', name: 'Gemüsegarten', need: 1500 },
  { id: 'space',  name: 'Weltall',      need: 2000 }
];
const PRIZE_COST = 25;

let fails = 0;
function chk(cond, msg) { if (!cond) { console.error('FEHLER: ' + msg); fails++; } }

// Ein Kind-Modell, das die app.js-Logik nachbildet.
function makeChild(startPoints = 0, startEarned = null) {
  return {
    points: startPoints,
    // null = Altprofil ohne den neuen Key -> load() setzt earned = points
    totalEarned: startEarned === null ? startPoints : startEarned,
    ownedStickers: [],
    unlockEvents: [],

    addEarned(amount) {
      if (!amount || amount <= 0) return [];
      const before = this.totalEarned;
      this.totalEarned += amount;
      const opened = LOCKED_WORLDS.filter(w => before < w.need && this.totalEarned >= w.need);
      opened.forEach(w => this.unlockEvents.push(w.id));
      return opened;
    },
    addPoint() { this.points++; return this.addEarned(1); },
    claimGift(amount) { this.points += amount; return this.addEarned(amount); },
    buySticker(sid) {
      const available = Math.floor(this.points / PRIZE_COST) - this.ownedStickers.length;
      if (available <= 0) return false;
      this.ownedStickers.push(sid);
      return true;
    },
    isUnlocked(id) {
      const w = LOCKED_WORLDS.find(x => x.id === id);
      return w ? this.totalEarned >= w.need : true;
    }
  };
}

// --- 1. Am Anfang ist alles Neue zu, die alten Welten sind offen ---
{
  const c = makeChild(0);
  for (const w of LOCKED_WORLDS) chk(!c.isUnlocked(w.id), `${w.id} sollte bei 0 Punkten zu sein`);
  for (const w of ['forest','ocean','farm','mountain','village','circus']) {
    chk(c.isUnlocked(w), `${w} muss von Anfang an offen sein`);
  }
}

// --- 2. Genau an der Schwelle geht die Welt auf, nicht davor ---
{
  const c = makeChild(0);
  for (let i = 0; i < 499; i++) c.addPoint();
  chk(!c.isUnlocked('park'), 'Park darf bei 499 noch zu sein');
  chk(c.unlockEvents.length === 0, 'Bei 499 darf kein Event gefeuert haben');
  c.addPoint();
  chk(c.isUnlocked('park'), 'Park muss bei genau 500 aufgehen');
  chk(c.unlockEvents.length === 1 && c.unlockEvents[0] === 'park', 'Genau ein Park-Event bei 500');
}

// --- 3. DER KERNPUNKT: ausgegebene Punkte zählen weiter mit ---
{
  const c = makeChild(0);
  for (let i = 0; i < 500; i++) c.addPoint();
  chk(c.isUnlocked('park'), 'Park offen bei 500');
  // Jetzt 20 Sticker kaufen (= 500 Punkte "ausgegeben")
  for (let i = 0; i < 20; i++) chk(c.buySticker('s' + i), 'Sticker ' + i + ' kaufbar');
  chk(c.ownedStickers.length === 20, '20 Sticker gekauft');
  chk(Math.floor(c.points / PRIZE_COST) - c.ownedStickers.length === 0, 'Warenkorb ist leer');
  chk(c.isUnlocked('park'), 'Park MUSS offen bleiben, obwohl alle Punkte ausgegeben sind');
  chk(c.totalEarned === 500, 'totalEarned bleibt 500, ist ' + c.totalEarned);
}

// --- 4. Jede Welt feuert genau einmal, in der richtigen Reihenfolge ---
{
  const c = makeChild(0);
  for (let i = 0; i < 2000; i++) {
    c.addPoint();
    // laufend Sticker kaufen, sobald möglich — darf nichts kaputt machen
    c.buySticker('s' + c.ownedStickers.length);
  }
  chk(c.unlockEvents.join(',') === 'park,castle,veggie,space',
      'Reihenfolge falsch: ' + c.unlockEvents.join(','));
  chk(c.totalEarned === 2000, 'totalEarned 2000, ist ' + c.totalEarned);
  for (const w of LOCKED_WORLDS) chk(c.isUnlocked(w.id), w.id + ' muss offen sein');
}

// --- 5. Ein grosses Geschenk kann mehrere Welten überspringen ---
{
  const c = makeChild(0);
  const opened = c.claimGift(1200);
  chk(opened.length === 2, 'Geschenk 1200 muss 2 Welten öffnen, hat ' + opened.length);
  chk(opened[0].id === 'park' && opened[1].id === 'castle', 'Park und Schloss erwartet');
  chk(c.isUnlocked('castle') && !c.isUnlocked('veggie'), 'Schloss offen, Gemüsegarten noch zu');
}

// --- 6. Altprofil: hat schon Punkte, aber noch keinen totalEarned-Key ---
{
  // Mia Lou hätte z.B. schon 640 Punkte -> Park muss sofort offen sein
  const c = makeChild(640, null);
  chk(c.totalEarned === 640, 'Altprofil übernimmt Punkte als totalEarned');
  chk(c.isUnlocked('park'), 'Altprofil mit 640 Punkten: Park sofort offen');
  chk(!c.isUnlocked('castle'), 'Schloss noch zu');
  // und der nächste Punkt darf kein Park-Event nachfeuern
  c.addPoint();
  chk(c.unlockEvents.length === 0, 'Kein nachträgliches Event für schon offene Welt');
}

// --- 7. Cloud-Merge: der höhere Wert gewinnt immer ---
{
  function merge(localEarned, cloudEarned, points) {
    return Math.max(localEarned, cloudEarned, points);
  }
  chk(merge(800, 300, 200) === 800, 'Lokal höher gewinnt');
  chk(merge(300, 900, 200) === 900, 'Cloud höher gewinnt');
  chk(merge(0, 0, 700) === 700, 'Punkte als Untergrenze');
  // Szenario: iPad hat 1200, iPhone sendet alten Stand 400 -> darf nicht zugehen
  chk(merge(1200, 400, 50) === 1200, 'Alter Stand vom anderen Gerät darf nicht runterziehen');
}

// --- 8. getNextLockedWorld ---
{
  function nextLocked(earned) {
    for (const w of LOCKED_WORLDS) if (earned < w.need) return { world: w, missing: w.need - earned };
    return null;
  }
  chk(nextLocked(0).missing === 500, 'Bei 0: 500 bis Park');
  chk(nextLocked(500).world.id === 'castle' && nextLocked(500).missing === 500, 'Bei 500: Schloss in 500');
  chk(nextLocked(1999).missing === 1, 'Bei 1999: 1 bis Weltall');
  chk(nextLocked(2000) === null, 'Bei 2000: nichts mehr verschlossen');
  chk(nextLocked(99999) === null, 'Weit darüber: nichts mehr verschlossen');
}

console.log(fails === 0 ? 'ALLE TESTS OK' : (fails + ' FEHLER'));
process.exit(fails === 0 ? 0 : 1);
