function DnaStrand() {
  return (
    <svg
      viewBox="0 0 200 520"
      className="h-full w-auto opacity-[0.10]"
      aria-hidden="true"
      fill="none"
    >
      {Array.from({ length: 20 }).map((_, i) => {
        const y = 20 + i * 24;
        const x = 100 + Math.sin(i * 0.7) * 38;
        const x2 = 100 - Math.sin(i * 0.7) * 38;
        return (
          <g key={i}>
            <line
              x1={x}
              y1={y}
              x2={x2}
              y2={y + 14}
              stroke="#c4b5fd"
              strokeWidth={3}
              strokeLinecap="round"
            />
            <circle cx={x} cy={y} r={6} fill={i % 2 === 0 ? "#22d3ee" : "#a78bfa"} />
            <circle cx={x2} cy={y + 14} r={6} fill={i % 2 === 0 ? "#a78bfa" : "#22d3ee"} />
          </g>
        );
      })}
    </svg>
  );
}

export default function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {/* soft color blobs */}
      <div className="anim-drift absolute -left-24 top-[-10%] h-[420px] w-[420px] rounded-full bg-violet-700/25 blur-3xl" />
      <div
        className="anim-drift absolute right-[-12%] top-[22%] h-[380px] w-[380px] rounded-full bg-cyan-500/15 blur-3xl"
        style={{ animationDelay: "-7s" }}
      />
      <div
        className="anim-drift absolute bottom-[-18%] left-[30%] h-[460px] w-[460px] rounded-full bg-fuchsia-600/20 blur-3xl"
        style={{ animationDelay: "-13s" }}
      />

      {/* subtle DNA strand, desktop */}
      <div className="absolute right-6 top-1/2 hidden h-[70vh] -translate-y-1/2 lg:block">
        <DnaStrand />
      </div>
      <div className="absolute left-4 top-1/2 hidden h-[52vh] -translate-y-1/2 opacity-60 lg:block">
        <DnaStrand />
      </div>

      {/* floating science dots */}
      <div className="anim-floaty absolute left-[12%] top-[18%] h-2.5 w-2.5 rounded-full bg-teal-300/40" />
      <div
        className="anim-floaty absolute right-[18%] top-[30%] h-3 w-3 rounded-full bg-sky-300/40"
        style={{ animationDelay: "-1.4s" }}
      />
      <div
        className="anim-floaty absolute bottom-[22%] left-[22%] h-3 w-3 rounded-full bg-fuchsia-300/40"
        style={{ animationDelay: "-2.6s" }}
      />
      <div
        className="anim-floaty absolute bottom-[30%] right-[10%] h-2 w-2 rounded-full bg-amber-300/40"
        style={{ animationDelay: "-3.2s" }}
      />

      {/* faint grid for a "lab" feel */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
    </div>
  );
}