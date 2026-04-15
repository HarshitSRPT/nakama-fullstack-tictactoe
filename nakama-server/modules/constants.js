var BOARD_SIZE = 9;
var EMPTY = "";
var X = "X";
var O = "O";
var WIN_PATTERNS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];
var TICK_RATE = 5;

var OP_MOVE = 1;
var OP_STATE = 2;
var OP_GAME_OVER = 3;
var OP_ERROR = 4;
var OP_SURRENDER = 5;
var OP_TIMER = 6;
var OP_COMPARISON = 7;
var OP_TERMINATE = 99;