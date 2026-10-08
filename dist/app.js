'use strict';

const E = CrownEngine, V = CrownView, $ = id => document.getElementById(id), SAVE = 'crownfall-match-v4';
const enterMenuMode=()=>CrownMenuUI.enterMenuMode();
const enterGameMode=()=>CrownMenuUI.enterGameMode();
const tr=(key)=>window.CrownI18n?.t(key)||key;
const storageRead=key=>{try{return localStorage.getItem(key)}catch{return null}};
const storageWrite=(key,val)=>{try{localStorage.setItem(key,val)}catch{}};
const fmt = n => Math.floor(n).toLocaleString('en-US');
const rate = n => Number(n.toFixed(2));
const time = n => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(Math.floor(n % 60)).padStart(2, '0')}`;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function showModalSafe(dialog) {
  if (!dialog) return;
  if (typeof dialog === 'string') dialog = $(dialog);
  if (!dialog) return;
  if (!dialog.open) {
    try {
      dialog.showModal();
    } catch {
      dialog.open = true;
    }
  }
}

function closeModalSafe(dialog) {
  if (!dialog) return;
  if (typeof dialog === 'string') dialog = $(dialog);
  if (!dialog) return;
  if (dialog.open) {
    try {
      dialog.close();
    } catch {
      dialog.open = false;
    }
  }
}

let restored = null;
try { restored = E.deserialize(localStorage.getItem(SAVE)); } catch {}

let state = restored || E.create();
try { Object.defineProperty(window, 'state', { get: () => state, set: v => { state = v; }, configurable: true }); } catch {}
let sourceId = 0; // The active source castle
let targetId = null; // The active target castle
let dispatchPercent = 50; // 25, 50, 75, 100
let marchRoute = 'fast'; // 'fast' or 'flank'
let simSpeed = 0.65; // Normal / Strategic pace
const SPEED_STEPS = [0.5, 0.65, 1.0, 1.5];
const SPEED_LABELS = { 0.5: '🐢 0.5×', 0.65: '⚖️ 0.65×', 1.0: '⚡ 1.0×', 1.5: '⏩ 1.5×' };
const DIFF_LABELS = {
  get easy() { return window.CrownI18n ? window.CrownI18n.t('opt_easy') : '🟢 Легкий'; },
  get normal() { return window.CrownI18n ? window.CrownI18n.t('opt_normal') : '🟡 Нормальный'; },
  get hard() { return window.CrownI18n ? window.CrownI18n.t('opt_hard') : '🔴 Сложный'; }
};
let allCastles = false;
let nextSpecialty = null;
let changingDifficulty = false;
let matchActive = !!restored;
let lastNetworkRevision = -1;
let reconnectToken = null;
let guestNickname = storageRead('crownfall_guest_nickname') || ('Sarkarda_' + Math.floor(Math.random() * 900 + 100));
const guestName = guestNickname;

// Multiplayer & Auth State
let myRole = 'blue'; // 'blue' (Host/Player 1), 'red', 'green', 'purple'
let multiplayerMode = false;
let currentRoomCode = null;
let wsClient = null;
let isOpponentBot = false;
let playerName = 'Sarkarda';
let opponentName = 'Crimson Legion';
let authToken = storageRead('crownfall_token') || null;
let currentUsername = storageRead('crownfall_username') || null;
let authMode = 'login'; // 'login' or 'register'
let roomIsHost = false;
let reconnectAttempts = 0;
let reconnectTimer = null;
let selectedPlayerCount = 2;
let selectedVictoryMode = 'crown_control';
let selectedEpoch = '18th';
let selectedRegion = 'europe';
let dockState = 'collapsed';
function setDockState(st) {
  dockState = st;
  const dock = $('gameDock');
  if (!dock) return;
  dock.classList.remove('dock-collapsed', 'dock-peek', 'dock-expanded');
  dock.classList.add(`dock-${st}`);
  if ($('moreCommandsBtn')) {
    $('moreCommandsBtn').setAttribute('aria-expanded', String(st === 'expanded'));
  }
}
let selectedHero = 'vanguard'; // 'vanguard', 'fortifier', 'guildmaster', 'infiltrator'
let lastSeenWeather = null;
let heroChosen = false;
let setupMode = 'single';
let lobbyState = null;
let connectionPending = false;
let rematchPending = false;

let isDragging = false;
let dragJustEnded = false;
let dragFrom = null;
let toastTimer = null;
let last = performance.now();
let uiClock = 0;
let saveClock = 0;

// Expose selected for legacy tests / harness
Object.defineProperty(window, 'selected', {
  get: () => targetId,
  set: val => { targetId = val; }
});

function opponentRole() {
  return myRole === 'blue' ? 'red' : 'blue';
}

function syncDiffModal(val) {
  document.querySelectorAll('.diff-card').forEach(card => {
    const isSelected = card.dataset.diff === val;
    card.classList.toggle('active', isSelected);
    const radio = card.querySelector('input[type="radio"]');
    if (radio) radio.checked = isSelected;
  });
  if ($('aiDifficulty')) $('aiDifficulty').value = val;
  const dots = { easy: '🟢', normal: '🟡', hard: '🔴' };
  const badgeKeys = { easy: 'diff_easy_badge', normal: 'diff_med_badge', hard: 'diff_hard_badge' };
  if ($('menuDiffIndicator')) $('menuDiffIndicator').textContent = dots[val] || '🟡';
  if ($('menuDiffLabel')) {
    const key = badgeKeys[val] || 'diff_med_badge';
    $('menuDiffLabel').textContent = window.CrownI18n ? window.CrownI18n.t(key) : val;
  }
}

// Shared commander presentation. One selection drives solo, quick match and lobby.
function syncHeroUI() {
  const valid = heroChosen && !!E.HEROES[selectedHero];
  document.querySelectorAll('#spHeroPickGrid [data-hero], #lobbyHeroButtons [data-hero]').forEach(card => {
    const selected = card.dataset.hero === selectedHero && (valid || card.closest('#lobbyHeroButtons'));
    card.classList.toggle('active', selected);
    card.setAttribute('aria-pressed', String(selected));
  });
  const name = tr(`hero_${selectedHero}_name`);
  if ($('menuCommanderAvatar')) $('menuCommanderAvatar').src = `assets/hero_${selectedHero || 'vanguard'}_thumb.webp`;
  $('spHeroSelectedStatus').textContent = valid ? name : tr('ui_unselected');
  $('lobbyMyHeroLabel').textContent = `${tr('hero_selected')}: ${name}`;
  $('lobbyHeroDetail').textContent = tr(`ui_bonus_${selectedHero}`).replace('|', ' ');
  const preview = $('heroPreview');
  const key = `${valid}:${selectedHero}:${CrownI18n.getLanguage()}`;
  if (preview.dataset.content !== key) {
    preview.dataset.content = key;
    preview.innerHTML = valid ? `<span class="screen-eyebrow">${esc(tr('hero_selected'))}</span>
      <h3>${esc(name)}</h3><p class="preview-role">${esc(tr(`ui_role_${selectedHero}`))}</p>
      <div class="preview-ability"><span class="screen-eyebrow">${esc(tr('ui_passive'))}</span><h4>${esc(tr(`ui_ability_${selectedHero}`))}</h4>
      <ul>${tr(`ui_bonus_${selectedHero}`).split('|').map(text=>`<li>${esc(text)}</li>`).join('')}</ul></div>
      <span class="screen-eyebrow">${esc(tr('ui_playstyle'))}</span><p class="preview-playstyle">${esc(tr(`ui_style_${selectedHero}`))}</p>`
      : `<div class="preview-empty"><svg class="svg-icon" viewBox="0 0 24 24" aria-hidden="true"><use href="#icon-crown"></use></svg><h3>${esc(tr('ui_preview_title'))}</h3><p>${esc(tr('ui_preview_hint'))}</p></div>`;
  }
  $('startGameBtn').disabled = !changingDifficulty && !valid;
  $('startGameBtn').textContent = changingDifficulty ? tr('ui_save_difficulty') : valid
    ? (setupMode==='quick' ? `${tr('quick_match_title')} · ${name} →` : `${tr('ui_play_as').replace('{hero}',name)} →`) : tr('hero_btn_select');
}
function syncSetupUI() {
  $('sfxVolumeSlider').setAttribute('aria-label',tr('sfx_volume'));$('musicVolumeSlider').setAttribute('aria-label',tr('music_volume'));
  const titles={returnMenuBtn:'home_menu',menuBtn:'settings_title',upgradeBtn:'ui_upgrade',routeToggleBtn:'route_main',tacticsBtn:'ui_castle_actions',nextSourceBtn:'ui_next_castle',zoomIn:'ui_zoom_in',zoomOut:'ui_zoom_out',zoomReset:'ui_zoom_reset',skipCoach:'close',hudHeroPill:'hero_active_label',weatherHudBadge:'weather_title'};
  for(const [id,key] of Object.entries(titles)){const node=$(id);if(node){node.setAttribute('aria-label',tr(key));node.title=tr(key);}}
  document.querySelectorAll('.close-dialog-btn').forEach(b=>b.setAttribute('aria-label',tr('close')));
  document.querySelectorAll('label:not([for])').forEach(label=>{const input=label.parentElement.querySelector('input[id],select[id]');if(input)label.htmlFor=input.id;});

  for(const id of ['startMapSelect','mapSelect','lobbyMapSelect']){
    const select=$(id);if(!select)continue;
    [...select.options].forEach(o=>{if(o.value!=='random'){const i=Number(o.value);o.textContent=`${i+1}. ${E.MAP_NAMES[i].replace(/ \(.*$/, '')} · ${E.MAP_PLAYERS[i]} ${tr('ui_players')}`;}});
    select.querySelectorAll('optgroup').forEach((g,i)=>g.label=`${i+2} ${tr('ui_players')}`);
  }
  const dialog = $('difficultyDialog');
  dialog.classList.toggle('difficulty-only', changingDifficulty);
  dialog.classList.toggle('quick-setup', setupMode==='quick' && !changingDifficulty);
  $('commanderTitle').textContent = changingDifficulty ? tr('settings_ai_diff') : tr('hero_pick_title');
  $('commanderSubtitle').textContent = changingDifficulty ? tr('diff_subtitle') : tr('ui_pick_hint');
  const map = $('startMapSelect');
  const menuMapIndex = map.value === 'random' ? null : Number(map.value);
  if ($('menuMapName')) $('menuMapName').textContent = menuMapIndex === null
    ? tr('menu_random_map') : E.MAP_NAMES[menuMapIndex].replace(/ \(.*$/, '');
  if ($('menuMapMeta')) $('menuMapMeta').textContent = `${menuMapIndex === null ? selectedPlayerCount : E.MAP_PLAYERS[menuMapIndex]} ${tr('ui_players')}`;
  [...map.options].forEach(option => { option.disabled = option.value !== 'random' && E.MAP_PLAYERS[Number(option.value)] !== selectedPlayerCount; });
  $('setupSummary').textContent = `${selectedPlayerCount} ${tr('ui_players')} · ${DIFF_LABELS[$('aiDifficulty').value] || DIFF_LABELS.normal} · ${map.selectedOptions[0]?.textContent || ''}`;
  document.querySelectorAll('#spPlayerCountToggle button,#spVictoryModeToggle button').forEach(b => b.setAttribute('aria-pressed',String(b.classList.contains('active'))));
  syncHeroUI();
}
function openBattleSetup(mode='single', changing=false) {
  changingDifficulty=changing; setupMode=mode;
  syncDiffModal(state.aiDifficulty || 'normal');
  $('battleSettings').open=changing;
  syncSetupUI();
  showModalSafe('difficultyDialog');
  const scroll = $('difficultyDialog')?.querySelector('.setup-scroll');
  if (scroll) scroll.scrollTop = 0;
}
function selectHero(hero, online=false) {
  if (!E.HEROES[hero]) return;
  selectedHero=hero; heroChosen=true;
  syncHeroUI();
  CrownSound.play('hero_pick');
  if(online && multiplayerMode) sendWs({type:'select_hero',hero});
}
function routeSpeedFor(source, route=marchRoute, count=Math.floor(getAvailable(source)*dispatchPercent/100)) {
  return E.marchSpeed(source,route,state.weather,state.players[myRole]?.hero);
}
function siegeEstimate(count,target,defenders) {
  return E.siegeOutcome(state,{owner:myRole,source:sourceId,count,route:marchRoute},{...target,troops:defenders});
}
function requiredForSiege(target,defenders) {
  let low=1,high=Math.ceil(defenders*3+16);
  while(low<high){const mid=Math.floor((low+high)/2);if(siegeEstimate(mid,target,defenders).wins)high=mid;else low=mid+1;}
  return low;
}
function syncTacticsState() {
  if(!$('tacticsDialog').open)return;
  const source=state.castles[sourceId], connected=!multiplayerMode||wsClient?.readyState===1;
  const allowed=source?.owner===myRole && !state.paused && !state.result && connected;
  const same=$('tacticsSpecialty').value===source?.specialty;
  const poor=(state.players[myRole]?.gold||0)<50;
  $('tacticsSpecialty').disabled=!allowed;
  $('saveReserveBtn').disabled=!allowed;
  $('saveSupplyBtn').disabled=!allowed || ($('tacticsSupplyTarget').options.length===1&&!source?.supply);
  $('applySpecialtyBtn').disabled=!allowed||same||poor;
  $('applySpecialtyBtn').textContent=same?tr('ui_same_spec'):poor?tr('spec_error_gold'):tr('spec_apply_btn');
  if(!allowed)$('tacticsFeedback').textContent=!connected?tr('audit_disconnected'):state.paused?tr('audit_paused'):tr('audit_no_source');
}
function confirmAction(title,description,action) {
  $('actionConfirmTitle').textContent=title;$('actionConfirmBody').textContent=description;
  $('actionConfirmCancel').onclick=()=>$('actionConfirmDialog').close();
  $('actionConfirmAccept').onclick=()=>{$('actionConfirmDialog').close();action();};
  $('actionConfirmDialog').showModal();
}
async function copyText(text, input) {
  try { await navigator.clipboard.writeText(text); toast(tr('ui_copied')); }
  catch {
    if(!input){
      const parent=[...document.querySelectorAll('dialog[open]')].at(-1)||document.body;
      input=parent.querySelector('.copy-fallback');
      if(!input){input=document.createElement('textarea');input.className='copy-fallback arcade-select';input.readOnly=true;input.setAttribute('aria-label',tr('career_share_btn'));parent.append(input);}
      input.value=text;
    }
    input.focus();input.select();toast(tr('ui_copy_failed'));
  }
}
function setConnectionPending(pending) {
  connectionPending=pending;
  ['menuCreateRoomBtn','menuJoinRoomBtn','acceptInviteBtn','menuQuickMatchBtn'].forEach(id=>{const b=$(id);if(b){b.disabled=pending;b.setAttribute('aria-busy',String(pending));}});
}

function saveMatch() {
  if (multiplayerMode || !matchActive) return false; // Don't persist multiplayer matches in local skirmish slot
  try {
    localStorage.setItem(SAVE, E.serialize(state));
    return true;
  } catch { return false; }
}

const CrownNotify = (function() {
  const PRIORITY = {
    URGENT: 1,   // "Under attack", "Castle lost", "Dragon incoming"
    WARNING: 2,  // "Not enough gold", "Requirements missing"
    INFO: 3      // Toasts, confirmations
  };

  const MAX_VISIBLE = 3;
  const active = [];

  function getStack() {
    let stack = document.getElementById('notificationStack');
    if (!stack) {
      stack = document.createElement('div');
      stack.id = 'notificationStack';
      stack.className = 'notification-stack';
      document.body.appendChild(stack);
    }
    return stack;
  }

  function categorize(text, explicitPriority, explicitType) {
    if (explicitPriority && explicitType) return { priority: explicitPriority, type: explicitType };
    const lower = String(text || '').toLowerCase();
    if (/under attack|hujum ostida|под атакой|castle lost|qal'a yo'qotildi|замок потерян|dragon incoming|ajdaho jangga/.test(lower)) {
      return { priority: PRIORITY.URGENT, type: 'urgent' };
    }
    if (/oltin yetarli emas|not enough gold|недостаточно золота|need_gold|kamida|talab qilinadi|rejected|xatolik|⚠️|⚠/.test(lower)) {
      return { priority: PRIORITY.WARNING, type: 'warning' };
    }
    return { priority: PRIORITY.INFO, type: 'info' };
  }

  function show(text, opts = {}) {
    if (!text) return null;
    const cat = categorize(text, opts.priority, opts.type);
    const stack = getStack();
    const now = Date.now();
    const duration = opts.duration || (cat.priority === PRIORITY.URGENT ? 4000 : cat.priority === PRIORITY.WARNING ? 3200 : 2500);

    // Deduplication check: if an identical message arrived within 1.6s, refresh timer and pulse
    const existing = active.find(n => n.text === text && (now - n.timestamp) < 1600);
    if (existing) {
      existing.count = (existing.count || 1) + 1;
      existing.timestamp = now;
      clearTimeout(existing.timer);
      existing.timer = setTimeout(() => dismiss(existing.id), duration);
      if (existing.count > 1) {
        let badge = existing.el.querySelector('.notify-count-badge');
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'notify-count-badge';
          existing.el.appendChild(badge);
        }
        badge.textContent = `×${existing.count}`;
      }
      existing.el.classList.add('notify-pulse');
      setTimeout(() => existing.el.classList.remove('notify-pulse'), 300);
      return existing.id;
    }

    const id = 'notify_' + now + '_' + Math.random().toString(36).substr(2, 5);
    const el = document.createElement('div');
    el.id = id;
    el.className = `notify-item notify-${cat.type} notify-p${cat.priority}`;
    el.setAttribute('role', cat.priority === PRIORITY.URGENT ? 'alert' : 'status');

    let icon = cat.type === 'urgent' ? '⚔️' : cat.type === 'warning' ? '⚠️' : 'ℹ️';
    if (/🐉/.test(text)) icon = '🐉';
    else if (/oltin|gold|золот/i.test(text)) icon = '🪙';
    else if (/askar|troop|войск/i.test(text)) icon = '🛡️';

    const cleanText = text.replace(/^[⚠️⚠ℹ️⚔️🐉🪙🛡️]+\s*/, '');
    el.innerHTML = `
      <span class="notify-icon">${icon}</span>
      <span class="notify-text">${cleanText}</span>
    `;

    if (opts.onClick) {
      el.style.cursor = 'pointer';
      el.addEventListener('click', opts.onClick);
    }

    const item = {
      id,
      text,
      priority: cat.priority,
      type: cat.type,
      el,
      timestamp: now,
      count: 1,
      timer: setTimeout(() => dismiss(id), duration)
    };

    active.push(item);
    active.sort((a, b) => a.priority - b.priority || b.timestamp - a.timestamp);

    while (active.length > MAX_VISIBLE) {
      const excess = active.pop();
      clearTimeout(excess.timer);
      excess.el.remove();
    }

    stack.replaceChildren(...active.map(n => n.el));
    requestAnimationFrame(() => {
      el.classList.add('notify-visible');
    });

    return id;
  }

  function dismiss(id) {
    const idx = active.findIndex(n => n.id === id);
    if (idx === -1) return;
    const [item] = active.splice(idx, 1);
    clearTimeout(item.timer);
    item.el.classList.remove('notify-visible');
    item.el.classList.add('notify-exit');
    setTimeout(() => item.el.remove(), 250);
  }

  function clearAll() {
    for (const item of active) {
      clearTimeout(item.timer);
      item.el.remove();
    }
    active.length = 0;
  }

  return { show, dismiss, clearAll, PRIORITY };
})();

if (typeof window !== 'undefined') window.CrownNotify = CrownNotify;

function toast(text) {
  const el = $('toast');
  if (el) {
    el.textContent = text;
    el.setAttribute('role','status');
    const modal=[...document.querySelectorAll('dialog[open]')].at(-1);
    if(modal){let feedback=modal.querySelector('.modal-feedback');if(!feedback){feedback=document.createElement('p');feedback.className='modal-feedback';feedback.setAttribute('role','status');modal.append(feedback);}feedback.textContent=text;}
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
  }
  CrownNotify.show(text);
}

function getAvailable(c) {
  if (!c) return 0;
  return c.owner===myRole ? E.available(state, c, true) : 0;
}

function ensureValidSource() {
  const owned = E.owned(state, myRole);
  if (!owned.some(c => c.id === sourceId)) {
    sourceId = owned[0]?.id ?? (state.players[myRole]?.home ?? 0);
  }
}

function cycleSource(delta = 1) {
  const owned = E.owned(state, myRole);
  if (!owned.length) return;
  nextSpecialty = null;
  const curIdx = owned.findIndex(c => c.id === sourceId);
  const nextIdx = (curIdx + delta + owned.length) % owned.length;
  sourceId = owned[nextIdx].id;
  toast(`${state.castles[sourceId].name} (${fmt(state.castles[sourceId].troops)} ${tr('ui_troops')})`);
  updateUI();
  V.render(state, targetId, sourceId);
}

function setDispatchPercent(pct) {
  dispatchPercent = pct;
  document.querySelectorAll('[data-percent]').forEach(b => {
    b.classList.toggle('active', Number(b.dataset.percent) === pct);
  });
  if ($('slider')) $('slider').value = pct;
  if ($('amount') && state.castles[sourceId]) {
    $('amount').value = Math.max(1, Math.floor(getAvailable(state.castles[sourceId]) * (pct / 100)));
  }
  toast(`Qo'shin miqdori: ${pct}%`);
  MobileGame.amountChanged();
  updateDock();
}

// Convert screen pointer coordinates to SVG viewBox coordinates
function svgCoords(e) {
  const svg = $('map');
  try {
    if (svg?.createSVGPoint) {
      const pt = svg.createSVGPoint();
      pt.x = Number.isFinite(e.clientX) ? e.clientX : 550;
      pt.y = Number.isFinite(e.clientY) ? e.clientY : 380;
      if (typeof pt.matrixTransform === 'function' && svg.getScreenCTM) {
        const ctm = svg.getScreenCTM();
        if (ctm && typeof ctm.inverse === 'function') {
          return pt.matrixTransform(ctm.inverse());
        }
      }
    }
  } catch {}
  const rect = svg?.getBoundingClientRect ? svg.getBoundingClientRect() : { left: 0, top: 0, width: 1100, height: 750 };
  const clientX = Number.isFinite(e.clientX) ? e.clientX : (rect.left || 0) + (rect.width || 1100) / 2;
  const clientY = Number.isFinite(e.clientY) ? e.clientY : (rect.top || 0) + (rect.height || 750) / 2;
  const scaleX = rect.width ? 2200 / rect.width : 1;
  const scaleY = rect.height ? 1500 / rect.height : 1;
  return {
    x: (clientX - (rect.left || 0)) * scaleX,
    y: (clientY - (rect.top || 0)) * scaleY
  };
}

