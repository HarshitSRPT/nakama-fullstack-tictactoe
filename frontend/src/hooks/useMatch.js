import { useContext } from 'react';
import { MatchContext } from '../context/MatchContext.jsx';

export function useMatch() {
  const context = useContext(MatchContext);
  if (context === undefined) {
    throw new Error('useMatch must be used within a MatchProvider');
  }
  
  // Provide helper methods for components
  const {
    board,
    playerMark,
    currentTurn,
    winner,
    drawStatus,
    connectionState,
    opponent,
    cancelMatchmaking,
    opponentLeft,
    roundWinner,
    isRematchPending,
    leaveMatch
  } = context;
  
  const isMyTurn = playerMark && currentTurn === playerMark;
  const canMove = connectionState === 'in_match' && isMyTurn && !winner && !drawStatus && !opponentLeft;
  
  return {
    ...context,
    isMyTurn,
    canMove,
    cancelMatchmaking,
    leaveMatch
  };
}
