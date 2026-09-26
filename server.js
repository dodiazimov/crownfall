'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const os = require('node:os');
const zlib = require('node:zlib');
const Multiplayer = require('./multiplayer.js');

// Configuration
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4173;
const HOST = process.env.HOST || '0.0.0.0';
const DIST_DIR = path.join(__dirname, 'dist');
const DATA_DIR = process.env.CROWNFALL_DATA_DIR || path.join(__dirname, 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// MIME Types
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
  '.pck': 'application/octet-stream',
  '.txt': 'text/plain; charset=utf-8'
};

// ----------------------------------------------------
// Database / User Persistence Layer
// ----------------------------------------------------
let db = null;
const USERS_FILE = path.join(DATA_DIR, 'users.json');

try {
  const { DatabaseSync } = require('node:sqlite');
  const dbPath = path.join(DATA_DIR, 'crownfall.db');
  db = new DatabaseSync(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      matches_played INTEGER DEFAULT 0,
      matches_won INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);
  console.log('[Auth] SQLite storage initialized:', dbPath);
} catch (err) {
  console.log('[Auth] SQLite not available, using JSON file storage fallback:', err.message);
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify({ users: [], sessions: [] }, null, 2), 'utf8');
  }
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function findUser(username) {
  if (db) {
    const stmt = db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE');
    return stmt.get(username);
  } else {
    const data = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    return data.users.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
  }
}

function createUser(username, password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashPassword(password, salt);
  const now = Date.now();

  if (db) {
    const stmt = db.prepare('INSERT INTO users (username, password_hash, salt, created_at) VALUES (?, ?, ?, ?)');
    stmt.run(username, hash, salt, now);
  } else {
    const data = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    data.users.push({
      id: data.users.length + 1,
      username,
      password_hash: hash,
      salt,
      created_at: now,
      matches_played: 0,
      matches_won: 0
    });
    fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2), 'utf8');
  }
  return { username };
}

function createSession(username) {
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();

  if (db) {
    const stmt = db.prepare('INSERT INTO sessions (token, username, created_at) VALUES (?, ?, ?)');
    stmt.run(token, username, now);
  } else {
    const data = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    data.sessions = data.sessions.filter(s => s.username.toLowerCase() !== username.toLowerCase());
    data.sessions.push({ token, username, created_at: now });
    fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2), 'utf8');
  }
  return token;
}

const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days session lifetime
const authRateLimits = new Map(); // ip -> { count, resetAt }
function checkRateLimit(ip, maxAttempts = 12, windowMs = 60000) {
  const now = Date.now();
  const entry = authRateLimits.get(ip);
  if (!entry || now > entry.resetAt) {
    authRateLimits.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxAttempts) return false;
  entry.count++;
  return true;
}

function getUserByToken(token) {
  if (!token) return null;
  const now = Date.now();
  if (db) {
    const stmt = db.prepare('SELECT username, created_at FROM sessions WHERE token = ?');
    const row = stmt.get(token);
    if (!row) return null;
    if (now - row.created_at > SESSION_TTL_MS) {
      deleteSession(token);
      return null;
    }
    return findUser(row.username);
  } else {
    const data = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const sess = data.sessions.find(s => s.token === token);
    if (!sess) return null;
    if (now - sess.created_at > SESSION_TTL_MS) {
      deleteSession(token);
      return null;
    }
    return findUser(sess.username);
  }
}

function deleteSession(token) {
  if (!token) return;
  if (db) {
    const stmt = db.prepare('DELETE FROM sessions WHERE token = ?');
    stmt.run(token);
  } else {
    const data = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    data.sessions = data.sessions.filter(s => s.token !== token);
    fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2), 'utf8');
  }
}

// ----------------------------------------------------
// Multiplayer Rooms Manager (Supports up to 4 players)
// ----------------------------------------------------
const rooms = new Map();
const PLAYER_ROLES = ['blue', 'red', 'green', 'purple'];
const ROLE_INFO = {
  blue: { name: 'Azure Legion', color: '#279fff', defaultTitle: "1-O'yinchi" },
  red: { name: 'Crimson Legion', color: '#ff525b', defaultTitle: "2-O'yinchi" },
  green: { name: 'Emerald Vanguard', color: '#2ecc71', defaultTitle: "3-O'yinchi" },
  purple: { name: 'Violet Dominion', color: '#bb44f0', defaultTitle: "4-O'yinchi" }
};

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'CRWN-';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function getRoomSummary(room) {
  const maxP = Math.min(4, Math.max(2, room.maxPlayers || 4));
  const activeRoles = PLAYER_ROLES.slice(0, maxP);
  const players = activeRoles.map(role => {
    const s = room.slots[role] || {};
    return {
      role,
      username: s.username || (s.isBot ? `${ROLE_INFO[role].name} (AI)` : null),
      isHost: !!s.isHost,
      isBot: !!s.isBot,
      ready: !!s.ready,
      connected: !!s.connected,
      color: ROLE_INFO[role].color,
      factionName: ROLE_INFO[role].name,
      hero: s.hero || (s.isBot ? (room.aiStyle === 'economist' ? 'guildmaster' : room.aiStyle === 'defender' ? 'fortifier' : room.aiStyle === 'raider' ? 'infiltrator' : 'vanguard') : 'vanguard')
    };
  });
  const occupiedCount = players.filter(p => p.username || p.isBot).length;
  const humanCount = players.filter(p => p.username && !p.isBot).length;

  return {
    code: room.code,
    status: room.status,
    maxPlayers: maxP,
    mapIndex: room.mapIndex,
    randomCastles: room.randomCastles,
    botDifficulty: room.botDifficulty,
    players,
    playersCount: occupiedCount,
    humanCount,
    readyToStart: occupiedCount >= 2,
    host: players[0] || null,
    guest: players[1] || null
  };
}

