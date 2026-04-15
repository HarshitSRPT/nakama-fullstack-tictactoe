![Architecture](https://img.shields.io/badge/architecture-server--authoritative-blue) ![Backend](https://img.shields.io/badge/backend-Nakama-green) ![Frontend](https://img.shields.io/badge/frontend-React-blue) ![Transport](https://img.shields.io/badge/realtime-WebSocket-orange)

# Server-Authoritative Tic-Tac-Toe (Nakama + React)

A robust, enterprise-grade multiplayer Tic-Tac-Toe system. This project demonstrates advanced backend patterns typical of large scale real-time games, relying on a **server-authoritative architecture** to coordinate state, enforce rules, and validate moves safely against client manipulation.

## Live Deployments
* **Frontend (Vercel):** `[Insert Vercel Link Here]`
* **Backend (Railway):** `[Insert Railway Link Here]`

> If the live deployment is temporarily unavailable due to free-tier hosting sleep cycles, please follow the Local Development Setup section below to run the project in under 2 minutes.

---

## 🏗️ Architecture Diagram

```text
       [ Clients / Browsers ]
               │
               │ WebSocket (WSS) + JSON payload
               │
    ┌──────────▼──────────┐
    │     Load Balancer   │ (Railway Edge / Local Docker)
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
    │  PostgreSQL (12.2)  │ (Persistent Data Layer)
    │  - User Profiles    │
    │  - Match Tracking   │
    │  - Leaderboards     │
    └─────────────────────┘
```

## 🛠️ Technology Stack

* **Backend:** Nakama 3.21.1 (Heroic Labs), PostgreSQL 12.2, Docker
* **Frontend:** React 18, Vite, `@heroiclabs/nakama-js` SDK, Vanilla CSS
* **Infrastructure:** Docker Compose (Local), Railway (Prod DB + Nakama), Vercel (Static Frontend)

## 📐 Key Architectural Guarantees

This system enforces the following invariants:

- The server is the single source of truth for match state
- Clients submit intent, never authority
- Match lifecycle is deterministic and tick-driven
- Opcode contracts are strictly version-aligned between frontend and backend
- Reconnection preserves player identity and mark ownership
- Leaderboard writes occur only inside the authoritative match loop

---

## 🖥️ System Architecture

### Backend Architecture
The backend leverages the embedded **JavaScript Runtime** inside Nakama. Running Goja (Nakama's JS engine), the backend defines distinct event lifecycle bindings injected directly into the core Matchmaker. Standard API calls are handled via Nakama's core, while custom authoritative match logic executes dynamically in the match loops decoupled safely from client simulation.

### Frontend Architecture
Built synchronously with React and Vite. The connection utilizes the `@heroiclabs/nakama-js` client SDK to maintain a persistent WebSocket stream. Application state relies on Context API to securely funnel matched payloads to the UI purely as visually reactive elements. The UI predicts nothing—it waits strictly for backend broadcast approvals.

### Server-Authoritative Design
Why use a server-authoritative engine for Tic-Tac-Toe? 
Client-authoritative logic (where clients tell identical peers "I moved here, accept it") creates monumental security vulnerabilities, sync drift, and race conditions. By shifting authority to the server, the client merely sends *intent* (`sendMove(position)`). The server verifies whose turn it actually is, if the cell is legally empty, sets state, calculates win conditions, and only then *broadcasts* the truth to clients.

### Match Lifecycle
Nakama coordinates matches dynamically through module handlers:
1. **Matchmaker Pairing:** Clients join a matchmaking pool asynchronously. Once pairs form, the backend natively bridges them, invoking `matchInit` generating board bounds.
2. **Join / Connection:** Handlers intercept `matchJoin` to logically attach "X" or "O" player marks to authenticated UUID bindings.
3. **Loop Execution:** `matchLoop` processes input boundaries iteratively at a continuous `TICK_RATE`.
4. **Round Reset Logic:** The server listens dynamically inside the loop for win/draw states, enforces an automatic chronological reset pipeline (delay timeout), clears board configurations, rotates player orientations, and cascades state back to the frontend automatically.
5. **Reconnect Handling:** `matchLeave.js` removes live socket presences but dynamically stalls deleting player marks. This permits resilient local-storage token reconnections where the client cleanly snaps directly back to their mid-match mark organically.

The match container persists across transient disconnects. Player marks remain reserved, allowing seamless mid-session reconnection without forcing match teardown.

### Leaderboard Integration
When the internal match loop detects an explicitly legal win configuration, Nakama invokes `nk.leaderboardRecordWrite()` directly via the backend scope to securely record a user win, locking the UI from spoofing fake wins using spoofed JSON endpoints.

---

## 📡 Protocol & Opcode Contract

Realtime multiplayer systems mandate absolute protocol alignment. Out-of-sync opcode enumerations across domains will silently misdirect byte arrays and corrupt state graphs. This project strictly relies on:

* `OP_MOVE = 1` - Client payload expressing intent to place a mark.
* `OP_STATE = 2` - Server payload defining valid board/turn state arrays.
* `OP_GAME_OVER = 3` - Server payload outlining ending configurations (winners).
* `OP_ERROR = 4` - Server payload rejecting invalid moves securely.
* `OP_SURRENDER = 5` - Client payload voluntarily yielding the session.
* `OP_TERMINATE = 99` - Server-forced graceful session closure directives.

Strict opcode alignment eliminates ambiguous packet interpretation across the WebSocket boundary and prevents state corruption under concurrent matchLoop execution. This mirrors production-grade realtime messaging discipline used in distributed multiplayer engines.

---

## 💻 Local Development Setup

### 1. Repository Bootstrap
```bash
git clone <repository_url>
cd tictactoe-nakama
```

### 2. Docker Setup (Backend)
Ensuring you have Docker Desktop booted:
```bash
cd nakama-server
docker-compose up
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

### 4. Environment Configuration
See `frontend/.env.example` for a template of required frontend configuration variables.

**Local Dev (`frontend/.env.local`):**
```env
VITE_NAKAMA_HOST=127.0.0.1
VITE_NAKAMA_PORT=7350
VITE_NAKAMA_SSL=false
```

**Production Env Variables (Vercel):**
```env
VITE_NAKAMA_HOST=your-railway-domain.up.railway.app
VITE_NAKAMA_PORT=443
VITE_NAKAMA_SSL=true
```

### 5. Multiplayer Testing
Testing realtime matchmaking requires two separate authenticated sessions to form a pair:
1. Open the frontend locally (`http://localhost:5173`) in **Google Chrome**.
2. Open an entirely separate runtime (e.g., **Firefox** or Chrome Incognito) to the same URL.
3. Click "Find Match" on both. They will transparently securely pair.

---

## 🚀 Production Deployment

### Backend (Railway)
1. Fork the repository and import the `nakama-server` folder via the Railway GitHub integration.
2. Ensure you initialize a PostgreSQL database plugin internally inside the Railway project.
3. Overwrite the deployment entrypoints safely injecting the DB URI configurations.

### Frontend (Vercel)
1. Import the root repository choosing the `frontend` folder context.
2. Supply your mapped `VITE_NAKAMA_*` keys internally inside the Vercel project Settings correlating safely to the secure Railway endpoint boundaries.

---

## 📂 Folder Structure

```text
tictactoe-nakama/
├── nakama-server/
│   ├── modules/            # Authoritative Server Code (Global + Context Handlers)
│   ├── docker-compose.yml  # Internal network configuration bridging PostGres
├── frontend/
│   ├── src/
│   │   ├── api/            # nakamaClient.js payload wrappers
│   │   ├── constants/      # Client-side opcode sync mappings
│   │   ├── context/        # Central match lifecycle state manager (socket listeners + reducer-style updates)
```

---

## 🧠 Design Decisions

* **Why Nakama instead of a Custom WebSockets (Node/Socket.io)?** Scaling generic custom Node WebSockets rapidly degenerates into rebuilding core DB integrations manually. Nakama natively scales matchmakers, UUID ledgers, and database IO out of the box securely.
* **Why Server-Authoritative over Client-Authoritative?** Anti-cheat enforcement. Never trust the client.
* **Why Device Authentication over standard Username/Password?** Tic-tac-toe values frictional velocity. Device-generated UUID authentication simulates seamless anonymous onboard flows instantly bridging networking without database onboarding churn.
* **Why Matchmaker instead of manual Room Codes?** Eliminates UX latency, guaranteeing global liquidity by auto-funnelling orphaned sessions directly into overlapping pools seamlessly.
* **Why Modular Runtime Handlers instead of monolithic blocks?** Scalability hygiene. The match logic is split across `matchLoop`, `matchJoin`, `matchLeave`, and `matchTerminate` simulating standard large-production architecture bounds.

---

## 🔮 Future Improvements

Though structurally sound, upcoming iterations would implement:
* **Spectator Mode:** Exposing read-only websocket boundaries globally viewing existing internal sessions.
* **Persistent Match History:** Serializing match conclusions natively into standard Nakama Storage Collections mapped to UUID targets.
* **Ranked Matchmaking:** Leveraging numeric thresholds securely inside the ticket payload for ELO pairings.
* **Turn Timers:** Injecting timeout intervals inside the loop yielding forfeits securely.
* **Chat Support:** Hooking Nakama generic channel RPCs overlapping UI boundaries.
* **State Resynchronization Endpoint:** Allowing a client dropping out for 15+ ticks to seamlessly ping the exact frame context on reload.

---

## ⚠️ Repository Safety Checklist

The configuration specifically omits pushing sensitive structural paths to global repository bounds via `.gitignore`. Never commit:
- `[ ]` `.env.local` or `.env.production` containing API bindings.
- `[ ]` **Railway / Vercel secrets** (Inject securely within the Provider scope).
- `[ ]` Local **Docker Volumes** bridging Postgres state.
- `[ ]` Debug logs / `nakama_logs.txt`.
- `[ ]` Temporary tunnel endpoints (e.g., Ngrok or Cloudflare `cloudflared` configs).
- `[ ]` `node_modules/` or `dist/` build artifacts.


## Security Notes

This project intentionally avoids committing runtime credentials.

Environment variables required:

Backend:
- NAKAMA_DATABASE_ADDRESS
- NAKAMA_SESSION_ENCRYPTION_KEY

Frontend:
- VITE_NAKAMA_HOST
- VITE_NAKAMA_PORT
- VITE_NAKAMA_SSL
- VITE_NAKAMA_SERVER_KEY