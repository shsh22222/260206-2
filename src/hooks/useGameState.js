import { useState, useCallback, useEffect } from 'react';
import {
  loadState,
  saveState,
  addXP,
  updateStreak,
  checkAchievements,
  generateDailyQuests,
} from '../store/gameStore';

export function useGameState() {
  const [state, setState] = useState(() => {
    let s = loadState();
    s = generateDailyQuests(s);
    return s;
  });
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const earnXP = useCallback((amount, reason) => {
    setState(prev => {
      let newState = addXP(prev, amount);
      newState = updateStreak(newState);
      const { state: checked, newAchievements } = checkAchievements(newState);
      if (newAchievements.length > 0) {
        setNotification({
          type: 'achievement',
          data: newAchievements[0],
        });
      }
      return checked;
    });
  }, []);

  const updateEnergy = useCallback((delta) => {
    setState(prev => {
      const newEnergy = Math.max(0, Math.min(100, prev.energy.current + delta));
      const entry = { value: newEnergy, date: new Date().toISOString() };
      return {
        ...prev,
        energy: {
          current: newEnergy,
          history: [...prev.energy.history.slice(-29), entry],
        },
      };
    });
  }, []);

  const logPractice = useCallback((type, data) => {
    setState(prev => {
      const entry = { ...data, date: new Date().toISOString() };
      const practices = { ...prev.practices };
      practices[type] = [...(practices[type] || []), entry];

      const stats = { ...prev.stats };
      stats.totalSessions += 1;
      if (type === 'pendulum') stats.pendulumsCaught += 1;
      if (type === 'slide') stats.slidesVisualized += 1;
      if (type === 'gratitude') stats.gratitudeEntries += 1;
      if (type === 'importance') stats.importanceReduced += 1;

      return { ...prev, practices, stats };
    });
  }, []);

  const completeQuest = useCallback((questId) => {
    setState(prev => {
      const quests = prev.dailyQuests.quests.map(q =>
        q.id === questId ? { ...q, completed: true } : q
      );
      const completed = quests.filter(q => q.completed).length;
      return {
        ...prev,
        dailyQuests: { ...prev.dailyQuests, quests, completed },
      };
    });
  }, []);

  const progressQuest = useCallback((type) => {
    setState(prev => {
      const quests = prev.dailyQuests.quests.map(q => {
        if (q.type === type && !q.completed) {
          const progress = q.progress + 1;
          const completed = progress >= q.target;
          return { ...q, progress, completed };
        }
        return q;
      });
      const completed = quests.filter(q => q.completed).length;
      return {
        ...prev,
        dailyQuests: { ...prev.dailyQuests, quests, completed },
      };
    });
  }, []);

  const dismissNotification = useCallback(() => {
    setNotification(null);
  }, []);

  const resetState = useCallback(() => {
    localStorage.removeItem('transurfing_game_state');
    let s = loadState();
    s = generateDailyQuests(s);
    setState(s);
  }, []);

  return {
    state,
    earnXP,
    updateEnergy,
    logPractice,
    completeQuest,
    progressQuest,
    notification,
    dismissNotification,
    resetState,
  };
}
