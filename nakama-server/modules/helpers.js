function checkWin(board) {
  for (var i = 0; i < WIN_PATTERNS.length; i++) {
    var a = WIN_PATTERNS[i][0];
    var b = WIN_PATTERNS[i][1];
    var c = WIN_PATTERNS[i][2];
    if (board[a] !== EMPTY && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

function isDraw(board) {
  for (var i = 0; i < board.length; i++) {
    if (board[i] === EMPTY) return false;
  }
  return true;
}

function calculateWinRate(wins, losses, draws) {
  var totalGames = wins + losses + draws;
  return totalGames > 0 ? Math.round((wins / totalGames) * 10000) / 100 : 0;
}