// Find closest castle within radius
function castleAtPoint(x, y, radius = 55) {
  let closest = null, best = Infinity;
  for (const c of state.castles) {
    const a=CrownAnchors.node(state,c), dx=x-a.world.x, dy=y-a.world.y;
    const body=dx>=a.sprite.x&&dx<=a.sprite.x+a.w&&dy>=a.sprite.y&&dy<=a.sprite.y+a.h;
    const hitRadius=Number($('castle'+c.id)?.querySelector('.castle-hitbox')?.getAttribute('r'))||radius;
    const distance=Math.hypot(dx,dy);
    if(body||distance<Math.max(radius,hitRadius)){
      const score=body?Math.hypot(dx,dy+a.h*.25)/2:distance;
      if(score<best){closest=c;best=score;}
    }
  }
  return closest;
}

// Execute dispatch from source to target
function executeDispatch(fromId, toId, percent = dispatchPercent) {
  if (state.paused || state.result) return false;
  const target = state.castles[toId];
  if (!target) return false;
  let command;
  if (allCastles) {
    const entries = E.owned(state, myRole).filter(c => c.id !== toId)
      .map(c => ({source: c.id, count: Math.floor(getAvailable(c) * percent / 100)}))
      .filter(e => e.count > 0);
    if (!entries.length) return false;
    command = {type: 'coordinate', targetId: toId, entries, route: marchRoute};
  } else {
    const source = state.castles[fromId];
    if (!source || source.owner !== myRole || fromId === toId) return false;
    const count = Math.floor(getAvailable(source) * percent / 100);
    if (count < 1) { toast(tr('audit_no_troops')); return false; }
    command = {type: 'dispatch', fromId, toId, count, route: marchRoute};
  }
  if (multiplayerMode) return sendWs(command);
  const ok = command.type === 'coordinate'
    ? E.coordinate(state, myRole, toId, command.entries, {route: marchRoute, synchronized: true})
    : E.dispatch(state, myRole, fromId, toId, command.count, {route: marchRoute});
  if (!ok) return false;
  MobileGame.dispatched();
  toast(tr(command.type==='coordinate'?'ui_orders':'ui_dispatched'));
  saveMatch(); updateUI(); V.render(state, targetId, sourceId);
  return true;
}

function executeUpgrade(castleId = sourceId) {
  const c = state.castles[castleId];
  if (!c || c.owner !== myRole || state.paused || state.result) return false;
  const specialty = nextSpecialty || c.specialty;
  if (multiplayerMode) return sendWs({type: 'upgrade', castleId, specialty});
  if (!E.upgrade(state, myRole, castleId, specialty)) return false;
  nextSpecialty = null;
  MobileGame.upgrade();
  toast(tr('ui_upgraded'));
  saveMatch(); updateUI(); V.render(state, targetId, sourceId);
  return true;
}

function applySnapshot(msg, initialize = false) {
  if (msg.roomCode !== currentRoomCode || !Number.isInteger(msg.revision) || msg.revision <= lastNetworkRevision) return false;
  const incoming = E.deserialize(msg.state);
  if (!incoming || !incoming.players[myRole]) return false;
  incoming.paused = false;
  // Keep effect identity across snapshots so an impact sound plays only once.
  incoming.effects = (msg.state.effects || []).map(effect =>
    state.effects.find(old => old.text === effect.text && old.x === effect.x && old.y === effect.y && old.life >= effect.life)
    || effect);
  state = incoming;
  lastNetworkRevision = msg.revision;
  matchActive = true;
  if (initialize) {
    sourceId = state.players[myRole].home;
    targetId = null;
    V.init(state);
    updateUI();
    V.render(state, targetId, sourceId);
  } else if (incoming.result) {
    updateUI();
    V.render(state, targetId, sourceId);
  }
  return true;
}

// ====================================================
// ARMY INSPECTION & RECALL SYSTEM
// ====================================================
let inspectedArmyId = null;
let selectedArmyId = null;
let selectedBattleId = null;
let castleMgmtOpen = false;

function openCastleManagement() {
  ensureValidSource();
  if (!matchActive || !state.castles[sourceId] || state.castles[sourceId].owner !== myRole) return;
  castleMgmtOpen = true;
  const panel = $('castleManagementPanel');
  if (panel) panel.classList.remove('hidden');
  if ($('moreCommandsBtn')) $('moreCommandsBtn').setAttribute('aria-expanded', 'true');
  updateDock();
}

function closeCastleManagement() {
  castleMgmtOpen = false;
  const panel = $('castleManagementPanel');
  if (panel) panel.classList.add('hidden');
  if ($('moreCommandsBtn')) $('moreCommandsBtn').setAttribute('aria-expanded', 'false');
}

function toggleCastleManagement() {
  if (castleMgmtOpen) closeCastleManagement();
  else openCastleManagement();
}

function syncTacticsBtnPlacement() {
  const all = $('allCastlesBtn');
  const allParent = window.innerWidth <= 900 ? $('sourceCycleBtn') : document.querySelector('.percent-group');
  if (all && allParent && all.parentElement !== allParent) allParent.appendChild(all);
  const btn = $('tacticsBtn');
  const tacControls = $('tacticalControls');
  if (btn && tacControls && btn.parentElement !== tacControls) {
    tacControls.appendChild(btn);
  }
}
if (typeof window !== 'undefined') {
  window.addEventListener('resize', syncTacticsBtnPlacement);
}

function selectMovingArmy(army) {
  if (!army) return;
  const a = typeof army === 'object' ? army : state.armies.find(x => x.id === army);
  if (!a) return;
  selectedArmyId = a.id;
  selectedBattleId = null;
  inspectedArmyId = a.id;
  updateDock();
}

function selectActiveBattle(battle) {
  if (!battle) return;
  const b = typeof battle === 'object' ? battle : (state.battles || []).find(x => x.id === battle);
  if (!b) return;
  selectedBattleId = b.id;
  selectedArmyId = null;
  updateDock();
}

function clearContextSelection() {
  selectedArmyId = null;
  selectedBattleId = null;
  updateDock();
}

function executeArmyRecall(armyId) {
  const army = state.armies.find(a => a.id === armyId);
  if (!army || army.owner !== myRole || army.inBattle || army.returning) return;
  if (multiplayerMode && wsClient?.readyState === 1) {
    sendWs({ type: 'recall', armyId });
  } else {
    const ok = E.recall(state, myRole, armyId);
    if (ok) {
      toast(`↩ Armiya ${armyId} ortga qaytarildi.`);
      CrownSound.play('order');
      updateUI();
      V.render(state, targetId, sourceId);
    }
  }
}

function openArmyRecallDialog(army) {
  if (!army) return;
  inspectedArmyId = army.id;
  const src = state.castles[army.source];
  const tgt = state.castles[army.target];

  if ($('armyOriginDest')) $('armyOriginDest').textContent = `${src?.name || 'Garrison'} → ${tgt?.name || 'Target'}`;
  if ($('armyRecallTotal')) $('armyRecallTotal').textContent = army.count;
  const eta = Math.max(0, army.duration - army.t);
  if ($('armyRecallEta')) $('armyRecallEta').textContent = `${eta.toFixed(1)}s`;
  if ($('armyInBattleBadge')) $('armyInBattleBadge').classList.toggle('hidden', !army.inBattle);


  const btn = $('armyRecallActionBtn');
  if (btn) {
    if (army.inBattle) {
      btn.disabled = true;
      btn.textContent = '⚔ ' + tr('ui_in_battle');
    } else if (army.returning) {
      btn.disabled = true;
      btn.textContent = tr('ui_returning') || '↩ Qaytmoqda...';
    } else {
      btn.disabled = army.owner !== myRole || state.paused || !!state.result || (multiplayerMode && wsClient?.readyState !== 1);
      btn.textContent = tr('ui_recall_army') || '↩ Nazad (Ortga qaytarish)';
    }
  }
  if ($('armyRecallDialog')) $('armyRecallDialog').showModal();
}

// ====================================================
// DRAGON STRIKE TARGETING SYSTEM
// ====================================================
let dragonTargeting = false;
let dragonTargetPos = { x: 1100, y: 750 };
let lastMapPointerType = 'mouse';

function renderDragonReticle(x, y) {
  const ret = $('dragonReticle');
  if (!ret) return;
  if (!dragonTargeting) {
    ret.innerHTML = '';
    return;
  }
  ret.innerHTML = `
    <g transform="translate(${x} ${y})">
      <circle r="190" fill="rgba(255, 71, 87, 0.15)" stroke="#ff4757" stroke-width="2.5" stroke-dasharray="8 5"/>
      <circle r="130" fill="rgba(255, 107, 107, 0.2)" stroke="#ff6b6b" stroke-width="1.8" stroke-dasharray="5 4"/>
      <circle r="70" fill="rgba(255, 118, 117, 0.25)" stroke="#ffd32a" stroke-width="2"/>
      <line x1="-210" y1="0" x2="210" y2="0" stroke="#ff4757" stroke-width="1.5" stroke-dasharray="4 3"/>
      <line x1="0" y1="-210" x2="0" y2="210" stroke="#ff4757" stroke-width="1.5" stroke-dasharray="4 3"/>
      <circle r="5" fill="#ffd32a"/>
      <rect x="-45" y="-230" width="90" height="22" rx="11" fill="rgba(6,20,34,0.9)" stroke="#ff4757" stroke-width="1.5"/>
      <text y="-215" text-anchor="middle" fill="#ffd32a" font-size="11" font-weight="900" font-family="'Outfit', sans-serif">🐉 TARGET</text>
    </g>
  `;
}

function cancelDragonStrike() {
  dragonTargeting = false;
  $('dragonTargetingOverlay')?.classList.add('hidden');
  renderDragonReticle(0, 0);
  const mapSvg = $('map');
  if (mapSvg) mapSvg.style.cursor = '';
}

function executeDragonStrike(x, y) {
  if (!dragonTargeting || !E.canDragonStrike(state,myRole)) return false;
  const point=E.clampMapPoint({x:Number.isFinite(x)?x:dragonTargetPos.x,y:Number.isFinite(y)?y:dragonTargetPos.y});
  const ok=multiplayerMode?sendWs({type:'dragon_strike',...point}):E.launchDragonStrike(state,myRole,point.x,point.y);
  if(!ok)return false;
  if(!multiplayerMode){toast("🐉 Ajdaho jangga yo'l oldi! 3s ichida zarba beriladi!");saveMatch();}
  cancelDragonStrike();updateUI();V.render(state,targetId,sourceId);
  return true;
}

