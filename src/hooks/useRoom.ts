"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { api, ApiClientError } from "@/lib/api";
import { mapRoomRow } from "@/lib/room-mapper";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import type { RoomResponse, RoomRow, RoomState } from "@/lib/types";

export type LiveStatus = "connecting" | "live" | "offline";

/**
 * Keeps a room in sync:
 *  1. initial fetch through the API (also measures server clock offset),
 *  2. Supabase Realtime `postgres_changes` on the room row,
 *  3. a light polling fallback in case the socket drops.
 * Snapshots are ordered by the row `version`, so stale data never wins.
 */
export function useRoom(code: string) {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [error, setError] = useState<ApiClientError | null>(null);
  const [live, setLive] = useState<LiveStatus>("connecting");
  const [clockOffset, setClockOffset] = useState(0);
  const inFlight = useRef(false);

  const apply = useCallback((next: RoomState) => {
    setRoom((prev) =>
      !prev || prev.id !== next.id || next.version >= prev.version ? next : prev,
    );
  }, []);

  /** Applies an API response and updates the server clock offset. */
  const applyResponse = useCallback(
    (res: RoomResponse, sentAt: number) => {
      const receivedAt = Date.now();
      setClockOffset(res.serverNow - (sentAt + receivedAt) / 2);
      apply(res.room);
      setError(null);
    },
    [apply],
  );

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    const sentAt = Date.now();
    try {
      applyResponse(await api.getRoom(code), sentAt);
    } catch (err) {
      if (err instanceof ApiClientError) setError(err);
    } finally {
      inFlight.current = false;
    }
  }, [code, applyResponse]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch; state updates after the response
    void refresh();
  }, [refresh]);

  const roomId = room?.id;

  useEffect(() => {
    if (!roomId) return;
    const supabase = getBrowserSupabase();
    if (!supabase) {
      queueMicrotask(() => setLive("offline"));
      return;
    }

    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
        (payload) => apply(mapRoomRow(payload.new as RoomRow)),
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setLive("live");
          void refresh();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setLive("offline");
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [roomId, apply, refresh]);

  useEffect(() => {
    const interval = setInterval(
      () => {
        if (document.visibilityState === "visible") void refresh();
      },
      live === "live" ? 15000 : 3000,
    );
    const onWake = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("focus", onWake);
    window.addEventListener("online", onWake);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("focus", onWake);
      window.removeEventListener("online", onWake);
    };
  }, [live, refresh]);

  return { room, error, live, clockOffset, refresh, applyResponse };
}
