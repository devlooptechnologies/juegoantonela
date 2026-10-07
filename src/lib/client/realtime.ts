import { isLocalMode, supabase } from "../supabase";
import type { Game, Player, RealtimeEvent } from "../types";
import { gameApi } from "./api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

function mapGameRow(r: Row): Game {
  return {
    id: r.id,
    status: r.status,
    maxPlayers: r.max_players ?? r.maxPlayers,
    createdAt: r.created_at ?? r.createdAt,
    startedAt: r.started_at ?? r.startedAt ?? null,
    finishedAt: r.finished_at ?? r.finishedAt ?? null,
  };
}

type OnEvent = (event: RealtimeEvent) => void;

export function subscribeRealtime(gameId: string, onEvent: OnEvent): () => void {
  if (isLocalMode) {
    return subscribeSse(gameId, onEvent);
  }
  return subscribeSupabase(gameId, onEvent);
}

// ---------------------------------------------------------------------------
// Local mode: Server-Sent Events
// ---------------------------------------------------------------------------
function subscribeSse(gameId: string, onEvent: OnEvent): () => void {
  const es = new EventSource(`/api/game/stream?gameId=${encodeURIComponent(gameId)}`);

  const onGame = (raw: string) => {
    try {
      const game = JSON.parse(raw) as Game | null;
      if (game) onEvent({ type: "game-changed", gameId, game });
    } catch {
      /* ignore */
    }
  };
  const onPlayers = (raw: string) => {
    try {
      const players = JSON.parse(raw) as Player[];
      onEvent({ type: "players-changed", gameId, players });
    } catch {
      /* ignore */
    }
  };
  const onAnswer = (raw: string) => {
    try {
      onEvent({ type: "answer-added", gameId, answer: JSON.parse(raw) });
    } catch {
      /* ignore */
    }
  };

  es.addEventListener("game", (e) => onGame((e as MessageEvent).data));
  es.addEventListener("players", (e) => onPlayers((e as MessageEvent).data));
  es.addEventListener("answer", (e) => onAnswer((e as MessageEvent).data));

  return () => es.close();
}

// ---------------------------------------------------------------------------
// Supabase mode: use Realtime
// ---------------------------------------------------------------------------
function subscribeSupabase(gameId: string, onEvent: OnEvent): () => void {
  if (!supabase) return () => {};
  const client = supabase;

  const emitPlayers = async () => {
    try {
      const { players } = await gameApi.players(gameId);
      onEvent({ type: "players-changed", gameId, players });
    } catch {
      /* ignore */
    }
  };

  const channel = client
    .channel(`gmc-${gameId}-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "games", filter: `id=eq.${gameId}` },
      (payload) => {
        const row = payload.new as Row | undefined;
        if (row) onEvent({ type: "game-changed", gameId, game: mapGameRow(row) });
      },
    )
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "players", filter: `game_id=eq.${gameId}` },
      () => void emitPlayers(),
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "players", filter: `game_id=eq.${gameId}` },
      () => void emitPlayers(),
    )
    .subscribe();

  const poll = window.setInterval(() => void emitPlayers(), 6_000);

  return () => {
    window.clearInterval(poll);
    void client.removeChannel(channel);
  };
}