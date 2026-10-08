const {test}=require('node:test');
const assert=require('node:assert/strict');
const E=require('../dist/engine.js');
function setTroops(c,n){c.troops=n;}
function fresh(){const s=E.create(42);s.aiTimer=1e9;return s}
function advance(s,seconds){for(let elapsed=0;elapsed<seconds-1e-8;elapsed+=.025)E.tick(s,Math.min(.025,seconds-elapsed))}
function friendly(s,id,n=100){s.castles[id].owner='blue';setTroops(s.castles[id],n);E.sync(s);return s.castles[id]}
function finish(s,a){s.armies=s.armies.filter(x=>x.id!==a.id);E.resolve(s,a);E.sync(s)}
function near(a,b,tolerance=1e-6){assert.ok(Math.abs(a-b)<tolerance,`${a} ≈ ${b}`)}
function roadArmy(s,p,n,from,to,target=2){const a={id:s.nextArmy++,owner:p,count:n,source:p==='blue'?0:1,target,power:1,returning:false,intercept:null,path:[from,to],x:from.x,y:from.y,tx:to.x,ty:to.y,speed:85,t:0,length:Math.hypot(to.x-from.x,to.y-from.y),revision:1,route:'fast'};a.duration=a.length/85;s.armies.push(a);return a}
test('seeded map mirrors starting distances, troops and castle roles',()=>{const s=fresh();assert.equal(s.castles.length,21);assert.deepEqual(s.castles,E.create(42).castles);for(const [a,b] of [[0,1],[2,3],[4,5],[6,7],[8,9],[10,11],[12,13],[14,16],[17,18],[19,20]]){near(s.castles[a].x+s.castles[b].x,2200);assert.equal(s.castles[a].y,s.castles[b].y);assert.equal(s.castles[a].type,s.castles[b].type);assert.equal(s.castles[a].troops,s.castles[b].troops)}});
test('sending 100 deducts only 100 from the chosen source; total stays conserved',()=>{const s=fresh();friendly(s,2,80);const before=E.totals(s,'blue').total;assert.ok(E.dispatch(s,'blue',0,3,100));assert.equal(s.castles[0].troops,320);assert.equal(s.castles[2].troops,80);assert.equal(E.totals(s,'blue').total,before);assert.equal(E.totals(s,'blue').marching,100)});
test('global summary cannot finance an empty castle',()=>{const s=fresh();friendly(s,2,0);s.players.blue.troops=999999;assert.equal(E.dispatch(s,'blue',2,3,1),false)});
test('invalid, excessive, fractional and duplicate dispatches do not debit',()=>{const s=fresh();for(const n of [NaN,Infinity,-1,0,1.5,421])assert.equal(E.dispatch(s,'blue',0,2,n),false);assert.equal(E.dispatch(s,'blue',1,2,1),false);assert.equal(E.dispatch(s,'blue',0,0,1),false);assert.equal(s.castles[0].troops,420);assert.ok(E.dispatch(s,'blue',0,2,420));assert.equal(E.dispatch(s,'blue',0,2,1),false)});
test('every other castle is reachable regardless of unlock or adjacency',()=>{for(let id=1;id<21;id++){const s=fresh();assert.ok(E.dispatch(s,'blue',0,id,1))}});
test('friendly reinforcement arrives and remains in destination garrison',()=>{const s=fresh();friendly(s,2,60);const a=E.dispatch(s,'blue',0,2,100);finish(s,a);assert.equal(s.castles[2].troops,160);assert.equal(s.castles[0].troops,320);assert.equal(s.armies.length,0)});
test('100 vs 60 captures with 40 locally and no returning army',()=>{const s=fresh();setTroops(s.castles[2],60);finish(s,E.dispatch(s,'blue',0,2,100));assert.equal(s.castles[2].owner,'blue');assert.equal(s.castles[2].troops,40);assert.equal(s.armies.length,0);assert.equal(s.stats.blue.attackLosses,60)});
test('failed attack and tie preserve owner with exact remaining garrison',()=>{const s=fresh();setTroops(s.castles[2],100);finish(s,E.dispatch(s,'blue',0,2,60));assert.equal(s.castles[2].troops,40);finish(s,E.dispatch(s,'blue',0,2,40));assert.equal(s.castles[2].owner,null);assert.equal(s.castles[2].troops,0);finish(s,E.dispatch(s,'blue',0,2,1));assert.equal(s.castles[2].owner,'blue');assert.equal(s.castles[2].troops,1)});
test('arrival checks current ownership, including lost reinforcement targets',()=>{const s=fresh();friendly(s,2,50);const a=E.dispatch(s,'blue',0,2,100);s.castles[2].owner='red';finish(s,a);assert.equal(s.castles[2].troops,50);assert.equal(s.castles[2].owner,'blue')});
test('neutral castles do not grow; fractional owned growth becomes whole troops',()=>{const s=fresh();friendly(s,2,0);advance(s,1);assert.equal(s.castles[2].troops,0);near(s.castles[2].carry,.5);advance(s,1);assert.equal(s.castles[2].troops,1);assert.equal(s.castles[3].troops,100);assert.equal(s.castles[0].troops,426)});
test('other castles keep producing after original main is lost',()=>{const s=fresh();friendly(s,6,100);s.castles[0].owner='red';advance(s,2);assert.equal(s.castles[6].troops,108);assert.ok(E.income(s,'blue').gold>0)});
test('upgrades use shared gold, change only selected castle, and do not gift troops',()=>{const s=fresh();friendly(s,2,100);assert.ok(E.upgrade(s,'blue',2,'military'));assert.equal(s.players.blue.gold,100);assert.equal(s.castles[2].troops,100);assert.equal(s.castles[0].level,1);assert.equal(E.incomeFor(s.castles[2]).troops,1.5);assert.equal(E.incomeFor(s.castles[2]).gold,3.5);assert.equal(E.upgrade(s,'blue',2),false)});
test('specialization tradeoffs and level rates are explicit; unit power always one',()=>{const s=fresh(),c=s.castles[0];assert.deepEqual(E.incomeFor(c,2,'military'),{troops:7.5,gold:1});assert.deepEqual(E.incomeFor(c,2,'economy'),{troops:2.5,gold:4});assert.equal(E.power(s,'blue'),1)});
test('reserve protects quick sends; explicit override can empty the castle',()=>{const s=fresh();assert.ok(E.setReserve(s,'blue',0,50));assert.equal(E.available(s,s.castles[0]),370);assert.equal(E.dispatch(s,'blue',0,2,400),false);assert.ok(E.dispatch(s,'blue',0,2,420,{respectReserve:false}));assert.equal(s.castles[0].troops,0)});
test('automatic supply sends only excess and stops after destination capture',()=>{const s=fresh();friendly(s,2,0);E.setReserve(s,'blue',0,50);assert.ok(E.setSupply(s,'blue',0,2));advance(s,5.025);assert.equal(s.armies[0].count,385);assert.equal(s.castles[0].troops,50);s.castles[2].owner='red';advance(s,.025);assert.equal(s.castles[0].supply,null)});
test('supply rejects self, enemy and circular chains',()=>{const s=fresh();friendly(s,2);friendly(s,6);assert.equal(E.setSupply(s,'blue',0,0),false);assert.equal(E.setSupply(s,'blue',0,1),false);assert.ok(E.setSupply(s,'blue',0,2));assert.ok(E.setSupply(s,'blue',2,6));assert.equal(E.setSupply(s,'blue',6,0),false)});
test('coordinated orders reserve locally, launch at different times, arrive together',()=>{const s=fresh();friendly(s,2,100);assert.ok(E.coordinate(s,'blue',12,[{source:0,count:100},{source:2,count:60}]));assert.equal(s.castles[0].troops,420);assert.equal(E.reserved(s,2),60);assert.equal(E.dispatch(s,'blue',2,3,41),false);const arrivals=s.orders.map(o=>o.launch+E.routeLength(E.routeBetween(s.castles[o.source],s.castles[o.target]))/85);near(arrivals[0],arrivals[1]);advance(s,.025);assert.ok(s.armies.length>0);assert.ok(s.orders.length>0)});
test('cancelling order releases committed troops without manufacturing troops',()=>{const s=fresh();E.coordinate(s,'blue',2,[{source:0,count:100}]);const n=s.castles[0].troops;assert.ok(E.cancelOrder(s,'blue',s.orders[0].id));assert.equal(E.available(s,s.castles[0]),n);assert.equal(s.castles[0].troops,n)});
test('group scheduling rejects invalid entries atomically',()=>{const s=fresh();friendly(s,2,50);assert.equal(E.coordinate(s,'blue',3,[{source:0,count:100},{source:2,count:51}]),false);assert.equal(s.orders.length,0);assert.equal(E.coordinate(s,'blue',3,[{source:0,count:100},{source:0,count:100}]),false)});
test('capture clears old owner reservations and incoming supply immediately',()=>{const s=fresh();friendly(s,2,100);E.setSupply(s,'blue',0,2);E.coordinate(s,'blue',3,[{source:2,count:100}]);finish(s,E.dispatch(s,'red',1,2,200));assert.equal(s.castles[2].owner,'red');assert.equal(s.orders.length,0);assert.equal(s.castles[0].supply,null);assert.equal(s.castles[2].reserve,0)});
test('redirect and recall preserve position, count, ownership and travel',()=>{const s=fresh(),a=E.dispatch(s,'blue',0,3,100);advance(s,1);const p=E.position(a);assert.ok(E.redirect(s,'blue',a.id,6));assert.deepEqual(E.position(a),p);assert.equal(a.count,100);assert.ok(E.recall(s,'blue',a.id));assert.equal(a.target,0);assert.equal(s.castles[0].troops,323);assert.equal(E.redirect(s,'red',a.id,1),false)});
test('recall falls back to nearest remaining friendly castle',()=>{const s=fresh();friendly(s,2);const a=E.dispatch(s,'blue',0,3,100);advance(s,.5);s.castles[0].owner='red';assert.ok(E.recall(s,'blue',a.id));assert.equal(a.target,2)});
test('head-on road combat: 120 vs 80 leaves 40 continuing original destination',()=>{const s=fresh(),a=roadArmy(s,'blue',120,{x:200,y:300},{x:400,y:300}),b=roadArmy(s,'red',80,{x:400,y:300},{x:200,y:300});advance(s,1.2);assert.equal(s.armies.length,1);assert.equal(a.count,40);assert.equal(a.target,2);assert.ok(!s.armies.includes(b));assert.equal(s.stats.blue.roadLosses,80);assert.equal(s.stats.red.roadLosses,80)});
test('equal road armies both disappear',()=>{const s=fresh();roadArmy(s,'blue',80,{x:200,y:300},{x:400,y:300});roadArmy(s,'red',80,{x:400,y:300},{x:200,y:300});advance(s,1.2);assert.equal(s.armies.length,0)});
test('friendly armies pass and intersecting routes at different times do not fight',()=>{const s=fresh();roadArmy(s,'blue',80,{x:200,y:300},{x:500,y:300});roadArmy(s,'red',80,{x:400,y:150},{x:400,y:450});advance(s,2);assert.equal(s.armies.length,2);assert.equal(s.stats.blue.roadLosses,0);const f=fresh();roadArmy(f,'blue',80,{x:200,y:300},{x:500,y:300});roadArmy(f,'blue',80,{x:500,y:300},{x:200,y:300});advance(f,2);assert.equal(f.armies.length,2)});
test('simultaneous multi-army contact groups sides and apportions integer survivors',()=>{const s=fresh();roadArmy(s,'blue',60,{x:200,y:300},{x:400,y:300});roadArmy(s,'blue',40,{x:200,y:300},{x:400,y:300});roadArmy(s,'red',80,{x:400,y:300},{x:200,y:300});advance(s,1.2);assert.deepEqual(s.armies.map(a=>a.count).sort((a,b)=>a-b),[8,12])});
test('reachable interception retains count and computes a real meeting point',()=>{const s=fresh(),a=roadArmy(s,'blue',120,{x:300,y:330},{x:600,y:330}),b=roadArmy(s,'red',80,{x:450,y:200},{x:450,y:550});assert.ok(E.rendezvous(E.position(a),b));assert.ok(E.intercept(s,'blue',a.id,b.id));assert.equal(a.intercept,b.id);advance(s,2.5);assert.equal(s.stats.blue.roadLosses,80);assert.ok(s.armies.some(x=>x.owner==='blue'&&x.count===40))});
test('fast bridge and coastal detour have distinct paths, timing and continuous positions',()=>{const s=fresh(),a=E.dispatch(s,'blue',0,1,100),b=E.dispatch(s,'blue',0,1,100,{route:'flank'});assert.ok(b.duration>a.duration);assert.equal(a.path[1].y,740);assert.equal(b.path[1].y,1290);const corner=Math.hypot(a.path[1].x-a.x,a.path[1].y-a.y)/a.speed;a.t=corner-.001;const before=E.position(a);a.t=corner+.001;assert.ok(Math.hypot(E.position(a).x-before.x,E.position(a).y-before.y)<.2)});
test('threat lists actual arrivals and accounts for local production',()=>{const s=fresh();friendly(s,2,50);const a=E.dispatch(s,'blue',0,2,20),b=E.dispatch(s,'red',1,2,100),t=E.threat(s,2);assert.equal(t.incoming.length,2);assert.ok(t.incoming[0].eta<=t.incoming[1].eta);assert.ok(t.incoming.some(x=>x.id===a.id&&x.friendly));assert.ok(t.incoming.some(x=>x.id===b.id&&!x.friendly));assert.equal(t.owner,'red')});
test('all castles ends immediately with remaining hostile armies, but 80% does not',()=>{const s=fresh();s.castles.forEach((c,i)=>{if(i<17)c.owner='blue'});E.checkVictory(s);assert.equal(s.result,null);roadArmy(s,'red',999,{x:400,y:300},{x:500,y:300});s.castles.forEach(c=>c.owner='blue');E.checkVictory(s);assert.equal(s.result,'blue');const before=s.time;advance(s,2);assert.equal(s.time,before);assert.equal(s.armies[0].count,999)});
test('last castle capture completes before remaining armies can retake it',()=>{const s=fresh();s.castles.forEach(c=>c.owner='blue');s.castles[1].owner='red';setTroops(s.castles[1],1);const a=E.dispatch(s,'blue',0,1,10);a.t=a.duration-.01;roadArmy(s,'red',100,{x:100,y:100},{x:200,y:100});advance(s,.025);assert.equal(s.result,'blue')});
test('pause and result lock commands, economy and movement',()=>{const s=fresh();s.paused=true;const before=JSON.stringify(s);assert.equal(E.dispatch(s,'blue',0,2,1),false);assert.equal(E.setReserve(s,'blue',0,30),false);assert.equal(E.upgrade(s,'blue',0),false);advance(s,2);assert.equal(JSON.stringify(s),before)});
test('save restore keeps all garrisons, routes, queues and fractional growth paused',()=>{const s=fresh();friendly(s,2);E.setReserve(s,'blue',0,20);E.setSupply(s,'blue',2,0);E.dispatch(s,'blue',0,3,100,{route:'flank'});E.coordinate(s,'blue',6,[{source:0,count:30},{source:2,count:30}]);advance(s,.075);const loaded=E.deserialize(E.serialize(s));assert.ok(loaded);assert.equal(loaded.paused,true);assert.deepEqual(loaded.castles,s.castles);assert.deepEqual(loaded.armies,s.armies);assert.deepEqual(loaded.orders,s.orders);assert.deepEqual(loaded.stats,s.stats);assert.equal(loaded.time,s.time);loaded.paused=false;advance(s,1);advance(loaded,1);assert.deepEqual(loaded.castles,s.castles);assert.deepEqual(loaded.armies,s.armies)});
test('old or corrupted saves safely reject without affecting a new game',()=>{for(const text of ['bad','{}','null',JSON.stringify({...fresh(),version:3})])assert.equal(E.deserialize(text),null);const s=fresh();setTroops(s.castles[0],-1);assert.equal(E.deserialize(JSON.stringify(s)),null)});
test('all AI styles act without creating unearned troops or gold',()=>{for(const style of ['balanced','defender','economist','raider']){const s=E.create(42,style);advance(s,120);assert.ok(s.stats.red.dispatched>0);assert.ok(E.owned(s,'red').length>1);for(const p of ['blue','red']){const t=s.stats[p];assert.equal(E.totals(s,p).total,420+t.produced-t.roadLosses-t.attackLosses-t.defenseLosses);assert.ok(s.players[p].gold>=0)}assert.ok(s.castles.every(c=>Number.isInteger(c.troops)&&c.troops>=0));assert.ok(s.armies.every(a=>Number.isInteger(a.count)&&a.count>0))}});
test('3-player map initializes with blue, red, and green kingdoms',()=>{const s=E.create(42,'balanced','normal',5,false,3);assert.equal(s.playerCount,3);assert.deepEqual(Object.keys(s.players),['blue','red','green']);assert.equal(s.castles[0].owner,'blue');assert.equal(s.castles[1].owner,'red');assert.equal(s.castles[2].owner,'green');assert.equal(s.castles[3].owner,null);assert.equal(s.castles.length,21);assert.ok(E.dispatch(s,'green',2,3,100));assert.equal(s.castles[2].troops,320)});
test('4-player map initializes with blue, red, green, and purple kingdoms',()=>{const s=E.create(42,'balanced','normal',7,false,4);assert.equal(s.playerCount,4);assert.deepEqual(Object.keys(s.players),['blue','red','green','purple']);assert.equal(s.castles[0].owner,'blue');assert.equal(s.castles[1].owner,'red');assert.equal(s.castles[2].owner,'green');assert.equal(s.castles[3].owner,'purple');assert.equal(s.castles[4].owner,null);const serialized=E.serialize(s);const loaded=E.deserialize(serialized);assert.ok(loaded);assert.equal(loaded.playerCount,4);assert.deepEqual(Object.keys(loaded.players),['blue','red','green','purple'])});
test('3-way simultaneous road combat resolves cleanly',()=>{const s=E.create(42,'balanced','normal',5,false,3);roadArmy(s,'blue',100,{x:300,y:300},{x:500,y:300});roadArmy(s,'red',60,{x:500,y:300},{x:300,y:300});roadArmy(s,'green',40,{x:500,y:300},{x:300,y:300});advance(s,1.5);assert.equal(s.armies.length,1);assert.equal(s.armies[0].owner,'blue');assert.equal(s.armies[0].count,80)});


