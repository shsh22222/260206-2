export default function Header({ player, streak, energy }) {
  const xpPercent = (player.xp / player.xpToNext) * 100;

  return (
    <header className="header">
      <div className="header-top">
        <div className="header-title">
          <h1>Transurfing</h1>
          <span className="header-subtitle">現実のナビゲーター</span>
        </div>
        <div className="header-streak">
          {streak.current > 0 && (
            <span className="streak-badge">
              🔥 {streak.current}日
            </span>
          )}
        </div>
      </div>

      <div className="header-stats">
        <div className="player-info">
          <span className="player-level">Lv.{player.level}</span>
          <span className="player-title">{player.title}</span>
        </div>
        <div className="xp-bar-container">
          <div className="xp-bar">
            <div className="xp-fill" style={{ width: `${xpPercent}%` }} />
          </div>
          <span className="xp-text">{player.xp}/{player.xpToNext} XP</span>
        </div>
        <div className="energy-mini">
          <span className="energy-icon">⚡</span>
          <div className="energy-bar-mini">
            <div
              className="energy-fill-mini"
              style={{
                width: `${energy.current}%`,
                background: energy.current > 60 ? '#4ade80' : energy.current > 30 ? '#fbbf24' : '#ef4444',
              }}
            />
          </div>
          <span className="energy-value">{energy.current}</span>
        </div>
      </div>
    </header>
  );
}
