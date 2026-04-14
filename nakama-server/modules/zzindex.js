function InitModule(ctx, logger, nk, initializer) {
  initializer.registerMatch("tictactoe", {
    matchInit: matchInit,
    matchJoinAttempt: matchJoinAttempt,
    matchJoin: matchJoin,
    matchLeave: matchLeave,
    matchLoop: matchLoop,
    matchTerminate: matchTerminate,
    matchSignal: matchSignal
  });
  initializer.registerMatchmakerMatched(matchmakerMatched);
  initializer.registerRpc("create_leaderboard", rpcCreateLeaderboard);
  initializer.registerRpc("get_leaderboard", rpcGetLeaderboard);
  logger.info("TicTacToe module loaded");
}