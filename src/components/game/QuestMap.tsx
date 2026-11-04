import { CHECK, HERO, Sprite } from "@/components/pixel/Sprite";
import { QUESTS } from "@/lib/quests";
import type { RoomStatus } from "@/lib/types";

const NODE_COLORS = ["bg-grass", "bg-ember", "bg-royal", "bg-plum", "bg-ruby"];

/** RPG world-map style progress indicator across the five quests. */
export function QuestMap({
  questIndex,
  status,
  showNames = true,
  compact = false,
}: {
  questIndex: number;
  status: RoomStatus;
  showNames?: boolean;
  compact?: boolean;
}) {
  const completedCount =
    status === "finished" ? QUESTS.length : status === "revealed" ? questIndex + 1 : status === "lobby" ? 0 : questIndex;
  const activeIndex = status === "lobby" || status === "finished" ? -1 : questIndex;

  // Vertical centre of the node = sprite slot + gap + half node height.
  const slot = compact ? "h-8" : "h-8 md:h-14";
  const node = compact ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm md:h-14 md:w-14 md:text-lg";
  const connectorTop = compact ? "top-[calc(3.25rem-3px)]" : "top-[calc(3.5rem-3px)] md:top-[calc(5.5rem-3px)]";

  return (
    <nav aria-label="Quest progress" className="w-full">
      <ol className="flex justify-between">
        {QUESTS.map((quest, i) => {
          const done = i < completedCount;
          const active = i === activeIndex;
          const boss = i === QUESTS.length - 1;
          return (
            <li
              key={quest.id}
              className="relative flex flex-1 flex-col items-center gap-1"
              aria-current={active ? "step" : undefined}
            >
              {i < QUESTS.length - 1 && (
                <span
                  aria-hidden
                  className={`absolute left-1/2 h-[6px] w-full ${connectorTop} ${i < completedCount ? "pixel-path" : "bg-stone/80"}`}
                />
              )}
              <div className={`${slot} flex items-end`}>
                {active && <Sprite art={HERO} scale={compact ? 2 : 3} className="animate-bob" />}
              </div>
              <div
                className={`relative z-10 flex items-center justify-center font-pixel shadow-[0_-4px_0_0_#0d0e17,0_4px_0_0_#0d0e17,-4px_0_0_0_#0d0e17,4px_0_0_0_#0d0e17] ${node} ${
                  done || active ? NODE_COLORS[i] : "bg-stone"
                } ${active ? "animate-pop outline-4 outline-offset-4 outline-gold" : ""}`}
              >
                {done ? (
                  <Sprite art={CHECK} scale={compact ? 2 : 3} title="Completed" />
                ) : (
                  <span className={active ? "text-snow pixel-text-shadow" : "text-mist"}>{boss ? "!" : i + 1}</span>
                )}
              </div>
              {showNames && (
                <span
                  className={`mt-2 hidden px-1 text-center font-pixel text-[0.55rem] uppercase leading-tight md:block md:text-[0.65rem] ${
                    active ? "text-gold" : done ? "text-snow" : "text-mist/70"
                  }`}
                >
                  {quest.name}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