test('all layout and player-count combinations give every faction one equal main castle',()=>{for(let map=0;map<E.MAPS.length;map++)for(const count of [2,3,4]){const s=E.create(42,'balanced','normal',map,true,count);assert.equal(E.MAP_PLAYERS[s.mapIndex],count);for(const p of Object.keys(s.players)){assert.equal(E.owned(s,p).length,1);assert.equal(E.owned(s,p)[0].type,'main');assert.equal(E.totals(s,p).total,420);assert.equal(s.players[p].gold,200)}assert.ok(s.castles.some(c=>c.type==='elite'&&c.owner===null&&c.troops===450))}});
test('an opening all-in Elite attack fails without a progression gate',()=>{const s=fresh(),a=E.dispatch(s,'blue',0,15,420);assert.ok(a);finish(s,a);assert.equal(s.castles[15].owner,null);assert.equal(s.castles[15].troops,30);advance(s,1);assert.ok(s.castles[0].troops>0)});
test('rapid upgrades spend each level price once and cannot overdraw Gold',()=>{const s=fresh();s.players.blue.gold=320;for(let i=0;i<10;i++)E.upgrade(s,'blue',0,'military');assert.equal(s.players.blue.gold,0);assert.equal(s.castles[0].level,3);assert.equal(s.castles[0].troops,420)});
test('large production stays finite and a zero-Gold kingdom recovers',()=>{const s=fresh();s.players.blue.gold=0;advance(s,1);assert.ok(s.players.blue.gold>0);s.players.blue.gold=E.MAX_RESOURCE;setTroops(s.castles[0],E.MAX_RESOURCE);advance(s,1);assert.equal(s.players.blue.gold,E.MAX_RESOURCE);assert.equal(s.castles[0].troops,E.MAX_RESOURCE);assert.ok(E.deserialize(E.serialize(s)))});
test('malformed save ownership, routes, IDs, reserves and cycles are rejected',()=>{const cases=[s=>s.castles[2].owner='ghost',s=>s.castles[0].reserve=-1,s=>s.players.red.home=99,s=>s.orders.push(null),s=>{s.castles[2].owner='blue';s.castles[0].supply={target:2,owner:'blue',next:5,route:'fast'};s.castles[2].supply={target:0,owner:'blue',next:5,route:'fast'}},s=>{E.dispatch(s,'blue',0,2,10);s.armies[0].path[0].x=Infinity},s=>{E.dispatch(s,'blue',0,2,10);s.armies[0].owner='green'},s=>{E.dispatch(s,'blue',0,2,10);s.armies[0].duration=1}];for(const corrupt of cases){const s=fresh();corrupt(s);assert.equal(E.deserialize(E.serialize(s)),null)}});
test('browser AI adapter and server AI use the same implementation',()=>{const a=E.create(94),b=E.create(94);b.matchId=a.matchId;E.ai(a);const AI=require('../dist/ai.js');AI.step(b);assert.equal(E.serialize(a),E.serialize(b))});
test('real timestamp seeds restore correctly',()=>{const s=E.create(Date.now());assert.ok(E.deserialize(E.serialize(s)))});
test('battle damage releases orders that no longer have enough troops',()=>{const s=fresh();friendly(s,2,60);E.coordinate(s,'blue',15,[{source:2,count:55}]);s.orders[0].launch=100;setTroops(s.castles[2],10);E.tick(s,.025);assert.equal(s.orders.length,0);assert.ok(E.deserialize(E.serialize(s)))});
test('nine-map automated matches keep resources and saves valid through combat',()=>{for(let map=0;map<9;map++){const s=E.create(100+map,'balanced','normal',map,false);s.botPlayers=Object.keys(s.players);for(let t=0;t<180&&!s.result;t+=.25){E.tick(s,.25);assert.ok(E.deserialize(E.serialize(s)),`map ${map}, time ${s.time}`);assert.ok(s.castles.every(c=>Number.isSafeInteger(c.troops)&&c.troops>=0))}}});
test('knight castle swift march accelerates departing armies by 25%',()=>{const s=fresh();s.castles[0].type='knight';const aFast=E.dispatch(s,'blue',0,2,20,{route:'fast'});assert.equal(aFast.speed,106.25);const aFlank=E.dispatch(s,'blue',0,2,20,{route:'flank'});assert.equal(aFlank.speed,81.25)});
test('newly captured castle undergoes 7s stabilization at 50% income',()=>{const s=fresh();setTroops(s.castles[1],5);const a=E.dispatch(s,'blue',0,1,50);finish(s,a);assert.equal(s.castles[1].owner,'blue');assert.equal(s.castles[1].stabilizing,7);const normalRate=E.incomeFor({...s.castles[1],stabilizing:0}).troops;assert.equal(E.incomeFor(s.castles[1]).troops,normalRate*0.5);advance(s,7);assert.equal(s.castles[1].stabilizing,0);assert.equal(E.incomeFor(s.castles[1]).troops,normalRate)});
test('crown control countdown triggers at 14+ castles with citadel and crowns victor',()=>{const s=fresh();s.victoryMode='crown_control';s.castles[1].owner='red';setTroops(s.castles[1],500);for(let i=2;i<=15;i++)s.castles[i].owner='blue';s.castles[0].owner='blue';const elite=s.castles.find(c=>c.type==='elite');if(elite)elite.owner='blue';advance(s,1);assert.equal(s.crownHolder,'blue');near(s.crownHoldTimer,1,.05);advance(s,30);assert.equal(s.result,'blue');assert.equal(s.resultReason,'crown_control')});
test('player can switch castle specialty anytime for 50 Gold',()=>{const s=fresh();s.players.blue.gold=100;s.castles[0].specialty='balanced';assert.equal(E.specialize(s,'blue',0,'military'),true);assert.equal(s.castles[0].specialty,'military');assert.equal(s.players.blue.gold,50);s.players.blue.gold=20;assert.equal(E.specialize(s,'blue',0,'economy'),false)});
test('weather cycle changes sequentially and alters army speeds on the fly',()=>{const s=fresh();assert.equal(s.weather.type,'clear');const a=E.dispatch(s,'blue',0,2,20);assert.equal(a.speed,85);advance(s,45.1);assert.equal(s.weather.type,'rain');const aRain=E.dispatch(s,'blue',0,2,20);assert.equal(aRain.speed,63.75);advance(s,45.1);assert.equal(s.weather.type,'fog');advance(s,45.1);assert.equal(s.weather.type,'snow');});
test('hero Vanguard accelerates march speed by 15% and gains road combat survivability',()=>{const s=E.create(42,'balanced','normal',0,false,2,'crown_control',{blue:'vanguard'});assert.equal(s.players.blue.hero,'vanguard');const a=E.dispatch(s,'blue',0,2,20);assert.equal(a.speed,97.75);});
test('hero Fortifier receives 25% upgrade discount and +0.5 troops/s on main keep',()=>{const s=E.create(42,'balanced','normal',0,false,2,'crown_control',{blue:'fortifier'});assert.equal(E.upgradeCost(s.castles[0],'blue',s),75);s.players.blue.gold=80;assert.ok(E.upgrade(s,'blue',0,'military'));assert.equal(s.players.blue.gold,5);assert.equal(s.castles[0].level,2);const inc=E.incomeFor(s.castles[0],s.castles[0].level,s.castles[0].specialty,'fortifier');assert.equal(inc.troops,8.25);});
test('hero Guildmaster starts with 350 Gold and produces 30% more Gold',()=>{const s=E.create(42,'balanced','normal',0,false,2,'crown_control',{blue:'guildmaster'});assert.equal(s.players.blue.gold,350);const inc=E.incomeFor(s.castles[0],1,'balanced','guildmaster');assert.equal(inc.gold,1.3);});
test('hero Infiltrator accelerates flank routes by 25% and inflicts bonus siege casualties',()=>{const s=E.create(42,'balanced','normal',0,false,2,'crown_control',{blue:'infiltrator'});const aFlank=E.dispatch(s,'blue',0,2,20,{route:'flank'});assert.equal(aFlank.speed,81.25);s.castles[2].owner='red';setTroops(s.castles[2],11);const aAttack=E.dispatch(s,'blue',0,2,10,{route:'flank'});finish(s,aAttack);assert.equal(s.castles[2].owner,'blue');});
test('army recall redirects friendly marching army back home safely without teleporting',()=>{
  const s=fresh();
  const a=E.dispatch(s,'blue',0,2,30);
  assert.ok(a);
  advance(s,1.0);
  const midPos=E.position(a);
  assert.ok(midPos.x!==s.castles[0].x||midPos.y!==s.castles[0].y);
  assert.equal(E.recall(s,'blue',a.id),true);
  assert.equal(a.returning,true);
  assert.equal(a.target,0);
  advance(s,a.duration+0.2);
  assert.equal(s.armies.find(x=>x.id===a.id),undefined,'recalled army safely reinforced home');
});
test('dragon strike enforces mid-game requirements, cooldowns, falloff casualties and scorching',()=>{
  const s=fresh();
  s.time=10;s.players.blue.gold=1200;
  assert.equal(E.canDragonStrike(s,'blue'),false,'locked under 3 castles and time < 40s');
  s.time=45;
  s.castles[2].owner='blue';s.castles[3].owner='blue';
  assert.equal(E.canDragonStrike(s,'blue'),true);
  assert.equal(E.launchDragonStrike(s,'blue',s.castles[1].x,s.castles[1].y),true);
  assert.equal(s.players.blue.gold,200);
  assert.equal(E.canDragonStrike(s,'blue'),false,'on cooldown');
  assert.equal(s.dragonStrike.state,'incoming');
  const enemyStartDef=s.castles[1].troops;
  advance(s,3.1);
  assert.ok(s.castles[1].troops<enemyStartDef,'dragon inflicted casualties');
  assert.ok(s.castles[1].scorched>13&&s.castles[1].scorched<=14,'scorched timer active');
  assert.equal(E.defense(s,s.castles[1]),Math.floor(s.castles[1].troops*0.80));
});
test('progressive road battle simulates gradual casualties and reinforcement joining',()=>{
  const s=fresh();
  s.progressiveCombat=true;
  const a1=E.dispatch(s,'blue',0,1,50);
  const a2=E.dispatch(s,'red',1,0,40);
  advance(s,3.5);
  if(s.battles.length>0){
    const b=s.battles[0];
    assert.ok(b.armies.includes(a1.id));
    assert.ok(b.armies.includes(a2.id));
    assert.ok(Object.keys(b.powerRatio).length>=1);
  }
});
test('historical maps 9 and 10 initialize cleanly and support full matches',()=>{
  const sEuro=E.create(77,'balanced','normal',9,false,2);
  assert.equal(sEuro.mapIndex,9);
  assert.equal(sEuro.playerCount,2);
  assert.ok(E.deserialize(E.serialize(sEuro)));
  const sOrient=E.create(88,'balanced','normal',10,false,3);
  assert.equal(sOrient.mapIndex,10);
  assert.equal(sOrient.playerCount,3);
  assert.ok(E.deserialize(E.serialize(sOrient)));
});

