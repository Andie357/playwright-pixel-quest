import { handle, json, parseRoomCode, readJson } from "@/lib/server/http";
import { assertPlayer, findRoomByCode } from "@/lib/server/rooms";
import { getAdminClient } from "@/lib/server/supabase-admin";
import type { Answer, MeResponse } from "@/lib/types";

/** Returns only the calling participant's own votes. */
export async function POST(req: Request, ctx: RouteContext<"/api/rooms/[code]/me">) {
  return handle(async () => {
    const code = parseRoomCode((await ctx.params).code);
    const body = await readJson(req);
    const room = await findRoomByCode(code);
    const playerId = await assertPlayer(room.id, body.playerId, body.playerToken);

    const { data, error } = await getAdminClient()
      .from("votes")
      .select("quest_index, answer")
      .eq("player_id", playerId)
      .returns<{ quest_index: number; answer: Answer }[]>();
    if (error) throw error;

    const votes: MeResponse["votes"] = {};
    for (const vote of data ?? []) votes[vote.quest_index] = vote.answer;
    return json<MeResponse>({ votes });
  });
}
