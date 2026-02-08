export default function AchievementPopup({ achievement, onDismiss }) {
  if (!achievement) return null;

  return (
    <div className="achievement-overlay" onClick={onDismiss}>
      <div className="achievement-popup" onClick={e => e.stopPropagation()}>
        <div className="achievement-glow" />
        <div className="achievement-icon-large">{achievement.data.icon}</div>
        <h2 className="achievement-title">実績解除！</h2>
        <h3 className="achievement-name">{achievement.data.name}</h3>
        <p className="achievement-desc">{achievement.data.desc}</p>
        <button className="btn-primary" onClick={onDismiss}>
          素晴らしい！
        </button>
      </div>
    </div>
  );
}
