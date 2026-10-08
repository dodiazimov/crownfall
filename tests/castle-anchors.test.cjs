const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const out='artifacts/crownfall-mobile';fs.mkdirSync(`${out}/audit`,{recursive:true});
(async()=>{const b=await chromium.launch({args:['--no-sandbox']});const errors=[],results=[];try{
 const p=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 await p.addInitScript(()=>localStorage.setItem('crownfall-tour','done'));
 await p.emulateMedia({reducedMotion:'reduce'});await p.goto(process.env.CROWNFALL_URL || 'http://localhost:4173');
 await p.evaluate(()=>{CrownI18n.setLanguage('en');enterGameMode();matchActive=false;});
 await p.evaluate(()=>document.fonts.ready);
 for(let map=0;map<11;map++){
  const result=await p.evaluate(map=>{
   const check=(ok,msg)=>{if(!ok)throw Error(`Map ${map}: ${msg}`)};let checks=0;
   for(const epoch of ['17th','18th','19th','20th']){
    state=E.create(1234,'balanced','normal',map,false,null,'crown_control',null,false,epoch);state.paused=true;sourceId=0;targetId=1;
    const before=JSON.stringify(state);V.init(state);V.render(state,1,0);updateUI();
    check(JSON.stringify(state)===before,'presentation mutated simulation');
    for(const zoom of [.75,3.25,5]){
     MobileGame.animateCamera(1100,750,zoom,0);
     for(const c of state.castles){
      const el=document.getElementById(`castle${c.id}`),m=el.transform.baseVal.consolidate().matrix;
      check(Math.hypot(m.e-c.x,m.f-c.y)<.001,`${epoch}/${c.name} root moved from gameplay node`);
      const body=el.querySelector('.castle-silhouette-hitbox'),image=el.querySelector('.castle-sprite-img');
      for(const attr of ['x','y','width','height'])check(body.getAttribute(attr)===image.getAttribute(attr),`${c.name} visible body cannot be tapped`);
      check(el.querySelector('.castle-hitbox').getAttribute('cx')===null&&el.querySelector('.castle-hitbox').getAttribute('cy')===null,'hitbox center drift');
      check(el.querySelector('.ownership-ring').getAttribute('cx')===null,'ring center drift');
      const caption=el.querySelector('.castle-caption').transform.baseVal.getItem(0).matrix;
      check(caption.e===0&&caption.f>20&&caption.f<60,`${c.name} caption detached`);
      check(!el.querySelector('.castle-name').hasAttribute('transform'),'independently shifted name');
      const plate=getComputedStyle(el.querySelector('.troop-plate')),ring=getComputedStyle(el.querySelector('.ownership-ring'));
      check(+ring.opacity>=.5&&ring.stroke!=='none','ownership ring disappeared');
      check(plate.fill!== 'rgb(17, 30, 41)','generic CSS erased ownership plate');
      check(el.querySelector(`#def${c.id}`).getBoundingClientRect().height>=8,`${epoch}/${c.name}/${zoom}: unreadable troop count`);
      if(zoom===.75)check(getComputedStyle(el.querySelector('.castle-name')).display==='none','far names not decluttered');
      check(getComputedStyle(el.querySelector('.anchor-debug')).display==='none','debug visible in production');
      checks++;
     }
    }
    const connected=new Set();
    for(const path of document.querySelectorAll('.strategic-roads > path:not(.road-bed)')){
     const first=path.getPointAtLength(0),last=path.getPointAtLength(path.getTotalLength());
     for(const [id,point] of [[+path.dataset.source,first],[+path.dataset.target,last]]){
      const castle=state.castles[id],gate=document.querySelector(`#castle${id} .debug-gate`);
      const gx=castle.x+ +gate.getAttribute('cx'),gy=castle.y+ +gate.getAttribute('cy');
      check(Math.hypot(point.x*2-gx,point.y*2-gy)<.03,`${castle.name}: road misses gate`);connected.add(id);
     }
    }
    check(connected.size===state.castles.length,'castle missing road connection');
    const blue=document.querySelector('#castle0 .troop-plate'),red=document.querySelector('#castle1 .troop-plate');
    check(getComputedStyle(blue).fill!==getComputedStyle(red).fill,'faction plates indistinguishable');
    check(+getComputedStyle(document.querySelector('#castle0 .source-halo')).opacity>.8,'source ring hidden');
    check(+getComputedStyle(document.querySelector('#castle1 .target-halo')).opacity>.8,'target ring hidden');
    const neutral=state.castles.find(c=>!c.owner);neutral.owner='red';V.render(state,1,0);
    check(document.getElementById('castle'+neutral.id).dataset.owner==='red','capture did not update all cues');
   }
   return {map,castles:21,eras:4,zoomLevels:3,checks};
  },map);results.push(result);console.log('PASS map',map,':',result.checks,'structure/zoom checks; gate endpoints; ownership capture');
 }
 // Actual touch selection at the rendered roof and footprint, not forced DOM clicks.
 const named=[{map:0,id:0,name:'Azurehold'},{map:0,id:15,name:'The Violet Crown'},{map:0,id:9,name:'Eastwatch'},{map:0,id:6,name:'Greenwatch'},{map:9,id:6,name:'Normandy Stables'},{map:9,id:7,name:'Hungarian Plains'},{map:0,id:14,name:'Dragon Bastion',seed:2,random:true},{map:0,id:11,name:'Thorn Spire'},{map:0,id:1,name:'Crimson Keep'}];
 for(const fixture of named){
  await p.evaluate(f=>{state=E.create(f.seed||1234,'balanced','normal',f.map,!!f.random);state.paused=true;state.aiDisabled=true;sourceId=0;targetId=null;V.init(state);updateUI();V.render(state,null,0);document.getElementById('toast').style.visibility='hidden';document.getElementById('resumeNotice').style.visibility='hidden';},fixture);
  for(const z of [2.6,3.5,5]){
   const point=await p.evaluate(({id,z})=>{const c=state.castles[id];MobileGame.animateCamera(c.x,c.y,z,0);const el=document.querySelector(`#castle${id} .castle-silhouette-hitbox`),r=el.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height*.55};},{id:fixture.id,z});
   await p.touchscreen.tap(point.x,point.y);
   assert.equal(await p.evaluate(id=>state.castles[id].owner===myRole?sourceId:targetId,fixture.id),fixture.id,`tap missed ${fixture.name} at ${z}×`);
  }
  await p.screenshot({path:`${out}/audit/${fixture.name.replaceAll(' ','-')}.png`});
  console.log('PASS touch roof selection:',fixture.name,'at 3 zooms');
 }
 await p.evaluate(()=>{V.setAnchorDebug(true);MobileGame.animateCamera(state.castles[1].x,state.castles[1].y,5,0)});
 await p.screenshot({path:`${out}/audit/debug-anchors.png`});
 await p.evaluate(()=>V.setAnchorDebug(false));
 assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/anchor-audit.json`,JSON.stringify({results,named: named.map(n=>n.name),errors},null,2));
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
