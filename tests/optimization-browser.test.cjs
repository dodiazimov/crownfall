'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base=process.env.CROWNFALL_URL||'http://127.0.0.1:4175';
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});const errors=[];
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.requestAnimationFrame=()=>1;localStorage.setItem('crownfall-tour','done');});await page.goto(base);
  const checks=await page.evaluate(()=>{
   const check=(v,m)=>{if(!v)throw Error(m);};
   enterGameMode();matchActive=false;state=E.create(42);state.aiDisabled=true;state.progressiveCombat=true;V.setQuality('high');V.init(state);
   const a=E.dispatch(state,'blue',0,1,80),b=E.dispatch(state,'red',1,0,80);a.t=a.duration*.5;b.t=b.duration*.5;E.engageBattle(state,[a,b]);
   const effect={x:550,y:740,text:'−10 <safe>',owner:'blue',life:1.4};state.effects=[effect];
   V.render(state,null,0);const battle=document.querySelector('.road-battle-marker'),smoke=battle.querySelector('.clash-smoke'),label=battle.querySelector('[data-owner="blue"] text'),effectNode=document.getElementById('effects').firstChild;
   const initialLabel=label.textContent;a.count-=10;effect.life-=.2;
   V.render(state,null,0);check(battle===document.querySelector('.road-battle-marker'),'Battle identity lost');check(smoke===battle.querySelector('.clash-smoke'),'Smoke recreated');check(label.textContent!==initialLabel,'Battle count stale');check(effectNode===document.getElementById('effects').firstChild,'Effect recreated');check(effectNode.textContent===effect.text,'Unsafe/stale effect text');
   state.dragonStrike={state:'incoming',x:800,y:600,timer:2,totalTimer:3};V.render(state,null,0);const dragon=document.getElementById('dragonStrikeLayer').firstElementChild;state.dragonStrike.timer=1;V.render(state,null,0);check(dragon===document.getElementById('dragonStrikeLayer').firstElementChild,'Dragon recreated');check(dragon.textContent.includes('1.0s'),'Dragon timer stale');
   const vb=document.getElementById('map').getAttribute('viewBox');V.setQuality('low');V.render(state,null,0);check(document.getElementById('map').getAttribute('viewBox')===vb,'Quality changed camera');
   for(const n of document.querySelectorAll('.army-token')){check(n.querySelectorAll('.marcher').length<=3,'Low army budget exceeded');check(n.querySelector('.march-dust').style.display==='none','Low dust still active');}
   check(getComputedStyle(document.querySelector('.castle-sprite-img')).filter==='none','Low filter overridden');
   const before=JSON.stringify(state);V.render(state,null,0);check(before===JSON.stringify(state),'Render mutates simulation');
   state.effects=[];state.battles=[];state.armies=[];state.dragonStrike=null;V.render(state,null,0);check(!battle.isConnected&&!effectNode.isConnected&&!dragon.isConnected,'Ended nodes retained in DOM');
   for(let i=0;i<20;i++){state=E.create(42);V.init(state);V.render(state,null,0);check(document.querySelectorAll('.castle').length===21,'Restart duplicates castles');check(document.querySelectorAll('.road-battle-marker,.army-token').length===0,'Restart retains transient nodes');}
   const original=V.render;const pacing={};matchActive=true;state.paused=true;
   for(const quality of ['low','high']){MobileGame.setQuality(quality);let calls=0;V.render=()=>calls++;last=0;lastRenderTime=0;uiClock=0;saveClock=0;for(let i=1;i<=144;i++)frame(i*1000/144);pacing[quality]=calls;check(calls>=(quality==='low'?27:55)&&calls<=(quality==='low'?33:65),'144Hz pacing misses target: '+quality+' '+calls);}
   V.render=original;matchActive=false;state.paused=false;
   return{battleIdentity:true,effectIdentity:true,dragonIdentity:true,lowQuality:true,renderPure:true,restarts:20,pacing};
  });
  assert.deepEqual(errors,[]);fs.mkdirSync('artifacts/web-optimization',{recursive:true});fs.writeFileSync('artifacts/web-optimization/browser-regression.json',JSON.stringify(checks,null,2));console.log(JSON.stringify(checks));
  await page.screenshot({path:'artifacts/web-optimization/low-quality.png'});
  // Every selected terrain must resolve, decode and retain its full native dimensions.
  const terrain=await page.evaluate(async()=>{
   const results=[];for(let i=0;i<E.MAPS.length;i++){
    const url=CrownMapStyle.terrain({mapIndex:i}),image=new Image();image.src=url;await image.decode();results.push({map:i,url,width:image.naturalWidth,height:image.naturalHeight});
   }return results;
  });assert.equal(terrain.length,11);assert.ok(terrain.every(t=>t.width>1000&&t.height>700));
  fs.writeFileSync('artifacts/web-optimization/terrain-browser.json',JSON.stringify(terrain,null,2));
  // Classic local scripts and relative art paths also work without the HTTP server.
  const offline=await browser.newPage();await offline.addInitScript(()=>{window.requestAnimationFrame=()=>1;localStorage.setItem('crownfall-tour','done');});
  await offline.goto('file://'+require('node:path').resolve('dist/index.html'));
  assert.equal(await offline.evaluate(async()=>{const image=new Image();image.src=CrownMapStyle.terrain({mapIndex:8});await image.decode();return image.naturalWidth>1000;}),true);
  console.log('PASS all 11 terrain decodes, offline terrain and persistent render/pacing regressions');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
