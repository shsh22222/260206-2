import { getLevelTitle } from '../store/gameStore';

export default function ProfilePage({ state, resetState }) {
  const { player, streak, stats, achievements, energy } = state;
  const xpPercent = (player.xp / player.xpToNext) * 100;

  const allTitles = Array.from({ length: 12 }, (_, i) => ({
    level: i + 1,
    title: getLevelTitle(i + 1),
    unlocked: player.level >= i + 1,
  }));

  return (
    <div className="page profile-page page-enter">
      {/* Profile Card */}
      <div className="profile-card">
        <div className="profile-avatar">
          <div className="avatar-circle">
            <span className="avatar-level">Lv.{player.level}</span>
          </div>
          <div className="avatar-glow" />
        </div>
        <h2 className="profile-name">{player.name}</h2>
        <p className="profile-title">{player.title}</p>
        <div className="profile-xp">
          <div className="xp-bar large">
            <div className="xp-fill" style={{ width: `${xpPercent}%` }} />
          </div>
          <span>{player.xp} / {player.xpToNext} XP</span>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="section">
        <h3 className="section-title">📊 統計</h3>
        <div className="profile-stats-grid">
          <div className="profile-stat">
            <span className="profile-stat-icon">🔥</span>
            <span className="profile-stat-value">{streak.current}</span>
            <span className="profile-stat-label">現在の連続日数</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat-icon">🏅</span>
            <span className="profile-stat-value">{streak.best}</span>
            <span className="profile-stat-label">最高連続日数</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat-icon">🎯</span>
            <span className="profile-stat-value">{stats.totalSessions}</span>
            <span className="profile-stat-label">総セッション</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat-icon">🔔</span>
            <span className="profile-stat-value">{stats.pendulumsCaught}</span>
            <span className="profile-stat-label">振り子検知</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat-icon">🎬</span>
            <span className="profile-stat-value">{stats.slidesVisualized}</span>
            <span className="profile-stat-label">スライド実践</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat-icon">🙏</span>
            <span className="profile-stat-value">{stats.gratitudeEntries}</span>
            <span className="profile-stat-label">感謝の記録</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat-icon">⚖️</span>
            <span className="profile-stat-value">{stats.importanceReduced}</span>
            <span className="profile-stat-label">重要性低減</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat-icon">⚡</span>
            <span className="profile-stat-value">{energy.current}</span>
            <span className="profile-stat-label">エネルギー</span>
          </div>
        </div>
      </div>

      {/* Achievements */}
      <div className="section">
        <h3 className="section-title">🏆 実績 ({achievements.length})</h3>
        {achievements.length > 0 ? (
          <div className="achievements-grid">
            {achievements.map(ach => (
              <div key={ach.id} className="achievement-card earned">
                <span className="achievement-icon">{ach.icon}</span>
                <span className="achievement-name">{ach.name}</span>
                <span className="achievement-desc">{ach.desc}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-message">プラクティスを続けて実績を解除しましょう！</p>
        )}
      </div>

      {/* Level Titles */}
      <div className="section">
        <h3 className="section-title">🎖️ 称号一覧</h3>
        <div className="titles-list">
          {allTitles.map(t => (
            <div
              key={t.level}
              className={`title-item ${t.unlocked ? 'unlocked' : 'locked'}`}
            >
              <span className="title-level">Lv.{t.level}</span>
              <span className="title-name">
                {t.unlocked ? t.title : '???'}
              </span>
              {t.unlocked && <span className="title-check">✅</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Reset */}
      <div className="section">
        <button
          className="btn-danger"
          onClick={() => {
            if (window.confirm('本当にすべてのデータをリセットしますか？この操作は取り消せません。')) {
              resetState();
            }
          }}
        >
          🗑️ データをリセット
        </button>
      </div>
    </div>
  );
}
