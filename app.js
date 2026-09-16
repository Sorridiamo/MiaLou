/* app.js — Navigation, Points, Worlds, Shop, Sticker Drag */

var APP = (function() {
  'use strict';

  // === All 76 sticker IDs ===
  var STICKER_IDS = [
    'cat','bunny','tulip','sunflower','butterfly','mushroom','frog','ladybug','deer','blossom',
    'bird','apple','snail','rainbow','star','owl','fox','hedgehog','squirrel','bee',
    'pig','sheep','cow','horse','duck','rooster','fish','turtle','octopus','dolphin',
    'jellyfish','crab','seahorse','whale','starfish','rose','daisy','lavender','clover','cactus',
    'pinetree','oaktree','fairyhouse','fern','palmtree','fence','birdhouse','bridge','boat','lighthouse',
    'barn','windmill','cloud','sun','moon','strawberry','watermelon','cupcake','icecream','lollipop',
    'balloon','kite','treasure','crown','wand','fairy','crystal','cabin','goat','edelweiss',
    'marmot','eagle','wateringcan','gnome','dragonfly','swing'
  ];

  var STICKER_NAMES = {
    cat:'Katze', bunny:'Hase', tulip:'Tulpe', sunflower:'Sonnenblume', butterfly:'Schmetterling',
    mushroom:'Pilz', frog:'Frosch', ladybug:'Marienkäfer', deer:'Reh', blossom:'Blüte',
    bird:'Vogel', apple:'Apfel', snail:'Schnecke', rainbow:'Regenbogen', star:'Stern',
    owl:'Eule', fox:'Fuchs', hedgehog:'Igel', squirrel:'Eichhörnchen', bee:'Biene',
    pig:'Schwein', sheep:'Schaf', cow:'Kuh', horse:'Pferd', duck:'Ente',
    rooster:'Hahn', fish:'Fisch', turtle:'Schildkröte', octopus:'Krake', dolphin:'Delfin',
    jellyfish:'Qualle', crab:'Krabbe', seahorse:'Seepferdchen', whale:'Wal', starfish:'Seestern',
    rose:'Rose', daisy:'Gänseblümchen', lavender:'Lavendel', clover:'Kleeblatt', cactus:'Kaktus',
    pinetree:'Tanne', oaktree:'Eiche', fairyhouse:'Feenhaus', fern:'Farn', palmtree:'Palme',
    fence:'Zaun', birdhouse:'Vogelhaus', bridge:'Brücke', boat:'Boot', lighthouse:'Leuchtturm',
    barn:'Scheune', windmill:'Windmühle', cloud:'Wolke', sun:'Sonne', moon:'Mond',
    strawberry:'Erdbeere', watermelon:'Wassermelone', cupcake:'Cupcake', icecream:'Eis', lollipop:'Lolli',
    balloon:'Ballon', kite:'Drache', treasure:'Schatz', crown:'Krone', wand:'Zauberstab',
    fairy:'Fee', crystal:'Kristall', cabin:'Hütte', goat:'Ziege', edelweiss:'Edelweiss',
    marmot:'Murmeltier', eagle:'Adler', wateringcan:'Giesskanne', gnome:'Zwerg', dragonfly:'Libelle',
    swing:'Schaukel'
  };

  var WORLDS = ['forest','ocean','farm','mountain'];
  var WORLD_NAMES = { forest:'Wald', ocean:'Meer', farm:'Bauernhof', mountain:'Berge' };
  var PRIZE_COST = 25;

  // === LocalStorage keys (prefixed) ===
  var KEY_POINTS = 'spielkiste_points';
  var KEY_OWNED = 'spielkiste_owned_stickers';
  var KEY_PLACED = 'spielkiste_placed_stickers';

  // === State ===
  var points = 0;
  var ownedStickers = []; // sticker IDs the user bought
  var placedStickers = {}; // { worldId: [{id, x, y}, ...] }
  var currentWorld = '';
  var selectedInventorySticker = null;
  var dragTarget = null;
  var dragOffsetX = 0, dragOffsetY = 0;
  var MIN_SCALE = 0.3, MAX_SCALE = 3.0, SCALE_STEP = 0.2;
  var pinchStartDist = 0, pinchStartScale = 1, pinchTarget = null;

  // === Load / Save ===
  function load() {
    try {
      points = parseInt(localStorage.getItem(KEY_POINTS), 10) || 0;
      ownedStickers = JSON.parse(localStorage.getItem(KEY_OWNED)) || [];
      placedStickers = JSON.parse(localStorage.getItem(KEY_PLACED)) || {};
    } catch(e) {
      points = 0; ownedStickers = []; placedStickers = {};
    }
  }

  function savePoints() {
    try { localStorage.setItem(KEY_POINTS, points); } catch(e) {}
  }

  function saveOwned() {
    try { localStorage.setItem(KEY_OWNED, JSON.stringify(ownedStickers)); } catch(e) {}
  }

  function savePlaced() {
    try { localStorage.setItem(KEY_PLACED, JSON.stringify(placedStickers)); } catch(e) {}
  }

  // === Points ===
  function addPoint() {
    points++;
    savePoints();
  }

  function getPoints() { return points; }

  function getPrizesAvailable() {
    return Math.floor(points / PRIZE_COST) - ownedStickers.length;
  }

  function getPointsToNextPrize() {
    var nextThreshold = (ownedStickers.length + 1) * PRIZE_COST;
    return Math.max(0, nextThreshold - points);
  }

  function updatePointsDisplays() {
    var available = getPrizesAvailable();
    var toNext = getPointsToNextPrize();
    var txt = points + ' Punkte';
    if (available > 0) {
      txt += ' — ' + available + ' Preis' + (available > 1 ? 'e' : '') + ' verfügbar!';
    } else {
      txt += ' — noch ' + toNext + ' bis zum nächsten Preis';
    }
    var ids = ['home-points','em-points','dr-points','pl-points','mi-points','rs-points','worlds-points','shop-points'];
    for (var i = 0; i < ids.length; i++) {
      var el = document.getElementById(ids[i]);
      if (el) el.textContent = txt;
    }
  }

  // === Navigation ===
  function goTo(screen) {
    var screens = document.querySelectorAll('.screen');
    for (var i = 0; i < screens.length; i++) {
      screens[i].classList.add('hidden');
    }
    var el = document.getElementById(screen + '-screen');
    if (el) el.classList.remove('hidden');

    updatePointsDisplays();

    // Screen-specific init
    if (screen === 'em-start') { EM.initStart(); }
    if (screen === 'dr-start') { DR.initStart(); }
    if (screen === 'pl-start') { PL.initStart(); }
    if (screen === 'mi-start') { MI.initStart(); }
    if (screen === 'rs-start') { RS.initStart(); }
    if (screen === 'shop') { renderShop(); }
    if (screen === 'worlds') { /* nothing special */ }
    window.scrollTo(0, 0);
  }

  // === SHOP ===
  function renderShop() {
    var grid = document.getElementById('shop-grid');
    var info = document.getElementById('shop-info');
    var available = getPrizesAvailable();

    if (available > 0) {
      info.textContent = available + ' Preis' + (available > 1 ? 'e' : '') + ' zum Einlösen! Tippe einen Sticker an.';
    } else {
      var toNext = getPointsToNextPrize();
      info.textContent = 'Noch ' + toNext + ' Punkte bis zum nächsten Preis.';
    }

    grid.innerHTML = '';
    for (var i = 0; i < STICKER_IDS.length; i++) {
      var sid = STICKER_IDS[i];
      var owned = ownedStickers.indexOf(sid) >= 0;
      var div = document.createElement('div');
      div.className = 'shop-item' + (owned ? ' owned' : (available <= 0 ? ' locked' : ''));
      div.setAttribute('data-sid', sid);
      div.innerHTML = '<img src="images/sticker_' + sid + '.png" alt="' + (STICKER_NAMES[sid]||sid) + '">' +
                      '<span>' + (STICKER_NAMES[sid]||sid) + '</span>';
      if (!owned && available > 0) {
        div.onclick = (function(s) { return function() { buySticker(s); }; })(sid);
      }
      grid.appendChild(div);
    }
  }

  function buySticker(sid) {
    if (ownedStickers.indexOf(sid) >= 0) return;
    if (getPrizesAvailable() <= 0) return;
    ownedStickers.push(sid);
    saveOwned();
    updatePointsDisplays();
    renderShop();
  }

  // === WORLD VIEW ===
  function openWorld(worldId) {
    currentWorld = worldId;
    document.getElementById('world-bg').src = 'images/world_' + worldId + '.png';
    goTo('world-view');
    renderPlacedStickers();
  }

  function renderPlacedStickers() {
    var container = document.getElementById('world-stickers');
    container.innerHTML = '';
    var list = placedStickers[currentWorld] || [];
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      createStickerElement(container, s.id, s.x, s.y, i);
    }
  }

  function createStickerElement(container, sid, xPct, yPct, idx) {
    var list = placedStickers[currentWorld] || [];
    var scale = (list[idx] && list[idx].scale) ? list[idx].scale : 1;
    var div = document.createElement('div');
    div.className = 'placed-sticker';
    div.setAttribute('data-idx', idx);
    div.style.left = xPct + '%';
    div.style.top = yPct + '%';
    div.style.transform = 'scale(' + scale + ')';
    div.innerHTML = '<img src="images/sticker_' + sid + '.png" alt="">' +
      '<div class="sticker-controls">' +
        '<button class="sticker-btn sticker-shrink" data-idx="' + idx + '">−</button>' +
        '<button class="sticker-btn sticker-grow" data-idx="' + idx + '">+</button>' +
      '</div>';
    container.appendChild(div);
    addDragListeners(div);
    addPinchListeners(div);
    // Button handlers
    div.querySelector('.sticker-shrink').addEventListener('click', function(e) {
      e.stopPropagation(); resizeSticker(idx, -SCALE_STEP);
    });
    div.querySelector('.sticker-grow').addEventListener('click', function(e) {
      e.stopPropagation(); resizeSticker(idx, SCALE_STEP);
    });
    // Prevent button touches from starting drag
    var btns = div.querySelectorAll('.sticker-btn');
    for (var b = 0; b < btns.length; b++) {
      btns[b].addEventListener('touchstart', function(e) { e.stopPropagation(); }, { passive: false });
      btns[b].addEventListener('mousedown', function(e) { e.stopPropagation(); });
    }
  }

  function resizeSticker(idx, delta) {
    var list = placedStickers[currentWorld] || [];
    if (!list[idx]) return;
    var s = list[idx].scale || 1;
    s = Math.round((s + delta) * 10) / 10;
    s = Math.max(MIN_SCALE, Math.min(MAX_SCALE, s));
    list[idx].scale = s;
    savePlaced();
    // Update the DOM element
    var el = document.querySelector('.placed-sticker[data-idx="' + idx + '"]');
    if (el) el.style.transform = 'scale(' + s + ')';
  }

  // === PINCH TO ZOOM ===
  function addPinchListeners(el) {
    el.addEventListener('touchstart', onPinchStart, { passive: false });
  }

  function onPinchStart(e) {
    if (e.touches.length === 2) {
      e.preventDefault();
      e.stopPropagation();
      pinchTarget = e.currentTarget;
      pinchStartDist = getTouchDist(e.touches[0], e.touches[1]);
      var idx = parseInt(pinchTarget.getAttribute('data-idx'), 10);
      var list = placedStickers[currentWorld] || [];
      pinchStartScale = (list[idx] && list[idx].scale) ? list[idx].scale : 1;
      // Cancel any drag
      if (dragTarget) { dragTarget.classList.remove('dragging'); dragTarget = null; }
    }
  }

  function onPinchMove(e) {
    if (!pinchTarget || e.touches.length !== 2) return;
    e.preventDefault();
    var dist = getTouchDist(e.touches[0], e.touches[1]);
    var ratio = dist / pinchStartDist;
    var newScale = Math.round(pinchStartScale * ratio * 10) / 10;
    newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));
    pinchTarget.style.transform = 'scale(' + newScale + ')';
  }

  function onPinchEnd(e) {
    if (!pinchTarget) return;
    if (e.touches.length < 2) {
      // Save final scale
      var idx = parseInt(pinchTarget.getAttribute('data-idx'), 10);
      var currentScale = parseFloat(pinchTarget.style.transform.replace('scale(','').replace(')','')) || 1;
      var list = placedStickers[currentWorld] || [];
      if (list[idx]) { list[idx].scale = currentScale; savePlaced(); }
      pinchTarget = null;
    }
  }

  function getTouchDist(t1, t2) {
    var dx = t1.clientX - t2.clientX, dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  document.addEventListener('touchmove', function(e) {
    if (pinchTarget && e.touches.length === 2) { onPinchMove(e); return; }
    onDragMove(e);
  }, { passive: false });
  document.addEventListener('touchend', function(e) {
    if (pinchTarget) { onPinchEnd(e); return; }
    onDragEnd(e);
  });

  // === DRAG & DROP ===
  var dragStartTime = 0;
  var dragMoved = false;

  function addDragListeners(el) {
    el.addEventListener('touchstart', onDragStart, { passive: false });
    el.addEventListener('mousedown', onDragStart);
  }

  function onDragStart(e) {
    if (e.touches && e.touches.length >= 2) return; // let pinch handle it
    e.preventDefault();
    dragTarget = e.currentTarget;
    dragTarget.classList.add('dragging');
    dragStartTime = Date.now();
    dragMoved = false;
    var touch = e.touches ? e.touches[0] : e;
    var elRect = dragTarget.getBoundingClientRect();
    dragOffsetX = touch.clientX - elRect.left;
    dragOffsetY = touch.clientY - elRect.top;
  }

  function onDragMove(e) {
    if (!dragTarget) return;
    e.preventDefault();
    dragMoved = true;
    var canvas = document.getElementById('world-canvas');
    var rect = canvas.getBoundingClientRect();
    var touch = e.touches ? e.touches[0] : e;
    var x = touch.clientX - rect.left - dragOffsetX;
    var y = touch.clientY - rect.top - dragOffsetY;
    var xPct = (x / rect.width) * 100;
    var yPct = (y / rect.height) * 100;
    xPct = Math.max(-5, Math.min(95, xPct));
    yPct = Math.max(-5, Math.min(95, yPct));
    dragTarget.style.left = xPct + '%';
    dragTarget.style.top = yPct + '%';
  }

  function onDragEnd() {
    if (!dragTarget) return;
    dragTarget.classList.remove('dragging');
    var idx = parseInt(dragTarget.getAttribute('data-idx'), 10);
    var xPct = parseFloat(dragTarget.style.left);
    var yPct = parseFloat(dragTarget.style.top);
    var list = placedStickers[currentWorld] || [];
    if (list[idx]) {
      list[idx].x = xPct;
      list[idx].y = yPct;
      savePlaced();
    }
    // Short tap (no drag) = toggle resize controls
    if (!dragMoved && (Date.now() - dragStartTime) < 300) {
      dragTarget.classList.toggle('show-controls');
      // Hide controls on all other stickers
      var allStickers = document.querySelectorAll('.placed-sticker');
      for (var i = 0; i < allStickers.length; i++) {
        if (allStickers[i] !== dragTarget) allStickers[i].classList.remove('show-controls');
      }
    }
    dragTarget = null;
  }

  document.addEventListener('mousemove', onDragMove);
  document.addEventListener('mouseup', onDragEnd);

  // === INVENTORY (place sticker on world) ===
  function openInventory() {
    var inv = document.getElementById('world-inventory');
    var grid = document.getElementById('inv-grid');
    grid.innerHTML = '';
    selectedInventorySticker = null;

    // Show owned stickers not yet placed on THIS world
    var worldPlaced = (placedStickers[currentWorld] || []).map(function(s) { return s.id; });
    var available = [];
    for (var i = 0; i < ownedStickers.length; i++) {
      var sid = ownedStickers[i];
      // Each sticker can only be used once total (across all worlds)
      if (!isStickerPlacedAnywhere(sid)) {
        available.push(sid);
      }
    }

    if (available.length === 0) {
      grid.innerHTML = '<p style="grid-column:1/-1;font-size:14px;color:#7a6b5d;text-align:center;">Keine Sticker verfügbar. Kaufe im Shop neue!</p>';
    } else {
      for (var j = 0; j < available.length; j++) {
        var s = available[j];
        var div = document.createElement('div');
        div.className = 'inv-item';
        div.setAttribute('data-sid', s);
        div.innerHTML = '<img src="images/sticker_' + s + '.png" alt="">';
        div.onclick = (function(sid, el) {
          return function() { selectInventorySticker(sid, el); };
        })(s, div);
        grid.appendChild(div);
      }
    }

    inv.classList.remove('hidden');
    document.getElementById('place-btn').classList.add('hidden');
  }

  function isStickerPlacedAnywhere(sid) {
    for (var w = 0; w < WORLDS.length; w++) {
      var list = placedStickers[WORLDS[w]] || [];
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === sid) return true;
      }
    }
    return false;
  }

  function selectInventorySticker(sid, el) {
    // Deselect all
    var items = document.querySelectorAll('.inv-item');
    for (var i = 0; i < items.length; i++) items[i].classList.remove('selected');
    el.classList.add('selected');
    selectedInventorySticker = sid;

    // Place it in center of canvas
    if (!placedStickers[currentWorld]) placedStickers[currentWorld] = [];
    var idx = placedStickers[currentWorld].length;
    placedStickers[currentWorld].push({ id: sid, x: 40 + Math.random()*20, y: 40 + Math.random()*20, scale: 1 });
    savePlaced();

    var container = document.getElementById('world-stickers');
    var s = placedStickers[currentWorld][idx];
    createStickerElement(container, s.id, s.x, s.y, idx);

    closeInventory();
  }

  function closeInventory() {
    document.getElementById('world-inventory').classList.add('hidden');
    document.getElementById('place-btn').classList.remove('hidden');
    selectedInventorySticker = null;
  }

  // === INIT ===
  load();

  return {
    goTo: goTo,
    openWorld: openWorld,
    openInventory: openInventory,
    closeInventory: closeInventory,
    addPoint: addPoint,
    getPoints: getPoints,
    updatePointsDisplays: updatePointsDisplays,
    STICKER_IDS: STICKER_IDS,
    STICKER_NAMES: STICKER_NAMES
  };
})();

// Init home on load
APP.updatePointsDisplays();
