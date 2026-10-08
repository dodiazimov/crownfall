'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const base=process.env.CROWNFALL_URL||'http://127.0.0.1:4173';
(async()=>{
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});const errors=[];
  try{
    for(const mobile of [false,true]){
      const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:900},hasTouch:mobile,isMobile:mobile});page.on('pageerror',e=>errors.push(e.message));
      await page.addInitScript(()=>{window.requestAnimationFrame=()=>1;localStorage.setItem('crownfall-lang','en');localStorage.setItem('crownfall-tour','done');});await page.goto(base);
      async function prepare(){await page.evaluate(()=>{
        document.querySelectorAll('dialog[open]').forEach(d=>d.close());multiplayerMode=false;myRole='blue';matchActive=true;state=E.create(42);state.aiDisabled=true;sourceId=0;targetId=null;
        state.castles[2].owner=state.castles[4].owner='blue';state.time=40;state.players.blue.gold=1000;V.init(state);enterGameMode();$('coach').classList.add('hidden');updateUI();V.render(state,null,0);
        const rect=$('map').getBoundingClientRect(),aspect=rect.width/rect.height,w=Math.max(2200,1500*aspect),h=Math.max(1500,2200/aspect);$('map').setAttribute('viewBox',`${(2200-w)/2} ${(1500-h)/2} ${w} ${h}`);$('dragonStrikeBtn').click();
      });}
      for(const [x,y] of [[15,15],[2185,15],[15,1485],[2185,1485],[1900,1350]]){
        await prepare();const point=await page.evaluate(({x,y})=>{const p=$('map').createSVGPoint();p.x=x;p.y=y;const screen=p.matrixTransform($('map').getScreenCTM());return{x:screen.x,y:screen.y,tolerance:1/$('map').getScreenCTM().a+1};},{x,y});
        if(mobile){await page.touchscreen.tap(point.x,point.y);assert.equal(await page.evaluate(()=>dragonTargeting),true);await page.click('#confirmDragonBtn');}
        else await page.mouse.click(point.x,point.y);
        const strike=await page.evaluate(()=>state.dragonStrike);assert.ok(strike,`strike at ${x},${y}, mobile=${mobile}`);assert.ok(Math.abs(strike.x-x)<=point.tolerance,JSON.stringify({mobile,wanted:[x,y],point,strike}));assert.ok(Math.abs(strike.y-y)<=point.tolerance,JSON.stringify({mobile,wanted:[x,y],point,strike}));assert.equal(strike.radius,190);
      }
      // A real screen-to-world transform under a zoomed, shifted viewport.
      await prepare();await page.evaluate(()=>$('map').setAttribute('viewBox','1400 950 800 550'));
      const point=await page.evaluate(()=>{const p=$('map').createSVGPoint();p.x=1950;p.y=1300;const q=p.matrixTransform($('map').getScreenCTM());return{x:q.x,y:q.y};});
      if(mobile){await page.touchscreen.tap(point.x,point.y);await page.click('#confirmDragonBtn');}else await page.mouse.click(point.x,point.y);
      const zoomed=await page.evaluate(()=>[state.dragonStrike.x,state.dragonStrike.y]);assert.ok(Math.abs(zoomed[0]-1950)<=4&&Math.abs(zoomed[1]-1300)<=4,JSON.stringify(zoomed));
      console.log(`PASS dragon full-map targeting, four corners and zoom (${mobile?'touch':'mouse'})`);await page.close();
    }
    const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>errors.push(e.message));await page.goto(base);
    // Inject an untrusted API display name to test escaping independently of server sanitization.
    await page.route('**/api/rooms',route=>route.fulfill({json:{ok:true,rooms:[{code:'BADNAME',host:{username:'<img src=x onerror="window.auditInjected=1">'},maxPlayers:2,playersCount:1,mapIndex:0,botDifficulty:'normal'}]}}));
    await page.click('#menuFriendsBtn');await page.click('#menuBrowseLobbiesFromDialogBtn');await page.waitForSelector('.lobby-item-host');assert.equal(await page.evaluate(()=>window.auditInjected),undefined);assert.equal(await page.locator('.lobby-item-host img').count(),0);assert.match(await page.locator('.lobby-item-host').textContent(),/<img/);
    console.log('PASS lobby nickname remains inert text');
    assert.deepEqual(errors,[]);
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
