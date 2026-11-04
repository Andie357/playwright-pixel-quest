import { clampTimerSeconds } from "@/lib/quests";
import { getAnswer } from "@/lib/server/answer-key";
import {
  ApiError,
  bearerToken,
  handle,
  json,
  parseRoomCode,
  readJson,
} from "@/lib/server/http";
import { assertHost, findRoomByCode, findRoomById, roomResponse } from "@/lib/server/rooms";
import { getAdminClient } from "@/lib/server/supabase-admin";
import type { HostAction, RoomRow } from "@/lib/types";

const ACTIONS: HostAction[] = ["verify", "start", "start_timer", "reveal", "next"];

const REVEAL_ERRORS: Record<string, [number, string]> = {
  not_ready: [409, "Reveal unlocks when every hero has answered or the timer runs out."],
  not_voting: [409, "This quest is not accepting answers right now."],
  room_not_found: [404, "No adventure found with that room code."],
};

export async function POST(req: Request, ctx: RouteContext<"/api/rooms/[code]/host">) {
  return handle(async () => {
    const code = parseRoomCode((await ctx.params).code);
    const body = await readJson(req);
    const action = body.action as HostAction;
    if (!ACTIONS.includes(action)) {
      throw new ApiError(400, "invalid_action", "Unknown host action.");
    }

    const room = await findRoomByCode(code);
    await assertHost(room.id, bearerToken(req));

    if (action === "verify") return json(roomResponse(room));

    const supabase = getAdminClient();

    /** Conditional update: only applies if the room is still in `fromStatus`. */
    async function transition(fromStatus: RoomRow["status"], patch: Partial<RoomRow>) {
      const { data, error } = await supabase
        .from("rooms")
        .update(patch)
        .eq("id", room.id)
        .eq("status", fromStatus)
        .eq("quest_index", room.quest_index)
        .select("*")
        .maybeSingle<RoomRow>();
      if (error) throw error;
      if (!data) {
        throw new ApiError(409, "state_changed", "The game moved on. Refreshing...");
      }
      return data;
    }

    switch (action) {
      case "start": {
        if (room.status !== "lobby") throw new ApiError(409, "already_started", "The adventure has already begun.");
        const updated = await transition("lobby", {
          status: "quest",
          quest_index: 0,
          submitted_count: 0,
          results: null,
          timer_started_at: null,
          timer_ends_at: null,
        });
        return json(roomResponse(updated));
      }

      case "start_timer": {
        if (room.status !== "quest") throw new ApiError(409, "not_ready", "Show a quest before starting the countdown.");
        const seconds = clampTimerSeconds(body.seconds ?? room.timer_seconds);
        const now = Date.now();
        const updated = await transition("quest", {
          status: "voting",
          timer_seconds: seconds,
          timer_started_at: new Date(now).toISOString(),
          timer_ends_at: new Date(now + seconds * 1000).toISOString(),
        });
        return json(roomResponse(updated));
      }

      case "reveal": {
        const { correct, explanation } = getAnswer(room.quest_index);
        const { data, error } = await supabase.rpc("pq_reveal_quest", {
          p_room_id: room.id,
          p_quest_index: room.quest_index,
          p_correct: correct,
          p_explanation: explanation,
        });
        if (error) throw error;
        const result = data as { ok?: boolean; error?: string };
        if (!result?.ok) {
          const errorCode = result?.error ?? "reveal_failed";
          const [status, message] = REVEAL_ERRORS[errorCode] ?? [409, "Could not reveal results."];
          throw new ApiError(status, errorCode, message);
        }
        return json(roomResponse(await findRoomById(room.id)));
      }

      case "next": {
        if (room.status !== "revealed") throw new ApiError(409, "not_revealed", "Reveal the results first.");
        const isLast = room.quest_index + 1 >= room.quest_count;
        const updated = await transition(
          "revealed",
          isLast
            ? { status: "finished", timer_started_at: null, timer_ends_at: null }
            : {
                status: "quest",
                quest_index: room.quest_index + 1,
                submitted_count: 0,
                results: null,
                timer_started_at: null,
                timer_ends_at: null,
              },
        );
        return json(roomResponse(updated));
      }
    }
  });
}
