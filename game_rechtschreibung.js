/* game_rechtschreibung.js — Namespaced as RS for Spielkiste */

var RS = (function() {
  'use strict';

  // === WORD DATABASE ===
  var WORDS = {
    tz_z: [
      // Nach kurzem Vokal steht tz
      {correct:'Katze',wrong:'Kaze',type:'tz',rule:'Nach kurzem Vokal steht tz.'},
      {correct:'Tatze',wrong:'Taze',type:'tz',rule:'Nach kurzem Vokal steht tz.'},
      {correct:'Matratze',wrong:'Matraze',type:'tz',rule:'Nach kurzem Vokal steht tz.'},
      {correct:'Spatz',wrong:'Spaz',type:'tz',rule:'Nach kurzem Vokal steht tz.'},
      {correct:'Platz',wrong:'Plaz',type:'tz',rule:'Nach kurzem Vokal steht tz.'},
      {correct:'Schatz',wrong:'Schaz',type:'tz',rule:'Nach kurzem Vokal steht tz.'},
      {correct:'Satz',wrong:'Saz',type:'tz',rule:'Nach kurzem Vokal steht tz.'},
      {correct:'Blitz',wrong:'Bliz',type:'tz',rule:'Nach kurzem Vokal steht tz.'},
      {correct:'Witz',wrong:'Wiz',type:'tz',rule:'Nach kurzem Vokal steht tz.'},
      {correct:'Hitze',wrong:'Hize',type:'tz',rule:'Nach kurzem Vokal steht tz.'},
      {correct:'Mütze',wrong:'Müze',type:'tz',rule:'Nach kurzem Vokal steht tz.'},
      {correct:'Pfütze',wrong:'Pfüze',type:'tz',rule:'Nach kurzem Vokal steht tz.'},
      {correct:'Stütze',wrong:'Stüze',type:'tz',rule:'Nach kurzem Vokal steht tz.'},
      {correct:'Glatze',wrong:'Glaze',type:'tz',rule:'Nach kurzem Vokal steht tz.'},
      {correct:'Netz',wrong:'Nez',type:'tz',rule:'Nach kurzem Vokal steht tz.'},
      {correct:'Gesetz',wrong:'Gesez',type:'tz',rule:'Nach kurzem Vokal steht tz.'},
      {correct:'Fetzen',wrong:'Fezen',type:'tz',rule:'Nach kurzem Vokal steht tz.'},
      {correct:'Hetze',wrong:'Heze',type:'tz',rule:'Nach kurzem Vokal steht tz.'},
      {correct:'Klotz',wrong:'Kloz',type:'tz',rule:'Nach kurzem Vokal steht tz.'},
      {correct:'Trotz',wrong:'Troz',type:'tz',rule:'Nach kurzem Vokal steht tz.'},
      {correct:'Schlitz',wrong:'Schliz',type:'tz',rule:'Nach kurzem Vokal steht tz.'},
      {correct:'Schmutz',wrong:'Schmuz',type:'tz',rule:'Nach kurzem Vokal steht tz.'},
      {correct:'Schutz',wrong:'Schuz',type:'tz',rule:'Nach kurzem Vokal steht tz.'},
      {correct:'Sitz',wrong:'Siz',type:'tz',rule:'Nach kurzem Vokal steht tz.'},
      {correct:'Spitze',wrong:'Spize',type:'tz',rule:'Nach kurzem Vokal steht tz.'},
      {correct:'Spritze',wrong:'Sprize',type:'tz',rule:'Nach kurzem Vokal steht tz.'},
      {correct:'Ritze',wrong:'Rize',type:'tz',rule:'Nach kurzem Vokal steht tz.'},
      {correct:'Putz',wrong:'Puz',type:'tz',rule:'Nach kurzem Vokal steht tz.'},
      {correct:'Nutzen',wrong:'Nuzen',type:'tz',rule:'Nach kurzem Vokal steht tz.'},
      {correct:'schwitzen',wrong:'schwizen',type:'tz',rule:'Nach kurzem Vokal steht tz.'},
      {correct:'flitzen',wrong:'flizen',type:'tz',rule:'Nach kurzem Vokal steht tz.'},
      {correct:'kitzeln',wrong:'kizeln',type:'tz',rule:'Nach kurzem Vokal steht tz.'},
      {correct:'kratzen',wrong:'krazen',type:'tz',rule:'Nach kurzem Vokal steht tz.'},
      {correct:'schmatzen',wrong:'schmazen',type:'tz',rule:'Nach kurzem Vokal steht tz.'},
      {correct:'glitzern',wrong:'glizern',type:'tz',rule:'Nach kurzem Vokal steht tz.'},
      {correct:'plötzlich',wrong:'plözlich',type:'tz',rule:'Nach kurzem Vokal steht tz.'},
      {correct:'petzen',wrong:'pezen',type:'tz',rule:'Nach kurzem Vokal steht tz.'},
      {correct:'wetzen',wrong:'wezen',type:'tz',rule:'Nach kurzem Vokal steht tz.'},
      {correct:'schwätzen',wrong:'schwäzen',type:'tz',rule:'Nach kurzem Vokal steht tz.'},
      {correct:'stutzen',wrong:'stuzen',type:'tz',rule:'Nach kurzem Vokal steht tz.'},
      {correct:'verletzen',wrong:'verlezen',type:'tz',rule:'Nach kurzem Vokal steht tz.'},
      {correct:'ersetzen',wrong:'ersezen',type:'tz',rule:'Nach kurzem Vokal steht tz.'},
      {correct:'motzen',wrong:'mozen',type:'tz',rule:'Nach kurzem Vokal steht tz.'},
      {correct:'Batzen',wrong:'Bazen',type:'tz',rule:'Nach kurzem Vokal steht tz.'},
      {correct:'Fratze',wrong:'Fraze',type:'tz',rule:'Nach kurzem Vokal steht tz.'},
      {correct:'Grütze',wrong:'Grüze',type:'tz',rule:'Nach kurzem Vokal steht tz.'},
      {correct:'Schnitzel',wrong:'Schnizel',type:'tz',rule:'Nach kurzem Vokal steht tz.'},
      {correct:'Metzger',wrong:'Mezger',type:'tz',rule:'Nach kurzem Vokal steht tz.'},
      // Nach langem Vokal steht z
      {correct:'Kapuze',wrong:'Kaputze',type:'z',rule:'Nach langem Vokal steht z.'},
      {correct:'Mieze',wrong:'Mietze',type:'z',rule:'Nach langem Vokal steht z.'},
      // Nach au, eu oder ei steht z
      {correct:'Schnauze',wrong:'Schnautze',type:'z',rule:'Nach dem Doppellaut au steht nur z.'},
      {correct:'Kreuz',wrong:'Kreutz',type:'z',rule:'Nach dem Doppellaut eu steht nur z.'},
      {correct:'Reiz',wrong:'Reitz',type:'z',rule:'Nach dem Doppellaut ei steht nur z.'},
      {correct:'Weizen',wrong:'Weitzen',type:'z',rule:'Nach dem Doppellaut ei steht nur z.'},
      {correct:'heizen',wrong:'heitzen',type:'z',rule:'Nach dem Doppellaut ei steht nur z.'},
      {correct:'Geiz',wrong:'Geitz',type:'z',rule:'Nach dem Doppellaut ei steht nur z.'},
      {correct:'Kauz',wrong:'Kautz',type:'z',rule:'Nach dem Doppellaut au steht nur z.'},
      {correct:'beizen',wrong:'beitzen',type:'z',rule:'Nach dem Doppellaut ei steht nur z.'},
      {correct:'Spreize',wrong:'Spreitze',type:'z',rule:'Nach dem Doppellaut ei steht nur z.'},
      // Nach l, n oder r steht z
      {correct:'Salz',wrong:'Saltz',type:'z',rule:'Nach dem Mitlaut l steht nur z.'},
      {correct:'Pilz',wrong:'Piltz',type:'z',rule:'Nach dem Mitlaut l steht nur z.'},
      {correct:'Holz',wrong:'Holtz',type:'z',rule:'Nach dem Mitlaut l steht nur z.'},
      {correct:'Schmalz',wrong:'Schmaltz',type:'z',rule:'Nach dem Mitlaut l steht nur z.'},
      {correct:'Walze',wrong:'Waltze',type:'z',rule:'Nach dem Mitlaut l steht nur z.'},
      {correct:'Grenze',wrong:'Grentze',type:'z',rule:'Nach dem Mitlaut n steht nur z.'},
      {correct:'Pflanze',wrong:'Pflantze',type:'z',rule:'Nach dem Mitlaut n steht nur z.'},
      {correct:'Tanz',wrong:'Tantz',type:'z',rule:'Nach dem Mitlaut n steht nur z.'},
      {correct:'Kranz',wrong:'Krantz',type:'z',rule:'Nach dem Mitlaut n steht nur z.'},
      {correct:'Glanz',wrong:'Glantz',type:'z',rule:'Nach dem Mitlaut n steht nur z.'},
      {correct:'Schwanz',wrong:'Schwantz',type:'z',rule:'Nach dem Mitlaut n steht nur z.'},
      {correct:'Herz',wrong:'Hertz',type:'z',rule:'Nach dem Mitlaut r steht nur z.'},
      {correct:'Schmerz',wrong:'Schmertz',type:'z',rule:'Nach dem Mitlaut r steht nur z.'},
      {correct:'Scherz',wrong:'Schertz',type:'z',rule:'Nach dem Mitlaut r steht nur z.'},
      {correct:'Gewürz',wrong:'Gewürtz',type:'z',rule:'Nach dem Mitlaut r steht nur z.'},
      {correct:'Wurzel',wrong:'Wurtzel',type:'z',rule:'Nach dem Mitlaut r steht nur z.'},
      {correct:'Kerze',wrong:'Kertze',type:'z',rule:'Nach dem Mitlaut r steht nur z.'},
      {correct:'Warze',wrong:'Wartze',type:'z',rule:'Nach dem Mitlaut r steht nur z.'},
      {correct:'Sturz',wrong:'Sturtz',type:'z',rule:'Nach dem Mitlaut r steht nur z.'},
      {correct:'Würze',wrong:'Würtze',type:'z',rule:'Nach dem Mitlaut r steht nur z.'},
      {correct:'schwarz',wrong:'schwartz',type:'z',rule:'Nach dem Mitlaut r steht nur z.'},
      {correct:'März',wrong:'Märtz',type:'z',rule:'Nach dem Mitlaut r steht nur z.'},
      {correct:'Arzt',wrong:'Artzt',type:'z',rule:'Nach dem Mitlaut r steht nur z.'},
      {correct:'Harz',wrong:'Hartz',type:'z',rule:'Nach dem Mitlaut r steht nur z.'},
      {correct:'Erz',wrong:'Ertz',type:'z',rule:'Nach dem Mitlaut r steht nur z.'},
      {correct:'kurz',wrong:'kurtz',type:'z',rule:'Nach dem Mitlaut r steht nur z.'},
      {correct:'Bolzen',wrong:'Boltzen',type:'z',rule:'Nach dem Mitlaut l steht nur z.'},
      {correct:'Schürze',wrong:'Schürtze',type:'z',rule:'Nach dem Mitlaut r steht nur z.'},
      {correct:'Münze',wrong:'Müntze',type:'z',rule:'Nach dem Mitlaut n steht nur z.'},
      {correct:'Kanzel',wrong:'Kantzel',type:'z',rule:'Nach dem Mitlaut n steht nur z.'},
      {correct:'Winzer',wrong:'Wintzer',type:'z',rule:'Nach dem Mitlaut n steht nur z.'},
      {correct:'Panzer',wrong:'Pantzer',type:'z',rule:'Nach dem Mitlaut n steht nur z.'},
      {correct:'Stelze',wrong:'Steltze',type:'z',rule:'Nach dem Mitlaut l steht nur z.'},
      {correct:'Bronze',wrong:'Brontze',type:'z',rule:'Nach dem Mitlaut n steht nur z.'},
      {correct:'Schanze',wrong:'Schantze',type:'z',rule:'Nach dem Mitlaut n steht nur z.'},
      {correct:'Lanze',wrong:'Lantze',type:'z',rule:'Nach dem Mitlaut n steht nur z.'},
      {correct:'Wanze',wrong:'Wantze',type:'z',rule:'Nach dem Mitlaut n steht nur z.'},
      // Merkwörter
      {correct:'Notizen',wrong:'Notitzen',type:'z',rule:'Merkwort — einfach lernen.'},
      {correct:'Medizin',wrong:'Meditzin',type:'z',rule:'Merkwort — einfach lernen.'},
      {correct:'Rezept',wrong:'Retzept',type:'z',rule:'Merkwort — einfach lernen.'},
      {correct:'Benzin',wrong:'Bentzin',type:'z',rule:'Merkwort — einfach lernen.'},
      {correct:'Horizont',wrong:'Horitzont',type:'z',rule:'Merkwort — einfach lernen.'},
      {correct:'sozial',wrong:'sotzial',type:'z',rule:'Merkwort — einfach lernen.'},
      {correct:'speziell',wrong:'spetziell',type:'z',rule:'Merkwort — einfach lernen.'},
      {correct:'Spezialist',wrong:'Spetzialist',type:'z',rule:'Merkwort — einfach lernen.'},
      {correct:'Polizei',wrong:'Politzei',type:'z',rule:'Merkwort — einfach lernen.'},
      {correct:'Dezember',wrong:'Detzember',type:'z',rule:'Merkwort — einfach lernen.'}
    ],
    ck_k: [
      // Nach kurzem Vokal steht ck
      {correct:'Jacke',wrong:'Jake',type:'ck',rule:'Nach kurzem Vokal steht ck.'},
      {correct:'Decke',wrong:'Deke',type:'ck',rule:'Nach kurzem Vokal steht ck.'},
      {correct:'Ecke',wrong:'Eke',type:'ck',rule:'Nach kurzem Vokal steht ck.'},
      {correct:'Fleck',wrong:'Flek',type:'ck',rule:'Nach kurzem Vokal steht ck.'},
      {correct:'lecker',wrong:'leker',type:'ck',rule:'Nach kurzem Vokal steht ck.'},
      {correct:'Schnecke',wrong:'Schneke',type:'ck',rule:'Nach kurzem Vokal steht ck.'},
      {correct:'stecken',wrong:'steken',type:'ck',rule:'Nach kurzem Vokal steht ck.'},
      {correct:'wecken',wrong:'weken',type:'ck',rule:'Nach kurzem Vokal steht ck.'},
      {correct:'Becken',wrong:'Beken',type:'ck',rule:'Nach kurzem Vokal steht ck.'},
      {correct:'Dreck',wrong:'Drek',type:'ck',rule:'Nach kurzem Vokal steht ck.'},
      {correct:'dick',wrong:'dik',type:'ck',rule:'Nach kurzem Vokal steht ck.'},
      {correct:'Blick',wrong:'Blik',type:'ck',rule:'Nach kurzem Vokal steht ck.'},
      {correct:'klicken',wrong:'kliken',type:'ck',rule:'Nach kurzem Vokal steht ck.'},
      {correct:'schicken',wrong:'schiken',type:'ck',rule:'Nach kurzem Vokal steht ck.'},
      {correct:'Strick',wrong:'Strik',type:'ck',rule:'Nach kurzem Vokal steht ck.'},
      {correct:'Trick',wrong:'Trik',type:'ck',rule:'Nach kurzem Vokal steht ck.'},
      {correct:'Glück',wrong:'Glük',type:'ck',rule:'Nach kurzem Vokal steht ck.'},
      {correct:'Stück',wrong:'Stük',type:'ck',rule:'Nach kurzem Vokal steht ck.'},
      {correct:'Brücke',wrong:'Brüke',type:'ck',rule:'Nach kurzem Vokal steht ck.'},
      {correct:'Rücken',wrong:'Rüken',type:'ck',rule:'Nach kurzem Vokal steht ck.'},
      {correct:'drücken',wrong:'drüken',type:'ck',rule:'Nach kurzem Vokal steht ck.'},
      {correct:'Lücke',wrong:'Lüke',type:'ck',rule:'Nach kurzem Vokal steht ck.'},
      {correct:'Mücke',wrong:'Müke',type:'ck',rule:'Nach kurzem Vokal steht ck.'},
      {correct:'schmücken',wrong:'schmüken',type:'ck',rule:'Nach kurzem Vokal steht ck.'},
      {correct:'Schluck',wrong:'Schluk',type:'ck',rule:'Nach kurzem Vokal steht ck.'},
      {correct:'Zucker',wrong:'Zuker',type:'ck',rule:'Nach kurzem Vokal steht ck.'},
      {correct:'locker',wrong:'loker',type:'ck',rule:'Nach kurzem Vokal steht ck.'},
      {correct:'Rock',wrong:'Rok',type:'ck',rule:'Nach kurzem Vokal steht ck.'},
      {correct:'Socke',wrong:'Soke',type:'ck',rule:'Nach kurzem Vokal steht ck.'},
      {correct:'Block',wrong:'Blok',type:'ck',rule:'Nach kurzem Vokal steht ck.'},
      {correct:'Glocke',wrong:'Gloke',type:'ck',rule:'Nach kurzem Vokal steht ck.'},
      {correct:'hocken',wrong:'hoken',type:'ck',rule:'Nach kurzem Vokal steht ck.'},
      {correct:'trocken',wrong:'troken',type:'ck',rule:'Nach kurzem Vokal steht ck.'},
      {correct:'Stock',wrong:'Stok',type:'ck',rule:'Nach kurzem Vokal steht ck.'},
      {correct:'packen',wrong:'paken',type:'ck',rule:'Nach kurzem Vokal steht ck.'},
      {correct:'Hacke',wrong:'Hake',type:'ck',rule:'Nach kurzem Vokal steht ck.'},
      {correct:'knacken',wrong:'knaken',type:'ck',rule:'Nach kurzem Vokal steht ck.'},
      {correct:'Acker',wrong:'Aker',type:'ck',rule:'Nach kurzem Vokal steht ck.'},
      {correct:'Scheck',wrong:'Schek',type:'ck',rule:'Nach kurzem Vokal steht ck.'},
      {correct:'Zweck',wrong:'Zwek',type:'ck',rule:'Nach kurzem Vokal steht ck.'},
      {correct:'Speck',wrong:'Spek',type:'ck',rule:'Nach kurzem Vokal steht ck.'},
      {correct:'Besteck',wrong:'Bestek',type:'ck',rule:'Nach kurzem Vokal steht ck.'},
      {correct:'Gebäck',wrong:'Gebäk',type:'ck',rule:'Nach kurzem Vokal steht ck.'},
      {correct:'Schreck',wrong:'Schrek',type:'ck',rule:'Nach kurzem Vokal steht ck.'},
      {correct:'Dackel',wrong:'Dakel',type:'ck',rule:'Nach kurzem Vokal steht ck.'},
      {correct:'Fackel',wrong:'Fakel',type:'ck',rule:'Nach kurzem Vokal steht ck.'},
      {correct:'Pickel',wrong:'Pikel',type:'ck',rule:'Nach kurzem Vokal steht ck.'},
      {correct:'wickeln',wrong:'wikeln',type:'ck',rule:'Nach kurzem Vokal steht ck.'},
      {correct:'Krücke',wrong:'Krüke',type:'ck',rule:'Nach kurzem Vokal steht ck.'},
      {correct:'Bock',wrong:'Bok',type:'ck',rule:'Nach kurzem Vokal steht ck.'},
      {correct:'Zacke',wrong:'Zake',type:'ck',rule:'Nach kurzem Vokal steht ck.'},
      {correct:'Nacken',wrong:'Naken',type:'ck',rule:'Nach kurzem Vokal steht ck.'},
      // Nach langem Vokal steht k
      {correct:'Haken',wrong:'Hacken',type:'k',rule:'Nach langem Vokal steht k.'},
      {correct:'Küken',wrong:'Kücken',type:'k',rule:'Nach langem Vokal steht k.'},
      {correct:'Ekel',wrong:'Eckel',type:'k',rule:'Nach langem Vokal steht k.'},
      {correct:'Pokal',wrong:'Pockal',type:'k',rule:'Nach langem Vokal steht k.'},
      {correct:'Bikini',wrong:'Bickini',type:'k',rule:'Nach langem Vokal steht k.'},
      {correct:'Risiko',wrong:'Risicko',type:'k',rule:'Nach langem Vokal steht k.'},
      {correct:'Musik',wrong:'Musick',type:'k',rule:'Nach langem Vokal steht k.'},
      {correct:'Fabrik',wrong:'Fabrick',type:'k',rule:'Nach langem Vokal steht k.'},
      {correct:'Kritik',wrong:'Kritick',type:'k',rule:'Nach langem Vokal steht k.'},
      {correct:'Fokus',wrong:'Fockus',type:'k',rule:'Nach langem Vokal steht k.'},
      {correct:'Keks',wrong:'Kecks',type:'k',rule:'Nach langem Vokal steht k.'},
      {correct:'Lokal',wrong:'Lockal',type:'k',rule:'Nach langem Vokal steht k.'},
      // Nach au, eu oder ei steht k
      {correct:'Schaukel',wrong:'Schauckel',type:'k',rule:'Nach dem Doppellaut au steht nur k.'},
      {correct:'heikel',wrong:'heickel',type:'k',rule:'Nach dem Doppellaut ei steht nur k.'},
      {correct:'Streik',wrong:'Streick',type:'k',rule:'Nach dem Doppellaut ei steht nur k.'},
      {correct:'Pauke',wrong:'Paucke',type:'k',rule:'Nach dem Doppellaut au steht nur k.'},
      // Nach l, n oder r steht k
      {correct:'Wolke',wrong:'Wolcke',type:'k',rule:'Nach dem Mitlaut l steht nur k.'},
      {correct:'Balken',wrong:'Balcken',type:'k',rule:'Nach dem Mitlaut l steht nur k.'},
      {correct:'Falke',wrong:'Falcke',type:'k',rule:'Nach dem Mitlaut l steht nur k.'},
      {correct:'Enkel',wrong:'Enckel',type:'k',rule:'Nach dem Mitlaut n steht nur k.'},
      {correct:'denken',wrong:'dencken',type:'k',rule:'Nach dem Mitlaut n steht nur k.'},
      {correct:'danken',wrong:'dancken',type:'k',rule:'Nach dem Mitlaut n steht nur k.'},
      {correct:'sinken',wrong:'sincken',type:'k',rule:'Nach dem Mitlaut n steht nur k.'},
      {correct:'trinken',wrong:'trincken',type:'k',rule:'Nach dem Mitlaut n steht nur k.'},
      {correct:'schenken',wrong:'schencken',type:'k',rule:'Nach dem Mitlaut n steht nur k.'},
      {correct:'lenken',wrong:'lencken',type:'k',rule:'Nach dem Mitlaut n steht nur k.'},
      {correct:'krank',wrong:'kranck',type:'k',rule:'Nach dem Mitlaut n steht nur k.'},
      {correct:'Schrank',wrong:'Schranck',type:'k',rule:'Nach dem Mitlaut n steht nur k.'},
      {correct:'Bank',wrong:'Banck',type:'k',rule:'Nach dem Mitlaut n steht nur k.'},
      {correct:'dunkel',wrong:'dunckel',type:'k',rule:'Nach dem Mitlaut n steht nur k.'},
      {correct:'Anker',wrong:'Ancker',type:'k',rule:'Nach dem Mitlaut n steht nur k.'},
      {correct:'merken',wrong:'mercken',type:'k',rule:'Nach dem Mitlaut r steht nur k.'},
      {correct:'Marke',wrong:'Marcke',type:'k',rule:'Nach dem Mitlaut r steht nur k.'},
      {correct:'Werk',wrong:'Werck',type:'k',rule:'Nach dem Mitlaut r steht nur k.'},
      {correct:'stark',wrong:'starck',type:'k',rule:'Nach dem Mitlaut r steht nur k.'},
      {correct:'Park',wrong:'Parck',type:'k',rule:'Nach dem Mitlaut r steht nur k.'},
      {correct:'Gurke',wrong:'Gurcke',type:'k',rule:'Nach dem Mitlaut r steht nur k.'},
      {correct:'Korken',wrong:'Korcken',type:'k',rule:'Nach dem Mitlaut r steht nur k.'},
      {correct:'Birke',wrong:'Bircke',type:'k',rule:'Nach dem Mitlaut r steht nur k.'},
      {correct:'Zirkus',wrong:'Zirckus',type:'k',rule:'Nach dem Mitlaut r steht nur k.'},
      {correct:'Funke',wrong:'Funcke',type:'k',rule:'Nach dem Mitlaut n steht nur k.'},
      {correct:'Onkel',wrong:'Onckel',type:'k',rule:'Nach dem Mitlaut n steht nur k.'},
      {correct:'Winkel',wrong:'Winckel',type:'k',rule:'Nach dem Mitlaut n steht nur k.'},
      {correct:'Ranke',wrong:'Rancke',type:'k',rule:'Nach dem Mitlaut n steht nur k.'},
      {correct:'Schinken',wrong:'Schincken',type:'k',rule:'Nach dem Mitlaut n steht nur k.'},
      {correct:'Klinke',wrong:'Klincke',type:'k',rule:'Nach dem Mitlaut n steht nur k.'},
      {correct:'Henkel',wrong:'Henckel',type:'k',rule:'Nach dem Mitlaut n steht nur k.'},
      {correct:'Parkett',wrong:'Parckett',type:'k',rule:'Nach dem Mitlaut r steht nur k.'}
    ]
  };

  var RULE_SUMMARIES = {
    tz:'Merke: Nach einem kurzen Selbstlaut (a, e, i, o, u) schreibt man tz.',
    z:'Merke: Nach einem Mitlaut (l, n, r ...) oder Doppellaut (ei, au, eu) schreibt man nur z.',
    ck:'Merke: Nach einem kurzen Selbstlaut (a, e, i, o, u) schreibt man ck.',
    k:'Merke: Nach einem Mitlaut (l, n, r ...) oder Doppellaut schreibt man nur k.'
  };

  var STORAGE_ERRORS = 'rechtschreibung_errors';
  var STORAGE_HISTORY = 'rechtschreibung_history';
  var MAX_ERROR_GAMES = 5;
  var BREAK_EVERY = 20;

  var mouseCorrect = 'images/mouse_correct.png';
  var mouseSad = 'images/mouse_sad_wide.png';
  var breakImages = [
    'images/mouse_0.png','images/mouse_1.png','images/mouse_2.png','images/mouse_3.png',
    'images/mouse_4.png','images/mouse_5.png','images/mouse_6.png','images/mouse_perfect.png'
  ];
  var breakImageIndex = 0;
  var confettiColors = ['#f5b0c0','#f5d98e','#b8d8a3','#a8d4e6','#d8b4f0','#f0b880','#7ec88b','#e88080'];
  var emojiMap = {sparkles:'✨',star:'⭐',heart:'❤️',party:'🎉',tada:'🎊'};

  var tasks=[], TOTAL=0, queue=[];
  var correctCount=0, wrongCount=0, questionNumber=0, answeredSinceBreak=0;
  var locked=false, gameStartTime=0;
  var gameErrors={}, catStats={};
  var breakTimerInterval=null, wakeLock=null;
  var selectedCategories=['tz_z','ck_k'], selectedCount=100, fastGeschafftMode=false;
  var currentCorrectSide='';

  var scoreText, progressFill, questionArea, endScreen;
  var endTitle, endMessage, endStats, mouseImg, particlesEl;
  var feedback, promptText, ruleBox, breakScreen, breakImage, breakTimer, breakTimerFill;
  var btnA, btnB;

  function loadS(k,f){try{var r=localStorage.getItem(k);return r?JSON.parse(r):f;}catch(e){return f;}}
  function saveS(k,d){try{localStorage.setItem(k,JSON.stringify(d));}catch(e){}}
  function shuffleArray(a){for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;}return a;}
  function formatTime(s){var m=Math.floor(s/60),r=Math.round(s%60);return m===0?r+'s':m+'min '+r+'s';}

  // Error tracking
  function recordError(w){gameErrors[w]=(gameErrors[w]||0)+1;}
  function recordCatAttempt(cat,ok){if(!catStats[cat])catStats[cat]={wrong:0,total:0};catStats[cat].total++;if(!ok)catStats[cat].wrong++;}

  function saveGameErrors(){
    var list=[];for(var k in gameErrors)if(gameErrors[k]>0)list.push({word:k,count:gameErrors[k]});
    var all=loadS(STORAGE_ERRORS,[]);all.push(list);
    if(all.length>MAX_ERROR_GAMES)all=all.slice(all.length-MAX_ERROR_GAMES);
    saveS(STORAGE_ERRORS,all);
  }

  function getWeightedErrors(){
    var all=loadS(STORAGE_ERRORS,[]),w={},n=all.length;
    for(var i=0;i<n;i++){var wt=i+1,g=all[i];for(var j=0;j<g.length;j++){var e=g[j];w[e.word]=(w[e.word]||0)+e.count*wt;}}
    var allW=WORDS.tz_z.concat(WORDS.ck_k),sorted=[];
    for(var wd in w){for(var k=0;k<allW.length;k++){if(allW[k].correct===wd){sorted.push({word:allW[k],score:w[wd]});break;}}}
    sorted.sort(function(a,b){return b.score-a.score;});
    return sorted;
  }

  // History
  function saveGameHistory(rec){var h=loadS(STORAGE_HISTORY,[]);h.push(rec);if(h.length>50)h=h.slice(h.length-50);saveS(STORAGE_HISTORY,h);}

  function renderHistory(){
    var wrap=document.getElementById('rs-history-list');if(!wrap)return;
    var history=loadS(STORAGE_HISTORY,[]);
    if(history.length===0){wrap.innerHTML='<p class="history-empty">Noch keine Spiele gespielt.</p>';return;}
    var html='';
    for(var i=history.length-1;i>=0;i--){
      var g=history[i];
      html+='<div class="history-entry"><div class="history-header"><span class="history-date">'+g.date+'</span><span class="history-pct">'+g.correctPct+'% richtig</span></div>';
      html+='<div class="history-details"><span>'+g.totalWords+' Wörter</span><span>'+formatTime(g.durationSec)+'</span><span>&#8709; '+g.avgTimeSec.toFixed(1)+'s</span></div>';
      html+='<div class="history-cats">';
      if(g.categories){for(var c=0;c<g.categories.length;c++){var cl=g.categories[c]==='tz_z'?'tz/z':'ck/k';var cc=g.categories[c]==='tz_z'?'#7ec88b':'#6baed6';html+='<span class="history-cat-badge" style="background:'+cc+'">'+cl+'</span>';}}
      html+='</div>';
      if(g.wrongWords&&g.wrongWords.length>0){html+='<div class="history-wrong-words"><span class="history-wrong-label">Falsch: </span><span class="history-wrong-list">'+g.wrongWords.join(', ')+'</span></div>';}
      html+='</div>';
    }
    wrap.innerHTML=html;
  }

  // Start screen
  function toggleCat(btn){
    var cat=btn.getAttribute('data-cat'),idx=selectedCategories.indexOf(cat);
    if(idx>=0){if(selectedCategories.length<=1)return;selectedCategories.splice(idx,1);btn.classList.remove('selected');}
    else{selectedCategories.push(cat);btn.classList.add('selected');}
    fastGeschafftMode=false;var fg=document.getElementById('rs-fg-btn');if(fg)fg.classList.remove('selected');
    updateStartCount();
  }

  function selectCount(btn){
    fastGeschafftMode=false;var fg=document.getElementById('rs-fg-btn');if(fg)fg.classList.remove('selected');
    var btns=document.querySelectorAll('#rs-start-screen .count-btn:not(.fg-btn)');
    for(var i=0;i<btns.length;i++)btns[i].classList.remove('selected');
    btn.classList.add('selected');selectedCount=parseInt(btn.getAttribute('data-count'),10);
    updateStartCount();
  }

  function selectFastGeschafft(){
    var errors=getWeightedErrors();if(errors.length===0)return;
    fastGeschafftMode=true;
    var btns=document.querySelectorAll('#rs-start-screen .count-btn:not(.fg-btn)');
    for(var i=0;i<btns.length;i++)btns[i].classList.remove('selected');
    var fg=document.getElementById('rs-fg-btn');if(fg)fg.classList.add('selected');
    document.getElementById('rs-start-count').textContent=errors.length+' Wörter zum Wiederholen';
  }

  function updateStartCount(){
    if(fastGeschafftMode)return;
    var pool=getWordPool(),count=Math.min(selectedCount,pool.length);
    document.getElementById('rs-start-count').textContent=count+' Wörter';
  }

  function updateFastGeschafft(){
    var errors=getWeightedErrors();
    var btn=document.getElementById('rs-fg-btn'),info=document.getElementById('rs-fg-info');
    if(!btn)return;
    if(errors.length===0){btn.classList.add('disabled');if(info)info.textContent='Noch keine Fehler gespeichert';}
    else{btn.classList.remove('disabled');if(info)info.textContent=errors.length+' Wörter zum Wiederholen';}
  }

  function getWordPool(){
    var pool=[];
    for(var i=0;i<selectedCategories.length;i++){var cat=selectedCategories[i];if(WORDS[cat])for(var j=0;j<WORDS[cat].length;j++)pool.push({word:WORDS[cat][j],cat:cat});}
    return pool;
  }

  // Wake lock
  async function requestWakeLock(){try{if('wakeLock' in navigator){wakeLock=await navigator.wakeLock.request('screen');wakeLock.addEventListener('release',function(){wakeLock=null;});}}catch(e){}}
  function releaseWakeLock(){if(wakeLock){wakeLock.release();wakeLock=null;}}

  // Start game
  function startGame(){
    if(fastGeschafftMode){
      var errors=getWeightedErrors();if(errors.length===0)return;
      tasks=[];for(var e=0;e<errors.length;e++){var w=errors[e].word;var cat='tz_z';if(w.type==='ck'||w.type==='k')cat='ck_k';tasks.push({word:w,cat:cat});}
    } else {
      var pool=getWordPool();if(pool.length===0)return;
      shuffleArray(pool);var count=Math.min(selectedCount,pool.length);tasks=pool.slice(0,count);
    }
    TOTAL=tasks.length;correctCount=0;wrongCount=0;questionNumber=0;answeredSinceBreak=0;
    locked=false;gameErrors={};catStats={};gameStartTime=Date.now();

    document.getElementById('rs-start-screen').classList.add('hidden');
    document.getElementById('rs-game-screen').classList.remove('hidden');

    scoreText=document.getElementById('rs-score-text');
    progressFill=document.getElementById('rs-progress-fill');
    questionArea=document.getElementById('rs-question-area');
    endScreen=document.getElementById('rs-end');
    endTitle=document.getElementById('rs-end-title');
    endMessage=document.getElementById('rs-end-msg');
    endStats=document.getElementById('rs-end-stats');
    mouseImg=document.getElementById('rs-mouse-img');
    particlesEl=document.getElementById('rs-particles');
    feedback=document.getElementById('rs-feedback');
    promptText=document.getElementById('rs-prompt');
    ruleBox=document.getElementById('rs-rule-box');
    breakScreen=document.getElementById('rs-break');
    breakImage=document.getElementById('rs-break-img');
    breakTimer=document.getElementById('rs-break-timer');
    breakTimerFill=document.getElementById('rs-break-fill');
    btnA=document.getElementById('rs-btn-a');
    btnB=document.getElementById('rs-btn-b');

    mouseImg.src=mouseCorrect;mouseImg.style.opacity='1';
    requestWakeLock();
    queue=[];for(var i=0;i<tasks.length;i++)queue.push(i);
    shuffleArray(queue);shuffleArray(breakImages);breakImageIndex=0;
    updateScore();loadQuestion();
  }

  function backToStart(){
    releaseWakeLock();
    endScreen.classList.add('hidden');questionArea.classList.remove('hidden');
    document.getElementById('rs-scene').classList.remove('hidden');
    if(breakScreen)breakScreen.classList.add('hidden');
    if(breakTimerInterval){clearInterval(breakTimerInterval);breakTimerInterval=null;}
    document.getElementById('rs-game-screen').classList.add('hidden');
    document.getElementById('rs-start-screen').classList.remove('hidden');
    initStart();APP.updatePointsDisplays();
  }

  function updateScore(){scoreText.textContent=correctCount+' / '+TOTAL;progressFill.style.width=((correctCount/TOTAL)*100)+'%';}

  function setMouseImage(src,anim){
    if(mouseImg.src.indexOf(src)!==-1)return;
    if(anim){mouseImg.style.opacity='0';setTimeout(function(){mouseImg.src=src;mouseImg.style.opacity='1';},200);}
    else{mouseImg.src=src;mouseImg.style.opacity='1';}
  }

  function spawnParticles(count){
    var em=['sparkles','star','heart','party'];
    for(var i=0;i<count;i++){(function(idx){setTimeout(function(){
      var el=document.createElement('span');el.className='particle';el.textContent=emojiMap[em[idx%em.length]];
      el.style.left=(10+Math.random()*80)+'%';el.style.top=(30+Math.random()*50)+'%';
      el.style.fontSize=(16+Math.random()*14)+'px';el.style.animationDuration=(1.2+Math.random()*0.8)+'s';
      particlesEl.appendChild(el);setTimeout(function(){el.remove();},2200);
    },idx*70);})(i);}
  }
  function spawnConfetti(count){
    for(var i=0;i<count;i++){(function(idx){setTimeout(function(){
      var el=document.createElement('div');el.className='confetti';
      el.style.left=(Math.random()*100)+'%';el.style.top=(-5-Math.random()*10)+'%';
      el.style.background=confettiColors[idx%confettiColors.length];
      el.style.width=(5+Math.random()*5)+'px';el.style.height=(7+Math.random()*7)+'px';
      el.style.animationDuration=(1.4+Math.random())+'s';el.style.borderRadius=Math.random()>0.5?'50%':'2px';
      particlesEl.appendChild(el);setTimeout(function(){el.remove();},2800);
    },idx*35);})(i);}
  }
  function spawnFinalCelebration(){
    var em=['✨','⭐','❤️','🎉','🎊','🌟','🌻','🦋','🌈'];
    for(var i=0;i<25;i++){(function(idx){setTimeout(function(){
      var el=document.createElement('span');el.className='burst';el.textContent=em[idx%em.length];
      el.style.left='50%';el.style.top='50%';
      var angle=(idx/25)*Math.PI*2,dist=70+Math.random()*100;
      var dx=Math.cos(angle)*dist,dy=Math.sin(angle)*dist;
      el.style.setProperty('--dx',dx+'px');el.style.setProperty('--dy',dy+'px');
      el.style.setProperty('--dx2',(dx*1.4)+'px');el.style.setProperty('--dy2',(dy*1.4)+'px');
      particlesEl.appendChild(el);setTimeout(function(){el.remove();},2800);
    },idx*50);})(i);}
    spawnConfetti(30);
  }

  // Break
  function showBreak(){
    questionArea.classList.add('hidden');document.getElementById('rs-scene').classList.add('hidden');
    breakImage.src=breakImages[breakImageIndex%breakImages.length];breakImageIndex++;
    breakScreen.classList.remove('hidden');
    var timeLeft=20;breakTimer.textContent=timeLeft;breakTimerFill.style.width='100%';
    breakTimerInterval=setInterval(function(){timeLeft--;breakTimer.textContent=timeLeft;breakTimerFill.style.width=((timeLeft/20)*100)+'%';if(timeLeft<=0)endBreak();},1000);
  }
  function endBreak(){if(breakTimerInterval){clearInterval(breakTimerInterval);breakTimerInterval=null;}breakScreen.classList.add('hidden');questionArea.classList.remove('hidden');document.getElementById('rs-scene').classList.remove('hidden');loadQuestion();}
  function skipBreak(){endBreak();}

  // Game logic
  function loadQuestion(){
    if(queue.length===0){showEnd();return;}
    if(answeredSinceBreak>=BREAK_EVERY&&queue.length>0){answeredSinceBreak=0;showBreak();return;}
    questionNumber++;
    var t=tasks[queue[0]],w=t.word;
    var correctOnLeft=Math.random()<0.5;
    if(correctOnLeft){btnA.textContent=w.correct.toUpperCase();btnB.textContent=w.wrong.toUpperCase();currentCorrectSide='a';}
    else{btnA.textContent=w.wrong.toUpperCase();btnB.textContent=w.correct.toUpperCase();currentCorrectSide='b';}
    btnA.className='word-btn';btnB.className='word-btn';
    feedback.className='hidden';feedback.textContent='';
    ruleBox.className='hidden';ruleBox.innerHTML='';
    locked=false;
    promptText.textContent='Wort '+questionNumber+' — noch '+queue.length+' offen';
  }

  function chooseWord(side){
    if(locked)return;locked=true;
    var taskIdx=queue[0],t=tasks[taskIdx],w=t.word;
    var isCorrect=(side===currentCorrectSide);
    queue.shift();answeredSinceBreak++;
    recordCatAttempt(t.cat,isCorrect);
    var correctBtn=(currentCorrectSide==='a')?btnA:btnB;
    var wrongBtn=(currentCorrectSide==='a')?btnB:btnA;

    if(isCorrect){
      correctCount++;
      correctBtn.classList.add('correct-highlight');wrongBtn.classList.add('disabled');
      feedback.textContent='Richtig!';feedback.className='correct-fb';
      updateScore();setMouseImage(mouseCorrect,true);
      APP.addPoint();
      var p=correctCount/TOTAL;
      if(p<0.3)spawnParticles(3);else if(p<0.6)spawnParticles(5);
      else if(p<0.9){spawnParticles(7);if(correctCount%10===0)spawnConfetti(15);}
      else{spawnParticles(10);spawnConfetti(20);}
      if(correctCount===TOTAL)setTimeout(function(){spawnFinalCelebration();},300);
      setTimeout(function(){loadQuestion();},1400);
    } else {
      wrongCount++;recordError(w.correct);
      correctBtn.classList.add('correct-highlight');wrongBtn.classList.add('wrong-highlight');
      btnA.classList.add('disabled');btnB.classList.add('disabled');
      feedback.textContent=w.correct.toUpperCase()+' ist richtig.';feedback.className='wrong-fb';
      ruleBox.className='';ruleBox.id='rs-rule-box';
      ruleBox.innerHTML='<div class="rule-title">'+w.rule+'</div><div class="rule-text">'+RULE_SUMMARIES[w.type]+'</div>';
      queue.push(taskIdx);
      setMouseImage(mouseSad,true);setTimeout(function(){setMouseImage(mouseCorrect,true);},1400);
      setTimeout(function(){loadQuestion();},3500);
    }
  }

  // End screen
  function showEnd(){
    questionArea.classList.add('hidden');
    var dur=(Date.now()-gameStartTime)/1000,avgTime=TOTAL>0?dur/TOTAL:0;
    saveGameErrors();
    var errorWords=Object.keys(gameErrors);
    var firstTryCorrect=TOTAL-errorWords.length;
    var firstTryPct=Math.round((firstTryCorrect/TOTAL)*100);

    var now=new Date();
    var ds=now.getDate().toString().padStart(2,'0')+'.'+(now.getMonth()+1).toString().padStart(2,'0')+'.'+now.getFullYear()+', '+now.getHours().toString().padStart(2,'0')+':'+now.getMinutes().toString().padStart(2,'0');
    saveGameHistory({date:ds,totalWords:TOTAL,correctPct:firstTryPct,durationSec:Math.round(dur),avgTimeSec:Math.round(avgTime*10)/10,categories:selectedCategories.slice(),catStats:JSON.parse(JSON.stringify(catStats)),wrongWords:errorWords.slice()});

    if(firstTryPct===100){mouseImg.src='images/mouse_perfect.png';}else{mouseImg.src=mouseCorrect;}mouseImg.style.opacity='1';

    if(firstTryPct===100){endTitle.textContent='Perfekt!';endMessage.textContent='Kein einziger Fehler — du bist ein Rechtschreib-Profi!';}
    else if(firstTryPct>=90){endTitle.textContent='Super gemacht!';endMessage.textContent='Fast alles beim ersten Mal richtig!';}
    else if(firstTryPct>=70){endTitle.textContent='Gut!';endMessage.textContent='Das klappt schon richtig gut!';}
    else if(firstTryPct>=50){endTitle.textContent='Weiter so!';endMessage.textContent='Mit etwas Übung wird es noch besser.';}
    else{endTitle.textContent='Gut versucht!';endMessage.textContent='Übe weiter — du schaffst das!';}

    endStats.innerHTML='<strong>'+firstTryCorrect+'</strong> von <strong>'+TOTAL+'</strong> Wörtern beim ersten Versuch richtig<br><strong>'+wrongCount+'</strong> Fehler gemacht<br>Trefferquote: <strong>'+firstTryPct+'%</strong><br>Zeit: <strong>'+formatTime(Math.round(dur))+'</strong> (&#8709; '+avgTime.toFixed(1)+'s pro Wort)';

    var catEl=document.getElementById('rs-end-cats');
    if(catEl){
      catEl.innerHTML='';
      var cats=['tz_z','ck_k'];
      for(var c=0;c<cats.length;c++){
        var cat=cats[c];if(!catStats[cat])continue;
        var cs=catStats[cat],pct=cs.total>0?Math.round(((cs.total-cs.wrong)/cs.total)*100):0;
        var color=pct>=95?'#4CAF50':pct>=85?'#7CB342':pct>=75?'#C0CA33':pct>=60?'#FDD835':pct>=45?'#FFB300':pct>=30?'#FB8C00':'#E53935';
        var label=cat==='tz_z'?'tz / z':'ck / k';
        var box=document.createElement('div');box.className='cat-eval-box';box.style.background=color;
        box.innerHTML='<span class="cat-eval-label">'+label+'</span><span class="cat-eval-pct">'+pct+'%</span>';
        catEl.appendChild(box);
      }
    }
    endScreen.classList.remove('hidden');
    if(firstTryPct>=90)setTimeout(function(){spawnFinalCelebration();},500);
  }

  function toggleHistory(){
    var list=document.getElementById('rs-history-list'),btn=document.getElementById('rs-history-toggle');
    if(list.classList.contains('hidden')){list.classList.remove('hidden');btn.textContent='Historie ausblenden';}
    else{list.classList.add('hidden');btn.textContent='Historie anzeigen';}
  }

  function initStart(){updateStartCount();updateFastGeschafft();renderHistory();APP.updatePointsDisplays();}

  return {
    toggleCat:toggleCat,selectCount:selectCount,selectFastGeschafft:selectFastGeschafft,
    startGame:startGame,chooseWord:chooseWord,skipBreak:skipBreak,
    backToStart:backToStart,toggleHistory:toggleHistory,initStart:initStart
  };
})();
