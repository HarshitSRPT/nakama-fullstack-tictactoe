import React from 'react';
import '../../styles/comparison.css';

const ComparisonPanel = ({ comparisonData }) => {
  if (!comparisonData) return null;

  const { playerA, playerB, highlightAvgMoveTime, matchMode } = comparisonData;

  // FALLBACK: No match history yet
  const hasHistory = (playerA.wins > 0 || playerA.losses > 0 || playerA.draws > 0) ||
                    (playerB.wins > 0 || playerB.losses > 0 || playerB.draws > 0);

  // Authoritative flag: both players must have timer-mode data for speed comparison
  const bothHaveTimerStats = playerA.hasTimerStats === true && playerB.hasTimerStats === true;
  const canCompareSpeed = highlightAvgMoveTime && bothHaveTimerStats;

  // HIGHLIGHT HIERARCHY: Wins > WinRate > AvgMoveTime (only if both have timer stats)
  let strongerPlayer = null;
  if (hasHistory) {
    if (playerA.wins > playerB.wins) {
      strongerPlayer = 'A';
    } else if (playerB.wins > playerA.wins) {
      strongerPlayer = 'B';
    } else {
      // Wins are equal, check winRate
      if (playerA.winRate > playerB.winRate) {
        strongerPlayer = 'A';
      } else if (playerB.winRate > playerA.winRate) {
        strongerPlayer = 'B';
      } else if (canCompareSpeed) {
        // Tiebreaker: AvgMoveTime (lower is better) — only when both have timer data
        if (playerA.avgMoveTime < playerB.avgMoveTime) {
          strongerPlayer = 'A';
        } else if (playerB.avgMoveTime < playerA.avgMoveTime) {
          strongerPlayer = 'B';
        }
      }
    }
  }

  const renderStatRow = (label, valA, valB, suffix = '', isBetterA, isBetterB) => {
    return (
      <div className="comp-stat-row">
        <span className={`comp-val ${isBetterA ? 'comp-val-better' : ''}`}>
          {valA}{suffix}
        </span>
        <span className="comp-label">{label}</span>
        <span className={`comp-val ${isBetterB ? 'comp-val-better' : ''}`}>
          {valB}{suffix}
        </span>
      </div>
    );
  };

  return (
    <div className="comparison-panel" id="comparison-panel">
      <div className="comp-mode-badge">
        {matchMode === 'timer' ? '⚡ Timed Mode Match' : '♟ Classic Match'}
      </div>
      
      {!hasHistory && (
        <div className="comp-no-history" id="no-history-msg">
          No match history yet
        </div>
      )}

      <div className="comparison-header">
        <div className={`comp-player comp-player-a ${strongerPlayer === 'A' ? 'comparison-winner' : ''}`}>
          <div className="comp-avatar">{(playerA.username || '?').charAt(0).toUpperCase()}</div>
          <span className="comp-name">{playerA.username || 'Anonymous'}</span>
          {strongerPlayer === 'A' && <span className="comp-winner-tag">Stronger</span>}
        </div>
        
        <div className="comp-vs">VS</div>
        
        <div className={`comp-player comp-player-b ${strongerPlayer === 'B' ? 'comparison-winner' : ''}`}>
          <div className="comp-avatar">{(playerB.username || '?').charAt(0).toUpperCase()}</div>
          <span className="comp-name">{playerB.username || 'Anonymous'}</span>
          {strongerPlayer === 'B' && <span className="comp-winner-tag">Stronger</span>}
        </div>
      </div>

      <div className="comparison-stats">
        {renderStatRow('Wins', playerA.wins, playerB.wins, '', playerA.wins > playerB.wins, playerB.wins > playerA.wins)}
        {renderStatRow('Win Rate', playerA.winRate, playerB.winRate, '%', playerA.winRate > playerB.winRate, playerB.winRate > playerA.winRate)}
        {renderStatRow('Avg Move', playerA.avgMoveTime, playerB.avgMoveTime, 's', 
          canCompareSpeed && playerA.avgMoveTime < playerB.avgMoveTime, 
          canCompareSpeed && playerB.avgMoveTime < playerA.avgMoveTime
        )}
      </div>

      {canCompareSpeed && hasHistory && (
        <div className="comp-tiebreaker-note">
          ⚡ Identical records — move speed is the deciding factor
        </div>
      )}

      {highlightAvgMoveTime && !bothHaveTimerStats && hasHistory && (
        <div className="comp-tiebreaker-note" style={{ opacity: 0.6 }}>
          Speed comparison unavailable (no timed-mode data)
        </div>
      )}
    </div>
  );
};

export default ComparisonPanel;

