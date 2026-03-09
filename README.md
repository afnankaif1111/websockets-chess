# ChessLive

Real-time multiplayer chess built with **Next.js, Express, Socket.IO and PostgreSQL**.

Players can create games, join matches, and watch ongoing games as spectators.  
Moves are validated on the server using **chess.js** and every move is stored in the database so games can be replayed later.

---

## Stack

**Frontend**
- Next.js
- TypeScript
- TailwindCSS
- react-chessboard
- Zustand

**Backend**
- Node.js
- Express
- Socket.IO
- Prisma

**Database**
- PostgreSQL

---

## Features

- Real-time chess using WebSockets
- Create or join games from a lobby
- Spectator mode for live games
- Server-side move validation with chess.js
- Game history stored in PostgreSQL
- Replay completed games move-by-move
- JWT authentication

---

## Project Structure

```
chess-app
│
├── frontend/     # Next.js client
├── backend/      # Express + Socket.IO server
├── prisma/       # database schema and migrations
├── docker/       # docker files
└── docker-compose.yml
```

---

## Running Locally

### Requirements

- Node.js 20+
- PostgreSQL

### Clone the repository

```
git clone <repo-url>
cd chess-app
```

### Install dependencies

```
npm run install:all
```

### Create environment files

```
backend/.env
frontend/.env.local
```

Example backend `.env`

```
DATABASE_URL=postgresql://user:password@localhost:5432/chessdb
JWT_SECRET=your_secret_key
PORT=4000
```

### Run database migrations

```
npm run prisma:migrate
```

### Start development servers

```
npm run dev
```

Frontend

```
http://localhost:3000
```

Backend

```
http://localhost:4000
```

---

## Deployment

The project can be deployed using:

- **Neon / Supabase** for PostgreSQL
- **Railway / Render** for the backend
- **Vercel** for the frontend

After setting environment variables run:

```
npm run prisma:push
```

---

## Future Improvements

- Chess timers (blitz / rapid)
- ELO rating system
- In-game chat
- Puzzle mode
- Stockfish integration

---

Built for learning and experimenting with real-time multiplayer systems.