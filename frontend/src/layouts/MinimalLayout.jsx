import React from 'react';
import Board from '../components/Board.jsx';
import StatusBar from '../components/StatusBar.jsx';
import { useMatch } from '../hooks/useMatch.js';
import { CONNECTION_STATE } from '../constants/opcodes.js';

const MinimalLayout = () => {
  const { connectionState, findMatch, cancelMatchmaking, leaveMatch } = useMatch();
  
  return (
    <div className="game-container">
      <StatusBar />
      {connectionState === CONNECTION_STATE.IDLE && (
        <button className="find-match-btn" onClick={findMatch}>
          Find Match
        </button>
      )}
      {connectionState === CONNECTION_STATE.MATCHMAKING && (
        <button className="find-match-btn" onClick={cancelMatchmaking} style={{ backgroundColor: "var(--secondary-color)" }}>
          Cancel Search
        </button>
      )}
      {connectionState === CONNECTION_STATE.IN_MATCH && (
        <>
          <Board />
          <button className="find-match-btn" onClick={leaveMatch} style={{ backgroundColor: "var(--secondary-color)", marginTop: '1rem' }}>
            Leave Game
          </button>
        </>
      )}
    </div>
  );
};
export default MinimalLayout;
