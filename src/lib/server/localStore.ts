import { randomUUID } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { MAX_PLAYERS, normalizeName } from "../questions";
import type { AnswerRow, Game, GameStatus, JoinResponse, Player, ServerState } from "../types";
import { samePlayerName, validateName } from "../validate";
import type { AddAnswerInput, ServerStore } from "./serverStore";

// ---------------------------------------------------------------------------
// In-memory + JSON-file backed store used when Supabase is NOT configured.
// Supports the full classroom (27 simultaneous players) on one machine.
// ---------------------------------------------------------------------------

interface DbShape {
  games: Game[];
  players: Player[];
  answers: AnswerRow[];
}

const DATA_DIR = join(process.cwd(), ".data");
const DATA_FILE = join(DATA_DIR, "store.json");

function emptyDb(): DbShape {
  return { games: [], players: [], answers: [] };
}

function loadDb(): DbShape {
  const g = globalThis as unknown as { __gmcDb__?: DbShape };
  if (g.__gmcDb__) return g.__gmcDb__;
  let db = emptyDb();
  if (existsSync(DATA_FILE)) {
    try {
      db = { ...emptyDb(), ...JSON.parse(readFileSync(DATA_FILE, "utf8")) } as DbShape;
    } catch {
      db = emptyDb();
    }
  }
  g.__gmcDb__ = db;
  return db;
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;
function persistNow(): void {
  const g = globalThis as unknown as { __gmcDb__?: DbShape };
  if (!g.__gmcDb__) return;
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(DATA_FILE, JSON.stringify(g.__gmcDb__, null, 2));
  } catch (e) {
    console.error("[local-store] persist failed", e);
  }
}
function schedulePersist(): void {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(persistNow, 150);
}

// ---------------------------------------------------------------------------
// Realtime bus (Server-Sent Events back-pressure handled by the stream route)
// ---------------------------------------------------------------------------
type Handler = (event: string, payload: unknown) => void;

function getBus(): { [gameId: string]: Set<Handler> } {
  const g = globalThis as unknown as { __gmcBus__?: { [gameId: string]: Set<Handler> } };
  if (!g.__gmcBus__) g.__gmcBus__ = {};
  return g.__gmcBus__;
}

function broadcast(gameId: string, event: string, payload: unknown): void {
  const handlers = getBus()[gameId];
  if (!handlers) return;
  for (const h of [...handlers]) {
    try {
      h(event, payload);
    } catch {
      /* keep pumping */
    }
  }
}

