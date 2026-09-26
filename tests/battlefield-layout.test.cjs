const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const out='artifacts/crownfall-mobile';
(async()=>{const browser=await chromium.launch({args:['--no-sandbox']});try {
for(const [width,height] of [[390,844],[844,390],[1024,768],[1280,800],[1440,1000],[1920,1080]]){
 const page=await browser.newPage({viewport:{width,height},hasTouch:width<901,isMobile:width<901});
 await page.addInitScript(()=>localStorage.setItem('crownfall-tour','done'));
 await page.goto('http://localhost:4173');
 await page.evaluate(()=>{CrownI18n.setLanguage('en');enterGameMode();matchActive=false;state=E.create(1234);state.paused=false;state.aiDisabled=true;sourceId=0;targetId=1;V.init(state);updateUI();V.render(state,1,0);});
 await page.evaluate(()=>document.fonts.ready);
 await page.waitForTimeout(150);
 for(const lang of ['en','ru','uz']){
 await page.evaluate(lang=>{CrownI18n.setLanguage(lang);updateUI()},lang);
 const layout=await page.evaluate(()=>{
  const rect=id=>document.getElementById(id).getBoundingClientRect().toJSON();
  return {controls:['pause','menuBtn','moreCommandsBtn','dispatchActionBtn','routeToggleBtn','allCastlesBtn'].map(id=>({id,...rect(id)})),dock:rect('gameDock'),map:rect('map'),overflow:document.documentElement.scrollWidth>innerWidth};
 });
 assert.equal(layout.overflow,false,`${width} ${lang}: page overflow`);
 for(const c of layout.controls){assert.ok(c.width>=43&&c.height>=43,`${width}/${lang}/${c.id}: undersized ${c.width}x${c.height}`);assert.ok(c.x>=0&&c.y>=0&&c.right<=width+1&&c.bottom<=height+1,`${width}/${lang}/${c.id}: outside viewport`)}
 assert.ok(layout.map.height>height*.50,`${width}/${lang}: map not dominant`);
 }
 await page.evaluate(()=>{CrownI18n.setLanguage('en');updateUI()});
 await page.screenshot({path:`${out}/audit/layout-${width}.png`});
 console.log(`PASS ${width}×${height}: commands on screen, touch sizes, map area; English/Russian/Uzbek`);
 await page.close();
}
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
