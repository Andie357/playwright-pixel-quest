export type Answer = "myth" | "fact";

export type Majority = Answer | "tie" | "none";

export type RoomStatus = "lobby" | "quest" | "voting" | "revealed" | "finished";

export type HostAction = "verify" | "start" | "start_timer" | "reveal" | "next";

export interface QuestResult {
  questIndex: number;
  myth: number;
  fact: number;
  total: number;
  mythPct: number;
  factPct: number;
  majority: Majority;
  correct: Answer;
  explanation: string;
  participants: number;
  revealedAt: string;
}

export interface RoomState {
  id: string;
  code: string;
  status: RoomStatus;
  questIndex: number;
  questCount: number;
  timerSeconds: number;
  timerStartedAt: string | null;
  timerEndsAt: string | null;
  playerCount: number;
  submittedCount: number;
  results: QuestResult | null;
  history: QuestResult[];
  version: number;
  createdAt: string;
}

/** Shape of a `public.rooms` row as returned by PostgREST / Realtime. */
export interface RoomRow {
  id: string;
  code: string;
  status: RoomStatus;
  quest_index: number;
  quest_count: number;
  timer_seconds: number;
  timer_started_at: string | null;
  timer_ends_at: string | null;
  player_count: number;
  submitted_count: number;
  results: QuestResult | null;
  history: QuestResult[] | null;
  version: number;
  created_at: string;
}

export interface RoomResponse {
  room: RoomState;
  serverNow: number;
}

export interface CreateRoomResponse extends RoomResponse {
  hostToken: string;
}

export interface JoinResponse extends RoomResponse {
  playerId: string;
  playerToken: string;
}

export interface VoteResponse extends RoomResponse {
  answer: Answer;
}

export interface MeResponse {
  votes: Record<number, Answer>;
}

export interface ApiErrorBody {
  error: { code: string; message: string };
}
