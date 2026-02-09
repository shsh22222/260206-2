import { useState, useEffect, useRef, useCallback } from 'react';
import { DOORWAYS, WISDOM, TEACHER_COLORS, TEACHER_LABELS, DIAGNOSIS_QUESTIONS, CONSCIOUSNESS_TYPES, GAMES } from './data/transurfingData';
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

/* ── Practice Screen (Auto-advance + Tap to skip) ── */
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
  }, [secLeft, allDone, step, isLast, steps]);

  const advanceStep = () => {
    if (allDone) return;
    if (isLast) {
      setAllDone(true);
    } else {
      const next = step + 1;
      setStep(next);
      setStepKey(k => k + 1);
      setSecLeft(steps[next].sec);
    }
  };

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

      <div className={`step-area step-ready`} key={stepKey} onClick={advanceStep}>
        <p className="step-text">{steps[step].text}</p>
      </div>

      <div className="ps-bottom">
        {!allDone && (
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

const REFRAME_MSGS = [
  { min: 95, text: '認知の達人。歪みを瞬時に見抜き、バランスある思考ができる。' },
  { min: 80, text: '優れた認知柔軟性。思考パターンを書き換える力がある。' },
  { min: 60, text: '認知の歪みに気づき始めた。それは大きな一歩。' },
  { min: 40, text: '思考を疑う力が育っている。それ自体が成長。' },
  { min: 0, text: '思考は事実ではない。気づいたことが始まり。' },
];

const STROOP_MSGS = [
  { min: 95, text: '驚異的な干渉制御。自動反応を完全に超越した意識。' },
  { min: 80, text: '高い注意制御力。衝動に打ち勝つ力がある。' },
  { min: 60, text: '注意の切り替えが上達している。前頭前野が鍛えられている。' },
  { min: 40, text: '自動反応に気づけるようになってきた。' },
  { min: 0, text: '気づくことが第一歩。練習で必ず上達する。' },
];

const EFFICACY_MSGS = [
  { min: 95, text: '圧倒的な自己効力感。自分の可能性を深く信じている。' },
  { min: 80, text: '高いエフィカシー。制限的信念を見抜く力がある。' },
  { min: 60, text: 'セルフイメージが変化し始めている。' },
  { min: 40, text: '自分の信念パターンに気づき始めた。' },
  { min: 0, text: '信念は選べる。そう知ったことが変化の始まり。' },
];

const ELABEL_MSGS = [
  { min: 95, text: '感情の達人。微細な感情を正確に識別できる。扁桃体が静まる。' },
  { min: 80, text: '高い感情粒度。ラベリングの力で感情を制御できている。' },
  { min: 60, text: '感情を言語化する力が育っている。' },
  { min: 40, text: '感情に名前をつける練習が効いている。' },
  { min: 0, text: '感情に気づくだけで、その強度は下がる。' },
];

const ZEN_MSGS = [
  { min: 95, text: '完璧な内なる時計。意識が時間を超えて鳴っている。' },
  { min: 80, text: '深い内的リズム。禅僧のような静かな正確さ。' },
  { min: 60, text: '呼吸のリズムが安定してきた。内なる時計が動き始める。' },
  { min: 40, text: 'リズムを感じようとする姿勢が大切。' },
  { min: 0, text: '正確さより、数えること自体に意識を向けて。' },
];

const SHIFT_MSGS = [
  { min: 95, text: '聖霊の目で世界を見ている。赦しの達人。' },
  { min: 80, text: 'エゴを手放す力が育っている。光が増している。' },
  { min: 60, text: '知覚の転換が起き始めている。赦しの筋力がつく。' },
  { min: 40, text: '赦しの練習は続けるほど自然になる。' },
  { min: 0, text: 'エゴの声に気づいた——それが最初の奇跡。' },
];

/* ── Game 1: Thought Stop (Enhanced - 120s S rank) ── */
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
    { sec: 5, text: '5秒…静寂の入口' },
    { sec: 10, text: '10秒…思考が薄れていく' },
    { sec: 20, text: '20秒…観察者が目覚める' },
    { sec: 30, text: '30秒…意識が広がっていく' },
    { sec: 45, text: '45秒…空の意識に触れた' },
    { sec: 60, text: '60秒…時間が溶けていく' },
    { sec: 80, text: '80秒…存在そのものになった' },
    { sec: 100, text: '100秒…覚醒の領域へ' },
    { sec: 120, text: '120秒…あなたは空そのもの' },
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

  // 120s = 100% for S rank
  const pct = Math.min(100, (elapsed / 120) * 100);
  const glowIntensity = Math.min(1, elapsed / 60);

  return (
    <div className="game-screen" style={{ '--gc': '#8b5cf6' }}>
      <div className="gs-top"><BackBtn onClick={onBack} /><span className="gs-badge">🧠 思考ストップ</span></div>
      <div className="gs-body">
        {phase === 'ready' && (
          <div className="gs-center">
            <span className="gs-big-icon">🧠</span>
            <h2 className="gs-title">思考ストップ</h2>
            <p className="gs-desc">目を閉じて、思考を止めてみよう。<br/>何か考えが浮かんだらタップ。<br/>120秒で覚醒ランクS。</p>
            <button className="gs-start-btn" onClick={start}>スタート</button>
          </div>
        )}
        {phase === 'playing' && (
          <div className="gs-center gs-play-area ts-playing" onClick={stop}
            style={{ '--ts-glow': glowIntensity }}>
            <div className="ts-mandala" style={{ animationDuration: `${Math.max(5, 30 - elapsed * 0.2)}s` }} />
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

/* ── Game 2: Reflex (Hard - fake-outs, 10 rounds, timeout) ── */
function ReflexGame({ onComplete, onBack }) {
  const [phase, setPhase] = useState('ready');
  const [round, setRound] = useState(0);
  const [times, setTimes] = useState([]);
  const [reactionTime, setReactionTime] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [isFake, setIsFake] = useState(false);
  const [lives, setLives] = useState(3);
  const [penaltyMs, setPenaltyMs] = useState(0);
  const startRef = useRef(null);
  const timerRef = useRef(null);
  const timeoutRef = useRef(null);
  const TOTAL_ROUNDS = 10;

  const startRound = () => {
    setPhase('waiting');
    setFeedback(null);
    setIsFake(false);
    const delay = 1000 + Math.random() * 3000;
    timerRef.current = setTimeout(() => {
      // 25% chance of fake-out (wrong color) from round 3+
      const fake = round >= 2 && Math.random() < 0.25;
      setIsFake(fake);
      startRef.current = Date.now();
      setPhase(fake ? 'fake' : 'go');
      // Timeout if no tap within 800ms (too slow penalty)
      if (!fake) {
        timeoutRef.current = setTimeout(() => {
          setReactionTime(999);
          setTimes(prev => [...prev, 800]);
          setPenaltyMs(p => p + 200);
          setCombo(0);
          setFeedback('遅すぎ!');
          setPhase('result');
        }, 800);
      } else {
        // Fake disappears after 600ms
        timeoutRef.current = setTimeout(() => {
          // Successfully avoided fake
          const newCombo = combo + 1;
          setCombo(newCombo);
          setMaxCombo(prev => Math.max(prev, newCombo));
          setFeedback('見抜いた!');
          setPhase('result');
          setReactionTime(0);
        }, 600);
      }
    }, delay);
  };

  const handleTap = () => {
    clearTimeout(timeoutRef.current);
    if (phase === 'waiting') {
      clearTimeout(timerRef.current);
      setReactionTime(-1);
      setCombo(0);
      setLives(l => l - 1);
      setFeedback('早すぎ!');
      setPhase('result');
    } else if (phase === 'fake') {
      // Tapped on fake - penalty
      setReactionTime(-2);
      setCombo(0);
      setLives(l => l - 1);
      setPenaltyMs(p => p + 150);
      setFeedback('フェイク! 罠だった!');
      setPhase('result');
    } else if (phase === 'go') {
      const t = Date.now() - startRef.current;
      setReactionTime(t);
      setTimes(prev => [...prev, t]);
      const newCombo = combo + 1;
      setCombo(newCombo);
      setMaxCombo(prev => Math.max(prev, newCombo));
      if (t < 180) setFeedback('神速!');
      else if (t < 250) setFeedback('素早い!');
      else if (t < 350) setFeedback('Good!');
      else setFeedback('OK');
      setPhase('result');
    }
  };

  const nextRound = () => {
    if (lives <= 0) { setPhase('done'); return; }
    const nr = round + 1;
    setRound(nr);
    if (nr >= TOTAL_ROUNDS) {
      setPhase('done');
    } else {
      startRound();
    }
  };

  useEffect(() => () => { clearTimeout(timerRef.current); clearTimeout(timeoutRef.current); }, []);

  const avg = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length + penaltyMs / Math.max(1, times.length)) : 0;
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
            <p className="gs-desc">黄色に光ったら即タップ!<br/>赤はフェイク——タップ厳禁!<br/>{TOTAL_ROUNDS}ラウンド。800ms超で失格。<br/>ライフ{lives}つ。</p>
            <button className="gs-start-btn" onClick={startRound}>スタート</button>
          </div>
        )}
        {phase === 'waiting' && (
          <div className="gs-center gs-play-area gs-dark" onClick={handleTap}>
            <p className="gs-wait-text">待って…</p>
            <span className="gs-round-num">{round + 1}/{TOTAL_ROUNDS}</span>
            <ComboDisplay combo={combo} multiplier={1} />
            <span className="gs-lives">{'❤️'.repeat(lives)}</span>
          </div>
        )}
        {phase === 'go' && (
          <div className="gs-center gs-play-area gs-flash" onClick={handleTap}>
            <p className="gs-go-text">タップ!</p>
          </div>
        )}
        {phase === 'fake' && (
          <div className="gs-center gs-play-area gs-flash-fake" onClick={handleTap}>
            <p className="gs-go-text" style={{ color: '#fca5a5' }}>✕</p>
          </div>
        )}
        {phase === 'result' && (
          <div className="gs-center">
            {reactionTime === -1 ? (
              <p className="gs-msg gs-early">早すぎた! -1❤️</p>
            ) : reactionTime === -2 ? (
              <p className="gs-msg gs-early">フェイクに引っかかった! -1❤️</p>
            ) : reactionTime === 999 ? (
              <p className="gs-msg gs-early">800ms超過! ペナルティ+200ms</p>
            ) : reactionTime === 0 ? (
              <>
                <span className="reflex-feedback fast">見抜いた! フェイク回避!</span>
              </>
            ) : (
              <>
                <span className="gs-result-num">{reactionTime}<small>ms</small></span>
                <span className={`reflex-feedback ${reactionTime < 200 ? 'fast' : reactionTime < 300 ? 'good' : 'ok'}`}>{feedback}</span>
              </>
            )}
            <ComboDisplay combo={combo} multiplier={1} />
            <span className="gs-lives" style={{ marginTop: 8 }}>{'❤️'.repeat(Math.max(0, lives))} {lives <= 0 && '💀'}</span>
            <button className="gs-start-btn" onClick={nextRound} style={{ marginTop: 16 }}>
              {lives <= 0 ? 'ゲームオーバー' : round + 1 >= TOTAL_ROUNDS ? '結果を見る' : '次のラウンド'}
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
            onRetry={() => { setRound(0); setTimes([]); setCombo(0); setMaxCombo(0); setLives(3); setPenaltyMs(0); setPhase('ready'); }}
            onComplete={onComplete}
          />
        )}
      </div>
    </div>
  );
}

/* ── Game 3: 認知リフレーミング (CBT Cognitive Reframing) ── */
const REFRAME_DATA = [
  { thought: '何をやっても失敗する', correct: '失敗もあるが成功した経験もある', wrong: ['もっと努力すべきだ', '成功は運だ', '自分は無能だ'] },
  { thought: 'みんなに嫌われている', correct: '全員ではなく好いてくれる人もいる', wrong: ['嫌われて当然だ', '人と関わらない', '自分を変えろ'] },
  { thought: '絶対にうまくいかない', correct: 'うまくいく可能性もある', wrong: ['やらない方がいい', 'どうせ無駄だ', '諦めろ'] },
  { thought: '自分は価値がない', correct: '自分にも価値ある面がある', wrong: ['頑張れば価値が出る', '他人より劣る', '考えすぎだ'] },
  { thought: 'あの時ああすれば…', correct: '過去は変えられないが今から学べる', wrong: ['忘れるべきだ', '自分が全部悪い', '時間を戻したい'] },
  { thought: '完璧でないと意味がない', correct: '完璧でなくても十分価値がある', wrong: ['完璧を目指すべき', '中途半端はダメ', '妥協は負け'] },
  { thought: '相手は馬鹿にしている', correct: '相手の意図は確認しないとわからない', wrong: ['やり返すべき', '距離を置こう', '自分が悪い'] },
  { thought: 'この不安は永遠に続く', correct: '感情は必ず変化する', wrong: ['我慢するしかない', '不安は悪だ', '何かおかしい'] },
  { thought: '失敗したら終わりだ', correct: '失敗は学びの機会になりうる', wrong: ['失敗は許されない', 'リスクを避けろ', '慎重にすべき'] },
  { thought: '自分だけがこんなに苦しい', correct: '多くの人が同様の苦しみを経験している', wrong: ['他人は関係ない', '自分が弱い', '誰にもわからない'] },
  { thought: '感情をコントロールできない', correct: '感情は制御できないが行動は選べる', wrong: ['感情を抑えろ', 'もっと強くなれ', '感情は敵だ'] },
  { thought: '変われない', correct: '小さな変化は常に可能だ', wrong: ['性格は変わらない', '努力不足だ', '諦めも大事'] },
  { thought: '助けを求めるのは弱さだ', correct: '助けを求めることは賢明な選択だ', wrong: ['自分で解決すべき', '迷惑をかけるな', '一人で耐えろ'] },
  { thought: '一度失敗したらもうダメだ', correct: '一度の失敗で全ては決まらない', wrong: ['次は完璧に', '失敗は恥だ', 'やり直せない'] },
  { thought: '他人は自分を見ている', correct: '多くの人は自分のことで精一杯だ', wrong: ['堂々としろ', '気にするな', '見られて当然'] },
];
function ReframeGame({ onComplete, onBack }) {
  const [phase, setPhase] = useState('ready');
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [options, setOptions] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef(null);
  const questionsRef = useRef([]);
  const TOTAL = 12;
  const getTimeLimit = (r) => Math.max(4, 7 - Math.floor(r / 4));

  const startGame = () => {
    const shuffled = [...REFRAME_DATA].sort(() => Math.random() - 0.5).slice(0, TOTAL);
    questionsRef.current = shuffled;
    setPhase('playing');
    setRound(0);
    setScore(0);
    setCombo(0);
    setCorrect(0);
    setFeedback(null);
    setupRound(0, shuffled);
  };

  const setupRound = (r, qs) => {
    const q = qs[r];
    const opts = [q.correct, ...q.wrong].sort(() => Math.random() - 0.5);
    setOptions(opts);
    const tl = getTimeLimit(r);
    setTimeLeft(tl);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          setCombo(0);
          setFeedback({ type: 'timeout' });
          setTimeout(() => nextRound(r, qs), 1200);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const handleAnswer = (ans) => {
    if (feedback) return;
    clearInterval(timerRef.current);
    const q = questionsRef.current[round];
    if (ans === q.correct) {
      const speedBonus = timeLeft * 5;
      const comboMult = 1 + combo * 0.15;
      const pts = Math.round((20 + speedBonus) * comboMult);
      setScore(s => s + pts);
      setCorrect(c => c + 1);
      setCombo(c => c + 1);
      setFeedback({ type: 'correct', pts, answer: q.correct });
    } else {
      setCombo(0);
      setFeedback({ type: 'wrong', answer: q.correct });
    }
    setTimeout(() => nextRound(round, questionsRef.current), 1500);
  };

  const nextRound = (r, qs) => {
    const nr = r + 1;
    setFeedback(null);
    if (nr >= TOTAL) { setPhase('done'); return; }
    setRound(nr);
    setupRound(nr, qs);
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  const pct = TOTAL > 0 ? Math.min(100, (correct / TOTAL) * 100) : 0;
  const q = questionsRef.current[round];

  return (
    <div className="game-screen" style={{ '--gc': '#06b6d4' }}>
      <div className="gs-top"><BackBtn onClick={onBack} /><span className="gs-badge">🔄 認知リフレーミング</span></div>
      <div className="gs-body">
        {phase === 'ready' && (
          <div className="gs-center">
            <span className="gs-big-icon">🔄</span>
            <h2 className="gs-title">認知リフレーミング</h2>
            <p className="gs-desc">歪んだ自動思考に対して<br/>バランスの取れた考え方を選ぼう。<br/>CBT認知行動療法ベース。{TOTAL}問。</p>
            <button className="gs-start-btn" onClick={startGame}>スタート</button>
          </div>
        )}
        {phase === 'playing' && q && (
          <div className="gs-center reframe-area">
            <span className="gs-round-num">{round + 1}/{TOTAL}</span>
            <ComboDisplay combo={combo} multiplier={1 + combo * 0.15} />
            <span className="reframe-timer">{timeLeft}s</span>
            <div className="reframe-thought">「{q.thought}」</div>
            <p className="reframe-prompt">バランスの取れた考え方は？</p>
            <div className="reframe-options">
              {options.map((opt, i) => (
                <button key={i}
                  className={`reframe-opt glass ${feedback ? (opt === q.correct ? 'opt-correct' : feedback.type === 'wrong' ? 'opt-dim' : 'opt-dim') : ''}`}
                  onClick={() => handleAnswer(opt)}
                  disabled={!!feedback}
                >{opt}</button>
              ))}
            </div>
            {feedback && (
              <div className={`reframe-feedback ${feedback.type}`}>
                {feedback.type === 'correct' ? `正解! +${feedback.pts}pt` :
                 feedback.type === 'wrong' ? `正解: ${feedback.answer}` : 'タイムアウト!'}
              </div>
            )}
            <span className="breath-score">スコア: {score}</span>
          </div>
        )}
        {phase === 'done' && (
          <GameResult score={score} pct={pct} gameId="reframe" label="pt"
            messages={REFRAME_MSGS}
            onRetry={() => setPhase('ready')} onComplete={onComplete} />
        )}
      </div>
    </div>
  );
}

/* ── Game 4: ストループ (Stroop Test - Neuroscience) ── */
const STROOP_COLORS = [
  { name: '赤', color: '#ef4444' },
  { name: '青', color: '#3b82f6' },
  { name: '緑', color: '#22c55e' },
  { name: '黄', color: '#eab308' },
];
function StroopGame({ onComplete, onBack }) {
  const [phase, setPhase] = useState('ready');
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [lives, setLives] = useState(3);
  const [wordText, setWordText] = useState('');
  const [displayColor, setDisplayColor] = useState('');
  const [correctColor, setCorrectColor] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [answered, setAnswered] = useState(false);
  const timerRef = useRef(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const TOTAL = 25;

  const setupRound = (r) => {
    setAnswered(false);
    setFeedback(null);
    const textIdx = Math.floor(Math.random() * STROOP_COLORS.length);
    let colorIdx;
    // 30% congruent (same word & color), 70% incongruent
    if (Math.random() < 0.30) {
      colorIdx = textIdx;
    } else {
      do { colorIdx = Math.floor(Math.random() * STROOP_COLORS.length); } while (colorIdx === textIdx);
    }
    setWordText(STROOP_COLORS[textIdx].name);
    setDisplayColor(STROOP_COLORS[colorIdx].color);
    setCorrectColor(STROOP_COLORS[colorIdx].name);
    const tl = Math.max(2, 4 - Math.floor(r / 8));
    setTimeLeft(tl);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          setCombo(0);
          setLives(l => l - 1);
          setFeedback({ type: 'timeout' });
          setTimeout(() => advance(r), 1000);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const startGame = () => {
    setPhase('playing');
    setRound(0);
    setScore(0);
    setCombo(0);
    setCorrect(0);
    setLives(3);
    setupRound(0);
  };

  const handleColor = (colorName) => {
    if (answered || phase !== 'playing') return;
    setAnswered(true);
    clearInterval(timerRef.current);
    if (colorName === correctColor) {
      const speedBonus = timeLeft * 8;
      const pts = Math.round((15 + speedBonus) * (1 + combo * 0.1));
      setScore(s => s + pts);
      setCorrect(c => c + 1);
      setCombo(c => c + 1);
      setFeedback({ type: 'correct', pts });
    } else {
      setCombo(0);
      setLives(l => l - 1);
      setFeedback({ type: 'wrong' });
    }
    setTimeout(() => advance(round), 800);
  };

  const advance = (r) => {
    setFeedback(null);
    const nr = r + 1;
    if (nr >= TOTAL || lives <= 0) { setPhase('done'); return; }
    setRound(nr);
    setupRound(nr);
  };

  useEffect(() => () => clearInterval(timerRef.current), []);
  const pct = TOTAL > 0 ? Math.min(100, (correct / TOTAL) * 100) : 0;

  return (
    <div className="game-screen" style={{ '--gc': '#ef4444' }}>
      <div className="gs-top"><BackBtn onClick={onBack} /><span className="gs-badge">🎨 ストループ</span></div>
      <div className="gs-body">
        {phase === 'ready' && (
          <div className="gs-center">
            <span className="gs-big-icon">🎨</span>
            <h2 className="gs-title">ストループテスト</h2>
            <p className="gs-desc">表示された「色」をタップ!<br/>文字の意味ではなく見た目の色!<br/>脳の干渉制御を鍛える{TOTAL}問。</p>
            <button className="gs-start-btn" onClick={startGame}>スタート</button>
          </div>
        )}
        {phase === 'playing' && (
          <div className="gs-center stroop-area">
            <span className="gs-round-num">{round + 1}/{TOTAL}</span>
            <ComboDisplay combo={combo} multiplier={1 + combo * 0.1} />
            <span className="gs-lives" style={{ position: 'absolute', top: 46, left: 16 }}>{'❤️'.repeat(Math.max(0, lives))}</span>
            <span className="stroop-timer">{timeLeft}s</span>
            <span className="stroop-word" style={{ color: displayColor }}>{wordText}</span>
            <p className="stroop-hint">この文字の「色」は？</p>
            <div className="stroop-buttons">
              {STROOP_COLORS.map(c => (
                <button key={c.name} className="stroop-btn" style={{ background: c.color }}
                  onClick={() => handleColor(c.name)} disabled={answered}>
                  {c.name}
                </button>
              ))}
            </div>
            {feedback && (
              <span className={`tap-feedback ${feedback.type === 'correct' ? 'perfect' : 'miss'}`}>
                {feedback.type === 'correct' ? `正解! +${feedback.pts}` : feedback.type === 'wrong' ? '不正解!' : 'タイムアウト!'}
              </span>
            )}
            <span className="breath-score">スコア: {score}</span>
          </div>
        )}
        {phase === 'done' && (
          <GameResult score={score} pct={pct} gameId="stroop" label="pt"
            messages={STROOP_MSGS}
            onRetry={() => setPhase('ready')} onComplete={onComplete} />
        )}
      </div>
    </div>
  );
}

/* ── Game 5: Efficacy — Tomabechi belief discrimination (swipe L/R) ── */
const BELIEFS = [
  { text: '私には無限の可能性がある', high: true },
  { text: '失敗は成長の機会だ', high: true },
  { text: 'どんな目標も達成できる', high: true },
  { text: '自分の価値は自分で決める', high: true },
  { text: '困難は乗り越えられる', high: true },
  { text: '変化を楽しめる', high: true },
  { text: '他者の評価は参考に過ぎない', high: true },
  { text: '今の自分を超えられる', high: true },
  { text: '未知の世界にワクワクする', high: true },
  { text: 'コンフォートゾーンの外に成長がある', high: true },
  { text: '私にはどうせ無理だ', high: false },
  { text: '才能がないとダメだ', high: false },
  { text: '周りの目が怖い', high: false },
  { text: '失敗したら終わりだ', high: false },
  { text: '自分には価値がない', high: false },
  { text: '過去のせいで変われない', high: false },
  { text: '完璧でなければ意味がない', high: false },
  { text: 'どうせ上手くいかない', high: false },
  { text: '他人と比べて劣っている', high: false },
  { text: '安定が一番大事だ', high: false },
];

function EfficacyGame({ onComplete, onBack }) {
  const [phase, setPhase] = useState('ready');
  const [beliefs, setBeliefs] = useState([]);
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [lives, setLives] = useState(4);
  const [swipeDir, setSwipeDir] = useState(null);
  const comboRef = useRef(0);
  const timerRef = useRef(null);
  const livesRef = useRef(4);
  const TOTAL = 20;

  const startGame = () => {
    const shuffled = [...BELIEFS].sort(() => Math.random() - 0.5).slice(0, TOTAL);
    setBeliefs(shuffled);
    setCurrent(0);
    setScore(0);
    comboRef.current = 0;
    setCombo(0);
    setMaxCombo(0);
    setCorrect(0);
    setLives(4);
    livesRef.current = 4;
    setTimeLeft(4);
    setPhase('playing');
  };

  useEffect(() => {
    if (phase !== 'playing') return;
    setTimeLeft(4);
    const id = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          // Time out = wrong
          comboRef.current = 0;
          setCombo(0);
          livesRef.current -= 1;
          setLives(livesRef.current);
          setFeedback({ type: 'timeout' });
          setTimeout(() => setFeedback(null), 400);
          if (livesRef.current <= 0) {
            clearInterval(id);
            setPhase('done');
            return 0;
          }
          setCurrent(c => {
            if (c + 1 >= beliefs.length) { clearInterval(id); setPhase('done'); }
            return c + 1;
          });
          return 4;
        }
        return t - 1;
      });
    }, 1000);
    timerRef.current = id;
    return () => clearInterval(id);
  }, [phase, current, beliefs.length]);

  const answer = (isHigh) => {
    if (phase !== 'playing' || !beliefs[current]) return;
    const belief = beliefs[current];
    const isCorrect = belief.high === isHigh;
    setSwipeDir(isHigh ? 'right' : 'left');
    setTimeout(() => setSwipeDir(null), 350);

    if (isCorrect) {
      const timeBonus = timeLeft * 5;
      const mult = 1 + comboRef.current * 0.15;
      const pts = Math.round((20 + timeBonus) * mult);
      setScore(s => s + pts);
      setCorrect(c => c + 1);
      comboRef.current += 1;
      setCombo(comboRef.current);
      setMaxCombo(prev => Math.max(prev, comboRef.current));
      setFeedback({ type: 'correct', pts, msg: isHigh ? '高エフィカシー!' : '見抜いた!' });
    } else {
      comboRef.current = 0;
      setCombo(0);
      livesRef.current -= 1;
      setLives(livesRef.current);
      setFeedback({ type: 'wrong', msg: belief.high ? 'これは高エフィカシー!' : 'これは低エフィカシー!' });
      if (livesRef.current <= 0) {
        setTimeout(() => setPhase('done'), 400);
        return;
      }
    }
    setTimeout(() => setFeedback(null), 500);
    setCurrent(c => {
      if (c + 1 >= beliefs.length) setTimeout(() => setPhase('done'), 500);
      return c + 1;
    });
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  const pct = current > 0 ? Math.min(100, (correct / current) * 100) : 0;

  return (
    <div className="game-screen" style={{ '--gc': '#ec4899' }}>
      <div className="gs-top"><BackBtn onClick={onBack} /><span className="gs-badge">💎 エフィカシー</span></div>
      <div className="gs-body">
        {phase === 'ready' && (
          <div className="gs-center">
            <span className="gs-big-icon">💎</span>
            <h2 className="gs-title">エフィカシー判別</h2>
            <p className="gs-desc">信念を瞬時に見抜け!<br/>高エフィカシー → 右ボタン<br/>低エフィカシー → 左ボタン<br/>4秒以内! ライフ4。{TOTAL}問!</p>
            <button className="gs-start-btn" onClick={startGame}>スタート</button>
          </div>
        )}
        {phase === 'playing' && beliefs[current] && (
          <div className="gs-center efficacy-area">
            <span className="gs-round-num">{current + 1}/{TOTAL}</span>
            <span className="gs-lives" style={{ position: 'absolute', top: 46, left: 16 }}>{'❤️'.repeat(Math.max(0, lives))}</span>
            <div className="efficacy-timer-bar">
              <div className="efficacy-timer-fill" style={{ width: `${(timeLeft / 4) * 100}%` }} />
            </div>
            <ComboDisplay combo={combo} multiplier={1 + combo * 0.15} />
            <div className={`efficacy-card ${swipeDir || ''}`}>
              <p className="efficacy-text">{beliefs[current].text}</p>
            </div>
            <div className="efficacy-buttons">
              <button className="efficacy-btn low" onClick={() => answer(false)}>
                <span className="efficacy-btn-icon">👎</span>
                <span>低エフィカシー</span>
              </button>
              <button className="efficacy-btn high" onClick={() => answer(true)}>
                <span className="efficacy-btn-icon">👍</span>
                <span>高エフィカシー</span>
              </button>
            </div>
            {feedback && <span className={`tap-feedback ${feedback.type === 'correct' ? 'perfect' : 'miss'}`}>
              {feedback.type === 'correct' ? `${feedback.msg} +${feedback.pts}` : feedback.type === 'timeout' ? 'タイムアウト! -❤️' : `${feedback.msg} -❤️`}
            </span>}
            <span className="breath-score">スコア: {score}</span>
          </div>
        )}
        {phase === 'done' && (
          <GameResult score={score} pct={pct} gameId="efficacy" label="pt"
            messages={EFFICACY_MSGS}
            onRetry={() => setPhase('ready')} onComplete={onComplete} />
        )}
      </div>
    </div>
  );
}

/* ── Game 6: Emotion Labeling — UCLA affect labeling (scenario→emotion quiz) ── */
const EMOTION_SCENARIOS = [
  { scenario: '大切なプレゼンの直前、手が震えている', answer: '不安', options: ['怒り', '不安', '興奮', '悲しみ'] },
  { scenario: '友人が約束を3回連続で破った', answer: '失望', options: ['失望', '恐怖', '嫉妬', '退屈'] },
  { scenario: '努力が認められず、後輩が昇進した', answer: '悔しさ', options: ['悲しみ', '悔しさ', '恐怖', '驚き'] },
  { scenario: '久しぶりに実家に帰り、懐かしい匂いがした', answer: '郷愁', options: ['安心', '郷愁', '喜び', '寂しさ'] },
  { scenario: '渋滞で大事な面接に遅刻しそうだ', answer: '焦り', options: ['怒り', '焦り', '悲しみ', '諦め'] },
  { scenario: 'SNSで友人の華やかな生活を見た', answer: '嫉妬', options: ['嫉妬', '怒り', '悲しみ', '無関心'] },
  { scenario: '暗い夜道で後ろから足音が聞こえる', answer: '恐怖', options: ['不安', '恐怖', '怒り', '驚き'] },
  { scenario: '大好きなペットとの別れ', answer: '悲嘆', options: ['悲嘆', '後悔', '怒り', '恐怖'] },
  { scenario: '自分の失言で相手を傷つけてしまった', answer: '罪悪感', options: ['恥', '罪悪感', '怒り', '悲しみ'] },
  { scenario: '長年の夢だった目標を達成した瞬間', answer: '達成感', options: ['安堵', '達成感', '興奮', '驚き'] },
  { scenario: '誰にも理解されていないと感じる', answer: '孤独', options: ['悲しみ', '怒り', '孤独', '不安'] },
  { scenario: '人前でスピーチ中に頭が真っ白になった', answer: '恥', options: ['恥', '恐怖', '怒り', '悲しみ'] },
  { scenario: '信頼していた人に裏切られた', answer: '裏切り感', options: ['怒り', '裏切り感', '悲しみ', '恐怖'] },
  { scenario: '子供の成長を見て目頭が熱くなった', answer: '感動', options: ['感動', '悲しみ', '郷愁', '安心'] },
  { scenario: '何もかもうまくいかず、布団から出たくない', answer: '無力感', options: ['退屈', '悲しみ', '無力感', '怒り'] },
  { scenario: '待ちに待った旅行の前夜', answer: '期待', options: ['期待', '興奮', '不安', '喜び'] },
  { scenario: '理不尽な命令を上司から受けた', answer: '憤り', options: ['悲しみ', '憤り', '恐怖', '諦め'] },
  { scenario: '好きな人からメッセージが来た', answer: 'ときめき', options: ['喜び', '不安', 'ときめき', '驚き'] },
];

function EmotionLabelGame({ onComplete, onBack }) {
  const [phase, setPhase] = useState('ready');
  const [scenarios, setScenarios] = useState([]);
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [lives, setLives] = useState(3);
  const [selected, setSelected] = useState(null);
  const comboRef = useRef(0);
  const timerRef = useRef(null);
  const livesRef = useRef(3);
  const TOTAL = 15;

  const startGame = () => {
    const shuffled = [...EMOTION_SCENARIOS].sort(() => Math.random() - 0.5).slice(0, TOTAL);
    shuffled.forEach(s => { s.options = [...s.options].sort(() => Math.random() - 0.5); });
    setScenarios(shuffled);
    setCurrent(0);
    setScore(0);
    comboRef.current = 0;
    setCombo(0);
    setMaxCombo(0);
    setCorrect(0);
    setLives(3);
    livesRef.current = 3;
    setTimeLeft(6);
    setPhase('playing');
  };

  useEffect(() => {
    if (phase !== 'playing') return;
    setTimeLeft(6);
    setSelected(null);
    const id = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          comboRef.current = 0;
          setCombo(0);
          livesRef.current -= 1;
          setLives(livesRef.current);
          setFeedback({ type: 'timeout', answer: scenarios[current]?.answer });
          setTimeout(() => setFeedback(null), 600);
          if (livesRef.current <= 0) {
            clearInterval(id);
            setPhase('done');
            return 0;
          }
          setCurrent(c => {
            if (c + 1 >= scenarios.length) { clearInterval(id); setPhase('done'); }
            return c + 1;
          });
          return 6;
        }
        return t - 1;
      });
    }, 1000);
    timerRef.current = id;
    return () => clearInterval(id);
  }, [phase, current, scenarios]);

  const answer = (opt) => {
    if (phase !== 'playing' || !scenarios[current] || selected) return;
    const sc = scenarios[current];
    const isCorrect = opt === sc.answer;
    setSelected(opt);

    if (isCorrect) {
      const timeBonus = timeLeft * 4;
      const mult = 1 + comboRef.current * 0.15;
      const pts = Math.round((25 + timeBonus) * mult);
      setScore(s => s + pts);
      setCorrect(c => c + 1);
      comboRef.current += 1;
      setCombo(comboRef.current);
      setMaxCombo(prev => Math.max(prev, comboRef.current));
      setFeedback({ type: 'correct', pts });
    } else {
      comboRef.current = 0;
      setCombo(0);
      livesRef.current -= 1;
      setLives(livesRef.current);
      setFeedback({ type: 'wrong', answer: sc.answer });
      if (livesRef.current <= 0) {
        setTimeout(() => setPhase('done'), 600);
        return;
      }
    }
    setTimeout(() => {
      setFeedback(null);
      setSelected(null);
      setCurrent(c => {
        if (c + 1 >= scenarios.length) setTimeout(() => setPhase('done'), 300);
        return c + 1;
      });
    }, 600);
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  const pct = current > 0 ? Math.min(100, (correct / current) * 100) : 0;

  return (
    <div className="game-screen" style={{ '--gc': '#4ade80' }}>
      <div className="gs-top"><BackBtn onClick={onBack} /><span className="gs-badge">🏷️ 感情ラベリング</span></div>
      <div className="gs-body">
        {phase === 'ready' && (
          <div className="gs-center">
            <span className="gs-big-icon">🏷️</span>
            <h2 className="gs-title">感情ラベリング</h2>
            <p className="gs-desc">場面から正確な感情を選べ!<br/>UCLA研究: 感情に名前をつけると扁桃体が鎮まる<br/>6秒以内! ライフ3。{TOTAL}問!</p>
            <button className="gs-start-btn" onClick={startGame}>スタート</button>
          </div>
        )}
        {phase === 'playing' && scenarios[current] && (
          <div className="gs-center elabel-area">
            <span className="gs-round-num">{current + 1}/{TOTAL}</span>
            <span className="gs-lives" style={{ position: 'absolute', top: 46, left: 16 }}>{'❤️'.repeat(Math.max(0, lives))}</span>
            <div className="elabel-timer-bar">
              <div className="elabel-timer-fill" style={{ width: `${(timeLeft / 6) * 100}%` }} />
            </div>
            <ComboDisplay combo={combo} multiplier={1 + combo * 0.15} />
            <div className="elabel-scenario">
              <p className="elabel-scene-text">{scenarios[current].scenario}</p>
            </div>
            <div className="elabel-options">
              {scenarios[current].options.map((opt, i) => (
                <button key={i}
                  className={`elabel-opt ${selected === opt ? (opt === scenarios[current].answer ? 'correct' : 'wrong') : ''} ${selected && opt === scenarios[current].answer ? 'correct' : ''}`}
                  onClick={() => answer(opt)}
                  disabled={!!selected}
                >{opt}</button>
              ))}
            </div>
            {feedback && <span className={`tap-feedback ${feedback.type === 'correct' ? 'perfect' : 'miss'}`}>
              {feedback.type === 'correct' ? `正解! +${feedback.pts}` : feedback.type === 'timeout' ? `時間切れ! 答: ${feedback.answer}` : `不正解! 答: ${feedback.answer}`}
            </span>}
            <span className="breath-score">スコア: {score}</span>
          </div>
        )}
        {phase === 'done' && (
          <GameResult score={score} pct={pct} gameId="emotion-label" label="pt"
            messages={ELABEL_MSGS}
            onRetry={() => setPhase('ready')} onComplete={onComplete} />
        )}
      </div>
    </div>
  );
}

