import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { api } from '../../lib/api';

const Chessboard = dynamic(() => import('react-chessboard').then((m) => m.Chessboard), { ssr: false });

interface GameData {
  id: string;
  status: string;
  winner: string | null;
  whitePlayer: { username: string };
  blackPlayer: { username: string } | null;
  moves: { id: string; move: string; fen: string; moveNumber: number }[];
  createdAt: string;
}

export default function ReplayPage() {
  const router = useRouter();
  const { id } = router.query;
  const [game, setGame] = useState<GameData | null>(null);
  const [currentMove, setCurrentMove] = useState(0);
  const [loading, setLoading] = useState(true);

  const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  useEffect(() => {
    if (!id) return;
    api.get<{ game: GameData }>(`/games/${id}`)
      .then((d) => { setGame(d.game); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const currentFen = currentMove === 0
    ? INITIAL_FEN
    : game?.moves[currentMove - 1]?.fen ?? INITIAL_FEN;

  const prev = useCallback(() => setCurrentMove((m) => Math.max(0, m - 1)), []);
  const next = useCallback(() => setCurrentMove((m) => Math.min(game?.moves.length ?? 0, m + 1)), [game]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [prev, next]);

  return (
    <>
      <Head><title>ChessLive — Replay</title></Head>
      <div className="min-h-screen" style={{ background: '#0d0d1a', color: '#e8e8f0' }}>
        <header className="border-b px-6 h-14 flex items-center gap-4"
          style={{ borderColor: '#2a2a4a', background: '#16213e' }}>
          <button onClick={() => router.push('/')}
            className="text-sm" style={{ color: '#7a7a9a' }}>
            ← Back
          </button>
          <span className="font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
            Chess<span style={{ color: '#e94560' }}>Live</span>
          </span>
          <span className="text-sm ml-2" style={{ color: '#7a7a9a' }}>Game Replay</span>
        </header>

        <div className="max-w-4xl mx-auto p-6 flex gap-6 items-start">
          {loading ? (
            <div className="text-center py-20 w-full" style={{ color: '#7a7a9a' }}>Loading game…</div>
          ) : !game ? (
            <div className="text-center py-20 w-full" style={{ color: '#7a7a9a' }}>Game not found</div>
          ) : (
            <>
              <div className="flex flex-col gap-4 flex-1">
                {/* Board */}
                <div className="rounded-2xl overflow-hidden shadow-2xl">
                  <Chessboard
                    position={currentFen}
                    arePiecesDraggable={false}
                    customDarkSquareStyle={{ backgroundColor: '#B58863' }}
                    customLightSquareStyle={{ backgroundColor: '#F0D9B5' }}
                  />
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between px-2">
                  <button onClick={() => setCurrentMove(0)}
                    className="px-3 py-2 rounded-lg text-sm" style={{ background: '#2a2a4a', color: '#e8e8f0' }}>
                    ⏮
                  </button>
                  <button onClick={prev}
                    className="px-4 py-2 rounded-lg text-sm" style={{ background: '#2a2a4a', color: '#e8e8f0' }}>
                    ← Prev
                  </button>
                  <span className="text-sm" style={{ color: '#7a7a9a' }}>
                    Move {currentMove} / {game.moves.length}
                  </span>
                  <button onClick={next}
                    className="px-4 py-2 rounded-lg text-sm" style={{ background: '#e94560', color: '#fff' }}>
                    Next →
                  </button>
                  <button onClick={() => setCurrentMove(game.moves.length)}
                    className="px-3 py-2 rounded-lg text-sm" style={{ background: '#2a2a4a', color: '#e8e8f0' }}>
                    ⏭
                  </button>
                </div>
                <p className="text-xs text-center" style={{ color: '#7a7a9a' }}>
                  Use ← → arrow keys to navigate
                </p>
              </div>

              {/* Info panel */}
              <div className="w-64 flex flex-col gap-4">
                <div className="rounded-xl p-4 border" style={{ background: '#16213e', borderColor: '#2a2a4a' }}>
                  <h3 className="font-semibold mb-3" style={{ fontFamily: 'Playfair Display, serif' }}>
                    Players
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span>♔</span>
                      <span>{game.whitePlayer.username}</span>
                      {game.winner === 'white' && <span style={{ color: '#f5c518' }}>★</span>}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span>♚</span>
                      <span>{game.blackPlayer?.username ?? 'N/A'}</span>
                      {game.winner === 'black' && <span style={{ color: '#f5c518' }}>★</span>}
                    </div>
                  </div>
                  {game.winner && (
                    <p className="mt-3 text-xs px-2 py-1 rounded" style={{ background: 'rgba(245,197,24,0.1)', color: '#f5c518' }}>
                      {game.winner === 'draw' ? 'Draw' : `${game.winner} wins`}
                    </p>
                  )}
                </div>

                {/* Move list */}
                <div className="rounded-xl border overflow-hidden" style={{ background: '#16213e', borderColor: '#2a2a4a', maxHeight: '360px', overflowY: 'auto' }}>
                  <div className="px-4 py-3 text-xs font-medium uppercase tracking-wider border-b" style={{ color: '#7a7a9a', borderColor: '#2a2a4a' }}>
                    Moves
                  </div>
                  <table className="w-full text-sm p-2">
                    <tbody>
                      {Array.from({ length: Math.ceil(game.moves.length / 2) }, (_, i) => ({
                        num: i + 1,
                        white: game.moves[i * 2],
                        black: game.moves[i * 2 + 1],
                      })).map((pair) => (
                        <tr key={pair.num}>
                          <td className="px-2 py-1 text-xs text-right w-8" style={{ color: '#7a7a9a' }}>
                            {pair.num}.
                          </td>
                          <td
                            className="px-3 py-1 font-mono cursor-pointer rounded-l"
                            style={{
                              background: currentMove === pair.num * 2 - 1 ? 'rgba(233,69,96,0.2)' : 'transparent',
                              color: '#e8e8f0',
                            }}
                            onClick={() => setCurrentMove(pair.num * 2 - 1)}
                          >
                            {pair.white?.move}
                          </td>
                          <td
                            className="px-3 py-1 font-mono cursor-pointer rounded-r"
                            style={{
                              background: currentMove === pair.num * 2 ? 'rgba(233,69,96,0.2)' : 'transparent',
                              color: pair.black ? '#e8e8f0' : '#7a7a9a',
                            }}
                            onClick={() => pair.black && setCurrentMove(pair.num * 2)}
                          >
                            {pair.black?.move ?? ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
