import React, { createContext, useState, useEffect, useCallback } from 'react';
import { initializeClient, findMatch, sendMove, leaveMatch, getSession, cancelMatchmaking, surrenderMatch } from '../api/nakamaClient.js';
import { CONNECTION_STATE } from '../constants/opcodes.js';

export const MatchContext = createContext(null);

export const MatchProvider = ({ children }) => {
  const [connectionState, setConnectionState] = useState(CONNECTION_STATE.IDLE);
  const [matchId, setMatchId] = useState(null);
  
  // Game State
  const [board, setBoard] = useState(Array(9).fill(""));
  const [playerMark, setPlayerMark] = useState(null);
  const [currentTurn, setCurrentTurn] = useState("X");
  const [winner, setWinner] = useState(null);
  const [drawStatus, setDrawStatus] = useState(false);
  
  // Presence
  const [opponent, setOpponent] = useState(null);
  const [me, setMe] = useState(null);
  
  // Persistent Match State
  const [opponentLeft, setOpponentLeft] = useState(false);
  const [roundWinner, setRoundWinner] = useState(null);
  const [isRematchPending, setIsRematchPending] = useState(false);

  useEffect(() => {
    let unmounted = false;

    const setup = async () => {
      try {
        setConnectionState(CONNECTION_STATE.CONNECTING);
        const { session, socket } = await initializeClient({
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
            setOpponentLeft(false); // Reset left status
            setIsRematchPending(false);
            
            // Derive opponent from incoming presences during match join
            const newOpponent = match.presences && match.presences.find(p => p.session_id !== session.session_id);
            if (newOpponent) setOpponent(newOpponent);
          },
          onDisconnect: () => {
            if (!unmounted) setConnectionState(CONNECTION_STATE.DISCONNECTED);
          }
        });
        
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
              
              const newOpponent = match.presences && match.presences.find(p => p.session_id !== session.session_id);
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
    return () => { unmounted = true; };
  }, []);

  const handleStateUpdate = (data, myUserId) => {
    if (data.board) setBoard(data.board);
    if (data.turn) setCurrentTurn(data.turn);
    if (data.marks && data.marks[myUserId]) {
      setPlayerMark(data.marks[myUserId]);
    }
    
    // Check persistent states
    if (data.opponentLeft) {
       setOpponentLeft(true);
    }
    
    // Auto-board reset detection (round restarted!)
    if (data.gameOver === false) {
       setWinner(null);
       setDrawStatus(false);
       setRoundWinner(null);
       setIsRematchPending(false);
    }
  };

  const handleGameOver = (data, myUserId) => {
    handleStateUpdate(data, myUserId);
    if (data.winner) {
      setWinner(data.winner);
      setRoundWinner(data.winner === data.marks[myUserId] ? "Me" : "Opponent");
    }
    if (data.draw) setDrawStatus(true);
    setIsRematchPending(true); // Short delay active
  };

  const handlePresence = (presenceEvent, mySessionId) => {
    if (presenceEvent.joins) {
      const newOpponent = presenceEvent.joins.find(p => p.session_id !== mySessionId);
      if (newOpponent) setOpponent(newOpponent);
    }
    if (presenceEvent.leaves) {
      setOpponent(prev => {
        const left = presenceEvent.leaves.find(p => prev && p.session_id === prev.session_id);
        return left ? null : prev;
      });
    }
  };

  const startMatchmaking = async () => {
    try {
      setConnectionState(CONNECTION_STATE.MATCHMAKING);
      await findMatch();
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
    if (board[index] !== "" || winner || connectionState !== CONNECTION_STATE.IN_MATCH || opponentLeft) return;
    
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
    setConnectionState(CONNECTION_STATE.IDLE);
  };

  return (
    <MatchContext.Provider value={{
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
      joinMatch: startMatchmaking, 
      sendMove: executeMove,
      findMatch: startMatchmaking, // Aliased for consistency
      cancelMatchmaking: cancelMatchQueue,
      leaveMatch: exitMatch
    }}>
      {children}
    </MatchContext.Provider>
  );
};
