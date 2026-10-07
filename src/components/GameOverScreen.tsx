"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { formatNumber, ordinal } from "../lib/questions";
import { bigCelebration } from "./Confetti";
import { Card, Pill, PrimaryButton } from "./ui";

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <Card className="p-4">
      <div className={`font-display text-3xl font-extrabold sm:text-4xl ${accent}`}>{value}</div>
      <div className="mt-1 text-xs font-bold uppercase tracking-widest text-white/45">{label}</div>
    </Card>
  );
}

export default function GameOverScreen({
  name,
  score,
  correctCount,
  totalQuestions,
  avgSeconds,
  position,
  totalFinished,
  onViewLeaderboard,
  onPlayAgain,
}: {
  name: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  avgSeconds: number;
  position: number;
  totalFinished: number;
  onViewLeaderboard: () => void;
  onPlayAgain: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(bigCelebration, 350);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col items-center justify-center px-5 py-10 text-center">
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 14 }}
      >
        <div className="text-6xl">🏆</div>
        <h1 className="font-display mt-2 bg-gradient-to-r from-amber-300 via-orange-300 to-fuchsia-300 bg-clip-text text-5xl font-extrabold text-transparent sm:text-6xl">
          GAME OVER!
        </h1>
        <p className="font-display mt-3 text-2xl font-extrabold text-white">
          Congratulations, {name}!
        </p>
      </motion.div>

      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="mt-8 grid w-full grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4"
      >
        <StatCard label="Final score" value={formatNumber(score)} accent="text-amber-300" />
        <StatCard
          label="Correct answers"
          value={`${correctCount} / ${totalQuestions}`}
          accent="text-emerald-300"
        />
        <StatCard
          label="Avg response"
          value={`${avgSeconds.toFixed(1)}s`}
          accent="text-cyan-300"
        />
        <StatCard label="Final position" value={`#${position}`} accent="text-fuchsia-300" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-6"
      >
        <Pill className="bg-white/10 text-white/85">
          {ordinal(position)} PLACE · {totalFinished} PLAYERS
        </Pill>
      </motion.div>

      <motion.div
        initial={{ y: 18, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-10 flex flex-col items-center gap-3 sm:flex-row"
      >
        <PrimaryButton onClick={onViewLeaderboard} className="px-10">
          VIEW FULL LEADERBOARD
        </PrimaryButton>
        <PrimaryButton variant="secondary" onClick={onPlayAgain} className="px-8 py-3 text-sm">
          Play again
        </PrimaryButton>
      </motion.div>
    </div>
  );
}