import React from 'react';
import Board from '../components/Board.jsx';
import StatusBar from '../components/StatusBar.jsx';
import { useMatch } from '../hooks/useMatch.js';
import { CONNECTION_STATE } from '../constants/opcodes.js';

const ClassicLayout = () => {
  const { connectionState, findMatch, cancelMatchmaking, leaveMatch } = useMatch();

  return (
    <div className="game-container classic-layout">
      <h1>Tic Tac Toe</h1>
      <StatusBar />
      <div style={{ margin: '2rem 0' }}>
        {connectionState === CONNECTION_STATE.IN_MATCH ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
            <Board />
            <button className="find-match-btn" onClick={leaveMatch} style={{ backgroundColor: "var(--secondary-color)" }}>
              Leave Game
            </button>
          </div>
        ) : (
          <button 
            className="find-match-btn" 
            onClick={connectionState === CONNECTION_STATE.MATCHMAKING ? cancelMatchmaking : findMatch}
            style={connectionState === CONNECTION_STATE.MATCHMAKING ? { backgroundColor: "var(--secondary-color)" } : {}}
          >
            {connectionState === CONNECTION_STATE.MATCHMAKING ? "Cancel Search" : "Find Match"}
          </button>
        )}
      </div>
    </div>
  );
};
export default ClassicLayout;
