import React from 'react';
import '../../styles/lobby.css';

const ModeSelector = ({ selectedMode, onSelectMode, onStartMatchmaking, matchmaking, onCancelMatchmaking }) => {
  const modes = [
    {
      id: 'classic',
      title: 'Classic',
      icon: '♟',
      description: 'No time pressure. Pure strategy.',
      detail: 'Take your time and think through every move.',
      color: '#3b82f6'
    },
    {
      id: 'timer',
      title: 'Timed',
      icon: '⚡',
      description: '15 seconds per move. Think fast!',
      detail: 'Each turn has a 15-second deadline. Miss it and you forfeit.',
      color: '#f59e0b'
    }
  ];

  return (
    <div className="mode-selector">
      <h2 className="mode-selector-title">Choose Game Mode</h2>
      <div className="mode-cards">
        {modes.map((mode) => (
          <button
            key={mode.id}
            id={`mode-${mode.id}`}
            className={`mode-card ${selectedMode === mode.id ? 'mode-card-selected' : ''}`}
            onClick={() => {
              onSelectMode(mode.id);
              localStorage.setItem("preferred_mode", mode.id);
            }}
            style={{ '--mode-accent': mode.color }}
            disabled={matchmaking}
          >
            <div className="mode-card-icon">{mode.icon}</div>
            <h3 className="mode-card-title">{mode.title}</h3>
            <p className="mode-card-description">{mode.description}</p>
            <p className="mode-card-detail">{mode.detail}</p>
            {selectedMode === mode.id && (
              <div className="mode-card-check">✓</div>
            )}
          </button>
        ))}
      </div>

      <button
        id="start-matchmaking"
        className="lobby-action-btn"
        onClick={matchmaking ? onCancelMatchmaking : onStartMatchmaking}
        style={matchmaking ? { background: 'var(--secondary-color)' } : {}}
      >
        {matchmaking ? (
          <>
            <span className="lobby-spinner"></span>
            Cancel Search
          </>
        ) : (
          <>Find Match — {selectedMode === 'timer' ? 'Timed' : 'Classic'}</>
        )}
      </button>
    </div>
  );
};

export default ModeSelector;
