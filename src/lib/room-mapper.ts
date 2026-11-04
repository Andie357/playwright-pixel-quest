import type { Majority, QuestResult, RoomRow, RoomState } from "./types";

export function mapRoomRow(row: RoomRow): RoomState {
  return {
    id: row.id,
    code: row.code,
    status: row.status,
    questIndex: row.quest_index,
    questCount: row.quest_count,
    timerSeconds: row.timer_seconds,
    timerStartedAt: row.timer_started_at,
    timerEndsAt: row.timer_ends_at,
    playerCount: row.player_count,
    submittedCount: row.submitted_count,
    results: row.results ?? null,
    history: Array.isArray(row.history) ? row.history : [],
    version: Number(row.version ?? 0),
    createdAt: row.created_at,
  };
}

/** Percentage of submitted votes that matched the correct answer. */
export function correctPct(result: QuestResult): number {
  if (result.total === 0) return 0;
  return result.correct === "myth" ? result.mythPct : result.factPct;
}

export function majorityLabel(majority: Majority): string {
  switch (majority) {
    case "myth":
      return "MYTH";
    case "fact":
      return "FACT";
    case "tie":
      return "TIE";
    default:
      return "NO VOTES";
  }
}

export function normalizeRoomCode(raw: string): string {
  return raw.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 6);
}

export function isValidRoomCode(code: string): boolean {
  return /^[A-Z0-9]{6}$/.test(code);
}