/* ── Game 7: Zen Count (Hard - variable intervals, distractors, 5 rounds) ── */
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
  const [distractor, setDistractor] = useState(null);
  const lastTapRef = useRef(null);
  const comboRef = useRef(0);
  const distractorRef = useRef(null);
  const TARGET_COUNT = 10;
  const MAX_ROUNDS = 5;
  // Target interval per round: 5s→4.5s→4s→3.5s→3s
  const getTargetInterval = (r) => Math.max(3000, 5000 - r * 500);

  // Visual distractors from round 2+
  const DISTRACTORS = ['考えるな…', '今何秒？', 'ズレてる？', '速すぎ？', '遅い？', '集中…'];

  const startGame = () => {
    setPhase('playing');
    setCount(0);
    setIntervals([]);
    setRounds(0);
    comboRef.current = 0;
    setCombo(0);
    setMaxCombo(0);
    setScore(0);
    setDistractor(null);
    lastTapRef.current = null;
    startDistractions(0);
  };

  const startDistractions = (r) => {
    clearInterval(distractorRef.current);
    if (r >= 1) {
      const rate = Math.max(1500, 3000 - r * 400);
      distractorRef.current = setInterval(() => {
        const d = DISTRACTORS[Math.floor(Math.random() * DISTRACTORS.length)];
        setDistractor(d);
        setTimeout(() => setDistractor(null), 800);
      }, rate);
    }
  };

  const handleTap = () => {
    if (phase !== 'playing') return;
    const now = Date.now();
    const newCount = count + 1;
    setCount(newCount);
    setRingPulse(true);
    setTimeout(() => setRingPulse(false), 300);

    const target = getTargetInterval(rounds);

    if (lastTapRef.current) {
      const interval = now - lastTapRef.current;
      const diff = Math.abs(interval - target);
      setIntervals(prev => [...prev, diff]);

      // Tighter windows: perfect<200ms, good<600ms
      if (diff < 200) {
        setFeedback('perfect');
        setScore(s => s + 40);
        comboRef.current += 1;
        setCombo(comboRef.current);
        setMaxCombo(prev => Math.max(prev, comboRef.current));
      } else if (diff < 600) {
        setFeedback('good');
        setScore(s => s + 20);
        comboRef.current += 1;
        setCombo(comboRef.current);
        setMaxCombo(prev => Math.max(prev, comboRef.current));
      } else {
        setFeedback('miss');
        comboRef.current = 0;
        setCombo(0);
        setScore(s => Math.max(0, s - 10));
      }
      setTimeout(() => setFeedback(null), 400);
    }
    lastTapRef.current = now;

    if (newCount >= TARGET_COUNT) {
      const newRounds = rounds + 1;
      setRounds(newRounds);
      if (newRounds >= MAX_ROUNDS) {
        clearInterval(distractorRef.current);
        setPhase('done');
      } else {
        setCount(0);
        lastTapRef.current = null;
        setFeedback(null);
        startDistractions(newRounds);
      }
    }
  };

  useEffect(() => () => clearInterval(distractorRef.current), []);

  const avgDiff = intervals.length > 0
    ? Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length)
    : 0;
  const accuracy = Math.max(0, Math.round(100 - (avgDiff / 5000) * 100));
  const currentTarget = getTargetInterval(rounds);

  return (
    <div className="game-screen" style={{ '--gc': '#6366f1' }}>
      <div className="gs-top"><BackBtn onClick={onBack} /><span className="gs-badge">🔢 禅カウント</span></div>
      <div className="gs-body">
        {phase === 'ready' && (
          <div className="gs-center">
            <span className="gs-big-icon">🔢</span>
            <h2 className="gs-title">禅カウント</h2>
            <p className="gs-desc">正確なリズムで10まで数えよう。<br/>{MAX_ROUNDS}ラウンド。間隔が毎回短縮!<br/>惑わされるな——内なる時計を信じて。</p>
            <button className="gs-start-btn" onClick={startGame}>スタート</button>
          </div>
        )}
        {phase === 'playing' && (
          <div className="gs-center gs-play-area zen-playing" onClick={handleTap}>
            <span className="gs-round-num">R{rounds + 1}/{MAX_ROUNDS} · {(currentTarget / 1000).toFixed(1)}秒間隔</span>
            <ComboDisplay combo={combo} multiplier={1} />
            <div className={`zen-ring ${ringPulse ? 'pulse' : ''}`}>
              <span className="zen-count-num">{count}</span>
            </div>
            <span className="zen-count-label">/ {TARGET_COUNT}</span>
            {distractor && <span className="zen-distractor">{distractor}</span>}
            {feedback && <span className={`tap-feedback ${feedback}`}>
              {feedback === 'perfect' ? 'Perfect! +40' : feedback === 'good' ? 'Good! +20' : 'Off Beat -10'}
            </span>}
            <p className="gs-hint">{(currentTarget / 1000).toFixed(1)}秒ごとにタップ</p>
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

/* ── Game 8: Perception Shift — ACIM forgiveness (rapid-tap to transform) ── */
const SHIFT_SCENARIOS = [
  {
    ego: '満員電車で押された。なんて非常識な人だ',
    spirit: 'この人も疲れている。私は平安を選ぶ',
    lesson: '全ての攻撃は助けを求める叫び',
  },
  {
    ego: '友人に陰口を言われた。信じていたのに裏切られた',
    spirit: '友人も不安を抱えている。私は赦しを選ぶ',
    lesson: '赦しとは自分自身を自由にすること',
  },
  {
    ego: '上司に理不尽に怒られた。あいつは最低だ',
    spirit: '上司もプレッシャーの中にいる。平安を手放さない',
    lesson: '私が見ているのは自分の内面の投影',
  },
  {
    ego: '恋人に冷たくされた。自分は愛される価値がない',
    spirit: '私の価値は変わらない。愛は内側から溢れる',
    lesson: '愛は外に求めるものではなく思い出すもの',
  },
  {
    ego: 'SNSで他人の成功を見た。自分だけ取り残されている',
    spirit: '他者の光は私の光でもある。比較は幻想だ',
    lesson: '分離は知覚の誤り——私たちは一つ',
  },
  {
    ego: '大事なプレゼンで失敗した。もう終わりだ',
    spirit: 'この経験が次の成長を生む。私は完全なまま',
    lesson: '失敗という概念はエゴが作った幻想',
  },
  {
    ego: '家族に理解されない。なぜ分かってくれないのか',
    spirit: '家族も愛し方を探している。違いを赦そう',
    lesson: '理解を求める前に理解しようとする',
  },
  {
    ego: '後輩に抜かれた。自分には才能がない',
    spirit: '全ての魂に固有の道がある。私のペースでいい',
    lesson: '比較はエゴの策略——真の自己に序列はない',
  },
  {
    ego: '約束を破られた。人は信用できない',
    spirit: 'この人も完璧ではない。私も同じ。赦しを選ぶ',
    lesson: '兄弟を裁くとき、自分を牢獄に閉じ込める',
  },
  {
    ego: '努力が報われない。世界は不公平だ',
    spirit: '結果への執着を手放す。行動そのものが贈り物',
    lesson: '聖霊に結果を委ねよ',
  },
  {
    ego: '見知らぬ人に嫌な顔をされた。何が悪いんだ',
    spirit: 'あの人の一日が大変だったのかもしれない',
    lesson: '誰もが目に見えない戦いを戦っている',
  },
  {
    ego: '自分の過去の行いを思い出す。最悪な人間だった',
    spirit: 'あの時の私も精一杯だった。今の私が赦す',
    lesson: '過去は存在しない——今この瞬間だけが真実',
  },
  {
    ego: '老いていく自分の体。怖い。何もかも衰えていく',
    spirit: '体は乗り物。本当の私は永遠に変わらない',
    lesson: '私は体ではない。私は自由だ',
  },
  {
    ego: '世界は争いばかり。希望なんてない',
    spirit: '光はどんな闇の中にも消えない。私がその光になる',
    lesson: '世界を変えるには自分の知覚を変えよ',
  },
  {
    ego: '誰も自分のことを必要としていない。孤独だ',
    spirit: '分離感は幻想。私は全てと繋がっている',
    lesson: '孤独はエゴの最大の嘘',
  },
];

function PerceptionShiftGame({ onComplete, onBack }) {
  const [phase, setPhase] = useState('ready');
  const [scenarios, setScenarios] = useState([]);
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [shifted, setShifted] = useState(0);
  const [meter, setMeter] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [lives, setLives] = useState(4);
  const [showLesson, setShowLesson] = useState(null);
  const [lightLevel, setLightLevel] = useState(0);
  const comboRef = useRef(0);
  const timerRef = useRef(null);
  const meterRef = useRef(0);
  const livesRef = useRef(4);
  const TOTAL = 12;
  const TAPS_NEEDED = 15;

  const startGame = () => {
    const shuffled = [...SHIFT_SCENARIOS].sort(() => Math.random() - 0.5).slice(0, TOTAL);
    setScenarios(shuffled);
    setCurrent(0);
    setScore(0);
    comboRef.current = 0;
    setCombo(0);
    setMaxCombo(0);
    setShifted(0);
    setMeter(0);
    meterRef.current = 0;
    setLives(4);
    livesRef.current = 4;
    setLightLevel(0);
    setShowLesson(null);
    setPhase('playing');
  };

  // Timer per round
  useEffect(() => {
    if (phase !== 'playing' || showLesson) return;
    const limit = Math.max(4, 7 - Math.floor(current / 3));
    setTimeLeft(limit);
    setMeter(0);
    meterRef.current = 0;
    const id = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(id);
          // Failed to shift
          comboRef.current = 0;
          setCombo(0);
          livesRef.current -= 1;
          setLives(livesRef.current);
          if (livesRef.current <= 0) {
            setPhase('done');
            return 0;
          }
          setCurrent(c => {
            if (c + 1 >= scenarios.length) setPhase('done');
            return c + 1;
          });
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    timerRef.current = id;
    return () => clearInterval(id);
  }, [phase, current, showLesson, scenarios.length]);

  const handleTap = () => {
    if (phase !== 'playing' || showLesson || !scenarios[current]) return;
    const newMeter = meterRef.current + (100 / TAPS_NEEDED);
    meterRef.current = newMeter;
    setMeter(Math.min(100, newMeter));

    if (newMeter >= 100) {
      // Shift complete!
      clearInterval(timerRef.current);
      const timeBonus = timeLeft * 6;
      const mult = 1 + comboRef.current * 0.2;
      const pts = Math.round((40 + timeBonus) * mult);
      setScore(s => s + pts);
      setShifted(s => s + 1);
      comboRef.current += 1;
      setCombo(comboRef.current);
      setMaxCombo(prev => Math.max(prev, comboRef.current));
      setLightLevel(l => Math.min(100, l + (100 / TOTAL)));

      // Show lesson briefly
      setShowLesson({ lesson: scenarios[current].lesson, pts });
      setTimeout(() => {
        setShowLesson(null);
        setCurrent(c => {
          if (c + 1 >= scenarios.length) {
            setTimeout(() => setPhase('done'), 200);
          }
          return c + 1;
        });
      }, 1500);
    }
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  const pct = current > 0 ? Math.min(100, (shifted / Math.max(1, current)) * 100) : 0;
  const sc = scenarios[current];
  const meterPct = Math.min(100, meter);
  // Interpolate displayed text from ego to spirit based on meter
  const displayText = sc ? (meterPct < 50 ? sc.ego : sc.spirit) : '';

  return (
    <div className="game-screen" style={{ '--gc': '#22d3ee' }}>
      <div className="gs-top"><BackBtn onClick={onBack} /><span className="gs-badge">✨ 知覚シフト</span></div>
      <div className="gs-body">
        {phase === 'ready' && (
          <div className="gs-center">
            <span className="gs-big-icon">✨</span>
            <h2 className="gs-title">知覚シフト</h2>
            <p className="gs-desc">エゴの声が聞こえる——<br/>連打して光のメーターを満タンにしろ!<br/>知覚が変わる瞬間を体感せよ<br/>{TOTAL}ラウンド。ライフ4。</p>
            <button className="gs-start-btn" onClick={startGame}>スタート</button>
          </div>
        )}
        {phase === 'playing' && sc && (
          <div className="gs-center pshift-area" onClick={handleTap}>
            <span className="gs-round-num">{current + 1}/{TOTAL}</span>
            <span className="gs-lives" style={{ position: 'absolute', top: 46, left: 16 }}>{'❤️'.repeat(Math.max(0, lives))}</span>
            <span className="pshift-timer">{timeLeft}s</span>
            <ComboDisplay combo={combo} multiplier={1 + combo * 0.2} />

            <div className="pshift-light-bg" style={{ opacity: lightLevel / 100 * 0.3 }} />

            <div className={`pshift-card ${meterPct >= 50 ? 'shifting' : 'ego'} ${meterPct >= 100 ? 'shifted' : ''}`}>
              <p className="pshift-label">{meterPct < 50 ? 'エゴの声' : '聖霊の声'}</p>
              <p className="pshift-text">{displayText}</p>
            </div>

            <div className="pshift-meter-wrap">
              <div className="pshift-meter-track">
                <div className="pshift-meter-fill" style={{ width: `${meterPct}%` }} />
              </div>
              <span className="pshift-meter-label">{meterPct < 100 ? '連打して知覚を変えろ!' : '赦し完了!'}</span>
            </div>

            {showLesson && (
              <div className="pshift-lesson">
                <p className="pshift-lesson-text">{showLesson.lesson}</p>
                <span className="pshift-lesson-pts">+{showLesson.pts}pt</span>
              </div>
            )}

            <span className="breath-score">スコア: {score}</span>
          </div>
        )}
        {phase === 'done' && (
          <GameResult score={score} pct={pct} gameId="perception-shift" label="pt"
            messages={SHIFT_MSGS}
            onRetry={() => setPhase('ready')} onComplete={onComplete} />
        )}
      </div>
    </div>
  );
}

/* ── Game Router ── */
const GAME_COMPONENTS = {
  'thought-stop': ThoughtStopGame,
  'reflex': ReflexGame,
  'reframe': ReframeGame,
  'stroop': StroopGame,
  'efficacy': EfficacyGame,
  'emotion-label': EmotionLabelGame,
  'zen-count': ZenCountGame,
  'perception-shift': PerceptionShiftGame,
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
