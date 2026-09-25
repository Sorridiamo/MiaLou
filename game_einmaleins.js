/* game_einmaleins.js — Namespaced as EM for Spielkiste */

var EM = (function() {
  'use strict';

  var STORAGE_ERRORS = 'einmaleins_errors';
  var STORAGE_HISTORY = 'einmaleins_history';
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
  var emojiMap = { sparkles:'✨', star:'⭐', heart:'❤️', party:'🎉', tada:'🎊' };

  // Game state
  var tasks = [], TOTAL = 0, queue = [];
  var correctCount = 0, wrongCount = 0, questionNumber = 0, answeredSinceBreak = 0;
  var currentInput = '', locked = false, gameStartTime = 0;
  var gameErrors = {}, rowStats = {};
  var breakTimerInterval = null, wakeLock = null;

  // Selected rows
  var selectedRows = [], allSelected = true, fastGeschafftMode = false;

  // DOM refs
  var factorA, factorB, answerDisplay, feedback, promptText;
  var scoreText, progressFill, questionArea, mouseImg, particlesEl;
  var endScreen, endTitle, endMessage, endStats;
  var breakScreen, breakImage, breakTimer, breakTimerFill;

  // === Storage ===
  function loadS(key, fb) { return APP.gameLoad(key, fb); }
  function saveS(key, d) { APP.gameSave(key, d); }

  function shuffleArray(a) { for (var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=a[i];a[i]=a[j];a[j]=t; } return a; }
  function formatTime(s) { var m=Math.floor(s/60),r=Math.round(s%60); return m===0?r+'s':m+'min '+r+'s'; }

  // === Error tracking ===
  function recordError(a,b) { var k=a+'_'+b; gameErrors[k]=(gameErrors[k]||0)+1; }
  function recordRowAttempt(row,ok) { if(!rowStats[row])rowStats[row]={wrong:0,total:0}; rowStats[row].total++; if(!ok)rowStats[row].wrong++; }

  function saveGameErrors() {
    var list=[];
    for(var k in gameErrors) if(gameErrors[k]>0){ var p=k.split('_'); list.push({a:parseInt(p[0],10),b:parseInt(p[1],10),count:gameErrors[k]}); }
    var all=loadS(STORAGE_ERRORS,[]);
    all.push(list);
    if(all.length>MAX_ERROR_GAMES) all=all.slice(all.length-MAX_ERROR_GAMES);
    saveS(STORAGE_ERRORS,all);
  }

  function getWeightedErrors() {
    var all=loadS(STORAGE_ERRORS,[]), w={}, n=all.length;
    for(var i=0;i<n;i++){ var wt=i+1,g=all[i]; for(var j=0;j<g.length;j++){ var e=g[j],k=e.a+'_'+e.b; w[k]=(w[k]||0)+e.count*wt; } }
    var sorted=[];
    for(var k2 in w){ var p=k2.split('_'),a=parseInt(p[0],10),b=parseInt(p[1],10); sorted.push({a:a,b:b,result:a*b,score:w[k2]}); }
    sorted.sort(function(x,y){return y.score-x.score;});
    return sorted.slice(0,20);
  }

  // === History ===
  function saveGameHistory(rec) {
    var h=loadS(STORAGE_HISTORY,[]);
    h.push(rec);
    if(h.length>50) h=h.slice(h.length-50);
    saveS(STORAGE_HISTORY,h);
  }

  function renderHistory() {
    var wrap=document.getElementById('em-history-list'); if(!wrap) return;
    var history=loadS(STORAGE_HISTORY,[]);
    if(history.length===0){ wrap.innerHTML='<p class="history-empty">Noch keine Spiele gespielt.</p>'; return; }
    var html='';
    for(var i=history.length-1;i>=0;i--){
      var g=history[i];
      html+='<div class="history-entry"><div class="history-header"><span class="history-date">'+g.date+'</span><span class="history-pct">'+g.correctPct+'% richtig</span></div>';
      html+='<div class="history-details"><span>'+g.totalTasks+' Aufgaben</span><span>'+formatTime(g.durationSec)+'</span><span>&#8709; '+g.avgTimeSec.toFixed(1)+'s</span></div>';
      html+='<div class="history-boxes" id="em-hb-'+i+'"></div>';
      if(g.wrongTasks&&g.wrongTasks.length>0){
        html+='<div class="history-wrong-tasks"><span class="history-wrong-label">Falsch: </span><span class="history-wrong-list">'+g.wrongTasks.join(', ')+'</span></div>';
      }
      html+='</div>';
    }
    wrap.innerHTML=html;
    for(var j=history.length-1;j>=0;j--){
      var el=document.getElementById('em-hb-'+j);
      if(el&&history[j].rowStats) renderRowBoxes(el,history[j].rowStats);
    }
  }

  // === Row eval ===
  function getRowColor(rate) {
    if(rate<0)return'#e0ddd6';if(rate===0)return'#4CAF50';if(rate<=0.1)return'#7CB342';
    if(rate<=0.2)return'#C0CA33';if(rate<=0.3)return'#FDD835';if(rate<=0.45)return'#FFB300';
    if(rate<=0.6)return'#FB8C00';return'#E53935';
  }
  function renderRowBoxes(container,rs) {
    container.innerHTML='';
    for(var r=1;r<=10;r++){
      var rate=(rs[r]&&rs[r].total>0)?(rs[r].wrong/rs[r].total):-1;
      var box=document.createElement('div');
      box.className='row-eval-box'; box.style.background=getRowColor(rate);
      box.textContent=r; box.style.color=rate<0?'#bbb':'#fff';
      container.appendChild(box);
    }
  }

  // === Row selection ===
  function toggleRow(btn) {
    var row=btn.getAttribute('data-row');
    fastGeschafftMode=false;
    var fgBtn=document.getElementById('em-fg-btn');
    if(fgBtn) fgBtn.classList.remove('selected');

    if(row==='all'){
      allSelected=true; selectedRows=[];
      var btns=document.querySelectorAll('#em-row-selector .row-btn');
      for(var i=0;i<btns.length;i++) btns[i].classList.remove('selected');
      btn.classList.add('selected');
    } else {
      allSelected=false;
      document.querySelector('#em-row-selector .row-all').classList.remove('selected');
      var num=parseInt(row,10), idx=selectedRows.indexOf(num);
      if(idx>=0){ selectedRows.splice(idx,1); btn.classList.remove('selected'); }
      else { selectedRows.push(num); btn.classList.add('selected'); }
      if(selectedRows.length===0||selectedRows.length===10){
        allSelected=true; selectedRows=[];
        var btns2=document.querySelectorAll('#em-row-selector .row-btn');
        for(var j=0;j<btns2.length;j++) btns2[j].classList.remove('selected');
        document.querySelector('#em-row-selector .row-all').classList.add('selected');
      }
    }
    updateStartCount();
  }

  function selectFastGeschafft() {
    var errors=getWeightedErrors(); if(errors.length===0)return;
    fastGeschafftMode=true; allSelected=false; selectedRows=[];
    var btns=document.querySelectorAll('#em-row-selector .row-btn');
    for(var i=0;i<btns.length;i++) btns[i].classList.remove('selected');
    var fgBtn=document.getElementById('em-fg-btn');
    if(fgBtn) fgBtn.classList.add('selected');
    document.getElementById('em-start-count').textContent=errors.length+' Aufgaben';
  }

  function updateStartCount() {
    if(fastGeschafftMode) return;
    var count=allSelected?100:selectedRows.length*10;
    document.getElementById('em-start-count').textContent=count+' Aufgaben';
  }

  function updateFastGeschafft() {
    var errors=getWeightedErrors();
    var btn=document.getElementById('em-fg-btn'), info=document.getElementById('em-fg-info');
    if(!btn) return;
    if(errors.length===0){ btn.classList.add('disabled'); if(info) info.textContent='Noch keine Fehler gespeichert'; }
    else { btn.classList.remove('disabled'); if(info) info.textContent=errors.length+' Aufgaben zum Wiederholen'; }
  }

  // === Build tasks ===
  function buildTasks() {
    if(fastGeschafftMode) return getWeightedErrors();
    var t=[], rows=allSelected?[1,2,3,4,5,6,7,8,9,10]:selectedRows.slice().sort(function(a,b){return a-b;});
    for(var r=0;r<rows.length;r++) for(var b=1;b<=10;b++) t.push({a:rows[r],b:b,result:rows[r]*b});
    return t;
  }

  // === Wake Lock ===
  async function requestWakeLock() { try { if('wakeLock' in navigator){ wakeLock=await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release',function(){wakeLock=null;}); } }catch(e){} }
  function releaseWakeLock() { if(wakeLock){wakeLock.release();wakeLock=null;} }

  // === Start Game ===
  function startGame() {
    tasks=buildTasks(); if(tasks.length===0) return;
    TOTAL=tasks.length; correctCount=0; wrongCount=0; questionNumber=0; answeredSinceBreak=0;
    currentInput=''; locked=false; gameErrors={}; rowStats={}; gameStartTime=Date.now();

    document.getElementById('em-start-screen').classList.add('hidden');
    document.getElementById('em-game-screen').classList.remove('hidden');

    factorA=document.getElementById('em-factor-a');
    factorB=document.getElementById('em-factor-b');
    answerDisplay=document.getElementById('em-answer');
    feedback=document.getElementById('em-feedback');
    promptText=document.getElementById('em-prompt');
    scoreText=document.getElementById('em-score-text');
    progressFill=document.getElementById('em-progress-fill');
    questionArea=document.getElementById('em-question-area');
    endScreen=document.getElementById('em-end');
    endTitle=document.getElementById('em-end-title');
    endMessage=document.getElementById('em-end-msg');
    endStats=document.getElementById('em-end-stats');
    mouseImg=document.getElementById('em-mouse-img');
    particlesEl=document.getElementById('em-particles');
    breakScreen=document.getElementById('em-break');
    breakImage=document.getElementById('em-break-img');
    breakTimer=document.getElementById('em-break-timer');
    breakTimerFill=document.getElementById('em-break-fill');

    mouseImg.src=mouseCorrect; mouseImg.style.opacity='1';
    requestWakeLock();
    queue=[]; for(var i=0;i<tasks.length;i++) queue.push(i);
    shuffleArray(queue); shuffleArray(breakImages); breakImageIndex=0;
    updateScore(); loadQuestion();
  }

  function backToStart() {
    releaseWakeLock();
    endScreen.classList.add('hidden');
    questionArea.classList.remove('hidden');
    document.getElementById('em-scene').classList.remove('hidden');
    if(breakScreen) breakScreen.classList.add('hidden');
    if(breakTimerInterval){clearInterval(breakTimerInterval);breakTimerInterval=null;}
    document.getElementById('em-game-screen').classList.add('hidden');
    document.getElementById('em-start-screen').classList.remove('hidden');
    initStart();
    APP.updatePointsDisplays();
  }

  // === Score ===
  function updateScore() {
    scoreText.textContent=correctCount+' / '+TOTAL;
    progressFill.style.width=((correctCount/TOTAL)*100)+'%';
  }

  // === Mouse ===
  function setMouseImage(src,anim) {
    if(mouseImg.src.indexOf(src)!==-1)return;
    if(anim){mouseImg.style.opacity='0';setTimeout(function(){mouseImg.src=src;mouseImg.style.opacity='1';},200);}
    else{mouseImg.src=src;mouseImg.style.opacity='1';}
  }

  // === Particles ===
  function spawnParticles(count) {
    var em=['sparkles','star','heart','party'];
    for(var i=0;i<count;i++){(function(idx){setTimeout(function(){
      var el=document.createElement('span');el.className='particle';el.textContent=emojiMap[em[idx%em.length]];
      el.style.left=(10+Math.random()*80)+'%';el.style.top=(30+Math.random()*50)+'%';
      el.style.fontSize=(16+Math.random()*14)+'px';el.style.animationDuration=(1.2+Math.random()*0.8)+'s';
      particlesEl.appendChild(el);setTimeout(function(){el.remove();},2200);
    },idx*70);})(i);}
  }
  function spawnConfetti(count) {
    for(var i=0;i<count;i++){(function(idx){setTimeout(function(){
      var el=document.createElement('div');el.className='confetti';
      el.style.left=(Math.random()*100)+'%';el.style.top=(-5-Math.random()*10)+'%';
      el.style.background=confettiColors[idx%confettiColors.length];
      el.style.width=(5+Math.random()*5)+'px';el.style.height=(7+Math.random()*7)+'px';
      el.style.animationDuration=(1.4+Math.random())+'s';el.style.borderRadius=Math.random()>0.5?'50%':'2px';
      particlesEl.appendChild(el);setTimeout(function(){el.remove();},2800);
    },idx*35);})(i);}
  }
  function spawnFinalCelebration() {
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

  // === Break ===
  function showBreak() {
    questionArea.classList.add('hidden');
    document.getElementById('em-scene').classList.add('hidden');
    breakImage.src=breakImages[breakImageIndex%breakImages.length]; breakImageIndex++;
    breakScreen.classList.remove('hidden');
    var timeLeft=20; breakTimer.textContent=timeLeft; breakTimerFill.style.width='100%';
    breakTimerInterval=setInterval(function(){
      timeLeft--; breakTimer.textContent=timeLeft; breakTimerFill.style.width=((timeLeft/20)*100)+'%';
      if(timeLeft<=0) endBreak();
    },1000);
  }
  function endBreak() {
    if(breakTimerInterval){clearInterval(breakTimerInterval);breakTimerInterval=null;}
    breakScreen.classList.add('hidden'); questionArea.classList.remove('hidden');
    document.getElementById('em-scene').classList.remove('hidden'); loadQuestion();
  }
  function skipBreak() { endBreak(); }

  // === Game Logic ===
  function loadQuestion() {
    if(queue.length===0){showEnd();return;}
    if(answeredSinceBreak>=BREAK_EVERY&&queue.length>0){answeredSinceBreak=0;showBreak();return;}
    questionNumber++;
    var t=tasks[queue[0]];
    factorA.textContent=t.a; factorB.textContent=t.b;
    currentInput=''; answerDisplay.textContent='?';
    feedback.className='hidden'; feedback.textContent=''; locked=false;
    promptText.textContent='Aufgabe '+questionNumber+' — noch '+queue.length+' offen';
  }

  function numpad(val) {
    if(locked) return;
    if(val==='del'){currentInput=currentInput.slice(0,-1);answerDisplay.textContent=currentInput||'?';return;}
    if(val==='ok'){if(currentInput==='')return;checkAnswer();return;}
    if(currentInput.length>=3)return;
    currentInput+=val; answerDisplay.textContent=currentInput;
  }

  function checkAnswer() {
    locked=true;
    var taskIdx=queue[0];
    var t=tasks[taskIdx], ans=parseInt(currentInput,10), ok=(ans===t.result);
    queue.shift(); answeredSinceBreak++;
    recordRowAttempt(t.a,ok);

    if(ok){
      correctCount++;
      feedback.textContent='Richtig!'; feedback.className='correct-fb';
      updateScore(); setMouseImage(mouseCorrect,true);
      APP.addPoint();
      var p=correctCount/TOTAL;
      if(p<0.3)spawnParticles(3);else if(p<0.6)spawnParticles(5);
      else if(p<0.9){spawnParticles(7);if(correctCount%10===0)spawnConfetti(15);}
      else{spawnParticles(10);spawnConfetti(20);}
      if(correctCount===TOTAL) setTimeout(function(){spawnFinalCelebration();},300);
    } else {
      wrongCount++; recordError(t.a,t.b);
      feedback.textContent='Nicht ganz. '+t.a+' x '+t.b+' = '+t.result;
      feedback.className='wrong-fb';
      queue.push(taskIdx);
      setMouseImage(mouseSad,true);
      setTimeout(function(){setMouseImage(mouseCorrect,true);},1400);
    }
    setTimeout(function(){loadQuestion();},1800);
  }

  // === Show End ===
  function showEnd() {
    questionArea.classList.add('hidden');
    var dur=(Date.now()-gameStartTime)/1000, totalAns=correctCount+wrongCount;
    var avgTime=TOTAL>0?dur/TOTAL:0;
    saveGameErrors();
    var firstTryCorrect=TOTAL-Object.keys(gameErrors).length;
    var firstTryPct=Math.round((firstTryCorrect/TOTAL)*100);

    var now=new Date();
    var ds=now.getDate().toString().padStart(2,'0')+'.'+(now.getMonth()+1).toString().padStart(2,'0')+'.'+now.getFullYear()+', '+now.getHours().toString().padStart(2,'0')+':'+now.getMinutes().toString().padStart(2,'0');
    var errorKeys=Object.keys(gameErrors), wrongTasks=[];
    for(var i=0;i<errorKeys.length;i++){ var p=errorKeys[i].split('_'); wrongTasks.push(p[0]+'×'+p[1]); }

    saveGameHistory({date:ds,totalTasks:TOTAL,correctPct:firstTryPct,durationSec:Math.round(dur),avgTimeSec:Math.round(avgTime*10)/10,rowStats:JSON.parse(JSON.stringify(rowStats)),wrongTasks:wrongTasks});

    if(firstTryPct===100){mouseImg.src='images/mouse_perfect.png';}else{mouseImg.src=mouseCorrect;} mouseImg.style.opacity='1';

    if(firstTryPct===100){endTitle.textContent='Perfekt!';endMessage.textContent='Kein einziger Fehler — du bist ein Einmaleins-Profi!';}
    else if(firstTryPct>=90){endTitle.textContent='Super gemacht!';endMessage.textContent='Fast alles beim ersten Mal richtig!';}
    else if(firstTryPct>=70){endTitle.textContent='Gut!';endMessage.textContent='Das klappt schon richtig gut!';}
    else if(firstTryPct>=50){endTitle.textContent='Weiter so!';endMessage.textContent='Mit etwas Übung wird es noch besser.';}
    else{endTitle.textContent='Gut versucht!';endMessage.textContent='Übe weiter — du schaffst das!';}

    endStats.innerHTML='<strong>'+firstTryCorrect+'</strong> von <strong>'+TOTAL+'</strong> Aufgaben beim ersten Versuch richtig<br><strong>'+wrongCount+'</strong> Fehler gemacht<br>Trefferquote: <strong>'+firstTryPct+'%</strong><br>Zeit: <strong>'+formatTime(Math.round(dur))+'</strong> (∅ '+avgTime.toFixed(1)+'s pro Aufgabe)';

    var rowEl=document.getElementById('em-end-rows');
    if(rowEl) renderRowBoxes(rowEl,rowStats);
    endScreen.classList.remove('hidden');
    if(firstTryPct>=90) setTimeout(function(){spawnFinalCelebration();},500);
  }

  // === History toggle ===
  function toggleHistory() {
    var list=document.getElementById('em-history-list'), btn=document.getElementById('em-history-toggle');
    if(list.classList.contains('hidden')){list.classList.remove('hidden');btn.textContent='Historie ausblenden';}
    else{list.classList.add('hidden');btn.textContent='Historie anzeigen';}
  }

  // === Init start screen ===
  function initStart() {
    updateStartCount(); updateFastGeschafft(); renderHistory();
    APP.updatePointsDisplays();
  }

  return {
    toggleRow: toggleRow,
    selectFastGeschafft: selectFastGeschafft,
    startGame: startGame,
    numpad: numpad,
    skipBreak: skipBreak,
    backToStart: backToStart,
    toggleHistory: toggleHistory,
    initStart: initStart
  };
})();
