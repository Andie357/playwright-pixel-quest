"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";

import { CountdownTimer } from "@/components/game/CountdownTimer";
import { EnemyEncounter } from "@/components/game/EnemyEncounter";
import { GameShell, LoadingScreen, MessageScreen } from "@/components/game/GameShell";
import { QrCode } from "@/components/game/QrCode";
import { QuestCard } from "@/components/game/QuestCard";
import { QuestMap } from "@/components/game/QuestMap";
import {
  Confetti,
  CorrectPanel,
  MajorityPanel,
  QuestCompleteBanner,
  VoteBars,
} from "@/components/game/Results";
import { SubmissionMeter } from "@/components/game/SubmissionMeter";
import { HERO, Sprite, TROPHY } from "@/components/pixel/Sprite";
import { LiveDot, Panel, PixelButton, PixelHeading, Tag } from "@/components/pixel/ui";
import { useClientValue, useOrigin } from "@/hooks/useClientValue";
import { useCountdown } from "@/hooks/useCountdown";
import { useRoom } from "@/hooks/useRoom";
import { api, ApiClientError } from "@/lib/api";
import { getQuest, QUESTS, TIMER_OPTIONS } from "@/lib/quests";
import { correctPct, majorityLabel, normalizeRoomCode } from "@/lib/room-mapper";
import { loadHostToken, saveHostToken } from "@/lib/storage";
import type { HostAction, RoomState } from "@/lib/types";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function HostScreen({ params }: { params: Promise<{ code: string }> }) {
  const code = normalizeRoomCode(use(params).code);
  const hostToken = useClientValue(() => loadHostToken(code), true);
  const { room, error, live, clockOffset, refresh, applyResponse } = useRoom(code);
  const [verified, setVerified] = useState<"pending" | "ok" | "denied">("pending");

  useEffect(() => {
    if (!hostToken) return;
    let cancelled = false;
    const sentAt = Date.now();
    api
      .host(code, hostToken, "verify")
      .then((res) => {
        if (cancelled) return;
        applyResponse(res, sentAt);
        setVerified("ok");
      })
      .catch((err) => {
        if (!cancelled && err instanceof ApiClientError && err.status === 403) setVerified("denied");
      });
    return () => {
      cancelled = true;
    };
  }, [code, hostToken, applyResponse]);

  if (error && !room) {
    return <MessageScreen title={error.code === "not_configured" ? "Setup needed" : "Room not found"} message={error.message} />;
  }
  if (hostToken === null || verified === "denied") {
    return (
      <MessageScreen
        title="Host only"
        message="This browser doesn't hold the host key for this room. Participants should use the player link instead."
        action={
          <div className="flex flex-wrap justify-center gap-4">
            <Link href={`/play/${code}`} className="pixel-btn pixel-btn-blue">
              Join as player
            </Link>
            <Link href="/" className="pixel-btn">
              New room
            </Link>
          </div>
        }
      />
    );
  }
  if (!room || hostToken === undefined) return <LoadingScreen label="Opening host console" />;

  return (
    <HostConsole
      room={room}
      hostToken={hostToken}
      live={live}
      clockOffset={clockOffset}
      refresh={refresh}
      applyResponse={applyResponse}
    />
  );
}

