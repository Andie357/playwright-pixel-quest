import type { PlayerCredentials } from "./api";

export interface PlayerSession extends PlayerCredentials {
  heroName: string;
}

const hostKey = (code: string) => `ppq:host:${code}`;
const playerKey = (code: string) => `ppq:player:${code}`;
const CHANGE_EVENT = "ppq-storage";

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // Storage unavailable (private mode); the session just won't survive a refresh.
  }
}

/** Subscribe callback for `useSyncExternalStore`. */
export function subscribeStorage(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

export function loadHostToken(code: string): string | null {
  return read(hostKey(code));
}

export function saveHostToken(code: string, token: string) {
  write(hostKey(code), token);
}

export function loadPlayerSession(code: string): PlayerSession | null {
  const raw = read(playerKey(code));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PlayerSession;
    return parsed.playerId && parsed.playerToken ? parsed : null;
  } catch {
    return null;
  }
}

export function savePlayerSession(code: string, session: PlayerSession | null) {
  write(playerKey(code), session ? JSON.stringify(session) : null);
}

const ADJECTIVES = ["Swift", "Brave", "Mighty", "Clever", "Steady", "Lucky", "Noble", "Sneaky", "Bold", "Wise"];
const NOUNS = ["Locator", "Fixture", "Assertion", "Selector", "Tracer", "Runner", "Context", "Codegen", "Worker", "Reporter"];

/** Purely cosmetic, generated and kept on the device. Never sent to the server. */
export function randomHeroName(): string {
  const pick = (list: string[]) => list[Math.floor(Math.random() * list.length)];
  return `${pick(ADJECTIVES)} ${pick(NOUNS)}`;
}
