/* Browser/server adapter: one shared AI implementation in engine.js. */
(function(root){
  'use strict';
  const aiForPlayer=(s,p)=>root.CrownEngine.aiForPlayer(s,p);
  function step(s){
    if(!s||s.paused||s.aiDisabled||s.result)return;
    for(const p of (s.botPlayers||Object.keys(s.players).filter(p=>p!=='blue'))){
      if(s.players[p])aiForPlayer(s,p);
    }
  }
  const api={step,aiForPlayer};
  if(typeof module!=='undefined')module.exports=api;
  root.CrownAI=api;
})(typeof window==='undefined'?globalThis:window);
