// Ensure the Trivia namespace exists and exports the functions index expects
(function () {
  // Reuse if already created
  const Trivia = window.Trivia || {};

  // --- Config / constants ---
  Trivia.API = Trivia.API || '/api';
  Trivia.SINGLE_ROOM_ID = Trivia.SINGLE_ROOM_ID || 'ROOM';
  Trivia.CELEBRATION_GIFS = Trivia.CELEBRATION_GIFS || [
    'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif',
    'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif',
    'https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif',
  ];

  Trivia.GROUP_ORDER = Trivia.GROUP_ORDER || [
    'General',
    'Entertainment & Games',
    'Science & Tech',
    'History & Society',
    'Geography',
    'Arts & Culture',
    'Sports',
    'Lifestyle & Nature',
    'Other',
  ];

  Trivia.catGroup = Trivia.catGroup || function catGroup(name) {
    const n = String(name || '').toLowerCase();
    if (n.includes('general')) return 'General';
    if (n.startsWith('entertainment') || n.includes('video game') || n.includes('board game') || n.includes('anime') || n.includes('manga') || n.includes('cartoon') || n.includes('comic')) return 'Entertainment & Games';
    if (n.startsWith('science') || n.includes('computers') || n.includes('mathematics') || n.includes('gadgets')) return 'Science & Tech';
    if (n.includes('history') || n.includes('politics') || n.includes('mythology')) return 'History & Society';
    if (n.includes('geography')) return 'Geography';
    if (n.includes('art') || n.includes('celeb')) return 'Arts & Culture';
    if (n.includes('sport')) return 'Sports';
    if (n.includes('animal') || n.includes('vehicle')) return 'Lifestyle & Nature';
    return 'Other';
  };

  // --- Small utils used below ---
  const shuffle = (arr) => { const a = [...arr]; for (let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
  const decodeHTML = (s) => { const t=document.createElement('textarea'); t.innerHTML = s; return t.value; };

  // --- API helper expected by index ---
  Trivia.api = Trivia.api || async function api(action, data = {}) {
    const res = await fetch(`${Trivia.API}?action=${encodeURIComponent(action)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    let json = null; try { json = await res.json(); } catch {}
    if (!res.ok) throw new Error((json && json.error) || 'Network error');
    if (json && json.error) throw new Error(json.error);
    return json;
  };

  // --- Categories (OpenTDB) ---
  Trivia.fetchCategories = Trivia.fetchCategories || async function fetchCategories() {
    try {
      const r = await fetch('https://opentdb.com/api_category.php');
      const j = await r.json();
      if (Array.isArray(j.trivia_categories) && j.trivia_categories.length) return j.trivia_categories;
    } catch {}
    // Fallback list if network fails
    return [
      {id:9,name:'General Knowledge'},{id:10,name:'Entertainment: Books'},{id:11,name:'Entertainment: Film'},{id:12,name:'Entertainment: Music'},
      {id:13,name:'Entertainment: Musicals & Theatres'},{id:14,name:'Entertainment: Television'},{id:15,name:'Entertainment: Video Games'},{id:16,name:'Entertainment: Board Games'},
      {id:17,name:'Science & Nature'},{id:18,name:'Science: Computers'},{id:19,name:'Science: Mathematics'},{id:20,name:'Mythology'},
      {id:21,name:'Sports'},{id:22,name:'Geography'},{id:23,name:'History'},{id:24,name:'Politics'},
      {id:25,name:'Art'},{id:26,name:'Celebrities'},{id:27,name:'Animals'},{id:28,name:'Vehicles'},
      {id:29,name:'Entertainment: Comics'},{id:30,name:'Science: Gadgets'},{id:31,name:'Entertainment: Japanese Anime & Manga'},{id:32,name:'Entertainment: Cartoon & Animations'},
    ];
  };

  // --- Questions (OpenTDB mixed fetch) ---
  Trivia.fetchQuestionsMixed = Trivia.fetchQuestionsMixed || async function fetchQuestionsMixed({ count, categoryIds }) {
    const cats = (categoryIds && categoryIds.length) ? [...categoryIds] : [null];
    const all = []; const seen = new Set();

    const pushUnique = (items) => {
      for (const q of items) {
        const key = q.question + '|' + q.correct;
        if (!seen.has(key)) {
          seen.add(key);
          all.push(q);
          if (all.length >= count) break;
        }
      }
    };

    async function fetchBatch(amount, cat) {
      const url = new URL('https://opentdb.com/api.php');
      url.searchParams.set('amount', String(Math.min(50, amount)));
      url.searchParams.set('type', 'multiple');
      if (cat) url.searchParams.set('category', String(cat));
      const r = await fetch(url.toString());
      const j = await r.json();
      const mapped = (j.results || []).map((q) => {
        const options = shuffle([q.correct_answer, ...q.incorrect_answers]).map(decodeHTML);
        return {
          question: decodeHTML(q.question),
          correct: decodeHTML(q.correct_answer),
          options,
          category: q.category,
          difficulty: q.difficulty,
        };
      });
      pushUnique(mapped);
    }

    let attempts = 0;
    while (all.length < count && attempts < 8) {
      if (cats[0] === null) {
        await fetchBatch(count - all.length, null);
      } else {
        for (const cat of cats) {
          if (all.length >= count) break;
          await fetchBatch(count - all.length, cat);
        }
        if (all.length < count) await fetchBatch(count - all.length, null);
      }
      attempts++;
    }
    return all.slice(0, count);
  };

  // Expose on window
  window.Trivia = Trivia;
})();


(function(){
  const { useMemo, useEffect, useState } = React;

  function CountdownCircle({ totalMs, endsAt, size=96, stroke=8, ringColor='rgb(99,102,241)' }) {
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
      let rafId;
      const tick = () => { setNow(Date.now()); rafId = requestAnimationFrame(tick); };
      rafId = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafId);
    }, []);
    const left = Math.max(0, (endsAt ?? 0) - now);
    const pct = totalMs > 0 ? 1 - left / totalMs : 1;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const dash = Math.max(0.0001, c * pct);
    const rest = Math.max(0, c - dash);
    const secs = Math.ceil(left / 1000);
    return (
      <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="rotate-[-90deg]">
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgb(31,41,55)" strokeWidth={stroke}/>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={ringColor} strokeWidth={stroke}
                  strokeDasharray={`${dash} ${rest}`} strokeLinecap="round"/>
        </svg>
        <div className="absolute text-center">
          <div className="text-3xl font-bold text-gray-100">{secs}</div>
        </div>
      </div>
    );
  }
  window.CountdownCircle = window.CountdownCircle || CountdownCircle;

  function PlayersPanel({ room }) {
    const list = useMemo(() => {
      const arr = Object.values(room.players || {});
      arr.sort((a,b) => (a.id === room.hostId ? -1 : b.id === room.hostId ? 1 : (a.name||'').localeCompare(b.name||'')));
      return arr;
    }, [room.players, room.hostId]);
    const initials = (name) => (name||'').split(' ').map(s=>s[0]).filter(Boolean).slice(0,2).join('').toUpperCase();
    return (
      <div className="rounded-2xl border border-gray-800 p-6 shadow-sm bg-gray-950">
        <div className="text-base font-medium mb-2">Players</div>
        <ul className="space-y-2">
          {list.map(p => (
            <li key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-800 bg-gray-950 px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-indigo-700 text-white flex items-center justify-center text-xs font-bold shrink-0">{initials(p.name)}</div>
                <span className="truncate">{p.name}</span>
              </div>
              {p.id === room.hostId ? <span className="inline-block rounded-full bg-gray-800 px-2 py-0.5 text-[10px] text-gray-200">Host</span> : null}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  function LobbySettings({ room, isHost, categories, topicsSelectedCount, lastCatClickRef, updateSettings, canStart, startHint, startGame }) {
    const GROUP_ORDER = window.Trivia.GROUP_ORDER;
    const catGroup = window.Trivia.catGroup;
    return (
      <div className="rounded-2xl border border-gray-800 p-6 shadow-sm bg-gray-950 lg:col-span-3">
        <div className="text-base font-medium mb-3">Settings</div>
        <p className="text-xs text-gray-400 mb-2">{!isHost ? 'Only the host can change settings.' : ''}</p>
        {(() => { const chipCls = "inline-block rounded-full border border-gray-700 bg-gray-800 px-3 py-1 text-xs"; return (
          <div className="flex flex-wrap gap-2 mb-4">
            <span className={`${chipCls}`}>Topics: {topicsSelectedCount}/5</span>
            <span className={`${chipCls}`}>Questions: {room.settings.questionCount ?? '—'}</span>
            <span className={`${chipCls}`}>Time: {Number.isInteger(room?.settings?.questionTimeSec) ? `${room.settings.questionTimeSec}s` : '—'}</span>
            {isHost ? <span className={`${canStart ? 'bg-emerald-900 text-emerald-200' : 'bg-gray-800 text-gray-400'} ${chipCls}`}>{canStart ? 'Ready to start' : 'Waiting for selections'}</span> : null}
          </div>
        )})()}

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <div className="text-sm uppercase tracking-wide text-gray-400 mb-1">Step 1</div>
            <div className="text-sm font-medium mb-1">Topics (pick up to 5)</div>
            <div className="max-h-[32rem] overflow-auto pr-1 space-y-3">
              {(() => {
                const sel = new Set(room.settings.categoryIds || []);
                if (!categories || !categories.length) {
                  return (<div className="space-y-2 animate-pulse">{Array.from({length:8}).map((_,i)=>(<div key={i} className="h-10 bg-gray-800/50 rounded" />))}</div>);
                }
                const groups = {}; for (const c of categories) { const k = catGroup(c.name); if (!groups[k]) groups[k] = []; groups[k].push(c); }
                return GROUP_ORDER.filter(k => groups[k]?.length).map(k => (
                  <div key={k} className="space-y-2">
                    <div className="text-xs uppercase tracking-wide text-gray-400">{k}</div>
                    {groups[k].map(c => {
                      const chosen = sel.has(c.id);
                       const base = 'w-full text-left flex items-center justify-between gap-2 px-4 py-2 rounded-lg border transition';
                      const clsHost = chosen ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-gray-900 text-gray-200 border-gray-800 hover:bg-gray-800';
                      const clsViewer = chosen ? 'bg-gray-800 text-gray-400 border-gray-700' : 'bg-gray-900 text-gray-500 border-gray-800';
                      const cls = isHost ? clsHost : clsViewer;
                      return (
                        <button key={c.id} disabled={!isHost} onClick={() => { const nowC = Date.now(); if (nowC - lastCatClickRef.current < 200) return; lastCatClickRef.current = nowC; if (!isHost) return; const s = new Set(room.settings.categoryIds || []);
                          if (chosen) s.delete(c.id); else s.add(c.id);
                          updateSettings({ categoryIds: Array.from(s).slice(0,5) });
                        }} className={`${base} ${cls} ${!isHost ? 'cursor-default' : ''}`}>
                          <span>{c.name}</span>
                          {chosen ? '✓' : ''}
                        </button>
                      );
                    })}
                  </div>
                ));
              })()}
            </div>
          </div>

          <div>
            <div className="text-sm uppercase tracking-wide text-gray-400 mb-1">Step 2</div>
            <div className="text-sm font-medium mb-2">Number of questions</div>
            <div className="flex flex-wrap gap-2">
              {[5,10,15,20].map(n => (
                <button key={n} disabled={!isHost} onClick={() => updateSettings({ questionCount: n })}
                  className={`text-left flex items-center justify-between gap-2 px-4 py-2 rounded-lg border transition ${isHost ? (room.settings.questionCount === n ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-gray-900 text-gray-200 border-gray-800 hover:bg-gray-800') : (room.settings.questionCount === n ? 'bg-gray-800 text-gray-400 border-gray-700' : 'bg-gray-900 text-gray-500 border-gray-800')} ${!isHost ? 'cursor-default' : ''}`}>
                  <span className="flex items-center justify-between gap-2 min-w-[11rem]"><span className="truncate">{n}</span><span className="w-4 text-right">{room.settings.questionCount === n ? '✓' : ''}</span></span>
                </button>
              ))}
            </div>

            <div className="text-sm uppercase tracking-wide text-gray-400 mb-1 mt-6">Step 3</div>
            <div className="text-sm font-medium mb-2">Time per question</div>
            <div className="flex flex-wrap gap-2">
              {[10,15,20].map(s => (
                <button key={s} disabled={!isHost} onClick={() => { updateSettings({ questionTimeSec: s }); }}
                  className={`text-left flex items=center justify-between gap-2 px-4 py-2 rounded-lg border transition ${isHost ? ((room.settings.questionTimeSec === s) ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-gray-900 text-gray-200 border-gray-800 hover:bg-gray-800') : ((room.settings.questionTimeSec === s) ? 'bg-gray-800 text-gray-400 border-gray-700' : 'bg-gray-900 text-gray-500 border-gray-800')} ${!isHost ? 'cursor-default' : ''}`}>
                  <span className="flex items-center justify-between gap-2 min-w-[11rem] w-full"><span className="truncate">{s} seconds</span><span className="w-4 text-right">{room.settings.questionTimeSec === s ? '✓' : ''}</span></span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {isHost && room.state === 'lobby' ? (
          <div className="lg:static lg:bg-transparent lg:border-0 lg:py-0 lg:px-0 fixed inset-x-0 bottom-0 z-40 bg-gray-950/95 backdrop-blur supports-[backdrop-filter]:bg-gray-950/75 border-t border-gray-800 py-3">
            <div className="max-w-6xl mx-auto px-4">
              <div className="flex items-center justify-end gap-3">
                {!canStart ? (
                  <div className="text-xs text-gray-400" aria-live="polite">{startHint}</div>
                ) : null}
                <button className={`${canStart ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed opacity-60'} rounded-lg px-4 py-2 text-sm font-medium transition`} onClick={startGame} disabled={!canStart}>Start Game</button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  window.PlayersPanel = PlayersPanel;
  window.LobbySettings = LobbySettings;
})();
