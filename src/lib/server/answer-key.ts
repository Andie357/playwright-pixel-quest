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
    explanation: "It is free to use, and its source code is publicly available.",
  },
  "framework-arena": {
    correct: "myth",
    explanation:
      "Playwright offers features such as automatic waiting and built-in tracing, but the best choice depends on your project's requirements and existing framework.",
  },
  "browser-tower": {
    correct: "fact",
    explanation: "These features help teams validate application behavior and investigate failures.",
  },
  "feature-dungeon": {
    correct: "myth",
    explanation:
      "Automation saves time on repeated testing, but tests may need updates when the application changes. Creating and maintaining tests also requires time and technical skills.",
  },
  "final-boss": {
    correct: "myth",
    explanation:
      "Depending on your setup, you may also need to install Playwright's browser binaries and required system dependencies.",
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