function updateDock() {
  syncTacticsBtnPlacement();
  ensureValidSource();
  const owned = E.owned(state, myRole);
  const source = state.castles[sourceId];
  const target = targetId !== null ? state.castles[targetId] : null;

  const hasSource = source?.owner === myRole;
  const dockSourceEl = document.querySelector('.dock-source');
  if (dockSourceEl) dockSourceEl.classList.toggle('hidden', !hasSource);
  const dockTacticsEl = document.querySelector('.dock-tactics');
  if (dockTacticsEl) dockTacticsEl.classList.toggle('hidden', !hasSource);
  if ($('moreCommandsBtn')) {
    $('moreCommandsBtn').disabled = !hasSource;
    $('moreCommandsBtn').setAttribute('aria-expanded', String(castleMgmtOpen));
  }
  if ($('routeToggleBtn')) $('routeToggleBtn').setAttribute('aria-pressed', String(marchRoute === 'flank'));
  if ($('allCastlesBtn')) $('allCastlesBtn').setAttribute('aria-pressed', String(allCastles));
  document.querySelectorAll('[data-percent]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.percent) === dispatchPercent)));

  // ====================================================
  // CONTEXT-AWARE COMMAND STRIP VIEW SWITCHING
  // ====================================================
  const cCastle = $('contextCastleView');
  const cArmy = $('contextArmyView');
  const cBattle = $('contextBattleView');

  // Verify selected moving army still exists
  let movingArmy = null;
  if (selectedArmyId !== null) {
    movingArmy = state.armies.find(a => a.id === selectedArmyId);
    if (!movingArmy) selectedArmyId = null;
  }

  // Verify selected active battle still exists
  let activeBattle = null;
  if (selectedBattleId !== null) {
    activeBattle = (state.battles || []).find(b => b.id === selectedBattleId);
    if (!activeBattle) selectedBattleId = null;
  }

  if (movingArmy) {
    if (cCastle) cCastle.classList.add('hidden');
    if (cBattle) cBattle.classList.add('hidden');
    if (cArmy) cArmy.classList.remove('hidden');

    const srcName = state.castles[movingArmy.source]?.name || 'Origin';
    const tgtName = state.castles[movingArmy.target]?.name || 'Target';
    if ($('stripArmyTitle')) $('stripArmyTitle').textContent = `${srcName} → ${tgtName}`;
    const eta = Math.max(0, movingArmy.duration - movingArmy.t);
    const rtLabel = movingArmy.route === 'flank' ? (window.CrownI18n ? window.CrownI18n.t('route_flank') : 'Flank') : (window.CrownI18n ? window.CrownI18n.t('route_main') : 'Main');
    if ($('stripArmyEta')) $('stripArmyEta').textContent = `ETA: ${eta.toFixed(1)}s`;
    if ($('stripArmyRoute')) $('stripArmyRoute').textContent = rtLabel;

    if ($('stripArmyChips')) $('stripArmyChips').innerHTML = `<span class="army-chip-pill">⚔ ${fmt(movingArmy.count)}</span>`;

    const recallBtn = $('stripRecallBtn');
    if (recallBtn) {
      if (movingArmy.owner !== myRole) {
        recallBtn.disabled = true;
        recallBtn.innerHTML = `<span>⚔️</span> <strong>${tr('target_enemy')}</strong>`;
      } else if (movingArmy.inBattle) {
        recallBtn.disabled = true;
        recallBtn.innerHTML = `<span>⚔️</span> <strong>${tr('ui_in_battle')}</strong>`;
      } else if (movingArmy.returning) {
        recallBtn.disabled = true;
        recallBtn.innerHTML = `<span>↩</span> <strong>${tr('ui_returning')}</strong>`;
      } else {
        recallBtn.disabled = state.paused || !!state.result || (multiplayerMode && wsClient?.readyState !== 1);
        recallBtn.innerHTML = `<span>↩</span> <strong>${tr('ui_nazad')}</strong> <kbd class="kbd-sub">R</kbd>`;
      }
    }
  } else if (activeBattle) {
    if (cCastle) cCastle.classList.add('hidden');
    if (cArmy) cArmy.classList.add('hidden');
    if (cBattle) cBattle.classList.remove('hidden');

    const sides = new Map();
    for (const a of state.armies.filter(army => activeBattle.armies.includes(army.id) && army.count > 0)) {
      sides.set(a.owner, (sides.get(a.owner) || 0) + a.count);
    }
    const bluePower = sides.get('blue') || 0;
    const redPower = sides.get('red') || 0;
    const totalPower = (bluePower + redPower) || 1;
    const bluePct = Math.round((bluePower / totalPower) * 100);
    const redPct = 100 - bluePct;

    if ($('stripBattleRatioText')) $('stripBattleRatioText').textContent = `🔵 ${bluePower} vs 🔴 ${redPower}`;
    if ($('stripBattleBarBlue')) $('stripBattleBarBlue').style.width = `${bluePct}%`;
    if ($('stripBattleBarRed')) $('stripBattleBarRed').style.width = `${redPct}%`;
  } else {
    if (cArmy) cArmy.classList.add('hidden');
    if (cBattle) cBattle.classList.add('hidden');
    if (cCastle) cCastle.classList.remove('hidden');
  }

  // 1. Active Castle Card & Castle Management Panel Sync
  if (source) {
    if ($('activeName')) $('activeName').textContent = source.name;
    if ($('activeStars')) $('activeStars').textContent = '★'.repeat(source.level);
    if ($('sourceComposition')) $('sourceComposition').textContent = CrownView.composition(source, true);
    if ($('activeGarrison')) $('activeGarrison').textContent = fmt(source.troops);

    const sourceStrat = E.getCastleStrategicInfo ? E.getCastleStrategicInfo(source, state.epoch || '18th', state) : null;
    if (sourceStrat) {
      if ($('activeCatPill')) {
        $('activeCatPill').textContent = `${sourceStrat.icon} ${sourceStrat.category.tag}`;
        $('activeCatPill').style.borderColor = sourceStrat.themeColor;
        $('activeCatPill').style.color = sourceStrat.themeColor;
      }
      if ($('activeBuffLine')) {
        $('activeBuffLine').textContent = `· ${sourceStrat.buffShort}`;
        $('activeBuffLine').style.color = sourceStrat.themeColor;
      }
    }

    if ($('activeSpecPill')) {
      const specMap = {
        balanced: window.CrownI18n ? window.CrownI18n.t('spec_balanced') : 'Muvozanatli',
        military: window.CrownI18n ? window.CrownI18n.t('spec_military') : 'Harbiy',
        economy: window.CrownI18n ? window.CrownI18n.t('spec_economy') : 'Iqtisodiy'
      };
      $('activeSpecPill').textContent = specMap[source.specialty] || 'Muvozanatli';
      $('activeSpecPill').className = `spec-pill spec-${source.specialty || 'balanced'}`;
    }

    if ($('mgmtCastleTitle')) $('mgmtCastleTitle').textContent = source.name;
    if ($('mgmtCastleMeta')) $('mgmtCastleMeta').textContent = `Level ${source.level} · ${source.specialty || 'balanced'}`;
    if ($('mgmtBuffDescription')) $('mgmtBuffDescription').textContent = sourceStrat?.buffDesc || '';
    if ($('mgmtBuffScope')) $('mgmtBuffScope').textContent = sourceStrat?.scope || '';

    if ($('activePassiveDesc')) {
      let desc = sourceStrat?.buffDesc || '';
      if (source.stabilizing && source.stabilizing > 0) {
        const stabMsg = window.CrownI18n ? window.CrownI18n.t('stabilizing_badge') : "Barqarorlashuv";
        desc = `⏳ ${stabMsg} (${Math.ceil(source.stabilizing)}s, 50% ishlab chiqarish) · ${desc}`;
      }
      $('activePassiveDesc').textContent = desc;
    }

    // Upgrade Button
    const upBtn = $('upgradeBtn');
    if (upBtn) {
      const cost = E.upgradeCost(source, myRole, state);
      const canUpgrade = (!multiplayerMode || wsClient?.readyState === 1) && source.owner === myRole && source.level < E.MAX_CASTLE_LEVEL && state.players[myRole].gold >= cost && !state.paused && !state.result;
      upBtn.disabled = !canUpgrade;
      const hero = state.players[myRole]?.hero;
      const current = E.incomeFor(source, source.level, source.specialty, hero), next = E.incomeFor(source, Math.min(E.MAX_CASTLE_LEVEL, source.level + 1), nextSpecialty || source.specialty, hero);
      const preview = `⚔ ${rate(current.troops)} → ${rate(next.troops)}/s · 🪙 ${rate(current.gold)} → ${rate(next.gold)}/s`;
      $('upgradePreview').textContent = source.level < E.MAX_CASTLE_LEVEL ? preview : tr('audit_max');
      $('upgradePreview').title = tr('audit_upgrade_note');
      upBtn.title = source.owner !== myRole ? tr('audit_no_source') : source.level >= E.MAX_CASTLE_LEVEL ? tr('audit_max') : state.paused ? tr('audit_paused') : state.players[myRole].gold < cost ? `${tr('audit_need_gold')} ${fmt(cost - state.players[myRole].gold)}` : preview;
      $('sourceIncome').textContent = source.owner === myRole ? `⚔ +${rate(current.troops)}/s · 🪙 +${rate(current.gold)}/s` : tr('audit_no_source');
      $('sourceIncome').title = tr('audit_special_buildings');
      $('activeGarrison').title = `${tr('audit_available')}: ${fmt(getAvailable(source))} · ${tr('audit_reserved')}: ${E.reserved(state, source.id)}`;

      if ($('upgradeLabel')) $('upgradeLabel').textContent = source.level < E.MAX_CASTLE_LEVEL ? `${tr('ui_upgrade')} (L${source.level + 1})` : (window.CrownI18n ? window.CrownI18n.t('max_level') : 'MAX DARAJA');
      if ($('upgradeCostText')) $('upgradeCostText').textContent = source.level < E.MAX_CASTLE_LEVEL ? `${cost} ${tr('gold')} ${state.players[myRole].gold < cost ? '· ' + tr('audit_need_gold') + ' ' + Math.ceil(cost - state.players[myRole].gold) : ''}` : 'Max';
    }

    // Specialization sync in panel
    if ($('tacticsSpecialty') && document.activeElement !== $('tacticsSpecialty')) {
      $('tacticsSpecialty').value = nextSpecialty || source.specialty || 'balanced';
    }

    // Route status
    if ($('routeLabel')) {
      const tMain = window.CrownI18n ? window.CrownI18n.t('route_main') : "BOSH YO'L";
      const tFlank = window.CrownI18n ? window.CrownI18n.t('route_flank') : "QANOT YO'LI";
      $('routeLabel').textContent = marchRoute === 'fast' ? tMain : tFlank;
    }
    if ($('routeSpeedText')) {
      $('routeSpeedText').textContent = `${routeSpeedFor(source)} px/s`;
    }

    // Reserve status
    if ($('reserveStatus') || $('mgmtReserveStatus')) {
      const resSuff = window.CrownI18n ? window.CrownI18n.t('reserve_count_suffix') : 'zaxira';
      const resText = source.reserve > 0 ? `${source.reserve} ${resSuff}` : `0 ${resSuff}`;
      if ($('reserveStatus')) $('reserveStatus').textContent = resText;
      if ($('mgmtReserveStatus')) $('mgmtReserveStatus').textContent = resText;
    }
    if ($('reserveInput') && document.activeElement !== $('reserveInput')) {
      $('reserveInput').value = source.reserve || 0;
    }
  }

  // 2. Target and Dispatch Action (Compact in Command Strip)
  const targetHint = $('targetHint');
  const fcDetails = $('forecastDetails');
  const dispatchBtn = $('dispatchActionBtn');

  if (target && target.id !== sourceId) {
    if (targetHint) targetHint.classList.add('hidden');
    if (fcDetails) fcDetails.classList.remove('hidden');

    if ($('targetName')) {
      const allPrefix = (allCastles && window.CrownI18n) ? (window.CrownI18n.t('all_castles') + ' → ') : allCastles ? '🌐 → ' : '';
      $('targetName').textContent = `${allPrefix}${target.name}`;
    }
    const targetStrat = E.getCastleStrategicInfo ? E.getCastleStrategicInfo(target, state.epoch || '18th', state) : null;
    if (targetStrat) {
      if ($('targetCatPill')) {
        $('targetCatPill').textContent = `${targetStrat.icon} ${targetStrat.category.tag}`;
        $('targetCatPill').style.borderColor = targetStrat.themeColor;
        $('targetCatPill').style.color = targetStrat.themeColor;
      }
      if ($('targetYieldPill')) $('targetYieldPill').textContent = targetStrat.shortYield || targetStrat.yieldText;
      if ($('targetBuffPill')) $('targetBuffPill').textContent = targetStrat.buffShort || targetStrat.buffTitle;
      if ($('targetScopePill')) $('targetScopePill').textContent = targetStrat.scope;
      if ($('targetSummary')) {
        $('targetSummary').title = `${target.name} (${targetStrat.categoryName})\nRole: ${targetStrat.eraName}\nYield: ${targetStrat.yieldText}\nBuff: ${targetStrat.buffDesc} [${targetStrat.scope}]\nTactical: ${targetStrat.tacticalAdvice}`;
      }
    }
    const isFriendly = target.owner === myRole;
    const targetTypeStr = isFriendly 
      ? (window.CrownI18n ? window.CrownI18n.t('target_friendly') : "do'stona") 
      : target.owner !== null 
        ? (window.CrownI18n ? window.CrownI18n.t('target_enemy') : "dushman") 
        : (window.CrownI18n ? window.CrownI18n.t('target_neutral') : "neytral");
    const defSuff = window.CrownI18n ? window.CrownI18n.t('defense_suffix') : "himoya";
    if ($('targetComposition')) $('targetComposition').textContent = CrownView.composition(target, true);
    if ($('targetDefenseText')) $('targetDefenseText').textContent = `${fmt(target.troops)} ${defSuff} (${targetTypeStr})`;

    const rewCard = $('targetCaptureReward');
    const rewUnlocks = $('targetRewardUnlocks');
    const rewIncome = $('targetRewardIncome');
    if (rewCard && rewUnlocks && rewIncome) {
      const inc = E.incomeFor(target, target.level, target.specialty, state.players[myRole]?.hero);
      const incText = `+${inc.troops.toFixed(1)} ⚔/s · +${inc.gold.toFixed(1)} 🪙/s`;
      rewIncome.textContent = incText;

      const eraName = (E.getCastleRoleName && E.getCastleRoleName(state.epoch, target.type)) || E.TYPES[target.type]?.name || target.type;
      const unlockLabel = `${eraName} · ${E.getCastleStrategicInfo(target,state.epoch,state).buffDesc}`;

      if (isFriendly) {
        rewCard.setAttribute('data-mode', 'active');
        const tag = rewCard.querySelector('.reward-tag');
        if (tag) tag.textContent = '🏰 ACTIVE YIELD:';
        rewUnlocks.textContent = unlockLabel;
      } else {
        rewCard.setAttribute('data-mode', 'reward');
        const tag = rewCard.querySelector('.reward-tag');
        if (tag) tag.textContent = '🎁 REWARD:';
        rewUnlocks.textContent = unlockLabel;
      }
    }

    const available = source ? getAvailable(source) : 0;
    const count = allCastles
      ? owned.filter(c => c.id !== target.id).reduce((sum, c) => sum + Math.floor(getAvailable(c) * (dispatchPercent / 100)), 0)
      : Math.floor(available * (dispatchPercent / 100));

    const sources = allCastles ? owned.filter(c => c.id !== target.id && Math.floor(getAvailable(c) * dispatchPercent / 100) > 0) : source && source.owner === myRole ? [source] : [];
    const eta = sources.length ? Math.max(...sources.map(c => E.routeLength(E.routeBetween(c, target, marchRoute, state.mapIndex)) / routeSpeedFor(c))) : 0;
    const projected = E.forecastCastle(state,target.id,eta,myRole);
    const estimate = siegeEstimate(count, projected, projected.troops);
    if (allCastles) {
      const strength = sources.reduce((n,c)=>n+E.siegeOutcome(state,{owner:myRole,source:c.id,count:Math.floor(getAvailable(c)*dispatchPercent/100),route:marchRoute},projected).strength,0);
      estimate.wins = strength > E.defense(state,projected);
    }
    const risk = !isFriendly && !estimate.wins;
    $('targetSummary').dataset.risk = risk ? 'high' : 'normal';
    $('battleForecast').textContent = isFriendly ? `${tr('audit_reinforce')} +${fmt(count)} · ${eta.toFixed(1)}s` : allCastles
      ? `${tr('ui_orders')}: ${fmt(count)} ${tr('ui_troops')} · ~${eta.toFixed(1)}s`
      : `${tr('audit_required')}: ~${fmt(requiredForSiege(projected, projected.troops))} · ${risk ? tr('audit_risk') : tr('audit_advantage')} · ${tr('audit_survivors')}: ~${fmt(estimate.survivors)}`;
    $('forecastNote').textContent = tr(allCastles ? 'ui_group_forecast' : 'audit_forecast_note');
    $('dispatchReason').textContent = multiplayerMode && wsClient?.readyState !== 1 ? tr('audit_disconnected') : state.paused ? tr('audit_paused') : count < 1 ? tr('audit_no_troops') : risk ? tr('audit_risk_allowed') : '';
    if (dispatchBtn) {
      dispatchBtn.disabled = count < 1 || state.paused || !!state.result || (multiplayerMode && wsClient?.readyState !== 1);
      const textSpan = $('dispatchActionText') || dispatchBtn;
      const actWord = isFriendly 
        ? (window.CrownI18n ? window.CrownI18n.t('action_reinforce') : 'YORDAM') 
        : (window.CrownI18n ? window.CrownI18n.t('action_attack') : 'HUJUM');
      const label = `${isFriendly ? '↗' : '⚔'} ${actWord} (${count})`;
      if (textSpan.textContent !== label) textSpan.textContent = label;
    }
  } else {
    if (targetHint) targetHint.classList.remove('hidden');
    if (fcDetails) fcDetails.classList.add('hidden');
    $('dispatchReason').textContent = hasSource ? '' : tr('audit_no_source');
    if (dispatchBtn) {
      dispatchBtn.disabled = true;
      const textSpan = $('dispatchActionText') || dispatchBtn;
      const actDispatch = window.CrownI18n ? window.CrownI18n.t('dispatch_action') : 'YUBORISH →';
      const label = `⚔ ${actDispatch}`;
      if (textSpan.textContent !== label) textSpan.textContent = label;
    }
  }

  window.CrownEpochVisuals?.syncUI(state.epoch || '18th');
  // 4. Special Ability Rail (Dragon Strike & Hero Ability)
  const canDragon = E.canDragonStrike(state, myRole);
  const cd = (state.dragonCooldowns && state.dragonCooldowns[myRole]) || 0;
  const dragonBtn = $('dragonStrikeBtn');
  const dragonCdBadge = $('dragonCdBadge');
  if (dragonBtn) {
    if (cd > 0) {
      dragonBtn.className = 'dragon-btn locked';
      if (dragonCdBadge) dragonCdBadge.textContent = `${Math.ceil(cd)}s`;
      dragonBtn.title = `${tr('ui_dragon_strike')} (${tr('ui_dragon_cooldown')}: ${Math.ceil(cd)}s)`;
    } else if (canDragon) {
      dragonBtn.className = 'dragon-btn ready';
      if (dragonCdBadge) dragonCdBadge.textContent = 'READY';
      dragonBtn.title = `${tr('ui_dragon_strike')} (1000 ${tr('gold')}) · ${tr('ui_dragon_ready')}!`;
    } else {
      dragonBtn.className = 'dragon-btn locked';
      if (dragonCdBadge) dragonCdBadge.textContent = '1000🪙';
      const conds = [];
      if (E.owned(state, myRole).length < 3) conds.push('3+ castles');
      if (state.time < 40) conds.push(`time >= 40s (${Math.ceil(40 - state.time)}s)`);
      if ((state.players[myRole]?.gold || 0) < 1000) conds.push('1000 gold');
      dragonBtn.title = `${tr('ui_dragon_strike')} [${tr('ui_locked')}]: ${conds.join(', ')}`;
    }
  }

  // Hero Ability in Rail
  const heroKey = state.players[myRole]?.hero || 'vanguard';
  const heroNames = {
    vanguard: 'Al-Muzaffar (Vanguard)',
    fortifier: 'Grand Fortifier',
    guildmaster: 'Imperial Treasurer',
    infiltrator: 'Shadow Infiltrator'
  };
  const heroPerks = {
    vanguard: '+15% Speed · +10% Combat',
    fortifier: '-25% Upgrade · +0.5/s',
    guildmaster: '+150 Gold · +30% Yield',
    infiltrator: '+25% Flank · +20% Siege'
  };
  const heroIcons = { vanguard: '⚡', fortifier: '🛡️', guildmaster: '💰', infiltrator: '🏹' };
  if ($('heroRailIcon')) $('heroRailIcon').textContent = heroIcons[heroKey] || '👑';
  if ($('heroRailName')) $('heroRailName').textContent = heroNames[heroKey] || 'Commander';
  if ($('heroRailPerk')) $('heroRailPerk').textContent = heroPerks[heroKey] || '+15% Speed';
}

function updateWeatherForecastPopover() {
  const popover = $('weatherForecastPopover');
  if (!popover || popover.classList.contains('hidden')) return;
  if (!state.weather) return;
  const wType = state.weather.type || 'clear';
  const wIcons = { clear: '☀️', rain: '🌧️', fog: '🌫️', snow: '❄️' };
  const wName = window.CrownI18n ? window.CrownI18n.t(`weather_${wType}`) : wType;
  const wDesc = window.CrownI18n ? window.CrownI18n.t(`weather_${wType}_desc`) : '';
  const rem = Math.max(0, Math.ceil(state.weather.timer || 0));

  const cycle = ['clear', 'rain', 'fog', 'snow'];
  const nextIdx = (cycle.indexOf(wType) + 1) % cycle.length;
  const nextType = cycle[nextIdx];
  const nextName = window.CrownI18n ? window.CrownI18n.t(`weather_${nextType}`) : nextType;
  const nextDesc = window.CrownI18n ? window.CrownI18n.t(`weather_${nextType}_desc`) : '';

  if ($('forecastIcon')) $('forecastIcon').textContent = wIcons[wType] || '☀️';
  if ($('forecastCurrentTitle')) $('forecastCurrentTitle').textContent = wName;
  if ($('forecastCurrentTimer')) $('forecastCurrentTimer').textContent = `${rem}s`;
  if ($('forecastEffectText')) $('forecastEffectText').textContent = wDesc;
  if ($('forecastNextIcon')) $('forecastNextIcon').textContent = wIcons[nextType] || '☀️';
  if ($('forecastNextTitle')) $('forecastNextTitle').textContent = nextName;
  if ($('forecastNextDesc')) $('forecastNextDesc').textContent = nextDesc;
}

function updateUnitBattles() {
  const panel = $('unitBattlePanel');
  if (!panel) return;
  const battles = (state.battles || []).map(b => {
    const sides = new Map();
    for (const army of state.armies.filter(a => b.armies.includes(a.id) && a.count > 0)) {
      if (!sides.has(army.owner)) sides.set(army.owner, {count:0, origins:new Set()});
      const side = sides.get(army.owner);
      side.origins.add(state.castles[army.source]?.name || army.owner);
      side.count += army.count;
    }
    return [...sides].map(([owner, side]) => `<div class="battle-side" data-owner="${esc(owner)}"><b>${esc([...side.origins].join(', '))}</b><span>${esc(CrownView.composition(side, true))}</span></div>`).join('<div class="battle-versus">⚔</div>');
  }).filter(Boolean);
  panel.classList.toggle('hidden', !battles.length);
  const content = battles.map(b => `<div class="unit-battle">${b}</div>`).join('');
  if (panel.innerHTML !== content) panel.innerHTML = content;
}

function updatePlayerTable() {
  const table = $('gamePlayerTable');
  const tbody = $('playerTableBody');
  if (!table || !tbody || !state || !state.players) return;

  const roles = Object.keys(state.players);
  const roleColors = {
    blue: '#279fff',
    red: '#ff525b',
    green: '#2ecc71',
    purple: '#bb44f0'
  };
  const roleDefaultNames = {
    blue: 'AZURE',
    red: 'CRIMSON',
    green: 'EMERALD',
    purple: 'VIOLET'
  };

  const rowsHtml = roles.map(role => {
    const isMe = (role === myRole);
    const pData = state.players[role] || {};
    const totals = E.totals(state, role);
    const goldCount = Math.floor(pData.gold ?? 0);
    const troopCount = totals ? totals.total : (pData.troops ?? 0);
    const color = roleColors[role] || '#fff';

    let name = '';
    if (isMe) {
      name = getPlayerDisplayName();
    } else if (multiplayerMode && lobbyState?.players?.[role]?.username) {
      name = lobbyState.players[role].username;
    } else if (role === 'red' && opponentName) {
      name = opponentName;
    } else {
      const heroKey = pData.hero;
      const heroName = heroKey && E.HEROES?.[heroKey]?.name;
      name = heroName ? `${roleDefaultNames[role]} (${heroName})` : roleDefaultNames[role];
    }

    const youTag = isMe ? `<span class="player-you-tag">(${tr('audit_you')})</span>` : '';
    const activeClass = isMe ? 'is-me' : '';

    return `<tr class="player-roster-row ${activeClass}" data-role="${role}">
      <td class="player-name-cell">
        <span class="player-color-dot" style="background:${color};box-shadow:0 0 7px ${color}aa;"></span>
        <span class="player-name-text" title="${esc(name)}">${esc(name)} ${youTag}</span>
      </td>
      <td class="player-stat-cell player-troops-cell text-right">${fmt(troopCount)}</td>
      <td class="player-stat-cell player-gold-cell text-right">${fmt(goldCount)}</td>
    </tr>`;
  }).join('');

  if (tbody.innerHTML !== rowsHtml) {
    tbody.innerHTML = rowsHtml;
  }
}

function updateUI() {
  updateUnitBattles();
  updatePlayerTable();
  window.updateUI = updateUI;
  E.sync(state);
  syncTacticsState();
  ensureValidSource();

  const p = state.players[myRole] || { gold: 0, troops: 0 };
  const inc = E.income(state, myRole);
  const totals = E.totals(state, myRole);
  if($('objectiveText'))$('objectiveText').textContent=tr(state.victoryMode==='conquest'?'ui_objective_conquest':'ui_objective_crown');

  const activeKeys = Object.keys(state.players);
  const totalCastles = state.castles.length;

  // Header Counters
  if ($('gold')) $('gold').textContent = fmt(p.gold);
  if ($('goldRate')) $('goldRate').textContent = `+${rate(inc.gold)}/s`;
  if ($('troops')) $('troops').textContent = fmt(totals.total);
  if ($('troopRate')) $('troopRate').textContent = `+${rate(inc.troops)}/s`;
  if ($('timer')) $('timer').textContent = time(state.time);

  // Dominance calculations for all active factions
  const blueCount = E.owned(state, 'blue').length;
  const redCount = E.owned(state, 'red').length;
  const greenCount = state.players.green ? E.owned(state, 'green').length : 0;
  const purpleCount = state.players.purple ? E.owned(state, 'purple').length : 0;

  const bluePercent = Math.round(blueCount / totalCastles * 100);
  const redPercent = Math.round(redCount / totalCastles * 100);
  const greenPercent = state.players.green ? Math.round(greenCount / totalCastles * 100) : 0;
  const purplePercent = state.players.purple ? Math.round(purpleCount / totalCastles * 100) : 0;

  if ($('domBlue')) $('domBlue').textContent = `${bluePercent}%`;
  if ($('domRed')) $('domRed').textContent = `${redPercent}%`;
  if ($('owned')) $('owned').textContent = `${E.owned(state, myRole).length} / ${totalCastles}`;

  // Dominance bar segments
  const barBlue = $('controlBar');
  const barRed = $('controlBarRed');
  const barGreen = $('controlBarGreen');
  const barPurple = $('controlBarPurple');

  if (barBlue) barBlue.style.width = `${bluePercent}%`;
  if (barRed) barRed.style.width = `${redPercent}%`;
  if (barGreen) {
    barGreen.style.width = `${greenPercent}%`;
    barGreen.style.display = state.players.green ? 'inline-block' : 'none';
  }
  if (barPurple) {
    barPurple.style.width = `${purplePercent}%`;
    barPurple.style.display = state.players.purple ? 'inline-block' : 'none';
  }

  // Live Edge Dominance Strip
  const neutralCount = state.castles.filter(c => !c.owner).length;
  const neutralPercent = (neutralCount / totalCastles) * 100;
  if ($('domStripBlue')) $('domStripBlue').style.width = `${bluePercent}%`;
  if ($('domStripRed')) $('domStripRed').style.width = `${redPercent}%`;
  if ($('domStripGreen')) {
    $('domStripGreen').style.width = `${greenPercent}%`;
    $('domStripGreen').style.display = state.players.green ? 'block' : 'none';
  }
  if ($('domStripPurple')) {
    $('domStripPurple').style.width = `${purplePercent}%`;
    $('domStripPurple').style.display = state.players.purple ? 'block' : 'none';
  }
  if ($('domStripNeutral')) $('domStripNeutral').style.width = `${neutralPercent}%`;

  // 4-Player Dominance Labels in HUD
  const colBlue = window.CrownI18n ? window.CrownI18n.t('color_blue') : "Ko'k";
  const colRed = window.CrownI18n ? window.CrownI18n.t('color_red') : "Qizil";
  const colGreen = window.CrownI18n ? window.CrownI18n.t('color_green') : "Yashil";
  const colPurple = window.CrownI18n ? window.CrownI18n.t('color_purple') : "Binafsha";

  if ($('domBlue')) $('domBlue').textContent = `${bluePercent}%`;
  if ($('domRed')) $('domRed').textContent = `${redPercent}%`;
  if ($('domGreen')) $('domGreen').textContent = `${greenPercent}%`;
  if ($('domPurple')) $('domPurple').textContent = `${purplePercent}%`;

  if ($('hudPlayerGreen')) $('hudPlayerGreen').classList.toggle('hidden', !state.players.green);
  if ($('hudPlayerPurple')) $('hudPlayerPurple').classList.toggle('hidden', !state.players.purple);

  // Dominance Names
  const roleTitles = { blue: 'AZURE', red: 'CRIMSON', green: 'EMERALD', purple: 'VIOLET' };
  if ($('domBlueName')) $('domBlueName').textContent = myRole === 'blue' ? (currentUsername || colBlue.toUpperCase()) : (myRole === 'red' ? (opponentName || 'AZURE') : 'AZURE');
  if ($('domRedName')) $('domRedName').textContent = myRole === 'red' ? (currentUsername || colRed.toUpperCase()) : (opponentName || 'CRIMSON');

  if ($('bluePlayerHudLabel')) {
    const youLbl = window.CrownI18n ? window.CrownI18n.t('you_azure') : 'SIZ (AZURE)';
    $('bluePlayerHudLabel').textContent = `${tr('audit_you')} (${myRole.toUpperCase()})`;
  }
  if ($('redPlayerHudLabel')) {
    $('redPlayerHudLabel').textContent = tr('audit_opponents');
  }

  // Total enemy troops counter (sum across all opposing factions)
  const enemyTroops = activeKeys
    .filter(k => k !== myRole)
    .reduce((sum, k) => sum + E.totals(state, k).total, 0);
  if ($('enemyInfo')) $('enemyInfo').textContent = fmt(enemyTroops);

  // Online speed and pause are controlled by the room server.
  for (const id of ['speedBtn', 'pause', 'diffBadgeBtn', 'aiDifficulty', 'aiStyle']) if ($(id)) $(id).disabled = multiplayerMode;
  document.querySelectorAll('.speed-opt-btn').forEach(b => b.disabled = multiplayerMode);
  if (multiplayerMode && $('speedBtn')) $('speedBtn').textContent = SPEED_LABELS[0.65];
  // Controls
  if ($('diffBadgeBtn')) {
    const d = state.aiDifficulty || 'normal';
    $('diffBadgeBtn').textContent = DIFF_LABELS[d] || '🟡 Нормальный';
  }
  if ($('pause')) {
    $('pause').textContent = state.paused ? '▶' : 'Ⅱ';
    $('pause').setAttribute('aria-label', tr(state.paused?'ui_resume':'ui_pause'));
    $('pause').title=multiplayerMode?tr('ui_online_clock'):tr(state.paused?'ui_resume':'ui_pause');
  }
  if ($('resumeNotice')) $('resumeNotice').hidden = !state.paused || !!state.result || ($('difficultyDialog')?.open) || (!$('mainMenuScreen')?.classList.contains('hidden'));
  const isPauseModalVisible = !!state.pauseMenuModalOpen && !state.result && document.body.classList.contains('in-game') && !$('menuDialog')?.open && !$('confirmMenuDialog')?.open && !$('difficultyDialog')?.open && (!$('mainMenuScreen') || $('mainMenuScreen').classList.contains('hidden'));
  if ($('pauseOverlayModal')) {
    $('pauseOverlayModal').classList.toggle('hidden', !isPauseModalVisible);
  }
  document.body.classList.toggle('game-paused', isPauseModalVisible);

  // Weather HUD Capsule & Atmospheric Visuals
  if (state.weather) {
    const wType = state.weather.type || 'clear';
    const wIcons = { clear: '☀️', rain: '🌧️', fog: '🌫️', snow: '❄️' };
    const wIcon = wIcons[wType] || '☀️';
    const wNameKey = `weather_${wType}`;
    const wDescKey = `weather_${wType}_desc`;
    const wName = window.CrownI18n ? window.CrownI18n.t(wNameKey) : wType.toUpperCase();
    const wDesc = window.CrownI18n ? window.CrownI18n.t(wDescKey) : '';
    const remSec = Math.max(0, Math.ceil(state.weather.timer || 0));

    if ($('weatherIcon')) $('weatherIcon').textContent = wIcon;
    if ($('weatherName')) $('weatherName').textContent = wName.toUpperCase();
    if ($('weatherTimer')) $('weatherTimer').textContent = `${remSec}s`;
    if ($('weatherHudBadge')) {
      const nextTxt = window.CrownI18n ? window.CrownI18n.t('weather_next') : 'Смена через';
      $('weatherHudBadge').title = `${wName}: ${wDesc} · ${nextTxt} ${remSec}s`;
      $('weatherHudBadge').setAttribute('data-weather', wType);
    }

    const atmo = $('weatherAtmosphere');
    if (atmo) {
      const expectedClass = `weather-atmosphere weather-${wType}`;
      if (atmo.className !== expectedClass) {
        atmo.className = expectedClass;
      }
    }

    updateWeatherForecastPopover();

    if (lastSeenWeather !== wType) {
      if (lastSeenWeather !== null) {
        if (typeof CrownSound !== 'undefined' && CrownSound.play) {
          CrownSound.play('weather');
        }
        toast(`${wIcon} ${wName}: ${wDesc}`);
      }
      lastSeenWeather = wType;
    }
  }

  // Hero Commander HUD Capsule
  const myHero = state.players[myRole]?.hero || selectedHero || 'vanguard';
  const heroIcons = { vanguard: '⚡', fortifier: '🛡️', guildmaster: '💰', infiltrator: '🏹' };
  const heroAvatars = {
    vanguard: 'assets/hero_vanguard_thumb.webp',
    fortifier: 'assets/hero_fortifier_thumb.webp',
    guildmaster: 'assets/hero_guildmaster_thumb.webp',
    infiltrator: 'assets/hero_infiltrator_thumb.webp'
  };
  const hIcon = heroIcons[myHero] || '⚡';
  const hName = window.CrownI18n ? window.CrownI18n.t(`hero_${myHero}_name`) : myHero;
  const hTitle = window.CrownI18n ? window.CrownI18n.t(`hero_${myHero}_title`) : '';
  const hDesc = window.CrownI18n ? window.CrownI18n.t(`hero_${myHero}_desc`) : '';
  if ($('hudHeroIcon')) $('hudHeroIcon').textContent = hIcon;
  if ($('hudHeroAvatar')) $('hudHeroAvatar').style.backgroundImage = `url('${heroAvatars[myHero] || heroAvatars.vanguard}')`;
  if ($('hudHeroName')) $('hudHeroName').textContent = hName;
  if ($('hudHeroPill')) $('hudHeroPill').title = `${hTitle}\n${hDesc}`;

  updateDock();

  // Crown Control HUD Banner
  const crownBanner = $('crownControlBanner');
  if (crownBanner) {
    if (state.crownHolder && state.crownHoldTimer !== undefined && state.crownHoldTimer > 0 && !state.result) {
      crownBanner.classList.remove('hidden');
      const holderName = state.crownHolder === myRole ? (window.CrownI18n ? window.CrownI18n.t('player_you') : 'Siz') : state.crownHolder.toUpperCase();
      const rem = Math.max(0, Math.ceil(30 - state.crownHoldTimer));
      const holdTxt = window.CrownI18n ? window.CrownI18n.t('crown_control_active') : "CROWN CONTROL: G'alabagacha";
      if ($('crownControlText')) $('crownControlText').textContent = holdTxt.replace('{player}',holderName);
      if ($('crownControlTimer')) $('crownControlTimer').textContent = `${rem}s`;
      crownBanner.style.borderColor = (state.crownHolder === myRole) ? '#4dc8ff' : '#ff4757';
    } else {
      crownBanner.classList.add('hidden');
    }
  }

  // Victory check
  if (state.result && !$('resultDialog').open) {
    const isWin = state.result === myRole;
    const winnerName = {
      blue: `${colBlue} (Azure)`,
      red: `${colRed} (Crimson)`,
      green: `${colGreen} (Emerald)`,
      purple: `${colPurple} (Violet)`
    }[state.result] || state.result;

    const winTitle = window.CrownI18n ? window.CrownI18n.t('victory_crown_text') : "G'alaba! Toj Sizniki!";
    const defTitle = window.CrownI18n ? `${window.CrownI18n.t('defeat_text')} ${winnerName}!` : `Mag'lubiyat! ${winnerName} g'alaba qozondi!`;
    const timeWord = window.CrownI18n ? window.CrownI18n.t('time_suffix') : "O'yin vaqti:";

    if ($('resultTitle')) $('resultTitle').textContent = isWin ? winTitle : defTitle;
    if(state.result==='draw')$('resultTitle').textContent=tr('audit_draw');
    if ($('resultText')) {
      const reasonText = state.resultReason === 'crown_control'
        ? (window.CrownI18n ? window.CrownI18n.t('mode_crown_control') : 'Crown Control')
        : E.owned(state,state.result).length===totalCastles
          ? tr('audit_conquest')
          : state.result==='draw'
            ? tr('audit_draw')
            : state.resultReason==='forfeit'
              ? tr('audit_forfeit')
              : tr('audit_elimination');
      $('resultText').textContent = `${reasonText} · ${time(state.time)}`;
    }

    const statProduced = window.CrownI18n ? window.CrownI18n.t('res_stat_produced') : "Ishlab chiqarilgan askarlar:";
    const statLost = window.CrownI18n ? window.CrownI18n.t('res_stat_lost') : "Yo'ldagi janglarda yo'qotilgan:";
    const statCap = window.CrownI18n ? window.CrownI18n.t('res_stat_captured') : "Egallangan qal'alar:";

    if ($('resultStats')) {
      const st = state.stats[myRole] || {};
      const totalLosses = (st.roadLosses || 0) + (st.attackLosses || 0) + (st.defenseLosses || 0);
      $('resultStats').innerHTML = `
        <div class="result-stats-grid">
          <div class="result-stat-card">
            <span class="stat-icon">🏰</span>
            <div class="stat-meta">
              <small>${statCap}</small>
              <strong>${st.captures || 0}</strong>
            </div>
          </div>
          <div class="result-stat-card">
            <span class="stat-icon">⚔️</span>
            <div class="stat-meta">
              <small>${tr('ui_stats_dispatched')}</small>
              <strong>${fmt(st.dispatched || 0)}</strong>
            </div>
          </div>
          <div class="result-stat-card">
            <span class="stat-icon">🛡️</span>
            <div class="stat-meta">
              <small>${statProduced}</small>
              <strong>${fmt(st.produced || 0)}</strong>
            </div>
          </div>
          <div class="result-stat-card">
            <span class="stat-icon">💀</span>
            <div class="stat-meta">
              <small>${statLost}</small>
              <strong>${fmt(totalLosses)}</strong>
            </div>
          </div>
        </div>
      `;
    }
    if (window.CrownCareer) {
      const st = state.stats[myRole] || {};
      const allCastlesCaptured = isWin && E.owned(state, myRole).length === totalCastles;
      const myCastle = state.castles.find(c => c.owner === myRole);
      const hasReserve = myCastle ? (myCastle.reserve > 0) : false;
      window.CrownCareer.recordMatch({
        matchId: `${state.matchId}:${myRole}`,
        outcome: state.result === 'draw' ? 'draw' : isWin ? 'win' : 'loss',
        isWin,
        captures: st.captures || 0,
        dispatched: st.dispatched || 0,
        casualtiesInflicted: st.casualtiesInflicted || 0,
        goldEarned: st.goldEarned || 0,
        duration: state.time,
        allCastles: allCastlesCaptured,
        ironBastion: isWin && hasReserve,
        specialty: myCastle?.specialty || 'balanced',
        mapName: state.mapName,
        mode: multiplayerMode ? 'mp' : 'sp'
      });
      if (typeof updateCareerUI === 'function') updateCareerUI();
    }
    $('resultDialog').showModal();
    saveMatch();
  }

  if ($('armyRecallDialog')?.open && inspectedArmyId !== null) {
    const inspArmy = state.armies.find(a => a.id === inspectedArmyId);
    if (inspArmy) {
      const eta = Math.max(0, inspArmy.duration - inspArmy.t);
      if ($('armyRecallEta')) $('armyRecallEta').textContent = `${eta.toFixed(1)}s`;
      if ($('armyRecallTotal')) $('armyRecallTotal').textContent = inspArmy.count;
      const btn = $('armyRecallActionBtn');
      if (btn) {
        if (inspArmy.inBattle) {
          btn.disabled = true;
          btn.textContent = '⚔ ' + tr('ui_in_battle');
        } else if (inspArmy.returning) {
          btn.disabled = true;
          btn.textContent = '↩ Qaytmoqda...';
        } else {
          btn.disabled = inspArmy.owner !== myRole || state.paused || !!state.result || (multiplayerMode && wsClient?.readyState !== 1);
          btn.textContent = '↩ ' + tr('ui_recall_army');
        }
      }
    } else {
      $('armyRecallDialog').close();
    }
  }

  if ($('mapRealmName')) $('mapRealmName').textContent = (state.mapName || E.MAP_NAMES[state.mapIndex || 0]).replace(/ \(.*$/, '');
  if (typeof MobileGame !== 'undefined') MobileGame.update(state);
}

// Reset / New Match
function resetMatch(sameSeed = false, forcedMapIdx = undefined, forcedRandomCastles = undefined, forcedPlayerCount = undefined) {
  const previousHero=state.players[myRole]?.hero || selectedHero;
  if(multiplayerMode){sendWs({type:'leave_match'});multiplayerMode=false;wsClient?.close();wsClient=null}
  matchActive=true;
  currentRoomCode = null;
  myRole = 'blue';
  isOpponentBot = false;
  opponentName = 'Crimson Legion';
  if ($('mpRoomBadge')) $('mpRoomBadge').classList.add('hidden');

  const chosenDiff = state.aiDifficulty || $('aiDifficulty')?.value || 'normal';
  const chosenStyle = $('aiStyle')?.value || state.aiStyle || 'balanced';

  let mapVal = forcedMapIdx;
  if (mapVal === undefined) {
    mapVal = $('mapSelect')?.value || $('startMapSelect')?.value;
    if (mapVal === undefined) mapVal = state.mapIndex !== undefined ? state.mapIndex : 0;
  }
  let mapIdx = mapVal === 'random' ? Math.floor(Math.random() * E.MAPS.length) : (Number(mapVal) || 0);
  if (sameSeed && state.mapIndex !== undefined) mapIdx = state.mapIndex;

  let randomCastles = forcedRandomCastles;
  if (randomCastles === undefined) {
    const cb = $('randomCastlesToggle') || $('startRandomCastles');
    randomCastles = cb ? cb.checked : true;
  }

  const pCount = forcedPlayerCount || (sameSeed ? state.playerCount : E.MAP_PLAYERS[mapIdx]) || 2;
  const seed = sameSeed ? state.seed : Date.now();
  const curEpoch = state.epoch || selectedEpoch;
  const curRegion = state.region || selectedRegion;
  state = E.create(seed, chosenStyle, chosenDiff, mapIdx, randomCastles, pCount, state.victoryMode || selectedVictoryMode, {blue:previousHero}, state.progressiveCombat, curEpoch, curRegion);
  const activeKeys = Object.keys(state.players);
  state.botPlayers = activeKeys.filter(k => k !== 'blue');
  state.paused = false;
  sourceId = 0;
  targetId = null;
  allCastles=false;nextSpecialty=null;
  cancelDragonStrike();
  $('allCastlesBtn')?.classList.remove('active');
  enterGameMode();
  if ($('resultDialog')) $('resultDialog').close();
  if ($('menuDialog')) $('menuDialog').close();
  V.init(state);
  updateUI();
  V.render(state, targetId, sourceId);
  last = performance.now();
  saveMatch();
  if ($('mapRealmName')) $('mapRealmName').textContent = state.mapName.replace(/ \(.*$/, '');
  const chip = $('mapTitleChip');
  if (chip) {
    chip.classList.remove('collapsed');
    setTimeout(() => { chip.classList.add('collapsed'); }, 2800);
  }
  if ($('startMapSelect')) $('startMapSelect').value = mapIdx;
  if ($('mapSelect')) $('mapSelect').value = mapIdx;
  toast(`🗺️ ${state.mapName} yuklandi! (${pCount} kishilik)`);
}

// ----------------------------------------------------
// Authentication API & UI
// ----------------------------------------------------
function updateAuthUI() {
  const userText = $('menuUsernameText');
  const authBtn = $('menuAuthBtn');
  const logoutBtn = $('menuLogoutBtn');
  const nickInput = $('menuNicknameInput');

  const displayName = getPlayerDisplayName();
  if (nickInput && document.activeElement !== nickInput) {
    nickInput.value = displayName;
  }

  if (currentUsername) {
    if (userText) userText.textContent = currentUsername;
    if (authBtn) authBtn.classList.add('hidden');
    if (logoutBtn) logoutBtn.classList.remove('hidden');
  } else {
    if (userText) userText.textContent = guestNickname || tr('guest');
    if (authBtn) authBtn.classList.remove('hidden');
    if (logoutBtn) logoutBtn.classList.add('hidden');
  }
}

async function checkAuthSession() {
  if (!authToken) {
    updateAuthUI();
    return;
  }
  try {
    const res = await fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();
    if (data.ok && data.user) {
      currentUsername = data.user.username;
      localStorage.setItem('crownfall_username', currentUsername);
    } else {
      authToken = null;
      currentUsername = null;
      localStorage.removeItem('crownfall_token');
      localStorage.removeItem('crownfall_username');
    }
  } catch {
    // offline or server restarting
  }
  updateAuthUI();
}

function showAuthAlert(text, isError = true) {
  const alertEl = $('authAlert');
  if (!alertEl) return;
  alertEl.textContent = text;
  alertEl.className = isError ? 'auth-error-box' : 'auth-success-box';
  alertEl.classList.remove('hidden');
}

function clearAuthAlert() {
  const alertEl = $('authAlert');
  if (alertEl) alertEl.classList.add('hidden');
}

async function handleAuthSubmit() {
  if($('authSubmitBtn').disabled)return;
  const uInput = $('authUsernameInput');
  const pInput = $('authPasswordInput');
  const username = uInput?.value.trim();
  const password = pInput?.value;

  if (!username || !password) {
    return showAuthAlert(tr('ui_auth_required'));
  }

  clearAuthAlert();
  $('authSubmitBtn').disabled=true;$('authSubmitBtn').setAttribute('aria-busy','true');
  const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (!data.ok) {
      return showAuthAlert(data.error || tr('ui_auth_failed'));
    }

    authToken = data.token;
    currentUsername = data.user.username;
    localStorage.setItem('crownfall_token', authToken);
    localStorage.setItem('crownfall_username', currentUsername);

    updateAuthUI();
    $('authDialog').close();
    toast(`${tr('ui_welcome')}, ${currentUsername}!`);
  } catch (err) {
    showAuthAlert(tr('ui_connection_failed'));
  } finally { $('authSubmitBtn').disabled=false;$('authSubmitBtn').removeAttribute('aria-busy'); }
}

async function handleLogout() {
  if (authToken) {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
    } catch {}
  }
  authToken = null;
  currentUsername = null;
  localStorage.removeItem('crownfall_token');
  localStorage.removeItem('crownfall_username');
  updateAuthUI();
  toast(tr('ui_logged_out'));
}

// ----------------------------------------------------
// WebSocket Multiplayer Client
// ----------------------------------------------------
function getPlayerDisplayName() {
  return currentUsername || guestNickname || guestName;
}

function updateLobbyUI(room) {
  if (!room) return;
  lobbyState=room;
  const maxP = Math.min(4, Math.max(2, room.maxPlayers || 4));

  // Max players buttons
  document.querySelectorAll('#lobbyMaxPlayersToggle .maxp-btn').forEach(btn => {
    btn.classList.toggle('active', Number(btn.dataset.max) === maxP);
  });
  if ($('lobbyMaxPlayersRow')) {
    $('lobbyMaxPlayersRow').style.display = roomIsHost ? 'flex' : 'none';
  }

  // Update slots 0..3
  const roles = ['blue', 'red', 'green', 'purple'];
  roles.forEach((role, idx) => {
    const card = $(`lobbySlot${idx}`);
    const badge = $(`lobbySlotBadge${idx}`);
    const userLabel = $(`lobbySlotUser${idx}`);
    const botBtn = $(`lobbySlotBotBtn${idx}`);

    if (idx >= maxP) {
      if (card) card.style.display = 'none';
      return;
    }
    if (card) card.style.display = 'flex';

    const player = room.players ? room.players.find(p => p.role === role) : null;
    const isOccupied = player && (player.username || player.isBot);

    if (isOccupied) {
      const isMe = role === myRole;
      const isRu = !window.CrownI18n || window.CrownI18n.getLanguage() !== 'uz';
      if (userLabel) userLabel.textContent = isMe ? `${player.username || tr('audit_you')} (${tr('audit_you')})` : (player.username || tr('ui_players'));
      if (badge) {
        if (player.isHost) {
          badge.textContent = tr('ui_host_ready');
          badge.className = "lobby-player-badge badge-host";
        } else if (player.isBot) {
          badge.textContent = tr('ui_bot');
          badge.className = "lobby-player-badge badge-ready";
        } else {
          badge.textContent = tr('ui_ready');
          badge.className = "lobby-player-badge badge-ready";
        }
      }
      if (botBtn) {
        botBtn.style.display = roomIsHost ? 'block' : 'none';
        botBtn.textContent = player.isBot ? tr('ui_remove_bot') : tr('ui_occupied');
        botBtn.disabled = !player.isBot;
      }
      const heroEl = $(`lobbySlotHero${idx}`);
      if (heroEl) {
        const hId = player.hero || (role === myRole ? selectedHero : 'vanguard');
        const heroIcons = { vanguard: '⚡', fortifier: '🛡️', guildmaster: '💰', infiltrator: '🏹' };
        const heroAvatars = {
          vanguard: 'assets/hero_vanguard_thumb.webp',
          fortifier: 'assets/hero_fortifier_thumb.webp',
          guildmaster: 'assets/hero_guildmaster_thumb.webp',
          infiltrator: 'assets/hero_infiltrator_thumb.webp'
        };
        const hName = window.CrownI18n ? window.CrownI18n.t(`hero_${hId}_name`) : hId;
        heroEl.innerHTML = `<span class="lobby-hero-avatar" style="background-image: url('${heroAvatars[hId] || heroAvatars.vanguard}');"></span><span>${heroIcons[hId] || '⚔️'} ${hName}</span>`;
        heroEl.style.display = 'flex';
      }
    } else {
      const isRu = !window.CrownI18n || window.CrownI18n.getLanguage() !== 'uz';
      if (userLabel) userLabel.textContent = tr('ui_waiting');
      if (badge) {
        badge.textContent = tr('ui_waiting');
        badge.className = "lobby-player-badge badge-waiting";
      }
      if (botBtn) {
        botBtn.style.display = roomIsHost ? 'block' : 'none';
        botBtn.textContent = tr('lobby_add_bot');
        botBtn.disabled = false;
      }
      const heroEl = $(`lobbySlotHero${idx}`);
      if (heroEl) heroEl.style.display = 'none';
    }
  });

  heroChosen=true;
  syncHeroUI();

  // Map and random castles in lobby
  if ($('lobbyMapSelect')) {
    $('lobbyMapSelect').value = room.mapIndex ?? 0;
    $('lobbyMapSelect').disabled = !roomIsHost;
  }
  if ($('lobbyRandomCastles')) {
    $('lobbyRandomCastles').checked = !!room.randomCastles;
    $('lobbyRandomCastles').disabled = !roomIsHost;
  }

  // Start match button
  if ($('lobbyStartMatchBtn')) {
    const isRu = !window.CrownI18n || window.CrownI18n.getLanguage() !== 'uz';
    if (roomIsHost) {
      const ready = (room.playersCount >= 2);
      $('lobbyStartMatchBtn').disabled = !ready;
      $('lobbyStartMatchBtn').textContent = ready
        ? tr('start_battle_btn')
        : `${tr('ui_wait_players')} (${room.playersCount}/${maxP})`;
    } else {
      $('lobbyStartMatchBtn').disabled = true;
      $('lobbyStartMatchBtn').textContent = tr('ui_wait_host');
    }
  }

  if ($('lobbyHostSettings')) $('lobbyHostSettings').style.display = roomIsHost ? 'block' : 'none';
  if ($('lobbyToggleBotBtn')) $('lobbyToggleBotBtn').style.display = roomIsHost ? 'block' : 'none';
}

function triggerAutoReconnect() {
  if (!multiplayerMode || state.result) return;
  if (reconnectAttempts >= 8) {
    if ($('offlineNoticeStatus')) $('offlineNoticeStatus').textContent = tr('ui_connection_failed');
    return;
  }
  reconnectAttempts++;
  if ($('offlineNoticeBanner')) $('offlineNoticeBanner').classList.remove('hidden');
  if ($('offlineNoticeStatus')) $('offlineNoticeStatus').textContent = `${tr('ui_reconnecting')} (${reconnectAttempts}/8)…`;

  clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    connectWs(() => {
      if (currentRoomCode) {
        sendWs({
          type: 'join_room',
          roomCode: currentRoomCode,
          reconnectToken,
          username: getPlayerDisplayName()
        });
      }
    });
  }, 2500);
}

