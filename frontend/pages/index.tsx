import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../lib/authStore';
import { useGame } from '../hooks/useGame';
import AuthForm from '../components/auth/AuthForm';
import Lobby from '../components/lobby/Lobby';
import GameBoard from '../components/board/GameBoard';

type View = 'lobby' | 'game';

export default function Home() {
  const { user, token } = useAuthStore();
  const [view, setView] = useState<View>('lobby');
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const { state, createGame, joinGame, spectateGame, makeMove, reconnect } = useGame(user?.id ?? null);

  // Wait for client-side hydration before rendering auth state
  useEffect(() => { setHydrated(true); }, []);

  // Auto-transition to game view when a game ID is set in state
  useEffect(() => {
    if (state.gameId && view !== 'game') {
      setCurrentGameId(state.gameId);
      setView('game');
    }
  }, [state.gameId, view]);

  const handleCreateGame = () => {
    if (!token) return;
    createGame(token);
  };

  const handleJoinGame = (gameId: string) => {
    if (!token) {
      // Spectate without auth
      setCurrentGameId(gameId);
      spectateGame(gameId);
      setView('game');
      return;
    }
    joinGame(gameId, token);
  };

  const handleMove = (move: string) => {
    if (!currentGameId || !token) return;
    makeMove(currentGameId, move, token);
  };

  const handleLeave = () => {
    setView('lobby');
    setCurrentGameId(null);
  };

  if (!hydrated) return null;

  if (!user) {
    return (
      <>
        <Head><title>ChessLive — Sign In</title></Head>
        <AuthForm onSuccess={() => {}} />
      </>
    );
  }

  if (view === 'game') {
    return (
      <>
        <Head><title>ChessLive — Game</title></Head>
        <GameBoard
          state={state}
          userId={user.id}
          onMove={handleMove}
          onLeave={handleLeave}
        />
      </>
    );
  }

  return (
    <>
      <Head><title>ChessLive — Lobby</title></Head>
      <Lobby onJoinGame={handleJoinGame} onCreateGame={handleCreateGame} />
    </>
  );
}
