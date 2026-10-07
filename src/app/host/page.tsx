"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Background from "@/components/Background";
import { Card, Pill, PrimaryButton } from "@/components/ui";
import { authorizeHost, gameApi } from "@/lib/client/api";
import { subscribeRealtime } from "@/lib/client/realtime";
import { MAX_PLAYERS, formatNumber } from "@/lib/questions";
import type { Game, Player } from "@/lib/types";

const HOST_FLAG = "gmchallenge-host";

function statusColor(status: Game["status"]): string {
  if (status === "waiting") return "bg-amber-400 text-amber-950";
  if (status === "playing") return "bg-emerald-400 text-emerald-950";
  return "bg-sky-400 text-sky-950";
}

function playerStatusColor(status: Player["status"]): string {
  if (status === "finished") return "bg-emerald-400";
  if (status === "playing") return "bg-amber-400";
  return "bg-white/40";
}

export default function HostPage() {
  const [authorized, setAuthorized] = useState(() => {
    try {
      return sessionStorage.getItem(HOST_FLAG) === "1";
    } catch {
      return false;
    }
  });
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [checking, setChecking] = useState(false);

  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [starting, setStarting] = useState(false);

  const onRealtime = useCallback((event: { type: string; gameId: string }) => {
    if (event.type === "game-changed") {
      void gameApi.getGame(event.gameId).then(({ game }) => {
        if (game) setGame(game);
      });
    } else if (event.type === "players-changed") {
      void gameApi.players(event.gameId).then(({ players }) => setPlayers(players));
    } else if (event.type === "answer-added") {
      // covered by players-changed refresh
    }
  }, []);

  useEffect(() => {
    if (!authorized) return;
    let unsub: (() => void) | null = null;
    let cancelled = false;
    void (async () => {
      try {
        const { game: g } = await gameApi.ensure();
        if (cancelled) return;
        setGame(g);
        unsub = subscribeRealtime(g.id, onRealtime);
        const { players } = await gameApi.players(g.id);
        if (!cancelled) setPlayers(players);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [authorized, onRealtime]);

  const submitPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;
    setChecking(true);
    setPinError(false);
    const ok = await authorizeHost(pin);
    if (ok) {
      try {
        sessionStorage.setItem(HOST_FLAG, "1");
      } catch {
        /* ignore */
      }
      setAuthorized(true);
    } else {
      setPinError(true);
    }
    setChecking(false);
  };

  const startGame = async () => {
    if (!game || game.status !== "waiting") return;
    setStarting(true);
    try {
      const { game: g } = await gameApi.start(game.id);
      if (g) setGame(g);
    } finally {
      setStarting(false);
    }
  };

  const newGame = async () => {
    try {
      const { game: g } = await gameApi.newGame();
      setGame(g);
      setPlayers([]);
    } catch {
      /* ignore */
    }
  };

  const leaderboard = useMemo(() => {
    return players
      .filter((p) => p.status === "finished")
      .sort((a, b) => {
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        if (a.totalResponseTimeMs !== b.totalResponseTimeMs)
          return a.totalResponseTimeMs - b.totalResponseTimeMs;
        return a.name.localeCompare(b.name);
      })
      .map((p, i) => ({ ...p, finalPosition: i + 1 }));
  }, [players]);

  const joinedCount = players.filter((p) => p.status !== "finished").length;

  // --------------------------- render ---------------------------
  if (!authorized) {
    return (
      <div className="relative min-h-dvh">
        <Background />
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-5">
          <Card strong className="w-full p-8 text-center">
            <div className="text-4xl">🔐</div>
            <h1 className="font-display mt-3 text-2xl font-extrabold">Teacher / Host</h1>
            <p className="mt-1 text-sm text-white/50">Enter the host PIN to control the game</p>
            <form onSubmit={submitPin} className="mt-6 flex flex-col gap-4">
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Host PIN"
                className="w-full rounded-2xl border border-white/20 bg-white/5 px-5 py-4 text-center text-xl font-bold text-white outline-none transition focus:border-fuchsia-400 focus:ring-4 focus:ring-fuchsia-400/20"
              />
              {pinError && (
                <p className="anim-pop rounded-xl bg-rose-500/15 px-4 py-3 text-sm font-semibold text-rose-200">
                  Wrong PIN. Try again.
                </p>
              )}
              <PrimaryButton type="submit" disabled={checking || !pin.trim()} className="w-full">
                {checking ? "Checking…" : "ENTER"}
              </PrimaryButton>
            </form>
            <p className="mt-4 text-xs text-white/35">
              Default PIN: gmhost27 · change it with GAME_HOST_PIN in .env.local
            </p>
            <Link href="/" className="mt-5 block text-sm font-semibold text-white/40 hover:text-white/70">
              ← Back to game
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  const empty = players.length === 0;

  return (
    <div className="relative min-h-dvh pb-16">
      <Background />
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-extrabold">🎮 Host Dashboard</h1>
            <p className="text-sm text-white/50">Gametogenesis Challenge · classroom control</p>
          </div>
          <Link href="/" className="text-sm font-semibold text-white/40 hover:text-white/70">
            ← Back
          </Link>
        </header>

        {/* game controls */}
        <Card strong className="mt-6 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Pill className={statusColor(game?.status ?? "waiting")}>
                {(game?.status ?? "waiting").toUpperCase()}
              </Pill>
              <div>
                <div className="text-sm font-bold text-white/50">PLAYERS</div>
                <div className="font-display text-3xl font-extrabold">
                  {players.length}
                  <span className="text-base text-white/40"> / {MAX_PLAYERS}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <PrimaryButton
                onClick={startGame}
                disabled={starting || game?.status !== "waiting" || empty}
              >
                ▶ START GAME
              </PrimaryButton>
              <PrimaryButton
                variant="secondary"
                onClick={newGame}
                disabled={game?.status !== "finished"}
              >
                NEW GAME
              </PrimaryButton>
            </div>
          </div>

          {game?.status === "waiting" && (
            <p className="mt-4 text-sm font-semibold text-amber-200/80">
              {empty
                ? "No one has joined yet. Share the app with the class."
                : `${joinedCount} player${joinedCount === 1 ? "" : "s"} waiting. Press START when everyone is in.`}
            </p>
          )}
          {game?.status === "playing" && (
            <p className="mt-4 text-sm font-semibold text-emerald-200/80">
              Game in progress… players are answering question by question.
            </p>
          )}
          {game?.status === "finished" && (
            <p className="mt-4 text-sm font-semibold text-sky-200/80">
              Everyone finished! Press NEW GAME to start the next round.
            </p>
          )}
        </Card>

        {/* joined players */}
        <Card strong className="mt-6 p-6">
          <h2 className="font-display text-xl font-extrabold">
            Joined players <span className="text-sm text-white/40">({players.length})</span>
          </h2>
          {players.length === 0 ? (
            <p className="mt-4 text-sm text-white/40">Waiting for players to join the room…</p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {players.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-2 rounded-full bg-white/8 px-4 py-2 text-sm font-bold"
                >
                  <span className={`h-2 w-2 rounded-full ${playerStatusColor(p.status)}`} />
                  {p.name}
                </span>
              ))}
            </div>
          )}
        </Card>

        {/* live leaderboard */}
        <Card strong className="mt-6 p-6">
          <h2 className="font-display text-xl font-extrabold">
            Live leaderboard{" "}
            <span className="text-sm text-white/40">({leaderboard.length} finished)</span>
          </h2>
          {leaderboard.length === 0 ? (
            <p className="mt-4 text-sm text-white/40">
              Finishers will appear here in real time.
            </p>
          ) : (
            <ol className="mt-4 divide-y divide-white/8">
              {leaderboard.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-2.5">
                  <span className="font-display w-8 text-lg font-extrabold text-white/60">
                    {p.finalPosition}
                  </span>
                  <span className="flex-1 truncate font-bold">{p.name}</span>
                  <span className="text-xs text-white/45">✓ {p.correctCount}</span>
                  <span className="font-display text-lg font-extrabold">
                    {formatNumber(p.totalScore)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}