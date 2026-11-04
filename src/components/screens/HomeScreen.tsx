"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { GameShell } from "@/components/game/GameShell";
import { QuestMap } from "@/components/game/QuestMap";
import { BOSS, ENEMIES, HERO, Sprite } from "@/components/pixel/Sprite";
import { Panel, PixelButton, PixelHeading } from "@/components/pixel/ui";
import { api, ApiClientError } from "@/lib/api";
import { DEFAULT_TIMER_SECONDS } from "@/lib/quests";
import { isValidRoomCode, normalizeRoomCode } from "@/lib/room-mapper";
import { saveHostToken } from "@/lib/storage";

export function HomeScreen() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [hostError, setHostError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);

  async function createRoom() {
    setCreating(true);
    setHostError(null);
    try {
      const res = await api.createRoom(DEFAULT_TIMER_SECONDS);
      saveHostToken(res.room.code, res.hostToken);
      router.push(`/host/${res.room.code}`);
    } catch (err) {
      setHostError(err instanceof ApiClientError ? err.message : "Could not create a room.");
      setCreating(false);
    }
  }

  function join(event: FormEvent) {
    event.preventDefault();
    const normalized = normalizeRoomCode(code);
    if (!isValidRoomCode(normalized)) {
      setJoinError("Room codes have 6 letters or numbers.");
      return;
    }
    router.push(`/play/${normalized}`);
  }

  return (
    <GameShell theme="lobby">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center gap-8 px-4 py-8 md:py-12">
        <header className="flex flex-col items-center gap-4 text-center">
          <div className="flex items-end gap-4 md:gap-8">
            <Sprite art={HERO} scale={5} className="animate-bob" />
            <Sprite art={ENEMIES[0]} scale={4} className="animate-float" />
            <Sprite art={BOSS} scale={4} className="hidden animate-float sm:block" />
          </div>
          <PixelHeading as="h1" className="text-2xl text-gold sm:text-4xl md:text-5xl">
            Playwright
            <br />
            Pixel Quest
          </PixelHeading>
          <p className="max-w-2xl text-2xl text-snow pixel-text-shadow md:text-3xl">
            Five quests. One question each. Is it a <span className="text-ruby">MYTH</span> or a{" "}
            <span className="text-lime">FACT</span>? A training adventure for Playwright Session 1.
          </p>
        </header>

        <div className="grid w-full gap-8 md:grid-cols-2">
          <Panel className="flex flex-col gap-5 p-6 md:p-8">
            <PixelHeading className="text-base text-gold md:text-lg">Host a quest</PixelHeading>
            <p className="text-xl text-mist">
              Create a room, share the code on screen, and guide your party through the five quests.
            </p>
            <PixelButton size="lg" onClick={createRoom} disabled={creating} className="mt-auto">
              {creating ? "Forging room..." : "Create room"}
            </PixelButton>
            {hostError && <p role="alert" className="text-xl text-ember">{hostError}</p>}
          </Panel>

          <Panel className="flex flex-col gap-5 p-6 md:p-8">
            <PixelHeading className="text-base text-aqua md:text-lg">Join a quest</PixelHeading>
            <p className="text-xl text-mist">No account needed. Enter the code shown by your host.</p>
            <form onSubmit={join} className="mt-auto flex flex-col gap-4">
              <label htmlFor="room-code" className="sr-only">
                Room code
              </label>
              <input
                id="room-code"
                className="pixel-input"
                placeholder="ABC123"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={8}
                value={code}
                onChange={(e) => {
                  setCode(normalizeRoomCode(e.target.value));
                  setJoinError(null);
                }}
              />
              <PixelButton type="submit" variant="blue" size="lg">
                Join
              </PixelButton>
              {joinError && <p role="alert" className="text-xl text-ember">{joinError}</p>}
            </form>
          </Panel>
        </div>

        <Panel className="w-full px-4 pb-4 pt-2 md:px-8">
          <QuestMap questIndex={0} status="lobby" />
        </Panel>
      </div>
    </GameShell>
  );
}
