import React from 'react';
import Board from '../components/Board.jsx';
import StatusBar from '../components/StatusBar.jsx';
import { useMatch } from '../hooks/useMatch.js';
import { CONNECTION_STATE } from '../constants/opcodes.js';

const ModernLayout = () => {
  const { connectionState, findMatch, cancelMatchmaking, leaveMatch } = useMatch();

  return (
    <div className="game-container layout-modern">
      <div className="board-section">
        {connectionState === CONNECTION_STATE.IN_MATCH ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
            <Board />
            <button className="find-match-btn" onClick={leaveMatch} style={{ backgroundColor: "var(--secondary-color)" }}>
              Leave Game
            </button>
          </div>
        ) : (
          <div className="placeholder-state" style={{ textAlign: "center", paddingTop: "5rem" }}>
            <h2>Enter the Arena</h2>
            <p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>Prove your tactical superiority</p>
            <button 
              className="find-match-btn" 
              onClick={connectionState === CONNECTION_STATE.MATCHMAKING ? cancelMatchmaking : findMatch}
              style={connectionState === CONNECTION_STATE.MATCHMAKING ? { backgroundColor: "var(--secondary-color)" } : {}}
            >
              {connectionState === CONNECTION_STATE.MATCHMAKING ? "Cancel Search" : "Find Match"}
            </button>
          </div>
        )}
      </div>
      <div className="sidebar">
        <StatusBar />
        <div style={{ marginTop: "2rem", borderTop: "1px solid var(--cell-hover)", paddingTop: "1rem" }}>
          <h3>Leaderboard</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Coming soon to complete the scalable vision...</p>
        </div>
      </div>
    </div>
  );
};
export default ModernLayout;
