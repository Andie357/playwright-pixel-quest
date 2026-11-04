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
    topic: "Introduction to Playwright & browser automation",
    statement:
      "Playwright is an open-source browser automation framework created by Microsoft.",
    theme: "forest",
    enemy: "Flaky Slime",
    intro: "Your journey begins among the whispering trees of manual clicking...",
  },
  {
    id: "framework-arena",
    index: 1,
    name: "Framework Arena",
    topic: "Playwright vs Selenium",
    statement:
      "Just like Selenium, Playwright needs a separate driver executable (such as ChromeDriver) for every browser it controls.",
    theme: "arena",
    enemy: "Legacy Golem",
    intro: "Two champions enter the arena. Only the truth walks out.",
  },
  {
    id: "browser-tower",
    index: 2,
    name: "Browser Tower",
    topic: "Playwright architecture",
    statement:
      "Playwright sends commands to the browser over a single persistent WebSocket connection instead of a new HTTP request for every command.",
    theme: "tower",
    enemy: "Protocol Wraith",
    intro: "Climb the tower and uncover how the browsers are really controlled.",
  },
  {
    id: "feature-dungeon",
    index: 3,
    name: "Feature Dungeon",
    topic: "Playwright key features",
    statement:
      "In Playwright you must add manual waits (like sleep or waitForTimeout) before clicking elements to avoid flaky tests.",
    theme: "dungeon",
    enemy: "Timeout Goblin",
    intro: "Torches flicker. Somewhere in the dark, a test is waiting... and waiting...",
  },
  {
    id: "final-boss",
    index: 4,
    name: "Final Boss",
    topic: "Advantages, disadvantages & prerequisites",
    statement:
      "Playwright can run tests on real physical iOS and Android devices out of the box.",
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
