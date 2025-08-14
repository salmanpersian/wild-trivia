/*
  Wild Trivia – Node server
  - Serves static files from project root
  - Implements /api compatible with api.php
*/

const path = require('path');
const fs = require('fs');
const express = require('express');

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;

// Directories and constants
const DATA_DIR = path.join(__dirname, 'data');
const ROOM_ID = 'ROOM';

// Ensure data directory exists
fs.mkdirSync(DATA_DIR, { recursive: true });

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
      for (const [qIdx, ansMap] of Object.entries(value)) {
        const idxNum = Number.parseInt(qIdx, 10);
        if (!Array.isArray(room.questions) || !room.questions[idxNum]) continue;
        const correct = room.questions[idxNum].correct ?? null;
        const qKey = String(idxNum);
        if (!room.answers[qKey] || typeof room.answers[qKey] !== 'object') room.answers[qKey] = {};
        if (ansMap && typeof ansMap === 'object') {
          const client = ansMap[playerId];
          const ansText = client && typeof client === 'object' ? String(client.answer ?? '') : null;
          if (ansText !== null) {
            room.answers[qKey][playerId] = {
              answer: ansText,
              correct: correct !== null && ansText === correct,
              at: Date.now(),
            };
          }
        }
      }
      continue;
    }
  }
  return room;
}

function respond(res, obj, status = 200) {
  res.status(status).type('application/json').send(JSON.stringify(obj));
}

function errorOut(res, msg, status = 400) {
  respond(res, { error: msg }, status);
}

// API handler
app.post('/api', (req, res) => {
  const qAction = typeof req.query.action === 'string' ? req.query.action : '';
  const bAction = typeof req.body?.action === 'string' ? req.body.action : '';
  const action = qAction || bAction || '';

  try {
    if (action === 'joinOrCreate') {
      const name = sanitizeName(req.body?.name ?? 'Player');
      const playerId = req.body?.playerId || Math.random().toString(36).slice(2) + Date.now().toString(36);
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
    return errorOut(res, 'Server error', 500);
  }
});

<<<<<<< HEAD
// Serve index.html for root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Static files (serve assets from project root)
app.use(express.static(__dirname, { extensions: ['html'] }));

// Handle all other routes by serving index.html (for SPA routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
app.listen(PORT, () => {
  /* eslint-disable no-console */
  console.log(`Wild Trivia server running at http://localhost:${PORT}`);
});


