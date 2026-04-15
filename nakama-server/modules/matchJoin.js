function matchJoinAttempt(
  ctx,
  logger,
  nk,
  dispatcher,
  tick,
  state,
  presence,
  metadata,
) {
  var count = Object.keys(state.presences).length;
  if (count >= 2) {
    return { state: state, accept: false, rejectMessage: "Match is full" };
  }
  return { state: state, accept: true };
}

function matchJoin(ctx, logger, nk, dispatcher, tick, state, presences) {
  for (var i = 0; i < presences.length; i++) {
    var presence = presences[i];
    var id = presence.userId;
    state.presences[id] = presence;

    if (!state.marks[id]) {
      var vals = Object.keys(state.marks);
      var hasX = false;
      for (var j = 0; j < vals.length; j++) {
        if (state.marks[vals[j]] === "X") {
          hasX = true;
          break;
        }
      }
      if (!hasX) {
        state.marks[id] = "X";
      } else {
        state.marks[id] = "O";
      }
    }
    logger.info("Player " + id + " joined as " + state.marks[id]);
  }

  if (Object.keys(state.presences).length === 2) {
      state.opponentLeft = false;
      state.turnStartTick = tick;

      // Fetch and broadcast player comparison stats exactly once per match
      if (!state.comparisonSent) {
          try {
            var playerIds = Object.keys(state.presences);
            var mode = state.mode || MODE_CLASSIC;
            var comparison = buildPlayerComparison(nk, logger, playerIds[0], playerIds[1], mode);
            var compMsg = JSON.stringify({ type: "comparison", data: comparison });
            
            dispatcher.broadcastMessage(OP_COMPARISON, compMsg, null, null, true);
            state.comparisonSent = true;
            logger.info("Broadcasted comparison payload for " + mode + " match");
          } catch (e) {
            logger.warn("Could not fetch player comparison: " + e.message);
          }
      }
  }

  var msg = JSON.stringify({
    type: "state",
    board: state.board,
    turn: state.turn,
    marks: state.marks,
    gameOver: state.gameOver,
    winner: state.winner,
    draw: state.draw,
    opponentLeft: state.opponentLeft || false,
    mode: state.mode || MODE_CLASSIC,
  });
  dispatcher.broadcastMessage(OP_STATE, msg, null, null, true);
  return { state: state };
}
