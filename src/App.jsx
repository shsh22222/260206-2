import { useState, useEffect, useRef, useCallback } from 'react';
import { DOORWAYS, WISDOM, TEACHER_COLORS, TEACHER_LABELS, DIAGNOSIS_QUESTIONS, CONSCIOUSNESS_TYPES, GAMES, PENDULUM_WORDS, PRESENT_WORDS, EMOTION_ITEMS } from './data/transurfingData';
import { load, save, addXP, getTitle } from './store/gameStore';

/* ── Shared Helpers ── */
const HS_KEY = 'aos_hs_';
function getHS(gameId) { try { return JSON.parse(localStorage.getItem(HS_KEY + gameId) || '{}'); } catch { return {}; } }
function setHS(gameId, data) { try { localStorage.setItem(HS_KEY + gameId, JSON.stringify(data)); } catch {} }

function getRank(pct) {
  if (pct >= 95) return { rank: 'S', label: '覚醒', color: '#fbbf24' };
  if (pct >= 80) return { rank: 'A', label: '明晰', color: '#4ade80' };
  if (pct >= 60) return { rank: 'B', label: '集中', color: '#22d3ee' };
  if (pct >= 40) return { rank: 'C', label: '気づき', color: '#8b5cf6' };
  return { rank: 'D', label: '萌芽', color: '#94a3b8' };
}

function calcXP(pct) {
  if (pct >= 95) return 25;
  if (pct >= 80) return 20;
  if (pct >= 60) return 15;
  if (pct >= 40) return 12;
  return 10;
}

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

/* ── Rank Badge ── */
function RankBadge({ pct }) {
  const r = getRank(pct);
  return (
    <div className="rank-badge" style={{ '--rank-color': r.color }}>
      <span className="rank-letter">{r.rank}</span>
      <span className="rank-label">{r.label}</span>
    </div>
  );
}

/* ── Combo Display ── */
function ComboDisplay({ combo, multiplier }) {
  if (combo < 2) return null;
  return (
    <div className={`combo-display ${combo >= 10 ? 'combo-fire' : combo >= 5 ? 'combo-hot' : ''}`}>
      <span className="combo-num">{combo}</span>
      <span className="combo-text">COMBO</span>
      {multiplier > 1 && <span className="combo-mult">x{multiplier.toFixed(1)}</span>}
    </div>
  );
}

/* ── Hit Burst Effect ── */
function HitBurst({ bursts }) {
  return bursts.map(b => (
    <div key={b.id} className="hit-burst" style={{ left: b.x, top: b.y, '--burst-color': b.color }}>
      {[...Array(6)].map((_, i) => <span key={i} className="burst-particle" style={{ '--angle': `${i * 60}deg` }} />)}
    </div>
  ));
}

/* ── Game Result Screen (shared) ── */
function GameResult({ score, pct, gameId, label, messages, onRetry, onComplete }) {
  const r = getRank(pct);
  const xp = calcXP(pct);
  const hs = getHS(gameId);
  const isNewBest = !hs.best || score > hs.best;
  if (isNewBest) setHS(gameId, { ...hs, best: score });

  const msg = messages.find(m => pct >= m.min)?.text || '意識の旅は続く';

  return (
    <div className="gs-center gs-result-screen">
      <RankBadge pct={pct} />
      <span className="gs-result-num">{typeof score === 'number' ? score : score}<small>{label}</small></span>
      {isNewBest && <span className="gs-new-best">NEW BEST!</span>}
      {hs.best && !isNewBest && <span className="gs-best-label">ベスト: {hs.best}{label}</span>}
      <p className="gs-msg gs-msg-wisdom">{msg}</p>
      <div className="gs-btns">
        <button className="btn-shuffle" onClick={onRetry}>もう一度</button>
        <button className="btn-done glow" onClick={() => onComplete(xp)}>完了 +{xp}XP</button>
      </div>
    </div>
  );
}

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
/* ━━ GAME COMPONENTS (Pro Level) ━━ */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const THOUGHT_MSGS = [
  { min: 95, text: '思考を超えた存在に触れた。あなたは「空」そのもの。' },
  { min: 80, text: '長い静寂。観察者としての力が育っている。' },
  { min: 60, text: '思考の間に、静かな隙間が見え始めた。' },
  { min: 40, text: '気づきの芽が出てきた。思考に気づくこと自体が成長。' },
  { min: 0, text: '思考に気づけた——それ自体が意識的な行為。' },
];

const REFLEX_MSGS = [
  { min: 95, text: '稲妻のような気づき。意識が純粋な覚醒状態にある。' },
  { min: 80, text: '研ぎ澄まされた意識。今この瞬間に完全に在る。' },
  { min: 60, text: '良い反応速度。マインドフルネスが育っている。' },
  { min: 40, text: '意識は筋肉と同じ。鍛えるほど鋭くなる。' },
  { min: 0, text: '練習を重ねれば、意識の反応速度は上がっていく。' },
];

const BREATH_MSGS = [
  { min: 95, text: '呼吸と意識が完全に一体化した。あなたは呼吸そのもの。' },
  { min: 80, text: '美しいリズム。呼吸が体と心の架け橋になっている。' },
  { min: 60, text: '呼吸に意識が乗り始めた。心臓のコヒーレンスが整う。' },
  { min: 40, text: '呼吸を意識する——それだけで自律神経が変わり始める。' },
  { min: 0, text: '呼吸に気づくことが、意識的に生きる第一歩。' },
];

