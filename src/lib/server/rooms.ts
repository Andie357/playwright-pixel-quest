import "server-only";

import { mapRoomRow } from "@/lib/room-mapper";
import type { RoomResponse, RoomRow, RoomState } from "@/lib/types";
import { ApiError } from "./http";
import { getAdminClient } from "./supabase-admin";
import { tokenMatches } from "./tokens";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export async function findRoomByCode(code: string): Promise<RoomRow> {
  const { data, error } = await getAdminClient()
    .from("rooms")
    .select("*")
    .eq("code", code)
    .maybeSingle<RoomRow>();

  if (error) throw error;
  if (!data) throw new ApiError(404, "room_not_found", "No adventure found with that room code.");
  return data;
}

export async function findRoomById(id: string): Promise<RoomRow> {
  const { data, error } = await getAdminClient()
    .from("rooms")
    .select("*")
    .eq("id", id)
    .single<RoomRow>();

  if (error) throw error;
  return data;
}

export async function assertHost(roomId: string, token: string | null): Promise<void> {
  const { data, error } = await getAdminClient()
    .from("room_hosts")
    .select("token_hash")
    .eq("room_id", roomId)
    .maybeSingle<{ token_hash: string }>();

  if (error) throw error;
  if (!data || !tokenMatches(token, data.token_hash)) {
    throw new ApiError(403, "not_host", "Only the host of this room can do that.");
  }
}

export async function assertPlayer(
  roomId: string,
  playerId: unknown,
  token: unknown,
): Promise<string> {
  if (!isUuid(playerId) || typeof token !== "string") {
    throw new ApiError(401, "not_player", "You have not joined this room yet.");
  }

  const { data, error } = await getAdminClient()
    .from("players")
    .select("id, token_hash")
    .eq("id", playerId)
    .eq("room_id", roomId)
    .maybeSingle<{ id: string; token_hash: string }>();

  if (error) throw error;
  if (!data || !tokenMatches(token, data.token_hash)) {
    throw new ApiError(401, "not_player", "You have not joined this room yet.");
  }
  return data.id;
}

export function roomResponse(row: RoomRow | RoomState): RoomResponse {
  const room = "quest_index" in row ? mapRoomRow(row) : row;
  return { room, serverNow: Date.now() };
}
