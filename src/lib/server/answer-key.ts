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
      "Playwright is Microsoft's open-source (Apache 2.0) framework for web testing and automation. One API drives Chromium, Firefox and WebKit, and it works with TypeScript/JavaScript, Python, Java and .NET.",
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
      "Codegen (npx playwright codegen <url>) is part of the Test Generator and Test Inspector: it records clicks, typing and navigation, picks resilient locators for you, and can add assertions from its toolbar. Other key features: Trace Viewer, fixtures (config file), screenshots and videos on test failures, retries, and auto-waiting.",
  },
  "final-boss": {
    correct: "fact",
    explanation:
      "One framework covers end-to-end, functional and API testing, multi-tab flows and mobile device emulation. For example, one test can start at the login page, go through creating a record, and check the confirmation message. Note: mobile is emulated in desktop browsers, not run on real devices.",
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
