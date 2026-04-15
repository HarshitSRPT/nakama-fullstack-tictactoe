import React, { createContext, useState, useEffect, useCallback } from "react";
import {
  initializeClient,
  findMatch,
  sendMove,
  leaveMatch,
  getSession,
  cancelMatchmaking,
  surrenderMatch,
  resetClient,
} from "../api/nakamaClient.js";
import { CONNECTION_STATE } from "../constants/opcodes.js";

export const MatchContext = createContext(null);

export const MatchProvider = ({ children, username }) => {
  const [connectionState, setConnectionState] = useState(CONNECTION_STATE.IDLE);
  const [matchId, setMatchId] = useState(null);

  // Game State
  const [board, setBoard] = useState(Array(9).fill(""));
  const [playerMark, setPlayerMark] = useState(null);
  const [currentTurn, setCurrentTurn] = useState("X");
  const [winner, setWinner] = useState(null);
  const [drawStatus, setDrawStatus] = useState(false);

  // Mode & Timer
  const [gameMode, setGameMode] = useState(() => {
    const saved = localStorage.getItem("preferred_mode");
    return (saved === "classic" || saved === "timer") ? saved : "classic";
  });
  const [turnKey, setTurnKey] = useState(0); // increments on each turn change to reset timer

  // Comparison
  const [comparisonData, setComparisonData] = useState(null);

  // Presence
  const [opponent, setOpponent] = useState(null);
  const [me, setMe] = useState(null);

  // Persistent Match State
  const [opponentLeft, setOpponentLeft] = useState(false);
  const [roundWinner, setRoundWinner] = useState(null);
  const [isRematchPending, setIsRematchPending] = useState(false);
  const [timeout, setTimeout_] = useState(false);

  useEffect(() => {
    if (!username) return;

    let unmounted = false;

    const setup = async () => {
      try {
        setConnectionState(CONNECTION_STATE.CONNECTING);
        const { session, socket } = await initializeClient(
          {
            onStateUpdate: (data) => {
              if (unmounted) return;
              handleStateUpdate(data, session.user_id);
            },
            onGameOver: (data) => {
              if (unmounted) return;
              handleGameOver(data, session.user_id);
            },
            onMatchPresence: (presenceEvent) => {
              if (unmounted) return;
              handlePresence(presenceEvent, session.session_id);
            },
            onMatchJoined: (match, matched) => {
              if (unmounted) return;
              setMatchId(match.match_id);
              localStorage.setItem("active_match_id", match.match_id);
              setConnectionState(CONNECTION_STATE.IN_MATCH);
              setOpponentLeft(false);
              setIsRematchPending(false);
              setComparisonData(null);
              setTimeout_(false);

              // Derive opponent from incoming presences during match join
              const newOpponent =
                match.presences &&
                match.presences.find(
                  (p) => p.session_id !== session.session_id,
                );
              if (newOpponent) setOpponent(newOpponent);
            },
            onComparison: (data) => {
              if (unmounted) return;
              if (data && data.data) {
                setComparisonData(data.data);
              }
            },
            onDisconnect: () => {
              if (!unmounted) {
                setConnectionState(CONNECTION_STATE.DISCONNECTED);
                setComparisonData(null);
              }
            },
          },
          username,
        );

        if (!unmounted) {
          setMe(session.user_id);

          const storedMatchId = localStorage.getItem("active_match_id");
          if (storedMatchId) {
            try {
              const match = await socket.joinMatch(storedMatchId);
              setMatchId(match.match_id);
              setConnectionState(CONNECTION_STATE.IN_MATCH);
              setOpponentLeft(false);
              setIsRematchPending(false);

              const newOpponent =
                match.presences &&
                match.presences.find(
                  (p) => p.session_id !== session.session_id,
                );
              if (newOpponent) setOpponent(newOpponent);
            } catch (joinErr) {
              console.log("Could not rejoin existing match:", joinErr);
              localStorage.removeItem("active_match_id");
              setConnectionState(CONNECTION_STATE.IDLE);
            }
          } else {
            setConnectionState(CONNECTION_STATE.IDLE);
          }
        }
      } catch (err) {
        console.error("Initialization error:", err);
        if (!unmounted) setConnectionState(CONNECTION_STATE.DISCONNECTED);
      }
    };

    setup();
    return () => { 
      unmounted = true; 
      setComparisonData(null);
    };
  }, [username]);

  const handleStateUpdate = (data, myUserId) => {
    if (data.board) setBoard(data.board);
    if (data.turn) {
      setCurrentTurn((prev) => {
        if (prev !== data.turn) {
          setTurnKey((k) => k + 1); // Reset timer on turn change
        }
        return data.turn;
      });
    }
    if (data.marks && data.marks[myUserId]) {
      setPlayerMark(data.marks[myUserId]);
    }
    if (data.mode) {
      setGameMode(data.mode);
    }

    // Check persistent states
    if (typeof data.opponentLeft === "boolean") {
      setOpponentLeft(data.opponentLeft);
    }

    // Auto-board reset detection (round restarted!)
    if (data.gameOver === false) {
      setWinner(null);
      setDrawStatus(false);
      setRoundWinner(null);
      setIsRematchPending(false);
      setTimeout_(false);
      setTurnKey((k) => k + 1);
    }
  };

  const handleGameOver = (data, myUserId) => {
    handleStateUpdate(data, myUserId);
    if (data.winner) {
      setWinner(data.winner);
      setRoundWinner(data.winner === data.marks[myUserId] ? "Me" : "Opponent");
    }
    if (data.draw) setDrawStatus(true);
    if (data.timeout) setTimeout_(true);
    setIsRematchPending(true);
  };

  const handlePresence = (presenceEvent, mySessionId) => {
    if (presenceEvent.joins) {
      const newOpponent = presenceEvent.joins.find(
        (p) => p.session_id !== mySessionId,
      );
      if (newOpponent) setOpponent(newOpponent);
    }
    if (presenceEvent.leaves) {
      setOpponent(prev => {
        const left = presenceEvent.leaves.find(p => prev && p.session_id === prev.session_id);
        if (left) {
          setComparisonData(null); // Clear comparison if opponent leaves
          return null;
        }
        return prev;
      });
    }
  };

  const startMatchmaking = async (mode = "classic") => {
    try {
      setGameMode(mode);
      setConnectionState(CONNECTION_STATE.MATCHMAKING);
      setComparisonData(null);
      await findMatch(mode);
    } catch (err) {
      console.error(err);
      setConnectionState(CONNECTION_STATE.DISCONNECTED);
    }
  };

  const cancelMatchQueue = async () => {
    if (connectionState === CONNECTION_STATE.MATCHMAKING) {
      await cancelMatchmaking();
      setConnectionState(CONNECTION_STATE.IDLE);
    }
  };

  const executeMove = async (index) => {
    // DO NOT update board locally - Wait for server broadcast. Authoritative architecture compliance.
    if (
      board[index] !== "" ||
      winner ||
      connectionState !== CONNECTION_STATE.IN_MATCH ||
      opponentLeft
    )
      return;

    // Only send the payload to the server
    await sendMove(matchId, index);
  };

  const exitMatch = async () => {
    if (matchId) {
      await surrenderMatch(matchId);
      await leaveMatch(matchId);
    }
    setMatchId(null);
    setBoard(Array(9).fill(""));
    setPlayerMark(null);
    setCurrentTurn("X");
    setWinner(null);
    setDrawStatus(false);
    setOpponent(null);
    setOpponentLeft(false);
    setRoundWinner(null);
    setIsRematchPending(false);
    setComparisonData(null);
    setConnectionState(CONNECTION_STATE.IDLE);
  };

  return (
    <MatchContext.Provider
      value={{
        connectionState,
        matchId,
        board,
        playerMark,
        currentTurn,
        winner,
        drawStatus,
        opponent,
        opponentLeft,
        roundWinner,
        isRematchPending,
        gameMode,
        turnKey,
        comparisonData,
        timeout,
        me,
        joinMatch: startMatchmaking,
        sendMove: executeMove,
        findMatch: startMatchmaking,
        cancelMatchmaking: cancelMatchQueue,
        leaveMatch: exitMatch,
      }}
    >
      {children}
    </MatchContext.Provider>
  );
};
