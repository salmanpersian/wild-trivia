const path = require('path');
const fs = require('fs');
const express = require('express');

// Create Express app
const app = express();

// Directories and constants
const DATA_DIR = path.join(__dirname, '..', 'data');
const ROOM_ID = 'ROOM';

// Ensure data directory exists
try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (err) {
  console.log('Data directory already exists or cannot be created');
}

app.use(express.json({ limit: '1mb' }));

// Utilities
function roomPath(id) {
  const safe = String(id || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return path.join(DATA_DIR, `room_${safe}.json`);
}

function readRoom(id) {
  const file = roomPath(id);
  if (!fs.existsSync(file)) return null;
  try {
    const json = fs.readFileSync(file, 'utf8');
    const data = JSON.parse(json);
    return data && typeof data === 'object' ? data : null;
  } catch {
    return null;
  }
}

function writeRoom(id, data) {
  const file = roomPath(id);
  const tmp = `${file}.tmp`;
  const json = JSON.stringify(data, null, 0);
  fs.writeFileSync(tmp, json, 'utf8');
  fs.renameSync(tmp, file);
}

function sanitizeName(name) {
  const raw = String(name || '').trim();
  const cleaned = raw.replace(/[^\p{L}\p{N} _\-'\.]/gu, '').replace(/\s+/g, ' ');
  const finalName = cleaned === '' ? 'Player' : cleaned;
  return finalName.slice(0, 20);
}

function isHost(room, playerId) {
  return Boolean(room && room.hostId && room.hostId === playerId);
}

function ensureAnswersAssoc(room) {
  if (!room.answers || typeof room.answers !== 'object') room.answers = {};
  const fixed = {};
  for (const [q, map] of Object.entries(room.answers)) {
    fixed[String(q)] = typeof map === 'object' && map ? map : {};
  }
  room.answers = fixed;
}

function applyPatch(room, patch, playerId, host) {
  ensureAnswersAssoc(room);
  for (const [key, value] of Object.entries(patch || {})) {
    if (
      ['state', 'settings', 'questions', 'qIndex', 'countdownEndsAt', 'questionEndsAt', 'intermissionEndsAt', 'gifIndex', 'build'].includes(key)
    ) {
      if (!host) continue;
      if (key === 'settings' && value && typeof value === 'object') {
        const next = room.settings || { categoryIds: [], questionCount: null, questionTimeSec: null };
        if (Array.isArray(value.categoryIds)) {
          const ids = [...new Set(value.categoryIds.map((n) => Number.parseInt(n, 10)))].filter((n) => Number.isFinite(n));
          next.categoryIds = ids.slice(0, 5);
        }
        if (Object.prototype.hasOwnProperty.call(value, 'questionCount')) {
          const allowed = [5, 10, 15, 20];
          const qc = value.questionCount;
          if (allowed.includes(qc)) next.questionCount = qc;
        }
        if (Object.prototype.hasOwnProperty.call(value, 'questionTimeSec')) {
          const allowed = [10, 15, 20];
          const t = value.questionTimeSec;
          if (allowed.includes(t)) next.questionTimeSec = t;
        }
        room.settings = next;
        continue;
      }
      if (key === 'questions' && Array.isArray(value)) {
        room.questions = value;
        continue;
      }
      room[key] = value;
      continue;
    }
    if (key === 'answers' && value && typeof value === 'object') {
      ensureAnswersAssoc(room);
      for (const [q, map] of Object.entries(value)) {
        if (typeof map === 'object' && map) {
          room.answers[String(q)] = { ...room.answers[String(q)], ...map };
        }
      }
      continue;
    }
  }
  return room;
}

function respond(res, data) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.json(data);
}

function errorOut(res, message, status = 400) {
  res.status(status);
  respond(res, { error: message });
}

// API endpoint
app.post('/api', (req, res) => {
  try {
    const action = req.body?.action;
    if (!action) return errorOut(res, 'Missing action');

    if (action === 'joinOrCreate') {
      const name = sanitizeName(req.body?.name);
      const playerId = req.body?.playerId;
      if (!name) return errorOut(res, 'Missing name');
      if (!playerId) return errorOut(res, 'Missing playerId');

      let room = readRoom(ROOM_ID);
      if (!room) {
        room = {
          id: ROOM_ID,
          hostId: playerId,
          state: 'lobby',
          settings: { categoryIds: [], questionCount: null, questionTimeSec: null },
          players: { [playerId]: { id: playerId, name, score: 0 } },
          countdownEndsAt: 0,
          intermissionEndsAt: 0,
          qIndex: -1,
          questions: [],
          answers: {},
          createdAt: Date.now(),
          gameNo: 0,
          gifIndex: 0,
        };
        writeRoom(ROOM_ID, room);
        return respond(res, { ok: true, room });
      }
      if (Object.keys(room.players || {}).length >= 10 && !room.players[playerId]) {
        return errorOut(res, 'Room is full', 403);
      }
      room.players[playerId] = room.players[playerId] || { id: playerId, name, score: 0 };
      room.players[playerId].name = name;
      writeRoom(ROOM_ID, room);
      return respond(res, { ok: true, room });
    }

    if (action === 'getRoom') {
      const room = readRoom(ROOM_ID);
      if (!room) return errorOut(res, 'Room not found', 404);
      return respond(res, { ok: true, room });
    }

    if (action === 'updateRoom') {
      const patch = req.body?.patch;
      const playerId = req.body?.playerId;
      if (!playerId) return errorOut(res, 'Missing playerId');
      if (!patch || typeof patch !== 'object') return errorOut(res, 'Missing patch');
      const room = readRoom(ROOM_ID);
      if (!room) return errorOut(res, 'Room not found', 404);
      const next = applyPatch({ ...room }, patch, playerId, isHost(room, playerId));
      writeRoom(ROOM_ID, next);
      return respond(res, { ok: true, room: next });
    }

    if (action === 'wipeAndReset') {
      const playerId = req.body?.playerId;
      const existing = readRoom(ROOM_ID);
      if (!existing) return errorOut(res, 'Room not found', 404);
      if (!isHost(existing, playerId)) return errorOut(res, 'Only host can reset');
      const players = { ...(existing.players || {}) };
      for (const pid of Object.keys(players)) players[pid].score = 0;
      const settings = existing.settings || { categoryIds: [], questionCount: null, questionTimeSec: null };
      const hostId = existing.hostId || Object.keys(players)[0];
      try { fs.unlinkSync(roomPath(ROOM_ID)); } catch {}
      const room = {
        id: ROOM_ID,
        hostId,
        state: 'lobby',
        settings,
        players,
        countdownEndsAt: 0,
        intermissionEndsAt: 0,
        qIndex: -1,
        questions: [],
        answers: {},
        createdAt: Date.now(),
        gameNo: (existing.gameNo || 0) + 1,
        gifIndex: 0,
      };
      writeRoom(ROOM_ID, room);
      return respond(res, { ok: true, room });
    }

    if (action === 'nukeRoom') {
      const playerId = req.body?.playerId;
      const existing = readRoom(ROOM_ID);
      if (existing && !isHost(existing, playerId)) return errorOut(res, 'Only host can reset');
      try { fs.unlinkSync(roomPath(ROOM_ID)); } catch {}
      return respond(res, { ok: true });
    }

    return errorOut(res, 'Unknown action');
  } catch (err) {
    console.error('API Error:', err);
    return errorOut(res, 'Server error', 500);
  }
});

// Handle OPTIONS requests for CORS
app.options('/api', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.status(200).end();
});

// Export for Vercel
module.exports = app;
