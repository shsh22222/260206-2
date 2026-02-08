import { useState, useEffect, useRef, useCallback } from 'react';
import { DOORWAYS, WISDOM, TEACHER_COLORS, TEACHER_LABELS } from './data/transurfingData';
import { load, save, addXP, getTitle } from './store/gameStore';

/* ── Particles ── */
function Particles() {
  return (
    <div className="particles">{Array.from({ length: 14 }, (_, i) => (
      <div key={i} className="particle" style={{
        left: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 8}s`,
        animationDuration: `${6 + Math.random() * 8}s`,
        opacity: 0.1 + Math.random() * 0.15,
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

/* ── Practice Screen (FOCUSED) ── */
function PracticeScreen({ doorway, onComplete, onBack }) {
  const initP = useRef(Math.floor(Math.random() * doorway.practices.length));
  const [pIdx, setPIdx] = useState(initP.current);
  const practice = doorway.practices[pIdx];

  const [timer, setTimer] = useState(practice.duration);
  const [timerDone, setTimerDone] = useState(false);

  useEffect(() => {
    if (timerDone) return;
    if (timer <= 0) { setTimerDone(true); return; }
    const t = setTimeout(() => setTimer(v => v - 1), 1000);
    return () => clearTimeout(t);
  }, [timer, timerDone]);

  const shuffle = () => {
    const newP = (pIdx + 1) % doorway.practices.length;
    setPIdx(newP);
    setTimer(doorway.practices[newP].duration);
    setTimerDone(false);
  };

  const pct = practice.duration > 0
    ? Math.min(100, ((practice.duration - timer) / practice.duration) * 100)
    : 100;

  return (
    <div className="practice-screen" style={{ '--dc': doorway.color }}>
      <button className="back-btn" onClick={onBack}>← 戻る</button>

      <div className="practice-top">
        <span className="practice-top-icon">{doorway.icon}</span>
        <span className="practice-top-name">{doorway.name}</span>
      </div>

      <div className="practice-focus glass">
        <span className="pf-label">{practice.name}</span>
        <p className="pf-guide">{practice.guide}</p>
      </div>

      <div className="timer-area">
        <div className="timer-ring">
          <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="2.5" />
            <circle cx="50" cy="50" r="44" fill="none" stroke="var(--dc)" strokeWidth="2.5"
              strokeDasharray={`${pct * 2.764} 276.4`} strokeLinecap="round" transform="rotate(-90 50 50)" />
          </svg>
          <span className="timer-num">{timerDone ? '✓' : timer}</span>
        </div>
      </div>

      <div className="practice-btns">
        <button className="btn-shuffle" onClick={shuffle}>別のワーク</button>
        <button
          className={`btn-done ${timerDone ? 'glow' : ''}`}
          onClick={() => onComplete(15)}
        >
          {timerDone ? '完了 +15XP' : '完了する'}
        </button>
      </div>
    </div>
  );
}

/* ── Wisdom Screen ── */
function WisdomScreen({ wisdomSeen, onRead, onBack }) {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * WISDOM.length));
  const [fading, setFading] = useState(false);
  const wisdom = WISDOM[idx];
  const isNew = !wisdomSeen.includes(wisdom.id);

  const next = () => {
    setFading(true);
    setTimeout(() => {
      let newIdx;
      do { newIdx = Math.floor(Math.random() * WISDOM.length); } while (newIdx === idx && WISDOM.length > 1);
      setIdx(newIdx);
      const w = WISDOM[newIdx];
      if (!wisdomSeen.includes(w.id)) onRead(w.id, 3);
      setFading(false);
    }, 200);
  };

  const handleFirst = () => {
    if (isNew) onRead(wisdom.id, 3);
    next();
  };

  return (
    <div className="wisdom-screen">
      <div className="wisdom-top-bar">
        <button className="back-btn" onClick={onBack}>← 戻る</button>
        <span className="wisdom-count">{wisdomSeen.length}/{WISDOM.length}</span>
      </div>

      <div className="wisdom-hero">
        <span className="wisdom-hero-icon">✦</span>
        <h2 className="wisdom-hero-title">叡智</h2>
        <p className="wisdom-hero-sub">意識を深める言葉たち</p>
      </div>

      <div className={`wisdom-main glass ${fading ? 'fade-out' : 'fade-in'}`}>
        <p className="wm-text">{wisdom.text}</p>
        <TeacherTag teacher={wisdom.teacher} />
      </div>

      <button className="btn-next" onClick={handleFirst}>
        次のカード
      </button>
    </div>
  );
}

/* ── Main ── */
export default function App() {
  const [state, setState] = useState(load);
  const [view, setView] = useState('home');
  const [activeDoorway, setActiveDoorway] = useState(null);
  const [toast, setToast] = useState(null);
  const [levelUp, setLevelUp] = useState(null);
  const tt = useRef(null);

  const showToast = useCallback((amount) => {
    setToast(amount);
    clearTimeout(tt.current);
    tt.current = setTimeout(() => setToast(null), 1200);
  }, []);

  const handleComplete = useCallback((doorwayId, amount) => {
    setState(prev => {
      const old = prev.level;
      const next = addXP(prev, amount);
      if (next.level > old) setLevelUp(next.level);
      const s = {
        ...next,
        todayDoorways: (next.todayDoorways || []).includes(doorwayId)
          ? (next.todayDoorways || [])
          : [...(next.todayDoorways || []), doorwayId],
      };
      save(s);
      return s;
    });
    showToast(amount);
    setView('home');
    setActiveDoorway(null);
  }, [showToast]);

  const handleWisdomRead = useCallback((wisdomId, amount) => {
    setState(prev => {
      const seen = prev.wisdomSeen || [];
      if (seen.includes(wisdomId)) return prev;
      const old = prev.level;
      const next = addXP(prev, amount);
      if (next.level > old) setLevelUp(next.level);
      const s = { ...next, wisdomSeen: [...seen, wisdomId] };
      save(s);
      return s;
    });
    showToast(amount);
  }, [showToast]);

  const openDoorway = (dw) => { setActiveDoorway(dw); setView('practice'); };

  const xpPct = (state.xp / state.xpNext) * 100;
  const todayDone = state.todayDoorways || [];

  return (
    <div className="app">
      <Particles />

      {view === 'practice' && activeDoorway && (
        <PracticeScreen
          doorway={activeDoorway}
          onComplete={(amount) => handleComplete(activeDoorway.id, amount)}
          onBack={() => { setView('home'); setActiveDoorway(null); }}
        />
      )}

      {view === 'wisdom' && (
        <WisdomScreen
          wisdomSeen={state.wisdomSeen || []}
          onRead={handleWisdomRead}
          onBack={() => setView('home')}
        />
      )}

      {view === 'home' && (
        <>
          <header className="header glass">
            <div>
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
            <p className="prompt">今、何が響く？</p>

            <div className="doorway-grid">
              {DOORWAYS.map(dw => (
                <button
                  key={dw.id}
                  className={`doorway-card glass ${todayDone.includes(dw.id) ? 'done' : ''}`}
                  onClick={() => openDoorway(dw)}
                  style={{ '--dc': dw.color }}
                >
                  <span className="dw-icon">{dw.icon}</span>
                  <span className="dw-name">{dw.name}</span>
                  {todayDone.includes(dw.id) && <span className="dw-check">✓</span>}
                </button>
              ))}
            </div>

            <button className="wisdom-btn glass" onClick={() => setView('wisdom')}>
              <span className="wb-icon">✦</span>
              <span className="wb-label">叡智カードを引く</span>
              <span className="wb-count">{(state.wisdomSeen || []).length}/{WISDOM.length}</span>
            </button>

            <div className="stats glass">
              <div className="st"><span className="sv">{state.totalActions}</span><span className="sl">Actions</span></div>
              <div className="st"><span className="sv">{state.bestStreak}</span><span className="sl">Best</span></div>
              <div className="st"><span className="sv">{todayDone.length}</span><span className="sl">Today</span></div>
              <div className="st"><span className="sv">Lv.{state.level}</span><span className="sl">Level</span></div>
            </div>
          </main>
        </>
      )}

      <XPToast amount={toast} />
      <LevelUp level={levelUp} onDone={() => setLevelUp(null)} />
    </div>
  );
}