const PENDULUM_MSGS = [
  { min: 95, text: '振り子の支配から完全に自由だ。思考を選べる存在へ。' },
  { min: 80, text: 'ネガティブな振り子を素早く見抜く力がある。' },
  { min: 60, text: '思考の質を見分ける目が育ってきた。' },
  { min: 40, text: '振り子に気づく力が芽生えている。それだけで半分自由。' },
  { min: 0, text: '気づきは成長の証。振り子を見る目を養おう。' },
];

const PRESENT_MSGS = [
  { min: 95, text: '「今」に完全にアンカーされた意識。時間が消える地点。' },
  { min: 80, text: '今この瞬間を鋭く認識する力が高い。' },
  { min: 60, text: '「今」と「非今」を区別する感覚が育っている。' },
  { min: 40, text: '過去と未来に気づくことが、今に戻る鍵。' },
  { min: 0, text: '「今」を意識し始めただけで、世界は変わり始める。' },
];

const FOCUS_MSGS = [
  { min: 95, text: '驚異的な注意制御力。意識の指揮者になれる。' },
  { min: 80, text: '高い集中力。衝動を超えて意識的に反応できている。' },
  { min: 60, text: '良い集中力。Go/No-Goの切り替えが育っている。' },
  { min: 40, text: '注意のコントロールは鍛錬で磨かれる。' },
  { min: 0, text: '反応を止める力——それが意識の始まり。' },
];

const ZEN_MSGS = [
  { min: 95, text: '完璧な内なる時計。意識が時間を超えて鳴っている。' },
  { min: 80, text: '深い内的リズム。禅僧のような静かな正確さ。' },
  { min: 60, text: '呼吸のリズムが安定してきた。内なる時計が動き始める。' },
  { min: 40, text: 'リズムを感じようとする姿勢が大切。' },
  { min: 0, text: '正確さより、数えること自体に意識を向けて。' },
];

const EMOTION_MSGS = [
  { min: 95, text: '感情の錬金術師。すべての感情を光に変えられる。' },
  { min: 80, text: '感情の質を瞬時に見極める観察力が高い。' },
  { min: 60, text: '受容すべき感情と手放す感情の区別が育っている。' },
  { min: 40, text: '感情に気づくだけで、反応パターンは変わり始める。' },
  { min: 0, text: '感情は天気のようなもの。あなたは空。' },
];

/* ── Game 1: Thought Stop (Enhanced) ── */
function ThoughtStopGame({ onComplete, onBack }) {
  const [phase, setPhase] = useState('ready');
  const [elapsed, setElapsed] = useState(0);
  const [milestones, setMilestones] = useState([]);
  const [breathCue, setBreathCue] = useState('');
  const startRef = useRef(null);
  const animRef = useRef(null);
  const milestoneRef = useRef(new Set());
  const breathRef = useRef(null);

  const MILESTONES = [
    { sec: 5, text: '5秒…静寂が広がる' },
    { sec: 10, text: '10秒…思考が薄れていく' },
    { sec: 20, text: '20秒…観察者が目覚める' },
    { sec: 30, text: '30秒…空の意識に触れた' },
    { sec: 45, text: '45秒…時間が溶けていく' },
    { sec: 60, text: '60秒…あなたは空そのもの' },
  ];

  const tick = useCallback(() => {
    const t = (Date.now() - startRef.current) / 1000;
    setElapsed(t);
    MILESTONES.forEach(m => {
      if (t >= m.sec && !milestoneRef.current.has(m.sec)) {
        milestoneRef.current.add(m.sec);
        setMilestones(prev => [...prev, m]);
      }
    });
    animRef.current = requestAnimationFrame(tick);
  }, []);

  const start = () => {
    startRef.current = Date.now();
    setElapsed(0);
    setMilestones([]);
    milestoneRef.current = new Set();
    setPhase('playing');
    animRef.current = requestAnimationFrame(tick);
    // Breath cue cycle
    let i = 0;
    const cues = ['吸う…', '吐く…'];
    setBreathCue(cues[0]);
    breathRef.current = setInterval(() => {
      i = (i + 1) % 2;
      setBreathCue(cues[i]);
    }, 4000);
  };

  const stop = () => {
    cancelAnimationFrame(animRef.current);
    clearInterval(breathRef.current);
    const t = (Date.now() - startRef.current) / 1000;
    setElapsed(t);
    setPhase('result');
  };

  useEffect(() => () => { cancelAnimationFrame(animRef.current); clearInterval(breathRef.current); }, []);

  // Score: 0-60+sec mapped to 0-100% for ranking
  const pct = Math.min(100, (elapsed / 60) * 100);
  const glowIntensity = Math.min(1, elapsed / 30);

  return (
    <div className="game-screen" style={{ '--gc': '#8b5cf6' }}>
      <div className="gs-top"><BackBtn onClick={onBack} /><span className="gs-badge">🧠 思考ストップ</span></div>
      <div className="gs-body">
        {phase === 'ready' && (
          <div className="gs-center">
            <span className="gs-big-icon">🧠</span>
            <h2 className="gs-title">思考ストップ</h2>
            <p className="gs-desc">目を閉じて、思考を止めてみよう。<br/>何か考えが浮かんだらタップ。<br/>深い呼吸が静寂への鍵。</p>
            <button className="gs-start-btn" onClick={start}>スタート</button>
          </div>
        )}
        {phase === 'playing' && (
          <div className="gs-center gs-play-area ts-playing" onClick={stop}
            style={{ '--ts-glow': glowIntensity }}>
            <div className="ts-mandala" style={{ animationDuration: `${Math.max(8, 30 - elapsed)}s` }} />
            <span className="gs-timer-big ts-timer">{elapsed.toFixed(1)}</span>
            <span className="gs-timer-unit">秒</span>
            <span className="ts-breath-cue">{breathCue}</span>
            {milestones.length > 0 && (
              <span className="ts-milestone" key={milestones[milestones.length - 1].sec}>
                {milestones[milestones.length - 1].text}
              </span>
            )}
            <p className="gs-hint">思考が浮かんだらタップ</p>
          </div>
        )}
        {phase === 'result' && (
          <GameResult
            score={parseFloat(elapsed.toFixed(1))}
            pct={pct}
            gameId="thought-stop"
            label="秒"
            messages={THOUGHT_MSGS}
            onRetry={start}
            onComplete={onComplete}
          />
        )}
      </div>
    </div>
  );
}