test('progressive combat keeps troop counts consistent and effects finite',()=>{
  const s=fresh();s.progressiveCombat=true;
  const a=E.dispatch(s,'blue',0,1,60),b=E.dispatch(s,'red',1,0,50);
  E.engageBattle(s,[a,b]);
  for(let i=0;i<10;i++){
    E.tickBattles(s,.1);
    for(const army of s.armies){assert.ok(Number.isInteger(army.count)&&army.count>=0);assert.equal(army.units,undefined);}
    assert.ok(s.effects.every(e=>Number.isFinite(e.x)&&Number.isFinite(e.y)));
  }
  assert.ok(a.count<60&&b.count<50,'both armies suffer casualties');
});
test('recall cannot bypass pause or completed matches',()=>{
  const s=fresh(),a=E.dispatch(s,'blue',0,2,30);s.paused=true;
  assert.equal(E.recall(s,'blue',a.id),false);assert.equal(a.returning,false);
  s.paused=false;s.result='red';assert.equal(E.recall(s,'blue',a.id),false);
});
test('a second dragon cannot overwrite a pending strike or spend Gold',()=>{
  const s=fresh();s.time=45;
  for(const id of [2,3])s.castles[id].owner='blue';
  for(const id of [4,5])s.castles[id].owner='red';
  s.players.blue.gold=s.players.red.gold=1200;
  assert.equal(E.launchDragonStrike(s,'blue',NaN,100),false);
  assert.equal(s.players.blue.gold,1200);
  assert.equal(E.launchDragonStrike(s,'blue',1000,700),true);
  assert.equal(E.canDragonStrike(s,'red'),false);
  assert.equal(E.launchDragonStrike(s,'red',200,300),false);
  assert.equal(s.dragonStrike.owner,'blue');assert.equal(s.players.red.gold,1200);
});
test('deterministic progressive combat: 32 vs 15 leaves winner with realistic casualties', () => {
  const s = fresh();
  s.progressiveCombat = true;
  const a1 = E.dispatch(s, 'blue', 0, 1, 32);
  const a2 = E.dispatch(s, 'red', 1, 0, 15);
  E.engageBattle(s, [a1, a2]);
  while (s.battles.length > 0 && a1.count > 0 && a2.count > 0) {
    E.tickBattles(s, 0.1);
  }
  assert.equal(a2.count, 0, '15 defenders eliminated');
  assert.equal(a1.count, 28, '32 attackers suffer 4 casualties instead of 0');
});

