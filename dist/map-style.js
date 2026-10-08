/* Crownfall battlefield materials. Visual-only: never writes match state or topology. */
(function () {
  'use strict';
  const factions = {blue:'#689fc7',red:'#be6861',green:'#7d9e83',purple:'#a58bbd',neutral:'#919b99'};
  const biomes = [
    ['Verdant Isles','#414a3d','#272f2b',1.15],
    ['Kings Crossroads','#484b40','#2b3230',.8],
    ['Three Bridges','#454c43','#2b3634',.9],
    ['Iron Gorge','#494b49','#2b3032',.5],
    ['Sunken Atoll','#414b43','#263331',1.05],
    ['Tri-Island Caldera','#4b4841','#30332f',.8],
    ['Warlords Delta','#3f4c45','#253431',1.2],
    ['Four Kings','#4b4d42','#2c3431',.85],
    ['Four Realms','#424b45','#263331',1],
    ['Europe','#4d4c40','#30362f',.85],
    ['Orient','#4c4c3e','#2c3630',1.2]
  ];
  const palette={sea:'#0b1c27',shore:'#777d75',roof:'#35434b',road:'#99917c',stone:['#a0aaa6','#727f80','#47565e']};
  const textures=new Map(), coasts=new Map(), routeSamples=new Map();
  const biome=s=>biomes[s.mapIndex]||biomes[0];
  const rgb=h=>h.match(/\w\w/g).map(v=>parseInt(v,16));
  const terrainPlates = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  // Lossless exports keep the original geometry and pixels; hashes invalidate browser caches.
  const terrainAssets = {
    0:'terrain_0.webp',
    1:'terrain-premium-1.95b18c54c93f.webp',
    2:'terrain-premium-2.8d94331e2a6a.webp',
    3:'terrain-premium-3.c3ff28339bfa.webp',
    4:'terrain-premium-4.1a245dd3f4ce.webp',
    5:'terrain-premium-5.2f5596c093bd.webp',
    6:'terrain-premium-6-v3.03f7bb840b20.webp',
    7:'terrain-premium-7.0c72479e0e67.webp',
    8:'terrain-premium-8.911e798b04c4.webp',
    9:'terrain-premium-9-v2.f2d02947c97a.webp',
    10:'terrain-premium-10-v2.5daaea9fc161.webp'
  };
  function hasTerrainPlate(idx){ return terrainPlates.has(Number(idx)); }

  function terrain(s){
    const key = s.mapIndex || 0;
    if (terrainAssets[key]) return `assets/battlefield/${terrainAssets[key]}`;
    if (hasTerrainPlate(key)) return `assets/battlefield/terrain_${key}.webp`;
    if (textures.has(key)) return textures.get(key);
    const canvas = document.createElement('canvas'); canvas.width = 1100; canvas.height = 750;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><path fill="${biome(s)[2]}" d="M0 0h1v1H0z"/></svg>`);
    const im=ctx.createImageData(1100,750),a=rgb(biome(s)[1].slice(1)),b=rgb(biome(s)[2].slice(1));
    const hash=(x,y)=>{let n=Math.imul(x+key*173,374761393)+Math.imul(y,668265263);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967295;};
    const noise=(x,y,scale)=>{x/=scale;y/=scale;const ix=Math.floor(x),iy=Math.floor(y);let u=x-ix,v=y-iy;u=u*u*(3-2*u);v=v*v*(3-2*v);return hash(ix,iy)*(1-u)*(1-v)+hash(ix+1,iy)*u*(1-v)+hash(ix,iy+1)*(1-u)*v+hash(ix+1,iy+1)*u*v;};
    for(let y=0;y<750;y++)for(let x=0;x<1100;x++){
      const macro=noise(x,y,140),broad=noise(x,y,45),med=noise(x,y,18),fine=hash(x,y);
      const t=0.15+macro*0.35+broad*0.32+med*0.18;
      const rock=noise(x,y,8)>0.62,dirt=med<0.28;
      const grain=(fine-0.5)*14;
      const k=(y*1100+x)*4;
      for(let c=0;c<3;c++){
        let val=b[c]+(a[c]-b[c])*t+grain;
        if(rock)val+=12;
        if(dirt&&c===0)val+=6;
        im.data[k+c]=Math.max(0,Math.min(255,val));
      }
      im.data[k+3]=255;
    }
    ctx.putImageData(im,0,0);
    const url=canvas.toDataURL();textures.set(key,url);return url;
  }

  function defs(){return `
    <radialGradient id="contactShadowTight" cx="48%" cy="50%" r="52%"><stop offset="0%" stop-color="#010306" stop-opacity=".88"/><stop offset="55%" stop-color="#02050a" stop-opacity=".65"/><stop offset="85%" stop-color="#02050a" stop-opacity=".22"/><stop offset="100%" stop-color="#02050a" stop-opacity="0"/></radialGradient>
    <radialGradient id="broadCastShadow" cx="42%" cy="38%" r="58%"><stop offset="0%" stop-color="#020508" stop-opacity=".72"/><stop offset="45%" stop-color="#040910" stop-opacity=".45"/><stop offset="75%" stop-color="#050a10" stop-opacity=".18"/><stop offset="100%" stop-color="#050a10" stop-opacity="0"/></radialGradient>
    <radialGradient id="terrainEarthBed" cx="50%" cy="48%" r="50%"><stop offset="0%" stop-color="#141a12" stop-opacity=".42"/><stop offset="55%" stop-color="#1b2116" stop-opacity=".24"/><stop offset="85%" stop-color="#242c1f" stop-opacity=".06"/><stop offset="100%" stop-color="#242c1f" stop-opacity="0"/></radialGradient>
    <linearGradient id="roadApronGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2c271e" stop-opacity=".75"/><stop offset="65%" stop-color="#242017" stop-opacity=".45"/><stop offset="100%" stop-color="#1b1812" stop-opacity="0"/></linearGradient>
    <radialGradient id="groundContact"><stop stop-color="#161b12" stop-opacity=".5"/><stop offset=".6" stop-color="#1e2319" stop-opacity=".28"/><stop offset="1" stop-color="#263023" stop-opacity="0"/></radialGradient>
    <linearGradient id="castleFootFade" x2="0" y2="1"><stop offset="0" stop-color="white"/><stop offset=".91" stop-color="white"/><stop offset="1" stop-color="white" stop-opacity="0"/></linearGradient>
    <mask id="castleEdgeMask" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="url(#castleFootFade)"/></mask>
    <radialGradient id="warSea" gradientUnits="userSpaceOnUse" cx="1100" cy="700" r="1600"><stop stop-color="#142836"/><stop offset=".6" stop-color="#0c1b26"/><stop offset="1" stop-color="#050d15"/></radialGradient>
    <radialGradient id="warMist"><stop stop-color="#91a6ac" stop-opacity=".10"/><stop offset="1" stop-color="#718b99" stop-opacity="0"/></radialGradient>
    <radialGradient id="torchGlow"><stop offset="0%" stop-color="#ffb347" stop-opacity=".85"/><stop offset="40%" stop-color="#ff7b00" stop-opacity=".4"/><stop offset="100%" stop-color="#cc3300" stop-opacity="0"/></radialGradient>
    <radialGradient id="warVignette" cx="50%" cy="50%" r="70%"><stop offset="45%" stop-color="#050c12" stop-opacity="0"/><stop offset="78%" stop-color="#061017" stop-opacity=".35"/><stop offset="100%" stop-color="#02060a" stop-opacity=".75"/></radialGradient>
    <filter id="mistBlur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="30"/></filter>
    <filter id="contactBlur" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="3"/></filter>
    <filter id="castleDropShadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="12" stdDeviation="12" flood-color="#040b10" flood-opacity="0.75"/></filter>
    <pattern id="warWaves" width="91" height="57" patternUnits="userSpaceOnUse"><path d="M3 18q12-5 26-2m19 27q15-5 29-3M53 6l12-2M6 49l9-2" fill="none" stroke="#90a6ae" stroke-width=".6" opacity=".14"/></pattern>
    <pattern id="warMasonry" width="12" height="8" patternUnits="userSpaceOnUse"><path d="M0 0H12M0 4H12M6 0V4M2 4V8" stroke="#17232c" stroke-width=".55" opacity=".45"/></pattern>
    <symbol id="warPine" viewBox="-16 -48 32 60"><ellipse cy="7" rx="15" ry="5" fill="#081518" opacity=".5"/><path d="M0 7V-32" stroke="#615c49" stroke-width="2"/><path d="M-14 0l7-12-5 1 7-14-3 1L0-45l8 21-3-1 7 14-5-1 7 12-9-2Z" fill="#1d302d"/><path d="M0-45L-8-24l5-2-9 16 6-3-8 13L0-5Z" fill="#415046"/><path d="M0-37l-5 16 5-2m0 2-8 14 8-3" fill="none" stroke="#5b6553" stroke-width=".8" opacity=".6"/></symbol>
    <symbol id="warCrag" viewBox="-44 -60 88 86"><ellipse cy="16" rx="43" ry="10" fill="#0d1b20" opacity=".5"/><path d="M-41 15l13-28 8 4 16-48 14 13 8 30 10-6 15 34-29 9Z" fill="#465252" stroke="#283638"/><path d="M-41 15l21-24 16-48 1 35-11 34Z" fill="#79817a"/><path d="M-4-57L10-44l8 30-13-8-8 32Z" fill="#56625f"/><path d="M-4-48l-8 29m18-17 6 20M-28 0l-8 15M24-13l-3 26" stroke="#a4a495" stroke-width="1" opacity=".45"/></symbol>`;}

  function sea(){return `<g pointer-events="none"><rect x="-5000" y="-5000" width="12000" height="12000" fill="url(#warSea)"/><rect x="-2200" y="-1500" width="6600" height="4500" fill="url(#warWaves)"/></g>`;}

  function coast(vis){
    if(coasts.has(vis.land))return coasts.get(vis.land);
    const p=document.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('d',vis.land);
    if(!p.getTotalLength)return '';
    const length=p.getTotalLength();let marks='', strata='';
    for(let d=0;d<length;d+=7){
      const a=p.getPointAtLength(d),b=p.getPointAtLength(Math.min(d+4,length));
      const cliffLen=12+(d%17);
      marks+=`M${a.x.toFixed(1)} ${a.y.toFixed(1)}l${(b.x-a.x).toFixed(1)} ${cliffLen.toFixed(1)}`;
      if(d%14===0)strata+=`M${a.x.toFixed(1)} ${(a.y+cliffLen*0.6).toFixed(1)}l${(b.x-a.x+2).toFixed(1)} 0`;
    }
    const result=`
      <path d="${vis.land}" transform="translate(0 26)" fill="none" stroke="#06121a" stroke-width="32" opacity=".7"/>
      <path d="${vis.land}" transform="translate(0 18)" fill="#13222a" stroke="#0a151d" stroke-width="12"/>
      <path d="${vis.land}" transform="translate(0 10)" fill="#1c2c34" stroke="#101d24" stroke-width="6"/>
      <path d="${marks}" fill="none" stroke="#3d4c4e" stroke-width="1.8" opacity=".7"/>
      <path d="${strata}" fill="none" stroke="#5a6868" stroke-width="1.2" opacity=".5"/>
      <path d="${vis.land}" transform="translate(0 24)" fill="none" stroke="#7e9fa8" stroke-width="3.5" stroke-dasharray="4 8 16 6" opacity=".4"/>
      <path d="${vis.land}" transform="translate(0 28)" fill="none" stroke="#c0dbe3" stroke-width="1.6" stroke-dasharray="2 12 8 10" opacity=".45"/>
    `;
    coasts.set(vis.land,result);return result;
  }

  const MAP_ROAD_DEFINITIONS = {
    0: {
      main: [[0, 6], [6, 16], [16, 15], [15, 17], [17, 7], [7, 1], [0, 1, 'fast'], [15, 14], [4, 14], [14, 5], [12, 20], [20, 13]],
      secondary: [[0, 2], [2, 4], [1, 3], [3, 5], [0, 8], [8, 18], [18, 10], [10, 12], [1, 9], [9, 19], [19, 11], [11, 13], [6, 12], [7, 13], [2, 6], [3, 7], [16, 4], [17, 5], [0, 1, 'flank']]
    },
    1: {
      main: [[0, 10], [10, 15], [15, 11], [11, 1], [0, 1, 'fast'], [4, 15], [15, 5], [19, 15], [15, 20], [6, 10], [7, 11]],
      secondary: [[0, 2], [2, 17], [17, 4], [1, 3], [3, 18], [18, 5], [0, 8], [8, 12], [12, 14], [14, 19], [1, 9], [9, 13], [13, 16], [16, 20], [2, 6], [3, 7], [6, 19], [7, 20], [0, 1, 'flank']]
    },
    2: {
      main: [[0, 10], [10, 15], [15, 11], [11, 1], [0, 1, 'fast'], [4, 12], [12, 13], [13, 5], [6, 14], [14, 16], [16, 7]],
      secondary: [[0, 2], [2, 17], [17, 4], [1, 3], [3, 18], [18, 5], [0, 8], [8, 19], [19, 6], [1, 9], [9, 20], [20, 7], [2, 10], [3, 11], [8, 10], [9, 11], [12, 15], [15, 13], [14, 15], [15, 16], [0, 1, 'flank']]
    },
    3: {
      main: [[0, 10], [10, 15], [15, 11], [11, 1], [0, 1, 'fast'], [6, 17], [17, 18], [18, 7], [8, 19], [19, 20], [20, 9]],
      secondary: [[0, 12], [12, 6], [1, 13], [13, 7], [0, 14], [14, 8], [1, 16], [16, 9], [6, 10], [7, 11], [8, 10], [9, 11], [17, 15], [15, 18], [19, 15], [15, 20], [2, 12], [3, 13], [4, 14], [5, 16], [0, 1, 'flank']]
    },
    4: {
      main: [[0, 6], [6, 12], [12, 15], [15, 13], [13, 7], [7, 1], [0, 1, 'fast'], [6, 14], [14, 16], [16, 7], [0, 1, 'flank']],
      secondary: [[0, 2], [2, 17], [17, 4], [4, 12], [1, 3], [3, 18], [18, 5], [5, 13], [0, 8], [8, 19], [19, 10], [10, 14], [1, 9], [9, 20], [20, 11], [11, 16], [2, 6], [3, 7], [8, 6], [9, 7]]
    },
    5: {
      main: [[0, 6], [6, 12], [12, 15], [1, 7], [7, 13], [13, 15], [2, 5], [5, 15], [15, 20], [20, 14], [0, 1, 'fast'], [0, 2, 'fast'], [1, 2, 'fast']],
      secondary: [[0, 3], [3, 10], [10, 12], [1, 4], [4, 11], [11, 13], [2, 8], [8, 18], [2, 9], [9, 19], [18, 10], [19, 11], [6, 16], [16, 14], [7, 17], [17, 14], [0, 1, 'flank'], [0, 2, 'flank'], [1, 2, 'flank']]
    },
    6: {
      main: [[0, 6], [6, 15], [1, 7], [7, 15], [2, 5], [5, 15], [0, 1, 'fast'], [0, 2, 'fast'], [1, 2, 'fast'], [19, 15], [15, 20]],
      secondary: [[0, 3], [3, 8], [8, 19], [1, 4], [4, 9], [9, 20], [2, 17], [17, 8], [2, 18], [18, 9], [0, 10], [10, 12], [12, 6], [1, 11], [11, 13], [13, 7], [3, 14], [4, 16], [12, 15], [13, 15], [0, 1, 'flank'], [0, 2, 'flank'], [1, 2, 'flank']]
    },
    7: {
      main: [[0, 8], [8, 15], [1, 9], [9, 15], [2, 19], [19, 15], [3, 20], [20, 15], [0, 1, 'fast'], [2, 3, 'fast'], [0, 2, 'fast'], [1, 3, 'fast']],
      secondary: [[0, 4], [4, 10], [10, 8], [1, 5], [5, 11], [11, 9], [2, 12], [12, 17], [17, 19], [3, 13], [13, 18], [18, 20], [0, 6], [6, 8], [1, 7], [7, 9], [2, 14], [14, 19], [3, 16], [16, 20], [10, 15], [11, 15], [17, 15], [18, 15], [0, 1, 'flank'], [2, 3, 'flank']]
    },
    8: {
      main: [[0, 19], [19, 8], [8, 15], [1, 20], [20, 9], [9, 15], [2, 17], [17, 15], [3, 18], [18, 15], [0, 1, 'fast'], [2, 3, 'fast'], [0, 2, 'fast'], [1, 3, 'fast']],
      secondary: [[0, 4], [4, 12], [12, 17], [1, 5], [5, 13], [13, 17], [0, 6], [6, 14], [14, 18], [1, 7], [7, 16], [16, 18], [8, 10], [10, 6], [9, 11], [11, 7], [4, 8], [5, 9], [12, 15], [13, 15], [14, 15], [16, 15], [0, 1, 'flank'], [2, 3, 'flank']]
    },
    9: {
      main: [[0, 2], [2, 12], [12, 15], [15, 13], [13, 3], [3, 1], [0, 1, 'fast'], [4, 14], [14, 15], [15, 16], [16, 5]],
      secondary: [[0, 8], [8, 17], [17, 4], [1, 9], [9, 18], [18, 5], [0, 6], [6, 19], [19, 10], [10, 12], [1, 7], [7, 20], [20, 11], [11, 13], [2, 6], [3, 7], [14, 2], [16, 3], [0, 1, 'flank']]
    },
    10: {
      main: [[0, 6], [6, 12], [12, 15], [1, 7], [7, 13], [13, 15], [2, 5], [5, 15], [15, 20], [20, 14], [0, 1, 'fast'], [0, 2, 'fast'], [1, 2, 'fast']],
      secondary: [[0, 3], [3, 10], [10, 12], [1, 4], [4, 11], [11, 13], [2, 8], [8, 18], [18, 10], [2, 9], [9, 19], [19, 11], [6, 16], [16, 14], [7, 17], [17, 14], [0, 1, 'flank'], [0, 2, 'flank'], [1, 2, 'flank']]
    }
  };

  function clearance(s,vis){
    const routeKey=`${s.mapIndex}:${s.seed}`;
    const samples=routeSamples.get(routeKey)||[];
    if(typeof Path2D==='undefined')return (x,y,r=40)=>!s.castles.some(c=>Math.hypot(c.x-x,c.y-y)<140+r);
    if(!routeSamples.has(routeKey)){
      const doc=document.createElementNS("http://www.w3.org/2000/svg", "svg");
      doc.innerHTML=roads(vis,s);
      for(const p of doc.querySelectorAll('.strategic-roads > path:not(.road-bed)')){
        const n=p.getTotalLength();
        const isMain = p.getAttribute('data-road-type') === 'main';
        const clearanceRadius = isMain ? 28 : 18;
        for(let d=0;d<=n;d+=10){
          const pt=p.getPointAtLength(d);
          samples.push([pt.x*2,pt.y*2,clearanceRadius]);
        }
      }
      if(routeSamples.size>24)routeSamples.clear();
      routeSamples.set(routeKey,samples);
    }
    const land=new Path2D(vis.land),river=vis.river?new Path2D(vis.river):null;
    const ctx=document.createElement('canvas').getContext('2d');
    return (x,y,r=40)=>{
      for(const c of s.castles){
        const a=CrownAnchors.node(s,c);
        const {rx,ry}=a.footprint;
        if(Math.abs(c.x-x)<r+rx+30&&Math.abs(c.y-y)<r+ry+30)return false;
        if(a.orientation==='south'&&Math.abs(c.x-x)<r+35&&y>=c.y&&y<=c.y+ry+45+r)return false;
        if(a.orientation==='north'&&Math.abs(c.x-x)<r+35&&y<=c.y&&y>=c.y-ry-45-r)return false;
        if(a.orientation==='east'&&Math.abs(c.y-y)<r+35&&x>=c.x&&x<=c.x+rx+45+r)return false;
        if(a.orientation==='west'&&Math.abs(c.y-y)<r+35&&x<=c.x&&x>=c.x-rx-45-r)return false;
      }
      if(samples.some(p=>Math.hypot(p[0]-x,p[1]-y)<r+(p[2]||20)))return false;
      for(const [dx,dy] of [[0,0],[-r,0],[r,0],[0,-r],[0,r]])if(!ctx.isPointInPath(land,(x+dx)/2,(y+dy)/2))return false;
      if(river){ctx.lineWidth=28+r;if(ctx.isPointInStroke(river,x/2,y/2))return false;}
      if([4,8].includes(s.mapIndex)&&Math.pow((x/2-550)/(225+r/2),2)+Math.pow((y/2-380)/(160+r/2),2)<1)return false;
      return true;
    };
  }

  function dressing(s,vis,quality){
    const safe=clearance(s,vis),parts=[];
    if(hasTerrainPlate(s.mapIndex)){
      const seed=(s.seed||4173)+991;
      const count=quality==='low'?8:16;
      for(let i=0;i<count*12;i++){
        if(parts.length>=count)break;
        const random=CrownEngine.rng(seed+i*179);
        const x=200+random()*1800,y=200+random()*1100;
        if(!safe(x,y,45))continue;
        const kind=parts.length%3;
        let art='';
        if(kind===0){
          art=`<ellipse cy="6" rx="28" ry="12" fill="#081014" opacity=".5"/>
            <path d="M-12 4 L0-18 L12 4 Z" fill="#4d4434" stroke="#1f1810"/>
            <path d="M-6 4 L0-18 L6 4 Z" fill="#75674c"/>
            <circle cx="2" cy="1" r="9" fill="url(#torchGlow)" opacity=".8"/>
            <circle cx="2" cy="1" r="2.5" fill="#ffeeaa"/>`;
        } else if(kind===1){
          art=`<ellipse cy="8" rx="34" ry="14" fill="#071216" opacity=".55"/>
            <path d="M-22 6 L-8-14 L8 2 L16-8 L24 6 Z" fill="#3b4447" stroke="#192022"/>
            <path d="M-18 6 L-8-14 L-2 6 Z" fill="#586367"/>`;
        } else {
          art=`<ellipse cy="6" rx="24" ry="10" fill="#081418" opacity=".4"/>
            <use href="#warPine" x="-14" y="-36" width="28" height="52"/>
            <use href="#warPine" x="2" y="-30" width="22" height="42"/>`;
        }
        parts.push(`<g class="war-prop" data-x="${x}" data-y="${y}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">${art}</g>`);
      }
      return `<g class="war-environment" pointer-events="none">${parts.join('')}</g>`;
    }
    return '';
  }

  function roads(vis,s){
    const doc=document.createElementNS("http://www.w3.org/2000/svg", "svg");
    doc.innerHTML=vis.roads||'';
    const root=doc.querySelector('.strategic-roads');
    if (s && root) {
      root.querySelectorAll(':scope > path').forEach(p=>p.remove());
      const def = (typeof CrownRoadDefinitions !== 'undefined' && CrownRoadDefinitions[s.mapIndex]) ||
                  (typeof window !== 'undefined' && window.CrownRoadDefinitions && window.CrownRoadDefinitions[s.mapIndex]) ||
                  MAP_ROAD_DEFINITIONS[s.mapIndex];

      const edgeEntries = [];
      if (def) {
        for (const e of (def.main || [])) edgeEntries.push({ pair: e, type: 'main' });
        for (const e of (def.secondary || [])) edgeEntries.push({ pair: e, type: 'secondary' });
      } else {
        const homes = Object.values(s.players).map(player => s.castles[player.home]);
        for (let i = 0; i < homes.length; i++) {
          for (let j = i + 1; j < homes.length; j++) {
            for (const mode of ['fast', 'flank']) edgeEntries.push({ pair: [homes[i].id, homes[j].id, mode], type: 'main' });
          }
        }
        for (const c of s.castles) {
          const near = s.castles.filter(n => n.id !== c.id).sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y))[0];
          edgeEntries.push({ pair: [c.id, near.id, 'fast'], type: 'secondary' });
        }
      }

      const paths = new Set(), edges = new Set(), roadElements = [];
      for (const { pair, type } of edgeEntries) {
        const [u, v, mode = 'fast'] = pair;
        const edge = [Math.min(u, v), Math.max(u, v), mode].join(':');
        if (edges.has(edge)) continue;
        edges.add(edge);
        const source = s.castles[u], target = s.castles[v];
        if (!source || !target) continue;
        const points = CrownAnchors.route(s, CrownEngine.routeBetween(source, target, mode, s.mapIndex), source, target);
        const d = CrownAnchors.path(points, 0.5);
        if (paths.has(d)) continue;
        paths.add(d);

        const bed = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        bed.setAttribute('d', d);
        bed.setAttribute('fill', 'none');
        bed.setAttribute('class', `road-bed road-bed-${type}`);
        bed.setAttribute('data-road-type', type);
        bed.setAttribute('data-source', source.id);
        bed.setAttribute('data-target', target.id);
        bed.setAttribute('data-route', mode);
        bed.setAttribute('stroke', '#161c17');
        bed.setAttribute('stroke-width', type === 'main' ? '2.8' : '2.0');
        bed.setAttribute('opacity', '.14');

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', d);
        path.setAttribute('fill', 'none');
        path.setAttribute('class', `road-${type}`);
        path.setAttribute('data-road-type', type);
        path.setAttribute('data-source', source.id);
        path.setAttribute('data-target', target.id);
        path.setAttribute('data-route', mode);
        path.setAttribute('stroke', '#aaa08a');
        path.setAttribute('stroke-dasharray', type === 'main' ? '6 4' : '4 4');
        path.setAttribute('stroke-width', type === 'main' ? '1.2' : '0.9');
        path.setAttribute('opacity', '.18');

        roadElements.push({ bed, path });
      }

      for (const { bed } of roadElements) root.appendChild(bed);
      for (const { path } of roadElements) root.appendChild(path);
    } else {
      for(const p of [...doc.querySelectorAll('.strategic-roads > path')]){
        const bed=p.cloneNode(true);
        bed.setAttribute('class','road-bed');
        bed.setAttribute('fill','none');
        bed.setAttribute('stroke','#161c17');
        bed.setAttribute('stroke-width','2.4');
        bed.setAttribute('opacity','.14');
        p.parentNode.insertBefore(bed,p);
        p.setAttribute('stroke','#aaa08a');
        p.setAttribute('stroke-dasharray','5 4');
        p.setAttribute('opacity','.18');
      }
    }
    // Remove flat 2D colored shapes from old SVG
    for(const g of doc.querySelectorAll('.strategic-roads > g')){
      const rect = g.querySelector('rect');
      const circle = g.querySelector('circle');
      if (rect) rect.setAttribute('opacity', '0');
      if (circle) circle.setAttribute('opacity', '0');
      g.querySelectorAll('path').forEach(pth => pth.setAttribute('opacity', '0'));
    }
    for(const text of doc.querySelectorAll('text')){
      // Node captions already name the citadel; avoid a second title through its roof.
      if (/CITADEL|BASTION|DYNASTY KEEP/.test(text.textContent)) { text.remove(); continue; }
      if (text.textContent === 'CROWN BRIDGE') text.setAttribute('x', '-105');
      if (s) {
        const parent=text.parentElement?.getAttribute('transform')?.match(/translate\(([-\d.]+)[ ,]+([-\d.]+)\)/);
        const px=parent?+parent[1]:0, py=parent?+parent[2]:0;
        const x=+(text.getAttribute('x')||0), y=+(text.getAttribute('y')||0);
        const width=text.textContent.length*7;
        const boxes=s.castles.map(c=>{const m=window.CrownEpochVisuals?.meta[s.epoch||'18th']?.[c.type];const w=c.type==='elite'?166:c.type==='main'?145:116;const h=m?w*m[1]/m[0]:160;return {x:c.x/2-w/4,y:(c.y+24-h)/2,w:w/2,h:(h+100)/2};});
        for(const [dx,dy] of [[0,0],[-80,-30],[80,-30],[0,-65],[-120,0],[120,0],[0,75],[-160,-50],[160,-50]]) {
          const left=px+x+dx-width/2,top=py+y+dy-12;
          if(!boxes.some(b=>left<b.x+b.w&&left+width>b.x&&top<b.y+b.h&&top+18>b.y)) {text.setAttribute('x',x+dx);text.setAttribute('y',y+dy);break;}
        }
      }
      text.setAttribute('font-family', "'Cinzel', Georgia, serif");
      text.setAttribute('font-size', "11");
      text.setAttribute('font-weight', "700");
      text.setAttribute('letter-spacing', "1");
      text.setAttribute('fill', "#c8beaa");
      text.setAttribute('opacity', "0.45");
      text.setAttribute('stroke', "#081014");
      text.setAttribute('stroke-width', "2.2");
      text.setAttribute('paint-order', "stroke");
    }
    return doc.innerHTML;
  }

  // Local terrain engineering follows the fixed graph: cliff piers, shoals and embankments.
  // These support coastal nodes without moving hitboxes or changing routes.
  const shorelineSites = {
    1: [6,7,10,11], 2: [15], 3: [15], 4: [6,7,12,13],
    5: [5,8,9,14,16,17,18,19,20], 6: [5,8,9,17,18,19,20],
    7: [15], 8: [8,9,10,11,12,13,17,18], 10: [5,8,9]
  };
  function foundation(s,c) {
    const a=CrownAnchors.node(s,c), {rx,ry}=a.footprint;
    const variant = s.mapIndex === 6 ? 2 : [1,2,7,10].includes(s.mapIndex) ? 3 : s.mapIndex === 5 ? 1 : 0;
    const support=shorelineSites[s.mapIndex]?.includes(c.id) ? `<image class="terrain-foundation" href="assets/battlefield/foundation-${variant}.webp" x="${-rx-14}" y="${-ry-10}" width="${rx*2+28}" height="${ry*2+26}" preserveAspectRatio="none"/>` : '';
    const shadowDx = 6, shadowDy = 2;
    
    let apronPath = '', rutsPath = '';
    if (a.orientation === 'north') {
      const frontY = a.gate.y - 15;
      apronPath = `M${a.gate.x - 9} ${a.gate.y} L${a.gate.x - 18} ${frontY} Q${a.gate.x} ${frontY - 4} ${a.gate.x + 18} ${frontY} L${a.gate.x + 9} ${a.gate.y} Z`;
      rutsPath = `M${a.gate.x - 5} ${a.gate.y - 2} L${a.gate.x - 9} ${frontY} M${a.gate.x + 5} ${a.gate.y - 2} L${a.gate.x + 9} ${frontY}`;
    } else if (a.orientation === 'east') {
      const frontX = a.gate.x + 15;
      apronPath = `M${a.gate.x} ${a.gate.y - 9} L${frontX} ${a.gate.y - 18} Q${frontX + 4} ${a.gate.y} ${frontX} ${a.gate.y + 18} L${a.gate.x} ${a.gate.y + 9} Z`;
      rutsPath = `M${a.gate.x + 2} ${a.gate.y - 5} L${frontX} ${a.gate.y - 9} M${a.gate.x + 2} ${a.gate.y + 5} L${frontX} ${a.gate.y + 9}`;
    } else if (a.orientation === 'west') {
      const frontX = a.gate.x - 15;
      apronPath = `M${a.gate.x} ${a.gate.y - 9} L${frontX} ${a.gate.y - 18} Q${frontX - 4} ${a.gate.y} ${frontX} ${a.gate.y + 18} L${a.gate.x} ${a.gate.y + 9} Z`;
      rutsPath = `M${a.gate.x - 2} ${a.gate.y - 5} L${frontX} ${a.gate.y - 9} M${a.gate.x - 2} ${a.gate.y + 5} L${frontX} ${a.gate.y + 9}`;
    } else {
      const frontY = a.gate.y + 15;
      apronPath = `M${a.gate.x - 9} ${a.gate.y} L${a.gate.x - 18} ${frontY} Q${a.gate.x} ${frontY + 4} ${a.gate.x + 18} ${frontY} L${a.gate.x + 9} ${a.gate.y} Z`;
      rutsPath = `M${a.gate.x - 5} ${a.gate.y + 2} L${a.gate.x - 9} ${frontY} M${a.gate.x + 5} ${a.gate.y + 2} L${a.gate.x + 9} ${frontY}`;
    }

    return `<g class="castle-foundation" pointer-events="none">${support}
      <!-- Broad directional cast shadow onto terrain matching top-left sunlight -->
      <ellipse cx="${shadowDx}" cy="${ry * 0.1 + shadowDy}" rx="${rx * .88}" ry="${ry * .68}" fill="url(#broadCastShadow)" opacity=".55"/>
      <!-- Tight contact ambient occlusion directly under stone perimeter -->
      <ellipse cx="2" cy="${-3}" rx="${rx * .78}" ry="${ry * .58}" fill="url(#contactShadowTight)" opacity=".65"/>
      <!-- Soft feathered terrain bed grounding stone into earth -->
      <ellipse cx="2" cy="${ry * 0.08}" rx="${rx + 6}" ry="${ry + 4}" fill="url(#terrainEarthBed)"/>
      <!-- Natural road-to-gate transition apron -->
      <path class="gate-apron" d="${apronPath}" fill="url(#roadApronGrad)"/>
      <path class="gate-ruts" d="${rutsPath}" stroke="#100e0a" stroke-width="1.3" stroke-linecap="round" opacity=".45"/>
    </g>`;
  }


  function atmosphere(){
    return `<g class="war-atmosphere" pointer-events="none">
      <rect x="0" y="0" width="2200" height="1500" fill="url(#warVignette)"/>
      <g filter="url(#mistBlur)" opacity=".38">
        <ellipse cx="320" cy="220" rx="380" ry="140" fill="#8cb3c2" opacity=".18"/>
        <ellipse cx="1880" cy="260" rx="420" ry="160" fill="#8cb3c2" opacity=".16"/>
        <ellipse cx="1100" cy="1380" rx="600" ry="120" fill="#759aa8" opacity=".22"/>
        <ellipse cx="180" cy="1120" rx="300" ry="140" fill="#7d9fa8" opacity=".18"/>
        <ellipse cx="2020" cy="1150" rx="340" ry="140" fill="#7d9fa8" opacity=".20"/>
        <ellipse cx="1100" cy="500" rx="280" ry="80" fill="#9bbdca" opacity=".12"/>
      </g>
    </g>`;
  }

  const castleScale = {
    elite:   { w: 154, h: 260, flagX: 0, flagY: -234 },
    main:    { w: 132, h: 172, flagX: -16, flagY: -152 },
    knight:  { w: 114, h: 124, flagX: 0, flagY: -108 },
    gold:    { w: 114, h: 138, flagX: 18, flagY: -118 },
    troop:   { w: 110, h: 126, flagX: -14, flagY: -110 },
    cavalry: { w: 112, h: 116, flagX: 20, flagY: -102 },
    archer:  { w: 104, h: 144, flagX: 0, flagY: -130 },
    small:   { w: 90,  h: 138, flagX: 0, flagY: -124 }
  };

  function realisticCastle(type, owner, level = 1, specialty = 'balanced', epoch = '18th') {
    const a = CrownAnchors.structure(type, epoch);
    const asset = epoch === '17th' ? `castle_${type}` : `${epoch}-${type}`;
    return `<g class="castle-model epoch-${epoch} role-${type}">
      <image class="castle-sprite-img" href="assets/battlefield/${asset}.webp" x="${a.sprite.x}" y="${a.sprite.y}" width="${a.w}" height="${a.h}" preserveAspectRatio="none"/>
      <g class="castle-banner-group" transform="translate(${a.flag.x} ${a.flag.y})">
        <path d="M0 5V-30" stroke="#b5ad96" stroke-width="2"/>
        <path class="faction-flag" d="M1-29 Q13-33 30-27 L27-8 Q14-15 1-11 Z" stroke="#111a22" stroke-width="1.5"/>
        <path d="M5-25L23-22M5-21L20-18" stroke="#efe8d4" stroke-opacity=".3" stroke-width="1"/>
      </g>
      <path class="gate-banner" d="M${a.gate.x+13} ${a.gate.y-29}h10v20l-5 5-5-5Z" stroke="#c2b18a" stroke-width=".7"/>
    </g>`;
  }

  function material(svg){
    const swatches={'#dfe7df':'#9da8a3','#e3e9dd':'#a6ada5','#c5c5a0':'#737c71','#ede2b1':'#939888','#9ba583':'#515e52','#f7ca42':'#70664e','#d2bb78':'#8c8672','#b48a24':'#4d4c40','#b0bba7':'#959e93','#eceff1':'#89938f','#cfd8dc':'#929e9f'};
    return svg.replace(/#[0-9a-f]{6}\b/gi,c=>swatches[c.toLowerCase()]||c).replace(/<path d="([^"]+)" fill="url\(#stoneFace\)"[^>]*\/>/g,(p,d)=>p+`<path d="${d}" fill="url(#warMasonry)"/>`);
  }

  window.CrownMapStyle = Object.freeze({
    id:'stormbound',
    factions,
    palette,
    biomes,
    biome,
    hasTerrainPlate,
    terrain,
    defs,
    sea,
    coast,
    clearance,
    dressing,
    roads,
    atmosphere,
    material,
    realisticCastle,
    foundation
  });
})();
