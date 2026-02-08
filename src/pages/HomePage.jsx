import { useState, useEffect } from 'react';
import { TRANSURFING_TIPS } from '../data/transurfingData';

export default function HomePage({ state, onNavigate, earnXP, progressQuest }) {
  const [tipIndex, setTipIndex] = useState(0);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setTipIndex(Math.floor(Math.random() * TRANSURFING_TIPS.length));
    setAnimate(true);
  }, []);

  const tip = TRANSURFING_TIPS[tipIndex];
  const { dailyQuests, streak, energy, stats, player } = state;
  const completedQuests = dailyQuests.quests.filter(q => q.completed).length;
  const totalQuests = dailyQuests.quests.length;

  return (
    <div className={`page home-page ${animate ? 'page-enter' : ''}`}>
      {/* Welcome Section */}
      <div className="welcome-card">
        <div className="welcome-greeting">
          <h2>おかえりなさい、</h2>
          <h2 className="welcome-name">{player.title}</h2>
        </div>
        <p className="welcome-message">
          今日も選択肢の空間を意識的にナビゲートしましょう
        </p>
      </div>

      {/* Daily Tip */}
      <div className="tip-card">
        <div className="tip-icon">{tip.icon}</div>
        <div className="tip-content">
          <h3 className="tip-title">{tip.title}</h3>
          <p className="tip-text">{tip.content}</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="stats-grid">
        <div className="stat-card stat-streak">
          <span className="stat-icon">🔥</span>
          <span className="stat-value">{streak.current}</span>
          <span className="stat-label">連続日数</span>
        </div>
        <div className="stat-card stat-energy">
          <span className="stat-icon">⚡</span>
          <span className="stat-value">{energy.current}</span>
          <span className="stat-label">エネルギー</span>
        </div>
        <div className="stat-card stat-sessions">
          <span className="stat-icon">🎯</span>
          <span className="stat-value">{stats.totalSessions}</span>
          <span className="stat-label">総セッション</span>
        </div>
        <div className="stat-card stat-level">
          <span className="stat-icon">⭐</span>
          <span className="stat-value">{player.level}</span>
          <span className="stat-label">レベル</span>
        </div>
      </div>

      {/* Daily Quests */}
      <div className="section">
        <h3 className="section-title">
          📋 デイリークエスト ({completedQuests}/{totalQuests})
        </h3>
        <div className="quests-list">
          {dailyQuests.quests.map(quest => (
            <div
              key={quest.id}
              className={`quest-card ${quest.completed ? 'quest-completed' : ''}`}
            >
              <div className="quest-check">
                {quest.completed ? '✅' : '⬜'}
              </div>
              <div className="quest-info">
                <span className="quest-action">{quest.action}</span>
                <div className="quest-progress-bar">
                  <div
                    className="quest-progress-fill"
                    style={{ width: `${Math.min(100, (quest.progress / quest.target) * 100)}%` }}
                  />
                </div>
                <span className="quest-progress-text">
                  {quest.progress}/{quest.target}
                </span>
              </div>
              <span className="quest-xp">+{quest.xp}XP</span>
            </div>
          ))}
        </div>
        {completedQuests === totalQuests && totalQuests > 0 && (
          <div className="all-quests-complete">
            🎉 全クエスト完了！素晴らしい！
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="section">
        <h3 className="section-title">⚡ クイックアクション</h3>
        <div className="quick-actions">
          <button className="action-card" onClick={() => onNavigate('slide')}>
            <span className="action-icon">🎬</span>
            <span className="action-label">スライド視覚化</span>
          </button>
          <button className="action-card" onClick={() => onNavigate('pendulum')}>
            <span className="action-icon">🔔</span>
            <span className="action-label">振り子検知</span>
          </button>
          <button className="action-card" onClick={() => onNavigate('importance')}>
            <span className="action-icon">⚖️</span>
            <span className="action-label">重要性低減</span>
          </button>
          <button className="action-card" onClick={() => onNavigate('energy')}>
            <span className="action-icon">⚡</span>
            <span className="action-label">エネルギー管理</span>
          </button>
        </div>
      </div>
    </div>
  );
}
