'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const E=require('../dist/engine.js');
const fresh=()=>{const s=E.create(42);s.aiDisabled=true;return s;};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} ~= ${b}`);

test('new and randomized matches contain counts and bonus castles without unit or training state',()=>{
  for(const randomized of [false,true])for(let map=0;map<E.MAPS.length;map++){
    const s=E.create(42,'balanced','normal',map,randomized);
    assert.ok(s.castles.every(c=>Number.isSafeInteger(c.troops)&&!('units' in c)&&!('trainingQueue' in c)));
    assert.ok(Object.values(s.players).every(p=>!('unit' in p)));
    for(const api of ['UNITS','trainTroops','quickRecruit','unlocked','getUnlockedTroops','deploymentUnits'])assert.equal(E[api],undefined);
    assert.ok(E.deserialize(E.serialize(s)));
  }
});
test('every owned bonus castle grows a generic garrison automatically',()=>{
  const s=fresh();let id=2;
  for(const type of ['archer','knight','cavalry','gold','troop','small','elite']){const c=s.castles[id++];c.owner='blue';c.type=type;c.troops=10;}
  const gold=s.players.blue.gold;
  for(let i=0;i<40;i++)E.tick(s,.25);
  assert.ok(s.castles.slice(2,9).every(c=>c.troops>10&&c.units===undefined&&c.trainingQueue===undefined));
  assert.ok(s.players.blue.gold>gold);
});
test('an owned defense tower grants 15 percent defense without troop classes',()=>{
  const s=fresh(),c=s.castles[2];c.type='archer';c.troops=100;
  assert.equal(E.defense(s,c),100);c.owner='red';assert.equal(E.defense(s,c),115);
  // Equal attack and defense do not capture the tower.
  const r=E.siegeOutcome(s,{owner:'blue',source:0,count:115,route:'fast'},c);
  assert.equal(r.wins,false);assert.equal(r.defenderLosses,100);
});
test('an assault castle grants 20 percent siege strength and 25 percent march speed',()=>{
  const s=fresh();s.castles[0].type='knight';const target=s.castles[2];target.type='gold';target.troops=110;
  const a=E.dispatch(s,'blue',0,2,100);assert.equal(a.speed,106.25);assert.equal(a.siegeBoost,true);
  const r=E.siegeOutcome(s,a,target);assert.equal(r.strength,120);assert.equal(r.wins,true);assert.equal(r.survivors,8);
  E.resolve(s,a);assert.equal(target.owner,'blue');assert.equal(target.troops,8);assert.equal(target.units,undefined);
});
test('mobility bonuses apply to departing armies and do not double-stack with troop speed',()=>{
  const s=fresh();s.castles[2].owner='blue';s.castles[2].type='cavalry';
  assert.equal(E.dispatch(s,'blue',0,1,50).speed,85);
  const a=E.dispatch(s,'blue',2,1,50);assert.equal(a.speed,106.25);assert.equal(a.siegeBoost,false);
  assert.equal(E.siegeOutcome(s,a,s.castles[1]).strength,50);
});
test('watch keep defense aura follows ownership and range and does not stack by node count',()=>{
  const s=fresh(),c=s.castles[0],d=s.castles[2];c.troops=100;d.type='small';d.owner='blue';d.x=c.x+100;d.y=c.y;
  assert.equal(E.defense(s,c),115);s.castles[3].type='small';s.castles[3].owner='blue';s.castles[3].x=c.x;s.castles[3].y=c.y;
  assert.equal(E.defense(s,c),115);d.owner='red';s.castles[3].owner='red';assert.equal(E.defense(s,c),100);
  d.owner='blue';d.x=c.x+521;assert.equal(E.defense(s,c),100);d.troops=100;assert.equal(E.defense(s,d),120);
});
test('departing army bonuses survive source loss, redirects, weather and reload',()=>{
  const s=fresh();s.castles[0].type='knight';const a=E.dispatch(s,'blue',0,1,100);s.castles[0].owner='red';
  assert.ok(E.redirect(s,'blue',a.id,2));assert.equal(a.speed,106.25);assert.equal(a.siegeBoost,true);
  s.weather.timer=.001;E.tick(s,.025);assert.equal(a.speed,79.69);
  const loaded=E.deserialize(E.serialize(s));assert.ok(loaded);assert.equal(loaded.armies[0].siegeBoost,true);assert.equal(loaded.armies[0].speed,79.69);
});
test('request options cannot create siege or speed bonuses from an ordinary source',()=>{
  const s=fresh(),a=E.dispatch(s,'blue',0,1,100,{siegeBoost:true,marchBoost:true});
  assert.equal(a.siegeBoost,false);assert.equal(a.speed,85);assert.equal(E.siegeOutcome(s,a,s.castles[1]).strength,100);
});
test('AI defense cannot buy reinforcements with any treasury amount',()=>{
  for(const gold of [0,99,100,1000]){
    const s=fresh();s.players.blue.gold=gold;s.castles[0].level=5;s.castles[0].troops=50;
    for(const c of s.castles)if(c.owner===null)c.troops=10000;
    E.dispatch(s,'red',1,0,200);E.aiForPlayer(s,'blue');
    assert.equal(s.castles[0].troops,50);assert.equal(s.players.blue.gold,gold);
  }
});
function legacyState(){
  const s=fresh();s.version=4;s.nextTrainId=2;
  for(const c of s.castles){c.units={soldier:0,archer:c.troops,knight:0,cavalry:0};c.trainingQueue=[];}
  s.castles[0].trainingQueue=[{id:2,type:'soldier',count:10,cost:5,totalTime:20,timeRemaining:10}];
  s.players.blue.unit='cavalry';s.players.blue.gold=195;
  return s;
}
test('v4 saves preserve garrisons and refund pending queues while removing roster fields',()=>{
  const s=legacyState(),before=structuredClone(s),loaded=E.deserialize(s);
  assert.ok(loaded);assert.deepEqual(s,before);assert.equal(loaded.version,E.VERSION);assert.equal(loaded.players.blue.gold,200);
  assert.deepEqual(loaded.castles.map(c=>c.troops),s.castles.map(c=>c.troops));
  assert.ok(loaded.castles.every(c=>!('units' in c)&&!('trainingQueue' in c)));assert.equal(loaded.players.blue.unit,undefined);
  assert.ok(E.deserialize(E.serialize(loaded)));
});
test('legacy mixed marching armies convert without teleporting or receiving unit bonuses',()=>{
  const s=legacyState();s.castles[0].trainingQueue=[];const a=E.dispatch(s,'blue',0,1,100);
  // Model a v4 cavalry army moving at its former class-based speed.
  a.units={soldier:0,archer:0,knight:0,cavalry:100};a.speed=106.25;a.duration=a.length/a.speed;a.t=a.duration*.37;
  s.castles[0].units.archer=s.castles[0].troops;
  const pos=E.position(a),loaded=E.deserialize(s);assert.ok(loaded);
  assert.equal(loaded.armies[0].count,100);assert.equal(loaded.armies[0].units,undefined);assert.equal(loaded.armies[0].speed,85);
  near(E.position(loaded.armies[0]).x,pos.x);near(E.position(loaded.armies[0]).y,pos.y);
});
test('malformed legacy queues and compositions cannot inject resources during migration',()=>{
  for(const corrupt of [s=>s.castles[0].units.archer=-1,s=>s.castles[0].trainingQueue[0].cost=Infinity,s=>s.castles[0].trainingQueue[0].timeRemaining=0,s=>s.castles[0].trainingQueue=[null]]){
    const s=legacyState();corrupt(s);assert.equal(E.deserialize(s),null);
  }
});
test('instant and progressive combat use ordinary troop counts',()=>{
  const s=fresh(),a=E.dispatch(s,'blue',0,1,100),b=E.dispatch(s,'red',1,0,100);E.battleGroups(s,[a,b]);
  assert.equal(a.count,0);assert.equal(b.count,0);
  const p=fresh(),c=E.dispatch(p,'blue',0,1,100),d=E.dispatch(p,'red',1,0,100);E.engageBattle(p,[c,d]);E.tickBattles(p,.1);
  assert.equal(c.count,d.count);assert.ok(c.count<100);assert.ok(E.deserialize(E.serialize(p)));
});