/* ── Game 2: Reflex (Enhanced) ── */
function ReflexGame({ onComplete, onBack }) {
  const [phase, setPhase] = useState('ready');
  const [round, setRound] = useState(0);
  const [times, setTimes] = useState([]);
  const [reactionTime, setReactionTime] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const startRef = useRef(null);
  const timerRef = useRef(null);
  const TOTAL_ROUNDS = 7;

  const startRound = () => {
    setPhase('waiting');
    setFeedback(null);
    const delay = 1500 + Math.random() * 3500;
    timerRef.current = setTimeout(() => {
      startRef.current = Date.now();
      setPhase('go');
    }, delay);
  };

  const handleTap = () => {
    if (phase === 'waiting') {
      clearTimeout(timerRef.current);
      setReactionTime(-1);
      setCombo(0);
      setFeedback('早すぎ!');
      setPhase('result');
    } else if (phase === 'go') {
      const t = Date.now() - startRef.current;
      setReactionTime(t);
      setTimes(prev => [...prev, t]);
      const newCombo = combo + 1;
      setCombo(newCombo);
      setMaxCombo(prev => Math.max(prev, newCombo));
      if (t < 200) setFeedback('神速!');
      else if (t < 300) setFeedback('素早い!');
      else if (t < 400) setFeedback('Good!');
      else setFeedback('OK');
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
  // 150ms=100%, 500ms=0%
  const pct = times.length > 0 ? Math.max(0, Math.min(100, ((500 - avg) / 350) * 100)) : 0;

  return (
    <div className="game-screen" style={{ '--gc': '#f59e0b' }}>
      <div className="gs-top"><BackBtn onClick={onBack} /><span className="gs-badge">⚡ 意識リフレックス</span></div>
      <div className="gs-body">
        {phase === 'ready' && (
          <div className="gs-center">
            <span className="gs-big-icon">⚡</span>
            <h2 className="gs-title">意識リフレックス</h2>
            <p className="gs-desc">画面が光ったら即タップ!<br/>{TOTAL_ROUNDS}ラウンドの反応速度を測定。<br/>意識を研ぎ澄ませて。</p>
            <button className="gs-start-btn" onClick={startRound}>スタート</button>
          </div>
        )}
        {phase === 'waiting' && (
          <div className="gs-center gs-play-area gs-dark" onClick={handleTap}>
            <p className="gs-wait-text">待って…</p>
            <span className="gs-round-num">{round + 1}/{TOTAL_ROUNDS}</span>
            <ComboDisplay combo={combo} multiplier={1} />
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
              <p className="gs-msg gs-early">早すぎた! コンボリセット</p>
            ) : (
              <>
                <span className="gs-result-num">{reactionTime}<small>ms</small></span>
                <span className={`reflex-feedback ${reactionTime < 250 ? 'fast' : reactionTime < 350 ? 'good' : 'ok'}`}>{feedback}</span>
              </>
            )}
            <ComboDisplay combo={combo} multiplier={1} />
            <button className="gs-start-btn" onClick={nextRound} style={{ marginTop: 16 }}>
              {round + 1 >= TOTAL_ROUNDS ? '結果を見る' : '次のラウンド'}
            </button>
          </div>
        )}
        {phase === 'done' && (
          <GameResult
            score={avg}
            pct={pct}
            gameId="reflex"
            label="ms"
            messages={REFLEX_MSGS}
            onRetry={() => { setRound(0); setTimes([]); setCombo(0); setMaxCombo(0); setPhase('ready'); }}
            onComplete={onComplete}
          />
        )}
      </div>
    </div>
  );
}

