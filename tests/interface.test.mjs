import {Window} from 'happy-dom';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=new URL('../dist/',import.meta.url);
const html=readFileSync(new URL('index.html',root),'utf8');
const scripts=[...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]);
function harness(saved=null){
  const window=new Window({url:'http://127.0.0.1:4173',width:390,height:844});
  let hidden=false,notes=0;
  Object.defineProperty(window.document,'hidden',{get:()=>hidden});
  const errors=[];window.addEventListener('error',e=>errors.push(e.message));
  window.requestAnimationFrame=()=>1;
  window.WebSocket=class {static OPEN=1};
  window.Element.prototype.animate=function(){return {cancel(){}}};
  window.Element.prototype.setPointerCapture=function(){};
  window.Element.prototype.releasePointerCapture=function(){};
  window.HTMLDialogElement.prototype.showModal=function(){this.open=true};
  window.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new window.Event('close'))};
  window.AudioContext=class {state='running';currentTime=0;destination={};resume(){return Promise.resolve()}createOscillator(){return {frequency:{setValueAtTime(){}},connect(target){return target},start(){notes++},stop(){}}}createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){return {}}}}};
  window.localStorage.setItem('crownfall-lang','en');
  if(saved)window.localStorage.setItem('crownfall-match-v4',saved);
  window.document.write(html.replace(/<script[^>]*>[\s\S]*?<\/script>/g,''));
  for(const file of scripts)window.eval(readFileSync(new URL(file,root),'utf8')+(file.startsWith('app.js')?'\nwindow.__qa=code=>eval(code);':''));
  const run=code=>window.__qa(code),$=id=>window.document.getElementById(id);
  run("CrownI18n.setLanguage('en')");
  return {window,run,$,errors,notes:()=>notes,hide:()=>{hidden=true;window.document.dispatchEvent(new window.Event('visibilitychange'))}};
}
const h=harness(),{window,run,$}=h;
const click=id=>$(id).dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
const change=(id,value)=>{$(id).value=value;$(id).dispatchEvent(new window.Event('change',{bubbles:true}));};
let count=0;const test=(name,f)=>{f();assert.deepEqual(h.errors,[]);console.log('PASS '+name);count++};
const fresh=()=>run("document.querySelectorAll('dialog[open]').forEach(d=>d.close());multiplayerMode=false;myRole='blue';matchActive=true;state=E.create(42);state.aiDisabled=true;sourceId=0;targetId=null;nextSpecialty=null;allCastles=false;dispatchPercent=50;marchRoute='fast';V.init(state);enterGameMode();updateUI()");

