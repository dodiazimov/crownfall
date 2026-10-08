/* Presentation, camera and input feedback. Core simulation stays in engine.js. */
(function (root) {
  'use strict';
  const WORLD_W = 2200, WORLD_H = 1500;
  const base = {x:0,y:0,w:WORLD_W,h:WORLD_H};
  const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));

  function getViewportAspect() {
    if (typeof document !== 'undefined') {
      const map = document.getElementById('map');
      if (map) {
        const rect = map.getBoundingClientRect();
        if (rect && rect.width > 50 && rect.height > 50) {
          return rect.width / rect.height;
        }
      }
    }
    if (typeof window !== 'undefined' && window.innerWidth && window.innerHeight) {
      return window.innerWidth / window.innerHeight;
    }
    return 1100 / 700;
  }

  function cameraAt(zoom, cx=1100, cy=750) {
    zoom = clamp(zoom, 0.45, 5);
    const aspect = getViewportAspect();
    // One times zoom always fits the entire realm in the usable map viewport.
    const fitW = Math.max(WORLD_W, WORLD_H * aspect);
    const fitH = Math.max(WORLD_H, WORLD_W / aspect);
    const w = Math.ceil(fitW / zoom), h = Math.ceil(fitH / zoom);
    // Center letterboxing at overview; constrain panning when zoomed inside the world.
    const x = w >= WORLD_W ? Math.round((WORLD_W - w) / 2) : clamp(Math.round(cx - w / 2), 0, WORLD_W - w);
    const y = h >= WORLD_H ? Math.round((WORLD_H - h) / 2) : clamp(Math.round(cy - h / 2), 0, WORLD_H - h);
    return {zoom, x, y, w, h};
  }

  function forecast(count,power,defense,available) {
    const valid=Number.isInteger(count)&&count>0&&count<=Math.floor(available);
    const force=Number.isFinite(count)?count*power:0;
    return {valid,force,survivors:Math.max(0,Math.floor((force-defense)/power)),wins:force>defense,ratio:force+defense?clamp(force/(force+defense),0,1):0};
  }
  if(typeof module!=='undefined'&&module.exports){module.exports={cameraAt,forecast};return;}

  const $=id=>document.getElementById(id), E=root.CrownEngine;
  const t=key=>root.CrownI18n.t(key);
  const mobile=matchMedia('(max-width:760px)'), reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const read=(k,f)=>{try{return localStorage.getItem('crownfall-'+k)||f;}catch{return f;}};
  const save=(k,v)=>{try{localStorage.setItem('crownfall-'+k,v);}catch{}};

  let api, cam=cameraAt(1), seed, open=false, tab='castle', coach=read('tour','')==='done'?0:1;
  let previous=new Map(), previousArmies=new Map(), seenEffects=new WeakSet(), announcedResult=null;
  let audioContext, sound=read('sound','off')==='on', lastStep=-1, lastAlert='', alertTarget=null, lastAlertAudioTime=0, lastCastleThreatNotify=new Map();
  let pointerStart, pinchStart, gesture=false, ignoreUntil=0;
  let camAnim = null;
  let cameraViewportWidth = 0;
  let labelStateKey = '';
  const pointers=new Map();

  function detectHardwarePreset() {
    const cores = navigator.hardwareConcurrency || 2;
    if (matchMedia('(pointer: coarse)').matches || window.innerWidth <= 900) return (navigator.deviceMemory || 4) >= 6 && cores >= 6 ? 'medium' : 'low';
    const ram = navigator.deviceMemory || 4;
    let isIntegrated = false, isDedicated = false;
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        if (ext) {
          const ren = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL).toLowerCase();
          if (/intel|uhd|hd graphics|mali|adreno 3|adreno 505|swiftshader|llvmpipe|basic render/i.test(ren)) {
            isIntegrated = true;
          }
          if (/nvidia|geforce|gtx|rtx|radeon rx|apple m/i.test(ren)) {
            isDedicated = true;
          }
        }
      }
    } catch (e) {}
    if (cores <= 2 || ram <= 2 || (isIntegrated && cores <= 4)) return 'low';
    if (cores >= 8 && ram >= 8 && isDedicated) return 'high';
    return 'medium';
  }

  let detectedQuality = detectHardwarePreset();
  let quality = read('quality', 'auto');
  let effectiveQuality = quality === 'auto' ? detectedQuality : quality;
  let slowFrames = 0, frameCount = 0, frameTime = 0;

  const tone = (...args) => root.CrownSound.tone(...args);
  const unlockAudio = () => root.CrownSound.unlockAudio();
  const play = kind => root.CrownSound.play(kind);

  function updateSound(){
    if ($('soundToggle')) {
      $('soundToggle').textContent=sound?'♪ Sound on':'♪ Sound off';
      $('soundToggle').setAttribute('aria-label',sound?'Mute sound':'Enable sound');
      $('soundToggle').setAttribute('aria-pressed',String(sound));
    }
    if ($('settingsSoundOnBtn')) $('settingsSoundOnBtn').classList.toggle('active', sound);
    if ($('settingsSoundOffBtn')) $('settingsSoundOffBtn').classList.toggle('active', !sound);
  }

  function setSound(val){
    sound=!!val;
    if(root.CrownSound)root.CrownSound.setEnabled(sound);
    save('sound',sound?'on':'off');
    unlockAudio();
    updateSound();
  }

  function updateQualityBtn() {
    const btn = $('qualityBadgeBtn');
    if (!btn) return;
    btn.textContent=t('quality_'+quality);
    btn.title=`${t('ui_quality')}: ${t('quality_'+effectiveQuality)}`;
  }

  function setQuality(newVal){
    if (newVal) {
      quality = newVal;
      save('quality', quality);
    }
    effectiveQuality = quality === 'auto' ? detectedQuality : quality;
    document.body.dataset.quality = effectiveQuality;
    root.CrownView.setQuality?.(effectiveQuality);
    if ($('qualitySelect')) $('qualitySelect').value = quality;
    if ($('quality')) $('quality').value = quality;
    updateQualityBtn();
  }

  function cycleQuality() {
    const steps = ['auto', 'low', 'medium', 'high'];
    const curIdx = steps.indexOf(quality);
    const nextVal = steps[(curIdx + 1) % steps.length];
    setQuality(nextVal);
    const label = nextVal === 'auto' ? `Avtomatik (${effectiveQuality.toUpperCase()})` : nextVal.toUpperCase();
    api.toast?.(`⚡ Grafika sozlamasi: ${label}`);
  }

  function sampleFrame(dt){
    if(!api||api.getState().paused||document.hidden)return;
    frameCount++;
    frameTime+=dt;
    if(dt>.035&&dt<.25)slowFrames++;
    if(frameTime>=3.5){
      if(quality==='auto'&&slowFrames/Math.max(1,frameCount)>.35){
        if(effectiveQuality==='high'){
          detectedQuality='medium';
          setQuality();
          api.toast?.('⚡ Kuchsiz unumdorlik aniqlandi: Grafika [O\'rtacha] ga o\'tkazildi.');
        } else if(effectiveQuality==='medium'){
          detectedQuality='low';
          setQuality();
          api.toast?.('⚡ Kuchsiz unumdorlik aniqlandi: Grafika [Nizkiy] ga o\'tkazildi.');
        }
      }
      frameCount=0;frameTime=0;slowFrames=0;
    }
  }

  function syncCastleLabels() {
    const s=api?.getState();if(!s?.castles)return;
    const px=$('map').getBoundingClientRect().width/Math.max(1,cam.w);
    if(!px)return;
    const far=px<.28, close=px>=.8;
    const scale=Math.max(1,(far?.55:.72)/px), occupied=[];
    const priority=c=>(c.id===api.getSelected?.()?100:0)+(c.id===api.getSource?.()?90:0)+(c.owner?30:0)+(c.type==='elite'?10:0);
    const ordered=[...s.castles].sort((a,b)=>priority(b)-priority(a)||a.id-b.id);
    const intersects=(a,b)=>a.left<b.right+4&&a.right+4>b.left&&a.top<b.bottom+3&&a.bottom+3>b.top;
    for(const c of ordered){
      const el=$('castle'+c.id);if(!el)continue;
      const a=CrownAnchors.node(s,c), caption=el.querySelector('.castle-caption');
      caption.setAttribute('transform',`translate(${a.label.x} ${a.label.y}) scale(${scale})`);
      const name=el.querySelector('.castle-name'),role=el.querySelector('.castle-role'),benefit=el.querySelector('.castle-benefit-tag');
      name.classList.toggle('label-hidden',far);role.classList.toggle('label-hidden',!close);
      if(benefit)benefit.classList.toggle('label-hidden',!close);
      // The count and ownership shield remain visible at every zoom level.
      if(!far){
        const nr=name.getBoundingClientRect(), rr=role.getBoundingClientRect();
        const box={left:Math.min(nr.left,close?rr.left:nr.left),right:Math.max(nr.right,close?rr.right:nr.right),top:nr.top,bottom:close?rr.bottom:nr.bottom};
        if(occupied.some(b=>intersects(box,b))){name.classList.add('label-hidden');role.classList.add('label-hidden');if(benefit)benefit.classList.add('label-hidden');}
        else occupied.push(box);
      }
      const nearest=Math.min(...s.castles.filter(n=>n.id!==c.id).map(n=>Math.hypot(n.x-c.x,n.y-c.y)));
      const radius=Math.max(54,Math.min(22/px,nearest*.44));
      el.querySelector('.castle-hitbox').setAttribute('r',radius);
      el.querySelector('.debug-hitbox')?.setAttribute('r',radius);
      el.querySelector('.castle-banner-group')?.setAttribute('transform',`translate(${a.flag.x} ${a.flag.y}) scale(${Math.max(1,.25/px)})`);
      el.classList.toggle('far-castle',far);
    }
  }

  function updateMinimap() {
    const canvas = $('minimapCanvas');
    const viewportBox = $('minimapViewport');
    if (!canvas || !api || $('minimapContainer')?.classList.contains('hidden')) return;
    const s = api.getState();
    if (!s || !s.castles) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const mw = canvas.width, mh = canvas.height;
    ctx.clearRect(0, 0, mw, mh);

    // Background terrain shape approximation
    ctx.fillStyle = '#17403a';
    ctx.beginPath();
    ctx.ellipse(mw / 2, mh / 2, mw * 0.44, mh * 0.44, 0, 0, Math.PI * 2);
    ctx.fill();

    // Draw castle dots
    const colors = { blue: '#279fff', red: '#ff525b', green: '#2ecc71', purple: '#bb44f0', neutral: '#8fa8a2' };
    s.castles.forEach(c => {
      const cx = (c.x / WORLD_W) * mw;
      const cy = (c.y / WORLD_H) * mh;
      const r = c.type === 'elite' ? 3.5 : (c.owner === 'blue' ? 3 : 2.2);
      ctx.fillStyle = colors[c.owner || 'neutral'] || '#8fa8a2';
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    });

    // Update viewport indicator box
    if (viewportBox) {
      const vx = clamp(cam.x / WORLD_W,0,1) * mw;
      const vy = clamp(cam.y / WORLD_H,0,1) * mh;
      const vw = Math.max(0,clamp((cam.x+cam.w)/WORLD_W,0,1)*mw-vx);
      const vh = Math.max(0,clamp((cam.y+cam.h)/WORLD_H,0,1)*mh-vy);
      viewportBox.style.left = `${vx}px`;
      viewportBox.style.top = `${vy}px`;
      viewportBox.style.width = `${vw}px`;
      viewportBox.style.height = `${vh}px`;
    }
  }

  function applyCamera(){
    const map = $('map');
    if (map) {
      map.setAttribute('viewBox', `${cam.x} ${cam.y} ${cam.w} ${cam.h}`);
      cameraViewportWidth = map.getBoundingClientRect().width;
    }
    if ($('zoomReadout')) $('zoomReadout').textContent = cam.zoom.toFixed(1) + '×';
    if ($('zoomIn')) $('zoomIn').disabled = cam.zoom >= 4.95;
    if ($('zoomOut')) $('zoomOut').disabled = cam.zoom <= 0.46;
    document.body.classList.toggle('map-zoomed', cam.zoom > 0.55);
    document.body.classList.toggle('zoom-overview', cam.zoom <= 0.75);
    document.body.classList.toggle('zoom-close', cam.zoom >= 1.4);
    syncCastleLabels();
    updateMinimap();
  }

  // A 54-world-unit hitbox must be usable by a finger, not a 16px speck.
  function tacticalCamera(s) {
    const rect = $('map')?.getBoundingClientRect();
    const role = api?.getRole?.() || 'blue';
    const source = s.castles[api?.getSource?.()] || s.castles.find(c => c.owner === role);
    if (!rect || !source || !(mobile.matches || matchMedia('(pointer: coarse)').matches || innerHeight <= 520)) return cameraAt(1);
    const fit = cameraAt(1);
    const zoom = clamp(fit.w * 52 / (108 * Math.max(1, rect.width)), 1.6, 5);
    const neighbor = s.castles.filter(c => c.owner !== role)
      .sort((a,b) => Math.hypot(a.x-source.x,a.y-source.y)-Math.hypot(b.x-source.x,b.y-source.y))[0];
    // Frame the first move as well as home, leaving space for the right-hand tools.
    const cx = neighbor ? (source.x + neighbor.x) / 2 : source.x;
    const cy = neighbor ? (source.y + neighbor.y) / 2 : source.y;
    const view = cameraAt(zoom, cx, cy);
    return cameraAt(zoom, cx + view.w * .08, cy);
  }
  function focusHome() {
    if (!api) return;
    cam = tacticalCamera(api.getState());
    applyCamera();
  }

  function resizeCamera() {
    const width = $('map')?.getBoundingClientRect().width;
    if (!width || !cameraViewportWidth) return;
    // Keep castles at the same screen scale when the phone rotates or HUD resizes.
    const worldWidth = cam.w * width / cameraViewportWidth;
    const zoom = Math.abs(cam.zoom - 1) < .01 ? 1 : cameraAt(1).w / worldWidth;
    if (camAnim) { cancelAnimationFrame(camAnim); camAnim = null; }
    cam = cameraAt(zoom, cam.x + cam.w / 2, cam.y + cam.h / 2);
    applyCamera();
  }

  function zoomTo(z, cx = cam.x + cam.w / 2, cy = cam.y + cam.h / 2){
    if (camAnim) { cancelAnimationFrame(camAnim); camAnim=null; }
    cam = cameraAt(z, cx, cy);
    applyCamera();
  }

  function animateCamera(targetCx, targetCy, targetZoom, duration = 300) {
    if (camAnim) { cancelAnimationFrame(camAnim); camAnim=null; }
    if (reduced.matches || duration <= 0) {
      cam = cameraAt(targetZoom, targetCx, targetCy);
      applyCamera();
      return;
    }
    if (camAnim) cancelAnimationFrame(camAnim);
    const startX = cam.x + cam.w / 2, startY = cam.y + cam.h / 2, startZoom = cam.zoom;
    const startTime = performance.now();
    function step(now) {
      const p = Math.min(1, (now - startTime) / duration);
      const ease = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
      const curZoom = startZoom + (targetZoom - startZoom) * ease;
      const curCx = startX + (targetCx - startX) * ease;
      const curCy = startY + (targetCy - startY) * ease;
      cam = cameraAt(curZoom, curCx, curCy);
      applyCamera();
      if (p < 1) camAnim = requestAnimationFrame(step);
      else camAnim = null;
    }
    camAnim = requestAnimationFrame(step);
  }

  function focusCastle(id, zoom=true){
    const s = api ? api.getState() : null;
    const c = s?.castles[id];
    if(!c) return;
    api.select(id);
    const targetZoom = zoom ? Math.max(cam.zoom, getViewportAspect() < 1 ? 3 : 1.8) : cam.zoom;
    animateCamera(c.x, c.y, targetZoom, 320);
    showSheet('castle');
  }

  function showSheet(which='castle'){
    tab=which;
    open=true;
    syncSheet();
    if(mobile.matches){
      const panel=which==='castle'?$('castlePanel'):document.querySelector(which==='army'?'.army':'.dispatch');
      panel?.classList.remove('folded');
      if($('commandDock')) $('commandDock').scrollTop=0;
    }
  }

  function hideSheet(){
    open=false;
    syncSheet();
  }

  function syncSheet(){
    document.body.classList.toggle('sheet-open',open);
    document.body.dataset.commandTab=tab;
    const dock=$('commandDock');
    if (dock) {
      dock.querySelectorAll('[data-tab]').forEach(b=>{
        const active=b.dataset.tab===tab&&open;
        b.setAttribute('aria-expanded',String(active));
        b.classList.toggle('active',active);
      });
      const sections=[[$('castlePanel'),'castle'],[$('castlePicker')?.parentElement,'castle'],[dock.querySelector('.army'),'army'],[dock.querySelector('.dispatch'),'reports']];
      sections.forEach(([node,t])=>{
        if(node) {
          node.inert=mobile.matches&&(!open||t!==tab);
          node.classList.toggle('mobile-inactive',mobile.matches&&t!==tab);
        }
      });
    }
  }

  function tutorial(){
    const box=$('coach');
    if(!box) return;
    box.classList.toggle('hidden',coach===0);
    if(!coach)return;
    $('coachStep').textContent=`${t('ui_tour')} · ${coach} / 3`;
    $('coachTitle').textContent=t(`ui_coach${coach}`);
    $('coachText').textContent=t(`ui_coach${coach}_desc`);
    box.querySelectorAll('i').forEach((n,i)=>n.classList.toggle('active',i<coach));
  }

  function select(id=api.getSelected()){
    showSheet('castle');
    const r=api.getRole?api.getRole():'blue';
    if(coach===1&&api.getState().castles[id]?.owner!==r){coach=2;tutorial();}
  }

  function amountChanged(){
    if(coach===1||coach===2){coach=3;tutorial();}
  }

  function dispatched(){
    play('dispatch');
    if(coach){coach=0;save('tour','done');tutorial();api.toast(root.CrownI18n?.t('audit_required_help')||'Every castle is reachable.');}
    if(mobile.matches)hideSheet();
  }

  function upgrade(){play('upgrade');}

  function onPointerDown(e){
    if(e.button!==0&&e.pointerType!=='touch')return;
    const id=e.target.closest('[data-id]')?.dataset.id;
    const onCastle=id!==undefined&&api.getState().castles[Number(id)]?.owner===(api.getRole?.()||'blue');
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size===1){
      pointerStart={x:e.clientX,y:e.clientY,cam:{...cam},onCastle};
      gesture=false;
    }
    if(pointers.size===2){
      const [a,b]=[...pointers.values()];
      pinchStart={distance:Math.hypot(a.x-b.x,a.y-b.y),zoom:cam.zoom,cx:cam.x+cam.w/2,cy:cam.y+cam.h/2};
      gesture=true;
    }
  }

  function onPointerMove(e){
    if(!pointers.has(e.pointerId))return;
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size===2&&pinchStart){
      $('map')?.setPointerCapture(e.pointerId);
      const [a,b]=[...pointers.values()];
      const curDist = Math.hypot(a.x-b.x,a.y-b.y);
      zoomTo(pinchStart.zoom * (curDist / Math.max(1, pinchStart.distance)), pinchStart.cx, pinchStart.cy);
      e.preventDefault();
    } else if(pointerStart&&!api.isDragonTargeting?.()&&!pointerStart.onCastle&&(cam.w<WORLD_W||cam.h<WORLD_H)){
      const dx=e.clientX-pointerStart.x,dy=e.clientY-pointerStart.y;
      if(Math.hypot(dx,dy)>4)gesture=true;
      if(gesture){
        $('map')?.setPointerCapture(e.pointerId);
        const rect=$('map').getBoundingClientRect();
        const scaleX=rect.width/pointerStart.cam.w;
        const scaleY=rect.height/pointerStart.cam.h;
        cam=cameraAt(cam.zoom,pointerStart.cam.x+pointerStart.cam.w/2-dx/scaleX,pointerStart.cam.y+pointerStart.cam.h/2-dy/scaleY);
        applyCamera();
      }
    }
  }

  function onPointerUp(e){
    if(!pointers.has(e.pointerId))return;
    if(gesture)ignoreUntil=performance.now()+350;
    pointers.delete(e.pointerId);
    if(pointers.size<2)pinchStart=null;
    if(!pointers.size){
      pointerStart=null;
      gesture=false;
    } else {
      const point=[...pointers.values()][0];
      pointerStart={x:point.x,y:point.y,cam:{...cam}};
    }
  }

  function update(s){
    if(!api)return;
    const myRole=api.getRole?api.getRole():'blue';
    if(seed!==s.seed){
      seed=s.seed;
      previous=new Map(s.castles.map(c=>[c.id,{owner:c.owner,level:c.level}]));
      previousArmies.clear();
      seenEffects=new WeakSet();
      announcedResult=null;
      lastAlert='';
      alertTarget=null;
      lastAlertAudioTime=0;
      lastCastleThreatNotify.clear();
      $('alertBanner')?.classList.add('hidden');
      $('captureBanner')?.classList.remove('show');
      cam=tacticalCamera(s);
      applyCamera();
      hideSheet();
      setQuality();
    }
    for(const c of s.castles){
      const before=previous.get(c.id);
      if(before&&before.owner!==c.owner){
        const region=$('region'+c.id),castle=$('castle'+c.id);
        if(region&&!reduced.matches){
          region.animate([{opacity:.35},{opacity:1}],{duration:800});
        }
        if(c.owner===myRole){
          play('capture');
          if ($('captureBanner')) {
            $('captureBanner').innerHTML=`<span>⚑ ${t('ui_captured')}</span><strong>${c.name.replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}</strong>`;
            $('captureBanner').classList.add('show');
            setTimeout(()=>$('captureBanner')?.classList.remove('show'),2400);
          }
        }
        if(before.owner===myRole){
          alertTarget=c.id;
          lastAlert='lost'+c.id;
          if ($('alertBanner')) {
            const msg = `⚠ ${c.name} · ${t('ui_lost')}`;
            $('alertBanner').textContent=msg;
            $('alertBanner').classList.remove('hidden');
            if (typeof CrownNotify !== 'undefined') {
              CrownNotify.show(msg, {
                priority: CrownNotify.PRIORITY.URGENT,
                type: 'urgent',
                duration: 3800,
                onClick: () => { if(alertTarget!==null)focusCastle(alertTarget); }
              });
            }
          }
          play('alert');
          setTimeout(()=>{$('alertBanner')?.classList.add('hidden');},3500);
        }
        if(castle&&!reduced.matches)castle.querySelector('.building')?.animate([{filter:'brightness(2)'},{filter:'brightness(1)'}],{duration:650});
      }
      previous.set(c.id,{owner:c.owner,level:c.level});
    }
    for(const effect of s.effects){
      if(seenEffects.has(effect))continue;
      seenEffects.add(effect);
      play('impact');
      const c=s.castles.find(c=>c.x===effect.x&&c.y===effect.y);
      if(c&&!reduced.matches)$('building'+c.id)?.animate([{transform:'translateX(0)'},{transform:'translateX(-4px)'},{transform:'translateX(4px)'},{transform:'translateX(0)'}],{duration:300});
    }
    const homeId=s.players[myRole]?.home??0;
    const threats=s.armies.filter(a=>a.owner!==myRole&&a.intercept===null&&s.castles[a.target].owner===myRole).sort((a,b)=>(a.target===homeId?-100:0)+(a.duration-a.t)-(b.target===homeId?-100:0)-(b.duration-b.t));
    if(threats.length){
      const a=threats[0],c=s.castles[a.target];
      alertTarget=c.id;
      const isNewThreat=(lastAlert!=='army'+a.id);
      const now=performance.now();
      if(isNewThreat){
        lastAlert='army'+a.id;
        if(now-lastAlertAudioTime>3500){
          lastAlertAudioTime=now;
          play('alert');
        }
      }
      if ($('alertBanner')) {
        const msg = `⚠ ${c.name} · ${t('ui_threat')} · ${Math.ceil(a.duration-a.t)}s →`;
        $('alertBanner').textContent=msg;
        $('alertBanner').classList.remove('hidden');
        if (typeof CrownNotify !== 'undefined' && isNewThreat) {
          const lastNotified = lastCastleThreatNotify.get(c.id) || 0;
          if (now - lastNotified > 6000) {
            lastCastleThreatNotify.set(c.id, now);
            CrownNotify.show(`⚠ ${c.name} · ${t('ui_threat')}`, {
              priority: CrownNotify.PRIORITY.URGENT,
              type: 'urgent',
              duration: 4000,
              onClick: () => { if(alertTarget!==null)focusCastle(alertTarget); }
            });
          }
        }
      }
    }
    else if(lastAlert.startsWith('army')||(lastAlert.startsWith('lost')&&s.castles[alertTarget]?.owner===myRole)){
      $('alertBanner')?.classList.add('hidden');
      lastAlert='';
    }
    if ($('reportBadge')) $('reportBadge').textContent=threats.length||'';
    const step=Math.floor(s.time*2);
    if(!s.paused&&s.armies.some(a=>a.owner===myRole)&&step!==lastStep){
      tone(100,.03,.012,0,'triangle');
      lastStep=step;
    }
    if(s.result&&announcedResult!==s.result){
      announcedResult=s.result;
      play(s.result===myRole?'victory':'defeat');
    }
    const nextLabelKey=`${s.mapIndex}:${s.seed}:${s.epoch}:${api.getSelected?.()}:${api.getSource?.()}:${s.castles.map(c=>c.owner).join(',')}`;
    if(nextLabelKey!==labelStateKey){labelStateKey=nextLabelKey;syncCastleLabels();}
    syncSheet();
    document.body.classList.toggle('effects-paused',s.paused||!!s.result);
    updateMinimap();
  }

  function init(bridge){
    api=bridge;
    root.CrownI18n.onLanguageChange(tutorial);
    updateSound();
    setQuality();
    tutorial();
    syncSheet();
    mobile.addEventListener('change',syncSheet);
    reduced.addEventListener('change',()=>{setQuality();});

    if (typeof ResizeObserver !== 'undefined' && $('map')) {
      new ResizeObserver(resizeCamera).observe($('map'));
    }
    window.addEventListener('resize', resizeCamera);
    window.addEventListener('orientationchange', () => {
      setTimeout(resizeCamera, 150);
    });

    document.addEventListener('pointerdown',unlockAudio,{passive:true});
    document.addEventListener('keydown',unlockAudio,{passive:true});
    document.addEventListener('click',e=>{if(e.target.closest('button'))play('click');});
    if ($('soundToggle')) $('soundToggle').onclick=()=>setSound(!sound);
    if ($('qualitySelect')) $('qualitySelect').onchange=()=>{setQuality($('qualitySelect').value);};
    if ($('quality')) $('quality').onchange=()=>{setQuality($('quality').value);};
    if ($('qualityBadgeBtn')) $('qualityBadgeBtn').onclick=()=>{cycleQuality();};
    if ($('focusHome')) $('focusHome').onclick=focusHome;
    if ($('zoomIn')) $('zoomIn').onclick=()=>zoomTo(cam.zoom*1.3);
    if ($('zoomOut')) $('zoomOut').onclick=()=>zoomTo(cam.zoom/1.3);
    if ($('zoomReset')) $('zoomReset').onclick=()=>zoomTo(1, WORLD_W / 2, WORLD_H / 2);
    document.querySelectorAll('[data-zoom-preset]').forEach(b=>{
      b.onclick=()=>{
        const m=b.dataset.zoomPreset;
        if(m==='close')zoomTo(2.2);
        else if(m==='normal')zoomTo(1.4);
        else zoomTo(1.0, WORLD_W / 2, WORLD_H / 2);
      };
    });
    document.querySelectorAll('[data-pan]').forEach(b=>b.onclick=()=>{
      const [x,y]=b.dataset.pan.split(',').map(Number);
      zoomTo(Math.max(cam.zoom,1.2),cam.x+cam.w/2+x*cam.w*.24,cam.y+cam.h/2+y*cam.h*.24);
    });

    const map=$('map');
    if (map) {
      map.addEventListener('pointerdown',onPointerDown);
      map.addEventListener('pointermove',onPointerMove);
      map.addEventListener('pointerup',onPointerUp);
      map.addEventListener('pointercancel',onPointerUp);
      map.addEventListener('lostpointercapture',onPointerUp);
      map.addEventListener('wheel',e=>{
        e.preventDefault();
        zoomTo(cam.zoom*(e.deltaY<0?1.12:1/1.12));
      },{passive:false});
    }

    if ($('commandDock')) {
      $('commandDock').querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{
        if(open&&tab===b.dataset.tab)hideSheet();
        else showSheet(b.dataset.tab);
      });
    }
    if ($('closeSheet')) $('closeSheet').onclick=hideSheet;
    if ($('alertBanner')) $('alertBanner').onclick=()=>{if(alertTarget!==null)focusCastle(alertTarget);};
    if ($('skipCoach')) $('skipCoach').onclick=()=>{coach=0;save('tour','done');tutorial();};
    if ($('tourReplay')) $('tourReplay').onclick=()=>{coach=1;hideSheet();tutorial();};
    document.addEventListener('keydown',e=>{if(e.key==='Escape')hideSheet();});

    // Minimap interaction
    if ($('minimapToggleBtn')) {
      $('minimapToggleBtn').onclick = () => {
        const mm = $('minimapContainer');
        if (mm) { mm.classList.toggle('hidden'); updateMinimap(); }
      };
    }
    if ($('minimapCanvas')) {
      $('minimapCanvas').onclick = (e) => {
        const rect = $('minimapCanvas').getBoundingClientRect();
        const clickX = e.clientX - rect.left, clickY = e.clientY - rect.top;
        const targetWorldX = (clickX / rect.width) * WORLD_W;
        const targetWorldY = (clickY / rect.height) * WORLD_H;
        animateCamera(targetWorldX, targetWorldY, cam.zoom, 250);
      };
    }

    update(api.getState());
  }

  root.MobileGame={
    init,update,select,amountChanged,dispatched,upgrade,sampleFrame,setQuality,cycleQuality,
    getEffectiveQuality:()=>effectiveQuality,getQuality:()=>quality,setSound,isSoundOn:()=>sound,
    ignoreClick:()=>performance.now()<ignoreUntil,
    focusCastle,focusHome,animateCamera,cameraAt,syncCastleLabels
  };
})(typeof window==='undefined'?globalThis:window);
