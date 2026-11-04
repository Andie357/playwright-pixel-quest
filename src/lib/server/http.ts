import "server-only";

import { isValidRoomCode, normalizeRoomCode } from "@/lib/room-mapper";
import type { ApiErrorBody } from "@/lib/types";
import { ConfigError } from "./supabase-admin";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

const NO_STORE = { "Cache-Control": "no-store" };

export function json<T>(body: T, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

function errorResponse(status: number, code: string, message: string): Response {
  const body: ApiErrorBody = { error: { code, message } };
  return Response.json(body, { status, headers: NO_STORE });
}

export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ApiError) return errorResponse(err.status, err.code, err.message);
    if (err instanceof ConfigError) return errorResponse(503, "not_configured", err.message);
    console.error("[api] unexpected error", err);
    return errorResponse(500, "server_error", "Something went wrong. Please try again.");
  }
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function parseRoomCode(raw: string): string {
  const code = normalizeRoomCode(decodeURIComponent(raw));
  if (!isValidRoomCode(code)) {
    throw new ApiError(400, "invalid_code", "Room codes are 6 letters or numbers.");
  }
  return code;
}

export function bearerToken(req: Request): string | null {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match ? match[1].trim() : null;
}

export function asString(value: unknown, maxLength = 200): string | null {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength ? value : null;
}
