import { useState, useEffect, useRef, useCallback } from 'react';
import { DOORWAYS, WISDOM, TEACHER_COLORS, TEACHER_LABELS, DIAGNOSIS_QUESTIONS, CONSCIOUSNESS_TYPES, GAMES, PENDULUM_WORDS, PRESENT_WORDS, EMOTION_ITEMS } from './data/transurfingData';
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

const BackBtn = ({ onClick }) => (
  <button className="back-btn" onClick={onClick}>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
  </button>
);

/* ── Practice Screen (Timer + Tap to Advance) ── */
function PracticeScreen({ doorway, onComplete, onBack }) {
  const initP = useRef(Math.floor(Math.random() * doorway.practices.length));
  const [pIdx, setPIdx] = useState(initP.current);
  const practice = doorway.practices[pIdx];
  const steps = practice.steps;

  const [step, setStep] = useState(0);
  const [stepKey, setStepKey] = useState(0);
  const [secLeft, setSecLeft] = useState(steps[0].sec);
  const [stepReady, setStepReady] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const isLast = step >= steps.length - 1;

  useEffect(() => {
    if (allDone || stepReady) return;
    if (secLeft <= 0) {
      setStepReady(true);
      return;
    }
    const t = setTimeout(() => setSecLeft(v => v - 1), 1000);
    return () => clearTimeout(t);
  }, [secLeft, allDone, stepReady]);

  const advanceStep = () => {
    if (!stepReady) return;
    if (isLast) {
      setAllDone(true);
    } else {
      const next = step + 1;
      setStep(next);
      setStepKey(k => k + 1);
      setSecLeft(steps[next].sec);
      setStepReady(false);
    }
  };

  const shuffle = () => {
    const newP = (pIdx + 1) % doorway.practices.length;
    const newPractice = doorway.practices[newP];
    setPIdx(newP);
    setStep(0);
    setStepKey(k => k + 1);
    setSecLeft(newPractice.steps[0].sec);
    setStepReady(false);
    setAllDone(false);
  };

  const stepSec = steps[step].sec;
  const pct = stepSec > 0 ? Math.min(100, ((stepSec - secLeft) / stepSec) * 100) : 100;

  return (
    <div className="practice-screen" style={{ '--dc': doorway.color }}>
      <div className="ps-top-bar">
        <BackBtn onClick={onBack} />
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

      <div className={`step-area ${stepReady ? 'step-ready' : ''}`} key={stepKey} onClick={advanceStep}>
        <p className="step-text">{steps[step].text}</p>
        {stepReady && !allDone && (
          <div className="tap-prompt">
            <span className="tap-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 18v-6M8 14l4 4 4-4"/><circle cx="12" cy="6" r="2"/></svg>
            </span>
            <span className="tap-text">タップして次へ</span>
          </div>
        )}
      </div>

      <div className="ps-bottom">
        {!allDone && !stepReady && (
          <div className="step-timer-wrap">
            <div className="step-progress">
              <div className="step-progress-fill" style={{ width: `${pct}%` }} />
            </div>
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
        <BackBtn onClick={onBack} />
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
        <BackBtn onClick={onBack} />
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
        <BackBtn onClick={onBack} />
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

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/* ━━ GAME COMPONENTS ━━ */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

/* ── Game 1: Thought Stop ── */
function ThoughtStopGame({ onComplete, onBack }) {
  const [phase, setPhase] = useState('ready');
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(null);
  const animRef = useRef(null);
  const [best, setBest] = useState(() => parseFloat(localStorage.getItem('aos_ts_best') || '0'));

  const tick = useCallback(() => {
    setElapsed((Date.now() - startRef.current) / 1000);
    animRef.current = requestAnimationFrame(tick);
  }, []);

  const start = () => {
    startRef.current = Date.now();
    setElapsed(0);
    setPhase('playing');
    animRef.current = requestAnimationFrame(tick);
  };

  const stop = () => {
    cancelAnimationFrame(animRef.current);
    const t = (Date.now() - startRef.current) / 1000;
    setElapsed(t);
    if (t > best) {
      setBest(t);
      localStorage.setItem('aos_ts_best', t.toFixed(1));
    }
    setPhase('result');
  };

  useEffect(() => () => cancelAnimationFrame(animRef.current), []);

  return (
    <div className="game-screen" style={{ '--gc': '#8b5cf6' }}>
      <div className="gs-top"><BackBtn onClick={onBack} /><span className="gs-badge">🧠 思考ストップ</span></div>
      <div className="gs-body">
        {phase === 'ready' && (
          <div className="gs-center">
            <span className="gs-big-icon">🧠</span>
            <h2 className="gs-title">思考ストップ</h2>
            <p className="gs-desc">目を閉じて、思考を止めてみよう。<br/>何か考えが浮かんだらタップ。</p>
            <button className="gs-start-btn" onClick={start}>スタート</button>
          </div>
        )}
        {phase === 'playing' && (
          <div className="gs-center gs-play-area" onClick={stop}>
            <span className="gs-timer-big">{elapsed.toFixed(1)}</span>
            <span className="gs-timer-unit">秒</span>
            <p className="gs-hint">思考が浮かんだらタップ</p>
          </div>
        )}
        {phase === 'result' && (
          <div className="gs-center">
            <span className="gs-result-num">{elapsed.toFixed(1)}<small>秒</small></span>
            <span className="gs-best-label">ベスト: {best.toFixed(1)}秒</span>
            {elapsed >= 10 && <p className="gs-msg">素晴らしい集中力!</p>}
            {elapsed >= 5 && elapsed < 10 && <p className="gs-msg">良い感じ!</p>}
            {elapsed < 5 && <p className="gs-msg">練習あるのみ!</p>}
            <div className="gs-btns">
              <button className="btn-shuffle" onClick={start}>もう一度</button>
              <button className="btn-done glow" onClick={() => onComplete(10)}>完了 +10XP</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Game 2: Reflex ── */
function ReflexGame({ onComplete, onBack }) {
  const [phase, setPhase] = useState('ready'); // ready, waiting, go, result, done
  const [round, setRound] = useState(0);
  const [times, setTimes] = useState([]);
  const [reactionTime, setReactionTime] = useState(0);
  const startRef = useRef(null);
  const timerRef = useRef(null);
  const TOTAL_ROUNDS = 5;

  const startRound = () => {
    setPhase('waiting');
    const delay = 2000 + Math.random() * 4000;
    timerRef.current = setTimeout(() => {
      startRef.current = Date.now();
      setPhase('go');
    }, delay);
  };

  const handleTap = () => {
    if (phase === 'waiting') {
      clearTimeout(timerRef.current);
      setPhase('result');
      setReactionTime(-1); // too early
    } else if (phase === 'go') {
      const t = Date.now() - startRef.current;
      setReactionTime(t);
      setTimes(prev => [...prev, t]);
      setPhase('result');
    }
  };

  const nextRound = () => {
    const nr = round + 1;
    setRound(nr);
    if (nr >= TOTAL_ROUNDS) {
      setPhase('done');
    } else {
      startRound();
    }
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const avg = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;

  return (
    <div className="game-screen" style={{ '--gc': '#f59e0b' }}>
      <div className="gs-top"><BackBtn onClick={onBack} /><span className="gs-badge">⚡ 意識リフレックス</span></div>
      <div className="gs-body">
        {phase === 'ready' && (
          <div className="gs-center">
            <span className="gs-big-icon">⚡</span>
            <h2 className="gs-title">意識リフレックス</h2>
            <p className="gs-desc">画面が光ったら即タップ!<br/>{TOTAL_ROUNDS}ラウンドの平均反応速度を測定。</p>
            <button className="gs-start-btn" onClick={startRound}>スタート</button>
          </div>
        )}
        {phase === 'waiting' && (
          <div className="gs-center gs-play-area gs-dark" onClick={handleTap}>
            <p className="gs-wait-text">待って…</p>
            <span className="gs-round-num">{round + 1}/{TOTAL_ROUNDS}</span>
          </div>
        )}
        {phase === 'go' && (
          <div className="gs-center gs-play-area gs-flash" onClick={handleTap}>
            <p className="gs-go-text">タップ!</p>
          </div>
        )}
        {phase === 'result' && (
          <div className="gs-center">
            {reactionTime === -1 ? (
              <p className="gs-msg gs-early">早すぎた!</p>
            ) : (
              <span className="gs-result-num">{reactionTime}<small>ms</small></span>
            )}
            <button className="gs-start-btn" onClick={nextRound}>
              {round + 1 >= TOTAL_ROUNDS ? '結果を見る' : '次のラウンド'}
            </button>
          </div>
        )}
        {phase === 'done' && (
          <div className="gs-center">
            <span className="gs-result-num">{avg}<small>ms</small></span>
            <span className="gs-best-label">平均反応速度</span>
            {avg > 0 && avg < 250 && <p className="gs-msg">超高速!</p>}
            {avg >= 250 && avg < 400 && <p className="gs-msg">良い反射神経!</p>}
            {avg >= 400 && <p className="gs-msg">もっと研ぎ澄ませよう!</p>}
            <div className="gs-btns">
              <button className="btn-shuffle" onClick={() => { setRound(0); setTimes([]); setPhase('ready'); }}>もう一度</button>
              <button className="btn-done glow" onClick={() => onComplete(10)}>完了 +10XP</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Game 3: Breath Surf ── */
function BreathSurfGame({ onComplete, onBack }) {
  const [phase, setPhase] = useState('ready');
  const [cycle, setCycle] = useState(0);
  const [breathPhase, setBreathPhase] = useState('in'); // in, out
  const [score, setScore] = useState(0);
  const [tapFeedback, setTapFeedback] = useState(null);
  const progressRef = useRef(0);
  const animRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const TOTAL_CYCLES = 4;
  const BREATH_DURATION = 5000; // 5s per phase
  const startTimeRef = useRef(null);

  const startGame = () => {
    setPhase('playing');
    setCycle(0);
    setBreathPhase('in');
    setScore(0);
    startTimeRef.current = Date.now();
    animate();
  };

  const animate = () => {
    const elapsed = Date.now() - startTimeRef.current;
    const totalPhaseTime = BREATH_DURATION;
    const totalCycleTime = totalPhaseTime * 2;
    const totalGameTime = totalCycleTime * TOTAL_CYCLES;

    if (elapsed >= totalGameTime) {
      setPhase('done');
      return;
    }

    const currentCycle = Math.floor(elapsed / totalCycleTime);
    const cycleElapsed = elapsed % totalCycleTime;
    const isInhale = cycleElapsed < totalPhaseTime;
    const phaseProgress = (cycleElapsed % totalPhaseTime) / totalPhaseTime;

    setCycle(currentCycle);
    setBreathPhase(isInhale ? 'in' : 'out');
    progressRef.current = isInhale ? phaseProgress : 1 - phaseProgress;
    setProgress(progressRef.current);

    animRef.current = requestAnimationFrame(animate);
  };

  const handleTap = () => {
    if (phase !== 'playing') return;
    const p = progressRef.current;
    // Good tap: near peak (>0.85) or near trough (<0.15)
    if (p > 0.85 || p < 0.15) {
      setScore(s => s + 100);
      setTapFeedback('perfect');
    } else if (p > 0.7 || p < 0.3) {
      setScore(s => s + 50);
      setTapFeedback('good');
    } else {
      setTapFeedback('miss');
    }
    setTimeout(() => setTapFeedback(null), 400);
  };

  useEffect(() => () => cancelAnimationFrame(animRef.current), []);

  const circleScale = 0.4 + progress * 0.6;

  return (
    <div className="game-screen" style={{ '--gc': '#06b6d4' }}>
      <div className="gs-top"><BackBtn onClick={onBack} /><span className="gs-badge">🫁 呼吸サーフ</span></div>
      <div className="gs-body">
        {phase === 'ready' && (
          <div className="gs-center">
            <span className="gs-big-icon">🫁</span>
            <h2 className="gs-title">呼吸サーフ</h2>
            <p className="gs-desc">円の動きに合わせて呼吸しよう。<br/>ピーク(最大・最小)でタップ!</p>
            <button className="gs-start-btn" onClick={startGame}>スタート</button>
          </div>
        )}
        {phase === 'playing' && (
          <div className="gs-center gs-play-area" onClick={handleTap}>
            <div className="breath-circle" style={{ transform: `scale(${circleScale})` }} />
            <span className="breath-label">{breathPhase === 'in' ? '吸う' : '吐く'}</span>
            <span className="breath-score">スコア: {score}</span>
            {tapFeedback && <span className={`tap-feedback ${tapFeedback}`}>
              {tapFeedback === 'perfect' ? 'Perfect!' : tapFeedback === 'good' ? 'Good!' : 'Miss'}
            </span>}
            <span className="gs-round-num">{cycle + 1}/{TOTAL_CYCLES}</span>
          </div>
        )}
        {phase === 'done' && (
          <div className="gs-center">
            <span className="gs-result-num">{score}<small>pt</small></span>
            <span className="gs-best-label">呼吸スコア</span>
            <div className="gs-btns">
              <button className="btn-shuffle" onClick={() => { setPhase('ready'); cancelAnimationFrame(animRef.current); }}>もう一度</button>
              <button className="btn-done glow" onClick={() => onComplete(10)}>完了 +10XP</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Game 4: Pendulum Shooter ── */
function PendulumShooterGame({ onComplete, onBack }) {
  const [phase, setPhase] = useState('ready');
  const [bubbles, setBubbles] = useState([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const idRef = useRef(0);
  const intervalRef = useRef(null);
  const timerRef = useRef(null);

  const startGame = () => {
    setPhase('playing');
    setScore(0);
    setTimeLeft(30);
    setHits(0);
    setMisses(0);
    setBubbles([]);
    idRef.current = 0;

    intervalRef.current = setInterval(() => {
      const isNeg = Math.random() > 0.25;
      const words = isNeg ? PENDULUM_WORDS.negative : PENDULUM_WORDS.positive;
      const word = words[Math.floor(Math.random() * words.length)];
      const top = 15 + Math.random() * 65;
      const fromLeft = Math.random() > 0.5;
      const id = ++idRef.current;
      setBubbles(prev => [...prev, { id, word, isNeg, top, fromLeft, hit: false }]);
      setTimeout(() => {
        setBubbles(prev => prev.filter(b => b.id !== id));
      }, 3500);
    }, 900);

    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(intervalRef.current);
          clearInterval(timerRef.current);
          setPhase('done');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const tapBubble = (bubble) => {
    if (bubble.hit) return;
    setBubbles(prev => prev.map(b => b.id === bubble.id ? { ...b, hit: true } : b));
    if (bubble.isNeg) {
      setScore(s => s + 10);
      setHits(h => h + 1);
    } else {
      setScore(s => s - 5);
      setMisses(m => m + 1);
    }
  };

  useEffect(() => () => {
    clearInterval(intervalRef.current);
    clearInterval(timerRef.current);
  }, []);

  return (
    <div className="game-screen" style={{ '--gc': '#ef4444' }}>
      <div className="gs-top"><BackBtn onClick={onBack} /><span className="gs-badge">🎯 振り子シューター</span></div>
      <div className="gs-body">
        {phase === 'ready' && (
          <div className="gs-center">
            <span className="gs-big-icon">🎯</span>
            <h2 className="gs-title">振り子シューター</h2>
            <p className="gs-desc">ネガティブな思考をタップで撃ち落とせ!<br/>ポジティブな言葉は撃たないで!</p>
            <button className="gs-start-btn" onClick={startGame}>スタート</button>
          </div>
        )}
        {phase === 'playing' && (
          <div className="gs-play-field">
            <div className="pend-hud">
              <span className="pend-score">{score}pt</span>
              <span className="pend-time">{timeLeft}s</span>
            </div>
            <div className="pend-arena">
              {bubbles.map(b => (
                <div
                  key={b.id}
                  className={`pend-bubble ${b.isNeg ? 'neg' : 'pos'} ${b.fromLeft ? 'from-left' : 'from-right'} ${b.hit ? 'hit' : ''}`}
                  style={{ top: `${b.top}%` }}
                  onClick={() => tapBubble(b)}
                >
                  {b.word}
                </div>
              ))}
            </div>
          </div>
        )}
        {phase === 'done' && (
          <div className="gs-center">
            <span className="gs-result-num">{score}<small>pt</small></span>
            <span className="gs-best-label">撃墜: {hits} / 誤射: {misses}</span>
            <div className="gs-btns">
              <button className="btn-shuffle" onClick={startGame}>もう一度</button>
              <button className="btn-done glow" onClick={() => onComplete(10)}>完了 +10XP</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Game 5: Present Tap ── */
function PresentTapGame({ onComplete, onBack }) {
  const [phase, setPhase] = useState('ready');
  const [currentWord, setCurrentWord] = useState(null);
  const [isPresent, setIsPresent] = useState(false);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const timerRef = useRef(null);
  const wordTimerRef = useRef(null);

  const showNextWord = () => {
    const isPresentWord = Math.random() > 0.45;
    const pool = isPresentWord ? PRESENT_WORDS.present : PRESENT_WORDS.notPresent;
    const word = pool[Math.floor(Math.random() * pool.length)];
    setCurrentWord(word);
    setIsPresent(isPresentWord);
    setTotal(t => t + 1);

    wordTimerRef.current = setTimeout(() => {
      if (!isPresentWord) setScore(s => s + 1); // Correctly ignored
      showNextWord();
    }, 2000);
  };

  const startGame = () => {
    setPhase('playing');
    setScore(0);
    setTotal(0);
    setTimeLeft(30);
    showNextWord();

    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          clearTimeout(wordTimerRef.current);
          setPhase('done');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const handleTap = () => {
    if (phase !== 'playing') return;
    clearTimeout(wordTimerRef.current);
    if (isPresent) {
      setScore(s => s + 2);
      setFeedback('correct');
    } else {
      setScore(s => Math.max(0, s - 1));
      setFeedback('wrong');
    }
    setTimeout(() => setFeedback(null), 300);
    showNextWord();
  };

  useEffect(() => () => {
    clearInterval(timerRef.current);
    clearTimeout(wordTimerRef.current);
  }, []);

  return (
    <div className="game-screen" style={{ '--gc': '#ec4899' }}>
      <div className="gs-top"><BackBtn onClick={onBack} /><span className="gs-badge">✨ 今ここタップ</span></div>
      <div className="gs-body">
        {phase === 'ready' && (
          <div className="gs-center">
            <span className="gs-big-icon">✨</span>
            <h2 className="gs-title">今ここタップ</h2>
            <p className="gs-desc">「今この瞬間」に関する言葉だけタップ!<br/>過去や未来の言葉はスルー!</p>
            <button className="gs-start-btn" onClick={startGame}>スタート</button>
          </div>
        )}
        {phase === 'playing' && (
          <div className="gs-center gs-play-area" onClick={handleTap}>
            <span className="pend-time" style={{ position: 'absolute', top: 16, right: 16 }}>{timeLeft}s</span>
            <span className="present-word">{currentWord}</span>
            <span className="present-score">スコア: {score}</span>
            {feedback && <span className={`tap-feedback ${feedback === 'correct' ? 'perfect' : 'miss'}`}>
              {feedback === 'correct' ? '今ここ!' : '過去/未来!'}
            </span>}
            <p className="gs-hint">「今」の言葉をタップ</p>
          </div>
        )}
        {phase === 'done' && (
          <div className="gs-center">
            <span className="gs-result-num">{score}<small>pt</small></span>
            <span className="gs-best-label">今ここ度</span>
            <div className="gs-btns">
              <button className="btn-shuffle" onClick={() => setPhase('ready')}>もう一度</button>
              <button className="btn-done glow" onClick={() => onComplete(10)}>完了 +10XP</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Game 6: Focus Trainer ── */
function FocusGame({ onComplete, onBack }) {
  const [phase, setPhase] = useState('ready');
  const [round, setRound] = useState(0);
  const [isGreen, setIsGreen] = useState(true);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [showDot, setShowDot] = useState(false);
  const timerRef = useRef(null);
  const TOTAL_ROUNDS = 20;

  const showNextDot = (r) => {
    if (r >= TOTAL_ROUNDS) {
      setPhase('done');
      return;
    }
    setShowDot(false);
    const delay = 500 + Math.random() * 1500;
    timerRef.current = setTimeout(() => {
      const green = Math.random() > 0.35;
      setIsGreen(green);
      setShowDot(true);
      setRound(r);
      // Auto-advance if not tapped within 1.5s
      timerRef.current = setTimeout(() => {
        if (!green) setScore(s => s + 1); // Correctly ignored red
        setTotal(t => t + 1);
        showNextDot(r + 1);
      }, 1500);
    }, delay);
  };

  const startGame = () => {
    setPhase('playing');
    setScore(0);
    setTotal(0);
    setRound(0);
    showNextDot(0);
  };

  const handleTap = () => {
    if (phase !== 'playing' || !showDot) return;
    clearTimeout(timerRef.current);
    setTotal(t => t + 1);
    if (isGreen) {
      setScore(s => s + 1);
      setFeedback('correct');
    } else {
      setScore(s => Math.max(0, s - 1));
      setFeedback('wrong');
    }
    setTimeout(() => setFeedback(null), 300);
    showNextDot(round + 1);
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <div className="game-screen" style={{ '--gc': '#4ade80' }}>
      <div className="gs-top"><BackBtn onClick={onBack} /><span className="gs-badge">🔮 集中トレーナー</span></div>
      <div className="gs-body">
        {phase === 'ready' && (
          <div className="gs-center">
            <span className="gs-big-icon">🔮</span>
            <h2 className="gs-title">集中トレーナー</h2>
            <p className="gs-desc">緑の光が出たらタップ!<br/>赤はタップしないで! {TOTAL_ROUNDS}ラウンド。</p>
            <button className="gs-start-btn" onClick={startGame}>スタート</button>
          </div>
        )}
        {phase === 'playing' && (
          <div className="gs-center gs-play-area" onClick={handleTap}>
            <span className="gs-round-num">{round + 1}/{TOTAL_ROUNDS}</span>
            {showDot && <div className={`focus-dot ${isGreen ? 'green' : 'red'}`} />}
            {!showDot && <div className="focus-dot dim" />}
            {feedback && <span className={`tap-feedback ${feedback === 'correct' ? 'perfect' : 'miss'}`}>
              {feedback === 'correct' ? '正解!' : '違う!'}
            </span>}
            <span className="breath-score">スコア: {score}</span>
          </div>
        )}
        {phase === 'done' && (
          <div className="gs-center">
            <span className="gs-result-num">{Math.round((score / Math.max(1, total)) * 100)}<small>%</small></span>
            <span className="gs-best-label">集中力スコア ({score}/{total})</span>
            <div className="gs-btns">
              <button className="btn-shuffle" onClick={() => setPhase('ready')}>もう一度</button>
              <button className="btn-done glow" onClick={() => onComplete(10)}>完了 +10XP</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Game 7: Zen Count ── */
function ZenCountGame({ onComplete, onBack }) {
  const [phase, setPhase] = useState('ready');
  const [count, setCount] = useState(0);
  const [intervals, setIntervals] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [rounds, setRounds] = useState(0);
  const lastTapRef = useRef(null);
  const TARGET_INTERVAL = 5000; // 5 seconds between taps
  const TARGET_COUNT = 10;
  const MAX_ROUNDS = 3;

  const startGame = () => {
    setPhase('playing');
    setCount(0);
    setIntervals([]);
    setRounds(0);
    lastTapRef.current = null;
  };

  const handleTap = () => {
    if (phase !== 'playing') return;
    const now = Date.now();
    const newCount = count + 1;
    setCount(newCount);

    if (lastTapRef.current) {
      const interval = now - lastTapRef.current;
      const diff = Math.abs(interval - TARGET_INTERVAL);
      setIntervals(prev => [...prev, diff]);
      if (diff < 500) setFeedback('perfect');
      else if (diff < 1200) setFeedback('good');
      else setFeedback('miss');
      setTimeout(() => setFeedback(null), 400);
    }
    lastTapRef.current = now;

    if (newCount >= TARGET_COUNT) {
      const newRounds = rounds + 1;
      setRounds(newRounds);
      if (newRounds >= MAX_ROUNDS) {
        setPhase('done');
      } else {
        setCount(0);
        lastTapRef.current = null;
        setFeedback(null);
      }
    }
  };

  const avgDiff = intervals.length > 0
    ? Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length)
    : 0;
  const accuracy = Math.max(0, Math.round(100 - (avgDiff / TARGET_INTERVAL) * 100));

  return (
    <div className="game-screen" style={{ '--gc': '#6366f1' }}>
      <div className="gs-top"><BackBtn onClick={onBack} /><span className="gs-badge">🔢 禅カウント</span></div>
      <div className="gs-body">
        {phase === 'ready' && (
          <div className="gs-center">
            <span className="gs-big-icon">🔢</span>
            <h2 className="gs-title">禅カウント</h2>
            <p className="gs-desc">呼吸に合わせて1から10まで数えよう。<br/>5秒間隔でタップ。{MAX_ROUNDS}ラウンド。</p>
            <button className="gs-start-btn" onClick={startGame}>スタート</button>
          </div>
        )}
        {phase === 'playing' && (
          <div className="gs-center gs-play-area" onClick={handleTap}>
            <span className="zen-count-num">{count}</span>
            <span className="zen-count-label">/ {TARGET_COUNT}</span>
            <span className="gs-round-num">ラウンド {rounds + 1}/{MAX_ROUNDS}</span>
            {feedback && <span className={`tap-feedback ${feedback}`}>
              {feedback === 'perfect' ? 'Perfect!' : feedback === 'good' ? 'Good!' : 'Off Beat'}
            </span>}
            <p className="gs-hint">5秒ごとにタップ</p>
          </div>
        )}
        {phase === 'done' && (
          <div className="gs-center">
            <span className="gs-result-num">{accuracy}<small>%</small></span>
            <span className="gs-best-label">リズム精度</span>
            {accuracy >= 80 && <p className="gs-msg">素晴らしいリズム感!</p>}
            {accuracy >= 50 && accuracy < 80 && <p className="gs-msg">良いリズム!</p>}
            {accuracy < 50 && <p className="gs-msg">呼吸を意識して!</p>}
            <div className="gs-btns">
              <button className="btn-shuffle" onClick={() => setPhase('ready')}>もう一度</button>
              <button className="btn-done glow" onClick={() => onComplete(10)}>完了 +10XP</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Game 8: Emotion Catch ── */
function EmotionCatchGame({ onComplete, onBack }) {
  const [phase, setPhase] = useState('ready');
  const [items, setItems] = useState([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [feedback, setFeedback] = useState(null);
  const idRef = useRef(0);
  const intervalRef = useRef(null);
  const timerRef = useRef(null);

  const startGame = () => {
    setPhase('playing');
    setScore(0);
    setTimeLeft(30);
    setItems([]);
    idRef.current = 0;

    intervalRef.current = setInterval(() => {
      const isAccept = Math.random() > 0.45;
      const pool = isAccept ? EMOTION_ITEMS.accept : EMOTION_ITEMS.resist;
      const word = pool[Math.floor(Math.random() * pool.length)];
      const left = 10 + Math.random() * 70;
      const id = ++idRef.current;
      setItems(prev => [...prev, { id, word, isAccept, left, tapped: false }]);
      setTimeout(() => {
        setItems(prev => prev.filter(i => i.id !== id));
      }, 3000);
    }, 800);

    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(intervalRef.current);
          clearInterval(timerRef.current);
          setPhase('done');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const tapItem = (item) => {
    if (item.tapped) return;
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, tapped: true } : i));
    if (item.isAccept) {
      setScore(s => s + 10);
      setFeedback('correct');
    } else {
      setScore(s => Math.max(0, s - 5));
      setFeedback('wrong');
    }
    setTimeout(() => setFeedback(null), 300);
  };

  useEffect(() => () => {
    clearInterval(intervalRef.current);
    clearInterval(timerRef.current);
  }, []);

  return (
    <div className="game-screen" style={{ '--gc': '#22d3ee' }}>
      <div className="gs-top"><BackBtn onClick={onBack} /><span className="gs-badge">🎪 感情キャッチ</span></div>
      <div className="gs-body">
        {phase === 'ready' && (
          <div className="gs-center">
            <span className="gs-big-icon">🎪</span>
            <h2 className="gs-title">感情キャッチ</h2>
            <p className="gs-desc">ポジティブな感情をキャッチ!<br/>ネガティブな感情はスルーして!</p>
            <button className="gs-start-btn" onClick={startGame}>スタート</button>
          </div>
        )}
        {phase === 'playing' && (
          <div className="gs-play-field">
            <div className="pend-hud">
              <span className="pend-score">{score}pt</span>
              <span className="pend-time">{timeLeft}s</span>
            </div>
            <div className="pend-arena emotion-arena">
              {items.map(item => (
                <div
                  key={item.id}
                  className={`emotion-item ${item.isAccept ? 'accept' : 'resist'} ${item.tapped ? 'caught' : ''}`}
                  style={{ left: `${item.left}%` }}
                  onClick={() => tapItem(item)}
                >
                  {item.word}
                </div>
              ))}
            </div>
            {feedback && <span className={`tap-feedback tap-feedback-fixed ${feedback === 'correct' ? 'perfect' : 'miss'}`}>
              {feedback === 'correct' ? 'キャッチ!' : '抵抗!'}
            </span>}
          </div>
        )}
        {phase === 'done' && (
          <div className="gs-center">
            <span className="gs-result-num">{score}<small>pt</small></span>
            <span className="gs-best-label">感情スコア</span>
            <div className="gs-btns">
              <button className="btn-shuffle" onClick={() => setPhase('ready')}>もう一度</button>
              <button className="btn-done glow" onClick={() => onComplete(10)}>完了 +10XP</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Game Router ── */
const GAME_COMPONENTS = {
  'thought-stop': ThoughtStopGame,
  'reflex': ReflexGame,
  'breath-surf': BreathSurfGame,
  'pendulum': PendulumShooterGame,
  'present-tap': PresentTapGame,
  'focus': FocusGame,
  'zen-count': ZenCountGame,
  'emotion-catch': EmotionCatchGame,
};

/* ── Main ── */
export default function App() {
  const [state, setState] = useState(load);
  const [view, setView] = useState('home');
  const [activeDoorway, setActiveDoorway] = useState(null);
  const [activeGame, setActiveGame] = useState(null);
  const [diagResult, setDiagResult] = useState(null);
  const [toast, setToast] = useState(null);
  const [levelUp, setLevelUp] = useState(null);
  const [homeMode, setHomeMode] = useState('work'); // work | game
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

  const handleGameComplete = useCallback((amount) => {
    setState(prev => {
      const old = prev.level;
      const next = addXP(prev, amount);
      if (next.level > old) setLevelUp(next.level);
      save(next);
      return next;
    });
    showToast(amount);
    setView('home');
    setActiveGame(null);
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
  const openGame = (game) => { setActiveGame(game); setView('game'); };

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

      {view === 'game' && activeGame && (() => {
        const GameComp = GAME_COMPONENTS[activeGame.id];
        return GameComp ? (
          <GameComp
            onComplete={handleGameComplete}
            onBack={() => { setView('home'); setActiveGame(null); }}
          />
        ) : null;
      })()}

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
            {/* Mode Toggle */}
            <div className="mode-toggle">
              <button
                className={`mode-btn ${homeMode === 'work' ? 'active' : ''}`}
                onClick={() => setHomeMode('work')}
              >
                <span className="mode-icon">🧘</span>
                <span>ワーク</span>
              </button>
              <button
                className={`mode-btn ${homeMode === 'game' ? 'active' : ''}`}
                onClick={() => setHomeMode('game')}
              >
                <span className="mode-icon">🎮</span>
                <span>ゲーム</span>
              </button>
            </div>

            {homeMode === 'work' && (
              <>
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
              </>
            )}

            {homeMode === 'game' && (
              <>
                <p className="prompt">意識で遊ぼう</p>
                <div className="doorway-grid game-grid">
                  {GAMES.map(game => (
                    <button
                      key={game.id}
                      className="doorway-card glass game-card"
                      onClick={() => openGame(game)}
                      style={{ '--dc': game.color }}
                    >
                      <span className="dw-icon">{game.icon}</span>
                      <span className="dw-name">{game.name}</span>
                      <span className="dw-desc">{game.desc}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

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