function broadcastToRoom(room, msgObj, excludeWs = null) {
  const payload = JSON.stringify(msgObj);
  const frame = encodeWsFrame(payload);
  const isSnapshot = msgObj && msgObj.type === 'state_snapshot';
  for (const role of PLAYER_ROLES) {
    const slot = room.slots[role];
    if (slot && slot.ws && slot.ws !== excludeWs && slot.connected && !slot.ws.destroyed) {
      if (isSnapshot && slot.ws.writableLength > 32768) {
        // Slow client or mobile network buffer bloat: skip this periodic snapshot to allow socket to drain
        continue;
      }
      try { slot.ws.write(frame); } catch {}
    }
  }
}

// ----------------------------------------------------
// Scalable Matchmaking Queue (1000+ Concurrent Players)
// ----------------------------------------------------
const activeSockets = new Set();
const matchmakingQueue = [];

function removeFromMatchmaking(socket) {
  const idx = matchmakingQueue.findIndex(item => item.socket === socket);
  if (idx >= 0) {
    clearTimeout(matchmakingQueue[idx].timer);
    matchmakingQueue.splice(idx, 1);
  }
}

function handleQuickMatch(socket, username, send, onMatched, hero = 'vanguard') {
  removeFromMatchmaking(socket);

  // Filter dead sockets from queue
  while (matchmakingQueue.length > 0) {
    const candidate = matchmakingQueue[0];
    if (candidate.socket.destroyed || !candidate.socket.writable) {
      clearTimeout(candidate.timer);
      matchmakingQueue.shift();
      continue;
    }
    break;
  }

  // If another player is waiting in queue: match immediately!
  if (matchmakingQueue.length > 0) {
    const opponent = matchmakingQueue.shift();
    clearTimeout(opponent.timer);

    let code;
    do { code = generateRoomCode(); } while (rooms.has(code));

    const seed = Math.floor(Math.random() * 100000000) + 1;
    const room = {
      code,
      status: 'playing',
      maxPlayers: 2,
      mapIndex: 0,
      randomCastles: true,
      botDifficulty: 'normal',
      aiStyle: 'balanced',
      seed,
      created: Date.now(),
      hostRole: 'blue',
      slots: {
        blue: { role: 'blue', ws: opponent.socket, username: opponent.username, isHost: true, isBot: false, ready: true, connected: true, hero: opponent.hero || 'vanguard' },
        red: { role: 'red', ws: socket, username, isHost: false, isBot: false, ready: true, connected: true, hero: hero || 'vanguard' },
        green: { role: 'green', ws: null, username: null, isHost: false, isBot: false, ready: false, connected: false },
        purple: { role: 'purple', ws: null, username: null, isHost: false, isBot: false, ready: false, connected: false }
      }
    };
    Multiplayer.normalizeSettings(room);
    for (const slot of Object.values(room.slots)) {
      if (slot.ws) slot.reconnectToken = crypto.randomBytes(24).toString('hex');
    }
    if (room.status === 'playing') Multiplayer.start(room);
    rooms.set(code, room);

    opponent.onMatched(room, 'blue');
    onMatched(room, 'red');

    const summary = getRoomSummary(room);

    const matchMsg = {
      ...Multiplayer.snapshot(room),
      type: 'match_started',
      roomCode: code,
      seed,
      mapIndex: 0,
      randomCastles: true,
      maxPlayers: 2,
      botDifficulty: 'normal',
      players: summary.players,
      botPlayers: [],
      hostName: opponent.username
    };

    opponent.send({
      type: 'quick_match_found',
      role: 'blue',
      reconnectToken: room.slots.blue.reconnectToken,
      opponent: username,
      roomCode: code,
      seed
    });
    opponent.send(matchMsg);

    send({
      type: 'quick_match_found',
      role: 'red',
      reconnectToken: room.slots.red.reconnectToken,
      opponent: opponent.username,
      roomCode: code,
      seed
    });
    send(matchMsg);

    console.log(`[QuickMatch] Paired ${opponent.username} (Blue) vs ${username} (Red) on map 0 [${code}]`);
    return;
  }

  // Queue is empty: put user into waiting queue
  send({ type: 'queue_waiting', position: 1, message: "Onlayn raqib qidirilmoqda..." });

  // Auto-fill with AI bot if no human arrives within 3.5 seconds
  const timer = setTimeout(() => {
    const qIdx = matchmakingQueue.findIndex(item => item.socket === socket);
    if (qIdx === -1) return;
    matchmakingQueue.splice(qIdx, 1);

    if (socket.destroyed || !socket.writable) return;

    let code;
    do { code = generateRoomCode(); } while (rooms.has(code));

    const botName = 'Crimson Legion (AI)';
    const seed = Math.floor(Math.random() * 100000000) + 1;
    const room = {
      code,
      status: 'playing',
      maxPlayers: 2,
      mapIndex: 0,
      randomCastles: true,
      botDifficulty: 'normal',
      aiStyle: 'balanced',
      seed,
      created: Date.now(),
      hostRole: 'blue',
      slots: {
        blue: { role: 'blue', ws: socket, username, isHost: true, isBot: false, ready: true, connected: true, hero: hero || 'vanguard' },
        red: { role: 'red', ws: null, username: botName, isHost: false, isBot: true, ready: true, connected: true, hero: 'vanguard' },
        green: { role: 'green', ws: null, username: null, isHost: false, isBot: false, ready: false, connected: false },
        purple: { role: 'purple', ws: null, username: null, isHost: false, isBot: false, ready: false, connected: false }
      }
    };
    Multiplayer.normalizeSettings(room);
    for (const slot of Object.values(room.slots)) {
      if (slot.ws) slot.reconnectToken = crypto.randomBytes(24).toString('hex');
    }
    if (room.status === 'playing') Multiplayer.start(room);
    rooms.set(code, room);
    onMatched(room, 'blue');

    const summary = getRoomSummary(room);
    send({
      type: 'quick_match_found',
      role: 'blue',
      reconnectToken: room.slots.blue.reconnectToken,
      opponent: botName,
      roomCode: code,
      seed
    });
    send({
      ...Multiplayer.snapshot(room),
      type: 'match_started',
      roomCode: code,
      seed,
      mapIndex: 0,
      randomCastles: true,
      maxPlayers: 2,
      botDifficulty: 'normal',
      players: summary.players,
      botPlayers: ['red'],
      hostName: username
    });
    console.log(`[QuickMatch] Auto-paired with AI bot for ${username} in room ${code}`);
  }, 3500);

  matchmakingQueue.push({
    socket,
    username,
    send,
    onMatched,
    timer,
    hero,
    joinedAt: Date.now()
  });
}

