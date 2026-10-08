(function () {
  'use strict';
  const E = CrownEngine;
  const Style = CrownMapStyle;
  const escapeText = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const NS = 'http://www.w3.org/2000/svg';
  const colors = Style.factions;
  const badgeStrokes = { blue: '#5c96c4', red: '#b85454', green: '#5ea374', purple: '#9c70b8', neutral: '#6b7f8c' };
  const $ = id => document.getElementById(id);
  const cache = new Map(), castleDetails = new Map();
  let previewKey = '';
  const setText = (node, value) => { if (node && node.textContent !== value) node.textContent = value; };
  const setHTML = (node, value) => { if (node && node.innerHTML !== value) node.innerHTML = value; };
  const setAttr = (node, name, value) => { const text=String(value); if(node.getAttribute(name)!==text)node.setAttribute(name,text); };
  const marching = new Map();
  const battleNodes = new Map(), effectNodes = new Map();
  let dragonVisualKey='', dragonParts=null;
  let ownershipKey = '';
  let visualEpoch='18th';
  let labelGeneration=0;
  let qualityLevel = 'low'; // 'low', 'medium', 'high'
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const MAP_VISUALS = [
    // 0: The Verdant Isles (2 Players)
    {
      land: 'M92 177Q104 126 160 132L207 111Q242 99 278 114L316 88Q353 84 383 104L434 87Q470 91 498 111L548 98Q577 116 607 105L647 95 691 110Q731 93 763 117L812 106 843 129 883 119Q923 116 938 150L966 164 965 196 996 220 988 250 1017 274Q1035 313 1012 342L1029 382 1009 417 1020 454 997 482 1005 520Q993 558 957 569L931 601 892 604 867 630 831 632Q804 676 763 677L730 696 691 685 654 716 607 712 577 731 528 716 487 732 447 711 410 715 368 692 334 710 295 693 262 703 231 678 201 665 181 640 145 638 131 608 105 590 107 562 82 540 88 511 62 484 75 451 57 416 76 381 60 352 68 315 54 285 73 255 68 222 87 202Z',
      river: 'M610 99Q584 162 628 218T641 316Q668 357 623 400T650 479Q700 521 673 579T699 710',
      structures: `<g stroke="#725f42" stroke-width="3"><path d="M608 371l47 5M657 550l36 10"/></g><g stroke="#d4b978" stroke-width="10"><path d="M609 367l45 5M658 546l36 10"/></g><g stroke="#786f4e" stroke-width="1.5"><path d="m617 363-1 12m9-11-1 12m9-11-1 12m9-11-1 12m23 165-3 12m10-10-3 12m10-10-3 12"/></g>`,
      roads: `<g class="strategic-roads" pointer-events="none"><path d="M150 373L550 370L950 373" stroke="#ffdea5" stroke-width="5" stroke-dasharray="7 6" fill="none" opacity=".55"/><path d="M150 373Q230 645 550 645Q870 645 950 373" stroke="#efdaa4" stroke-width="4" stroke-dasharray="4 8" fill="none" opacity=".4"/><g transform="translate(550 370)"><rect x="-23" y="-10" width="46" height="20" rx="3" fill="#bd9a62" stroke="#604628" stroke-width="3"/><path d="M-15-9V9M-5-9V9M5-9V9M15-9V9" stroke="#7d5835" stroke-width="2"/><text y="-21" text-anchor="middle" fill="#fff2c9" stroke="#254534" paint-order="stroke" stroke-width="3" font-size="10">CROWN BRIDGE</text></g><text x="550" y="669" text-anchor="middle" fill="#fff2c9" stroke="#254534" paint-order="stroke" stroke-width="3" font-size="10">COASTAL DETOUR</text></g>`
    },
    // 1: Crossroads of Kings (2 Players)
    {
      land: 'M80 150Q120 90 250 85L480 85Q510 120 505 320L310 325Q120 330 85 300Z M595 85L850 85Q980 90 1020 150L1015 300Q980 330 790 325L595 320Z M85 460Q120 430 310 435L505 440Q510 640 480 675L250 675Q120 670 80 610Z M595 440L790 435Q980 430 1015 460L1020 610Q980 670 850 675L595 675Z M480 380A70 70 0 1 0 620 380A70 70 0 1 0 480 380Z',
      river: 'M550 70L550 700 M70 380L1030 380',
      structures: `<g stroke="#d4b978" stroke-width="12"><path d="M550 310L550 340 M550 420L550 450 M440 380L480 380 M620 380L660 380"/></g><g stroke="#5d4037" stroke-width="3"><path d="M544 310v30m12-30v30M544 420v30m12-30v30M440 374h40m-40 12h40M620 374h40m-40 12h40"/></g>`,
      roads: `<g class="strategic-roads" pointer-events="none"><path d="M140 380L550 380L960 380" stroke="#ffdea5" stroke-width="5" stroke-dasharray="7 6" fill="none" opacity=".55"/><path d="M550 110L550 380L550 650" stroke="#ffdea5" stroke-width="4" stroke-dasharray="6 6" fill="none" opacity=".5"/><g transform="translate(550 380)"><circle r="42" fill="#2d5248" stroke="#f0d28d" stroke-width="3"/><text y="-52" text-anchor="middle" fill="#fff2c9" stroke="#254534" paint-order="stroke" stroke-width="3" font-size="11">IMPERIAL CITADEL</text></g><text x="550" y="225" text-anchor="middle" fill="#fff2c9" stroke="#254534" paint-order="stroke" stroke-width="3" font-size="9">NORTH BRIDGE</text><text x="550" y="555" text-anchor="middle" fill="#fff2c9" stroke="#254534" paint-order="stroke" stroke-width="3" font-size="9">SOUTH BRIDGE</text></g>`
    },
    // 2: Archipelago of Three Bridges (2 Players)
    {
      land: 'M90 140Q130 90 280 85L470 95Q460 270 480 370Q455 490 470 665L280 675Q130 670 90 620L75 380Z M1010 140Q970 90 820 85L630 95Q640 270 620 370Q645 490 630 665L820 675Q970 670 1010 620L1025 380Z M505 200A45 35 0 1 0 595 200A45 35 0 1 0 505 200Z M500 380A50 45 0 1 0 600 380A50 45 0 1 0 500 380Z M505 580A45 35 0 1 0 595 580A45 35 0 1 0 505 580Z',
      river: 'M550 80L550 680',
      structures: `<g stroke="#d4b978" stroke-width="10"><path d="M465 200L635 200 M465 380L635 380 M465 580L635 580"/></g><g stroke="#5d4037" stroke-width="2"><path d="M465 195h170m-170 10h170M465 375h170m-170 10h170M465 575h170m-170 10h170"/></g>`,
      roads: `<g class="strategic-roads" pointer-events="none"><path d="M130 380L420 190L680 190L970 380" stroke="#ffdea5" stroke-width="4" stroke-dasharray="6 6" fill="none" opacity=".5"/><path d="M130 380L970 380" stroke="#ffdea5" stroke-width="5" stroke-dasharray="7 6" fill="none" opacity=".55"/><path d="M130 380L420 570L680 570L970 380" stroke="#ffdea5" stroke-width="4" stroke-dasharray="6 6" fill="none" opacity=".5"/><text x="550" y="175" text-anchor="middle" fill="#fff2c9" stroke="#254534" paint-order="stroke" stroke-width="3" font-size="10">NORTH CHANNEL BRIDGE</text><text x="550" y="360" text-anchor="middle" fill="#fff2c9" stroke="#254534" paint-order="stroke" stroke-width="3" font-size="10">GREAT CENTER BRIDGE</text><text x="550" y="605" text-anchor="middle" fill="#fff2c9" stroke="#254534" paint-order="stroke" stroke-width="3" font-size="10">SOUTH REEF BRIDGE</text></g>`
    },
    // 3: The Iron Gorge (2 Players)
    {
      land: 'M85 160Q120 90 280 85L500 100Q520 220 520 250Q480 380 520 510Q520 540 500 660L280 675Q120 670 85 600Z M1015 160Q980 90 820 85L600 100Q580 220 580 250Q620 380 580 510Q580 540 600 660L820 675Q980 670 1015 600Z',
      river: '',
      structures: `<g fill="#37474f" stroke="#263238" stroke-width="2"><polygon points="550,280 525,380 575,380"/><polygon points="550,330 515,480 585,480"/><polygon points="550,290 530,340 570,340"/><polygon points="550,420 520,490 580,490"/><text x="550" y="390" text-anchor="middle" fill="#b0bec5" font-size="9" font-weight="900" letter-spacing="2">IRON CRAGS</text></g><g stroke="#d4b978" stroke-width="12"><path d="M500 230L600 230 M500 530L600 530"/></g><g stroke="#3e2723" stroke-width="3"><path d="M500 224h100m-100 12h100M500 524h100m-100 12h100"/></g>`,
      roads: `<g class="strategic-roads" pointer-events="none"><path d="M135 380L420 230L680 230L965 380" stroke="#ffdea5" stroke-width="5" stroke-dasharray="7 6" fill="none" opacity=".55"/><path d="M135 380L420 530L680 530L965 380" stroke="#ffdea5" stroke-width="5" stroke-dasharray="7 6" fill="none" opacity=".55"/><text x="550" y="210" text-anchor="middle" fill="#fff2c9" stroke="#254534" paint-order="stroke" stroke-width="3" font-size="10">DRAGON GATE PASS</text><text x="550" y="555" text-anchor="middle" fill="#fff2c9" stroke="#254534" paint-order="stroke" stroke-width="3" font-size="10">IRON GATE PASS</text></g>`
    },
    // 4: The Sunken Atoll (2 Players)
    {
      land: 'M100 380C100 160 300 70 550 70C800 70 1000 160 1000 380C1000 600 800 690 550 690C300 690 100 600 100 380Z',
      river: '',
      structures: `<ellipse cx="550" cy="380" rx="225" ry="160" fill="#0c3552" stroke="#1c5d80" stroke-width="8"/><ellipse cx="550" cy="380" rx="225" ry="160" fill="none" stroke="#68d8d6" stroke-width="3" opacity=".3"/><text x="550" y="385" text-anchor="middle" fill="#7ad4db" opacity=".6" font-size="11" font-weight="800" letter-spacing="3">SUNKEN CALDERA</text>`,
      roads: `<g class="strategic-roads" pointer-events="none"><path d="M130 380Q550 90 970 380" stroke="#ffdea5" stroke-width="5" stroke-dasharray="7 6" fill="none" opacity=".55"/><path d="M130 380Q550 670 970 380" stroke="#ffdea5" stroke-width="5" stroke-dasharray="7 6" fill="none" opacity=".55"/><text x="550" y="95" text-anchor="middle" fill="#fff2c9" stroke="#254534" paint-order="stroke" stroke-width="3" font-size="10">NORTHERN RIM ROAD</text><text x="550" y="685" text-anchor="middle" fill="#fff2c9" stroke="#254534" paint-order="stroke" stroke-width="3" font-size="10">SOUTHERN RIM ROAD</text></g>`
    },
    // 5: Tri-Island Caldera (3 Players: SW, SE, North)
    {
      land: 'M120 590Q90 400 230 340L450 360Q470 500 450 660L230 675Q130 670 120 590Z M980 590Q1010 400 870 340L650 360Q630 500 650 660L870 675Q970 670 980 590Z M330 140Q350 85 550 80Q750 85 770 140L750 310Q550 330 350 310Z M480 400A65 65 0 1 0 620 400A65 65 0 1 0 480 400Z',
      river: 'M550 310L550 710 M120 380L980 380',
      structures: `<g stroke="#d4b978" stroke-width="11"><path d="M420 370L480 390 M680 370L620 390 M550 310L550 360"/></g><g stroke="#5d4037" stroke-width="2.5"><path d="M420 366l60 20 M680 366l-60 20 M544 310v50m12-50v50"/></g>`,
      roads: `<g class="strategic-roads" pointer-events="none"><path d="M200 580L550 400L900 580" stroke="#ffdea5" stroke-width="5" stroke-dasharray="7 6" fill="none" opacity=".55"/><path d="M550 150L550 400" stroke="#ffdea5" stroke-width="5" stroke-dasharray="7 6" fill="none" opacity=".55"/><g transform="translate(550 400)"><circle r="38" fill="#1b3b3a" stroke="#ffd700" stroke-width="3"/><text y="-46" text-anchor="middle" fill="#fff2c9" stroke="#254534" paint-order="stroke" stroke-width="3" font-size="11">TRI-CROWN CITADEL</text></g><text x="350" y="375" text-anchor="middle" fill="#fff2c9" stroke="#254534" paint-order="stroke" stroke-width="3" font-size="9">WEST SPUR</text><text x="750" y="375" text-anchor="middle" fill="#fff2c9" stroke="#254534" paint-order="stroke" stroke-width="3" font-size="9">EAST SPUR</text><text x="550" y="330" text-anchor="middle" fill="#fff2c9" stroke="#254534" paint-order="stroke" stroke-width="3" font-size="9">NORTH SPUR</text></g>`
    },
    // 6: Delta of Three Warlords (3 Players)
    {
      land: 'M100 480Q110 250 280 200L460 240Q480 420 460 630L260 650Q100 620 100 480Z M1000 480Q990 250 820 200L640 240Q620 420 640 630L840 650Q1000 620 1000 480Z M330 140Q380 80 550 75Q720 80 770 140L730 250Q550 260 370 250Z M480 410A60 60 0 1 0 620 410A60 60 0 1 0 480 410Z',
      river: 'M550 250L550 720 M120 400L980 400',
      structures: `<g stroke="#d4b978" stroke-width="10"><path d="M440 370L490 400 M660 370L610 400 M550 250L550 350"/></g>`,
      roads: `<g class="strategic-roads" pointer-events="none"><path d="M170 490L550 410L930 490" stroke="#ffdea5" stroke-width="5" stroke-dasharray="7 6" fill="none" opacity=".55"/><path d="M550 160L550 410" stroke="#ffdea5" stroke-width="5" stroke-dasharray="7 6" fill="none" opacity=".55"/><g transform="translate(550 410)"><circle r="36" fill="#1b3b3a" stroke="#ffd700" stroke-width="3"/><text y="-44" text-anchor="middle" fill="#fff2c9" stroke="#254534" paint-order="stroke" stroke-width="3" font-size="11">DELTA BASTION</text></g></g>`
    },
    // 7: Crossroads of Four Kings (4 Players: NW, NE, SW, SE)
    {
      land: 'M90 150Q120 90 250 85L470 85Q490 130 480 320L280 325Q120 330 90 280Z M630 85L850 85Q980 90 1010 150L1010 280Q980 330 820 325L620 320Z M90 470Q120 440 280 445L480 450Q490 640 470 675L250 675Q120 670 90 610Z M620 450L820 445Q980 440 1010 470L1010 610Q980 670 850 675L630 675Z M470 380A80 80 0 1 0 630 380A80 80 0 1 0 470 380Z',
      river: 'M550 60L550 710 M70 380L1030 380',
      structures: `<g stroke="#d4b978" stroke-width="12"><path d="M550 300L550 340 M550 420L550 460 M430 380L470 380 M630 380L670 380"/></g><g stroke="#5d4037" stroke-width="3"><path d="M544 300v40m12-40v40M544 420v40m12-40v40M430 374h40m-40 12h40M630 374h40m-40 12h40"/></g>`,
      roads: `<g class="strategic-roads" pointer-events="none"><path d="M170 180L550 380L930 180" stroke="#ffdea5" stroke-width="4" stroke-dasharray="6 6" fill="none" opacity=".5"/><path d="M170 580L550 380L930 580" stroke="#ffdea5" stroke-width="4" stroke-dasharray="6 6" fill="none" opacity=".5"/><path d="M170 180L170 580 M930 180L930 580" stroke="#efdaa4" stroke-width="3" stroke-dasharray="4 8" fill="none" opacity=".35"/><g transform="translate(550 380)"><circle r="44" fill="#2d5248" stroke="#ffd700" stroke-width="3.5"/><text y="-54" text-anchor="middle" fill="#fff2c9" stroke="#254534" paint-order="stroke" stroke-width="3" font-size="11">IMPERIAL CITADEL</text></g><text x="550" y="240" text-anchor="middle" fill="#fff2c9" stroke="#254534" paint-order="stroke" stroke-width="3" font-size="9">NORTH PASS</text><text x="550" y="530" text-anchor="middle" fill="#fff2c9" stroke="#254534" paint-order="stroke" stroke-width="3" font-size="9">SOUTH PASS</text><text x="350" y="375" text-anchor="middle" fill="#fff2c9" stroke="#254534" paint-order="stroke" stroke-width="3" font-size="9">WEST PASS</text><text x="750" y="375" text-anchor="middle" fill="#fff2c9" stroke="#254534" paint-order="stroke" stroke-width="3" font-size="9">EAST PASS</text></g>`
    },
    // 8: Four Realms Atoll (4 Players: 4 Cardinal Fortresses)
    {
      land: 'M100 380C100 150 280 65 550 65C820 65 1000 150 1000 380C1000 610 820 695 550 695C280 695 100 610 100 380Z',
      river: '',
      structures: `<ellipse cx="550" cy="380" rx="220" ry="155" fill="#0a2e47" stroke="#1c5d80" stroke-width="8"/><ellipse cx="550" cy="380" rx="220" ry="155" fill="none" stroke="#68d8d6" stroke-width="3" opacity=".3"/><g transform="translate(550 380)"><circle r="36" fill="#1b3b3a" stroke="#ffd700" stroke-width="2.5"/><text y="5" text-anchor="middle" fill="#fff2c9" font-size="10" font-weight="800">OCEAN SHRINE</text></g>`,
      roads: `<g class="strategic-roads" pointer-events="none"><path d="M130 380Q550 80 970 380Q550 680 130 380" stroke="#ffdea5" stroke-width="5" stroke-dasharray="7 6" fill="none" opacity=".55"/><text x="550" y="95" text-anchor="middle" fill="#fff2c9" stroke="#254534" paint-order="stroke" stroke-width="3" font-size="10">NORTH CARDINAL ROUTE</text><text x="550" y="675" text-anchor="middle" fill="#fff2c9" stroke="#254534" paint-order="stroke" stroke-width="3" font-size="10">SOUTH CARDINAL ROUTE</text></g>`
    },
    // 9: Europe 1805 (Napoleonic Era - 2 Players)
    {
      land: 'M70 180Q130 90 280 80L520 75Q680 70 820 85L980 120Q1020 220 1010 380Q1020 540 980 640L820 675Q680 690 520 685L280 680Q130 670 70 580L60 380Z',
      river: 'M520 75Q480 250 540 380T510 685',
      structures: `<g stroke="#455a64" stroke-width="3"><path d="M490 340l60 20M490 420l60-20"/></g><g fill="#2c3e50"><text x="550" y="210" text-anchor="middle" fill="#d0dbe5" font-size="10" font-weight="800">RHINE CROSSING</text><text x="550" y="590" text-anchor="middle" fill="#d0dbe5" font-size="10" font-weight="800">DANUBE GORGE</text></g>`,
      roads: `<g class="strategic-roads" pointer-events="none"><path d="M140 380L550 380L960 380" stroke="#f4d03f" stroke-width="5" stroke-dasharray="8 6" fill="none" opacity=".6"/><path d="M140 380Q550 180 960 380" stroke="#e67e22" stroke-width="4" stroke-dasharray="5 7" fill="none" opacity=".5"/><path d="M140 380Q550 580 960 380" stroke="#e67e22" stroke-width="4" stroke-dasharray="5 7" fill="none" opacity=".5"/><text x="550" y="365" text-anchor="middle" fill="#fff2c9" stroke="#254534" paint-order="stroke" stroke-width="3" font-size="10">GRAND IMPERIAL HIGHWAY</text></g>`
    },
    // 10: Empires of the Orient (3 Players)
    {
      land: 'M110 560Q80 380 240 320L460 340Q480 480 460 640L240 660Q120 650 110 560Z M970 560Q1000 380 840 320L620 340Q600 480 620 640L840 660Q960 650 970 560Z M330 130Q360 70 550 65Q740 70 770 130L740 290Q550 310 360 290Z M470 390A75 75 0 1 0 630 390A75 75 0 1 0 470 390Z',
      river: 'M550 290L550 710 M110 360L970 360',
      structures: `<g stroke="#d4b978" stroke-width="12"><path d="M430 350L490 380 M670 350L610 380 M550 290L550 340"/></g><g fill="#c0392b"><text x="550" y="340" text-anchor="middle" fill="#ffd700" font-size="11" font-weight="900">GREAT WALL BASTION</text></g>`,
      roads: `<g class="strategic-roads" pointer-events="none"><path d="M180 560L550 390L920 560" stroke="#f1c40f" stroke-width="5" stroke-dasharray="7 6" fill="none" opacity=".55"/><path d="M550 150L550 390" stroke="#f1c40f" stroke-width="5" stroke-dasharray="7 6" fill="none" opacity=".55"/><g transform="translate(550 390)"><circle r="42" fill="#801313" stroke="#ffd700" stroke-width="3"/><text y="5" text-anchor="middle" fill="#fff" font-size="11" font-weight="900">DYNASTY KEEP</text></g></g>`
    }
  ];

  /* =========================================================================
     BUILDING SVG GENERATOR
     Produces authentic historical architecture per era while maintaining
     consistent gameplay role recognition at mobile scale.
     ========================================================================= */
  function building(type, owner, level = 1, specialty = 'balanced', epoch = '18th') {
    return CrownArmyArt.structure(type, owner, level, epoch);
  }
  function legacyBuilding(type, owner, level = 1, specialty = 'balanced', epoch = '18th') {
    const accent = E.TYPES[type] ? E.TYPES[type].color : '#359ef5';
    const ownerColor = owner ? colors[owner] : '#acbeb6';
    const roof = Style.palette.roof;
    const isTower = type === 'archer';
    const small = type === 'small';
    const elite = type === 'elite';

    const specAura = owner && specialty === 'military' ?
      `<ellipse cy="20" rx="50" ry="26" fill="none" stroke="#ff4757" stroke-width="2.5" stroke-dasharray="6 4" opacity=".85"/><g transform="translate(26, -32)"><circle r="9" fill="#800f2f" stroke="#ff4d6d" stroke-width="1.5"/><path d="M-4-4l8 8M4-4l-8 8" stroke="#fff" stroke-width="1.6"/></g>` :
      owner && specialty === 'economy' ?
      `<ellipse cy="20" rx="50" ry="26" fill="none" stroke="#ffd166" stroke-width="2.5" stroke-dasharray="6 4" opacity=".85"/><g transform="translate(26, -32)"><circle r="9" fill="#7f4f24" stroke="#ffc300" stroke-width="1.5"/><circle r="5.5" fill="#f4a261" stroke="#e76f51" stroke-width=".8"/><text y="3.5" text-anchor="middle" fill="#fff" font-size="8.5" font-weight="900" font-family="'Outfit', sans-serif">G</text></g>` : '';

    const ownershipFlag = (x, y, h) => owner ?
      `<path d="M${x} ${y}v${-h}" stroke="#e0e0e0" stroke-width="2"/><path d="M${x} ${y-h}l18 6-18 6Z" fill="${ownerColor}" stroke="#fff" stroke-width=".6"/>` :
      `<path d="M${x} ${y}v${-h}" stroke="#888" stroke-width="1.6"/><path d="M${x} ${y-h}l14 5-14 5Z" fill="#9e9e9e" stroke="#fff" stroke-width=".5"/>`;

    // 17th CENTURY: Stone masonry, crenellated keeps, watch posts, slate roofs
    if (epoch === '17th') {
      let core = '';
      if (type === 'main' || elite) {
        core = `<path d="M-30-10L0-28L30-10V18L0 34L-30 18Z" fill="#8e9a8b" stroke="#5d665a" stroke-width="1.2"/>
          <path d="M0-28L30-10V18L0 34Z" fill="#717c6e"/>
          <path d="M-32-12L-32-26L-26-26L-26-20L-16-20L-16-26L-10-26L-10-20L0-28L10-20L10-26L16-26L16-20L26-20L26-26L32-26L32-12Z" fill="#b0bba7"/>
          <path d="M-18-28L0-56L18-28Z" fill="${roof}" stroke="#333" stroke-width="1"/>
          <rect x="-7" y="10" width="14" height="20" rx="3" fill="#2d2218" stroke="#a4784a" stroke-width="1.5"/>
          ${ownershipFlag(0, -56, 24)}`;
      } else if (isTower) {
        core = `<cylinder cx="0" cy="0"/>
          <path d="M-16-28L0-38L16-28V16L0 26L-16 16Z" fill="#849182" stroke="#4e574d" stroke-width="1.2"/>
          <circle cx="0" cy="-38" r="16" fill="#a4b39e"/>
          <path d="M-14-38L0-68L14-38Z" fill="${roof}" stroke="#222" stroke-width="1"/>
          <circle cx="0" cy="-68" r="3" fill="#ffd700"/>
          ${ownershipFlag(0, -68, 20)}`;
      } else if (type === 'knight') {
        core = `<path d="M-26-15L0-30L26-15V16L0 28L-26 16Z" fill="#7a8575" stroke="#4c5549" stroke-width="1.4"/>
          <path d="M-28-15V-32L-20-32V-24L-10-24V-32L0-32L10-32V-24L20-24V-32L28-32V-15Z" fill="#9da897"/>
          <path d="M-15-18L0-44L15-18Z" fill="#a42f43" stroke="#f0b2a1" stroke-width="1"/>
          <rect x="-8" y="6" width="16" height="18" fill="#1b242a" stroke="#d5dbdb" stroke-width="1.5"/>
          ${ownershipFlag(0, -44, 20)}`;
      } else if (type === 'cavalry') {
        core = `<path d="M-28-10L0-24L28-10V14L0 26L-28 14Z" fill="#785942" stroke="#483324" stroke-width="1.2"/>
          <path d="M-30-12L0-34L30-12L0 8Z" fill="#a67c52" stroke="#5c3f26"/>
          <circle cx="0" cy="-6" r="6" fill="#fcf3cf" stroke="#6e2c00" stroke-width="1.5"/>
          ${ownershipFlag(20, -12, 22)}`;
      } else if (type === 'gold') {
        core = `<path d="M-24-12L0-28L24-12V14L0 26L-24 14Z" fill="#8f7b57" stroke="#5a4c33" stroke-width="1.2"/>
          <path d="M-26-14L0-42L26-14Z" fill="#f1c40f" stroke="#b7950b" stroke-width="1.5"/>
          <circle cx="0" cy="-12" r="5" fill="#f9e79f" stroke="#b7950b"/>
          ${ownershipFlag(0, -42, 20)}`;
      } else {
        core = `<path d="M-22-8L0-22L22-8V14L0 24L-22 14Z" fill="#8e9a8b" stroke="#5a6557" stroke-width="1"/>
          <path d="M-24-10L0-32L24-10Z" fill="${roof}" stroke="#444"/>
          ${ownershipFlag(0, -32, 18)}`;
      }
      return `<g class="castle-model epoch-17th">
        <ellipse cy="20" rx="46" ry="18" fill="#14261b" opacity=".35"/>
        <ellipse cy="16" rx="44" ry="22" fill="${ownerColor}" opacity="${owner ? '.24' : '.08'}"/>
        <ellipse cy="16" rx="43" ry="21" fill="none" stroke="${ownerColor}" stroke-width="${owner ? 3 : 1}" opacity=".95"/>
        ${specAura}
        ${core}
        ${Array.from({length:level},(_,i)=>`<path d="m${-6+(i-(level-1)/2)*10} 34 2-3 2 3 3 1-3 2-2 3-1-3-3-2Z" fill="#f5d479"/>`).join('')}
      </g>`;
    }

    // 19th CENTURY: Industrial brick, ironclad casemates, steam chimneys, artillery
    if (epoch === '19th') {
      let core = '';
      if (type === 'main' || elite) {
        core = `<rect x="-28" y="-18" width="56" height="38" rx="4" fill="#6d4c41" stroke="#3e2723" stroke-width="1.5"/>
          <rect x="-24" y="-36" width="48" height="20" rx="3" fill="#455a64" stroke="#263238" stroke-width="1.2"/>
          <path d="M-26-36L0-56L26-36Z" fill="${roof}" stroke="#1a252c" stroke-width="1.2"/>
          <rect x="-18" y="-52" width="6" height="18" fill="#2c3437"/><circle cx="-15" cy="-56" r="3" fill="#90a4ae" opacity=".6"/>
          <rect x="-8" y="4" width="16" height="16" fill="#1c252a" stroke="#78909c" stroke-width="1.2"/>
          ${ownershipFlag(18, -36, 26)}`;
      } else if (isTower) {
        core = `<rect x="-18" y="-28" width="36" height="46" rx="3" fill="#546e7a" stroke="#263238" stroke-width="1.4"/>
          <path d="M-20-28L0-50L20-28Z" fill="#37474f" stroke="#1c282e" stroke-width="1"/>
          <line x1="-12" y1="-12" x2="-22" y2="-16" stroke="#212121" stroke-width="4"/>
          <line x1="12" y1="-12" x2="22" y2="-16" stroke="#212121" stroke-width="4"/>
          ${ownershipFlag(0, -50, 20)}`;
      } else if (type === 'knight') {
        core = `<rect x="-26" y="-22" width="52" height="40" rx="4" fill="#455a64" stroke="#263238" stroke-width="1.5"/>
          <path d="M-28-22L-15-38L15-38L28-22Z" fill="#78909c" stroke="#37474f" stroke-width="1.2"/>
          <rect x="-10" y="-12" width="20" height="28" fill="#212121" stroke="#cfd8dc" stroke-width="1.4"/>
          ${ownershipFlag(0, -38, 22)}`;
      } else if (type === 'cavalry') {
        core = `<rect x="-26" y="-16" width="52" height="34" rx="3" fill="#5d4037" stroke="#3e2723" stroke-width="1.4"/>
          <path d="M-28-16L0-32L28-16Z" fill="#8d6e63" stroke="#4e342e" stroke-width="1.2"/>
          <line x1="0" y1="-32" x2="0" y2="-52" stroke="#555" stroke-width="1.5"/>
          <circle cx="0" cy="-52" r="3" fill="#ffb300"/>
          ${ownershipFlag(20, -16, 22)}`;
      } else if (type === 'gold') {
        core = `<rect x="-25" y="-16" width="50" height="34" rx="3" fill="#8d6e63" stroke="#4e342e" stroke-width="1.4"/>
          <path d="M-27-16L0-36L27-16Z" fill="#ffb300" stroke="#ff8f00" stroke-width="1.4"/>
          <rect x="10" y="-48" width="6" height="20" fill="#3e2723"/><circle cx="13" cy="-52" r="4" fill="#b0bec5" opacity=".6"/>
          ${ownershipFlag(-18, -16, 24)}`;
      } else {
        core = `<rect x="-20" y="-14" width="40" height="30" rx="3" fill="#607d8b" stroke="#37474f" stroke-width="1.2"/>
          <path d="M-22-14L0-28L22-14Z" fill="${roof}" stroke="#263238" stroke-width="1"/>
          ${ownershipFlag(0, -28, 18)}`;
      }
      return `<g class="castle-model epoch-19th">
        <ellipse cy="20" rx="46" ry="18" fill="#14261b" opacity=".35"/>
        <ellipse cy="16" rx="44" ry="22" fill="${ownerColor}" opacity="${owner ? '.24' : '.08'}"/>
        <ellipse cy="16" rx="43" ry="21" fill="none" stroke="${ownerColor}" stroke-width="${owner ? 3 : 1}" opacity=".95"/>
        ${specAura}
        ${core}
        ${Array.from({length:level},(_,i)=>`<path d="m${-6+(i-(level-1)/2)*10} 34 2-3 2 3 3 1-3 2-2 3-1-3-3-2Z" fill="#f5d479"/>`).join('')}
      </g>`;
    }

    // 20th CENTURY: Concrete pillboxes, sandbag bunkers, radar dishes, antenna towers
    if (epoch === '20th') {
      let core = '';
      if (type === 'main' || elite) {
        core = `<rect x="-32" y="-18" width="64" height="38" rx="6" fill="#546e7a" stroke="#263238" stroke-width="1.8"/>
          <rect x="-24" y="-32" width="48" height="16" rx="4" fill="#37474f" stroke="#1c282e" stroke-width="1.4"/>
          <rect x="-18" y="-6" width="36" height="6" rx="2" fill="#111" stroke="#78909c" stroke-width=".8"/>
          <line x1="-15" y1="-32" x2="-15" y2="-62" stroke="#b0bec5" stroke-width="2"/>
          <circle cx="-15" cy="-64" r="3" fill="#ff1744"/>
          <ellipse cx="14" cy="-40" rx="10" ry="6" fill="none" stroke="#cfd8dc" stroke-width="1.8"/>
          <line x1="14" y1="-34" x2="14" y2="-40" stroke="#cfd8dc" stroke-width="2"/>
          ${ownershipFlag(26, -18, 26)}`;
      } else if (isTower) {
        core = `<path d="M-22 18L-14-22L14-22L22 18Z" fill="#455a64" stroke="#263238" stroke-width="1.6"/>
          <rect x="-16" y="-34" width="32" height="14" rx="3" fill="#37474f" stroke="#1c282e" stroke-width="1.2"/>
          <line x1="-10" y1="-28" x2="-22" y2="-32" stroke="#212121" stroke-width="4"/>
          <line x1="10" y1="-28" x2="22" y2="-32" stroke="#212121" stroke-width="4"/>
          <line x1="0" y1="-34" x2="0" y2="-58" stroke="#cfd8dc" stroke-width="2"/>
          <circle cx="0" cy="-60" r="2.5" fill="#00e676"/>
          ${ownershipFlag(0, -60, 18)}`;
      } else if (type === 'knight') {
        core = `<path d="M-26 18C-26-10 -15-32 0-32C15-32 26-10 26 18Z" fill="#37474f" stroke="#212121" stroke-width="2"/>
          <rect x="-14" y="-12" width="28" height="6" rx="2" fill="#000" stroke="#78909c" stroke-width="1"/>
          <rect x="-8" y="2" width="16" height="16" fill="#263238" stroke="#90a4ae" stroke-width="1.4"/>
          <ellipse cy="-32" rx="10" ry="4" fill="#546e7a" stroke="#263238"/>
          ${ownershipFlag(18, -10, 26)}`;
      } else if (type === 'cavalry') {
        core = `<path d="M-26 18L-26-8C-26-24 -12-28 0-28C12-28 26-24 26-8L26 18Z" fill="#4e5d6c" stroke="#2b3e50" stroke-width="1.6"/>
          <rect x="-18" y="-6" width="36" height="24" rx="2" fill="#2b3e50" stroke="#f0ad4e" stroke-width="1.2"/>
          <line x1="0" y1="-28" x2="0" y2="-54" stroke="#d5dbdb" stroke-width="2"/>
          <circle cx="0" cy="-54" r="3" fill="#f0ad4e"/>
          ${ownershipFlag(20, -10, 24)}`;
      } else if (type === 'gold') {
        core = `<rect x="-26" y="-14" width="52" height="34" rx="4" fill="#5c6b73" stroke="#2c3e50" stroke-width="1.6"/>
          <rect x="-24" y="-26" width="48" height="14" rx="3" fill="#ffd166" stroke="#e09f3e" stroke-width="1.4"/>
          <ellipse cx="-12" cy="-32" rx="6" ry="12" fill="#7d8597" stroke="#2c3e50" stroke-width="1"/>
          <ellipse cx="12" cy="-32" rx="6" ry="12" fill="#7d8597" stroke="#2c3e50" stroke-width="1"/>
          ${ownershipFlag(0, -32, 22)}`;
      } else {
        core = `<rect x="-20" y="-12" width="40" height="28" rx="4" fill="#546e7a" stroke="#263238" stroke-width="1.4"/>
          <rect x="-14" y="-22" width="28" height="12" rx="3" fill="#37474f" stroke="#1c282e" stroke-width="1"/>
          <line x1="0" y1="-22" x2="0" y2="-44" stroke="#cfd8dc" stroke-width="1.6"/>
          <circle cx="0" cy="-45" r="2.5" fill="#ff5252"/>
          ${ownershipFlag(0, -45, 16)}`;
      }
      return `<g class="castle-model epoch-20th">
        <ellipse cy="20" rx="46" ry="18" fill="#14261b" opacity=".35"/>
        <ellipse cy="16" rx="44" ry="22" fill="${ownerColor}" opacity="${owner ? '.24' : '.08'}"/>
        <ellipse cy="16" rx="43" ry="21" fill="none" stroke="${ownerColor}" stroke-width="${owner ? 3 : 1}" opacity=".95"/>
        ${specAura}
        ${core}
        ${Array.from({length:level},(_,i)=>`<path d="m${-6+(i-(level-1)/2)*10} 34 2-3 2 3 3 1-3 2-2 3-1-3-3-2Z" fill="#f5d479"/>`).join('')}
      </g>`;
    }

    // DEFAULT / 18th CENTURY (Vauban star fortress, line infantry garrisons)
    function tower(x, y, roofColor, scale = 1, flag = false) {
      return `<g transform="translate(${x} ${y}) scale(${scale})">
        <path d="M-11-23 0-29 12-23V8L0 15-11 8Z" fill="url(#stoneFace)" stroke="#526679" stroke-width=".7"/>
        <path d="M0-29 12-23V8L0 15Z" fill="#728899"/>
        <path d="M-11-9 0-3 12-9M-11 2 0 8 12 2M-5-20v8M5-4v9" fill="none" stroke="#40566b" opacity=".22" stroke-width=".7"/>
        <path d="M-14-25V-33L-10-35-10-30-5-32-5-37 0-39 0-34 5-32 5-37 10-35 10-30 14-28V-21L0-14Z" fill="#dfe7df" stroke="#829896" stroke-width=".6"/>
        <path d="M-17-34 0-60 18-34 0-25Z" fill="${roofColor}" stroke="#192f5844" stroke-width=".8"/>
        <path d="M0-60 18-34 0-25Z" fill="#102655" opacity=".3"/>
        <path d="M-12-35 0-54 0-30Z" fill="#fff" opacity=".18"/>
        ${flag ? `<path d="M0-60V-80" stroke="#f6e5ba" stroke-width="1.6"/><path class="flag banner-flag" d="M1-80Q10-85 19-78L17-68Q8-73 1-68Z" fill="${ownerColor}" stroke="#ebf9ff88" stroke-width=".6"/>` : ''}
      </g>`;
    }

    let central = isTower ? tower(0, 0, roof, 1.3, true) : tower(0, -20, roof, elite ? 1.1 : .96+(level-1)*.06, true);
    if(small)central=tower(0,0,roof,.93,true);
    if(type==='troop')central=`<path d="M-25-29 0-43 27-29V-1L0 13-25-1Z" fill="url(#stoneFace)"/><path d="M-30-29 0-64 32-29 0-13Z" fill="${roof}"/><path d="M0-64 32-29 0-13Z" fill="#285941"/><path d="M-18-16v10m10-14v10m20-10v10m10-5v10" stroke="#284c4b" stroke-width="3"/>`;
    if(type==='gold')central=`<path d="M-23-36 0-48 25-35V-8L0 8-23-6Z" fill="#d2bb78"/><path d="M-28-35 0-65 31-35 0-19Z" fill="#f7ca42"/><path d="M0-65 31-35 0-19Z" fill="#b48a24"/><path d="M-8-12v-19q8-12 15-4v24Z" fill="#413d32"/><path d="M-11-12V-31l13-8 10 7v15" fill="none" stroke="#e5c37b" stroke-width="3"/>`;
    if(type==='knight')central+=`<path d="M-17-53 0-61 17-52V-28L0-15-17-28Z" fill="#a42f43" stroke="#f0b2a1" stroke-width="2"/><path d="M-8-30-3-43 8-46 10-39 3-36 8-23H-8Z" fill="#f0d2ac"/>`;
    if(type==='cavalry')central+=`<path d="M-22-38 0-52 22-38V-16L0-4-22-16Z" fill="#784212" stroke="#e59866" stroke-width="1.8"/><path d="M-12-28-4-42 12-44 14-36 6-32 12-20H-12Z" fill="#f5b041"/><circle cx="0" cy="-22" r="5" fill="#fcf3cf"/><path d="M-6-22a6 6 0 0 1 12 0" fill="none" stroke="#6e2c00" stroke-width="2"/>`;
    const additions=level>1?`${tower(-35,-8,roof,.52)}${tower(35,-8,roof,.52)}${level===3?'<path d="M-40 15v-21l7-3v27m66 0V-9l7 3v21" fill="#bbcfc8" stroke="#526c78" stroke-width="2"/><path d="M-25-37h6v17l-3 5-3-5Zm44 0h6v17l-3 5-3-5Z" fill="#f6d474"/>':''}`:'';

    return `<g class="castle-model epoch-18th">
      <ellipse cy="26" rx="45" ry="16" fill="#142a35" opacity=".32"/>
      <ellipse cy="18" rx="44" ry="23" fill="${ownerColor}" opacity="${owner ? '.26' : '.08'}"/>
      <ellipse cy="18" rx="43" ry="22" fill="none" stroke="${ownerColor}" stroke-width="${owner ? 3 : 1}" opacity=".95"/>
      ${specAura}
      <path d="M-35 9 0-8 35 9V20L0 37-35 20Z" fill="#687b67"/>
      <path d="M0 25 35 9V20L0 37Z" fill="#496559"/>
      <path d="M-35 9 0-8 35 9 0 26Z" fill="#c5c5a0" stroke="#ede2b1"/>
      <path d="M-27 8 0-4 28 9 0 21Z" fill="#9ba583"/>
      ${additions}${central}
      ${!isTower&&!small ? `<path d="M-28-9 0-22 29-8V11L0 26-28 11Z" fill="url(#stoneFace)" stroke="#647984" stroke-width=".7"/><path d="M0-22 29-8V11L0 26Z" fill="#7b91a0"/>
      <path d="M-29-10V-17L-24-19V-13L-18-16V-22L-13-24V-18L-7-21V-27L0-30V-22L7-19V-25L13-22V-16L20-12V-18L26-15V-9L30-7V0L0-15Z" fill="#e3e9dd" stroke="#899d9e" stroke-width=".7"/>
      <path d="M-28 0 0 14 28 0M-28 7 0 21M-18-2v7M-8 3v8M12 2v6M22-2v5" stroke="#536d7c" stroke-width=".7" fill="none" opacity=".35"/>
      <path d="M-6 22V9Q0-2 7 5V21L0 26Z" fill="#20394c" stroke="#c1cfc9" stroke-width="2"/>
      <path d="M-2 8v16M2 6v17M5 8v13" stroke="#a39475" stroke-width="1"/>
      ${tower(-25, 5, roof, small ? .68 : .85)}${tower(25, 5, roof, small ? .68 : .85)}` : ''}
      ${type === 'gold' ? '<path d="M-48 23-18 38m-26-21 30 15" stroke="#6d6145" stroke-width="2"/><path d="M-44 16-33 10-22 16-24 25-34 29-43 24Z" fill="#795d35" stroke="#d0ae6c"/><circle cx="-39" cy="27" r="3" fill="#263f45"/><circle cx="-28" cy="29" r="3" fill="#263f45"/><g fill="#ffcf45" stroke="#a67529" stroke-width=".6"><ellipse cx="-24" cy="26" rx="8" ry="3"/><ellipse cx="-24" cy="23" rx="8" ry="3"/><ellipse cx="-24" cy="20" rx="8" ry="3"/><ellipse cx="-15" cy="27" rx="6" ry="3"/></g>' : ''}
      ${isTower?'<ellipse cy="-14" rx="22" ry="10" fill="none" stroke="#bfc7a0" stroke-width="4"/><path d="M-32 25V-3m-7 14 7-14 7 14" stroke="#765b36" stroke-width="2" fill="none"/><circle cx="-32" cy="6" r="7" fill="#e3dcb1" stroke="#446e62"/><circle cx="-32" cy="6" r="3" fill="#c95947"/>':''}
      ${elite ? '<path d="M0-116 8-105 0-94-8-105Z" fill="#e1b1ff" stroke="#fff0ff"/><g fill="#cc80ff" stroke="#e6c3ff" stroke-width=".5"><path d="M-39 8-34-17-27 9-33 18Z"/><path d="M32 11 39-16 46 12 38 21Z"/></g><ellipse cy="21" rx="28" ry="13" fill="none" stroke="#d796ff" opacity=".65"/>' : ''}
      ${type === 'troop' ? '<path d="M-36 11-28 7v14l-4 5-4-1Z" fill="#3e8658" stroke="#b6dd9b"/><path d="M-34 13-30 12m-2-2v10" stroke="#e5e8bf"/>' : ''}
      ${Array.from({length:level},(_,i)=>`<path d="m${-5+(i-(level-1)/2)*9} 38 2-3 2 3 3 1-3 2-2 3-1-3-3-2Z" fill="#f5d479"/>`).join('')}
    </g>`;
  }

  function portrait(type) {
    const color = {soldier:'#488ccc',archer:'#489b69',knight:'#858eab',cavalry:'#e67e22',elite:'#9560c4'}[type]||'#488ccc';
    return `<svg viewBox="0 0 60 60" aria-hidden="true"><defs><linearGradient id="portrait-${type}" x2=".7" y2="1"><stop stop-color="${color}"/><stop offset="1" stop-color="#122841"/></linearGradient></defs><rect width="60" height="60" rx="10" fill="url(#portrait-${type})"/><ellipse cx="30" cy="63" rx="25" ry="22" fill="${color}" stroke="#a3cee0" stroke-width="1"/>
      ${type==='cavalry'?`<path d="M14 45Q12 20 30 10Q48 20 46 45Z" fill="${color}"/><path d="M22 22L30 8L38 22L30 18Z" fill="#f5b041"/><circle cx="30" cy="30" r="8" fill="#fcf3cf"/><path d="M24 30a6 6 0 0 1 12 0" fill="none" stroke="#6e2c00" stroke-width="2"/>`:type==='elite'||type==='archer'?`<path d="M10 41Q9 14 30 5 51 14 50 41L42 49 18 49Z" fill="${color}"/><path d="M17 32Q17 16 30 14 43 19 43 33L37 44 24 44Z" fill="#d5ab8d"/><path d="M12 34 30 5 47 33 32 18Z" fill="${color}"/>`:'<path d="M14 29Q13 7 30 7 48 7 47 29L43 43 17 43Z" fill="#acc5d4"/><path d="M30 8Q48 12 46 29L30 33Z" fill="#6689a5"/><path d="M17 31h26v12L31 50 19 42Z" fill="#d5b299"/><path d="M10 25 30 20 50 25V32L30 29 10 33Z" fill="#c2d6df"/>'}
      <path d="M23 33h4m7 0h4" stroke="#263645" stroke-width="2"/>${type==='knight'?'<path d="M20 30h21v14l-10 8-11-8Z" fill="#708ba2"/><path d="M24 35h14m-14 5h14" stroke="#18364d" stroke-width="2"/>':''}${type==='elite'?'<path d="M48 23v33" stroke="#dcb17e" stroke-width="3"/><path d="M48 13 55 23 48 30 41 23Z" fill="#da9aff" stroke="#f3d6ff"/>':''}</svg>`;
  }

  function polyCell(point, all) {
    let poly = [[0,0],[2200,0],[2200,1500],[0,1500]];
    for (const q of all) {
      if (q.id === point.id) continue;
      const nx=q.x-point.x, ny=q.y-point.y, k=(q.x*q.x+q.y*q.y-point.x*point.x-point.y*point.y)/2;
      const next=[];
      for(let i=0;i<poly.length;i++) {
        const a=poly[i], b=poly[(i+1)%poly.length], da=a[0]*nx+a[1]*ny-k, db=b[0]*nx+b[1]*ny-k;
        if(da<=0) next.push(a);
        if((da<=0)!==(db<=0)){const t=da/(da-db);next.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}
      }
      poly=next;
    }
    return poly.map(p=>p.join(',')).join(' ');
  }

  function generateEpochProps(s, epoch, count, safeProp) {
    let props = '';
    const random = E.rng((s.seed || 42) + 88);
    for (let i = 0; i < count; i++) {
      const x = 120 + random() * 1960;
      const y = 140 + random() * 1120;
      if (safeProp && !safeProp(x, y, 40)) continue;

      if (epoch === '17th') {
        // Windmills, wooden fences, cottages, pines
        if (i % 8 === 0) {
          props += `<g transform="translate(${x} ${y})" pointer-events="none"><path d="M-8 12L-4-16L4-16L8 12Z" fill="#795548" stroke="#4e342e"/><path d="M0-16L-14-30M0-16L14-30M0-16L-14-2M0-16L14-2" stroke="#d7ccc8" stroke-width="1.8"/><circle cx="0" cy="-16" r="2.5" fill="#3e2723"/></g>`;
        } else if (i % 4 === 0) {
          props += `<g transform="translate(${x} ${y})" pointer-events="none"><rect x="-10" y="-6" width="20" height="12" fill="#8d6e63" stroke="#4e342e"/><path d="M-12-6L0-16L12-6Z" fill="#a1887f"/></g>`;
        } else {
          const z = 12 + random() * 12;
          props += `<g transform="translate(${x} ${y})" pointer-events="none"><ellipse cy="5" rx="${z*.7}" ry="${z*.33}" fill="#203f3426"/><path d="M0 5V-9" stroke="#685d3c" stroke-width="3"/><path d="M${-z*.62} 0 0 ${-z*1.9} ${z*.64} 0Z" fill="${['#3c744b','#4c8050','#426d42'][i%3]}"/><path d="M${-z*.5} ${-z*.58} 0 ${-z*2.3} ${z*.5} ${-z*.58}Z" fill="#568d50"/></g>`;
        }
      } else if (epoch === '19th') {
        // Brick factory chimneys, rail segments, telegraphs
        if (i % 7 === 0) {
          props += `<g transform="translate(${x} ${y})" pointer-events="none"><rect x="-6" y="-30" width="12" height="36" fill="#4e342e" stroke="#271c19"/><circle cx="0" cy="-35" r="4" fill="#78909c" opacity=".5"/><circle cx="3" cy="-44" r="6" fill="#90a4ae" opacity=".4"/></g>`;
        } else if (i % 4 === 0) {
          props += `<g transform="translate(${x} ${y})" pointer-events="none"><line x1="-16" y1="0" x2="16" y2="0" stroke="#37474f" stroke-width="3"/><line x1="-12" y1="-4" x2="-12" y2="4" stroke="#795548" stroke-width="2"/><line x1="0" y1="-4" x2="0" y2="4" stroke="#795548" stroke-width="2"/><line x1="12" y1="-4" x2="12" y2="4" stroke="#795548" stroke-width="2"/></g>`;
        } else {
          props += `<g transform="translate(${x} ${y})" pointer-events="none"><line x1="0" y1="6" x2="0" y2="-24" stroke="#455a64" stroke-width="2"/><line x1="-8" y1="-20" x2="8" y2="-20" stroke="#455a64" stroke-width="1.5"/></g>`;
        }
      } else if (epoch === '20th') {
        // Concrete bunkers, sandbags, radio communication antennas
        if (i % 7 === 0) {
          props += `<g transform="translate(${x} ${y})" pointer-events="none"><rect x="-14" y="-8" width="28" height="16" rx="4" fill="#546e7a" stroke="#263238" stroke-width="1.4"/><line x1="-10" y1="-2" x2="10" y2="-2" stroke="#111" stroke-width="2"/></g>`;
        } else if (i % 4 === 0) {
          props += `<g transform="translate(${x} ${y})" pointer-events="none"><line x1="0" y1="6" x2="0" y2="-36" stroke="#90a4ae" stroke-width="2"/><circle cx="0" cy="-38" r="2.5" fill="#ff1744"/><ellipse cx="0" cy="-24" rx="8" ry="4" fill="none" stroke="#cfd8dc" stroke-width="1.2"/></g>`;
        } else {
          props += `<g transform="translate(${x} ${y})" pointer-events="none"><path d="M-14 4Q0 0 14 4M-12 0Q0-4 12 0" stroke="#d7ccc8" stroke-width="3.5" stroke-linecap="round"/></g>`;
        }
      } else {
        // 18th Century: Military canvas tents, cannon batteries, formal trees
        if (i % 7 === 0) {
          props += `<g transform="translate(${x} ${y})" pointer-events="none"><path d="M-12 10L0-12L12 10Z" fill="#eceff1" stroke="#b0bec5"/><line x1="0" y1="-12" x2="0" y2="10" stroke="#90a4ae"/></g>`;
        } else if (i % 5 === 0) {
          props += `<g transform="translate(${x} ${y})" pointer-events="none"><rect x="-6" y="-3" width="12" height="6" rx="2" fill="#212121"/><circle cx="-3" cy="3" r="3" fill="#5d4037"/><circle cx="3" cy="3" r="3" fill="#5d4037"/></g>`;
        } else {
          const z = 10 + random() * 10;
          props += `<g transform="translate(${x} ${y})" pointer-events="none"><circle cx="0" cy="0" r="${z}" fill="#4c8050" opacity=".8"/><circle cx="-2" cy="-2" r="${z*.7}" fill="#639655" opacity=".9"/></g>`;
        }
      }
    }
    return props;
  }

  function renderCastleStars(level) {
    const lvl = Math.max(1, Math.min(5, Math.floor(Number(level) || 1)));
    const starPoly = "0,-4 1.2,-1.2 4,-1.2 1.7,0.8 2.5,3.6 0,1.9 -2.5,3.6 -1.7,0.8 -4,-1.2 -1.2,-1.2";
    const spacing = 9.5;
    const startX = -((lvl - 1) * spacing) / 2;
    let starsSvg = '';
    for (let i = 0; i < lvl; i++) {
      const sx = (startX + i * spacing).toFixed(1);
      starsSvg += `<polygon points="${starPoly}" transform="translate(${sx} 0)" fill="#ffd700" stroke="#241b06" stroke-width="0.75"/>`;
    }
    const pillW = Math.max(18, Math.round(lvl * spacing + 8));
    const isUpgraded = lvl > 1;
    return `<rect class="castle-stars-bg" x="${-pillW / 2}" y="-6.5" width="${pillW}" height="13" rx="6.5" fill="${isUpgraded ? '#071520f2' : '#0b1620d8'}" stroke="${isUpgraded ? '#ffd700' : '#3f5364'}" stroke-width="${isUpgraded ? '1.2' : '0.8'}"/>${starsSvg}`;
  }

  function castleMarkup(s,c) {
    const a=CrownAnchors.node(s,c), {rx,ry}=a.footprint;
    const strat=E.getCastleStrategicInfo ? E.getCastleStrategicInfo(c,s.epoch||'18th',s) : null;
    const roleTitle=strat ? `${strat.icon} ${strat.eraName}` : E.getCastleRoleName(s.epoch||'18th',c.type);
    const benefitText=strat ? `${strat.icon} ${strat.buffShort}` : '';
    const benefitColor=strat ? strat.themeColor : '#afb8b9';
    const tooltip=strat ? `${c.name} (${strat.categoryName})\nRole: ${strat.eraName}\nYield: ${strat.yieldText}\nBuff: ${strat.buffDesc}\nScope: ${strat.scope}\nStrategy: ${strat.tacticalAdvice}` : c.name;
    return `<g id="castle${c.id}" class="castle" tabindex="0" role="button" aria-label="${escapeText(c.name)}" transform="translate(${a.world.x} ${a.world.y})" data-id="${c.id}" data-owner="${c.owner||'neutral'}" data-category="${strat?.category?.id||'defense'}">
      <title>${escapeText(tooltip)}</title>
      ${Style.foundation(s,c)}
      <ellipse class="ownership-aura" rx="${rx+10}" ry="${ry+7}" pointer-events="none"/>
      <ellipse class="ownership-ring" rx="${rx+5}" ry="${ry+3}" pointer-events="none"/>
      <ellipse class="selection source-halo" rx="${rx+11}" ry="${ry+8}" pointer-events="none"/>
      <ellipse class="target-halo" rx="${rx+16}" ry="${ry+12}" pointer-events="none"/>
      <g class="building" id="building${c.id}" pointer-events="none"></g>
      <circle class="castle-hitbox" r="54" fill="transparent" pointer-events="all"/>
      <rect class="castle-silhouette-hitbox" x="${a.sprite.x}" y="${a.sprite.y}" width="${a.w}" height="${a.h}" fill="transparent" pointer-events="all"/>
      <g class="castle-caption" transform="translate(${a.label.x} ${a.label.y})" pointer-events="all">
        <g id="stars${c.id}" class="castle-stars ${c.level > 1 ? 'is-upgraded' : ''}" data-level="${c.level}" transform="translate(0 -21)" pointer-events="none">
          ${renderCastleStars(c.level)}
        </g>
        <rect id="badge${c.id}" class="troop-plate" x="-30" y="-12" width="60" height="25" rx="4"/>
        <path class="ownership-marker" d="M-25-5L-20-5L-20 2L-22.5 5L-25 2Z"/>
        <text id="def${c.id}" x="4" y="6" text-anchor="middle" fill="#eee9df" font-size="17" font-weight="700" font-family="Outfit,sans-serif"></text>
        <text class="castle-name" y="29" text-anchor="middle" fill="#e6dfce" font-size="16" font-family="Cinzel,serif" paint-order="stroke" stroke="#091119" stroke-width="3">${escapeText(c.name)}</text>
        <text class="castle-role" y="45" text-anchor="middle" fill="#c4cdd2" font-size="11" font-weight="600" font-family="Outfit,sans-serif" paint-order="stroke" stroke="#091119" stroke-width="3">${escapeText(roleTitle)}</text>
        <text class="castle-benefit-tag" y="59" text-anchor="middle" fill="${benefitColor}" font-size="10" font-weight="700" font-family="Outfit,sans-serif" paint-order="stroke" stroke="#050a10" stroke-width="3.2">${escapeText(benefitText)}</text>
        <text id="composition${c.id}" class="castle-composition" y="72" text-anchor="middle" fill="#e6dfce" font-size="14"></text>
      </g>
      <g class="anchor-debug" pointer-events="none" aria-hidden="true">
        <circle class="debug-node" r="7" fill="none" stroke="#fff" stroke-width="1.5"/>
        <path class="debug-root" d="M-12 0H12M0-12V12" stroke="#ffcf52" stroke-width="1.5"/>
        <circle class="debug-hitbox" r="54" fill="none" stroke="#69d9ed" stroke-width="1"/>
        <path d="M0 0L${a.label.x} ${a.label.y}" stroke="#e58bdf" stroke-width="1"/>
        <circle class="debug-label" cx="${a.label.x}" cy="${a.label.y}" r="4" fill="#e58bdf"/>
        <circle class="debug-gate" cx="${a.gate.x}" cy="${a.gate.y}" r="4" fill="#90df95"/>
        <text x="12" y="-8" fill="#fff" font-size="10">${c.id} NODE / ROOT / HIT</text>
      </g>
    </g>`;
  }

  function layoutCastleLabels(s) {
    // Caption, plate and role never receive independent world-space offsets.
    // Zoom-aware collision handling suppresses detail instead of detaching labels.
    for (const c of s.castles) {
      const a=CrownAnchors.node(s,c), node=$('castle'+c.id);
      node.querySelector('.castle-caption').setAttribute('transform',`translate(${a.label.x} ${a.label.y})`);
    }
  }

  function init(s) {
    cache.clear(); castleDetails.clear(); previewKey=''; marching.clear(); battleNodes.clear(); effectNodes.clear(); dragonVisualKey=''; dragonParts=null; ownershipKey=''; lastRoadStateKey = null; currentHoverCastleId = null; lastRenderState = null;
    const mIdx = s.mapIndex || 0;
    const vis = MAP_VISUALS[mIdx] || MAP_VISUALS[0];
    const isLow = qualityLevel === 'low';
    const isMed = qualityLevel === 'medium';
    const epoch = s.epoch || '18th';
    visualEpoch=epoch;
    CrownEpochVisuals.syncUI(epoch);
    const safeProp = Style.clearance(s, vis);
    const shouldLoadTerrain = Boolean(
      (typeof window !== 'undefined' && window.matchActive) ||
      (typeof document !== 'undefined' && document.body && (document.body.classList.contains('in-game') || document.body.dataset.stage === 'match'))
    );
    const terrainUrl = shouldLoadTerrain ? Style.terrain(s) : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3C/svg%3E";
    const deferredAttr = !shouldLoadTerrain ? ` data-deferred-src="${Style.terrain(s)}"` : '';

    const epochProps = generateEpochProps(s, epoch, isLow ? 12 : isMed ? 32 : 55, safeProp);

    $('map').setAttribute('viewBox', '0 0 2200 1500');
    $('map').classList.toggle('plate-map', Style.hasTerrainPlate(mIdx));
    const riverElem = vis.river ? `<path d="${vis.river}" stroke="#626c65" stroke-width="24" fill="none"/><path d="${vis.river}" stroke="#122f3c" stroke-width="18" fill="none"/><path d="${vis.river}" stroke="#294957" stroke-width="11" fill="none"/>` : '';

    $('map').innerHTML=`<defs>
      ${Style.defs()}
      <linearGradient id="stoneFace" x2="1" y2=".6"><stop stop-color="#a0aaa6"/><stop offset=".5" stop-color="#727f80"/><stop offset="1" stop-color="#47565e"/></linearGradient>
      ${Object.entries(colors).filter(([k])=>k!=='neutral').map(([k,c])=>`<radialGradient id="region-${k}"><stop stop-color="${c}" stop-opacity=".12"/><stop offset="1" stop-color="${c}" stop-opacity=".01"/></radialGradient>`).join('')}
      <linearGradient id="badge-blue" x2="0" y2="1"><stop stop-color="#2c4d6b"/><stop offset="1" stop-color="#122434"/></linearGradient>
      <linearGradient id="badge-red" x2="0" y2="1"><stop stop-color="#692d2f"/><stop offset="1" stop-color="#311315"/></linearGradient>
      <linearGradient id="badge-green" x2="0" y2="1"><stop stop-color="#2e543a"/><stop offset="1" stop-color="#13271b"/></linearGradient>
      <linearGradient id="badge-purple" x2="0" y2="1"><stop stop-color="#54366b"/><stop offset="1" stop-color="#281736"/></linearGradient>
      <linearGradient id="badge-neutral" x2="0" y2="1"><stop stop-color="#34414a"/><stop offset="1" stop-color="#171e24"/></linearGradient>
      <clipPath id="landclip"><path transform="scale(2)" d="${vis.land}"/></clipPath>
    </defs>
    ${Style.sea()}
    <g class="cartographic-detail" opacity=".15" fill="none" stroke="#b2d0c5" stroke-width="1">
      <path d="M0 350H2200M0 700H2200M0 1050H2200M550 0V1500M1100 0V1500M1650 0V1500" stroke-dasharray="3 16"/>
      <g transform="translate(2070 170)"><circle r="51"/><circle r="39"/><path d="M0-65V65M-65 0H65"/><path d="M0-46L9 0L0 46L-9 0Z" fill="#c9d8b2"/><text y="-76" text-anchor="middle" fill="#e4d49e" stroke="none" font-size="22">N</text></g>
    </g>
    <g id="mapBackdrop" transform="scale(2)" style="${Style.hasTerrainPlate(mIdx) ? 'display:none' : ''}">
      ${!isLow ? `<g class="water-line" fill="none" stroke="#78949e" stroke-opacity=".2" stroke-width="2.5"><path fill="none" d="M25 232Q-3 390 28 510M102 676Q173 738 262 750M875 685Q1047 606 1064 469M999 134Q1083 242 1063 344"/></g>` : ''}
      ${!isLow ? `<path class="coastal-surf" d="${vis.land}" fill="none" stroke="#91a5a7" stroke-width="15" opacity=".18"/>` : ''}
      ${Style.coast(vis)}
      <path d="${vis.land}" fill="${Style.biome(s)[2]}" stroke="${Style.palette.shore}" stroke-width="3"/>
    </g>
    ${Style.hasTerrainPlate(mIdx) ? `
      <g id="warPlateLayer" pointer-events="none">
        <image class="war-ground" href="${terrainUrl}"${deferredAttr} x="0" y="0" width="2200" height="1500" preserveAspectRatio="none"/>
      </g>
      <g id="territories" clip-path="url(#landclip)">${s.castles.filter(c=>c.owner).map(c=>`<polygon id="region${c.id}" class="territory" points="${polyCell(c,s.castles)}" fill="url(#region-${c.owner})" stroke="${colors[c.owner]}" stroke-width="1.8" stroke-opacity=".55" stroke-dasharray="6 4"/>`).join('')}</g>
      <g class="quality-dressing">${Style.dressing(s, vis, qualityLevel)}</g>
      <g class="epoch-props" pointer-events="none">${Style.material(epochProps)}</g>
    ` : `
      <g clip-path="url(#landclip)">
        <image class="war-ground" href="${terrainUrl}"${deferredAttr} width="2200" height="1500" preserveAspectRatio="none" pointer-events="none"/>
        <g id="territories" clip-path="url(#landclip)">${s.castles.filter(c=>c.owner).map(c=>`<polygon id="region${c.id}" class="territory" points="${polyCell(c,s.castles)}" fill="url(#region-${c.owner})" stroke="${colors[c.owner]}" stroke-width="1.8" stroke-opacity=".55" stroke-dasharray="6 4"/>`).join('')}</g>
        <g class="war-waterworks" transform="scale(2)">
          ${riverElem}
          ${vis.structures||''}
        </g>
        <g class="quality-dressing">${Style.dressing(s, vis, qualityLevel)}</g>
        <g class="epoch-props" pointer-events="none">${Style.material(epochProps)}</g>
      </g>
    `}
    <g transform="scale(2)">
      ${Style.roads(vis,s)}
    </g>
    ${Style.atmosphere()}
    <!-- Authentic Compass Rose -->
    <g id="compassRose" class="compass-rose" transform="translate(1960 170)" pointer-events="none" opacity=".85">
      <circle r="46" fill="none" stroke="#b99a61" stroke-width="1" opacity=".4"/>
      <circle r="42" fill="none" stroke="#b99a61" stroke-width="1.5" stroke-dasharray="2 4" opacity=".6"/>
      <circle r="38" fill="#081018" fill-opacity=".45" stroke="#b99a61" stroke-width="0.8" opacity=".6"/>
      <path d="M0-36 L5-10 L28-28 L10-5 L36 0 L10 5 L28 28 L5 10 L0 36 L-5 10 L-28 28 L-10 5 L-36 0 L-10-5 L-28-28 L-5-10 Z" fill="#b99a61" opacity=".7"/>
      <path d="M0-36 L0 0 L10-5 Z M36 0 L0 0 L10 5 Z M0 36 L0 0 L-10 5 Z M-36 0 L0 0 L-10-5 Z" fill="#d9be85" opacity=".88"/>
      <circle r="3.5" fill="#f5e7c8" stroke="#7a6234" stroke-width="1"/>
      <text y="-40" text-anchor="middle" fill="#d9be85" font-family="'Cinzel', serif" font-size="11" font-weight="700">N</text>
      <text x="44" y="4" text-anchor="middle" fill="#d9be85" font-family="'Cinzel', serif" font-size="11" font-weight="700">E</text>
      <text y="48" text-anchor="middle" fill="#d9be85" font-family="'Cinzel', serif" font-size="11" font-weight="700">S</text>
      <text x="-44" y="4" text-anchor="middle" fill="#d9be85" font-family="'Cinzel', serif" font-size="11" font-weight="700">W</text>
    </g>
    <g id="connections"></g><g id="routes"></g><path id="routePreview" fill="none" stroke="#e2c68e" stroke-width="2.5" stroke-dasharray="8 6" opacity=".85" pointer-events="none"/><g id="rendezvousPreview" visibility="hidden" pointer-events="none"><circle r="22" fill="#c5a05922" stroke="#e2c68e" stroke-width="2.5" stroke-dasharray="4 4"/><text y="-28" text-anchor="middle" fill="#f0ebdf" font-size="12">INTERCEPT</text></g>
    <g id="castles">${s.castles.map(c=>castleMarkup(s,c)).join('')}</g>
    <g id="dragLayer" pointer-events="none"><path id="dragLine" fill="none" stroke="#c5a059" stroke-width="5" stroke-linecap="round" stroke-dasharray="8 6" opacity="0"/><g id="dragHead" opacity="0"><polygon points="0,0 -10,-18 10,-18" fill="#c5a059"/><circle r="5" fill="#f0ebdf"/></g><g id="dragBadge" opacity="0"><rect x="-40" y="-18" width="80" height="32" rx="6" fill="#09121bf5" stroke="#c5a059" stroke-width="2"/><text y="5" text-anchor="middle" fill="#f0ebdf" font-size="15" font-weight="900" font-family="'Outfit', sans-serif"></text></g></g>
    <g id="movingArmies" pointer-events="none"></g>
    <g id="roadBattles" pointer-events="none"></g>
    <g id="dragonStrikeLayer" pointer-events="none"></g>
    <g id="dragonReticle" pointer-events="none"></g>
    <g id="effects" pointer-events="none"></g>`;
    layoutCastleLabels(s);
    const generation=++labelGeneration;
    document.fonts?.ready.then(()=>{if(generation===labelGeneration)window.MobileGame?.syncCastleLabels();});
  }

  function composition(entity) {
    return `⚔ ${Math.floor(entity.count ?? entity.troops ?? 0)}`;
  }
  function unitFigure(type, color) {
    return CrownEpochVisuals.figure(type,color,visualEpoch);
  }
  function legacyUnitFigure(type, color) {
    if (type === 'soldier') return soldier(color);
    const shadow = `<ellipse cy="9" rx="5.5" ry="2.2" fill="#04090d" opacity=".65"/>`;
    if (type === 'cavalry') {
      return `${shadow}<path d="M-10 4Q-6-2 4 2L8-6 12-4 10 6 5 7-7 7Z" fill="#2a2017" stroke="#140f0a" stroke-width=".8"/><path class="legs" d="M-7 6-9 13M-2 6 0 13M6 6 9 13" stroke="#1d150f" stroke-width="2.8" stroke-linecap="round"/><g transform="translate(-2 -5)"><path d="M-4-4L4-4 4 3-4 3Z" fill="${color}" stroke="#141c24" stroke-width=".7"/><circle cy="-7" r="3.2" fill="#354450" stroke="#162028" stroke-width=".7"/></g><path d="M3-17 14-25" stroke="#483b2d" stroke-width="1.6"/><path d="M12-24 16-27" stroke="#9eabb5" stroke-width="1.6"/><path d="M10-21l-5-2 1 4z" fill="${color}"/>`;
    }
    const legs = `<path class="legs" d="M-2 3-3 9M2 3 3.5 9" stroke="#1a232b" stroke-width="2.3" stroke-linecap="round"/>`;
    if (type === 'archer') {
      return `${shadow}${legs}<circle cy="-7" r="3.2" fill="#382e22" stroke="#1b150e" stroke-width=".7"/><path d="M-3.5-3L3.5-3 4 4-4 4Z" fill="${color}" stroke="#18221a" stroke-width=".8"/><path d="M6-14Q17-2 6 8" fill="none" stroke="#5a4226" stroke-width="1.8"/><path d="M6-14V8" fill="none" stroke="#bfb49e" stroke-width=".6"/><path d="M1-3H16l-3-2m3 2-3 2" fill="none" stroke="#b0bcc5" stroke-width=".8"/>`;
    }
    return `${shadow}${legs}<path d="M-4.5-3L4.5-3 5 4-5 4Z" fill="#2c3945" stroke="#131a20" stroke-width=".8"/><path d="M-2-3h4v7h-4z" fill="${color}" opacity=".85"/><path d="M-3.5-9h7v6h-7z" fill="#384755" stroke="#151e26" stroke-width=".8"/><path d="M-2.5-6h5" stroke="#0e1318" stroke-width=".8"/><path d="M-9-4L-2-4L-3 4L-5.5 8L-8 4Z" fill="#1d2732" stroke="${color}" stroke-width="1.1"/><path d="M8-13V5" stroke="#c2ccd4" stroke-width="2"/><path d="M5-4H11" stroke="#917235" stroke-width="2"/>`;
  }

  function soldier(color) {
    return `<ellipse cy="9" rx="5.5" ry="2.2" fill="#04090d" opacity=".65"/><path class="legs" d="M-2 3-3 9M2 3 4 9" stroke="#1a232b" stroke-width="2.4" stroke-linecap="round"/><path d="M-4-2-5 4 0 6 4 2 3-3Z" fill="${color}" stroke="#141e26" stroke-width=".8"/><path d="M-5-2h10l-1 3h-8z" fill="#303b45" stroke="#172129" stroke-width=".5"/><circle cy="-6" r="3.4" fill="#354450" stroke="#162028" stroke-width=".7"/><path d="M-3-5h6" stroke="#12181e" stroke-width=".8"/><path d="M6-10v16" stroke="#483b2d" stroke-width="1.3"/><path d="M4.5-9 6-14 7.5-9Z" fill="#9eabb5" stroke="#253039" stroke-width=".5"/><circle cx="-4" cy="2" r="3.2" fill="#24303a" stroke="#7a6b4b" stroke-width=".8"/>`;
  }

  function syncRoadBattles(s) {
    const el=$('roadBattles');if(!el)return;
    const active=new Set(),armyById=new Map(s.armies.map(a=>[a.id,a]));
    for(const b of s.battles||[]){
      active.add(b.id);
      let n=battleNodes.get(b.id);
      if(!n){
        const node=document.createElementNS(NS,'g');node.classList.add('road-battle-marker');node.dataset.battleId=b.id;node.style.cursor='pointer';
        node.innerHTML='<ellipse class="clash-smoke" rx="23" ry="13" fill="#aaa38a" opacity=".19"/><path class="clash-flash" d="M-5-8L4 2M5-7L-3 1" stroke="#eddbac" stroke-width="1.4"/><g class="battle-power"><rect x="-38" y="-40" width="76" height="10" rx="5" fill="#0b1721cc" stroke="#ffeaa7" stroke-width="1.2"/></g><g class="battle-sides"/>';
        el.appendChild(node);n={node,power:node.querySelector('.battle-power'),sides:node.querySelector('.battle-sides'),bars:new Map(),labels:new Map()};battleNodes.set(b.id,n);
      }
      setAttr(n.node,'transform',`translate(${b.x} ${b.y})`);
      const sides={};
      for(const id of b.armies){const a=armyById.get(id);if(!a||a.count<=0)continue;const side=sides[a.owner]||={count:0};side.count+=a.count;}
      const owners=Object.keys(sides),keys=Object.keys(b.powerRatio||{});let x=-36;
      n.power.style.display=keys.length?'':'none';
      for(const owner of keys){
        let bar=n.bars.get(owner);if(!bar){bar=document.createElementNS(NS,'rect');bar.setAttribute('y','-38.5');bar.setAttribute('height','7');bar.setAttribute('rx','2');bar.setAttribute('fill',colors[owner]||'#fff');n.power.appendChild(bar);n.bars.set(owner,bar);}
        const width=Math.max(2,(b.powerRatio[owner]||0)*72);setAttr(bar,'x',x);setAttr(bar,'width',width);x+=width;
      }
      for(const [owner,bar] of n.bars)if(!keys.includes(owner)){bar.remove();n.bars.delete(owner);}
      owners.forEach((owner,i)=>{
        let label=n.labels.get(owner);if(!label){const node=document.createElementNS(NS,'g');node.classList.add('battle-composition');node.dataset.owner=owner;node.innerHTML=`<rect x="-90" y="-16" width="180" height="22" rx="5" fill="#071d2cf2" stroke="${colors[owner]}"/><text text-anchor="middle" fill="${colors[owner]}" font-size="14" font-weight="800"/>`;n.sides.appendChild(node);label={node,text:node.querySelector('text')};n.labels.set(owner,label);}
        setAttr(label.node,'transform',`translate(0 ${38+i*24})`);setText(label.text,composition(sides[owner]));
      });
      for(const [owner,label] of n.labels)if(!owners.includes(owner)){label.node.remove();n.labels.delete(owner);}
    }
    for(const [id,n] of battleNodes)if(!active.has(id)){n.node.remove();battleNodes.delete(id);}
  }

  function syncEffects(s) {
    const el=$('effects'),active=new Set(s.effects),isLow=qualityLevel==='low',pCount=qualityLevel==='medium'?4:10;
    for(const [effect,n] of effectNodes)if(!active.has(effect)){n.node.remove();effectNodes.delete(effect);}
    for(const e of s.effects){
      let n=effectNodes.get(e);
      const key=`${qualityLevel}:${e.owner}:${e.text}`;
      if(!n||n.key!==key){
        if(n)n.node.remove();
        const node=document.createElementNS(NS,'g');
        node.innerHTML=(isLow?'':`<ellipse cy="10" stroke="${colors[e.owner]}" fill="none"/>${Array.from({length:pCount},(_,i)=>`<circle fill="${i%2?'#fff1b5':colors[e.owner]}"/>`).join('')}`)+`<text text-anchor="middle" font-size="15" font-weight="${isLow?900:800}" fill="#fff6b9" paint-order="stroke" stroke="${isLow?'#102521':'#204439'}" stroke-width="3"/>`;
        el.appendChild(node);n={node,key,text:node.querySelector('text'),ring:node.querySelector('ellipse'),particles:[...node.querySelectorAll('circle')]};setText(n.text,e.text);effectNodes.set(e,n);
      }
      const t=(1.8-e.life)/1.8;
      setAttr(n.node,'transform',`translate(${e.x} ${e.y})`);setAttr(n.node,'opacity',Math.min(1,e.life));
      setAttr(n.text,'y',isLow?-45-t*20:-90-t*26);
      if(n.ring){setAttr(n.ring,'rx',18+t*70);setAttr(n.ring,'ry',10+t*35);setAttr(n.ring,'stroke-width',4-t*3);}
      n.particles.forEach((particle,i)=>{const angle=i*Math.PI/(pCount/2);setAttr(particle,'cx',Math.cos(angle)*t*64);setAttr(particle,'cy',-20+Math.sin(angle)*t*50-t*22);setAttr(particle,'r',3.5-t*2);});
    }
  }

  function syncDragonStrike(s) {
    const el = $('dragonStrikeLayer');
    if (!el) return;
    const strike = s.dragonStrike;
    if (!strike) {
      if (el.firstChild) el.replaceChildren();
      dragonVisualKey='';dragonParts=null;
      return;
    }
    const key=`${strike.state}:${strike.x}:${strike.y}`;
    if (strike.state === 'incoming') {
      const t = strike.timer;
      const pct = Math.max(0, t / (strike.totalTimer || 3.0));
      const shadowX = strike.x - pct * 340;
      const shadowY = strike.y - pct * 260;
      if(dragonVisualKey!==key)el.innerHTML = `
        <g transform="translate(${strike.x} ${strike.y})">
          <circle r="190" fill="#9e3b3d18" stroke="#aa4545" stroke-width="2.5" stroke-dasharray="8 5"/>
          <circle r="130" fill="#9e3b3d22" stroke="#c5a059" stroke-width="2" stroke-dasharray="6 4"/>
          <circle r="70" fill="#c5a05928" stroke="#e2c68e" stroke-width="2"/>
          <rect x="-60" y="-135" width="120" height="30" rx="6" fill="#09121bf5" stroke="#aa4545" stroke-width="1.8"/>
          <text y="-115" text-anchor="middle" fill="#e2c68e" font-size="14" font-weight="900" font-family="'Outfit', sans-serif">⚠️ ${(t).toFixed(1)}s</text>
        </g>
        <g transform="translate(${shadowX} ${shadowY}) scale(2.0)" opacity="0.65">
          <path d="M0-22L-16-6L-38-16L-22 4L-42 16L-14 16L0 34L14 16L42 16L22 4L38-16L16-6Z" fill="#000" opacity="0.5"/>
        </g>
      `;
      if(dragonVisualKey!==key)dragonParts={text:el.querySelector('text'),shadow:el.children[1]};
      setText(dragonParts.text,`⚠️ ${t.toFixed(1)}s`);
      setAttr(dragonParts.shadow,'transform',`translate(${shadowX} ${shadowY}) scale(2.0)`);
    } else if (strike.state === 'impact') {
      if(dragonVisualKey!==key)el.innerHTML = `
        <g transform="translate(${strike.x} ${strike.y})">
          <circle r="210" fill="#aa454544" stroke="#8f3537" stroke-width="4"/>
          <circle r="130" fill="#c5a05955" stroke="#e2c68e" stroke-width="3"/>
          <circle r="70" fill="#ffffff88"/>
        </g>
      `;
    }
    dragonVisualKey=key;
  }

  function syncArmies(s) {
    const ids=new Set(s.armies.map(a=>a.id));
    for(const [id,n] of marching) if(!ids.has(id)){n.node.remove();n.route.remove();marching.delete(id);}
    const vb=$('map').viewBox.baseVal, zoom=2200/(vb.width||2200);
    const isLow=qualityLevel==='low',animateUnits=!isLow&&!reducedMotion&&!s.paused;
    const budget=isLow?(zoom<1.6?3:4):zoom<1.6?8:zoom<3?12:20;
    const battleByArmy=new Map();for(const battle of s.battles||[])for(const id of battle.armies)battleByArmy.set(id,battle);
    for(const a of s.armies) {
      const pos=E.position(a), next=E.position(a,.02);
      let n=marching.get(a.id);
      const visible=pos.x>vb.x-100&&pos.x<vb.x+vb.width+100&&pos.y>vb.y-100&&pos.y<vb.y+vb.height+100;
      if(!visible){if(n){n.node.style.display='none';n.route.style.display='none';}continue;}
      const color=colors[a.owner]||'#acb3a7', peak=Math.max(n?.peak||0,a.count), slots=Math.max(1,Math.ceil(Math.min(budget,Math.ceil(Math.sqrt(peak)*1.65))*a.count/peak));
      const rosterKey=`${slots}:${a.count}`;
      const roster=n?.rosterKey===rosterKey?n.roster:CrownArmyArt.roster(a,slots).slice(0,isLow?slots:undefined);
      const typeKey=[visualEpoch,a.owner,...roster].join(':');
      if(!n){
        const node=document.createElementNS(NS,'g'),route=document.createElementNS(NS,'g');
        node.classList.add('army-token');node.dataset.armyId=a.id;node.setAttribute('role','button');node.setAttribute('tabindex','0');
        node.innerHTML=`<g class="march-dust" pointer-events="none"><ellipse rx="13" ry="4" fill="#b1a68a" opacity=".13"/><ellipse cx="-9" cy="3" rx="7" ry="3" fill="#b1a68a" opacity=".1"/></g><g class="formation" pointer-events="none"></g><g class="army-banner" pointer-events="none"><path d="M0 1V-32" stroke="#c3b69a" stroke-width="1"/><path d="M1-32Q7-34 14-30L13-20Q7-24 1-22Z" fill="${color}" stroke="#d7c6a0" stroke-width=".6"/><path d="M3-30v6" stroke="#eee2bb"/></g><g class="army-caption" transform="translate(0 22)"><rect x="-18" y="-10" width="36" height="18" rx="3" fill="#08131ddd" stroke="${color}" stroke-width=".8"/><text class="army-count" y="3" text-anchor="middle" fill="#f0ead7" font-size="12" font-weight="700"></text><rect class="army-progress" x="-14" y="6" height="1" fill="${color}"/></g><g class="army-recall-pill" data-recall-btn="${a.id}" transform="translate(0 41)" style="cursor:pointer;pointer-events:auto;display:none;"><rect x="-29" y="-9" width="58" height="18" rx="4" fill="#8c2527ee" stroke="#f0a0a0" stroke-width="1.2"/><text class="army-recall-btn-text" y="4" text-anchor="middle" fill="#ffffff" font-size="10" font-weight="700" font-family="'Outfit', sans-serif">↩ Nazad</text></g><g class="army-composition"><text y="-51" text-anchor="middle" fill="#e4dcc7" stroke="#071019" stroke-width="3" paint-order="stroke" font-size="12"></text></g><circle r="36" fill="transparent" pointer-events="auto"/></g>`;
        const isFriendly = (typeof myRole !== 'undefined') ? (a.owner === myRole) : (a.owner === 'blue');
        const routeColor = isFriendly ? color : '#c45d58';
        const routeClass = isFriendly ? 'route route-friendly' : 'route route-enemy';
        const routeOp = isFriendly ? '.78' : '.75';
        const routeW = isFriendly ? '2.0' : '1.9';
        route.innerHTML=`<path class="${routeClass}" fill="none" stroke="${routeColor}" stroke-width="${routeW}" stroke-dasharray="6 5" opacity="${routeOp}"/><circle cx="${a.tx}" cy="${a.ty}" r="5.5" fill="${routeColor}22" stroke="${routeColor}" stroke-width="1.5" opacity=".8"/>`;
        $('routes').appendChild(route);$('movingArmies').appendChild(node);
        n={node,route,formation:node.querySelector('.formation'),dust:node.querySelector('.march-dust'),banner:node.querySelector('.army-banner'),count:node.querySelector('.army-count'),progress:node.querySelector('.army-progress'),composition:node.querySelector('.army-composition text'),recallPill:node.querySelector('.army-recall-pill'),recallText:node.querySelector('.army-recall-btn-text'),units:[]};
        n.routePath=route.querySelector('path');n.routeEndpoint=route.querySelector('circle');n.dustParticles=[...n.dust.children];n.pillRect=n.recallPill.querySelector('rect');
        marching.set(a.id,n);
      }
      n.peak=peak;n.roster=roster;n.rosterKey=rosterKey;n.node.style.display='';n.route.style.display=a.inBattle?'none':'';
      if(n.typeKey!==typeKey){
        n.formation.innerHTML=roster.map((type,i)=>`<image class="marcher" data-unit-type="${type}" x="-25" y="-46" width="52" height="58" href="${CrownArmyArt.sprite(type,color,visualEpoch,i%2)}"/>`).join('');
        n.units=[...n.formation.children];n.typeKey=typeKey;n.frame=-1;
      }
      setAttr(n.node,'data-lod',budget);setAttr(n.node,'data-era',visualEpoch);setAttr(n.node,'data-owner',a.owner);
      const compositionKey=`${visualEpoch}:${a.owner}:${rosterKey}`;
      if(n.compositionKey!==compositionKey){setAttr(n.node,'aria-label',`${a.owner}: ${composition(a,true)}`);setText(n.composition,composition(a));n.compositionKey=compositionKey;}
      let dx=next.x-pos.x,dy=next.y-pos.y,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len,px=pos.x,py=pos.y;
      if(a.inBattle){const battle=battleByArmy.get(a.id);if(battle){const side=Object.keys(battle.powerRatio||{}).indexOf(a.owner)>0?1:-1;px=battle.x+side*27;py=battle.y;ux=-side;uy=0;}}
      setAttr(n.node,'transform',`translate(${px} ${py})`);
      if(n.revision!==a.revision){const src=s.castles[a.source],dst=s.castles[a.target];const drawn=(!a.returning&&!a.intercept)?CrownAnchors.route(s,a.path,src,dst):a.path;setAttr(n.routePath,'d',CrownAnchors.path(drawn));setAttr(n.routeEndpoint,'cx',a.tx);setAttr(n.routeEndpoint,'cy',a.ty);n.revision=a.revision;}
      const frame=animateUnits?Math.floor(s.time*(a.inBattle?7:5))%2:0;
      if(!animateUnits){ux=Math.round(ux*10000)/10000;uy=Math.round(uy*10000)/10000;}
      const columns=roster.some(t=>t==='cavalry')?2:3,spacing=columns===2?18:11;
      n.units.forEach((unit,i)=>{
        const row=Math.floor(i/columns),side=i%columns-(columns-1)/2,stagger=(i%3-1)*.6;
        const bob=animateUnits?Math.sin(s.time*12+i*2)*.55:0;
        setAttr(unit,'transform',`translate(${-ux*row*12-uy*side*spacing+stagger} ${-uy*row*12+ux*side*spacing+bob}) scale(${ux<0?-.8:.8} .8)`);
        if(n.frame!==frame)unit.setAttribute('href',CrownArmyArt.sprite(roster[i],color,visualEpoch,(frame+i)%2));
      });n.frame=frame;
      setAttr(n.banner,'transform',`translate(${-uy*14} ${ux*14})`);
      n.dust.style.display=!animateUnits||a.inBattle?'none':'';
      if(animateUnits&&!a.inBattle){setAttr(n.dust,'transform',`translate(${-ux*(Math.ceil(roster.length/columns)*12)} ${-uy*22+3})`);n.dustParticles.forEach(e=>setAttr(e,'fill',s.weather?.type==='rain'?'#93aeb1':s.weather?.type==='snow'?'#cbd8d8':'#b1a68a'));}
      setText(n.count,(a.returning?'↩ ':'')+a.count);
      const isFriendly=(typeof myRole!=='undefined')?(a.owner===myRole):(a.owner==='blue');
      if(n.recallPill){
        if(isFriendly&&!a.inBattle){
          n.recallPill.style.display='';
          const pillRect=n.pillRect;
          if(a.returning){
            n.recallPill.style.pointerEvents='none';
            if(pillRect){setAttr(pillRect,'fill','#1e2d3bee');setAttr(pillRect,'stroke','#648da5');}
            setText(n.recallText,(window.CrownI18n?window.CrownI18n.t('ui_returning'):'↩ Qaytmoqda...'));
          }else{
            n.recallPill.style.pointerEvents='auto';
            if(pillRect){setAttr(pillRect,'fill','#8c2527ee');setAttr(pillRect,'stroke','#f0a0a0');}
            setText(n.recallText,(window.CrownI18n?window.CrownI18n.t('ui_nazad'):'↩ Nazad'));
          }
        }else{
          n.recallPill.style.display='none';
        }
      }
      if(n.lastCount>a.count&&animateUnits)n.formation.animate([{opacity:.45},{opacity:1}],{duration:240});
      n.lastCount=a.count;setAttr(n.progress,'width',28*Math.min(1,a.t/a.duration));
    }
  }

  function setDragLine(x1, y1, x2, y2, count) {
    const line = $('dragLine'), head = $('dragHead'), badge = $('dragBadge');
    if (!line || !head || !badge) return;
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
    if (len < 10) { clearDragLine(); return; }
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    line.setAttribute('d', `M${x1} ${y1} L${x2} ${y2}`);
    line.setAttribute('opacity', '1');
    head.setAttribute('transform', `translate(${x2} ${y2}) rotate(${angle - 90})`);
    head.setAttribute('opacity', '1');
    const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2 - 18;
    badge.setAttribute('transform', `translate(${midX} ${midY})`);
    badge.querySelector('text').textContent = `${count} ⚔`;
    badge.setAttribute('opacity', '1');
  }

  function clearDragLine() {
    const line = $('dragLine'), head = $('dragHead'), badge = $('dragBadge');
    if (line) line.setAttribute('opacity', '0');
    if (head) head.setAttribute('opacity', '0');
    if (badge) badge.setAttribute('opacity', '0');
  }

  let lastRoadStateKey = null;
  let currentHoverCastleId = null;
  let lastRenderState = null;

  function syncRoadStates(s, selected, sourceId, hoverCastleId) {
    if (hoverCastleId !== undefined) currentHoverCastleId = hoverCastleId;
    const root = document.querySelector('.strategic-roads');
    if (!root) return;

    const playerRole = (typeof myRole !== 'undefined') ? myRole : 'blue';
    const friendlyEdges = new Set();
    const enemyEdges = new Set();
    if (s && s.armies) {
      for (const a of s.armies) {
        if (a.inBattle) continue;
        const u = Math.min(a.source, a.target), v = Math.max(a.source, a.target);
        const k = `${u}:${v}`;
        if (a.owner === playerRole) friendlyEdges.add(k);
        else enemyEdges.add(k);
      }
    }

    const stateKey = `${sourceId}:${selected}:${currentHoverCastleId}:${[...friendlyEdges].sort().join(',')}:${[...enemyEdges].sort().join(',')}`;
    if (stateKey === lastRoadStateKey) return;
    lastRoadStateKey = stateKey;

    const paths = root.querySelectorAll(':scope > path');
    for (const p of paths) {
      const isBed = p.classList.contains('road-bed');
      const src = +p.getAttribute('data-source');
      const tgt = +p.getAttribute('data-target');
      if (isNaN(src) || isNaN(tgt)) continue;

      const u = Math.min(src, tgt), v = Math.max(src, tgt);
      const edgeKey = `${u}:${v}`;

      if (isBed) {
        p.classList.remove('road-bed-available', 'road-bed-irrelevant', 'road-bed-selected', 'road-bed-hovered', 'road-bed-active-friendly', 'road-bed-active-enemy');
      } else {
        p.classList.remove('road-available', 'road-irrelevant', 'road-selected', 'road-hovered', 'road-active-friendly', 'road-active-enemy');
      }

      const isSelectedRoute = (sourceId !== null && selected !== null && sourceId !== selected && ((src === sourceId && tgt === selected) || (src === selected && tgt === sourceId)));
      const isHoveredRoute = (sourceId !== null && currentHoverCastleId !== null && sourceId !== currentHoverCastleId && ((src === sourceId && tgt === currentHoverCastleId) || (src === currentHoverCastleId && tgt === sourceId)));

      if (isSelectedRoute) {
        p.classList.add(isBed ? 'road-bed-selected' : 'road-selected');
      } else if (isHoveredRoute) {
        p.classList.add(isBed ? 'road-bed-hovered' : 'road-hovered');
      } else if (enemyEdges.has(edgeKey)) {
        p.classList.add(isBed ? 'road-bed-active-enemy' : 'road-active-enemy');
      } else if (friendlyEdges.has(edgeKey)) {
        p.classList.add(isBed ? 'road-bed-active-friendly' : 'road-active-friendly');
      } else if (sourceId !== null) {
        if (src === sourceId || tgt === sourceId) {
          p.classList.add(isBed ? 'road-bed-available' : 'road-available');
        } else {
          p.classList.add(isBed ? 'road-bed-irrelevant' : 'road-irrelevant');
        }
      }
    }
  }

  function setHoverCastle(id) {
    if (currentHoverCastleId !== id) {
      currentHoverCastleId = id;
      if (lastRenderState) {
        syncRoadStates(lastRenderState.s, lastRenderState.selected, lastRenderState.sourceId, currentHoverCastleId);
      }
    }
  }

  function render(s, selected, sourceId, routeMode, hoverCastleId) {
    lastRenderState = { s, selected, sourceId, routeMode };
    if (hoverCastleId !== undefined) currentHoverCastleId = hoverCastleId;
    const activeEpoch = s.epoch || '18th';
    visualEpoch=activeEpoch;
    const sourceAvailable = s.castles[sourceId] ? E.available(s,s.castles[sourceId]) : 0;
    for(const c of s.castles) {
      const key=`${c.owner}:${c.level}:${c.specialty||'balanced'}:${activeEpoch}:${c.type}`, previous=cache.get(c.id);
      if(previous!==key) {
        const region=$('region'+c.id);
        if (region) {
          region.setAttribute('fill',c.owner?`url(#region-${c.owner})`:'none');
          region.setAttribute('stroke',c.owner?colors[c.owner]:'#68756b');
          region.setAttribute('stroke-width',c.owner?'1.6':'.6');
          region.setAttribute('stroke-opacity',c.owner?'.5':'.16');
        }
        const bEl = $('building'+c.id);
        if (bEl) {
          bEl.innerHTML=building(c.type,c.owner,c.level,c.specialty,activeEpoch);
          if(previous && c.level>Number(previous.split(':')[1])){
            bEl.insertAdjacentHTML('beforeend','<ellipse class="construction-feedback" cy="3" rx="53" ry="20" fill="none" stroke="#c7b68c" stroke-width="3" pointer-events="none"/>');
            const effect=bEl.querySelector('.construction-feedback');
            const anim=effect.animate(reducedMotion?[{opacity:.6},{opacity:0}]:[{opacity:.7,transform:'scale(.7)'},{opacity:0,transform:'scale(1.18)'}],{duration:reducedMotion?450:1100,fill:'forwards'});
            if(!reducedMotion){
              const dust=document.createElementNS('http://www.w3.org/2000/svg','g');
              dust.setAttribute('class','construction-dust');dust.setAttribute('fill','#b8ab8e');
              dust.innerHTML=Array.from({length:8},(_,i)=>`<ellipse cx="${Math.cos(i*Math.PI/4)*43}" cy="${Math.sin(i*Math.PI/4)*16+2}" rx="4" ry="2"/>`).join('');
              bEl.append(dust);
              const build=dust.animate([{opacity:0,transform:'translateY(2px)'},{opacity:.45,offset:.2},{opacity:0,transform:'translateY(-9px)'}],{duration:950,fill:'forwards'});
              build.onfinish=()=>dust.remove();
            }
            anim.onfinish=()=>effect.remove();
          }
        }
        const badge = $('badge' + c.id);
        if (badge) {
          badge.setAttribute('fill', `url(#badge-${c.owner || 'neutral'})`);
          badge.setAttribute('stroke', badgeStrokes[c.owner] || badgeStrokes.neutral);
        }
        const cNode = $('castle'+c.id);
        if (cNode) cNode.classList.toggle('just-captured',previous!==undefined && previous.split(':')[0]!==String(c.owner));
        cache.set(c.id,key);
      }
      const isTarget = c.id === selected;
      const isSource = c.id === sourceId;
      const node = $('castle' + c.id);
      if(node && node.dataset.owner !== (c.owner||'neutral'))node.dataset.owner=c.owner||'neutral';
      const detailKey = `${key}:${isTarget}:${isSource}:${s.castles[sourceId]?.owner}:${sourceAvailable}:${c.troops}:${E.defense(s,c)}:${c.level}:${!!c.stabilizing}:${!!c.scorched}:${composition(c, true)}`;
      if (node && castleDetails.get(c.id) !== detailKey) {
        castleDetails.set(c.id,detailKey);
        node.classList.toggle('selected', isTarget);
        node.classList.toggle('source-selected', isSource);
        node.classList.toggle('target-selected', isTarget);
        const source=s.castles[sourceId];
        node.classList.toggle('dangerous',!!source&&c.owner!==source.owner&&c.troops>=sourceAvailable);
        node.classList.toggle('elite-target',c.type==='elite');
        node.classList.toggle('stabilizing', !!(c.stabilizing && c.stabilizing > 0));
        node.classList.toggle('scorched', !!(c.scorched && c.scorched > 0));
        const value=Math.ceil(E.defense(s,c));
        const defense=value>=1000000?(value/1000000).toFixed(1)+'m':value>=10000?(value/1000).toFixed(1)+'k':String(value);
        node.setAttribute('aria-label',`${c.name}, ${E.getCastleRoleName(activeEpoch,c.type)}, ${c.owner||'neutral'}, ${c.troops} troops, level ${c.level}`);
        node.setAttribute('aria-label', node.getAttribute('aria-label') + ', ' + composition(c, true));
        const compNode = $('composition'+c.id);
        if (compNode) compNode.textContent = composition(c);
        const defNode = $('def'+c.id);
        if(defNode && defNode.textContent!==defense) defNode.textContent=defense;
        const starsNode = $('stars' + c.id);
        if (starsNode && starsNode.dataset.level !== String(c.level)) {
          starsNode.dataset.level = String(c.level);
          starsNode.classList.toggle('is-upgraded', c.level > 1);
          starsNode.innerHTML = renderCastleStars(c.level);
        }
      }
    }
    const nextKey=s.castles.map(c=>c.owner).join(',');
    if(nextKey!==ownershipKey) {
      ownershipKey=nextKey;
      $('connections').innerHTML=Object.keys(s.players).map(p=>E.owned(s,p).flatMap((a,i,arr)=>arr.slice(i+1).filter(b=>Math.hypot(a.x-b.x,a.y-b.y)<540).map(b=>`<path d="M${CrownAnchors.gate(s,a).x} ${CrownAnchors.gate(s,a).y}L${CrownAnchors.gate(s,b).x} ${CrownAnchors.gate(s,b).y}" stroke="${colors[p]||'#ffd359'}" stroke-width="2" opacity=".18"/>`)).join('')).join('');
    }
    syncArmies(s);
    syncRoadBattles(s);
    syncDragonStrike(s);
    syncRoadStates(s, selected, sourceId, hoverCastleId);

    const routePreview = $('routePreview');
    if (routePreview) {
      const nextPreviewKey = `${sourceId}:${selected}:${routeMode || (typeof marchRoute !== 'undefined' ? marchRoute : 'fast')}:${s.mapIndex}`;
      if (nextPreviewKey !== previewKey) {
      previewKey = nextPreviewKey;
      if (sourceId !== null && selected !== null && sourceId !== selected && s.castles[sourceId] && s.castles[selected]) {
        const src = s.castles[sourceId], tgt = s.castles[selected];
        const mode = (routeMode || (typeof marchRoute !== 'undefined' ? marchRoute : 'fast')) === 'flank' ? 'flank' : 'fast';
        const pts = CrownAnchors.route(s,E.routeBetween(src, tgt, mode, s.mapIndex || 0),src,tgt);
        if (pts && pts.length) {
          const d = CrownAnchors.path(pts);
          routePreview.setAttribute('d', d);
          routePreview.setAttribute('stroke', mode === 'flank' ? '#9fb8be' : '#82a9c4');
          routePreview.setAttribute('stroke-width', '2.0');
          routePreview.setAttribute('stroke-dasharray', '7 5');
          routePreview.setAttribute('opacity', '0.82');
        } else {
          routePreview.setAttribute('d', '');
        }
      } else {
        routePreview.setAttribute('d', '');
      }
    }

    }
    syncEffects(s);

    if (s.weather) {
      const atmo = $('weatherAtmosphere');
      if (atmo) {
        const expectedClass = `weather-atmosphere weather-${s.weather.type || 'clear'}`;
        if (atmo.className !== expectedClass) {
          atmo.className = expectedClass;
        }
      }
      const mapEl = $('map');
      if (mapEl && mapEl.getAttribute('data-weather') !== (s.weather.type || 'clear')) {
        mapEl.setAttribute('data-weather', s.weather.type || 'clear');
      }
      WeatherFX.setWeather(s.weather.type || 'clear');
    }
  }

  /* =========================================================================
     CROWNFALL VISUAL WEATHER SYSTEM & TRANSITIONS (CANVAS PARTICLE ENGINE)
     ========================================================================= */
  const WeatherFX = (function () {
    let canvas, ctx;
    let particles = [];
    let splashes = [];
    let initialized = false, cleared = false;
    let lastTime = 0;
    let curWeather = 'clear';
    let targetWeather = 'clear';
    let transitionProgress = 1.0;
    let groundWetness = 0.0;
    let targetWetness = 0.0;
    let lastFlash = 0;

    function init() {
      if (typeof document === 'undefined' || initialized) return;
      canvas = document.getElementById('weatherCanvas');
      if (!canvas || !canvas.getContext) return;
      ctx = canvas.getContext('2d');
      if (!ctx) return;
      resize();
      window.addEventListener('resize', resize, { passive: true });
      initParticles();
      initialized = true;
    }

    function resize() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(300, Math.round(rect.width || window.innerWidth || 800));
      const h = Math.max(300, Math.round(rect.height || window.innerHeight || 600));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    }

    function initParticles() {
      particles = [];
      splashes = [];
      const count = qualityLevel === 'low' ? 0 : qualityLevel === 'medium' ? 22 : 45;
      const w = canvas ? canvas.width : 800;
      const h = canvas ? canvas.height : 600;
      for (let i = 0; i < count; i++) {
        const isFg = Math.random() < 0.40;
        particles.push({
          x: Math.random() * (w + 200) - 100,
          y: Math.random() * (h + 100) - 50,
          isFg,
          speed: isFg ? 720 + Math.random() * 150 : 580 + Math.random() * 140,
          len: isFg ? 13 + Math.random() * 4 : 8 + Math.random() * 4,
          sway: Math.random() * Math.PI * 2,
          r: isFg ? 1.4 : 1.0
        });
      }
    }

    function setWeather(type) {
      const normalized = (type === 'rain' || type === 'heavy_rain') ? 'rain' : type;
      if (normalized === targetWeather) return;
      curWeather = targetWeather;
      targetWeather = normalized;
      transitionProgress = 0.0;
      targetWetness = (normalized === 'rain' || normalized === 'storm') ? 1.0 : normalized === 'light_rain' ? 0.6 : 0.0;
    }

    function flashLightning() {
      const flashEl = document.getElementById('weatherLightningFlash');
      if (!flashEl) return;
      flashEl.style.opacity = '0.22';
      setTimeout(() => {
        flashEl.style.opacity = '0';
        setTimeout(() => {
          flashEl.style.opacity = '0.14';
          setTimeout(() => { flashEl.style.opacity = '0'; }, 40);
        }, 40);
      }, 50);
    }

    function loop(now) {
      if (!document.body.classList.contains('in-game')) { lastTime = now; return; }
      if (typeof document !== 'undefined' && document.hidden) {
        lastTime = now;
        return;
      }
      if (!canvas || !ctx || qualityLevel === 'low') {
        if (ctx && canvas && !cleared) { ctx.clearRect(0, 0, canvas.width, canvas.height); cleared = true; }
        lastTime = now;
        return;
      }
      const dt = Math.min(0.08, (now - lastTime) / 1000);
      if (targetWeather === 'clear' && curWeather === 'clear' && groundWetness === 0) {
        if (!cleared) { ctx.clearRect(0,0,canvas.width,canvas.height); cleared=true; }
        lastTime=now; return;
      }
      cleared = false;
      lastTime = now;

      if (transitionProgress < 1.0) {
        transitionProgress = Math.min(1.0, transitionProgress + dt / 2.5);
      }
      if (groundWetness < targetWetness) {
        groundWetness = Math.min(targetWetness, groundWetness + dt / 3.5);
      } else if (groundWetness > targetWetness) {
        groundWetness = Math.max(targetWetness, groundWetness - dt / 7.0);
      }

      const mapEl = document.getElementById('map');
      if (mapEl) {
        mapEl.style.setProperty('--weather-wetness', groundWetness.toFixed(2));
      }

      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const activeType = transitionProgress > 0.4 ? targetWeather : curWeather;
      const intensity = transitionProgress < 0.4 ? (1.0 - transitionProgress * 2.5) : ((transitionProgress - 0.4) * 1.66);

      if (activeType === 'rain' || activeType === 'heavy_rain' || activeType === 'light_rain' || activeType === 'storm') {
        const isStorm = activeType === 'storm';
        const isLight = activeType === 'light_rain';
        const angle = isStorm ? -0.26 : -0.18;
        const colorBg = 'rgba(165, 185, 202, ';
        const colorFg = 'rgba(178, 198, 214, ';

        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          const speed = isStorm ? p.speed * 1.25 : isLight ? p.speed * 0.75 : p.speed;
          p.y += speed * dt;
          p.x += speed * Math.sin(angle) * dt;
          if (p.y > h) {
            p.y = -18;
            p.x = Math.random() * (w + 150) - 50;
            if (splashes.length < 8 && (activeType === 'rain' || isStorm) && p.isFg) {
              splashes.push({ x: p.x, y: h - 6 + Math.random() * 6, r: 1.5, maxR: 5 + Math.random() * 3, life: 1 });
            }
          }
          if (p.x < -80) p.x = w + 40;

          const pLen = isStorm ? p.len * 1.2 : isLight ? p.len * 0.8 : p.len;
          const alpha = (p.isFg ? (isStorm ? 0.16 : 0.11) : (isStorm ? 0.10 : 0.07)) * intensity;
          ctx.lineWidth = p.isFg ? (isStorm ? 1.0 : 0.8) : 0.6;
          ctx.strokeStyle = (p.isFg ? colorFg : colorBg) + alpha + ')';
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + Math.sin(angle) * pLen, p.y + pLen);
          ctx.stroke();
        }

        for (let i = splashes.length - 1; i >= 0; i--) {
          const sp = splashes[i];
          sp.r += (sp.maxR - sp.r) * 10 * dt;
          sp.life -= 4.0 * dt;
          if (sp.life <= 0) { splashes.splice(i, 1); continue; }
          ctx.beginPath();
          ctx.ellipse(sp.x, sp.y, sp.r, sp.r * 0.35, 0, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(170, 195, 215, ${sp.life * 0.08 * intensity})`;
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }

        if (isStorm && !(typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
          if (now - lastFlash > 14000 + Math.random() * 8000) {
            lastFlash = now;
            flashLightning();
          }
        }
      } else if (activeType === 'snow') {
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          p.y += 85 * dt;
          p.sway += 2.2 * dt;
          p.x += Math.sin(p.sway) * 32 * dt;
          if (p.y > h) { p.y = -8; p.x = Math.random() * w; }
          if (p.x < 0) p.x = w;
          if (p.x > w) p.x = 0;

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(240, 250, 255, ${(0.35 + 0.15 * Math.sin(p.sway)) * intensity})`;
          ctx.fill();
        }
      } else if (activeType === 'fog') {
        for (let i = 0; i < Math.min(particles.length, 16); i++) {
          const p = particles[i];
          p.x += 16 * dt;
          if (p.x > w + 140) p.x = -140;
          const grad = ctx.createRadialGradient(p.x, p.y, 8, p.x, p.y, 110);
          grad.addColorStop(0, `rgba(200, 225, 240, ${0.035 * intensity})`);
          grad.addColorStop(1, 'rgba(200, 225, 240, 0)');
          ctx.fillStyle = grad;
          ctx.fillRect(p.x - 110, p.y - 110, 220, 220);
        }
      }
    }

    return {
      init,
      setWeather,
      update: loop,
      setQuality: () => initParticles(),
      getWetness: () => groundWetness
    };
  })();

  function setQuality(lvl) {
    if (typeof lvl === 'boolean') lvl = lvl ? 'low' : 'high';
    if (['low', 'medium', 'high'].includes(lvl)) {
      const changed=qualityLevel!==lvl;
      qualityLevel = lvl;
      document.body.dataset.quality = lvl;
      WeatherFX.setQuality();
      if(changed&&lastRenderState){
        const s=lastRenderState.s,vis=MAP_VISUALS[s.mapIndex||0]||MAP_VISUALS[0];
        const dressing=document.querySelector('#map .quality-dressing'),props=document.querySelector('#map .epoch-props');
        if(dressing)dressing.innerHTML=Style.dressing(s,vis,lvl);
        if(props)props.innerHTML=Style.material(generateEpochProps(s,s.epoch||'18th',lvl==='low'?12:lvl==='medium'?32:55,Style.clearance(s,vis)));
      }
    }
  }

  function loadMatchTerrain() {
    if (typeof document === 'undefined') return;
    for (const el of document.querySelectorAll('.war-ground[data-deferred-src]')) {
      const src = el.getAttribute('data-deferred-src');
      if (src) {
        el.setAttribute('href', src);
        el.removeAttribute('data-deferred-src');
      }
    }
  }

  window.CrownView = {
    init: s => {
      init(s);
      WeatherFX.init();
      if (s.weather) WeatherFX.setWeather(s.weather.type || 'clear');
    },
    render,
    loadMatchTerrain,
    updateWeather: now => WeatherFX.update(now),
    building,
    portrait,
    setDragLine,
    clearDragLine,
    setQuality,
    composition,
    setAnchorDebug: enabled => $('map').classList.toggle('show-anchors', !!enabled),
    getQuality: () => qualityLevel,
    syncRoadStates,
    setHoverCastle
  };
})();
