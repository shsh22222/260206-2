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

/* ── Game 3: Breath Surf (Hard - 8 cycles, shrinking zones, accelerating) ── */
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
  const [lives, setLives] = useState(3);
  const progressRef = useRef(0);
  const cycleRef = useRef(0);
  const animRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const TOTAL_CYCLES = 8;
  const startTimeRef = useRef(null);

  // Breath duration shortens each cycle: 5000→4500→4000→3500→3200→3000→2800→2600
  const getBreathDuration = (c) => Math.max(2600, 5000 - c * 300);

  const startGame = () => {
    setPhase('playing');
    setCycle(0);
    cycleRef.current = 0;
    setBreathPhase('in');
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setPerfectCount(0);
    setTotalTaps(0);
    setLives(3);
    startTimeRef.current = Date.now();
    animate();
  };

  const animate = () => {
    const elapsed = Date.now() - startTimeRef.current;
    // Calculate which cycle we're in based on variable durations
    let acc = 0;
    let curCycle = 0;
    for (let i = 0; i < TOTAL_CYCLES; i++) {
      const dur = getBreathDuration(i) * 2;
      if (elapsed < acc + dur) { curCycle = i; break; }
      acc += dur;
      if (i === TOTAL_CYCLES - 1) { setPhase('done'); return; }
    }

    const totalCycleTime = getBreathDuration(curCycle) * 2;
    const cycleElapsed = elapsed - acc;
    const bd = getBreathDuration(curCycle);
    const isInhale = cycleElapsed < bd;
    const phaseProgress = (cycleElapsed % bd) / bd;

    cycleRef.current = curCycle;
    setCycle(curCycle);
    setBreathPhase(isInhale ? 'in' : 'out');
    progressRef.current = isInhale ? phaseProgress : 1 - phaseProgress;
    setProgress(progressRef.current);

    animRef.current = requestAnimationFrame(animate);
  };

  const handleTap = () => {
    if (phase !== 'playing') return;
    if (lives <= 0) return;
    setTotalTaps(t => t + 1);
    const p = progressRef.current;
    const c = cycleRef.current;
    const mult = 1 + combo * 0.12;
    // Perfect zone shrinks: 0.12→0.10→0.08→0.06...
    const perfectZone = Math.max(0.05, 0.12 - c * 0.01);
    const goodZone = Math.max(0.15, 0.28 - c * 0.015);

    if (p > (1 - perfectZone) || p < perfectZone) {
      const pts = Math.round(120 * mult);
      setScore(s => s + pts);
      const newCombo = combo + 1;
      setCombo(newCombo);
      setMaxCombo(prev => Math.max(prev, newCombo));
      setPerfectCount(c2 => c2 + 1);
      setTapFeedback({ type: 'perfect', pts });
    } else if (p > (1 - goodZone) || p < goodZone) {
      const pts = Math.round(50 * mult);
      setScore(s => s + pts);
      const newCombo = combo + 1;
      setCombo(newCombo);
      setMaxCombo(prev => Math.max(prev, newCombo));
      setTapFeedback({ type: 'good', pts });
    } else {
      setCombo(0);
      setLives(l => {
        const next = l - 1;
        if (next <= 0) {
          cancelAnimationFrame(animRef.current);
          setTimeout(() => setPhase('done'), 300);
        }
        return next;
      });
      setTapFeedback({ type: 'miss', pts: 0 });
    }
    setTimeout(() => setTapFeedback(null), 400);
  };

  useEffect(() => () => cancelAnimationFrame(animRef.current), []);

  const circleScale = 0.4 + progress * 0.6;
  const pct = TOTAL_CYCLES > 0 ? Math.min(100, (score / (TOTAL_CYCLES * 2 * 120)) * 100) : 0;

  return (
    <div className="game-screen" style={{ '--gc': '#06b6d4' }}>
      <div className="gs-top"><BackBtn onClick={onBack} /><span className="gs-badge">🫁 呼吸サーフ</span></div>
      <div className="gs-body">
        {phase === 'ready' && (
          <div className="gs-center">
            <span className="gs-big-icon">🫁</span>
            <h2 className="gs-title">呼吸サーフ</h2>
            <p className="gs-desc">円の動きに合わせてタップ!<br/>ピーク時がPerfect! ミス3回で終了!<br/>後半はゾーンが狭く、速度UP!</p>
            <button className="gs-start-btn" onClick={startGame}>スタート</button>
          </div>
        )}
        {phase === 'playing' && (
          <div className="gs-center gs-play-area breath-playing" onClick={handleTap}>
            <ComboDisplay combo={combo} multiplier={1 + combo * 0.12} />
            <span className="gs-lives" style={{ position: 'absolute', top: 46, left: 16 }}>{'❤️'.repeat(Math.max(0, lives))}</span>
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
                 tapFeedback.type === 'good' ? `Good! +${tapFeedback.pts}` : 'Miss! -❤️'}
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

/* ── Game 4: Pendulum Shooter (Hard - 5 waves, life system, faster) ── */
function PendulumShooterGame({ onComplete, onBack }) {
  const [phase, setPhase] = useState('ready');
  const [bubbles, setBubbles] = useState([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [wave, setWave] = useState(1);
  const [lives, setLives] = useState(5);
  const [bursts, setBursts] = useState([]);
  const [totalNeg, setTotalNeg] = useState(0);
  const [missedNeg, setMissedNeg] = useState(0);
  const idRef = useRef(0);
  const intervalRef = useRef(null);
  const timerRef = useRef(null);
  const burstIdRef = useRef(0);
  const livesRef = useRef(5);

  const startGame = () => {
    setPhase('playing');
    setScore(0);
    setTimeLeft(45);
    setHits(0);
    setMisses(0);
    setCombo(0);
    setMaxCombo(0);
    setWave(1);
    setLives(5);
    livesRef.current = 5;
    setTotalNeg(0);
    setMissedNeg(0);
    setBubbles([]);
    setBursts([]);
    idRef.current = 0;
    burstIdRef.current = 0;
    startWave(1);

    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1 || livesRef.current <= 0) {
          clearInterval(intervalRef.current);
          clearInterval(timerRef.current);
          setPhase('done');
          return 0;
        }
        if (t === 37) setWave(2);
        if (t === 29) setWave(3);
        if (t === 20) setWave(4);
        if (t === 11) setWave(5);
        return t - 1;
      });
    }, 1000);
  };

  const startWave = (w) => {
    clearInterval(intervalRef.current);
    // 5 waves: progressively faster spawn, faster movement, more negatives
    const rates = [900, 700, 550, 420, 320];
    const speeds = [3200, 2800, 2400, 2000, 1600];
    const negChance = [0.65, 0.60, 0.55, 0.50, 0.50];
    const spawnRate = rates[Math.min(w - 1, 4)];
    const speed = speeds[Math.min(w - 1, 4)];
    const negP = negChance[Math.min(w - 1, 4)];

    intervalRef.current = setInterval(() => {
      if (livesRef.current <= 0) { clearInterval(intervalRef.current); return; }
      const isNeg = Math.random() < negP;
      const words = isNeg ? PENDULUM_WORDS.negative : PENDULUM_WORDS.positive;
      const word = words[Math.floor(Math.random() * words.length)];
      const top = 8 + Math.random() * 75;
      const fromLeft = Math.random() > 0.5;
      const id = ++idRef.current;
      if (isNeg) setTotalNeg(n => n + 1);
      setBubbles(prev => [...prev, { id, word, isNeg, top, fromLeft, hit: false, speed }]);
      setTimeout(() => {
        setBubbles(prev => {
          const b = prev.find(x => x.id === id);
          if (b && !b.hit && b.isNeg) {
            // Missed a negative bubble = lose a life
            setMissedNeg(m => m + 1);
            livesRef.current -= 1;
            setLives(livesRef.current);
            if (livesRef.current <= 0) {
              clearInterval(intervalRef.current);
              clearInterval(timerRef.current);
              setPhase('done');
            }
          }
          return prev.filter(x => x.id !== id);
        });
      }, speed);
    }, spawnRate);
  };

  useEffect(() => {
    if (phase === 'playing' && wave > 1) startWave(wave);
  }, [wave]);

  const tapBubble = (bubble, e) => {
    if (bubble.hit) return;
    setBubbles(prev => prev.map(b => b.id === bubble.id ? { ...b, hit: true } : b));

    const rect = e.currentTarget.getBoundingClientRect();
    const bId = ++burstIdRef.current;
    const burstColor = bubble.isNeg ? '#ef4444' : '#4ade80';
    setBursts(prev => [...prev, { id: bId, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, color: burstColor }]);
    setTimeout(() => setBursts(prev => prev.filter(b => b.id !== bId)), 500);

    if (bubble.isNeg) {
      const mult = 1 + combo * 0.15;
      const pts = Math.round(15 * mult);
      setScore(s => s + pts);
      setHits(h => h + 1);
      const newCombo = combo + 1;
      setCombo(newCombo);
      setMaxCombo(prev => Math.max(prev, newCombo));
    } else {
      setScore(s => Math.max(0, s - 10));
      setMisses(m => m + 1);
      setCombo(0);
      livesRef.current -= 1;
      setLives(livesRef.current);
      if (livesRef.current <= 0) {
        clearInterval(intervalRef.current);
        clearInterval(timerRef.current);
        setTimeout(() => setPhase('done'), 200);
      }
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
            <p className="gs-desc">ネガティブ思考を撃ち落とせ!<br/>ポジティブは撃つな! 逃すとライフ減!<br/>5ウェーブ制。どこまで耐えられる?</p>
            <button className="gs-start-btn" onClick={startGame}>スタート</button>
          </div>
        )}
        {phase === 'playing' && (
          <div className="gs-play-field">
            <div className="pend-hud">
              <span className="pend-score">{score}pt</span>
              <ComboDisplay combo={combo} multiplier={1 + combo * 0.15} />
              <span className="pend-wave">W{wave}/5</span>
              <span className="gs-lives">{'❤️'.repeat(Math.max(0, lives))}</span>
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

/* ── Game 5: Present Tap (Hard - faster, lives, trap words) ── */
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
  const [timeLeft, setTimeLeft] = useState(40);
  const [lives, setLives] = useState(4);
  const comboRef = useRef(0);
  const speedRef = useRef(1800);
  const timerRef = useRef(null);
  const wordTimerRef = useRef(null);
  const answeredRef = useRef(false);
  const livesRef = useRef(4);

  // Trap words look like "present" but aren't
  const TRAP_WORDS = ['いつも', '永遠', 'すべて', '全部', '完璧', '絶対'];

  const showNextWord = useCallback((speed) => {
    answeredRef.current = false;
    // 40% present, 40% notPresent, 20% trap
    const r = Math.random();
    let word, isPresentWord;
    if (r < 0.40) {
      const pool = PRESENT_WORDS.present;
      word = pool[Math.floor(Math.random() * pool.length)];
      isPresentWord = true;
    } else if (r < 0.80) {
      const pool = PRESENT_WORDS.notPresent;
      word = pool[Math.floor(Math.random() * pool.length)];
      isPresentWord = false;
    } else {
      word = TRAP_WORDS[Math.floor(Math.random() * TRAP_WORDS.length)];
      isPresentWord = false;
    }
    setCurrentWord(word);
    setIsPresent(isPresentWord);
    setTotal(t => t + 1);

    wordTimerRef.current = setTimeout(() => {
      if (!answeredRef.current) {
        if (isPresentWord) {
          // Missed a present word = lose life
          comboRef.current = 0;
          setCombo(0);
          livesRef.current -= 1;
          setLives(livesRef.current);
          if (livesRef.current <= 0) {
            clearInterval(timerRef.current);
            setPhase('done');
            return;
          }
        } else {
          setCorrect(c => c + 1);
          comboRef.current += 1;
          setCombo(comboRef.current);
          setMaxCombo(prev => Math.max(prev, comboRef.current));
        }
      }
      if (livesRef.current > 0) showNextWord(speed);
    }, speed);
  }, []);

  const startGame = () => {
    setPhase('playing');
    setScore(0);
    comboRef.current = 0;
    setCombo(0);
    setMaxCombo(0);
    setCorrect(0);
    setTotal(0);
    setTimeLeft(40);
    setLives(4);
    livesRef.current = 4;
    speedRef.current = 1800;
    showNextWord(1800);

    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1 || livesRef.current <= 0) {
          clearInterval(timerRef.current);
          clearTimeout(wordTimerRef.current);
          setPhase('done');
          return 0;
        }
        // Accelerate: 1800→1400→1000→700
        if (t === 31) speedRef.current = 1400;
        if (t === 22) speedRef.current = 1000;
        if (t === 12) speedRef.current = 700;
        return t - 1;
      });
    }, 1000);
  };

  const handleTap = () => {
    if (phase !== 'playing' || answeredRef.current) return;
    answeredRef.current = true;
    clearTimeout(wordTimerRef.current);
    if (isPresent) {
      const mult = 1 + comboRef.current * 0.12;
      const pts = Math.round(15 * mult);
      setScore(s => s + pts);
      setCorrect(c => c + 1);
      comboRef.current += 1;
      setCombo(comboRef.current);
      setMaxCombo(prev => Math.max(prev, comboRef.current));
      setFeedback({ type: 'correct', pts });
    } else {
      setScore(s => Math.max(0, s - 8));
      comboRef.current = 0;
      setCombo(0);
      livesRef.current -= 1;
      setLives(livesRef.current);
      setFeedback({ type: 'wrong', pts: 0 });
      if (livesRef.current <= 0) {
        clearInterval(timerRef.current);
        setTimeout(() => setPhase('done'), 300);
        return;
      }
    }
    setTimeout(() => setFeedback(null), 300);
    setTimeout(() => showNextWord(speedRef.current), 200);
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
            <p className="gs-desc">「今この瞬間」の言葉だけタップ!<br/>過去/未来/トラップはスルー!<br/>ミスorスルーで❤️減。加速注意!</p>
            <button className="gs-start-btn" onClick={startGame}>スタート</button>
          </div>
        )}
        {phase === 'playing' && (
          <div className="gs-center gs-play-area" onClick={handleTap}>
            <span className="pend-time" style={{ position: 'absolute', top: 16, right: 16 }}>{timeLeft}s</span>
            <span className="gs-lives" style={{ position: 'absolute', top: 46, left: 16 }}>{'❤️'.repeat(Math.max(0, lives))}</span>
            <ComboDisplay combo={combo} multiplier={1 + combo * 0.12} />
            <span className="present-word" key={currentWord}>{currentWord}</span>
            <span className="present-score">スコア: {score}</span>
            {feedback && <span className={`tap-feedback ${feedback.type === 'correct' ? 'perfect' : 'miss'}`}>
              {feedback.type === 'correct' ? `今ここ! +${feedback.pts}` : 'トラップ! -❤️'}
            </span>}
            <p className="gs-hint">「今」の言葉だけをタップ</p>
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

/* ── Game 6: Focus Trainer (Hard - random pos, yellow traps, 30 rounds, lives) ── */
function FocusGame({ onComplete, onBack }) {
  const [phase, setPhase] = useState('ready');
  const [round, setRound] = useState(0);
  const [dotType, setDotType] = useState('green'); // green|red|yellow
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [showDot, setShowDot] = useState(false);
  const [dotSize, setDotSize] = useState(70);
  const [dotPos, setDotPos] = useState({ x: 50, y: 50 });
  const [lives, setLives] = useState(3);
  const timerRef = useRef(null);
  const comboRef = useRef(0);
  const livesRef = useRef(3);
  const TOTAL_ROUNDS = 30;

  const showNextDot = (r) => {
    if (r >= TOTAL_ROUNDS || livesRef.current <= 0) {
      setPhase('done');
      return;
    }
    setShowDot(false);
    setFeedback(null);

    const speedMult = Math.max(0.3, 1 - r * 0.022);
    const delay = (300 + Math.random() * 1000) * speedMult;
    const newSize = Math.max(36, 70 - r * 1.3);
    setDotSize(newSize);

    timerRef.current = setTimeout(() => {
      // Random position on screen
      const x = 15 + Math.random() * 70;
      const y = 20 + Math.random() * 55;
      setDotPos({ x, y });

      // Determine dot type: green(tap), red(don't tap), yellow(trap - don't tap, looks tempting)
      const rnd = Math.random();
      const greenChance = Math.max(0.30, 0.55 - r * 0.008);
      const yellowChance = r >= 8 ? Math.min(0.20, (r - 8) * 0.01) : 0;
      let type;
      if (rnd < greenChance) type = 'green';
      else if (rnd < greenChance + yellowChance) type = 'yellow';
      else type = 'red';

      setDotType(type);
      setShowDot(true);
      setRound(r);

      const autoTime = Math.max(500, 1200 - r * 22);
      timerRef.current = setTimeout(() => {
        // Time expired without tap
        setTotal(t => t + 1);
        if (type !== 'green') {
          // Correctly avoided
          setScore(s => s + 1);
          comboRef.current += 1;
          setCombo(comboRef.current);
          setMaxCombo(prev => Math.max(prev, comboRef.current));
        } else {
          // Missed green = lose life
          comboRef.current = 0;
          setCombo(0);
          livesRef.current -= 1;
          setLives(livesRef.current);
        }
        showNextDot(r + 1);
      }, autoTime);
    }, delay);
  };

  const startGame = () => {
    setPhase('playing');
    setScore(0);
    setTotal(0);
    setRound(0);
    comboRef.current = 0;
    setCombo(0);
    setMaxCombo(0);
    setLives(3);
    livesRef.current = 3;
    showNextDot(0);
  };

  const handleTap = () => {
    if (phase !== 'playing' || !showDot) return;
    clearTimeout(timerRef.current);
    setTotal(t => t + 1);
    if (dotType === 'green') {
      setScore(s => s + 1);
      comboRef.current += 1;
      setCombo(comboRef.current);
      setMaxCombo(prev => Math.max(prev, comboRef.current));
      setFeedback('correct');
    } else if (dotType === 'yellow') {
      // Yellow trap - looks green-ish but shouldn't tap
      comboRef.current = 0;
      setCombo(0);
      livesRef.current -= 1;
      setLives(livesRef.current);
      setFeedback('trap');
      if (livesRef.current <= 0) {
        setTimeout(() => setPhase('done'), 300);
        return;
      }
    } else {
      // Red - shouldn't tap
      setScore(s => Math.max(0, s - 1));
      comboRef.current = 0;
      setCombo(0);
      livesRef.current -= 1;
      setLives(livesRef.current);
      setFeedback('wrong');
      if (livesRef.current <= 0) {
        setTimeout(() => setPhase('done'), 300);
        return;
      }
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
            <p className="gs-desc">緑をタップ! 赤はスルー!<br/>黄色はトラップ——タップ厳禁!<br/>{TOTAL_ROUNDS}ラウンド。ライフ3。<br/>ドットは移動し縮小する!</p>
            <button className="gs-start-btn" onClick={startGame}>スタート</button>
          </div>
        )}
        {phase === 'playing' && (
          <div className="gs-center gs-play-area focus-arena" onClick={handleTap}>
            <span className="gs-round-num">{round + 1}/{TOTAL_ROUNDS}</span>
            <ComboDisplay combo={combo} multiplier={1} />
            <span className="gs-lives" style={{ position: 'absolute', top: 46, left: 16 }}>{'❤️'.repeat(Math.max(0, lives))}</span>
            {showDot && (
              <div className={`focus-dot focus-dot-abs ${dotType}`}
                style={{ width: dotSize, height: dotSize, left: `${dotPos.x}%`, top: `${dotPos.y}%` }} />
            )}
            {!showDot && <div className="focus-dot dim" style={{ width: dotSize, height: dotSize }} />}
            {feedback && <span className={`tap-feedback ${feedback === 'correct' ? 'perfect' : feedback === 'trap' ? 'miss' : 'miss'}`}>
              {feedback === 'correct' ? '正解!' : feedback === 'trap' ? 'トラップ! -❤️' : '我慢! -❤️'}
            </span>}
            <span className="breath-score" style={{ position: 'absolute', bottom: 16 }}>スコア: {score}/{total}</span>
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

/* ── Game 8: Emotion Catch (Hard - 5 waves, lives, golden bonus, faster) ── */
function EmotionCatchGame({ onComplete, onBack }) {
  const [phase, setPhase] = useState('ready');
  const [items, setItems] = useState([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(50);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [catches, setCatches] = useState(0);
  const [totalAccept, setTotalAccept] = useState(0);
  const [wave, setWave] = useState(1);
  const [lives, setLives] = useState(5);
  const [bursts, setBursts] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const idRef = useRef(0);
  const intervalRef = useRef(null);
  const timerRef = useRef(null);
  const burstIdRef = useRef(0);
  const livesRef = useRef(5);

  const GOLDEN_EMOTIONS = ['悟り', '覚醒', '至福', '解脱'];

  const startGame = () => {
    setPhase('playing');
    setScore(0);
    setTimeLeft(50);
    setCombo(0);
    setMaxCombo(0);
    setCatches(0);
    setTotalAccept(0);
    setWave(1);
    setLives(5);
    livesRef.current = 5;
    setItems([]);
    setBursts([]);
    idRef.current = 0;
    burstIdRef.current = 0;
    startWave(1);

    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1 || livesRef.current <= 0) {
          clearInterval(intervalRef.current);
          clearInterval(timerRef.current);
          setPhase('done');
          return 0;
        }
        if (t === 41) setWave(2);
        if (t === 32) setWave(3);
        if (t === 22) setWave(4);
        if (t === 12) setWave(5);
        return t - 1;
      });
    }, 1000);
  };

  const startWave = (w) => {
    clearInterval(intervalRef.current);
    const rates = [800, 650, 500, 380, 280];
    const speeds = [2800, 2400, 2000, 1700, 1400];
    const spawnRate = rates[Math.min(w - 1, 4)];
    const fallSpeed = speeds[Math.min(w - 1, 4)];
    const resistChance = [0.40, 0.45, 0.50, 0.50, 0.55];

    intervalRef.current = setInterval(() => {
      if (livesRef.current <= 0) { clearInterval(intervalRef.current); return; }
      const r = Math.random();
      const isResist = r < resistChance[Math.min(w - 1, 4)];
      // Golden bonus: 5% chance from wave 3+
      const isGolden = !isResist && w >= 3 && Math.random() < 0.08;

      let word;
      if (isGolden) {
        word = GOLDEN_EMOTIONS[Math.floor(Math.random() * GOLDEN_EMOTIONS.length)];
      } else if (isResist) {
        word = EMOTION_ITEMS.resist[Math.floor(Math.random() * EMOTION_ITEMS.resist.length)];
      } else {
        word = EMOTION_ITEMS.accept[Math.floor(Math.random() * EMOTION_ITEMS.accept.length)];
      }

      const left = 5 + Math.random() * 75;
      const id = ++idRef.current;
      const isAccept = !isResist;
      if (isAccept) setTotalAccept(n => n + 1);

      setItems(prev => [...prev, { id, word, isAccept, isGolden, left, tapped: false, speed: fallSpeed }]);
      setTimeout(() => {
        setItems(prev => {
          const item = prev.find(i => i.id === id);
          if (item && !item.tapped && item.isAccept) {
            // Missed a positive emotion = lose life
            livesRef.current -= 1;
            setLives(livesRef.current);
            if (livesRef.current <= 0) {
              clearInterval(intervalRef.current);
              clearInterval(timerRef.current);
              setPhase('done');
            }
          }
          return prev.filter(i => i.id !== id);
        });
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
    const burstColor = item.isGolden ? '#fbbf24' : item.isAccept ? '#4ade80' : '#ef4444';
    setBursts(prev => [...prev, { id: bId, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, color: burstColor }]);
    setTimeout(() => setBursts(prev => prev.filter(b => b.id !== bId)), 500);

    if (item.isAccept) {
      const mult = 1 + combo * 0.15;
      const basePts = item.isGolden ? 50 : 15;
      const pts = Math.round(basePts * mult);
      setScore(s => s + pts);
      setCatches(c => c + 1);
      const newCombo = combo + 1;
      setCombo(newCombo);
      setMaxCombo(prev => Math.max(prev, newCombo));
      setFeedback({ type: item.isGolden ? 'golden' : 'correct', pts });
    } else {
      setScore(s => Math.max(0, s - 10));
      setCombo(0);
      livesRef.current -= 1;
      setLives(livesRef.current);
      setFeedback({ type: 'wrong', pts: 0 });
      if (livesRef.current <= 0) {
        clearInterval(intervalRef.current);
        clearInterval(timerRef.current);
        setTimeout(() => setPhase('done'), 200);
      }
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
            <p className="gs-desc">ポジティブ感情をキャッチ!<br/>ネガティブはスルー! 逃すとライフ減!<br/>5ウェーブ制。金色は高得点!</p>
            <button className="gs-start-btn" onClick={startGame}>スタート</button>
          </div>
        )}
        {phase === 'playing' && (
          <div className="gs-play-field">
            <div className="pend-hud">
              <span className="pend-score">{score}pt</span>
              <ComboDisplay combo={combo} multiplier={1 + combo * 0.15} />
              <span className="pend-wave">W{wave}/5</span>
              <span className="gs-lives">{'❤️'.repeat(Math.max(0, lives))}</span>
              <span className="pend-time">{timeLeft}s</span>
            </div>
            <div className="pend-arena emotion-arena">
              {items.map(item => (
                <div
                  key={item.id}
                  className={`emotion-item ${item.isGolden ? 'golden' : item.isAccept ? 'accept' : 'resist'} ${item.tapped ? 'caught' : ''}`}
                  style={{ left: `${item.left}%`, animationDuration: `${item.speed}ms` }}
                  onClick={(e) => tapItem(item, e)}
                >
                  {item.isGolden ? `✦${item.word}✦` : item.word}
                </div>
              ))}
            </div>
            {feedback && <span className={`tap-feedback tap-feedback-fixed ${feedback.type === 'golden' ? 'perfect' : feedback.type === 'correct' ? 'perfect' : 'miss'}`}>
              {feedback.type === 'golden' ? `✦覚醒! +${feedback.pts}` : feedback.type === 'correct' ? `受容! +${feedback.pts}` : '抵抗! -❤️'}
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
