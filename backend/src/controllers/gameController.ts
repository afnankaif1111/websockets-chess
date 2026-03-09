import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

// GET /games — list open + active games
export async function listGames(_req: Request, res: Response) {
  const games = await prisma.game.findMany({
    where: { status: { in: ['WAITING', 'ACTIVE'] } },
    include: {
      whitePlayer: { select: { id: true, username: true } },
      blackPlayer: { select: { id: true, username: true } },
      _count: { select: { moves: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return res.json({ games });
}

// GET /games/history — completed games for the authenticated user
export async function gameHistory(req: Request, res: Response) {
  const userId = (req as any).userId;

  const games = await prisma.game.findMany({
    where: {
      status: 'COMPLETED',
      OR: [{ whitePlayerId: userId }, { blackPlayerId: userId }],
    },
    include: {
      whitePlayer: { select: { id: true, username: true } },
      blackPlayer: { select: { id: true, username: true } },
      _count: { select: { moves: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return res.json({ games });
}

// GET /games/:id — single game with all moves (for replay)
export async function getGame(req: Request, res: Response) {
  const { id } = req.params;

  const game = await prisma.game.findUnique({
    where: { id },
    include: {
      whitePlayer: { select: { id: true, username: true } },
      blackPlayer: { select: { id: true, username: true } },
      moves: { orderBy: { moveNumber: 'asc' } },
    },
  });

  if (!game) return res.status(404).json({ error: 'Game not found' });
  return res.json({ game });
}

// POST /games/create — create a new game (white player)
export async function createGame(req: Request, res: Response) {
  const userId = (req as any).userId;

  const game = await prisma.game.create({
    data: { whitePlayerId: userId },
    include: {
      whitePlayer: { select: { id: true, username: true } },
    },
  });

  return res.status(201).json({ game });
}
