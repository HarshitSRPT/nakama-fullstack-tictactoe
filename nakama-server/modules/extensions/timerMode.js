// ──────────────────────────────────────────────────────────────
// Timer Mode Extension
// Wraps existing match logic with a 15-second turn deadline.
// Does NOT duplicate any validation or win-handling logic.
// Uses TURN_TIMEOUT_SECONDS from gameModeConstants.js.
// ──────────────────────────────────────────────────────────────

/**
 * Called at the top of matchLoop BEFORE message processing.
 * Only fires when state.mode === MODE_TIMER.
 *
 * Returns the updated state if a timeout occurred, or null if no timeout.
 */
function checkTurnTimer(ctx, logger, nk, dispatcher, tick, state) {
  // Guard: only apply in timer mode
  if (state.mode !== MODE_TIMER) return null;

  // Guard: need 2 players and a game in progress
  if (state.gameOver) return null;
  if (Object.keys(state.presences).length < 2) return null;

  // Guard: turnStartTick must be set
  if (state.turnStartTick === -1) return null;

  var elapsedTicks = tick - state.turnStartTick;
  var elapsedSeconds = elapsedTicks / TICK_RATE;

  if (elapsedSeconds < TURN_TIMEOUT_SECONDS) {
    return null; // Still within time limit
  }

  // TIMEOUT: Current turn player forfeits
  logger.info("Timer expired! Turn was " + state.turn + " after " + elapsedSeconds + "s");

  var timedOutMark  = state.turn;
  var winnerMark    = (timedOutMark === X) ? O : X;

  state.gameOver = true;
  state.winner   = winnerMark;

  // Find the winner and loser user IDs
  var playerIds = Object.keys(state.marks);
  var winnerId  = null;
  var loserId   = null;
  for (var i = 0; i < playerIds.length; i++) {
    if (state.marks[playerIds[i]] === winnerMark)    winnerId = playerIds[i];
    if (state.marks[playerIds[i]] === timedOutMark)  loserId  = playerIds[i];
  }

  // Reuse existing leaderboard pipeline
  if (winnerId) {
    try {
      nk.leaderboardRecordWrite("tictactoe_wins", winnerId, winnerId, 1, 0, {});
      logger.info("Leaderboard updated due to timeout win by " + winnerId);
    } catch (e) {
      logger.error("Leaderboard write failed on timeout: " + e.message);
    }

    // Update persistent stats for both players
    try {
      updateStatsOnGameEnd(nk, logger, state, winnerId, "timeout");
    } catch (e) {
      logger.error("Stats update failed on timeout: " + e.message);
    }
  }

  // Broadcast game over with timeout flag
  var timeoutMsg = JSON.stringify({
    type:         "state",
    board:        state.board,
    turn:         state.turn,
    marks:        state.marks,
    gameOver:     true,
    winner:       state.winner,
    draw:         false,
    opponentLeft: false,
    timeout:      true,
    timedOutMark: timedOutMark,
    mode:         state.mode
  });
  dispatcher.broadcastMessage(OP_GAME_OVER, timeoutMsg, null, null, true);

  return state;
}

/**
 * Records the time a player took for their move.
 * Called after a valid move is applied in matchLoop.
 * Accumulates per-player move time in state.moveTimestamps.
 */
function recordMoveTime(state, tick, senderId) {
  if (!state.moveTimestamps) state.moveTimestamps = {};

  var moveTimeSec = 0;
  if (state.turnStartTick >= 0) {
    moveTimeSec = (tick - state.turnStartTick) / TICK_RATE;
  }

  if (!state.moveTimestamps[senderId]) {
    state.moveTimestamps[senderId] = 0;
  }
  state.moveTimestamps[senderId] += moveTimeSec;
}
