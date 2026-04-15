// ──────────────────────────────────────────────────────────────
// Mode-Aware Helpers
// Player comparison builder for pre-match stat display.
// ──────────────────────────────────────────────────────────────

/**
 * Builds a side-by-side comparison payload for two players.
 * Called from matchJoin when both players are present.
 */
function buildPlayerComparison(nk, logger, playerAId, playerBId, matchMode) {
  var statsA = getPlayerStats(nk, logger, playerAId) || {
    wins: 0, losses: 0, draws: 0, winRate: 0, avgMoveTime: 0, hasTimerStats: false
  };
  var statsB = getPlayerStats(nk, logger, playerBId) || {
    wins: 0, losses: 0, draws: 0, winRate: 0, avgMoveTime: 0, hasTimerStats: false
  };

  // Get usernames
  var usernameA = playerAId;
  var usernameB = playerBId;
  try {
    var users = nk.usersGetId([playerAId, playerBId]);
    usernameA = (users[0] && users[0].username) || playerAId;
    usernameB = (users[1] && users[1].username) || playerBId;
  } catch (e) {
    logger.warn("Could not fetch usernames for comparison: " + e.message);
  }

  var sameRecord = (statsA.wins === statsB.wins &&
                    statsA.losses === statsB.losses &&
                    statsA.draws === statsB.draws);

  // winRate is already in percentage form from getPlayerStats() (e.g. 62.5)
  var formattedWinRateA = statsA.winRate;
  var formattedWinRateB = statsB.winRate;

  // avgMoveTime: format with one decimal precision 2.384 -> 2.4
  var formattedAvgMoveTimeA = Math.round(statsA.avgMoveTime * 10) / 10;
  var formattedAvgMoveTimeB = Math.round(statsB.avgMoveTime * 10) / 10;

  return {
    playerA: {
      userId:      playerAId,
      username:    usernameA,
      wins:        statsA.wins,
      losses:      statsA.losses,
      draws:       statsA.draws,
      winRate:     formattedWinRateA,
      avgMoveTime: formattedAvgMoveTimeA,
      hasTimerStats: statsA.hasTimerStats || false
    },
    playerB: {
      userId:      playerBId,
      username:    usernameB,
      wins:        statsB.wins,
      losses:      statsB.losses,
      draws:       statsB.draws,
      winRate:     formattedWinRateB,
      avgMoveTime: formattedAvgMoveTimeB,
      hasTimerStats: statsB.hasTimerStats || false
    },
    highlightAvgMoveTime: sameRecord,
    matchMode: matchMode
  };
}

// RPC: Get comparison between two players
function rpcGetPlayerComparison(ctx, logger, nk, payload) {
  var input;
  try {
    input = JSON.parse(payload);
  } catch (e) {
    return JSON.stringify({ error: "Invalid JSON" });
  }

  var playerAId = input.playerAId;
  var playerBId = input.playerBId;
  if (!playerAId || !playerBId) {
    return JSON.stringify({ error: "playerAId and playerBId required" });
  }

  var comparison = buildPlayerComparison(nk, logger, playerAId, playerBId);
  return JSON.stringify(comparison);
}
