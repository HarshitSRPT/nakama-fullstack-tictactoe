// ──────────────────────────────────────────────────────────────
// Player Stats Storage
// Persistent W/L/D + move-timing data stored per player in
// Nakama storage.  winRate and avgMoveTime are computed
// dynamically on read.
// ──────────────────────────────────────────────────────────────

var STATS_COLLECTION = "player_stats";

function initPlayerStats(nk, logger, userId) {
  nk.storageWrite([{
    collection: STATS_COLLECTION,
    key: "stats",
    userId: userId,
    value: {
      wins: 0,
      losses: 0,
      draws: 0,
      totalMoves: 0,
      totalMoveTime: 0,
      timerGamesPlayed: 0
    },
    permissionRead: 2,  // public read
    permissionWrite: 0  // server-only write
  }]);
  logger.info("Initialised stats for " + userId);
}

function getPlayerStats(nk, logger, userId) {
  var records;
  try {
    records = nk.storageRead([{
      collection: STATS_COLLECTION,
      key: "stats",
      userId: userId
    }]);
  } catch (e) {
    logger.warn("Stats read failed for " + userId + ": " + e.message);
    return null;
  }

  if (!records || records.length === 0) {
    return {
      wins: 0, losses: 0, draws: 0,
      totalMoves: 0, totalMoveTime: 0, timerGamesPlayed: 0,
      winRate: 0, avgMoveTime: 0, hasTimerStats: false
    };
  }

  var s = records[0].value;
  var winRate = calculateWinRate(s.wins, s.losses, s.draws);
  var avgMoveTime = s.totalMoves > 0 ? Math.round((s.totalMoveTime / s.totalMoves) * 100) / 100 : 0;

  return {
    wins: s.wins,
    losses: s.losses,
    draws: s.draws,
    totalMoves: s.totalMoves,
    totalMoveTime: s.totalMoveTime,
    winRate: winRate,
    avgMoveTime: avgMoveTime,
    hasTimerStats: (s.timerGamesPlayed || 0) > 0
  };
}

/**
 * Update stats after a game ends.
 *
 * @param {string} result - "win" | "loss" | "draw"
 * @param {number} movesInGame - number of moves this player made
 * @param {number} totalMoveTimeSec - cumulative move time for this player (seconds)
 */
function updatePlayerStat(nk, logger, userId, result, movesInGame, totalMoveTimeSec, isTimerMode) {
  var current = getPlayerStats(nk, logger, userId);
  if (!current) {
    current = { wins: 0, losses: 0, draws: 0, totalMoves: 0, totalMoveTime: 0, timerGamesPlayed: 0 };
  }

  if (result === "win")       current.wins   += 1;
  else if (result === "loss") current.losses += 1;
  else if (result === "draw") current.draws  += 1;

  current.totalMoves    += (movesInGame || 0);
  current.totalMoveTime += (totalMoveTimeSec || 0);
  
  if (isTimerMode) {
    current.timerGamesPlayed = (current.timerGamesPlayed || 0) + 1;
  }

  var avgMoveTime = current.totalMoves > 0 ? Math.round((current.totalMoveTime / current.totalMoves) * 100) / 100 : 0;

  nk.storageWrite([{
    collection: STATS_COLLECTION,
    key: "stats",
    userId: userId,
    value: {
      wins:          current.wins,
      losses:        current.losses,
      draws:         current.draws,
      totalMoves:    current.totalMoves,
      totalMoveTime: current.totalMoveTime,
      timerGamesPlayed: current.timerGamesPlayed
    },
    permissionRead: 2,
    permissionWrite: 0
  }]);

  logger.info("Stats updated for " + userId + ": " + result);
  
  // Return updated state with computed average for leaderboard write
  return {
    wins: current.wins,
    losses: current.losses,
    draws: current.draws,
    totalMoves: current.totalMoves,
    totalMoveTime: current.totalMoveTime,
    avgMoveTime: avgMoveTime
  };
}

/**
 * Called from matchLoop when a game ends via win, draw, surrender, or timeout.
 * Handles stat updates for BOTH players and leaderboard writes.
 */
