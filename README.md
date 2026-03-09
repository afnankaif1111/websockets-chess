# ♟ ChessLive — Real-Time Multiplayer Chess

A full-stack real-time multiplayer chess application built for production. Players can create games, challenge opponents, and spectators can watch live matches. All games are persisted to PostgreSQL and can be replayed move-by-move.

---

## 🏗 Architecture

```
chess-app/
├── frontend/           # Next.js 14 + TypeScript + TailwindCSS
│   ├── components/
│   │   ├── auth/       # Login / Register form
│   │   ├── board/      # GameBoard, PlayerCard, MoveList
│   │   └── lobby/      # Game list, create/join UI
│   ├── hooks/
│   │   └── useGame.ts  # Real-time game state via Socket.IO
│   ├── lib/
│   │   ├── api.ts      # REST API client
│   │   ├── socket.ts   # Socket.IO singleton
│   │   └── authStore.ts # Zustand auth state
│   └── pages/
│       ├── index.tsx   # Lobby + game view
│       └── game/[id]   # Replay viewer
│
├── backend/            # Express + Socket.IO + Prisma
│   └── src/
│       ├── controllers/ # Auth + Game REST handlers
│       ├── routes/      # Express routers
│       ├── sockets/     # Socket.IO event handlers
│       ├── services/    # Game logic (chess.js validation)
│       ├── middlewares/ # JWT auth, error handler
│       └── lib/         # Prisma client singleton
│
├── prisma/
│   ├── schema.prisma   # DB schema: User, Game, Move
│   └── migrations/     # SQL migrations
│
├── docker/
│   ├── Dockerfile.backend
│   └── Dockerfile.frontend
│
└── docker-compose.yml  # Postgres + Backend + Frontend
```

---

## 🔌 Socket.IO Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `create_game` | Client → Server | Create a new game (you are white) |
| `join_game` | Client → Server | Join as black or spectator |
| `spectator_join` | Client → Server | Join as spectator |
| `player_move` | Client → Server | Submit a move (SAN notation) |
| `reconnect_player` | Client → Server | Reconnect to an ongoing game |
| `game_state` | Server → Client | Full game state snapshot |
| `move_made` | Server → Client | Broadcast validated move |
| `player_joined` | Server → Client | Second player joined |
| `game_over` | Server → Client | Checkmate or draw |
| `spectator_update` | Server → Client | Spectator count changed |
| `error` | Server → Client | Error message |

---

## 🗄 Database Schema

```
User        id, username, email, passwordHash, createdAt
Game        id, whitePlayerId, blackPlayerId, status, fen, winner, createdAt
Move        id, gameId, playerId, move (SAN), fen, moveNumber, createdAt
```

---

## 🚀 Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# Clone and enter project
git clone <repo-url> && cd chess-app

# Start everything (postgres + backend + frontend)
docker-compose up --build

# App will be live at:
# Frontend: http://localhost:3000
# Backend:  http://localhost:4000
# Health:   http://localhost:4000/health
```

### Option 2: Local Development

**Prerequisites:** Node.js 20+, PostgreSQL 14+

```bash
# 1. Install all dependencies
npm run install:all

# 2. Set up environment variables
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# Edit backend/.env — set your DATABASE_URL and JWT_SECRET

# 3. Run database migrations
npm run prisma:migrate

# 4. Start both servers concurrently
npm install       # install root concurrently
npm run dev

# Frontend → http://localhost:3000
# Backend  → http://localhost:4000
```

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)
```env
DATABASE_URL=postgresql://chess:chess@localhost:5432/chessdb
JWT_SECRET=your-super-secret-key-change-in-production
PORT=4000
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

---

## 📡 REST API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | No | Register new user |
| POST | `/auth/login` | No | Login, returns JWT |
| GET | `/games` | No | List active games |
| POST | `/games/create` | Yes | Create a new game |
| GET | `/games/history` | Yes | User's game history |
| GET | `/games/:id` | No | Single game + moves (for replay) |
| GET | `/health` | No | Health check |

---

## 🎮 Features

- **Real-time gameplay** via Socket.IO — moves appear instantly for both players
- **Move validation** — chess.js validates every move server-side before broadcasting
- **Spectator mode** — join any active game as a spectator with live updates
- **Reconnection** — disconnect and reconnect to the same game
- **Game persistence** — every move stored in PostgreSQL
- **Game replay** — navigate through any completed game move by move (← → keys)
- **JWT auth** — register/login with persistent sessions
- **Lobby** — live-refreshing game list, create or join in one click

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, TailwindCSS |
| Chess UI | react-chessboard, chess.js |
| Real-time | Socket.IO client/server |
| State | Zustand |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL 16 |
| ORM | Prisma |
| Auth | JWT (jsonwebtoken, bcryptjs) |
| Validation | Zod |
| Infra | Docker, Docker Compose |

---

## 📝 Development Notes

- The backend uses an **in-memory game cache** (Chess instances) for fast move validation, backed by PostgreSQL for durability.
- Socket rooms follow the pattern `game:<gameId>` for targeted broadcasts.
- The frontend dynamically imports `react-chessboard` to avoid SSR issues.
- JWT tokens are stored in `localStorage` and sent with every socket event.

---

## 🔒 Security Notes for Production

- Change `JWT_SECRET` to a cryptographically random value
- Use HTTPS and WSS in production
- Consider rate-limiting the auth endpoints
- The `FRONTEND_URL` CORS whitelist should be set to your deployed domain

---

## 🚢 Deployment Notes (Quick)

Use this checklist if you want to deploy quickly with a Neon Postgres database.

### 1) Prepare Neon database URLs

From Neon, copy both connection strings:
- **Pooled URL** (`-pooler` host) → use for `DATABASE_URL`
- **Direct URL** (non-pooler host) → use for `DIRECT_URL`

Both must start with `postgresql://`.

### 2) Backend environment variables

Set these in your backend hosting provider:

```env
DATABASE_URL=postgresql://<user>:<password>@<pooler-host>/<db>?sslmode=require&channel_binding=require
DIRECT_URL=postgresql://<user>:<password>@<direct-host>/<db>?sslmode=require&channel_binding=require
JWT_SECRET=<long-random-secret>
PORT=4000
FRONTEND_URL=https://<your-frontend-domain>
NODE_ENV=production
```

### 3) Frontend environment variables

Set these in your frontend hosting provider:

```env
NEXT_PUBLIC_API_URL=https://<your-backend-domain>
NEXT_PUBLIC_SOCKET_URL=https://<your-backend-domain>
```

### 4) Build/start commands

- Backend build: `npm run build` (inside `backend/` or root build script)
- Backend start: `npm run start` (inside `backend/`)
- Frontend build: `npm run build` (inside `frontend/`)
- Frontend start: `npm run start` (inside `frontend/`)

### 5) Apply schema to Neon

Run once after setting backend env vars:

```bash
npm run prisma:push
```

### 6) Post-deploy check

- `GET /health` on backend should return `{ "status": "ok" }`
- Frontend should load lobby and fetch `/games` without `Failed to fetch`

---

*Built with ♟ using Next.js, Express, Socket.IO, and PostgreSQL*
# websockets-chess
