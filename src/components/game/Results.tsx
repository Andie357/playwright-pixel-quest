"use client";

import { useEffect, useState, type CSSProperties } from "react";

import { majorityLabel } from "@/lib/room-mapper";
import type { Answer, QuestResult } from "@/lib/types";

function useAnimatedMount(delay = 150) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setShown(true), delay);
    return () => clearTimeout(id);
  }, [delay]);
  return shown;
}

function VoteBar({
  label,
  pct,
  count,
  answer,
  large,
  grow,
}: {
  label: string;
  pct: number;
  count: number;
  answer: Answer;
  large: boolean;
  grow: boolean;
}) {
  const fill = answer === "myth" ? "bg-ruby" : "bg-grass";
  const shade = answer === "myth" ? "shadow-[inset_0_-6px_0_0_#5d275d]" : "shadow-[inset_0_-6px_0_0_#257179]";
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className={`font-pixel pixel-text-shadow ${large ? "text-xl md:text-3xl" : "text-base"} ${answer === "myth" ? "text-ruby" : "text-lime"}`}>
          {label}
        </span>
        <span className={`font-pixel pixel-text-shadow tabular-nums ${large ? "text-2xl md:text-4xl" : "text-lg"}`}>
          {pct}%
          <span className={`ml-3 font-body text-mist ${large ? "text-2xl md:text-3xl" : "text-xl"}`}>
            {count} {count === 1 ? "vote" : "votes"}
          </span>
        </span>
      </div>
      <div className={`w-full bg-ink p-1 ${large ? "h-10 md:h-14" : "h-8"}`}>
        <div
          className={`h-full ${fill} ${shade} transition-[width] duration-[1200ms] ease-out`}
          style={{ width: grow ? `${pct}%` : "0%" }}
        />
      </div>
    </div>
  );
}

export function VoteBars({ result, large = false }: { result: QuestResult; large?: boolean }) {
  const grow = useAnimatedMount();
  return (
    <div className="flex w-full flex-col gap-5" aria-label="Vote breakdown">
      <VoteBar label="MYTH" pct={result.mythPct} count={result.myth} answer="myth" large={large} grow={grow} />
      <VoteBar label="FACT" pct={result.factPct} count={result.fact} answer="fact" large={large} grow={grow} />
      <p className={`text-mist ${large ? "text-2xl" : "text-lg"}`}>
        Based on {result.total} submitted {result.total === 1 ? "answer" : "answers"}
        {result.participants > result.total ? ` (${result.participants - result.total} did not answer)` : ""}.
      </p>
    </div>
  );
}

export function MajorityPanel({ result, large = false }: { result: QuestResult; large?: boolean }) {
  const { majority } = result;
  const color = majority === "myth" ? "text-ruby" : majority === "fact" ? "text-lime" : "text-gold";
  const caption =
    majority === "tie"
      ? "The party is split evenly!"
      : majority === "none"
        ? "No hero cast a vote."
        : "Most heroes chose this.";
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <span className={`font-pixel uppercase text-mist ${large ? "text-sm md:text-base" : "text-[0.65rem]"}`}>Community says</span>
      <span className={`font-pixel pixel-text-shadow ${color} ${large ? "text-3xl md:text-5xl" : "text-2xl"}`}>
        {majorityLabel(majority)}
      </span>
      <span className={large ? "text-2xl" : "text-lg"}>{caption}</span>
    </div>
  );
}

export function CorrectPanel({ result, large = false }: { result: QuestResult; large?: boolean }) {
  const isMyth = result.correct === "myth";
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <span className={`font-pixel uppercase text-ink/70 ${large ? "text-sm md:text-base" : "text-[0.65rem]"}`}>The truth is</span>
      <span
        className={`animate-pop font-pixel ${isMyth ? "text-ruby" : "text-teal"} ${large ? "text-4xl md:text-6xl" : "text-3xl"}`}
        style={{ textShadow: "3px 3px 0 #0d0e17" }}
      >
        {isMyth ? "MYTH" : "FACT"}
      </span>
    </div>
  );
}

const CONFETTI_COLORS = ["#ffcd75", "#a7f070", "#41a6f6", "#ef7d57", "#f4f4f4", "#b13e53"];

/** Deterministic pixel confetti burst. */
export function Confetti({ pieces = 48 }: { pieces?: number }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {Array.from({ length: pieces }, (_, i) => {
        const left = (i * 37) % 100;
        const size = 6 + ((i * 7) % 3) * 4;
        const style = {
          left: `${left}%`,
          width: size,
          height: size,
          background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          animation: `confetti ${2.2 + ((i * 13) % 10) / 6}s ${((i * 17) % 20) / 20}s steps(24) forwards`,
          "--dx": `${((i * 29) % 21) - 10}vw`,
        } as CSSProperties;
        return <span key={i} className="absolute -top-4" style={style} />;
      })}
    </div>
  );
}

export function QuestCompleteBanner({ questNumber, isBoss }: { questNumber: number; isBoss: boolean }) {
  return (
    <div className="animate-slide-down pixel-box pixel-box-gold px-6 py-3 text-center">
      <span className="font-pixel text-sm md:text-xl">
        {isBoss ? "FINAL QUEST COMPLETE!" : `QUEST ${questNumber} COMPLETE!`}
      </span>
    </div>
  );
}
