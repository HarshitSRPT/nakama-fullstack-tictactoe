#!/bin/bash
# Railway deployment script for Nakama Server

echo "Concatenating JavaScript modules..."
cd modules
cat constants.js extensions/gameModeConstants.js helpers.js extensions/auth.js extensions/stats.js extensions/leaderboardStats.js extensions/timerMode.js extensions/modeMatchmaker.js matchInit.js matchJoin.js matchLeave.js matchLoop.js matchTerminate.js matchSignal.js matchmaker.js leaderboardRpc.js zzindex.js > build.js
cd ..

echo "Running migrations..."
/nakama/nakama migrate up --database.address "${NAKAMA_DATABASE_ADDRESS}"

echo "Starting Nakama server..."
exec /nakama/nakama --name nakama1 \
    --database.address "${NAKAMA_DATABASE_ADDRESS}" \
    --logger.level INFO \
    --session.token_expiry_sec 7200 \
    --session.encryption_key "${NAKAMA_SESSION_ENCRYPTION_KEY}" \
    --runtime.js_entrypoint "build.js"
