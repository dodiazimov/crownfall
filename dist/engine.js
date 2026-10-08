(function(root){
'use strict';
const VERSION=5, SPEED=85, CONTACT=12, MAX_RESOURCE=1e12;
const MAP_BOUNDS=Object.freeze({minX:0,maxX:2200,minY:0,maxY:1500});
const clampMapPoint=p=>({x:clamp(p.x,MAP_BOUNDS.minX,MAP_BOUNDS.maxX),y:clamp(p.y,MAP_BOUNDS.minY,MAP_BOUNDS.maxY)});
const MAX_CASTLE_LEVEL=5, UPGRADE_COSTS=Object.freeze([100,220,400,650]);
const addResource=(a,b)=>Math.min(MAX_RESOURCE,a+b);
const TYPES={main:{name:'Main Castle',color:'#359ef5',def:420},gold:{name:'Gold Castle',color:'#ecba35',def:100},troop:{name:'Troop Castle',color:'#56a56c',def:120},archer:{name:'Defense Tower',color:'#74c3b2',def:150},knight:{name:'Assault Keep',color:'#d95c6d',def:220},elite:{name:'Elite Citadel',color:'#a66ade',def:450},small:{name:'Watch Keep',color:'#bdc6b9',def:50},cavalry:{name:'Mobility Keep',color:'#e67e22',def:180}};
const EPOCHS={
  '17th':{id:'17th',name:'17th Century',period:'1600s · Early Modern',desc:'Pike & Shot era with stone keeps, arquebusiers, armored pikemen and mud trails',castles:{main:'Stone Keep',troop:'Garrison Hold',archer:'Defense Tower',knight:'Assault Keep',cavalry:'Mobility Keep',gold:'Merchant Keep',elite:'Grand Citadel',small:'Watch Post'}},
  '18th':{id:'18th',name:'18th Century',period:'1700s · Age of Reason',desc:'Star fortresses, line infantry, rifle skirmishers, and gravel military roads',castles:{main:'Garrison Fort',troop:'Barracks Fort',archer:'Gun Fort',knight:'Heavy Barracks',cavalry:'Cavalry Depot',gold:'Trade Center',elite:'Star Fortress',small:'Picket Redoubt'}},
  '19th':{id:'19th',name:'19th Century',period:'1800s · Industrial Age',desc:'Industrial strongholds, breechloaders, artillery batteries, and cobbled highways',castles:{main:'Military Fort',troop:'Arsenal Depot',archer:'Artillery Battery',knight:'Fortified Garrison',cavalry:'Mounted Depot',gold:'Industrial Stronghold',elite:'Grand Fortress',small:'Telegraph Outpost'}},
  '20th':{id:'20th',name:'20th Century',period:'1900s · Modern Warfare',desc:'Concrete bunkers, trench warfare, fire support teams, and motorized transport',castles:{main:'Military Outpost',troop:'Troop Base',archer:'Fire Support Base',knight:'Bunker Complex',cavalry:'Motorized Depot',gold:'Supply Hub',elite:'Command HQ',small:'Radar Sentry'}}
};
const ERAS=EPOCHS;
const REGIONS={
  europe:{id:'europe',name:'Europe',desc:'Continental plains, river bridges, and strategic star fortress lines.'},
  asia:{id:'asia',name:'Asia',desc:'Dynastic palaces, Great Wall fortifications, and ancient silk passes.'},
  americas:{id:'americas',name:'Americas',desc:'Coastal archipelagos, frontier forts, and hemispheric crossroads.'}
};
function getCastleRoleName(epochId,type){const ep=EPOCHS[epochId]||EPOCHS['18th'];return ep.castles[type]||TYPES[type]?.name||type;}

const NODE_CATEGORIES = {
  gold: {
    id: 'gold',
    name: 'Gold Node',
    nameKey: 'node_gold_name',
    icon: '🪙',
    svgIcon: 'icon-coin',
    themeColor: '#d4b35f',
    baseYield: '+1.0 🪙/s',
    buffTitle: 'Treasury Wealth',
    buffDesc: 'High gold yield (+4-22 🪙/s); finances upgrades and fortifications.',
    buffShort: '+1.0 🪙/s · Gold',
    scope: 'Faction Economy',
    tag: 'ECONOMY',
    tip: 'Secure early to finance castle upgrades.'
  },
  troop: {
    id: 'troop',
    name: 'Troop Node',
    nameKey: 'node_troop_name',
    icon: '⚔️',
    svgIcon: 'icon-swords',
    themeColor: '#5fa879',
    baseYield: '+4.0 ⚔/s',
    buffTitle: 'Mass Conscription',
    buffDesc: 'High troop replenishment (+4-22 ⚔/s); continuous frontline manpower.',
    buffShort: '+4.0 ⚔/s · Troop',
    scope: 'Local Garrison',
    tag: 'MANPOWER',
    tip: 'Primary troop engine. Capture to sustain massive multi-pronged offensives.'
  },
  defense: {
    id: 'defense',
    name: 'Defense Node',
    nameKey: 'node_defense_name',
    icon: '🛡️',
    svgIcon: 'icon-shield',
    themeColor: '#5c9dc4',
    baseYield: '+1.0 ⚔/s',
    buffTitle: 'Bastion Redoubt',
    buffDesc: '+15% local defense at Defense Towers; Watch Keeps grant +20% local defense and +15% defense to nearby allied castles.',
    buffShort: '+15% DEF · Aura',
    scope: 'Connected Allies',
    tag: 'DEFENSE',
    tip: 'Critical defensive anchor. Deters enemy marches and fortifies adjacent allies.'
  },
  attack: {
    id: 'attack',
    name: 'Military Node',
    nameKey: 'node_attack_name',
    icon: '🚩',
    svgIcon: 'icon-swords',
    themeColor: '#c75d65',
    baseYield: '+2.0 ⚔/s',
    buffTitle: 'Heavy Siege & Assault',
    buffDesc: '+25% march speed and +20% siege strength for departing armies.',
    buffShort: '+25% SPD · +20% ATK',
    scope: 'Departing Armies',
    tag: 'ASSAULT',
    tip: 'Offensive staging ground. Launch assaults from here to smash enemy garrisons.'
  },
  support: {
    id: 'support',
    name: 'Support Node',
    nameKey: 'node_support_name',
    icon: '🐎',
    svgIcon: 'icon-route',
    themeColor: '#d98b48',
    baseYield: '+2.0 ⚔/s',
    buffTitle: 'Swift March & Mobility',
    buffDesc: '+25% march speed for departing armies.',
    buffShort: '+25% SPD · Swift',
    scope: 'Departing Routes',
    tag: 'MOBILITY',
    tip: 'Mobility hub. Rapid response across the map and deadly flanking capability.'
  },
  capital: {
    id: 'capital',
    name: 'Citadel / Capital',
    nameKey: 'node_capital_name',
    icon: '👑',
    svgIcon: 'icon-crown',
    themeColor: '#b58ae0',
    baseYield: '+3.0 ⚔/s · +1.0 🪙/s',
    buffTitle: 'Imperial Dominion',
    buffDesc: 'Faction headquarters and victory core; provides +1.0 ⚔/s to its own garrison.',
    buffShort: '👑 Capital Core',
    scope: 'Local Garrison',
    tag: 'VICTORY CORE',
    tip: 'Highest strategic priority. Defend your capital and seize the center for victory.'
  }
};

function getNodeCategory(type) {
  if (type === 'gold') return NODE_CATEGORIES.gold;
  if (type === 'troop') return NODE_CATEGORIES.troop;
  if (type === 'archer' || type === 'small') return NODE_CATEGORIES.defense;
  if (type === 'knight') return NODE_CATEGORIES.attack;
  if (type === 'cavalry') return NODE_CATEGORIES.support;
  if (type === 'main' || type === 'elite') return NODE_CATEGORIES.capital;
  return NODE_CATEGORIES.defense;
}

function hasConnectedDefenseNode(s, castleId, owner) {
  if (!s || !owner) return false;
  const c = s.castles[castleId];
  if (!c) return false;
  return s.castles.some(d => d.id !== castleId && d.owner === owner && d.type === 'small' && Math.hypot(d.x - c.x, d.y - c.y) <= 520);
}

function getCastleStrategicInfo(castle, epochId = '18th', s = null) {
  if (!castle) return null;
  const category = getNodeCategory(castle.type);
  const eraName = getCastleRoleName(epochId, castle.type);
  const owner = castle.owner;
  const hero = s?.players?.[owner]?.hero;
  const inc = incomeFor(castle, castle.level || 1, castle.specialty || 'balanced', hero);

  let specificBuff = category.buffDesc;
  let specificYield = `+${inc.troops.toFixed(1)} ⚔/s · +${inc.gold.toFixed(1)} 🪙/s`;
  let tacticalAdvice = category.tip;
  let shortYield = `+${inc.troops.toFixed(0)} ⚔/s`;

  if (castle.type === 'gold') {
    shortYield = `+${inc.gold.toFixed(0)} 🪙/s`;
    specificYield = `+${inc.gold.toFixed(1)} 🪙/s (Gold) · +${inc.troops.toFixed(1)} ⚔/s`;
    specificBuff = 'Treasury Wealth: High gold yield (+4-22 🪙/s); finances castle upgrades.';
    tacticalAdvice = 'High economic value. Seize to build a decisive technological and numerical lead.';
  } else if (castle.type === 'troop') {
    shortYield = `+${inc.troops.toFixed(0)} ⚔/s`;
    specificYield = `+${inc.troops.toFixed(1)} ⚔/s (Troops) · +${inc.gold.toFixed(1)} 🪙/s`;
    specificBuff = 'Mass Conscription: Faster automatic garrison replenishment; feeds frontline armies.';
    tacticalAdvice = 'Manpower powerhouse. Capture to flood the map with reinforcements.';
  } else if (castle.type === 'archer') {
    shortYield = '+15% DEF';
    specificBuff = 'Bastion Defense: +15% local garrison defense.';
    tacticalAdvice = 'Deadly defensive strongpoint. Highly resistant to direct frontal assaults.';
  } else if (castle.type === 'small') {
    shortYield = '+20% DEF';
    specificBuff = 'Frontier Redoubt: +20% garrison defense; +15% defense aura to connected allied castles.';
    tacticalAdvice = 'Key outpost. Capturing fortifies surrounding friendly castles against enemy pushes.';
  } else if (castle.type === 'knight') {
    shortYield = '+25% SPD';
    specificBuff = 'Assault Keep: Departing armies march +25% faster and gain +20% siege strength.';
    tacticalAdvice = 'Offensive battering ram. Stage attacks from here to crack fortified enemy citadels.';
  } else if (castle.type === 'cavalry') {
    shortYield = '+25% SPD';
    specificBuff = 'Mobility Keep: Departing armies gain Swift March (+25% speed).';
    tacticalAdvice = 'Strategic mobility pivot. Enables rapid reinforcement and sudden flank attacks.';
  } else if (castle.type === 'elite') {
    shortYield = '👑 Citadel';
    specificBuff = 'Grand Citadel: Imperial dominion (+1.0 ⚔/s to this garrison) and Crown victory core.';
    tacticalAdvice = 'The jewel of the realm. Control to dominate the battlefield and secure victory.';
  } else if (castle.type === 'main') {
    shortYield = '👑 Capital';
    specificBuff = 'Capital Fortress: Core faction seat and primary bastion. Losing this severely weakens your realm.';
    tacticalAdvice = 'Vital headquarters. Defend at all costs.';
  }

  const text=(key,fallback)=>root.CrownI18n?.TRANSLATIONS?.[root.CrownI18n.getLanguage?.()||'en']?.[key]||fallback;
  const scopeKey=castle.type==='gold'?'economy':castle.type==='small'?'nearby':['knight','cavalry'].includes(castle.type)?'army':'local';
  const shortBuff=castle.type==='archer'?'+15% DEF':castle.type==='small'?'+20% DEF · +15% Aura':castle.type==='knight'?'+25% SPD · +20% ATK':category.buffShort;
  return {
    category,
    categoryName: category.name,
    icon: category.icon,
    svgIcon: category.svgIcon,
    themeColor: category.themeColor,
    eraName,
    tag: category.tag,
    scope: text(`buff_scope_${scopeKey}`,category.scope),
    buffTitle: category.buffTitle,
    buffDesc: text(`buff_${castle.type}_desc`,specificBuff),
    buffShort: shortBuff,
    yieldText: specificYield,
    shortYield,
    tacticalAdvice
  };
}
const WEATHER_TYPES={
  clear:{id:'clear',name:'Clear Sky',icon:'☀️',speedMod:1.0,desc:'Ideal conditions'},
  rain:{id:'rain',name:'Heavy Rain',icon:'🌧️',speedMod:0.75,desc:'Muddy roads (-25% speed)'},
  fog:{id:'fog',name:'Dense Fog',icon:'🌫️',speedMod:1.0,flankSpeedMod:1.20,desc:'Mist cover (+20% flank speed)'},
  snow:{id:'snow',name:'Blizzard',icon:'❄️',speedMod:1.0,desc:'Snowfall across the battlefield'}
};
const HEROES={
  vanguard:{id:'vanguard',icon:'🗡️',name:'Al-Muzaffar',role:'Vanguard',speedMod:1.15,combatMod:1.10},
  fortifier:{id:'fortifier',icon:'🛡️',name:'Grand Fortifier',role:'Fortifier',discountPct:0.25,bonusDefTroops:0.5},
  guildmaster:{id:'guildmaster',icon:'💰',name:'Guildmaster',role:'Guildmaster',startGoldBonus:150,goldIncomeMod:1.30},
  infiltrator:{id:'infiltrator',icon:'🏹',name:'Shadow Infiltrator',role:'Infiltrator',flankSpeedMod:1.25,flankSiegeMod:1.20}
};
const RATES={main:[3,5,8,11,15],troop:[4,7,11,15,20],gold:[.5,1,1.5,2,2.5],small:[1,1.5,2,2.5,3],archer:[1,2,3,4,5],knight:[2,3,5,7,9],cavalry:[2,3,5,7,9],elite:[3,5,8,11,15]};
const PLAYER_KEYS=['blue','red','green','purple'];
const MAP_NAMES=[
  "The Verdant Isles (2 O'yinchi)",
  "Crossroads of Kings (2 O'yinchi)",
  "Archipelago of Three Bridges (2 O'yinchi)",
  "The Iron Gorge (2 O'yinchi)",
  "The Sunken Atoll (2 O'yinchi)",
  "Tri-Island Caldera (3 O'yinchi)",
  "Delta of Three Warlords (3 O'yinchi)",
  "Crossroads of Four Kings (4 O'yinchi)",
  "Four Realms Atoll (4 O'yinchi)",
  "Europe: Napoleonic Era (2 O'yinchi)",
  "Empires of the Orient (3 O'yinchi)"
];
const MAP_PLAYERS=[2, 2, 2, 2, 2, 3, 3, 4, 4, 2, 3];
const MAPS=[
  [
    [
      "main",
      "Azurehold",
      290,
      746
    ],
    [
      "main",
      "Crimson Keep",
      1910,
      746
    ],
    [
      "gold",
      "Amber Mine",
      460,
      440
    ],
    [
      "gold",
      "Ember Bank",
      1740,
      440
    ],
    [
      "gold",
      "Sunstone",
      850,
      344
    ],
    [
      "gold",
      "Kingsgilt",
      1350,
      344
    ],
    [
      "troop",
      "Greenwatch",
      590,
      790
    ],
    [
      "troop",
      "Briar Fort",
      1610,
      790
    ],
    [
      "small",
      "Westreach",
      350,
      1054
    ],
    [
      "small",
      "Eastwatch",
      1850,
      1054
    ],
    [
      "archer",
      "Willow Spire",
      710,
      1040
    ],
    [
      "archer",
      "Thorn Spire",
      1490,
      1040
    ],
    [
      "knight",
      "Moonstone",
      880,
      580
    ],
    [
      "knight",
      "Ironcrest",
      1320,
      580
    ],
    [
      "troop",
      "Mossguard",
      850,
      1150
    ],
    [
      "elite",
      "The Violet Crown",
      1100,
      850
    ],
    [
      "troop",
      "Oakheart",
      1350,
      1150
    ],
    [
      "small",
      "Northpass",
      660,
      284
    ],
    [
      "small",
      "Stonewatch",
      1540,
      284
    ],
    [
      "cavalry",
      "Royal Stables",
      570,
      1270
    ],
    [
      "cavalry",
      "Windrider Stables",
      1630,
      1270
    ]
  ],
  [
    [
      "main",
      "Azurehold",
      260,
      690
    ],
    [
      "main",
      "Crimson Keep",
      1940,
      690
    ],
    [
      "gold",
      "Northwest Vault",
      430,
      300
    ],
    [
      "gold",
      "Northeast Vault",
      1770,
      300
    ],
    [
      "troop",
      "Highland Fort",
      770,
      250
    ],
    [
      "troop",
      "Sunspire Fort",
      1430,
      250
    ],
    [
      "knight",
      "Western Rampart",
      650,
      560
    ],
    [
      "knight",
      "Eastern Rampart",
      1550,
      560
    ],
    [
      "small",
      "West Harbor",
      310,
      1090
    ],
    [
      "small",
      "East Harbor",
      1890,
      1090
    ],
    [
      "archer",
      "Crossroads Spire",
      820,
      690
    ],
    [
      "archer",
      "Border Spire",
      1380,
      690
    ],
    [
      "gold",
      "Southwest Mine",
      470,
      1090
    ],
    [
      "gold",
      "Southeast Mine",
      1730,
      1090
    ],
    [
      "troop",
      "Valeguard",
      725,
      1140
    ],
    [
      "elite",
      "The Imperial Citadel",
      1100,
      690
    ],
    [
      "troop",
      "Shadowguard",
      1475,
      1140
    ],
    [
      "small",
      "Northern Watch",
      640,
      160
    ],
    [
      "small",
      "Horizon Watch",
      1560,
      160
    ],
    [
      "cavalry",
      "South Chevalier Keep",
      875,
      845
    ],
    [
      "cavalry",
      "Dusk Chevalier Keep",
      1325,
      845
    ]
  ],
  [
    [
      "main",
      "Azurehold",
      260,
      760
    ],
    [
      "main",
      "Crimson Keep",
      1940,
      760
    ],
    [
      "troop",
      "North Channel Fort",
      500,
      380
    ],
    [
      "troop",
      "Storm Channel Fort",
      1700,
      380
    ],
    [
      "archer",
      "North Bridge Spire",
      840,
      380
    ],
    [
      "archer",
      "Gale Bridge Spire",
      1360,
      380
    ],
    [
      "knight",
      "Central Outpost",
      560,
      760
    ],
    [
      "knight",
      "Crown Outpost",
      1640,
      760
    ],
    [
      "gold",
      "South Reef Mine",
      500,
      1140
    ],
    [
      "gold",
      "Sunken Gold Mine",
      1700,
      1140
    ],
    [
      "cavalry",
      "South Bridge Stables",
      840,
      1140
    ],
    [
      "cavalry",
      "Tide Bridge Stables",
      1360,
      1140
    ],
    [
      "gold",
      "Isle Haven",
      760,
      600
    ],
    [
      "gold",
      "Kings Haven",
      1440,
      600
    ],
    [
      "troop",
      "Delta Guard",
      760,
      920
    ],
    [
      "elite",
      "The Delta Bastion",
      1100,
      760
    ],
    [
      "troop",
      "River Guard",
      1440,
      920
    ],
    [
      "small",
      "North Beacon",
      360,
      280
    ],
    [
      "small",
      "East Beacon",
      1840,
      280
    ],
    [
      "small",
      "South Sentry",
      360,
      1240
    ],
    [
      "small",
      "Coast Sentry",
      1840,
      1240
    ]
  ],
  [
    [
      "main",
      "Azurehold",
      250,
      700
    ],
    [
      "main",
      "Crimson Keep",
      1950,
      700
    ],
    [
      "knight",
      "Dragon Gate Fort",
      840,
      360
    ],
    [
      "knight",
      "Wyrm Gate Fort",
      1360,
      360
    ],
    [
      "cavalry",
      "Iron Gate Stables",
      840,
      1050
    ],
    [
      "cavalry",
      "Steel Gate Stables",
      1360,
      1050
    ],
    [
      "troop",
      "West Mountain Camp",
      510,
      360
    ],
    [
      "troop",
      "East Mountain Camp",
      1690,
      360
    ],
    [
      "troop",
      "West Quarry Camp",
      510,
      1050
    ],
    [
      "troop",
      "East Quarry Camp",
      1690,
      1050
    ],
    [
      "archer",
      "Cliffside Perch",
      700,
      700
    ],
    [
      "archer",
      "Cragside Perch",
      1500,
      700
    ],
    [
      "gold",
      "Silver Vein",
      440,
      140
    ],
    [
      "gold",
      "Gold Vein",
      1760,
      140
    ],
    [
      "gold",
      "Deep Lode",
      440,
      1260
    ],
    [
      "elite",
      "High Crag Spire",
      1100,
      700
    ],
    [
      "gold",
      "Rich Lode",
      1760,
      1260
    ],
    [
      "small",
      "Eagle Lookout",
      900,
      140
    ],
    [
      "small",
      "Falcon Lookout",
      1300,
      140
    ],
    [
      "small",
      "Cavern Sentry",
      900,
      1260
    ],
    [
      "small",
      "Shadow Sentry",
      1300,
      1260
    ]
  ],
  [
    [
      "main",
      "Azurehold",
      260,
      760
    ],
    [
      "main",
      "Crimson Keep",
      1940,
      760
    ],
    [
      "gold",
      "Coral Mine",
      440,
      440
    ],
    [
      "gold",
      "Pearl Mine",
      1760,
      440
    ],
    [
      "archer",
      "North Reef Spire",
      760,
      300
    ],
    [
      "archer",
      "North Atoll Spire",
      1440,
      300
    ],
    [
      "troop",
      "Lagoon Outpost",
      480,
      760
    ],
    [
      "troop",
      "Abyss Outpost",
      1720,
      760
    ],
    [
      "gold",
      "Tidal Hollow",
      440,
      1080
    ],
    [
      "gold",
      "Siren Hollow",
      1760,
      1080
    ],
    [
      "cavalry",
      "South Reef Stables",
      760,
      1220
    ],
    [
      "cavalry",
      "South Atoll Stables",
      1440,
      1220
    ],
    [
      "knight",
      "West Atoll Keep",
      920,
      260
    ],
    [
      "knight",
      "East Atoll Keep",
      1280,
      260
    ],
    [
      "knight",
      "Shoal Bastion",
      920,
      1260
    ],
    [
      "elite",
      "The Sunken Shrine",
      1100,
      220
    ],
    [
      "knight",
      "Ocean Bastion",
      1280,
      1260
    ],
    [
      "small",
      "North Cay Sentry",
      600,
      320
    ],
    [
      "small",
      "North Shore Sentry",
      1600,
      320
    ],
    [
      "small",
      "South Cay Sentry",
      600,
      1200
    ],
    [
      "small",
      "South Shore Sentry",
      1600,
      1200
    ]
  ],
  [
    [
      "main",
      "Azurehold",
      400,
      1160
    ],
    [
      "main",
      "Crimson Keep",
      1800,
      1160
    ],
    [
      "main",
      "Emerald Bastion",
      1100,
      300
    ],
    [
      "gold",
      "Sapphire Coast",
      320,
      760
    ],
    [
      "gold",
      "Ruby Coast",
      1880,
      760
    ],
    [
      "troop",
      "Emerald Barracks",
      1100,
      540
    ],
    [
      "troop",
      "West Delta Fort",
      660,
      1080
    ],
    [
      "troop",
      "East Delta Fort",
      1540,
      1080
    ],
    [
      "archer",
      "Highland Spire",
      840,
      480
    ],
    [
      "knight",
      "Storm Bastion",
      1360,
      480
    ],
    [
      "archer",
      "West Watchtower",
      600,
      760
    ],
    [
      "archer",
      "East Watchtower",
      1600,
      760
    ],
    [
      "knight",
      "Shield Bastion",
      760,
      900
    ],
    [
      "knight",
      "Sword Bastion",
      1440,
      900
    ],
    [
      "gold",
      "Sunken Vault",
      1100,
      1240
    ],
    [
      "elite",
      "The Tri-Crown Citadel",
      1100,
      800
    ],
    [
      "small",
      "South Channel Sentry",
      880,
      1220
    ],
    [
      "small",
      "Ocean Channel Sentry",
      1320,
      1220
    ],
    [
      "cavalry",
      "Northwest Stables",
      520,
      440
    ],
    [
      "cavalry",
      "Northeast Stables",
      1680,
      440
    ],
    [
      "cavalry",
      "Crown Stables",
      1100,
      1020
    ]
  ],
  [
    [
      "main",
      "Azurehold",
      340,
      980
    ],
    [
      "main",
      "Crimson Keep",
      1860,
      980
    ],
    [
      "main",
      "Emerald Bastion",
      1100,
      320
    ],
    [
      "gold",
      "Lagoon Mine",
      480,
      640
    ],
    [
      "gold",
      "Crimson Lode",
      1720,
      640
    ],
    [
      "troop",
      "Sunken Fort",
      1100,
      580
    ],
    [
      "troop",
      "River Guard",
      680,
      920
    ],
    [
      "troop",
      "Marsh Guard",
      1520,
      920
    ],
    [
      "archer",
      "Willow Sentry",
      700,
      440
    ],
    [
      "archer",
      "Briar Sentry",
      1500,
      440
    ],
    [
      "knight",
      "Western Keep",
      520,
      1200
    ],
    [
      "knight",
      "Eastern Keep",
      1680,
      1200
    ],
    [
      "cavalry",
      "Southshore Stables",
      820,
      1180
    ],
    [
      "cavalry",
      "Deepwater Stables",
      1380,
      1180
    ],
    [
      "cavalry",
      "Westreach Stables",
      320,
      400
    ],
    [
      "elite",
      "The Delta Bastion",
      1100,
      820
    ],
    [
      "cavalry",
      "Eastreach Stables",
      1880,
      400
    ],
    [
      "archer",
      "North Ridge Spire",
      860,
      260
    ],
    [
      "knight",
      "Sky Ridge Bastion",
      1340,
      260
    ],
    [
      "gold",
      "Delta Gilt",
      860,
      680
    ],
    [
      "gold",
      "Crown Gilt",
      1340,
      680
    ]
  ],
  [
    [
      "main",
      "Azurehold",
      331,
      240
    ],
    [
      "main",
      "Crimson Keep",
      1867,
      239
    ],
    [
      "main",
      "Emerald Bastion",
      309,
      1117
    ],
    [
      "main",
      "Violet Spire",
      1895,
      1115
    ],
    [
      "gold",
      "Northwest Vault",
      666,
      188
    ],
    [
      "gold",
      "Northeast Vault",
      1533,
      194
    ],
    [
      "troop",
      "Highland Fort",
      339,
      519
    ],
    [
      "troop",
      "Sunspire Fort",
      1866,
      519
    ],
    [
      "knight",
      "Western Rampart",
      681,
      475
    ],
    [
      "cavalry",
      "Sunspire Stables",
      1505,
      473
    ],
    [
      "archer",
      "Northwest Perch",
      890,
      321
    ],
    [
      "archer",
      "Northeast Perch",
      1314,
      320
    ],
    [
      "gold",
      "Southwest Mine",
      653,
      1166
    ],
    [
      "gold",
      "Southeast Mine",
      1542,
      1163
    ],
    [
      "troop",
      "Valeguard Fort",
      323,
      832
    ],
    [
      "elite",
      "The Imperial Citadel",
      1097,
      693
    ],
    [
      "troop",
      "Shadowguard Fort",
      1872,
      840
    ],
    [
      "archer",
      "Southwest Perch",
      875,
      1033
    ],
    [
      "archer",
      "Southeast Perch",
      1338,
      1035
    ],
    [
      "cavalry",
      "Southwest Stables",
      664,
      876
    ],
    [
      "knight",
      "Southeast Rampart",
      1533,
      878
    ]
  ],
  [
    [
      "main",
      "Azurehold",
      260,
      760
    ],
    [
      "main",
      "Crimson Keep",
      1940,
      760
    ],
    [
      "main",
      "Emerald Bastion",
      1100,
      240
    ],
    [
      "main",
      "Violet Spire",
      1100,
      1280
    ],
    [
      "gold",
      "Northwest Cove",
      520,
      440
    ],
    [
      "gold",
      "Northeast Cove",
      1680,
      440
    ],
    [
      "gold",
      "Southwest Cove",
      520,
      1080
    ],
    [
      "gold",
      "Southeast Cove",
      1680,
      1080
    ],
    [
      "knight",
      "West Atoll Keep",
      720,
      660
    ],
    [
      "knight",
      "East Atoll Keep",
      1480,
      660
    ],
    [
      "cavalry",
      "West Tide Stables",
      720,
      860
    ],
    [
      "cavalry",
      "East Tide Stables",
      1480,
      860
    ],
    [
      "archer",
      "North Reef Spire",
      860,
      400
    ],
    [
      "archer",
      "North Atoll Spire",
      1340,
      400
    ],
    [
      "archer",
      "South Reef Spire",
      860,
      1120
    ],
    [
      "elite",
      "The Oceanic Shrine",
      1100,
      760
    ],
    [
      "archer",
      "South Atoll Spire",
      1340,
      1120
    ],
    [
      "troop",
      "North Atoll Fort",
      1100,
      460
    ],
    [
      "troop",
      "South Atoll Fort",
      1100,
      1060
    ],
    [
      "troop",
      "West Channel Fort",
      440,
      760
    ],
    [
      "troop",
      "East Channel Fort",
      1760,
      760
    ]
  ],
  [
    [
      "main",
      "London Citadel",
      280,
      740
    ],
    [
      "main",
      "Vienna Fortress",
      1920,
      740
    ],
    [
      "troop",
      "Paris Bastille",
      560,
      840
    ],
    [
      "troop",
      "Berlin Redoubt",
      1640,
      640
    ],
    [
      "gold",
      "Amsterdam Treasury",
      720,
      460
    ],
    [
      "gold",
      "Frankfurt Bank",
      1480,
      460
    ],
    [
      "cavalry",
      "Normandy Stables",
      460,
      1040
    ],
    [
      "cavalry",
      "Hungarian Plains",
      1740,
      1040
    ],
    [
      "knight",
      "Madrid Alcazar",
      360,
      420
    ],
    [
      "knight",
      "Prague Bastion",
      1840,
      420
    ],
    [
      "archer",
      "Alpine Redoubt",
      840,
      1120
    ],
    [
      "archer",
      "Tyrol Lookout",
      1360,
      1120
    ],
    [
      "gold",
      "Genoa Mint",
      880,
      780
    ],
    [
      "gold",
      "Venice Vault",
      1320,
      780
    ],
    [
      "small",
      "Rhine Sentry",
      860,
      580
    ],
    [
      "elite",
      "Waterloo Citadel",
      1100,
      760
    ],
    [
      "small",
      "Danube Sentry",
      1340,
      580
    ],
    [
      "small",
      "Flanders Guard",
      640,
      300
    ],
    [
      "small",
      "Bavarian Guard",
      1560,
      300
    ],
    [
      "troop",
      "Iberian Garrison",
      560,
      1260
    ],
    [
      "troop",
      "Balkan Garrison",
      1640,
      1260
    ]
  ],
  [
    [
      "main",
      "Chang'an Palace",
      400,
      1160
    ],
    [
      "main",
      "Kyoto Fortress",
      1800,
      1160
    ],
    [
      "main",
      "Delhi Red Fort",
      1100,
      300
    ],
    [
      "gold",
      "Silk Road Vault",
      340,
      760
    ],
    [
      "gold",
      "Osaka Treasury",
      1860,
      760
    ],
    [
      "troop",
      "Ganges Barracks",
      1100,
      540
    ],
    [
      "troop",
      "Yangtze Garrison",
      660,
      1080
    ],
    [
      "troop",
      "Edo Barracks",
      1540,
      1080
    ],
    [
      "archer",
      "Himalayan Watchtower",
      840,
      480
    ],
    [
      "knight",
      "Rajput Bastion",
      1360,
      480
    ],
    [
      "archer",
      "Great Wall Spire",
      600,
      760
    ],
    [
      "archer",
      "Mount Fuji Tower",
      1600,
      760
    ],
    [
      "knight",
      "Terracotta Bastion",
      760,
      900
    ],
    [
      "knight",
      "Samurai Keep",
      1440,
      900
    ],
    [
      "gold",
      "Jade Mountain",
      1100,
      1240
    ],
    [
      "elite",
      "Forbidden Imperial Citadel",
      1100,
      800
    ],
    [
      "small",
      "Yellow River Outpost",
      880,
      1220
    ],
    [
      "small",
      "Kanto Outpost",
      1320,
      1220
    ],
    [
      "cavalry",
      "Silk Road Caravanserai",
      520,
      440
    ],
    [
      "cavalry",
      "Kyoto Steppe Stables",
      1680,
      440
    ],
    [
      "cavalry",
      "Mongol Steppe Stables",
      1100,
      1020
    ]
  ]
];
const RANDOM_NAMES={
  gold:['Amber Mine','Ember Bank','Sunstone','Kingsgilt','Golden Hollow','Gilded Vault','Treasure Keep','Opal Mine'],
  troop:['Greenwatch','Briar Fort','Mossguard','Oakheart','Iron Barracks','Warden Crest','War Camp','Shieldguard'],
  archer:['Willow Spire','Thorn Spire','Hawk Lookout','Falcon Perch','Storm Tower','Eagle Eyrie','Windward Spire'],
  knight:['Moonstone','Ironcrest','Dragon Bastion','Lion Citadel','Valor Hold','Steel Keep','Dusk Fortress'],
  cavalry:['Normandy Stables','Hungarian Plains','Cossack Camp','Chevalier Keep','Steppe Outpost','Royal Stables','Windrider Fort'],
  small:['Westreach','Eastwatch','Northpass','Stonewatch','River Outpost','Border Sentry','Cliff Sentry'],
  elite:['The Violet Crown','Imperial Spire','High Citadel','Archon Throne','Sunken Shrine']
};
function randomizeCastleTypes(castles,seed){
  const random=rng(seed+999);
  const nameIndices={gold:0,troop:0,archer:0,knight:0,small:0,elite:0,cavalry:0};
  const getNextName=t=>{const list=RANDOM_NAMES[t]||[TYPES[t].name],n=list[nameIndices[t]%list.length];nameIndices[t]++;return n;};
  const mIdx=castles[0]?.mapIndex||0;
  const pCount=MAP_PLAYERS[mIdx]||2;

  let groups;
  let guaranteedTypes;
  if(mIdx===7){
    groups=[[4,5,12,13],[6,7,14,16],[10,11,17,18],[8,20],[9,19]];
    guaranteedTypes=['gold','troop','archer','knight','cavalry'];
  }else if(mIdx===8){
    groups=[[4,5,6,7],[17,18,19,20],[12,13,14,16],[8,9],[10,11]];
    guaranteedTypes=['gold','troop','archer','knight','cavalry'];
  }else if(mIdx===5||mIdx===10){
    groups=[[6,7,5],[3,4,14],[10,11,8],[12,13,9],[18,19,20],[16,17]];
    guaranteedTypes=['gold','troop','archer','knight','cavalry','small'];
  }else if(mIdx===6){
    groups=[[6,7,5],[3,4,19],[8,9,17],[10,11,18],[12,13,20],[14,16]];
    const extra=['gold','troop','cavalry'][Math.floor(random()*3)];
    guaranteedTypes=['gold','troop','archer','knight','cavalry',extra];
  }else{
    groups=[[2,3],[4,5],[6,7],[8,9],[10,11],[12,13],[14,16],[17,18],[19,20]];
    guaranteedTypes=['gold','gold','troop','troop','archer','knight','cavalry','small','small'];
  }

  const pool=[...guaranteedTypes];
  for(let i=pool.length-1;i>0;i--){
    const j=Math.floor(random()*(i+1));
    [pool[i],pool[j]]=[pool[j],pool[i]];
  }

  for(let g=0;g<groups.length;g++){
    const t=pool[g];
    for(const id of groups[g]){
      if(!castles[id]||castles[id].type==='main'||id<pCount)continue;
      castles[id].type=t;
      castles[id].troops=TYPES[t].def;
      castles[id].name=getNextName(t);
    }
  }

  if(castles[15]){
    const centerType='elite';
    castles[15].type=centerType;castles[15].troops=TYPES[centerType].def;
    castles[15].name=getNextName(centerType);
  }
}
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function create(seed=Date.now(),style='balanced',difficulty='normal',mapIndex=0,randomCastles=false,playerCount=null,victoryMode='crown_control',heroes=null,progressiveCombat=false,epoch='18th',region='europe'){
 let mIdx=Number.isInteger(Number(mapIndex))?clamp(Number(mapIndex),0,MAPS.length-1):0;
 const pCount=[2,3,4].includes(Number(playerCount))?Number(playerCount):MAP_PLAYERS[mIdx];
 // A faction must start in a main castle on a layout designed for that count.
 if(MAP_PLAYERS[mIdx]!==pCount)mIdx=MAP_PLAYERS.indexOf(pCount);
 const random=rng(seed),layout=MAPS[mIdx];
 const activeKeys=PLAYER_KEYS.slice(0,pCount);
 const castles=layout.map(([type,name,x,y],id)=>{
   const defTroops=TYPES[type].def;
   return {id,type,name,x,y,mapIndex:mIdx,owner:id<pCount?activeKeys[id]:null,level:1,troops:defTroops,carry:0,reserve:0,specialty:'balanced',supply:null,stabilizing:0,scorched:0};
 });
 if(mIdx===0){
   for(const [a,b] of [[0,1],[2,3],[4,5],[6,7],[8,9],[10,11],[12,13],[14,16],[17,18],[19,20]]){const dx=(random()-.5)*32,dy=(random()-.5)*32;castles[a].x+=dx;castles[b].x-=dx;castles[a].y+=dy;castles[b].y+=dy;}
 }
 if(randomCastles)randomizeCastleTypes(castles,seed);
 const stat=()=>({produced:0,roadLosses:0,attackLosses:0,defenseLosses:0,captures:0,dispatched:0,casualtiesInflicted:0,goldEarned:0});
 const players={}, stats={};
 const botArchetypes=['raider','economist','defender','balanced'];
 for(let i=0;i<pCount;i++){
   const k=activeKeys[i];
   let pStyle=style||'balanced';
   if(i>0){
     if(pCount===2){
       pStyle=style||'balanced';
     }else if(i===1&&style&&style!=='balanced'){
       pStyle=style;
     }else{
       const pool=botArchetypes.filter(st=>st!==style);
       pStyle=pool[(i-1)%pool.length];
     }
   }
   const heroId=heroes&&heroes[k]?heroes[k]:(heroes?(k==='blue'?'vanguard':(pStyle==='economist'?'guildmaster':pStyle==='defender'?'fortifier':pStyle==='raider'?'infiltrator':'vanguard')):null);
   const startGold=(heroId==='guildmaster')?350:200;
   players[k]={troops:420,gold:startGold,home:i,hero:heroId,aiStyle:pStyle,aiTimer:1.2+i*0.6};
   stats[k]=stat();
 }
 const weather={type:'clear',timer:45,duration:45,index:0};
 const activeEpoch=EPOCHS[epoch]?epoch:(epoch==='napoleonic'?'18th':(epoch==='medieval'?'17th':'18th'));const activeRegion=REGIONS[region]?region:(mIdx===10?'asia':(mIdx===4||mIdx===8?'americas':'europe'));return{version:VERSION,matchId:globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`,seed,mapIndex:mIdx,mapName:MAP_NAMES[mIdx],playerCount:pCount,epoch:activeEpoch,region:activeRegion,victoryMode:victoryMode||'crown_control',crownHolder:null,crownHoldTimer:0,randomCastles:!!randomCastles,botPlayers:activeKeys.slice(1),castles,players,stats,armies:[],orders:[],effects:[],events:[],battles:[],dragonStrike:null,dragonCooldowns:{},progressiveCombat:!!progressiveCombat,time:0,aiTimer:8,aiStyle:style,aiDifficulty:difficulty,nextArmy:1,nextOrder:1,nextBattleId:1,paused:false,result:null,resultReason:null,weather};
}
function owned(s,p){return s.castles.filter(c=>c.owner===p)}
function totals(s,p){
  const garrison=owned(s,p).reduce((n,c)=>n+c.troops,0);
  const marching=s.armies.filter(a=>a.owner===p).reduce((n,a)=>n+a.count,0);
  return{garrison,marching,total:garrison+marching};
}
function sync(s){for(const p of Object.keys(s.players))s.players[p].troops=totals(s,p).total}
function incomeFor(c,level=c.level,specialty=c.specialty,hero=null){let troops=RATES[c.type]?RATES[c.type][level-1]:3,gold=c.type==='main'?level:c.type==='gold'?[4,7,11,16,22][level-1]:.25*level;if(c.type==='elite'&&c.owner)troops+=1;if(hero==='fortifier'&&c.type==='main'&&c.owner)troops+=.5;if(specialty==='military'){troops*=1.5;gold*=.5}if(specialty==='economy'){troops*=.5;gold*=2}if(hero==='guildmaster')gold*=1.3;if(c.stabilizing&&c.stabilizing>0){troops*=.5;gold*=.5}if(c.scorched&&c.scorched>0){troops*=.5;gold*=.5}return{troops,gold}}
function income(s,p){return owned(s,p).reduce((a,c)=>{const n=incomeFor(c,c.level,c.specialty,s.players[p]?.hero);return{troops:a.troops+n.troops,gold:a.gold+n.gold}},{troops:0,gold:0})}
function power(){return 1}
function defense(s,c){
  let value=c.troops;
  if(c.type==='small')value=Math.floor(value*1.2+1e-9);
  if(c.type==='archer'&&c.owner)value=Math.floor(value*1.15+1e-9);
  if(c.owner&&hasConnectedDefenseNode(s,c.id,c.owner))value=Math.floor(value*1.15+1e-9);
  if(c.scorched>0)value=Math.floor(value*.8);
  return value;
}
function nearest(s,p,target){return owned(s,p).sort((a,b)=>dist(a,target)-dist(b,target))[0]}
function report(s,text){s.events.unshift({text,time:s.time});s.events=s.events.slice(0,60)}
function busy(s){return s.paused||!!s.result}
function reserved(s,id){return s.orders.filter(o=>o.source===id).reduce((n,o)=>n+o.count,0)}
function available(s,c,respectReserve=true){return Math.max(0,c.troops-reserved(s,c.id)-(respectReserve?c.reserve:0))}
function getMapRoads(mapIdx){
  if(typeof root!=='undefined'&&root.CrownRoadDefinitions&&root.CrownRoadDefinitions[mapIdx])return root.CrownRoadDefinitions[mapIdx];
  if(typeof window!=='undefined'&&window.CrownRoadDefinitions&&window.CrownRoadDefinitions[mapIdx])return window.CrownRoadDefinitions[mapIdx];
  if(typeof require!=='undefined'){
    try{
      const defs=require('./road-definitions.js');
      if(defs&&defs[mapIdx])return defs[mapIdx];
    }catch(_){
      try{
        const path=require('node:path');
        const defs=require(path.join(__dirname,'road-definitions.js'));
        if(defs&&defs[mapIdx])return defs[mapIdx];
      }catch(__){}
    }
  }
  return null;
}
function areCastlesConnected(aId,bId,mapIdx){
  if(aId===bId)return false;
  const defs=getMapRoads(mapIdx);
  if(defs){
    const allEdges=[...(defs.main||[]),...(defs.secondary||[])];
    return allEdges.some(e=>((e[0]===aId&&e[1]===bId)||(e[0]===bId&&e[1]===aId))&&(!e[2]||(e[2]!=='fast'&&e[2]!=='flank')));
  }
  return true;
}
function routeBetween(source,target,mode='fast',mapIdx=source?.mapIndex||0){
 const points=[{x:source.x,y:source.y}];
 const cross=(source.x<1100&&target.x>1100)||(source.x>1100&&target.x<1100);
 if(cross){
  if(mapIdx===0){
   points.push({x:1100,y:mode==='flank'?1290:740});
  }else if(mapIdx===1){
   if(mode==='flank'){
    points.push({x:1100,y:Math.max(source.y,target.y)>760?1140:380});
   }else{
    points.push({x:1100,y:760});
   }
  }else if(mapIdx===2){
   const midY=(source.y+target.y)/2;
   if(mode==='flank'){
    points.push({x:1100,y:midY<760?1160:400});
   }else{
    const bY=midY<580?400:midY>940?1160:760;
    points.push({x:1100,y:bY});
   }
  }else if(mapIdx===3){
   const midY=(source.y+target.y)/2;
   if(mode==='flank'){
    points.push({x:1100,y:midY<760?1060:460});
   }else{
    points.push({x:1100,y:midY<760?460:1060});
   }
  }else if(mapIdx===4||mapIdx===8){
   const north=mode==='flank'?(Math.min(source.y,target.y)>760):(Math.min(source.y,target.y)<760);
   points.push({x:1100,y:north?260:1260});
  }else if(mapIdx===5||mapIdx===6||mapIdx===7){
   if(mode==='flank'){
    points.push({x:1100,y:Math.max(source.y,target.y)>760?1140:380});
   }else{
    points.push({x:1100,y:760});
   }
  }else if(mapIdx===9){
   if(mode==='flank'){
    points.push({x:1100,y:Math.max(source.y,target.y)>760?1180:420});
   }else{
    points.push({x:1100,y:760});
   }
  }else if(mapIdx===10){
   if(mode==='flank'){
    points.push({x:1100,y:680});
   }else{
    points.push({x:1100,y:780});
   }
  }
 }else if(mode==='flank'){
  points.push({x:clamp((source.x+target.x)/2+(source.x<1100?-130:130),220,1980),y:clamp(Math.max(source.y,target.y)+150,240,1320)});
 }
 points.push({x:target.x,y:target.y});
 return points.filter((p,i,a)=>i===0||dist(p,a[i-1])>.001);
}
function routeLength(points){return points.slice(1).reduce((n,p,i)=>n+dist(points[i],p),0)}
function position(a,after=0){let remaining=clamp((a.t+after)*a.speed,0,a.length);for(let i=1;i<a.path.length;i++){const from=a.path[i-1],to=a.path[i],len=dist(from,to);if(remaining<=len||i===a.path.length-1){const f=len?clamp(remaining/len,0,1):1;return{x:from.x+(to.x-from.x)*f,y:from.y+(to.y-from.y)*f}}remaining-=len}return a.path[0]}
// Shared march calculations used by orders, AI and previews.
function marchSpeed(source,route='fast',weather=null,hero=null){
  let speed=route==='flank'?65:SPEED;
  if(source.marchBoost===true||['knight','cavalry'].includes(source.type))speed*=1.25;
  if(hero==='vanguard')speed*=1.15;
  if(hero==='infiltrator'&&route==='flank')speed*=1.25;
  if(weather?.type==='rain')speed*=.75;
  else if(weather?.type==='fog'&&route==='flank')speed*=1.2;
  return Math.round(speed*100)/100;
}
function setPath(a,from,to,mode='fast',weather=null,hero=null){
  const mapIdx=from.mapIndex??to.mapIndex??0;
  a.path=mode==='intercept'?[{x:from.x,y:from.y},{x:to.x,y:to.y}]:routeBetween(from,to,mode,mapIdx);
  if(a.path.length===1)a.path.push({x:to.x,y:to.y});
  if(a.marchBoost===undefined)a.marchBoost=['knight','cavalry'].includes(from.type)&&from.owner===a.owner;
  if(a.siegeBoost===undefined)a.siegeBoost=from.type==='knight'&&from.owner===a.owner;
  a.speed=marchSpeed(a,mode,weather,hero);
  a.length=routeLength(a.path);a.duration=Math.max(.001,a.length/a.speed);a.t=0;
  a.x=from.x;a.y=from.y;a.tx=to.x;a.ty=to.y;a.route=mode;a.revision=(a.revision||0)+1;
}
function dispatch(s,p,sourceId,targetId,count,options={}){
  const source=s.castles[sourceId],target=s.castles[targetId];
  if(busy(s)||!source||!target||source===target||source.owner!==p||!Number.isSafeInteger(count)||count<1||count>available(s,source,options.respectReserve!==false))return false;
  source.troops-=count;
  const a={id:s.nextArmy++,owner:p,source:sourceId,target:targetId,count,power:1,returning:false,inBattle:false,intercept:null};
  setPath(a,source,target,options.route==='flank'?'flank':'fast',s.weather,s.players[p]?.hero);
  s.armies.push(a);
  if(s.stats[p])s.stats[p].dispatched+=count;
  sync(s);
  report(s,`${p==='blue'?'You':p.toUpperCase()} sent ${count}: ${source.name} → ${target.name}.`);
  return a;
}
function attack(s,p,id,count,sourceId,options={}){const source=sourceId===undefined?owned(s,p).filter(c=>c.id!==id&&available(s,c,options.respectReserve!==false)>=count).sort((a,b)=>dist(a,s.castles[id]||a)-dist(b,s.castles[id]||b))[0]:s.castles[sourceId];return source?dispatch(s,p,source.id,id,count,options):false}
function setReserve(s,p,id,n){const c=s.castles[id];if(busy(s)||!c||c.owner!==p||!Number.isSafeInteger(n)||n<0||n>MAX_RESOURCE)return false;c.reserve=n;return true}
function setSupply(s,p,source,target,mode='fast'){const c=s.castles[source],d=s.castles[target];if(busy(s)||!c||c.owner!==p)return false;if(target===null){c.supply=null;return true}if(!d||d===c||d.owner!==p)return false;const seen=new Set([c.id]);let next=d;while(next){if(seen.has(next.id))return false;seen.add(next.id);next=next.supply?s.castles[next.supply.target]:null}c.supply={target,owner:p,route:mode==='flank'?'flank':'fast',next:s.time+5};return true}
function coordinate(s,p,targetId,entries,options={}){
  if(busy(s)||!s.castles[targetId]||!Array.isArray(entries)||!entries.length)return false;
  const seen=new Set(),prepared=[];
  for(const e of entries){
    const c=e&&s.castles[e.source];
    if(!c||c.owner!==p||c.id===targetId||seen.has(c.id)||!Number.isSafeInteger(e.count)||e.count<1||e.count>available(s,c,options.respectReserve!==false))return false;
    seen.add(c.id);
    const route=options.route==='flank'?'flank':'fast';
    const speed=marchSpeed(c,route,s.weather,s.players[p]?.hero);
    prepared.push({...e,route,duration:routeLength(routeBetween(c,s.castles[targetId],route,s.mapIndex))/speed});
  }
  const max=Math.max(...prepared.map(e=>e.duration));
  for(const e of prepared)s.orders.push({id:s.nextOrder++,owner:p,source:e.source,target:targetId,count:e.count,route:e.route,launch:s.time+(options.synchronized===false?0:max-e.duration)});
  report(s,`${prepared.length} castles preparing ${prepared.reduce((n,e)=>n+e.count,0)} troops. Arrival in ${max.toFixed(1)}s.`);
  return true;
}
function cancelOrder(s,p,id){if(busy(s))return false;const index=s.orders.findIndex(o=>o.id===id&&o.owner===p);if(index<0)return false;s.orders.splice(index,1);return true}
function redirect(s,p,id,target,route='fast'){const a=s.armies.find(a=>a.id===id),c=s.castles[target];if(busy(s)||!a||a.owner!==p||a.inBattle||!c)return false;setPath(a,position(a),c,route==='flank'?'flank':'fast',s.weather,s.players[p]?.hero);a.target=target;a.intercept=null;a.returning=c.owner===p;report(s,`Army ${id} redirected to ${c.name}.`);return true}
function recall(s,p,id){
  const a=s.armies.find(a=>a.id===id);
  if(busy(s)||!a||a.owner!==p||a.inBattle)return false;
  if(a.returning)return true;
  const home=s.castles[a.source]?.owner===p?s.castles[a.source]:nearest(s,p,position(a));
  if(!home)return false;
  const currentPos=position(a);
  setPath(a,currentPos,home,a.route||'fast',s.weather,s.players[p]?.hero);
  a.target=home.id;
  a.intercept=null;
  a.returning=true;
  report(s,`Army ${id} recalled. Returning to ${home.name}.`);
  return true;
}
function rendezvous(from,target){const remaining=Math.max(0,target.duration-target.t);for(let t=.1;t<=remaining+.1;t+=.1){const point=position(target,t);if(dist(from,point)/SPEED<=t+.03)return{...point,eta:t}}return null}
function intercept(s,p,id,targetId){const a=s.armies.find(a=>a.id===id),enemy=s.armies.find(a=>a.id===targetId);if(busy(s)||!a||!enemy||a.inBattle||enemy.inBattle||a.owner!==p||enemy.owner===p)return false;const point=rendezvous(position(a),enemy);if(!point)return false;setPath(a,position(a),point,'intercept',s.weather,s.players[p]?.hero);a.intercept=enemy.id;a.interceptTimer=.25;a.returning=false;return true}
function upgradeCost(c,p=null,s=null){const base=UPGRADE_COSTS[(c?.level||0)-1]??Infinity;if(p&&s?.players[p]?.hero==='fortifier')return Math.round(base*0.75);return base}
function upgrade(s,p,id,specialty){const c=s.castles[id];const cost=upgradeCost(c,p,s);if(busy(s)||!c||c.owner!==p||c.level>=MAX_CASTLE_LEVEL||!s.players[p]||s.players[p].gold<cost)return false;specialty=specialty||c.specialty;if(!['balanced','military','economy'].includes(specialty))return false;s.players[p].gold-=cost;c.level++;c.specialty=specialty;report(s,`${c.name}: level ${c.level}, ${specialty}.`);return true}
function specialize(s,p,id,specialty){const c=s.castles[id];if(busy(s)||!c||c.owner!==p)return false;if(!['balanced','military','economy'].includes(specialty))return false;if(c.specialty===specialty)return true;const cost=50;if(!s.players[p]||s.players[p].gold<cost)return false;s.players[p].gold-=cost;c.specialty=specialty;report(s,`${c.name}: specialized to ${specialty}.`);return true}
function validateMapRoster(mapIndex) {
  const mIdx = Number.isInteger(Number(mapIndex)) ? clamp(Number(mapIndex), 0, MAPS.length - 1) : 0;
  const layout = MAPS[mIdx];
  const counts = { main: 0, troop: 0, archer: 0, knight: 0, cavalry: 0, gold: 0, elite: 0, small: 0 };
  for (const c of layout) {
    const type = c[0];
    counts[type] = (counts[type] || 0) + 1;
  }
  const requiredPlayers = MAP_PLAYERS[mIdx] || 2;
  const valid = counts.main >= requiredPlayers &&
                counts.archer >= 1 &&
                counts.knight >= 1 &&
                counts.cavalry >= 1 &&
                counts.gold >= 1 &&
                counts.troop >= 1 &&
                counts.elite >= 1;
  return { valid, counts, requiredPlayers, mapName: MAP_NAMES[mIdx] };
}
function canDragonStrike(s,p){
  if(busy(s)||!s.players[p])return false;
  const ownedCount=owned(s,p).length;
  const cd=(s.dragonCooldowns&&s.dragonCooldowns[p])||0;
  return ownedCount>=3&&s.time>=40&&s.players[p].gold>=1000&&cd<=0&&!s.dragonStrike;
}
function launchDragonStrike(s,p,x,y){
  if(!Number.isFinite(x)||!Number.isFinite(y)||!canDragonStrike(s,p))return false;
  s.players[p].gold-=1000;
  s.dragonCooldowns=s.dragonCooldowns||{};
  s.dragonCooldowns[p]=75;
  s.dragonStrike={
    id:Date.now(),
    owner:p,
    ...clampMapPoint({x,y}),
    radius:190,
    timer:3.0,
    totalTimer:3.0,
    impactTimer:1.6,
    state:'incoming'
  };
  report(s,`🐉 WARNING: ${p==='blue'?'Your':p.toUpperCase()+"'s"} Dragon is descending! Strike in 3s!`);
  s.effects.push({x,y,text:'⚠️ DRAGON INCOMING ⚠️',owner:p,life:2.8});
  return true;
}
function processDragonStrike(s,dt){
  if(s.dragonCooldowns){
    for(const p of Object.keys(s.dragonCooldowns)){
      if(s.dragonCooldowns[p]>0)s.dragonCooldowns[p]=Math.max(0,s.dragonCooldowns[p]-dt);
    }
  }
  const strike=s.dragonStrike;
  if(!strike)return;
  if(strike.state==='incoming'){
    strike.timer-=dt;
    if(strike.timer<=0){
      strike.state='impact';
      const radius=strike.radius;
      for(const a of s.armies){
        const pos=position(a);
        const d=dist(pos,strike);
        if(d<=radius){
          const falloff=d<=70?0.50:d<=130?0.40:0.30;
          const casualties=Math.min(a.count,Math.max(1,Math.ceil(a.count*falloff)));
          a.count-=casualties;
          if(s.stats[a.owner])s.stats[a.owner].roadLosses+=casualties;
          creditKill(s,strike.owner,a.owner,casualties);
          s.effects.push({x:pos.x,y:pos.y,text:`💥 −${casualties} 🔥`,owner:strike.owner,life:2.2});
        }
      }
      s.armies=s.armies.filter(a=>a.count>0);
      for(const c of s.castles){
        const d=dist(c,strike);
        if(d<=radius){
          const falloff=d<=45?0.35:0.25;
          const casualties=Math.min(c.troops,Math.max(1,Math.ceil(c.troops*falloff)));
          c.troops-=casualties;
          if(c.owner&&s.stats[c.owner])s.stats[c.owner].defenseLosses+=casualties;
          creditKill(s,strike.owner,c.owner,casualties);
          c.scorched=14;
          report(s,`${c.name} scorched by Dragon fire! Defense −20% for 14s.`);
          s.effects.push({x:c.x,y:c.y,text:`🔥 SCORCHED −${casualties}`,owner:strike.owner,life:2.5});
        }
      }
      s.effects.push({x:strike.x,y:strike.y,text:'🔥 DRAGON INFERNO 🔥',owner:strike.owner,life:3.0});
    }
  }else if(strike.state==='impact'){
    strike.impactTimer-=dt;
    if(strike.impactTimer<=0){
      s.dragonStrike=null;
    }
  }
}
function capture(s,c,p,count){
  const old=c.owner;
  c.owner=p;
  c.troops=count;
  c.carry=0;
  c.reserve=0;
  c.supply=null;
  c.stabilizing=7;
  c.scorched=0;
  s.orders=s.orders.filter(o=>o.source!==c.id);
  for(const x of s.castles)if(x.supply?.target===c.id){x.supply=null;report(s,`Supply to ${c.name} stopped: ownership changed.`)}
  if(s.stats[p])s.stats[p].captures++;
  report(s,`${p==='blue'?'You captured':p.toUpperCase()+' captured'} ${c.name}${old?' from '+old:''}.`);
  s.effects.push({x:c.x,y:c.y,text:'CAPTURED',owner:p,life:1.8});

}
function reconcileOrders(s){
  for(const c of s.castles){
    let remaining=c.troops;
    s.orders=s.orders.filter(o=>{
      if(o.source!==c.id)return true;
      if(o.owner!==c.owner||o.count>remaining){report(s,`Order ${o.id} cancelled: source troops lost.`);return false;}
      remaining-=o.count;return true;
    });
  }
}
function creditKill(s,killer,victim,count){
  if(killer&&victim&&killer!==victim&&s.stats[killer])s.stats[killer].casualtiesInflicted=addResource(s.stats[killer].casualtiesInflicted||0,count);
}
function creditRoadLoss(s,victim,count,factions,damage=null){
  const enemies=factions.filter(f=>f.p!==victim).sort((a,b)=>a.p.localeCompare(b.p));
  const weights=enemies.map(f=>Math.max(0,damage?.[f.p]??f.startTotal??f.total)),total=weights.reduce((n,w)=>n+w,0);
  let left=count;
  enemies.forEach((f,i)=>{const share=i===enemies.length-1?left:Math.floor(count*(total?weights[i]/total:1/enemies.length));creditKill(s,f.p,victim,share);left-=share;});
}
function siegeOutcome(s,army,castle){
  const source=s.castles[army.source];
  const siegeBoost=army.siegeBoost??(source?.type==='knight'&&source.owner===army.owner);
  let multiplier=siegeBoost?1.2:1;
  if(army.route==='flank'&&s.players[army.owner]?.hero==='infiltrator')multiplier*=1.2;
  const strength=Math.floor(army.count*multiplier);
  const defPower=defense(s,castle),wins=strength>defPower;
  const survivors=wins?Math.max(1,army.count-Math.ceil(defPower*army.count/strength)):0;
  const defenderLosses=wins?castle.troops:Math.min(castle.troops,Math.floor(strength*castle.troops/Math.max(1,defPower)));
  return{wins,survivors,strength,defPower,defenderLosses,attackerLosses:army.count-survivors};
}
function resolve(s,a){
  const c=s.castles[a.target];
  if(c.owner===a.owner){
    const accepted=Math.min(a.count,MAX_RESOURCE-c.troops);
    c.troops+=accepted;
    report(s,`${c.name} reinforced +${accepted}.`);
    return;
  }
  const result=siegeOutcome(s,a,c),defender=c.owner;
  if(s.stats[a.owner])s.stats[a.owner].attackLosses+=result.attackerLosses;
  if(defender&&s.stats[defender])s.stats[defender].defenseLosses+=result.defenderLosses;
  creditKill(s,a.owner,defender,result.defenderLosses);
  creditKill(s,defender,a.owner,result.attackerLosses);
  if(result.wins)capture(s,c,a.owner,result.survivors);
  else{
    c.troops-=result.defenderLosses;
    report(s,`${c.name} held: ${c.troops} troops remain.`);
    s.effects.push({x:c.x,y:c.y,text:'−'+result.defenderLosses,owner:a.owner,life:1.8});
  }
}
// Project known arrivals and production; future commands and road fights remain uncertain.
function forecastCastle(s,id,horizon,p=null,ignoreOwnAssaults=false){
  const c={...s.castles[id]},arrivals=aiIncoming(s,c,p,ignoreOwnAssaults)
    .map(a=>({army:a,eta:Math.max(0,a.duration-a.t)}))
    .filter(e=>e.eta<=horizon+1e-8).sort((a,b)=>a.eta-b.eta||a.army.id-b.army.id);
  const departures=s.orders.filter(o=>o.owner===p&&o.source===id&&o.launch<=s.time+horizon)
    .map(o=>({army:o,eta:Math.max(0,o.launch-s.time),leaving:true}));
  const events=arrivals.concat(departures).sort((a,b)=>a.eta-b.eta||Number(b.leaving)-Number(a.leaving)||a.army.id-b.army.id);
  let at=0,firstLoss=null;
  function grow(eta){
    let left=Math.max(0,eta-at);
    while(left>1e-8){
      const dt=Math.min(left,c.stabilizing>0?c.stabilizing:Infinity,c.scorched>0?c.scorched:Infinity);
      if(c.owner){const growth=(c.carry||0)+incomeFor(c,c.level,c.specialty,s.players[c.owner]?.hero).troops*dt;
        const n=Math.floor(growth+1e-9);c.troops=addResource(c.troops,n);c.carry=Math.max(0,growth-n);}
      c.stabilizing=Math.max(0,(c.stabilizing||0)-dt);c.scorched=Math.max(0,(c.scorched||0)-dt);left-=dt;
    }
    at=eta;
  }
  for(const e of events){
    grow(e.eta);
    if(e.leaving){if(c.owner===e.army.owner)c.troops=Math.max(0,c.troops-e.army.count);continue;}
    if(c.owner===e.army.owner)c.troops=addResource(c.troops,e.army.count);
    else{const r=siegeOutcome(s,e.army,c);if(r.wins){c.owner=e.army.owner;c.troops=r.survivors;c.carry=0;c.stabilizing=7;if(firstLoss===null)firstLoss=e.eta;}else c.troops-=r.defenderLosses;}
  }
  grow(horizon);
  return{...c,firstLoss};
}
function setAIStyle(s,style){
  if(!['balanced','defender','economist','raider'].includes(style))return false;
  s.aiStyle=style;
  for(const p of s.botPlayers||[]){if(s.players[p]){s.players[p].aiStyle=style;s.players[p].aiTimer=0;}}
  return true;
}
function splitSurvivors(armies,total){const sum=armies.reduce((n,a)=>n+a.count,0);let assigned=0;const shares=armies.map(a=>{const exact=sum?a.count*total/sum:0,n=Math.floor(exact);assigned+=n;return{a,n,f:exact-n}}).sort((a,b)=>b.f-a.f||a.a.id-b.a.id);for(let i=0;i<total-assigned;i++)shares[i].n++;shares.forEach(x=>x.a.count=x.n)}
function calcGroupPower(armies,opponentArmies,hero){
  const total=armies.reduce((n,a)=>n+a.count,0);
  return{total,power:total*(hero==='vanguard'?1.1:1)};
}
function armyDamage(total,hero){return total*24*(hero==='vanguard'?1.1:1);}
function battleGroups(s,group){
  const owners=[...new Set(group.map(a=>a.owner))];
  if(owners.length<=1)return;
  const point=position(group[0]);

  if(owners.length===2){
    const p1=owners[0], p2=owners[1];
    const g1=group.filter(a=>a.owner===p1), g2=group.filter(a=>a.owner===p2);
    const hero1=s.players[p1]?.hero, hero2=s.players[p2]?.hero;
    const d1=calcGroupPower(g1, g2, hero1);
    const d2=calcGroupPower(g2, g1, hero2);
    const eff1=d1.power, eff2=d2.power;
    const c1=d1.total, c2=d2.total;

    if(eff1>=eff2){
      const loss1=Math.min(c1, Math.ceil(eff2*c1/eff1));
      splitSurvivors(g1,Math.max(0,c1-loss1));
      splitSurvivors(g2,0);
    }else{
      const loss2=Math.min(c2, Math.ceil(eff1*c2/eff2));
      splitSurvivors(g1,0);
      splitSurvivors(g2,Math.max(0,c2-loss2));
    }
    creditKill(s,p2,p1,c1-g1.reduce((n,a)=>n+a.count,0));
    creditKill(s,p1,p2,c2-g2.reduce((n,a)=>n+a.count,0));
    if(s.stats[p1])s.stats[p1].roadLosses+=c1-g1.reduce((n,a)=>n+a.count,0);
    if(s.stats[p2])s.stats[p2].roadLosses+=c2-g2.reduce((n,a)=>n+a.count,0);
    s.effects.push({...point,text:`${c1} vs ${c2}`,owner:c1>=c2?p1:p2,life:1.8});
    report(s,`Road battle: ${p1} ${c1} vs ${p2} ${c2}; ${group.reduce((n,a)=>n+a.count,0)} survive.`);
  }else{
    const factionData=owners.map(p=>{
      const g=group.filter(a=>a.owner===p);
      const data=calcGroupPower(g, group.filter(a=>a.owner!==p), s.players[p]?.hero);
      return{p,armies:g,total:data.total,power:data.power};
    }).sort((a,b)=>b.power-a.power);
    const winner=factionData[0], runnerUp=factionData[1];
    const surLoss=Math.min(winner.total, Math.ceil(runnerUp.power * winner.total / Math.max(1, winner.power)));
    const surviving=Math.max(0,winner.total-surLoss);
    splitSurvivors(winner.armies,surviving);
    creditRoadLoss(s,winner.p,surLoss,factionData);
    if(s.stats[winner.p])s.stats[winner.p].roadLosses+=surLoss;
    for(let i=1;i<factionData.length;i++){
      const loser=factionData[i];
      splitSurvivors(loser.armies,0);
      creditKill(s,winner.p,loser.p,loser.total);
      if(s.stats[loser.p])s.stats[loser.p].roadLosses+=loser.total;
    }
    s.effects.push({...point,text:`${winner.p.toUpperCase()} wins`,owner:winner.p,life:1.8});
    report(s,`Multi-army battle: ${winner.p} prevailed with ${surviving} survivors.`);
  }
}
function engageBattle(s,group){
  const existingBattle=s.battles?s.battles.find(b=>group.some(a=>b.armies.includes(a.id))):null;
  if(existingBattle){
    for(const a of group){
      if(!existingBattle.armies.includes(a.id)){
        existingBattle.armies.push(a.id);
        a.inBattle=existingBattle.id;
        existingBattle.hpPools=existingBattle.hpPools||{};
        existingBattle.hpPools[a.owner]=(existingBattle.hpPools[a.owner]||0)+(a.count*100);
        report(s,`Reinforcements from ${a.owner} joined road battle!`);
        s.effects.push({x:existingBattle.x,y:existingBattle.y-18,text:'+REINFORCEMENTS',owner:a.owner,life:1.2});
      }
    }
    return;
  }
  const midX=group.reduce((sum,a)=>sum+position(a).x,0)/group.length;
  const midY=group.reduce((sum,a)=>sum+position(a).y,0)/group.length;
  const bId=(s.nextBattleId=(s.nextBattleId||1)+1);
  const hpPools = {};
  for(const a of group){
    hpPools[a.owner] = (hpPools[a.owner] || 0) + (a.count*100);
  }
  const battle={
    id:bId,
    x:midX,
    y:midY,
    armies:group.map(a=>a.id),
    powerRatio:{},
    elapsed:0,
    carryLoss:{},
    hpPools
  };
  s.battles=s.battles||[];
  s.battles.push(battle);
  for(const a of group)a.inBattle=bId;
  s.effects.push({x:midX,y:midY,text:'⚔️ BATTLE! ⚔️',owner:group[0].owner,life:1.5});
  report(s,`Road battle engaged at (${Math.round(midX)}, ${Math.round(midY)}) between ${[...new Set(group.map(a=>a.owner))].join(' vs ')}!`);
}
function tickBattles(s,dt){
  if(!s.battles||!s.battles.length)return;
  for(const b of [...s.battles]){
    // Reinforcements touch check FIRST before computing active/owners
    for(const a of s.armies){
      if(!a.inBattle&&a.count>0){
        const pos=position(a);
        if(dist(pos,{x:b.x,y:b.y})<=CONTACT*1.5){
          a.inBattle=b.id;
          if(!b.armies.includes(a.id)){
            b.armies.push(a.id);
            b.hpPools=b.hpPools||{};
            const addHp=(a.count*100);
            b.hpPools[a.owner]=(b.hpPools[a.owner]||0)+addHp;
            report(s,`Reinforcements from ${a.owner} joined road battle!`);
            s.effects.push({x:b.x,y:b.y-18,text:'+REINFORCEMENTS',owner:a.owner,life:1.2});
          }
        }
      }
    }
    const active=s.armies.filter(a=>b.armies.includes(a.id)&&a.count>0);
    const owners=[...new Set(active.map(a=>a.owner))];
    if(owners.length<=1){
      for(const a of s.armies.filter(x=>x.inBattle===b.id||b.armies.includes(x.id)))a.inBattle=null;
      s.battles=s.battles.filter(x=>x.id!==b.id);
      if(owners.length===1){
        const winner=owners[0],sur=active.reduce((sum,a)=>sum+a.count,0);
        s.effects.push({x:b.x,y:b.y,text:`${winner.toUpperCase()} VICTORIOUS`,owner:winner,life:1.5});
        report(s,`Road battle ended: ${winner} won with ${sur} troops.`);
      }
      continue;
    }
    b.elapsed=(b.elapsed||0)+dt;
    b.hpPools=b.hpPools||{};

    const factionData=owners.map(p=>{
      const fArmies=active.filter(a=>a.owner===p);
      const total=fArmies.reduce((sum,a)=>sum+a.count,0);
      const hero=s.players[p]?.hero;
      if(b.hpPools[p]===undefined||b.hpPools[p]<=0){
        b.hpPools[p]=total*100;
      }
      return{p,armies:fArmies,total,hero};
    });

    const bTotal=factionData.reduce((sum,fd)=>sum+fd.total,0);
    b.powerRatio={};
    for(const fd of factionData)b.powerRatio[fd.p]=Math.round((fd.total/Math.max(1,bTotal))*100)/100;

    // SIMULTANEOUS DAMAGE: Compute all damage dealt before applying casualties
    const damageDealt={};
    for(const attacker of factionData){
      const dps=armyDamage(attacker.total,attacker.hero);
      damageDealt[attacker.p]=dps*dt;
    }

    // Apply simultaneous damage to each faction's aggregated HP pool
    for(const fd of factionData){
      let incomingDmg=0;
      for(const [otherP,dmg] of Object.entries(damageDealt)){
        if(otherP!==fd.p){
          const otherEnemiesTotal=factionData.filter(f=>f.p!==otherP).reduce((sum,f)=>sum+f.total,0);
          const share=otherEnemiesTotal>0?fd.total/otherEnemiesTotal:1;
          incomingDmg+=dmg*share;
        }
      }

      const maxHpPool=fd.total*100;
      const currentHp=Math.min(maxHpPool,b.hpPools[fd.p]!==undefined?b.hpPools[fd.p]:maxHpPool);
      b.hpPools[fd.p]=Math.max(0,currentHp-incomingDmg);
      const avgUnitHp=fd.total>0?maxHpPool/fd.total:100;
      const newCount=b.hpPools[fd.p]<=0?0:Math.max(0,Math.ceil(b.hpPools[fd.p]/avgUnitHp));
      const wholeLoss=Math.min(fd.total,fd.total-newCount);

      if(wholeLoss>0){
        splitSurvivors(fd.armies,fd.total-wholeLoss);
        if(s.stats[fd.p])s.stats[fd.p].roadLosses+=wholeLoss;
        creditRoadLoss(s,fd.p,wholeLoss,factionData,damageDealt);
        s.effects.push({
          x:b.x+(rng(s.seed+Math.floor(b.elapsed*100))()-0.5)*24,
          y:b.y+(rng(s.seed+Math.floor(b.elapsed*200))()-0.5)*24,
          text:`−${wholeLoss}`,
          owner:fd.p,
          life:0.7
        });
      }
    }

    s.armies=s.armies.filter(a=>a.count>0);
  }
}
function contactMotion(a,limit){const p=position(a),next=position(a,limit),padding=CONTACT/2+.000001;return{p,next,minX:Math.min(p.x,next.x)-padding,maxX:Math.max(p.x,next.x)+padding,minY:Math.min(p.y,next.y)-padding,maxY:Math.max(p.y,next.y)+padding}}
function contactTime(a,b,limit){if(a.maxX<b.minX||b.maxX<a.minX||a.maxY<b.minY||b.maxY<a.minY)return Infinity;const p=a.p,q=b.p,ap=a.next,bp=b.next,rx=p.x-q.x,ry=p.y-q.y,vx=(ap.x-p.x-bp.x+q.x)/limit,vy=(ap.y-p.y-bp.y+q.y)/limit,c=rx*rx+ry*ry-CONTACT*CONTACT;if(c<=.00001)return 0;const aa=vx*vx+vy*vy,bb=2*(rx*vx+ry*vy),disc=bb*bb-4*aa*c;if(aa<1e-9||disc<0)return Infinity;const t=(-bb-Math.sqrt(disc))/(2*aa);return t>=0&&t<=limit?t:Infinity}
function nextCorner(a){let n=0;for(let i=1;i<a.path.length;i++){n+=dist(a.path[i-1],a.path[i]);const t=n/a.speed-a.t;if(t>1e-7)return t}return Math.max(0,a.duration-a.t)}
function move(s,dt){
  let left=dt,guard=0;
  while(left>1e-8&&s.armies.length&&guard++<200){
    const movingArmies=s.armies.filter(a=>!a.inBattle);
    let step=Math.max(1e-7,Math.min(left,...(movingArmies.length?movingArmies.map(nextCorner):[left])));
    let hit=Infinity;
    // Cache endpoint geometry once per segment, including stationary battle participants.
    // Swept bounds only reject impossible contacts; the existing exact solver and pair order remain.
    const motions=s.armies.map(a=>contactMotion(a,step));
    for(let i=0;i<s.armies.length;i++){
      for(let j=i+1;j<s.armies.length;j++){
        if(s.armies[i].owner!==s.armies[j].owner&&(!s.armies[i].inBattle||!s.armies[j].inBattle)){
          hit=Math.min(hit,contactTime(motions[i],motions[j],step));
        }
      }
    }
    const advance=Math.min(step,hit);
    s.armies.forEach(a=>{if(!a.inBattle)a.t=Math.min(a.duration,a.t+advance)});
    left-=advance;
    if(hit<=step){
      const pool=[...s.armies],visited=new Set();
      for(const a of pool){
        if(visited.has(a.id))continue;
        const group=[a];
        visited.add(a.id);
        for(let k=0;k<group.length;k++){
          for(const b of pool){
            if(!visited.has(b.id)&&dist(position(group[k]),position(b))<=CONTACT+.001){
              visited.add(b.id);
              group.push(b);
            }
          }
        }
        if(group.length>1&&new Set(group.map(x=>x.owner)).size>1){
          if(s.progressiveCombat){
            engageBattle(s,group);
          }else{
            battleGroups(s,group);
          }
        }
      }
      s.armies=s.armies.filter(a=>a.count>0);
    }
    const arrived=s.armies.filter(a=>!a.inBattle&&a.t>=a.duration-1e-7);
    s.armies=s.armies.filter(a=>a.inBattle||a.t<a.duration-1e-7);
    for(const a of arrived){
      if(a.intercept!==null){
        setPath(a,position(a),s.castles[a.target],'fast');
        a.intercept=null;
        s.armies.push(a);
      }else resolve(s,a);
    }
    checkVictory(s);
    if(s.result)return;
  }
}
function threat(s,id){const c=s.castles[id],incoming=s.armies.filter(a=>a.target===id&&a.intercept===null).map(a=>({id:a.id,owner:a.owner,count:a.count,eta:Math.max(0,a.duration-a.t),friendly:a.owner===c.owner})).sort((a,b)=>a.eta-b.eta||a.id-b.id);let troops=c.troops,owner=c.owner,last=0,carry=c.carry;for(const a of incoming){if(owner){const growth=incomeFor(c).troops*(a.eta-last)+carry;troops+=Math.floor(growth);carry=growth-Math.floor(growth)}last=a.eta;if(a.owner===owner)troops+=a.count;else if(a.count>troops){troops=a.count-troops;owner=a.owner;carry=0}else troops-=a.count}return{incoming,troops,owner,horizon:last}}
function aiTravelTime(s,from,to,route='fast',p=null){
  return routeLength(routeBetween(from,to,route,s.mapIndex))/marchSpeed(from,route,s.weather,s.players[p]?.hero);
}
function aiRoute(s,p,from,to){
  const fast=aiTravelTime(s,from,to,'fast',p);
  const flank=aiTravelTime(s,from,to,'flank',p);
  const hostileRoad=s.armies.some(a=>a.owner!==p&&a.intercept===null&&
    (a.target===from.id||a.source===to.id)&&Math.min(a.duration-a.t,fast)<fast+1);
  return flank<fast*.98||(hostileRoad&&flank<fast*1.3)?'flank':'fast';
}
function aiDefenseFactor(s,c){
  return c.troops?defense(s,c)/c.troops:defense(s,{...c,troops:10000})/10000;
}
function aiAttackPower(s,a,target){
  const r=siegeOutcome(s,a,target);
  return r.strength/(target.troops?r.defPower/target.troops:aiDefenseFactor(s,target));
}
function aiIncoming(s,c,p,ignoreOwnAssaults=false){
  const moving=s.armies.filter(a=>a.target===c.id&&a.intercept===null&&!a.inBattle&&
    !(ignoreOwnAssaults&&c.owner!==p&&a.owner===p));
  // Only our own orders are known before launch; opponent orders are private.
  const ordered=s.orders.filter(o=>o.owner===p&&o.target===c.id&&s.castles[o.source]?.owner===p&&
    !(ignoreOwnAssaults&&c.owner!==p))
    .map(o=>({id:-o.id,owner:o.owner,source:o.source,count:o.count,route:o.route,
      duration:Math.max(0,o.launch-s.time)+aiTravelTime(s,s.castles[o.source],c,o.route,o.owner),t:0}));
  return moving.concat(ordered);
}
function aiForecast(s,c,horizon,p,ignoreOwnAssaults=false){return forecastCastle(s,c.id,horizon,p,ignoreOwnAssaults);}
function aiDragonTarget(s,p){
  const candidates=s.castles.filter(c=>c.owner&&c.owner!==p).map(c=>({x:c.x,y:c.y}));
  candidates.push(...s.armies.filter(a=>a.owner!==p&&a.count>=40).map(a=>position(a,3)));
  let best=null;
  for(const point of candidates){
    let score=0;
    for(const c of s.castles){
      const d=dist(c,point);
      if(d>190)continue;
      score+=(c.owner===p?-1.3:(c.owner ? .75 : .2))*c.troops*(d<=45?.35:.25);
      if(c.owner!==p&&c.type==='elite')score+=55;
    }
    for(const a of s.armies){
      const d=dist(position(a,Math.min(3,Math.max(0,a.duration-a.t))),point);
      if(d<190)score+=(a.owner===p?-1.3:1)*a.count*(d<70?.5:d<130?.4:.3);
    }
    if(!best||score>best.score)best={...point,score};
  }
  return best;
}
function aiForPlayer(s,p){
  const player=s.players[p];
  if(!player||busy(s))return;
  const own=owned(s,p),diff=s.aiDifficulty||'normal',style=player.aiStyle||s.aiStyle||'balanced';
  if(!own.length){
    for(const a of s.armies.filter(a=>a.owner===p&&!a.inBattle)){
      const target=s.castles.filter(c=>c.owner!==p).sort((x,y)=>x.troops-y.troops)[0];
      if(target&&a.target!==target.id)redirect(s,p,a.id,target.id);
    }
    return;
  }
  const hostile=s.castles.filter(c=>c.owner&&c.owner!==p);
  const orderedTargets=[...new Set(s.orders.filter(o=>o.owner===p).map(o=>o.target))];
  for(const id of orderedTargets){
    const target=s.castles[id];
    if(target.owner===p)continue;
    const orders=s.orders.filter(o=>o.owner===p&&o.target===id);
    const marching=s.armies.filter(a=>a.owner===p&&a.target===id&&a.intercept===null);
    const commitment=orders.reduce((n,o)=>n+o.count,0)+marching.reduce((n,a)=>n+a.count,0);
    const eta=Math.max(...orders.map(o=>Math.max(0,o.launch-s.time)+
      aiTravelTime(s,s.castles[o.source],target,o.route,p)),
      ...marching.map(a=>Math.max(0,a.duration-a.t)));
    const projected=aiForecast(s,target,eta+1,p,true);
    const required=Math.ceil(projected.troops*aiDefenseFactor(s,projected))+
      (diff==='hard'?18:diff==='normal'?14:5);
    if(projected.owner!==p&&commitment<required*.9){
      for(const o of orders)cancelOrder(s,p,o.id);
    }
  }
  const enemyDistance=c=>hostile.reduce((best,e)=>Math.min(best,dist(c,e)),Infinity);
  const incoming=c=>aiIncoming(s,c,p).filter(a=>a.owner!==p);
  const expectedThreat=c=>incoming(c).reduce((n,a)=>n+a.count,0);
  const likelyPressure=c=>hostile.reduce((largest,e)=>{
    const distance=dist(c,e);
    if(distance>600||distance>Math.min(...own.map(h=>dist(h,e)))+120)return largest;
    return Math.max(largest,Math.floor(e.troops*.65));
  },0);
  const danger=new Map();
  for(const c of own){
    const near=enemyDistance(c);
    const pressure=expectedThreat(c);
    const base=diff==='easy'?35:near<420?Math.max(24,Math.ceil(c.troops*.18)):near<650?18:12;
    c.reserve=Math.min(c.troops,Math.max(base,Math.ceil(pressure*.65),Math.ceil(likelyPressure(c)*(diff==='hard'?0.6:.45))));
    if(pressure){
      const horizon=Math.max(...incoming(c).map(a=>Math.max(0,a.duration-a.t)))+1;
      const forecast=aiForecast(s,c,horizon,p);
      if(forecast.owner!==p||forecast.troops<Math.max(12,base*.5)){
        danger.set(c.id,{c,forecast,eta:forecast.firstLoss??horizon,pressure});
      }
    }
  }
  // A visible enemy march gives a concrete deadline. Reinforce only from castles
  // whose armies can arrive before that deadline and remain safe themselves.
  for(const {c,eta,pressure} of [...danger.values()].sort((a,b)=>a.eta-b.eta)){
    const horizon=Math.max(...incoming(c).map(a=>Math.max(0,a.duration-a.t)))+1;
    for(const o of s.orders.filter(o=>o.owner===p&&o.source===c.id&&o.launch-s.time<=eta)){
      if(cancelOrder(s,p,o.id)){
        const safe=aiForecast(s,c,horizon,p);
        if(safe.owner===p&&safe.troops>=18)break;
      }
    }
    const forecast=aiForecast(s,c,horizon,p);
    if(forecast.owner===p&&forecast.troops>=18)continue;
    const hostileForce=incoming(c).filter(a=>a.duration-a.t<=eta+.1)
      .reduce((n,a)=>n+aiAttackPower(s,a,c),0);
    const friendlyForce=aiIncoming(s,c,p).filter(a=>a.owner===p&&a.duration-a.t<=eta+.1)
      .reduce((n,a)=>n+a.count,0);
    const outgoing=s.orders.filter(o=>o.owner===p&&o.source===c.id&&o.launch-s.time<=eta)
      .reduce((n,o)=>n+o.count,0);
    let needed=Math.max(0,Math.ceil(hostileForce+outgoing+18-c.troops-
      friendlyForce-incomeFor(c,c.level,c.specialty,player.hero).troops*eta));
    if(needed<=0)needed=15;
    const helpers=own.filter(h=>h.id!==c.id&&!danger.has(h.id)&&available(s,h)>8)
      .map(h=>({h,time:aiTravelTime(s,h,c,'fast',p),capacity:Math.min(available(s,h),
        Math.max(0,h.troops-Math.ceil(likelyPressure(h)*.75)))}))
      .filter(x=>x.time+0.35<eta)
      .sort((a,b)=>a.time-b.time);
    for(const {h,capacity} of helpers){
      if(needed<=0)break;
      const count=Math.min(capacity,needed);
      if(count>=5&&dispatch(s,p,h.id,c.id,count))needed-=count;
    }

  }
  // A buildup at the neighboring enemy keep is a likely next move. Stage a
  // limited reserve before its army leaves, while keeping the rear defended.
  for(const c of own.filter(c=>!danger.has(c.id))){
    const potential=likelyPressure(c);
    if(potential<c.troops*1.3||potential<65)continue;
    const helper=own.filter(h=>h.id!==c.id&&!danger.has(h.id)&&
      enemyDistance(h)>enemyDistance(c)+150&&available(s,h)>=40&&dist(h,c)<650)
      .sort((a,b)=>dist(a,c)-dist(b,c))[0];
    if(helper){
      const count=Math.min(Math.ceil(potential-c.troops),Math.floor(available(s,helper)*.4));
      if(count>=15)dispatch(s,p,helper.id,c.id,count);
    }
  }
  // Spend on production where the marginal gain matters. Keep gold for an
  // imminent defense instead of consuming the entire treasury on upgrades.
  let reserveGold=danger.size?Math.min(300,Math.max(...[...danger.values()].map(x=>x.pressure))):0;
  const dragonReady=diff==='hard'&&own.length>=3&&s.time>=40&&
    ((s.dragonCooldowns&&s.dragonCooldowns[p])||0)<=0&&!s.dragonStrike;
  const dragonTarget=dragonReady?aiDragonTarget(s,p):null;
  if(dragonTarget?.score>=100&&player.gold>=500)reserveGold=Math.max(reserveGold,1000);
  const upgrades=own.filter(c=>c.level<MAX_CASTLE_LEVEL&&upgradeCost(c,p,s)<=player.gold-reserveGold)
    .map(c=>{
      const spec=c.type==='gold'?'economy':style==='economist'&&c.type==='main'&&own.length<3?'economy':'military';
      const before=incomeFor(c,c.level,c.specialty,player.hero);
      const after=incomeFor(c,c.level+1,spec,player.hero);
      const near=enemyDistance(c);
      const value=(after.troops-before.troops)*(near<650?1.5:1)+
        (after.gold-before.gold)*(style==='economist'?1.1:.7);
      return{c,spec,score:value/upgradeCost(c,p,s)};
    }).sort((a,b)=>b.score-a.score||a.c.id-b.c.id);
  if(upgrades.length)upgrade(s,p,upgrades[0].c.id,upgrades[0].spec);
  // Strike projected positions after the warning delay; include friendly fire.
  if(canDragonStrike(s,p)){
    const best=dragonTarget||aiDragonTarget(s,p);
    if(best&&best.score>=(diff==='hard'?100:140))launchDragonStrike(s,p,best.x,best.y);
  }
  if(s.dragonStrike&&s.dragonStrike.owner!==p&&s.dragonStrike.state==='incoming'){
    for(const a of s.armies.filter(a=>a.owner===p&&!a.inBattle&&a.intercept===null)){
      if(dist(position(a,Math.min(2.5,a.duration-a.t)),s.dragonStrike)<s.dragonStrike.radius&&
        dist(position(a),s.dragonStrike)<s.dragonStrike.radius+90)recall(s,p,a.id);
    }
  }
  const leading=Object.keys(s.players).filter(o=>o!==p)
    .sort((a,b)=>owned(s,b).length-owned(s,a).length)[0];
  const choices=[];
  for(const target of s.castles){
    if(target.owner===p||s.armies.some(a=>a.owner===p&&a.target===target.id&&a.intercept===null)||
      s.orders.some(o=>o.owner===p&&o.target===target.id))continue;
    if(diff==='easy'&&target.owner&&own.length<4)continue;
    const fronts=own.filter(c=>areCastlesConnected(c.id,target.id,s.mapIndex)||dist(c,target)<360);
    if(!fronts.length)continue;
    const nearestDist=Math.min(...fronts.map(c=>dist(c,target)));
    if(target.owner&&nearestDist>580)continue;
    const sources=own.filter(c=>!danger.has(c.id)&&available(s,c)>=5&&
      (dist(c,target)<=Math.max(520,nearestDist+220)||fronts.includes(c)))
      .map(c=>({c,route:aiRoute(s,p,c,target)}))
      .map(x=>({...x,time:aiTravelTime(s,x.c,target,x.route,p)}))
      .sort((a,b)=>a.time-b.time||a.c.id-b.c.id);
    if(!sources.length)continue;
    const maxSources=diff==='easy'?1:diff==='hard'?4:3;
    let selected=[],total=0,need=Infinity;
    for(const src of sources.slice(0,maxSources)){
      selected.push(src);
      total+=available(s,src.c);
      const eta=Math.max(...selected.map(x=>x.time));
      const predicted=aiForecast(s,target,eta+1,p);
      const defender=predicted.owner===p?0:predicted.troops;
      const factor=aiDefenseFactor(s,predicted);
      const safety=diff==='hard'?18:diff==='normal'?14:5;
      need=Math.ceil(defender*factor)+safety;
      if(target.owner&&target.type==='elite')need+=15;
      if(total>=need)break;
    }
    if(total<need)continue;
    const eta=Math.max(...selected.map(x=>x.time));
    const cost=need+eta*9;
    let value=target.type==='elite'?250:target.type==='gold'?160:target.type==='troop'?135:
      target.type==='knight'||target.type==='cavalry'?125:target.type==='archer'?110:80;
    if(target.type==='main'&&target.owner)value+=100;
    if(target.owner===leading)value+=55;
    if(s.crownHolder&&s.crownHolder!==p&&target.type==='elite')value+=220;
    if(style==='economist'&&target.type==='gold')value+=90;
    if(style==='raider'&&['troop','cavalry','knight'].includes(target.type))value+=45;
    if(target.owner)value+=35;
    const deployed=s.armies.filter(a=>a.owner===target.owner&&a.source===target.id&&
      a.target!==target.id).reduce((n,a)=>n+a.count,0);
    if(target.owner&&deployed>target.troops*.6)value+=Math.min(110,deployed*.35);
    choices.push({target,selected,need,score:value-cost*.38-eta*3});
  }
  choices.sort((a,b)=>b.score-a.score||a.target.id-b.target.id);
  const used=new Set();
  let attacks=0;
  for(const choice of choices){
    if(attacks>=(diff==='hard'?2:1))break;
    const sources=choice.selected.filter(x=>!used.has(x.c.id));
    if(sources.length!==choice.selected.length)continue;
    let remaining=choice.need;
    const entries=[];
    for(const {c} of sources){
      const count=Math.min(remaining,available(s,c));
      if(count>0){entries.push({source:c.id,count});remaining-=count;}
      if(remaining<=0)break;
    }
    if(remaining>0)continue;
    const route=sources.some(x=>x.route==='flank')&&sources.every(x=>
      aiTravelTime(s,x.c,choice.target,'flank',p)<=aiTravelTime(s,x.c,choice.target,'fast',p)*1.3)?'flank':'fast';
    const finalEta=Math.max(...sources.map(x=>aiTravelTime(s,x.c,choice.target,route,p)));
    const finalForecast=aiForecast(s,choice.target,finalEta+1,p);
    const finalNeed=Math.ceil((finalForecast.owner===p?0:finalForecast.troops)*
      aiDefenseFactor(s,choice.target))+
      (diff==='hard'?18:diff==='normal'?14:5)+
      (choice.target.owner&&choice.target.type==='elite'?15:0);
    if(finalNeed>entries.reduce((n,e)=>n+e.count,0)){
      let extra=finalNeed-entries.reduce((n,e)=>n+e.count,0);
      for(const e of entries){
        const capacity=available(s,s.castles[e.source])-e.count;
        const add=Math.min(extra,capacity);
        e.count+=add;
        extra-=add;
        if(extra<=0)break;
      }
      if(extra>0)continue;
    }
    const launched=entries.length===1?dispatch(s,p,entries[0].source,choice.target.id,entries[0].count,{route}):
      coordinate(s,p,choice.target.id,entries,{synchronized:true,route});
    if(launched){for(const e of entries)used.add(e.source);attacks++;}
  }
  // Move surplus from the rear toward the nearest safe frontline castle. Supply
  // is reviewed every decision so a changing frontline does not drain a new border.
  if(own.length>2){
    const fronts=own.filter(c=>enemyDistance(c)<650&&!danger.has(c.id));
    for(const rear of own){
      if(used.has(rear.id)||danger.has(rear.id)||available(s,rear)<35)continue;
      const target=fronts.filter(c=>c.id!==rear.id&&enemyDistance(c)+150<enemyDistance(rear)&&
        dist(c,rear)<650).sort((a,b)=>dist(a,rear)-dist(b,rear))[0];
      if(target){
        if(rear.supply?.target!==target.id)setSupply(s,p,rear.id,target.id);
      }else if(rear.supply)setSupply(s,p,rear.id,null);
    }
  }
  if(diff!=='easy'){
    for(const enemy of s.armies.filter(a=>a.owner!==p&&a.intercept===null&&a.target!==undefined&&
      s.castles[a.target]?.owner===p&&!a.inBattle)){
      const defender=s.armies.find(a=>a.owner===p&&a.intercept===null&&!a.inBattle&&
        a.count>=enemy.count*1.35&&a.returning&&rendezvous(position(a),enemy));
      if(defender)intercept(s,p,defender.id,enemy.id);
    }
  }
}
function ai(s){
  if(root.CrownAI&&root.CrownAI.step){
    root.CrownAI.step(s);
    return;
  }
  if(s.botPlayers&&Array.isArray(s.botPlayers)){
    for(const bot of s.botPlayers){
      if(s.players[bot])aiForPlayer(s,bot);
    }
  }else{
    aiForPlayer(s,'red');
  }
}
function checkVictory(s){
  if(s.result)return;
  const pKeys=Object.keys(s.players);
  for(const p of pKeys){
    if(s.castles.every(c=>c.owner===p)){
      s.result=p;
      s.resultReason='conquest';
      report(s,`${p==='blue'?'Azure':p==='red'?'Crimson':p.toUpperCase()} controls every castle. Match complete.`);
      return;
    }
  }
  if(s.victoryMode==='crown_control'){
    const elite=s.castles.find(c=>c.type==='elite');
    if(elite&&elite.owner){
      const ownedCount=s.castles.filter(c=>c.owner===elite.owner).length;
      if(ownedCount>=14){
        if(s.crownHolder===elite.owner){
          if(s.crownHoldTimer>=30){
            s.result=elite.owner;
            s.resultReason='crown_control';
            report(s,`👑 ${elite.owner.toUpperCase()} achieved Crown Control victory by holding the realm and Elite Citadel!`);
            return;
          }
        }else{
          s.crownHolder=elite.owner;
          s.crownHoldTimer=0;
          report(s,`👑 ${elite.owner.toUpperCase()} seized Crown Control! Hold for 30s to secure victory.`);
        }
      }else if(s.crownHolder){
        s.crownHolder=null;
        s.crownHoldTimer=0;
        report(s,'Crown Control contested! Timer reset.');
      }
    }else if(s.crownHolder){
      s.crownHolder=null;
      s.crownHoldTimer=0;
      report(s,'Crown Control contested! Timer reset.');
    }
  }
  if(s.time>8&&pKeys.length>1){
    const active=pKeys.filter(p=>s.castles.some(c=>c.owner===p)||s.armies.some(a=>a.owner===p));
    if(active.length===0){s.result='draw';s.resultReason='draw';report(s,'All armies eliminated. Draw.');return}
    if(active.length===1){
      s.result=active[0];
      s.resultReason='elimination';
      report(s,`${active[0].toUpperCase()} eliminated all opponents! Match complete.`);
    }
  }
}
function advance(s,dt){
  s.time+=dt;
  if(s.crownHolder)s.crownHoldTimer=(s.crownHoldTimer||0)+dt;
  if(s.weather){
    s.weather.timer-=dt;
    if(s.weather.timer<=0){
      const cycle=['clear','rain','fog','snow'];
      s.weather.index=((s.weather.index||0)+1)%cycle.length;
      s.weather.type=cycle[s.weather.index];
      s.weather.timer=45;
      const wName=WEATHER_TYPES[s.weather.type]?.name||s.weather.type;
      report(s,`Weather changed to ${wName}.`);
      s.effects.push({x:550,y:380,text:`WEATHER: ${wName.toUpperCase()}`,owner:'neutral',life:2.5});
      for(const a of s.armies){
        if(a.marchBoost===undefined)a.marchBoost=['knight','cavalry'].includes(s.castles[a.source]?.type);
        const newSpeed=marchSpeed(a,a.route,s.weather,s.players[a.owner]?.hero);
        if(newSpeed!==a.speed){
          const f=Math.min(1,a.t/a.duration);
          a.speed=newSpeed;
          a.duration=Math.max(.001,a.length/a.speed);
          a.t=f*a.duration;
        }
      }
    }
  }
  for(const c of s.castles){
    if(c.stabilizing>0)c.stabilizing=Math.max(0,c.stabilizing-dt);
    if(c.scorched>0)c.scorched=Math.max(0,c.scorched-dt);
    if(c.owner){
      const inc=incomeFor(c,c.level,c.specialty,s.players[c.owner]?.hero),growth=c.carry+inc.troops*dt,n=Math.floor(growth+1e-9);
      c.carry=Math.max(0,growth-n);
      const produced=Math.min(n,MAX_RESOURCE-c.troops);
      c.troops+=produced;
      if(s.stats[c.owner])s.stats[c.owner].produced=addResource(s.stats[c.owner].produced,produced);
      if(s.players[c.owner]){
        const earned=Math.min(MAX_RESOURCE-s.players[c.owner].gold,inc.gold*dt);
        s.players[c.owner].gold+=earned;
        if(s.stats[c.owner])s.stats[c.owner].goldEarned=addResource(s.stats[c.owner].goldEarned||0,earned);
      }
    }
  }
  for(const o of [...s.orders]){
    const c=s.castles[o.source];
    if(c.owner!==o.owner||o.count>c.troops){
      s.orders=s.orders.filter(x=>x.id!==o.id);
      report(s,`Order ${o.id} cancelled: source unavailable.`);
    }else if(o.launch<=s.time+1e-8){
      s.orders=s.orders.filter(x=>x.id!==o.id);
      if(!dispatch(s,o.owner,o.source,o.target,o.count,{route:o.route,respectReserve:false}))report(s,`Order ${o.id} cancelled: insufficient uncommitted troops.`);
    }
  }
  for(const c of s.castles)if(c.supply){
    const supply=c.supply,target=s.castles[supply.target];
    if(c.owner!==supply.owner||target.owner!==c.owner){
      c.supply=null;
      report(s,`Supply from ${c.name} stopped.`);
    }else if(supply.next<=s.time){
      supply.next=s.time+5;
      const n=available(s,c);
      if(n>0)dispatch(s,c.owner,c.id,target.id,n,{route:supply.route});
    }
  }
  for(const a of s.armies)if(a.intercept!==null){
    a.interceptTimer-=dt;
    if(a.interceptTimer<=0){
      const target=s.armies.find(b=>b.id===a.intercept),point=target&&rendezvous(position(a),target);
      if(point){
        setPath(a,position(a),point,'intercept',s.weather,s.players[a.owner]?.hero);
        a.interceptTimer=.25;
      }else{
        a.intercept=null;
        setPath(a,position(a),s.castles[a.target],'fast',s.weather,s.players[a.owner]?.hero);
      }
    }
  }
  move(s,dt);
  if(s.progressiveCombat)tickBattles(s,dt);
  processDragonStrike(s,dt);
  reconcileOrders(s);
  s.effects=s.effects.filter(e=>(e.life-=dt)>0);
  sync(s);
  if(s.result)return;
  s.aiTimer-=dt;
  if(s.aiTimer<=0){
    s.aiTimer={easy:5.0,normal:2.5,hard:1.4}[s.aiDifficulty]||2.5;
    if(!s.aiDisabled&&(!s.botPlayers||s.botPlayers.length<=1))ai(s);
  }
  if(s.botPlayers&&s.botPlayers.length>1&&!s.aiDisabled){
    for(const bot of s.botPlayers){
      const pl=s.players[bot];
      if(pl){
        pl.aiTimer=(pl.aiTimer||2.5)-dt;
        if(pl.aiTimer<=0){
          const baseTimer=pl.aiStyle==='raider'?1.8:pl.aiStyle==='defender'?2.6:pl.aiStyle==='economist'?3.2:2.4;
          const diffMult=s.aiDifficulty==='hard'?0.7:s.aiDifficulty==='easy'?1.6:1.0;
          pl.aiTimer=(baseTimer*diffMult)+(rng(s.seed+(pl.home||0)*19+Math.floor(s.time*4))()-0.5)*0.5;
          aiForPlayer(s,bot);
        }
      }
    }
  }
  checkVictory(s);
}
function tick(s,dt){if(busy(s)||!Number.isFinite(dt)||dt<=0)return;checkVictory(s);if(s.result)return;let left=Math.min(dt,.25);while(left>1e-8&&!s.result){const step=Math.min(.025,left);advance(s,step);left-=step}}
function serialize(s){return JSON.stringify({...s,version:VERSION,paused:true,effects:[]})}
function deserialize(input){
 try{
  let s;
  if(typeof input==='string'){
    if(input.length>5e6)return null;
    s=JSON.parse(input);
  }else if(typeof input==='object'&&input!==null){
    const text=JSON.stringify(input);
    if(text.length>5e6)return null;
    s=JSON.parse(text);
  }else{
    return null;
  }
  const finite=n=>Number.isFinite(n)&&n>=0&&n<=MAX_RESOURCE,
    whole=n=>Number.isSafeInteger(n)&&finite(n),index=n=>Number.isInteger(n)&&n>=0&&n<21,
    point=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&Math.abs(p.x)<=3500&&Math.abs(p.y)<=3500,
    route=r=>['fast','flank'].includes(r);
  if(!s||![4,VERSION].includes(s.version)||!Array.isArray(s.castles)||s.castles.length!==21||!finite(s.time)||(!Number.isSafeInteger(s.seed)||s.seed<0)||!Array.isArray(s.armies)||s.armies.length>5000||!Array.isArray(s.orders)||s.orders.length>5000||!s.players||!s.stats)return null;
  const keys=Object.keys(s.players),owner=p=>keys.includes(p);
  const legacy=s.version===4;
  const legacyUnits=(u,n)=>u&&typeof u==='object'&&!Array.isArray(u)&&
    Object.keys(u).every(k=>['soldier','archer','knight','cavalry'].includes(k))&&
    ['soldier','archer','knight','cavalry'].every(k=>whole(u[k]))&&Object.values(u).reduce((a,b)=>a+b,0)===n;
  for(const c of s.castles){
    if(!c||c.scorched!==undefined&&!finite(c.scorched))return null;
    if(legacy&&c.units!==undefined&&!legacyUnits(c.units,c.troops))return null;
    if(legacy&&c.trainingQueue!==undefined&&(!Array.isArray(c.trainingQueue)||c.trainingQueue.length>5||!c.trainingQueue.every(q=>q&&whole(q.id)&&q.id>0&&['soldier','archer','knight','cavalry'].includes(q.type)&&whole(q.count)&&q.count>0&&finite(q.cost)&&finite(q.totalTime)&&q.totalTime>=1&&finite(q.timeRemaining)&&q.timeRemaining>0&&q.timeRemaining<=q.totalTime)))return null;
  }
  for(const a of s.armies){
    if(!a||legacy&&a.units!==undefined&&!legacyUnits(a.units,a.count)||
      a.marchBoost!==undefined&&typeof a.marchBoost!=='boolean'||a.siegeBoost!==undefined&&typeof a.siegeBoost!=='boolean')return null;
  }
  if(s.matchId===undefined)s.matchId=`legacy:${s.seed}:${s.mapIndex??0}`;
  if(typeof s.matchId!=='string'||!s.matchId.length||s.matchId.length>160)return null;
  if(s.battles===undefined)s.battles=[];
  if(!Array.isArray(s.battles)||s.battles.length>5000)return null;
  const membership=new Map();
  for(const b of s.battles){
    if(!b||!whole(b.id)||b.id<1||!point(b)||!finite(b.elapsed)||!Array.isArray(b.armies)||b.armies.length>5000||new Set(b.armies).size!==b.armies.length||!b.armies.every(whole)||!b.hpPools||Array.isArray(b.hpPools)||!Object.entries(b.hpPools).every(([p,hp])=>owner(p)&&Number.isFinite(hp)&&hp>=0&&hp<=MAX_RESOURCE*640))return null;
    for(const id of b.armies){if(membership.has(id))return null;membership.set(id,b.id);}
  }
  if(new Set(s.battles.map(b=>b.id)).size!==s.battles.length||s.armies.some(a=>a.inBattle?membership.get(a.id)!==a.inBattle:membership.has(a.id)))return null;
  if(s.nextBattleId===undefined)s.nextBattleId=1;
  if(!whole(s.nextBattleId)||s.nextBattleId<1||s.battles.some(b=>b.id>s.nextBattleId))return null;
  if(s.weather&&(!['clear','rain','fog','snow'].includes(s.weather.type)||!finite(s.weather.timer)||s.weather.timer>45||!Number.isInteger(s.weather.index)||s.weather.index<0||s.weather.index>3))return null;
  if(s.dragonCooldowns===undefined)s.dragonCooldowns={};
  if(!s.dragonCooldowns||Array.isArray(s.dragonCooldowns)||!Object.entries(s.dragonCooldowns).every(([p,n])=>owner(p)&&finite(n)&&n<=75))return null;
  if(s.dragonStrike){const d=s.dragonStrike;if(!owner(d.owner)||!point(d)||d.x<0||d.x>2200||d.y<0||d.y>1500||d.radius!==190||!Number.isFinite(d.timer)||d.timer<-.0251||d.timer>3||d.totalTimer!==3||!finite(d.impactTimer)||d.impactTimer>1.6||!['incoming','impact'].includes(d.state))return null;}
  for(const p of keys){
    if(!s.stats[p])return null;
    for(const k of ['casualtiesInflicted','goldEarned']){if(s.stats[p][k]===undefined)s.stats[p][k]=0;if(!finite(s.stats[p][k]))return null;}
  }

  if(keys.length<2||keys.length>4||keys.some((p,i)=>p!==PLAYER_KEYS[i]))return null;
  if(!s.castles.every((c,i)=>c&&c.id===i&&Object.hasOwn(TYPES,c.type)&&typeof c.name==='string'&&c.name.length<=100&&(c.owner===null||owner(c.owner))&&whole(c.troops)&&whole(c.reserve)&&finite(c.carry)&&c.carry<1&&Number.isInteger(c.level)&&c.level>=1&&c.level<=MAX_CASTLE_LEVEL&&['balanced','military','economy'].includes(c.specialty)&&point(c)&&(!c.supply||(index(c.supply.target)&&c.supply.owner===c.owner&&finite(c.supply.next)&&route(c.supply.route)))&&(c.stabilizing===undefined||finite(c.stabilizing))))return null;
  if(!s.armies.every(a=>a&&whole(a.id)&&owner(a.owner)&&whole(a.count)&&a.count>0&&index(a.target)&&index(a.source)&&finite(a.t)&&finite(a.duration)&&a.duration>0&&a.t<=a.duration&&finite(a.length)&&finite(a.speed)&&a.speed>=40&&a.speed<=350&&Array.isArray(a.path)&&a.path.length>=2&&a.path.length<=32&&a.path.every(point)&&Math.abs(routeLength(a.path)-a.length)<.001&&Math.abs(Math.max(.001,a.length/a.speed)-a.duration)<.001&&[...['fast','flank'],'intercept'].includes(a.route)&&(a.intercept===null||(whole(a.intercept)&&finite(a.interceptTimer)))))return null;
  if(!s.orders.every(o=>o&&whole(o.id)&&owner(o.owner)&&index(o.source)&&index(o.target)&&o.source!==o.target&&s.castles[o.source].owner===o.owner&&whole(o.count)&&o.count>0&&finite(o.launch)&&route(o.route)))return null;
  if(legacy&&s.orders.some(o=>o.units!==undefined&&!legacyUnits(o.units,o.count)))return null;
  if(new Set(s.armies.map(a=>a.id)).size!==s.armies.length||new Set(s.orders.map(o=>o.id)).size!==s.orders.length||!whole(s.nextArmy)||!whole(s.nextOrder)||s.armies.some(a=>a.id>=s.nextArmy)||s.orders.some(o=>o.id>=s.nextOrder))return null;
  const statKeys=['produced','roadLosses','attackLosses','defenseLosses','captures','dispatched'];
  for(const p of keys)if(!s.players[p]||!finite(s.players[p].gold)||!index(s.players[p].home)||!s.stats[p]||!statKeys.every(k=>finite(s.stats[p][k])))return null;
  for(const p of keys){if(s.players[p].hero&&!['vanguard','fortifier','guildmaster','infiltrator'].includes(s.players[p].hero))s.players[p].hero=null;}
  for(const c of s.castles){
    if(reserved(s,c.id)>c.troops||(c.supply&&c.owner===null))return null;
    const seen=new Set([c.id]);let next=c;
    while(next.supply){const target=s.castles[next.supply.target];if(target.owner!==c.owner||seen.has(target.id))return null;seen.add(target.id);next=target}
  }
  if(!finite(s.aiTimer)||!(s.result===null||s.result==='draw'||owner(s.result)))return null;
  if(s.botPlayers!==undefined&&(!Array.isArray(s.botPlayers)||s.botPlayers.some(p=>!owner(p))||new Set(s.botPlayers).size!==s.botPlayers.length))return null;
  s.botPlayers=s.botPlayers||keys.slice(1);s.aiDisabled=s.aiDisabled===true;
  s.events=Array.isArray(s.events)?s.events.filter(e=>e&&typeof e.text==='string'&&finite(e.time)).slice(0,60):[];
  s.effects=[];s.paused=true;s.playerCount=keys.length;s.epoch=s.epoch&&EPOCHS[s.epoch]?s.epoch:'18th';s.region=s.region&&REGIONS[s.region]?s.region:'europe';
  s.weather=(s.weather&&['clear','rain','fog','snow'].includes(s.weather.type))?s.weather:{type:'clear',duration:45,timer:45,index:0};
  if(!['easy','normal','hard'].includes(s.aiDifficulty))s.aiDifficulty='normal';
  if(!['balanced','defender','economist','raider'].includes(s.aiStyle))s.aiStyle='balanced';
  s.mapIndex=Number.isSafeInteger(s.mapIndex)&&s.mapIndex>=0&&s.mapIndex<MAP_NAMES.length?s.mapIndex:0;
  s.mapName=MAP_NAMES[s.mapIndex];s.castles.forEach(c=>{c.mapIndex=s.mapIndex});
  s.battles=Array.isArray(s.battles)?s.battles:[];
  s.dragonStrike=s.dragonStrike||null;
  s.dragonCooldowns=s.dragonCooldowns||{};
  s.nextBattleId=Number.isSafeInteger(s.nextBattleId)?s.nextBattleId:1;
  s.progressiveCombat=s.progressiveCombat===true;
  // Pending paid recruitment is cancelled and refunded when converting a v4 save.
  for(const c of s.castles){
    if(legacy&&c.owner&&s.players[c.owner])for(const q of c.trainingQueue||[])s.players[c.owner].gold=addResource(s.players[c.owner].gold,q.cost);
    delete c.trainingQueue;delete c.units;
    c.scorched=Number.isFinite(c.scorched)?c.scorched:0;
  }
  for(const p of keys)delete s.players[p].unit;
  for(const o of s.orders)delete o.units;
  for(const a of s.armies){
    const progress=a.t/a.duration;
    a.marchBoost=a.marchBoost??['knight','cavalry'].includes(s.castles[a.source]?.type);
    a.siegeBoost=a.siegeBoost??(s.castles[a.source]?.type==='knight');
    delete a.units;
    if(legacy){a.speed=marchSpeed(a,a.route,s.weather,s.players[a.owner]?.hero);a.duration=Math.max(.001,a.length/a.speed);a.t=progress*a.duration;}
  }
  if(legacy)for(const b of s.battles)for(const p of Object.keys(b.hpPools)){
    const max=s.armies.filter(a=>b.armies.includes(a.id)&&a.owner===p).reduce((n,a)=>n+a.count*100,0);
    b.hpPools[p]=Math.min(b.hpPools[p],max);
  }
  delete s.nextTrainId;s.version=VERSION;
  sync(s);return s;
 }catch{return null}
}

const api={VERSION,MAP_BOUNDS,clampMapPoint,marchSpeed,siegeOutcome,forecastCastle,setAIStyle,MAX_RESOURCE,MAX_CASTLE_LEVEL,UPGRADE_COSTS,TYPES,ERAS,EPOCHS,REGIONS,getCastleRoleName,NODE_CATEGORIES,getNodeCategory,getCastleStrategicInfo,hasConnectedDefenseNode,WEATHER_TYPES,HEROES,MAPS,MAP_NAMES,MAP_PLAYERS,PLAYER_KEYS,randomizeCastleTypes,rng,create,owned,totals,sync,incomeFor,income,power,defense,nearest,available,reserved,routeBetween,routeLength,position,dispatch,attack,setReserve,setSupply,coordinate,cancelOrder,redirect,recall,rendezvous,intercept,resolve,battleGroups,upgradeCost,upgrade,specialize,validateMapRoster,canDragonStrike,launchDragonStrike,engageBattle,tickBattles,ai,aiForPlayer,checkVictory,tick,threat,serialize,deserialize};if(typeof module!=='undefined')module.exports=api;root.CrownEngine=api;
})(typeof window==='undefined'?globalThis:window);