/* ── Game 3: Breath Surf (Enhanced) ── */
function BreathSurfGame({ onComplete, onBack }) {
  const [phase, setPhase] = useState('ready');
  const [cycle, setCycle] = useState(0);
  const [breathPhase, setBreathPhase] = useState('in');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [tapFeedback, setTapFeedback] = useState(null);
  const [perfectCount, setPerfectCount] = useState(0);
  const [totalTaps, setTotalTaps] = useState(0);
  const progressRef = useRef(0);
  const animRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const TOTAL_CYCLES = 5;
  const BREATH_DURATION = 5000;
  const startTimeRef = useRef(null);

  const startGame = () => {
    setPhase('playing');
    setCycle(0);
    setBreathPhase('in');
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setPerfectCount(0);
    setTotalTaps(0);
    startTimeRef.current = Date.now();
    animate();
  };

  const animate = () => {
    const elapsed = Date.now() - startTimeRef.current;
    const totalCycleTime = BREATH_DURATION * 2;
    const totalGameTime = totalCycleTime * TOTAL_CYCLES;

    if (elapsed >= totalGameTime) {
      setPhase('done');
      return;
    }

    const currentCycle = Math.floor(elapsed / totalCycleTime);
    const cycleElapsed = elapsed % totalCycleTime;
    const isInhale = cycleElapsed < BREATH_DURATION;
    const phaseProgress = (cycleElapsed % BREATH_DURATION) / BREATH_DURATION;

    setCycle(currentCycle);
    setBreathPhase(isInhale ? 'in' : 'out');
    progressRef.current = isInhale ? phaseProgress : 1 - phaseProgress;
    setProgress(progressRef.current);

    animRef.current = requestAnimationFrame(animate);
  };

  const handleTap = () => {
    if (phase !== 'playing') return;
    setTotalTaps(t => t + 1);
    const p = progressRef.current;
    const mult = 1 + combo * 0.1;
    if (p > 0.88 || p < 0.12) {
      const pts = Math.round(100 * mult);
      setScore(s => s + pts);
      const newCombo = combo + 1;
      setCombo(newCombo);
      setMaxCombo(prev => Math.max(prev, newCombo));
      setPerfectCount(c => c + 1);
      setTapFeedback({ type: 'perfect', pts });
    } else if (p > 0.72 || p < 0.28) {
      const pts = Math.round(50 * mult);
      setScore(s => s + pts);
      const newCombo = combo + 1;
      setCombo(newCombo);
      setMaxCombo(prev => Math.max(prev, newCombo));
      setTapFeedback({ type: 'good', pts });
    } else {
      setCombo(0);
      setTapFeedback({ type: 'miss', pts: 0 });
    }
    setTimeout(() => setTapFeedback(null), 400);
  };

  useEffect(() => () => cancelAnimationFrame(animRef.current), []);

  const circleScale = 0.4 + progress * 0.6;
  const pct = TOTAL_CYCLES > 0 ? Math.min(100, (score / (TOTAL_CYCLES * 2 * 100)) * 100) : 0;

  return (
    <div className="game-screen" style={{ '--gc': '#06b6d4' }}>
      <div className="gs-top"><BackBtn onClick={onBack} /><span className="gs-badge">🫁 呼吸サーフ</span></div>
      <div className="gs-body">
        {phase === 'ready' && (
          <div className="gs-center">
            <span className="gs-big-icon">🫁</span>
            <h2 className="gs-title">呼吸サーフ</h2>
            <p className="gs-desc">円の動きに合わせて呼吸しよう。<br/>ピーク(最大・最小)でタップ!<br/>コンボでスコア倍率UP!</p>
            <button className="gs-start-btn" onClick={startGame}>スタート</button>
          </div>
        )}
        {phase === 'playing' && (
          <div className="gs-center gs-play-area breath-playing" onClick={handleTap}>
            <ComboDisplay combo={combo} multiplier={1 + combo * 0.1} />
            <div className="breath-circle" style={{
              transform: `scale(${circleScale})`,
              boxShadow: combo >= 5
                ? `0 0 ${40 + combo * 5}px color-mix(in srgb,var(--gc) ${30 + combo * 3}%,transparent)`
                : `0 0 30px color-mix(in srgb,var(--gc) 20%,transparent)`,
            }}>
              <span className="breath-inner-label">{breathPhase === 'in' ? '吸' : '吐'}</span>
            </div>
            <span className="breath-label">{breathPhase === 'in' ? '吸う…' : '吐く…'}</span>
            <span className="breath-score">スコア: {score}</span>
            {tapFeedback && (
              <span className={`tap-feedback ${tapFeedback.type}`}>
                {tapFeedback.type === 'perfect' ? `Perfect! +${tapFeedback.pts}` :
                 tapFeedback.type === 'good' ? `Good! +${tapFeedback.pts}` : 'Miss'}
              </span>
            )}
            <span className="gs-round-num">{cycle + 1}/{TOTAL_CYCLES}</span>
          </div>
        )}
        {phase === 'done' && (
          <GameResult
            score={score}
            pct={pct}
            gameId="breath-surf"
            label="pt"
            messages={BREATH_MSGS}
            onRetry={() => { setPhase('ready'); cancelAnimationFrame(animRef.current); }}
            onComplete={onComplete}
          />
        )}
      </div>
    </div>
  );
}