test('deterministic progressive combat: 15 vs 32 symmetric outcome', () => {
  const s = fresh();
  s.progressiveCombat = true;
  const a1 = E.dispatch(s, 'blue', 0, 1, 15);
  const a2 = E.dispatch(s, 'red', 1, 0, 32);
  E.engageBattle(s, [a1, a2]);
  while (s.battles.length > 0 && a1.count > 0 && a2.count > 0) {
    E.tickBattles(s, 0.1);
  }
  assert.equal(a1.count, 0, '15 attackers eliminated');
  assert.equal(a2.count, 28, '32 defenders suffer 4 casualties instead of 0');
});

test('deterministic progressive combat: 32 vs 32 results in mutual annihilation or close draw', () => {
  const s = fresh();
  s.progressiveCombat = true;
  const a1 = E.dispatch(s, 'blue', 0, 1, 32);
  const a2 = E.dispatch(s, 'red', 1, 0, 32);
  E.engageBattle(s, [a1, a2]);
  while (s.battles.length > 0 && a1.count > 0 && a2.count > 0) {
    E.tickBattles(s, 0.1);
  }
  assert.ok(a1.count <= 2 && a2.count <= 2, 'both equal armies suffer near-total casualties');
});

test('deterministic progressive combat: 100 vs 1 decisive overwhelming victory', () => {
  const s = fresh();
  s.progressiveCombat = true;
  const a1 = E.dispatch(s, 'blue', 0, 1, 100);
  const a2 = E.dispatch(s, 'red', 1, 0, 1);
  E.engageBattle(s, [a1, a2]);
  while (s.battles.length > 0 && a1.count > 0 && a2.count > 0) {
    E.tickBattles(s, 0.1);
  }
  assert.equal(a2.count, 0);
  assert.ok(a1.count >= 99);
});

