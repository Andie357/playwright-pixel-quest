import { ApiError, handle, json, parseRoomCode, readJson } from "@/lib/server/http";
import { assertPlayer, findRoomByCode, findRoomById, roomResponse } from "@/lib/server/rooms";
import { getAdminClient } from "@/lib/server/supabase-admin";
import type { Answer, VoteResponse } from "@/lib/types";

const VOTE_ERRORS: Record<string, [number, string]> = {
  invalid_answer: [400, "Choose MYTH or FACT."],
  room_not_found: [404, "No adventure found with that room code."],
  voting_closed: [409, "Voting is not open for this quest."],
  time_up: [409, "Time's up! Voting for this quest has closed."],
};

export async function POST(req: Request, ctx: RouteContext<"/api/rooms/[code]/vote">) {
  return handle(async () => {
    const code = parseRoomCode((await ctx.params).code);
    const body = await readJson(req);
    const room = await findRoomByCode(code);
    const playerId = await assertPlayer(room.id, body.playerId, body.playerToken);

    const answer = body.answer;
    const questIndex = body.questIndex;
    if ((answer !== "myth" && answer !== "fact") || typeof questIndex !== "number") {
      throw new ApiError(400, "invalid_answer", "Choose MYTH or FACT.");
    }

    const supabase = getAdminClient();
    const { data: status, error } = await supabase.rpc("pq_submit_vote", {
      p_room_id: room.id,
      p_player_id: playerId,
      p_quest_index: questIndex,
      p_answer: answer,
    });
    if (error) throw error;

    let recorded: Answer = answer;
    if (status === "already_voted") {
      const { data: existing, error: existingError } = await supabase
        .from("votes")
        .select("answer")
        .eq("player_id", playerId)
        .eq("quest_index", questIndex)
        .single<{ answer: Answer }>();
      if (existingError) throw existingError;
      recorded = existing.answer;
    } else if (status !== "ok") {
      const [httpStatus, message] = VOTE_ERRORS[status as string] ?? [409, "Vote rejected."];
      throw new ApiError(httpStatus, String(status), message);
    }

    const response: VoteResponse = {
      ...roomResponse(await findRoomById(room.id)),
      answer: recorded,
    };
    return json(response);
  });
}
