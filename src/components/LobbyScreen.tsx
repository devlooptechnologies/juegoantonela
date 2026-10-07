"use client";

import { motion } from "framer-motion";
import { Card, PrimaryButton, Pill } from "./ui";

export default function LobbyScreen({
  name,
  count,
  maxPlayers,
  onLeave,
}: {
  name: string;
  count: number;
  maxPlayers: number;
  onLeave: () => void;
}) {
  const pct = Math.min(100, (count / maxPlayers) * 100);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-5 py-10 text-center">
      <Card strong className="w-full p-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          <div className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-emerald-300">
            You&apos;re ready!
          </div>
          <div className="font-display mx-auto mb-6 inline-flex max-w-full items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500/30 to-fuchsia-500/30 px-5 py-2.5 text-2xl font-extrabold text-white">
            <span>🎮</span>
            <span className="truncate">{name}</span>
          </div>
        </motion.div>

        <Pill className="bg-white/10 text-white/85">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Players joined: {count} / {maxPlayers}
        </Pill>

        <div className="mt-6 h-3 w-full overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400"
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
        <p className="mt-2 text-xs font-semibold text-white/45">
          {maxPlayers - count} seat{maxPlayers - count === 1 ? "" : "s"} left
        </p>

        <div className="mt-8 flex flex-col items-center gap-3">
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="anim-blink h-2.5 w-2.5 rounded-full bg-cyan-300"
                style={{ animationDelay: `${i * 0.25}s` }}
              />
            ))}
          </div>
          <p className="text-sm font-semibold text-white/60">
            Waiting for the host to start the game…
          </p>
          <p className="text-xs text-white/35">
            When everyone has joined, the host presses START on their dashboard.
          </p>
        </div>
      </Card>

      <PrimaryButton variant="secondary" onClick={onLeave} className="mt-6 px-6 py-2.5 text-sm">
        Leave game
      </PrimaryButton>
    </div>
  );
}