![Architecture](https://img.shields.io/badge/architecture-server--authoritative-blue) ![Backend](https://img.shields.io/badge/backend-Nakama-green) ![Frontend](https://img.shields.io/badge/frontend-React-blue) ![Transport](https://img.shields.io/badge/realtime-WebSocket-orange)

# Server-Authoritative Tic-Tac-Toe (Nakama + React)

A robust, enterprise-grade multiplayer Tic-Tac-Toe system. This project demonstrates advanced backend patterns typical of large scale real-time games, relying on a **server-authoritative architecture** to coordinate state, enforce rules, validate moves safely against client manipulation, and prevent cheating.

## Live Deployments

* **Frontend (Vercel):** [https://nakama-fullstack-tictactoe.vercel.app/](https://nakama-fullstack-tictactoe.vercel.app/)
* **Backend (Nakama on Render):** [https://nakama-fullstack-tictactoe.onrender.com](https://nakama-fullstack-tictactoe.onrender.com)

## Source Code Repository

* **GitHub Repository:** [https://github.com/HarshitSRPT/nakama-fullstack-tictactoe](https://github.com/HarshitSRPT/nakama-fullstack-tictactoe)

## Backend Server Endpoint

**Production Nakama Endpoint:**
[https://nakama-fullstack-tictactoe.onrender.com](https://nakama-fullstack-tictactoe.onrender.com)

Used for:
- authentication
- matchmaking
- realtime websocket matches
- leaderboard reads
- authoritative move validation

WebSocket transport automatically upgrades via WSS when SSL=true.

---

## 🚦 Live Deployment Notes & Cold-Start Warning

**IMPORTANT:** This backend is hosted on the **Render Free Tier**. Because free instances automatically spin down (sleep) after 15 minutes of inactivity, the very first request you make (e.g., login or signup) may temporarily fail with a message like `"Account creation failed"` or experience a generic connection timeout. 

**This is expected behavior.** It simply means the backend is waking up from a cold start.

**Resolution:** If this happens, please wait **~20–40 seconds** and try again. Once the backend fully wakes up, matchmaking, authentication, and gameplay will proceed immediately and reliably.

---

## 🏗️ Architecture Diagram

```text
       [ Clients / Browsers ]
               │
               │ WebSocket (WSS) + JSON payload
               │
    ┌──────────▼──────────┐
    │     Load Balancer   │ (Render Edge / Local Docker)
    └──────────┬──────────┘
               │
    ┌──────────▼──────────┐
    │  Nakama Game Server │ (Go Core + JS Runtime)
    │                     │
    │  - Matchmaker       │ ───► Matches players (min 2)
    │  - Match Handlers   │ ───► Executes matchLoop.js
    │  - Leaderboards     │ ───► Processes Win RPCs
    └──────────┬──────────┘
               │
    ┌──────────▼──────────┐
    │PostgreSQL (Neon DB) │ (Persistent Data Layer)
    │  - User Profiles    │
    │  - Match Tracking   │
    │  - Leaderboards     │
    └─────────────────────┘
```

## 📐 Server Authoritative Guarantees

This system enforces the following strict, server-authoritative invariants to maintain competitive integrity:

- **Server Validates Moves**: Clients submit intent, but never have authority over the game state. The backend independently verifies whose turn it is and if the targeted cell is legally empty.
- **Prevents Cheating**: All match logic and board data are handled in the secure Nakama loop. Clients physically cannot forge wins or tamper with opponent input.
- **Controls Match Lifecycle**: The server is responsible for matchmaking, initializing the board, and gracefully closing out or resetting matches natively. 
- **Handles Reconnection Safely**: Reconnection logic inherently securely bridges disconnected clients right back into the middle of continuous loops based on their stored session properties.

---

## 🛠️ Architecture and Design Decisions

* **Why Nakama instead of Custom WebSockets (Node/Socket.io)?** Scaling generic custom WebSockets rapidly degenerates into rebuilding database integrations, UUID ledgers, and matchmakers manually. Nakama natively scales these mechanisms safely out of the box.
* **Backend Architecture:** The backend leverages the embedded **JavaScript Runtime** inside Nakama. Custom authoritative match logic executes dynamically in the match loops (`matchLoop.js`) effectively decoupled from client UI manipulation.
* **Frontend Architecture:** Built synchronously with React and Vite using the `@heroiclabs/nakama-js` SDK. Application state relies on the Context API to visually bind server data without any active local "prediction". The UI strictly waits on the socket broadcast.
* **Why Modular Runtime Handlers?** Scalability hygiene. The match logic is intelligently split across `matchLoop`, `matchJoin`, `matchLeave`, and `matchTerminate` simulating standard large-production architecture bounds.
* **Device vs Classic Authentication:** We simulate lightweight onboarding by keeping the friction low using standard password hashing, but hook directly into Nakama's robust session tokens, permitting smooth token validation over websockets.

---

## 🔍 How Evaluators Should Test Multiplayer

To verify the multiplayer mechanics securely, please follow these exact steps:

1. **Open two different browser windows** (e.g., Chrome and Firefox, or one regular window and one Incognito/Private window).
2. **Create two accounts:** Register distinct users to bypass single-user connection collisions.
3. **Join matchmaking:** Click the "Find Match" or "Timer Mode" button simultaneously in both browser windows to pair the accounts using the Nakama matchmaking pools.
4. **Test Timer Mode:** Rather than selecting 'Classic', navigate the UI to choose 'Timer Mode'. Verify that failing to move within the ~15-second allocated window successfully triggers an automated authoritative server forfeit, declaring the active player the loser gracefully.
5. **Verify Leaderboard Update:** Play a round to completion. Navigate to the global Leaderboard page to verify that the winning player's win count algorithmically incremented immediately following the server broadcasting the endgame configurations securely.

---

## ⚙️ Match Lifecycle, Matchmaking & Timer-Mode

Nakama coordinates matches dynamically through context handlers:
1. **Matchmaker Pairing:** Clients join a matchmaking pool synchronously, filtering by mode. Once pairs align (`properties.mode: timer` vs `classic`), the backend seamlessly bridges them.
2. **Timer Mode Enforcement:** In Timer Mode, the server calculates turn start ticks. If a player exceeds their allocated 15 seconds without pushing a valid `OP_MOVE`, `matchLoop.js` will automatically intervene, close the constraints, penalize the afk player, and broadcast `OP_GAME_OVER`.
3. **Loop Execution & Round Resets:** `matchLoop.js` processes boundaries asynchronously at a continuous frame rate (`TICK_RATE = 5`). On win detection, the server pauses gameplay chronologically, clears board configurations dynamically, swaps symbol assignments asynchronously, and restarts the loop actively.

---

## 🏆 Leaderboard Explanation

Game results flow securely. When the internal `matchLoop` detects a winning configuration structurally, or enforces a forfeit:
1. The server natively invokes `nk.leaderboardRecordWrite()` directly from within the backend runtime context.
2. This strictly bypasses any potential client REST API spoofing configurations.
3. The Leaderboard seamlessly updates the active ranking and syncs those values to whoever queries `listLeaderboardRecords` from the React presentation UI.

---

## 📡 Protocol, Endpoints & Server Configuration

### Backend Endpoint Documentation & Opcodes
All game lifecycle events broadcast over WSS mapping integer opcodes. These opcode contracts are strictly version-aligned between the frontend and backend:

* `OP_MOVE = 1` - Client payload expressing intent to place a mark.
* `OP_STATE = 2` - Server payload defining valid board/turn state arrays.
* `OP_GAME_OVER = 3` - Server payload outlining ending configurations (winners).
* `OP_ERROR = 4` - Server payload rejecting invalid moves securely.
* `OP_SURRENDER = 5` - Client payload voluntarily yielding the session mid-match.
* `OP_WILL_LEAVE = 8` - Client payload declaring intent to cleanly exit following the active round.
* `OP_TERMINATE = 99` - Server-forced graceful session closure directives removing the room instance natively.

---

## 💻 Setup and Installation Instructions (Local Development)

### 1. Repository Bootstrap
```bash
git clone <repository_url>
cd tictactoe-nakama
```

### 2. Docker Setup (Backend)
Ensuring you have Docker Desktop booted:
```bash
cd nakama-server
docker-compose up --build
```
This mounts PostgreSQL and boots Nakama locally.
* **Ports bound:** `7350` (API), `7351` (Backend Console)
* **Nakama Dev Console:** `http://localhost:7351` (Login: `admin` / `password`)

### 3. Frontend Setup
```bash
cd ../frontend
npm install
npm run dev
```

---

## 🔐 Environment Variables Explanation

*DO NOT commit sensitive configuration keys.* Check `.env.example` templates physically included internally in the repo.

**Backend Configuration Elements (`nakama-server/.env`):**
- `NAKAMA_DATABASE_ADDRESS`: Postgres connection URI determining where player profile ledger hashes locate.
- `NAKAMA_SESSION_ENCRYPTION_KEY`: A high-entropy salt binding active session tokens securely.

**Frontend Configuration Elements (`frontend/.env.local` / `Vercel Settings`):**
- `VITE_NAKAMA_HOST`: Domain or container IP connecting the `nakama-js` client endpoint.
- `VITE_NAKAMA_PORT`: Mapping edge listener rules (`7350` local, `443` production HTTPS).
- `VITE_NAKAMA_SSL`: Boolean enforcing WSS/HTTPS protocols aggressively vs unencrypted protocols.
- `VITE_NAKAMA_SERVER_KEY`: Nakama client-server payload authorization default gateway key string configuring initial anonymous sockets.

---

## 🚢 Deployment Process Documentation

### Backend (Render Deployment)
1. Hosted as a standard Web Service physically linked through a GitHub root integration referencing the active Dockerfile inside the `nakama-server` repository cluster.
2. An isolated external Postgres (Neon managed instance – production) container seamlessly integrates dynamically utilizing the `NAKAMA_DATABASE_ADDRESS` config pipeline safely defining runtime limits.
3. Automatically transpiles internal ES6 JS modules running a `railway-start.sh` or standard bash pipeline merging files linearly to load directly to the active Goja handler core.

### Frontend (Vercel)
1. Bound immediately inside the Vercel edge CI mapping the `frontend` folder context.
2. Evaluates the Vite `npm run build` process and populates identical environments for `VITE_NAKAMA_*` keys natively mapping correctly to the active secure Render target endpoint dynamically without exposing localhost fallbacks safely.

---

## 📝 Evaluator Quick Test Checklist

To validate functionality quickly:

1. Open the deployed frontend:
   [https://nakama-fullstack-tictactoe.vercel.app/](https://nakama-fullstack-tictactoe.vercel.app/)

2. Create two users (two browsers or incognito window)

3. Click "Find Match" in both windows

4. Verify:
   - matchmaking pairs correctly
   - moves sync in realtime
   - invalid moves rejected
   - timer mode enforces 15-second timeout
   - leaderboard updates after win

**If signup initially fails:**
Wait 20–40 seconds and retry (Render cold-start wake behavior).