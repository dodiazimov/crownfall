const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const errors=[];
 try{
 for(const [width,height] of [[1440,900],[768,1024],[390,844],[320,568],[844,390]]){
  const page=await browser.newPage({viewport:{width,height}});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.CROWNFALL_URL || 'http://localhost:4173');await page.evaluate(()=>CrownI18n.setLanguage('uz'));
  await page.click('#menuSinglePlayBtn');await page.click('[data-hero="vanguard"]');await page.click('#startGameBtn');await page.click('#skipCoach');
  await page.evaluate(()=>{state.aiDisabled=true;});
  await page.waitForTimeout(600);
  await page.click('#zoomReset');
  const result=await page.evaluate(()=>{
   const map=document.getElementById('map'),r=map.getBoundingClientRect(),vb=map.viewBox.baseVal;
   const hud=document.querySelector('.game-hud').getBoundingClientRect(),dock=document.getElementById('gameDock').getBoundingClientRect();
   return {w:vb.width,h:vb.height,x:vb.x,y:vb.y,top:r.top,bottom:r.bottom,hudBottom:hud.bottom,dockTop:dock.top,overflow:document.documentElement.scrollWidth>innerWidth};
  });
  assert.ok(result.x<=0&&result.y<=0&&result.x+result.w>=2200&&result.y+result.h>=1500,JSON.stringify(result));
  assert.ok(result.top>=result.hudBottom-1&&result.bottom<=result.dockTop+1,JSON.stringify(result));
  assert.equal(result.overflow,false);
  await page.click('#castle15');
  const btn=await page.locator('#dispatchActionBtn').boundingBox();assert.ok(btn.x>=0&&btn.x+btn.width<=width+1&&btn.y+btn.height<=height,JSON.stringify(btn));
  if(await page.locator('#moreCommandsBtn').isVisible()){const more=await page.locator('#moreCommandsBtn').boundingBox();assert.ok(more.y+more.height<=height,JSON.stringify(more));}
  await page.waitForTimeout(2000);await page.screenshot({path:`${process.env.CROWNFALL_ARTIFACTS || "/tmp"}/map-fixed-${width}.png`});
  await page.click('#zoomIn');await page.click('#zoomReset');
  if(await page.locator('#moreCommandsBtn').isVisible())await page.click('#moreCommandsBtn');
  await page.click('#tacticsBtn');await page.fill('#reserveInput','20');await page.click('#saveReserveBtn');assert.equal(await page.evaluate(()=>state.castles[0].reserve),20);
  console.log(`PASS full map, safe panels, castle selection and attack button ${width}x${height}`);
  await page.close();
 }
 assert.deepEqual(errors,[]);
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