let matchmakingTimerInterval = null;
let matchmakingStartTime = 0;


function startMatchmakingTimer() {
  stopMatchmakingTimer();
  matchmakingStartTime = Date.now();
  if ($('matchmakingTimer')) $('matchmakingTimer').textContent = '00:01';
  if ($('matchmakingStatusText')) $('matchmakingStatusText').textContent = tr('audit_matchmaking');
  matchmakingTimerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - matchmakingStartTime) / 1000);
    const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const s = String(elapsed % 60).padStart(2, '0');
    if ($('matchmakingTimer')) $('matchmakingTimer').textContent = `${m}:${s}`;
    if (elapsed > 2 && $('matchmakingStatusText')) {
      $('matchmakingStatusText').textContent = tr('audit_matchmaking');
    }
  }, 1000);
}

function stopMatchmakingTimer() {
  if (matchmakingTimerInterval) {
    clearInterval(matchmakingTimerInterval);
    matchmakingTimerInterval = null;
  }
}

function connectWs(onOpenCallback) {
  if(connectionPending)return;
  setConnectionPending(true);
  toast(tr('ui_connecting'));
  if (wsClient && wsClient.readyState === WebSocket.OPEN) {
    setConnectionPending(false);
    if (onOpenCallback) onOpenCallback();
    return;
  }

  let host = location.host;
  if (!host || location.protocol === 'file:') {
    host = '127.0.0.1:4173';
  }
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const url = `${proto}//${host}/ws`;
  try {
    wsClient = new WebSocket(url);
  } catch (e) {
    setConnectionPending(false);toast(tr('ui_connection_failed'));return;
  }

  const connection = wsClient;
  if (!connection) return;
  const timeout=setTimeout(()=>{if(connection!==wsClient)return;connection.close();setConnectionPending(false);toast(tr('ui_connection_failed'));},8000);
  wsClient.onopen = () => {
    if (connection !== wsClient) return;
    sendWs({
      type: 'auth',
      token: authToken,
      username: getPlayerDisplayName()
    });
    clearTimeout(timeout);setConnectionPending(false);
    if (onOpenCallback) onOpenCallback();
  };

  wsClient.onmessage = e => {
    if (connection !== wsClient) return;
    try {
      const msg = JSON.parse(e.data);
      handleWsMessage(msg);
    } catch (err) {
      console.error('[WS Parse Error]', err);
    }
  };

  wsClient.onclose = () => {
    clearTimeout(timeout);
    if (connection !== wsClient) return;
    setConnectionPending(false);
    if (multiplayerMode && !state.result) {
      triggerAutoReconnect();
    }
  };

  wsClient.onerror = () => {
    clearTimeout(timeout);
    if (connection !== wsClient) return;
    setConnectionPending(false);
    if(!multiplayerMode){stopMatchmakingTimer();toast(tr('ui_connection_failed'));}
  };
}

