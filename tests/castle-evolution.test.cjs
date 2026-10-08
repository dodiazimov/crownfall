const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const E=require('../dist/engine.js');
const out='artifacts/castle-evolution';fs.mkdirSync(out,{recursive:true});
const report={};
// Real simulation commands, finite economy, save round-trips and hard cap in every era.
for(const era of Object.keys(E.EPOCHS))for(const type of Object.keys(E.TYPES)){
 const s=E.create(1234,'balanced','normal',0,false,null,'crown_control',null,false,era);
 s.castles[0].type=type;s.players.blue.gold=10000;
 const troops=s.castles[0].troops,other=JSON.stringify(s.castles.slice(1));
 for(let level=2;level<=5;level++){
  assert.ok(E.upgrade(s,'blue',0,'balanced'));
  assert.equal(s.epoch,era);assert.equal(s.castles[0].level,level);
  const income=E.incomeFor(s.castles[0]);assert.ok(Number.isFinite(income.gold)&&Number.isFinite(income.troops));
  assert.ok(E.deserialize(E.serialize(s)),'High-level save rejected');
 }
 assert.equal(s.castles[0].troops,troops);assert.equal(JSON.stringify(s.castles.slice(1)),other);
 assert.equal(s.players.blue.gold,8630);assert.equal(E.upgrade(s,'blue',0),false);assert.equal(s.epoch,era);
}
const M=require('../multiplayer.js');
const room={code:'VISUAL',seed:42,maxPlayers:2,mapIndex:0,botDifficulty:'normal',randomCastles:false,slots:Object.fromEntries(E.PLAYER_KEYS.map(role=>[role,{role,username:role,isBot:false}]))};
M.start(room);room.state.players.blue.gold=10000;const roomEra=room.state.epoch;
for(let rank=2;rank<=5;rank++)assert.equal(M.command(room,'blue',{type:'upgrade',castleId:0,specialty:'balanced'}),true);
assert.equal(M.command(room,'blue',{type:'upgrade',castleId:0}),false);assert.equal(room.state.epoch,roomEra);assert.ok(E.deserialize(JSON.stringify(M.snapshot(room).state)));
report.multiplayer={maxLevel:5,eraPreserved:true,snapshotValid:true};
report.engine={eraRoleUpgradeSequences:32,maxLevel:5};
(async()=>{const browser=await chromium.launch({args:['--no-sandbox']});const errors=[];try{
 const p=await browser.newPage({viewport:{width:1440,height:1000}});p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>localStorage.setItem('crownfall-tour','done'));await p.goto(process.env.CROWNFALL_URL || 'http://localhost:4173');
 await p.evaluate(()=>{CrownI18n.setLanguage('en');enterGameMode();matchActive=false;document.getElementById('coach').classList.add('hidden');});
 report.matrix=await p.evaluate(()=>{
  const check=(v,m)=>{if(!v)throw Error(m)};let nodes=0,upgrades=0;
  check(Object.keys(CrownStructureVisuals.registry).length===160,'Incomplete registry');
  for(let map=0;map<E.MAPS.length;map++)for(const era of Object.keys(E.EPOCHS)){
   state=E.create(1234,'balanced','normal',map,false,null,'crown_control',null,false,era);state.aiDisabled=true;state.players.blue.gold=1000000;
   for(const c of state.castles)c.owner='blue';V.init(state);V.render(state,null,0);
   const previous=new Map();
   for(let level=1;level<=5;level++){
    if(level>1)for(const c of state.castles){check(E.upgrade(state,'blue',c.id,'balanced'),'Upgrade failed');upgrades++;}
    const before=JSON.stringify(state);V.render(state,null,0);check(JSON.stringify(state)===before,'Rendering changed state');
    for(const c of state.castles){
     const el=document.querySelector('#castle'+c.id),img=el.querySelector('.evolved-structure');
     check(img.dataset.era===era&&+img.dataset.level===level,'Wrong era or level');check(state.epoch===era,'Upgrade changed era');
     const matrix=el.transform.baseVal.getItem(0).matrix;check(Math.abs(matrix.e-c.x)<.001&&Math.abs(matrix.f-c.y)<.001,'Node drift');
     const href=img.getAttribute('href');check(href!==previous.get(c.id),'Identical upgrade image');previous.set(c.id,href);
     const decoded=decodeURIComponent(href.split(',').slice(1).join(','));check(!decoded.includes('NaN'),'Invalid geometry');
     if(level>1)check(el.querySelector('.construction-feedback'),'Missing upgrade feedback');
     for(const attr of ['x','y','width','height'])check(img.getAttribute(attr)===el.querySelector('.castle-silhouette-hitbox').getAttribute(attr),'Hitbox drift');
     nodes++;
    }
   }
  }
  return {maps:E.MAPS.length,eras:4,levels:5,nodeChecks:nodes,realUpgrades:upgrades};
 });
 report.geometry=await p.evaluate(()=>{
  const host=document.createElement('div');document.body.append(host);let count=0;
  for(const era of Object.keys(E.EPOCHS))for(const role of Object.keys(E.TYPES)){
   let transform;
   for(let level=1;level<=5;level++){
    const holder=document.createElementNS('http://www.w3.org/2000/svg','svg');holder.innerHTML=CrownArmyArt.structure(role,'blue',level,era);
    const href=holder.firstChild.getAttribute('href');host.innerHTML=decodeURIComponent(href.slice(href.indexOf(',')+1));
    const svg=host.firstChild,g=svg.firstElementChild,b=g.getBBox(),m=g.transform.baseVal.consolidate().matrix,v=svg.viewBox.baseVal;
    const signature=g.getAttribute('transform');if(transform&&transform!==signature)throw Error('Upgrade transform drift');transform=signature;
    const top=b.y*m.d+m.f,bottom=(b.y+b.height)*m.d+m.f,left=b.x*m.a+m.e,right=(b.x+b.width)*m.a+m.e;
    if(top<v.y-.5||bottom>v.y+v.height+.5||left<v.x-.5||right>v.x+v.width+.5)throw Error('Clipped '+era+'/'+role+'/'+level+' '+JSON.stringify({top,bottom,left,right,v:[v.x,v.y,v.width,v.height]}));
    count++;
   }
  }
  host.remove();return {unclippedStages:count,fixedScaleAcrossLevels:true};
 });
 report.ui=await p.evaluate(()=>{
  state=E.create(1234);state.players.blue.gold=10000;state.aiDisabled=true;sourceId=0;targetId=null;V.init(state);V.render(state,null,0);updateUI();
  for(let level=2;level<=5;level++){
   const button=document.getElementById('upgradeBtn');if(button.disabled)throw Error('UI blocked rank '+level);button.click();
   if(state.castles[0].level!==level||state.epoch!=='18th')throw Error('UI wrong upgrade');
  }
  if(!document.getElementById('upgradeBtn').disabled)throw Error('UI allows rank six');
  return {purchasedLevels:[2,3,4,5],capDisabled:true,eraPreserved:true};
 });
 // Same framing and same node for each role's five actual in-game upgrades.
 for(const role of ['gold','troop','main']){
  for(let level=1;level<=5;level++){
   await p.evaluate(({role,level})=>{
    if(level===1){state=E.create(1234);state.aiDisabled=true;state.players.blue.gold=10000;V.init(state);}
    const c=state.castles.find(c=>c.type===role);c.owner='blue';if(level>1&&!E.upgrade(state,'blue',c.id,'balanced'))throw Error('Capture upgrade failed');
    sourceId=c.id;targetId=null;updateUI();V.render(state,null,c.id);MobileGame.animateCamera(c.x,c.y-25,4.5,0);
    document.getElementById('toast').style.visibility='hidden';document.getElementById('resumeNotice').style.visibility='hidden';
   },{role,level});
   if(role==='main'&&level===3){await p.waitForTimeout(150);await p.screenshot({path:`${out}/upgrade-feedback.png`});}
   await p.waitForTimeout(1150);await p.screenshot({path:`${out}/${role}-level-${level}.png`});
  }
 }
 // Complete era sets, using the exact production assets (no alternate showcase art).
 for(const era of Object.keys(E.EPOCHS)){
  const html=await p.evaluate(era=>`<html><body style="margin:0;background:#24332d;color:#e3d7b9;font:16px Georgia"><h1 style="margin:28px">CROWNFALL · ${era.slice(0,2)}TH CENTURY</h1><p style="margin:28px">Independent era set · Outpost → Reinforced outpost → Stronghold → Regional fortress → Elite fortress</p>${['gold','troop','cavalry','archer','main'].map(role=>`<div style="display:flex;align-items:center;border-top:1px solid #52604e;padding:12px"><h3 style="width:150px;margin:10px">${role.toUpperCase()}</h3>${[1,2,3,4,5].map(level=>{const a=CrownAnchors.structure(role,era);return `<div style="width:214px;text-align:center"><svg width="210" height="180" viewBox="-90 -108 180 145"><g>${CrownArmyArt.structure(role,'blue',level,era)}</g></svg><div>LEVEL ${level}</div></div>`;}).join('')}</div>`).join('')}</body></html>`,era);
  fs.writeFileSync(`${out}/${era}-progression.html`,html);
  const gallery=await browser.newPage({viewport:{width:1280,height:1320}});await gallery.setContent(html);await gallery.waitForTimeout(150);await gallery.screenshot({path:`${out}/${era}-progression.png`,fullPage:true});await gallery.close();
 }
 report.feedback=await p.evaluate(async()=>{
  state=E.create(1234);state.players.blue.gold=10000;V.init(state);V.render(state,null,0);E.upgrade(state,'blue',0);V.render(state,null,0);
  if(!document.querySelector('.construction-dust'))throw Error('Dust absent');
  await new Promise(r=>setTimeout(r,1250));if(document.querySelector('.construction-feedback,.construction-dust'))throw Error('Effects leaked');
  return {pulse:true,dust:true,cleanup:true};
 });
 await p.emulateMedia({reducedMotion:'reduce'});await p.reload();await p.evaluate(()=>{enterGameMode();matchActive=false;state=E.create(1234);state.players.blue.gold=10000;V.init(state);V.render(state,null,0);E.upgrade(state,'blue',0);V.render(state,null,0);if(document.querySelector('.construction-dust'))throw Error('Reduced motion dust');});
 report.reducedMotion=true;
 for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
  await p.setViewportSize({width,height});
  report[name]=await p.evaluate(async()=>{
   state=E.create(1234);state.aiDisabled=true;for(const c of state.castles)c.level=5;V.init(state);V.render(state,null,0);MobileGame.animateCamera(1100,750,1,0);
   await new Promise(r=>setTimeout(r,200));const samples=[],frames=[];let last=performance.now();const size=CrownArmyArt.cacheSize();
   for(let i=0;i<90;i++){await new Promise(requestAnimationFrame);const t=performance.now();frames.push(t-last);last=t;V.render(state,null,0);samples.push(performance.now()-t);}
   if(CrownArmyArt.cacheSize()!==size)throw Error('Unchanged frames grew cache');samples.sort((a,b)=>a-b);frames.sort((a,b)=>a-b);
   return {castles:state.castles.length,level:5,renderP95Ms:samples[85],frameMedianMs:frames[45],frameP95Ms:frames[85],cacheStable:true};
  });await p.screenshot({path:`${out}/${name}-all-level-5.png`});
 }
 assert.deepEqual(errors,[]);report.browserErrors=errors;fs.writeFileSync(`${out}/validation.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
