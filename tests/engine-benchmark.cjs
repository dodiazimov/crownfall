'use strict';
globalThis.CrownRoadDefinitions=require('../dist/road-definitions.js');
const E=require(process.env.CROWNFALL_ENGINE||'../dist/engine.js');
const fs=require('node:fs');const path=require('node:path');
const out=process.argv[2]||'artifacts/web-optimization/engine.json';
const percentile=(a,p)=>[...a].sort((x,y)=>x-y)[Math.floor(a.length*p)];
const results=[];
for(const count of [10,50,100,200]){
 const timings=[];
 for(let repeat=0;repeat<3;repeat++){
  const s=E.create(1234);s.aiDisabled=true;s.progressiveCombat=true;
  s.armies=Array.from({length:count},(_,i)=>{const x=100+i%20*70,y=100+Math.floor(i/20)*70;return{id:100+i,owner:i%2?'red':'blue',count:80,units:{soldier:80},source:0,target:1,path:[{x,y},{x:x+1000,y}],x,y,tx:x+1000,ty:y,speed:85,length:1000,t:0,duration:1000/85,revision:1,intercept:null};});
  for(let i=0;i<100;i++){const start=performance.now();E.tick(s,.025);const ms=performance.now()-start;if(i>=20)timings.push(ms);}
 }
 results.push({armies:count,tickMedianMs:percentile(timings,.5),tickP95Ms:percentile(timings,.95),tickP99Ms:percentile(timings,.99)});
}
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify({node:process.version,seed:1234,map:0,aiDisabled:true,step:.025,repeats:3,scenarios:results},null,2));console.log(JSON.stringify(results));
