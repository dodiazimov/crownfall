/* Real Chromium UI audit. Uses an isolated browser profile and optional test server.
   PLAYWRIGHT_MODULE=/path/to/playwright CROWNFALL_URL=http://127.0.0.1:4186 node tests/ui-audit.test.cjs */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base=process.env.CROWNFALL_URL || 'http://127.0.0.1:4173';
const output=process.env.CROWNFALL_ARTIFACTS || '/tmp/crownfall-ui-audit/results';
fs.mkdirSync(output,{recursive:true});
const errors=[];
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const newPage=async(width=1366,height=768,touch=false)=>{
   const p=await browser.newPage({viewport:{width,height},hasTouch:touch});
   p.on('pageerror',e=>errors.push(e.message));
   await p.goto(base);await p.evaluate(()=>CrownI18n.setLanguage('en'));return p;
 };
 const shot=async(p,name)=>{await p.screenshot({path:`${output}/${name}.png`,animations:'disabled'});};
 const within=async(p,selector)=>{
   const e=p.locator(selector);await e.scrollIntoViewIfNeeded();
   const b=await e.boundingBox(),v=p.viewportSize();assert.ok(b&&b.x>=-1&&b.y>=-1&&b.x+b.width<=v.width+1&&b.y+b.height<=v.height+1,`${selector} outside ${v.width}×${v.height}: ${JSON.stringify(b)}`);
 };
 const contained=async(p,selector)=>assert.equal(await p.locator(selector).evaluate(e=>e.scrollWidth<=e.clientWidth+2),true,`${selector} horizontal overflow at ${JSON.stringify(p.viewportSize())}`);
 const commands=async p=>{if(await p.locator('#moreCommandsBtn').isVisible()&&await p.locator('#moreCommandsBtn').getAttribute('aria-expanded')==='false')await p.click('#moreCommandsBtn');};
 try{
 for(const [w,h] of [[1920,1080],[1600,900],[1366,768],[1280,720],[1024,768],[844,390],[667,375],[390,844],[320,568]]){
   const p=await newPage(w,h,w<=1024);
   await contained(p,'#mainMenuScreen');await shot(p,`menu-${w}`);
   // Each actual menu opener, close button and native Escape route.
   for(const [opener,id] of [['menuSettingsBtn','menuDialog'],['menuRulesBtn','helpDialog'],['menuHotkeysBtn','hotkeysDialog'],['menuAuthBtn','authDialog'],['viewCareerDossierBtn','careerDialog'],['menuBrowseLobbiesBtn','lobbyBrowserDialog']]){
     await p.click('#'+opener);await contained(p,'#'+id);await within(p,'#'+id);
     if(id==='authDialog'){await p.click('#authSubmitBtn');assert.match(await p.locator('#authAlert').textContent(),/username and password/);}
     if([1366,844,390].includes(w))await shot(p,`${id}-${w}`);
     await p.keyboard.press('Escape');assert.equal(await p.locator('#'+id).evaluate(e=>e.open),false);
   }
   await p.click('#menuSinglePlayBtn');assert.equal(await p.locator('#startGameBtn').isDisabled(),true);
   await contained(p,'#difficultyDialog');
   // All four selectable commanders, preview and clear selection semantics.
   for(const hero of ['vanguard','fortifier','guildmaster','infiltrator']){
     const card=p.locator(`#spHeroPickGrid [data-hero="${hero}"]`);await card.click();
     assert.equal(await card.getAttribute('aria-pressed'),'true');assert.equal(await p.locator('#spHeroPickGrid [aria-pressed="true"]').count(),1);
     assert.match(await p.locator('#heroPreview').textContent(),/Passive ability/);
   }
   await p.locator('#spHeroPickGrid [data-hero="guildmaster"]').focus();await p.keyboard.press('Enter');
   assert.equal(await p.evaluate(()=>selectedHero),'guildmaster');
   await shot(p,`hero-${w}`);await within(p,'#startGameBtn');
   await p.locator('#battleSettings summary').click();
   await p.click('#spPlayerCountToggle [data-count="4"]');assert.equal(await p.locator('#startMapSelect').inputValue(),'7');
   assert.equal(await p.locator('#startMapSelect option[value="0"]').isDisabled(),true);
   await p.click('#spPlayerCountToggle [data-count="2"]');await p.selectOption('#startMapSelect','0');await p.uncheck('#startRandomCastles');
   await contained(p,'.battle-settings');await shot(p,`setup-${w}`);
   await p.click('#startGameBtn');await p.click('#skipCoach');
   await p.evaluate(()=>{state.aiDisabled=true;});
   await contained(p,'.game-hud');await contained(p,'#gameDock');
   await within(p,'#menuBtn');await within(p,'#dispatchActionBtn');
   await p.click('#zoomReset');await p.click('#castle15');assert.equal(await p.evaluate(()=>state.armies.length),0);
   assert.match(await p.locator('#battleForecast').textContent(),/451/);await shot(p,`game-${w}`);
   await commands(p);await p.click('#tacticsBtn');await p.fill('#reserveInput','-1');await p.click('#saveReserveBtn');assert.match(await p.locator('#tacticsFeedback').textContent(),/whole reserve/);
   await p.fill('#reserveInput','40');await p.click('#saveReserveBtn');assert.equal(await p.evaluate(()=>state.castles[0].reserve),40);
   await p.click('#routeToggleBtn');assert.equal(await p.evaluate(()=>marchRoute),'flank');
   await p.click('#dispatchActionBtn');assert.ok(await p.evaluate(()=>state.armies.length>0));
   await commands(p);await p.click('#upgradeBtn');assert.equal(await p.evaluate(()=>state.castles[0].level),2);
   await p.click('#menuBtn');assert.equal(await p.evaluate(()=>state.paused),true);assert.equal(await p.locator('#sandboxActions').isVisible(),false);
   await p.selectOption('#qualitySelect','medium');await p.click('#settingsSoundOnBtn');assert.equal(await p.evaluate(()=>CrownSound.isEnabled()),true);
   await p.click('#closeMenu');await p.click('#resumeNotice');
   await p.evaluate(()=>saveMatch());await p.reload();assert.equal(await p.evaluate(()=>state.paused),true);assert.equal(await p.evaluate(()=>state.players.blue.hero),'guildmaster');
   await within(p,'#resumeNotice');await shot(p,`restore-${w}`);
   console.log(`PASS menus, all heroes, settings, command flows and restore at ${w}×${h}`);await p.close();
 }
 // Long localized names and 200% text size must remain contained.
 const localized=await newPage(1280,720);await localized.click('#menuSinglePlayBtn');
 for(const lang of ['ru','uz','en']){
   await localized.evaluate(lang=>CrownI18n.setLanguage(lang),lang);await localized.click('#spHeroPickGrid [data-hero="infiltrator"]');
   await contained(localized,'#difficultyDialog');await shot(localized,`hero-${lang}`);
 }
 await localized.emulateMedia({reducedMotion:'reduce'});assert.equal(await localized.locator('.hero-card').first().evaluate(e=>getComputedStyle(e).transitionDuration),'1e-05s');await localized.close();
 // Gameplay state fixtures expose hard-to-reach presentation states without changing production saves.
 const p=await newPage();await p.click('#menuSinglePlayBtn');await p.click('#spHeroPickGrid [data-hero="fortifier"]');await p.click('#startGameBtn');await p.click('#skipCoach');
 await p.evaluate(()=>{state.aiDisabled=true;state.castles[2].owner='blue';state.castles[0].level=3;state.players.blue.gold=50;updateUI();V.render(state,null,0);});
 await p.click('#tacticsBtn');await p.selectOption('#tacticsSpecialty','economy');await p.click('#applySpecialtyBtn');assert.equal(await p.evaluate(()=>state.castles[0].specialty),'economy');
 await p.click('#tacticsBtn');await p.selectOption('#tacticsSupplyTarget','2');await p.click('#saveSupplyBtn');assert.equal(await p.evaluate(()=>state.castles[0].supply.target),2);
 await p.click('#allCastlesBtn');await p.click('#zoomReset');await p.click('#castle15');await p.click('#dispatchActionBtn');assert.ok(await p.evaluate(()=>state.orders.length+state.armies.length>0));
 await p.evaluate(()=>{state.crownControl={owner:'blue',timer:15};state.weather.type='snow';updateUI();});await shot(p,'weather-snow');
 for(const winner of ['blue','red']){
   await p.evaluate(winner=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());state.result=winner;state.resultReason='elimination';updateUI();},winner);
   await within(p,'#resultDialog');await contained(p,'#resultDialog');await shot(p,`result-${winner}`);
 }
 await p.click('#rematchBtn');assert.equal(await p.evaluate(()=>state.players.blue.hero),'fortifier');assert.equal(await p.evaluate(()=>state.result),null);await p.close();
 // Actual two-client multiplayer: hero selection, room settings, attacks, upgrade, reconnect and rematch.
 const a=await newPage(),b=await newPage(844,390,true);
 await a.click('#menuFriendsBtn');await a.click('#menuCreateRoomBtn');await a.waitForFunction(()=>!!currentRoomCode);const code=await a.evaluate(()=>currentRoomCode);
 await a.click('#lobbyHeroButtons [data-hero="fortifier"]');
 await a.click('#lobbyMaxPlayersToggle [data-max="2"]');await a.waitForFunction(()=>lobbyState.maxPlayers===2);
 await b.click('#menuFriendsBtn');await b.fill('#menuJoinInput',code);await b.click('#menuJoinRoomBtn');await b.waitForFunction(()=>myRole==='red');
 await b.click('#lobbyHeroButtons [data-hero="guildmaster"]');await a.waitForFunction(()=>lobbyState.players.some(p=>p.role==='red'&&p.hero==='guildmaster'));
 await a.selectOption('#lobbyMapSelect','0');await a.uncheck('#lobbyRandomCastles');
 await contained(a,'#roomLobbyDialog');await contained(b,'#roomLobbyDialog');await shot(a,'lobby-host');await shot(b,'lobby-guest');
 await a.click('#lobbyStartMatchBtn');await Promise.all([a.waitForFunction(()=>matchActive&&lastNetworkRevision>=0),b.waitForFunction(()=>matchActive&&lastNetworkRevision>=0)]);
 assert.equal(await a.evaluate(()=>state.players.blue.hero),'fortifier');assert.equal(await b.evaluate(()=>state.players.red.hero),'guildmaster');
 await a.click('#skipCoach');await b.click('#skipCoach');await a.click('#castle2');await a.click('#dispatchActionBtn');await b.waitForFunction(()=>state.armies.some(x=>x.owner==='blue'));
 await commands(b);await b.click('#upgradeBtn');await a.waitForFunction(()=>state.castles[1].level===2);
 assert.equal(await b.locator('#pause').isDisabled(),true);
 await b.evaluate(()=>wsClient.close());await b.waitForFunction(()=>wsClient?.readyState===1&&document.getElementById('offlineNoticeBanner').classList.contains('hidden'),{},{timeout:12000});assert.equal(await b.evaluate(()=>state.result),null);
 await b.click('#returnMenuBtn');if(await b.locator('#confirmMenuDialog').evaluate(e=>e.open))await b.click('#confirmMenuYesBtn');await a.waitForFunction(()=>state.result==='blue');
 await a.click('#rematchBtn');await a.waitForFunction(()=>!state.result&&state.time<5);assert.equal(await a.evaluate(()=>state.players.blue.hero),'fortifier');
 await a.close();await b.close();console.log('PASS multiplayer heroes, rooms, authoritative actions, reconnect, forfeit and rematch');
 // Escape must cancel queue membership and leave a lobby, not merely hide it.
 const q=await newPage();await q.click('#menuQuickMatchBtn');await q.click('#spHeroPickGrid [data-hero="infiltrator"]');await q.click('#startGameBtn');await q.keyboard.press('Escape');
 assert.equal(await q.locator('#matchmakingDialog').evaluate(e=>e.open),false);await q.waitForTimeout(3500);assert.equal(await q.evaluate(()=>matchActive),false);
 await q.click('#menuFriendsBtn');await q.click('#menuCreateRoomBtn');await q.waitForFunction(()=>!!currentRoomCode);await q.keyboard.press('Escape');await q.waitForFunction(()=>currentRoomCode===null);assert.equal(await q.evaluate(()=>multiplayerMode),false);
 await q.click('#menuQuickMatchBtn');await q.click('#startGameBtn');await q.waitForFunction(()=>matchActive&&multiplayerMode,{},{timeout:10000});assert.equal(await q.evaluate(()=>state.players[myRole].hero),'infiltrator');await q.close();
 console.log('PASS quick-match cancellation, lobby Escape cleanup and AI fallback');
 const fail=await newPage();await fail.route('**/api/rooms',r=>r.abort());await fail.click('#menuBrowseLobbiesBtn');await fail.waitForFunction(()=>document.getElementById('lobbiesListContainer').textContent.includes('could not be loaded'));await shot(fail,'lobbies-error');await fail.close();
 assert.deepEqual(errors,[],'Uncaught browser errors');console.log('PASS zero uncaught browser errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