function sendWs(msgObj) {
  if (wsClient && wsClient.readyState === WebSocket.OPEN) {
    wsClient.send(JSON.stringify(msgObj));
    return true;
  }
  toast(tr('audit_disconnected'));
  return false;
}

function handleWsMessage(msg) {
  if (msg.reconnectToken) reconnectToken = msg.reconnectToken;
  switch (msg.type) {
    case 'room_created': {
      currentRoomCode = msg.roomCode;
      roomIsHost = true;
      myRole = 'blue';
      multiplayerMode = true;

      if ($('lobbyRoomCode')) $('lobbyRoomCode').textContent = currentRoomCode;
      const shareUrl = `${location.origin}${location.pathname}?room=${currentRoomCode}`;
      if ($('lobbyShareLinkInput')) $('lobbyShareLinkInput').value = shareUrl;

      const isRu = !window.CrownI18n || window.CrownI18n.getLanguage() !== 'uz';
      updateLobbyUI(msg.room);
      $('roomLobbyDialog').showModal();
      toast(`${tr('ui_room_created')}: ${currentRoomCode}`);
      break;
    }

    case 'room_joined': {
      const isRu = !window.CrownI18n || window.CrownI18n.getLanguage() !== 'uz';
      currentRoomCode = msg.roomCode;
      roomIsHost = false;
      myRole = msg.role;
      multiplayerMode = true;

      if ($('lobbyRoomCode')) $('lobbyRoomCode').textContent = currentRoomCode;
      const shareUrl = `${location.origin}${location.pathname}?room=${currentRoomCode}`;
      if ($('lobbyShareLinkInput')) $('lobbyShareLinkInput').value = shareUrl;

      updateLobbyUI(msg.room);
      $('roomLobbyDialog').showModal();
      toast(`${tr('ui_room_joined')}: ${currentRoomCode}`);
      break;
    }

    case 'room_rejoined': {
      const isRu = !window.CrownI18n || window.CrownI18n.getLanguage() !== 'uz';
      currentRoomCode = msg.roomCode;
      myRole = msg.role;
      multiplayerMode = true;
      if ($('offlineNoticeBanner')) $('offlineNoticeBanner').classList.add('hidden');
      reconnectAttempts = 0;
      clearTimeout(reconnectTimer);
      applySnapshot(msg);
      toast(tr('ui_reconnected'));
      break;
    }

    case 'player_joined': {
      const isRu = !window.CrownI18n || window.CrownI18n.getLanguage() !== 'uz';
      if (msg.room) updateLobbyUI(msg.room);
      toast(`${msg.guestName || msg.player} · ${tr('ui_joined')}`);
      break;
    }

    case 'player_reconnected': {
      const isRu = !window.CrownI18n || window.CrownI18n.getLanguage() !== 'uz';
      if (msg.player && state.botPlayers) {
        state.botPlayers = state.botPlayers.filter(b => b !== msg.player);
      }
      toast(`${msg.username || msg.player} · ${tr('ui_reconnected')}`);
      break;
    }

    case 'bot_updated': {
      if (msg.room) updateLobbyUI(msg.room);
      break;
    }

    case 'room_updated': {
      if (msg.room) updateLobbyUI(msg.room);
      break;
    }

    case 'settings_updated': {
      if (msg.room) updateLobbyUI(msg.room);
      break;
    }

    case 'hero_selected': {
      if (msg.room) updateLobbyUI(msg.room);
      break;
    }

    case 'quick_match_found': {
      const isRu = !window.CrownI18n || window.CrownI18n.getLanguage() !== 'uz';
      stopMatchmakingTimer();
      if ($('matchmakingDialog')?.open) $('matchmakingDialog').close();
      currentRoomCode = msg.roomCode;
      myRole = msg.role;
      roomIsHost = (myRole === 'blue');
      opponentName = msg.opponent;
      multiplayerMode = true;
      toast(`${tr('ui_opponent_found')}: ${opponentName}`);
      break;
    }

    case 'queue_waiting': {
      if ($('matchmakingStatusText')) {
        $('matchmakingStatusText').textContent = msg.message || tr('audit_matchmaking');
      }
      break;
    }

    case 'matchmaking_cancelled': {
      stopMatchmakingTimer();
      if ($('matchmakingDialog')?.open) $('matchmakingDialog').close();
      toast("Qidiruv bekor qilindi.");
      break;
    }

    case 'match_started': {
      stopMatchmakingTimer();
      if ($('matchmakingDialog')?.open) $('matchmakingDialog').close();
      if ($('roomLobbyDialog')?.open) $('roomLobbyDialog').close();
      enterGameMode();

      multiplayerMode = true;
      roomIsHost = (myRole === 'blue');
      const maxP = msg.maxPlayers || (msg.players ? msg.players.length : 2);
      const botPlayers = msg.botPlayers || [];

      if ($('mpRoomBadge')) {
        $('mpRoomBadge').classList.remove('hidden');
        if ($('mpRoomCode')) $('mpRoomCode').textContent = msg.roomCode;
      }

      currentRoomCode = msg.roomCode;
      lastNetworkRevision = -1;
      rematchPending=false;$('rematchBtn').disabled=false;
      allCastles = false; nextSpecialty = null;
      $('allCastlesBtn').classList.remove('active');
      $('resultDialog').close();
      applySnapshot(msg, true);
      last = performance.now();

      toast(`${tr('ui_match_started')} · ${state.mapName.replace(/ \(.*$/, '')}`);
      break;
    }

    case 'state_snapshot': {
      if (multiplayerMode) applySnapshot(msg);
      break;
    }
    case 'command_accepted': {
      if (msg.command === 'dispatch' || msg.command === 'coordinate') {MobileGame.dispatched();toast(tr(msg.command==='coordinate'?'ui_orders':'ui_dispatched'));}
      if (msg.command === 'upgrade') { nextSpecialty = null; MobileGame.upgrade();toast(tr('ui_upgraded')); }
      if (msg.command === 'specialize' || msg.command === 'tactics') {nextSpecialty=null;toast(tr('ui_saved'));}
      break;
    }
    case 'command_rejected': {
      toast(tr('audit_order_rejected'));
      break;
    }
    case 'player_disconnected': {
      toast(tr('audit_player_disconnected'));
      break;
    }
    case 'player_left': {
      if (msg.room) updateLobbyUI(msg.room);
      else { multiplayerMode = false; currentRoomCode = null; myRole = 'blue'; $('roomLobbyDialog').close(); }
      break;
    }

    case 'error': {
      setConnectionPending(false);
      if(!matchActive)stopMatchmakingTimer();
      toast(`${tr('ui_room_error')} ${msg.message || ''}`);
      break;
    }
  }
}

