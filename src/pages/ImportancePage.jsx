import { useState } from 'react';
import { IMPORTANCE_SCENARIOS } from '../data/transurfingData';

export default function ImportancePage({ state, earnXP, logPractice, progressQuest, updateEnergy }) {
  const [mode, setMode] = useState('select'); // select, practice, custom, complete
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [step, setStep] = useState(0); // 0: identify, 1: inner, 2: outer, 3: reframe
  const [innerLevel, setInnerLevel] = useState(8);
  const [outerLevel, setOuterLevel] = useState(8);
  const [newInnerLevel, setNewInnerLevel] = useState(3);
  const [newOuterLevel, setNewOuterLevel] = useState(3);
  const [customSituation, setCustomSituation] = useState('');
  const [customInner, setCustomInner] = useState('');
  const [customOuter, setCustomOuter] = useState('');
  const [customReframe, setCustomReframe] = useState('');
  const [showResult, setShowResult] = useState(false);

  const selectScenario = (scenario) => {
    setSelectedScenario(scenario);
    setMode('practice');
    setStep(0);
    setInnerLevel(8);
    setOuterLevel(8);
    setNewInnerLevel(3);
    setNewOuterLevel(3);
  };

  const nextStep = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      completePractice();
    }
  };

  const completePractice = () => {
    const reduction = (innerLevel - newInnerLevel) + (outerLevel - newOuterLevel);
    const bonusXP = Math.max(0, reduction);
    earnXP(selectedScenario.xp + bonusXP, '重要性低減');
    updateEnergy(10);
    logPractice('importance', {
      scenarioId: selectedScenario.id,
      situation: selectedScenario.situation,
      innerBefore: innerLevel,
      innerAfter: newInnerLevel,
      outerBefore: outerLevel,
      outerAfter: newOuterLevel,
    });
    progressQuest('importance');
    setMode('complete');
  };

  const completeCustom = () => {
    if (!customSituation.trim()) return;
    earnXP(20, 'カスタム重要性低減');
    updateEnergy(10);
    logPractice('importance', {
      scenarioId: 'custom',
      situation: customSituation,
      innerImportance: customInner,
      outerImportance: customOuter,
      reframe: customReframe,
      innerBefore: innerLevel,
      innerAfter: newInnerLevel,
      outerBefore: outerLevel,
      outerAfter: newOuterLevel,
    });
    progressQuest('importance');
    setMode('complete');
  };

  const reset = () => {
    setMode('select');
    setSelectedScenario(null);
    setStep(0);
    setCustomSituation('');
    setCustomInner('');
    setCustomOuter('');
    setCustomReframe('');
  };

  if (mode === 'select') {
    return (
      <div className="page importance-page page-enter">
        <div className="page-header">
          <h2>⚖️ 重要性リデューサー</h2>
          <p className="page-desc">
            過剰な重要性は「バランスの力」を呼び寄せ、望みを遠ざけます。
            重要性を下げるゲームで、軽やかさを取り戻しましょう。
          </p>
        </div>

        <div className="importance-explanation">
          <div className="imp-type">
            <h4>🔵 内的重要性</h4>
            <p>自分自身に対する過大評価・過小評価</p>
          </div>
          <div className="imp-type">
            <h4>🔴 外的重要性</h4>
            <p>外の世界に対する過度の価値づけ</p>
          </div>
        </div>

        <h3 className="section-title">シナリオを選択</h3>
        <div className="scenario-list">
          {IMPORTANCE_SCENARIOS.map(s => (
            <button
              key={s.id}
              className="scenario-card"
              onClick={() => selectScenario(s)}
            >
              <span className="scenario-situation">{s.situation}</span>
              <span className="scenario-xp">+{s.xp}XP</span>
            </button>
          ))}
        </div>

        <button
          className="btn-secondary btn-full"
          onClick={() => setMode('custom')}
        >
          ✏️ 自分の状況を入力
        </button>
      </div>
    );
  }

  if (mode === 'practice') {
    const steps = [
      {
        title: '状況を確認',
        content: (
          <div className="practice-step">
            <div className="scenario-display">
              <h3>{selectedScenario.situation}</h3>
            </div>
            <p className="step-instruction">
              この状況について、今のあなたの重要性レベルを感じてください。
            </p>
          </div>
        ),
      },
      {
        title: '内的重要性を認識',
        content: (
          <div className="practice-step">
            <div className="importance-quote">
              <p>「{selectedScenario.innerImportance}」</p>
            </div>
            <p className="step-instruction">
              この思考パターンに気づいていますか？内的重要性のレベルを設定してください。
            </p>
            <div className="level-control">
              <span className="level-label">内的重要性</span>
              <input
                type="range"
                min="0"
                max="10"
                value={innerLevel}
                onChange={(e) => setInnerLevel(Number(e.target.value))}
                className="importance-slider inner"
              />
              <span className="level-value">{innerLevel}/10</span>
            </div>
          </div>
        ),
      },
      {
        title: '外的重要性を認識',
        content: (
          <div className="practice-step">
            <div className="importance-quote">
              <p>「{selectedScenario.outerImportance}」</p>
            </div>
            <p className="step-instruction">
              外的世界への執着を感じていますか？外的重要性のレベルを設定してください。
            </p>
            <div className="level-control">
              <span className="level-label">外的重要性</span>
              <input
                type="range"
                min="0"
                max="10"
                value={outerLevel}
                onChange={(e) => setOuterLevel(Number(e.target.value))}
                className="importance-slider outer"
              />
              <span className="level-value">{outerLevel}/10</span>
            </div>
          </div>
        ),
      },
      {
        title: 'リフレーミング',
        content: (
          <div className="practice-step">
            <div className="reframe-box">
              <p className="reframe-text">{selectedScenario.reframe}</p>
            </div>
            <div className="tip-box">
              <p>💡 {selectedScenario.tip}</p>
            </div>
            <p className="step-instruction">
              深呼吸して、重要性を手放しましょう。新しいレベルを設定してください。
            </p>
            <div className="level-control">
              <span className="level-label">新しい内的重要性</span>
              <input
                type="range"
                min="0"
                max="10"
                value={newInnerLevel}
                onChange={(e) => setNewInnerLevel(Number(e.target.value))}
                className="importance-slider inner"
              />
              <span className="level-value">{newInnerLevel}/10</span>
            </div>
            <div className="level-control">
              <span className="level-label">新しい外的重要性</span>
              <input
                type="range"
                min="0"
                max="10"
                value={newOuterLevel}
                onChange={(e) => setNewOuterLevel(Number(e.target.value))}
                className="importance-slider outer"
              />
              <span className="level-value">{newOuterLevel}/10</span>
            </div>

            <div className="reduction-preview">
              <div className="reduction-item">
                <span>内的: {innerLevel}</span>
                <span className="reduction-arrow">→</span>
                <span className="reduction-new">{newInnerLevel}</span>
              </div>
              <div className="reduction-item">
                <span>外的: {outerLevel}</span>
                <span className="reduction-arrow">→</span>
                <span className="reduction-new">{newOuterLevel}</span>
              </div>
            </div>
          </div>
        ),
      },
    ];

    return (
      <div className="page importance-practice page-enter">
        <div className="step-progress">
          {steps.map((_, i) => (
            <div key={i} className={`step-dot ${i <= step ? 'active' : ''}`} />
          ))}
        </div>

        <h2 className="step-title">{steps[step].title}</h2>
        {steps[step].content}

        <div className="practice-actions">
          <button
            className="btn-secondary"
            onClick={() => step > 0 ? setStep(step - 1) : reset()}
          >
            {step > 0 ? '戻る' : 'キャンセル'}
          </button>
          <button className="btn-primary" onClick={nextStep}>
            {step < 3 ? '次へ' : '✨ 重要性を手放す'}
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'custom') {
    return (
      <div className="page importance-custom page-enter">
        <h2>✏️ あなたの状況</h2>
        <p className="page-desc">今気になっていることの重要性を下げましょう</p>

        <div className="form-group">
          <label>状況</label>
          <textarea
            value={customSituation}
            onChange={(e) => setCustomSituation(e.target.value)}
            placeholder="今の状況を書いてください..."
            className="form-input"
            rows={2}
          />
        </div>

        <div className="form-group">
          <label>内的重要性（自分への過大/過小評価）</label>
          <textarea
            value={customInner}
            onChange={(e) => setCustomInner(e.target.value)}
            placeholder="自分に対してどう思っていますか？"
            className="form-input"
            rows={2}
          />
        </div>

        <div className="form-group">
          <label>外的重要性（外の世界への執着）</label>
          <textarea
            value={customOuter}
            onChange={(e) => setCustomOuter(e.target.value)}
            placeholder="外の世界に何を求めていますか？"
            className="form-input"
            rows={2}
          />
        </div>

        <div className="level-control">
          <span className="level-label">重要性レベル（前）</span>
          <input type="range" min="0" max="10" value={innerLevel}
            onChange={(e) => setInnerLevel(Number(e.target.value))}
            className="importance-slider" />
          <span className="level-value">{innerLevel}/10</span>
        </div>

        <div className="form-group">
          <label>リフレーミング（新しい見方）</label>
          <textarea
            value={customReframe}
            onChange={(e) => setCustomReframe(e.target.value)}
            placeholder="この状況をどう捉え直せますか？"
            className="form-input"
            rows={2}
          />
        </div>

        <div className="level-control">
          <span className="level-label">重要性レベル（後）</span>
          <input type="range" min="0" max="10" value={newInnerLevel}
            onChange={(e) => setNewInnerLevel(Number(e.target.value))}
            className="importance-slider" />
          <span className="level-value">{newInnerLevel}/10</span>
        </div>

        <div className="detail-actions">
          <button className="btn-secondary" onClick={reset}>戻る</button>
          <button
            className="btn-primary"
            onClick={completeCustom}
            disabled={!customSituation.trim()}
          >
            重要性を手放す
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'complete') {
    const reduction = (innerLevel - newInnerLevel) + (outerLevel - newOuterLevel);
    return (
      <div className="page importance-complete page-enter">
        <div className="complete-animation">
          <div className="complete-icon">🎈</div>
          <h2>重要性を手放しました！</h2>
          <p className="complete-xp">+{(selectedScenario?.xp || 20) + Math.max(0, reduction)} XP</p>
          <p className="complete-energy">+10 エネルギー</p>

          {reduction > 5 && (
            <div className="bonus-message">
              🌟 大幅な重要性低減！ボーナスXP獲得！
            </div>
          )}

          <p className="complete-message">
            重要性を下げることで、バランスの力が和らぎ、
            あなたの望みが自然と実現に向かいます。
            軽やかさを保ちましょう。
          </p>
          <button className="btn-primary" onClick={reset}>
            続ける
          </button>
        </div>
      </div>
    );
  }
}
