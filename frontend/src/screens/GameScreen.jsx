import React from "react";
import Board from "../components/Board.jsx";
import StatusBar from "../components/StatusBar.jsx";
import ComparisonPanel from "../features/matchComparison/ComparisonPanel.jsx";
import TimerCountdown from "../features/timer/TimerCountdown.jsx";
import { useMatch } from "../hooks/useMatch.js";
import { CONNECTION_STATE } from "../constants/opcodes.js";

const GameScreen = () => {
  const {
    connectionState,
    leaveMatch,
    gameMode,
    comparisonData,
    isMyTurn,
    turnKey,
    winner,
    drawStatus,
    willLeaveNextRound,
    toggleLeaveNextRound,
    terminateMessage
  } = useMatch();

  const gameOver = !!(winner || drawStatus);

  return (
    <div className="game-container layout-modern">
      <div className="board-section">
        {connectionState === CONNECTION_STATE.IN_MATCH ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "1.5rem",
            }}
          >
            {comparisonData && (
              <ComparisonPanel comparisonData={comparisonData} />
            )}

            <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
              {gameMode === "timer" && (
                <TimerCountdown
                  isMyTurn={isMyTurn}
                  turnKey={turnKey}
                  gameOver={gameOver}
                />
              )}
              <Board />
            </div>

            <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
              <button
                className="find-match-btn"
                onClick={leaveMatch}
                style={{ backgroundColor: "var(--secondary-color)", padding: "10px 20px" }}
              >
                Quit Game
              </button>
              <button
                className="find-match-btn"
                onClick={toggleLeaveNextRound}
                disabled={willLeaveNextRound || gameOver}
                title="Finish this round, then leave automatically"
                style={{
                  backgroundColor: willLeaveNextRound ? "#555" : "inherit",
                  opacity: willLeaveNextRound ? 0.7 : 1,
                  padding: "10px 20px"
                }}
              >
                {willLeaveNextRound
                  ? (gameOver ? "You can quit now" : "Leaving afterwards...")
                  : "Leave After Match"}
              </button>
            </div>
          </div>
        ) : (
          <div
            className="placeholder-state"
            style={{ textAlign: "center", paddingTop: "5rem" }}
          >
            <h2>Returning to lobby...</h2>
          </div>
        )}
      </div>
      <div className="sidebar">
        <StatusBar />
        <div
          style={{
            marginTop: "2rem",
            borderTop: "1px solid var(--cell-hover)",
            paddingTop: "1rem",
          }}
        >
          <h3>Mode: {gameMode === "timer" ? "⚡ Timed" : "♟ Classic"}</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            {gameMode === "timer" ? "15 seconds per move" : "No time limit"}
          </p>

          {terminateMessage && (
            <div style={{ marginTop: "1.5rem", padding: "1rem", backgroundColor: "rgba(220, 53, 69, 0.2)", borderRadius: "8px", border: "1px solid #dc3545" }}>
              <p style={{ color: "#ff6b6b", margin: 0, fontWeight: "bold" }}>{terminateMessage}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default GameScreen;