test('shipped script order boots into the main menu without errors',()=>{assert.equal(window.document.querySelectorAll('.castle').length,21);assert.ok(window.document.body.classList.contains('in-menu'));assert.equal($('troops').textContent,'420')});
test('new players explicitly select a hero before starting',()=>{click('menuSinglePlayBtn');assert.equal($('startGameBtn').disabled,true);assert.match($('spHeroSelectedStatus').textContent,/No commander/);assert.equal(window.document.querySelector('#spHeroPickGrid .hero-card').tagName,'BUTTON')});
test('new match starts on a layout compatible with faction count',()=>{click('menuSinglePlayBtn');run("selectHero('vanguard')");run('selectedPlayerCount=4');change('startMapSelect','0');click('startGameBtn');assert.equal(run('state.playerCount'),4);assert.equal(run('state.mapIndex'),7);assert.equal(run('state.paused'),false)});
test('repeated target selection never spends troops',()=>{fresh();for(let i=0;i<5;i++)click('castle15');assert.equal(run('targetId'),15);assert.equal(run('state.castles[0].troops'),420);assert.equal(run('state.armies.length'),0);assert.match($('battleForecast').textContent,/451/);assert.match($('battleForecast').textContent,/High risk/);assert.equal($('dispatchActionBtn').disabled,false)});
test('explicit dispatch spends only the selected local amount',()=>{click('dispatchActionBtn');assert.equal(run('state.castles[0].troops'),210);assert.equal(run('state.armies[0].count'),210);assert.equal(run('state.armies[0].target'),15)});
test('zero available troops disables dispatch with an explanation',()=>{run('state.castles[0].reserve=999;updateUI()');assert.equal($('dispatchActionBtn').disabled,true);assert.match($('dispatchReason').textContent,/No troops/)});
test('upgrade previews and selected specialization match the purchase',()=>{fresh();click('tacticsBtn');change('tacticsSpecialty','economy');assert.match($('upgradePreview').textContent,/3 → 2.5/);click('closeTactics');click('upgradeBtn');assert.equal(run('state.castles[0].level'),2);assert.equal(run('state.castles[0].specialty'),'economy');assert.equal(run('state.players.blue.gold'),100);click('upgradeBtn');assert.equal(run('state.castles[0].level'),2)});
test('friendly selection and Shift-click reinforcement are distinct',()=>{fresh();run("state.castles[2].owner='blue';updateUI();V.render(state,null,0)");$('castle2').dispatchEvent(new window.MouseEvent('click',{bubbles:true,shiftKey:true}));assert.equal(run('sourceId'),0);assert.equal(run('targetId'),2);assert.equal(run('state.armies.length'),0);click('dispatchActionBtn');assert.equal(run('state.armies[0].target'),2)});
test('Tab toggles management; Shift+Tab and dialog Tab keep navigation; C cycles castles',()=>{
  fresh();run("state.castles[2].owner='blue';document.activeElement?.blur()");
  const key=(options)=>{const e=new window.KeyboardEvent('keydown',{key:'Tab',code:'Tab',bubbles:true,cancelable:true,...options});window.dispatchEvent(e);return e};
  assert.equal(key().defaultPrevented,true);assert.equal(run('castleMgmtOpen'),true);
  assert.equal(key().defaultPrevented,true);assert.equal(run('castleMgmtOpen'),false);
  assert.equal(key({shiftKey:true}).defaultPrevented,false);
  click('menuBtn');assert.equal(key().defaultPrevented,false);click('closeMenu');
  window.dispatchEvent(new window.KeyboardEvent('keydown',{key:'c',code:'KeyC'}));assert.equal(run('sourceId'),2);
});
test('keyboard activation selects a castle before dispatch',()=>{fresh();$('castle15').dispatchEvent(new window.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));assert.equal(run('targetId'),15);assert.equal(run('state.armies.length'),0)});
test('cancelled drags cannot send an army',()=>{fresh();run('dragFrom=0;isDragging=true');$('map').dispatchEvent(new window.PointerEvent('pointercancel',{pointerId:1}));assert.equal(run('state.armies.length'),0);assert.equal(run('dragFrom'),null);run('dragJustEnded=false')});
test('changing difficulty preserves the match and Gold',()=>{fresh();run('state.time=20;state.players.blue.gold=77');click('diffBadgeBtn');run("syncDiffModal('hard')");click('startGameBtn');assert.equal(run('state.time'),20);assert.equal(run('state.players.blue.gold'),77);assert.equal(run('state.aiDifficulty'),'hard');assert.equal(run('state.paused'),true)});
test('hidden local games pause and persist',()=>{fresh();h.hide();assert.equal(run('state.paused'),true);assert.ok(window.localStorage.getItem('crownfall-match-v4'))});
test('restored matches initialize paused in game mode',()=>{const restored=harness(run('E.serialize({...state,time:10})'));assert.ok(restored.window.document.body.classList.contains('in-game'));assert.equal(restored.run('state.paused'),true);assert.deepEqual(restored.errors,[]);restored.window.happyDOM.abort()});
test('sound settings control the actual playback engine',()=>{click('settingsSoundOnBtn');assert.equal(run('CrownSound.isEnabled()'),true);assert.equal(run('MobileGame.isSoundOn()'),true);click('settingsSoundOffBtn');assert.equal(run('CrownSound.isEnabled()'),false);assert.equal(run('MobileGame.isSoundOn()'),false)});
test('zoom and graphics controls still work',()=>{for(let i=0;i<12;i++)click('zoomIn');assert.equal($('zoomReadout').textContent,'5.0×');assert.equal($('zoomIn').disabled,true);click('zoomReset');assert.equal($('zoomReadout').textContent,'1.0×');const [x,y,w,h]=$('map').getAttribute('viewBox').split(' ').map(Number);assert.ok(x<=0&&y<=0&&x+w>=2200&&y+h>=1500,'reset contains the entire realm');change('qualitySelect','low');assert.equal(window.document.body.dataset.quality,'low')});
test('elimination victory reports the correct reason',()=>{fresh();run("state.time=10;state.castles[1].owner='blue';E.checkVictory(state);updateUI()");assert.equal($('resultDialog').open,true);assert.match($('resultText').textContent,/All opponents eliminated/)});
test('returning to menu deletes the match without autosave resurrection',()=>{click('resultHomeBtn');run('saveMatch()');assert.equal(window.localStorage.getItem('crownfall-match-v4'),null);assert.equal(run('matchActive'),false);assert.equal(run('myRole'),'blue')});
test('online commands wait for the server and do not mutate local state',()=>{fresh();run("multiplayerMode=true;currentRoomCode='TEST';wsClient={readyState:1,send:text=>window.sent=JSON.parse(text)};targetId=2;updateUI()");click('dispatchActionBtn');assert.equal(run('state.armies.length'),0);assert.equal(run('state.castles[0].troops'),420);assert.equal(window.sent.type,'dispatch');click('upgradeBtn');assert.equal(run('state.players.blue.gold'),200);assert.equal(window.sent.type,'upgrade');run('const before=state.time;frame(performance.now()+100);window.unchanged=state.time===before');assert.equal(window.unchanged,true)});
test('full snapshots restore Gold, marches, tactics, orders and outcomes',()=>{run("lastNetworkRevision=-1;const server=E.create(42);server.aiDisabled=true;E.dispatch(server,'blue',0,2,100);E.setReserve(server,'blue',0,25);E.upgrade(server,'blue',0,'military');E.coordinate(server,'blue',15,[{source:0,count:30}]);handleWsMessage({type:'state_snapshot',roomCode:'TEST',revision:1,state:server})");assert.equal(run('state.armies.length'),1);assert.equal(run('state.orders.length'),1);assert.equal(run('state.players.blue.gold'),100);assert.equal(run('state.castles[0].reserve'),25);assert.equal(run('state.paused'),false)});
test('stale or unrelated room snapshots are ignored',()=>{run("handleWsMessage({type:'state_snapshot',roomCode:'OTHER',revision:2,state:E.create()});handleWsMessage({type:'state_snapshot',roomCode:'TEST',revision:0,state:E.create()})");assert.equal(run('state.players.blue.gold'),100)});
test('weather hud and visual layer sync across graphics quality settings',()=>{fresh();change('qualitySelect','low');assert.equal(window.document.body.dataset.quality,'low');assert.ok($('weatherHudBadge'));assert.equal($('weatherIcon').textContent,'☀️');assert.ok($('weatherAtmosphere').classList.contains('weather-clear'));run("state.weather={type:'snow',timer:30,duration:45,index:3};updateUI()");assert.equal($('weatherIcon').textContent,'❄️');assert.equal($('weatherTimer').textContent,'30s');assert.ok($('weatherAtmosphere').classList.contains('weather-snow'))});
test('hero pick selects commander and applies passives to the match',()=>{fresh();click('menuSinglePlayBtn');const cards=window.document.querySelectorAll('#spHeroPickGrid .hero-card');assert.equal(cards.length,4);const gmCard=window.document.querySelector('#spHeroPickGrid .hero-card[data-hero="guildmaster"]');gmCard.dispatchEvent(new window.MouseEvent('click',{bubbles:true}));assert.equal(run('selectedHero'),'guildmaster');click('startGameBtn');assert.equal(run('state.players.blue.hero'),'guildmaster');assert.equal(run('state.players.blue.gold'),350);assert.match($('hudHeroName').textContent,/Guildmaster|Магистр|Xazinabon/)});
test('hero selection is shared across lobby and solo with translated preview',()=>{
  run("selectHero('infiltrator',false)");
  assert.equal(window.document.querySelector('#spHeroPickGrid [data-hero="infiltrator"]').getAttribute('aria-pressed'),'true');
  assert.equal(window.document.querySelector('#lobbyHeroButtons [data-hero="infiltrator"]').getAttribute('aria-pressed'),'true');
  assert.match($('heroPreview').textContent,/25%/);assert.match($('startGameBtn').textContent,/Shadow Infiltrator/);
  run("CrownI18n.setLanguage('ru')");assert.match($('spHeroSelectedStatus').textContent,/Теневой/);run("CrownI18n.setLanguage('en')");
});
test('Fortifier affordable upgrade and income reflect actual hero passives',()=>{
  fresh();run("state.players.blue.hero='fortifier';state.players.blue.gold=75;updateUI()");
  assert.equal($('upgradeBtn').disabled,false);assert.match($('upgradeCostText').textContent,/75/);assert.match($('sourceIncome').textContent,/3.5/);
  click('upgradeBtn');assert.equal(run('state.players.blue.gold'),0);assert.equal(run('state.castles[0].level'),2);
});
test('Guildmaster production and route speed include hero and weather effects',()=>{
  fresh();run("state.players.blue.hero='guildmaster';updateUI()");assert.match($('sourceIncome').textContent,/1.3/);
  run("state.players.blue.hero='infiltrator';state.weather.type='fog';marchRoute='flank';updateUI()");assert.match($('routeSpeedText').textContent,/97.5/);
});
test('level-three castles can change specialization without another upgrade',()=>{
  fresh();run('state.castles[0].level=3;updateUI()');click('tacticsBtn');assert.equal($('tacticsSpecialty').disabled,false);
  change('tacticsSpecialty','military');assert.equal($('applySpecialtyBtn').disabled,false);click('applySpecialtyBtn');
  assert.equal(run('state.castles[0].specialty'),'military');assert.equal(run('state.players.blue.gold'),150);assert.equal(run('nextSpecialty'),null);
});
test('invalid reserve gives a visible error and leaves state unchanged',()=>{
  fresh();click('tacticsBtn');$('reserveInput').value='-5';click('saveReserveBtn');assert.match($('tacticsFeedback').textContent,/whole reserve/);assert.equal(run('state.castles[0].reserve'),0);assert.equal($('tacticsDialog').open,true);
});
test('same specialization and insufficient Gold cannot make silent purchases',()=>{
  fresh();click('tacticsBtn');assert.equal($('applySpecialtyBtn').disabled,true);run('state.players.blue.gold=49');change('tacticsSpecialty','economy');assert.equal($('applySpecialtyBtn').disabled,true);assert.match($('applySpecialtyBtn').textContent,/50/);
});
test('rematching preserves the chosen commander, faction count and passive bonus',()=>{
  fresh();run("state=E.create(42,'balanced','normal',7,false,4,'conquest',{blue:'guildmaster'});resetMatch(true)");
  assert.equal(run('state.players.blue.hero'),'guildmaster');assert.equal(run('state.players.blue.gold'),350);assert.equal(run('state.playerCount'),4);assert.equal(run('state.victoryMode'),'conquest');
});
test('no owned source hides castle controls and explains the unavailable action',()=>{
  fresh();run("state.castles[0].owner='red';updateUI()");assert.ok(window.document.querySelector('.dock-tactics').classList.contains('hidden'));assert.match($('dispatchReason').textContent,/No owned source/);
});
test('disconnected multiplayer disables attacks and upgrades',()=>{
  fresh();run("multiplayerMode=true;wsClient={readyState:3};targetId=15;updateUI()");assert.equal($('dispatchActionBtn').disabled,true);assert.equal($('upgradeBtn').disabled,true);assert.match($('dispatchReason').textContent,/Connection lost/);
});
test('normal players do not see developer sandbox controls',()=>{assert.ok($('sandboxActions').classList.contains('hidden'))});
test('management shows castle buffs and recruitment controls are absent',()=>{
  fresh();run("state.castles[0].type='knight';updateUI()");click('moreCommandsBtn');
  assert.match($('mgmtBuffDescription').textContent,/25%.*20%/);
  for(const id of ['trainingDialog','quickRecruit100Btn','troopBar','troopSoldierBtn','openTrainingFromMgmtBtn'])assert.equal($(id),null);
  click('closeCastleMgmtBtn');
});
test('dragon strike targeting overlay opens and can be cancelled',()=>{
  fresh();
  run("state.time=50;state.castles[2].owner='blue';state.castles[3].owner='blue';state.players.blue.gold=1200;updateUI()");
  assert.ok($('dragonStrikeBtn').classList.contains('ready'));
  click('dragonStrikeBtn');
  assert.equal($('dragonTargetingOverlay').classList.contains('hidden'), false);
  click('cancelDragonBtn');
  assert.equal($('dragonTargetingOverlay').classList.contains('hidden'), true);
});
test('desktop mouse click executes dragon strike directly, touch tap retains overlay',()=>{
  fresh();
  run("state.time=50;state.castles[2].owner='blue';state.castles[3].owner='blue';state.players.blue.gold=1200;updateUI()");
  click('dragonStrikeBtn');
  assert.equal($('dragonTargetingOverlay').classList.contains('hidden'), false);
  // Mobile touch tap positions reticle and keeps overlay for confirmation button
  $('map').dispatchEvent(new window.PointerEvent('pointerdown', { pointerType: 'touch', bubbles: true }));
  $('map').dispatchEvent(new window.PointerEvent('click', { pointerType: 'touch', bubbles: true }));
  assert.equal($('dragonTargetingOverlay').classList.contains('hidden'), false);
  assert.equal(run('Boolean(state.dragonStrike)'), false);
  // Desktop mouse click executes dragon strike immediately
  $('map').dispatchEvent(new window.PointerEvent('pointerdown', { pointerType: 'mouse', bubbles: true }));
  $('map').dispatchEvent(new window.PointerEvent('click', { pointerType: 'mouse', bubbles: true }));
  assert.equal($('dragonTargetingOverlay').classList.contains('hidden'), true);
  assert.equal(run('Boolean(state.dragonStrike)'), true);
});
test('army inspection modal displays troop composition and handles recall action',()=>{
  fresh();
  const a = run("E.dispatch(state,'blue',0,2,25)");
  assert.ok(a);
  run("openArmyRecallDialog(state.armies[0])");
  assert.equal($('armyRecallDialog').open, true);
  assert.equal($('armyRecallTotal').textContent, '25');
  click('armyRecallActionBtn');
  assert.equal($('armyRecallDialog').open, false);
  assert.equal(run('state.armies[0].returning'), true);
});
test('historical Napoleonic and Orient maps load and display properly',()=>{
  fresh();
  run("resetMatch(false, 9, false, 2)");
  assert.equal(run("state.mapIndex"), 9);
  assert.equal(run("state.playerCount"), 2);
  run("resetMatch(false, 10, false, 3)");
  assert.equal(run("state.mapIndex"), 10);
  assert.equal(run("state.playerCount"), 3);
});
test('castle and marching labels show a single troop count after losses',()=>{
  fresh();run("state.castles[0].troops=280;targetId=1;updateUI();V.setQuality('high');V.render(state,1,0)");
  assert.match($('sourceComposition').textContent,/280/);assert.match($('composition0').textContent,/280/);
  run("E.dispatch(state,'blue',0,1,280);V.render(state,1,0)");
  assert.equal(new Set([...window.document.querySelectorAll('.marcher')].map(n=>n.dataset.unitType)).size,1);
  assert.match(window.document.querySelector('.army-composition').textContent,/280/);
  run("state.armies[0].count-=80;V.setQuality('low');V.render(state,1,0)");
  assert.match(window.document.querySelector('.army-composition').textContent,/200/);
});
test('battle sides show troop totals and enemy armies cannot be recalled',()=>{
  fresh();run("E.dispatch(state,'blue',0,1,100);E.dispatch(state,'red',1,0,90);E.engageBattle(state,state.armies);updateUI();V.render(state,1,0)");
  assert.match($('unitBattlePanel').textContent,/100/);assert.match($('unitBattlePanel').textContent,/90/);
  assert.equal(window.document.querySelectorAll('.battle-composition').length,2);
  run("openArmyRecallDialog(state.armies[1])");assert.equal($('armyRecallTotal').textContent,'90');assert.equal($('armyRecallActionBtn').disabled,true);
  run("state.armies[1].inBattle=false;openArmyRecallDialog(state.armies[1])");assert.equal($('armyRecallActionBtn').disabled,true);
  run("state.battles=[];updateUI()");assert.ok($('unitBattlePanel').classList.contains('hidden'));
});
test('R without an army never buys or creates troops',()=>{
  fresh();const troops=run('state.castles[0].troops'),gold=run('state.players.blue.gold');
  window.dispatchEvent(new window.KeyboardEvent('keydown',{key:'r',code:'KeyR'}));
  assert.equal(run('state.castles[0].troops'),troops);assert.equal(run('state.players.blue.gold'),gold);
});
test('all shipped UI translation keys exist in all supported languages',()=>{
  for(const lang of ['en','ru','uz'])for(const element of window.document.querySelectorAll('[data-i18n],[data-i18n-html],[data-i18n-placeholder]')) {
    const key=element.getAttribute('data-i18n')||element.getAttribute('data-i18n-html')||element.getAttribute('data-i18n-placeholder');
    assert.notEqual(window.CrownI18n.TRANSLATIONS[lang][key],undefined,`${lang}: ${key}`);
  }
});
test('snapshot parsing retains transmitted effects and leaves the packet unchanged',()=>{fresh();run("multiplayerMode=true;currentRoomCode='AUDIT';lastNetworkRevision=-1;const packet=E.create(42);packet.effects=[{x:500,y:500,text:'CAPTURED',owner:'blue',life:1.8}];window.auditPacket=packet;applySnapshot({roomCode:'AUDIT',revision:1,state:packet},true)");assert.equal(run('state.effects.length'),1);assert.equal(run('window.auditPacket.effects.length'),1);});
test('siege preview applies defense and assault castle buffs',()=>{fresh();run("state.castles[2].type='small';state.castles[2].troops=100;state.castles[0].troops=110;targetId=2;dispatchPercent=100;updateUI()");assert.match($('battleForecast').textContent,/High risk/);run("state.castles[2].type='gold';state.castles[2].troops=110;state.castles[0].troops=100;state.castles[0].type='knight';updateUI()");assert.match($('battleForecast').textContent,/Advantage/);assert.match($('battleForecast').textContent,/8/);});
test('mobility castle speed preview matches dispatch without troop types',()=>{fresh();run("state.castles[0].type='cavalry';window.auditSpeed=routeSpeedFor(state.castles[0]);window.auditArmy=E.dispatch(state,'blue',0,1,100)");assert.equal(run('window.auditSpeed'),106.25);assert.equal(run('window.auditArmy.speed'),106.25);});
test('career result is counted once after repeated UI refresh and loading a finished save',()=>{fresh();run("CrownCareer.resetStats();state.result='blue';updateUI();window.auditSave=E.serialize(state);$('resultDialog').close();updateUI();$('resultDialog').close();state=E.deserialize(window.auditSave);updateUI()");assert.equal(run('CrownCareer.loadStats().battles'),1);assert.equal(run('CrownCareer.loadStats().wins'),1);});
test('loser does not receive conquest and a draw is not a defeat',()=>{fresh();run("CrownCareer.resetStats();state.castles.forEach(c=>c.owner='red');state.result='red';updateUI()");assert.equal(run('CrownCareer.loadStats().hasGrandConquest'),false);fresh();run("state.result='draw';updateUI()");assert.equal(run('CrownCareer.loadStats().draws'),1);assert.equal(run('CrownCareer.loadStats().losses'),1);});
test('result records inflicted casualties and earned gold instead of own losses and balance',()=>{fresh();run("CrownCareer.resetStats();state.stats.blue.attackLosses=17;state.stats.blue.casualtiesInflicted=100;state.stats.blue.goldEarned=12;state.players.blue.gold=900;state.result='blue';updateUI()");assert.equal(run('CrownCareer.loadStats().casualtiesInflicted'),100);assert.equal(run('CrownCareer.loadStats().goldAmassed'),12);});
test('settings changes the running bot style',()=>{fresh();change('aiStyle','economist');assert.equal(run('state.players.red.aiStyle'),'economist');});
test('online interpolation leaves army time stationary during battle',()=>{fresh();run("multiplayerMode=true;const a=E.dispatch(state,'blue',0,1,100),b=E.dispatch(state,'red',1,0,100);E.engageBattle(state,[a,b]);last=1000;frame(1100)");assert.equal(run('state.armies[0].t'),0);});
test('dragon reticle and strike reach the full map and show the real damage radius',()=>{fresh();run("state.castles[2].owner=state.castles[4].owner='blue';state.time=40;state.players.blue.gold=1000");click('dragonStrikeBtn');run('dragonTargetPos={x:2190,y:1490};renderDragonReticle(2190,1490)');assert.equal($('dragonReticle').querySelector('circle').getAttribute('r'),'190');assert.equal(run('executeDragonStrike(2190,1490)'),true);assert.equal(run('state.dragonStrike.x'),2190);assert.equal(run('state.dragonStrike.y'),1490);assert.equal(run('dragonTargeting'),false);});
test('failed online dragon submission keeps targeting and does not spend gold',()=>{fresh();run("state.castles[2].owner=state.castles[4].owner='blue';state.time=40;state.players.blue.gold=1000;dragonTargeting=true;multiplayerMode=true;wsClient={readyState:3}");assert.equal(run('executeDragonStrike(1800,1300)'),false);assert.equal(run('dragonTargeting'),true);assert.equal(run('state.players.blue.gold'),1000);run('cancelDragonStrike()');});
console.log(`${count} interface tests passed`);
await window.happyDOM.abort();
