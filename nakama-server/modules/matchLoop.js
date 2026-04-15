function matchLoop(ctx, logger, nk, dispatcher, tick, state, messages) {
  // Timer mode: check turn deadline before processing messages
  if (!state.gameOver && state.mode === MODE_TIMER) {
    var timerResult = checkTurnTimer(ctx, logger, nk, dispatcher, tick, state);
    if (timerResult) {
      state = timerResult;
      if (state.gameOver) return { state: state };
    }
  }

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
      state.moveTimestamps = {};
      
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
      state.turnStartTick = tick;

      var resetMsg = JSON.stringify({
        type: "state",
        board: state.board,
        turn: state.turn,
        marks: state.marks,
        gameOver: state.gameOver,
        winner: state.winner,
        draw: state.draw,
        opponentLeft: state.opponentLeft,
        mode: state.mode || MODE_CLASSIC
      });
      dispatcher.broadcastMessage(OP_STATE, resetMsg, null, null, true);

      // Re-broadcast comparison stats so the pre-match UI updates with new records
      try {
        var mode = state.mode || MODE_CLASSIC;
        var comparison = buildPlayerComparison(nk, logger, p1, p2, mode);
        var compMsg = JSON.stringify({ type: "comparison", data: comparison });
        dispatcher.broadcastMessage(OP_COMPARISON, compMsg, null, null, true);
      } catch (e) {
        logger.warn("Could not fetch player comparison for continuous round: " + e.message);
      }
    }
    return { state: state };
  }
  for (var i = 0; i < messages.length; i++) {
    if (state.gameOver) return { state: state };

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
            // Update persistent stats
            try {
              updateStatsOnGameEnd(nk, logger, state, winnerId, "surrender");
            } catch (se) {
              logger.error("Stats update failed on surrender: " + se.message);
            }
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
          opponentLeft: true,
          mode: state.mode || MODE_CLASSIC
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

    // Record move time for timer-mode stats
    if (state.mode === MODE_TIMER) {
      recordMoveTime(state, tick, senderId);
    }

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
          // Update persistent stats
          try {
            updateStatsOnGameEnd(nk, logger, state, winnerId, "win");
          } catch (se) {
            logger.error("Stats update failed on win: " + se.message);
          }
        }
      } catch (e) {
        logger.error("Leaderboard write failed: " + e.message);
      }
    } else if (draw) {
      state.gameOver = true;
      state.draw = true;
      // Update persistent stats for draw
      try {
        updateStatsOnDraw(nk, logger, state);
      } catch (se) {
        logger.error("Stats update failed on draw: " + se.message);
      }
    } else {
      state.turn = (state.turn === X) ? O : X;
      state.turnStartTick = tick;
    }
    var stateMsg = JSON.stringify({
      type: "state",
      board: state.board,
      turn: state.turn,
      marks: state.marks,
      gameOver: state.gameOver,
      winner: state.winner,
      draw: state.draw,
      opponentLeft: state.opponentLeft || false,
      mode: state.mode || MODE_CLASSIC
    });
    dispatcher.broadcastMessage(state.gameOver ? OP_GAME_OVER : OP_STATE, stateMsg, null, null, true);
  }
  return { state: state };
}