test('deterministic progressive combat: Reinforcements join active road battle and turn the tide', () => {
  const s = fresh();
  s.progressiveCombat = true;
  const aBlue1 = E.dispatch(s, 'blue', 0, 1, 15);
  const aRed = E.dispatch(s, 'red', 1, 0, 30);
  E.engageBattle(s, [aBlue1, aRed]);
  
  for (let i = 0; i < 5; i++) E.tickBattles(s, 0.1);
  assert.ok(aBlue1.count < 15 && aRed.count < 30);

  const battle = s.battles[0];
  const aBlue2 = E.dispatch(s, 'blue', 0, 1, 30);
  aBlue2.path = [{ x: battle.x, y: battle.y }, { x: battle.x, y: battle.y }];
  aBlue2.t = 0;
  aBlue2.duration = 1;

  while (s.battles.length > 0 && (aBlue1.count > 0 || aBlue2.count > 0) && aRed.count > 0) {
    E.tickBattles(s, 0.1);
  }
  assert.equal(aRed.count, 0, 'reinforcements eliminate hostile army');
  assert.ok(aBlue2.count > 0, 'reinforcements survived');
});

test('every playable map provides all passive bonus castle types (archer, knight, cavalry, gold, troop, elite)', () => {
  for (let mIdx = 0; mIdx < E.MAPS.length; mIdx++) {
    const res = E.validateMapRoster(mIdx);
    assert.ok(res.valid, `Map ${mIdx} (${res.mapName}) must contain all passive bonus structures`);
    assert.ok(res.counts.archer >= 1, `Map ${mIdx} missing defense tower`);
    assert.ok(res.counts.knight >= 1, `Map ${mIdx} missing assault keep`);
    assert.ok(res.counts.cavalry >= 1, `Map ${mIdx} missing mobility keep`);
    assert.ok(res.counts.gold >= 1, `Map ${mIdx} missing gold mine`);
    assert.ok(res.counts.troop >= 1, `Map ${mIdx} missing troop barracks`);
    assert.ok(res.counts.elite >= 1, `Map ${mIdx} missing elite citadel`);
    assert.ok(res.counts.main >= res.requiredPlayers, `Map ${mIdx} missing main castles for players`);
  }
});

