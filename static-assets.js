'use strict';
const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');
const {promisify}=require('node:util');
const gzip=promisify(zlib.gzip),brotli=promisify(zlib.brotliCompress);
const compressible=new Set(['.html','.js','.mjs','.css','.json','.svg','.txt']);

function encodingQuality(header){
 const entries=new Map();
 for(const part of String(header||'').toLowerCase().split(',')){
  const [name,...params]=part.trim().split(';');if(!name)continue;
  const parameter=params.find(p=>p.trim().startsWith('q='));
  const q=parameter===undefined?1:Number(parameter.trim().slice(2));
  entries.set(name,Number.isFinite(q)&&q>=0&&q<=1?q:0);
 }
 return name=>entries.has(name)?entries.get(name):name==='identity'?(entries.get('*')===0?0:1):(entries.get('*')||0);
}

// Only small text representations are retained. Large image responses are streamed.
function createStaticAssets(mimeTypes,{maxBytes=8*1024*1024,maxEntries=64,maxFileBytes=1024*1024}={}){
 const cache=new Map(),pending=new Map();let cachedBytes=0;
 function remember(key,value){
  if(value.content.length>maxBytes)return;
  cache.set(key,value);cachedBytes+=value.content.length;
  while(cachedBytes>maxBytes||cache.size>maxEntries){const oldest=cache.keys().next().value;cachedBytes-=cache.get(oldest).content.length;cache.delete(oldest);}
 }
 async function representation(file,stat,encoding){
  const key=`${file}:${stat.mtimeMs}:${stat.ctimeMs}:${stat.size}:${encoding}`;
  if(cache.has(key)){const value=cache.get(key);cache.delete(key);cache.set(key,value);return value;}
  if(pending.has(key))return pending.get(key);
  const task=(async()=>{
   let content;
   const packed=encoding==='br'?file+'.br':encoding==='gzip'?file+'.gz':null;
   if(packed){try{const metadata=await fs.promises.stat(packed);if(metadata.mtimeMs>=stat.mtimeMs)content=await fs.promises.readFile(packed);}catch(error){if(error.code!=='ENOENT')throw error;}}
   if(!content){const raw=await fs.promises.readFile(file);content=encoding==='br'?await brotli(raw,{params:{[zlib.constants.BROTLI_PARAM_QUALITY]:5}}):encoding==='gzip'?await gzip(raw,{level:6}):raw;}
   const value={content};remember(key,value);return value;
  })();
  pending.set(key,task);
  try{return await task;}finally{pending.delete(key);}
 }
 async function serve(req,res,file,search=''){
  try{
   const stat=await fs.promises.stat(file),ext=path.extname(file).toLowerCase();
   const canCompress=compressible.has(ext)&&stat.size>256;
   const quality=encodingQuality(req.headers['accept-encoding']);
   const supported=canCompress?['br','gzip','identity']:['identity'];
   const encoding=supported.reduce((best,name)=>quality(name)>quality(best)?name:best,supported[0]);
   if(quality(encoding)===0){res.writeHead(406,{'Vary':'Accept-Encoding'});res.end();return;}
   const versioned=Boolean(new URLSearchParams(search).get('v'))||/[.-][a-f0-9]{8,}\.[^.]+$/i.test(file);
   const etag=`W/"${stat.size.toString(16)}-${stat.mtimeMs.toString(16)}-${stat.ctimeMs.toString(16)}-${encoding}"`;
   const headers={'Content-Type':mimeTypes[ext]||'application/octet-stream','Cache-Control':ext!=='.html'&&versioned?'public, max-age=31536000, immutable':'public, max-age=0, must-revalidate','Vary':'Accept-Encoding','ETag':etag};
   if(encoding!=='identity')headers['Content-Encoding']=encoding;
   if(String(req.headers['if-none-match']||'').split(',').some(tag=>tag.trim()===etag||tag.trim()==='*')){res.writeHead(304,headers);res.end();return;}
   if(canCompress&&stat.size<=maxFileBytes){
    const {content}=await representation(file,stat,encoding);headers['Content-Length']=content.length;
    res.writeHead(200,headers);res.end(req.method==='HEAD'?undefined:content);
   }else if(encoding==='identity'){
    headers['Content-Length']=stat.size;res.writeHead(200,headers);
    if(req.method==='HEAD'){res.end();return;}
    const stream=fs.createReadStream(file);stream.on('error',error=>res.destroy(error));res.on('close',()=>stream.destroy());stream.pipe(res);
   }else{
    const stream=fs.createReadStream(file),compressor=encoding==='br'?zlib.createBrotliCompress({params:{[zlib.constants.BROTLI_PARAM_QUALITY]:5}}):zlib.createGzip({level:6});
    res.writeHead(200,headers);if(req.method==='HEAD'){stream.destroy();compressor.destroy();res.end();return;}
    stream.on('error',error=>res.destroy(error));compressor.on('error',error=>res.destroy(error));res.on('close',()=>{stream.destroy();compressor.destroy();});stream.pipe(compressor).pipe(res);
   }
  }catch(error){if(!res.headersSent){res.writeHead(error.code==='ENOENT'?404:500,{'Content-Type':'text/plain; charset=utf-8'});res.end('File unavailable');}else res.destroy(error);}
 }
 return {serve,stats:()=>({entries:cache.size,bytes:cachedBytes,pending:pending.size})};
}
module.exports={createStaticAssets,encodingQuality};
