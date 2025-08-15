const path = require('path');
const fs = require('fs');
let kv = null;
try { ({ kv } = require('@vercel/kv')); } catch {}

// Environment detection / namespacing
const IS_VERCEL = Boolean(process.env.VERCEL);
const ENV = process.env.VERCEL_ENV || (process.env.NODE_ENV || 'development');
const NS = `wt:${ENV}`;
const HAS_KV = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN && kv);

// KV key helpers
const kvKeyRoom = (id) => `${NS}:room:${String(id).toUpperCase()}`;
const kvKeyEnded = (id) => `${NS}:room:${String(id).toUpperCase()}:ended`;

// Directories and constants - file fallback only when NOT on Vercel
const DATA_DIR = path.join(process.cwd(), 'data');
const ROOM_ID = 'ROOM';

// Ensure data directory exists locally (for fallback)
try { if (!IS_VERCEL) { fs.mkdirSync(DATA_DIR, { recursive: true }); } } catch {}

function roomPath(id) {
  const safe = String(id || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return path.join(DATA_DIR, `room_${safe}.json`);
}
function endedPath(id) {
  const safe = String(id || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return path.join(DATA_DIR, `room_${safe}.ended`);
}

function respond(res, obj, status = 200) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  try { res.end(JSON.stringify(obj)); } catch { res.end('{}'); }
}
function errorOut(res, msg, status = 400) { respond(res, { error: msg }, status); }

function requireStorageOr503(res) {
  if (IS_VERCEL && !HAS_KV) { respond(res, { error: 'Service unavailable: KV not configured' }, 503); return false; }
  return true;
}

async function readRoom(id) {
  if (IS_VERCEL) {
    if (!HAS_KV) throw new Error('KV_REQUIRED');
    try { const data = await kv.get(kvKeyRoom(id)); return data || null; } catch { return null; }
  }
  const file = roomPath(id);
  if (!fs.existsSync(file)) return null;
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

async function writeRoom(id, data) {
  if (IS_VERCEL) {
    if (!HAS_KV) throw new Error('KV_REQUIRED');
    try { await kv.set(kvKeyRoom(id), data, { ex: 60 * 60 * 12 }); } catch {}
    return;
  }
  const file = roomPath(id);
  const tmp = `${file}.tmp`;
  const json = JSON.stringify(data, null, 0);
  try { fs.writeFileSync(tmp, json, 'utf8'); fs.renameSync(tmp, file); }
  catch { try { fs.writeFileSync(file, json, 'utf8'); } catch {} }
}

async function deleteRoom(id) {
  if (IS_VERCEL) {
    if (!HAS_KV) throw new Error('KV_REQUIRED');
    try { await kv.del(kvKeyRoom(id)); } catch {}
    return;
  }
  try { fs.unlinkSync(roomPath(id)); } catch {}
}

async function setEnded(id, seconds = 3600) {
  if (IS_VERCEL) { if (!HAS_KV) throw new Error('KV_REQUIRED'); try { await kv.set(kvKeyEnded(id), Date.now(), { ex: seconds }); } catch {} return; }
  try { fs.writeFileSync(endedPath(id), String(Date.now()), 'utf8'); } catch {}
}
async function clearEnded(id) {
  if (IS_VERCEL) { if (!HAS_KV) throw new Error('KV_REQUIRED'); try { await kv.del(kvKeyEnded(id)); } catch {} return; }
  try { fs.unlinkSync(endedPath(id)); } catch {}
}
async function isEnded(id) {
  if (IS_VERCEL) { if (!HAS_KV) throw new Error('KV_REQUIRED'); try { return Boolean(await kv.get(kvKeyEnded(id))); } catch { return false; } }
  try { return fs.existsSync(endedPath(id)); } catch { return false; }
}

function sanitizeName(name) {
  const raw = String(name || '').trim();
  const cleaned = raw.replace(/[^A-Za-z0-9 _\-'.]/g, '').replace(/\s+/g, ' ');
  return (cleaned === '' ? 'Player' : cleaned).slice(0, 20);
}

function isHost(room, playerId) { return Boolean(room && room.hostId && room.hostId === playerId); }

function ensureAnswersAssoc(room) {
  if (!room.answers || typeof room.answers !== 'object') room.answers = {};
  const fixed = {};
  for (const [q, map] of Object.entries(room.answers)) fixed[String(q)] = typeof map === 'object' && map ? map : {};
  room.answers = fixed;
}

function applyPatch(room, patch, playerId, host) {
  ensureAnswersAssoc(room);
  for (const [key, value] of Object.entries(patch || {})) {
    if (['state','settings','questions','qIndex','countdownEndsAt','questionEndsAt','intermissionEndsAt','gifIndex','build'].includes(key)) {
      if (!host) continue;
      if (key === 'settings' && value && typeof value === 'object') {
        const next = room.settings || { categoryIds: [], questionCount: null, questionTimeSec: null };
        if (Array.isArray(value.categoryIds)) next.categoryIds = [...new Set(value.categoryIds.map(n=>parseInt(n,10)).filter(Number.isFinite))].slice(0,5);
        if (Object.prototype.hasOwnProperty.call(value, 'questionCount')) { const allowed=[5,10,15,20]; if (allowed.includes(value.questionCount)) next.questionCount = value.questionCount; }
        if (Object.prototype.hasOwnProperty.call(value, 'questionTimeSec')) { const allowed=[10,15,20]; if (allowed.includes(value.questionTimeSec)) next.questionTimeSec = value.questionTimeSec; }
        room.settings = next; continue;
      }
      if (key === 'questions' && Array.isArray(value)) { room.questions = value; continue; }
      room[key] = value; continue;
    }
    if (key === 'answers' && value && typeof value === 'object') {
      for (const [qIdx, ansMap] of Object.entries(value)) {
        const idxNum = parseInt(qIdx, 10);
        if (!Array.isArray(room.questions) || !room.questions[idxNum]) continue;
        const qKey = String(idxNum);
        if (!room.answers[qKey] || typeof room.answers[qKey] !== 'object') room.answers[qKey] = {};
        if (ansMap && typeof ansMap === 'object') {
          const client = ansMap[playerId];
          const ansText = client && typeof client === 'object' ? String(client.answer ?? '') : null;
          if (ansText !== null) {
            const correct = room.questions[idxNum].correct ?? null;
            room.answers[qKey][playerId] = { answer: ansText, correct: correct !== null && ansText === correct, at: Date.now() };
          }
        }
      }
      continue;
    }
  }
  return room;
}

function isDebug(req) {
  try {
    const u = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    return (process.env.DEBUG === '1') || u.searchParams.get('debug') === '1' || req.headers['x-debug'] === '1';
  } catch {
    return (process.env.DEBUG === '1') || req.headers['x-debug'] === '1';
  }
}

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.statusCode = 200; res.end(); return; }

  const debug = isDebug(req);
  if (debug) {
    console.log('[API] Incoming', { method: req.method, url: req.url, storage: IS_VERCEL ? (HAS_KV?'kv':'none') : 'file' });
  }

  try { if (typeof req.body === 'string' && req.body.length) req.body = JSON.parse(req.body); } catch {}
  if (req.method !== 'GET' && req.method !== 'POST') return errorOut(res, 'Method not allowed', 405);

  let action = '';
  try {
    if (req.query && typeof req.query.action === 'string') action = req.query.action;
    if (!action) { const u = new URL(req.url, `http://${req.headers.host || 'localhost'}`); action = u.searchParams.get('action') || ''; }
  } catch {}
  if (!action) return errorOut(res, 'Missing action');

  // On Vercel, storage is KV-only; block if KV missing
  if (IS_VERCEL && !HAS_KV && ['joinOrCreate','getRoom','updateRoom','wipeAndReset','nukeRoom'].includes(action)) {
    return respond(res, { error: 'Service unavailable: KV not configured' }, 503);
  }

  try {
    if (action === 'joinOrCreate') {
      const name = sanitizeName((req.method === 'GET' ? req.query?.name : req.body?.name) ?? 'Player');
      const playerId = (req.method === 'GET' ? req.query?.playerId : req.body?.playerId) || Math.random().toString(36).slice(2) + Date.now().toString(36);
      let room = await readRoom(ROOM_ID);
      if (!room) {
        if (await isEnded(ROOM_ID)) { return errorOut(res, 'Game ended. Please try again later.', 410); }
        room = { id: ROOM_ID, hostId: playerId, state: 'lobby', settings: { categoryIds: [], questionCount: null, questionTimeSec: null }, players: { [playerId]: { id: playerId, name, score: 0 } }, countdownEndsAt: 0, intermissionEndsAt: 0, qIndex: -1, questions: [], answers: {}, createdAt: Date.now(), gameNo: 0, gifIndex: 0 };
        await writeRoom(ROOM_ID, room);
        await clearEnded(ROOM_ID);
        return respond(res, { ok: true, room });
      }
      if (Object.keys(room.players || {}).length >= 10 && !room.players[playerId]) return errorOut(res, 'Room is full', 403);
      room.players[playerId] = room.players[playerId] || { id: playerId, name, score: 0 };
      room.players[playerId].name = name;
      await writeRoom(ROOM_ID, room);
      return respond(res, { ok: true, room });
    }

    if (action === 'getRoom') {
      const room = await readRoom(ROOM_ID);
      if (!room) return errorOut(res, 'Room not found', 404);
      return respond(res, { ok: true, room });
    }

    if (action === 'updateRoom') {
      const patch = req.method === 'GET' ? undefined : req.body?.patch;
      const playerId = req.method === 'GET' ? req.query?.playerId : req.body?.playerId;
      if (!playerId) return errorOut(res, 'Missing playerId');
      if (!patch || typeof patch !== 'object') return errorOut(res, 'Missing patch');
      const room = await readRoom(ROOM_ID);
      if (!room) return errorOut(res, 'Room not found', 404);
      const next = applyPatch({ ...room }, patch, playerId, isHost(room, playerId));
      await writeRoom(ROOM_ID, next);
      return respond(res, { ok: true, room: next });
    }

    if (action === 'wipeAndReset') {
      const playerId = req.method === 'GET' ? req.query?.playerId : req.body?.playerId;
      const existing = await readRoom(ROOM_ID);
      if (!existing) return errorOut(res, 'Room not found', 404);
      if (!isHost(existing, playerId)) return errorOut(res, 'Only host can reset');
      const players = { ...(existing.players || {}) }; for (const pid of Object.keys(players)) players[pid].score = 0;
      const settings = existing.settings || { categoryIds: [], questionCount: null, questionTimeSec: null };
      const hostId = existing.hostId || Object.keys(players)[0];
      const room = { id: ROOM_ID, hostId, state: 'lobby', settings, players, countdownEndsAt: 0, intermissionEndsAt: 0, qIndex: -1, questions: [], answers: {}, createdAt: Date.now(), gameNo: (existing.gameNo || 0) + 1, gifIndex: 0 };
      await writeRoom(ROOM_ID, room);
      await clearEnded(ROOM_ID);
      return respond(res, { ok: true, room });
    }

    if (action === 'nukeRoom') {
      const playerId = req.method === 'GET' ? req.query?.playerId : req.body?.playerId;
      const existing = await readRoom(ROOM_ID);
      if (existing && !isHost(existing, playerId)) return errorOut(res, 'Only host can reset');
      await deleteRoom(ROOM_ID);
      await setEnded(ROOM_ID, 3600); // block re-create for 1 hour
      return respond(res, { ok: true });
    }

    return errorOut(res, 'Unknown action');
  } catch (err) {
    if (String(err && err.message).includes('KV_REQUIRED') || (IS_VERCEL && !HAS_KV)) {
      return respond(res, { error: 'Service unavailable: KV not configured' }, 503);
    }
    const debug = isDebug(req);
    console.error('API Error:', err);
    const payload = debug
      ? { error: 'Server error', message: String(err && err.message ? err.message : err), stack: err && err.stack ? String(err.stack) : undefined }
      : { error: 'Server error' };
    return respond(res, payload, 500);
  }
}

module.exports = handler;
module.exports.default = handler;