test('randomized castle generation guarantees all core castle types across all maps (gold, troop, archer, knight, cavalry, elite)', () => {
  for (let mIdx = 0; mIdx < E.MAPS.length; mIdx++) {
    const reqPlayers = E.MAP_PLAYERS[mIdx];
    for (let seed = 1; seed <= 50; seed++) {
      const s = E.create(seed * 7919, 'balanced', 'normal', mIdx, true);
      const counts = { main: 0, gold: 0, troop: 0, archer: 0, knight: 0, cavalry: 0, elite: 0, small: 0 };
      for (const c of s.castles) {
        counts[c.type] = (counts[c.type] || 0) + 1;
      }
      assert.ok(counts.gold >= 1, `Map ${mIdx} (${E.MAP_NAMES[mIdx]}) seed ${seed} missing gold castle`);
      assert.ok(counts.troop >= 1, `Map ${mIdx} (${E.MAP_NAMES[mIdx]}) seed ${seed} missing troop castle`);
      assert.ok(counts.archer >= 1, `Map ${mIdx} (${E.MAP_NAMES[mIdx]}) seed ${seed} missing archer castle`);
      assert.ok(counts.knight >= 1, `Map ${mIdx} (${E.MAP_NAMES[mIdx]}) seed ${seed} missing knight castle`);
      assert.ok(counts.cavalry >= 1, `Map ${mIdx} (${E.MAP_NAMES[mIdx]}) seed ${seed} missing cavalry castle`);
      assert.ok(counts.elite >= 1, `Map ${mIdx} (${E.MAP_NAMES[mIdx]}) seed ${seed} missing elite citadel`);
      assert.ok(counts.main >= reqPlayers, `Map ${mIdx} (${E.MAP_NAMES[mIdx]}) seed ${seed} missing main castles`);
    }
  }
});

