import { BOSS, ENEMIES, Sprite } from "@/components/pixel/Sprite";
import { correctPct } from "@/lib/room-mapper";
import type { Quest } from "@/lib/quests";
import type { QuestResult } from "@/lib/types";

/**
 * The quest's enemy. Its HP drops by the share of correct answers once the
 * result is revealed; it is defeated when the community majority is right.
 */
export function EnemyEncounter({
  quest,
  result,
  scale = 6,
}: {
  quest: Quest;
  result: QuestResult | null;
  scale?: number;
}) {
  const boss = quest.theme === "boss";
  const art = boss ? BOSS : ENEMIES[quest.index % ENEMIES.length];
  const damage = result ? correctPct(result) : 0;
  const hp = 100 - damage;
  const defeated = !!result && result.majority === result.correct;

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div className="flex w-full max-w-xs flex-col gap-1">
        <div className="flex items-center justify-between gap-3 font-pixel text-[0.6rem] uppercase md:text-xs">
          <span className={boss ? "text-ruby" : "text-snow"}>{quest.enemy}</span>
          <span className="whitespace-nowrap text-mist">HP {hp}</span>
        </div>
        <div className="h-4 w-full bg-ink p-[3px]">
          <div
            className={`h-full transition-[width] delay-500 duration-[1500ms] ${hp > 50 ? "bg-lime" : hp > 20 ? "bg-gold" : "bg-ruby"}`}
            style={{ width: `${hp}%` }}
          />
        </div>
      </div>
      <div
        className={result ? (defeated ? "animate-defeat" : "animate-shake") : "animate-float"}
        style={result ? (defeated ? { animationDelay: "1.8s" } : { animationIterationCount: 3 }) : undefined}
      >
        <Sprite art={art} scale={boss ? scale + 1 : scale} title={quest.enemy} />
      </div>
      {result && (
        <p className="animate-pop text-center font-pixel text-[0.6rem] uppercase text-gold md:text-xs">
          {defeated ? `${quest.enemy} defeated!` : `${quest.enemy} survives... for now!`}
        </p>
      )}
    </div>
  );
}
