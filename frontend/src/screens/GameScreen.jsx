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

            <button
              className="find-match-btn"
              onClick={leaveMatch}
              style={{ backgroundColor: "var(--secondary-color)" }}
            >
              Leave Game
            </button>
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
        </div>
      </div>
    </div>
  );
};
export default GameScreen;
