import type { AnswerRow, Game, JoinResponse, Player, ServerState } from "../types";

export interface AddAnswerInput {
  gameId: string;
  playerId: string;
  playerName: string;
  questionId: number;
  questionText: string;
  selectedIndex: number | null;
  correct: boolean;
  responseTimeMs: number;
  points: number;
}

export interface ServerStore {
  ensureGame(): Promise<Game>;
  newGame(): Promise<Game>;
  getGame(gameId: string): Promise<Game | null>;
  joinGame(gameId: string, name: string): Promise<JoinResponse>;
  startGame(gameId: string): Promise<Game | null>;
  addAnswer(input: AddAnswerInput): Promise<AnswerRow | null>;
  finishPlayer(gameId: string, playerId: string): Promise<Player | null>;
  listPlayers(gameId: string): Promise<Player[]>;
  getLeaderboard(gameId: string): Promise<Player[]>;
  getState(gameId: string): Promise<ServerState | null>;
  getPlayer(gameId: string, playerId: string): Promise<Player | null>;
  getAnswersForPlayer(gameId: string, playerId: string): Promise<AnswerRow[]>;
  subscribe?(gameId: string, handler: (event: string, payload: unknown) => void): () => void;
}