/* ── Game 4: Pendulum Shooter (Enhanced with Waves) ── */
function PendulumShooterGame({ onComplete, onBack }) {
  const [phase, setPhase] = useState('ready');
  const [bubbles, setBubbles] = useState([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(35);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [wave, setWave] = useState(1);
  const [bursts, setBursts] = useState([]);
  const [totalNeg, setTotalNeg] = useState(0);
  const idRef = useRef(0);
  const intervalRef = useRef(null);
  const timerRef = useRef(null);
  const burstIdRef = useRef(0);

  const startGame = () => {
    setPhase('playing');
    setScore(0);
    setTimeLeft(35);
    setHits(0);
    setMisses(0);
    setCombo(0);
    setMaxCombo(0);
    setWave(1);
    setTotalNeg(0);
    setBubbles([]);
    setBursts([]);
    idRef.current = 0;
    burstIdRef.current = 0;
    startWave(1);

    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(intervalRef.current);
          clearInterval(timerRef.current);
          setPhase('done');
          return 0;
        }
        // Speed up waves
        if (t === 24) setWave(2);
        if (t === 15) setWave(3);
        return t - 1;
      });
    }, 1000);
  };

  const startWave = (w) => {
    clearInterval(intervalRef.current);
    const spawnRate = w === 1 ? 1000 : w === 2 ? 750 : 550;
    const speed = w === 1 ? 3500 : w === 2 ? 2800 : 2200;

    intervalRef.current = setInterval(() => {
      const isNeg = Math.random() > (w === 3 ? 0.35 : 0.25);
      const words = isNeg ? PENDULUM_WORDS.negative : PENDULUM_WORDS.positive;
      const word = words[Math.floor(Math.random() * words.length)];
      const top = 10 + Math.random() * 70;
      const fromLeft = Math.random() > 0.5;
      const id = ++idRef.current;
      if (isNeg) setTotalNeg(n => n + 1);
      setBubbles(prev => [...prev, { id, word, isNeg, top, fromLeft, hit: false, speed }]);
      setTimeout(() => {
        setBubbles(prev => prev.filter(b => b.id !== id));
      }, speed);
    }, spawnRate);
  };

  // Watch wave changes
  useEffect(() => {
    if (phase === 'playing' && wave > 1) startWave(wave);
  }, [wave]);

  const tapBubble = (bubble, e) => {
    if (bubble.hit) return;
    setBubbles(prev => prev.map(b => b.id === bubble.id ? { ...b, hit: true } : b));

    // Burst effect
    const rect = e.currentTarget.getBoundingClientRect();
    const bId = ++burstIdRef.current;
    const burstColor = bubble.isNeg ? '#ef4444' : '#4ade80';
    setBursts(prev => [...prev, { id: bId, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, color: burstColor }]);
    setTimeout(() => setBursts(prev => prev.filter(b => b.id !== bId)), 500);

    if (bubble.isNeg) {
      const mult = 1 + combo * 0.15;
      const pts = Math.round(10 * mult);
      setScore(s => s + pts);
      setHits(h => h + 1);
      const newCombo = combo + 1;
      setCombo(newCombo);
      setMaxCombo(prev => Math.max(prev, newCombo));
    } else {
      setScore(s => Math.max(0, s - 5));
      setMisses(m => m + 1);
      setCombo(0);
    }
  };

  useEffect(() => () => {
    clearInterval(intervalRef.current);
    clearInterval(timerRef.current);
  }, []);

  const pct = totalNeg > 0 ? Math.min(100, (hits / Math.max(1, totalNeg)) * 100) : 0;

  return (
    <div className="game-screen" style={{ '--gc': '#ef4444' }}>
      <div className="gs-top"><BackBtn onClick={onBack} /><span className="gs-badge">🎯 振り子シューター</span></div>
      <div className="gs-body">
        {phase === 'ready' && (
          <div className="gs-center">
            <span className="gs-big-icon">🎯</span>
            <h2 className="gs-title">振り子シューター</h2>
            <p className="gs-desc">ネガティブ思考をタップで撃ち落とせ!<br/>ポジティブは撃たないで!<br/>3ウェーブ制。後半ほど高速に!</p>
            <button className="gs-start-btn" onClick={startGame}>スタート</button>
          </div>
        )}
        {phase === 'playing' && (
          <div className="gs-play-field">
            <div className="pend-hud">
              <span className="pend-score">{score}pt</span>
              <ComboDisplay combo={combo} multiplier={1 + combo * 0.15} />
              <span className="pend-wave">W{wave}</span>
              <span className="pend-time">{timeLeft}s</span>
            </div>
            <div className="pend-arena">
              {bubbles.map(b => (
                <div
                  key={b.id}
                  className={`pend-bubble ${b.isNeg ? 'neg' : 'pos'} ${b.fromLeft ? '' : 'from-right'} ${b.hit ? 'hit' : ''}`}
                  style={{ top: `${b.top}%`, animationDuration: `${b.speed}ms` }}
                  onClick={(e) => tapBubble(b, e)}
                >
                  {b.word}
                </div>
              ))}
            </div>
            <HitBurst bursts={bursts} />
          </div>
        )}
        {phase === 'done' && (
          <GameResult
            score={score}
            pct={pct}
            gameId="pendulum"
            label="pt"
            messages={PENDULUM_MSGS}
            onRetry={startGame}
            onComplete={onComplete}
          />
        )}
      </div>
    </div>
  );
}