function HostConsole({
  room,
  hostToken,
  live,
  clockOffset,
  refresh,
  applyResponse,
}: {
  room: RoomState;
  hostToken: string;
  live: ReturnType<typeof useRoom>["live"];
  clockOffset: number;
  refresh: () => Promise<void>;
  applyResponse: ReturnType<typeof useRoom>["applyResponse"];
}) {
  const router = useRouter();
  const origin = useOrigin();
  const joinUrl = `${origin}/play/${room.code}`;
  const quest = getQuest(room.questIndex);
  const remaining = useCountdown(room.status === "voting" ? room.timerEndsAt : null, clockOffset);
  const [busy, setBusy] = useState<HostAction | "new" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [timerChoice, setTimerChoice] = useState<number>(room.timerSeconds);

  async function act(action: HostAction, extra?: Record<string, unknown>) {
    setBusy(action);
    setActionError(null);
    try {
      for (let attempt = 0; ; attempt++) {
        const sentAt = Date.now();
        try {
          applyResponse(await api.host(room.code, hostToken, action, extra), sentAt);
          return;
        } catch (err) {
          // The local clock may be a few ms ahead of the server at the buzzer.
          if (err instanceof ApiClientError && err.code === "not_ready" && action === "reveal" && attempt < 2) {
            await sleep(800);
            continue;
          }
          throw err;
        }
      }
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "state_changed") await refresh();
      else setActionError(err instanceof ApiClientError ? err.message : "Action failed.");
    } finally {
      setBusy(null);
    }
  }

  async function newAdventure() {
    setBusy("new");
    try {
      const res = await api.createRoom(room.timerSeconds);
      saveHostToken(res.room.code, res.hostToken);
      router.push(`/host/${res.room.code}`);
    } catch (err) {
      setActionError(err instanceof ApiClientError ? err.message : "Could not create a room.");
      setBusy(null);
    }
  }

  const theme =
    room.status === "lobby" ? "lobby" : room.status === "finished" ? "victory" : quest.theme;

  return (
    <GameShell theme={theme}>
      <HostHeader room={room} live={live} joinUrl={joinUrl} />

      <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-6 px-4 py-6 md:px-8">
        {actionError && (
          <Panel variant="default" className="!bg-ruby px-5 py-3 text-2xl" role="alert">
            {actionError}
          </Panel>
        )}

        {room.status === "lobby" && (
          <LobbyView room={room} joinUrl={joinUrl} busy={busy === "start"} onStart={() => act("start")} />
        )}

        {room.status === "quest" && (
          <div className="grid flex-1 items-start gap-6 lg:grid-cols-[1fr_420px]">
            <div className="flex flex-col gap-4">
              <p className="animate-slide-down text-3xl text-gold pixel-text-shadow">{quest.intro}</p>
              <QuestCard quest={quest} total={room.questCount} size="lg" showStatement={false} />
            </div>
            <Panel className="flex flex-col items-center gap-6 p-6">
              <EnemyEncounter quest={quest} result={null} />
              <div className="flex w-full flex-col gap-3">
                <span className="font-pixel text-xs uppercase text-mist">Countdown length</span>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Countdown length">
                  {TIMER_OPTIONS.map((s) => (
                    <PixelButton
                      key={s}
                      size="sm"
                      variant={timerChoice === s ? "gold" : "stone"}
                      role="radio"
                      aria-checked={timerChoice === s}
                      onClick={() => setTimerChoice(s)}
                    >
                      {s}s
                    </PixelButton>
                  ))}
                </div>
              </div>
              <PixelButton
                size="xl"
                className="w-full"
                disabled={busy !== null}
                onClick={() => act("start_timer", { seconds: timerChoice })}
              >
                {busy === "start_timer" ? "Starting..." : "Start countdown"}
              </PixelButton>
              <p className="text-center text-xl text-mist">
                {room.playerCount} {room.playerCount === 1 ? "hero" : "heroes"} ready. Answers open when the countdown starts.
              </p>
            </Panel>
          </div>
        )}

        {room.status === "voting" && (
          <VotingView room={room} remaining={remaining} busy={busy === "reveal"} onReveal={() => act("reveal")} />
        )}

        {room.status === "revealed" && room.results && (
          <RevealView room={room} busy={busy === "next"} onNext={() => act("next")} />
        )}

        {room.status === "finished" && <FinishedView room={room} busy={busy === "new"} onNew={newAdventure} />}
      </div>

      {room.status !== "finished" && (
        <footer className="mx-auto w-full max-w-[1600px] px-4 pb-6 md:px-8">
          <Panel className="px-4 pb-3 pt-1 md:px-8">
            <QuestMap questIndex={room.questIndex} status={room.status} />
          </Panel>
        </footer>
      )}
    </GameShell>
  );
}

