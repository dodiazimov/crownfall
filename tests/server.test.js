'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const net=require('node:net');
const {spawn}=require('node:child_process');
const {mkdtempSync,rmSync}=require('node:fs');
const {tmpdir}=require('node:os');
const path=require('node:path');
const {once}=require('node:events');
const M=require('../multiplayer.js');
const E=require('../dist/engine.js');
function room(count=2){const r={code:'TEST',seed:42,maxPlayers:count,mapIndex:0,botDifficulty:'normal',randomCastles:false,slots:Object.fromEntries(E.PLAYER_KEYS.map(role=>[role,{role,username:role,isBot:false}]))};M.start(r);return r}
test('room commands validate ownership, resources, reserved troops and atomic group orders',()=>{
 const r=room();assert.equal(M.command(r,'blue',{type:'dispatch',fromId:1,toId:2,count:10}),false);
 for(const count of [0,-1,1.5,421,Infinity])assert.equal(M.command(r,'blue',{type:'dispatch',fromId:0,toId:2,count}),false);
 assert.equal(M.command(r,'blue',{type:'coordinate',targetId:2,entries:[{source:0,count:10},{source:1,count:10}]}),false);
 assert.equal(r.state.castles[0].troops,420);assert.equal(r.state.orders.length,0);
 assert.equal(M.command(r,'blue',{type:'tactics',castleId:0,reserve:410}),true);
 assert.equal(M.command(r,'blue',{type:'dispatch',fromId:0,toId:2,count:11}),false);
 assert.equal(M.command(r,'blue',{type:'dispatch',fromId:0,toId:2,count:10}),true);
 assert.equal(M.command(r,'blue',{type:'upgrade',castleId:0,specialty:'economy'}),true);
 assert.equal(M.command(r,'blue',{type:'upgrade',castleId:0}),false);
 assert.equal(r.state.players.blue.gold,100);
 assert.equal(M.command(r,'blue',{type:'specialize',castleId:0,specialty:'military'}),true);
 assert.equal(r.state.castles[0].specialty,'military');
 assert.equal(r.state.players.blue.gold,50);
 assert.equal(M.command(r,'red',{type:'sync_state',state:E.create()}),false);
});
test('room clock owns production and fills empty seats with bots',()=>{const r=room(4);assert.equal(r.state.mapIndex,7);r.slots.green.username=null;M.start(r);assert.ok(r.state.botPlayers.includes('green'));const before=r.state.players.blue.gold;M.tick(r,r.lastTick+100);assert.ok(r.state.players.blue.gold>before);assert.equal(r.revision,1);assert.ok(E.deserialize(JSON.stringify(M.snapshot(r).state)))});
test('disconnect grace expires into forfeit in duels and AI in larger matches',()=>{for(const count of [2,3]){const r=room(count);r.slots.red.reconnectUntil=r.lastTick+100;M.tick(r,r.lastTick+101);if(count===2){assert.equal(r.state.result,'blue');assert.equal(r.status,'ended')}else{assert.ok(r.state.botPlayers.includes('red'));assert.equal(r.status,'playing')}}});