function subscribeLocal(gameId: string, handler: Handler): () => void {
  const bus = getBus();
  const set = bus[gameId] ?? new Set<Handler>();
  set.add(handler);
  bus[gameId] = set;
  return () => {
    set.delete(handler);
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeGame(status: GameStatus): Game {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    status,
    maxPlayers: MAX_PLAYERS,
    createdAt: now,
    startedAt: status === "playing" ? now : null,
    finishedAt: status === "finished" ? now : null,
  };
}

function playerSorter(a: Player, b: Player): number {
  if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
  if (a.totalResponseTimeMs !== b.totalResponseTimeMs) return a.totalResponseTimeMs - b.totalResponseTimeMs;
  return a.name.localeCompare(b.name);
}

function recomputePositions(db: DbShape, gameId: string): void {
  db.players
    .filter((p) => p.gameId === gameId && p.status === "finished")
    .sort(playerSorter)
    .forEach((p, i) => {
      p.finalPosition = i + 1;
    });
}

function playersOfGame(db: DbShape, gameId: string): Player[] {
  return db.players.filter((p) => p.gameId === gameId);
}

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------
export const localStore: ServerStore = {
  async ensureGame(): Promise<Game> {
    const db = loadDb();
    let game = db.games.find((g) => g.status !== "finished");
    if (!game) {
      game = makeGame("waiting");
      db.games.push(game);
      schedulePersist();
    }
    return game;
  },

  async newGame(): Promise<Game> {
    const db = loadDb();
    const game = makeGame("waiting");
    db.games.push(game);
    schedulePersist();
    broadcast(game.id, "game-changed", game);
    return game;
  },

  async getGame(gameId: string): Promise<Game | null> {
    return loadDb().games.find((g) => g.id === gameId) ?? null;
  },

  async joinGame(gameId: string, rawName: string): Promise<JoinResponse> {
    const db = loadDb();
    const game = db.games.find((g) => g.id === gameId);
    if (!game) return { ok: false, error: "not-found" };

    const invalid = validateName(rawName);
    if (invalid) return { ok: false, error: invalid };

    const name = normalizeName(rawName);
    const active = playersOfGame(db, gameId).filter((p) => p.status !== "finished");
    if (game.maxPlayers > 0 && active.length >= game.maxPlayers) {
      return { ok: false, error: "full" };
    }
    if (active.some((p) => samePlayerName(p.name, name))) {
      return { ok: false, error: "duplicate" };
    }

    const player: Player = {
      id: randomUUID(),
      gameId,
      name,
      status: "waiting",
      totalScore: 0,
      correctCount: 0,
      incorrectCount: 0,
      unansweredCount: 0,
      totalResponseTimeMs: 0,
      finalPosition: null,
      createdAt: new Date().toISOString(),
    };
    db.players.push(player);
    schedulePersist();
    broadcast(gameId, "players-changed", playersOfGame(db, gameId));
    return { ok: true, player, game };
  },

  async startGame(gameId: string): Promise<Game | null> {
    const db = loadDb();
    const game = db.games.find((g) => g.id === gameId);
    if (!game || game.status !== "waiting") return game ?? null;
    game.status = "playing";
    game.startedAt = new Date().toISOString();
    schedulePersist();
    broadcast(gameId, "game-changed", game);
    return game;
  },

  async addAnswer(input: AddAnswerInput): Promise<AnswerRow | null> {
    const db = loadDb();
    const existing = db.answers.find(
      (a) => a.playerId === input.playerId && a.questionId === input.questionId,
    );
    if (existing) return existing;

    const answer: AnswerRow = {
      id: randomUUID(),
      gameId: input.gameId,
      playerId: input.playerId,
      playerName: input.playerName,
      questionId: input.questionId,
      questionText: input.questionText,
      selectedIndex: input.selectedIndex,
      correct: input.correct,
      responseTimeMs: input.responseTimeMs,
      points: input.points,
      answeredAt: new Date().toISOString(),
    };
    db.answers.push(answer);

    const player = db.players.find((p) => p.id === input.playerId);
    if (player && player.status === "waiting") player.status = "playing";

    schedulePersist();
    broadcast(input.gameId, "answer", answer);
    broadcast(input.gameId, "players-changed", playersOfGame(db, input.gameId));
    return answer;
  },

  async finishPlayer(gameId: string, playerId: string): Promise<Player | null> {
    const db = loadDb();
    const player = db.players.find((p) => p.id === playerId && p.gameId === gameId);
    if (!player) return null;

    if (player.status !== "finished") {
      const rows = db.answers.filter((a) => a.playerId === playerId);
      player.totalScore = rows.reduce((sum, a) => sum + a.points, 0);
      player.correctCount = rows.filter((a) => a.correct).length;
      player.incorrectCount = rows.filter((a) => !a.correct && a.selectedIndex !== null).length;
      player.unansweredCount = rows.filter((a) => a.selectedIndex === null).length;
      player.totalResponseTimeMs = rows.reduce((sum, a) => sum + a.responseTimeMs, 0);
      player.status = "finished";
      recomputePositions(db, gameId);
    }

    const all = playersOfGame(db, gameId);
    const game = db.games.find((g) => g.id === gameId);
    if (game && all.length > 0 && all.every((p) => p.status === "finished")) {
      game.status = "finished";
      game.finishedAt = new Date().toISOString();
      broadcast(gameId, "game-changed", game);
    }

    schedulePersist();
    broadcast(gameId, "players-changed", all);
    return player;
  },

  async listPlayers(gameId: string): Promise<Player[]> {
    const db = loadDb();
    return playersOfGame(db, gameId).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  },

  async getLeaderboard(gameId: string): Promise<Player[]> {
    const db = loadDb();
    recomputePositions(db, gameId);
    return playersOfGame(db, gameId)
      .filter((p) => p.status === "finished")
      .sort(playerSorter);
  },

  async getState(gameId: string): Promise<ServerState | null> {
    const game = await this.getGame(gameId);
    if (!game) return null;
    return { game, players: await this.listPlayers(gameId) };
  },

  async getPlayer(gameId: string, playerId: string): Promise<Player | null> {
    const db = loadDb();
    return db.players.find((p) => p.id === playerId && p.gameId === gameId) ?? null;
  },

  async getAnswersForPlayer(gameId: string, playerId: string): Promise<AnswerRow[]> {
    const db = loadDb();
    return db.answers
      .filter((a) => a.playerId === playerId && a.gameId === gameId)
      .sort((a, b) => new Date(a.answeredAt).getTime() - new Date(b.answeredAt).getTime());
  },

  subscribe(gameId, handler) {
    return subscribeLocal(gameId, handler);
  },
};