function HostHeader({ room, live, joinUrl }: { room: RoomState; live: ReturnType<typeof useRoom>["live"]; joinUrl: string }) {
  return (
    <header className="border-b-4 border-ink bg-night/90">
      <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 md:px-8">
        <span className="flex items-center gap-3">
          <Link href="/" className="font-pixel text-xs text-gold pixel-text-shadow md:text-sm">
            Pixel Quest
          </Link>
          <Tag color="sky">Session 1 Recap</Tag>
        </span>
        {room.status !== "lobby" && (
          <span className="text-2xl text-mist md:text-3xl">
            Join at <span className="text-snow">{joinUrl.replace(/^https?:\/\//, "")}</span>
          </span>
        )}
        <div className="flex items-center gap-6">
          <span className="font-pixel text-xs md:text-sm">
            Room <span className="text-gold">{room.code}</span>
          </span>
          <span className="flex items-center gap-2 font-pixel text-xs md:text-sm">
            <Sprite art={HERO} scale={2} />
            <span className="text-lime">{room.playerCount}</span>
          </span>
          <LiveDot live={live} />
        </div>
      </div>
    </header>
  );
}

function LobbyView({
  room,
  joinUrl,
  busy,
  onStart,
}: {
  room: RoomState;
  joinUrl: string;
  busy: boolean;
  onStart: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const shownHeroes = Math.min(room.playerCount, 24);

  async function copy() {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="grid flex-1 items-stretch gap-6 lg:grid-cols-[1.2fr_1fr]">
      <Panel className="flex flex-col items-center gap-6 p-6 text-center md:p-10">
        <PixelHeading className="text-lg text-aqua md:text-2xl">Join the recap quest!</PixelHeading>
        <p className="-mt-3 font-pixel text-[0.65rem] uppercase text-mist md:text-xs">Playwright Foundations Quest</p>
        <div className="flex flex-col items-center gap-8 md:flex-row">
          {joinUrl && <QrCode value={joinUrl} size={240} className="p-0 shadow-[0_0_0_6px_#0d0e17]" />}
          <div className="flex flex-col items-center gap-3">
            <span className="font-pixel text-xs uppercase text-mist md:text-sm">Room code</span>
            <span className="font-pixel text-5xl tracking-[0.15em] text-gold pixel-text-shadow md:text-7xl">{room.code}</span>
            <span className="break-all text-3xl text-snow">{joinUrl.replace(/^https?:\/\//, "")}</span>
            <PixelButton size="sm" variant="stone" onClick={copy}>
              {copied ? "Link copied!" : "Copy player link"}
            </PixelButton>
          </div>
        </div>
      </Panel>

      <Panel className="flex flex-col items-center gap-6 p-6 text-center md:p-10">
        <PixelHeading className="text-lg md:text-2xl">Party assembling</PixelHeading>
        <div className="font-pixel text-7xl text-lime pixel-text-shadow md:text-8xl" aria-live="polite">
          {room.playerCount}
        </div>
        <p className="text-3xl text-mist">{room.playerCount === 1 ? "hero has" : "heroes have"} joined</p>
        <div className="flex min-h-16 flex-wrap justify-center gap-3" aria-hidden>
          {Array.from({ length: shownHeroes }, (_, i) => (
            <span key={i} className="animate-pop" style={{ animationDelay: `${(i % 8) * 60}ms` }}>
              <Sprite art={HERO} scale={3} className="animate-bob" />
            </span>
          ))}
          {room.playerCount > shownHeroes && (
            <span className="self-center font-pixel text-lg text-gold">+{room.playerCount - shownHeroes}</span>
          )}
        </div>
        <PixelButton size="xl" className="mt-auto w-full" disabled={busy} onClick={onStart}>
          {busy ? "Starting..." : "Start adventure"}
        </PixelButton>
        {room.playerCount === 0 && <p className="text-xl text-mist">You can start now - late heroes can still join.</p>}
      </Panel>
    </div>
  );
}

function VotingView({
  room,
  remaining,
  busy,
  onReveal,
}: {
  room: RoomState;
  remaining: number | null;
  busy: boolean;
  onReveal: () => void;
}) {
  const quest = getQuest(room.questIndex);
  const allSubmitted = room.playerCount > 0 && room.submittedCount >= room.playerCount;
  const timeUp = remaining !== null && remaining <= 0;
  const canReveal = allSubmitted || timeUp;

  return (
    <div className="grid flex-1 items-start gap-6 lg:grid-cols-[1fr_440px]">
      <div className="flex flex-col gap-6">
        <QuestCard quest={quest} total={room.questCount} size="lg" />
        {quest.theme === "boss" && (
          <Panel className="flex flex-col items-center gap-2 p-6">
            <PixelHeading className="text-sm text-ruby md:text-lg">{quest.intro}</PixelHeading>
            <EnemyEncounter quest={quest} result={null} scale={7} />
          </Panel>
        )}
      </div>
      <Panel className="flex flex-col items-center gap-8 p-6">
        <CountdownTimer remainingMs={remaining} totalSeconds={room.timerSeconds} size="lg" />
        <SubmissionMeter submitted={room.submittedCount} total={room.playerCount} />
        <PixelButton size="xl" className="w-full" disabled={!canReveal || busy} onClick={onReveal}>
          {busy ? "Revealing..." : "Reveal answer"}
        </PixelButton>
        <p className="text-center text-2xl text-mist" aria-live="polite">
          {allSubmitted
            ? "Every hero has answered!"
            : timeUp
              ? "Time's Up! Ready to reveal."
              : "Reveal unlocks when everyone answers or the timer runs out."}
        </p>
      </Panel>
    </div>
  );
}

function RevealView({ room, busy, onNext }: { room: RoomState; busy: boolean; onNext: () => void }) {
  const result = room.results!;
  const quest = getQuest(room.questIndex);
  const isLast = room.questIndex + 1 >= room.questCount;
  const isBoss = quest.theme === "boss";

  return (
    <div className="flex flex-1 flex-col gap-6">
      <Confetti key={result.revealedAt} />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <QuestCompleteBanner questNumber={room.questIndex + 1} isBoss={isBoss} />
        <PixelButton size="xl" disabled={busy} onClick={onNext}>
          {busy ? "Travelling..." : isLast ? "Finish adventure" : "Next quest"}
        </PixelButton>
      </div>

      <Panel variant="parchment" className="px-6 py-4">
        <p className="text-3xl text-ink md:text-4xl">&ldquo;{quest.statement}&rdquo;</p>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Panel className="flex flex-col gap-6 p-6 md:p-8">
          <PixelHeading className="text-sm text-mist md:text-base">Party votes</PixelHeading>
          <VoteBars result={result} large />
        </Panel>
        <div className="flex flex-col gap-6">
          <Panel className="p-6">
            <MajorityPanel result={result} large />
          </Panel>
          <Panel variant="gold" className="flex flex-col gap-4 p-6">
            <CorrectPanel result={result} large />
            <p className="text-center text-2xl leading-tight text-ink md:text-[1.7rem]">{result.explanation}</p>
          </Panel>
        </div>
      </div>

      <Panel className="flex flex-col items-center gap-2 p-6 md:flex-row md:justify-around">
        <EnemyEncounter quest={quest} result={result} scale={5} />
        <div className="text-center">
          <span className="font-pixel text-xs uppercase text-mist md:text-sm">Party accuracy</span>
          <div className="font-pixel text-5xl text-gold pixel-text-shadow md:text-6xl">{correctPct(result)}%</div>
        </div>
      </Panel>
    </div>
  );
}

function FinishedView({ room, busy, onNew }: { room: RoomState; busy: boolean; onNew: () => void }) {
  const totals = room.history.reduce(
    (acc, r) => {
      acc.votes += r.total;
      acc.correct += r.correct === "myth" ? r.myth : r.fact;
      if (r.majority === r.correct) acc.won += 1;
      return acc;
    },
    { votes: 0, correct: 0, won: 0 },
  );
  const accuracy = totals.votes > 0 ? Math.round((totals.correct / totals.votes) * 100) : 0;
  const boss = room.history.find((r) => r.questIndex === QUESTS.length - 1);
  const bossDefeated = boss ? boss.majority === boss.correct : false;

  return (
    <div className="flex flex-1 flex-col items-center gap-8">
      <Confetti pieces={80} />
      <div className="flex flex-col items-center gap-4 text-center">
        <Sprite art={TROPHY} scale={8} className="animate-float" title="Trophy" />
        <PixelHeading as="h1" className="text-3xl text-gold md:text-6xl">
          {bossDefeated ? "Victory!" : "Recap complete!"}
        </PixelHeading>
        <p className="text-3xl pixel-text-shadow md:text-4xl">
          {bossDefeated
            ? "The Flaky Test Dragon has been defeated. Session 1 recap complete - your party is ready for Session 2!"
            : "The dragon escaped this time - but your party learned its weaknesses. On to Session 2!"}
        </p>
      </div>

      <div className="grid w-full max-w-5xl gap-6 md:grid-cols-3">
        <Stat label="Party accuracy" value={`${accuracy}%`} />
        <Stat label="Quests won" value={`${totals.won} / ${room.questCount}`} />
        <Stat label="Heroes" value={String(room.playerCount)} />
      </div>

      <Panel className="w-full max-w-5xl p-4 md:p-6">
        <ol className="flex flex-col divide-y-4 divide-ink">
          {room.history.map((r) => {
            const q = getQuest(r.questIndex);
            const won = r.majority === r.correct;
            return (
              <li key={r.questIndex} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="flex items-center gap-3">
                  <Tag color={won ? "grass" : "ruby"}>{won ? "Won" : "Lost"}</Tag>
                  <span className="font-pixel text-xs md:text-sm">{q.name}</span>
                </span>
                <span className="text-2xl text-mist">
                  Truth: <span className={r.correct === "myth" ? "text-ruby" : "text-lime"}>{r.correct.toUpperCase()}</span>
                  {" / "}Party: {majorityLabel(r.majority)}
                  {" / "}
                  <span className="text-gold">{correctPct(r)}% correct</span>
                </span>
              </li>
            );
          })}
        </ol>
      </Panel>

      <PixelButton size="lg" disabled={busy} onClick={onNew}>
        {busy ? "Forging room..." : "Host a new adventure"}
      </PixelButton>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Panel className="flex flex-col items-center gap-3 p-6 text-center">
      <span className="font-pixel text-xs uppercase text-mist">{label}</span>
      <span className="font-pixel text-4xl text-gold pixel-text-shadow">{value}</span>
    </Panel>
  );
}
