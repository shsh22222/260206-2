import { useState } from 'react';
import { PENDULUM_TYPES } from '../data/transurfingData';

export default function PendulumPage({ state, earnXP, logPractice, progressQuest, updateEnergy }) {
  const [mode, setMode] = useState('detect'); // detect, detail, log, custom
  const [selectedPendulum, setSelectedPendulum] = useState(null);
  const [intensity, setIntensity] = useState(5);
  const [reaction, setReaction] = useState('');
  const [customName, setCustomName] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [showTip, setShowTip] = useState(false);

  const detectPendulum = (pendulum) => {
    setSelectedPendulum(pendulum);
    setMode('detail');
    setShowTip(false);
  };

  const logPendulumDetection = () => {
    earnXP(20, '振り子検知');
    updateEnergy(5);
    logPractice('pendulum', {
      pendulumId: selectedPendulum.id,
      name: selectedPendulum.name,
      intensity,
      reaction,
    });
    progressQuest('pendulum');
    setMode('log');
  };

  const logCustomPendulum = () => {
    if (!customName.trim()) return;
    earnXP(25, 'カスタム振り子検知');
    updateEnergy(5);
    logPractice('pendulum', {
      pendulumId: 'custom',
      name: customName,
      description: customDesc,
      intensity,
      reaction,
    });
    progressQuest('pendulum');
    setMode('log');
  };

  const reset = () => {
    setMode('detect');
    setSelectedPendulum(null);
    setIntensity(5);
    setReaction('');
    setCustomName('');
    setCustomDesc('');
  };

  if (mode === 'detect') {
    return (
      <div className="page pendulum-page page-enter">
        <div className="page-header">
          <h2>🔔 振り子ディテクター</h2>
          <p className="page-desc">
            今あなたに影響を与えている振り子を検知しましょう。
            気づくことが最初の一歩です。振り子に気づけば、エネルギーを奪われなくなります。
          </p>
        </div>

        <div className="pendulum-grid">
          {PENDULUM_TYPES.map(p => (
            <button
              key={p.id}
              className="pendulum-card"
              onClick={() => detectPendulum(p)}
            >
              <span className="pendulum-icon">{p.icon}</span>
              <span className="pendulum-name">{p.name}</span>
              <span className="pendulum-energy">{p.energy} エネルギー</span>
            </button>
          ))}
        </div>

        <button
          className="btn-secondary btn-full"
          onClick={() => setMode('custom')}
        >
          ➕ カスタム振り子を追加
        </button>

        {/* Detection Log */}
        {state.practices.pendulum.length > 0 && (
          <div className="section">
            <h3 className="section-title">
              📊 検知ログ（{state.stats.pendulumsCaught}回検知）
            </h3>
            <div className="detection-stats">
              {Object.entries(
                state.practices.pendulum.reduce((acc, p) => {
                  acc[p.name] = (acc[p.name] || 0) + 1;
                  return acc;
                }, {})
              )
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([name, count]) => (
                  <div key={name} className="detection-stat">
                    <span className="detection-name">{name}</span>
                    <div className="detection-bar-container">
                      <div
                        className="detection-bar"
                        style={{
                          width: `${(count / state.stats.pendulumsCaught) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="detection-count">{count}回</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (mode === 'detail') {
    return (
      <div className="page pendulum-detail page-enter">
        <div className="pendulum-detail-header">
          <span className="pendulum-icon-large">{selectedPendulum.icon}</span>
          <h2>{selectedPendulum.name}</h2>
          <p className="pendulum-description">{selectedPendulum.description}</p>
        </div>

        <div className="intensity-section">
          <h3>影響の強さ: {intensity}/10</h3>
          <input
            type="range"
            min="1"
            max="10"
            value={intensity}
            onChange={(e) => setIntensity(Number(e.target.value))}
            className="intensity-slider"
          />
          <div className="intensity-labels">
            <span>弱い</span>
            <span>中程度</span>
            <span>強い</span>
          </div>
        </div>

        <div className="reaction-section">
          <h3>あなたの反応は？</h3>
          <div className="reaction-options">
            {['気づいて離れた', 'エネルギーを失った', '反応してしまった', '無視できた'].map(r => (
              <button
                key={r}
                className={`reaction-btn ${reaction === r ? 'active' : ''}`}
                onClick={() => setReaction(r)}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <button
          className="tip-toggle"
          onClick={() => setShowTip(!showTip)}
        >
          💡 対処法を見る
        </button>
        {showTip && (
          <div className="tip-box">
            <p>{selectedPendulum.tip}</p>
          </div>
        )}

        <div className="detail-actions">
          <button className="btn-secondary" onClick={reset}>
            戻る
          </button>
          <button
            className="btn-primary"
            onClick={logPendulumDetection}
            disabled={!reaction}
          >
            🛡️ 検知を記録する
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'custom') {
    return (
      <div className="page pendulum-custom page-enter">
        <h2>➕ カスタム振り子</h2>
        <p className="page-desc">
          あなたの生活で感じている独自の振り子を記録しましょう
        </p>

        <div className="form-group">
          <label>振り子の名前</label>
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="例: 通勤電車の振り子"
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label>説明</label>
          <textarea
            value={customDesc}
            onChange={(e) => setCustomDesc(e.target.value)}
            placeholder="どんな影響を感じますか？"
            className="form-input"
            rows={3}
          />
        </div>

        <div className="intensity-section">
          <h3>影響の強さ: {intensity}/10</h3>
          <input
            type="range"
            min="1"
            max="10"
            value={intensity}
            onChange={(e) => setIntensity(Number(e.target.value))}
            className="intensity-slider"
          />
        </div>

        <div className="reaction-section">
          <h3>あなたの反応は？</h3>
          <div className="reaction-options">
            {['気づいて離れた', 'エネルギーを失った', '反応してしまった', '無視できた'].map(r => (
              <button
                key={r}
                className={`reaction-btn ${reaction === r ? 'active' : ''}`}
                onClick={() => setReaction(r)}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="detail-actions">
          <button className="btn-secondary" onClick={reset}>戻る</button>
          <button
            className="btn-primary"
            onClick={logCustomPendulum}
            disabled={!customName.trim() || !reaction}
          >
            記録する
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'log') {
    return (
      <div className="page pendulum-log page-enter">
        <div className="complete-animation">
          <div className="complete-icon">🛡️</div>
          <h2>振り子を検知しました！</h2>
          <p className="complete-xp">+20 XP</p>
          <p className="complete-energy">+5 エネルギー</p>
          <p className="complete-message">
            気づくことが最も重要です。振り子に意識的に気づくことで、
            自動的にエネルギーを奪われなくなります。
          </p>
          <button className="btn-primary" onClick={reset}>
            続ける
          </button>
        </div>
      </div>
    );
  }
}
