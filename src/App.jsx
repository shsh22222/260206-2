import { useState, useEffect, useRef, useCallback } from 'react';
import { REALITY_CARDS, MINDSET_SHIFTS, AFFIRMATIONS, WAVE_QUESTIONS, QUICK_RESETS } from './data/transurfingData';
import { load, save, addXP, getTitle } from './store/gameStore';
import './App.css';

/* ─── Particle background ─── */
function Particles() {
  return (
    <div className="particles">
      {Array.from({ length: 20 }, (_, i) => (
        <div key={i} className="particle" style={{
          left: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 8}s`,
          animationDuration: `${6 + Math.random() * 8}s`,
          opacity: 0.15 + Math.random() * 0.2,
          width: `${2 + Math.random() * 3}px`,
          height: `${2 + Math.random() * 3}px`,
        }} />
      ))}
    </div>
  );
}

/* ─── XP Toast ─── */
function XPToast({ show, amount }) {
  if (!show) return null;
  return <div className="xp-toast">+{amount} XP</div>;
}

/* ─── Level Up Overlay ─── */
function LevelUp({ level, onDone }) {
  if (!level) return null;
  return (
    <div className="overlay" onClick={onDone}>
      <div className="level-up-card">
        <div className="lu-glow" />
        <div className="lu-level">Lv.{level}</div>
        <div className="lu-title">{getTitle(level)}</div>
        <div className="lu-msg">新しい称号を獲得</div>
        <button className="btn-glow" onClick={onDone}>OK</button>
      </div>
    </div>
  );
}

/* ─── Reality Card Draw ─── */
function CardDraw({ onXP }) {
  const [card, setCard] = useState(null);
  const [flipped, setFlipped] = useState(false);
  const [drawing, setDrawing] = useState(false);

  const draw = () => {
    setDrawing(true);
    setFlipped(false);
    setTimeout(() => {
      const c = REALITY_CARDS[Math.floor(Math.random() * REALITY_CARDS.length)];
      setCard(c);
      setDrawing(false);
      setTimeout(() => setFlipped(true), 50);
    }, 600);
  };

  const done = () => {
    onXP(15);
    setCard(null);
    setFlipped(false);
  };

  if (!card) {
    return (
      <div className="section-card glass" onClick={draw}>
        <div className={`card-deck ${drawing ? 'deck-shake' : ''}`}>
          <div className="deck-card dc3" />
          <div className="deck-card dc2" />
          <div className="deck-card dc1">
            <span className="deck-icon">✦</span>
          </div>
        </div>
        <div className="section-label">Reality Card</div>
        <div className="section-sub">タップしてカードを引く</div>
      </div>
    );
  }

  return (
    <div className="drawn-card-wrap">
      <div className={`drawn-card ${flipped ? 'flipped' : ''}`} style={{ '--card-color': card.color }}>
        <div className="dc-front">
          <div className="dc-icon">{card.icon}</div>
        </div>
        <div className="dc-back">
          <div className="dc-symbol">{card.icon}</div>
          <h3 className="dc-title">{card.title}</h3>
          <p className="dc-body">{card.body}</p>
          <button className="btn-glass" onClick={done}>心に刻む +15XP</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Mindset Shift Game ─── */
function MindsetShift({ onXP }) {
  const [active, setActive] = useState(false);
  const [shift, setShift] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dragX, setDragX] = useState(0);
  const startX = useRef(0);

  const start = () => {
    const s = MINDSET_SHIFTS[Math.floor(Math.random() * MINDSET_SHIFTS.length)];
    setShift(s);
    setActive(true);
    setRevealed(false);
    setDragX(0);
  };

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    setDragging(true);
  };
  const handleTouchMove = (e) => {
    if (!dragging) return;
    const diff = e.touches[0].clientX - startX.current;
    setDragX(Math.max(0, diff));
  };
  const handleTouchEnd = () => {
    setDragging(false);
    if (dragX > 120) {
      setRevealed(true);
    } else {
      setDragX(0);
    }
  };
  const handleMouseDown = (e) => {
    startX.current = e.clientX;
    setDragging(true);
  };
  const handleMouseMove = (e) => {
    if (!dragging) return;
    const diff = e.clientX - startX.current;
    setDragX(Math.max(0, diff));
  };
  const handleMouseUp = () => {
    setDragging(false);
    if (dragX > 120) {
      setRevealed(true);
    } else {
      setDragX(0);
    }
  };

  const done = () => {
    onXP(20);
    setActive(false);
  };

  if (!active) {
    return (
      <div className="section-card glass shift-card" onClick={start}>
        <div className="shift-icon">⟲</div>
        <div className="section-label">Mindset Shift</div>
        <div className="section-sub">思考をトランサーフィンに変換</div>
      </div>
    );
  }

  return (
    <div className="shift-game">
      <div className="shift-before">
        <span className="shift-tag">Before</span>
        <p>{shift.before}</p>
      </div>

      {!revealed ? (
        <div
          className="shift-swipe"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div className="swipe-track">
            <div className="swipe-thumb" style={{ transform: `translateX(${dragX}px)` }}>
              <span>→</span>
            </div>
            <span className="swipe-label" style={{ opacity: 1 - dragX / 150 }}>
              スワイプで変換
            </span>
          </div>
        </div>
      ) : (
        <div className="shift-after">
          <span className="shift-tag after">After — {shift.principle}</span>
          <p>{shift.after}</p>
          <button className="btn-glass" onClick={done}>変換完了 +20XP</button>
        </div>
      )}
    </div>
  );
}

/* ─── Quick Reset ─── */
function QuickReset({ onXP }) {
  const [active, setActive] = useState(null);
  const [timer, setTimer] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);

  const startReset = (reset) => {
    setActive(reset);
    setTimer(reset.duration);
    setRunning(true);
  };

  useEffect(() => {
    if (running && timer > 0) {
      intervalRef.current = setTimeout(() => setTimer(t => t - 1), 1000);
      return () => clearTimeout(intervalRef.current);
    }
    if (running && timer === 0) {
      setRunning(false);
      onXP(10);
    }
  }, [running, timer, onXP]);

  const close = () => {
    setActive(null);
    setRunning(false);
    clearTimeout(intervalRef.current);
  };

  if (active) {
    const progress = timer > 0 ? ((active.duration - timer) / active.duration) * 100 : 100;
    return (
      <div className="reset-active glass">
        <div className="reset-icon-big">{active.icon}</div>
        <h3>{active.name}</h3>
        <p className="reset-desc">{active.desc}</p>
        <div className="reset-ring">
          <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
            <circle cx="50" cy="50" r="44" fill="none" stroke="url(#grad)" strokeWidth="4"
              strokeDasharray={`${progress * 2.764} 276.4`} strokeLinecap="round"
              transform="rotate(-90 50 50)" />
            <defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366f1" /><stop offset="100%" stopColor="#06b6d4" />
            </linearGradient></defs>
          </svg>
          <span className="reset-time">{timer > 0 ? timer : '✓'}</span>
        </div>
        {timer === 0 ? (
          <button className="btn-glow" onClick={close}>完了 +10XP</button>
        ) : (
          <button className="btn-ghost" onClick={close}>キャンセル</button>
        )}
      </div>
    );
  }

  return (
    <div className="reset-grid">
      {QUICK_RESETS.map((r, i) => (
        <button key={i} className="reset-chip glass" onClick={() => startReset(r)}>
          <span className="reset-chip-icon">{r.icon}</span>
          <span className="reset-chip-name">{r.name}</span>
          <span className="reset-chip-dur">{r.duration}s</span>
        </button>
      ))}
    </div>
  );
}

/* ─── Wave Check ─── */
function WaveCheck({ onXP, state, setState }) {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [scores, setScores] = useState([]);
  const [currentVal, setCurrentVal] = useState(50);

  const start = () => { setActive(true); setStep(0); setScores([]); setCurrentVal(50); };

  const next = () => {
    const newScores = [...scores, currentVal];
    setScores(newScores);
    setCurrentVal(50);
    if (step < WAVE_QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      const avg = Math.round(newScores.reduce((a, b) => a + b, 0) / newScores.length);
      const newState = { ...state, wave: avg, waveHistory: [...state.waveHistory.slice(-13), { v: avg, d: Date.now() }] };
      setState(newState);
      save(newState);
      onXP(25);
      setActive(false);
    }
  };

  const waveColor = (v) => v > 70 ? '#4ade80' : v > 40 ? '#fbbf24' : '#ef4444';
  const waveLabel = (v) => v > 80 ? '最高の流れ' : v > 60 ? '良い波動' : v > 40 ? '普通' : v > 20 ? '要注意' : '振り子の影響大';

  if (!active) {
    return (
      <div className="section-card glass wave-card" onClick={start}>
        <div className="wave-visual">
          <div className="wave-bar-bg">
            <div className="wave-bar-fill" style={{ height: `${state.wave}%`, background: waveColor(state.wave) }} />
          </div>
          <div className="wave-value" style={{ color: waveColor(state.wave) }}>{state.wave}</div>
        </div>
        <div>
          <div className="section-label">Wave Check</div>
          <div className="section-sub">{waveLabel(state.wave)}</div>
        </div>
      </div>
    );
  }

  const q = WAVE_QUESTIONS[step];
  return (
    <div className="wave-active glass">
      <div className="wave-step">{step + 1} / {WAVE_QUESTIONS.length}</div>
      <h3 className="wave-q">{q.q}</h3>
      <div className="wave-slider-wrap">
        <span className="wave-end">{q.low}</span>
        <input type="range" min="0" max="100" value={currentVal}
          onChange={e => setCurrentVal(Number(e.target.value))}
          className="wave-slider" />
        <span className="wave-end">{q.high}</span>
      </div>
      <div className="wave-current" style={{ color: waveColor(currentVal) }}>{currentVal}</div>
      <button className="btn-glow" onClick={next}>
        {step < WAVE_QUESTIONS.length - 1 ? '次へ' : '完了 +25XP'}
      </button>
    </div>
  );
}

/* ─── Affirmation ─── */
function Affirmation({ onXP }) {
  const [text, setText] = useState('');
  const [visible, setVisible] = useState(false);

  const show = () => {
    const a = AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)];
    setText(a);
    setVisible(true);
  };

  const accept = () => {
    onXP(10);
    setVisible(false);
  };

  if (visible) {
    return (
      <div className="affirmation-active glass">
        <div className="aff-glow-ring" />
        <p className="aff-text">{text}</p>
        <button className="btn-glass" onClick={accept}>受け入れる +10XP</button>
      </div>
    );
  }

  return (
    <div className="section-card glass aff-card" onClick={show}>
      <div className="aff-icon">◉</div>
      <div className="section-label">Affirmation</div>
      <div className="section-sub">今日のアファメーションを受け取る</div>
    </div>
  );
}

/* ─── Main App ─── */
export default function App() {
  const [state, setState] = useState(load);
  const [toast, setToast] = useState(null);
  const [levelUp, setLevelUp] = useState(null);
  const toastTimer = useRef(null);

  const handleXP = useCallback((amount) => {
    setState(prev => {
      const oldLevel = prev.level;
      const next = addXP(prev, amount);
      if (next.level > oldLevel) {
        setLevelUp(next.level);
      }
      return next;
    });
    setToast(amount);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1200);
  }, []);

  const xpPct = (state.xp / state.xpNext) * 100;

  return (
    <div className="app">
      <Particles />

      {/* Header */}
      <header className="header glass">
        <div className="h-left">
          <div className="h-title">Transurfing</div>
          <div className="h-subtitle">{getTitle(state.level)}</div>
        </div>
        <div className="h-right">
          {state.streak > 0 && <span className="streak-pill">🔥{state.streak}</span>}
          <div className="level-pill">Lv.{state.level}</div>
        </div>
      </header>

      {/* XP Bar */}
      <div className="xp-bar-wrap">
        <div className="xp-bar">
          <div className="xp-fill" style={{ width: `${xpPct}%` }} />
        </div>
        <span className="xp-label">{state.xp}/{state.xpNext}</span>
      </div>

      {/* Content */}
      <main className="main">
        <CardDraw onXP={handleXP} />
        <MindsetShift onXP={handleXP} />
        <WaveCheck onXP={handleXP} state={state} setState={setState} />

        <div className="section-header">Quick Reset</div>
        <QuickReset onXP={handleXP} />

        <Affirmation onXP={handleXP} />

        {/* Mini Stats */}
        <div className="stats-row glass">
          <div className="stat"><span className="stat-v">{state.totalActions}</span><span className="stat-l">Actions</span></div>
          <div className="stat"><span className="stat-v">{state.bestStreak}</span><span className="stat-l">Best Streak</span></div>
          <div className="stat"><span className="stat-v">{state.wave}</span><span className="stat-l">Wave</span></div>
          <div className="stat"><span className="stat-v">Lv.{state.level}</span><span className="stat-l">Level</span></div>
        </div>
      </main>

      <XPToast show={toast !== null} amount={toast} />
      <LevelUp level={levelUp} onDone={() => setLevelUp(null)} />
    </div>
  );
}
