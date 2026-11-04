import { clampTimerSeconds, QUEST_COUNT } from "@/lib/quests";
import { handle, json, readJson } from "@/lib/server/http";
import { roomResponse } from "@/lib/server/rooms";
import { getAdminClient } from "@/lib/server/supabase-admin";
import { hashToken, newRoomCode, newToken } from "@/lib/server/tokens";
import type { CreateRoomResponse, RoomRow } from "@/lib/types";

export async function POST(req: Request) {
  return handle(async () => {
    const body = await readJson(req);
    const supabase = getAdminClient();
    const timerSeconds = clampTimerSeconds(body.timerSeconds);

    let row: RoomRow | null = null;
    for (let attempt = 0; attempt < 6 && !row; attempt++) {
      const { data, error } = await supabase
        .from("rooms")
        .insert({ code: newRoomCode(), timer_seconds: timerSeconds, quest_count: QUEST_COUNT })
        .select("*")
        .single<RoomRow>();

      if (!error) row = data;
      else if (error.code !== "23505") throw error; // 23505 = code collision, retry
    }
    if (!row) throw new Error("Could not allocate a unique room code");

    const hostToken = newToken();
    const { error: hostError } = await supabase
      .from("room_hosts")
      .insert({ room_id: row.id, token_hash: hashToken(hostToken) });

    if (hostError) {
      await supabase.from("rooms").delete().eq("id", row.id);
      throw hostError;
    }

    const response: CreateRoomResponse = { ...roomResponse(row), hostToken };
    return json(response, 201);
  });
}