/* ── Game 5: Present Tap (Enhanced) ── */
function PresentTapGame({ onComplete, onBack }) {
  const [phase, setPhase] = useState('ready');
  const [currentWord, setCurrentWord] = useState(null);
  const [isPresent, setIsPresent] = useState(false);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [wordSpeed, setWordSpeed] = useState(2000);
  const timerRef = useRef(null);
  const wordTimerRef = useRef(null);
  const answeredRef = useRef(false);

  const showNextWord = useCallback((speed) => {
    answeredRef.current = false;
    const isPresentWord = Math.random() > 0.45;
    const pool = isPresentWord ? PRESENT_WORDS.present : PRESENT_WORDS.notPresent;
    const word = pool[Math.floor(Math.random() * pool.length)];
    setCurrentWord(word);
    setIsPresent(isPresentWord);
    setTotal(t => t + 1);

    wordTimerRef.current = setTimeout(() => {
      if (!answeredRef.current) {
        if (!isPresentWord) {
          // Correctly let pass
          setCorrect(c => c + 1);
          const newCombo = combo + 1;
          setCombo(newCombo);
          setMaxCombo(prev => Math.max(prev, newCombo));
        } else {
          // Missed a present word
          setCombo(0);
        }
      }
      showNextWord(speed);
    }, speed);
  }, [combo]);

  const startGame = () => {
    setPhase('playing');
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setCorrect(0);
    setTotal(0);
    setTimeLeft(30);
    setWordSpeed(2000);
    showNextWord(2000);

    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          clearTimeout(wordTimerRef.current);
          setPhase('done');
          return 0;
        }
        // Speed up over time
        if (t === 20) setWordSpeed(1600);
        if (t === 10) setWordSpeed(1200);
        return t - 1;
      });
    }, 1000);
  };

  const handleTap = () => {
    if (phase !== 'playing' || answeredRef.current) return;
    answeredRef.current = true;
    clearTimeout(wordTimerRef.current);
    setTotal(t => t + 1);
    if (isPresent) {
      const mult = 1 + combo * 0.1;
      const pts = Math.round(10 * mult);
      setScore(s => s + pts);
      setCorrect(c => c + 1);
      const newCombo = combo + 1;
      setCombo(newCombo);
      setMaxCombo(prev => Math.max(prev, newCombo));
      setFeedback({ type: 'correct', pts });
    } else {
      setScore(s => Math.max(0, s - 5));
      setCombo(0);
      setFeedback({ type: 'wrong', pts: 0 });
    }
    setTimeout(() => setFeedback(null), 300);
    setTimeout(() => showNextWord(wordSpeed), 200);
  };

  useEffect(() => () => {
    clearInterval(timerRef.current);
    clearTimeout(wordTimerRef.current);
  }, []);

  const pct = total > 0 ? Math.min(100, (correct / Math.max(1, total)) * 100) : 0;

  return (
    <div className="game-screen" style={{ '--gc': '#ec4899' }}>
      <div className="gs-top"><BackBtn onClick={onBack} /><span className="gs-badge">✨ 今ここタップ</span></div>
      <div className="gs-body">
        {phase === 'ready' && (
          <div className="gs-center">
            <span className="gs-big-icon">✨</span>
            <h2 className="gs-title">今ここタップ</h2>
            <p className="gs-desc">「今この瞬間」の言葉だけタップ!<br/>過去/未来はスルー!<br/>後半は加速するよ!</p>
            <button className="gs-start-btn" onClick={startGame}>スタート</button>
          </div>
        )}
        {phase === 'playing' && (
          <div className="gs-center gs-play-area" onClick={handleTap}>
            <span className="pend-time" style={{ position: 'absolute', top: 16, right: 16 }}>{timeLeft}s</span>
            <ComboDisplay combo={combo} multiplier={1 + combo * 0.1} />
            <span className="present-word" key={currentWord}>{currentWord}</span>
            <span className="present-score">スコア: {score}</span>
            {feedback && <span className={`tap-feedback ${feedback.type === 'correct' ? 'perfect' : 'miss'}`}>
              {feedback.type === 'correct' ? `今ここ! +${feedback.pts}` : '過去/未来!'}
            </span>}
            <p className="gs-hint">「今」の言葉をタップ</p>
          </div>
        )}
        {phase === 'done' && (
          <GameResult
            score={score}
            pct={pct}
            gameId="present-tap"
            label="pt"
            messages={PRESENT_MSGS}
            onRetry={() => setPhase('ready')}
            onComplete={onComplete}
          />
        )}
      </div>
    </div>
  );
}

