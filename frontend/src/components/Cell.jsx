import React from 'react';

const Cell = ({ value, onClick, disabled }) => {
  const markClass = value === 'X' ? 'x-mark' : value === 'O' ? 'o-mark' : '';
  
  return (
    <button 
      className={`cell ${markClass}`}
      onClick={onClick}
      disabled={disabled}
    >
      {value}
    </button>
  );
};
export default Cell;
