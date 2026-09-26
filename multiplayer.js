'use strict';

const E = require('./dist/engine.js');
const ROLES = E.PLAYER_KEYS;
const SPEED = 0.65;
const RECONNECT_MS = 30000;

function normalizeSettings(room) {
  room.maxPlayers = [2, 3, 4].includes(room.maxPlayers) ? room.maxPlayers : 2;
  if (E.MAP_PLAYERS[room.mapIndex] !== room.maxPlayers) {
    room.mapIndex = E.MAP_PLAYERS.indexOf(room.maxPlayers);
  }
  if (!['easy', 'normal', 'hard'].includes(room.botDifficulty)) room.botDifficulty = 'normal';
  if (!['balanced', 'raider', 'economist', 'defender'].includes(room.aiStyle)) room.aiStyle = 'balanced';
}

function start(room) {
  normalizeSettings(room);
  // Empty seats on the selected layout become bots, never inactive factions.
  for (const role of ROLES.slice(0, room.maxPlayers)) {
    const slot = room.slots[role];
    if (!slot.username) Object.assign(slot, {isBot: true, username: role.toUpperCase() + ' (AI)', ready: true, connected: true});
  }
  const roomHeroes = {};
  for (const role of ROLES.slice(0, room.maxPlayers)) {
    const slot = room.slots[role];
    if (slot && slot.hero) roomHeroes[role] = slot.hero;
  }
  room.state = E.create(room.seed, room.aiStyle, room.botDifficulty, room.mapIndex, room.randomCastles, room.maxPlayers, room.victoryMode || 'crown_control', Object.keys(roomHeroes).length ? roomHeroes : null, true);
  room.state.botPlayers = ROLES.slice(0, room.maxPlayers).filter(role => room.slots[role].isBot);
  room.status = 'playing';
  room.revision = 0;
  room.lastTick = Date.now();
}

function snapshot(room) {
  return {type: 'state_snapshot', roomCode: room.code, revision: room.revision, state: room.state};
}

function command(room, role, msg) {
  const s = room.state;
  if (room.status !== 'playing' || !s || !Object.hasOwn(s.players, role) || room.slots[role].isBot) return false;
  const id = n => Number.isInteger(n) && n >= 0 && n < s.castles.length;
  const route = msg.route === undefined || ['fast', 'flank'].includes(msg.route);
  if (!route) return false;
  let ok = false;
  switch (msg.type) {
    case 'dispatch':
      ok = id(msg.fromId) && id(msg.toId) && E.dispatch(s, role, msg.fromId, msg.toId, msg.count, {route: msg.route});
      break;
    case 'coordinate':
      ok = id(msg.targetId) && Array.isArray(msg.entries) && msg.entries.length <= 21 &&
        msg.entries.every(e => e && id(e.source)) &&
        E.coordinate(s, role, msg.targetId, msg.entries, {route: msg.route, synchronized: true});
      break;
    case 'upgrade':
      ok = id(msg.castleId) && (msg.specialty === undefined || ['balanced', 'military', 'economy'].includes(msg.specialty)) &&
        E.upgrade(s, role, msg.castleId, msg.specialty);
      break;
    case 'specialize':
      ok = id(msg.castleId) && ['balanced', 'military', 'economy'].includes(msg.specialty) &&
        E.specialize(s, role, msg.castleId, msg.specialty);
      break;
    case 'train_troop':
      ok = id(msg.castleId) && typeof msg.troopType === 'string' && Number.isSafeInteger(msg.count) && msg.count > 0 &&
        E.trainTroops(s, role, msg.castleId, msg.troopType, msg.count);
      break;
    case 'quick_recruit': {
      if (!id(msg.castleId)) break;
      const count = Number.isSafeInteger(msg.count) ? Math.min(100, Math.max(1, msg.count)) : 100;
      ok = E.quickRecruit ? E.quickRecruit(s, role, msg.castleId, count) : false;
      break;
    }
    case 'recall':
      ok = Number.isSafeInteger(msg.armyId) && E.recall(s, role, msg.armyId);
      break;
    case 'dragon_strike':
      ok = Number.isFinite(msg.x) && Number.isFinite(msg.y) && E.launchDragonStrike(s, role, msg.x, msg.y);
      break;
    case 'select_hero':
      if (E.HEROES && E.HEROES[msg.hero]) {
        room.slots[role].hero = msg.hero;
        if (s.players[role]) s.players[role].hero = msg.hero;
        ok = true;
      }
      break;
    case 'tactics': {
      if (!id(msg.castleId)) break;
      // One intent per message prevents partially applied tactics.
      if (Object.hasOwn(msg, 'reserve') && !Object.hasOwn(msg, 'supplyTarget')) {
        ok = msg.reserve <= E.MAX_RESOURCE && E.setReserve(s, role, msg.castleId, msg.reserve);
      } else if (!Object.hasOwn(msg, 'reserve') && (msg.supplyTarget === null || id(msg.supplyTarget))) {
        ok = E.setSupply(s, role, msg.castleId, msg.supplyTarget, msg.route);
      }
      break;
    }
  }
  if (ok) room.revision++;
  return !!ok;
}

function abandon(room, role) {
  const slot = room.slots[role];
  slot.reconnectUntil = 0;
  slot.reconnectToken = null;
  if (room.maxPlayers === 2) {
    room.state.result = ROLES.slice(0, 2).find(r => r !== role);
    room.state.events.unshift({text: role.toUpperCase() + ' left the match.', time: room.state.time});
    room.state.resultReason = 'forfeit';
  } else {
    slot.isBot = true;
    slot.username = role.toUpperCase() + ' (AI)';
    slot.connected = true;
    if (!room.state.botPlayers.includes(role)) room.state.botPlayers.push(role);
  }
  room.revision++;
}

function tick(room, now = Date.now()) {
  if (!room.state || room.status !== 'playing') return false;
  for (const role of ROLES.slice(0, room.maxPlayers)) {
    const slot = room.slots[role];
    if (slot.reconnectUntil && now >= slot.reconnectUntil) abandon(room, role);
  }
  const elapsed = Math.min(0.25, Math.max(0, (now - room.lastTick) / 1000));
  room.lastTick = now;
  E.tick(room.state, elapsed * SPEED);
  room.revision++;
  if (room.state.result) {
    room.status = 'ended';
    room.endedAt = now;
  }
  return true;
}

function rematch(room) {
  if (!room || (room.status !== 'ended' && room.status !== 'playing')) return false;
  room.seed = Math.floor(Math.random() * 100000000) + 1;
  start(room);
  room.revision++;
  return true;
}

module.exports = {normalizeSettings, start, snapshot, command, tick, abandon, rematch, RECONNECT_MS};
