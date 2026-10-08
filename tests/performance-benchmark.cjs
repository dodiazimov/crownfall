'use strict';
// Repeatable visual benchmark: freezes the app scheduler and measures the real renderer.
// This deliberately does not equate headless rAF intervals with physical-device FPS.
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const base=process.env.CROWNFALL_URL||'http://127.0.0.1:4175';
const output=process.argv[2]||'artifacts/web-optimization/render.json';
const percentile=(samples,p)=>[...samples].sort((a,b)=>a-b)[Math.min(samples.length-1,Math.floor(samples.length*p))];
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const result={environment:{node:process.version,browser:browser.version(),headless:true,seed:1234,map:0,epoch:'18th',samples:60,repeats:3},scenarios:[]};
 const errors=[];
 try{
  for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
   const page=await browser.newPage({viewport});page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{window.benchmarkRAF=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=()=>1;localStorage.setItem('crownfall-tour','done');});
   await page.goto(base);await page.evaluate(()=>{enterGameMode();matchActive=false;});
   const cases=viewport.width===390?[['low',100,false],['medium',100,false]]:
    ['low','medium','high'].flatMap(q=>[50,100,200].map(n=>[q,n,false])).concat([['low',100,true],['high',100,true]]);
   for(const [quality,count,battles] of cases){
    const runs=[];
    for(let repeat=0;repeat<3;repeat++){
     runs.push(await page.evaluate(async({quality,count,battles})=>{
      V.setQuality(quality);state=E.create(1234);state.aiDisabled=true;state.paused=false;state.progressiveCombat=true;sourceId=null;targetId=null;V.init(state);
      state.armies=Array.from({length:count},(_,i)=>{
       const x=250+i%20*85,y=260+Math.floor(i/20)*85;
       return{id:100+i,owner:i%2?'red':'blue',count:80,units:{soldier:40,archer:15,knight:15,cavalry:10},source:i%2?1:0,target:i%2?0:1,
        path:[{x,y},{x:x+150,y:y+12}],x,y,tx:x+150,ty:y+12,speed:90,length:Math.hypot(150,12),t:.4,duration:Math.hypot(150,12)/90,revision:1,intercept:null,returning:false};
      });
      if(battles)for(let i=0;i<20;i+=2)E.engageBattle(state,[state.armies[i],state.armies[i+1]]);
      state.effects=Array.from({length:8},(_,i)=>({x:300+i*200,y:750,text:'−40',owner:i%2?'red':'blue',life:1.4}));
      for(let i=0;i<12;i++){state.time+=.016;V.render(state,null,null);}
      await new Promise(r=>setTimeout(r,200));
      let mutations=0;const observer=new MutationObserver(records=>mutations+=records.length);
      observer.observe(document.getElementById('map'),{subtree:true,attributes:true,childList:true,characterData:true});
      const timings=[],intervals=[];let previous=performance.now();
      for(let i=0;i<60;i++){
       await new Promise(window.benchmarkRAF);const start=performance.now();intervals.push(start-previous);previous=start;
       state.time+=.016;for(const a of state.armies){if(!a.inBattle)a.t+=.001;else{a.count=80-i%10;a.units.soldier=40-i%10;}}
       for(const e of state.effects)e.life=1.4-i*.006;
       V.render(state,null,null);timings.push(performance.now()-start);
      }
      mutations+=observer.takeRecords().length;observer.disconnect();
      return{timings,intervals,mutations,domNodes:document.querySelectorAll('#map *').length,sprites:document.querySelectorAll('.marcher').length};
     },{quality,count,battles}));
    }
    const samples=runs.flatMap(r=>r.timings),intervals=runs.flatMap(r=>r.intervals);
    const scenario={viewport,quality,armies:count,battles,renderMedianMs:percentile(samples,.5),renderP95Ms:percentile(samples,.95),renderP99Ms:percentile(samples,.99),rafIntervalP95Ms:percentile(intervals,.95),mutationsPerRender:runs.reduce((n,r)=>n+r.mutations,0)/samples.length,sprites:runs[0].sprites,domNodes:runs[0].domNodes};
    result.scenarios.push(scenario);console.log(JSON.stringify(scenario));
   }
   await page.close();
  }
  if(errors.length)throw Error(errors.join('\n'));
  fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(result,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
