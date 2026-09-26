// Touch regressions: readable initial camera, reachable commands and gesture isolation.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');const fs=require('node:fs');
const output='artifacts/ui-mobile-refresh';
fs.mkdirSync(output,{recursive:true});
(async()=>{const browser=await chromium.launch({args:['--no-sandbox']});const errors=[];
try{for(const [width,height] of [[320,568],[390,844],[568,320],[667,375],[844,390]]){
 const page=await browser.newPage({viewport:{width,height},hasTouch:true,isMobile:true});page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  localStorage.setItem('crownfall-tour','done');
  window.hiddenMenuDraws=0;
  const clear=CanvasRenderingContext2D.prototype.clearRect;
  CanvasRenderingContext2D.prototype.clearRect=function(...args){if(this.canvas.id==='menuAmbianceCanvas')window.hiddenMenuDraws++;return clear.apply(this,args)};
 });
 await page.goto('http://localhost:4173');await page.evaluate(()=>CrownI18n.setLanguage('en'));
 // Hidden battlefield must not consume DOM work behind the main menu.
 const mutations=await page.evaluate(async()=>{let count=0;const ob=new MutationObserver(rs=>count+=rs.length);ob.observe(document.getElementById('map'),{subtree:true,attributes:true,childList:true});await new Promise(r=>setTimeout(r,350));ob.disconnect();return count});assert.equal(mutations,0,'menu kept rendering hidden battlefield');
 assert.equal(await page.evaluate(()=>window.hiddenMenuDraws),0,'hidden menu canvas kept drawing');
 for(const button of await page.locator('.menu-header-actions button:visible').all()){
  const r=await button.boundingBox();assert.ok(r.width>=44&&r.height>=44,'menu shortcut too small');
  assert.ok(r.x>=0&&r.x+r.width<=width+1,'menu shortcut outside screen');
 }
 await page.screenshot({path:`${output}/menu-${width}.png`});
 if(width>=480&&width<=700&&height<=520){
  const header=await page.locator('.menu-top-profile-cluster').boundingBox();
  const brand=await page.locator('.menu-brand-header').boundingBox();
  assert.ok(brand.y>=header.y+header.height,'menu profile overlaps the title');
 }
 for(const id of ['menuSettingsBtn','menuRulesBtn','menuHotkeysBtn']){await page.locator('#'+id).scrollIntoViewIfNeeded();assert.ok(await page.locator('#'+id).isVisible());}
 await page.click('#menuSinglePlayBtn');await page.click('#spHeroPickGrid [data-hero="vanguard"]');await page.locator('#battleSettings summary').click();await page.selectOption('#startMapSelect','0');await page.uncheck('#startRandomCastles');await page.click('#startGameBtn');await page.evaluate(()=>{state.aiDisabled=true});await page.waitForTimeout(350);
 let home=await page.locator('#castle0 .castle-hitbox').boundingBox();assert.ok(home.width>=44,`unusable castle target ${home.width}px`);
 for(const selector of ['#pause','#menuBtn','#moreCommandsBtn','#routeToggleBtn','#allCastlesBtn','#dispatchActionBtn','.pct-btn[data-percent="50"]']){
 const rect=await page.locator(selector).boundingBox();assert.ok(rect&&rect.width>=43&&rect.height>=43,`${selector} too small: ${JSON.stringify(rect)}`);assert.ok(rect.x>=0&&rect.y>=0&&rect.x+rect.width<=width+1&&rect.y+rect.height<=height+1,`${selector} outside screen`);
 }
 const rows=await page.evaluate(()=>['activeBox','tacticalControls','targetBox'].map(id=>document.getElementById(id).getBoundingClientRect().toJSON()));if(width<480||height>520){assert.ok(rows[0].bottom<=rows[1].top&&rows[1].bottom<=rows[2].top,'command rows overlap');}
 const target=await page.evaluate(()=>{const hud=document.querySelector('.game-hud').getBoundingClientRect(),dock=document.getElementById('gameDock').getBoundingClientRect();return state.castles.filter(c=>c.owner!=='blue').map(c=>{const r=document.querySelector(`#castle${c.id} .castle-hitbox`).getBoundingClientRect();return{id:c.id,x:r.x+r.width/2,y:r.y+r.height/2}}).find(c=>c.x>28&&c.x<innerWidth-70&&c.y>hud.bottom+50&&c.y<dock.top-55)});assert.ok(target,'no playable target in initial view');
 await page.touchscreen.tap(target.x,target.y);assert.equal(await page.evaluate(()=>targetId),target.id);assert.equal(await page.evaluate(()=>state.armies.length),0,'inspection issued an order');
 await page.locator('.pct-btn[data-percent="50"]').tap();await page.locator('#dispatchActionBtn').tap();assert.ok(await page.evaluate(()=>state.armies.some(a=>a.owner==='blue')));
 await page.screenshot({path:`${output}/touch-dispatch-${width}.png`});
 const cdp=await page.context().newCDPSession(page);
 const before=await page.locator('#map').getAttribute('viewBox');
 const point=await page.evaluate(()=>{const m=document.getElementById('map').getBoundingClientRect();for(let y=m.top+60;y<m.bottom-60;y+=25)for(let x=Math.min(innerWidth-80,270);x>180;x-=20){const e=document.elementFromPoint(x,y);if(e?.closest('#map')&&!e.closest('[data-id]'))return{x,y}}});assert.ok(point,'no area to pan');
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,...point}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:point.x-90,y:point.y}]});await page.waitForFunction(v=>document.getElementById('map').getAttribute('viewBox')!==v,before);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 assert.notEqual(await page.locator('#map').getAttribute('viewBox'),before,'touch pan failed');
 const pinchBefore=await page.locator('#map').getAttribute('viewBox');const y=point.y,x=Math.min(width/2,240);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:x-25,y},{id:2,x:x+25,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:x-65,y},{id:2,x:x+65,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 assert.ok(+((await page.locator('#map').getAttribute('viewBox')).split(' ')[2])<+pinchBefore.split(' ')[2],'pinch did not zoom');
 await page.locator('#zoomReset').tap();assert.ok(+((await page.locator('#map').getAttribute('viewBox')).split(' ')[2])>=2200);
 await page.locator('#focusHome').tap();home=await page.locator('#castle0 .castle-hitbox').boundingBox();assert.ok(home.width>=44);
 await page.locator('#moreCommandsBtn').tap();assert.ok(await page.locator('#openTrainingFromMgmtBtn').isVisible());await page.locator('#closeCastleMgmtBtn').tap();
 const sizeBefore=(await page.locator('#castle0 .castle-hitbox').boundingBox()).width;
 await page.setViewportSize({width:height,height:width});await page.waitForTimeout(250);
 const sizeAfter=(await page.locator('#castle0 .castle-hitbox').boundingBox()).width;
 assert.ok(sizeAfter>=44&&Math.abs(sizeAfter-sizeBefore)<3,`rotation changed touch scale: ${sizeBefore} → ${sizeAfter}`);
 await page.locator('#zoomReset').tap();
 await page.setViewportSize({width,height});await page.waitForTimeout(250);
 assert.ok(+((await page.locator('#map').getAttribute('viewBox')).split(' ')[2])>=2200,'rotation lost overview');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 console.log(`PASS ${width}×${height}: 44px controls, local camera, target inspection, dispatch, pan, pinch, overview, home, management`);await page.close();
}
assert.deepEqual(errors,[]);
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
