const { Client } = require("@heroiclabs/nakama-js");
const WebSocket = require('ws');

// Patch nakama-js which looks for browser WebSocket or requires polyfill
global.WebSocket = WebSocket;

async function runTest() {
    console.log("=== STARTING BACKEND VALIDATION TEST ===");

    const client1 = new Client("defaultkey", "127.0.0.1", "7350");
    const client2 = new Client("defaultkey", "127.0.0.1", "7350");

    console.log("[Phase 6] Authenticating users...");
    const session1 = await client1.authenticateDevice("device-player-1", true);
    const session2 = await client2.authenticateDevice("device-player-2", true);

    console.log("[Phase 6] Opening websockets...");
    const socket1 = client1.createSocket(false, false);
    await socket1.connect(session1, true);
    
    const socket2 = client2.createSocket(false, false);
    await socket2.connect(session2, true);

    let matchId = null;
    let userId1 = session1.user_id;

    // Hook up listeners
    socket1.onmatchmakermatched = async (matched) => {
        console.log("[Phase 5] Matchmaker generated match ID:", matched.match_id);
        const match = await socket1.joinMatch(matched.match_id, matched.token);
        matchId = match.match_id;
        console.log("[Phase 6] Player 1 successfully executed matchJoin");
    };

    socket2.onmatchmakermatched = async (matched) => {
        const match = await socket2.joinMatch(matched.match_id, matched.token);
        console.log("[Phase 6] Player 2 successfully executed matchJoin");

        // Wait a second then simulate a winning game
        setTimeout(simulateGame, 1000);
    };

    // Listen to broadcast messages (Phase 9)
    socket1.onmatchdata = (result) => {
        const data = JSON.parse(new TextDecoder().decode(result.data));
        console.log(`[Phase 9] Dispatcher broadcast received by P1:`, data);
        
        if (data.gameOver) {
            console.log("\n[Phase 8] Game Over! Winner detected:", data.winner);
            // Wait 2s to allow server to write leaderboard, then read it
            setTimeout(checkLeaderboard, 2000);
        }
    };

    console.log("[Phase 5] Adding to Matchmaker (simulating 2 players searching)...");
    const ticket1 = await socket1.addMatchmaker("*", 2, 2);
    console.log("P1 added to matchmaker with ticket:", ticket1.ticket);
    const ticket2 = await socket2.addMatchmaker("*", 2, 2);
    console.log("P2 added to matchmaker with ticket:", ticket2.ticket);

    async function simulateGame() {
        console.log("\n[Phase 9] Simulating Match Traffic...");
        // Send moves to make Player 1 (X) win: Top row (0, 1, 2)
        
        // P1 takes 0
        await socket1.sendMatchState(matchId, 1, JSON.stringify({ type: "move", position: 0 }));
        await wait(500);
        // P2 takes 3
        await socket2.sendMatchState(matchId, 1, JSON.stringify({ type: "move", position: 3 }));
        await wait(500);
        // P1 takes 1
        await socket1.sendMatchState(matchId, 1, JSON.stringify({ type: "move", position: 1 }));
        await wait(500);
        // P2 takes 4
        await socket2.sendMatchState(matchId, 1, JSON.stringify({ type: "move", position: 4 }));
        await wait(500);
        // P1 takes 2 (Wins!)
        await socket1.sendMatchState(matchId, 1, JSON.stringify({ type: "move", position: 2 }));
    }

    async function checkLeaderboard() {
        console.log("\n[Phase 8] Reading Leaderboard to verify pipeline...");
        try {
            const records = await client1.listLeaderboardRecords(session1, "tictactoe_wins");
            console.log("Leaderboard records fetched:");
            console.log(JSON.stringify(records, null, 2));

            if (records.records && records.records.length > 0) {
                console.log("✅ Leaderboard write pipeline = SUCCESS");
            } else {
                console.log("❌ Leaderboard empty - write failed or not written yet");
            }
        } catch (e) {
            console.error("Leaderboard fetch error:", e.message);
        }

        console.log("\n[Phase 7] Disconnecting to trigger matchTerminate...");
        socket1.disconnect();
        socket2.disconnect();

        setTimeout(() => {
            console.log("\n=== ALL PHASES TESTED ===");
            console.log("Check the docker-compose terminal to verify 'matchInit', 'matchJoin', 'matchLoop', and 'matchTerminate' logs!");
            process.exit(0);
        }, 1000);
    }
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

runTest().catch(e => {
    console.error("Test Script Error:", e);
    process.exit(1);
});
