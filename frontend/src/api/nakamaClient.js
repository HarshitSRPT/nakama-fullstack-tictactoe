import { Client, Session } from "@heroiclabs/nakama-js";
import { OP_MOVE, OP_STATE, OP_GAME_OVER, OP_ERROR, OP_SURRENDER, OP_WILL_LEAVE, OP_TERMINATE, OP_COMPARISON } from "../constants/opcodes.js";

let client;
let session;
let socket;

let connectionPromise = null;

/**
 * Initializes the Nakama client, restores the session from a server-generated token,
 * connects the socket, and registers all socket listeners.
 *
 * SECURITY: The client NEVER calls authenticateCustom(). Sessions are only
 * created by server RPCs (rpcRegisterUser / rpcLoginUser) after password
 * validation. The token is restored here via Session.restore().
 */
export async function initializeClient(callbacks = {}, authUsername = null) {
  if (!client) {
    const host = import.meta.env.VITE_NAKAMA_HOST;
    const port = import.meta.env.VITE_NAKAMA_PORT;
    const ssl = import.meta.env.VITE_NAKAMA_SSL === "true";
    const serverKey = import.meta.env.VITE_NAKAMA_SERVER_KEY;
    client = new Client(serverKey, host, port, ssl);
  }

  if (!session) {
    // Restore session from the server-generated token stored in localStorage.
    // This token was created by nk.authenticateTokenGenerate() on the server
    // AFTER password validation — no client-side authenticateCustom needed.
    const savedToken = localStorage.getItem("auth_session_token");
    if (savedToken) {
      session = Session.restore(savedToken, "");

      // Validate token hasn't expired
      if (session.isexpired()) {
        console.warn("Stored session token has expired. Please log in again.");
        session = null;
        throw new Error("Session expired. Please log in again.");
      }

      console.log("Nakama session restored from server token. User ID:", session.user_id);
    } else {
      throw new Error("No session token found. Please log in first.");
    }
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

  // ALWAYS attach handlers synchronously on every initializeClient call!
  // In React 18 StrictMode, the initial render gets unmounted, creating a stale closure.
  // We must update the global socket event listeners with the fresh scope every setup.
  socket.onmatchdata = (matchState) => {
    const opcode = Number(matchState.op_code);
    const dataString = new TextDecoder().decode(matchState.data);
    let data;
    try {
      data = JSON.parse(dataString);
    } catch (e) {
      console.warn("Invalid match data received:", e.message);
      return;
    }

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
      case OP_COMPARISON:
        if (callbacks.onComparison) callbacks.onComparison(data);
        break;
      case OP_TERMINATE:
        if (callbacks.onTerminate) callbacks.onTerminate(data);
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
 * Submits a matchmaking request with mode-aware string properties.
 * @param {string} mode - "classic" or "timer"
 */
export async function findMatch(mode = "classic") {
  if (!socket) throw new Error("Socket is not initialized.");

  const query = "+properties.mode:" + mode;
  const minCount = 2;
  const maxCount = 2;
  const stringProperties = { mode: mode };

  const matchmakerTicket = await socket.addMatchmaker(query, minCount, maxCount, stringProperties);
  currentMatchmakerTicket = matchmakerTicket;
  console.log("Joined matchmaker with ticket:", matchmakerTicket.ticket, "mode:", mode);
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

export async function signalLeaveNextRound(matchId) {
  if (!socket || !matchId) return;
  try {
    const data = JSON.stringify({ intent: "leave_after_game" });
    await socket.sendMatchState(matchId, OP_WILL_LEAVE, data);
  } catch (err) {
    console.error("Failed to signal leave next round:", err);
  }
}

/**
 * Call a server RPC.
 * @param {string} rpcId - the RPC name
 * @param {object|string} payload - JSON payload
 */
export async function rpc(rpcId, payload = {}) {
  if (!client || !session) throw new Error("Client not initialized");
  const result = await client.rpc(session, rpcId, payload);
  return typeof result.payload === "string" ? JSON.parse(result.payload) : result.payload;
}

export function getSession() {
  return session;
}

export function getClient() {
  return client;
}

/**
 * Resets the client state (used on logout).
 * Properly disconnects the socket before nulling references.
 */
export function resetClient() {
  if (socket) {
    try {
      socket.disconnect(false);
    } catch (e) {
      console.warn("Socket disconnect error:", e);
    }
  }
  socket = null;
  session = null;
  client = null;
  connectionPromise = null;
}
