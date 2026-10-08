'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const E=require('../dist/engine.js');
function scene(paths){
 const s=E.create(42);s.aiDisabled=true;s.progressiveCombat=true;
 s.armies=paths.map((path,i)=>({id:100+i,owner:i%2?'red':'blue',count:80,units:{soldier:80},source:i%2?1:0,target:i%2?0:1,path,x:path[0].x,y:path[0].y,tx:path.at(-1).x,ty:path.at(-1).y,speed:1000,length:E.routeLength(path),t:0,duration:E.routeLength(path)/1000,revision:1,intercept:null}));
 return s;
}
test('fast crossing paths collide between sampled endpoints',()=>{
 const s=scene([[{x:990,y:750},{x:1990,y:750}],[{x:1000,y:740},{x:1000,y:1740}]]);E.tick(s,.025);assert.equal(s.battles.length,1);assert.ok(s.armies.every(a=>a.inBattle));
});
test('separated parallel paths stay independent and retain travel time',()=>{
 const s=scene([[{x:500,y:500},{x:1500,y:500}],[{x:500,y:520},{x:1500,y:520}]]);E.tick(s,.025);assert.equal(s.battles.length,0);assert.ok(s.armies.every(a=>a.t===.025));
});
test('near-contact tolerance is retained by the swept rejection bounds',()=>{
 const s=scene([[{x:500,y:500},{x:1500,y:500}],[{x:500,y:512.0000002},{x:1500,y:512.0000002}]]);E.tick(s,.025);assert.equal(s.battles.length,1);
});
test('a corner followed by a crossing still produces one contact group',()=>{
 const s=scene([[{x:990,y:740},{x:1000,y:740},{x:1000,y:1740}],[{x:980,y:750},{x:1980,y:750}]]);E.tick(s,.025);assert.equal(s.battles.length,1);assert.ok(s.armies.every(a=>a.inBattle));
});
