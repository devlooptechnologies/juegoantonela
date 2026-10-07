export type GameStatus = "waiting" | "playing" | "finished";

export interface Game {
  id: string;
  status: GameStatus;
  maxPlayers: number;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export type PlayerStatus = "waiting" | "playing" | "finished";

export interface Player {
  id: string;
  gameId: string;
  name: string;
  status: PlayerStatus;
  totalScore: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  totalResponseTimeMs: number;
  finalPosition: number | null;
  createdAt: string;
}

export interface AnswerRow {
  id: string;
  gameId: string;
  playerId: string;
  playerName: string;
  questionId: number;
  questionText: string;
  selectedIndex: number | null;
  correct: boolean;
  responseTimeMs: number;
  points: number;
  answeredAt: string;
}

export type JoinError = "empty" | "too-long" | "duplicate" | "full" | "not-found" | "server";

export type JoinResponse =
  | { ok: true; player: Player; game: Game }
  | { ok: false; error: JoinError };

export interface ServerState {
  game: Game | null;
  players: Player[];
}

export type RealtimeEvent =
  | { type: "game-changed"; gameId: string; game: Game }
  | { type: "players-changed"; gameId: string; players: Player[] }
  | { type: "answer-added"; gameId: string; answer: AnswerRow };