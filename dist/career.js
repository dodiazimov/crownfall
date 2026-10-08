/* ===================================================================
   CROWNFALL - Commander Career & Rank Progression Engine
   Tracks career metrics, winrate, ranks, badges and achievements.
   Persists in localStorage ('crownfall_career') and integrates with server.
   =================================================================== */
(function (root) {
  'use strict';

  const STORAGE_KEY = 'crownfall_career_v1';

  const RANKS = [
    { id: 'novice', minWins: 0, nextWins: 3, icon: '🛡️', color: '#a0b3c6', nameKey: 'rank_novice' },
    { id: 'castellan', minWins: 3, nextWins: 10, icon: '⚔️', color: '#279fff', nameKey: 'rank_castellan' },
    { id: 'baron', minWins: 10, nextWins: 25, icon: '🏰', color: '#bb44f0', nameKey: 'rank_baron' },
    { id: 'warlord', minWins: 25, nextWins: 50, icon: '🦅', color: '#ff4757', nameKey: 'rank_warlord' },
    { id: 'grand_marshal', minWins: 50, nextWins: null, icon: '👑', color: '#ffd359', nameKey: 'rank_grand_marshal' }
  ];

  const ACHIEVEMENTS = [
    {
      id: 'first_victory',
      icon: '🥇',
      titleKey: 'achieve_first_title',
      descKey: 'achieve_first_desc',
      check: stats => (stats.wins || 0) >= 1
    },
    {
      id: 'realm_conqueror',
      icon: '🏰',
      titleKey: 'achieve_conqueror_title',
      descKey: 'achieve_conqueror_desc',
      check: stats => (stats.castlesCaptured || 0) >= 25
    },
    {
      id: 'warlord_distinction',
      icon: '🦅',
      titleKey: 'achieve_warlord_title',
      descKey: 'achieve_warlord_desc',
      check: stats => (stats.wins || 0) >= 10
    },
    {
      id: 'grand_conquest',
      icon: '👑',
      titleKey: 'achieve_grand_title',
      descKey: 'achieve_grand_desc',
      check: stats => !!stats.hasGrandConquest
    },
    {
      id: 'iron_bastion',
      icon: '🛡️',
      titleKey: 'achieve_iron_title',
      descKey: 'achieve_iron_desc',
      check: stats => !!stats.hasIronBastion
    },
    {
      id: 'treasury_master',
      icon: '🪙',
      titleKey: 'achieve_treasury_title',
      descKey: 'achieve_treasury_desc',
      check: stats => (stats.goldAmassed || 0) >= 500
    }
  ];

  function getInitialStats() {
    return {
      battles: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      recordedMatchIds: [],
      castlesCaptured: 0,
      casualtiesInflicted: 0,
      troopsDispatched: 0,
      goldAmassed: 0,
      hasGrandConquest: false,
      hasIronBastion: false,
      specialtyUsage: { balanced: 0, military: 0, economy: 0 },
      history: []
    };
  }

  function loadStats() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return getInitialStats();
      const parsed = JSON.parse(raw);
      return {
        ...getInitialStats(),
        ...parsed,
        specialtyUsage: {
          ...getInitialStats().specialtyUsage,
          ...(parsed.specialtyUsage || {})
        }
      };
    } catch {
      return getInitialStats();
    }
  }

  function saveStats(stats) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    } catch {}
  }

  function getRank(wins) {
    const w = Math.max(0, Number(wins) || 0);
    let cur = RANKS[0];
    for (let i = RANKS.length - 1; i >= 0; i--) {
      if (w >= RANKS[i].minWins) {
        cur = RANKS[i];
        break;
      }
    }

    let progressPct = 100;
    let needed = 0;
    if (cur.nextWins !== null) {
      const span = cur.nextWins - cur.minWins;
      const done = w - cur.minWins;
      progressPct = Math.min(100, Math.max(0, Math.round((done / span) * 100)));
      needed = Math.max(0, cur.nextWins - w);
    }

    return {
      ...cur,
      currentWins: w,
      progressPct,
      neededWins: needed
    };
  }

  function getWinrate(wins, battles) {
    if (!battles || battles <= 0) return 0;
    return Math.round((wins / battles) * 100);
  }

  function getFavoriteSpecialty(usage) {
    if (!usage) return 'balanced';
    let best = 'balanced';
    let max = -1;
    for (const [key, count] of Object.entries(usage)) {
      if (count > max) {
        max = count;
        best = key;
      }
    }
    return best;
  }

  function recordMatch(params) {
    const stats = loadStats();
    if (params.matchId && stats.recordedMatchIds.includes(params.matchId)) return stats;
    if (params.matchId) stats.recordedMatchIds.push(params.matchId);
    const outcome = params.outcome || (params.isWin ? 'win' : 'loss');
    stats.battles += 1;
    if (outcome === 'win') {
      stats.wins += 1;
    } else if (outcome === 'draw') {
      stats.draws += 1;
    } else {
      stats.losses += 1;
    }

    stats.castlesCaptured += (params.captures || 0);
    stats.casualtiesInflicted += (params.casualtiesInflicted ?? params.casualties ?? 0);
    stats.troopsDispatched += (params.dispatched || 0);
    stats.goldAmassed += (params.goldEarned || 0);

    if (outcome === 'win' && params.allCastles) stats.hasGrandConquest = true;
    if (outcome === 'win' && params.ironBastion) stats.hasIronBastion = true;

    if (params.specialty && stats.specialtyUsage[params.specialty] !== undefined) {
      stats.specialtyUsage[params.specialty] += 1;
    }

    const entry = {
      timestamp: Date.now(),
      isWin: outcome === 'win',
      outcome,
      matchId: params.matchId || null,
      mapName: params.mapName || 'Unknown Realm',
      captures: params.captures || 0,
      duration: params.duration || 0,
      mode: params.mode || 'single'
    };
    stats.history.unshift(entry);
    if (stats.history.length > 20) stats.history.length = 20;

    saveStats(stats);
    return stats;
  }

  function getAchievementsStatus(stats) {
    const st = stats || loadStats();
    return ACHIEVEMENTS.map(ach => ({
      id: ach.id,
      icon: ach.icon,
      titleKey: ach.titleKey,
      descKey: ach.descKey,
      unlocked: ach.check(st)
    }));
  }

  function resetStats() {
    const fresh = getInitialStats();
    saveStats(fresh);
    return fresh;
  }

  function generateShareText(stats, username) {
    const st = stats || loadStats();
    const rank = getRank(st.wins);
    const wr = getWinrate(st.wins, st.battles);
    const uName = username || 'Commander';
    const rankName = (root.CrownI18n && root.CrownI18n.t) ? root.CrownI18n.t(rank.nameKey) : rank.id;
    const battlesLbl = (root.CrownI18n && root.CrownI18n.t) ? root.CrownI18n.t('career_battles') : 'Бои';
    const winsLbl = (root.CrownI18n && root.CrownI18n.t) ? root.CrownI18n.t('career_wins') : 'Победы';
    const castlesLbl = (root.CrownI18n && root.CrownI18n.t) ? root.CrownI18n.t('career_castles') : 'Замки';
    return `👑 Crownfall: [${uName}]\n` +
      `🎖️ ${rank.icon} ${rankName}\n` +
      `⚔️ ${battlesLbl}: ${st.battles} | 🏆 ${winsLbl}: ${st.wins} (${wr}% Winrate)\n` +
      `🏰 ${castlesLbl}: ${st.castlesCaptured}\n` +
      `${root.location ? root.location.origin : 'Crownfall RTS'}`;
  }

  const api = {
    RANKS,
    ACHIEVEMENTS,
    loadStats,
    saveStats,
    getRank,
    getWinrate,
    getFavoriteSpecialty,
    recordMatch,
    getAchievementsStatus,
    resetStats,
    generateShareText
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.CrownCareer = api;
})(typeof window === 'undefined' ? globalThis : window);