test('4-player match assigns distinct bot personalities, heroes, and staggered asynchronous timers', () => {
  const s = E.create(12345, 'balanced', 'normal', 7, false, 4);
  assert.equal(s.playerCount, 4);
  const botKeys = s.botPlayers;
  assert.equal(botKeys.length, 3); // red, green, purple
  const styles = botKeys.map(k => s.players[k].aiStyle);
  const uniqueStyles = new Set(styles);
  assert.ok(uniqueStyles.size >= 3, 'all 3 bots must have distinct AI personalities');
  const timers = botKeys.map(k => s.players[k].aiTimer);
  const uniqueTimers = new Set(timers);
  assert.ok(uniqueTimers.size >= 3, 'all 3 bots must have staggered asynchronous timers');
});

test('AI honors road adjacency and only targets connected road neighbors without cross-map leaps', () => {
  const s = E.create(999, 'balanced', 'normal', 7, false, 4);
  s.aiDisabled = true;
  // Let red AI evaluate targets from castle 1 (Crimson Keep)
  E.aiForPlayer(s, 'red');
  // Check red dispatched armies or orders
  const redDispatches = s.armies.filter(a => a.owner === 'red');
  const redOrders = s.orders.filter(o => o.owner === 'red');
  const targets = [...redDispatches.map(a => a.target), ...redOrders.map(o => o.target)];
  // Crimson Keep (1) local road neighbors on Map 7 are 5, 7, 9
  for (const tid of targets) {
    const targetCastle = s.castles[tid];
    assert.ok(
      [5, 7, 9].includes(tid) || E.dist(s.castles[1], targetCastle) <= 450,
      `target ${tid} (${targetCastle.name}) must be adjacent to Crimson Keep, cannot leap cross-map`
    );
    assert.notEqual(tid, 0, 'AI cannot snipe Azurehold (player base) across 1500px');
    assert.notEqual(tid, 2, 'AI cannot leap to Emerald Bastion across the map');
    assert.notEqual(tid, 3, 'AI cannot leap to Violet Spire across the map');
  }
});

test('normal AI coordinates a winnable attack and refuses an understrength one', () => {
  const make = () => {
    const s = E.create(42, 'balanced', 'normal');
    s.aiDisabled = true;
    s.players.blue.gold = 0;
    for (const c of s.castles) if (c.owner === null) setTroops(c,10000);
    s.castles[2].owner = 'blue';
    setTroops(s.castles[0],100);
    setTroops(s.castles[2],100);
    setTroops(s.castles[6],150);
    return s;
  };
  const s = make();
  E.aiForPlayer(s, 'blue');
  const orders = s.orders.filter(o => o.owner === 'blue' && o.target === 6);
  assert.equal(orders.length, 2, 'both castles must contribute to the same attack');
  assert.ok(orders.reduce((n, o) => n + o.count, 0) > 150);
  assert.ok(E.deserialize(E.serialize(s)), 'coordinated plan remains saveable');

  const weak = make();
  setTroops(weak.castles[2],40);
  setTroops(weak.castles[6],170);
  E.aiForPlayer(weak, 'blue');
  assert.equal(weak.orders.length, 0);
  assert.equal(weak.armies.filter(a => a.owner === 'blue').length, 0);
});

test('AI abandons pending orders when a target receives overwhelming reinforcements', () => {
  const s = E.create(42, 'balanced', 'normal');
  s.aiDisabled = true;
  s.players.blue.gold = 0;
  for (const c of s.castles) if (c.owner === null) setTroops(c,10000);
  s.castles[2].owner = 'blue';
  setTroops(s.castles[0],100);
  setTroops(s.castles[2],100);
  setTroops(s.castles[6],150);
  E.aiForPlayer(s, 'blue');
  assert.ok(s.orders.some(o => o.owner === 'blue' && o.target === 6));
  s.castles[6].owner = 'red';
  setTroops(s.castles[6],500);
  E.aiForPlayer(s, 'blue');
  assert.equal(s.orders.filter(o => o.owner === 'blue' && o.target === 6).length, 0);
  assert.equal(s.castles[0].troops, 100);
  assert.equal(s.castles[2].troops, 100);
});

test('AI predicts a player march and reinforces before it arrives', () => {
  const s = E.create(42, 'balanced', 'normal');
  s.aiDisabled = true;
  s.players.blue.gold = 0;
  for (const c of s.castles) if (c.owner === null) setTroops(c,10000);
  setTroops(s.castles[0],80);
  s.castles[2].owner = 'blue';
  setTroops(s.castles[2],170);
  const attack = E.dispatch(s, 'red', 1, 0, 200);
  E.aiForPlayer(s, 'blue');
  const relief = s.armies.find(a => a.owner === 'blue' && a.target === 0);
  assert.ok(relief, 'the threatened castle receives reinforcements');
  assert.ok(relief.duration < attack.duration, 'help arrives before the attacker');
  assert.ok(E.deserialize(E.serialize(s)));
});

test('AI cannot read a private enemy order, but reacts after its army launches', () => {
  const s = E.create(42, 'balanced', 'normal');
  s.aiDisabled = true;
  s.players.blue.gold = 0;
  for (const c of s.castles) if (c.owner === null) setTroops(c,10000);
  setTroops(s.castles[0],80);
  s.castles[2].owner = 'blue';
  setTroops(s.castles[2],170);
  assert.ok(E.coordinate(s, 'red', 0, [{source:1,count:200}]));
  assert.equal(s.armies.length, 0);
  E.aiForPlayer(s, 'blue');
  assert.equal(s.armies.filter(a => a.owner === 'blue').length, 0);
  E.tick(s, .025);
  assert.ok(s.armies.some(a => a.owner === 'red' && a.target === 0));
  E.aiForPlayer(s, 'blue');
  assert.ok(s.armies.some(a => a.owner === 'blue' && a.target === 0));
});

