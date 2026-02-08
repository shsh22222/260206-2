import { useState, useEffect, useRef, useCallback } from 'react';
import { DOORWAYS, WISDOM, TEACHER_COLORS, TEACHER_LABELS, DIAGNOSIS_QUESTIONS, CONSCIOUSNESS_TYPES } from './data/transurfingData';
import { load, save, addXP, getTitle } from './store/gameStore';

/* ── Particles ── */
function Particles() {
  return (
    <div className="particles">{Array.from({ length: 18 }, (_, i) => (
      <div key={i} className="particle" style={{
        left: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 10}s`,
        animationDuration: `${8 + Math.random() * 10}s`,
        opacity: 0.06 + Math.random() * 0.12,
        width: `${1.5 + Math.random() * 2.5}px`, height: `${1.5 + Math.random() * 2.5}px`,
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

/* ── Practice Screen (Auto-Advancing Steps) ── */
function PracticeScreen({ doorway, onComplete, onBack }) {
  const initP = useRef(Math.floor(Math.random() * doorway.practices.length));
  const [pIdx, setPIdx] = useState(initP.current);
  const practice = doorway.practices[pIdx];
  const steps = practice.steps;

  const [step, setStep] = useState(0);
  const [stepKey, setStepKey] = useState(0);
  const [secLeft, setSecLeft] = useState(steps[0].sec);
  const [allDone, setAllDone] = useState(false);
  const isLast = step >= steps.length - 1;

  useEffect(() => {
    if (allDone) return;
    if (secLeft <= 0) {
      if (isLast) {
        setAllDone(true);
      } else {
        const next = step + 1;
        setStep(next);
        setStepKey(k => k + 1);
        setSecLeft(steps[next].sec);
      }
      return;
    }
    const t = setTimeout(() => setSecLeft(v => v - 1), 1000);
    return () => clearTimeout(t);
  }, [secLeft, allDone, isLast, step, steps]);

  const shuffle = () => {
    const newP = (pIdx + 1) % doorway.practices.length;
    const newPractice = doorway.practices[newP];
    setPIdx(newP);
    setStep(0);
    setStepKey(k => k + 1);
    setSecLeft(newPractice.steps[0].sec);
    setAllDone(false);
  };

  const stepSec = steps[step].sec;
  const pct = stepSec > 0 ? Math.min(100, ((stepSec - secLeft) / stepSec) * 100) : 100;

  return (
    <div className="practice-screen" style={{ '--dc': doorway.color }}>
      <div className="ps-top-bar">
        <button className="back-btn" onClick={onBack}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <div className="step-dots">
          {steps.map((_, i) => (
            <span key={i} className={`step-dot ${i < step ? 'done' : ''} ${i === step ? 'active' : ''}`} />
          ))}
        </div>
        <button className="btn-shuffle-inline" onClick={shuffle} title="別のワーク">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>
        </button>
      </div>

      <div className="ps-header">
        <span className="ps-icon">{doorway.icon}</span>
        <span className="ps-name">{practice.name}</span>
        <span className="ps-source">{practice.source}</span>
      </div>

      <div className="step-area" key={stepKey}>
        <p className="step-text">{steps[step].text}</p>
      </div>

      <div className="ps-bottom">
        {!allDone && (
          <div className="step-timer-wrap">
            <div className="step-progress">
              <div className="step-progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="step-timer-num">{secLeft}</span>
          </div>
        )}

        {allDone && (
          <div className="ps-btns">
            <button className="btn-shuffle" onClick={shuffle}>別のワーク</button>
            <button className="btn-done glow" onClick={() => onComplete(15)}>
              完了 +15XP
            </button>
          </div>
        )}
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
    }, 250);
  };

  const handleFirst = () => {
    if (isNew) onRead(wisdom.id, 3);
    next();
  };

  return (
    <div className="wisdom-screen">
      <div className="wisdom-top-bar">
        <button className="back-btn" onClick={onBack}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
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
        次のカードを引く
      </button>
    </div>
  );
}

/* ── Diagnosis Screen ── */
function DiagnosisScreen({ onResult, onBack }) {
  const [qIdx, setQIdx] = useState(0);
  const [scores, setScores] = useState({});
  const [fadeKey, setFadeKey] = useState(0);
  const question = DIAGNOSIS_QUESTIONS[qIdx];

  const handleAnswer = (opt) => {
    const next = { ...scores };
    for (const [k, v] of Object.entries(opt.scores)) {
      next[k] = (next[k] || 0) + v;
    }
    setScores(next);

    if (qIdx < DIAGNOSIS_QUESTIONS.length - 1) {
      setQIdx(qIdx + 1);
      setFadeKey(k => k + 1);
    } else {
      // Calculate type
      const typeScores = CONSCIOUSNESS_TYPES.map(ct => {
        const total = ct.doorways.reduce((sum, dw) => sum + (next[dw] || 0), 0);
        return { type: ct, score: total };
      });
      typeScores.sort((a, b) => b.score - a.score);
      onResult(typeScores[0].type);
    }
  };

  return (
    <div className="diag-screen">
      <div className="diag-top-bar">
        <button className="back-btn" onClick={onBack}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <div className="diag-progress-dots">
          {DIAGNOSIS_QUESTIONS.map((_, i) => (
            <span key={i} className={`diag-dot ${i < qIdx ? 'done' : ''} ${i === qIdx ? 'active' : ''}`} />
          ))}
        </div>
        <span className="diag-num">{qIdx + 1}/{DIAGNOSIS_QUESTIONS.length}</span>
      </div>

      <div className="diag-body" key={fadeKey}>
        <p className="diag-q">{question.q}</p>
        <div className="diag-opts">
          {question.opts.map((opt, i) => (
            <button key={i} className="diag-opt glass" onClick={() => handleAnswer(opt)}>
              {opt.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Diagnosis Result Screen ── */
function DiagResultScreen({ type, onPractice, onBack }) {
  const doorways = type.doorways.map(id => DOORWAYS.find(d => d.id === id));

  return (
    <div className="diag-result-screen">
      <div className="diag-top-bar">
        <button className="back-btn" onClick={onBack}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
      </div>

      <div className="dr-hero" style={{ '--dc': type.color }}>
        <span className="dr-icon">{type.icon}</span>
        <h2 className="dr-name">{type.name}</h2>
        <p className="dr-desc">{type.desc}</p>
      </div>

      <div className="dr-section">
        <p className="dr-label">おすすめのワーク</p>
        <div className="dr-doorways">
          {doorways.map(dw => (
            <button key={dw.id} className="dr-dw glass" style={{ '--dc': dw.color }} onClick={() => onPractice(dw)}>
              <span className="dr-dw-icon">{dw.icon}</span>
              <div className="dr-dw-info">
                <span className="dr-dw-name">{dw.name}</span>
                <span className="dr-dw-desc">{dw.desc}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <button className="btn-diag-retry" onClick={onBack}>もう一度診断する</button>
    </div>
  );
}

/* ── Main ── */
export default function App() {
  const [state, setState] = useState(load);
  const [view, setView] = useState('home');
  const [activeDoorway, setActiveDoorway] = useState(null);
  const [diagResult, setDiagResult] = useState(null);
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
          onBack={() => { setView(diagResult ? 'diagresult' : 'home'); setActiveDoorway(null); }}
        />
      )}

      {view === 'wisdom' && (
        <WisdomScreen
          wisdomSeen={state.wisdomSeen || []}
          onRead={handleWisdomRead}
          onBack={() => setView('home')}
        />
      )}

      {view === 'diagnosis' && (
        <DiagnosisScreen
          onResult={(type) => { setDiagResult(type); setView('diagresult'); }}
          onBack={() => setView('home')}
        />
      )}

      {view === 'diagresult' && diagResult && (
        <DiagResultScreen
          type={diagResult}
          onPractice={(dw) => openDoorway(dw)}
          onBack={() => { setDiagResult(null); setView('diagnosis'); }}
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
              {state.streak > 0 && <span className="streak">🔥 {state.streak}</span>}
              <span className="lvl">Lv.{state.level}</span>
            </div>
          </header>

          <div className="xp-wrap">
            <div className="xp-track"><div className="xp-fill" style={{ width: `${xpPct}%` }} /></div>
            <span className="xp-num">{state.xp}/{state.xpNext} XP</span>
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
                  <span className="dw-desc">{dw.desc}</span>
                  {todayDone.includes(dw.id) && <span className="dw-check">✓</span>}
                </button>
              ))}
            </div>

            <button className="wisdom-btn glass" onClick={() => setView('wisdom')}>
              <span className="wb-icon">✦</span>
              <span className="wb-label">叡智カードを引く</span>
              <span className="wb-count">{(state.wisdomSeen || []).length}/{WISDOM.length}</span>
            </button>

            <button className="diag-btn glass" onClick={() => setView('diagnosis')}>
              <span className="db-icon">🔮</span>
              <div className="db-text">
                <span className="db-label">意識タイプ診断</span>
                <span className="db-sub">5つの質問で、今のあなたに最適なワークを見つける</span>
              </div>
            </button>

            <div className="stats glass">
              <div className="st"><span className="sv">{state.totalActions}</span><span className="sl">実践</span></div>
              <div className="st"><span className="sv">{state.bestStreak}</span><span className="sl">最長</span></div>
              <div className="st"><span className="sv">{todayDone.length}</span><span className="sl">今日</span></div>
              <div className="st"><span className="sv">Lv.{state.level}</span><span className="sl">レベル</span></div>
            </div>
          </main>
        </>
      )}

      <XPToast amount={toast} />
      <LevelUp level={levelUp} onDone={() => setLevelUp(null)} />
    </div>
  );
}
