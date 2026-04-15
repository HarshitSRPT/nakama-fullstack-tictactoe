import React, { useState } from 'react';
import ModeSelector from './ModeSelector.jsx';
import LeaderboardPanel from '../leaderboard/LeaderboardPanel.jsx';
import { useMatch } from '../../hooks/useMatch.js';
import { CONNECTION_STATE } from '../../constants/opcodes.js';
import '../../styles/lobby.css';

const LobbyScreen = ({ username, onLogout }) => {
  const [selectedMode, setSelectedMode] = useState('classic');
  const { connectionState, findMatch, cancelMatchmaking } = useMatch();
  const matchmaking = connectionState === CONNECTION_STATE.MATCHMAKING;

  const handleStartMatchmaking = () => {
    findMatch(selectedMode);
  };

  const handleCancelMatchmaking = () => {
    cancelMatchmaking();
  };

  return (
    <div className="lobby-container">
      <header className="lobby-header">
        <div className="lobby-brand">
          <span className="lobby-logo">✕○</span>
          <h1 className="lobby-title">Tic Tac Toe Arena</h1>
        </div>
        <div className="lobby-user-section">
          <div className="lobby-user-badge">
            <span className="lobby-user-avatar">{username.charAt(0).toUpperCase()}</span>
            <span className="lobby-username">{username}</span>
          </div>
          <button id="logout-btn" className="lobby-logout-btn" onClick={onLogout}>
            Sign Out
          </button>
        </div>
      </header>

      <div className="lobby-content">
        <div className="lobby-main">
          <ModeSelector
            selectedMode={selectedMode}
            onSelectMode={setSelectedMode}
            onStartMatchmaking={handleStartMatchmaking}
            matchmaking={matchmaking}
            onCancelMatchmaking={handleCancelMatchmaking}
          />
        </div>
        <aside className="lobby-sidebar">
          <LeaderboardPanel />
        </aside>
      </div>
    </div>
  );
};

export default LobbyScreen;
