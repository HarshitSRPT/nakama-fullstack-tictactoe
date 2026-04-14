function matchJoinAttempt(ctx, logger, nk, dispatcher, tick, state, presence, metadata) {
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
        if (state.marks[vals[j]] === "X") { hasX = true; break; }
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
  }
  
  var msg = JSON.stringify({
    type: "state",
    board: state.board,
    turn: state.turn,
    marks: state.marks,
    gameOver: state.gameOver,
    winner: state.winner,
    draw: state.draw,
    opponentLeft: state.opponentLeft || false
  });
  dispatcher.broadcastMessage(OP_STATE, msg, null, null, true);
  return { state: state };
}