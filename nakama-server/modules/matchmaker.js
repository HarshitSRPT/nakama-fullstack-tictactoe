function matchmakerMatched(ctx, logger, nk, matches) {
  var matchId = nk.matchCreate("tictactoe", {});
  logger.info("Matchmaker created match: " + matchId);
  return matchId;
}