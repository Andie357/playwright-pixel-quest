import { Panel, Tag } from "@/components/pixel/ui";
import type { Quest } from "@/lib/quests";

export function QuestCard({
  quest,
  total,
  size = "md",
}: {
  quest: Quest;
  total: number;
  size?: "md" | "lg";
}) {
  const large = size === "lg";
  const boss = quest.theme === "boss";
  return (
    <Panel variant="parchment" className={`animate-pop w-full ${large ? "p-6 md:p-10" : "p-5"}`}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tag color={boss ? "ruby" : "stone"}>{boss ? "Boss battle" : `Quest ${quest.index + 1} / ${total}`}</Tag>
        <span className={`font-pixel uppercase text-plum ${large ? "text-sm md:text-lg" : "text-xs"}`}>{quest.name}</span>
      </div>
      <p className={`mb-3 font-pixel uppercase text-teal ${large ? "text-[0.65rem] md:text-sm" : "text-[0.6rem]"}`}>
        Topic: {quest.topic}
      </p>
      <p className={`leading-tight text-ink ${large ? "text-4xl md:text-5xl lg:text-6xl" : "text-[1.7rem]"}`}>
        &ldquo;{quest.statement}&rdquo;
      </p>
      <p className={`mt-4 font-pixel uppercase text-ink/60 ${large ? "text-xs md:text-sm" : "text-[0.6rem]"}`}>
        Myth or Fact?
      </p>
    </Panel>
  );
}
