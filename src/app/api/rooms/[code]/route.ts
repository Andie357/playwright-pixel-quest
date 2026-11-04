import { handle, json, parseRoomCode } from "@/lib/server/http";
import { findRoomByCode, roomResponse } from "@/lib/server/rooms";

export async function GET(_req: Request, ctx: RouteContext<"/api/rooms/[code]">) {
  return handle(async () => {
    const code = parseRoomCode((await ctx.params).code);
    return json(roomResponse(await findRoomByCode(code)));
  });
}
