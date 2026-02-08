import { useState } from 'react';
import { ENERGY_ACTIVITIES, ENERGY_DRAINS, GRATITUDE_PROMPTS } from '../data/transurfingData';

export default function EnergyPage({ state, earnXP, logPractice, progressQuest, updateEnergy }) {
  const [tab, setTab] = useState('energy'); // energy, gratitude
  const [gratitudeText, setGratitudeText] = useState('');
  const [gratitudePrompt, setGratitudePrompt] = useState(
    GRATITUDE_PROMPTS[Math.floor(Math.random() * GRATITUDE_PROMPTS.length)]
  );
  const [showFeedback, setShowFeedback] = useState(null);

  const logActivity = (activity) => {
    updateEnergy(activity.energy);
    if (activity.xp) {
      earnXP(activity.xp, activity.name);
    }
    progressQuest('energy');
    setShowFeedback({
      name: activity.name,
      energy: activity.energy,
      icon: activity.icon,
    });
    setTimeout(() => setShowFeedback(null), 2000);
  };

  const logDrain = (drain) => {
    updateEnergy(drain.energy);
    setShowFeedback({
      name: drain.name,
      energy: drain.energy,
      icon: drain.icon,
    });
    setTimeout(() => setShowFeedback(null), 2000);
  };

  const submitGratitude = () => {
    if (!gratitudeText.trim()) return;
    earnXP(10, '感謝の記録');
    updateEnergy(8);
    logPractice('gratitude', {
      text: gratitudeText,
      prompt: gratitudePrompt,
    });
    progressQuest('gratitude');
    setGratitudeText('');
    setGratitudePrompt(GRATITUDE_PROMPTS[Math.floor(Math.random() * GRATITUDE_PROMPTS.length)]);
    setShowFeedback({
      name: '感謝を記録',
      energy: 8,
      icon: '🙏',
    });
    setTimeout(() => setShowFeedback(null), 2000);
  };

  const getEnergyColor = (value) => {
    if (value > 70) return '#4ade80';
    if (value > 40) return '#fbbf24';
    return '#ef4444';
  };

  const getEnergyEmoji = (value) => {
    if (value > 80) return '🌟';
    if (value > 60) return '😊';
    if (value > 40) return '😐';
    if (value > 20) return '😴';
    return '😵';
  };

  return (
    <div className="page energy-page page-enter">
      {/* Feedback Toast */}
      {showFeedback && (
        <div className={`energy-toast ${showFeedback.energy > 0 ? 'positive' : 'negative'}`}>
          <span>{showFeedback.icon}</span>
          <span>{showFeedback.name}</span>
          <span className="toast-energy">
            {showFeedback.energy > 0 ? '+' : ''}{showFeedback.energy}
          </span>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="tab-switcher">
        <button
          className={`tab-btn ${tab === 'energy' ? 'active' : ''}`}
          onClick={() => setTab('energy')}
        >
          ⚡ エネルギー管理
        </button>
        <button
          className={`tab-btn ${tab === 'gratitude' ? 'active' : ''}`}
          onClick={() => setTab('gratitude')}
        >
          🙏 感謝の実践
        </button>
      </div>

      {tab === 'energy' ? (
        <>
          {/* Energy Gauge */}
          <div className="energy-gauge">
            <div className="gauge-circle">
              <svg viewBox="0 0 120 120" className="gauge-svg">
                <circle cx="60" cy="60" r="54" fill="none" stroke="#1e293b" strokeWidth="8" />
                <circle
                  cx="60" cy="60" r="54"
                  fill="none"
                  stroke={getEnergyColor(state.energy.current)}
                  strokeWidth="8"
                  strokeDasharray={`${(state.energy.current / 100) * 339.3} 339.3`}
                  strokeLinecap="round"
                  transform="rotate(-90 60 60)"
                  className="gauge-fill"
                />
              </svg>
              <div className="gauge-center">
                <span className="gauge-emoji">{getEnergyEmoji(state.energy.current)}</span>
                <span className="gauge-value">{state.energy.current}</span>
              </div>
            </div>
            <p className="gauge-label">自由エネルギーレベル</p>
          </div>

          {/* Energy History Chart */}
          {state.energy.history.length > 1 && (
            <div className="energy-chart">
              <h3 className="section-title">📈 エネルギー推移</h3>
              <div className="chart-container">
                <div className="chart-bars">
                  {state.energy.history.slice(-14).map((entry, i) => (
                    <div key={i} className="chart-bar-wrapper">
                      <div
                        className="chart-bar"
                        style={{
                          height: `${entry.value}%`,
                          background: getEnergyColor(entry.value),
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Energy Boosters */}
          <div className="section">
            <h3 className="section-title">🌿 エネルギーを充電</h3>
            <div className="activity-grid">
              {ENERGY_ACTIVITIES.map((a, i) => (
                <button
                  key={i}
                  className="activity-card boost"
                  onClick={() => logActivity(a)}
                >
                  <span className="activity-icon">{a.icon}</span>
                  <span className="activity-name">{a.name}</span>
                  <span className="activity-energy positive">+{a.energy}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Energy Drains */}
          <div className="section">
            <h3 className="section-title">⚠️ エネルギー消耗を記録</h3>
            <p className="section-desc">
              気づきのために記録します。検知すること自体が防御になります。
            </p>
            <div className="activity-grid">
              {ENERGY_DRAINS.map((d, i) => (
                <button
                  key={i}
                  className="activity-card drain"
                  onClick={() => logDrain(d)}
                >
                  <span className="activity-icon">{d.icon}</span>
                  <span className="activity-name">{d.name}</span>
                  <span className="activity-energy negative">{d.energy}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Gratitude Practice */}
          <div className="gratitude-section">
            <div className="gratitude-prompt-card">
              <span className="gratitude-icon">🙏</span>
              <p className="gratitude-prompt-text">{gratitudePrompt}</p>
              <button
                className="btn-small"
                onClick={() => setGratitudePrompt(
                  GRATITUDE_PROMPTS[Math.floor(Math.random() * GRATITUDE_PROMPTS.length)]
                )}
              >
                🔄 別のプロンプト
              </button>
            </div>

            <textarea
              className="gratitude-input"
              value={gratitudeText}
              onChange={(e) => setGratitudeText(e.target.value)}
              placeholder="感謝を自由に書いてください..."
              rows={4}
            />

            <button
              className="btn-primary btn-full"
              onClick={submitGratitude}
              disabled={!gratitudeText.trim()}
            >
              🙏 感謝を記録する (+10XP, +8エネルギー)
            </button>
          </div>

          {/* Gratitude History */}
          {state.practices.gratitude.length > 0 && (
            <div className="section">
              <h3 className="section-title">
                💖 感謝の記録 ({state.stats.gratitudeEntries}件)
              </h3>
              <div className="gratitude-list">
                {state.practices.gratitude.slice(-10).reverse().map((entry, i) => (
                  <div key={i} className="gratitude-entry">
                    <p className="gratitude-text">{entry.text}</p>
                    <span className="gratitude-date">
                      {new Date(entry.date).toLocaleDateString('ja-JP')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
