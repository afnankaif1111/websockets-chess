// Shared Socket event type definitions

export interface ServerToClientEvents {
  game_state: (data: GameStatePayload) => void;
  move_made: (data: MoveMadePayload) => void;
  player_joined: (data: { color: 'white' | 'black'; username: string }) => void;
  spectator_update: (data: { count: number }) => void;
  game_over: (data: GameOverPayload) => void;
  error: (data: { message: string }) => void;
  reconnected: (data: GameStatePayload) => void;
}

export interface ClientToServerEvents {
  create_game: (data: { token: string }) => void;
  join_game: (data: { gameId: string; token: string }) => void;
  player_move: (data: { gameId: string; move: string; token: string }) => void;
  spectator_join: (data: { gameId: string }) => void;
  reconnect_player: (data: { gameId: string; token: string }) => void;
}

export interface GameStatePayload {
  gameId: string;
  fen: string;
  turn: 'w' | 'b';
  status: string;
  whitePlayer: { id: string; username: string } | null;
  blackPlayer: { id: string; username: string } | null;
  moves: { move: string; moveNumber: number }[];
  spectatorCount: number;
}

export interface MoveMadePayload {
  move: string;
  fen: string;
  isCheck: boolean;
  isCheckmate: boolean;
  isDraw: boolean;
}

export interface GameOverPayload {
  winner: string | null;
  reason: 'checkmate' | 'draw' | 'resignation' | 'abandonment';
}
