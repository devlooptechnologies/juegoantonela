"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MAX_NAME_LENGTH } from "../lib/questions";
import type { JoinError } from "../lib/types";
import { Card, PrimaryButton } from "./ui";

const ERROR_TEXT: Record<JoinError, string> = {
  empty: "Please enter your name.",
  "too-long": `Name is too long (max ${MAX_NAME_LENGTH} characters).`,
  duplicate: "That name is already in use in this game. Choose another one.",
  full: "The game is full (27 players max).",
  "not-found": "This game is not available.",
  server: "Something went wrong. Please try again.",
};

export default function JoinScreen({
  busy,
  error,
  onSubmit,
}: {
  busy: boolean;
  error: JoinError | null;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const trimmed = name.trim();
  const localError = trimmed.length > MAX_NAME_LENGTH ? "too-long" : null;
  const canSubmit = !busy && trimmed.length > 0 && !localError;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-5 py-10">
      <Card strong className="w-full p-7 sm:p-9">
        <motion.div initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <div className="mb-1 text-sm font-bold uppercase tracking-[0.2em] text-cyan-300">
            Step 1 / 2
          </div>
          <h2 className="font-display text-3xl font-extrabold">Enter your name</h2>
          <p className="mt-1 text-sm text-white/50">
            Ingresa tu nombre · This is how you will appear in the rankings
          </p>
        </motion.div>

        <form
          className="mt-7 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) onSubmit(trimmed);
          }}
        >
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={MAX_NAME_LENGTH + 10}
            placeholder="e.g. Santiago"
            autoComplete="off"
            className="font-display w-full rounded-2xl border border-white/20 bg-white/5 px-5 py-4 text-xl font-bold text-white placeholder-white/30 outline-none transition focus:border-fuchsia-400 focus:ring-4 focus:ring-fuchsia-400/20"
          />

          {(localError || error) && (
            <p className="anim-pop rounded-xl bg-rose-500/15 px-4 py-3 text-sm font-semibold text-rose-200">
              {ERROR_TEXT[(localError ?? error) as JoinError]}
            </p>
          )}

          <PrimaryButton type="submit" disabled={!canSubmit} className="w-full">
            {busy ? "Joining…" : "JOIN GAME"}
          </PrimaryButton>
        </form>
      </Card>

      <p className="mt-6 max-w-sm text-center text-sm text-white/40">
        One name per person. If another player already picked your name, just pick another one.
      </p>
    </div>
  );
}