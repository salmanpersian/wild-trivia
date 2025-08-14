const { useEffect, useMemo, useRef, useState, useCallback } = React;
const { api, fetchCategories, fetchQuestionsMixed, SINGLE_ROOM_ID, CELEBRATION_GIFS, GROUP_ORDER, catGroup, API } = window.Trivia || {};

// Lazy proxies for components that might be registered after this script executes
const PlayersPanelProxy = (props) => {
  const Comp = window.PlayersPanel;
  return Comp ? React.createElement(Comp, props) : null;
};
const LobbySettingsProxy = (props) => {
  const Comp = window.LobbySettings;
  return Comp ? React.createElement(Comp, props) : null;
};
const CountdownCircleProxy = (props) => {
  const Comp = window.CountdownCircle;
  return Comp ? React.createElement(Comp, props) : null;
};

function JoinScreenView({ displayName, setDisplayName, joinGame }) {
  const canJoin = (displayName.trim().length >= 3);
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 -left-32 w-[28rem] h-[28rem] bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0.12),transparent_60%)] blur-xl" />
        <div className="absolute -bottom-40 -right-32 w-[28rem] h-[28rem] bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.12),transparent_60%)] blur-xl" />
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(rgba(255,255,255,0.10)_1px,transparent_1px)] [background-size:16px_16px]" />
      </div>
      <div className="w-full max-w-sm p-6">
        <div className="text-center text-3xl mb-2 drop-shadow-[0_0_12px_rgba(250,204,21,0.55)]">👑</div>
        <h2 className="text-center text-3xl font-extrabold tracking-tight mb-8 bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-400 via-indigo-400 to-cyan-400 drop-shadow-[0_0_18px_rgba(99,102,241,0.45)]">Wild Trivia</h2>
        <div className="space-y-3">
          <input value={displayName} onChange={e=>setDisplayName(e.target.value)} onKeyDown={e=>{ if (e.key==='Enter' && canJoin) joinGame(); }} placeholder="Your name (min 3 chars)" className="w-full rounded-xl bg-gray-900 border border-gray-800 px-4 py-3 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 text-center" />
          <button className={`w-full rounded-lg px-4 py-3 text-sm font-medium transition ${canJoin ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed opacity-60'}`} disabled={!canJoin} onClick={joinGame}>Join Game</button>
          <p className="text-center text-xs text-gray-500">First person to join becomes Host.</p>
        </div>
      </div>
    </div>
  );
}

