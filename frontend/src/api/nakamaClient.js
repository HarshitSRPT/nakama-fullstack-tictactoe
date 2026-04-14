import { Client } from "@heroiclabs/nakama-js";
import { getOrCreateDeviceId } from "../utils/deviceId.js";
import { OP_MOVE, OP_STATE, OP_GAME_OVER, OP_ERROR, OP_SURRENDER, OP_TERMINATE } from "../constants/opcodes.js";

let client;
let session;
let socket;

let connectionPromise = null;

/**
 * Initializes the Nakama client, authenticates the device, and connects the socket.
 * It also registers the socket listeners for match data and matchmaking.
 */
export async function initializeClient(callbacks = {}) {
  if (!client) {
    const host = import.meta.env.VITE_NAKAMA_HOST || "127.0.0.1";
    const port = import.meta.env.VITE_NAKAMA_PORT || "7350";
    const ssl = import.meta.env.VITE_NAKAMA_SSL === "true";
    client = new Client("defaultkey", host, port, ssl);
  }

  if (!session) {
    const deviceId = getOrCreateDeviceId();
    try {
      session = await client.authenticateDevice(deviceId, false);
    } catch {
      session = await client.authenticateDevice(deviceId, true);
    }
    console.log("Nakama session authenticated. User ID:", session.user_id);
  }

  if (!socket) {
    const useSSL = import.meta.env.VITE_NAKAMA_SSL === "true";
    socket = client.createSocket(useSSL, false);
    connectionPromise = socket.connect(session, true).then(() => {
      console.log("Nakama socket connected.");
    });
  }

  if (connectionPromise) {
    await connectionPromise;
  }

  // ALWAY attach handlers synchronously on every initializeClient call!
  // In React 18 StrictMode, the initial render gets unmounted, creating a stale closure.
  // We must update the global socket event listeners with the fresh scope every setup.
  socket.onmatchdata = (matchState) => {
    const opcode = Number(matchState.op_code); console.log('RECEIVED MATCH DATA:', matchState);
    const dataString = new TextDecoder().decode(matchState.data);
    const data = JSON.parse(dataString);

    switch (opcode) {
      case OP_STATE:
        if (callbacks.onStateUpdate) callbacks.onStateUpdate(data);
        break;
      case OP_GAME_OVER:
        if (callbacks.onGameOver) callbacks.onGameOver(data);
        break;
      case OP_ERROR:
        if (callbacks.onError) callbacks.onError(data);
        break;
      case OP_TERMINATE:
        alert("Match ended by server");
        if (callbacks.onDisconnect) callbacks.onDisconnect();
        break;
    }
  };

  socket.onmatchpresence = (presenceEvent) => {
    if (callbacks.onMatchPresence) callbacks.onMatchPresence(presenceEvent);
  };

  socket.ondisconnect = () => {
    if (callbacks.onDisconnect) callbacks.onDisconnect();
  };

  socket.onmatchmakermatched = async (matched) => {
    console.info("Matchmaker matched! Joining match:", matched);
    // Important: The backend matchmaker hook creates an authoritative match,
    // so Nakama returns `matched.match_id` instead of a relayed `matched.token`.
    try {
      const match = await socket.joinMatch(matched.match_id, matched.token);
      if (callbacks.onMatchJoined) {
        callbacks.onMatchJoined(match, matched);
      }
    } catch (err) {
      console.error("Error joining matched game:", err);
      if (callbacks.onDisconnect) callbacks.onDisconnect();
    }
  };

  return { client, session, socket };
}

let currentMatchmakerTicket = null;

/**
 * Submits a matchmaking request to the server, ensuring exactly 2 players.
 */
export async function findMatch() {
  if (!socket) throw new Error("Socket is not initialized.");

  const query = "*";
  const minCount = 2; // Match pairs exactly 2 players
  const maxCount = 2;

  const matchmakerTicket = await socket.addMatchmaker(query, minCount, maxCount);
  currentMatchmakerTicket = matchmakerTicket;
  console.log("Joined matchmaker with ticket:", matchmakerTicket.ticket);
  return matchmakerTicket;
}

/**
 * Removes the active ticket from the matchmaker.
 */
export async function cancelMatchmaking() {
  if (!socket || !currentMatchmakerTicket) return;
  try {
    await socket.removeMatchmaker(currentMatchmakerTicket.ticket);
  } catch (err) {
    console.error("Failed to cancel matchmaking:", err);
  }
  currentMatchmakerTicket = null;
  console.log("Removed ticket from matchmaker pool.");
}

/**
 * Exits the current match and cleans up locally cached IDs.
 */
export async function leaveMatch(matchId) {
  if (!socket || !matchId) return;
  try {
    await socket.leaveMatch(matchId);
    localStorage.removeItem("active_match_id");
  } catch (err) {
    console.error("Error leaving match", err);
  }
  console.log("Left match:", matchId);
}
export async function sendMove(matchId, position) {
  if (!socket) throw new Error("Socket is not initialized.");

  const data = JSON.stringify({ type: "move", position: position.toString() });
  await socket.sendMatchState(matchId, OP_MOVE, data);
}

export async function surrenderMatch(matchId) {
  if (!socket) return;
  try {
    const data = JSON.stringify({ type: "surrender" });
    await socket.sendMatchState(matchId, OP_SURRENDER, data);
  } catch (err) {
    console.error("Failed to cleanly surrender:", err);
  }
}



export function getSession() {
  return session;
}
