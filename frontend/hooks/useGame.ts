import { useEffect, useReducer, useCallback } from 'react';
import { Chess } from 'chess.js';
import { connectSocket, disconnectSocket, getSocket } from '../lib/socket';

export interface GameState {
  gameId: string | null;
  fen: string;
  turn: 'w' | 'b';
  status: string;
  whitePlayer: { id: string; username: string } | null;
  blackPlayer: { id: string; username: string } | null;
  moves: { move: string; moveNumber: number }[];
  spectatorCount: number;
  myColor: 'white' | 'black' | 'spectator' | null;
  isGameOver: boolean;
  winner: string | null;
  error: string | null;
  isConnected: boolean;
  lastMove: string | null;
  isCheck: boolean;
}

const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const initialState: GameState = {
  gameId: null,
  fen: INITIAL_FEN,
  turn: 'w',
  status: 'WAITING',
  whitePlayer: null,
  blackPlayer: null,
  moves: [],
  spectatorCount: 0,
  myColor: null,
  isGameOver: false,
  winner: null,
  error: null,
  isConnected: false,
  lastMove: null,
  isCheck: false,
};

type Action =
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'SET_GAME_STATE'; payload: Partial<GameState> }
  | { type: 'MOVE_MADE'; payload: { move: string; fen: string; isCheck: boolean } }
  | { type: 'GAME_OVER'; payload: { winner: string | null } }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_MY_COLOR'; payload: 'white' | 'black' | 'spectator' }
  | { type: 'SPECTATOR_UPDATE'; payload: number };

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'SET_CONNECTED':
      return { ...state, isConnected: action.payload };
    case 'SET_GAME_STATE':
      return { ...state, ...action.payload };
    case 'MOVE_MADE': {
      const chess = new Chess(action.payload.fen);
      return {
        ...state,
        fen: action.payload.fen,
        turn: chess.turn(),
        moves: [...state.moves, { move: action.payload.move, moveNumber: state.moves.length + 1 }],
        lastMove: action.payload.move,
        isCheck: action.payload.isCheck,
      };
    }
    case 'GAME_OVER':
      return { ...state, isGameOver: true, winner: action.payload.winner, status: 'COMPLETED' };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_MY_COLOR':
      return { ...state, myColor: action.payload };
    case 'SPECTATOR_UPDATE':
      return { ...state, spectatorCount: action.payload };
    default:
      return state;
  }
}

export function useGame(userId: string | null) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const socket = connectSocket();

    socket.on('connect', () => dispatch({ type: 'SET_CONNECTED', payload: true }));
    socket.on('disconnect', () => dispatch({ type: 'SET_CONNECTED', payload: false }));

    socket.on('game_state', (data) => {
      dispatch({ type: 'SET_GAME_STATE', payload: { ...data, error: null } });
      // Determine color
      if (userId) {
        if (data.whitePlayer?.id === userId) dispatch({ type: 'SET_MY_COLOR', payload: 'white' });
        else if (data.blackPlayer?.id === userId) dispatch({ type: 'SET_MY_COLOR', payload: 'black' });
        else dispatch({ type: 'SET_MY_COLOR', payload: 'spectator' });
      }
    });

    socket.on('reconnected', (data) => {
      dispatch({ type: 'SET_GAME_STATE', payload: { ...data, error: null } });
      if (userId) {
        if (data.whitePlayer?.id === userId) dispatch({ type: 'SET_MY_COLOR', payload: 'white' });
        else if (data.blackPlayer?.id === userId) dispatch({ type: 'SET_MY_COLOR', payload: 'black' });
      }
    });

    socket.on('move_made', (data) => {
      dispatch({ type: 'MOVE_MADE', payload: data });
    });

    socket.on('game_over', (data) => {
      dispatch({ type: 'GAME_OVER', payload: { winner: data.winner } });
    });

    socket.on('spectator_update', (data) => {
      dispatch({ type: 'SPECTATOR_UPDATE', payload: data.count });
    });

    socket.on('player_joined', (data) => {
      dispatch({
        type: 'SET_GAME_STATE',
        payload: data.color === 'black'
          ? { blackPlayer: { id: '', username: data.username } }
          : { whitePlayer: { id: '', username: data.username } },
      });
    });

    socket.on('error', (data) => {
      dispatch({ type: 'SET_ERROR', payload: data.message });
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('game_state');
      socket.off('reconnected');
      socket.off('move_made');
      socket.off('game_over');
      socket.off('spectator_update');
      socket.off('player_joined');
      socket.off('error');
      disconnectSocket();
    };
  }, [userId]);

  const createGame = useCallback((token: string) => {
    const socket = getSocket();
    dispatch({ type: 'SET_MY_COLOR', payload: 'white' });
    socket.emit('create_game', { token });
  }, []);

  const joinGame = useCallback((gameId: string, token: string) => {
    const socket = getSocket();
    socket.emit('join_game', { gameId, token });
  }, []);

  const spectateGame = useCallback((gameId: string) => {
    const socket = getSocket();
    dispatch({ type: 'SET_MY_COLOR', payload: 'spectator' });
    socket.emit('spectator_join', { gameId });
  }, []);

  const makeMove = useCallback((gameId: string, move: string, token: string) => {
    const socket = getSocket();
    socket.emit('player_move', { gameId, move, token });
  }, []);

  const reconnect = useCallback((gameId: string, token: string) => {
    const socket = connectSocket();
    socket.emit('reconnect_player', { gameId, token });
  }, []);

  return { state, createGame, joinGame, spectateGame, makeMove, reconnect };
}
