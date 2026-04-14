function matchInit(ctx, logger, nk, params) {
  var board = [];
  for (var i = 0; i < BOARD_SIZE; i++) board.push(EMPTY);
  var state = {
    board: board,
    marks: {},
    presences: {},
    turn: X,
    winner: null,
    draw: false,
    gameOver: false
  };
  logger.info("TicTacToe match initialised");
  return { state: state, tickRate: TICK_RATE, label: "tictactoe" };
}