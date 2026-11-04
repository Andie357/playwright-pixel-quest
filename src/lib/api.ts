import type {
  Answer,
  ApiErrorBody,
  CreateRoomResponse,
  HostAction,
  JoinResponse,
  MeResponse,
  RoomResponse,
  VoteResponse,
} from "./types";

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      cache: "no-store",
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiClientError(0, "network_error", "Connection lost. Check your internet and try again.");
  }

  const body = (await res.json().catch(() => null)) as T | ApiErrorBody | null;
  if (!res.ok) {
    const err = (body as ApiErrorBody | null)?.error;
    throw new ApiClientError(res.status, err?.code ?? "unknown", err?.message ?? "Something went wrong.");
  }
  return body as T;
}

function post<T>(path: string, body: unknown, headers?: Record<string, string>): Promise<T> {
  return request<T>(path, { method: "POST", body: JSON.stringify(body), headers });
}

export interface PlayerCredentials {
  playerId: string;
  playerToken: string;
}

const roomPath = (code: string) => `/api/rooms/${encodeURIComponent(code)}`;

export const api = {
  createRoom: (timerSeconds: number) => post<CreateRoomResponse>("/api/rooms", { timerSeconds }),

  getRoom: (code: string) => request<RoomResponse>(roomPath(code)),

  join: (code: string, creds?: PlayerCredentials | null) =>
    post<JoinResponse>(`${roomPath(code)}/join`, creds ?? {}),

  vote: (code: string, creds: PlayerCredentials, questIndex: number, answer: Answer) =>
    post<VoteResponse>(`${roomPath(code)}/vote`, { ...creds, questIndex, answer }),

  me: (code: string, creds: PlayerCredentials) => post<MeResponse>(`${roomPath(code)}/me`, creds),

  host: (code: string, hostToken: string, action: HostAction, extra?: Record<string, unknown>) =>
    post<RoomResponse>(`${roomPath(code)}/host`, { action, ...extra }, {
      Authorization: `Bearer ${hostToken}`,
    }),
};