// ----------------------------------------------------
// Native RFC 6455 WebSocket Implementation
// ----------------------------------------------------
function encodeWsFrame(payload) {
  const buf = Buffer.isBuffer(payload) ? payload : Buffer.from(payload, 'utf8');
  const len = buf.length;
  let header;
  if (len < 126) {
    header = Buffer.from([0x81, len]);
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([header, buf]);
}

function decodeWsFrames(buffer) {
  const frames = [];
  let offset = 0;

  while (offset < buffer.length) {
    if (buffer.length - offset < 2) break;
    const b0 = buffer[offset];
    const b1 = buffer[offset + 1];
    const opcode = b0 & 0x0f;
    const isMasked = (b1 & 0x80) !== 0;
    let payloadLen = b1 & 0x7f;
    let headerLen = 2;

    if (payloadLen === 126) {
      if (buffer.length - offset < 4) break;
      payloadLen = buffer.readUInt16BE(offset + 2);
      headerLen = 4;
    } else if (payloadLen === 127) {
      if (buffer.length - offset < 10) break;
      payloadLen = Number(buffer.readBigUInt64BE(offset + 2));
      headerLen = 10;
    }

    if (!isMasked || payloadLen > 32768 || !Number.isSafeInteger(payloadLen) || !(b0 & 0x80)) throw new Error('Unsupported WebSocket frame');
    if (isMasked) headerLen += 4;

    const totalFrameLen = headerLen + payloadLen;
    if (buffer.length - offset < totalFrameLen) break;

    let payload = buffer.subarray(offset + headerLen, offset + totalFrameLen);
    if (isMasked) {
      const mask = buffer.subarray(offset + headerLen - 4, offset + headerLen);
      const unmasked = Buffer.alloc(payloadLen);
      for (let i = 0; i < payloadLen; i++) {
        unmasked[i] = payload[i] ^ mask[i % 4];
      }
      payload = unmasked;
    }

    frames.push({ opcode, payload });
    offset += totalFrameLen;
  }

  return { frames, remaining: buffer.subarray(offset) };
}

// ----------------------------------------------------
// HTTP Server & Static File Serving
// ----------------------------------------------------
const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // JSON helper
  const sendJson = (statusCode, data) => {
    res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
  };

  // Parse Body helper
  const readBody = cb => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) req.destroy(); // 1MB limit
    });
    req.on('end', () => {
      try {
        const json = body ? JSON.parse(body) : {};
        cb(null, json);
      } catch (err) {
        cb(err);
      }
    });
  };

  // Auth helper
  const getAuthUser = () => {
    const auth = req.headers['authorization'];
    if (!auth || !auth.startsWith('Bearer ')) return null;
    const token = auth.substring(7).trim();
    return getUserByToken(token);
  };

  // ---------------- REST APIs ----------------
  // 1. Register
  if (req.method === 'POST' && pathname === '/api/auth/register') {
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(clientIp)) {
      return sendJson(429, { ok: false, error: 'Juda ko\'p urinish! Bir ozdan so\'ng qayta urinib ko\'ring.' });
    }
    return readBody((err, data) => {
      if (err || !data.username || !data.password) {
        return sendJson(400, { ok: false, error: 'Username va parol kiritilishi shart!' });
      }
      const username = String(data.username).trim();
      const password = String(data.password);

      if (username.length < 3 || username.length > 20) {
        return sendJson(400, { ok: false, error: 'Username 3 tadan 20 tagacha belgidan iborat bo\'lishi kerak!' });
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        return sendJson(400, { ok: false, error: 'Username faqat lotin harflari, raqamlar va _ belgisi bo\'lishi mumkin!' });
      }
      if (password.length < 4) {
        return sendJson(400, { ok: false, error: 'Parol kamida 4 ta belgidan iborat bo\'lishi kerak!' });
      }

      const existing = findUser(username);
      if (existing) {
        return sendJson(409, { ok: false, error: 'Bu nomdagi foydalanuvchi allaqachon mavjud! Boshqa nom tanlang.' });
      }

      createUser(username, password);
      const token = createSession(username);
      return sendJson(200, {
        ok: true,
        message: 'Muvaffaqiyatli ro\'yxatdan o\'tildi!',
        token,
        user: { username }
      });
    });
  }

  // 2. Login
  if (req.method === 'POST' && pathname === '/api/auth/login') {
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(clientIp)) {
      return sendJson(429, { ok: false, error: 'Juda ko\'p urinish! Bir ozdan so\'ng qayta urinib ko\'ring.' });
    }
    return readBody((err, data) => {
      if (err || !data.username || !data.password) {
        return sendJson(400, { ok: false, error: 'Username va parol kiritilishi shart!' });
      }
      const username = String(data.username).trim();
      const password = String(data.password);

      const user = findUser(username);
      if (!user) {
        return sendJson(401, { ok: false, error: 'Bunday foydalanuvchi topilmadi yoki parol noto\'g\'ri!' });
      }

      const hash = hashPassword(password, user.salt);
      if (hash !== user.password_hash) {
        return sendJson(401, { ok: false, error: 'Parol noto\'g\'ri!' });
      }

      const token = createSession(user.username);
      return sendJson(200, {
        ok: true,
        message: 'Xush kelibsiz!',
        token,
        user: { username: user.username }
      });
    });
  }

  // 3. Me (Current profile)
  if (req.method === 'GET' && pathname === '/api/auth/me') {
    const user = getAuthUser();
    if (!user) {
      return sendJson(401, { ok: false, error: 'Tizimga kirmagansiz' });
    }
    return sendJson(200, {
      ok: true,
      user: {
        username: user.username,
        matches_played: user.matches_played || 0,
        matches_won: user.matches_won || 0
      }
    });
  }

  // 4. Logout
  if (req.method === 'POST' && pathname === '/api/auth/logout') {
    const auth = req.headers['authorization'];
    if (auth && auth.startsWith('Bearer ')) {
      deleteSession(auth.substring(7).trim());
    }
    return sendJson(200, { ok: true });
  }

  // 5. Rooms list & info
  if (req.method === 'GET' && pathname === '/api/rooms') {
    const roomList = [];
    for (const r of rooms.values()) {
      if (r.status === 'lobby') {
        roomList.push(getRoomSummary(r));
      }
    }
    return sendJson(200, { ok: true, rooms: roomList });
  }

  if (req.method === 'GET' && pathname.startsWith('/api/rooms/')) {
    const code = pathname.replace('/api/rooms/', '').toUpperCase();
    const room = rooms.get(code);
    if (!room) {
      return sendJson(404, { ok: false, error: 'Xona topilmadi!' });
    }
    return sendJson(200, { ok: true, room: getRoomSummary(room) });
  }

  // 6. Realtime Server Health & 1000 CCU Metrics
  if (req.method === 'GET' && pathname === '/api/stats') {
    return sendJson(200, {
      ok: true,
      activeConnections: activeSockets.size,
      activeRooms: rooms.size,
      queuedMatchmaking: matchmakingQueue.length,
      uptimeSeconds: Math.floor(process.uptime()),
      memoryUsageMB: Math.round(process.memoryUsage().rss / (1024 * 1024))
    });
  }

  // ---------------- Static File Serving ----------------
  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') safePath = '/index.html';

  let filePath = path.join(DIST_DIR, safePath);

  // If directory, check for index.html inside
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    const subIndex = path.join(filePath, 'index.html');
    if (fs.existsSync(subIndex)) {
      filePath = subIndex;
    } else {
      filePath = path.join(DIST_DIR, 'index.html');
    }
  } else if (!fs.existsSync(filePath)) {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  const acceptEncoding = req.headers['accept-encoding'] || '';
  const gzPath = filePath + '.gz';
  const diskGzip = acceptEncoding.includes('gzip') && fs.existsSync(gzPath);
  const actualFilePath = diskGzip ? gzPath : filePath;

  fs.readFile(actualFilePath, (err, rawContent) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('File Not Found');
    }

    let finalContent = rawContent;
    let contentEncoding = null;

    if (diskGzip) {
      contentEncoding = 'gzip';
    } else {
      const isCompressible = ['.html', '.js', '.mjs', '.css', '.json', '.svg', '.txt'].includes(ext) && rawContent.length > 256;
      if (isCompressible) {
        if (acceptEncoding.includes('br')) {
          try {
            finalContent = zlib.brotliCompressSync(rawContent, {
              params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 }
            });
            contentEncoding = 'br';
          } catch (e) {
            finalContent = rawContent;
          }
        } else if (acceptEncoding.includes('gzip')) {
          try {
            finalContent = zlib.gzipSync(rawContent, { level: 6 });
            contentEncoding = 'gzip';
          } catch (e) {
            finalContent = rawContent;
          }
        }
      }
    }

    const isVersioned = parsedUrl.search && parsedUrl.search.includes('v=');
    const isImmutableAsset = !filePath.includes('godot-test') && (
      isVersioned ||
      ['.wasm', '.webp', '.avif', '.jpg', '.png', '.woff2', '.ttf', '.svg'].includes(ext)
    );

    let cacheControl;
    if (filePath.includes('godot-test')) {
      cacheControl = 'no-cache, must-revalidate';
    } else if (ext === '.html') {
      cacheControl = 'no-cache, must-revalidate';
    } else if (isImmutableAsset) {
      cacheControl = 'public, max-age=31536000, immutable';
    } else {
      cacheControl = 'public, max-age=86400';
    }

    const headers = {
      'Content-Type': contentType,
      'Content-Length': finalContent.length,
      'Cache-Control': cacheControl,
      'Vary': 'Accept-Encoding'
    };
    if (contentEncoding) {
      headers['Content-Encoding'] = contentEncoding;
    }

    res.writeHead(200, headers);
    res.end(finalContent);
  });
});

