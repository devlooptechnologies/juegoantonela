"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { PreparedQuestion } from "../lib/questions";
import { QUESTION_TIME_MS } from "../lib/questions";
import { formatNumber } from "../lib/questions";
import { AnimatedNumber, Pill, ProgressDots } from "./ui";

export type QuizStatus = "answering" | "reveal";

const OPTION_STYLES = [
  "bg-gradient-to-br from-rose-500 to-red-500",
  "bg-gradient-to-br from-sky-500 to-blue-600",
  "bg-gradient-to-br from-amber-400 to-orange-500",
  "bg-gradient-to-br from-emerald-500 to-green-600",
];

function timerColor(timeLeftMs: number): string {
  if (timeLeftMs <= 3_000) return "bg-rose-500 text-white";
  if (timeLeftMs <= 7_000) return "bg-amber-400 text-amber-950";
  return "bg-emerald-500 text-white";
}

function timerBarColor(timeLeftMs: number): string {
  if (timeLeftMs <= 3_000) return "bg-rose-500";
  if (timeLeftMs <= 7_000) return "bg-amber-400";
  return "bg-emerald-400";
}

export default function QuizScreen({
  quizIndex,
  total,
  score,
  streak,
  question,
  timeLeftMs,
  status,
  selected,
  isCorrect,
  points,
  wasTimeout,
  onSelect,
}: {
  quizIndex: number;
  total: number;
  score: number;
  streak: number;
  question: PreparedQuestion;
  timeLeftMs: number;
  status: QuizStatus;
  selected: number | null;
  isCorrect: boolean;
  points: number;
  wasTimeout: boolean;
  onSelect: (optionIndex: number) => void;
}) {
  const secondsLeft = Math.max(0, Math.ceil(timeLeftMs / 1000));
  const barPct = Math.max(0, Math.min(100, (timeLeftMs / QUESTION_TIME_MS) * 100));

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 py-5 sm:py-8">
      {/* header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-display text-sm font-extrabold uppercase tracking-[0.15em] text-cyan-300 sm:text-base">
            Question {quizIndex + 1} / {total}
          </div>
          <div className="mt-1.5 hidden sm:block">
            <ProgressDots index={quizIndex} total={total} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {streak >= 2 && (
            <Pill className="anim-pop bg-orange-500/20 text-orange-200">
              🔥 {streak} {streak === 1 ? "ANSWER" : "ANSWERS"} STREAK
            </Pill>
          )}
          <Pill className="bg-white/10 text-white/80">
            SCORE <AnimatedNumber value={score} />
          </Pill>
        </div>
      </div>

      {/* progress on mobile */}
      <div className="mt-2.5 sm:hidden">
        <ProgressDots index={quizIndex} total={total} />
      </div>

      {/* question card */}
      <div className="mt-5 flex-1">
        <motion.div
          key={question.id}
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="relative overflow-hidden rounded-3xl glass-strong p-6 sm:p-8"
        >
          {/* timer bar */}
          <div className="absolute inset-x-0 top-0 h-1.5 bg-white/10">
            <div
              className={`h-full ${timerBarColor(timeLeftMs)} transition-[width] duration-100 ease-linear ${
                timeLeftMs <= 3_000 && status === "answering" ? "anim-pulse-glow" : ""
              }`}
              style={{ width: `${barPct}%` }}
            />
          </div>

          <div className="flex items-start justify-between gap-4">
            <h2 className="font-display text-xl font-extrabold leading-snug text-white sm:text-3xl">
              {question.text}
            </h2>
            {/* timer chip */}
            <div
              className={`font-display flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-extrabold shadow-lg sm:h-20 sm:w-20 sm:text-3xl ${
                timerColor(timeLeftMs)
              } ${timeLeftMs <= 3_000 && status === "answering" ? "anim-pulse-glow" : ""}`}
            >
              {secondsLeft}s
            </div>
          </div>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.15em] text-white/35">
            Choose the correct answer · Elige la respuesta correcta
          </p>
        </motion.div>

        {/* options */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          {question.options.map((opt, i) => {
            const revealState: "correct" | "wrong" | "dim" | "idle" =
              status === "reveal"
                ? i === question.correctIndex
                  ? "correct"
                  : i === selected
                    ? "wrong"
                    : "dim"
                : "idle";

            const base = OPTION_STYLES[i];

            let cls = `${base} shadow-[0_10px_24px_-10px_rgba(0,0,0,0.5)]`;
            if (revealState === "correct") {
              cls = `bg-gradient-to-br from-emerald-400 to-green-500 shadow-[0_0_34px_-6px_rgba(52,211,153,0.9)] ring-4 ring-emerald-300/60 scale-[1.02]`;
            } else if (revealState === "wrong") {
              cls = `bg-gradient-to-br from-rose-500 to-red-600 shadow-[0_0_26px_-6px_rgba(244,63,94,0.8)] ring-4 ring-rose-300/60 anim-shake`;
            } else if (revealState === "dim") {
              cls = `${base} opacity-35 saturate-50`;
            }

            return (
              <motion.button
                key={`${question.id}-${i}`}
                whileHover={status === "answering" ? { scale: 1.02, y: -2 } : undefined}
                whileTap={status === "answering" ? { scale: 0.97 } : undefined}
                onClick={() => status === "answering" && onSelect(i)}
                disabled={status !== "answering"}
                className={`flex min-h-[68px] w-full items-center gap-4 rounded-2xl px-4 py-3 text-left text-white transition-colors ${cls} ${
                  revealState === "correct" || revealState === "wrong" ? "anim-pop" : ""
                }`}
              >
                <span className="font-display flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black/20 text-xl font-extrabold">
                  {LETTERS[i]}
                </span>
                <span className="font-display flex-1 text-base font-bold leading-snug sm:text-lg">
                  {opt}
                </span>
                <span className="text-2xl">
                  {revealState === "correct" ? "✓" : revealState === "wrong" ? "✕" : ""}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* time remaining note */}
      {status === "answering" && (
        <p className="mt-5 text-center text-xs font-semibold uppercase tracking-widest text-white/30">
          Time left · Tiempo restante
        </p>
      )}

      {/* feedback overlay */}
      <AnimatePresence>
        {status === "reveal" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.6, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
              className="flex flex-col items-center text-center"
            >
              <div
                className={`font-display text-6xl font-extrabold sm:text-8xl ${
                  isCorrect
                    ? "bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent"
                    : "bg-gradient-to-r from-rose-400 to-red-400 bg-clip-text text-transparent"
                }`}
              >
                {wasTimeout ? "TIME'S UP!" : isCorrect ? "CORRECT!" : "INCORRECT"}
              </div>
              <div className="font-display mt-4 rounded-2xl bg-white/10 px-8 py-3 text-3xl font-extrabold text-white sm:text-4xl">
                {isCorrect ? (
                  <>+{formatNumber(points)} POINTS</>
                ) : (
                  <>{wasTimeout ? "NO POINTS" : "+0 POINTS"}</>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const LETTERS = ["A", "B", "C", "D"];