// ----------------------------------------------------
// Setup Event Listeners
// ----------------------------------------------------
function setupEvents() {
  const mapSvg = $('map');
  const mapPointers = new Set();
  mapSvg.addEventListener('pointerdown', e => {
    mapPointers.add(e.pointerId);
    if (mapPointers.size > 1) { dragFrom=null;isDragging=false;V.clearDragLine(); }
  });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) mapSvg.addEventListener(event, e => mapPointers.delete(e.pointerId));

  for (const id of ['helpDialog', 'hotkeysDialog', 'confirmMenuDialog']) {
    new MutationObserver(() => {
      if ($(id).open && matchActive && !multiplayerMode && !state.result) {
        state.paused = true; saveMatch(); updateUI();
      }
    }).observe($(id), {attributes: true, attributeFilter: ['open']});
  }


  $('roomLobbyDialog').addEventListener('cancel',e=>{e.preventDefault();$('lobbyLeaveBtn').click();});
  $('matchmakingDialog').addEventListener('cancel',e=>{e.preventDefault();$('cancelMatchmakingBtn').click();});
  $('lobbyBrowserDialog').addEventListener('close',()=>stopLobbiesPolling());
  $('resultDialog').addEventListener('cancel',e=>e.preventDefault());
  document.querySelectorAll('dialog').forEach(dialog=>{
    const title=dialog.querySelector('h2');
    if(title){if(!title.id)title.id=dialog.id+'Title';dialog.setAttribute('aria-labelledby',title.id);}
    const close=dialog.querySelector('.close-dialog-btn');
    if(close){
      close.setAttribute('aria-label',tr('close'));
      close.title=tr('close');
      close.onclick = () => closeModalSafe(dialog);
    }
    dialog.addEventListener('close',()=>dialog.querySelector('.modal-feedback')?.remove());
    if(['helpDialog','hotkeysDialog','menuDialog','authDialog','careerDialog','lobbyBrowserDialog','difficultyDialog','tacticsDialog','armyRecallDialog'].includes(dialog.id)){
      let outside=false;
      const isOutside=e=>{const r=dialog.getBoundingClientRect();return e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom;};
      dialog.addEventListener('pointerdown',e=>{outside=e.target===dialog&&isOutside(e);});
      dialog.addEventListener('click',e=>{if(outside&&e.target===dialog&&isOutside(e))closeModalSafe(dialog);outside=false;});
    }
  });
  $('authPasswordInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();handleAuthSubmit();}});
  $('menuJoinInput').setAttribute('aria-label',tr('invite_room_code'));
  $('menuJoinInput').setAttribute('autocapitalize','characters');
  $('menuJoinInput').setAttribute('spellcheck','false');
  $('sandboxActions').classList.toggle('hidden',new URLSearchParams(location.search).get('debug')!=='1');

  // Keep scrolling battle details from starting a map drag.
  $('unitBattlePanel')?.addEventListener('pointerdown', e => e.stopPropagation());
  $('unitBattlePanel')?.addEventListener('wheel', e => e.stopPropagation());

  // CLICK ON MAP: TARGETING AND SOURCE SELECTION
  mapSvg.addEventListener('click', e => {
    if (isDragging || dragJustEnded || MobileGame.ignoreClick()) return;

    if (dragonTargeting) {
      const coords = svgCoords(e);
      dragonTargetPos = E.clampMapPoint({x:Math.round(coords.x),y:Math.round(coords.y)});
      const isTouch = e.pointerType === 'touch' || (e.pointerType === undefined && lastMapPointerType === 'touch');
      if (isTouch) {
        renderDragonReticle(dragonTargetPos.x, dragonTargetPos.y);
        return;
      }
      executeDragonStrike(dragonTargetPos.x, dragonTargetPos.y);
      return;
    }

    const recallBadge = e.target.closest('[data-recall-btn]');
    if (recallBadge) {
      const aId = Number(recallBadge.dataset.recallBtn);
      executeArmyRecall(aId);
      return;
    }

    const armyNode = e.target.closest('[data-army-id]');
    if (armyNode) {
      const aId = Number(armyNode.dataset.armyId);
      const army = state.armies.find(a => a.id === aId);
      if (army) {
        selectMovingArmy(army);
        if (army.owner === myRole && !army.inBattle && !army.returning) {
          openArmyRecallDialog(army);
        }
        return;
      }
    }

    const battleNode = e.target.closest('[data-battle-id]');
    if (battleNode) {
      const bId = Number(battleNode.dataset.battleId);
      const battle = (state.battles || []).find(b => b.id === bId);
      if (battle) {
        selectActiveBattle(battle);
        return;
      }
    }

    const node = e.target.closest('[data-id]');
    if (!node) {
      const roadNode = e.target.closest('.strategic-roads > path');
      if (roadNode && sourceId !== null) {
        const src = +roadNode.getAttribute('data-source');
        const tgt = +roadNode.getAttribute('data-target');
        if (!isNaN(src) && !isNaN(tgt) && (src === sourceId || tgt === sourceId)) {
          const destId = src === sourceId ? tgt : src;
          targetId = destId;
          updateUI();
          V.render(state, targetId, sourceId);
          MobileGame.select(destId);
          return;
        }
      }
      clearContextSelection();
      return;
    }
    const id = Number(node.dataset.id);
    const c = state.castles[id];
    if (!c) return;

    clearContextSelection();
    if (c.owner === myRole && !e.shiftKey) {
      nextSpecialty = null;
      // Clicked on active player's castle: set it as active SOURCE!
      sourceId = id;
      toast(`🏰 ${c.name} tanlandi (${fmt(c.troops)} askar)`);
      updateUI();
      V.render(state, targetId, sourceId);
    } else {
      // Selection is inspection; only an explicit order spends troops.
      targetId = id;
      updateUI();
      V.render(state, targetId, sourceId);
      MobileGame.select(id);
    }
  });

  mapSvg.addEventListener('pointerover', e => {
    if (dragonTargeting || isDragging) return;
    const castleNode = e.target.closest('[data-id]');
    if (castleNode) {
      const id = Number(castleNode.dataset.id);
      if (!isNaN(id) && id !== sourceId) {
        V.setHoverCastle?.(id);
        return;
      }
    }
    const roadNode = e.target.closest('.strategic-roads > path');
    if (roadNode && sourceId !== null) {
      const src = +roadNode.getAttribute('data-source');
      const tgt = +roadNode.getAttribute('data-target');
      if (!isNaN(src) && !isNaN(tgt) && (src === sourceId || tgt === sourceId)) {
        V.setHoverCastle?.(src === sourceId ? tgt : src);
      }
    }
  });

  mapSvg.addEventListener('pointerout', e => {
    if (dragonTargeting || isDragging) return;
    const related = e.relatedTarget;
    if (!related || (!related.closest?.('[data-id]') && !related.closest?.('.strategic-roads > path'))) {
      V.setHoverCastle?.(null);
    }
  });

  // SOURCE CYCLING BUTTONS (ONE-CLICK CYCLING BETWEEN OWNED CASTLES)
  $('activeBox').removeAttribute('title');
  if ($('nextSourceBtn')) $('nextSourceBtn').onclick = e => {
    e.stopPropagation();
    cycleSource(1);
  };

  // DRAG AND DROP (SWIPE FROM ANY CASTLE TO ANY CASTLE)
  mapSvg.addEventListener('contextmenu', e => {
    if (dragonTargeting) {
      e.preventDefault();
      cancelDragonStrike();
      toast("Ajdaho zarbasi bekor qilindi.");
    }
  });

  mapSvg.addEventListener('pointerdown', e => {
    lastMapPointerType = e.pointerType || 'mouse';
    if (dragonTargeting) {
      const coords = svgCoords(e);
      dragonTargetPos = E.clampMapPoint({x:Math.round(coords.x),y:Math.round(coords.y)});
      renderDragonReticle(dragonTargetPos.x, dragonTargetPos.y);
      return;
    }
    if (mapPointers.size > 1 || (e.button !== 0 && e.pointerType !== 'touch')) return;
    const node = e.target.closest('[data-id]');
    if (!node) return;
    const id = Number(node.dataset.id);
    const c = state.castles[id];
    if (c && c.owner === myRole) {
      dragFrom = id;
      sourceId = id;
      isDragging = false;
      mapSvg.setPointerCapture(e.pointerId);
    }
  });

  let dragStart=null;
  mapSvg.addEventListener('pointerdown',e=>{dragStart={x:e.clientX,y:e.clientY}});
  mapSvg.addEventListener('pointermove', e => {
    if (dragonTargeting) {
      const coords = svgCoords(e);
      dragonTargetPos = E.clampMapPoint({x:Math.round(coords.x),y:Math.round(coords.y)});
      renderDragonReticle(dragonTargetPos.x, dragonTargetPos.y);
      return;
    }
    if (dragFrom === null || !dragStart || Math.hypot(e.clientX-dragStart.x,e.clientY-dragStart.y)<8) return;
    isDragging = true;
    const coords = svgCoords(e);
    const fromCastle = state.castles[dragFrom];
    const avail = getAvailable(fromCastle);
    const count = Math.max(1, Math.floor(avail * (dispatchPercent / 100)));

    const gate=CrownAnchors.gate(state,fromCastle);
    V.setDragLine(gate.x, gate.y, coords.x, coords.y, count);

    const hovered = castleAtPoint(coords.x, coords.y, 45);
    if (hovered && hovered.id !== dragFrom) {
      targetId = hovered.id;
      updateDock();
    }
  });

  const endDrag = e => {
    if (dragFrom !== null) {
      if (isDragging) {
        dragJustEnded = true;
        setTimeout(() => { dragJustEnded = false; }, 120);
        const coords = svgCoords(e);
        const targetCastle = castleAtPoint(coords.x, coords.y, 50);
        if (targetCastle && targetCastle.id !== dragFrom) {
          executeDispatch(dragFrom, targetCastle.id, dispatchPercent);
          targetId = targetCastle.id;
        }
        V.clearDragLine();
      }
      try { mapSvg.releasePointerCapture(e.pointerId); } catch {}
      dragFrom = null;
      isDragging = false;
      updateUI();
      V.render(state, targetId, sourceId);
    }
  };

  mapSvg.addEventListener('pointerup', endDrag);
  mapSvg.addEventListener('pointercancel', () => {dragFrom=null;dragStart=null;isDragging=false;dragJustEnded=true;V.clearDragLine();setTimeout(()=>{dragJustEnded=false},350)});

  // SPEED BUTTON
  if ($('speedBtn')) {
    $('speedBtn').onclick = () => {
      if (multiplayerMode) return;
      const idx = SPEED_STEPS.indexOf(simSpeed);
      simSpeed = SPEED_STEPS[(idx + 1) % SPEED_STEPS.length];
      $('speedBtn').textContent = SPEED_LABELS[simSpeed];
      toast(`${tr('speed_toast')} ${SPEED_LABELS[simSpeed]}`);
    };
  }

  // PAUSE BUTTON
  if ($('pause')) $('pause').onclick = () => {
    if (state.result) return;
    if (multiplayerMode) {
      toast(tr('ui_online_clock'));
      return;
    }
    state.paused = !state.paused;
    last = performance.now();
    updateUI();
    saveMatch();
  };

  if ($('resumeNotice')) $('resumeNotice').onclick = () => {
    state.paused = false;
    last = performance.now();
    updateUI();
    saveMatch();
  };

  // DISPATCH PERCENT BUTTONS
  document.querySelectorAll('[data-percent]').forEach(btn => {
    btn.onclick = () => setDispatchPercent(Number(btn.dataset.percent));
  });

  // ALL CASTLES TOGGLE
  if ($('allCastlesBtn')) {
    $('allCastlesBtn').onclick = () => {
      allCastles = !allCastles;
      $('allCastlesBtn').classList.toggle('active', allCastles);
      toast(tr(allCastles?'ui_all_sources':'ui_single_source'));
      updateDock();
    };
  }

  // PRIMARY DISPATCH BUTTON
  if ($('dispatchActionBtn')) {
    $('dispatchActionBtn').onclick = () => {
      if (targetId !== null) executeDispatch(sourceId, targetId, dispatchPercent);
    };
  }

  // UPGRADE BUTTON
  if ($('upgradeBtn')) $('upgradeBtn').onclick = () => executeUpgrade(sourceId);

  // ROUTE TOGGLE
  if ($('routeToggleBtn')) {
    $('routeToggleBtn').onclick = () => {
      marchRoute = marchRoute === 'fast' ? 'flank' : 'fast';
      if ($('routeLabel')) $('routeLabel').textContent = marchRoute === 'fast' ? "BOSH YO'L" : "QANOT YO'LI";
      if ($('routeSpeedText')) $('routeSpeedText').textContent = marchRoute === 'fast' ? '85 px/s' : '65 px/s';
      toast(tr(marchRoute==='fast'?'route_main':'route_flank'));
      updateDock();
      V.render(state, targetId, sourceId, marchRoute);
    };
  }

  // Screen and Mode Controllers
  function syncSettingsValues() {
    const curLang = window.CrownI18n ? window.CrownI18n.getLanguage() : 'ru';
    document.querySelectorAll('.lang-switch-group .lang-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.lang === curLang);
    });

    const isSoundOn = (typeof MobileGame !== 'undefined' && MobileGame.isSoundOn)
      ? MobileGame.isSoundOn()
      : (localStorage.getItem('crownfall-sound') === 'on');
    if ($('settingsSoundOnBtn')) $('settingsSoundOnBtn').classList.toggle('active', isSoundOn);
    if ($('settingsSoundOffBtn')) $('settingsSoundOffBtn').classList.toggle('active', !isSoundOn);

    const curQuality = (typeof MobileGame !== 'undefined' && MobileGame.getQuality)
      ? MobileGame.getQuality()
      : (localStorage.getItem('crownfall-quality') || 'auto');
    if ($('qualitySelect')) $('qualitySelect').value = curQuality;

    document.querySelectorAll('.speed-switch-group .speed-opt-btn').forEach(b => {
      b.classList.toggle('active', Math.abs(Number(b.dataset.speed) - simSpeed) < 0.01);
    });

    if ($('aiDifficulty')) $('aiDifficulty').value = state.aiDifficulty || 'normal';
    if ($('aiStyle')) $('aiStyle').value = state.aiStyle || 'balanced';
    if ($('mapSelect') && state.mapIndex !== undefined) $('mapSelect').value = state.mapIndex;
  }

  function openSettings(inGame = false) {
    closeCastleManagement();
    if (inGame) {
      if ($('inGameSettingsSection')) $('inGameSettingsSection').classList.remove('hidden');
      if ($('settingsModalTitle')) {
        $('settingsModalTitle').textContent = window.CrownI18n ? window.CrownI18n.t('ingame_settings_title') : "Настройки боя";
      }
      if (!multiplayerMode && !state.result && !state.paused) {
        state.paused = true;
        updateUI();
      }
    } else {
      if ($('inGameSettingsSection')) $('inGameSettingsSection').classList.add('hidden');
      if ($('settingsModalTitle')) {
        $('settingsModalTitle').textContent = window.CrownI18n ? window.CrownI18n.t('settings_title') : "Настройки игры";
      }
    }
    syncSettingsValues();
    for(const id of ['mapSelect','randomCastlesToggle','aiStyle','aiDifficulty'])$(id).closest('.setting-group').classList.toggle('hidden',inGame&&multiplayerMode);
    for(const id of ['menuNewMatch','menuSameMap'])$(id).classList.toggle('hidden',inGame&&multiplayerMode);
    document.querySelectorAll('.speed-opt-btn').forEach(b=>b.title=multiplayerMode?tr('ui_online_clock'):'');
    showModalSafe('menuDialog');
  }

  // HOME / RETURN TO MAIN MENU BUTTON (COMPLETELY DESTROYS GAME STATE PER USER REQUIREMENT)
  function destroyAndReturnToMenu() {
    if ($('confirmMenuDialog')?.open) $('confirmMenuDialog').close();
    if ($('menuDialog')?.open) $('menuDialog').close();
    if ($('difficultyDialog')?.open) $('difficultyDialog').close();
    if ($('tacticsDialog')?.open) $('tacticsDialog').close();
    if ($('resultDialog')?.open) $('resultDialog').close();
    if ($('helpDialog')?.open) $('helpDialog').close();
    if ($('hotkeysDialog')?.open) $('hotkeysDialog').close();
    if ($('matchmakingDialog')?.open) $('matchmakingDialog').close();
    if ($('roomLobbyDialog')?.open) $('roomLobbyDialog').close();
    if ($('authDialog')?.open) $('authDialog').close();
    if ($('careerDialog')?.open) $('careerDialog').close();
    if ($('lobbyBrowserDialog')?.open) $('lobbyBrowserDialog').close();
    if (typeof stopLobbiesPolling === 'function') stopLobbiesPolling();

    if (multiplayerMode) {
      try { sendWs({ type: 'leave_match' }); } catch {}
      multiplayerMode = false;
      if (wsClient) {
        try { wsClient.close(); } catch {}
        wsClient = null;
      }
      multiplayerMode = false;
      currentRoomCode = null;
      if ($('mpRoomBadge')) $('mpRoomBadge').classList.add('hidden');
    }

    if ($('offlineNoticeBanner')) $('offlineNoticeBanner').classList.add('hidden');
    clearTimeout(reconnectTimer);

    myRole='blue';roomIsHost=false;matchActive=false;nextSpecialty=null;reconnectToken=null;lastNetworkRevision=-1;
    stopMatchmakingTimer();
    // Completely destroy and clear saved match from localStorage
    try { localStorage.removeItem(SAVE); } catch {}
    state = E.create();
    state.paused = true;
    state.time = 0;
    state.armies = [];
    state.clashes = [];
    state.history = [];
    state.result = null;

    sourceId = 0;
    targetId = null;
    allCastles = false;

    if ($('timer')) $('timer').textContent = '00:00';
    if ($('captureBanner')) $('captureBanner').textContent = '';
    if ($('alertBanner')) $('alertBanner').classList.add('hidden');
    if ($('resumeNotice')) $('resumeNotice').hidden = true;

    enterMenuMode();
    V.init(state);
    updateUI();
    V.render(state, targetId, sourceId);
    toast(window.CrownI18n ? window.CrownI18n.t('toast_return_menu', "Возврат в главное меню.") : "Возврат в главное меню.");
  }

  if ($('returnMenuBtn')) {
    $('returnMenuBtn').onclick = () => {
      if (!state.result && state.time > 0) {
        if ($('confirmMenuDesc')) {
          $('confirmMenuDesc').textContent = window.CrownI18n 
            ? window.CrownI18n.t('confirm_return_desc') 
            : "Текущая игра будет остановлена и удалена. Новая игра начнется заново.";
        }
        if ($('confirmMenuDialog')) $('confirmMenuDialog').showModal();
      } else {
        destroyAndReturnToMenu();
      }
    };
  }

  if ($('confirmMenuNoBtn')) {
    $('confirmMenuNoBtn').onclick = () => {
      if ($('confirmMenuDialog')) $('confirmMenuDialog').close();
    };
  }

  if ($('confirmMenuYesBtn')) {
    $('confirmMenuYesBtn').onclick = () => {
      destroyAndReturnToMenu();
    };
  }

  if ($('resultHomeBtn')) {
    $('resultHomeBtn').onclick = () => {
      destroyAndReturnToMenu();
    };
  }

  if ($('settingsReturnMenuBtn')) {
    $('settingsReturnMenuBtn').onclick = () => {
      if ($('menuDialog')?.open) $('menuDialog').close();
      if (!state.result && state.time > 0) {
        if ($('confirmMenuDesc')) {
          $('confirmMenuDesc').textContent = window.CrownI18n 
            ? window.CrownI18n.t('confirm_return_desc') 
            : "Текущая игра будет остановлена и удалена. Новая игра начнется заново.";
        }
        if ($('confirmMenuDialog')) $('confirmMenuDialog').showModal();
      } else {
        destroyAndReturnToMenu();
      }
    };
  }

  // INVITE BANNER BUTTONS ON MAIN MENU
  if ($('acceptInviteBtn')) {
    $('acceptInviteBtn').onclick = () => {
      const code = $('inviteRoomCodeText')?.textContent?.trim() || $('menuJoinInput')?.value.trim().toUpperCase();
      if (code) {
        connectWs(() => {
          sendWs({
            type: 'join_room',
            roomCode: code,
            username: getPlayerDisplayName(),
            hero: selectedHero
          });
        });
      }
    };
  }

  if ($('dismissInviteBtn')) {
    $('dismissInviteBtn').onclick = () => {
      if ($('menuInviteBanner')) $('menuInviteBanner').classList.add('hidden');
    };
  }

  // MAIN MENU ACTIONS
  if ($('heroPlayCard')) {
    $('heroPlayCard').onclick = e => {
      if (e.target.closest('#menuQuickMatchBtn')) return;
      $('menuQuickMatchBtn')?.click();
    };
  }

  if ($('modeSinglePlayCard')) {
    $('modeSinglePlayCard').onclick = e => {
      if (e.target.closest('button, input, select')) return;
      $('menuSinglePlayBtn')?.click();
    };
  }

  if ($('closeDifficultyDialog')) {
    $('closeDifficultyDialog').onclick = () => closeModalSafe('difficultyDialog');
  }

  if ($('menuQuickMatchBtn')) {
    $('menuQuickMatchBtn').onclick = () => openBattleSetup('quick');
  }

  if ($('cancelMatchmakingBtn')) {
    $('cancelMatchmakingBtn').onclick = () => {
      stopMatchmakingTimer();
      if(wsClient?.readyState===1)sendWs({ type: 'cancel_matchmaking' });
      else {const pending=wsClient;wsClient=null;pending?.close();setConnectionPending(false);}
      closeModalSafe('matchmakingDialog');
    };
  }

  if ($('menuSinglePlayBtn')) {
    $('menuSinglePlayBtn').onclick = () => {
      openBattleSetup();
    };
  }

  if ($('menuTrainingBtn')) {
    $('menuTrainingBtn').onclick = () => {
      openBattleSetup('training');
    };
  }

  if ($('menuQuickDiffBtn')) {
    $('menuQuickDiffBtn').onclick = () => {
      openBattleSetup();
      if ($('battleSettings')) $('battleSettings').open = true;
    };
  }

  if ($('menuMapPickerBtn')) {
    $('menuMapPickerBtn').onclick = () => {
      openBattleSetup();
      if ($('battleSettings')) $('battleSettings').open = true;
    };
  }

  if ($('menuFriendsBtn')) {
    $('menuFriendsBtn').onclick = () => {
      showModalSafe('friendsDialog');
    };
  }

  if ($('closeFriendsDialog')) {
    $('closeFriendsDialog').onclick = () => {
      closeModalSafe('friendsDialog');
    };
  }

  if ($('menuBrowseLobbiesFromDialogBtn')) {
    $('menuBrowseLobbiesFromDialogBtn').onclick = () => {
      closeModalSafe('friendsDialog');
      openLobbyBrowser();
    };
  }

  if ($('menuCommandersBtn')) {
    $('menuCommandersBtn').onclick = () => {
      openBattleSetup();
    };
  }

  if ($('menuTopSettingsBtn')) {
    $('menuTopSettingsBtn').onclick = () => {
      if (window.CrownMenuUI?.openSettings) window.CrownMenuUI.openSettings(false);
      else showModalSafe('menuDialog');
    };
  }

  if ($('menuQuickSoundBtn')) {
    $('menuQuickSoundBtn').onclick = () => {
      if (window.CrownSound) {
        const on = window.CrownSound.toggle();
        const icon = $('menuSoundIcon');
        if (icon) icon.textContent = on ? '🔊' : '🔇';
        toast(on 
          ? (window.CrownI18n ? window.CrownI18n.t('sound_toast_on') : "Звуковые эффекты включены") 
          : (window.CrownI18n ? window.CrownI18n.t('sound_toast_off') : "Звуковые эффекты отключены"));
      }
    };
  }

  if ($('menuCreateRoomBtn')) {
    $('menuCreateRoomBtn').onclick = () => {
      closeModalSafe('friendsDialog');
      connectWs(() => {
        const mapVal = $('startMapSelect')?.value ?? 0;
        const mapIdx = mapVal === 'random' ? Math.floor(Math.random() * E.MAPS.length) : Number(mapVal);
        sendWs({
          type: 'create_room',
          mapIndex: mapIdx,
          randomCastles: true,
          username: getPlayerDisplayName(),
          hero: selectedHero
        });
      });
    };
  }

  function joinRoomByCode(code) {
    if (!code) return;
    closeModalSafe('friendsDialog');
    connectWs(() => {
      sendWs({
        type: 'join_room',
        roomCode: code,
        username: getPlayerDisplayName(),
        hero: selectedHero
      });
    });
  }

  if ($('menuJoinRoomBtn')) {
    $('menuJoinRoomBtn').onclick = () => {
      const code = $('menuJoinInput')?.value.trim().toUpperCase();
      if (!code) {
        toast(window.CrownI18n ? window.CrownI18n.t('toast_enter_code') : "Пожалуйста, введите код комнаты!");
        return;
      }
      joinRoomByCode(code);
    };
  }

  // ----------------------------------------------------
  // Commander Career UI & Synchronization
  // ----------------------------------------------------
  function updateCareerUI() {
    if (!window.CrownCareer) return;
    const stats = window.CrownCareer.loadStats();
    const rank = window.CrownCareer.getRank(stats.wins);
    const wr = window.CrownCareer.getWinrate(stats.wins, stats.battles);
    const rankTitle = window.CrownI18n ? window.CrownI18n.t(rank.nameKey) : rank.id;

    // Header badge
    if ($('headerRankIcon')) $('headerRankIcon').textContent = rank.icon;
    if ($('headerRankName')) $('headerRankName').textContent = rankTitle;
    if ($('headerWinrateTag')) {
      $('headerWinrateTag').removeAttribute('data-i18n');
      $('headerWinrateTag').textContent = stats.battles ? `${wr}% ${tr('menu_winrate')}` : tr('menu_no_battles');
    }

    // Main menu strip
    if ($('stripRankIcon')) $('stripRankIcon').textContent = rank.icon;
    if ($('stripRankTitle')) $('stripRankTitle').textContent = rankTitle;
    if ($('stripBattles')) $('stripBattles').textContent = stats.battles;
    if ($('stripWins')) $('stripWins').textContent = stats.wins;
    if ($('stripWinrate')) $('stripWinrate').textContent = `${wr}%`;
    if ($('stripCastles')) $('stripCastles').textContent = stats.castlesCaptured;

    // Career Modal Dossier
    if ($('dossierRankIcon')) $('dossierRankIcon').textContent = rank.icon;
    if ($('dossierRankTitle')) $('dossierRankTitle').textContent = rankTitle;
    if ($('dossierBattles')) $('dossierBattles').textContent = stats.battles;
    if ($('dossierWins')) $('dossierWins').textContent = stats.wins;
    if ($('dossierLosses')) $('dossierLosses').textContent = stats.losses;
    if ($('dossierWinrate')) $('dossierWinrate').textContent = `${wr}%`;
    if ($('dossierCastles')) $('dossierCastles').textContent = stats.castlesCaptured;
    if ($('dossierGold')) $('dossierGold').textContent = stats.goldAmassed;

    if ($('dossierProgressLabel')) {
      if (rank.neededWins > 0) {
        const neededText = window.CrownI18n ? window.CrownI18n.t('career_progress_to') : "Keyingi martabaga:";
        $('dossierProgressLabel').textContent = `${neededText} ${rank.neededWins}`;
      } else {
        $('dossierProgressLabel').textContent = window.CrownI18n ? window.CrownI18n.t('career_max_rank') : "Maksimal martabaga erishildi!";
      }
    }
    if ($('dossierProgressFill')) {
      $('dossierProgressFill').style.width = `${rank.progressPct}%`;
    }

    renderDossierAchievements(stats);
  }
  window.updateCareerUI = updateCareerUI;

  function renderDossierAchievements(stats) {
    const container = $('dossierAchievementsGrid');
    if (!container || !window.CrownCareer) return;
    const list = window.CrownCareer.getAchievementsStatus(stats);
    container.innerHTML = list.map(ach => {
      const title = window.CrownI18n ? window.CrownI18n.t(ach.titleKey) : ach.id;
      const desc = window.CrownI18n ? window.CrownI18n.t(ach.descKey) : '';
      const statusClass = ach.unlocked ? 'unlocked' : 'locked';
      const statusIcon = ach.unlocked ? '✨' : '🔒';
      return `
        <div class="achievement-card ${statusClass}" title="${desc}">
          <span class="ach-icon">${ach.icon}</span>
          <div class="ach-info">
            <strong>${title} ${statusIcon}</strong>
            <small>${desc}</small>
          </div>
        </div>
      `;
    }).join('');
  }

  // Career Modal & Button Listeners
  if ($('menuCareerBadgeBtn')) {
    $('menuCareerBadgeBtn').onclick = () => {
      updateCareerUI();
      showModalSafe('careerDialog');
    };
  }
  if ($('viewCareerDossierBtn')) {
    $('viewCareerDossierBtn').onclick = () => {
      updateCareerUI();
      showModalSafe('careerDialog');
    };
  }
  if ($('menuCareerBtn')) {
    $('menuCareerBtn').onclick = () => {
      updateCareerUI();
      showModalSafe('careerDialog');
    };
  }
  if ($('closeCareerDialog')) {
    $('closeCareerDialog').onclick = () => closeModalSafe('careerDialog');
  }
  if ($('careerResetBtn')) {
    $('careerResetBtn').onclick=()=>confirmAction(tr('ui_reset_stats'),tr('ui_reset_stats_body'),()=>{
      CrownCareer.resetStats();updateCareerUI();toast(tr('ui_stats_reset'));
    });
  }
  if ($('careerShareBtn')) {
    $('careerShareBtn').onclick=()=>copyText(CrownCareer.generateShareText(null,getPlayerDisplayName()));
  }

  // ----------------------------------------------------
  // Live Lobby Browser
  // ----------------------------------------------------
  let lobbiesPollInterval = null;

  async function fetchAndRenderLobbies() {
    const container = $('lobbiesListContainer');
    const countBadge = $('lobbiesCountBadge');
    const dockBadge = $('menuOpenRoomsBadge');
    if (!container) return;

    try {
      const res = await fetch('/api/rooms');
      const data = await res.json();
      if (!res.ok || !data.ok || !data.rooms) throw new Error('rooms unavailable');

      const rooms = data.rooms;
      const count = rooms.length;
      const countText = `${count} ${window.CrownI18n ? window.CrownI18n.t('lobbies_count_badge') : "ta faol xona"}`;
      if (countBadge) countBadge.textContent = countText;
      if (dockBadge) dockBadge.textContent = count;

      if (count === 0) {
        renderEmptyLobbies();
        return;
      }

      container.innerHTML = rooms.map(r => {
        const hostName = r.host?.username || 'Host';
        const mapName = (E.MAP_NAMES && E.MAP_NAMES[r.mapIndex]) || `Xarita #${(r.mapIndex || 0) + 1}`;
        const maxP = r.maxPlayers || 4;
        const countP = r.playersCount || 1;
        const pWord = window.CrownI18n ? window.CrownI18n.t('lobbies_player_count') : "o'yinchi";
        const joinWord = window.CrownI18n ? window.CrownI18n.t('lobbies_join_btn') : "Qo'shilish →";

        let slotDots = '';
        for (let i = 0; i < maxP; i++) {
          const isFilled = i < countP;
          slotDots += `<span class="lobby-slot-dot ${isFilled ? 'filled' : 'empty'}"></span>`;
        }

        return `
          <div class="lobby-item-card">
            <div class="lobby-item-meta">
              <span class="lobby-item-code">${r.code}</span>
              <span class="lobby-item-host">👑 ${esc(hostName)}</span>
              <span class="lobby-item-map">🗺️ ${mapName}</span>
            </div>
            <div class="lobby-item-slots">
              <div class="lobby-slot-pills">${slotDots}</div>
              <span class="lobby-pcount-text">${countP}/${maxP} ${pWord}</span>
            </div>
            <button class="primary-btn join-lobby-item-btn" data-code="${r.code}">${joinWord}</button>
          </div>
        `;
      }).join('');

      container.querySelectorAll('.join-lobby-item-btn').forEach(btn => {
        btn.onclick = () => {
          const code = btn.dataset.code;
          if (code) {
            closeLobbyBrowser();
            joinRoomByCode(code);
          }
        };
      });
    } catch {
      container.innerHTML=`<p class="inline-feedback" role="status">${esc(tr('ui_rooms_failed'))}</p>`;
      if(countBadge)countBadge.textContent='—';
    }
  }
  window.fetchAndRenderLobbies = fetchAndRenderLobbies;

  function renderEmptyLobbies() {
    const container = $('lobbiesListContainer');
    const countBadge = $('lobbiesCountBadge');
    const dockBadge = $('menuOpenRoomsBadge');
    if (countBadge) countBadge.textContent = `0 ${window.CrownI18n ? window.CrownI18n.t('lobbies_count_badge') : "ta faol xona"}`;
    if (dockBadge) dockBadge.textContent = '0';
    if (!container) return;

    const emptyTitle = window.CrownI18n ? window.CrownI18n.t('lobbies_empty_title') : "Hozircha ochiq xonalar mavjud emas";
    const emptyDesc = window.CrownI18n ? window.CrownI18n.t('lobbies_empty_desc') : "Birinchi bo'lib yangi xona oching va do'stlaringizni taklif qiling!";
    const createBtn = window.CrownI18n ? window.CrownI18n.t('lobbies_create_btn') : "+ Yangi Xona Ochish";

    container.innerHTML = `
      <div class="empty-lobbies-card">
        <div class="empty-icon">🏰</div>
        <h4>${emptyTitle}</h4>
        <p>${emptyDesc}</p>
        <button id="emptyCreateRoomBtn" class="primary-btn gold-btn" type="button" style="padding:10px 20px;">${createBtn}</button>
      </div>
    `;

    if ($('emptyCreateRoomBtn')) {
      $('emptyCreateRoomBtn').onclick = () => {
        closeLobbyBrowser();
        $('menuCreateRoomBtn')?.click();
      };
    }
  }

  function openLobbyBrowser() {
    if ($('lobbyBrowserDialog')) {
      showModalSafe('lobbyBrowserDialog');
      $('lobbiesListContainer').innerHTML=`<p role="status">${esc(tr('ui_loading_rooms'))}</p>`;
      fetchAndRenderLobbies();
      startLobbiesPolling();
    }
  }

  function closeLobbyBrowser() {
    closeModalSafe('lobbyBrowserDialog');
    stopLobbiesPolling();
  }

  function startLobbiesPolling() {
    stopLobbiesPolling();
    lobbiesPollInterval = setInterval(fetchAndRenderLobbies, 4000);
  }

  function stopLobbiesPolling() {
    if (lobbiesPollInterval) {
      clearInterval(lobbiesPollInterval);
      lobbiesPollInterval = null;
    }
  }
  window.stopLobbiesPolling = stopLobbiesPolling;

  // Lobbies Browser Button Listeners
  if ($('menuBrowseLobbiesBtn')) {
    $('menuBrowseLobbiesBtn').onclick = openLobbyBrowser;
  }
  if ($('menuLobbyBrowserBtn')) {
    $('menuLobbyBrowserBtn').onclick = openLobbyBrowser;
  }
  if ($('closeLobbyBrowserBtn')) {
    $('closeLobbyBrowserBtn').onclick = closeLobbyBrowser;
  }
  if ($('refreshLobbiesBtn')) {
    $('refreshLobbiesBtn').onclick = fetchAndRenderLobbies;
  }
  if ($('browserCreateRoomBtn')) {
    $('browserCreateRoomBtn').onclick = () => {
      closeLobbyBrowser();
      $('menuCreateRoomBtn')?.click();
    };
  }

  if ($('menuHotkeysBtn')) {
    $('menuHotkeysBtn').onclick = () => {
      closeModalSafe('helpDialog');
      showModalSafe('hotkeysDialog');
    };
  }
  if ($('closeHotkeysDialog')) $('closeHotkeysDialog').onclick = () => closeModalSafe('hotkeysDialog');
  if ($('closeHotkeysBtn')) $('closeHotkeysBtn').onclick = () => closeModalSafe('hotkeysDialog');

  if ($('menuSettingsBtn')) {
    $('menuSettingsBtn').onclick = () => openSettings(false);
  }
  if ($('menuRulesBtn')) {
    $('menuRulesBtn').onclick = () => showModalSafe('helpDialog');
  }

  // AUTH MODAL & BUTTONS
  if ($('menuAuthBtn')) {
    $('menuAuthBtn').onclick = () => {
      closeModalSafe('careerDialog');
      clearAuthAlert();
      showModalSafe('authDialog');
    };
  }
  if ($('closeAuthDialog')) $('closeAuthDialog').onclick = () => closeModalSafe('authDialog');
  if ($('menuLogoutBtn')) $('menuLogoutBtn').onclick = handleLogout;

  if ($('tabLoginBtn')) {
    $('tabLoginBtn').onclick = () => {
      authMode = 'login';
      $('tabLoginBtn').classList.add('active');
      $('tabRegisterBtn').classList.remove('active');
      $('authModalTitle').textContent = tr('auth_login_tab');
      $('authSubmitBtn').textContent = tr('auth_login_submit');
      clearAuthAlert();
    };
  }

  if ($('tabRegisterBtn')) {
    $('tabRegisterBtn').onclick = () => {
      authMode = 'register';
      $('tabRegisterBtn').classList.add('active');
      $('tabLoginBtn').classList.remove('active');
      $('authModalTitle').textContent = tr('auth_reg_tab');
      $('authSubmitBtn').textContent = tr('auth_reg_submit');
      clearAuthAlert();
    };
  }

  if ($('authSubmitBtn')) $('authSubmitBtn').onclick = handleAuthSubmit;
  if ($('authGuestBtn')) {
    $('authGuestBtn').onclick = () => {
      currentUsername = 'Mehmon_' + Math.floor(Math.random() * 1000);
      updateAuthUI();
      $('authDialog').close();
      toast(tr('ui_guest'));
    };
  }

  // Guest Nickname Input and Save Button
  function saveNicknameFromInput() {
    const inp = $('menuNicknameInput');
    if (!inp) return;
    const val = inp.value.trim();
    if (!val) {
      toast("Taxallus bo'sh bo'lishi mumkin emas!");
      return;
    }
    if (val.length < 2 || val.length > 20) {
      toast("Taxallus 2 dan 20 gacha belgidan iborat bo'lishi kerak!");
      return;
    }
    guestNickname = val;
    storageWrite('crownfall_guest_nickname', val);
    if (currentUsername) {
      currentUsername = val;
      storageWrite('crownfall_username', val);
    }
    inp.value = val;
    updateAuthUI();
    toast(tr('menu_nickname_saved') || `Taxallus saqlandi: ${val}`);
  }

  if ($('menuNicknameSaveBtn')) {
    $('menuNicknameSaveBtn').onclick = saveNicknameFromInput;
  }
  if ($('menuNicknameInput')) {
    $('menuNicknameInput').onkeydown = e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveNicknameFromInput();
      }
    };
  }

  // Real-time Faction Roster Table Toggle
  function togglePlayerTableState(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    const tbl = $('gamePlayerTable');
    if (!tbl) return;
    if (window.innerWidth <= 600) {
      tbl.classList.toggle('expanded');
    } else {
      tbl.classList.toggle('collapsed');
    }
  }
  if ($('togglePlayerTableBtn')) {
    $('togglePlayerTableBtn').onclick = togglePlayerTableState;
  }
  if ($('playerTableHeader')) {
    $('playerTableHeader').onclick = togglePlayerTableState;
  }

  // ROOM LOBBY CONTROLS (UP TO 4 PLAYERS)
  if ($('closeLobbyDialog')) $('closeLobbyDialog').onclick = () => $('lobbyLeaveBtn').click();

  if ($('copyRoomCodeBtn')) {
    $('copyRoomCodeBtn').onclick = () => {
      if (currentRoomCode) {
        copyText(currentRoomCode,$('lobbyShareLinkInput'));
      }
    };
  }

  if ($('copyShareLinkBtn')) {
    $('copyShareLinkBtn').onclick = () => {
      const input = $('lobbyShareLinkInput');
      if (input && input.value) {
        copyText(input.value,input);
      }
    };
  }

  // MAX PLAYERS TOGGLE IN LOBBY (HOST ONLY)
  document.querySelectorAll('#lobbyMaxPlayersToggle .maxp-btn').forEach(btn => {
    btn.onclick = () => {
      if (!roomIsHost) return;
      const maxP = Number(btn.dataset.max);
      sendWs({ type: 'update_settings', maxPlayers: maxP });
    };
  });

  // SLOT BOT TOGGLES (SLOTS 1, 2, 3)
  [1, 2, 3].forEach(slotIdx => {
    const role = ['red', 'green', 'purple'][slotIdx - 1];
    const btn = $(`lobbySlotBotBtn${slotIdx}`);
    if (btn) {
      btn.onclick = () => {
        if (!roomIsHost) return;
        sendWs({ type: 'toggle_slot_bot', role });
      };
    }
  });

  if ($('lobbyToggleBotBtn')) {
    $('lobbyToggleBotBtn').onclick = () => {
      if (!roomIsHost) return;
      sendWs({ type: 'add_bot' });
    };
  }

  if ($('lobbyStartMatchBtn')) {
    $('lobbyStartMatchBtn').onclick = () => {
      sendWs({ type: 'start_match' });
    };
  }

  if ($('lobbyLeaveBtn')) {
    $('lobbyLeaveBtn').onclick = () => {
      sendWs({type:'leave_match'});
      multiplayerMode = false;
      if (wsClient) wsClient.close();
      wsClient=null;myRole='blue';roomIsHost=false;reconnectToken=null;clearTimeout(reconnectTimer);
      currentRoomCode = null;
      $('roomLobbyDialog').close();
      toast(tr('ui_room_left'));
    };
  }

  if ($('lobbyMapSelect')) {
    $('lobbyMapSelect').onchange = () => {
      const val = $('lobbyMapSelect').value;
      const idx = val === 'random' ? Math.floor(Math.random() * E.MAPS.length) : Number(val);
      sendWs({ type: 'update_settings', mapIndex: idx });
    };
  }

  if ($('lobbyRandomCastles')) {
    $('lobbyRandomCastles').onchange = () => {
      sendWs({ type: 'update_settings', randomCastles: $('lobbyRandomCastles').checked });
    };
  }

  // OFFLINE BANNER CONTROLS
  if ($('offlineRetryBtn')) {
    $('offlineRetryBtn').onclick = () => {
      reconnectAttempts = 0;
      triggerAutoReconnect();
    };
  }

  if ($('offlineMenuBtn')) {
    $('offlineMenuBtn').onclick = () => {
      destroyAndReturnToMenu();
    };
  }

  window.addEventListener('online', () => {
    toast(tr('ui_reconnected'));
    if (multiplayerMode && !state.result) {
      triggerAutoReconnect();
    }
  });

  window.addEventListener('offline', () => {
    toast(tr('audit_disconnected'));
    if (multiplayerMode && !state.result) {
      if ($('offlineNoticeBanner')) $('offlineNoticeBanner').classList.remove('hidden');
      if ($('offlineNoticeStatus')) $('offlineNoticeStatus').textContent = tr('audit_disconnected');
    }
  });

  // DIALOGS & MENUS
  if ($('menuBtn')) $('menuBtn').onclick = () => openSettings(true);
  if ($('closeMenu')) $('closeMenu').onclick = () => {
    if ($('menuDialog')) $('menuDialog').close();
  };

  // Language buttons in settings
  document.querySelectorAll('.lang-switch-group .lang-btn').forEach(btn => {
    btn.onclick = () => {
      const lang = btn.dataset.lang;
      if (lang && window.CrownI18n) {
        window.CrownI18n.setLanguage(lang);
        document.querySelectorAll('.lang-switch-group .lang-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.lang === lang);
        });
        const inGameSectionVisible = $('inGameSettingsSection') && !$('inGameSettingsSection').classList.contains('hidden');
        if ($('settingsModalTitle')) {
          $('settingsModalTitle').textContent = inGameSectionVisible 
            ? window.CrownI18n.t('ingame_settings_title') 
            : window.CrownI18n.t('settings_title');
        }
        updateUI();
        updateDock();
        toast(window.CrownI18n.t('toast_lang_changed'));
      }
    };
  });

  // Sound toggle buttons in settings
  if ($('settingsSoundOnBtn')) {
    $('settingsSoundOnBtn').onclick = () => {
      if (typeof MobileGame !== 'undefined' && MobileGame.setSound) {
        MobileGame.setSound(true);
      } else {
        localStorage.setItem('crownfall-sound', 'on');
      }
      syncSettingsValues();
      toast(window.CrownI18n ? window.CrownI18n.t('sound_toast_on') : "Ovoz effektlari yoqildi");
    };
  }
  if ($('settingsSoundOffBtn')) {
    $('settingsSoundOffBtn').onclick = () => {
      if (typeof MobileGame !== 'undefined' && MobileGame.setSound) {
        MobileGame.setSound(false);
      } else {
        localStorage.setItem('crownfall-sound', 'off');
      }
      syncSettingsValues();
      toast(window.CrownI18n ? window.CrownI18n.t('sound_toast_off') : "Ovoz effektlari o'chirildi");
    };
  }

  // Graphics quality selector in settings
  if ($('qualitySelect')) {
    $('qualitySelect').onchange = () => {
      const val = $('qualitySelect').value;
      if (typeof MobileGame !== 'undefined' && MobileGame.setQuality) {
        MobileGame.setQuality(val);
      }
      const toastPrefix = window.CrownI18n ? window.CrownI18n.t('quality_toast') : "Grafika sifati:";
      toast(`⚡ ${toastPrefix} ${val.toUpperCase()}`);
    };
  }

  // Speed options in settings
  document.querySelectorAll('.speed-switch-group .speed-opt-btn').forEach(btn => {
    btn.onclick = () => {
      const spd = Number(btn.dataset.speed);
      if (spd && !multiplayerMode) {
        simSpeed = spd;
        document.querySelectorAll('.speed-switch-group .speed-opt-btn').forEach(b => {
          b.classList.toggle('active', b === btn);
        });
        if ($('speedBtn')) $('speedBtn').textContent = SPEED_LABELS[simSpeed] || `${simSpeed}×`;
        const speedPrefix = window.CrownI18n ? window.CrownI18n.t('speed_toast') : "O'yin tezligi:";
        toast(`⏱️ ${speedPrefix} ${SPEED_LABELS[simSpeed] || simSpeed + '×'}`);
      }
    };
  });

  // Settings tactical reference links
  if ($('settingsHotkeysBtn')) {
    $('settingsHotkeysBtn').onclick = () => {
      if ($('menuDialog')) $('menuDialog').close();
      if ($('hotkeysDialog')) $('hotkeysDialog').showModal();
    };
  }
  if ($('settingsRulesBtn')) {
    $('settingsRulesBtn').onclick = () => {
      if ($('menuDialog')) $('menuDialog').close();
      if ($('helpDialog')) $('helpDialog').showModal();
    };
  }

  if ($('tacticsBtn')) $('tacticsBtn').onclick = () => {
    const c = state.castles[sourceId];
    if (c) {
      if ($('tacticsTitle')) $('tacticsTitle').textContent = `${c.name} · ${tr('ui_castle_actions')}`;
      if(c.owner!==myRole)return;
      $('tacticsSpecialty').value=nextSpecialty||c.specialty;
      $('tacticsFeedback').textContent=tr('ui_spec_hint');
      $('castleDetails').textContent=[$('sourceIncome').textContent,$('activePassiveDesc').textContent].filter(Boolean).join(' · ');
      if ($('reserveInput')) $('reserveInput').value = c.reserve;
      const targetSelect = $('tacticsSupplyTarget');
      if (targetSelect) {
        const targets = E.owned(state, myRole).filter(x => x.id !== c.id);
        targetSelect.innerHTML = `<option value="">${esc(tr('ui_off'))}</option>` +
          targets.map(x => `<option value="${x.id}" ${c.supply?.target === x.id ? 'selected' : ''}>${esc(x.name)} (${fmt(x.troops)} ${tr('ui_troops')})</option>`).join('');
      }
      $('tacticsDialog').showModal();
      if($('tacticsSupplyTarget').options.length===1)$('tacticsFeedback').textContent=tr('ui_no_supply');
      syncTacticsState();
    }
  };
  if ($('mgmtTacticsBtn')) $('mgmtTacticsBtn').onclick = () => $('tacticsBtn')?.click();
  $('tacticsSpecialty').onchange=()=>{nextSpecialty=$('tacticsSpecialty').value;updateDock();syncTacticsState()};
  if ($('closeTactics')) $('closeTactics').onclick = () => $('tacticsDialog').close();

  if ($('saveReserveBtn')) {
    $('saveReserveBtn').onclick = () => {
      const val = Number($('reserveInput').value);
      if(!$('reserveInput').value.trim()||!Number.isSafeInteger(val)||val<0||val>E.MAX_RESOURCE){$('tacticsFeedback').textContent=tr('ui_reserve_invalid');$('reserveInput').setAttribute('aria-invalid','true');return;}
      $('reserveInput').removeAttribute('aria-invalid');
      if (multiplayerMode) { sendWs({type:'tactics', castleId:sourceId, reserve:val}); $('tacticsDialog').close(); return; }
      if (E.setReserve(state, myRole, sourceId, val)) {
        toast(tr('ui_saved'));saveMatch();
        if (multiplayerMode) sendWs({ type: 'tactics', castleId: sourceId, reserve: val });
        $('tacticsDialog').close();
        updateUI();
      }
    };
  }

  if ($('saveSupplyBtn')) {
    $('saveSupplyBtn').onclick = () => {
      const val = $('tacticsSupplyTarget').value;
      const target = val === '' ? null : Number(val);
      if (multiplayerMode) { sendWs({type:'tactics', castleId:sourceId, supplyTarget:target, route:marchRoute}); $('tacticsDialog').close(); return; }
      if (E.setSupply(state, myRole, sourceId, target, marchRoute)) {
        toast(tr('ui_saved'));saveMatch();
        if (multiplayerMode) sendWs({ type: 'tactics', castleId: sourceId, supplyTarget: target, route: marchRoute });
        $('tacticsDialog').close();
        updateUI();
      } else {
        $('tacticsFeedback').textContent=tr('ui_supply_invalid');
      }
    };
  }

  if ($('applySpecialtyBtn')) {
    $('applySpecialtyBtn').onclick = () => {
      const source = state.castles[sourceId];
      if (!source || source.owner !== myRole) return;
      const spec = $('tacticsSpecialty')?.value || 'balanced';
      if (multiplayerMode) {
        sendWs({ type: 'specialize', castleId: source.id, specialty: spec });
        $('tacticsDialog').close();
      } else {
        const ok = E.specialize(state, myRole, source.id, spec);
        if (!ok) {
          toast(window.CrownI18n ? window.CrownI18n.t('spec_error_gold') : "Oltin yetarli emas (50 oltin kerak)!");
        } else {
          nextSpecialty=null;saveMatch();
          toast(window.CrownI18n ? window.CrownI18n.t('spec_changed') : `Qal'a ixtisoslashuvi o'zgartirildi: ${spec.toUpperCase()}`);
          $('tacticsDialog').close();
          updateUI();
          V.render(state, targetId, sourceId);
        }
      }
    };
  }

  // ----------------------------------------------------
  // ARMY RECALL EVENT LISTENERS
  // ----------------------------------------------------
  if ($('closeArmyRecallDialog')) $('closeArmyRecallDialog').onclick = () => $('armyRecallDialog').close();
  if ($('armyRecallActionBtn')) {
    $('armyRecallActionBtn').onclick = () => {
      if (inspectedArmyId === null || !state.armies.some(a => a.id === inspectedArmyId && a.owner === myRole)) return;
      if (multiplayerMode) {
        sendWs({ type: 'recall', armyId: inspectedArmyId });
      } else {
        const ok = E.recall(state, myRole, inspectedArmyId);
        if (ok) {
          toast(`↩ Armiya ${inspectedArmyId} ortga qaytarildi.`);
          saveMatch();
        }
      }
      $('armyRecallDialog').close();
      updateUI();
      V.render(state, targetId, sourceId);
    };
  }

  // ----------------------------------------------------
  // DRAGON STRIKE EVENT LISTENERS
  // ----------------------------------------------------
  if ($('dragonStrikeBtn')) {
    $('dragonStrikeBtn').onclick = () => {
      if (state.paused || !!state.result || (multiplayerMode && wsClient?.readyState !== 1)) return;
      if (dragonTargeting) {
        cancelDragonStrike();
        return;
      }
      const cd = (state.dragonCooldowns && state.dragonCooldowns[myRole]) || 0;
      if (cd > 0) {
        toast(`🐉 Ajdaho qayta tiklanmoqda: ${Math.ceil(cd)}s`);
        return;
      }
      if (E.owned(state, myRole).length < 3) {
        toast("🐉 Ajdaho uchun kamida 3 ta qal'ani egallash kerak!");
        return;
      }
      if (state.time < 40) {
        toast(`🐉 Ajdaho 40-soniyadan so'ng ochiladi (${Math.ceil(40 - state.time)}s qoldi)`);
        return;
      }
      if ((state.players[myRole]?.gold || 0) < 1000) {
        toast("🐉 Ajdaho zarbasi uchun 1000 oltin kerak!");
        return;
      }
      if(state.dragonStrike)return;
      // Enter targeting mode!
      dragonTargeting = true;
      $('zoomReset')?.click();
      const defTarget = targetId !== null ? state.castles[targetId] : { x: 1100, y: 750 };
      dragonTargetPos = { x: defTarget.x, y: defTarget.y };
      $('dragonTargetingOverlay')?.classList.remove('hidden');
      renderDragonReticle(dragonTargetPos.x, dragonTargetPos.y);
      const mapSvg = $('map');
      if (mapSvg) mapSvg.style.cursor = 'crosshair';
      toast("🐉 Xaritada zarba joyini tanlang (mishka bilan bosing yoki 'Ajdahoni yuborish' tugmasi)!");
    };
  }

  if ($('confirmDragonBtn')) {
    $('confirmDragonBtn').onclick = () => {
      executeDragonStrike(dragonTargetPos.x, dragonTargetPos.y);
    };
  }

  if ($('cancelDragonBtn')) {
    $('cancelDragonBtn').onclick = () => {
      cancelDragonStrike();
      toast("Ajdaho zarbasi bekor qilindi.");
    };
  }

  if ($('menuNewMatch')) {
    $('menuNewMatch').onclick = () => {
      const mapVal = $('mapSelect')?.value || 'random';
      const randCastles = $('randomCastlesToggle')?.checked ?? true;
      resetMatch(false, mapVal, randCastles);
    };
  }
  if ($('menuSameMap')) $('menuSameMap').onclick = () => resetMatch(true);
  if ($('menuHelpBtn')) $('menuHelpBtn').onclick = () => { $('menuDialog').close(); $('helpDialog').showModal(); };
  if ($('closeHelp')) $('closeHelp').onclick = () => $('helpDialog').close();
  if ($('startPlaying')) $('startPlaying').onclick = () => $('helpDialog').close();

  if ($('sbTroops')) $('sbTroops').onclick = () => {
    if(multiplayerMode)return;
    const c = state.castles[sourceId];
    if (c && c.owner === myRole) {
      c.troops += 500;
      toast(`+500 askar (${c.name})`);
      updateUI();
      V.render(state, targetId, sourceId);
    }
  };
  if ($('sbGold')) $('sbGold').onclick = () => {
    if(multiplayerMode)return;
    state.players[myRole].gold += 500;
    toast('+500 oltin');
    updateUI();
  };

  if ($('rematchBtn')) $('rematchBtn').onclick = () => {
    if (multiplayerMode && wsClient && wsClient.readyState === WebSocket.OPEN) {
      sendWs({ type: 'rematch' });
      rematchPending=true;
      $('rematchBtn').disabled=true;
      $('rematchBtn').textContent=tr('ui_rematch_wait');
    } else {
      $('resultDialog').close();
      resetMatch(true);
    }
  };

  if ($('playAgain')) $('playAgain').onclick = () => {
    const mapVal = $('mapSelect')?.value || 'random';
    const randCastles = $('randomCastlesToggle')?.checked ?? true;
    resetMatch(false, mapVal, randCastles);
  };

  // DIFFICULTY MODAL & CONTROLS
  document.querySelectorAll('.diff-card').forEach(card => {
    card.onclick = () => {
      const val = card.dataset.diff;
      if (val) {syncDiffModal(val);syncSetupUI();}
    };
  });

  if ($('diffBadgeBtn')) {
    $('diffBadgeBtn').onclick = () => {
      if(multiplayerMode)return;
      state.paused=true;
      openBattleSetup('single',true);
      updateUI();
    };
  }

  if ($('qualityBadgeBtn')) {
    $('qualityBadgeBtn').onclick = () => {
      if (typeof MobileGame !== 'undefined' && MobileGame.cycleQuality) {
        MobileGame.cycleQuality();
      }
    };
  }

  // SINGLE PLAYER PLAYER COUNT TOGGLE (2, 3, 4 PLAYERS)
  document.querySelectorAll('#spPlayerCountToggle .sp-pcount-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('#spPlayerCountToggle .sp-pcount-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedPlayerCount = Number(btn.dataset.count) || 2;
      const curMap = Number($('startMapSelect')?.value);
      if (E.MAP_PLAYERS[curMap] !== selectedPlayerCount) {
        const validMap = E.MAP_PLAYERS.indexOf(selectedPlayerCount);
        if ($('startMapSelect')) $('startMapSelect').value = String(validMap !== -1 ? validMap : 0);
      }
      syncSetupUI();
    };
  });

  // VICTORY MODE TOGGLE
  document.querySelectorAll('#spVictoryModeToggle .sp-vmode-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('#spVictoryModeToggle .sp-vmode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedVictoryMode = btn.dataset.vmode || 'crown_control';
      syncSetupUI();
    };
  });

  // REGION TOGGLE (EUROPE, ASIA, AMERICAS)
  document.querySelectorAll('#spRegionToggle .sp-region-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('#spRegionToggle .sp-region-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedRegion = btn.dataset.region || 'europe';
      syncSetupUI();
    };
  });

  // HISTORICAL EPOCH TIMELINE TOGGLE (17th, 18th, 19th, 20th Century)
  const EPOCH_PREVIEWS = {
    '17th': {
      icon: '🏰',
      title: '17th Century · Bastions & Keeps',
      desc: 'Medieval stone masonry, slate battlements, pikemen, early matchlock musket companies'
    },
    '18th': {
      icon: '⭐',
      title: '18th Century · Star Fortresses',
      desc: 'Vauban bastions, smoothbore cannons, flintlock musketeers, regiment lines'
    },
    '19th': {
      icon: '🏭',
      title: '19th Century · Industrial Arsenals',
      desc: 'Steam works, rifled breech artillery, brick arsenals, ironclad railways'
    },
    '20th': {
      icon: '📡',
      title: '20th Century · Reinforced Bunkers',
      desc: 'Concrete pillboxes, motorized infantry, field howitzers, radio radar arrays'
    }
  };

  const updateEpochPreview = (ep) => {
    const data = EPOCH_PREVIEWS[ep] || EPOCH_PREVIEWS['18th'];
    if ($('epochPreviewThumb')) $('epochPreviewThumb').textContent = data.icon;
    if ($('epochPreviewTitle')) $('epochPreviewTitle').textContent = data.title;
    if ($('epochPreviewDesc')) $('epochPreviewDesc').textContent = data.desc;
  };

  document.querySelectorAll('#spEpochToggle .sp-epoch-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('#spEpochToggle .sp-epoch-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedEpoch = btn.dataset.epoch || '18th';
      updateEpochPreview(selectedEpoch);
      syncSetupUI();
    };
  });

  if ($('startGameBtn')) {
    $('startGameBtn').onclick = () => {
      const activeCard = document.querySelector('.diff-card.active') || document.querySelector('input[name="matchDifficulty"]:checked')?.closest('.diff-card');
      const selectedDiff = activeCard?.dataset?.diff || 'normal';
      if(changingDifficulty){state.aiDifficulty=selectedDiff;changingDifficulty=false;$('difficultyDialog').close();updateUI();saveMatch();return}
      if(!heroChosen || !E.HEROES[selectedHero]){syncHeroUI();return;}
      if(setupMode==='quick'){
        $('difficultyDialog').close();
        startMatchmakingTimer();$('matchmakingDialog').showModal();
        connectWs(()=>sendWs({type:'quick_match',username:getPlayerDisplayName(),hero:selectedHero}));
        return;
      }
      state.aiDifficulty = selectedDiff;
      state.aiTimer = { easy: 6.0, normal: 3.5, hard: 1.8 }[selectedDiff] || 3.5;
      if ($('aiDifficulty')) $('aiDifficulty').value = selectedDiff;

      const startMapVal = $('startMapSelect')?.value;
      const startRandom = $('startRandomCastles')?.checked ?? true;
      const curMap = state.mapIndex !== undefined ? state.mapIndex : 0;
      const targetMap = startMapVal === 'random' ? Math.floor(Math.random() * E.MAPS.length) : (startMapVal !== undefined ? Number(startMapVal) : curMap);

      if(multiplayerMode){sendWs({type:'leave_match'});multiplayerMode=false;wsClient?.close();wsClient=null}
      myRole='blue';roomIsHost=false;currentRoomCode=null;matchActive=true;
      sourceId=0;targetId=null;allCastles=false;nextSpecialty=null;
      $('allCastlesBtn')?.classList.remove('active');
      state = E.create(Date.now(), state.aiStyle || 'balanced', selectedDiff, targetMap, startRandom, selectedPlayerCount, selectedVictoryMode, { blue: selectedHero }, true, selectedEpoch, selectedRegion);
      const activeKeys = Object.keys(state.players);
      state.botPlayers = activeKeys.filter(k => k !== 'blue');
      lastSeenWeather = state.weather ? state.weather.type : 'clear';
      V.init(state);

      state.paused = false;
      last = performance.now();
      $('difficultyDialog').close();
      enterGameMode();
      const diffWord = DIFF_LABELS[selectedDiff] || selectedDiff;
      const isRu = !window.CrownI18n || window.CrownI18n.getLanguage() !== 'uz';
      const hName = window.CrownI18n ? window.CrownI18n.t(`hero_${selectedHero}_name`) : selectedHero;
      const startMsg = isRu ? `⚔️ ${diffWord} · Игроков: ${selectedPlayerCount} · Полководец: ${hName}!` : `⚔️ ${diffWord} · ${selectedPlayerCount} kishilik jang boshlandi!`;
      toast(`${tr('ui_match_started')} · ${hName}`);
      updateUI();
      V.render(state, targetId, sourceId);
      saveMatch();
    };
  }

  document.querySelectorAll('#spHeroPickGrid .hero-card,#lobbyHeroButtons .lobby-hero-btn').forEach(card=>{
    card.onclick=()=>selectHero(card.dataset.hero,!!card.closest('#lobbyHeroButtons'));
    card.onkeydown=e=>{
      if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key))return;
      e.preventDefault();
      const cards=[...card.parentElement.querySelectorAll('[data-hero]')], i=cards.indexOf(card);
      const next=e.key==='Home'?0:e.key==='End'?cards.length-1:(i+(['ArrowLeft','ArrowUp'].includes(e.key)?-1:1)+cards.length)%cards.length;
      cards[next].focus();cards[next].click();
    };
  });
  if ($('dockHandleBar')) {
    let touchStartY = 0;
    $('dockHandleBar').addEventListener('touchstart', e => {
      if (e.touches && e.touches[0]) touchStartY = e.touches[0].clientY;
    }, { passive: true });
    $('dockHandleBar').addEventListener('touchend', e => {
      if (e.changedTouches && e.changedTouches[0]) {
        const touchEndY = e.changedTouches[0].clientY;
        const dy = touchEndY - touchStartY;
        if (dy < -25) {
          setDockState('expanded');
        } else if (dy > 25) {
          setDockState(dockState === 'expanded' ? 'peek' : 'collapsed');
        } else {
          if (dockState === 'collapsed') setDockState('peek');
          else if (dockState === 'peek') setDockState('expanded');
          else setDockState('peek');
        }
      }
    });
    $('dockHandleBar').onclick = e => {
      if (e.pointerType === 'touch') return;
      if (dockState === 'collapsed') setDockState('peek');
      else if (dockState === 'peek') setDockState('expanded');
      else setDockState('peek');
    };
  }
  if ($('moreCommandsBtn')) {
    $('moreCommandsBtn').onclick = () => {
      toggleCastleManagement();
    };
  }
  if ($('closeCastleMgmtBtn')) {
    $('closeCastleMgmtBtn').onclick = () => {
      closeCastleManagement();
    };
  }
  if ($('stripRecallBtn')) {
    $('stripRecallBtn').onclick = () => {
      if (selectedArmyId !== null) executeArmyRecall(selectedArmyId);
    };
  }
  if ($('stripCloseArmyBtn')) {
    $('stripCloseArmyBtn').onclick = () => {
      clearContextSelection();
    };
  }
  if ($('stripCloseBattleBtn')) {
    $('stripCloseBattleBtn').onclick = () => {
      clearContextSelection();
    };
  }
  if ($('stripFocusBattleBtn')) {
    $('stripFocusBattleBtn').onclick = () => {
      const b = (state.battles || []).find(x => x.id === selectedBattleId);
      if (b) {
        toast(`⚔️ Focus: Battle #${b.id}`);
      }
    };
  }
  $('startMapSelect').onchange=()=>syncSetupUI();
  document.querySelectorAll('input[name="matchDifficulty"]').forEach(radio=>radio.onchange=()=>{syncDiffModal(radio.value);syncSetupUI();});
  syncSetupUI();

  // WEATHER FORECAST POPOVER & HUD BADGE
  if ($('weatherHudBadge')) {
    $('weatherHudBadge').onclick = () => {
      const popover = $('weatherForecastPopover');
      if (popover) {
        popover.classList.toggle('hidden');
        updateWeatherForecastPopover();
      }
    };
    $('weatherHudBadge').onkeydown = e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        $('weatherForecastPopover')?.classList.toggle('hidden');
        updateWeatherForecastPopover();
      }
    };
  }
  if ($('closeWeatherPopover')) {
    $('closeWeatherPopover').onclick = () => {
      $('weatherForecastPopover')?.classList.add('hidden');
    };
  }

  // TACTICAL NODE LEGEND MODAL WIRING
  const toggleLegend = () => {
    const modal = $('tacticalLegendModal');
    if (modal) {
      modal.classList.toggle('hidden');
      modal.setAttribute('aria-hidden', String(modal.classList.contains('hidden')));
    }
  };
  if ($('legendToggleBtn')) {
    $('legendToggleBtn').onclick = toggleLegend;
  }
  if ($('closeLegendBtn')) {
    $('closeLegendBtn').onclick = () => {
      const modal = $('tacticalLegendModal');
      if (modal) {
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
      }
    };
  }
  const legendModal = $('tacticalLegendModal');
  if (legendModal) {
    legendModal.onclick = (e) => {
      if (e.target === legendModal) {
        legendModal.classList.add('hidden');
        legendModal.setAttribute('aria-hidden', 'true');
      }
    };
  }

  if ($('mapTitleChip')) {
    $('mapTitleChip').onclick = () => {
      $('mapTitleChip').classList.toggle('collapsed');
    };
  }

  // NATIVE PAUSE OVERLAY MODAL ACTIONS
  if ($('pauseResumeBtn')) {
    $('pauseResumeBtn').onclick = () => {
      state.paused = false;
      last = performance.now();
      updateUI();
      saveMatch();
    };
  }
  if ($('pauseSettingsBtn')) {
    $('pauseSettingsBtn').onclick = () => {
      openSettings(true);
    };
  }
  if ($('pauseQuitBtn')) {
    $('pauseQuitBtn').onclick = () => {
      if ($('confirmMenuDesc')) {
        $('confirmMenuDesc').textContent = window.CrownI18n 
          ? window.CrownI18n.t('confirm_return_desc') 
          : "Текущая игра будет остановлена и удалена. Новая игра начнется заново.";
      }
      if ($('confirmMenuDialog')) $('confirmMenuDialog').showModal();
    };
  }

  // HERO PILL CLICK -> TOAST EXPLANATION
  if ($('hudHeroPill')) {
    $('hudHeroPill').onclick = () => {
      const myHero = state.players[myRole]?.hero || selectedHero || 'vanguard';
      const heroIcons = { vanguard: '⚡', fortifier: '🛡️', guildmaster: '💰', infiltrator: '🏹' };
      const hName = window.CrownI18n ? window.CrownI18n.t(`hero_${myHero}_name`) : myHero;
      const hDesc = window.CrownI18n ? window.CrownI18n.t(`hero_${myHero}_desc`) : '';
      toast(`${heroIcons[myHero] || '⚔️'} ${hName}: ${hDesc}`);
    };
  }

  if ($('aiStyle')) $('aiStyle').onchange=()=>{if(!multiplayerMode){E.setAIStyle(state,$('aiStyle').value);saveMatch()}};

  if ($('aiDifficulty')) {
    $('aiDifficulty').onchange = () => {
      const val = $('aiDifficulty').value;
      if(multiplayerMode)return;
      state.aiDifficulty = val;
      state.aiTimer = { easy: 6.0, normal: 3.5, hard: 1.8 }[val] || 3.5;
      syncDiffModal(val);
      updateUI();
      saveMatch();
      toast(`${tr('ai_diff_label')} ${DIFF_LABELS[val] || val}`);
    };
  }

  // ----------------------------------------------------
  // KEYBOARD HOTKEYS ENGINE
  // ----------------------------------------------------
  window.addEventListener('keydown', e => {
    // If user is focused on an input element, do not trigger game hotkeys
    const tag = document.activeElement?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || document.activeElement?.isContentEditable) {
      if (e.key === 'Enter' && document.activeElement.id === 'menuJoinInput') {
        $('menuJoinRoomBtn')?.click();
      }
      return;
    }

    // Main Menu Hotkeys
    const menuOpen = $('mainMenuScreen') && !$('mainMenuScreen').classList.contains('hidden');
    if (menuOpen) {
      return;
    }

    if (e.key === 'Escape') {
      if(dragonTargeting){e.preventDefault();cancelDragonStrike();return;}
      if($('resultDialog').open){e.preventDefault();return;}
      if (castleMgmtOpen) {
        closeCastleManagement();
        return;
      }
      if (selectedArmyId !== null || selectedBattleId !== null) {
        clearContextSelection();
        return;
      }
      const openDialog = document.querySelector('dialog[open]');
      if (openDialog && openDialog.open && (openDialog.offsetWidth > 0 || openDialog.offsetHeight > 0)) {
        openDialog.close();
        return;
      }
      if (targetId !== null) {
        targetId = null;
        updateUI();
        V.render(state, targetId, sourceId);
        return;
      }
    }
    const openDialog = document.querySelector('dialog[open]');
    if (openDialog?.open) {
      if (e.key === 'Escape') openDialog.close();
      return;
    }
    const armyNode = e.target.closest?.('[data-army-id]');
    if (armyNode && (e.key === 'Enter' || e.code === 'Space')) {
      e.preventDefault();
      armyNode.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      return;
    }
    const castle = e.target.closest?.('[data-id]');
    if (castle && (e.key === 'Enter' || e.code === 'Space')) {
      e.preventDefault();
      castle.dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: e.shiftKey }));
      return;
    }
    // Only yield Space and Enter to focused buttons so hotkeys (U, F, 1-4, R, A, C, M) ALWAYS work!
    if (e.target.closest?.('button,[role="button"]') && (e.code === 'Space' || e.key === 'Enter' || e.key === ' ')) {
      return;
    }

    // Tab opens management in the battlefield; Shift+Tab and dialog Tab keep focus navigation.
    if ((!e.shiftKey && (e.key === 'Tab' || e.code === 'Tab')) || e.code === 'KeyM' || e.key?.toLowerCase() === 'm' || e.key === 'ь' || e.key === 'Ь') {
      if (e.repeat || !$('tacticalLegendModal')?.classList.contains('hidden') || !$('pauseOverlayModal')?.classList.contains('hidden')) return;
      e.preventDefault();
      toggleCastleManagement();
      return;
    }

    // Game Hotkey: U -> Upgrade selected castle
    if (e.code === 'KeyU' || e.key?.toLowerCase() === 'u' || e.key === 'г' || e.key === 'Г') {
      e.preventDefault();
      executeUpgrade(sourceId);
      return;
    }

    // Game Hotkey: R -> Recall the selected army
    if (e.code === 'KeyR' || e.key?.toLowerCase() === 'r' || e.key === 'к' || e.key === 'К') {
      e.preventDefault();
      if (selectedArmyId !== null) {
        executeArmyRecall(selectedArmyId);
      } else if (inspectedArmyId !== null && $('armyRecallDialog')?.open) {
        executeArmyRecall(inspectedArmyId);
      }
      return;
    }

    // Game Hotkeys: 1, 2, 3, 4 -> Dispatch percentage
    if (e.key === '1' || e.code === 'Digit1' || e.code === 'Numpad1') {
      e.preventDefault();
      setDispatchPercent(25);
      return;
    }
    if (e.key === '2' || e.code === 'Digit2' || e.code === 'Numpad2') {
      e.preventDefault();
      setDispatchPercent(50);
      return;
    }
    if (e.key === '3' || e.code === 'Digit3' || e.code === 'Numpad3') {
      e.preventDefault();
      setDispatchPercent(75);
      return;
    }
    if (e.key === '4' || e.code === 'Digit4' || e.code === 'Numpad4') {
      e.preventDefault();
      setDispatchPercent(100);
      return;
    }

    // Game Hotkey: Space or Enter -> Dispatch army to target
    if (e.code === 'Space' || e.key === 'Enter') {
      e.preventDefault();
      if (targetId !== null) {
        executeDispatch(sourceId, targetId, dispatchPercent);
      } else {
        toast(tr('audit_select'));
      }
      return;
    }

    // Game Hotkey: C -> Cycle through owned castles
    if (e.code === 'KeyC' || e.key?.toLowerCase() === 'c' || e.key === 'с' || e.key === 'С') {
      e.preventDefault();
      cycleSource(e.shiftKey ? -1 : 1);
      return;
    }

    // Game Hotkey: A -> Toggle all castles attack
    if (e.code === 'KeyA' || e.key?.toLowerCase() === 'a' || e.key === 'ф' || e.key === 'Ф') {
      e.preventDefault();
      allCastles = !allCastles;
      if ($('allCastlesBtn')) $('allCastlesBtn').classList.toggle('active', allCastles);
      toast(tr(allCastles ? 'ui_all_sources' : 'ui_single_source'));
      updateDock();
      return;
    }

    // Game Hotkey: F -> Toggle march route
    if (e.code === 'KeyF' || e.key?.toLowerCase() === 'f' || e.key === 'а' || e.key === 'А') {
      e.preventDefault();
      marchRoute = marchRoute === 'fast' ? 'flank' : 'fast';
      if ($('routeLabel')) $('routeLabel').textContent = marchRoute === 'fast' ? "BOSH YO'L" : "QANOT YO'LI";
      if ($('routeSpeedText')) $('routeSpeedText').textContent = marchRoute === 'fast' ? '85 px/s' : '65 px/s';
      toast(tr(marchRoute === 'fast' ? 'route_main' : 'route_flank'));
      updateDock();
      V.render(state, targetId, sourceId, marchRoute);
      return;
    }

    // Game Hotkey: D -> Dragon Strike
    if (e.code === 'KeyD' || e.key?.toLowerCase() === 'd' || e.key === 'в' || e.key === 'В') {
      e.preventDefault();
      $('dragonStrikeBtn')?.click();
      return;
    }

    // Game Hotkey: L -> Toggle Tactical Map Legend
    if (e.code === 'KeyL' || e.key?.toLowerCase() === 'l' || e.key === 'д' || e.key === 'Д') {
      e.preventDefault();
      const modal = $('tacticalLegendModal');
      if (modal) {
        modal.classList.toggle('hidden');
        modal.setAttribute('aria-hidden', String(modal.classList.contains('hidden')));
      }
      return;
    }

    // Game Hotkey: P -> Pause / Resume
    if (e.code === 'KeyP' || e.key?.toLowerCase() === 'p' || e.key === 'з' || e.key === 'З') {
      e.preventDefault();
      if (!multiplayerMode) {
        state.paused = !state.paused;
        last = performance.now();
        updateUI();
        saveMatch();
      } else {
        toast(tr('ui_online_clock'));
      }
      return;
    }

    // Game Hotkey: Escape -> Clear target selection or close dialogs
    if (e.key === 'Escape') {
      if (dragonTargeting) {
        cancelDragonStrike();
        toast("Ajdaho zarbasi bekor qilindi.");
        return;
      }
      if ($('armyRecallDialog')?.open) { $('armyRecallDialog').close(); return; }
      if ($('menuDialog')?.open) { $('menuDialog').close(); return; }
      if ($('tacticsDialog')?.open) { $('tacticsDialog').close(); return; }
      if ($('helpDialog')?.open) { $('helpDialog').close(); return; }
      if ($('hotkeysDialog')?.open) { $('hotkeysDialog').close(); return; }
      if (targetId !== null) {
        targetId = null;
        updateDock();
        V.render(state, targetId, sourceId);
        toast(tr('ui_selection_cleared'));
      }
      return;
    }
  });
}

