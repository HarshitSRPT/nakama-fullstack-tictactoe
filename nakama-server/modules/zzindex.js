function InitModule(ctx, logger, nk, initializer) {
  // Create global stats leaderboard (idempotent)
  try {
    nk.leaderboardCreate("global_stats", false, "desc", "set", null, { title: "Global Player Stats" });
    logger.info("global_stats leaderboard ready");
  } catch (e) {
    logger.info("global_stats leaderboard already exists or error: " + e.message);
  }

  // Ensure legacy leaderboard exists too
  try {
    nk.leaderboardCreate("tictactoe_wins", false, "desc", "increment", null, { title: "TicTacToe Wins" });
  } catch (e) {
    // Already exists
  }

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

  // Legacy RPCs
  initializer.registerRpc("create_leaderboard", rpcCreateLeaderboard);
  initializer.registerRpc("get_leaderboard", rpcGetLeaderboard);

  // Auth RPCs
  initializer.registerRpc("register_user", rpcRegisterUser);
  initializer.registerRpc("login_user", rpcLoginUser);

  // Stats RPCs
  initializer.registerRpc("get_my_stats", rpcGetMyStats);
  initializer.registerRpc("get_player_stats", rpcGetPlayerStats);

  // Global leaderboard RPC
  initializer.registerRpc("get_global_leaderboard", rpcGetGlobalLeaderboard);

  // Player comparison RPC
  initializer.registerRpc("get_player_comparison", rpcGetPlayerComparison);

  logger.info("TicTacToe module loaded with extensions");
}