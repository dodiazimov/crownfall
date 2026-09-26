const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const out='artifacts/army-overhaul';fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({args:['--no-sandbox']});const errors=[],results={};try{
 const p=await browser.newPage({viewport:{width:1440,height:1000}});p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>localStorage.setItem('crownfall-tour','done'));await p.goto('http://localhost:4173');
 await p.evaluate(()=>{CrownI18n.setLanguage('en');enterGameMode();matchActive=false;document.getElementById('coach').classList.add('hidden');});
 results.matrix=await p.evaluate(()=>{let checks=0;for(let map=0;map<E.MAPS.length;map++)for(const era of Object.keys(E.EPOCHS)){
 state=E.create(1234,'balanced','normal',map,false,null,'crown_control',null,false,era);state.paused=true;sourceId=0;targetId=null;
 const before=JSON.stringify(state);V.init(state);V.render(state,null,0);if(before!==JSON.stringify(state))throw Error('Render changed state');
 for(const c of state.castles){const node=document.querySelector('#castle'+c.id),img=node.querySelector('.evolved-structure');if(!img||img.dataset.era!==era)throw Error('Missing era');const original=[c.x,c.y];const hrefs=[];for(let level=1;level<=3;level++)hrefs.push(CrownArmyArt.structure(c.type,c.owner,level,era));if(new Set(hrefs).size!==3)throw Error('Static upgrade');if(Math.abs(node.transform.baseVal.getItem(0).matrix.e-original[0])>.001)throw Error('Anchor changed');checks++;}
 }return {maps:E.MAPS.length,eras:Object.keys(E.EPOCHS).length,structures:checks};});
 results.behavior=await p.evaluate(()=>{
 const check=(v,m)=>{if(!v)throw Error(m)};state=E.create(1234);state.paused=false;sourceId=0;targetId=null;V.init(state);MobileGame.animateCamera(1100,750,1,0);
 const a=E.dispatch(state,'blue',0,1,32);a.t=a.duration*.3;V.render(state,null,0);const get=()=>document.querySelector(`[data-army-id="${a.id}"]`);const before=get().querySelectorAll('.marcher').length;
 a.count=17;a.units={soldier:17};V.render(state,null,0);const after=get().querySelectorAll('.marcher').length;check(after<before,'Survivor formation did not shrink');check(get().querySelector('.army-count').textContent==='17','Count stale');
 const identity=JSON.stringify(state);V.render(state,null,0);check(identity===JSON.stringify(state),'Render mutated battle');
 MobileGame.animateCamera(0,0,5,0);V.render(state,null,0);check(get().style.display==='none','Offscreen group not culled');
 state.players.blue.gold=10000;check(E.upgrade(state,'blue',0,'military'),'Upgrade failed');V.render(state,null,0);check(document.querySelector('#building0 .evolved-structure').dataset.level==='2','Upgrade art stale');check(document.querySelector('.construction-feedback'),'No construction feedback');
 return {before,after,renderPure:true,culling:true,upgrade:true};
 });
 for(const era of ['17th','18th','19th','20th']){
  await p.evaluate(era=>{state=E.create(1234,'balanced','normal',0,false,null,'crown_control',null,false,era);state.paused=false;state.aiDisabled=true;sourceId=0;targetId=null;V.init(state);updateUI();state.castles[0].level=3;const a=E.dispatch(state,'blue',0,1,90);a.units={soldier:30,archer:20,knight:20,cavalry:20};a.t=a.duration*.12;state.time=2;const pos=E.position(a);MobileGame.animateCamera(pos.x,pos.y,3,0);V.render(state,null,0);},era);
  await p.waitForTimeout(500);await p.screenshot({path:`${out}/moving-${era}.png`});
 }
 await p.evaluate(()=>{const a=state.armies[0];a.count=32;a.units={soldier:24,knight:8};const b=E.dispatch(state,'red',1,0,15);b.units={soldier:15};b.t=b.duration-a.t;E.engageBattle(state,[a,b]);const fight=state.battles[0];MobileGame.animateCamera(fight.x,fight.y,4,0);V.render(state,null,null);});
 await p.waitForTimeout(300);await p.screenshot({path:`out-placeholder` .replace('out-placeholder',`${out}/battle-clash.png`)});
 results.combat=await p.evaluate(()=>{let ticks=0;while(state.battles.length&&ticks++<3000)E.tickBattles(state,.05);V.render(state,null,null);return{ticks,remaining:state.armies.map(a=>a.count),battles:state.battles.length};});
 assert.equal(results.combat.battles,0);assert.ok(results.combat.remaining.every(n=>n<32));
 await p.waitForTimeout(200);await p.screenshot({path:`${out}/battle-survivors.png`});
 for(const type of ['gold','troop','main'])for(let level=1;level<=3;level++){
  await p.evaluate(({type,level})=>{if(level===1){state=E.create(1234);state.paused=true;V.init(state);state.players.blue.gold=10000;}const c=state.castles.find(c=>c.type===type);c.owner='blue';if(level>1)E.upgrade(state,'blue',c.id,'balanced');sourceId=c.id;updateUI();MobileGame.animateCamera(c.x,c.y-25,4.5,0);V.render(state,null,c.id);},{type,level});
  await p.waitForTimeout(350);await p.screenshot({path:`${out}/upgrade-${type}-${level}.png`});
 }
 const gallery=await p.evaluate(()=>{const roles=['gold','troop','cavalry','archer','main'];return `<html><body style="margin:0;background:#111c22;color:#dfd6bc;font:16px Georgia"><h1 style="margin:28px">CROWNFALL · FORTIFICATION STUDIES</h1><p style="margin:28px;color:#9caaac">Economy / Barracks / Cavalry / Watch / Capital — Levels I, II, III</p>${Object.keys(CrownArmyArt.themes).map(era=>`<section style="padding:20px;border-top:1px solid #42504e"><h2>${era} century</h2><div style="display:flex">${roles.map(type=>`<div style="width:250px"><h3>${type.toUpperCase()}</h3><svg width="250" height="380" viewBox="-100 -100 200 320">${[1,2,3].map((level,i)=>`<g transform="translate(0 ${i*105})">${CrownArmyArt.structure(type,'blue',level,era)}<text x="-87" y="0" fill="#d1c49e" font-size="12">${level}</text></g>`).join('')}</svg></div>`).join('')}</div></section>`).join('')}</body></html>`;});
 fs.writeFileSync(`${out}/structure-studies.html`,gallery);const g=await browser.newPage({viewport:{width:1320,height:900}});await g.setContent(gallery);await g.waitForTimeout(500);await g.screenshot({path:`${out}/structure-studies.png`,fullPage:true});await g.close();
 const unitGallery=await p.evaluate(()=>`<body style="margin:0;background:#17242b;color:#dfd6bc;font:18px Georgia"><h1 style="padding:24px">CROWNFALL · ARMY STUDIES</h1>${Object.keys(CrownArmyArt.themes).map(era=>`<h2 style="padding-left:24px">${era} century</h2><svg width="1200" height="190" viewBox="0 0 600 95">${['soldier','archer','knight','cavalry','elite'].map((type,i)=>`<g transform="translate(${60+i*116} 55) scale(1.4)">${CrownArmyArt.figure(type,'#559aca',era)}<text y="22" text-anchor="middle" fill="#bfbca8" font-size="8">${type}</text></g>`).join('')}</svg>`).join('')}</body>`);
 const u=await browser.newPage({viewport:{width:1200,height:1280}});await u.setContent(unitGallery);await u.screenshot({path:`${out}/unit-studies.png`,fullPage:true});await u.close();
 // Profile the shipped render path after warmup at a dense visible battlefield.
 for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
 await p.setViewportSize({width,height});
 results[name]=await p.evaluate(async()=>{state=E.create(1234);state.paused=false;V.init(state);MobileGame.animateCamera(1100,750,1,0);state.armies=[];for(let i=0;i<100;i++){const a={id:100+i,owner:i%2?'red':'blue',count:64,units:{soldier:32,cavalry:32},source:0,target:1,path:[{x:500+i%10*120,y:350+Math.floor(i/10)*75},{x:620+i%10*120,y:350+Math.floor(i/10)*75}],x:500+i%10*120,y:350+Math.floor(i/10)*75,tx:620+i%10*120,ty:350+Math.floor(i/10)*75,t:.5,duration:10,revision:1,intercept:null};state.armies.push(a);}for(let i=0;i<20;i++){state.time+=.016;V.render(state,null,null);}await new Promise(r=>setTimeout(r,300));const samples=[],intervals=[];let last=performance.now();for(let i=0;i<90;i++){await new Promise(requestAnimationFrame);const start=performance.now();intervals.push(start-last);last=start;state.time+=.016;V.render(state,null,null);samples.push(performance.now()-start);}samples.sort((a,b)=>a-b);intervals.sort((a,b)=>a-b);return{armies:100,visible:document.querySelectorAll('.army-token:not([style*="display: none"])').length,sprites:document.querySelectorAll('.marcher').length,renderMedianMs:samples[45],renderP95Ms:samples[85],frameMedianMs:intervals[45],frameP95Ms:intervals[85]};});
 await p.screenshot({path:`${out}/stress-${name}.png`});
 }
 assert.deepEqual(errors,[]);results.errors=errors;fs.writeFileSync(`${out}/validation.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