// Main Animation Loop with Dynamic FPS Throttling
let lastRenderTime = 0;
function frame(now) {
  const realDt = Math.max(0, (now - last) / 1000);
  last = now;
  const dt = realDt * simSpeed;
  // Menu and background tabs have no visible battlefield work.
  if (!matchActive || document.hidden || document.body.classList.contains('in-menu')) {
    requestAnimationFrame(frame);
    return;
  }

  if (typeof MobileGame !== 'undefined') MobileGame.sampleFrame(realDt);
  if (!multiplayerMode) {
    E.tick(state, dt);
  } else if (state && state.armies && state.armies.length > 0 && !state.paused && !state.result) {
    // Multiplayer Client-Side Movement Interpolation:
    // Glides armies smoothly between 100ms server snapshots at 60/144 FPS matching server SPEED (0.65)
    const moveDt = realDt * 0.65;
    for (const a of state.armies) {
      if(a.inBattle)continue;
      a.t = Math.min(a.duration, a.t + moveDt);
      const p = E.position(a);
      a.x = p.x;
      a.y = p.y;
    }
    if (state.effects && state.effects.length) {
      state.effects = state.effects.filter(e => (e.life -= moveDt) > 0);
    }
  }

  uiClock += realDt;
  saveClock += realDt;

  if (uiClock > (document.body.dataset.quality === 'low' ? 0.2 : 0.15)) {
    updateUI();
    uiClock = 0;
  }
  if (saveClock > 4) {
    saveMatch();
    saveClock = 0;
  }

  // FPS Throttling according to Graphics Preset:
  // Low = 30 FPS (33.3ms) -> Keeps weak CPUs cool & responsive
  // Medium = 60 FPS (16.6ms) -> Balanced
  // Medium and High = 60 FPS; simulation timing is independent of the render limit.
  const effQuality = typeof MobileGame !== 'undefined' && MobileGame.getEffectiveQuality ? MobileGame.getEffectiveQuality() : (V.getQuality ? V.getQuality() : 'low');
  const targetFps = effQuality === 'low' ? 30 : 60;
  const minInterval = 1000 / targetFps;

  const renderElapsed=now-lastRenderTime;
  if (renderElapsed >= minInterval - 1) {
    V.render(state, targetId, sourceId);
    V.updateWeather?.(now);
    // Preserve the remainder at 75/120/144 Hz instead of rounding down to every N callbacks.
    lastRenderTime = now - (renderElapsed>=minInterval ? renderElapsed%minInterval : 0);
  }
  requestAnimationFrame(frame);
}

