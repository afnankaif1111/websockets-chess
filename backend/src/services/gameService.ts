import { Chess } from 'chess.js';
import { prisma } from '../lib/prisma';

/**
 * In-memory game state cache.
 * Maps gameId → Chess instance for fast move validation.
 * Hydrated from DB on first access.
 */
const gameCache = new Map<string, Chess>();

export async function getOrLoadGame(gameId: string): Promise<Chess | null> {
  if (gameCache.has(gameId)) {
    return gameCache.get(gameId)!;
  }

  // Load from DB
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) return null;

  const chess = new Chess(game.fen);
  gameCache.set(gameId, chess);
  return chess;
}

export interface MoveResult {
  success: boolean;
  fen?: string;
  move?: string;
  isCheckmate?: boolean;
  isDraw?: boolean;
  isCheck?: boolean;
  error?: string;
}

export async function applyMove(
  gameId: string,
  playerId: string,
  moveInput: string
): Promise<MoveResult> {
  const chess = await getOrLoadGame(gameId);
  if (!chess) return { success: false, error: 'Game not found' };

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: { whitePlayerId: true, blackPlayerId: true, status: true },
  });

  if (!game) return { success: false, error: 'Game not found' };
  if (game.status !== 'ACTIVE') return { success: false, error: 'Game is not active' };

  // Validate it is the correct player's turn
  const isWhiteTurn = chess.turn() === 'w';
  const isWhitePlayer = game.whitePlayerId === playerId;
  const isBlackPlayer = game.blackPlayerId === playerId;

  if (isWhiteTurn && !isWhitePlayer) return { success: false, error: 'Not your turn' };
  if (!isWhiteTurn && !isBlackPlayer) return { success: false, error: 'Not your turn' };

  // Attempt the move
  let result;
  try {
    result = chess.move(moveInput);
  } catch {
    return { success: false, error: 'Invalid move' };
  }

  if (!result) return { success: false, error: 'Invalid move' };

  const fen = chess.fen();
  const moveCount = chess.history().length;

  // Persist move + updated FEN
  await prisma.$transaction([
    prisma.move.create({
      data: {
        gameId,
        playerId,
        move: result.san,
        fen,
        moveNumber: moveCount,
      },
    }),
    prisma.game.update({
      where: { id: gameId },
      data: {
        fen,
        ...(chess.isGameOver() && {
          status: 'COMPLETED',
          winner: chess.isCheckmate()
            ? (isWhiteTurn ? 'black' : 'white')
            : 'draw',
        }),
      },
    }),
  ]);

  return {
    success: true,
    fen,
    move: result.san,
    isCheckmate: chess.isCheckmate(),
    isDraw: chess.isDraw(),
    isCheck: chess.inCheck(),
  };
}

export function evictGame(gameId: string) {
  gameCache.delete(gameId);
}
