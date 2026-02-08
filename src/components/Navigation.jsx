import { useState } from 'react';

const tabs = [
  { id: 'home', label: 'ホーム', icon: '🏠' },
  { id: 'slide', label: 'スライド', icon: '🎬' },
  { id: 'pendulum', label: '振り子', icon: '🔔' },
  { id: 'importance', label: '重要性', icon: '⚖️' },
  { id: 'energy', label: 'エネルギー', icon: '⚡' },
  { id: 'profile', label: 'プロフィール', icon: '👤' },
];

export default function Navigation({ currentPage, onNavigate }) {
  return (
    <nav className="navigation">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`nav-tab ${currentPage === tab.id ? 'active' : ''}`}
          onClick={() => onNavigate(tab.id)}
        >
          <span className="nav-icon">{tab.icon}</span>
          <span className="nav-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
