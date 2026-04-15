function matchInit(ctx, logger, nk, params) {
  var mode = (params && params.mode) ? params.mode : MODE_CLASSIC;
  var board = [];
  for (var i = 0; i < BOARD_SIZE; i++) board.push(EMPTY);
  var state = {
    board: board,
    marks: {},
    presences: {},
    turn: X,
    winner: null,
    draw: false,
    gameOver: false,
    mode: mode,
    turnStartTick: 0,
    moveTimestamps: {}
  };
  state.mode = params.mode || MODE_CLASSIC;
  logger.info("TicTacToe match initialised in " + mode + " mode");
  return { state: state, tickRate: TICK_RATE, label: "tictactoe" };
}