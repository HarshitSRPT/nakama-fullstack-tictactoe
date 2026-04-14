import React from 'react';
import Cell from './Cell.jsx';
import { useMatch } from '../hooks/useMatch.js';

const Board = () => {
  const { board, canMove, sendMove } = useMatch();

  return (
    <div className="board">
      {board.map((cellValue, index) => (
        <Cell 
          key={index} 
          value={cellValue} 
          onClick={() => sendMove(index)}
          disabled={!canMove || cellValue !== ""}
        />
      ))}
    </div>
  );
};

export default Board;
