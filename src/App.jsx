import { useState, useEffect, useRef, useCallback } from 'react';
import {
  AWARENESS_CARDS, EGO_PATTERNS, MIND_SHIFTS, PRESENCE_ANCHORS,
  AWARENESS_CHECK, DEEP_INSIGHTS, TEACHER_COLORS, TEACHER_LABELS,
} from './data/transurfingData';
import { load, save, addXP, getTitle } from './store/gameStore';
import './App.css';

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

/* ── Particles ── */
function Particles() {
  return (
    <div className="particles">{Array.from({ length: 18 }, (_, i) => (
      <div key={i} className="particle" style={{
        left: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 8}s`,
        animationDuration: `${6 + Math.random() * 8}s`,
        opacity: 0.12 + Math.random() * 0.18,
        width: `${2 + Math.random() * 3}px`, height: `${2 + Math.random() * 3}px`,
      }} />
    ))}</div>
  );
}

function XPToast({ amount }) {
  if (amount === null) return null;
  return <div className="xp-toast" key={Date.now()}>+{amount} XP</div>;
}

function LevelUp({ level, onDone }) {
  if (!level) return null;
  return (
    <div className="overlay" onClick={onDone}>
      <div className="level-up-card" onClick={e => e.stopPropagation()}>
        <div className="lu-glow" />
        <div className="lu-level">Lv.{level}</div>
        <div className="lu-title">{getTitle(level)}</div>
        <div className="lu-msg">意識のレベルが上がった</div>
        <button className="btn-glow" onClick={onDone}>OK</button>
      </div>
    </div>
  );
}

function TeacherTag({ teacher }) {
  return (
    <span className="teacher-tag" style={{ color: TEACHER_COLORS[teacher], borderColor: TEACHER_COLORS[teacher] + '44' }}>
      {TEACHER_LABELS[teacher]}
    </span>
  );
}

/* ── Daily Insight (top) ── */
function DailyInsight({ onXP }) {
  const [insight] = useState(() => rand(DEEP_INSIGHTS));
  const [accepted, setAccepted] = useState(false);
  const accept = () => { if (!accepted) { onXP(10); setAccepted(true); } };

  return (
    <div className="insight-card glass" onClick={accept}>
      <div className="insight-glow" style={{ background: `radial-gradient(circle,${TEACHER_COLORS[insight.teacher]}18,transparent 70%)` }} />
      <p className="insight-text">{insight.text}</p>
      <div className="insight-footer">
        <TeacherTag teacher={insight.teacher} />
        {!accepted && <span className="insight-tap">tap +10XP</span>}
        {accepted && <span className="insight-done">✓</span>}
      </div>
    </div>
  );
}

/* ── Awareness Card Draw ── */
function CardDraw({ onXP }) {
  const [card, setCard] = useState(null);
  const [flipped, setFlipped] = useState(false);
  const [shaking, setShaking] = useState(false);

  const draw = () => {
    setShaking(true);
    setTimeout(() => { setCard(rand(AWARENESS_CARDS)); setShaking(false); setTimeout(() => setFlipped(true), 80); }, 500);
  };
  const done = () => { onXP(15); setCard(null); setFlipped(false); };

  if (!card) return (
    <div className="section-card glass" onClick={draw}>
      <div className={`card-deck ${shaking ? 'deck-shake' : ''}`}>
        <div className="dk dc3" /><div className="dk dc2" /><div className="dk dc1"><span>✦</span></div>
      </div>
      <div><div className="section-label">Awareness Card</div><div className="section-sub">タップで意識のカードを引く</div></div>
    </div>
  );

  return (
    <div className="flip-wrap">
      <div className={`flip-card ${flipped ? 'flipped' : ''}`} style={{ '--cc': card.color }}>
        <div className="flip-front"><span className="flip-sym">{card.symbol}</span></div>
        <div className="flip-back">
          <span className="flip-sym-s">{card.symbol}</span>
          <h3>{card.title}</h3>
          <p className="flip-body">{card.body}</p>
          <TeacherTag teacher={card.teacher} />
          <button className="btn-glass" onClick={done}>心に刻む +15XP</button>
        </div>
      </div>
    </div>
  );
}

/* ── Ego Detector ── */
function EgoDetector({ onXP }) {
  const [active, setActive] = useState(false);
  const [pattern, setPattern] = useState(null);
  const [revealed, setRevealed] = useState(false);

  const start = () => { setPattern(rand(EGO_PATTERNS)); setActive(true); setRevealed(false); };
  const done = () => { onXP(20); setActive(false); };

  if (!active) return (
    <div className="section-card glass" onClick={start}>
      <div className="ego-icon">👁</div>
      <div><div className="section-label">Ego Detector</div><div className="section-sub">今のエゴパターンに気づく</div></div>
    </div>
  );

  return (
    <div className="ego-game glass">
      <div className="ego-pattern-name">{pattern.pattern}</div>
      <div className="ego-thought">{pattern.thought}</div>
      {!revealed ? (
        <button className="btn-reveal" onClick={() => setRevealed(true)}>
          <span className="reveal-eye">👁</span>気づきを得る
        </button>
      ) : (
        <div className="ego-reveal">
          <p className="ego-trap">{pattern.trap}</p>
          <TeacherTag teacher={pattern.teacher} />
          <button className="btn-glass" onClick={done}>気づいた +20XP</button>
        </div>
      )}
    </div>
  );
}

/* ── Mind Shift ── */
function MindShift({ onXP }) {
  const [active, setActive] = useState(false);
  const [shift, setShift] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [dragX, setDragX] = useState(0);
  const dragging = useRef(false);
  const startX = useRef(0);

  const start = () => { setShift(rand(MIND_SHIFTS)); setActive(true); setRevealed(false); setDragX(0); };
  const done = () => { onXP(20); setActive(false); };

  const onDown = (x) => { startX.current = x; dragging.current = true; };
  const onMove = (x) => { if (dragging.current) setDragX(Math.max(0, x - startX.current)); };
  const onUp = () => { dragging.current = false; if (dragX > 100) setRevealed(true); else setDragX(0); };

  if (!active) return (
    <div className="section-card glass" onClick={start}>
      <div className="shift-icon">⟲</div>
      <div><div className="section-label">Mind Shift</div><div className="section-sub">無意識の思考を意識的に変換</div></div>
    </div>
  );

  return (
    <div className="shift-game">
      <div className="shift-before glass">
        <span className="shift-tag">無意識の思考</span>
        <p>{shift.before}</p>
      </div>
      {!revealed ? (
        <div className="swipe-area"
          onTouchStart={e => onDown(e.touches[0].clientX)}
          onTouchMove={e => onMove(e.touches[0].clientX)}
          onTouchEnd={onUp}
          onMouseDown={e => onDown(e.clientX)}
          onMouseMove={e => onMove(e.clientX)}
          onMouseUp={onUp} onMouseLeave={onUp}>
          <div className="swipe-track">
            <div className="swipe-thumb" style={{ transform: `translateX(${dragX}px)` }}>→</div>
            <span className="swipe-hint" style={{ opacity: 1 - dragX / 120 }}>スワイプで意識を変換</span>
          </div>
        </div>
      ) : (
        <div className="shift-after glass">
          <span className="shift-tag after">意識的な応答</span>
          <p>{shift.after}</p>
          <TeacherTag teacher={shift.tradition} />
          <button className="btn-glass" onClick={done}>変換完了 +20XP</button>
        </div>
      )}
    </div>
  );
}

/* ── Presence Anchor ── */
function PresenceAnchors({ onXP }) {
  const [active, setActive] = useState(null);
  const [timer, setTimer] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running || timer <= 0) { if (running && timer <= 0) { setRunning(false); onXP(12); } return; }
    const t = setTimeout(() => setTimer(v => v - 1), 1000);
    return () => clearTimeout(t);
  }, [running, timer, onXP]);

  const close = () => { setActive(null); setRunning(false); };

  if (active) {
    const pct = active.duration > 0 ? ((active.duration - timer) / active.duration) * 100 : 100;
    return (
      <div className="presence-active glass">
        <div className="pa-icon">{active.icon}</div>
        <h3>{active.name}</h3>
        <p className="pa-desc">{active.desc}</p>
        <div className="pa-ring">
          <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
            <circle cx="50" cy="50" r="44" fill="none" stroke="url(#pg)" strokeWidth="3"
              strokeDasharray={`${pct * 2.764} 276.4`} strokeLinecap="round" transform="rotate(-90 50 50)" />
            <defs><linearGradient id="pg"><stop offset="0%" stopColor="#6366f1" /><stop offset="100%" stopColor="#06b6d4" /></linearGradient></defs>
          </svg>
          <span className="pa-time">{timer > 0 ? timer : '✓'}</span>
        </div>
        {timer <= 0 ? <button className="btn-glow" onClick={close}>完了 +12XP</button>
          : <button className="btn-ghost" onClick={close}>キャンセル</button>}
      </div>
    );
  }

  return (
    <div className="anchor-grid">
      {PRESENCE_ANCHORS.map((a, i) => (
        <button key={i} className="anchor-chip glass" onClick={() => { setActive(a); setTimer(a.duration); setRunning(true); }}>
          <span className="ac-icon">{a.icon}</span>
          <span className="ac-name">{a.name}</span>
          <span className="ac-dur">{a.duration}s</span>
        </button>
      ))}
    </div>
  );
}

/* ── Awareness Check ── */
function AwarenessCheck({ onXP, state, setState }) {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [scores, setScores] = useState([]);
  const [val, setVal] = useState(50);

  const start = () => { setActive(true); setStep(0); setScores([]); setVal(50); };
  const next = () => {
    const ns = [...scores, val]; setScores(ns); setVal(50);
    if (step < AWARENESS_CHECK.length - 1) { setStep(step + 1); }
    else {
      const avg = Math.round(ns.reduce((a, b) => a + b, 0) / ns.length);
      const s = { ...state, wave: avg, waveHistory: [...state.waveHistory.slice(-13), { v: avg, d: Date.now() }] };
      setState(s); save(s); onXP(25); setActive(false);
    }
  };

  const color = v => v > 70 ? '#4ade80' : v > 40 ? '#fbbf24' : '#ef4444';
  const label = v => v > 80 ? '深い覚醒' : v > 60 ? '意識的' : v > 40 ? '普通' : v > 20 ? '自動操縦' : 'エゴの支配下';

  if (!active) return (
    <div className="section-card glass wave-card" onClick={start}>
      <div className="wave-vis">
        <div className="wave-bg"><div className="wave-fill" style={{ height: `${state.wave}%`, background: color(state.wave) }} /></div>
        <span className="wave-val" style={{ color: color(state.wave) }}>{state.wave}</span>
      </div>
      <div><div className="section-label">Awareness Level</div><div className="section-sub">{label(state.wave)}</div></div>
    </div>
  );

  const q = AWARENESS_CHECK[step];
  return (
    <div className="check-active glass">
      <div className="check-step">{step + 1}/{AWARENESS_CHECK.length}</div>
      <h3 className="check-q">{q.q}</h3>
      <div className="check-slider-wrap">
        <span className="check-end">{q.low}</span>
        <input type="range" min="0" max="100" value={val} onChange={e => setVal(+e.target.value)} className="check-slider" />
        <span className="check-end">{q.high}</span>
      </div>
      <div className="check-val" style={{ color: color(val) }}>{val}</div>
      <button className="btn-glow" onClick={next}>{step < AWARENESS_CHECK.length - 1 ? '次へ' : '完了 +25XP'}</button>
    </div>
  );
}

/* ── Main ── */
export default function App() {
  const [state, setState] = useState(load);
  const [toast, setToast] = useState(null);
  const [levelUp, setLevelUp] = useState(null);
  const tt = useRef(null);

  const handleXP = useCallback((amount) => {
    setState(prev => {
      const old = prev.level;
      const next = addXP(prev, amount);
      if (next.level > old) setLevelUp(next.level);
      return next;
    });
    setToast(amount);
    clearTimeout(tt.current);
    tt.current = setTimeout(() => setToast(null), 1200);
  }, []);

  const xpPct = (state.xp / state.xpNext) * 100;

  return (
    <div className="app">
      <Particles />

      <header className="header glass">
        <div className="h-left">
          <div className="h-title">Awareness OS</div>
          <div className="h-sub">{getTitle(state.level)}</div>
        </div>
        <div className="h-right">
          {state.streak > 0 && <span className="streak">🔥{state.streak}</span>}
          <span className="lvl">Lv.{state.level}</span>
        </div>
      </header>

      <div className="xp-wrap">
        <div className="xp-track"><div className="xp-fill" style={{ width: `${xpPct}%` }} /></div>
        <span className="xp-num">{state.xp}/{state.xpNext}</span>
      </div>

      <main className="main">
        <DailyInsight onXP={handleXP} />
        <CardDraw onXP={handleXP} />
        <EgoDetector onXP={handleXP} />
        <MindShift onXP={handleXP} />
        <AwarenessCheck onXP={handleXP} state={state} setState={setState} />

        <div className="sh">Presence Anchor</div>
        <PresenceAnchors onXP={handleXP} />

        <div className="stats glass">
          <div className="st"><span className="sv">{state.totalActions}</span><span className="sl">Actions</span></div>
          <div className="st"><span className="sv">{state.bestStreak}</span><span className="sl">Best Streak</span></div>
          <div className="st"><span className="sv">{state.wave}</span><span className="sl">Awareness</span></div>
          <div className="st"><span className="sv">Lv.{state.level}</span><span className="sl">Level</span></div>
        </div>
      </main>

      <XPToast amount={toast} />
      <LevelUp level={levelUp} onDone={() => setLevelUp(null)} />
    </div>
  );
}
