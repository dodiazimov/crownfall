// Optional real-browser regression pass. Requires Playwright and a running server.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const {mkdirSync}=require('node:fs');
const base=process.env.CROWNFALL_URL || 'http://127.0.0.1:4173';
const artifacts=process.env.CROWNFALL_ARTIFACTS || '/tmp/crownfall-browser-results';
(async()=>{
 mkdirSync(artifacts,{recursive:true});
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const errors=[];
 const pageFor=async viewport=>{const page=await browser.newPage({viewport});page.on('pageerror',e=>errors.push(e.message));await page.goto(base);await page.evaluate(()=>CrownI18n.setLanguage('en'));return page};
 const commands=async p=>{if(await p.locator('#moreCommandsBtn').isVisible()&&await p.locator('#moreCommandsBtn').getAttribute('aria-expanded')==='false')await p.click('#moreCommandsBtn');};
 try {
 for(const [width,height] of [[1440,900],[768,1024],[390,844],[320,568]]){
   const page=await pageFor({width,height});
   await page.click('#menuSinglePlayBtn');
   await page.click('#spHeroPickGrid [data-hero="vanguard"]');
   await page.locator('#battleSettings summary').click();
   await page.selectOption('#startMapSelect','0');
   await page.uncheck('#startRandomCastles');
   await page.click('#startGameBtn');
   await page.click('#skipCoach');
   await page.click('#zoomReset');await page.click('#castle15');
   assert.equal(await page.evaluate(()=>state.armies.length),0);
   assert.match(await page.locator('#battleForecast').textContent(),/451.*High risk/);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${width}px horizontal overflow`);
   await commands(page);
   await page.click('#tacticsBtn');await page.fill('#reserveInput','40');await page.click('#saveReserveBtn');assert.equal(await page.evaluate(()=>state.castles[0].reserve),40);
   await page.click('#routeToggleBtn');assert.equal(await page.evaluate(()=>marchRoute),'flank');
   await page.click('#dispatchActionBtn');assert.ok(await page.evaluate(()=>state.armies.length>0));
   await page.screenshot({path:`${artifacts}/game-${width}.png`});
   await page.click('#menuBtn');assert.equal(await page.evaluate(()=>state.paused),true);await page.selectOption('#aiStyle','economist');assert.equal(await page.evaluate(()=>state.aiStyle),'economist');
   await page.click('#settingsSoundOnBtn');assert.equal(await page.evaluate(()=>CrownSound.isEnabled()&&MobileGame.isSoundOn()),true);
   await page.click('#closeMenu');await page.click('#resumeNotice');
   await page.evaluate(()=>saveMatch());await page.reload();assert.equal(await page.evaluate(()=>state.paused),true);assert.ok(await page.locator('body').evaluate(e=>e.classList.contains('in-game')));
   console.log(`PASS browser gameplay, tactics, restore and layout at ${width}×${height}`);await page.close();
 }
 const a=await pageFor({width:1440,height:900}),b=await pageFor({width:390,height:844});
 await a.click('#menuFriendsBtn');await a.click('#menuCreateRoomBtn');await a.waitForFunction(()=>!!currentRoomCode);const code=await a.evaluate(()=>currentRoomCode);
 await b.click('#menuFriendsBtn');await b.fill('#menuJoinInput',code);await b.click('#menuJoinRoomBtn');await b.waitForFunction(()=>myRole==='red');await a.waitForFunction(()=>!document.getElementById('lobbyStartMatchBtn').disabled);await a.click('#lobbyStartMatchBtn');
 await Promise.all([a.waitForFunction(()=>matchActive&&lastNetworkRevision>=0),b.waitForFunction(()=>matchActive&&lastNetworkRevision>=0)]);
 await a.click('#skipCoach');await b.click('#skipCoach');await a.click('#castle2');await a.click('#dispatchActionBtn');
 await b.waitForFunction(()=>state.armies.some(a=>a.owner==='blue'));
 await commands(b);await b.click('#upgradeBtn');await a.waitForFunction(()=>state.castles[1].level===2);
 assert.equal(await a.evaluate(()=>state.castles[1].specialty),'balanced');
 assert.equal(await b.locator('#pause').isDisabled(),true);
 // Loss of the guest transport must not end the room; auto-rejoin restores it.
 await b.evaluate(()=>wsClient.close());await b.waitForFunction(()=>wsClient?.readyState===1&&!document.getElementById('offlineNoticeBanner').classList.contains('show')&&lastNetworkRevision>2,{},{timeout:10000});
 await b.waitForFunction(()=>document.getElementById('offlineNoticeBanner').classList.contains('hidden'),{},{timeout:10000});
 assert.equal(await b.evaluate(()=>state.result),null);
 await a.screenshot({path:`${artifacts}/online-host.png`});await b.screenshot({path:`${artifacts}/online-guest.png`});
 await b.click('#returnMenuBtn');if(await b.locator('#confirmMenuDialog').evaluate(e=>e.open))await b.click('#confirmMenuYesBtn');await a.waitForFunction(()=>state.result==='blue');assert.match(await a.locator('#resultText').textContent(),/Opponent left/);
 console.log('PASS two-browser orders, upgrades, reconnect and forfeit');
 // Quick matchmaking has a server-controlled AI fallback.
 const quick=await pageFor({width:1440,height:900});await quick.click('#menuQuickMatchBtn');await quick.click('#spHeroPickGrid [data-hero="infiltrator"]');await quick.click('#startGameBtn');await quick.waitForFunction(()=>matchActive&&multiplayerMode,{},{timeout:10000});assert.deepEqual(await quick.evaluate(()=>state.botPlayers),['red']);await quick.close();
 console.log('PASS quick matchmaking AI fallback');
 assert.deepEqual(errors,[],'Browser runtime errors');
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
