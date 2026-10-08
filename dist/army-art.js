/* Presentation-only modular art. Geometry is projected once into shared SVG assets.
   No simulation writes; no per-unit physics, textures, filters or skinned meshes. */
(function(root){
'use strict';
const themes={
 '17th':{stone:['#a29b85','#746f60','#494e48'],roof:['#606c71','#323e49'],coat:'#655c48',hat:'morion'},
 '18th':{stone:['#bbb09a','#88806c','#555b55'],roof:['#627584','#344752'],coat:'#707b7c',hat:'tricorne'},
 '19th':{stone:['#ac9280','#80685b','#4e4a45'],roof:['#68716e','#354343'],coat:'#59676f',hat:'kepi'},
 '20th':{stone:['#a0a69a','#747d73','#48534e'],roof:['#788071','#414d43'],coat:'#68735b',hat:'helmet'}
};
const assets=new Map();
const poly=(p,fill,stroke='#252d2b',sw=.45)=>`<polygon points="${p.map(v=>v.join(',')).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>`;
const path=(d,stroke,w=1,fill='none')=>`<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const ellipse=(x,y,rx,ry,fill)=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}"/>`;
const P=(x,y,z=0)=>[+(x-y).toFixed(2),+((x+y)*.46-z).toFixed(2)];
function box(x,y,w,d,h,mat,z=0,detail=false){
 const a=P(x,y,z),b=P(x+w,y,z),c=P(x+w,y+d,z),e=P(x,y+d,z),A=P(x,y,z+h),B=P(x+w,y,z+h),C=P(x+w,y+d,z+h),D=P(x,y+d,z+h);
 let s=poly([e,c,C,D],mat[1])+poly([b,c,C,B],mat[2])+poly([A,B,C,D],mat[0])+path(`M${A}L${D}L${C}`,mat[0],.65);
 if(detail){for(let j=4;j<h;j+=5){s+=path(`M${P(x,y+d,z+j)}L${P(x+w,y+d,z+j)}L${P(x+w,y,z+j)}`,'#262e292c',.55);for(let k=3+(j%2)*3;k<w;k+=7)s+=path(`M${P(x+k,y+d,z+j)}l0 -4`,'#25292344',.45);}}
 return s;
}
function roof(x,y,w,d,h,z,t){
 let s=poly([P(x-1,y-1,z),P(x+w+1,y-1,z),P(x+w/2,y-1,z+h)],t.roof[1])+poly([P(x+w/2,y-1,z+h),P(x+w/2,y+d+1,z+h),P(x+w+1,y+d+1,z),P(x+w+1,y-1,z)],t.roof[1])+poly([P(x-1,y-1,z),P(x+w/2,y-1,z+h),P(x+w/2,y+d+1,z+h),P(x-1,y+d+1,z)],t.roof[0]);
 for(let i=2;i<d;i+=2.3)s+=path(`M${P(x-1,y+i,z)}L${P(x+w/2,y+i,z+h)}L${P(x+w+1,y+i,z)}`,'#101b2348',.55);
 s+=path(`M${P(x+w/2,y-1,z+h)}L${P(x+w/2,y+d+1,z+h)}`,'#abb2a5',.7);
 for(let i=4;i<d-2;i+=8){s+=poly([P(x+2,y+i,z+2),P(x+6,y+i,z+6),P(x+6,y+i+4,z+6),P(x+2,y+i+4,z+2)],'#a7a391');s+=path(`M${P(x+2,y+i+2,z+3)}v3`,'#152932',1.4);}
 return s;
}
function flag(x,y,z,color,size=10){const [a,b]=P(x,y,z);return path(`M${a} ${b+12}V${b-15}`,'#c5b99a',.9)+path(`M${a+.5} ${b-15}q${size*.5} -1 ${size} 2l-1 8q-${size*.5} -3 -${size-1} -1Z`,'#121d25',.45,color)+path(`M${a+2} ${b-13}v6`,'#dcc99d',.7);}
// Era and rank are orthogonal. Recipes contain geometry, not just palette swaps.
const stageNames=['Outpost','Reinforced outpost','Stronghold','Regional fortress','Elite fortress'];
const eraKits={
 '17th':{model:'rough-stone-bastion',roof:'gable',tower:'stone',foundation:'earth',wall:[5,8,11,14,17],hall:[12,17,22,27,32],towerH:[11,15,19,23,27],roofH:9,signature:'pikes',materials:themes['17th']},
 '18th':{model:'formal-star-fort',roof:'hip',tower:'bastion',foundation:'gravel',wall:[5,8,11,14,17],hall:[12,17,22,27,32],towerH:[7,10,13,16,19],roofH:7,signature:'cannon',materials:themes['18th']},
 '19th':{model:'industrial-garrison',roof:'sawtooth',tower:'blockhouse',foundation:'paving',wall:[4,6,8,10,12],hall:[12,17,22,27,32],towerH:[9,12,15,18,21],roofH:4,signature:'chimney',materials:themes['19th']},
 '20th':{model:'concrete-command-base',roof:'slab',tower:'bunker',foundation:'concrete',wall:[3,5,7,9,11],hall:[7,10,13,16,19],towerH:[5,7,9,11,13],roofH:2,signature:'radar',materials:themes['20th']}
};
const roleKits={
 gold:{name:'ECONOMY',width:22,height:0,roofPalette:['#ad965e','#736442'],prop:{'17th':'market','18th':'market','19th':'freight','20th':'cargo'},wing:'warehouse'},
 troop:{name:'TROOP',width:31,height:0,roofPalette:['#827c70','#504e47'],prop:{'17th':'pikes','18th':'drill','19th':'drill','20th':'cargo'},wing:'barracks'},
 cavalry:{name:'CAVALRY',width:20,height:0,roofPalette:['#956f51','#604b3a'],prop:{'17th':'horse','18th':'horse','19th':'horse','20th':'vehicle'},wing:'depot'},
 archer:{name:'RANGED',width:17,height:12,prop:{'17th':'pikes','18th':'cannon','19th':'cannon','20th':'radar'},wing:'lookout'},
 small:{name:'DEFENSE',width:15,height:9,prop:{'17th':'pikes','18th':'cannon','19th':'searchlight','20th':'radar'},wing:'lookout'},
 knight:{name:'HEAVY',width:24,height:3,prop:{'17th':'pikes','18th':'cannon','19th':'freight','20th':'vehicle'},wing:'barracks'},
 main:{name:'CAPITAL',width:29,height:8,prop:{'17th':'market','18th':'cannon','19th':'freight','20th':'radar'},wing:'command',capital:true},
 elite:{name:'CITADEL',width:28,height:11,prop:{'17th':'pikes','18th':'cannon','19th':'searchlight','20th':'radar'},wing:'command',capital:true}
};
const stages=[
 {towers:1,wings:0,props:1,ring:false,banners:1},
 {towers:2,wings:1,props:2,ring:false,banners:1},
 {towers:3,wings:2,props:3,ring:false,banners:2},
 {towers:4,wings:3,props:4,ring:true,banners:2},
 {towers:4,wings:3,props:5,ring:true,banners:3,landmark:true}
];
const freezeDeep=o=>{Object.values(o).forEach(v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v))freezeDeep(v);});return Object.freeze(o);};
const structureRegistry={};
for(const [era,kit] of Object.entries(eraKits))for(const [role,r] of Object.entries(roleKits))for(let rank=1;rank<=5;rank++){
 const stage=stages[rank-1],h=kit.hall[rank-1]+r.height,modules=[];
 const push=(kind,x,y,w,d,height,extra={})=>modules.push({kind,x,y,w,d,h:height,...extra});
 push('hall',-r.width/2,-17,r.width,22,h,{roof:kit.roof,roofH:kit.roofH});
 const wings={warehouse:[[-27,0,11,19],[16,-20,11,19],[2,10,19,10]],barracks:[[-27,-1,10,25],[16,-20,10,28],[-10,12,29,8]],depot:[[-28,-2,12,28],[13,-20,14,27],[-9,12,29,8]],lookout:[[-26,4,9,14],[18,-20,9,17],[6,13,13,8]],command:[[-27,0,12,22],[16,-20,12,24],[-9,12,28,10]]}[r.wing];
 for(const [x,y,w,d] of wings.slice(0,stage.wings))push('hall',x,y,w,d,7+rank,{roof:kit.roof,roofH:kit.roofH,usage:r.wing});
 for(const [x,y,w,d] of [[-30,-28,59,3],[-30,-25,3,50],[-29,25,49,4],[25,-24,4,44]])push('wall',x,y,w,d,kit.wall[rank-1]);
 for(const [x,y] of [[-25,-23],[22,8],[-25,21],[22,-23]].slice(0,stage.towers))push(kit.tower,x-4,y-4,9,9,kit.towerH[rank-1]);
 if(stage.ring){push('wall',-29,30,43,2,kit.wall[rank-1]*.4);push('wall',30,-24,2,39,kit.wall[rank-1]*.4);}
 for(let i=0;i<stage.props;i++)push(r.prop[era],-17+i*8,33,5,5,4,{foreground:true});
 push(kit.signature,19,-19,5,5,12+rank*3);
 if(stage.landmark)push('hall',-7,-13,14,12,h+(r.capital?14:7),{roof:kit.roof,roofH:kit.roofH});
 // Era-specific engineering also changes the compound plan at every rank.
 const engineering={
  '17th':[['palisade',-27,5,5,16,7]],
  '18th':[['bastion',-31,17,13,13,kit.wall[rank-1]],['cannon',-23,20,6,4,5]],
  '19th':[['rail',-17,8,32,5,1],['chimney',13,-22,4,4,18+rank*3]],
  '20th':[['bunker',-28,4,14,18,5+rank],['barrier',-16,30,26,3,3]]
 };
 for(const args of engineering[era])push(...args);
 const key=`${era.slice(0,2)}C_${r.name}_L${rank}`;
 structureRegistry[key]=freezeDeep({key,era,role,level:rank,name:stageNames[rank-1],model:kit.model,materials:{...kit.materials,roof:r.roofPalette||kit.materials.roof},modules,props:r.prop[era],banners:{count:stage.banners,height:h+kit.roofH+5},foundation:{kind:kit.foundation,contactShadow:true},vfx:{kind:'construction',duration:1100},capital:!!r.capital});
}
freezeDeep(structureRegistry);
function getStructureVisual(era,role,upgradeLevel){
 if(!eraKits[era]||!roleKits[role]||!Number.isInteger(upgradeLevel)||upgradeLevel<1||upgradeLevel>5)throw new RangeError(`Unknown structure visual: ${era}/${role}/${upgradeLevel}`);
 return structureRegistry[`${era.slice(0,2)}C_${roleKits[role].name}_L${upgradeLevel}`];
}
root.CrownStructureVisuals=Object.freeze({getStructureVisual,registry:structureRegistry,maxLevel:5});
function structure(type,owner,level=1,epoch='18th'){
 const visual=getStructureVisual(epoch,type,level),key=`${visual.key}:${owner}`;
 if(assets.has(key))return assets.get(key);
 const t=visual.materials,stone=t.stone,a=root.CrownAnchors.structure(type,epoch),color=root.CrownMapStyle.factions[owner]||'#929385';
 const parts=[],add=(depth,s)=>parts.push({depth,s});
 const roofBuilders={
  gable:m=>roof(m.x,m.y,m.w,m.d,m.roofH,m.h,t),
  hip:m=>poly([P(m.x-1,m.y-1,m.h),P(m.x+m.w+1,m.y-1,m.h),P(m.x+m.w+1,m.y+m.d+1,m.h),P(m.x-1,m.y+m.d+1,m.h)],t.roof[1])+poly([P(m.x-1,m.y+m.d+1,m.h),P(m.x+m.w/2,m.y+3,m.h+m.roofH),P(m.x+m.w/2,m.y+m.d-3,m.h+m.roofH)],t.roof[0])+poly([P(m.x+m.w/2,m.y+3,m.h+m.roofH),P(m.x+m.w/2,m.y+m.d-3,m.h+m.roofH),P(m.x+m.w+1,m.y+m.d+1,m.h),P(m.x+m.w+1,m.y-1,m.h)],t.roof[1]),
  sawtooth:m=>Array.from({length:3},(_,i)=>roof(m.x+i*m.w/3,m.y,m.w/3,m.d,m.roofH,m.h,t)).join(''),
  slab:m=>box(m.x-1,m.y-1,m.w+2,m.d+2,2,t.roof.concat(t.roof[1]),m.h)
 };
 const at=(m,s)=>`<g transform="translate(${P(m.x,m.y)})">${s}</g>`;
 const fittings={
  pikes:m=>at(m,path('M0 1v-12m-2 3l2 -5l2 5M4 3v-10','#aca48c',.9)),
  drill:m=>at(m,path('M0 2v-8m-3 3h6M5 4v-8m-2 2h5','#9a907c',1.2)),
  cannon:m=>at(m,ellipse(-2,0,2.5,3,'#242d29')+ellipse(4,3,2.5,3,'#242d29')+path('M0 -1l7 -7','#60685d',3)+path('M0 -2l7 -7','#adb09a',.8)),
  horse:m=>at(m,path('M-3 0h6l2 -5h2l1 3l-3 4v4m-6 -5v5M-3 0l-2 3','#4e3d2c',1.8)),
  market:m=>box(m.x,m.y,5,5,4,['#bba16b','#897647','#534d38'])+roof(m.x-1,m.y-1,7,6,2,8,{roof:['#c0a467','#847449']}),
  cargo:m=>box(m.x,m.y,5,5,4,['#989878','#66694f','#424c3d']),
  freight:m=>box(m.x,m.y,6,5,4,['#a28b66','#796346','#4e4436'])+at(m,path('M-3 1l6 3m-3 -6v6','#c3b092',.7)),
  vehicle:m=>box(m.x,m.y,7,5,4,['#85907c','#56664e','#34473b'])+at(m,ellipse(-3,3,1.5,2,'#162020')+ellipse(3,6,1.5,2,'#162020')),
  radar:m=>at(m,path(`M0 0v-${m.h}`,'#b2b6a8',1.2)+path(`M-6 ${-m.h}q6 8 12 0l-6 -4Z`,'#b0bbaa',.7,'#65796d')),
  searchlight:m=>at(m,path(`M0 0v-${m.h}`,'#8f998d',1.2)+ellipse(0,-m.h,3,2,'#d2cbaa')),
  chimney:m=>box(m.x,m.y,m.w,m.d,m.h,['#b29379','#865e4c','#514239'],0,true)+box(m.x-1,m.y-1,m.w+2,m.d+2,2,stone,m.h),
  rail:m=>path(`M${P(m.x,m.y)}L${P(m.x+m.w,m.y)}M${P(m.x,m.y+4)}L${P(m.x+m.w,m.y+4)}`,'#8a9287',1)+Array.from({length:9},(_,i)=>path(`M${P(m.x+i*4,m.y-1)}L${P(m.x+i*4,m.y+5)}`,'#4b4436',1)).join(''),
  barrier:m=>box(m.x,m.y,m.w,m.d,m.h,stone),
  palisade:m=>Array.from({length:6},(_,i)=>box(m.x,m.y+i*3,2,2,m.h,['#a29271','#74694f','#4a4838'])).join('')
 };
 const builders={
  hall:m=>{let s=box(m.x,m.y,m.w,m.d,m.h,stone,0,true)+roofBuilders[m.roof](m);for(let k=4;k<m.w;k+=6)s+=path(`M${P(m.x+k,m.y+m.d,m.h-4)}v3`,'#1d2d2b',1.7);return s;},
  wall:m=>box(m.x,m.y,m.w,m.d,m.h,stone,0,true),
  stone:m=>box(m.x,m.y,m.w,m.d,m.h,stone,0,true)+roof(m.x,m.y,m.w,m.d,6,m.h,t),
  bastion:m=>{const points=[[m.x-3,m.y+2],[m.x+2,m.y-3],[m.x+m.w,m.y],[m.x+m.w,m.y+m.d],[m.x,m.y+m.d]];return poly(points.map(([x,y])=>P(x,y)),stone[2])+poly([P(m.x,m.y+m.d),P(m.x+m.w,m.y+m.d),P(m.x+m.w,m.y+m.d,m.h),P(m.x,m.y+m.d,m.h)],stone[1])+poly(points.map(([x,y])=>P(x,y,m.h)),stone[0]);},
  blockhouse:m=>box(m.x,m.y,m.w,m.d,m.h,stone,0,true)+box(m.x-1,m.y-1,m.w+2,m.d+2,2,stone,m.h)+at(m,path(`M-3 ${-m.h+3}l7 3`,'#213132',1.4)),
  bunker:m=>box(m.x,m.y,m.w,m.d,m.h,stone)+box(m.x-2,m.y-2,m.w+4,m.d+4,3,t.roof.concat(t.roof[1]),m.h)+path(`M${P(m.x+2,m.y+m.d,m.h-1)}L${P(m.x+m.w-2,m.y+m.d,m.h-1)}`,'#172923',1.5),
  ...fittings
 };
 for(const m of visual.modules)add(m.foreground?90:m.x+m.y+m.w+m.d,builders[m.kind](m));
 const wall=eraKits[epoch].wall[level-1];
 add(80,box(17,25,4,5,wall+3,stone)+box(25,17,5,4,wall+3,stone)+poly([[-9,22-wall],[0,26-wall],[9,22-wall],[9,19-wall],[0,23-wall],[-9,19-wall]],stone[0])+path(`M-6 24v-${wall}M6 24v-${wall}`,stone[1],2));
 const bannerSites=[[0,-4,visual.banners.height],[23,23,wall+8],[-24,22,wall+8]];
 for(const [x,y,h] of bannerSites.slice(0,visual.banners.count))add(100,flag(x,y,h,color,visual.capital?13:9));
 const beds={earth:'#706b5090',gravel:'#85836a80',paving:'#77796990',concrete:'#81877990'};
 let s='<defs><radialGradient id="contact"><stop stop-color="#020607" stop-opacity=".65"/><stop offset="1" stop-color="#020607" stop-opacity="0"/></radialGradient></defs>'+ellipse(3,5,67,28,'url(#contact)')+poly([P(-31,-28),P(31,-28),P(32,30),P(-31,30)],beds[visual.foundation.kind],'#74776160',.4);
 for(let i=-24;i<27;i+=6)s+=path(`M${P(i,-25)}L${P(i,26)}`,'#acaa9020',.5);
 s+=parts.sort((a,b)=>a.depth-b.depth).map(p=>p.s).join('');
 // Fix the transform for a role/era across every rank; upgrades never shrink or shift.
 const z=Math.min(a.w/150,(-a.sprite.y+a.gate.y-3)/108);
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${a.sprite.x} ${a.sprite.y} ${a.w} ${a.h}"><g transform="translate(${a.gate.x} ${a.gate.y-25*z}) scale(${z})">${s}</g></svg>`;
 const result=`<image class="castle-sprite-img evolved-structure epoch-${epoch} role-${type}" data-visual-key="${visual.key}" data-model="${visual.model}" data-level="${level}" data-era="${epoch}" data-role="${type}" href="data:image/svg+xml,${encodeURIComponent(svg)}" x="${a.sprite.x}" y="${a.sprite.y}" width="${a.w}" height="${a.h}"/>`;
 assets.set(key,result);return result;
}
function figure(type,color,epoch='18th',phase=0){
 const t=themes[epoch]||themes['18th'],modern=epoch==='20th',mounted=type==='cavalry'||type==='horseknight',heavy=type==='knight'||type==='elite',ranged=type==='archer';
 let s=ellipse(0,1,mounted?12:5.5,mounted?4:2.5,'#02060966');
 if(mounted&&modern){s+=box(-9,-5,20,10,7,['#8a947c','#56674e','#34483e'],2)+box(-3,-4,8,8,7,['#879481','#526e67','#304b4b'],9)+box(-9,-5,6,10,2,['#b1b398',color,'#2b4140'],10);for(const x of [-7,7]){const p=P(x,6,2);s+=ellipse(p[0],p[1],3,4,'#151e20')+ellipse(p[0],p[1],1.2,2,'#8d9386');}return s+path('M2 -16l10 -3','#a6afa3',1);}
 let y=mounted?-12:0;
 if(mounted){s+=path(`M-10 -3l${phase?2:-1} 8m5 -8l${phase?-2:2} 8m10 -8l${phase?-2:1} 8m4 -10l${phase?1:-2} 8`,'#312c27',2.2)+path('M-13 -8Q-8 -13 3 -10L7 -19L11 -18L13 -12L8 -10L7 -2Q-2 2 -10 -3Z','#2e302b',.65,'#74604a')+path('M8 -17L6 -10M-9 -8Q-1 -5 6 -10','#c1a77e',.6)+path('M-12 -8q-6 1 -5 7','#302f2c',1.8)+poly([[-6,-12],[2,-12],[3,-5],[-5,-5]],color);}
 s+=`<g transform="translate(0 ${y})">`;
 const stride=phase?2:-2;
 s+=path(`M-2 -7L${-2+stride} -1l-2 0M2 -7L${2-stride} 0l2 0`,'#242e32',2.3);
 s+=path('M-3 -17L3 -16L4 -7L-4 -7Z','#273337',.5,heavy&&epoch==='17th'?'#8a9497':t.coat);
 s+=path('M-2 -16L0 -8L-3 -8Z',color,1.2,color)+path('M1 -16l2 8','#d0c1a0',.9)+path('M-3 -10h6','#262c29',1.2);
 if(heavy)s+=path('M-4 -15L3 -15L3 -10L-3 -10Z','#bdc0ae',.6,modern?'#4b584c':'#75818a');
 s+=ellipse(0,-20,2.7,3.1,'#bca187')+path('M1 -21l2 1v2l-2 1','#6d665b',.65);
 if(t.hat==='morion')s+=path('M-4 -22Q0 -28 4 -21L-4 -21M0 -25v-2','#39454b',.7,'#9ba8a7');
 else if(t.hat==='tricorne')s+=path('M-5 -23L-1 -26L2 -23L5 -24L3 -20L-3 -20Z','#1b272e',.6,heavy?'#4c5354':'#343e42')+path('M-4 -23l3 1l3 -1','#cbb986',.7);
 else if(t.hat==='kepi')s+=path('M-3 -24h5v4h-5ZM0 -20h5','#28373f',.7,'#5e727e');
 else s+=path('M-4 -21Q-3 -27 2 -25Q4 -24 4 -21Z','#2c3d36',.7,'#859078');
 s+=path('M-3 -15l-2 5l5 1M3 -15l3 3l2 -2',t.coat,2.2);
 if(!modern&&heavy&&epoch==='17th')s+=path('M6 -1L7 -35','#9f9171',1)+path('M7 -39l-1 5h2Z','#c4cecc',.5,'#bdc8c7');
 else if(mounted)s+=path('M5 -13Q14 -19 14 -26','#c6c9bd',1.1);
 else if(type==='bowman')s+=path('M7 -25Q17 -15 7 -5M7 -25V-5','#b3a581',1);
 else{s+=path(ranged?'M0 -12L15 -16':'M1 -9L9 -27','#564936',2)+path(ranged?'M9 -14L19 -17':'M6 -21L11 -31','#b2b8ae',.9);if(ranged&&modern)s+=path('M8 -14l-2 9m3 -9l5 8','#65756d',1);}
 if(modern)s+=path('M-5 -15v6','#a5a28a',2.5);return s+'</g>';
}
function sprite(type,color,epoch,phase=0){const key=`unit:${epoch}:${type}:${color}:${phase}`;if(!assets.has(key)){const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-25 -46 52 58">${figure(type,color,epoch,phase)}</svg>`;assets.set(key,`data:image/svg+xml,${encodeURIComponent(svg)}`);}return assets.get(key);}
function roster(entity,budget){
  const total=entity.count||0;
  const count=Math.min(budget,total,Math.ceil(Math.sqrt(total)*1.65));
  return Array.from({length:count},()=> 'soldier');
}
root.CrownArmyArt=Object.freeze({themes,structure,figure,sprite,roster,cacheSize:()=>assets.size});
})(window);
