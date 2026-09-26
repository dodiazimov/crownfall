'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const C = require('../dist/career.js');

test('ranks compute correctly with milestones and progress percentage', () => {
  // 0 wins -> Novice
  const r0 = C.getRank(0);
  assert.equal(r0.id, 'novice');
  assert.equal(r0.neededWins, 3);
  assert.equal(r0.progressPct, 0);

  // 1 win -> Novice, 33% progress
  const r1 = C.getRank(1);
  assert.equal(r1.id, 'novice');
  assert.equal(r1.neededWins, 2);
  assert.equal(r1.progressPct, 33);

  // 3 wins -> Castellan
  const r3 = C.getRank(3);
  assert.equal(r3.id, 'castellan');
  assert.equal(r3.neededWins, 7);
  assert.equal(r3.progressPct, 0);

  // 10 wins -> Baron
  const r10 = C.getRank(10);
  assert.equal(r10.id, 'baron');
  assert.equal(r10.neededWins, 15);

  // 25 wins -> Warlord
  const r25 = C.getRank(25);
  assert.equal(r25.id, 'warlord');
  assert.equal(r25.neededWins, 25);

  // 50 wins -> Grand Marshal
  const r50 = C.getRank(50);
  assert.equal(r50.id, 'grand_marshal');
  assert.equal(r50.neededWins, 0);
  assert.equal(r50.progressPct, 100);
});

test('winrate calculates safely with zero and positive battles', () => {
  assert.equal(C.getWinrate(0, 0), 0);
  assert.equal(C.getWinrate(5, 10), 50);
  assert.equal(C.getWinrate(1, 3), 33);
  assert.equal(C.getWinrate(10, 10), 100);
});

test('achievements trigger correctly based on recorded combat statistics', () => {
  const stats = {
    battles: 10,
    wins: 10,
    losses: 0,
    castlesCaptured: 30,
    goldAmassed: 600,
    hasGrandConquest: true,
    hasIronBastion: true
  };
  const list = C.getAchievementsStatus(stats);
  assert.equal(list.length, 6);
  for (const item of list) {
    assert.equal(item.unlocked, true, `Achievement ${item.id} should be unlocked`);
  }
});

test('match recording accurately updates career dossier', () => {
  // Mock localStorage
  const store = {};
  global.localStorage = {
    getItem: k => store[k] || null,
    setItem: (k, v) => { store[k] = v; },
    removeItem: k => { delete store[k]; }
  };

  C.resetStats();
  const st1 = C.recordMatch({
    isWin: true,
    captures: 5,
    dispatched: 100,
    casualties: 40,
    goldEarned: 150,
    duration: 65,
    allCastles: false,
    specialty: 'military',
    mapName: 'The Verdant Isles',
    mode: 'sp'
  });

  assert.equal(st1.battles, 1);
  assert.equal(st1.wins, 1);
  assert.equal(st1.losses, 0);
  assert.equal(st1.castlesCaptured, 5);
  assert.equal(st1.goldAmassed, 150);
  assert.equal(st1.specialtyUsage.military, 1);
  assert.equal(st1.history.length, 1);

  const shareText = C.generateShareText(st1, 'AmirTemur');
  assert.match(shareText, /AmirTemur/);
  assert.match(shareText, /100% Winrate/);
});
