import type {
  AnswerRow,
  Game,
  JoinResponse,
  Player,
  ServerState,
} from "../types";

async function post<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch("/api/game", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return (await res.json()) as T;
}

export interface AnswerPayload {
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

export const gameApi = {
  ensure: () => post<{ game: Game }>({ action: "ensure" }),
  newGame: () => post<{ game: Game }>({ action: "new-game" }),
  getGame: (gameId: string) => post<{ game: Game | null }>({ action: "game", gameId }),
  join: (gameId: string, name: string) => post<JoinResponse>({ action: "join", gameId, name }),
  start: (gameId: string) => post<{ game: Game | null }>({ action: "start", gameId }),
  answer: (payload: AnswerPayload) =>
    post<{ answer: AnswerRow | null }>({ action: "answer", ...payload }),
  finish: (gameId: string, playerId: string) =>
    post<{ player: Player | null }>({ action: "finish", gameId, playerId }),
  players: (gameId: string) => post<{ players: Player[] }>({ action: "players", gameId }),
  leaderboard: (gameId: string) => post<{ players: Player[] }>({ action: "leaderboard", gameId }),
  state: (gameId: string) => post<ServerState | null>({ action: "state", gameId }),
  my: (gameId: string, playerId: string) =>
    post<{ player: Player | null }>({ action: "my", gameId, playerId }),
  answers: (gameId: string, playerId: string) =>
    post<{ answers: AnswerRow[] }>({ action: "answers", gameId, playerId }),
};

export async function authorizeHost(pin: string): Promise<boolean> {
  try {
    const res = await fetch("/api/host", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { ok: boolean };
    return data.ok;
  } catch {
    return false;
  }
}