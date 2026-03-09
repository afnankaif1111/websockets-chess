import { useEffect, useState, useCallback } from 'react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../lib/authStore';

interface Game {
  id: string;
  status: string;
  whitePlayer: { id: string; username: string };
  blackPlayer: { id: string; username: string } | null;
  _count: { moves: number };
  createdAt: string;
}

interface LobbyProps {
  onJoinGame: (gameId: string) => void;
  onCreateGame: () => void;
}

export default function Lobby({ onJoinGame, onCreateGame }: LobbyProps) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, token, logout } = useAuthStore();

  const fetchGames = useCallback(async () => {
    try {
      const data = await api.get<{ games: Game[] }>('/games');
      setGames(data.games);
    } catch (err) {
      console.error('Failed to fetch games:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGames();
    const interval = setInterval(fetchGames, 5000);
    return () => clearInterval(interval);
  }, [fetchGames]);

  const statusBadge = (game: Game) => {
    if (game.status === 'WAITING') return (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium"
        style={{ background: 'rgba(245,197,24,0.15)', color: '#f5c518' }}>
        Open
      </span>
    );
    if (game.status === 'ACTIVE') return (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium animate-pulse-soft"
        style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
        ● Live
      </span>
    );
    return null;
  };

  const canJoin = (game: Game) =>
    game.status === 'WAITING' && game.whitePlayer.id !== user?.id;

  return (
    <div className="min-h-screen" style={{ background: 'radial-gradient(ellipse at 50% 0%, #1a1a40 0%, #0d0d1a 70%)' }}>
      {/* Subtle board texture */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `repeating-conic-gradient(#fff 0% 25%, transparent 0% 50%)`,
          backgroundSize: '48px 48px',
        }} />

      {/* Topbar */}
      <header className="relative border-b" style={{ borderColor: '#2a2a4a', background: '#16213e' }}>
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">♟</span>
            <span className="font-bold text-lg" style={{ fontFamily: 'Playfair Display, serif' }}>
              Chess<span style={{ color: '#e94560' }}>Live</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm" style={{ color: '#7a7a9a' }}>
              Welcome, <span className="font-medium" style={{ color: '#e8e8f0' }}>{user?.username}</span>
            </span>
            <button
              onClick={logout}
              className="text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={{ background: '#2a2a4a', color: '#7a7a9a' }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="relative max-w-5xl mx-auto px-6 py-8">
        {/* Hero row */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
              Game Lobby
            </h2>
            <p className="text-sm mt-1" style={{ color: '#7a7a9a' }}>
              Join an open game or create your own
            </p>
          </div>
          <button
            onClick={onCreateGame}
            className="px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 hover:opacity-90 active:scale-95"
            style={{ background: '#e94560', color: '#fff' }}
          >
            + New Game
          </button>
        </div>

        {/* Games list */}
        <div className="rounded-2xl overflow-hidden border" style={{ borderColor: '#2a2a4a' }}>
          {/* Table header */}
          <div className="px-6 py-3 text-xs font-medium uppercase tracking-wider grid grid-cols-12"
            style={{ background: '#16213e', color: '#7a7a9a', borderBottom: '1px solid #2a2a4a' }}>
            <span className="col-span-1">Status</span>
            <span className="col-span-4">White</span>
            <span className="col-span-4">Black</span>
            <span className="col-span-2">Moves</span>
            <span className="col-span-1"></span>
          </div>

          {loading ? (
            <div className="py-16 text-center" style={{ color: '#7a7a9a', background: '#1a1a2e' }}>
              <div className="text-2xl mb-2">⏳</div>
              Loading games...
            </div>
          ) : games.length === 0 ? (
            <div className="py-16 text-center" style={{ color: '#7a7a9a', background: '#1a1a2e' }}>
              <div className="text-4xl mb-3">♟</div>
              <p className="font-medium">No active games</p>
              <p className="text-sm mt-1">Be the first to create one!</p>
            </div>
          ) : (
            <div style={{ background: '#1a1a2e' }}>
              {games.map((game, i) => (
                <div
                  key={game.id}
                  className="px-6 py-4 grid grid-cols-12 items-center transition-colors hover:bg-white hover:bg-opacity-[0.02]"
                  style={{ borderBottom: i < games.length - 1 ? '1px solid #1f1f3a' : 'none' }}
                >
                  <div className="col-span-1">{statusBadge(game)}</div>

                  <div className="col-span-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">♔</span>
                      <span className="text-sm font-medium">{game.whitePlayer.username}</span>
                    </div>
                  </div>

                  <div className="col-span-4">
                    {game.blackPlayer ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm">♚</span>
                        <span className="text-sm font-medium">{game.blackPlayer.username}</span>
                      </div>
                    ) : (
                      <span className="text-sm italic" style={{ color: '#7a7a9a' }}>Waiting for player…</span>
                    )}
                  </div>

                  <div className="col-span-2 text-sm" style={{ color: '#7a7a9a' }}>
                    {game._count.moves} moves
                  </div>

                  <div className="col-span-1 text-right">
                    <button
                      onClick={() => onJoinGame(game.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 hover:opacity-90"
                      style={
                        canJoin(game)
                          ? { background: '#e94560', color: '#fff' }
                          : { background: '#2a2a4a', color: '#7a7a9a' }
                      }
                    >
                      {canJoin(game) ? 'Join' : 'Watch'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats bar */}
        <div className="mt-4 flex gap-4 text-xs" style={{ color: '#7a7a9a' }}>
          <span>{games.filter(g => g.status === 'ACTIVE').length} active game(s)</span>
          <span>•</span>
          <span>{games.filter(g => g.status === 'WAITING').length} waiting for opponent</span>
          <span>•</span>
          <span>Auto-refreshes every 5s</span>
        </div>
      </main>
    </div>
  );
}
