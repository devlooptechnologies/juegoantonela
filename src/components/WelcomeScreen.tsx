"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { PrimaryButton, Pill } from "./ui";

export default function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col items-center justify-center px-5 py-10 text-center">
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 16 }}
        className="mb-8 flex h-24 w-24 items-center justify-center rounded-3xl glass"
      >
        <span className="anim-floaty text-5xl">🧬</span>
      </motion.div>

      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.08 }}
      >
        <Pill className="mb-5 bg-violet-500/20 text-violet-200">
          <span className="h-2 w-2 rounded-full bg-violet-300" />
          BIOLOGY · SCIENCE QUIZ · MULTILINGUAL
        </Pill>
        <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
          <span className="text-shimmer">GAMETOGENESIS</span>
          <br />
          <span className="bg-gradient-to-r from-cyan-300 to-emerald-300 bg-clip-text text-transparent">
            CHALLENGE
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg font-semibold text-white/80 sm:text-xl">
          Test your knowledge about human gametogenesis
        </p>
        <p className="mx-auto mt-2 max-w-md text-white/60">
          Answer quickly, earn points and climb the leaderboard!
        </p>
      </motion.div>

      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.18 }}
        className="mt-10"
      >
        <PrimaryButton onClick={onStart} className="px-12 py-5 text-2xl">
          START GAME
        </PrimaryButton>
        <p className="mt-4 text-sm text-white/40">
          Elige la respuesta correcta · Choose the correct answer
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-14"
      >
        <Link
          href="/host"
          className="text-sm font-semibold text-white/40 underline-offset-4 transition-colors hover:text-white/70 hover:underline"
        >
          Teacher / host dashboard →
        </Link>
      </motion.div>
    </div>
  );
}