/* ── Game 6: Focus Trainer (Enhanced) ── */
function FocusGame({ onComplete, onBack }) {
  const [phase, setPhase] = useState('ready');
  const [round, setRound] = useState(0);
  const [isGreen, setIsGreen] = useState(true);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [showDot, setShowDot] = useState(false);
  const [dotSize, setDotSize] = useState(80);
  const [streak, setStreak] = useState(0);
  const timerRef = useRef(null);
  const TOTAL_ROUNDS = 25;

  const showNextDot = (r) => {
    if (r >= TOTAL_ROUNDS) {
      setPhase('done');
      return;
    }
    setShowDot(false);
    setFeedback(null);
    // Progressive difficulty: faster, smaller dots, more red
    const speedMult = Math.max(0.4, 1 - r * 0.02);
    const delay = (400 + Math.random() * 1200) * speedMult;
    const newSize = Math.max(50, 80 - r * 1.2);
    setDotSize(newSize);

    timerRef.current = setTimeout(() => {
      const greenChance = Math.max(0.35, 0.65 - r * 0.012);
      const green = Math.random() < greenChance;
      setIsGreen(green);
      setShowDot(true);
      setRound(r);
      const autoTime = Math.max(800, 1500 - r * 25);
      timerRef.current = setTimeout(() => {
        if (!green) {
          setScore(s => s + 1);
          const newCombo = combo + 1;
          setCombo(newCombo);
          setMaxCombo(prev => Math.max(prev, newCombo));
        } else {
          setCombo(0);
        }
        setTotal(t => t + 1);
        showNextDot(r + 1);
      }, autoTime);
    }, delay);
  };

  const startGame = () => {
    setPhase('playing');
    setScore(0);
    setTotal(0);
    setRound(0);
    setCombo(0);
    setMaxCombo(0);
    setStreak(0);
    showNextDot(0);
  };

  const handleTap = () => {
    if (phase !== 'playing' || !showDot) return;
    clearTimeout(timerRef.current);
    setTotal(t => t + 1);
    if (isGreen) {
      setScore(s => s + 1);
      const newCombo = combo + 1;
      setCombo(newCombo);
      setMaxCombo(prev => Math.max(prev, newCombo));
      setStreak(s => s + 1);
      setFeedback('correct');
    } else {
      setScore(s => Math.max(0, s - 1));
      setCombo(0);
      setStreak(0);
      setFeedback('wrong');
    }
    setTimeout(() => setFeedback(null), 300);
    showNextDot(round + 1);
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const pct = total > 0 ? Math.min(100, (score / Math.max(1, total)) * 100) : 0;

  return (
    <div className="game-screen" style={{ '--gc': '#4ade80' }}>
      <div className="gs-top"><BackBtn onClick={onBack} /><span className="gs-badge">🔮 集中トレーナー</span></div>
      <div className="gs-body">
        {phase === 'ready' && (
          <div className="gs-center">
            <span className="gs-big-icon">🔮</span>
            <h2 className="gs-title">集中トレーナー</h2>
            <p className="gs-desc">緑をタップ! 赤はスルー!<br/>{TOTAL_ROUNDS}ラウンド。<br/>後半は小さく・速くなるよ!</p>
            <button className="gs-start-btn" onClick={startGame}>スタート</button>
          </div>
        )}
        {phase === 'playing' && (
          <div className="gs-center gs-play-area" onClick={handleTap}>
            <span className="gs-round-num">{round + 1}/{TOTAL_ROUNDS}</span>
            <ComboDisplay combo={combo} multiplier={1} />
            {showDot && <div className={`focus-dot ${isGreen ? 'green' : 'red'}`}
              style={{ width: dotSize, height: dotSize }} />}
            {!showDot && <div className="focus-dot dim" style={{ width: dotSize, height: dotSize }} />}
            {feedback && <span className={`tap-feedback ${feedback === 'correct' ? 'perfect' : 'miss'}`}>
              {feedback === 'correct' ? '正解!' : '我慢!'}
            </span>}
            <span className="breath-score">スコア: {score}/{total}</span>
          </div>
        )}
        {phase === 'done' && (
          <GameResult
            score={Math.round(pct)}
            pct={pct}
            gameId="focus"
            label="%"
            messages={FOCUS_MSGS}
            onRetry={() => setPhase('ready')}
            onComplete={onComplete}
          />
        )}
      </div>
    </div>
  );
}

/* ── Game 7: Zen Count (Enhanced) ── */
function ZenCountGame({ onComplete, onBack }) {
  const [phase, setPhase] = useState('ready');
  const [count, setCount] = useState(0);
  const [intervals, setIntervals] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [rounds, setRounds] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [score, setScore] = useState(0);
  const [ringPulse, setRingPulse] = useState(false);
  const lastTapRef = useRef(null);
  const TARGET_INTERVAL = 5000;
  const TARGET_COUNT = 10;
  const MAX_ROUNDS = 3;

  const startGame = () => {
    setPhase('playing');
    setCount(0);
    setIntervals([]);
    setRounds(0);
    setCombo(0);
    setMaxCombo(0);
    setScore(0);
    lastTapRef.current = null;
  };

  const handleTap = () => {
    if (phase !== 'playing') return;
    const now = Date.now();
    const newCount = count + 1;
    setCount(newCount);
    setRingPulse(true);
    setTimeout(() => setRingPulse(false), 300);

    if (lastTapRef.current) {
      const interval = now - lastTapRef.current;
      const diff = Math.abs(interval - TARGET_INTERVAL);
      setIntervals(prev => [...prev, diff]);
      if (diff < 300) {
        setFeedback('perfect');
        setScore(s => s + 30);
        const newCombo = combo + 1;
        setCombo(newCombo);
        setMaxCombo(prev => Math.max(prev, newCombo));
      } else if (diff < 800) {
        setFeedback('good');
        setScore(s => s + 15);
        const newCombo = combo + 1;
        setCombo(newCombo);
        setMaxCombo(prev => Math.max(prev, newCombo));
      } else {
        setFeedback('miss');
        setCombo(0);
      }
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
            <p className="gs-desc">5秒間隔で1から10まで数えよう。<br/>{MAX_ROUNDS}ラウンド。<br/>内なるリズムを信じて。</p>
            <button className="gs-start-btn" onClick={startGame}>スタート</button>
          </div>
        )}
        {phase === 'playing' && (
          <div className="gs-center gs-play-area zen-playing" onClick={handleTap}>
            <span className="gs-round-num">ラウンド {rounds + 1}/{MAX_ROUNDS}</span>
            <ComboDisplay combo={combo} multiplier={1} />
            <div className={`zen-ring ${ringPulse ? 'pulse' : ''}`}>
              <span className="zen-count-num">{count}</span>
            </div>
            <span className="zen-count-label">/ {TARGET_COUNT}</span>
            {feedback && <span className={`tap-feedback ${feedback}`}>
              {feedback === 'perfect' ? 'Perfect! +30' : feedback === 'good' ? 'Good! +15' : 'Off Beat'}
            </span>}
            <p className="gs-hint">5秒ごとにタップ</p>
            <span className="breath-score">スコア: {score}</span>
          </div>
        )}
        {phase === 'done' && (
          <GameResult
            score={score}
            pct={accuracy}
            gameId="zen-count"
            label="pt"
            messages={ZEN_MSGS}
            onRetry={() => setPhase('ready')}
            onComplete={onComplete}
          />
        )}
      </div>
    </div>
  );
}

