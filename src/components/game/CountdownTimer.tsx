const SEGMENTS = 20;

export function CountdownTimer({
  remainingMs,
  totalSeconds,
  size = "md",
}: {
  remainingMs: number | null;
  totalSeconds: number;
  size?: "md" | "lg";
}) {
  const running = remainingMs !== null;
  const seconds = running ? Math.ceil(remainingMs / 1000) : totalSeconds;
  const fraction = running ? Math.min(1, remainingMs / (totalSeconds * 1000)) : 1;
  const filled = Math.ceil(fraction * SEGMENTS);
  const danger = running && seconds <= 5 && seconds > 0;
  const done = running && remainingMs <= 0;

  const barColor = fraction > 0.5 ? "bg-lime" : fraction > 0.25 ? "bg-gold" : "bg-ruby";
  const mm = Math.floor(seconds / 60);
  const ss = String(seconds % 60).padStart(2, "0");
  const digitSize = size === "lg" ? "text-5xl md:text-7xl" : "text-3xl md:text-4xl";
  const doneSize = size === "lg" ? "text-3xl md:text-4xl" : "text-2xl md:text-4xl";

  return (
    <div className="flex flex-col items-center gap-3" role="timer" aria-live="off" aria-label={`${seconds} seconds left`}>
      <div
        className={`whitespace-nowrap font-pixel pixel-text-shadow tabular-nums ${done ? doneSize : digitSize} ${
          done ? "text-ruby" : danger ? "animate-pulse-danger" : "text-snow"
        } ${danger ? "animate-shake" : ""}`}
      >
        {done ? "Time's Up!" : `${mm}:${ss}`}
      </div>
      <div className="flex gap-[3px] bg-ink p-[3px]" aria-hidden>
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <span
            key={i}
            className={`${size === "lg" ? "h-5 w-3 md:h-6 md:w-4" : "h-3 w-2 md:h-4 md:w-2.5"} ${i < filled ? barColor : "bg-stone"}`}
          />
        ))}
      </div>
    </div>
  );
}
