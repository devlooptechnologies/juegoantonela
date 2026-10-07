import confetti from "canvas-confetti";

export function burstCorrectBurst() {
  confetti({
    particleCount: 45,
    spread: 75,
    startVelocity: 38,
    origin: { y: 0.72 },
    colors: ["#34d399", "#22d3ee", "#a78bfa", "#fbbf24"],
    zIndex: 9999,
  });
}

export function bigCelebration() {
  const defaults = { zIndex: 9999, spread: 360, ticks: 90, gravity: 0.8, startVelocity: 45 };
  const fire = (particleRatio: number, opts: confetti.Options) =>
    confetti({ ...defaults, ...opts, particleCount: Math.floor(220 * particleRatio) });

  fire(0.25, { spread: 26, startVelocity: 55 });
  fire(0.2, { spread: 60 });
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.95 });
  fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.25 });
  fire(0.1, { spread: 120, startVelocity: 45 });
}

export function podiumSparkle(position: number) {
  confetti({
    particleCount: 140,
    spread: 90,
    origin: { y: 0.4 },
    colors:
      position === 1
        ? ["#fde047", "#fbbf24", "#f97316"]
        : position === 2
          ? ["#e2e8f0", "#cbd5e1", "#a5b4fc"]
          : ["#fdba74", "#d97706", "#fca5a5"],
    zIndex: 9999,
  });
}