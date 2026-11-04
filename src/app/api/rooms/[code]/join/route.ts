import { ApiError, handle, json, parseRoomCode, readJson } from "@/lib/server/http";
import {
  assertPlayer,
  findRoomByCode,
  findRoomById,
  isUuid,
  roomResponse,
} from "@/lib/server/rooms";
import { getAdminClient } from "@/lib/server/supabase-admin";
import { hashToken, newToken } from "@/lib/server/tokens";
import type { JoinResponse } from "@/lib/types";

const MAX_PLAYERS = 500;

export async function POST(req: Request, ctx: RouteContext<"/api/rooms/[code]/join">) {
  return handle(async () => {
    const code = parseRoomCode((await ctx.params).code);
    const body = await readJson(req);
    const room = await findRoomByCode(code);

    // Rejoin with an existing anonymous session (e.g. after a page refresh).
    if (isUuid(body.playerId) && typeof body.playerToken === "string") {
      try {
        const playerId = await assertPlayer(room.id, body.playerId, body.playerToken);
        const response: JoinResponse = {
          ...roomResponse(room),
          playerId,
          playerToken: body.playerToken,
        };
        return json(response);
      } catch (err) {
        if (!(err instanceof ApiError)) throw err;
      }
    }

    if (room.status === "finished") {
      throw new ApiError(409, "room_finished", "This adventure has already ended.");
    }
    if (room.player_count >= MAX_PLAYERS) {
      throw new ApiError(409, "room_full", "This room is full.");
    }

    const playerToken = newToken();
    const { data, error } = await getAdminClient()
      .from("players")
      .insert({ room_id: room.id, token_hash: hashToken(playerToken) })
      .select("id")
      .single<{ id: string }>();

    if (error) throw error;

    const response: JoinResponse = {
      ...roomResponse(await findRoomById(room.id)),
      playerId: data.id,
      playerToken,
    };
    return json(response, 201);
  });
}
