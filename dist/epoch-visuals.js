/* Crownfall Epoch Visual Registry & Asset Presentation System
   Preserves all engine simulation logic and roles.
   Renders authentic historical architecture and troop representations for:
   17th Century (Pike & Shot), 18th Century (Line & Gunpowder),
   19th Century (Industrial & Rifle), 20th Century (Mechanized & Concrete).
*/
(function(){
  'use strict';
  const roles = ['soldier', 'archer', 'knight', 'cavalry'];
  const marks = {
    '17th': ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ'],
    '18th': ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ'],
    '19th': ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ'],
    '20th': ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ']
  };

  const meta = {
    '18th': {
      main: [383, 328],
      troop: [384, 284],
      gold: [384, 277],
      small: [379, 252],
      archer: [380, 293],
      knight: [384, 311],
      cavalry: [384, 275],
      elite: [384, 366]
    }
  };

  meta['19th'] = {"main":[380,323],"troop":[378,320],"gold":[365,373],"small":[351,273],"archer":[373,297],"knight":[373,355],"cavalry":[375,311],"elite":[381,367]};

  meta['20th'] = {"main":[362,394],"troop":[378,304],"gold":[355,254],"small":[337,323],"archer":[365,248],"knight":[382,308],"cavalry":[368,257],"elite":[366,393]};

  meta['17th'] = {"main":[335,450],"troop":[312,349],"gold":[337,404],"small":[261,412],"archer":[300,427],"knight":[329,336],"cavalry":[325,331],"elite":[292,519]};

  function figure(type, color, epoch = '18th') {
    const era = epoch === '17th' ? 17 : epoch === '19th' ? 19 : epoch === '20th' ? 20 : 18;
    const shadow = '<ellipse cy="10" rx="9" ry="3.5" fill="#020508" opacity=".7"/>';

    // ==========================================
    // 20th CENTURY (MECHANIZED & STEEL)
    // ==========================================
    if (era === 20) {
      if (type === 'cavalry') {
        // Motorized Armored Scout Car
        return `<g class="epoch-unit epoch-20th motorized">
          <ellipse cy="11" rx="15" ry="4.5" fill="#020508" opacity=".75"/>
          <path d="M-15 5 L-15-2 L-8-6 L5-6 L12-2 L16 1 L16 7 L-15 7 Z" fill="#3f4841" stroke="#161b17" stroke-width="1.2"/>
          <path d="M-6-6 L-2-12 L4-12 L6-6 Z" fill="#2d352f" stroke="#161b17" stroke-width="1"/>
          <line x1="2" y1="-12" x2="2" y2="-22" stroke="#8a9990" stroke-width="1"/>
          <circle cx="2" cy="-22" r="1.5" fill="#ff4444"/>
          <line x1="6" y1="-9" x2="16" y2="-9" stroke="#161b17" stroke-width="2"/>
          <rect x="-11" y="-1" width="16" height="4" fill="${color}" opacity=".9"/>
          <circle cx="-10" cy="7" r="4.5" fill="#181d1a" stroke="#68776e" stroke-width="1.5"/>
          <circle cx="10" cy="7" r="4.5" fill="#181d1a" stroke="#68776e" stroke-width="1.5"/>
          <circle cx="-10" cy="7" r="1.5" fill="#a0afa6"/>
          <circle cx="10" cy="7" r="1.5" fill="#a0afa6"/>
        </g>`;
      }
      if (type === 'knight') {
        // Bunker Stormer (Heavy Flak Armor & Ballistic Shield)
        return `<g class="epoch-unit epoch-20th stormer">
          ${shadow}
          <path class="legs" d="M-3 4 L-4 11 M3 4 L4 11" stroke="#373f38" stroke-width="3" stroke-linecap="round"/>
          <rect x="-5" y="-5" width="10" height="10" rx="1" fill="#444f45" stroke="#19201a"/>
          <rect x="-3" y="-3" width="6" height="6" fill="${color}"/>
          <!-- Helmet & gas mask -->
          <ellipse cx="0" cy="-9" rx="4.5" ry="4" fill="#303731" stroke="#161b17" stroke-width=".8"/>
          <circle cx="-1.5" cy="-8" r="1.2" fill="#78887e"/>
          <circle cx="1.5" cy="-8" r="1.2" fill="#78887e"/>
          <!-- Ballistic Shield -->
          <path d="M-9-8 L-4-8 L-4 8 L-9 5 Z" fill="#222723" stroke="${color}" stroke-width="1.4"/>
          <!-- Submachine Gun -->
          <rect x="2" y="-1" width="12" height="3" fill="#141815"/>
          <rect x="5" y="2" width="2" height="4" fill="#141815"/>
        </g>`;
      }
      if (type === 'archer') {
        // Fire Support Squad (Tripod Heavy Machine Gun)
        return `<g class="epoch-unit epoch-20th firesupport">
          ${shadow}
          <!-- Tripod legs -->
          <path d="M4 10 L8 0 L14 10 M8 0 L10 11" stroke="#252c26" stroke-width="1.8" stroke-linecap="round"/>
          <!-- Gun body and water jacket -->
          <rect x="5" y="-3" width="12" height="4" rx="1" fill="#1c221e" stroke="#0e120f" stroke-width=".8"/>
          <rect x="17" y="-1.5" width="4" height="1" fill="#606c64"/>
          <!-- Gunner crouching -->
          <circle cx="-2" cy="-6" r="3.5" fill="#3a443b" stroke="#1a201b"/>
          <path d="M-6-2 L-1-2 L1 5 L-5 7 Z" fill="${color}" stroke="#1a201b" stroke-width=".8"/>
          <path d="M-2 4 L-5 10 M1 4 L4 9" stroke="#2b332c" stroke-width="2.2" stroke-linecap="round"/>
        </g>`;
      }
      // Soldier: Frontline Infantry
      return `<g class="epoch-unit epoch-20th infantry">
        ${shadow}
        <path class="legs" d="M-2 3 L-3 11 M2 3 L3 11" stroke="#3d463e" stroke-width="2.4" stroke-linecap="round"/>
        <circle cy="-7" r="3" fill="#c4aa8f"/>
        <path d="M-5-9 Q0-14 5-9 Q0-11 -5-9 Z" fill="#3f4b40" stroke="#1a221b" stroke-width=".8"/>
        <path d="M-4-4 H4 L4 4 H-4 Z" fill="${color}" stroke="#1a221b"/>
        <path d="M-4-4 L4 4 M4-4 L-4 4" stroke="#5a685c" stroke-width=".8"/>
        <!-- Service Rifle -->
        <path d="M2 2 L12-14" stroke="#4a3b2c" stroke-width="2.4"/>
        <path d="M10-10 L14-18" stroke="#1a221b" stroke-width="1.5"/>
      </g>`;
    }

    // ==========================================
    // 19th CENTURY (INDUSTRIAL & RIFLE)
    // ==========================================
    if (era === 19) {
      if (type === 'cavalry') {
        // Dragoon Cavalry
        return `<g class="epoch-unit epoch-19th mounted">
          ${shadow}
          <path d="M-13 4 Q-6-3 6 1 L11-8 L15-5 L12 6 H-11 Z" fill="#4a3728" stroke="#1d150e"/>
          <path class="legs" d="M-10 5 L-12 12 M-3 5 L-1 12 M9 5 L12 12" stroke="#2a1e15" stroke-width="2.5" stroke-linecap="round"/>
          <g transform="translate(-1 -7)">
            <circle cy="-8" r="3" fill="#c4aa8f"/>
            <!-- Tall Shako with plume -->
            <path d="M-4-15 H4 L3-9 H-3 Z" fill="#1c252f" stroke="#caa24c" stroke-width=".8"/>
            <circle cx="0" cy="-16" r="1.5" fill="#ff3333"/>
            <path d="M-4-6 H4 L4 3 H-4 Z" fill="${color}" stroke="#131a22"/>
          </g>
          <!-- Curved Sabre -->
          <path d="M5-8 Q16-12 18-22" fill="none" stroke="#d5dcd9" stroke-width="1.6" stroke-linecap="round"/>
        </g>`;
      }
      if (type === 'knight') {
        // Imperial Cuirassier (Heavy Polished Breastplate)
        return `<g class="epoch-unit epoch-19th cuirassier">
          ${shadow}
          <path class="legs" d="M-2 3 L-3 11 M2 3 L4 11" stroke="#222c35" stroke-width="2.5" stroke-linecap="round"/>
          <circle cy="-8" r="3" fill="#c4aa8f"/>
          <!-- Helmet with horsehair crest -->
          <path d="M-4-12 H4 L3-8 H-3 Z" fill="#caa24c" stroke="#684f18" stroke-width=".8"/>
          <path d="M1-13 Q5-16 8-10" fill="none" stroke="#222" stroke-width="2"/>
          <!-- Polished Steel Cuirass -->
          <path d="M-4-5 H4 L3 4 H-3 Z" fill="#9bb3c4" stroke="#485c6d" stroke-width="1.2"/>
          <circle cx="0" cy="-1" r="1.5" fill="${color}"/>
          <!-- Heavy Straight Sword -->
          <line x1="6" y1="5" x2="14" y2="-18" stroke="#cbd7de" stroke-width="2"/>
          <line x1="4" y1="-2" x2="8" y2="-2" stroke="#caa24c" stroke-width="2"/>
        </g>`;
      }
      if (type === 'archer') {
        // Rifle Marksman / Jaeger
        return `<g class="epoch-unit epoch-19th marksman">
          ${shadow}
          <path class="legs" d="M-2 3 L-3 11 M2 3 L3 11" stroke="#2a382e" stroke-width="2.3" stroke-linecap="round"/>
          <circle cy="-7" r="3" fill="#c4aa8f"/>
          <!-- Kepi / Jaeger Cap -->
          <path d="M-4-12 H3 L5-8 H-4 Z" fill="#2d3e32" stroke="#162019" stroke-width=".8"/>
          <path d="M-4-4 H4 L4 4 H-4 Z" fill="${color}" stroke="#162019"/>
          <line x1="-3" y1="-3" x2="3" y2="3" stroke="#caa24c" stroke-width="1"/>
          <!-- Scoped Target Rifle -->
          <path d="M2 2 L12-16" stroke="#4e3b2b" stroke-width="2.4"/>
          <path d="M8-10 L14-22" stroke="#b0bec5" stroke-width="1.5"/>
          <line x1="8" y1="-12" x2="12" y2="-17" stroke="#caa24c" stroke-width="1"/>
        </g>`;
      }
      // Soldier: Regular Line Infantry
      return `<g class="epoch-unit epoch-19th infantry">
        ${shadow}
        <path class="legs" d="M-2 3 L-3 11 M2 3 L3 11" stroke="#2c3742" stroke-width="2.3" stroke-linecap="round"/>
        <circle cy="-8" r="3" fill="#c4aa8f"/>
        <!-- Tall Shako with pom-pom -->
        <path d="M-4-15 H4 L3-9 H-3 Z" fill="#1b242e" stroke="#caa24c" stroke-width=".8"/>
        <circle cx="0" cy="-16" r="1.5" fill="#f0d38d"/>
        <path d="M-4-5 H4 L4 4 H-4 Z" fill="${color}" stroke="#141c24"/>
        <path d="M-3-4 L3 3 M3-4 L-3 3" stroke="#e0e8ea" stroke-width="1.2"/>
        <!-- Musket with Bayonet -->
        <path d="M3 1 L11-16" stroke="#5a4533" stroke-width="2.5"/>
        <path d="M9-12 L14-23" stroke="#b0bec5" stroke-width="1.3"/>
      </g>`;
    }

    // ==========================================
    // 18th CENTURY (LINE & GUNPOWDER)
    // ==========================================
    if (era === 18) {
      if (type === 'cavalry') {
        // Hussar Cavalry
        return `<g class="epoch-unit epoch-18th hussar">
          ${shadow}
          <path d="M-12 3 Q-6-3 5 1 L10-8 L14-5 L11 6 H-10 Z" fill="#5c4837" stroke="#211d19"/>
          <path class="legs" d="M-9 5 L-11 12 M-3 5 L0 12 M9 5 L12 12" stroke="#382c24" stroke-width="2.5" stroke-linecap="round"/>
          <g transform="translate(-2 -7)">
            <circle cy="-8" r="3" fill="#b4a08b"/>
            <!-- Hussar Miter/Shako with plume -->
            <path d="M-4-14 H4 L3-8 H-3 Z" fill="#1e252d" stroke="#ae9a70" stroke-width=".6"/>
            <path d="M0-14 L3-18" stroke="#ff4757" stroke-width="1.5"/>
            <path d="M-4-5 H4 L5 4 H-5 Z" fill="${color}" stroke="#18222a"/>
            <path d="M-3-3 H3 M-3-1 H3 M-3 1 H3" stroke="#e8c977" stroke-width=".8"/>
          </g>
          <path d="M4-12 Q14-15 14-23" fill="none" stroke="#c5c6ba" stroke-width="1.6" stroke-linecap="round"/>
        </g>`;
      }
      if (type === 'knight') {
        // Grenadier Guard (Tall Bearskin/Mitre)
        return `<g class="epoch-unit epoch-18th grenadier">
          ${shadow}
          <path class="legs" d="M-2 3 L-3 11 M2 3 L4 11" stroke="#28323c" stroke-width="2.4" stroke-linecap="round"/>
          <circle cy="-8" r="3" fill="#b4a08b"/>
          <!-- Tall Mitre Cap with Brass Plate -->
          <path d="M-4-8 L-2-17 L2-17 L4-8 Z" fill="#8b2635" stroke="#ae9a70" stroke-width=".8"/>
          <path d="M-2-13 L0-16 L2-13 Z" fill="#ffd700"/>
          <path d="M-4-5 H4 L5 4 H-5 Z" fill="${color}" stroke="#18222a"/>
          <path d="M-3-4 L3 3 M3-4 L-3 3" stroke="#e6e0cc" stroke-width="1"/>
          <!-- Heavy Musket with Bayonet -->
          <path d="M3 1 L11-16" stroke="#5f4936" stroke-width="2.6"/>
          <path d="M8-10 L14-23" stroke="#a1aca9" stroke-width="1.4"/>
          <!-- Grenade pouch -->
          <circle cx="-6" cy="1" r="2.5" fill="#2d3632" stroke="#cca652" stroke-width=".8"/>
        </g>`;
      }
      if (type === 'archer') {
        // Rifle Skirmisher
        return `<g class="epoch-unit epoch-18th skirmisher">
          ${shadow}
          <path class="legs" d="M-2 3 L-3 11 M2 3 L4 11" stroke="#253528" stroke-width="2.4" stroke-linecap="round"/>
          <circle cy="-8" r="3" fill="#b4a08b"/>
          <!-- Slouch hat with cockade -->
          <path d="M-6-9 L-2-12 L4-10 L6-8 Z" fill="#2d3b31" stroke="#ae9a70" stroke-width=".6"/>
          <circle cx="-2" cy="-9" r="1.2" fill="#ffd700"/>
          <path d="M-4-5 H4 L5 4 H-5 Z" fill="${color}" stroke="#18222a"/>
          <line x1="-3" y1="-3" x2="3" y2="3" stroke="#d5c8a8" stroke-width="1"/>
          <path d="M3 1 L11-17" stroke="#4e3b2b" stroke-width="2.6"/>
          <path d="M8-10 L13-22" stroke="#b0bec5" stroke-width="1.2"/>
        </g>`;
      }
      // Soldier: Line Infantry
      return `<g class="epoch-unit epoch-18th infantry">
        ${shadow}
        <path class="legs" d="M-2 3 L-3 11 M2 3 L4 11" stroke="#28323c" stroke-width="2.4" stroke-linecap="round"/>
        <circle cy="-8" r="3" fill="#b4a08b"/>
        <!-- Tricorn Hat -->
        <path d="M-6-9 L-2-13 L1-10 L5-12 L6-8 Z" fill="#22272b" stroke="#ae9a70" stroke-width=".6"/>
        <circle cx="0" cy="-9.5" r="1.2" fill="#fff"/>
        <path d="M-4-5 H4 L5 4 H-5 Z" fill="${color}" stroke="#18222a"/>
        <path d="M-3-4 L3 3 M3-4 L-3 3" stroke="#e6e0cc" stroke-width="1.2"/>
        <!-- Musket with Bayonet -->
        <path d="M3 1 L11-16" stroke="#5f4936" stroke-width="2.6"/>
        <path d="M8-10 L14-22" stroke="#a1aca9" stroke-width="1.4"/>
      </g>`;
    }

    // ==========================================
    // 17th CENTURY (PIKE & SHOT)
    // ==========================================
    if (type === 'cavalry') {
      // Armored Knight on Warhorse
      return `<g class="epoch-unit epoch-17th royal-cavalry">
        ${shadow}
        <!-- Warhorse with barding -->
        <path d="M-13 3 Q-6-4 6 1 L11-8 L15-5 L12 6 H-11 Z" fill="#3b2b1e" stroke="#18110a"/>
        <path class="legs" d="M-10 5 L-12 12 M-3 5 L0 12 M9 5 L12 12" stroke="#241910" stroke-width="2.6" stroke-linecap="round"/>
        <path d="M-5 2 L4 2 L3 7 L-4 7 Z" fill="${color}" opacity=".85"/>
        <g transform="translate(-1 -7)">
          <circle cy="-8" r="3" fill="#b4a08b"/>
          <!-- Visored Bascinet -->
          <path d="M-4-13 H4 L3-7 H-3 Z" fill="#9aa8b2" stroke="#485864" stroke-width=".8"/>
          <path d="M-4-5 H4 L4 3 H-4 Z" fill="#8898a3" stroke="#33424d" stroke-width="1"/>
        </g>
        <!-- Upright Knight Lance with Pennant -->
        <line x1="5" y1="8" x2="12" y2="-28" stroke="#5a4533" stroke-width="2.4"/>
        <polygon points="12,-28 10,-32 14,-32" fill="#c0ccd4"/>
        <path d="M12-28 L22-26 L12-22 Z" fill="${color}"/>
      </g>`;
    }
    if (type === 'knight') {
      // Armored Pikeman
      return `<g class="epoch-unit epoch-17th pikeman">
        ${shadow}
        <path class="legs" d="M-2 3 L-3 11 M2 3 L4 11" stroke="#222c34" stroke-width="2.4" stroke-linecap="round"/>
        <circle cy="-8" r="3" fill="#b4a08b"/>
        <!-- Morion Steel Helmet -->
        <path d="M-5-9 Q0-15 5-9 Q0-12 -5-9 Z" fill="#9bb3c2" stroke="#475b6a" stroke-width=".8"/>
        <path d="M-1-14 Q0-17 2-14 Z" fill="#ffd700"/>
        <!-- Steel Breastplate -->
        <path d="M-4-5 H4 L3 4 H-3 Z" fill="#8a9ca8" stroke="#384955" stroke-width="1.2"/>
        <circle cx="0" cy="-1" r="1.5" fill="${color}"/>
        <!-- Long Upright Pike -->
        <line x1="6" y1="8" x2="8" y2="-30" stroke="#68523c" stroke-width="2.2"/>
        <polygon points="8,-30 6,-34 10,-34" fill="#d2dde3"/>
        <path d="M8-28 L14-26 L8-24 Z" fill="${color}"/>
      </g>`;
    }
    if (type === 'archer') {
      // Arquebusier / Longbowman
      return `<g class="epoch-unit epoch-17th arquebusier">
        ${shadow}
        <path class="legs" d="M-2 3 L-3 11 M2 3 L3 11" stroke="#382e22" stroke-width="2.3" stroke-linecap="round"/>
        <circle cy="-7" r="3" fill="#b4a08b"/>
        <!-- Peaked leather hat -->
        <path d="M-5-8 Q0-14 5-8 Q0-10 -5-8 Z" fill="#4a3726" stroke="#22180e" stroke-width=".8"/>
        <path d="M-4-4 H4 L4 4 H-4 Z" fill="${color}" stroke="#1c160f"/>
        <!-- Matchlock Gun & Rest -->
        <line x1="2" y1="4" x2="11" y2="-18" stroke="#5a422d" stroke-width="2.5"/>
        <line x1="9" y1="-12" x2="13" y2="-21" stroke="#90a0a8" stroke-width="1.4"/>
        <circle cx="-5" cy="1" r="2" fill="#cca652" stroke="#4a3726" stroke-width=".6"/>
      </g>`;
    }
    // Soldier: Foot Soldier
    return `<g class="epoch-unit epoch-17th foot-soldier">
      ${shadow}
      <path class="legs" d="M-2 3 L-3 11 M2 3 L3 11" stroke="#2d352e" stroke-width="2.3" stroke-linecap="round"/>
      <circle cy="-8" r="3" fill="#b4a08b"/>
      <!-- Kettle Hat / Morion -->
      <path d="M-5-9 Q0-15 5-9 Q0-11 -5-9 Z" fill="#8fa2af" stroke="#3c4c58" stroke-width=".8"/>
      <!-- Buff Doublet & Sash -->
      <path d="M-4-5 H4 L4 4 H-4 Z" fill="#7a6549" stroke="#251e14"/>
      <path d="M-4-4 L4 4" stroke="${color}" stroke-width="2"/>
      <!-- Broadsword / Halberd -->
      <line x1="5" y1="6" x2="11" y2="-16" stroke="#5a432e" stroke-width="2.4"/>
      <path d="M9-12 L14-20" stroke="#b0bec7" stroke-width="1.4"/>
    </g>`;
  }

  function icon(type, epoch) {
    return `<svg class="epoch-unit-icon" viewBox="-18 -32 38 48" aria-hidden="true">${figure(type, '#d6be85', epoch)}</svg>`;
  }

  function syncUI(epoch) {
    document.body.dataset.epoch = epoch;
    for (const type of roles) {
      const b = document.querySelector(`[data-troop="${type}"]`);
      if (!b) continue;
      const info = CrownEngine.getTroopRoleInfo(epoch, type);
      b.title = `${info.name} · ${info.role}\n${info.desc || ''}`;
      b.setAttribute('aria-label', `${info.name}, ${info.role}`);
      const el = b.querySelector('.chip-icon');
      if (el && el.dataset.epoch !== epoch) {
        el.innerHTML = icon(type, epoch);
        el.dataset.epoch = epoch;
      }
    }
  }

  window.CrownEpochVisuals = Object.freeze({
    meta,
    figure,
    icon,
    syncUI,
    mark: (type, epoch) => marks[epoch || '18th'][roles.indexOf(type)]
  });
})();