// A small real TCP/WebSocket client keeps integration tests dependency-free.
async function connect(port){
 const socket=net.connect(port,'127.0.0.1');await once(socket,'connect');
 let buffer=Buffer.alloc(0),upgraded=false;const messages=[],waiters=[];
 const client={socket,send(msg){const data=Buffer.from(JSON.stringify(msg)),mask=Buffer.from([1,2,3,4]);const header=Buffer.alloc(data.length<126?2:4);header[0]=0x81;header[1]=0x80|(data.length<126?data.length:126);if(data.length>=126)header.writeUInt16BE(data.length,2);const masked=Buffer.from(data);for(let i=0;i<data.length;i++)masked[i]^=mask[i%4];socket.write(Buffer.concat([header,mask,masked]));},wait(type,predicate=()=>true){const existing=messages.find(m=>m.type===type&&predicate(m));if(existing)return Promise.resolve(existing);return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Timed out waiting for '+type)),5000);waiters.push({type,predicate,resolve:m=>{clearTimeout(timer);resolve(m)}})})}};
 socket.on('data',chunk=>{buffer=Buffer.concat([buffer,chunk]);if(!upgraded){const end=buffer.indexOf('\r\n\r\n');if(end<0)return;assert.match(buffer.subarray(0,end).toString(),/101/);buffer=buffer.subarray(end+4);upgraded=true;}while(buffer.length>=2){const opcode=buffer[0]&15;let length=buffer[1]&127,offset=2;if(length===126){if(buffer.length<4)return;length=buffer.readUInt16BE(2);offset=4}else if(length===127){if(buffer.length<10)return;length=Number(buffer.readBigUInt64BE(2));offset=10}if(buffer.length<offset+length)return;const data=buffer.subarray(offset,offset+length);buffer=buffer.subarray(offset+length);if(opcode!==1)continue;const msg=JSON.parse(data.toString());messages.push(msg);for(let i=waiters.length-1;i>=0;i--){const w=waiters[i];if(msg.type===w.type&&w.predicate(msg)){waiters.splice(i,1);w.resolve(msg)}}}});
 socket.write('GET /ws HTTP/1.1\r\nHost: localhost\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Version: 13\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n\r\n');
 return client;
}
test('real server synchronizes clients, rejects forged state, protects seats and restores reconnects',{timeout:15000},async()=>{
 const data=mkdtempSync(path.join(tmpdir(),'crownfall-test-'));
 const child=spawn(process.execPath,['server.js'],{cwd:path.join(__dirname,'..'),env:{...process.env,HOST:'127.0.0.1',PORT:'0',CROWNFALL_DATA_DIR:data},stdio:['ignore','pipe','pipe']});
 const clients=[];child.stderr.on('data',d=>process.stderr.write(d));
 try{
 const port=await new Promise((resolve,reject)=>{let log='';const timer=setTimeout(()=>reject(new Error('Server startup timed out: '+log)),5000);child.stdout.on('data',d=>{log+=d;const m=log.match(/Local URL:\s+http:\/\/localhost:(\d+)/);if(m){clearTimeout(timer);resolve(Number(m[1]))}});child.on('error',reject)});
 const a=await connect(port),b=await connect(port);clients.push(a,b);
 a.send({type:'create_room',username:'<img src=x onerror=boom()>',maxPlayers:2,mapIndex:7,randomCastles:false});const created=await a.wait('room_created');assert.equal(created.room.mapIndex,0);assert.ok(created.room.host.username.length<=20);assert.doesNotMatch(created.room.host.username,/[<>]/);
 a.send({type:'add_bot',role:'red'});const added=await a.wait('room_updated',m=>m.room.players.some(p=>p.role==='red'&&p.isBot));assert.ok(added.room.players.find(p=>p.role==='red').isBot);
 a.send({type:'remove_bot',role:'red'});await a.wait('room_updated',m=>!m.room.players.some(p=>p.role==='red'&&p.username));
 a.send({type:'select_hero',hero:'vanguard'});await a.wait('room_updated',m=>m.room.players.some(p=>p.role==='blue'&&p.hero==='vanguard'));
 b.send({type:'join_room',roomCode:created.roomCode,username:'Guest'});const joined=await b.wait('room_joined');assert.ok(joined.reconnectToken);assert.equal(joined.room.players[1].reconnectToken,undefined);
 a.send({type:'start_match'});const started=await a.wait('match_started');await b.wait('match_started');assert.equal(started.state.armies.length,0);
 b.send({type:'dispatch',fromId:0,toId:2,count:10});await b.wait('command_rejected');
 a.send({type:'dispatch',fromId:0,toId:2,count:100});const aa=await a.wait('state_snapshot',m=>m.state.armies.some(x=>x.count===100));const bb=await b.wait('state_snapshot',m=>m.revision===aa.revision);assert.deepEqual(aa.state,bb.state);
 a.send({type:'select_hero',hero:'fortifier'});
 a.send({type:'coordinate',targetId:15,entries:[{source:0,count:20}]});const personal=await a.wait('state_snapshot',m=>m.state.orders.some(o=>o.owner==='blue'));const opponent=await b.wait('state_snapshot',m=>m.revision===personal.revision);assert.equal(opponent.state.orders.length,0);assert.equal(opponent.state.players.blue.hero,'vanguard');
 a.send({type:'sync_state',castles:[{id:0,owner:'red',troops:999999}]});a.send({type:'match_ended',winner:'red'});
 const later=await b.wait('state_snapshot',m=>m.revision>aa.revision);assert.equal(later.state.castles[0].owner,'blue');assert.equal(later.state.result,null);
 a.send({type:'upgrade',castleId:0,specialty:'economy'});const upgraded=await b.wait('state_snapshot',m=>m.state.castles[0].level===2);assert.ok(upgraded.state.players.blue.gold<110);
 b.socket.destroy();await a.wait('player_disconnected');
 const impostor=await connect(port);clients.push(impostor);impostor.send({type:'join_room',roomCode:created.roomCode,username:'Guest'});await impostor.wait('error');
 const c=await connect(port);clients.push(c);c.send({type:'join_room',roomCode:created.roomCode,username:'Renamed',reconnectToken:joined.reconnectToken});const rejoined=await c.wait('room_rejoined');assert.equal(rejoined.role,'red');assert.equal(rejoined.state.castles[0].level,2);assert.ok(rejoined.state.armies.length);assert.ok(rejoined.revision>=upgraded.revision);
 c.send({type:'leave_match'});const ended=await a.wait('state_snapshot',m=>m.state.result);assert.equal(ended.state.result,'blue');assert.equal(ended.state.resultReason,'forfeit');
 a.send({type:'rematch'});const rematched=await a.wait('match_started',m=>m.state.matchId!==started.state.matchId);assert.ok(rematched.state);assert.equal(rematched.state.time,0);assert.ok(rematched.state.botPlayers.includes('red'));
 const q1=await connect(port),q2=await connect(port);clients.push(q1,q2);q1.send({type:'quick_match',username:'Queue A'});await q1.wait('queue_waiting');q2.send({type:'quick_match',username:'Queue B'});const qm1=await q1.wait('match_started'),qm2=await q2.wait('match_started');assert.equal(qm1.state.matchId,qm2.state.matchId);assert.deepEqual(qm1.state.botPlayers,[]);
 }finally{for(const c of clients)c.socket.destroy();child.kill();await once(child,'exit');rmSync(data,{recursive:true,force:true})}
});
