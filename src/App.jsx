import { useState, useEffect, useRef, useCallback } from 'react';
import { DOORWAYS, DAILY_WISDOM, TEACHER_COLORS, TEACHER_LABELS } from './data/transurfingData';
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

/* ── Daily Wisdom ── */
function DailyWisdom({ onXP }) {
  const [accepted, setAccepted] = useState(false);
  const todayIdx = Math.floor(Date.now() / 86400000) % DAILY_WISDOM.length;
  const wisdom = DAILY_WISDOM[todayIdx];

  const accept = () => { if (!accepted) { onXP(5); setAccepted(true); } };

  return (
    <div className="daily-card glass" onClick={accept}>
      <p className="daily-text">{wisdom.text}</p>
      <div className="daily-footer">
        <TeacherTag teacher={wisdom.teacher} />
        {!accepted && <span className="daily-tap">tap +5XP</span>}
        {accepted && <span className="daily-done">✓</span>}
      </div>
    </div>
  );
}

/* ── Practice Screen ── */
function PracticeScreen({ doorway, onComplete, onBack }) {
  const initP = useRef(Math.floor(Math.random() * doorway.practices.length));
  const initW = useRef(Math.floor(Math.random() * doorway.words.length));
  const [pIdx, setPIdx] = useState(initP.current);
  const [wIdx, setWIdx] = useState(initW.current);
  const practice = doorway.practices[pIdx];
  const word = doorway.words[wIdx];

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
    const newW = (wIdx + 1) % doorway.words.length;
    setPIdx(newP);
    setWIdx(newW);
    setTimer(doorway.practices[newP].duration);
    setTimerDone(false);
  };

  const pct = practice.duration > 0
    ? Math.min(100, ((practice.duration - timer) / practice.duration) * 100)
    : 100;

  return (
    <div className="practice-screen" style={{ '--dc': doorway.color }}>
      <button className="back-btn" onClick={onBack}>← 戻る</button>

      <div className="practice-hero">
        <span className="hero-icon">{doorway.icon}</span>
        <h2 className="hero-name">{doorway.name}</h2>
        <p className="hero-desc">{doorway.desc}</p>
      </div>

      <div className="wisdom-card glass">
        <p className="wisdom-text">{word.text}</p>
        <TeacherTag teacher={word.teacher} />
      </div>

      <div className="guide-card glass">
        <span className="guide-label">{practice.name}</span>
        <p className="guide-text">{practice.guide}</p>
      </div>

      <div className="timer-area">
        <div className="timer-ring">
          <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
            <circle cx="50" cy="50" r="44" fill="none" stroke="var(--dc)" strokeWidth="3"
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

/* ── Main ── */
export default function App() {
  const [state, setState] = useState(load);
  const [activeDoorway, setActiveDoorway] = useState(null);
  const [toast, setToast] = useState(null);
  const [levelUp, setLevelUp] = useState(null);
  const tt = useRef(null);

  const showToast = useCallback((amount) => {
    setToast(amount);
    clearTimeout(tt.current);
    tt.current = setTimeout(() => setToast(null), 1200);
  }, []);

  const handleXP = useCallback((amount) => {
    setState(prev => {
      const old = prev.level;
      const next = addXP(prev, amount);
      if (next.level > old) setLevelUp(next.level);
      return next;
    });
    showToast(amount);
  }, [showToast]);

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
    setActiveDoorway(null);
  }, [showToast]);

  const xpPct = (state.xp / state.xpNext) * 100;
  const todayDone = state.todayDoorways || [];

  return (
    <div className="app">
      <Particles />

      {activeDoorway ? (
        <PracticeScreen
          doorway={activeDoorway}
          onComplete={(amount) => handleComplete(activeDoorway.id, amount)}
          onBack={() => setActiveDoorway(null)}
        />
      ) : (
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
            <DailyWisdom onXP={handleXP} />

            <p className="prompt">今、何が響く？</p>

            <div className="doorway-grid">
              {DOORWAYS.map(dw => (
                <button
                  key={dw.id}
                  className={`doorway-card glass ${todayDone.includes(dw.id) ? 'done' : ''}`}
                  onClick={() => setActiveDoorway(dw)}
                  style={{ '--dc': dw.color }}
                >
                  <span className="dw-icon">{dw.icon}</span>
                  <span className="dw-name">{dw.name}</span>
                  {todayDone.includes(dw.id) && <span className="dw-check">✓</span>}
                </button>
              ))}
            </div>

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
