function matchLeave(ctx, logger, nk, dispatcher, tick, state, presences) {
  for (var i = 0; i < presences.length; i++) {
    var id = presences[i].userId;
    delete state.presences[id];
    // DO NOT delete marks! Reconnecting users need their marks preserved to resume the game.
    logger.info("Player " + id + " left the match");
  }
  
  if (Object.keys(state.presences).length === 0) {
    logger.info("All players left - match will be closed");
    return null;
  } else {
    state.opponentLeft = true;
    var stateMsg = JSON.stringify({
      type: "state",
      board: state.board,
      turn: state.turn,
      marks: state.marks,
      gameOver: state.gameOver,
      winner: state.winner,
      draw: state.draw,
      opponentLeft: true
    });
    dispatcher.broadcastMessage(OP_STATE, stateMsg, null, null, true);
    return { state: state };
  }
}