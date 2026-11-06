/**
 * Public quest content. Correct answers and explanations live in
 * `src/lib/server/answer-key.ts` so they never reach the browser before
 * the host reveals them.
 */

export type QuestTheme = "forest" | "arena" | "tower" | "dungeon" | "boss";

export interface Quest {
  id: string;
  index: number;
  name: string;
  topic: string;
  statement: string;
  theme: QuestTheme;
  enemy: string;
  intro: string;
}

export const QUESTS: Quest[] = [
  {
    id: "automation-forest",
    index: 0,
    name: "Automation Forest",
    topic: "Playwright Introduction",
    statement:
      "Playwright is an open-source tool for automating and testing web applications.",
    theme: "forest",
    enemy: "Flaky Slime",
    intro: "Session 1 recap begins! Your journey starts among the whispering trees of manual clicking...",
  },
  {
    id: "framework-arena",
    index: 1,
    name: "Framework Arena",
    topic: "Choosing a Testing Framework",
    statement:
      "Playwright is always a better choice than Selenium for every project.",
    theme: "arena",
    enemy: "Legacy Golem",
    intro: "Two champions enter the arena. Which one fits your project?",
  },
  {
    id: "browser-tower",
    index: 2,
    name: "Browser Tower",
    topic: "Playwright Key Features",
    statement:
      "Playwright supports features such as screenshots, network interception, and running tests across multiple browsers.",
    theme: "tower",
    enemy: "Protocol Wraith",
    intro: "Climb the tower and recall the tools that guard every browser.",
  },
  {
    id: "feature-dungeon",
    index: 3,
    name: "Feature Dungeon",
    topic: "Test Automation Maintenance",
    statement:
      "Once you automate a test with Playwright, it will never need maintenance.",
    theme: "dungeon",
    enemy: "Timeout Goblin",
    intro: "Torches flicker. Deep in the dungeon, old tests crumble as the app changes...",
  },
  {
    id: "final-boss",
    index: 4,
    name: "Final Boss",
    topic: "Playwright Installation",
    statement:
      "Installing the Playwright package automatically guarantees that all required browsers and system dependencies are ready.",
    theme: "boss",
    enemy: "The Flaky Test Dragon",
    intro: "The ground shakes. The Flaky Test Dragon awakens!",
  },
];

export const QUEST_COUNT = QUESTS.length;

export function getQuest(index: number): Quest {
  return QUESTS[Math.min(Math.max(index, 0), QUESTS.length - 1)];
}

export const TIMER_OPTIONS = [15, 20, 30, 45, 60, 90] as const;
export const DEFAULT_TIMER_SECONDS = 30;
export const MIN_TIMER_SECONDS = 5;
export const MAX_TIMER_SECONDS = 300;

export function clampTimerSeconds(value: unknown): number {
  const n = typeof value === "number" ? Math.round(value) : DEFAULT_TIMER_SECONDS;
  if (!Number.isFinite(n)) return DEFAULT_TIMER_SECONDS;
  return Math.min(MAX_TIMER_SECONDS, Math.max(MIN_TIMER_SECONDS, n));
}
