import { MAX_PLAYERS, normalizeName } from "../questions";
import { supabase } from "../supabase";
import type { AnswerRow, Game, JoinResponse, Player, ServerState } from "../types";
import { samePlayerName, validateName } from "../validate";
import type { AddAnswerInput, ServerStore } from "./serverStore";

// ---------------------------------------------------------------------------
// Supabase / PostgreSQL backed store. Used when env vars are configured.
// RLS is disabled by the provided schema so the anon key can do its job.
// ---------------------------------------------------------------------------

interface RawGame {
  id: string;
  status: Game["status"];
  max_players: number;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

interface RawPlayer {
  id: string;
  game_id: string;
  name: string;
  status: Player["status"];
  total_score: number;
  correct_count: number;
  incorrect_count: number;
  unanswered_count: number;
  total_response_time_ms: number;
  final_position: number | null;
  created_at: string;
}

interface RawAnswer {
  id: string;
  game_id: string;
  player_id: string;
  player_name: string;
  question_id: number;
  question_text: string;
  selected_index: number | null;
  correct: boolean;
  response_time_ms: number;
  points: number;
  answered_at: string;
}

export function mapGame(r: RawGame): Game {
  return {
    id: r.id,
    status: r.status,
    maxPlayers: r.max_players,
    createdAt: r.created_at,
    startedAt: r.started_at,
    finishedAt: r.finished_at,
  };
}

export function mapPlayer(r: RawPlayer): Player {
  return {
    id: r.id,
    gameId: r.game_id,
    name: r.name,
    status: r.status,
    totalScore: r.total_score,
    correctCount: r.correct_count,
    incorrectCount: r.incorrect_count,
    unansweredCount: r.unanswered_count,
    totalResponseTimeMs: r.total_response_time_ms,
    finalPosition: r.final_position,
    createdAt: r.created_at,
  };
}

export function mapAnswer(r: RawAnswer): AnswerRow {
  return {
    id: r.id,
    gameId: r.game_id,
    playerId: r.player_id,
    playerName: r.player_name,
    questionId: r.question_id,
    questionText: r.question_text,
    selectedIndex: r.selected_index,
    correct: r.correct,
    responseTimeMs: r.response_time_ms,
    points: r.points,
    answeredAt: r.answered_at,
  };
}

function requireClient() {
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase;
}

async function recomputePositionsDb(gameId: string): Promise<void> {
  const client = requireClient();
  const { data } = await client
    .from("players")
    .select("*")
    .eq("game_id", gameId)
    .eq("status", "finished")
    .order("total_score", { ascending: false })
    .order("total_response_time_ms", { ascending: true })
    .order("name", { ascending: true });
  if (!data) return;
  await Promise.all(
    data.map((row: RawPlayer, i: number) =>
      client.from("players").update({ final_position: i + 1 }).eq("id", row.id),
    ),
  );
}

export const supabaseStore: ServerStore = {
  async ensureGame(): Promise<Game> {
    const client = requireClient();
    const { data: existing } = await client
      .from("games")
      .select("*")
      .in("status", ["waiting", "playing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing) return mapGame(existing as RawGame);

    const { data: inserted } = await client
      .from("games")
      .insert({ status: "waiting", max_players: MAX_PLAYERS })
      .select("*")
      .single();
    if (!inserted) throw new Error("failed to create game");
    return mapGame(inserted as RawGame);
  },

  async newGame(): Promise<Game> {
    const client = requireClient();
    const { data } = await client
      .from("games")
      .insert({ status: "waiting", max_players: MAX_PLAYERS })
      .select("*")
      .single();
    if (!data) throw new Error("failed to create game");
    return mapGame(data as RawGame);
  },

  async getGame(gameId: string): Promise<Game | null> {
    const client = requireClient();
    const { data } = await client.from("games").select("*").eq("id", gameId).maybeSingle();
    return data ? mapGame(data as RawGame) : null;
  },

  async joinGame(gameId: string, rawName: string): Promise<JoinResponse> {
    const client = requireClient();
    const invalid = validateName(rawName);
    if (invalid) return { ok: false, error: invalid };
    const name = normalizeName(rawName);

    const { count } = await client
      .from("players")
      .select("*", { count: "exact", head: true })
      .eq("game_id", gameId)
      .neq("status", "finished");
    if (count !== null && count >= MAX_PLAYERS) return { ok: false, error: "full" };

    const { data: existing } = await client
      .from("players")
      .select("name")
      .eq("game_id", gameId)
      .neq("status", "finished");
    if (existing?.some((p) => samePlayerName(p.name, rawName))) {
      return { ok: false, error: "duplicate" };
    }

    const { data, error } = await client
      .from("players")
      .insert({ game_id: gameId, name })
      .select("*")
      .single();

    if (error || !data) {
      if ((error as { code?: string } | null)?.code === "23505") return { ok: false, error: "duplicate" };
      return { ok: false, error: "server" };
    }

    const game = await this.getGame(gameId);
    return { ok: true, player: mapPlayer(data as RawPlayer), game: game! };
  },

  async startGame(gameId: string): Promise<Game | null> {
    const client = requireClient();
    await client
      .from("games")
      .update({ status: "playing", started_at: new Date().toISOString() })
      .eq("id", gameId)
      .eq("status", "waiting");
    return this.getGame(gameId);
  },

  async addAnswer(input: AddAnswerInput): Promise<AnswerRow | null> {
    const client = requireClient();
    const { data: existing } = await client
      .from("answers")
      .select("*")
      .eq("player_id", input.playerId)
      .eq("question_id", input.questionId)
      .maybeSingle();
    if (existing) return mapAnswer(existing as RawAnswer);

    await client.from("players").update({ status: "playing" }).eq("id", input.playerId).eq("status", "waiting");

    const { data, error } = await client
      .from("answers")
      .insert({
        game_id: input.gameId,
        player_id: input.playerId,
        player_name: input.playerName,
        question_id: input.questionId,
        question_text: input.questionText,
        selected_index: input.selectedIndex,
        correct: input.correct,
        response_time_ms: input.responseTimeMs,
        points: input.points,
      })
      .select("*")
      .single();

    if ((error as { code?: string } | null)?.code === "23505") {
      const { data: dup } = await client
        .from("answers")
        .select("*")
        .eq("player_id", input.playerId)
        .eq("question_id", input.questionId)
        .maybeSingle();
      return dup ? mapAnswer(dup as RawAnswer) : null;
    }
    if (error || !data) return null;
    return mapAnswer(data as RawAnswer);
  },

  async finishPlayer(gameId: string, playerId: string): Promise<Player | null> {
    const client = requireClient();
    const { data: rows } = await client
      .from("answers")
      .select("*")
      .eq("player_id", playerId)
      .eq("game_id", gameId);
    if (!rows) return null;

    const totalScore = rows.reduce((s, a) => s + a.points, 0);
    const correctCount = rows.filter((a) => a.correct).length;
    const incorrectCount = rows.filter((a) => !a.correct && a.selected_index !== null).length;
    const unansweredCount = rows.filter((a) => a.selected_index === null).length;
    const totalResponseTimeMs = rows.reduce((s, a) => s + a.response_time_ms, 0);

    await client
      .from("players")
      .update({
        status: "finished",
        total_score: totalScore,
        correct_count: correctCount,
        incorrect_count: incorrectCount,
        unanswered_count: unansweredCount,
        total_response_time_ms: totalResponseTimeMs,
      })
      .eq("id", playerId);

    // game finished check
    const { count } = await client
      .from("players")
      .select("*", { count: "exact", head: true })
      .eq("game_id", gameId);
    const { count: finished } = await client
      .from("players")
      .select("*", { count: "exact", head: true })
      .eq("game_id", gameId)
      .eq("status", "finished");
    if (count !== null && finished !== null && count > 0 && count === finished) {
      await client
        .from("games")
        .update({ status: "finished", finished_at: new Date().toISOString() })
        .eq("id", gameId);
    }

    await recomputePositionsDb(gameId);
    return this.getPlayer(gameId, playerId);
  },

  async listPlayers(gameId: string): Promise<Player[]> {
    const client = requireClient();
    const { data } = await client
      .from("players")
      .select("*")
      .eq("game_id", gameId)
      .order("created_at", { ascending: true });
    return (data ?? []).map((r) => mapPlayer(r as RawPlayer));
  },

  async getLeaderboard(gameId: string): Promise<Player[]> {
    const client = requireClient();
    await recomputePositionsDb(gameId);
    const { data } = await client
      .from("players")
      .select("*")
      .eq("game_id", gameId)
      .eq("status", "finished")
      .order("total_score", { ascending: false })
      .order("total_response_time_ms", { ascending: true })
      .order("name", { ascending: true });
    const players = (data ?? []).map((r) => mapPlayer(r as RawPlayer));
    players.forEach((p, i) => {
      p.finalPosition = i + 1;
    });
    return players;
  },

  async getState(gameId: string): Promise<ServerState | null> {
    const game = await this.getGame(gameId);
    if (!game) return null;
    return { game, players: await this.listPlayers(gameId) };
  },

  async getPlayer(gameId: string, playerId: string): Promise<Player | null> {
    const client = requireClient();
    const { data } = await client
      .from("players")
      .select("*")
      .eq("id", playerId)
      .eq("game_id", gameId)
      .maybeSingle();
    return data ? mapPlayer(data as RawPlayer) : null;
  },

  async getAnswersForPlayer(gameId: string, playerId: string): Promise<AnswerRow[]> {
    const client = requireClient();
    const { data } = await client
      .from("answers")
      .select("*")
      .eq("player_id", playerId)
      .eq("game_id", gameId)
      .order("answered_at", { ascending: true });
    return (data ?? []).map((r) => mapAnswer(r as RawAnswer));
  },
};

export function isSupabaseDuplicateError(err: unknown): boolean {
  return (err as { code?: string } | null)?.code === "23505";
}