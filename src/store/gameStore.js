const KEY = 'aos_state';

const TITLES = [
  '目覚めし者', '観察者', '意識の探求者', '静寂の聴者',
  '流れの旅人', '気づきの守護者', '意図の使い手',
  '現実の設計者', '意識の達人', '次元の旅人',
  '無限の創造者', '超越者',
];

export function getTitle(level) {
  return TITLES[Math.min(level - 1, TITLES.length - 1)] || '超越者';
}

export function load() {
  const today = new Date().toDateString();
  try {
    const s = localStorage.getItem(KEY);
    if (s) {
      const p = JSON.parse(s);
      if (p.todayDate !== today) {
        p.todayDoorways = [];
        p.todayDate = today;
      }
      if (!p.wisdomSeen) p.wisdomSeen = [];
      return p;
    }
  } catch {}
  return {
    level: 1, xp: 0, xpNext: 80,
    streak: 0, bestStreak: 0, lastDate: null,
    totalActions: 0,
    todayDoorways: [],
    todayDate: today,
    wisdomSeen: [],
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
