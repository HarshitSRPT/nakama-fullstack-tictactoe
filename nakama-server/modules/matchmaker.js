function matchmakerMatched(ctx, logger, nk, matches) {
  var mode = MODE_CLASSIC;
  if (matches && matches.length > 0) {
    mode = (matches[0].properties && matches[0].properties.mode) || MODE_CLASSIC;
  }
  var matchId = nk.matchCreate("tictactoe", { mode: mode });
  logger.info("Matchmaker created match: " + matchId + " mode: " + mode);
  return matchId;
}