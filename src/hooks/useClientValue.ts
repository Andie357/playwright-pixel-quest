"use client";

import { useSyncExternalStore } from "react";

import { subscribeStorage } from "@/lib/storage";

const noopSubscribe = () => () => {};

/**
 * Reads a browser-only primitive value without hydration mismatches.
 * Returns `undefined` during SSR / hydration, then the client value.
 */
export function useClientValue<T extends string | number | boolean | null>(
  read: () => T,
  watchStorage = false,
): T | undefined {
  return useSyncExternalStore(watchStorage ? subscribeStorage : noopSubscribe, read, () => undefined);
}

export function useOrigin(): string {
  return (
    useClientValue(() => process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || window.location.origin) ?? ""
  );
}
