function rpcCreateLeaderboard(ctx, logger, nk, payload) {
  try {
    nk.leaderboardCreate("tictactoe_wins", false, "desc", "increment", null, { title: "TicTacToe Wins" });
    logger.info("Leaderboard tictactoe_wins created");
    return JSON.stringify({ success: true });
  } catch (e) {
    logger.error("Failed to create leaderboard: " + e.message);
    return JSON.stringify({ success: false, error: e.message });
  }
}

function rpcGetLeaderboard(ctx, logger, nk, payload) {
  try {
    var records = nk.leaderboardRecordsList("tictactoe_wins", [], 10, null, 0);
    return JSON.stringify(records);
  } catch (e) {
    logger.error("Failed to get leaderboard: " + e.message);
    return JSON.stringify({ error: e.message });
  }
}