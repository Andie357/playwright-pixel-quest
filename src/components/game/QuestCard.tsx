import { Panel, Tag } from "@/components/pixel/ui";
import type { Quest } from "@/lib/quests";

/**
 * With `showStatement={false}` only the quest number, name and topic are
 * rendered; the statement is left out of the DOM entirely.
 */
export function QuestCard({
  quest,
  total,
  size = "md",
  showStatement = true,
}: {
  quest: Quest;
  total: number;
  size?: "md" | "lg";
  showStatement?: boolean;
}) {
  const large = size === "lg";
  const boss = quest.theme === "boss";
  return (
    <Panel variant="parchment" className={`animate-pop w-full ${large ? "p-6 md:p-10" : "p-5"}`}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tag color="stone">{`Quest ${quest.index + 1} / ${total}`}</Tag>
        {boss && <Tag color="ruby">Boss battle</Tag>}
        {showStatement && (
          <span className={`font-pixel uppercase text-plum ${large ? "text-sm md:text-lg" : "text-xs"}`}>{quest.name}</span>
        )}
      </div>

      {showStatement ? (
        <>
          <p className={`mb-4 font-pixel uppercase leading-snug text-teal ${large ? "text-xs md:text-base lg:text-lg" : "text-xs"}`}>
            Topic: {quest.topic}
          </p>
          <p key="statement" className={`animate-pop leading-tight text-ink ${large ? "text-4xl md:text-5xl lg:text-6xl" : "text-[1.7rem]"}`}>
            &ldquo;{quest.statement}&rdquo;
          </p>
          <p className={`mt-4 font-pixel uppercase text-ink/60 ${large ? "text-xs md:text-sm" : "text-[0.6rem]"}`}>
            Myth or Fact?
          </p>
        </>
      ) : (
        <>
          <p className={`font-pixel uppercase leading-snug text-plum ${large ? "text-2xl md:text-4xl lg:text-5xl" : "text-lg"}`}>
            {quest.name}
          </p>
          <p className={`mt-5 font-pixel uppercase leading-snug text-teal ${large ? "text-sm md:text-xl lg:text-2xl" : "text-xs"}`}>
            Topic: {quest.topic}
          </p>
          <p className={`mt-6 font-pixel uppercase text-ink/60 ${large ? "text-xs md:text-sm" : "text-[0.6rem]"}`}>
            The question appears when the countdown starts
          </p>
        </>
      )}
    </Panel>
  );
}
