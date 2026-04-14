function matchTerminate(ctx, logger, nk, dispatcher, tick, state, graceSeconds) {
  logger.info("Match terminating gracefully");
  var msg = JSON.stringify({ type: "terminate" });
  dispatcher.broadcastMessage(OP_TERMINATE, msg, null, null, false);
  return { state: state };
}