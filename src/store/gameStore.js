// Transurfing Practice App - Game State Store
// Uses localStorage for persistence

const STORAGE_KEY = 'transurfing_game_state';

const DEFAULT_STATE = {
  // Player profile
  player: {
    name: 'トランサーファー',
    level: 1,
    xp: 0,
    xpToNext: 100,
    title: '目覚めし者',
    createdAt: null,
  },
  // Streak tracking
  streak: {
    current: 0,
    best: 0,
    lastPracticeDate: null,
  },
  // Energy level (0-100)
  energy: {
    current: 50,
    history: [],
  },
  // Daily quests
  dailyQuests: {
    date: null,
    quests: [],
    completed: 0,
  },
  // Practice logs
  practices: {
    slide: [],        // Slide visualization sessions
    pendulum: [],     // Pendulum detection logs
    importance: [],   // Importance reduction exercises
    gratitude: [],    // Gratitude entries
    amalgam: [],      // Target slide amalgam entries
  },
  // Achievements
  achievements: [],
  // Stats
  stats: {
    totalSessions: 0,
    totalMinutes: 0,
    pendulumsCaught: 0,
    slidesVisualized: 0,
    gratitudeEntries: 0,
    importanceReduced: 0,
  },
  // Settings
  settings: {
    notifications: true,
    darkMode: true,
    language: 'ja',
  },
};

export function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_STATE, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to load state:', e);
  }
  return { ...DEFAULT_STATE, player: { ...DEFAULT_STATE.player, createdAt: new Date().toISOString() } };
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save state:', e);
  }
}

export function addXP(state, amount) {
  const newState = { ...state };
  newState.player = { ...newState.player };
  newState.player.xp += amount;

  while (newState.player.xp >= newState.player.xpToNext) {
    newState.player.xp -= newState.player.xpToNext;
    newState.player.level += 1;
    newState.player.xpToNext = Math.floor(newState.player.xpToNext * 1.5);
    newState.player.title = getLevelTitle(newState.player.level);
  }

  return newState;
}

export function getLevelTitle(level) {
  const titles = [
    '目覚めし者',           // 1: The Awakened
    '観察者',              // 2: The Observer
    '振り子の識者',         // 3: Pendulum Knower
    '重要性の解放者',       // 4: Importance Releaser
    'スライドの実践者',     // 5: Slide Practitioner
    '選択肢の流れの旅人',   // 6: Alternatives Flow Traveler
    'エネルギーの守護者',   // 7: Energy Guardian
    '意図の使い手',        // 8: Intention Wielder
    '現実の設計者',        // 9: Reality Designer
    'トランサーフィンの達人', // 10: Transurfing Master
    '次元の旅人',          // 11: Dimensional Traveler
    '無限の創造者',        // 12: Infinite Creator
  ];
  return titles[Math.min(level - 1, titles.length - 1)] || '超越者';
}

export function updateStreak(state) {
  const newState = { ...state, streak: { ...state.streak } };
  const today = new Date().toDateString();
  const lastDate = newState.streak.lastPracticeDate;

  if (lastDate === today) return newState;

  if (lastDate) {
    const last = new Date(lastDate);
    const diff = Math.floor((new Date(today) - last) / (1000 * 60 * 60 * 24));
    if (diff === 1) {
      newState.streak.current += 1;
    } else if (diff > 1) {
      newState.streak.current = 1;
    }
  } else {
    newState.streak.current = 1;
  }

  newState.streak.lastPracticeDate = today;
  newState.streak.best = Math.max(newState.streak.best, newState.streak.current);
  return newState;
}

export function checkAchievements(state) {
  const newState = { ...state };
  const earned = new Set(state.achievements.map(a => a.id));
  const newAchievements = [];

  const checks = [
    { id: 'first_step', name: '最初の一歩', desc: '初めてのプラクティスを完了', icon: '🌱', check: () => state.stats.totalSessions >= 1 },
    { id: 'streak_3', name: '三日坊主突破', desc: '3日連続プラクティス', icon: '🔥', check: () => state.streak.current >= 3 },
    { id: 'streak_7', name: '一週間の継続', desc: '7日連続プラクティス', icon: '⭐', check: () => state.streak.current >= 7 },
    { id: 'streak_30', name: '月間マスター', desc: '30日連続プラクティス', icon: '🏆', check: () => state.streak.current >= 30 },
    { id: 'pendulum_10', name: '振り子ハンター', desc: '振り子を10回検知', icon: '🎯', check: () => state.stats.pendulumsCaught >= 10 },
    { id: 'pendulum_50', name: '振り子マスター', desc: '振り子を50回検知', icon: '🛡️', check: () => state.stats.pendulumsCaught >= 50 },
    { id: 'slide_10', name: 'スライドの見習い', desc: 'スライドを10回実践', icon: '🎬', check: () => state.stats.slidesVisualized >= 10 },
    { id: 'slide_50', name: 'スライドの達人', desc: 'スライドを50回実践', icon: '🌟', check: () => state.stats.slidesVisualized >= 50 },
    { id: 'gratitude_20', name: '感謝の心', desc: '感謝を20回記録', icon: '💖', check: () => state.stats.gratitudeEntries >= 20 },
    { id: 'importance_10', name: '軽やかな心', desc: '重要性を10回低減', icon: '🎈', check: () => state.stats.importanceReduced >= 10 },
    { id: 'level_5', name: '中級トランサーファー', desc: 'レベル5に到達', icon: '🌊', check: () => state.player.level >= 5 },
    { id: 'level_10', name: '上級トランサーファー', desc: 'レベル10に到達', icon: '👑', check: () => state.player.level >= 10 },
    { id: 'energy_max', name: '最高エネルギー', desc: 'エネルギーを100に到達', icon: '⚡', check: () => state.energy.current >= 100 },
    { id: 'total_100', name: '百回の実践', desc: '合計100回のプラクティス', icon: '💎', check: () => state.stats.totalSessions >= 100 },
  ];

  for (const ach of checks) {
    if (!earned.has(ach.id) && ach.check()) {
      newAchievements.push({ ...ach, earnedAt: new Date().toISOString() });
    }
  }

  if (newAchievements.length > 0) {
    newState.achievements = [...state.achievements, ...newAchievements];
  }

  return { state: newState, newAchievements };
}

export const DAILY_QUEST_TEMPLATES = [
  { type: 'slide', action: 'スライドを3分間視覚化する', xp: 30, target: 1 },
  { type: 'pendulum', action: '振り子を3つ検知する', xp: 25, target: 3 },
  { type: 'gratitude', action: '感謝を5つ記録する', xp: 20, target: 5 },
  { type: 'importance', action: '重要性を2つ低減する', xp: 25, target: 2 },
  { type: 'slide', action: 'ターゲットスライドを詳細化する', xp: 35, target: 1 },
  { type: 'energy', action: 'エネルギーレベルを記録する', xp: 15, target: 1 },
  { type: 'amalgam', action: 'アマルガムに1つ追加する', xp: 20, target: 1 },
  { type: 'pendulum', action: '振り子の影響を記録する', xp: 20, target: 1 },
];

export function generateDailyQuests(state) {
  const today = new Date().toDateString();
  if (state.dailyQuests.date === today) return state;

  const shuffled = [...DAILY_QUEST_TEMPLATES].sort(() => Math.random() - 0.5);
  const quests = shuffled.slice(0, 4).map((q, i) => ({
    ...q,
    id: i,
    progress: 0,
    completed: false,
  }));

  return {
    ...state,
    dailyQuests: {
      date: today,
      quests,
      completed: 0,
    },
  };
}