/* ── Game 8: Emotion Catch (Enhanced with Waves) ── */
function EmotionCatchGame({ onComplete, onBack }) {
  const [phase, setPhase] = useState('ready');
  const [items, setItems] = useState([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(35);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [catches, setCatches] = useState(0);
  const [totalAccept, setTotalAccept] = useState(0);
  const [wave, setWave] = useState(1);
  const [bursts, setBursts] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const idRef = useRef(0);
  const intervalRef = useRef(null);
  const timerRef = useRef(null);
  const burstIdRef = useRef(0);

  const startGame = () => {
    setPhase('playing');
    setScore(0);
    setTimeLeft(35);
    setCombo(0);
    setMaxCombo(0);
    setCatches(0);
    setTotalAccept(0);
    setWave(1);
    setItems([]);
    setBursts([]);
    idRef.current = 0;
    burstIdRef.current = 0;
    startWave(1);

    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(intervalRef.current);
          clearInterval(timerRef.current);
          setPhase('done');
          return 0;
        }
        if (t === 24) setWave(2);
        if (t === 13) setWave(3);
        return t - 1;
      });
    }, 1000);
  };

  const startWave = (w) => {
    clearInterval(intervalRef.current);
    const spawnRate = w === 1 ? 900 : w === 2 ? 700 : 500;
    const fallSpeed = w === 1 ? 3000 : w === 2 ? 2500 : 2000;

    intervalRef.current = setInterval(() => {
      const isAccept = Math.random() > (w === 3 ? 0.55 : 0.45);
      const pool = isAccept ? EMOTION_ITEMS.accept : EMOTION_ITEMS.resist;
      const word = pool[Math.floor(Math.random() * pool.length)];
      const left = 5 + Math.random() * 75;
      const id = ++idRef.current;
      if (isAccept) setTotalAccept(n => n + 1);
      setItems(prev => [...prev, { id, word, isAccept, left, tapped: false, speed: fallSpeed }]);
      setTimeout(() => {
        setItems(prev => prev.filter(i => i.id !== id));
      }, fallSpeed);
    }, spawnRate);
  };

  useEffect(() => {
    if (phase === 'playing' && wave > 1) startWave(wave);
  }, [wave]);

  const tapItem = (item, e) => {
    if (item.tapped) return;
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, tapped: true } : i));

    const rect = e.currentTarget.getBoundingClientRect();
    const bId = ++burstIdRef.current;
    const burstColor = item.isAccept ? '#4ade80' : '#ef4444';
    setBursts(prev => [...prev, { id: bId, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, color: burstColor }]);
    setTimeout(() => setBursts(prev => prev.filter(b => b.id !== bId)), 500);

    if (item.isAccept) {
      const mult = 1 + combo * 0.12;
      const pts = Math.round(10 * mult);
      setScore(s => s + pts);
      setCatches(c => c + 1);
      const newCombo = combo + 1;
      setCombo(newCombo);
      setMaxCombo(prev => Math.max(prev, newCombo));
      setFeedback({ type: 'correct', pts });
    } else {
      setScore(s => Math.max(0, s - 5));
      setCombo(0);
      setFeedback({ type: 'wrong', pts: 0 });
    }
    setTimeout(() => setFeedback(null), 300);
  };

  useEffect(() => () => {
    clearInterval(intervalRef.current);
    clearInterval(timerRef.current);
  }, []);

  const pct = totalAccept > 0 ? Math.min(100, (catches / Math.max(1, totalAccept)) * 100) : 0;

  return (
    <div className="game-screen" style={{ '--gc': '#22d3ee' }}>
      <div className="gs-top"><BackBtn onClick={onBack} /><span className="gs-badge">🎪 感情キャッチ</span></div>
      <div className="gs-body">
        {phase === 'ready' && (
          <div className="gs-center">
            <span className="gs-big-icon">🎪</span>
            <h2 className="gs-title">感情キャッチ</h2>
            <p className="gs-desc">ポジティブ感情をキャッチ!<br/>ネガティブはスルー!<br/>3ウェーブ制。コンボで高得点!</p>
            <button className="gs-start-btn" onClick={startGame}>スタート</button>
          </div>
        )}
        {phase === 'playing' && (
          <div className="gs-play-field">
            <div className="pend-hud">
              <span className="pend-score">{score}pt</span>
              <ComboDisplay combo={combo} multiplier={1 + combo * 0.12} />
              <span className="pend-wave">W{wave}</span>
              <span className="pend-time">{timeLeft}s</span>
            </div>
            <div className="pend-arena emotion-arena">
              {items.map(item => (
                <div
                  key={item.id}
                  className={`emotion-item ${item.isAccept ? 'accept' : 'resist'} ${item.tapped ? 'caught' : ''}`}
                  style={{ left: `${item.left}%`, animationDuration: `${item.speed}ms` }}
                  onClick={(e) => tapItem(item, e)}
                >
                  {item.word}
                </div>
              ))}
            </div>
            {feedback && <span className={`tap-feedback tap-feedback-fixed ${feedback.type === 'correct' ? 'perfect' : 'miss'}`}>
              {feedback.type === 'correct' ? `受容! +${feedback.pts}` : '抵抗!'}
            </span>}
            <HitBurst bursts={bursts} />
          </div>
        )}
        {phase === 'done' && (
          <GameResult
            score={score}
            pct={pct}
            gameId="emotion-catch"
            label="pt"
            messages={EMOTION_MSGS}
            onRetry={startGame}
            onComplete={onComplete}
          />
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
  const [homeMode, setHomeMode] = useState('work');
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
                  {GAMES.map(game => {
                    const hs = getHS(game.id);
                    return (
                      <button
                        key={game.id}
                        className="doorway-card glass game-card"
                        onClick={() => openGame(game)}
                        style={{ '--dc': game.color }}
                      >
                        <span className="dw-icon">{game.icon}</span>
                        <span className="dw-name">{game.name}</span>
                        <span className="dw-desc">{game.desc}</span>
                        {hs.best != null && <span className="game-best">BEST: {hs.best}</span>}
                      </button>
                    );
                  })}
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
