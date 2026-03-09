import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { Chess } from 'chess.js';
import { prisma } from '../lib/prisma';
import { applyMove, evictGame } from '../services/gameService';
import type { ServerToClientEvents, ClientToServerEvents } from '../types/socket';

// Track spectator counts per game room
const spectatorCounts = new Map<string, number>();

function verifyToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string };
    return payload.userId;
  } catch {
    return null;
  }
}

async function buildGameState(gameId: string, io: Server) {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      whitePlayer: { select: { id: true, username: true } },
      blackPlayer: { select: { id: true, username: true } },
      moves: { orderBy: { moveNumber: 'asc' }, select: { move: true, moveNumber: true } },
    },
  });
  if (!game) return null;

  const chess = new Chess(game.fen);
  const roomSize = (await io.in(`game:${gameId}`).fetchSockets()).length;
  const specCount = spectatorCounts.get(gameId) ?? 0;

  return {
    gameId: game.id,
    fen: game.fen,
    turn: chess.turn(),
    status: game.status,
    whitePlayer: game.whitePlayer,
    blackPlayer: game.blackPlayer,
    moves: game.moves,
    spectatorCount: specCount,
  };
}

export function initSocketServer(httpServer: HttpServer) {
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    // ── Create Game ────────────────────────────────────────────────────────
    socket.on('create_game', async ({ token }) => {
      const userId = verifyToken(token);
      if (!userId) return socket.emit('error', { message: 'Unauthorized' });

      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, username: true },
        });
        if (!user) return socket.emit('error', { message: 'User not found' });

        const game = await prisma.game.create({
          data: { whitePlayerId: userId },
          include: { whitePlayer: { select: { id: true, username: true } } },
        });

        await socket.join(`game:${game.id}`);
        (socket as any).gameId = game.id;
        (socket as any).userId = userId;
        (socket as any).color = 'white';

        const state = await buildGameState(game.id, io);
        socket.emit('game_state', state!);
        console.log(`[Socket] Game created: ${game.id} by ${user.username}`);
      } catch (err) {
        console.error('[Socket] create_game error:', err);
        socket.emit('error', { message: 'Failed to create game' });
      }
    });

    // ── Join Game ──────────────────────────────────────────────────────────
    socket.on('join_game', async ({ gameId, token }) => {
      const userId = verifyToken(token);
      if (!userId) return socket.emit('error', { message: 'Unauthorized' });

      try {
        const game = await prisma.game.findUnique({
          where: { id: gameId },
          include: {
            whitePlayer: { select: { id: true, username: true } },
            blackPlayer: { select: { id: true, username: true } },
          },
        });

        if (!game) return socket.emit('error', { message: 'Game not found' });

        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, username: true },
        });
        if (!user) return socket.emit('error', { message: 'User not found' });

        // Determine if joining as black or reconnecting
        let color: 'white' | 'black';

        if (game.whitePlayerId === userId) {
          color = 'white';
        } else if (game.blackPlayerId === userId) {
          color = 'black';
        } else if (!game.blackPlayerId && game.status === 'WAITING') {
          // Join as black player
          await prisma.game.update({
            where: { id: gameId },
            data: { blackPlayerId: userId, status: 'ACTIVE' },
          });
          color = 'black';

          io.to(`game:${gameId}`).emit('player_joined', {
            color: 'black',
            username: user.username,
          });
        } else {
          // Spectator
          await socket.join(`game:${gameId}`);
          const prev = spectatorCounts.get(gameId) ?? 0;
          spectatorCounts.set(gameId, prev + 1);
          (socket as any).isSpectator = true;
          (socket as any).gameId = gameId;

          const state = await buildGameState(gameId, io);
          socket.emit('game_state', state!);
          io.to(`game:${gameId}`).emit('spectator_update', { count: prev + 1 });
          return;
        }

        await socket.join(`game:${gameId}`);
        (socket as any).gameId = gameId;
        (socket as any).userId = userId;
        (socket as any).color = color;

        const state = await buildGameState(gameId, io);
        io.to(`game:${gameId}`).emit('game_state', state!);
      } catch (err) {
        console.error('[Socket] join_game error:', err);
        socket.emit('error', { message: 'Failed to join game' });
      }
    });

    // ── Spectator Join ─────────────────────────────────────────────────────
    socket.on('spectator_join', async ({ gameId }) => {
      try {
        await socket.join(`game:${gameId}`);
        const prev = spectatorCounts.get(gameId) ?? 0;
        spectatorCounts.set(gameId, prev + 1);
        (socket as any).isSpectator = true;
        (socket as any).gameId = gameId;

        const state = await buildGameState(gameId, io);
        if (!state) return socket.emit('error', { message: 'Game not found' });

        socket.emit('game_state', state);
        io.to(`game:${gameId}`).emit('spectator_update', { count: prev + 1 });
      } catch (err) {
        console.error('[Socket] spectator_join error:', err);
        socket.emit('error', { message: 'Failed to join as spectator' });
      }
    });

    // ── Player Move ────────────────────────────────────────────────────────
    socket.on('player_move', async ({ gameId, move, token }) => {
      const userId = verifyToken(token);
      if (!userId) return socket.emit('error', { message: 'Unauthorized' });

      try {
        const result = await applyMove(gameId, userId, move);

        if (!result.success) {
          return socket.emit('error', { message: result.error ?? 'Invalid move' });
        }

        // Broadcast the move to all players + spectators
        io.to(`game:${gameId}`).emit('move_made', {
          move: result.move!,
          fen: result.fen!,
          isCheck: result.isCheck!,
          isCheckmate: result.isCheckmate!,
          isDraw: result.isDraw!,
        });

        // Handle game over
        if (result.isCheckmate || result.isDraw) {
          const game = await prisma.game.findUnique({ where: { id: gameId } });
          io.to(`game:${gameId}`).emit('game_over', {
            winner: game?.winner ?? null,
            reason: result.isCheckmate ? 'checkmate' : 'draw',
          });
          evictGame(gameId);
        }
      } catch (err) {
        console.error('[Socket] player_move error:', err);
        socket.emit('error', { message: 'Failed to process move' });
      }
    });

    // ── Reconnect ──────────────────────────────────────────────────────────
    socket.on('reconnect_player', async ({ gameId, token }) => {
      const userId = verifyToken(token);
      if (!userId) return socket.emit('error', { message: 'Unauthorized' });

      try {
        const game = await prisma.game.findUnique({
          where: { id: gameId },
          select: { whitePlayerId: true, blackPlayerId: true, status: true },
        });

        if (!game) return socket.emit('error', { message: 'Game not found' });

        let color: 'white' | 'black' | null = null;
        if (game.whitePlayerId === userId) color = 'white';
        else if (game.blackPlayerId === userId) color = 'black';

        if (!color) return socket.emit('error', { message: 'You are not in this game' });

        await socket.join(`game:${gameId}`);
        (socket as any).gameId = gameId;
        (socket as any).userId = userId;
        (socket as any).color = color;

        const state = await buildGameState(gameId, io);
        socket.emit('reconnected', state!);
        console.log(`[Socket] Player reconnected: ${userId} (${color})`);
      } catch (err) {
        console.error('[Socket] reconnect_player error:', err);
        socket.emit('error', { message: 'Reconnection failed' });
      }
    });

    // ── Disconnect ─────────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      const gameId = (socket as any).gameId;
      const isSpectator = (socket as any).isSpectator;

      if (gameId && isSpectator) {
        const prev = spectatorCounts.get(gameId) ?? 1;
        const updated = Math.max(0, prev - 1);
        spectatorCounts.set(gameId, updated);
        io.to(`game:${gameId}`).emit('spectator_update', { count: updated });
      }

      console.log(`[Socket] Disconnected: ${socket.id}`);
    });
  });

  return io;
}
