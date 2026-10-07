import { motion } from "framer-motion";
import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// Shared UI primitives
// ---------------------------------------------------------------------------

export function PrimaryButton({
  children,
  onClick,
  disabled,
  variant = "primary",
  className = "",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
  className?: string;
  type?: "button" | "submit";
}) {
  const styles =
    variant === "primary"
      ? "bg-gradient-to-r from-fuchsia-500 via-violet-500 to-indigo-500 text-white shadow-[0_10px_30px_-8px_rgba(168,85,247,0.7)] hover:brightness-110"
      : variant === "danger"
        ? "bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-[0_10px_30px_-8px_rgba(244,63,94,0.7)] hover:brightness-110"
        : "bg-white/10 text-white border border-white/20 hover:bg-white/16";

  return (
    <motion.button
      type={type}
      whileHover={disabled ? undefined : { scale: 1.04 }}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`font-display rounded-2xl px-8 py-4 text-lg font-extrabold tracking-wide transition-shadow disabled:cursor-not-allowed disabled:opacity-40 ${styles} ${className}`}
    >
      {children}
    </motion.button>
  );
}

export function Card({
  children,
  className = "",
  strong = false,
}: {
  children: ReactNode;
  className?: string;
  strong?: boolean;
}) {
  return (
    <div className={`${strong ? "glass-strong" : "glass"} rounded-3xl ${className}`}>
      {children}
    </div>
  );
}

export function Pill({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold ${className}`}
    >
      {children}
    </span>
  );
}

export function ProgressDots({
  index,
  total,
}: {
  index: number;
  total: number;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ${
            i < index
              ? "w-4 bg-emerald-400"
              : i === index
                ? "w-8 bg-gradient-to-r from-fuchsia-400 to-violet-400"
                : "w-2 bg-white/20"
          }`}
        />
      ))}
    </div>
  );
}

export function AnimatedNumber({ value }: { value: number }) {
  return (
    <motion.span
      key={value}
      initial={{ scale: 1.25, color: "#34d399" }}
      animate={{ scale: 1, color: "#ffffff" }}
      transition={{ duration: 0.5 }}
      className="font-display tabular-nums font-extrabold"
    >
      {value.toLocaleString("en-US")}
    </motion.span>
  );
}