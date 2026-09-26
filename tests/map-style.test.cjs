// Browser integration: every layout, era and quality, actual input and moving armies.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const results=[],errors=[];
 try{
 for(const width of [1440,390]){
 const page=await browser.newPage({viewport:{width,height:width===390?844:900},isMobile:width===390,hasTouch:width===390});
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 await page.goto('http://localhost:4173');
 await page.evaluate(()=>{CrownI18n.setLanguage('en');enterGameMode();document.querySelectorAll('dialog[open]').forEach(d=>d.close());document.getElementById('skipCoach')?.click();});
 for(let map=0;map<11;map++){
 const variations=await page.evaluate(({map,width})=>{
 const out=[];
 for(const epoch of ['17th','18th','19th','20th'])for(const quality of ['low','medium','high']){
 state=CrownEngine.create(4173,'balanced','normal',map,false,null,'crown_control',{blue:'vanguard'},false,epoch);
 state.aiDisabled=true;state.paused=false;sourceId=0;targetId=null;matchActive=true;
 const snapshot=JSON.stringify(state);
 CrownView.setQuality(quality);
 const t=performance.now();CrownView.init(state);CrownView.render(state,null,0);const ms=performance.now()-t;
 if(JSON.stringify(state)!==snapshot)throw Error('Renderer changed gameplay');
 if(document.querySelectorAll('.castle').length!==state.castles.length)throw Error('Missing castles');
 for(const c of state.castles){
 if(!document.querySelector(`#building${c.id} .epoch-${epoch}`))throw Error('Missing epoch model');
 if(document.getElementById('castle'+c.id).getAttribute('transform')!==`translate(${c.x} ${c.y})`)throw Error('Moved castle');
 if(document.querySelector(`#castle${c.id} .castle-hitbox`).getAttribute('r')!=='54')throw Error('Changed hitbox');
 if(!document.getElementById('def'+c.id).textContent)throw Error('Missing troops');
 }
 const safe=CrownMapStyle.clearance(state,{land:document.querySelector('#landclip path').getAttribute('d'),roads:document.querySelector('.strategic-roads').outerHTML});
 for(const p of document.querySelectorAll('.war-prop'))if(!safe(+p.dataset.x,+p.dataset.y,45))throw Error('Prop encroached on route/castle');
 if(getComputedStyle(document.querySelector('.strategic-roads > path:not(.road-bed)')).stroke!==(epoch==='20th'?'rgb(143, 150, 146)':'rgb(170, 160, 138)'))throw Error('Road CSS missing');
 out.push({map,epoch,quality,width,initMs:ms,nodes:document.querySelectorAll('#map *').length,props:document.querySelectorAll('.war-prop').length});
 }
 state.epoch='18th';CrownView.setQuality('low');CrownView.init(state);CrownView.render(state,null,0);updateUI();document.getElementById('zoomReset').click();
 return out;
 },{map,width});results.push(...variations);
 await page.waitForTimeout(250);
 // Input goes through the same click handler as a player; target and dispatch remain separate.
 await page.locator('#castle2 .castle-hitbox').click({force:true});
 assert.equal(await page.evaluate(()=>targetId),2);
 await page.evaluate(()=>{if(!CrownEngine.dispatch(state,'blue',0,2,50))throw Error('Dispatch failed');CrownView.render(state,2,0);});
 await page.waitForTimeout(100);
 assert.ok(await page.locator('#movingArmies .army-count').count());
 await page.screenshot({path:`artifacts/map-style/after/${String(map).padStart(2,'0')}-${width===390?'mobile':'desktop'}-march.png`});
 const timings=await page.evaluate(async()=>{const times=[];let last=performance.now();for(let i=0;i<35;i++)await new Promise(resolve=>requestAnimationFrame(t=>{times.push(t-last);last=t;resolve()}));return times.slice(5).sort((a,b)=>a-b)});
 results.push({map,width,frameMedianMs:timings[15],frameP95Ms:timings[28]});
 await page.locator('#zoomIn').click();await page.waitForTimeout(200);
 await page.screenshot({path:`artifacts/map-style/after/${String(map).padStart(2,'0')}-${width===390?'mobile':'desktop'}-zoom.png`});
 await page.locator('#zoomReset').click();
 await page.evaluate(()=>{
 const enemy=state.castles.find(c=>c.owner==='red');
 const rival=CrownEngine.dispatch(state,'red',enemy.id,0,50);
 if(!rival)throw Error('Enemy dispatch failed');
 CrownEngine.engageBattle(state,[state.armies[0],rival]);
 CrownView.render(state,2,0);
 if(!document.querySelector('#roadBattles .battle-composition'))throw Error('Battle composition missing');
 for(const weather of ['rain','snow','storm','fog','clear']){state.weather.type=weather;CrownView.render(state,2,0);}
 });
 await page.screenshot({path:`artifacts/map-style/after/${String(map).padStart(2,'0')}-${width===390?'mobile':'desktop'}-battle.png`});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 console.log(`PASS map ${map} at ${width}: 4 epochs × 3 quality presets, selection, dispatch, movement, zoom, clearance`);
 }
 await page.close();
 }
 assert.deepEqual(errors,[]);
 }finally{fs.writeFileSync('artifacts/map-style/validation.json',JSON.stringify({results,errors},null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