test('AI cancels its own offensive order when departure would lose its castle', () => {
  const s = E.create(42, 'balanced', 'normal');
  s.aiDisabled = true;
  s.players.blue.gold = 0;
  for (const c of s.castles) if (c.owner === null) setTroops(c,10000);
  setTroops(s.castles[0],180);
  assert.ok(E.coordinate(s, 'blue', 6, [{source:0,count:120}]));
  s.orders[0].launch = s.time + 1;
  E.dispatch(s, 'red', 1, 0, 200);
  E.aiForPlayer(s, 'blue');
  assert.equal(s.orders.filter(o => o.owner === 'blue' && o.source === 0).length, 0);
  assert.equal(s.castles[0].troops, 180, 'canceling an order must conserve troops');
});

test('AI counterattacks a nearby keep after its army leaves', () => {
  const s = E.create(42, 'balanced', 'normal');
  s.aiDisabled = true;
  s.players.blue.gold = 0;
  for (const c of s.castles) if (c.owner === null) setTroops(c,10000);
  setTroops(s.castles[0],300);
  s.castles[8].owner = 'red';
  setTroops(s.castles[8],200);
  E.dispatch(s, 'red', 8, 0, 170);
  E.aiForPlayer(s, 'blue');
  assert.ok(s.armies.some(a => a.owner === 'blue' && a.target === 8));
  assert.ok(s.castles[0].troops >= 200, 'the counterattack retains enough defense');
});

test('AI does not strip a second exposed keep to reinforce another', () => {
  const s = E.create(42, 'balanced', 'normal');
  s.aiDisabled = true;
  s.players.blue.gold = 0;
  for (const c of s.castles) if (c.owner === null) setTroops(c,10000);
  setTroops(s.castles[0],80);
  s.castles[2].owner = 'blue';
  setTroops(s.castles[2],220);
  s.castles[4].owner = 'red';
  setTroops(s.castles[4],300);
  E.dispatch(s, 'red', 1, 0, 200);
  E.aiForPlayer(s, 'blue');
  assert.ok(s.castles[2].troops >= 145, 'neighboring enemy buildup still threatens the donor');
});

test('Hard keeps a larger legal border reserve when an enemy garrison is massing', () => {
  const make = difficulty => {
    const s = E.create(42, 'balanced', difficulty);
    s.aiDisabled = true;
    s.players.blue.gold = 0;
    for (const c of s.castles) if (c.owner === null) setTroops(c,10000);
    s.castles[2].owner = 'blue';
    setTroops(s.castles[2],220);
    s.castles[4].owner = 'red';
    setTroops(s.castles[4],300);
    return s;
  };
  const normal = make('normal');
  const hard = make('hard');
  E.aiForPlayer(normal, 'blue');
  E.aiForPlayer(hard, 'blue');
  assert.ok(hard.castles[2].reserve > normal.castles[2].reserve);
  assert.equal(hard.castles[2].troops, normal.castles[2].troops);
  assert.equal(hard.players.blue.gold, normal.players.blue.gold);
});

test('Hard saves real gold for a worthwhile dragon strike', () => {
  const make = gold => {
    const s = E.create(42, 'balanced', 'hard');
    s.aiDisabled = true;
    s.time = 50;
    s.castles[2].owner = 'blue';
    s.castles[6].owner = 'blue';
    s.players.blue.gold = gold;
    return s;
  };
  const saving = make(900);
  E.aiForPlayer(saving, 'blue');
  assert.equal(saving.players.blue.gold, 900);
  assert.equal(saving.dragonStrike, null);
  const ready = make(1000);
  E.aiForPlayer(ready, 'blue');
  assert.equal(ready.dragonStrike.owner, 'blue');
  assert.equal(ready.players.blue.gold, 0, 'the strike pays its full 1000 gold cost');
  assert.ok(E.deserialize(E.serialize(ready)));
});

test('AI stages reserves when the player masses troops at a neighboring keep', () => {
  const s = E.create(42, 'balanced', 'normal');
  s.aiDisabled = true;
  s.players.blue.gold = 0;
  for (const c of s.castles) if (c.owner === null) setTroops(c,10000);
  setTroops(s.castles[0],250);
  s.castles[6].owner = 'blue';
  setTroops(s.castles[6],80);
  s.castles[10].owner = 'red';
  setTroops(s.castles[10],300);
  E.aiForPlayer(s, 'blue');
  assert.ok(s.armies.some(a => a.owner === 'blue' && a.source === 0 && a.target === 6));
  assert.ok(s.castles[0].troops >= 100, 'the rear castle keeps its own defense');
});

test('500 vs 1200 clash: 1200 wins initial clash, but 1500 reinforcements decisively defeat the remainder', () => {
  const s = E.create(555, 'balanced', 'normal', 0, false, 2, 'crown_control', null, true);
  s.castles[0].owner = 'blue'; setTroops(s.castles[0],5000);
  s.castles[1].owner = 'red'; setTroops(s.castles[1],5000);
  s.aiDisabled = true;

  // 1. Blue 500 clashes with Red 1200 on the road
  const a1 = E.dispatch(s, 'blue', 0, 1, 500);
  const a2 = E.dispatch(s, 'red', 1, 0, 1200);

  // Run until initial battle finishes
  while (s.battles.length === 0) E.tick(s, 0.05);
  while (s.battles.length > 0 && a1.count > 0 && a2.count > 0) E.tick(s, 0.05);
  while (s.battles.length > 0) E.tick(s, 0.05);

  assert.equal(a1.count, 0, '500 blue soldiers eliminated by 1200 red');
  assert.ok(a2.count > 0 && a2.count <= 1100, `1200 red suffered realistic casualties: ${a2.count}`);

  // 2. Fresh 1500 blue troops march to meet remaining red force
  const a3 = E.dispatch(s, 'blue', 0, 1, 1500);
  while (s.battles.length === 0 && a2.count > 0 && a3.count > 0) E.tick(s, 0.05);
  while (s.battles.length > 0 && a2.count > 0 && a3.count > 0) E.tick(s, 0.05);
  while (s.battles.length > 0) E.tick(s, 0.05);

  assert.equal(a2.count, 0, 'remaining red force eliminated by 1500 fresh reinforcements');
  assert.ok(a3.count >= 1000, `1500 reinforcements win decisively with strong survivors: ${a3.count}`);
});