function updateStatsOnGameEnd(nk, logger, state, winnerId, reason) {
  var playerIds = Object.keys(state.marks);
  if (playerIds.length !== 2) return;

  var loserId = null;
  for (var i = 0; i < playerIds.length; i++) {
    if (playerIds[i] !== winnerId) {
      loserId = playerIds[i];
      break;
    }
  }

  // Calculate move counts per player from the board
  var winnerMark = state.marks[winnerId];
  var loserMark  = state.marks[loserId];
  var winnerMoves = 0;
  var loserMoves  = 0;
  for (var j = 0; j < state.board.length; j++) {
    if (state.board[j] === winnerMark) winnerMoves++;
    if (state.board[j] === loserMark)  loserMoves++;
  }

  // Calculate accumulated move time per player
  var winnerMoveTime = 0;
  var loserMoveTime  = 0;
  if (state.moveTimestamps) {
    if (state.moveTimestamps[winnerId]) winnerMoveTime = state.moveTimestamps[winnerId];
    if (state.moveTimestamps[loserId])  loserMoveTime  = state.moveTimestamps[loserId];
  }

  var isTimerMode = (state.mode === MODE_TIMER);

  var winnerStats = updatePlayerStat(nk, logger, winnerId, "win",  winnerMoves, winnerMoveTime, isTimerMode);
  var loserStats  = updatePlayerStat(nk, logger, loserId,  "loss", loserMoves,  loserMoveTime, isTimerMode);

  // Update global leaderboard for both players
  try {
    updateGlobalLeaderboard(nk, logger, winnerId, winnerStats);
    updateGlobalLeaderboard(nk, logger, loserId,  loserStats);
  } catch (e) {
    logger.error("Leaderboard update failed: " + e.message);
  }
}

function updateStatsOnDraw(nk, logger, state) {
  var playerIds = Object.keys(state.marks);
  if (playerIds.length !== 2) return;

  for (var i = 0; i < playerIds.length; i++) {
    var pid = playerIds[i];
    var mark = state.marks[pid];
    var moveCount = 0;
    for (var j = 0; j < state.board.length; j++) {
      if (state.board[j] === mark) moveCount++;
    }
    var moveTime = 0;
    if (state.moveTimestamps && state.moveTimestamps[pid]) {
      moveTime = state.moveTimestamps[pid];
    }
    var isTimerMode = (state.mode === MODE_TIMER);
    var stats = updatePlayerStat(nk, logger, pid, "draw", moveCount, moveTime, isTimerMode);
    try {
      updateGlobalLeaderboard(nk, logger, pid, stats);
    } catch (e) {
      logger.error("Leaderboard update on draw failed: " + e.message);
    }
  }
}

// RPC: Get my own stats
function rpcGetMyStats(ctx, logger, nk, payload) {
  var BOOTSTRAP_DEVICE_ID = "tictactoe_auth_bootstrap";
  // Guard: reject calls from the bootstrap session to prevent stats leakage
  try {
    var account = nk.accountGetId(ctx.userId);
    if (account && account.devices) {
      for (var d = 0; d < account.devices.length; d++) {
        if (account.devices[d].id === BOOTSTRAP_DEVICE_ID) {
          return JSON.stringify({ error: "Unauthorized: bootstrap session cannot access player stats" });
        }
      }
    }
  } catch (e) {
    // If account lookup fails, proceed — the userId is likely a real user
  }
  var userId = ctx.userId;
  var stats = getPlayerStats(nk, logger, userId);
  return JSON.stringify(stats || { wins: 0, losses: 0, draws: 0, winRate: 0, avgMoveTime: 0 });
}

// RPC: Get any player's stats
function rpcGetPlayerStats(ctx, logger, nk, payload) {
  var input;
  try {
    input = JSON.parse(payload);
  } catch (e) {
    return JSON.stringify({ error: "Invalid JSON" });
  }
  var userId = input.userId;
  if (!userId) {
    return JSON.stringify({ error: "userId required" });
  }
  var stats = getPlayerStats(nk, logger, userId);
  return JSON.stringify(stats || { wins: 0, losses: 0, draws: 0, winRate: 0, avgMoveTime: 0 });
}
