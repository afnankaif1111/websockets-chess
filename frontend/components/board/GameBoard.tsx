import dynamic from 'next/dynamic';
import { useState, useCallback } from 'react';
import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import PlayerCard from './PlayerCard';
import MoveList from './MoveList';
import type { GameState } from '../../hooks/useGame';

// react-chessboard has SSR issues, load client-side only
const Chessboard = dynamic(() => import('react-chessboard').then((m) => m.Chessboard), {
  ssr: false,
  loading: () => (
    <div className="w-full aspect-square rounded-xl flex items-center justify-center"
      style={{ background: '#1a1a2e', fontSize: '2rem' }}>
      ♟
    </div>
  ),
});

interface GameBoardProps {
  state: GameState;
  userId: string;
  onMove: (move: string) => void;
  onLeave: () => void;
}

export default function GameBoard({ state, userId, onMove, onLeave }: GameBoardProps) {
  const [highlightedSquares, setHighlightedSquares] = useState<Record<string, object>>({});

  const isMyTurn =
    (state.turn === 'w' && state.myColor === 'white') ||
    (state.turn === 'b' && state.myColor === 'black');

  const isSpectator = state.myColor === 'spectator';
  const boardOrientation = state.myColor === 'black' ? 'black' : 'white';

  const onSquareClick = useCallback((square: Square) => {
    if (!isMyTurn || isSpectator || state.isGameOver) return;

    const chess = new Chess(state.fen);
    const moves = chess.moves({ square, verbose: true });

    if (moves.length === 0) {
      setHighlightedSquares({});
      return;
    }

    const highlights: Record<string, object> = {
      [square]: { background: 'rgba(233,69,96,0.3)', borderRadius: '50%' },
    };
    moves.forEach((m) => {
      highlights[m.to] = {
        background: chess.get(m.to)
          ? 'radial-gradient(circle, rgba(233,69,96,0.4) 60%, transparent 70%)'
          : 'radial-gradient(circle, rgba(233,69,96,0.3) 25%, transparent 40%)',
        borderRadius: '50%',
      };
    });
    setHighlightedSquares(highlights);
  }, [isMyTurn, isSpectator, state.fen, state.isGameOver]);

  const onPieceDrop = useCallback((from: Square, to: Square, piece: string): boolean => {
    if (!isMyTurn || isSpectator || state.isGameOver) return false;

    const chess = new Chess(state.fen);
    // Handle promotion
    const isPromotion = piece[1] === 'P' && (to[1] === '8' || to[1] === '1');
    const move = chess.move({ from, to, promotion: isPromotion ? 'q' : undefined });

    if (!move) return false;

    onMove(move.san);
    setHighlightedSquares({});
    return true;
  }, [isMyTurn, isSpectator, state.fen, state.isGameOver, onMove]);

  const statusText = () => {
    if (state.isGameOver) {
      if (state.winner === 'draw') return '½ · ½  Draw';
      return `${state.winner === 'white' ? '♔' : '♚'} ${state.winner} wins by checkmate`;
    }
    if (state.status === 'WAITING') return 'Waiting for opponent…';
    if (state.status === 'ACTIVE') {
      if (isSpectator) return `${state.turn === 'w' ? 'White' : 'Black'} to move`;
      if (isMyTurn) return 'Your turn';
      return 'Opponent is thinking…';
    }
    return '';
  };

  const copyGameLink = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0d0d1a' }}>
      {/* Header */}
      <header className="border-b px-6 h-14 flex items-center justify-between"
        style={{ borderColor: '#2a2a4a', background: '#16213e' }}>
        <button onClick={onLeave}
          className="flex items-center gap-2 text-sm transition-colors hover:opacity-80"
          style={{ color: '#7a7a9a' }}>
          ← Lobby
        </button>

        <span className="font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
          Chess<span style={{ color: '#e94560' }}>Live</span>
        </span>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs" style={{ color: '#7a7a9a' }}>
            <span>👁</span> {state.spectatorCount} watching
          </div>
          <button onClick={copyGameLink}
            className="text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: '#2a2a4a', color: '#7a7a9a' }}>
            Share
          </button>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex-1 flex items-start justify-center gap-6 p-6">
        {/* Left panel — players + board */}
        <div className="flex flex-col gap-3 w-full max-w-[520px]">
          {/* Black player (top) */}
          <PlayerCard
            username={state.blackPlayer?.username}
            color="black"
            isActive={state.status === 'ACTIVE' && state.turn === 'b' && !state.isGameOver}
            isYou={state.myColor === 'black'}
          />

          {/* Board */}
          <div className="relative rounded-2xl overflow-hidden shadow-2xl"
            style={{ boxShadow: '0 0 60px rgba(0,0,0,0.5)' }}>
            <Chessboard
              position={state.fen}
              onPieceDrop={onPieceDrop}
              onSquareClick={onSquareClick}
              boardOrientation={boardOrientation}
              customSquareStyles={highlightedSquares}
              customDarkSquareStyle={{ backgroundColor: '#B58863' }}
              customLightSquareStyle={{ backgroundColor: '#F0D9B5' }}
              areArrowsAllowed
              animationDuration={150}
            />

            {/* Game over overlay */}
            {state.isGameOver && (
              <div className="absolute inset-0 flex items-center justify-center"
                style={{ background: 'rgba(13,13,26,0.85)', backdropFilter: 'blur(4px)' }}>
                <div className="text-center p-8 rounded-2xl border animate-slide-up"
                  style={{ background: '#16213e', borderColor: '#2a2a4a' }}>
                  <div className="text-5xl mb-3">
                    {state.winner === 'draw' ? '🤝' : state.winner === 'white' ? '♔' : '♚'}
                  </div>
                  <h3 className="text-xl font-bold mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
                    {state.winner === 'draw' ? 'Draw' : `${state.winner} wins!`}
                  </h3>
                  <p className="text-sm mb-5" style={{ color: '#7a7a9a' }}>
                    {state.winner === 'draw' ? 'The game ended in a draw' : 'by checkmate'}
                  </p>
                  <button onClick={onLeave}
                    className="px-6 py-2 rounded-lg font-semibold text-sm"
                    style={{ background: '#e94560', color: '#fff' }}>
                    Return to Lobby
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* White player (bottom) */}
          <PlayerCard
            username={state.whitePlayer?.username}
            color="white"
            isActive={state.status === 'ACTIVE' && state.turn === 'w' && !state.isGameOver}
            isYou={state.myColor === 'white'}
          />
        </div>

        {/* Right panel — status + move list */}
        <div className="flex flex-col gap-4 w-72 self-start sticky top-6">
          {/* Status */}
          <div className="rounded-xl p-4 border" style={{ background: '#16213e', borderColor: '#2a2a4a' }}>
            <div className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: '#7a7a9a' }}>
              {isSpectator ? 'Spectating' : 'Status'}
            </div>
            <p className="text-sm font-semibold">{statusText()}</p>

            {state.isCheck && !state.isGameOver && (
              <p className="text-xs mt-2 font-medium" style={{ color: '#e94560' }}>
                ⚠ Check!
              </p>
            )}

            {state.error && (
              <p className="text-xs mt-2 px-2 py-1 rounded" style={{ background: 'rgba(233,69,96,0.1)', color: '#e94560' }}>
                {state.error}
              </p>
            )}
          </div>

          {/* Game ID */}
          <div className="rounded-xl p-4 border" style={{ background: '#16213e', borderColor: '#2a2a4a' }}>
            <div className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: '#7a7a9a' }}>
              Game ID
            </div>
            <code className="text-xs break-all" style={{ color: '#7a7a9a', fontFamily: 'JetBrains Mono, monospace' }}>
              {state.gameId}
            </code>
          </div>

          {/* Move list */}
          <div className="rounded-xl border overflow-hidden" style={{ background: '#16213e', borderColor: '#2a2a4a', maxHeight: '400px' }}>
            <MoveList moves={state.moves} />
          </div>
        </div>
      </div>
    </div>
  );
}