// ----------------------------------------------------
// WebSocket Upgrade & Real-Time Multiplayer Relay
// ----------------------------------------------------
server.on('upgrade', (req, socket, head) => {
  if (req.headers['upgrade']?.toLowerCase() !== 'websocket') {
    socket.destroy();
    return;
  }

  const key = req.headers['sec-websocket-key'];
  if (!key) {
    socket.destroy();
    return;
  }

  const acceptKey = crypto.createHash('sha1')
    .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
    .digest('base64');

  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    'Sec-WebSocket-Accept: ' + acceptKey + '\r\n\r\n'
  );

  socket.setNoDelay(true);
  socket.isAlive = true;
  activeSockets.add(socket);

  let currentRoom = null;
  let currentUser = null;
  let clientRole = null; // 'blue' (Host) or 'red' (Guest)
  let inBuffer = Buffer.alloc(0);

  const send = msgObj => {
    if (socket.destroyed || !socket.writable) return;
    try {
      socket.write(encodeWsFrame(JSON.stringify(msgObj)));
    } catch {}
  };

  const handleMessage = msg => {
    if (!msg || typeof msg !== 'object' || Array.isArray(msg)) return;
    const type = msg.type;
    if (['quick_match', 'create_room', 'join_room'].includes(type)) {
      removeFromMatchmaking(socket);
      if (currentRoom) handlePlayerLeave(true);
    }


    // Quick Matchmaking (1-Click Multiplayer)
    if (type === 'quick_match') {
      const username = currentUser || msg.username || 'Sarkarda_' + Math.floor(Math.random() * 1000);
      const validHeroes = ['vanguard', 'fortifier', 'guildmaster', 'infiltrator'];
      const hero = validHeroes.includes(msg.hero) ? msg.hero : 'vanguard';
      handleQuickMatch(socket, username, send, (room, role) => {
        currentRoom = room;
        clientRole = role;
      }, hero);
      return;
    }

    if (type === 'cancel_matchmaking') {
      removeFromMatchmaking(socket);
      send({ type: 'matchmaking_cancelled' });
      return;
    }

    // 1. User Authenticate on Socket
    if (type === 'auth') {
      if (msg.token) {
        const u = getUserByToken(msg.token);
        if (u) currentUser = u.username;
      }
      if (!currentUser && msg.username) {
        currentUser = String(msg.username).trim() || 'Mehmon';
      }
      send({ type: 'auth_ok', username: currentUser });
      return;
    }

    // 2. Create Room
    if (type === 'create_room') {
      const username = currentUser || msg.username || 'Sarkarda';
      let code;
      do {
        code = generateRoomCode();
      } while (rooms.has(code));

      const validHeroes = ['vanguard', 'fortifier', 'guildmaster', 'infiltrator'];
      const hostHero = validHeroes.includes(msg.hero) ? msg.hero : 'vanguard';
      const maxP = [2, 3, 4].includes(msg.maxPlayers) ? msg.maxPlayers : 2;
      const room = {
        code,
        status: 'lobby',
        maxPlayers: maxP,
        mapIndex: typeof msg.mapIndex === 'number' ? msg.mapIndex : 0,
        randomCastles: msg.randomCastles !== false,
        botDifficulty: msg.botDifficulty || 'normal',
        aiStyle: msg.aiStyle || 'balanced',
        seed: Math.floor(Math.random() * 100000000) + 1,
        created: Date.now(),
        hostRole: 'blue',
        slots: {
          blue: { role: 'blue', ws: socket, username, isHost: true, isBot: false, ready: true, connected: true, hero: hostHero },
          red: { role: 'red', ws: null, username: null, isHost: false, isBot: false, ready: false, connected: false },
          green: { role: 'green', ws: null, username: null, isHost: false, isBot: false, ready: false, connected: false },
          purple: { role: 'purple', ws: null, username: null, isHost: false, isBot: false, ready: false, connected: false }
        }
      };

      Multiplayer.normalizeSettings(room);
    for (const slot of Object.values(room.slots)) {
      if (slot.ws) slot.reconnectToken = crypto.randomBytes(24).toString('hex');
    }
    if (room.status === 'playing') Multiplayer.start(room);
    rooms.set(code, room);
      currentRoom = room;
      clientRole = 'blue';

      send({
        type: 'room_created',
        roomCode: code,
        role: 'blue',
        reconnectToken: room.slots.blue.reconnectToken,
        room: getRoomSummary(room),
        seed: room.seed
      });
      console.log(`[Room] ${code} created by ${username} (Max ${maxP} players)`);
      return;
    }

    // 3. Join Room
    if (type === 'join_room') {
      const code = String(msg.roomCode || '').toUpperCase().trim();
      const username = currentUser || msg.username || 'Mehmon';
      const room = rooms.get(code);

      if (!room) {
        return send({ type: 'error', message: 'Bunday kodli xona topilmadi!' });
      }

      const activeRoles = PLAYER_ROLES.slice(0, room.maxPlayers || 4);

      // Check if this is a reconnecting player
      if (room.status === 'playing' || room.status === 'ended') {
        let reconnectSlot = null;
        for (const r of activeRoles) {
          const s = room.slots[r];
          if (s && !s.isBot && s.reconnectToken && msg.reconnectToken === s.reconnectToken) {
            reconnectSlot = s;
            break;
          }
        }
        if (reconnectSlot) {
          const oldSocket = reconnectSlot.ws;
          reconnectSlot.ws = socket;
          if (oldSocket && oldSocket !== socket) oldSocket.destroy();
          reconnectSlot.reconnectUntil = 0;
          reconnectSlot.connected = true;
          currentRoom = room;
          clientRole = reconnectSlot.role;
          send({
            ...Multiplayer.snapshot(room),
            type: 'room_rejoined',
            roomCode: code,
            role: clientRole,
            room: getRoomSummary(room),
            seed: room.seed
          });
          broadcastToRoom(room, {
            type: 'player_reconnected',
            player: clientRole,
            username: reconnectSlot.username,
            room: getRoomSummary(room)
          }, socket);
          console.log(`[Room] ${code}: ${username} reconnected as ${clientRole}`);
          return;
        }
        return send({ type: 'error', message: "Ushbu xonada o'yin allaqachon boshlangan!" });
      }

      // In lobby: find an available slot
      let targetRole = null;
      for (const r of activeRoles) {
        const s = room.slots[r];
        if (!s.ws && !s.username && !s.isBot) {
          targetRole = r;
          break;
        }
      }
      if (!targetRole) {
        for (const r of activeRoles) {
          const s = room.slots[r];
          if (s.isBot) {
            targetRole = r;
            break;
          }
        }
      }

      if (!targetRole) {
        return send({ type: 'error', message: "Xona to'liq! Barcha o'rinlar band." });
      }

      const slot = room.slots[targetRole];
      slot.ws = socket;
      slot.reconnectToken = crypto.randomBytes(24).toString('hex');
      slot.username = username;
      slot.isBot = false;
      slot.ready = true;
      slot.connected = true;
      const validHeroes = ['vanguard', 'fortifier', 'guildmaster', 'infiltrator'];
      if (validHeroes.includes(msg.hero)) slot.hero = msg.hero;
      currentRoom = room;
      clientRole = targetRole;

      send({
        type: 'room_joined',
        roomCode: code,
        role: targetRole,
        reconnectToken: slot.reconnectToken,
        room: getRoomSummary(room),
        seed: room.seed
      });

      broadcastToRoom(room, {
        type: 'player_joined',
        guestName: username,
        player: targetRole,
        room: getRoomSummary(room)
      }, socket);
      console.log(`[Room] ${code}: ${username} joined as ${targetRole}`);
      return;
    }

    // 4. Toggle Slot Bot (Host only)
    if (type === 'toggle_slot_bot' || type === 'add_bot' || type === 'remove_bot') {
      if (!currentRoom || currentRoom.status !== 'lobby' || currentRoom.slots.blue.ws !== socket) return;
      const targetRole = msg.role || (type === 'add_bot' ? 'red' : null);
      if (!PLAYER_ROLES.slice(1, currentRoom.maxPlayers).includes(targetRole)) return;
      const slot = currentRoom.slots[targetRole];
      if (!slot || slot.ws !== socket) return;

      if (slot.ws && !slot.isBot) {
        return send({ type: 'error', message: "Ushbu o'rinda haqiqiy o'yinchi bor!" });
      }

      if (type === 'add_bot') {
        slot.isBot = true;
        slot.username = ROLE_INFO[targetRole].name + ' (AI)';
        slot.ready = true;
        slot.connected = true;
      } else if (type === 'remove_bot') {
        slot.isBot = false;
        slot.username = null;
        slot.ready = false;
        slot.connected = false;
      } else {
        slot.isBot = !slot.isBot;
        if (slot.isBot) {
          slot.username = ROLE_INFO[targetRole].name + ' (AI)';
          slot.ready = true;
          slot.connected = true;
        } else {
          slot.username = null;
          slot.ready = false;
          slot.connected = false;
        }
      }

      broadcastToRoom(currentRoom, {
        type: 'room_updated',
        room: getRoomSummary(currentRoom)
      });
      return;
    }

    // 4b. Select Hero
    if (type === 'select_hero') {
      if (!currentRoom || !clientRole) return;
      const hero = msg.hero;
      if (!['vanguard', 'fortifier', 'guildmaster', 'infiltrator'].includes(hero)) return;
      currentRoom.slots[clientRole].hero = hero;
      if (currentRoom.state && currentRoom.state.players[clientRole]) {
        currentRoom.state.players[clientRole].hero = hero;
      }
      broadcastToRoom(currentRoom, {
        type: 'room_updated',
        room: getRoomSummary(currentRoom)
      });
      return;
    }

    // 5. Update Settings (Host only)
    if (type === 'update_settings') {
      if (!currentRoom || currentRoom.status !== 'lobby' || currentRoom.slots.blue.ws !== socket) return;
      if (typeof msg.maxPlayers === 'number') {
        if (![2, 3, 4].includes(msg.maxPlayers)) return;
        if (PLAYER_ROLES.slice(msg.maxPlayers).some(r => currentRoom.slots[r].ws)) {
          return send({type: 'error', message: 'Occupied seats cannot be removed.'});
        }
        currentRoom.maxPlayers = msg.maxPlayers;
      }
      if (typeof msg.mapIndex === 'number') currentRoom.mapIndex = msg.mapIndex;
      if (typeof msg.randomCastles === 'boolean') currentRoom.randomCastles = msg.randomCastles;
      if (msg.botDifficulty) currentRoom.botDifficulty = msg.botDifficulty;

      Multiplayer.normalizeSettings(currentRoom);
      broadcastToRoom(currentRoom, {
        type: 'settings_updated',
        room: getRoomSummary(currentRoom)
      });
      return;
    }

    // 6. Start Match (Host only)
    if (type === 'start_match') {
      if (!currentRoom || currentRoom.status !== 'lobby' || currentRoom.slots.blue.ws !== socket) return;
      const summary = getRoomSummary(currentRoom);
      if (summary.playersCount < 2) {
        return send({ type: 'error', message: "O'yinni boshlash uchun kamida 2 ta o'yinchi (yoki bot) bo'lishi kerak!" });
      }

      currentRoom.seed = Math.floor(Math.random() * 100000000) + 1;

      Multiplayer.start(currentRoom);
      const activeRoles = PLAYER_ROLES.slice(0, currentRoom.maxPlayers);
      const botPlayers = activeRoles.filter(r => currentRoom.slots[r].isBot);

      broadcastToRoom(currentRoom, {
        ...Multiplayer.snapshot(currentRoom),
        type: 'match_started',
        roomCode: currentRoom.code,
        seed: currentRoom.seed,
        mapIndex: currentRoom.mapIndex,
        randomCastles: currentRoom.randomCastles,
        maxPlayers: currentRoom.maxPlayers,
        botDifficulty: currentRoom.botDifficulty,
        players: getRoomSummary(currentRoom).players,
        botPlayers,
        hostName: currentRoom.slots.blue?.username || 'Host'
      });
      console.log(`[Room] ${currentRoom.code} match started with ${summary.playersCount} factions (Bots: ${botPlayers.join(', ')})`);
      return;
    }

    // The server owns simulation state. Clients submit only validated intents.
    if (['dispatch', 'upgrade', 'specialize', 'tactics', 'coordinate', 'train_troop', 'quick_recruit', 'recall', 'dragon_strike', 'select_hero'].includes(type)) {
      if (!currentRoom || currentRoom.slots[clientRole]?.ws !== socket) return;
      if (!Multiplayer.command(currentRoom, clientRole, msg)) {
        return send({type: 'command_rejected', message: 'Order unavailable: check ownership, troops, reserves, and Gold.'});
      }
      send({type: 'command_accepted', command: type});
      broadcastToRoom(currentRoom, Multiplayer.snapshot(currentRoom));
      return;
    }

    // Rematch handler (Play again with same players and same settings)
    if (type === 'rematch') {
      if (!currentRoom || !clientRole || (currentRoom.status !== 'ended' && !currentRoom.state?.result)) return;
      if (Multiplayer.rematch(currentRoom)) {
        const activeRoles = PLAYER_ROLES.slice(0, currentRoom.maxPlayers);
        const botPlayers = activeRoles.filter(r => currentRoom.slots[r].isBot);
        broadcastToRoom(currentRoom, {
          ...Multiplayer.snapshot(currentRoom),
          type: 'match_started',
          roomCode: currentRoom.code,
          seed: currentRoom.seed,
          mapIndex: currentRoom.mapIndex,
          randomCastles: currentRoom.randomCastles,
          maxPlayers: currentRoom.maxPlayers,
          botDifficulty: currentRoom.botDifficulty,
          players: getRoomSummary(currentRoom).players,
          botPlayers,
          hostName: currentRoom.slots.blue?.username || 'Host'
        });
        console.log(`[Room] ${currentRoom.code} rematched by ${clientRole}`);
      }
      return;
    }
    if (type === 'sync_state' || type === 'match_ended') return;

    // 8. Quick Chat
    if (type === 'chat') {
      if (!currentRoom) return;
      broadcastToRoom(currentRoom, {
        type: 'chat',
        sender: currentUser || (ROLE_INFO[clientRole]?.name || clientRole),
        text: String(msg.text || '').substring(0, 100),
        role: clientRole
      });
      return;
    }

    // 9. Leave Match (Explicit exit to main menu)
    if (type === 'leave_match') {
      if (!currentRoom || !clientRole) return;
      handlePlayerLeave(true);
      return;
    }

  };

  const handlePlayerLeave = (explicit = false) => {
    if (!currentRoom || !clientRole) return;
    const room = currentRoom;
    const role = clientRole;
    const slot = room.slots[role];
    currentRoom = null;
    clientRole = null;

    if (!slot || slot.ws !== socket) return;

    if (room.status === 'lobby') {
      if (slot.isHost) {
        broadcastToRoom(room, {
          type: 'player_left',
          role,
          message: 'Xona egasi (Host) chiqib ketdi!'
        }, socket);
        rooms.delete(room.code);
        console.log(`[Room] ${room.code} closed (host left in lobby)`);
      } else {
        slot.ws = null;
        slot.username = null;
        slot.ready = false;
        slot.connected = false;
        broadcastToRoom(room, {
          type: 'player_left',
          role,
          message: `${slot.username || 'Mehmon'} chiqib ketdi.`,
          room: getRoomSummary(room)
        }, socket);
        console.log(`[Room] ${room.code}: ${role} left lobby`);
      }
    } else {
      slot.connected = false;
      slot.ws = null;
      if (room.status === 'playing') {
        if (explicit) Multiplayer.abandon(room, role);
        else slot.reconnectUntil = Date.now() + Multiplayer.RECONNECT_MS;
        broadcastToRoom(room, {type: 'player_disconnected', role, graceSeconds: explicit ? 0 : 30});
        Multiplayer.tick(room);
        broadcastToRoom(room, Multiplayer.snapshot(room));
      }
    }
  };

  const handleData = chunk => {
    if (inBuffer.length + chunk.length > 65536) { socket.destroy(); return; }
    inBuffer = Buffer.concat([inBuffer, chunk]);
    let decoded;
    try { decoded = decodeWsFrames(inBuffer); } catch { socket.destroy(); return; }
    const { frames, remaining } = decoded;
    inBuffer = remaining;

    for (const f of frames) {
      if (f.opcode === 0x08) {
        socket.end();
        break;
      }
      if (f.opcode === 0x09) {
        try { socket.write(Buffer.concat([Buffer.from([0x8a, f.payload.length]), f.payload])); } catch {}
        continue;
      }
      if (f.opcode === 0x0a) {
        socket.isAlive = true;
        continue;
      }
      if (f.opcode === 0x01) {
        socket.msgCount = (socket.msgCount || 0) + 1;
        if (socket.msgCount > 40) continue;
        try {
          const json = JSON.parse(f.payload.toString('utf8'));
          handleMessage(json);
        } catch (err) {
          console.error('[WS Parse Error]', err.message);
        }
      }
    }
  };
  socket.on('data', handleData);
  if (head.length) handleData(head);

  const cleanupSocket = () => {
    activeSockets.delete(socket);
    removeFromMatchmaking(socket);
    handlePlayerLeave(false);
  };

  socket.on('close', cleanupSocket);
  socket.on('error', cleanupSocket);
});

