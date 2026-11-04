"use client";

import { useEffect, useState } from "react";

/**
 * Milliseconds left until `endsAt`, corrected by the server clock offset.
 * Returns null when there is no running timer.
 */
export function useCountdown(endsAt: string | null, clockOffset: number): number | null {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!endsAt) {
      queueMicrotask(() => setRemaining(null));
      return;
    }
    const end = new Date(endsAt).getTime();
    const tick = () => setRemaining(Math.max(0, end - (Date.now() + clockOffset)));
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [endsAt, clockOffset]);

  return remaining;
}
