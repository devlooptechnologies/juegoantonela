"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import type { Player } from "../lib/types";
import { formatNumber, ordinal } from "../lib/questions";
import { podiumSparkle } from "./Confetti";
import { Card, PrimaryButton } from "./ui";

const MEDALS = ["🥇", "🥈", "🥉"];

function podiumOrder(sorted: Player[]): { player: Player; place: number; height: string; offset: string }[] {
  if (!sorted.length) return [];
  const top = sorted.slice(0, 3);
  const entry: { player: Player; place: number; height: string; offset: string }[] = [];
  // [2nd, 1st, 3rd]
  const order = [top[1], top[0], top[2]];
  const heights = ["h-24", "h-32", "h-20"];
  const offsets = ["translate-y-8", "translate-y-0", "translate-y-12"];
  order.forEach((player, i) => {
    if (player) {
      entry.push({
        player,
        place: i === 1 ? 1 : i === 0 ? 2 : 3,
        height: heights[i],
        offset: offsets[i],
      });
    }
  });
  return entry;
}

export default function LeaderboardScreen({
  players,
  meId,
  onPlayAgain,
}: {
  players: Player[];
  meId: string;
  onPlayAgain: () => void;
}) {
  const podium = podiumOrder(players);
  const rest = players.slice(3);
  const myIndex = players.findIndex((p) => p.id === meId);
  const myPos = myIndex >= 0 ? myIndex + 1 : null;

  useEffect(() => {
    if (myPos && myPos <= 3) {
      const t = setTimeout(() => podiumSparkle(myPos), 300);
      return () => clearTimeout(t);
    }
  }, [myPos]);

  return (
    <div className="mx-auto min-h-dvh w-full max-w-3xl px-4 py-8 sm:py-12">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center"
      >
        <div className="text-5xl">🏆</div>
        <h1 className="font-display mt-2 bg-gradient-to-r from-amber-300 via-orange-300 to-fuchsia-300 bg-clip-text text-4xl font-extrabold text-transparent sm:text-5xl">
          FINAL LEADERBOARD
        </h1>
        <p className="mt-2 text-sm font-semibold text-white/50">
          Clasificación final · All {players.length} finishers ranked
        </p>
      </motion.div>

      {/* podium */}
      {podium.length > 0 && (
        <div className="mt-10 flex items-end justify-center gap-3 sm:gap-6">
          {podium.map(({ player, place, height, offset }) => {
            const isMe = player.id === meId;
            return (
              <motion.div
                key={player.id}
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 * place, type: "spring", stiffness: 200, damping: 18 }}
                className={`flex w-24 flex-col items-center sm:w-32 ${offset}`}
              >
                <span className="text-4xl sm:text-5xl">{MEDALS[place - 1]}</span>
                <div
                  className={`mt-2 w-full truncate rounded-xl px-2 py-1 text-center text-sm font-extrabold ${
                    isMe ? "ring-2 ring-cyan-300 bg-cyan-500/20" : "bg-white/10"
                  }`}
                  title={player.name}
                >
                  {player.name}
                </div>
                <div
                  className={`font-display mt-2 flex w-full flex-col items-center justify-center rounded-t-2xl bg-gradient-to-b font-extrabold text-white ${height} ${
                    place === 1
                      ? "from-amber-400/90 to-amber-600/90"
                      : place === 2
                        ? "from-slate-300/90 to-slate-500/90"
                        : "from-orange-400/90 to-amber-800/90"
                  }`}
                >
                  <span className="text-2xl">{formatNumber(player.totalScore)}</span>
                  <span className="text-[10px] font-bold uppercase opacity-80">
                    {player.correctCount} correct
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* rest of the list */}
      {rest.length > 0 && (
        <Card strong className="mt-8 divide-y divide-white/8">
          {rest.map((p) => (
            <div
              key={p.id}
              className={`flex items-center gap-3 px-4 py-3 ${
                p.id === meId
                  ? "rounded-xl bg-cyan-500/15 ring-1 ring-cyan-300/40"
                  : ""
              }`}
            >
              <span className="font-display w-8 text-center text-lg font-extrabold text-white/60">
                {p.finalPosition ?? "-"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold text-white">
                  {p.name}
                  {p.id === meId && (
                    <span className="ml-2 rounded-md bg-cyan-400/20 px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-cyan-200">
                      You
                    </span>
                  )}
                </div>
                <div className="text-xs text-white/45">
                  ✓ {p.correctCount} correct · ✗ {p.incorrectCount} wrong
                </div>
              </div>
              <div className="font-display text-xl font-extrabold text-white/90">
                {formatNumber(p.totalScore)}
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* my position callout */}
      {myPos !== null && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center"
        >
          <div className="font-display inline-flex flex-col items-center gap-1 rounded-2xl glass-strong px-8 py-4">
            <span className="bg-gradient-to-r from-cyan-300 to-fuchsia-300 bg-clip-text text-3xl font-extrabold text-transparent">
              YOU FINISHED #{myPos}
            </span>
            <span className="text-sm font-bold uppercase tracking-widest text-white/50">
              {ordinal(myPos)} place · {players.length} players
            </span>
          </div>
        </motion.div>
      )}

      <div className="mt-8 flex justify-center">
        <PrimaryButton variant="secondary" onClick={onPlayAgain}>
          Play again
        </PrimaryButton>
      </div>
    </div>
  );
}