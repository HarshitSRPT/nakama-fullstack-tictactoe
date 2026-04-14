function matchLoop(ctx, logger, nk, dispatcher, tick, state, messages) {
  if (state.gameOver) {
    if (Object.keys(state.presences).length === 0) {
      return null; // All players left, clean up automatically
    }

    // Reset board after a short delay (approx 3 seconds with TICK_RATE = 5)
    state.deadline = state.deadline || (tick + 15);
    
    // Only restart if exactly 2 players are present
    if (tick >= state.deadline && Object.keys(state.presences).length === 2) {
      logger.info("Resetting board for next round");
      state.board = new Array(BOARD_SIZE).fill(EMPTY);
      state.gameOver = false;
      state.winner = null;
      state.draw = false;
      state.deadline = null;
      state.opponentLeft = false;
      
      // Alternate starting marks
      var players = Object.keys(state.marks);
      if (players.length === 2) {
         var p1 = players[0];
         var p2 = players[1];
         var m1 = state.marks[p1];
         state.marks[p1] = state.marks[p2];
         state.marks[p2] = m1;
      }
      state.turn = X; // X always starts

      var resetMsg = JSON.stringify({
        type: "state",
        board: state.board,
        turn: state.turn,
        marks: state.marks,
        gameOver: state.gameOver,
        winner: state.winner,
        draw: state.draw,
        opponentLeft: state.opponentLeft
      });
      dispatcher.broadcastMessage(OP_STATE, resetMsg, null, null, true);
    }
    return { state: state };
  }
  for (var i = 0; i < messages.length; i++) {
    var message = messages[i];
    var senderId = message.sender.userId;
    var data;
    try {
      data = JSON.parse(nk.binaryToString(message.data));
    } catch (e) {
      logger.warn("Invalid message from " + senderId + ": " + e.message);
      continue;
    }
    if (message.opCode === OP_SURRENDER) {
      var surrenderMark = state.marks[senderId];
      if (surrenderMark && !state.gameOver) {
        logger.info("Player " + senderId + " explicitly surrendered.");
        state.gameOver = true;
        state.winner = (surrenderMark === "X") ? "O" : "X";
        state.opponentLeft = true;

        try {
          var winnerIds = Object.keys(state.marks);
          var winnerId = null;
          for (var w = 0; w < winnerIds.length; w++) {
            if (state.marks[winnerIds[w]] === state.winner) {
              winnerId = winnerIds[w];
              break;
            }
          }
          if (winnerId) {
            nk.leaderboardRecordWrite("tictactoe_wins", winnerId, winnerId, 1, 0, {});
            logger.info("Leaderboard updated due to surrender win by " + winnerId);
          }
        } catch (e) {
          logger.error("Leaderboard write failed on surrender: " + e.message);
        }

        var surrenderMsg = JSON.stringify({
          type: "state",
          board: state.board,
          turn: state.turn,
          marks: state.marks,
          gameOver: state.gameOver,
          winner: state.winner,
          draw: false,
          opponentLeft: true
        });
        dispatcher.broadcastMessage(OP_GAME_OVER, surrenderMsg, null, null, true);
      }
      continue;
    }

    if (message.opCode !== OP_MOVE || data.type !== "move") continue;
    var mark = state.marks[senderId];
    if (!mark) {
      logger.warn("Unknown player " + senderId + " tried to move");
      continue;
    }
    if (mark !== state.turn) {
      dispatcher.broadcastMessage(OP_ERROR, JSON.stringify({ type: "error", msg: "Not your turn" }), [message.sender], null, false);
      continue;
    }
    var pos = parseInt(data.position, 10);
    if (isNaN(pos) || pos < 0 || pos >= BOARD_SIZE) {
      dispatcher.broadcastMessage(OP_ERROR, JSON.stringify({ type: "error", msg: "Invalid position" }), [message.sender], null, false);
      continue;
    }
    if (state.board[pos] !== EMPTY) {
      dispatcher.broadcastMessage(OP_ERROR, JSON.stringify({ type: "error", msg: "Cell already occupied" }), [message.sender], null, false);
      continue;
    }
    state.board[pos] = mark;
    var winner = checkWin(state.board);
    var draw = !winner && isDraw(state.board);
    if (winner) {
      state.gameOver = true;
      state.winner = winner;
      try {
        var winnerIds = Object.keys(state.marks);
        var winnerId = null;
        for (var w = 0; w < winnerIds.length; w++) {
          if (state.marks[winnerIds[w]] === winner) {
            winnerId = winnerIds[w];
            break;
          }
        }
        if (winnerId) {
          nk.leaderboardRecordWrite("tictactoe_wins", winnerId, winnerId, 1, 0, {});
        }
      } catch (e) {
        logger.error("Leaderboard write failed: " + e.message);
      }
    } else if (draw) {
      state.gameOver = true;
      state.draw = true;
    } else {
      state.turn = (state.turn === X) ? O : X;
    }
    var stateMsg = JSON.stringify({
      type: "state",
      board: state.board,
      turn: state.turn,
      marks: state.marks,
      gameOver: state.gameOver,
      winner: state.winner,
      draw: state.draw,
      opponentLeft: state.opponentLeft || false
    });
    dispatcher.broadcastMessage(state.gameOver ? OP_GAME_OVER : OP_STATE, stateMsg, null, null, true);
  }
  return { state: state };
}