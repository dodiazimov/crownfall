'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),zlib=require('node:zlib');
const {createStaticAssets}=require('../static-assets.js');
async function fixture(options,run){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'crownfall-assets-'));
 const assets=createStaticAssets({'.js':'application/javascript','.png':'image/png','.html':'text/html'},options);
 const server=http.createServer((req,res)=>assets.serve(req,res,path.join(dir,new URL(req.url,'http://localhost').pathname),new URL(req.url,'http://localhost').search));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const request=(url,headers={},method='GET')=>new Promise((resolve,reject)=>{
  const req=http.request({host:'127.0.0.1',port:server.address().port,path:url,headers,method},res=>{const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks)}));});req.on('error',reject);req.end();
 });
 try{await run({dir,assets,request});}finally{await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true,force:true});}
}
test('concurrent encoded responses decode exactly and negotiate quality correctly',async()=>fixture({},async({dir,request,assets})=>{
 const source=Buffer.from('const greeting="Salom!";\n'.repeat(1000));fs.writeFileSync(path.join(dir,'app.js'),source);
 const responses=await Promise.all(Array.from({length:12},()=>request('/app.js?v=4',{'Accept-Encoding':'br,gzip'})));
 for(const r of responses){assert.equal(r.status,200);assert.equal(r.headers['content-encoding'],'br');assert.equal(Number(r.headers['content-length']),r.body.length);assert.deepEqual(zlib.brotliDecompressSync(r.body),source);assert.match(r.headers['cache-control'],/immutable/);assert.equal(r.headers.vary,'Accept-Encoding');}
 assert.equal(assets.stats().pending,0);assert.equal(assets.stats().entries,1);
 const gzip=await request('/app.js',{'Accept-Encoding':'br;q=0, gzip;q=1'});assert.equal(gzip.headers['content-encoding'],'gzip');assert.deepEqual(zlib.gunzipSync(gzip.body),source);
 const identity=await request('/app.js',{'Accept-Encoding':'br;q=0,gzip;q=0'});assert.equal(identity.headers['content-encoding'],undefined);assert.deepEqual(identity.body,source);
 const weighted=await request('/app.js',{'Accept-Encoding':'br;q=0.2,gzip;q=0.8,identity;q=0'});assert.equal(weighted.headers['content-encoding'],'gzip');
 assert.equal((await request('/app.js',{'Accept-Encoding':'*;q=0'})).status,406);
}));
test('cache revalidation and edited files never return stale content',async()=>fixture({},async({dir,request})=>{
 const file=path.join(dir,'app.js');fs.writeFileSync(file,'A'.repeat(400));
 const before=await request('/app.js',{'Accept-Encoding':'gzip'});assert.match(before.headers['cache-control'],/must-revalidate/);
 const unchanged=await request('/app.js',{'Accept-Encoding':'gzip','If-None-Match':before.headers.etag});assert.equal(unchanged.status,304);assert.equal(unchanged.body.length,0);
 fs.writeFileSync(file,'B'.repeat(401));
 const after=await request('/app.js',{'Accept-Encoding':'gzip','If-None-Match':before.headers.etag});assert.equal(after.status,200);assert.notEqual(after.headers.etag,before.headers.etag);assert.equal(zlib.gunzipSync(after.body).toString(),'B'.repeat(401));
 fs.writeFileSync(path.join(dir,'index.html'),'hello');assert.doesNotMatch((await request('/index.html?v=1')).headers['cache-control'],/immutable/);
}));
test('large files stream without being retained and representation cache stays bounded',async()=>fixture({maxEntries:2,maxBytes:600,maxFileBytes:800},async({dir,request,assets})=>{
 for(let i=0;i<5;i++){fs.writeFileSync(path.join(dir,`${i}.js`),'x'.repeat(300));assert.equal((await request(`/${i}.js`)).body.length,300);}
 assert.ok(assets.stats().entries<=2);assert.ok(assets.stats().bytes<=600);
 const big=Buffer.alloc(2000,42);fs.writeFileSync(path.join(dir,'large.png'),big);const before=assets.stats();
 assert.deepEqual((await request('/large.png')).body,big);assert.deepEqual(assets.stats(),before);
 fs.writeFileSync(path.join(dir,'large.js'),big);const compressed=await request('/large.js',{'Accept-Encoding':'gzip'});assert.deepEqual(zlib.gunzipSync(compressed.body),big);assert.deepEqual(assets.stats(),before);
 const head=await request('/large.png',{},'HEAD');assert.equal(head.body.length,0);assert.equal(Number(head.headers['content-length']),big.length);
 assert.equal((await request('/missing.js')).status,404);
}));
test('hashed asset URLs remain immutable and prepared encodings match the source',async()=>fixture({},async({dir,request})=>{
 const file=path.join(dir,'packed.0123456789ab.js'),source=Buffer.from('packed'.repeat(100));fs.writeFileSync(file,source);fs.writeFileSync(file+'.gz',zlib.gzipSync(source));
 const response=await request('/packed.0123456789ab.js',{'Accept-Encoding':'gzip'});assert.match(response.headers['cache-control'],/immutable/);assert.deepEqual(zlib.gunzipSync(response.body),source);
}));