function QuestionScreenView({ room, playerId, pendingAnswer, isHost, answer, goNextOrResults }) {
  const now = Date.now();
  const q = Array.isArray(room.questions) ? room.questions[room.qIndex] : null;
  const msLeft = Math.max(0, (room.questionEndsAt||0) - now);
  const timeUp = msLeft <= 0;
  const [revealEndsAt, setRevealEndsAt] = useState(0);

  useEffect(() => { setRevealEndsAt(0); }, [room?.qIndex]);
  useEffect(() => { if (timeUp && !revealEndsAt) { setRevealEndsAt(Date.now() + 5000); } }, [timeUp, revealEndsAt, room?.qIndex]);
  useEffect(() => {
    if (!isHost) return;
    if (!timeUp || !revealEndsAt) return;
    const ms = Math.max(0, revealEndsAt - Date.now());
    const t = setTimeout(() => { goNextOrResults(); }, ms + 20);
    return () => clearTimeout(t);
  }, [isHost, timeUp, revealEndsAt, room?.qIndex]);

  const answers = room.answers || {};
  const my = answers[room.qIndex]?.[playerId];
  const onPick = (opt) => { if (!timeUp) answer(opt); };

  const totalMs = timeUp ? 5000 : (1000 * Number(room.settings.questionTimeSec));
  const endsAt = timeUp ? revealEndsAt : room.questionEndsAt;
  const diffLabel = q?.difficulty ? (String(q.difficulty)[0].toUpperCase() + String(q.difficulty).slice(1)) : '';
  const beepedSecondsRef = useRef(new Set());

  useEffect(() => {
    beepedSecondsRef.current = new Set();
  }, [room?.qIndex]);

  useEffect(() => {
    if (timeUp) return;
    const tick = () => {
      const leftMs = Math.max(0, (endsAt || 0) - Date.now());
      const secsLeft = Math.ceil(leftMs / 1000);
      if (secsLeft <= 3 && secsLeft >= 1 && !beepedSecondsRef.current.has(secsLeft)) {
        beepedSecondsRef.current.add(secsLeft);
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'sine';
          o.frequency.setValueAtTime(880, ctx.currentTime);
          g.gain.setValueAtTime(0.001, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.01);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
          o.connect(g).connect(ctx.destination);
          o.start();
          o.stop(ctx.currentTime + 0.16);
          setTimeout(() => ctx.close().catch(()=>{}), 300);
        } catch {}
      }
    };
    const id = setInterval(tick, 150);
    return () => clearInterval(id);
  }, [endsAt, timeUp]);

  if (!q) {
    return (
      <div className="rounded-2xl border border-gray-800 p-4 sm:p-6 bg-gray-950">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-gray-400">Loading…</div>
          <div className="flex items-center gap-3">
            <CountdownCircleProxy totalMs={totalMs} endsAt={endsAt} size={64} stroke={6} ringColor={'rgb(99,102,241)'} />
          </div>
        </div>
        <div className="mt-3 h-6 bg-gray-800/60 rounded w-3/4" />
        <div className="grid md:grid-cols-2 gap-3 mt-4">
          {Array.from({length:4}).map((_,i)=>(<div key={i} className="h-12 bg-gray-800/40 rounded-xl border border-gray-800" />))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-800 p-4 sm:p-6 bg-gray-950">
      <div aria-live="polite" className="sr-only">{`Question ${room.qIndex+1}`}</div>
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-gray-400">Question {room.qIndex+1} / {room.questions.length}</div>
        <div className="flex items-center gap-3">
          <CountdownCircleProxy totalMs={totalMs} endsAt={endsAt} size={64} stroke={6} ringColor={timeUp ? 'rgb(244,63,94)' : 'rgb(99,102,241)'} />
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-block rounded-full border border-gray-700 bg-gray-800 px-2 py-0.5">Category: {q?.category || '—'}</span>
        {diffLabel ? (
          <span className="inline-block rounded-full border border-gray-700 bg-gray-800 px-2 py-0.5">Difficulty: {diffLabel}</span>
        ) : null}
      </div>
      <div className="mt-3 text-xl text-gray-100">{q?.question ?? ''}</div>
      <div className="grid md:grid-cols-2 gap-3 mt-4" role="radiogroup" aria-label="Answer options">
        {q.options && q.options.map((opt, i) => {
          const letter = String.fromCharCode(65 + i);
          const chosen = (!!my && my.answer === opt) || pendingAnswer === opt;
           const isCorrect = timeUp && q && opt === q.correct;
          const wrongChosen = timeUp && chosen && opt !== q.correct;
          let cls = timeUp
            ? (isCorrect
                ? 'border-emerald-600 ring-2 ring-emerald-400 bg-emerald-900/20'
                : (wrongChosen ? 'border-red-600 ring-2 ring-red-400 bg-red-900/20' : 'border-gray-800'))
            : (chosen
                ? 'border-indigo-500 ring-2 ring-indigo-400 bg-gray-900'
                : 'border-gray-800 hover:bg-gray-800');
          if (timeUp && opt !== q.correct && !chosen) cls += ' opacity-60';
          return (
            <button key={letter+opt} type="button" onClick={() => onPick(opt)} role="radio" aria-checked={chosen}
              className={`group text-left border rounded-xl p-4 md:p-5 min-h-[48px] transition active:scale-[0.98] active:opacity-90 motion-reduce:scale-100 motion-reduce:opacity-100 ${cls}`}>
                                <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-gray-700/50 flex items-center justify-center text-sm text-gray-300 font-medium">{letter}</div>
                    <div className="text-gray-100">{opt}</div>
                  </div>
            </button>
          );
        })}
      </div>
      {timeUp && (
        <div className="mt-4 text-sm text-gray-300">
          <div className="mb-1 text-gray-400">Players' answers</div>
          <ul className="grid sm:grid-cols-2 gap-1">
            {Object.values(room.players||{}).map(p => {
              const a = (answers[room.qIndex]||{})[p.id];
              const answered = !!a && typeof a.answer !== 'undefined';
              const correct = answered && (a.correct === true || a.answer === q.correct);
              const badgeCls = correct ? 'bg-emerald-600' : (answered ? 'bg-red-600' : 'bg-gray-700');
              const mark = correct ? '✓' : (answered ? '✗' : '•');
              const nameCls = correct ? 'text-emerald-300' : (answered ? 'text-red-300' : 'text-gray-300');
              return (
                <li key={p.id} className="flex items-center gap-2">
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded ${badgeCls}`}>{mark}</span>
                  <span className={nameCls}>{p.name}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function ResultsView({ room, isHost, updateRoom }) {
  const [openRecap, setOpenRecap] = useState(null);
  const answers = room.answers || {};
  const { total, winners, playersSorted, correctByPlayer } = useMemo(() => {
    const total = room.questions.length;
    const players = room.players || {};
    const correctByPlayer = {};
    Object.keys(players).forEach(pid => {
      let c = 0;
      for (let qi = 0; qi < total; qi++) {
        const m = answers[qi];
        const a = m && m[pid];
        if (!a) continue;
        const ok = (a.correct === true) || (a.answer && room.questions && room.questions[qi] && a.answer === room.questions[qi].correct);
        if (ok) c++;
      }
      correctByPlayer[pid] = c;
    });
    const best = Math.max(0, ...Object.values(correctByPlayer));
    const winners = Object.values(players).filter(p => correctByPlayer[p.id] === best);
    const playersSorted = Object.values(players)
      .slice()
      .sort((a,b) => (correctByPlayer[b.id]||0) - (correctByPlayer[a.id]||0) || (a.name||'').localeCompare(b.name||''));
    return { total, winners, playersSorted, correctByPlayer };
  }, [answers, room.questions, room.players]);
  const gif = CELEBRATION_GIFS[(room.gifIndex||0) % CELEBRATION_GIFS.length];
  return (
    <div>
      <div className="text-xl font-semibold text-gray-100 mb-3">Results</div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          <div className="rounded-2xl border border-gray-800 p-4 bg-gray-950 mb-6 text-gray-300">
            <div className="text-sm font-medium text-gray-200 mb-3">Winners</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">{winners.map(w => <div key={w.id} className="flex items-center gap-1">👑 <span>{w.name}</span></div>)}</div>
            <img src={gif} alt="celebration" className="rounded-xl border border-gray-800 w-full h-auto object-contain" />
          </div>
        </div>
        <div className="rounded-2xl border border-gray-800 p-4 bg-gray-950">
          <div className="text-sm font-medium text-gray-200 mb-3">Leaderboard</div>
          <ul className="space-y-2">{playersSorted.map((p, idx) => {
            const initials = (p.name||'').split(' ').map(s=>s[0]).filter(Boolean).slice(0,2).join('').toUpperCase();
            const isHostChip = p.id === room.hostId;
            const rank = idx + 1;
            return (
              <li key={p.id} className="rounded-lg border border-gray-800 bg-gray-950 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-800 text-gray-300 text-xs shrink-0">{rank}</span>
                    <div className="w-8 h-8 rounded-full bg-indigo-700 text-white flex items-center justify-center text-xs font-bold shrink-0">{initials}</div>
                    <span className="truncate text-gray-300">{p.name}</span>
                    {isHostChip ? <span className="inline-block rounded-full bg-gray-800 px-2 py-0.5 text-[10px] text-gray-200 ml-1">Host</span> : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="rounded-lg px-2 py-1 text-xs font-medium transition bg-gray-900 border border-gray-700 hover:bg-gray-800 text-gray-100" onClick={() => setOpenRecap(prev => prev===p.id?null:p.id)} aria-expanded={openRecap===p.id}>{openRecap===p.id ? 'Hide recap' : 'Show recap'}</button>
                    <span className="text-gray-300 text-sm tabular-nums">{correctByPlayer[p.id]}/{total}</span>
                  </div>
                </div>
                {openRecap===p.id ? (
                  <div className="mt-2 text-xs text-gray-300 border-t border-gray-800 pt-2 space-y-1">
                    {room.questions.map((qq, qi) => {
                      const a = (answers[qi]||{})[p.id];
                      const ok = a && (a.correct===true || a.answer===room.questions[qi].correct);
                      return (
                        <div key={qi} className="flex items-start justify-between gap-2">
                          <div className="text-gray-400">Q{qi+1}</div>
                          <div className={`flex-1 truncate ${ok ? 'text-emerald-300' : 'text-gray-300'}`}>{a && a.answer ? a.answer : '—'}</div>
                          <div className={`shrink-0 ${ok ? 'text-emerald-400' : 'text-red-400'}`}>{ok ? '✓' : '✗'}</div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </li>
            );
          })}</ul>
        </div>
      </div>
      
    </div>
  );
}

function App() {
  const [displayName, setDisplayName] = useState(localStorage.getItem('displayName') || '');
  const [playerId] = useState(() => {
    const k = 'playerId';
    let v = localStorage.getItem(k);
    if (!v) { v = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem(k, v); }
    return v;
  });

  const [room, setRoom] = useState(null);
  const [categories, setCategories] = useState([]);
  const [pendingAnswer, setPendingAnswer] = useState(null);
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);

  const pollIdRef = useRef(null);
  const roomRef = useRef(null); useEffect(() => { roomRef.current = room; }, [room]);
  const lastGoodRoomRef = useRef(null);
  const lastAnswerAtRef = useRef(0);
  const lastCatClickRef = useRef(0);

  const sleep = (ms) => new Promise(res => setTimeout(res, ms));

  const isHost = !!(room && room.hostId === playerId);
  const topicsSelectedCount = (room?.settings?.categoryIds || []).length;
  const hasQuestionCount = Number.isInteger(room?.settings?.questionCount);
  const hasTime = Number.isInteger(room?.settings?.questionTimeSec);
  const topicsPicked = topicsSelectedCount > 0;
  const canStart = isHost && room?.state === 'lobby' && topicsPicked && hasQuestionCount && hasTime;
  const startHint = useMemo(() => {
    const missing = [];
    if (!topicsPicked) missing.push('at least 1 topic');
    if (!hasQuestionCount) missing.push('a question count');
    if (!hasTime) missing.push('time per question');
    if (!missing.length) return '';
    return `Pick ${missing.length === 1 ? missing[0] : missing.slice(0, -1).join(', ') + ' and ' + missing.slice(-1)[0]}.`;
  }, [topicsPicked, hasQuestionCount, hasTime]);

  const updateRoom = useCallback(async (patch) => {
    const res = await api('updateRoom', { roomId: SINGLE_ROOM_ID, playerId, patch });
    if (res && res.room) setRoom(res.room);
  }, [playerId]);
  const updateSettings = useCallback(async (patch) => {
    if (!room) return;
    const settings = { ...(room.settings || {}), ...patch };
    await updateRoom({ settings });
  }, [room, updateRoom]);

  function startPolling() {
    if (pollIdRef.current) clearInterval(pollIdRef.current);
    let inFlight = false;
    let failureStreak = 0;
    pollIdRef.current = setInterval(async () => {
      if (document.hidden) return;
      if (inFlight) return;
      inFlight = true;
      try {
        const res = await fetch(`${API}?action=getRoom`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roomId: SINGLE_ROOM_ID }) });
        let json = null; try { json = await res.json(); } catch {}
        if (res.ok && json && json.room) {
          setRoom(json.room); lastGoodRoomRef.current = json.room; failureStreak = 0;
        } else {
          lastGoodRoomRef.current = null; setRoom(null); stopPolling();
        }
      } catch {
        failureStreak++;
        if (failureStreak >= 3 && !lastGoodRoomRef.current) { setRoom(null); stopPolling(); }
      } finally {
        inFlight = false;
      }
    }, 900);
  }
  function stopPolling() { if (pollIdRef.current) { clearInterval(pollIdRef.current); pollIdRef.current = null; } }
  useEffect(() => () => stopPolling(), []);

  async function joinGame() {
    const name = (displayName || '').trim();
    if (name.length < 3) return;
    const res = await api('joinOrCreate', { roomId: SINGLE_ROOM_ID, playerId, name });
    if (res && res.room) { setRoom(res.room); localStorage.setItem('displayName', name); startPolling(); }
  }

  async function endAndExit() {
    try { await api('nukeRoom', { roomId: SINGLE_ROOM_ID, playerId }); } catch {}
    lastGoodRoomRef.current = null; stopPolling(); setRoom(null);
  }

  useEffect(() => { (async () => setCategories(await fetchCategories()))(); }, []);
  useEffect(() => { setPendingAnswer(null); }, [room?.qIndex, room?.state]);

  useEffect(() => {
    const onKey = (e) => {
      const r = roomRef.current; if (!r || r.state !== 'question') return;
      const map = { '1':'A','2':'B','3':'C','4':'D' };
      if (map[e.key]) { e.preventDefault(); const idx = Number(e.key) - 1; const q = r.questions[r.qIndex]; if (!q) return; const opt = q.options[idx]; if (opt) answer(opt); }
      else if (e.key === 'Escape') { e.preventDefault(); setPendingAnswer(null); }
    };
    window.addEventListener('keydown', onKey, { passive: false });
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const answer = useCallback(async (option) => {
    const r = roomRef.current; if (!r || r.state !== 'question') return;
    const nowTs = Date.now();
    const endAt = typeof r.questionEndsAt === 'number' ? r.questionEndsAt : (nowTs + 1);
    if (nowTs >= endAt) return;
    if (nowTs - lastAnswerAtRef.current < 80) return; lastAnswerAtRef.current = nowTs;

    setPendingAnswer(option);
    setRoom(prev => {
      if (!prev || prev.state !== 'question') return prev;
      const idx = prev.qIndex; const answers = { ...(prev.answers || {}) };
      const qMap = { ...(answers[idx] || {}) }; const correct = option === prev.questions[idx].correct;
      qMap[playerId] = { answer: option, correct, at: nowTs }; answers[idx] = qMap; return { ...prev, answers };
    });
    try {
      const idx = r.qIndex;
      await api('updateRoom', { roomId: SINGLE_ROOM_ID, playerId, patch: { answers: { [idx]: { [playerId]: { answer: option } } } } });
    } catch {}
  }, [playerId]);

  async function finalizeAnswers(idx) {
    try {
      const r = await api('getRoom', { roomId: SINGLE_ROOM_ID });
      const latest = (r && r.room && r.room.answers) || {};
      const local = roomRef.current?.answers || {};
      const merged = { ...latest }; merged[idx] = { ...(latest[idx] || {}), ...(local[idx] || {}) };
      await updateRoom({ answers: merged });
    } catch {}
  }

  const startGame = useCallback(async () => {
    if (!canStart) return;
    const count = Number(room.settings.questionCount); const categoryIds = room.settings.categoryIds || [];
    let qs = await fetchQuestionsMixed({ count, categoryIds }); let tries = 0;
    while (qs.length < count && tries < 3) { const more = await fetchQuestionsMixed({ count: count - qs.length, categoryIds }); qs = [...qs, ...more]; tries++; }
    if (qs.length < count && qs.length > 0) { const needed = count - qs.length; qs = [...qs, ...qs.slice(0, needed)]; }
    await updateRoom({ questions: qs.slice(0, count), qIndex: 0, state: 'pregame', countdownEndsAt: Date.now() + 10000, intermissionEndsAt: 0 });
    await sleep(10050);
    await updateRoom({ state: 'question', questionEndsAt: Date.now() + 1000 * Number(room.settings.questionTimeSec), intermissionEndsAt: 0 });
  }, [canStart, room, updateRoom]);

  const goNextOrResults = useCallback(async () => {
    try {
      const latest = await api('getRoom', { roomId: SINGLE_ROOM_ID }); const r = latest && latest.room ? latest.room : roomRef.current; if (!r) return;
      const idx = r.qIndex; await finalizeAnswers(idx);
      const total = Array.isArray(r.questions) ? r.questions.length : 0; const last = idx >= total - 1;
      if (last) { await updateRoom({ state: 'results' }); }
      else { await updateRoom({ state: 'question', qIndex: idx + 1, questionEndsAt: Date.now() + 1000 * Number(r.settings.questionTimeSec), intermissionEndsAt: 0 }); }
    } catch {}
  }, [updateRoom]);

  function Header() {
    return (
      <header className="flex items-center justify-between gap-4 py-5">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-2xl font-semibold text-gray-100 tracking-tight shrink-0">Wild Trivia</h1>
          {room?.players?.[playerId]?.name ? (<span className="text-sm text-gray-300 truncate">{room.players[playerId].name}</span>) : null}
          {isHost ? <span className="inline-block rounded-full bg-gray-800 px-2 py-0.5 text-[10px] text-gray-200">Host</span> : null}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {isHost ? (<button className="rounded-xl px-4 py-2 text-sm font-medium transition bg-red-900/30 border border-red-700/50 hover:bg-red-900/40 text-red-200" onClick={() => setConfirmEndOpen(true)}>End & Exit</button>) : null}
          {isHost && room?.state === 'results' ? (
            <button className="rounded-xl px-4 py-2 text-sm font-medium transition bg-gray-900 border border-gray-700 hover:bg-gray-800 text-gray-100" onClick={async () => {
              await updateRoom({ state: 'lobby', questions: [], answers: {}, qIndex: 0, countdownEndsAt: 0, questionEndsAt: 0, intermissionEndsAt: 0, gameNo: (room.gameNo||0)+1, gifIndex: ((room.gifIndex||0)+1)%CELEBRATION_GIFS.length });
            }}>New Game</button>
          ) : null}
        </div>
      </header>
    );
  }

  function Pregame() {
    const endsAt = room?.countdownEndsAt || 0;
    const topics = (room?.settings?.categoryIds || []).length;
    const qCount = room?.settings?.questionCount;
    const qTime = room?.settings?.questionTimeSec;
    const playerCount = Object.keys(room?.players || {}).length;
    const selectedCategories = (room?.settings?.categoryIds || [])
      .map(id => (categories || []).find(c => c.id === id)?.name)
      .filter(Boolean);
    return (
      <div className="py-10">
        <div className="relative overflow-hidden rounded-2xl border border-gray-800 bg-gray-950 p-8 sm:p-10">
          <div className="pointer-events-none absolute inset-x-0 -top-24 h-48 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.25),transparent_60%)]" />
          <div className="flex items-center justify-between gap-6 flex-wrap">
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-400">Get ready</div>
              <div className="mt-1 text-2xl font-semibold text-gray-100">Game starts in</div>
            </div>
            <div className="flex items-center justify-center">
            <CountdownCircleProxy totalMs={10000} endsAt={endsAt} size={120} stroke={8} />
            </div>
          </div>
          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-3">
              <div className="text-[11px] uppercase tracking-wide text-gray-400">Players</div>
              <div className="mt-1 text-gray-100">{playerCount}</div>
            </div>
            <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-3">
              <div className="text-[11px] uppercase tracking-wide text-gray-400">Topics</div>
              <div className="mt-1 text-gray-100">{topics}/5</div>
            </div>
            <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-3">
              <div className="text-[11px] uppercase tracking-wide text-gray-400">Questions</div>
              <div className="mt-1 text-gray-100">{qCount ?? '—'}</div>
            </div>
            <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-3">
              <div className="text-[11px] uppercase tracking-wide text-gray-400">Time per question</div>
              <div className="mt-1 text-gray-100">{Number.isInteger(qTime) ? `${qTime}s` : '—'}</div>
            </div>
          </div>
          {selectedCategories.length ? (
            <div className="mt-6">
              <div className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">Selected categories</div>
              <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs text-gray-300">
                {selectedCategories.map(name => (
                  <li key={name} className="rounded-lg border border-gray-800 bg-gray-900/40 px-3 py-2">{name}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="mt-6 text-xs text-gray-400">Tip: Use keys 1–4 for A–D.</div>
        </div>
      </div>
    );
  }

  return (
    !room ? (
      <JoinScreenView displayName={displayName} setDisplayName={setDisplayName} joinGame={joinGame} />
    ) : (
      <div className="max-w-6xl mx-auto px-4 pb-16">
        <div aria-live="polite" className="sr-only">{room.state === 'question' ? `Question ${room.qIndex+1}` : room.state === 'results' ? 'Results' : 'Lobby'}</div>
        <Header/>
        {room.state === 'lobby' ? (
          <div className="grid lg:grid-cols-4 gap-6">
            <PlayersPanelProxy room={room} />
            <LobbySettingsProxy room={room} isHost={isHost} categories={categories} topicsSelectedCount={topicsSelectedCount} lastCatClickRef={lastCatClickRef} updateSettings={updateSettings} canStart={canStart} startHint={startHint} startGame={startGame} />
          </div>
        ) : room.state === 'pregame' ? (
          <Pregame/>
        ) : room.state === 'question' ? (
          <QuestionScreenView room={room} playerId={playerId} pendingAnswer={pendingAnswer} isHost={isHost} answer={answer} goNextOrResults={goNextOrResults} />
        ) : (
          <ResultsView room={room} isHost={isHost} updateRoom={updateRoom} />
        )}
        {isHost ? (
          <div>
            {confirmEndOpen ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setConfirmEndOpen(false)} />
                <div role="dialog" aria-modal="true" className="relative z-10 w-[90vw] max-w-sm rounded-2xl border border-gray-800 bg-gray-950 p-5 shadow-xl">
                  <div className="text-lg font-semibold text-gray-100">End and Exit?</div>
                  <div className="mt-2 text-sm text-gray-300">This will end the current game for everyone and return to the start.</div>
                  <div className="mt-4 flex items-center justify-end gap-2">
                    <button className="rounded-lg px-3 py-2 text-sm font-medium bg-gray-900 border border-gray-700 hover:bg-gray-800 text-gray-100" onClick={() => setConfirmEndOpen(false)}>Cancel</button>
                    <button className="rounded-lg px-3 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white" onClick={async () => { setConfirmEndOpen(false); await endAndExit(); }}>End & Exit</button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    )
  );
}

function Root() { return <App/>; }
ReactDOM.createRoot(document.getElementById('root')).render(<Root/>);
