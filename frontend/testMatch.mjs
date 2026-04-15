import { Client, Session } from "@heroiclabs/nakama-js";

async function testTimerMatch() {
  const client = new Client("defaultkey", "127.0.0.1", "7350", false);
  const session1 = await client.authenticateCustom("testUser1", true, "testUser1");
  const session2 = await client.authenticateCustom("testUser2", true, "testUser2");

  const socket1 = client.createSocket(false, false);
  await socket1.connect(session1, true);

  const socket2 = client.createSocket(false, false);
  await socket2.connect(session2, true);

  socket1.onmatchmakermatched = async (matched) => {
    console.log("Player 1 matched:", matched);
    await socket1.joinMatch(matched.match_id, matched.token);
    setTimeout(() => { process.exit(0); }, 1000);
  };

  socket2.onmatchmakermatched = async (matched) => {
    console.log("Player 2 matched:", matched);
    await socket2.joinMatch(matched.match_id, matched.token);
  };

  const stringProps = { mode: "timer" };
  await socket1.addMatchmaker("+properties.mode:timer", 2, 2, stringProps);
  await socket2.addMatchmaker("+properties.mode:timer", 2, 2, stringProps);
  
  console.log("Waiting for match...");
}

testTimerMatch().catch(console.error);
