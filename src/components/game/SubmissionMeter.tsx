const MAX_BLOCKS = 60;

/**
 * Anonymous submission progress: one block per participant, filled in join
 * order regardless of who answered. No names, no answers.
 */
export function SubmissionMeter({ submitted, total }: { submitted: number; total: number }) {
  const pct = total > 0 ? Math.round((Math.min(submitted, total) / total) * 100) : 0;
  const showBlocks = total > 0 && total <= MAX_BLOCKS;
  const everyone = total > 0 && submitted >= total;

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4">
        <span className="font-pixel text-xs uppercase text-mist md:text-sm">Answers locked</span>
        <span className={`whitespace-nowrap font-pixel pixel-text-shadow text-2xl md:text-4xl ${everyone ? "text-lime" : "text-snow"}`}>
          {submitted}
          <span className="text-mist"> / {total}</span>
        </span>
      </div>
      {showBlocks ? (
        <div className="flex flex-wrap gap-1.5" aria-hidden>
          {Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              className={`h-5 w-5 md:h-7 md:w-7 ${i < submitted ? "animate-pop bg-lime shadow-[inset_0_-4px_0_0_#257179]" : "bg-stone shadow-[inset_0_4px_0_0_#1a1c2c]"}`}
            />
          ))}
        </div>
      ) : (
        <div className="h-6 w-full bg-stone p-1" aria-hidden>
          <div className="h-full bg-lime transition-[width] duration-300" style={{ width: `${pct}%` }} />
        </div>
      )}
      <span className="sr-only">
        {submitted} of {total} participants have submitted
      </span>
    </div>
  );
}
