const KEY = 'ts_state';

const TITLES = [
  '目覚めし者', '観察者', '振り子の識者', 'スライドの実践者',
  '流れの旅人', 'エネルギーの守護者', '意図の使い手',
  '現実の設計者', 'トランサーフィンの達人', '次元の旅人',
  '無限の創造者', '超越者',
];

export function getTitle(level) {
  return TITLES[Math.min(level - 1, TITLES.length - 1)] || '超越者';
}

export function load() {
  try {
    const s = localStorage.getItem(KEY);
    if (s) return JSON.parse(s);
  } catch {}
  return {
    level: 1, xp: 0, xpNext: 80,
    streak: 0, bestStreak: 0, lastDate: null,
    totalActions: 0,
    wave: 50,
    waveHistory: [],
    cardsSeen: [],
    shiftsCompleted: 0,
    resetsCompleted: 0,
  };
}

export function save(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}

export function addXP(state, amount) {
  const s = { ...state, xp: state.xp + amount, totalActions: state.totalActions + 1 };
  while (s.xp >= s.xpNext) {
    s.xp -= s.xpNext;
    s.level += 1;
    s.xpNext = Math.floor(s.xpNext * 1.4);
  }
  // streak
  const today = new Date().toDateString();
  if (s.lastDate !== today) {
    const last = s.lastDate ? new Date(s.lastDate) : null;
    const diff = last ? Math.floor((new Date(today) - last) / 86400000) : 999;
    s.streak = diff === 1 ? s.streak + 1 : 1;
    s.bestStreak = Math.max(s.bestStreak, s.streak);
    s.lastDate = today;
  }
  save(s);
  return s;
}
