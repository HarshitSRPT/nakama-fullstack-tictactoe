import React from 'react';
import { useMatch } from '../hooks/useMatch.js';
import { CONNECTION_STATE } from '../constants/opcodes.js';

const StatusBar = () => {
  const { 
    connectionState, 
    currentTurn, 
    playerMark, 
    isMyTurn, 
    winner, 
    drawStatus, 
    opponent,
    opponentLeft,
    isRematchPending,
    timeout,
    gameMode,
    me
  } = useMatch();

  let statusText = "";
  let subText = "";

  if (connectionState === CONNECTION_STATE.IDLE) {
    statusText = "Ready to Play";
    subText = "Select a mode and find a match";
  } else if (connectionState === CONNECTION_STATE.CONNECTING) {
    statusText = "Connecting to Server...";
  } else if (connectionState === CONNECTION_STATE.MATCHMAKING) {
    statusText = "Searching for opponent...";
    subText = gameMode === 'timer' ? '⚡ Timed Mode' : '♟ Classic Mode';
  } else if (connectionState === CONNECTION_STATE.IN_MATCH) {
    if (opponentLeft) {
      statusText = "Opponent disconnected";
      subText = "You Win by default!";
    } else if (isRematchPending) {
      if (timeout) {
        statusText = winner === playerMark ? "Opponent lost on time" : "You lost on time";
      } else {
        statusText = winner === playerMark ? "You Won the Round! 🎉" : drawStatus ? "It's a Draw! 🤝" : "You Lost 😢";
      }
      subText = "Next round starting...";
    } else {
      statusText = isMyTurn ? "Your Turn" : "Opponent's Turn";
      if (!opponent) statusText = "Waiting for opponent...";
      subText = `You are playing as ${playerMark}`;
    }
  } else if (connectionState === CONNECTION_STATE.DISCONNECTED) {
    statusText = "Disconnected";
    subText = "Please refresh to reconnect";
  }

  return (
    <div className="status-bar">
      <div className="status-header">{statusText}</div>
      <div className="status-sub">{subText}</div>
      
      {connectionState === CONNECTION_STATE.IN_MATCH && !opponentLeft && (
        <div className="opponent-status">
          <span className="pulse-indicator">●</span>
          {opponent ? `Opponent Connected` : `Waiting for opponent...`}
        </div>
      )}
    </div>
  );
};

export default StatusBar;
