import "server-only";

import { QUESTS } from "@/lib/quests";
import type { Answer } from "@/lib/types";

interface AnswerEntry {
  correct: Answer;
  explanation: string;
}

const ANSWER_KEY: Record<string, AnswerEntry> = {
  "automation-forest": {
    correct: "fact",
    explanation:
      "Microsoft released Playwright in 2020 as open source (Apache 2.0). One API automates Chromium, Firefox and WebKit for end-to-end testing and general browser automation.",
  },
  "framework-arena": {
    correct: "myth",
    explanation:
      "Selenium drives browsers through the W3C WebDriver protocol and a browser-specific driver. Playwright installs its own browser builds (npx playwright install) and controls them directly - no WebDriver binaries needed.",
  },
  "browser-tower": {
    correct: "fact",
    explanation:
      "Your test (client) talks to the Playwright server over one persistent connection, which drives each browser through native protocols (CDP for Chromium, custom protocols for Firefox and WebKit). Fewer round trips = faster, less flaky tests.",
  },
  "feature-dungeon": {
    correct: "myth",
    explanation:
      "Playwright auto-waits for elements to be attached, visible, stable, enabled and able to receive events before acting, and web-first assertions retry automatically. Hard-coded sleeps are discouraged.",
  },
  "final-boss": {
    correct: "myth",
    explanation:
      "Playwright emulates mobile devices (viewport, user agent, touch, geolocation) in desktop browsers, but real physical devices are not supported out of the box - a known limitation. Prerequisites for the JS/TS flavour: Node.js, an editor such as VS Code, and basic JavaScript/TypeScript.",
  },
};

export function getAnswer(questIndex: number): AnswerEntry {
  const quest = QUESTS[questIndex];
  const entry = quest ? ANSWER_KEY[quest.id] : undefined;
  if (!entry) {
    throw new Error(`No answer key entry for quest index ${questIndex}`);
  }
  return entry;
}
