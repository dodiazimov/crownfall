'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const E=require('../dist/engine.js');
const M=require('../multiplayer.js');
const C=require('../dist/career.js');
global.localStorage={data:new Map(),getItem(k){return this.data.get(k)||null},setItem(k,v){this.data.set(k,v)}};
const fresh=()=>{const s=E.create(42);s.aiDisabled=true;return s};
function units(c,type,count){c.troops=count;}
function room(){const r={code:'REGRESSION',seed:42,maxPlayers:2,mapIndex:0,slots:{blue:{username:'A',connected:true,isBot:false,hero:'vanguard'},red:{username:'B',connected:true,isBot:false,hero:'vanguard'}}};M.start(r);return r;}
const near=(a,b,eps=.026)=>assert.ok(Math.abs(a-b)<=eps,`${a} ~= ${b}`);
test('dragon reaches all corners and the entire eastern and southern map on every layout',()=>{
  for(let map=0;map<E.MAPS.length;map++)for(const [x,y] of [[0,0],[2200,0],[0,1500],[2200,1500],[1900,1350]]){
    const s=E.create(42,'balanced','normal',map);s.castles[4].owner=s.castles[5].owner='blue';s.time=40;s.players.blue.gold=1000;
    assert.ok(E.launchDragonStrike(s,'blue',x,y));assert.equal(s.dragonStrike.x,x);assert.equal(s.dragonStrike.y,y);
    assert.ok(E.deserialize(E.serialize(s)));assert.equal(s.players.blue.gold,0);
  }
});
test('dragon clamps external coordinates to actual map edges',()=>{const s=fresh();s.castles[2].owner=s.castles[4].owner='blue';s.time=40;s.players.blue.gold=1000;assert.ok(E.launchDragonStrike(s,'blue',9000,-200));assert.deepEqual([s.dragonStrike.x,s.dragonStrike.y],[2200,0]);});
test('coordinated attacks from different castles arrive together',()=>{
  const s=fresh();units(s.castles[0],'cavalry',100);s.castles[2].owner='blue';units(s.castles[2],'soldier',100);
  assert.ok(E.coordinate(s,'blue',15,[{source:0,count:100},{source:2,count:100}]));
  const launch=new Map(s.orders.map(o=>[o.source,o.launch]));const arrivals=[];
  for(let i=0;i<200;i++){E.tick(s,.025);for(const a of s.armies)if(!arrivals.some(x=>x.source===a.source))arrivals.push({source:a.source,time:launch.get(a.source)+a.duration});if(arrivals.length===2)break;}
  assert.equal(arrivals.length,2);near(arrivals[0].time,arrivals[1].time,1e-6);
});
test('mobility castle bonuses survive weather, redirects, recall and intercept',()=>{
  const s=fresh();s.castles[0].type='cavalry';units(s.castles[0],'cavalry',300);const a=E.dispatch(s,'blue',0,1,100);
  assert.equal(a.speed,106.25);const oldPos=E.position(a);s.weather.timer=.001;E.tick(s,.025);
  assert.equal(a.speed,79.69);assert.ok(Math.hypot(E.position(a).x-oldPos.x,E.position(a).y-oldPos.y)<3);
  assert.ok(E.redirect(s,'blue',a.id,1));assert.equal(a.speed,79.69);assert.ok(E.recall(s,'blue',a.id));assert.equal(a.speed,79.69);
  const b=E.dispatch(s,'red',1,0,100);b.t=b.duration-.5;assert.ok(E.intercept(s,'blue',a.id,b.id));assert.equal(a.speed,79.69);
});
test('march preview matches the actual castle bonuses, heroes and weather',()=>{
  for(const type of ['main','knight','cavalry'])for(const weather of ['clear','rain','fog','snow'])for(const route of ['fast','flank']){
    const s=fresh(),c=s.castles[0];c.type=type;c.units={soldier:200,archer:20,knight:50,cavalry:150};s.players.blue.hero='infiltrator';s.weather.type=weather;
    const expected=E.marchSpeed(c,route,s.weather,'infiltrator'),a=E.dispatch(s,'blue',0,1,177,{route});assert.equal(a.speed,expected);
  }
});
test('failed attack respects Watch defense and forecasts identical losses',()=>{
  const s=fresh(),c=s.castles[2];c.type='small';units(c,'soldier',100);
  const army={owner:'blue',target:2,count:110,units:{soldier:110},route:'fast'},r=E.siegeOutcome(s,army,c);
  assert.equal(r.wins,false);assert.equal(r.defenderLosses,91);E.resolve(s,army);assert.equal(c.owner,null);assert.equal(c.troops,9);
});
test('siege forecasts match live resolution for castle defense and commander bonuses',()=>{
  for(const type of ['main','small','archer'])for(const unit of ['soldier','knight','cavalry'])for(const weather of ['clear','snow']){
    const s=fresh(),c=s.castles[2];c.type=type;c.owner='red';units(c,'soldier',110);s.players.blue.hero='infiltrator';s.weather.type=weather;
    const a={owner:'blue',target:2,count:100,units:{[unit]:100},route:'flank'},r=E.siegeOutcome(s,a,c),before=structuredClone(a);
    E.resolve(s,a);assert.deepEqual(a,before);assert.equal(c.troops,r.wins?r.survivors:110-r.defenderLosses);assert.equal(c.owner,r.wins?'blue':'red');
    assert.equal(s.stats.blue.casualtiesInflicted,r.defenderLosses);assert.equal(s.stats.red.casualtiesInflicted,r.attackerLosses);
  }
});
test('castle projection includes arriving reinforcements, attackers and stabilization',()=>{
  const s=fresh();s.castles[2].owner='red';units(s.castles[2],'soldier',40);const a=E.dispatch(s,'red',1,2,100);a.t=a.duration-.1;
  const projected=E.forecastCastle(s,2,.15,'blue');assert.equal(projected.owner,'red');assert.equal(projected.troops,140);
  E.tick(s,.15);assert.equal(s.castles[2].troops,projected.troops);
});
test('instantaneous combat finishes and is independent of faction array order',()=>{
  const run=order=>{const s=E.create(42,'balanced','normal',5),armies=order.map((p,i)=>({id:i+1,owner:p,count:100,units:{knight:100},path:[{x:500,y:500},{x:501,y:501}],t:0,length:Math.SQRT2,speed:85}));E.battleGroups(s,armies);return Object.fromEntries(armies.map(a=>[a.owner,a.count]));};
  const forward=run(['blue','red','green']),reverse=run(['green','red','blue']);assert.deepEqual(forward,reverse);assert.ok(Object.values(forward).filter(n=>n>0).length<=1);
  const two=run(['blue','red']);assert.deepEqual(two,{blue:0,red:0});
});
test('malformed battle, bonus flags and timer save data is rejected',()=>{
  const corruptions=[s=>{E.dispatch(s,'blue',0,1,100).siegeBoost=9},s=>{E.dispatch(s,'blue',0,1,100).inBattle=999},s=>s.battles=[{}],s=>s.weather.timer=NaN,s=>s.dragonCooldowns.blue=-1];
  for(const corrupt of corruptions){const s=fresh();corrupt(s);assert.equal(E.deserialize(E.serialize(s)),null);}
});
test('save restores active battle without mutating snapshot effects',()=>{
  const s=fresh();s.progressiveCombat=true;const a=E.dispatch(s,'blue',0,1,100),b=E.dispatch(s,'red',1,0,100);E.engageBattle(s,[a,b]);s.effects.push({x:10,y:10,text:'CAPTURED',life:2});
  const original=structuredClone(s),loaded=E.deserialize(s);assert.ok(loaded);assert.deepEqual(s,original);assert.notEqual(loaded,s);
  loaded.paused=false;E.tick(loaded,.025);assert.ok(E.deserialize(E.serialize(loaded)));
});
test('battle army cannot redirect, recall or intercept',()=>{const s=fresh(),a=E.dispatch(s,'blue',0,1,100),b=E.dispatch(s,'red',1,0,100);E.engageBattle(s,[a,b]);assert.equal(E.redirect(s,'blue',a.id,2),false);assert.equal(E.recall(s,'blue',a.id),false);assert.equal(E.intercept(s,'blue',a.id,b.id),false);});
test('reinforcement capacity preserves count limits and Gold',()=>{
  const s=fresh(),c=s.castles[0];c.troops=E.MAX_RESOURCE-7;const gold=s.players.blue.gold;
  E.resolve(s,{owner:'blue',target:0,count:100});assert.equal(c.troops,E.MAX_RESOURCE);assert.equal(s.players.blue.gold,gold);assert.equal(c.units,undefined);
});
test('earned gold survives spending and excludes the starting treasury',()=>{const s=fresh();E.tick(s,.25);near(s.stats.blue.goldEarned,.25,1e-8);E.upgrade(s,'blue',0);near(s.stats.blue.goldEarned,.25,1e-8);});
test('career records a match once across reloads and tracks draws and personal wins',()=>{
  C.resetStats();C.recordMatch({matchId:'match1',outcome:'loss',allCastles:true,ironBastion:true,casualtiesInflicted:100,goldEarned:12});
  C.recordMatch({matchId:'match1',outcome:'loss',allCastles:true});let st=C.loadStats();assert.equal(st.battles,1);assert.equal(st.hasGrandConquest,false);assert.equal(st.hasIronBastion,false);assert.equal(st.casualtiesInflicted,100);assert.equal(st.goldAmassed,12);
  C.recordMatch({matchId:'match2',outcome:'draw'});st=C.recordMatch({matchId:'match3',outcome:'win',allCastles:true});assert.deepEqual([st.battles,st.wins,st.losses,st.draws],[3,1,1,1]);assert.equal(st.hasGrandConquest,true);
});
test('AI style settings update active bots while retaining the human commander',()=>{const s=E.create(42,'balanced','normal',7);const before=s.players.blue.aiStyle;assert.ok(E.setAIStyle(s,'economist'));assert.ok(s.botPlayers.every(p=>s.players[p].aiStyle==='economist'));assert.equal(s.players.blue.aiStyle,before);assert.equal(E.setAIStyle(s,'invalid'),false);});
test('multiplayer rejects removed recruitment commands without changing resources',()=>{
  const r=room(),before=structuredClone(r.state),revision=r.revision;
  for(const type of ['train_troop','quick_recruit'])assert.equal(M.command(r,'blue',{type,castleId:0,troopType:'soldier',count:100}),false);
  assert.deepEqual(r.state,before);assert.equal(r.revision,revision);
});
test('multiplayer heroes are immutable, orders private, and departed rematch seats become bots',()=>{
  const r=room(),id=r.state.matchId;assert.equal(M.command(r,'blue',{type:'select_hero',hero:'fortifier'}),false);assert.equal(r.state.players.blue.hero,'vanguard');
  E.coordinate(r.state,'blue',15,[{source:0,count:100}]);assert.equal(M.snapshot(r,'blue').state.orders.length,1);assert.equal(M.snapshot(r,'red').state.orders.length,0);assert.equal(M.snapshot(r).state.orders.length,0);assert.equal(r.state.orders.length,1);
  r.slots.red.connected=false;M.abandon(r,'red');M.tick(r,r.lastTick+100);assert.ok(M.rematch(r));assert.ok(r.state.botPlayers.includes('red'));assert.notEqual(r.state.matchId,id);
});
