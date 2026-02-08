import { useState } from 'react';
import { useGameState } from './hooks/useGameState';
import Header from './components/Header';
import Navigation from './components/Navigation';
import AchievementPopup from './components/AchievementPopup';
import HomePage from './pages/HomePage';
import SlidePage from './pages/SlidePage';
import PendulumPage from './pages/PendulumPage';
import ImportancePage from './pages/ImportancePage';
import EnergyPage from './pages/EnergyPage';
import ProfilePage from './pages/ProfilePage';
import './App.css';

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const {
    state,
    earnXP,
    updateEnergy,
    logPractice,
    completeQuest,
    progressQuest,
    notification,
    dismissNotification,
    resetState,
  } = useGameState();

  const renderPage = () => {
    const commonProps = { state, earnXP, updateEnergy, logPractice, completeQuest, progressQuest };

    switch (currentPage) {
      case 'home':
        return <HomePage {...commonProps} onNavigate={setCurrentPage} />;
      case 'slide':
        return <SlidePage {...commonProps} />;
      case 'pendulum':
        return <PendulumPage {...commonProps} />;
      case 'importance':
        return <ImportancePage {...commonProps} />;
      case 'energy':
        return <EnergyPage {...commonProps} />;
      case 'profile':
        return <ProfilePage state={state} resetState={resetState} />;
      default:
        return <HomePage {...commonProps} onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="app">
      <Header
        player={state.player}
        streak={state.streak}
        energy={state.energy}
      />
      <main className="main-content">
        {renderPage()}
      </main>
      <Navigation currentPage={currentPage} onNavigate={setCurrentPage} />
      <AchievementPopup
        achievement={notification}
        onDismiss={dismissNotification}
      />
    </div>
  );
}