// ----------------------------------------------------
// Initialization
// ----------------------------------------------------
document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&!multiplayerMode&&matchActive&&!state.result){state.paused=true;saveMatch();updateUI()}
  last=performance.now();
});
window.addEventListener('pagehide',saveMatch);
V.init(state);
setupEvents();
if (typeof ResizeObserver !== 'undefined') {
  let lastHud = 0, lastDock = 0;
  const updateLayoutHeights = () => {
    const hudEl = document.querySelector('.game-hud');
    const dockEl = $('gameDock');
    const hud = hudEl ? Math.round(hudEl.getBoundingClientRect().height) : 64;
    const isMobile = window.innerWidth <= 900;
    const isLandscape = window.innerHeight <= 520;
    const baseDock = isLandscape ? 100 : isMobile ? 170 : 76;
    const rawDock = dockEl ? Math.round(dockEl.getBoundingClientRect().height) : baseDock;
    const finalDock = Math.max(baseDock, rawDock);

    if (hud && Math.abs(hud - lastHud) >= 2) {
      document.body.style.setProperty('--hud-height', `${hud}px`);
      lastHud = hud;
    }
    // Only update --dock-height on significant layout changes (e.g. screen rotation / breakpoint),
    // ignoring tiny fluctuations (< 18px) so the battlefield map never rescales or jitters during gameplay
    if (finalDock && Math.abs(finalDock - lastDock) >= 18) {
      document.body.style.setProperty('--dock-height', `${finalDock}px`);
      lastDock = finalDock;
    }
  };

  const resizeControls = new ResizeObserver(() => {
    updateLayoutHeights();
  });
  const hudElem = document.querySelector('.game-hud');
  const dockElem = $('gameDock');
  if (hudElem) resizeControls.observe(hudElem);
  if (dockElem) resizeControls.observe(dockElem);
  window.addEventListener('resize', updateLayoutHeights, { passive: true });
  window.addEventListener('orientationchange', updateLayoutHeights, { passive: true });
  updateLayoutHeights();
}

checkAuthSession();
updateUI();
V.render(state, targetId, sourceId);

if (typeof MobileGame !== 'undefined') {
  MobileGame.init({
    getState: () => state,
    getRole: () => myRole,
    isDragonTargeting: () => dragonTargeting,
    getSource: () => sourceId,
    getSelected: () => targetId ?? 2,
    select: id => {
      const c = state.castles[id];
      if (c.owner === myRole) { sourceId = id; nextSpecialty = null; }
      else targetId = id;
      updateUI();
      V.render(state, targetId, sourceId);
    },
    toast
  });
}

if (window.CrownI18n) {
  window.CrownI18n.onLanguageChange(() => {
    updateUI();
    updateDock();
    syncSetupUI();
    if(lobbyState&&$('roomLobbyDialog').open)updateLobbyUI(lobbyState);
    MobileGame.setQuality();
    updateAuthUI();
    if (typeof updateCareerUI === 'function') updateCareerUI();
  });
}

// Initial Career and Telemetry synchronization
if (typeof updateCareerUI === 'function') updateCareerUI();
if (typeof fetchAndRenderLobbies === 'function') {
  try { fetchAndRenderLobbies(); } catch {}
}

// Check URL query param for instant room joining (e.g. ?room=CRWN-XXXX)
const urlParams = new URLSearchParams(location.search);
const roomParam = urlParams.get('room');

if (roomParam) {
  // Direct room invite! Show Main Menu FIRST as requested by user
  state.paused = true;
  const code = roomParam.trim().toUpperCase();
  if ($('menuJoinInput')) $('menuJoinInput').value = code;
  if ($('inviteRoomCodeText')) $('inviteRoomCodeText').textContent = code;
  if ($('menuInviteBanner')) $('menuInviteBanner').classList.remove('hidden');
  enterMenuMode();
  updateUI();
} else if (!restored || state.time === 0) {
  // Show Main Menu on start
  state.paused = true;
  enterMenuMode();
  updateUI();
} else {
  // Continuing previous session
  enterGameMode();
}

last = performance.now();
requestAnimationFrame(frame);
