'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const base=new URL(process.env.CROWNFALL_URL||'http://127.0.0.1:4175');
const agent=new http.Agent({keepAlive:true,maxSockets:16});
const samples=[];
function request(){return new Promise((resolve,reject)=>{
 const start=performance.now();const req=http.get(new URL('/app.js?v=benchmark',base),{agent,headers:{'Accept-Encoding':'br,gzip'}},res=>{let bytes=0;res.on('data',d=>bytes+=d.length);res.on('end',()=>{samples.push(performance.now()-start);resolve(bytes);});});req.on('error',reject);
});}
(async()=>{
 try{
  const start=performance.now();let bytes=0;
  for(let batch=0;batch<16;batch++)bytes+=(await Promise.all(Array.from({length:16},request))).reduce((a,b)=>a+b,0);
  samples.sort((a,b)=>a-b);const result={node:process.version,requests:256,concurrency:16,elapsedMs:performance.now()-start,requestMedianMs:samples[128],requestP95Ms:samples[243],totalEncodedBytes:bytes};
  const out=process.argv[2]||'artifacts/web-optimization/static.json';fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }finally{agent.destroy();}
})().catch(e=>{console.error(e);process.exitCode=1;});
