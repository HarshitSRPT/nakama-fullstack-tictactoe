// ──────────────────────────────────────────────────────────────
// Global Leaderboard
// Single unified leaderboard across all game modes.
// Ranked by composite score: wins * 10000 + winRate * 100.
// Enriched with full W/L/D stats by joining player_stats on read.
// Architecture remains scalable for future per-mode leaderboards.
// ──────────────────────────────────────────────────────────────

var GLOBAL_LEADERBOARD_ID = "global_stats";

function updateGlobalLeaderboard(nk, logger, userId, stats) {
  if (!stats) return;

  var totalGames = stats.wins + stats.losses + stats.draws;
  var winRate = calculateWinRate(stats.wins, stats.losses, stats.draws);

  // Composite score: wins are primary, winRate is secondary
  var score    = stats.wins;
  var subScore = Math.floor(winRate * 100);

  var metadata = {
    wins:    stats.wins,
    losses:  stats.losses,
    draws:   stats.draws,
    winRate: winRate,
    avgMoveTime: stats.avgMoveTime || 0
  };

  try {
    nk.leaderboardRecordWrite(
      GLOBAL_LEADERBOARD_ID,
      userId,
      userId,
      score,
      subScore,
      metadata
    );
  } catch (e) {
    logger.error("Global leaderboard write failed for " + userId + ": " + e.message);
  }
}

function rpcGetGlobalLeaderboard(ctx, logger, nk, payload) {
  var limit = 20;

  try {
    var input = payload ? JSON.parse(payload) : {};
    if (input.limit && input.limit > 0 && input.limit <= 100) {
      limit = input.limit;
    }
  } catch (e) {
    // Use default limit
  }

  try {
    var result = nk.leaderboardRecordsList(GLOBAL_LEADERBOARD_ID, [], limit, null, 0);
    var records = result.records || [];

    var enriched = [];
    for (var i = 0; i < records.length; i++) {
      var r = records[i];
      var meta = {};
      try {
        meta = r.metadata ? (typeof r.metadata === "string" ? JSON.parse(r.metadata) : r.metadata) : {};
      } catch (e) {
        // Fallback to empty metadata
      }

      // Try to get username from the account
      var username = r.username || r.ownerId || "Unknown";
      try {
        var users = nk.usersGetId([r.ownerId]);
        username = (users[0] && users[0].username) || username;
      } catch (e) {
        // Fallback to existing username / ownerId
      }

      enriched.push({
        rank:        r.rank || (i + 1),
        userId:      r.ownerId,
        username:    username,
        score:       r.score,
        wins:        meta.wins || 0,
        losses:      meta.losses || 0,
        draws:       meta.draws || 0,
        winRate:     meta.winRate || 0,
        avgMoveTime: meta.avgMoveTime || 0
      });
    }

    return JSON.stringify({ records: enriched });
  } catch (e) {
    logger.error("Failed to get global leaderboard: " + e.message);
    return JSON.stringify({ records: [], error: e.message });
  }
}