// ----------------------------------------------------
// 1000 CCU Optimization: Heartbeat & Room Garbage Collection
// ----------------------------------------------------
// One room clock: rendering speed and hidden browser tabs cannot alter online play.
setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    if (Multiplayer.tick(room, now)) broadcastToRoom(room, Multiplayer.snapshot(room));
  }
}, 100);

// 1. Heartbeat ping every 25 seconds to drop dead sockets
setInterval(() => {
  const pingFrame = Buffer.from([0x89, 0x00]);
  for (const s of activeSockets) {
    if (!s.isAlive) {
      activeSockets.delete(s);
      removeFromMatchmaking(s);
      try { s.destroy(); } catch {}
      continue;
    }
    s.isAlive = false;
    try {
      if (s.writable && !s.destroyed) s.write(pingFrame);
    } catch {
      activeSockets.delete(s);
      try { s.destroy(); } catch {}
    }
  }
}, 25000);

// 2. Room Garbage Collector: Purge ended & empty rooms
setInterval(() => {
  const now = Date.now();
  for (const [code, r] of rooms.entries()) {
    // Purge ended matches older than 1 minute
    if (r.status === 'ended' && now - (r.endedAt || r.created) > 60000) {
      rooms.delete(code);
      continue;
    }
    // Purge rooms with no active humans older than 2 minutes
    const hasHumans = Object.values(r.slots).some(s => s.ws && s.connected && !s.ws.destroyed && !s.isBot);
    if (!hasHumans && now - r.created > 120000) {
      rooms.delete(code);
      continue;
    }
    // Stale lobbies older than 20 minutes
    if (r.status === 'lobby' && now - r.created > 20 * 60 * 1000) {
      rooms.delete(code);
    }
  }
}, 30000);

function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
}

// Rate limiter bucket reset for active WebSockets
setInterval(() => {
  for (const s of activeSockets) s.msgCount = 0;
}, 1000);

server.listen(PORT, HOST, () => {
  const localIps = getLocalIpAddresses();
  const lanLines = localIps.map(ip => `  * http://${ip}:${server.address().port}`).join('\n');
  console.log(`
======================================================
♛ CROWNFALL SERVER IS RUNNING!
- Local URL:   http://localhost:${server.address().port}
- LAN IP(s) for local network players:
${lanLines || `  * http://${HOST}:${server.address().port}`}
- Port:        ${server.address().port}
- Auth:        Enabled (/api/auth/*)
- Multiplayer: WebSocket Enabled (/ws)
======================================================
`);
});

function gracefulShutdown() {
  console.log('[Server] Shutting down gracefully...');
  for (const s of activeSockets) {
    try { s.destroy(); } catch {}
  }
  server.close(() => {
    if (db) { try { db.close(); } catch {} }
    process.exit(0);
  });
}
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

